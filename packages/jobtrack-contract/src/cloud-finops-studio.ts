export type CloudProvider = 'aws' | 'gcp' | 'snowflake' | 'datadog' | 'azure';

export type TenantTier = 'enterprise' | 'mid_market' | 'smb' | 'free_tier';

export type CommitmentType =
  | 'savings_plan_compute'
  | 'savings_plan_ec2'
  | 'reserved_instance_standard'
  | 'reserved_instance_convertible'
  | 'cud_gcp';

export type CommitmentPaymentOption = 'all_upfront' | 'partial_upfront' | 'no_upfront';

export type CommitmentTermMonths = 12 | 36;

export type FinOpsMaturityStage = 'crawl' | 'walk' | 'run';

export type FinOpsEfficiencyBand =
  | 'optimal_elite'
  | 'disciplined_efficient'
  | 'moderate_waste'
  | 'critical_overspend';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export type WasteAssetType =
  | 'unattached_ebs_volume'
  | 'unmounted_persistent_disk'
  | 'idle_elastic_ip'
  | 'idle_load_balancer'
  | 'zombie_k8s_node'
  | 'obsolete_snapshot';

export type WasteRemediationStatus = 'detected' | 'in_review' | 'remediated' | 'ignored';

export type K8sWorkloadType = 'deployment' | 'statefulset' | 'daemonset' | 'cronjob';

export type ArchitectureArbitrageOption =
  | 'arm64_graviton'
  | 'spot_instance'
  | 'auto_downscale'
  | 'gp2_to_gp3';

export type CfoMemoStatus = 'draft' | 'under_review' | 'board_approved' | 'archived';

export interface TenantCostAllocationDTO {
  id: string;
  tenantName: string;
  tenantTier: TenantTier;
  monthlyAttributableRevenueUsd: number;
  directComputeCostUsd: number;
  directStorageCostUsd: number;
  allocatedSharedCostUsd: number;
  totalCostPerTenantUsd: number;
  grossMarginPercent: number;
  monthlyTransactionsCount: number;
  costPerTransactionUsd: number;
  taggingCompliancePercent: number;
  updatedAt: string;
}

export interface TenantCostAllocationMutationDTO {
  tenantName: string;
  tenantTier: TenantTier;
  monthlyAttributableRevenueUsd: number;
  directComputeCostUsd: number;
  directStorageCostUsd: number;
  allocatedSharedCostUsd: number;
  monthlyTransactionsCount: number;
  taggingCompliancePercent: number;
}

export interface CloudCostAllocationOverviewDTO {
  totalMonthlySpendUsd: number;
  blendedGrossMarginPercent: number;
  averageCostPerTenantUsd: number;
  averageCostPerTransactionUsd: number;
  overallTaggingCompliancePercent: number;
  spendByProvider: Record<CloudProvider, number>;
  allocations: TenantCostAllocationDTO[];
}

export interface CommitmentPortfolioItemDTO {
  id: string;
  provider: CloudProvider;
  serviceName: string;
  commitmentType: CommitmentType;
  instanceFamilyOrResource: string;
  termMonths: CommitmentTermMonths;
  paymentOption: CommitmentPaymentOption;
  committedHourlySpendUsd: number;
  monthlyCommittedSpendUsd: number;
  onDemandEquivalentMonthlySpendUsd: number;
  monthlySavingsUsd: number;
  utilizationRatePercent: number;
  coverageRatioPercent: number;
  expirationDate: string;
  daysUntilExpiration: number;
  isExpiringSoon: boolean;
  createdAt: string;
}

export interface CommitmentMutationDTO {
  provider: CloudProvider;
  serviceName: string;
  commitmentType: CommitmentType;
  instanceFamilyOrResource: string;
  termMonths: CommitmentTermMonths;
  paymentOption: CommitmentPaymentOption;
  committedHourlySpendUsd: number;
  onDemandEquivalentMonthlySpendUsd: number;
  utilizationRatePercent: number;
  coverageRatioPercent: number;
  expirationDate: string;
}

export interface CommitmentNpvScenarioDTO {
  scenarioName: string;
  termMonths: CommitmentTermMonths;
  paymentOption: CommitmentPaymentOption;
  upfrontCapitalRequiredUsd: number;
  cumulativeSavingsUsd: number;
  netPresentValueUsd: number;
  internalRateOfReturnPercent: number;
  monthlyEffectiveSavingsUsd: number;
}

export interface CommitmentExpirationCliffDTO {
  cliffWindowDays: 30 | 60 | 90;
  expiringCommitmentsCount: number;
  atRiskMonthlySavingsUsd: number;
  unhedgedRunRateSpikeMonthlyUsd: number;
  recommendedAction: string;
}

export interface CommitmentOptimizerOverviewDTO {
  overallCoverageRatioPercent: number;
  overallUtilizationRatePercent: number;
  annualizedRealizedSavingsUsd: number;
  potentialAdditionalSavingsUsd: number;
  portfolio: CommitmentPortfolioItemDTO[];
  npvScenarios: CommitmentNpvScenarioDTO[];
  expirationCliffs: CommitmentExpirationCliffDTO[];
}

export interface CommitmentPurchaseSimulationDTO {
  eligibleMonthlySpendUsd: number;
  targetCoveragePercent: number;
  waccDiscountRatePercent: number;
}

export interface CloudCostAnomalyDTO {
  id: string;
  provider: CloudProvider;
  serviceAffected: string;
  detectedDate: string;
  actualDailySpendUsd: number;
  baselineMeanDailySpendUsd: number;
  standardDeviationUsd: number;
  zScore: number;
  excessSpendDailyUsd: number;
  severity: AnomalySeverity;
  probableRootCause: string;
  status: 'active' | 'investigating' | 'resolved';
}

export interface IdleWasteItemDTO {
  id: string;
  provider: CloudProvider;
  assetType: WasteAssetType;
  resourceIdentifier: string;
  region: string;
  monthlyWasteCostUsd: number;
  idleDurationDays: number;
  carbonFootprintMonthlyKgCo2e: number;
  status: WasteRemediationStatus;
  detectedAt: string;
}

export interface IdleWasteRemediationMutationDTO {
  status: WasteRemediationStatus;
  remediationNotes?: string;
}

export interface CarbonFootprintSummaryDTO {
  totalMonthlyCloudCarbonKgCo2e: number;
  carbonIntensityPerActiveUserKgCo2e: number;
  potentialWasteAvoidanceKgCo2e: number;
  equivalentTreesPlantedYearly: number;
}

export interface WasteEliminationOverviewDTO {
  activeAnomaliesCount: number;
  monthlyAnomalyExcessSpendUsd: number;
  idleAssetsCount: number;
  monthlyIdleWasteTotalUsd: number;
  remediatedSavingsMonthlyUsd: number;
  carbonSummary: CarbonFootprintSummaryDTO;
  anomalies: CloudCostAnomalyDTO[];
  idleAssets: IdleWasteItemDTO[];
}

export interface AnomalyDetectionRequestDTO {
  sensitivityZScore: number;
  lookbackDays: number;
}

export interface KubernetesWorkloadRightsizingDTO {
  id: string;
  clusterName: string;
  namespaceName: string;
  workloadName: string;
  workloadType: K8sWorkloadType;
  replicasCount: number;
  requestedCpuCores: number;
  actualP95CpuCores: number;
  recommendedCpuCores: number;
  requestedMemoryGiB: number;
  actualP95MemoryGiB: number;
  recommendedMemoryGiB: number;
  currentMonthlyCostUsd: number;
  rightsizedMonthlyCostUsd: number;
  monthlySavingsUsd: number;
  sizingSlackPercent: number;
  isEligibleForSpot: boolean;
  spotSavingsPotentialMonthlyUsd: number;
}

export interface GravitonArmMigrationRoiDTO {
  workloadName: string;
  sourceInstanceType: string;
  targetGravitonInstanceType: string;
  currentMonthlyCostUsd: number;
  gravitonMonthlyCostUsd: number;
  performanceGainPercent: number;
  monthlySavingsUsd: number;
  migrationEngineeringHours: number;
  migrationLaborCostUsd: number;
  paybackPeriodMonths: number;
  annualizedNetBenefitUsd: number;
}

export interface ArchitectureArbitrageOverviewDTO {
  totalAnalyzedWorkloadsCount: number;
  currentK8sMonthlySpendUsd: number;
  rightsizedK8sMonthlySpendUsd: number;
  monthlyRightsizingSavingsUsd: number;
  monthlySpotSavingsPotentialUsd: number;
  monthlyGravitonSavingsPotentialUsd: number;
  workloads: KubernetesWorkloadRightsizingDTO[];
  gravitonRoadmap: GravitonArmMigrationRoiDTO[];
}

export interface KubernetesRightsizingSimulationDTO {
  headroomBufferPercent: number;
  spotAggressivenessLevel: 'conservative' | 'balanced' | 'aggressive';
}

export interface FinOpsFoundationMaturityDTO {
  overallStage: FinOpsMaturityStage;
  costVisibilityScore: number;
  unitEconomicsScore: number;
  commitmentGovernanceScore: number;
  automationRightsizingScore: number;
  sustainabilityScore: number;
}

export interface FinOpsEfficiencyScoreBreakdownDTO {
  unitEconomicsWeightScore: number;
  commitmentWeightScore: number;
  wasteEliminationWeightScore: number;
  k8sArbitrageWeightScore: number;
  carbonWeightScore: number;
  compositeScore: number;
  efficiencyBand: FinOpsEfficiencyBand;
}

export interface CfoMemorandumSectionDTO {
  sectionKey: string;
  heading: string;
  executiveSummaryText: string;
  keyMetricsBulletPoints: string[];
  strategicGuidance: string;
}

export interface CfoMemorandumDTO {
  id: string;
  title: string;
  fiscalQuarter: string;
  status: CfoMemoStatus;
  compositeFinOpsScore: number;
  efficiencyBand: FinOpsEfficiencyBand;
  monthlyCloudSpendUsd: number;
  annualizedRealizedSavingsUsd: number;
  unlockedAnnualizedPipelineSavingsUsd: number;
  cloudGrossMarginPercent: number;
  executiveSummary: CfoMemorandumSectionDTO;
  unitEconomicsScorecard: CfoMemorandumSectionDTO;
  commitmentStrategy: CfoMemorandumSectionDTO;
  wasteAndAnomalyGovernance: CfoMemorandumSectionDTO;
  k8sArchitectureArbitrage: CfoMemorandumSectionDTO;
  cfoDirectivesActionPlan: CfoMemorandumSectionDTO;
  approvedByVpInfraAt?: string;
  approvedByCtoAt?: string;
  approvedByCfoAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CfoMemorandumGenerateRequestDTO {
  title: string;
  fiscalQuarter: string;
  strategicNotes?: string;
}

export interface CloudFinopsStudioOverviewDTO {
  compositeScore: number;
  efficiencyBand: FinOpsEfficiencyBand;
  maturityStage: FinOpsMaturityStage;
  totalMonthlySpendUsd: number;
  blendedGrossMarginPercent: number;
  commitmentCoveragePercent: number;
  commitmentUtilizationPercent: number;
  identifiedMonthlyWasteUsd: number;
  annualizedRealizedSavingsUsd: number;
  annualizedPipelineSavingsUsd: number;
  totalMonthlyCarbonKgCo2e: number;
  allocationOverview: CloudCostAllocationOverviewDTO;
  commitmentOverview: CommitmentOptimizerOverviewDTO;
  wasteOverview: WasteEliminationOverviewDTO;
  arbitrageOverview: ArchitectureArbitrageOverviewDTO;
  maturityAssessment: FinOpsFoundationMaturityDTO;
  latestCfoMemo?: CfoMemorandumDTO;
}

export function classifyFinOpsEfficiencyBand(score: number): FinOpsEfficiencyBand {
  if (score >= 88.0) return 'optimal_elite';
  if (score >= 72.0) return 'disciplined_efficient';
  if (score >= 50.0) return 'moderate_waste';
  return 'critical_overspend';
}

export function classifyFinOpsMaturityStage(score: number): FinOpsMaturityStage {
  if (score >= 80.0) return 'run';
  if (score >= 55.0) return 'walk';
  return 'crawl';
}

export function calculateCostPerTenantMetrics(
  revenue: number,
  directCompute: number,
  directStorage: number,
  sharedAllocated: number,
  transactionsCount: number
): {
  totalCostPerTenantUsd: number;
  grossMarginPercent: number;
  costPerTransactionUsd: number;
} {
  const totalCost = Number((directCompute + directStorage + sharedAllocated).toFixed(2));
  const grossMargin =
    revenue > 0 ? Number((((revenue - totalCost) / revenue) * 100).toFixed(2)) : 0;
  const costPerTx =
    transactionsCount > 0 ? Number((totalCost / transactionsCount).toFixed(4)) : 0;

  return {
    totalCostPerTenantUsd: totalCost,
    grossMarginPercent: grossMargin,
    costPerTransactionUsd: costPerTx
  };
}

export function calculateCommitmentNpv(
  monthlyOnDemandSpend: number,
  discountRateAnnualPercent: number,
  termMonths: CommitmentTermMonths,
  paymentOption: CommitmentPaymentOption,
  discountPercent: number
): CommitmentNpvScenarioDTO {
  const monthlyEffectiveRate = Math.pow(1 + discountRateAnnualPercent / 100, 1 / 12) - 1;
  const monthlyCommittedRate = monthlyOnDemandSpend * (1 - discountPercent / 100);
  const monthlyGrossSavings = monthlyOnDemandSpend - monthlyCommittedRate;

  let upfrontCapital = 0;
  let effectiveMonthlyFlow = monthlyGrossSavings;

  if (paymentOption === 'all_upfront') {
    upfrontCapital = monthlyCommittedRate * termMonths * 0.95;
    effectiveMonthlyFlow = monthlyOnDemandSpend;
  } else if (paymentOption === 'partial_upfront') {
    upfrontCapital = monthlyCommittedRate * termMonths * 0.5 * 0.97;
    effectiveMonthlyFlow = monthlyOnDemandSpend - monthlyCommittedRate * 0.5;
  }

  let npv = -upfrontCapital;
  for (let m = 1; m <= termMonths; m++) {
    npv += effectiveMonthlyFlow / Math.pow(1 + monthlyEffectiveRate, m);
  }

  const cumulativeSavings = monthlyGrossSavings * termMonths;
  const irrApprox = upfrontCapital > 0 ? (cumulativeSavings / upfrontCapital) * (12 / termMonths) * 100 : 99.9;

  return {
    scenarioName: `${termMonths}-Month ${paymentOption.replace(/_/g, ' ').toUpperCase()} (${discountPercent}% Disc)`,
    termMonths,
    paymentOption,
    upfrontCapitalRequiredUsd: Number(upfrontCapital.toFixed(2)),
    cumulativeSavingsUsd: Number(cumulativeSavings.toFixed(2)),
    netPresentValueUsd: Number(npv.toFixed(2)),
    internalRateOfReturnPercent: Number(Math.min(999, irrApprox).toFixed(1)),
    monthlyEffectiveSavingsUsd: Number(monthlyGrossSavings.toFixed(2))
  };
}

export function detectCostAnomaly(
  actualSpend: number,
  history: number[],
  sensitivityThreshold = 2.5
): {
  isAnomaly: boolean;
  zScore: number;
  mean: number;
  stdDev: number;
  excessSpend: number;
} {
  if (history.length < 3) {
    return { isAnomaly: false, zScore: 0, mean: actualSpend, stdDev: 0, excessSpend: 0 };
  }
  const mean = history.reduce((acc, val) => acc + val, 0) / history.length;
  const variance =
    history.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / history.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { isAnomaly: false, zScore: 0, mean, stdDev: 0, excessSpend: 0 };
  }

  const zScore = (actualSpend - mean) / stdDev;
  const isAnomaly = zScore >= sensitivityThreshold;
  const excessSpend = isAnomaly ? Number((actualSpend - mean).toFixed(2)) : 0;

  return {
    isAnomaly,
    zScore: Number(zScore.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    excessSpend
  };
}

export function calculateCarbonFootprint(
  vCpuHoursPerMonth: number,
  storageGiBPerMonth: number,
  regionPue = 1.15,
  gridEmissionFactorKgPerKwh = 0.38
): CarbonFootprintSummaryDTO {
  const vCpuPowerKwh = (vCpuHoursPerMonth * 0.0035 * regionPue);
  const storagePowerKwh = (storageGiBPerMonth * 0.00015 * 730 * regionPue);
  const totalKwh = vCpuPowerKwh + storagePowerKwh;
  const totalKgCo2e = Number((totalKwh * gridEmissionFactorKgPerKwh).toFixed(2));
  const potentialAvoidance = Number((totalKgCo2e * 0.28).toFixed(2));
  const trees = Number((totalKgCo2e / 21.77).toFixed(1));

  return {
    totalMonthlyCloudCarbonKgCo2e: totalKgCo2e,
    carbonIntensityPerActiveUserKgCo2e: Number((totalKgCo2e / 25000).toFixed(4)),
    potentialWasteAvoidanceKgCo2e: potentialAvoidance,
    equivalentTreesPlantedYearly: trees
  };
}

export function calculateK8sRightsizing(
  requestedCpu: number,
  p95ActualCpu: number,
  requestedMemoryGiB: number,
  p95ActualMemoryGiB: number,
  currentMonthlyCostUsd: number,
  headroomBufferPercent = 20
): {
  recommendedCpu: number;
  recommendedMemoryGiB: number;
  rightsizedMonthlyCostUsd: number;
  monthlySavingsUsd: number;
  sizingSlackPercent: number;
} {
  const bufferMultiplier = 1 + headroomBufferPercent / 100;
  const recommendedCpu = Number(Math.max(0.1, p95ActualCpu * bufferMultiplier).toFixed(2));
  const recommendedMemory = Number(Math.max(0.25, p95ActualMemoryGiB * bufferMultiplier).toFixed(2));

  const cpuRatio = requestedCpu > 0 ? recommendedCpu / requestedCpu : 1.0;
  const memoryRatio = requestedMemoryGiB > 0 ? recommendedMemory / requestedMemoryGiB : 1.0;
  const blendedRatio = Math.min(1.0, 0.6 * cpuRatio + 0.4 * memoryRatio);

  const rightsizedCost = Number((currentMonthlyCostUsd * blendedRatio).toFixed(2));
  const savings = Number(Math.max(0, currentMonthlyCostUsd - rightsizedCost).toFixed(2));
  const slack = currentMonthlyCostUsd > 0 ? Number(((savings / currentMonthlyCostUsd) * 100).toFixed(1)) : 0;

  return {
    recommendedCpu,
    recommendedMemoryGiB: recommendedMemory,
    rightsizedMonthlyCostUsd: rightsizedCost,
    monthlySavingsUsd: savings,
    sizingSlackPercent: slack
  };
}

export function calculateGravitonMigrationRoi(
  currentMonthlySpend: number,
  engineeringHoursRequired: number,
  burdenedHourlyRate = 120,
  gravitonPriceReductionPercent = 20,
  performanceBoostPercent = 18
): GravitonArmMigrationRoiDTO {
  const combinedCostMultiplier = (1 - gravitonPriceReductionPercent / 100) * (1 / (1 + performanceBoostPercent / 100));
  const targetSpend = Number((currentMonthlySpend * combinedCostMultiplier).toFixed(2));
  const monthlySavings = Number((currentMonthlySpend - targetSpend).toFixed(2));
  const laborCost = Number((engineeringHoursRequired * burdenedHourlyRate).toFixed(2));
  const paybackMonths = monthlySavings > 0 ? Number((laborCost / monthlySavings).toFixed(1)) : 99.9;
  const annualizedNet = Number((monthlySavings * 12 - laborCost).toFixed(2));

  return {
    workloadName: 'Core Stateless Application Fleet',
    sourceInstanceType: 'c5.2xlarge (x86)',
    targetGravitonInstanceType: 'c7g.2xlarge (ARM64)',
    currentMonthlyCostUsd: currentMonthlySpend,
    gravitonMonthlyCostUsd: targetSpend,
    performanceGainPercent: performanceBoostPercent,
    monthlySavingsUsd: monthlySavings,
    migrationEngineeringHours: engineeringHoursRequired,
    migrationLaborCostUsd: laborCost,
    paybackPeriodMonths: paybackMonths,
    annualizedNetBenefitUsd: annualizedNet
  };
}

export function calculateCompositeFinOpsScore(breakdown: {
  taggingCompliancePercent: number;
  commitmentCoveragePercent: number;
  commitmentUtilizationPercent: number;
  wasteRemediationRatioPercent: number;
  k8sSlackRemediationPercent: number;
  carbonEfficiencyScore: number;
}): FinOpsEfficiencyScoreBreakdownDTO {
  const unitScore = Number(Math.min(100, Math.max(0, breakdown.taggingCompliancePercent)).toFixed(1));
  const commitScore = Number(
    Math.min(100, Math.max(0, 0.6 * breakdown.commitmentCoveragePercent + 0.4 * breakdown.commitmentUtilizationPercent)).toFixed(1)
  );
  const wasteScore = Number(Math.min(100, Math.max(0, breakdown.wasteRemediationRatioPercent)).toFixed(1));
  const k8sScore = Number(Math.min(100, Math.max(0, breakdown.k8sSlackRemediationPercent)).toFixed(1));
  const carbonScore = Number(Math.min(100, Math.max(0, breakdown.carbonEfficiencyScore)).toFixed(1));

  const composite = Number(
    (0.25 * unitScore + 0.25 * commitScore + 0.20 * wasteScore + 0.20 * k8sScore + 0.10 * carbonScore).toFixed(1)
  );

  return {
    unitEconomicsWeightScore: unitScore,
    commitmentWeightScore: commitScore,
    wasteEliminationWeightScore: wasteScore,
    k8sArbitrageWeightScore: k8sScore,
    carbonWeightScore: carbonScore,
    compositeScore: composite,
    efficiencyBand: classifyFinOpsEfficiencyBand(composite)
  };
}

export function generateCfoBoardMemorandumMarkdown(memo: CfoMemorandumDTO): string {
  const fmt = (v: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  return `# Executive Cloud FinOps, Unit Economics & Infrastructure Governance Memorandum
**Document Title:** ${memo.title}
**Fiscal Period:** ${memo.fiscalQuarter} | **Status:** ${memo.status.toUpperCase()}
**Composite FinOps Efficiency Score (FES):** ${memo.compositeFinOpsScore} / 100 (${memo.efficiencyBand.replace(/_/g, ' ').toUpperCase()})
**Current Monthly Cloud Run-Rate:** ${fmt(memo.monthlyCloudSpendUsd)}
**Annualized Realized Savings:** ${fmt(memo.annualizedRealizedSavingsUsd)}
**Unlocked Pipeline Savings:** ${fmt(memo.unlockedAnnualizedPipelineSavingsUsd)}
**Cloud Gross Margin Impact:** ${memo.cloudGrossMarginPercent.toFixed(1)}%

---

## ${memo.executiveSummary.heading}
${memo.executiveSummary.executiveSummaryText}

### Key Strategic Highlights:
${memo.executiveSummary.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Executive Recommendation:** ${memo.executiveSummary.strategicGuidance}

---

## ${memo.unitEconomicsScorecard.heading}
${memo.unitEconomicsScorecard.executiveSummaryText}

### Unit Economics Benchmarks:
${memo.unitEconomicsScorecard.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Guidance:** ${memo.unitEconomicsScorecard.strategicGuidance}

---

## ${memo.commitmentStrategy.heading}
${memo.commitmentStrategy.executiveSummaryText}

### Commitment & Coverage Highlights:
${memo.commitmentStrategy.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Hedging Guidance:** ${memo.commitmentStrategy.strategicGuidance}

---

## ${memo.wasteAndAnomalyGovernance.heading}
${memo.wasteAndAnomalyGovernance.executiveSummaryText}

### Idle Waste & Anomaly Highlights:
${memo.wasteAndAnomalyGovernance.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Remediation Directives:** ${memo.wasteAndAnomalyGovernance.strategicGuidance}

---

## ${memo.k8sArchitectureArbitrage.heading}
${memo.k8sArchitectureArbitrage.executiveSummaryText}

### Workload Rightsizing & Graviton Milestones:
${memo.k8sArchitectureArbitrage.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Engineering Arbitrage Guidance:** ${memo.k8sArchitectureArbitrage.strategicGuidance}

---

## ${memo.cfoDirectivesActionPlan.heading}
${memo.cfoDirectivesActionPlan.executiveSummaryText}

### Board & Executive Directives:
${memo.cfoDirectivesActionPlan.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Audit Recommendation:** ${memo.cfoDirectivesActionPlan.strategicGuidance}

---

*Generated autonomously by JobTrack Executive FinOps & Cloud Infrastructure Governance Studio.*`;
}

export function validateTenantAllocationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu phân bổ chi phí không hợp lệ.' } };
  }
  const data = input as Partial<TenantCostAllocationMutationDTO>;
  if (!data.tenantName || typeof data.tenantName !== 'string' || !data.tenantName.trim()) {
    errors.tenantName = 'Vui lòng nhập tên khách hàng / tenant.';
  }
  if (!data.tenantTier || !['enterprise', 'mid_market', 'smb', 'free_tier'].includes(data.tenantTier)) {
    errors.tenantTier = 'Vui lòng chọn phân khúc khách hàng hợp lệ.';
  }
  if (typeof data.monthlyAttributableRevenueUsd !== 'number' || data.monthlyAttributableRevenueUsd < 0) {
    errors.monthlyAttributableRevenueUsd = 'Doanh thu hàng tháng không được âm.';
  }
  if (typeof data.directComputeCostUsd !== 'number' || data.directComputeCostUsd < 0) {
    errors.directComputeCostUsd = 'Chi phí compute trực tiếp không được âm.';
  }
  if (typeof data.directStorageCostUsd !== 'number' || data.directStorageCostUsd < 0) {
    errors.directStorageCostUsd = 'Chi phí lưu trữ trực tiếp không được âm.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCommitmentInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu cam kết không hợp lệ.' } };
  }
  const data = input as Partial<CommitmentMutationDTO>;
  if (!data.serviceName || typeof data.serviceName !== 'string' || !data.serviceName.trim()) {
    errors.serviceName = 'Vui lòng nhập tên dịch vụ cam kết.';
  }
  if (typeof data.committedHourlySpendUsd !== 'number' || data.committedHourlySpendUsd <= 0) {
    errors.committedHourlySpendUsd = 'Mức cam kết chi tiêu theo giờ phải lớn hơn 0.';
  }
  if (!data.expirationDate || typeof data.expirationDate !== 'string') {
    errors.expirationDate = 'Vui lòng chọn ngày hết hạn cam kết.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCommitmentPurchaseSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng mua cam kết không hợp lệ.' } };
  }
  const data = input as Partial<CommitmentPurchaseSimulationDTO>;
  if (typeof data.eligibleMonthlySpendUsd !== 'number' || data.eligibleMonthlySpendUsd <= 0) {
    errors.eligibleMonthlySpendUsd = 'Chi phí On-Demand đủ điều kiện phải lớn hơn 0.';
  }
  if (typeof data.targetCoveragePercent !== 'number' || data.targetCoveragePercent < 10 || data.targetCoveragePercent > 100) {
    errors.targetCoveragePercent = 'Tỷ lệ bao phủ mục tiêu phải nằm trong khoảng từ 10% đến 100%.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateAnomalyDetectionInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu cấu hình quét bất thường không hợp lệ.' } };
  }
  const data = input as Partial<AnomalyDetectionRequestDTO>;
  if (typeof data.sensitivityZScore !== 'number' || data.sensitivityZScore < 1.0 || data.sensitivityZScore > 5.0) {
    errors.sensitivityZScore = 'Độ nhạy Z-Score phải nằm trong khoảng từ 1.0 đến 5.0.';
  }
  if (typeof data.lookbackDays !== 'number' || data.lookbackDays < 7 || data.lookbackDays > 90) {
    errors.lookbackDays = 'Số ngày xem lại lịch sử phải từ 7 đến 90 ngày.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateIdleWasteRemediationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu xử lý tài nguyên lãng phí không hợp lệ.' } };
  }
  const data = input as Partial<IdleWasteRemediationMutationDTO>;
  if (!data.status || !['detected', 'in_review', 'remediated', 'ignored'].includes(data.status)) {
    errors.status = 'Trạng thái xử lý không hợp lệ.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateKubernetesRightsizingInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng Rightsizing không hợp lệ.' } };
  }
  const data = input as Partial<KubernetesRightsizingSimulationDTO>;
  if (typeof data.headroomBufferPercent !== 'number' || data.headroomBufferPercent < 5 || data.headroomBufferPercent > 100) {
    errors.headroomBufferPercent = 'Tỷ lệ dự phòng an toàn (Buffer) phải từ 5% đến 100%.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCfoMemoGenerateInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tạo bản ghi nhớ CFO không hợp lệ.' } };
  }
  const data = input as Partial<CfoMemorandumGenerateRequestDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề bản ghi nhớ CFO.';
  }
  if (!data.fiscalQuarter || typeof data.fiscalQuarter !== 'string' || !data.fiscalQuarter.trim()) {
    errors.fiscalQuarter = 'Vui lòng chọn quý tài chính.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
