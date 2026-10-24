import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { ApplicationWireDTO, BulkOperationResultDTO, ActivityTimelineItemDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 200;

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
  const email = `bulk_test_${randomUUID()}@example.com`;
  const pwd = 'StrongPassword123!';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.9.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: pwd })
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
      status: 'Saved'
    })
  });
  assert.equal(res.status, 201);
  return await res.json() as ApplicationWireDTO;
}

test('Bulk Operations: updates statuses for multiple applications atomically', async () => {
  const { cookie } = await registerUser();
  const app1 = await createApplication(cookie, 'Company A', 'Frontend Engineer');
  const app2 = await createApplication(cookie, 'Company B', 'Backend Engineer');

  const res = await fetch(`${base}/api/applications/bulk-status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      ids: [app1.id, app2.id],
      status: 'Applied'
    })
  });

  assert.equal(res.status, 200);
  const result = await res.json() as BulkOperationResultDTO;
  assert.equal(result.affectedCount, 2);
  assert.ok(result.ids.includes(app1.id));
  assert.ok(result.ids.includes(app2.id));

  const listRes = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: cookie }
  });
  const list = await listRes.json() as ApplicationWireDTO[];
  const updated1 = list.find(a => a.id === app1.id);
  const updated2 = list.find(a => a.id === app2.id);
  assert.equal(updated1?.status, 'Applied');
  assert.equal(updated2?.status, 'Applied');
});

test('Bulk Operations: moves multiple applications to trash and hides them from active list', async () => {
  const { cookie } = await registerUser();
  const app1 = await createApplication(cookie, 'Trash Target 1', 'DevOps');
  const app2 = await createApplication(cookie, 'Trash Target 2', 'QA Lead');
  const app3 = await createApplication(cookie, 'Active Target 3', 'Product Manager');

  const res = await fetch(`${base}/api/applications/bulk-trash`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      ids: [app1.id, app2.id]
    })
  });

  assert.equal(res.status, 200);
  const result = await res.json() as BulkOperationResultDTO;
  assert.equal(result.affectedCount, 2);

  const activeRes = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: cookie }
  });
  const activeList = await activeRes.json() as ApplicationWireDTO[];
  assert.equal(activeList.length, 1);
  assert.equal(activeList[0].id, app3.id);

  const trashRes = await fetch(`${base}/api/applications/trash`, {
    headers: { Origin: origin, Cookie: cookie }
  });
  const trashList = await trashRes.json() as ApplicationWireDTO[];
  assert.equal(trashList.length, 2);
  assert.ok(trashList.some(a => a.id === app1.id));
  assert.ok(trashList.some(a => a.id === app2.id));
});

test('Bulk Operations: rejects malformed input with 422', async () => {
  const { cookie } = await registerUser();

  const emptyRes = await fetch(`${base}/api/applications/bulk-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
    body: JSON.stringify({ ids: [], status: 'Applied' })
  });
  assert.equal(emptyRes.status, 422);

  const invalidStatusRes = await fetch(`${base}/api/applications/bulk-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
    body: JSON.stringify({ ids: [randomUUID()], status: 'UnknownStatus' })
  });
  assert.equal(invalidStatusRes.status, 422);

  const invalidIdRes = await fetch(`${base}/api/applications/bulk-trash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
    body: JSON.stringify({ ids: ['not-a-uuid'] })
  });
  assert.equal(invalidIdRes.status, 422);
});

test('Bulk Operations: enforces cross-user data isolation', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const appA = await createApplication(userA.cookie, 'Company UserA', 'Fullstack');

  const updateRes = await fetch(`${base}/api/applications/bulk-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: userB.cookie },
    body: JSON.stringify({ ids: [appA.id], status: 'Offer' })
  });
  assert.equal(updateRes.status, 200);
  const updateResult = await updateRes.json() as BulkOperationResultDTO;
  assert.equal(updateResult.affectedCount, 0);

  const trashRes = await fetch(`${base}/api/applications/bulk-trash`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: userB.cookie },
    body: JSON.stringify({ ids: [appA.id] })
  });
  assert.equal(trashRes.status, 200);
  const trashResult = await trashRes.json() as BulkOperationResultDTO;
  assert.equal(trashResult.affectedCount, 0);

  const checkRes = await fetch(`${base}/api/applications/${appA.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const checkApp = await checkRes.json() as ApplicationWireDTO;
  assert.equal(checkApp.status, 'Saved');
  assert.equal(checkApp.deletedAt, null);
});

test('CSV Export: exports active applications with UTF-8 BOM and correct headers', async () => {
  const { cookie } = await registerUser();
  await createApplication(cookie, 'CSV Corp', 'Data Engineer');

  const res = await fetch(`${base}/api/applications/export.csv`, {
    headers: { Origin: origin, Cookie: cookie }
  });

  assert.equal(res.status, 200);
  assert.ok(res.headers.get('content-type')?.includes('text/csv'));
  assert.ok(res.headers.get('content-disposition')?.includes('attachment; filename="jobtrack-applications-'));

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  assert.equal(bytes[0], 0xEF);
  assert.equal(bytes[1], 0xBB);
  assert.equal(bytes[2], 0xBF);

  const text = new TextDecoder().decode(bytes);
  assert.ok(text.includes('Mã hồ sơ,Công ty,Vị trí ứng tuyển,Trạng thái'));
  assert.ok(text.includes('CSV Corp'));
  assert.ok(text.includes('Data Engineer'));
});

test('Timeline: retrieves application journey with chronological milestones', async () => {
  const { cookie } = await registerUser();
  const appItem = await createApplication(cookie, 'Journey Corp', 'Staff AI Engineer');

  const res = await fetch(`${base}/api/applications/${appItem.id}/timeline`, {
    headers: { Origin: origin, Cookie: cookie }
  });

  assert.equal(res.status, 200);
  const timeline = await res.json() as ActivityTimelineItemDTO[];
  assert.ok(Array.isArray(timeline));
  assert.ok(timeline.length >= 1);
  assert.equal(timeline[0].type, 'created');
  assert.ok(timeline[0].title.includes('Khởi tạo'));
});
