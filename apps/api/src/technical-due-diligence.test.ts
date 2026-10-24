import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  TechnicalDueDiligenceAuditDTO,
  DiligenceFindingDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 6200;

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
  const email = `tdd_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.37.${forwardedIp++}`
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

test('technical-due-diligence: GET /api/technical-due-diligence/audits requires authentication', async () => {
  const res = await fetch(`${base}/api/technical-due-diligence/audits`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('technical-due-diligence: POST /api/technical-due-diligence/audits validates payload', async () => {
  const invalidRes = await fetch(`${base}/api/technical-due-diligence/audits`, {
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

test('technical-due-diligence: audit lifecycle, findings, memo generation, and tenant isolation', async () => {
  const listInitialRes = await fetch(`${base}/api/technical-due-diligence/audits`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(listInitialRes.status, 200);
  const initialAudits = await listInitialRes.json() as TechnicalDueDiligenceAuditDTO[];
  assert.ok(initialAudits.length >= 1);
  const seeded = initialAudits[0];
  assert.equal(seeded.targetCompanyName, 'CloudScale AI Corp');
  assert.ok(seeded.scorecard.compositeRiskIndex >= 0);
  assert.ok(seeded.cloudEconomics.currentGrossMarginPercent > 0);

  const findingsRes = await fetch(`${base}/api/technical-due-diligence/audits/${seeded.id}/findings`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(findingsRes.status, 200);
  const seededFindings = await findingsRes.json() as DiligenceFindingDTO[];
  assert.ok(seededFindings.length >= 1);

  const newAuditPayload = {
    targetCompanyName: 'NeuralFlow Data Corp',
    dealSizeUsd: 120000000,
    transactionType: 'buy_side_acquisition',
    auditLeadName: 'Morgan Croft',
    auditDate: '2026-10-25',
    architecture: {
      typology: 'microservices',
      estimatedTotalLoc: 800000,
      costPerLocBurdened: 12.5,
      replacementCostEstimate: 10000000,
      technicalDebtRemediationCost: 1500000,
      technicalDebtRatio: 15.0,
      rtoMinutesCurrent: 60,
      rtoMinutesTarget: 15,
      rpoMinutesCurrent: 30,
      rpoMinutesTarget: 5,
      disasterRecoveryTestedRecently: false,
      spofCount: 3,
      spofCriticalityIndex: 45,
      currentPeakQps: 4500,
      maxDatabaseQps: 9000,
      scalabilitySaturationHorizon: 2.0,
      identifiedSpofs: [
        { id: 'spof-10', component: 'Core Ingress Proxy', type: 'ingress_routing', severity: 'high', redundancyInPlace: false, remediationEstimateDays: 25 }
      ]
    },
    licenses: {
      openSourceContagionScore: 35,
      proprietaryCodeLinkedWithGpl: false,
      cleanRoomDocumented: true,
      contractorAssignmentsComplete: true,
      patentFtoAnalyzed: false,
      dependenciesCount: 310,
      copyleftFindingsCount: 3,
      licenseBreakdown: {
        permissiveCount: 290,
        weakCopyleftCount: 15,
        strongCopyleftCount: 5,
        networkCopyleftCount: 0,
        commercialDualCount: 0
      },
      flaggedLibraries: [
        { id: 'lib-20', packageName: 'native-crypto-accel', version: '1.4.2', license: 'GPL-2.0', category: 'strong_copyleft', usageMode: 'client_distributed', riskLevel: 'high', remediationStrategy: 'replace_with_permissive', remediationCost: 50000 }
      ]
    },
    cloudEconomics: {
      annualRecurringRevenue: 35000000,
      annualCloudSpendTotal: 5200000,
      cloudCogsAmount: 4800000,
      cloudCogsPercentOfArr: 13.7,
      currentGrossMarginPercent: 74.0,
      projectedOptimizedGrossMarginPercent: 79.5,
      idleResourceWastageAnnual: 850000,
      multiYearCommitmentLiability: 450000,
      finopsOptimizationCaptureEstimate: 600000,
      spendByProvider: {
        awsAnnual: 4200000,
        gcpAnnual: 1000000,
        azureAnnual: 0,
        otherInfrastructureAnnual: 0
      },
      wastageCategories: {
        idleComputeAnnual: 400000,
        unattachedStorageAnnual: 150000,
        unindexedEgressAnnual: 100000,
        overprovisionedDbAnnual: 200000
      }
    },
    securityCompliance: {
      securityComplianceMaturityIndex: 72,
      soc2Type2Status: 'certified_with_exceptions',
      iso27001Status: 'in_audit',
      secItem106ReadinessScore: 75,
      thirdPartyPenTestRecencyMonths: 8,
      criticalCveCount: 1,
      highCveCount: 4,
      mediumCveCount: 10,
      gdprAutomatedDeletionCapable: false,
      piiEncryptionAtRest: true,
      piiEncryptionInTransit: true,
      recommendedSpecialEscrowHoldback: 3500000,
      remediationCostEstimate: 180000
    },
    teamVelocity: {
      doraDeploymentFrequency: 'high',
      doraLeadTimeForChanges: 'medium',
      doraChangeFailureRate: 'medium',
      doraTimeToRestoreService: 'high',
      engineeringVelocityQuotient: 68,
      teamBusFactor: 2,
      topContributorCommitSharePercent: 62,
      documentationCoverageRatio: 0.5,
      busFactorVulnerabilityIndex: 31,
      criticalSiloDomainsCount: 3,
      highFlightRiskKeyPersonsCount: 4,
      recommendedRetentionPoolSize: 2500000,
      retentionProgramDurationMonths: 24,
      keyPersonnel: [
        { id: 'kp-10', roleTitle: 'VP Infrastructure', domainOwnership: 'Multi-region mesh', tenureYears: 5, flightRisk: 'high', busFactorCriticality: 'critical', recommendedRetentionBonus: 800000 }
      ]
    },
    executiveSummaryText: 'Target has scalability bottlenecks at 2x peak load and key-person risk.'
  };

  const createRes = await fetch(`${base}/api/technical-due-diligence/audits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify(newAuditPayload)
  });
  assert.equal(createRes.status, 201);
  const createdAudit = await createRes.json() as TechnicalDueDiligenceAuditDTO;
  assert.equal(createdAudit.targetCompanyName, 'NeuralFlow Data Corp');
  assert.equal(createdAudit.architecture.scalabilitySaturationHorizon, 2.0);
  assert.ok(createdAudit.scorecard.totalValuationHaircutEstimate > 0);

  const getRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getRes.status, 200);

  const addFindingRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}/findings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      pillar: 'security',
      title: 'Unauthenticated Admin Endpoint Discovered',
      severity: 'critical',
      financialImpactUsd: 250000,
      remediationDays: 5,
      description: 'Internal diagnostic endpoint exposed on public routing gateway.',
      remediationPlan: 'Restrict ingress rule and require mTLS authentication.'
    })
  });
  assert.equal(addFindingRes.status, 201);
  const createdFinding = await addFindingRes.json() as DiligenceFindingDTO;
  assert.equal(createdFinding.severity, 'critical');

  const listFindingsRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}/findings`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  const findingsList = await listFindingsRes.json() as DiligenceFindingDTO[];
  assert.equal(findingsList.length, 1);
  assert.equal(findingsList[0].id, createdFinding.id);

  const memoRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}/generate-memo`, {
    method: 'POST',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(memoRes.status, 200);
  const memoData = await memoRes.json() as { markdown: string };
  assert.ok(memoData.markdown.includes('NeuralFlow Data Corp'));
  assert.ok(memoData.markdown.includes('Technical Due Diligence & M&A Vendor Diligence Memorandum'));

  const deleteFindingRes = await fetch(`${base}/api/technical-due-diligence/findings/${createdFinding.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteFindingRes.status, 204);

  const userBAuditRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBAuditRes.status, 404);

  const userBListRes = await fetch(`${base}/api/technical-due-diligence/audits`, {
    headers: { Origin: origin, Cookie: userB.cookie }
  });
  assert.equal(userBListRes.status, 200);
  const userBAudits = await userBListRes.json() as TechnicalDueDiligenceAuditDTO[];
  assert.ok(!userBAudits.some(a => a.id === createdAudit.id));

  const deleteAuditRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}`, {
    method: 'DELETE',
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(deleteAuditRes.status, 204);

  const getDeletedRes = await fetch(`${base}/api/technical-due-diligence/audits/${createdAudit.id}`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(getDeletedRes.status, 404);
});
