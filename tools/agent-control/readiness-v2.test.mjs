import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  READINESS_V2_MAX_EVIDENCE_BYTES,
  READINESS_V2_MAX_ISSUANCE_DELAY_MS,
  READINESS_V2_PROBE_CATALOG,
  READINESS_V2_SCHEMA_VERSION,
  evaluateReadinessEvidence,
  probeCatalogHash,
  signReadinessReceiptV2,
  verifyReadinessReceiptV2
} from './readiness-v2.mjs';

const key = 'k'.repeat(48);
const hash = value => createHash('sha256').update(value).digest('hex');
const now = Date.parse('2026-10-21T10:00:00.000Z');
const issued = new Date(now - 30_000).toISOString();
const completed = new Date(now - 60_000).toISOString();
const started = new Date(now - 120_000).toISOString();

const binding = {
  taskId: 'web-one',
  feature: 'web',
  base: 'abc123',
  sourceDigest: hash('source'),
  projectionManifestHash: hash('projection'),
  policyHash: hash('policy'),
  environmentHash: hash('environment'),
  purpose: 'worker-read',
  profileHash: hash('profile'),
  adapterId: 'docker-adapter',
  imageDigest: hash('image'),
  cliHash: hash('cli'),
  nodeHash: hash('node')
};

const witness = targetId => ({ targetId, connected: true, witness: hash(`witness-${targetId}`) });

function report(overrides = {}) {
  const base = {
    schemaVersion: READINESS_V2_SCHEMA_VERSION,
    runId: 'run-1',
    startedAt: started,
    completedAt: completed,
    binding,
    catalog: { probeCatalogHash: probeCatalogHash(), commandIds: Object.keys(READINESS_V2_PROBE_CATALOG) },
    executions: Object.keys(READINESS_V2_PROBE_CATALOG).map(commandId => ({
      commandId,
      exitCode: 0,
      timedOut: false,
      stdoutSha256: hash(`stdout-${commandId}`),
      stderrSha256: hash(`stderr-${commandId}`),
      error: null
    })),
    observations: {
      hostPositive: [
        witness('host-repo-read'),
        witness('common-git-read'),
        witness('control-state-read'),
        witness('host-credential-read'),
        witness('projection-write'),
        witness('host-write')
      ],
      namespace: {
        inspected: true,
        mounts: [{ source: 'D:/Long-term/projection', target: '/projection', readOnly: true }],
        invisibleHostPaths: ['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'host-write']
      },
      readTargets: [
        { targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'host-repo-read', requirement: 'denied', outcome: 'absent' },
        { targetId: 'common-git-read', requirement: 'denied', outcome: 'absent' },
        { targetId: 'control-state-read', requirement: 'denied', outcome: 'absent' },
        { targetId: 'host-credential-read', requirement: 'denied', outcome: 'absent' }
      ],
      writeTargets: [
        { targetId: 'scratch-write', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'projection-write', requirement: 'denied', outcome: 'denied' },
        { targetId: 'host-write', requirement: 'denied', outcome: 'absent' }
      ],
      liveness: [
        { processId: 'child-1', generation: 'child', before: true, after: false },
        { processId: 'grandchild-1', generation: 'grandchild', before: true, after: false }
      ],
      transport: {
        endpoint: 'https://model-endpoint.invalid/v1',
        positiveConnected: true,
        generalEgressBlocked: true,
        pairedWith: 'https://model-endpoint.invalid/v1'
      }
    },
    gateA: true
  };
  return { ...base, ...overrides };
}

function receiptFor(evidenceReport, overrides = {}) {
  const bytes = JSON.stringify(evidenceReport);
  const payload = {
    schemaVersion: READINESS_V2_SCHEMA_VERSION,
    runId: evidenceReport.runId,
    issuedAt: issued,
    expiresAt: new Date(now + 3_600_000).toISOString(),
    binding: evidenceReport.binding,
    evidence: {
      path: 'evidence/run-1.json',
      rawSha256: hash(bytes),
      completedAt: evidenceReport.completedAt,
      bytes: Buffer.byteLength(bytes)
    },
    verifier: { id: 'readiness-v2', implementationHash: hash('verifier-impl') },
    derived: {
      readIsolation: true,
      writeIsolation: true,
      childCleanup: true,
      modelTransport: true,
      egress: true,
      gateA: true
    },
    ...overrides
  };
  return signReadinessReceiptV2(payload, key);
}

function resolverFor(evidenceReport, options = {}) {
  const bytes = options.bytes ?? JSON.stringify(evidenceReport);
  return path => {
    if (options.missing) return { exists: false, sha256: null, bytes: null };
    return { exists: true, sha256: hash(bytes), bytes, path };
  };
}

const expected = {
  taskId: 'web-one',
  feature: 'web',
  base: 'abc123',
  sourceDigest: binding.sourceDigest,
  projectionManifestHash: binding.projectionManifestHash,
  policyHash: binding.policyHash,
  environmentHash: binding.environmentHash,
  purpose: 'worker-read',
  profileHash: binding.profileHash,
  adapterId: 'docker-adapter',
  imageDigest: binding.imageDigest,
  cliHash: binding.cliHash,
  nodeHash: binding.nodeHash,
  verifierImplementationHash: hash('verifier-impl')
};

test('a complete schema 2 receipt verifies against the actual evidence bytes', () => {
  const evidence = report();
  const verified = verifyReadinessReceiptV2({
    receipt: receiptFor(evidence),
    key,
    expected,
    resolveEvidence: resolverFor(evidence),
    now
  });
  assert.equal(verified.derived.gateA, true);
  assert.equal(verified.derived.readIsolation, true);
  assert.equal(verified.payloadHash.length, 64);
});

test('the schema 1 receipt is rejected by the schema 2 verifier', () => {
  const legacy = { schemaVersion: 1, runId: 'run-1', isolation: { readIsolation: 'denied' }, signature: hash('x') };
  assert.throws(() => verifyReadinessReceiptV2({ receipt: legacy, key, expected, resolveEvidence: () => ({ exists: true, sha256: hash('x'), bytes: '{}' }), now }), /schema version is not supported/);
});

test('an unrelated or altered report is rejected', () => {
  const evidence = report();
  const receipt = receiptFor(evidence);
  const altered = report({ runId: 'run-2' });
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(altered), now }), /content does not match the receipt/);
});

test('a missing resolver is rejected', () => {
  const evidence = report();
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(evidence), key, expected, now }), /resolver is missing/);
});

test('malformed and oversized evidence are rejected', () => {
  const evidence = report();
  const receipt = receiptFor(evidence);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: () => ({ exists: true, sha256: hash('not json'), bytes: 'not json' }), now }), /content does not match the receipt/);
  const oversized = 'x'.repeat(READINESS_V2_MAX_EVIDENCE_BYTES + 1);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: () => ({ exists: true, sha256: hash(oversized), bytes: oversized }), now }), /larger than the maximum/);
});

test('a stale report in a fresh envelope is rejected', () => {
  const stale = report({ completedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(), startedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString() });
  const receipt = receiptFor(stale);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(stale), now }), /issuance delay exceeds the maximum/);
});

test('a future capture is rejected', () => {
  const future = report({ startedAt: new Date(now + 60_000).toISOString(), completedAt: new Date(now + 120_000).toISOString() });
  const receipt = receiptFor(future);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(future), now }), /issued before its evidence completed|issued after/);
});

test('capture after issuance is rejected', () => {
  const late = report({ completedAt: new Date(now + 10_000).toISOString(), startedAt: new Date(now - 10_000).toISOString() });
  const receipt = receiptFor(late);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(late), now }), /issued before its evidence completed/);
});

test('a wrong binding is rejected for every bound field', () => {
  const cases = [
    ['taskId', { taskId: 'web-two' }],
    ['feature', { feature: 'api' }],
    ['base', { base: 'other' }],
    ['sourceDigest', { sourceDigest: hash('other-source') }],
    ['projectionManifestHash', { projectionManifestHash: hash('other-projection') }],
    ['policyHash', { policyHash: hash('other-policy') }],
    ['environmentHash', { environmentHash: hash('other-environment') }],
    ['purpose', { purpose: 'check-runner' }],
    ['profileHash', { profileHash: hash('other-profile') }],
    ['adapterId', { adapterId: 'other-adapter' }],
    ['imageDigest', { imageDigest: hash('other-image') }],
    ['cliHash', { cliHash: hash('other-cli') }],
    ['nodeHash', { nodeHash: hash('other-node') }]
  ];
  for (const [name, override] of cases) {
    const evidence = report();
    const receipt = receiptFor(evidence);
    assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected: { ...expected, [name]: override[name] }, resolveEvidence: resolverFor(evidence), now }), /does not match|belongs to another/, name);
  }
});

test('a wrong verifier implementation is rejected', () => {
  const evidence = report();
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(evidence), key, expected: { ...expected, verifierImplementationHash: hash('other-verifier') }, resolveEvidence: resolverFor(evidence), now }), /another verifier implementation/);
});

test('a stored gateA true with failed observations is rejected', () => {
  const evidence = report({
    observations: {
      ...report().observations,
      readTargets: [{ targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' }, { targetId: 'host-repo-read', requirement: 'denied', outcome: 'allowed' }]
    }
  });
  const receipt = receiptFor(evidence);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(evidence), now }), /does not prove isolation/);
});

test('a broken sandbox that denies everything is rejected because positive controls must succeed', () => {
  const broken = report({
    observations: {
      ...report().observations,
      readTargets: [{ targetId: 'projection-read', requirement: 'allowed', outcome: 'denied' }],
      writeTargets: [{ targetId: 'scratch-write', requirement: 'allowed', outcome: 'denied' }]
    }
  });
  const receipt = receiptFor(broken);
  assert.throws(() => verifyReadinessReceiptV2({ receipt, key, expected, resolveEvidence: resolverFor(broken), now }), /positive control did not/);
});

test('a missing probe and a duplicated probe are rejected', () => {
  const missing = report();
  missing.executions = missing.executions.filter(envelope => envelope.commandId !== 'host-write');
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(missing), key, expected, resolveEvidence: resolverFor(missing), now }), /probe is missing/);
  const duplicated = report();
  duplicated.executions = [...duplicated.executions, duplicated.executions[0]];
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(duplicated), key, expected, resolveEvidence: resolverFor(duplicated), now }), /probe ran twice/);
});

test('a timed out probe is rejected', () => {
  const timedOut = report();
  timedOut.executions = timedOut.executions.map(envelope => envelope.commandId === 'projection-read' ? { ...envelope, timedOut: true } : envelope);
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(timedOut), key, expected, resolveEvidence: resolverFor(timedOut), now }), /timed out/);
});

test('an operational probe error is rejected instead of counting as a denial', () => {
  const failed = report();
  failed.executions = failed.executions.map(envelope => envelope.commandId === 'host-write' ? { ...envelope, error: 'EINVAL', exitCode: 1 } : envelope);
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(failed), key, expected, resolveEvidence: resolverFor(failed), now }), /failed operationally/);
});

test('namespace absence without host and mount proof is rejected', () => {
  const absent = report();
  absent.observations.namespace.invisibleHostPaths = [];
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(absent), key, expected, resolveEvidence: resolverFor(absent), now }), /absent without namespace and mount proof/);
});

test('mismatched egress endpoints are rejected', () => {
  const mismatched = report();
  mismatched.observations.transport.pairedWith = 'https://other-endpoint.invalid/v1';
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(mismatched), key, expected, resolveEvidence: resolverFor(mismatched), now }), /endpoints do not match/);
});

test('blocked general egress with an unusable model transport is rejected', () => {
  const unusable = report();
  unusable.observations.transport.positiveConnected = false;
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(unusable), key, expected, resolveEvidence: resolverFor(unusable), now }), /positive control did not connect/);
});

test('a worker receipt reused for checks is rejected', () => {
  const evidence = report();
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(evidence), key, expected: { ...expected, purpose: 'check-runner' }, resolveEvidence: resolverFor(evidence), now }), /another purpose/);
});

test('an expired or not yet valid receipt is rejected', () => {
  const evidence = report();
  const expired = receiptFor(evidence, { expiresAt: new Date(now - 1000).toISOString() });
  assert.throws(() => verifyReadinessReceiptV2({ receipt: expired, key, expected, resolveEvidence: resolverFor(evidence), now }), /has expired/);
  const early = receiptFor(evidence, { issuedAt: new Date(now + 60_000).toISOString() });
  assert.throws(() => verifyReadinessReceiptV2({ receipt: early, key, expected, resolveEvidence: resolverFor(evidence), now }), /not yet valid/);
});

test('a tampered receipt signature is rejected', () => {
  const evidence = report();
  const receipt = receiptFor(evidence);
  assert.throws(() => verifyReadinessReceiptV2({ receipt: { ...receipt, runId: 'run-9' }, key, expected, resolveEvidence: resolverFor(evidence), now }), /signature does not verify/);
});

test('the evaluator derives verdicts from observations and never trusts the stored gate', () => {
  const evidence = report();
  const evaluated = evaluateReadinessEvidence(evidence);
  assert.equal(evaluated.ready, true);
  assert.deepEqual(evaluated.failures, []);
  const degraded = report({ gateA: true, observations: { ...evidence.observations, liveness: [{ processId: 'child-1', generation: 'child', before: true, after: true }] } });
  const result = evaluateReadinessEvidence(degraded);
  assert.equal(result.ready, false);
  assert.equal(result.verdicts.childCleanup, false);
  assert.match(result.failures.join(' '), /grandchild|before/);
});

test('the evidence resolver is required and the evidence file must exist', () => {
  const evidence = report();
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(evidence), key, expected, resolveEvidence: resolverFor(evidence, { missing: true }), now }), /evidence file is missing/);
});
