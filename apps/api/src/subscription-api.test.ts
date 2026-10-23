import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { JobSubscriptionDTO, CrawlRunResultDTO, ApplicationWireDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 190;

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
  const email = `sub_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.10.${forwardedIp++}`
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

test('Subscriptions API: creates, lists, toggles, runs crawl, and deletes subscription', async () => {
  const user = await registerUser();

  const unauthRes = await fetch(`${base}/api/subscriptions`, {
    headers: { Origin: origin }
  });
  assert.equal(unauthRes.status, 401);

  const createRes = await fetch(`${base}/api/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: user.cookie
    },
    body: JSON.stringify({
      title: 'Senior Node.js & React Jobs',
      keywords: ['Node.js', 'React', 'TypeScript'],
      location: 'Hà Nội',
      minSalary: 30000000
    })
  });
  assert.equal(createRes.status, 201);
  const createdSub = await createRes.json() as JobSubscriptionDTO;
  assert.equal(createdSub.title, 'Senior Node.js & React Jobs');
  assert.equal(createdSub.isActive, true);
  assert.equal(createdSub.keywords.length, 3);

  const listRes = await fetch(`${base}/api/subscriptions`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(listRes.status, 200);
  const subs = await listRes.json() as JobSubscriptionDTO[];
  assert.equal(subs.length, 1);
  assert.equal(subs[0].id, createdSub.id);

  const runRes = await fetch(`${base}/api/subscriptions/${createdSub.id}/run`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: user.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(runRes.status, 200);
  const crawlRun = await runRes.json() as CrawlRunResultDTO;
  assert.ok(crawlRun.found > 0);
  assert.ok(crawlRun.saved > 0);
  assert.equal(crawlRun.subscriptionId, createdSub.id);

  const appsRes = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(appsRes.status, 200);
  const apps = await appsRes.json() as ApplicationWireDTO[];
  assert.ok(apps.length >= crawlRun.saved);
  assert.ok(apps.every(a => a.status === 'Saved'));

  const togglePause = await fetch(`${base}/api/subscriptions/${createdSub.id}/toggle`, {
    method: 'PATCH',
    headers: { Origin: origin, Cookie: user.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(togglePause.status, 200);
  const pausedSub = await togglePause.json() as JobSubscriptionDTO;
  assert.equal(pausedSub.isActive, false);

  const pausedRunRes = await fetch(`${base}/api/subscriptions/${createdSub.id}/run`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: user.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(pausedRunRes.status, 400);

  const toggleResume = await fetch(`${base}/api/subscriptions/${createdSub.id}/toggle`, {
    method: 'PATCH',
    headers: { Origin: origin, Cookie: user.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: true })
  });
  assert.equal(toggleResume.status, 200);
  const resumedSub = await toggleResume.json() as JobSubscriptionDTO;
  assert.equal(resumedSub.isActive, true);

  const delRes = await fetch(`${base}/api/subscriptions/${createdSub.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(delRes.status, 204);

  const listAfter = await fetch(`${base}/api/subscriptions`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  const subsAfter = await listAfter.json() as JobSubscriptionDTO[];
  assert.equal(subsAfter.length, 0);
});

test('Subscriptions API: cross-user isolation prevents unauthorized modifications', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const createA = await fetch(`${base}/api/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'DevOps & SRE',
      keywords: ['Kubernetes', 'Docker']
    })
  });
  assert.equal(createA.status, 201);
  const subA = await createA.json() as JobSubscriptionDTO;

  const bList = await fetch(`${base}/api/subscriptions`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  const bSubs = await bList.json() as JobSubscriptionDTO[];
  assert.equal(bSubs.length, 0);

  const bToggleA = await fetch(`${base}/api/subscriptions/${subA.id}/toggle`, {
    method: 'PATCH',
    headers: { Origin: origin, Cookie: userB.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ isActive: false })
  });
  assert.equal(bToggleA.status, 404);

  const bRunA = await fetch(`${base}/api/subscriptions/${subA.id}/run`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userB.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.equal(bRunA.status, 404);
});
