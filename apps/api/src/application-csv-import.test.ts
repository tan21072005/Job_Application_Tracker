import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { CsvImportResultDTO, CsvImportItemInput, ApplicationWireDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 220;

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
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `csv_test_${randomUUID()}@example.com`;
  const pwd = 'StrongPassword123!';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.9.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: pwd })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

test('CSV Import: requires authentication', async () => {
  const res = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({
      rows: [
        { company: 'Google', position: 'Software Engineer' }
      ]
    })
  });
  assert.equal(res.status, 401);
});

test('CSV Import: rejects invalid payload with 422', async () => {
  const { cookie } = await registerUser();

  const emptyRes = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      rows: []
    })
  });
  assert.equal(emptyRes.status, 422);

  const missingRes = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      rows: [
        { company: '', position: 'Developer' }
      ]
    })
  });
  assert.equal(missingRes.status, 422);
});

test('CSV Import: successfully imports multiple valid applications in one batch', async () => {
  const { cookie } = await registerUser();

  const rows: CsvImportItemInput[] = [
    {
      company: 'VNG Corporation',
      position: 'Senior Backend Engineer',
      location: 'Ho Chi Minh City',
      status: 'Applied',
      appliedAt: '2026-10-20',
      url: 'https://vng.com.vn/careers/job-1',
      salary: '45,000,000 VND',
      notes: 'Imported via CSV batch test'
    },
    {
      company: 'FPT Software',
      position: 'Cloud Architect',
      location: 'Da Nang',
      status: 'Interview',
      appliedAt: '2026-10-22',
      url: 'https://fpt-software.com/careers/job-2',
      salary: '55,000,000 VND',
      notes: 'Second round scheduled'
    },
    {
      company: 'MoMo',
      position: 'Lead Mobile Developer',
      location: 'Ho Chi Minh City',
      status: 'Saved',
      notes: 'Referral from contact'
    }
  ];

  const res = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      rows,
      skipDuplicates: false
    })
  });

  assert.equal(res.status, 200);
  const result = await res.json() as CsvImportResultDTO;
  assert.equal(result.importedCount, 3);
  assert.equal(result.skippedDuplicatesCount, 0);
  assert.equal(result.failedCount, 0);
  assert.equal(result.insertedIds.length, 3);

  const listRes = await fetch(`${base}/api/applications`, {
    headers: {
      Origin: origin,
      Cookie: cookie
    }
  });
  assert.equal(listRes.status, 200);
  const listData = await listRes.json() as ApplicationWireDTO[];
  assert.equal(listData.length, 3);

  const vng = listData.find(a => a.company === 'VNG Corporation');
  assert.ok(vng);
  assert.equal(vng.position, 'Senior Backend Engineer');
  assert.equal(vng.status, 'Applied');
});

test('CSV Import: detects duplicates and respects skipDuplicates flag', async () => {
  const { cookie } = await registerUser();

  const initialRows: CsvImportItemInput[] = [
    {
      company: 'Shopee Vietnam',
      position: 'DevOps Engineer',
      url: 'https://shopee.vn/careers/job-101'
    }
  ];

  const initRes = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      rows: initialRows
    })
  });
  assert.equal(initRes.status, 200);

  const secondBatch: CsvImportItemInput[] = [
    {
      company: 'Shopee Vietnam',
      position: 'DevOps Engineer',
      url: 'https://shopee.vn/careers/job-101'
    },
    {
      company: 'Tiki Corporation',
      position: 'Data Engineer',
      url: 'https://tiki.vn/careers/job-202'
    }
  ];

  const dupRes = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      rows: secondBatch,
      skipDuplicates: true
    })
  });

  assert.equal(dupRes.status, 200);
  const dupResult = await dupRes.json() as CsvImportResultDTO;
  assert.equal(dupResult.importedCount, 1);
  assert.equal(dupResult.skippedDuplicatesCount, 1);
  assert.equal(dupResult.insertedIds.length, 1);

  const listRes = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: cookie }
  });
  const listData = await listRes.json() as ApplicationWireDTO[];
  assert.equal(listData.length, 2);
});

test('CSV Import: enforces cross-user isolation', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const rowsA: CsvImportItemInput[] = [
    {
      company: 'VinAI Research',
      position: 'AI Engineer',
      url: 'https://vinai.io/careers/ai-1'
    }
  ];

  const resA = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ rows: rowsA })
  });
  assert.equal(resA.status, 200);

  const resB = await fetch(`${base}/api/applications/import-csv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ rows: rowsA })
  });
  assert.equal(resB.status, 200);
  const resultB = await resB.json() as CsvImportResultDTO;
  assert.equal(resultB.importedCount, 1);
  assert.equal(resultB.skippedDuplicatesCount, 0);

  const listB = await fetch(`${base}/api/applications`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  const dataB = await listB.json() as ApplicationWireDTO[];
  assert.equal(dataB.length, 1);
  assert.equal(dataB[0]?.company, 'VinAI Research');
});
