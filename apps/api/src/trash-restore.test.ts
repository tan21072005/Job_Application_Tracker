import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { ApplicationWireDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 180;

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
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `trash_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.9.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

async function createApplication(cookie: string, company: string, position: string): Promise<ApplicationWireDTO> {
  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      company,
      position,
      status: 'Applied'
    })
  });
  assert.equal(res.status, 201);
  return await res.json() as ApplicationWireDTO;
}

test('Trash & Restore: soft-delete moves to trash, hides from active list, and can be restored', async () => {
  const user = await registerUser();
  const created = await createApplication(user.cookie, 'Tech Star', 'Senior Backend Engineer');

  const activeBefore = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(activeBefore.status, 200);
  const listBefore = await activeBefore.json() as ApplicationWireDTO[];
  assert.equal(listBefore.length, 1);
  assert.equal(listBefore[0].id, created.id);

  const trashAction = await fetch(`${base}/api/applications/${created.id}/trash`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: user.cookie,
      'If-Match': `"app:${created.id}:v${created.version}"`
    }
  });
  assert.equal(trashAction.status, 204);

  const activeAfter = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(activeAfter.status, 200);
  const listAfter = await activeAfter.json() as ApplicationWireDTO[];
  assert.equal(listAfter.length, 0);

  const getDirect = await fetch(`${base}/api/applications/${created.id}`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(getDirect.status, 404);

  const trashListRes = await fetch(`${base}/api/applications/trash`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(trashListRes.status, 200);
  const trashItems = await trashListRes.json() as ApplicationWireDTO[];
  assert.equal(trashItems.length, 1);
  assert.equal(trashItems[0].id, created.id);
  assert.ok(trashItems[0].deletedAt !== null);

  const restoreRes = await fetch(`${base}/api/applications/${created.id}/restore`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: user.cookie
    }
  });
  assert.equal(restoreRes.status, 200);
  const restored = await restoreRes.json() as ApplicationWireDTO;
  assert.equal(restored.id, created.id);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.version, created.version + 2);

  const activeRestored = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  const listRestored = await activeRestored.json() as ApplicationWireDTO[];
  assert.equal(listRestored.length, 1);
  assert.equal(listRestored[0].id, created.id);

  const restoreAgain = await fetch(`${base}/api/applications/${created.id}/restore`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(restoreAgain.status, 400);
});

test('Trash & Restore: soft-delete via query flag and purge permanently removes record', async () => {
  const user = await registerUser();
  const created = await createApplication(user.cookie, 'CloudCorp', 'DevOps Specialist');

  const softDel = await fetch(`${base}/api/applications/${created.id}?soft=true`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: user.cookie,
      'If-Match': `"app:${created.id}:v${created.version}"`
    }
  });
  assert.equal(softDel.status, 204);

  const trashList = await fetch(`${base}/api/applications/trash`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  const items = await trashList.json() as ApplicationWireDTO[];
  assert.equal(items.length, 1);

  const purgeDel = await fetch(`${base}/api/applications/${created.id}`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: user.cookie,
      'If-Match': `"app:${created.id}:v${created.version + 1}"`
    }
  });
  assert.equal(purgeDel.status, 204);

  const trashEmpty = await fetch(`${base}/api/applications/trash`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  const emptyItems = await trashEmpty.json() as ApplicationWireDTO[];
  assert.equal(emptyItems.length, 0);

  const dbCheck = await pool.query('SELECT * FROM applications WHERE id=$1', [created.id]);
  assert.equal(dbCheck.rowCount, 0);
});

test('Trash & Restore: cross-user isolation prevents unauthorized access to other user trash', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const appA = await createApplication(userA.cookie, 'Alpha Corp', 'Frontend Dev');

  await fetch(`${base}/api/applications/${appA.id}/trash`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });

  const bTrash = await fetch(`${base}/api/applications/trash`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  const bItems = await bTrash.json() as ApplicationWireDTO[];
  assert.equal(bItems.length, 0);

  const bRestoreA = await fetch(`${base}/api/applications/${appA.id}/restore`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(bRestoreA.status, 404);
});
