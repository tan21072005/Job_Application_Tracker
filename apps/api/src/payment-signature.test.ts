import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_WEBHOOK_SECRET_LENGTH,
  SIGNATURE_TOLERANCE_MS,
  signPaymentPayload,
  verifyPaymentSignature
} from './security/payment-signature.ts';

const secret = 'c13_payment_signature_test_secret_0123456789';
const timestamp = 1790000000000;
const rawBody = JSON.stringify({ transferCode: 'JTPROABC123', amount: 99000 });

test('Payment signature: a signed payload round trips', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });

  assert.match(signature, /^v1=[0-9a-f]{64}$/);
  assert.deepEqual(
    verifyPaymentSignature({ secret, signature, timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: true }
  );
});

test('Payment signature: the same body signed twice is stable while a whitespace change is not', () => {
  const first = signPaymentPayload({ secret, timestamp, rawBody });
  const second = signPaymentPayload({ secret, timestamp, rawBody });

  assert.equal(first, second);
  assert.notEqual(first, signPaymentPayload({ secret, timestamp, rawBody: `${rawBody} ` }));
});

test('Payment signature: a changed body fails', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });
  const tamperedBody = JSON.stringify({ transferCode: 'JTPROABC123', amount: 1 });

  assert.deepEqual(
    verifyPaymentSignature({ secret, signature, timestamp: String(timestamp), rawBody: tamperedBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
});

test('Payment signature: a changed timestamp fails', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });

  assert.deepEqual(
    verifyPaymentSignature({ secret, signature, timestamp: String(timestamp + 1), rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
});

test('Payment signature: a wrong secret fails', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });

  assert.deepEqual(
    verifyPaymentSignature({
      secret: `${secret}-other`,
      signature,
      timestamp: String(timestamp),
      rawBody,
      now: timestamp
    }),
    { ok: false, reason: 'invalid_signature' }
  );
});

test('Payment signature: a timestamp outside the window is stale', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });

  assert.deepEqual(
    verifyPaymentSignature({
      secret,
      signature,
      timestamp: String(timestamp),
      rawBody,
      now: timestamp + SIGNATURE_TOLERANCE_MS + 1
    }),
    { ok: false, reason: 'stale_timestamp' }
  );
  assert.deepEqual(
    verifyPaymentSignature({
      secret,
      signature,
      timestamp: String(timestamp),
      rawBody,
      now: timestamp + SIGNATURE_TOLERANCE_MS
    }),
    { ok: true }
  );
});

test('Payment signature: a short secret is refused', () => {
  const shortSecret = 'a'.repeat(MIN_WEBHOOK_SECRET_LENGTH - 1);

  assert.throws(() => signPaymentPayload({ secret: shortSecret, timestamp, rawBody }), RangeError);
  assert.deepEqual(
    verifyPaymentSignature({
      secret: shortSecret,
      signature: signPaymentPayload({ secret, timestamp, rawBody }),
      timestamp: String(timestamp),
      rawBody,
      now: timestamp
    }),
    { ok: false, reason: 'secret_too_short' }
  );
});

test('Payment signature: a missing secret or malformed signature is refused', () => {
  const signature = signPaymentPayload({ secret, timestamp, rawBody });

  assert.deepEqual(
    verifyPaymentSignature({ secret: undefined, signature, timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: false, reason: 'secret_not_configured' }
  );
  assert.deepEqual(
    verifyPaymentSignature({ secret, signature: undefined, timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
  assert.deepEqual(
    verifyPaymentSignature({ secret, signature: signature.slice(3), timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
  assert.deepEqual(
    verifyPaymentSignature({ secret, signature: `${signature}00`, timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
  assert.deepEqual(
    verifyPaymentSignature({ secret, signature, timestamp: 'not-a-number', rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
});

test('Payment signature: a signature issued for one secret cannot be replayed against another', () => {
  const otherSecret = 'c13_payment_signature_other_secret_9876543210';
  const signature = signPaymentPayload({ secret: otherSecret, timestamp, rawBody });

  assert.deepEqual(
    verifyPaymentSignature({ secret, signature, timestamp: String(timestamp), rawBody, now: timestamp }),
    { ok: false, reason: 'invalid_signature' }
  );
});
