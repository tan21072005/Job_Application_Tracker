import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ValueStreamStudioOverviewDTO,
  ValueStreamDTO,
  StrategicOkrLinkageDTO,
  DoraMetricsSnapshotDTO,
  FlowMetricsSnapshotDTO,
  CapitalizedProjectLaborDTO,
  BoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 7400;

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
  const email = `vsm_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.39.${forwardedIp++}`
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

test('value-stream-studio: GET /api/value-stream-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/value-stream-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('value-stream-studio: POST /api/value-stream-studio/value-streams validates payload', async () => {
  const invalidRes = await fetch(`${base}/api/value-stream-studio/value-streams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ name: '', businessDomain: '' })
  });
  assert.equal(invalidRes.status, 400);
});

test('value-stream-studio: complete value stream lifecycle, OKRs, DORA, Flow, CapEx, Board Memo, and multi-tenant isolation', async () => {
  const overviewRes = await fetch(`${base}/api/value-stream-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = await overviewRes.json() as ValueStreamStudioOverviewDTO;
  assert.ok(overview.activeValueStreamsCount >= 3);
  assert.ok(overview.compositeDeliveryHealthIndex >= 70);
  assert.equal(overview.healthBand, 'world_class_elite');
  assert.equal(overview.overallDoraTier, 'high');
  assert.ok(overview.valueStreams.length >= 3);
  assert.ok(overview.okrLinkages.length >= 3);
  assert.ok(overview.capitalizedProjects.length >= 3);
  assert.ok(overview.latestBoardMemo);

  const newVsRes = await fetch(`${base}/api/value-stream-studio/value-streams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'AI Agent Autonomous Runtime',
      businessDomain: 'Autonomous Engineering Intelligence',
      executiveSponsor: 'VP of AI Research',
      contributingHeadcount: 8,
      stages: [
        { stage: 'backlog', stageName: 'Prompt Strategy', activeTouchHours: 4, idleWaitHours: 20, stageLeadTimeHours: 24, stageFlowEfficiencyPercent: 16.67, bottleneckDetected: false },
        { stage: 'build', stageName: 'Tool Integration', activeTouchHours: 32, idleWaitHours: 8, stageLeadTimeHours: 40, stageFlowEfficiencyPercent: 80.0, bottleneckDetected: false }
      ]
    })
  });
  assert.equal(newVsRes.status, 201);
  const newVs = await newVsRes.json() as ValueStreamDTO;
  assert.equal(newVs.name, 'AI Agent Autonomous Runtime');
  assert.equal(newVs.contributingHeadcount, 8);
  assert.ok(newVs.flowEfficiencyPercent > 50);

  const newOkrRes = await fetch(`${base}/api/value-stream-studio/okrs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      valueStreamId: newVs.id,
      strategicTheme: 'Autonomous Agent Platform',
      corporateObjective: 'Automate 80% of routine engineering chores',
      teamKeyResult: 'Ship verified autonomy pipelines in JobTrack',
      priorityTier: 'tier_0_board',
      allocatedCapacityPoints: 150,
      totalCapacityPoints: 150,
      targetQuarter: 'Q4-2026',
      status: 'on_track'
    })
  });
  assert.equal(newOkrRes.status, 201);
  const newOkr = await newOkrRes.json() as StrategicOkrLinkageDTO;
  assert.equal(newOkr.valueStreamId, newVs.id);
  assert.equal(newOkr.strategicTheme, 'Autonomous Agent Platform');

  const doraRes = await fetch(`${base}/api/value-stream-studio/dora/calculate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      valueStreamId: newVs.id,
      periodDays: 30,
      deploymentsCount: 60,
      medianLeadTimeHours: 12.0,
      failedDeploymentsCount: 2,
      medianRecoveryTimeHours: 0.5
    })
  });
  assert.equal(doraRes.status, 200);
  const doraSnapshot = await doraRes.json() as DoraMetricsSnapshotDTO;
  assert.equal(doraSnapshot.deploymentFrequency.value, 2.0);
  assert.equal(doraSnapshot.deploymentFrequency.tier, 'elite');
  assert.equal(doraSnapshot.failedDeploymentRecoveryTime.tier, 'elite');

  const flowRes = await fetch(`${base}/api/value-stream-studio/flow/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      valueStreamId: newVs.id,
      featuresWip: 8,
      defectsWip: 2,
      debtWip: 2,
      securityWip: 1,
      targetVelocityPerSprint: 24,
      engineerHeadcount: 8
    })
  });
  assert.equal(flowRes.status, 200);
  const flowSnapshot = await flowRes.json() as FlowMetricsSnapshotDTO;
  assert.equal(flowSnapshot.flowLoadTotalWip, 13);
  assert.equal(flowSnapshot.recommendedMaxWip, 12);
  assert.ok(flowSnapshot.wipSaturationRatio >= 1.0);

  const capRes = await fetch(`${base}/api/value-stream-studio/capitalized-projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      projectName: 'Autonomous Agent Framework Kernel',
      valueStreamId: newVs.id,
      investmentCategory: 'transform',
      developmentStage: 'application_development',
      qualifyingLaborHours: 1600,
      nonQualifyingLaborHours: 200,
      baseSalaryWeightedAverage: 180000,
      burdenMultiplier: 1.32,
      annualizedAttributableArrUsd: 1200000,
      estimatedUsefulLifeMonths: 36,
      auditDocumentationRef: 'JIRA-AI-101'
    })
  });
  assert.equal(capRes.status, 201);
  const capProject = await capRes.json() as CapitalizedProjectLaborDTO;
  assert.equal(capProject.projectName, 'Autonomous Agent Framework Kernel');
  assert.ok(capProject.capitalizedLaborCostUsd > 150000);

  const memoRes = await fetch(`${base}/api/value-stream-studio/board-memos/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiscalQuarter: 'Q4-2026',
      title: 'Q4-2026 Executive Value Stream Memorandum',
      strategicNotes: 'Focus on multi-agent execution pipelines'
    })
  });
  assert.equal(memoRes.status, 201);
  const memo = await memoRes.json() as BoardMemorandumDTO;
  assert.equal(memo.status, 'draft');

  const approveRes = await fetch(`${base}/api/value-stream-studio/board-memos/${memo.id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ role: 'cfo' })
  });
  assert.equal(approveRes.status, 200);
  const approvedMemo = await approveRes.json() as BoardMemorandumDTO;
  assert.equal(approvedMemo.status, 'board_approved');
  assert.ok(approvedMemo.approvedByCfoAt);

  const userBOverviewRes = await fetch(`${base}/api/value-stream-studio/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = await userBOverviewRes.json() as ValueStreamStudioOverviewDTO;
  const userBStreamNames = userBOverview.valueStreams.map(s => s.name);
  assert.ok(!userBStreamNames.includes('AI Agent Autonomous Runtime'));

  const crossTenantDeleteRes = await fetch(`${base}/api/value-stream-studio/value-streams/${newVs.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossTenantDeleteRes.status, 404);
});
