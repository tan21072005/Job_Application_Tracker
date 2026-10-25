import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  SupplyChainStudioOverviewDTO,
  SupplierBomNodeDTO,
  GeopoliticalExposureDTO,
  DisruptionSimulationResultDTO,
  HubCostComparisonResultDTO,
  SupplyChainBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9600;

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
  const email = `supply_chain_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.45.${forwardedIp++}`
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

test('supply-chain-resilience-studio: GET /api/supply-chain-resilience-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/supply-chain-resilience-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('supply-chain-resilience-studio: POST /api/supply-chain-resilience-studio/bom validates payload', async () => {
  const res = await fetch(`${base}/api/supply-chain-resilience-studio/bom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ partNumber: '' })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string; errors: Record<string, string> };
  assert.equal(data.code, 'validation_error');
  assert.ok(data.errors.partNumber);
});

test('supply-chain-resilience-studio: multi-tenant isolation and 404 security checks', async () => {
  const overviewRes = await fetch(`${base}/api/supply-chain-resilience-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overviewA = (await overviewRes.json()) as SupplyChainStudioOverviewDTO;
  assert.ok(overviewA.bomSummary.nodes.length > 0);

  const crossApprove = await fetch(
    `${base}/api/supply-chain-resilience-studio/board-memos/00000000-0000-0000-0000-000000000000/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({ role: 'vp_supply_chain' })
    }
  );
  assert.equal(crossApprove.status, 404);

  const crossSim = await fetch(
    `${base}/api/supply-chain-resilience-studio/buffers/simulate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({
        sku: 'NON_EXISTENT_SKU_99999',
        simulatedDelayDays: 14,
        demandSurgePercent: 20,
        disruptionProbabilityPercent: 50
      })
    }
  );
  assert.equal(crossSim.status, 404);
});

test('supply-chain-resilience-studio: complete 5-pillar lifecycle and tripartite sign-offs', async () => {
  const overviewRes = await fetch(`${base}/api/supply-chain-resilience-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const initial = (await overviewRes.json()) as SupplyChainStudioOverviewDTO;

  assert.ok(initial.compositeScri >= 70);
  assert.ok(initial.totalMappedComponents >= 4);
  assert.ok(initial.bomSummary.nodes.length >= 4);
  assert.ok(initial.geopoliticalSummary.exposures.length >= 3);
  assert.ok(initial.bufferSummary.buffers.length >= 2);
  assert.ok(initial.networkSummary.allHubs.length >= 3);

  const saveBomRes = await fetch(`${base}/api/supply-chain-resilience-studio/bom`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      partNumber: 'SENSOR-OPT-99',
      componentName: 'Precision Optical Sensor Module',
      tier: 'tier_2_subassembly',
      supplierName: 'Kyoto Optronics',
      supplierCountry: 'Japan',
      criticality: 'high',
      sourcingStrategy: 'single_source',
      spendVolumeSharePercent: 100,
      nominalLeadTimeDays: 40,
      annualSpendUsd: 1800000
    })
  });
  assert.equal(saveBomRes.status, 201);
  const savedNode = (await saveBomRes.json()) as SupplierBomNodeDTO;
  assert.equal(savedNode.partNumber, 'SENSOR-OPT-99');
  assert.equal(savedNode.isSinglePointOfFailure, true);

  const screenRes = await fetch(`${base}/api/supply-chain-resilience-studio/geopolitical/screen`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    }
  });
  assert.equal(screenRes.status, 200);
  const screened = (await screenRes.json()) as GeopoliticalExposureDTO[];
  assert.ok(screened.length >= 3);

  const simRes = await fetch(`${base}/api/supply-chain-resilience-studio/buffers/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      sku: 'SKU-MCU-3305',
      simulatedDelayDays: 45,
      demandSurgePercent: 25,
      disruptionProbabilityPercent: 40
    })
  });
  assert.equal(simRes.status, 200);
  const simResult = (await simRes.json()) as DisruptionSimulationResultDTO;
  assert.equal(simResult.sku, 'SKU-MCU-3305');
  assert.ok(simResult.estimatedLostRevenueUsd > 0);
  assert.ok(simResult.recommendedSafetyStockIncreaseUnits > 0);

  const baselineHub = initial.networkSummary.allHubs[0];
  const candidateHub = initial.networkSummary.allHubs[1];
  const compareRes = await fetch(`${base}/api/supply-chain-resilience-studio/hubs/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      baselineHubId: baselineHub.id,
      candidateHubIds: [candidateHub.id],
      annualProductionVolumeUnits: 50000,
      annualHoldingCostRatePercent: 18
    })
  });
  assert.equal(compareRes.status, 200);
  const compResult = (await compareRes.json()) as HubCostComparisonResultDTO;
  assert.ok(compResult.optimalRecommendation.length > 10);
  assert.ok(compResult.annualSavingsUsd >= 0);

  const memoRes = await fetch(`${base}/api/supply-chain-resilience-studio/board-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiscalQuarter: 'Q4-2026',
      title: 'Global Supply Chain Resilience & Nearshoring Strategy'
    })
  });
  assert.equal(memoRes.status, 201);
  const createdMemo = (await memoRes.json()) as SupplyChainBoardMemorandumDTO;
  assert.equal(createdMemo.fiscalQuarter, 'Q4-2026');
  assert.equal(createdMemo.status, 'draft');

  const sign1 = await fetch(
    `${base}/api/supply-chain-resilience-studio/board-memos/${createdMemo.id}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'vp_supply_chain' })
    }
  );
  assert.equal(sign1.status, 200);
  const signed1 = (await sign1.json()) as SupplyChainBoardMemorandumDTO;
  assert.ok(signed1.approvedByVpSupplyChainAt);

  const sign2 = await fetch(
    `${base}/api/supply-chain-resilience-studio/board-memos/${createdMemo.id}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'chief_operating_officer' })
    }
  );
  assert.equal(sign2.status, 200);
  const signed2 = (await sign2.json()) as SupplyChainBoardMemorandumDTO;
  assert.ok(signed2.approvedByCooAt);

  const sign3 = await fetch(
    `${base}/api/supply-chain-resilience-studio/board-memos/${createdMemo.id}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ role: 'board_risk_chair' })
    }
  );
  assert.equal(sign3.status, 200);
  const signed3 = (await sign3.json()) as SupplyChainBoardMemorandumDTO;
  assert.ok(signed3.approvedByBoardRiskChairAt);
  assert.equal(signed3.status, 'board_approved');
});
