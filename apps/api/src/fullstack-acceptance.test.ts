import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { app, pool } from './server.ts';

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}/api`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';
const testUsers: string[] = [];

test.beforeEach(async () => {
  await pool.query("DELETE FROM rate_limits WHERE key IN ('127.0.0.1', '::1')");
});

test.after(async () => {
  for (const id of testUsers) await pool.query('DELETE FROM users WHERE id=$1', [id]);
  await pool.query("DELETE FROM rate_limits WHERE key IN ('127.0.0.1', '::1')");
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

let ipSubnet = 1;
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  headers: Record<string, string> = {}
) {
  const fwd = headers['X-Forwarded-For'] || `127.0.9.${ipSubnet++}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-Forwarded-For': fwd, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const value = res.status === 204 ? null : await res.json();
  return {
    status: res.status,
    value,
    cookie: res.headers.get('set-cookie')?.split(';')[0] || '',
    etag: res.headers.get('etag') || '',
    headers: res.headers
  };
}

test('T09 full-stack acceptance: happy path complete journey', async () => {
  const password = 'a very secure long passphrase 123';
  const email = `accept-${crypto.randomUUID()}@example.com`;

  // 1. Register
  const reg = await call('/auth/register', 'POST', { email, password });
  assert.equal(reg.status, 201);
  const cookie = reg.cookie;
  testUsers.push(reg.value.id);

  // 2. Auth me
  const me = await call('/auth/me', 'GET', undefined, cookie);
  assert.equal(me.status, 200);
  assert.equal(me.value.email, email);

  // 3. Create application
  const appDraft = {
    company: 'VNG Corporation',
    position: 'Fullstack Engineer',
    url: 'https://careers.vng.com.vn/job/12345?utm_campaign=hiring',
    source: 'VNG Careers',
    jobCode: 'VNG-FE-12345',
    location: 'TP. Hồ Chí Minh',
    workMode: 'Hybrid',
    appliedAt: '2026-10-19',
    salary: '35–45 triệu/tháng',
    notes: 'Chuẩn bị kỹ thuật React và Node.js',
    nextAction: 'Làm bài test online',
    deadline: '2026-10-25T09:00:00.000Z',
    status: 'Applied'
  };
  const createKey = crypto.randomUUID();
  const created = await call('/applications', 'POST', appDraft, cookie, { 'Idempotency-Key': createKey });
  assert.equal(created.status, 201);
  const appId = created.value.id;
  assert.equal(created.value.version, 1);
  assert.ok(created.etag.includes('v1'));
  assert.equal(created.value.status, 'Applied');

  // 4. QuickAction update next action & deadline
  const quickPatch = {
    nextAction: 'Nộp bài test',
    deadline: '2026-10-26T12:00:00.000Z'
  };
  const quickUpdated = await call(`/applications/${appId}`, 'PATCH', quickPatch, cookie, { 'If-Match': created.etag });
  assert.equal(quickUpdated.status, 200);
  assert.equal(quickUpdated.value.version, 2);
  assert.ok(quickUpdated.etag.includes('v2'));
  assert.equal(quickUpdated.value.nextAction, 'Nộp bài test');

  // 5. Create Interview Round 1 -> parent status syncs to Interview, version increments to 3
  const round1Key = crypto.randomUUID();
  const round1Draft = {
    title: 'Vòng 1 — Phỏng vấn kỹ thuật',
    at: '2026-10-28T07:30:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'Online',
    location: 'Google Meet',
    preparation: 'Ôn tập System Design và PostgreSQL',
    notes: 'Người phỏng vấn: Tech Lead',
    status: 'Scheduled'
  };
  const r1 = await call(`/applications/${appId}/interviews`, 'POST', round1Draft, cookie, {
    'Idempotency-Key': round1Key,
    'If-Match': quickUpdated.etag
  });
  assert.equal(r1.status, 201);
  assert.equal(r1.value.applicationVersion, 3);
  const round1Id = r1.value.id;

  const appAfterR1 = await call(`/applications/${appId}`, 'GET', undefined, cookie);
  assert.equal(appAfterR1.value.version, 3);
  assert.equal(appAfterR1.value.status, 'Interview'); // Synced from Applied to Interview!
  assert.equal(appAfterR1.value.interviews.length, 1);

  // 6. Create Interview Round 2 -> parent version increments to 4
  const round2Key = crypto.randomUUID();
  const round2Draft = {
    title: 'Vòng 2 — Phỏng vấn văn hóa',
    at: '2026-10-30T09:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'On-site',
    location: 'VNG Campus Q7',
    preparation: 'Tìm hiểu giá trị cốt lõi',
    notes: '',
    status: 'Scheduled'
  };
  const r2 = await call(`/applications/${appId}/interviews`, 'POST', round2Draft, cookie, {
    'Idempotency-Key': round2Key,
    'If-Match': appAfterR1.etag
  });
  assert.equal(r2.status, 201);
  assert.equal(r2.value.applicationVersion, 4);
  const round2Id = r2.value.id;

  // 7. Reschedule Round 1 (status-only / reschedule-only partial patch) -> parent version increments to 5
  const reschedulePatch = {
    at: '2026-10-29T08:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh'
  };
  const rescheduled = await call(`/interviews/${round1Id}`, 'PATCH', reschedulePatch, cookie, { 'If-Match': r2.etag });
  assert.equal(rescheduled.status, 200);
  assert.equal(rescheduled.value.at, '2026-10-29T08:00:00Z');
  assert.equal(rescheduled.value.title, 'Vòng 1 — Phỏng vấn kỹ thuật'); // Omitted fields strictly preserved!
  assert.equal(rescheduled.value.preparation, 'Ôn tập System Design và PostgreSQL');
  assert.equal(rescheduled.value.applicationVersion, 5);

  // 8. Filter and search
  const querySearch = await call('/applications?q=VNG', 'GET', undefined, cookie);
  assert.equal(querySearch.status, 200);
  assert.equal(querySearch.value.length, 1);

  const statusFilter = await call('/applications?status=Interview', 'GET', undefined, cookie);
  assert.equal(statusFilter.status, 200);
  assert.equal(statusFilter.value.length, 1);

  // 9. Update application to terminal status 'Offer' with If-Match 5 -> version becomes 6
  const offerUpdate = await call(`/applications/${appId}`, 'PATCH', { status: 'Offer' }, cookie, { 'If-Match': `"app:${appId}:v5"` });
  assert.equal(offerUpdate.status, 200);
  assert.equal(offerUpdate.value.version, 6);
  assert.equal(offerUpdate.value.status, 'Offer');

  // 10. Create Round 3 while parent is Offer -> parent status remains 'Offer' (terminal status retained)
  const round3Draft = {
    title: 'Trao đổi chế độ đãi ngộ',
    at: '2026-11-02T03:00:00.000Z',
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'Online',
    status: 'Scheduled'
  };
  const r3 = await call(`/applications/${appId}/interviews`, 'POST', round3Draft, cookie, {
    'Idempotency-Key': crypto.randomUUID(),
    'If-Match': offerUpdate.etag
  });
  assert.equal(r3.status, 201);
  assert.equal(r3.value.applicationVersion, 7);

  const appAfterR3 = await call(`/applications/${appId}`, 'GET', undefined, cookie);
  assert.equal(appAfterR3.value.status, 'Offer'); // Strictly preserved Offer status!
  assert.equal(appAfterR3.value.interviews.length, 3);

  // 11. Delete application with If-Match 7 -> cascade deletes all 3 interviews
  const del = await call(`/applications/${appId}`, 'DELETE', undefined, cookie, { 'If-Match': `"app:${appId}:v7"` });
  assert.equal(del.status, 204);

  const checkApp = await call(`/applications/${appId}`, 'GET', undefined, cookie);
  assert.equal(checkApp.status, 404);

  const checkDb = await pool.query('SELECT * FROM interviews WHERE application_id=$1', [appId]);
  assert.equal(checkDb.rowCount, 0);

  const patchDeletedRound = await call(`/interviews/${round1Id}`, 'PATCH', { status: 'Completed' }, cookie, { 'If-Match': `"app:${appId}:v7"` });
  assert.equal(patchDeletedRound.status, 404);
  assert.equal(patchDeletedRound.value.code, 'not_found');

  // 12. Logout
  const logout = await call('/auth/logout', 'POST', undefined, cookie);
  assert.equal(logout.status, 204);

  const meAfterLogout = await call('/auth/me', 'GET', undefined, cookie);
  assert.equal(meAfterLogout.status, 401);
});

test('T09 full-stack acceptance: security isolation, 412/428 preconditions, and duplicate lifecycle', async () => {
  const password = 'another very strong password 456';
  const userA = await call('/auth/register', 'POST', { email: `user-a-${crypto.randomUUID()}@example.com`, password });
  const userB = await call('/auth/register', 'POST', { email: `user-b-${crypto.randomUUID()}@example.com`, password });
  testUsers.push(userA.value.id, userB.value.id);

  // User A creates application
  const appA = await call('/applications', 'POST', {
    company: 'Acme Corp',
    position: 'Backend Dev',
    url: 'https://acme.com/jobs/dev-1',
    source: 'Acme Careers',
    jobCode: 'DEV-1',
    status: 'Applied'
  }, userA.cookie, { 'Idempotency-Key': crypto.randomUUID() });
  assert.equal(appA.status, 201);
  const appAId = appA.value.id;

  // Precondition: Missing If-Match returns 428
  const missingIfMatch = await call(`/applications/${appAId}`, 'PATCH', { notes: 'hello' }, userA.cookie);
  assert.equal(missingIfMatch.status, 428);

  // Precondition: Stale If-Match returns 412
  const staleIfMatch = await call(`/applications/${appAId}`, 'PATCH', { notes: 'hello' }, userA.cookie, { 'If-Match': '"app:stale:v999"' });
  assert.equal(staleIfMatch.status, 412);
  assert.equal(staleIfMatch.value.code, 'precondition_failed');

  // Ownership isolation: User B cannot view, modify, or delete User A's application
  const bViewA = await call(`/applications/${appAId}`, 'GET', undefined, userB.cookie);
  assert.equal(bViewA.status, 404);

  const bPatchA = await call(`/applications/${appAId}`, 'PATCH', { notes: 'hacked' }, userB.cookie, { 'If-Match': appA.etag });
  assert.equal(bPatchA.status, 404);

  const bDeleteA = await call(`/applications/${appAId}`, 'DELETE', undefined, userB.cookie, { 'If-Match': appA.etag });
  assert.equal(bDeleteA.status, 404);

  // Reapply flow for User A:
  // Transition A to Rejected
  const rejectA = await call(`/applications/${appAId}`, 'PATCH', { status: 'Rejected' }, userA.cookie, { 'If-Match': appA.etag });
  assert.equal(rejectA.status, 200);
  assert.equal(rejectA.value.version, 2);

  // Attempt to create reapply application without confirmReapply -> 409 reapply_confirmation_required
  const reapplyWithoutConfirm = await call('/applications', 'POST', {
    company: 'Acme Corp',
    position: 'Backend Dev 2',
    url: 'https://acme.com/jobs/dev-1',
    status: 'Applied'
  }, userA.cookie, { 'Idempotency-Key': crypto.randomUUID() });
  assert.equal(reapplyWithoutConfirm.status, 409);
  assert.equal(reapplyWithoutConfirm.value.code, 'reapply_confirmation_required');
  assert.equal(reapplyWithoutConfirm.value.existing.id, appAId);

  // Create reapply with confirmReapply: true -> 201 Created
  const reapplyConfirmed = await call('/applications', 'POST', {
    company: 'Acme Corp',
    position: 'Backend Dev 2',
    url: 'https://acme.com/jobs/dev-1',
    status: 'Applied',
    confirmReapply: true
  }, userA.cookie, { 'Idempotency-Key': crypto.randomUUID() });
  assert.equal(reapplyConfirmed.status, 201);
  const appA2Id = reapplyConfirmed.value.id;

  // Reactivating A from Rejected to Applied while A2 is active -> 409 duplicate
  const reactivateA = await call(`/applications/${appAId}`, 'PATCH', { status: 'Applied' }, userA.cookie, { 'If-Match': rejectA.etag });
  assert.equal(reactivateA.status, 409);
  assert.equal(reactivateA.value.code, 'duplicate');
  assert.equal(reactivateA.value.existing.id, appA2Id);

  // Idempotency replay with same key returns 201 + Idempotency-Replayed: true
  const idemKey = crypto.randomUUID();
  const firstSend = await call('/applications', 'POST', {
    company: 'Idem Co',
    position: 'Dev',
    status: 'Applied'
  }, userA.cookie, { 'Idempotency-Key': idemKey });
  assert.equal(firstSend.status, 201);

  const replayed = await call('/applications', 'POST', {
    company: 'Idem Co',
    position: 'Dev',
    status: 'Applied'
  }, userA.cookie, { 'Idempotency-Key': idemKey });
  assert.equal(replayed.status, 200);
  assert.equal(replayed.headers.get('idempotency-replayed'), 'true');
  assert.equal(replayed.value.id, firstSend.value.id);

  // Replay with different intent returns 422 idempotency_mismatch
  const conflictIntent = await call('/applications', 'POST', {
    company: 'Different Intent Co',
    position: 'Dev',
    status: 'Applied'
  }, userA.cookie, { 'Idempotency-Key': idemKey });
  assert.equal(conflictIntent.status, 422);
  assert.equal(conflictIntent.value.code, 'idempotency_mismatch');
});
