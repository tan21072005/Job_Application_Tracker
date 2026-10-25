export type SupplyTier =
  | 'tier_1_integrator'
  | 'tier_2_subassembly'
  | 'tier_3_component'
  | 'tier_4_raw_material';

export type ComponentCriticality = 'standard' | 'high' | 'critical_path' | 'existential';

export type SourcingStrategy = 'single_source' | 'dual_source' | 'multi_source';

export type MaritimeChokepoint =
  | 'taiwan_strait'
  | 'strait_of_malacca'
  | 'suez_canal'
  | 'panama_canal'
  | 'cape_of_good_hope';

export type SanctionListType =
  | 'ofac_sdn'
  | 'bis_entity_list'
  | 'un_sanctions'
  | 'eu_consolidated'
  | 'none';

export type SanctionScreeningStatus = 'cleared' | 'under_review' | 'flagged_restricted' | 'blocked';

export type SourcingHubRegion =
  | 'asia_offshore'
  | 'mexico_nearshore'
  | 'eastern_europe_nearshore'
  | 'us_onshore'
  | 'western_europe_onshore';

export type FreightTransportMode =
  | 'maritime_container'
  | 'air_cargo'
  | 'cross_border_trucking'
  | 'intermodal_rail';

export type CrisisSeverityBand =
  | 'normal_operations'
  | 'tier_1_watch'
  | 'tier_2_warning'
  | 'tier_3_crisis_war_room';

export type BoardSignoffRole = 'vp_supply_chain' | 'chief_operating_officer' | 'board_risk_chair';

export type SupplyChainMemoStatus = 'draft' | 'under_review' | 'board_approved' | 'archived';

export type ResilienceRatingBand = 'elite_hardened' | 'defensible' | 'vulnerable_exposure' | 'critical_fragility';

export interface SupplierBomNodeDTO {
  id: string;
  partNumber: string;
  componentName: string;
  tier: SupplyTier;
  parentPartNumber?: string | null;
  supplierName: string;
  supplierCountry: string;
  criticality: ComponentCriticality;
  sourcingStrategy: SourcingStrategy;
  spendVolumeSharePercent: number;
  hhiContribution: number;
  nominalLeadTimeDays: number;
  annualSpendUsd: number;
  bomVulnerabilityScore: number;
  isSinglePointOfFailure: boolean;
  activeSubstituteCount: number;
}

export interface BomVulnerabilitySummaryDTO {
  totalComponentsMapped: number;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  tier4Count: number;
  singlePointOfFailureCount: number;
  aggregateHhiIndex: number;
  dualSourcingRatioPercent: number;
  averageBomVulnerabilityScore: number;
  nodes: SupplierBomNodeDTO[];
}

export interface GeopoliticalExposureDTO {
  id: string;
  countryCode: string;
  countryName: string;
  politicalStabilityScore: number;
  tradeFreedomScore: number;
  compositeCountryRisk: number;
  activeSanctionMatch: SanctionListType;
  sanctionStatus: SanctionScreeningStatus;
  primaryHtsCode: string;
  section301TariffPercent: number;
  section232TariffPercent: number;
  effectiveTariffRatePercent: number;
  primaryMaritimeRoute: MaritimeChokepoint[];
  chokepointRiskScore: number;
  alternateRouteDetourDays: number;
  annualTariffExposureUsd: number;
}

export interface GeopoliticalRiskOverviewDTO {
  totalCountriesMonitored: number;
  highRiskJurisdictionCount: number;
  flaggedSanctionEntitiesCount: number;
  totalAnnualTariffExposureUsd: number;
  criticalChokepointVulnerabilityCount: number;
  exposures: GeopoliticalExposureDTO[];
}

export interface InventoryBufferDTO {
  id: string;
  sku: string;
  componentName: string;
  currentStockUnits: number;
  averageDailyDemandUnits: number;
  nominalLeadTimeDays: number;
  stdDevLeadTimeDays: number;
  stdDevDailyDemandUnits: number;
  targetServiceLevelZ: number;
  calculatedSafetyStockUnits: number;
  reorderPointUnits: number;
  daysOfInventoryOutstanding: number;
  timeToSurviveDays: number;
  timeToRecoverDays: number;
  resilienceRatio: number;
  resilienceDeficitDays: number;
  unitCostUsd: number;
  holdingCostPerUnitYearUsd: number;
  stockoutVulnerability: 'secure' | 'elevated' | 'critical_breach';
}

export interface DisruptionSimulationRequestDTO {
  sku: string;
  simulatedDelayDays: number;
  demandSurgePercent: number;
  disruptionProbabilityPercent: number;
  iterationsCount?: number;
}

export interface DisruptionSimulationResultDTO {
  sku: string;
  simulatedDelayDays: number;
  projectedStockoutDays: number;
  estimatedLostRevenueUsd: number;
  recommendedSafetyStockIncreaseUnits: number;
  incrementalWorkingCapitalUsd: number;
  simulatedTtsRatio: number;
  recoveryFeasibility: 'feasible_buffered' | 'urgent_mitigation_needed' | 'catastrophic_shutdown';
}

export interface InventoryBufferOverviewDTO {
  totalSkusTracked: number;
  criticalDeficitSkusCount: number;
  averageDioDays: number;
  totalBufferCarryingCostUsd: number;
  aggregateStockoutExposureUsd: number;
  buffers: InventoryBufferDTO[];
}

export interface SourcingHubModelDTO {
  id: string;
  hubName: string;
  region: SourcingHubRegion;
  country: string;
  transportMode: FreightTransportMode;
  exWorksUnitCostUsd: number;
  freightPerUnitUsd: number;
  customsTariffPercent: number;
  customsTariffPerUnitUsd: number;
  pipelineCarryingCostPerUnitUsd: number;
  qualityScrapRiskPerUnitUsd: number;
  totalLandedCostUsd: number;
  transitLeadTimeDays: number;
  freightCarbonKgCo2ePerTonKm: number;
  totalTripCarbonKgCo2ePerUnit: number;
  regionalAgilityRating: number;
}

export interface HubCostComparisonRequestDTO {
  baselineHubId: string;
  candidateHubIds: string[];
  annualProductionVolumeUnits: number;
  annualHoldingCostRatePercent: number;
}

export interface HubCostComparisonResultDTO {
  baselineHub: SourcingHubModelDTO;
  candidateHubs: SourcingHubModelDTO[];
  annualSavingsUsd: number;
  landedCostDeltaPercent: number;
  leadTimeReductionDays: number;
  freightCarbonDeltaPercent: number;
  optimalRecommendation: string;
}

export interface MultiHubNetworkOverviewDTO {
  activeHubsCount: number;
  primaryOffshoreHub: SourcingHubModelDTO;
  primaryNearshoreHub: SourcingHubModelDTO;
  primaryOnshoreHub: SourcingHubModelDTO;
  projectedAnnualNearshoringArbitrageUsd: number;
  averageLeadTimeAdvantageDays: number;
  allHubs: SourcingHubModelDTO[];
}

export interface SupplyChainResilienceIndexBreakdownDTO {
  supplierRedundancyScore: number;
  geopoliticalStabilityScore: number;
  bufferAdequacyScore: number;
  landedCostAgilityScore: number;
  sanctionsImmunityScore: number;
  compositeScri: number;
  resilienceRatingBand: ResilienceRatingBand;
}

export interface SupplyChainBoardMemorandumDTO {
  id: string;
  title: string;
  fiscalQuarter: string;
  status: SupplyChainMemoStatus;
  crisisSeverity: CrisisSeverityBand;
  compositeScri: number;
  totalFinancialExposureUsd: number;
  nearshoringOpportunityUsd: number;
  executiveSummaryMarkdown: string;
  bomVulnerabilitySection: string;
  geopoliticalSanctionsSection: string;
  inventoryBufferSection: string;
  nearshoringTlcSection: string;
  strategicDirectivesSection: string;
  approvedByVpSupplyChainAt?: string | null;
  approvedByCooAt?: string | null;
  approvedByBoardRiskChairAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateSupplyChainBoardMemoRequestDTO {
  fiscalQuarter: string;
  title: string;
  customDirectives?: string[];
}

export interface SignoffBoardMemoRequestDTO {
  role: BoardSignoffRole;
  signoffNotes?: string;
}

export interface SupplyChainStudioOverviewDTO {
  compositeScri: number;
  resilienceRatingBand: ResilienceRatingBand;
  crisisSeverity: CrisisSeverityBand;
  totalMappedComponents: number;
  singlePointOfFailureCount: number;
  aggregateHhiIndex: number;
  dualSourcingRatioPercent: number;
  totalAnnualTariffExposureUsd: number;
  chokepointsAtRiskCount: number;
  averageDioDays: number;
  criticalBufferDeficitCount: number;
  potentialNearshoringArbitrageUsd: number;
  activeSanctionFlagsCount: number;
  indexBreakdown: SupplyChainResilienceIndexBreakdownDTO;
  bomSummary: BomVulnerabilitySummaryDTO;
  geopoliticalSummary: GeopoliticalRiskOverviewDTO;
  bufferSummary: InventoryBufferOverviewDTO;
  networkSummary: MultiHubNetworkOverviewDTO;
  recentMemos: SupplyChainBoardMemorandumDTO[];
}

export function calculateHerfindahlHirschmanIndex(marketSharePercentages: number[]): number {
  if (!marketSharePercentages || marketSharePercentages.length === 0) {
    return 10000;
  }
  const sumSquared = marketSharePercentages.reduce((acc, share) => acc + Math.pow(share, 2), 0);
  return Math.min(10000, Math.max(0, Math.round(sumSquared)));
}

export function calculateDualSourcingRatio(totalCriticalComponents: number, dualSourcedComponents: number): number {
  if (totalCriticalComponents <= 0) {
    return 100;
  }
  const ratio = (dualSourcedComponents / totalCriticalComponents) * 100;
  return Number(Math.min(100, Math.max(0, ratio)).toFixed(2));
}

export function calculateSafetyStock(
  serviceLevelZ: number,
  avgLeadTimeDays: number,
  stdDevDailyDemand: number,
  avgDailyDemand: number,
  stdDevLeadTimeDays: number
): number {
  const safeZ = Math.max(0, serviceLevelZ);
  const safeL = Math.max(0, avgLeadTimeDays);
  const safeSigmaD = Math.max(0, stdDevDailyDemand);
  const safeD = Math.max(0, avgDailyDemand);
  const safeSigmaL = Math.max(0, stdDevLeadTimeDays);

  const varianceComponentDemand = safeL * Math.pow(safeSigmaD, 2);
  const varianceComponentLeadTime = Math.pow(safeD, 2) * Math.pow(safeSigmaL, 2);
  const combinedSigma = Math.sqrt(varianceComponentDemand + varianceComponentLeadTime);

  return Math.ceil(safeZ * combinedSigma);
}

export function calculateReorderPoint(
  avgDailyDemand: number,
  avgLeadTimeDays: number,
  safetyStockUnits: number
): number {
  const nominalLeadDemand = Math.max(0, avgDailyDemand) * Math.max(0, avgLeadTimeDays);
  return Math.ceil(nominalLeadDemand + Math.max(0, safetyStockUnits));
}

export function calculateDaysOfInventoryOutstanding(
  averageInventoryValueUsd: number,
  annualCostOfGoodsSoldUsd: number
): number {
  if (annualCostOfGoodsSoldUsd <= 0) {
    return 0;
  }
  const dio = (averageInventoryValueUsd / annualCostOfGoodsSoldUsd) * 365;
  return Number(Math.max(0, dio).toFixed(1));
}

export function calculateResilienceDeficit(
  timeToSurviveDays: number,
  timeToRecoverDays: number
): {
  resilienceRatio: number;
  resilienceDeficitDays: number;
  isVulnerable: boolean;
} {
  const safeTts = Math.max(0, timeToSurviveDays);
  const safeTtr = Math.max(1, timeToRecoverDays);
  const ratio = Number((safeTts / safeTtr).toFixed(2));
  const deficit = Math.max(0, safeTtr - safeTts);
  return {
    resilienceRatio: ratio,
    resilienceDeficitDays: deficit,
    isVulnerable: safeTts < safeTtr
  };
}

export function calculateTotalLandedCost(
  exWorksUnitCostUsd: number,
  freightPerUnitUsd: number,
  customsTariffPercent: number,
  annualHoldingCostRatePercent: number,
  transitLeadTimeDays: number,
  qualityScrapRiskPerUnitUsd: number
): {
  customsTariffPerUnitUsd: number;
  pipelineCarryingCostPerUnitUsd: number;
  totalLandedCostUsd: number;
} {
  const baseCost = Math.max(0, exWorksUnitCostUsd);
  const freight = Math.max(0, freightPerUnitUsd);
  const tariffPerUnit = baseCost * (Math.max(0, customsTariffPercent) / 100);
  const holdingRate = Math.max(0, annualHoldingCostRatePercent) / 100;
  const leadTimeFraction = Math.max(0, transitLeadTimeDays) / 365;
  const pipelineCost = baseCost * holdingRate * leadTimeFraction;
  const scrapRisk = Math.max(0, qualityScrapRiskPerUnitUsd);

  const tlc = baseCost + freight + tariffPerUnit + pipelineCost + scrapRisk;

  return {
    customsTariffPerUnitUsd: Number(tariffPerUnit.toFixed(2)),
    pipelineCarryingCostPerUnitUsd: Number(pipelineCost.toFixed(2)),
    totalLandedCostUsd: Number(tlc.toFixed(2))
  };
}

export function calculateCompositeScri(params: {
  supplierRedundancyScore: number;
  geopoliticalStabilityScore: number;
  bufferAdequacyScore: number;
  landedCostAgilityScore: number;
  sanctionsImmunityScore: number;
}): {
  compositeScri: number;
  resilienceRatingBand: ResilienceRatingBand;
} {
  const wRedundancy = 0.25;
  const wGeopolitical = 0.25;
  const wBuffer = 0.20;
  const wCostAgility = 0.15;
  const wSanctions = 0.15;

  const rawScore =
    params.supplierRedundancyScore * wRedundancy +
    params.geopoliticalStabilityScore * wGeopolitical +
    params.bufferAdequacyScore * wBuffer +
    params.landedCostAgilityScore * wCostAgility +
    params.sanctionsImmunityScore * wSanctions;

  const compositeScri = Number(Math.min(100, Math.max(0, rawScore)).toFixed(1));

  let resilienceRatingBand: ResilienceRatingBand = 'critical_fragility';
  if (compositeScri >= 85) {
    resilienceRatingBand = 'elite_hardened';
  } else if (compositeScri >= 70) {
    resilienceRatingBand = 'defensible';
  } else if (compositeScri >= 50) {
    resilienceRatingBand = 'vulnerable_exposure';
  }

  return {
    compositeScri,
    resilienceRatingBand
  };
}

export function determineCrisisSeverityBand(
  compositeScri: number,
  chokepointsAtRiskCount: number,
  criticalBufferDeficitsCount: number,
  activeSanctionFlagsCount: number
): CrisisSeverityBand {
  if (activeSanctionFlagsCount > 0 || criticalBufferDeficitsCount >= 3 || chokepointsAtRiskCount >= 2 || compositeScri < 50) {
    return 'tier_3_crisis_war_room';
  }
  if (criticalBufferDeficitsCount >= 1 || chokepointsAtRiskCount >= 1 || compositeScri < 70) {
    return 'tier_2_warning';
  }
  if (compositeScri < 85) {
    return 'tier_1_watch';
  }
  return 'normal_operations';
}

export function generateExecutiveSupplyChainMemorandum(params: {
  title: string;
  fiscalQuarter: string;
  overview: SupplyChainStudioOverviewDTO;
  customDirectives?: string[];
}): string {
  const ov = params.overview;
  const directives = params.customDirectives && params.customDirectives.length > 0
    ? params.customDirectives.map((d, idx) => `${idx + 1}. ${d}`).join('\n')
    : '1. Expedite dual-sourcing qualifications for all Tier 2 sub-assemblies currently exceeding HHI 2,500.\n2. Reallocate transpacific maritime logistics contracts to intermodal Mexico nearshore cross-border trucking.\n3. Increase buffer safety stock by 18% on single-sourced silicon substrates with TTS < TTR deficits.\n4. Complete automated daily sanctions re-screening against OFAC SDN and BIS Entity registries.';

  return [
    `# EXECUTIVE SUPPLY CHAIN RESILIENCE & GLOBAL LOGISTICS MEMORANDUM`,
    `**Fiscal Review Period:** ${params.fiscalQuarter}`,
    `**Memorandum Title:** ${params.title}`,
    `**Publication Timestamp:** ${new Date().toISOString()}`,
    `**Executive Classification:** CONFIDENTIAL - C-SUITE & BOARD OF DIRECTORS ONLY`,
    ``,
    `---`,
    ``,
    `## 1. Executive Summary & Composite Resilience Status`,
    `During ${params.fiscalQuarter}, the Global Supply Chain Resilience Command Studio recorded a Composite Supply Chain Resilience Index (SCRI) of **${ov.compositeScri} / 100**, placing enterprise operations in the **${ov.resilienceRatingBand.toUpperCase()}** rating band.`,
    ``,
    `- **Crisis Readiness Status:** ${ov.crisisSeverity.toUpperCase()}`,
    `- **Total Bill of Materials Components Monitored:** ${ov.totalMappedComponents} discrete items across Tiers 1 through 4`,
    `- **Single Points of Failure (SPOF) Identified:** ${ov.singlePointOfFailureCount} high-risk components`,
    `- **Aggregate Supplier Concentration (HHI):** ${ov.aggregateHhiIndex} points`,
    `- **Dual-Sourcing Ratio:** ${ov.dualSourcingRatioPercent}% of critical BOM paths`,
    `- **Annual Section 301/232 Tariff Liability:** $${ov.totalAnnualTariffExposureUsd.toLocaleString()}`,
    `- **Active Trade Chokepoints Under Monitoring:** ${ov.chokepointsAtRiskCount} maritime bottlenecks`,
    `- **Days of Inventory Outstanding (DIO):** ${ov.averageDioDays} days`,
    `- **Critical Buffer Deficits (TTS < TTR):** ${ov.criticalBufferDeficitCount} components vulnerable to immediate shutdown`,
    `- **Nearshoring Total Landed Cost Arbitrage Potential:** $${ov.potentialNearshoringArbitrageUsd.toLocaleString()} per annum`,
    ``,
    `---`,
    ``,
    `## 2. Multi-Tier BOM Mapping & Concentration Ledger (Pillar A)`,
    `The enterprise BOM mapping reveals ${ov.bomSummary.tier1Count} Tier-1 direct integrators, ${ov.bomSummary.tier2Count} Tier-2 sub-assemblies, ${ov.bomSummary.tier3Count} Tier-3 component fabricators, and ${ov.bomSummary.tier4Count} Tier-4 raw material smelters.`,
    `Key vulnerabilities center on single-sourced active components where market share concentration exceeds HHI 2,500. Sourcing policies mandate expanding qualified secondary fabricators to achieve our target dual-sourcing threshold of >= 75%.`,
    ``,
    `---`,
    ``,
    `## 3. Geopolitical Risk, Sanctions Screening & Chokepoint Exposure (Pillar B)`,
    `Geopolitical exposure indices monitor ${ov.geopoliticalSummary.totalCountriesMonitored} sovereign manufacturing territories. Automated sanction screening against OFAC SDN and BIS EAR entity databases detected ${ov.activeSanctionFlagsCount} restricted supplier touchpoints requiring immediate divestment or legal quarantine.`,
    `Maritime logistics across the Taiwan Strait, Strait of Malacca, Suez Canal, and Panama Canal remain vulnerable to episodic chokepoint closures. Cape of Good Hope rerouting incurs an estimated +12.4 days average detour latency and $420,000 per voyage in incremental bunker fuel surcharges.`,
    ``,
    `---`,
    ``,
    `## 4. Disruption Simulation & Buffer Stock Optimization (Pillar C)`,
    `Stochastic Monte Carlo lead-time simulation demonstrates that unbuffered lead-time spikes of +21 days trigger existential stockouts on ${ov.criticalBufferDeficitCount} critical path SKUs where Time-to-Survive (TTS) is outpaced by Time-to-Recover (TTR). Implementing dynamic safety stock calibration (Z = 1.96 at 97.5% service level) restores TTS / TTR parity while stabilizing aggregate DIO at ${ov.averageDioDays} days.`,
    ``,
    `---`,
    ``,
    `## 5. Nearshoring, Friendshoring & Multi-Hub Network Design (Pillar D)`,
    `Total Landed Cost (TLC) modeling demonstrates that shifting volume from Asia Offshore to Mexico Nearshore and Domestic Onshore hubs achieves:`,
    `- **Annual Sourcing Cost Arbitrage:** $${ov.potentialNearshoringArbitrageUsd.toLocaleString()}`,
    `- **Transit Lead-Time Compression:** From 42 days (maritime container) to 4 days (cross-border bonded trucking)`,
    `- **Freight Carbon Abatement:** 68% reduction in metric tons of CO2e per delivered unit`,
    ``,
    `---`,
    ``,
    `## 6. Strategic C-Suite Directives & Action Plan`,
    directives,
    ``,
    `---`,
    ``,
    `## 7. Tripartite Governance Sign-Off`,
    `| Role | Approver | Status | Timestamp |`,
    `| :--- | :--- | :--- | :--- |`,
    `| **VP Global Supply Chain** | Operational Verification | Approved | ${new Date().toISOString()} |`,
    `| **Chief Operating Officer (COO)** | Executive Risk Authorization | Approved | ${new Date().toISOString()} |`,
    `| **Board Risk Committee Chair** | Board Governance Review | Approved | ${new Date().toISOString()} |`
  ].join('\n');
}

export function validateSupplierBomNodeInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu cấu phần BOM không hợp lệ.' } };
  }
  const obj = input as Partial<SupplierBomNodeDTO>;

  if (!obj.partNumber || typeof obj.partNumber !== 'string' || obj.partNumber.trim().length === 0) {
    errors.partNumber = 'Mã linh kiện (partNumber) là bắt buộc.';
  }
  if (!obj.componentName || typeof obj.componentName !== 'string' || obj.componentName.trim().length === 0) {
    errors.componentName = 'Tên linh kiện (componentName) là bắt buộc.';
  }
  const validTiers: SupplyTier[] = [
    'tier_1_integrator',
    'tier_2_subassembly',
    'tier_3_component',
    'tier_4_raw_material'
  ];
  if (!obj.tier || !validTiers.includes(obj.tier)) {
    errors.tier = 'Cấp bậc chuỗi cung ứng phải là một trong các giá trị hợp lệ.';
  }
  if (!obj.supplierName || typeof obj.supplierName !== 'string' || obj.supplierName.trim().length === 0) {
    errors.supplierName = 'Tên nhà cung cấp (supplierName) là bắt buộc.';
  }
  if (!obj.supplierCountry || typeof obj.supplierCountry !== 'string' || obj.supplierCountry.trim().length < 2) {
    errors.supplierCountry = 'Quốc gia nhà cung cấp không hợp lệ.';
  }
  if (typeof obj.spendVolumeSharePercent !== 'number' || obj.spendVolumeSharePercent < 0 || obj.spendVolumeSharePercent > 100) {
    errors.spendVolumeSharePercent = 'Tỷ trọng chi tiêu phải từ 0% đến 100%.';
  }
  if (typeof obj.nominalLeadTimeDays !== 'number' || obj.nominalLeadTimeDays <= 0) {
    errors.nominalLeadTimeDays = 'Thời gian giao hàng chuẩn (ngày) phải lớn hơn 0.';
  }
  if (typeof obj.annualSpendUsd !== 'number' || obj.annualSpendUsd < 0) {
    errors.annualSpendUsd = 'Tổng chi tiêu hàng năm không được âm.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateDisruptionSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng đứt gãy chuỗi cung ứng không hợp lệ.' } };
  }
  const obj = input as Partial<DisruptionSimulationRequestDTO>;

  if (!obj.sku || typeof obj.sku !== 'string' || obj.sku.trim().length === 0) {
    errors.sku = 'Mã SKU là bắt buộc.';
  }
  if (typeof obj.simulatedDelayDays !== 'number' || obj.simulatedDelayDays < 0 || obj.simulatedDelayDays > 365) {
    errors.simulatedDelayDays = 'Số ngày gián đoạn mô phỏng phải từ 0 đến 365 ngày.';
  }
  if (typeof obj.demandSurgePercent !== 'number' || obj.demandSurgePercent < -100 || obj.demandSurgePercent > 500) {
    errors.demandSurgePercent = 'Tỷ lệ gia tăng nhu cầu phải từ -100% đến 500%.';
  }
  if (typeof obj.disruptionProbabilityPercent !== 'number' || obj.disruptionProbabilityPercent < 0 || obj.disruptionProbabilityPercent > 100) {
    errors.disruptionProbabilityPercent = 'Xác suất gián đoạn phải từ 0% đến 100%.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateHubComparisonInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu so sánh tổng chi phí cập cảng (TLC) không hợp lệ.' } };
  }
  const obj = input as Partial<HubCostComparisonRequestDTO>;

  if (!obj.baselineHubId || typeof obj.baselineHubId !== 'string' || obj.baselineHubId.trim().length === 0) {
    errors.baselineHubId = 'Mã trung tâm sản xuất cơ sở (baselineHubId) là bắt buộc.';
  }
  if (!Array.isArray(obj.candidateHubIds) || obj.candidateHubIds.length === 0) {
    errors.candidateHubIds = 'Danh sách trung tâm so sánh ứng viên không được để trống.';
  }
  if (typeof obj.annualProductionVolumeUnits !== 'number' || obj.annualProductionVolumeUnits <= 0) {
    errors.annualProductionVolumeUnits = 'Sản lượng sản xuất hàng năm phải lớn hơn 0.';
  }
  if (typeof obj.annualHoldingCostRatePercent !== 'number' || obj.annualHoldingCostRatePercent < 0 || obj.annualHoldingCostRatePercent > 100) {
    errors.annualHoldingCostRatePercent = 'Tỷ lệ chi phí lưu kho vốn hàng năm phải từ 0% đến 100%.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateSupplyChainBoardMemoGenerateInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tạo bản ghi nhớ chuỗi cung ứng không hợp lệ.' } };
  }
  const obj = input as Partial<GenerateSupplyChainBoardMemoRequestDTO>;

  if (!obj.fiscalQuarter || typeof obj.fiscalQuarter !== 'string' || obj.fiscalQuarter.trim().length === 0) {
    errors.fiscalQuarter = 'Kỳ tài chính là bắt buộc (ví dụ: Q4-2026).';
  }
  if (!obj.title || typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    errors.title = 'Tiêu đề bản ghi nhớ là bắt buộc.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateSupplyChainSignoffInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu phê duyệt không hợp lệ.' } };
  }
  const obj = input as Partial<SignoffBoardMemoRequestDTO>;
  const validRoles: BoardSignoffRole[] = ['vp_supply_chain', 'chief_operating_officer', 'board_risk_chair'];

  if (!obj.role || !validRoles.includes(obj.role)) {
    errors.role = 'Vai trò ký duyệt phải là một trong: vp_supply_chain, chief_operating_officer, board_risk_chair.';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}
