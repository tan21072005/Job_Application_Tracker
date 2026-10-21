import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createReadinessIssuer, buildTrustedContext, buildWitnessBindings, hostPathWitness } from './issuer.mjs';
import { verifyReadinessReceiptV2 } from './readiness-v2.mjs';

const key = 'k'.repeat(48);

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
    sourceDigest: 'a'.repeat(64),
    projectionManifestHash: 'b'.repeat(64),
    policyHash: 'c'.repeat(64),
    environmentHash: 'd'.repeat(64),
    purpose: 'worker-read',
    profileHash: 'e'.repeat(64),
    adapterId: 'jobtrack-docker-adapter-v1',
    imageDigest: 'f'.repeat(64),
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
      'projection-write': join(root, 'projection'),
      'host-write': repo
    },
    mountSources: { projection: join(root, 'projection'), scratch }
  };
}

const passingProbe = () => ({
  runId: 'run-1',
  image: 'node@sha256:' + 'a'.repeat(64),
  startedAt: '2026-10-21T10:00:00.000Z',
  completedAt: '2026-10-21T10:00:05.000Z',
  probe: {
    checks: { 'projection-read': { allowed: true } },
    observations: {
      projectionRead: { outcome: 'allowed' },
      scratchWrite: { outcome: 'allowed' },
      projectionWrite: { outcome: 'denied' },
      hostPaths: [
        { containerPath: '/mnt/d/repo', outcome: 'absent' },
        { containerPath: '/mnt/d/repo/.git', outcome: 'absent' },
        { containerPath: '/mnt/d/repo/.agent-state', outcome: 'absent' },
        { containerPath: '/mnt/d/repo/accounts.txt', outcome: 'absent' }
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
  const catalog = catalogFixture(root);
  const evidenceRoot = join(root, 'evidence');
  const audit = [];
  const adapter = { probe: async () => passingProbe() };
  const broker = { probe: async () => ({ connected: true }) };
  const issuer = createReadinessIssuer({
    catalog,
    key,
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
      const target = join(evidenceRoot, path);
      const bytes = readFileSync(target, 'utf8');
      return { exists: true, sha256: result.evidenceHash, bytes, path };
    }
  });
  assert.equal(verified.derived.gateA, true);
  assert.equal(audit.at(-1).signed, true);
  assert.equal(audit.at(-1).event, 'readiness-issued');
});

test('the issuer refuses to sign when the isolation evidence fails', async () => {
  const broken = passingProbe();
  broken.probe.observations.projectionWrite = { outcome: 'allowed' };
  const { issuer, audit } = issuerFixture({ adapter: { probe: async () => broken } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /does not prove isolation|denial/);
  assert.equal(audit.at(-1).signed, false);
});

test('the issuer refuses to sign without a transport positive control', async () => {
  const { issuer } = issuerFixture({ broker: { probe: async () => ({ connected: false }) } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /model transport/);
});

test('the issuer refuses to sign when the general egress was not blocked', async () => {
  const open = passingProbe();
  open.probe.observations.generalEgress = { outcome: 'allowed' };
  const { issuer } = issuerFixture({ adapter: { probe: async () => open } });
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt, null);
  assert.match(result.diagnostics, /egress/);
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
});

test('the receipt binds the task, the base and the catalog values', async () => {
  const { issuer, catalog } = issuerFixture();
  const result = await issuer.issue({ projection: 'C:/projection', scratch: 'C:/scratch', manifest: [], hostPaths: [] });
  assert.equal(result.receipt.binding.taskId, catalog.taskId);
  assert.equal(result.receipt.binding.base, catalog.base);
  assert.equal(result.receipt.binding.purpose, 'worker-read');
  assert.equal(result.receipt.binding.adapterId, catalog.adapterId);
  assert.equal(result.receipt.schemaVersion, 2);
  assert.equal(result.receipt.evidence.rawSha256, result.evidenceHash);
});

function issuerFixtureCatalog(result) {
  return {
    taskId: result.receipt.binding.taskId,
    feature: result.receipt.binding.feature,
    base: result.receipt.binding.base,
    sourceDigest: result.receipt.binding.sourceDigest,
    projectionManifestHash: result.receipt.binding.projectionManifestHash,
    policyHash: result.receipt.binding.policyHash,
    environmentHash: result.receipt.binding.environmentHash,
    purpose: result.receipt.binding.purpose,
    profileHash: result.receipt.binding.profileHash,
    adapterId: result.receipt.binding.adapterId,
    imageDigest: result.receipt.binding.imageDigest,
    cliHash: result.receipt.binding.cliHash,
    nodeHash: result.receipt.binding.nodeHash,
    verifierImplementationHash: result.receipt.verifier.implementationHash,
    modelEndpoint: 'https://model-endpoint.invalid/v1',
    generalEgressEndpoint: 'https://general-egress.invalid/',
    deniedHostPaths: {},
    mountSources: {}
  };
}
