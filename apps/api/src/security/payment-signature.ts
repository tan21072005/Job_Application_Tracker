import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'X-JobTrack-Signature';
export const TIMESTAMP_HEADER = 'X-JobTrack-Timestamp';
export const SIGNATURE_PREFIX = 'v1=';
export const SIGNATURE_TOLERANCE_MS = 300000;
export const MIN_WEBHOOK_SECRET_LENGTH = 16;

const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/i;
const TIMESTAMP_PATTERN = /^\d{1,15}$/;

export type PaymentSignatureFailure =
  | 'secret_not_configured'
  | 'secret_too_short'
  | 'invalid_signature'
  | 'stale_timestamp';

export type PaymentSignatureResult = { ok: true } | { ok: false; reason: PaymentSignatureFailure };

function digest(secret: string, timestamp: string, rawBody: string | Buffer): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest('hex');
}

export function isUsableWebhookSecret(secret: string | undefined): secret is string {
  return typeof secret === 'string' && secret.length >= MIN_WEBHOOK_SECRET_LENGTH;
}

export function signPaymentPayload(input: {
  secret: string;
  timestamp: string | number;
  rawBody: string | Buffer;
}): string {
  if (!isUsableWebhookSecret(input.secret)) {
    throw new RangeError('The payment webhook secret is missing or shorter than the minimum length.');
  }
  return `${SIGNATURE_PREFIX}${digest(input.secret, String(input.timestamp), input.rawBody)}`;
}

export function verifyPaymentSignature(input: {
  secret: string | undefined;
  signature: string | undefined;
  timestamp: string | undefined;
  rawBody: string | Buffer;
  now?: number;
  toleranceMs?: number;
}): PaymentSignatureResult {
  if (!input.secret) {
    return { ok: false, reason: 'secret_not_configured' };
  }
  if (!isUsableWebhookSecret(input.secret)) {
    return { ok: false, reason: 'secret_too_short' };
  }

  const signature = typeof input.signature === 'string' ? input.signature.trim() : '';
  const timestamp = typeof input.timestamp === 'string' ? input.timestamp.trim() : '';
  if (!TIMESTAMP_PATTERN.test(timestamp)) {
    return { ok: false, reason: 'invalid_signature' };
  }
  if (!signature.startsWith(SIGNATURE_PREFIX)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const provided = signature.slice(SIGNATURE_PREFIX.length);
  if (!SIGNATURE_PATTERN.test(provided)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const expected = Buffer.from(digest(input.secret, timestamp, input.rawBody), 'hex');
  const received = Buffer.from(provided.toLowerCase(), 'hex');
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: 'invalid_signature' };
  }

  const issuedAt = Number(timestamp);
  const now = input.now ?? Date.now();
  const tolerance = input.toleranceMs ?? SIGNATURE_TOLERANCE_MS;
  if (!Number.isFinite(issuedAt) || Math.abs(now - issuedAt) > tolerance) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  return { ok: true };
}
