import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { signReadinessReceipt, verifyReadinessReceipt, READINESS_SCHEMA_VERSION } from './readiness.mjs';

const key = 'k'.repeat(48);
const policyHash = createHash('sha256').update('policy').digest('hex');
const environmentFingerprint = createHash('sha256').update('environment').digest('hex');
const now = Date.parse('2026-10-21T10:00:00.000Z');

function payload(overrides = {}) {
  return {
    schemaVersion: READINESS_SCHEMA_VERSION,
    issuedAt: '2026-10-21T09:00:00.000Z',
    expiresAt: '2026-10-21T11:00:00.000Z',
    taskId: 'web-one',
    feature: 'web',
    policyHash,
    environmentFingerprint,
    projectionManifestHash: null,
    targets: [{ path: 'evidence/canary.json', sha256: createHash('sha256').update('canary').digest('hex') }],
    isolation: {
      readIsolation: 'denied',
      writeIsolation: 'denied',
      egress: 'denied-with-positive-control',
      childCleanup: 'verified'
    },
    sandboxProbePass: true,
    evidence: {
      canaryReportHash: createHash('sha256').update('report').digest('hex'),
      capturedAt: '2026-10-21T08:59:00.000Z',
      verifier: 'fixture-verifier'
    },
    ...overrides
  };
}

const expected = { taskId: 'web-one', feature: 'web', policyHash, environmentFingerprint, projectionManifestHash: null };
const resolveTarget = path => path === 'evidence/canary.json'
  ? { exists: true, sha256: createHash('sha256').update('canary').digest('hex') }
  : { exists: false, sha256: null };

test('a complete signed readiness receipt is accepted', () => {
  const receipt = signReadinessReceipt(payload(), key);
  const verified = verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now });
  assert.equal(verified.taskId, 'web-one');
  assert.equal(verified.payloadHash.length, 64);
});

test('every required field must be present', () => {
  for (const field of ['issuedAt', 'expiresAt', 'taskId', 'feature', 'policyHash', 'environmentFingerprint', 'targets', 'isolation', 'evidence', 'sandboxProbePass']) {
    const incomplete = payload();
    delete incomplete[field];
    const receipt = signReadinessReceipt(incomplete, key);
    assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), new RegExp(field), field);
  }
});

test('an expired receipt is rejected', () => {
  const receipt = signReadinessReceipt(payload({ expiresAt: '2026-10-21T09:30:00.000Z' }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /expired/);
});

test('a receipt that is not yet valid is rejected', () => {
  const receipt = signReadinessReceipt(payload({ issuedAt: '2026-10-21T10:30:00.000Z', expiresAt: '2026-10-21T11:30:00.000Z' }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /not yet valid/);
});

test('a receipt that lives longer than the maximum is rejected', () => {
  const receipt = signReadinessReceipt(payload({ issuedAt: '2026-09-01T09:00:00.000Z', expiresAt: '2026-10-21T10:30:00.000Z' }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /lifetime/);
});

test('a tampered payload is rejected', () => {
  const receipt = signReadinessReceipt(payload(), key);
  const tampered = { ...receipt, taskId: 'web-two' };
  assert.throws(() => verifyReadinessReceipt({ receipt: tampered, key, expected, resolveTarget, now }), /signature/);
});

test('a receipt signed with another key is rejected', () => {
  const receipt = signReadinessReceipt(payload(), 'z'.repeat(48));
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /signature/);
});

test('a receipt for another control plane is rejected', () => {
  const receipt = signReadinessReceipt(payload({ policyHash: createHash('sha256').update('other').digest('hex') }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /control plane/);
});

test('a receipt for another environment is rejected', () => {
  const receipt = signReadinessReceipt(payload({ environmentFingerprint: createHash('sha256').update('other').digest('hex') }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /environment/);
});

test('a receipt for another task is rejected', () => {
  const receipt = signReadinessReceipt(payload({ taskId: 'web-two' }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /another task/);
});

test('a receipt whose projection manifest changed is rejected', () => {
  const receipt = signReadinessReceipt(payload({ projectionManifestHash: createHash('sha256').update('manifest').digest('hex') }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /projection manifest/);
});

test('missing or changed evidence targets are rejected', () => {
  const missing = signReadinessReceipt(payload({ targets: [{ path: 'evidence/missing.json', sha256: createHash('sha256').update('canary').digest('hex') }] }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt: missing, key, expected, resolveTarget, now }), /target is missing/);
  const changed = signReadinessReceipt(payload({ targets: [{ path: 'evidence/canary.json', sha256: createHash('sha256').update('edited').digest('hex') }] }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt: changed, key, expected, resolveTarget, now }), /target changed/);
});

test('a receipt that only proves a sandbox probe is rejected', () => {
  const receipt = signReadinessReceipt(payload({
    isolation: { readIsolation: 'not-verified', writeIsolation: 'not-verified', egress: 'not-verified', childCleanup: 'not-verified' }
  }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /readIsolation/);
});

test('an unknown schema version is rejected', () => {
  const receipt = signReadinessReceipt(payload({ schemaVersion: 99 }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /schema version/);
});

test('a short signing key is refused', () => {
  const receipt = signReadinessReceipt(payload(), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key: 'short', expected, resolveTarget, now }), /at least 32 characters/);
});

test('a receipt without a successful sandbox probe is rejected', () => {
  const receipt = signReadinessReceipt(payload({ sandboxProbePass: false }), key);
  assert.throws(() => verifyReadinessReceipt({ receipt, key, expected, resolveTarget, now }), /sandbox probe/);
});
