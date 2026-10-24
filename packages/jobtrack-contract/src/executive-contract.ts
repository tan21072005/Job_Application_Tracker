import type { ValidationResult } from './validators.ts';

export type ClausePillarKey =
  | 'non_compete_non_solicit'
  | 'ip_prior_inventions'
  | 'severance_without_cause'
  | 'double_trigger_cic'
  | 'indemnification_d_and_o';

export type LegalJurisdiction =
  | 'us_california'
  | 'us_delaware_ny'
  | 'vietnam'
  | 'general';

export type ContractRiskTier =
  | 'low_risk'
  | 'moderate_asymmetry'
  | 'high_vulnerability'
  | 'critical_toxic';

export type RedlineStatus =
  | 'proposed'
  | 'accepted'
  | 'rejected'
  | 'compromised';

export type InventionCategory =
  | 'open_source_repo'
  | 'patented_invention'
  | 'saas_product'
  | 'technical_publication'
  | 'domain_brand';

export interface NonCompeteClauseParams {
  durationMonths: number;
  scope: 'narrow_named_competitors' | 'industry_vertical' | 'worldwide_broad' | 'unlimited';
  gardenLeavePercent: number;
  solicitationBreadth: 'none' | 'senior_execs_only' | 'all_employees_contractors' | 'all_customers_vendors';
  explicitCaDisclaimer: boolean;
}

export interface IpAssignmentClauseParams {
  priorInventionsScheduleAttached: boolean;
  priorInventionsCount: number;
  assignmentScope: 'narrow_company_business' | 'broad_all_tech' | 'omnibus_perpetual';
  moonlightOpenSourcePermitted: boolean;
  statutoryProtectionCited: boolean;
}

export interface SeveranceClauseParams {
  cashSalaryMonths: number;
  targetBonusIncluded: boolean;
  healthBenefitMonths: number;
  goodReasonResignationCovered: boolean;
  narrowCauseDefinition: boolean;
}

export interface ChangeOfControlClauseParams {
  accelerationType: 'none' | 'single_trigger' | 'double_trigger_partial' | 'double_trigger_full';
  protectionWindowMonths: number;
  ptepMonths: number;
  goldenParachuteCutbackProtected: boolean;
}

export interface IndemnificationClauseParams {
  standaloneAgreementSigned: boolean;
  policyCoverageAdequate: boolean;
  mandatoryAdvancement: boolean;
  tailCoverageSixYears: boolean;
}

export interface ClauseParametersMap {
  non_compete_non_solicit: NonCompeteClauseParams;
  ip_prior_inventions: IpAssignmentClauseParams;
  severance_without_cause: SeveranceClauseParams;
  double_trigger_cic: ChangeOfControlClauseParams;
  indemnification_d_and_o: IndemnificationClauseParams;
}

export interface ClauseAuditItemDTO<K extends ClausePillarKey = ClausePillarKey> {
  pillarKey: K;
  title: string;
  subScore: number;
  weight: number;
  isToxic: boolean;
  summary: string;
  identifiedRisks: string[];
  statutoryReference: string;
  parameters: ClauseParametersMap[K];
}

export interface PriorInventionItemDTO {
  id: string;
  category: InventionCategory;
  title: string;
  identifierOrUrl: string;
  creationDate: string;
  technologyDescription: string;
  retainedRights: string[];
  confidentialExclusionConfirmed: boolean;
}

export interface PriorInventionMutationDTO {
  category: InventionCategory;
  title: string;
  identifierOrUrl: string;
  creationDate: string;
  technologyDescription: string;
  retainedRights: string[];
  confidentialExclusionConfirmed: boolean;
}

export interface ContractRedlineDTO {
  id: string;
  contractId: string;
  pillarKey: ClausePillarKey;
  clauseTitle: string;
  originalText: string;
  redlineText: string;
  candidateJustification: string;
  fallbackCompromise: string;
  statutoryCitation: string;
  status: RedlineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ContractRedlineMutationDTO {
  pillarKey: ClausePillarKey;
  clauseTitle: string;
  originalText: string;
  redlineText: string;
  candidateJustification: string;
  fallbackCompromise: string;
  statutoryCitation: string;
  status?: RedlineStatus;
}

export interface ExecutiveContractDTO {
  id: string;
  userId?: string;
  applicationId?: string | null;
  companyName: string;
  roleTitle: string;
  jurisdiction: LegalJurisdiction;
  contractRiskIndex: number;
  riskTier: ContractRiskTier;
  pillarScores: Record<ClausePillarKey, number>;
  clawbackPenalty: number;
  activeHazards: string[];
  clauses: ClauseAuditItemDTO[];
  priorInventions: PriorInventionItemDTO[];
  redlines?: ContractRedlineDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveContractMutationDTO {
  applicationId?: string | null;
  companyName: string;
  roleTitle: string;
  jurisdiction: LegalJurisdiction;
  clauseParameters: ClauseParametersMap;
  priorInventions?: PriorInventionMutationDTO[];
}

export const PILLAR_WEIGHTS: Record<ClausePillarKey, number> = {
  non_compete_non_solicit: 0.20,
  ip_prior_inventions: 0.20,
  severance_without_cause: 0.25,
  double_trigger_cic: 0.20,
  indemnification_d_and_o: 0.15
};

export const PILLAR_TITLES: Record<ClausePillarKey, string> = {
  non_compete_non_solicit: 'Non-Compete & Non-Solicitation Covenants',
  ip_prior_inventions: 'IP Assignment & Prior Inventions Carve-out',
  severance_without_cause: 'Severance Without Cause & Good Reason',
  double_trigger_cic: 'Double-Trigger Change of Control Equity Acceleration',
  indemnification_d_and_o: 'Indemnification, D&O Insurance & Tail Coverage'
};

export function computeNonCompeteSubScore(
  params: NonCompeteClauseParams,
  jurisdiction: LegalJurisdiction
): { subScore: number; risks: string[]; statutoryRef: string } {
  const risks: string[] = [];
  let statutoryRef = 'Standard Common Law Reasonableness Doctrine';

  if (jurisdiction === 'us_california') {
    statutoryRef = 'Cal. Bus. & Prof. Code §16600, §16600.1, §16600.5 (Void as matter of law)';
    if (params.durationMonths > 0 && !params.explicitCaDisclaimer) {
      risks.push('Unlawful non-compete covenant under California SB 699 / AB 1076');
      return { subScore: 85, risks, statutoryRef };
    }
    if (params.durationMonths === 0 || params.explicitCaDisclaimer) {
      return { subScore: 5, risks: [], statutoryRef };
    }
  }

  let scopePenalty = 0;
  if (params.scope === 'industry_vertical') scopePenalty = 20;
  else if (params.scope === 'worldwide_broad') scopePenalty = 35;
  else if (params.scope === 'unlimited') scopePenalty = 45;

  let solicitPenalty = 0;
  if (params.solicitationBreadth === 'senior_execs_only') solicitPenalty = 5;
  else if (params.solicitationBreadth === 'all_employees_contractors') solicitPenalty = 18;
  else if (params.solicitationBreadth === 'all_customers_vendors') solicitPenalty = 28;

  const raw = params.durationMonths * 3.5 + scopePenalty + solicitPenalty - (params.gardenLeavePercent * 0.45);
  let subScore = Math.max(0, Math.min(100, Math.round(raw)));

  if (params.durationMonths > 12) {
    risks.push(`Excessive restriction duration (${params.durationMonths} months exceeds standard 12-month executive threshold)`);
  }
  if (params.scope === 'worldwide_broad' || params.scope === 'unlimited') {
    risks.push('Overly broad geographic scope (worldwide/unlimited)');
  }
  if (params.gardenLeavePercent < 50 && params.durationMonths > 0) {
    risks.push('Inadequate or zero Garden Leave compensation during post-employment restriction');
  }
  if (params.solicitationBreadth === 'all_customers_vendors') {
    risks.push('Covenant restricts engaging any historical customer or vendor');
  }

  if (jurisdiction === 'vietnam') {
    statutoryRef = 'Vietnam Labor Code 2019 Art. 21 & Constitution 2013 Art. 35';
    if (params.durationMonths > 0 && params.gardenLeavePercent < 50) {
      subScore = Math.min(100, subScore + 30);
      risks.push('High dispute risk: Non-compete without financial compensation violates statutory freedom to work');
    }
  }

  return { subScore, risks, statutoryRef };
}

export function computeIpAssignmentSubScore(
  params: IpAssignmentClauseParams,
  jurisdiction: LegalJurisdiction
): { subScore: number; risks: string[]; statutoryRef: string } {
  const risks: string[] = [];
  let statutoryRef = 'Standard Uniform Trade Secrets Act (UTSA)';

  let base = 5;
  if (params.assignmentScope === 'broad_all_tech') base = 30;
  else if (params.assignmentScope === 'omnibus_perpetual') base = 55;

  if (!params.priorInventionsScheduleAttached) {
    base += 35;
    risks.push('No Exhibit A / Prior Inventions Schedule attached to contract');
  }
  if (!params.moonlightOpenSourcePermitted) {
    base += 15;
    risks.push('Complete ban on non-conflicting open-source contributions or personal hobby coding');
  }
  if (!params.statutoryProtectionCited) {
    base += 10;
    risks.push('Absence of statutory carve-out citation protecting employee own-time inventions');
  }
  if (params.priorInventionsScheduleAttached && params.priorInventionsCount > 0) {
    base -= 15;
  }

  if (jurisdiction === 'us_california') {
    statutoryRef = 'Cal. Labor Code §2870, §2872 (Mandatory Statutory Notice)';
    if (!params.statutoryProtectionCited) {
      risks.push('Missing mandatory written notice required by Cal. Labor Code §2872');
    }
  } else if (jurisdiction === 'vietnam') {
    statutoryRef = 'Vietnam Law on Intellectual Property Art. 73-75';
  }

  const subScore = Math.max(0, Math.min(100, Math.round(base)));
  return { subScore, risks, statutoryRef };
}

export function computeSeveranceSubScore(
  params: SeveranceClauseParams,
  jurisdiction: LegalJurisdiction
): { subScore: number; risks: string[]; statutoryRef: string } {
  const risks: string[] = [];
  const statutoryRef = 'Executive Employment Agreement Standard / ERISA Severance Plan';

  let cashRisk = 0;
  if (params.cashSalaryMonths === 0) cashRisk = 60;
  else if (params.cashSalaryMonths <= 3) cashRisk = 45;
  else if (params.cashSalaryMonths <= 6) cashRisk = 25;
  else if (params.cashSalaryMonths <= 11) cashRisk = 8;
  else cashRisk = 0;

  let base = cashRisk;
  if (!params.goodReasonResignationCovered) {
    base += 25;
    risks.push('Resignation for "Good Reason" (demotion, relocation, salary slash) forfeits severance');
  }
  if (!params.narrowCauseDefinition) {
    base += 25;
    risks.push('Overly broad "Cause" definition allows termination for subjective performance with zero notice');
  }
  if (!params.targetBonusIncluded) {
    base += 10;
    risks.push('Annual bonus excluded from severance calculation (base salary only)');
  }
  if (params.healthBenefitMonths < 6) {
    base += 10;
    risks.push(`Substandard health benefit continuation (${params.healthBenefitMonths} months; executive benchmark is 6-12 months)`);
  }

  if (params.cashSalaryMonths < 6) {
    risks.push(`Inadequate severance duration (${params.cashSalaryMonths} months; VP/Director benchmark is 9-12 months)`);
  }

  const subScore = Math.max(0, Math.min(100, Math.round(base)));
  return { subScore, risks, statutoryRef };
}

export function computeChangeOfControlSubScore(
  params: ChangeOfControlClauseParams,
  jurisdiction: LegalJurisdiction
): { subScore: number; risks: string[]; statutoryRef: string } {
  const risks: string[] = [];
  const statutoryRef = 'Internal Revenue Code §280G / §4999 & Delaware M&A Practice';

  let accelBase = 0;
  if (params.accelerationType === 'none') accelBase = 80;
  else if (params.accelerationType === 'double_trigger_partial') accelBase = 35;
  else if (params.accelerationType === 'single_trigger') accelBase = 10;
  else accelBase = 0;

  let base = accelBase;
  if (params.protectionWindowMonths < 12) {
    base += 15;
    risks.push(`Protection window (${params.protectionWindowMonths} months) shorter than standard 12-24 month M&A integration period`);
  }
  if (params.ptepMonths <= 3) {
    base += 20;
    risks.push('Standard 90-day PTEP cliff forces forfeiture of unexercised vested options upon termination');
  } else if (params.ptepMonths < 12) {
    base += 10;
    risks.push(`Limited option exercise window (${params.ptepMonths} months; executive benchmark is 24-36 months)`);
  }
  if (!params.goldenParachuteCutbackProtected) {
    base += 10;
    risks.push('Lack of Section 280G "best-net" cutback provision risks punitive 20% excise tax');
  }

  if (params.accelerationType === 'none') {
    risks.push('Zero Change of Control equity acceleration: acquiring company can terminate and seize unvested equity');
  }

  const subScore = Math.max(0, Math.min(100, Math.round(base)));
  return { subScore, risks, statutoryRef };
}

export function computeIndemnificationSubScore(
  params: IndemnificationClauseParams,
  jurisdiction: LegalJurisdiction
): { subScore: number; risks: string[]; statutoryRef: string } {
  const risks: string[] = [];
  const statutoryRef = 'Delaware General Corporation Law §145 / Model Executive Indemnity Agreement';

  let base = 0;
  if (!params.standaloneAgreementSigned) {
    base += 35;
    risks.push('No standalone bilateral Indemnification Agreement (relies solely on revocable company bylaws)');
  }
  if (!params.mandatoryAdvancement) {
    base += 30;
    risks.push('Defense legal expenses not subject to mandatory advancement (executive must pay out-of-pocket)');
  }
  if (!params.tailCoverageSixYears) {
    base += 25;
    risks.push('No guaranteed 6-year D&O tail / run-off coverage upon acquisition or exit');
  }
  if (!params.policyCoverageAdequate) {
    base += 10;
    risks.push('D&O liability insurance policy coverage inadequate or unspecified');
  }

  const subScore = Math.max(0, Math.min(100, Math.round(base)));
  return { subScore, risks, statutoryRef };
}

export function evaluateExecutiveContract(
  clauseParams: ClauseParametersMap,
  jurisdiction: LegalJurisdiction,
  priorInventions: PriorInventionItemDTO[] = []
): {
  contractRiskIndex: number;
  riskTier: ContractRiskTier;
  pillarScores: Record<ClausePillarKey, number>;
  clawbackPenalty: number;
  activeHazards: string[];
  clauses: ClauseAuditItemDTO[];
} {
  const nc = computeNonCompeteSubScore(clauseParams.non_compete_non_solicit, jurisdiction);
  const ip = computeIpAssignmentSubScore({
    ...clauseParams.ip_prior_inventions,
    priorInventionsCount: priorInventions.length
  }, jurisdiction);
  const sev = computeSeveranceSubScore(clauseParams.severance_without_cause, jurisdiction);
  const cic = computeChangeOfControlSubScore(clauseParams.double_trigger_cic, jurisdiction);
  const ind = computeIndemnificationSubScore(clauseParams.indemnification_d_and_o, jurisdiction);

  const pillarScores: Record<ClausePillarKey, number> = {
    non_compete_non_solicit: nc.subScore,
    ip_prior_inventions: ip.subScore,
    severance_without_cause: sev.subScore,
    double_trigger_cic: cic.subScore,
    indemnification_d_and_o: ind.subScore
  };

  const rawWeighted =
    pillarScores.non_compete_non_solicit * PILLAR_WEIGHTS.non_compete_non_solicit +
    pillarScores.ip_prior_inventions * PILLAR_WEIGHTS.ip_prior_inventions +
    pillarScores.severance_without_cause * PILLAR_WEIGHTS.severance_without_cause +
    pillarScores.double_trigger_cic * PILLAR_WEIGHTS.double_trigger_cic +
    pillarScores.indemnification_d_and_o * PILLAR_WEIGHTS.indemnification_d_and_o;

  let clawbackPenalty = 0;
  const activeHazards: string[] = [];

  if (nc.subScore >= 60 && sev.subScore >= 50) {
    clawbackPenalty += 10;
    activeHazards.push('Indentured Labor Trap: Draconian post-employment non-compete combined with zero severance.');
  }
  if (ip.subScore >= 70) {
    clawbackPenalty += 8;
    activeHazards.push('Intellectual Property Ambush: Broad assignment claiming personal and pre-existing code.');
  }
  if (cic.subScore >= 70) {
    clawbackPenalty += 7;
    activeHazards.push('Equity Confiscation Hazard: No Change of Control acceleration combined with 90-day option cliff.');
  }

  const finalCRI = Math.max(0, Math.min(100, Math.round(rawWeighted + clawbackPenalty)));

  let riskTier: ContractRiskTier = 'low_risk';
  if (finalCRI > 75) riskTier = 'critical_toxic';
  else if (finalCRI > 50) riskTier = 'high_vulnerability';
  else if (finalCRI > 25) riskTier = 'moderate_asymmetry';

  const clauses: ClauseAuditItemDTO[] = [
    {
      pillarKey: 'non_compete_non_solicit',
      title: PILLAR_TITLES.non_compete_non_solicit,
      subScore: nc.subScore,
      weight: PILLAR_WEIGHTS.non_compete_non_solicit,
      isToxic: nc.subScore >= 65,
      summary: `Non-compete duration: ${clauseParams.non_compete_non_solicit.durationMonths}m, scope: ${clauseParams.non_compete_non_solicit.scope}.`,
      identifiedRisks: nc.risks,
      statutoryReference: nc.statutoryRef,
      parameters: clauseParams.non_compete_non_solicit
    },
    {
      pillarKey: 'ip_prior_inventions',
      title: PILLAR_TITLES.ip_prior_inventions,
      subScore: ip.subScore,
      weight: PILLAR_WEIGHTS.ip_prior_inventions,
      isToxic: ip.subScore >= 65,
      summary: `IP assignment scope: ${clauseParams.ip_prior_inventions.assignmentScope}, schedule attached: ${clauseParams.ip_prior_inventions.priorInventionsScheduleAttached}.`,
      identifiedRisks: ip.risks,
      statutoryReference: ip.statutoryRef,
      parameters: clauseParams.ip_prior_inventions
    },
    {
      pillarKey: 'severance_without_cause',
      title: PILLAR_TITLES.severance_without_cause,
      subScore: sev.subScore,
      weight: PILLAR_WEIGHTS.severance_without_cause,
      isToxic: sev.subScore >= 65,
      summary: `Cash severance: ${clauseParams.severance_without_cause.cashSalaryMonths}m, good reason included: ${clauseParams.severance_without_cause.goodReasonResignationCovered}.`,
      identifiedRisks: sev.risks,
      statutoryReference: sev.statutoryRef,
      parameters: clauseParams.severance_without_cause
    },
    {
      pillarKey: 'double_trigger_cic',
      title: PILLAR_TITLES.double_trigger_cic,
      subScore: cic.subScore,
      weight: PILLAR_WEIGHTS.double_trigger_cic,
      isToxic: cic.subScore >= 65,
      summary: `CIC acceleration: ${clauseParams.double_trigger_cic.accelerationType}, PTEP window: ${clauseParams.double_trigger_cic.ptepMonths}m.`,
      identifiedRisks: cic.risks,
      statutoryReference: cic.statutoryRef,
      parameters: clauseParams.double_trigger_cic
    },
    {
      pillarKey: 'indemnification_d_and_o',
      title: PILLAR_TITLES.indemnification_d_and_o,
      subScore: ind.subScore,
      weight: PILLAR_WEIGHTS.indemnification_d_and_o,
      isToxic: ind.subScore >= 65,
      summary: `Standalone agreement: ${clauseParams.indemnification_d_and_o.standaloneAgreementSigned}, advancement: ${clauseParams.indemnification_d_and_o.mandatoryAdvancement}, tail: ${clauseParams.indemnification_d_and_o.tailCoverageSixYears}.`,
      identifiedRisks: ind.risks,
      statutoryReference: ind.statutoryRef,
      parameters: clauseParams.indemnification_d_and_o
    }
  ];

  return {
    contractRiskIndex: finalCRI,
    riskTier,
    pillarScores,
    clawbackPenalty,
    activeHazards,
    clauses
  };
}

export function generateSynthesizedRedlines(
  contract: Pick<ExecutiveContractDTO, 'id' | 'companyName' | 'roleTitle' | 'jurisdiction' | 'pillarScores' | 'clauses'>
): ContractRedlineMutationDTO[] {
  const redlines: ContractRedlineMutationDTO[] = [];

  const ncClause = contract.clauses.find((c) => c.pillarKey === 'non_compete_non_solicit');
  if (ncClause && ncClause.subScore >= 35) {
    if (contract.jurisdiction === 'us_california') {
      redlines.push({
        pillarKey: 'non_compete_non_solicit',
        clauseTitle: 'California Non-Compete Statutory Carve-Out',
        originalText: 'Employee agrees that for a period of twelve (12) months following termination, Employee shall not directly or indirectly engage in or render services to any competing business.',
        redlineText: '[- Employee agrees that for a period of twelve (12) months following termination, Employee shall not directly or indirectly engage in or render services to any competing business. -] {+ Pursuant to California Business and Professions Code Sections 16600, 16600.1, and 16600.5, nothing in this Agreement shall restrict Employee from engaging in lawful employment, trade, or profession following termination of employment. Any provision attempting to restrict post-employment competition is void as against California public policy. +}',
        candidateJustification: 'California law (SB 699 / AB 1076) renders post-employment non-compete covenants unlawful and subject to civil penalties. Including an explicit statutory disclaimer aligns the agreement with governing law.',
        fallbackCompromise: 'Limit restriction strictly to protecting identifiable trade secrets without restricting subsequent employment.',
        statutoryCitation: 'Cal. Bus. & Prof. Code §16600 et seq.'
      });
    } else {
      redlines.push({
        pillarKey: 'non_compete_non_solicit',
        clauseTitle: 'Narrow Competitor Non-Compete with 100% Garden Leave Pay',
        originalText: 'Employee shall not engage in any competitive enterprise worldwide for eighteen (18) months following termination.',
        redlineText: 'Employee shall not engage in any competitive enterprise [- worldwide for eighteen (18) months -] {+ within the direct market vertical for a period of six (6) months +} following termination{+, provided that Company continues to pay Employee one hundred percent (100%) of Employee\'s final base salary as Garden Leave compensation for each month of said restriction +}.',
        candidateJustification: 'Market standard for executives requires an equitable exchange of consideration: if the company restricts employment, it must provide monthly Garden Leave compensation.',
        fallbackCompromise: 'Extend to 9 months provided Garden Leave is paid at 75% of base compensation.',
        statutoryCitation: 'Restatement (Third) of Employment Law §8.06'
      });
    }
  }

  const ipClause = contract.clauses.find((c) => c.pillarKey === 'ip_prior_inventions');
  if (ipClause && ipClause.subScore >= 35) {
    redlines.push({
      pillarKey: 'ip_prior_inventions',
      clauseTitle: 'Exclusion of Prior Inventions & Open Source Moonlighting',
      originalText: 'All inventions, works of authorship, and designs authored by Employee during the term of employment belong solely to Company.',
      redlineText: '[- All inventions, works of authorship, and designs authored by Employee during the term of employment belong solely to Company. -] {+ All inventions authored by Employee during working hours using Company equipment belong to Company, EXCEPT for: (a) all pre-existing inventions and open-source projects set forth on Exhibit A attached hereto, and (b) any invention created entirely on Employee\'s own time without using Company equipment, supplies, facilities, or trade secret information, pursuant to applicable employee patent protection statutes. +}',
      candidateJustification: 'Senior technical executives maintain significant prior intellectual property and active open-source repositories. A formal Exhibit A exclusion prevents involuntary confiscation of pre-existing work.',
      fallbackCompromise: 'Company receives a non-exclusive license only if prior invention is intentionally incorporated into Company products with prior written consent.',
      statutoryCitation: 'Cal. Labor Code §2870; Del. Code tit. 19 §805'
    });
  }

  const sevClause = contract.clauses.find((c) => c.pillarKey === 'severance_without_cause');
  if (sevClause && sevClause.subScore >= 35) {
    redlines.push({
      pillarKey: 'severance_without_cause',
      clauseTitle: '12-Month Executive Severance & Good Reason Trigger',
      originalText: 'In the event of termination without Cause, Company may provide up to three (3) months base salary at Company sole discretion.',
      redlineText: 'In the event of termination without Cause{+, or resignation by Executive for Good Reason (including material reduction in duties, compensation reduction, or relocation exceeding 30 miles), Executive shall receive: (a) twelve (12) months base salary continuation, (b) 100% of prorated target annual bonus, and (c) twelve (12) months company-paid COBRA premium reimbursement +}.',
      candidateJustification: 'Vice President and C-Suite executive search cycles average 9 to 12 months. Standard executive governance packages mandate 12 months salary and bonus protection against unilateral termination.',
      fallbackCompromise: 'Nine (9) months base salary continuation plus six (6) months health benefits.',
      statutoryCitation: 'Market Executive Severance Standards (Equilar / FW Cook Benchmark)'
    });
  }

  const cicClause = contract.clauses.find((c) => c.pillarKey === 'double_trigger_cic');
  if (cicClause && cicClause.subScore >= 35) {
    redlines.push({
      pillarKey: 'double_trigger_cic',
      clauseTitle: '100% Double-Trigger Acceleration & Extended Exercise Window',
      originalText: 'All unvested equity awards shall terminate immediately upon Change of Control unless assumed by the acquirer.',
      redlineText: '[- All unvested equity awards shall terminate immediately upon Change of Control unless assumed by the acquirer. -] {+ In the event of a Change of Control, if Executive is terminated without Cause or resigns for Good Reason within twenty-four (24) months following said transaction, one hundred percent (100%) of all then-unvested equity awards shall immediately vest and become exercisable. Executive shall have twenty-four (24) months post-termination to exercise all vested stock options. +}',
      candidateJustification: 'Double-trigger acceleration aligns executive incentives with shareholder value creation during acquisition negotiations while shielding the executive from post-close displacement.',
      fallbackCompromise: 'Seventy-five percent (75%) acceleration with twelve (12) months extended post-termination exercise period.',
      statutoryCitation: 'NVCA Model Legal Documents & IRC §280G Best-Net Provision'
    });
  }

  const indClause = contract.clauses.find((c) => c.pillarKey === 'indemnification_d_and_o');
  if (indClause && indClause.subScore >= 35) {
    redlines.push({
      pillarKey: 'indemnification_d_and_o',
      clauseTitle: 'Mandatory Advancement & 6-Year D&O Tail Policy',
      originalText: 'Company indemnifies officers to the fullest extent permitted under Delaware law as set forth in its bylaws.',
      redlineText: 'Company indemnifies officers to the fullest extent permitted under Delaware law {+ pursuant to a standalone bilateral Indemnification Agreement. Company covenants to: (a) advance defense litigation expenses within twenty (20) business days of receipt of invoices, and (b) maintain Directors & Officers liability insurance with minimum limits of $10,000,000, including a mandatory six (6) year prepaid tail policy upon any Change of Control or departure of Executive +}.',
      candidateJustification: 'Executive fiduciaries must not face catastrophic personal legal liabilities for decisions taken in good faith on behalf of the corporation. Advancement and tail policies are mandatory safeguards.',
      fallbackCompromise: 'Six-year tail coverage with a minimum policy limit of $5,000,000.',
      statutoryCitation: 'Delaware General Corporation Law §145'
    });
  }

  return redlines;
}

export function generateExhibitAMarkdown(
  contract: Pick<ExecutiveContractDTO, 'companyName' | 'roleTitle'>,
  priorInventions: PriorInventionItemDTO[]
): string {
  const lines: string[] = [
    '# EXHIBIT A: SCHEDULE OF PRIOR INVENTIONS AND EXCLUDED INTELLECTUAL PROPERTY',
    '',
    `**Candidate Name / Executive:** [Executive Full Name]  `,
    `**Company Name:** ${contract.companyName}  `,
    `**Position / Title:** ${contract.roleTitle}  `,
    `**Date of Execution:** ${new Date().toISOString().split('T')[0]}  `,
    '',
    '---',
    '',
    '## 1. Statutory Notice & Scope of Carve-Out',
    'Pursuant to applicable law (including California Labor Code Section 2870, Delaware Code Title 19 Section 805, and Vietnam Law on Intellectual Property Art. 73-75), the following technologies, intellectual property, inventions, open-source repositories, domain names, and works of authorship were created, conceived, or reduced to practice by Executive **prior** to the commencement of employment with Company.',
    '',
    'Executive hereby retains all proprietary rights, title, copyright, patent, trademark, and ownership in and to each listed item. None of the listed items belong to or shall be deemed assigned to Company.',
    '',
    '---',
    '',
    '## 2. Inventory of Excluded Pre-Existing Inventions',
    ''
  ];

  if (priorInventions.length === 0) {
    lines.push('_No prior inventions declared (None)._');
  } else {
    priorInventions.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.title}`);
      lines.push(`- **Category:** \`${item.category}\``);
      lines.push(`- **Repository / Reference:** [${item.identifierOrUrl}](${item.identifierOrUrl})`);
      lines.push(`- **Date of Inception / Initial Commit:** ${item.creationDate}`);
      lines.push(`- **Architecture & Technical Scope:** ${item.technologyDescription}`);
      lines.push(`- **Retained Rights:** ${item.retainedRights.join(', ')}`);
      lines.push(`- **Confidentiality Confirmation:** ${item.confidentialExclusionConfirmed ? 'Confirmed: Zero Company trade secrets or proprietary resources utilized.' : 'Pending confirmation.'}`);
      lines.push('');
    });
  }

  lines.push('---');
  lines.push('');
  lines.push('## 3. Acknowledgment & Consent');
  lines.push('The undersigned duly authorized representative of Company acknowledges receipt of this Exhibit A and confirms that Company asserts no ownership claim over the enumerated technologies.');
  lines.push('');
  lines.push('**EXECUTIVE:** _______________________   **DATE:** ____________');
  lines.push('');
  lines.push('**COMPANY:** _________________________   **DATE:** ____________');

  return lines.join('\n');
}

export function generateExecutiveAddendumMarkdown(
  contract: Pick<ExecutiveContractDTO, 'companyName' | 'roleTitle' | 'jurisdiction'>,
  redlines: ContractRedlineDTO[]
): string {
  const lines: string[] = [
    '# EXECUTIVE COUNTER-AMENDMENT ADDENDUM',
    '',
    `**Target Employer:** ${contract.companyName}  `,
    `**Executive Role:** ${contract.roleTitle}  `,
    `**Jurisdiction:** ${contract.jurisdiction.toUpperCase()}  `,
    `**Document Generation Date:** ${new Date().toISOString().split('T')[0]}  `,
    '',
    '---',
    '',
    '## I. PREAMBLE & STATEMENT OF INTENT',
    `This Executive Counter-Amendment Addendum ("Addendum") amends and supplements the definitive Employment Agreement, Proprietary Information and Inventions Agreement ("PIIA"), and Equity Incentive Award Documents between ${contract.companyName} ("Company") and the prospective Executive ("Candidate").`,
    '',
    'The proposed amendments reflect standard governance benchmarks for senior technology executives, align restrictive covenants with applicable statutory requirements, and establish appropriate fiduciary protections.',
    '',
    '---',
    '',
    '## II. PROPOSED CLAUSE REDLINES & AMENDMENTS',
    ''
  ];

  redlines.forEach((redline, idx) => {
    lines.push(`### ${idx + 1}. ${redline.clauseTitle} (\`${redline.pillarKey}\`)`);
    lines.push('');
    lines.push('**Statutory / Governance Benchmark:** ' + redline.statutoryCitation);
    lines.push('');
    lines.push('**Original Proposed Text:**');
    lines.push(`> ${redline.originalText}`);
    lines.push('');
    lines.push('**Proposed Redline Amendment:**');
    lines.push(`> ${redline.redlineText}`);
    lines.push('');
    lines.push('**Executive Justification:**');
    lines.push(redline.candidateJustification);
    lines.push('');
    lines.push('**Fallback Compromise Position:**');
    lines.push(`*${redline.fallbackCompromise}*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  lines.push('## III. EXECUTION AND RATIFICATION');
  lines.push('All other terms and conditions of the Employment Agreement not expressly modified by this Addendum shall remain in full force and effect.');
  lines.push('');
  lines.push('**ACCEPTED AND AGREED:**');
  lines.push('');
  lines.push('**COMPANY:** ___________________________    **EXECUTIVE:** ___________________________');

  return lines.join('\n');
}

export function validateExecutiveContractInput(raw: unknown): ValidationResult<ExecutiveContractMutationDTO> {
  if (typeof raw !== 'object' || raw === null) {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const data = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (typeof data.companyName !== 'string' || !data.companyName.trim()) {
    errors.companyName = 'Company name is required';
  }
  if (typeof data.roleTitle !== 'string' || !data.roleTitle.trim()) {
    errors.roleTitle = 'Role title is required';
  }

  const validJurisdictions: LegalJurisdiction[] = ['us_california', 'us_delaware_ny', 'vietnam', 'general'];
  if (!validJurisdictions.includes(data.jurisdiction as LegalJurisdiction)) {
    errors.jurisdiction = `Jurisdiction must be one of: ${validJurisdictions.join(', ')}`;
  }

  if (typeof data.clauseParameters !== 'object' || data.clauseParameters === null) {
    errors.clauseParameters = 'Clause parameters map is required';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Validation failed for executive contract input', errors };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof data.applicationId === 'string' ? data.applicationId : null,
      companyName: String(data.companyName).trim(),
      roleTitle: String(data.roleTitle).trim(),
      jurisdiction: data.jurisdiction as LegalJurisdiction,
      clauseParameters: data.clauseParameters as ClauseParametersMap,
      priorInventions: Array.isArray(data.priorInventions) ? (data.priorInventions as PriorInventionMutationDTO[]) : []
    }
  };
}

export function validatePriorInventionInput(raw: unknown): ValidationResult<PriorInventionMutationDTO> {
  if (typeof raw !== 'object' || raw === null) {
    return {
      ok: false,
      message: 'Invalid payload',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validCategories: InventionCategory[] = ['open_source_repo', 'patented_invention', 'saas_product', 'technical_publication', 'domain_brand'];
  if (!validCategories.includes(d.category as InventionCategory)) {
    errors.category = `Category must be one of: ${validCategories.join(', ')}`;
  }
  if (typeof d.title !== 'string' || !d.title.trim()) {
    errors.title = 'Title is required';
  }
  if (typeof d.identifierOrUrl !== 'string' || !d.identifierOrUrl.trim()) {
    errors.identifierOrUrl = 'Repository URL or identifier is required';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Validation failed for prior invention item', errors };
  }

  return {
    ok: true,
    data: {
      category: d.category as InventionCategory,
      title: String(d.title).trim(),
      identifierOrUrl: String(d.identifierOrUrl).trim(),
      creationDate: typeof d.creationDate === 'string' ? d.creationDate : new Date().toISOString().split('T')[0],
      technologyDescription: typeof d.technologyDescription === 'string' ? d.technologyDescription.trim() : '',
      retainedRights: Array.isArray(d.retainedRights) ? d.retainedRights.map(String) : ['Full Copyright', 'Patent Prosecution Rights'],
      confidentialExclusionConfirmed: Boolean(d.confidentialExclusionConfirmed)
    }
  };
}

export function validateContractRedlineInput(raw: unknown): ValidationResult<ContractRedlineMutationDTO> {
  if (typeof raw !== 'object' || raw === null) {
    return {
      ok: false,
      message: 'Invalid payload',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validPillars: ClausePillarKey[] = [
    'non_compete_non_solicit',
    'ip_prior_inventions',
    'severance_without_cause',
    'double_trigger_cic',
    'indemnification_d_and_o'
  ];

  if (!validPillars.includes(d.pillarKey as ClausePillarKey)) {
    errors.pillarKey = `Invalid pillar key. Must be one of: ${validPillars.join(', ')}`;
  }
  if (typeof d.clauseTitle !== 'string' || !d.clauseTitle.trim()) {
    errors.clauseTitle = 'Clause title is required';
  }
  if (typeof d.originalText !== 'string' || !d.originalText.trim()) {
    errors.originalText = 'Original text is required';
  }
  if (typeof d.redlineText !== 'string' || !d.redlineText.trim()) {
    errors.redlineText = 'Redline text is required';
  }
  if (typeof d.candidateJustification !== 'string' || !d.candidateJustification.trim()) {
    errors.candidateJustification = 'Candidate justification is required';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: 'Validation failed for contract redline', errors };
  }

  return {
    ok: true,
    data: {
      pillarKey: d.pillarKey as ClausePillarKey,
      clauseTitle: String(d.clauseTitle).trim(),
      originalText: String(d.originalText).trim(),
      redlineText: String(d.redlineText).trim(),
      candidateJustification: String(d.candidateJustification).trim(),
      fallbackCompromise: typeof d.fallbackCompromise === 'string' ? d.fallbackCompromise.trim() : '',
      statutoryCitation: typeof d.statutoryCitation === 'string' ? d.statutoryCitation.trim() : '',
      status: (d.status as RedlineStatus) || 'proposed'
    }
  };
}
