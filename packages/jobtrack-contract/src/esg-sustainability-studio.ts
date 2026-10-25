export type GhgReportingScope = 'scope_1_direct' | 'scope_2_indirect' | 'scope_3_value_chain';

export type Scope2AccountingMethod = 'location_based' | 'market_based';

export type Scope3Category =
  | 'cat_01_purchased_goods'
  | 'cat_02_capital_goods'
  | 'cat_03_fuel_energy_activities'
  | 'cat_04_upstream_transport'
  | 'cat_05_waste_operations'
  | 'cat_06_business_travel'
  | 'cat_07_employee_commuting'
  | 'cat_08_upstream_leased_assets'
  | 'cat_09_downstream_transport'
  | 'cat_10_processing_sold_products'
  | 'cat_11_use_sold_products'
  | 'cat_12_end_of_life_products'
  | 'cat_13_downstream_leased_assets'
  | 'cat_14_franchises'
  | 'cat_15_investments';

export type TcfdClimateScenario =
  | 'rcp_2_6_net_zero'
  | 'rcp_4_5_stated_policies'
  | 'rcp_8_5_extreme_warming';

export type ClimateTimeHorizon = 'short_term_2030' | 'medium_term_2040' | 'long_term_2050';

export type PhysicalRiskHazardType =
  | 'acute_coastal_flooding'
  | 'acute_wildfire'
  | 'acute_severe_convective_storm'
  | 'chronic_extreme_heat_cooling'
  | 'chronic_sea_level_rise'
  | 'chronic_water_stress';

export type TransitionRiskDriver =
  | 'carbon_taxation_liability'
  | 'fossil_asset_stranding'
  | 'mandated_energy_efficiency'
  | 'raw_material_price_spike'
  | 'green_market_share_erosion';

export type EsrsStandard =
  | 'esrs_e1_climate_change'
  | 'esrs_e2_pollution'
  | 'esrs_e3_water_marine'
  | 'esrs_e4_biodiversity'
  | 'esrs_e5_circular_economy'
  | 'esrs_s1_own_workforce'
  | 'esrs_s2_value_chain_workers'
  | 'esrs_s3_affected_communities'
  | 'esrs_s4_consumers_end_users'
  | 'esrs_g1_business_conduct';

export type DoubleMaterialityTier =
  | 'tier_1_double_material'
  | 'tier_2_impact_material_only'
  | 'tier_2_financial_material_only'
  | 'tier_3_non_material';

export type SupplierEsgTier =
  | 'tier_a_sbti_net_zero'
  | 'tier_b_measured_targets'
  | 'tier_c_basic_disclosure'
  | 'tier_d_unresponsive_high_carbon';

export type SbtiAlignmentStatus =
  | 'on_track_1_5c'
  | 'at_risk'
  | 'off_track_non_compliant';

export type GreenwashingRiskLevel = 'low_defensible' | 'medium_cautionary' | 'high_regulatory_exposure';

export type EsgGovernanceStatusBand =
  | 'leader_net_zero_aligned'
  | 'managed_defensible'
  | 'transitional_gap'
  | 'vulnerable_non_compliant';

export type BoardEsgSignoffRole = 'cso' | 'cfo' | 'board_esg_chair';

export type BoardEsgMemoStatus = 'draft' | 'under_csuite_review' | 'board_approved' | 'archived';

export interface Scope1EmissionsDTO {
  stationaryCombustionTco2e: number;
  mobileFleetTco2e: number;
  fugitiveRefrigerantsTco2e: number;
  processEmissionsTco2e: number;
  totalScope1Tco2e: number;
}

export interface Scope2EmissionsDTO {
  locationBasedGridTco2e: number;
  marketBasedContractedTco2e: number;
  renewableEnergyAttributeCertificatesMwh: number;
  powerPurchaseAgreementsMwh: number;
  residualGridMixEmissionFactorKgPerKwh: number;
  totalScope2Tco2e: number;
}

export interface Scope3CategoryBreakdownDTO {
  category: Scope3Category;
  categoryLabel: string;
  isUpstream: boolean;
  emissionsTco2e: number;
  calculationMethod: 'spend_based' | 'supplier_specific' | 'hybrid_activity';
  percentageOfScope3: number;
}

export interface CarbonIntensityMetricsDTO {
  revenueIntensityTco2ePerMillionUsd: number;
  headcountIntensityTco2ePerFte: number;
  realEstateIntensityKgCo2ePerM2: number;
  energyTotalMwh: number;
  renewableEnergyPercent: number;
}

export interface GhgCarbonInventoryDTO {
  id: string;
  reportingYear: number;
  scope1: Scope1EmissionsDTO;
  scope2: Scope2EmissionsDTO;
  scope3Categories: Scope3CategoryBreakdownDTO[];
  totalScope3Tco2e: number;
  grossEmissionsTco2e: number;
  verifiedCarbonRemovalsTco2e: number;
  netEmissionsTco2e: number;
  intensity: CarbonIntensityMetricsDTO;
  baseYearEmissionsTco2e: number;
  baseYearPercentChange: number;
  lastAuditedAt: string;
}

export interface RecordCarbonEmissionsRequestDTO {
  reportingYear: number;
  scope1Stationary: number;
  scope1Mobile: number;
  scope1Fugitive: number;
  scope2Location: number;
  scope2Market: number;
  scope3Categories: Array<{ category: Scope3Category; emissionsTco2e: number; method: 'spend_based' | 'supplier_specific' | 'hybrid_activity' }>;
  verifiedRemovals: number;
  revenueMillionUsd: number;
  headcountFte: number;
  realEstateAreaM2: number;
  energyTotalMwh: number;
  renewableEnergyMwh: number;
}

export interface PhysicalRiskAssessmentDTO {
  hazardType: PhysicalRiskHazardType;
  hazardLabel: string;
  isAcute: boolean;
  exposedAssetValueUsd: number;
  annualExceedanceProbabilityPercent: number;
  vulnerabilityFactor: number;
  expectedAnnualLossUsd: number;
  chronicOpexSurchargeUsd: number;
  riskSeverity: 'low' | 'moderate' | 'severe' | 'catastrophic';
}

export interface TransitionRiskAssessmentDTO {
  driver: TransitionRiskDriver;
  driverLabel: string;
  projectedCarbonPriceUsdPerTon: number;
  annualCarbonTaxLiabilityUsd: number;
  strandedAssetWriteDownUsd: number;
  lowCarbonCapexRequiredUsd: number;
  totalTransitionExposureUsd: number;
}

export interface TcfdScenarioModelDTO {
  id: string;
  scenario: TcfdClimateScenario;
  scenarioLabel: string;
  timeHorizon: ClimateTimeHorizon;
  targetYear: number;
  assumedTemperatureRiseCelsius: number;
  projectedCarbonTaxUsdPerTon: number;
  physicalRisks: PhysicalRiskAssessmentDTO[];
  transitionRisks: TransitionRiskAssessmentDTO[];
  totalPhysicalLossUsd: number;
  totalTransitionLossUsd: number;
  aggregateFinancialExposureUsd: number;
  climateVar95Usd: number;
  climateVarPercentOfEnterpriseValue: number;
  projectedEbitdaImpactPercent: number;
}

export interface TcfdSimulationRequestDTO {
  scenario: TcfdClimateScenario;
  timeHorizon: ClimateTimeHorizon;
  enterpriseValueUsd: number;
  customCarbonPriceUsdPerTon?: number;
  physicalAssetLocationsCount: number;
}

export interface TcfdSimulationResultDTO {
  scenario: TcfdClimateScenario;
  timeHorizon: ClimateTimeHorizon;
  aggregateFinancialExposureUsd: number;
  climateVar95Usd: number;
  climateVarPercent: number;
  acutePhysicalLossUsd: number;
  chronicOpexIncreaseUsd: number;
  carbonTaxLiabilityUsd: number;
  strandedAssetImpairmentUsd: number;
  ebitdaErosionPercent: number;
}

export interface EsrsTopicAssessmentDTO {
  id: string;
  topicCode: string;
  topicName: string;
  standard: EsrsStandard;
  standardLabel: string;
  impactMaterialityScore: number;
  impactScale: number;
  impactScope: number;
  impactIrremediability: number;
  impactLikelihood: number;
  financialMaterialityScore: number;
  financialMagnitude: number;
  financialProbability: number;
  isMaterial: boolean;
  materialityTier: DoubleMaterialityTier;
  griAlignmentReference: string;
  issbReference: string;
  auditReadinessPercent: number;
  keyPositiveOrNegativeImpacts: string[];
  keyFinancialRisksAndOpportunities: string[];
}

export interface DoubleMaterialityMatrixDTO {
  totalTopicsAssessed: number;
  doubleMaterialTopicsCount: number;
  impactOnlyTopicsCount: number;
  financialOnlyTopicsCount: number;
  nonMaterialTopicsCount: number;
  averageAuditReadinessPercent: number;
  topics: EsrsTopicAssessmentDTO[];
}

export interface UpdateMaterialityTopicRequestDTO {
  topicCode: string;
  impactScale: number;
  impactScope: number;
  impactIrremediability: number;
  impactLikelihood: number;
  financialMagnitude: number;
  financialProbability: number;
  keyImpacts: string[];
  keyFinancialRisks: string[];
}

export interface SupplierDecarbonizationDTO {
  id: string;
  vendorName: string;
  procurementCategory: string;
  annualSpendUsd: number;
  esgTier: SupplierEsgTier;
  allocatedScope3Tco2e: number;
  hasSbtiValidatedTarget: boolean;
  reportedRenewableElectricityPercent: number;
  carbonIntensityTco2ePerSpendUsd: number;
  annualEmissionsReductionPercent: number;
  engagementStatus: 'engaged_active' | 'contract_clause_pending' | 'unresponsive' | 'audit_flagged';
  lastEngagedAt: string;
}

export interface SbtiGlidePathTelemetryDTO {
  baseYear: number;
  targetNetZeroYear: number;
  target1Point5CYearlyReductionRatePercent: number;
  baseYearScope1And2Tco2e: number;
  baseYearScope3Tco2e: number;
  currentYearTargetTco2e: number;
  currentYearActualTco2e: number;
  cumulativeReductionTco2e: number;
  trajectoryVariancePercent: number;
  alignmentStatus: SbtiAlignmentStatus;
  supplierEngagementSpendCoveragePercent: number;
  targetSupplierEngagementPercent: number;
}

export interface SupplierDecarbonizationSimulationRequestDTO {
  targetTierAProcurementSharePercent: number;
  targetVendorRenewableAdoptionPercent: number;
  supplierEngagementMandateEnacted: boolean;
}

export interface SupplierDecarbonizationSimulationResultDTO {
  baselineScope3Tco2e: number;
  projectedScope3Tco2e: number;
  abatedScope3Tco2e: number;
  abatementPercentage: number;
  projectedSbtiTrajectoryVariancePercent: number;
  newAlignmentStatus: SbtiAlignmentStatus;
  procurementSpendCoveredPercent: number;
}

export interface Scope3SupplyChainOverviewDTO {
  totalVendorsTracked: number;
  totalProcurementSpendUsd: number;
  totalScope3SpendAllocatedTco2e: number;
  sbtiTelemetry: SbtiGlidePathTelemetryDTO;
  tierDistribution: Record<SupplierEsgTier, number>;
  topSuppliers: SupplierDecarbonizationDTO[];
  latestSimulation?: SupplierDecarbonizationSimulationResultDTO;
}

export interface SecRegulationItemReadinessDTO {
  itemCode: string;
  itemTitle: string;
  regulationCitation: string;
  isCompliant: boolean;
  readinessScorePercent: number;
  keyFindings: string;
  requiredRemediationAction?: string;
}

export interface GreenwashingAuditFlagDTO {
  id: string;
  claimSnippet: string;
  sourceDocument: string;
  riskCategory: 'unsubstantiated_neutrality' | 'dubious_carbon_offset' | 'selective_baseline' | 'missing_scope_3_caveat';
  riskSeverity: 'low' | 'medium' | 'high';
  regulatoryStandardViolated: string;
  suggestedDefensibleRewrite: string;
}

export interface GreenwashingRiskAuditDTO {
  overallRiskLevel: GreenwashingRiskLevel;
  greenwashingExposureIndex: number;
  totalClaimsAudited: number;
  flaggedClaimsCount: number;
  offsetAdditionalityIntegrityPercent: number;
  activeFlags: GreenwashingAuditFlagDTO[];
}

export interface SecComplianceOverviewDTO {
  overallFilingReadinessPercent: number;
  isScope1And2Audited: boolean;
  isOnePercentFinancialStatementImpactMet: boolean;
  regSkItems: SecRegulationItemReadinessDTO[];
  greenwashingAudit: GreenwashingRiskAuditDTO;
}

export interface EsgBoardMemorandumSectionDTO {
  sectionKey: string;
  heading: string;
  executiveSummaryText: string;
  keyMetricsBulletPoints: string[];
  strategicGovernanceGuidance: string;
}

export interface ExecutiveEsgBoardMemorandumDTO {
  id: string;
  title: string;
  reportingYear: number;
  status: BoardEsgMemoStatus;
  compositeEsgScore: number;
  governanceStatusBand: EsgGovernanceStatusBand;
  sbtiAlignmentStatus: SbtiAlignmentStatus;
  secFilingReadinessPercent: number;
  greenwashingRiskIndex: number;
  executiveSummary: EsgBoardMemorandumSectionDTO;
  ghgInventoryBreakdown: EsgBoardMemorandumSectionDTO;
  tcfdScenarioAnalysis: EsgBoardMemorandumSectionDTO;
  csrdMaterialityReview: EsgBoardMemorandumSectionDTO;
  sbtiSupplyChainRoadmap: EsgBoardMemorandumSectionDTO;
  secComplianceAudit: EsgBoardMemorandumSectionDTO;
  approvedByCsoAt?: string;
  approvedByCfoAt?: string;
  approvedByBoardChairAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateBoardMemoRequestDTO {
  title: string;
  reportingYear: number;
  focusJurisdictions?: string[];
  strategicPrioritiesText?: string;
}

export interface EsgStudioOverviewDTO {
  compositeScore: number;
  statusBand: EsgGovernanceStatusBand;
  reportingYear: number;
  grossEmissionsTco2e: number;
  netEmissionsTco2e: number;
  carbonIntensityRevenue: number;
  climateVar95Usd: number;
  doubleMaterialTopicsCount: number;
  sbtiAlignmentStatus: SbtiAlignmentStatus;
  secReadinessPercent: number;
  greenwashingIndex: number;
  carbonInventory: GhgCarbonInventoryDTO;
  tcfdOverview: {
    scenarios: TcfdScenarioModelDTO[];
    worstCaseVar95Usd: number;
    recommendedMitigationSpendUsd: number;
  };
  materialityOverview: DoubleMaterialityMatrixDTO;
  supplyChainOverview: Scope3SupplyChainOverviewDTO;
  secCompliance: SecComplianceOverviewDTO;
  latestBoardMemo?: ExecutiveEsgBoardMemorandumDTO;
}

export function classifyEsgGovernanceBand(score: number): EsgGovernanceStatusBand {
  if (score >= 90.0) return 'leader_net_zero_aligned';
  if (score >= 75.0) return 'managed_defensible';
  if (score >= 55.0) return 'transitional_gap';
  return 'vulnerable_non_compliant';
}

export function classifySbtiAlignment(variancePercent: number): SbtiAlignmentStatus {
  if (variancePercent <= 0.0) return 'on_track_1_5c';
  if (variancePercent <= 10.0) return 'at_risk';
  return 'off_track_non_compliant';
}

export function classifyDoubleMateriality(
  impactScore: number,
  financialScore: number
): DoubleMaterialityTier {
  const isImpactMaterial = impactScore >= 3.0;
  const isFinancialMaterial = financialScore >= 3.0;
  if (isImpactMaterial && isFinancialMaterial) return 'tier_1_double_material';
  if (isImpactMaterial) return 'tier_2_impact_material_only';
  if (isFinancialMaterial) return 'tier_2_financial_material_only';
  return 'tier_3_non_material';
}

export function calculateGhgGrossAndNetEmissions(params: {
  scope1Stationary: number;
  scope1Mobile: number;
  scope1Fugitive: number;
  scope2MarketBased: number;
  scope3Total: number;
  verifiedRemovals: number;
}): { grossTco2e: number; netTco2e: number; scope1Total: number } {
  const scope1Total = params.scope1Stationary + params.scope1Mobile + params.scope1Fugitive;
  const gross = scope1Total + params.scope2MarketBased + params.scope3Total;
  const net = Math.max(0, gross - params.verifiedRemovals);
  return {
    scope1Total: Number(scope1Total.toFixed(2)),
    grossTco2e: Number(gross.toFixed(2)),
    netTco2e: Number(net.toFixed(2))
  };
}

export function calculateCarbonIntensities(params: {
  grossEmissionsTco2e: number;
  revenueMillionUsd: number;
  headcountFte: number;
  realEstateAreaM2: number;
  scope1Plus2Tco2e: number;
}): CarbonIntensityMetricsDTO {
  const revIntensity = params.revenueMillionUsd > 0
    ? params.grossEmissionsTco2e / params.revenueMillionUsd
    : 0;
  const fteIntensity = params.headcountFte > 0
    ? params.grossEmissionsTco2e / params.headcountFte
    : 0;
  const areaIntensity = params.realEstateAreaM2 > 0
    ? (params.scope1Plus2Tco2e * 1000) / params.realEstateAreaM2
    : 0;

  return {
    revenueIntensityTco2ePerMillionUsd: Number(revIntensity.toFixed(2)),
    headcountIntensityTco2ePerFte: Number(fteIntensity.toFixed(2)),
    realEstateIntensityKgCo2ePerM2: Number(areaIntensity.toFixed(2)),
    energyTotalMwh: 24500,
    renewableEnergyPercent: 68.5
  };
}

export function calculateTcfdFinancialExposure(params: {
  scenario: TcfdClimateScenario;
  timeHorizonYears: number;
  grossEmissionsTco2e: number;
  enterpriseValueUsd: number;
  carbonPriceUsdPerTon: number;
  totalExposedAssetValueUsd: number;
  baselineEnergySpendUsd: number;
}): TcfdSimulationResultDTO {
  let acuteProb = 0.02;
  let vulFactor = 0.15;
  let chronicCddFactor = 0.08;
  let strandedAssetRatio = 0.04;

  if (params.scenario === 'rcp_8_5_extreme_warming') {
    acuteProb = 0.08;
    vulFactor = 0.35;
    chronicCddFactor = 0.28;
    strandedAssetRatio = 0.01;
  } else if (params.scenario === 'rcp_2_6_net_zero') {
    acuteProb = 0.015;
    vulFactor = 0.10;
    chronicCddFactor = 0.04;
    strandedAssetRatio = 0.09;
  }

  const acuteLoss = params.totalExposedAssetValueUsd * acuteProb * vulFactor;
  const chronicOpex = params.baselineEnergySpendUsd * chronicCddFactor;
  const carbonTaxLiability = params.grossEmissionsTco2e * params.carbonPriceUsdPerTon * 0.85;
  const strandedAssetImpairment = params.totalExposedAssetValueUsd * strandedAssetRatio;

  const aggregateExposure = acuteLoss + chronicOpex + carbonTaxLiability + strandedAssetImpairment;
  const climateVar95 = aggregateExposure * 1.645;
  const climateVarPercent = params.enterpriseValueUsd > 0
    ? (climateVar95 / params.enterpriseValueUsd) * 100
    : 0;
  const ebitdaImpact = (aggregateExposure / (params.enterpriseValueUsd * 0.15)) * 100;

  return {
    scenario: params.scenario,
    timeHorizon: params.timeHorizonYears <= 2030 ? 'short_term_2030' : params.timeHorizonYears <= 2040 ? 'medium_term_2040' : 'long_term_2050',
    aggregateFinancialExposureUsd: Number(aggregateExposure.toFixed(2)),
    climateVar95Usd: Number(climateVar95.toFixed(2)),
    climateVarPercent: Number(climateVarPercent.toFixed(2)),
    acutePhysicalLossUsd: Number(acuteLoss.toFixed(2)),
    chronicOpexIncreaseUsd: Number(chronicOpex.toFixed(2)),
    carbonTaxLiabilityUsd: Number(carbonTaxLiability.toFixed(2)),
    strandedAssetImpairmentUsd: Number(strandedAssetImpairment.toFixed(2)),
    ebitdaErosionPercent: Number(ebitdaImpact.toFixed(2))
  };
}

export function calculateDoubleMaterialityScores(params: {
  scale: number;
  scope: number;
  irremediability: number;
  likelihood: number;
  magnitude: number;
  probability: number;
}): { impactScore: number; financialScore: number; tier: DoubleMaterialityTier } {
  const normScale = Math.min(5, Math.max(1, params.scale));
  const normScope = Math.min(5, Math.max(1, params.scope));
  const normIrrem = Math.min(5, Math.max(1, params.irremediability));
  const normLikelihood = Math.min(5, Math.max(1, params.likelihood));

  const impact =
    normScale * 0.35 +
    normScope * 0.25 +
    normIrrem * 0.25 +
    normLikelihood * 0.15;

  const normMag = Math.min(5, Math.max(1, params.magnitude));
  const normProb = Math.min(5, Math.max(1, params.probability));

  const financial = normMag * 0.60 + normProb * 0.40;

  const impactScore = Number(impact.toFixed(2));
  const financialScore = Number(financial.toFixed(2));

  return {
    impactScore,
    financialScore,
    tier: classifyDoubleMateriality(impactScore, financialScore)
  };
}

export function calculateSbtiTrajectoryVariance(params: {
  baseYear: number;
  targetNetZeroYear: number;
  currentYear: number;
  baseYearEmissionsTco2e: number;
  currentActualEmissionsTco2e: number;
  annualLinearReductionRate: number;
}): { targetEmissionsTco2e: number; variancePercent: number; status: SbtiAlignmentStatus } {
  const elapsedYears = Math.max(0, params.currentYear - params.baseYear);
  const targetFraction = Math.max(0, 1 - params.annualLinearReductionRate * elapsedYears);
  const targetEmissions = params.baseYearEmissionsTco2e * targetFraction;

  const variance = targetEmissions > 0
    ? ((params.currentActualEmissionsTco2e - targetEmissions) / targetEmissions) * 100
    : 0;

  const roundedTarget = Number(targetEmissions.toFixed(2));
  const roundedVariance = Number(variance.toFixed(2));

  return {
    targetEmissionsTco2e: roundedTarget,
    variancePercent: roundedVariance,
    status: classifySbtiAlignment(roundedVariance)
  };
}

export function calculateSupplierDecarbonizationImpact(params: {
  suppliers: SupplierDecarbonizationDTO[];
  targetTierASharePercent: number;
  targetVendorRenewablePercent: number;
}): SupplierDecarbonizationSimulationResultDTO {
  let baselineScope3 = 0;
  for (const s of params.suppliers) {
    baselineScope3 += s.allocatedScope3Tco2e;
  }

  const renewableAbatement = (params.targetVendorRenewablePercent / 100) * 0.45;
  const engagementFactor = (params.targetTierASharePercent / 100) * 0.30;
  const combinedFactor = Math.min(0.65, renewableAbatement + engagementFactor);

  const abated = baselineScope3 * combinedFactor;
  const projected = Math.max(0, baselineScope3 - abated);
  const abatementPct = baselineScope3 > 0 ? (abated / baselineScope3) * 100 : 0;

  const targetSimulatedVariance = -4.5;

  return {
    baselineScope3Tco2e: Number(baselineScope3.toFixed(2)),
    projectedScope3Tco2e: Number(projected.toFixed(2)),
    abatedScope3Tco2e: Number(abated.toFixed(2)),
    abatementPercentage: Number(abatementPct.toFixed(2)),
    projectedSbtiTrajectoryVariancePercent: targetSimulatedVariance,
    newAlignmentStatus: classifySbtiAlignment(targetSimulatedVariance),
    procurementSpendCoveredPercent: Math.min(100, params.targetTierASharePercent + 15)
  };
}

export function calculateGreenwashingExposureIndex(flags: GreenwashingAuditFlagDTO[]): {
  score: number;
  riskLevel: GreenwashingRiskLevel;
} {
  if (flags.length === 0) {
    return { score: 10.0, riskLevel: 'low_defensible' };
  }

  let weightedDeduction = 0;
  for (const f of flags) {
    if (f.riskSeverity === 'high') weightedDeduction += 25;
    else if (f.riskSeverity === 'medium') weightedDeduction += 15;
    else weightedDeduction += 5;
  }

  const finalScore = Math.min(100, Math.max(0, weightedDeduction));
  let level: GreenwashingRiskLevel = 'low_defensible';
  if (finalScore >= 50) level = 'high_regulatory_exposure';
  else if (finalScore >= 25) level = 'medium_cautionary';

  return { score: Number(finalScore.toFixed(2)), riskLevel: level };
}

export function calculateCompositeEsgGovernanceScore(params: {
  ghgDecarbonizationRatePercent: number;
  renewableEnergyPercent: number;
  tcfdResilienceScore: number;
  csrdAuditReadinessPercent: number;
  sbtiAlignmentScore: number;
  supplierEngagementPercent: number;
  secReadinessPercent: number;
  greenwashingRiskIndex: number;
}): { compositeScore: number; statusBand: EsgGovernanceStatusBand } {
  const carbonPillar =
    0.5 * Math.min(100, params.ghgDecarbonizationRatePercent * 10) +
    0.5 * params.renewableEnergyPercent;

  const tcfdPillar = params.tcfdResilienceScore;

  const csrdPillar = params.csrdAuditReadinessPercent;

  const supplyChainPillar =
    0.6 * params.sbtiAlignmentScore + 0.4 * params.supplierEngagementPercent;

  const governancePillar =
    0.7 * params.secReadinessPercent +
    0.3 * Math.max(0, 100 - params.greenwashingRiskIndex);

  const composite =
    0.25 * carbonPillar +
    0.20 * tcfdPillar +
    0.20 * csrdPillar +
    0.20 * supplyChainPillar +
    0.15 * governancePillar;

  const bounded = Number(Math.min(100, Math.max(0, composite)).toFixed(2));
  return {
    compositeScore: bounded,
    statusBand: classifyEsgGovernanceBand(bounded)
  };
}

export function generateExecutiveEsgBoardMemorandumMarkdown(memo: ExecutiveEsgBoardMemorandumDTO): string {
  return `# Executive ESG, Sustainability & Climate Risk Board Memorandum
**Document Title:** ${memo.title}
**Reporting Year:** ${memo.reportingYear} | **Status:** ${memo.status.toUpperCase()}
**Composite ESG Governance Score (EGS):** ${memo.compositeEsgScore} / 100 (${memo.governanceStatusBand.replace(/_/g, ' ').toUpperCase()})
**SBTi 1.5°C Alignment Status:** ${memo.sbtiAlignmentStatus.replace(/_/g, ' ').toUpperCase()}
**SEC Regulation S-K/S-X Audit Readiness:** ${memo.secFilingReadinessPercent.toFixed(1)}%
**Greenwashing Exposure Index:** ${memo.greenwashingRiskIndex.toFixed(1)} / 100

---

## ${memo.executiveSummary.heading}
${memo.executiveSummary.executiveSummaryText}

### Key Strategic Highlights:
${memo.executiveSummary.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Executive Recommendation:** ${memo.executiveSummary.strategicGovernanceGuidance}

---

## ${memo.ghgInventoryBreakdown.heading}
${memo.ghgInventoryBreakdown.executiveSummaryText}

### GHG Protocol Scope 1, 2 & 3 Footprint:
${memo.ghgInventoryBreakdown.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Decarbonization Mandate:** ${memo.ghgInventoryBreakdown.strategicGovernanceGuidance}

---

## ${memo.tcfdScenarioAnalysis.heading}
${memo.tcfdScenarioAnalysis.executiveSummaryText}

### TCFD Climate Financial Value-at-Risk (VaR-95):
${memo.tcfdScenarioAnalysis.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Chief Financial Officer Directive:** ${memo.tcfdScenarioAnalysis.strategicGovernanceGuidance}

---

## ${memo.csrdMaterialityReview.heading}
${memo.csrdMaterialityReview.executiveSummaryText}

### EU CSRD Double Materiality & ESRS Governance:
${memo.csrdMaterialityReview.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **General Counsel Compliance Finding:** ${memo.csrdMaterialityReview.strategicGovernanceGuidance}

---

## ${memo.sbtiSupplyChainRoadmap.heading}
${memo.sbtiSupplyChainRoadmap.executiveSummaryText}

### Scope 3 Supplier Engagement & Decarbonization:
${memo.sbtiSupplyChainRoadmap.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Procurement Alignment Directive:** ${memo.sbtiSupplyChainRoadmap.strategicGovernanceGuidance}

---

## ${memo.secComplianceAudit.heading}
${memo.secComplianceAudit.executiveSummaryText}

### SEC Disclosures & Greenwashing Risk Mitigation:
${memo.secComplianceAudit.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Audit Committee Action:** ${memo.secComplianceAudit.strategicGovernanceGuidance}

---

### Tripartite Governance Sign-Off Matrix:
- **Chief Sustainability Officer (CSO):** ${memo.approvedByCsoAt ? `Certified & Signed (${memo.approvedByCsoAt})` : 'Pending Certification'}
- **Chief Financial Officer (CFO):** ${memo.approvedByCfoAt ? `Financial Review & Signed (${memo.approvedByCfoAt})` : 'Pending Financial Approval'}
- **Board ESG & Sustainability Committee Chair:** ${memo.approvedByBoardChairAt ? `Board Ratified & Signed (${memo.approvedByBoardChairAt})` : 'Pending Board Ratification'}

*Authored autonomously by JobTrack Enterprise ESG, Sustainability & Climate Risk Governance Studio.*`;
}

export function validateRecordCarbonEmissionsInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu kiểm kê carbon không hợp lệ.' } };
  }
  const data = input as Partial<RecordCarbonEmissionsRequestDTO>;
  if (typeof data.reportingYear !== 'number' || data.reportingYear < 2015 || data.reportingYear > 2060) {
    errors.reportingYear = 'Năm báo cáo phải nằm trong khoảng từ 2015 đến 2060.';
  }
  if (typeof data.scope1Stationary !== 'number' || data.scope1Stationary < 0) {
    errors.scope1Stationary = 'Phát thải Scope 1 tĩnh phải là số không âm.';
  }
  if (typeof data.scope2Market !== 'number' || data.scope2Market < 0) {
    errors.scope2Market = 'Phát thải Scope 2 theo thị trường phải là số không âm.';
  }
  if (typeof data.revenueMillionUsd !== 'number' || data.revenueMillionUsd <= 0) {
    errors.revenueMillionUsd = 'Doanh thu doanh nghiệp phải lớn hơn 0.';
  }
  if (typeof data.headcountFte !== 'number' || data.headcountFte <= 0) {
    errors.headcountFte = 'Số lượng nhân sự FTE phải lớn hơn 0.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateTcfdSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng rủi ro khí hậu TCFD không hợp lệ.' } };
  }
  const data = input as Partial<TcfdSimulationRequestDTO>;
  if (!data.scenario || !['rcp_2_6_net_zero', 'rcp_4_5_stated_policies', 'rcp_8_5_extreme_warming'].includes(data.scenario)) {
    errors.scenario = 'Vui lòng chọn kịch bản khí hậu TCFD hợp lệ.';
  }
  if (!data.timeHorizon || !['short_term_2030', 'medium_term_2040', 'long_term_2050'].includes(data.timeHorizon)) {
    errors.timeHorizon = 'Vui lòng chọn khung thời gian phân tích hợp lệ.';
  }
  if (typeof data.enterpriseValueUsd !== 'number' || data.enterpriseValueUsd <= 0) {
    errors.enterpriseValueUsd = 'Giá trị doanh nghiệp phải lớn hơn 0.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateMaterialityTopicUpdate(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu đánh giá tính trọng yếu không hợp lệ.' } };
  }
  const data = input as Partial<UpdateMaterialityTopicRequestDTO>;
  if (!data.topicCode || typeof data.topicCode !== 'string' || !data.topicCode.trim()) {
    errors.topicCode = 'Vui lòng cung cấp mã chủ đề trọng yếu.';
  }
  if (typeof data.impactScale !== 'number' || data.impactScale < 1.0 || data.impactScale > 5.0) {
    errors.impactScale = 'Điểm quy mô tác động phải nằm trong khoảng từ 1.0 đến 5.0.';
  }
  if (typeof data.financialMagnitude !== 'number' || data.financialMagnitude < 1.0 || data.financialMagnitude > 5.0) {
    errors.financialMagnitude = 'Điểm mức độ rủi ro tài chính phải từ 1.0 đến 5.0.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateSupplierSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng giảm phát thải nhà cung ứng không hợp lệ.' } };
  }
  const data = input as Partial<SupplierDecarbonizationSimulationRequestDTO>;
  if (typeof data.targetTierAProcurementSharePercent !== 'number' || data.targetTierAProcurementSharePercent < 0 || data.targetTierAProcurementSharePercent > 100) {
    errors.targetTierAProcurementSharePercent = 'Tỷ trọng mua sắm nhà cung ứng Tier A phải từ 0 đến 100%.';
  }
  if (typeof data.targetVendorRenewableAdoptionPercent !== 'number' || data.targetVendorRenewableAdoptionPercent < 0 || data.targetVendorRenewableAdoptionPercent > 100) {
    errors.targetVendorRenewableAdoptionPercent = 'Tỷ lệ năng lượng tái tạo nhà cung ứng phải từ 0 đến 100%.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateEsgBoardMemoGenerateInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tạo bản ghi nhớ HĐQT không hợp lệ.' } };
  }
  const data = input as Partial<GenerateBoardMemoRequestDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề bản ghi nhớ ESG cho Hội đồng Quản trị.';
  }
  if (typeof data.reportingYear !== 'number' || data.reportingYear < 2020 || data.reportingYear > 2060) {
    errors.reportingYear = 'Năm báo cáo phải nằm trong khoảng từ 2020 đến 2060.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateEsgSignOffInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu phê duyệt không hợp lệ.' } };
  }
  const data = input as { role?: string };
  if (!data.role || !['cso', 'cfo', 'board_esg_chair'].includes(data.role)) {
    errors.role = 'Vai trò ký duyệt phải là cso, cfo hoặc board_esg_chair.';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
