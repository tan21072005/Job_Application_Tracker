import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { TrajectorySimulationDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2100;

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
  const email = `trajectory_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.25.${forwardedIp++}`
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

test('trajectory: GET /api/trajectory requires authentication', async () => {
  const res = await fetch(`${base}/api/trajectory`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('trajectory: POST /api/trajectory/simulate requires authentication', async () => {
  const res = await fetch(`${base}/api/trajectory/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ currentRole: 'Senior Engineer' })
  });
  assert.equal(res.status, 401);
});

test('trajectory: PUT /api/trajectory/competencies requires authentication', async () => {
  const res = await fetch(`${base}/api/trajectory/competencies`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ scores: {} })
  });
  assert.equal(res.status, 401);
});

test('trajectory: POST /api/trajectory/simulate rejects invalid input with 400', async () => {
  const res = await fetch(`${base}/api/trajectory/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      currentRole: '',
      currentLevel: ''
    })
  });
  assert.equal(res.status, 400);
  const json = await res.json() as { code: string; errors: Record<string, string> };
  assert.equal(json.code, 'validation_error');
  assert.ok(json.errors.currentRole);
  assert.ok(json.errors.currentLevel);
});

test('trajectory: PUT /api/trajectory/competencies rejects missing scores with 400', async () => {
  const res = await fetch(`${base}/api/trajectory/competencies`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(res.status, 400);
  const json = await res.json() as { code: string; errors: Record<string, string> };
  assert.equal(json.code, 'validation_error');
  assert.ok(json.errors.scores);
});

test('trajectory: full lifecycle, simulation, multi-tenant isolation, and score update', async () => {
  const initialGet = await fetch(`${base}/api/trajectory`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(initialGet.status, 200);
  const initialData = await initialGet.json();
  assert.equal(initialData, null);

  const simResA = await fetch(`${base}/api/trajectory/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      currentRole: 'Senior Frontend Engineer',
      currentLevel: 'Senior',
      targetTrack: 'ic',
      targetRole: 'Staff',
      horizonYears: 4,
      userScores: {
        technical_breadth: 85,
        system_scale: 85,
        org_influence: 60,
        mentorship_culture: 70,
        business_impact: 75
      }
    })
  });

  assert.equal(simResA.status, 200);
  const simA = await simResA.json() as TrajectorySimulationDTO;
  assert.equal(simA.currentRole, 'Senior Frontend Engineer');
  assert.equal(simA.targetTrack, 'ic');
  assert.equal(simA.targetRole, 'Staff');
  assert.equal(simA.horizonYears, 4);
  assert.equal(simA.roadmapSteps.length, 4);
  assert.equal(simA.readiness.competencies.length, 5);
  assert.ok(simA.readiness.highImpactInitiatives.length > 0);

  const getResA = await fetch(`${base}/api/trajectory`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getResA.status, 200);
  const fetchedA = await getResA.json() as TrajectorySimulationDTO;
  assert.equal(fetchedA.id, simA.id);
  assert.equal(fetchedA.userId, userA.userId);

  const getResB = await fetch(`${base}/api/trajectory`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(getResB.status, 200);
  const fetchedB = await getResB.json();
  assert.equal(fetchedB, null);

  const updateRes = await fetch(`${base}/api/trajectory/competencies`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      scores: {
        technical_breadth: 90,
        system_scale: 90,
        org_influence: 85,
        mentorship_culture: 85,
        business_impact: 85
      }
    })
  });
  assert.equal(updateRes.status, 200);
  const updatedA = await updateRes.json() as TrajectorySimulationDTO;
  assert.ok(updatedA.readiness.overallReadinessScore >= simA.readiness.overallReadinessScore);

  const simResB = await fetch(`${base}/api/trajectory/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      currentRole: 'Lead Engineer',
      currentLevel: 'Senior',
      targetTrack: 'management',
      targetRole: 'Tech Lead',
      horizonYears: 4
    })
  });
  assert.equal(simResB.status, 200);
  const simB = await simResB.json() as TrajectorySimulationDTO;
  assert.equal(simB.userId, userB.userId);
  assert.equal(simB.targetTrack, 'management');
});
