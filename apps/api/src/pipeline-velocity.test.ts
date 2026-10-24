import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  PipelineVelocityReportDTO,
  PipelineVelocitySimulationDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2400;

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
  const email = `pipeline_velocity_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.27.${forwardedIp++}`
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

test('pipeline-velocity: GET /api/pipeline/velocity/report requires authentication', async () => {
  const res = await fetch(`${base}/api/pipeline/velocity/report`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('pipeline-velocity: POST /api/pipeline/velocity/report requires authentication', async () => {
  const res = await fetch(`${base}/api/pipeline/velocity/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ targetOfferDate: '2026-12-31' })
  });
  assert.equal(res.status, 401);
});

test('pipeline-velocity: POST /api/pipeline/velocity/report rejects invalid input with 422', async () => {
  const res = await fetch(`${base}/api/pipeline/velocity/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetOfferDate: '2020-01-01',
      targetOfferCount: 0
    })
  });
  assert.equal(res.status, 422);
  const json = await res.json() as { code: string; fields: Record<string, string> };
  assert.equal(json.code, 'invalid_request');
  assert.ok(json.fields.targetOfferDate);
  assert.ok(json.fields.targetOfferCount);
});

test('pipeline-velocity: POST /api/pipeline/velocity/simulate computes parametric simulations', async () => {
  const res = await fetch(`${base}/api/pipeline/velocity/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      weeklyVelocity: 6,
      weeksHorizon: 10
    })
  });
  assert.equal(res.status, 200);
  const json = await res.json() as PipelineVelocitySimulationDTO;
  assert.equal(json.simulatedApplicationsPerWeek, 6);
  assert.equal(json.simulationDays, 70);
  assert.ok(json.p90Offers >= json.p50Offers);
  assert.ok(json.p50Offers >= json.p10Offers);
});

test('pipeline-velocity: full lifecycle, report generation, multi-tenant isolation', async () => {
  const appId1 = randomUUID();
  const appId2 = randomUUID();
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const appliedDate1 = twoWeeksAgo.toISOString().slice(0, 10);
  const appliedDate2 = oneWeekAgo.toISOString().slice(0, 10);

  await pool.query(
    `INSERT INTO applications (id, user_id, company, position, status, applied_at, created_at, updated_at)
     VALUES ($1, $2, 'FPT Software', 'Senior Engineer', 'Interview', $3, $4, $5)`,
    [appId1, userA.userId, appliedDate1, twoWeeksAgo.toISOString(), oneWeekAgo.toISOString()]
  );

  await pool.query(
    `INSERT INTO interviews (id, application_id, title, at, timezone, format, location, preparation, notes, status)
     VALUES ($1, $2, 'Technical Screen', $3, 'Asia/Ho_Chi_Minh', 'Online', 'Google Meet', '', '', 'Scheduled')`,
    [randomUUID(), appId1, now.toISOString()]
  );

  await pool.query(
    `INSERT INTO applications (id, user_id, company, position, status, applied_at, created_at, updated_at)
     VALUES ($1, $2, 'VNG Corporation', 'Staff Engineer', 'Screening', $3, $4, $4)`,
    [appId2, userA.userId, appliedDate2, oneWeekAgo.toISOString()]
  );

  const futureTargetDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const genRes = await fetch(`${base}/api/pipeline/velocity/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetOfferDate: futureTargetDate,
      targetOfferCount: 1,
      simulationHorizonWeeks: 12
    })
  });

  assert.equal(genRes.status, 200);
  const report = await genRes.json() as PipelineVelocityReportDTO;
  assert.equal(report.userId, userA.userId);
  assert.equal(report.targetOfferDate, futureTargetDate);
  assert.equal(report.targetOfferCount, 1);
  assert.ok(report.applicationsAnalyzed >= 2);
  assert.ok(report.stageMetrics.length >= 4);
  assert.ok(report.bottlenecks.length >= 4);
  assert.ok(report.velocityTarget.recommendedWeeklyApplications >= 1);
  assert.ok(report.simulation.simulationDays === 84);

  const fetchResA = await fetch(`${base}/api/pipeline/velocity/report`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(fetchResA.status, 200);
  const fetchedReportA = await fetchResA.json() as PipelineVelocityReportDTO;
  assert.equal(fetchedReportA.id, report.id);

  const fetchResB = await fetch(`${base}/api/pipeline/velocity/report`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(fetchResB.status, 200);
  const fetchedReportB = await fetchResB.json();
  assert.equal(fetchedReportB, null);
});
