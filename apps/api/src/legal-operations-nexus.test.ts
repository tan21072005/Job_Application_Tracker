import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  LegalOperationsOverviewDTO,
  LegalEntityDTO,
  IPAssetDTO,
  MaterialContractDTO,
  LitigationMatterDTO,
  CustodianLegalHoldDTO,
  LegalBoardMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9950;

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await pool.end();
  await serverPool.end();
});

async function registerUser(): Promise<{ userId: string; cookie: string }> {
  const email = `legal_ops_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.49.${forwardedIp++}`
    },
    body: JSON.stringify({ email, password: 'StrongPassword123!' })
  });
  assert.equal(res.status, 201);
  const data = (await res.json()) as { id: string };
  testUsers.push(data.id);
  const cookie = res.headers.get('set-cookie');
  if (!cookie) throw new Error('Cookie missing in registration response.');
  return { userId: data.id, cookie };
}

test('legal-operations-nexus: GET /api/legal/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/legal/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('legal-operations-nexus: POST endpoints validate input schemas', async () => {
  const badEntity = await fetch(`${base}/api/legal/entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({})
  });
  assert.equal(badEntity.status, 400);

  const badContract = await fetch(`${base}/api/legal/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({})
  });
  assert.equal(badContract.status, 400);

  const badAsc450 = await fetch(`${base}/api/legal/litigation/asc450-assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({})
  });
  assert.equal(badAsc450.status, 400);

  const badHold = await fetch(`${base}/api/legal/legal-holds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({})
  });
  assert.equal(badHold.status, 400);

  const badSignoff = await fetch(`${base}/api/legal/board-war-room/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({})
  });
  assert.equal(badSignoff.status, 400);
});

test('legal-operations-nexus: full operational workflow and multi-tenant isolation', async () => {
  const overviewResA = await fetch(`${base}/api/legal/overview`, {
    headers: { Cookie: userA.cookie, Origin: origin }
  });
  assert.equal(overviewResA.status, 200);
  const overviewA = (await overviewResA.json()) as LegalOperationsOverviewDTO;
  assert.equal(overviewA.userId, userA.userId);
  assert.ok(overviewA.entities.length >= 2);
  assert.ok(overviewA.ipAssets.length >= 1);
  assert.ok(overviewA.materialContracts.length >= 1);
  assert.ok(overviewA.litigationMatters.length >= 1);
  assert.ok(overviewA.lrciCompositeScore > 0);
  assert.equal(overviewA.lrciRiskBand, 'SOVEREIGN_FORTRESS');

  const createEntityRes = await fetch(`${base}/api/legal/entities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      legalName: 'JobTrack Asia Pacific Pte. Ltd.',
      jurisdiction: 'SINGAPORE',
      entityType: 'PRIVATE_LIMITED_COMPANY',
      registrationNumber: 'SG-202319401K',
      incorporationDate: '2023-05-18',
      registeredAgent: 'Vistra Corporate Services Singapore Pte Ltd',
      principalOfficeAddress: '8 Marina View, Asia Square Tower 1, Singapore 018960',
      taxIdentificationNumber: 'SG-T0928374B'
    })
  });
  assert.equal(createEntityRes.status, 201);
  const createdEntity = (await createEntityRes.json()) as LegalEntityDTO;
  assert.equal(createdEntity.legalName, 'JobTrack Asia Pacific Pte. Ltd.');
  assert.equal(createdEntity.jurisdiction, 'SINGAPORE');

  const assetToUpdate = overviewA.ipAssets[0];
  const updatePqdiRes = await fetch(`${base}/api/legal/ip-portfolio/calculate-pqdi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      assetId: assetToUpdate.id,
      parameters: {
        totalClaimsCount: 30,
        independentClaimsCount: 4,
        forwardCitationsCount: 22,
        benchmarkForwardCitations: 12,
        officeActionsCount: 1,
        rceFilingsCount: 0,
        statutoryExtensionsCount: 0,
        foreignFamilyCount: 6
      }
    })
  });
  assert.equal(updatePqdiRes.status, 200);
  const pqdiData = (await updatePqdiRes.json()) as { assetId: string; pqdiScore: number; asset: IPAssetDTO };
  assert.ok(pqdiData.pqdiScore > 85);
  assert.equal(pqdiData.asset.id, assetToUpdate.id);

  const createContractRes = await fetch(`${base}/api/legal/contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      title: 'Global Enterprise Cloud Services Agreement - Pinnacle Financial',
      counterpartyLegalName: 'Pinnacle Financial Services Group Inc.',
      contractType: 'ENTERPRISE_SAAS_SUBSCRIPTION',
      effectiveDate: '2026-01-01',
      expirationDate: '2029-01-01',
      annualContractValue: 3200000.00,
      totalContractValue: 9600000.00,
      liabilityCapType: 'STANDARD_1X_ACV',
      liabilityCapUsd: 3200000.00,
      hasUncappedIndemnity: false,
      governingLaw: 'NEW_YORK_US',
      disputeForum: 'NY_STATE_OR_FEDERAL_COURT',
      hasMfnClause: false,
      hasExclusivityOrNonCompete: false,
      autoRenewalNoticeDays: 90,
      renewalNoticeDeadline: '2028-10-01',
      terminationForConvenienceNoticeDays: 60
    })
  });
  assert.equal(createContractRes.status, 201);
  const createdContract = (await createContractRes.json()) as MaterialContractDTO;
  assert.equal(createdContract.title, 'Global Enterprise Cloud Services Agreement - Pinnacle Financial');
  assert.ok(createdContract.crdiScore >= 0);

  const matterToAssess = overviewA.litigationMatters[0];
  const asc450Res = await fetch(`${base}/api/legal/litigation/asc450-assessment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      matterId: matterToAssess.id,
      probabilityPercent: 80,
      estimatedLossMinUsd: 1500000.00,
      estimatedLossMaxUsd: 4000000.00,
      singlePointEstimateUsd: 1800000.00
    })
  });
  assert.equal(asc450Res.status, 200);
  const updatedMatter = (await asc450Res.json()) as LitigationMatterDTO;
  assert.equal(updatedMatter.asc450Classification, 'PROBABLE');
  assert.equal(updatedMatter.accruedReserveAmountUsd, 1800000.00);

  const createHoldRes = await fetch(`${base}/api/legal/legal-holds`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      matterId: matterToAssess.id,
      holdTitle: 'Engineering Architectural Source Logs Hold',
      scopeDescription: 'Preserve all git repositories, release tags, and architecture diagrams.',
      initialCustodianName: 'Principal Distributed Systems Engineer',
      initialCustodianEmail: 'principal.architect@jobtrack.internal',
      initialCustodianDepartment: 'Core Infrastructure'
    })
  });
  assert.equal(createHoldRes.status, 201);
  const createdHold = (await createHoldRes.json()) as CustodianLegalHoldDTO;
  assert.equal(createdHold.status, 'ACTIVE_ISSUED');
  assert.equal(createdHold.custodians.length, 1);

  const memo = overviewA.activeBoardMemorandum;
  const signoffRes = await fetch(`${base}/api/legal/board-war-room/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: userA.cookie,
      Origin: origin
    },
    body: JSON.stringify({
      memoId: memo.id,
      role: 'deputy_general_counsel',
      signerName: 'Sarah Jenkins, Esq.',
      signerTitle: 'Deputy General Counsel'
    })
  });
  assert.equal(signoffRes.status, 200);
  const signedMemo = (await signoffRes.json()) as LegalBoardMemorandumDTO;
  assert.ok(signedMemo.signatures.some((s) => s.role === 'deputy_general_counsel'));
  assert.ok(signedMemo.cryptographicIntegrityDigest.length > 0);

  const overviewResB = await fetch(`${base}/api/legal/overview`, {
    headers: { Cookie: userB.cookie, Origin: origin }
  });
  assert.equal(overviewResB.status, 200);
  const overviewB = (await overviewResB.json()) as LegalOperationsOverviewDTO;
  assert.equal(overviewB.userId, userB.userId);
  assert.ok(overviewB.entities.every((e) => e.userId === userB.userId));
  assert.ok(overviewB.entities.every((e) => e.id !== createdEntity.id));
  assert.ok(overviewB.materialContracts.every((c) => c.id !== createdContract.id));
  assert.ok(overviewB.litigationMatters.every((m) => m.id !== matterToAssess.id));
});
