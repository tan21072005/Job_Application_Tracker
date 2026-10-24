import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { ResumeVariantDTO, ResumeTailorResultDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 350;

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
  const email = `resume_test_${randomUUID()}@example.com`;
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

test('resume: returns empty list for new user', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/resumes`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(res.status, 200);
  const items = await res.json() as ResumeVariantDTO[];
  assert.ok(Array.isArray(items));
  assert.equal(items.length, 0);
});

test('resume: rejects invalid variant input with 422', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({ name: '' })
  });
  assert.equal(res.status, 422);
});

test('resume: creates and retrieves variant with master flag handling', async () => {
  const user = await registerUser();
  const res1 = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'CV Backend Golang',
      targetRole: 'Golang Engineer',
      summary: 'Kỹ sư chuyên phát triển backend microservices với Golang và Kubernetes',
      experiences: [
        {
          company: 'Acme Cloud',
          role: 'Backend Developer',
          period: '2023 - 2026',
          bulletPoints: ['Thiết kế kiến trúc streaming Kafka giảm latency 40%'],
          technologies: ['Go', 'Kafka', 'PostgreSQL']
        }
      ],
      skillGroups: [
        {
          category: 'Ngôn ngữ',
          skills: ['Go', 'SQL', 'TypeScript']
        }
      ],
      isMaster: true
    })
  });
  assert.equal(res1.status, 201);
  const cv1 = await res1.json() as ResumeVariantDTO;
  assert.ok(cv1.id);
  assert.equal(cv1.isMaster, true);
  assert.equal(cv1.experiences.length, 1);

  const res2 = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'CV Fullstack Lead',
      targetRole: 'Tech Lead',
      summary: 'Dẫn dắt đội ngũ kỹ thuật',
      experiences: [],
      skillGroups: [],
      isMaster: true
    })
  });
  assert.equal(res2.status, 201);
  const cv2 = await res2.json() as ResumeVariantDTO;
  assert.equal(cv2.isMaster, true);

  const listRes = await fetch(`${base}/api/resumes`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(listRes.status, 200);
  const list = await listRes.json() as ResumeVariantDTO[];
  assert.equal(list.length, 2);

  const oldMaster = list.find(c => c.id === cv1.id);
  assert.ok(oldMaster);
  assert.equal(oldMaster.isMaster, false);
});

test('resume: enforces strict multi-tenant isolation', async () => {
  const userA = await registerUser();
  const userB = await registerUser();

  const createRes = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Secret CV User A',
      targetRole: 'Architect',
      summary: 'Private data',
      experiences: [],
      skillGroups: [],
      isMaster: true
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as ResumeVariantDTO;

  const bGet = await fetch(`${base}/api/resumes/${created.id}`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(bGet.status, 404);

  const bPut = await fetch(`${base}/api/resumes/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Hacked name',
      targetRole: 'Hacker',
      summary: 'Pwned',
      experiences: [],
      skillGroups: [],
      isMaster: false
    })
  });
  assert.equal(bPut.status, 404);

  const bDel = await fetch(`${base}/api/resumes/${created.id}`, {
    method: 'DELETE',
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(bDel.status, 404);
});

test('resume: updates variant details', async () => {
  const user = await registerUser();
  const createRes = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Initial Name',
      targetRole: 'Dev',
      summary: 'Summary text',
      experiences: [],
      skillGroups: [],
      isMaster: false
    })
  });
  const created = await createRes.json() as ResumeVariantDTO;

  const updateRes = await fetch(`${base}/api/resumes/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Updated Name',
      targetRole: 'Senior Dev',
      summary: 'Enhanced summary text',
      experiences: [
        {
          company: 'Corp',
          role: 'Lead',
          period: '2024-2026',
          bulletPoints: ['Point 1'],
          technologies: ['TS']
        }
      ],
      skillGroups: [
        {
          category: 'Tech',
          skills: ['TS', 'React']
        }
      ],
      isMaster: true
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ResumeVariantDTO;
  assert.equal(updated.name, 'Updated Name');
  assert.equal(updated.targetRole, 'Senior Dev');
  assert.equal(updated.isMaster, true);
  assert.equal(updated.experiences.length, 1);
});

test('resume: deletes variant and prevents subsequent access', async () => {
  const user = await registerUser();
  const createRes = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'To Delete',
      targetRole: 'Temporary',
      summary: 'Temp',
      experiences: [],
      skillGroups: [],
      isMaster: false
    })
  });
  const created = await createRes.json() as ResumeVariantDTO;

  const delRes = await fetch(`${base}/api/resumes/${created.id}`, {
    method: 'DELETE',
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(delRes.status, 204);

  const getRes = await fetch(`${base}/api/resumes/${created.id}`, {
    headers: { Cookie: user.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 404);
});

test('resume: tailors resume for job description and returns ATS score boost', async () => {
  const user = await registerUser();
  const createRes = await fetch(`${base}/api/resumes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Base Resume',
      targetRole: 'Software Engineer',
      summary: 'Kỹ sư phần mềm tổng quát',
      experiences: [
        {
          company: 'Tech Corp',
          role: 'Software Engineer',
          period: '2022 - 2025',
          bulletPoints: ['Lập trình ứng dụng web'],
          technologies: ['JavaScript', 'HTML']
        }
      ],
      skillGroups: [
        {
          category: 'Cốt lõi',
          skills: ['JavaScript']
        }
      ],
      isMaster: true
    })
  });
  const created = await createRes.json() as ResumeVariantDTO;

  const tailorRes = await fetch(`${base}/api/resumes/tailor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      resumeId: created.id,
      jobDetails: {
        company: 'VNG',
        position: 'Senior React Engineer',
        description: 'Tuyển Senior React Engineer thành thạo React, TypeScript, Redux, Performance Optimization. Cần 3 năm kinh nghiệm với REST API và CI/CD.'
      }
    })
  });
  assert.equal(tailorRes.status, 200);
  const result = await tailorRes.json() as ResumeTailorResultDTO;
  assert.ok(result.tailoredResume);
  assert.ok(result.tailoredScore >= result.originalScore);
  assert.ok(Array.isArray(result.keywordCoverage));
  assert.ok(result.diffs.length > 0);
  assert.ok(result.tailoredResume.targetRole?.includes('React'));
});
