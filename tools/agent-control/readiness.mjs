import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const READINESS_SCHEMA_VERSION = 1;
export const READINESS_MAX_TTL_MS = 24 * 60 * 60 * 1000;

export const REQUIRED_ISOLATION = Object.freeze({
  readIsolation: 'denied',
  writeIsolation: 'denied',
  egress: 'denied-with-positive-control',
  childCleanup: 'verified'
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

export function readinessPayloadHash(payload) {
  return sha256(canonicalPayload(payload));
}

export function assertReadinessKey(key) {
  if (typeof key !== 'string' || key.length < 32) throw Error('Readiness key must be at least 32 characters.');
}

export function signReadinessReceipt(payload, key) {
  assertReadinessKey(key);
  const signature = createHmac('sha256', key).update(canonicalPayload(payload)).digest('hex');
  return { ...payload, signature };
}

export function verifyReadinessReceipt(input) {
  const { receipt, key, expected = {}, resolveTarget, now = Date.now() } = input || {};
  assertReadinessKey(key);
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) throw Error('Readiness receipt is missing.');
  if (receipt.schemaVersion !== READINESS_SCHEMA_VERSION) throw Error('Readiness receipt schema version is not supported.');
  const required = ['issuedAt', 'expiresAt', 'taskId', 'feature', 'policyHash', 'environmentFingerprint', 'targets', 'isolation', 'evidence', 'sandboxProbePass'];
  for (const field of required) {
    if (!(field in receipt)) throw Error(`Readiness receipt is missing ${field}.`);
  }
  if (!isTimestamp(receipt.issuedAt) || !isTimestamp(receipt.expiresAt)) throw Error('Readiness receipt timestamps are invalid.');
  if (receipt.projectionManifestHash !== null && !isHex64(receipt.projectionManifestHash)) throw Error('Readiness receipt projection hash is invalid.');
  if (!isHex64(receipt.policyHash) || !isHex64(receipt.environmentFingerprint)) throw Error('Readiness receipt fingerprints are invalid.');
  if (typeof receipt.taskId !== 'string' || !receipt.taskId) throw Error('Readiness receipt task id is invalid.');
  if (typeof receipt.feature !== 'string' || !receipt.feature) throw Error('Readiness receipt feature is invalid.');
  if (!Array.isArray(receipt.targets) || !receipt.targets.length) throw Error('Readiness receipt has no evidence targets.');
  for (const target of receipt.targets) {
    if (!target || typeof target.path !== 'string' || !target.path || !isHex64(target.sha256)) throw Error('Readiness receipt target is invalid.');
  }
  if (!receipt.evidence || typeof receipt.evidence !== 'object') throw Error('Readiness receipt evidence is invalid.');
  if (!isHex64(receipt.evidence.canaryReportHash)) throw Error('Readiness receipt evidence hash is invalid.');
  if (!isTimestamp(receipt.evidence.capturedAt)) throw Error('Readiness receipt evidence timestamp is invalid.');
  if (typeof receipt.evidence.verifier !== 'string' || !receipt.evidence.verifier) throw Error('Readiness receipt evidence verifier is invalid.');
  if (receipt.sandboxProbePass !== true) throw Error('Readiness receipt does not record a successful sandbox probe.');
  for (const [name, value] of Object.entries(REQUIRED_ISOLATION)) {
    if (!receipt.isolation || receipt.isolation[name] !== value) throw Error(`Readiness receipt does not prove ${name}.`);
  }
  const { signature, ...payload } = receipt;
  if (typeof signature !== 'string' || !isHex64(signature)) throw Error('Readiness receipt signature is missing.');
  const calculated = createHmac('sha256', key).update(canonicalPayload(payload)).digest('hex');
  if (!timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(calculated, 'hex'))) throw Error('Readiness receipt signature does not verify.');
  const issuedAt = Date.parse(receipt.issuedAt);
  const expiresAt = Date.parse(receipt.expiresAt);
  if (issuedAt > now) throw Error('Readiness receipt is not yet valid.');
  if (expiresAt <= now) throw Error('Readiness receipt has expired.');
  if (expiresAt - issuedAt > READINESS_MAX_TTL_MS) throw Error('Readiness receipt lifetime exceeds the maximum.');
  if (expected.taskId && receipt.taskId !== expected.taskId) throw Error('Readiness receipt belongs to another task.');
  if (expected.feature && receipt.feature !== expected.feature) throw Error('Readiness receipt belongs to another feature.');
  if (expected.policyHash && receipt.policyHash !== expected.policyHash) throw Error('Readiness receipt does not match the current control plane.');
  if (expected.environmentFingerprint && receipt.environmentFingerprint !== expected.environmentFingerprint) throw Error('Readiness receipt does not match the current environment.');
  if (expected.projectionManifestHash !== undefined && receipt.projectionManifestHash !== expected.projectionManifestHash) throw Error('Readiness receipt does not match the projection manifest.');
  if (typeof resolveTarget === 'function') {
    for (const target of receipt.targets) {
      const resolved = resolveTarget(target.path);
      if (!resolved || resolved.exists !== true) throw Error(`Readiness evidence target is missing: ${target.path}`);
      if (resolved.sha256 !== target.sha256) throw Error(`Readiness evidence target changed: ${target.path}`);
    }
  }
  return { ...receipt, payloadHash: readinessPayloadHash(payload) };
}
