import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, checkRateLimit } from './server.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

process.env.MAIL_TRANSPORT = 'console';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';

const password = 'MatKhauDai123!@#XYZ';

const call = async (path: string, options: RequestInit & { ip?: string; cookie?: string } = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: origin,
    ...(options.ip ? { 'X-Forwarded-For': options.ip } : {}),
    ...(options.cookie ? { Cookie: options.cookie } : {})
  };
  const response = await fetch(base + path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await response.text();
  let body: unknown = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: response.status, body, cookie, headers: response.headers };
};

const register = async (ip?: string) => {
  const email = `rl_${randomUUID()}@example.com`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    ip,
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 201, `register failed: ${JSON.stringify(result.body)}`);
  const id = (result.body as { id: string }).id;
  testUsers.push(id);
  return { id, email, cookie: result.cookie };
};

test.before(async () => {
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

test('checkRateLimit keeps separate buckets per scope prefix', async () => {
  const subject = `scope-${randomUUID()}`;
  const first = await checkRateLimit(pool, subject, 2, 15, 'auth-ip');
  assert.equal(first.allowed, true);
  assert.equal(first.count, 1);

  const second = await checkRateLimit(pool, subject, 2, 15, 'auth-pair');
  assert.equal(second.allowed, true);
  assert.equal(second.count, 1, 'different scope must start its own counter');

  const third = await checkRateLimit(pool, subject, 2, 15, 'auth-ip');
  assert.equal(third.count, 2);

  const blocked = await checkRateLimit(pool, subject, 2, 15, 'auth-ip');
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.count, 3);
});

test('users behind the same NAT can log in independently', async () => {
  const sharedIp = '127.0.91.10';
  const alice = await register(sharedIp);
  const bob = await register(sharedIp);

  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const wrong = await call('/api/auth/login', {
      method: 'POST',
      ip: sharedIp,
      body: JSON.stringify({ email: alice.email, password: 'WrongPassword123!@#' })
    });
    assert.equal(wrong.status, 401, `attempt ${attempt} should be 401 not ${wrong.status}`);
  }

  const bobLogin = await call('/api/auth/login', {
    method: 'POST',
    ip: sharedIp,
    body: JSON.stringify({ email: bob.email, password })
  });
  assert.equal(bobLogin.status, 200, 'bob must not be blocked by alice failures');

  const aliceLogin = await call('/api/auth/login', {
    method: 'POST',
    ip: sharedIp,
    body: JSON.stringify({ email: alice.email, password })
  });
  assert.equal(aliceLogin.status, 200, 'alice still within the pair limit');
});

test('a single ip+email pair is throttled after seven failures', async () => {
  const ip = '127.0.91.20';
  const victim = await register(ip);

  for (let attempt = 1; attempt <= 7; attempt += 1) {
    const wrong = await call('/api/auth/login', {
      method: 'POST',
      ip,
      body: JSON.stringify({ email: victim.email, password: 'WrongPassword123!@#' })
    });
    assert.equal(wrong.status, 401, `attempt ${attempt} should be 401, got ${wrong.status}`);
  }

  const blocked = await call('/api/auth/login', {
    method: 'POST',
    ip,
    body: JSON.stringify({ email: victim.email, password })
  });
  assert.equal(blocked.status, 429, 'eighth attempt must be throttled');
  assert.equal((blocked.body as { code: string }).code, 'rate_limit_exceeded');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
});

test('a successful login clears the pair counter', async () => {
  const ip = '127.0.91.30';
  const user = await register(ip);

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await call('/api/auth/login', {
      method: 'POST',
      ip,
      body: JSON.stringify({ email: user.email, password: 'WrongPassword123!@#' })
    });
  }

  const success = await call('/api/auth/login', {
    method: 'POST',
    ip,
    body: JSON.stringify({ email: user.email, password })
  });
  assert.equal(success.status, 200);

  const cleared = await pool.query(
    `SELECT COUNT(*)::int AS count FROM rate_limits WHERE key = $1`,
    [`auth-pair:${ip}|${user.email}`]
  );
  assert.equal(cleared.rows[0].count, 0, 'pair counter must reset after success');

  for (let attempt = 1; attempt <= 7; attempt += 1) {
    const wrong = await call('/api/auth/login', {
      method: 'POST',
      ip,
      body: JSON.stringify({ email: user.email, password: 'WrongPassword123!@#' })
    });
    assert.equal(wrong.status, 401, 'fresh window should allow seven more failures');
  }
});

test('an attacker cannot lock the victim out from another ip', async () => {
  const attackerIp = '127.0.91.40';
  const victimIp = '127.0.91.41';
  const victim = await register(victimIp);

  for (let attempt = 1; attempt <= 7; attempt += 1) {
    await call('/api/auth/login', {
      method: 'POST',
      ip: attackerIp,
      body: JSON.stringify({ email: victim.email, password: 'GuessAttempt123!@#AB' })
    });
  }

  const blockedFromAttacker = await call('/api/auth/login', {
    method: 'POST',
    ip: attackerIp,
    body: JSON.stringify({ email: victim.email, password })
  });
  assert.equal(blockedFromAttacker.status, 429, 'attacker ip stays blocked');

  const victimStillWorks = await call('/api/auth/login', {
    method: 'POST',
    ip: victimIp,
    body: JSON.stringify({ email: victim.email, password })
  });
  assert.equal(victimStillWorks.status, 200, 'victim logs in from their own ip');
});

test('the ip ceiling still stops a spray across many accounts', async () => {
  const ip = '127.0.91.50';
  const results: number[] = [];

  for (let attempt = 1; attempt <= 61; attempt += 1) {
    const response = await call('/api/auth/login', {
      method: 'POST',
      ip,
      body: JSON.stringify({ email: `nobody_${attempt}_${randomUUID()}@example.com`, password: 'WhateverPassword123!@#' })
    });
    results.push(response.status);
  }

  assert.ok(results.includes(429), 'the ip ceiling must trigger before the 61st request');
  assert.equal(results.at(-1), 429, 'later requests from the same ip are refused');
});
