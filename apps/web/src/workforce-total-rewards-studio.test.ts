import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateCompaRatio,
  calculateRangePenetration,
  evaluateSalaryCircleStatus,
  adjustSalaryForPurchasingPowerParity,
  calculateDilutionOverhang,
  calculateShareBurnRate,
  simulateRelativeTsrMonteCarlo,
  calculateSection83bTaxArbitrage,
  calculateIsoAlternativeMinimumTaxPreference,
  calculateCrossBorderTrailingTaxAllocation,
  solveMultivariatePayEquityRegression,
  calculateRemediationBudget,
  calculateTotalRewardsAlignmentIndex,
  assessSayOnPayShareholderRisk,
  generateSecItem402CdaMemorandum,
  type TotalRewardsStudioOverviewDTO
} from './domain';
import { workforceTotalRewardsStudioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Workforce Total Rewards Studio Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Compa-Ratio, Range Penetration, and Salary Circle statuses', () => {
    expect(calculateCompaRatio(160000, 160000)).toBe(100);
    expect(calculateCompaRatio(140000, 160000)).toBe(87.5);
    expect(calculateCompaRatio(180000, 160000)).toBe(112.5);
    expect(calculateCompaRatio(150000, 0)).toBe(100);

    expect(calculateRangePenetration(140000, 120000, 160000)).toBe(50);
    expect(calculateRangePenetration(120000, 120000, 160000)).toBe(0);
    expect(calculateRangePenetration(160000, 120000, 160000)).toBe(100);
    expect(calculateRangePenetration(110000, 120000, 160000)).toBe(-25);

    expect(evaluateSalaryCircleStatus(150000, 120000, 160000)).toBe('normal_band');
    expect(evaluateSalaryCircleStatus(165000, 120000, 160000)).toBe('red_circle_overpaid');
    expect(evaluateSalaryCircleStatus(115000, 120000, 160000)).toBe('green_circle_underpaid');

    const adjusted = adjustSalaryForPurchasingPowerParity(200000, 0.85, 0.9);
    expect(adjusted).toBe(Math.round(200000 * 0.85 * 0.9));
  });

  it('computes equity dilution overhang and share burn rate metrics', () => {
    const overhang = calculateDilutionOverhang({
      unvestedShares: 5000000,
      optionsOutstanding: 2000000,
      availableSharePool: 3000000,
      commonSharesOutstanding: 100000000
    });
    expect(overhang).toBe(10);

    const burn = calculateShareBurnRate({
      grossSharesGranted: 2200000,
      sharesForfeitedOrCancelled: 200000,
      weightedAverageCommonShares: 100000000
    });
    expect(burn.grossBurnRatePercent).toBe(2.2);
    expect(burn.netBurnRatePercent).toBe(2.0);
  });

  it('simulates stochastic relative TSR with Monte Carlo and negative TSR cap', () => {
    const sim = simulateRelativeTsrMonteCarlo({
      performancePeriodYears: 3,
      companyAnnualizedDrift: 0.12,
      companyVolatility: 0.35,
      peerGroupMeanDrift: 0.10,
      peerGroupMeanVolatility: 0.30,
      peerCorrelationFactor: 0.55,
      numPeers: 12,
      iterationsCount: 250,
      negativeTsrCapEnforced: true,
      maximumPayoutMultiplier: 200
    });
    expect(sim.iterationsCount).toBe(250);
    expect(sim.expectedPayoutMultiplierPercent).toBeGreaterThanOrEqual(0);
    expect(sim.probabilityOfZeroPayoutPercent).toBeGreaterThanOrEqual(0);
    expect(sim.probabilityOfMaxPayoutPercent).toBeGreaterThanOrEqual(0);
    expect(sim.recommendedFairValueDiscountPercent).toBeGreaterThanOrEqual(5);
  });

  it('calculates Section 83(b) arbitrage, ISO AMT preference, and cross-border workday withholding', () => {
    const arb = calculateSection83bTaxArbitrage({
      sharesGranted: 50000,
      grantDateFmvUsd: 1.0,
      strikeOrPurchasePriceUsd: 0.1,
      projectedLiquiditySharePriceUsd: 25.0,
      ordinaryIncomeTaxRatePercent: 40.0,
      longTermCapitalGainsRatePercent: 20.0,
      netInvestmentIncomeTaxPercent: 3.8,
      holdingPeriodYears: 4,
      riskOfForfeitureProbabilityPercent: 10
    });
    expect(arb.taxPaidAtGrantWith83bUsd).toBeGreaterThan(0);
    expect(arb.netProjectedTaxSavingsUsd).toBeGreaterThan(0);
    expect(arb.recommendationDirective).toBe('strongly_recommended_file_83b');

    const amt = calculateIsoAlternativeMinimumTaxPreference(20000, 15.0, 3.0, 28);
    expect(amt.amtSpreadUsd).toBe(240000);
    expect(amt.estimatedAmtLiabilityUsd).toBe(67200);

    const cross = calculateCrossBorderTrailingTaxAllocation({
      vestingGainUsd: 100000,
      totalVestingWorkdays: 1000,
      jurisdictionWorkdays: [
        { code: 'US', name: 'United States', workdays: 600, localWithholdingRatePercent: 37 },
        { code: 'UK', name: 'United Kingdom', workdays: 400, localWithholdingRatePercent: 45 }
      ]
    });
    expect(cross.allocations.length).toBe(2);
    expect(cross.allocations[0].allocationPercent).toBe(60);
    expect(cross.allocations[1].allocationPercent).toBe(40);
    expect(cross.totalWithholdingTaxUsd).toBe(Math.round(60000 * 0.37 + 40000 * 0.45));
  });

  it('solves multivariate pay equity regression and computes remediation budget', () => {
    const dataPoints = [
      { logSalary: Math.log(120000), genderDummy: 1, ethnicityDummy: 0, tenureYears: 3, levelRank: 3, performanceRating: 4, locationTierRank: 1 },
      { logSalary: Math.log(125000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 3, levelRank: 3, performanceRating: 4, locationTierRank: 1 },
      { logSalary: Math.log(150000), genderDummy: 1, ethnicityDummy: 1, tenureYears: 5, levelRank: 4, performanceRating: 4, locationTierRank: 2 },
      { logSalary: Math.log(155000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 5, levelRank: 4, performanceRating: 4, locationTierRank: 2 },
      { logSalary: Math.log(180000), genderDummy: 1, ethnicityDummy: 0, tenureYears: 7, levelRank: 5, performanceRating: 5, locationTierRank: 1 },
      { logSalary: Math.log(185000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 7, levelRank: 5, performanceRating: 5, locationTierRank: 1 }
    ];
    const reg = solveMultivariatePayEquityRegression(dataPoints);
    expect(typeof reg.unadjustedGenderGapPercent).toBe('number');
    expect(typeof reg.adjustedGenderGapPercent).toBe('number');
    expect(reg.rSquared).toBeGreaterThan(0);

    const budget = calculateRemediationBudget([
      { id: 'e1', currentBaseSalary: 110000, controlledModelPredictedSalary: 120000, gender: 'female', salaryCircleStatus: 'green_circle_underpaid' },
      { id: 'e2', currentBaseSalary: 130000, controlledModelPredictedSalary: 125000, gender: 'male', salaryCircleStatus: 'normal_band' }
    ]);
    expect(budget.totalRemediationBudgetUsd).toBe(10000);
    expect(budget.remediatedEmployeesCount).toBe(1);
  });

  it('evaluates TRAI alignment index, Say-on-Pay risk, and formats SEC Item 402 CD&A markdown', () => {
    const trai = calculateTotalRewardsAlignmentIndex({
      basePayRangeDisciplineScore: 92,
      payForPerformanceSensitivityScore: 88,
      equityDilutionBurnHealthScore: 85,
      payEquityStatutoryComplianceScore: 95,
      taxOptimizationGovernanceScore: 90
    });
    expect(trai.compositeTrai).toBeGreaterThanOrEqual(88);
    expect(trai.ratingBand).toBe('defensible_compliant');

    const sayRisk = assessSayOnPayShareholderRisk({
      ceoToMedianWorkerRatio: 175,
      threeYearGrossBurnRatePercent: 2.1,
      dilutionOverhangPercent: 10.5,
      controlledGenderGapPercent: -1.2,
      payVsTsrAlignmentScore: 85
    });
    expect(sayRisk.projectedShareholderApprovalRatePercent).toBeGreaterThanOrEqual(85);

    const dummyOverview: TotalRewardsStudioOverviewDTO = {
      compositeTrai: 89.5,
      ratingBand: 'defensible_compliant',
      sayOnPayProjectedApprovalPercent: 94.2,
      totalHeadcount: 1450,
      totalAnnualPayrollUsd: 198500000,
      redCircleEmployeeCount: 14,
      greenCircleEmployeeCount: 22,
      currentDilutionOverhangPercent: 9.8,
      annualGrossBurnRatePercent: 1.85,
      overallEnterpriseControlledGenderGapPercent: -1.1,
      totalRemediationBudgetRequiredUsd: 420000,
      irc409aFmvPerShareUsd: 18.5,
      active83bTimelyFilingsCount: 38,
      ceoToMedianWorkerPayRatio: 176,
      alignmentBreakdown: trai,
      sayOnPayAssessment: sayRisk,
      jobArchitectureSummary: {
        totalHeadcount: 1450,
        totalAnnualPayrollUsd: 198500000,
        globalAverageCompaRatio: 98.4,
        redCircleEmployeeCount: 14,
        greenCircleEmployeeCount: 22,
        totalSalaryBandsConfigured: 48,
        averageRangeSpreadPercent: 50,
        salaryBands: [],
        sampleProfiles: []
      },
      equityDilutionOverview: {
        totalCommonSharesOutstanding: 100000000,
        totalUnvestedRestrictedShares: 4500000,
        totalOptionsOutstandingExercisable: 2300000,
        availableSharePoolRemaining: 3000000,
        currentDilutionOverhangPercent: 9.8,
        maxApprovedOverhangLimitPercent: 12.0,
        annualGrossBurnRatePercent: 1.85,
        annualNetBurnRatePercent: 1.55,
        threeYearAverageGrossBurnRatePercent: 1.9,
        burnRateComplianceStatus: 'compliant_defensible',
        executiveGrants: []
      },
      taxOverview: {
        currentIrc409aFmvPerShareUsd: 18.5,
        last409aValuationDate: '2026-03-31',
        daysUntil409aExpiry: 156,
        active83bFilingsCount: 38,
        pending83bDeadlineFilingsCount: 4,
        missed83bDeadlineCount: 0,
        totalIsoAmtPreferenceTrackedUsd: 1250000,
        crossBorderMobileEmployeesTracked: 18,
        taxProfiles: []
      },
      payEquityOverview: {
        overallEnterpriseUnadjustedGenderGapPercent: -5.8,
        overallEnterpriseControlledGenderGapPercent: -1.1,
        overallEnterpriseControlledEthnicityGapPercent: -0.7,
        totalRemediationBudgetRequiredUsd: 420000,
        totalRemediatedEmployeesCount: 31,
        cohortRegressions: [],
        statutoryAudits: []
      },
      recentMemos: []
    };

    const md = generateSecItem402CdaMemorandum({
      title: 'FY2026 Board Compensation Committee Strategy',
      fiscalYear: 'FY2026',
      overview: dummyOverview
    });
    expect(md).toContain('BOARD COMPENSATION COMMITTEE GOVERNANCE MEMORANDUM & SEC ITEM 402 CD&A');
    expect(md).toContain('FY2026');
    expect(md).toContain('Chief Human Resources Officer (CHRO)');
    expect(md).toContain('Chief Financial Officer (CFO)');
    expect(md).toContain('Board Compensation Committee Chair');
  });

  it('exercises full repository lifecycle in demo mode with tripartite approvals', async () => {
    const overview = await workforceTotalRewardsStudioRepository.getOverview();
    expect(overview.compositeTrai).toBe(89.5);
    expect(overview.jobArchitectureSummary.salaryBands.length).toBeGreaterThanOrEqual(4);
    expect(overview.equityDilutionOverview.executiveGrants.length).toBeGreaterThanOrEqual(2);
    expect(overview.taxOverview.taxProfiles.length).toBeGreaterThanOrEqual(1);
    expect(overview.payEquityOverview.cohortRegressions.length).toBeGreaterThanOrEqual(2);

    const sim = await workforceTotalRewardsStudioRepository.simulateRelativeTsr({
      performancePeriodYears: 3,
      companyAnnualizedDrift: 0.12,
      companyVolatility: 0.35,
      peerGroupMeanDrift: 0.10,
      peerGroupMeanVolatility: 0.30,
      peerCorrelationFactor: 0.55,
      numPeers: 12,
      iterationsCount: 200,
      negativeTsrCapEnforced: true,
      maximumPayoutMultiplier: 200
    });
    expect(sim.iterationsCount).toBe(200);
    expect(sim.expectedPayoutMultiplierPercent).toBeGreaterThanOrEqual(0);

    const taxRes = await workforceTotalRewardsStudioRepository.optimizeEquityTax({
      sharesGranted: 50000,
      grantDateFmvUsd: 1.0,
      strikeOrPurchasePriceUsd: 0.1,
      projectedLiquiditySharePriceUsd: 25.0,
      ordinaryIncomeTaxRatePercent: 37.0,
      longTermCapitalGainsRatePercent: 20.0,
      netInvestmentIncomeTaxPercent: 3.8,
      holdingPeriodYears: 4,
      riskOfForfeitureProbabilityPercent: 10
    });
    expect(taxRes.netProjectedTaxSavingsUsd).toBeGreaterThan(0);
    expect(taxRes.recommendationDirective).toBe('strongly_recommended_file_83b');

    const createdMemo = await workforceTotalRewardsStudioRepository.generateBoardMemorandum({
      fiscalYear: 'FY2026',
      title: 'Global Workforce Total Rewards & Executive LTI Alignment Report'
    });
    expect(createdMemo.fiscalYear).toBe('FY2026');
    expect(createdMemo.status).toBe('draft');

    const sign1 = await workforceTotalRewardsStudioRepository.signOffBoardMemorandum(
      createdMemo.id,
      'chief_human_resources_officer'
    );
    expect(sign1.approvedByChroAt).toBeDefined();
    expect(sign1.status).toBe('under_review');

    const sign2 = await workforceTotalRewardsStudioRepository.signOffBoardMemorandum(
      createdMemo.id,
      'chief_financial_officer'
    );
    expect(sign2.approvedByCfoAt).toBeDefined();
    expect(sign2.status).toBe('under_review');

    const sign3 = await workforceTotalRewardsStudioRepository.signOffBoardMemorandum(
      createdMemo.id,
      'board_compensation_chair'
    );
    expect(sign3.approvedByCompChairAt).toBeDefined();
    expect(sign3.status).toBe('committee_approved');
  });
});
