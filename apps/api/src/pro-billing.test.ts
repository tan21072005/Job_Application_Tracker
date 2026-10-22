import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import { signPaymentPayload } from './security/payment-signature.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const WEBHOOK_SECRET = 'c13_pro_billing_webhook_secret_0123456789';
const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;
const previousMode = process.env.PAYMENT_MODE;
process.env.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PAYMENT_MODE = 'test';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

type Json = Record<string, unknown>;

interface CheckoutBody extends Json {
  orderId: string;
  plan: string;
  amount: number;
  currency: string;
  transferCode: string;
  mode: string;
  testNotice: string;
  bankName: unknown;
  accountNo: unknown;
  accountName: unknown;
  vietQrUrl: unknown;
  instructions: string;
}

interface WebhookBody extends Json {
  success?: boolean;
  replayed?: boolean;
  orderId?: string;
  plan?: string;
}

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  if (previousSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
  else process.env.PAYMENT_WEBHOOK_SECRET = previousSecret;
  if (previousMode === undefined) delete process.env.PAYMENT_MODE;
  else process.env.PAYMENT_MODE = previousMode;
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `pro_billing_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': origin,
      'X-Forwarded-For': `127.0.4.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie, 'registration must set a session cookie');
  return { userId: body.id, cookie: setCookie.split(';')[0] };
}

async function createOrder(cookie: string, plan: unknown) {
  const res = await fetch(`${base}/api/pro/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin, 'Cookie': cookie },
    body: JSON.stringify({ plan })
  });
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) as CheckoutBody };
}

interface PreparedWebhook {
  raw: string;
  timestamp: number;
  signature: string | null;
}

function prepareWebhook(
  payload: unknown,
  overrides: { timestamp?: number; secret?: string; signature?: string | null } = {}
): PreparedWebhook {
  const raw = JSON.stringify(payload);
  const timestamp = overrides.timestamp ?? Date.now();
  const signature = overrides.signature === undefined
    ? signPaymentPayload({ secret: overrides.secret ?? WEBHOOK_SECRET, timestamp, rawBody: raw })
    : overrides.signature;
  return { raw, timestamp, signature };
}

async function sendWebhook(prepared: PreparedWebhook) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-JobTrack-Timestamp': String(prepared.timestamp)
  };
  if (prepared.signature !== null) headers['X-JobTrack-Signature'] = prepared.signature;
  const res = await fetch(`${base}/api/pro/webhook`, {
    method: 'POST',
    headers,
    body: prepared.raw
  });
  const text = await res.text();
  return { status: res.status, text, body: JSON.parse(text) as WebhookBody };
}

function deliverWebhook(
  payload: unknown,
  overrides: { timestamp?: number; secret?: string; signature?: string | null } = {}
) {
  return sendWebhook(prepareWebhook(payload, overrides));
}

async function readOrder(orderId: string) {
  const res = await pool.query<{
    user_id: string;
    plan: string;
    amount: number;
    status: string;
    completed_at: Date | null;
  }>('SELECT user_id, plan, amount, status, completed_at FROM payment_orders WHERE id = $1', [orderId]);
  return res.rows[0] ?? null;
}

async function readMembership(userId: string) {
  const res = await pool.query<{ tier: string; pro_expires_at: Date | null }>(
    'SELECT tier, pro_expires_at FROM user_memberships WHERE user_id = $1',
    [userId]
  );
  return res.rows[0] ?? null;
}

function daysFromNow(value: unknown): number {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
  assert.ok(Number.isFinite(parsed), 'the membership expiry must be a parseable timestamp');
  return (parsed - Date.now()) / 86400000;
}

async function expectPending(orderId: string, userId: string) {
  const order = await readOrder(orderId);
  assert.equal(order?.status, 'pending');
  assert.equal(order?.completed_at, null);
  assert.equal(await readMembership(userId), null);
}

test('Checkout: the server price, a well formed transfer code and an explicit test mode', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  assert.equal(checkout.status, 200);
  assert.equal(checkout.body.plan, 'monthly');
  assert.equal(checkout.body.amount, 99000);
  assert.equal(checkout.body.currency, 'VND');
  assert.match(checkout.body.transferCode, /^JTPRO[A-Z0-9]{6}$/);
  assert.equal(checkout.body.mode, 'test');
  assert.equal(typeof checkout.body.testNotice, 'string');
  assert.ok(checkout.body.testNotice.length > 20);
  assert.equal(checkout.body.bankName, null);
  assert.equal(checkout.body.accountNo, null);
  assert.equal(checkout.body.accountName, null);
  assert.equal(checkout.body.vietQrUrl, null);
  assert.equal(typeof checkout.body.instructions, 'string');
  assert.ok(checkout.body.instructions.includes(checkout.body.transferCode));

  assert.equal(checkout.text.includes('img.vietqr.io'), false);
  assert.equal(/MB Bank|Vietcombank|Ngân hàng|JOBTRACK PRO|0987654321/i.test(checkout.text), false);

  const order = await readOrder(checkout.body.orderId);
  assert.equal(order?.status, 'pending');
  assert.equal(order?.plan, 'monthly');
  assert.equal(order?.amount, 99000);
  assert.equal(order?.user_id, userId);
});

test('Checkout: an unknown plan falls back to the monthly price', async () => {
  const { cookie } = await registerUser();
  const checkout = await createOrder(cookie, 'lifetime');

  assert.equal(checkout.status, 200);
  assert.equal(checkout.body.plan, 'monthly');
  assert.equal(checkout.body.amount, 99000);

  const order = await readOrder(checkout.body.orderId);
  assert.equal(order?.plan, 'monthly');
  assert.equal(order?.amount, 99000);
});

test('Checkout: a deployment outside test mode fails closed and creates no order', async () => {
  const { cookie, userId } = await registerUser();
  const before = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM payment_orders WHERE user_id = $1',
    [userId]
  );

  process.env.PAYMENT_MODE = 'live';
  try {
    const checkout = await createOrder(cookie, 'monthly');
    assert.equal(checkout.status, 503);
    assert.equal(checkout.body.code, 'live_payments_unavailable');
  } finally {
    process.env.PAYMENT_MODE = 'test';
  }

  const after = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM payment_orders WHERE user_id = $1',
    [userId]
  );
  assert.equal(after.rows[0].count, before.rows[0].count);
});

test('Webhook: a delivery without a signature is refused and changes nothing', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook(
    { transferCode: checkout.body.transferCode, amount: 99000 },
    { signature: null }
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'invalid_webhook_signature');
  await expectPending(checkout.body.orderId, userId);
});

test('Webhook: a wrong signature is refused and changes nothing', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook(
    { transferCode: checkout.body.transferCode, amount: 99000 },
    { secret: `${WEBHOOK_SECRET}-not-the-secret` }
  );

  assert.equal(result.status, 401);
  assert.equal(result.body.code, 'invalid_webhook_signature');
  await expectPending(checkout.body.orderId, userId);
});

test('Webhook: a stale timestamp is refused and changes nothing', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook(
    { transferCode: checkout.body.transferCode, amount: 99000 },
    { timestamp: Date.now() - 600000 }
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'stale_webhook');
  await expectPending(checkout.body.orderId, userId);
});

test('Webhook: a valid signature with a too low amount is refused and leaves the order pending', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook({ transferCode: checkout.body.transferCode, amount: 98000 });

  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'amount_mismatch');
  await expectPending(checkout.body.orderId, userId);
});

test('Webhook: an unknown transfer code is refused and changes nothing', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');
  const unknownCode = checkout.body.transferCode === 'JTPRO000000' ? 'JTPRO111111' : 'JTPRO000000';

  const result = await deliverWebhook({ transferCode: unknownCode, amount: 99000 });

  assert.equal(result.status, 404);
  assert.equal(result.body.code, 'order_not_found');
  await expectPending(checkout.body.orderId, userId);
});

test('Webhook: the exact amount completes the order and extends Pro from the order row', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook({ transferCode: checkout.body.transferCode, amount: 99000 });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.replayed, false);
  assert.equal(result.body.plan, 'monthly');
  assert.equal(result.text.includes(userId), false);
  assert.equal('userId' in result.body, false);
  assert.equal('tier' in result.body, false);
  assert.equal('expiresAt' in result.body, false);

  const order = await readOrder(checkout.body.orderId);
  assert.equal(order?.status, 'completed');
  assert.ok(order?.completed_at);
  assert.equal(order?.user_id, userId);

  const membership = await readMembership(userId);
  assert.equal(membership?.tier, 'pro');

  const days = daysFromNow(membership?.pro_expires_at);
  assert.ok(days > 29.9 && days < 30.1, `expected about 30 days, got ${days}`);

  const status = await fetch(`${base}/api/pro/status`, { headers: { 'Cookie': cookie } });
  assert.equal(status.status, 200);
  const statusBody = (await status.json()) as { tier: string; isPro: boolean; expiresAt: string };
  assert.equal(statusBody.tier, 'pro');
  assert.equal(statusBody.isPro, true);
  assert.equal(new Date(statusBody.expiresAt).toISOString(), new Date(membership?.pro_expires_at ?? 0).toISOString());
});

test('Webhook: replaying the identical signed payload does not extend Pro twice', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');
  const prepared = prepareWebhook({ transferCode: checkout.body.transferCode, amount: 99000 });

  const first = await sendWebhook(prepared);
  assert.equal(first.status, 200);
  assert.equal(first.body.replayed, false);

  const replay = await sendWebhook(prepared);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replayed, true);
  assert.equal(replay.body.orderId, first.body.orderId);

  const membership = await readMembership(userId);
  assert.equal(membership?.tier, 'pro');

  const days = daysFromNow(membership?.pro_expires_at);
  assert.ok(days > 29.9 && days < 30.1, `expected one 30 day period, got ${days}`);

  const order = await readOrder(checkout.body.orderId);
  assert.equal(order?.status, 'completed');
});

test('Webhook: two concurrent identical deliveries extend Pro exactly once', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');
  const prepared = prepareWebhook({ transferCode: checkout.body.transferCode, amount: 99000 });

  const [left, right] = await Promise.all([sendWebhook(prepared), sendWebhook(prepared)]);

  assert.equal(left.status, 200);
  assert.equal(right.status, 200);
  assert.deepEqual([left.body.replayed, right.body.replayed].sort(), [false, true]);
  assert.equal(left.body.orderId, right.body.orderId);

  const membership = await readMembership(userId);
  assert.equal(membership?.tier, 'pro');

  const days = daysFromNow(membership?.pro_expires_at);
  assert.ok(days > 29.9 && days < 30.1, `expected one 30 day period, got ${days}`);

  assert.equal((await readOrder(checkout.body.orderId))?.status, 'completed');
});

test('Activate: self activation is refused and the user keeps no membership', async () => {
  const { cookie, userId } = await registerUser();

  const res = await fetch(`${base}/api/pro/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin, 'Cookie': cookie },
    body: JSON.stringify({ plan: 'yearly' })
  });

  assert.equal(res.status, 403);
  const body = (await res.json()) as { code: string };
  assert.equal(body.code, 'activation_requires_payment');
  assert.equal(await readMembership(userId), null);

  const status = await fetch(`${base}/api/pro/status`, { headers: { 'Cookie': cookie } });
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { tier: 'free', isPro: false, expiresAt: null });
});

test('Webhook: the order owner is the only user activated even when the payload names another user', async () => {
  const owner = await registerUser();
  const foreign = await registerUser();
  const checkout = await createOrder(owner.cookie, 'yearly');

  const result = await deliverWebhook({
    transferCode: checkout.body.transferCode,
    amount: checkout.body.amount,
    userId: foreign.userId,
    user_id: foreign.userId
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.plan, 'yearly');
  assert.equal('userId' in result.body, false);
  assert.equal(result.text.includes(foreign.userId), false);
  assert.equal(result.text.includes(owner.userId), false);

  assert.equal(await readMembership(foreign.userId), null);
  const ownerMembership = await readMembership(owner.userId);
  assert.equal(ownerMembership?.tier, 'pro');

  const days = daysFromNow(ownerMembership?.pro_expires_at);
  assert.ok(days > 364.9 && days < 365.1, `expected about 365 days, got ${days}`);

  const order = await readOrder(checkout.body.orderId);
  assert.equal(order?.user_id, owner.userId);
  assert.equal(order?.status, 'completed');
});

test('Checkout: a deployment that sets no payment mode fails closed and creates no order', async () => {
  const { cookie, userId } = await registerUser();
  const before = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM payment_orders WHERE user_id = $1',
    [userId]
  );

  delete process.env.PAYMENT_MODE;
  try {
    const checkout = await createOrder(cookie, 'monthly');
    assert.equal(checkout.status, 503);
    assert.equal(checkout.body.code, 'live_payments_unavailable');
  } finally {
    process.env.PAYMENT_MODE = 'test';
  }

  const after = await pool.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM payment_orders WHERE user_id = $1',
    [userId]
  );
  assert.equal(after.rows[0].count, before.rows[0].count);
});

test('Webhook: an amount written with a thousands separator is accepted', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook({
    transferCode: checkout.body.transferCode,
    amount: '99.000'
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.replayed, false);

  const membership = await readMembership(userId);
  assert.equal(membership?.tier, 'pro');
  assert.equal((await readOrder(checkout.body.orderId))?.status, 'completed');
});

test('Webhook: a foreign reference in transferCode falls back to the order code in the content', async () => {
  const { cookie, userId } = await registerUser();
  const checkout = await createOrder(cookie, 'monthly');

  const result = await deliverWebhook({
    transferCode: 'NAPAS-REFERENCE-123',
    amount: 99000,
    content: `Chuyen khoan don hang ${checkout.body.transferCode}`
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.replayed, false);

  const membership = await readMembership(userId);
  assert.equal(membership?.tier, 'pro');
  assert.equal((await readOrder(checkout.body.orderId))?.status, 'completed');
});

test('Webhook: a cancelled order is refused and creates no membership', async () => {
  const { userId } = await registerUser();
  const orderId = randomUUID();
  const transferCode = `JTPRO${randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase()}`;

  await pool.query(
    `INSERT INTO payment_orders (id, user_id, plan, amount, currency, transfer_code, status, payment_method)
     VALUES ($1, $2, 'monthly', 99000, 'VND', $3, 'cancelled', 'test')`,
    [orderId, userId, transferCode]
  );

  const result = await deliverWebhook({ transferCode, amount: 99000 });

  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'order_cancelled');
  assert.equal(await readMembership(userId), null);
  assert.equal((await readOrder(orderId))?.status, 'cancelled');
});
