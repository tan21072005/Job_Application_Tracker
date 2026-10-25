import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { app, pool as serverPool } from './server.ts';
import type {
  InternalAuditErmOverviewDTO,
  SoxInternalControlDTO,
  EnterpriseRiskDTO,
  RiskHeatmapMatrixDTO,
  CcmAuditEventDTO,
  WhistleblowerReportDTO,
  RemediationActionPlanDTO,
  SecItem9AMemoResponseDTO,
  SoxAuditCertificationDTO
} from '@jobtrack/contract';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];
let forwardedIp = 9900;

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
  const email = `internal_audit_${randomUUID()}@example.com`;
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Forwarded-For': `127.0.48.${forwardedIp++}`
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

test('internal-audit-erm-nexus: GET /api/sox/overview requires authentication', async () => {
  const res = await fetch(`${base}/api/sox/overview`, {
    headers: { Origin: origin }
  });
  assert.equal(res.status, 401);
});

test('internal-audit-erm-nexus: POST endpoints validate bad payloads', async () => {
  const badCtrl = await fetch(`${base}/api/sox/controls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      controlCode: '',
      title: 'X'
    })
  });
  assert.equal(badCtrl.status, 400);
  const ctrlData = (await badCtrl.json()) as { code: string; errors: Record<string, string> };
  assert.equal(ctrlData.code, 'validation_error');
  assert.ok(ctrlData.errors.controlCode);

  const badRisk = await fetch(`${base}/api/sox/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      riskCode: '',
      title: 'Y'
    })
  });
  assert.equal(badRisk.status, 400);
  const riskData = (await badRisk.json()) as { code: string; errors: Record<string, string> };
  assert.equal(riskData.code, 'validation_error');
  assert.ok(riskData.errors.riskCode);

  const badWbh = await fetch(`${base}/api/sox/whistleblower/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      category: 'accounting_fraud',
      allegationSummary: 'Too',
      detailedNarrative: 'Short'
    })
  });
  assert.equal(badWbh.status, 400);
  const wbhData = (await badWbh.json()) as { code: string; errors: Record<string, string> };
  assert.equal(wbhData.code, 'validation_error');
  assert.ok(wbhData.errors.allegationSummary || wbhData.errors.detailedNarrative);
});

test('internal-audit-erm-nexus: comprehensive 5-pillar lifecycle test for userA', async () => {
  const overviewRes = await fetch(`${base}/api/sox/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(overviewRes.status, 200);
  const overview = (await overviewRes.json()) as InternalAuditErmOverviewDTO;
  assert.ok(overview.studio);
  assert.equal(overview.controls.length, 5);
  assert.equal(overview.risks.length, 4);
  assert.equal(overview.ccmEvents.length, 2);
  assert.equal(overview.whistleblowerReports.length, 1);
  assert.equal(overview.remediationPlans.length, 1);
  assert.ok(overview.arhs.compositeScore >= 80);

  const newCtrlRes = await fetch(`${base}/api/sox/controls`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      controlCode: 'ITGC-OPS-03',
      title: 'Disaster Recovery Warm Standby Automated Failover Testing',
      description: 'Quarterly automated database replication verification and cross-region failover drill.',
      category: 'it_general_control',
      nature: 'preventive_automated',
      frequency: 'quarterly',
      cosoPrinciple: 'p11_general_controls_tech',
      primaryAssertion: 'existence_occurrence',
      controlOwner: 'Head of Infrastructure',
      testingStatus: 'operating_effectively',
      deficiencyClassification: 'none',
      sampleSize: 10,
      exceptionsIdentified: 0,
      mitigationEfficacyFactor: 0.90
    })
  });
  assert.equal(newCtrlRes.status, 201);
  const createdCtrl = (await newCtrlRes.json()) as SoxInternalControlDTO;
  assert.equal(createdCtrl.controlCode, 'ITGC-OPS-03');

  const testCtrlRes = await fetch(`${base}/api/sox/controls/${createdCtrl.id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      testingStatus: 'operating_effectively',
      deficiencyClassification: 'none',
      sampleSize: 12,
      exceptionsIdentified: 0
    })
  });
  assert.equal(testCtrlRes.status, 200);
  const testedCtrl = (await testCtrlRes.json()) as SoxInternalControlDTO;
  assert.equal(testedCtrl.sampleSize, 12);

  const newRiskRes = await fetch(`${base}/api/sox/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      riskCode: 'ERM-STR-05',
      title: 'Geopolitical Sanctions & Cross-Border Supply Disruption',
      category: 'strategic_execution',
      inherentLikelihood: 3,
      inherentImpact: 4,
      boardAppetiteThreshold: 9,
      responseStrategy: 'mitigate_controls',
      mappedControlCodes: ['ITGC-OPS-03'],
      maxPotentialFinancialLossUsd: 5000000,
      riskOwner: 'VP of Strategy'
    })
  });
  assert.equal(newRiskRes.status, 201);
  const createdRisk = (await newRiskRes.json()) as EnterpriseRiskDTO;
  assert.equal(createdRisk.riskCode, 'ERM-STR-05');
  assert.ok(createdRisk.residualScore < createdRisk.inherentScore);

  const heatmapRes = await fetch(`${base}/api/sox/risks/heatmap`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  });
  assert.equal(heatmapRes.status, 200);
  const heatmap = (await heatmapRes.json()) as RiskHeatmapMatrixDTO;
  assert.equal(heatmap.totalRisks, 5);
  assert.equal(heatmap.cells.length, 25);

  const sodRes = await fetch(`${base}/api/sox/ccm/evaluate-sod`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      eventType: 'sod_conflict_detected',
      toxicWeight: 2.0,
      exposureVolumeUsd: 150000,
      privilegeDistance: 0.8,
      compensatingControlActive: false
    })
  });
  assert.equal(sodRes.status, 200);
  const sodEval = (await sodRes.json()) as { severityScore: number; riskRating: string; recommendations: string[] };
  assert.ok(sodEval.severityScore > 50);
  assert.ok(sodEval.recommendations.length > 0);

  const wbhRes = await fetch(`${base}/api/sox/whistleblower/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      category: 'accounting_fraud',
      allegationSummary: 'Premature capitalization of internal research software development costs in violation of ASC 350-40.',
      detailedNarrative: 'Engineering timesheets were systematically reallocated to capitalized capital expenditure projects without verifiable sprint ticket logs.',
      involvedPersonsMasked: ['Engineering Director #4'],
      estimatedFinancialExposureUsd: 320000,
      evidenceAttachmentsCount: 2
    })
  });
  assert.equal(wbhRes.status, 201);
  const wbhOutcome = (await wbhRes.json()) as { report: WhistleblowerReportDTO; receiptToken: string };
  assert.ok(wbhOutcome.report.reportTrackingNumber.startsWith('WBH-'));
  assert.ok(wbhOutcome.receiptToken.startsWith('WBH_SECRET_'));

  const capaRes = await fetch(`${base}/api/sox/remediations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      capaCode: 'CAPA-2026-02',
      title: 'Automate Jira Time Tracking Cross-Check for ASC 350-40 Capitalization',
      description: 'Implement automated API synchronization between sprint velocity burndown and finance capital expenditure allocation.',
      sourceType: 'whistleblower_finding',
      sourceReferenceId: wbhOutcome.report.id,
      actionOwner: 'Director of Financial Engineering',
      targetRemediationDate: '2026-12-15',
      compensatingControlsInPlace: 'Manual weekly timesheet certification by engineering VPs'
    })
  });
  assert.equal(capaRes.status, 201);
  const capaPlan = (await capaRes.json()) as RemediationActionPlanDTO;
  assert.equal(capaPlan.capaCode, 'CAPA-2026-02');

  const memoRes = await fetch(`${base}/api/sox/board-war-room/generate-memo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      fiscalPeriod: 'Q4-2026',
      fiscalYear: 2026,
      auditorFirmName: 'PricewaterhouseCoopers LLP',
      managementEvaluationDate: '2026-12-31'
    })
  });
  assert.equal(memoRes.status, 201);
  const memo = (await memoRes.json()) as SecItem9AMemoResponseDTO;
  assert.equal(memo.fiscalPeriod, 'Q4-2026');
  assert.ok(memo.memoMarkdown.includes('ITEM 9A. CONTROLS AND PROCEDURES'));

  const refreshedOverview = await (await fetch(`${base}/api/sox/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  })).json() as InternalAuditErmOverviewDTO;
  assert.ok(refreshedOverview.latestCertification);
  const certId = refreshedOverview.latestCertification.id;

  const signRes = await fetch(`${base}/api/sox/board-war-room/certifications/${certId}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userA.cookie
    },
    body: JSON.stringify({
      role: 'general_counsel_cro',
      signerName: 'Jonathan Vance, Esq.',
      signerTitle: 'General Counsel & CRO',
      attestationConfirmed: true,
      observationsSummary: 'Completed full regulatory triage on open whistleblower cases and confirmed legal compliance.'
    })
  });
  assert.equal(signRes.status, 200);
  const updatedCert = (await signRes.json()) as SoxAuditCertificationDTO;
  assert.ok(updatedCert.signOffs.some(s => s.role === 'general_counsel_cro' && s.attestationConfirmed));
});

test('internal-audit-erm-nexus: multi-tenant isolation prevents cross-tenant access', async () => {
  const overviewA = await (await fetch(`${base}/api/sox/overview`, {
    headers: { Origin: origin, Cookie: userA.cookie }
  })).json() as InternalAuditErmOverviewDTO;
  const controlA = overviewA.controls[0];
  const certA = overviewA.latestCertification!;

  const crossTest = await fetch(`${base}/api/sox/controls/${controlA.id}/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      testingStatus: 'operating_ineffective',
      deficiencyClassification: 'material_weakness'
    })
  });
  assert.equal(crossTest.status, 404);

  const crossSign = await fetch(`${base}/api/sox/board-war-room/certifications/${certA.id}/signoff`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      Cookie: userB.cookie
    },
    body: JSON.stringify({
      role: 'board_audit_committee_chair',
      signerName: 'Intruder',
      signerTitle: 'Hacker',
      attestationConfirmed: true,
      observationsSummary: 'Illegal breach attempt'
    })
  });
  assert.equal(crossSign.status, 404);
});
