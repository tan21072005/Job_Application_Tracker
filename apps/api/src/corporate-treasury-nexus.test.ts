import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  CorporateTreasuryOverviewDTO,
  CashSweepExecutionResultDTO,
  WorkingCapitalSimulationResultDTO,
  FxSensitivitySimulationResultDTO,
  BailInStressTestResultDTO,
  TreasuryBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9800;

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `corporate_treasury_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.47.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Cookie missing in registration response.');
  return { userId: data.id, cookie };
}

test('corporate-treasury-nexus: GET /api/corporate-treasury-nexus/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/corporate-treasury-nexus/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('corporate-treasury-nexus: POST endpoints validate bad payloads', async () => {
  const badCcc = await fetch(`${base}/api/corporate-treasury-nexus/forecast/simulate-ccc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ adjustedDso: 999 })
  });
  assert.equal(badCcc.status, 400);
  const cccData = (await badCcc.json()) as { code: string; errors: Record<string, string> };
  assert.equal(cccData.code, 'validation_error');
  assert.ok(cccData.errors.adjustedDso);

  const badFx = await fetch(`${base}/api/corporate-treasury-nexus/fx/simulate-var`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ currencyPair: 'INVALID_PAIR' })
  });
  assert.equal(badFx.status, 400);
  const fxData = (await badFx.json()) as { code: string; errors: Record<string, string> };
  assert.equal(fxData.code, 'validation_error');
  assert.ok(fxData.errors.currencyPair);

  const badBailIn = await fetch(`${base}/api/corporate-treasury-nexus/counterparty/simulate-bailin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ stressedBankId: '', haircutLossPercentage: 150 })
  });
  assert.equal(badBailIn.status, 400);
  const bailInData = (await badBailIn.json()) as { code: string; errors: Record<string, string> };
  assert.equal(bailInData.code, 'validation_error');
  assert.ok(bailInData.errors.stressedBankId);
});

test('corporate-treasury-nexus: multi-tenant isolation and 404 security checks', async () => {
  const overviewRes = await fetch(`${base}/api/corporate-treasury-nexus/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);

  const crossSignoff = await fetch(
    `${base}/api/corporate-treasury-nexus/board-memos/00000000-0000-0000-0000-000000000000/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({
        role: 'corporate_treasurer',
        signerName: 'Alexandra Chen',
        comments: 'Cross tenant attempt'
      })
    }
  );
  assert.equal(crossSignoff.status, 404);

  const crossBailIn = await fetch(
    `${base}/api/corporate-treasury-nexus/counterparty/simulate-bailin`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({
        stressedBankId: '00000000-0000-0000-0000-000000000000',
        haircutLossPercentage: 20,
        sovereignSpreadShockBps: 50
      })
    }
  );
  assert.equal(crossBailIn.status, 404);
});

test('corporate-treasury-nexus: full 5-pillar lifecycle and tripartite sign-offs', async () => {
  const overviewRes = await fetch(`${base}/api/corporate-treasury-nexus/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as CorporateTreasuryOverviewDTO;
  assert.ok(overview.compositeTrlsScore >= 75);
  assert.ok(overview.cashConcentration.totalGlobalLiquidityUsd > 40000000);
  assert.ok(overview.cashConcentration.accounts.length >= 6);
  assert.ok(overview.cashForecast.weeklyForecasts.length === 13);
  assert.ok(overview.fxHedging.contracts.length >= 3);
  assert.ok(overview.counterpartyRisk.counterparties.length >= 3);

  const sweepRes = await fetch(`${base}/api/corporate-treasury-nexus/sweeps/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ sweepMode: 'all_zba' })
  });
  assert.equal(sweepRes.status, 200);
  const sweep = (await sweepRes.json()) as CashSweepExecutionResultDTO;
  assert.ok(sweep.sweptAccountsCount > 0);
  assert.ok(sweep.totalAmountSweptUsd > 0);
  assert.ok(sweep.annualizedArbitrageUsd > 0);

  const cccRes = await fetch(`${base}/api/corporate-treasury-nexus/forecast/simulate-ccc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      adjustedDso: 35,
      adjustedDpo: 50,
      adjustedDio: 16
    })
  });
  assert.equal(cccRes.status, 200);
  const ccc = (await cccRes.json()) as WorkingCapitalSimulationResultDTO;
  assert.equal(ccc.revisedCccDays, 1);
  assert.ok(ccc.daysImprovement > 0);
  assert.ok(ccc.freedWorkingCapitalUsd > 0);
  assert.equal(ccc.status, 'lean');

  const fxRes = await fetch(`${base}/api/corporate-treasury-nexus/fx/simulate-var`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      currencyPair: 'EUR/USD',
      shockPercentage: 10,
      holdingPeriodDays: 10,
      confidenceInterval: 0.95,
      hedgingCoverageAdjustmentPercent: 85
    })
  });
  assert.equal(fxRes.status, 200);
  const fxResult = (await fxRes.json()) as FxSensitivitySimulationResultDTO;
  assert.ok(fxResult.netVarianceReductionUsd > 0);
  assert.ok(fxResult.parametricVaRUsd > 0);
  assert.equal(fxResult.asc815CompliancePreserved, true);

  const targetBank = overview.counterpartyRisk.counterparties[0];
  const bailInRes = await fetch(`${base}/api/corporate-treasury-nexus/counterparty/simulate-bailin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      stressedBankId: targetBank.id,
      haircutLossPercentage: 25,
      sovereignSpreadShockBps: 100
    })
  });
  assert.equal(bailInRes.status, 200);
  const bailIn = (await bailInRes.json()) as BailInStressTestResultDTO;
  assert.equal(bailIn.stressedBankName, targetBank.bankName);
  assert.ok(bailIn.projectedHaircutLossUsd > 0);
  assert.ok(bailIn.postStressAvailableLiquidityUsd > 0);

  const memoRes = await fetch(`${base}/api/corporate-treasury-nexus/board-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiscalQuarter: 'Q1-2026',
      title: 'Q1-2026 Global Corporate Treasury & Financial Risk Review',
      stressTestScenarioIncluded: true
    })
  });
  assert.equal(memoRes.status, 201);
  const createdMemo = (await memoRes.json()) as TreasuryBoardMemorandumDTO;
  assert.equal(createdMemo.fiscalQuarter, 'Q1-2026');
  assert.equal(createdMemo.status, 'draft');
  assert.ok(createdMemo.generatedMarkdownContent.includes('Executive Treasury Committee'));

  const sign1 = await fetch(
    `${base}/api/corporate-treasury-nexus/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({
        role: 'corporate_treasurer',
        signerName: 'Alexandra Chen, CFA',
        comments: 'Certified operational liquidity and cash concentration reconciliations.'
      })
    }
  );
  assert.equal(sign1.status, 200);
  const signed1 = (await sign1.json()) as TreasuryBoardMemorandumDTO;
  assert.equal(signed1.status, 'treasurer_certified');
  assert.equal(signed1.signoffs.length, 1);

  const sign2 = await fetch(
    `${base}/api/corporate-treasury-nexus/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({
        role: 'chief_financial_officer',
        signerName: 'Marcus Vance, CPA',
        comments: 'Approved balance sheet solvency and FX hedging program.'
      })
    }
  );
  assert.equal(sign2.status, 200);
  const signed2 = (await sign2.json()) as TreasuryBoardMemorandumDTO;
  assert.equal(signed2.status, 'cfo_approved');
  assert.equal(signed2.signoffs.length, 2);

  const sign3 = await fetch(
    `${base}/api/corporate-treasury-nexus/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({
        role: 'board_audit_finance_chair',
        signerName: 'Dr. Eleanor Sterling',
        comments: 'Ratified fiduciary risk policy compliance and counterparty boundaries.'
      })
    }
  );
  assert.equal(sign3.status, 200);
  const signed3 = (await sign3.json()) as TreasuryBoardMemorandumDTO;
  assert.equal(signed3.status, 'board_ratified');
  assert.equal(signed3.signoffs.length, 3);
});
