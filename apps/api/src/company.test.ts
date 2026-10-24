import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { CompanyProfileDTO, CompanyReviewDTO, CompanySalaryBenchmarkDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 480;

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
  await pool.query('DELETE FROM company_reviews WHERE company_name LIKE $1', ['TestCompany_%']);
  await pool.query('DELETE FROM company_profiles WHERE name LIKE $1', ['TestCompany_%']);
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `company_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.9.${forwardedIp++}`
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

test('company: GET /api/companies/:name requires authentication', async () => {
  const res = await fetch(`${base}/api/companies/FPT%20Software`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('company: GET /api/companies/:name returns preset company dossier', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/companies/FPT%20Software`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as CompanyProfileDTO;
  assert.equal(data.name, 'FPT Software');
  assert.ok(data.salaryBenchmarks.length >= 3);
  assert.ok(data.interviewQuestions.length >= 2);
  assert.ok(data.cultureScores.overall >= 3.0);
  assert.ok(data.techStack.includes('Java'));
});

test('company: GET /api/companies/:name synthesizes unknown company dossier', async () => {
  const user = await registerUser();
  const compName = `TestCompany_${randomUUID().slice(0, 6)}`;
  const res = await fetch(`${base}/api/companies/${encodeURIComponent(compName)}`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const data = await res.json() as CompanyProfileDTO;
  assert.equal(data.name, compName);
  assert.ok(data.salaryBenchmarks.length >= 3);
  assert.ok(data.cultureScores.overall >= 3.0);
});

test('company: POST /api/companies/:name/reviews rejects invalid review with 422', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/companies/FPT%20Software/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      role: '',
      rating: 6,
      pros: 'Short',
      cons: 'Short'
    })
  });
  assert.equal(res.status, 422);
});

test('company: POST /api/companies/:name/reviews saves review and re-computes culture aggregates', async () => {
  const user = await registerUser();
  const compName = `TestCompany_${randomUUID().slice(0, 6)}`;

  await fetch(`${base}/api/companies/${encodeURIComponent(compName)}`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });

  const reviewRes = await fetch(`${base}/api/companies/${encodeURIComponent(compName)}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      companyName: compName,
      role: 'Senior Backend Engineer',
      rating: 5,
      workLifeBalance: 4,
      compensationRating: 5,
      careerGrowth: 5,
      managementRating: 4,
      recommend: true,
      pros: 'Môi trường làm việc cực kỳ năng động và nhiều thử thách công nghệ lớn.',
      cons: 'Quy trình tài liệu bàn giao dự án cần được chuẩn hóa tốt hơn.',
      advice: 'Hãy chủ động đề xuất giải pháp kỹ thuật mới với Solution Architect.'
    })
  });

  assert.equal(reviewRes.status, 201);
  const createdReview = await reviewRes.json() as CompanyReviewDTO;
  assert.equal(createdReview.companyName, compName);
  assert.equal(createdReview.rating, 5);
  assert.equal(createdReview.userId, user.userId);

  const updatedProfileRes = await fetch(`${base}/api/companies/${encodeURIComponent(compName)}`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  const updatedProfile = await updatedProfileRes.json() as CompanyProfileDTO;
  assert.equal(updatedProfile.cultureScores.totalReviews, 1);
  assert.equal(updatedProfile.cultureScores.overall, 5.0);
  assert.equal(updatedProfile.recentReviews.length, 1);
});

test('company: GET /api/companies/:name/salaries returns salary benchmarks array', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/companies/VNG%20Corporation/salaries`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const benchmarks = await res.json() as CompanySalaryBenchmarkDTO[];
  assert.ok(Array.isArray(benchmarks));
  assert.ok(benchmarks.length >= 3);
  assert.ok(benchmarks.some(b => b.level === 'Senior'));
});
