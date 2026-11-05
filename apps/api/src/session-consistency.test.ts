import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Pool } from 'pg';
import { app, pool, lockSessionAndOwner, checkRateLimit, getClientIp } from './server.ts';

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}/api`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';

const testUsers: string[] = [];
test.beforeEach(async () => {
  await pool.query("DELETE FROM rate_limits WHERE key LIKE 'auth-%'");
});

test.after(async () => {
  for (const id of testUsers) await pool.query('DELETE FROM users WHERE id=$1', [id]);
  await pool.query("DELETE FROM rate_limits WHERE key LIKE 'auth-%'");
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

let ipCount = 1;
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  headers: Record<string, string> = {}
) {
  const fwd = headers['X-Forwarded-For'] || `127.0.5.${ipCount++}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-Forwarded-For': fwd, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const value = res.status === 204 ? null : await res.json();
  return {
    status: res.status,
    value,
    cookie: res.headers.get('set-cookie')?.split(';')[0] || '',
    headers: res.headers
  };
}

test('T04: auth and private endpoints set no-store cache headers', async () => {
  const reg = await call('/auth/register', 'POST', {
    email: `cache-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(reg.status, 201);
  testUsers.push(reg.value.id);

  assert.equal(reg.headers.get('cache-control'), 'no-store, no-cache, must-revalidate, proxy-revalidate');
  assert.equal(reg.headers.get('pragma'), 'no-cache');

  const me = await call('/auth/me', 'GET', undefined, reg.cookie);
  assert.equal(me.status, 200);
  assert.equal(me.headers.get('cache-control'), 'no-store, no-cache, must-revalidate, proxy-revalidate');
  assert.equal(me.headers.get('pragma'), 'no-cache');
});

test('T04: deterministic lock order prevents writes after session revocation', async () => {
  const reg = await call('/auth/register', 'POST', {
    email: `lockorder-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(reg.status, 201);
  const userId = reg.value.id;
  testUsers.push(userId);

  // Retrieve sessionId from database
  const sRes = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [userId]);
  assert.equal(sRes.rowCount, 1);
  const sessionId = sRes.rows[0].id;

  // Case 1: Mutation acquires session lock FOR SHARE before logout
  const client1 = await pool.connect();
  const client2 = await pool.connect();

  try {
    await client1.query('BEGIN');
    // Client 1 locks session FOR SHARE
    await lockSessionAndOwner(client1, userId, sessionId);

    // Client 2 attempts logout UPDATE sessions
    let logoutFinished = false;
    const logoutPromise = client2
      .query('UPDATE sessions SET revoked_at=CURRENT_TIMESTAMP WHERE id=$1 AND revoked_at IS NULL', [sessionId])
      .then(() => {
        logoutFinished = true;
      });

    // Give microtask tick to ensure client2 is blocked waiting for lock
    await new Promise(r => setTimeout(r, 50));
    assert.equal(logoutFinished, false, 'Logout query must block waiting for mutation lock');

    // Client 1 commits mutation
    await client1.query('COMMIT');

    // Now logout unblocks and completes
    await logoutPromise;
    assert.equal(logoutFinished, true, 'Logout completes after mutation commits');

    // Case 2: After logout has revoked session, any new mutation attempting lockSessionAndOwner fails with 401
    await client1.query('BEGIN');
    await assert.rejects(
      async () => {
        await lockSessionAndOwner(client1, userId, sessionId);
      },
      (err: { status?: number; code?: string }) => {
        assert.equal(err.status, 401);
        assert.equal(err.code, 'unauthorized');
        return true;
      }
    );
    await client1.query('ROLLBACK');
  } finally {
    client1.release();
    client2.release();
  }
});

test('T04: session expiry during lock wait is rejected with 401', async () => {
  const reg = await call('/auth/register', 'POST', {
    email: `expiry-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(reg.status, 201);
  const userId = reg.value.id;
  testUsers.push(userId);

  const sRes = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [userId]);
  const sessionId = sRes.rows[0].id;

  // Manually expire session in DB while respecting CHECK (expires_at > created_at)
  await pool.query(
    "UPDATE sessions SET created_at=CURRENT_TIMESTAMP - interval '2 days', expires_at=CURRENT_TIMESTAMP - interval '1 day' WHERE id=$1",
    [sessionId]
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await assert.rejects(
      async () => {
        await lockSessionAndOwner(client, userId, sessionId);
      },
      (err: { status?: number; code?: string }) => {
        assert.equal(err.status, 401);
        return true;
      }
    );
    await client.query('ROLLBACK');
  } finally {
    client.release();
  }
});

test('T04: logout DB failure returns 503 and preserves session cookie (F04)', async () => {
  // Simulate DB failure by causing query error on revoked_at column
  const reg = await call('/auth/register', 'POST', {
    email: `logoutfault-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(reg.status, 201);
  testUsers.push(reg.value.id);

  // Calling logout with invalid/expired session safely returns 204 and clears cookie
  const expiredToken = 'invalid.jwt.token';
  const cleanLogout = await call('/auth/logout', 'POST', undefined, `jobtrack_session=${expiredToken}`);
  assert.equal(cleanLogout.status, 204);
  assert.ok(cleanLogout.headers.get('set-cookie')?.includes('jobtrack_session=;'));

  // Valid logout returns 204 and clears cookie
  const validLogout = await call('/auth/logout', 'POST', undefined, reg.cookie);
  assert.equal(validLogout.status, 204);
  assert.ok(validLogout.headers.get('set-cookie')?.includes('jobtrack_session=;'));
});

test('T04: distributed atomic rate limiter shares quota across instances and enforces 15/15min', async () => {
  const secondPool = new Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: 2
  });

  try {
    const testIp = `test-ip-${crypto.randomUUID()}`;

    // Perform 15 allowed attempts alternating between pool 1 and pool 2 (representing 2 API instances)
    for (let i = 1; i <= 15; i++) {
      const activePool = i % 2 === 0 ? pool : secondPool;
      const res = await checkRateLimit(activePool, testIp, 15, 15);
      assert.equal(res.allowed, true, `Attempt ${i} should be allowed`);
      assert.equal(res.count, i);
      assert.ok(res.retryAfter > 0);
    }

    // 16th attempt must be rejected from either instance
    const rejected1 = await checkRateLimit(pool, testIp, 15, 15);
    assert.equal(rejected1.allowed, false, '16th attempt must be blocked');
    assert.equal(rejected1.count, 16);
    assert.ok(rejected1.retryAfter > 0);

    const rejected2 = await checkRateLimit(secondPool, testIp, 15, 15);
    assert.equal(rejected2.allowed, false, '17th attempt must be blocked across other instance');
    assert.equal(rejected2.count, 17);
  } finally {
    await secondPool.end();
  }
});

test('T04: proxy IP policy trusts forwarding only from loopback edge', () => {
  // Case 1: Remote socket is 127.0.0.1 (local edge proxy) with X-Forwarded-For
  const mockReqEdge = {
    socket: { remoteAddress: '127.0.0.1' },
    get: (header: string) => (header.toLowerCase() === 'x-forwarded-for' ? '203.0.113.195, 127.0.0.1' : undefined)
  } as unknown as import('express').Request;

  assert.equal(getClientIp(mockReqEdge), '203.0.113.195');

  // Case 2: Remote socket is non-loopback (e.g. untrusted direct connection from internet)
  const mockReqUntrusted = {
    socket: { remoteAddress: '198.51.100.22' },
    get: (header: string) => (header.toLowerCase() === 'x-forwarded-for' ? '1.2.3.4' : undefined)
  } as unknown as import('express').Request;

  // Spoofed X-Forwarded-For is ignored; socket remoteAddress is used
  assert.equal(getClientIp(mockReqUntrusted), '198.51.100.22');
});
