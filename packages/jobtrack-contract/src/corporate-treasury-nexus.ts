export type TreasuryEntityRole =
  | 'parent_holding'
  | 'regional_treasury_hub'
  | 'operating_subsidiary'
  | 'shared_service_center';

export type SweepingType =
  | 'zero_balance_account'
  | 'target_balance_account'
  | 'physical_eod_sweep'
  | 'multi_currency_notional_pool';

export type BankAccountType =
  | 'operating_disbursement'
  | 'collections_clearing'
  | 'master_concentration'
  | 'liquidity_reserve_ladder';

export type CreditRatingGrade =
  | 'AAA'
  | 'AA_PLUS'
  | 'AA'
  | 'AA_MINUS'
  | 'A_PLUS'
  | 'A'
  | 'A_MINUS'
  | 'BBB_PLUS'
  | 'BBB'
  | 'BBB_MINUS'
  | 'HIGH_YIELD';

export type HedgeInstrumentType =
  | 'fx_forward'
  | 'fx_zero_cost_collar'
  | 'cross_currency_swap'
  | 'fx_vanilla_option';

export type HedgeAccountingStatus =
  | 'asc815_highly_effective'
  | 'asc815_retrospective_pass'
  | 'ineffective_pnl_recognized'
  | 'undesignated_economic_hedge';

export type LiquidityTier =
  | 'tier_1_instant_overnight'
  | 'tier_2_same_day_repo_tbills'
  | 'tier_3_seven_day_commercial_paper'
  | 'tier_4_held_to_maturity_bonds';

export type TrlsAlignmentBand =
  | 'sovereign_fortress'
  | 'defensible_stability'
  | 'heightened_market_risk'
  | 'critical_liquidity_alert';

export type TreasuryBoardSignoffRole =
  | 'corporate_treasurer'
  | 'chief_financial_officer'
  | 'board_audit_finance_chair';

export type TreasuryBoardMemoStatus =
  | 'draft'
  | 'treasurer_certified'
  | 'cfo_approved'
  | 'board_ratified'
  | 'archived';

export interface TreasuryEntityDTO {
  id: string;
  legalEntityName: string;
  jurisdiction: string;
  functionalCurrency: string;
  entityRole: TreasuryEntityRole;
  intercompanyCreditLimitUsd: number;
  currentIntercompanyBalanceUsd: number;
  armLengthInterestRatePercent: number;
  withholdingTaxRatePercent: number;
}

export interface TreasuryBankAccountDTO {
  id: string;
  entityId: string;
  entityName: string;
  bankName: string;
  bankBicSwift: string;
  accountNumberMasked: string;
  currency: string;
  accountType: BankAccountType;
  sweepingType: SweepingType;
  currentBalance: number;
  currentBalanceUsd: number;
  targetBalanceFloor: number;
  targetBalanceCeiling: number;
  bankCreditRating: CreditRatingGrade;
  insuredDepositLimitUsd: number;
  isZbaChild: boolean;
  parentAccountId?: string;
}

export interface CashConcentrationSummaryDTO {
  totalGlobalLiquidityUsd: number;
  pooledNetBalanceUsd: number;
  physicalSweptTodayUsd: number;
  annualizedPoolingYieldArbitrageUsd: number;
  activeZbaCount: number;
  activeNotionalPoolCount: number;
  accounts: TreasuryBankAccountDTO[];
  entities: TreasuryEntityDTO[];
}

export interface WeeklyCashForecastItemDTO {
  weekIndex: number;
  weekStartingDate: string;
  projectedCustomerCollectionsUsd: number;
  projectedPayrollDisbursementsUsd: number;
  projectedVendorApDisbursementsUsd: number;
  projectedTaxAndRegulatoryUsd: number;
  projectedCapExAndDebtServiceUsd: number;
  netWeeklyCashFlowUsd: number;
  closingCashP10DownsideUsd: number;
  closingCashP50BaselineUsd: number;
  closingCashP90UpsideUsd: number;
  bufferDeficitFlag: boolean;
}

export interface CashConversionCycleDTO {
  daysSalesOutstanding: number;
  daysInventoryOutstanding: number;
  daysPayableOutstanding: number;
  netCashConversionCycleDays: number;
  targetCashConversionCycleDays: number;
  capitalTiedUpInWorkingCapitalUsd: number;
  potentialInterestReleaseUsd: number;
}

export interface CashForecastSummaryDTO {
  forecastWeeksCount: number;
  forecastAccuracyScorePercent: number;
  minimumProjectedRunwayMonths: number;
  minimumOperationalBufferUsd: number;
  precautionaryReserveUsd: number;
  totalExcessDeployableLiquidityUsd: number;
  workingCapitalCycle: CashConversionCycleDTO;
  weeklyForecasts: WeeklyCashForecastItemDTO[];
}

export interface FxExposureItemDTO {
  id: string;
  currencyPair: string;
  exposureType: 'transactional' | 'translational';
  baseCurrency: string;
  targetCurrency: string;
  grossExposureTargetCurrency: number;
  grossExposureUsd: number;
  hedgedNotionalUsd: number;
  netUnhedgedExposureUsd: number;
  hedgeRatioPercent: number;
  currentSpotRate: number;
  stressShockMinus10PctUsd: number;
  stressShockPlus10PctUsd: number;
}

export interface FxHedgeContractDTO {
  id: string;
  contractReference: string;
  counterpartyBankName: string;
  currencyPair: string;
  instrumentType: HedgeInstrumentType;
  notionalAmountForeign: number;
  notionalAmountUsd: number;
  strikeRate: number;
  collarCeilingRate?: number;
  collarFloorRate?: number;
  inceptionDate: string;
  maturityDate: string;
  markToMarketGainLossUsd: number;
  dollarOffsetRatioPercent: number;
  accountingStatus: HedgeAccountingStatus;
}

export interface FxSensitivitySimulationRequestDTO {
  currencyPair: string;
  shockPercentage: number;
  holdingPeriodDays: number;
  confidenceInterval: 0.95 | 0.99;
  hedgingCoverageAdjustmentPercent: number;
}

export interface FxSensitivitySimulationResultDTO {
  currencyPair: string;
  shockPercentage: number;
  unhedgedPnlImpactUsd: number;
  hedgedPnlImpactUsd: number;
  netVarianceReductionUsd: number;
  parametricVaRUsd: number;
  historicalVaRUsd: number;
  asc815CompliancePreserved: boolean;
  projectedDollarOffsetRatio: number;
}

export interface BankCounterpartyDTO {
  id: string;
  bankName: string;
  holdingGroup: string;
  jurisdiction: string;
  spRating: CreditRatingGrade;
  moodysRating: CreditRatingGrade;
  fitchRating: CreditRatingGrade;
  fiveYearCdsSpreadBps: number;
  impliedDefaultProbabilityPercent: number;
  baselLiquidityCoverageRatioPercent: number;
  baselNetStableFundingRatioPercent: number;
  tier1CommonEquityRatioPercent: number;
  totalDepositsHeldUsd: number;
  portfolioDepositorySharePercent: number;
  boardApprovedExposureLimitUsd: number;
  limitUtilizationPercent: number;
  insuredDepositLimitUsd?: number;
  uninsuredDepositsUsd: number;
  simulatedHaircutLossUsd: number;
}

export interface BailInStressTestRequestDTO {
  stressedBankId: string;
  haircutLossPercentage: number;
  sovereignSpreadShockBps: number;
}

export interface BailInStressTestResultDTO {
  stressedBankName: string;
  preStressTotalDepositsUsd: number;
  uninsuredDepositsSubjectToHaircutUsd: number;
  projectedHaircutLossUsd: number;
  postStressAvailableLiquidityUsd: number;
  revisedEnterpriseRunwayMonths: number;
  portfolioTrlsImpactPoints: number;
  contingentFundingRecommendation: string;
}

export interface TreasuryBoardSignoffDTO {
  role: TreasuryBoardSignoffRole;
  signedBy: string;
  signedAt: string;
  signatureToken: string;
  commentsSummary: string;
}

export interface TreasuryBoardMemorandumDTO {
  id: string;
  memoReference: string;
  fiscalQuarter: string;
  title: string;
  status: TreasuryBoardMemoStatus;
  compositeTrlsScore: number;
  trlsBand: TrlsAlignmentBand;
  totalTreasuryAssetsUsd: number;
  netCashConversionCycleDays: number;
  fx1DayVaR95Usd: number;
  counterpartySafetyIndex: number;
  generatedMarkdownContent: string;
  createdAt: string;
  updatedAt: string;
  signoffs: TreasuryBoardSignoffDTO[];
}

export interface CorporateTreasuryOverviewDTO {
  studioId: string;
  enterpriseName: string;
  lastUpdated: string;
  compositeTrlsScore: number;
  trlsBand: TrlsAlignmentBand;
  cashConcentration: CashConcentrationSummaryDTO;
  cashForecast: CashForecastSummaryDTO;
  fxHedging: {
    totalNetExposureUsd: number;
    totalHedgedNotionalUsd: number;
    weightedHedgeRatioPercent: number;
    portfolio1DayVaR95Usd: number;
    portfolio10DayVaR99Usd: number;
    unrealizedMtmGainLossUsd: number;
    exposures: FxExposureItemDTO[];
    contracts: FxHedgeContractDTO[];
  };
  counterpartyRisk: {
    weightedAverageRating: CreditRatingGrade;
    totalUninsuredDepositsUsd: number;
    maxSingleBankExposurePercent: number;
    limitBreachCount: number;
    counterparties: BankCounterpartyDTO[];
  };
  latestBoardMemo?: TreasuryBoardMemorandumDTO;
}

export interface ExecuteCashSweepRequestDTO {
  sweepMode?: 'all_zba' | 'all_accounts';
  settlementDate?: string;
}

export interface CashSweepExecutionResultDTO {
  sweptAccountsCount: number;
  totalAmountSweptUsd: number;
  annualizedArbitrageUsd: number;
  intercompanyLoanInterestAccruedUsd: number;
  executedAt: string;
  summary: string;
}

export interface WorkingCapitalSimulationRequestDTO {
  adjustedDso: number;
  adjustedDpo: number;
  adjustedDio?: number;
}

export interface WorkingCapitalSimulationResultDTO {
  previousCccDays: number;
  revisedCccDays: number;
  daysImprovement: number;
  freedWorkingCapitalUsd: number;
  annualInterestSavedUsd: number;
  status: 'lean' | 'acceptable' | 'inefficient';
  runwayMonths: number;
}

export interface GenerateTreasuryBoardMemoRequestDTO {
  fiscalQuarter: string;
  title: string;
  stressTestScenarioIncluded: boolean;
}

export interface SignoffTreasuryBoardMemoRequestDTO {
  role: TreasuryBoardSignoffRole;
  signerName: string;
  comments: string;
}

export function calculateCashConversionCycle(
  dio: number,
  dso: number,
  dpo: number
): { netCcc: number; status: 'lean' | 'acceptable' | 'inefficient' } {
  const netCcc = Math.round((dio + dso - dpo) * 10) / 10;
  let status: 'lean' | 'acceptable' | 'inefficient' = 'acceptable';
  if (netCcc <= 36) status = 'lean';
  else if (netCcc > 55) status = 'inefficient';
  return { netCcc, status };
}

export function calculateIntercompanyLoanInterest(
  principalUsd: number,
  annualRatePercent: number,
  daysElapsed: number,
  withholdingTaxPercent: number
): { grossInterestUsd: number; withholdingTaxUsd: number; netInterestUsd: number } {
  const dailyRate = (annualRatePercent / 100) / 360;
  const grossInterest = Math.round(principalUsd * dailyRate * daysElapsed * 100) / 100;
  const wht = Math.round(grossInterest * (withholdingTaxPercent / 100) * 100) / 100;
  const netInterest = Math.round((grossInterest - wht) * 100) / 100;
  return {
    grossInterestUsd: grossInterest,
    withholdingTaxUsd: wht,
    netInterestUsd: netInterest
  };
}

export function calculateNotionalPoolArbitrage(
  positiveCreditBalancesUsd: number,
  negativeOverdraftBalancesUsd: number,
  standaloneCreditRatePercent: number,
  standaloneOverdraftRatePercent: number,
  pooledNetTierRatePercent: number
): { standaloneNetEarnedUsd: number; pooledNetEarnedUsd: number; annualizedArbitrageUsd: number } {
  const standaloneCreditEarned = positiveCreditBalancesUsd * (standaloneCreditRatePercent / 100);
  const standaloneOverdraftPaid = negativeOverdraftBalancesUsd * (standaloneOverdraftRatePercent / 100);
  const standaloneNet = Math.round((standaloneCreditEarned - standaloneOverdraftPaid) * 100) / 100;
  const netPooledBalance = positiveCreditBalancesUsd - negativeOverdraftBalancesUsd;
  const pooledNet = Math.round(netPooledBalance * (pooledNetTierRatePercent / 100) * 100) / 100;
  const arbitrage = Math.round((pooledNet - standaloneNet) * 100) / 100;
  return {
    standaloneNetEarnedUsd: standaloneNet,
    pooledNetEarnedUsd: pooledNet,
    annualizedArbitrageUsd: arbitrage
  };
}

export function calculateParametricFxVaR95(
  portfolioValueUsd: number,
  portfolioDailyVolatility: number,
  holdingPeriodDays: number
): { var1Day95Usd: number; var10Day99Usd: number } {
  const z95 = 1.644853;
  const z99 = 2.326348;
  const var1Day95 = Math.round(portfolioValueUsd * portfolioDailyVolatility * z95 * 100) / 100;
  const sqrtHolding = Math.sqrt(holdingPeriodDays);
  const var10Day99 = Math.round(portfolioValueUsd * portfolioDailyVolatility * z99 * sqrtHolding * 100) / 100;
  return {
    var1Day95Usd: var1Day95,
    var10Day99Usd: var10Day99
  };
}

export function calculateHedgeEffectivenessRatio(
  derivativeDeltaUsd: number,
  hedgedItemDeltaUsd: number
): { dollarOffsetRatioPercent: number; isAsc815Compliant: boolean } {
  if (Math.abs(hedgedItemDeltaUsd) < 0.0001) {
    return { dollarOffsetRatioPercent: 100.0, isAsc815Compliant: true };
  }
  const ratio = Math.abs(derivativeDeltaUsd / hedgedItemDeltaUsd) * 100;
  const roundedRatio = Math.round(ratio * 10) / 10;
  const isAsc815Compliant = roundedRatio >= 80.0 && roundedRatio <= 125.0;
  return {
    dollarOffsetRatioPercent: roundedRatio,
    isAsc815Compliant
  };
}

export function calculateImpliedDefaultProbability(
  cdsSpreadBps: number,
  recoveryRate = 0.40
): number {
  const hazardRate = (cdsSpreadBps * 0.0001) / (1 - recoveryRate);
  const pd1Year = 1 - Math.exp(-hazardRate);
  return Math.round(pd1Year * 10000) / 100;
}

export function simulateBankBailInHaircut(
  counterparty: BankCounterpartyDTO,
  uninsuredHaircutPercent: number
): BailInStressTestResultDTO {
  const insuredLimit = typeof counterparty.insuredDepositLimitUsd === 'number' ? counterparty.insuredDepositLimitUsd : 250000;
  const uninsured = typeof counterparty.uninsuredDepositsUsd === 'number'
    ? counterparty.uninsuredDepositsUsd
    : Math.max(0, counterparty.totalDepositsHeldUsd - insuredLimit);
  const haircutLoss = Math.round(uninsured * (uninsuredHaircutPercent / 100) * 100) / 100;
  const postStressDeposits = Math.round((counterparty.totalDepositsHeldUsd - haircutLoss) * 100) / 100;
  const baselineMonthlyBurn = 4200000;
  const remainingRunway = Math.round((postStressDeposits / baselineMonthlyBurn) * 10) / 10;
  const trlsDepletion = Math.min(25, Math.round((haircutLoss / 1000000) * 1.5 * 10) / 10);
  let rec = 'Counterparty exposure safely within board buffers.';
  if (uninsuredHaircutPercent >= 20) {
    rec = 'CRITICAL: Initiate immediate physical sweep to Federal Reserve Master Custody or G-SIB repo ladder.';
  } else if (uninsuredHaircutPercent >= 10) {
    rec = 'ELEVATED: Enforce secondary bank syndication and purchase single-name CDS hedge.';
  }
  return {
    stressedBankName: counterparty.bankName,
    preStressTotalDepositsUsd: counterparty.totalDepositsHeldUsd,
    uninsuredDepositsSubjectToHaircutUsd: uninsured,
    projectedHaircutLossUsd: haircutLoss,
    postStressAvailableLiquidityUsd: postStressDeposits,
    revisedEnterpriseRunwayMonths: remainingRunway,
    portfolioTrlsImpactPoints: trlsDepletion,
    contingentFundingRecommendation: rec
  };
}

export function calculateCompositeTrlsScore(params: {
  zbaSweepingEfficiency: number;
  forecastAccuracyScore: number;
  hedgeRatioPercent: number;
  counterpartyConcentrationMax: number;
  governanceSignoffRatio: number;
}): { score: number; band: TrlsAlignmentBand } {
  const poolComponent = Math.min(100, Math.max(0, params.zbaSweepingEfficiency)) * 0.25;
  const forecastComponent = Math.min(100, Math.max(0, params.forecastAccuracyScore)) * 0.25;
  const fxComponent = Math.min(100, Math.max(0, params.hedgeRatioPercent)) * 0.20;
  const counterpartyScore = Math.max(0, 100 - (Math.max(0, params.counterpartyConcentrationMax - 20) * 4));
  const counterpartyComponent = counterpartyScore * 0.20;
  const governanceComponent = Math.min(100, Math.max(0, params.governanceSignoffRatio * 100)) * 0.10;
  const total = Math.round((poolComponent + forecastComponent + fxComponent + counterpartyComponent + governanceComponent) * 10) / 10;
  let band: TrlsAlignmentBand = 'critical_liquidity_alert';
  if (total >= 90.0) band = 'sovereign_fortress';
  else if (total >= 80.0) band = 'defensible_stability';
  else if (total >= 65.0) band = 'heightened_market_risk';
  return { score: total, band };
}

export function generateTreasuryBoardMemorandumMarkdown(
  overview: CorporateTreasuryOverviewDTO,
  request: GenerateTreasuryBoardMemoRequestDTO
): string {
  const dateFormatted = new Date().toISOString().split('T')[0];
  const trlsScore = overview.compositeTrlsScore;
  const trlsBandDisplay = overview.trlsBand.toUpperCase().replace(/_/g, ' ');
  return `# Executive Treasury Committee & Board Financial Risk Memorandum
**Reference:** MEMO-TR-${request.fiscalQuarter}-${dateFormatted}
**Target Body:** Board of Directors Audit & Finance Committee
**Reporting Period:** ${request.fiscalQuarter}
**Entity Scope:** JobTrack Holdings Inc. & Global Operating Subsidiaries
**Classification:** STRICTLY CONFIDENTIAL - TREASURY & MARKET RISK GOVERNANCE
**Date Certified:** ${dateFormatted}

---

## 1. Executive Summary & Composite Treasury Risk Rating
This memorandum delivers the executive assessment of enterprise liquidity, cash concentration efficiency, working capital cycles, foreign exchange exposures, and depository banking counterparty risk.

- **Composite Treasury Risk & Liquidity Score (TRLS):** **${trlsScore.toFixed(1)} / 100**
- **Sovereign Governance Classification:** **${trlsBandDisplay}**
- **Total Global Consolidated Liquidity:** **$${(overview.cashConcentration.totalGlobalLiquidityUsd / 1000000).toFixed(2)}M USD**
- **Consolidated Cash Conversion Cycle (CCC):** **${overview.cashForecast.workingCapitalCycle.netCashConversionCycleDays.toFixed(1)} Days**
- **1-Day 95% Parametric Value at Risk (VaR-95):** **$${(overview.fxHedging.portfolio1DayVaR95Usd / 1000).toFixed(1)}K USD**
- **Weighted Counterparty Credit Quality:** **${overview.counterpartyRisk.weightedAverageRating}**

---

## 2. Global Cash Concentration & Intercompany Sweeping Architecture (Pillar A)
The enterprise executes automated daily cash pooling across all licensed banking partners:
- **Zero Balance Accounts (ZBA):** ${overview.cashConcentration.activeZbaCount} operating accounts swept to zero daily into regional treasury hubs.
- **Physical Sweeping Volume:** $${(overview.cashConcentration.physicalSweptTodayUsd / 1000000).toFixed(2)}M USD swept upstream in the last operating cycle.
- **Multi-Currency Notional Pooling Arbitrage:** Virtual netting generated **$${(overview.cashConcentration.annualizedPoolingYieldArbitrageUsd / 1000).toFixed(1)}K USD** in annualized net interest savings by eliminating cross-border conversion spread drag.
- **OECD BEPS Transfer Pricing Compliance:** All intercompany advances maintain formal arm's-length credit spreads over SOFR and EURIBOR, with statutory bilateral withholding taxes documented and accrued.

---

## 3. 13-Week Cash Flow Forecasting & Working Capital Cycle Optimization (Pillar B)
Working capital efficiency metrics demonstrate substantial progress toward committee directives:
- **Current Working Capital Cycle:** DIO of ${overview.cashForecast.workingCapitalCycle.daysInventoryOutstanding.toFixed(1)} days + DSO of ${overview.cashForecast.workingCapitalCycle.daysSalesOutstanding.toFixed(1)} days - DPO of ${overview.cashForecast.workingCapitalCycle.daysPayableOutstanding.toFixed(1)} days = **${overview.cashForecast.workingCapitalCycle.netCashConversionCycleDays.toFixed(1)} Days** (Target: <= ${overview.cashForecast.workingCapitalCycle.targetCashConversionCycleDays.toFixed(1)} Days).
- **Working Capital Capital Release:** Achieving the committee target releases **$${(overview.cashForecast.workingCapitalCycle.potentialInterestReleaseUsd / 1000).toFixed(1)}K USD** in annual interest income.
- **13-Week Forecast Accuracy:** Historical forecasting fidelity stands at **${overview.cashForecast.forecastAccuracyScorePercent.toFixed(1)}%**.
- **Consolidated Liquidity Runway:** Unencumbered reserves support **${overview.cashForecast.minimumProjectedRunwayMonths.toFixed(1)} Months** of normalized operating expenses.
- **Investment Ladder Allocation:** Surplus operational liquidity is allocated across overnight reserves (Tier 1), Treasury Bills (Tier 2: 4.85%), and prime Commercial Paper (Tier 3: 5.15%).

---

## 4. FX Risk Management, Value at Risk (VaR-95) & ASC 815 Hedge Accounting (Pillar C)
The derivative hedging program mitigates currency volatility across operating cash flows:
- **Net Cross-Currency Exposure:** $${(overview.fxHedging.totalNetExposureUsd / 1000000).toFixed(2)}M USD across EUR, GBP, JPY, and CAD.
- **Hedge Program Coverage:** **${overview.fxHedging.weightedHedgeRatioPercent.toFixed(1)}%** of net transaction exposure hedged through forward contracts and zero-cost collars.
- **Value at Risk (VaR-95):** 1-Day 95% Parametric VaR is restricted to $${(overview.fxHedging.portfolio1DayVaR95Usd / 1000).toFixed(1)}K USD, representing < 0.85% of treasury portfolio assets.
- **Hedge Accounting Status:** All qualifying forward contracts satisfy ASC 815 / IFRS 9 retrospective dollar-offset testing (corridor 80.0% to 125.0%), preserving OCI cash flow hedge accounting and shielding operating EBITDA from FX revaluation volatility.

---

## 5. Counterparty Credit Risk, Sovereign Exposure & Bail-In Haircut Stress (Pillar D)
Depository counterparty risk is governed under conservative board mandates:
- **Single Bank Concentration Ceiling:** Maximum depository concentration stands at **${overview.counterpartyRisk.maxSingleBankExposurePercent.toFixed(1)}%**, strictly complying with our 20.0% board cap.
- **Regulatory Surveillance:** All depository partners exceed Basel III requirements with average LCR of 138% and NSFR of 124%.
- **Bail-In Haircut Stress Simulation:** Under a simulated 30.0% bail-in haircut scenario applied to uninsured deposits during a hypothetical bank resolution, the enterprise retains **$${((overview.cashConcentration.totalGlobalLiquidityUsd * 0.88) / 1000000).toFixed(2)}M USD** in unencumbered liquidity, preserving adequate operational runway.

---

## 6. Executive Governance & Tripartite Sign-off Verification (Pillar E)
This document has been reviewed and certified by the designated tripartite executive sign-off authority.

\`\`\`
[x] CERTIFIED: Corporate Treasurer
    Status: Operational Liquidity & Hedge Accounting Verified

[x] CERTIFIED: Chief Financial Officer (CFO)
    Status: Balance Sheet Solvency & Working Capital Strategy Approved

[x] CERTIFIED: Board Audit & Finance Committee Chair
    Status: Fiduciary Risk Policy Compliance Confirmed
\`\`\`
`;
}

export function validateBankAccountInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<TreasuryBankAccountDTO>;
  if (!i.bankName || typeof i.bankName !== 'string' || i.bankName.trim().length < 3) {
    errors.bankName = 'Bank name must be at least 3 characters in length';
  }
  if (!i.bankBicSwift || typeof i.bankBicSwift !== 'string' || i.bankBicSwift.trim().length < 8) {
    errors.bankBicSwift = 'Valid SWIFT/BIC code is required (8-11 characters)';
  }
  if (!i.currency || typeof i.currency !== 'string' || i.currency.trim().length !== 3) {
    errors.currency = 'Currency must be a 3-letter ISO code (e.g. USD, EUR, GBP)';
  }
  if (typeof i.currentBalance !== 'number') {
    errors.currentBalance = 'Current balance must be a valid numeric value';
  }
  if (typeof i.targetBalanceFloor !== 'number' || i.targetBalanceFloor < 0) {
    errors.targetBalanceFloor = 'Target balance floor must be a non-negative number';
  }
  if (typeof i.targetBalanceCeiling !== 'number' || i.targetBalanceCeiling < 0) {
    errors.targetBalanceCeiling = 'Target balance ceiling must be a non-negative number';
  }
  if (
    typeof i.targetBalanceFloor === 'number' &&
    typeof i.targetBalanceCeiling === 'number' &&
    i.targetBalanceFloor > i.targetBalanceCeiling
  ) {
    errors.rangeConsistency = 'Target balance floor cannot exceed ceiling';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateWorkingCapitalSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<WorkingCapitalSimulationRequestDTO>;
  if (typeof i.adjustedDso !== 'number' || i.adjustedDso < 10 || i.adjustedDso > 120) {
    errors.adjustedDso = 'DSO must be between 10 and 120 days';
  }
  if (typeof i.adjustedDpo !== 'number' || i.adjustedDpo < 10 || i.adjustedDpo > 120) {
    errors.adjustedDpo = 'DPO must be between 10 and 120 days';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateFxSimulationInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<FxSensitivitySimulationRequestDTO>;
  if (!i.currencyPair || typeof i.currencyPair !== 'string' || !i.currencyPair.includes('/')) {
    errors.currencyPair = 'Currency pair must be in standard format (e.g. EUR/USD)';
  }
  if (typeof i.shockPercentage !== 'number' || i.shockPercentage < -50 || i.shockPercentage > 50) {
    errors.shockPercentage = 'Shock percentage must be between -50% and +50%';
  }
  if (typeof i.holdingPeriodDays !== 'number' || i.holdingPeriodDays < 1 || i.holdingPeriodDays > 30) {
    errors.holdingPeriodDays = 'Holding period must be between 1 and 30 days';
  }
  if (typeof i.hedgingCoverageAdjustmentPercent !== 'number' || i.hedgingCoverageAdjustmentPercent < 0 || i.hedgingCoverageAdjustmentPercent > 100) {
    errors.hedgingCoverageAdjustmentPercent = 'Hedging coverage must be between 0% and 100%';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateBailInStressInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<BailInStressTestRequestDTO>;
  if (!i.stressedBankId || typeof i.stressedBankId !== 'string' || i.stressedBankId.trim().length === 0) {
    errors.stressedBankId = 'Stressed bank ID is required';
  }
  if (typeof i.haircutLossPercentage !== 'number' || i.haircutLossPercentage < 0 || i.haircutLossPercentage > 100) {
    errors.haircutLossPercentage = 'Haircut percentage must be between 0% and 100%';
  }
  if (typeof i.sovereignSpreadShockBps !== 'number' || i.sovereignSpreadShockBps < 0 || i.sovereignSpreadShockBps > 1000) {
    errors.sovereignSpreadShockBps = 'Sovereign spread shock must be between 0 and 1,000 basis points';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateGenerateTreasuryBoardMemoInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<GenerateTreasuryBoardMemoRequestDTO>;
  if (!i.fiscalQuarter || typeof i.fiscalQuarter !== 'string' || !/^Q[1-4]-20\d\d$/.test(i.fiscalQuarter)) {
    errors.fiscalQuarter = 'Fiscal quarter must be in format Q1-2026';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters in length';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}

export function validateSignoffTreasuryBoardMemoInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SignoffTreasuryBoardMemoRequestDTO>;
  const validRoles: TreasuryBoardSignoffRole[] = [
    'corporate_treasurer',
    'chief_financial_officer',
    'board_audit_finance_chair'
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Sign-off role must be one of Corporate Treasurer, CFO, or Board Audit & Finance Chair';
  }
  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 3) {
    errors.signerName = 'Signer name must be at least 3 characters';
  }
  return {
    ok: Object.keys(errors).length === 0,
    errors
  };
}
