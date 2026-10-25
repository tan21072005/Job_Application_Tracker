import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateHerfindahlHirschmanIndex,
  calculateDualSourcingRatio,
  calculateSafetyStock,
  calculateReorderPoint,
  calculateDaysOfInventoryOutstanding,
  calculateResilienceDeficit,
  calculateTotalLandedCost,
  calculateCompositeScri,
  determineCrisisSeverityBand,
  generateExecutiveSupplyChainMemorandum
} from './domain';
import { supplyChainResilienceStudioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Supply Chain Resilience Studio Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Herfindahl-Hirschman concentration index and dual sourcing ratio', () => {
    expect(calculateHerfindahlHirschmanIndex([])).toBe(10000);
    expect(calculateHerfindahlHirschmanIndex([100])).toBe(10000);
    expect(calculateHerfindahlHirschmanIndex([50, 50])).toBe(5000);
    expect(calculateHerfindahlHirschmanIndex([25, 25, 25, 25])).toBe(2500);

    expect(calculateDualSourcingRatio(0, 0)).toBe(100);
    expect(calculateDualSourcingRatio(10, 8)).toBe(80);
    expect(calculateDualSourcingRatio(12, 3)).toBe(25);
  });

  it('calculates safety stock, reorder points, DIO, and resilience deficit metrics', () => {
    const ss = calculateSafetyStock(1.96, 30, 8, 50, 6.5);
    expect(ss).toBeGreaterThan(0);

    const rop = calculateReorderPoint(50, 30, ss);
    expect(rop).toBe(1500 + ss);

    const dio = calculateDaysOfInventoryOutstanding(1500000, 12000000);
    expect(dio).toBeGreaterThan(45);
    expect(dio).toBeLessThan(46);

    const deficitVulnerable = calculateResilienceDeficit(28, 45);
    expect(deficitVulnerable.resilienceRatio).toBe(0.62);
    expect(deficitVulnerable.resilienceDeficitDays).toBe(17);
    expect(deficitVulnerable.isVulnerable).toBe(true);

    const deficitSecure = calculateResilienceDeficit(56, 38);
    expect(deficitSecure.resilienceRatio).toBe(1.47);
    expect(deficitSecure.resilienceDeficitDays).toBe(0);
    expect(deficitSecure.isVulnerable).toBe(false);
  });

  it('computes Total Landed Cost (TLC) factoring in duties, pipeline capital, and scrap', () => {
    const tlc = calculateTotalLandedCost(100, 12.5, 25, 15, 42, 4);
    expect(tlc.customsTariffPerUnitUsd).toBe(25.0);
    expect(tlc.pipelineCarryingCostPerUnitUsd).toBeGreaterThan(1.7);
    expect(tlc.pipelineCarryingCostPerUnitUsd).toBeLessThan(1.8);
    expect(tlc.totalLandedCostUsd).toBeGreaterThan(143);
    expect(tlc.totalLandedCostUsd).toBeLessThan(144);
  });

  it('evaluates Composite SCRI and crisis escalation bands', () => {
    const elite = calculateCompositeScri({
      supplierRedundancyScore: 92,
      geopoliticalStabilityScore: 88,
      bufferAdequacyScore: 85,
      landedCostAgilityScore: 90,
      sanctionsImmunityScore: 95
    });
    expect(elite.compositeScri).toBeGreaterThanOrEqual(85);
    expect(elite.resilienceRatingBand).toBe('elite_hardened');

    const defensible = calculateCompositeScri({
      supplierRedundancyScore: 78,
      geopoliticalStabilityScore: 74,
      bufferAdequacyScore: 68,
      landedCostAgilityScore: 86,
      sanctionsImmunityScore: 92
    });
    expect(defensible.compositeScri).toBeGreaterThanOrEqual(70);
    expect(defensible.compositeScri).toBeLessThan(85);
    expect(defensible.resilienceRatingBand).toBe('defensible');

    expect(determineCrisisSeverityBand(88, 0, 0, 0)).toBe('normal_operations');
    expect(determineCrisisSeverityBand(82, 0, 0, 0)).toBe('tier_1_watch');
    expect(determineCrisisSeverityBand(82, 1, 1, 0)).toBe('tier_2_warning');
    expect(determineCrisisSeverityBand(82, 1, 1, 1)).toBe('tier_3_crisis_war_room');
  });

  it('generates C-suite board memorandum markdown with complete governance sections', () => {
    const md = generateExecutiveSupplyChainMemorandum({
      title: 'Q4-2026 Board SCM Strategy',
      fiscalQuarter: 'Q4-2026',
      overview: {
        compositeScri: 82.5,
        resilienceRatingBand: 'defensible',
        crisisSeverity: 'tier_1_watch',
        totalMappedComponents: 48,
        singlePointOfFailureCount: 7,
        aggregateHhiIndex: 2140,
        dualSourcingRatioPercent: 64.5,
        totalAnnualTariffExposureUsd: 4850000,
        chokepointsAtRiskCount: 2,
        averageDioDays: 42.5,
        criticalBufferDeficitCount: 4,
        potentialNearshoringArbitrageUsd: 3240000,
        activeSanctionFlagsCount: 1,
        indexBreakdown: {
          supplierRedundancyScore: 78,
          geopoliticalStabilityScore: 74,
          bufferAdequacyScore: 68,
          landedCostAgilityScore: 86,
          sanctionsImmunityScore: 92,
          compositeScri: 82.5,
          resilienceRatingBand: 'defensible'
        },
        bomSummary: {
          totalComponentsMapped: 4,
          tier1Count: 1,
          tier2Count: 1,
          tier3Count: 1,
          tier4Count: 1,
          singlePointOfFailureCount: 2,
          aggregateHhiIndex: 2140,
          dualSourcingRatioPercent: 64.5,
          averageBomVulnerabilityScore: 59.2,
          nodes: []
        },
        geopoliticalSummary: {
          totalCountriesMonitored: 3,
          highRiskJurisdictionCount: 1,
          flaggedSanctionEntitiesCount: 1,
          totalAnnualTariffExposureUsd: 3100000,
          criticalChokepointVulnerabilityCount: 2,
          exposures: []
        },
        bufferSummary: {
          totalSkusTracked: 2,
          criticalDeficitSkusCount: 1,
          averageDioDays: 42.1,
          totalBufferCarryingCostUsd: 37800,
          aggregateStockoutExposureUsd: 1450000,
          buffers: []
        },
        networkSummary: {
          activeHubsCount: 3,
          primaryOffshoreHub: {} as any,
          primaryNearshoreHub: {} as any,
          primaryOnshoreHub: {} as any,
          projectedAnnualNearshoringArbitrageUsd: 3240000,
          averageLeadTimeAdvantageDays: 38,
          allHubs: []
        },
        recentMemos: []
      }
    });

    expect(md).toContain('EXECUTIVE SUPPLY CHAIN RESILIENCE & GLOBAL LOGISTICS MEMORANDUM');
    expect(md).toContain('**Fiscal Review Period:** Q4-2026');
    expect(md).toContain('Composite Supply Chain Resilience Index (SCRI) of **82.5 / 100**');
    expect(md).toContain('Tripartite Governance Sign-Off');
  });

  it('exercises full repository lifecycle in demo mode with tripartite approvals', async () => {
    const overview = await supplyChainResilienceStudioRepository.getOverview();
    expect(overview.compositeScri).toBe(82.5);
    expect(overview.bomSummary.nodes.length).toBeGreaterThanOrEqual(4);
    expect(overview.geopoliticalSummary.exposures.length).toBeGreaterThanOrEqual(3);
    expect(overview.bufferSummary.buffers.length).toBeGreaterThanOrEqual(2);
    expect(overview.networkSummary.allHubs.length).toBeGreaterThanOrEqual(3);

    const savedNode = await supplyChainResilienceStudioRepository.saveBomNode({
      partNumber: 'BAT-LITH-700',
      componentName: 'Solid-State Lithium Battery Pack',
      tier: 'tier_2_subassembly',
      supplierName: 'Nagoya Energy Corp',
      supplierCountry: 'Japan',
      criticality: 'existential',
      sourcingStrategy: 'single_source',
      spendVolumeSharePercent: 100,
      nominalLeadTimeDays: 50,
      annualSpendUsd: 6500000
    });
    expect(savedNode.partNumber).toBe('BAT-LITH-700');
    expect(savedNode.isSinglePointOfFailure).toBe(true);

    const screened = await supplyChainResilienceStudioRepository.screenSanctions();
    expect(screened.length).toBeGreaterThanOrEqual(3);

    const simResult = await supplyChainResilienceStudioRepository.simulateLeadTimeDisruption({
      sku: 'SKU-MCU-3305',
      simulatedDelayDays: 35,
      demandSurgePercent: 20,
      disruptionProbabilityPercent: 50
    });
    expect(simResult.sku).toBe('SKU-MCU-3305');
    expect(simResult.projectedStockoutDays).toBeGreaterThan(0);
    expect(simResult.recommendedSafetyStockIncreaseUnits).toBeGreaterThan(0);

    const hubs = await supplyChainResilienceStudioRepository.getNetworkHubs();
    const compResult = await supplyChainResilienceStudioRepository.compareHubLandedCosts({
      baselineHubId: hubs[0].id,
      candidateHubIds: [hubs[1].id],
      annualProductionVolumeUnits: 75000,
      annualHoldingCostRatePercent: 15
    });
    expect(compResult.annualSavingsUsd).toBeGreaterThanOrEqual(0);
    expect(compResult.landedCostDeltaPercent).toBeGreaterThan(0);

    const memo = await supplyChainResilienceStudioRepository.generateBoardMemorandum({
      fiscalQuarter: 'Q4-2026',
      title: 'Global Supply Chain Resilience Memorandum'
    });
    expect(memo.fiscalQuarter).toBe('Q4-2026');
    expect(memo.status).toBe('draft');

    const signed1 = await supplyChainResilienceStudioRepository.signOffBoardMemorandum(memo.id, 'vp_supply_chain');
    expect(signed1.approvedByVpSupplyChainAt).toBeDefined();

    const signed2 = await supplyChainResilienceStudioRepository.signOffBoardMemorandum(memo.id, 'chief_operating_officer');
    expect(signed2.approvedByCooAt).toBeDefined();

    const signed3 = await supplyChainResilienceStudioRepository.signOffBoardMemorandum(memo.id, 'board_risk_chair');
    expect(signed3.approvedByBoardRiskChairAt).toBeDefined();
    expect(signed3.status).toBe('board_approved');
  });
});
