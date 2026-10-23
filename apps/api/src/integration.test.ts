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

const draft = {
  company: 'Example Co',
  position: 'Frontend Engineer',
  url: 'https://example.com/job?utm_source=test&id=42',
  source: 'Careers',
  jobCode: 'FE-42',
  location: 'Hà Nội',
  workMode: 'Hybrid',
  appliedAt: '2026-10-19',
  salary: '',
  notes: '',
  nextAction: 'Chuẩn bị CV',
  deadline: '2026-10-20T04:00:00.000Z',
  status: 'Applied'
};

let ipCount = 1;
async function call(
  path: string,
  method = 'GET',
  body?: unknown,
  cookie = '',
  headers: Record<string, string> = {}
) {
  const fwd = headers['X-Forwarded-For'] || `127.0.2.${ipCount++}`;
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

test('auth, ownership, CRUD, duplicate, idempotency, ETag, interviews and logout', async () => {
  const password = 'correct horse battery staple';
  const a = await call('/auth/register', 'POST', { email: `a-${crypto.randomUUID()}@example.com`, password });
  assert.equal(a.status, 201);
  assert.ok(a.cookie);
  testUsers.push(a.value.id);

  const b = await call('/auth/register', 'POST', { email: `b-${crypto.randomUUID()}@example.com`, password });
  assert.equal(b.status, 201);
  testUsers.push(b.value.id);

  assert.equal((await call('/auth/me', 'GET', undefined, a.cookie)).status, 200);

  const key = crypto.randomUUID();
  const created = await call('/applications', 'POST', draft, a.cookie, { 'Idempotency-Key': key });
  assert.equal(created.status, 201, JSON.stringify(created.value));
  assert.equal(created.value.version, 1);
  assert.equal(created.value.deadline, '2026-10-20T04:00:00Z');
  // Wire contract: empty optional fields return null
  assert.equal(created.value.salary, null);
  assert.equal(created.value.notes, null);
  assert.ok(created.value.createdAt);
  assert.ok(created.value.updatedAt);

  // Idempotency replay returns 200 and Idempotency-Replayed: true header
  const replay = await call('/applications', 'POST', draft, a.cookie, { 'Idempotency-Key': key });
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  assert.equal(replay.value.id, created.value.id);

  // Idempotency conflict with different payload
  const mismatch = await call('/applications', 'POST', { ...draft, company: 'Changed' }, a.cookie, {
    'Idempotency-Key': key
  });
  assert.equal(mismatch.status, 422);
  assert.equal(mismatch.value.code, 'idempotency_mismatch');

  // Duplicate active application
  const dup = await call('/applications', 'POST', draft, a.cookie, { 'Idempotency-Key': crypto.randomUUID() });
  assert.equal(dup.status, 409);
  assert.equal(dup.value.code, 'duplicate');
  assert.ok(dup.value.existing);
  assert.equal(dup.value.existing.id, created.value.id);

  // Unknown fields rejected with 422 and structured fields error map
  const unknownField = await call(
    '/applications',
    'POST',
    { ...draft, unknown: 'unexpected' },
    a.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(unknownField.status, 422);
  assert.equal(unknownField.value.code, 'invalid_request');
  assert.ok(unknownField.value.requestId);
  assert.ok(unknownField.value.fields.unknown);

  // Strict invalid calendar date rejected
  const badDate = await call(
    '/applications',
    'POST',
    { ...draft, appliedAt: '2026-02-30' },
    a.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(badDate.status, 422);
  assert.ok(badDate.value.fields.appliedAt);

  // Ownership isolation
  assert.equal((await call(`/applications/${created.value.id}`, 'GET', undefined, b.cookie)).status, 404);
  assert.equal((await call('/applications', 'GET', undefined, b.cookie)).value.length, 0);

  // List query filtering and sorting
  const listByQ = await call('/applications?q=Example', 'GET', undefined, a.cookie);
  assert.equal(listByQ.status, 200);
  assert.equal(listByQ.value.length, 1);

  const listByBadSort = await call('/applications?sort=invalid_sort', 'GET', undefined, a.cookie);
  assert.equal(listByBadSort.status, 422);
  assert.ok(listByBadSort.value.fields.sort);

  // Concurrency control with ETag / If-Match
  assert.equal((await call(`/applications/${created.value.id}`, 'PATCH', { ...draft, notes: 'New' }, a.cookie)).status, 428);
  const updated = await call(`/applications/${created.value.id}`, 'PATCH', { notes: 'New' }, a.cookie, {
    'If-Match': created.etag
  });
  assert.equal(updated.status, 200, JSON.stringify(updated.value));
  assert.equal(updated.value.version, 2);
  assert.equal(updated.value.notes, 'New');

  assert.equal(
    (await call(`/applications/${created.value.id}`, 'PATCH', draft, a.cookie, { 'If-Match': created.etag })).status,
    412
  );

  // Interview create and validation
  const badTimezone = await call(
    `/applications/${created.value.id}/interviews`,
    'POST',
    {
      title: 'Technical',
      at: '2026-10-23T02:00:00Z',
      timezone: '+07:00', // Raw offset zone not allowed
      format: 'Online'
    },
    a.cookie,
    { 'If-Match': updated.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(badTimezone.status, 422);
  assert.ok(badTimezone.value.fields.timezone);

  const round = await call(
    `/applications/${created.value.id}/interviews`,
    'POST',
    {
      title: 'Technical',
      at: new Date(Date.now() + 86400000).toISOString(),
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online',
      location: 'https://meet.example.com',
      preparation: '',
      notes: '',
      status: 'Scheduled'
    },
    a.cookie,
    { 'If-Match': updated.etag, 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(round.status, 201, JSON.stringify(round.value));

  const afterRound = await call(`/applications/${created.value.id}`, 'GET', undefined, a.cookie);
  assert.equal(afterRound.value.version, 3);
  assert.equal(afterRound.value.status, 'Interview');
  assert.equal(afterRound.value.interviews.length, 1);

  // Dashboard wire DTO includes asOf
  const dashboard = await call('/dashboard', 'GET', undefined, a.cookie);
  assert.equal(dashboard.value.total, 1);
  assert.equal(dashboard.value.offers, 0);
  assert.equal(dashboard.value.upcoming, 1);
  assert.equal(dashboard.value.response, 100);
  assert.ok(dashboard.value.asOf);

  // Delete interview cascades parent version
  assert.equal(
    (await call(`/interviews/${round.value.id}`, 'DELETE', undefined, a.cookie, { 'If-Match': afterRound.etag })).status,
    204
  );
  const afterDelete = await call(`/applications/${created.value.id}`, 'GET', undefined, a.cookie);
  assert.equal(afterDelete.value.interviews.length, 0);
  assert.equal(afterDelete.value.version, 4);

  // Delete application
  assert.equal(
    (await call(`/applications/${created.value.id}`, 'DELETE', undefined, a.cookie, { 'If-Match': afterDelete.etag })).status,
    204
  );

  // Logout
  assert.equal((await call('/auth/logout', 'POST', undefined, a.cookie)).status, 204);
  assert.equal((await call('/auth/logout', 'POST')).status, 204);
  assert.equal((await call('/auth/me', 'GET', undefined, a.cookie)).status, 401);
  assert.equal((await call('/auth/me', 'GET', undefined, b.cookie)).status, 200);
});

test('reapplication requires confirmation and Origin is enforced', async () => {
  const account = await call('/auth/register', 'POST', {
    email: `reapply-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(account.status, 201);
  testUsers.push(account.value.id);

  const first = await call('/applications', 'POST', { ...draft, status: 'Rejected' }, account.cookie, {
    'Idempotency-Key': crypto.randomUUID()
  });
  assert.equal(first.status, 201);

  const unconfirmed = await call('/applications', 'POST', draft, account.cookie, {
    'Idempotency-Key': crypto.randomUUID()
  });
  assert.equal(unconfirmed.status, 409);
  assert.equal(unconfirmed.value.code, 'reapply_confirmation_required');
  assert.ok(unconfirmed.value.existing);

  const second = await call('/applications', 'POST', { ...draft, confirmReapply: true }, account.cookie, {
    'Idempotency-Key': crypto.randomUUID()
  });
  assert.equal(second.status, 201);

  const duplicateActive = await call('/applications', 'POST', { ...draft, confirmReapply: true }, account.cookie, {
    'Idempotency-Key': crypto.randomUUID()
  });
  assert.equal(duplicateActive.status, 409);

  const crossOrigin = await fetch(`${base}/applications`, {
    method: 'POST',
    headers: {
      Origin: 'https://not-jobtrack.example',
      Cookie: account.cookie,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(draft)
  });
  assert.equal(crossOrigin.status, 403);
});

test('concurrent creates keep one active application and safely replay a key', async () => {
  const account = await call('/auth/register', 'POST', {
    email: `race-${crypto.randomUUID()}@example.com`,
    password: 'correct horse battery staple'
  });
  assert.equal(account.status, 201);
  testUsers.push(account.value.id);

  const unique = { ...draft, url: `https://example.com/race/${crypto.randomUUID()}`, jobCode: crypto.randomUUID() };
  const [first, second] = await Promise.all([
    call('/applications', 'POST', unique, account.cookie, { 'Idempotency-Key': crypto.randomUUID() }),
    call('/applications', 'POST', unique, account.cookie, { 'Idempotency-Key': crypto.randomUUID() })
  ]);
  assert.deepEqual([first.status, second.status].sort(), [201, 409]);

  const replayInput = { ...draft, url: `https://example.com/replay/${crypto.randomUUID()}`, jobCode: crypto.randomUUID() };
  const key = crypto.randomUUID();
  const [created, replay] = await Promise.all([
    call('/applications', 'POST', replayInput, account.cookie, { 'Idempotency-Key': key }),
    call('/applications', 'POST', replayInput, account.cookie, { 'Idempotency-Key': key })
  ]);
  assert.deepEqual([created.status, replay.status].sort(), [200, 201]);
  assert.equal(created.value.id, replay.value.id);
});
