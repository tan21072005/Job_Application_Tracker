import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  CloudFinopsStudioOverviewDTO,
  TenantCostAllocationDTO,
  CommitmentPortfolioItemDTO,
  CommitmentNpvScenarioDTO,
  CloudCostAnomalyDTO,
  IdleWasteItemDTO,
  KubernetesWorkloadRightsizingDTO,
  CfoMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 8500;

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
  const email = `finops_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.40.${forwardedIp++}`
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

test('cloud-finops-studio: GET /api/cloud-finops-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/cloud-finops-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('cloud-finops-studio: POST /api/cloud-finops-studio/allocations validates payload', async () => {
  const res = await fetch(`${base}/api/cloud-finops-studio/allocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ tenantName: '' })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string; errors: Record<string, string> };
  assert.equal(data.code, 'validation_failed');
  assert.ok(data.errors.tenantName);
});

test('cloud-finops-studio: complete FinOps lifecycle, multi-tenant isolation, and 5-pillar analytics', async () => {
  const overviewRes = await fetch(`${base}/api/cloud-finops-studio/overview`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as CloudFinopsStudioOverviewDTO;
  assert.ok(overview.totalMonthlySpendUsd > 0);
  assert.ok(overview.blendedGrossMarginPercent > 70);
  assert.ok(overview.commitmentCoveragePercent >= 70);
  assert.ok(overview.commitmentUtilizationPercent >= 90);
  assert.ok(overview.compositeScore > 0);
  assert.ok(overview.allocationOverview.allocations.length >= 4);
  assert.ok(overview.commitmentOverview.portfolio.length >= 3);
  assert.ok(overview.wasteOverview.anomalies.length >= 2);
  assert.ok(overview.wasteOverview.idleAssets.length >= 3);
  assert.ok(overview.arbitrageOverview.workloads.length >= 3);
  assert.ok(overview.latestCfoMemo);

  const createAllocRes = await fetch(`${base}/api/cloud-finops-studio/allocations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      tenantName: 'Spotify Music Recommendation Core',
      tenantTier: 'enterprise',
      monthlyAttributableRevenueUsd: 55000.0,
      directComputeCostUsd: 2800.0,
      directStorageCostUsd: 700.0,
      allocatedSharedCostUsd: 900.0,
      monthlyTransactionsCount: 150000,
      taggingCompliancePercent: 100.0
    })
  });
  assert.equal(createAllocRes.status, 201);
  const createdAlloc = (await createAllocRes.json()) as TenantCostAllocationDTO;
  assert.equal(createdAlloc.tenantName, 'Spotify Music Recommendation Core');
  assert.equal(createdAlloc.totalCostPerTenantUsd, 4400.0);
  assert.equal(createdAlloc.grossMarginPercent, 92.0);

  const updateAllocRes = await fetch(`${base}/api/cloud-finops-studio/allocations/${createdAlloc.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      tenantName: 'Spotify Music Recommendation Core (Expanded)',
      tenantTier: 'enterprise',
      monthlyAttributableRevenueUsd: 65000.0,
      directComputeCostUsd: 3200.0,
      directStorageCostUsd: 800.0,
      allocatedSharedCostUsd: 1000.0,
      monthlyTransactionsCount: 180000,
      taggingCompliancePercent: 100.0
    })
  });
  assert.equal(updateAllocRes.status, 200);
  const updatedAlloc = (await updateAllocRes.json()) as TenantCostAllocationDTO;
  assert.equal(updatedAlloc.tenantName, 'Spotify Music Recommendation Core (Expanded)');

  const crossDeleteAlloc = await fetch(`${base}/api/cloud-finops-studio/allocations/${createdAlloc.id}`, {
    method: 'DELETE',
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(crossDeleteAlloc.status, 404);

  const createCommitRes = await fetch(`${base}/api/cloud-finops-studio/commitments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      provider: 'aws',
      serviceName: 'Amazon EKS Managed Node Groups',
      commitmentType: 'savings_plan_compute',
      instanceFamilyOrResource: 'm6g.xlarge',
      termMonths: 36,
      paymentOption: 'all_upfront',
      committedHourlySpendUsd: 14.5,
      onDemandEquivalentMonthlySpendUsd: 16500.0,
      utilizationRatePercent: 98.5,
      coverageRatioPercent: 85.0,
      expirationDate: '2028-12-31'
    })
  });
  assert.equal(createCommitRes.status, 201);
  const createdCommit = (await createCommitRes.json()) as CommitmentPortfolioItemDTO;
  assert.equal(createdCommit.serviceName, 'Amazon EKS Managed Node Groups');
  assert.ok(createdCommit.monthlySavingsUsd > 0);

  const simNpvRes = await fetch(`${base}/api/cloud-finops-studio/commitments/simulate-npv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      eligibleMonthlySpendUsd: 30000,
      targetCoveragePercent: 85,
      waccDiscountRatePercent: 8.5
    })
  });
  assert.equal(simNpvRes.status, 200);
  const npvScenarios = (await simNpvRes.json()) as CommitmentNpvScenarioDTO[];
  assert.equal(npvScenarios.length, 3);
  assert.ok(npvScenarios[0].netPresentValueUsd > 0);

  const anomalyScanRes = await fetch(`${base}/api/cloud-finops-studio/anomalies/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      sensitivityZScore: 2.5,
      lookbackDays: 30
    })
  });
  assert.equal(anomalyScanRes.status, 200);
  const anomalies = (await anomalyScanRes.json()) as CloudCostAnomalyDTO[];
  assert.ok(anomalies.length >= 2);

  const idleAssetsRes = await fetch(`${base}/api/cloud-finops-studio/idle-waste`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(idleAssetsRes.status, 200);
  const idleAssets = (await idleAssetsRes.json()) as IdleWasteItemDTO[];
  assert.ok(idleAssets.length >= 3);
  const targetIdle = idleAssets[0];

  const remediateRes = await fetch(`${base}/api/cloud-finops-studio/idle-waste/${targetIdle.id}/remediate`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      status: 'remediated',
      remediationNotes: 'Volume deleted via Terraform lifecycle script'
    })
  });
  assert.equal(remediateRes.status, 200);
  const remediatedAsset = (await remediateRes.json()) as IdleWasteItemDTO;
  assert.equal(remediatedAsset.status, 'remediated');

  const simK8sRes = await fetch(`${base}/api/cloud-finops-studio/k8s-rightsizing/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      headroomBufferPercent: 25,
      spotAggressivenessLevel: 'balanced'
    })
  });
  assert.equal(simK8sRes.status, 200);
  const simulatedWorkloads = (await simK8sRes.json()) as KubernetesWorkloadRightsizingDTO[];
  assert.ok(simulatedWorkloads.length >= 3);
  assert.ok(simulatedWorkloads[0].monthlySavingsUsd > 0);

  const genMemoRes = await fetch(`${base}/api/cloud-finops-studio/cfo-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      title: 'Q4-2026 Executive Cloud FinOps & Infrastructure Governance Memorandum',
      fiscalQuarter: 'Q4-2026',
      strategicNotes: 'Execute 3-year commitment tranches before end of fiscal quarter.'
    })
  });
  assert.equal(genMemoRes.status, 201);
  const generatedMemo = (await genMemoRes.json()) as CfoMemorandumDTO;
  assert.equal(generatedMemo.fiscalQuarter, 'Q4-2026');
  assert.equal(generatedMemo.status, 'draft');

  const approveMemoRes = await fetch(`${base}/api/cloud-finops-studio/cfo-memos/${generatedMemo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'cfo' })
  });
  assert.equal(approveMemoRes.status, 200);
  const approvedMemo = (await approveMemoRes.json()) as CfoMemorandumDTO;
  assert.equal(approvedMemo.status, 'board_approved');
  assert.ok(approvedMemo.approvedByCfoAt);

  const userBOverviewRes = await fetch(`${base}/api/cloud-finops-studio/overview`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = (await userBOverviewRes.json()) as CloudFinopsStudioOverviewDTO;
  const userBAllocIds = userBOverview.allocationOverview.allocations.map(a => a.id);
  assert.equal(userBAllocIds.includes(createdAlloc.id), false);

  const deleteAllocRes = await fetch(`${base}/api/cloud-finops-studio/allocations/${createdAlloc.id}`, {
    method: 'DELETE',
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(deleteAllocRes.status, 200);

  const deleteCommitRes = await fetch(`${base}/api/cloud-finops-studio/commitments/${createdCommit.id}`, {
    method: 'DELETE',
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(deleteCommitRes.status, 200);
});
