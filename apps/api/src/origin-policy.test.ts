import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { app } from './server.ts';
import { once } from 'node:events';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await pool.end();
});

test('Origin policy: a foreign origin with an unusable credential is refused', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Server failed to start');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const testIp = `127.0.9.${Math.floor(Math.random() * 200) + 1}`;
    const email = `origin_policy_${randomUUID().slice(0, 8)}@example.com`;
    const registerRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:64364',
        'X-Forwarded-For': testIp
      },
      body: JSON.stringify({ email, password: 'StrongPassword123!' })
    });
    assert.equal(registerRes.status, 201);
    const user = await registerRes.json();
    testUsers.push(user.id);
    const cookie = registerRes.headers.get('set-cookie')!;

    const foreign = { 'Content-Type': 'application/json', Origin: 'https://evil.example', Cookie: cookie };

    const noHeader = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: foreign });
    assert.equal(noHeader.status, 403);
    assert.equal((await noHeader.json()).code ?? null, 'invalid_origin');

    const basicHeader = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { ...foreign, Authorization: 'Basic dXNlcjpwYXNz' }
    });
    assert.equal(basicHeader.status, 403);
    assert.equal((await basicHeader.json()).code ?? null, 'invalid_origin');

    const emptyBearer = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { ...foreign, Authorization: 'Bearer ' }
    });
    assert.equal(emptyBearer.status, 403);

    const garbage = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { ...foreign, Authorization: 'garbage' }
    });
    assert.equal(garbage.status, 403);

    const sameOrigin = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:64364',
        'X-Forwarded-For': testIp
      },
      body: JSON.stringify({ email, password: 'StrongPassword123!' })
    });
    assert.equal(sameOrigin.status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
  }
});
