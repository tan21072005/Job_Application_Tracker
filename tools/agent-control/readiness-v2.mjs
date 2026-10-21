import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const READINESS_V2_SCHEMA_VERSION = 2;
export const READINESS_V2_MAX_TTL_MS = 24 * 60 * 60 * 1000;
export const READINESS_V2_MAX_ISSUANCE_DELAY_MS = 5 * 60 * 1000;
export const READINESS_V2_MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;
export const READINESS_V2_MAX_RUN_DURATION_MS = 30 * 60 * 1000;
export const READINESS_V2_PURPOSES = Object.freeze(['worker-read', 'check-runner']);

export const READINESS_V2_PROBE_CATALOG = Object.freeze({
  'projection-read': Object.freeze({ kind: 'read', requirement: 'allowed', targetId: 'projection-read' }),
  'scratch-write': Object.freeze({ kind: 'write', requirement: 'allowed', targetId: 'scratch-write' }),
  'host-repo-read': Object.freeze({ kind: 'read', requirement: 'denied', targetId: 'host-repo-read' }),
  'common-git-read': Object.freeze({ kind: 'read', requirement: 'denied', targetId: 'common-git-read' }),
  'control-state-read': Object.freeze({ kind: 'read', requirement: 'denied', targetId: 'control-state-read' }),
  'host-credential-read': Object.freeze({ kind: 'read', requirement: 'denied', targetId: 'host-credential-read' }),
  'projection-write': Object.freeze({ kind: 'write', requirement: 'denied', targetId: 'projection-write' }),
  'host-write': Object.freeze({ kind: 'write', requirement: 'denied', targetId: 'host-write' }),
  'child-liveness': Object.freeze({ kind: 'liveness', generation: 'child', requirement: 'denied' }),
  'grandchild-liveness': Object.freeze({ kind: 'liveness', generation: 'grandchild', requirement: 'denied' }),
  'transport-positive': Object.freeze({ kind: 'network', requirement: 'allowed', targetId: 'transport-positive' }),
  'transport-general-egress': Object.freeze({ kind: 'network', requirement: 'denied', targetId: 'transport-general-egress' })
});

export const READINESS_V2_EXPECTED_MOUNTS = Object.freeze([
  Object.freeze({ kind: 'projection', readOnly: true }),
  Object.freeze({ kind: 'scratch', readOnly: false })
]);

const BINDING_FIELDS = Object.freeze([
  'taskId',
  'feature',
  'base',
  'sourceDigest',
  'projectionManifestHash',
  'policyHash',
  'environmentHash',
  'purpose',
  'profileHash',
  'adapterId',
  'imageDigest',
  'cliHash',
  'nodeHash'
]);

const HASH_BINDING_FIELDS = Object.freeze([
  'sourceDigest',
  'projectionManifestHash',
  'policyHash',
  'environmentHash',
  'profileHash',
  'imageDigest',
  'cliHash',
  'nodeHash'
]);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const isHex64 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isTimestamp = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const isSafeRelativePath = value => typeof value === 'string' && value.length > 0 && value.length <= 240 && !value.includes('\\') && !value.startsWith('/') && !value.includes(':') && value.split('/').every(part => part && part !== '.' && part !== '..');

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
}

const canonicalPayload = payload => JSON.stringify(canonicalize(payload));

export function readinessV2PayloadHash(payload) {
  return sha256(canonicalPayload(payload));
}

export function probeCatalogHash(catalog = READINESS_V2_PROBE_CATALOG) {
  return sha256(canonicalPayload(catalog));
}

export function assertReadinessV2Key(key) {
  if (typeof key !== 'string' || key.length < 32) throw Error('Readiness key must be at least 32 characters.');
}

export function signReadinessReceiptV2(payload, key) {
  assertReadinessV2Key(key);
  const signature = createHmac('sha256', key).update(canonicalPayload(payload)).digest('hex');
  return { ...payload, signature };
}

export function assertReadinessV2Binding(binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) throw Error('Readiness binding is missing.');
  for (const field of BINDING_FIELDS) {
    if (!(field in binding)) throw Error(`Readiness binding is missing ${field}.`);
  }
  for (const field of HASH_BINDING_FIELDS) {
    if (!isHex64(binding[field])) throw Error(`Readiness binding field ${field} is not a hash.`);
  }
  if (typeof binding.taskId !== 'string' || !binding.taskId) throw Error('Readiness binding task id is invalid.');
  if (typeof binding.feature !== 'string' || !binding.feature) throw Error('Readiness binding feature is invalid.');
  if (typeof binding.base !== 'string' || !binding.base) throw Error('Readiness binding base is invalid.');
  if (typeof binding.adapterId !== 'string' || !binding.adapterId) throw Error('Readiness binding adapter id is invalid.');
  if (!READINESS_V2_PURPOSES.includes(binding.purpose)) throw Error('Readiness binding purpose is invalid.');
  return binding;
}

export function assertReadinessV2ExpectedContext(expected) {
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) throw Error('Readiness expected context is missing.');
  for (const field of BINDING_FIELDS) {
    if (!(field in expected)) throw Error(`Readiness expected context is missing ${field}.`);
  }
  if (!('verifierImplementationHash' in expected)) throw Error('Readiness expected context is missing verifierImplementationHash.');
  if (!('modelEndpoint' in expected) || typeof expected.modelEndpoint !== 'string' || !expected.modelEndpoint) throw Error('Readiness expected context is missing modelEndpoint.');
  if (!('generalEgressEndpoint' in expected) || typeof expected.generalEgressEndpoint !== 'string' || !expected.generalEgressEndpoint) throw Error('Readiness expected context is missing generalEgressEndpoint.');
  if (expected.modelEndpoint === expected.generalEgressEndpoint) throw Error('Readiness expected context uses the same endpoint for transport and general egress.');
  return expected;
}

function bindingMatches(left, right) {
  return BINDING_FIELDS.every(field => left[field] === right[field]);
}

function catalogEntriesOfKind(kind) {
  return Object.entries(READINESS_V2_PROBE_CATALOG)
    .filter(([, entry]) => entry.kind === kind)
    .map(([commandId, entry]) => ({ commandId, ...entry }));
}

export function evaluateReadinessEvidence(report) {
  const failures = [];
  const verdicts = {};
  const fail = reason => failures.push(reason);

  if (!report || typeof report !== 'object' || Array.isArray(report)) throw Error('Readiness evidence is missing.');
  if (report.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness evidence schema version is not supported.');
  if (!isUuid(report.runId)) throw Error('Readiness evidence run id is not a uuid.');
  if (!isTimestamp(report.startedAt) || !isTimestamp(report.completedAt)) throw Error('Readiness evidence timestamps are invalid.');
  if (Date.parse(report.startedAt) > Date.parse(report.completedAt)) fail('readiness evidence started after it completed');
  if (Date.parse(report.completedAt) - Date.parse(report.startedAt) > READINESS_V2_MAX_RUN_DURATION_MS) fail('readiness evidence run is longer than the maximum');
  assertReadinessV2Binding(report.binding);
  if (!report.catalog || typeof report.catalog !== 'object') throw Error('Readiness evidence has no probe catalog.');
  if (report.catalog.probeCatalogHash !== probeCatalogHash()) fail('readiness evidence probe catalog hash does not match the fixed catalog');
  const expectedCommandIds = Object.keys(READINESS_V2_PROBE_CATALOG).sort();
  if (!Array.isArray(report.catalog.commandIds) || JSON.stringify(canonicalize(report.catalog.commandIds.slice().sort())) !== JSON.stringify(canonicalize(expectedCommandIds))) {
    fail('readiness evidence probe catalog does not list the fixed commands');
  }
  if (!Array.isArray(report.executions)) fail('readiness evidence has no execution envelopes');

  const seen = new Map();
  for (const envelope of Array.isArray(report.executions) ? report.executions : []) {
    if (!envelope || typeof envelope !== 'object') { fail('readiness execution envelope is invalid'); continue; }
    if (typeof envelope.commandId !== 'string' || !envelope.commandId) { fail('readiness execution envelope has no command id'); continue; }
    if (seen.has(envelope.commandId)) fail(`readiness probe ran twice: ${envelope.commandId}`);
    else seen.set(envelope.commandId, envelope);
  }
  for (const commandId of expectedCommandIds) {
    if (!seen.has(commandId)) fail(`readiness probe is missing: ${commandId}`);
  }
  for (const [commandId, envelope] of seen) {
    if (!Object.hasOwn(READINESS_V2_PROBE_CATALOG, commandId)) { fail(`readiness probe is not in the fixed catalog: ${commandId}`); continue; }
    if (envelope.error !== null && envelope.error !== undefined) fail(`readiness probe failed operationally: ${commandId}`);
    if (envelope.exitCode !== 0) fail(`readiness probe did not complete successfully: ${commandId}`);
    if (envelope.timedOut !== false) fail(`readiness probe timed out: ${commandId}`);
    if (!isHex64(envelope.stdoutSha256) || !isHex64(envelope.stderrSha256)) fail(`readiness probe output hashes are missing: ${commandId}`);
  }

  const observations = report.observations;
  if (!observations || typeof observations !== 'object') throw Error('Readiness evidence has no observations.');

  const witnessed = new Set();
  const hostPositive = Array.isArray(observations.hostPositive) ? observations.hostPositive : [];
  for (const witness of hostPositive) {
    if (!witness || typeof witness.targetId !== 'string' || !witness.targetId) { fail('readiness host witness is invalid'); continue; }
    if (witness.connected !== true) fail(`readiness host positive control did not connect: ${witness.targetId}`);
    if (!isHex64(witness.witnessSha256)) fail(`readiness host witness has no proof hash: ${witness.targetId}`);
    witnessed.add(witness.targetId);
  }
  if (!hostPositive.length) fail('readiness host positive controls are missing');

  const namespace = observations.namespace;
  const mounts = namespace && Array.isArray(namespace.mounts) ? namespace.mounts : [];
  const namespaceInspected = Boolean(namespace && namespace.inspected === true && mounts.length === READINESS_V2_EXPECTED_MOUNTS.length);
  if (!namespaceInspected) fail('readiness namespace inspection is missing');
  const mountSources = [];
  for (const mount of mounts) {
    if (!mount || typeof mount !== 'object' || typeof mount.kind !== 'string' || !mount.kind) { fail('readiness mount entry is invalid'); continue; }
    if (typeof mount.source !== 'string' || !mount.source) fail(`readiness mount entry has no source: ${mount.kind}`);
    else mountSources.push(mount.source);
    if (typeof mount.readOnly !== 'boolean') fail(`readiness mount entry has no read only flag: ${mount.kind}`);
  }
  for (const expectedMount of READINESS_V2_EXPECTED_MOUNTS) {
    const match = mounts.find(mount => mount && mount.kind === expectedMount.kind);
    if (!match) { fail(`readiness namespace is missing the ${expectedMount.kind} mount`); continue; }
    if (match.readOnly !== expectedMount.readOnly) fail(`readiness ${expectedMount.kind} mount has the wrong read only flag`);
  }
  const invisible = new Set(Array.isArray(namespace?.invisibleHostPaths) ? namespace.invisibleHostPaths : []);

  const evaluateTargets = (kind, observed) => {
    const expected = catalogEntriesOfKind(kind);
    const entries = Array.isArray(observed) ? observed : [];
    if (!entries.length) fail(`readiness ${kind} targets are missing`);
    const byTarget = new Map();
    for (const entry of entries) {
      if (!entry || typeof entry.targetId !== 'string' || !entry.targetId) { fail(`readiness ${kind} target is invalid`); continue; }
      if (byTarget.has(entry.targetId)) fail(`readiness ${kind} target is reported twice: ${entry.targetId}`);
      else byTarget.set(entry.targetId, entry);
    }
    let ok = true;
    for (const { targetId, requirement } of expected) {
      const entry = byTarget.get(targetId);
      if (!entry) { ok = false; fail(`readiness ${kind} target is missing: ${targetId}`); continue; }
      if (entry.requirement !== requirement) { ok = false; fail(`readiness ${kind} target has the wrong requirement: ${targetId}`); continue; }
      if (requirement === 'allowed') {
        if (entry.outcome !== 'allowed') { ok = false; fail(`readiness positive control did not ${kind}: ${targetId}`); }
        continue;
      }
      if (typeof entry.hostPath !== 'string' || !entry.hostPath) { ok = false; fail(`readiness ${kind} target has no host path: ${targetId}`); continue; }
      if (!witnessed.has(targetId)) { ok = false; fail(`readiness ${kind} target has no host positive witness: ${targetId}`); continue; }
      if (entry.outcome === 'denied') {
        if (kind === 'read') {
          const exposed = mountSources.some(source => source.toLowerCase().includes(entry.hostPath.toLowerCase()));
          if (exposed) { ok = false; fail(`readiness ${kind} target is mounted into the isolated run: ${targetId}`); }
        }
        continue;
      }
      if (entry.outcome === 'absent') {
        if (!namespaceInspected || !invisible.has(targetId)) { ok = false; fail(`readiness ${kind} target is absent without namespace and mount proof: ${targetId}`); continue; }
        const exposed = mountSources.some(source => source.toLowerCase().includes(entry.hostPath.toLowerCase()));
        if (exposed) { ok = false; fail(`readiness ${kind} target is mounted into the isolated run: ${targetId}`); }
        continue;
      }
      ok = false;
      fail(`readiness ${kind} target was reachable: ${targetId}`);
    }
    for (const targetId of byTarget.keys()) {
      if (!expected.some(entry => entry.targetId === targetId)) { ok = false; fail(`readiness ${kind} target is not in the fixed catalog: ${targetId}`); }
    }
    return ok;
  };

  verdicts.readIsolation = evaluateTargets('read', observations.readTargets);
  verdicts.writeIsolation = evaluateTargets('write', observations.writeTargets);

  const liveness = Array.isArray(observations.liveness) ? observations.liveness : [];
  const generations = new Map();
  let childCleanup = true;
  for (const entry of liveness) {
    if (!entry || typeof entry.processId !== 'string' || !entry.processId) { childCleanup = false; fail('readiness liveness entry is invalid'); continue; }
    if (typeof entry.generation !== 'string' || !entry.generation) { childCleanup = false; fail('readiness liveness entry has no generation'); continue; }
    if (generations.has(entry.generation)) childCleanup = false;
    generations.set(entry.generation, entry.processId);
    if (entry.before !== true || entry.after !== false) { childCleanup = false; fail(`readiness liveness proof is incomplete: ${entry.processId}`); }
  }
  for (const generation of ['child', 'grandchild']) {
    if (!generations.has(generation)) { childCleanup = false; fail(`readiness liveness proof is missing the ${generation} generation`); }
  }
  if (generations.get('child') && generations.get('child') === generations.get('grandchild')) {
    childCleanup = false;
    fail('readiness liveness proof reuses one process id for two generations');
  }
  verdicts.childCleanup = childCleanup;

  const transport = observations.transport;
  let modelTransport = false;
  let egress = false;
  if (!transport || typeof transport !== 'object') fail('readiness model transport observation is missing');
  else {
    if (typeof transport.endpoint !== 'string' || !transport.endpoint) fail('readiness model transport has no endpoint');
    if (typeof transport.generalEgressEndpoint !== 'string' || !transport.generalEgressEndpoint) fail('readiness general egress has no endpoint');
    if (transport.endpoint === transport.generalEgressEndpoint) fail('readiness general egress uses the model transport endpoint');
    if (transport.positiveConnected !== true) fail('readiness model transport positive control did not connect');
    if (transport.generalEgressBlocked !== true) fail('readiness general egress was not blocked');
    if (!witnessed.has('transport-general-egress')) fail('readiness general egress has no host positive witness');
    modelTransport = transport.positiveConnected === true && typeof transport.endpoint === 'string' && transport.endpoint.length > 0;
    egress = transport.generalEgressBlocked === true && transport.generalEgressEndpoint !== transport.endpoint && witnessed.has('transport-general-egress');
  }
  verdicts.modelTransport = modelTransport;
  verdicts.egress = egress;

  const ready = failures.length === 0 && Object.values(verdicts).every(value => value === true);
  verdicts.gateA = ready;
  return { ready, verdicts, failures };
}

export function verifyReadinessReceiptV2(input) {
  const { receipt, key, expected, resolveEvidence, now = Date.now() } = input || {};
  assertReadinessV2Key(key);
  assertReadinessV2ExpectedContext(expected);
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw Error('Readiness receipt is missing.');
  if (receipt.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness receipt schema version is not supported.');
  for (const field of ['runId', 'issuedAt', 'expiresAt', 'binding', 'evidence', 'verifier', 'derived']) {
    if (!(field in receipt)) throw Error(`Readiness receipt is missing ${field}.`);
  }
  if (!isUuid(receipt.runId)) throw Error('Readiness receipt run id is not a uuid.');
  if (!isTimestamp(receipt.issuedAt) || !isTimestamp(receipt.expiresAt)) throw Error('Readiness receipt timestamps are invalid.');
  assertReadinessV2Binding(receipt.binding);
  if (!receipt.evidence || typeof receipt.evidence !== 'object') throw Error('Readiness receipt evidence is invalid.');
  if (!isSafeRelativePath(receipt.evidence.path)) throw Error('Readiness receipt evidence path is not a safe relative path.');
  if (!isHex64(receipt.evidence.rawSha256)) throw Error('Readiness receipt evidence hash is invalid.');
  if (!isTimestamp(receipt.evidence.completedAt)) throw Error('Readiness receipt evidence completion time is invalid.');
  if (typeof receipt.evidence.bytes !== 'number' || !Number.isInteger(receipt.evidence.bytes) || receipt.evidence.bytes < 0) throw Error('Readiness receipt evidence size is invalid.');
  if (!receipt.verifier || typeof receipt.verifier.id !== 'string' || !receipt.verifier.id) throw Error('Readiness receipt verifier is invalid.');
  if (!isHex64(receipt.verifier.implementationHash)) throw Error('Readiness receipt verifier implementation hash is invalid.');

  const { signature, ...payload } = receipt;
  if (typeof signature !== 'string' || !isHex64(signature)) throw Error('Readiness receipt signature is missing.');
  const calculated = createHmac('sha256', key).update(canonicalPayload(payload)).digest('hex');
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(calculated, 'hex'))) throw Error('Readiness receipt signature does not verify.');

  const issuedAt = Date.parse(receipt.issuedAt);
  const expiresAt = Date.parse(receipt.expiresAt);
  const completedAt = Date.parse(receipt.evidence.completedAt);
  if (issuedAt > now) throw Error('Readiness receipt is not yet valid.');
  if (expiresAt <= now) throw Error('Readiness receipt has expired.');
  if (expiresAt - issuedAt > READINESS_V2_MAX_TTL_MS) throw Error('Readiness receipt lifetime exceeds the maximum.');
  if (completedAt > issuedAt) throw Error('Readiness evidence completed after issuance.');
  if (issuedAt - completedAt > READINESS_V2_MAX_ISSUANCE_DELAY_MS) throw Error('Readiness receipt issuance delay exceeds the maximum.');

  for (const field of BINDING_FIELDS) {
    if (receipt.binding[field] !== expected[field]) throw Error(`Readiness receipt does not match the expected ${field}.`);
  }
  if (receipt.verifier.implementationHash !== expected.verifierImplementationHash) throw Error('Readiness receipt was produced by another verifier implementation.');

  if (typeof resolveEvidence !== 'function') throw Error('Readiness evidence resolver is missing.');
  const resolved = resolveEvidence(receipt.evidence.path);
  if (!resolved || resolved.exists !== true) throw Error('Readiness evidence file is missing.');
  if (typeof resolved.bytes !== 'string') throw Error('Readiness evidence resolver returned no bytes.');
  const byteLength = Buffer.byteLength(resolved.bytes, 'utf8');
  if (byteLength > READINESS_V2_MAX_EVIDENCE_BYTES) throw Error('Readiness evidence is larger than the maximum.');
  if (byteLength !== receipt.evidence.bytes) throw Error('Readiness evidence size does not match the receipt.');
  const computed = sha256(resolved.bytes);
  if (computed !== receipt.evidence.rawSha256) throw Error('Readiness evidence content does not match the receipt.');
  if (typeof resolved.sha256 === 'string' && resolved.sha256 !== computed) throw Error('Readiness evidence resolver hash does not match the evidence bytes.');

  let report;
  try {
    report = JSON.parse(resolved.bytes);
  } catch {
    throw Error('Readiness evidence is not valid JSON.');
  }
  if (!report || typeof report !== 'object' || Array.isArray(report)) throw Error('Readiness evidence is not an object.');
  if (report.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness evidence schema version is not supported.');
  if (report.runId !== receipt.runId) throw Error('Readiness evidence belongs to another run.');
  if (report.completedAt !== receipt.evidence.completedAt) throw Error('Readiness evidence completion time does not match the receipt.');
  if (!bindingMatches(report.binding, receipt.binding)) throw Error('Readiness evidence binding does not match the receipt.');
  const transport = report.observations?.transport;
  if (!transport || typeof transport !== 'object') throw Error('Readiness evidence has no transport observation.');
  if (transport.endpoint !== expected.modelEndpoint) throw Error('Readiness evidence model transport endpoint is not the allowlisted endpoint.');
  if (transport.generalEgressEndpoint !== expected.generalEgressEndpoint) throw Error('Readiness evidence general egress endpoint is not the declared endpoint.');

  const evaluated = evaluateReadinessEvidence(report);
  if (!evaluated.ready) throw Error(`Readiness evidence does not prove isolation: ${evaluated.failures.join('; ')}`);
  if (report.gateA !== true) throw Error('Readiness evidence does not record a passing gate.');
  if (receipt.derived?.gateA !== true) throw Error('Readiness receipt does not record the derived gate.');
  for (const [name, value] of Object.entries(evaluated.verdicts)) {
    if (receipt.derived?.[name] !== value) throw Error(`Readiness receipt derived value does not match the evidence: ${name}`);
  }

  return { ...receipt, derived: evaluated.verdicts, payloadHash: readinessV2PayloadHash(payload) };
}
