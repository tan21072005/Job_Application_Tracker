import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  ExecutiveContractDTO,
  ContractRedlineDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 4100;

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
  const email = `exec_contract_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.33.${forwardedIp++}`
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

test('executive-contract: GET /api/executive-contracts requires authentication', async () => {
  const res = await fetch(`${base}/api/executive-contracts`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('executive-contract: POST /api/executive-contracts validates required fields', async () => {
  const invalidRes = await fetch(`${base}/api/executive-contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ companyName: '' })
  });
  assert.equal(invalidRes.status, 422);
});

test('executive-contract: full contract lifecycle with multi-tenant isolation and redlines', async () => {
  const createPayload = {
    companyName: 'Acme Cloud AI',
    roleTitle: 'VP of Engineering',
    jurisdiction: 'us_delaware_ny',
    clauseParameters: {
      non_compete_non_solicit: {
        durationMonths: 18,
        scope: 'worldwide_broad',
        gardenLeavePercent: 0,
        solicitationBreadth: 'all_customers_vendors',
        explicitCaDisclaimer: false
      },
      ip_prior_inventions: {
        priorInventionsScheduleAttached: false,
        priorInventionsCount: 0,
        assignmentScope: 'omnibus_perpetual',
        moonlightOpenSourcePermitted: false,
        statutoryProtectionCited: false
      },
      severance_without_cause: {
        cashSalaryMonths: 3,
        targetBonusIncluded: false,
        healthBenefitMonths: 3,
        goodReasonResignationCovered: false,
        narrowCauseDefinition: false
      },
      double_trigger_cic: {
        accelerationType: 'none',
        protectionWindowMonths: 6,
        ptepMonths: 3,
        goldenParachuteCutbackProtected: false
      },
      indemnification_d_and_o: {
        standaloneAgreementSigned: false,
        policyCoverageAdequate: false,
        mandatoryAdvancement: false,
        tailCoverageSixYears: false
      }
    },
    priorInventions: [
      {
        category: 'open_source_repo',
        title: 'Distributed Log Engine',
        identifierOrUrl: 'https://github.com/exec/log-engine',
        creationDate: '2024-01-01',
        technologyDescription: 'Raft consensus log engine in Rust',
        retainedRights: ['Full Commercial Copyright'],
        confidentialExclusionConfirmed: true
      }
    ]
  };

  const createRes = await fetch(`${base}/api/executive-contracts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify(createPayload)
  });
  assert.equal(createRes.status, 201);
  const created = await createRes.json() as ExecutiveContractDTO;
  assert.ok(created.id);
  assert.equal(created.companyName, 'Acme Cloud AI');
  assert.equal(created.riskTier, 'critical_toxic');
  assert.ok(created.contractRiskIndex >= 70);
  assert.ok(created.redlines && created.redlines.length > 0);

  const getRes = await fetch(`${base}/api/executive-contracts/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);
  const fetched = await getRes.json() as ExecutiveContractDTO;
  assert.equal(fetched.id, created.id);

  const crossUserGetRes = await fetch(`${base}/api/executive-contracts/${created.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserGetRes.status, 404);

  const updateRes = await fetch(`${base}/api/executive-contracts/${created.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ roleTitle: 'Senior Vice President of Engineering' })
  });
  assert.equal(updateRes.status, 200);
  const updated = await updateRes.json() as ExecutiveContractDTO;
  assert.equal(updated.roleTitle, 'Senior Vice President of Engineering');

  const addInventionRes = await fetch(`${base}/api/executive-contracts/${created.id}/prior-inventions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      category: 'saas_product',
      title: 'CloudCost Sentinel',
      identifierOrUrl: 'https://cloudcost-sentinel.io',
      creationDate: '2025-05-01',
      technologyDescription: 'SaaS multi-cloud billing optimizer',
      retainedRights: ['Full Commercial Copyright'],
      confidentialExclusionConfirmed: true
    })
  });
  assert.equal(addInventionRes.status, 201);
  const withInvention = await addInventionRes.json() as ExecutiveContractDTO;
  assert.equal(withInvention.priorInventions.length, 2);

  const inventionToDelete = withInvention.priorInventions[1].id;
  const deleteInventionRes = await fetch(`${base}/api/executive-contracts/${created.id}/prior-inventions/${inventionToDelete}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteInventionRes.status, 200);
  const afterDeleteInv = await deleteInventionRes.json() as ExecutiveContractDTO;
  assert.equal(afterDeleteInv.priorInventions.length, 1);

  const redline = created.redlines![0];
  const patchRedlineRes = await fetch(`${base}/api/executive-contracts/${created.id}/redlines/${redline.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  assert.equal(patchRedlineRes.status, 200);
  const updatedRedline = await patchRedlineRes.json() as ContractRedlineDTO;
  assert.equal(updatedRedline.status, 'accepted');

  const generateRedlinesRes = await fetch(`${base}/api/executive-contracts/${created.id}/generate-redlines`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(generateRedlinesRes.status, 200);
  const generatedList = await generateRedlinesRes.json() as ContractRedlineDTO[];
  assert.ok(Array.isArray(generatedList) && generatedList.length > 0);

  const crossUserGenRes = await fetch(`${base}/api/executive-contracts/${created.id}/generate-redlines`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(crossUserGenRes.status, 404);

  const exportAddendumRes = await fetch(`${base}/api/executive-contracts/${created.id}/export-addendum`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(exportAddendumRes.status, 200);
  const addendumData = await exportAddendumRes.json() as { markdown: string; cri: number };
  assert.ok(addendumData.markdown.includes('EXECUTIVE COUNTER-AMENDMENT ADDENDUM'));
  assert.ok(addendumData.markdown.includes('Acme Cloud AI'));

  const exportExhibitRes = await fetch(`${base}/api/executive-contracts/${created.id}/export-exhibit-a`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(exportExhibitRes.status, 200);
  const exhibitData = await exportExhibitRes.json() as { markdown: string };
  assert.ok(exhibitData.markdown.includes('EXHIBIT A: SCHEDULE OF PRIOR INVENTIONS'));
  assert.ok(exhibitData.markdown.includes('Distributed Log Engine'));

  const deleteRes = await fetch(`${base}/api/executive-contracts/${created.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteRes.status, 204);

  const verifyDeleteRes = await fetch(`${base}/api/executive-contracts/${created.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(verifyDeleteRes.status, 404);
});
