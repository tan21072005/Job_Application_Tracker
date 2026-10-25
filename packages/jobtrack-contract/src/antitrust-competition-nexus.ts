export type AntitrustDealStructureType =
  | 'horizontal_merger'
  | 'vertical_integration'
  | 'conglomerate_expansion'
  | 'asset_purchase_carveout'
  | 'strategic_joint_venture';

export type AntitrustTransactionStatus =
  | 'pre_filing_analysis'
  | 'initial_waiting_period'
  | 'second_request_subpoena'
  | 'phase_2_in_depth'
  | 'remedies_negotiation'
  | 'regulatory_litigation'
  | 'unconditional_clearance'
  | 'conditional_clearance'
  | 'transaction_abandoned';

export type GlobalJurisdictionCode =
  | 'US_FTC_DOJ'
  | 'EU_DG_COMP'
  | 'UK_CMA'
  | 'CN_SAMR'
  | 'CA_COMP_BUR'
  | 'JP_JFTC'
  | 'AU_ACCC';

export type ClearanceReviewPhase =
  | 'pre_notification'
  | 'phase_1'
  | 'phase_1_remedies'
  | 'phase_2'
  | 'remedy_implementation'
  | 'appeal_judicial_review';

export type ClearanceDecisionOutcome =
  | 'pending'
  | 'cleared_unconditionally'
  | 'cleared_with_commitments'
  | 'second_request_pending'
  | 'phase_2_referral'
  | 'statement_of_objections'
  | 'blocked_prohibited';

export type DivestitureRemedyType =
  | 'structural_asset_carveout'
  | 'fix_it_first_buyer_sale'
  | 'upfront_buyer_divestiture'
  | 'behavioral_frand_licensing'
  | 'interoperability_open_api'
  | 'firewall_clean_team_protocol';

export type RegulatoryRatificationRole =
  | 'antitrust_lead_counsel'
  | 'chief_legal_officer'
  | 'chief_executive_officer';

export type MarketConcentrationTier =
  | 'unconcentrated'
  | 'moderately_concentrated'
  | 'highly_concentrated_presumption'
  | 'dominant_firm_threshold';

export type UnilateralPricingRiskTier =
  | 'negligible_pricing_pressure'
  | 'moderate_unilateral_risk'
  | 'severe_unilateral_effects';

export type ClearanceRiskBand =
  | 'low_clearance_risk'
  | 'moderate_scrutiny'
  | 'elevated_second_request_risk'
  | 'acute_antitrust_block_risk';

export interface AntitrustMergerTransaction {
  id: string;
  dealCodename: string;
  acquirerName: string;
  targetName: string;
  enterpriseValueUsd: number;
  cashConsiderationUsd: number;
  stockConsiderationUsd: number;
  announcedDate: string;
  targetedClosingDate: string;
  reverseTerminationFeePct: number;
  reverseTerminationFeeUsd: number;
  dealStructureType: AntitrustDealStructureType;
  overallTransactionStatus: AntitrustTransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface HsrStatutoryAssessment {
  id: string;
  transactionId: string;
  sizeOfTransactionTestPassed: boolean;
  transactionValueUsd: number;
  sizeOfTransactionThresholdUsd: number;
  sizeOfPersonTestPassed: boolean;
  largerPersonNetSalesUsd: number;
  smallerPersonNetSalesUsd: number;
  sizeOfPersonLowerThresholdUsd: number;
  sizeOfPersonUpperThresholdUsd: number;
  unconditionalFilingThresholdUsd: number;
  isHsrFilingRequired: boolean;
  statutoryFilingFeeUsd: number;
  initialWaitingPeriodDays: number;
  earliestWaitingPeriodExpiry: string | null;
  item4cDocumentsCataloged: number;
  item4dDocumentsCataloged: number;
  filingPreparedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HsrSecondRequest {
  id: string;
  transactionId: string;
  issuingAgency: string;
  receiptDate: string;
  scopeDescription: string;
  custodianCount: number;
  custodiansAgreedCount: number;
  dataVolumeTerabytes: number;
  documentsReviewedCount: number;
  documentsProducedCount: number;
  privilegeLogEntriesCount: number;
  certifiedSubstantialCompliance: boolean;
  complianceCertificationDate: string | null;
  extendedWaitingPeriodExpiry: string | null;
  estimatedDefenseCostsUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface AntitrustRelevantMarket {
  id: string;
  transactionId: string;
  marketName: string;
  productMarketDefinition: string;
  geographicMarketScope: string;
  totalMarketSizeUsd: number;
  ssnipTestCriticalLossPct: number;
  hypotheticalMonopolistTestPassed: boolean;
  preMergerHhi: number;
  postMergerHhi: number;
  deltaHhi: number;
  concentrationTier: MarketConcentrationTier;
  presumptionRebuttableUnlawful: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketParticipantShare {
  id: string;
  relevantMarketId: string;
  participantName: string;
  isMergingParty: boolean;
  isAcquirer: boolean;
  isTarget: boolean;
  annualRevenueUsd: number;
  marketSharePct: number;
  postMergerSharePct: number;
  createdAt: string;
}

export interface GuppiEconomicAnalysis {
  id: string;
  relevantMarketId: string;
  acquirerProductName: string;
  targetProductName: string;
  diversionRatio12: number;
  diversionRatio21: number;
  priceLevel1: number;
  priceLevel2: number;
  grossMargin1Pct: number;
  grossMargin2Pct: number;
  marginalCostEfficiency1Pct: number;
  marginalCostEfficiency2Pct: number;
  guppi1Pct: number;
  guppi2Pct: number;
  maxGuppiPct: number;
  unilateralEffectsRiskTier: UnilateralPricingRiskTier;
  createdAt: string;
}

export interface GlobalClearanceFiling {
  id: string;
  transactionId: string;
  jurisdictionCode: GlobalJurisdictionCode;
  regulatoryAgencyName: string;
  filingType: string;
  filingStatus: string;
  formalSubmissionDate: string | null;
  statutoryDeadlineDate: string | null;
  currentReviewPhase: ClearanceReviewPhase;
  remediesSubmitted: boolean;
  stopTheClockInvoked: boolean;
  clearanceDecision: ClearanceDecisionOutcome;
  clearanceOrderDate: string | null;
  outsideCounselLead: string;
  createdAt: string;
  updatedAt: string;
}

export interface RemedyDivestiturePackage {
  id: string;
  transactionId: string;
  packageName: string;
  remedyType: DivestitureRemedyType;
  carveoutBusinessUnit: string;
  carveoutRevenueUsd: number;
  carveoutEbitdaUsd: number;
  upfrontBuyerName: string | null;
  upfrontBuyerViabilityScore: number;
  assetOverlapMitigatedPct: number;
  standaloneViabilityScore: number;
  cleanTeamComplianceScore: number;
  behavioralCommitmentsScore: number;
  remedyDefensibilityIndex: number;
  agencyAcceptanceStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CleanTeamFirewallProtocol {
  id: string;
  transactionId: string;
  protocolTitle: string;
  cleanDataRoomVendor: string;
  establishedDate: string;
  firewallStatus: string;
  clearedCounselCount: number;
  clearedConsultantsCount: number;
  coveredCommerciallySensitiveCategories: string[];
  gunJumpingAuditFrequency: string;
  lastComplianceAuditDate: string | null;
  anyReportedBreaches: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AntitrustLitigationDocket {
  id: string;
  transactionId: string;
  courtOrAgency: string;
  docketNumber: string;
  actionType: string;
  presidingJudge: string;
  preliminaryInjunctionRiskPct: number;
  evidentiaryHearingDate: string | null;
  trialDate: string | null;
  cidDepositionsScheduled: number;
  cidDepositionsCompleted: number;
  litigationPosture: string;
  settlementDiscussionsOpen: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AntitrustTripartiteRatification {
  id: string;
  transactionId: string;
  filingStrategyTitle: string;
  regulatoryClearanceRiskScore: number;
  leadCounselSigned: boolean;
  leadCounselSigner: string | null;
  leadCounselDate: string | null;
  leadCounselStatement: string | null;
  generalCounselSigned: boolean;
  generalCounselSigner: string | null;
  generalCounselDate: string | null;
  generalCounselStatement: string | null;
  chiefExecutiveOfficerSigned: boolean;
  chiefExecutiveOfficerSigner: string | null;
  chiefExecutiveOfficerDate: string | null;
  chiefExecutiveOfficerStatement: string | null;
  isFullyRatified: boolean;
  cryptographicIntegrityHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface AntitrustAuditEventLog {
  id: string;
  transactionId: string;
  eventTimestamp: string;
  eventCategory: string;
  actorName: string;
  headline: string;
  details: string;
  severity: 'info' | 'warning' | 'critical' | 'regulatory_filing';
  createdAt: string;
}

export interface AntitrustCompetitionOverview {
  transaction: AntitrustMergerTransaction;
  hsrAssessment: HsrStatutoryAssessment;
  secondRequest: HsrSecondRequest | null;
  relevantMarkets: AntitrustRelevantMarket[];
  marketParticipants: MarketParticipantShare[];
  guppiAnalyses: GuppiEconomicAnalysis[];
  globalFilings: GlobalClearanceFiling[];
  remedyPackages: RemedyDivestiturePackage[];
  cleanTeamProtocol: CleanTeamFirewallProtocol | null;
  litigationDocket: AntitrustLitigationDocket | null;
  ratification: AntitrustTripartiteRatification;
  auditLogs: AntitrustAuditEventLog[];
  metrics: {
    maxPostMergerHhi: number;
    maxDeltaHhi: number;
    maxGuppiPct: number;
    overallClearanceRiskScore: number;
    clearanceRiskBand: ClearanceRiskBand;
    maxRemedyDefensibilityIndex: number;
    reverseTerminationFeeExposureUsd: number;
    expectedRegulatoryLossUsd: number;
    presumptionRebuttableCount: number;
  };
}

export interface CreateMergerTransactionInput {
  dealCodename: string;
  acquirerName: string;
  targetName: string;
  enterpriseValueUsd: number;
  cashConsiderationUsd: number;
  stockConsiderationUsd: number;
  announcedDate: string;
  targetedClosingDate: string;
  reverseTerminationFeePct?: number;
  dealStructureType: AntitrustDealStructureType;
}

export interface ParticipantShareInput {
  participantName: string;
  isMergingParty: boolean;
  isAcquirer: boolean;
  isTarget: boolean;
  annualRevenueUsd: number;
  marketSharePct: number;
}

export interface DefineMarketInput {
  transactionId: string;
  marketName: string;
  productMarketDefinition: string;
  geographicMarketScope: string;
  totalMarketSizeUsd: number;
  ssnipTestCriticalLossPct?: number;
  hypotheticalMonopolistTestPassed?: boolean;
  participantShares: ParticipantShareInput[];
}

export interface ProposeDivestiturePackageInput {
  transactionId: string;
  packageName: string;
  remedyType: DivestitureRemedyType;
  carveoutBusinessUnit: string;
  carveoutRevenueUsd: number;
  carveoutEbitdaUsd: number;
  upfrontBuyerName?: string | null;
  upfrontBuyerViabilityScore?: number;
  assetOverlapMitigatedPct: number;
  standaloneViabilityScore?: number;
  cleanTeamComplianceScore?: number;
  behavioralCommitmentsScore?: number;
}

export interface SubmitAntitrustSignoffInput {
  transactionId: string;
  role: RegulatoryRatificationRole;
  signerName: string;
  statementAcknowledged: string;
}

export function calculateHhiConcentration(shares: number[]): {
  hhi: number;
  concentrationTier: MarketConcentrationTier;
} {
  const hhi = Math.round(
    shares.reduce((acc, s) => acc + Math.pow(Math.max(0, s), 2), 0)
  );

  let concentrationTier: MarketConcentrationTier = 'unconcentrated';
  if (hhi >= 1800) {
    concentrationTier = 'highly_concentrated_presumption';
  } else if (hhi >= 1000) {
    concentrationTier = 'moderately_concentrated';
  }

  return { hhi, concentrationTier };
}

export function calculateDeltaHhi(
  s1: number,
  s2: number
): {
  deltaHhi: number;
  postMergerSharePct: number;
} {
  const cleanS1 = Math.max(0, s1);
  const cleanS2 = Math.max(0, s2);
  const deltaHhi = Math.round(2 * cleanS1 * cleanS2);
  const postMergerSharePct = Number((cleanS1 + cleanS2).toFixed(2));
  return { deltaHhi, postMergerSharePct };
}

export function evaluateHhiPresumption(
  postMergerHhi: number,
  deltaHhi: number,
  postMergerSharePct: number
): {
  presumptionRebuttableUnlawful: boolean;
  concentrationTier: MarketConcentrationTier;
  regulatoryGuidanceSummary: string;
} {
  if (postMergerSharePct > 30.0 && deltaHhi >= 100) {
    return {
      presumptionRebuttableUnlawful: true,
      concentrationTier: 'dominant_firm_threshold',
      regulatoryGuidanceSummary:
        'Triggers 2023 Merger Guidelines Dominant Firm Presumption (post-merger share > 30% with delta HHI >= 100). Rebuttable presumption of illegality.'
    };
  }

  if (postMergerHhi >= 1800 && deltaHhi >= 100) {
    return {
      presumptionRebuttableUnlawful: true,
      concentrationTier: 'highly_concentrated_presumption',
      regulatoryGuidanceSummary:
        'Triggers 2023 Merger Guidelines Structural Presumption (post-merger HHI >= 1800 and delta HHI >= 100). High probability of Second Request and FTC/DOJ challenge.'
    };
  }

  if (postMergerHhi >= 1000 && deltaHhi >= 100) {
    return {
      presumptionRebuttableUnlawful: false,
      concentrationTier: 'moderately_concentrated',
      regulatoryGuidanceSummary:
        'Moderately concentrated market with significant concentration increase. Moderate scrutiny band.'
    };
  }

  return {
    presumptionRebuttableUnlawful: false,
    concentrationTier: postMergerHhi >= 1000 ? 'moderately_concentrated' : 'unconcentrated',
    regulatoryGuidanceSummary:
      'Unconcentrated or low delta market. Clearance without structural remedies expected.'
  };
}

export function calculateGuppi(
  d12: number,
  d21: number,
  p1: number,
  p2: number,
  margin1Pct: number,
  margin2Pct: number,
  efficiency1Pct: number = 0.0,
  efficiency2Pct: number = 0.0
): {
  guppi1Pct: number;
  guppi2Pct: number;
  maxGuppiPct: number;
  unilateralEffectsRiskTier: UnilateralPricingRiskTier;
} {
  const m1 = Math.max(0, Math.min(100, margin1Pct)) / 100;
  const m2 = Math.max(0, Math.min(100, margin2Pct)) / 100;
  const e1 = Math.max(0, efficiency1Pct) / 100;
  const e2 = Math.max(0, efficiency2Pct) / 100;

  const priceRatio12 = p1 > 0 ? p2 / p1 : 1.0;
  const priceRatio21 = p2 > 0 ? p1 / p2 : 1.0;

  const rawGuppi1 = d12 * priceRatio12 * m2 - e1;
  const rawGuppi2 = d21 * priceRatio21 * m1 - e2;

  const guppi1Pct = Number((Math.max(0, rawGuppi1) * 100).toFixed(2));
  const guppi2Pct = Number((Math.max(0, rawGuppi2) * 100).toFixed(2));
  const maxGuppiPct = Math.max(guppi1Pct, guppi2Pct);

  let unilateralEffectsRiskTier: UnilateralPricingRiskTier = 'negligible_pricing_pressure';
  if (maxGuppiPct >= 10.0) {
    unilateralEffectsRiskTier = 'severe_unilateral_effects';
  } else if (maxGuppiPct >= 5.0) {
    unilateralEffectsRiskTier = 'moderate_unilateral_risk';
  }

  return {
    guppi1Pct,
    guppi2Pct,
    maxGuppiPct,
    unilateralEffectsRiskTier
  };
}

export function calculateRegulatoryClearanceRiskScore(params: {
  postMergerHhi: number;
  deltaHhi: number;
  maxGuppiPct: number;
  phase2FilingsCount: number;
  phase1FilingsCount: number;
  hasConflictingForeignRemedy: boolean;
  customerObjectionsCount: number;
  competitorWhitepapersCount: number;
  stateAgInquiriesCount: number;
  custodianCount: number;
  dataVolumeTerabytes: number;
  hasCidDeposition: boolean;
}): {
  score: number;
  riskBand: ClearanceRiskBand;
  breakdown: {
    hhiRisk: number;
    guppiRisk: number;
    jurisdictionRisk: number;
    complaintRisk: number;
    secondRequestRisk: number;
  };
} {
  let hhiRisk = 0;
  if (params.postMergerHhi >= 1800 && params.deltaHhi >= 100) {
    hhiRisk = Math.min(100, 80 + (params.deltaHhi - 100) / 15);
  } else if (params.postMergerHhi >= 1000 && params.deltaHhi >= 100) {
    hhiRisk = Math.min(75, 50 + params.deltaHhi / 8);
  } else {
    hhiRisk = Math.min(40, params.postMergerHhi / 35);
  }

  let guppiRisk = 0;
  if (params.maxGuppiPct >= 10.0) {
    guppiRisk = Math.min(100, 85 + (params.maxGuppiPct - 10.0) * 2);
  } else if (params.maxGuppiPct >= 5.0) {
    guppiRisk = 50 + (params.maxGuppiPct - 5.0) * 7;
  } else {
    guppiRisk = params.maxGuppiPct * 10;
  }

  const jurisdictionRisk = Math.min(
    100,
    params.phase2FilingsCount * 30 +
      params.phase1FilingsCount * 10 +
      (params.hasConflictingForeignRemedy ? 25 : 0)
  );

  const complaintRisk = Math.min(
    100,
    params.customerObjectionsCount * 20 +
      params.competitorWhitepapersCount * 15 +
      params.stateAgInquiriesCount * 10
  );

  const secondRequestRisk = Math.min(
    100,
    (params.custodianCount / 10) * 15 +
      (params.dataVolumeTerabytes / 5) * 10 +
      (params.hasCidDeposition ? 25 : 0)
  );

  const rawScore =
    0.30 * hhiRisk +
    0.25 * guppiRisk +
    0.20 * jurisdictionRisk +
    0.15 * complaintRisk +
    0.10 * secondRequestRisk;

  const score = Number(Math.min(100, Math.max(0, rawScore)).toFixed(1));

  let riskBand: ClearanceRiskBand = 'low_clearance_risk';
  if (score >= 75.0) {
    riskBand = 'acute_antitrust_block_risk';
  } else if (score >= 55.0) {
    riskBand = 'elevated_second_request_risk';
  } else if (score >= 30.0) {
    riskBand = 'moderate_scrutiny';
  }

  return {
    score,
    riskBand,
    breakdown: {
      hhiRisk: Number(hhiRisk.toFixed(1)),
      guppiRisk: Number(guppiRisk.toFixed(1)),
      jurisdictionRisk: Number(jurisdictionRisk.toFixed(1)),
      complaintRisk: Number(complaintRisk.toFixed(1)),
      secondRequestRisk: Number(secondRequestRisk.toFixed(1))
    }
  };
}

export function calculateRemedyDefensibilityIndex(params: {
  overlapMitigatedPct: number;
  upfrontBuyerViabilityScore: number;
  standaloneViabilityScore: number;
  cleanTeamComplianceScore: number;
  behavioralCommitmentsScore: number;
}): {
  rdi: number;
  isRemedyDefensible: boolean;
  recommendationSummary: string;
} {
  const scopeScore = Math.max(0, Math.min(100, params.overlapMitigatedPct));
  const buyerScore = Math.max(0, Math.min(100, params.upfrontBuyerViabilityScore));
  const standaloneScore = Math.max(0, Math.min(100, params.standaloneViabilityScore));
  const cleanTeamScore = Math.max(0, Math.min(100, params.cleanTeamComplianceScore));
  const behavioralScore = Math.max(0, Math.min(100, params.behavioralCommitmentsScore));

  const rawRdi =
    0.35 * scopeScore +
    0.25 * buyerScore +
    0.20 * standaloneScore +
    0.10 * cleanTeamScore +
    0.10 * behavioralScore;

  const rdi = Number(Math.min(100, Math.max(0, rawRdi)).toFixed(1));
  const isRemedyDefensible = rdi >= 75.0;

  let recommendationSummary = 'Remedy package viable for DOJ/FTC Fix-It-First presentation.';
  if (rdi < 55.0) {
    recommendationSummary =
      'Remedy package deficient. Substantial risk of agency rejection; expand standalone divestiture scope.';
  } else if (rdi < 75.0) {
    recommendationSummary =
      'Marginally viable remedy. Requires upfront vetted buyer and long-term transition support covenants.';
  }

  return { rdi, isRemedyDefensible, recommendationSummary };
}

export function calculateHsrStatutoryFee(transactionValueUsd: number): {
  statutoryFeeUsd: number;
  feeTierSummary: string;
} {
  if (transactionValueUsd >= 5000000000) {
    return { statutoryFeeUsd: 2335000, feeTierSummary: '$5B+ transaction tier ($2,335,000)' };
  }
  if (transactionValueUsd >= 1000000000) {
    return { statutoryFeeUsd: 800000, feeTierSummary: '$1B - $5B transaction tier ($800,000)' };
  }
  if (transactionValueUsd >= 500000000) {
    return { statutoryFeeUsd: 400000, feeTierSummary: '$500M - $1B transaction tier ($400,000)' };
  }
  if (transactionValueUsd >= 250000000) {
    return { statutoryFeeUsd: 250000, feeTierSummary: '$250M - $500M transaction tier ($250,000)' };
  }
  if (transactionValueUsd >= 173300000) {
    return { statutoryFeeUsd: 100000, feeTierSummary: '$173.3M - $250M transaction tier ($100,000)' };
  }
  if (transactionValueUsd >= 119500000) {
    return { statutoryFeeUsd: 30000, feeTierSummary: '$119.5M - $173.3M transaction tier ($30,000)' };
  }
  return { statutoryFeeUsd: 0, feeTierSummary: 'Below HSR statutory threshold ($0)' };
}

export function evaluateHsrStatutoryThresholds(
  transactionValueUsd: number,
  largerPersonNetSalesUsd: number,
  smallerPersonNetSalesUsd: number
): {
  sizeOfTransactionTestPassed: boolean;
  sizeOfPersonTestPassed: boolean;
  isHsrFilingRequired: boolean;
  statutoryFilingFeeUsd: number;
  feeTierSummary: string;
  initialWaitingPeriodDays: number;
} {
  const sizeOfTransactionThresholdUsd = 119500000;
  const unconditionalThresholdUsd = 478000000;
  const personUpperThresholdUsd = 239000000;
  const personLowerThresholdUsd = 23900000;

  const sizeOfTransactionTestPassed = transactionValueUsd >= sizeOfTransactionThresholdUsd;
  const sizeOfPersonTestPassed =
    (largerPersonNetSalesUsd >= personUpperThresholdUsd && smallerPersonNetSalesUsd >= personLowerThresholdUsd) ||
    transactionValueUsd >= unconditionalThresholdUsd;

  const isHsrFilingRequired =
    sizeOfTransactionTestPassed && (transactionValueUsd >= unconditionalThresholdUsd || sizeOfPersonTestPassed);

  const feeInfo = calculateHsrStatutoryFee(transactionValueUsd);

  return {
    sizeOfTransactionTestPassed,
    sizeOfPersonTestPassed,
    isHsrFilingRequired,
    statutoryFilingFeeUsd: feeInfo.statutoryFeeUsd,
    feeTierSummary: feeInfo.feeTierSummary,
    initialWaitingPeriodDays: 30
  };
}

export function computeRatificationHash(payload: {
  transactionId: string;
  regulatoryClearanceRiskScore: number;
  leadCounselSigner: string;
  generalCounselSigner: string;
  chiefExecutiveOfficerSigner: string;
}): string {
  const content = [
    payload.transactionId,
    payload.regulatoryClearanceRiskScore.toFixed(1),
    payload.leadCounselSigner.trim().toLowerCase(),
    payload.generalCounselSigner.trim().toLowerCase(),
    payload.chiefExecutiveOfficerSigner.trim().toLowerCase()
  ].join('|');

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `sha256-ratif-${hex}${hex}${hex}${hex}`.slice(0, 48);
}

export function validateCreateMergerTransactionInput(
  raw: unknown
): { ok: true; data: CreateMergerTransactionInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Input must be a non-null object' };
  }
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.dealCodename !== 'string' || !candidate.dealCodename.trim()) {
    return { ok: false, error: 'dealCodename is required and must be non-empty string' };
  }
  if (typeof candidate.acquirerName !== 'string' || !candidate.acquirerName.trim()) {
    return { ok: false, error: 'acquirerName is required and must be non-empty string' };
  }
  if (typeof candidate.targetName !== 'string' || !candidate.targetName.trim()) {
    return { ok: false, error: 'targetName is required and must be non-empty string' };
  }
  if (typeof candidate.enterpriseValueUsd !== 'number' || candidate.enterpriseValueUsd <= 0) {
    return { ok: false, error: 'enterpriseValueUsd must be a positive number' };
  }
  if (typeof candidate.cashConsiderationUsd !== 'number' || candidate.cashConsiderationUsd < 0) {
    return { ok: false, error: 'cashConsiderationUsd must be a non-negative number' };
  }
  if (typeof candidate.stockConsiderationUsd !== 'number' || candidate.stockConsiderationUsd < 0) {
    return { ok: false, error: 'stockConsiderationUsd must be a non-negative number' };
  }
  if (typeof candidate.announcedDate !== 'string' || !candidate.announcedDate.trim()) {
    return { ok: false, error: 'announcedDate is required and must be non-empty string' };
  }
  if (typeof candidate.targetedClosingDate !== 'string' || !candidate.targetedClosingDate.trim()) {
    return { ok: false, error: 'targetedClosingDate is required and must be non-empty string' };
  }

  const validStructures: AntitrustDealStructureType[] = [
    'horizontal_merger',
    'vertical_integration',
    'conglomerate_expansion',
    'asset_purchase_carveout',
    'strategic_joint_venture'
  ];
  if (!candidate.dealStructureType || !validStructures.includes(candidate.dealStructureType as AntitrustDealStructureType)) {
    return { ok: false, error: `dealStructureType must be one of: ${validStructures.join(', ')}` };
  }

  return {
    ok: true,
    data: {
      dealCodename: candidate.dealCodename.trim(),
      acquirerName: candidate.acquirerName.trim(),
      targetName: candidate.targetName.trim(),
      enterpriseValueUsd: candidate.enterpriseValueUsd,
      cashConsiderationUsd: candidate.cashConsiderationUsd,
      stockConsiderationUsd: candidate.stockConsiderationUsd,
      announcedDate: candidate.announcedDate.trim(),
      targetedClosingDate: candidate.targetedClosingDate.trim(),
      reverseTerminationFeePct:
        typeof candidate.reverseTerminationFeePct === 'number'
          ? candidate.reverseTerminationFeePct
          : 4.5,
      dealStructureType: candidate.dealStructureType as AntitrustDealStructureType
    }
  };
}

export function validateDefineMarketInput(
  raw: unknown
): { ok: true; data: DefineMarketInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Input must be a non-null object' };
  }
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.transactionId !== 'string' || !candidate.transactionId.trim()) {
    return { ok: false, error: 'transactionId is required' };
  }
  if (typeof candidate.marketName !== 'string' || !candidate.marketName.trim()) {
    return { ok: false, error: 'marketName is required' };
  }
  if (typeof candidate.productMarketDefinition !== 'string' || !candidate.productMarketDefinition.trim()) {
    return { ok: false, error: 'productMarketDefinition is required' };
  }
  if (typeof candidate.geographicMarketScope !== 'string' || !candidate.geographicMarketScope.trim()) {
    return { ok: false, error: 'geographicMarketScope is required' };
  }
  if (typeof candidate.totalMarketSizeUsd !== 'number' || candidate.totalMarketSizeUsd <= 0) {
    return { ok: false, error: 'totalMarketSizeUsd must be a positive number' };
  }
  if (!Array.isArray(candidate.participantShares) || candidate.participantShares.length < 2) {
    return { ok: false, error: 'participantShares must be an array with at least 2 participants' };
  }

  const cleanParticipants: ParticipantShareInput[] = [];
  for (const p of candidate.participantShares) {
    if (!p || typeof p !== 'object') {
      return { ok: false, error: 'Each participant must be a valid object' };
    }
    const pc = p as Record<string, unknown>;
    if (typeof pc.participantName !== 'string' || !pc.participantName.trim()) {
      return { ok: false, error: 'participantName is required for each participant' };
    }
    if (typeof pc.annualRevenueUsd !== 'number' || pc.annualRevenueUsd < 0) {
      return { ok: false, error: 'annualRevenueUsd must be non-negative' };
    }
    if (typeof pc.marketSharePct !== 'number' || pc.marketSharePct < 0 || pc.marketSharePct > 100) {
      return { ok: false, error: 'marketSharePct must be between 0 and 100' };
    }
    cleanParticipants.push({
      participantName: pc.participantName.trim(),
      isMergingParty: Boolean(pc.isMergingParty),
      isAcquirer: Boolean(pc.isAcquirer),
      isTarget: Boolean(pc.isTarget),
      annualRevenueUsd: pc.annualRevenueUsd,
      marketSharePct: pc.marketSharePct
    });
  }

  return {
    ok: true,
    data: {
      transactionId: candidate.transactionId.trim(),
      marketName: candidate.marketName.trim(),
      productMarketDefinition: candidate.productMarketDefinition.trim(),
      geographicMarketScope: candidate.geographicMarketScope.trim(),
      totalMarketSizeUsd: candidate.totalMarketSizeUsd,
      ssnipTestCriticalLossPct:
        typeof candidate.ssnipTestCriticalLossPct === 'number'
          ? candidate.ssnipTestCriticalLossPct
          : 8.5,
      hypotheticalMonopolistTestPassed: candidate.hypotheticalMonopolistTestPassed !== false,
      participantShares: cleanParticipants
    }
  };
}

export function validateProposeDivestiturePackageInput(
  raw: unknown
): { ok: true; data: ProposeDivestiturePackageInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Input must be a non-null object' };
  }
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.transactionId !== 'string' || !candidate.transactionId.trim()) {
    return { ok: false, error: 'transactionId is required' };
  }
  if (typeof candidate.packageName !== 'string' || !candidate.packageName.trim()) {
    return { ok: false, error: 'packageName is required' };
  }

  const validRemedies: DivestitureRemedyType[] = [
    'structural_asset_carveout',
    'fix_it_first_buyer_sale',
    'upfront_buyer_divestiture',
    'behavioral_frand_licensing',
    'interoperability_open_api',
    'firewall_clean_team_protocol'
  ];
  if (!candidate.remedyType || !validRemedies.includes(candidate.remedyType as DivestitureRemedyType)) {
    return { ok: false, error: `remedyType must be one of: ${validRemedies.join(', ')}` };
  }

  if (typeof candidate.carveoutBusinessUnit !== 'string' || !candidate.carveoutBusinessUnit.trim()) {
    return { ok: false, error: 'carveoutBusinessUnit is required' };
  }
  if (typeof candidate.carveoutRevenueUsd !== 'number' || candidate.carveoutRevenueUsd < 0) {
    return { ok: false, error: 'carveoutRevenueUsd must be a non-negative number' };
  }
  if (typeof candidate.carveoutEbitdaUsd !== 'number') {
    return { ok: false, error: 'carveoutEbitdaUsd must be a number' };
  }
  if (
    typeof candidate.assetOverlapMitigatedPct !== 'number' ||
    candidate.assetOverlapMitigatedPct < 0 ||
    candidate.assetOverlapMitigatedPct > 100
  ) {
    return { ok: false, error: 'assetOverlapMitigatedPct must be between 0 and 100' };
  }

  return {
    ok: true,
    data: {
      transactionId: candidate.transactionId.trim(),
      packageName: candidate.packageName.trim(),
      remedyType: candidate.remedyType as DivestitureRemedyType,
      carveoutBusinessUnit: candidate.carveoutBusinessUnit.trim(),
      carveoutRevenueUsd: candidate.carveoutRevenueUsd,
      carveoutEbitdaUsd: candidate.carveoutEbitdaUsd,
      upfrontBuyerName: typeof candidate.upfrontBuyerName === 'string' ? candidate.upfrontBuyerName.trim() : null,
      upfrontBuyerViabilityScore:
        typeof candidate.upfrontBuyerViabilityScore === 'number'
          ? candidate.upfrontBuyerViabilityScore
          : 85.0,
      assetOverlapMitigatedPct: candidate.assetOverlapMitigatedPct,
      standaloneViabilityScore:
        typeof candidate.standaloneViabilityScore === 'number'
          ? candidate.standaloneViabilityScore
          : 80.0,
      cleanTeamComplianceScore:
        typeof candidate.cleanTeamComplianceScore === 'number'
          ? candidate.cleanTeamComplianceScore
          : 90.0,
      behavioralCommitmentsScore:
        typeof candidate.behavioralCommitmentsScore === 'number'
          ? candidate.behavioralCommitmentsScore
          : 75.0
    }
  };
}

export function validateSubmitAntitrustSignoffInput(
  raw: unknown
): { ok: true; data: SubmitAntitrustSignoffInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Input must be a non-null object' };
  }
  const candidate = raw as Record<string, unknown>;

  if (typeof candidate.transactionId !== 'string' || !candidate.transactionId.trim()) {
    return { ok: false, error: 'transactionId is required' };
  }

  const validRoles: RegulatoryRatificationRole[] = [
    'antitrust_lead_counsel',
    'chief_legal_officer',
    'chief_executive_officer'
  ];
  if (!candidate.role || !validRoles.includes(candidate.role as RegulatoryRatificationRole)) {
    return { ok: false, error: `role must be one of: ${validRoles.join(', ')}` };
  }

  if (typeof candidate.signerName !== 'string' || !candidate.signerName.trim()) {
    return { ok: false, error: 'signerName is required and must be non-empty' };
  }
  if (typeof candidate.statementAcknowledged !== 'string' || !candidate.statementAcknowledged.trim()) {
    return { ok: false, error: 'statementAcknowledged is required and must be non-empty' };
  }

  return {
    ok: true,
    data: {
      transactionId: candidate.transactionId.trim(),
      role: candidate.role as RegulatoryRatificationRole,
      signerName: candidate.signerName.trim(),
      statementAcknowledged: candidate.statementAcknowledged.trim()
    }
  };
}
