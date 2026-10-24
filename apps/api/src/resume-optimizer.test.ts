import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  OptimizedResumeVariantDTO,
  BulletOptimizationProposalDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 2300;

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
  const email = `resume_optimizer_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.26.${forwardedIp++}`
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

test('resume-optimizer: GET /api/resume/optimizations requires authentication', async () => {
  const res = await fetch(`${base}/api/resume/optimizations`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('resume-optimizer: POST /api/resume/diagnose requires authentication', async () => {
  const res = await fetch(`${base}/api/resume/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin
    },
    body: JSON.stringify({ resumeText: 'test' })
  });
  assert.equal(res.status, 401);
});

test('resume-optimizer: POST /api/resume/diagnose rejects invalid input with 400', async () => {
  const res = await fetch(`${base}/api/resume/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      resumeText: 'Too short',
      jobDescription: ''
    })
  });
  assert.equal(res.status, 400);
  const json = await res.json() as { code: string; errors: Record<string, string> };
  assert.equal(json.code, 'validation_error');
  assert.ok(json.errors.resumeText);
  assert.ok(json.errors.jobDescription);
});

test('resume-optimizer: POST /api/resume/rewrite-bullets generates variants', async () => {
  const res = await fetch(`${base}/api/resume/rewrite-bullets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      bullets: [
        'Built fullstack web application with React and Node.',
        'Wrote SQL database queries and maintained servers.'
      ],
      targetKeywords: ['TypeScript', 'PostgreSQL', 'Docker']
    })
  });

  assert.equal(res.status, 200);
  const proposals = await res.json() as BulletOptimizationProposalDTO[];
  assert.equal(proposals.length, 2);
  assert.equal(proposals[0].variants.length, 3);
  assert.equal(proposals[0].variants[0].variantType, 'metric_driven');
  assert.ok(proposals[0].variants[0].xyzBreakdown.accomplishmentX.length > 0);
});

test('resume-optimizer: full lifecycle, diagnose, apply rewrites, multi-tenant isolation, and delete', async () => {
  const sampleResume = `
# Nguyen Van A - Senior Engineer
## Summary
Experienced software engineer with 5 years in fullstack development.
## Experience
- Built REST API services with Node.js and PostgreSQL.
- Maintained Docker containers and handled deployment pipelines.
- Reduced database query times and improved user satisfaction.
## Skills
- JavaScript, Node.js, PostgreSQL
  `;

  const sampleJd = `
We are looking for a Senior Fullstack Engineer proficient in:
- TypeScript, React, Next.js, Node.js
- PostgreSQL, Redis, Docker, Kubernetes
- CI/CD, Microservices architecture, and System Design
  `;

  const diagRes = await fetch(`${base}/api/resume/diagnose`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      jobTitle: 'Senior Fullstack Engineer',
      company: 'Shopee Vietnam',
      resumeText: sampleResume,
      jobDescription: sampleJd
    })
  });

  assert.equal(diagRes.status, 201);
  const dataA = await diagRes.json() as OptimizedResumeVariantDTO;
  assert.ok(dataA.id);
  assert.equal(dataA.company, 'Shopee Vietnam');
  assert.ok(dataA.diagnosticResult.atsScore > 0);
  assert.ok(dataA.proposals.length > 0);

  const listResA = await fetch(`${base}/api/resume/optimizations`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listResA.status, 200);
  const listA = await listResA.json() as OptimizedResumeVariantDTO[];
  assert.equal(listA.length, 1);
  assert.equal(listA[0].id, dataA.id);

  const listResB = await fetch(`${base}/api/resume/optimizations`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(listResB.status, 200);
  const listB = await listResB.json() as OptimizedResumeVariantDTO[];
  assert.equal(listB.length, 0);

  const getResB = await fetch(`${base}/api/resume/optimizations/${dataA.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(getResB.status, 404);

  const originalBullet = dataA.proposals[0].originalBullet;
  const rewrittenBullet = dataA.proposals[0].variants[0].rewrittenText;

  const applyRes = await fetch(`${base}/api/resume/optimizations/${dataA.id}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      acceptedBullets: {
        [originalBullet]: rewrittenBullet
      },
      injectedKeywords: ['Kubernetes', 'Redis', 'TypeScript']
    })
  });

  assert.equal(applyRes.status, 200);
  const updatedA = await applyRes.json() as OptimizedResumeVariantDTO;
  assert.ok(updatedA.synthesizedResume.includes(rewrittenBullet));
  assert.ok(updatedA.synthesizedResume.includes('Kubernetes'));

  const delResB = await fetch(`${base}/api/resume/optimizations/${dataA.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(delResB.status, 404);

  const delResA = await fetch(`${base}/api/resume/optimizations/${dataA.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(delResA.status, 200);

  const listAfterDel = await fetch(`${base}/api/resume/optimizations`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listAfterDel.status, 200);
  const listAfter = await listAfterDel.json() as OptimizedResumeVariantDTO[];
  assert.equal(listAfter.length, 0);
});
