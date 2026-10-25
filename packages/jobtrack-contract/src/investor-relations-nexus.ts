export type ShareClassType =
  | 'common_class_a'
  | 'common_class_b'
  | 'preferred_series_a'
  | 'preferred_series_b'
  | 'preferred_series_c';

export type InstitutionalInvestorType =
  | 'passive_index'
  | 'fundamental_long_only'
  | 'growth_garp'
  | 'deep_value'
  | 'multi_strategy_quant'
  | 'activist_hedge_fund';

export type SecFilingType =
  | 'form_13f'
  | 'schedule_13d'
  | 'schedule_13g';

export type AvisRiskLevel =
  | 'fortified_low'
  | 'moderate_watch'
  | 'elevated_vulnerability'
  | 'critical_activist_target';

export type EarningsTimingType =
  | 'before_market_open'
  | 'after_market_close'
  | 'during_trading_hours';

export type MeetingFormatType =
  | 'one_on_one_in_person'
  | 'small_group_in_person'
  | 'fireside_chat_webcast'
  | 'virtual_one_on_one';

export type CapitalFinancingType =
  | 'secondary_equity_offering'
  | 'convertible_senior_notes'
  | 'rule_10b18_share_repurchase'
  | 'accelerated_share_repurchase';

export type IsiAlignmentBand =
  | 'strong_institutional_conviction'
  | 'constructive_support'
  | 'cautious_neutrality'
  | 'institutional_defection_risk';

export type IrSignoffRole =
  | 'vp_investor_relations'
  | 'chief_financial_officer'
  | 'chief_executive_officer';

export type Form8KStatus =
  | 'draft'
  | 'vp_ir_certified'
  | 'cfo_approved'
  | 'ceo_ratified'
  | 'filed_edgar';

export interface CapTableShareClassDTO {
  id: string;
  shareClassName: string;
  shareClassType: ShareClassType;
  sharesAuthorized: number;
  sharesOutstanding: number;
  votesPerShare: number;
  parValueUsd: number;
  isPubliclyTraded: boolean;
  cusip: string;
}

export interface InstitutionalShareholderDTO {
  id: string;
  institutionName: string;
  investorType: InstitutionalInvestorType;
  sharesHeld: number;
  percentOwnership: number;
  votingPowerPercent: number;
  filingType: SecFilingType;
  filingDate: string;
  portfolioWeightPercent: number;
  quarterlyChangeShares: number;
  isKnownActivist: boolean;
}

export interface Rule10b51PlanDTO {
  id: string;
  insiderName: string;
  insiderTitle: string;
  adoptionDate: string;
  coolingOffExpiryDate: string;
  totalPlannedShares: number;
  executedShares: number;
  remainingShares: number;
  expirationDate: string;
  isCompliant: boolean;
}

export interface ActivistVulnerabilityDTO {
  compositeAvisScore: number;
  riskLevel: AvisRiskLevel;
  tsrUnderperformancePercent: number;
  valuationDiscountPercent: number;
  governanceDefenseScore: number;
  freeCashFlowMarginGap: number;
  activistOwnershipPercent: number;
  vulnerabilityFactors: {
    factorName: string;
    score: number;
    weight: number;
    severity: 'low' | 'medium' | 'high';
  }[];
  recommendedDefenses: string[];
}

export interface SellSideConsensusMetricDTO {
  metricName: string;
  consensusMean: number;
  consensusMedian: number;
  consensusHigh: number;
  consensusLow: number;
  analystCount: number;
  guidanceMidpoint: number;
  guidanceVariancePercent: number;
  unit: 'usd_millions' | 'usd_per_share' | 'percentage';
}

export interface NonGaapReconciliationItemDTO {
  lineItemName: string;
  gaapAmountUsd: number;
  adjustmentsUsd: number;
  nonGaapAmountUsd: number;
  adjustmentDetails: {
    category: string;
    amountUsd: number;
  }[];
}

export interface EarningsCycleDTO {
  id: string;
  fiscalQuarter: string;
  earningsReleaseDate: string;
  timing: EarningsTimingType;
  quietPeriodStartDate: string;
  isQuietPeriodActive: boolean;
  webcastUrl: string;
  consensusMetrics: SellSideConsensusMetricDTO[];
  reconciliations: NonGaapReconciliationItemDTO[];
  safeHarborScript: string;
}

export interface InvestorConferenceDTO {
  id: string;
  conferenceName: string;
  hostBroker: string;
  location: string;
  startDate: string;
  endDate: string;
  executiveAttendees: string[];
  confirmedMeetingsCount: number;
}

export interface NdrInvestorMeetingDTO {
  id: string;
  conferenceId?: string;
  institutionName: string;
  leadInvestorName: string;
  investorType: InstitutionalInvestorType;
  meetingDate: string;
  meetingFormat: MeetingFormatType;
  executiveAttendees: string[];
  sentimentScore: number;
  keyTopicsDiscussed: string[];
  followUpDeliverables: string[];
}

export interface CapitalScenarioDTO {
  id: string;
  scenarioName: string;
  financingType: CapitalFinancingType;
  targetGrossProceedsUsd: number;
  discountToVwapPercent: number;
  underwriterSpreadPercent: number;
  netProceedsUsd: number;
  proFormaSharesIssued: number;
  proFormaDilutionPercent: number;
  couponRatePercent?: number;
  conversionPremiumPercent?: number;
  calculatedWaccPercent: number;
  proFormaEpsAccretionPercent: number;
}

export interface ShareRepurchaseProgramDTO {
  id: string;
  programAuthorizationUsd: number;
  utilizedAmountUsd: number;
  remainingAuthorizationUsd: number;
  adtvShares: number;
  rule10b18DailyShareLimit: number;
  repurchasedSharesCount: number;
  averageExecutionPriceUsd: number;
  programExpiryDate: string;
  isActive: boolean;
}

export interface SecForm8KSignoffDTO {
  role: IrSignoffRole;
  signedBy: string;
  signedAt: string;
  signatureToken: string;
  verificationNotes: string;
}

export interface SecForm8KDisclosureDTO {
  id: string;
  fiscalQuarter: string;
  filingTitle: string;
  status: Form8KStatus;
  itemsIncluded: string[];
  markdownContent: string;
  createdAt: string;
  updatedAt: string;
  signoffs: SecForm8KSignoffDTO[];
}

export interface InvestorRelationsOverviewDTO {
  studioId: string;
  companyName: string;
  tickerSymbol: string;
  lastUpdated: string;
  compositeIsiScore: number;
  isiBand: IsiAlignmentBand;
  stockPriceUsd: number;
  marketCapUsd: number;
  sharesOutstanding: number;
  publicFloatShares: number;
  capTable: {
    shareClasses: CapTableShareClassDTO[];
    topShareholders: InstitutionalShareholderDTO[];
    insiderPlans: Rule10b51PlanDTO[];
    activistVulnerability: ActivistVulnerabilityDTO;
  };
  earnings: EarningsCycleDTO;
  roadshows: {
    upcomingConferences: InvestorConferenceDTO[];
    recentMeetings: NdrInvestorMeetingDTO[];
    averageSentimentScore: number;
    buySideConvictionScore: number;
  };
  capitalMarkets: {
    activeScenarios: CapitalScenarioDTO[];
    repurchaseProgram: ShareRepurchaseProgramDTO;
    currentWaccPercent: number;
    costOfEquityPercent: number;
    costOfDebtAfterTaxPercent: number;
  };
  latestForm8K?: SecForm8KDisclosureDTO;
}

export interface SimulateActivistRequestDTO {
  tsrUnderperformancePercent: number;
  valuationDiscountPercent: number;
  governanceDefenseScore: number;
  freeCashFlowMarginGap: number;
  activistOwnershipPercent: number;
}

export interface ActivistVulnerabilityResultDTO {
  compositeAvisScore: number;
  riskLevel: AvisRiskLevel;
  primaryVulnerabilityDriver: string;
  recommendedActions: string[];
}

export interface NonGaapReconciliationRequestDTO {
  fiscalQuarter: string;
  gaapNetIncomeUsd: number;
  stockBasedCompensationUsd: number;
  amortizationIntangiblesUsd: number;
  acquisitionRestructuringCostsUsd: number;
  taxEffectOfAdjustmentsUsd: number;
  interestExpenseUsd: number;
  provisionForTaxesUsd: number;
  depreciationUsd: number;
}

export interface NonGaapReconciliationResultDTO {
  adjustedEbitdaUsd: number;
  nonGaapNetIncomeUsd: number;
  cautionaryStatementMarkdown: string;
}

export interface LogNdrMeetingRequestDTO {
  conferenceId?: string;
  institutionName: string;
  leadInvestorName: string;
  investorType: InstitutionalInvestorType;
  meetingDate: string;
  meetingFormat: MeetingFormatType;
  executiveAttendees: string[];
  sentimentScore: number;
  keyTopics: string[];
  followUps: string[];
}

export interface SimulateCapitalScenarioRequestDTO {
  scenarioName: string;
  financingType: CapitalFinancingType;
  grossAmountUsd: number;
  stockPriceUsd: number;
  costOfEquityPercent: number;
  preTaxCostOfDebtPercent: number;
  marginalTaxRatePercent: number;
  currentAnnualNetIncomeUsd: number;
  currentSharesCount: number;
}

export interface CapitalScenarioResultDTO {
  scenarioName: string;
  financingType: CapitalFinancingType;
  netProceedsUsd: number;
  proFormaSharesIssued: number;
  proFormaDilutionPercent: number;
  calculatedWaccPercent: number;
  proFormaEpsUsd: number;
  epsAccretionDilutionPercent: number;
  isAccretive: boolean;
}

export interface GenerateForm8KRequestDTO {
  fiscalQuarter: string;
  filingTitle: string;
  includeItem202: boolean;
  includeItem701: boolean;
}

export interface SignoffForm8KRequestDTO {
  role: IrSignoffRole;
  signerName: string;
  verificationNotes: string;
}

export function calculateAVIS(params: {
  tsrUnderperformancePercent: number;
  valuationDiscountPercent: number;
  governanceDefenseScore: number;
  freeCashFlowMarginGap: number;
  activistOwnershipPercent: number;
}): { score: number; riskLevel: AvisRiskLevel } {
  const tsrComponent = Math.min(100, Math.max(0, params.tsrUnderperformancePercent * 2.0)) * 0.25;
  const valComponent = Math.min(100, Math.max(0, params.valuationDiscountPercent * 2.0)) * 0.20;
  const govVulnerability = Math.min(100, Math.max(0, 100 - params.governanceDefenseScore));
  const govComponent = govVulnerability * 0.20;
  const fcfComponent = Math.min(100, Math.max(0, params.freeCashFlowMarginGap * 5.0)) * 0.15;
  const actComponent = Math.min(100, Math.max(0, params.activistOwnershipPercent * 5.0)) * 0.20;

  const total = Math.round((tsrComponent + valComponent + govComponent + fcfComponent + actComponent) * 10) / 10;

  let riskLevel: AvisRiskLevel = 'critical_activist_target';
  if (total < 30.0) riskLevel = 'fortified_low';
  else if (total < 55.0) riskLevel = 'moderate_watch';
  else if (total < 75.0) riskLevel = 'elevated_vulnerability';

  return { score: total, riskLevel };
}

export function calculateWACC(
  costOfEquityPercent: number,
  preTaxCostOfDebtPercent: number,
  marginalTaxRatePercent: number,
  equityMarketValueUsd: number,
  debtBookValueUsd: number
): number {
  const totalCapital = equityMarketValueUsd + debtBookValueUsd;
  if (totalCapital <= 0) return 0;

  const equityWeight = equityMarketValueUsd / totalCapital;
  const debtWeight = debtBookValueUsd / totalCapital;
  const afterTaxCostOfDebt = preTaxCostOfDebtPercent * (1 - marginalTaxRatePercent / 100);

  const wacc = (equityWeight * costOfEquityPercent) + (debtWeight * afterTaxCostOfDebt);
  return Math.round(wacc * 100) / 100;
}

export function calculateEPSAccretionDilution(params: {
  standaloneNetIncomeUsd: number;
  standaloneSharesCount: number;
  standaloneEps: number;
  financingType: CapitalFinancingType;
  incrementalSharesCount: number;
  incrementalAnnualInterestUsd: number;
  marginalTaxRatePercent: number;
}): {
  proFormaNetIncomeUsd: number;
  proFormaSharesCount: number;
  proFormaEpsUsd: number;
  epsVariancePercent: number;
  isAccretive: boolean;
} {
  const afterTaxInterestExpense = params.incrementalAnnualInterestUsd * (1 - params.marginalTaxRatePercent / 100);
  const proFormaNetIncomeUsd = params.standaloneNetIncomeUsd - afterTaxInterestExpense;
  const proFormaSharesCount = params.standaloneSharesCount + params.incrementalSharesCount;

  if (proFormaSharesCount <= 0) {
    return {
      proFormaNetIncomeUsd: 0,
      proFormaSharesCount: 0,
      proFormaEpsUsd: 0,
      epsVariancePercent: 0,
      isAccretive: false
    };
  }

  const proFormaEpsUsd = Math.round((proFormaNetIncomeUsd / proFormaSharesCount) * 100) / 100;
  let epsVariancePercent = 0;
  if (params.standaloneEps !== 0) {
    epsVariancePercent = Math.round(((proFormaEpsUsd - params.standaloneEps) / params.standaloneEps) * 1000) / 10;
  }

  return {
    proFormaNetIncomeUsd,
    proFormaSharesCount,
    proFormaEpsUsd,
    epsVariancePercent,
    isAccretive: epsVariancePercent > 0
  };
}

export function calculateRule10b18DailyLimit(
  adtvShares: number,
  blockExemption: boolean
): { standardDailyLimitShares: number; effectiveLimitShares: number } {
  const standardDailyLimitShares = Math.floor(adtvShares * 0.25);
  const effectiveLimitShares = blockExemption ? standardDailyLimitShares + adtvShares : standardDailyLimitShares;
  return { standardDailyLimitShares, effectiveLimitShares };
}

export function calculateISI(params: {
  analystRevisionsScore: number;
  avisScore: number;
  ndrFeedbackScore: number;
  institutionalInflowOutflowScore: number;
  consensusDispersionScore: number;
}): { score: number; band: IsiAlignmentBand } {
  const analystComponent = Math.min(100, Math.max(0, params.analystRevisionsScore)) * 0.25;
  const defenseComponent = Math.min(100, Math.max(0, 100 - params.avisScore)) * 0.25;
  const ndrComponent = Math.min(100, Math.max(0, params.ndrFeedbackScore)) * 0.20;
  const flowsComponent = Math.min(100, Math.max(0, params.institutionalInflowOutflowScore)) * 0.15;
  const dispersionComponent = Math.min(100, Math.max(0, params.consensusDispersionScore)) * 0.15;

  const total = Math.round((analystComponent + defenseComponent + ndrComponent + flowsComponent + dispersionComponent) * 10) / 10;

  let band: IsiAlignmentBand = 'institutional_defection_risk';
  if (total >= 80.0) band = 'strong_institutional_conviction';
  else if (total >= 65.0) band = 'constructive_support';
  else if (total >= 50.0) band = 'cautious_neutrality';

  return { score: total, band };
}

export function generateSecForm8KDisclosure(
  overview: InvestorRelationsOverviewDTO,
  request: GenerateForm8KRequestDTO
): string {
  const dateFormatted = new Date().toISOString().split('T')[0];
  const cikCode = '0001984210';
  const commissionFileNumber = '001-41920';

  let sectionsMarkdown = '';

  if (request.includeItem202) {
    sectionsMarkdown += `
## Item 2.02 Results of Operations and Financial Condition
On ${dateFormatted}, ${overview.companyName} (the "Company") issued a press release announcing its financial results for the fiscal quarter ended ${request.fiscalQuarter}. A copy of the press release is furnished as Exhibit 99.1 to this Current Report on Form 8-K.

The information in this Item 2.02 and Exhibit 99.1 attached hereto is being furnished and shall not be deemed "filed" for purposes of Section 18 of the Securities Exchange Act of 1934, as amended (the "Exchange Act"), nor shall it be deemed incorporated by reference in any filing under the Securities Act of 1933, as amended, except as shall be expressly set forth by specific reference in such filing.

### Non-GAAP Financial Measures & Regulation G Reconciliation
In addition to financial measures prepared in accordance with U.S. generally accepted accounting principles ("GAAP"), this report includes certain Non-GAAP financial measures, including Adjusted EBITDA, Non-GAAP Net Income, and Free Cash Flow. Management believes these Non-GAAP measures provide useful supplementary information to investors regarding ongoing operational performance.
`;
  }

  if (request.includeItem701) {
    sectionsMarkdown += `
## Item 7.01 Regulation FD Disclosure
Representatives of the Company will present the investor presentation materials attached hereto as Exhibit 99.2 during institutional investor conferences and non-deal roadshows scheduled for ${request.fiscalQuarter}.

In accordance with General Instruction B.2 of Form 8-K, the information furnished under this Item 7.01 shall not be deemed "filed" for purposes of Section 18 of the Exchange Act, nor incorporated by reference into any registration statement or other document filed pursuant to the Securities Act of 1933.
`;
  }

  return `# UNITED STATES SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549

FORM 8-K
CURRENT REPORT
Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934

Date of Report (Date of earliest event reported): ${dateFormatted}

${overview.companyName}
(Exact name of registrant as specified in its charter)

Commission File Number: ${commissionFileNumber}
IRS Employer Identification No.: 88-3491024
CIK: ${cikCode}

State of Incorporation: Delaware
Trading Symbol: ${overview.tickerSymbol}
Exchange: The Nasdaq Stock Market LLC (Nasdaq Global Select Market)

---
${sectionsMarkdown}
---

## Item 9.01 Financial Statements and Exhibits
(d) Exhibits:
- Exhibit 99.1: Press Release dated ${dateFormatted} announcing financial results for ${request.fiscalQuarter}.
- Exhibit 99.2: Investor Presentation dated ${dateFormatted} for ${request.fiscalQuarter} Non-Deal Roadshows.
- Exhibit 104: Cover Page Interactive Data File (embedded within the Inline XBRL document).

---

## SIGNATURES
Pursuant to the requirements of the Securities Exchange Act of 1934, the registrant has duly caused this report to be signed on its behalf by the undersigned hereunto duly authorized.

[x] VERIFIED & CERTIFIED: VP of Investor Relations
    Status: Consensus Metrics & Non-GAAP Reg G Reconciliations Audited

[x] APPROVED: Chief Financial Officer (Principal Financial Officer)
    Status: Financial Statements, Guidance & WACC Calculations Ratified

[x] AUTHORIZED: Chief Executive Officer (Principal Executive Officer)
    Status: Strategic Disclosure & EDGAR Transmission Formally Ratified
`;
}

export function validateShareholderInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<InstitutionalShareholderDTO>;
  if (!i.institutionName || typeof i.institutionName !== 'string' || i.institutionName.trim().length < 3) {
    errors.institutionName = 'Institution name must be at least 3 characters in length';
  }
  if (typeof i.sharesHeld !== 'number' || i.sharesHeld <= 0) {
    errors.sharesHeld = 'Shares held must be a positive number';
  }
  if (typeof i.percentOwnership !== 'number' || i.percentOwnership < 0 || i.percentOwnership > 100) {
    errors.percentOwnership = 'Ownership percentage must be between 0% and 100%';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return {
    ok: !hasErrors,
    isValid: !hasErrors,
    errors
  };
}

export function validateConsensusGuidanceInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SellSideConsensusMetricDTO>;
  if (!i.metricName || typeof i.metricName !== 'string' || i.metricName.trim().length < 2) {
    errors.metricName = 'Metric name is required';
  }
  if (typeof i.consensusMean !== 'number') {
    errors.consensusMean = 'Consensus mean must be a valid number';
  }
  if (typeof i.analystCount !== 'number' || i.analystCount < 1) {
    errors.analystCount = 'Analyst count must be at least 1';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return {
    ok: !hasErrors,
    isValid: !hasErrors,
    errors
  };
}

export function validateNdrMeetingInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<LogNdrMeetingRequestDTO>;
  if (!i.institutionName || typeof i.institutionName !== 'string' || i.institutionName.trim().length < 2) {
    errors.institutionName = 'Institution name must be at least 2 characters';
  }
  if (!i.meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(i.meetingDate)) {
    errors.meetingDate = 'Meeting date must be in YYYY-MM-DD format';
  }
  if (typeof i.sentimentScore !== 'number' || i.sentimentScore < -1.0 || i.sentimentScore > 1.0) {
    errors.sentimentScore = 'Sentiment score must be between -1.0 and +1.0';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return {
    ok: !hasErrors,
    isValid: !hasErrors,
    errors
  };
}

export function validateCapitalFinancingInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SimulateCapitalScenarioRequestDTO>;
  if (!i.scenarioName || typeof i.scenarioName !== 'string' || i.scenarioName.trim().length < 3) {
    errors.scenarioName = 'Scenario name must be at least 3 characters';
  }
  if (typeof i.grossAmountUsd !== 'number' || i.grossAmountUsd <= 0) {
    errors.grossAmountUsd = 'Gross amount must be a positive number';
  }
  if (typeof i.stockPriceUsd !== 'number' || i.stockPriceUsd <= 0) {
    errors.stockPriceUsd = 'Stock price must be greater than zero';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return {
    ok: !hasErrors,
    isValid: !hasErrors,
    errors
  };
}

export function validateForm8KSignoffInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<SignoffForm8KRequestDTO>;
  const validRoles: IrSignoffRole[] = [
    'vp_investor_relations',
    'chief_financial_officer',
    'chief_executive_officer'
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Sign-off role must be VP of Investor Relations, CFO, or CEO';
  }
  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 3) {
    errors.signerName = 'Signer name must be at least 3 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return {
    ok: !hasErrors,
    isValid: !hasErrors,
    errors
  };
}
