import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ExecutiveEquityGrantDTO,
  EquityModelDTO,
  ExecutivePackageComparisonDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 3800;

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
  const email = `equity_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.31.${forwardedIp++}`
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

test('equity: GET /api/equity/models requires authentication', async () => {
  const res = await fetch(`${base}/api/equity/models`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('equity: POST /api/equity/grants validates input and persists grant', async () => {
  const invalidRes = await fetch(`${base}/api/equity/grants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      company: '',
      shareCount: -100
    })
  });
  assert.equal(invalidRes.status, 422);

  const createRes = await fetch(`${base}/api/equity/grants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      company: 'FinFlow Global',
      role: 'VP of Engineering',
      grantType: 'iso',
      shareCount: 150000,
      strikePrice: 1.50,
      currentFmv: 5.00,
      preferredPrice: 10.00,
      grantDate: '2024-01-01',
      vestingStartDate: '2024-01-01',
      vestingScheduleType: 'standard_4yr_1yr_cliff',
      cliffMonths: 12,
      vestingDurationMonths: 48,
      postTerminationExerciseMonths: 90,
      accelerationClause: 'double_trigger_acceleration',
      hasEarlyExercise: true,
      section83bElected: true
    })
  });
  assert.equal(createRes.status, 201);
  const grant = await createRes.json() as ExecutiveEquityGrantDTO;
  assert.equal(grant.company, 'FinFlow Global');
  assert.equal(grant.shareCount, 150000);
  assert.equal(grant.strikePrice, 1.50);
});

test('equity: full model lifecycle, multi-tenant isolation, export, and comparison', async () => {
  const modelPayload = {
    modelName: 'Series B FinFlow Offer Modeler',
    grant: {
      company: 'FinFlow Global',
      role: 'Chief Technology Officer',
      grantType: 'iso',
      shareCount: 200000,
      strikePrice: 1.00,
      currentFmv: 4.00,
      preferredPrice: 8.00,
      grantDate: '2024-02-01',
      vestingStartDate: '2024-02-01',
      vestingScheduleType: 'standard_4yr_1yr_cliff',
      cliffMonths: 12,
      vestingDurationMonths: 48,
      postTerminationExerciseMonths: 120,
      accelerationClause: 'double_trigger_acceleration',
      hasEarlyExercise: true,
      section83bElected: true
    },
    capTable: {
      totalFullyDilutedShares: 10000000,
      commonShares: 6000000,
      unallocatedOptionPoolShares: 1000000,
      preferredTiers: [
        {
          tierName: 'Series A',
          originalInvestmentAmount: 5000000,
          sharesIssued: 3000000,
          preferenceMultiple: 1.0,
          participationType: 'non_participating',
          seniorityRank: 1
        }
      ]
    },
    dilutionRounds: [
      {
        roundName: 'Series B',
        preMoneyValuation: 50000000,
        capitalRaised: 15000000,
        newOptionPoolExpansionPercent: 5,
        issuedShareCount: 3000000,
        postMoneyValuation: 65000000,
        investorSharePercentage: 23.08,
        cumulativeDilutionFactor: 76.92
      }
    ],
    exitValuations: [25000000, 50000000, 100000000, 250000000],
    taxJurisdiction: 'us_federal_california',
    notes: 'CTO package with 10-year PTEP'
  };

  const createRes = await fetch(`${base}/api/equity/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify(modelPayload)
  });
  assert.equal(createRes.status, 201);
  const createdModel = await createRes.json() as EquityModelDTO;
  assert.ok(createdModel.id);
  assert.equal(createdModel.modelName, 'Series B FinFlow Offer Modeler');
  assert.equal(createdModel.exitScenarios.length, 4);
  assert.ok(createdModel.taxAnalysis.totalTaxLiability >= 0);

  const userBListRes = await fetch(`${base}/api/equity/models`, {
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(userBListRes.status, 200);
  const userBModels = await userBListRes.json() as EquityModelDTO[];
  assert.equal(userBModels.some(m => m.id === createdModel.id), false);

  const userBTamperRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(userBTamperRes.status, 404);

  const userBTamperDeleteRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: userB.cookie
    }
  });
  assert.equal(userBTamperDeleteRes.status, 404);

  const getRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as EquityModelDTO;
  assert.equal(fetched.id, createdModel.id);
  assert.equal(fetched.grant.company, 'FinFlow Global');

  const updateRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      modelName: 'Series B FinFlow Offer (Updated)'
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as EquityModelDTO;
  assert.equal(updated.modelName, 'Series B FinFlow Offer (Updated)');

  const exportRes = await fetch(`${base}/api/equity/models/${createdModel.id}/export`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(exportRes.status, 200);
  const exportData = await exportRes.json() as { markdown: string };
  assert.ok(exportData.markdown.includes('Executive Equity & Liquidity Analysis'));
  assert.ok(exportData.markdown.includes('FinFlow Global'));

  const counterPayload = {
    ...modelPayload,
    modelName: 'Counter Offer with 250k shares',
    grant: {
      ...modelPayload.grant,
      shareCount: 250000,
      postTerminationExerciseMonths: 120
    }
  };
  const counterRes = await fetch(`${base}/api/equity/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify(counterPayload)
  });
  assert.equal(counterRes.status, 201);
  const counterModel = await counterRes.json() as EquityModelDTO;

  const compareRes = await fetch(`${base}/api/equity/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      modelIdA: createdModel.id,
      modelIdB: counterModel.id
    })
  });
  assert.equal(compareRes.status, 200);
  const comparison = await compareRes.json() as ExecutivePackageComparisonDTO;
  assert.ok(comparison.recommendationVerdict.length > 0);
  assert.ok(comparison.upsidePayoutDelta > 0);

  const deleteRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    method: 'DELETE',
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(deleteRes.status, 204);

  const getDeletedRes = await fetch(`${base}/api/equity/models/${createdModel.id}`, {
    headers: {
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(getDeletedRes.status, 404);
});
