import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ExecutiveOnboardingPlanDTO,
  StakeholderDTO,
  OnboardingMilestoneDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 4200;

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
  const email = `exec_onboard_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.34.${forwardedIp++}`
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

test('executive-onboarding: GET /api/executive-onboarding requires authentication', async () => {
  const res = await fetch(`${base}/api/executive-onboarding`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('executive-onboarding: POST /api/executive-onboarding validates required fields', async () => {
  const invalidRes = await fetch(`${base}/api/executive-onboarding`, {
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

test('executive-onboarding: full plan lifecycle, multi-tenant isolation, stakeholders, milestones, and briefings', async () => {
  const createRes = await fetch(`${base}/api/executive-onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      companyName: 'Acme Cloud AI',
      roleTitle: 'VP of Engineering',
      startDate: '2026-10-01',
      currentDay: 20,
      executiveSponsorName: 'Sarah Jenkins'
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as ExecutiveOnboardingPlanDTO;
  assert.ok(created.id);
  assert.equal(created.companyName, 'Acme Cloud AI');
  assert.equal(created.roleTitle, 'VP of Engineering');
  assert.ok(created.stakeholders.length >= 5);
  assert.ok(created.milestones.length >= 6);
  assert.ok(created.momentum.transitionMomentumIndex >= 50);

  const getRes = await fetch(`${base}/api/executive-onboarding/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as ExecutiveOnboardingPlanDTO;
  assert.equal(fetched.id, created.id);

  const crossUserGet = await fetch(`${base}/api/executive-onboarding/${created.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserGet.status, 404);

  const updateRes = await fetch(`${base}/api/executive-onboarding/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ roleTitle: 'Senior Vice President of Engineering', currentDay: 25 })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ExecutiveOnboardingPlanDTO;
  assert.equal(updated.roleTitle, 'Senior Vice President of Engineering');
  assert.equal(updated.currentDay, 25);

  const addStakeholderRes = await fetch(`${base}/api/executive-onboarding/${created.id}/stakeholders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'Robert Chen',
      roleTitle: 'Staff SRE Architect',
      category: 'staff_principal',
      expectations: 'Observability standardization',
      painPoints: 'Alert fatigue',
      politicalDynamics: 'Influential technical lead',
      sentimentScore: 4,
      interviewDate: '2026-10-18',
      status: 'scheduled',
      alignmentLevel: 'strongly_aligned'
    })
  });
  assert.equal(addStakeholderRes.status, 201);
  const newStakeholder = await addStakeholderRes.json() as StakeholderDTO;
  assert.ok(newStakeholder.id);

  const crossUserUpdateStakeholder = await fetch(
    `${base}/api/executive-onboarding/${created.id}/stakeholders/${newStakeholder.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({ sentimentScore: 5 })
    }
  );
  assert.equal(crossUserUpdateStakeholder.status, 404);

  const updateStakeholderRes = await fetch(
    `${base}/api/executive-onboarding/${created.id}/stakeholders/${newStakeholder.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ status: 'completed', sentimentScore: 5 })
    }
  );
  assert.equal(updateStakeholderRes.status, 200);
  const updatedStakeholder = await updateStakeholderRes.json() as StakeholderDTO;
  assert.equal(updatedStakeholder.status, 'completed');
  assert.equal(updatedStakeholder.sentimentScore, 5);

  const deleteStakeholderRes = await fetch(
    `${base}/api/executive-onboarding/${created.id}/stakeholders/${newStakeholder.id}`,
    {
      method: 'DELETE',
      headers: { Origin: origin, Cookie: userA.cookie }
    }
  );
  assert.equal(deleteStakeholderRes.status, 200);

  const addMilestoneRes = await fetch(`${base}/api/executive-onboarding/${created.id}/milestones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      phase: 'phase_1_listen_align',
      title: 'Deploy Distributed Tracing in Gateway',
      description: 'Zero out blind spots in API edge routing',
      targetDay: 20,
      deliveredDay: null,
      status: 'in_progress',
      isQuickWin: true,
      deliveryEstimateDays: 5,
      impactScore: 8,
      blockerReason: null
    })
  });
  assert.equal(addMilestoneRes.status, 201);
  const newMilestone = await addMilestoneRes.json() as OnboardingMilestoneDTO;
  assert.ok(newMilestone.id);

  const crossUserUpdateMilestone = await fetch(
    `${base}/api/executive-onboarding/${created.id}/milestones/${newMilestone.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userB.cookie
      },
      body: JSON.stringify({ status: 'achieved' })
    }
  );
  assert.equal(crossUserUpdateMilestone.status, 404);

  const updateMilestoneRes = await fetch(
    `${base}/api/executive-onboarding/${created.id}/milestones/${newMilestone.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        Cookie: userA.cookie
      },
      body: JSON.stringify({ status: 'achieved', deliveredDay: 19 })
    }
  );
  assert.equal(updateMilestoneRes.status, 200);
  const updatedMilestone = await updateMilestoneRes.json() as OnboardingMilestoneDTO;
  assert.equal(updatedMilestone.status, 'achieved');
  assert.equal(updatedMilestone.deliveredDay, 19);

  const updateDiagRes = await fetch(`${base}/api/executive-onboarding/${created.id}/diagnostics`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      architectureTechDebt: {
        score: 85,
        primaryBottlenecks: ['Monolith billing extraction in flight'],
        immediateMitigations: ['Deploy async event bus'],
        actionPlan: 'Decouple core billing domains by Day 60'
      },
      deliveryVelocityIncidentCadence: {
        score: 80,
        primaryBottlenecks: ['Deploy frequency twice weekly'],
        immediateMitigations: ['Canary rollout stages'],
        actionPlan: 'Achieve daily releases by Day 60'
      },
      teamMoraleFlightRisks: {
        score: 85,
        primaryBottlenecks: ['On-call fatigue'],
        immediateMitigations: ['Staff SRE rotations'],
        actionPlan: 'Roll out blameless postmortems'
      },
      strategicProductEngineeringAlignment: {
        score: 90,
        primaryBottlenecks: ['Product roadmap misalignment'],
        immediateMitigations: ['Joint discovery triads'],
        actionPlan: 'Standardize quarterly OKRs'
      }
    })
  });
  assert.equal(updateDiagRes.status, 200);
  const withDiag = await updateDiagRes.json() as ExecutiveOnboardingPlanDTO;
  assert.equal(withDiag.diagnostics.diagnosticHealthIndex, 85);

  const memoRes = await fetch(
    `${base}/api/executive-onboarding/${created.id}/memo/day_30_listening_tour`,
    {
      headers: { Origin: origin, Cookie: userA.cookie }
    }
  );
  assert.equal(memoRes.status, 200);
  const memoData = await memoRes.json() as { markdown: string; title: string };
  assert.ok(memoData.markdown.includes('EXECUTIVE MEMO: Day 30 Listening Tour Insights'));
  assert.ok(memoData.markdown.includes('Acme Cloud AI'));

  const crossUserMemo = await fetch(
    `${base}/api/executive-onboarding/${created.id}/memo/day_30_listening_tour`,
    {
      headers: { Origin: origin, Cookie: userB.cookie }
    }
  );
  assert.equal(crossUserMemo.status, 404);

  const deleteRes = await fetch(`${base}/api/executive-onboarding/${created.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteRes.status, 204);

  const verifyDelete = await fetch(`${base}/api/executive-onboarding/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(verifyDelete.status, 404);
});
