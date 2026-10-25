export type SoxControlCategory =
  | 'entity_level'
  | 'it_general_control'
  | 'business_process';

export type SoxControlNature =
  | 'preventive_automated'
  | 'preventive_manual'
  | 'detective_automated'
  | 'detective_manual'
  | 'it_dependent_manual';

export type SoxControlFrequency =
  | 'continuous'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'event_driven';

export type SoxTestingStatus =
  | 'not_started'
  | 'in_progress'
  | 'operating_effectively'
  | 'design_ineffective'
  | 'operating_ineffective';

export type DeficiencyClassification =
  | 'none'
  | 'control_deficiency'
  | 'significant_deficiency'
  | 'material_weakness';

export type FinancialStatementAssertion =
  | 'existence_occurrence'
  | 'completeness'
  | 'valuation_allocation'
  | 'rights_obligations'
  | 'presentation_disclosure';

export type CosoPrinciple =
  | 'p01_integrity_ethical_values'
  | 'p02_board_independence'
  | 'p03_mgmt_structure'
  | 'p04_attract_develop_retain'
  | 'p05_accountability'
  | 'p06_specify_objectives'
  | 'p07_identify_risks'
  | 'p08_assess_fraud_risk'
  | 'p09_identify_changes'
  | 'p10_select_control_activities'
  | 'p11_general_controls_tech'
  | 'p12_deploy_policies_procedures'
  | 'p13_relevant_quality_info'
  | 'p14_internal_communication'
  | 'p15_external_communication'
  | 'p16_ongoing_evaluations'
  | 'p17_communicate_deficiencies';

export type EnterpriseRiskCategory =
  | 'financial_reporting'
  | 'strategic_execution'
  | 'operational_infrastructure'
  | 'regulatory_compliance'
  | 'cybersecurity_information'
  | 'reputational_esg';

export type RiskAppetiteZone =
  | 'within_appetite_green'
  | 'moderate_tolerance_yellow'
  | 'elevated_amber'
  | 'breached_appetite_red';

export type RiskResponseStrategy =
  | 'mitigate_controls'
  | 'transfer_insurance'
  | 'avoid_exit'
  | 'accept_residual';

export type CcmEventType =
  | 'sod_conflict_detected'
  | 'change_management_bypass'
  | 'privileged_access_anomaly'
  | 'cross_tenant_query_attempt';

export type CcmEventSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type CcmResolutionStatus =
  | 'detected'
  | 'investigating'
  | 'remediated'
  | 'accepted_risk'
  | 'false_positive';

export type WhistleblowerCategory =
  | 'accounting_fraud'
  | 'internal_controls_circumvention'
  | 'executive_misconduct'
  | 'bribery_corruption_fcpa'
  | 'insider_trading'
  | 'retaliation'
  | 'data_privacy_breach';

export type WhistleblowerSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical_material';

export type WhistleblowerTriageStatus =
  | 'intake'
  | 'preliminary_inquiry'
  | 'formal_investigation'
  | 'audit_committee_escalated'
  | 'closed_unsubstantiated'
  | 'closed_remediated';

export type RemediationStatus =
  | 'open'
  | 'in_progress'
  | 'validation_pending'
  | 'verified_closed'
  | 'overdue';

export type ArhsHealthBand =
  | 'sovereign_defensibility'
  | 'substantial_compliance'
  | 'material_deficiency_alert'
  | 'critical_non_compliance';

export type SoxTripartiteRole =
  | 'head_of_internal_audit'
  | 'general_counsel_cro'
  | 'board_audit_committee_chair';

export interface SoxInternalControlDTO {
  id: string;
  userId: string;
  controlCode: string;
  title: string;
  description: string;
  category: SoxControlCategory;
  nature: SoxControlNature;
  frequency: SoxControlFrequency;
  cosoPrinciple: CosoPrinciple;
  primaryAssertion: FinancialStatementAssertion;
  controlOwner: string;
  testingStatus: SoxTestingStatus;
  deficiencyClassification: DeficiencyClassification;
  sampleSize: number;
  exceptionsIdentified: number;
  mitigationEfficacyFactor: number;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoxInternalControlMutationDTO {
  controlCode: string;
  title: string;
  description: string;
  category: SoxControlCategory;
  nature: SoxControlNature;
  frequency: SoxControlFrequency;
  cosoPrinciple: CosoPrinciple;
  primaryAssertion: FinancialStatementAssertion;
  controlOwner: string;
  testingStatus: SoxTestingStatus;
  deficiencyClassification: DeficiencyClassification;
  sampleSize: number;
  exceptionsIdentified: number;
  mitigationEfficacyFactor: number;
  lastTestedAt?: string;
}

export interface EnterpriseRiskDTO {
  id: string;
  userId: string;
  riskCode: string;
  title: string;
  category: EnterpriseRiskCategory;
  inherentLikelihood: number;
  inherentImpact: number;
  inherentScore: number;
  residualLikelihood: number;
  residualImpact: number;
  residualScore: number;
  boardAppetiteThreshold: number;
  appetiteZone: RiskAppetiteZone;
  responseStrategy: RiskResponseStrategy;
  mappedControlCodes: string[];
  maxPotentialFinancialLossUsd: number;
  riskOwner: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseRiskMutationDTO {
  riskCode: string;
  title: string;
  category: EnterpriseRiskCategory;
  inherentLikelihood: number;
  inherentImpact: number;
  boardAppetiteThreshold: number;
  responseStrategy: RiskResponseStrategy;
  mappedControlCodes: string[];
  maxPotentialFinancialLossUsd: number;
  riskOwner: string;
}

export interface RiskHeatmapCellDTO {
  likelihood: number;
  impact: number;
  riskCount: number;
  riskCodes: string[];
  zone: RiskAppetiteZone;
}

export interface RiskHeatmapMatrixDTO {
  cells: RiskHeatmapCellDTO[];
  totalRisks: number;
  withinAppetiteCount: number;
  moderateToleranceCount: number;
  elevatedCount: number;
  breachedCount: number;
}

export interface CcmAuditEventDTO {
  id: string;
  userId: string;
  eventCode: string;
  eventType: CcmEventType;
  severity: CcmEventSeverity;
  actorId: string;
  actorEmail: string;
  resourceTarget: string;
  sodConflictRuleId?: string;
  privilegeDistance: number;
  exposureVolumeUsd: number;
  compensatingControlActive: boolean;
  sodSeverityScore: number;
  resolutionStatus: CcmResolutionStatus;
  evidencePayload: Record<string, unknown>;
  detectedAt: string;
  resolvedAt?: string;
}

export interface CcmAuditEventMutationDTO {
  eventCode: string;
  eventType: CcmEventType;
  severity: CcmEventSeverity;
  actorId: string;
  actorEmail: string;
  resourceTarget: string;
  sodConflictRuleId?: string;
  privilegeDistance: number;
  exposureVolumeUsd: number;
  compensatingControlActive: boolean;
  evidencePayload: Record<string, unknown>;
}

export interface WhistleblowerReportDTO {
  id: string;
  userId: string;
  reportTrackingNumber: string;
  category: WhistleblowerCategory;
  severity: WhistleblowerSeverity;
  triageStatus: WhistleblowerTriageStatus;
  allegationSummary: string;
  involvedPersonsMasked: string[];
  estimatedFinancialExposureUsd: number;
  legalHoldActive: boolean;
  auditCommitteeEscalated: boolean;
  assignedLeadInvestigator?: string;
  receiptTokenHash: string;
  reportedAt: string;
  updatedAt: string;
}

export interface WhistleblowerReportIntakeDTO {
  category: WhistleblowerCategory;
  allegationSummary: string;
  detailedNarrative: string;
  involvedPersonsMasked: string[];
  estimatedFinancialExposureUsd: number;
  evidenceAttachmentsCount: number;
}

export interface WhistleblowerTriageMutationDTO {
  severity: WhistleblowerSeverity;
  triageStatus: WhistleblowerTriageStatus;
  legalHoldActive: boolean;
  auditCommitteeEscalated: boolean;
  assignedLeadInvestigator?: string;
}

export interface RemediationActionPlanDTO {
  id: string;
  userId: string;
  capaCode: string;
  title: string;
  description: string;
  sourceType: 'sox_deficiency' | 'erm_risk' | 'ccm_incident' | 'whistleblower_finding';
  sourceReferenceId: string;
  actionOwner: string;
  targetRemediationDate: string;
  actualCompletionDate?: string;
  status: RemediationStatus;
  compensatingControlsInPlace: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemediationActionPlanMutationDTO {
  capaCode: string;
  title: string;
  description: string;
  sourceType: 'sox_deficiency' | 'erm_risk' | 'ccm_incident' | 'whistleblower_finding';
  sourceReferenceId: string;
  actionOwner: string;
  targetRemediationDate: string;
  compensatingControlsInPlace: string;
}

export interface SoxTripartiteSignOffDTO {
  role: SoxTripartiteRole;
  signerName: string;
  signerTitle: string;
  attestationConfirmed: boolean;
  signedAt: string;
  signatureToken: string;
  observationsSummary: string;
}

export interface SoxAuditCertificationDTO {
  id: string;
  userId: string;
  fiscalPeriod: string;
  fiscalYear: number;
  overallIcfrAssessment: 'effective' | 'adverse_material_weakness';
  arhsScore: number;
  arhsHealthBand: ArhsHealthBand;
  materialWeaknessCount: number;
  significantDeficiencyCount: number;
  controlDeficiencyCount: number;
  signOffs: SoxTripartiteSignOffDTO[];
  secItem9AMemoMarkdown: string;
  certifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditRiskHealthScoreDTO {
  compositeScore: number;
  healthBand: ArhsHealthBand;
  controlEffectivenessScore: number;
  residualRiskScore: number;
  continuousMonitoringScore: number;
  whistleblowerRemediationScore: number;
  materialWeaknessPenaltyApplied: number;
  totalControlsCount: number;
  effectiveControlsCount: number;
  materialWeaknessesCount: number;
  significantDeficienciesCount: number;
  controlDeficienciesCount: number;
  openSodViolationsCount: number;
  openWhistleblowerCasesCount: number;
  activeRemediationsCount: number;
  overdueRemediationsCount: number;
}

export interface SecItem9AMemoRequestDTO {
  fiscalPeriod: string;
  fiscalYear: number;
  auditorFirmName: string;
  managementEvaluationDate: string;
}

export interface SecItem9AMemoResponseDTO {
  memoTitle: string;
  fiscalPeriod: string;
  memoMarkdown: string;
  overallConclusion: 'effective' | 'adverse_material_weakness';
  arhsScore: number;
  arhsHealthBand: ArhsHealthBand;
}

export interface InternalAuditErmOverviewDTO {
  studio: {
    id: string;
    userId: string;
    enterpriseName: string;
    arhsScore: number;
    arhsBand: ArhsHealthBand;
    totalControlsCount: number;
    effectiveControlsCount: number;
    openDeficienciesCount: number;
  };
  controls: SoxInternalControlDTO[];
  risks: EnterpriseRiskDTO[];
  heatmap: RiskHeatmapMatrixDTO;
  ccmEvents: CcmAuditEventDTO[];
  whistleblowerReports: WhistleblowerReportDTO[];
  remediationPlans: RemediationActionPlanDTO[];
  arhs: AuditRiskHealthScoreDTO;
  latestCertification: SoxAuditCertificationDTO | null;
}

export interface ExecuteControlTestRequestDTO {
  testingStatus: SoxTestingStatus;
  deficiencyClassification: DeficiencyClassification;
  sampleSize?: number;
  exceptionsIdentified?: number;
}

export interface EvaluateSodRequestDTO {
  eventType: CcmEventType;
  toxicWeight: number;
  exposureVolumeUsd: number;
  privilegeDistance: number;
  compensatingControlActive: boolean;
}

export interface RecordTripartiteSignOffRequestDTO {
  role: SoxTripartiteRole;
  signerName: string;
  signerTitle: string;
  attestationConfirmed: boolean;
  observationsSummary: string;
}

export function calculateResidualRisk(
  inherentLikelihood: number,
  inherentImpact: number,
  mappedControls: Array<{
    testingStatus: SoxTestingStatus;
    nature: SoxControlNature;
    deficiencyClassification: DeficiencyClassification;
    mitigationEfficacyFactor: number;
  }>
): {
  inherentScore: number;
  residualScore: number;
  residualLikelihood: number;
  residualImpact: number;
  appetiteZone: RiskAppetiteZone;
  aggregateMitigationFactor: number;
} {
  const inhScore = Math.max(1, Math.min(25, inherentLikelihood * inherentImpact));
  if (mappedControls.length === 0) {
    const defaultZone: RiskAppetiteZone =
      inhScore <= 4
        ? 'within_appetite_green'
        : inhScore <= 9
        ? 'moderate_tolerance_yellow'
        : inhScore <= 14
        ? 'elevated_amber'
        : 'breached_appetite_red';
    return {
      inherentScore: inhScore,
      residualScore: inhScore,
      residualLikelihood: inherentLikelihood,
      residualImpact: inherentImpact,
      appetiteZone: defaultZone,
      aggregateMitigationFactor: 0
    };
  }

  let unmitigatedFraction = 1.0;
  let worstDeficiency: DeficiencyClassification = 'none';

  for (const c of mappedControls) {
    let effectiveness = 0.85;
    if (c.testingStatus === 'design_ineffective') {
      effectiveness = 0.40;
    } else if (c.testingStatus === 'operating_ineffective') {
      effectiveness = 0.15;
    } else if (c.testingStatus === 'not_started' || c.testingStatus === 'in_progress') {
      effectiveness = 0.50;
    }

    let natureWeight = 1.0;
    if (c.nature === 'detective_automated') {
      natureWeight = 0.85;
    } else if (c.nature === 'preventive_manual') {
      natureWeight = 0.70;
    } else if (c.nature === 'detective_manual') {
      natureWeight = 0.55;
    } else if (c.nature === 'it_dependent_manual') {
      natureWeight = 0.65;
    }

    const singleEfficacy = Math.min(0.95, c.mitigationEfficacyFactor * effectiveness * natureWeight);
    unmitigatedFraction *= (1.0 - singleEfficacy);

    if (c.deficiencyClassification === 'material_weakness') {
      worstDeficiency = 'material_weakness';
    } else if (c.deficiencyClassification === 'significant_deficiency' && worstDeficiency !== 'material_weakness') {
      worstDeficiency = 'significant_deficiency';
    } else if (c.deficiencyClassification === 'control_deficiency' && worstDeficiency === 'none') {
      worstDeficiency = 'control_deficiency';
    }
  }

  let penalty = 0.0;
  if (worstDeficiency === 'material_weakness') {
    penalty = 0.50;
  } else if (worstDeficiency === 'significant_deficiency') {
    penalty = 0.25;
  } else if (worstDeficiency === 'control_deficiency') {
    penalty = 0.10;
  }

  const rawMitigation = 1.0 - unmitigatedFraction;
  const adjustedMitigation = Math.max(0.0, rawMitigation * (1.0 - penalty));

  const residualScore = Math.max(1.0, Math.min(25.0, Math.round(inhScore * (1.0 - adjustedMitigation * 0.80) * 100) / 100));

  const residualRatio = residualScore / inhScore;
  const resLikelihood = Math.max(1, Math.min(5, Math.round(inherentLikelihood * Math.sqrt(residualRatio))));
  const resImpact = Math.max(1, Math.min(5, Math.round(inherentImpact * Math.sqrt(residualRatio))));

  let zone: RiskAppetiteZone = 'within_appetite_green';
  if (residualScore > 14) {
    zone = 'breached_appetite_red';
  } else if (residualScore > 9) {
    zone = 'elevated_amber';
  } else if (residualScore > 4) {
    zone = 'moderate_tolerance_yellow';
  }

  return {
    inherentScore: inhScore,
    residualScore,
    residualLikelihood: resLikelihood,
    residualImpact: resImpact,
    appetiteZone: zone,
    aggregateMitigationFactor: Math.round(adjustedMitigation * 1000) / 1000
  };
}

export function calculateSodSeverityIndex(
  eventType: CcmEventType,
  toxicWeight: number,
  exposureVolumeUsd: number,
  privilegeDistance: number,
  compensatingControlActive: boolean
): number {
  let baseScore = 20;
  if (eventType === 'sod_conflict_detected') {
    baseScore = 35;
  } else if (eventType === 'change_management_bypass') {
    baseScore = 40;
  } else if (eventType === 'cross_tenant_query_attempt') {
    baseScore = 50;
  }

  const safeToxic = Math.max(1.0, Math.min(2.5, toxicWeight));
  const safeExposure = Math.max(1, exposureVolumeUsd);
  const logExposure = Math.min(25, Math.log10(safeExposure) * 5);
  const privComp = Math.max(0, Math.min(1.0, privilegeDistance)) * 15;

  const rawIndex = (baseScore + safeToxic * 10 + logExposure + privComp);
  const dampener = compensatingControlActive ? 0.55 : 1.0;
  const finalScore = Math.min(100.0, Math.max(5.0, Math.round(rawIndex * dampener * 10) / 10));

  return finalScore;
}

export function calculateDeficiencyImpactWeight(
  materialWeaknessCount: number,
  significantDeficiencyCount: number,
  controlDeficiencyCount: number,
  aggregateExposureUsd: number,
  materialityThresholdUsd: number
): number {
  const mwWeight = materialWeaknessCount * 25.0;
  const sdWeight = significantDeficiencyCount * 8.0;
  const cdWeight = controlDeficiencyCount * 2.0;

  const safeMateriality = Math.max(1000, materialityThresholdUsd);
  const exposureRatio = Math.min(25.0, (Math.max(0, aggregateExposureUsd) / safeMateriality) * 10.0);

  const total = Math.min(100.0, Math.round((mwWeight + sdWeight + cdWeight + exposureRatio) * 10) / 10);
  return total;
}

export function calculateAuditRiskHealthScore(params: {
  totalControls: number;
  effectiveControls: number;
  inProgressControls: number;
  deficiencyImpactWeight: number;
  materialWeaknessCount: number;
  averageResidualRisk: number;
  boardAppetiteBreachCount: number;
  totalRisksCount: number;
  activeSodViolationsCount: number;
  accumulatedCcmSeveritySum: number;
  unresolvedBypassesCount: number;
  criticalOpenWhistleblowerCount: number;
  highOpenWhistleblowerCount: number;
  overdueRemediationsCount: number;
}): AuditRiskHealthScoreDTO {
  const safeTotalControls = Math.max(1, params.totalControls);
  const ctrlTestingRatio = (params.effectiveControls + params.inProgressControls * 0.5) / safeTotalControls;
  const defPenalty = Math.max(0, 1.0 - params.deficiencyImpactWeight / 100.0);
  const ctrlScore = Math.max(0, Math.min(100, Math.round(ctrlTestingRatio * 100 * defPenalty * 10) / 10));

  const safeTotalRisks = Math.max(1, params.totalRisksCount);
  const safeAvgResRisk = Math.max(1.0, Math.min(25.0, params.averageResidualRisk));
  const riskBaseRatio = 1.0 - (safeAvgResRisk - 1.0) / 24.0;
  const breachRatio = 1.0 - Math.min(1.0, params.boardAppetiteBreachCount / safeTotalRisks);
  const riskScore = Math.max(0, Math.min(100, Math.round(riskBaseRatio * 70 + breachRatio * 30)));

  const ccmDeductions = Math.min(100, params.accumulatedCcmSeveritySum / 10.0 + params.unresolvedBypassesCount * 12.0);
  const ccmScore = Math.max(0, Math.min(100, Math.round(100 - ccmDeductions)));

  const wbhDeductions = Math.min(100, params.criticalOpenWhistleblowerCount * 25.0 + params.highOpenWhistleblowerCount * 10.0 + params.overdueRemediationsCount * 6.0);
  const wbhScore = Math.max(0, Math.min(100, Math.round(100 - wbhDeductions)));

  const mwCliff = params.materialWeaknessCount > 0 ? 30.0 : 0.0;

  const rawComposite = 0.35 * ctrlScore + 0.25 * riskScore + 0.20 * ccmScore + 0.20 * wbhScore - mwCliff;
  const compositeScore = Math.max(0, Math.min(100, Math.round(rawComposite * 10) / 10));

  let band: ArhsHealthBand = 'critical_non_compliance';
  if (compositeScore >= 90.0) {
    band = 'sovereign_defensibility';
  } else if (compositeScore >= 75.0) {
    band = 'substantial_compliance';
  } else if (compositeScore >= 60.0) {
    band = 'material_deficiency_alert';
  }

  return {
    compositeScore,
    healthBand: band,
    controlEffectivenessScore: ctrlScore,
    residualRiskScore: riskScore,
    continuousMonitoringScore: ccmScore,
    whistleblowerRemediationScore: wbhScore,
    materialWeaknessPenaltyApplied: mwCliff,
    totalControlsCount: params.totalControls,
    effectiveControlsCount: params.effectiveControls,
    materialWeaknessesCount: params.materialWeaknessCount,
    significantDeficienciesCount: 0,
    controlDeficienciesCount: 0,
    openSodViolationsCount: params.activeSodViolationsCount,
    openWhistleblowerCasesCount: params.criticalOpenWhistleblowerCount + params.highOpenWhistleblowerCount,
    activeRemediationsCount: params.overdueRemediationsCount,
    overdueRemediationsCount: params.overdueRemediationsCount
  };
}

export function generateRiskHeatmapMatrix(risks: EnterpriseRiskDTO[]): RiskHeatmapMatrixDTO {
  const cellMap = new Map<string, { codes: string[]; zone: RiskAppetiteZone }>();

  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      const key = `${l}:${i}`;
      const score = l * i;
      let zone: RiskAppetiteZone = 'within_appetite_green';
      if (score > 14) {
        zone = 'breached_appetite_red';
      } else if (score > 9) {
        zone = 'elevated_amber';
      } else if (score > 4) {
        zone = 'moderate_tolerance_yellow';
      }
      cellMap.set(key, { codes: [], zone });
    }
  }

  let withinAppetite = 0;
  let moderate = 0;
  let elevated = 0;
  let breached = 0;

  for (const r of risks) {
    const l = Math.max(1, Math.min(5, Math.round(r.residualLikelihood)));
    const i = Math.max(1, Math.min(5, Math.round(r.residualImpact)));
    const key = `${l}:${i}`;
    const entry = cellMap.get(key);
    if (entry) {
      entry.codes.push(r.riskCode);
    }

    if (r.residualScore <= r.boardAppetiteThreshold) {
      withinAppetite++;
    } else if (r.residualScore <= r.boardAppetiteThreshold + 3) {
      moderate++;
    } else if (r.residualScore <= r.boardAppetiteThreshold + 7) {
      elevated++;
    } else {
      breached++;
    }
  }

  const cells: RiskHeatmapCellDTO[] = [];
  for (let l = 1; l <= 5; l++) {
    for (let i = 1; i <= 5; i++) {
      const key = `${l}:${i}`;
      const data = cellMap.get(key)!;
      cells.push({
        likelihood: l,
        impact: i,
        riskCount: data.codes.length,
        riskCodes: data.codes,
        zone: data.zone
      });
    }
  }

  return {
    cells,
    totalRisks: risks.length,
    withinAppetiteCount: withinAppetite,
    moderateToleranceCount: moderate,
    elevatedCount: elevated,
    breachedCount: breached
  };
}

export function generateSecItem9AMemoMarkdown(data: {
  fiscalPeriod: string;
  fiscalYear: number;
  auditorFirmName: string;
  managementEvaluationDate: string;
  arhs: AuditRiskHealthScoreDTO;
  controls: SoxInternalControlDTO[];
  risks: EnterpriseRiskDTO[];
  signOffs: SoxTripartiteSignOffDTO[];
  unresolvedMaterialWeaknesses: string[];
}): string {
  const isEffective = data.arhs.materialWeaknessesCount === 0 && data.unresolvedMaterialWeaknesses.length === 0;
  const conclusionTitle = isEffective
    ? 'EFFECTIVE INTERNAL CONTROL OVER FINANCIAL REPORTING (ICFR)'
    : 'ADVERSE OPINION: MATERIAL WEAKNESS IDENTIFIED IN ICFR';

  const signOffStatusLines = data.signOffs.map(s => {
    const check = s.attestationConfirmed ? 'SIGNED / RATIFIED' : 'PENDING REVIEW';
    return `| ${s.role.replace(/_/g, ' ').toUpperCase()} | ${s.signerName} (${s.signerTitle}) | ${check} | ${s.signedAt || 'N/A'} | \`${s.signatureToken || 'UNASSIGNED'}\` |`;
  }).join('\n');

  const mwSection = data.unresolvedMaterialWeaknesses.length > 0
    ? `### Material Weaknesses Disclosed per PCAOB AS 2201\n` +
      data.unresolvedMaterialWeaknesses.map(mw => `- **${mw}**: Control failure creating a reasonable possibility that a material misstatement will not be prevented or detected on a timely basis.`).join('\n')
    : `### Material Weakness Evaluation\nNo material weaknesses in Internal Control over Financial Reporting were identified as of ${data.managementEvaluationDate}.`;

  return `# UNITED STATES SECURITIES AND EXCHANGE COMMISSION
## WASHINGTON, D.C. 20549
## FORM 10-K ANNUAL REPORT / QUARTERLY ATTESTATION

---

### ITEM 9A. CONTROLS AND PROCEDURES
**Fiscal Period**: ${data.fiscalPeriod} (FY ${data.fiscalYear})
**Independent Registered Public Accounting Firm**: ${data.auditorFirmName}
**Management Evaluation Cutoff Date**: ${data.managementEvaluationDate}

---

### 1. Management's Annual Report on Internal Control Over Financial Reporting (SOX Section 404)
Management of JobTrack is responsible for establishing and maintaining adequate internal control over financial reporting, as defined in Rules 13a-15(f) and 15d-15(f) under the Securities Exchange Act of 1934. Management conducted an evaluation of the effectiveness of internal control over financial reporting based on the framework in **Internal Control — Integrated Framework (2013)** issued by the Committee of Sponsoring Organizations of the Treadway Commission (COSO).

Based on this comprehensive evaluation under the COSO 2013 framework, management has evaluated our internal control over financial reporting and reached the following audit conclusion:

> **CONCLUSION: ${conclusionTitle}**
> **Composite Audit & Risk Health Score (ARHS)**: **${data.arhs.compositeScore} / 100** (${data.arhs.healthBand.replace(/_/g, ' ').toUpperCase()})

---

### 2. PCAOB AS 2201 Control Environment Synthesis
- **Total Key Financial Controls Assessed**: ${data.controls.length}
- **Operating Effectively**: ${data.controls.filter(c => c.testingStatus === 'operating_effectively').length}
- **Deficiencies Identified**: ${data.controls.filter(c => c.deficiencyClassification !== 'none').length}
  - Control Deficiencies: ${data.controls.filter(c => c.deficiencyClassification === 'control_deficiency').length}
  - Significant Deficiencies: ${data.controls.filter(c => c.deficiencyClassification === 'significant_deficiency').length}
  - Material Weaknesses: ${data.controls.filter(c => c.deficiencyClassification === 'material_weakness').length}

${mwSection}

---

### 3. Continuous Automated Control Monitoring (CCM) & Segregation of Duties (SoD)
Continuous surveillance telemetry across the multi-tenant architecture records:
- **Active Segregation of Duties (SoD) Conflicts**: ${data.arhs.openSodViolationsCount}
- **Change Management Bypasses**: ${data.arhs.openSodViolationsCount > 0 ? 'Surveillance Active with Compensating Controls' : 'Zero Unapproved Mutations'}
- **CCM Health Index**: ${data.arhs.continuousMonitoringScore} / 100

---

### 4. Whistleblower Hotline Oversight (SOX Section 301 / Dodd-Frank)
The Audit Committee maintains confidential, anonymous submission procedures for concerns regarding questionable accounting, internal auditing, or financial reporting matters.
- **Active Submissions Under Investigation**: ${data.arhs.openWhistleblowerCasesCount}
- **Legal Hold Directives Issued**: Active on all triaged investigative dossiers.
- **Audit Committee Escalation Triggers**: Enforced for any allegation involving management override or fraud.

---

### 5. Tripartite Digital Sign-Off Ledger (SOX Section 302/906 Certification Chain)
| Governance Role | Officer / Director | Status | Timestamp | Cryptographic Signature Token |
| :--- | :--- | :--- | :--- | :--- |
${signOffStatusLines}

---
*Generated by JobTrack Enterprise Internal Audit & ERM Nexus. All multi-tenant queries isolated under tenant tenancy isolation policies.*
`;
}

export function validateSoxControlInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SoxInternalControlMutationDTO>;

  if (!i.controlCode || typeof i.controlCode !== 'string' || i.controlCode.trim().length === 0) {
    errors.controlCode = 'Control code is required (e.g. ITGC-AC-01)';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters in length';
  }
  if (!i.description || typeof i.description !== 'string' || i.description.trim().length < 5) {
    errors.description = 'Description must be at least 5 characters in length';
  }

  const validCategories: SoxControlCategory[] = ['entity_level', 'it_general_control', 'business_process'];
  if (!i.category || !validCategories.includes(i.category)) {
    errors.category = 'Category must be entity_level, it_general_control, or business_process';
  }

  const validNatures: SoxControlNature[] = [
    'preventive_automated',
    'preventive_manual',
    'detective_automated',
    'detective_manual',
    'it_dependent_manual'
  ];
  if (!i.nature || !validNatures.includes(i.nature)) {
    errors.nature = 'Nature must be a recognized automated or manual control type';
  }

  const validFrequencies: SoxControlFrequency[] = [
    'continuous',
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'annual',
    'event_driven'
  ];
  if (!i.frequency || !validFrequencies.includes(i.frequency)) {
    errors.frequency = 'Frequency must be continuous, daily, weekly, monthly, quarterly, annual, or event_driven';
  }

  if (typeof i.mitigationEfficacyFactor !== 'number' || i.mitigationEfficacyFactor < 0 || i.mitigationEfficacyFactor > 1.0) {
    errors.mitigationEfficacyFactor = 'Mitigation efficacy factor must be between 0.0 and 1.0';
  }

  if (typeof i.sampleSize !== 'number' || i.sampleSize < 0) {
    errors.sampleSize = 'Sample size cannot be negative';
  }

  if (typeof i.exceptionsIdentified !== 'number' || i.exceptionsIdentified < 0) {
    errors.exceptionsIdentified = 'Exceptions count cannot be negative';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateEnterpriseRiskInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<EnterpriseRiskMutationDTO>;

  if (!i.riskCode || typeof i.riskCode !== 'string' || i.riskCode.trim().length === 0) {
    errors.riskCode = 'Risk code is required (e.g. ERM-FIN-01)';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters in length';
  }

  const validCategories: EnterpriseRiskCategory[] = [
    'financial_reporting',
    'strategic_execution',
    'operational_infrastructure',
    'regulatory_compliance',
    'cybersecurity_information',
    'reputational_esg'
  ];
  if (!i.category || !validCategories.includes(i.category)) {
    errors.category = 'Category must be one of the recognized ERM risk taxonomies';
  }

  if (typeof i.inherentLikelihood !== 'number' || i.inherentLikelihood < 1 || i.inherentLikelihood > 5) {
    errors.inherentLikelihood = 'Inherent likelihood must be an integer between 1 and 5';
  }
  if (typeof i.inherentImpact !== 'number' || i.inherentImpact < 1 || i.inherentImpact > 5) {
    errors.inherentImpact = 'Inherent impact must be an integer between 1 and 5';
  }
  if (typeof i.boardAppetiteThreshold !== 'number' || i.boardAppetiteThreshold < 1 || i.boardAppetiteThreshold > 25) {
    errors.boardAppetiteThreshold = 'Board appetite threshold must be between 1 and 25';
  }

  const validStrategies: RiskResponseStrategy[] = [
    'mitigate_controls',
    'transfer_insurance',
    'avoid_exit',
    'accept_residual'
  ];
  if (!i.responseStrategy || !validStrategies.includes(i.responseStrategy)) {
    errors.responseStrategy = 'Response strategy must be mitigate_controls, transfer_insurance, avoid_exit, or accept_residual';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateCcmEventInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<CcmAuditEventMutationDTO>;

  if (!i.eventCode || typeof i.eventCode !== 'string' || i.eventCode.trim().length === 0) {
    errors.eventCode = 'Event code is required';
  }

  const validTypes: CcmEventType[] = [
    'sod_conflict_detected',
    'change_management_bypass',
    'privileged_access_anomaly',
    'cross_tenant_query_attempt'
  ];
  if (!i.eventType || !validTypes.includes(i.eventType)) {
    errors.eventType = 'Event type must be sod_conflict_detected, change_management_bypass, privileged_access_anomaly, or cross_tenant_query_attempt';
  }

  const validSeverities: CcmEventSeverity[] = ['low', 'medium', 'high', 'critical'];
  if (!i.severity || !validSeverities.includes(i.severity)) {
    errors.severity = 'Severity must be low, medium, high, or critical';
  }

  if (!i.actorEmail || typeof i.actorEmail !== 'string' || !i.actorEmail.includes('@')) {
    errors.actorEmail = 'Valid actor email is required';
  }

  if (!i.resourceTarget || typeof i.resourceTarget !== 'string' || i.resourceTarget.trim().length === 0) {
    errors.resourceTarget = 'Resource target is required';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateWhistleblowerReportInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<WhistleblowerReportIntakeDTO>;

  const validCategories: WhistleblowerCategory[] = [
    'accounting_fraud',
    'internal_controls_circumvention',
    'executive_misconduct',
    'bribery_corruption_fcpa',
    'insider_trading',
    'retaliation',
    'data_privacy_breach'
  ];
  if (!i.category || !validCategories.includes(i.category)) {
    errors.category = 'Category must be a recognized whistleblower category';
  }

  if (!i.allegationSummary || typeof i.allegationSummary !== 'string' || i.allegationSummary.trim().length < 5) {
    errors.allegationSummary = 'Allegation summary must be at least 5 characters';
  }

  if (!i.detailedNarrative || typeof i.detailedNarrative !== 'string' || i.detailedNarrative.trim().length < 20) {
    errors.detailedNarrative = 'Detailed narrative must be at least 20 characters in length';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateRemediationPlanInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<RemediationActionPlanMutationDTO>;

  if (!i.capaCode || typeof i.capaCode !== 'string' || i.capaCode.trim().length === 0) {
    errors.capaCode = 'CAPA code is required';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }
  if (!i.targetRemediationDate || typeof i.targetRemediationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(i.targetRemediationDate)) {
    errors.targetRemediationDate = 'Target remediation date must be in YYYY-MM-DD format';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateTripartiteSignOffInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SoxTripartiteSignOffDTO>;

  const validRoles: SoxTripartiteRole[] = [
    'head_of_internal_audit',
    'general_counsel_cro',
    'board_audit_committee_chair'
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Sign-off role must be one of head_of_internal_audit, general_counsel_cro, or board_audit_committee_chair';
  }

  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 2) {
    errors.signerName = 'Signer name is required';
  }

  if (typeof i.attestationConfirmed !== 'boolean' || !i.attestationConfirmed) {
    errors.attestationConfirmed = 'Attestation statement must be explicitly confirmed';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}
