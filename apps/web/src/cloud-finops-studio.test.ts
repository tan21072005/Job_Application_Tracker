import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cloudFinopsStudioRepository } from './data';
import type {
  TenantCostAllocationMutationDTO,
  CommitmentMutationDTO,
  IdleWasteRemediationMutationDTO,
  KubernetesRightsizingSimulationDTO,
  CfoMemorandumGenerateRequestDTO
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

describe('cloudFinopsStudioRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retrieves default demo overview with composite FES and 5-pillar data', async () => {
    const overview = await cloudFinopsStudioRepository.getOverview();
    expect(overview).toBeDefined();
    expect(overview.compositeScore).toBe(82.4);
    expect(overview.efficiencyBand).toBe('disciplined_efficient');
    expect(overview.maturityStage).toBe('walk');
    expect(overview.totalMonthlySpendUsd).toBe(148500);
    expect(overview.blendedGrossMarginPercent).toBe(76.8);
    expect(overview.commitmentCoveragePercent).toBe(84.5);
    expect(overview.commitmentUtilizationPercent).toBe(96.2);
    expect(overview.allocationOverview.allocations.length).toBeGreaterThanOrEqual(4);
    expect(overview.commitmentOverview.portfolio.length).toBeGreaterThanOrEqual(3);
    expect(overview.wasteOverview.idleAssets.length).toBeGreaterThanOrEqual(4);
    expect(overview.arbitrageOverview.workloads.length).toBeGreaterThanOrEqual(4);
    expect(overview.latestCfoMemo).toBeDefined();
  });

  it('manages tenant cost allocations and calculates unit economics and margins', async () => {
    const allocs = await cloudFinopsStudioRepository.listAllocations();
    expect(allocs.length).toBeGreaterThanOrEqual(4);

    const mutation: TenantCostAllocationMutationDTO = {
      tenantName: 'Tier1 Global FinTech',
      tenantTier: 'enterprise',
      monthlyAttributableRevenueUsd: 50000,
      directComputeCostUsd: 6000,
      directStorageCostUsd: 2000,
      allocatedSharedCostUsd: 2000,
      monthlyTransactionsCount: 5000000,
      taggingCompliancePercent: 96
    };

    const created = await cloudFinopsStudioRepository.createAllocation(mutation);
    expect(created.id).toBeDefined();
    expect(created.tenantName).toBe('Tier1 Global FinTech');
    expect(created.totalCostPerTenantUsd).toBe(10000);
    expect(created.grossMarginPercent).toBe(80.0);
    expect(created.costPerTransactionUsd).toBe(0.002);

    const updated = await cloudFinopsStudioRepository.updateAllocation(created.id, {
      ...mutation,
      monthlyAttributableRevenueUsd: 60000
    });
    expect(updated).not.toBeNull();
    expect(updated?.grossMarginPercent).toBe(83.33);

    const deleted = await cloudFinopsStudioRepository.deleteAllocation(created.id);
    expect(deleted).toBe(true);
  });

  it('manages commitment portfolio, NPV scenarios and expiration cliffs', async () => {
    const list = await cloudFinopsStudioRepository.listCommitments();
    expect(list.length).toBeGreaterThanOrEqual(3);

    const mutation: CommitmentMutationDTO = {
      provider: 'aws',
      serviceName: 'Amazon EC2 M6i Instances',
      commitmentType: 'savings_plan_ec2',
      instanceFamilyOrResource: 'm6i.2xlarge',
      termMonths: 36,
      paymentOption: 'no_upfront',
      committedHourlySpendUsd: 20.0,
      onDemandEquivalentMonthlySpendUsd: 22000,
      utilizationRatePercent: 97.0,
      coverageRatioPercent: 88.0,
      expirationDate: '2028-10-01'
    };

    const created = await cloudFinopsStudioRepository.createCommitment(mutation);
    expect(created.id).toBeDefined();
    expect(created.provider).toBe('aws');
    expect(created.monthlyCommittedSpendUsd).toBe(14600);
    expect(created.monthlySavingsUsd).toBe(7400);

    const scenarios = await cloudFinopsStudioRepository.simulateCommitmentNpv({
      eligibleMonthlySpendUsd: 100000,
      targetCoveragePercent: 80,
      waccDiscountRatePercent: 8.5
    });
    expect(scenarios.length).toBeGreaterThanOrEqual(3);
    expect(scenarios[0].netPresentValueUsd).toBeGreaterThan(0);

    const deleted = await cloudFinopsStudioRepository.deleteCommitment(created.id);
    expect(deleted).toBe(true);
  });

  it('handles anomaly detection and idle asset remediation', async () => {
    const anomalies = await cloudFinopsStudioRepository.listAnomalies();
    expect(anomalies.length).toBeGreaterThanOrEqual(3);

    const detected = await cloudFinopsStudioRepository.detectAnomalies({
      sensitivityZScore: 2.5,
      lookbackDays: 30
    });
    expect(detected.length).toBeGreaterThanOrEqual(3);

    const idle = await cloudFinopsStudioRepository.listIdleAssets();
    expect(idle.length).toBeGreaterThanOrEqual(4);

    const targetAsset = idle[0];
    const remediated = await cloudFinopsStudioRepository.remediateIdleAsset(targetAsset.id, {
      status: 'remediated',
      remediationNotes: 'Volume deleted via FinOps studio.'
    });
    expect(remediated).not.toBeNull();
    expect(remediated?.status).toBe('remediated');
  });

  it('simulates Kubernetes workload rightsizing with dynamic headroom buffer', async () => {
    const workloads = await cloudFinopsStudioRepository.listK8sWorkloads();
    expect(workloads.length).toBeGreaterThanOrEqual(4);

    const simulation: KubernetesRightsizingSimulationDTO = {
      headroomBufferPercent: 15,
      spotAggressivenessLevel: 'balanced'
    };

    const simulated = await cloudFinopsStudioRepository.simulateK8sRightsizing(simulation);
    expect(simulated.length).toBe(workloads.length);
    expect(simulated[0].recommendedCpuCores).toBeLessThan(simulated[0].requestedCpuCores);
    expect(simulated[0].monthlySavingsUsd).toBeGreaterThan(0);
  });

  it('generates and multi-executive approves CFO memorandum', async () => {
    const memos = await cloudFinopsStudioRepository.listCfoMemos();
    expect(memos.length).toBeGreaterThanOrEqual(1);

    const req: CfoMemorandumGenerateRequestDTO = {
      title: 'FY26 Q4 Executive FinOps Review',
      fiscalQuarter: 'Q4-2026',
      strategicNotes: 'Approved for Board Audit Committee.'
    };

    const freshMemo = await cloudFinopsStudioRepository.generateCfoMemo(req);
    expect(freshMemo.id).toBeDefined();
    expect(freshMemo.status).toBe('draft');
    expect(freshMemo.title).toBe('FY26 Q4 Executive FinOps Review');

    const vpApproved = await cloudFinopsStudioRepository.approveCfoMemo(freshMemo.id, 'vp_infra');
    expect(vpApproved?.approvedByVpInfraAt).toBeDefined();

    const ctoApproved = await cloudFinopsStudioRepository.approveCfoMemo(freshMemo.id, 'cto');
    expect(ctoApproved?.approvedByCtoAt).toBeDefined();

    const cfoApproved = await cloudFinopsStudioRepository.approveCfoMemo(freshMemo.id, 'cfo');
    expect(cfoApproved?.approvedByCfoAt).toBeDefined();
    expect(cfoApproved?.status).toBe('board_approved');
  });
});
