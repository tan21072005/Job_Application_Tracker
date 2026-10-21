import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTrustedContext, buildWitnessBindings, createReadinessIssuer, hostPathWitness, isLoopbackHost, toContainerPath } from './issuer.mjs';
import { verifyReadinessReceiptV2 } from './readiness-v2.mjs';

const key = 'k'.repeat(48);
const PUBLISHED_KEY = 'local-issuance-key-0123456789abcdef0123456789';
const IMAGE_DIGEST = 'a'.repeat(64);
const CATALOG_IDS = ['projection-read', 'scratch-write', 'host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'projection-write', 'host-write', 'child-liveness', 'grandchild-liveness', 'transport-positive', 'transport-general-egress'];

function catalogFixture(root) {
  const repo = join(root, 'repo');
  const scratch = join(root, 'scratch');
  const projection = join(root, 'projection');
  mkdirSync(join(repo, '.git'), { recursive: true });
  mkdirSync(join(repo, '.agent-state'), { recursive: true });
  writeFileSync(join(repo, 'accounts.txt'), 'fixture-only\n');
  mkdirSync(scratch, { recursive: true });
  mkdirSync(projection, { recursive: true });
  writeFileSync(join(projection, 'module.js'), 'export const value = 1;\n');
  return {
    taskId: 'web-one',
    feature: 'web',
    base: 'abc123',
    sourceDigest: 'b'.repeat(64),
    projectionManifestHash: 'c'.repeat(64),
    policyHash: 'd'.repeat(64),
    environmentHash: 'e'.repeat(64),
    purpose: 'worker-read',
    profileHash: 'f'.repeat(64),
    adapterId: 'jobtrack-docker-adapter-v1',
    imageDigest: IMAGE_DIGEST,
    cliHash: '1'.repeat(64),
    nodeHash: '2'.repeat(64),
    verifierImplementationHash: '3'.repeat(64),
    modelEndpoint: 'https://model-endpoint.invalid/v1',
    generalEgressEndpoint: 'https://general-egress.invalid/',
    deniedHostPaths: {
      'host-repo-read': repo,
      'common-git-read': join(repo, '.git'),
      'control-state-read': join(repo, '.agent-state'),
      'host-credential-read': join(repo, 'accounts.txt'),
      'projection-write': projection,
      'host-write': repo
    },
    mountSources: { projection, scratch }
  };
}

const passingProbe = catalog => ({
  runId: '3f6b1c2a-9d4e-4a7b-8c5d-1e2f3a4b5c6d',
  image: `node@sha256:${IMAGE_DIGEST}`,
  argvHash: '4'.repeat(64),
  startedAt: new Date(Date.now() - 5000).toISOString(),
  completedAt: new Date().toISOString(),
  observation: {
    imageId: `sha256:${IMAGE_DIGEST}`,
    networkMode: 'none',
    mounts: [
      { kind: 'projection', source: catalog.mountSources.projection, target: '/projection', readOnly: true },
      { kind: 'scratch', source: catalog.mountSources.scratch, target: '/scratch', readOnly: false }
    ]
  },
  probe: {
    checks: Object.fromEntries(CATALOG_IDS.map(commandId => [commandId, { allowed: true }])),
    observations: {
      projectionRead: { outcome: 'allowed' },
      scratchWrite: { outcome: 'allowed' },
      projectionWrite: { outcome: 'denied' },
      hostPaths: [
        { targetId: 'host-repo-read', outcome: 'absent' },
        { targetId: 'common-git-read', outcome: 'absent' },
        { targetId: 'control-state-read', outcome: 'absent' },
        { targetId: 'host-credential-read', outcome: 'absent' },
        { targetId: 'host-write', outcome: 'absent' }
      ],
      hostWrite: { outcome: 'absent' },
      liveness: [
        { processId: '11', generation: 'child', before: true, after: false },
        { processId: '12', generation: 'grandchild', before: true, after: false }
      ],
      generalEgress: { outcome: 'denied' }
    }
  }
});

function issuerFixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = overrides.catalog ?? catalogFixture(root);
  const evidenceRoot = join(root, 'evidence');
  const audit = [];
  const adapter = { probe: async () => passingProbe(catalog) };
  const broker = { probe: async () => ({ connected: true }) };
  const issuer = createReadinessIssuer({
    catalog,
    key: overrides.key ?? key,
    forbidKey: PUBLISHED_KEY,
    evidenceRoot,
    adapter: { ...adapter, ...(overrides.adapter ?? {}) },
    broker: { ...broker, ...(overrides.broker ?? {}) },
    connect: overrides.connect ?? (async () => true),
    audit: record => audit.push(record)
  });
  return { root, catalog, evidenceRoot, audit, issuer };
}

test('the issuer signs a receipt only when the evidence verifies', async () => {
  const { issuer, evidenceRoot, audit } = issuerFixture();
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.diagnostics, null);
  assert.ok(result.receipt);
  assert.equal(existsSync(result.evidencePath), true);
  const verified = verifyReadinessReceiptV2({
    receipt: result.receipt,
    key,
    expected: result.trusted,
    resolveEvidence: path => {
      const bytes = readFileSync(join(evidenceRoot, path), 'utf8');
      return { exists: true, sha256: result.evidenceHash, bytes, path };
    }
  });
  assert.equal(verified.derived.gateA, true);
  assert.equal(audit.at(-1).signed, true);
  assert.equal(audit.at(-1).event, 'readiness-issued');
});

test('the issuer writes no evidence file when the isolation proof fails', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = catalogFixture(root);
  const broken = passingProbe(catalog);
  broken.probe.observations.projectionWrite = { outcome: 'allowed' };
  const { issuer, evidenceRoot, audit } = issuerFixture({ catalog, adapter: { probe: async () => broken } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /does not prove isolation/);
  assert.equal(result.evidencePath, null);
  assert.equal(existsSync(evidenceRoot), false);
  assert.equal(audit.at(-1).signed, false);
});

test('the issuer refuses to sign without a transport positive control', async () => {
  const { issuer } = issuerFixture({ broker: { probe: async () => ({ connected: false }) } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /transport/);
});

test('the issuer refuses to sign when the general egress was not blocked', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = catalogFixture(root);
  const open = passingProbe(catalog);
  open.probe.observations.generalEgress = { outcome: 'allowed' };
  const { issuer } = issuerFixture({ catalog, adapter: { probe: async () => open } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /egress/);
});

test('the issuer refuses a loopback general egress control', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = { ...catalogFixture(root), generalEgressEndpoint: 'http://127.0.0.1:8098/general' };
  const { issuer } = issuerFixture({ catalog });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /loopback/);
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('192.168.1.251'), false);
});

test('the issuer refuses a container whose image is not the pinned digest', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = catalogFixture(root);
  const wrong = passingProbe(catalog);
  wrong.observation.imageId = `sha256:${'9'.repeat(64)}`;
  const { issuer } = issuerFixture({ catalog, adapter: { probe: async () => wrong } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /pinned image digest/);
});

test('the issuer refuses a container whose mounts are not the declared ones', async () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = catalogFixture(root);
  const wrong = passingProbe(catalog);
  wrong.observation.mounts[0].source = 'D:/elsewhere/projection';
  const { issuer } = issuerFixture({ catalog, adapter: { probe: async () => wrong } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /declared source/);
});

test('the issuer turns a failing probe into diagnostics and never a receipt', async () => {
  const { issuer, audit } = issuerFixture({ adapter: { probe: async () => { throw Error('container exited with 1'); } } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.equal(result.evidence, null);
  assert.match(result.diagnostics, /container exited/);
  assert.equal(audit.at(-1).signed, false);
});

test('the issuer sends the catalog host paths to the probe, never caller paths', async () => {
  let seen = null;
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const catalog = catalogFixture(root);
  const { issuer } = issuerFixture({
    catalog,
    adapter: { probe: async input => { seen = input.hostPaths; return passingProbe(catalog); } }
  });
  await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [{ targetId: 'host-repo-read', hostPath: 'C:/attacker' }] });
  assert.equal(seen.length, 5);
  for (const entry of seen) {
    assert.equal(entry.hostPath, catalog.deniedHostPaths[entry.targetId]);
    assert.equal(entry.containerPath, toContainerPath(entry.hostPath));
  }
});

test('the witness bindings are per run and the report cannot compute them', () => {
  const first = buildWitnessBindings('run-1');
  const second = buildWitnessBindings('run-1');
  assert.notEqual(first['host-repo-read'], second['host-repo-read']);
  assert.notEqual(first['host-repo-read'], 'run-1');
});

test('the host witness is only true when the host can really reach the path', () => {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-witness-'));
  const catalog = catalogFixture(root);
  assert.equal(hostPathWitness(catalog, 'host-repo-read').connected, true);
  assert.equal(hostPathWitness(catalog, 'host-write').connected, true);
  assert.equal(hostPathWitness(catalog, 'missing-target').connected, false);
});

test('the issuer needs a catalog, a signing key and an evidence root', () => {
  assert.throws(() => createReadinessIssuer({ key, evidenceRoot: 'C:/e' }), /maintainer catalog/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key: 'short', evidenceRoot: 'C:/e' }), /at least 32 characters/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key }), /evidence root/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key: PUBLISHED_KEY, evidenceRoot: 'C:/e', forbidKey: PUBLISHED_KEY }), /published development signing key/);
});

test('the receipt binds the task, the base and the catalog values', async () => {
  const { issuer, catalog } = issuerFixture();
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt.binding.taskId, catalog.taskId);
  assert.equal(result.receipt.binding.base, catalog.base);
  assert.equal(result.receipt.binding.purpose, 'worker-read');
  assert.equal(result.receipt.binding.adapterId, catalog.adapterId);
  assert.equal(result.receipt.binding.imageDigest, IMAGE_DIGEST);
  assert.equal(result.receipt.schemaVersion, 2);
  assert.equal(result.receipt.evidence.rawSha256, result.evidenceHash);
});

test('the trusted context carries the per run witness bindings', () => {
  const catalog = catalogFixture(mkdtempSync(join(tmpdir(), 'jobtrack-issuer-')));
  const trusted = buildTrustedContext(catalog, 'run-1');
  assert.equal(trusted.witnessBindings['host-repo-read'].startsWith('run-1:'), true);
  assert.equal(trusted.imageDigest, catalog.imageDigest);
});
