export type PerformanceLevel = 1 | 2 | 3;
export type PotentialLevel = 1 | 2 | 3;

export type NineBoxClassification =
  | 'star'
  | 'high_performer'
  | 'solid_professional'
  | 'high_potential'
  | 'core_player'
  | 'effective'
  | 'enigma_rough_diamond'
  | 'dilemma'
  | 'underperformer_risk';

export type FlightRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type KeyPersonRiskTier =
  | 'low_exposure'
  | 'moderate_exposure'
  | 'high_vulnerability'
  | 'critical_spof';

export type ReadinessHorizon =
  | 'ready_now'
  | 'ready_1_2_years'
  | 'emergency_interim';

export type InterventionPlaybookType =
  | 'retention_equity_refresh'
  | 'role_expansion_promotion'
  | 'executive_mentoring_coaching'
  | 'sabbatical_retention_bonus';

export type InterventionStatus = 'proposed' | 'approved' | 'active' | 'completed' | 'declined';

export type CompetencyDomain =
  | 'strategic_vision'
  | 'operational_execution'
  | 'people_leadership_culture'
  | 'financial_business_acumen'
  | 'ai_technology_innovation';

export type GovernanceHealthTier =
  | 'resilient_bench'
  | 'stable_continuity'
  | 'vulnerable_pipeline'
  | 'critical_deficit';

export type SuccessionPlanStatus =
  | 'draft'
  | 'pending_vp_talent'
  | 'pending_cpo'
  | 'pending_ceo'
  | 'board_approved'
  | 'archived';

export type SignOffExecutiveRole =
  | 'vp_talent_management'
  | 'chief_people_officer'
  | 'ceo';

export interface TalentProfileDTO {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  currentRole: string;
  department: string;
  tenureYears: number;
  yearsInCurrentRole: number;
  performanceLevel: PerformanceLevel;
  potentialLevel: PotentialLevel;
  nineBoxClassification: NineBoxClassification;
  nineBoxCalibrationScore: number;
  totalDirectCompensationUsd: number;
  marketBenchmarkP75Usd: number;
  compaRatio: number;
  unvestedEquityValueUsd: number;
  monthsToEquityCliff: number;
  organizationalChangeImpact: number;
  flightRiskScore: number;
  flightRiskLevel: FlightRiskLevel;
  spofSeverity: number;
  operationalCriticality: number;
  replacementDifficulty: number;
  keyPersonRiskIndex: number;
  keyPersonRiskTier: KeyPersonRiskTier;
  underrepresentedLeader: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TalentProfileMutationDTO {
  employeeId: string;
  fullName: string;
  currentRole: string;
  department: string;
  tenureYears: number;
  yearsInCurrentRole: number;
  performanceLevel: PerformanceLevel;
  potentialLevel: PotentialLevel;
  totalDirectCompensationUsd: number;
  marketBenchmarkP75Usd: number;
  unvestedEquityValueUsd: number;
  monthsToEquityCliff: number;
  organizationalChangeImpact: number;
  spofSeverity: number;
  operationalCriticality: number;
  replacementDifficulty: number;
  underrepresentedLeader: boolean;
  avatarUrl?: string;
}

export interface CalibrationDistributionDTO {
  totalTalentCount: number;
  starsCount: number;
  starsPercentage: number;
  coreGrowthCount: number;
  coreGrowthPercentage: number;
  actionRiskCount: number;
  actionRiskPercentage: number;
  distributionDivergenceIndex: number;
  calibrationHealthScore: number;
  cellCounts: Record<NineBoxClassification, number>;
}

export interface RetentionInterventionDTO {
  id: string;
  userId: string;
  talentProfileId: string;
  talentName: string;
  talentRole: string;
  playbookType: InterventionPlaybookType;
  title: string;
  description: string;
  proposedCostUsd: number;
  status: InterventionStatus;
  triggerRationale: string;
  authorizedBy?: string;
  targetCompletionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface RetentionInterventionMutationDTO {
  talentProfileId: string;
  playbookType: InterventionPlaybookType;
  title: string;
  description: string;
  proposedCostUsd: number;
  status: InterventionStatus;
  triggerRationale: string;
  targetCompletionDate: string;
}

export interface SuccessorCandidateDTO {
  id: string;
  userId: string;
  criticalRoleId: string;
  talentProfileId: string;
  candidateName: string;
  currentRole: string;
  readinessHorizon: ReadinessHorizon;
  rankingOrder: number;
  competencyCoverageIndex: number;
  notes: string;
  underrepresentedLeader: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessorCandidateMutationDTO {
  criticalRoleId: string;
  talentProfileId: string;
  readinessHorizon: ReadinessHorizon;
  rankingOrder: number;
  notes?: string;
}

export interface CriticalRoleDTO {
  id: string;
  userId: string;
  planId: string;
  title: string;
  department: string;
  currentIncumbentId?: string;
  currentIncumbentName?: string;
  operationalCriticality: number;
  vacancyDisruptionScore: number;
  successors: SuccessorCandidateDTO[];
  readyNowCount: number;
  ready1To2YearsCount: number;
  emergencyInterimCount: number;
  isEmergencyVulnerable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriticalRoleMutationDTO {
  planId: string;
  title: string;
  department: string;
  currentIncumbentId?: string;
  operationalCriticality: number;
}

export interface SuccessionBenchDepthDTO {
  totalCriticalRoles: number;
  totalSuccessorsIdentified: number;
  benchDepthRatio: number;
  isBenchHealthy: boolean;
  emergencyVulnerableRoleCount: number;
  emergencyVulnerabilityIndex: number;
  underrepresentedSuccessorsCount: number;
  successionDiversityIndex: number;
}

export interface CompetencyScoreDTO {
  domain: CompetencyDomain;
  domainLabel: string;
  currentScore: number;
  targetScore: number;
  gap: number;
}

export interface DevelopmentMilestoneDTO {
  id: string;
  dayHorizon: 30 | 60 | 90 | 180;
  phaseTitle: string;
  actionItems: string[];
  deliverable: string;
  mentorOrSponsor: string;
  completed: boolean;
}

export interface ExecutiveDevelopmentPlanDTO {
  id: string;
  userId: string;
  talentProfileId: string;
  talentName: string;
  targetRoleId: string;
  targetRoleTitle: string;
  competencyScores: CompetencyScoreDTO[];
  competencyCoverageIndex: number;
  milestones: DevelopmentMilestoneDTO[];
  executiveSponsorName: string;
  status: 'active' | 'in_review' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveDevelopmentPlanMutationDTO {
  talentProfileId: string;
  targetRoleId: string;
  executiveSponsorName: string;
  competencyScores: Array<{ domain: CompetencyDomain; currentScore: number; targetScore: number }>;
}

export interface TripartiteSignOffDTO {
  role: SignOffExecutiveRole;
  roleLabel: string;
  signedByUserId?: string;
  signedByUserName?: string;
  signedAt?: string;
  isApproved: boolean;
  governanceComments?: string;
  digitalSignatureHash?: string;
}

export interface SuccessionPlanDTO {
  id: string;
  userId: string;
  title: string;
  fiscalYear: number;
  status: SuccessionPlanStatus;
  calibrationDistribution: CalibrationDistributionDTO;
  benchDepth: SuccessionBenchDepthDTO;
  averageKeyPersonRiskIndex: number;
  averageCompetencyCoverageIndex: number;
  successionHealthScore: number;
  governanceHealthTier: GovernanceHealthTier;
  criticalRoles: CriticalRoleDTO[];
  activeInterventionsCount: number;
  totalInterventionBudgetUsd: number;
  boardMemorandumMarkdown: string;
  signOffs: TripartiteSignOffDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface SuccessionPlanMutationDTO {
  title: string;
  fiscalYear: number;
}

export interface SuccessionStudioOverviewDTO {
  plan: SuccessionPlanDTO;
  talentProfiles: TalentProfileDTO[];
  interventions: RetentionInterventionDTO[];
  developmentPlans: ExecutiveDevelopmentPlanDTO[];
  calibrationDistribution: CalibrationDistributionDTO;
  benchDepth: SuccessionBenchDepthDTO;
}

export function classifyNineBox(perf: PerformanceLevel, pot: PotentialLevel): NineBoxClassification {
  if (perf === 3 && pot === 3) return 'star';
  if (perf === 3 && pot === 2) return 'high_performer';
  if (perf === 3 && pot === 1) return 'solid_professional';
  if (perf === 2 && pot === 3) return 'high_potential';
  if (perf === 2 && pot === 2) return 'core_player';
  if (perf === 2 && pot === 1) return 'effective';
  if (perf === 1 && pot === 3) return 'enigma_rough_diamond';
  if (perf === 1 && pot === 2) return 'dilemma';
  return 'underperformer_risk';
}

export function calculateNineBoxScore(perf: PerformanceLevel, pot: PotentialLevel): number {
  const wPerf = 0.55;
  const wPot = 0.45;
  const raw = ((wPerf * (perf - 1) + wPot * (pot - 1)) / (2 * (wPerf + wPot))) * 100;
  return Number(Math.max(0, Math.min(100, raw)).toFixed(1));
}

export function calculateCalibrationDistribution(
  profiles: Array<{ nineBoxClassification: NineBoxClassification }>
): CalibrationDistributionDTO {
  const cellCounts: Record<NineBoxClassification, number> = {
    star: 0,
    high_performer: 0,
    solid_professional: 0,
    high_potential: 0,
    core_player: 0,
    effective: 0,
    enigma_rough_diamond: 0,
    dilemma: 0,
    underperformer_risk: 0
  };

  for (const p of profiles) {
    if (p.nineBoxClassification in cellCounts) {
      cellCounts[p.nineBoxClassification] += 1;
    }
  }

  const total = profiles.length;
  if (total === 0) {
    return {
      totalTalentCount: 0,
      starsCount: 0,
      starsPercentage: 0,
      coreGrowthCount: 0,
      coreGrowthPercentage: 0,
      actionRiskCount: 0,
      actionRiskPercentage: 0,
      distributionDivergenceIndex: 0,
      calibrationHealthScore: 100,
      cellCounts
    };
  }

  const starsCount = cellCounts.star;
  const coreGrowthCount =
    cellCounts.high_performer +
    cellCounts.high_potential +
    cellCounts.core_player +
    cellCounts.solid_professional +
    cellCounts.effective;
  const actionRiskCount =
    cellCounts.enigma_rough_diamond +
    cellCounts.dilemma +
    cellCounts.underperformer_risk;

  const starsPercentage = Number(((starsCount / total) * 100).toFixed(1));
  const coreGrowthPercentage = Number(((coreGrowthCount / total) * 100).toFixed(1));
  const actionRiskPercentage = Number(((actionRiskCount / total) * 100).toFixed(1));

  const piStars = starsCount / total;
  const piCore = coreGrowthCount / total;
  const piRisk = actionRiskCount / total;

  const targetStars = 0.1;
  const targetCore = 0.7;
  const targetRisk = 0.2;

  const divergence =
    0.5 *
    (Math.abs(piStars - targetStars) +
      Math.abs(piCore - targetCore) +
      Math.abs(piRisk - targetRisk)) *
    100;
  const healthScore = Math.max(0, Math.min(100, 100 - 2.5 * divergence));

  return {
    totalTalentCount: total,
    starsCount,
    starsPercentage,
    coreGrowthCount,
    coreGrowthPercentage,
    actionRiskCount,
    actionRiskPercentage,
    distributionDivergenceIndex: Number(divergence.toFixed(1)),
    calibrationHealthScore: Number(healthScore.toFixed(1)),
    cellCounts
  };
}

export function calculateKeyPersonRiskIndex(
  spofSeverity: number,
  operationalCriticality: number,
  replacementDifficulty: number
): { index: number; tier: KeyPersonRiskTier } {
  const s = Math.max(1, Math.min(5, spofSeverity));
  const o = Math.max(1, Math.min(5, operationalCriticality));
  const r = Math.max(1, Math.min(5, replacementDifficulty));

  const lambda1 = 0.4;
  const lambda2 = 0.35;
  const lambda3 = 0.25;

  const raw =
    ((lambda1 * (s - 1) + lambda2 * (o - 1) + lambda3 * (r - 1)) /
      (4 * (lambda1 + lambda2 + lambda3))) *
    100;
  const index = Number(Math.max(0, Math.min(100, raw)).toFixed(1));

  let tier: KeyPersonRiskTier = 'low_exposure';
  if (index > 80) tier = 'critical_spof';
  else if (index > 60) tier = 'high_vulnerability';
  else if (index > 30) tier = 'moderate_exposure';

  return { index, tier };
}

export function calculateFlightRisk(
  compaRatio: number,
  yearsInRole: number,
  monthsToCliff: number,
  orgChangeImpact: number
): { score: number; level: FlightRiskLevel } {
  let fComp = 0;
  if (compaRatio < 1.05) {
    fComp = Math.min(1.0, 1.25 * (1.05 - compaRatio));
  }

  let fTenure = 0;
  if (yearsInRole > 2.0) {
    fTenure = Math.min(1.0, 0.35 * (yearsInRole - 2.0));
  }

  const fCliff = Math.exp(-0.12 * Math.max(0, monthsToCliff));
  const thetaChange = Math.max(0, Math.min(1.0, orgChangeImpact));

  const raw =
    100 * (0.35 * fComp + 0.25 * fTenure + 0.25 * fCliff + 0.15 * thetaChange);
  const score = Number(Math.max(0, Math.min(100, raw)).toFixed(1));

  let level: FlightRiskLevel = 'low';
  if (score > 80) level = 'critical';
  else if (score > 60) level = 'high';
  else if (score > 30) level = 'medium';

  return { score, level };
}

export function evaluateRetentionInterventionTriggers(profile: {
  compaRatio: number;
  yearsInRole: number;
  monthsToCliff: number;
  orgChangeImpact: number;
  spofSeverity: number;
  operationalCriticality: number;
  replacementDifficulty: number;
  performanceLevel: PerformanceLevel;
  potentialLevel: PotentialLevel;
}): Array<{ playbookType: InterventionPlaybookType; title: string; rationale: string }> {
  const triggers: Array<{
    playbookType: InterventionPlaybookType;
    title: string;
    rationale: string;
  }> = [];

  const fCliff = Math.exp(-0.12 * Math.max(0, profile.monthsToCliff));
  const kpri = calculateKeyPersonRiskIndex(
    profile.spofSeverity,
    profile.operationalCriticality,
    profile.replacementDifficulty
  ).index;
  const flight = calculateFlightRisk(
    profile.compaRatio,
    profile.yearsInRole,
    profile.monthsToCliff,
    profile.orgChangeImpact
  ).score;

  if (fCliff > 0.6 || (profile.monthsToCliff <= 8 && kpri >= 60)) {
    triggers.push({
      playbookType: 'retention_equity_refresh',
      title: 'Retention Equity Refresh Grant',
      rationale: `Imminent equity cliff in ${profile.monthsToCliff} months combined with elevated KPRI (${kpri}/100) requires immediate board equity refresh grant.`
    });
  }

  if (profile.yearsInRole >= 2.5 && profile.performanceLevel >= 2 && profile.potentialLevel >= 2) {
    triggers.push({
      playbookType: 'role_expansion_promotion',
      title: 'Executive Scope Expansion & Promotion Acceleration',
      rationale: `Tenure stagnancy of ${profile.yearsInRole} years without promotion despite solid calibration indicates promotion or scope expansion readiness.`
    });
  }

  if (flight >= 50 && profile.potentialLevel >= 2) {
    triggers.push({
      playbookType: 'executive_mentoring_coaching',
      title: 'Executive Mentorship & Board Coaching',
      rationale: `Elevated flight probability (${flight}/100) warrants external advisory sponsorship and leadership coaching intervention.`
    });
  }

  if (flight >= 75 && kpri >= 75) {
    triggers.push({
      playbookType: 'sabbatical_retention_bonus',
      title: 'Sabbatical & Emergency Cash Retention Bonus',
      rationale: `Critical flight risk (${flight}/100) paired with acute SPOF vulnerability (${kpri}/100) necessitates immediate contractual cash retention bonus.`
    });
  }

  return triggers;
}

export function calculateBenchDepthMetrics(
  criticalRoles: Array<{
    operationalCriticality: number;
    successors: Array<{
      readinessHorizon: ReadinessHorizon;
      underrepresentedLeader?: boolean;
    }>;
  }>
): SuccessionBenchDepthDTO {
  const totalCriticalRoles = criticalRoles.length;
  if (totalCriticalRoles === 0) {
    return {
      totalCriticalRoles: 0,
      totalSuccessorsIdentified: 0,
      benchDepthRatio: 0,
      isBenchHealthy: false,
      emergencyVulnerableRoleCount: 0,
      emergencyVulnerabilityIndex: 0,
      underrepresentedSuccessorsCount: 0,
      successionDiversityIndex: 0
    };
  }

  let totalSuccessors = 0;
  let emergencyVulnerableCount = 0;
  let underrepresentedCount = 0;

  for (const role of criticalRoles) {
    totalSuccessors += role.successors.length;
    const readyNow = role.successors.filter(s => s.readinessHorizon === 'ready_now');
    if (readyNow.length === 0) {
      emergencyVulnerableCount += 1;
    }
    for (const s of role.successors) {
      if (s.underrepresentedLeader) {
        underrepresentedCount += 1;
      }
    }
  }

  const benchDepthRatio = Number((totalSuccessors / totalCriticalRoles).toFixed(2));
  const emergencyVulnerabilityIndex = Number(
    ((emergencyVulnerableCount / totalCriticalRoles) * 100).toFixed(1)
  );
  const successionDiversityIndex =
    totalSuccessors > 0
      ? Number(((underrepresentedCount / totalSuccessors) * 100).toFixed(1))
      : 0;

  return {
    totalCriticalRoles,
    totalSuccessorsIdentified: totalSuccessors,
    benchDepthRatio,
    isBenchHealthy: benchDepthRatio >= 2.0 && emergencyVulnerabilityIndex <= 20,
    emergencyVulnerableRoleCount: emergencyVulnerableCount,
    emergencyVulnerabilityIndex,
    underrepresentedSuccessorsCount: underrepresentedCount,
    successionDiversityIndex
  };
}

export function calculateCompetencyGap(
  currentScores: Array<{ domain: CompetencyDomain; score: number }>,
  targetScores: Array<{ domain: CompetencyDomain; score: number }>
): { scores: CompetencyScoreDTO[]; coverageIndex: number } {
  const domainLabels: Record<CompetencyDomain, string> = {
    strategic_vision: 'Strategic Vision & Foresight',
    operational_execution: 'Operational Execution & Velocity',
    people_leadership_culture: 'People Leadership & Cultural Anchor',
    financial_business_acumen: 'Financial & Capital Acumen',
    ai_technology_innovation: 'AI & Technological Innovation'
  };

  const domains: CompetencyDomain[] = [
    'strategic_vision',
    'operational_execution',
    'people_leadership_culture',
    'financial_business_acumen',
    'ai_technology_innovation'
  ];

  let sumGaps = 0;
  let sumTargets = 0;
  const scores: CompetencyScoreDTO[] = [];

  for (const d of domains) {
    const curr = currentScores.find(s => s.domain === d)?.score ?? 3.0;
    const targ = targetScores.find(s => s.domain === d)?.score ?? 4.5;
    const gap = Math.max(0, Number((targ - curr).toFixed(1)));
    sumGaps += gap;
    sumTargets += targ;
    scores.push({
      domain: d,
      domainLabel: domainLabels[d],
      currentScore: Number(curr.toFixed(1)),
      targetScore: Number(targ.toFixed(1)),
      gap
    });
  }

  const rawCoverage = sumTargets > 0 ? (1 - sumGaps / sumTargets) * 100 : 100;
  const coverageIndex = Number(Math.max(0, Math.min(100, rawCoverage)).toFixed(1));

  return { scores, coverageIndex };
}

export function generateDevelopmentMilestones(gaps: CompetencyScoreDTO[]): DevelopmentMilestoneDTO[] {
  const topGaps = [...gaps].sort((a, b) => b.gap - a.gap);
  const primaryGap = topGaps[0] || { domain: 'strategic_vision', domainLabel: 'Strategic Vision' };
  const secondaryGap = topGaps[1] || { domain: 'financial_business_acumen', domainLabel: 'Financial Acumen' };

  return [
    {
      id: 'ms-30',
      dayHorizon: 30,
      phaseTitle: 'Phase 1: Diagnostic & Stakeholder Alignment',
      actionItems: [
        `Conduct 360-degree leadership review focusing on ${primaryGap.domainLabel}`,
        'Engage executive sponsor for weekly mentoring cadence',
        'Review current board governance and operational reporting frameworks'
      ],
      deliverable: 'Executive Capability Diagnostic & Development Charter',
      mentorOrSponsor: 'Chief People Officer',
      completed: false
    },
    {
      id: 'ms-60',
      dayHorizon: 60,
      phaseTitle: 'Phase 2: High-Impact Strategic Stretch Assignment',
      actionItems: [
        `Lead cross-functional initiative addressing enterprise ${secondaryGap.domainLabel}`,
        'Formulate multi-quarter operational turnaround strategy',
        'Present preliminary business model optimization to Executive Committee'
      ],
      deliverable: 'Cross-Functional Strategic Delivery Whitepaper',
      mentorOrSponsor: 'Chief Technology Officer',
      completed: false
    },
    {
      id: 'ms-90',
      dayHorizon: 90,
      phaseTitle: 'Phase 3: Executive Operational Shadowing & Fiduciary Governance',
      actionItems: [
        'Shadow incumbent in board committee sessions and capital allocation meetings',
        'Participate directly in annual enterprise budget formulation',
        'Engage directly in high-stakes enterprise vendor and customer contract negotiations'
      ],
      deliverable: 'Board Committee Governance Review Portfolio',
      mentorOrSponsor: 'Chief Executive Officer',
      completed: false
    },
    {
      id: 'ms-180',
      dayHorizon: 180,
      phaseTitle: 'Phase 4: Full Operational Autonomy & Board Review',
      actionItems: [
        'Assume direct operational delegation for key division or business unit',
        'Complete formal 180-day radar re-evaluation with executive assessors',
        'Deliver comprehensive Board Nominations Committee transition briefing'
      ],
      deliverable: 'Succession Readiness Certification & Board Sign-off File',
      mentorOrSponsor: 'Board Nominations Committee Chair',
      completed: false
    }
  ];
}

export function calculateSuccessionHealthScore(params: {
  benchDepthRatio: number;
  emergencyVulnerabilityIndex: number;
  averageKpri: number;
  averageCci: number;
  calibrationHealthScore: number;
}): { score: number; tier: GovernanceHealthTier } {
  const scoreBdr = Math.min(100, (params.benchDepthRatio / 2.5) * 100);
  const scoreEvi = 100 - params.emergencyVulnerabilityIndex;
  const scoreKpri = 100 - params.averageKpri;
  const scoreCci = params.averageCci;
  const scoreCalib = params.calibrationHealthScore;

  const w1 = 0.25;
  const w2 = 0.25;
  const w3 = 0.2;
  const w4 = 0.15;
  const w5 = 0.15;

  const raw =
    w1 * scoreBdr +
    w2 * scoreEvi +
    w3 * scoreKpri +
    w4 * scoreCci +
    w5 * scoreCalib;
  const score = Number(Math.max(0, Math.min(100, raw)).toFixed(1));

  let tier: GovernanceHealthTier = 'critical_deficit';
  if (score >= 85) tier = 'resilient_bench';
  else if (score >= 70) tier = 'stable_continuity';
  else if (score >= 55) tier = 'vulnerable_pipeline';

  return { score, tier };
}

export function generateBoardSuccessionMemorandumMarkdown(plan: SuccessionPlanDTO): string {
  const signOffLines = plan.signOffs
    .map(s => {
      const statusText = s.isApproved
        ? `[APPROVED] Signed by ${s.signedByUserName || 'Executive'} at ${s.signedAt || 'N/A'}`
        : '[PENDING] Awaiting Executive Review';
      return `- **${s.roleLabel}**: ${statusText}\n  - Hash: \`${s.digitalSignatureHash || 'unsigned'}\`\n  - Notes: ${s.governanceComments || 'None'}`;
    })
    .join('\n');

  const roleLines = plan.criticalRoles
    .map(r => {
      const vulnTag = r.isEmergencyVulnerable ? '🚨 VULNERABLE' : '✅ SECURE';
      const successorSummary = r.successors
        .map(
          s =>
            `    - ${s.candidateName} (${s.readinessHorizon.toUpperCase().replace(/_/g, ' ')}) - CCI: ${s.competencyCoverageIndex}%`
        )
        .join('\n');
      return `- **${r.title}** (${r.department}) - Incumbent: ${r.currentIncumbentName || 'Open Vacancy'} [${vulnTag}]\n  - Ready Now: ${r.readyNowCount} | 1-2 Years: ${r.ready1To2YearsCount} | Emergency Interim: ${r.emergencyInterimCount}\n${successorSummary || '    - No successors identified'}`;
    })
    .join('\n');

  return `# Executive Board Memorandum: Enterprise Leadership Succession & Continuity Plan
**Fiscal Year**: FY${plan.fiscalYear}  
**Governance Plan**: ${plan.title}  
**Succession Health Score (SHS)**: **${plan.successionHealthScore} / 100** (${plan.governanceHealthTier.toUpperCase().replace(/_/g, ' ')})  
**Status**: ${plan.status.toUpperCase().replace(/_/g, ' ')}  
**Date**: ${new Date().toISOString().split('T')[0]}  

---

## 1. Executive Summary & Fiduciary Continuity Rationale
This memorandum establishes the formal leadership succession pipeline for JobTrack's mission-critical executive roles. In accordance with Board Nominations & Governance Committee mandates, this document evaluates executive bench depth, mitigates single point of failure (SPOF) risks, tracks predictive flight risks, and outlines targeted retention playbooks.

### Key Executive Continuity Metrics:
- **Bench Depth Ratio (BDR)**: **${plan.benchDepth.benchDepthRatio}x** (Target: $\\ge 2.0x$) - Status: ${plan.benchDepth.isBenchHealthy ? 'HEALTHY' : 'NEEDS EXPANSION'}
- **Emergency Vacancy Vulnerability (EVI)**: **${plan.benchDepth.emergencyVulnerabilityIndex}%** of critical positions
- **Succession Diversity Index (SDI)**: **${plan.benchDepth.successionDiversityIndex}%** underrepresented executive leaders
- **Average Key Person Risk Index (KPRI)**: **${plan.averageKeyPersonRiskIndex} / 100**
- **Average Competency Coverage Index (CCI)**: **${plan.averageCompetencyCoverageIndex}%**
- **Active Retention Interventions**: **${plan.activeInterventionsCount}** initiatives (Total Budget: **$${(plan.totalInterventionBudgetUsd / 1000).toFixed(0)}k**)

---

## 2. 9-Box Talent Calibration & Distribution Breakdown
- **Stars (Top Tier)**: ${plan.calibrationDistribution.starsCount} (${plan.calibrationDistribution.starsPercentage}% | Target: 10%)
- **Core & High Growth Tier**: ${plan.calibrationDistribution.coreGrowthCount} (${plan.calibrationDistribution.coreGrowthPercentage}% | Target: 70%)
- **Action & Risk Tier**: ${plan.calibrationDistribution.actionRiskCount} (${plan.calibrationDistribution.actionRiskPercentage}% | Target: 20%)
- **Calibration Health Score**: **${plan.calibrationDistribution.calibrationHealthScore} / 100** (Divergence: ${plan.calibrationDistribution.distributionDivergenceIndex}%)

---

## 3. Mission-Critical Executive Roles & Successor Readiness
${roleLines || '- No critical roles cataloged'}

---

## 4. Tripartite Executive Governance Sign-Off Matrix
${signOffLines}

---
*Generated by JobTrack Executive Succession Pipeline Studio. Digital signature digest bound to immutable audit trail.*`;
}

export function validateTalentProfileInput(input: unknown): TalentProfileMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Talent profile input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.employeeId !== 'string' || obj.employeeId.trim().length === 0) {
    throw new Error('employeeId is required and must be non-empty');
  }
  if (typeof obj.fullName !== 'string' || obj.fullName.trim().length === 0) {
    throw new Error('fullName is required and must be non-empty');
  }
  if (typeof obj.currentRole !== 'string' || obj.currentRole.trim().length === 0) {
    throw new Error('currentRole is required and must be non-empty');
  }
  if (typeof obj.department !== 'string' || obj.department.trim().length === 0) {
    throw new Error('department is required and must be non-empty');
  }

  const perf = Number(obj.performanceLevel);
  if (![1, 2, 3].includes(perf)) {
    throw new Error('performanceLevel must be 1, 2, or 3');
  }

  const pot = Number(obj.potentialLevel);
  if (![1, 2, 3].includes(pot)) {
    throw new Error('potentialLevel must be 1, 2, or 3');
  }

  return {
    employeeId: obj.employeeId.trim(),
    fullName: obj.fullName.trim(),
    currentRole: obj.currentRole.trim(),
    department: obj.department.trim(),
    tenureYears: Math.max(0, Number(obj.tenureYears || 0)),
    yearsInCurrentRole: Math.max(0, Number(obj.yearsInCurrentRole || 0)),
    performanceLevel: perf as PerformanceLevel,
    potentialLevel: pot as PotentialLevel,
    totalDirectCompensationUsd: Math.max(0, Number(obj.totalDirectCompensationUsd || 0)),
    marketBenchmarkP75Usd: Math.max(0, Number(obj.marketBenchmarkP75Usd || 0)),
    unvestedEquityValueUsd: Math.max(0, Number(obj.unvestedEquityValueUsd || 0)),
    monthsToEquityCliff: Math.max(0, Number(obj.monthsToEquityCliff || 0)),
    organizationalChangeImpact: Math.max(0, Math.min(1, Number(obj.organizationalChangeImpact || 0.1))),
    spofSeverity: Math.max(1, Math.min(5, Number(obj.spofSeverity || 1))),
    operationalCriticality: Math.max(1, Math.min(5, Number(obj.operationalCriticality || 1))),
    replacementDifficulty: Math.max(1, Math.min(5, Number(obj.replacementDifficulty || 1))),
    underrepresentedLeader: Boolean(obj.underrepresentedLeader),
    avatarUrl: typeof obj.avatarUrl === 'string' ? obj.avatarUrl.trim() : undefined
  };
}

export function validateRetentionInterventionInput(input: unknown): RetentionInterventionMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Retention intervention input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.talentProfileId !== 'string' || obj.talentProfileId.trim().length === 0) {
    throw new Error('talentProfileId is required and must be non-empty');
  }

  const validPlaybooks: InterventionPlaybookType[] = [
    'retention_equity_refresh',
    'role_expansion_promotion',
    'executive_mentoring_coaching',
    'sabbatical_retention_bonus'
  ];
  if (!validPlaybooks.includes(obj.playbookType as InterventionPlaybookType)) {
    throw new Error('Invalid playbookType');
  }

  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    throw new Error('title is required and must be non-empty');
  }

  const validStatuses: InterventionStatus[] = ['proposed', 'approved', 'active', 'completed', 'declined'];
  const status = (typeof obj.status === 'string' && validStatuses.includes(obj.status as InterventionStatus))
    ? (obj.status as InterventionStatus)
    : 'proposed';

  return {
    talentProfileId: obj.talentProfileId.trim(),
    playbookType: obj.playbookType as InterventionPlaybookType,
    title: obj.title.trim(),
    description: typeof obj.description === 'string' ? obj.description.trim() : '',
    proposedCostUsd: Math.max(0, Number(obj.proposedCostUsd || 0)),
    status,
    triggerRationale: typeof obj.triggerRationale === 'string' ? obj.triggerRationale.trim() : '',
    targetCompletionDate: typeof obj.targetCompletionDate === 'string' ? obj.targetCompletionDate.trim() : ''
  };
}

export function validateCriticalRoleInput(input: unknown): CriticalRoleMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Critical role input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.planId !== 'string' || obj.planId.trim().length === 0) {
    throw new Error('planId is required and must be non-empty');
  }
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    throw new Error('title is required and must be non-empty');
  }
  if (typeof obj.department !== 'string' || obj.department.trim().length === 0) {
    throw new Error('department is required and must be non-empty');
  }

  return {
    planId: obj.planId.trim(),
    title: obj.title.trim(),
    department: obj.department.trim(),
    currentIncumbentId: typeof obj.currentIncumbentId === 'string' ? obj.currentIncumbentId.trim() : undefined,
    operationalCriticality: Math.max(1, Math.min(5, Number(obj.operationalCriticality || 3)))
  };
}

export function validateSuccessorCandidateInput(input: unknown): SuccessorCandidateMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Successor candidate input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.criticalRoleId !== 'string' || obj.criticalRoleId.trim().length === 0) {
    throw new Error('criticalRoleId is required and must be non-empty');
  }
  if (typeof obj.talentProfileId !== 'string' || obj.talentProfileId.trim().length === 0) {
    throw new Error('talentProfileId is required and must be non-empty');
  }

  const validHorizons: ReadinessHorizon[] = ['ready_now', 'ready_1_2_years', 'emergency_interim'];
  if (!validHorizons.includes(obj.readinessHorizon as ReadinessHorizon)) {
    throw new Error('Invalid readinessHorizon');
  }

  return {
    criticalRoleId: obj.criticalRoleId.trim(),
    talentProfileId: obj.talentProfileId.trim(),
    readinessHorizon: obj.readinessHorizon as ReadinessHorizon,
    rankingOrder: Math.max(1, Number(obj.rankingOrder || 1)),
    notes: typeof obj.notes === 'string' ? obj.notes.trim() : undefined
  };
}

export function validateExecutiveDevelopmentPlanInput(input: unknown): ExecutiveDevelopmentPlanMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Executive development plan input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.talentProfileId !== 'string' || obj.talentProfileId.trim().length === 0) {
    throw new Error('talentProfileId is required and must be non-empty');
  }
  if (typeof obj.targetRoleId !== 'string' || obj.targetRoleId.trim().length === 0) {
    throw new Error('targetRoleId is required and must be non-empty');
  }

  const rawScores = Array.isArray(obj.competencyScores) ? obj.competencyScores : [];
  const validDomains: CompetencyDomain[] = [
    'strategic_vision',
    'operational_execution',
    'people_leadership_culture',
    'financial_business_acumen',
    'ai_technology_innovation'
  ];

  const competencyScores = rawScores
    .filter((s: unknown) => typeof s === 'object' && s !== null && validDomains.includes((s as { domain: CompetencyDomain }).domain))
    .map((s: { domain: CompetencyDomain; currentScore?: number; targetScore?: number }) => ({
      domain: s.domain,
      currentScore: Math.max(1, Math.min(5, Number(s.currentScore || 3))),
      targetScore: Math.max(1, Math.min(5, Number(s.targetScore || 4.5)))
    }));

  return {
    talentProfileId: obj.talentProfileId.trim(),
    targetRoleId: obj.targetRoleId.trim(),
    executiveSponsorName: typeof obj.executiveSponsorName === 'string' ? obj.executiveSponsorName.trim() : 'Chief People Officer',
    competencyScores
  };
}

export function validateSuccessionPlanInput(input: unknown): SuccessionPlanMutationDTO {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Succession plan input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  if (typeof obj.title !== 'string' || obj.title.trim().length === 0) {
    throw new Error('title is required and must be non-empty');
  }

  const year = Number(obj.fiscalYear);
  if (isNaN(year) || year < 2020 || year > 2040) {
    throw new Error('fiscalYear must be a valid 4-digit year between 2020 and 2040');
  }

  return {
    title: obj.title.trim(),
    fiscalYear: year
  };
}

export function validateSignOffInput(input: unknown): { role: SignOffExecutiveRole; comments?: string } {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Sign-off input must be a non-null object');
  }

  const obj = input as Record<string, unknown>;
  const validRoles: SignOffExecutiveRole[] = ['vp_talent_management', 'chief_people_officer', 'ceo'];
  if (!validRoles.includes(obj.role as SignOffExecutiveRole)) {
    throw new Error('Invalid sign-off executive role');
  }

  return {
    role: obj.role as SignOffExecutiveRole,
    comments: typeof obj.comments === 'string' ? obj.comments.trim() : undefined
  };
}
