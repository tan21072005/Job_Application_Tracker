import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 4200;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';
const extensionOrigin = 'chrome-extension://ilpifmgmkmlnopmkdkglknjjnadllife';
const password = 'MatKhauDai123!@#XYZ';

const call = async (path: string, options: RequestInit & { cookie?: string; bearer?: string } = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Origin: origin,
    'X-Forwarded-For': `127.0.43.${forwardedIp++}`,
    ...(options.headers as Record<string, string> | undefined)
  };
  if (options.cookie) headers.Cookie = options.cookie;
  if (options.bearer) headers.Authorization = `Bearer ${options.bearer}`;

  const response = await fetch(base + path, { ...options, headers });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { status: response.status, body, cookie };
};

const register = async () => {
  const email = `ext_${randomUUID()}@example.com`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 201);
  const id = (result.body as { id: string }).id;
  testUsers.push(id);
  return { id, email, cookie: result.cookie };
};

test.before(async () => {
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM ai_grants WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

test('extension pairing: an anonymous caller cannot mint a token', async () => {
  const result = await call('/api/auth/extension/pair', {
    method: 'POST',
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });
  assert.equal(result.status, 401);
});

test('extension pairing: a session gets a token scoped to capture and apply', async () => {
  const user = await register();
  const result = await call('/api/auth/extension/pair', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });

  assert.equal(result.status, 201);
  const body = result.body as { token: string; scopes: string[]; id: string };
  assert.match(body.token, /^jt_sec_[0-9a-f]{32}$/);
  assert.deepEqual(body.scopes, ['extension:capture', 'datasets:write', 'jobtrack:apply', 'ai:pro']);
  assert.ok(body.id);

  const stored = await pool.query<{ scopes: string[]; token_hash: string; expires_at: Date }>(
    'SELECT scopes, token_hash, expires_at FROM ai_grants WHERE id=$1',
    [body.id]
  );
  assert.equal(stored.rowCount, 1);
  assert.deepEqual(stored.rows[0].scopes, body.scopes);
  assert.equal(
    stored.rows[0].token_hash,
    createHash('sha256').update(body.token).digest('hex'),
    'the database must hold the hash, never the token itself'
  );
  assert.ok(stored.rows[0].expires_at.getTime() > Date.now());
});

test('extension pairing: the minted token actually authenticates an API call', async () => {
  const user = await register();
  const paired = await call('/api/auth/extension/pair', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });
  assert.equal(paired.status, 201);
  const token = (paired.body as { token: string }).token;

  const me = await call('/api/auth/me', { bearer: token });
  assert.equal(me.status, 200);
  assert.equal((me.body as { id: string }).id, user.id);
});

test('extension pairing: a token from one account cannot read another account', async () => {
  const alice = await register();
  const bob = await register();

  const paired = await call('/api/auth/extension/pair', {
    method: 'POST',
    cookie: alice.cookie,
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });
  const token = (paired.body as { token: string }).token;

  const listing = await call('/api/applications', { bearer: token });
  assert.equal(listing.status, 200);
  const rows = listing.body as Array<{ id: string }>;
  assert.ok(Array.isArray(rows));

  const bobListing = await call('/api/applications', { bearer: token });
  assert.equal(bobListing.status, 200);
  assert.equal((bobListing.body as unknown[]).length, 0);
});

test('extension pairing: a revoked grant stops authenticating', async () => {
  const user = await register();
  const paired = await call('/api/auth/extension/pair', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });
  const { token, id } = paired.body as { token: string; id: string };

  const before = await call('/api/auth/me', { bearer: token });
  assert.equal(before.status, 200);

  await pool.query('UPDATE ai_grants SET revoked_at = CURRENT_TIMESTAMP WHERE id=$1', [id]);

  const after = await call('/api/auth/me', { bearer: token });
  assert.equal(after.status, 401);
});

test('extension pairing: a grant sent from the extension origin is accepted for capture', async () => {
  const user = await register();
  const paired = await call('/api/auth/extension/pair', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ client: 'PageWeave Extension' })
  });
  const token = (paired.body as { token: string }).token;

  const captured = await call('/api/applications', {
    method: 'POST',
    bearer: token,
    headers: { Origin: extensionOrigin, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      company: `ExtCapture_${randomUUID().slice(0, 6)}`,
      position: 'Kế toán tổng hợp',
      url: 'https://www.topcv.vn/viec-lam/probe/1.html',
      status: 'Saved',
      workMode: 'On-site',
      source: 'TopCV',
      appliedAt: '2026-11-25',
      jobDescription: 'Mô tả công việc thật từ tin tuyển dụng.'
    })
  });

  assert.equal(captured.status, 201);
  const created = captured.body as { company: string; source: string; appliedAt: string; status: string };
  assert.equal(created.source, 'TopCV');
  assert.equal(created.appliedAt, '2026-11-25');
  assert.equal(created.status, 'Saved');

  await pool.query('DELETE FROM applications WHERE company=$1', [created.company]);
});

test('extension pairing: an unpaired extension cannot create an application', async () => {
  const result = await call('/api/applications', {
    method: 'POST',
    headers: { Origin: extensionOrigin, 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      company: 'NoTokenCo',
      position: 'X',
      status: 'Saved',
      workMode: 'On-site'
    })
  });
  assert.ok(
    result.status === 401 || result.status === 403,
    `an unauthenticated extension write must be refused, got ${result.status}`
  );

  const stored = await pool.query('SELECT count(*)::int AS n FROM applications WHERE company=$1', ['NoTokenCo']);
  assert.equal(stored.rows[0].n, 0, 'nothing may be written without a credential');
});
