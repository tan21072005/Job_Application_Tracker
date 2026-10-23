import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import { signPaymentPayload } from './security/payment-signature.ts';
import type { ProOrderDTO, ProPlanDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const WEBHOOK_SECRET = 'c13b_pro_order_status_secret_0123456789';
const previousSecret = process.env.PAYMENT_WEBHOOK_SECRET;
const previousMode = process.env.PAYMENT_MODE;
process.env.PAYMENT_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.PAYMENT_MODE = 'test';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 100;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

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
  const email = `order_status_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.4.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'SecurePassword123#2026' })
  });
  assert.equal(res.status, 201);
  const setCookie = res.headers.get('set-cookie');
  assert.ok(setCookie);
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie: setCookie.split(';')[0] };
}

async function createCheckout(cookie: string, plan: string = 'monthly'): Promise<ProOrderDTO> {
  const res = await fetch(`${base}/api/pro/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie,
      'X-Forwarded-For': `127.0.0.${forwardedIp++}`
    },
    body: JSON.stringify({ plan })
  });
  assert.equal(res.status, 200);
  return (await res.json()) as ProOrderDTO;
}

test('Pro Order Status: GET /api/pro/plans returns server-owned plan list', async () => {
  const { cookie } = await registerUser();
  const res = await fetch(`${base}/api/pro/plans`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(res.status, 200);
  const data = (await res.json()) as { plans: ProPlanDTO[] };
  assert.ok(Array.isArray(data.plans));
  assert.equal(data.plans.length, 3);

  const monthly = data.plans.find(p => p.plan === 'monthly');
  assert.ok(monthly);
  assert.equal(monthly.amount, 99000);
  assert.equal(monthly.durationDays, 30);
  assert.equal(monthly.currency, 'VND');

  const quarterly = data.plans.find(p => p.plan === 'quarterly');
  assert.ok(quarterly);
  assert.equal(quarterly.amount, 249000);
  assert.equal(quarterly.durationDays, 90);

  const yearly = data.plans.find(p => p.plan === 'yearly');
  assert.ok(yearly);
  assert.equal(yearly.amount, 799000);
  assert.equal(yearly.durationDays, 365);
});

test('Pro Order Status: GET /api/pro/orders/:orderId returns created pending order', async () => {
  const { cookie } = await registerUser();
  const created = await createCheckout(cookie, 'monthly');

  const res = await fetch(`${base}/api/pro/orders/${created.orderId}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(res.status, 200);
  const order = (await res.json()) as ProOrderDTO;
  assert.equal(order.orderId, created.orderId);
  assert.equal(order.plan, 'monthly');
  assert.equal(order.amount, 99000);
  assert.equal(order.status, 'pending');
  assert.ok(order.transferCode);
  assert.ok(order.createdAt);
  assert.ok(order.expiresAt);
  assert.equal(order.failureReason, null);
  assert.equal(order.completedAt, null);
});

test('Pro Order Status: GET /api/pro/orders/:orderId rejects non-existent and other users order', async () => {
  const user1 = await registerUser();
  const user2 = await registerUser();
  const order1 = await createCheckout(user1.cookie, 'monthly');

  const wrongIdRes = await fetch(`${base}/api/pro/orders/${randomUUID()}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: user1.cookie
    }
  });
  assert.equal(wrongIdRes.status, 404);
  const wrongIdBody = (await wrongIdRes.json()) as { code: string };
  assert.equal(wrongIdBody.code, 'order_not_found');

  const isolationRes = await fetch(`${base}/api/pro/orders/${order1.orderId}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: user2.cookie
    }
  });
  assert.equal(isolationRes.status, 404);
  const isolationBody = (await isolationRes.json()) as { code: string };
  assert.equal(isolationBody.code, 'order_not_found');
});

test('Pro Order Status: order past expires_at is mapped to expired', async () => {
  const { cookie } = await registerUser();
  const created = await createCheckout(cookie, 'monthly');

  await pool.query(
    `UPDATE payment_orders SET expires_at = CURRENT_TIMESTAMP - interval '1 minute' WHERE id = $1`,
    [created.orderId]
  );

  const res = await fetch(`${base}/api/pro/orders/${created.orderId}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(res.status, 200);
  const order = (await res.json()) as ProOrderDTO;
  assert.equal(order.status, 'expired');
});

function prepareWebhook(payload: unknown, secret: string = WEBHOOK_SECRET) {
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = signPaymentPayload({ secret, timestamp, rawBody });
  return { rawBody, timestamp, signature };
}

test('Pro Order Status: webhook amount mismatch records failed and allows retry to paid', async () => {
  const { cookie, userId } = await registerUser();
  const created = await createCheckout(cookie, 'monthly');

  const lowPrepared = prepareWebhook({
    transferCode: created.transferCode,
    amount: 50000
  });

  const lowRes = await fetch(`${base}/api/pro/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-JobTrack-Signature': lowPrepared.signature,
      'X-JobTrack-Timestamp': lowPrepared.timestamp
    },
    body: lowPrepared.rawBody
  });
  assert.equal(lowRes.status, 400);
  const lowBody = (await lowRes.json()) as { code: string };
  assert.equal(lowBody.code, 'amount_mismatch');

  const failedOrderRes = await fetch(`${base}/api/pro/orders/${created.orderId}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(failedOrderRes.status, 200);
  const failedOrder = (await failedOrderRes.json()) as ProOrderDTO;
  assert.equal(failedOrder.status, 'failed');
  assert.equal(failedOrder.failureReason, 'amount_mismatch');

  const fullPrepared = prepareWebhook({
    transferCode: created.transferCode,
    amount: 99000
  });

  const fullRes = await fetch(`${base}/api/pro/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-JobTrack-Signature': fullPrepared.signature,
      'X-JobTrack-Timestamp': fullPrepared.timestamp
    },
    body: fullPrepared.rawBody
  });
  assert.equal(fullRes.status, 200);
  const fullBody = (await fullRes.json()) as { success: boolean; replayed: boolean; orderId: string };
  assert.equal(fullBody.success, true);
  assert.equal(fullBody.replayed, false);
  assert.equal(fullBody.orderId, created.orderId);

  const paidOrderRes = await fetch(`${base}/api/pro/orders/${created.orderId}`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(paidOrderRes.status, 200);
  const paidOrder = (await paidOrderRes.json()) as ProOrderDTO;
  assert.equal(paidOrder.status, 'paid');
  assert.equal(paidOrder.failureReason, null);
  assert.ok(paidOrder.completedAt);

  const statusRes = await fetch(`${base}/api/pro/status`, {
    method: 'GET',
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(statusRes.status, 200);
  const proStatus = (await statusRes.json()) as { isPro: boolean; tier: string };
  assert.equal(proStatus.isPro, true);
  assert.equal(proStatus.tier, 'pro');
});
