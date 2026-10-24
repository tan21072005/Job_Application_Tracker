import type { ValidationResult } from './validators.ts';

export type ReferenceArchetype =
  | 'superior_sponsor'
  | 'direct_report'
  | 'cross_functional_peer'
  | 'external_stakeholder';

export type EndorsementStrength =
  | 'unconditional_champion'
  | 'strong_advocate'
  | 'neutral_factual'
  | 'risk_adverse';

export type ExecutiveCompetencyKey =
  | 'scaling_0_to_1'
  | 'turnaround_restructuring'
  | 'crisis_incident_response'
  | 'board_governance'
  | 'people_leadership'
  | 'cross_functional_synergy';

export type NetworkOverlapDegree =
  | 'first_degree'
  | 'second_degree'
  | 'third_degree';

export type SentimentRiskTier =
  | 'champion'
  | 'neutral'
  | 'adverse_risk';

export type VulnerabilityLevel =
  | 'low_risk'
  | 'moderate_risk'
  | 'high_exposure'
  | 'critical_backchannel_danger';

export type TransitionFrictionType =
  | 'mass_layoff_restructuring'
  | 'acquisition_shutdown'
  | 'founder_misalignment'
  | 'abrupt_executive_exit'
  | 'culture_clash';

export interface ReferenceAdvocateDTO {
  id: string;
  userId?: string;
  fullName: string;
  currentTitle: string;
  currentCompany: string;
  relationshipArchetype: ReferenceArchetype;
  sharedCompany: string;
  sharedTenureStart: string;
  sharedTenureEnd: string;
  sharedTenureMonths: number;
  projectsCoDelivered: string[];
  endorsementStrength: EndorsementStrength;
  vouchedCompetencies: ExecutiveCompetencyKey[];
  email: string;
  phone?: string;
  linkedinUrl?: string;
  preferredChannel: 'email' | 'phone' | 'linkedin' | 'signal';
  ndaRestricted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceAdvocateMutationDTO {
  fullName: string;
  currentTitle: string;
  currentCompany: string;
  relationshipArchetype: ReferenceArchetype;
  sharedCompany: string;
  sharedTenureStart: string;
  sharedTenureEnd: string;
  sharedTenureMonths: number;
  projectsCoDelivered: string[];
  endorsementStrength: EndorsementStrength;
  vouchedCompetencies: ExecutiveCompetencyKey[];
  email: string;
  phone?: string;
  linkedinUrl?: string;
  preferredChannel: 'email' | 'phone' | 'linkedin' | 'signal';
  ndaRestricted: boolean;
  notes?: string;
}

export interface TargetStakeholderNodeDTO {
  id: string;
  fullName: string;
  role: string;
  organization: string;
  isDecisionMaker: boolean;
  networkOverlapDegree: NetworkOverlapDegree;
  mutualCompanies: string[];
  mutualTenureOverlapMonths: number;
  potentialBackchannelIntermediaries: string[];
  predictedSentiment: SentimentRiskTier;
  probabilityScore: number;
  rationale: string;
}

export interface CompetencyCoverageCellDTO {
  competency: ExecutiveCompetencyKey;
  label: string;
  requiredByTargetRole: boolean;
  advocateIds: string[];
  advocateCount: number;
  coverageStatus: 'optimal' | 'adequate' | 'vulnerable' | 'uncovered';
  gapWarning?: string;
}

export interface Backchannel360CoverageMatrixDTO {
  totalAdvocates: number;
  archetypeCounts: Record<ReferenceArchetype, number>;
  missingArchetypes: ReferenceArchetype[];
  competencyCoverages: CompetencyCoverageCellDTO[];
  overallReadinessScore: number;
  criticalGaps: string[];
}

export interface RefereeBriefingPacketDTO {
  id: string;
  advocateId: string;
  advocateName: string;
  advocateArchetype: ReferenceArchetype;
  applicationId?: string | null;
  targetCompany: string;
  targetRole: string;
  hiringManagerProfile?: string;
  companyMission: string;
  roleStrategicPainPoints: string[];
  candidateKeyNarrative: string;
  priorityProjectsToHighlight: {
    projectName: string;
    context: string;
    metricImpact: string;
  }[];
  anticipatedProbingQuestions: {
    question: string;
    suggestedPivot: string;
  }[];
  doNotDiscloseTopics: string[];
  formattedMarkdown: string;
  generatedAt: string;
}

export interface CareerTransitionRiskDTO {
  id: string;
  frictionType: TransitionFrictionType;
  company: string;
  timeframe: string;
  candidateContext: string;
  framingNarrative: string;
  defensibleFacts: string[];
  refereeAlignmentScript: string;
  proactiveReframing: string;
}

export interface BackchannelAuditDTO {
  id: string;
  userId?: string;
  applicationId?: string | null;
  auditName: string;
  targetCompany: string;
  targetRole: string;
  advocateIds: string[];
  stakeholders: TargetStakeholderNodeDTO[];
  coverageMatrix: Backchannel360CoverageMatrixDTO;
  risks: CareerTransitionRiskDTO[];
  briefings: RefereeBriefingPacketDTO[];
  overallBackchannelVulnerabilityIndex: number;
  vulnerabilityLevel: VulnerabilityLevel;
  strategicRecommendations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BackchannelAuditMutationDTO {
  applicationId?: string | null;
  auditName: string;
  targetCompany: string;
  targetRole: string;
  advocateIds: string[];
  stakeholders: TargetStakeholderNodeDTO[];
  risks: CareerTransitionRiskDTO[];
  requiredCompetencies?: ExecutiveCompetencyKey[];
}

export const EXECUTIVE_COMPETENCY_LABELS: Record<ExecutiveCompetencyKey, string> = {
  scaling_0_to_1: '0->1 Architecture & Product-Market Fit',
  turnaround_restructuring: 'Org Turnaround & Cost Rationalization',
  crisis_incident_response: 'P0 Incident Response & Crisis Leadership',
  board_governance: 'Board Presentations & Fiduciary Stewardship',
  people_leadership: 'Talent Magnetism, Hiring & Retention',
  cross_functional_synergy: 'Cross-Functional Execution (Product/Tech/GTM)'
};

export const ARCHETYPE_LABELS: Record<ReferenceArchetype, string> = {
  superior_sponsor: 'Superior / Executive Sponsor',
  direct_report: 'Direct Report / Mentee',
  cross_functional_peer: 'Cross-Functional Peer',
  external_stakeholder: 'External Stakeholder / Investor'
};

export function calculateBackchannelProbability(
  stakeholder: Omit<TargetStakeholderNodeDTO, 'probabilityScore' | 'rationale'>
): { probabilityScore: number; rationale: string } {
  let baseScore = 10;
  if (stakeholder.networkOverlapDegree === 'first_degree') {
    baseScore = 50;
  } else if (stakeholder.networkOverlapDegree === 'second_degree') {
    baseScore = 28;
  }

  const companyBonus = Math.min(stakeholder.mutualCompanies.length * 15, 30);
  const tenureRatio = Math.min(0.60 + stakeholder.mutualTenureOverlapMonths / 36, 1.25);

  let roleMultiplier = 1.0;
  if (stakeholder.isDecisionMaker) {
    roleMultiplier *= 1.15;
  }

  const raw = (baseScore + companyBonus) * tenureRatio * roleMultiplier;
  const probabilityScore = Math.round(Math.max(5, Math.min(98, raw)));

  const reasons: string[] = [];
  if (stakeholder.networkOverlapDegree === 'first_degree') {
    reasons.push('1st-degree mutual network connection');
  } else if (stakeholder.networkOverlapDegree === 'second_degree') {
    reasons.push('2nd-degree executive network path');
  }
  if (stakeholder.mutualCompanies.length > 0) {
    reasons.push(`${stakeholder.mutualCompanies.length} shared historical employers`);
  }
  if (stakeholder.mutualTenureOverlapMonths >= 12) {
    reasons.push(`${stakeholder.mutualTenureOverlapMonths} months aligned tenure`);
  }
  if (stakeholder.isDecisionMaker) {
    reasons.push('Primary hiring decision-maker');
  }

  return {
    probabilityScore,
    rationale: reasons.join('; ') || 'Ecosystem proximity'
  };
}

export function compute360CoverageMatrix(
  advocates: ReferenceAdvocateDTO[],
  requiredCompetencies: ExecutiveCompetencyKey[] = [
    'scaling_0_to_1',
    'turnaround_restructuring',
    'crisis_incident_response',
    'board_governance',
    'people_leadership',
    'cross_functional_synergy'
  ]
): Backchannel360CoverageMatrixDTO {
  const archetypeCounts: Record<ReferenceArchetype, number> = {
    superior_sponsor: 0,
    direct_report: 0,
    cross_functional_peer: 0,
    external_stakeholder: 0
  };

  for (const adv of advocates) {
    if (archetypeCounts[adv.relationshipArchetype] !== undefined) {
      archetypeCounts[adv.relationshipArchetype]++;
    }
  }

  const missingArchetypes: ReferenceArchetype[] = [];
  if (archetypeCounts.superior_sponsor === 0) missingArchetypes.push('superior_sponsor');
  if (archetypeCounts.direct_report === 0) missingArchetypes.push('direct_report');
  if (archetypeCounts.cross_functional_peer === 0) missingArchetypes.push('cross_functional_peer');

  const allCompetencies: ExecutiveCompetencyKey[] = [
    'scaling_0_to_1',
    'turnaround_restructuring',
    'crisis_incident_response',
    'board_governance',
    'people_leadership',
    'cross_functional_synergy'
  ];

  const competencyCoverages: CompetencyCoverageCellDTO[] = allCompetencies.map(comp => {
    const matchingAdvocates = advocates.filter(a => a.vouchedCompetencies.includes(comp));
    const count = matchingAdvocates.length;
    const isRequired = requiredCompetencies.includes(comp);

    let coverageStatus: 'optimal' | 'adequate' | 'vulnerable' | 'uncovered' = 'uncovered';
    let gapWarning: string | undefined;

    if (count >= 2) {
      coverageStatus = 'optimal';
    } else if (count === 1) {
      coverageStatus = 'adequate';
    } else if (isRequired) {
      coverageStatus = 'vulnerable';
      gapWarning = `Critical target requirement ${EXECUTIVE_COMPETENCY_LABELS[comp]} lacks verified advocate endorsement.`;
    } else {
      coverageStatus = 'uncovered';
    }

    return {
      competency: comp,
      label: EXECUTIVE_COMPETENCY_LABELS[comp],
      requiredByTargetRole: isRequired,
      advocateIds: matchingAdvocates.map(a => a.id),
      advocateCount: count,
      coverageStatus,
      gapWarning
    };
  });

  const criticalGaps: string[] = [];
  if (archetypeCounts.direct_report === 0) {
    criticalGaps.push('Missing Direct-Report Referee: Management empathy and talent retention cannot be verified by subordinates.');
  }
  if (archetypeCounts.superior_sponsor === 0) {
    criticalGaps.push('Missing Executive Sponsor: Board reporting, fiscal discipline, and strategic ownership unverified.');
  }
  if (archetypeCounts.cross_functional_peer === 0) {
    criticalGaps.push('Missing Cross-Functional Peer: Product-Engineering collaboration and cross-silo synergy unvalidated.');
  }

  for (const cell of competencyCoverages) {
    if (cell.gapWarning) {
      criticalGaps.push(cell.gapWarning);
    }
  }

  const archetypeScore = ((4 - missingArchetypes.length) / 4) * 40;
  const coveredComps = competencyCoverages.filter(c => c.advocateCount > 0).length;
  const compScore = (coveredComps / 6) * 60;
  const overallReadinessScore = Math.round(archetypeScore + compScore);

  return {
    totalAdvocates: advocates.length,
    archetypeCounts,
    missingArchetypes,
    competencyCoverages,
    overallReadinessScore,
    criticalGaps
  };
}

export function computeAuditVulnerabilityIndex(
  stakeholders: TargetStakeholderNodeDTO[]
): { vulnerabilityIndex: number; level: VulnerabilityLevel; recommendations: string[] } {
  if (stakeholders.length === 0) {
    return {
      vulnerabilityIndex: 0,
      level: 'low_risk',
      recommendations: ['No external stakeholders mapped yet. Add target leadership to evaluate backchannel exposure.']
    };
  }

  let weightedRiskSum = 0;
  for (const s of stakeholders) {
    let weight = 0.6;
    if (s.predictedSentiment === 'adverse_risk') {
      weight = 1.35;
    } else if (s.predictedSentiment === 'champion') {
      weight = -0.4;
    }
    const nodeRisk = Math.max(0, (s.probabilityScore / 100) * weight * 100);
    weightedRiskSum += nodeRisk;
  }

  const rawIndex = weightedRiskSum / stakeholders.length;
  const vulnerabilityIndex = Math.round(Math.max(0, Math.min(100, rawIndex)));

  let level: VulnerabilityLevel = 'low_risk';
  const recommendations: string[] = [];

  if (vulnerabilityIndex >= 75) {
    level = 'critical_backchannel_danger';
    recommendations.push('Immediate Action: Multiple high-probability adverse or unaligned backchannel paths detected.');
    recommendations.push('Deploy proactive executive sponsor references ahead of formal interviews to anchor candidate narrative.');
    recommendations.push('Harmonize past transition talk-tracks across all official referees.');
  } else if (vulnerabilityIndex >= 50) {
    level = 'high_exposure';
    recommendations.push('Noticeable network overlap with neutral hiring authorities; equip cross-functional references with specific metric-backed wins.');
    recommendations.push('Pre-brief your former VP or CEO on expected probing calls from target board members.');
  } else if (vulnerabilityIndex >= 25) {
    level = 'moderate_risk';
    recommendations.push('Standard executive overlap profile. Ensure direct-report references are prepped on team retention metrics.');
  } else {
    level = 'low_risk';
    recommendations.push('Strong reference positioning with high champion sentiment across key nodes.');
  }

  return {
    vulnerabilityIndex,
    level,
    recommendations
  };
}

export function generateRefereeBriefingPacketMarkdown(
  advocate: ReferenceAdvocateDTO,
  audit: {
    targetCompany: string;
    targetRole: string;
    applicationId?: string | null;
  }
): RefereeBriefingPacketDTO {
  const id = `briefing-${advocate.id}-${Date.now()}`;
  const now = new Date().toISOString();

  const formattedMarkdown = [
    `# Executive Reference Briefing Packet`,
    `**Candidate**: Executive Candidate`,
    `**Referee**: ${advocate.fullName} (${advocate.currentTitle} @ ${advocate.currentCompany})`,
    `**Relationship Archetype**: ${ARCHETYPE_LABELS[advocate.relationshipArchetype]}`,
    `**Target Opportunity**: ${audit.targetRole} @ ${audit.targetCompany}`,
    `**Date**: ${now.slice(0, 10)}`,
    ``,
    `---`,
    ``,
    `## 1. Executive Opportunity Context`,
    `- **Company**: ${audit.targetCompany}`,
    `- **Target Mandate**: ${audit.targetRole}`,
    `- **Core Business Mission**: Lead end-to-end technical scaling, team expansion, and architectural governance.`,
    ``,
    `## 2. Core Candidate Positioning Narrative`,
    `- Proven leadership track record delivering high-throughput platforms and scaling engineering organizations.`,
    `- Deep competence in ${advocate.vouchedCompetencies.map(c => EXECUTIVE_COMPETENCY_LABELS[c]).join(', ')}.`,
    `- Collaborative, transparent partner with zero tolerance for toxic culture or technical stagnation.`,
    ``,
    `## 3. Co-Delivered Projects & Key Metrics to Emphasize`,
    ...advocate.projectsCoDelivered.map(p => `- **${p}**: Emphasize architectural rigor, cross-functional alignment, and on-time delivery.`),
    ``,
    `## 4. Anticipated Backchannel Probing Questions & Suggested Alignment`,
    `- **Q: How does the candidate handle extreme technical ambiguity or production outages?**`,
    `  *Pivot*: Highlight calm, blameless post-mortem culture and systematic root-cause remediation.`,
    `- **Q: What was the candidate's relationship with product management and business peers?**`,
    `  *Pivot*: Emphasize data-driven prioritization, shared OKRs, and business revenue alignment.`,
    `- **Q: How does the candidate manage retention and leadership development?**`,
    `  *Pivot*: Note strong voluntary retention rate and internal promotion record.`,
    ``,
    `## 5. Topics to Strictly Avoid / Non-Disclosure Guardrails`,
    `- Do not disclose confidential board deliberations or non-public M&A discussions from ${advocate.sharedCompany}.`,
    `- Avoid speculative comments regarding past organizational restructurings; adhere strictly to macro business realities.`,
    ``,
    `---`,
    `*Generated confidentially by JobTrack Executive Reference Engine*`
  ].join('\n');

  return {
    id,
    advocateId: advocate.id,
    advocateName: advocate.fullName,
    advocateArchetype: advocate.relationshipArchetype,
    applicationId: audit.applicationId,
    targetCompany: audit.targetCompany,
    targetRole: audit.targetRole,
    companyMission: `Lead technical scaling and engineering velocity at ${audit.targetCompany}`,
    roleStrategicPainPoints: [
      'Rapid scaling of distributed engineering teams',
      'Modernizing legacy architecture while maintaining 99.99% uptime',
      'Bridge product velocity with engineering quality'
    ],
    candidateKeyNarrative: 'Transformational engineering leader balancing business acumen with architectural rigor.',
    priorityProjectsToHighlight: advocate.projectsCoDelivered.map(p => ({
      projectName: p,
      context: `Co-executed during shared tenure at ${advocate.sharedCompany}`,
      metricImpact: 'Scaled throughput 3x, reduced P99 latency by 45%'
    })),
    anticipatedProbingQuestions: [
      {
        question: 'How did the candidate manage technical trade-offs under high delivery pressure?',
        suggestedPivot: 'Highlight structured RFC reviews and disciplined debt management.'
      },
      {
        question: 'Why did the candidate depart their previous executive post?',
        suggestedPivot: 'Frame as a natural career evolution following successful completion of company milestones.'
      }
    ],
    doNotDiscloseTopics: [
      'Unannounced strategic IP or trade secrets',
      'Confidential severance terms or personnel conflicts'
    ],
    formattedMarkdown,
    generatedAt: now
  };
}

export function validateReferenceAdvocateInput(
  raw: unknown
): ValidationResult<ReferenceAdvocateMutationDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Du lieu nguoi bao chung khong hop le.',
      errors: { input: 'Phai la doi tuong JSON hop le.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const fullName = typeof b.fullName === 'string' ? b.fullName.trim() : '';
  if (!fullName) errors.fullName = 'Ho ten nguoi bao chung la bat buoc.';

  const currentTitle = typeof b.currentTitle === 'string' ? b.currentTitle.trim() : '';
  if (!currentTitle) errors.currentTitle = 'Chuc danh hien tai la bat buoc.';

  const currentCompany = typeof b.currentCompany === 'string' ? b.currentCompany.trim() : '';
  if (!currentCompany) errors.currentCompany = 'Cong ty hien tai la bat buoc.';

  const archetypes: ReferenceArchetype[] = [
    'superior_sponsor',
    'direct_report',
    'cross_functional_peer',
    'external_stakeholder'
  ];
  const relationshipArchetype = typeof b.relationshipArchetype === 'string' && archetypes.includes(b.relationshipArchetype as ReferenceArchetype)
    ? (b.relationshipArchetype as ReferenceArchetype)
    : 'superior_sponsor';

  const sharedCompany = typeof b.sharedCompany === 'string' ? b.sharedCompany.trim() : '';
  if (!sharedCompany) errors.sharedCompany = 'Cong ty cung cong tac la bat buoc.';

  const sharedTenureStart = typeof b.sharedTenureStart === 'string' ? b.sharedTenureStart.trim() : '2020-01';
  const sharedTenureEnd = typeof b.sharedTenureEnd === 'string' ? b.sharedTenureEnd.trim() : '2023-01';
  const sharedTenureMonths = typeof b.sharedTenureMonths === 'number' && b.sharedTenureMonths >= 0 ? b.sharedTenureMonths : 12;

  const projectsCoDelivered = Array.isArray(b.projectsCoDelivered)
    ? b.projectsCoDelivered.map(p => String(p).trim()).filter(Boolean)
    : [];

  const strengths: EndorsementStrength[] = [
    'unconditional_champion',
    'strong_advocate',
    'neutral_factual',
    'risk_adverse'
  ];
  const endorsementStrength = typeof b.endorsementStrength === 'string' && strengths.includes(b.endorsementStrength as EndorsementStrength)
    ? (b.endorsementStrength as EndorsementStrength)
    : 'strong_advocate';

  const validCompetencies: ExecutiveCompetencyKey[] = [
    'scaling_0_to_1',
    'turnaround_restructuring',
    'crisis_incident_response',
    'board_governance',
    'people_leadership',
    'cross_functional_synergy'
  ];
  const vouchedCompetencies = Array.isArray(b.vouchedCompetencies)
    ? (b.vouchedCompetencies as ExecutiveCompetencyKey[]).filter(c => validCompetencies.includes(c))
    : [];

  const email = typeof b.email === 'string' ? b.email.trim() : '';
  if (!email || !email.includes('@')) errors.email = 'Email lien he hop le la bat buoc.';

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Loi xac thuc thong tin nguoi bao chung.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      currentTitle,
      currentCompany,
      relationshipArchetype,
      sharedCompany,
      sharedTenureStart,
      sharedTenureEnd,
      sharedTenureMonths,
      projectsCoDelivered,
      endorsementStrength,
      vouchedCompetencies,
      email,
      phone: typeof b.phone === 'string' ? b.phone.trim() : undefined,
      linkedinUrl: typeof b.linkedinUrl === 'string' ? b.linkedinUrl.trim() : undefined,
      preferredChannel: (['email', 'phone', 'linkedin', 'signal'].includes(String(b.preferredChannel)) ? b.preferredChannel : 'email') as any,
      ndaRestricted: Boolean(b.ndaRestricted),
      notes: typeof b.notes === 'string' ? b.notes.trim() : undefined
    }
  };
}

export function validateBackchannelAuditInput(
  raw: unknown
): ValidationResult<BackchannelAuditMutationDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Du lieu kiem toan backchannel khong hop le.',
      errors: { input: 'Phai la doi tuong JSON hop le.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const auditName = typeof b.auditName === 'string' ? b.auditName.trim() : '';
  if (!auditName) errors.auditName = 'Ten dot kiem toan la bat buoc.';

  const targetCompany = typeof b.targetCompany === 'string' ? b.targetCompany.trim() : '';
  if (!targetCompany) errors.targetCompany = 'Cong ty muc tieu la bat buoc.';

  const targetRole = typeof b.targetRole === 'string' ? b.targetRole.trim() : '';
  if (!targetRole) errors.targetRole = 'Vi tri muc tieu la bat buoc.';

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Loi xac thuc kiem toan backchannel.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof b.applicationId === 'string' ? b.applicationId : null,
      auditName,
      targetCompany,
      targetRole,
      advocateIds: Array.isArray(b.advocateIds) ? b.advocateIds.map(String) : [],
      stakeholders: Array.isArray(b.stakeholders) ? (b.stakeholders as TargetStakeholderNodeDTO[]) : [],
      risks: Array.isArray(b.risks) ? (b.risks as CareerTransitionRiskDTO[]) : [],
      requiredCompetencies: Array.isArray(b.requiredCompetencies) ? (b.requiredCompetencies as ExecutiveCompetencyKey[]) : undefined
    }
  };
}
