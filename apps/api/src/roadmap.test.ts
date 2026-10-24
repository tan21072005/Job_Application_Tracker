import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { CareerRoadmapDTO, SkillGapAnalysisDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1100;

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
  const email = `roadmap_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.17.${forwardedIp++}`
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

async function createApplication(userCookie: string, company: string, position: string, notes?: string): Promise<string> {
  const res = await fetch(`${base}/api/applications`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userCookie,
      Origin: origin,
      'Idempotency-Key': randomUUID()
    },
    body: JSON.stringify({
      company,
      position,
      status: 'Applied',
      notes: notes || null
    })
  });
  assert.equal(res.status, 201);
  const data = await res.json() as { id: string };
  return data.id;
}

test('roadmap: GET /api/career/skill-gap requires authentication', async () => {
  const res = await fetch(`${base}/api/career/skill-gap`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('roadmap: GET /api/career/roadmap requires authentication', async () => {
  const res = await fetch(`${base}/api/career/roadmap`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('roadmap: POST /api/career/roadmap/generate requires authentication', async () => {
  const res = await fetch(`${base}/api/career/roadmap/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ targetRole: 'Staff Engineer' })
  });
  assert.equal(res.status, 401);
});

test('roadmap: PATCH /api/career/roadmap/milestones/:id requires authentication', async () => {
  const res = await fetch(`${base}/api/career/roadmap/milestones/m-123`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert.equal(res.status, 401);
});

test('roadmap: GET /api/career/skill-gap returns baseline gap analysis for user without applications', async () => {
  const res = await fetch(`${base}/api/career/skill-gap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as SkillGapAnalysisDTO;
  assert.equal(data.totalApplicationsAnalyzed, 0);
  assert.equal(data.coverageScore, 100);
  assert.equal(Array.isArray(data.recommendedFocusSkills), true);
  assert.equal(data.recommendedFocusSkills.length > 0, true);
});

test('roadmap: GET /api/career/skill-gap extracts skills from applications and computes coverage', async () => {
  await createApplication(
    userA.cookie,
    'FPT Software',
    'Senior React TypeScript Developer',
    'Requirements: React, TypeScript, GraphQL, Docker, Kubernetes'
  );
  await createApplication(
    userA.cookie,
    'VNG Corporation',
    'Fullstack Node.js Engineer',
    'Stack: Node.js, PostgreSQL, Docker, Redis'
  );

  const res = await fetch(`${base}/api/career/skill-gap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as SkillGapAnalysisDTO;
  assert.equal(data.totalApplicationsAnalyzed >= 2, true);
  assert.equal(data.topInDemandSkills.length > 0, true);
  const skillNames = data.topInDemandSkills.map(s => s.skill);
  assert.equal(skillNames.includes('Docker'), true);
});

test('roadmap: GET /api/career/roadmap generates initial 4-week roadmap', async () => {
  const res = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 200);
  const roadmap = await res.json() as CareerRoadmapDTO;
  assert.equal(typeof roadmap.id, 'string');
  assert.equal(roadmap.durationWeeks, 4);
  assert.equal(roadmap.milestones.length, 4);
  assert.equal(roadmap.overallProgressPercent, 0);
  assert.equal(roadmap.milestones[0].week, 1);
  assert.equal(roadmap.milestones[0].status, 'pending');
});

test('roadmap: POST /api/career/roadmap/generate creates a customized roadmap', async () => {
  const res = await fetch(`${base}/api/career/roadmap/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      targetRole: 'Cloud Solutions Architect',
      focusSkills: ['Kubernetes', 'Docker', 'AWS', 'System Design']
    })
  });
  assert.equal(res.status, 201);
  const roadmap = await res.json() as CareerRoadmapDTO;
  assert.equal(roadmap.targetRole, 'Cloud Solutions Architect');
  assert.equal(roadmap.milestones.length, 4);
  assert.equal(roadmap.milestones[0].skill, 'Kubernetes');
});

test('roadmap: PATCH /api/career/roadmap/milestones/:id updates status and progress', async () => {
  const getRes = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  const currentRoadmap = await getRes.json() as CareerRoadmapDTO;
  const targetMilestone = currentRoadmap.milestones[0];

  const updateRes = await fetch(`${base}/api/career/roadmap/milestones/${targetMilestone.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert.equal(updateRes.status, 200);
  const updatedRoadmap = await updateRes.json() as CareerRoadmapDTO;
  const updatedMilestone = updatedRoadmap.milestones.find(m => m.id === targetMilestone.id);
  assert.equal(updatedMilestone?.status, 'completed');
  assert.equal(typeof updatedMilestone?.completedAt, 'string');
  assert.equal(updatedRoadmap.overallProgressPercent, 25);
});

test('roadmap: PATCH /api/career/roadmap/milestones/:id rejects invalid status with 422', async () => {
  const getRes = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  const currentRoadmap = await getRes.json() as CareerRoadmapDTO;
  const targetMilestone = currentRoadmap.milestones[0];

  const updateRes = await fetch(`${base}/api/career/roadmap/milestones/${targetMilestone.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ status: 'not_a_valid_status' })
  });
  assert.equal(updateRes.status, 422);
});

test('roadmap: multi-tenant isolation ensures user B does not see user A roadmap', async () => {
  const resB = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(resB.status, 200);
  const roadmapB = await resB.json() as CareerRoadmapDTO;
  assert.equal(roadmapB.overallProgressPercent, 0);

  const resA = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userA.cookie,
      Origin: origin
    }
  });
  const roadmapA = await resA.json() as CareerRoadmapDTO;
  assert.notEqual(roadmapA.id, roadmapB.id);

  const hackAttempt = await fetch(`${base}/api/career/roadmap/milestones/${roadmapA.milestones[0].id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({ status: 'completed' })
  });
  assert.equal(hackAttempt.status, 404);
});

test('roadmap: DELETE /api/career/roadmap/:id removes roadmap', async () => {
  const getRes = await fetch(`${base}/api/career/roadmap`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  const roadmapB = await getRes.json() as CareerRoadmapDTO;

  const deleteRes = await fetch(`${base}/api/career/roadmap/${roadmapB.id}`, {
    method: 'DELETE',
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(deleteRes.status, 200);
  const data = await deleteRes.json() as { success: boolean; deletedId: string };
  assert.equal(data.success, true);
  assert.equal(data.deletedId, roadmapB.id);
});
