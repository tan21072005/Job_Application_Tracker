import type { ValidationResult } from './validators.ts';

export type SeverancePillarKey =
  | 'severance_agreement_auditor'
  | 'cic_equity_waterfall'
  | 'tax_280g_parachute_simulator'
  | 'good_reason_trigger_guard'
  | 'executive_counter_proposal';

export type TriggerMode =
  | 'none'
  | 'single_trigger'
  | 'double_trigger';

export type AccelerationExtent =
  | 'partial_50_percent'
  | 'full_100_percent';

export type ParachuteSettlementType =
  | 'full_payment'
  | 'hard_cutback'
  | 'best_net_valley_rule'
  | 'full_gross_up';

export type GoodReasonTriggerCategory =
  | 'diminution_of_duties'
  | 'base_salary_reduction'
  | 'forced_relocation'
  | 'reporting_line_demotion'
  | 'material_contract_breach';

export type GoodReasonStatus =
  | 'condition_identified'
  | 'formal_notice_served'
  | 'cure_period_active'
  | 'cured_by_company'
  | 'uncured_resignation_pending'
  | 'resignation_completed';

export type SeveranceGenerosityTier =
  | 'substandard'
  | 'market_standard'
  | 'executive_favorable'
  | 'institutional_gold';

export interface PreferredShareSeries {
  seriesName: string;
  investedAmountUsd: number;
  liquidationMultiple: number;
  isParticipating: boolean;
  participationCapUsd?: number;
}

export interface SeveranceAuditParams {
  annualBaseSalaryUsd: number;
  cashContinuationMonths: number;
  targetBonusPercentage: number;
  bonusProrationMode: 'target' | 'performance' | 'none';
  companyPerformanceMultiplier: number;
  daysWorkedInFiscalYear: number;
  monthlyCobraCostUsd: number;
  cobraSubsidizedMonths: number;
  cobraTaxGrossedUp: boolean;
  outplacementBudgetUsd: number;
  accruedPtoDays: number;
  statutoryPtoVestingMandated: boolean;
  unlimitedPtoForfeitureRisk: boolean;
  ptewMonths: number;
  optionsHeldCount: number;
  estimatedExerciseCostUsd: number;
}

export interface CicWaterfallParams {
  enterpriseValuationUsd: number;
  fundedDebtUsd: number;
  balanceSheetCashUsd: number;
  transactionFeePercent: number;
  escrowHoldbackPercent: number;
  preferredSharesStack: PreferredShareSeries[];
  totalFullyDilutedCommonShares: number;
  unvestedOptionsCount: number;
  unvestedOptionsStrikePriceUsd: number;
  unvestedRsuCount: number;
  vestedOptionsCount: number;
  vestedOptionsStrikePriceUsd: number;
  vestedRsuCount: number;
  triggerMode: TriggerMode;
  accelerationExtent: AccelerationExtent;
  cicProtectionWindowMonths: number;
}

export interface Tax280GParams {
  w2History5YearsUsd: number[];
  contingentCashSeveranceUsd: number;
  contingentBonusUsd: number;
  contingentEquityAccelerationUsd: number;
  contingentOtherBenefitsUsd: number;
  federalMarginalTaxRate: number;
  stateMarginalTaxRate: number;
  medicareMarginalTaxRate: number;
  corporateTaxRate: number;
  agreedSettlementType: ParachuteSettlementType;
}

export interface GoodReasonEventDTO {
  id: string;
  caseId: string;
  category: GoodReasonTriggerCategory;
  title: string;
  factualDescription: string;
  dateConditionOccurred: string;
  dateNoticeServed: string | null;
  curePeriodDeadline: string | null;
  status: GoodReasonStatus;
  evidenceUrls: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodReasonEventMutationDTO {
  category: GoodReasonTriggerCategory;
  title: string;
  factualDescription: string;
  dateConditionOccurred: string;
  dateNoticeServed?: string | null;
  status?: GoodReasonStatus;
  evidenceUrls?: string[];
  notes?: string;
}

export interface ExecutiveLeverageFactors {
  busFactorScore: number;
  keyPersonClosingCondition: boolean;
  teamFlightRiskScore: number;
  patentInventorshipCount: number;
  constructiveDischargeMeritScore: number;
}

export interface CounterProposalParams {
  requestedCashMonths: number;
  requestedBonusPercent: number;
  requestedCobraMonths: number;
  requestedPtewYears: number;
  requestedAccelerationExtent: AccelerationExtent;
  requestedLegalFeeAllowanceUsd: number;
  requireMutualRelease: boolean;
  requireMutualNonDisparagement: boolean;
  statutoryWhistleblowerCarveoutsConfirmed: boolean;
  leverageFactors: ExecutiveLeverageFactors;
}

export interface SeveranceAuditResultDTO {
  cashContinuationTotalUsd: number;
  prorataBonusTotalUsd: number;
  cobraBenefitTotalUsd: number;
  ptoPayoutTotalUsd: number;
  outplacementValueUsd: number;
  totalSeverancePackageValueUsd: number;
  ptewValueIndex: number;
  generosityScore: number;
  generosityTier: SeveranceGenerosityTier;
  marketPercentileRank: number;
  riskFindings: string[];
}

export interface CicWaterfallResultDTO {
  distributableEquityProceedsUsd: number;
  preferredLiquidationTotalUsd: number;
  commonEquityPoolUsd: number;
  commonSharePriceUsd: number;
  acceleratedOptionsCount: number;
  acceleratedRsuCount: number;
  acceleratedOptionsProceedsUsd: number;
  acceleratedRsuProceedsUsd: number;
  vestedEquityProceedsUsd: number;
  totalExecutiveGrossProceedsUsd: number;
  totalOptionExerciseCostUsd: number;
  executiveNetLiquidProceedsUsd: number;
}

export interface Tax280GResultDTO {
  historicalAverageBaseAmountUsd: number;
  safeHarborCeilingUsd: number;
  totalContingentParachutePaymentsUsd: number;
  isParachuteTaxTriggered: boolean;
  excessParachutePaymentUsd: number;
  exciseTax20PercentUsd: number;
  ordinaryIncomeTaxUsd: number;
  totalExecutiveTaxLiabilityUsd: number;
  companyLostDeductionPenaltyUsd: number;
  breakEvenCrossoverPointUsd: number;
  isInValleyOfDeath: boolean;
  netProceedsFullPaymentUsd: number;
  netProceedsHardCutbackUsd: number;
  recommendedSettlement: ParachuteSettlementType;
  optimalNetTakeHomeUsd: number;
  grossUpRequiredUsd: number;
}

export interface SeveranceCounterProposalDTO {
  id: string;
  caseId: string;
  leverageIndex: number;
  baselinePackageValueUsd: number;
  proposedPackageValueUsd: number;
  valueDeltaUsd: number;
  proposedCashMonths: number;
  proposedBonusPercent: number;
  proposedCobraMonths: number;
  proposedPtewYears: number;
  proposedAccelerationExtent: AccelerationExtent;
  legalFeeAllowanceUsd: number;
  memoMarkdown: string;
  mutualReleaseClauseText: string;
  nonDisparagementClauseText: string;
  status: 'draft' | 'presented' | 'negotiating' | 'settled' | 'litigation';
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveSeveranceCaseDTO {
  id: string;
  userId?: string;
  companyName: string;
  roleTitle: string;
  effectiveSeparationDate: string;
  severanceParams: SeveranceAuditParams;
  cicWaterfallParams: CicWaterfallParams;
  tax280GParams: Tax280GParams;
  counterProposalParams: CounterProposalParams;
  auditResult: SeveranceAuditResultDTO;
  cicResult: CicWaterfallResultDTO;
  tax280GResult: Tax280GResultDTO;
  goodReasonEvents: GoodReasonEventDTO[];
  counterProposals: SeveranceCounterProposalDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveSeveranceCaseMutationDTO {
  companyName: string;
  roleTitle: string;
  effectiveSeparationDate: string;
  severanceParams: SeveranceAuditParams;
  cicWaterfallParams: CicWaterfallParams;
  tax280GParams: Tax280GParams;
  counterProposalParams: CounterProposalParams;
}

export function computeSeveranceAudit(params: SeveranceAuditParams): SeveranceAuditResultDTO {
  const cashContinuation = (params.annualBaseSalaryUsd / 12) * params.cashContinuationMonths;
  
  let prorataBonus = 0;
  if (params.bonusProrationMode !== 'none') {
    const fractionOfYear = Math.min(1, Math.max(0, params.daysWorkedInFiscalYear / 365));
    const targetBonus = params.annualBaseSalaryUsd * (params.targetBonusPercentage / 100);
    if (params.bonusProrationMode === 'target') {
      prorataBonus = targetBonus * fractionOfYear;
    } else {
      prorataBonus = targetBonus * fractionOfYear * params.companyPerformanceMultiplier;
    }
  }

  let cobraTotal = params.monthlyCobraCostUsd * params.cobraSubsidizedMonths;
  if (params.cobraTaxGrossedUp) {
    cobraTotal = cobraTotal * 1.5;
  }

  let ptoTotal = 0;
  if (params.statutoryPtoVestingMandated) {
    const dailyRate = params.annualBaseSalaryUsd / 260;
    ptoTotal = params.accruedPtoDays * dailyRate;
  }

  const totalPackageValue = cashContinuation + prorataBonus + cobraTotal + ptoTotal + params.outplacementBudgetUsd;

  const ptewLog = Math.log(1 + (params.ptewMonths / 12));
  const maxPtewLog = Math.log(11);
  const ptewValueIndex = Math.min(100, Math.round((ptewLog / maxPtewLog) * 100));

  let cashScore = Math.min(100, (params.cashContinuationMonths / 18) * 100);
  let bonusScore = params.bonusProrationMode === 'target' ? 100 : params.bonusProrationMode === 'performance' ? 70 : 0;
  let cobraScore = Math.min(100, (params.cobraSubsidizedMonths / 18) * 100);
  let outScore = Math.min(100, (params.outplacementBudgetUsd / 25000) * 100);

  const generosityScore = Math.min(
    100,
    Math.round(
      cashScore * 0.35 +
      bonusScore * 0.20 +
      cobraScore * 0.15 +
      ptewValueIndex * 0.20 +
      outScore * 0.10
    )
  );

  let generosityTier: SeveranceGenerosityTier = 'substandard';
  let marketPercentileRank = 25;
  if (generosityScore >= 85) {
    generosityTier = 'institutional_gold';
    marketPercentileRank = 95;
  } else if (generosityScore >= 65) {
    generosityTier = 'executive_favorable';
    marketPercentileRank = 75;
  } else if (generosityScore >= 45) {
    generosityTier = 'market_standard';
    marketPercentileRank = 50;
  }

  const riskFindings: string[] = [];
  if (params.cashContinuationMonths < 12) {
    riskFindings.push(`Cash continuation of ${params.cashContinuationMonths} months falls below executive market standards (12-18 months).`);
  }
  if (params.bonusProrationMode === 'none') {
    riskFindings.push('Zero pro-rata annual bonus provided despite executive service during the active fiscal year.');
  }
  if (params.ptewMonths <= 3) {
    riskFindings.push('Standard 90-day PTEW cliff creates severe risk of vested equity forfeiture.');
  }
  if (params.unlimitedPtoForfeitureRisk) {
    riskFindings.push('Unlimited PTO policy may result in forfeiture of accrued leave compensation.');
  }
  if (params.cobraSubsidizedMonths < 6) {
    riskFindings.push('Inadequate medical continuation subsidy exposes executive family to steep COBRA out-of-pocket costs.');
  }

  return {
    cashContinuationTotalUsd: Math.round(cashContinuation),
    prorataBonusTotalUsd: Math.round(prorataBonus),
    cobraBenefitTotalUsd: Math.round(cobraTotal),
    ptoPayoutTotalUsd: Math.round(ptoTotal),
    outplacementValueUsd: Math.round(params.outplacementBudgetUsd),
    totalSeverancePackageValueUsd: Math.round(totalPackageValue),
    ptewValueIndex,
    generosityScore,
    generosityTier,
    marketPercentileRank,
    riskFindings
  };
}

export function computeCicWaterfall(params: CicWaterfallParams): CicWaterfallResultDTO {
  const transactionFee = params.enterpriseValuationUsd * (params.transactionFeePercent / 100);
  const netEnterpriseValue = params.enterpriseValuationUsd - params.fundedDebtUsd + params.balanceSheetCashUsd - transactionFee;
  const distributable = Math.max(0, netEnterpriseValue * (1 - (params.escrowHoldbackPercent / 100)));

  let preferredTotal = 0;
  for (const series of params.preferredSharesStack) {
    preferredTotal += series.investedAmountUsd * series.liquidationMultiple;
  }

  const commonPool = Math.max(0, distributable - preferredTotal);
  const sharePrice = params.totalFullyDilutedCommonShares > 0 ? commonPool / params.totalFullyDilutedCommonShares : 0;

  const shouldAccelerate = params.triggerMode !== 'none';
  const accelerationMultiplier = params.accelerationExtent === 'full_100_percent' ? 1.0 : 0.5;

  const accelOptions = shouldAccelerate ? Math.round(params.unvestedOptionsCount * accelerationMultiplier) : 0;
  const accelRsu = shouldAccelerate ? Math.round(params.unvestedRsuCount * accelerationMultiplier) : 0;

  const optionSpread = Math.max(0, sharePrice - params.unvestedOptionsStrikePriceUsd);
  const accelOptionsProceeds = accelOptions * optionSpread;
  const accelRsuProceeds = accelRsu * sharePrice;

  const vestedOptionSpread = Math.max(0, sharePrice - params.vestedOptionsStrikePriceUsd);
  const vestedOptionsProceeds = params.vestedOptionsCount * vestedOptionSpread;
  const vestedRsuProceeds = params.vestedRsuCount * sharePrice;
  const vestedEquityProceeds = vestedOptionsProceeds + vestedRsuProceeds;

  const totalGrossProceeds = accelOptionsProceeds + accelRsuProceeds + vestedEquityProceeds;
  const totalExerciseCost = (accelOptions * params.unvestedOptionsStrikePriceUsd) + (params.vestedOptionsCount * params.vestedOptionsStrikePriceUsd);
  const netLiquidProceeds = Math.max(0, totalGrossProceeds);

  return {
    distributableEquityProceedsUsd: Math.round(distributable),
    preferredLiquidationTotalUsd: Math.round(preferredTotal),
    commonEquityPoolUsd: Math.round(commonPool),
    commonSharePriceUsd: Number(sharePrice.toFixed(4)),
    acceleratedOptionsCount: accelOptions,
    acceleratedRsuCount: accelRsu,
    acceleratedOptionsProceedsUsd: Math.round(accelOptionsProceeds),
    acceleratedRsuProceedsUsd: Math.round(accelRsuProceeds),
    vestedEquityProceedsUsd: Math.round(vestedEquityProceeds),
    totalExecutiveGrossProceedsUsd: Math.round(totalGrossProceeds),
    totalOptionExerciseCostUsd: Math.round(totalExerciseCost),
    executiveNetLiquidProceedsUsd: Math.round(netLiquidProceeds)
  };
}

export function compute280GTax(params: Tax280GParams): Tax280GResultDTO {
  const history = params.w2History5YearsUsd.filter(x => x > 0);
  const baseAmount = history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : 0;
  const safeHarborCeiling = Number((baseAmount * 2.999).toFixed(2));
  const safeHarborThreshold = baseAmount * 3.0;

  const totalContingent = 
    params.contingentCashSeveranceUsd +
    params.contingentBonusUsd +
    params.contingentEquityAccelerationUsd +
    params.contingentOtherBenefitsUsd;

  const isTriggered = totalContingent >= safeHarborThreshold && baseAmount > 0;
  const excessParachute = isTriggered ? Math.max(0, totalContingent - baseAmount) : 0;
  const exciseTax = isTriggered ? excessParachute * 0.20 : 0;

  const totalOrdinaryRate = (params.federalMarginalTaxRate + params.stateMarginalTaxRate + params.medicareMarginalTaxRate) / 100;
  const ordinaryTax = totalContingent * totalOrdinaryRate;
  const totalTax = ordinaryTax + exciseTax;

  const denominator = 0.80 - totalOrdinaryRate;
  let crossoverPoint = 0;
  if (denominator > 0 && baseAmount > 0) {
    const numerator = 2.999 * (1 - totalOrdinaryRate) - 0.20;
    crossoverPoint = baseAmount * (numerator / denominator);
  }

  const isInValley = isTriggered && totalContingent < crossoverPoint;

  const netFullPayment = totalContingent * (1 - totalOrdinaryRate) - exciseTax;
  const cutbackPayment = Math.min(totalContingent, safeHarborCeiling);
  const netCutback = cutbackPayment * (1 - totalOrdinaryRate);

  let recommendedSettlement: ParachuteSettlementType = 'full_payment';
  let optimalNet = netFullPayment;

  if (isTriggered) {
    if (netCutback > netFullPayment) {
      recommendedSettlement = 'best_net_valley_rule';
      optimalNet = netCutback;
    } else {
      recommendedSettlement = 'full_payment';
      optimalNet = netFullPayment;
    }
  }

  let grossUpRequired = 0;
  const grossUpDenominator = 1 - totalOrdinaryRate - 0.20;
  if (isTriggered && grossUpDenominator > 0) {
    grossUpRequired = exciseTax / grossUpDenominator;
  }

  const companyPenalty = excessParachute * (params.corporateTaxRate / 100);

  return {
    historicalAverageBaseAmountUsd: Math.round(baseAmount),
    safeHarborCeilingUsd: Math.round(safeHarborCeiling),
    totalContingentParachutePaymentsUsd: Math.round(totalContingent),
    isParachuteTaxTriggered: isTriggered,
    excessParachutePaymentUsd: Math.round(excessParachute),
    exciseTax20PercentUsd: Math.round(exciseTax),
    ordinaryIncomeTaxUsd: Math.round(ordinaryTax),
    totalExecutiveTaxLiabilityUsd: Math.round(totalTax),
    companyLostDeductionPenaltyUsd: Math.round(companyPenalty),
    breakEvenCrossoverPointUsd: Math.round(crossoverPoint),
    isInValleyOfDeath: isInValley,
    netProceedsFullPaymentUsd: Math.round(netFullPayment),
    netProceedsHardCutbackUsd: Math.round(netCutback),
    recommendedSettlement,
    optimalNetTakeHomeUsd: Math.round(optimalNet),
    grossUpRequiredUsd: Math.round(grossUpRequired)
  };
}

export function computeExecutiveLeverageIndex(factors: ExecutiveLeverageFactors): number {
  const bus = Math.min(25, Math.max(0, factors.busFactorScore));
  const cic = factors.keyPersonClosingCondition ? 25 : 0;
  const flight = Math.min(20, Math.max(0, factors.teamFlightRiskScore));
  const ip = Math.min(15, factors.patentInventorshipCount * 5);
  const legal = Math.min(15, Math.max(0, factors.constructiveDischargeMeritScore));

  return Math.min(100, Math.round(bus + cic + flight + ip + legal));
}

export function generateExecutiveCounterMemoMarkdown(
  caseDTO: ExecutiveSeveranceCaseDTO,
  counter: CounterProposalParams,
  leverageIndex: number
): string {
  const audit = caseDTO.auditResult;
  const baselineValue = audit.totalSeverancePackageValueUsd;
  const monthlySalary = caseDTO.severanceParams.annualBaseSalaryUsd / 12;
  const proposedCash = monthlySalary * counter.requestedCashMonths;
  const proposedBonus = caseDTO.severanceParams.annualBaseSalaryUsd * (counter.requestedBonusPercent / 100);
  const proposedCobra = caseDTO.severanceParams.monthlyCobraCostUsd * counter.requestedCobraMonths;
  const totalProposed = proposedCash + proposedBonus + proposedCobra + counter.requestedLegalFeeAllowanceUsd;

  return `# CONFIDENTIAL EXECUTIVE SEPARATION MEMORANDUM
**TO:** Board of Directors / Compensation Committee / Deal Sponsor  
**FROM:** Executive Leadership Counsel on behalf of ${caseDTO.roleTitle}  
**DATE:** ${caseDTO.effectiveSeparationDate}  
**RE:** Comprehensive Separation Agreement & Transition Terms (${caseDTO.companyName})

---

### 1. Executive Summary & Strategic Context
This memorandum outlines the structured counter-proposal regarding the departure of the ${caseDTO.roleTitle} from ${caseDTO.companyName}. In light of the critical technological dependencies, pending strategic corporate transactions, and documented institutional contributions, the terms below establish an equitable resolution ensuring mutual finality, operational stability, and orderly IP transfer.

- **Assessed Candidate Leverage Index:** ${leverageIndex} / 100
- **Baseline Offer Valuation:** $${baselineValue.toLocaleString()}
- **Restructured Separation Value:** $${totalProposed.toLocaleString()}

---

### 2. Economic Restructuring Terms

| Term Pillar | Employer Baseline | Executive Counter-Proposal | Legal / Business Justification |
| :--- | :--- | :--- | :--- |
| **Cash Salary Continuation** | ${caseDTO.severanceParams.cashContinuationMonths} Months | ${counter.requestedCashMonths} Months | Matches 90th percentile VP/C-Suite market benchmarks. |
| **Annual Bonus** | ${caseDTO.severanceParams.targetBonusPercentage}% Pro-Rata | ${counter.requestedBonusPercent}% Guaranteed Target | Reflects full contribution to fiscal year roadmap milestones. |
| **COBRA Continuation** | ${caseDTO.severanceParams.cobraSubsidizedMonths} Months | ${counter.requestedCobraMonths} Months | 100% employer-subsidized medical, dental, and vision coverage. |
| **PTEW Option Window** | ${caseDTO.severanceParams.ptewMonths} Months (90-day cliff) | ${counter.requestedPtewYears} Years | Prevents inequitable forfeiture of earned option equity. |
| **Equity Acceleration** | ${caseDTO.cicWaterfallParams.accelerationExtent === 'full_100_percent' ? '100%' : '50%'} | ${counter.requestedAccelerationExtent === 'full_100_percent' ? '100% Full Acceleration' : '50% Acceleration'} | Reflects key role in enterprise value creation. |
| **Legal Fee Allowance** | $0 | $${counter.requestedLegalFeeAllowanceUsd.toLocaleString()} | Direct corporate reimbursement of executive employment counsel. |

---

### 3. Bilateral Governance & Mutual Protection Covenants

#### 3.1 Mutual General Release of Claims
The release of claims shall be strictly bilateral. The Company shall release Executive from any and all known or unknown claims arising prior to the Effective Date, excepting only intentional criminal fraud.

#### 3.2 Mutual Non-Disparagement & Reference Protocol
The non-disparagement obligation shall bind the Company's Executive Officers and Board Members. The Company shall provide an agreed-upon Letter of Reference confirming tenure, executive title, and exemplary service.

#### 3.3 Statutory Whistleblower & DTSA Immunity Carve-Outs
Nothing in this Agreement restricts Executive from communicating directly with the SEC, EEOC, NLRB, or law enforcement regarding potential statutory violations, nor does it impede whistleblower rights under SEC Rule 21F-17 or Defend Trade Secrets Act immunity (18 U.S.C. §1833(b)).

---

### 4. Conclusion
Execution of the restructured separation agreement will secure immediate operational continuity, complete IP assignment perfection, and a graceful executive transition. Counsel is prepared to finalize definitive documentation upon confirmation of these core economic parameters.`;
}

export function validateSeveranceCaseInput(raw: unknown): ValidationResult<ExecutiveSeveranceCaseMutationDTO> {
  if (typeof raw !== 'object' || raw === null) {
    return {
      ok: false,
      message: 'Invalid payload: must be an object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof d.companyName !== 'string' || !d.companyName.trim()) {
    errors.companyName = 'Company name is required';
  }
  if (typeof d.roleTitle !== 'string' || !d.roleTitle.trim()) {
    errors.roleTitle = 'Role title is required';
  }
  if (typeof d.effectiveSeparationDate !== 'string' || !d.effectiveSeparationDate.trim()) {
    errors.effectiveSeparationDate = 'Effective separation date is required';
  }
  if (typeof d.severanceParams !== 'object' || d.severanceParams === null) {
    errors.severanceParams = 'Severance parameters object is required';
  }
  if (typeof d.cicWaterfallParams !== 'object' || d.cicWaterfallParams === null) {
    errors.cicWaterfallParams = 'CIC waterfall parameters object is required';
  }
  if (typeof d.tax280GParams !== 'object' || d.tax280GParams === null) {
    errors.tax280GParams = 'Tax 280G parameters object is required';
  }
  if (typeof d.counterProposalParams !== 'object' || d.counterProposalParams === null) {
    errors.counterProposalParams = 'Counter proposal parameters object is required';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Validation failed for severance case', errors };
  }

  return {
    ok: true,
    data: {
      companyName: String(d.companyName).trim(),
      roleTitle: String(d.roleTitle).trim(),
      effectiveSeparationDate: String(d.effectiveSeparationDate).trim(),
      severanceParams: d.severanceParams as SeveranceAuditParams,
      cicWaterfallParams: d.cicWaterfallParams as CicWaterfallParams,
      tax280GParams: d.tax280GParams as Tax280GParams,
      counterProposalParams: d.counterProposalParams as CounterProposalParams
    }
  };
}

export function validateGoodReasonEventInput(raw: unknown): ValidationResult<GoodReasonEventMutationDTO> {
  if (typeof raw !== 'object' || raw === null) {
    return {
      ok: false,
      message: 'Invalid payload: must be an object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validCategories: GoodReasonTriggerCategory[] = [
    'diminution_of_duties',
    'base_salary_reduction',
    'forced_relocation',
    'reporting_line_demotion',
    'material_contract_breach'
  ];

  if (!validCategories.includes(d.category as GoodReasonTriggerCategory)) {
    errors.category = `Invalid category. Must be one of: ${validCategories.join(', ')}`;
  }
  if (typeof d.title !== 'string' || !d.title.trim()) {
    errors.title = 'Title is required';
  }
  if (typeof d.factualDescription !== 'string' || !d.factualDescription.trim()) {
    errors.factualDescription = 'Factual description is required';
  }
  if (typeof d.dateConditionOccurred !== 'string' || !d.dateConditionOccurred.trim()) {
    errors.dateConditionOccurred = 'Date condition occurred is required';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Validation failed for good reason event', errors };
  }

  return {
    ok: true,
    data: {
      category: d.category as GoodReasonTriggerCategory,
      title: String(d.title).trim(),
      factualDescription: String(d.factualDescription).trim(),
      dateConditionOccurred: String(d.dateConditionOccurred).trim(),
      dateNoticeServed: typeof d.dateNoticeServed === 'string' ? d.dateNoticeServed.trim() : null,
      status: (d.status as GoodReasonStatus) || 'condition_identified',
      evidenceUrls: Array.isArray(d.evidenceUrls) ? d.evidenceUrls.map(String) : [],
      notes: typeof d.notes === 'string' ? d.notes.trim() : ''
    }
  };
}
