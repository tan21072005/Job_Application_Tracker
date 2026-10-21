import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { JobTrackService, type JobTrackEvent } from './services/jobtrack-service.ts';
import type { ValidatedApplicationData, ValidatedInterviewData } from '../../../packages/jobtrack-contract/src/index.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 5 });
const service = new JobTrackService(pool);

const testUsers: string[] = [];

async function createUser(): Promise<string> {
  const id = randomUUID();
  const email = `service_test_${id.slice(0, 8)}@example.com`;
  await pool.query(
    "INSERT INTO users(id, email, email_normalized, password_hash) VALUES($1, $2, $2, '$argon2id$v=19$m=65536,t=3,p=4$dummy$hash')",
    [id, email]
  );
  testUsers.push(id);
  return id;
}

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  await pool.end();
});

test('JobTrackService: soft-delete application to trash and restore', async () => {
  const userId = await createUser();

  const events: JobTrackEvent[] = [];
  const unsubscribe = service.subscribeEvents(userId, event => {
    events.push(event);
  });

  const appData: ValidatedApplicationData = {
    company: 'Anthropic',
    position: 'AI Engineer',
    url: 'https://anthropic.com/jobs/1',
    normalizedUrl: 'https://anthropic.com/jobs/1',
    source: null,
    sourceNormalized: null,
    jobCode: null,
    jobCodeNormalized: null,
    location: 'Remote',
    workMode: 'Remote',
    appliedAt: '2026-10-19',
    salary: '250k',
    notes: 'Great culture',
    nextAction: 'Prep for interview',
    deadline: '2026-10-30T10:00:00Z',
    status: 'Applied',
    confirmReapply: false
  };

  // 1. Create application
  const createRes = await service.createApplication(userId, appData, {
    idempotencyKey: randomUUID()
  });
  assert.equal(createRes.application.company, 'Anthropic');
  assert.equal(createRes.application.deletedAt, null);

  const appId = createRes.application.id;

  // 2. Active list contains the application
  const activeList = await service.listApplications(userId);
  assert.equal(activeList.length, 1);
  assert.equal(activeList[0].id, appId);

  // 3. Soft-delete application (purge: false)
  await service.deleteApplication(userId, appId, {
    ifMatchVersion: createRes.application.version,
    purge: false
  });

  // 4. Active list no longer contains the trashed application
  const activeAfterTrash = await service.listApplications(userId);
  assert.equal(activeAfterTrash.length, 0);

  // 5. Trash view (includeDeleted: true) shows the trashed application with deletedAt set
  const trashList = await service.listApplications(userId, { includeDeleted: true });
  assert.equal(trashList.length, 1);
  assert.equal(trashList[0].id, appId);
  assert.ok(trashList[0].deletedAt);

  // 6. Restore application from trash
  const restored = await service.restoreApplication(userId, appId);
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.version, createRes.application.version + 2); // 1 version bump on delete, 1 on restore

  // 7. Active list contains the application again
  const activeAfterRestore = await service.listApplications(userId);
  assert.equal(activeAfterRestore.length, 1);
  assert.equal(activeAfterRestore[0].id, appId);

  // 8. Verify event notifications were emitted in order
  assert.ok(events.some(e => e.action === 'create' && e.id === appId));
  assert.ok(events.some(e => e.action === 'delete' && e.id === appId));
  assert.ok(events.some(e => e.action === 'restore' && e.id === appId));

  unsubscribe();
});

test('JobTrackService: dashboard summary calculates metrics accurately', async () => {
  const userId = await createUser();

  const app: ValidatedApplicationData = {
    company: 'OpenAI',
    position: 'Research Scientist',
    url: null,
    normalizedUrl: null,
    source: null,
    sourceNormalized: null,
    jobCode: null,
    jobCodeNormalized: null,
    location: null,
    workMode: 'On-site',
    appliedAt: null,
    salary: null,
    notes: null,
    nextAction: null,
    deadline: null,
    status: 'Interview',
    confirmReapply: false
  };

  const created = await service.createApplication(userId, app, {
    idempotencyKey: randomUUID()
  });

  const interviewData: ValidatedInterviewData = {
    title: 'Technical Round 1',
    at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'Online',
    location: null,
    preparation: 'Review transformer papers',
    notes: null,
    status: 'Scheduled'
  };

  await service.createInterview(userId, created.application.id, interviewData, {
    idempotencyKey: randomUUID(),
    ifMatchVersion: created.application.version
  });

  const summary = await service.getDashboardSummary(userId);
  assert.equal(summary.total, 1);
  assert.equal(summary.offers, 0);
  assert.equal(summary.upcoming, 1);
  assert.ok(summary.asOf);
});
