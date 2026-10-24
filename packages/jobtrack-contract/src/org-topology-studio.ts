export type TeamTopologyType =
  | 'stream_aligned'
  | 'enabling'
  | 'complicated_subsystem'
  | 'platform';

export type TeamInteractionMode =
  | 'collaboration'
  | 'x_as_a_service'
  | 'facilitating';

export type CognitiveLoadStatus =
  | 'healthy_flow'
  | 'optimal_sustainable'
  | 'saturation_warning'
  | 'cognitive_overload';

export type CareerTrack = 'individual_contributor' | 'management';

export type EngineeringLevel =
  | 'IC1'
  | 'IC2'
  | 'IC3'
  | 'IC4'
  | 'IC5'
  | 'IC6'
  | 'IC7'
  | 'IC8'
  | 'EM1'
  | 'EM2'
  | 'EM3'
  | 'EM4'
  | 'EM5';

export type SpanHealthStatus =
  | 'optimal'
  | 'under_span_micro_team'
  | 'over_span_overload'
  | 'critical_bottleneck';

export type ReorgStatus =
  | 'draft'
  | 'under_review'
  | 'board_approved'
  | 'implemented'
  | 'archived';

export interface TeamInteractionDTO {
  targetTeamId: string;
  targetTeamName: string;
  interactionMode: TeamInteractionMode;
  purpose: string;
  weeklySyncHours: number;
}

export interface ServiceOwnershipDTO {
  serviceId: string;
  serviceName: string;
  tier: 'tier_1_mission_critical' | 'tier_2_business_critical' | 'tier_3_supporting';
  linesOfCode: number;
  deploymentFrequencyPerWeek: number;
  monthlyP1Incidents: number;
}

export interface TeamTopologyDTO {
  id: string;
  planId: string;
  name: string;
  type: TeamTopologyType;
  missionStatement: string;
  leadEngineerId?: string;
  leadEngineerName?: string;
  headcount: number;
  domainComplexity: number;
  operationalToilPercentage: number;
  weeklyIncidentAlertCount: number;
  ownedServices: ServiceOwnershipDTO[];
  interactions: TeamInteractionDTO[];
  cognitiveLoadIndex: number;
  cognitiveLoadStatus: CognitiveLoadStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TeamTopologyMutationDTO {
  name: string;
  type: TeamTopologyType;
  missionStatement: string;
  leadEngineerId?: string;
  headcount: number;
  domainComplexity: number;
  operationalToilPercentage: number;
  weeklyIncidentAlertCount: number;
  ownedServices?: ServiceOwnershipDTO[];
  interactions?: TeamInteractionDTO[];
}

export interface OrgNodeDTO {
  id: string;
  employeeName: string;
  jobTitle: string;
  level: EngineeringLevel;
  track: CareerTrack;
  managerId: string | null;
  teamId: string | null;
  teamName: string | null;
  directReportsCount: number;
  totalSubordinatesCount: number;
  spanHealth: SpanHealthStatus;
  annualBaseSalary: number;
  annualTargetBonus: number;
  unvestedEquityValue: number;
  tenureMonths: number;
  tenureAtLevelMonths: number;
  flightRiskIndex: number;
}

export interface HierarchyHealthMetricsDTO {
  totalHeadcount: number;
  totalManagers: number;
  totalIndividualContributors: number;
  organizationDepth: number;
  optimalDepth: number;
  depthExcessPenalty: number;
  averageSpanOfControl: number;
  microTeamsCount: number;
  overloadedManagersCount: number;
  compositeHierarchyHealthScore: number;
}

export interface CompensationBandDTO {
  level: EngineeringLevel;
  track: CareerTrack;
  radfordP50Base: number;
  radfordP75Base: number;
  radfordP90Base: number;
  targetBonusPercentage: number;
  annualEquityGrantBenchmark: number;
  medianPromotionVelocityMonths: number;
}

export interface LevelingDistributionDTO {
  level: EngineeringLevel;
  headcount: number;
  percentageOfTotal: number;
  averageCompensation: number;
  averageCompaRatio: number;
  highFlightRiskCount: number;
}

export interface CareerLadderMatrixDTO {
  bands: CompensationBandDTO[];
  distributions: LevelingDistributionDTO[];
  totalEquityGrantLiability: number;
  totalAnnualPayrollBase: number;
}

export interface HiringPlanItemDTO {
  id: string;
  targetQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  teamId: string;
  level: EngineeringLevel;
  roleTitle: string;
  plannedStartDate: string;
  annualBaseSalary: number;
  recruitingFeeAmortized: number;
  rampDurationDays: number;
}

export interface QuarterlyCapacityForecastDTO {
  quarter: string;
  startingHeadcount: number;
  newHiresCount: number;
  attritionCount: number;
  endingHeadcount: number;
  rawHeadcountCapacityUnits: number;
  effectiveCapacityUnits: number;
  mentorshipDragLossUnits: number;
  quarterlyFullyBurdenedCost: number;
  cloudInfrastructureAllocatedCost: number;
  totalQuarterlyRnDBudget: number;
}

export interface CapacityRampEconomicsDTO {
  burdenMultiplier: number;
  annualBudgetCeiling: number;
  projectedTotalAnnualSpend: number;
  quarterlyForecasts: QuarterlyCapacityForecastDTO[];
  hiringPlan: HiringPlanItemDTO[];
}

export interface ServiceDependencyEdgeDTO {
  sourceServiceId: string;
  sourceServiceName: string;
  targetServiceId: string;
  targetServiceName: string;
  callVolumeWeekly: number;
  isSynchronousRestOrGrpc: boolean;
  crossesTeamBoundary: boolean;
  interactionFrictionCoefficient: number;
}

export interface ReorgScenarioDTO {
  id: string;
  userId: string;
  title: string;
  status: ReorgStatus;
  currentHierarchyMetrics: HierarchyHealthMetricsDTO;
  proposedHierarchyMetrics: HierarchyHealthMetricsDTO;
  currentConwayScore: number;
  proposedConwayScore: number;
  budgetDeltaAnnualUsd: number;
  headcountDelta: number;
  disruptionRiskIndex: number;
  transferredEngineersCount: number;
  reassignedServicesCount: number;
  conwayEdges: ServiceDependencyEdgeDTO[];
  executiveRationale: string;
  targetCompletionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReorgScenarioMutationDTO {
  title: string;
  status?: ReorgStatus;
  targetCompletionDate: string;
  executiveRationale: string;
  proposedTeamAssignments?: {
    employeeId: string;
    targetTeamId: string;
    targetManagerId: string;
  }[];
  proposedServiceTransfers?: {
    serviceId: string;
    targetTeamId: string;
  }[];
}

export function calculateTeamCognitiveLoadIndex(
  headcount: number,
  ownedServicesCount: number,
  domainComplexity: number,
  operationalToilPercentage: number,
  teamType: TeamTopologyType,
  interactions: { interactionMode: TeamInteractionMode }[] = []
): { cli: number; status: CognitiveLoadStatus } {
  if (headcount <= 0) {
    return { cli: 100, status: 'cognitive_overload' };
  }

  const alpha = 8.5;
  const beta = 7.0;
  const gamma = 0.45;
  const delta = 4.0;

  let interactionWeightTotal = 0;
  for (const item of interactions) {
    if (item.interactionMode === 'collaboration') interactionWeightTotal += 1.0;
    else if (item.interactionMode === 'facilitating') interactionWeightTotal += 0.6;
    else if (item.interactionMode === 'x_as_a_service') interactionWeightTotal += 0.2;
  }

  const rawServicesPerDev = (ownedServicesCount / headcount) * alpha;
  const domainScore = domainComplexity * beta;
  const toilScore = operationalToilPercentage * gamma;
  const interactionScore = interactionWeightTotal * delta;

  let typeMultiplier = 1.0;
  if (teamType === 'enabling') typeMultiplier = 0.85;
  else if (teamType === 'complicated_subsystem') typeMultiplier = 1.15;
  else if (teamType === 'platform') typeMultiplier = 0.9;

  const rawCli = (rawServicesPerDev + domainScore + toilScore + interactionScore) * typeMultiplier;
  const cli = Math.min(100, Math.max(0, Math.round(rawCli * 10) / 10));

  let status: CognitiveLoadStatus = 'healthy_flow';
  if (cli > 85) status = 'cognitive_overload';
  else if (cli > 72) status = 'saturation_warning';
  else if (cli > 55) status = 'optimal_sustainable';

  return { cli, status };
}

export function calculateSpanHealth(directReports: number): SpanHealthStatus {
  if (directReports === 0) return 'optimal';
  if (directReports < 4) return 'under_span_micro_team';
  if (directReports <= 8) return 'optimal';
  if (directReports <= 11) return 'over_span_overload';
  return 'critical_bottleneck';
}

export function calculateConwayAlignmentScore(
  edges: ServiceDependencyEdgeDTO[]
): number {
  if (edges.length === 0) return 100;

  let totalVolume = 0;
  let weightedCrossVolume = 0;

  for (const edge of edges) {
    totalVolume += edge.callVolumeWeekly;
    if (edge.crossesTeamBoundary) {
      weightedCrossVolume += edge.callVolumeWeekly * edge.interactionFrictionCoefficient;
    }
  }

  if (totalVolume === 0) return 100;
  const alignment = 100 * (1 - weightedCrossVolume / totalVolume);
  return Math.min(100, Math.max(0, Math.round(alignment * 10) / 10));
}

export function calculateReorgDisruptionRisk(
  totalEngineers: number,
  movedEngineers: number,
  totalManagers: number,
  newManagers: number,
  totalServices: number,
  reassignedServices: number
): number {
  if (totalEngineers <= 0) return 0;

  const wEng = 0.45;
  const wMgr = 0.35;
  const wSvc = 0.20;

  const engRatio = movedEngineers / Math.max(1, totalEngineers);
  const mgrRatio = newManagers / Math.max(1, totalManagers);
  const svcRatio = reassignedServices / Math.max(1, totalServices);

  const rawRisk = 100 * (wEng * engRatio + wMgr * mgrRatio + wSvc * svcRatio);
  return Math.min(100, Math.max(0, Math.round(rawRisk * 10) / 10));
}

export function calculateFullyBurdenedCost(
  baseSalary: number,
  burdenMultiplier = 1.30
): number {
  return Math.round(baseSalary * burdenMultiplier);
}

export function validateTeamTopologyInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu nhóm không hợp lệ.' } };
  }

  const data = input as Partial<TeamTopologyMutationDTO>;
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Vui lòng nhập tên nhóm (Team Name).';
  }

  const validTypes: TeamTopologyType[] = [
    'stream_aligned',
    'enabling',
    'complicated_subsystem',
    'platform'
  ];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.type = 'Vui lòng chọn loại hình Team Topology hợp lệ.';
  }

  if (typeof data.headcount !== 'number' || data.headcount <= 0) {
    errors.headcount = 'Quy mô nhân sự (Headcount) phải lớn hơn 0.';
  }

  if (typeof data.domainComplexity !== 'number' || data.domainComplexity < 1 || data.domainComplexity > 5) {
    errors.domainComplexity = 'Độ phức tạp nghiệp vụ (Domain Complexity) phải từ 1 đến 5.';
  }

  if (typeof data.operationalToilPercentage !== 'number' || data.operationalToilPercentage < 0 || data.operationalToilPercentage > 100) {
    errors.operationalToilPercentage = 'Tỷ lệ tiêu hao vận hành (Toil %) phải từ 0% đến 100%.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateReorgScenarioInput(input: unknown): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu kịch bản tái cơ cấu không hợp lệ.' } };
  }

  const data = input as Partial<ReorgScenarioMutationDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Vui lòng nhập tên kịch bản tái cơ cấu tổ chức.';
  }

  if (!data.executiveRationale || typeof data.executiveRationale !== 'string' || data.executiveRationale.trim().length < 20) {
    errors.executiveRationale = 'Vui lòng cung cấp căn cứ chiến lược và lý do tái cấu trúc (ít nhất 20 ký tự).';
  }

  if (!data.targetCompletionDate || typeof data.targetCompletionDate !== 'string') {
    errors.targetCompletionDate = 'Vui lòng chọn ngày hoàn thành mục tiêu.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function generateReorgExecutiveMemoMarkdown(scenario: ReorgScenarioDTO): string {
  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const budgetDeltaSign = scenario.budgetDeltaAnnualUsd >= 0 ? '+' : '';
  const headcountDeltaSign = scenario.headcountDelta >= 0 ? '+' : '';

  return `# Executive Engineering Organization Reorganization Memorandum
**Target Proposal:** ${scenario.title}
**Status:** ${scenario.status.toUpperCase()} | **Target Completion:** ${scenario.targetCompletionDate}
**Conway's Law Alignment:** ${scenario.currentConwayScore}% → ${scenario.proposedConwayScore}%
**Disruption Risk Index:** ${scenario.disruptionRiskIndex} / 100

---

## 1. Executive Summary & Strategic Rationale
This memorandum proposes a strategic organizational redesign of the engineering organization to realign team cognitive load, eliminate management span bottlenecks, and enforce Conway's Law alignment between software service dependencies and team boundaries.

### Strategic Drivers:
${scenario.executiveRationale}

---

## 2. Key Organizational Health & Financial Metrics

| Metric Dimension | Current Baseline | Proposed Target State | Variance (Delta) |
| :--- | :--- | :--- | :--- |
| **Total Engineering Headcount** | ${scenario.currentHierarchyMetrics.totalHeadcount} | ${scenario.proposedHierarchyMetrics.totalHeadcount} | ${headcountDeltaSign}${scenario.headcountDelta} engineers |
| **Average Span of Control** | 1:${scenario.currentHierarchyMetrics.averageSpanOfControl.toFixed(1)} | 1:${scenario.proposedHierarchyMetrics.averageSpanOfControl.toFixed(1)} | Realigned to 1:6–1:8 benchmark |
| **Overloaded Managers (>8 reports)** | ${scenario.currentHierarchyMetrics.overloadedManagersCount} | ${scenario.proposedHierarchyMetrics.overloadedManagersCount} | Eliminated bottlenecks |
| **Micro-Teams (<4 reports)** | ${scenario.currentHierarchyMetrics.microTeamsCount} | ${scenario.proposedHierarchyMetrics.microTeamsCount} | Consolidated reporting |
| **Conway's Law Alignment Index** | ${scenario.currentConwayScore}% | ${scenario.proposedConwayScore}% | +${(scenario.proposedConwayScore - scenario.currentConwayScore).toFixed(1)}% decoupling |
| **Fully Burdened Annual Budget** | Baseline | Projected | ${budgetDeltaSign}${fmtCurrency(scenario.budgetDeltaAnnualUsd)} |

---

## 3. Reorganization Disruption & Transition Risk Analysis
- **Disruption Risk Score:** **${scenario.disruptionRiskIndex} / 100**
- **Engineers Reassigned Across Teams:** ${scenario.transferredEngineersCount}
- **Microservices Reassigned to New Owners:** ${scenario.reassignedServicesCount}

### Risk Mitigation Plan:
1. **Weeks 1–2 (Formation & Governance):** Announce reporting changes, freeze non-essential feature deployments, establish team charter and ownership interfaces.
2. **Weeks 3–6 (Service Handover & Shadow On-Call):** Incoming owning teams shadow primary on-call rotations for reassigned microservices.
3. **Weeks 7–12 (Full Ownership & Velocity Recovery):** Transition to independent deployment cadence with verified X-as-a-Service interface contracts.

---

## 4. Board Committee Recommendation
The Engineering Executive Committee recommends **APPROVAL** of the proposed organization design and authorization of the associated budget variance of ${budgetDeltaSign}${fmtCurrency(scenario.budgetDeltaAnnualUsd)}.

*Generated autonomously by JobTrack Executive Organization Topology Studio.*`;
}
