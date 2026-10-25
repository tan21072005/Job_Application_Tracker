export type ActivistCampaignPhase =
  | 'surveillance_early_detection'
  | 'private_engagement_letter'
  | 'schedule_13d_disclosure'
  | 'public_campaign_whitepaper'
  | 'formal_proxy_contest'
  | 'settlement_standstill'
  | 'vote_certification';

export type ActivistDemandType =
  | 'board_representation_seats'
  | 'strategic_alternatives_sale'
  | 'spinoff_carveout_divestiture'
  | 'capital_allocation_buybacks'
  | 'operational_cost_reduction'
  | 'executive_leadership_change'
  | 'esg_governance_reforms';

export type ActivistThreatTier =
  | 'tier_1_hostile_wolfpack'
  | 'tier_2_established_operational'
  | 'tier_3_constructivist_negotiator'
  | 'tier_4_occasional_opportunist';

export type DefenseMechanismType =
  | 'shareholder_rights_plan_poison_pill'
  | 'white_knight_pipe_equity'
  | 'standstill_settlement_agreement'
  | 'golden_parachute_amendment'
  | 'staggered_classified_board'
  | 'advance_notice_bylaw_enforcement';

export type ProxyAdvisorRecommendation =
  | 'support_management_slate'
  | 'support_dissident_slate'
  | 'split_ticket_compromise'
  | 'withhold_vote';

export type ActivismTripartiteSignoffRole =
  | 'lead_independent_director'
  | 'nominating_governance_chair'
  | 'board_chair_ceo';

export type VulnerabilityRiskBand =
  | 'low_vulnerability'
  | 'moderate_exposure'
  | 'elevated_activist_target'
  | 'acute_vulnerability_crisis';

export type ProxyCardType =
  | 'management_white_card'
  | 'dissident_gold_card'
  | 'split_card';

export interface TargetCorporation {
  id: string;
  ticker: string;
  companyName: string;
  marketCapUsd: number;
  sharesOutstanding: number;
  enterpriseValueUsd: number;
  stateOfIncorporation: string;
  isDelawareCorp: boolean;
  hasClassifiedBoard: boolean;
  hasPoisonPillInPlace: boolean;
  insiderOwnershipPct: number;
  floatPercentage: number;
}

export interface ActivistCampaign {
  id: string;
  corporationId: string;
  activistFundName: string;
  leadPartnerName: string;
  campaignPhase: ActivistCampaignPhase;
  threatTier: ActivistThreatTier;
  primaryDemand: ActivistDemandType;
  sharesHeldCount: number;
  percentageOwnership: number;
  syntheticSwapPercentage: number;
  effectiveEconomicExposure: number;
  schedule13dFilingDate: string;
  demandSummary: string;
  estimatedCampaignBudgetUsd: number;
  createdAt: string;
  updatedAt: string;
}

export interface WolfpackAccumulation {
  id: string;
  campaignId: string;
  fundName: string;
  ownershipPercentage: number;
  derivativeExposurePercentage: number;
  accumulationVelocitySharesPerDay: number;
  coordinationCorrelationScore: number;
  schedule13dCrossDate: string;
  filingDeadlineDate: string;
  isWithin5DayStatutoryWindow: boolean;
}

export interface StrategicVulnerabilityAudit {
  id: string;
  corporationId: string;
  auditDate: string;
  tsrUnderperformanceScore: number;
  roicWaccDeficitScore: number;
  sotpConglomerateDiscountScore: number;
  governanceVulnerabilityScore: number;
  capitalReturnDeficitScore: number;
  compositeVulnerabilityScore: number;
  vulnerabilityRiskBand: VulnerabilityRiskBand;
  keyVulnerabilities: string[];
}

export interface BusinessSegmentSotp {
  id: string;
  corporationId: string;
  segmentName: string;
  revenueUsd: number;
  ebitdaUsd: number;
  peerMultiple: number;
  impliedSegmentValueUsd: number;
  activistTargetValueUsd: number;
  valueUnlockingPotentialUsd: number;
}

export interface InstitutionalCohort {
  id: string;
  institutionName: string;
  cohortCategory: 'passive_index' | 'active_fundamental' | 'activist_syndicate' | 'insider_executive' | 'retail_public';
  sharesHeld: number;
  votingPowerPercentage: number;
  historicalManagementSupportRate: number;
  historicalDissidentSupportRate: number;
  issAlignmentProbability: number;
  glassLewisAlignmentProbability: number;
  engagementStatus: 'supportive' | 'undecided' | 'leaning_dissident' | 'hostile' | 'uncontacted';
  lastEngagementDate: string;
}

export interface ProxyAdvisorEvaluation {
  id: string;
  advisorName: 'ISS' | 'Glass_Lewis';
  policyStandard: string;
  contestedElectionRecommendation: ProxyAdvisorRecommendation;
  sayOnPayRecommendation: 'for' | 'against';
  governanceQualityScore: number;
  flagsList: string[];
  rationalesSummary: string;
}

export interface ShareholderRightsPlan {
  id: string;
  corporationId: string;
  planName: string;
  status: 'active_in_place' | 'shelf_ready' | 'triggered_flip_in' | 'redeemed_inactive';
  flipInThresholdPercentage: number;
  exercisePriceUsd: number;
  rightsPerShare: number;
  discountPercentage: number;
  expirationDate: string;
  redemptionPricePerRightUsd: number;
  judicialScrutinyStandard: 'Unocal_two_prong_proportionality' | 'Blasius_compelling_justification' | 'Business_judgment_rule';
}

export interface DirectorSlateNominee {
  id: string;
  seatNumber: number;
  incumbentName: string;
  incumbentYearsServed: number;
  incumbentCommitteeRoles: string;
  incumbentSkills: string;
  dissidentName: string;
  dissidentAffiliation: string;
  dissidentExpertise: string;
  proxyAdvisorRecommendedSlate: 'incumbent' | 'dissident' | 'split';
}

export interface DefenseSettlementScenario {
  id: string;
  campaignId: string;
  scenarioTitle: string;
  proposedBoardSeats: number;
  standstillDurationMonths: number;
  expenseReimbursementUsd: number;
  projectedStockImpactPct: number;
  settleNetEnterpriseValueUsd: number;
  fightNetEnterpriseValueUsd: number;
  recommendationVerdict: 'execute_standstill_settlement' | 'wage_proxy_contest_defense' | 'hybrid_governance_compromise';
}

export interface UniversalProxyContest {
  id: string;
  campaignId: string;
  annualMeetingDate: string;
  recordDate: string;
  universalProxyCertified: boolean;
  managementVotesProjected: number;
  dissidentVotesProjected: number;
  undecidedVotesProjected: number;
  managementWinProbability: number;
  dissidentWinProbability: number;
  projectedDissidentSeatsWon: number;
}

export interface ActivismSignoffRoleDetails {
  isSigned: boolean;
  signoffSignerName?: string;
  signoffTimestamp?: string;
  statementAcknowledged?: string;
}

export interface ActivismTripartiteSignoffRecord {
  id: string;
  campaignId: string;
  defensePlanTitle: string;
  leadDirectorSignoff: ActivismSignoffRoleDetails;
  governanceChairSignoff: ActivismSignoffRoleDetails;
  boardChairCeoSignoff: ActivismSignoffRoleDetails;
  isFullyRatified: boolean;
  cryptographicIntegrityHash: string;
}

export interface ActivismEventLog {
  id: string;
  campaignId: string;
  eventTimestamp: string;
  eventCategory: 'surveillance' | 'filing' | 'engagement' | 'defense_action' | 'proxy_advisory' | 'vote_tally';
  headline: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ShareholderActivismOverview {
  targetCorporation: TargetCorporation;
  primaryCampaign: ActivistCampaign;
  wolfpackAccumulations: WolfpackAccumulation[];
  wolfpackCoordinationIndex: number;
  vulnerabilityAudit: StrategicVulnerabilityAudit;
  sotpSegments: BusinessSegmentSotp[];
  institutionalCohorts: InstitutionalCohort[];
  proxyAdvisorEvaluations: ProxyAdvisorEvaluation[];
  rightsPlan: ShareholderRightsPlan;
  directorNominees: DirectorSlateNominee[];
  settlementScenarios: DefenseSettlementScenario[];
  proxyContest: UniversalProxyContest;
  tripartiteSignoff: ActivismTripartiteSignoffRecord;
  eventLogs: ActivismEventLog[];
}

export interface CreateActivistCampaignInput {
  activistFundName: string;
  leadPartnerName: string;
  campaignPhase: ActivistCampaignPhase;
  threatTier: ActivistThreatTier;
  primaryDemand: ActivistDemandType;
  sharesHeldCount: number;
  percentageOwnership: number;
  syntheticSwapPercentage: number;
  schedule13dFilingDate: string;
  demandSummary: string;
  estimatedCampaignBudgetUsd?: number;
}

export interface RegisterWolfpackAccumulationInput {
  campaignId: string;
  fundName: string;
  ownershipPercentage: number;
  derivativeExposurePercentage: number;
  accumulationVelocitySharesPerDay: number;
  coordinationCorrelationScore: number;
  schedule13dCrossDate: string;
}

export interface DeployRightsPlanInput {
  planName: string;
  flipInThresholdPercentage: number;
  exercisePriceUsd: number;
  discountPercentage: number;
  expirationDate: string;
}

export interface RecordNomineeComparisonInput {
  seatNumber: number;
  incumbentName: string;
  incumbentYearsServed: number;
  incumbentCommitteeRoles: string;
  incumbentSkills: string;
  dissidentName: string;
  dissidentAffiliation: string;
  dissidentExpertise: string;
  proxyAdvisorRecommendedSlate: 'incumbent' | 'dissident' | 'split';
}

export interface SubmitActivismSignoffInput {
  campaignId: string;
  role: ActivismTripartiteSignoffRole;
  signerName: string;
  statementAcknowledged: string;
}

export function calculateWolfpackCoordinationIndex(
  accumulations: Array<{
    ownershipPercentage: number;
    derivativeExposurePercentage: number;
    coordinationCorrelationScore: number;
  }>,
  lookbackDays: number = 30
): number {
  if (!accumulations || accumulations.length === 0) return 0.0;
  const safeDays = Math.max(1, lookbackDays);
  let totalWeightedAccumulation = 0;
  let correlationSum = 0;

  for (const acc of accumulations) {
    const totalExposure = acc.ownershipPercentage + acc.derivativeExposurePercentage;
    totalWeightedAccumulation += totalExposure * 2.5;
    correlationSum += acc.coordinationCorrelationScore;
  }

  const avgCorrelation = correlationSum / accumulations.length;
  const correlationMultiplier = 1.0 + Math.min(2.0, avgCorrelation / 50.0);
  const rawIndex = (totalWeightedAccumulation / safeDays) * 10.0 * correlationMultiplier;
  return Number(Math.min(100.0, Math.max(0.0, rawIndex)).toFixed(2));
}

export function calculateActivistVulnerabilityScore(
  tsrScore: number,
  roicScore: number,
  sotpScore: number,
  govScore: number,
  capitalReturnScore: number
): {
  compositeVulnerabilityScore: number;
  vulnerabilityRiskBand: VulnerabilityRiskBand;
} {
  const clamp = (v: number) => Math.min(100, Math.max(0, v));
  const cTsr = clamp(tsrScore);
  const cRoic = clamp(roicScore);
  const cSotp = clamp(sotpScore);
  const cGov = clamp(govScore);
  const cCap = clamp(capitalReturnScore);

  const composite = Number(
    (0.30 * cTsr + 0.25 * cRoic + 0.20 * cSotp + 0.15 * cGov + 0.10 * cCap).toFixed(2)
  );

  let vulnerabilityRiskBand: VulnerabilityRiskBand = 'low_vulnerability';
  if (composite >= 75.0) {
    vulnerabilityRiskBand = 'acute_vulnerability_crisis';
  } else if (composite >= 60.0) {
    vulnerabilityRiskBand = 'elevated_activist_target';
  } else if (composite >= 40.0) {
    vulnerabilityRiskBand = 'moderate_exposure';
  }

  return {
    compositeVulnerabilityScore: composite,
    vulnerabilityRiskBand
  };
}

export function calculatePoisonPillDilution(
  sharesOutstanding: number,
  acquirerOwnershipPct: number,
  exercisePrice: number,
  marketPrice: number,
  discountPct: number = 50
): {
  postDilutionAcquirerPct: number;
  dilutionFactor: number;
  nonAcquirerGainPct: number;
  economicDeterrenceEffect: string;
} {
  const safeShares = Math.max(1, sharesOutstanding);
  const acquirerFrac = Math.min(0.99, Math.max(0.01, acquirerOwnershipPct / 100));
  const discountFrac = Math.min(0.90, Math.max(0.10, discountPct / 100));

  const sharesPerRight = exercisePrice / (marketPrice * (1.0 - discountFrac));
  const nonAcquirerShareFrac = 1.0 - acquirerFrac;
  const newSharesIssuedFrac = nonAcquirerShareFrac * sharesPerRight;

  const postAcquirerFrac = acquirerFrac / (1.0 + newSharesIssuedFrac);
  const postDilutionAcquirerPct = Number((postAcquirerFrac * 100).toFixed(2));
  const dilutionFactor = Number((acquirerFrac / postAcquirerFrac).toFixed(2));
  const nonAcquirerGainPct = Number(((1.0 - postAcquirerFrac) * 100).toFixed(2));

  let economicDeterrenceEffect = 'Severe Acquirer Wealth Destruction & Voting Dilution';
  if (dilutionFactor > 2.0) {
    economicDeterrenceEffect = 'Existential Dilution Barrier (Acquirer Voting Power Cut by >50%)';
  } else if (dilutionFactor > 1.4) {
    economicDeterrenceEffect = 'Substantial Deterrence Barrier';
  }

  return {
    postDilutionAcquirerPct,
    dilutionFactor,
    nonAcquirerGainPct,
    economicDeterrenceEffect
  };
}

export function simulateUniversalProxyContest(
  cohorts: Array<{
    votingPowerPercentage: number;
    historicalManagementSupportRate: number;
    issAlignmentProbability: number;
    glassLewisAlignmentProbability: number;
  }>,
  issRec: ProxyAdvisorRecommendation,
  glRec: ProxyAdvisorRecommendation,
  contestedSeats: number = 3
): {
  managementVotesProjected: number;
  dissidentVotesProjected: number;
  undecidedVotesProjected: number;
  managementWinProbability: number;
  dissidentWinProbability: number;
  projectedDissidentSeatsWon: number;
} {
  let mgmtVotes = 0;
  let dissVotes = 0;
  let undecVotes = 0;

  for (const c of cohorts) {
    let mgmtProb = c.historicalManagementSupportRate / 100;
    if (issRec === 'support_dissident_slate') {
      mgmtProb -= (c.issAlignmentProbability / 100) * 0.25;
    } else if (issRec === 'support_management_slate') {
      mgmtProb += (c.issAlignmentProbability / 100) * 0.15;
    }

    if (glRec === 'support_dissident_slate') {
      mgmtProb -= (c.glassLewisAlignmentProbability / 100) * 0.20;
    } else if (glRec === 'support_management_slate') {
      mgmtProb += (c.glassLewisAlignmentProbability / 100) * 0.10;
    }

    mgmtProb = Math.min(0.95, Math.max(0.05, mgmtProb));
    const dissProb = 1.0 - mgmtProb;

    const allocatedMgmt = c.votingPowerPercentage * mgmtProb;
    const allocatedDiss = c.votingPowerPercentage * dissProb * 0.85;
    const allocatedUndec = c.votingPowerPercentage - (allocatedMgmt + allocatedDiss);

    mgmtVotes += allocatedMgmt;
    dissVotes += allocatedDiss;
    undecVotes += Math.max(0, allocatedUndec);
  }

  const totalDecided = mgmtVotes + dissVotes;
  const mgmtRatio = totalDecided > 0 ? mgmtVotes / totalDecided : 0.5;
  const managementWinProbability = Number((mgmtRatio * 100).toFixed(1));
  const dissidentWinProbability = Number(((1.0 - mgmtRatio) * 100).toFixed(1));

  let projectedDissidentSeatsWon = 0;
  if (dissidentWinProbability >= 70.0) {
    projectedDissidentSeatsWon = contestedSeats;
  } else if (dissidentWinProbability >= 50.0) {
    projectedDissidentSeatsWon = Math.ceil(contestedSeats * 0.6);
  } else if (dissidentWinProbability >= 35.0) {
    projectedDissidentSeatsWon = 1;
  }

  return {
    managementVotesProjected: Number(mgmtVotes.toFixed(2)),
    dissidentVotesProjected: Number(dissVotes.toFixed(2)),
    undecidedVotesProjected: Number(undecVotes.toFixed(2)),
    managementWinProbability,
    dissidentWinProbability,
    projectedDissidentSeatsWon
  };
}

export function calculateSettleVsFightValue(
  settlementImpactPct: number,
  fightImpactPct: number,
  baselineEvUsd: number,
  contestDefenseCostsUsd: number = 15000000
): {
  settleNetEnterpriseValueUsd: number;
  fightNetEnterpriseValueUsd: number;
  netAdvantageUsd: number;
  recommendedCourse: 'execute_standstill_settlement' | 'wage_proxy_contest_defense' | 'hybrid_governance_compromise';
} {
  const settleEv = baselineEvUsd * (1.0 + settlementImpactPct / 100);
  const fightEv = baselineEvUsd * (1.0 + fightImpactPct / 100) - contestDefenseCostsUsd;
  const netAdvantageUsd = Number((settleEv - fightEv).toFixed(2));

  let recommendedCourse: 'execute_standstill_settlement' | 'wage_proxy_contest_defense' | 'hybrid_governance_compromise' = 'hybrid_governance_compromise';
  if (netAdvantageUsd > 50000000) {
    recommendedCourse = 'execute_standstill_settlement';
  } else if (netAdvantageUsd < -50000000) {
    recommendedCourse = 'wage_proxy_contest_defense';
  }

  return {
    settleNetEnterpriseValueUsd: Number(settleEv.toFixed(2)),
    fightNetEnterpriseValueUsd: Number(fightEv.toFixed(2)),
    netAdvantageUsd,
    recommendedCourse
  };
}

export function validateCreateActivistCampaignInput(input: any): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be an object' } };
  }

  if (!input.activistFundName || typeof input.activistFundName !== 'string' || !input.activistFundName.trim()) {
    errors.activistFundName = 'Activist fund name is required';
  }
  if (!input.leadPartnerName || typeof input.leadPartnerName !== 'string' || !input.leadPartnerName.trim()) {
    errors.leadPartnerName = 'Lead partner name is required';
  }
  if (!input.demandSummary || typeof input.demandSummary !== 'string' || !input.demandSummary.trim()) {
    errors.demandSummary = 'Demand summary is required';
  }
  if (typeof input.sharesHeldCount !== 'number' || input.sharesHeldCount <= 0) {
    errors.sharesHeldCount = 'Shares held count must be positive';
  }
  if (typeof input.percentageOwnership !== 'number' || input.percentageOwnership <= 0 || input.percentageOwnership > 100) {
    errors.percentageOwnership = 'Percentage ownership must be between 0 and 100';
  }

  const validPhases: ActivistCampaignPhase[] = [
    'surveillance_early_detection',
    'private_engagement_letter',
    'schedule_13d_disclosure',
    'public_campaign_whitepaper',
    'formal_proxy_contest',
    'settlement_standstill',
    'vote_certification'
  ];
  if (input.campaignPhase && !validPhases.includes(input.campaignPhase)) {
    errors.campaignPhase = 'Invalid campaign phase';
  }

  const validDemands: ActivistDemandType[] = [
    'board_representation_seats',
    'strategic_alternatives_sale',
    'spinoff_carveout_divestiture',
    'capital_allocation_buybacks',
    'operational_cost_reduction',
    'executive_leadership_change',
    'esg_governance_reforms'
  ];
  if (input.primaryDemand && !validDemands.includes(input.primaryDemand)) {
    errors.primaryDemand = 'Invalid primary demand';
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, isValid: ok, errors };
}

export function validateRegisterWolfpackAccumulationInput(input: any): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be an object' } };
  }

  if (!input.campaignId || typeof input.campaignId !== 'string') {
    errors.campaignId = 'Campaign ID is required';
  }
  if (!input.fundName || typeof input.fundName !== 'string' || !input.fundName.trim()) {
    errors.fundName = 'Fund name is required';
  }
  if (typeof input.ownershipPercentage !== 'number' || input.ownershipPercentage < 0 || input.ownershipPercentage > 100) {
    errors.ownershipPercentage = 'Ownership percentage must be between 0 and 100';
  }
  if (typeof input.derivativeExposurePercentage !== 'number' || input.derivativeExposurePercentage < 0 || input.derivativeExposurePercentage > 100) {
    errors.derivativeExposurePercentage = 'Derivative exposure percentage must be between 0 and 100';
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, isValid: ok, errors };
}

export function validateDeployRightsPlanInput(input: any): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be an object' } };
  }

  if (!input.planName || typeof input.planName !== 'string' || !input.planName.trim()) {
    errors.planName = 'Plan name is required';
  }
  if (typeof input.flipInThresholdPercentage !== 'number' || input.flipInThresholdPercentage < 5 || input.flipInThresholdPercentage > 25) {
    errors.flipInThresholdPercentage = 'Flip-in threshold must be between 5% and 25%';
  }
  if (typeof input.exercisePriceUsd !== 'number' || input.exercisePriceUsd <= 0) {
    errors.exercisePriceUsd = 'Exercise price must be positive';
  }
  if (typeof input.discountPercentage !== 'number' || input.discountPercentage < 10 || input.discountPercentage > 90) {
    errors.discountPercentage = 'Discount percentage must be between 10% and 90%';
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, isValid: ok, errors };
}

export function validateRecordNomineeComparisonInput(input: any): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be an object' } };
  }

  if (typeof input.seatNumber !== 'number' || input.seatNumber <= 0) {
    errors.seatNumber = 'Seat number must be positive integer';
  }
  if (!input.incumbentName || typeof input.incumbentName !== 'string' || !input.incumbentName.trim()) {
    errors.incumbentName = 'Incumbent name is required';
  }
  if (!input.dissidentName || typeof input.dissidentName !== 'string' || !input.dissidentName.trim()) {
    errors.dissidentName = 'Dissident name is required';
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, isValid: ok, errors };
}

export function validateSubmitActivismSignoffInput(input: any): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be an object' } };
  }

  if (!input.campaignId || typeof input.campaignId !== 'string') {
    errors.campaignId = 'Campaign ID is required';
  }
  const validRoles: ActivismTripartiteSignoffRole[] = [
    'lead_independent_director',
    'nominating_governance_chair',
    'board_chair_ceo'
  ];
  if (!input.role || !validRoles.includes(input.role)) {
    errors.role = 'Valid tripartite signoff role is required';
  }
  if (!input.signerName || typeof input.signerName !== 'string' || !input.signerName.trim()) {
    errors.signerName = 'Signer name is required';
  }

  const ok = Object.keys(errors).length === 0;
  return { ok, isValid: ok, errors };
}
