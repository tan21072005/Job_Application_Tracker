import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  OutreachCampaignDTO,
  OutreachRecipientDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1400;

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
  const email = `outreach_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.19.${forwardedIp++}`
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

test('outreach: GET /api/outreach/campaigns requires authentication', async () => {
  const res = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('outreach: POST /api/outreach/campaigns validates input and rejects missing fields with 422', async () => {
  const res = await fetch(`${base}/api/outreach/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: '',
      objective: 'invalid_obj'
    })
  });
  assert.equal(res.status, 422);
});

test('outreach: POST /api/outreach/campaigns creates campaign with auto-generated 3 steps', async () => {
  const res = await fetch(`${base}/api/outreach/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Chiến dịch Referral Shopee Backend',
      objective: 'referral_request',
      targetType: 'engineer',
      targetCompany: 'Shopee Vietnam',
      targetRole: 'Senior Backend Engineer'
    })
  });
  assert.equal(res.status, 201);
  const created = await res.json() as OutreachCampaignDTO;
  assert.equal(created.name, 'Chiến dịch Referral Shopee Backend');
  assert.equal(created.objective, 'referral_request');
  assert.equal(created.steps.length, 3);
  assert.equal(created.steps[0].delayDays, 0);
  assert.equal(created.steps[1].delayDays, 3);
  assert.equal(created.steps[2].delayDays, 6);
  assert.equal(created.recipients.length, 0);
  assert.equal(created.analytics?.totalRecipients, 0);
});

test('outreach: POST /api/outreach/campaigns/:id/recipients adds recipient and calculates metrics', async () => {
  const listRes = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const campaigns = await listRes.json() as OutreachCampaignDTO[];
  const campaign = campaigns[0];
  assert.ok(campaign);

  const addRes = await fetch(`${base}/api/outreach/campaigns/${campaign.id}/recipients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Hoàng Minh Tuấn',
      title: 'Principal Software Engineer',
      company: 'Shopee Vietnam',
      channel: 'linkedin',
      email: 'tuan.hm@shopee.vn',
      notes: 'Gặp tại sự kiện Tech Talk Shopee'
    })
  });
  assert.equal(addRes.status, 201);
  const recipient = await addRes.json() as OutreachRecipientDTO;
  assert.equal(recipient.name, 'Hoàng Minh Tuấn');
  assert.equal(recipient.status, 'pending');
  assert.equal(recipient.currentStepIndex, 1);

  const getRes = await fetch(`${base}/api/outreach/campaigns/${campaign.id}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 200);
  const details = await getRes.json() as OutreachCampaignDTO;
  assert.equal(details.recipients.length, 1);
  assert.equal(details.analytics?.totalRecipients, 1);
  assert.equal(details.analytics?.totalSent, 0);
});

test('outreach: PATCH /api/outreach/recipients/:recipientId/step updates status and advances step', async () => {
  const listRes = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const campaigns = await listRes.json() as OutreachCampaignDTO[];
  const recipient = campaigns[0].recipients[0];
  assert.ok(recipient);

  const stepRes = await fetch(`${base}/api/outreach/recipients/${recipient.id}/step`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      currentStepIndex: 2,
      status: 'sent',
      notes: 'Đã gửi lời mời kết nối LinkedIn'
    })
  });
  assert.equal(stepRes.status, 200);
  const updated = await stepRes.json() as OutreachRecipientDTO;
  assert.equal(updated.currentStepIndex, 2);
  assert.equal(updated.status, 'sent');
  assert.ok(updated.lastContactedAt);

  const replyRes = await fetch(`${base}/api/outreach/recipients/${recipient.id}/step`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      currentStepIndex: 3,
      status: 'referred',
      notes: 'Anh Tuấn đồng ý submit referral'
    })
  });
  assert.equal(replyRes.status, 200);
  const referred = await replyRes.json() as OutreachRecipientDTO;
  assert.equal(referred.status, 'referred');

  const getRes = await fetch(`${base}/api/outreach/campaigns/${campaigns[0].id}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const details = await getRes.json() as OutreachCampaignDTO;
  assert.equal(details.analytics?.totalSent, 1);
  assert.equal(details.analytics?.totalReplied, 1);
  assert.equal(details.analytics?.totalReferred, 1);
  assert.equal(details.analytics?.referralRate, 100);
});

test('outreach: multi-tenant isolation prevents User B from accessing or altering User A data', async () => {
  const listA = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const campaignsA = await listA.json() as OutreachCampaignDTO[];
  assert.equal(campaignsA.length, 1);

  const listB = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  const campaignsB = await listB.json() as OutreachCampaignDTO[];
  assert.equal(campaignsB.length, 0);

  const getOther = await fetch(`${base}/api/outreach/campaigns/${campaignsA[0].id}`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(getOther.status, 404);

  const recipientA = campaignsA[0].recipients[0];
  const patchOther = await fetch(`${base}/api/outreach/recipients/${recipientA.id}/step`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      currentStepIndex: 1,
      status: 'declined'
    })
  });
  assert.equal(patchOther.status, 500);
});

test('outreach: DELETE /api/outreach/campaigns/:id removes campaign and cascades', async () => {
  const listA = await fetch(`${base}/api/outreach/campaigns`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  const campaignsA = await listA.json() as OutreachCampaignDTO[];
  const idToDelete = campaignsA[0].id;

  const delRes = await fetch(`${base}/api/outreach/campaigns/${idToDelete}`, {
    method: 'DELETE',
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(delRes.status, 200);

  const getRes = await fetch(`${base}/api/outreach/campaigns/${idToDelete}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 404);
});
