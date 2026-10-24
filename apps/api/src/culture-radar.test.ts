import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  CultureCompatibilityReportDTO,
  ReverseInterviewQuestionDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2500;

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
  const email = `culture_radar_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.28.${forwardedIp++}`
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

test('culture-radar: GET /api/culture/radar requires authentication', async () => {
  const res = await fetch(`${base}/api/culture/radar`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('culture-radar: POST /api/culture/analyze requires authentication', async () => {
  const res = await fetch(`${base}/api/culture/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ company: 'FPT Software' })
  });
  assert.equal(res.status, 401);
});

test('culture-radar: POST /api/culture/analyze rejects empty company with 422', async () => {
  const res = await fetch(`${base}/api/culture/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ company: '   ' })
  });
  assert.equal(res.status, 422);
  const json = await res.json() as { code: string; fields: Record<string, string> };
  assert.equal(json.code, 'invalid_request');
  assert.ok(json.fields.company);
});

test('culture-radar: POST /api/culture/questions generates role probes', async () => {
  const res = await fetch(`${base}/api/culture/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetRole: 'peer_engineer'
    })
  });
  assert.equal(res.status, 200);
  const questions = await res.json() as ReverseInterviewQuestionDTO[];
  assert.ok(questions.length >= 1);
  assert.equal(questions[0].targetRole, 'peer_engineer');
  assert.ok(questions[0].listeningFor.length > 0);
  assert.ok(questions[0].redFlagSignal.length > 0);
});

test('culture-radar: full analysis lifecycle and multi-tenant isolation', async () => {
  const analyzeRes = await fetch(`${base}/api/culture/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      company: 'Shopee',
      targetRole: 'Senior Backend Engineer',
      candidatePreferences: {
        engineering_rigor: 5,
        oncall_wlb: 5,
        psychological_safety: 4
      }
    })
  });
  assert.equal(analyzeRes.status, 200);
  const report = await analyzeRes.json() as CultureCompatibilityReportDTO;
  assert.equal(report.userId, userA.userId);
  assert.equal(report.company, 'Shopee');
  assert.equal(report.dimensionScores.length, 6);
  assert.ok(report.reverseInterviewQuestions.length >= 1);
  assert.ok(report.overallCompatibilityScore > 0);

  const fetchResA = await fetch(`${base}/api/culture/radar?company=Shopee`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(fetchResA.status, 200);
  const fetchedA = await fetchResA.json() as CultureCompatibilityReportDTO;
  assert.equal(fetchedA.id, report.id);

  const fetchResB = await fetch(`${base}/api/culture/radar?company=Shopee`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(fetchResB.status, 200);
  const fetchedB = await fetchResB.json();
  assert.equal(fetchedB, null);
});
