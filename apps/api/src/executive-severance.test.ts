import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ExecutiveSeveranceCaseDTO,
  GoodReasonEventDTO,
  SeveranceCounterProposalDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 6100;

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
  const email = `exec_severance_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.36.${forwardedIp++}`
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

test('executive-severance: GET /api/executive-severance requires authentication', async () => {
  const res = await fetch(`${base}/api/executive-severance`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('executive-severance: POST /api/executive-severance validates payload', async () => {
  const invalidRes = await fetch(`${base}/api/executive-severance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ companyName: '' })
  });
  assert.equal(invalidRes.status, 422);
});

test('executive-severance: full case lifecycle, good reason events, counter-proposals, and tenant isolation', async () => {
  const listInitialRes = await fetch(`${base}/api/executive-severance`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listInitialRes.status, 200);
  const initialCases = await listInitialRes.json() as ExecutiveSeveranceCaseDTO[];
  assert.ok(initialCases.length >= 1);
  const seededCase = initialCases[0];
  assert.equal(seededCase.companyName, 'Apex Cloud Systems');
  assert.ok(seededCase.auditResult.generosityScore > 0);
  assert.ok(seededCase.cicResult.commonSharePriceUsd > 0);

  const newCasePayload = {
    companyName: 'Vanguard AI Labs',
    roleTitle: 'Chief Technology Officer',
    effectiveSeparationDate: '2026-12-15',
    severanceParams: {
      annualBaseSalaryUsd: 450000,
      cashContinuationMonths: 12,
      targetBonusPercentage: 40,
      bonusProrationMode: 'target',
      companyPerformanceMultiplier: 1.0,
      daysWorkedInFiscalYear: 320,
      monthlyCobraCostUsd: 2800,
      cobraSubsidizedMonths: 12,
      cobraTaxGrossedUp: true,
      outplacementBudgetUsd: 20000,
      accruedPtoDays: 14,
      statutoryPtoVestingMandated: true,
      unlimitedPtoForfeitureRisk: false,
      ptewMonths: 36,
      optionsHeldCount: 100000,
      estimatedExerciseCostUsd: 150000
    },
    cicWaterfallParams: {
      enterpriseValuationUsd: 500000000,
      fundedDebtUsd: 30000000,
      balanceSheetCashUsd: 20000000,
      transactionFeePercent: 2.0,
      escrowHoldbackPercent: 5.0,
      preferredSharesStack: [
        { seriesName: 'Series A', investedAmountUsd: 20000000, liquidationMultiple: 1.0, isParticipating: false },
        { seriesName: 'Series B', investedAmountUsd: 50000000, liquidationMultiple: 1.0, isParticipating: false }
      ],
      totalFullyDilutedCommonShares: 30000000,
      unvestedOptionsCount: 150000,
      unvestedOptionsStrikePriceUsd: 2.00,
      unvestedRsuCount: 50000,
      vestedOptionsCount: 200000,
      vestedOptionsStrikePriceUsd: 2.00,
      vestedRsuCount: 30000,
      triggerMode: 'double_trigger',
      accelerationExtent: 'full_100_percent',
      cicProtectionWindowMonths: 12
    },
    tax280GParams: {
      w2History5YearsUsd: [350000, 380000, 420000, 460000, 500000],
      contingentCashSeveranceUsd: 450000,
      contingentBonusUsd: 157808,
      contingentEquityAccelerationUsd: 1800000,
      contingentOtherBenefitsUsd: 50000,
      federalMarginalTaxRate: 37,
      stateMarginalTaxRate: 13.3,
      medicareMarginalTaxRate: 2.35,
      corporateTaxRate: 21,
      agreedSettlementType: 'best_net_valley_rule'
    },
    counterProposalParams: {
      requestedCashMonths: 18,
      requestedBonusPercent: 100,
      requestedCobraMonths: 18,
      requestedPtewYears: 10,
      requestedAccelerationExtent: 'full_100_percent',
      requestedLegalFeeAllowanceUsd: 35000,
      requireMutualRelease: true,
      requireMutualNonDisparagement: true,
      statutoryWhistleblowerCarveoutsConfirmed: true,
      leverageFactors: {
        busFactorScore: 25,
        keyPersonClosingCondition: true,
        teamFlightRiskScore: 20,
        patentInventorshipCount: 4,
        constructiveDischargeMeritScore: 15
      }
    }
  };

  const createRes = await fetch(`${base}/api/executive-severance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify(newCasePayload)
  });
  assert.equal(createRes.status, 201);
  const createdCase = await createRes.json() as ExecutiveSeveranceCaseDTO;
  assert.equal(createdCase.companyName, 'Vanguard AI Labs');
  assert.equal(createdCase.auditResult.generosityTier, 'executive_favorable');
  assert.ok(createdCase.cicResult.executiveNetLiquidProceedsUsd > 1000000);

  const getRes = await fetch(`${base}/api/executive-severance/${createdCase.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as ExecutiveSeveranceCaseDTO;
  assert.equal(fetched.id, createdCase.id);

  const updateRes = await fetch(`${base}/api/executive-severance/${createdCase.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      companyName: 'Vanguard AI Labs (Acquired)',
      severanceParams: {
        ...newCasePayload.severanceParams,
        cashContinuationMonths: 18
      }
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ExecutiveSeveranceCaseDTO;
  assert.equal(updated.companyName, 'Vanguard AI Labs (Acquired)');
  assert.equal(updated.severanceParams.cashContinuationMonths, 18);

  const addEventRes = await fetch(`${base}/api/executive-severance/${createdCase.id}/good-reason-events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      category: 'diminution_of_duties',
      title: 'Reporting Line Demotion After Acquisition',
      factualDescription: 'Reporting changed from CEO to SVP of Business Operations without mutual consent.',
      dateConditionOccurred: '2026-11-01',
      dateNoticeServed: '2026-11-04'
    })
  });
  assert.equal(addEventRes.status, 201);
  const addedEvent = await addEventRes.json() as GoodReasonEventDTO;
  assert.equal(addedEvent.title, 'Reporting Line Demotion After Acquisition');
  assert.ok(addedEvent.curePeriodDeadline !== null);

  const counterRes = await fetch(`${base}/api/executive-severance/${createdCase.id}/counter-proposal`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(counterRes.status, 201);
  const counterProposal = await counterRes.json() as SeveranceCounterProposalDTO;
  assert.ok(counterProposal.leverageIndex >= 80);
  assert.ok(counterProposal.memoMarkdown.includes('CONFIDENTIAL EXECUTIVE SEPARATION MEMORANDUM'));

  const crossUserGetRes = await fetch(`${base}/api/executive-severance/${createdCase.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserGetRes.status, 404);

  const crossUserUpdateRes = await fetch(`${base}/api/executive-severance/${createdCase.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ companyName: 'Hacked Company' })
  });
  assert.equal(crossUserUpdateRes.status, 404);

  const deleteEventRes = await fetch(`${base}/api/executive-severance/good-reason-events/${addedEvent.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteEventRes.status, 204);

  const deleteCaseRes = await fetch(`${base}/api/executive-severance/${createdCase.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteCaseRes.status, 204);
});
