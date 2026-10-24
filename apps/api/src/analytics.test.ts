import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { AnalyticsSummaryDTO, ApplicationGoalDTO } from '@jobtrack/contract';

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
  const email = `analytics_test_${randomUUID()}@example.com`;
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

async function createApplication(
  cookie: string,
  app: { company: string; position: string; status: string; source?: string; appliedAt?: string }
): Promise<string> {
  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': randomUUID(),
      Cookie: cookie,
      Origin: origin
    },
    body: JSON.stringify(app)
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  return data.id;
}

test('analytics: returns default goals when user has not configured custom targets', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/analytics/goals`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as ApplicationGoalDTO;
  assert.equal(data.weeklyApplicationsTarget, 5);
  assert.equal(data.monthlyInterviewsTarget, 2);
  assert.equal(data.targetOffers, 1);
  assert.equal(data.weeklyApplicationsCurrent, 0);
  assert.equal(data.monthlyInterviewsCurrent, 0);
  assert.equal(data.currentOffers, 0);
});

test('analytics: updates and persists custom goals', async () => {
  const user = await registerUser();
  const updateRes = await fetch(`${base}/api/analytics/goals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      weeklyApplicationsTarget: 12,
      monthlyInterviewsTarget: 5,
      targetOffers: 3
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ApplicationGoalDTO;
  assert.equal(updated.weeklyApplicationsTarget, 12);
  assert.equal(updated.monthlyInterviewsTarget, 5);
  assert.equal(updated.targetOffers, 3);

  const getRes = await fetch(`${base}/api/analytics/goals`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as ApplicationGoalDTO;
  assert.equal(fetched.weeklyApplicationsTarget, 12);
  assert.equal(fetched.monthlyInterviewsTarget, 5);
  assert.equal(fetched.targetOffers, 3);
});

test('analytics: rejects out-of-bound goal values with 422', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/analytics/goals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      weeklyApplicationsTarget: 500,
      monthlyInterviewsTarget: -2
    })
  });
  assert.equal(res.status, 422);
  const error = await res.json() as { code: string; message: string; fields?: Record<string, string> };
  assert.equal(error.code, 'invalid_request');
  assert.ok(error.fields?.weeklyApplicationsTarget);
  assert.ok(error.fields?.monthlyInterviewsTarget);
});

test('analytics: summary returns full funnel, velocity, and source breakdown', async () => {
  const user = await registerUser();
  await createApplication(user.cookie, {
    company: 'Grab Vietnam',
    position: 'Backend Engineer',
    status: 'Interview',
    source: 'LinkedIn',
    appliedAt: '2026-10-15'
  });
  await createApplication(user.cookie, {
    company: 'VNG Corporation',
    position: 'Fullstack Lead',
    status: 'Offer',
    source: 'TopCV',
    appliedAt: '2026-10-10'
  });
  await createApplication(user.cookie, {
    company: 'Shopee',
    position: 'Senior Software Engineer',
    status: 'Applied',
    source: 'LinkedIn',
    appliedAt: '2026-10-20'
  });

  const res = await fetch(`${base}/api/analytics/summary`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as AnalyticsSummaryDTO;
  assert.equal(data.timeframe, 'all');
  assert.equal(data.funnel.length, 5);

  const savedStage = data.funnel.find(s => s.stage === 'Saved');
  assert.ok(savedStage);
  assert.equal(savedStage.count, 3);

  const offerStage = data.funnel.find(s => s.stage === 'Offer');
  assert.ok(offerStage);
  assert.equal(offerStage.count, 1);

  assert.equal(data.velocity.activeCount, 3);
  assert.ok(data.sources.length >= 2);

  const linkedIn = data.sources.find(s => s.source === 'LinkedIn');
  assert.ok(linkedIn);
  assert.equal(linkedIn.totalApplications, 2);

  assert.equal(data.goals.currentOffers, 1);
  assert.equal(data.goals.weeklyApplicationsCurrent, 3);
});

test('analytics: summary respects timeframe query and rejects invalid timeframe with 422', async () => {
  const user = await registerUser();
  const validRes = await fetch(`${base}/api/analytics/summary?timeframe=30d`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(validRes.status, 200);
  const validData = await validRes.json() as AnalyticsSummaryDTO;
  assert.equal(validData.timeframe, '30d');

  const invalidRes = await fetch(`${base}/api/analytics/summary?timeframe=weekly_unsupported`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(invalidRes.status, 422);
  const invalidError = await invalidRes.json() as { code: string; message: string };
  assert.equal(invalidError.code, 'invalid_request');
});

test('analytics: enforces tenant isolation across distinct users', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  await createApplication(userA.cookie, {
    company: 'Secret Corp A',
    position: 'Architect',
    status: 'Offer',
    source: 'Referral'
  });

  const resB = await fetch(`${base}/api/analytics/summary`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(resB.status, 200);
  const dataB = await resB.json() as AnalyticsSummaryDTO;
  assert.equal(dataB.funnel.find(s => s.stage === 'Saved')?.count, 0);
  assert.equal(dataB.velocity.activeCount, 0);
  assert.equal(dataB.sources.length, 0);
  assert.equal(dataB.goals.currentOffers, 0);
});
