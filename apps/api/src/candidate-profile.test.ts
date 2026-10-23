import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app } from './server.ts';
import type { CandidateProfileWireDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 150;

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
  const email = `profile_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.7.${forwardedIp++}`
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

test('Candidate Profile: returns 404 when profile is not yet created', async () => {
  const user = await registerUser();
  const res = await fetch(`${base}/api/profile`, {
    headers: {
      Cookie: user.cookie,
      Origin: origin
    }
  });
  assert.equal(res.status, 404);
  const body = await res.json() as { code: string; message: string };
  assert.equal(body.code, 'not_found');
});

test('Candidate Profile: rejects malformed types with 422 and structured field errors', async () => {
  const user = await registerUser();

  const malformedPayloads = [
    {
      payload: {
        fullName: '',
        email: 'invalid_email'
      },
      expectedFields: ['fullName', 'email']
    },
    {
      payload: {
        fullName: 'Valid Name',
        email: 'valid@example.com',
        phone: 'invalid phone number!!',
        cvUrl: 'ftp://insecure.com/cv.pdf',
        portfolioUrl: 'not_a_url'
      },
      expectedFields: ['phone', 'cvUrl', 'portfolioUrl']
    },
    {
      payload: {
        fullName: 'Valid Name',
        email: 'valid@example.com',
        skills: 'not_an_array',
        bio: 'x'.repeat(2100),
        unknownField: 'bad'
      },
      expectedFields: ['skills', 'bio', 'unknownField']
    }
  ];

  for (const { payload, expectedFields } of malformedPayloads) {
    const res = await fetch(`${base}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: user.cookie,
        Origin: origin
      },
      body: JSON.stringify(payload)
    });
    assert.equal(res.status, 422);
    const body = await res.json() as { code: string; fields?: Record<string, string> };
    assert.equal(body.code, 'invalid_request');
    assert.ok(body.fields);
    for (const field of expectedFields) {
      assert.ok(body.fields[field], `Expected error field '${field}' to be present`);
    }
  }
});

test('Candidate Profile: creates, updates, and retrieves candidate profile successfully', async () => {
  const user = await registerUser();

  const initialPayload = {
    fullName: 'Nguyen Van A',
    email: 'nguyen.a@example.com',
    phone: '+84 901 234 567',
    cvUrl: 'https://example.com/resumes/cv.pdf',
    portfolioUrl: 'https://github.com/nguyenvana',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    bio: 'Software engineer with 5 years experience building resilient web applications.',
    customAnswers: {
      expectedSalary: '30,000,000 VND',
      preferredLocation: 'Da Nang / Remote'
    }
  };

  const putRes = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify(initialPayload)
  });
  assert.equal(putRes.status, 200);
  const createdProfile = await putRes.json() as CandidateProfileWireDTO;
  assert.equal(createdProfile.userId, user.userId);
  assert.equal(createdProfile.fullName, 'Nguyen Van A');
  assert.equal(createdProfile.email, 'nguyen.a@example.com');
  assert.equal(createdProfile.phone, '+84 901 234 567');
  assert.equal(createdProfile.cvUrl, 'https://example.com/resumes/cv.pdf');
  assert.equal(createdProfile.portfolioUrl, 'https://github.com/nguyenvana');
  assert.deepEqual(createdProfile.skills, ['TypeScript', 'React', 'Node.js', 'PostgreSQL']);
  assert.equal(createdProfile.bio, 'Software engineer with 5 years experience building resilient web applications.');
  assert.deepEqual(createdProfile.customAnswers, {
    expectedSalary: '30,000,000 VND',
    preferredLocation: 'Da Nang / Remote'
  });
  assert.ok(createdProfile.createdAt);
  assert.ok(createdProfile.updatedAt);

  const getRes = await fetch(`${base}/api/profile`, {
    headers: {
      Cookie: user.cookie,
      Origin: origin
    }
  });
  assert.equal(getRes.status, 200);
  const fetchedProfile = await getRes.json() as CandidateProfileWireDTO;
  assert.equal(fetchedProfile.userId, user.userId);
  assert.equal(fetchedProfile.fullName, 'Nguyen Van A');
  assert.deepEqual(fetchedProfile.skills, ['TypeScript', 'React', 'Node.js', 'PostgreSQL']);

  const updatedPayload = {
    ...initialPayload,
    fullName: 'Nguyen Van A (Senior)',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
    expectedUpdatedAt: createdProfile.updatedAt
  };

  const updateRes = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify(updatedPayload)
  });
  assert.equal(updateRes.status, 200);
  const updatedProfile = await updateRes.json() as CandidateProfileWireDTO;
  assert.equal(updatedProfile.fullName, 'Nguyen Van A (Senior)');
  assert.equal(updatedProfile.skills.length, 5);

  const partialUpdate = {
    fullName: 'Nguyen Van A (Lead)',
    email: 'nguyen.a@example.com'
  };

  const partialRes = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user.cookie,
      Origin: origin
    },
    body: JSON.stringify(partialUpdate)
  });
  assert.equal(partialRes.status, 200);
  const partialProfile = await partialRes.json() as CandidateProfileWireDTO;
  assert.equal(partialProfile.fullName, 'Nguyen Van A (Lead)');
  assert.deepEqual(partialProfile.customAnswers, {
    expectedSalary: '30,000,000 VND',
    preferredLocation: 'Da Nang / Remote'
  });
});

test('Candidate Profile: enforces cross-user isolation and optimistic concurrency', async () => {
  const user1 = await registerUser();
  const user2 = await registerUser();

  const user1Payload = {
    fullName: 'User One',
    email: 'user1@example.com',
    skills: ['Python', 'Django']
  };

  const put1 = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user1.cookie,
      Origin: origin
    },
    body: JSON.stringify(user1Payload)
  });
  assert.equal(put1.status, 200);
  const p1 = await put1.json() as CandidateProfileWireDTO;

  const get2 = await fetch(`${base}/api/profile`, {
    headers: {
      Cookie: user2.cookie,
      Origin: origin
    }
  });
  assert.equal(get2.status, 404);

  const staleUpdate = await fetch(`${base}/api/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: user1.cookie,
      Origin: origin,
      'If-Match': '2020-01-01T00:00:00.000Z'
    },
    body: JSON.stringify({
      fullName: 'User One Conflict',
      email: 'user1@example.com'
    })
  });
  assert.equal(staleUpdate.status, 412);
  const conflictBody = await staleUpdate.json() as { code: string };
  assert.equal(conflictBody.code, 'precondition_failed');
});
