import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  RecruiterLeadDTO,
  HeadhunterMandateDTO,
  InboundPitchParseResultDTO,
  RecruiterResponseDraftDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2600;

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
  const email = `headhunter_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.29.${forwardedIp++}`
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

test('headhunter-crm: GET /api/headhunters requires authentication', async () => {
  const res = await fetch(`${base}/api/headhunters`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('headhunter-crm: POST /api/headhunters rejects empty required fields with 422', async () => {
  const res = await fetch(`${base}/api/headhunters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ name: '  ', agency: '' })
  });
  assert.equal(res.status, 422);
  const json = await res.json() as { code: string; fields: Record<string, string> };
  assert.equal(json.code, 'invalid_request');
  assert.ok(json.fields.name);
  assert.ok(json.fields.agency);
});

test('headhunter-crm: POST /api/headhunters/parse-pitch parses pitch into structured intelligence', async () => {
  const pitchText = `
    Chào bạn, mình là Alexandre Nguyen từ Michael Page Vietnam.
    Hiện bên mình đang có cơ hội Head of Engineering cho một tập đoàn đa quốc gia ngành bán lẻ công nghệ.
    Ngân sách từ 90 - 130 triệu VND gross.
    Nếu bạn quan tâm, hãy gửi lại CV để mình kết nối nhé!
  `;

  const res = await fetch(`${base}/api/headhunters/parse-pitch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ rawText: pitchText })
  });
  assert.equal(res.status, 200);
  const data = await res.json() as InboundPitchParseResultDTO;
  assert.equal(data.agencyName, 'Michael Page');
  assert.equal(data.agencyTier, 'tier1_global');
  assert.equal(data.targetRole, 'Head of Engineering');
  assert.equal(data.currency, 'VND');
  assert.equal(data.extractedMinComp, 90000000);
  assert.equal(data.extractedMaxComp, 130000000);
  assert.ok(data.greenFlags.length > 0);
});

test('headhunter-crm: POST /api/headhunters/reply-draft generates strategic response', async () => {
  const parseRes = await fetch(`${base}/api/headhunters/parse-pitch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      rawText: 'Chào bạn, tôi là Oanh từ Navigos Search. Bên mình đang tuyển CTO ngân hàng số.'
    })
  });
  const pitch = await parseRes.json() as InboundPitchParseResultDTO;

  const replyRes = await fetch(`${base}/api/headhunters/reply-draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      pitch,
      intent: 'salary_first'
    })
  });
  assert.equal(replyRes.status, 200);
  const draft = await replyRes.json() as RecruiterResponseDraftDTO;
  assert.equal(draft.intent, 'salary_first');
  assert.ok(draft.subject.includes('CTO'));
  assert.ok(draft.body.includes('ngân sách'));
});

test('headhunter-crm: full lead & mandate lifecycle with multi-tenant isolation', async () => {
  const leadRes = await fetch(`${base}/api/headhunters`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'Mai Hoàng',
      agency: 'Robert Walters',
      agencyTier: 'tier1_global',
      role: 'Director of Tech Practice',
      tier: 'trusted_advisor',
      rating: 5,
      specialties: ['FinTech', 'C-Level'],
      email: 'mai.hoang@robertwalters.com.vn'
    })
  });
  assert.equal(leadRes.status, 201);
  const leadA = await leadRes.json() as RecruiterLeadDTO;
  assert.equal(leadA.userId, userA.userId);
  assert.equal(leadA.name, 'Mai Hoàng');
  assert.equal(leadA.tier, 'trusted_advisor');
  assert.ok(leadA.healthScore >= 85);
  assert.equal(leadA.healthStatus, 'excellent');

  const mandateRes = await fetch(`${base}/api/headhunters/mandates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      leadId: leadA.id,
      roleTitle: 'VP of Engineering',
      clientCompany: 'Techcombank Digital',
      exclusivity: 'exclusive_retained',
      salaryRange: '$6,000 - $8,000 USD',
      isConfidential: false
    })
  });
  assert.equal(mandateRes.status, 201);
  const mandateA = await mandateRes.json() as HeadhunterMandateDTO;
  assert.equal(mandateA.leadId, leadA.id);
  assert.equal(mandateA.clientCompany, 'Techcombank Digital');
  assert.equal(mandateA.status, 'pitched');

  const patchRes = await fetch(`${base}/api/headhunters/mandates/${mandateA.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ status: 'submitted' })
  });
  assert.equal(patchRes.status, 200);
  const patchedMandate = await patchRes.json() as HeadhunterMandateDTO;
  assert.equal(patchedMandate.status, 'submitted');

  const listResA = await fetch(`${base}/api/headhunters`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listResA.status, 200);
  const listA = await listResA.json() as RecruiterLeadDTO[];
  assert.equal(listA.length, 1);
  assert.equal(listA[0].id, leadA.id);

  const listResB = await fetch(`${base}/api/headhunters`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(listResB.status, 200);
  const listB = await listResB.json() as RecruiterLeadDTO[];
  assert.equal(listB.length, 0);

  const mandatesResB = await fetch(`${base}/api/headhunters/mandates`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(mandatesResB.status, 200);
  const mandatesB = await mandatesResB.json() as HeadhunterMandateDTO[];
  assert.equal(mandatesB.length, 0);

  const delRes = await fetch(`${base}/api/headhunters/${leadA.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(delRes.status, 204);

  const listAfterDel = await fetch(`${base}/api/headhunters`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const listAfterJson = await listAfterDel.json() as RecruiterLeadDTO[];
  assert.equal(listAfterJson.length, 0);
});
