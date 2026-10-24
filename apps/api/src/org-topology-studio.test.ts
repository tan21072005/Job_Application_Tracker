import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ReorgScenarioDTO,
  TeamTopologyDTO,
  OrgNodeDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 7200;

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
  const email = `org_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.38.${forwardedIp++}`
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

test('org-topology-studio: GET /api/org-topology-studio/scenarios requires authentication', async () => {
  const res = await fetch(`${base}/api/org-topology-studio/scenarios`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('org-topology-studio: POST /api/org-topology-studio/scenarios validates payload', async () => {
  const invalidRes = await fetch(`${base}/api/org-topology-studio/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ title: '' })
  });
  assert.equal(invalidRes.status, 422);
});

test('org-topology-studio: complete scenario lifecycle, teams, employees, memo, and multi-tenant isolation', async () => {
  const listInitialRes = await fetch(`${base}/api/org-topology-studio/scenarios`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listInitialRes.status, 200);
  const initialScenarios = await listInitialRes.json() as ReorgScenarioDTO[];
  assert.ok(initialScenarios.length >= 1);
  const seeded = initialScenarios[0];
  assert.ok(seeded.title.includes('Platform Decoupling'));
  assert.equal(seeded.status, 'draft');
  assert.ok(seeded.currentHierarchyMetrics.totalHeadcount >= 40);

  const teamsRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}/teams`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(teamsRes.status, 200);
  const seededTeams = await teamsRes.json() as TeamTopologyDTO[];
  assert.ok(seededTeams.length >= 4);

  const addTeamRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}/teams`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      name: 'Data Mesh & Analytics Platform',
      type: 'platform',
      missionStatement: 'Provide automated DBT pipelines and Snowflake streaming schemas.',
      headcount: 6,
      domainComplexity: 4,
      operationalToilPercentage: 18,
      weeklyIncidentAlertCount: 2,
      ownedServices: [
        { serviceId: 'svc-data-1', serviceName: 'Streaming Ingestion Engine', tier: 'tier_1_mission_critical', linesOfCode: 35000, deploymentFrequencyPerWeek: 5, monthlyP1Incidents: 0 }
      ],
      interactions: [
        { targetTeamId: seededTeams[0].id, targetTeamName: seededTeams[0].name, interactionMode: 'x_as_a_service', purpose: 'Telemetry ingest API', weeklySyncHours: 1 }
      ]
    })
  });
  assert.equal(addTeamRes.status, 201);
  const newTeam = await addTeamRes.json() as TeamTopologyDTO;
  assert.equal(newTeam.name, 'Data Mesh & Analytics Platform');
  assert.ok(newTeam.cognitiveLoadIndex > 0);

  const updateTeamRes = await fetch(`${base}/api/org-topology-studio/teams/${newTeam.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      operationalToilPercentage: 45,
      headcount: 4
    })
  });
  assert.equal(updateTeamRes.status, 200);
  const updatedTeam = await updateTeamRes.json() as TeamTopologyDTO;
  assert.equal(updatedTeam.headcount, 4);
  assert.ok(updatedTeam.cognitiveLoadIndex > newTeam.cognitiveLoadIndex);

  const employeesRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}/employees`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(employeesRes.status, 200);
  const employees = await employeesRes.json() as OrgNodeDTO[];
  assert.ok(employees.length >= 5);
  const firstEmp = employees[0];
  assert.ok(firstEmp.employeeName);
  assert.ok(firstEmp.spanHealth);

  const updateScenarioRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'H2 Target Reorganization Proposal',
      targetCompletionDate: '2026-11-30',
      executiveRationale: 'Address platform bottlenecks by establishing a dedicated Data Infrastructure Platform Team.',
      proposedTeamAssignments: [
        { employeeId: firstEmp.id, targetTeamId: newTeam.id, targetManagerId: firstEmp.id }
      ],
      proposedServiceTransfers: [
        { serviceId: 'svc-pay-2', targetTeamId: newTeam.id }
      ]
    })
  });
  assert.equal(updateScenarioRes.status, 200);
  const updatedScenario = await updateScenarioRes.json() as ReorgScenarioDTO;
  assert.equal(updatedScenario.transferredEngineersCount, 1);
  assert.equal(updatedScenario.reassignedServicesCount, 1);
  assert.ok(updatedScenario.disruptionRiskIndex > 0);

  const memoRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}/generate-memo`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(memoRes.status, 200);
  const memoData = await memoRes.json() as { markdown: string };
  assert.ok(memoData.markdown.includes('Executive Engineering Organization Reorganization Memorandum'));
  assert.ok(memoData.markdown.includes('H2 Target Reorganization Proposal'));

  const userBAccessRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBAccessRes.status, 404);

  const deleteTeamRes = await fetch(`${base}/api/org-topology-studio/teams/${newTeam.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteTeamRes.status, 204);

  const deleteScenarioRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteScenarioRes.status, 204);

  const getDeletedRes = await fetch(`${base}/api/org-topology-studio/scenarios/${seeded.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getDeletedRes.status, 404);
});
