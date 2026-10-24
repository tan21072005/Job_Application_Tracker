import type { ValidationResult } from './validators.ts';

export type StakeholderCategory =
  | 'executive_sponsor'
  | 'peer_executive'
  | 'direct_report'
  | 'staff_principal'
  | 'customer_ops';

export type StakeholderInterviewStatus =
  | 'identified'
  | 'scheduled'
  | 'completed'
  | 'deferred';

export type AlignmentLevel =
  | 'strongly_aligned'
  | 'partially_aligned'
  | 'misaligned';

export type DiagnosticAreaKey =
  | 'architecture_tech_debt'
  | 'delivery_velocity_incident_cadence'
  | 'team_morale_flight_risks'
  | 'strategic_product_engineering_alignment';

export type MilestonePhaseKey =
  | 'phase_1_listen_align'
  | 'phase_2_synthesize_wins'
  | 'phase_3_transform_scale';

export type OnboardingMilestoneStatus =
  | 'planned'
  | 'in_progress'
  | 'achieved'
  | 'blocked';

export type TransitionMomentumTier =
  | 'accelerating'
  | 'on_track'
  | 'lagging'
  | 'at_risk';

export type ExecutiveMemoType =
  | 'day_30_listening_tour'
  | 'day_60_strategic_priorities'
  | 'day_100_transformation_charter';

export interface StakeholderDTO {
  id: string;
  planId: string;
  name: string;
  roleTitle: string;
  category: StakeholderCategory;
  expectations: string;
  painPoints: string;
  politicalDynamics: string;
  sentimentScore: number;
  interviewDate: string | null;
  status: StakeholderInterviewStatus;
  alignmentLevel: AlignmentLevel;
  createdAt: string;
  updatedAt: string;
}

export interface StakeholderMutationDTO {
  name: string;
  roleTitle: string;
  category: StakeholderCategory;
  expectations: string;
  painPoints: string;
  politicalDynamics: string;
  sentimentScore: number;
  interviewDate?: string | null;
  status: StakeholderInterviewStatus;
  alignmentLevel: AlignmentLevel;
}

export interface DiagnosticDimensionDetailDTO {
  areaKey: DiagnosticAreaKey;
  score: number;
  severityLevel: 'healthy' | 'moderate_risk' | 'high_vulnerability' | 'critical_hazard';
  primaryBottlenecks: string[];
  immediateMitigations: string[];
  actionPlan: string;
}

export interface ExecutiveDiagnosticsDTO {
  architectureTechDebt: DiagnosticDimensionDetailDTO;
  deliveryVelocityIncidentCadence: DiagnosticDimensionDetailDTO;
  teamMoraleFlightRisks: DiagnosticDimensionDetailDTO;
  strategicProductEngineeringAlignment: DiagnosticDimensionDetailDTO;
  diagnosticHealthIndex: number;
  identifiedBottlenecksCount: number;
  criticalHazardsCount: number;
}

export interface ExecutiveDiagnosticsMutationDTO {
  architectureTechDebt: {
    score: number;
    primaryBottlenecks: string[];
    immediateMitigations: string[];
    actionPlan: string;
  };
  deliveryVelocityIncidentCadence: {
    score: number;
    primaryBottlenecks: string[];
    immediateMitigations: string[];
    actionPlan: string;
  };
  teamMoraleFlightRisks: {
    score: number;
    primaryBottlenecks: string[];
    immediateMitigations: string[];
    actionPlan: string;
  };
  strategicProductEngineeringAlignment: {
    score: number;
    primaryBottlenecks: string[];
    immediateMitigations: string[];
    actionPlan: string;
  };
}

export interface OnboardingMilestoneDTO {
  id: string;
  planId: string;
  phase: MilestonePhaseKey;
  title: string;
  description: string;
  targetDay: number;
  deliveredDay: number | null;
  status: OnboardingMilestoneStatus;
  isQuickWin: boolean;
  deliveryEstimateDays: number;
  impactScore: number;
  blockerReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingMilestoneMutationDTO {
  phase: MilestonePhaseKey;
  title: string;
  description: string;
  targetDay: number;
  deliveredDay?: number | null;
  status: OnboardingMilestoneStatus;
  isQuickWin: boolean;
  deliveryEstimateDays: number;
  impactScore: number;
  blockerReason?: string | null;
}

export interface TransitionMomentumDTO {
  transitionMomentumIndex: number;
  tier: TransitionMomentumTier;
  stakeholderRelationshipIndex: number;
  diagnosticHealthIndex: number;
  quickWinDeliveryRate: number;
  milestoneExecutionRate: number;
  actionPlansCoverageRate: number;
  currentDay: number;
  totalStakeholders: number;
  interviewedStakeholders: number;
  totalMilestones: number;
  achievedMilestones: number;
  quickWinsTotal: number;
  quickWinsDelivered: number;
}

export interface ExecutiveOnboardingPlanDTO {
  id: string;
  userId: string;
  applicationId: string | null;
  companyName: string;
  roleTitle: string;
  startDate: string;
  currentDay: number;
  executiveSponsorName: string;
  stakeholders: StakeholderDTO[];
  diagnostics: ExecutiveDiagnosticsDTO;
  milestones: OnboardingMilestoneDTO[];
  momentum: TransitionMomentumDTO;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveOnboardingPlanMutationDTO {
  applicationId?: string | null;
  companyName: string;
  roleTitle: string;
  startDate: string;
  currentDay: number;
  executiveSponsorName: string;
}

export function computeStakeholderRelationshipIndex(stakeholders: StakeholderDTO[]): {
  sri: number;
  coverageRate: number;
  avgSentiment: number;
  diversityFactor: number;
} {
  const total = stakeholders.length;
  if (total === 0) {
    return { sri: 0, coverageRate: 0, avgSentiment: 0, diversityFactor: 0 };
  }

  const completed = stakeholders.filter(s => s.status === 'completed');
  const coverageRate = (completed.length / total) * 100;

  const totalSentiment = completed.reduce((acc, s) => acc + s.sentimentScore, 0);
  const avgSentiment = completed.length > 0
    ? (totalSentiment / (completed.length * 5)) * 100
    : 0;

  const activeCategories = new Set(completed.map(s => s.category));
  const diversityFactor = (activeCategories.size / 5) * 100;

  const rawSri = 0.40 * coverageRate + 0.45 * avgSentiment + 0.15 * diversityFactor;
  const sri = Math.min(100, Math.max(0, Math.round(rawSri)));

  return {
    sri,
    coverageRate: Math.round(coverageRate),
    avgSentiment: Math.round(avgSentiment),
    diversityFactor: Math.round(diversityFactor)
  };
}

export function computeDiagnosticHealthIndex(input: ExecutiveDiagnosticsMutationDTO): ExecutiveDiagnosticsDTO {
  const evaluateSeverity = (score: number) => {
    if (score >= 80) return 'healthy' as const;
    if (score >= 60) return 'moderate_risk' as const;
    if (score >= 40) return 'high_vulnerability' as const;
    return 'critical_hazard' as const;
  };

  const arch: DiagnosticDimensionDetailDTO = {
    areaKey: 'architecture_tech_debt',
    score: Math.min(100, Math.max(0, Math.round(input.architectureTechDebt.score))),
    severityLevel: evaluateSeverity(input.architectureTechDebt.score),
    primaryBottlenecks: input.architectureTechDebt.primaryBottlenecks || [],
    immediateMitigations: input.architectureTechDebt.immediateMitigations || [],
    actionPlan: input.architectureTechDebt.actionPlan || ''
  };

  const velo: DiagnosticDimensionDetailDTO = {
    areaKey: 'delivery_velocity_incident_cadence',
    score: Math.min(100, Math.max(0, Math.round(input.deliveryVelocityIncidentCadence.score))),
    severityLevel: evaluateSeverity(input.deliveryVelocityIncidentCadence.score),
    primaryBottlenecks: input.deliveryVelocityIncidentCadence.primaryBottlenecks || [],
    immediateMitigations: input.deliveryVelocityIncidentCadence.immediateMitigations || [],
    actionPlan: input.deliveryVelocityIncidentCadence.actionPlan || ''
  };

  const morale: DiagnosticDimensionDetailDTO = {
    areaKey: 'team_morale_flight_risks',
    score: Math.min(100, Math.max(0, Math.round(input.teamMoraleFlightRisks.score))),
    severityLevel: evaluateSeverity(input.teamMoraleFlightRisks.score),
    primaryBottlenecks: input.teamMoraleFlightRisks.primaryBottlenecks || [],
    immediateMitigations: input.teamMoraleFlightRisks.immediateMitigations || [],
    actionPlan: input.teamMoraleFlightRisks.actionPlan || ''
  };

  const align: DiagnosticDimensionDetailDTO = {
    areaKey: 'strategic_product_engineering_alignment',
    score: Math.min(100, Math.max(0, Math.round(input.strategicProductEngineeringAlignment.score))),
    severityLevel: evaluateSeverity(input.strategicProductEngineeringAlignment.score),
    primaryBottlenecks: input.strategicProductEngineeringAlignment.primaryBottlenecks || [],
    immediateMitigations: input.strategicProductEngineeringAlignment.immediateMitigations || [],
    actionPlan: input.strategicProductEngineeringAlignment.actionPlan || ''
  };

  const dhi = Math.round(0.25 * arch.score + 0.25 * velo.score + 0.25 * morale.score + 0.25 * align.score);
  const bottlenecksCount = arch.primaryBottlenecks.length + velo.primaryBottlenecks.length + morale.primaryBottlenecks.length + align.primaryBottlenecks.length;
  const criticalHazardsCount = [arch, velo, morale, align].filter(d => d.severityLevel === 'critical_hazard' || d.severityLevel === 'high_vulnerability').length;

  return {
    architectureTechDebt: arch,
    deliveryVelocityIncidentCadence: velo,
    teamMoraleFlightRisks: morale,
    strategicProductEngineeringAlignment: align,
    diagnosticHealthIndex: dhi,
    identifiedBottlenecksCount: bottlenecksCount,
    criticalHazardsCount
  };
}

export function createDefaultExecutiveDiagnostics(): ExecutiveDiagnosticsDTO {
  return computeDiagnosticHealthIndex({
    architectureTechDebt: {
      score: 72,
      primaryBottlenecks: [
        'Monolithic deploy coupling between core billing and order processing',
        'Inadequate test coverage on legacy asynchronous message consumers'
      ],
      immediateMitigations: [
        'Decouple release pipelines using feature flags',
        'Establish contract tests for high-throughput queues'
      ],
      actionPlan: 'Deploy domain-driven service boundaries and enforce strict consumer-driven contract tests across Q3.'
    },
    deliveryVelocityIncidentCadence: {
      score: 68,
      primaryBottlenecks: [
        'Deployment frequency constrained to twice-weekly scheduled windows',
        'Mean time to recovery (MTTR) prolonged by fragmented distributed tracing'
      ],
      immediateMitigations: [
        'Automate canary rollout stages with automated rollback on error budget burn',
        'Consolidate OpenTelemetry instrumentation across primary gateway nodes'
      ],
      actionPlan: 'Migrate to continuous deployment with automated canary gates and unified OpenTelemetry APM dashboards.'
    },
    teamMoraleFlightRisks: {
      score: 75,
      primaryBottlenecks: [
        'High on-call fatigue within platform infrastructure squad',
        'Ambiguity in Staff-plus engineering career ladder and expectations'
      ],
      immediateMitigations: [
        'Rotate secondary on-call shadow schedule with explicit compensatory rest hours',
        'Draft dual IC/Management engineering matrix with executive sponsor alignment'
      ],
      actionPlan: 'Publish comprehensive technical career tracks and redistribute platform incident burdens via site reliability engineering rotations.'
    },
    strategicProductEngineeringAlignment: {
      score: 80,
      primaryBottlenecks: [
        'Quarterly roadmap estimates lack shared definition of technical debt headroom',
        'Engineering involvement occurs late in product discovery cycles'
      ],
      immediateMitigations: [
        'Institute bi-weekly engineering discovery pairing with Principal Product Managers',
        'Ringfence 20% capacity in sprint cadences dedicated to architectural hardening'
      ],
      actionPlan: 'Form joint product-engineering triads for all tier-1 initiatives and formalize SLA commitments on feature stabilization.'
    }
  });
}

export function computeTransitionMomentum(
  stakeholders: StakeholderDTO[],
  diagnostics: ExecutiveDiagnosticsDTO,
  milestones: OnboardingMilestoneDTO[],
  currentDay: number
): TransitionMomentumDTO {
  const { sri } = computeStakeholderRelationshipIndex(stakeholders);
  const dhi = diagnostics.diagnosticHealthIndex;

  const quickWins = milestones.filter(m => m.isQuickWin);
  const quickWinsTotal = quickWins.length;
  const quickWinsAchieved = quickWins.filter(m => m.status === 'achieved');
  const quickWinsDelivered = quickWinsAchieved.length;

  let quickWinDeliveryRate = 0;
  if (quickWinsTotal > 0) {
    const totalImpact = quickWins.reduce((acc, q) => acc + q.impactScore, 0);
    const achievedImpact = quickWinsAchieved.reduce((acc, q) => acc + q.impactScore, 0);
    quickWinDeliveryRate = totalImpact > 0 ? (achievedImpact / totalImpact) * 100 : (quickWinsDelivered / quickWinsTotal) * 100;
  } else if (milestones.length === 0) {
    quickWinDeliveryRate = 100;
  }

  const totalMilestones = milestones.length;
  const achievedMilestones = milestones.filter(m => m.status === 'achieved').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;

  const milestoneExecutionRate = totalMilestones > 0
    ? ((achievedMilestones + 0.5 * inProgressMilestones) / totalMilestones) * 100
    : 0;

  const actionPlansDefined = [
    diagnostics.architectureTechDebt.actionPlan,
    diagnostics.deliveryVelocityIncidentCadence.actionPlan,
    diagnostics.teamMoraleFlightRisks.actionPlan,
    diagnostics.strategicProductEngineeringAlignment.actionPlan
  ].filter(p => p && p.trim().length > 0).length;

  const actionPlansCoverageRate = (actionPlansDefined / 4) * 100;
  const diagnosticScore = 0.50 * dhi + 0.50 * actionPlansCoverageRate;

  const rawTmi = 0.30 * sri + 0.25 * quickWinDeliveryRate + 0.20 * diagnosticScore + 0.25 * milestoneExecutionRate;
  const transitionMomentumIndex = Math.min(100, Math.max(0, Math.round(rawTmi)));

  let tier: TransitionMomentumTier = 'at_risk';
  if (transitionMomentumIndex >= 85) tier = 'accelerating';
  else if (transitionMomentumIndex >= 70) tier = 'on_track';
  else if (transitionMomentumIndex >= 50) tier = 'lagging';

  return {
    transitionMomentumIndex,
    tier,
    stakeholderRelationshipIndex: sri,
    diagnosticHealthIndex: dhi,
    quickWinDeliveryRate: Math.round(quickWinDeliveryRate),
    milestoneExecutionRate: Math.round(milestoneExecutionRate),
    actionPlansCoverageRate: Math.round(actionPlansCoverageRate),
    currentDay,
    totalStakeholders: stakeholders.length,
    interviewedStakeholders: stakeholders.filter(s => s.status === 'completed').length,
    totalMilestones,
    achievedMilestones,
    quickWinsTotal,
    quickWinsDelivered
  };
}

export function generateExecutiveMemoMarkdown(
  memoType: ExecutiveMemoType,
  plan: ExecutiveOnboardingPlanDTO
): string {
  const { companyName, roleTitle, currentDay, executiveSponsorName, momentum, diagnostics, stakeholders, milestones } = plan;
  const completedInterviews = stakeholders.filter(s => s.status === 'completed');
  const quickWins = milestones.filter(m => m.isQuickWin);
  const achievedWins = quickWins.filter(m => m.status === 'achieved');

  if (memoType === 'day_30_listening_tour') {
    return `# EXECUTIVE MEMO: Day 30 Listening Tour Insights & Strategic Baseline

**To:** ${executiveSponsorName || 'Executive Leadership & Board'}
**From:** ${roleTitle}, ${companyName}
**Date:** Transition Day ${currentDay}
**Subject:** 30-Day Organizational Discovery, 360 Sentiment Synthesis & Immediate Quick-Wins
**Transition Momentum:** ${momentum.transitionMomentumIndex}% (${momentum.tier.toUpperCase()})

---

## 1. Executive Summary

Having concluded the initial 30-day listening tour, this memo synthesizes feedback across ${completedInterviews.length} structured stakeholder conversations, evaluates organizational health across 4 technical dimensions, and outlines high-leverage interventions for Days 31–60.

The **Stakeholder Relationship Index (SRI)** stands at **${momentum.stakeholderRelationshipIndex}/100**, and the baseline **Diagnostic Health Index (DHI)** is **${momentum.diagnosticHealthIndex}/100**.

---

## 2. Stakeholder Sentiment & 360 Alignment Matrix

| Cohort | Total Identified | Interviews Completed | Primary Organizational Friction |
|---|---|---|---|
| Executive Sponsor & Board | ${stakeholders.filter(s => s.category === 'executive_sponsor').length} | ${stakeholders.filter(s => s.category === 'executive_sponsor' && s.status === 'completed').length} | Alignment on R&D investment horizons |
| Cross-Functional Peers | ${stakeholders.filter(s => s.category === 'peer_executive').length} | ${stakeholders.filter(s => s.category === 'peer_executive' && s.status === 'completed').length} | Roadmap predictability and release confidence |
| Engineering Management | ${stakeholders.filter(s => s.category === 'direct_report').length} | ${stakeholders.filter(s => s.category === 'direct_report' && s.status === 'completed').length} | Incident load, on-call fatigue, technical debt |
| Staff & Principal Engineers | ${stakeholders.filter(s => s.category === 'staff_principal').length} | ${stakeholders.filter(s => s.category === 'staff_principal' && s.status === 'completed').length} | Architecture fragmentation, autonomy boundaries |
| Customer & Field Operations | ${stakeholders.filter(s => s.category === 'customer_ops').length} | ${stakeholders.filter(s => s.category === 'customer_ops' && s.status === 'completed').length} | Resolution cadence for enterprise-impacting escalations |

---

## 3. Four-Dimension Organizational Health Diagnosis

- **Architecture & Technical Debt (${diagnostics.architectureTechDebt.score}/100 - ${diagnostics.architectureTechDebt.severityLevel.toUpperCase()}):**
${diagnostics.architectureTechDebt.primaryBottlenecks.map(b => `  - ${b}`).join('\n')}
  *Immediate Mitigation:* ${diagnostics.architectureTechDebt.actionPlan || 'Establish architecture review council and debt remediation budget.'}

- **Delivery Velocity & Incident Cadence (${diagnostics.deliveryVelocityIncidentCadence.score}/100 - ${diagnostics.deliveryVelocityIncidentCadence.severityLevel.toUpperCase()}):**
${diagnostics.deliveryVelocityIncidentCadence.primaryBottlenecks.map(b => `  - ${b}`).join('\n')}
  *Immediate Mitigation:* ${diagnostics.deliveryVelocityIncidentCadence.actionPlan || 'Implement DORA metrics observability and automated post-mortems.'}

- **Team Morale & Flight Risks (${diagnostics.teamMoraleFlightRisks.score}/100 - ${diagnostics.teamMoraleFlightRisks.severityLevel.toUpperCase()}):**
${diagnostics.teamMoraleFlightRisks.primaryBottlenecks.map(b => `  - ${b}`).join('\n')}
  *Immediate Mitigation:* ${diagnostics.teamMoraleFlightRisks.actionPlan || 'Targeted 1-on-1 retention interventions for principal staff and EMs.'}

- **Strategic Product-Engineering Alignment (${diagnostics.strategicProductEngineeringAlignment.score}/100 - ${diagnostics.strategicProductEngineeringAlignment.severityLevel.toUpperCase()}):**
${diagnostics.strategicProductEngineeringAlignment.primaryBottlenecks.map(b => `  - ${b}`).join('\n')}
  *Immediate Mitigation:* ${diagnostics.strategicProductEngineeringAlignment.actionPlan || 'Co-author quarterly roadmap SLAs with Product Leadership.'}

---

## 4. Phase 2 Commitments: Days 31-60 Early Wins

- **Quick-Wins Committed:** ${quickWins.length}
- **Quick-Wins Delivered to Date:** ${achievedWins.length} (${momentum.quickWinDeliveryRate}%)
${quickWins.map(q => `- [${q.status === 'achieved' ? 'x' : ' '}] **${q.title}** (Target: Day ${q.targetDay}, Impact: ${q.impactScore}/10) - ${q.description}`).join('\n')}

---

*Submitted by ${roleTitle} via JobTrack Executive Transition Command Center.*`;
  }

  if (memoType === 'day_60_strategic_priorities') {
    return `# EXECUTIVE BRIEFING: Day 60 Strategic Priorities & Mid-Transition Momentum

**To:** ${executiveSponsorName || 'Board of Directors & Executive Staff'}
**From:** ${roleTitle}, ${companyName}
**Date:** Transition Day ${currentDay}
**Subject:** Mid-Transition Execution Velocity, Early ROI & Phase 3 Scaling Architecture
**Transition Momentum:** ${momentum.transitionMomentumIndex}% (${momentum.tier.toUpperCase()})

---

## 1. Mid-Point Transition State & ROI

At Day 60, the transition transitions from listening and diagnosis to active transformation. Early quick-wins have demonstrated tangible execution gains, improving team morale and restoring cross-functional confidence.

- **Transition Momentum Index (TMI):** **${momentum.transitionMomentumIndex}%**
- **Quick-Win Delivery Rate:** **${momentum.quickWinDeliveryRate}%** (${achievedWins.length}/${quickWins.length} completed)
- **Milestone Execution Rate:** **${momentum.milestoneExecutionRate}%**

---

## 2. Early Wins Delivered & Business Impact

${achievedWins.map(w => `### ${w.title} (Impact Rating: ${w.impactScore}/10)\n${w.description}\nDelivered on Day ${w.deliveredDay || w.targetDay}.`).join('\n\n')}

---

## 3. Core Architectural & Organizational Decisions

1. **Governance & Cadence:** Standardized bi-weekly cross-functional syncs with Product and Engineering managers.
2. **Incident Cadence Remediation:** Deployed SLA-driven blameless post-mortem framework.
3. **Talent Stabilization:** Confirmed retention commitments with critical principal contributors.

---

## 4. Phase 3 Objectives: Days 61-100 (Transform & Scale)

${milestones.filter(m => m.phase === 'phase_3_transform_scale').map(m => `- **Day ${m.targetDay}: ${m.title}** - ${m.description} (Status: ${m.status})`).join('\n')}

---

*Submitted by ${roleTitle} via JobTrack Executive Transition Command Center.*`;
  }

  return `# BOARD CHARTER: Day 100 Engineering Transformation Review & 1-Year Charter

**To:** Board of Directors & Chief Executive Officer
**From:** ${roleTitle}, ${companyName}
**Date:** Transition Day ${currentDay}
**Subject:** Comprehensive First 100-Day Transition Review & 1-Year Strategic Technology Roadmap
**Final Transition Score:** ${momentum.transitionMomentumIndex}% (${momentum.tier.toUpperCase()})

---

## 1. 100-Day Transition Command Center Final Scorecard

| Index / Metric | Day 1 Baseline | Day 100 Outcome | Status |
|---|---|---|---|
| Transition Momentum Index (TMI) | 0% | **${momentum.transitionMomentumIndex}%** | ${momentum.tier.toUpperCase()} |
| Stakeholder Relationship Index (SRI) | 0 | **${momentum.stakeholderRelationshipIndex}/100** | ${momentum.stakeholderRelationshipIndex >= 80 ? 'STRONG ALIGNMENT' : 'STABLE'} |
| Diagnostic Health Index (DHI) | 0 | **${momentum.diagnosticHealthIndex}/100** | IMPROVING |
| Quick-Wins Delivered | 0 / ${quickWins.length} | **${achievedWins.length} / ${quickWins.length}** | ${momentum.quickWinDeliveryRate}% |
| 100-Day Milestones Achieved | 0 / ${milestones.length} | **${milestones.filter(m => m.status === 'achieved').length} / ${milestones.length}** | ${momentum.milestoneExecutionRate}% |

---

## 2. Organizational Baseline vs Day 100 Transformation

- **Organizational Trust:** Concluded listening tours across all 5 key cohorts with ${completedInterviews.length} senior interviews completed.
- **Incident Cadence & Reliability:** Established predictable deployment rhythms and reduced unhandled escalations.
- **Strategic Alignment:** Unified roadmap planning between Product, Engineering, and Design.

---

## 3. 1-Year Strategic Technology & Organizational Charter

1. **Pillar 1: Modern Cloud-Native Foundation & CI/CD Parity**
2. **Pillar 2: Engineering Productivity, Developer Experience & DORA Excellence**
3. **Pillar 3: High-Performance Culture, Career Ladders & Technical Staff Development**

---

*Certified and Charter Approved by ${roleTitle}, ${companyName}.*`;
}

export function validateExecutiveOnboardingPlanInput(raw: unknown): ValidationResult<ExecutiveOnboardingPlanMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!d.companyName || typeof d.companyName !== 'string' || d.companyName.trim().length === 0) {
    errors.companyName = 'Company name is required';
  }
  if (!d.roleTitle || typeof d.roleTitle !== 'string' || d.roleTitle.trim().length === 0) {
    errors.roleTitle = 'Role title is required';
  }
  if (!d.startDate || typeof d.startDate !== 'string' || isNaN(Date.parse(d.startDate))) {
    errors.startDate = 'Valid start date is required (YYYY-MM-DD)';
  }
  if (typeof d.currentDay !== 'number' || d.currentDay < 1 || d.currentDay > 100) {
    errors.currentDay = 'Current day must be an integer between 1 and 100';
  }
  if (typeof d.executiveSponsorName !== 'string') {
    errors.executiveSponsorName = 'Executive sponsor name must be a string';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for executive onboarding plan input',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof d.applicationId === 'string' ? d.applicationId : null,
      companyName: (d.companyName as string).trim(),
      roleTitle: (d.roleTitle as string).trim(),
      startDate: (d.startDate as string).trim(),
      currentDay: Math.round(d.currentDay as number),
      executiveSponsorName: ((d.executiveSponsorName as string) || '').trim()
    }
  };
}

export function validateStakeholderInput(raw: unknown): ValidationResult<StakeholderMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!d.name || typeof d.name !== 'string' || d.name.trim().length === 0) {
    errors.name = 'Stakeholder name is required';
  }
  if (!d.roleTitle || typeof d.roleTitle !== 'string' || d.roleTitle.trim().length === 0) {
    errors.roleTitle = 'Role title is required';
  }

  const validCategories: StakeholderCategory[] = [
    'executive_sponsor',
    'peer_executive',
    'direct_report',
    'staff_principal',
    'customer_ops'
  ];
  if (!validCategories.includes(d.category as StakeholderCategory)) {
    errors.category = `Category must be one of: ${validCategories.join(', ')}`;
  }

  if (typeof d.sentimentScore !== 'number' || d.sentimentScore < 1 || d.sentimentScore > 5) {
    errors.sentimentScore = 'Sentiment score must be between 1 and 5';
  }

  const validStatuses: StakeholderInterviewStatus[] = ['identified', 'scheduled', 'completed', 'deferred'];
  if (!validStatuses.includes(d.status as StakeholderInterviewStatus)) {
    errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
  }

  const validAlignments: AlignmentLevel[] = ['strongly_aligned', 'partially_aligned', 'misaligned'];
  if (!validAlignments.includes(d.alignmentLevel as AlignmentLevel)) {
    errors.alignmentLevel = `Alignment level must be one of: ${validAlignments.join(', ')}`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for stakeholder input',
      errors
    };
  }

  return {
    ok: true,
    data: {
      name: (d.name as string).trim(),
      roleTitle: (d.roleTitle as string).trim(),
      category: d.category as StakeholderCategory,
      expectations: typeof d.expectations === 'string' ? d.expectations.trim() : '',
      painPoints: typeof d.painPoints === 'string' ? d.painPoints.trim() : '',
      politicalDynamics: typeof d.politicalDynamics === 'string' ? d.politicalDynamics.trim() : '',
      sentimentScore: Math.round(d.sentimentScore as number),
      interviewDate: typeof d.interviewDate === 'string' ? d.interviewDate.trim() : null,
      status: d.status as StakeholderInterviewStatus,
      alignmentLevel: d.alignmentLevel as AlignmentLevel
    }
  };
}

export function validateMilestoneInput(raw: unknown): ValidationResult<OnboardingMilestoneMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validPhases: MilestonePhaseKey[] = [
    'phase_1_listen_align',
    'phase_2_synthesize_wins',
    'phase_3_transform_scale'
  ];
  if (!validPhases.includes(d.phase as MilestonePhaseKey)) {
    errors.phase = `Phase must be one of: ${validPhases.join(', ')}`;
  }

  if (!d.title || typeof d.title !== 'string' || d.title.trim().length === 0) {
    errors.title = 'Milestone title is required';
  }

  if (typeof d.targetDay !== 'number' || d.targetDay < 1 || d.targetDay > 100) {
    errors.targetDay = 'Target day must be an integer between 1 and 100';
  }

  const validStatuses: OnboardingMilestoneStatus[] = ['planned', 'in_progress', 'achieved', 'blocked'];
  if (!validStatuses.includes(d.status as OnboardingMilestoneStatus)) {
    errors.status = `Status must be one of: ${validStatuses.join(', ')}`;
  }

  if (typeof d.impactScore !== 'number' || d.impactScore < 1 || d.impactScore > 10) {
    errors.impactScore = 'Impact score must be an integer between 1 and 10';
  }

  if (typeof d.deliveryEstimateDays !== 'number' || d.deliveryEstimateDays < 1) {
    errors.deliveryEstimateDays = 'Delivery estimate days must be at least 1';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for milestone input',
      errors
    };
  }

  return {
    ok: true,
    data: {
      phase: d.phase as MilestonePhaseKey,
      title: (d.title as string).trim(),
      description: typeof d.description === 'string' ? d.description.trim() : '',
      targetDay: Math.round(d.targetDay as number),
      deliveredDay: typeof d.deliveredDay === 'number' ? Math.round(d.deliveredDay) : null,
      status: d.status as OnboardingMilestoneStatus,
      isQuickWin: Boolean(d.isQuickWin),
      deliveryEstimateDays: Math.round(d.deliveryEstimateDays as number),
      impactScore: Math.round(d.impactScore as number),
      blockerReason: typeof d.blockerReason === 'string' ? d.blockerReason.trim() : null
    }
  };
}

export function validateDiagnosticsInput(raw: unknown): ValidationResult<ExecutiveDiagnosticsMutationDTO> {
  if (!raw || typeof raw !== 'object') {
    return {
      ok: false,
      message: 'Invalid payload: expected object',
      errors: { root: 'Payload must be an object' }
    };
  }

  const d = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const dimensions = [
    'architectureTechDebt',
    'deliveryVelocityIncidentCadence',
    'teamMoraleFlightRisks',
    'strategicProductEngineeringAlignment'
  ];

  for (const dim of dimensions) {
    const obj = d[dim];
    if (!obj || typeof obj !== 'object') {
      errors[dim] = `${dim} details are required`;
      continue;
    }
    const inner = obj as Record<string, unknown>;
    if (typeof inner.score !== 'number' || inner.score < 0 || inner.score > 100) {
      errors[`${dim}.score`] = 'Score must be between 0 and 100';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Validation failed for executive diagnostics input',
      errors
    };
  }

  const sanitizeDim = (obj: unknown) => {
    const inner = (obj || {}) as Record<string, unknown>;
    return {
      score: Math.min(100, Math.max(0, Math.round(Number(inner.score) || 0))),
      primaryBottlenecks: Array.isArray(inner.primaryBottlenecks) ? inner.primaryBottlenecks.map(String) : [],
      immediateMitigations: Array.isArray(inner.immediateMitigations) ? inner.immediateMitigations.map(String) : [],
      actionPlan: typeof inner.actionPlan === 'string' ? inner.actionPlan.trim() : ''
    };
  };

  return {
    ok: true,
    data: {
      architectureTechDebt: sanitizeDim(d.architectureTechDebt),
      deliveryVelocityIncidentCadence: sanitizeDim(d.deliveryVelocityIncidentCadence),
      teamMoraleFlightRisks: sanitizeDim(d.teamMoraleFlightRisks),
      strategicProductEngineeringAlignment: sanitizeDim(d.strategicProductEngineeringAlignment)
    }
  };
}
