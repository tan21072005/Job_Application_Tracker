import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  READINESS_V2_MAX_EVIDENCE_BYTES,
  READINESS_V2_PROBE_CATALOG,
  READINESS_V2_SCHEMA_VERSION,
  evaluateReadinessEvidence,
  probeCatalogHash,
  signReadinessReceiptV2,
  verifyReadinessReceiptV2,
  witnessProofHash
} from './readiness-v2.mjs';

const key = 'k'.repeat(48);
const hash = value => createHash('sha256').update(value).digest('hex');
const now = Date.now();
const issued = new Date(now - 30_000).toISOString();
const completed = new Date(now - 60_000).toISOString();
const started = new Date(now - 120_000).toISOString();
const runId = '6f1b6a4e-2c7d-4a1e-9f2b-8c1d0e5a7b31';
const modelEndpoint = 'https://model-endpoint.invalid/v1';
const generalEgressEndpoint = 'https://general-egress.invalid/';

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

const deniedHostPaths = {
  'host-repo-read': 'D:/Project/Job_Application_Tracker',
  'common-git-read': 'D:/Project/Job_Application_Tracker/.git',
  'control-state-read': 'D:/Project/Job_Application_Tracker/.agent-state',
  'host-credential-read': 'D:/Project/Job_Application_Tracker/accounts.txt',
  'projection-write': 'D:/Long-term/projection',
  'host-write': 'D:/Project/Job_Application_Tracker'
};

const mountSources = { projection: 'D:/Long-term/projection', scratch: 'D:/Long-term/scratch' };

const witnessBindings = {
  ...deniedHostPaths,
  'transport-general-egress': generalEgressEndpoint
};

const expected = {
  ...binding,
  verifierImplementationHash: hash('verifier-impl'),
  modelEndpoint,
  generalEgressEndpoint,
  deniedHostPaths,
  mountSources,
  witnessBindings
};

const witness = targetId => ({ targetId, connected: true, witnessSha256: witnessProofHash(targetId, witnessBindings[targetId]) });

function report(overrides = {}) {
  const base = {
    schemaVersion: READINESS_V2_SCHEMA_VERSION,
    runId,
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
        witness('host-write'),
        witness('transport-general-egress')
      ],
      namespace: {
        inspected: true,
        mounts: [
          { kind: 'projection', source: mountSources.projection, target: '/projection', readOnly: true },
          { kind: 'scratch', source: mountSources.scratch, target: '/scratch', readOnly: false }
        ],
        invisibleHostPaths: ['host-repo-read', 'common-git-read', 'control-state-read', 'host-credential-read', 'host-write']
      },
      readTargets: [
        { targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'host-repo-read', requirement: 'denied', hostPath: deniedHostPaths['host-repo-read'], outcome: 'absent' },
        { targetId: 'common-git-read', requirement: 'denied', hostPath: deniedHostPaths['common-git-read'], outcome: 'absent' },
        { targetId: 'control-state-read', requirement: 'denied', hostPath: deniedHostPaths['control-state-read'], outcome: 'absent' },
        { targetId: 'host-credential-read', requirement: 'denied', hostPath: deniedHostPaths['host-credential-read'], outcome: 'absent' }
      ],
      writeTargets: [
        { targetId: 'scratch-write', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'projection-write', requirement: 'denied', hostPath: deniedHostPaths['projection-write'], outcome: 'denied' },
        { targetId: 'host-write', requirement: 'denied', hostPath: deniedHostPaths['host-write'], outcome: 'absent' }
      ],
      liveness: [
        { processId: 'child-1', generation: 'child', before: true, after: false },
        { processId: 'grandchild-1', generation: 'grandchild', before: true, after: false }
      ],
      transport: {
        endpoint: modelEndpoint,
        generalEgressEndpoint,
        positiveConnected: true,
        generalEgressBlocked: true
      }
    },
    gateA: true
  };
  return { ...base, ...overrides };
}

const bytesFor = evidence => JSON.stringify(evidence);

function receiptFor(evidence, overrides = {}) {
  const bytes = bytesFor(evidence);
  const payload = {
    schemaVersion: READINESS_V2_SCHEMA_VERSION,
    runId: evidence.runId,
    issuedAt: issued,
    expiresAt: new Date(now + 3_600_000).toISOString(),
    binding: evidence.binding,
    evidence: {
      path: 'evidence/run.json',
      rawSha256: hash(bytes),
      completedAt: evidence.completedAt,
      bytes: Buffer.byteLength(bytes, 'utf8')
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

function resolverFor(evidence, options = {}) {
  const bytes = options.bytes ?? bytesFor(evidence);
  return path => {
    if (options.missing) return { exists: false, sha256: null, bytes: null, path };
    return { exists: true, sha256: hash(bytes), bytes, path: options.path ?? path };
  };
}

function verify(evidence, options = {}) {
  return verifyReadinessReceiptV2({
    receipt: options.receipt ?? receiptFor(evidence),
    key,
    expected: options.expected ?? expected,
    resolveEvidence: options.resolveEvidence ?? resolverFor(evidence, options),
    ...(options.now === undefined ? {} : { now: options.now })
  });
}

test('a complete schema 2 receipt verifies against the actual evidence bytes', () => {
  const evidence = report();
  const verified = verify(evidence);
  assert.equal(verified.derived.gateA, true);
  assert.equal(verified.derived.readIsolation, true);
  assert.equal(verified.payloadHash.length, 64);
});

test('the schema 1 receipt and a schema 1 report body are rejected', () => {
  const legacyReceipt = { schemaVersion: 1, runId, isolation: { readIsolation: 'denied' }, signature: hash('x') };
  assert.throws(() => verify(report(), { receipt: legacyReceipt }), /schema version is not supported/);
  assert.throws(() => verify(report({ schemaVersion: 1 })), /schema version is not supported/);
});

test('a resolver that returns the signed hash with different bytes is rejected', () => {
  const evidence = report();
  const real = bytesFor(evidence);
  const other = `${real.slice(0, real.length - 1)}${real.at(-1) === '}' ? '"' : '}'}`;
  assert.equal(other.length, real.length);
  assert.throws(() => verify(evidence, { receipt: receiptFor(evidence), resolveEvidence: () => ({ exists: true, sha256: hash(other), bytes: other, path: 'evidence/run.json' }) }), /content does not match the receipt/);
});

test('a resolver that serves a different path is rejected', () => {
  const evidence = report();
  assert.throws(() => verify(evidence, { resolveEvidence: resolverFor(evidence, { path: 'evidence/other.json' }) }), /returned a different path/);
});

test('a missing resolver is rejected', () => {
  const evidence = report();
  assert.throws(() => verifyReadinessReceiptV2({ receipt: receiptFor(evidence), key, expected }), /resolver is missing/);
});

test('malformed and oversized evidence are rejected', () => {
  const evidence = report();
  const malformed = 'not json';
  const malformedReceipt = receiptFor(evidence, { evidence: { path: 'evidence/run.json', rawSha256: hash(malformed), completedAt: evidence.completedAt, bytes: Buffer.byteLength(malformed) } });
  assert.throws(() => verify(evidence, { receipt: malformedReceipt, resolveEvidence: () => ({ exists: true, sha256: hash(malformed), bytes: malformed, path: 'evidence/run.json' }) }), /not valid JSON/);
  const oversized = 'x'.repeat(READINESS_V2_MAX_EVIDENCE_BYTES + 1);
  const oversizedReceipt = receiptFor(evidence, { evidence: { path: 'evidence/run.json', rawSha256: hash(oversized), completedAt: evidence.completedAt, bytes: Buffer.byteLength(oversized) } });
  assert.throws(() => verify(evidence, { receipt: oversizedReceipt, resolveEvidence: () => ({ exists: true, sha256: hash(oversized), bytes: oversized, path: 'evidence/run.json' }) }), /larger than the maximum/);
});

test('a stale report in a fresh envelope is rejected', () => {
  const stale = report({ completedAt: new Date(now - 6 * 60 * 60 * 1000).toISOString(), startedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString() });
  assert.throws(() => verify(stale), /issuance delay exceeds the maximum/);
});

test('a future capture and a capture after issuance are rejected', () => {
  const future = report({ startedAt: new Date(now + 60_000).toISOString(), completedAt: new Date(now + 120_000).toISOString() });
  assert.throws(() => verify(future), /completed after issuance|issued before its evidence completed/);
  const late = report({ completedAt: new Date(now + 10_000).toISOString(), startedAt: new Date(now - 10_000).toISOString() });
  assert.throws(() => verify(late), /completed after issuance/);
});

test('a caller supplied clock cannot extend the lifetime', () => {
  const evidence = report();
  const expired = receiptFor(evidence, { expiresAt: new Date(now - 1000).toISOString() });
  assert.throws(() => verify(evidence, { receipt: expired, now: now - 7 * 24 * 60 * 60 * 1000 }), /has expired/);
});

test('the expected context must be complete', () => {
  const evidence = report();
  assert.throws(() => verify(evidence, { expected: {} }), /expected context is missing/);
  for (const field of ['purpose', 'verifierImplementationHash', 'modelEndpoint', 'generalEgressEndpoint', 'deniedHostPaths', 'mountSources', 'witnessBindings']) {
    const partial = { ...expected };
    delete partial[field];
    assert.throws(() => verify(evidence, { expected: partial }), new RegExp(field), field);
  }
  assert.throws(() => verify(evidence, { expected: { ...expected, modelEndpoint: expected.generalEgressEndpoint } }), /same endpoint host/);
  const badMount = { ...expected, mountSources: { ...mountSources, scratch: 'D:/Project/Job_Application_Tracker' } };
  assert.throws(() => verify(evidence, { expected: badMount }), /exposes a denied path through the scratch mount/);
});

test('a wrong binding is rejected for every bound field', () => {
  const cases = ['taskId', 'feature', 'base', 'sourceDigest', 'projectionManifestHash', 'policyHash', 'environmentHash', 'purpose', 'profileHash', 'adapterId', 'imageDigest', 'cliHash', 'nodeHash'];
  for (const field of cases) {
    const evidence = report();
    assert.throws(() => verify(evidence, { expected: { ...expected, [field]: 'other-value' } }), new RegExp(field), field);
  }
});

test('a wrong verifier implementation is rejected', () => {
  const evidence = report();
  assert.throws(() => verify(evidence, { expected: { ...expected, verifierImplementationHash: hash('other-verifier') } }), /another verifier implementation/);
});

test('a stored gateA true with failed observations is rejected', () => {
  const evidence = report({
    observations: {
      ...report().observations,
      readTargets: [{ targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' }, { targetId: 'host-repo-read', requirement: 'denied', hostPath: deniedHostPaths['host-repo-read'], outcome: 'allowed' }]
    }
  });
  assert.throws(() => verify(evidence), /does not prove isolation/);
});

test('a report that omits its negative targets is rejected', () => {
  const evidence = report({
    observations: { ...report().observations, readTargets: [{ targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' }] }
  });
  assert.throws(() => verify(evidence), /read target is missing/);
  const writes = report({
    observations: { ...report().observations, writeTargets: [{ targetId: 'scratch-write', requirement: 'allowed', outcome: 'allowed' }] }
  });
  assert.throws(() => verify(writes), /write target is missing/);
});

test('a report that flips a target requirement is rejected', () => {
  const evidence = report({
    observations: {
      ...report().observations,
      readTargets: [
        { targetId: 'projection-read', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'host-repo-read', requirement: 'allowed', outcome: 'allowed' },
        { targetId: 'common-git-read', requirement: 'denied', hostPath: deniedHostPaths['common-git-read'], outcome: 'absent' },
        { targetId: 'control-state-read', requirement: 'denied', hostPath: deniedHostPaths['control-state-read'], outcome: 'absent' },
        { targetId: 'host-credential-read', requirement: 'denied', hostPath: deniedHostPaths['host-credential-read'], outcome: 'absent' }
      ]
    }
  });
  assert.throws(() => verify(evidence), /wrong requirement/);
});

test('a duplicated or unknown target is rejected', () => {
  const duplicated = report({
    observations: {
      ...report().observations,
      readTargets: [...report().observations.readTargets, { targetId: 'host-repo-read', requirement: 'denied', hostPath: deniedHostPaths['host-repo-read'], outcome: 'absent' }]
    }
  });
  assert.throws(() => verify(duplicated), /reported twice/);
  const unknown = report({
    observations: {
      ...report().observations,
      readTargets: [...report().observations.readTargets, { targetId: 'invented-target', requirement: 'denied', hostPath: 'C:/x', outcome: 'absent' }]
    }
  });
  assert.throws(() => verify(unknown), /not in the fixed catalog/);
});

test('a broken sandbox that denies everything is rejected because positive controls must succeed', () => {
  const broken = report({
    observations: {
      ...report().observations,
      readTargets: [{ targetId: 'projection-read', requirement: 'allowed', outcome: 'denied' }],
      writeTargets: [{ targetId: 'scratch-write', requirement: 'allowed', outcome: 'denied' }]
    }
  });
  assert.throws(() => verify(broken), /positive control did not/);
});

test('a missing probe and a duplicated probe are rejected', () => {
  const missing = report();
  missing.executions = missing.executions.filter(envelope => envelope.commandId !== 'host-write');
  assert.throws(() => verify(missing), /probe is missing/);
  const duplicated = report();
  duplicated.executions = [...duplicated.executions, duplicated.executions[0]];
  assert.throws(() => verify(duplicated), /probe ran twice/);
});

test('a timed out probe is rejected', () => {
  const timedOut = report();
  timedOut.executions = timedOut.executions.map(envelope => envelope.commandId === 'projection-read' ? { ...envelope, timedOut: true } : envelope);
  assert.throws(() => verify(timedOut), /timed out/);
});

test('an operational probe error and a non zero exit are rejected', () => {
  const failed = report();
  failed.executions = failed.executions.map(envelope => envelope.commandId === 'host-write' ? { ...envelope, error: 'EINVAL', exitCode: 1 } : envelope);
  assert.throws(() => verify(failed), /failed operationally/);
  const spawnFailed = report();
  spawnFailed.executions = spawnFailed.executions.map(envelope => envelope.commandId === 'host-write' ? { ...envelope, error: 'spawn failed' } : envelope);
  assert.throws(() => verify(spawnFailed), /failed operationally/);
  const nonZero = report();
  nonZero.executions = nonZero.executions.map(envelope => envelope.commandId === 'host-write' ? { ...envelope, exitCode: 1 } : envelope);
  assert.throws(() => verify(nonZero), /did not complete successfully/);
});

test('namespace absence without host and mount proof is rejected', () => {
  const noNamespaceProof = report();
  noNamespaceProof.observations.namespace.invisibleHostPaths = [];
  assert.throws(() => verify(noNamespaceProof), /absent without namespace and mount proof/);
  const noWitness = report();
  noWitness.observations.hostPositive = noWitness.observations.hostPositive.filter(entry => entry.targetId !== 'host-repo-read');
  assert.throws(() => verify(noWitness), /host positive witness is missing|does not match the trusted binding/);
});

test('a report cannot rename a denied host path', () => {
  const renamed = report({
    observations: {
      ...report().observations,
      readTargets: report().observations.readTargets.map(entry => entry.targetId === 'host-repo-read' ? { ...entry, hostPath: 'C:/unrelated-lookup-path' } : entry)
    }
  });
  assert.throws(() => verify(renamed), /host path does not match the trusted path/);
});

test('a mount that points somewhere else than the trusted source is rejected', () => {
  const swapped = report();
  swapped.observations.namespace.mounts = swapped.observations.namespace.mounts.map(mount => mount.kind === 'scratch' ? { ...mount, source: 'D:/Project/Job_Application_Tracker' } : mount);
  assert.throws(() => verify(swapped), /mount source does not match the trusted source/);
  const other = report();
  other.observations.namespace.mounts = other.observations.namespace.mounts.map(mount => mount.kind === 'scratch' ? { ...mount, source: 'D:/Long-term/scratch-other' } : mount);
  assert.throws(() => verify(other), /mount source does not match the trusted source/);
});

test('the same mount source in another separator form is accepted', () => {
  const same = report();
  same.observations.namespace.mounts = same.observations.namespace.mounts.map(mount => mount.kind === 'scratch' ? { ...mount, source: 'D:\\Long-term\\scratch' } : mount);
  const verified = verify(same);
  assert.equal(verified.derived.gateA, true);
});

test('a mount target that is not the fixed target is rejected', () => {
  const rooted = report();
  rooted.observations.namespace.mounts = rooted.observations.namespace.mounts.map(mount => mount.kind === 'projection' ? { ...mount, target: '/' } : mount);
  assert.throws(() => verify(rooted), /mount target does not match the fixed target/);
});

test('a denied read target that is not mounted is inconsistent and rejected', () => {
  const mounted = report({
    observations: {
      ...report().observations,
      readTargets: report().observations.readTargets.map(entry => entry.targetId === 'host-repo-read' ? { ...entry, outcome: 'denied' } : entry)
    }
  });
  assert.throws(() => verify(mounted), /denial contradicts the mount model/);
});

test('a denied write target is only accepted through a read only mount', () => {
  const writable = report({
    observations: {
      ...report().observations,
      writeTargets: report().observations.writeTargets.map(entry => entry.targetId === 'host-write' ? { ...entry, outcome: 'denied' } : entry)
    }
  });
  assert.throws(() => verify(writable), /denial is not explained by a read only mount/);
  const readOnlyProjection = report({
    observations: {
      ...report().observations,
      writeTargets: report().observations.writeTargets.map(entry => entry.targetId === 'projection-write' ? { ...entry, outcome: 'denied' } : entry)
    }
  });
  assert.equal(verify(readOnlyProjection).derived.gateA, true);
});

test('mismatched egress endpoints are rejected', () => {
  const mismatched = report();
  mismatched.observations.transport.generalEgressEndpoint = 'https://other.invalid/';
  assert.throws(() => verify(mismatched), /general egress endpoint is not the declared endpoint/);
  const same = report();
  same.observations.transport.generalEgressEndpoint = `${modelEndpoint}/`;
  assert.throws(() => verify(same), /same endpoint host|not the declared endpoint/);
  const notAllowlisted = report();
  notAllowlisted.observations.transport.endpoint = 'https://other-model.invalid/';
  assert.throws(() => verify(notAllowlisted), /not the allowlisted endpoint/);
});

test('blocked general egress with an unusable model transport is rejected', () => {
  const unusable = report();
  unusable.observations.transport.positiveConnected = false;
  assert.throws(() => verify(unusable), /positive control did not connect/);
});

test('a worker receipt reused for checks is rejected', () => {
  const evidence = report();
  assert.throws(() => verify(evidence, { expected: { ...expected, purpose: 'check-runner' } }), /purpose/);
});

test('an expired or not yet valid receipt is rejected', () => {
  const evidence = report();
  assert.throws(() => verify(evidence, { receipt: receiptFor(evidence, { expiresAt: new Date(now - 1000).toISOString() }) }), /has expired/);
  assert.throws(() => verify(evidence, { receipt: receiptFor(evidence, { issuedAt: new Date(now + 60_000).toISOString() }) }), /not yet valid/);
});

test('a tampered receipt signature is rejected', () => {
  const evidence = report();
  const receipt = receiptFor(evidence);
  assert.throws(() => verify(evidence, { receipt: { ...receipt, runId: '6f1b6a4e-2c7d-4a1e-9f2b-8c1d0e5a7b33' } }), /signature does not verify/);
});

test('a host witness proof must be derived from the trusted binding', () => {
  const shared = report();
  shared.observations.hostPositive = shared.observations.hostPositive.map(entry => ({ ...entry, witnessSha256: hash('shared') }));
  assert.throws(() => verify(shared), /witness proof does not match the trusted binding/);
  const unknown = report();
  unknown.observations.hostPositive = [...unknown.observations.hostPositive, { targetId: 'invented', connected: true, witnessSha256: hash('invented') }];
  assert.throws(() => verify(unknown), /not a required target/);
});

test('liveness proof must cover two distinct processes', () => {
  const shared = report();
  shared.observations.liveness = [
    { processId: 'same', generation: 'child', before: true, after: false },
    { processId: 'same', generation: 'grandchild', before: true, after: false }
  ];
  assert.throws(() => verify(shared), /reuses one process id/);
  const missing = report();
  missing.observations.liveness = [{ processId: 'child-1', generation: 'child', before: true, after: false }];
  assert.throws(() => verify(missing), /missing the grandchild generation/);
});

test('a run longer than the maximum is rejected', () => {
  const long = report({ startedAt: new Date(now - 3 * 60 * 60 * 1000).toISOString() });
  assert.throws(() => verify(long), /longer than the maximum/);
});

test('the run id must be a uuid', () => {
  assert.throws(() => verify(report({ runId: 'run-1' })), /run id is not a uuid/);
});

test('an unsafe evidence path is rejected', () => {
  const evidence = report();
  const receipt = receiptFor(evidence, { evidence: { path: '../escape.json', rawSha256: hash(bytesFor(evidence)), completedAt: evidence.completedAt, bytes: Buffer.byteLength(bytesFor(evidence)) } });
  assert.throws(() => verify(evidence, { receipt }), /safe relative path/);
});

test('the declared probe command list must match the fixed catalog', () => {
  const evidence = report();
  evidence.catalog.commandIds = ['projection-read'];
  assert.throws(() => verify(evidence), /does not list the fixed commands/);
});

test('evidence with non ascii content is accepted and measured in bytes', () => {
  const evidence = report();
  evidence.observations.liveness = evidence.observations.liveness.map(entry => ({ ...entry, processId: `${entry.processId}-tiếng Việt` }));
  const bytes = bytesFor(evidence);
  const receipt = receiptFor(evidence, { evidence: { path: 'evidence/run.json', rawSha256: hash(bytes), completedAt: evidence.completedAt, bytes: Buffer.byteLength(bytes, 'utf8') } });
  const verified = verify(evidence, { receipt, resolveEvidence: () => ({ exists: true, sha256: hash(bytes), bytes, path: 'evidence/run.json' }) });
  assert.equal(verified.derived.gateA, true);
});

test('the evaluator derives verdicts from observations and never trusts the stored gate', () => {
  const evidence = report();
  const evaluated = evaluateReadinessEvidence(evidence, expected);
  assert.equal(evaluated.ready, true);
  assert.deepEqual(evaluated.failures, []);
  const degraded = report({ gateA: true, observations: { ...evidence.observations, liveness: [{ processId: 'child-1', generation: 'child', before: true, after: true }] } });
  const result = evaluateReadinessEvidence(degraded, expected);
  assert.equal(result.ready, false);
  assert.equal(result.verdicts.childCleanup, false);
});
