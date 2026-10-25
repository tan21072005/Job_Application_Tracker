import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  CyberRiskStudioOverviewDTO,
  CyberRiskScenarioDTO,
  ThreatVulnerabilityDTO,
  DarkWebExposureDTO,
  ComplianceControlDTO,
  TabletopSimulationDTO,
  BoardCyberMemorandumDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9300;

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
  const email = `cyberrisk_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.43.${forwardedIp++}`
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

test('cyber-risk-governance-studio: GET /api/cyber-risk-governance-studio/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/cyber-risk-governance-studio/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('cyber-risk-governance-studio: POST /api/cyber-risk-governance-studio/scenarios validates payload', async () => {
  const res = await fetch(`${base}/api/cyber-risk-governance-studio/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({ title: '' })
  });
  assert.equal(res.status, 400);
  const data = await res.json() as { code: string; error: string };
  assert.equal(data.code, 'invalid_scenario_payload');
});

test('cyber-risk-governance-studio: multi-tenant isolation and 404 security checks', async () => {
  const overviewRes = await fetch(`${base}/api/cyber-risk-governance-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overviewA = (await overviewRes.json()) as CyberRiskStudioOverviewDTO;
  assert.ok(overviewA.scenarios.length > 0);
  const scenarioAId = overviewA.scenarios[0].id;

  const deleteCross = await fetch(`${base}/api/cyber-risk-governance-studio/scenarios/${scenarioAId}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(deleteCross.status, 404);

  const signCross = await fetch(`${base}/api/cyber-risk-governance-studio/memorandum/${overviewA.activeMemorandum.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      role: 'ciso',
      signatoryName: 'Attacker Impersonator',
      signatoryTitle: 'Fake CISO',
      attestationRemarks: 'Unauthorized signature'
    })
  });
  assert.equal(signCross.status, 404);
});

test('cyber-risk-governance-studio: complete 5-pillar lifecycle, FAIR scenario modeling, and tripartite sign-offs', async () => {
  const overviewRes = await fetch(`${base}/api/cyber-risk-governance-studio/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const initialOverview = (await overviewRes.json()) as CyberRiskStudioOverviewDTO;

  assert.ok(initialOverview.compositeSecurityPostureScore >= 40);
  assert.ok(initialOverview.scenarios.length >= 3);
  assert.ok(initialOverview.threatLandscape.vulnerabilities.length >= 4);
  assert.ok(initialOverview.complianceMatrix.controls.length >= 6);
  assert.ok(initialOverview.tabletopSimulations.length >= 2);

  const newScenarioRes = await fetch(`${base}/api/cyber-risk-governance-studio/scenarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      title: 'Zero-Day API Gateway Bypass & BOLA Exfiltration',
      category: 'cloud_infrastructure_compromise',
      assetName: 'Kong Enterprise Gateway & Customer API',
      threatActor: 'Fancy Bear (APT28)',
      contactFrequency: 8.0,
      probabilityOfAction: 0.30,
      threatCapability: 85,
      resistanceStrength: 65,
      primaryLossMinUsd: 200000,
      primaryLossLikelyUsd: 600000,
      primaryLossMaxUsd: 2000000,
      secondaryLossMinUsd: 400000,
      secondaryLossLikelyUsd: 1200000,
      secondaryLossMaxUsd: 4500000,
      inherentAleUsd: 4500000
    })
  });
  assert.equal(newScenarioRes.status, 201);
  const createdScenario = (await newScenarioRes.json()) as CyberRiskScenarioDTO;
  assert.equal(createdScenario.title, 'Zero-Day API Gateway Bypass & BOLA Exfiltration');
  assert.ok(createdScenario.valueAtRisk95PercentUsd > 1000000);

  const newVulnRes = await fetch(`${base}/api/cyber-risk-governance-studio/vulnerabilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      cveId: 'CVE-2024-9999',
      title: 'Test Kernel Remote Code Execution',
      cvssScore: 9.8,
      epssProbability: 0.55,
      epssPercentile: 0.99,
      cisaKevStatus: true,
      affectedAsset: 'Bare Metal Compute Nodes',
      component: 'linux-kernel-core',
      remediationStatus: 'open',
      patchDueDate: '2026-11-15'
    })
  });
  assert.equal(newVulnRes.status, 201);
  const createdVuln = (await newVulnRes.json()) as ThreatVulnerabilityDTO;
  assert.equal(createdVuln.priorityTier, 'critical');

  const newExpRes = await fetch(`${base}/api/cyber-risk-governance-studio/dark-web`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      targetDomain: 'enterprise-corp.com',
      breachSource: 'Genesis Market Browser Profile',
      exposureDate: new Date().toISOString(),
      leakedEmail: 'secops-lead@enterprise-corp.com',
      hasPlaintextPassword: false,
      hasSessionToken: true,
      isVipExecutive: true,
      vipTitle: 'Head of Cyber Threat Intelligence',
      infostealerVariant: 'Genesis Cookie Dump',
      remediationStatus: 'active'
    })
  });
  assert.equal(newExpRes.status, 201);

  const newControlRes = await fetch(`${base}/api/cyber-risk-governance-studio/controls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      functionCode: 'protect',
      categoryCode: 'PR.DS',
      subcategoryCode: 'PR.DS-01',
      title: 'Data-at-Rest Encryption (AES-256-GCM)',
      description: 'Customer databases and sensitive payloads are encrypted with automated KMS key rotation.',
      iso27001Mapping: 'A.10.1',
      soc2Mapping: 'CC6.6',
      hipaaMapping: '164.312(a)(2)(iv)',
      maturityTier: 'tier_4_adaptive',
      hasVerifiedEvidence: true,
      lastAuditedDate: '2026-10-20',
      auditorNotes: 'KMS cryptographic evidence verified via CloudTrail.'
    })
  });
  assert.equal(newControlRes.status, 201);

  const newSimRes = await fetch(`${base}/api/cyber-risk-governance-studio/tabletop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      archetype: 'supply_chain_poisoning',
      scenarioTitle: 'Compromised Package Repository Deployment',
      conductedDate: '2026-10-22',
      participantsCount: 12,
      meanTimeToDetectHours: 1.1,
      meanTimeToContainHours: 2.8,
      simulatedRansomDemandedUsd: 0,
      simulatedBusinessInterruptionDays: 2,
      simulatedTotalLossUsd: 3800000,
      immutableBackupScore: 90,
      airgapIsolationScore: 85,
      rtoRpoDrillScore: 90,
      pamSegregationScore: 80,
      keyFindings: ['SBOM scanner isolated infected sub-dependency in 45 minutes'],
      remediationActionItems: ['Pin cryptographic hashes for all production package manifests']
    })
  });
  assert.equal(newSimRes.status, 201);

  const signCloRes = await fetch(`${base}/api/cyber-risk-governance-studio/memorandum/${initialOverview.activeMemorandum.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      role: 'chief_legal_officer',
      signatoryName: 'Elena Rostova, JD',
      signatoryTitle: 'General Counsel',
      attestationRemarks: 'Confirmed SEC Item 1.05 non-material determination.'
    })
  });
  assert.equal(signCloRes.status, 200);

  const signBoardRes = await fetch(`${base}/api/cyber-risk-governance-studio/memorandum/${initialOverview.activeMemorandum.id}/sign-off`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      role: 'board_audit_chair',
      signatoryName: 'Sir Arthur Sterling',
      signatoryTitle: 'Audit Committee Chair',
      attestationRemarks: 'Reviewed and approved for quarterly Board of Directors presentation.'
    })
  });
  assert.equal(signBoardRes.status, 200);
  const signedMemo = (await signBoardRes.json()) as BoardCyberMemorandumDTO;
  assert.equal(signedMemo.workflowStatus, 'board_approved');
  assert.ok(signedMemo.memorandumMarkdown.includes('Sir Arthur Sterling'));
  assert.ok(signedMemo.memorandumMarkdown.includes('Elena Rostova, JD'));

  const delScenarioRes = await fetch(`${base}/api/cyber-risk-governance-studio/scenarios/${createdScenario.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(delScenarioRes.status, 200);

  const delVulnRes = await fetch(`${base}/api/cyber-risk-governance-studio/vulnerabilities/${createdVuln.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(delVulnRes.status, 200);
});
