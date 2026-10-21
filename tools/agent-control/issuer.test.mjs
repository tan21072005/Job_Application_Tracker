import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildTrustedContext,
  buildWitnessBindings,
  createReadinessIssuer,
  hostPathWitness,
  isLoopbackHost,
  isPublishedKey
} from './issuer.mjs';
import { controlPlaneFingerprint } from './fingerprint.mjs';
import { createDockerAdapter, DEFAULT_IMAGE } from './docker-adapter.mjs';
import { verifyReadinessReceiptV2 } from './readiness-v2.mjs';

const key = 'k'.repeat(48);
const IMAGE_DIGEST = DEFAULT_IMAGE.split('@sha256:')[1];
const CATALOG_IDS = ['projection-read', 'scratch-write', 'host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'projection-write', 'host-write', 'child-liveness', 'grandchild-liveness', 'transport-positive', 'transport-general-egress'];
const FAKE_DOCKER = fileURLToPath(new URL('./fixtures/fake-docker.mjs', import.meta.url));

function probeOutput() {
  return JSON.stringify({
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
      generalEgress: { outcome: 'denied' },
      containerMounts: [
        { mountPoint: '/projection', options: 'ro,relatime' },
        { mountPoint: '/scratch', options: 'rw,relatime' }
      ]
    }
  });
}

function issuerFixture(overrides = {}) {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-issuer-'));
  const runRoot = join(root, 'runs');
  const projection = join(runRoot, 'projection');
  const scratch = join(runRoot, 'scratch');
  const state = join(root, 'docker-state.json');
  const output = join(root, 'probe-output.json');
  mkdirSync(projection, { recursive: true });
  mkdirSync(scratch, { recursive: true });
  writeFileSync(state, JSON.stringify({ containers: {} }));
  writeFileSync(output, probeOutput());
  process.env.JT_FAKE_DOCKER_STATE = state;
  process.env.JT_FAKE_DOCKER_OUTPUT = output;
  process.env.JT_FAKE_DOCKER_IMAGE_ID = IMAGE_DIGEST;
  const evidenceRoot = join(root, 'evidence');
  const catalogRoot = join(root, 'control-plane');
  mkdirSync(catalogRoot, { recursive: true });
  const repo = join(root, 'repo');
  const git = join(repo, '.git');
  const stateDir = join(repo, '.agent-state');
  mkdirSync(git, { recursive: true });
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(repo, 'accounts.txt'), 'fixture-only\n');
  const catalog = {
    taskId: 'web-one',
    feature: 'web',
    base: 'base-sha',
    sourceDigest: 'b'.repeat(64),
    projectionManifestHash: 'c'.repeat(64),
    policyHash: controlPlaneFingerprint(catalogRoot),
    environmentHash: 'd'.repeat(64),
    purpose: 'worker-read',
    profileHash: 'e'.repeat(64),
    adapterId: 'jobtrack-docker-adapter-v1',
    imageDigest: IMAGE_DIGEST,
    cliHash: '1'.repeat(64),
    nodeHash: '2'.repeat(64),
    verifierImplementationHash: '3'.repeat(64),
    modelEndpoint: 'https://model-endpoint.invalid/v1',
    generalEgressEndpoint: 'https://general-egress.invalid/',
    deniedHostPaths: {
      'host-repo-read': repo,
      'common-git-read': git,
      'control-state-read': stateDir,
      'host-credential-read': join(repo, 'accounts.txt'),
      'projection-write': projection,
      'host-write': repo
    },
    mountSources: { projection, scratch }
  };
  const adapter = createDockerAdapter({
    repo,
    runRoot,
    home: '',
    image: DEFAULT_IMAGE,
    probeProgramPath: fileURLToPath(new URL('../sandbox/isolation-probe.mjs', import.meta.url)),
    docker: process.execPath,
    dockerPrefix: [FAKE_DOCKER]
  });
  const audit = [];
  const issuer = createReadinessIssuer({
    catalog: overrides.catalog ?? catalog,
    key: overrides.key ?? key,
    evidenceRoot,
    adapterRoot: overrides.adapterRoot ?? catalogRoot,
    docker: process.execPath,
    dockerPrefix: [FAKE_DOCKER],
    adapter: overrides.adapter ?? adapter,
    broker: overrides.broker ?? { probe: async () => ({ connected: true }) },
    connect: overrides.connect ?? (async () => true),
    audit: record => audit.push(record)
  });
  return { root, runRoot, projection, scratch, catalog, catalogRoot, evidenceRoot, audit, issuer, state, output };
}

test('the issuer signs a receipt only when the container and the evidence verify', async () => {
  const { issuer, evidenceRoot, audit, runRoot, projection, scratch, catalog } = issuerFixture();
  const result = await issuer.issue({ projection, scratch, manifest: [] });
  assert.equal(result.diagnostics, null, result.diagnostics);
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
  assert.equal(result.receipt.binding.imageDigest, IMAGE_DIGEST);
  assert.equal(result.evidence.observations.namespace.containerId.length > 0, true);
  assert.deepEqual(result.evidence.observations.namespace.invisibleHostPaths, ['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'host-write']);
  assert.equal(result.evidence.observations.namespace.containerMounts.length, 2);
});

test('the issuer refuses a fixture adapter because it cannot confirm the container', async () => {
  const { issuer, catalog } = issuerFixture({
    adapter: {
      probe: async () => ({
        runId: '3f6b1c2a-9d4e-4a7b-8c5d-1e2f3a4b5c6d',
        containerId: 'f'.repeat(64),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        probe: JSON.parse(probeOutput())
      })
    }
  });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /could not confirm the container/);
});

test('the issuer refuses a catalog whose policy hash does not match the executing control plane', async () => {
  const { issuer, catalog, catalogRoot } = issuerFixture();
  const wrong = { ...catalog, policyHash: '9'.repeat(64) };
  const other = issuerFixture({ catalog: wrong, adapterRoot: catalogRoot });
  const result = await other.issuer.issue({ projection: other.projection, scratch: other.scratch, manifest: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /does not match the policy hash/);
});

test('the issuer refuses a container whose image is not the pinned digest', async () => {
  const { issuer, root } = issuerFixture();
  const statePath = join(root, 'docker-state.json');
  const original = process.env.JT_FAKE_DOCKER_IMAGE_ID;
  process.env.JT_FAKE_DOCKER_IMAGE_ID = '9'.repeat(64);
  try {
    const result = await issuer.issue({ projection: join(root, 'runs', 'projection'), scratch: join(root, 'runs', 'scratch'), manifest: [] });
    assert.equal(result.receipt, null);
    assert.match(result.diagnostics, /pinned image digest/);
  } finally {
    if (original === undefined) delete process.env.JT_FAKE_DOCKER_IMAGE_ID;
    else process.env.JT_FAKE_DOCKER_IMAGE_ID = original;
  }
});

test('the issuer refuses a loopback general egress control', async () => {
  const { catalog, catalogRoot, projection, scratch } = issuerFixture();
  const loopback = { ...catalog, generalEgressEndpoint: 'http://127.0.0.1:8098/general' };
  const other = issuerFixture({ catalog: loopback, adapterRoot: catalogRoot });
  const result = await other.issuer.issue({ projection: other.projection, scratch: other.scratch, manifest: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /loopback/);
  assert.equal(isLoopbackHost('127.0.0.1'), true);
  assert.equal(isLoopbackHost('192.168.1.251'), false);
  assert.equal(catalog.generalEgressEndpoint, 'https://general-egress.invalid/');
  assert.equal(typeof projection, 'string');
  assert.equal(typeof scratch, 'string');
});

test('the issuer refuses without a transport positive control and without a passing probe', async () => {
  const { issuer, projection, scratch } = issuerFixture({ broker: { probe: async () => ({ connected: false }) } });
  const withoutTransport = await issuer.issue({ projection, scratch, manifest: [] });
  assert.equal(withoutTransport.receipt, null);
  assert.match(withoutTransport.diagnostics, /transport/);
});

test('the issuer turns a failing probe into diagnostics and never a receipt', async () => {
  const { issuer, projection, scratch } = issuerFixture({ adapter: { probe: async () => { throw Error('container exited with 1'); } } });
  const result = await issuer.issue({ projection, scratch, manifest: [] });
  assert.equal(result.receipt, null);
  assert.equal(result.evidence, null);
  assert.match(result.diagnostics, /container exited with 1/);
});

test('the issuer sends the catalog host paths to the probe, never caller paths', async () => {
  let seen = null;
  const { catalog, projection, scratch, issuer } = issuerFixture({
    adapter: {
      probe: async input => {
        seen = input.hostPaths;
        return { runId: input.runId, containerId: 'f'.repeat(64), startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), probe: JSON.parse(probeOutput()) };
      }
    }
  });
  const result = await issuer.issue({ projection, scratch, manifest: [], hostPaths: [{ targetId: 'host-repo-read', hostPath: 'C:/attacker' }] });
  assert.equal(seen.length, 5);
  for (const entry of seen) {
    assert.equal(entry.hostPath, catalog.deniedHostPaths[entry.targetId]);
  }
  assert.equal(result.receipt, null);
});

test('the witness bindings are per run and the report cannot compute them', () => {
  const first = buildWitnessBindings('run-1');
  const second = buildWitnessBindings('run-1');
  assert.notEqual(first['host-repo-read'], second['host-repo-read']);
  assert.notEqual(first['host-repo-read'], 'run-1');
});

test('the host witness is only true when the host can really reach the path', () => {
  const { catalog } = issuerFixture();
  assert.equal(hostPathWitness(catalog, 'host-repo-read').connected, true);
  assert.equal(hostPathWitness(catalog, 'host-write').connected, true);
  assert.equal(hostPathWitness(catalog, 'missing-target').connected, false);
});

test('the issuer needs a catalog, a signing key, an evidence root and a control plane root', () => {
  assert.throws(() => createReadinessIssuer({ key, evidenceRoot: 'C:/e' }), /maintainer catalog/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key: 'short', evidenceRoot: 'C:/e' }), /at least 32 characters/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key }), /evidence root/);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key, evidenceRoot: 'C:/e' }), /control plane root/);
});

test('the issuer refuses the published development key', () => {
  assert.equal(isPublishedKey('local-issuance-key-0123456789abcdef0123456789'), true);
  assert.equal(isPublishedKey(key), false);
  assert.throws(() => createReadinessIssuer({ catalog: {}, key: 'local-issuance-key-0123456789abcdef0123456789', evidenceRoot: 'C:/e', adapterRoot: 'C:/p' }), /published development signing key/);
});

test('the trusted context carries the per run witness bindings', () => {
  const { catalog } = issuerFixture();
  const trusted = buildTrustedContext(catalog, 'run-1');
  assert.equal(trusted.witnessBindings['host-repo-read'].startsWith('run-1:'), true);
  assert.equal(trusted.imageDigest, catalog.imageDigest);
});
