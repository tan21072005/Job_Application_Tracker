import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

process.env.MAIL_TRANSPORT = 'console';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';

const password = 'MatKhauXoaTaiKhoan123!@#';
let forwardedIp = 5200;

const call = async (path: string, options: RequestInit & { cookie?: string } = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.77.${forwardedIp++}`,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {})
    }
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await response.text();
  let body: unknown = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: response.status, body, cookie, headers: response.headers, text };
};

const register = async () => {
  const email = `del_${randomUUID()}@example.com`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 201);
  return { id: (result.body as { id: string }).id, email, cookie: result.cookie };
};

test.before(async () => {
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
});

test.after(async () => {
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

test('export requires authentication', async () => {
  const result = await call('/api/auth/export');
  assert.equal(result.status, 401);
});

test('export returns account data with applications and interviews', async () => {
  const user = await register();

  const created = await call('/api/applications', {
    method: 'POST',
    cookie: user.cookie,
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      company: 'Công ty Xuất Dữ Liệu',
      position: 'Kỹ sư kiểm thử',
      source: 'LinkedIn',
      notes: 'Ghi chú riêng tư cần xuất được'
    })
  });
  assert.equal(created.status, 201);
  const appId = (created.body as { id: string; version: number }).id;
  const version = (created.body as { id: string; version: number }).version;

  const interview = await call(`/api/applications/${appId}/interviews`, {
    method: 'POST',
    cookie: user.cookie,
    headers: { 'Idempotency-Key': randomUUID(), 'If-Match': `"app:${appId}:v${version}"` },
    body: JSON.stringify({
      title: 'Vòng xuất dữ liệu',
      at: new Date(Date.now() + 86_400_000).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online'
    })
  });
  assert.equal(interview.status, 201);

  const exported = await call('/api/auth/export?format=json', { cookie: user.cookie });
  assert.equal(exported.status, 200);
  assert.match(String(exported.headers.get('content-type')), /application\/json/);

  const payload = exported.body as {
    version: string;
    account: { id: string; email: string };
    counts: Record<string, number>;
    data: Record<string, Array<Record<string, unknown>>>;
  };

  assert.equal(payload.account.id, user.id);
  assert.equal(payload.account.email, user.email);
  assert.equal(payload.version, 'jobtrack-export@1');
  assert.ok(payload.data.applications, 'applications must be present');
  assert.equal(payload.data.applications.length, 1);
  assert.equal(payload.data.applications[0].company, 'Công ty Xuất Dữ Liệu');
  assert.equal(payload.data.applications[0].notes, 'Ghi chú riêng tư cần xuất được');
  assert.ok(payload.data.interviews, 'interviews must be present');
  assert.equal(payload.data.interviews.length, 1);
  assert.equal(payload.counts.applications, 1);
});

test('export query plan is valid against the live schema', async () => {
  const user = await register();

  const serviceSource = await import('node:fs').then(fs =>
    fs.readFileSync(new URL('./services/account-export-service.ts', import.meta.url), 'utf8')
  );

  const specs = [
    ...[...serviceSource.matchAll(/\{ table: '(\w+)'(?:, orderBy: '(\w+)')? \}/g)]
      .map(match => ({ table: match[1], orderBy: match[2], viaParent: false })),
    ...[...serviceSource.matchAll(/\{ table: '(\w+)', parent: '\w+'(?:, orderBy: '(\w+)')? \}/g)]
      .map(match => ({ table: match[1], orderBy: match[2], viaParent: true }))
  ];

  assert.ok(specs.length > 20, 'the spec list should not be empty');

  const invalid: string[] = [];
  for (const spec of specs) {
    const exists = await pool.query<{ exists: boolean }>(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      [`public.${spec.table}`]
    );
    if (!exists.rows[0].exists) continue;

    if (!spec.viaParent) {
      const hasOwner = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1 AND column_name='user_id'
         ) AS exists`,
        [spec.table]
      );
      if (!hasOwner.rows[0].exists) continue;
    }

    if (spec.orderBy) {
      const hasColumn = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema='public' AND table_name=$1 AND column_name=$2
         ) AS exists`,
        [spec.table, spec.orderBy]
      );
      if (!hasColumn.rows[0].exists) {
        invalid.push(`${spec.table}.${spec.orderBy} does not exist`);
        continue;
      }
    }

    const where = spec.viaParent
      ? `WHERE p.user_id = $1`
      : `WHERE user_id = $1`;
    const from = spec.viaParent
      ? `FROM ${spec.table} c JOIN applications p ON p.id = c.application_id`
      : `FROM ${spec.table}`;
    try {
      await pool.query(`SELECT * ${from} ${where} LIMIT 1`, [user.id]);
    } catch (error) {
      invalid.push(`${spec.table}: ${(error as Error).message}`);
    }
  }

  assert.deepEqual(invalid, [], 'every exported table must be queryable as written in the service');
});

test('export never leaks another user data', async () => {  const alice = await register();
  const bob = await register();

  await call('/api/applications', {
    method: 'POST',
    cookie: alice.cookie,
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ company: 'Bí mật của Alice', position: 'Vai trò A' })
  });

  const bobExport = await call('/api/auth/export?format=json', { cookie: bob.cookie });
  assert.equal(bobExport.status, 200);
  const payload = bobExport.body as { data: Record<string, unknown[]> };
  const serialized = JSON.stringify(payload);
  assert.ok(!serialized.includes('Bí mật của Alice'), 'bob must not see alice data');
  assert.equal(payload.data.applications, undefined);
});

test('csv export returns the BOM prefixed header for the owner', async () => {
  const user = await register();
  await call('/api/applications', {
    method: 'POST',
    cookie: user.cookie,
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ company: 'Công ty CSV', position: 'Vai trò CSV' })
  });

  const csvResponse = await fetch(base + '/api/auth/export?format=csv', {
    headers: {
      Origin: origin,
      'X-Forwarded-For': `127.0.77.${forwardedIp++}`,
      Cookie: user.cookie
    }
  });
  assert.equal(csvResponse.status, 200);
  assert.match(String(csvResponse.headers.get('content-type')), /text\/csv/);
  const csvBuffer = Buffer.from(await csvResponse.arrayBuffer());
  assert.deepEqual([...csvBuffer.subarray(0, 3)], [0xEF, 0xBB, 0xBF], 'csv must start with a UTF-8 BOM for Excel');
  const csvText = csvBuffer.toString('utf8');
  assert.ok(csvText.includes('Công ty CSV'));
});

test('delete account rejects a wrong password and keeps the account', async () => {
  const user = await register();
  const result = await call('/api/auth/account', {
    method: 'DELETE',
    cookie: user.cookie,
    body: JSON.stringify({ password: 'SaiMatKhau123!@#AB', confirmation: 'XOA TAI KHOAN' })
  });
  assert.equal(result.status, 401);

  const stillThere = await call('/api/auth/me', { cookie: user.cookie });
  assert.equal(stillThere.status, 200);
});

test('delete account requires the exact confirmation phrase', async () => {
  const user = await register();
  const wrongPhrase = await call('/api/auth/account', {
    method: 'DELETE',
    cookie: user.cookie,
    body: JSON.stringify({ password, confirmation: 'xoa' })
  });
  assert.equal(wrongPhrase.status, 422);
  assert.match(JSON.stringify(wrongPhrase.body), /XOA TAI KHOAN/);

  const noPassword = await call('/api/auth/account', {
    method: 'DELETE',
    cookie: user.cookie,
    body: JSON.stringify({ confirmation: 'XOA TAI KHOAN' })
  });
  assert.equal(noPassword.status, 422);

  const stillThere = await call('/api/auth/me', { cookie: user.cookie });
  assert.equal(stillThere.status, 200);
});

test('delete account removes the user and every owned row', async () => {
  const user = await register();

  const created = await call('/api/applications', {
    method: 'POST',
    cookie: user.cookie,
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({ company: 'Công ty Sắp Xoá', position: 'Vai trò Xoá' })
  });
  const appId = (created.body as { id: string }).id;

  const deleted = await call('/api/auth/account', {
    method: 'DELETE',
    cookie: user.cookie,
    body: JSON.stringify({ password, confirmation: 'XOA TAI KHOAN' })
  });
  assert.equal(deleted.status, 204);
  assert.match(deleted.cookie, /^jobtrack_session=(?:|;.*)$/, 'cookie must be cleared');

  const users = await pool.query('SELECT id FROM users WHERE id=$1', [user.id]);
  assert.equal(users.rowCount, 0, 'user row must be gone');

  const apps = await pool.query('SELECT id FROM applications WHERE id=$1', [appId]);
  assert.equal(apps.rowCount, 0, 'applications must cascade');

  const sessions = await pool.query('SELECT id FROM sessions WHERE user_id=$1', [user.id]);
  assert.equal(sessions.rowCount, 0, 'sessions must cascade');

  const reLogin = await call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: user.email, password })
  });
  assert.equal(reLogin.status, 401, 'deleted account cannot log in');
});

test('delete account needs an authenticated session', async () => {
  const result = await call('/api/auth/account', {
    method: 'DELETE',
    body: JSON.stringify({ password, confirmation: 'XOA TAI KHOAN' })
  });
  assert.equal(result.status, 401);
});
