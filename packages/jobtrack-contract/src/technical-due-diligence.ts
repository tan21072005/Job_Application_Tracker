export type DiligenceTransactionType =
  | 'buy_side_acquisition'
  | 'sell_side_vdd'
  | 'growth_equity_pe'
  | 'executive_onboarding_audit';

export type ArchitectureTypology =
  | 'monolith'
  | 'modular_monolith'
  | 'microservices'
  | 'event_driven'
  | 'serverless_hybrid';

export type DiligenceRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export type LicenseCategory =
  | 'permissive'
  | 'weak_copyleft'
  | 'strong_copyleft'
  | 'network_copyleft'
  | 'commercial_dual';

export type SpofComponentType =
  | 'ingress_routing'
  | 'primary_database'
  | 'cache_cluster'
  | 'message_broker'
  | 'auth_identity'
  | 'third_party_saas';

export type DoraTier = 'elite' | 'high' | 'medium' | 'low';

export type TransactionRecommendation =
  | 'proceed_standard'
  | 'proceed_with_haircut'
  | 'mandate_escrow_holdback'
  | 'restructure_renegotiate'
  | 'walk_away_deal_breaker';

export interface ArchitectureScalabilityAuditDTO {
  typology: ArchitectureTypology;
  estimatedTotalLoc: number;
  costPerLocBurdened: number;
  replacementCostEstimate: number;
  technicalDebtRemediationCost: number;
  technicalDebtRatio: number;
  rtoMinutesCurrent: number;
  rtoMinutesTarget: number;
  rpoMinutesCurrent: number;
  rpoMinutesTarget: number;
  disasterRecoveryTestedRecently: boolean;
  spofCount: number;
  spofCriticalityIndex: number;
  currentPeakQps: number;
  maxDatabaseQps: number;
  scalabilitySaturationHorizon: number;
  identifiedSpofs: {
    id: string;
    component: string;
    type: SpofComponentType;
    severity: DiligenceRiskLevel;
    redundancyInPlace: boolean;
    remediationEstimateDays: number;
  }[];
}

export interface LicenseContagionGuardDTO {
  openSourceContagionScore: number;
  proprietaryCodeLinkedWithGpl: boolean;
  cleanRoomDocumented: boolean;
  contractorAssignmentsComplete: boolean;
  patentFtoAnalyzed: boolean;
  dependenciesCount: number;
  copyleftFindingsCount: number;
  licenseBreakdown: {
    permissiveCount: number;
    weakCopyleftCount: number;
    strongCopyleftCount: number;
    networkCopyleftCount: number;
    commercialDualCount: number;
  };
  flaggedLibraries: {
    id: string;
    packageName: string;
    version: string;
    license: string;
    category: LicenseCategory;
    usageMode: 'backend_saas' | 'client_distributed' | 'internal_tool';
    riskLevel: DiligenceRiskLevel;
    remediationStrategy: 'replace_with_permissive' | 'isolate_service' | 'commercial_license';
    remediationCost: number;
  }[];
}

export interface CloudUnitEconomicsDTO {
  annualRecurringRevenue: number;
  annualCloudSpendTotal: number;
  cloudCogsAmount: number;
  cloudCogsPercentOfArr: number;
  currentGrossMarginPercent: number;
  projectedOptimizedGrossMarginPercent: number;
  idleResourceWastageAnnual: number;
  multiYearCommitmentLiability: number;
  finopsOptimizationCaptureEstimate: number;
  spendByProvider: {
    awsAnnual: number;
    gcpAnnual: number;
    azureAnnual: number;
    otherInfrastructureAnnual: number;
  };
  wastageCategories: {
    idleComputeAnnual: number;
    unattachedStorageAnnual: number;
    unindexedEgressAnnual: number;
    overprovisionedDbAnnual: number;
  };
}

export interface SecurityComplianceMatrixDTO {
  securityComplianceMaturityIndex: number;
  soc2Type2Status: 'certified_unqualified' | 'certified_with_exceptions' | 'type_1_only' | 'in_progress' | 'none';
  iso27001Status: 'certified_active' | 'in_audit' | 'expired' | 'none';
  secItem106ReadinessScore: number;
  thirdPartyPenTestRecencyMonths: number;
  criticalCveCount: number;
  highCveCount: number;
  mediumCveCount: number;
  gdprAutomatedDeletionCapable: boolean;
  piiEncryptionAtRest: boolean;
  piiEncryptionInTransit: boolean;
  recommendedSpecialEscrowHoldback: number;
  remediationCostEstimate: number;
}

export interface TeamVelocityDependencyDTO {
  doraDeploymentFrequency: DoraTier;
  doraLeadTimeForChanges: DoraTier;
  doraChangeFailureRate: DoraTier;
  doraTimeToRestoreService: DoraTier;
  engineeringVelocityQuotient: number;
  teamBusFactor: number;
  topContributorCommitSharePercent: number;
  documentationCoverageRatio: number;
  busFactorVulnerabilityIndex: number;
  criticalSiloDomainsCount: number;
  highFlightRiskKeyPersonsCount: number;
  recommendedRetentionPoolSize: number;
  retentionProgramDurationMonths: number;
  keyPersonnel: {
    id: string;
    roleTitle: string;
    domainOwnership: string;
    tenureYears: number;
    flightRisk: DiligenceRiskLevel;
    busFactorCriticality: DiligenceRiskLevel;
    recommendedRetentionBonus: number;
  }[];
}

export interface RagScorecardDTO {
  overallRiskLevel: DiligenceRiskLevel;
  compositeRiskIndex: number;
  pillarScores: {
    architectureRiskScore: number;
    licenseRiskScore: number;
    cloudUnitEconRiskScore: number;
    securityComplianceRiskScore: number;
    teamVelocityRiskScore: number;
  };
  totalValuationHaircutEstimate: number;
  recommendedSpecialEscrowReserve: number;
  postMergerIntegration100DayPriorities: string[];
}

export interface TechnicalDueDiligenceAuditDTO {
  id: string;
  userId: string;
  targetCompanyName: string;
  dealSizeUsd: number;
  transactionType: DiligenceTransactionType;
  auditLeadName: string;
  auditDate: string;
  architecture: ArchitectureScalabilityAuditDTO;
  licenses: LicenseContagionGuardDTO;
  cloudEconomics: CloudUnitEconomicsDTO;
  securityCompliance: SecurityComplianceMatrixDTO;
  teamVelocity: TeamVelocityDependencyDTO;
  scorecard: RagScorecardDTO;
  recommendation: TransactionRecommendation;
  executiveSummaryText: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechnicalDueDiligenceMutationDTO {
  targetCompanyName: string;
  dealSizeUsd: number;
  transactionType: DiligenceTransactionType;
  auditLeadName: string;
  auditDate: string;
  architecture: ArchitectureScalabilityAuditDTO;
  licenses: LicenseContagionGuardDTO;
  cloudEconomics: CloudUnitEconomicsDTO;
  securityCompliance: SecurityComplianceMatrixDTO;
  teamVelocity: TeamVelocityDependencyDTO;
  executiveSummaryText?: string;
}

export interface DiligenceFindingDTO {
  id: string;
  auditId: string;
  pillar: 'architecture' | 'license' | 'cloud' | 'security' | 'team';
  title: string;
  severity: DiligenceRiskLevel;
  financialImpactUsd: number;
  remediationDays: number;
  description: string;
  remediationPlan: string;
  createdAt: string;
}

export interface DiligenceFindingMutationDTO {
  pillar: 'architecture' | 'license' | 'cloud' | 'security' | 'team';
  title: string;
  severity: DiligenceRiskLevel;
  financialImpactUsd: number;
  remediationDays: number;
  description: string;
  remediationPlan: string;
}

export function calculateTechnicalDebtRatio(remediationCost: number, replacementCost: number): number {
  if (replacementCost <= 0) return 0;
  const ratio = (remediationCost / replacementCost) * 100;
  return Math.min(100, Math.round(ratio * 10) / 10);
}

export function calculateSpofCriticalityIndex(
  spofs: { severity: DiligenceRiskLevel; redundancyInPlace: boolean }[]
): number {
  if (spofs.length === 0) return 0;
  let totalScore = 0;
  for (const item of spofs) {
    const sevWeight = item.severity === 'critical' ? 30 : item.severity === 'high' ? 18 : item.severity === 'moderate' ? 8 : 2;
    const redFactor = item.redundancyInPlace ? 0.25 : 1.0;
    totalScore += sevWeight * redFactor;
  }
  return Math.min(100, Math.round(totalScore));
}

export function calculateScalabilityHorizon(
  currentPeakQps: number,
  maxDatabaseQps: number
): number {
  if (currentPeakQps <= 0) return 10;
  const horizon = maxDatabaseQps / currentPeakQps;
  return Math.max(0.1, Math.round(horizon * 10) / 10);
}

export function calculateOpenSourceContagionScore(
  flaggedLibraries: { category: LicenseCategory; usageMode: string; riskLevel: DiligenceRiskLevel }[],
  proprietaryCodeLinkedWithGpl: boolean
): number {
  if (flaggedLibraries.length === 0 && !proprietaryCodeLinkedWithGpl) return 0;
  let score = 0;
  for (const lib of flaggedLibraries) {
    let catScore = 0;
    if (lib.category === 'network_copyleft') catScore = 40;
    else if (lib.category === 'strong_copyleft') catScore = 30;
    else if (lib.category === 'commercial_dual') catScore = 20;
    else if (lib.category === 'weak_copyleft') catScore = 8;
    else catScore = 1;

    const mult = lib.usageMode === 'client_distributed' ? 1.5 : lib.usageMode === 'backend_saas' ? 1.0 : 0.4;
    score += catScore * mult;
  }
  if (proprietaryCodeLinkedWithGpl) {
    score = Math.max(score, 75);
    score += 25;
  }
  return Math.min(100, Math.round(score));
}

export function calculateCloudGrossMargin(
  arr: number,
  cloudCogs: number,
  nonCloudCogs: number = 0,
  finopsSavings: number = 0
): {
  cloudCogsPercent: number;
  currentGrossMargin: number;
  projectedGrossMargin: number;
} {
  if (arr <= 0) {
    return { cloudCogsPercent: 0, currentGrossMargin: 0, projectedGrossMargin: 0 };
  }
  const cloudCogsPercent = Math.round((cloudCogs / arr) * 1000) / 10;
  const totalCogsCurrent = cloudCogs + nonCloudCogs;
  const currentGrossMargin = Math.max(0, Math.round(((arr - totalCogsCurrent) / arr) * 1000) / 10);

  const captureAmount = Math.max(0, finopsSavings * 0.75);
  const totalCogsProjected = Math.max(0, totalCogsCurrent - captureAmount);
  const projectedGrossMargin = Math.min(95, Math.round(((arr - totalCogsProjected) / arr) * 1000) / 10);

  return { cloudCogsPercent, currentGrossMargin, projectedGrossMargin };
}

export function calculateSecurityComplianceIndex(params: {
  soc2Status: string;
  isoStatus: string;
  criticalCves: number;
  highCves: number;
  mediumCves: number;
  sec106Score: number;
  penTestRecencyMonths: number;
}): number {
  let soc2Score = 0;
  if (params.soc2Status === 'certified_unqualified') soc2Score = 100;
  else if (params.soc2Status === 'certified_with_exceptions') soc2Score = 70;
  else if (params.soc2Status === 'type_1_only') soc2Score = 40;
  else if (params.soc2Status === 'in_progress') soc2Score = 20;

  let isoScore = 0;
  if (params.isoStatus === 'certified_active') isoScore = 100;
  else if (params.isoStatus === 'in_audit') isoScore = 50;

  let penTestScore = 100;
  if (params.penTestRecencyMonths > 12) penTestScore -= 30;
  penTestScore -= params.criticalCves * 25;
  penTestScore -= params.highCves * 10;
  penTestScore -= params.mediumCves * 3;
  penTestScore = Math.max(0, penTestScore);

  const composite =
    soc2Score * 0.3 +
    isoScore * 0.2 +
    penTestScore * 0.3 +
    Math.min(100, Math.max(0, params.sec106Score)) * 0.2;

  return Math.min(100, Math.max(0, Math.round(composite)));
}

export function calculateSpecialEscrowHoldback(
  dealSizeUsd: number,
  remediationCost: number,
  criticalCveCount: number,
  openSourceContagionScore: number
): number {
  const baseHoldbackPercent = dealSizeUsd * 0.025;
  let riskAdders = remediationCost * 1.5;
  if (criticalCveCount > 0) riskAdders += criticalCveCount * 75000;
  if (openSourceContagionScore > 50) riskAdders += dealSizeUsd * 0.03;
  return Math.round(Math.max(baseHoldbackPercent, riskAdders));
}

export function calculateEngineeringVelocityQuotient(dora: {
  df: DoraTier;
  ltc: DoraTier;
  cfr: DoraTier;
  mttr: DoraTier;
}): number {
  const map: Record<DoraTier, number> = { elite: 4, high: 3, medium: 2, low: 1 };
  const sum = map[dora.df] + map[dora.ltc] + map[dora.cfr] + map[dora.mttr];
  return Math.round((sum / 16) * 100);
}

export function calculateBusFactorVulnerability(
  topCommitShare: number,
  documentationCoverage: number
): number {
  const clampedShare = Math.min(100, Math.max(0, topCommitShare));
  const clampedDoc = Math.min(1, Math.max(0, documentationCoverage));
  const vuln = (clampedShare / 100) * (1 - clampedDoc) * 100;
  return Math.min(100, Math.round(vuln));
}

export function calculateCompositeRagScorecard(params: {
  dealSizeUsd: number;
  tdr: number;
  spofIndex: number;
  osContagionScore: number;
  cloudGrossMargin: number;
  cloudCogsPercent: number;
  scmi: number;
  evq: number;
  bfvi: number;
  techDebtRemediationCost: number;
  cloudWastageAnnual: number;
  escrowHoldback: number;
  retentionPool: number;
}): RagScorecardDTO {
  const archRisk = Math.min(100, Math.round(params.tdr * 2.5 + params.spofIndex * 0.5));
  const licenseRisk = Math.min(100, Math.round(params.osContagionScore));
  const cloudRisk = Math.min(100, Math.round((100 - params.cloudGrossMargin) * 1.2 + params.cloudCogsPercent * 1.5));
  const securityRisk = Math.min(100, Math.round(100 - params.scmi));
  const teamRisk = Math.min(100, Math.round((100 - params.evq) * 0.4 + params.bfvi * 0.6));

  const compositeRiskIndex = Math.min(
    100,
    Math.round(
      archRisk * 0.25 +
      licenseRisk * 0.20 +
      cloudRisk * 0.20 +
      securityRisk * 0.20 +
      teamRisk * 0.15
    )
  );

  let overallRiskLevel: DiligenceRiskLevel = 'low';
  if (compositeRiskIndex > 75 || licenseRisk > 85) overallRiskLevel = 'critical';
  else if (compositeRiskIndex > 50) overallRiskLevel = 'high';
  else if (compositeRiskIndex > 25) overallRiskLevel = 'moderate';

  const cloudWasteNpv3Yr = Math.round(params.cloudWastageAnnual * 2.48);
  const totalValuationHaircutEstimate =
    params.techDebtRemediationCost +
    cloudWasteNpv3Yr +
    params.escrowHoldback +
    params.retentionPool;

  const priorities: string[] = [];
  if (licenseRisk > 40) priorities.push('Execute Clean-Room IP replacement of copyleft libraries (AGPL/GPL contagion risk).');
  if (params.spofIndex > 40) priorities.push('Deploy active-active database replication and multi-AZ load balancer routing.');
  if (params.cloudCogsPercent > 18) priorities.push('Implement FinOps rightsizing, unattached volume purge, and reserved commitment restructuring.');
  if (securityRisk > 40) priorities.push('Remediate identified critical/high CVEs and initiate SOC 2 Type II surveillance audit.');
  if (params.bfvi > 50) priorities.push('Fund key-person 24-month retention pool and execute architecture knowledge transfer silos.');
  if (priorities.length === 0) priorities.push('Execute standard 100-day post-merger systems integration and observability harmonization.');

  return {
    overallRiskLevel,
    compositeRiskIndex,
    pillarScores: {
      architectureRiskScore: archRisk,
      licenseRiskScore: licenseRisk,
      cloudUnitEconRiskScore: cloudRisk,
      securityComplianceRiskScore: securityRisk,
      teamVelocityRiskScore: teamRisk
    },
    totalValuationHaircutEstimate,
    recommendedSpecialEscrowReserve: params.escrowHoldback,
    postMergerIntegration100DayPriorities: priorities
  };
}

export function determineTransactionRecommendation(
  overallRisk: DiligenceRiskLevel,
  licenseRisk: number,
  haircutRatio: number
): TransactionRecommendation {
  if (overallRisk === 'critical' || licenseRisk >= 85) {
    return 'walk_away_deal_breaker';
  }
  if (overallRisk === 'high' || haircutRatio > 0.25) {
    return 'restructure_renegotiate';
  }
  if (haircutRatio > 0.10) {
    return 'proceed_with_haircut';
  }
  if (overallRisk === 'moderate') {
    return 'mandate_escrow_holdback';
  }
  return 'proceed_standard';
}

export function generateTechnicalDueDiligenceMemoMarkdown(audit: TechnicalDueDiligenceAuditDTO): string {
  const haircutFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(audit.scorecard.totalValuationHaircutEstimate);
  const dealFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(audit.dealSizeUsd);
  const escrowFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(audit.scorecard.recommendedSpecialEscrowReserve);
  const retentionFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(audit.teamVelocity.recommendedRetentionPoolSize);

  return `# Technical Due Diligence & M&A Vendor Diligence Memorandum
**Target Company:** ${audit.targetCompanyName}
**Transaction Context:** ${audit.transactionType.toUpperCase()} | **Target Valuation:** ${dealFormatted}
**Audit Lead:** ${audit.auditLeadName} | **Date:** ${audit.auditDate}
**Overall Assessment:** ${audit.scorecard.overallRiskLevel.toUpperCase()} RISK | **Recommendation:** ${audit.recommendation.toUpperCase()}

---

## 1. Executive Investment Committee Recommendation
Based upon forensic architectural inspection, open-source dependency scanning, cloud hosting financial audits, and security vulnerability triage, the engineering due diligence committee recommends **${audit.recommendation.replace(/_/g, ' ').toUpperCase()}**.

- **Headline Valuation:** ${dealFormatted}
- **Recommended Valuation Haircut:** ${haircutFormatted}
- **Special Indemnity Escrow Holdback:** ${escrowFormatted}
- **Key-Person Retention Incentive Pool:** ${retentionFormatted}
- **Composite Technical Risk Score:** ${audit.scorecard.compositeRiskIndex} / 100

${audit.executiveSummaryText ? `### Executive Context\n${audit.executiveSummaryText}\n` : ''}

---

## 2. Pillar-by-Pillar Forensic Findings

### Pillar A: Architectural Scalability & Tech Debt
- **Architecture Typology:** ${audit.architecture.typology.replace(/_/g, ' ')}
- **Technical Debt Ratio (TDR):** ${audit.architecture.technicalDebtRatio}% (Remediation Cost: $${audit.architecture.technicalDebtRemediationCost.toLocaleString()})
- **Disaster Recovery:** RTO = ${audit.architecture.rtoMinutesCurrent} min (Target: ${audit.architecture.rtoMinutesTarget} min) | RPO = ${audit.architecture.rpoMinutesCurrent} min
- **Identified SPOFs:** ${audit.architecture.spofCount} components (Criticality Index: ${audit.architecture.spofCriticalityIndex} / 100)
- **Scalability Saturation Horizon:** ${audit.architecture.scalabilitySaturationHorizon}x current peak load

### Pillar B: Open-Source IP & License Contagion
- **Open-Source Contagion Risk Score:** ${audit.licenses.openSourceContagionScore} / 100
- **Copyleft Dependencies Detected:** ${audit.licenses.copyleftFindingsCount} libraries (Strong/Network: ${audit.licenses.licenseBreakdown.strongCopyleftCount + audit.licenses.licenseBreakdown.networkCopyleftCount})
- **Proprietary Linking Exposure:** ${audit.licenses.proprietaryCodeLinkedWithGpl ? 'CRITICAL - Core IP Linked to Copyleft Binaries' : 'Clean Separation Enforced'}
- **Contractor IP Assignments (CIIAA):** ${audit.licenses.contractorAssignmentsComplete ? 'Verified 100% Executed' : 'DEFICIENT - Unassigned IP Discovered'}

### Pillar C: Cloud Unit Economics & Gross Margin
- **Cloud COGS as % of ARR:** ${audit.cloudEconomics.cloudCogsPercentOfArr}% (Benchmark Target: < 12%)
- **Current Gross Margin:** ${audit.cloudEconomics.currentGrossMarginPercent}% -> **Optimized Target:** ${audit.cloudEconomics.projectedOptimizedGrossMarginPercent}%
- **Identified Cloud Wastage:** $${audit.cloudEconomics.idleResourceWastageAnnual.toLocaleString()} / year
- **Multi-Year Cloud Commit Liabilities:** $${audit.cloudEconomics.multiYearCommitmentLiability.toLocaleString()}

### Pillar D: Security, Compliance & Regulatory Maturity
- **Security Maturity Index:** ${audit.securityCompliance.securityComplianceMaturityIndex} / 100
- **Certifications:** SOC 2 Type II (${audit.securityCompliance.soc2Type2Status}) | ISO 27001 (${audit.securityCompliance.iso27001Status})
- **Vulnerability Backlog:** ${audit.securityCompliance.criticalCveCount} Critical CVEs, ${audit.securityCompliance.highCveCount} High CVEs
- **Privacy Architecture:** GDPR Deletion = ${audit.securityCompliance.gdprAutomatedDeletionCapable ? 'Automated' : 'Manual/Non-compliant'}

### Pillar E: Team Bus Factor & Engineering Velocity
- **DORA Velocity Rating:** ${audit.teamVelocity.engineeringVelocityQuotient} / 100 (Deploy: ${audit.teamVelocity.doraDeploymentFrequency.toUpperCase()}, MTTR: ${audit.teamVelocity.doraTimeToRestoreService.toUpperCase()})
- **Team Bus Factor:** ${audit.teamVelocity.teamBusFactor} Engineers (Top Contributor Commit Share: ${audit.teamVelocity.topContributorCommitSharePercent}%)
- **Bus Factor Vulnerability:** ${audit.teamVelocity.busFactorVulnerabilityIndex} / 100
- **Retention Pool Recommended:** ${retentionFormatted} over ${audit.teamVelocity.retentionProgramDurationMonths} months

---

## 3. Post-Merger Integration (PMI) 100-Day Priorities
${audit.scorecard.postMergerIntegration100DayPriorities.map((item, idx) => `${idx + 1}. ${item}`).join('\n')}

---
*Generated by JobTrack Executive Technical Due Diligence & M&A VDD Studio*`;
}

export function validateDueDiligenceAuditInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu thẩm định không hợp lệ.' } };
  }
  const data = input as Partial<TechnicalDueDiligenceMutationDTO>;
  if (!data.targetCompanyName || typeof data.targetCompanyName !== 'string' || !data.targetCompanyName.trim()) {
    errors.targetCompanyName = 'Nhập tên công ty mục tiêu thẩm định.';
  }
  if (typeof data.dealSizeUsd !== 'number' || data.dealSizeUsd < 0) {
    errors.dealSizeUsd = 'Quy mô giao dịch (USD) phải là số dương.';
  }
  if (!data.auditLeadName || typeof data.auditLeadName !== 'string' || !data.auditLeadName.trim()) {
    errors.auditLeadName = 'Nhập tên Trưởng đoàn Thẩm định Kỹ thuật.';
  }
  if (!data.auditDate || typeof data.auditDate !== 'string') {
    errors.auditDate = 'Chọn ngày thực hiện thẩm định.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateDiligenceFindingInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu phát hiện không hợp lệ.' } };
  }
  const data = input as Partial<DiligenceFindingMutationDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Nhập tiêu đề phát hiện thẩm định.';
  }
  if (!data.pillar || !['architecture', 'license', 'cloud', 'security', 'team'].includes(data.pillar)) {
    errors.pillar = 'Chọn trụ cột thẩm định hợp lệ.';
  }
  if (!data.severity || !['low', 'moderate', 'high', 'critical'].includes(data.severity)) {
    errors.severity = 'Chọn mức độ nghiêm trọng.';
  }
  if (typeof data.financialImpactUsd !== 'number' || data.financialImpactUsd < 0) {
    errors.financialImpactUsd = 'Tác động tài chính (USD) phải lớn hơn hoặc bằng 0.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
