import type { ValidationResult } from './validators.ts';

export type BoardMandateType =
  | 'board_of_directors'
  | 'advisory_board'
  | 'technical_advisory_council'
  | 'fractional_advisor';

export type MandatePipelineStage =
  | 'prospect'
  | 'initial_dialogue'
  | 'nom_gov_interview'
  | 'board_diligence'
  | 'offer_term_sheet'
  | 'formal_appointment'
  | 'declined';

export type BoardEquityGrantType =
  | 'iso_options'
  | 'nso_options'
  | 'rsu'
  | 'common_stock'
  | 'phantom_equity';

export type BoardVestingScheduleType =
  | 'two_year_monthly_no_cliff'
  | 'three_year_annual_cliff'
  | 'four_year_one_year_cliff'
  | 'immediate_fully_vested';

export type AccelerationClauseType =
  | 'none'
  | 'single_trigger_change_of_control'
  | 'double_trigger_change_and_termination';

export type BoardCommitteeKey =
  | 'audit_risk'
  | 'tech_cybersecurity'
  | 'nominating_governance'
  | 'compensation'
  | 'ai_ethics_data';

export type CompanyGrowthStage =
  | 'idea_stage'
  | 'seed_stage'
  | 'series_a'
  | 'series_b_plus';

export type AdvisoryImpactLevel =
  | 'standard'
  | 'strategic'
  | 'expert_intensive';

export type CoiRiskTier =
  | 'low_risk'
  | 'moderate_risk'
  | 'elevated_risk'
  | 'prohibited_interlock';

export type GovernanceQuotientTier =
  | 'boardroom_luminary'
  | 'governance_seasoned'
  | 'emerging_director'
  | 'governance_apprentice';

export interface BoardMandateDTO {
  id: string;
  userId: string;
  targetCompanyName: string;
  mandateType: BoardMandateType;
  stage: MandatePipelineStage;
  annualCashRetainer: number;
  meetingFeePerBoardMeeting: number;
  meetingFeePerCommitteeMeeting: number;
  expectedBoardMeetingsPerYear: number;
  expectedCommitteeMeetingsPerYear: number;
  equityPercentage: number;
  equityGrantType: BoardEquityGrantType;
  vestingSchedule: BoardVestingScheduleType;
  accelerationClause: AccelerationClauseType;
  optionStrikePrice: number;
  timeCommitmentHoursPerMonth: number;
  termLengthYears: number;
  committeeAssignments: BoardCommitteeKey[];
  hasDAndOInsurance: boolean;
  dAndOPolicyLimitMillions: number;
  hasSideADicCoverage: boolean;
  hasIndemnificationAgreement: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMandateMutationDTO {
  targetCompanyName: string;
  mandateType: BoardMandateType;
  stage: MandatePipelineStage;
  annualCashRetainer: number;
  meetingFeePerBoardMeeting: number;
  meetingFeePerCommitteeMeeting: number;
  expectedBoardMeetingsPerYear: number;
  expectedCommitteeMeetingsPerYear: number;
  equityPercentage: number;
  equityGrantType: BoardEquityGrantType;
  vestingSchedule: BoardVestingScheduleType;
  accelerationClause: AccelerationClauseType;
  optionStrikePrice: number;
  timeCommitmentHoursPerMonth: number;
  termLengthYears: number;
  committeeAssignments: BoardCommitteeKey[];
  hasDAndOInsurance: boolean;
  dAndOPolicyLimitMillions: number;
  hasSideADicCoverage: boolean;
  hasIndemnificationAgreement: boolean;
  notes: string;
}

export interface FastEquityBenchmarkDTO {
  companyStage: CompanyGrowthStage;
  impactLevel: AdvisoryImpactLevel;
  benchmarkPercentage: number;
  offeredPercentage: number;
  variancePercentage: number;
  isFairMarketOrAbove: boolean;
}

export interface DilutionExitScenarioDTO {
  scenarioName: 'bear' | 'base' | 'bull' | 'unicorn';
  exitValuationMillions: number;
  grossProceedsUsd: number;
  netProceedsUsd: number;
  cumulativeCashRetainersUsd: number;
  totalCompensationUsd: number;
  effectiveHourlyYieldUsd: number;
}

export interface FastEquityDilutionModelDTO {
  mandateId: string;
  targetCompanyName: string;
  initialEquityPercentage: number;
  futureFinancingRounds: number;
  dilutionPerRoundPercentage: number;
  retainedEquityPercentage: number;
  totalInvestedHours: number;
  benchmark: FastEquityBenchmarkDTO;
  scenarios: DilutionExitScenarioDTO[];
}

export interface ConflictOfInterestCheckDTO {
  mandateId: string;
  primaryEmployerName: string;
  targetCompanyName: string;
  mandateType: BoardMandateType;
  isDirectCompetitor: boolean;
  isAdjacentMarket: boolean;
  primaryEmployerCapitalMillions: number;
  targetCompanyCapitalMillions: number;
  claytonActSection8ThresholdExceeded: boolean;
  claytonActViolationRisk: boolean;
  hasIpOverlap: boolean;
  hasHardwareSegregationConfirmed: boolean;
  timeCommitmentHoursPerMonth: number;
  coiScore: number;
  coiTier: CoiRiskTier;
  waiverLetterRequired: boolean;
  prohibitedReason: string | null;
}

export interface OutsideBoardWaiverLetterDTO {
  mandateId: string;
  executiveFullName: string;
  primaryEmployerName: string;
  primaryEmployerGeneralCounselName: string;
  targetCompanyName: string;
  targetCompanyDescription: string;
  mandateRoleTitle: string;
  monthlyHoursCommitment: number;
  generatedDate: string;
  letterMarkdown: string;
}

export interface GovernanceMatrixDTO {
  id: string;
  userId: string;
  fiduciaryAcumenScore: number;
  cyberAuditOversightScore: number;
  aiGovernanceEthicsScore: number;
  executiveCompensationScore: number;
  boardroomPresenceDissentScore: number;
  governanceQuotient: number;
  tier: GovernanceQuotientTier;
  qualifiedCommittees: BoardCommitteeKey[];
  verifiedCredentials: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GovernanceMatrixMutationDTO {
  fiduciaryAcumenScore: number;
  cyberAuditOversightScore: number;
  aiGovernanceEthicsScore: number;
  executiveCompensationScore: number;
  boardroomPresenceDissentScore: number;
  verifiedCredentials: string[];
}

export interface BoardDossierDTO {
  userId: string;
  executiveFullName: string;
  executiveRoleTitle: string;
  boardValueProposition: string;
  governanceQuotient: number;
  qualifiedCommittees: BoardCommitteeKey[];
  activeMandatesCount: number;
  totalBoardSeatsCount: number;
  primarySpecializations: string[];
  boardDossierMarkdown: string;
  generatedAt: string;
}

export function getFastEquityBenchmark(
  stage: CompanyGrowthStage,
  impact: AdvisoryImpactLevel
): number {
  const table: Record<CompanyGrowthStage, Record<AdvisoryImpactLevel, number>> = {
    idea_stage: {
      standard: 0.25,
      strategic: 0.5,
      expert_intensive: 1.0
    },
    seed_stage: {
      standard: 0.15,
      strategic: 0.3,
      expert_intensive: 0.6
    },
    series_a: {
      standard: 0.1,
      strategic: 0.2,
      expert_intensive: 0.4
    },
    series_b_plus: {
      standard: 0.05,
      strategic: 0.1,
      expert_intensive: 0.2
    }
  };
  return table[stage]?.[impact] ?? 0.2;
}

export function computeRetainedEquity(
  initialPercentage: number,
  rounds: number,
  dilutionPerRound: number
): number {
  const safeRounds = Math.max(0, Math.min(5, Math.round(rounds)));
  const safeDilution = Math.max(0, Math.min(0.5, dilutionPerRound));
  const retained = initialPercentage * Math.pow(1 - safeDilution, safeRounds);
  return Math.round(retained * 10000) / 10000;
}

export function computeFastEquityDilutionModel(
  mandate: BoardMandateDTO,
  stage: CompanyGrowthStage,
  impact: AdvisoryImpactLevel,
  futureRounds: number = 2,
  dilutionPerRound: number = 0.2,
  capitalGainsTaxRate: number = 0.2
): FastEquityDilutionModelDTO {
  const benchmarkPercentage = getFastEquityBenchmark(stage, impact);
  const variance = Math.round((mandate.equityPercentage - benchmarkPercentage) * 1000) / 1000;
  const retainedEquity = computeRetainedEquity(mandate.equityPercentage, futureRounds, dilutionPerRound);

  const totalYears = Math.max(1, mandate.termLengthYears || 2);
  const totalInvestedHours = mandate.timeCommitmentHoursPerMonth * 12 * totalYears;
  const annualCashRetainer =
    mandate.annualCashRetainer +
    mandate.meetingFeePerBoardMeeting * mandate.expectedBoardMeetingsPerYear +
    mandate.meetingFeePerCommitteeMeeting * mandate.expectedCommitteeMeetingsPerYear;
  const cumulativeCash = annualCashRetainer * totalYears;

  const scenarioValuations: Array<{ name: 'bear' | 'base' | 'bull' | 'unicorn'; val: number }> = [
    { name: 'bear', val: 25 },
    { name: 'base', val: 100 },
    { name: 'bull', val: 400 },
    { name: 'unicorn', val: 1200 }
  ];

  const scenarios: DilutionExitScenarioDTO[] = scenarioValuations.map(s => {
    const grossProceeds = (s.val * 1000000 * retainedEquity) / 100;
    const taxableBase = Math.max(0, grossProceeds - mandate.optionStrikePrice);
    const netProceeds = taxableBase * (1 - capitalGainsTaxRate);
    const totalComp = netProceeds + cumulativeCash;
    const hourlyYield = totalInvestedHours > 0 ? Math.round(totalComp / totalInvestedHours) : 0;

    return {
      scenarioName: s.name,
      exitValuationMillions: s.val,
      grossProceedsUsd: Math.round(grossProceeds),
      netProceedsUsd: Math.round(netProceeds),
      cumulativeCashRetainersUsd: Math.round(cumulativeCash),
      totalCompensationUsd: Math.round(totalComp),
      effectiveHourlyYieldUsd: hourlyYield
    };
  });

  return {
    mandateId: mandate.id,
    targetCompanyName: mandate.targetCompanyName,
    initialEquityPercentage: mandate.equityPercentage,
    futureFinancingRounds: futureRounds,
    dilutionPerRoundPercentage: Math.round(dilutionPerRound * 100),
    retainedEquityPercentage: retainedEquity,
    totalInvestedHours,
    benchmark: {
      companyStage: stage,
      impactLevel: impact,
      benchmarkPercentage,
      offeredPercentage: mandate.equityPercentage,
      variancePercentage: variance,
      isFairMarketOrAbove: variance >= 0
    },
    scenarios
  };
}

export function evaluateConflictOfInterest(
  mandate: BoardMandateDTO,
  primaryEmployerName: string,
  isDirectCompetitor: boolean,
  isAdjacentMarket: boolean,
  primaryCapitalMillions: number,
  targetCapitalMillions: number,
  hasIpOverlap: boolean,
  hasHardwareSegregation: boolean
): ConflictOfInterestCheckDTO {
  let compScore = 0;
  if (isDirectCompetitor) compScore = 35;
  else if (isAdjacentMarket) compScore = 15;

  let claytonScore = 0;
  const threshold = 48.559;
  const primaryExceeds = primaryCapitalMillions >= threshold;
  const targetExceeds = targetCapitalMillions >= threshold;
  const claytonThresholdExceeded = primaryExceeds && targetExceeds;

  const isFiduciaryDirector = mandate.mandateType === 'board_of_directors';
  let claytonViolation = false;

  if (isFiduciaryDirector && claytonThresholdExceeded && isDirectCompetitor) {
    claytonScore = 30;
    claytonViolation = true;
  } else if (isFiduciaryDirector && (isDirectCompetitor || (claytonThresholdExceeded && isAdjacentMarket))) {
    claytonScore = 15;
  }

  let ipScore = 0;
  if (hasIpOverlap) {
    ipScore = hasHardwareSegregation ? 20 : 25;
  }

  let timeScore = 0;
  if (mandate.timeCommitmentHoursPerMonth > 15) {
    timeScore = 10;
  } else if (mandate.timeCommitmentHoursPerMonth > 6) {
    timeScore = 5;
  }

  const rawCoi = compScore + claytonScore + ipScore + timeScore;
  const coiScore = Math.min(100, Math.max(0, rawCoi));

  let coiTier: CoiRiskTier = 'low_risk';
  let waiverRequired = false;
  let prohibitedReason: string | null = null;

  if (claytonViolation) {
    coiTier = 'prohibited_interlock';
    waiverRequired = false;
    prohibitedReason =
      'Statutory interlocking directorate prohibited under Clayton Act Section 8 (15 U.S.C. Section 19). Both entities exceed capital thresholds and engage in direct horizontal competition.';
  } else if (coiScore >= 75) {
    coiTier = 'prohibited_interlock';
    waiverRequired = false;
    prohibitedReason =
      'Severe conflict of interest and corporate opportunity usurpation risk under Delaware Duty of Loyalty. Direct competition and IP entanglement.';
  } else if (coiScore >= 50) {
    coiTier = 'elevated_risk';
    waiverRequired = true;
  } else if (coiScore >= 25) {
    coiTier = 'moderate_risk';
    waiverRequired = true;
  } else {
    coiTier = 'low_risk';
    waiverRequired = true;
  }

  return {
    mandateId: mandate.id,
    primaryEmployerName,
    targetCompanyName: mandate.targetCompanyName,
    mandateType: mandate.mandateType,
    isDirectCompetitor,
    isAdjacentMarket,
    primaryEmployerCapitalMillions: primaryCapitalMillions,
    targetCompanyCapitalMillions: targetCapitalMillions,
    claytonActSection8ThresholdExceeded: claytonThresholdExceeded,
    claytonActViolationRisk: claytonViolation,
    hasIpOverlap,
    hasHardwareSegregationConfirmed: hasHardwareSegregation,
    timeCommitmentHoursPerMonth: mandate.timeCommitmentHoursPerMonth,
    coiScore,
    coiTier,
    waiverLetterRequired: waiverRequired,
    prohibitedReason
  };
}

export function computeGovernanceQuotient(
  input: GovernanceMatrixMutationDTO
): {
  governanceQuotient: number;
  tier: GovernanceQuotientTier;
  qualifiedCommittees: BoardCommitteeKey[];
} {
  const f = Math.max(0, Math.min(100, Math.round(input.fiduciaryAcumenScore)));
  const c = Math.max(0, Math.min(100, Math.round(input.cyberAuditOversightScore)));
  const a = Math.max(0, Math.min(100, Math.round(input.aiGovernanceEthicsScore)));
  const comp = Math.max(0, Math.min(100, Math.round(input.executiveCompensationScore)));
  const d = Math.max(0, Math.min(100, Math.round(input.boardroomPresenceDissentScore)));

  const gq = Math.round(0.25 * f + 0.25 * c + 0.2 * a + 0.15 * comp + 0.15 * d);

  let tier: GovernanceQuotientTier = 'governance_apprentice';
  if (gq >= 85) tier = 'boardroom_luminary';
  else if (gq >= 70) tier = 'governance_seasoned';
  else if (gq >= 50) tier = 'emerging_director';

  const qualified: BoardCommitteeKey[] = [];
  if (f >= 80 && c >= 75) qualified.push('audit_risk');
  if (c >= 85 && a >= 80) qualified.push('tech_cybersecurity');
  if (d >= 80 && f >= 80) qualified.push('nominating_governance');
  if (comp >= 80 && f >= 70) qualified.push('compensation');
  if (a >= 85 && c >= 75) qualified.push('ai_ethics_data');

  return {
    governanceQuotient: gq,
    tier,
    qualifiedCommittees: qualified
  };
}

export function generateOutsideBoardWaiverLetter(
  check: ConflictOfInterestCheckDTO,
  executiveName: string,
  generalCounselName: string,
  executiveRoleTitle: string
): string {
  const today = new Date().toISOString().split('T')[0];
  const roleName = check.mandateType.replace(/_/g, ' ').toUpperCase();

  return `# CONFIDENTIAL PRIVILEGED LEGAL MEMORANDUM & WAIVER REQUEST

**Date**: ${today}  
**To**: ${generalCounselName}, General Counsel & Chief Legal Officer  
**Company**: ${check.primaryEmployerName}  
**From**: ${executiveName}, ${executiveRoleTitle}  
**Subject**: Formal Request for Prior Written Approval of Outside ${roleName} Appointment  

---

### 1. Purpose of Request
Pursuant to the ${check.primaryEmployerName} Code of Business Conduct and Ethics, Outside Employment and Activities Policy, and Proprietary Information and Inventions Agreement (PIIA), I hereby formally request written clearance and approval to accept an outside appointment as a member of the **${roleName}** for **${check.targetCompanyName}**.

---

### 2. Legal, Fiduciary & Antitrust Conflict Assessment
Prior to submitting this request, an exhaustive conflict of interest and antitrust compliance audit was conducted:
- **Clayton Act Section 8 (15 U.S.C. Section 19) Compliance**: ${check.claytonActViolationRisk ? 'ALERT: Direct interlock flagged' : 'CLEARED. No statutory interlocking directorate exists. Entity lines of business and commercial focus do not meet horizontal competitive sales thresholds.'}
- **Competitive Proximity**: ${check.isDirectCompetitor ? 'Competitor relationship present; explicit operational and technical firewalls established.' : check.isAdjacentMarket ? 'Adjacent ecosystem provider; non-competing customer segments.' : 'Completely non-competing enterprise domain.'}
- **Fiduciary Duty of Loyalty (DGCL Section 141)**: The prospective mandate will not divert, usurp, or interact with any corporate opportunities of ${check.primaryEmployerName}.

---

### 3. Strict Separation of Assets, Code & Intellectual Property
To preserve absolute compliance with California Labor Code Section 2870 and our PIIA covenants, I irrevocably attest to the following safe-harbor operating parameters:
1. **Zero Asset Crossover**: No ${check.primaryEmployerName} hardware, laptops, cloud accounts, Slack workspaces, email tenants, or proprietary tools will be used at any time for ${check.targetCompanyName} duties.
2. **High-Level Advisory Scope Only**: All advisory participation is strictly limited to high-level governance, strategic architectural counsel, and talent coaching. No code commits, patent filings, or specific technical deliverables will be created.
3. **Dedicated Physical Infrastructure**: All communications and documents pertaining to ${check.targetCompanyName} will be handled exclusively on personal or target-issued dedicated devices outside of primary business hours.

---

### 4. Time Commitment & Schedule
- **Monthly Commitment**: Approximately ${check.timeCommitmentHoursPerMonth} hours per month.
- **Operating Schedule**: All advisory activities will be conducted during evenings, weekends, or pre-scheduled personal time off, guaranteeing zero impact on my executive responsibilities at ${check.primaryEmployerName}.

---

### 5. Request for Written Waiver & Acknowledgement
Please review the proposed mandate at your earliest convenience. If approved, please counter-sign below to confirm that ${check.primaryEmployerName} waives any conflict regarding this specific appointment.

Respectfully submitted,

____________________________________________  
**${executiveName}**  
${executiveRoleTitle}, ${check.primaryEmployerName}  

---

### General Counsel Endorsement & Board Waiver Clearance

[   ] **APPROVED** with standard IP safe-harbor covenants  
[   ] **CONDITIONALLY APPROVED** subject to attached carve-out restrictions  
[   ] **DENIED**  

____________________________________________  
**${generalCounselName}**  
General Counsel, ${check.primaryEmployerName}  
Date: ________________________
`;
}

export function generateBoardDossierMarkdown(
  executiveName: string,
  roleTitle: string,
  matrix: GovernanceMatrixDTO,
  mandates: BoardMandateDTO[]
): string {
  const today = new Date().toISOString().split('T')[0];
  const committeeNames: Record<BoardCommitteeKey, string> = {
    audit_risk: 'Audit & Risk Oversight',
    tech_cybersecurity: 'Technology & Cybersecurity Committee (SEC Item 106)',
    nominating_governance: 'Nominating & Corporate Governance',
    compensation: 'Compensation & Human Capital Committee',
    ai_ethics_data: 'Special Committee on Artificial Intelligence & Ethics'
  };

  const qualifiedList =
    matrix.qualifiedCommittees.length > 0
      ? matrix.qualifiedCommittees.map(c => `- **${committeeNames[c] || c}**`).join('\n')
      : '- General Advisory & Strategic Counsel';

  const mandateRows =
    mandates.length > 0
      ? mandates
          .map(
            m =>
              `| ${m.targetCompanyName} | ${m.mandateType.replace(/_/g, ' ')} | ${m.stage} | ${m.equityPercentage}% | ${m.hasDAndOInsurance ? 'Verified' : 'Pending'} |`
          )
          .join('\n')
      : '| *Confidential Early Dialogue* | Advisory Board | Initial Dialogue | 0.25% | Verified |';

  const credentialsList =
    matrix.verifiedCredentials.length > 0
      ? matrix.verifiedCredentials.map(c => `- ${c}`).join('\n')
      : '- Experienced Technology Executive & Corporate Advisor';

  return `# EXECUTIVE BOARD BIOGRAPHY & GOVERNANCE DOSSIER

**Executive**: ${executiveName}  
**Primary Executive Office**: ${roleTitle}  
**Governance Quotient (GQ)**: ${matrix.governanceQuotient} / 100 (${matrix.tier.replace(/_/g, ' ').toUpperCase()})  
**Document Generation Date**: ${today}  
**Fiduciary Standing**: Qualified Independent Director Candidate (Audit, Cyber/Tech, Compensation)  

---

## 1. Executive Boardroom Thesis & Value Proposition
Proven technology executive and engineering leader with extensive operational experience scaling enterprise cloud infrastructure, mission-critical SaaS architectures, and global engineering organizations. Brings rigorous fiduciary discipline, deep SEC cybersecurity compliance expertise (Form 8-K Item 1.05 and Form 10-K Item 106), and quantitative enterprise AI governance to boardrooms navigating digital transformation and rapid AI adoption.

---

## 2. Board Committee Competency & Vetting Profile

| Governance Pillar | Competency Score | Boardroom Oversight Readiness |
|---|---|---|
| **Fiduciary Acumen & DGCL § 141** | ${matrix.fiduciaryAcumenScore} / 100 | High financial literacy, SOX 404 risk management, Delaware Business Judgment Rule. |
| **Cybersecurity & Audit Committee** | ${matrix.cyberAuditOversightScore} / 100 | SEC cyber disclosure governance, NIST CSF 2.0, enterprise ransomware response. |
| **AI Governance & Algorithmic Ethics** | ${matrix.aiGovernanceEthicsScore} / 100 | EU AI Act classification, algorithmic bias audits, IP training indemnity controls. |
| **Executive Compensation & Talent** | ${matrix.executiveCompensationScore} / 100 | Say-on-Pay benchmarking, option pool overhang modeling, Dodd-Frank clawbacks. |
| **Boardroom Presence & Strategic Dissent** | ${matrix.boardroomPresenceDissentScore} / 100 | Constructive dissent, CEO succession planning, activist defense readiness. |

### Qualified Board Committee Assignments
${qualifiedList}

---

## 3. Active Board & Advisory Mandates

| Target Enterprise | Mandate Type | Stage | Equity Allocation | D&O Coverage |
|---|---|---|---|---|
${mandateRows}

---

## 4. Director Certifications & Governance Affiliations
${credentialsList}

---

## 5. Fiduciary Compliance & Regulatory Attestations
- **Clayton Act Section 8 (15 U.S.C. Section 19)**: Clean audit; no unlawful horizontal interlocks.
- **Independence Determination**: Qualifies as an Independent Director under NYSE Rule 303A.02 and NASDAQ Rule 5605(a)(2).
- **Audit Committee Financial Expert**: Satisfies qualification criteria under Sarbanes-Oxley Act Section 407.
`;
}

export function validateBoardMandateInput(raw: unknown): ValidationResult<BoardMandateMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be a non-null object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!d.targetCompanyName || typeof d.targetCompanyName !== 'string' || !d.targetCompanyName.trim()) {
    errors.targetCompanyName = 'Target company name is required';
  }

  const validMandates: BoardMandateType[] = [
    'board_of_directors',
    'advisory_board',
    'technical_advisory_council',
    'fractional_advisor'
  ];
  if (!validMandates.includes(d.mandateType as BoardMandateType)) {
    errors.mandateType = `Mandate type must be one of: ${validMandates.join(', ')}`;
  }

  const validStages: MandatePipelineStage[] = [
    'prospect',
    'initial_dialogue',
    'nom_gov_interview',
    'board_diligence',
    'offer_term_sheet',
    'formal_appointment',
    'declined'
  ];
  if (!validStages.includes(d.stage as MandatePipelineStage)) {
    errors.stage = `Stage must be one of: ${validStages.join(', ')}`;
  }

  if (typeof d.equityPercentage !== 'number' || d.equityPercentage < 0 || d.equityPercentage > 10) {
    errors.equityPercentage = 'Equity percentage must be a number between 0 and 10';
  }

  if (typeof d.timeCommitmentHoursPerMonth !== 'number' || d.timeCommitmentHoursPerMonth < 0 || d.timeCommitmentHoursPerMonth > 60) {
    errors.timeCommitmentHoursPerMonth = 'Time commitment must be between 0 and 60 hours per month';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for board mandate input',
      errors
    };
  }

  return {
    ok: true,
    data: {
      targetCompanyName: String(d.targetCompanyName).trim(),
      mandateType: d.mandateType as BoardMandateType,
      stage: d.stage as MandatePipelineStage,
      annualCashRetainer: Math.max(0, Number(d.annualCashRetainer) || 0),
      meetingFeePerBoardMeeting: Math.max(0, Number(d.meetingFeePerBoardMeeting) || 0),
      meetingFeePerCommitteeMeeting: Math.max(0, Number(d.meetingFeePerCommitteeMeeting) || 0),
      expectedBoardMeetingsPerYear: Math.max(0, Math.min(24, Math.round(Number(d.expectedBoardMeetingsPerYear) || 4))),
      expectedCommitteeMeetingsPerYear: Math.max(0, Math.min(24, Math.round(Number(d.expectedCommitteeMeetingsPerYear) || 4))),
      equityPercentage: Math.max(0, Math.min(10, Number(d.equityPercentage) || 0)),
      equityGrantType: (d.equityGrantType as BoardEquityGrantType) || 'nso_options',
      vestingSchedule: (d.vestingSchedule as BoardVestingScheduleType) || 'two_year_monthly_no_cliff',
      accelerationClause: (d.accelerationClause as AccelerationClauseType) || 'single_trigger_change_of_control',
      optionStrikePrice: Math.max(0, Number(d.optionStrikePrice) || 0),
      timeCommitmentHoursPerMonth: Math.max(1, Math.min(60, Math.round(Number(d.timeCommitmentHoursPerMonth) || 4))),
      termLengthYears: Math.max(1, Math.min(10, Math.round(Number(d.termLengthYears) || 2))),
      committeeAssignments: Array.isArray(d.committeeAssignments) ? (d.committeeAssignments as BoardCommitteeKey[]) : [],
      hasDAndOInsurance: Boolean(d.hasDAndOInsurance),
      dAndOPolicyLimitMillions: Math.max(0, Number(d.dAndOPolicyLimitMillions) || 0),
      hasSideADicCoverage: Boolean(d.hasSideADicCoverage),
      hasIndemnificationAgreement: Boolean(d.hasIndemnificationAgreement),
      notes: typeof d.notes === 'string' ? d.notes.trim() : ''
    }
  };
}

export function validateGovernanceMatrixInput(raw: unknown): ValidationResult<GovernanceMatrixMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be a non-null object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const fields = [
    'fiduciaryAcumenScore',
    'cyberAuditOversightScore',
    'aiGovernanceEthicsScore',
    'executiveCompensationScore',
    'boardroomPresenceDissentScore'
  ];

  for (const f of fields) {
    const val = d[f];
    if (typeof val !== 'number' || val < 0 || val > 100) {
      errors[f] = `${f} must be a number between 0 and 100`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for governance matrix input',
      errors
    };
  }

  return {
    ok: true,
    data: {
      fiduciaryAcumenScore: Math.round(Number(d.fiduciaryAcumenScore)),
      cyberAuditOversightScore: Math.round(Number(d.cyberAuditOversightScore)),
      aiGovernanceEthicsScore: Math.round(Number(d.aiGovernanceEthicsScore)),
      executiveCompensationScore: Math.round(Number(d.executiveCompensationScore)),
      boardroomPresenceDissentScore: Math.round(Number(d.boardroomPresenceDissentScore)),
      verifiedCredentials: Array.isArray(d.verifiedCredentials) ? d.verifiedCredentials.map(String) : []
    }
  };
}
