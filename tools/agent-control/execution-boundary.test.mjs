import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BOUNDARY_PURPOSES,
  assertBoundaryBinding,
  assertReceiptMatchesBinding,
  buildTrustedBinding,
  createExecutionBoundary,
  executeBoundary,
  stageProjection
} from './execution-boundary.mjs';

const HASH = 'a'.repeat(64);

const bindingFixture = (overrides = {}) => ({
  taskId: 'web-one',
  feature: 'web',
  base: 'base-sha',
  sourceDigest: '1'.repeat(64),
  projectionManifestHash: '2'.repeat(64),
  policyHash: '3'.repeat(64),
  environmentHash: '4'.repeat(64),
  purpose: 'worker-read',
  profileHash: '5'.repeat(64),
  adapterId: 'jobtrack-docker-adapter-v1',
  imageDigest: '6'.repeat(64),
  cliHash: '7'.repeat(64),
  nodeHash: '8'.repeat(64),
  ...overrides
});

const receiptFixture = (binding, overrides = {}) => ({
  schemaVersion: 2,
  runId: '3f6b1c2a-9d4e-4a7b-8c5d-1e2f3a4b5c6d',
  issuedAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  binding,
  derived: { readIsolation: true, writeIsolation: true, childCleanup: true, modelTransport: true, egress: true, gateA: true },
  ...overrides
});

function sourceFixture() {
  const root = mkdtempSync(join(tmpdir(), 'jobtrack-boundary-'));
  const worktree = join(root, 'worktree');
  const destination = join(root, 'projection');
  mkdirSync(join(worktree, 'apps/web/src'), { recursive: true });
  writeFileSync(join(worktree, 'apps/web/src/module.js'), 'export const value = 1;\n');
  return { root, worktree, destination };
}

test('the projection stages the declared files and verifies the copied bytes', () => {
  const { worktree, destination } = sourceFixture();
  const staged = stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination });
  assert.equal(staged.manifest.length, 1);
  assert.equal(staged.manifest[0].path, 'apps/web/src/module.js');
  assert.match(staged.manifest[0].sha256, /^[a-f0-9]{64}$/);
  assert.match(staged.manifestHash, /^[a-f0-9]{64}$/);
  const again = stageProjection({ files: ['apps/web/src/module.js'], sourceRoot: worktree, destination });
  assert.equal(again.manifestHash, staged.manifestHash);
});

test('the projection refuses a missing file and an empty file list', () => {
  const { worktree, destination } = sourceFixture();
  assert.throws(() => stageProjection({ files: ['apps/web/src/missing.js'], sourceRoot: worktree, destination }), /source file is missing/);
  assert.throws(() => stageProjection({ files: [], sourceRoot: worktree, destination }), /at least one file/);
});

test('the trusted binding is validated', () => {
  const binding = bindingFixture();
  assert.equal(assertBoundaryBinding(binding), binding);
  assert.throws(() => assertBoundaryBinding({ ...binding, purpose: 'worker-write' }), /purpose is invalid/);
  assert.throws(() => assertBoundaryBinding({ ...binding, policyHash: 'not-a-hash' }), /not a hash/);
  const withoutAdapter = { ...binding };
  delete withoutAdapter.adapterId;
  assert.throws(() => assertBoundaryBinding(withoutAdapter), /missing adapterId/);
  assert.deepEqual([...BOUNDARY_PURPOSES], ['worker-read', 'check-runner']);
});

test('a receipt must match the binding, be unexpired and record a passing gate', () => {
  const binding = bindingFixture();
  const receipt = receiptFixture(binding);
  assert.equal(assertReceiptMatchesBinding(receipt, binding), receipt);
  assert.throws(() => assertReceiptMatchesBinding(receipt, bindingFixture({ taskId: 'other' })), /does not match the trusted binding: taskId/);
  assert.throws(() => assertReceiptMatchesBinding(receipt, bindingFixture({ sourceDigest: '9'.repeat(64) })), /does not match the trusted binding: sourceDigest/);
  assert.throws(() => assertReceiptMatchesBinding(receiptFixture(binding, { expiresAt: new Date(Date.now() - 1000).toISOString() }), binding), /has expired/);
  assert.throws(() => assertReceiptMatchesBinding(receiptFixture(binding, { derived: { gateA: false } }), binding), /does not record a passing gate/);
  assert.throws(() => assertReceiptMatchesBinding(null, binding), /receipt is missing/);
});

test('the boundary issues a receipt when none matches and never launches without one', async () => {
  const binding = bindingFixture();
  const order = [];
  const receipt = receiptFixture(binding);
  const outcome = await executeBoundary({
    purpose: 'worker-read',
    binding,
    receipt: null,
    issue: async () => { order.push('issue'); return receipt; },
    verify: async value => { order.push('verify'); return value; },
    launch: async ({ receipt: verified }) => { order.push('launch'); return { receipt: verified }; }
  });
  assert.deepEqual(order, ['issue', 'verify', 'launch']);
  assert.equal(outcome.receipt, receipt);
  assert.equal(outcome.launched.receipt, receipt);
});

test('a receipt that does not match the binding is replaced before the launch', async () => {
  const binding = bindingFixture();
  const stale = receiptFixture(bindingFixture({ sourceDigest: '9'.repeat(64) }));
  const fresh = receiptFixture(binding);
  const order = [];
  const outcome = await executeBoundary({
    purpose: 'worker-read',
    binding,
    receipt: stale,
    issue: async () => { order.push('issue'); return fresh; },
    verify: async value => { order.push('verify'); return value; },
    launch: async () => { order.push('launch'); return { ok: true }; }
  });
  assert.deepEqual(order, ['issue', 'verify', 'launch']);
  assert.equal(outcome.receipt, fresh);
});

test('the boundary refuses a purpose that differs from the binding and never launches', async () => {
  const binding = bindingFixture({ purpose: 'worker-read' });
  let launched = false;
  await assert.rejects(() => executeBoundary({
    purpose: 'check-runner',
    binding,
    issue: async () => receiptFixture(binding),
    verify: async value => value,
    launch: async () => { launched = true; return {}; }
  }), /purpose does not match the execution purpose/);
  assert.equal(launched, false);
});

test('a failed issuance and a failed verification both stop before the launch', async () => {
  const binding = bindingFixture();
  let launched = false;
  await assert.rejects(() => executeBoundary({
    purpose: 'worker-read',
    binding,
    issue: async () => { throw Error('probe failed'); },
    verify: async value => value,
    launch: async () => { launched = true; return {}; }
  }), /probe failed/);
  await assert.rejects(() => executeBoundary({
    purpose: 'worker-read',
    binding,
    issue: async () => receiptFixture(binding),
    verify: async () => receiptFixture(bindingFixture({ taskId: 'other' })),
    launch: async () => { launched = true; return {}; }
  }), /does not match the trusted binding/);
  assert.equal(launched, false);
});

test('the execution boundary stages, binds, proves and launches in that order', async () => {
  const { worktree, destination } = sourceFixture();
  const binding = bindingFixture();
  const order = [];
  const boundary = createExecutionBoundary({
    context: (state, request) => ({ ...binding, purpose: request.purpose, projectionManifestHash: request.projectionManifestHash, sourceDigest: request.sourceDigest }),
    projection: { destinationFor: () => destination, scratchFor: () => join(destination, '..', 'scratch') },
    adapter: { launch: async ({ receipt: verified }) => { order.push('launch'); return { response: 'planned', receipt: verified }; } },
    issuer: {
      issue: async input => { order.push('issue'); return { receipt: receiptFixture(bindingFixture({ taskId: input.taskId, sourceDigest: input.sourceDigest, projectionManifestHash: input.projectionManifestHash, purpose: input.purpose })) }; },
      verify: async value => { order.push('verify'); return value; }
    }
  });
  const outcome = await boundary.run({ worktree, id: 'web-one' }, { purpose: 'worker-read', files: ['apps/web/src/module.js'], sourceDigest: '1'.repeat(64) });
  assert.deepEqual(order, ['issue', 'verify', 'launch']);
  assert.equal(outcome.launched.response, 'planned');
  assert.equal(outcome.staged.manifest.length, 1);
  assert.equal(outcome.binding.purpose, 'worker-read');
  assert.equal(outcome.binding.projectionManifestHash, outcome.staged.manifestHash);
});

test('the execution boundary propagates a launch failure and never falls back', async () => {
  const { worktree, destination } = sourceFixture();
  const binding = bindingFixture();
  const boundary = createExecutionBoundary({
    context: () => binding,
    projection: { destinationFor: () => destination, scratchFor: () => join(destination, '..', 'scratch') },
    adapter: { launch: async () => { throw Error('container refused the launch'); } },
    issuer: { issue: async input => ({ receipt: receiptFixture(bindingFixture({ taskId: input.taskId })) }), verify: async value => value }
  });
  await assert.rejects(() => boundary.run({ worktree, id: 'web-one' }, { purpose: 'worker-read', files: ['apps/web/src/module.js'], sourceDigest: '1'.repeat(64) }), /container refused the launch/);
});

test('the binding is built from the trusted context only', () => {
  const binding = buildTrustedBinding(bindingFixture());
  assert.equal(binding.purpose, 'worker-read');
  assert.equal(binding.taskId, 'web-one');
  assert.equal(binding.projectionManifestHash, '2'.repeat(64));
});
