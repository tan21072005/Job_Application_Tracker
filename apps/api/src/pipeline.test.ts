import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { ApplicationPriority } from '@jobtrack/contract';
import type { StagnantApplicationItemDTO, PipelineSummaryDTO } from './services/pipeline-service.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 800;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  userA = await registerUser();
  userB = await registerUser();
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

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `pipeline_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.15.${forwardedIp++}`
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

async function createApplication(userCookie: string, company: string, position: string): Promise<string> {
  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userCookie,
      Origin: origin,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      company,
      position,
      status: 'Applied'
    })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  return data.id;
}

test('pipeline: GET /api/applications/stagnant requires authentication', async () => {
  const res = await fetch(`${base}/api/applications/stagnant`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('pipeline: GET /api/pipeline/summary requires authentication', async () => {
  const res = await fetch(`${base}/api/pipeline/summary`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('pipeline: PATCH /api/applications/:id/pipeline requires authentication', async () => {
  const appId = randomUUID();
  const res = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ priority: 'urgent' })
  });
  assert.equal(res.status, 401);
});

test('pipeline: PATCH /api/applications/:id/pipeline returns 422 for invalid priority', async () => {
  const appId = await createApplication(userA.cookie, 'Acme Corp', 'Frontend Dev');
  const res = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ priority: 'invalid_priority' })
  });
  assert.equal(res.status, 422);
  const body = await res.json() as { code: string; fields?: Record<string, string> };
  assert.equal(body.code, 'invalid_request');
  assert.ok(body.fields?.priority);
});

test('pipeline: PATCH /api/applications/:id/pipeline returns 422 for non-array tags', async () => {
  const appId = await createApplication(userA.cookie, 'Beta Labs', 'Backend Dev');
  const res = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ tags: 'remote' })
  });
  assert.equal(res.status, 422);
  const body = await res.json() as { code: string; fields?: Record<string, string> };
  assert.equal(body.code, 'invalid_request');
  assert.ok(body.fields?.tags);
});

test('pipeline: PATCH /api/applications/:id/pipeline updates priority, tags, and timestamp', async () => {
  const appId = await createApplication(userA.cookie, 'Gamma Tech', 'Staff Engineer');
  const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      priority: 'urgent' as ApplicationPriority,
      tags: ['#remote', 'fintech', 'ai-infra'],
      statusUpdatedAt: pastDate
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json() as {
    id: string;
    priority: ApplicationPriority;
    tags: string[];
    statusUpdatedAt: string;
  };
  assert.equal(data.id, appId);
  assert.equal(data.priority, 'urgent');
  assert.deepEqual(data.tags, ['remote', 'fintech', 'ai-infra']);
  assert.ok(data.statusUpdatedAt);
});

test('pipeline: PATCH /api/applications/:id/pipeline enforces multi-tenant isolation', async () => {
  const appId = await createApplication(userA.cookie, 'User A Private Org', 'Security Lead');
  const res = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({ priority: 'urgent' })
  });
  assert.equal(res.status, 404);
});

test('pipeline: GET /api/applications/stagnant detects overdue SLA applications', async () => {
  const appId = await createApplication(userA.cookie, 'Overdue Corp', 'Lead Architect');
  const pastDate = new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString();

  const patchRes = await fetch(`${base}/api/applications/${appId}/pipeline`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      priority: 'urgent',
      tags: ['executive'],
      statusUpdatedAt: pastDate
    })
  });
  assert.equal(patchRes.status, 200);

  const res = await fetch(`${base}/api/applications/stagnant`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 200);
  const stagnantList = await res.json() as StagnantApplicationItemDTO[];
  assert.ok(Array.isArray(stagnantList));
  const found = stagnantList.find(s => s.applicationId === appId);
  assert.ok(found);
  assert.equal(found.status, 'Applied');
  assert.equal(found.priority, 'urgent');
  assert.equal(found.sla.isStagnant, true);
  assert.ok(found.sla.daysInStage >= 24);
  assert.ok(found.sla.slaSeverity === 'critical' || found.sla.slaSeverity === 'warning');
  assert.ok(found.sla.recommendation.length > 0);
});

test('pipeline: GET /api/pipeline/summary computes aggregated metrics', async () => {
  const summaryRes = await fetch(`${base}/api/pipeline/summary`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(summaryRes.status, 200);
  const summary = await summaryRes.json() as PipelineSummaryDTO;
  assert.ok(summary.totalApplications >= 3);
  assert.ok(typeof summary.statusCounts === 'object');
  assert.ok(typeof summary.priorityCounts === 'object');
  assert.ok(typeof summary.tagCounts === 'object');
  assert.ok(summary.stagnantCount >= 1);
  assert.ok(summary.priorityCounts.urgent >= 1);
});
