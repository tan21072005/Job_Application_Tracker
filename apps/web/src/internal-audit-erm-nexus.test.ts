import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateResidualRisk,
  calculateSodSeverityIndex,
  calculateDeficiencyImpactWeight,
  calculateAuditRiskHealthScore,
  generateRiskHeatmapMatrix,
  generateSecItem9AMemoMarkdown,
  type SoxInternalControlDTO,
  type EnterpriseRiskDTO,
  type InternalAuditErmOverviewDTO
} from './domain';
import { internalAuditErmNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Internal Audit & ERM Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Residual Risk, SoD Severity Index, and Deficiency Impact Weight', () => {
    const resRisk = calculateResidualRisk(4, 4, [
      {
        testingStatus: 'operating_effectively',
        nature: 'preventive_automated',
        deficiencyClassification: 'none',
        mitigationEfficacyFactor: 0.95
      }
    ]);
    expect(resRisk.inherentScore).toBe(16);
    expect(resRisk.residualScore).toBeLessThan(10);
    expect(resRisk.appetiteZone).toBe('moderate_tolerance_yellow');

    const sodIndex = calculateSodSeverityIndex('sod_conflict_detected', 2.0, 150000, 0.8, false);
    expect(sodIndex).toBeGreaterThan(60);
    expect(sodIndex).toBeLessThanOrEqual(100);

    const mitigatedSodIndex = calculateSodSeverityIndex('sod_conflict_detected', 2.0, 150000, 0.8, true);
    expect(mitigatedSodIndex).toBeLessThan(sodIndex);

    const defWeight = calculateDeficiencyImpactWeight(1, 2, 3, 500000, 5000000);
    expect(defWeight).toBeGreaterThan(40);
  });

  it('calculates Audit Risk Health Score with Material Weakness cliff penalties', () => {
    const arhsNoMw = calculateAuditRiskHealthScore({
      totalControls: 10,
      effectiveControls: 9,
      inProgressControls: 1,
      deficiencyImpactWeight: 5,
      materialWeaknessCount: 0,
      averageResidualRisk: 4.5,
      boardAppetiteBreachCount: 0,
      totalRisksCount: 8,
      activeSodViolationsCount: 1,
      accumulatedCcmSeveritySum: 30,
      unresolvedBypassesCount: 0,
      criticalOpenWhistleblowerCount: 0,
      highOpenWhistleblowerCount: 0,
      overdueRemediationsCount: 0
    });
    expect(arhsNoMw.compositeScore).toBeGreaterThanOrEqual(80);
    expect(arhsNoMw.materialWeaknessPenaltyApplied).toBe(0);

    const arhsWithMw = calculateAuditRiskHealthScore({
      totalControls: 10,
      effectiveControls: 8,
      inProgressControls: 1,
      deficiencyImpactWeight: 35,
      materialWeaknessCount: 1,
      averageResidualRisk: 6.5,
      boardAppetiteBreachCount: 1,
      totalRisksCount: 8,
      activeSodViolationsCount: 2,
      accumulatedCcmSeveritySum: 70,
      unresolvedBypassesCount: 1,
      criticalOpenWhistleblowerCount: 1,
      highOpenWhistleblowerCount: 1,
      overdueRemediationsCount: 1
    });
    expect(arhsWithMw.materialWeaknessPenaltyApplied).toBe(30);
    expect(arhsWithMw.compositeScore).toBeLessThanOrEqual(70);
    expect(arhsWithMw.healthBand).toBe('critical_non_compliance');
  });

  it('generates dynamic 5x5 Risk Heatmap matrix and SEC Item 9A ICFR disclosure', () => {
    const sampleRisks: EnterpriseRiskDTO[] = [
      {
        id: 'r1',
        userId: 'u1',
        riskCode: 'ERM-FIN-01',
        title: 'Financial Misstatement',
        category: 'financial_reporting',
        inherentLikelihood: 4,
        inherentImpact: 4,
        inherentScore: 16,
        residualLikelihood: 2,
        residualImpact: 2,
        residualScore: 4.5,
        boardAppetiteThreshold: 8,
        appetiteZone: 'within_appetite_green',
        responseStrategy: 'mitigate_controls',
        mappedControlCodes: ['C1'],
        maxPotentialFinancialLossUsd: 1000000,
        riskOwner: 'Owner 1',
        createdAt: '2026-10-01',
        updatedAt: '2026-10-01'
      }
    ];

    const matrix = generateRiskHeatmapMatrix(sampleRisks);
    expect(matrix.cells.length).toBe(25);
    expect(matrix.totalRisks).toBe(1);
    expect(matrix.withinAppetiteCount).toBe(1);

    const markdown = generateSecItem9AMemoMarkdown({
      fiscalPeriod: 'Q3-2026',
      fiscalYear: 2026,
      auditorFirmName: 'PwC LLP',
      managementEvaluationDate: '2026-09-30',
      arhs: {
        compositeScore: 92,
        healthBand: 'sovereign_defensibility',
        controlEffectivenessScore: 95,
        residualRiskScore: 90,
        continuousMonitoringScore: 92,
        whistleblowerRemediationScore: 90,
        materialWeaknessPenaltyApplied: 0,
        totalControlsCount: 5,
        effectiveControlsCount: 5,
        materialWeaknessesCount: 0,
        significantDeficienciesCount: 0,
        controlDeficienciesCount: 0,
        openSodViolationsCount: 0,
        openWhistleblowerCasesCount: 0,
        activeRemediationsCount: 0,
        overdueRemediationsCount: 0
      },
      controls: [],
      risks: sampleRisks,
      signOffs: [],
      unresolvedMaterialWeaknesses: []
    });
    expect(markdown).toContain('ITEM 9A. CONTROLS AND PROCEDURES');
    expect(markdown).toContain('EFFECTIVE INTERNAL CONTROL OVER FINANCIAL REPORTING');
  });

  it('exercises full repository lifecycle in demo mode', async () => {
    const overview = await internalAuditErmNexusRepository.getOverview();
    expect(overview.studio.arhsScore).toBeGreaterThanOrEqual(80);
    expect(overview.controls.length).toBe(5);
    expect(overview.risks.length).toBe(4);
    expect(overview.ccmEvents.length).toBe(2);
    expect(overview.whistleblowerReports.length).toBe(1);

    const testedCtrl = await internalAuditErmNexusRepository.executeControlTest(overview.controls[0].id, {
      testingStatus: 'operating_effectively',
      deficiencyClassification: 'none',
      sampleSize: 60,
      exceptionsIdentified: 0
    });
    expect(testedCtrl.sampleSize).toBe(60);

    const createdRisk = await internalAuditErmNexusRepository.createRisk({
      riskCode: 'ERM-NEW-02',
      title: 'Cloud FinOps Runaway Spikes',
      category: 'operational_infrastructure',
      inherentLikelihood: 3,
      inherentImpact: 4,
      boardAppetiteThreshold: 9,
      responseStrategy: 'mitigate_controls',
      mappedControlCodes: ['ITGC-AC-01'],
      maxPotentialFinancialLossUsd: 2000000,
      riskOwner: 'Director of FinOps'
    });
    expect(createdRisk.riskCode).toBe('ERM-NEW-02');

    const sodEval = await internalAuditErmNexusRepository.evaluateSod({
      eventType: 'sod_conflict_detected',
      toxicWeight: 1.8,
      exposureVolumeUsd: 90000,
      privilegeDistance: 0.6,
      compensatingControlActive: false
    });
    expect(sodEval.severityScore).toBeGreaterThan(40);

    const remediatedCcm = await internalAuditErmNexusRepository.remediateCcmEvent(overview.ccmEvents[0].id, 'remediated', true);
    expect(remediatedCcm.resolutionStatus).toBe('remediated');

    const wbh = await internalAuditErmNexusRepository.submitWhistleblowerReport({
      category: 'internal_controls_circumvention',
      allegationSummary: 'Production database direct mutation without ticket linkage.',
      detailedNarrative: 'Direct SQL update executed on production user entitlement table.',
      involvedPersonsMasked: ['Database Administrator #3'],
      estimatedFinancialExposureUsd: 150000,
      evidenceAttachmentsCount: 1
    });
    expect(wbh.report.reportTrackingNumber).toContain('WBH-');
    expect(wbh.receiptToken).toContain('WBH_SECRET_');

    const capa = await internalAuditErmNexusRepository.createRemediation({
      capaCode: 'CAPA-TEST-01',
      title: 'Implement JIT DB Access Approvals',
      description: 'Require Slack-based multi-approver elevation for production read/write tokens.',
      sourceType: 'ccm_incident',
      sourceReferenceId: overview.ccmEvents[0].id,
      actionOwner: 'Lead SRE',
      targetRemediationDate: '2026-12-01',
      compensatingControlsInPlace: 'Audit logging enabled'
    });
    expect(capa.capaCode).toBe('CAPA-TEST-01');

    const memo = await internalAuditErmNexusRepository.generateSecItem9AMemo({
      fiscalPeriod: 'Q4-2026',
      fiscalYear: 2026,
      auditorFirmName: 'Ernst & Young LLP',
      managementEvaluationDate: '2026-12-31'
    });
    expect(memo.fiscalPeriod).toBe('Q4-2026');
    expect(memo.memoMarkdown).toContain('ITEM 9A. CONTROLS AND PROCEDURES');

    const refreshed = await internalAuditErmNexusRepository.getOverview();
    expect(refreshed.latestCertification).not.toBeNull();
    const certId = refreshed.latestCertification!.id;

    const signed = await internalAuditErmNexusRepository.signoffCertification(certId, {
      role: 'board_audit_committee_chair',
      signerName: 'Hon. Margaret Holloway',
      signerTitle: 'Audit Committee Chair',
      attestationConfirmed: true,
      observationsSummary: 'Ratified by full Audit Committee.'
    });
    expect(signed.signOffs.some(s => s.role === 'board_audit_committee_chair' && s.attestationConfirmed)).toBe(true);
  });
});
