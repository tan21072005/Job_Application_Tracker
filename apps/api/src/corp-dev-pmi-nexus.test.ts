import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, corpDevPmiNexusService } from './server.ts';
import type {
  CorpDevOverviewDTO,
  CorpDevTargetDTO,
  VdrDiligenceFindingDTO,
  TalentRetentionDTO,
  BoardWarRoomDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9980;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await corpDevPmiNexusService.ensureSchema();
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
  const email = `corpdev_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.51.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('corp-dev-pmi-nexus: GET /api/corpdev/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/corpdev/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('corp-dev-pmi-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badTargetRes = await fetch(`${base}/api/corpdev/targets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badTargetRes.status, 400);

  const badFindingRes = await fetch(`${base}/api/corpdev/findings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badFindingRes.status, 400);

  const badDcfRes = await fetch(`${base}/api/corpdev/dcf/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badDcfRes.status, 400);

  const badLboRes = await fetch(`${base}/api/corpdev/lbo/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badLboRes.status, 400);

  const badSignoffRes = await fetch(`${base}/api/corpdev/targets/00000000-0000-0000-0000-000000000000/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ role: 'invalid_role', signerName: 'X' })
  });
  assert.equal(badSignoffRes.status, 400);
});

test('corp-dev-pmi-nexus: full operational lifecycle and multi-tenant isolation', async () => {
  const overviewRes = await fetch(`${base}/api/corpdev/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as CorpDevOverviewDTO;
  assert.ok(overview.activeTargetsCount >= 1);
  assert.ok(overview.targets.length >= 1);
  const defaultTarget = overview.targets[0];
  assert.equal(defaultTarget.codeName, 'Project Apex');

  const detailsRes = await fetch(`${base}/api/corpdev/targets/${defaultTarget.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(detailsRes.status, 200);
  const details = (await detailsRes.json()) as {
    target: CorpDevTargetDTO;
    vdrStreams: unknown[];
    findings: VdrDiligenceFindingDTO[];
    warRoom: BoardWarRoomDTO | null;
  };
  assert.ok(details.vdrStreams.length >= 6);
  assert.ok(details.warRoom !== null);

  const findingRes = await fetch(`${base}/api/corpdev/findings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetId: defaultTarget.id,
      streamType: 'technical_architecture',
      title: 'Monolithic database replication lag during peak batch ingestion',
      description: 'Secondary read replicas experience up to 45 seconds replication delay under load',
      severity: 'medium',
      financialImpactUsd: 450000,
      proposedRemediation: 'Migrate to Aurora Postgres serverless cluster in 60-day PMI window'
    })
  });
  assert.equal(findingRes.status, 201);
  const createdFinding = (await findingRes.json()) as VdrDiligenceFindingDTO;
  assert.equal(createdFinding.streamType, 'technical_architecture');

  const dcfRes = await fetch(`${base}/api/corpdev/dcf/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetId: defaultTarget.id,
      projectedUfcf: [19000000, 24000000, 30000000, 37000000, 45000000],
      waccPercent: 9.2,
      terminalGrowthRatePercent: 2.7,
      terminalEbitdaMultiple: 12.5,
      terminalYearEbitdaUsd: 42000000,
      netDebtUsd: 15000000,
      sharesOutstanding: 10000000
    })
  });
  assert.equal(dcfRes.status, 200);
  const dcfResult = await dcfRes.json();
  assert.ok(dcfResult.enterpriseValueGordonUsd > 0);

  const lboRes = await fetch(`${base}/api/corpdev/lbo/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      entryEbitdaUsd: 18500000,
      entryEbitdaMultiple: 11.0,
      seniorDebtMultiple: 4.0,
      subordinatedDebtMultiple: 1.5,
      exitYear: 5,
      exitEbitdaMultiple: 12.0,
      projectedExitEbitdaUsd: 45000000,
      debtPaydownDuringHoldUsd: 55000000
    })
  });
  assert.equal(lboRes.status, 200);
  const lboResult = await lboRes.json();
  assert.ok(lboResult.sponsorMoic > 1.0);

  const synergyRes = await fetch(`${base}/api/corpdev/synergies/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      annualRunRateCostSynergyUsd: 15000000,
      annualRunRateRevenueSynergyUsd: 30000000,
      contributionMarginPercent: 75.0,
      oneTimeCostToAchieveUsd: 10000000,
      waccPercent: 9.2,
      terminalGrowthRatePercent: 2.5
    })
  });
  assert.equal(synergyRes.status, 200);
  const synergyResult = await synergyRes.json();
  assert.ok(synergyResult.synergyNpvUsd > 0);

  const collarRes = await fetch(`${base}/api/corpdev/collar/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fixedTargetValueUsd: 50.0,
      collarLowerLimitUsd: 90.0,
      collarUpperLimitUsd: 110.0,
      currentBuyerStockPriceUsd: 100.0
    })
  });
  assert.equal(collarRes.status, 200);
  const collarResult = await collarRes.json();
  assert.equal(collarResult.collarStatus, 'floating');

  const antitrustRes = await fetch(`${base}/api/corpdev/antitrust/assess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      buyerMarketSharePercent: 24.0,
      targetMarketSharePercent: 11.0,
      industryTotalHhiPreMerger: 1750,
      competitorProtestsPresent: false
    })
  });
  assert.equal(antitrustRes.status, 200);
  const antitrustResult = await antitrustRes.json();
  assert.ok(antitrustResult.postMergerHhi > 1750);

  const retentionRes = await fetch(`${base}/api/corpdev/retention/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetId: defaultTarget.id,
      employeeName: 'Julian Mercer',
      jobTitle: 'VP Cloud Engineering',
      department: 'Infrastructure',
      annualCompensationUsd: 340000,
      unvestedEquityUsd: 850000,
      flightRiskScore: 34.0,
      retentionBonusPoolUsd: 400000,
      cliffPeriodMonths: 24
    })
  });
  assert.equal(retentionRes.status, 201);
  const retention = (await retentionRes.json()) as TalentRetentionDTO;
  assert.equal(retention.employeeName, 'Julian Mercer');
  assert.equal(retention.isLocked, true);

  const cfoSignoffRes = await fetch(`${base}/api/corpdev/targets/${defaultTarget.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      role: 'chief_financial_officer',
      signerName: 'Victoria Sterling (Chief Financial Officer)'
    })
  });
  assert.equal(cfoSignoffRes.status, 200);
  const afterCfo = (await cfoSignoffRes.json()) as BoardWarRoomDTO;
  assert.equal(afterCfo.cfoSignoff.signed, true);

  const ceoSignoffRes = await fetch(`${base}/api/corpdev/targets/${defaultTarget.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      role: 'chief_executive_officer',
      signerName: 'Marcus Vance (Chief Executive Officer & Board Chair)'
    })
  });
  assert.equal(ceoSignoffRes.status, 200);
  const afterCeo = (await ceoSignoffRes.json()) as BoardWarRoomDTO;
  assert.equal(afterCeo.ceoSignoff.signed, true);

  const userBOverviewRes = await fetch(`${base}/api/corpdev/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = (await userBOverviewRes.json()) as CorpDevOverviewDTO;
  const userBDefaultTarget = userBOverview.targets[0];
  assert.notEqual(userBDefaultTarget.id, defaultTarget.id);

  const userBCrossSignoffRes = await fetch(`${base}/api/corpdev/targets/${defaultTarget.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      role: 'vp_corporate_development',
      signerName: 'Unauthorized User B'
    })
  });
  assert.equal(userBCrossSignoffRes.status, 404);
});
