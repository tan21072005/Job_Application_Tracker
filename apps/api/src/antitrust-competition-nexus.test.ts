import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, antitrustCompetitionNexusService } from './server.ts';
import type {
  AntitrustCompetitionOverview,
  AntitrustMergerTransaction,
  AntitrustRelevantMarket,
  RemedyDivestiturePackage,
  AntitrustTripartiteRatification
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9920;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await antitrustCompetitionNexusService.ensureSchema();
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
  const email = `antitrust_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.55.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('antitrust-competition-nexus: GET /api/antitrust/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/antitrust/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('antitrust-competition-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badTx = await fetch(`${base}/api/antitrust/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badTx.status, 400);

  const badMarket = await fetch(`${base}/api/antitrust/markets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ transactionId: 'test' })
  });
  assert.equal(badMarket.status, 400);

  const badRemedy = await fetch(`${base}/api/antitrust/remedies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ transactionId: 'test', packageName: 'test' })
  });
  assert.equal(badRemedy.status, 400);

  const badSignoff = await fetch(`${base}/api/antitrust/signoff`, {
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

test('antitrust-competition-nexus: complete lifecycle with transaction creation, market definition, remedy proposal, tripartite signoff, and reset', async () => {
  const initialOverviewRes = await fetch(`${base}/api/antitrust/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(initialOverviewRes.status, 200);
  const initialOverview = (await initialOverviewRes.json()) as AntitrustCompetitionOverview;
  assert.ok(initialOverview.transaction.dealCodename === 'PROJECT AEGIS TITAN');
  assert.ok(initialOverview.hsrAssessment.isHsrFilingRequired);
  assert.ok(initialOverview.secondRequest !== null);
  assert.ok(initialOverview.relevantMarkets.length >= 2);
  assert.ok(initialOverview.marketParticipants.length >= 6);
  assert.ok(initialOverview.guppiAnalyses.length >= 2);
  assert.ok(initialOverview.globalFilings.length >= 5);
  assert.ok(initialOverview.remedyPackages.length >= 2);
  assert.ok(initialOverview.cleanTeamProtocol !== null);
  assert.ok(initialOverview.litigationDocket !== null);
  assert.ok(initialOverview.ratification !== null);
  assert.ok(initialOverview.auditLogs.length >= 5);
  assert.ok(initialOverview.metrics.maxPostMergerHhi >= 1800);
  assert.ok(initialOverview.metrics.overallClearanceRiskScore >= 50);

  const createTxRes = await fetch(`${base}/api/antitrust/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      dealCodename: 'PROJECT CYBER MATRIX',
      acquirerName: 'Quantum Cloud Global',
      targetName: 'OmniSecure Data Systems',
      enterpriseValueUsd: 8400000000,
      cashConsiderationUsd: 5000000000,
      stockConsiderationUsd: 3400000000,
      announcedDate: '2026-10-01',
      targetedClosingDate: '2027-08-30',
      dealStructureType: 'horizontal_merger',
      reverseTerminationFeePct: 5.0
    })
  });
  assert.equal(createTxRes.status, 201);
  const newTx = (await createTxRes.json()) as AntitrustMergerTransaction;
  assert.ok(newTx.id);
  assert.equal(newTx.dealCodename, 'PROJECT CYBER MATRIX');
  assert.equal(newTx.reverseTerminationFeeUsd, 420000000);

  const createMarketRes = await fetch(`${base}/api/antitrust/markets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: newTx.id,
      marketName: 'Identity & Access Threat Intelligence Platforms',
      productMarketDefinition: 'Zero-trust continuous authentication and telemetry analytics engines',
      geographicMarketScope: 'North America & European Union',
      totalMarketSizeUsd: 12000000000,
      ssnipTestCriticalLossPct: 9.0,
      hypotheticalMonopolistTestPassed: true,
      participantShares: [
        { participantName: 'Quantum Cloud', isMergingParty: true, isAcquirer: true, isTarget: false, annualRevenueUsd: 3600000000, marketSharePct: 30 },
        { participantName: 'OmniSecure Data', isMergingParty: true, isAcquirer: false, isTarget: true, annualRevenueUsd: 2400000000, marketSharePct: 20 },
        { participantName: 'Competitor CyberOne', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 2400000000, marketSharePct: 20 },
        { participantName: 'Competitor SecureNet', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 1800000000, marketSharePct: 15 },
        { participantName: 'Other Vendors', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 1800000000, marketSharePct: 15 }
      ]
    })
  });
  assert.equal(createMarketRes.status, 201);
  const newMarket = (await createMarketRes.json()) as AntitrustRelevantMarket;
  assert.ok(newMarket.id);
  assert.equal(newMarket.deltaHhi, 1200);
  assert.equal(newMarket.concentrationTier, 'dominant_firm_threshold');
  assert.equal(newMarket.presumptionRebuttableUnlawful, true);

  const createRemedyRes = await fetch(`${base}/api/antitrust/remedies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: newTx.id,
      packageName: 'OmniSecure Endpoint Telemetry Division Carve-Out',
      remedyType: 'fix_it_first_buyer_sale',
      carveoutBusinessUnit: 'Endpoint Detection & Response (EDR) Business Unit',
      carveoutRevenueUsd: 1100000000,
      carveoutEbitdaUsd: 280000000,
      upfrontBuyerName: 'Sentinel Defense Holdings',
      upfrontBuyerViabilityScore: 92.0,
      assetOverlapMitigatedPct: 88.0,
      standaloneViabilityScore: 86.0,
      cleanTeamComplianceScore: 94.0,
      behavioralCommitmentsScore: 82.0
    })
  });
  assert.equal(createRemedyRes.status, 201);
  const newRemedy = (await createRemedyRes.json()) as RemedyDivestiturePackage;
  assert.ok(newRemedy.id);
  assert.ok(newRemedy.remedyDefensibilityIndex >= 75.0);

  const signoff1Res = await fetch(`${base}/api/antitrust/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: newTx.id,
      role: 'antitrust_lead_counsel',
      signerName: 'Victoria Sterling, Esq.',
      statementAcknowledged: 'Lead regulatory review and HSR statutory assessment executed.'
    })
  });
  assert.equal(signoff1Res.status, 200);
  const ratif1 = (await signoff1Res.json()) as AntitrustTripartiteRatification;
  assert.equal(ratif1.leadCounselSigned, true);
  assert.equal(ratif1.isFullyRatified, false);

  const signoff2Res = await fetch(`${base}/api/antitrust/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: newTx.id,
      role: 'chief_legal_officer',
      signerName: 'Alexander Hayes, Esq.',
      statementAcknowledged: 'Corporate governance and Clayton Act compliance ratified.'
    })
  });
  assert.equal(signoff2Res.status, 200);
  const ratif2 = (await signoff2Res.json()) as AntitrustTripartiteRatification;
  assert.equal(ratif2.generalCounselSigned, true);
  assert.equal(ratif2.isFullyRatified, false);

  const signoff3Res = await fetch(`${base}/api/antitrust/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      transactionId: newTx.id,
      role: 'chief_executive_officer',
      signerName: 'Julian Vance',
      statementAcknowledged: 'Executive sign-off on regulatory commitments and divestiture covenants.'
    })
  });
  assert.equal(signoff3Res.status, 200);
  const ratif3 = (await signoff3Res.json()) as AntitrustTripartiteRatification;
  assert.equal(ratif3.chiefExecutiveOfficerSigned, true);
  assert.equal(ratif3.isFullyRatified, true);
  assert.ok(ratif3.cryptographicIntegrityHash.startsWith('sha256-ratif-'));

  const resetRes = await fetch(`${base}/api/antitrust/reset-demo`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(resetRes.status, 200);
  const resetOverview = (await resetRes.json()) as AntitrustCompetitionOverview;
  assert.equal(resetOverview.transaction.dealCodename, 'PROJECT AEGIS TITAN');
});

test('antitrust-competition-nexus: multi-tenant boundary ensures User B cannot access User A data', async () => {
  const userAOverviewRes = await fetch(`${base}/api/antitrust/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(userAOverviewRes.status, 200);
  const userAOverview = (await userAOverviewRes.json()) as AntitrustCompetitionOverview;

  const userBOverviewRes = await fetch(`${base}/api/antitrust/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = (await userBOverviewRes.json()) as AntitrustCompetitionOverview;

  assert.notEqual(userAOverview.transaction.id, userBOverview.transaction.id);
  assert.notEqual(userAOverview.hsrAssessment.id, userBOverview.hsrAssessment.id);
  assert.notEqual(userAOverview.ratification.id, userBOverview.ratification.id);

  const crossSignoff = await fetch(`${base}/api/antitrust/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      transactionId: userAOverview.transaction.id,
      role: 'chief_executive_officer',
      signerName: 'Hostile Actor',
      statementAcknowledged: 'Unauthorized takeover attempt'
    })
  });
  assert.ok(crossSignoff.status >= 400);
});
