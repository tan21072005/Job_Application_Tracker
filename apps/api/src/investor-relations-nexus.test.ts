import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, investorRelationsNexusService } from './server.ts';
import type {
  InvestorRelationsOverviewDTO,
  ActivistVulnerabilityResultDTO,
  NonGaapReconciliationResultDTO,
  NdrInvestorMeetingDTO,
  CapitalScenarioResultDTO,
  SecForm8KDisclosureDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9970;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await investorRelationsNexusService.ensureSchema();
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
  const email = `ir_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.50.${forwardedIp++}`
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

test('investor-relations-nexus: GET /api/ir/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/ir/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('investor-relations-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badActivist = await fetch(`${base}/api/ir/activist/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ tsrUnderperformancePercent: 'bad' })
  });
  assert.equal(badActivist.status, 400);

  const badEarnings = await fetch(`${base}/api/ir/earnings/reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ fiscalQuarter: '' })
  });
  assert.equal(badEarnings.status, 400);

  const badMeeting = await fetch(`${base}/api/ir/roadshow/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ institutionName: 'A' })
  });
  assert.equal(badMeeting.status, 400);

  const badCapital = await fetch(`${base}/api/ir/capital/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ scenarioName: 'X' })
  });
  assert.equal(badCapital.status, 400);

  const badSignoff = await fetch(`${base}/api/ir/disclosures/00000000-0000-0000-0000-000000000000/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ role: 'invalid_role' })
  });
  assert.equal(badSignoff.status, 400);
});

test('investor-relations-nexus: full operational lifecycle and multi-tenant isolation', async () => {
  const overviewRes = await fetch(`${base}/api/ir/overview`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as InvestorRelationsOverviewDTO;
  assert.equal(overview.tickerSymbol, 'JBTR');
  assert.equal(overview.marketCapUsd, 4837500000.00);
  assert.ok(overview.capTable.shareClasses.length >= 2);
  assert.ok(overview.capTable.topShareholders.length >= 8);
  assert.ok(overview.earnings.consensusMetrics.length >= 4);
  assert.ok(overview.compositeIsiScore >= 80.0);

  const activistRes = await fetch(`${base}/api/ir/activist/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      tsrUnderperformancePercent: 6.0,
      valuationDiscountPercent: 8.5,
      governanceDefenseScore: 85.0,
      freeCashFlowMarginGap: 3.0,
      activistOwnershipPercent: 2.0
    })
  });
  assert.equal(activistRes.status, 200);
  const activistResult = (await activistRes.json()) as ActivistVulnerabilityResultDTO;
  assert.ok(activistResult.compositeAvisScore < 30.0);
  assert.equal(activistResult.riskLevel, 'fortified_low');

  const reconcileRes = await fetch(`${base}/api/ir/earnings/reconcile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      fiscalQuarter: 'Q3-2026',
      gaapNetIncomeUsd: 18400000.00,
      stockBasedCompensationUsd: 8200000.00,
      amortizationIntangiblesUsd: 3800000.00,
      acquisitionRestructuringCostsUsd: 1200000.00,
      taxEffectOfAdjustmentsUsd: 2100000.00,
      interestExpenseUsd: 1000000.00,
      provisionForTaxesUsd: 1400000.00,
      depreciationUsd: 2500000.00
    })
  });
  assert.equal(reconcileRes.status, 200);
  const reconResult = (await reconcileRes.json()) as NonGaapReconciliationResultDTO;
  assert.ok(reconResult.adjustedEbitdaUsd > 30000000.00);
  assert.ok(reconResult.cautionaryStatementMarkdown.includes('Regulation G'));

  const meetingRes = await fetch(`${base}/api/ir/roadshow/meetings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      institutionName: 'Wellington Management Company LLP',
      leadInvestorName: 'Marcus Bradley, Managing Director',
      investorType: 'fundamental_long_only',
      meetingDate: '2026-10-25',
      meetingFormat: 'one_on_one_in_person',
      executiveAttendees: ['David Chen (CEO)', 'Alexander Vance (VP IR)'],
      sentimentScore: 0.85,
      keyTopics: ['AI infrastructure unit economics', 'Rule 10b-18 share repurchases'],
      followUps: ['Deliver detailed capex forecast']
    })
  });
  assert.equal(meetingRes.status, 201);
  const meetingResult = (await meetingRes.json()) as NdrInvestorMeetingDTO;
  assert.equal(meetingResult.institutionName, 'Wellington Management Company LLP');
  assert.equal(meetingResult.sentimentScore, 0.85);

  const capitalRes = await fetch(`${base}/api/ir/capital/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      scenarioName: 'Series Convertible Senior Notes 2031',
      financingType: 'convertible_senior_notes',
      grossAmountUsd: 200000000.00,
      stockPriceUsd: 64.50,
      costOfEquityPercent: 10.85,
      preTaxCostOfDebtPercent: 5.00,
      marginalTaxRatePercent: 21.00,
      currentAnnualNetIncomeUsd: 120000000.00,
      currentSharesCount: 75000000
    })
  });
  assert.equal(capitalRes.status, 200);
  const capitalResult = (await capitalRes.json()) as CapitalScenarioResultDTO;
  assert.ok(capitalResult.netProceedsUsd > 190000000.00);
  assert.ok(capitalResult.calculatedWaccPercent > 0);

  const gen8KRes = await fetch(`${base}/api/ir/disclosures/generate-8k`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      fiscalQuarter: 'Q3-2026',
      filingTitle: 'Current Report under Item 2.02 and Item 7.01',
      includeItem202: true,
      includeItem701: true
    })
  });
  assert.equal(gen8KRes.status, 201);
  const gen8K = (await gen8KRes.json()) as SecForm8KDisclosureDTO;
  assert.equal(gen8K.status, 'draft');
  assert.ok(gen8K.markdownContent.includes('FORM 8-K'));

  const userBSignoffRes = await fetch(`${base}/api/ir/disclosures/${gen8K.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'vp_investor_relations',
      signerName: 'Unauthorized Attacker',
      verificationNotes: 'Illegitimate attempt'
    })
  });
  assert.equal(userBSignoffRes.status, 404);

  const signoffVpRes = await fetch(`${base}/api/ir/disclosures/${gen8K.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'vp_investor_relations',
      signerName: 'Alexander Vance',
      verificationNotes: 'Audited consensus models and Reg G reconciliations.'
    })
  });
  assert.equal(signoffVpRes.status, 200);
  const vpSigned = (await signoffVpRes.json()) as SecForm8KDisclosureDTO;
  assert.equal(vpSigned.status, 'vp_ir_certified');

  const signoffCfoRes = await fetch(`${base}/api/ir/disclosures/${gen8K.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'chief_financial_officer',
      signerName: 'Elena Rostova',
      verificationNotes: 'Approved financial statements and forward guidance.'
    })
  });
  assert.equal(signoffCfoRes.status, 200);
  const cfoSigned = (await signoffCfoRes.json()) as SecForm8KDisclosureDTO;
  assert.equal(cfoSigned.status, 'cfo_approved');

  const signoffCeoRes = await fetch(`${base}/api/ir/disclosures/${gen8K.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'chief_executive_officer',
      signerName: 'David Chen',
      verificationNotes: 'Ratified strategic disclosure and authorized EDGAR transmission.'
    })
  });
  assert.equal(signoffCeoRes.status, 200);
  const ceoSigned = (await signoffCeoRes.json()) as SecForm8KDisclosureDTO;
  assert.equal(ceoSigned.status, 'ceo_ratified');
  assert.equal(ceoSigned.signoffs.length, 3);
});
