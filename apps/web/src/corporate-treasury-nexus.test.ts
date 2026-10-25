import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateCashConversionCycle,
  calculateIntercompanyLoanInterest,
  calculateNotionalPoolArbitrage,
  calculateParametricFxVaR95,
  calculateHedgeEffectivenessRatio,
  calculateImpliedDefaultProbability,
  simulateBankBailInHaircut,
  calculateCompositeTrlsScore,
  generateTreasuryBoardMemorandumMarkdown,
  type CorporateTreasuryOverviewDTO,
  type BankCounterpartyDTO
} from './domain';
import { corporateTreasuryNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Corporate Treasury Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calculates Cash Conversion Cycle, Intercompany Loan Interest, and Notional Pool Arbitrage', () => {
    const ccc = calculateCashConversionCycle(18, 38, 45);
    expect(ccc.netCcc).toBe(11);
    expect(ccc.status).toBe('lean');

    const loan = calculateIntercompanyLoanInterest(5000000, 5.0, 30, 10.0);
    expect(loan.grossInterestUsd).toBe(20833.33);
    expect(loan.withholdingTaxUsd).toBe(2083.33);
    expect(loan.netInterestUsd).toBe(18750);

    const arb = calculateNotionalPoolArbitrage(25000000, 5000000, 3.5, 7.0, 4.5);
    expect(arb.standaloneNetEarnedUsd).toBe(525000);
    expect(arb.pooledNetEarnedUsd).toBe(900000);
    expect(arb.annualizedArbitrageUsd).toBe(375000);
  });

  it('calculates Parametric VaR-95 and Retrospective ASC 815 Hedge Effectiveness', () => {
    const vaR = calculateParametricFxVaR95(10000000, 0.008, 10);
    expect(vaR.var1Day95Usd).toBeGreaterThan(130000);
    expect(vaR.var10Day99Usd).toBeGreaterThan(580000);

    const effective = calculateHedgeEffectivenessRatio(95000, 100000);
    expect(effective.dollarOffsetRatioPercent).toBe(95);
    expect(effective.isAsc815Compliant).toBe(true);

    const ineffective = calculateHedgeEffectivenessRatio(40000, 100000);
    expect(ineffective.dollarOffsetRatioPercent).toBe(40);
    expect(ineffective.isAsc815Compliant).toBe(false);
  });

  it('computes market-implied default probability and simulates bank bail-in haircuts', () => {
    const pd = calculateImpliedDefaultProbability(52, 0.40);
    expect(pd).toBeGreaterThan(0.7);
    expect(pd).toBeLessThan(1.0);

    const bank: BankCounterpartyDTO = {
      id: 'bank-1',
      bankName: 'JPMorgan Chase & Co.',
      holdingGroup: 'JPMorgan Chase',
      jurisdiction: 'United States',
      spRating: 'AA_MINUS',
      moodysRating: 'AA',
      fitchRating: 'AA_MINUS',
      fiveYearCdsSpreadBps: 52,
      impliedDefaultProbabilityPercent: 0.86,
      baselLiquidityCoverageRatioPercent: 142,
      baselNetStableFundingRatioPercent: 126,
      tier1CommonEquityRatioPercent: 15.2,
      totalDepositsHeldUsd: 14200000,
      portfolioDepositorySharePercent: 29.3,
      boardApprovedExposureLimitUsd: 15000000,
      limitUtilizationPercent: 94.7,
      insuredDepositLimitUsd: 250000,
      uninsuredDepositsUsd: 13950000,
      simulatedHaircutLossUsd: 0
    };

    const res = simulateBankBailInHaircut(bank, 25);
    expect(res.stressedBankName).toBe('JPMorgan Chase & Co.');
    expect(res.uninsuredDepositsSubjectToHaircutUsd).toBe(13950000);
    expect(res.projectedHaircutLossUsd).toBe(3487500);
    expect(res.postStressAvailableLiquidityUsd).toBe(10712500);
    expect(res.contingentFundingRecommendation).toContain('CRITICAL');
  });

  it('computes composite TRLS score and generates SEC Item 305 markdown memorandum', () => {
    const trls = calculateCompositeTrlsScore({
      zbaSweepingEfficiency: 95,
      forecastAccuracyScore: 95,
      hedgeRatioPercent: 88,
      counterpartyConcentrationMax: 19,
      governanceSignoffRatio: 1.0
    });
    expect(trls.score).toBeGreaterThanOrEqual(90);
    expect(trls.band).toBe('sovereign_fortress');

    const dummyOverview: CorporateTreasuryOverviewDTO = {
      studioId: 'studio-test',
      enterpriseName: 'JobTrack Global Enterprise Holdings',
      lastUpdated: '2026-10-25T10:00:00Z',
      compositeTrlsScore: 89.4,
      trlsBand: 'defensible_stability',
      cashConcentration: {
        totalGlobalLiquidityUsd: 48500000,
        pooledNetBalanceUsd: 32000000,
        physicalSweptTodayUsd: 6200000,
        annualizedPoolingYieldArbitrageUsd: 142500,
        activeZbaCount: 5,
        activeNotionalPoolCount: 1,
        accounts: [],
        entities: []
      },
      cashForecast: {
        forecastWeeksCount: 13,
        forecastAccuracyScorePercent: 95.8,
        minimumProjectedRunwayMonths: 11.2,
        minimumOperationalBufferUsd: 8500000,
        precautionaryReserveUsd: 12000000,
        totalExcessDeployableLiquidityUsd: 28000000,
        workingCapitalCycle: {
          daysSalesOutstanding: 38,
          daysInventoryOutstanding: 18,
          daysPayableOutstanding: 45,
          netCashConversionCycleDays: 11,
          targetCashConversionCycleDays: 15,
          capitalTiedUpInWorkingCapitalUsd: 4200000,
          potentialInterestReleaseUsd: 185000
        },
        weeklyForecasts: []
      },
      fxHedging: {
        totalNetExposureUsd: 18945158,
        totalHedgedNotionalUsd: 15915367,
        weightedHedgeRatioPercent: 84.0,
        portfolio1DayVaR95Usd: 124500,
        portfolio10DayVaR99Usd: 550000,
        unrealizedMtmGainLossUsd: 42500,
        exposures: [],
        contracts: []
      },
      counterpartyRisk: {
        weightedAverageRating: 'AA_MINUS',
        totalUninsuredDepositsUsd: 26433300,
        maxSingleBankExposurePercent: 29.3,
        limitBreachCount: 0,
        counterparties: []
      }
    };

    const md = generateTreasuryBoardMemorandumMarkdown(dummyOverview, {
      fiscalQuarter: 'Q1-2026',
      title: 'Q1-2026 Board Financial Risk Review',
      stressTestScenarioIncluded: true
    });
    expect(md).toContain('Executive Treasury Committee & Board Financial Risk Memorandum');
    expect(md).toContain('Q1-2026');
    expect(md).toContain('89.4 / 100');
    expect(md).toContain('DEFENSIBLE STABILITY');
    expect(md).toContain('$48.50M USD');
  });

  it('exercises full repository lifecycle in demo mode with tripartite approvals', async () => {
    const overview = await corporateTreasuryNexusRepository.getOverview();
    expect(overview.compositeTrlsScore).toBe(89.4);
    expect(overview.cashConcentration.totalGlobalLiquidityUsd).toBe(48500000);
    expect(overview.cashConcentration.accounts.length).toBeGreaterThanOrEqual(6);
    expect(overview.cashForecast.weeklyForecasts.length).toBe(13);
    expect(overview.fxHedging.contracts.length).toBeGreaterThanOrEqual(4);
    expect(overview.counterpartyRisk.counterparties.length).toBeGreaterThanOrEqual(4);

    const sweep = await corporateTreasuryNexusRepository.executeCashSweep({ sweepMode: 'all_zba' });
    expect(sweep.sweptAccountsCount).toBeGreaterThan(0);
    expect(sweep.totalAmountSweptUsd).toBe(6200000);
    expect(sweep.annualizedArbitrageUsd).toBeGreaterThan(0);

    const ccc = await corporateTreasuryNexusRepository.simulateWorkingCapital({
      adjustedDso: 35,
      adjustedDpo: 50,
      adjustedDio: 16
    });
    expect(ccc.revisedCccDays).toBe(1);
    expect(ccc.freedWorkingCapitalUsd).toBeGreaterThan(0);
    expect(ccc.status).toBe('lean');

    const fx = await corporateTreasuryNexusRepository.simulateFxSensitivity({
      currencyPair: 'EUR/USD',
      shockPercentage: 10,
      holdingPeriodDays: 10,
      confidenceInterval: 0.95,
      hedgingCoverageAdjustmentPercent: 85
    });
    expect(fx.netVarianceReductionUsd).toBeGreaterThan(0);
    expect(fx.parametricVaRUsd).toBeGreaterThan(0);
    expect(fx.asc815CompliancePreserved).toBe(true);

    const targetBank = overview.counterpartyRisk.counterparties[0];
    const bailIn = await corporateTreasuryNexusRepository.simulateBailInStress({
      stressedBankId: targetBank.id,
      haircutLossPercentage: 25,
      sovereignSpreadShockBps: 100
    });
    expect(bailIn.stressedBankName).toBe(targetBank.bankName);
    expect(bailIn.projectedHaircutLossUsd).toBeGreaterThan(0);

    const memo = await corporateTreasuryNexusRepository.generateBoardMemo({
      fiscalQuarter: 'Q1-2026',
      title: 'Q1-2026 Global Corporate Treasury Strategy',
      stressTestScenarioIncluded: true
    });
    expect(memo.fiscalQuarter).toBe('Q1-2026');
    expect(memo.status).toBe('draft');

    const sign1 = await corporateTreasuryNexusRepository.signoffBoardMemo(memo.id, {
      role: 'corporate_treasurer',
      signerName: 'Alexandra Chen, CFA',
      comments: 'Certified operational cash reconciliations.'
    });
    expect(sign1.status).toBe('treasurer_certified');
    expect(sign1.signoffs.length).toBe(1);

    const sign2 = await corporateTreasuryNexusRepository.signoffBoardMemo(memo.id, {
      role: 'chief_financial_officer',
      signerName: 'Marcus Vance, CPA',
      comments: 'Approved liquidity buffers and FX hedging.'
    });
    expect(sign2.status).toBe('cfo_approved');
    expect(sign2.signoffs.length).toBe(2);

    const sign3 = await corporateTreasuryNexusRepository.signoffBoardMemo(memo.id, {
      role: 'board_audit_finance_chair',
      signerName: 'Dr. Eleanor Sterling',
      comments: 'Ratified fiduciary risk policies.'
    });
    expect(sign3.status).toBe('board_ratified');
    expect(sign3.signoffs.length).toBe(3);
  });
});
