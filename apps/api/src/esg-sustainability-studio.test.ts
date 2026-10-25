import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  EsgStudioOverviewDTO,
  GhgCarbonInventoryDTO,
  TcfdSimulationResultDTO,
  EsrsTopicAssessmentDTO,
  Scope3SupplyChainOverviewDTO,
  SupplierDecarbonizationSimulationResultDTO,
  ExecutiveEsgBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9400;

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
  const email = `esg_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.44.${forwardedIp++}`
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

test('esg-sustainability-studio: GET /api/esg-sustainability-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/esg-sustainability-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('esg-sustainability-studio: POST /api/esg-sustainability-studio/carbon-inventory validates payload', async () => {
  const res = await fetch(`${base}/api/esg-sustainability-studio/carbon-inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ reportingYear: 1990 })
  });
  assert.equal(res.status, 400);
  const data = await res.json() as { code: string; error: string };
  assert.equal(data.code, 'invalid_carbon_payload');
});

test('esg-sustainability-studio: multi-tenant isolation and 404 security checks', async () => {
  const overviewRes = await fetch(`${base}/api/esg-sustainability-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overviewA = (await overviewRes.json()) as EsgStudioOverviewDTO;
  assert.ok(overviewA.materialityOverview.topics.length > 0);

  const topicCode = overviewA.materialityOverview.topics[0].topicCode;

  const crossUpdate = await fetch(`${base}/api/esg-sustainability-studio/materiality/UNKNOWN_CODE_999`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      topicCode: 'UNKNOWN_CODE_999',
      impactScale: 4.0,
      impactScope: 4.0,
      impactIrremediability: 4.0,
      impactLikelihood: 4.0,
      financialMagnitude: 4.0,
      financialProbability: 4.0,
      keyImpacts: ['Malicious change'],
      keyFinancialRisks: ['Data breach']
    })
  });
  assert.equal(crossUpdate.status, 404);

  const crossApprove = await fetch(`${base}/api/esg-sustainability-studio/board-memos/00000000-0000-0000-0000-000000000000/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ role: 'cso' })
  });
  assert.equal(crossApprove.status, 404);
});

test('esg-sustainability-studio: complete 5-pillar lifecycle, TCFD simulation, and tripartite sign-offs', async () => {
  const overviewRes = await fetch(`${base}/api/esg-sustainability-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const initial = (await overviewRes.json()) as EsgStudioOverviewDTO;

  assert.ok(initial.compositeScore >= 70);
  assert.ok(initial.grossEmissionsTco2e > 30000);
  assert.ok(initial.materialityOverview.topics.length >= 5);
  assert.ok(initial.supplyChainOverview.topSuppliers.length >= 5);
  assert.ok(initial.secCompliance.regSkItems.length >= 4);

  const recordCarbonRes = await fetch(`${base}/api/esg-sustainability-studio/carbon-inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      reportingYear: 2026,
      scope1Stationary: 1400,
      scope1Mobile: 500,
      scope1Fugitive: 200,
      scope2Location: 6000,
      scope2Market: 1100,
      scope3Categories: [
        { category: 'cat_01_purchased_goods', emissionsTco2e: 20000, method: 'hybrid_activity' },
        { category: 'cat_06_business_travel', emissionsTco2e: 3000, method: 'hybrid_activity' }
      ],
      verifiedRemovals: 2000,
      revenueMillionUsd: 450,
      headcountFte: 3000,
      realEstateAreaM2: 50000,
      energyTotalMwh: 25000,
      renewableEnergyMwh: 18000
    })
  });
  assert.equal(recordCarbonRes.status, 201);
  const updatedInv = (await recordCarbonRes.json()) as GhgCarbonInventoryDTO;
  assert.equal(updatedInv.reportingYear, 2026);
  assert.ok(updatedInv.grossEmissionsTco2e > 25000);

  const tcfdSimRes = await fetch(`${base}/api/esg-sustainability-studio/scenarios/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      scenario: 'rcp_2_6_net_zero',
      timeHorizon: 'short_term_2030',
      enterpriseValueUsd: 1000000000,
      customCarbonPriceUsdPerTon: 150,
      physicalAssetLocationsCount: 15
    })
  });
  assert.equal(tcfdSimRes.status, 200);
  const tcfdResult = (await tcfdSimRes.json()) as TcfdSimulationResultDTO;
  assert.equal(tcfdResult.scenario, 'rcp_2_6_net_zero');
  assert.ok(tcfdResult.climateVar95Usd > 10000000);

  const updateMatRes = await fetch(`${base}/api/esg-sustainability-studio/materiality/ESRS_E1`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      topicCode: 'ESRS_E1',
      impactScale: 4.9,
      impactScope: 4.8,
      impactIrremediability: 4.7,
      impactLikelihood: 4.5,
      financialMagnitude: 4.8,
      financialProbability: 4.5,
      keyImpacts: ['Aggressive Scope 1/2 reduction'],
      keyFinancialRisks: ['Carbon tax volatility']
    })
  });
  assert.equal(updateMatRes.status, 200);
  const updatedTopic = (await updateMatRes.json()) as EsrsTopicAssessmentDTO;
  assert.equal(updatedTopic.materialityTier, 'tier_1_double_material');

  const supplierSimRes = await fetch(`${base}/api/esg-sustainability-studio/suppliers/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetTierAProcurementSharePercent: 80,
      targetVendorRenewableAdoptionPercent: 85,
      supplierEngagementMandateEnacted: true
    })
  });
  assert.equal(supplierSimRes.status, 200);
  const supplierResult = (await supplierSimRes.json()) as SupplierDecarbonizationSimulationResultDTO;
  assert.ok(supplierResult.abatedScope3Tco2e > 5000);
  assert.equal(supplierResult.newAlignmentStatus, 'on_track_1_5c');

  const genMemoRes = await fetch(`${base}/api/esg-sustainability-studio/board-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'FY2026 Executive ESG & Climate Risk Board Memorandum',
      reportingYear: 2026
    })
  });
  assert.equal(genMemoRes.status, 201);
  const generatedMemo = (await genMemoRes.json()) as ExecutiveEsgBoardMemorandumDTO;
  assert.equal(generatedMemo.status, 'draft');

  const csoApprove = await fetch(`${base}/api/esg-sustainability-studio/board-memos/${generatedMemo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ role: 'cso' })
  });
  assert.equal(csoApprove.status, 200);
  const csoMemo = (await csoApprove.json()) as ExecutiveEsgBoardMemorandumDTO;
  assert.ok(csoMemo.approvedByCsoAt);
  assert.equal(csoMemo.status, 'under_csuite_review');

  const cfoApprove = await fetch(`${base}/api/esg-sustainability-studio/board-memos/${generatedMemo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ role: 'cfo' })
  });
  assert.equal(cfoApprove.status, 200);

  const chairApprove = await fetch(`${base}/api/esg-sustainability-studio/board-memos/${generatedMemo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ role: 'board_esg_chair' })
  });
  assert.equal(chairApprove.status, 200);
  const finalApprovedMemo = (await chairApprove.json()) as ExecutiveEsgBoardMemorandumDTO;
  assert.ok(finalApprovedMemo.approvedByCsoAt);
  assert.ok(finalApprovedMemo.approvedByCfoAt);
  assert.ok(finalApprovedMemo.approvedByBoardChairAt);
  assert.equal(finalApprovedMemo.status, 'board_approved');
});
