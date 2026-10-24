import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type {
  OfferEvaluationDTO,
  OfferComparisonMatrixDTO,
  CounterOfferScriptDTO,
  OfferEvaluationInput
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 230;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = `http://127.0.0.1:${address.port}`;
const origin = 'http://127.0.0.1:64364';

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `offer_test_${randomUUID()}@example.com`;
  const pwd = 'StrongPassword123!';
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.9.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: pwd })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Missing session cookie on registration');
  return { userId: data.id, cookie };
}

test('Offer Evaluation: requires authentication', async () => {
  const res = await fetch(`${base}/api/ai/pro/offer-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({
      company: 'TechCorp',
      position: 'Staff Engineer',
      compensation: { baseSalaryMonthly: 50000000 }
    })
  });
  assert.equal(res.status, 401);
});

test('Offer Evaluation: rejects invalid payload with 422', async () => {
  const { cookie } = await registerUser();

  const missingRes = await fetch(`${base}/api/ai/pro/offer-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      company: '',
      position: 'Staff Engineer',
      compensation: { baseSalaryMonthly: 50000000 }
    })
  });
  assert.equal(missingRes.status, 422);

  const negSalaryRes = await fetch(`${base}/api/ai/pro/offer-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      company: 'TechCorp',
      position: 'Staff Engineer',
      compensation: { baseSalaryMonthly: -5000 }
    })
  });
  assert.equal(negSalaryRes.status, 422);
});

test('Offer Evaluation: computes TC breakdown, weighted score, and pros/cons', async () => {
  const { cookie } = await registerUser();

  const input: OfferEvaluationInput = {
    company: 'VNG Games',
    position: 'Principal Game Server Engineer',
    compensation: {
      baseSalaryMonthly: 65000000,
      currency: 'VND',
      bonusMonthsPerYear: 2,
      annualBonusCash: 50000000,
      stockOptionsOrEquityAnnual: 30000000,
      allowanceMonthly: 2500000
    },
    workplaceFactors: {
      workLifeBalance: 8,
      careerGrowth: 9,
      teamAndCulture: 8,
      remoteFlexibility: 8,
      companyReputationAndStability: 9,
      healthAndBenefits: 9
    }
  };

  const res = await fetch(`${base}/api/ai/pro/offer-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify(input)
  });

  assert.equal(res.status, 200);
  const data = await res.json() as OfferEvaluationDTO;

  assert.equal(data.company, 'VNG Games');
  assert.equal(data.position, 'Principal Game Server Engineer');
  assert.ok(data.weightedScore >= 75);
  assert.ok(['Xuất sắc', 'Tốt'].includes(data.grade));

  const expectedBase = 65000000 * 12;
  const expectedBonusMonths = 65000000 * 2;
  const expectedAllowance = 2500000 * 12;
  const expectedTC = expectedBase + expectedBonusMonths + expectedAllowance + 50000000 + 30000000;
  assert.equal(data.compensation.annualTotalCompensation, expectedTC);
  assert.equal(data.breakdownSummary.annualTotal, expectedTC);
  assert.ok(data.pros.length >= 2);
});

test('Offer Comparison: ranks multiple offers and computes winner metrics', async () => {
  const { cookie } = await registerUser();

  const offers: OfferEvaluationInput[] = [
    {
      applicationId: 'app-shopee',
      company: 'Shopee',
      position: 'Senior Backend Engineer',
      compensation: {
        baseSalaryMonthly: 70000000,
        bonusMonthsPerYear: 1
      },
      workplaceFactors: {
        workLifeBalance: 5,
        careerGrowth: 8
      }
    },
    {
      applicationId: 'app-remote',
      company: 'GitLab',
      position: 'Senior Backend Engineer',
      compensation: {
        baseSalaryMonthly: 55000000,
        bonusMonthsPerYear: 2
      },
      workplaceFactors: {
        workLifeBalance: 9,
        remoteFlexibility: 10
      }
    }
  ];

  const res = await fetch(`${base}/api/ai/pro/offer-compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({ offers })
  });

  assert.equal(res.status, 200);
  const matrix = await res.json() as OfferComparisonMatrixDTO;

  assert.equal(matrix.offers.length, 2);
  assert.equal(matrix.rankedOffers.length, 2);
  assert.equal(matrix.rankedOffers[0]?.rank, 1);
  assert.equal(matrix.rankedOffers[0]?.deltaScore, 0);
  assert.equal(matrix.bestCompensationOfferId, 'app-shopee');
  assert.equal(matrix.bestWorkLifeBalanceOfferId, 'app-remote');
  assert.ok(matrix.recommendationSummary.length > 20);
});

test('Counter Offer Generator: generates negotiation letter and call script', async () => {
  const { cookie } = await registerUser();

  const evalRes = await fetch(`${base}/api/ai/pro/offer-evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      company: 'MoMo',
      position: 'Staff DevOps Engineer',
      compensation: {
        baseSalaryMonthly: 50000000,
        currency: 'VND'
      }
    })
  });
  assert.equal(evalRes.status, 200);
  const offer = await evalRes.json() as OfferEvaluationDTO;

  const res = await fetch(`${base}/api/ai/pro/counter-offer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: cookie
    },
    body: JSON.stringify({
      offer,
      targetSalary: 60000000,
      tone: 'polite_confident',
      keyStrengths: ['Kubernetes', 'Terraform CI/CD', 'Cost Optimization']
    })
  });

  assert.equal(res.status, 200);
  const script = await res.json() as CounterOfferScriptDTO;

  assert.equal(script.tone, 'polite_confident');
  assert.equal(script.targetSalary, 60000000);
  assert.equal(script.targetIncreasePercent, 20);
  assert.ok(script.emailSubject.includes('MoMo'));
  assert.ok(script.emailBody.includes('60.000.000 VND'));
  assert.ok(script.shortScriptForCall.includes('60.000.000 VND'));
  assert.ok(script.talkingPoints.length >= 2);
  assert.ok(script.leverageItems.length >= 2);
  assert.ok(script.walkAwayAdvice.length > 10);
});
