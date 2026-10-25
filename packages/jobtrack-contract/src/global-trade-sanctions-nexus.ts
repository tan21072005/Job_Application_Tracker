export type SanctionsListSource =
  | 'ofac_sdn'
  | 'ofac_ssi'
  | 'bis_entity_list'
  | 'bis_unverified_list'
  | 'bis_military_end_user'
  | 'eu_financial_sanctions'
  | 'un_consolidated'
  | 'uk_hmt_ofsi';

export type SanctionsEntityType = 'individual' | 'corporate_entity' | 'vessel' | 'aircraft';

export type SanctionsMatchConfidence = 'exact' | 'high_probable' | 'medium_review_required' | 'low_cleared';

export type EccnCategory =
  | 'cat_0_nuclear'
  | 'cat_1_materials'
  | 'cat_2_materials_processing'
  | 'cat_3_electronics'
  | 'cat_4_computers'
  | 'cat_5_telecom_info_security'
  | 'cat_6_sensors_lasers'
  | 'cat_7_navigation_avionics'
  | 'cat_8_marine'
  | 'cat_9_aerospace_propulsion'
  | 'ear99_commercial';

export type EncryptionLevel =
  | 'standard_commercial_5a992'
  | 'mass_market_eligible_5a992_note3'
  | 'controlled_high_assurance_5a002'
  | 'non_cryptographic';

export type LicenseExceptionType =
  | 'enc_740_17_b1'
  | 'enc_740_17_b2'
  | 'enc_740_17_b3'
  | 'tsr_restricted_tech'
  | 'sta_strategic_trade'
  | 'civ_civil_end_users'
  | 'gbs_shipments_group_b'
  | 'no_license_required_nlr';

export type EarCountryGroup =
  | 'group_a_allies'
  | 'group_b_general'
  | 'group_d_1_national_security'
  | 'group_d_5_arms_embargoed'
  | 'group_e_1_terrorist_supporting'
  | 'group_e_2_unilateral_embargo';

export type CfiusTidStatus =
  | 'non_tid_unrestricted'
  | 'critical_technology_t'
  | 'critical_infrastructure_i'
  | 'sensitive_personal_data_d'
  | 'composite_tid_multi_trigger';

export type CfiusFilingType =
  | 'mandatory_declaration_part_800'
  | 'voluntary_joint_notice'
  | 'no_clearance_required'
  | 'cleared_safe_harbor';

export type SubstantialTransformationCriterion =
  | 'tariff_shift_chapter_level'
  | 'tariff_shift_heading_level'
  | 'tariff_shift_subheading_level'
  | 'regional_value_content_transaction_value'
  | 'regional_value_content_net_cost'
  | 'insufficient_assembly_simple_packaging';

export type FreeTradeAgreementCode =
  | 'usmca'
  | 'cptpp'
  | 'evfta'
  | 'korus'
  | 'general_mfn_non_preferential';

export type CtsriRiskTier =
  | 'tier_1_elite_zero_defect'
  | 'tier_2_managed_exposure'
  | 'tier_3_elevated_remediation'
  | 'tier_4_critical_board_escalation';

export type TripartiteSignoffRole =
  | 'head_of_global_trade_compliance'
  | 'chief_legal_officer'
  | 'chief_executive_officer';

export type VsdFilingAuthority = 'bis_oee' | 'ofac_enforcement' | 'joint_bis_ofac' | 'doj_nsd';

export interface BeneficialOwnerNodeDTO {
  id: string;
  name: string;
  country: string;
  isDirectlySanctioned: boolean;
  sanctionSource?: SanctionsListSource;
  ownershipPercentage: number;
  votingRightsPercentage: number;
  children: BeneficialOwnerNodeDTO[];
}

export interface SanctionsHitDTO {
  id: string;
  listSource: SanctionsListSource;
  entityName: string;
  aliases: string[];
  matchedField: 'legal_name' | 'alias' | 'registration_id' | 'address';
  scoreLevenshtein: number;
  scoreJaroWinkler: number;
  scorePhonetic: number;
  compositeSimilarityScore: number;
  confidence: SanctionsMatchConfidence;
  regulatoryReference: string;
}

export interface SanctionsScreeningRequestDTO {
  queryName: string;
  countryCode: string;
  registrationNumber?: string;
  beneficialOwnershipRoot?: BeneficialOwnerNodeDTO;
  industrySector?: string;
}

export interface SanctionsScreeningResultDTO {
  screeningId: string;
  screenedAt: string;
  queryName: string;
  directMatches: SanctionsHitDTO[];
  aggregateBlockedOwnership: number;
  isBlockedByFiftyPercentRule: boolean;
  secondarySanctionsExposureIndex: number;
  riskTier: CtsriRiskTier;
  recommendedAction: 'immediate_freeze_report' | 'enhanced_due_diligence' | 'cleared';
}

export interface EccnClassificationRequestDTO {
  itemId: string;
  itemName: string;
  functionalDescription: string;
  eccnCandidate: string;
  implementsSymmetricEncryption: boolean;
  symmetricKeyLengthBits: number;
  implementsAsymmetricEncryption: boolean;
  asymmetricKeyLengthBits: number;
  implementsEllipticCurve: boolean;
  ellipticCurveBits: number;
  isMassMarketRetailAvailable: boolean;
  isUserModifiableCryptographicArchitecture: boolean;
  destinationCountry: string;
}

export interface EccnClassificationResultDTO {
  classificationId: string;
  itemId: string;
  assignedEccn: string;
  reasonForControl: string[];
  encryptionLevel: EncryptionLevel;
  applicableLicenseException: LicenseExceptionType;
  requiresSemiAnnualReporting: boolean;
  requiresExportLicense: boolean;
  determinationJustification: string;
}

export interface DeemedExportAuditRequestDTO {
  employeeId: string;
  employeeName: string;
  citizenshipCountry: string;
  permanentResidencyCountry?: string;
  isUsPerson: boolean;
  accessedEccn: string;
  technicalDataScope: 'source_code_read' | 'binary_execution' | 'architecture_specs' | 'cryptographic_keys';
}

export interface DeemedExportAuditResultDTO {
  auditId: string;
  employeeId: string;
  citizenshipCountry: string;
  earCountryGroup: EarCountryGroup;
  deemedExportExposureScore: number;
  requiresDeemedExportLicense: boolean;
  licenseExceptionAvailable?: LicenseExceptionType;
  actionRequired: 'license_mandated_before_access' | 'technology_transfer_plan_required' | 'access_granted';
}

export interface CfiusTidAssessmentRequestDTO {
  transactionId: string;
  targetCompanyName: string;
  dealValueUsd: number;
  producesCriticalTechnology: boolean;
  operatesCriticalInfrastructure: boolean;
  sensitivePersonalDataRecordsCount: number;
  targetsMilitaryOrIntelligencePersonnel: boolean;
  foreignInvestorCountry: string;
  foreignInvestorOwnershipPercentage: number;
  foreignInvestorBoardSeats: number;
  foreignInvestorMaterialNonpublicAccess: boolean;
  foreignGovernmentVotingPercentage: number;
}

export interface CfiusTidAssessmentResultDTO {
  assessmentId: string;
  tidStatus: CfiusTidStatus;
  sensitiveDataThresholdExceeded: boolean;
  isCoveredInvestment: boolean;
  filingRequirement: CfiusFilingType;
  statutorySafeHarborAvailable: boolean;
  nationalSecurityRiskScore: number;
  recommendedMitigationMeasures: string[];
}

export interface NsmaMitigationAgreementDTO {
  id: string;
  transactionId: string;
  agencySignatories: string[];
  covenantTitle: string;
  auditFrequencyDays: number;
  lastAuditDate: string;
  nextAuditDueDate: string;
  complianceStatus: 'in_compliance' | 'curable_deficiency' | 'material_breach';
  monitoringTrusteeName: string;
}

export interface CustomsLandedDutyRequestDTO {
  partNumber: string;
  description: string;
  htsCode: string;
  countryOfOrigin: string;
  exportCountry: string;
  customsValueUsd: number;
  freightInsuranceUsd: number;
  qualifyingFta?: FreeTradeAgreementCode;
  totalTransactionValueUsd: number;
  netCostUsd: number;
  valueNonOriginatingMaterialsUsd: number;
}

export interface CustomsLandedDutyResultDTO {
  calculationId: string;
  htsCode: string;
  generalMfnDutyRate: number;
  section301DutyRate: number;
  section232DutyRate: number;
  ftaPreferentialDutyRate: number;
  dutySavedByFtaUsd: number;
  baseDutyAmountUsd: number;
  section301AmountUsd: number;
  section232AmountUsd: number;
  totalDutyPayableUsd: number;
  effectiveDutyRatePercentage: number;
  regionalValueContentPercentage: number;
  isFtaOriginQualified: boolean;
}

export interface VoluntarySelfDisclosureDTO {
  id: string;
  vsdReferenceNumber: string;
  targetAuthority: VsdFilingAuthority;
  title: string;
  suspectedRegulationBreach: string;
  incidentStartDate: string;
  incidentEndDate: string;
  estimatedTransactionsCount: number;
  estimatedTransactionVolumeUsd: number;
  narrativeSummary: string;
  rootCauseAnalysis: string;
  remedialActionsImplemented: string[];
  generatedMarkdownReport: string;
  status: 'draft' | 'under_legal_review' | 'tripartite_pending' | 'submitted_to_regulator';
  complianceOfficerSignature?: string;
  complianceOfficerSignedAt?: string;
  chiefLegalOfficerSignature?: string;
  chiefLegalOfficerSignedAt?: string;
  chiefExecutiveOfficerSignature?: string;
  chiefExecutiveOfficerSignedAt?: string;
}

export interface TradeComplianceSignoffDTO {
  id: string;
  vsdId: string;
  role: TripartiteSignoffRole;
  signerName: string;
  signatureHash: string;
  signedAt: string;
}

export interface GlobalTradeNexusOverviewDTO {
  ctsriScore: number;
  ctsriRiskTier: CtsriRiskTier;
  sanctionsRiskComponent: number;
  exportControlRiskComponent: number;
  cfiusRiskComponent: number;
  customsDutyRiskComponent: number;
  disclosureGovernanceComponent: number;
  activeSanctionsScreeningCount: number;
  pendingSanctionsHitsCount: number;
  activeEccnClassificationsCount: number;
  activeDeemedExportLicensesCount: number;
  activeCfiusAssessmentsCount: number;
  activeNsmaAgreementsCount: number;
  activeHtsCatalogItemsCount: number;
  pendingVsdFilingsCount: number;
  lastUpdated: string;
}

export function computeLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1].toLowerCase() === str2[j - 1].toLowerCase() ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function computeJaroWinklerSimilarity(s1: string, s2: string): number {
  const a = s1.trim().toLowerCase();
  const b = s2.trim().toLowerCase();
  if (a === b) return 1.0;
  if (a.length === 0 || b.length === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }

  const jaro = (matches / a.length + matches / b.length + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(a.length, b.length)); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

export function computeSimplePhoneticHash(word: string): string {
  const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
  if (!clean) return '';
  const first = clean[0];
  const mapped = clean
    .slice(1)
    .replace(/[BFPV]/g, '1')
    .replace(/[CGJKQSXZ]/g, '2')
    .replace(/[DT]/g, '3')
    .replace(/[L]/g, '4')
    .replace(/[MN]/g, '5')
    .replace(/[R]/g, '6')
    .replace(/[AEIOUHWY]/g, '');
  const dedupe: string[] = [];
  for (let i = 0; i < mapped.length; i++) {
    if (dedupe.length === 0 || dedupe[dedupe.length - 1] !== mapped[i]) {
      dedupe.push(mapped[i]);
    }
  }
  return (first + dedupe.join('') + '0000').slice(0, 4);
}

export function computeSanctionsCompositeScore(query: string, candidate: string): {
  scoreLevenshtein: number;
  scoreJaroWinkler: number;
  scorePhonetic: number;
  compositeScore: number;
} {
  const maxLen = Math.max(query.length, candidate.length);
  const levDist = computeLevenshteinDistance(query, candidate);
  const scoreLev = maxLen === 0 ? 1.0 : Math.max(0, 1.0 - levDist / maxLen);
  const scoreJW = computeJaroWinklerSimilarity(query, candidate);
  const phone1 = computeSimplePhoneticHash(query);
  const phone2 = computeSimplePhoneticHash(candidate);
  const scorePhone = phone1 === phone2 && phone1.length > 0 ? 1.0 : 0.0;
  const composite = 0.40 * scoreJW + 0.35 * scoreLev + 0.25 * scorePhone;
  return {
    scoreLevenshtein: Math.round(scoreLev * 100) / 100,
    scoreJaroWinkler: Math.round(scoreJW * 100) / 100,
    scorePhonetic: Math.round(scorePhone * 100) / 100,
    compositeScore: Math.round(composite * 100) / 100,
  };
}

export function calculateAggregateBlockedOwnership(node: BeneficialOwnerNodeDTO, pathWeight: number = 1.0): number {
  let directContribution = 0;
  if (node.isDirectlySanctioned) {
    directContribution = (node.ownershipPercentage / 100) * pathWeight;
  }
  let downstreamContribution = 0;
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childWeight = (node.ownershipPercentage / 100) * pathWeight;
      downstreamContribution += calculateAggregateBlockedOwnership(child, childWeight);
    }
  }
  return directContribution + downstreamContribution;
}

export function evaluateOfacFiftyPercentRule(root: BeneficialOwnerNodeDTO): {
  aggregateBlockedFraction: number;
  aggregateBlockedPercentage: number;
  isBlockedByLaw: boolean;
} {
  const fraction = calculateAggregateBlockedOwnership(root, 1.0);
  const percentage = Math.min(100, Math.round(fraction * 10000) / 100);
  return {
    aggregateBlockedFraction: fraction,
    aggregateBlockedPercentage: percentage,
    isBlockedByLaw: fraction >= 0.50,
  };
}

export function computeSecondarySanctionsExposureIndex(
  directMatchScore: number,
  aggregateBlockedFraction: number,
  countryRiskWeight: number,
  sectorRiskWeight: number
): number {
  const ownershipComp = Math.min(100, aggregateBlockedFraction * 200);
  const raw = 0.35 * directMatchScore + 0.30 * ownershipComp + 0.20 * countryRiskWeight + 0.15 * sectorRiskWeight;
  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
}

export function evaluateEccnEncryptionClassification(params: {
  isSoftware: boolean;
  symmetricBits: number;
  asymmetricBits: number;
  ellipticBits: number;
  isMassMarket: boolean;
  destinationCountry: string;
}): {
  assignedEccn: string;
  encryptionLevel: EncryptionLevel;
  exception: LicenseExceptionType;
  requiresReporting: boolean;
  requiresLicense: boolean;
} {
  const hasStrongCrypto =
    params.symmetricBits >= 56 || params.asymmetricBits >= 512 || params.ellipticBits >= 112;

  if (!hasStrongCrypto) {
    return {
      assignedEccn: 'EAR99',
      encryptionLevel: 'non_cryptographic',
      exception: 'no_license_required_nlr',
      requiresReporting: false,
      requiresLicense: false,
    };
  }

  if (params.isMassMarket) {
    return {
      assignedEccn: params.isSoftware ? '5D992.c' : '5A992.c',
      encryptionLevel: 'mass_market_eligible_5a992_note3',
      exception: 'no_license_required_nlr',
      requiresReporting: false,
      requiresLicense: false,
    };
  }

  const isEmbargoed = ['CU', 'IR', 'KP', 'SY', 'RU', 'BY'].includes(params.destinationCountry.toUpperCase());

  return {
    assignedEccn: params.isSoftware ? '5D002.a.1' : '5A002.a.1',
    encryptionLevel: 'controlled_high_assurance_5a002',
    exception: isEmbargoed ? 'no_license_required_nlr' : 'enc_740_17_b1',
    requiresReporting: !isEmbargoed,
    requiresLicense: isEmbargoed,
  };
}

export function computeDeemedExportExposure(params: {
  isUsPerson: boolean;
  countryGroup: EarCountryGroup;
  controlledEccn: string;
  scope: 'source_code_read' | 'binary_execution' | 'architecture_specs' | 'cryptographic_keys';
}): {
  score: number;
  requiresLicense: boolean;
} {
  if (params.isUsPerson) {
    return { score: 0, requiresLicense: false };
  }

  const countryWeightMap: Record<EarCountryGroup, number> = {
    group_a_allies: 10,
    group_b_general: 25,
    group_d_1_national_security: 70,
    group_d_5_arms_embargoed: 90,
    group_e_1_terrorist_supporting: 100,
    group_e_2_unilateral_embargo: 100,
  };

  const scopeWeightMap = {
    binary_execution: 30,
    architecture_specs: 60,
    source_code_read: 85,
    cryptographic_keys: 100,
  };

  const eccnWeight = params.controlledEccn.startsWith('5D002') || params.controlledEccn.startsWith('5A002') ? 85 : 40;
  const countryWeight = countryWeightMap[params.countryGroup] ?? 25;
  const scopeWeight = scopeWeightMap[params.scope] ?? 50;

  const raw = 0.45 * countryWeight + 0.35 * eccnWeight + 0.20 * scopeWeight;
  const score = Math.min(100, Math.round(raw * 100) / 100);
  const requiresLicense = score >= 60;

  return { score, requiresLicense };
}

export function evaluateCfiusTidObligations(params: {
  criticalTech: boolean;
  criticalInfra: boolean;
  personalDataCount: number;
  militaryTargets: boolean;
  foreignGovVotingPct: number;
  foreignAcquisitionPct: number;
  hasBoardSeat: boolean;
  hasMaterialNonpublicAccess: boolean;
}): {
  tidStatus: CfiusTidStatus;
  sensitiveThresholdExceeded: boolean;
  isCoveredInvestment: boolean;
  isMandatoryFiling: boolean;
  filingType: CfiusFilingType;
  riskScore: number;
} {
  const sensitiveExceeded = params.personalDataCount >= 1000000 || params.militaryTargets;

  let tidStatus: CfiusTidStatus = 'non_tid_unrestricted';
  const triggers: string[] = [];
  if (params.criticalTech) triggers.push('T');
  if (params.criticalInfra) triggers.push('I');
  if (sensitiveExceeded) triggers.push('D');

  if (triggers.length > 1) tidStatus = 'composite_tid_multi_trigger';
  else if (params.criticalTech) tidStatus = 'critical_technology_t';
  else if (params.criticalInfra) tidStatus = 'critical_infrastructure_i';
  else if (sensitiveExceeded) tidStatus = 'sensitive_personal_data_d';

  const isTid = tidStatus !== 'non_tid_unrestricted';
  const isCovered =
    params.foreignAcquisitionPct >= 50 ||
    params.hasBoardSeat ||
    params.hasMaterialNonpublicAccess;

  const isMandatory =
    isTid &&
    params.foreignGovVotingPct >= 25 &&
    params.foreignAcquisitionPct >= 49;

  let filingType: CfiusFilingType = 'no_clearance_required';
  if (isMandatory) filingType = 'mandatory_declaration_part_800';
  else if (isTid && isCovered) filingType = 'voluntary_joint_notice';

  let risk = 15;
  if (isTid) risk += 40;
  if (isCovered) risk += 20;
  if (isMandatory) risk += 25;
  const riskScore = Math.min(100, risk);

  return {
    tidStatus,
    sensitiveThresholdExceeded: sensitiveExceeded,
    isCoveredInvestment: isCovered,
    isMandatoryFiling: isMandatory,
    filingType,
    riskScore,
  };
}

export function computeCustomsDutyAndRvc(params: {
  customsValueUsd: number;
  mfnRatePct: number;
  section301RatePct: number;
  section232RatePct: number;
  totalTransactionValueUsd: number;
  netCostUsd: number;
  valueNonOriginatingMaterialsUsd: number;
  ftaCode?: FreeTradeAgreementCode;
}): {
  baseDutyUsd: number;
  section301Usd: number;
  section232Usd: number;
  ftaSavingsUsd: number;
  totalDutyPayableUsd: number;
  effectiveDutyRatePct: number;
  rvcTransactionValuePct: number;
  rvcNetCostPct: number;
  isFtaQualified: boolean;
} {
  const baseDuty = params.customsValueUsd * (params.mfnRatePct / 100);
  const s301Duty = params.customsValueUsd * (params.section301RatePct / 100);
  const s232Duty = params.customsValueUsd * (params.section232RatePct / 100);

  const rvcTv =
    params.totalTransactionValueUsd > 0
      ? ((params.totalTransactionValueUsd - params.valueNonOriginatingMaterialsUsd) /
          params.totalTransactionValueUsd) *
        100
      : 0;

  const rvcNc =
    params.netCostUsd > 0
      ? ((params.netCostUsd - params.valueNonOriginatingMaterialsUsd) / params.netCostUsd) * 100
      : 0;

  let qualifies = false;
  if (params.ftaCode === 'usmca' && rvcTv >= 60.0) qualifies = true;
  else if (params.ftaCode === 'cptpp' && rvcTv >= 55.0) qualifies = true;
  else if (params.ftaCode === 'evfta' && rvcTv >= 45.0) qualifies = true;

  const ftaSavings = qualifies ? baseDuty : 0;
  const totalDuty = Math.max(0, baseDuty - ftaSavings) + s301Duty + s232Duty;
  const effectiveRate = params.customsValueUsd > 0 ? (totalDuty / params.customsValueUsd) * 100 : 0;

  return {
    baseDutyUsd: Math.round(baseDuty * 100) / 100,
    section301Usd: Math.round(s301Duty * 100) / 100,
    section232Usd: Math.round(s232Duty * 100) / 100,
    ftaSavingsUsd: Math.round(ftaSavings * 100) / 100,
    totalDutyPayableUsd: Math.round(totalDuty * 100) / 100,
    effectiveDutyRatePct: Math.round(effectiveRate * 100) / 100,
    rvcTransactionValuePct: Math.round(rvcTv * 100) / 100,
    rvcNetCostPct: Math.round(rvcNc * 100) / 100,
    isFtaQualified: qualifies,
  };
}

export function computeCompositeTradeSanctionsRiskIndex(
  sanctionsRisk: number,
  exportRisk: number,
  cfiusRisk: number,
  customsRisk: number,
  disclosureRisk: number
): {
  ctsriScore: number;
  tier: CtsriRiskTier;
} {
  const raw =
    0.30 * sanctionsRisk +
    0.25 * exportRisk +
    0.20 * cfiusRisk +
    0.15 * customsRisk +
    0.10 * disclosureRisk;
  const ctsriScore = Math.min(100, Math.max(0, Math.round(raw * 100) / 100));

  let tier: CtsriRiskTier = 'tier_1_elite_zero_defect';
  if (ctsriScore > 70) tier = 'tier_4_critical_board_escalation';
  else if (ctsriScore > 40) tier = 'tier_3_elevated_remediation';
  else if (ctsriScore > 15) tier = 'tier_2_managed_exposure';

  return { ctsriScore, tier };
}

export function generateVsdDossierMarkdown(params: {
  vsdReferenceNumber: string;
  targetAuthority: string;
  title: string;
  suspectedRegulationBreach: string;
  incidentStartDate: string;
  incidentEndDate: string;
  estimatedTransactionsCount: number;
  estimatedTransactionVolumeUsd: number;
  narrativeSummary: string;
  rootCauseAnalysis: string;
  remedialActionsImplemented: string[];
}): string {
  return `# VOLUNTARY SELF-DISCLOSURE DOSSIER
**Reference Number:** ${params.vsdReferenceNumber}  
**Submission Authority:** ${params.targetAuthority.toUpperCase()}  
**Date of Preparation:** ${new Date().toISOString().slice(0, 10)}  
**Title:** ${params.title}

## 1. Statutory Basis & Disclosure Notification
This submission constitutes a formal Voluntary Self-Disclosure submitted pursuant to 15 C.F.R. § 764.5 (Export Administration Regulations) and 31 C.F.R. § 501.604 (OFAC Economic Sanctions Enforcement Guidelines). The Disclosing Entity hereby self-reports potential inadvertent non-compliance.

## 2. Executive Summary of Detected Matters
- **Identified Violation:** ${params.suspectedRegulationBreach}
- **Incident Period:** ${params.incidentStartDate} through ${params.incidentEndDate}
- **Affected Transaction Count:** ${params.estimatedTransactionsCount} shipments / releases
- **Aggregate Transaction Value:** $${params.estimatedTransactionVolumeUsd.toLocaleString()} USD

## 3. Narrative of Events & Factual Summary
${params.narrativeSummary}

## 4. Thorough Root Cause Analysis
${params.rootCauseAnalysis}

## 5. Comprehensive Remedial Actions Implemented
${params.remedialActionsImplemented.map((act, i) => `${i + 1}. ${act}`).join('\n')}

## 6. Tripartite Executive Sign-Off & Attestation
We, the undersigned corporate officers, certify under penalty of perjury that this disclosure is true, correct, and complete to the best of our knowledge.

- **Head of Global Trade Compliance:** [Pending Digital Signature]
- **Chief Legal Officer / General Counsel:** [Pending Digital Signature]
- **Chief Executive Officer:** [Pending Digital Signature]
`;
}

export function validateSanctionsScreeningInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<SanctionsScreeningRequestDTO>;
  if (!i.queryName || typeof i.queryName !== 'string' || i.queryName.trim().length === 0) {
    errors.queryName = 'Query entity name is required';
  }
  if (!i.countryCode || typeof i.countryCode !== 'string' || i.countryCode.trim().length !== 2) {
    errors.countryCode = 'Country code must be a 2-letter ISO code';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateEccnClassificationInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<EccnClassificationRequestDTO>;
  if (!i.itemName || typeof i.itemName !== 'string' || i.itemName.trim().length === 0) {
    errors.itemName = 'Item name is required';
  }
  if (!i.functionalDescription || typeof i.functionalDescription !== 'string' || i.functionalDescription.trim().length < 5) {
    errors.functionalDescription = 'Functional description must be at least 5 characters';
  }
  if (typeof i.symmetricKeyLengthBits !== 'number' || i.symmetricKeyLengthBits < 0) {
    errors.symmetricKeyLengthBits = 'Symmetric key length must be non-negative';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateDeemedExportAuditInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<DeemedExportAuditRequestDTO>;
  if (!i.employeeName || typeof i.employeeName !== 'string' || i.employeeName.trim().length === 0) {
    errors.employeeName = 'Employee name is required';
  }
  if (!i.citizenshipCountry || typeof i.citizenshipCountry !== 'string' || i.citizenshipCountry.trim().length !== 2) {
    errors.citizenshipCountry = 'Citizenship country code must be a 2-letter ISO code';
  }
  if (!i.accessedEccn || typeof i.accessedEccn !== 'string') {
    errors.accessedEccn = 'Accessed ECCN is required';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCfiusAssessmentInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<CfiusTidAssessmentRequestDTO>;
  if (!i.targetCompanyName || typeof i.targetCompanyName !== 'string' || i.targetCompanyName.trim().length === 0) {
    errors.targetCompanyName = 'Target company name is required';
  }
  if (typeof i.dealValueUsd !== 'number' || i.dealValueUsd <= 0) {
    errors.dealValueUsd = 'Deal value must be positive';
  }
  if (typeof i.sensitivePersonalDataRecordsCount !== 'number' || i.sensitivePersonalDataRecordsCount < 0) {
    errors.sensitivePersonalDataRecordsCount = 'Sensitive personal data records count must be non-negative';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCustomsDutyInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<CustomsLandedDutyRequestDTO>;
  if (!i.partNumber || typeof i.partNumber !== 'string' || i.partNumber.trim().length === 0) {
    errors.partNumber = 'Part number is required';
  }
  if (!i.htsCode || typeof i.htsCode !== 'string' || i.htsCode.trim().length < 4) {
    errors.htsCode = 'Valid HTS code is required';
  }
  if (typeof i.customsValueUsd !== 'number' || i.customsValueUsd <= 0) {
    errors.customsValueUsd = 'Customs value must be positive';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateCompileVsdInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<VoluntarySelfDisclosureDTO>;
  if (!i.vsdReferenceNumber || typeof i.vsdReferenceNumber !== 'string' || i.vsdReferenceNumber.trim().length < 3) {
    errors.vsdReferenceNumber = 'VSD reference number is required';
  }
  if (!i.title || typeof i.title !== 'string' || i.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }
  if (!i.suspectedRegulationBreach || typeof i.suspectedRegulationBreach !== 'string' || i.suspectedRegulationBreach.trim().length < 5) {
    errors.suspectedRegulationBreach = 'Suspected regulation breach must be at least 5 characters';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}

export function validateExecuteSignoffInput(input: unknown): {
  ok: boolean;
  isValid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      isValid: false,
      errors: { payload: 'Payload must be a non-null object' },
    };
  }
  const i = input as Partial<{ vsdId: string; role: TripartiteSignoffRole; signerName: string; signatureHash: string }>;
  const validRoles: TripartiteSignoffRole[] = [
    'head_of_global_trade_compliance',
    'chief_legal_officer',
    'chief_executive_officer',
  ];
  if (!i.role || !validRoles.includes(i.role)) {
    errors.role = 'Role must be head_of_global_trade_compliance, chief_legal_officer, or chief_executive_officer';
  }
  if (!i.signerName || typeof i.signerName !== 'string' || i.signerName.trim().length < 2) {
    errors.signerName = 'Signer name must be at least 2 characters';
  }
  if (!i.signatureHash || typeof i.signatureHash !== 'string' || i.signatureHash.trim().length < 8) {
    errors.signatureHash = 'Valid signature hash is required';
  }
  const hasErrors = Object.keys(errors).length > 0;
  return { ok: !hasErrors, isValid: !hasErrors, errors };
}
