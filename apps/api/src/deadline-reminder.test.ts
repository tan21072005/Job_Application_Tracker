import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, deadlineReminderService } from './server.ts';
import { selectBucket } from './services/deadline-reminder-service.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

process.env.MAIL_TRANSPORT = 'console';
process.env.MAIL_ALLOW_CONSOLE = '1';

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = process.env.APP_ORIGIN || 'http://127.0.0.1:64364';

const password = 'MatKhauNhacViec123!@#';
let forwardedIp = 6300;

const call = async (path: string, options: RequestInit & { cookie?: string } = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.88.${forwardedIp++}`,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {})
    }
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await response.text();
  let body: unknown = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: response.status, body, cookie, headers: response.headers };
};

const register = async () => {
  const email = `rem_${randomUUID()}@example.com`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assert.equal(result.status, 201);
  const id = (result.body as { id: string }).id;
  testUsers.push(id);
  return { id, email, cookie: result.cookie };
};

const reminderTimeZone = process.env.REMINDER_TIMEZONE || 'Asia/Ho_Chi_Minh';

const localDateParts = (instant: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: reminderTimeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(instant);
  const pick = (type: string) => Number(parts.find(part => part.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day'), hour: pick('hour'), minute: pick('minute') };
};

const instantAtLocalHour = (year: number, month: number, day: number, hour: number): Date => {
  let guess = Date.UTC(year, month - 1, day, hour);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = localDateParts(new Date(guess));
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const desired = Date.UTC(year, month - 1, day, hour);
    guess += desired - observed;
  }
  return new Date(guess);
};

const createDeadline = async (cookie: string, daysFromToday: number, nextAction = 'Gửi email follow-up') => {
  const today = localDateParts(new Date());
  const targetMidday = Date.UTC(today.year, today.month - 1, today.day + daysFromToday, 12);
  const target = localDateParts(new Date(targetMidday));
  const deadline = instantAtLocalHour(target.year, target.month, target.day, 9);

  const created = await call('/api/applications', {
    method: 'POST',
    cookie,
    headers: { 'Idempotency-Key': randomUUID() },
    body: JSON.stringify({
      company: `Công ty ${randomUUID().slice(0, 6)}`,
      position: 'Kỹ sư nhắc việc',
      nextAction,
      deadline: deadline.toISOString(),
      status: 'Applied'
    })
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body as { id: string; company: string; version: number };
};

test.before(async () => {
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await pool.query(`DELETE FROM rate_limits WHERE key LIKE 'auth-%'`);
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

test('selectBucket picks the closest bucket that has not passed', () => {
  assert.equal(selectBucket(-1), null, 'past deadlines never remind');
  assert.equal(selectBucket(0), 'due');
  assert.equal(selectBucket(1), 'T-1');
  assert.equal(selectBucket(2), 'T-3');
  assert.equal(selectBucket(3), 'T-3');
  assert.equal(selectBucket(5), 'T-7');
  assert.equal(selectBucket(7), 'T-7');
  assert.equal(selectBucket(8), null, 'more than a week away is too early');
});

test('dry run reports what would be sent without writing rows', async () => {
  const user = await register();
  const created = await createDeadline(user.cookie, 2);

  const run = await deadlineReminderService.run({ dryRun: true, userId: user.id });
  assert.equal(run.scanned, 1);
  assert.equal(run.sent, 1);
  assert.equal(run.delivered.length, 1);
  assert.equal(run.delivered[0].applicationId, created.id);
  assert.equal(run.delivered[0].bucket, 'T-3');

  const rows = await pool.query(
    'SELECT id FROM deadline_reminders WHERE application_id=$1',
    [created.id]
  );
  assert.equal(rows.rowCount, 0, 'dry run must not persist a delivery row');
});

test('a real run sends once and records the delivery', async () => {
  const user = await register();
  const created = await createDeadline(user.cookie, 2);

  const first = await deadlineReminderService.run({ userId: user.id });
  assert.equal(first.scanned, 1);
  assert.equal(first.sent, 1);
  assert.equal(first.delivered[0].bucket, 'T-3');

  const stored = await pool.query<{ bucket: string }>(
    'SELECT bucket FROM deadline_reminders WHERE application_id=$1',
    [created.id]
  );
  assert.equal(stored.rowCount, 1);
  assert.equal(stored.rows[0].bucket, 'T-3');

  const second = await deadlineReminderService.run({ userId: user.id });
  assert.equal(second.sent, 0, 'second run must not resend');
  assert.equal(second.skippedAlreadySent, 1);
});

test('reminders_enabled false suppresses the reminder', async () => {
  const user = await register();
  const created = await createDeadline(user.cookie, 2);

  await pool.query('UPDATE applications SET reminders_enabled = false WHERE id=$1', [created.id]);

  const run = await deadlineReminderService.run({ userId: user.id });
  assert.equal(run.scanned, 0, 'disabled application is not even scanned');
  assert.equal(run.sent, 0);
});

test('moving the deadline creates a new delivery for the new snapshot', async () => {
  const user = await register();
  const created = await createDeadline(user.cookie, 5);
  await deadlineReminderService.run({ userId: user.id });

  const tomorrow = localDateParts(new Date(Date.UTC(localDateParts(new Date()).year, localDateParts(new Date()).month - 1, localDateParts(new Date()).day + 1, 12)));
  const newDeadline = instantAtLocalHour(tomorrow.year, tomorrow.month, tomorrow.day, 9);

  const patched = await call(`/api/applications/${created.id}`, {
    method: 'PATCH',
    cookie: user.cookie,
    headers: { 'If-Match': `"app:${created.id}:v${created.version}"` },
    body: JSON.stringify({ deadline: newDeadline.toISOString() })
  });
  assert.equal(patched.status, 200, JSON.stringify(patched.body));

  const run = await deadlineReminderService.run({ userId: user.id });
  assert.equal(run.sent, 1, 'new deadline snapshot allows a new reminder');
  assert.equal(run.delivered[0].bucket, 'T-1');
});

test('history lists deliveries for the owner only', async () => {
  const alice = await register();
  const bob = await register();
  await createDeadline(alice.cookie, 2);
  await deadlineReminderService.run({ userId: alice.id });

  const aliceHistory = await deadlineReminderService.history(alice.id);
  assert.equal(aliceHistory.length, 1);
  assert.equal(aliceHistory[0].bucket, 'T-3');

  const bobHistory = await deadlineReminderService.history(bob.id);
  assert.equal(bobHistory.length, 0);

  const viaApi = await call('/api/auth/reminders', { cookie: alice.cookie });
  assert.equal(viaApi.status, 200);
  assert.equal((viaApi.body as { reminders: unknown[] }).reminders.length, 1);
});

test('the internal endpoint refuses a missing or wrong secret', async () => {
  const previous = process.env.REMINDER_RUNNER_SECRET;
  process.env.REMINDER_RUNNER_SECRET = 'test-secret-value';

  try {
    const missing = await call('/api/internal/reminders/run', { method: 'POST' });
    assert.equal(missing.status, 401);

    const wrong = await call('/api/internal/reminders/run', {
      method: 'POST',
      headers: { 'X-JobTrack-Runner-Secret': 'nope' }
    });
    assert.equal(wrong.status, 401);

    const right = await call('/api/internal/reminders/run?dryRun=1', {
      method: 'POST',
      headers: { 'X-JobTrack-Runner-Secret': 'test-secret-value' }
    });
    assert.equal(right.status, 200);
    assert.ok(typeof (right.body as { scanned: number }).scanned === 'number');
  } finally {
    if (previous === undefined) delete process.env.REMINDER_RUNNER_SECRET;
    else process.env.REMINDER_RUNNER_SECRET = previous;
  }
});

test('the internal endpoint is disabled when no secret is configured', async () => {
  const previous = process.env.REMINDER_RUNNER_SECRET;
  delete process.env.REMINDER_RUNNER_SECRET;

  try {
    const result = await call('/api/internal/reminders/run', { method: 'POST' });
    assert.equal(result.status, 503);
    assert.equal((result.body as { code: string }).code, 'reminders_disabled');
  } finally {
    if (previous !== undefined) process.env.REMINDER_RUNNER_SECRET = previous;
  }
});

test('reminder history requires authentication', async () => {
  const result = await call('/api/auth/reminders');
  assert.equal(result.status, 401);
});
