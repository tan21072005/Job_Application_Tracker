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

async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  headers: Record<string, string> = {}
) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', ...headers },
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

let userCounter = 1;
async function registerUser(prefix: string) {
  const email = `${prefix}-${crypto.randomUUID()}@example.com`;
  const ip = `127.0.4.${userCounter++}`;
  const res = await call('/auth/register', 'POST', {
    email,
    password: 'correct horse battery staple'
  }, '', { 'X-Forwarded-For': ip });
  assert.equal(res.status, 201);
  testUsers.push(res.value.id);
  return { id: res.value.id, cookie: res.cookie };
}

test('T06/F02: partial interview PATCH supports status-only and reschedule-only with omitted fields preserved', async () => {
  const user = await registerUser('t06-partial');

  // 1. Create parent application
  const appRes = await call(
    '/applications',
    'POST',
    { company: 'Acme Corp', position: 'Backend Engineer', status: 'Applied' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(appRes.status, 201);
  const parentId = appRes.value.id;
  assert.equal(appRes.value.version, 1);

  // 2. Create interview with full details
  const roundCreate = await call(
    `/applications/${parentId}/interviews`,
    'POST',
    {
      title: 'Technical Round 1',
      at: '2026-10-25T09:00:00Z',
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online',
      location: 'Google Meet',
      preparation: 'Review PostgreSQL and Express',
      notes: 'Initial notes',
      status: 'Scheduled'
    },
    user.cookie,
    { 'If-Match': appRes.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(roundCreate.status, 201);
  assert.equal(roundCreate.value.applicationVersion, 2);
  assert.equal(roundCreate.etag, `"app:${parentId}:v2"`);
  const roundId = roundCreate.value.id;

  // Verify parent application status became 'Interview' and version became 2
  const parentV2 = await call(`/applications/${parentId}`, 'GET', undefined, user.cookie);
  assert.equal(parentV2.value.status, 'Interview');
  assert.equal(parentV2.value.version, 2);

  // 3. Status-only PATCH: { status: 'Completed' }
  const statusPatch = await call(
    `/interviews/${roundId}`,
    'PATCH',
    { status: 'Completed' },
    user.cookie,
    { 'If-Match': parentV2.etag }
  );
  assert.equal(statusPatch.status, 200);
  assert.equal(statusPatch.value.status, 'Completed');
  // Omitted fields must be preserved!
  assert.equal(statusPatch.value.title, 'Technical Round 1');
  assert.equal(statusPatch.value.at, '2026-10-25T09:00:00Z');
  assert.equal(statusPatch.value.timezone, 'Asia/Ho_Chi_Minh');
  assert.equal(statusPatch.value.format, 'Online');
  assert.equal(statusPatch.value.location, 'Google Meet');
  assert.equal(statusPatch.value.preparation, 'Review PostgreSQL and Express');
  assert.equal(statusPatch.value.notes, 'Initial notes');
  assert.equal(statusPatch.value.applicationVersion, 3);
  assert.equal(statusPatch.etag, `"app:${parentId}:v3"`);

  // 4. Reschedule-only PATCH: { at, timezone }
  const reschedulePatch = await call(
    `/interviews/${roundId}`,
    'PATCH',
    { at: '2026-10-28T14:30:00Z', timezone: 'UTC' },
    user.cookie,
    { 'If-Match': statusPatch.etag }
  );
  assert.equal(reschedulePatch.status, 200);
  assert.equal(reschedulePatch.value.at, '2026-10-28T14:30:00Z');
  assert.equal(reschedulePatch.value.timezone, 'UTC');
  // Status remains 'Completed' from previous step
  assert.equal(reschedulePatch.value.status, 'Completed');
  assert.equal(reschedulePatch.value.title, 'Technical Round 1');
  assert.equal(reschedulePatch.value.applicationVersion, 4);

  // 5. Empty PATCH must be rejected with 422
  const emptyPatch = await call(
    `/interviews/${roundId}`,
    'PATCH',
    {},
    user.cookie,
    { 'If-Match': reschedulePatch.etag }
  );
  assert.equal(emptyPatch.status, 422);
  assert.equal(emptyPatch.value.code, 'invalid_request');

  // 6. Unknown fields rejected with 422
  const unknownField = await call(
    `/interviews/${roundId}`,
    'PATCH',
    { unexpected: true },
    user.cookie,
    { 'If-Match': reschedulePatch.etag }
  );
  assert.equal(unknownField.status, 422);
});

test('T06: second round creation synchronizes parent and respects Offer/Rejected/Withdrawn terminal status', async () => {
  const user = await registerUser('t06-terminal-parent');

  // Case A: Creating second round on active parent keeps 'Interview'
  const appA = await call(
    '/applications',
    'POST',
    { company: 'Alpha Inc', position: 'Lead', status: 'Saved' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(appA.status, 201);

  const r1 = await call(
    `/applications/${appA.value.id}/interviews`,
    'POST',
    { title: 'Round 1', at: '2026-11-01T10:00:00Z', timezone: 'Asia/Ho_Chi_Minh', format: 'Online' },
    user.cookie,
    { 'If-Match': appA.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(r1.status, 201);

  const r2 = await call(
    `/applications/${appA.value.id}/interviews`,
    'POST',
    { title: 'Round 2', at: '2026-11-05T10:00:00Z', timezone: 'Asia/Ho_Chi_Minh', format: 'Online' },
    user.cookie,
    { 'If-Match': r1.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(r2.status, 201);
  const appAAfterR2 = await call(`/applications/${appA.value.id}`, 'GET', undefined, user.cookie);
  assert.equal(appAAfterR2.value.status, 'Interview');
  assert.equal(appAAfterR2.value.version, 3);
  assert.equal(appAAfterR2.value.interviews.length, 2);

  // Case B: Terminal statuses Offer/Rejected/Withdrawn are NOT changed when a new interview round is created
  for (const terminalStatus of ['Offer', 'Rejected', 'Withdrawn']) {
    const termApp = await call(
      '/applications',
      'POST',
      { company: `Terminal ${terminalStatus}`, position: 'Engineer', status: terminalStatus },
      user.cookie,
      { 'Idempotency-Key': crypto.randomUUID() }
    );
    assert.equal(termApp.status, 201);
    assert.equal(termApp.value.status, terminalStatus);

    const termRound = await call(
      `/applications/${termApp.value.id}/interviews`,
      'POST',
      { title: `Interview for ${terminalStatus}`, at: '2026-11-10T10:00:00Z', timezone: 'UTC', format: 'Online' },
      user.cookie,
      { 'If-Match': termApp.etag, 'Idempotency-Key': crypto.randomUUID() }
    );
    assert.equal(termRound.status, 201);

    const termAppAfter = await call(`/applications/${termApp.value.id}`, 'GET', undefined, user.cookie);
    // Parent status must NOT be downgraded to 'Interview'!
    assert.equal(termAppAfter.value.status, terminalStatus);
    assert.equal(termAppAfter.value.version, 2);
  }
});

test('T06: precondition control (428/412), idempotency replay, ownership isolation, and cascade', async () => {
  const user1 = await registerUser('t06-ctrl-1');
  const user2 = await registerUser('t06-ctrl-2');

  const appRes = await call(
    '/applications',
    'POST',
    { company: 'Control Corp', position: 'Staff', status: 'Applied' },
    user1.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(appRes.status, 201);
  const appId = appRes.value.id;

  // 1. Missing If-Match on interview create -> 428
  const missingPrecond = await call(
    `/applications/${appId}/interviews`,
    'POST',
    { title: 'No If-Match', at: '2026-11-01T10:00:00Z', timezone: 'UTC', format: 'Online' },
    user1.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(missingPrecond.status, 428);

  // 2. Stale If-Match on interview create -> 412
  const stalePrecond = await call(
    `/applications/${appId}/interviews`,
    'POST',
    { title: 'Stale', at: '2026-11-01T10:00:00Z', timezone: 'UTC', format: 'Online' },
    user1.cookie,
    { 'If-Match': `"app:${appId}:v999"`, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(stalePrecond.status, 412);

  // 3. Valid create with Idempotency Key
  const createKey = crypto.randomUUID();
  const validCreate = await call(
    `/applications/${appId}/interviews`,
    'POST',
    { title: 'Valid Round', at: '2026-11-01T10:00:00Z', timezone: 'America/New_York', format: 'Online' },
    user1.cookie,
    { 'If-Match': appRes.etag, 'Idempotency-Key': createKey }
  );
  assert.equal(validCreate.status, 201);
  const roundId = validCreate.value.id;

  // 4. Same key idempotency replay -> returns 200, Idempotency-Replayed header, no new round
  const replay = await call(
    `/applications/${appId}/interviews`,
    'POST',
    { title: 'Valid Round', at: '2026-11-01T10:00:00Z', timezone: 'America/New_York', format: 'Online' },
    user1.cookie,
    { 'If-Match': appRes.etag, 'Idempotency-Key': createKey }
  );
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  assert.equal(replay.value.id, roundId);

  // 5. Ownership isolation: user2 cannot access or mutate user1's interview
  assert.equal((await call(`/interviews/${roundId}`, 'PATCH', { status: 'Completed' }, user2.cookie, { 'If-Match': validCreate.etag })).status, 404);
  assert.equal((await call(`/interviews/${roundId}`, 'DELETE', undefined, user2.cookie, { 'If-Match': validCreate.etag })).status, 404);

  // 6. Delete interview: parent version increments by 1, interview is deleted
  const deleteRes = await call(
    `/interviews/${roundId}`,
    'DELETE',
    undefined,
    user1.cookie,
    { 'If-Match': validCreate.etag }
  );
  assert.equal(deleteRes.status, 204);
  assert.equal(deleteRes.etag, `"app:${appId}:v3"`);

  const appAfterDelete = await call(`/applications/${appId}`, 'GET', undefined, user1.cookie);
  assert.equal(appAfterDelete.value.version, 3);
  assert.equal(appAfterDelete.value.interviews.length, 0);

  // 7. Cascade deletion: deleting application deletes all interviews in DB
  const round2 = await call(
    `/applications/${appId}/interviews`,
    'POST',
    { title: 'Cascade Test', at: '2026-11-02T10:00:00Z', timezone: 'UTC', format: 'Online' },
    user1.cookie,
    { 'If-Match': appAfterDelete.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(round2.status, 201);
  const round2Id = round2.value.id;

  // Delete application
  const appDelete = await call(`/applications/${appId}`, 'DELETE', undefined, user1.cookie, { 'If-Match': round2.etag });
  assert.equal(appDelete.status, 204);

  // Verify interview is gone from DB
  const checkDb = await pool.query('SELECT * FROM interviews WHERE id=$1', [round2Id]);
  assert.equal(checkDb.rowCount, 0);
});
