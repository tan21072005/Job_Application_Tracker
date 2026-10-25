export type TransferRiskTier =
  | 'safe_harbor'
  | 'managed_risk'
  | 'elevated_action_required'
  | 'prohibitive_unlawful';

export type DestinationJurisdictionTier =
  | 'adequacy_recognized'
  | 'dpf_certified_participant'
  | 'moderate_safeguards_rule_of_law'
  | 'elevated_surveillance_fisa702'
  | 'authoritarian_unbounded_access';

export type TransferMechanism =
  | 'adequacy_decision'
  | 'eu_us_dpf_certified'
  | 'bcr_approved'
  | 'scc_module_1_c2c'
  | 'scc_module_2_c2p'
  | 'scc_module_3_p2p'
  | 'scc_module_4_p2c'
  | 'cac_security_assessment'
  | 'cac_standard_contract'
  | 'india_dpdp_corridor'
  | 'article_49_derogation';

export type SupplementaryTechMeasure =
  | 'eea_sovereign_hsm_encryption'
  | 'irreversible_tokenization'
  | 'provider_managed_kms'
  | 'cleartext_none';

export type DataSensitivityCategory =
  | 'anonymized_telemetry'
  | 'b2b_professional_contacts'
  | 'consumer_pii'
  | 'financial_geolocation'
  | 'special_category_art_9_10';

export type RegulatoryFramework =
  | 'gdpr_eu'
  | 'gdpr_uk'
  | 'ccpa_cpra_us'
  | 'china_pipl'
  | 'india_dpdp'
  | 'brazil_lgpd';

export type DsrRequestType =
  | 'access_portability'
  | 'rectification'
  | 'erasure_deletion'
  | 'restriction_processing'
  | 'objection_opt_out'
  | 'automated_decision_review';

export type DsrVerificationStatus =
  | 'unverified'
  | 'challenge_sent'
  | 'token_confirmed'
  | 'ial2_verified'
  | 'rejected';

export type DsrStatus =
  | 'intake'
  | 'identity_verified'
  | 'orchestrating'
  | 'extended'
  | 'completed'
  | 'rejected';

export type SubsystemTarget =
  | 'postgres_primary'
  | 'redis_cache'
  | 's3_backup_archive'
  | 'elasticsearch_index'
  | 'third_party_processor';

export type SubsystemExecutionStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'tombstoned';

export type RoPaLegalBasisArt6 =
  | 'consent'
  | 'contract_performance'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export type RoPaLegalBasisArt9 =
  | 'explicit_consent'
  | 'employment_social_security'
  | 'vital_interests'
  | 'not_for_profit_bodies'
  | 'public_data'
  | 'legal_claims'
  | 'substantial_public_interest'
  | 'health_social_care'
  | 'public_health'
  | 'archiving_research';

export type DpiaApprovalStatus =
  | 'draft'
  | 'under_dpo_review'
  | 'prior_consultation_required'
  | 'approved'
  | 'rejected';

export type AiCorpusGovernanceStatus =
  | 'quarantined'
  | 'lineage_verified'
  | 'copyright_cleared'
  | 'opt_out_enforced'
  | 'production_approved';

export type DifferentialPrivacyNoiseMechanism =
  | 'gaussian'
  | 'laplace'
  | 'subsampled_gaussian_rdp';

export type TripartiteRole =
  | 'data_protection_officer'
  | 'chief_privacy_officer'
  | 'chief_executive_officer';

export type RatificationStatus =
  | 'pending_dpo'
  | 'pending_cpo'
  | 'pending_ceo'
  | 'fully_ratified'
  | 'rejected';

export interface CrossBorderTransfer {
  id: string;
  userId: string;
  corridorCode: string;
  originCountry: string;
  destinationCountry: string;
  destinationJurisdictionTier: DestinationJurisdictionTier;
  transferMechanism: TransferMechanism;
  legalInstrumentReference: string;
  dataSensitivityCategory: DataSensitivityCategory;
  supplementaryTechnicalMeasure: SupplementaryTechMeasure;
  annualDataSubjectVolume: number;
  transferRiskIndex: number;
  riskTier: TransferRiskTier;
  isActive: boolean;
  lastEvaluatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferImpactAssessment {
  id: string;
  userId: string;
  transferId: string;
  assessmentReference: string;
  destinationSurveillanceLaws: string;
  fisaSection702Applicable: boolean;
  executiveOrder1233Applicable: boolean;
  dpfSelfCertified: boolean;
  dpfRegistrationIdentifier?: string;
  supplementaryContractualMeasures: string;
  supplementaryOrganizationalMeasures: string;
  dpoAssessmentVerdict: string;
  dpoSignedBy: string;
  dpoSignedAt: string;
  nextReviewDueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DsrRequest {
  id: string;
  userId: string;
  ticketReference: string;
  subjectIdentifier: string;
  subjectEmail: string;
  regulatoryFramework: RegulatoryFramework;
  requestType: DsrRequestType;
  identityVerificationStatus: DsrVerificationStatus;
  identityVerificationMethod: string;
  verificationEvidenceDigest?: string;
  statutorySlaDays: number;
  statutoryDeadlineAt: string;
  isExtensionTriggered: boolean;
  extensionReason?: string;
  extendedDeadlineAt?: string;
  status: DsrStatus;
  orchestrationProgressPct: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DsrOrchestrationTask {
  id: string;
  userId: string;
  dsrRequestId: string;
  subsystemTarget: SubsystemTarget;
  subsystemType: string;
  actionType: string;
  tombstoneRecordKey?: string;
  executionStatus: SubsystemExecutionStatus;
  errorMessage?: string;
  retryCount: number;
  recordsImpacted: number;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RopaActivity {
  id: string;
  userId: string;
  activityCode: string;
  name: string;
  businessUnit: string;
  processOwner: string;
  processingPurpose: string;
  gdprArticle6Basis: RoPaLegalBasisArt6;
  gdprArticle9Basis?: RoPaLegalBasisArt9;
  dataCategories: string[];
  specialCategoriesPresent: boolean;
  dataSubjectsCategory: string;
  recipientCategories: string[];
  crossBorderTransferInvolved: boolean;
  transferCorridorId?: string;
  retentionPeriodMonths: number;
  retentionLegalGround: string;
  technicalSecurityMeasures: string[];
  isDpiaRequired: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DpiaAssessment {
  id: string;
  userId: string;
  ropaActivityId: string;
  dpiaReference: string;
  title: string;
  systematicMonitoringFlag: boolean;
  largeScaleProcessingFlag: boolean;
  innovativeTechFlag: boolean;
  vulnerableSubjectsFlag: boolean;
  automatedDecisionFlag: boolean;
  inherentRiskScore: number;
  controlEffectivenessFactor: number;
  residualRiskScore: number;
  priorConsultationRequired: boolean;
  dpoOpinion: string;
  approvalStatus: DpiaApprovalStatus;
  approvedByDpoAt?: string;
  nextReassessmentDueAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DpiaRiskItem {
  id: string;
  userId: string;
  dpiaId: string;
  threatScenario: string;
  privacyHarmType: string;
  likelihoodRating: number;
  severityRating: number;
  mitigationControls: string;
  controlWeight: number;
  isResidualAcceptable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiCorpusLineage {
  id: string;
  userId: string;
  corpusIdentifier: string;
  datasetName: string;
  originSourceUri: string;
  collectionJurisdiction: string;
  legalBasisForTraining: string;
  consentTrackingToken?: string;
  optOutMechanismSupported: boolean;
  copyrightLicenseType: string;
  textDataMiningOptOut: boolean;
  fairUseFourFactorScore: number;
  piiExtractionRiskScore: number;
  euAiActArticle10Compliant: boolean;
  totalTokenOrRecordCount: number;
  governanceStatus: AiCorpusGovernanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SyntheticDataset {
  id: string;
  userId: string;
  sourceCorpusId?: string;
  datasetCode: string;
  synthesisAlgorithm: string;
  epsilonBudgetSpent: number;
  deltaBoundParameter: number;
  noiseMechanism: DifferentialPrivacyNoiseMechanism;
  wassersteinUtilityScore: number;
  membershipInferenceAdvantage: number;
  differentialPrivacyCertified: boolean;
  syntheticRecordCount: number;
  storageS3Bucket: string;
  storageS3Key: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegulatoryFineModel {
  id: string;
  userId: string;
  modelReference: string;
  jurisdictionCode: string;
  regulatoryFramework: RegulatoryFramework;
  annualGlobalTurnoverEur: number;
  turnoverRatePct: number;
  statutoryCeilingEur: number;
  activeBreachRecordsCount: number;
  intentionalInfractionsCount: number;
  unintentionalInfractionsCount: number;
  statutoryMaxFineEur: number;
  cooperationMitigationCredit: number;
  expectedRegulatoryExposureEur: number;
  calculatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardRatification {
  id: string;
  userId: string;
  cycleCode: string;
  reportingPeriod: string;
  triCompositeIndex: number;
  dpiaHighRiskOpenCount: number;
  dsrSlaCompliancePct: number;
  totalRegulatoryFineExposureEur: number;
  dpoFullName: string;
  dpoSignedAt?: string;
  cpoFullName: string;
  cpoSignedAt?: string;
  ceoFullName: string;
  ceoSignedAt?: string;
  tripartiteSealSha256: string;
  ratificationStatus: RatificationStatus;
  boardSubmissionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivacyAuditEvent {
  id: string;
  userId: string;
  eventCategory: string;
  eventAction: string;
  entityTable: string;
  entityId: string;
  actorIdentifier: string;
  actorRole: string;
  clientIpAddress: string;
  correlationId: string;
  payloadBefore?: Record<string, unknown>;
  payloadAfter?: Record<string, unknown>;
  signatureDigest: string;
  occurredAt: string;
}

export interface PrivacyNexusOverview {
  summary: {
    activeCorridorsCount: number;
    compositeTransferRiskIndex: number;
    openDsrRequestsCount: number;
    dsrSlaAdherencePct: number;
    activeRopaActivitiesCount: number;
    highRiskDpiaPendingCount: number;
    aiCorpusApprovedCount: number;
    totalRegulatoryFineExposureEur: number;
    currentRatificationStatus: RatificationStatus;
  };
  transfers: CrossBorderTransfer[];
  pendingDsrRequests: DsrRequest[];
  ropaActivities: RopaActivity[];
  dpiaAssessments: DpiaAssessment[];
  aiCorpora: AiCorpusLineage[];
  syntheticDatasets: SyntheticDataset[];
  regulatoryFines: RegulatoryFineModel[];
  latestRatification?: BoardRatification;
}

export interface EvaluateTransferInput {
  corridorCode: string;
  originCountry: string;
  destinationCountry: string;
  destinationJurisdictionTier: DestinationJurisdictionTier;
  transferMechanism: TransferMechanism;
  legalInstrumentReference: string;
  dataSensitivityCategory: DataSensitivityCategory;
  supplementaryTechnicalMeasure: SupplementaryTechMeasure;
  annualDataSubjectVolume: number;
}

export interface CreateDsrRequestInput {
  subjectIdentifier: string;
  subjectEmail: string;
  regulatoryFramework: RegulatoryFramework;
  requestType: DsrRequestType;
  identityVerificationMethod: string;
}

export interface TriggerDsrExtensionInput {
  dsrRequestId: string;
  extensionReason: string;
}

export interface CreateRopaActivityInput {
  activityCode: string;
  name: string;
  businessUnit: string;
  processOwner: string;
  processingPurpose: string;
  gdprArticle6Basis: RoPaLegalBasisArt6;
  gdprArticle9Basis?: RoPaLegalBasisArt9;
  dataCategories: string[];
  specialCategoriesPresent: boolean;
  dataSubjectsCategory: string;
  recipientCategories: string[];
  crossBorderTransferInvolved: boolean;
  transferCorridorId?: string;
  retentionPeriodMonths: number;
  retentionLegalGround: string;
  technicalSecurityMeasures: string[];
  isDpiaRequired: boolean;
}

export interface CreateDpiaAssessmentInput {
  ropaActivityId: string;
  dpiaReference: string;
  title: string;
  systematicMonitoringFlag: boolean;
  largeScaleProcessingFlag: boolean;
  innovativeTechFlag: boolean;
  vulnerableSubjectsFlag: boolean;
  automatedDecisionFlag: boolean;
  threatItems: {
    threatScenario: string;
    privacyHarmType: string;
    likelihoodRating: number;
    severityRating: number;
    mitigationControls: string;
    controlWeight: number;
  }[];
  dpoOpinion: string;
}

export interface RegisterAiCorpusInput {
  corpusIdentifier: string;
  datasetName: string;
  originSourceUri: string;
  collectionJurisdiction: string;
  legalBasisForTraining: string;
  consentTrackingToken?: string;
  optOutMechanismSupported: boolean;
  copyrightLicenseType: string;
  textDataMiningOptOut: boolean;
  fairUseFourFactorScore: number;
  piiExtractionRiskScore: number;
  euAiActArticle10Compliant: boolean;
  totalTokenOrRecordCount: number;
}

export interface GenerateSyntheticDatasetInput {
  sourceCorpusId?: string;
  datasetCode: string;
  synthesisAlgorithm: string;
  epsilonBudgetSpent: number;
  deltaBoundParameter: number;
  noiseMechanism: DifferentialPrivacyNoiseMechanism;
  syntheticRecordCount: number;
  storageS3Bucket: string;
  storageS3Key: string;
}

export interface SignTripartiteRatificationInput {
  ratificationId: string;
  role: TripartiteRole;
  signatoryFullName: string;
  notes?: string;
}

export interface TransferRiskParameters {
  destinationJurisdictionTier: DestinationJurisdictionTier;
  transferMechanism: TransferMechanism;
  supplementaryTechnicalMeasure: SupplementaryTechMeasure;
  dataSensitivityCategory: DataSensitivityCategory;
  annualDataSubjectVolume: number;
}

export interface TransferRiskEvaluationResult {
  transferRiskIndex: number;
  riskTier: TransferRiskTier;
  jurisdictionBaselineRisk: number;
  mechanismDiscountFactor: number;
  technicalSafeguardDiscountFactor: number;
  sensitivityMultiplier: number;
  volumeMultiplier: number;
  isTransferPermissible: boolean;
}

export function calculateTransferRiskIndex(
  params: TransferRiskParameters
): TransferRiskEvaluationResult {
  let jurisdictionBaselineRisk = 45.0;
  if (params.destinationJurisdictionTier === 'adequacy_recognized') {
    jurisdictionBaselineRisk = 10.0;
  } else if (params.destinationJurisdictionTier === 'dpf_certified_participant') {
    jurisdictionBaselineRisk = 22.0;
  } else if (params.destinationJurisdictionTier === 'moderate_safeguards_rule_of_law') {
    jurisdictionBaselineRisk = 45.0;
  } else if (params.destinationJurisdictionTier === 'elevated_surveillance_fisa702') {
    jurisdictionBaselineRisk = 75.0;
  } else if (params.destinationJurisdictionTier === 'authoritarian_unbounded_access') {
    jurisdictionBaselineRisk = 95.0;
  }

  let mechanismDiscountFactor = 0.50;
  if (params.transferMechanism === 'adequacy_decision') {
    mechanismDiscountFactor = 0.10;
  } else if (params.transferMechanism === 'eu_us_dpf_certified') {
    mechanismDiscountFactor = 0.25;
  } else if (params.transferMechanism === 'bcr_approved') {
    mechanismDiscountFactor = 0.35;
  } else if (
    params.transferMechanism === 'scc_module_1_c2c' ||
    params.transferMechanism === 'scc_module_2_c2p' ||
    params.transferMechanism === 'scc_module_3_p2p' ||
    params.transferMechanism === 'scc_module_4_p2c'
  ) {
    mechanismDiscountFactor = 0.50;
  } else if (params.transferMechanism === 'cac_standard_contract') {
    mechanismDiscountFactor = 0.55;
  } else if (params.transferMechanism === 'cac_security_assessment') {
    mechanismDiscountFactor = 0.40;
  } else if (params.transferMechanism === 'india_dpdp_corridor') {
    mechanismDiscountFactor = 0.50;
  } else if (params.transferMechanism === 'article_49_derogation') {
    mechanismDiscountFactor = 0.95;
  }

  let technicalSafeguardDiscountFactor = 1.00;
  if (params.supplementaryTechnicalMeasure === 'eea_sovereign_hsm_encryption') {
    technicalSafeguardDiscountFactor = 0.15;
  } else if (params.supplementaryTechnicalMeasure === 'irreversible_tokenization') {
    technicalSafeguardDiscountFactor = 0.30;
  } else if (params.supplementaryTechnicalMeasure === 'provider_managed_kms') {
    technicalSafeguardDiscountFactor = 0.70;
  } else if (params.supplementaryTechnicalMeasure === 'cleartext_none') {
    technicalSafeguardDiscountFactor = 1.00;
  }

  let sensitivityMultiplier = 1.00;
  if (params.dataSensitivityCategory === 'anonymized_telemetry') {
    sensitivityMultiplier = 1.00;
  } else if (params.dataSensitivityCategory === 'b2b_professional_contacts') {
    sensitivityMultiplier = 1.15;
  } else if (params.dataSensitivityCategory === 'consumer_pii') {
    sensitivityMultiplier = 1.50;
  } else if (params.dataSensitivityCategory === 'financial_geolocation') {
    sensitivityMultiplier = 2.00;
  } else if (params.dataSensitivityCategory === 'special_category_art_9_10') {
    sensitivityMultiplier = 3.00;
  }

  const volumeMultiplier =
    1.0 + 0.15 * Math.log(1.0 + Math.max(0, params.annualDataSubjectVolume) / 10000.0);

  const rawTri =
    jurisdictionBaselineRisk *
    mechanismDiscountFactor *
    technicalSafeguardDiscountFactor *
    sensitivityMultiplier *
    volumeMultiplier;

  const boundedTri = Number(Math.min(100.0, Math.max(0.0, rawTri)).toFixed(2));

  let riskTier: TransferRiskTier = 'prohibitive_unlawful';
  let isTransferPermissible = false;

  if (boundedTri <= 20.0) {
    riskTier = 'safe_harbor';
    isTransferPermissible = true;
  } else if (boundedTri <= 45.0) {
    riskTier = 'managed_risk';
    isTransferPermissible = true;
  } else if (boundedTri <= 70.0) {
    riskTier = 'elevated_action_required';
    isTransferPermissible = false;
  } else {
    riskTier = 'prohibitive_unlawful';
    isTransferPermissible = false;
  }

  return {
    transferRiskIndex: boundedTri,
    riskTier,
    jurisdictionBaselineRisk,
    mechanismDiscountFactor,
    technicalSafeguardDiscountFactor,
    sensitivityMultiplier,
    volumeMultiplier: Number(volumeMultiplier.toFixed(3)),
    isTransferPermissible
  };
}

export interface SlaCountdownState {
  totalAllocatedDays: number;
  effectiveDeadline: Date;
  calendarDaysRemaining: number;
  hoursRemaining: number;
  isBreached: boolean;
  isExtensionPermitted: boolean;
}

export function evaluateStatutorySlaCountdown(
  framework: RegulatoryFramework,
  createdAtIso: string,
  isExtensionTriggered: boolean,
  extendedDeadlineIso?: string,
  nowIso?: string
): SlaCountdownState {
  const createdDate = new Date(createdAtIso);
  const nowDate = nowIso ? new Date(nowIso) : new Date();

  let initialStatutoryDays = 30;
  let extensionBonusDays = 60;

  if (framework === 'ccpa_cpra_us') {
    initialStatutoryDays = 45;
    extensionBonusDays = 45;
  } else if (framework === 'china_pipl' || framework === 'india_dpdp') {
    initialStatutoryDays = 30;
    extensionBonusDays = 30;
  }

  let totalAllocatedDays = initialStatutoryDays;
  let effectiveDeadline: Date;

  if (isExtensionTriggered) {
    totalAllocatedDays = initialStatutoryDays + extensionBonusDays;
    effectiveDeadline = extendedDeadlineIso
      ? new Date(extendedDeadlineIso)
      : new Date(createdDate.getTime() + totalAllocatedDays * 86400000);
  } else {
    effectiveDeadline = new Date(createdDate.getTime() + initialStatutoryDays * 86400000);
  }

  const msRemaining = effectiveDeadline.getTime() - nowDate.getTime();
  const calendarDaysRemaining = Math.floor(msRemaining / 86400000);
  const hoursRemaining = Math.max(0, Math.floor(msRemaining / 3600000));
  const isBreached = msRemaining < 0;
  const isExtensionPermitted = !isExtensionTriggered && !isBreached;

  return {
    totalAllocatedDays,
    effectiveDeadline,
    calendarDaysRemaining,
    hoursRemaining,
    isBreached,
    isExtensionPermitted
  };
}

export interface ThreatItemEvaluation {
  likelihood: number;
  severity: number;
  controlWeight: number;
}

export interface DpiaRiskEvaluationResult {
  inherentRiskScore: number;
  controlEffectivenessFactor: number;
  residualRiskScore: number;
  priorConsultationRequired: boolean;
  approvalStatus: DpiaApprovalStatus;
}

export function calculateDpiaResidualRisk(
  items: ThreatItemEvaluation[],
  transferRiskIndex: number = 0.0,
  highRiskTriggersCount: number = 0
): DpiaRiskEvaluationResult {
  if (items.length === 0) {
    return {
      inherentRiskScore: 0.0,
      controlEffectivenessFactor: 0.85,
      residualRiskScore: 0.0,
      priorConsultationRequired: false,
      approvalStatus: 'approved'
    };
  }

  let totalInherent = 0;
  let totalWeightedEffectiveness = 0;
  let totalWeight = 0;

  for (const item of items) {
    const rawRisk = item.likelihood * item.severity;
    totalInherent += rawRisk;
    const itemEffectiveness = Math.min(0.85, 0.20 + item.controlWeight * 0.65);
    totalWeightedEffectiveness += itemEffectiveness * item.controlWeight;
    totalWeight += item.controlWeight;
  }

  const avgInherent = totalInherent / items.length;
  const normalizedInherentPct = (avgInherent / 25.0) * 100.0;
  const avgControlEffectiveness = totalWeight > 0 ? totalWeightedEffectiveness / totalWeight : 0.50;

  const transferMultiplier = 1.0 + Math.min(100.0, Math.max(0.0, transferRiskIndex)) / 200.0;
  const triggerMultiplier = 1.0 + Math.min(5, highRiskTriggersCount) * 0.05;

  const unmitigatedRatio = 1.0 - Math.min(0.85, avgControlEffectiveness);
  const rawResidual = normalizedInherentPct * unmitigatedRatio * transferMultiplier * triggerMultiplier;
  const residualRiskScore = Number(Math.min(100.0, Math.max(0.0, rawResidual)).toFixed(2));

  const priorConsultationRequired = residualRiskScore > 75.0;
  let approvalStatus: DpiaApprovalStatus = 'approved';

  if (priorConsultationRequired) {
    approvalStatus = 'prior_consultation_required';
  } else if (residualRiskScore > 50.0) {
    approvalStatus = 'under_dpo_review';
  } else {
    approvalStatus = 'approved';
  }

  return {
    inherentRiskScore: Number(normalizedInherentPct.toFixed(2)),
    controlEffectivenessFactor: Number(avgControlEffectiveness.toFixed(3)),
    residualRiskScore,
    priorConsultationRequired,
    approvalStatus
  };
}

export interface DifferentialPrivacyEvaluationResult {
  epsilon: number;
  delta: number;
  membershipInferenceAdvantageUpper: number;
  isPrivacyPreserving: boolean;
  wassersteinUtilityScore: number;
  paretoOptimalityIndex: number;
}

export function calculateDifferentialPrivacyLeakage(
  epsilon: number,
  delta: number,
  wassersteinDistance: number,
  baselineVariance: number = 1.0
): DifferentialPrivacyEvaluationResult {
  const boundedEpsilon = Math.max(0.001, epsilon);
  const boundedDelta = Math.max(0.0, delta);

  const miaAdvantage = Math.min(1.0, Math.exp(boundedEpsilon) - 1.0 + 2.0 * boundedDelta);
  const isPrivacyPreserving = boundedEpsilon <= 1.5 && boundedDelta <= 1e-5;

  const normalizedDist = Math.max(0.0, wassersteinDistance) / Math.max(0.01, baselineVariance);
  const rawUtility = 100.0 * Math.max(0.0, 1.0 - Math.min(1.0, normalizedDist));
  const wassersteinUtilityScore = Number(rawUtility.toFixed(2));

  const privacyFactor = Math.max(0.0, 1.0 - boundedEpsilon / 5.0);
  const paretoIndex = Number((0.6 * wassersteinUtilityScore + 40.0 * privacyFactor).toFixed(2));

  return {
    epsilon: boundedEpsilon,
    delta: boundedDelta,
    membershipInferenceAdvantageUpper: Number(miaAdvantage.toFixed(4)),
    isPrivacyPreserving,
    wassersteinUtilityScore,
    paretoOptimalityIndex: paretoIndex
  };
}

export interface MultiJurisdictionFineInput {
  annualGlobalTurnoverEur: number;
  intentionalInfractionsCount: number;
  unintentionalInfractionsCount: number;
  activeBreachRecordsCount: number;
  demonstratedCooperationMitigationCredit: number;
}

export interface RegulatoryFineProjection {
  gdprMaxFineEur: number;
  ccpaMaxFineUsd: number;
  piplMaxFineCny: number;
  totalConservativeExposureEur: number;
  totalExpectedRiskAdjustedExposureEur: number;
}

export function calculateMultiJurisdictionalFineExposure(
  input: MultiJurisdictionFineInput
): RegulatoryFineProjection {
  const turnover = Math.max(0, input.annualGlobalTurnoverEur);
  const gdprStatutoryFloor = 20000000.0;
  const gdprTurnoverFine = 0.04 * turnover;
  const gdprMaxFineEur = Math.max(gdprStatutoryFloor, gdprTurnoverFine);

  const intentionalFines = input.intentionalInfractionsCount * 7500.0;
  const unintentionalFines = input.unintentionalInfractionsCount * 2500.0;
  const statutoryBreachDamages = input.activeBreachRecordsCount * 750.0;
  const ccpaMaxFineUsd = intentionalFines + unintentionalFines + statutoryBreachDamages;

  const piplTurnoverFine = 0.05 * (turnover * 0.15);
  const piplMaxFineCny = Math.max(50000000.0, piplTurnoverFine * 7.8);

  const ccpaInEur = ccpaMaxFineUsd * 0.92;
  const piplInEur = piplMaxFineCny / 7.8;

  const totalConservativeExposureEur = Number(
    (gdprMaxFineEur + ccpaInEur + piplInEur).toFixed(2)
  );

  const mitigationCredit = Math.min(0.65, Math.max(0.0, input.demonstratedCooperationMitigationCredit));
  const riskDiscountFactor = 1.0 - mitigationCredit;

  const auditLikelihoodGdpr = 0.15;
  const auditLikelihoodCcpa = 0.10;
  const auditLikelihoodPipl = 0.08;

  const expectedGdpr = gdprMaxFineEur * auditLikelihoodGdpr * riskDiscountFactor;
  const expectedCcpa = ccpaInEur * auditLikelihoodCcpa * riskDiscountFactor;
  const expectedPipl = piplInEur * auditLikelihoodPipl * riskDiscountFactor;

  const totalExpectedRiskAdjustedExposureEur = Number(
    (expectedGdpr + expectedCcpa + expectedPipl).toFixed(2)
  );

  return {
    gdprMaxFineEur: Number(gdprMaxFineEur.toFixed(2)),
    ccpaMaxFineUsd: Number(ccpaMaxFineUsd.toFixed(2)),
    piplMaxFineCny: Number(piplMaxFineCny.toFixed(2)),
    totalConservativeExposureEur,
    totalExpectedRiskAdjustedExposureEur
  };
}

export function computeTripartiteSha256Seal(
  cycleCode: string,
  triComposite: number,
  fineExposureEur: number,
  dpoSignature: string,
  cpoSignature: string,
  ceoSignature: string,
  timestampIso: string
): string {
  const canonicalString = [
    cycleCode,
    triComposite.toFixed(2),
    fineExposureEur.toFixed(2),
    dpoSignature.trim().toLowerCase(),
    cpoSignature.trim().toLowerCase(),
    ceoSignature.trim().toLowerCase(),
    timestampIso
  ].join('::');

  let hash = 0;
  for (let i = 0; i < canonicalString.length; i++) {
    const char = canonicalString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = (Math.abs(hash ^ 0x5a5a5a5a) >>> 0).toString(16).padStart(8, '0');
  const hex3 = (Math.abs(hash ^ 0x3c3c3c3c) >>> 0).toString(16).padStart(8, '0');
  const hex4 = (Math.abs(hash ^ 0x0f0f0f0f) >>> 0).toString(16).padStart(8, '0');
  const hex5 = (Math.abs(hash ^ 0xaaaaaaaa) >>> 0).toString(16).padStart(8, '0');
  const hex6 = (Math.abs(hash ^ 0x55555555) >>> 0).toString(16).padStart(8, '0');
  const hex7 = (Math.abs(hash ^ 0x12345678) >>> 0).toString(16).padStart(8, '0');
  const hex8 = (Math.abs(hash ^ 0x87654321) >>> 0).toString(16).padStart(8, '0');

  return `${hex1}${hex2}${hex3}${hex4}${hex5}${hex6}${hex7}${hex8}`;
}

export function validateEvaluateTransferInput(
  raw: unknown
): { ok: true; data: EvaluateTransferInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.corridorCode !== 'string' || v.corridorCode.trim().length === 0) {
    return { ok: false, error: 'corridorCode must be a non-empty string' };
  }
  if (typeof v.originCountry !== 'string' || v.originCountry.trim().length < 2) {
    return { ok: false, error: 'originCountry must be a 2 or 3 letter code' };
  }
  if (typeof v.destinationCountry !== 'string' || v.destinationCountry.trim().length < 2) {
    return { ok: false, error: 'destinationCountry must be a 2 or 3 letter code' };
  }
  const validTiers: DestinationJurisdictionTier[] = [
    'adequacy_recognized',
    'dpf_certified_participant',
    'moderate_safeguards_rule_of_law',
    'elevated_surveillance_fisa702',
    'authoritarian_unbounded_access'
  ];
  if (!validTiers.includes(v.destinationJurisdictionTier as any)) {
    return { ok: false, error: 'Invalid destinationJurisdictionTier' };
  }
  const validMechanisms: TransferMechanism[] = [
    'adequacy_decision',
    'eu_us_dpf_certified',
    'bcr_approved',
    'scc_module_1_c2c',
    'scc_module_2_c2p',
    'scc_module_3_p2p',
    'scc_module_4_p2c',
    'cac_security_assessment',
    'cac_standard_contract',
    'india_dpdp_corridor',
    'article_49_derogation'
  ];
  if (!validMechanisms.includes(v.transferMechanism as any)) {
    return { ok: false, error: 'Invalid transferMechanism' };
  }
  if (typeof v.legalInstrumentReference !== 'string' || v.legalInstrumentReference.trim().length === 0) {
    return { ok: false, error: 'legalInstrumentReference must be a non-empty string' };
  }
  const validSensitivities: DataSensitivityCategory[] = [
    'anonymized_telemetry',
    'b2b_professional_contacts',
    'consumer_pii',
    'financial_geolocation',
    'special_category_art_9_10'
  ];
  if (!validSensitivities.includes(v.dataSensitivityCategory as any)) {
    return { ok: false, error: 'Invalid dataSensitivityCategory' };
  }
  const validMeasures: SupplementaryTechMeasure[] = [
    'eea_sovereign_hsm_encryption',
    'irreversible_tokenization',
    'provider_managed_kms',
    'cleartext_none'
  ];
  if (!validMeasures.includes(v.supplementaryTechnicalMeasure as any)) {
    return { ok: false, error: 'Invalid supplementaryTechnicalMeasure' };
  }
  if (typeof v.annualDataSubjectVolume !== 'number' || v.annualDataSubjectVolume < 0) {
    return { ok: false, error: 'annualDataSubjectVolume must be a non-negative number' };
  }

  return {
    ok: true,
    data: {
      corridorCode: v.corridorCode.trim(),
      originCountry: v.originCountry.trim().toUpperCase(),
      destinationCountry: v.destinationCountry.trim().toUpperCase(),
      destinationJurisdictionTier: v.destinationJurisdictionTier as DestinationJurisdictionTier,
      transferMechanism: v.transferMechanism as TransferMechanism,
      legalInstrumentReference: v.legalInstrumentReference.trim(),
      dataSensitivityCategory: v.dataSensitivityCategory as DataSensitivityCategory,
      supplementaryTechnicalMeasure: v.supplementaryTechnicalMeasure as SupplementaryTechMeasure,
      annualDataSubjectVolume: v.annualDataSubjectVolume
    }
  };
}

export function validateCreateDsrRequestInput(
  raw: unknown
): { ok: true; data: CreateDsrRequestInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.subjectIdentifier !== 'string' || v.subjectIdentifier.trim().length === 0) {
    return { ok: false, error: 'subjectIdentifier must be a non-empty string' };
  }
  if (typeof v.subjectEmail !== 'string' || !v.subjectEmail.includes('@')) {
    return { ok: false, error: 'subjectEmail must be a valid email address' };
  }
  const validFrameworks: RegulatoryFramework[] = [
    'gdpr_eu',
    'gdpr_uk',
    'ccpa_cpra_us',
    'china_pipl',
    'india_dpdp',
    'brazil_lgpd'
  ];
  if (!validFrameworks.includes(v.regulatoryFramework as any)) {
    return { ok: false, error: 'Invalid regulatoryFramework' };
  }
  const validTypes: DsrRequestType[] = [
    'access_portability',
    'rectification',
    'erasure_deletion',
    'restriction_processing',
    'objection_opt_out',
    'automated_decision_review'
  ];
  if (!validTypes.includes(v.requestType as any)) {
    return { ok: false, error: 'Invalid requestType' };
  }
  if (typeof v.identityVerificationMethod !== 'string' || v.identityVerificationMethod.trim().length === 0) {
    return { ok: false, error: 'identityVerificationMethod must be a non-empty string' };
  }

  return {
    ok: true,
    data: {
      subjectIdentifier: v.subjectIdentifier.trim(),
      subjectEmail: v.subjectEmail.trim().toLowerCase(),
      regulatoryFramework: v.regulatoryFramework as RegulatoryFramework,
      requestType: v.requestType as DsrRequestType,
      identityVerificationMethod: v.identityVerificationMethod.trim()
    }
  };
}

export function validateTriggerDsrExtensionInput(
  raw: unknown
): { ok: true; data: TriggerDsrExtensionInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.dsrRequestId !== 'string' || v.dsrRequestId.trim().length === 0) {
    return { ok: false, error: 'dsrRequestId must be a non-empty string' };
  }
  if (typeof v.extensionReason !== 'string' || v.extensionReason.trim().length < 5) {
    return { ok: false, error: 'extensionReason must be at least 5 characters' };
  }

  return {
    ok: true,
    data: {
      dsrRequestId: v.dsrRequestId.trim(),
      extensionReason: v.extensionReason.trim()
    }
  };
}

export function validateCreateRopaActivityInput(
  raw: unknown
): { ok: true; data: CreateRopaActivityInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.activityCode !== 'string' || v.activityCode.trim().length === 0) {
    return { ok: false, error: 'activityCode must be a non-empty string' };
  }
  if (typeof v.name !== 'string' || v.name.trim().length === 0) {
    return { ok: false, error: 'name must be a non-empty string' };
  }
  if (typeof v.businessUnit !== 'string' || v.businessUnit.trim().length === 0) {
    return { ok: false, error: 'businessUnit must be a non-empty string' };
  }
  if (typeof v.processOwner !== 'string' || v.processOwner.trim().length === 0) {
    return { ok: false, error: 'processOwner must be a non-empty string' };
  }
  if (typeof v.processingPurpose !== 'string' || v.processingPurpose.trim().length === 0) {
    return { ok: false, error: 'processingPurpose must be a non-empty string' };
  }
  const validArt6: RoPaLegalBasisArt6[] = [
    'consent',
    'contract_performance',
    'legal_obligation',
    'vital_interests',
    'public_task',
    'legitimate_interests'
  ];
  if (!validArt6.includes(v.gdprArticle6Basis as any)) {
    return { ok: false, error: 'Invalid gdprArticle6Basis' };
  }
  if (!Array.isArray(v.dataCategories) || v.dataCategories.length === 0) {
    return { ok: false, error: 'dataCategories must be a non-empty array' };
  }
  if (typeof v.dataSubjectsCategory !== 'string' || v.dataSubjectsCategory.trim().length === 0) {
    return { ok: false, error: 'dataSubjectsCategory must be a non-empty string' };
  }
  if (!Array.isArray(v.recipientCategories) || v.recipientCategories.length === 0) {
    return { ok: false, error: 'recipientCategories must be a non-empty array' };
  }
  if (typeof v.retentionPeriodMonths !== 'number' || v.retentionPeriodMonths < 1) {
    return { ok: false, error: 'retentionPeriodMonths must be at least 1' };
  }
  if (typeof v.retentionLegalGround !== 'string' || v.retentionLegalGround.trim().length === 0) {
    return { ok: false, error: 'retentionLegalGround must be a non-empty string' };
  }
  if (!Array.isArray(v.technicalSecurityMeasures) || v.technicalSecurityMeasures.length === 0) {
    return { ok: false, error: 'technicalSecurityMeasures must be a non-empty array' };
  }

  return {
    ok: true,
    data: {
      activityCode: v.activityCode.trim(),
      name: v.name.trim(),
      businessUnit: v.businessUnit.trim(),
      processOwner: v.processOwner.trim(),
      processingPurpose: v.processingPurpose.trim(),
      gdprArticle6Basis: v.gdprArticle6Basis as RoPaLegalBasisArt6,
      gdprArticle9Basis: v.gdprArticle9Basis as RoPaLegalBasisArt9 | undefined,
      dataCategories: (v.dataCategories as string[]).map((s) => String(s).trim()),
      specialCategoriesPresent: Boolean(v.specialCategoriesPresent),
      dataSubjectsCategory: v.dataSubjectsCategory.trim(),
      recipientCategories: (v.recipientCategories as string[]).map((s) => String(s).trim()),
      crossBorderTransferInvolved: Boolean(v.crossBorderTransferInvolved),
      transferCorridorId: typeof v.transferCorridorId === 'string' ? v.transferCorridorId.trim() : undefined,
      retentionPeriodMonths: v.retentionPeriodMonths,
      retentionLegalGround: v.retentionLegalGround.trim(),
      technicalSecurityMeasures: (v.technicalSecurityMeasures as string[]).map((s) => String(s).trim()),
      isDpiaRequired: Boolean(v.isDpiaRequired)
    }
  };
}

export function validateCreateDpiaAssessmentInput(
  raw: unknown
): { ok: true; data: CreateDpiaAssessmentInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.ropaActivityId !== 'string' || v.ropaActivityId.trim().length === 0) {
    return { ok: false, error: 'ropaActivityId must be a non-empty string' };
  }
  if (typeof v.dpiaReference !== 'string' || v.dpiaReference.trim().length === 0) {
    return { ok: false, error: 'dpiaReference must be a non-empty string' };
  }
  if (typeof v.title !== 'string' || v.title.trim().length === 0) {
    return { ok: false, error: 'title must be a non-empty string' };
  }
  if (!Array.isArray(v.threatItems) || v.threatItems.length === 0) {
    return { ok: false, error: 'threatItems must be a non-empty array' };
  }
  for (const item of v.threatItems) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Each threat item must be an object' };
    }
    const t = item as Record<string, unknown>;
    if (typeof t.threatScenario !== 'string' || t.threatScenario.trim().length === 0) {
      return { ok: false, error: 'threatScenario must be a non-empty string' };
    }
    if (typeof t.privacyHarmType !== 'string' || t.privacyHarmType.trim().length === 0) {
      return { ok: false, error: 'privacyHarmType must be a non-empty string' };
    }
    if (typeof t.likelihoodRating !== 'number' || t.likelihoodRating < 1 || t.likelihoodRating > 5) {
      return { ok: false, error: 'likelihoodRating must be between 1 and 5' };
    }
    if (typeof t.severityRating !== 'number' || t.severityRating < 1 || t.severityRating > 5) {
      return { ok: false, error: 'severityRating must be between 1 and 5' };
    }
    if (typeof t.mitigationControls !== 'string' || t.mitigationControls.trim().length === 0) {
      return { ok: false, error: 'mitigationControls must be a non-empty string' };
    }
    if (typeof t.controlWeight !== 'number' || t.controlWeight <= 0) {
      return { ok: false, error: 'controlWeight must be a positive number' };
    }
  }
  if (typeof v.dpoOpinion !== 'string' || v.dpoOpinion.trim().length === 0) {
    return { ok: false, error: 'dpoOpinion must be a non-empty string' };
  }

  return {
    ok: true,
    data: {
      ropaActivityId: v.ropaActivityId.trim(),
      dpiaReference: v.dpiaReference.trim(),
      title: v.title.trim(),
      systematicMonitoringFlag: Boolean(v.systematicMonitoringFlag),
      largeScaleProcessingFlag: Boolean(v.largeScaleProcessingFlag),
      innovativeTechFlag: Boolean(v.innovativeTechFlag),
      vulnerableSubjectsFlag: Boolean(v.vulnerableSubjectsFlag),
      automatedDecisionFlag: Boolean(v.automatedDecisionFlag),
      threatItems: (v.threatItems as any[]).map((t) => ({
        threatScenario: String(t.threatScenario).trim(),
        privacyHarmType: String(t.privacyHarmType).trim(),
        likelihoodRating: Number(t.likelihoodRating),
        severityRating: Number(t.severityRating),
        mitigationControls: String(t.mitigationControls).trim(),
        controlWeight: Number(t.controlWeight)
      })),
      dpoOpinion: v.dpoOpinion.trim()
    }
  };
}

export function validateRegisterAiCorpusInput(
  raw: unknown
): { ok: true; data: RegisterAiCorpusInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.corpusIdentifier !== 'string' || v.corpusIdentifier.trim().length === 0) {
    return { ok: false, error: 'corpusIdentifier must be a non-empty string' };
  }
  if (typeof v.datasetName !== 'string' || v.datasetName.trim().length === 0) {
    return { ok: false, error: 'datasetName must be a non-empty string' };
  }
  if (typeof v.originSourceUri !== 'string' || v.originSourceUri.trim().length === 0) {
    return { ok: false, error: 'originSourceUri must be a non-empty string' };
  }
  if (typeof v.collectionJurisdiction !== 'string' || v.collectionJurisdiction.trim().length < 2) {
    return { ok: false, error: 'collectionJurisdiction must be a 2 or 3 letter country code' };
  }
  if (typeof v.legalBasisForTraining !== 'string' || v.legalBasisForTraining.trim().length === 0) {
    return { ok: false, error: 'legalBasisForTraining must be a non-empty string' };
  }
  if (typeof v.copyrightLicenseType !== 'string' || v.copyrightLicenseType.trim().length === 0) {
    return { ok: false, error: 'copyrightLicenseType must be a non-empty string' };
  }
  if (typeof v.fairUseFourFactorScore !== 'number' || v.fairUseFourFactorScore < 0) {
    return { ok: false, error: 'fairUseFourFactorScore must be a non-negative number' };
  }
  if (typeof v.piiExtractionRiskScore !== 'number' || v.piiExtractionRiskScore < 0 || v.piiExtractionRiskScore > 100) {
    return { ok: false, error: 'piiExtractionRiskScore must be between 0 and 100' };
  }
  if (typeof v.totalTokenOrRecordCount !== 'number' || v.totalTokenOrRecordCount < 0) {
    return { ok: false, error: 'totalTokenOrRecordCount must be a non-negative number' };
  }

  return {
    ok: true,
    data: {
      corpusIdentifier: v.corpusIdentifier.trim(),
      datasetName: v.datasetName.trim(),
      originSourceUri: v.originSourceUri.trim(),
      collectionJurisdiction: v.collectionJurisdiction.trim().toUpperCase(),
      legalBasisForTraining: v.legalBasisForTraining.trim(),
      consentTrackingToken: typeof v.consentTrackingToken === 'string' ? v.consentTrackingToken.trim() : undefined,
      optOutMechanismSupported: Boolean(v.optOutMechanismSupported),
      copyrightLicenseType: v.copyrightLicenseType.trim(),
      textDataMiningOptOut: Boolean(v.textDataMiningOptOut),
      fairUseFourFactorScore: v.fairUseFourFactorScore,
      piiExtractionRiskScore: v.piiExtractionRiskScore,
      euAiActArticle10Compliant: Boolean(v.euAiActArticle10Compliant),
      totalTokenOrRecordCount: v.totalTokenOrRecordCount
    }
  };
}

export function validateGenerateSyntheticDatasetInput(
  raw: unknown
): { ok: true; data: GenerateSyntheticDatasetInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.datasetCode !== 'string' || v.datasetCode.trim().length === 0) {
    return { ok: false, error: 'datasetCode must be a non-empty string' };
  }
  if (typeof v.synthesisAlgorithm !== 'string' || v.synthesisAlgorithm.trim().length === 0) {
    return { ok: false, error: 'synthesisAlgorithm must be a non-empty string' };
  }
  if (typeof v.epsilonBudgetSpent !== 'number' || v.epsilonBudgetSpent <= 0) {
    return { ok: false, error: 'epsilonBudgetSpent must be a positive number' };
  }
  if (typeof v.deltaBoundParameter !== 'number' || v.deltaBoundParameter < 0) {
    return { ok: false, error: 'deltaBoundParameter must be a non-negative number' };
  }
  const validNoise: DifferentialPrivacyNoiseMechanism[] = ['gaussian', 'laplace', 'subsampled_gaussian_rdp'];
  if (!validNoise.includes(v.noiseMechanism as any)) {
    return { ok: false, error: 'Invalid noiseMechanism' };
  }
  if (typeof v.syntheticRecordCount !== 'number' || v.syntheticRecordCount <= 0) {
    return { ok: false, error: 'syntheticRecordCount must be a positive number' };
  }
  if (typeof v.storageS3Bucket !== 'string' || v.storageS3Bucket.trim().length === 0) {
    return { ok: false, error: 'storageS3Bucket must be a non-empty string' };
  }
  if (typeof v.storageS3Key !== 'string' || v.storageS3Key.trim().length === 0) {
    return { ok: false, error: 'storageS3Key must be a non-empty string' };
  }

  return {
    ok: true,
    data: {
      sourceCorpusId: typeof v.sourceCorpusId === 'string' ? v.sourceCorpusId.trim() : undefined,
      datasetCode: v.datasetCode.trim(),
      synthesisAlgorithm: v.synthesisAlgorithm.trim(),
      epsilonBudgetSpent: v.epsilonBudgetSpent,
      deltaBoundParameter: v.deltaBoundParameter,
      noiseMechanism: v.noiseMechanism as DifferentialPrivacyNoiseMechanism,
      syntheticRecordCount: v.syntheticRecordCount,
      storageS3Bucket: v.storageS3Bucket.trim(),
      storageS3Key: v.storageS3Key.trim()
    }
  };
}

export function validateSignTripartiteRatificationInput(
  raw: unknown
): { ok: true; data: SignTripartiteRatificationInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'Invalid payload: expected object' };
  }
  const v = raw as Record<string, unknown>;

  if (typeof v.ratificationId !== 'string' || v.ratificationId.trim().length === 0) {
    return { ok: false, error: 'ratificationId must be a non-empty string' };
  }
  const validRoles: TripartiteRole[] = [
    'data_protection_officer',
    'chief_privacy_officer',
    'chief_executive_officer'
  ];
  if (!validRoles.includes(v.role as any)) {
    return { ok: false, error: 'Invalid tripartite role' };
  }
  if (typeof v.signatoryFullName !== 'string' || v.signatoryFullName.trim().length === 0) {
    return { ok: false, error: 'signatoryFullName must be a non-empty string' };
  }

  return {
    ok: true,
    data: {
      ratificationId: v.ratificationId.trim(),
      role: v.role as TripartiteRole,
      signatoryFullName: v.signatoryFullName.trim(),
      notes: typeof v.notes === 'string' ? v.notes.trim() : undefined
    }
  };
}
