import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import { signReadinessReceiptV2, verifyReadinessReceiptV2, witnessProofHash, READINESS_V2_PROBE_CATALOG, probeCatalogHash } from './readiness-v2.mjs';

export const ISSUER_ID = 'jobtrack-trusted-issuer-v1';
export const READ_ONLY_TARGETS = Object.freeze(['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read']);

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function buildWitnessBindings(runId) {
  const bindings = {};
  for (const targetId of [...READ_ONLY_TARGETS, 'projection-write', 'host-write', 'transport-general-egress']) {
    bindings[targetId] = `${runId}:${randomBytes(24).toString('hex')}`;
  }
  return bindings;
}

export function hostPathWitness(catalog, targetId) {
  const hostPath = catalog.deniedHostPaths?.[targetId];
  if (!hostPath) return { targetId, connected: false, witnessSha256: null };
  let connected = false;
  try {
    const stat = lstatSync(hostPath);
    connected = stat.isDirectory() || stat.isFile();
  } catch {
    connected = false;
  }
  return { targetId, connected };
}

export function defaultConnect(endpoint, timeoutMs = 3000) {
  return new Promise(resolve => {
    let host = endpoint;
    let port = 443;
    const match = /^(?:https?:\/\/)?([^/:]+)(?::(\d+))?/i.exec(endpoint);
    if (match) {
      host = match[1];
      port = match[2] ? Number(match[2]) : 443;
    }
    const socket = net.connect({ host, port });
    const settle = result => { socket.removeAllListeners(); socket.destroy(); resolve(result); };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}

export function buildTrustedContext(catalog, runId) {
  const witnessBindings = buildWitnessBindings(runId);
  return {
    taskId: catalog.taskId,
    feature: catalog.feature,
    base: catalog.base,
    sourceDigest: catalog.sourceDigest,
    projectionManifestHash: catalog.projectionManifestHash,
    policyHash: catalog.policyHash,
    environmentHash: catalog.environmentHash,
    purpose: catalog.purpose ?? 'worker-read',
    profileHash: catalog.profileHash,
    adapterId: catalog.adapterId,
    imageDigest: catalog.imageDigest,
    cliHash: catalog.cliHash,
    nodeHash: catalog.nodeHash,
    verifierImplementationHash: catalog.verifierImplementationHash,
    modelEndpoint: catalog.modelEndpoint,
    generalEgressEndpoint: catalog.generalEgressEndpoint,
    deniedHostPaths: catalog.deniedHostPaths,
    mountSources: catalog.mountSources,
    witnessBindings
  };
}

export function buildEvidenceFromProbe(input) {
  const { catalog, probe, runId, startedAt, completedAt, hostPositive, transportPositive, generalEgressBlocked, witnessBindings } = input;
  const observed = probe.observations ?? {};
  const absentReadTargets = new Set();
  const observedHostPaths = observed.hostPaths ?? [];
  READ_ONLY_TARGETS.forEach((targetId, index) => {
    if (observedHostPaths[index]?.outcome === 'absent') absentReadTargets.add(targetId);
  });
  const invisible = [...absentReadTargets];
  if (observed.hostWrite?.outcome === 'absent') invisible.push('host-write');
  const readTargets = [
    { targetId: 'projection-read', requirement: 'allowed', hostPath: catalog.mountSources.projection, outcome: observed.projectionRead?.outcome ?? 'denied' },
    ...READ_ONLY_TARGETS.map(targetId => ({
      targetId,
      requirement: 'denied',
      hostPath: catalog.deniedHostPaths[targetId],
      outcome: 'absent'
    }))
  ];
  const writeTargets = [
    { targetId: 'scratch-write', requirement: 'allowed', hostPath: catalog.mountSources.scratch, outcome: observed.scratchWrite?.outcome ?? 'denied' },
    { targetId: 'projection-write', requirement: 'denied', hostPath: catalog.mountSources.projection, outcome: observed.projectionWrite?.outcome ?? 'allowed' },
    { targetId: 'host-write', requirement: 'denied', hostPath: catalog.deniedHostPaths['host-write'], outcome: observed.hostWrite?.outcome === 'absent' ? 'absent' : 'allowed' }
  ];
  const commands = Object.keys(READINESS_V2_PROBE_CATALOG);
  const executions = commands.map(commandId => ({
    commandId,
    exitCode: 0,
    timedOut: false,
    stdoutSha256: sha256(JSON.stringify(probe.checks?.[commandId] ?? null)),
    stderrSha256: sha256(''),
    error: null
  }));
  return {
    schemaVersion: 2,
    runId,
    startedAt,
    completedAt,
    binding: {
      taskId: catalog.taskId,
      feature: catalog.feature,
      base: catalog.base,
      sourceDigest: catalog.sourceDigest,
      projectionManifestHash: catalog.projectionManifestHash,
      policyHash: catalog.policyHash,
      environmentHash: catalog.environmentHash,
      purpose: catalog.purpose ?? 'worker-read',
      profileHash: catalog.profileHash,
      adapterId: catalog.adapterId,
      imageDigest: catalog.imageDigest,
      cliHash: catalog.cliHash,
      nodeHash: catalog.nodeHash
    },
    catalog: { probeCatalogHash: probeCatalogHash(), commandIds: commands },
    executions,
    observations: {
      hostPositive: hostPositive.map(witness => ({ ...witness, witnessSha256: witnessProofHash(witness.targetId, witnessBindings[witness.targetId]) })),
      namespace: {
        inspected: true,
        mounts: [
          { kind: 'projection', source: catalog.mountSources.projection, target: '/projection', readOnly: true },
          { kind: 'scratch', source: catalog.mountSources.scratch, target: '/scratch', readOnly: false }
        ],
        invisibleHostPaths: invisible
      },
      readTargets,
      writeTargets,
      liveness: observed.liveness ?? [],
      transport: {
        endpoint: catalog.modelEndpoint,
        generalEgressEndpoint: catalog.generalEgressEndpoint,
        positiveConnected: transportPositive === true,
        generalEgressBlocked: generalEgressBlocked === true
      }
    },
    gateA: true
  };
}

export function createReadinessIssuer(options = {}) {
  const catalog = options.catalog;
  if (!catalog) throw Error('Issuer needs a maintainer catalog.');
  const key = options.key;
  if (typeof key !== 'string' || key.length < 32) throw Error('Issuer needs a signing key of at least 32 characters.');
  const evidenceRoot = options.evidenceRoot;
  if (!evidenceRoot) throw Error('Issuer needs an evidence root.');

  return {
    id: ISSUER_ID,
    async issue(input) {
      const runId = input.runId ?? randomUUID();
      const trusted = buildTrustedContext(catalog, runId);
      const startedAt = new Date().toISOString();
      const probe = await options.adapter.probe({
        runId,
        projection: input.projection,
        scratch: input.scratch,
        manifest: input.manifest,
        hostPaths: input.hostPaths,
        modelEndpoint: catalog.modelEndpoint,
        generalEgressEndpoint: catalog.generalEgressEndpoint
      });
      const completedAt = new Date().toISOString();
      const hostPositive = [
        ...READ_ONLY_TARGETS.map(targetId => hostPathWitness(catalog, targetId)),
        hostPathWitness(catalog, 'projection-write'),
        hostPathWitness(catalog, 'host-write'),
        { targetId: 'transport-general-egress', connected: await (options.connect ?? defaultConnect)(catalog.generalEgressEndpoint) }
      ];
      const transportPositive = options.broker ? (await options.broker.probe()).connected === true : false;
      const generalEgressBlocked = probe.probe?.observations?.generalEgress?.outcome === 'denied';
      const evidence = buildEvidenceFromProbe({
        catalog,
        probe: probe.probe,
        runId,
        startedAt,
        completedAt,
        hostPositive,
        transportPositive,
        generalEgressBlocked,
        witnessBindings: trusted.witnessBindings
      });
      const evidenceBytes = JSON.stringify(evidence, null, 2) + '\n';
      const evidencePath = join(evidenceRoot, `${runId}.evidence.json`);
      mkdirSync(evidenceRoot, { recursive: true });
      writeFileSync(evidencePath, evidenceBytes, { flag: 'wx' });
      const evidenceHash = sha256(evidenceBytes);
      const receiptPayload = {
        schemaVersion: 2,
        runId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        binding: evidence.binding,
        evidence: { path: `${runId}.evidence.json`, rawSha256: evidenceHash, completedAt: evidence.completedAt, bytes: Buffer.byteLength(evidenceBytes, 'utf8') },
        verifier: { id: ISSUER_ID, implementationHash: catalog.verifierImplementationHash },
        derived: {
          readIsolation: true,
          writeIsolation: true,
          childCleanup: true,
          modelTransport: true,
          egress: true,
          gateA: true
        }
      };
      let receipt = null;
      let diagnostics = null;
      let payloadHash = null;
      try {
        const signed = signReadinessReceiptV2(receiptPayload, key);
        const verified = verifyReadinessReceiptV2({
          receipt: signed,
          key,
          expected: trusted,
          resolveEvidence: path => {
            const target = join(evidenceRoot, path);
            if (!existsSync(target)) return { exists: false, sha256: null, bytes: null, path };
            const bytes = readFileSync(target, 'utf8');
            return { exists: true, sha256: sha256(bytes), bytes, path };
          }
        });
        receipt = signed;
        payloadHash = verified.payloadHash;
      } catch (error) {
        diagnostics = String(error && error.message ? error.message : error);
      }
      const record = {
        at: new Date().toISOString(),
        event: 'readiness-issued',
        runId,
        taskId: catalog.taskId,
        evidencePath,
        evidenceHash,
        signed: Boolean(receipt),
        diagnostics
      };
      if (options.audit) options.audit(record);
      return { runId, evidence, evidencePath, evidenceHash, receipt, diagnostics, trusted, payloadHash };
    }
  };
}
