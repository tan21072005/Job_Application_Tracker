import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool, strategicCommsCrisisNexusService } from './server.ts';
import type {
  StrategicCommsNexusOverviewDTO,
  CrisisIncidentDTO,
  CrisisHoldingStatementDTO,
  VerifiedFactMoatEntryDTO,
  QaBridgeItemDTO,
  CrisisReleaseSignoffDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9980;

const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Test server did not start.');
const base = 'http:' + '/' + `/127.0.0.1:${address.port}`;
const origin = 'http:' + '/' + '/127.0.0.1:64364';

let userA: { userId: string; cookie: string };
let userB: { userId: string; cookie: string };

test.before(async () => {
  await strategicCommsCrisisNexusService.ensureSchema();
  userA = await registerUser();
  userB = await registerUser();
});

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  server.closeAllConnections?.();
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `comms_nexus_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.53.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const cookie = res.headers.get('set-cookie') || '';
  const body = (await res.json()) as { id: string };
  testUsers.push(body.id);
  return { userId: body.id, cookie };
}

test('strategic-comms-crisis-nexus: GET /api/comms/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/comms/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('strategic-comms-crisis-nexus: POST endpoints validate input schemas and reject invalid payloads', async () => {
  const badIncident = await fetch(`${base}/api/comms/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badIncident.status, 400);

  const badStatement = await fetch(`${base}/api/comms/holding-statements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badStatement.status, 400);

  const badFact = await fetch(`${base}/api/comms/facts/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badFact.status, 400);

  const badQa = await fetch(`${base}/api/comms/qa-bridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badQa.status, 400);

  const badSignoff = await fetch(`${base}/api/comms/releases/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({})
  });
  assert.equal(badSignoff.status, 400);
});

test('strategic-comms-crisis-nexus: complete lifecycle with incident creation, statements, facts, QA bridge, and tripartite release signoff', async () => {
  const initialOverviewRes = await fetch(`${base}/api/comms/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(initialOverviewRes.status, 200);
  const initialOverview = (await initialOverviewRes.json()) as StrategicCommsNexusOverviewDTO;
  assert.ok(initialOverview.activeIncidents.length > 0);
  assert.ok(initialOverview.resilienceIndex.compositeScore >= 0);

  const incidentRes = await fetch(`${base}/api/comms/incidents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'Global Payments Cluster Degraded Latency Incident',
      playbookType: 'product_critical_failure_recall',
      initialSeverity: 'level_3_serious_reputational_threat',
      incidentCommander: 'David Zhao, VP Infrastructure',
      communicationsLead: 'Marcus Vance, Head of Comms',
      legalCounselLead: 'Rachel Thorne, General Counsel',
      technicalLead: 'Sarah Lin, Lead SRE',
      summary: 'Database connection pool saturation causing 15% elevated API timeouts across EU payment gateway.'
    })
  });
  assert.equal(incidentRes.status, 201);
  const incident = (await incidentRes.json()) as CrisisIncidentDTO;
  assert.ok(incident.id);
  assert.equal(incident.checkpoints.length, 5);

  const statementRes = await fetch(`${base}/api/comms/holding-statements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      incidentId: incident.id,
      targetTier: 'tier_3_enterprise_customers',
      toneCalibration: 'authoritative_transparent',
      headline: 'Service Advisory: EU Gateway Processing Performance Resolution',
      bodyText: 'We have identified localized transaction latency on our EU processing nodes. Our engineering teams have deployed routing failovers.',
      includePslraSafeHarbor: true,
      includeRegulationFdNotice: true
    })
  });
  assert.equal(statementRes.status, 201);
  const statement = (await statementRes.json()) as CrisisHoldingStatementDTO;
  assert.ok(statement.id);
  assert.ok(statement.safeHarborDisclaimer.includes('Private Securities Litigation Reform Act of 1995'));
  assert.ok(statement.contentHashSha256.startsWith('sha256_'));

  const factRes = await fetch(`${base}/api/comms/facts/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      incidentId: incident.id,
      factClaim: 'Zero customer financial funds or payment card numbers were lost or compromised.',
      technicalCorroboration: 'PCI-DSS vault immutable HMAC logs and gateway packet captures.',
      sourceOwner: 'Sarah Lin, Lead SRE',
      corroborationStatus: 'verified_corroborated',
      refutedRumor: 'Social media rumors claiming failed transactions debited accounts twice.',
      evidenceReferenceId: 'PCI-VAULT-2026-0812'
    })
  });
  assert.equal(factRes.status, 201);
  const fact = (await factRes.json()) as VerifiedFactMoatEntryDTO;
  assert.ok(fact.id);
  assert.equal(fact.corroborationStatus, 'verified_corroborated');

  const qaRes = await fetch(`${base}/api/comms/qa-bridge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      incidentId: incident.id,
      hostileQuestion: 'Is JobTrack hiding a major insolvency or payment processing blackout?',
      anticipatedOutlet: 'Financial Times',
      bridgeTechnique: 'bridge_to_facts',
      transitionPhrase: 'What our real-time transaction processing telemetry confirms is...',
      pivotMessage: 'Over 99.4% of all transactions settled successfully and latency has returned to normal sub-200ms levels.',
      riskRating: 8
    })
  });
  assert.equal(qaRes.status, 201);
  const qa = (await qaRes.json()) as QaBridgeItemDTO;
  assert.ok(qa.id);
  assert.equal(qa.riskRating, 8);

  const signoff1 = await fetch(`${base}/api/comms/releases/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      holdingStatementId: statement.id,
      role: 'head_of_communications',
      signerName: 'Marcus Vance'
    })
  });
  assert.equal(signoff1.status, 200);
  const s1 = (await signoff1.json()) as CrisisReleaseSignoffDTO;
  assert.equal(s1.headOfCommsSignoff?.isSigned, true);
  assert.equal(s1.isFullyAuthorized, false);

  const signoff2 = await fetch(`${base}/api/comms/releases/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      holdingStatementId: statement.id,
      role: 'chief_legal_officer',
      signerName: 'Rachel Thorne',
      legalComments: 'Reviewed statement for PSLRA safe harbor and Reg FD public dissemination.'
    })
  });
  assert.equal(signoff2.status, 200);
  const s2 = (await signoff2.json()) as CrisisReleaseSignoffDTO;
  assert.equal(s2.chiefLegalOfficerSignoff?.isSigned, true);
  assert.equal(s2.isFullyAuthorized, false);

  const signoff3 = await fetch(`${base}/api/comms/releases/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      holdingStatementId: statement.id,
      role: 'chief_executive_officer',
      signerName: 'Elena Sterling'
    })
  });
  assert.equal(signoff3.status, 200);
  const s3 = (await signoff3.json()) as CrisisReleaseSignoffDTO;
  assert.equal(s3.ceoSignoff?.isSigned, true);
  assert.equal(s3.isFullyAuthorized, true);

  const userBOverviewRes = await fetch(`${base}/api/comms/overview`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBOverviewRes.status, 200);
  const userBOverview = (await userBOverviewRes.json()) as StrategicCommsNexusOverviewDTO;
  const userBHasIncidentA = userBOverview.activeIncidents.some(i => i.id === incident.id);
  assert.equal(userBHasIncidentA, false);
});
