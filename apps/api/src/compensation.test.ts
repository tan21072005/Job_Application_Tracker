import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  CompensationForecastDTO,
  CompensationBenchmarkDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1900;

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
  const email = `compensation_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.24.${forwardedIp++}`
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

test('compensation: GET /api/compensation/forecasts requires authentication', async () => {
  const res = await fetch(`${base}/api/compensation/forecasts`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('compensation: POST /api/compensation/forecasts requires authentication', async () => {
  const res = await fetch(`${base}/api/compensation/forecasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ company: 'Shopee' })
  });
  assert.equal(res.status, 401);
});

test('compensation: POST /api/compensation/forecasts rejects invalid inputs with 400', async () => {
  const res = await fetch(`${base}/api/compensation/forecasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      company: '',
      role: '',
      package: {
        baseSalaryMonthly: -100
      }
    })
  });
  assert.equal(res.status, 400);
  const json = await res.json() as { code: string; errors: Record<string, string> };
  assert.equal(json.code, 'validation_error');
  assert.ok(json.errors.company);
  assert.ok(json.errors.role);
});

test('compensation: POST /api/compensation/forecasts creates a complete 4-year forecast', async () => {
  const res = await fetch(`${base}/api/compensation/forecasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      company: 'Shopee Vietnam',
      role: 'Senior Frontend Engineer',
      level: 'senior',
      package: {
        baseSalaryMonthly: 55000000,
        currency: 'VND',
        hasMonth13: true,
        performanceBonusAnnual: 55000000,
        equityGrant: {
          type: 'esop',
          totalShares: 20000,
          strikePrice: 20000,
          currentFairMarketValue: 60000,
          vestingYears: 4,
          cliffMonths: 12
        }
      }
    })
  });

  assert.equal(res.status, 201);
  const data = await res.json() as CompensationForecastDTO;

  assert.equal(data.company, 'Shopee Vietnam');
  assert.equal(data.role, 'Senior Frontend Engineer');
  assert.equal(data.level, 'senior');
  assert.equal(data.package.baseSalaryMonthly, 55000000);
  assert.equal(data.vestingSchedule.length, 4);
  assert.equal(data.vestingSchedule[0].vestedSharesCumulative, 5000);
  assert.ok(data.scenarios.baseline.fourYearTotalGross > 0);
  assert.ok(data.benchmark.candidatePercentile > 0);
  assert.ok(Array.isArray(data.leveragePoints));

  const listRes = await fetch(`${base}/api/compensation/forecasts`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listRes.status, 200);
  const list = await listRes.json() as CompensationForecastDTO[];
  assert.equal(list.length, 1);
  assert.equal(list[0].id, data.id);

  const listResB = await fetch(`${base}/api/compensation/forecasts`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(listResB.status, 200);
  const listB = await listResB.json() as CompensationForecastDTO[];
  assert.equal(listB.length, 0);

  const delResB = await fetch(`${base}/api/compensation/forecasts/${data.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(delResB.status, 404);

  const delResA = await fetch(`${base}/api/compensation/forecasts/${data.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(delResA.status, 200);

  const listAfterDel = await fetch(`${base}/api/compensation/forecasts`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listAfterDel.status, 200);
  const listAfter = await listAfterDel.json() as CompensationForecastDTO[];
  assert.equal(listAfter.length, 0);
});

test('compensation: GET /api/compensation/benchmark returns role percentiles', async () => {
  const res = await fetch(`${base}/api/compensation/benchmark?role=Senior%20Backend%20Engineer&level=senior&annualCash=800000000&currency=VND`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as CompensationBenchmarkDTO;
  assert.equal(data.level, 'senior');
  assert.ok(data.p50AnnualCash > 0);
  assert.ok(data.candidatePercentile >= 40);
});
