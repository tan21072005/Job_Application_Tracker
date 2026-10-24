import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type { ContactDTO, ContactInteractionDTO, RelationshipHealthDTO } from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 700;

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
  const email = `contact_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.12.${forwardedIp++}`
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

test('contact: GET /api/contacts requires authentication', async () => {
  const res = await fetch(`${base}/api/contacts`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('contact: POST /api/contacts validates required fields with 422', async () => {
  const res = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({ name: '', company: '' })
  });
  assert.equal(res.status, 422);
  const body = await res.json() as { message: string; code: string };
  assert.ok(body.message);
  assert.equal(body.code, 'invalid_request');
});

test('contact: POST /api/contacts creates a contact successfully', async () => {
  const res = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Nguyễn Văn Recruiter',
      company: 'Shopee Vietnam',
      role: 'Talent Acquisition Lead',
      type: 'recruiter',
      email: 'recruiter@shopee.example.com',
      phone: '0987654321',
      linkedinUrl: 'https://linkedin.com/in/nguyen-recruiter',
      relationshipStrength: 'in_touch',
      notes: 'Liên hệ qua LinkedIn về vị trí Senior Backend Engineer'
    })
  });
  assert.equal(res.status, 201);
  const created = await res.json() as ContactDTO;
  assert.ok(created.id);
  assert.equal(created.name, 'Nguyễn Văn Recruiter');
  assert.equal(created.company, 'Shopee Vietnam');
  assert.equal(created.role, 'Talent Acquisition Lead');
  assert.equal(created.type, 'recruiter');
  assert.equal(created.relationshipStrength, 'in_touch');
});

test('contact: multi-tenant isolation prevents access across users', async () => {
  const createRes = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Lê HR Private',
      company: 'VNG Corporation',
      type: 'recruiter'
    })
  });
  assert.equal(createRes.status, 201);
  const contact = await createRes.json() as ContactDTO;

  const accessRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(accessRes.status, 404);

  const updateRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userB.cookie,
      Origin: origin
    },
    body: JSON.stringify({ name: 'Tampered Name', company: 'Hacker Corp' })
  });
  assert.equal(updateRes.status, 404);

  const deleteRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    method: 'DELETE',
    headers: {
      Cookie: userB.cookie,
      Origin: origin
    }
  });
  assert.equal(deleteRes.status, 404);
});

test('contact: GET /api/contacts supports query and type filtering', async () => {
  await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Phạm Headhunter',
      company: 'Navigos Group',
      type: 'headhunter',
      relationshipStrength: 'advocate'
    })
  });

  const listRes = await fetch(`${base}/api/contacts?query=Navigos`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(listRes.status, 200);
  const list = await listRes.json() as ContactDTO[];
  assert.ok(list.length >= 1);
  assert.ok(list.some(c => c.company === 'Navigos Group'));

  const typeRes = await fetch(`${base}/api/contacts?type=headhunter`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(typeRes.status, 200);
  const typeList = await typeRes.json() as ContactDTO[];
  assert.ok(typeList.every(c => c.type === 'headhunter'));
});

test('contact: PATCH /api/contacts/:id updates contact details', async () => {
  const createRes = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Vũ Kỹ Sư',
      company: 'Tech Startup',
      type: 'peer',
      relationshipStrength: 'lead'
    })
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as ContactDTO;

  const updateRes = await fetch(`${base}/api/contacts/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Vũ Kỹ Sư Trưởng',
      company: 'Tech Startup Global',
      role: 'Staff Engineer',
      relationshipStrength: 'in_touch'
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ContactDTO;
  assert.equal(updated.name, 'Vũ Kỹ Sư Trưởng');
  assert.equal(updated.company, 'Tech Startup Global');
  assert.equal(updated.role, 'Staff Engineer');
  assert.equal(updated.relationshipStrength, 'in_touch');
});

test('contact: POST /api/contacts/:id/interactions creates interaction and updates contact last_contacted_at', async () => {
  const createRes = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Đặng Mentor',
      company: 'Big Tech',
      type: 'mentor',
      relationshipStrength: 'advocate'
    })
  });
  assert.equal(createRes.status, 201);
  const contact = await createRes.json() as ContactDTO;

  const interactionRes = await fetch(`${base}/api/contacts/${contact.id}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      channel: 'coffee',
      summary: 'Trò chuyện định hướng phát triển sự nghiệp năm 2026',
      details: 'Thảo luận về kỹ năng kiến trúc hệ thống phân tán và quản lý nhóm.'
    })
  });
  assert.equal(interactionRes.status, 201);
  const interaction = await interactionRes.json() as ContactInteractionDTO;
  assert.ok(interaction.id);
  assert.equal(interaction.channel, 'coffee');
  assert.equal(interaction.contactId, contact.id);

  const getRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as { contact: ContactDTO; interactions: ContactInteractionDTO[]; health: RelationshipHealthDTO };
  assert.equal(fetched.contact.id, contact.id);
  assert.ok(fetched.contact.lastContactedAt);
  assert.equal(fetched.interactions.length, 1);
  assert.equal(fetched.interactions[0].id, interaction.id);
  assert.equal(fetched.health.healthStatus, 'healthy');
});

test('contact: GET /api/contacts/reconnect-due returns contacts needing outreach', async () => {
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  const createRes = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Trần Cũ Kỹ',
      company: 'Legacy Corp',
      type: 'peer',
      relationshipStrength: 'dormant',
      lastContactedAt: oldDate
    })
  });
  assert.equal(createRes.status, 201);
  const contact = await createRes.json() as ContactDTO;

  const dueRes = await fetch(`${base}/api/contacts/reconnect-due`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(dueRes.status, 200);
  const dueList = await dueRes.json() as Array<ContactDTO & { health: RelationshipHealthDTO }>;
  assert.ok(dueList.length >= 1);
  const found = dueList.find(item => item.id === contact.id);
  assert.ok(found);
  assert.equal(found.health.isDormant, true);
});

test('contact: DELETE /api/contacts/:id removes contact and cascades', async () => {
  const createRes = await fetch(`${base}/api/contacts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      name: 'Xóa Tôi Đi',
      company: 'Temporary Co',
      type: 'recruiter'
    })
  });
  assert.equal(createRes.status, 201);
  const contact = await createRes.json() as ContactDTO;

  const delRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    method: 'DELETE',
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(delRes.status, 204);

  const getRes = await fetch(`${base}/api/contacts/${contact.id}`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(getRes.status, 404);
});
