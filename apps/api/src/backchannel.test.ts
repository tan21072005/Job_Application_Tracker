import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ReferenceAdvocateDTO,
  BackchannelAuditDTO,
  RefereeBriefingPacketDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 3900;

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
  const email = `backchannel_test_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.32.${forwardedIp++}`
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

test('backchannel: GET /api/backchannel/advocates requires authentication', async () => {
  const res = await fetch(`${base}/api/backchannel/advocates`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('backchannel: GET /api/backchannel/audits requires authentication', async () => {
  const res = await fetch(`${base}/api/backchannel/audits`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('backchannel: POST /api/backchannel/advocates enforces validation and persists record', async () => {
  const invalidRes = await fetch(`${base}/api/backchannel/advocates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ fullName: '' })
  });
  assert.equal(invalidRes.status, 422);

  const validRes = await fetch(`${base}/api/backchannel/advocates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fullName: 'Marcus Vance',
      currentTitle: 'Chief Technology Officer',
      currentCompany: 'OmniVenture Tech',
      relationshipArchetype: 'superior_sponsor',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2020-01',
      sharedTenureEnd: '2023-06',
      sharedTenureMonths: 42,
      projectsCoDelivered: ['Global Core Payment Gateway'],
      endorsementStrength: 'unconditional_champion',
      vouchedCompetencies: ['scaling_0_to_1', 'board_governance'],
      email: 'marcus.vance@example.com',
      preferredChannel: 'email',
      ndaRestricted: false
    })
  });
  assert.equal(validRes.status, 201);
  const advocate = await validRes.json() as ReferenceAdvocateDTO;
  assert.equal(advocate.fullName, 'Marcus Vance');
  assert.equal(advocate.relationshipArchetype, 'superior_sponsor');
});

test('backchannel: full CRUD and multi-tenant isolation on advocates', async () => {
  const createResA = await fetch(`${base}/api/backchannel/advocates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fullName: 'Elena Rostova',
      currentTitle: 'VP of Product',
      currentCompany: 'DataSphere',
      relationshipArchetype: 'cross_functional_peer',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2021-01',
      sharedTenureEnd: '2023-06',
      sharedTenureMonths: 30,
      projectsCoDelivered: ['Real-time settlement engine'],
      endorsementStrength: 'strong_advocate',
      vouchedCompetencies: ['cross_functional_synergy'],
      email: 'elena.rostova@example.com'
    })
  });
  assert.equal(createResA.status, 201);
  const advocateA = await createResA.json() as ReferenceAdvocateDTO;

  const accessResB = await fetch(`${base}/api/backchannel/advocates/${advocateA.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(accessResB.status, 404);

  const updateResB = await fetch(`${base}/api/backchannel/advocates/${advocateA.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ fullName: 'Tampered Name' })
  });
  assert.equal(updateResB.status, 404);

  const updateResA = await fetch(`${base}/api/backchannel/advocates/${advocateA.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ currentTitle: 'Chief Product Officer' })
  });
  assert.equal(updateResA.status, 200);
  const updatedA = await updateResA.json() as ReferenceAdvocateDTO;
  assert.equal(updatedA.currentTitle, 'Chief Product Officer');

  const listResA = await fetch(`${base}/api/backchannel/advocates`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listResA.status, 200);
  const listA = await listResA.json() as ReferenceAdvocateDTO[];
  assert.ok(listA.some(a => a.id === advocateA.id));

  const listResB = await fetch(`${base}/api/backchannel/advocates`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(listResB.status, 200);
  const listB = await listResB.json() as ReferenceAdvocateDTO[];
  assert.ok(!listB.some(a => a.id === advocateA.id));

  const deleteResB = await fetch(`${base}/api/backchannel/advocates/${advocateA.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(deleteResB.status, 404);

  const deleteResA = await fetch(`${base}/api/backchannel/advocates/${advocateA.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteResA.status, 204);
});

test('backchannel: audit creation, stakeholder probability simulation, and briefing generation', async () => {
  const advocateRes = await fetch(`${base}/api/backchannel/advocates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fullName: 'David Sterling',
      currentTitle: 'VP Engineering',
      currentCompany: 'HyperScale Systems',
      relationshipArchetype: 'superior_sponsor',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2019-01',
      sharedTenureEnd: '2023-01',
      sharedTenureMonths: 48,
      projectsCoDelivered: ['Zero-downtime database migration'],
      endorsementStrength: 'unconditional_champion',
      vouchedCompetencies: ['scaling_0_to_1', 'crisis_incident_response'],
      email: 'david.sterling@example.com'
    })
  });
  const advocate = await advocateRes.json() as ReferenceAdvocateDTO;

  const createAuditRes = await fetch(`${base}/api/backchannel/audits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      auditName: 'HyperScale AI Executive Mandate',
      targetCompany: 'HyperScale AI',
      targetRole: 'VP of Technology',
      advocateIds: [advocate.id],
      stakeholders: [
        {
          id: 'stake-1',
          fullName: 'Karen Hughes',
          role: 'Managing Partner',
          organization: 'Sequoia Southeast Asia',
          isDecisionMaker: true,
          networkOverlapDegree: 'first_degree',
          mutualCompanies: ['FinFlow Global'],
          mutualTenureOverlapMonths: 36,
          potentialBackchannelIntermediaries: [],
          predictedSentiment: 'champion'
        }
      ],
      risks: []
    })
  });
  assert.equal(createAuditRes.status, 201);
  const audit = await createAuditRes.json() as BackchannelAuditDTO;
  assert.equal(audit.auditName, 'HyperScale AI Executive Mandate');
  assert.ok(audit.stakeholders[0].probabilityScore >= 80);
  assert.ok(audit.coverageMatrix.totalAdvocates >= 1);

  const crossUserAuditRes = await fetch(`${base}/api/backchannel/audits/${audit.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserAuditRes.status, 404);

  const briefingRes = await fetch(`${base}/api/backchannel/audits/${audit.id}/generate-briefing`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ advocateId: advocate.id })
  });
  assert.equal(briefingRes.status, 201);
  const briefing = await briefingRes.json() as RefereeBriefingPacketDTO;
  assert.equal(briefing.advocateId, advocate.id);
  assert.ok(briefing.formattedMarkdown.includes('Executive Reference Briefing Packet'));
  assert.ok(briefing.formattedMarkdown.includes('David Sterling'));

  const getUpdatedAudit = await fetch(`${base}/api/backchannel/audits/${audit.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getUpdatedAudit.status, 200);
  const updatedAudit = await getUpdatedAudit.json() as BackchannelAuditDTO;
  assert.equal(updatedAudit.briefings.length, 1);
  assert.equal(updatedAudit.briefings[0].advocateId, advocate.id);
});
