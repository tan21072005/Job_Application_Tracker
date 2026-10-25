export type CyberRiskCategory =
  | 'ransomware_extortion'
  | 'cloud_infrastructure_compromise'
  | 'third_party_supply_chain'
  | 'data_exfiltration_espionage'
  | 'insider_threat'
  | 'credential_stuffing_account_takeover';

export type VulnerabilityPriorityTier =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low';

export type NistCsfFunction =
  | 'govern'
  | 'identify'
  | 'protect'
  | 'detect'
  | 'respond'
  | 'recover';

export type NistMaturityTier =
  | 'tier_1_partial'
  | 'tier_2_risk_informed'
  | 'tier_3_repeatable'
  | 'tier_4_adaptive';

export type TabletopBreachArchetype =
  | 'ransomware_double_extortion'
  | 'supply_chain_poisoning'
  | 'cloud_iam_privilege_escalation';

export type SecMaterialityStatus =
  | 'non_material'
  | 'under_evaluation'
  | 'material_incident_declared';

export type CyberPostureTier =
  | 'superior_resilience'
  | 'robust_defensible'
  | 'moderate_exposure'
  | 'critical_vulnerability';

export type SignOffGovernanceRole =
  | 'ciso'
  | 'chief_legal_officer'
  | 'board_audit_chair';

export type MemorandumWorkflowStatus =
  | 'draft'
  | 'pending_ciso'
  | 'pending_clo'
  | 'pending_board_chair'
  | 'board_approved'
  | 'archived';

export interface CyberRiskScenarioDTO {
  id: string;
  userId: string;
  title: string;
  category: CyberRiskCategory;
  assetName: string;
  threatActor: string;
  contactFrequency: number;
  probabilityOfAction: number;
  threatEventFrequency: number;
  threatCapability: number;
  resistanceStrength: number;
  vulnerabilityPercent: number;
  lossEventFrequency: number;
  primaryLossMinUsd: number;
  primaryLossLikelyUsd: number;
  primaryLossMaxUsd: number;
  secondaryLossMinUsd: number;
  secondaryLossLikelyUsd: number;
  secondaryLossMaxUsd: number;
  singleLossExpectancyExpectedUsd: number;
  singleLossExpectancyStdDevUsd: number;
  annualizedLossExpectancyUsd: number;
  valueAtRisk95PercentUsd: number;
  inherentAleUsd: number;
  residualAleUsd: number;
  riskReductionRatio: number;
  createdAt: string;
  updatedAt: string;
}

export interface CyberRiskScenarioMutationDTO {
  title: string;
  category: CyberRiskCategory;
  assetName: string;
  threatActor: string;
  contactFrequency: number;
  probabilityOfAction: number;
  threatCapability: number;
  resistanceStrength: number;
  primaryLossMinUsd: number;
  primaryLossLikelyUsd: number;
  primaryLossMaxUsd: number;
  secondaryLossMinUsd: number;
  secondaryLossLikelyUsd: number;
  secondaryLossMaxUsd: number;
  inherentAleUsd: number;
}

export interface ThreatVulnerabilityDTO {
  id: string;
  userId: string;
  cveId: string;
  title: string;
  cvssScore: number;
  epssProbability: number;
  epssPercentile: number;
  cisaKevStatus: boolean;
  affectedAsset: string;
  component: string;
  compositeRiskScore: number;
  priorityTier: VulnerabilityPriorityTier;
  remediationStatus: 'open' | 'in_progress' | 'mitigated' | 'accepted';
  patchDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThreatVulnerabilityMutationDTO {
  cveId: string;
  title: string;
  cvssScore: number;
  epssProbability: number;
  epssPercentile: number;
  cisaKevStatus: boolean;
  affectedAsset: string;
  component: string;
  remediationStatus: 'open' | 'in_progress' | 'mitigated' | 'accepted';
  patchDueDate: string;
}

export interface DarkWebExposureDTO {
  id: string;
  userId: string;
  targetDomain: string;
  breachSource: string;
  exposureDate: string;
  leakedEmail: string;
  hasPlaintextPassword: boolean;
  hasSessionToken: boolean;
  isVipExecutive: boolean;
  vipTitle?: string;
  infostealerVariant?: string;
  exposureRiskScore: number;
  remediationStatus: 'active' | 'password_reset' | 'mfa_enforced' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface DarkWebExposureMutationDTO {
  targetDomain: string;
  breachSource: string;
  exposureDate: string;
  leakedEmail: string;
  hasPlaintextPassword: boolean;
  hasSessionToken: boolean;
  isVipExecutive: boolean;
  vipTitle?: string;
  infostealerVariant?: string;
  remediationStatus: 'active' | 'password_reset' | 'mfa_enforced' | 'resolved';
}

export interface ThreatLandscapeOverviewDTO {
  attackSurfaceRating: number;
  credentialLeakExposureIndex: number;
  totalVulnerabilitiesCount: number;
  criticalVulnerabilitiesCount: number;
  cisaKevActiveCount: number;
  vipExecutivesMonitoredCount: number;
  vipExecutivesCompromisedCount: number;
  vulnerabilities: ThreatVulnerabilityDTO[];
  darkWebExposures: DarkWebExposureDTO[];
}

export interface ComplianceControlDTO {
  id: string;
  userId: string;
  functionCode: NistCsfFunction;
  categoryCode: string;
  subcategoryCode: string;
  title: string;
  description: string;
  iso27001Mapping: string;
  soc2Mapping: string;
  hipaaMapping: string;
  maturityTier: NistMaturityTier;
  maturityNumericTier: number;
  hasVerifiedEvidence: boolean;
  lastAuditedDate: string;
  auditorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceControlMutationDTO {
  functionCode: NistCsfFunction;
  categoryCode: string;
  subcategoryCode: string;
  title: string;
  description: string;
  iso27001Mapping: string;
  soc2Mapping: string;
  hipaaMapping: string;
  maturityTier: NistMaturityTier;
  hasVerifiedEvidence: boolean;
  lastAuditedDate: string;
  auditorNotes: string;
}

export interface FunctionMaturitySummaryDTO {
  functionCode: NistCsfFunction;
  functionLabel: string;
  averageTier: number;
  tierClassification: NistMaturityTier;
  controlCount: number;
  evidencedCount: number;
  evidenceCoveragePercent: number;
}

export interface ComplianceMatrixOverviewDTO {
  auditDefensibilityScore: number;
  overallMaturityAverage: number;
  totalControlsCount: number;
  totalEvidencedCount: number;
  evidenceCoverageRate: number;
  functionSummaries: Record<NistCsfFunction, FunctionMaturitySummaryDTO>;
  controls: ComplianceControlDTO[];
}

export interface TabletopSimulationDTO {
  id: string;
  userId: string;
  archetype: TabletopBreachArchetype;
  scenarioTitle: string;
  conductedDate: string;
  participantsCount: number;
  meanTimeToDetectHours: number;
  meanTimeToContainHours: number;
  simulatedRansomDemandedUsd: number;
  simulatedBusinessInterruptionDays: number;
  simulatedTotalLossUsd: number;
  immutableBackupScore: number;
  airgapIsolationScore: number;
  rtoRpoDrillScore: number;
  pamSegregationScore: number;
  ransomwareResilienceIndex: number;
  keyFindings: string[];
  remediationActionItems: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TabletopSimulationMutationDTO {
  archetype: TabletopBreachArchetype;
  scenarioTitle: string;
  conductedDate: string;
  participantsCount: number;
  meanTimeToDetectHours: number;
  meanTimeToContainHours: number;
  simulatedRansomDemandedUsd: number;
  simulatedBusinessInterruptionDays: number;
  simulatedTotalLossUsd: number;
  immutableBackupScore: number;
  airgapIsolationScore: number;
  rtoRpoDrillScore: number;
  pamSegregationScore: number;
  keyFindings: string[];
  remediationActionItems: string[];
}

export interface CyberInsurancePolicyDTO {
  policyNumber: string;
  carrierName: string;
  expirationDate: string;
  primaryAggregateLimitUsd: number;
  ransomwareExtortionSublimitUsd: number;
  businessInterruptionSublimitUsd: number;
  regulatoryFineSublimitUsd: number;
  forensicLegalSublimitUsd: number;
  selfInsuredRetentionUsd: number;
  waitingPeriodHours: number;
  annualPremiumUsd: number;
  totalVaR95ExposureUsd: number;
  coverageShortfallUsd: number;
  insurabilityReadinessScore: number;
  underwritingDeficiencies: string[];
}

export interface SecMaterialityDeterminationDTO {
  incidentId: string;
  incidentTitle: string;
  detectionTimestamp: string;
  determinationTimestamp: string;
  status: SecMaterialityStatus;
  estimatedFinancialLossUsd: number;
  annualRevenueThresholdUsd: number;
  quantitativeMaterialityRatio: number;
  isQuantitativelyMaterial: boolean;
  qualitativeScore: number;
  isQualitativelyMaterial: boolean;
  isMaterial: boolean;
  disclosureClockElapsedHours: number;
  disclosureClockRemainingHours: number;
  isClockBreached: boolean;
  piiExfiltratedRecordCount: number;
  criticalSystemsDowntimeHours: number;
  intellectualPropertyCompromised: boolean;
  regulatorySanctionsProbable: boolean;
  reputationalDamageHigh: boolean;
  cisoDeterminationNotes: string;
  cloLegalEvaluationNotes: string;
}

export interface GovernanceSignOffRecordDTO {
  role: SignOffGovernanceRole;
  roleLabel: string;
  signatoryName?: string;
  signatoryTitle?: string;
  signatureHash?: string;
  signedAt?: string;
  isApproved: boolean;
  attestationRemarks?: string;
}

export interface BoardCyberMemorandumDTO {
  id: string;
  userId: string;
  fiscalYear: number;
  quarter: number;
  title: string;
  compositeSecurityPostureScore: number;
  postureTier: CyberPostureTier;
  workflowStatus: MemorandumWorkflowStatus;
  secMateriality: SecMaterialityDeterminationDTO;
  signOffs: GovernanceSignOffRecordDTO[];
  memorandumMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCyberMemorandumMutationDTO {
  fiscalYear: number;
  quarter: number;
  title: string;
  secMateriality: SecMaterialityDeterminationDTO;
}

export interface GovernanceSignOffPayloadDTO {
  role: SignOffGovernanceRole;
  signatoryName: string;
  signatoryTitle: string;
  attestationRemarks: string;
}

export interface CyberRiskStudioOverviewDTO {
  compositeSecurityPostureScore: number;
  postureTier: CyberPostureTier;
  totalAnnualizedLossExpectancyUsd: number;
  totalValueAtRisk95Usd: number;
  attackSurfaceRating: number;
  darkWebExposureIndex: number;
  auditDefensibilityScore: number;
  ransomwareResilienceIndex: number;
  insuranceCoverageGapUsd: number;
  activeSecDisclosureRequired: boolean;
  scenarios: CyberRiskScenarioDTO[];
  threatLandscape: ThreatLandscapeOverviewDTO;
  complianceMatrix: ComplianceMatrixOverviewDTO;
  tabletopSimulations: TabletopSimulationDTO[];
  insurancePolicy: CyberInsurancePolicyDTO;
  activeMemorandum: BoardCyberMemorandumDTO;
}

export function calculateFairRiskMetrics(params: {
  contactFrequency: number;
  probabilityOfAction: number;
  threatCapability: number;
  resistanceStrength: number;
  primaryLossMinUsd: number;
  primaryLossLikelyUsd: number;
  primaryLossMaxUsd: number;
  secondaryLossMinUsd: number;
  secondaryLossLikelyUsd: number;
  secondaryLossMaxUsd: number;
  inherentAleUsd: number;
}): {
  threatEventFrequency: number;
  vulnerabilityPercent: number;
  lossEventFrequency: number;
  singleLossExpectancyExpectedUsd: number;
  singleLossExpectancyStdDevUsd: number;
  annualizedLossExpectancyUsd: number;
  valueAtRisk95PercentUsd: number;
  residualAleUsd: number;
  riskReductionRatio: number;
} {
  const cf = Math.max(0.01, params.contactFrequency);
  const poa = Math.min(1.0, Math.max(0.01, params.probabilityOfAction));
  const tef = Number((cf * poa).toFixed(4));

  const tcap = Math.min(100, Math.max(1, params.threatCapability));
  const rs = Math.min(100, Math.max(1, params.resistanceStrength));
  const vulnRaw = (tcap - rs + 100) / 200;
  const vulnerabilityPercent = Number((Math.min(0.99, Math.max(0.01, vulnRaw)) * 100).toFixed(2));
  const lef = Number(((tef * vulnerabilityPercent) / 100).toFixed(4));

  const primMin = Math.max(0, params.primaryLossMinUsd);
  const primLikely = Math.max(primMin, params.primaryLossLikelyUsd);
  const primMax = Math.max(primLikely, params.primaryLossMaxUsd);

  const secMin = Math.max(0, params.secondaryLossMinUsd);
  const secLikely = Math.max(secMin, params.secondaryLossLikelyUsd);
  const secMax = Math.max(secLikely, params.secondaryLossMaxUsd);

  const totalMin = primMin + secMin;
  const totalLikely = primLikely + secLikely;
  const totalMax = primMax + secMax;

  const sleExpected = Math.round((totalMin + 4 * totalLikely + totalMax) / 6);
  const sleStdDev = Math.round((totalMax - totalMin) / 6);
  const ale = Math.round(lef * sleExpected);

  const varianceRatio = (lef * Math.pow(sleStdDev, 2) + lef * Math.pow(sleExpected, 2)) / Math.max(1, Math.pow(ale, 2));
  const sigmaLn = Math.sqrt(Math.log(1 + Math.max(0.01, varianceRatio)));
  const muLn = Math.log(Math.max(1, ale)) - 0.5 * Math.pow(sigmaLn, 2);
  const var95 = Math.round(Math.exp(muLn + 1.64485 * sigmaLn));

  const inherent = Math.max(1, params.inherentAleUsd);
  const reduction = Number(Math.max(0, Math.min(1.0, (inherent - ale) / inherent)).toFixed(4));

  return {
    threatEventFrequency: tef,
    vulnerabilityPercent,
    lossEventFrequency: lef,
    singleLossExpectancyExpectedUsd: sleExpected,
    singleLossExpectancyStdDevUsd: sleStdDev,
    annualizedLossExpectancyUsd: ale,
    valueAtRisk95PercentUsd: var95,
    residualAleUsd: ale,
    riskReductionRatio: reduction
  };
}

export function calculateVulnerabilityPriority(
  cvssScore: number,
  epssProbability: number,
  cisaKevStatus: boolean
): {
  compositeRiskScore: number;
  priorityTier: VulnerabilityPriorityTier;
} {
  const cvss = Math.min(10.0, Math.max(0.0, cvssScore));
  const epss = Math.min(1.0, Math.max(0.0, epssProbability));
  const kevBonus = cisaKevStatus ? 20.0 : 0.0;

  const compositeRiskScore = Math.min(
    100,
    Math.round(epss * 50.0 + cvss * 3.0 + kevBonus)
  );

  let priorityTier: VulnerabilityPriorityTier = 'low';
  if (cisaKevStatus || epss >= 0.36 || (cvss >= 9.0 && epss >= 0.15)) {
    priorityTier = 'critical';
  } else if ((cvss >= 7.0 && epss >= 0.1) || cvss >= 9.0) {
    priorityTier = 'high';
  } else if (cvss >= 4.0 || epss >= 0.05) {
    priorityTier = 'medium';
  }

  return { compositeRiskScore, priorityTier };
}

export function calculateAttackSurfaceRating(params: {
  exposedPortsCount: number;
  shadowItDomainsCount: number;
  cloudMisconfigurationsCount: number;
  criticalVulnerabilitiesCount: number;
}): number {
  const ports = Math.max(0, params.exposedPortsCount);
  const shadow = Math.max(0, params.shadowItDomainsCount);
  const cloud = Math.max(0, params.cloudMisconfigurationsCount);
  const crit = Math.max(0, params.criticalVulnerabilitiesCount);

  const rawScore = 12 * Math.log(1 + ports) + 8 * shadow + 15 * cloud + 6 * crit;
  return Math.min(100, Math.round(rawScore));
}

export function calculateDarkWebExposureIndex(exposures: {
  hasPlaintextPassword: boolean;
  hasSessionToken: boolean;
  isVipExecutive: boolean;
  exposureDate: string;
}[]): number {
  if (exposures.length === 0) return 0;
  const now = Date.now();

  let sum = 0;
  for (const exp of exposures) {
    let typeWeight = 1.5;
    if (exp.hasSessionToken) {
      typeWeight = 5.0;
    } else if (exp.hasPlaintextPassword) {
      typeWeight = 3.5;
    }

    const expTime = new Date(exp.exposureDate).getTime();
    const ageDays = Math.max(0, (now - expTime) / (1000 * 60 * 60 * 24));
    let recencyDecay = 0.2;
    if (ageDays < 30) {
      recencyDecay = 1.0;
    } else if (ageDays < 90) {
      recencyDecay = 0.8;
    } else if (ageDays < 365) {
      recencyDecay = 0.5;
    }

    const vipMultiplier = exp.isVipExecutive ? 3.0 : 1.0;
    sum += typeWeight * recencyDecay * vipMultiplier;
  }

  return Math.min(100, Math.round(sum));
}

export function calculateNistComplianceMetrics(controls: {
  functionCode: NistCsfFunction;
  maturityNumericTier: number;
  hasVerifiedEvidence: boolean;
}[]): {
  auditDefensibilityScore: number;
  overallMaturityAverage: number;
  functionSummaries: Record<NistCsfFunction, FunctionMaturitySummaryDTO>;
} {
  const functions: NistCsfFunction[] = ['govern', 'identify', 'protect', 'detect', 'respond', 'recover'];
  const labels: Record<NistCsfFunction, string> = {
    govern: 'Govern (GV)',
    identify: 'Identify (ID)',
    protect: 'Protect (PR)',
    detect: 'Detect (DE)',
    respond: 'Respond (RS)',
    recover: 'Recover (RC)'
  };

  const functionSummaries = {} as Record<NistCsfFunction, FunctionMaturitySummaryDTO>;
  let totalTierSum = 0;
  let totalControls = 0;
  let totalEvidenced = 0;

  for (const fn of functions) {
    const fnControls = controls.filter(c => c.functionCode === fn);
    const count = fnControls.length;
    const evidencedCount = fnControls.filter(c => c.hasVerifiedEvidence).length;
    const tierSum = fnControls.reduce((acc, c) => acc + c.maturityNumericTier, 0);
    const avgTier = count > 0 ? Number((tierSum / count).toFixed(2)) : 1.0;

    let tierClassification: NistMaturityTier = 'tier_1_partial';
    if (avgTier >= 3.5) {
      tierClassification = 'tier_4_adaptive';
    } else if (avgTier >= 2.5) {
      tierClassification = 'tier_3_repeatable';
    } else if (avgTier >= 1.5) {
      tierClassification = 'tier_2_risk_informed';
    }

    functionSummaries[fn] = {
      functionCode: fn,
      functionLabel: labels[fn],
      averageTier: avgTier,
      tierClassification,
      controlCount: count,
      evidencedCount,
      evidenceCoveragePercent: count > 0 ? Number(((evidencedCount / count) * 100).toFixed(1)) : 0
    };

    totalTierSum += avgTier;
    totalControls += count;
    totalEvidenced += evidencedCount;
  }

  const overallMaturityAverage = Number((totalTierSum / 6).toFixed(2));
  const tierComponent = (overallMaturityAverage / 4.0) * 65.0;
  const evidenceComponent = totalControls > 0 ? (totalEvidenced / totalControls) * 35.0 : 0.0;
  const auditDefensibilityScore = Math.min(100, Math.round(tierComponent + evidenceComponent));

  return {
    auditDefensibilityScore,
    overallMaturityAverage,
    functionSummaries
  };
}

export function calculateTabletopResilience(params: {
  immutableBackupScore: number;
  airgapIsolationScore: number;
  rtoRpoDrillScore: number;
  pamSegregationScore: number;
  meanTimeToDetectHours: number;
  meanTimeToContainHours: number;
  simulatedTotalLossUsd: number;
  insurancePrimaryLimitUsd: number;
}): {
  ransomwareResilienceIndex: number;
  insuranceCoverageGapUsd: number;
  insurabilityReadinessScore: number;
} {
  const ib = Math.min(100, Math.max(0, params.immutableBackupScore));
  const ag = Math.min(100, Math.max(0, params.airgapIsolationScore));
  const rto = Math.min(100, Math.max(0, params.rtoRpoDrillScore));
  const pam = Math.min(100, Math.max(0, params.pamSegregationScore));

  const ransomwareResilienceIndex = Math.round(
    0.30 * ib + 0.25 * ag + 0.25 * rto + 0.20 * pam
  );

  const gap = Math.max(0, params.simulatedTotalLossUsd - params.insurancePrimaryLimitUsd);

  const speedScore = Math.max(
    0,
    100 - (params.meanTimeToDetectHours * 1.5 + params.meanTimeToContainHours * 0.8)
  );
  const insurabilityReadinessScore = Math.min(
    100,
    Math.round(0.6 * ransomwareResilienceIndex + 0.4 * speedScore)
  );

  return {
    ransomwareResilienceIndex,
    insuranceCoverageGapUsd: gap,
    insurabilityReadinessScore
  };
}

export function determineSecMateriality(params: {
  estimatedFinancialLossUsd: number;
  annualRevenueThresholdUsd: number;
  detectionTimestamp: string;
  determinationTimestamp: string;
  piiExfiltratedRecordCount: number;
  criticalSystemsDowntimeHours: number;
  intellectualPropertyCompromised: boolean;
  regulatorySanctionsProbable: boolean;
  reputationalDamageHigh: boolean;
}): {
  status: SecMaterialityStatus;
  quantitativeMaterialityRatio: number;
  isQuantitativelyMaterial: boolean;
  qualitativeScore: number;
  isQualitativelyMaterial: boolean;
  isMaterial: boolean;
  disclosureClockElapsedHours: number;
  disclosureClockRemainingHours: number;
  isClockBreached: boolean;
} {
  const threshold = Math.max(1, params.annualRevenueThresholdUsd);
  const ratio = Number((params.estimatedFinancialLossUsd / threshold).toFixed(4));
  const isQuant = ratio >= 1.0;

  let qual = 0;
  if (params.piiExfiltratedRecordCount >= 100000) qual += 25;
  else if (params.piiExfiltratedRecordCount >= 10000) qual += 15;
  else if (params.piiExfiltratedRecordCount > 0) qual += 5;

  if (params.criticalSystemsDowntimeHours >= 48) qual += 25;
  else if (params.criticalSystemsDowntimeHours >= 24) qual += 15;
  else if (params.criticalSystemsDowntimeHours > 0) qual += 5;

  if (params.intellectualPropertyCompromised) qual += 20;
  if (params.regulatorySanctionsProbable) qual += 15;
  if (params.reputationalDamageHigh) qual += 15;

  const isQual = qual >= 60;
  const isMaterial = isQuant || isQual;

  let status: SecMaterialityStatus = 'non_material';
  if (isMaterial) {
    status = 'material_incident_declared';
  } else if (ratio >= 0.5 || qual >= 40) {
    status = 'under_evaluation';
  }

  const detTime = new Date(params.determinationTimestamp).getTime();
  const now = Date.now();
  const elapsed = Math.max(0, Math.round((now - detTime) / (1000 * 60 * 60)));
  const remaining = Math.max(0, 96 - elapsed);
  const isClockBreached = isMaterial && elapsed > 96;

  return {
    status,
    quantitativeMaterialityRatio: ratio,
    isQuantitativelyMaterial: isQuant,
    qualitativeScore: qual,
    isQualitativelyMaterial: isQual,
    isMaterial,
    disclosureClockElapsedHours: elapsed,
    disclosureClockRemainingHours: remaining,
    isClockBreached
  };
}

export function calculateCompositeSecurityScore(params: {
  inherentAleTotalUsd: number;
  residualAleTotalUsd: number;
  attackSurfaceRating: number;
  darkWebExposureIndex: number;
  auditDefensibilityScore: number;
  ransomwareResilienceIndex: number;
}): {
  compositeSecurityPostureScore: number;
  postureTier: CyberPostureTier;
} {
  const inherent = Math.max(1, params.inherentAleTotalUsd);
  const residual = Math.max(0, params.residualAleTotalUsd);
  const aleReductionScore = Math.min(100, Math.max(0, Math.round(100 * (1 - residual / inherent))));

  const asrInverse = Math.max(0, 100 - params.attackSurfaceRating);
  const cleiInverse = Math.max(0, 100 - params.darkWebExposureIndex);

  const csps = Math.min(
    100,
    Math.round(
      0.25 * aleReductionScore +
      0.20 * asrInverse +
      0.15 * cleiInverse +
      0.20 * params.auditDefensibilityScore +
      0.20 * params.ransomwareResilienceIndex
    )
  );

  let postureTier: CyberPostureTier = 'critical_vulnerability';
  if (csps >= 85) {
    postureTier = 'superior_resilience';
  } else if (csps >= 70) {
    postureTier = 'robust_defensible';
  } else if (csps >= 50) {
    postureTier = 'moderate_exposure';
  }

  return { compositeSecurityPostureScore: csps, postureTier };
}

export function generateBoardCyberMemorandumMarkdown(memo: BoardCyberMemorandumDTO): string {
  const signOffRows = memo.signOffs
    .map(s => `| **${s.roleLabel}** | ${s.signatoryName ?? 'Pending Signature'} | ${s.isApproved ? 'APPROVED' : 'PENDING'} | ${s.signedAt ?? 'Awaiting'} |`)
    .join('\n');

  const materialityBadge = memo.secMateriality.isMaterial
    ? 'MATERIAL CYBERSECURITY INCIDENT DECLARED (SEC 8-K ITEM 1.05 REQUIRED)'
    : 'NO MATERIAL BREACH IDENTIFIED (STANDARD COMPLIANCE POSTURE)';

  return `# BOARD AUDIT & RISK COMMITTEE CYBERSECURITY MEMORANDUM
**Fiscal Period**: Q${memo.quarter} ${memo.fiscalYear} | **Classification**: Highly Confidential / Executive Privilege
**Document Title**: ${memo.title}

---

## 1. Executive Summary & Composite Cyber Posture
- **Composite Cyber Security Posture Score (CSPS)**: **${memo.compositeSecurityPostureScore} / 100**
- **Governance Posture Tier**: **${memo.postureTier.toUpperCase()}**
- **SEC Item 1.05 Materiality Status**: **${materialityBadge}**
- **Statutory 4-Day Disclosure Clock Remaining**: **${memo.secMateriality.disclosureClockRemainingHours} Hours**

---

## 2. FAIR Quantitative Financial Cyber Risk Exposure
This enterprise evaluates risk using the Factor Analysis of Information Risk (FAIR) mathematical framework:
- **Estimated Financial Exposure**: $${memo.secMateriality.estimatedFinancialLossUsd.toLocaleString()} USD
- **Quantitative Materiality Ratio**: ${memo.secMateriality.quantitativeMaterialityRatio}x of Enterprise Threshold
- **Qualitative Risk Evaluation Score**: ${memo.secMateriality.qualitativeScore} / 100
- **Compromised PII Records**: ${memo.secMateriality.piiExfiltratedRecordCount.toLocaleString()}
- **Critical Systems Disruption**: ${memo.secMateriality.criticalSystemsDowntimeHours} Hours

---

## 3. Regulatory Attestation & Tripartite Sign-Off Execution
In compliance with corporate board charters and federal disclosure obligations, the undersigned executive officers attest to the findings of this memorandum:

| Governance Role | Signatory | Attestation Status | Timestamp |
| :--- | :--- | :--- | :--- |
${signOffRows}

*Generated autonomously by JobTrack Enterprise Cyber Risk Command Studio. Digital signature hashes locked on approval.*`;
}

export function validateCyberRiskScenarioInput(input: Partial<CyberRiskScenarioMutationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Scenario title is required.');
  }
  if (!input.category) {
    errors.push('Cyber risk category is required.');
  }
  if (!input.assetName || input.assetName.trim().length === 0) {
    errors.push('Target asset name is required.');
  }
  if (!input.threatActor || input.threatActor.trim().length === 0) {
    errors.push('Threat actor profile is required.');
  }
  if (typeof input.contactFrequency !== 'number' || input.contactFrequency <= 0) {
    errors.push('Contact frequency must be a positive number.');
  }
  if (typeof input.probabilityOfAction !== 'number' || input.probabilityOfAction <= 0 || input.probabilityOfAction > 1) {
    errors.push('Probability of action must be between 0.01 and 1.0.');
  }
  if (typeof input.threatCapability !== 'number' || input.threatCapability < 1 || input.threatCapability > 100) {
    errors.push('Threat capability must be between 1 and 100.');
  }
  if (typeof input.resistanceStrength !== 'number' || input.resistanceStrength < 1 || input.resistanceStrength > 100) {
    errors.push('Resistance strength must be between 1 and 100.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateThreatVulnerabilityInput(input: Partial<ThreatVulnerabilityMutationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.cveId || !input.cveId.startsWith('CVE-')) {
    errors.push('Valid CVE ID required (e.g. CVE-2024-3094).');
  }
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Vulnerability title is required.');
  }
  if (typeof input.cvssScore !== 'number' || input.cvssScore < 0 || input.cvssScore > 10) {
    errors.push('CVSS score must be between 0.0 and 10.0.');
  }
  if (typeof input.epssProbability !== 'number' || input.epssProbability < 0 || input.epssProbability > 1) {
    errors.push('EPSS probability must be between 0.0 and 1.0.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateDarkWebExposureInput(input: Partial<DarkWebExposureMutationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.targetDomain || input.targetDomain.trim().length === 0) {
    errors.push('Target corporate domain is required.');
  }
  if (!input.leakedEmail || !input.leakedEmail.includes('@')) {
    errors.push('Valid leaked email address is required.');
  }
  if (!input.breachSource || input.breachSource.trim().length === 0) {
    errors.push('Breach source name is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateComplianceControlInput(input: Partial<ComplianceControlMutationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.functionCode) {
    errors.push('NIST CSF function code is required.');
  }
  if (!input.subcategoryCode || input.subcategoryCode.trim().length === 0) {
    errors.push('Subcategory code is required (e.g. GV.OC-01).');
  }
  if (!input.title || input.title.trim().length === 0) {
    errors.push('Control title is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateTabletopSimulationInput(input: Partial<TabletopSimulationMutationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.archetype) {
    errors.push('Tabletop breach archetype is required.');
  }
  if (!input.scenarioTitle || input.scenarioTitle.trim().length === 0) {
    errors.push('Scenario title is required.');
  }
  if (typeof input.meanTimeToDetectHours !== 'number' || input.meanTimeToDetectHours < 0) {
    errors.push('Mean time to detect must be a non-negative number.');
  }
  if (typeof input.meanTimeToContainHours !== 'number' || input.meanTimeToContainHours < 0) {
    errors.push('Mean time to contain must be a non-negative number.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateGovernanceSignOffInput(input: Partial<GovernanceSignOffPayloadDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.role) {
    errors.push('Sign-off governance role is required.');
  }
  if (!input.signatoryName || input.signatoryName.trim().length === 0) {
    errors.push('Signatory name is required.');
  }
  if (!input.signatoryTitle || input.signatoryTitle.trim().length === 0) {
    errors.push('Signatory title is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function validateMaterialityDeterminationInput(input: Partial<SecMaterialityDeterminationDTO>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!input.incidentId || input.incidentId.trim().length === 0) {
    errors.push('Incident ID is required.');
  }
  if (typeof input.estimatedFinancialLossUsd !== 'number' || input.estimatedFinancialLossUsd < 0) {
    errors.push('Estimated financial loss must be a non-negative number.');
  }
  return { valid: errors.length === 0, errors };
}
