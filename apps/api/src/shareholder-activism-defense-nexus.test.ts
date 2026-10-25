import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, shareholderActivismDefenseNexusService } from './server.ts';
import type {
  ShareholderActivismOverview,
  ActivistCampaign,
  WolfpackAccumulation,
  ShareholderRightsPlan,
  DirectorSlateNominee,
  ActivismTripartiteSignoffRecord
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9880;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await shareholderActivismDefenseNexusService.ensureSchema();
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
  const email = `activism_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.54.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('shareholder-activism-defense-nexus: GET /api/activism/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/activism/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('shareholder-activism-defense-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badCampaign = await fetch(`${base}/api/activism/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badCampaign.status, 400);

  const badWolfpack = await fetch(`${base}/api/activism/wolfpack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badWolfpack.status, 400);

  const badRightsPlan = await fetch(`${base}/api/activism/rights-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ flipInThresholdPercentage: 1 })
  });
  assert.equal(badRightsPlan.status, 400);

  const badNominee = await fetch(`${base}/api/activism/nominees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badNominee.status, 400);

  const badSignoff = await fetch(`${base}/api/activism/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badSignoff.status, 400);
});

test('shareholder-activism-defense-nexus: complete lifecycle with campaign creation, wolfpack accumulation, rights plan deployment, nominee comparison, and tripartite signoff', async () => {
  const initialOverviewRes = await fetch(`${base}/api/activism/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(initialOverviewRes.status, 200);
  const initialOverview = (await initialOverviewRes.json()) as ShareholderActivismOverview;
  assert.ok(initialOverview.targetCorporation.ticker === 'TGT');
  assert.ok(initialOverview.primaryCampaign.percentageOwnership > 0);
  assert.ok(initialOverview.wolfpackAccumulations.length >= 3);
  assert.ok(initialOverview.wolfpackCoordinationIndex > 0);
  assert.ok(initialOverview.vulnerabilityAudit.compositeVulnerabilityScore > 0);
  assert.ok(initialOverview.sotpSegments.length >= 4);
  assert.ok(initialOverview.institutionalCohorts.length >= 8);
  assert.ok(initialOverview.proxyAdvisorEvaluations.length >= 2);

  const campaignRes = await fetch(`${base}/api/activism/campaigns`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      activistFundName: 'Elliott Opportunity Partners LP',
      leadPartnerName: 'Marcus Davenport',
      campaignPhase: 'public_campaign_whitepaper',
      threatTier: 'tier_1_hostile_wolfpack',
      primaryDemand: 'spinoff_carveout_divestiture',
      sharesHeldCount: 9500000,
      percentageOwnership: 9.50,
      syntheticSwapPercentage: 3.20,
      schedule13dFilingDate: '2026-10-20',
      demandSummary: 'Published 84-page presentation demanding immediate sale of infrastructure assets and board overhaul.',
      estimatedCampaignBudgetUsd: 22000000
    })
  });
  assert.equal(campaignRes.status, 201);
  const campaign = (await campaignRes.json()) as ActivistCampaign;
  assert.ok(campaign.id);
  assert.equal(campaign.effectiveEconomicExposure, 12.70);

  const wolfRes = await fetch(`${base}/api/activism/wolfpack`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      campaignId: campaign.id,
      fundName: 'Gotham Arbitrage Alpha',
      ownershipPercentage: 4.10,
      derivativeExposurePercentage: 1.80,
      accumulationVelocitySharesPerDay: 55000,
      coordinationCorrelationScore: 89,
      schedule13dCrossDate: '2026-10-18'
    })
  });
  assert.equal(wolfRes.status, 201);
  const wolf = (await wolfRes.json()) as WolfpackAccumulation;
  assert.ok(wolf.id);
  assert.equal(wolf.isWithin5DayStatutoryWindow, true);

  const pillRes = await fetch(`${base}/api/activism/rights-plan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      planName: 'Titan Board Emergency Rights Plan 2026',
      flipInThresholdPercentage: 12.5,
      exercisePriceUsd: 140.0,
      discountPercentage: 50.0,
      expirationDate: '2027-10-24'
    })
  });
  assert.equal(pillRes.status, 201);
  const pill = (await pillRes.json()) as ShareholderRightsPlan;
  assert.ok(pill.id);
  assert.equal(pill.status, 'active_in_place');
  assert.equal(pill.flipInThresholdPercentage, 12.5);

  const nomineeRes = await fetch(`${base}/api/activism/nominees`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      seatNumber: 4,
      incumbentName: 'Sarah Jenkins, Audit Committee',
      incumbentYearsServed: 6,
      incumbentCommitteeRoles: 'Risk & Audit Committee',
      incumbentSkills: 'Securities Law & Corporate Finance',
      dissidentName: 'Arthur Vance',
      dissidentAffiliation: 'Elliott Opportunity',
      dissidentExpertise: 'Hostile Spin-off Execution',
      proxyAdvisorRecommendedSlate: 'incumbent'
    })
  });
  assert.equal(nomineeRes.status, 201);
  const nominee = (await nomineeRes.json()) as DirectorSlateNominee;
  assert.ok(nominee.id);
  assert.equal(nominee.seatNumber, 4);

  const signoff1Res = await fetch(`${base}/api/activism/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      campaignId: initialOverview.primaryCampaign.id,
      role: 'lead_independent_director',
      signerName: 'Margaret Holloway, Lead Independent Director',
      statementAcknowledged: 'Fiduciary defense charter ratified under Delaware DGCL Section 141.'
    })
  });
  assert.equal(signoff1Res.status, 200);
  const signoff1 = (await signoff1Res.json()) as ActivismTripartiteSignoffRecord;
  assert.equal(signoff1.leadDirectorSignoff.isSigned, true);
  assert.equal(signoff1.isFullyRatified, false);

  const signoff2Res = await fetch(`${base}/api/activism/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      campaignId: initialOverview.primaryCampaign.id,
      role: 'nominating_governance_chair',
      signerName: 'David Montgomery, Nominating Chair',
      statementAcknowledged: 'Nominee matrix and Universal Proxy Card compliance certified.'
    })
  });
  assert.equal(signoff2Res.status, 200);
  const signoff2 = (await signoff2Res.json()) as ActivismTripartiteSignoffRecord;
  assert.equal(signoff2.governanceChairSignoff.isSigned, true);
  assert.equal(signoff2.isFullyRatified, false);

  const signoff3Res = await fetch(`${base}/api/activism/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      campaignId: initialOverview.primaryCampaign.id,
      role: 'board_chair_ceo',
      signerName: 'Elena Rostova, CEO & Board Chair',
      statementAcknowledged: 'Final boardroom ratification and defense deployment authorized.'
    })
  });
  assert.equal(signoff3Res.status, 200);
  const signoff3 = (await signoff3Res.json()) as ActivismTripartiteSignoffRecord;
  assert.equal(signoff3.boardChairCeoSignoff.isSigned, true);
  assert.equal(signoff3.isFullyRatified, true);
  assert.ok(signoff3.cryptographicIntegrityHash.length > 20);

  const userBOverviewRes = await fetch(`${base}/api/activism/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = (await userBOverviewRes.json()) as ShareholderActivismOverview;
  assert.notEqual(userBOverview.primaryCampaign.id, campaign.id);
});
