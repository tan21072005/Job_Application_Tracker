export type LegalEntityJurisdiction =
  | 'DELAWARE_US'
  | 'UNITED_KINGDOM'
  | 'SINGAPORE'
  | 'GERMANY'
  | 'CAYMAN_ISLANDS';

export type LegalEntityType =
  | 'C_CORPORATION'
  | 'LIMITED_LIABILITY_COMPANY'
  | 'PRIVATE_LIMITED_COMPANY'
  | 'GMBH'
  | 'EXEMPTED_COMPANY';

export type EntityGoodStandingStatus =
  | 'GOOD_STANDING'
  | 'FILING_PENDING'
  | 'DELINQUENT'
  | 'UNDER_INVESTIGATION'
  | 'STRIKE_OFF_RISK';

export type IPAssetType =
  | 'UTILITY_PATENT'
  | 'DESIGN_PATENT'
  | 'TRADEMARK'
  | 'TRADE_SECRET'
  | 'COPYRIGHT';

export type PatentOfficeJurisdiction =
  | 'USPTO'
  | 'EPO'
  | 'WIPO'
  | 'JPO'
  | 'CNIPA';

export type PatentProsecutionStatus =
  | 'PROVISIONAL_PENDING'
  | 'NON_PROVISIONAL_FILED'
  | 'PCT_INTERNATIONAL_STAGE'
  | 'PCT_NATIONAL_STAGE_ENTERED'
  | 'OFFICE_ACTION_PENDING'
  | 'FINAL_REJECTION_ISSUED'
  | 'NOTICE_OF_ALLOWANCE'
  | 'PATENT_GRANTED'
  | 'MAINTENANCE_FEE_DUE'
  | 'EXPIRED_OR_ABANDONED';

export type PPHStatus =
  | 'NOT_APPLICABLE'
  | 'ELIGIBLE'
  | 'REQUEST_FILED'
  | 'PETITION_GRANTED'
  | 'ACCELERATED_EXAMINATION';

export type CommercialContractType =
  | 'MASTER_SERVICES_AGREEMENT'
  | 'NON_DISCLOSURE_AGREEMENT'
  | 'DATA_PROCESSING_ADDENDUM'
  | 'ENTERPRISE_SAAS_SUBSCRIPTION'
  | 'STRATEGIC_VENDOR_PROCUREMENT'
  | 'PARTNER_RESELLER_AGREEMENT';

export type LiabilityCapType =
  | 'SUB_1X_ACV'
  | 'STANDARD_1X_ACV'
  | 'EXPANDED_2X_ACV'
  | 'SUPER_CAP_BREACH'
  | 'UNCAPPED_EXPOSURE';

export type GoverningLawJurisdiction =
  | 'DELAWARE_US'
  | 'NEW_YORK_US'
  | 'CALIFORNIA_US'
  | 'ENGLAND_AND_WALES'
  | 'SINGAPORE'
  | 'GERMANY'
  | 'NON_STANDARD_FOREIGN';

export type DisputeResolutionForum =
  | 'DELAWARE_CHANCERY_COURT'
  | 'NY_STATE_OR_FEDERAL_COURT'
  | 'ENGLISH_HIGH_COURT'
  | 'AAA_ICDR_ARBITRATION'
  | 'LCIA_ARBITRATION'
  | 'ICC_INTERNATIONAL_COURT'
  | 'SIAC_ARBITRATION';

export type LitigationForumType =
  | 'US_FEDERAL_DISTRICT_COURT'
  | 'US_STATE_COURT'
  | 'USPTO_PTAB_IPR'
  | 'USPTO_PTAB_PGR'
  | 'US_ITC_SECTION_337'
  | 'INTERNATIONAL_ARBITRATION';

export type ASC450ContingencyClassification =
  | 'PROBABLE'
  | 'REASONABLY_POSSIBLE'
  | 'REMOTE';

export type CustodianHoldStatus =
  | 'DRAFT'
  | 'ACTIVE_ISSUED'
  | 'ESCALATION_REQUIRED'
  | 'RELEASED_AND_CLOSED';

export type LegalSignoffRole =
  | 'deputy_general_counsel'
  | 'chief_intellectual_property_counsel'
  | 'general_counsel_corporate_secretary';

export type LegalBoardMemoStatus =
  | 'DRAFT'
  | 'PENDING_DGC_APPROVAL'
  | 'PENDING_CIPC_APPROVAL'
  | 'PENDING_GC_APPROVAL'
  | 'BOARD_CERTIFIED_LOCKED';

export interface StatutoryRegisterRecordDTO {
  id: string;
  entityId: string;
  registerType: 'DIRECTOR' | 'OFFICER' | 'SHAREHOLDER' | 'BENEFICIAL_OWNER_PSC';
  fullName: string;
  nationalityOrJurisdiction: string;
  appointmentDate: string;
  resignationDate?: string;
  ownershipPercentage?: number;
  votingRightsPercentage?: number;
  isSanctionScreened: boolean;
}

export interface StatutoryFilingDeadlineDTO {
  id: string;
  entityId: string;
  filingTitle: string;
  filingAuthority: string;
  statutoryDeadline: string;
  filingStatus: 'COMPLETED' | 'UPCOMING' | 'OVERDUE' | 'EXEMPT';
  penaltyExposureUsd: number;
  completedDate?: string;
}

export interface LegalEntityDTO {
  id: string;
  userId: string;
  legalName: string;
  entityType: LegalEntityType;
  jurisdiction: LegalEntityJurisdiction;
  registrationNumber: string;
  incorporationDate: string;
  status: EntityGoodStandingStatus;
  registeredAgent: string;
  principalOfficeAddress: string;
  taxIdentificationNumber: string;
  intercompanyAgreementCount: number;
  statutoryFilings: StatutoryFilingDeadlineDTO[];
  statutoryRegisters: StatutoryRegisterRecordDTO[];
}

export interface PatentDocketMilestoneDTO {
  id: string;
  assetId: string;
  milestoneTitle: string;
  actionCode: string;
  issuanceDate: string;
  statutoryDueDate: string;
  extensionAvailableMonths: number;
  isCompleted: boolean;
  completionDate?: string;
}

export interface IPAssetDTO {
  id: string;
  userId: string;
  entityId: string;
  entityName: string;
  ipType: IPAssetType;
  title: string;
  registrationOrAppNumber: string;
  office: PatentOfficeJurisdiction;
  filingDate: string;
  grantDate?: string;
  expirationDate: string;
  status: PatentProsecutionStatus;
  pphStatus: PPHStatus;
  claimsCount: number;
  independentClaimsCount: number;
  forwardCitationsCount: number;
  backwardCitationsCount: number;
  officeActionsCount: number;
  rceFilingsCount: number;
  statutoryExtensionsCount: number;
  foreignFamilyCount: number;
  pqdiScore: number;
  docketMilestones: PatentDocketMilestoneDTO[];
}

export interface MaterialContractDTO {
  id: string;
  userId: string;
  entityId: string;
  entityName: string;
  title: string;
  counterpartyLegalName: string;
  contractType: CommercialContractType;
  effectiveDate: string;
  expirationDate: string;
  annualContractValue: number;
  totalContractValue: number;
  liabilityCapType: LiabilityCapType;
  liabilityCapUsd: number;
  hasUncappedIndemnity: boolean;
  governingLaw: GoverningLawJurisdiction;
  disputeForum: DisputeResolutionForum;
  hasMfnClause: boolean;
  hasExclusivityOrNonCompete: boolean;
  autoRenewalNoticeDays: number;
  renewalNoticeDeadline: string;
  terminationForConvenienceNoticeDays: number;
  crdiScore: number;
  contractStatus: 'ACTIVE' | 'PENDING_RENEWAL' | 'OPTED_OUT' | 'TERMINATED';
}

export interface CustodianAcknowledgmentRecordDTO {
  id: string;
  holdId: string;
  custodianName: string;
  custodianEmail: string;
  department: string;
  noticeSentAt: string;
  acknowledgedAt?: string;
  escalationCount: number;
  isOffboardingFlagged: boolean;
}

export interface CustodianLegalHoldDTO {
  id: string;
  userId: string;
  matterId: string;
  holdTitle: string;
  scopeDescription: string;
  issuedAt: string;
  status: CustodianHoldStatus;
  totalCustodiansCount: number;
  acknowledgedCount: number;
  spoliationRiskScore: number;
  custodians: CustodianAcknowledgmentRecordDTO[];
}

export interface OutsideCounselInvoiceDTO {
  id: string;
  userId: string;
  matterId: string;
  lawFirmName: string;
  ledesInvoiceNumber: string;
  invoiceDate: string;
  billedAmountUsd: number;
  auditedApprovedAmountUsd: number;
  allocatedMatterBudgetUsd: number;
  blendedHourlyRateUsd: number;
  efficiencyScore: number;
}

export interface LitigationMatterDTO {
  id: string;
  userId: string;
  entityId: string;
  caseCaption: string;
  docketNumber: string;
  tribunal: LitigationForumType;
  filingDate: string;
  leadOutsideCounselFirm: string;
  opposingParty: string;
  claimsSummary: string;
  reliefClaimedAmountUsd: number;
  asc450Classification: ASC450ContingencyClassification;
  accruedReserveAmountUsd: number;
  estimatedLossRangeMinUsd: number;
  estimatedLossRangeMaxUsd: number;
  matterStatus: 'ACTIVE' | 'STAYED' | 'SETTLEMENT_NEGOTIATION' | 'DISMISSED' | 'FINAL_JUDGMENT';
  legalHolds: CustodianLegalHoldDTO[];
  outsideCounselInvoices: OutsideCounselInvoiceDTO[];
}

export interface DigitalExecutiveSignatureDTO {
  role: LegalSignoffRole;
  signerName: string;
  signerTitle: string;
  signedAt: string;
  signatureDigestSha256: string;
}

export interface LegalBoardMemorandumDTO {
  id: string;
  userId: string;
  reportingQuarter: string;
  fiscalYear: number;
  generatedAt: string;
  lrciCompositeScore: number;
  totalAsc450AccruedReserveUsd: number;
  totalAsc450PossibleExposureUsd: number;
  item103DisclosureText: string;
  memoStatus: LegalBoardMemoStatus;
  signatures: DigitalExecutiveSignatureDTO[];
  cryptographicIntegrityDigest: string;
}

export interface LegalOperationsOverviewDTO {
  userId: string;
  generatedAt: string;
  lrciCompositeScore: number;
  lrciRiskBand: 'SOVEREIGN_FORTRESS' | 'GUARDED_POSTURE' | 'ELEVATED_EXPOSURE' | 'EXISTENTIAL_JEOPARDY';
  subsidiaryComplianceScore: number;
  averagePqdiScore: number;
  averageCrdiScore: number;
  litigationExposureScore: number;
  totalLitigationReserveAccruedUsd: number;
  totalAnnualContractValueCoveredUsd: number;
  totalActivePatentsAndTrademarksCount: number;
  activeLitigationMattersCount: number;
  activeLegalHoldsCount: number;
  entities: LegalEntityDTO[];
  ipAssets: IPAssetDTO[];
  materialContracts: MaterialContractDTO[];
  litigationMatters: LitigationMatterDTO[];
  activeBoardMemorandum: LegalBoardMemorandumDTO;
}

export interface PqdiCalculationParams {
  independentClaimsCount: number;
  totalClaimsCount: number;
  forwardCitationsCount: number;
  benchmarkForwardCitations?: number;
  officeActionsCount: number;
  rceFilingsCount: number;
  statutoryExtensionsCount: number;
  foreignFamilyCount: number;
}

export function calculatePQDI(params: PqdiCalculationParams): number {
  const benchmarkFwd = params.benchmarkForwardCitations && params.benchmarkForwardCitations > 0
    ? params.benchmarkForwardCitations
    : 12.0;

  const claimRatio = Math.min(params.totalClaimsCount, 20.0) / 20.0;
  const indClaimComponent = 1.0 - Math.exp(-params.independentClaimsCount / 3.0);
  const cScore = Math.min(100.0, Math.max(0.0, 100.0 * indClaimComponent * Math.sqrt(claimRatio)));

  const fwdNumerator = Math.log(1.0 + Math.max(0, params.forwardCitationsCount));
  const fwdDenominator = Math.log(1.0 + benchmarkFwd);
  const fScore = Math.min(100.0, Math.max(0.0, 100.0 * (fwdNumerator / fwdDenominator)));

  const actionPenalty = Math.exp(-0.15 * Math.max(0, params.officeActionsCount));
  const aScore = Math.min(100.0, Math.max(0.0, 100.0 * actionPenalty));

  const velocityPenalty = (10.0 * Math.max(0, params.rceFilingsCount)) + (5.0 * Math.max(0, params.statutoryExtensionsCount));
  const pScore = Math.min(100.0, Math.max(0.0, 100.0 - velocityPenalty));

  const gScore = Math.min(100.0, Math.max(0.0, 20.0 * Math.max(0, params.foreignFamilyCount)));

  const weightedSum = (0.25 * cScore) + (0.25 * fScore) + (0.20 * aScore) + (0.15 * pScore) + (0.15 * gScore);
  const rawScore = Math.min(100.0, Math.max(0.0, weightedSum));
  return Math.round(rawScore * 100) / 100;
}

export interface CrdiCalculationParams {
  liabilityCapType: LiabilityCapType;
  hasUncappedIndemnity: boolean;
  governingLaw: GoverningLawJurisdiction;
  disputeForum: DisputeResolutionForum;
  hasMfnClause: boolean;
  hasExclusivityOrNonCompete: boolean;
  autoRenewalNoticeDays: number;
  terminationForConvenienceNoticeDays: number;
}

export function calculateCRDI(params: CrdiCalculationParams): number {
  let lolPenalty = 0.0;
  if (params.liabilityCapType === 'STANDARD_1X_ACV') {
    lolPenalty = 5.0;
  } else if (params.liabilityCapType === 'EXPANDED_2X_ACV') {
    lolPenalty = 15.0;
  } else if (params.liabilityCapType === 'SUPER_CAP_BREACH') {
    lolPenalty = 30.0;
  } else if (params.liabilityCapType === 'UNCAPPED_EXPOSURE') {
    lolPenalty = 50.0;
  }

  const indemnityPenalty = params.hasUncappedIndemnity ? 25.0 : 0.0;

  let govPenalty = 0.0;
  if (params.governingLaw === 'NON_STANDARD_FOREIGN') {
    govPenalty = 20.0;
  } else if (params.governingLaw === 'CALIFORNIA_US' || params.governingLaw === 'GERMANY') {
    govPenalty = 5.0;
  }

  let covenantPenalty = 0.0;
  if (params.hasMfnClause) covenantPenalty += 10.0;
  if (params.hasExclusivityOrNonCompete) covenantPenalty += 10.0;

  let renewalPenalty = 0.0;
  if (params.autoRenewalNoticeDays < 30 && params.terminationForConvenienceNoticeDays === 0) {
    renewalPenalty = 15.0;
  } else if (params.autoRenewalNoticeDays < 60 && params.terminationForConvenienceNoticeDays === 0) {
    renewalPenalty = 8.0;
  }

  const totalRaw = lolPenalty + indemnityPenalty + govPenalty + covenantPenalty + renewalPenalty;
  const score = Math.min(100.0, Math.max(0.0, totalRaw));
  return Math.round(score * 100) / 100;
}

export interface Asc450ReserveAssessmentParams {
  probabilityPercent: number;
  estimatedLossMinUsd: number;
  estimatedLossMaxUsd: number;
  singlePointEstimateUsd?: number;
}

export interface Asc450ReserveResult {
  classification: ASC450ContingencyClassification;
  accruedAmountUsd: number;
  footnoteDisclosedMinUsd: number;
  footnoteDisclosedMaxUsd: number;
  isBalanceSheetAccrualRequired: boolean;
  isFootnoteDisclosureRequired: boolean;
}

export function assessASC450Contingency(params: Asc450ReserveAssessmentParams): Asc450ReserveResult {
  if (params.probabilityPercent >= 75.0) {
    const accrual = params.singlePointEstimateUsd && params.singlePointEstimateUsd > 0
      ? params.singlePointEstimateUsd
      : params.estimatedLossMinUsd;
    return {
      classification: 'PROBABLE',
      accruedAmountUsd: accrual,
      footnoteDisclosedMinUsd: params.estimatedLossMinUsd,
      footnoteDisclosedMaxUsd: params.estimatedLossMaxUsd,
      isBalanceSheetAccrualRequired: true,
      isFootnoteDisclosureRequired: true
    };
  }

  if (params.probabilityPercent >= 25.0) {
    return {
      classification: 'REASONABLY_POSSIBLE',
      accruedAmountUsd: 0.0,
      footnoteDisclosedMinUsd: params.estimatedLossMinUsd,
      footnoteDisclosedMaxUsd: params.estimatedLossMaxUsd,
      isBalanceSheetAccrualRequired: false,
      isFootnoteDisclosureRequired: true
    };
  }

  return {
    classification: 'REMOTE',
    accruedAmountUsd: 0.0,
    footnoteDisclosedMinUsd: 0.0,
    footnoteDisclosedMaxUsd: 0.0,
    isBalanceSheetAccrualRequired: false,
    isFootnoteDisclosureRequired: false
  };
}

export interface LrciCalculationParams {
  subsidiaryComplianceScore: number;
  averagePqdiScore: number;
  averageCrdiScore: number;
  activeMattersCount: number;
  probableAccruedLossUsd: number;
  reasonablyPossibleLossMaxUsd: number;
  outsideCounselBudgetVariancePercent: number;
  materialityThresholdUsd?: number;
}

export interface LrciCalculationResult {
  compositeScore: number;
  baseScore: number;
  litigationCliffPenalty: number;
  riskBand: 'SOVEREIGN_FORTRESS' | 'GUARDED_POSTURE' | 'ELEVATED_EXPOSURE' | 'EXISTENTIAL_JEOPARDY';
}

export function calculateLRCI(params: LrciCalculationParams): LrciCalculationResult {
  const materiality = params.materialityThresholdUsd && params.materialityThresholdUsd > 0
    ? params.materialityThresholdUsd
    : 10000000.0;

  const subDeficit = Math.max(0.0, 100.0 - params.subsidiaryComplianceScore);
  const ipDeficit = Math.max(0.0, 100.0 - params.averagePqdiScore);
  const crdiComponent = Math.min(100.0, Math.max(0.0, params.averageCrdiScore));

  const litCountFactor = Math.min(1.0, params.activeMattersCount / 5.0);
  const litLossFactor = Math.min(1.0, params.probableAccruedLossUsd / materiality);
  const litigationExposureScore = Math.min(100.0, (50.0 * litLossFactor) + (50.0 * litCountFactor));

  const budgetVarianceScore = Math.min(100.0, Math.max(0.0, params.outsideCounselBudgetVariancePercent));

  const baseSum = (0.15 * subDeficit)
    + (0.20 * ipDeficit)
    + (0.25 * crdiComponent)
    + (0.30 * litigationExposureScore)
    + (0.10 * budgetVarianceScore);
  const baseScore = Math.min(100.0, Math.max(0.0, baseSum));

  let cliff = 0.0;
  if (params.probableAccruedLossUsd >= materiality) {
    const scale = (params.probableAccruedLossUsd - materiality) / materiality;
    cliff = Math.min(40.0, 25.0 + (15.0 * Math.min(1.0, scale)));
  } else if (params.reasonablyPossibleLossMaxUsd >= (2.0 * materiality)) {
    cliff = 15.0;
  }

  const finalComposite = Math.min(100.0, Math.max(0.0, baseScore + cliff));
  const rounded = Math.round(finalComposite * 100) / 100;

  let band: 'SOVEREIGN_FORTRESS' | 'GUARDED_POSTURE' | 'ELEVATED_EXPOSURE' | 'EXISTENTIAL_JEOPARDY' = 'SOVEREIGN_FORTRESS';
  if (rounded > 75.0) {
    band = 'EXISTENTIAL_JEOPARDY';
  } else if (rounded > 50.0) {
    band = 'ELEVATED_EXPOSURE';
  } else if (rounded > 25.0) {
    band = 'GUARDED_POSTURE';
  }

  return {
    compositeScore: rounded,
    baseScore: Math.round(baseScore * 100) / 100,
    litigationCliffPenalty: Math.round(cliff * 100) / 100,
    riskBand: band
  };
}

export interface Item103GeneratorParams {
  registrantName: string;
  fiscalYear: number;
  reportingQuarter: string;
  activeMatters: LitigationMatterDTO[];
  totalProbableReserveUsd: number;
  totalReasonablyPossibleMaxUsd: number;
}

export function generateSecItem103Disclosure(params: Item103GeneratorParams): string {
  const lines: string[] = [];
  lines.push('UNITED STATES SECURITIES AND EXCHANGE COMMISSION');
  lines.push('WASHINGTON, D.C. 20549');
  lines.push('FORM 10-K / FORM 10-Q DISCLOSURE DOCUMENTATION');
  lines.push(`REGISTRANT: ${params.registrantName.toUpperCase()}`);
  lines.push(`REPORTING PERIOD: ${params.reportingQuarter} ${params.fiscalYear}`);
  lines.push('');
  lines.push('ITEM 103. LEGAL PROCEEDINGS');
  lines.push('');
  lines.push('The Company is subject to legal proceedings, lawsuits, and other claims arising in the ordinary course of business. In accordance with U.S. GAAP Accounting Standards Codification (ASC) Topic 450, Contingencies, the Company records an accrual for a loss contingency when its occurrence is probable and damages can be reasonably estimated.');
  lines.push('');

  const materialMatters = params.activeMatters.filter(
    (m) => m.asc450Classification === 'PROBABLE' || m.asc450Classification === 'REASONABLY_POSSIBLE'
  );

  if (materialMatters.length === 0) {
    lines.push('As of the date of this report, the Company is not a party to any pending legal proceeding that management believes would have a material adverse effect on its business, financial condition, results of operations, or cash flows.');
  } else {
    lines.push('The following pending material proceedings are currently monitored by the Office of the General Counsel:');
    lines.push('');

    materialMatters.forEach((matter, idx) => {
      lines.push(`${idx + 1}. Caption: ${matter.caseCaption}`);
      lines.push(`   Docket Number: ${matter.docketNumber}`);
      lines.push(`   Tribunal/Court: ${matter.tribunal}`);
      lines.push(`   Filing Date: ${matter.filingDate}`);
      lines.push(`   Opposing Party: ${matter.opposingParty}`);
      lines.push(`   Summary of Allegations: ${matter.claimsSummary}`);
      lines.push(`   Relief Demanded: $${matter.reliefClaimedAmountUsd.toLocaleString('en-US')} USD`);
      lines.push(`   ASC 450 Status: ${matter.asc450Classification}`);
      if (matter.asc450Classification === 'PROBABLE') {
        lines.push(`   Accrued Contingent Reserve: $${matter.accruedReserveAmountUsd.toLocaleString('en-US')} USD`);
      } else {
        lines.push(`   Estimated Possible Exposure Range: $${matter.estimatedLossRangeMinUsd.toLocaleString('en-US')} to $${matter.estimatedLossRangeMaxUsd.toLocaleString('en-US')} USD`);
      }
      lines.push('   Company Assessment: The Company vigorously disputes the plaintiff allegations, maintains meritorious statutory defenses, and is actively defending its position.');
      lines.push('');
    });
  }

  lines.push('SUMMARY OF CONTINGENT LOSS BALANCES:');
  lines.push(`Aggregate ASC 450 Balance Sheet Loss Reserve Accrued: $${params.totalProbableReserveUsd.toLocaleString('en-US')} USD`);
  lines.push(`Aggregate Reasonably Possible Exposure Ceiling: $${params.totalReasonablyPossibleMaxUsd.toLocaleString('en-US')} USD`);
  lines.push('');
  lines.push('CERTIFICATION STATUS:');
  lines.push('This disclosure has been audited against docket records and verified through the Office of the General Counsel Tripartite Sign-off Pipeline.');

  return lines.join('\n');
}

export function validateLegalEntityInput(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Input payload must be a non-null object'] };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.legalName !== 'string' || payload.legalName.trim().length === 0) {
    errors.push('legalName is required and must be a non-empty string');
  }

  const validJurisdictions: LegalEntityJurisdiction[] = [
    'DELAWARE_US',
    'UNITED_KINGDOM',
    'SINGAPORE',
    'GERMANY',
    'CAYMAN_ISLANDS'
  ];
  if (!validJurisdictions.includes(payload.jurisdiction as LegalEntityJurisdiction)) {
    errors.push('jurisdiction must be one of DELAWARE_US, UNITED_KINGDOM, SINGAPORE, GERMANY, CAYMAN_ISLANDS');
  }

  const validTypes: LegalEntityType[] = [
    'C_CORPORATION',
    'LIMITED_LIABILITY_COMPANY',
    'PRIVATE_LIMITED_COMPANY',
    'GMBH',
    'EXEMPTED_COMPANY'
  ];
  if (!validTypes.includes(payload.entityType as LegalEntityType)) {
    errors.push('entityType must be one of C_CORPORATION, LIMITED_LIABILITY_COMPANY, PRIVATE_LIMITED_COMPANY, GMBH, EXEMPTED_COMPANY');
  }

  if (typeof payload.registrationNumber !== 'string' || payload.registrationNumber.trim().length === 0) {
    errors.push('registrationNumber is required');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateMaterialContractInput(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Input payload must be a non-null object'] };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0) {
    errors.push('title is required');
  }
  if (typeof payload.counterpartyLegalName !== 'string' || payload.counterpartyLegalName.trim().length === 0) {
    errors.push('counterpartyLegalName is required');
  }
  if (typeof payload.annualContractValue !== 'number' || payload.annualContractValue < 0) {
    errors.push('annualContractValue must be a non-negative number');
  }

  const validCaps: LiabilityCapType[] = [
    'SUB_1X_ACV',
    'STANDARD_1X_ACV',
    'EXPANDED_2X_ACV',
    'SUPER_CAP_BREACH',
    'UNCAPPED_EXPOSURE'
  ];
  if (!validCaps.includes(payload.liabilityCapType as LiabilityCapType)) {
    errors.push('liabilityCapType must be a recognized cap enumeration');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateLitigationMatterInput(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Input payload must be a non-null object'] };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.caseCaption !== 'string' || payload.caseCaption.trim().length === 0) {
    errors.push('caseCaption is required');
  }
  if (typeof payload.docketNumber !== 'string' || payload.docketNumber.trim().length === 0) {
    errors.push('docketNumber is required');
  }
  if (typeof payload.opposingParty !== 'string' || payload.opposingParty.trim().length === 0) {
    errors.push('opposingParty is required');
  }

  const validClassifications: ASC450ContingencyClassification[] = ['PROBABLE', 'REASONABLY_POSSIBLE', 'REMOTE'];
  if (!validClassifications.includes(payload.asc450Classification as ASC450ContingencyClassification)) {
    errors.push('asc450Classification must be PROBABLE, REASONABLY_POSSIBLE, or REMOTE');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateLegalHoldInput(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Input payload must be a non-null object'] };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.matterId !== 'string' || payload.matterId.trim().length === 0) {
    errors.push('matterId is required');
  }
  if (typeof payload.holdTitle !== 'string' || payload.holdTitle.trim().length === 0) {
    errors.push('holdTitle is required');
  }
  if (typeof payload.scopeDescription !== 'string' || payload.scopeDescription.trim().length === 0) {
    errors.push('scopeDescription is required');
  }

  return { isValid: errors.length === 0, errors };
}

export function validateBoardSignoffInput(data: unknown): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { isValid: false, errors: ['Input payload must be a non-null object'] };
  }

  const payload = data as Record<string, unknown>;

  if (typeof payload.memoId !== 'string' || payload.memoId.trim().length === 0) {
    errors.push('memoId is required');
  }
  const validRoles: LegalSignoffRole[] = [
    'deputy_general_counsel',
    'chief_intellectual_property_counsel',
    'general_counsel_corporate_secretary'
  ];
  if (!validRoles.includes(payload.role as LegalSignoffRole)) {
    errors.push('role must be deputy_general_counsel, chief_intellectual_property_counsel, or general_counsel_corporate_secretary');
  }
  if (typeof payload.signerName !== 'string' || payload.signerName.trim().length === 0) {
    errors.push('signerName is required');
  }

  return { isValid: errors.length === 0, errors };
}
