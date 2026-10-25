import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  TotalRewardsStudioOverviewDTO,
  RelativeTsrSimulationResultDTO,
  Section83bArbitrageResultDTO,
  TotalRewardsBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9700;

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
  const email = `total_rewards_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.46.${forwardedIp++}`
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

test('workforce-total-rewards-studio: GET /api/workforce-total-rewards-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/workforce-total-rewards-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('workforce-total-rewards-studio: POST /api/workforce-total-rewards-studio/lti/simulate-tsr validates payload', async () => {
  const res = await fetch(`${base}/api/workforce-total-rewards-studio/lti/simulate-tsr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ performancePeriodYears: 99 })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string; errors: Record<string, string> };
  assert.equal(data.code, 'validation_error');
  assert.ok(data.errors.performancePeriodYears);
});

test('workforce-total-rewards-studio: multi-tenant isolation and 404 security checks', async () => {
  const overviewRes = await fetch(`${base}/api/workforce-total-rewards-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overviewA = (await overviewRes.json()) as TotalRewardsStudioOverviewDTO;
  assert.ok(overviewA.jobArchitectureSummary.salaryBands.length > 0);

  const crossSignoff = await fetch(
    `${base}/api/workforce-total-rewards-studio/board-memos/00000000-0000-0000-0000-000000000000/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({ role: 'chief_human_resources_officer' })
    }
  );
  assert.equal(crossSignoff.status, 404);
});

test('workforce-total-rewards-studio: complete 5-pillar lifecycle and tripartite sign-offs', async () => {
  const overviewRes = await fetch(`${base}/api/workforce-total-rewards-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const initial = (await overviewRes.json()) as TotalRewardsStudioOverviewDTO;

  assert.ok(initial.compositeTrai >= 75);
  assert.ok(initial.totalHeadcount >= 1000);
  assert.ok(initial.jobArchitectureSummary.salaryBands.length >= 4);
  assert.ok(initial.equityDilutionOverview.executiveGrants.length >= 2);
  assert.ok(initial.taxOverview.taxProfiles.length >= 1);
  assert.ok(initial.payEquityOverview.cohortRegressions.length >= 2);

  const simRes = await fetch(`${base}/api/workforce-total-rewards-studio/lti/simulate-tsr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      performancePeriodYears: 3,
      companyAnnualizedDrift: 0.12,
      companyVolatility: 0.35,
      peerGroupMeanDrift: 0.10,
      peerGroupMeanVolatility: 0.30,
      peerCorrelationFactor: 0.55,
      numPeers: 12,
      iterationsCount: 300,
      negativeTsrCapEnforced: true,
      maximumPayoutMultiplier: 200
    })
  });
  assert.equal(simRes.status, 200);
  const sim = (await simRes.json()) as RelativeTsrSimulationResultDTO;
  assert.equal(sim.iterationsCount, 300);
  assert.ok(sim.expectedPayoutMultiplierPercent >= 0);

  const taxRes = await fetch(`${base}/api/workforce-total-rewards-studio/tax/optimize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      sharesGranted: 50000,
      grantDateFmvUsd: 1.0,
      strikeOrPurchasePriceUsd: 0.1,
      projectedLiquiditySharePriceUsd: 25.0,
      ordinaryIncomeTaxRatePercent: 37.0,
      longTermCapitalGainsRatePercent: 20.0,
      netInvestmentIncomeTaxPercent: 3.8,
      holdingPeriodYears: 4,
      riskOfForfeitureProbabilityPercent: 10
    })
  });
  assert.equal(taxRes.status, 200);
  const taxResult = (await taxRes.json()) as Section83bArbitrageResultDTO;
  assert.ok(taxResult.netProjectedTaxSavingsUsd > 0);
  assert.equal(taxResult.recommendationDirective, 'strongly_recommended_file_83b');

  const memoRes = await fetch(`${base}/api/workforce-total-rewards-studio/board-memos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiscalYear: 'FY2026',
      title: 'Global Workforce Total Rewards & Executive LTI Alignment Report'
    })
  });
  assert.equal(memoRes.status, 201);
  const createdMemo = (await memoRes.json()) as TotalRewardsBoardMemorandumDTO;
  assert.equal(createdMemo.fiscalYear, 'FY2026');
  assert.equal(createdMemo.status, 'draft');
  assert.ok(createdMemo.executiveSummaryMarkdown.includes('BOARD COMPENSATION COMMITTEE GOVERNANCE MEMORANDUM'));

  const sign1 = await fetch(
    `${base}/api/workforce-total-rewards-studio/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'chief_human_resources_officer' })
    }
  );
  assert.equal(sign1.status, 200);
  const signed1 = (await sign1.json()) as TotalRewardsBoardMemorandumDTO;
  assert.ok(signed1.approvedByChroAt);
  assert.equal(signed1.status, 'under_review');

  const sign2 = await fetch(
    `${base}/api/workforce-total-rewards-studio/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'chief_financial_officer' })
    }
  );
  assert.equal(sign2.status, 200);
  const signed2 = (await sign2.json()) as TotalRewardsBoardMemorandumDTO;
  assert.ok(signed2.approvedByCfoAt);
  assert.equal(signed2.status, 'under_review');

  const sign3 = await fetch(
    `${base}/api/workforce-total-rewards-studio/board-memos/${createdMemo.id}/signoff`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'board_compensation_chair' })
    }
  );
  assert.equal(sign3.status, 200);
  const signed3 = (await sign3.json()) as TotalRewardsBoardMemorandumDTO;
  assert.ok(signed3.approvedByCompChairAt);
  assert.equal(signed3.status, 'committee_approved');
});
