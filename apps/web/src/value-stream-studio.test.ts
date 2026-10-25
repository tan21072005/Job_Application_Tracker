import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { valueStreamStudioRepository } from './data';
import type {
  ValueStreamMutationDTO,
  StrategicOkrMutationDTO,
  DoraCalculateRequestDTO,
  FlowSimulationRequestDTO,
  CapitalizedProjectMutationDTO,
  BoardMemorandumGenerateRequestDTO
} from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('valueStreamStudioRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retrieves default demo overview with comprehensive DORA, Flow and CapEx metrics', async () => {
    const overview = await valueStreamStudioRepository.getOverview();
    expect(overview).toBeDefined();
    expect(overview.activeValueStreamsCount).toBeGreaterThanOrEqual(3);
    expect(overview.overallDoraTier).toBe('high');
    expect(overview.compositeDeliveryHealthIndex).toBe(78.4);
    expect(overview.totalCapitalizedLaborUsd).toBeGreaterThan(0);
    expect(overview.ebitdaBenefitAnnualizedUsd).toBeGreaterThan(0);
    expect(overview.valueStreams.length).toBeGreaterThanOrEqual(3);
    expect(overview.okrLinkages.length).toBeGreaterThanOrEqual(3);
    expect(overview.capitalizedProjects.length).toBeGreaterThanOrEqual(3);
  });

  it('manages value stream lifecycle with lead time and flow efficiency calculation', async () => {
    const list = await valueStreamStudioRepository.listValueStreams();
    expect(list.length).toBeGreaterThanOrEqual(3);

    const mutation: ValueStreamMutationDTO = {
      name: 'Mobile Core Checkout Stream',
      businessDomain: 'Checkout & Payments',
      executiveSponsor: 'VP Mobile Engineering',
      contributingHeadcount: 14,
      stages: [
        {
          stage: 'backlog',
          stageName: 'Ideation',
          activeTouchHours: 8,
          idleWaitHours: 16,
          stageLeadTimeHours: 24,
          stageFlowEfficiencyPercent: 33.33,
          bottleneckDetected: false
        },
        {
          stage: 'build',
          stageName: 'Implementation',
          activeTouchHours: 40,
          idleWaitHours: 10,
          stageLeadTimeHours: 50,
          stageFlowEfficiencyPercent: 80.0,
          bottleneckDetected: false
        },
        {
          stage: 'qa_review',
          stageName: 'Security Review',
          activeTouchHours: 6,
          idleWaitHours: 40,
          stageLeadTimeHours: 46,
          stageFlowEfficiencyPercent: 13.04,
          bottleneckDetected: true
        }
      ]
    };

    const created = await valueStreamStudioRepository.createValueStream(mutation);
    expect(created.id).toBeDefined();
    expect(created.name).toBe('Mobile Core Checkout Stream');
    expect(created.totalActiveTouchHours).toBe(54);
    expect(created.totalIdleWaitHours).toBe(66);
    expect(created.valueStreamLeadTimeHours).toBe(120);
    expect(created.flowEfficiencyPercent).toBe(45);
    expect(created.flowHealthStatus).toBe('optimal_elite');

    const updated = await valueStreamStudioRepository.updateValueStream(created.id, {
      ...mutation,
      name: 'Mobile Core Checkout Stream (Optimized)',
      contributingHeadcount: 16
    });
    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Mobile Core Checkout Stream (Optimized)');
    expect(updated?.contributingHeadcount).toBe(16);

    const deleted = await valueStreamStudioRepository.deleteValueStream(created.id);
    expect(deleted).toBe(true);
  });

  it('manages strategic OKR linkages and capacity alignment share', async () => {
    const okrs = await valueStreamStudioRepository.listOkrs();
    expect(okrs.length).toBeGreaterThanOrEqual(3);

    const streams = await valueStreamStudioRepository.listValueStreams();
    const targetStream = streams[0];

    const okrMutation: StrategicOkrMutationDTO = {
      valueStreamId: targetStream.id,
      strategicTheme: 'Enterprise Security Hardening',
      corporateObjective: 'Zero Trust SOC 2 Compliance Across All Clusters',
      teamKeyResult: '100% automated dependency patch rollouts within 4 hours',
      priorityTier: 'tier_0_board',
      allocatedCapacityPoints: 120,
      totalCapacityPoints: 150,
      targetQuarter: '2026-Q4',
      status: 'on_track'
    };

    const createdOkr = await valueStreamStudioRepository.createOkr(okrMutation);
    expect(createdOkr.id).toBeDefined();
    expect(createdOkr.corporateObjective).toBe('Zero Trust SOC 2 Compliance Across All Clusters');
    expect(createdOkr.capacitySharePercent).toBe(80);

    const deletedOkr = await valueStreamStudioRepository.deleteOkr(createdOkr.id);
    expect(deletedOkr).toBe(true);
  });

  it('calculates DORA metrics snapshots with tier classifications', async () => {
    const streams = await valueStreamStudioRepository.listValueStreams();
    const streamId = streams[0].id;

    const req: DoraCalculateRequestDTO = {
      valueStreamId: streamId,
      periodDays: 30,
      deploymentsCount: 95,
      medianLeadTimeHours: 3.5,
      failedDeploymentsCount: 3,
      medianRecoveryTimeHours: 0.5
    };

    const snapshot = await valueStreamStudioRepository.calculateDora(req);
    expect(snapshot.id).toBeDefined();
    expect(snapshot.deploymentFrequency.tier).toBe('elite');
    expect(snapshot.leadTimeForChanges.tier).toBe('elite');
    expect(snapshot.changeFailureRate.tier).toBe('elite');
    expect(snapshot.failedDeploymentRecoveryTime.tier).toBe('elite');
    expect(snapshot.compositeTier).toBe('elite');
  });

  it('simulates flow framework metrics and detects WIP congestion', async () => {
    const streams = await valueStreamStudioRepository.listValueStreams();
    const streamId = streams[0].id;

    const flowReq: FlowSimulationRequestDTO = {
      valueStreamId: streamId,
      featuresWip: 10,
      defectsWip: 2,
      debtWip: 3,
      securityWip: 1,
      targetVelocityPerSprint: 25,
      engineerHeadcount: 10
    };

    const flowSnapshot = await valueStreamStudioRepository.simulateFlow(flowReq);
    expect(flowSnapshot.id).toBeDefined();
    expect(flowSnapshot.flowLoadTotalWip).toBe(16);
    expect(flowSnapshot.recommendedMaxWip).toBe(15);
    expect(flowSnapshot.wipSaturationRatio).toBeCloseTo(1.07, 2);
    expect(flowSnapshot.flowHealthStatus).toBe('healthy_flow');
  });

  it('manages ASC 350-40 capitalized projects and portfolio investment sizing', async () => {
    const streams = await valueStreamStudioRepository.listValueStreams();
    const streamId = streams[0].id;

    const initialProjects = await valueStreamStudioRepository.listCapitalizedProjects();
    expect(initialProjects.length).toBeGreaterThanOrEqual(3);

    const projectMutation: CapitalizedProjectMutationDTO = {
      projectName: 'Global Edge Cache Invalidation Gateway',
      valueStreamId: streamId,
      investmentCategory: 'grow',
      developmentStage: 'preliminary_project',
      qualifyingLaborHours: 0,
      nonQualifyingLaborHours: 1200,
      baseSalaryWeightedAverage: 180000,
      burdenMultiplier: 1.32,
      annualizedAttributableArrUsd: 0,
      estimatedUsefulLifeMonths: 36,
      auditDocumentationRef: 'JIRA-PRE-1029'
    };

    const createdProject = await valueStreamStudioRepository.createCapitalizedProject(projectMutation);
    expect(createdProject.id).toBeDefined();
    expect(createdProject.projectName).toBe('Global Edge Cache Invalidation Gateway');
    expect(createdProject.capitalizedLaborCostUsd).toBe(0);
    expect(createdProject.expensedLaborCostUsd).toBeGreaterThan(0);

    const deleted = await valueStreamStudioRepository.deleteCapitalizedProject(createdProject.id);
    expect(deleted).toBe(true);
  });

  it('generates and approves executive Board QBR memorandum', async () => {
    const memoReq: BoardMemorandumGenerateRequestDTO = {
      fiscalQuarter: '2026-Q4',
      title: 'Q4 2026 Executive Engineering Value Stream & CapEx Report'
    };

    const generatedMemo = await valueStreamStudioRepository.generateBoardMemo(memoReq);
    expect(generatedMemo.id).toBeDefined();
    expect(generatedMemo.fiscalQuarter).toBe('2026-Q4');
    expect(generatedMemo.status).toBe('draft');
    expect(generatedMemo.deliveryHealthIndex).toBeGreaterThan(0);

    const ctoApproved = await valueStreamStudioRepository.approveBoardMemo(generatedMemo.id, 'cto');
    expect(ctoApproved).not.toBeNull();
    expect(ctoApproved?.status).toBe('under_review');
    expect(ctoApproved?.approvedByCtoAt).toBeDefined();

    const cfoApproved = await valueStreamStudioRepository.approveBoardMemo(generatedMemo.id, 'cfo');
    expect(cfoApproved).not.toBeNull();
    expect(cfoApproved?.status).toBe('board_approved');
    expect(cfoApproved?.approvedByCfoAt).toBeDefined();
  });
});
