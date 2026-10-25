import type { DoraTier } from './technical-due-diligence.ts';

export type ValueStreamStage =
  | 'backlog'
  | 'design'
  | 'build'
  | 'qa_review'
  | 'deploy'
  | 'verify';

export type FlowItemType = 'feature' | 'defect' | 'technical_debt' | 'security';

export type FlowHealthStatus =
  | 'optimal_elite'
  | 'healthy_flow'
  | 'moderate_friction'
  | 'high_waste_congestion';

export type SoftwareDevelopmentStage =
  | 'preliminary_project'
  | 'application_development'
  | 'post_implementation';

export type CapitalizationTreatment = 'capitalized_capex' | 'expensed_opex';

export type RdInvestmentCategory = 'run' | 'grow' | 'transform';

export type StrategicPriorityTier = 'tier_0_board' | 'tier_1_growth' | 'tier_2_enhancement';

export type DeliveryHealthBand =
  | 'world_class_elite'
  | 'predictable_growth'
  | 'congested_friction'
  | 'delivery_distress';

export type BoardMemoStatus = 'draft' | 'under_review' | 'board_approved' | 'archived';

export interface ValueStreamStageMetricDTO {
  stage: ValueStreamStage;
  stageName: string;
  activeTouchHours: number;
  idleWaitHours: number;
  stageLeadTimeHours: number;
  stageFlowEfficiencyPercent: number;
  bottleneckDetected: boolean;
}

export interface ValueStreamDTO {
  id: string;
  name: string;
  businessDomain: string;
  executiveSponsor: string;
  contributingHeadcount: number;
  stages: ValueStreamStageMetricDTO[];
  totalActiveTouchHours: number;
  totalIdleWaitHours: number;
  valueStreamLeadTimeHours: number;
  flowEfficiencyPercent: number;
  flowHealthStatus: FlowHealthStatus;
  strategicAlignmentScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface ValueStreamMutationDTO {
  name: string;
  businessDomain: string;
  executiveSponsor: string;
  contributingHeadcount: number;
  stages?: ValueStreamStageMetricDTO[];
}

export interface StrategicOkrLinkageDTO {
  id: string;
  valueStreamId: string;
  valueStreamName: string;
  strategicTheme: string;
  corporateObjective: string;
  teamKeyResult: string;
  priorityTier: StrategicPriorityTier;
  allocatedCapacityPoints: number;
  totalCapacityPoints: number;
  capacitySharePercent: number;
  alignmentWeightedScore: number;
  targetQuarter: string;
  status: 'on_track' | 'at_risk' | 'behind';
}

export interface StrategicOkrMutationDTO {
  valueStreamId: string;
  strategicTheme: string;
  corporateObjective: string;
  teamKeyResult: string;
  priorityTier: StrategicPriorityTier;
  allocatedCapacityPoints: number;
  totalCapacityPoints: number;
  targetQuarter: string;
  status: 'on_track' | 'at_risk' | 'behind';
}

export interface DoraMetricDetailDTO {
  value: number;
  unit: string;
  tier: DoraTier;
  benchmarkTarget: string;
  normalizedScore: number;
  historicalDeltaPercent: number;
}

export interface DoraMetricsSnapshotDTO {
  id: string;
  valueStreamId: string;
  periodStart: string;
  periodEnd: string;
  deploymentFrequency: DoraMetricDetailDTO;
  leadTimeForChanges: DoraMetricDetailDTO;
  changeFailureRate: DoraMetricDetailDTO;
  failedDeploymentRecoveryTime: DoraMetricDetailDTO;
  deliveryVelocityIndex: number;
  doraStabilityIndex: number;
  compositeDoraScore: number;
  compositeTier: DoraTier;
  createdAt: string;
}

export interface DoraCalculateRequestDTO {
  valueStreamId: string;
  periodDays: number;
  deploymentsCount: number;
  medianLeadTimeHours: number;
  failedDeploymentsCount: number;
  medianRecoveryTimeHours: number;
}

export interface FlowDistributionBreakdownDTO {
  itemType: FlowItemType;
  completedCount: number;
  distributionPercent: number;
  targetBenchmarkPercent: number;
  wipCount: number;
  averageFlowTimeDays: number;
}

export interface FlowMetricsSnapshotDTO {
  id: string;
  valueStreamId: string;
  measurementCycle: string;
  flowVelocityTotal: number;
  flowLoadTotalWip: number;
  recommendedMaxWip: number;
  wipSaturationRatio: number;
  contextSwitchingDragPercent: number;
  utilizationRatePercent: number;
  kingmanQueueWaitMultiplier: number;
  breakdown: FlowDistributionBreakdownDTO[];
  flowHealthScore: number;
  flowHealthStatus: FlowHealthStatus;
  createdAt: string;
}

export interface FlowSimulationRequestDTO {
  valueStreamId: string;
  featuresWip: number;
  defectsWip: number;
  debtWip: number;
  securityWip: number;
  targetVelocityPerSprint: number;
  engineerHeadcount: number;
}

export interface CapitalizedProjectLaborDTO {
  id: string;
  projectId: string;
  projectName: string;
  valueStreamId: string;
  investmentCategory: RdInvestmentCategory;
  developmentStage: SoftwareDevelopmentStage;
  qualifyingLaborHours: number;
  nonQualifyingLaborHours: number;
  blendedBurdenedHourlyRate: number;
  capitalizedLaborCostUsd: number;
  expensedLaborCostUsd: number;
  capitalizationRatioPercent: number;
  annualizedAttributableArrUsd: number;
  estimatedUsefulLifeMonths: number;
  monthlyAmortizationUsd: number;
  projectedRoiPercent: number;
  auditDocumentationRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface CapitalizedProjectMutationDTO {
  projectName: string;
  valueStreamId: string;
  investmentCategory: RdInvestmentCategory;
  developmentStage: SoftwareDevelopmentStage;
  qualifyingLaborHours: number;
  nonQualifyingLaborHours: number;
  baseSalaryWeightedAverage: number;
  burdenMultiplier: number;
  annualizedAttributableArrUsd: number;
  estimatedUsefulLifeMonths: number;
  auditDocumentationRef: string;
}

export interface RdInvestmentSizingSummaryDTO {
  totalCapitalizedLaborUsd: number;
  totalExpensedLaborUsd: number;
  overallCapitalizationRatioPercent: number;
  runCostUsd: number;
  growCostUsd: number;
  transformCostUsd: number;
  runAllocationPercent: number;
  growAllocationPercent: number;
  transformAllocationPercent: number;
  annualizedAmortizationImpactUsd: number;
  ebitdaEnhancementUsd: number;
}

export interface BoardMemorandumSectionDTO {
  sectionKey: string;
  heading: string;
  executiveSummaryText: string;
  keyMetricsBulletPoints: string[];
  strategicGuidance: string;
}

export interface BoardMemorandumDTO {
  id: string;
  userScenarioId: string;
  title: string;
  fiscalQuarter: string;
  status: BoardMemoStatus;
  deliveryHealthIndex: number;
  healthBand: DeliveryHealthBand;
  executiveSummary: BoardMemorandumSectionDTO;
  doraScorecard: BoardMemorandumSectionDTO;
  flowWipDiagnostics: BoardMemorandumSectionDTO;
  capitalizedRdFinancials: BoardMemorandumSectionDTO;
  executiveActionPlan: BoardMemorandumSectionDTO;
  ebitdaEnhancementAnnualizedUsd: number;
  approvedByCtoAt?: string;
  approvedByCfoAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMemorandumGenerateRequestDTO {
  fiscalQuarter: string;
  title: string;
  strategicNotes?: string;
}

export interface ValueStreamStudioOverviewDTO {
  compositeDeliveryHealthIndex: number;
  healthBand: DeliveryHealthBand;
  activeValueStreamsCount: number;
  totalEngineeringHeadcount: number;
  strategicAlignmentIndex: number;
  overallDoraTier: DoraTier;
  averageFlowEfficiencyPercent: number;
  totalCapitalizedLaborUsd: number;
  totalExpensedLaborUsd: number;
  ebitdaBenefitAnnualizedUsd: number;
  valueStreams: ValueStreamDTO[];
  okrLinkages: StrategicOkrLinkageDTO[];
  latestDoraSnapshot: DoraMetricsSnapshotDTO;
  latestFlowSnapshot: FlowMetricsSnapshotDTO;
  investmentSizing: RdInvestmentSizingSummaryDTO;
  capitalizedProjects: CapitalizedProjectLaborDTO[];
  latestBoardMemo?: BoardMemorandumDTO;
}

export function classifyFlowHealthStatus(flowEfficiencyPercent: number): FlowHealthStatus {
  if (flowEfficiencyPercent >= 35.0) return 'optimal_elite';
  if (flowEfficiencyPercent >= 20.0) return 'healthy_flow';
  if (flowEfficiencyPercent >= 10.0) return 'moderate_friction';
  return 'high_waste_congestion';
}

export function calculateValueStreamLeadTimeAndFlowEfficiency(
  stages: Array<{ activeTouchHours: number; idleWaitHours: number }>
): {
  totalActiveTouchHours: number;
  totalIdleWaitHours: number;
  valueStreamLeadTimeHours: number;
  flowEfficiencyPercent: number;
  flowHealthStatus: FlowHealthStatus;
} {
  const totalActiveTouchHours = stages.reduce((acc, s) => acc + s.activeTouchHours, 0);
  const totalIdleWaitHours = stages.reduce((acc, s) => acc + s.idleWaitHours, 0);
  const valueStreamLeadTimeHours = totalActiveTouchHours + totalIdleWaitHours;
  const flowEfficiencyPercent =
    valueStreamLeadTimeHours > 0
      ? Number(((totalActiveTouchHours / valueStreamLeadTimeHours) * 100).toFixed(2))
      : 0;

  return {
    totalActiveTouchHours,
    totalIdleWaitHours,
    valueStreamLeadTimeHours,
    flowEfficiencyPercent,
    flowHealthStatus: classifyFlowHealthStatus(flowEfficiencyPercent)
  };
}

export function calculateStrategicAlignmentIndex(
  okrs: Array<{ allocatedCapacityPoints: number; priorityTier: StrategicPriorityTier }>,
  totalOrganizationCapacityPoints?: number
): number {
  if (!okrs.length) return 0;

  const weights: Record<StrategicPriorityTier, number> = {
    tier_0_board: 1.2,
    tier_1_growth: 1.0,
    tier_2_enhancement: 0.8
  };

  const weightedSum = okrs.reduce((acc, okr) => {
    const w = weights[okr.priorityTier] ?? 1.0;
    return acc + okr.allocatedCapacityPoints * w;
  }, 0);

  const totalPoints =
    totalOrganizationCapacityPoints && totalOrganizationCapacityPoints > 0
      ? totalOrganizationCapacityPoints
      : okrs.reduce((acc, okr) => acc + okr.allocatedCapacityPoints, 0);

  if (totalPoints <= 0) return 0;
  const ratio = (weightedSum / totalPoints) * 100;
  return Number(Math.min(100, Math.max(0, ratio)).toFixed(1));
}

export function classifyDoraTier(
  metricKey: 'deploymentFrequency' | 'leadTimeForChanges' | 'changeFailureRate' | 'failedDeploymentRecoveryTime',
  value: number
): DoraTier {
  switch (metricKey) {
    case 'deploymentFrequency':
      if (value >= 1.0) return 'elite';
      if (value >= 0.14) return 'high';
      if (value >= 0.033) return 'medium';
      return 'low';
    case 'leadTimeForChanges':
      if (value <= 24.0) return 'elite';
      if (value <= 168.0) return 'high';
      if (value <= 720.0) return 'medium';
      return 'low';
    case 'changeFailureRate':
      if (value <= 5.0) return 'elite';
      if (value <= 10.0) return 'high';
      if (value <= 15.0) return 'medium';
      return 'low';
    case 'failedDeploymentRecoveryTime':
      if (value <= 1.0) return 'elite';
      if (value <= 24.0) return 'high';
      if (value <= 168.0) return 'medium';
      return 'low';
  }
}

export function computeNormalizedDoraScore(
  metricKey: 'deploymentFrequency' | 'leadTimeForChanges' | 'changeFailureRate' | 'failedDeploymentRecoveryTime',
  value: number
): number {
  switch (metricKey) {
    case 'deploymentFrequency': {
      const raw = 100 * (Math.log10(1 + Math.max(0, value)) / Math.log10(1 + 5.0));
      return Number(Math.min(100, Math.max(0, raw)).toFixed(1));
    }
    case 'leadTimeForChanges': {
      const raw = 100 * (1 - Math.log10(Math.max(1, value)) / Math.log10(1440));
      return Number(Math.min(100, Math.max(0, raw)).toFixed(1));
    }
    case 'changeFailureRate': {
      const raw = 100 * (1 - Math.max(0, value) / 30.0);
      return Number(Math.min(100, Math.max(0, raw)).toFixed(1));
    }
    case 'failedDeploymentRecoveryTime': {
      const raw = 100 * (1 - Math.log10(Math.max(1, value)) / Math.log10(336));
      return Number(Math.min(100, Math.max(0, raw)).toFixed(1));
    }
  }
}

export function calculateDoraMetricsSnapshot(
  req: DoraCalculateRequestDTO
): Omit<DoraMetricsSnapshotDTO, 'id' | 'createdAt'> {
  const periodDays = Math.max(1, req.periodDays);
  const dfValue = Number((req.deploymentsCount / periodDays).toFixed(2));
  const cfrValue =
    req.deploymentsCount > 0
      ? Number(((req.failedDeploymentsCount / req.deploymentsCount) * 100).toFixed(1))
      : 0;

  const dfScore = computeNormalizedDoraScore('deploymentFrequency', dfValue);
  const ltcScore = computeNormalizedDoraScore('leadTimeForChanges', req.medianLeadTimeHours);
  const cfrScore = computeNormalizedDoraScore('changeFailureRate', cfrValue);
  const fdrtScore = computeNormalizedDoraScore('failedDeploymentRecoveryTime', req.medianRecoveryTimeHours);

  const deliveryVelocityIndex = Number((0.5 * dfScore + 0.5 * ltcScore).toFixed(2));
  const doraStabilityIndex = Number((0.55 * cfrScore + 0.45 * fdrtScore).toFixed(2));
  const compositeDoraScore = Number((0.5 * deliveryVelocityIndex + 0.5 * doraStabilityIndex).toFixed(1));

  let compositeTier: DoraTier = 'low';
  if (compositeDoraScore >= 85.0 && cfrValue <= 5.0) {
    compositeTier = 'elite';
  } else if (compositeDoraScore >= 70.0) {
    compositeTier = 'high';
  } else if (compositeDoraScore >= 50.0) {
    compositeTier = 'medium';
  }

  const periodEnd = new Date().toISOString().split('T')[0];
  const periodStartDate = new Date(Date.now() - periodDays * 86400000);
  const periodStart = periodStartDate.toISOString().split('T')[0];

  return {
    valueStreamId: req.valueStreamId,
    periodStart,
    periodEnd,
    deploymentFrequency: {
      value: dfValue,
      unit: 'deploys/day',
      tier: classifyDoraTier('deploymentFrequency', dfValue),
      benchmarkTarget: '>= 1.0 deploy/day',
      normalizedScore: dfScore,
      historicalDeltaPercent: 12.5
    },
    leadTimeForChanges: {
      value: req.medianLeadTimeHours,
      unit: 'hours',
      tier: classifyDoraTier('leadTimeForChanges', req.medianLeadTimeHours),
      benchmarkTarget: '< 24 hours',
      normalizedScore: ltcScore,
      historicalDeltaPercent: -8.0
    },
    changeFailureRate: {
      value: cfrValue,
      unit: 'percent',
      tier: classifyDoraTier('changeFailureRate', cfrValue),
      benchmarkTarget: '< 5.0%',
      normalizedScore: cfrScore,
      historicalDeltaPercent: -1.5
    },
    failedDeploymentRecoveryTime: {
      value: req.medianRecoveryTimeHours,
      unit: 'hours',
      tier: classifyDoraTier('failedDeploymentRecoveryTime', req.medianRecoveryTimeHours),
      benchmarkTarget: '< 1.0 hour',
      normalizedScore: fdrtScore,
      historicalDeltaPercent: -15.0
    },
    deliveryVelocityIndex,
    doraStabilityIndex,
    compositeDoraScore,
    compositeTier
  };
}

export function calculateFlowMetricsSnapshot(
  req: FlowSimulationRequestDTO
): Omit<FlowMetricsSnapshotDTO, 'id' | 'createdAt'> {
  const flowLoadTotalWip = req.featuresWip + req.defectsWip + req.debtWip + req.securityWip;
  const flowVelocityTotal = Math.max(1, req.targetVelocityPerSprint);
  const engineers = Math.max(1, req.engineerHeadcount);
  const recommendedMaxWip = Math.round(engineers * 1.5);
  const wipSaturationRatio = Number((flowLoadTotalWip / Math.max(1, recommendedMaxWip)).toFixed(2));

  const averageSimultaneousTasks = flowLoadTotalWip / engineers;
  let contextSwitchingDragPercent = 0;
  if (averageSimultaneousTasks > 1.0) {
    const drag = 1 - Math.pow(1 - 0.18, averageSimultaneousTasks - 1);
    contextSwitchingDragPercent = Number((drag * 100).toFixed(1));
  }

  const utilizationRatePercent = Number(Math.min(99, Math.max(50, 75 + (wipSaturationRatio - 1.0) * 20)).toFixed(1));
  const rho = utilizationRatePercent / 100;
  const kingmanQueueWaitMultiplier = Number(
    Math.min(10.0, Math.max(1.0, (rho / (1 - Math.min(0.95, rho))) * 0.5)).toFixed(2)
  );

  const featurePct = Number(((req.featuresWip / Math.max(1, flowLoadTotalWip)) * 100).toFixed(1));
  const defectPct = Number(((req.defectsWip / Math.max(1, flowLoadTotalWip)) * 100).toFixed(1));
  const debtPct = Number(((req.debtWip / Math.max(1, flowLoadTotalWip)) * 100).toFixed(1));
  const secPct = Number(((req.securityWip / Math.max(1, flowLoadTotalWip)) * 100).toFixed(1));

  const breakdown: FlowDistributionBreakdownDTO[] = [
    {
      itemType: 'feature',
      completedCount: Math.round(flowVelocityTotal * (featurePct / 100)),
      distributionPercent: featurePct,
      targetBenchmarkPercent: 55.0,
      wipCount: req.featuresWip,
      averageFlowTimeDays: Number((8.0 * kingmanQueueWaitMultiplier).toFixed(1))
    },
    {
      itemType: 'defect',
      completedCount: Math.round(flowVelocityTotal * (defectPct / 100)),
      distributionPercent: defectPct,
      targetBenchmarkPercent: 12.0,
      wipCount: req.defectsWip,
      averageFlowTimeDays: Number((3.0 * kingmanQueueWaitMultiplier).toFixed(1))
    },
    {
      itemType: 'technical_debt',
      completedCount: Math.round(flowVelocityTotal * (debtPct / 100)),
      distributionPercent: debtPct,
      targetBenchmarkPercent: 18.0,
      wipCount: req.debtWip,
      averageFlowTimeDays: Number((9.0 * kingmanQueueWaitMultiplier).toFixed(1))
    },
    {
      itemType: 'security',
      completedCount: Math.round(flowVelocityTotal * (secPct / 100)),
      distributionPercent: secPct,
      targetBenchmarkPercent: 15.0,
      wipCount: req.securityWip,
      averageFlowTimeDays: Number((5.0 * kingmanQueueWaitMultiplier).toFixed(1))
    }
  ];

  const flowEfficiencyEst = 25.0;
  const flowHealthScore = Number(
    Math.min(
      100,
      Math.max(
        0,
        100 *
          (0.4 * (flowEfficiencyEst / 40) +
            0.35 * Math.max(0, 1 - contextSwitchingDragPercent / 100) +
            0.25 * Math.max(0, 1 - Math.max(0, wipSaturationRatio - 1)))
      )
    ).toFixed(1)
  );

  return {
    valueStreamId: req.valueStreamId,
    measurementCycle: 'Current Simulation Cycle',
    flowVelocityTotal,
    flowLoadTotalWip,
    recommendedMaxWip,
    wipSaturationRatio,
    contextSwitchingDragPercent,
    utilizationRatePercent,
    kingmanQueueWaitMultiplier,
    breakdown,
    flowHealthScore,
    flowHealthStatus: classifyFlowHealthStatus(flowEfficiencyEst)
  };
}

export function calculateCapitalizedProjectLabor(
  req: CapitalizedProjectMutationDTO
): Omit<CapitalizedProjectLaborDTO, 'id' | 'projectId' | 'createdAt' | 'updatedAt'> {
  const blendedHourlyRate = Number(
    ((req.baseSalaryWeightedAverage * req.burdenMultiplier) / 1920).toFixed(2)
  );

  const qualifyingFraction = 0.85;
  let capitalizedLaborCostUsd = 0;
  let expensedLaborCostUsd = 0;

  if (req.developmentStage === 'application_development') {
    capitalizedLaborCostUsd = Number(
      (req.qualifyingLaborHours * blendedHourlyRate * qualifyingFraction).toFixed(2)
    );
    const nonQualDevCost = req.qualifyingLaborHours * blendedHourlyRate * (1 - qualifyingFraction);
    const nonQualCost = req.nonQualifyingLaborHours * blendedHourlyRate;
    expensedLaborCostUsd = Number((nonQualDevCost + nonQualCost).toFixed(2));
  } else {
    capitalizedLaborCostUsd = 0;
    expensedLaborCostUsd = Number(
      ((req.qualifyingLaborHours + req.nonQualifyingLaborHours) * blendedHourlyRate).toFixed(2)
    );
  }

  const totalCost = capitalizedLaborCostUsd + expensedLaborCostUsd;
  const capitalizationRatioPercent =
    totalCost > 0 ? Number(((capitalizedLaborCostUsd / totalCost) * 100).toFixed(2)) : 0;

  const usefulLife = Math.max(1, req.estimatedUsefulLifeMonths);
  const monthlyAmortizationUsd = Number((capitalizedLaborCostUsd / usefulLife).toFixed(2));

  const projectedRoiPercent =
    totalCost > 0
      ? Number(((req.annualizedAttributableArrUsd / totalCost) * 100).toFixed(1))
      : 0;

  return {
    projectName: req.projectName,
    valueStreamId: req.valueStreamId,
    investmentCategory: req.investmentCategory,
    developmentStage: req.developmentStage,
    qualifyingLaborHours: req.qualifyingLaborHours,
    nonQualifyingLaborHours: req.nonQualifyingLaborHours,
    blendedBurdenedHourlyRate: blendedHourlyRate,
    capitalizedLaborCostUsd,
    expensedLaborCostUsd,
    capitalizationRatioPercent,
    annualizedAttributableArrUsd: req.annualizedAttributableArrUsd,
    estimatedUsefulLifeMonths: usefulLife,
    monthlyAmortizationUsd,
    projectedRoiPercent,
    auditDocumentationRef: req.auditDocumentationRef
  };
}

export function calculateRdInvestmentSizingSummary(
  projects: CapitalizedProjectLaborDTO[]
): RdInvestmentSizingSummaryDTO {
  let totalCapitalizedLaborUsd = 0;
  let totalExpensedLaborUsd = 0;
  let runCostUsd = 0;
  let growCostUsd = 0;
  let transformCostUsd = 0;
  let annualizedAmortizationImpactUsd = 0;

  for (const p of projects) {
    totalCapitalizedLaborUsd += p.capitalizedLaborCostUsd;
    totalExpensedLaborUsd += p.expensedLaborCostUsd;
    const projectTotal = p.capitalizedLaborCostUsd + p.expensedLaborCostUsd;

    if (p.investmentCategory === 'run') runCostUsd += projectTotal;
    else if (p.investmentCategory === 'grow') growCostUsd += projectTotal;
    else if (p.investmentCategory === 'transform') transformCostUsd += projectTotal;

    annualizedAmortizationImpactUsd += p.monthlyAmortizationUsd * 12;
  }

  const totalSpend = totalCapitalizedLaborUsd + totalExpensedLaborUsd;
  const overallCapitalizationRatioPercent =
    totalSpend > 0 ? Number(((totalCapitalizedLaborUsd / totalSpend) * 100).toFixed(1)) : 0;

  const runAllocationPercent =
    totalSpend > 0 ? Number(((runCostUsd / totalSpend) * 100).toFixed(1)) : 0;
  const growAllocationPercent =
    totalSpend > 0 ? Number(((growCostUsd / totalSpend) * 100).toFixed(1)) : 0;
  const transformAllocationPercent =
    totalSpend > 0 ? Number(((transformCostUsd / totalSpend) * 100).toFixed(1)) : 0;

  return {
    totalCapitalizedLaborUsd: Number(totalCapitalizedLaborUsd.toFixed(2)),
    totalExpensedLaborUsd: Number(totalExpensedLaborUsd.toFixed(2)),
    overallCapitalizationRatioPercent,
    runCostUsd: Number(runCostUsd.toFixed(2)),
    growCostUsd: Number(growCostUsd.toFixed(2)),
    transformCostUsd: Number(transformCostUsd.toFixed(2)),
    runAllocationPercent,
    growAllocationPercent,
    transformAllocationPercent,
    annualizedAmortizationImpactUsd: Number(annualizedAmortizationImpactUsd.toFixed(2)),
    ebitdaEnhancementUsd: Number(totalCapitalizedLaborUsd.toFixed(2))
  };
}

export function classifyDeliveryHealthBand(dhiScore: number): DeliveryHealthBand {
  if (dhiScore >= 85.0) return 'world_class_elite';
  if (dhiScore >= 70.0) return 'predictable_growth';
  if (dhiScore >= 55.0) return 'congested_friction';
  return 'delivery_distress';
}

export function calculateCompositeDeliveryHealthIndex(
  doraScore: number,
  flowHealthScore: number,
  strategicAlignmentScore: number,
  capitalizationRatioPercent: number,
  runCostSharePercent: number
): { deliveryHealthIndex: number; healthBand: DeliveryHealthBand } {
  const finScore = Math.min(
    100,
    100 *
      (0.5 * Math.min(1.0, capitalizationRatioPercent / 40.0) +
        0.5 * (1.0 - Math.max(0, (runCostSharePercent - 25.0) / 30.0)))
  );

  const dhi =
    0.3 * doraScore +
    0.25 * flowHealthScore +
    0.25 * strategicAlignmentScore +
    0.2 * finScore;

  const roundedDhi = Number(Math.min(100, Math.max(0, dhi)).toFixed(1));
  return {
    deliveryHealthIndex: roundedDhi,
    healthBand: classifyDeliveryHealthBand(roundedDhi)
  };
}

export function validateValueStreamInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu luồng giá trị không hợp lệ.' } };
  }

  const data = input as Partial<ValueStreamMutationDTO>;
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.name = 'Vui lòng nhập tên luồng giá trị (Value Stream Name).';
  }

  if (!data.businessDomain || typeof data.businessDomain !== 'string' || !data.businessDomain.trim()) {
    errors.businessDomain = 'Vui lòng nhập miền nghiệp vụ kinh doanh (Business Domain).';
  }

  if (typeof data.contributingHeadcount !== 'number' || data.contributingHeadcount <= 0) {
    errors.contributingHeadcount = 'Số lượng kỹ sư tham gia (Contributing Headcount) phải lớn hơn 0.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateStrategicOkrInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu liên kết OKR không hợp lệ.' } };
  }

  const data = input as Partial<StrategicOkrMutationDTO>;
  if (!data.strategicTheme || typeof data.strategicTheme !== 'string' || !data.strategicTheme.trim()) {
    errors.strategicTheme = 'Vui lòng nhập chủ đề chiến lược (Strategic Theme).';
  }

  if (!data.corporateObjective || typeof data.corporateObjective !== 'string' || !data.corporateObjective.trim()) {
    errors.corporateObjective = 'Vui lòng nhập mục tiêu cấp công ty (Corporate Objective).';
  }

  if (!data.teamKeyResult || typeof data.teamKeyResult !== 'string' || !data.teamKeyResult.trim()) {
    errors.teamKeyResult = 'Vui lòng nhập kết quả then chốt của đội ngũ (Team Key Result).';
  }

  if (typeof data.allocatedCapacityPoints !== 'number' || data.allocatedCapacityPoints <= 0) {
    errors.allocatedCapacityPoints = 'Điểm năng lực phân bổ phải lớn hơn 0.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateDoraCalculationInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tính toán DORA không hợp lệ.' } };
  }

  const data = input as Partial<DoraCalculateRequestDTO>;
  if (!data.valueStreamId || typeof data.valueStreamId !== 'string') {
    errors.valueStreamId = 'Vui lòng chọn luồng giá trị.';
  }

  if (typeof data.periodDays !== 'number' || data.periodDays <= 0) {
    errors.periodDays = 'Kỳ đánh giá (ngày) phải lớn hơn 0.';
  }

  if (typeof data.deploymentsCount !== 'number' || data.deploymentsCount < 0) {
    errors.deploymentsCount = 'Số lần triển khai không được âm.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateFlowSimulationInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu mô phỏng Flow không hợp lệ.' } };
  }

  const data = input as Partial<FlowSimulationRequestDTO>;
  if (!data.valueStreamId || typeof data.valueStreamId !== 'string') {
    errors.valueStreamId = 'Vui lòng chọn luồng giá trị.';
  }

  if (typeof data.engineerHeadcount !== 'number' || data.engineerHeadcount <= 0) {
    errors.engineerHeadcount = 'Số lượng kỹ sư phải lớn hơn 0.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCapitalizedProjectInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu dự án vốn hóa không hợp lệ.' } };
  }

  const data = input as Partial<CapitalizedProjectMutationDTO>;
  if (!data.projectName || typeof data.projectName !== 'string' || !data.projectName.trim()) {
    errors.projectName = 'Vui lòng nhập tên dự án (Project Name).';
  }

  if (typeof data.qualifyingLaborHours !== 'number' || data.qualifyingLaborHours < 0) {
    errors.qualifyingLaborHours = 'Số giờ lao động hợp lệ không được âm.';
  }

  if (typeof data.baseSalaryWeightedAverage !== 'number' || data.baseSalaryWeightedAverage <= 0) {
    errors.baseSalaryWeightedAverage = 'Lương cơ bản bình quân phải lớn hơn 0.';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateBoardMemoGenerateInput(
  input: unknown
): { ok: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: { form: 'Dữ liệu tạo bản ghi nhớ QBR không hợp lệ.' } };
  }

  const data = input as Partial<BoardMemorandumGenerateRequestDTO>;
  if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
    errors.title = 'Vui lòng nhập tiêu đề bản ghi nhớ QBR.';
  }

  if (!data.fiscalQuarter || typeof data.fiscalQuarter !== 'string' || !data.fiscalQuarter.trim()) {
    errors.fiscalQuarter = 'Vui lòng chọn quý tài chính (Fiscal Quarter).';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

export function generateBoardQbrMemorandumMarkdown(memo: BoardMemorandumDTO): string {
  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return `# Executive Technology Delivery Velocity, DORA Governance & Capitalized R&D Memorandum
**Document Title:** ${memo.title}
**Fiscal Period:** ${memo.fiscalQuarter} | **Status:** ${memo.status.toUpperCase()}
**Composite Delivery Health Index (DHI):** ${memo.deliveryHealthIndex} / 100 (${memo.healthBand.replace(/_/g, ' ').toUpperCase()})
**Annualized EBITDA Enhancement:** ${fmtCurrency(memo.ebitdaEnhancementAnnualizedUsd)}

---

## ${memo.executiveSummary.heading}
${memo.executiveSummary.executiveSummaryText}

### Key Strategic Highlights:
${memo.executiveSummary.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Executive Recommendation:** ${memo.executiveSummary.strategicGuidance}

---

## ${memo.doraScorecard.heading}
${memo.doraScorecard.executiveSummaryText}

### DORA Performance Benchmarks:
${memo.doraScorecard.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Guidance:** ${memo.doraScorecard.strategicGuidance}

---

## ${memo.flowWipDiagnostics.heading}
${memo.flowWipDiagnostics.executiveSummaryText}

### Flow & WIP Diagnostics:
${memo.flowWipDiagnostics.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Guidance:** ${memo.flowWipDiagnostics.strategicGuidance}

---

## ${memo.capitalizedRdFinancials.heading}
${memo.capitalizedRdFinancials.executiveSummaryText}

### Financial Capitalization Highlights:
${memo.capitalizedRdFinancials.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Guidance:** ${memo.capitalizedRdFinancials.strategicGuidance}

---

## ${memo.executiveActionPlan.heading}
${memo.executiveActionPlan.executiveSummaryText}

### Key Milestones & Directives:
${memo.executiveActionPlan.keyMetricsBulletPoints.map((pt) => `- ${pt}`).join('\n')}

> **Audit Recommendation:** ${memo.executiveActionPlan.strategicGuidance}

---

*Generated autonomously by JobTrack Executive Value Stream Management & Capitalized R&D Studio.*`;
}
