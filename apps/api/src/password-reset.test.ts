import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, passwordResetService } from './server.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

process.env.MAIL_TRANSPORT = 'console';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 4100;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';

const password = 'MatKhauDai123!@#XYZ';

const call = async (path: string, options: RequestInit & { cookie?: string } = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.42.${forwardedIp++}`,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {})
    }
  });
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
  const email = `pwd_${randomUUID()}@example.com`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 201);
  const id = (result.body as { id: string }).id;
  testUsers.push(id);
  return { id, email, cookie: result.cookie };
};

const login = async (email: string, pass: string) =>
  call('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password: pass }) });

test.before(async () => {
  await passwordResetService.purgeExpired();
  await pool.query('DELETE FROM rate_limits');
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

test('forgot-password returns 202 for unknown email without leaking existence', async () => {
  const result = await call('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: `nobody_${randomUUID()}@example.com` })
  });
  assert.equal(result.status, 202);
  assert.match((result.body as { message: string }).message, /Nếu email này có tài khoản/);
});

test('forgot-password rejects malformed email with 422', async () => {
  const result = await call('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: 'not-an-email' })
  });
  assert.equal(result.status, 422);
  assert.equal((result.body as { code: string }).code, 'invalid_request');
});

test('reset-password rejects unknown token', async () => {
  const result = await call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: 'a'.repeat(43), password: 'NewPasswordLong123!@#' })
  });
  assert.equal(result.status, 400);
  assert.equal((result.body as { code: string }).code, 'invalid_reset_token');
});

test('reset-password enforces the 15 character minimum', async () => {
  const user = await register();
  const issued = await passwordResetService.issue(user.id);
  const result = await call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: issued.token, password: 'short' })
  });
  assert.equal(result.status, 422);
});

test('reset-password rotates the password, revokes sessions, and is single use', async () => {
  const user = await register();
  const issued = await passwordResetService.issue(user.id);

  const newPassword = 'MatKhauMoi123!@#ABC';
  const reset = await call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: issued.token, password: newPassword })
  });
  assert.equal(reset.status, 204);

  const sessions = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM sessions WHERE user_id=$1 AND revoked_at IS NULL',
    [user.id]
  );
  assert.equal(sessions.rows[0].count, '0');

  const oldLogin = await login(user.email, password);
  assert.equal(oldLogin.status, 401);

  const newLogin = await login(user.email, newPassword);
  assert.equal(newLogin.status, 200);

  const replay = await call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: issued.token, password: 'AnotherPassword123!@#' })
  });
  assert.equal(replay.status, 400);
});

test('change-password requires the current password', async () => {
  const user = await register();
  const result = await call('/api/auth/change-password', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ currentPassword: 'WrongPassword123!@#', newPassword: 'NewPasswordLong123!@#' })
  });
  assert.equal(result.status, 401);
  assert.equal((result.body as { code: string }).code, 'invalid_credentials');
});

test('change-password keeps the current session and revokes the others', async () => {
  const user = await register();
  const second = await login(user.email, password);
  assert.equal(second.status, 200);

  const newPassword = 'DoiMatKhau123!@#XYZ';
  const changed = await call('/api/auth/change-password', {
    method: 'POST',
    cookie: user.cookie,
    body: JSON.stringify({ currentPassword: password, newPassword })
  });
  assert.equal(changed.status, 204);

  const activeSessions = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM sessions WHERE user_id=$1 AND revoked_at IS NULL',
    [user.id]
  );
  assert.equal(activeSessions.rows[0].count, '1');

  const currentStillWorks = await call('/api/auth/me', { cookie: user.cookie });
  assert.equal(currentStillWorks.status, 200);

  const otherRevoked = await call('/api/auth/me', { cookie: second.cookie });
  assert.equal(otherRevoked.status, 401);
});

test('revoke other sessions keeps the caller signed in', async () => {
  const user = await register();
  const second = await login(user.email, password);
  assert.equal(second.status, 200);

  const revoked = await call('/api/auth/sessions', { method: 'DELETE', cookie: user.cookie });
  assert.equal(revoked.status, 200);
  assert.equal((revoked.body as { revoked: number }).revoked, 1);

  const stillOk = await call('/api/auth/me', { cookie: user.cookie });
  assert.equal(stillOk.status, 200);

  const otherGone = await call('/api/auth/me', { cookie: second.cookie });
  assert.equal(otherGone.status, 401);
});

test('reset token for one user cannot reset another account', async () => {
  const victim = await register();
  const attacker = await register();
  const issued = await passwordResetService.issue(victim.id);

  const result = await call('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token: issued.token, password: 'HijackAttempt123!@#AB' })
  });
  assert.equal(result.status, 204);

  const victimLogin = await login(victim.email, 'HijackAttempt123!@#AB');
  assert.equal(victimLogin.status, 200);

  const attackerLogin = await login(attacker.email, 'HijackAttempt123!@#AB');
  assert.equal(attackerLogin.status, 401);
});

test('anonymous callers cannot change a password', async () => {
  const result = await call('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword: password, newPassword: 'NewPasswordLong123!@#' })
  });
  assert.equal(result.status, 401);
});
