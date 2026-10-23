import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { AtsMatchResultDTO, CoverLetterResultDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 160;

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
  await new Promise<void>((resolve, reject) => server.close(error => (error ? reject(error) : resolve())));
  await pool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `aipro_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.8.${forwardedIp++}`
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

test('ATS Match: requires authentication and position field', async () => {
  const unauthRes = await fetch(`${base}/api/ai/pro/ats-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ position: 'Senior Frontend Developer' })
  });
  assert.equal(unauthRes.status, 401);

  const user = await registerUser();
  const invalidRes = await fetch(`${base}/api/ai/pro/ats-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({ company: 'Acme Corp' })
  });
  assert.equal(invalidRes.status, 422);
});

test('ATS Match: accurately matches skills against candidate profile', async () => {
  const user = await registerUser();

  await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({
      fullName: 'Tran Van Chuyen',
      email: 'tranvanchuyen@example.com',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      bio: 'Lap trinh vien Fullstack voi hon 5 nam kinh nghiem phat trien web quy mo lon va microservices.'
    })
  });

  const res = await fetch(`${base}/api/ai/pro/ats-match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({
      company: 'TechCorp Vietnam',
      position: 'Senior React & Node.js Engineer',
      notes: 'Yêu cầu chuyên sâu TypeScript, React, Docker, Kubernetes, CI/CD.'
    })
  });
  assert.equal(res.status, 200);
  const match = await res.json() as AtsMatchResultDTO;

  assert.ok(match.score >= 70);
  assert.ok(match.matchedSkills.includes('React') || match.matchedSkills.includes('TypeScript'));
  assert.ok(match.missingSkills.includes('Docker') || match.missingSkills.includes('Kubernetes'));
  assert.ok(match.recommendations.length > 0);
  assert.ok(match.keywordBreakdown.length > 0);
});

test('Cover Letter: generates personalized letter in Vietnamese and English', async () => {
  const user = await registerUser();

  await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({
      fullName: 'Nguyen Thi Huong',
      email: 'huong.nguyen@example.com',
      phone: '0987654321',
      skills: ['Figma', 'UI/UX Design', 'User Research'],
      bio: 'Senior Product Designer voi 4 nam kinh nghiem thiet ke he thong Design System va Mobile Apps.'
    })
  });

  const viRes = await fetch(`${base}/api/ai/pro/cover-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({
      company: 'Fintech Solutions',
      position: 'Lead UI/UX Designer',
      language: 'vi'
    })
  });
  assert.equal(viRes.status, 200);
  const viLetter = await viRes.json() as CoverLetterResultDTO;
  assert.ok(viLetter.coverLetter.includes('Nguyen Thi Huong'));
  assert.ok(viLetter.coverLetter.includes('Fintech Solutions'));
  assert.ok(viLetter.coverLetter.includes('Lead UI/UX Designer'));
  assert.ok(viLetter.shortPitch.includes('Nguyen Thi Huong'));
  assert.ok(viLetter.highlights.length >= 3);

  const enRes = await fetch(`${base}/api/ai/pro/cover-letter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: user.cookie, Origin: origin },
    body: JSON.stringify({
      company: 'Global Software Inc',
      position: 'Lead UI/UX Designer',
      language: 'en'
    })
  });
  assert.equal(enRes.status, 200);
  const enLetter = await enRes.json() as CoverLetterResultDTO;
  assert.ok(enLetter.coverLetter.includes('Dear Hiring Team at Global Software Inc'));
  assert.ok(enLetter.coverLetter.includes('Nguyen Thi Huong'));
  assert.ok(enLetter.coverLetter.includes('huong.nguyen@example.com'));
  assert.ok(enLetter.shortPitch.includes('Global Software Inc'));
});
