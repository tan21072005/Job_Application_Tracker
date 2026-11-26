import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  EmailIngestProposalDTO,
  EmailIngestApplyResultDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1300;

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
  const email = `email_ingest_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.18.${forwardedIp++}`
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

async function promoteTo(appId: string, cookie: string, status: string): Promise<string> {
  const current = await fetch(`${base}/api/applications/${appId}`, {
    headers: { Cookie: cookie, Origin: origin }
  });
  assert.equal(current.status, 200);
  const etag = current.headers.get('etag');
  if (!etag) throw new Error('application response carried no ETag');

  const patched = await fetch(`${base}/api/applications/${appId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
      Origin: origin,
      'If-Match': etag,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({ status })
  });
  assert.equal(patched.status, 200, `expected to set ${status}, got ${patched.status}`);

  const after = await fetch(`${base}/api/applications/${appId}`, {
    headers: { Cookie: cookie, Origin: origin }
  });
  const data = await after.json() as { status: string };
  return data.status;
}

test('email-ingest: POST /api/ingest/email/parse requires authentication', async () => {
  const res = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ emailContent: 'Mời phỏng vấn tại Shopee' })
  });
  assert.equal(res.status, 401);
});

test('email-ingest: POST /api/ingest/email/apply requires authentication', async () => {
  const res = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({
      actionType: 'create_application',
      confidenceScore: 90,
      summary: 'Tạo mới hồ sơ',
      proposedApplication: { company: 'Shopee', position: 'Dev', status: 'Applied' },
      changesSummary: ['Tạo mới']
    })
  });
  assert.equal(res.status, 401);
});

test('email-ingest: POST /api/ingest/email/parse rejects empty content with 422', async () => {
  const res = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ emailContent: '   ' })
  });
  assert.equal(res.status, 422);
});

test('email-ingest: POST /api/ingest/email/parse proposes create_application for new company', async () => {
  const emailContent = `Chào bạn,
Cảm ơn bạn đã quan tâm và nộp hồ sơ ứng tuyển vị trí Backend Developer tại Viettel.
Hồ sơ của bạn đã được chuyển tới bộ phận kỹ thuật để xem xét.
Trân trọng,
Phòng Tuyển dụng Viettel
Email: tuyendung@viettel.com.vn`;

  const res = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      emailContent,
      subject: 'Xác nhận hồ sơ ứng tuyển - Viettel',
      sender: 'hr@viettel.com.vn'
    })
  });

  assert.equal(res.status, 200);
  const proposal = await res.json() as EmailIngestProposalDTO;
  assert.equal(proposal.actionType, 'create_application');
  assert.equal(proposal.matchedApplicationId, null);
  assert.equal(proposal.proposedApplication?.company, 'Viettel');
  assert.equal(proposal.proposedApplication?.position, 'Backend Developer');
});

test('email-ingest: POST /api/ingest/email/parse proposes schedule_interview when existing app matches', async () => {
  const existingAppId = await createApplication(userA.cookie, 'FPT Software', 'Senior React Engineer');

  const emailContent = `Chào bạn,
Phòng Nhân sự FPT Software trân trọng gửi thư mời phỏng vấn kỹ thuật cho vị trí Senior React Engineer.
Thời gian: 14:00 ngày 29/11/2026.
Phòng họp trực tuyến Google Meet: https://meet.google.com/xyz-abcd-efg
Người phỏng vấn: Anh Trần Minh Tuấn
Email: tuantm@fpt.com
SĐT: 0987654321`;

  const res = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      emailContent,
      subject: 'Thư mời phỏng vấn - FPT Software',
      sender: 'recruitment@fpt.com'
    })
  });

  assert.equal(res.status, 200);
  const proposal = await res.json() as EmailIngestProposalDTO;
  assert.equal(proposal.actionType, 'schedule_interview');
  assert.equal(proposal.matchedApplicationId, existingAppId);
  assert.equal(proposal.proposedApplication?.status, 'Interview');
  assert.ok(proposal.proposedInterview);
  assert.equal(proposal.proposedInterview.format, 'Google Meet');
  assert.equal(proposal.proposedInterview.location, 'https://meet.google.com/xyz-abcd-efg');
});

test('email-ingest: POST /api/ingest/email/apply creates application and interview round', async () => {
  const parseRes = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      emailContent: 'Mời phỏng vấn tại Shopee ngày 15:00 ngày 30/11/2026 qua https://meet.google.com/shp-meet-123 vị trí DevOps Engineer.',
      subject: 'Interview Shopee'
    })
  });
  const proposal = await parseRes.json() as EmailIngestProposalDTO;

  const applyRes = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify(proposal)
  });

  assert.equal(applyRes.status, 201);
  const result = await applyRes.json() as EmailIngestApplyResultDTO;
  assert.equal(result.success, true);
  assert.equal(result.actionTaken, 'create_application');
  assert.ok(result.applicationId);
  assert.ok(result.interviewId);

  const getApp = await fetch(`${base}/api/applications/${result.applicationId}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(getApp.status, 200);
  const appData = await getApp.json() as { company: string; status: string; interviews: unknown[] };
  assert.equal(appData.company, 'Shopee');
  assert.equal(appData.interviews.length, 1);
});

test('email-ingest: applying the same proposal twice does not create a duplicate application', async () => {
  const parseRes = await fetch(`${base}/api/ingest/email/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      emailContent: 'Cảm ơn bạn đã ứng tuyển vị trí Backend Engineer tại Abctech. Chúng tôi đã nhận được hồ sơ.',
      subject: 'Xác nhận hồ sơ Abctech'
    })
  });
  const proposal = await parseRes.json() as EmailIngestProposalDTO;

  const first = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, Origin: origin },
    body: JSON.stringify(proposal)
  });
  assert.equal(first.status, 201);
  const firstResult = await first.json() as EmailIngestApplyResultDTO;

  const second = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, Origin: origin },
    body: JSON.stringify(proposal)
  });
  assert.equal(second.status, 201, 'a repeated apply must not fail, it must reuse the record');
  const secondResult = await second.json() as EmailIngestApplyResultDTO;

  assert.equal(secondResult.applicationId, firstResult.applicationId, 'the second apply must hit the same row');

  const listRes = await fetch(`${base}/api/applications`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const apps = await listRes.json() as Array<{ company: string; position: string }>;
  const samePair = apps.filter(
    a => a.company === proposal.proposedApplication?.company && a.position === proposal.proposedApplication?.position
  );
  assert.equal(samePair.length, 1, 'exactly one application may exist for the same company and position');
});

test('email-ingest: an acknowledgement never moves an Offer back to Applied', async () => {
  const appId = await createApplication(userA.cookie, 'Tiki Corporation', 'Senior Flutter Developer');
  const promoted = await promoteTo(appId, userA.cookie, 'Offer');
  assert.equal(promoted, 'Offer');

  const ackProposal: EmailIngestProposalDTO = {
    actionType: 'update_status',
    confidenceScore: 85,
    matchedApplicationId: appId,
    matchedCompany: 'Tiki Corporation',
    matchedPosition: 'Senior Flutter Developer',
    summary: 'Đã nhận hồ sơ',
    proposedApplication: {
      company: 'Tiki Corporation',
      position: 'Senior Flutter Developer',
      status: 'Applied'
    },
    changesSummary: ['Acknowledgement']
  };

  const applyRes = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, Origin: origin },
    body: JSON.stringify(ackProposal)
  });
  assert.equal(applyRes.status, 201);

  const getApp = await fetch(`${base}/api/applications/${appId}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const appData = await getApp.json() as { status: string };
  assert.equal(appData.status, 'Offer', 'a confirmation email must not demote an offer');
});

test('email-ingest: an invitation never revives a Rejected application', async () => {
  const appId = await createApplication(userA.cookie, 'Viettel Solutions', 'Data Engineer');
  const rejected = await promoteTo(appId, userA.cookie, 'Rejected');
  assert.equal(rejected, 'Rejected');

  const inviteProposal: EmailIngestProposalDTO = {
    actionType: 'update_status',
    confidenceScore: 88,
    matchedApplicationId: appId,
    matchedCompany: 'Viettel Solutions',
    matchedPosition: 'Data Engineer',
    summary: 'Mời phỏng vấn',
    proposedApplication: {
      company: 'Viettel Solutions',
      position: 'Data Engineer',
      status: 'Interview'
    },
    changesSummary: ['Interview invitation']
  };

  const applyRes = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: userA.cookie, Origin: origin },
    body: JSON.stringify(inviteProposal)
  });
  assert.equal(applyRes.status, 201);

  const getApp = await fetch(`${base}/api/applications/${appId}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const appData = await getApp.json() as { status: string };
  assert.equal(appData.status, 'Rejected', 'a rejected application must stay rejected');
});

test('email-ingest: multi-tenant isolation prevents User B from mutating User A application via apply', async () => {
  const userAAppId = await createApplication(userA.cookie, 'VNG Corporation', 'Node.js Lead');

  const hackProposal: EmailIngestProposalDTO = {
    actionType: 'update_status',
    confidenceScore: 90,
    matchedApplicationId: userAAppId,
    matchedCompany: 'VNG Corporation',
    matchedPosition: 'Node.js Lead',
    summary: 'Hack update status',
    proposedApplication: {
      company: 'VNG Corporation',
      position: 'Node.js Lead',
      status: 'Offer'
    },
    changesSummary: ['Unauthorized update']
  };

  const applyRes = await fetch(`${base}/api/ingest/email/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify(hackProposal)
  });

  assert.equal(applyRes.status, 404);
});
