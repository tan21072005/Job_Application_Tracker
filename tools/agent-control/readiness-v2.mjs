import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const READINESS_V2_SCHEMA_VERSION = 2;
export const READINESS_V2_MAX_TTL_MS = 24 * 60 * 60 * 1000;
export const READINESS_V2_MAX_ISSUANCE_DELAY_MS = 5 * 60 * 1000;
export const READINESS_V2_MAX_EVIDENCE_BYTES = 4 * 1024 * 1024;
export const READINESS_V2_PURPOSES = Object.freeze(['worker-read', 'check-runner']);

export const READINESS_V2_PROBE_CATALOG = Object.freeze({
  'projection-read': 'projection-read',
  'scratch-write': 'scratch-write',
  'host-repo-read': 'host-repo-read',
  'common-git-read': 'common-git-read',
  'control-state-read': 'control-state-read',
  'host-credential-read': 'host-credential-read',
  'projection-write': 'projection-write',
  'host-write': 'host-write',
  'child-liveness': 'child-liveness',
  'grandchild-liveness': 'grandchild-liveness',
  'transport-positive': 'transport-positive',
  'transport-general-egress': 'transport-general-egress'
});

const sha256 = value => createHash('sha256').update(value).digest('hex');
const isHex64 = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const isTimestamp = value => typeof value === 'string' && !Number.isNaN(Date.parse(value));

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

export function assertReadinessV2Binding(binding) {
  if (!binding || typeof binding !== 'object' || Array.isArray(binding)) throw Error('Readiness binding is missing.');
  for (const field of BINDING_FIELDS) {
    if (!(field in binding)) throw Error(`Readiness binding is missing ${field}.`);
  }
  for (const field of ['sourceDigest', 'projectionManifestHash', 'policyHash', 'environmentHash', 'profileHash', 'imageDigest', 'cliHash', 'nodeHash']) {
    if (!isHex64(binding[field])) throw Error(`Readiness binding field ${field} is not a hash.`);
  }
  if (typeof binding.taskId !== 'string' || !binding.taskId) throw Error('Readiness binding task id is invalid.');
  if (typeof binding.feature !== 'string' || !binding.feature) throw Error('Readiness binding feature is invalid.');
  if (typeof binding.base !== 'string' || !binding.base) throw Error('Readiness binding base is invalid.');
  if (typeof binding.adapterId !== 'string' || !binding.adapterId) throw Error('Readiness binding adapter id is invalid.');
  if (!READINESS_V2_PURPOSES.includes(binding.purpose)) throw Error('Readiness binding purpose is invalid.');
  return binding;
}

function bindingMatches(left, right) {
  return BINDING_FIELDS.every(field => left[field] === right[field]);
}

export function evaluateReadinessEvidence(report) {
  const failures = [];
  const verdicts = {};
  const fail = reason => failures.push(reason);

  if (!report || typeof report !== 'object' || Array.isArray(report)) throw Error('Readiness evidence is missing.');
  if (report.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness evidence schema version is not supported.');
  if (typeof report.runId !== 'string' || !report.runId) throw Error('Readiness evidence has no run id.');
  if (!isTimestamp(report.startedAt) || !isTimestamp(report.completedAt)) throw Error('Readiness evidence timestamps are invalid.');
  if (Date.parse(report.startedAt) > Date.parse(report.completedAt)) fail('readiness evidence started after it completed');
  assertReadinessV2Binding(report.binding);
  if (!report.catalog || typeof report.catalog !== 'object') throw Error('Readiness evidence has no probe catalog.');
  if (report.catalog.probeCatalogHash !== probeCatalogHash()) fail('readiness evidence probe catalog hash does not match the fixed catalog');
  if (!Array.isArray(report.catalog.commandIds)) fail('readiness evidence probe catalog has no command ids');
  if (!Array.isArray(report.executions)) fail('readiness evidence has no execution envelopes');

  const expectedCommands = Object.keys(READINESS_V2_PROBE_CATALOG);
  const seen = new Map();
  for (const envelope of Array.isArray(report.executions) ? report.executions : []) {
    if (!envelope || typeof envelope !== 'object') { fail('readiness execution envelope is invalid'); continue; }
    if (typeof envelope.commandId !== 'string' || !envelope.commandId) { fail('readiness execution envelope has no command id'); continue; }
    if (seen.has(envelope.commandId)) fail(`readiness probe ran twice: ${envelope.commandId}`);
    else seen.set(envelope.commandId, envelope);
  }
  for (const commandId of expectedCommands) {
    if (!seen.has(commandId)) fail(`readiness probe is missing: ${commandId}`);
  }
  for (const [commandId, envelope] of seen) {
    if (!expectedCommands.includes(commandId)) fail(`readiness probe is not in the fixed catalog: ${commandId}`);
    if (envelope.error !== null && envelope.error !== undefined) fail(`readiness probe failed operationally: ${commandId}`);
    if (typeof envelope.exitCode !== 'number' || !Number.isInteger(envelope.exitCode)) fail(`readiness probe has no exit code: ${commandId}`);
    if (envelope.timedOut !== false) fail(`readiness probe timed out: ${commandId}`);
    if (!isHex64(envelope.stdoutSha256) || !isHex64(envelope.stderrSha256)) fail(`readiness probe output hashes are missing: ${commandId}`);
  }

  const observations = report.observations;
  if (!observations || typeof observations !== 'object') throw Error('Readiness evidence has no observations.');

  const hostPositive = Array.isArray(observations.hostPositive) ? observations.hostPositive : [];
  const witnessed = new Set();
  for (const witness of hostPositive) {
    if (!witness || typeof witness.targetId !== 'string' || !witness.targetId) { fail('readiness host witness is invalid'); continue; }
    if (witness.connected !== true) fail(`readiness host positive control did not connect: ${witness.targetId}`);
    if (typeof witness.witness !== 'string' || !witness.witness) fail(`readiness host witness has no proof: ${witness.targetId}`);
    witnessed.add(witness.targetId);
  }
  if (!hostPositive.length) fail('readiness host positive controls are missing');

  const namespace = observations.namespace;
  const namespaceInspected = Boolean(namespace && namespace.inspected === true && Array.isArray(namespace.mounts) && namespace.mounts.length);
  if (!namespaceInspected) fail('readiness namespace inspection is missing');
  const invisible = new Set(Array.isArray(namespace?.invisibleHostPaths) ? namespace.invisibleHostPaths : []);

  const readTargets = Array.isArray(observations.readTargets) ? observations.readTargets : [];
  if (!readTargets.length) fail('readiness read targets are missing');
  let readIsolation = true;
  for (const target of readTargets) {
    if (!target || typeof target.targetId !== 'string' || !target.targetId) { readIsolation = false; fail('readiness read target is invalid'); continue; }
    if (target.requirement === 'allowed') {
      if (target.outcome !== 'allowed') { readIsolation = false; fail(`readiness positive control did not read: ${target.targetId}`); }
      continue;
    }
    if (target.requirement !== 'denied') { readIsolation = false; fail(`readiness read target has no requirement: ${target.targetId}`); continue; }
    if (!witnessed.has(target.targetId)) { readIsolation = false; fail(`readiness read target has no host positive witness: ${target.targetId}`); continue; }
    if (target.outcome === 'denied') continue;
    if (target.outcome === 'absent') {
      if (!namespaceInspected || !invisible.has(target.targetId)) { readIsolation = false; fail(`readiness read target is absent without namespace and mount proof: ${target.targetId}`); }
      continue;
    }
    readIsolation = false;
    fail(`readiness read target was readable: ${target.targetId}`);
  }
  verdicts.readIsolation = readIsolation;

  const writeTargets = Array.isArray(observations.writeTargets) ? observations.writeTargets : [];
  if (!writeTargets.length) fail('readiness write targets are missing');
  let writeIsolation = true;
  for (const target of writeTargets) {
    if (!target || typeof target.targetId !== 'string' || !target.targetId) { writeIsolation = false; fail('readiness write target is invalid'); continue; }
    if (target.requirement === 'allowed') {
      if (target.outcome !== 'allowed') { writeIsolation = false; fail(`readiness positive control did not write: ${target.targetId}`); }
      continue;
    }
    if (target.requirement !== 'denied') { writeIsolation = false; fail(`readiness write target has no requirement: ${target.targetId}`); continue; }
    if (!witnessed.has(target.targetId)) { writeIsolation = false; fail(`readiness write target has no host positive witness: ${target.targetId}`); continue; }
    if (target.outcome === 'denied') continue;
    if (target.outcome === 'absent') {
      if (!namespaceInspected || !invisible.has(target.targetId)) { writeIsolation = false; fail(`readiness write target is absent without namespace and mount proof: ${target.targetId}`); }
      continue;
    }
    writeIsolation = false;
    fail(`readiness write target was writable: ${target.targetId}`);
  }
  verdicts.writeIsolation = writeIsolation;

  const liveness = Array.isArray(observations.liveness) ? observations.liveness : [];
  const generations = new Set(liveness.map(entry => entry?.generation));
  let childCleanup = generations.has('child') && generations.has('grandchild');
  if (!childCleanup) fail('readiness liveness proof is missing a child or grandchild generation');
  for (const entry of liveness) {
    if (!entry || typeof entry.processId !== 'string' || !entry.processId) { childCleanup = false; fail('readiness liveness entry is invalid'); continue; }
    if (entry.before !== true || entry.after !== false) { childCleanup = false; fail(`readiness liveness proof is incomplete: ${entry.processId}`); }
  }
  verdicts.childCleanup = childCleanup;

  const transport = observations.transport;
  let modelTransport = false;
  if (!transport || typeof transport !== 'object') fail('readiness model transport observation is missing');
  else {
    if (typeof transport.endpoint !== 'string' || !transport.endpoint) fail('readiness model transport has no endpoint');
    if (transport.positiveConnected !== true) fail('readiness model transport positive control did not connect');
    if (transport.generalEgressBlocked !== true) fail('readiness general egress was not blocked');
    if (transport.pairedWith !== transport.endpoint) fail('readiness egress endpoints do not match the transport endpoint');
    modelTransport = transport.positiveConnected === true && transport.generalEgressBlocked === true && transport.pairedWith === transport.endpoint;
  }
  verdicts.modelTransport = modelTransport;

  const egressBlocked = modelTransport;
  verdicts.egress = egressBlocked;

  const ready = failures.length === 0 && Object.values(verdicts).every(value => value === true);
  verdicts.gateA = ready;
  return { ready, verdicts, failures };
}

export function verifyReadinessReceiptV2(input) {
  const { receipt, key, expected = {}, resolveEvidence, now = Date.now(), catalog = READINESS_V2_PROBE_CATALOG } = input || {};
  assertReadinessV2Key(key);
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw Error('Readiness receipt is missing.');
  if (receipt.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness receipt schema version is not supported.');
  for (const field of ['runId', 'issuedAt', 'expiresAt', 'binding', 'evidence', 'verifier', 'derived']) {
    if (!(field in receipt)) throw Error(`Readiness receipt is missing ${field}.`);
  }
  if (typeof receipt.runId !== 'string' || !receipt.runId) throw Error('Readiness receipt run id is invalid.');
  if (!isTimestamp(receipt.issuedAt) || !isTimestamp(receipt.expiresAt)) throw Error('Readiness receipt timestamps are invalid.');
  assertReadinessV2Binding(receipt.binding);
  if (!receipt.evidence || typeof receipt.evidence !== 'object') throw Error('Readiness receipt evidence is invalid.');
  if (typeof receipt.evidence.path !== 'string' || !receipt.evidence.path) throw Error('Readiness receipt evidence path is invalid.');
  if (!isHex64(receipt.evidence.rawSha256)) throw Error('Readiness receipt evidence hash is invalid.');
  if (!isTimestamp(receipt.evidence.completedAt)) throw Error('Readiness receipt evidence completion time is invalid.');
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
  if (issuedAt < completedAt) throw Error('Readiness receipt was issued before its evidence completed.');
  if (issuedAt - completedAt > READINESS_V2_MAX_ISSUANCE_DELAY_MS) throw Error('Readiness receipt issuance delay exceeds the maximum.');
  if (completedAt > issuedAt) throw Error('Readiness evidence completed after issuance.');

  if (expected.taskId && receipt.binding.taskId !== expected.taskId) throw Error('Readiness receipt belongs to another task.');
  if (expected.feature && receipt.binding.feature !== expected.feature) throw Error('Readiness receipt belongs to another feature.');
  if (expected.base && receipt.binding.base !== expected.base) throw Error('Readiness receipt belongs to another base.');
  if (expected.sourceDigest && receipt.binding.sourceDigest !== expected.sourceDigest) throw Error('Readiness receipt does not match the source digest.');
  if (expected.projectionManifestHash && receipt.binding.projectionManifestHash !== expected.projectionManifestHash) throw Error('Readiness receipt does not match the projection manifest.');
  if (expected.policyHash && receipt.binding.policyHash !== expected.policyHash) throw Error('Readiness receipt does not match the control plane.');
  if (expected.environmentHash && receipt.binding.environmentHash !== expected.environmentHash) throw Error('Readiness receipt does not match the environment.');
  if (expected.purpose && receipt.binding.purpose !== expected.purpose) throw Error('Readiness receipt belongs to another purpose.');
  if (expected.profileHash && receipt.binding.profileHash !== expected.profileHash) throw Error('Readiness receipt does not match the execution profile.');
  if (expected.adapterId && receipt.binding.adapterId !== expected.adapterId) throw Error('Readiness receipt does not match the adapter.');
  if (expected.imageDigest && receipt.binding.imageDigest !== expected.imageDigest) throw Error('Readiness receipt does not match the image.');
  if (expected.cliHash && receipt.binding.cliHash !== expected.cliHash) throw Error('Readiness receipt does not match the cli binary.');
  if (expected.nodeHash && receipt.binding.nodeHash !== expected.nodeHash) throw Error('Readiness receipt does not match the node binary.');
  if (expected.verifierImplementationHash && receipt.verifier.implementationHash !== expected.verifierImplementationHash) throw Error('Readiness receipt was produced by another verifier implementation.');

  if (typeof resolveEvidence !== 'function') throw Error('Readiness evidence resolver is missing.');
  const resolved = resolveEvidence(receipt.evidence.path);
  if (!resolved || resolved.exists !== true) throw Error('Readiness evidence file is missing.');
  if (typeof resolved.sha256 !== 'string' || !isHex64(resolved.sha256)) throw Error('Readiness evidence resolver returned no hash.');
  if (typeof resolved.bytes !== 'string') throw Error('Readiness evidence resolver returned no bytes.');
  if (resolved.bytes.length > READINESS_V2_MAX_EVIDENCE_BYTES) throw Error('Readiness evidence is larger than the maximum.');
  if (resolved.sha256 !== receipt.evidence.rawSha256) throw Error('Readiness evidence content does not match the receipt.');
  if (receipt.evidence.bytes !== undefined && receipt.evidence.bytes !== resolved.bytes.length) throw Error('Readiness evidence size does not match the receipt.');

  let report;
  try {
    report = JSON.parse(resolved.bytes);
  } catch {
    throw Error('Readiness evidence is not valid JSON.');
  }
  if (!report || typeof report !== 'object') throw Error('Readiness evidence is not an object.');
  if (report.schemaVersion !== READINESS_V2_SCHEMA_VERSION) throw Error('Readiness evidence schema version is not supported.');
  if (report.runId !== receipt.runId) throw Error('Readiness evidence belongs to another run.');
  if (report.completedAt !== receipt.evidence.completedAt) throw Error('Readiness evidence completion time does not match the receipt.');
  if (!bindingMatches(report.binding, receipt.binding)) throw Error('Readiness evidence binding does not match the receipt.');
  if (report.catalog?.probeCatalogHash !== probeCatalogHash(catalog)) throw Error('Readiness evidence probe catalog hash does not match the fixed catalog.');

  const evaluated = evaluateReadinessEvidence(report);
  if (!evaluated.ready) throw Error(`Readiness evidence does not prove isolation: ${evaluated.failures.join('; ')}`);
  if (report.gateA !== true) throw Error('Readiness evidence does not record a passing gate.');
  if (receipt.derived?.gateA !== true) throw Error('Readiness receipt does not record the derived gate.');
  for (const [name, value] of Object.entries(evaluated.verdicts)) {
    if (receipt.derived?.[name] !== value) throw Error(`Readiness receipt derived value does not match the evidence: ${name}`);
  }

  return { ...receipt, derived: evaluated.verdicts, payloadHash: readinessV2PayloadHash(payload) };
}
