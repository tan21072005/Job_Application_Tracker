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
  const ip = `127.0.3.${userCounter++}`;
  const res = await call('/auth/register', 'POST', {
    email,
    password: 'correct horse battery staple'
  }, '', { 'X-Forwarded-For': ip });
  assert.equal(res.status, 201);
  testUsers.push(res.value.id);
  return { id: res.value.id, cookie: res.cookie };
}

test('T05/F01: historical terminal edit and reapply edit do not trigger duplicate or reapply errors', async () => {
  const user = await registerUser('t05-f01');
  const sharedUrl = `https://example.com/careers/frontend-${crypto.randomUUID()}`;

  // 1. Create Application A with status 'Rejected'
  const appA = await call(
    '/applications',
    'POST',
    {
      company: 'Tech Corp',
      position: 'Senior Frontend',
      url: sharedUrl,
      source: 'CompanySite',
      jobCode: 'FE-01',
      status: 'Rejected',
      notes: 'Initial rejection'
    },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(appA.status, 201);
  assert.equal(appA.value.status, 'Rejected');

  // 2. Attempt to create Application B with same URL without confirmReapply -> 409 reapply_confirmation_required
  const unconfirmed = await call(
    '/applications',
    'POST',
    {
      company: 'Tech Corp',
      position: 'Senior Frontend',
      url: sharedUrl,
      source: 'CompanySite',
      jobCode: 'FE-01',
      status: 'Applied'
    },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(unconfirmed.status, 409);
  assert.equal(unconfirmed.value.code, 'reapply_confirmation_required');
  assert.equal(unconfirmed.value.existing.id, appA.value.id);

  // 3. Create Application B with confirmReapply: true -> 201
  const appB = await call(
    '/applications',
    'POST',
    {
      company: 'Tech Corp',
      position: 'Senior Frontend',
      url: sharedUrl,
      source: 'CompanySite',
      jobCode: 'FE-01',
      status: 'Applied',
      confirmReapply: true
    },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(appB.status, 201);
  assert.equal(appB.value.status, 'Applied');

  // 4. Edit Application A (Rejected): send full payload (including same url/source/jobCode) and update notes & status to 'Withdrawn'
  // Must NOT trigger duplicate or reapply confirmation!
  const editA = await call(
    `/applications/${appA.value.id}`,
    'PATCH',
    {
      company: 'Tech Corp',
      position: 'Senior Frontend',
      url: sharedUrl,
      source: 'CompanySite',
      jobCode: 'FE-01',
      notes: 'Updated historical feedback',
      nextAction: 'Revisit later',
      deadline: '2026-11-01T08:00:00Z',
      status: 'Withdrawn'
    },
    user.cookie,
    { 'If-Match': appA.etag }
  );
  assert.equal(editA.status, 200, JSON.stringify(editA.value));
  assert.equal(editA.value.version, 2);
  assert.equal(editA.value.notes, 'Updated historical feedback');
  assert.equal(editA.value.status, 'Withdrawn');

  // 5. Edit Application B (Reapplied/Active): send full payload and update notes & status to 'Interview'
  // Must NOT trigger reapply confirmation or duplicate error!
  const editB = await call(
    `/applications/${appB.value.id}`,
    'PATCH',
    {
      company: 'Tech Corp',
      position: 'Senior Frontend',
      url: sharedUrl,
      source: 'CompanySite',
      jobCode: 'FE-01',
      notes: 'First round scheduled',
      status: 'Interview'
    },
    user.cookie,
    { 'If-Match': appB.etag }
  );
  assert.equal(editB.status, 200, JSON.stringify(editB.value));
  assert.equal(editB.value.version, 2);
  assert.equal(editB.value.notes, 'First round scheduled');
  assert.equal(editB.value.status, 'Interview');

  // 6. Reactivate A while B is active -> MUST BE BLOCKED (409 duplicate)
  const reactivateA = await call(
    `/applications/${appA.value.id}`,
    'PATCH',
    {
      status: 'Applied'
    },
    user.cookie,
    { 'If-Match': editA.etag }
  );
  assert.equal(reactivateA.status, 409);
  assert.equal(reactivateA.value.code, 'duplicate');
  assert.equal(reactivateA.value.existing.id, appB.value.id);

  // 7. Move B to terminal ('Rejected')
  const rejectB = await call(
    `/applications/${appB.value.id}`,
    'PATCH',
    { status: 'Rejected' },
    user.cookie,
    { 'If-Match': editB.etag }
  );
  assert.equal(rejectB.status, 200);

  // 8. Now reactivate A without confirmReapply -> fails with 409 reapply_confirmation_required
  const reactivateAWithoutConfirm = await call(
    `/applications/${appA.value.id}`,
    'PATCH',
    { status: 'Applied' },
    user.cookie,
    { 'If-Match': editA.etag }
  );
  assert.equal(reactivateAWithoutConfirm.status, 409);
  assert.equal(reactivateAWithoutConfirm.value.code, 'reapply_confirmation_required');

  // 9. Reactivate A with confirmReapply: true -> succeeds with 200
  const reactivateAConfirmed = await call(
    `/applications/${appA.value.id}`,
    'PATCH',
    { status: 'Applied', confirmReapply: true },
    user.cookie,
    { 'If-Match': editA.etag }
  );
  assert.equal(reactivateAConfirmed.status, 200);
  assert.equal(reactivateAConfirmed.value.status, 'Applied');
  assert.equal(reactivateAConfirmed.value.version, 3);
});

test('T05: changing identity during PATCH enforces active uniqueness and reapply checks', async () => {
  const user = await registerUser('t05-identity');
  const url1 = `https://example.com/job/id-1-${crypto.randomUUID()}`;
  const url2 = `https://example.com/job/id-2-${crypto.randomUUID()}`;

  const app1 = await call(
    '/applications',
    'POST',
    { company: 'Company One', position: 'Dev', url: url1, status: 'Applied' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(app1.status, 201);

  const app2 = await call(
    '/applications',
    'POST',
    { company: 'Company Two', position: 'Dev', url: url2, status: 'Applied' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(app2.status, 201);

  // Changing app2's URL to app1's URL must fail with 409 duplicate
  const changeToDuplicate = await call(
    `/applications/${app2.value.id}`,
    'PATCH',
    { url: url1 },
    user.cookie,
    { 'If-Match': app2.etag }
  );
  assert.equal(changeToDuplicate.status, 409);
  assert.equal(changeToDuplicate.value.code, 'duplicate');
  assert.equal(changeToDuplicate.value.existing.id, app1.value.id);

  // Changing app2's source and jobCode to match another active application
  const app3 = await call(
    '/applications',
    'POST',
    { company: 'Company Three', position: 'Dev', source: 'LinkedIn', jobCode: 'LI-999', status: 'Applied' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(app3.status, 201);

  const changeSourceCode = await call(
    `/applications/${app2.value.id}`,
    'PATCH',
    { source: 'LinkedIn', jobCode: 'LI-999' },
    user.cookie,
    { 'If-Match': app2.etag }
  );
  assert.equal(changeSourceCode.status, 409);
  assert.equal(changeSourceCode.value.code, 'duplicate');
  assert.equal(changeSourceCode.value.existing.id, app3.value.id);
});

test('T05: URL OR source+code matching with active precedence and NFKC normalization', async () => {
  const user = await registerUser('t05-precedence');
  const activeUrl = `https://example.com/job/active-${crypto.randomUUID()}`;

  // Terminal app matching by source+code
  const terminalApp = await call(
    '/applications',
    'POST',
    { company: 'Terminal Co', position: 'Dev', source: 'TopCV', jobCode: 'CV-100', status: 'Rejected' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(terminalApp.status, 201);

  // Active app matching by URL
  const activeApp = await call(
    '/applications',
    'POST',
    { company: 'Active Co', position: 'Dev', url: activeUrl, status: 'Interview' },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(activeApp.status, 201);

  // New app matches BOTH terminalApp (by source+code) and activeApp (by URL)
  // Active precedence must return activeApp (409 duplicate) instead of terminalApp (reapply_confirmation_required)
  const candidate = await call(
    '/applications',
    'POST',
    {
      company: 'Candidate Co',
      position: 'Dev',
      url: activeUrl,
      source: 'TopCV',
      jobCode: 'CV-100',
      status: 'Applied'
    },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(candidate.status, 409);
  assert.equal(candidate.value.code, 'duplicate');
  assert.equal(candidate.value.existing.id, activeApp.value.id);

  // Unicode NFKC and case-insensitivity on source and jobCode
  // 'TopCV' / 'CV-１００' (full-width 100) vs 'topcv' / 'cv-100'
  const unicodeMatch = await call(
    '/applications',
    'POST',
    {
      company: 'Unicode Test',
      position: 'Dev',
      source: 'topcv',
      jobCode: 'cv-１００',
      status: 'Applied'
    },
    user.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(unicodeMatch.status, 409);
  assert.equal(unicodeMatch.value.code, 'reapply_confirmation_required');
  assert.equal(unicodeMatch.value.existing.id, terminalApp.value.id);
});

test('T05: ownership isolation prevents duplicate collisions across different users', async () => {
  const user1 = await registerUser('t05-owner1');
  const user2 = await registerUser('t05-owner2');
  const sharedUrl = `https://example.com/job/shared-${crypto.randomUUID()}`;

  // User 1 creates active application
  const app1 = await call(
    '/applications',
    'POST',
    { company: 'Shared Job', position: 'Engineer', url: sharedUrl, status: 'Applied' },
    user1.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(app1.status, 201);

  // User 2 creates active application with the EXACT same URL -> MUST SUCCEED (201)
  const app2 = await call(
    '/applications',
    'POST',
    { company: 'Shared Job', position: 'Engineer', url: sharedUrl, status: 'Applied' },
    user2.cookie,
    { 'Idempotency-Key': crypto.randomUUID() }
  );
  assert.equal(app2.status, 201);
  assert.notEqual(app1.value.id, app2.value.id);
});
