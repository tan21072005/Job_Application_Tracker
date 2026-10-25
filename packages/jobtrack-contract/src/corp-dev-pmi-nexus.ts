export type TargetStage =
  | 'sourcing'
  | 'initial_screening'
  | 'preliminary_nda'
  | 'management_presentation'
  | 'confidential_info_memo'
  | 'non_binding_indication_of_interest_ioi'
  | 'vdr_active_diligence'
  | 'binding_loi_exclusivity'
  | 'definitive_agreement_signed'
  | 'regulatory_review'
  | 'closing_completed'
  | 'abandoned_or_passed';

export type StrategicTheme =
  | 'horizontal_consolidation'
  | 'vertical_tech_stack_expansion'
  | 'geographic_new_market_entry'
  | 'talent_acqui_hire'
  | 'ip_patent_moat_acquisition'
  | 'disruptive_capability_absorption';

export type DiligenceStreamType =
  | 'financial_tax'
  | 'legal_regulatory'
  | 'commercial_market'
  | 'technical_architecture'
  | 'hr_talent_culture'
  | 'operational_esg';

export type FindingSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical_deal_killer';

export type RegulatoryCovenantType =
  | 'hell_or_high_water'
  | 'reasonable_best_efforts'
  | 'no_divestitures_required';

export type CorpDevSignoffRole =
  | 'vp_corporate_development'
  | 'chief_financial_officer'
  | 'chief_executive_officer';

export type DspiConfidenceBand =
  | 'HIGH_TRANSACTION_CERTAINTY'
  | 'MODERATE_CONDITIONAL_APPROVAL'
  | 'ELEVATED_CLOSING_RISK'
  | 'PROHIBITIVE_DEAL_KILLER';

export interface CorpDevTargetDTO {
  id: string;
  targetName: string;
  codeName: string;
  industrySector: string;
  stage: TargetStage;
  strategicTheme: StrategicTheme;
  headquarters: string;
  employeeCount: number;
  annualRevenueUsd: number;
  ebitdaUsd: number;
  targetEnterpriseValueUsd: number;
  strategicFitScore: number;
  ndaSignedDate: string | null;
  exclusivityExpiryDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VdrDiligenceStreamDTO {
  id: string;
  targetId: string;
  streamType: DiligenceStreamType;
  streamLead: string;
  completionPercent: number;
  status: 'pending' | 'in_progress' | 'red_flag_alert' | 'cleared';
  findingsCount: number;
  criticalIssuesCount: number;
  updatedAt: string;
}

export interface VdrDiligenceFindingDTO {
  id: string;
  targetId: string;
  streamType: DiligenceStreamType;
  title: string;
  description: string;
  severity: FindingSeverity;
  financialImpactUsd: number;
  proposedRemediation: string;
  isResolved: boolean;
  createdAt: string;
}

export interface DcfValuationModelDTO {
  id: string;
  targetId: string;
  modelName: string;
  forecastYears: number;
  waccPercent: number;
  terminalGrowthRatePercent: number;
  terminalEbitdaMultiple: number;
  projectedUfcf: number[];
  terminalValueGordonUsd: number;
  terminalValueMultipleUsd: number;
  enterpriseValueGordonUsd: number;
  enterpriseValueMultipleUsd: number;
  netDebtUsd: number;
  impliedEquityValueUsd: number;
  impliedSharePriceUsd: number;
}

export interface LboFinancialModelDTO {
  id: string;
  targetId: string;
  modelName: string;
  entryEbitdaMultiple: number;
  seniorDebtMultiple: number;
  subordinatedDebtMultiple: number;
  exitEbitdaMultiple: number;
  exitYear: number;
  projectedExitEbitdaUsd: number;
  sponsorEquityEntryUsd: number;
  sponsorEquityExitUsd: number;
  sponsorMoic: number;
  sponsorIrrPercent: number;
}

export interface SynergyModelDTO {
  id: string;
  targetId: string;
  annualRunRateCostSynergyUsd: number;
  annualRunRateRevenueSynergyUsd: number;
  contributionMarginPercent: number;
  oneTimeCostToAchieveUsd: number;
  costPhasing: number[];
  revenuePhasing: number[];
  synergyNpvUsd: number;
}

export interface PurchasePriceAllocationDTO {
  id: string;
  targetId: string;
  totalConsiderationUsd: number;
  netTangibleAssetsFairValueUsd: number;
  developedTechnologyFairValueUsd: number;
  customerRelationshipsFairValueUsd: number;
  trademarksFairValueUsd: number;
  deferredTaxLiabilityUsd: number;
  calculatedGoodwillUsd: number;
}

export interface DealStructuringDTO {
  id: string;
  targetId: string;
  cashConsiderationUsd: number;
  stockConsiderationUsd: number;
  earnoutConsiderationUsd: number;
  rolloverEquityUsd: number;
  cashPercent: number;
  stockPercent: number;
  collarUpperLimitUsd: number;
  collarLowerLimitUsd: number;
  fixedTargetValueUsd: number;
  buyerTerminationFeeUsd: number;
  targetBreakFeeUsd: number;
}

export interface AntitrustClearanceDTO {
  id: string;
  targetId: string;
  requiresHsrFiling: boolean;
  preMergerHhi: number;
  postMergerHhi: number;
  deltaHhi: number;
  secondRequestRiskScore: number;
  filingDate: string | null;
  waitingPeriodExpiryDate: string | null;
  regulatoryCovenant: RegulatoryCovenantType;
  clearanceStatus: 'pending_filing' | 'under_review' | 'second_request_issued' | 'cleared';
}

export interface PmiInitiativeDTO {
  id: string;
  targetId: string;
  workstream: string;
  title: string;
  owner: string;
  dayTarget: number;
  isDay1Critical: boolean;
  isCompleted: boolean;
  associatedSynergyUsd: number;
}

export interface TalentRetentionDTO {
  id: string;
  targetId: string;
  employeeName: string;
  jobTitle: string;
  department: string;
  annualCompensationUsd: number;
  unvestedEquityUsd: number;
  flightRiskScore: number;
  retentionBonusPoolUsd: number;
  cliffPeriodMonths: number;
  isLocked: boolean;
}

export interface BoardWarRoomDTO {
  id: string;
  targetId: string;
  dspiScore: number;
  confidenceBand: DspiConfidenceBand;
  vpCorpDevSignoff: {
    signed: boolean;
    signerName: string | null;
    timestamp: string | null;
  };
  cfoSignoff: {
    signed: boolean;
    signerName: string | null;
    timestamp: string | null;
  };
  ceoSignoff: {
    signed: boolean;
    signerName: string | null;
    timestamp: string | null;
  };
  form8kItem101Markdown: string;
  form8kItem201Markdown: string;
}

export interface CorpDevOverviewDTO {
  activeTargetsCount: number;
  targets: CorpDevTargetDTO[];
  aggregatePipelineEvUsd: number;
  activeVdrCount: number;
  averageStrategicFitScore: number;
  topTargets: {
    targetName: string;
    codeName: string;
    stage: TargetStage;
    evUsd: number;
    sfs: number;
  }[];
}

export interface CreateCorpDevTargetRequestDTO {
  targetName: string;
  codeName: string;
  industrySector: string;
  stage?: TargetStage;
  strategicTheme: StrategicTheme;
  headquarters: string;
  employeeCount: number;
  annualRevenueUsd: number;
  ebitdaUsd: number;
  targetEnterpriseValueUsd: number;
  ndaSignedDate?: string | null;
  exclusivityExpiryDate?: string | null;
}

export interface CreateVdrFindingRequestDTO {
  targetId: string;
  streamType: DiligenceStreamType;
  title: string;
  description: string;
  severity: FindingSeverity;
  financialImpactUsd: number;
  proposedRemediation: string;
}

export interface SimulateDcfRequestDTO {
  targetId?: string;
  projectedUfcf: number[];
  waccPercent: number;
  terminalGrowthRatePercent: number;
  terminalEbitdaMultiple: number;
  terminalYearEbitdaUsd: number;
  netDebtUsd: number;
  sharesOutstanding: number;
}

export interface SimulateLboRequestDTO {
  targetId?: string;
  entryEbitdaUsd: number;
  entryEbitdaMultiple: number;
  seniorDebtMultiple: number;
  subordinatedDebtMultiple: number;
  exitYear: number;
  exitEbitdaMultiple: number;
  projectedExitEbitdaUsd: number;
  debtPaydownDuringHoldUsd: number;
}

export interface SimulateSynergiesRequestDTO {
  targetId?: string;
  annualRunRateCostSynergyUsd: number;
  annualRunRateRevenueSynergyUsd: number;
  contributionMarginPercent: number;
  oneTimeCostToAchieveUsd: number;
  waccPercent: number;
  terminalGrowthRatePercent: number;
}

export interface SimulateCollarRequestDTO {
  targetId?: string;
  fixedTargetValueUsd: number;
  collarLowerLimitUsd: number;
  collarUpperLimitUsd: number;
  currentBuyerStockPriceUsd: number;
}

export interface AssessAntitrustRequestDTO {
  targetId?: string;
  buyerMarketSharePercent: number;
  targetMarketSharePercent: number;
  industryTotalHhiPreMerger: number;
  competitorProtestsPresent: boolean;
}

export interface LockTalentRetentionRequestDTO {
  targetId: string;
  employeeName: string;
  jobTitle: string;
  department: string;
  annualCompensationUsd: number;
  unvestedEquityUsd: number;
  flightRiskScore: number;
  retentionBonusPoolUsd: number;
  cliffPeriodMonths?: number;
}

export interface CorpDevSignoffRequestDTO {
  role: CorpDevSignoffRole;
  signerName: string;
  verificationNotes?: string;
}

export interface GenerateForm8KDisclosuresRequestDTO {
  targetName: string;
  codeName: string;
  totalConsiderationUsd: number;
  cashPercent: number;
  stockPercent: number;
  buyerTerminationFeeUsd: number;
  targetBreakFeeUsd: number;
  regulatoryCovenant: RegulatoryCovenantType;
  filingDate: string;
}

export function calculateStrategicFitScore(params: {
  commercialFitScore: number;
  technicalFitScore: number;
  financialFitScore: number;
  culturalFitScore: number;
  moatFitScore: number;
  findings: { severity: FindingSeverity; isResolved: boolean }[];
}): { sfs: number; riskPenalty: number } {
  const c1 = Math.min(100, Math.max(0, params.commercialFitScore)) * 0.25;
  const c2 = Math.min(100, Math.max(0, params.technicalFitScore)) * 0.25;
  const c3 = Math.min(100, Math.max(0, params.financialFitScore)) * 0.20;
  const c4 = Math.min(100, Math.max(0, params.culturalFitScore)) * 0.15;
  const c5 = Math.min(100, Math.max(0, params.moatFitScore)) * 0.15;

  const rawScore = c1 + c2 + c3 + c4 + c5;

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;

  for (const f of params.findings) {
    if (!f.isResolved) {
      if (f.severity === 'critical_deal_killer') criticalCount++;
      else if (f.severity === 'high') highCount++;
      else if (f.severity === 'medium') mediumCount++;
    }
  }

  const rawPenalty = criticalCount * 12 + highCount * 5 + mediumCount * 1.5;
  const riskPenalty = Math.min(40, rawPenalty);

  let finalSfs = Math.max(0, Math.min(100, rawScore - riskPenalty));

  if (criticalCount >= 2) {
    finalSfs = Math.min(finalSfs, 40);
  } else if (criticalCount === 1) {
    finalSfs = Math.min(finalSfs, 65);
  }

  return {
    sfs: Math.round(finalSfs * 10) / 10,
    riskPenalty: Math.round(riskPenalty * 10) / 10
  };
}

export function calculateDcfValuation(params: {
  projectedUfcf: number[];
  waccPercent: number;
  terminalGrowthRatePercent: number;
  terminalEbitdaMultiple: number;
  terminalYearEbitdaUsd: number;
  netDebtUsd: number;
  sharesOutstanding: number;
}): {
  pvOfUfcf: number;
  terminalValueGordonUsd: number;
  terminalValueMultipleUsd: number;
  enterpriseValueGordonUsd: number;
  enterpriseValueMultipleUsd: number;
  impliedEquityValueUsd: number;
  impliedSharePriceUsd: number;
} {
  const r = params.waccPercent / 100;
  const g = params.terminalGrowthRatePercent / 100;
  const t = params.projectedUfcf.length;

  let pvOfUfcf = 0;
  for (let i = 0; i < t; i++) {
    pvOfUfcf += params.projectedUfcf[i] / Math.pow(1 + r, i + 1);
  }

  const lastUfcf = params.projectedUfcf[t - 1] || 0;
  const gordonTv = (lastUfcf * (1 + g)) / (r - g);
  const multipleTv = params.terminalYearEbitdaUsd * params.terminalEbitdaMultiple;

  const pvGordonTv = gordonTv / Math.pow(1 + r, t);
  const pvMultipleTv = multipleTv / Math.pow(1 + r, t);

  const evGordon = pvOfUfcf + pvGordonTv;
  const evMultiple = pvOfUfcf + pvMultipleTv;

  const impliedEquityValue = evGordon - params.netDebtUsd;
  const impliedSharePrice =
    params.sharesOutstanding > 0
      ? impliedEquityValue / params.sharesOutstanding
      : 0;

  return {
    pvOfUfcf: Math.round(pvOfUfcf),
    terminalValueGordonUsd: Math.round(gordonTv),
    terminalValueMultipleUsd: Math.round(multipleTv),
    enterpriseValueGordonUsd: Math.round(evGordon),
    enterpriseValueMultipleUsd: Math.round(evMultiple),
    impliedEquityValueUsd: Math.round(impliedEquityValue),
    impliedSharePriceUsd: Math.round(impliedSharePrice * 100) / 100
  };
}

export function calculateLboReturns(params: {
  entryEbitdaUsd: number;
  entryEbitdaMultiple: number;
  seniorDebtMultiple: number;
  subordinatedDebtMultiple: number;
  exitYear: number;
  exitEbitdaMultiple: number;
  projectedExitEbitdaUsd: number;
  debtPaydownDuringHoldUsd: number;
}): {
  sponsorEquityEntryUsd: number;
  sponsorEquityExitUsd: number;
  sponsorMoic: number;
  sponsorIrrPercent: number;
} {
  const entryEv = params.entryEbitdaUsd * params.entryEbitdaMultiple;
  const seniorDebt0 = params.entryEbitdaUsd * params.seniorDebtMultiple;
  const subDebt0 = params.entryEbitdaUsd * params.subordinatedDebtMultiple;
  const totalDebt0 = seniorDebt0 + subDebt0;
  const sponsorEquityEntry = Math.max(1, entryEv - totalDebt0);

  const exitEv = params.projectedExitEbitdaUsd * params.exitEbitdaMultiple;
  const exitDebt = Math.max(0, totalDebt0 - params.debtPaydownDuringHoldUsd);
  const sponsorEquityExit = Math.max(0, exitEv - exitDebt);

  const moic = sponsorEquityExit / sponsorEquityEntry;
  const irr =
    params.exitYear > 0 ? (Math.pow(moic, 1 / params.exitYear) - 1) * 100 : 0;

  return {
    sponsorEquityEntryUsd: Math.round(sponsorEquityEntry),
    sponsorEquityExitUsd: Math.round(sponsorEquityExit),
    sponsorMoic: Math.round(moic * 100) / 100,
    sponsorIrrPercent: Math.round(irr * 10) / 10
  };
}

export function calculateSynergyNpv(params: {
  annualRunRateCostSynergyUsd: number;
  annualRunRateRevenueSynergyUsd: number;
  contributionMarginPercent: number;
  oneTimeCostToAchieveUsd: number;
  waccPercent: number;
  terminalGrowthRatePercent: number;
}): { synergyNpvUsd: number; annualNetSynergies: number[] } {
  const costPhasing = [0.3, 0.7, 1.0, 1.0];
  const revPhasing = [0.15, 0.5, 0.85, 1.0];
  const ctaPhasing = [0.6, 0.3, 0.1, 0.0];

  const r = params.waccPercent / 100;
  const g = params.terminalGrowthRatePercent / 100;
  const margin = params.contributionMarginPercent / 100;

  const annualNetSynergies: number[] = [];
  let pvDiscrete = 0;

  for (let i = 0; i < 4; i++) {
    const cost = params.annualRunRateCostSynergyUsd * costPhasing[i];
    const revNet =
      params.annualRunRateRevenueSynergyUsd * revPhasing[i] * margin;
    const cta = params.oneTimeCostToAchieveUsd * ctaPhasing[i];
    const net = cost + revNet - cta;
    annualNetSynergies.push(Math.round(net));
    pvDiscrete += net / Math.pow(1 + r, i + 1);
  }

  const terminalYearNet = annualNetSynergies[3];
  const terminalVal = (terminalYearNet * (1 + g)) / (r - g);
  const pvTerminal = terminalVal / Math.pow(1 + r, 4);

  const totalNpv = pvDiscrete + pvTerminal;

  return {
    synergyNpvUsd: Math.round(totalNpv),
    annualNetSynergies
  };
}

export function calculateAsc805PurchasePriceAllocation(params: {
  purchasePriceUsd: number;
  netTangibleAssetsFairValueUsd: number;
  developedTechnologyFairValueUsd: number;
  customerRelationshipsFairValueUsd: number;
  trademarksFairValueUsd: number;
  effectiveTaxRatePercent: number;
}): {
  identifiableIntangiblesUsd: number;
  deferredTaxLiabilityUsd: number;
  calculatedGoodwillUsd: number;
} {
  const intangibles =
    params.developedTechnologyFairValueUsd +
    params.customerRelationshipsFairValueUsd +
    params.trademarksFairValueUsd;

  const dtl = intangibles * (params.effectiveTaxRatePercent / 100);

  const goodwill =
    params.purchasePriceUsd -
    (params.netTangibleAssetsFairValueUsd + intangibles - dtl);

  return {
    identifiableIntangiblesUsd: Math.round(intangibles),
    deferredTaxLiabilityUsd: Math.round(dtl),
    calculatedGoodwillUsd: Math.round(goodwill)
  };
}

export function calculateFloatingCollarExchangeRatio(params: {
  fixedTargetValueUsd: number;
  collarLowerLimitUsd: number;
  collarUpperLimitUsd: number;
  currentBuyerStockPriceUsd: number;
}): { exchangeRatio: number; collarStatus: 'floor' | 'floating' | 'ceiling' } {
  const p = params.currentBuyerStockPriceUsd;
  if (p > params.collarUpperLimitUsd) {
    return {
      exchangeRatio:
        Math.round(
          (params.fixedTargetValueUsd / params.collarUpperLimitUsd) * 10000
        ) / 10000,
      collarStatus: 'floor'
    };
  }
  if (p < params.collarLowerLimitUsd) {
    return {
      exchangeRatio:
        Math.round(
          (params.fixedTargetValueUsd / params.collarLowerLimitUsd) * 10000
        ) / 10000,
      collarStatus: 'ceiling'
    };
  }
  return {
    exchangeRatio:
      Math.round((params.fixedTargetValueUsd / p) * 10000) / 10000,
    collarStatus: 'floating'
  };
}

export function calculateAntitrustSecondRequestRisk(params: {
  buyerMarketSharePercent: number;
  targetMarketSharePercent: number;
  industryTotalHhiPreMerger: number;
  competitorProtestsPresent: boolean;
}): {
  deltaHhi: number;
  postMergerHhi: number;
  secondRequestRiskScore: number;
} {
  const deltaHhi =
    2 * params.buyerMarketSharePercent * params.targetMarketSharePercent;
  const postMergerHhi = params.industryTotalHhiPreMerger + deltaHhi;

  let concentrationRisk = 15;
  if (postMergerHhi > 2500 && deltaHhi > 100) {
    concentrationRisk = 90;
  } else if (postMergerHhi > 1800 && deltaHhi > 100) {
    concentrationRisk = 75;
  } else if (postMergerHhi > 1500) {
    concentrationRisk = 45;
  }

  const overlapRisk = Math.min(
    100,
    (params.buyerMarketSharePercent + params.targetMarketSharePercent) * 1.5
  );
  const protestPenalty = params.competitorProtestsPresent ? 20 : 0;

  const riskScore = Math.min(
    100,
    Math.max(
      0,
      concentrationRisk * 0.5 + overlapRisk * 0.3 + protestPenalty * 0.2
    )
  );

  return {
    deltaHhi: Math.round(deltaHhi),
    postMergerHhi: Math.round(postMergerHhi),
    secondRequestRiskScore: Math.round(riskScore * 10) / 10
  };
}

export function calculateDspiScore(params: {
  diligenceHealthScore: number;
  financingCertaintyScore: number;
  antitrustClearanceScore: number;
  boardAlignmentScore: number;
  pmiReadinessScore: number;
  hasHostilePoisonPill: boolean;
  hasCriticalFraudOrAccountingMisstatement: boolean;
  hasFinancingWithdrawal: boolean;
}): { dspi: number; band: DspiConfidenceBand } {
  const weightedBase =
    params.diligenceHealthScore * 0.25 +
    params.financingCertaintyScore * 0.2 +
    params.antitrustClearanceScore * 0.2 +
    params.boardAlignmentScore * 0.2 +
    params.pmiReadinessScore * 0.15;

  let dealKillerPenalty = 0;
  if (params.hasHostilePoisonPill) dealKillerPenalty += 35;
  if (params.hasCriticalFraudOrAccountingMisstatement) dealKillerPenalty += 50;
  if (params.hasFinancingWithdrawal) dealKillerPenalty += 50;

  const finalDspi = Math.max(0, Math.min(100, weightedBase - dealKillerPenalty));
  const rounded = Math.round(finalDspi * 10) / 10;

  let band: DspiConfidenceBand = 'PROHIBITIVE_DEAL_KILLER';
  if (rounded >= 80.0) {
    band = 'HIGH_TRANSACTION_CERTAINTY';
  } else if (rounded >= 65.0) {
    band = 'MODERATE_CONDITIONAL_APPROVAL';
  } else if (rounded >= 50.0) {
    band = 'ELEVATED_CLOSING_RISK';
  }

  return {
    dspi: rounded,
    band
  };
}

export function generateForm8KDisclosures(params: {
  targetName: string;
  codeName: string;
  totalConsiderationUsd: number;
  cashPercent: number;
  stockPercent: number;
  buyerTerminationFeeUsd: number;
  targetBreakFeeUsd: number;
  regulatoryCovenant: RegulatoryCovenantType;
  filingDate: string;
}): { item101: string; item201: string } {
  const covenantLabel = params.regulatoryCovenant.split('_').join(' ');
  const totalEvMillions = (params.totalConsiderationUsd / 1000000).toFixed(2);
  const buyerFeeMillions = (params.buyerTerminationFeeUsd / 1000000).toFixed(2);
  const targetFeeMillions = (params.targetBreakFeeUsd / 1000000).toFixed(2);

  const item101 = [
    '# UNITED STATES SECURITIES AND EXCHANGE COMMISSION',
    'WASHINGTON, D.C. 20549',
    '',
    'FORM 8-K',
    'CURRENT REPORT',
    'Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934',
    '',
    'Date of Report: ' + params.filingDate,
    '',
    'Item 1.01 Entry into a Material Definitive Agreement.',
    '',
    'On ' + params.filingDate + ', JobTrack Enterprise Technologies Inc., a Delaware corporation ("Parent"), entered into an Agreement and Plan of Merger (the "Merger Agreement") by and among Parent, Project Apex Acquisition Sub Inc., a direct wholly owned subsidiary of Parent ("Merger Sub"), and ' + params.targetName + ', a Delaware corporation ("Company", Project code name: ' + params.codeName + ').',
    '',
    'Pursuant to the Merger Agreement, Merger Sub will merge with and into the Company, with the Company surviving as a wholly owned subsidiary of Parent. Under the terms of the transaction, each outstanding share of Company Common Stock will be converted into the right to receive consideration implying an aggregate enterprise valuation of $' + totalEvMillions + ' million, structured as ' + params.cashPercent + '% cash and ' + params.stockPercent + '% shares of Parent Common Stock.',
    '',
    'The Merger Agreement contains customary representations, warranties, and covenants. Subject to specific regulatory requirements, Parent has agreed to use ' + covenantLabel + ' to secure antitrust clearance under the Hart-Scott-Rodino Antitrust Improvements Act of 1976.',
    '',
    'In connection with termination under designated antitrust or financing contingencies, Parent may be required to pay the Company a reverse termination fee of $' + buyerFeeMillions + ' million. Conversely, under fiduciary out or topping bid conditions, the Company will pay Parent a break fee of $' + targetFeeMillions + ' million.'
  ].join('\n');

  const item201 = [
    '# UNITED STATES SECURITIES AND EXCHANGE COMMISSION',
    'WASHINGTON, D.C. 20549',
    '',
    'FORM 8-K',
    'CURRENT REPORT',
    'Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934',
    '',
    'Date of Report: ' + params.filingDate,
    '',
    'Item 2.01 Completion of Acquisition or Disposition of Assets.',
    '',
    'On ' + params.filingDate + ', Parent completed its previously announced acquisition of ' + params.targetName + ' pursuant to the Merger Agreement. At the effective time of the merger, all conditions precedent, including regulatory clearance under the HSR Act and stockholder approvals, were satisfied.',
    '',
    'Parent transferred total consideration of $' + totalEvMillions + ' million, funded through available balance sheet liquidity, drawings under its Senior Secured Revolving Credit Facility, and issuance of Parent Common Stock. The assets and operations acquired will be accounted for as a business combination under ASC Topic 805.'
  ].join('\n');

  return { item101, item201 };
}

export function validateCorpDevTargetInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<CorpDevTargetDTO>;
  if (!i.targetName || typeof i.targetName !== 'string' || i.targetName.trim().length < 2) {
    errors.targetName = 'Target name must be at least 2 characters';
  }
  if (!i.codeName || typeof i.codeName !== 'string' || i.codeName.trim().length < 2) {
    errors.codeName = 'Code name is required for operational secrecy';
  }
  if (typeof i.annualRevenueUsd !== 'number' || i.annualRevenueUsd < 0) {
    errors.annualRevenueUsd = 'Annual revenue must be a non-negative number';
  }
  if (typeof i.targetEnterpriseValueUsd !== 'number' || i.targetEnterpriseValueUsd <= 0) {
    errors.targetEnterpriseValueUsd = 'Target Enterprise Value must be greater than zero';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateVdrFindingInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<VdrDiligenceFindingDTO>;
  if (!i.targetId || typeof i.targetId !== 'string') {
    errors.targetId = 'Target ID is required';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }
  const validSeverities: FindingSeverity[] = [
    'low',
    'medium',
    'high',
    'critical_deal_killer'
  ];
  if (!i.severity || !validSeverities.includes(i.severity)) {
    errors.severity = 'Invalid severity rating';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateDcfSimulationInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<SimulateDcfRequestDTO>;
  if (!Array.isArray(i.projectedUfcf) || i.projectedUfcf.length === 0) {
    errors.projectedUfcf = 'Projected UFCF must be a non-empty array of numbers';
  }
  if (typeof i.waccPercent !== 'number' || i.waccPercent <= 0 || i.waccPercent >= 100) {
    errors.waccPercent = 'WACC must be a percentage between 0 and 100';
  }
  if (typeof i.terminalGrowthRatePercent !== 'number' || i.terminalGrowthRatePercent < 0) {
    errors.terminalGrowthRatePercent = 'Terminal growth rate must be a non-negative number';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateLboSimulationInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<SimulateLboRequestDTO>;
  if (typeof i.entryEbitdaUsd !== 'number' || i.entryEbitdaUsd <= 0) {
    errors.entryEbitdaUsd = 'Entry EBITDA must be a positive number';
  }
  if (typeof i.entryEbitdaMultiple !== 'number' || i.entryEbitdaMultiple <= 0) {
    errors.entryEbitdaMultiple = 'Entry multiple must be a positive number';
  }
  if (typeof i.exitYear !== 'number' || i.exitYear <= 0) {
    errors.exitYear = 'Exit year must be a positive integer';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateSynergiesSimulationInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<SimulateSynergiesRequestDTO>;
  if (typeof i.annualRunRateCostSynergyUsd !== 'number' || i.annualRunRateCostSynergyUsd < 0) {
    errors.annualRunRateCostSynergyUsd = 'Annual cost synergy must be a non-negative number';
  }
  if (typeof i.waccPercent !== 'number' || i.waccPercent <= 0) {
    errors.waccPercent = 'WACC percent must be greater than zero';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCollarSimulationInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<SimulateCollarRequestDTO>;
  if (typeof i.fixedTargetValueUsd !== 'number' || i.fixedTargetValueUsd <= 0) {
    errors.fixedTargetValueUsd = 'Fixed target value must be greater than zero';
  }
  if (typeof i.collarLowerLimitUsd !== 'number' || i.collarLowerLimitUsd <= 0) {
    errors.collarLowerLimitUsd = 'Collar lower limit must be greater than zero';
  }
  if (typeof i.collarUpperLimitUsd !== 'number' || i.collarUpperLimitUsd <= (i.collarLowerLimitUsd || 0)) {
    errors.collarUpperLimitUsd = 'Collar upper limit must exceed lower limit';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateAntitrustAssessmentInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<AssessAntitrustRequestDTO>;
  if (typeof i.buyerMarketSharePercent !== 'number' || i.buyerMarketSharePercent < 0 || i.buyerMarketSharePercent > 100) {
    errors.buyerMarketSharePercent = 'Buyer market share must be between 0 and 100';
  }
  if (typeof i.targetMarketSharePercent !== 'number' || i.targetMarketSharePercent < 0 || i.targetMarketSharePercent > 100) {
    errors.targetMarketSharePercent = 'Target market share must be between 0 and 100';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateTalentRetentionInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<LockTalentRetentionRequestDTO>;
  if (!i.targetId || typeof i.targetId !== 'string') {
    errors.targetId = 'Target ID is required';
  }
  if (!i.employeeName || typeof i.employeeName !== 'string' || i.employeeName.trim().length < 2) {
    errors.employeeName = 'Employee name must be at least 2 characters';
  }
  if (typeof i.annualCompensationUsd !== 'number' || i.annualCompensationUsd <= 0) {
    errors.annualCompensationUsd = 'Annual compensation must be greater than zero';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCorpDevSignoffInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' }
    };
  }
  const i = input as Partial<CorpDevSignoffRequestDTO>;
  const validRoles: CorpDevSignoffRole[] = [
    'vp_corporate_development',
    'chief_financial_officer',
    'chief_executive_officer'
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Role must be VP Corporate Development, CFO, or CEO';
  }
  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 2) {
    errors.signerName = 'Signer name must be at least 2 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}
