import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  FollowUpLogDTO,
  FollowUpCadenceStatusDTO,
  GeneratedFollowUpDraftDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 600;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

let sharedUser: { userId: string; cookie: string };

test.before(async () => {
  sharedUser = await registerUser();
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
  const email = `followup_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.11.${forwardedIp++}`
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

async function createApplication(cookie: string, data: { company: string; position: string; status: string }) {
  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify(data)
  });
  assert.equal(res.status, 201);
  return await res.json() as { id: string; company: string; position: string; status: string };
}

test('follow-up: GET /api/applications/:id/follow-ups requires authentication', async () => {
  const dummyId = randomUUID();
  const res = await fetch(`${base}/api/applications/${dummyId}/follow-ups`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('follow-up: GET /api/applications/:id/follow-ups returns cadence status and templates', async () => {
  const user = sharedUser;
  const appRecord = await createApplication(user.cookie, {
    company: 'Tiki Vietnam',
    position: 'Senior Go Developer',
    status: 'Applied'
  });

  const res = await fetch(`${base}/api/applications/${appRecord.id}/follow-ups`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as {
    cadence: FollowUpCadenceStatusDTO;
    logs: FollowUpLogDTO[];
    templates: unknown[];
  };

  assert.equal(data.cadence.applicationId, appRecord.id);
  assert.equal(data.cadence.stage, 'Applied');
  assert.equal(data.logs.length, 0);
  assert.ok(data.templates.length > 0);
});

test('follow-up: POST /api/applications/:id/follow-ups/generate creates customized email draft', async () => {
  const user = sharedUser;
  const appRecord = await createApplication(user.cookie, {
    company: 'VinFast Tech',
    position: 'Embedded Software Engineer',
    status: 'Interview'
  });

  const res = await fetch(`${base}/api/applications/${appRecord.id}/follow-ups/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      tone: 'post_interview_thank_you',
      candidateName: 'Hoàng Minh',
      recruiterName: 'Anh Tuấn',
      discussionHighlight: 'giải pháp tối ưu hóa firmware CAN bus'
    })
  });

  assert.equal(res.status, 200);
  const draft = await res.json() as GeneratedFollowUpDraftDTO;
  assert.ok(draft.subject.includes('VinFast Tech'));
  assert.ok(draft.subject.includes('Hoàng Minh'));
  assert.ok(draft.body.includes('Anh Tuấn'));
  assert.ok(draft.body.includes('CAN bus'));
  assert.ok(draft.keySuggestions.length > 0);
});

test('follow-up: POST /api/applications/:id/follow-ups/logs validates input and rejects short body', async () => {
  const user = sharedUser;
  const appRecord = await createApplication(user.cookie, {
    company: 'ZaloPay',
    position: 'Frontend Specialist',
    status: 'Applied'
  });

  const res = await fetch(`${base}/api/applications/${appRecord.id}/follow-ups/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      subject: '',
      body: 'Ngắn'
    })
  });

  assert.equal(res.status, 422);
});

test('follow-up: POST /api/applications/:id/follow-ups/logs records outreach and updates cadence', async () => {
  const user = sharedUser;
  const appRecord = await createApplication(user.cookie, {
    company: 'Shopee Vietnam',
    position: 'Lead Backend Architect',
    status: 'Interview'
  });

  const logRes = await fetch(`${base}/api/applications/${appRecord.id}/follow-ups/logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      stage: 'Interview',
      tone: 'post_interview_thank_you',
      subject: 'Cảm ơn buổi phỏng vấn vị trí Lead Backend Architect',
      body: 'Xin chân thành cảm ơn ban tuyển dụng Shopee đã dành thời gian trao đổi...',
      recipientEmail: 'recruitment@shopee.vn',
      notes: 'Đã gửi qua Gmail lúc 16:30'
    })
  });

  assert.equal(logRes.status, 201);
  const createdLog = await logRes.json() as FollowUpLogDTO;
  assert.equal(createdLog.applicationId, appRecord.id);
  assert.equal(createdLog.recipientEmail, 'recruitment@shopee.vn');

  const summaryRes = await fetch(`${base}/api/applications/${appRecord.id}/follow-ups`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  const summary = await summaryRes.json() as { logs: FollowUpLogDTO[] };
  assert.equal(summary.logs.length, 1);
  assert.equal(summary.logs[0].subject, 'Cảm ơn buổi phỏng vấn vị trí Lead Backend Architect');
});

test('follow-up: GET /api/follow-ups/due returns applications that are due for follow-up', async () => {
  const user = sharedUser;
  const appRecord = await createApplication(user.cookie, {
    company: 'One Mount Group',
    position: 'Senior Data Engineer',
    status: 'Applied'
  });

  await pool.query(
    "UPDATE applications SET applied_at = CURRENT_DATE - 6, created_at = CURRENT_TIMESTAMP - interval '6 days' WHERE id = $1 AND user_id = $2",
    [appRecord.id, user.userId]
  );

  const res = await fetch(`${base}/api/follow-ups/due`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const dueList = await res.json() as Array<{ applicationId: string; company: string; cadence: FollowUpCadenceStatusDTO }>;
  assert.ok(Array.isArray(dueList));
  assert.ok(dueList.some(item => item.applicationId === appRecord.id && item.cadence.isDue === true));
});
