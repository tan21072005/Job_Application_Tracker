import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  SimulationSessionDTO,
  TurnEvaluationDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1600;

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
  const email = `simulation_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.21.${forwardedIp++}`
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

test('simulation: GET /api/simulation/sessions requires authentication', async () => {
  const res = await fetch(`${base}/api/simulation/sessions`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('simulation: POST /api/simulation/sessions validates input and rejects missing fields with 422', async () => {
  const res = await fetch(`${base}/api/simulation/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: '',
      targetCompany: 'Tiki',
      track: 'invalid_track',
      difficulty: 'senior',
      pacingMode: 'standard_2min'
    })
  });
  assert.equal(res.status, 422);
  const data = await res.json() as { code: string; message: string };
  assert.equal(data.code, 'invalid_request');
});

test('simulation: POST /api/simulation/sessions successfully initializes session with generated questions', async () => {
  const res = await fetch(`${base}/api/simulation/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: 'Senior Backend Engineer',
      targetCompany: 'Shopee',
      track: 'system_design',
      difficulty: 'senior',
      pacingMode: 'standard_2min'
    })
  });

  assert.equal(res.status, 201);
  const session = await res.json() as SimulationSessionDTO;
  assert.ok(session.id);
  assert.equal(session.targetRole, 'Senior Backend Engineer');
  assert.equal(session.targetCompany, 'Shopee');
  assert.equal(session.track, 'system_design');
  assert.equal(session.difficulty, 'senior');
  assert.equal(session.status, 'in_progress');
  assert.equal(session.currentQuestionIndex, 0);
  assert.ok(Array.isArray(session.questions));
  assert.equal(session.questions.length, 3);
  assert.equal(session.turns.length, 0);
  assert.equal(session.report, null);
});

test('simulation: GET /api/simulation/sessions lists sessions and enforces multi-tenant isolation', async () => {
  const resA = await fetch(`${base}/api/simulation/sessions`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(resA.status, 200);
  const sessionsA = await resA.json() as SimulationSessionDTO[];
  assert.ok(sessionsA.length >= 1);
  const targetId = sessionsA[0].id;

  const resB = await fetch(`${base}/api/simulation/sessions`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(resB.status, 200);
  const sessionsB = await resB.json() as SimulationSessionDTO[];
  assert.equal(sessionsB.length, 0);

  const resBGet = await fetch(`${base}/api/simulation/sessions/${targetId}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(resBGet.status, 404);
});

test('simulation: POST /api/simulation/sessions/:id/turn evaluates answer and advances question', async () => {
  const listRes = await fetch(`${base}/api/simulation/sessions`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const sessions = await listRes.json() as SimulationSessionDTO[];
  const sessionId = sessions[0].id;

  const invalidRes = await fetch(`${base}/api/simulation/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      answer: '',
      timeTakenSeconds: 75
    })
  });
  assert.equal(invalidRes.status, 422);

  const turnRes = await fetch(`${base}/api/simulation/sessions/${sessionId}/turn`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      answer: 'Tình huống là hệ thống kafka bị nghẽn. Nhiệm vụ của tôi là scale consumer group. Hành động: tôi phân tách partition từ 16 lên 64 và áp dụng batch processing với buffer 500ms. Kết quả là throughput tăng 350% và p99 latency giảm từ 2200ms xuống còn 85ms.',
      timeTakenSeconds: 75
    })
  });

  assert.equal(turnRes.status, 200);
  const turnData = await turnRes.json() as { session: SimulationSessionDTO; evaluation: TurnEvaluationDTO };
  assert.equal(turnData.session.currentQuestionIndex, 1);
  assert.equal(turnData.session.turns.length, 1);
  assert.ok(turnData.evaluation.compositeScore >= 60);
  assert.ok(turnData.evaluation.strengths.length > 0);
  assert.ok(turnData.evaluation.exemplarAnswer.length > 10);
});

test('simulation: completing all turns synthesizes session report', async () => {
  const createRes = await fetch(`${base}/api/simulation/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: 'Product Lead',
      targetCompany: 'Grab',
      track: 'culture_leadership',
      difficulty: 'lead',
      pacingMode: 'rapid_fire_1min'
    })
  });
  const newSession = await createRes.json() as SimulationSessionDTO;
  const sessionId = newSession.id;

  for (let i = 0; i < newSession.questions.length; i++) {
    const res = await fetch(`${base}/api/simulation/sessions/${sessionId}/turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({
        answer: `Khi giải quyết bất đồng ý kiến trong nhóm 10 kỹ sư, tôi tổ chức phiên RFC minh bạch, phân tích tác động rủi ro và đo lường sự hài lòng của nhóm đạt 95% sau chuyển đổi.`,
        timeTakenSeconds: 45
      })
    });
    assert.equal(res.status, 200);
  }

  const finishedRes = await fetch(`${base}/api/simulation/sessions/${sessionId}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const finishedSession = await finishedRes.json() as SimulationSessionDTO;
  assert.equal(finishedSession.status, 'completed');
  assert.equal(finishedSession.turns.length, finishedSession.questions.length);
  assert.ok(finishedSession.report);
  assert.ok(finishedSession.report.overallScore > 0);
  assert.ok(['Ready', 'Strong Contender', 'Needs Practice', 'High Risk'].includes(finishedSession.report.readinessGrade));
});

test('simulation: DELETE /api/simulation/sessions/:id deletes session', async () => {
  const createRes = await fetch(`${base}/api/simulation/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: 'Frontend Dev',
      targetCompany: 'VNG',
      track: 'behavioral_star',
      difficulty: 'mid',
      pacingMode: 'relaxed_5min'
    })
  });
  const session = await createRes.json() as SimulationSessionDTO;

  const deleteRes = await fetch(`${base}/api/simulation/sessions/${session.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteRes.status, 200);

  const getRes = await fetch(`${base}/api/simulation/sessions/${session.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 404);
});
