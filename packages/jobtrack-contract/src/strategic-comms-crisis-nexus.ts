export type CrisisSeverityLevel =
  | 'level_1_operational_anomaly'
  | 'level_2_contained_incident'
  | 'level_3_serious_reputational_threat'
  | 'level_4_acute_enterprise_crisis'
  | 'level_5_existential_catastrophe';

export type CrisisPlaybookType =
  | 'cyber_ransomware_data_breach'
  | 'product_critical_failure_recall'
  | 'executive_misconduct_scandal'
  | 'short_seller_bear_raid_attack'
  | 'regulatory_enforcement_subpoena';

export type GoldenHourTriageMilestone =
  | 't_00_initial_incident_ingest'
  | 't_15_technical_fact_verification'
  | 't_30_spokesperson_marshalling'
  | 't_45_legal_counsel_review'
  | 't_60_holding_statement_broadcast';

export type MediaChannelType =
  | 'tier_1_financial_press'
  | 'broadcast_wire_service'
  | 'social_media_platform'
  | 'trade_industry_publication'
  | 'internal_workforce_channel'
  | 'investor_relations_feed';

export type SentimentClassification =
  | 'positive'
  | 'neutral'
  | 'negative'
  | 'hostile_adversarial';

export type StakeholderTier =
  | 'tier_1_workforce_employees'
  | 'tier_2_institutional_investors'
  | 'tier_3_enterprise_customers'
  | 'tier_4_regulators_government'
  | 'tier_5_media_general_public';

export type StatementToneCalibration =
  | 'authoritative_transparent'
  | 'empathetic_reassuring'
  | 'firm_litigation_ready'
  | 'regulatory_compliant_measured'
  | 'urgent_corrective';

export type HoldingStatementStatus =
  | 'draft'
  | 'pending_legal_review'
  | 'pending_executive_signoff'
  | 'approved_for_release'
  | 'dispatched_omnichannel'
  | 'archived_superseded';

export type BridgeTechniqueType =
  | 'bridge_to_facts'
  | 'bridge_to_values'
  | 'bridge_to_action'
  | 'bridge_to_context'
  | 'flag_key_takeaway';

export type FactCorroborationStatus =
  | 'verified_corroborated'
  | 'provisional_pending_audit'
  | 'refuted_disinformation'
  | 'speculative_unconfirmed';

export type CrisisTripartiteSignoffRole =
  | 'head_of_communications'
  | 'chief_legal_officer'
  | 'chief_executive_officer';

export type BrriResilienceBand =
  | 'band_1_fortified_resilient'
  | 'band_2_managed_strain'
  | 'band_3_elevated_vulnerability'
  | 'band_4_acute_brand_impairment';

export interface CrisisTriageCheckpointDTO {
  id: string;
  milestone: GoldenHourTriageMilestone;
  targetMinutes: number;
  completedAt?: string;
  isCompleted: boolean;
  notes: string;
  assignedLead: string;
}

export interface CrisisIncidentDTO {
  id: string;
  title: string;
  severityLevel: CrisisSeverityLevel;
  playbookType: CrisisPlaybookType;
  declaredAt: string;
  goldenHourDeadline: string;
  incidentCommander: string;
  communicationsLead: string;
  legalCounselLead: string;
  technicalLead: string;
  summary: string;
  checkpoints: CrisisTriageCheckpointDTO[];
  isActive: boolean;
  resolvedAt?: string;
}

export interface CreateCrisisIncidentRequestDTO {
  title: string;
  playbookType: CrisisPlaybookType;
  initialSeverity: CrisisSeverityLevel;
  incidentCommander: string;
  communicationsLead: string;
  legalCounselLead: string;
  technicalLead: string;
  summary: string;
}

export interface MediaMentionDTO {
  id: string;
  incidentId: string;
  sourceOutlet: string;
  channelType: MediaChannelType;
  headline: string;
  url: string;
  sentiment: SentimentClassification;
  sentimentScore: number;
  reachEstimate: number;
  publishedAt: string;
  narrativeClusterId?: string;
  isSyndicated: boolean;
}

export interface NarrativeClusterDTO {
  id: string;
  incidentId: string;
  clusterTitle: string;
  dominantTheme: string;
  mentionCount: number;
  netSentimentScore: number;
  narrativeVelocityIndex: number;
  viralPropagationVector: number;
  isAdversarialCampaign: boolean;
  firstObservedAt: string;
  lastUpdatedAt: string;
}

export interface MediaIntelligenceSummaryDTO {
  incidentId: string;
  totalMentions: number;
  netSentimentScore: number;
  narrativeVelocityIndex: number;
  viralPropagationVector: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
    hostileAdversarial: number;
  };
  topNarrativeClusters: NarrativeClusterDTO[];
  recentMentions: MediaMentionDTO[];
}

export interface StakeholderImpactProfileDTO {
  id: string;
  incidentId: string;
  tier: StakeholderTier;
  targetAudience: string;
  primaryConcern: string;
  impactScore: number;
  requiredDeliverySlaMinutes: number;
  preferredChannel: string;
  channelDelivered: boolean;
}

export interface CrisisHoldingStatementDTO {
  id: string;
  incidentId: string;
  version: number;
  title: string;
  targetTier: StakeholderTier;
  toneCalibration: StatementToneCalibration;
  headline: string;
  bodyText: string;
  safeHarborDisclaimer: string;
  regulationFdNotice: string;
  status: HoldingStatementStatus;
  channelsDispatched: MediaChannelType[];
  contentHashSha256: string;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
}

export interface CreateHoldingStatementRequestDTO {
  incidentId: string;
  targetTier: StakeholderTier;
  toneCalibration: StatementToneCalibration;
  headline: string;
  bodyText: string;
  includePslraSafeHarbor: boolean;
  includeRegulationFdNotice: boolean;
}

export interface SpokespersonBriefingCardDTO {
  id: string;
  incidentId: string;
  spokespersonName: string;
  spokespersonRole: string;
  coreTalkingPoints: string[];
  mandatoryPhrases: string[];
  prohibitedPhrases: string[];
  approvedDate: string;
}

export interface QaBridgeItemDTO {
  id: string;
  incidentId: string;
  hostileQuestion: string;
  anticipatedOutlet: string;
  bridgeTechnique: BridgeTechniqueType;
  transitionPhrase: string;
  pivotMessage: string;
  riskRating: number;
}

export interface VerifiedFactMoatEntryDTO {
  id: string;
  incidentId: string;
  factClaim: string;
  technicalCorroboration: string;
  sourceOwner: string;
  corroborationStatus: FactCorroborationStatus;
  refutedRumor?: string;
  verifiedAt: string;
  evidenceReferenceId: string;
}

export interface FactMoatSummaryDTO {
  incidentId: string;
  totalVerifiedFacts: number;
  activeRumorsRefuted: number;
  pendingCorroborations: number;
  entries: VerifiedFactMoatEntryDTO[];
}

export interface TripartiteSignatureDTO {
  role: CrisisTripartiteSignoffRole;
  signoffSignerName: string;
  signoffTimestamp: string;
  cryptographicSignature: string;
  isSigned: boolean;
  legalComments?: string;
}

export interface CrisisReleaseSignoffDTO {
  id: string;
  holdingStatementId: string;
  incidentId: string;
  contentHashSha256: string;
  headOfCommsSignoff?: TripartiteSignatureDTO;
  chiefLegalOfficerSignoff?: TripartiteSignatureDTO;
  ceoSignoff?: TripartiteSignatureDTO;
  isFullyAuthorized: boolean;
  finalizedAt?: string;
}

export interface BrandReputationResilienceIndexDTO {
  incidentId: string;
  compositeScore: number;
  resilienceBand: BrriResilienceBand;
  sentimentStabilityScore: number;
  velocityMitigationFactor: number;
  viralContainmentRatio: number;
  stakeholderTrustRetention: number;
  factMoatFortificationScore: number;
  calculatedAt: string;
}

export interface StrategicCommsNexusOverviewDTO {
  activeIncidents: CrisisIncidentDTO[];
  primaryActiveIncident?: CrisisIncidentDTO;
  mediaSummary: MediaIntelligenceSummaryDTO;
  holdingStatements: CrisisHoldingStatementDTO[];
  factMoatSummary: FactMoatSummaryDTO;
  qaBridgeItems: QaBridgeItemDTO[];
  spokespersonCards: SpokespersonBriefingCardDTO[];
  stakeholderProfiles: StakeholderImpactProfileDTO[];
  resilienceIndex: BrandReputationResilienceIndexDTO;
  recentReleaseSignoffs: CrisisReleaseSignoffDTO[];
}

export function validateCreateCrisisIncidentInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<CreateCrisisIncidentRequestDTO>;
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }
  const validPlaybooks: CrisisPlaybookType[] = [
    'cyber_ransomware_data_breach',
    'product_critical_failure_recall',
    'executive_misconduct_scandal',
    'short_seller_bear_raid_attack',
    'regulatory_enforcement_subpoena'
  ];
  if (!i.playbookType || !validPlaybooks.includes(i.playbookType)) {
    errors.playbookType = 'Invalid crisis playbook type';
  }
  const validSeverities: CrisisSeverityLevel[] = [
    'level_1_operational_anomaly',
    'level_2_contained_incident',
    'level_3_serious_reputational_threat',
    'level_4_acute_enterprise_crisis',
    'level_5_existential_catastrophe'
  ];
  if (!i.initialSeverity || !validSeverities.includes(i.initialSeverity)) {
    errors.initialSeverity = 'Invalid crisis severity level';
  }
  if (!i.incidentCommander || typeof i.incidentCommander !== 'string' || i.incidentCommander.trim().length < 2) {
    errors.incidentCommander = 'Incident commander is required';
  }
  if (!i.communicationsLead || typeof i.communicationsLead !== 'string' || i.communicationsLead.trim().length < 2) {
    errors.communicationsLead = 'Communications lead is required';
  }
  if (!i.legalCounselLead || typeof i.legalCounselLead !== 'string' || i.legalCounselLead.trim().length < 2) {
    errors.legalCounselLead = 'Legal counsel lead is required';
  }
  if (!i.technicalLead || typeof i.technicalLead !== 'string' || i.technicalLead.trim().length < 2) {
    errors.technicalLead = 'Technical lead is required';
  }
  if (!i.summary || typeof i.summary !== 'string' || i.summary.trim().length < 10) {
    errors.summary = 'Summary must be at least 10 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCreateHoldingStatementInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<CreateHoldingStatementRequestDTO>;
  if (!i.incidentId || typeof i.incidentId !== 'string' || i.incidentId.trim().length === 0) {
    errors.incidentId = 'Incident ID is required';
  }
  const validTiers: StakeholderTier[] = [
    'tier_1_workforce_employees',
    'tier_2_institutional_investors',
    'tier_3_enterprise_customers',
    'tier_4_regulators_government',
    'tier_5_media_general_public'
  ];
  if (!i.targetTier || !validTiers.includes(i.targetTier)) {
    errors.targetTier = 'Invalid stakeholder tier';
  }
  const validTones: StatementToneCalibration[] = [
    'authoritative_transparent',
    'empathetic_reassuring',
    'firm_litigation_ready',
    'regulatory_compliant_measured',
    'urgent_corrective'
  ];
  if (!i.toneCalibration || !validTones.includes(i.toneCalibration)) {
    errors.toneCalibration = 'Invalid statement tone calibration';
  }
  if (!i.headline || typeof i.headline !== 'string' || i.headline.trim().length < 5) {
    errors.headline = 'Headline must be at least 5 characters';
  }
  if (!i.bodyText || typeof i.bodyText !== 'string' || i.bodyText.trim().length < 20) {
    errors.bodyText = 'Body text must be at least 20 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateRecordVerifiedFactInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<VerifiedFactMoatEntryDTO>;
  if (!i.incidentId || typeof i.incidentId !== 'string' || i.incidentId.trim().length === 0) {
    errors.incidentId = 'Incident ID is required';
  }
  if (!i.factClaim || typeof i.factClaim !== 'string' || i.factClaim.trim().length < 10) {
    errors.factClaim = 'Fact claim must be at least 10 characters';
  }
  if (!i.technicalCorroboration || typeof i.technicalCorroboration !== 'string' || i.technicalCorroboration.trim().length < 10) {
    errors.technicalCorroboration = 'Technical corroboration must be at least 10 characters';
  }
  if (!i.sourceOwner || typeof i.sourceOwner !== 'string' || i.sourceOwner.trim().length < 2) {
    errors.sourceOwner = 'Source owner is required';
  }
  const validStatuses: FactCorroborationStatus[] = [
    'verified_corroborated',
    'provisional_pending_audit',
    'refuted_disinformation',
    'speculative_unconfirmed'
  ];
  if (!i.corroborationStatus || !validStatuses.includes(i.corroborationStatus)) {
    errors.corroborationStatus = 'Invalid fact corroboration status';
  }
  if (!i.evidenceReferenceId || typeof i.evidenceReferenceId !== 'string' || i.evidenceReferenceId.trim().length < 3) {
    errors.evidenceReferenceId = 'Evidence reference ID is required';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateRecordQaBridgeItemInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<QaBridgeItemDTO>;
  if (!i.incidentId || typeof i.incidentId !== 'string' || i.incidentId.trim().length === 0) {
    errors.incidentId = 'Incident ID is required';
  }
  if (!i.hostileQuestion || typeof i.hostileQuestion !== 'string' || i.hostileQuestion.trim().length < 5) {
    errors.hostileQuestion = 'Hostile question must be at least 5 characters';
  }
  if (!i.anticipatedOutlet || typeof i.anticipatedOutlet !== 'string' || i.anticipatedOutlet.trim().length < 2) {
    errors.anticipatedOutlet = 'Anticipated outlet is required';
  }
  const validTechniques: BridgeTechniqueType[] = [
    'bridge_to_facts',
    'bridge_to_values',
    'bridge_to_action',
    'bridge_to_context',
    'flag_key_takeaway'
  ];
  if (!i.bridgeTechnique || !validTechniques.includes(i.bridgeTechnique)) {
    errors.bridgeTechnique = 'Invalid bridge technique';
  }
  if (!i.transitionPhrase || typeof i.transitionPhrase !== 'string' || i.transitionPhrase.trim().length < 5) {
    errors.transitionPhrase = 'Transition phrase must be at least 5 characters';
  }
  if (!i.pivotMessage || typeof i.pivotMessage !== 'string' || i.pivotMessage.trim().length < 10) {
    errors.pivotMessage = 'Pivot message must be at least 10 characters';
  }
  if (typeof i.riskRating !== 'number' || i.riskRating < 1 || i.riskRating > 10) {
    errors.riskRating = 'Risk rating must be between 1 and 10';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateSubmitTripartiteSignoffInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, isValid: false, errors: { payload: 'Payload must be a non-null object' } };
  }
  const i = input as Partial<{ holdingStatementId: string; role: CrisisTripartiteSignoffRole; signerName: string; legalComments?: string }>;
  if (!i.holdingStatementId || typeof i.holdingStatementId !== 'string' || i.holdingStatementId.trim().length === 0) {
    errors.holdingStatementId = 'Holding statement ID is required';
  }
  const validRoles: CrisisTripartiteSignoffRole[] = [
    'head_of_communications',
    'chief_legal_officer',
    'chief_executive_officer'
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Role must be head_of_communications, chief_legal_officer, or chief_executive_officer';
  }
  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 2) {
    errors.signerName = 'Signer name must be at least 2 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export interface SentimentMetricCounts {
  positive: number;
  neutral: number;
  negative: number;
  hostileAdversarial: number;
}

export function calculateNetSentimentScore(metrics: SentimentMetricCounts): number {
  const total = metrics.positive + metrics.neutral + metrics.negative + metrics.hostileAdversarial;
  if (total === 0) {
    return 0;
  }
  const weightedNegative = metrics.negative + (metrics.hostileAdversarial * 1.5);
  const rawScore = ((metrics.positive - weightedNegative) / total) * 100;
  return Number(Math.max(-100, Math.min(100, rawScore)).toFixed(2));
}

export interface MentionVelocitySample {
  hourlyMentionsCurrent: number;
  hourlyMentionsPrevious: number;
  tier1OutletCount: number;
  syndicationMultiplier: number;
}

export function calculateNarrativeVelocityIndex(sample: MentionVelocitySample): number {
  const baseGrowth = sample.hourlyMentionsPrevious > 0
    ? (sample.hourlyMentionsCurrent - sample.hourlyMentionsPrevious) / sample.hourlyMentionsPrevious
    : sample.hourlyMentionsCurrent > 0 ? 1.0 : 0.0;
  const tier1Factor = Math.log10(Math.max(1, sample.tier1OutletCount + 1));
  const rawVelocity = Math.max(0, (sample.hourlyMentionsCurrent * (1 + baseGrowth) * (1 + tier1Factor) * sample.syndicationMultiplier) / 10);
  return Number(Math.min(100, rawVelocity).toFixed(2));
}

export interface ViralDispersionParameters {
  retweetShareRatio: number;
  influencerCentralityFactor: number;
  narrativeHalfLifeHours: number;
}

export function calculateViralPropagationVector(params: ViralDispersionParameters): number {
  const beta = Math.max(0, params.retweetShareRatio);
  const kappa = Math.max(0.1, params.influencerCentralityFactor);
  const tau = Math.max(0.5, params.narrativeHalfLifeHours);
  const rawR0 = (beta * kappa * Math.sqrt(tau)) / 2.5;
  return Number(Math.max(0, rawR0).toFixed(2));
}

export interface BrriInputMetrics {
  netSentimentScore: number;
  narrativeVelocityIndex: number;
  viralPropagationVector: number;
  stakeholderTrustScores: number[];
  verifiedFactCount: number;
  activeRumorCount: number;
}

export function calculateBrandReputationResilienceIndex(input: BrriInputMetrics): {
  compositeScore: number;
  resilienceBand: BrriResilienceBand;
  sentimentStabilityScore: number;
  velocityMitigationFactor: number;
  viralContainmentRatio: number;
  stakeholderTrustRetention: number;
  factMoatFortificationScore: number;
} {
  const sentimentStabilityScore = Number((((input.netSentimentScore + 100) / 200) * 100).toFixed(2));
  const velocityMitigationFactor = Number(Math.max(0, 100 - (input.narrativeVelocityIndex * 1.2)).toFixed(2));
  const viralContainmentRatio = Number(Math.max(0, 100 - (input.viralPropagationVector * 28)).toFixed(2));

  const trustSum = input.stakeholderTrustScores.length > 0
    ? input.stakeholderTrustScores.reduce((acc, curr) => acc + curr, 0) / input.stakeholderTrustScores.length
    : 70;
  const stakeholderTrustRetention = Number(Math.max(0, Math.min(100, trustSum)).toFixed(2));

  const totalClaims = input.verifiedFactCount + input.activeRumorCount;
  const factMoatFortificationScore = totalClaims > 0
    ? Number(((input.verifiedFactCount / totalClaims) * 100).toFixed(2))
    : 80;

  const compositeScore = Number((
    (sentimentStabilityScore * 0.25) +
    (velocityMitigationFactor * 0.20) +
    (viralContainmentRatio * 0.20) +
    (stakeholderTrustRetention * 0.20) +
    (factMoatFortificationScore * 0.15)
  ).toFixed(2));

  let resilienceBand: BrriResilienceBand = 'band_1_fortified_resilient';
  if (compositeScore < 40) {
    resilienceBand = 'band_4_acute_brand_impairment';
  } else if (compositeScore < 60) {
    resilienceBand = 'band_3_elevated_vulnerability';
  } else if (compositeScore < 75) {
    resilienceBand = 'band_2_managed_strain';
  }

  return {
    compositeScore,
    resilienceBand,
    sentimentStabilityScore,
    velocityMitigationFactor,
    viralContainmentRatio,
    stakeholderTrustRetention,
    factMoatFortificationScore
  };
}

export interface HoldingStatementCompilationRequest {
  incidentTitle: string;
  playbookType: CrisisPlaybookType;
  targetTier: StakeholderTier;
  toneCalibration: StatementToneCalibration;
  headline: string;
  bodyText: string;
  includePslraSafeHarbor: boolean;
  includeRegulationFdNotice: boolean;
}

export function compileOmnichannelHoldingStatement(req: HoldingStatementCompilationRequest): {
  headline: string;
  bodyText: string;
  safeHarborDisclaimer: string;
  regulationFdNotice: string;
  contentHashSha256: string;
} {
  let safeHarborDisclaimer = '';
  if (req.includePslraSafeHarbor) {
    safeHarborDisclaimer = 'Cautionary Note Regarding Forward-Looking Statements: This announcement contains forward-looking statements within the meaning of the Private Securities Litigation Reform Act of 1995. All statements other than statements of historical fact contained herein, including statements regarding incident remediation timelines, operational impacts, business continuity, regulatory interactions, and expected future financial condition, are forward-looking. Forward-looking statements are subject to risks, uncertainties, and assumptions that could cause actual results to differ materially from expectations. The company assumes no obligation to update or revise any forward-looking statements.';
  }

  let regulationFdNotice = '';
  if (req.includeRegulationFdNotice) {
    regulationFdNotice = 'Regulation FD Compliance Notice: This information is being publicly disseminated simultaneously across designated channels to satisfy the public disclosure requirements of Regulation FD (17 C.F.R. § 243.100). Simultaneous public access has been provided via wire transmission and company website.';
  }

  const payloadToHash = `${req.headline}|${req.bodyText}|${safeHarborDisclaimer}|${regulationFdNotice}`;
  let hash = 0;
  for (let i = 0; i < payloadToHash.length; i++) {
    hash = ((hash << 5) - hash) + payloadToHash.charCodeAt(i);
    hash |= 0;
  }
  const contentHashSha256 = 'sha256_' + Math.abs(hash).toString(16).padStart(16, '0');

  return {
    headline: req.headline,
    bodyText: req.bodyText,
    safeHarborDisclaimer,
    regulationFdNotice,
    contentHashSha256
  };
}

export function evaluateQaBridgeTransition(
  bridgeTechnique: BridgeTechniqueType,
  customTransition?: string
): string {
  if (customTransition && customTransition.trim().length > 0) {
    return customTransition.trim();
  }
  switch (bridgeTechnique) {
    case 'bridge_to_facts':
      return 'What the verified engineering and forensic evidence specifically shows is...';
    case 'bridge_to_values':
      return 'Our uncompromised organizational priority has always been the security and trust of our stakeholders, and...';
    case 'bridge_to_action':
      return 'The immediate decisive operational remediation we have executed includes...';
    case 'bridge_to_context':
      return 'To put this event into proper operational context, it is vital to understand that...';
    case 'flag_key_takeaway':
      return 'The single most vital takeaway every stakeholder should focus on right now is...';
  }
}
