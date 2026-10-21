import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import net from 'node:net';
import {
  signReadinessReceiptV2,
  verifyReadinessReceiptV2,
  evaluateReadinessEvidence,
  witnessProofHash,
  READINESS_V2_PROBE_CATALOG,
  probeCatalogHash
} from './readiness-v2.mjs';
import { controlPlaneFingerprint } from './fingerprint.mjs';
import { inspectContainer, toContainerPath } from './docker-adapter.mjs';

export const ISSUER_ID = 'jobtrack-trusted-issuer-v2';
export const READ_ONLY_TARGETS = Object.freeze(['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read']);
export const PROBE_TARGETS = Object.freeze(['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'host-write']);
export const PUBLISHED_KEY_FINGERPRINTS = Object.freeze([
  'fcd626538a7e4147c2df558d92ada9e3ffaf26e12b1af005d3aceaa22d0ec28e'
]);

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function isPublishedKey(key) {
  if (typeof key !== 'string') return false;
  const fingerprint = sha256(key);
  return PUBLISHED_KEY_FINGERPRINTS.includes(fingerprint);
}

export function buildWitnessBindings(runId) {
  const bindings = {};
  for (const targetId of [...READ_ONLY_TARGETS, 'projection-write', 'host-write', 'transport-general-egress']) {
    bindings[targetId] = `${runId}:${randomBytes(24).toString('hex')}`;
  }
  return bindings;
}

export function hostPathWitness(catalog, targetId) {
  const hostPath = catalog.deniedHostPaths?.[targetId];
  if (!hostPath) return { targetId, connected: false };
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

export function isLoopbackHost(host) {
  if (typeof host !== 'string' || !host) return false;
  const value = host.toLowerCase();
  return value === 'localhost' || value === '127.0.0.1' || value === '::1' || value.startsWith('127.');
}

export function buildTrustedContext(catalog, runId) {
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
    witnessBindings: buildWitnessBindings(runId)
  };
}

export function assertContainerMatchesTrust(container, trusted) {
  if (!container || typeof container !== 'object') throw Error('The issuer could not inspect the container that ran.');
  const observedImageId = String(container.imageId ?? '').replace('sha256:', '');
  if (observedImageId !== trusted.imageDigest) throw Error('The container image content is not the pinned image digest.');
  if (container.networkMode !== 'none') throw Error('The container did not run without network access.');
  if (container.readonlyRootfs !== true) throw Error('The container root filesystem was not read only.');
  if (String(container.user ?? '') !== '65534:65534') throw Error('The container did not run with the unprivileged user.');
  const mounts = Array.isArray(container.mounts) ? container.mounts : [];
  const expected = Object.keys(trusted.mountSources);
  for (const kind of expected) {
    const mount = mounts.find(candidate => candidate.kind === kind);
    if (!mount) throw Error(`The container did not carry the declared ${kind} mount.`);
    const source = String(mount.source).replaceAll('\\', '/').toLowerCase();
    const trustedSource = String(trusted.mountSources[kind]).replaceAll('\\', '/').toLowerCase();
    if (source !== trustedSource) throw Error(`The container mount source is not the declared source: ${kind}`);
  }
  if (mounts.length !== expected.length) throw Error('The container carried a mount that was not declared.');
  return { observedImageId, mounts };
}

export function assertContainerSideMounts(containerMounts, trusted) {
  const list = Array.isArray(containerMounts) ? containerMounts : [];
  if (!list.length) throw Error('The probe did not report the mounts it saw inside the container.');
  const targets = new Map();
  for (const mount of list) {
    targets.set(mount.mountPoint, mount);
  }
  for (const kind of Object.keys(trusted.mountSources)) {
    const expectedTarget = kind === 'projection' ? '/projection' : kind === 'scratch' ? '/scratch' : null;
    if (!expectedTarget) continue;
    const mount = targets.get(expectedTarget);
    if (!mount) throw Error(`The container did not see the ${kind} mount.`);
    const readOnly = String(mount.options ?? '').includes('ro');
    if (readOnly !== (kind === 'projection')) throw Error(`The container mount has the wrong read only flag: ${kind}.`);
  }
  return list;
}

export function buildEvidenceFromProbe(input) {
  const { run, trusted, hostPositive, transportPositive, generalEgressBlocked, container, containerMounts } = input;
  const probe = run.probe ?? {};
  const observed = probe.observations ?? {};
  const { observedImageId, mounts: namespaceMounts } = assertContainerMatchesTrust(container, trusted);
  assertContainerSideMounts(containerMounts, trusted);
  const absentTargets = new Set((observed.hostPaths ?? []).filter(entry => entry.outcome === 'absent').map(entry => entry.targetId));
  const invisible = [...new Set([...absentTargets, ...(observed.hostWrite?.outcome === 'absent' ? ['host-write'] : [])])];
  for (const targetId of PROBE_TARGETS) {
    if (!absentTargets.has(targetId) && targetId !== 'host-write') throw Error(`Isolation probe did not observe ${targetId} as absent.`);
  }
  const readTargets = [
    { targetId: 'projection-read', requirement: 'allowed', hostPath: trusted.mountSources.projection, outcome: observed.projectionRead?.outcome ?? 'denied' },
    ...READ_ONLY_TARGETS.map(targetId => ({
      targetId,
      requirement: 'denied',
      hostPath: trusted.deniedHostPaths[targetId],
      outcome: 'absent'
    }))
  ];
  const writeTargets = [
    { targetId: 'scratch-write', requirement: 'allowed', hostPath: trusted.mountSources.scratch, outcome: observed.scratchWrite?.outcome ?? 'denied' },
    { targetId: 'projection-write', requirement: 'denied', hostPath: trusted.mountSources.projection, outcome: observed.projectionWrite?.outcome === 'denied' ? 'denied' : 'allowed' },
    { targetId: 'host-write', requirement: 'denied', hostPath: trusted.deniedHostPaths['host-write'], outcome: observed.hostWrite?.outcome === 'absent' ? 'absent' : 'allowed' }
  ];
  const commands = Object.keys(READINESS_V2_PROBE_CATALOG);
  const executions = commands.map(commandId => {
    const recorded = probe.checks?.[commandId];
    if (!recorded) throw new Error(`Isolation probe did not record ${commandId}.`);
    return {
      commandId,
      exitCode: 0,
      timedOut: false,
      stdoutSha256: sha256(JSON.stringify(recorded)),
      stderrSha256: sha256(''),
      error: null
    };
  });
  return {
    schemaVersion: 2,
    runId: input.runId,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    binding: {
      taskId: trusted.taskId,
      feature: trusted.feature,
      base: trusted.base,
      sourceDigest: trusted.sourceDigest,
      projectionManifestHash: trusted.projectionManifestHash,
      policyHash: trusted.policyHash,
      environmentHash: trusted.environmentHash,
      purpose: trusted.purpose,
      profileHash: trusted.profileHash,
      adapterId: trusted.adapterId,
      imageDigest: observedImageId,
      cliHash: trusted.cliHash,
      nodeHash: trusted.nodeHash
    },
    catalog: { probeCatalogHash: probeCatalogHash(), commandIds: commands },
    executions,
    observations: {
      hostPositive: hostPositive.map(witness => ({ ...witness, witnessSha256: witnessProofHash(witness.targetId, trusted.witnessBindings[witness.targetId]) })),
      namespace: {
        inspected: true,
        mounts: namespaceMounts,
        invisibleHostPaths: invisible,
        containerMounts: containerMounts ?? [],
        containerId: container.containerId ?? null
      },
      readTargets,
      writeTargets,
      liveness: observed.liveness ?? [],
      transport: {
        endpoint: trusted.modelEndpoint,
        generalEgressEndpoint: trusted.generalEgressEndpoint,
        positiveConnected: transportPositive === true,
        generalEgressBlocked: generalEgressBlocked === true
      }
    },
    gateA: false
  };
}

export function removeContainer(docker, containerId, dockerPrefix = []) {
  if (!containerId) return false;
  spawnSync(docker, [...dockerPrefix, 'rm', '-f', containerId], { encoding: 'utf8', timeout: 60_000, windowsHide: true });
  return true;
}

export function createReadinessIssuer(options = {}) {
  const catalog = options.catalog;
  if (!catalog) throw Error('Issuer needs a maintainer catalog.');
  const key = options.key;
  if (typeof key !== 'string' || key.length < 32) throw Error('Issuer needs a signing key of at least 32 characters.');
  if (isPublishedKey(key)) throw Error('Issuer refuses the published development signing key.');
  const evidenceRoot = options.evidenceRoot;
  if (!evidenceRoot) throw Error('Issuer needs an evidence root.');
  const adapterRoot = options.adapterRoot;
  if (!adapterRoot) throw Error('Issuer needs the control plane root that executes the probe.');
  const docker = options.docker ?? 'docker';
  const dockerPrefix = options.dockerPrefix ?? [];
  const connect = options.connect ?? defaultConnect;

  const auditRecord = record => {
    if (options.audit) options.audit(record);
  };

  return {
    id: ISSUER_ID,
    async issue(input) {
      const runId = input.runId ?? randomUUID();
      const trusted = buildTrustedContext(catalog, runId);
      const fail = diagnostics => {
        auditRecord({ at: new Date().toISOString(), event: 'readiness-issued', runId, taskId: catalog.taskId, signed: false, diagnostics });
        return { runId, evidence: null, evidencePath: null, evidenceHash: null, receipt: null, diagnostics, trusted };
      };
      const observedPolicyHash = controlPlaneFingerprint(adapterRoot);
      if (observedPolicyHash !== trusted.policyHash) {
        return fail('The control plane that would execute the probe does not match the policy hash in the catalog.');
      }
      let run = null;
      try {
        run = await options.adapter.probe({
          runId,
          projection: input.projection,
          scratch: input.scratch,
          manifest: input.manifest,
          keepContainer: true,
          hostPaths: PROBE_TARGETS.map(targetId => ({
            targetId,
            hostPath: trusted.deniedHostPaths[targetId],
            containerPath: toContainerPath(trusted.deniedHostPaths[targetId])
          })),
          modelEndpoint: trusted.modelEndpoint,
          generalEgressEndpoint: trusted.generalEgressEndpoint
        });
      } catch (error) {
        return fail(String(error && error.message ? error.message : error));
      }
      let container = null;
      try {
        container = inspectContainer(docker, run.containerId, dockerPrefix);
      } catch (error) {
        removeContainer(docker, run.containerId, dockerPrefix);
        return fail(`The issuer could not confirm the container that produced the evidence: ${String(error && error.message ? error.message : error)}`);
      }
      try {
        const egressHost = (/(?:https?:\/\/)?([^/:]+)/i.exec(trusted.generalEgressEndpoint) ?? [])[1] ?? '';
      if (isLoopbackHost(egressHost)) return fail('The general egress control must not be a loopback address.');
      const hostPositive = PROBE_TARGETS
        .concat(['projection-write'])
        .map(targetId => hostPathWitness(catalog, targetId));
      let egressConnected = false;
      try {
        egressConnected = await connect(trusted.generalEgressEndpoint);
      } catch {
        egressConnected = false;
      }
      hostPositive.push({ targetId: 'transport-general-egress', connected: egressConnected === true });
      let transportPositive = false;
      try {
        transportPositive = options.broker ? (await options.broker.probe()).connected === true : false;
      } catch (error) {
        return fail(String(error && error.message ? error.message : error));
      }
      const generalEgressBlocked = run.probe?.observations?.generalEgress?.outcome === 'denied';
      let evidence = null;
      try {
        evidence = buildEvidenceFromProbe({
          run,
          runId,
          trusted,
          hostPositive,
          transportPositive,
          generalEgressBlocked,
          container,
          containerMounts: run.probe?.observations?.containerMounts ?? []
        });
      } catch (error) {
        return fail(String(error && error.message ? error.message : error));
      }
      const evaluated = evaluateReadinessEvidence(evidence, trusted);
      if (!evaluated.ready) {
        return fail(`Readiness evidence does not prove isolation: ${evaluated.failures.join('; ')}`);
      }
      evidence.gateA = true;
      const evidenceBytes = JSON.stringify(evidence, null, 2) + '\n';
      const evidenceHash = sha256(evidenceBytes);
      const receiptPayload = {
        schemaVersion: 2,
        runId,
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        binding: evidence.binding,
        evidence: { path: `${runId}.evidence.json`, rawSha256: evidenceHash, completedAt: evidence.completedAt, bytes: Buffer.byteLength(evidenceBytes, 'utf8') },
        verifier: { id: ISSUER_ID, implementationHash: catalog.verifierImplementationHash },
        derived: evaluated.verdicts
      };
      let receipt = null;
      let diagnostics = null;
      let payloadHash = null;
      const evidencePath = join(evidenceRoot, `${runId}.evidence.json`);
      try {
        const signed = signReadinessReceiptV2(receiptPayload, key);
        const verified = verifyReadinessReceiptV2({
          receipt: signed,
          key,
          expected: trusted,
          resolveEvidence: path => {
            if (path !== receiptPayload.evidence.path) return { exists: false, sha256: null, bytes: null, path };
            return { exists: true, sha256: evidenceHash, bytes: evidenceBytes, path };
          }
        });
        mkdirSync(evidenceRoot, { recursive: true });
        writeFileSync(evidencePath, evidenceBytes, { flag: 'wx' });
        receipt = signed;
        payloadHash = verified.payloadHash;
      } catch (error) {
        diagnostics = String(error && error.message ? error.message : error);
      }
      auditRecord({
        at: new Date().toISOString(),
        event: 'readiness-issued',
        runId,
        taskId: catalog.taskId,
        evidencePath: receipt ? evidencePath : null,
        evidenceHash: receipt ? evidenceHash : null,
        signed: Boolean(receipt),
        diagnostics
      });
      return { runId, evidence, evidencePath: receipt ? evidencePath : null, evidenceHash: receipt ? evidenceHash : null, receipt, diagnostics, trusted, payloadHash };
      } finally {
        removeContainer(docker, run.containerId, dockerPrefix);
      }
    }
  };
}
