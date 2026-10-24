import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { DecisionMatrixComparison } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 900;

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
  const email = `decision_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.16.${forwardedIp++}`
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
      status: 'Interview'
    })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  return data.id;
}

test('decision: GET /api/decision-matrix/weights requires authentication', async () => {
  const res = await fetch(`${base}/api/decision-matrix/weights`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('decision: PUT /api/decision-matrix/weights requires authentication', async () => {
  const res = await fetch(`${base}/api/decision-matrix/weights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ compensation: 30 })
  });
  assert.equal(res.status, 401);
});

test('decision: GET /api/decision-matrix requires authentication', async () => {
  const res = await fetch(`${base}/api/decision-matrix`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('decision: GET /api/decision-matrix/weights returns defaults for new user', async () => {
  const res = await fetch(`${base}/api/decision-matrix/weights`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as Record<string, number>;
  assert.equal(data.compensation, 25);
  assert.equal(data.work_life_balance, 20);
  assert.equal(data.career_growth, 20);
});

test('decision: PUT /api/decision-matrix/weights normalizes and saves weights', async () => {
  const res = await fetch(`${base}/api/decision-matrix/weights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      compensation: 40,
      work_life_balance: 30,
      career_growth: 30
    })
  });
  assert.equal(res.status, 200);
  const data = await res.json() as Record<string, number>;
  assert.ok(data.compensation > data.leadership_team);

  const getRes = await fetch(`${base}/api/decision-matrix/weights`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(getRes.status, 200);
  const saved = await getRes.json() as Record<string, number>;
  assert.equal(saved.compensation, data.compensation);
});

test('decision: PUT /api/decision-matrix/weights validates negative numbers and non-numeric values', async () => {
  const res = await fetch(`${base}/api/decision-matrix/weights`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      compensation: -5,
      work_life_balance: 150
    })
  });
  assert.equal(res.status, 422);
  const data = await res.json() as { code: string; fields?: Record<string, string> };
  assert.equal(data.code, 'invalid_request');
  assert.ok(data.fields?.compensation);
  assert.ok(data.fields?.work_life_balance);
});

test('decision: PUT and GET /api/applications/:id/scorecard updates and retrieves scores', async () => {
  const appId = await createApplication(userA.cookie, 'Spotify', 'Platform Engineer');

  const updateRes = await fetch(`${base}/api/applications/${appId}/scorecard`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      scores: {
        compensation: 9,
        work_life_balance: 8,
        career_growth: 9,
        company_culture: 8,
        commute_flexibility: 10,
        leadership_team: 7,
        tech_stack: 9
      },
      notes: 'Thực sự thích văn hóa engineering tự chủ'
    })
  });
  assert.equal(updateRes.status, 200);
  const updatedData = await updateRes.json() as { id: string; scorecard: Record<string, number>; notes?: string };
  assert.equal(updatedData.id, appId);
  assert.equal(updatedData.scorecard.compensation, 9);
  assert.equal(updatedData.scorecard.commute_flexibility, 10);
  assert.equal(updatedData.notes, 'Thực sự thích văn hóa engineering tự chủ');

  const getRes = await fetch(`${base}/api/applications/${appId}/scorecard`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(getRes.status, 200);
  const retrievedData = await getRes.json() as { id: string; scorecard: Record<string, number>; notes?: string };
  assert.equal(retrievedData.id, appId);
  assert.equal(retrievedData.scorecard.compensation, 9);
  assert.equal(retrievedData.notes, 'Thực sự thích văn hóa engineering tự chủ');
});

test('decision: GET /api/decision-matrix computes comparisons and category champions', async () => {
  const appGoogle = await createApplication(userA.cookie, 'Google', 'Senior SRE');
  const appVercel = await createApplication(userA.cookie, 'Vercel', 'Fullstack Engineer');

  await fetch(`${base}/api/applications/${appGoogle}/scorecard`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      scores: {
        compensation: 10,
        work_life_balance: 6,
        career_growth: 8,
        company_culture: 7,
        commute_flexibility: 6,
        leadership_team: 8,
        tech_stack: 8
      }
    })
  });

  await fetch(`${base}/api/applications/${appVercel}/scorecard`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      scores: {
        compensation: 8,
        work_life_balance: 7,
        career_growth: 10,
        company_culture: 9,
        commute_flexibility: 10,
        leadership_team: 9,
        tech_stack: 10
      }
    })
  });

  const matrixRes = await fetch(`${base}/api/decision-matrix?ids=${appGoogle},${appVercel}`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(matrixRes.status, 200);
  const matrix = await matrixRes.json() as DecisionMatrixComparison;
  assert.equal(matrix.totalCompared, 2);
  assert.ok(matrix.topPickId);
  assert.equal(matrix.opportunities.length, 2);
  assert.equal(matrix.opportunities[0].rank, 1);
  assert.equal(matrix.opportunities[1].rank, 2);

  const compWinner = matrix.categoryWinners.find(w => w.dimension === 'compensation');
  assert.ok(compWinner);
  assert.equal(compWinner.company, 'Google');
  assert.equal(compWinner.score, 10);

  const growthWinner = matrix.categoryWinners.find(w => w.dimension === 'career_growth');
  assert.ok(growthWinner);
  assert.equal(growthWinner.company, 'Vercel');
  assert.equal(growthWinner.score, 10);
});

test('decision: multi-tenant isolation prevents cross-user scorecard access or matrix leak', async () => {
  const appIdUserA = await createApplication(userA.cookie, 'PrivateCorp', 'Staff Architect');

  const updateAttempt = await fetch(`${base}/api/applications/${appIdUserA}/scorecard`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      scores: { compensation: 10 }
    })
  });
  assert.equal(updateAttempt.status, 404);

  const getAttempt = await fetch(`${base}/api/applications/${appIdUserA}/scorecard`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(getAttempt.status, 404);

  const userBMatrixRes = await fetch(`${base}/api/decision-matrix?ids=${appIdUserA}`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(userBMatrixRes.status, 200);
  const userBMatrix = await userBMatrixRes.json() as DecisionMatrixComparison;
  assert.equal(userBMatrix.totalCompared, 0);
  assert.equal(userBMatrix.opportunities.length, 0);
});
