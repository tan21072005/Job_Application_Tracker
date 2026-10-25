import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateGhgGrossAndNetEmissions,
  calculateCarbonIntensities,
  calculateTcfdFinancialExposure,
  classifyDoubleMateriality,
  calculateDoubleMaterialityScores,
  calculateSbtiTrajectoryVariance,
  calculateSupplierDecarbonizationImpact,
  calculateGreenwashingExposureIndex,
  calculateCompositeEsgGovernanceScore,
  generateExecutiveEsgBoardMemorandumMarkdown,
  type ExecutiveEsgBoardMemorandumDTO,
  type SupplierDecarbonizationDTO,
  type GreenwashingAuditFlagDTO
} from './domain';
import { esgSustainabilityStudioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('ESG Sustainability Studio Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates GHG Protocol gross and net emissions across Scopes 1, 2, and 3', () => {
    const ghg = calculateGhgGrossAndNetEmissions({
      scope1Stationary: 2450.5,
      scope1Mobile: 850.2,
      scope1Fugitive: 120.3,
      scope2MarketBased: 4200.0,
      scope3Total: 30150.0,
      verifiedRemovals: 1500.0
    });

    expect(ghg.scope1Total).toBe(3421.0);
    expect(ghg.grossTco2e).toBe(37771.0);
    expect(ghg.netTco2e).toBe(36271.0);

    const intensity = calculateCarbonIntensities({
      grossEmissionsTco2e: ghg.grossTco2e,
      revenueMillionUsd: 500,
      headcountFte: 2500,
      realEstateAreaM2: 75000,
      scope1Plus2Tco2e: 7621.0
    });

    expect(intensity.revenueIntensityTco2ePerMillionUsd).toBe(75.54);
    expect(intensity.headcountIntensityTco2ePerFte).toBe(15.11);
    expect(intensity.realEstateIntensityKgCo2ePerM2).toBe(101.61);
    expect(intensity.renewableEnergyPercent).toBeGreaterThan(50);
  });

  it('evaluates TCFD physical and transition climate risks under RCP scenarios', () => {
    const rcp26 = calculateTcfdFinancialExposure({
      scenario: 'rcp_2_6_net_zero',
      timeHorizonYears: 2030,
      grossEmissionsTco2e: 37770,
      enterpriseValueUsd: 1200000000,
      carbonPriceUsdPerTon: 150,
      totalExposedAssetValueUsd: 150000000,
      baselineEnergySpendUsd: 12000000
    });

    expect(rcp26.scenario).toBe('rcp_2_6_net_zero');
    expect(rcp26.timeHorizon).toBe('short_term_2030');
    expect(rcp26.climateVar95Usd).toBeGreaterThan(10000000);
    expect(rcp26.carbonTaxLiabilityUsd).toBeGreaterThan(4000000);
    expect(rcp26.strandedAssetImpairmentUsd).toBeGreaterThan(10000000);

    const rcp85 = calculateTcfdFinancialExposure({
      scenario: 'rcp_8_5_extreme_warming',
      timeHorizonYears: 2050,
      grossEmissionsTco2e: 37770,
      enterpriseValueUsd: 1200000000,
      carbonPriceUsdPerTon: 50,
      totalExposedAssetValueUsd: 150000000,
      baselineEnergySpendUsd: 12000000
    });

    expect(rcp85.scenario).toBe('rcp_8_5_extreme_warming');
    expect(rcp85.timeHorizon).toBe('long_term_2050');
    expect(rcp85.acutePhysicalLossUsd).toBeGreaterThan(rcp26.acutePhysicalLossUsd);
    expect(rcp85.chronicOpexIncreaseUsd).toBeGreaterThan(rcp26.chronicOpexIncreaseUsd);
  });

  it('classifies ESRS double materiality topics across 2D matrix', () => {
    const doubleMaterial = calculateDoubleMaterialityScores({
      scale: 4.8,
      scope: 4.5,
      irremediability: 4.6,
      likelihood: 4.2,
      magnitude: 4.4,
      probability: 4.0
    });
    expect(doubleMaterial.tier).toBe('tier_1_double_material');
    expect(doubleMaterial.impactScore).toBeGreaterThanOrEqual(3.0);
    expect(doubleMaterial.financialScore).toBeGreaterThanOrEqual(3.0);

    const tier1 = classifyDoubleMateriality(4.2, 4.0);
    expect(tier1).toBe('tier_1_double_material');

    const tier2Impact = classifyDoubleMateriality(3.5, 2.1);
    expect(tier2Impact).toBe('tier_2_impact_material_only');

    const tier2Financial = classifyDoubleMateriality(2.2, 3.8);
    expect(tier2Financial).toBe('tier_2_financial_material_only');

    const tier3 = classifyDoubleMateriality(2.1, 2.4);
    expect(tier3).toBe('tier_3_non_material');
  });

  it('analyzes SBTi glide path trajectory and supplier decarbonization cascade', () => {
    const onTrack = calculateSbtiTrajectoryVariance({
      baseYear: 2021,
      targetNetZeroYear: 2040,
      currentYear: 2026,
      baseYearEmissionsTco2e: 45000,
      currentActualEmissionsTco2e: 35000,
      annualLinearReductionRate: 0.042
    });
    expect(onTrack.status).toBe('on_track_1_5c');
    expect(onTrack.variancePercent).toBeLessThanOrEqual(0);

    const offTrack = calculateSbtiTrajectoryVariance({
      baseYear: 2021,
      targetNetZeroYear: 2040,
      currentYear: 2026,
      baseYearEmissionsTco2e: 45000,
      currentActualEmissionsTco2e: 44000,
      annualLinearReductionRate: 0.042
    });
    expect(offTrack.status).toBe('off_track_non_compliant');
    expect(offTrack.variancePercent).toBeGreaterThan(10.0);

    const suppliers: SupplierDecarbonizationDTO[] = [
      {
        id: 'sup-1',
        vendorName: 'Cloud Server Host Inc',
        procurementCategory: 'IT Infrastructure',
        annualSpendUsd: 15000000,
        esgTier: 'tier_a_sbti_net_zero',
        allocatedScope3Tco2e: 12000,
        hasSbtiValidatedTarget: true,
        reportedRenewableElectricityPercent: 90,
        carbonIntensityTco2ePerSpendUsd: 0.0008,
        annualEmissionsReductionPercent: 6.2,
        engagementStatus: 'engaged_active',
        lastEngagedAt: '2026-08-01'
      }
    ];

    const impact = calculateSupplierDecarbonizationImpact({
      suppliers,
      targetTierASharePercent: 60.0,
      targetVendorRenewablePercent: 75.0
    });

    expect(impact.baselineScope3Tco2e).toBe(12000);
    expect(impact.abatedScope3Tco2e).toBeGreaterThan(0);
    expect(impact.projectedScope3Tco2e).toBeLessThan(12000);
    expect(impact.newAlignmentStatus).toBe('on_track_1_5c');
  });

  it('computes Greenwashing Exposure Index and generates executive Board memorandum markdown', () => {
    const cleanAudit = calculateGreenwashingExposureIndex([]);
    expect(cleanAudit.score).toBe(10.0);
    expect(cleanAudit.riskLevel).toBe('low_defensible');

    const flags: GreenwashingAuditFlagDTO[] = [
      {
        id: 'f-1',
        claimSnippet: 'Completely carbon neutral by buying non-certified tree planting tokens.',
        sourceDocument: 'Annual Sustainability Glossy',
        riskCategory: 'dubious_carbon_offset',
        riskSeverity: 'high',
        regulatoryStandardViolated: 'EU Green Claims Directive Article 3',
        suggestedDefensibleRewrite: 'Reduced operational emissions by 35% with residual emissions unhedged.'
      },
      {
        id: 'f-2',
        claimSnippet: 'Zero carbon products delivered worldwide.',
        sourceDocument: 'Marketing Homepage',
        riskCategory: 'unsubstantiated_neutrality',
        riskSeverity: 'high',
        regulatoryStandardViolated: 'SEC Rule 10b-5 / FTC Green Guides',
        suggestedDefensibleRewrite: 'Carbon reduced delivery fleet.'
      }
    ];

    const flaggedAudit = calculateGreenwashingExposureIndex(flags);
    expect(flaggedAudit.score).toBe(50.0);
    expect(flaggedAudit.riskLevel).toBe('high_regulatory_exposure');

    const composite = calculateCompositeEsgGovernanceScore({
      ghgDecarbonizationRatePercent: 4.8,
      renewableEnergyPercent: 85.0,
      tcfdResilienceScore: 82.5,
      csrdAuditReadinessPercent: 89.0,
      sbtiAlignmentScore: 92.0,
      supplierEngagementPercent: 78.0,
      secReadinessPercent: 88.5,
      greenwashingRiskIndex: 12.0
    });

    expect(composite.compositeScore).toBeGreaterThanOrEqual(80);
    expect(['leader_net_zero_aligned', 'managed_defensible']).toContain(composite.statusBand);

    const memo: ExecutiveEsgBoardMemorandumDTO = {
      id: 'memo-esg-1',
      title: 'Enterprise ESG, Climate Risk & Decarbonization Governance Briefing',
      reportingYear: 2026,
      status: 'board_approved',
      compositeEsgScore: 87.4,
      governanceStatusBand: 'managed_defensible',
      sbtiAlignmentStatus: 'on_track_1_5c',
      secFilingReadinessPercent: 89.2,
      greenwashingRiskIndex: 11.5,
      executiveSummary: {
        sectionKey: 'exec',
        heading: 'Executive Governance Summary',
        executiveSummaryText: 'Enterprise ESG performance meets statutory disclosure readiness.',
        keyMetricsBulletPoints: ['Gross Emissions: 37,770 tCO2e', 'Net Emissions: 36,270 tCO2e', 'SBTi 1.5C Glide Path: On Track'],
        strategicGovernanceGuidance: 'Accelerate supplier Tier A onboarding.'
      },
      ghgInventoryBreakdown: {
        sectionKey: 'ghg',
        heading: 'GHG Protocol Emissions Ledger',
        executiveSummaryText: 'Comprehensive accounting across Scope 1, Scope 2, and Scope 3.',
        keyMetricsBulletPoints: ['Scope 1: 3,421 tCO2e', 'Scope 2 Market: 4,200 tCO2e', 'Scope 3: 30,150 tCO2e'],
        strategicGovernanceGuidance: 'Maintain 80% renewable electricity coverage.'
      },
      tcfdScenarioAnalysis: {
        sectionKey: 'tcfd',
        heading: 'TCFD Climate Financial Risk Scenario Analysis',
        executiveSummaryText: 'Stress testing under RCP 2.6 (Net Zero) and RCP 8.5 (Extreme Warming).',
        keyMetricsBulletPoints: ['RCP 2.6 VaR-95: $15.3M', 'RCP 8.5 VaR-95: $22.8M'],
        strategicGovernanceGuidance: 'Cap carbon tax liability through power purchase agreements.'
      },
      csrdMaterialityReview: {
        sectionKey: 'csrd',
        heading: 'EU CSRD Double Materiality & ESRS Governance',
        executiveSummaryText: 'Audited across 10 ESRS environmental, social, and governance standards.',
        keyMetricsBulletPoints: ['Double Material Topics: 3', 'Impact Only: 2', 'Financial Only: 1'],
        strategicGovernanceGuidance: 'Prioritize E1 Climate Change and S1 Own Workforce disclosures.'
      },
      sbtiSupplyChainRoadmap: {
        sectionKey: 'sbti',
        heading: 'Scope 3 Supply Chain Decarbonization & SBTi Trajectory',
        executiveSummaryText: 'Tracking -4.2% annual linear reductions toward net-zero 2040.',
        keyMetricsBulletPoints: ['Target Variance: -1.42%', 'Supplier Coverage: 71.4%'],
        strategicGovernanceGuidance: 'Enforce contractual ESG covenants for high-carbon suppliers.'
      },
      secComplianceAudit: {
        sectionKey: 'sec',
        heading: 'SEC Climate Rule Readiness & Greenwashing Risk Audit',
        executiveSummaryText: 'Item 1500-1507 disclosures and Regulation S-X 1% threshold verification.',
        keyMetricsBulletPoints: ['SEC Filing Readiness: 89.2%', 'Greenwashing Exposure Index: 11.5/100'],
        strategicGovernanceGuidance: 'Complete third-party limited assurance on Scope 1 and Scope 2 metrics.'
      },
      approvedByCsoAt: '2026-10-25T08:15:00.000Z',
      approvedByCfoAt: '2026-10-25T08:30:00.000Z',
      approvedByBoardChairAt: '2026-10-25T08:45:00.000Z',
      createdAt: '2026-10-25T08:00:00.000Z',
      updatedAt: '2026-10-25T08:45:00.000Z'
    };

    const markdown = generateExecutiveEsgBoardMemorandumMarkdown(memo);
    expect(markdown).toContain('Enterprise ESG, Climate Risk & Decarbonization Governance Briefing');
    expect(markdown).toContain('**Chief Sustainability Officer (CSO):** Certified & Signed');
    expect(markdown).toContain('**Chief Financial Officer (CFO):** Financial Review & Signed');
    expect(markdown).toContain('**Board ESG & Sustainability Committee Chair:** Board Ratified & Signed');
    expect(markdown).toContain('Composite ESG Governance Score (EGS):');
  });

  it('supports full repository methods, demo simulation, and tripartite sign-off mutations', async () => {
    const overview = await esgSustainabilityStudioRepository.getOverview();
    expect(overview.carbonInventory.reportingYear).toBe(2026);
    expect(overview.carbonInventory.scope3Categories.length).toBeGreaterThanOrEqual(4);
    expect(overview.tcfdOverview.scenarios.length).toBeGreaterThanOrEqual(2);
    expect(overview.materialityOverview.topics.length).toBeGreaterThanOrEqual(5);
    expect(overview.supplyChainOverview.topSuppliers.length).toBeGreaterThanOrEqual(3);
    expect(overview.secCompliance.regSkItems.length).toBeGreaterThanOrEqual(4);

    const simTcfd = await esgSustainabilityStudioRepository.simulateTcfdScenario({
      scenario: 'rcp_8_5_extreme_warming',
      timeHorizon: 'short_term_2030',
      enterpriseValueUsd: 1400000000,
      customCarbonPriceUsdPerTon: 125,
      physicalAssetLocationsCount: 16
    });
    expect(simTcfd.scenario).toBe('rcp_8_5_extreme_warming');
    expect(simTcfd.climateVar95Usd).toBeGreaterThan(0);

    const updatedTopic = await esgSustainabilityStudioRepository.updateMaterialityAssessment('ESRS_E1', {
      topicCode: 'ESRS_E1',
      impactScale: 4.9,
      impactScope: 4.8,
      impactIrremediability: 4.7,
      impactLikelihood: 4.5,
      financialMagnitude: 4.8,
      financialProbability: 4.6,
      keyImpacts: ['Critical greenhouse gas emission footprint'],
      keyFinancialRisks: ['Carbon tax liabilities under global regulations']
    });
    expect(updatedTopic.topicCode).toBe('ESRS_E1');
    expect(updatedTopic.impactMaterialityScore).toBeGreaterThanOrEqual(4.0);
    expect(updatedTopic.financialMaterialityScore).toBeGreaterThanOrEqual(4.0);
    expect(updatedTopic.materialityTier).toBe('tier_1_double_material');

    const simSup = await esgSustainabilityStudioRepository.simulateSupplierDecarbonization({
      targetTierAProcurementSharePercent: 75.0,
      targetVendorRenewableAdoptionPercent: 85.0,
      supplierEngagementMandateEnacted: true
    });
    expect(simSup.abatedScope3Tco2e).toBeGreaterThan(0);
    expect(simSup.newAlignmentStatus).toBe('on_track_1_5c');

    const generatedMemo = await esgSustainabilityStudioRepository.generateBoardMemorandum({
      title: 'FY2026 Certified Board Sustainability Memorandum',
      reportingYear: 2026
    });
    expect(generatedMemo.title).toBe('FY2026 Certified Board Sustainability Memorandum');
    expect(generatedMemo.status).toBe('draft');

    const signedCso = await esgSustainabilityStudioRepository.signOffBoardMemorandum(generatedMemo.id, 'cso');
    expect(signedCso.approvedByCsoAt).toBeTruthy();
    expect(signedCso.status).toBe('under_csuite_review');

    const signedCfo = await esgSustainabilityStudioRepository.signOffBoardMemorandum(generatedMemo.id, 'cfo');
    expect(signedCfo.approvedByCfoAt).toBeTruthy();
    expect(signedCfo.status).toBe('under_csuite_review');

    const signedChair = await esgSustainabilityStudioRepository.signOffBoardMemorandum(generatedMemo.id, 'board_esg_chair');
    expect(signedChair.approvedByBoardChairAt).toBeTruthy();
    expect(signedChair.status).toBe('board_approved');
  });
});
