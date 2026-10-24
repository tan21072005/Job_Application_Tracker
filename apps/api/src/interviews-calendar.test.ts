import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { InterviewAgendaItemDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 240;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `cal_test_${randomUUID()}@example.com`;
  const userPassword = `Pass_${randomUUID().slice(0, 12)}!`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.11.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: userPassword })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

test('Interviews API: lists cross-application agenda and exports valid iCalendar .ics file', async () => {
  const user = await registerUser();

  const unauthRes = await fetch(`${base}/api/interviews`, {
    headers: { Origin: origin }
  });
  assert.equal(unauthRes.status, 401);

  const emptyRes = await fetch(`${base}/api/interviews`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(emptyRes.status, 200);
  const emptyItems = await emptyRes.json() as InterviewAgendaItemDTO[];
  assert.equal(emptyItems.length, 0);

  const appRes = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: user.cookie,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      company: 'Tech Solutions Corp',
      position: 'Senior Cloud Architect',
      status: 'Interview'
    })
  });
  assert.equal(appRes.status, 201);
  const createdApp = await appRes.json() as { id: string; version: number };

  const round1Date = new Date(Date.now() + 86400000).toISOString();
  const round2Date = new Date(Date.now() + 172800000).toISOString();

  const round1Res = await fetch(`${base}/api/applications/${createdApp.id}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: user.cookie,
      'Idempotency-Key': randomUUID(),
      'If-Match': `"app:${createdApp.id}:v${createdApp.version}"`
    },
    body: JSON.stringify({
      title: 'Vòng Kỹ thuật 1 (System Design)',
      at: round2Date,
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online',
      location: 'https://meet.google.com/tech-arch-1',
      notes: 'Xem lại tài liệu Cloud Native & microservices'
    })
  });
  assert.equal(round1Res.status, 201);

  const appAfterRound1 = await (await fetch(`${base}/api/applications/${createdApp.id}`, {
    headers: { Origin: origin, Cookie: user.cookie }
  })).json() as { version: number };

  const round2Res = await fetch(`${base}/api/applications/${createdApp.id}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: user.cookie,
      'Idempotency-Key': randomUUID(),
      'If-Match': `"app:${createdApp.id}:v${appAfterRound1.version}"`
    },
    body: JSON.stringify({
      title: 'Vòng Sàng lọc HR',
      at: round1Date,
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Phone',
      location: '0912345678',
      notes: 'Trao đổi về chế độ và định hướng phát triển'
    })
  });
  assert.equal(round2Res.status, 201);

  const agendaRes = await fetch(`${base}/api/interviews`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(agendaRes.status, 200);
  const agenda = await agendaRes.json() as InterviewAgendaItemDTO[];
  assert.equal(agenda.length, 2);

  assert.equal(agenda[0].title, 'Vòng Sàng lọc HR');
  assert.equal(agenda[0].company, 'Tech Solutions Corp');
  assert.equal(agenda[0].position, 'Senior Cloud Architect');

  assert.equal(agenda[1].title, 'Vòng Kỹ thuật 1 (System Design)');
  assert.equal(agenda[1].company, 'Tech Solutions Corp');

  const exportRes = await fetch(`${base}/api/interviews/export.ics`, {
    headers: { Origin: origin, Cookie: user.cookie }
  });
  assert.equal(exportRes.status, 200);
  assert.ok(exportRes.headers.get('content-type')?.includes('text/calendar'));
  assert.ok(exportRes.headers.get('content-disposition')?.includes('jobtrack-interviews.ics'));

  const icsBody = await exportRes.text();
  assert.ok(icsBody.startsWith('BEGIN:VCALENDAR'));
  assert.ok(icsBody.includes('Vòng Sàng lọc HR'));
  assert.ok(icsBody.includes('Vòng Kỹ thuật 1 (System Design)'));
  assert.ok(icsBody.includes('Tech Solutions Corp'));
  assert.ok(icsBody.endsWith('END:VCALENDAR\r\n'));
});

test('Interviews API: enforces cross-user data isolation', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const appA = await (await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      company: 'User A Secret Tech',
      position: 'Staff Engineer',
      status: 'Interview'
    })
  })).json() as { id: string; version: number };

  await fetch(`${base}/api/applications/${appA.id}/interviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie,
      'If-Match': `"app:${appA.id}:v${appA.version}"`
    },
    body: JSON.stringify({
      title: 'Secret Round',
      at: new Date(Date.now() + 86400000).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online'
    })
  });

  const bAgenda = await (await fetch(`${base}/api/interviews`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  })).json() as InterviewAgendaItemDTO[];

  assert.equal(bAgenda.length, 0);

  const bIcs = await (await fetch(`${base}/api/interviews/export.ics`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  })).text();

  assert.equal(bIcs.includes('User A Secret Tech'), false);
  assert.equal(bIcs.includes('Secret Round'), false);
});
