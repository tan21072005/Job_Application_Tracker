import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  BoardMandateDTO,
  FastEquityDilutionModelDTO,
  ConflictOfInterestCheckDTO,
  OutsideBoardWaiverLetterDTO,
  GovernanceMatrixDTO,
  BoardDossierDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 5100;

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
  const email = `board_advisory_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.35.${forwardedIp++}`
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

test('board-advisory-nexus: GET /api/board-advisory-nexus/mandates requires authentication', async () => {
  const res = await fetch(`${base}/api/board-advisory-nexus/mandates`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('board-advisory-nexus: POST /api/board-advisory-nexus/mandates validates required fields', async () => {
  const invalidRes = await fetch(`${base}/api/board-advisory-nexus/mandates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ targetCompanyName: '' })
  });
  assert.equal(invalidRes.status, 422);
});

test('board-advisory-nexus: full mandate lifecycle, multi-tenant isolation, dilution, conflict, and dossier', async () => {
  const listInitialRes = await fetch(`${base}/api/board-advisory-nexus/mandates`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listInitialRes.status, 200);
  const seeded = (await listInitialRes.json()) as BoardMandateDTO[];
  assert.ok(seeded.length >= 2);

  const createRes = await fetch(`${base}/api/board-advisory-nexus/mandates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetCompanyName: 'QuantumScale Inc',
      mandateType: 'advisory_board',
      stage: 'initial_dialogue',
      annualCashRetainer: 24000,
      meetingFeePerBoardMeeting: 1500,
      meetingFeePerCommitteeMeeting: 750,
      expectedBoardMeetingsPerYear: 4,
      expectedCommitteeMeetingsPerYear: 4,
      equityPercentage: 0.4,
      equityGrantType: 'nso_options',
      vestingSchedule: 'two_year_monthly_no_cliff',
      accelerationClause: 'single_trigger_change_of_control',
      optionStrikePrice: 3000,
      timeCommitmentHoursPerMonth: 6,
      termLengthYears: 2,
      committeeAssignments: ['tech_cybersecurity', 'ai_ethics_data'],
      hasDAndOInsurance: true,
      dAndOPolicyLimitMillions: 15,
      hasSideADicCoverage: true,
      hasIndemnificationAgreement: true,
      notes: 'Advising on distributed training architectures'
    })
  });
  assert.equal(createRes.status, 201);
  const created = (await createRes.json()) as BoardMandateDTO;
  assert.equal(created.targetCompanyName, 'QuantumScale Inc');
  assert.equal(created.equityPercentage, 0.4);

  const getRes = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);
  const fetched = (await getRes.json()) as BoardMandateDTO;
  assert.equal(fetched.id, created.id);

  const crossUserGet = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserGet.status, 404);

  const updateRes = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      stage: 'offer_term_sheet',
      equityPercentage: 0.45
    })
  });
  assert.equal(updateRes.status, 200);
  const updated = (await updateRes.json()) as BoardMandateDTO;
  assert.equal(updated.stage, 'offer_term_sheet');
  assert.equal(updated.equityPercentage, 0.45);

  const crossUserUpdate = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({ equityPercentage: 0.99 })
  });
  assert.equal(crossUserUpdate.status, 404);

  const dilutionRes = await fetch(
    `${base}/api/board-advisory-nexus/mandates/${created.id}/dilution-model?stage=series_a&impact=strategic&rounds=2&dilution=0.2`,
    {
      headers: { Origin: origin, Cookie: userA.cookie }
    }
  );
  assert.equal(dilutionRes.status, 200);
  const dilutionModel = (await dilutionRes.json()) as FastEquityDilutionModelDTO;
  assert.equal(dilutionModel.mandateId, created.id);
  assert.equal(dilutionModel.futureFinancingRounds, 2);
  assert.ok(dilutionModel.scenarios.length === 4);

  const conflictRes = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}/conflict-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      primaryEmployerName: 'Enterprise AI Corp',
      isDirectCompetitor: false,
      isAdjacentMarket: true,
      primaryCapitalMillions: 80,
      targetCapitalMillions: 20,
      hasIpOverlap: false,
      hasHardwareSegregation: true
    })
  });
  assert.equal(conflictRes.status, 200);
  const conflictData = (await conflictRes.json()) as ConflictOfInterestCheckDTO;
  assert.equal(conflictData.mandateId, created.id);
  assert.equal(conflictData.claytonActViolationRisk, false);
  assert.ok(conflictData.coiScore < 50);

  const waiverRes = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}/waiver-letter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      executiveName: 'Alex Mercer',
      generalCounselName: 'Rachel Green, Esq.',
      roleTitle: 'VP of Engineering'
    })
  });
  assert.equal(waiverRes.status, 200);
  const waiverData = (await waiverRes.json()) as OutsideBoardWaiverLetterDTO;
  assert.ok(waiverData.letterMarkdown.includes('Alex Mercer'));
  assert.ok(waiverData.letterMarkdown.includes('Rachel Green, Esq.'));
  assert.ok(waiverData.letterMarkdown.includes('CONFIDENTIAL PRIVILEGED LEGAL MEMORANDUM'));

  const deleteRes = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteRes.status, 200);

  const getDeleted = await fetch(`${base}/api/board-advisory-nexus/mandates/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getDeleted.status, 404);
});

test('board-advisory-nexus: governance matrix and board dossier generation with tenant isolation', async () => {
  const getMatrixRes = await fetch(`${base}/api/board-advisory-nexus/governance-matrix`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getMatrixRes.status, 200);
  const initialMatrix = (await getMatrixRes.json()) as GovernanceMatrixDTO;
  assert.ok(initialMatrix.governanceQuotient > 0);

  const updateMatrixRes = await fetch(`${base}/api/board-advisory-nexus/governance-matrix`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiduciaryAcumenScore: 90,
      cyberAuditOversightScore: 95,
      aiGovernanceEthicsScore: 88,
      executiveCompensationScore: 82,
      boardroomPresenceDissentScore: 86,
      verifiedCredentials: ['NACD Fellow', 'CERT Cyber Oversight']
    })
  });
  assert.equal(updateMatrixRes.status, 200);
  const updatedMatrix = (await updateMatrixRes.json()) as GovernanceMatrixDTO;
  assert.ok(updatedMatrix.governanceQuotient >= 85);
  assert.equal(updatedMatrix.tier, 'boardroom_luminary');
  assert.ok(updatedMatrix.qualifiedCommittees.includes('tech_cybersecurity'));
  assert.ok(updatedMatrix.qualifiedCommittees.includes('audit_risk'));

  const dossierRes = await fetch(`${base}/api/board-advisory-nexus/dossier`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(dossierRes.status, 200);
  const dossier = (await dossierRes.json()) as BoardDossierDTO;
  assert.equal(dossier.governanceQuotient, updatedMatrix.governanceQuotient);
  assert.ok(dossier.boardDossierMarkdown.includes('EXECUTIVE BOARD BIOGRAPHY & GOVERNANCE DOSSIER'));
  assert.ok(dossier.boardDossierMarkdown.includes('BOARDROOM LUMINARY'));
});
