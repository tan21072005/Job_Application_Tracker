import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  PortfolioConfigDTO,
  PublicDossierViewDTO,
  ShareTokenDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 1800;

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
  const email = `portfolio_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.23.${forwardedIp++}`
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

test('portfolio: GET /api/portfolio requires authentication', async () => {
  const res = await fetch(`${base}/api/portfolio`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('portfolio: PUT /api/portfolio requires authentication and validates input', async () => {
  const unauthRes = await fetch(`${base}/api/portfolio`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ title: 'New Title' })
  });
  assert.equal(unauthRes.status, 401);

  const invalidRes = await fetch(`${base}/api/portfolio`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ title: '', slug: 'INVALID SLUG!' })
  });
  assert.equal(invalidRes.status, 422);
});

test('portfolio: GET /api/portfolio initializes default config and PUT updates it', async () => {
  const getRes = await fetch(`${base}/api/portfolio`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);
  const initial = await getRes.json() as PortfolioConfigDTO;
  assert.ok(initial.id);
  assert.equal(initial.userId, userA.userId);
  assert.ok(initial.slug.startsWith('candidate-'));
  assert.equal(initial.displaySettings.showInterviews, true);

  const updateRes = await fetch(`${base}/api/portfolio`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'Senior Solutions Architect',
      slug: `alex-dev-${randomUUID().slice(0, 8)}`,
      location: 'Singapore',
      salaryExpectation: '100,000 - 130,000 USD',
      targetRoles: ['Lead Architect', 'Staff Engineer'],
      displaySettings: {
        showSalaryExpectation: false,
        anonymizeCandidateName: true
      }
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as PortfolioConfigDTO;
  assert.equal(updated.title, 'Senior Solutions Architect');
  assert.equal(updated.location, 'Singapore');
  assert.equal(updated.displaySettings.showSalaryExpectation, false);
  assert.equal(updated.displaySettings.anonymizeCandidateName, true);
});

test('portfolio: a candidate with no skills, roadmap or simulation gets an unverified dossier', async () => {
  const tokenRes = await fetch(`${base}/api/portfolio/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ expiryDays: 30 })
  });
  assert.equal(tokenRes.status, 201);
  const tokenData = await tokenRes.json() as ShareTokenDTO;

  const publicRes = await fetch(`${base}/api/public/dossier/${tokenData.token}`);
  assert.equal(publicRes.status, 200);
  const dossier = await publicRes.json() as PublicDossierViewDTO;

  assert.equal(dossier.isVerified, false, 'an empty account must not claim verification');
  assert.deepEqual(dossier.topSkills, [], 'no skill may be invented');
  assert.ok(
    !dossier.roadmapProgress || dossier.roadmapProgress.completedMilestones === 0,
    'an untouched roadmap must not read as progress'
  );
  assert.equal(dossier.simulationReadiness, null, 'no interview score may be invented');
});

test('portfolio: real skills and roadmap milestones reach the public dossier', async () => {
  await pool.query(
    `INSERT INTO candidate_profiles (user_id, full_name, email, skills)
     VALUES ($1, $2, $3, $4::text[])
     ON CONFLICT (user_id) DO UPDATE SET skills = EXCLUDED.skills`,
    [userA.userId, 'Ứng viên A', 'candidate-a@example.com', ['Rust', 'Kubernetes']]
  );
  await fetch(`${base}/api/career/roadmap`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  await pool.query(
    `INSERT INTO career_roadmaps (id, user_id, title, target_role, duration_weeks, milestones)
     VALUES ($1, $2, $3, $4, 4, $5::jsonb)`,
    [
      randomUUID(),
      userA.userId,
      'Lộ trình Rust',
      'Rust Engineer',
      JSON.stringify([
        { status: 'completed' },
        { status: 'completed' },
        { status: 'pending' },
        { status: 'pending' }
      ])
    ]
  );

  const tokenRes = await fetch(`${base}/api/portfolio/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ expiryDays: 30 })
  });
  const tokenData = await tokenRes.json() as ShareTokenDTO;

  const publicRes = await fetch(`${base}/api/public/dossier/${tokenData.token}`);
  const dossier = await publicRes.json() as PublicDossierViewDTO;

  assert.equal(dossier.isVerified, true, 'evidence on file means the dossier is verifiable');
  assert.deepEqual(dossier.topSkills.map(s => s.name).sort(), ['Kubernetes', 'Rust']);
  assert.ok(dossier.roadmapProgress, 'roadmap progress must come from the stored roadmap');
  assert.equal(dossier.roadmapProgress?.progressPercent, 50);
  assert.equal(dossier.roadmapProgress?.completedMilestones, 2);
  assert.equal(dossier.roadmapProgress?.totalMilestones, 4);
});

test('portfolio: POST /api/portfolio/token generates token and GET /api/public/dossier/:token returns verified view', async () => {
  const tokenRes = await fetch(`${base}/api/portfolio/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ expiryDays: 30 })
  });
  assert.equal(tokenRes.status, 201);
  const tokenData = await tokenRes.json() as ShareTokenDTO;
  assert.ok(tokenData.token);
  assert.ok(tokenData.publicUrl.includes(tokenData.token));
  assert.equal(tokenData.isActive, true);

  const publicRes = await fetch(`${base}/api/public/dossier/${tokenData.token}`);
  assert.equal(publicRes.status, 200);
  const publicDossier = await publicRes.json() as PublicDossierViewDTO;
  assert.equal(publicDossier.title, 'Senior Solutions Architect');
  assert.equal(publicDossier.location, 'Singapore');
  assert.equal(publicDossier.salaryExpectation, null);
  assert.ok(publicDossier.candidateName.startsWith('Kỹ sư'));
  assert.ok(publicDossier.verificationFingerprint.length === 64);
  assert.equal(typeof publicDossier.isVerified, 'boolean');

  const portRes = await fetch(`${base}/api/portfolio`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const portData = await portRes.json() as PortfolioConfigDTO;
  assert.ok((portData.accessCount ?? 0) >= 1);
});

test('portfolio: enforces multi-tenant isolation and allows token revocation', async () => {
  const userBPortRes = await fetch(`${base}/api/portfolio`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBPortRes.status, 200);
  const userBPort = await userBPortRes.json() as PortfolioConfigDTO;
  assert.equal(userBPort.userId, userB.userId);
  assert.notEqual(userBPort.id, userA.userId);

  const userAPort = await (await fetch(`${base}/api/portfolio`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  })).json() as PortfolioConfigDTO;
  const token = userAPort.shareToken;
  assert.ok(token);

  const revokeRes = await fetch(`${base}/api/portfolio/token`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(revokeRes.status, 200);

  const expiredPublicRes = await fetch(`${base}/api/public/dossier/${token}`);
  assert.equal(expiredPublicRes.status, 404);
});
