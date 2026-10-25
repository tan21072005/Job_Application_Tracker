import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  SuccessionStudioOverviewDTO,
  TalentProfileDTO,
  CriticalRoleDTO,
  RetentionInterventionDTO,
  ExecutiveDevelopmentPlanDTO,
  SuccessionPlanDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9200;

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
  const email = `succession_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.42.${forwardedIp++}`
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

test('succession-pipeline-studio: GET /api/succession-pipeline-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/succession-pipeline-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('succession-pipeline-studio: POST /api/succession-pipeline-studio/talent-profiles validates payload', async () => {
  const res = await fetch(`${base}/api/succession-pipeline-studio/talent-profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      employeeId: '',
      fullName: '',
      performanceLevel: 5
    })
  });
  assert.equal(res.status, 400);
  const data = (await res.json()) as { code: string };
  assert.equal(data.code, 'invalid_talent_profile_payload');
});

test('succession-pipeline-studio: multi-tenant isolation and 404 security checks', async () => {
  const resOverviewA = await fetch(`${base}/api/succession-pipeline-studio/overview`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(resOverviewA.status, 200);
  const overviewA = (await resOverviewA.json()) as SuccessionStudioOverviewDTO;
  const userAPlanId = overviewA.plan.id;
  const userAProfileId = overviewA.talentProfiles[0].id;

  const crossDeleteRes = await fetch(`${base}/api/succession-pipeline-studio/talent-profiles/${userAProfileId}`, {
    method: 'DELETE',
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(crossDeleteRes.status, 404);

  const crossSignOffRes = await fetch(`${base}/api/succession-pipeline-studio/plan/${userAPlanId}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'vp_talent_management',
      comments: 'Unauthorized sign-off attempt'
    })
  });
  assert.equal(crossSignOffRes.status, 404);
});

test('succession-pipeline-studio: complete 5-pillar lifecycle, talent calibration, and tripartite sign-offs', async () => {
  const resOverview = await fetch(`${base}/api/succession-pipeline-studio/overview`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(resOverview.status, 200);
  const overview = (await resOverview.json()) as SuccessionStudioOverviewDTO;

  assert.ok(overview.plan);
  assert.ok(overview.talentProfiles.length >= 8);
  assert.ok(overview.benchDepth.totalCriticalRoles >= 4);
  assert.ok(overview.calibrationDistribution.starsCount >= 1);
  assert.ok(overview.plan.successionHealthScore > 0);

  const newProfileRes = await fetch(`${base}/api/succession-pipeline-studio/talent-profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      employeeId: 'EXEC-009',
      fullName: 'Vikram Joshi',
      currentRole: 'VP of AI Research',
      department: 'AI & Data Science',
      tenureYears: 2.5,
      yearsInCurrentRole: 1.5,
      performanceLevel: 3,
      potentialLevel: 3,
      totalDirectCompensationUsd: 420000,
      marketBenchmarkP75Usd: 400000,
      unvestedEquityValueUsd: 700000,
      monthsToEquityCliff: 18,
      organizationalChangeImpact: 0.2,
      spofSeverity: 5,
      operationalCriticality: 5,
      replacementDifficulty: 5,
      underrepresentedLeader: false
    })
  });
  assert.equal(newProfileRes.status, 201);
  const newProfile = (await newProfileRes.json()) as TalentProfileDTO;
  assert.equal(newProfile.nineBoxClassification, 'star');
  assert.equal(newProfile.nineBoxCalibrationScore, 100);
  assert.equal(newProfile.keyPersonRiskIndex, 100);

  const interventionRes = await fetch(`${base}/api/succession-pipeline-studio/interventions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      talentProfileId: newProfile.id,
      playbookType: 'retention_equity_refresh',
      title: 'AI VP Retention Grant',
      description: 'Special equity refresh grant for key generative AI research lead',
      proposedCostUsd: 250000,
      status: 'proposed',
      triggerRationale: 'Key person index 100 warrants aggressive retention lock',
      targetCompletionDate: '2026-12-31'
    })
  });
  assert.equal(interventionRes.status, 201);
  const intervention = (await interventionRes.json()) as RetentionInterventionDTO;

  const patchInterventionRes = await fetch(`${base}/api/succession-pipeline-studio/interventions/${intervention.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      status: 'approved',
      authorizedBy: 'Board Compensation Committee'
    })
  });
  assert.equal(patchInterventionRes.status, 200);
  const updatedIntervention = (await patchInterventionRes.json()) as RetentionInterventionDTO;
  assert.equal(updatedIntervention.status, 'approved');

  const ctoRole = overview.plan.criticalRoles.find(r => r.title === 'Chief Technology Officer');
  assert.ok(ctoRole);

  const addSuccessorRes = await fetch(`${base}/api/succession-pipeline-studio/successors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      criticalRoleId: ctoRole.id,
      talentProfileId: newProfile.id,
      readinessHorizon: 'ready_1_2_years',
      rankingOrder: 3,
      notes: 'Frontier AI researcher with strong technical vision'
    })
  });
  assert.equal(addSuccessorRes.status, 201);

  const sign1Res = await fetch(`${base}/api/succession-pipeline-studio/plan/${overview.plan.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'vp_talent_management',
      comments: 'All 9-box calibration ratings verified against performance data'
    })
  });
  assert.equal(sign1Res.status, 200);
  const planAfterSign1 = (await sign1Res.json()) as SuccessionPlanDTO;
  assert.equal(planAfterSign1.status, 'pending_cpo');

  const sign2Res = await fetch(`${base}/api/succession-pipeline-studio/plan/${overview.plan.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'chief_people_officer',
      comments: 'Retention packages budgeted and approved by CPO'
    })
  });
  assert.equal(sign2Res.status, 200);
  const planAfterSign2 = (await sign2Res.json()) as SuccessionPlanDTO;
  assert.equal(planAfterSign2.status, 'pending_ceo');

  const sign3Res = await fetch(`${base}/api/succession-pipeline-studio/plan/${overview.plan.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: 'ceo',
      comments: 'Approved for presentation to Board Nominations Committee'
    })
  });
  assert.equal(sign3Res.status, 200);
  const planAfterSign3 = (await sign3Res.json()) as SuccessionPlanDTO;
  assert.equal(planAfterSign3.status, 'board_approved');
  assert.ok(planAfterSign3.boardMemorandumMarkdown.includes('Executive Board Memorandum'));
  assert.ok(planAfterSign3.signOffs.every(s => s.isApproved));
});
