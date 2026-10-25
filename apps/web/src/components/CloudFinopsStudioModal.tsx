import React, { useState, useEffect, useMemo } from 'react';
import type {
  CloudFinopsStudioOverviewDTO,
  TenantCostAllocationDTO,
  TenantCostAllocationMutationDTO,
  CommitmentPortfolioItemDTO,
  CommitmentMutationDTO,
  CommitmentNpvScenarioDTO,
  CloudCostAnomalyDTO,
  IdleWasteItemDTO,
  KubernetesWorkloadRightsizingDTO,
  CfoMemorandumDTO,
  CfoMemoStatus,
  TenantTier,
  CloudProvider,
  CommitmentType,
  CommitmentPaymentOption
} from '../domain';
import {
  calculateCostPerTenantMetrics,
  calculateCommitmentNpv,
  calculateK8sRightsizing,
  generateCfoBoardMemorandumMarkdown
} from '../domain';
import { cloudFinopsStudioRepository } from '../data';

export interface CloudFinopsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoMode?: boolean;
}

export type FinopsStudioTabKey =
  | 'unit_economics'
  | 'commitment_optimizer'
  | 'waste_elimination'
  | 'k8s_arbitrage'
  | 'cfo_memorandum';

export const CloudFinopsStudioModal: React.FC<CloudFinopsStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<FinopsStudioTabKey>('unit_economics');
  const [overview, setOverview] = useState<CloudFinopsStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [headroomBuffer, setHeadroomBuffer] = useState<number>(20);
  const [waccDiscountRate, setWaccDiscountRate] = useState<number>(8.5);
  const [targetCoveragePercent, setTargetCoveragePercent] = useState<number>(85);
  const [memoStatus, setMemoStatus] = useState<CfoMemoStatus>('under_review');
  const [approvingRole, setApprovingRole] = useState<string | null>(null);
  const [scanningAnomalies, setScanningAnomalies] = useState<boolean>(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState<boolean>(false);
  const [showAddCommitmentModal, setShowAddCommitmentModal] = useState<boolean>(false);

  const [newTenant, setNewTenant] = useState<TenantCostAllocationMutationDTO>({
    tenantName: '',
    tenantTier: 'enterprise',
    monthlyAttributableRevenueUsd: 25000,
    directComputeCostUsd: 3500,
    directStorageCostUsd: 1200,
    allocatedSharedCostUsd: 1500,
    monthlyTransactionsCount: 2000000,
    taggingCompliancePercent: 92
  });

  const [newCommitment, setNewCommitment] = useState<CommitmentMutationDTO>({
    provider: 'aws',
    serviceName: 'Amazon EC2',
    commitmentType: 'savings_plan_compute',
    instanceFamilyOrResource: 'All Compute Types',
    termMonths: 36,
    paymentOption: 'no_upfront',
    committedHourlySpendUsd: 25.0,
    onDemandEquivalentMonthlySpendUsd: 27500,
    utilizationRatePercent: 96,
    coverageRatioPercent: 85,
    expirationDate: '2028-06-30'
  });

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    cloudFinopsStudioRepository
      .getOverview()
      .then((data) => {
        setOverview(data);
        if (data.latestCfoMemo) {
          setMemoStatus(data.latestCfoMemo.status);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const liveWorkloads = useMemo(() => {
    if (!overview) return [];
    return overview.arbitrageOverview.workloads.map((w) => {
      const sizing = calculateK8sRightsizing(
        w.requestedCpuCores,
        w.actualP95CpuCores,
        w.requestedMemoryGiB,
        w.actualP95MemoryGiB,
        w.currentMonthlyCostUsd,
        headroomBuffer
      );
      return {
        ...w,
        recommendedCpuCores: sizing.recommendedCpu,
        recommendedMemoryGiB: sizing.recommendedMemoryGiB,
        rightsizedMonthlyCostUsd: sizing.rightsizedMonthlyCostUsd,
        monthlySavingsUsd: sizing.monthlySavingsUsd,
        sizingSlackPercent: sizing.sizingSlackPercent
      };
    });
  }, [overview, headroomBuffer]);

  const simulatedNpvScenarios = useMemo(() => {
    if (!overview) return [];
    const monthlyEligible = overview.totalMonthlySpendUsd * 0.72;
    const coveredSpend = monthlyEligible * (targetCoveragePercent / 100);
    const s1 = calculateCommitmentNpv(coveredSpend, waccDiscountRate, 36, 'all_upfront', 38);
    const s2 = calculateCommitmentNpv(coveredSpend, waccDiscountRate, 36, 'no_upfront', 32);
    const s3 = calculateCommitmentNpv(coveredSpend, waccDiscountRate, 12, 'partial_upfront', 25);
    const s4 = calculateCommitmentNpv(coveredSpend, waccDiscountRate, 12, 'no_upfront', 20);
    return [s1, s2, s3, s4];
  }, [overview, targetCoveragePercent, waccDiscountRate]);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.tenantName.trim()) return;
    try {
      const created = await cloudFinopsStudioRepository.createAllocation(newTenant);
      if (overview) {
        setOverview({
          ...overview,
          allocationOverview: {
            ...overview.allocationOverview,
            allocations: [created, ...overview.allocationOverview.allocations]
          }
        });
      }
      setShowAddTenantModal(false);
      setNewTenant({
        tenantName: '',
        tenantTier: 'enterprise',
        monthlyAttributableRevenueUsd: 25000,
        directComputeCostUsd: 3500,
        directStorageCostUsd: 1200,
        allocatedSharedCostUsd: 1500,
        monthlyTransactionsCount: 2000000,
        taggingCompliancePercent: 92
      });
    } catch {
      setShowAddTenantModal(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    try {
      await cloudFinopsStudioRepository.deleteAllocation(id);
      if (overview) {
        setOverview({
          ...overview,
          allocationOverview: {
            ...overview.allocationOverview,
            allocations: overview.allocationOverview.allocations.filter((a) => a.id !== id)
          }
        });
      }
    } catch {
      if (overview) {
        setOverview({
          ...overview,
          allocationOverview: {
            ...overview.allocationOverview,
            allocations: overview.allocationOverview.allocations.filter((a) => a.id !== id)
          }
        });
      }
    }
  };

  const handleCreateCommitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommitment.serviceName.trim()) return;
    try {
      const created = await cloudFinopsStudioRepository.createCommitment(newCommitment);
      if (overview) {
        setOverview({
          ...overview,
          commitmentOverview: {
            ...overview.commitmentOverview,
            portfolio: [created, ...overview.commitmentOverview.portfolio]
          }
        });
      }
      setShowAddCommitmentModal(false);
    } catch {
      setShowAddCommitmentModal(false);
    }
  };

  const handleDeleteCommitment = async (id: string) => {
    try {
      await cloudFinopsStudioRepository.deleteCommitment(id);
      if (overview) {
        setOverview({
          ...overview,
          commitmentOverview: {
            ...overview.commitmentOverview,
            portfolio: overview.commitmentOverview.portfolio.filter((c) => c.id !== id)
          }
        });
      }
    } catch {
      if (overview) {
        setOverview({
          ...overview,
          commitmentOverview: {
            ...overview.commitmentOverview,
            portfolio: overview.commitmentOverview.portfolio.filter((c) => c.id !== id)
          }
        });
      }
    }
  };

  const handleRemediateAsset = async (id: string) => {
    try {
      const updated = await cloudFinopsStudioRepository.remediateIdleAsset(id, { status: 'remediated' });
      if (overview && updated) {
        setOverview({
          ...overview,
          wasteOverview: {
            ...overview.wasteOverview,
            idleAssets: overview.wasteOverview.idleAssets.map((a) => (a.id === id ? updated : a))
          }
        });
      }
    } catch {
      if (overview) {
        setOverview({
          ...overview,
          wasteOverview: {
            ...overview.wasteOverview,
            idleAssets: overview.wasteOverview.idleAssets.map((a) =>
              a.id === id ? { ...a, status: 'remediated' } : a
            )
          }
        });
      }
    }
  };

  const handleTriggerAnomalyScan = async () => {
    setScanningAnomalies(true);
    try {
      const detected = await cloudFinopsStudioRepository.detectAnomalies({
        sensitivityZScore: 2.5,
        lookbackDays: 30
      });
      if (overview) {
        setOverview({
          ...overview,
          wasteOverview: {
            ...overview.wasteOverview,
            anomalies: detected
          }
        });
      }
    } finally {
      setTimeout(() => setScanningAnomalies(false), 600);
    }
  };

  const handleApproveMemoRole = async (role: 'vp_infra' | 'cto' | 'cfo') => {
    if (!overview?.latestCfoMemo) return;
    setApprovingRole(role);
    try {
      const res = await cloudFinopsStudioRepository.approveCfoMemo(overview.latestCfoMemo.id, role);
      if (res) {
        setMemoStatus(res.status);
        setOverview({
          ...overview,
          latestCfoMemo: res
        });
      }
    } finally {
      setApprovingRole(null);
    }
  };

  const handleGenerateFreshMemo = async () => {
    setLoading(true);
    try {
      const generated = await cloudFinopsStudioRepository.generateCfoMemo({
        title: 'FY26 Q4 Executive FinOps, Cloud Unit Economics & Infrastructure Governance Memorandum',
        fiscalQuarter: 'Q4-2026',
        strategicNotes: 'Authorized by Executive Leadership Team.'
      });
      if (overview) {
        setOverview({
          ...overview,
          latestCfoMemo: generated
        });
        setMemoStatus(generated.status);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="finops-studio-overlay" role="dialog" aria-modal="true">
      <div className="finops-studio-container">
        <header className="finops-studio-header">
          <div className="finops-studio-brand">
            <span className="finops-studio-pill">Milestone 40</span>
            <h2 className="finops-studio-title">
              Executive FinOps, Cloud Unit Economics & Infrastructure Governance Studio
            </h2>
          </div>
          <div className="finops-studio-header-actions">
            {overview && (
              <div className="finops-studio-fes-badge">
                <span className="finops-studio-fes-score">
                  FES: {overview.compositeScore}
                </span>
                <span className="finops-studio-fes-band">
                  {overview.efficiencyBand.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span className="finops-studio-maturity-pill">
                  STAGE: {overview.maturityStage.toUpperCase()}
                </span>
              </div>
            )}
            <button
              className="finops-studio-close-btn"
              onClick={onClose}
              data-testid="finops-close-modal"
              aria-label="Close Studio"
            >
              ×
            </button>
          </div>
        </header>

        <nav className="finops-studio-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'unit_economics'}
            className={`finops-studio-tab-btn ${
              activeTab === 'unit_economics' ? 'finops-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('unit_economics')}
            data-testid="finops-tab-unit-economics"
          >
            Unit Economics & Cost Allocation
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'commitment_optimizer'}
            className={`finops-studio-tab-btn ${
              activeTab === 'commitment_optimizer' ? 'finops-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('commitment_optimizer')}
            data-testid="finops-tab-commitment-optimizer"
          >
            Commitment Portfolio & NPV Modeler
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'waste_elimination'}
            className={`finops-studio-tab-btn ${
              activeTab === 'waste_elimination' ? 'finops-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('waste_elimination')}
            data-testid="finops-tab-waste-elimination"
          >
            Anomaly Spike & Idle Elimination
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'k8s_arbitrage'}
            className={`finops-studio-tab-btn ${
              activeTab === 'k8s_arbitrage' ? 'finops-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('k8s_arbitrage')}
            data-testid="finops-tab-k8s-arbitrage"
          >
            Kubernetes Rightsizing & Arbitrage
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'cfo_memorandum'}
            className={`finops-studio-tab-btn ${
              activeTab === 'cfo_memorandum' ? 'finops-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('cfo_memorandum')}
            data-testid="finops-tab-cfo-memorandum"
          >
            CFO Memorandum & Governance Sign-Off
          </button>
        </nav>

        <main className="finops-studio-body">
          {loading || !overview ? (
            <div className="finops-studio-loading">
              <div className="finops-studio-spinner" />
              <span>Synthesizing multi-cloud FinOps telemetry across AWS, GCP, Snowflake and Datadog...</span>
            </div>
          ) : (
            <>
              {activeTab === 'unit_economics' && (
                <section className="finops-studio-section" id="finops-unit-economics-section">
                  <div className="finops-studio-section-header">
                    <div>
                      <h3 className="finops-studio-section-title">
                        Pillar A: Cloud Cost Allocation, Multi-Cloud Spend & Unit Economics Engine
                      </h3>
                      <p className="finops-studio-section-desc">
                        Measure exact Cost Per Tenant ($CPT$), unit transactions, Gross Margin contribution ($\Delta GM$), and multi-cloud tagging compliance.
                      </p>
                    </div>
                    <button
                      className="finops-studio-action-btn finops-studio-action-btn--primary"
                      onClick={() => setShowAddTenantModal(true)}
                      data-testid="finops-open-add-tenant"
                    >
                      + Allocate New Tenant
                    </button>
                  </div>

                  <div className="finops-studio-kpi-grid">
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Total Monthly Cloud Spend</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.totalMonthlySpendUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">
                        ${(overview.totalMonthlySpendUsd * 12).toLocaleString()}/yr Run Rate
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Blended Gross Margin</span>
                      <span className="finops-studio-kpi-val finops-studio-kpi-val--accent">
                        {overview.blendedGrossMarginPercent}%
                      </span>
                      <span className="finops-studio-kpi-sub">
                        Board Target: &gt;72.0%
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Average Cost Per Tenant</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.allocationOverview.averageCostPerTenantUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">
                        {overview.allocationOverview.allocations.length} Active Accounts
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Cost Per Transaction</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.allocationOverview.averageCostPerTransactionUsd.toFixed(4)}
                      </span>
                      <span className="finops-studio-kpi-sub">
                        Tagging Compliance: {overview.allocationOverview.overallTaggingCompliancePercent}%
                      </span>
                    </div>
                  </div>

                  <div className="finops-studio-provider-strip">
                    <div className="finops-studio-provider-card">
                      <span className="finops-studio-provider-badge finops-studio-provider-badge--aws">AWS</span>
                      <span className="finops-studio-provider-spend">${overview.allocationOverview.spendByProvider.aws.toLocaleString()}/mo</span>
                      <span className="finops-studio-provider-share">{((overview.allocationOverview.spendByProvider.aws / overview.totalMonthlySpendUsd) * 100).toFixed(1)}% Share</span>
                    </div>
                    <div className="finops-studio-provider-card">
                      <span className="finops-studio-provider-badge finops-studio-provider-badge--gcp">GCP</span>
                      <span className="finops-studio-provider-spend">${overview.allocationOverview.spendByProvider.gcp.toLocaleString()}/mo</span>
                      <span className="finops-studio-provider-share">{((overview.allocationOverview.spendByProvider.gcp / overview.totalMonthlySpendUsd) * 100).toFixed(1)}% Share</span>
                    </div>
                    <div className="finops-studio-provider-card">
                      <span className="finops-studio-provider-badge finops-studio-provider-badge--snowflake">Snowflake</span>
                      <span className="finops-studio-provider-spend">${overview.allocationOverview.spendByProvider.snowflake.toLocaleString()}/mo</span>
                      <span className="finops-studio-provider-share">{((overview.allocationOverview.spendByProvider.snowflake / overview.totalMonthlySpendUsd) * 100).toFixed(1)}% Share</span>
                    </div>
                    <div className="finops-studio-provider-card">
                      <span className="finops-studio-provider-badge finops-studio-provider-badge--datadog">Datadog</span>
                      <span className="finops-studio-provider-spend">${overview.allocationOverview.spendByProvider.datadog.toLocaleString()}/mo</span>
                      <span className="finops-studio-provider-share">{((overview.allocationOverview.spendByProvider.datadog / overview.totalMonthlySpendUsd) * 100).toFixed(1)}% Share</span>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">
                      Tenant-Level Cost Allocation, Unit Economics & Margin Matrix
                    </h4>
                    <div className="finops-studio-table-wrapper">
                      <table className="finops-studio-table" data-testid="finops-tenants-table">
                        <thead>
                          <tr>
                            <th>Tenant Name</th>
                            <th>Tier</th>
                            <th>Revenue ($/mo)</th>
                            <th>Direct Compute</th>
                            <th>Direct Storage</th>
                            <th>Shared Alloc.</th>
                            <th>Total Cost</th>
                            <th>Gross Margin</th>
                            <th>Monthly Tx</th>
                            <th>Cost / Tx</th>
                            <th>Tagging</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.allocationOverview.allocations.map((alloc) => (
                            <tr key={alloc.id} data-testid={`finops-tenant-row-${alloc.id}`}>
                              <td className="finops-studio-table-strong">{alloc.tenantName}</td>
                              <td>
                                <span className={`finops-studio-tier-badge finops-studio-tier-badge--${alloc.tenantTier}`}>
                                  {alloc.tenantTier.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td>${alloc.monthlyAttributableRevenueUsd.toLocaleString()}</td>
                              <td>${alloc.directComputeCostUsd.toLocaleString()}</td>
                              <td>${alloc.directStorageCostUsd.toLocaleString()}</td>
                              <td>${alloc.allocatedSharedCostUsd.toLocaleString()}</td>
                              <td className="finops-studio-table-strong">${alloc.totalCostPerTenantUsd.toLocaleString()}</td>
                              <td>
                                <span className={`finops-studio-margin-badge ${alloc.grossMarginPercent >= 75 ? 'finops-studio-margin-badge--high' : 'finops-studio-margin-badge--mid'}`}>
                                  {alloc.grossMarginPercent}%
                                </span>
                              </td>
                              <td>{(alloc.monthlyTransactionsCount / 1000000).toFixed(2)}M</td>
                              <td className="finops-studio-code">${alloc.costPerTransactionUsd.toFixed(4)}</td>
                              <td>{alloc.taggingCompliancePercent}%</td>
                              <td>
                                <button
                                  className="finops-studio-btn-danger-sm"
                                  onClick={() => handleDeleteTenant(alloc.id)}
                                  data-testid={`finops-delete-tenant-${alloc.id}`}
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {showAddTenantModal && (
                    <div className="finops-studio-submodal-overlay">
                      <div className="finops-studio-submodal">
                        <h4 className="finops-studio-submodal-title">Allocate New Enterprise Tenant</h4>
                        <form onSubmit={handleCreateTenant} className="finops-studio-form">
                          <div className="finops-studio-form-group">
                            <label>Tenant Organization Name</label>
                            <input
                              type="text"
                              required
                              value={newTenant.tenantName}
                              onChange={(e) => setNewTenant({ ...newTenant, tenantName: e.target.value })}
                              placeholder="e.g. Apex Global Bank"
                              className="finops-studio-input"
                              data-testid="finops-input-tenant-name"
                            />
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Tier</label>
                              <select
                                value={newTenant.tenantTier}
                                onChange={(e) => setNewTenant({ ...newTenant, tenantTier: e.target.value as TenantTier })}
                                className="finops-studio-select"
                              >
                                <option value="enterprise">Enterprise Tier 1</option>
                                <option value="mid_market">Mid Market Tier 2</option>
                                <option value="smb">SMB Tier 3</option>
                                <option value="free_tier">Free Tier</option>
                              </select>
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Attributable Revenue ($/mo)</label>
                              <input
                                type="number"
                                required
                                value={newTenant.monthlyAttributableRevenueUsd}
                                onChange={(e) => setNewTenant({ ...newTenant, monthlyAttributableRevenueUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Direct Compute ($/mo)</label>
                              <input
                                type="number"
                                required
                                value={newTenant.directComputeCostUsd}
                                onChange={(e) => setNewTenant({ ...newTenant, directComputeCostUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Direct Storage ($/mo)</label>
                              <input
                                type="number"
                                required
                                value={newTenant.directStorageCostUsd}
                                onChange={(e) => setNewTenant({ ...newTenant, directStorageCostUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Allocated Shared ($/mo)</label>
                              <input
                                type="number"
                                required
                                value={newTenant.allocatedSharedCostUsd}
                                onChange={(e) => setNewTenant({ ...newTenant, allocatedSharedCostUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Monthly Transactions</label>
                              <input
                                type="number"
                                required
                                value={newTenant.monthlyTransactionsCount}
                                onChange={(e) => setNewTenant({ ...newTenant, monthlyTransactionsCount: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Tagging Compliance %</label>
                              <input
                                type="number"
                                max="100"
                                min="0"
                                required
                                value={newTenant.taggingCompliancePercent}
                                onChange={(e) => setNewTenant({ ...newTenant, taggingCompliancePercent: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-submodal-actions">
                            <button
                              type="button"
                              className="finops-studio-btn-secondary"
                              onClick={() => setShowAddTenantModal(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="finops-studio-btn-primary"
                              data-testid="finops-submit-tenant"
                            >
                              Save Allocation
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'commitment_optimizer' && (
                <section className="finops-studio-section" id="finops-commitment-section">
                  <div className="finops-studio-section-header">
                    <div>
                      <h3 className="finops-studio-section-title">
                        Pillar B: Reserved Capacity & Commitment Optimizer (Savings Plans / RIs / CUDs)
                      </h3>
                      <p className="finops-studio-section-desc">
                        Manage multi-cloud commitment hedging ratios, model 1-year vs. 3-year NPV financial scenarios, and track cliff expirations.
                      </p>
                    </div>
                    <button
                      className="finops-studio-action-btn finops-studio-action-btn--primary"
                      onClick={() => setShowAddCommitmentModal(true)}
                      data-testid="finops-open-add-commitment"
                    >
                      + Add Commitment
                    </button>
                  </div>

                  <div className="finops-studio-kpi-grid">
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Commitment Coverage Ratio</span>
                      <span className="finops-studio-kpi-val finops-studio-kpi-val--accent">
                        {overview.commitmentCoveragePercent}%
                      </span>
                      <span className="finops-studio-kpi-sub">Target &ge; 80.0% Hedged</span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Commitment Utilization Rate</span>
                      <span className="finops-studio-kpi-val">
                        {overview.commitmentUtilizationPercent}%
                      </span>
                      <span className="finops-studio-kpi-sub">Target &ge; 95.0% Minimized Waste</span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Realized Annual Savings</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.annualizedRealizedSavingsUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">Against Baseline On-Demand</span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Potential Pipeline Savings</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.annualizedPipelineSavingsUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">Pending Governance Sign-Off</span>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">30 / 60 / 90-Day Commitment Expiration Cliff Alerts</h4>
                    <div className="finops-studio-cliff-grid">
                      {overview.commitmentOverview.expirationCliffs.map((cliff) => (
                        <div
                          key={cliff.cliffWindowDays}
                          className={`finops-studio-cliff-card ${
                            cliff.expiringCommitmentsCount > 0 ? 'finops-studio-cliff-card--warning' : ''
                          }`}
                        >
                          <div className="finops-studio-cliff-header">
                            <span className="finops-studio-cliff-window">{cliff.cliffWindowDays}-Day Horizon</span>
                            <span className="finops-studio-cliff-count">{cliff.expiringCommitmentsCount} Expiring</span>
                          </div>
                          <div className="finops-studio-cliff-body">
                            <span className="finops-studio-cliff-val">
                              ${cliff.atRiskMonthlySavingsUsd.toLocaleString()}/mo Savings at Risk
                            </span>
                            <span className="finops-studio-cliff-spike">
                              Unhedged Spike: +${cliff.unhedgedRunRateSpikeMonthlyUsd.toLocaleString()}/mo
                            </span>
                            <p className="finops-studio-cliff-action">{cliff.recommendedAction}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">Active Commitment Portfolio</h4>
                    <div className="finops-studio-table-wrapper">
                      <table className="finops-studio-table" data-testid="finops-commitments-table">
                        <thead>
                          <tr>
                            <th>Provider</th>
                            <th>Service</th>
                            <th>Type</th>
                            <th>Resource Family</th>
                            <th>Term</th>
                            <th>Payment</th>
                            <th>Monthly Spend</th>
                            <th>Monthly Savings</th>
                            <th>Coverage</th>
                            <th>Utilization</th>
                            <th>Expiration</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.commitmentOverview.portfolio.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <span className={`finops-studio-provider-tag finops-studio-provider-tag--${c.provider}`}>
                                  {c.provider.toUpperCase()}
                                </span>
                              </td>
                              <td className="finops-studio-table-strong">{c.serviceName}</td>
                              <td>{c.commitmentType.replace(/_/g, ' ')}</td>
                              <td>{c.instanceFamilyOrResource}</td>
                              <td>{c.termMonths} mo</td>
                              <td>{c.paymentOption.replace(/_/g, ' ')}</td>
                              <td>${c.monthlyCommittedSpendUsd.toLocaleString()}</td>
                              <td className="finops-studio-table-strong finops-studio-text-accent">
                                +${c.monthlySavingsUsd.toLocaleString()}/mo
                              </td>
                              <td>{c.coverageRatioPercent}%</td>
                              <td>{c.utilizationRatePercent}%</td>
                              <td>
                                <span className={c.isExpiringSoon ? 'finops-studio-badge-warning' : ''}>
                                  {c.expirationDate} ({c.daysUntilExpiration}d)
                                </span>
                              </td>
                              <td>
                                <button
                                  className="finops-studio-btn-danger-sm"
                                  onClick={() => handleDeleteCommitment(c.id)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <div className="finops-studio-card-header-flex">
                      <h4 className="finops-studio-card-title">
                        1-Year vs. 3-Year NPV Scenario Financial Modeler
                      </h4>
                      <div className="finops-studio-controls-flex">
                        <label>
                          WACC Discount Rate: <strong>{waccDiscountRate}%</strong>
                        </label>
                        <input
                          type="range"
                          min="4"
                          max="16"
                          step="0.5"
                          value={waccDiscountRate}
                          onChange={(e) => setWaccDiscountRate(Number(e.target.value))}
                          className="finops-studio-slider"
                        />
                        <label>
                          Target Hedging: <strong>{targetCoveragePercent}%</strong>
                        </label>
                        <input
                          type="range"
                          min="50"
                          max="95"
                          step="5"
                          value={targetCoveragePercent}
                          onChange={(e) => setTargetCoveragePercent(Number(e.target.value))}
                          className="finops-studio-slider"
                        />
                      </div>
                    </div>
                    <div className="finops-studio-npv-grid">
                      {simulatedNpvScenarios.map((sc, i) => (
                        <div key={i} className="finops-studio-npv-card">
                          <h5 className="finops-studio-npv-title">{sc.scenarioName}</h5>
                          <div className="finops-studio-npv-metrics">
                            <div className="finops-studio-npv-row">
                              <span>Net Present Value (NPV):</span>
                              <strong className="finops-studio-text-accent">${sc.netPresentValueUsd.toLocaleString()}</strong>
                            </div>
                            <div className="finops-studio-npv-row">
                              <span>Cumulative Savings:</span>
                              <strong>${sc.cumulativeSavingsUsd.toLocaleString()}</strong>
                            </div>
                            <div className="finops-studio-npv-row">
                              <span>Upfront Capital:</span>
                              <span>${sc.upfrontCapitalRequiredUsd.toLocaleString()}</span>
                            </div>
                            <div className="finops-studio-npv-row">
                              <span>Effective Monthly Flow:</span>
                              <span>+${sc.monthlyEffectiveSavingsUsd.toLocaleString()}/mo</span>
                            </div>
                            <div className="finops-studio-npv-row">
                              <span>Internal Rate of Return:</span>
                              <strong>{sc.internalRateOfReturnPercent}%</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {showAddCommitmentModal && (
                    <div className="finops-studio-submodal-overlay">
                      <div className="finops-studio-submodal">
                        <h4 className="finops-studio-submodal-title">Provision New Cloud Commitment</h4>
                        <form onSubmit={handleCreateCommitment} className="finops-studio-form">
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Provider</label>
                              <select
                                value={newCommitment.provider}
                                onChange={(e) => setNewCommitment({ ...newCommitment, provider: e.target.value as CloudProvider })}
                                className="finops-studio-select"
                              >
                                <option value="aws">AWS</option>
                                <option value="gcp">GCP</option>
                                <option value="snowflake">Snowflake</option>
                                <option value="datadog">Datadog</option>
                              </select>
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Service Name</label>
                              <input
                                type="text"
                                required
                                value={newCommitment.serviceName}
                                onChange={(e) => setNewCommitment({ ...newCommitment, serviceName: e.target.value })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Type</label>
                              <select
                                value={newCommitment.commitmentType}
                                onChange={(e) => setNewCommitment({ ...newCommitment, commitmentType: e.target.value as CommitmentType })}
                                className="finops-studio-select"
                              >
                                <option value="savings_plan_compute">Savings Plan Compute</option>
                                <option value="savings_plan_ec2">Savings Plan EC2</option>
                                <option value="reserved_instance_standard">Reserved Instance Standard</option>
                                <option value="cud_gcp">GCP Committed Use Discount</option>
                              </select>
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Instance Family</label>
                              <input
                                type="text"
                                required
                                value={newCommitment.instanceFamilyOrResource}
                                onChange={(e) => setNewCommitment({ ...newCommitment, instanceFamilyOrResource: e.target.value })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Term</label>
                              <select
                                value={newCommitment.termMonths}
                                onChange={(e) => setNewCommitment({ ...newCommitment, termMonths: Number(e.target.value) as 12 | 36 })}
                                className="finops-studio-select"
                              >
                                <option value="12">12 Months (1 Year)</option>
                                <option value="36">36 Months (3 Years)</option>
                              </select>
                            </div>
                            <div className="finops-studio-form-group">
                              <label>Payment Option</label>
                              <select
                                value={newCommitment.paymentOption}
                                onChange={(e) => setNewCommitment({ ...newCommitment, paymentOption: e.target.value as CommitmentPaymentOption })}
                                className="finops-studio-select"
                              >
                                <option value="no_upfront">No Upfront</option>
                                <option value="partial_upfront">Partial Upfront</option>
                                <option value="all_upfront">All Upfront</option>
                              </select>
                            </div>
                          </div>
                          <div className="finops-studio-form-row">
                            <div className="finops-studio-form-group">
                              <label>Committed Hourly ($/hr)</label>
                              <input
                                type="number"
                                step="0.1"
                                required
                                value={newCommitment.committedHourlySpendUsd}
                                onChange={(e) => setNewCommitment({ ...newCommitment, committedHourlySpendUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                            <div className="finops-studio-form-group">
                              <label>On-Demand Equivalent ($/mo)</label>
                              <input
                                type="number"
                                required
                                value={newCommitment.onDemandEquivalentMonthlySpendUsd}
                                onChange={(e) => setNewCommitment({ ...newCommitment, onDemandEquivalentMonthlySpendUsd: Number(e.target.value) })}
                                className="finops-studio-input"
                              />
                            </div>
                          </div>
                          <div className="finops-studio-form-group">
                            <label>Expiration Date</label>
                            <input
                              type="date"
                              required
                              value={newCommitment.expirationDate}
                              onChange={(e) => setNewCommitment({ ...newCommitment, expirationDate: e.target.value })}
                              className="finops-studio-input"
                            />
                          </div>
                          <div className="finops-studio-submodal-actions">
                            <button
                              type="button"
                              className="finops-studio-btn-secondary"
                              onClick={() => setShowAddCommitmentModal(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="finops-studio-btn-primary"
                              data-testid="finops-submit-commitment"
                            >
                              Provision Commitment
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {activeTab === 'waste_elimination' && (
                <section className="finops-studio-section" id="finops-waste-section">
                  <div className="finops-studio-section-header">
                    <div>
                      <h3 className="finops-studio-section-title">
                        Pillar C: Statistical Anomaly Spike Detector & Zombie Asset Sweeper
                      </h3>
                      <p className="finops-studio-section-desc">
                        Identify cost runaway spikes with moving baseline $Z \ge 2.5\sigma$, sweep unattached storage and idle NAT gateways, and measure cloud carbon footprint.
                      </p>
                    </div>
                    <button
                      className="finops-studio-action-btn finops-studio-action-btn--primary"
                      onClick={handleTriggerAnomalyScan}
                      disabled={scanningAnomalies}
                      data-testid="finops-run-anomaly-scan"
                    >
                      {scanningAnomalies ? 'Scanning Telemetry...' : '⚡ Trigger Anomaly Scan'}
                    </button>
                  </div>

                  <div className="finops-studio-kpi-grid">
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Active Cost Anomalies</span>
                      <span className="finops-studio-kpi-val finops-studio-text-warning">
                        {overview.wasteOverview.activeAnomaliesCount}
                      </span>
                      <span className="finops-studio-kpi-sub">
                        +${overview.wasteOverview.monthlyAnomalyExcessSpendUsd.toLocaleString()}/mo Runaway
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Zombie & Idle Assets</span>
                      <span className="finops-studio-kpi-val">
                        {overview.wasteOverview.idleAssetsCount} Items
                      </span>
                      <span className="finops-studio-kpi-sub">
                        ${overview.wasteOverview.monthlyIdleWasteTotalUsd.toLocaleString()}/mo Waste
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Remediated Idle Savings</span>
                      <span className="finops-studio-kpi-val finops-studio-kpi-val--accent">
                        ${overview.wasteOverview.remediatedSavingsMonthlyUsd.toLocaleString()}/mo
                      </span>
                      <span className="finops-studio-kpi-sub">Active Cleanup Actions</span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Monthly Cloud Carbon</span>
                      <span className="finops-studio-kpi-val">
                        {overview.wasteOverview.carbonSummary.totalMonthlyCloudCarbonKgCo2e} kg
                      </span>
                      <span className="finops-studio-kpi-sub">
                        Avoidable: {overview.wasteOverview.carbonSummary.potentialWasteAvoidanceKgCo2e} kg CO2e
                      </span>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">Real-Time Anomaly Spike Log (Statistical Z-Score &ge; 2.5)</h4>
                    <div className="finops-studio-table-wrapper">
                      <table className="finops-studio-table" data-testid="finops-anomalies-table">
                        <thead>
                          <tr>
                            <th>Provider</th>
                            <th>Service Affected</th>
                            <th>Date</th>
                            <th>Baseline Mean</th>
                            <th>Actual Spend</th>
                            <th>Excess Spend</th>
                            <th>Z-Score</th>
                            <th>Severity</th>
                            <th>Root Cause Diagnosis</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.wasteOverview.anomalies.map((anom) => (
                            <tr key={anom.id}>
                              <td>
                                <span className={`finops-studio-provider-tag finops-studio-provider-tag--${anom.provider}`}>
                                  {anom.provider.toUpperCase()}
                                </span>
                              </td>
                              <td className="finops-studio-table-strong">{anom.serviceAffected}</td>
                              <td>{anom.detectedDate}</td>
                              <td>${anom.baselineMeanDailySpendUsd.toLocaleString()}/day</td>
                              <td className="finops-studio-table-strong">${anom.actualDailySpendUsd.toLocaleString()}/day</td>
                              <td className="finops-studio-text-warning">+${anom.excessSpendDailyUsd.toLocaleString()}</td>
                              <td className="finops-studio-code">Z = {anom.zScore}</td>
                              <td>
                                <span className={`finops-studio-severity-badge finops-studio-severity-badge--${anom.severity}`}>
                                  {anom.severity.toUpperCase()}
                                </span>
                              </td>
                              <td className="finops-studio-cell-desc">{anom.probableRootCause}</td>
                              <td>
                                <span className={`finops-studio-status-pill finops-studio-status-pill--${anom.status}`}>
                                  {anom.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">Zombie & Idle Infrastructure Asset Inventory</h4>
                    <div className="finops-studio-table-wrapper">
                      <table className="finops-studio-table" data-testid="finops-idle-assets-table">
                        <thead>
                          <tr>
                            <th>Provider</th>
                            <th>Asset Identifier</th>
                            <th>Type</th>
                            <th>Region</th>
                            <th>Monthly Waste</th>
                            <th>Idle Days</th>
                            <th>Carbon Footprint</th>
                            <th>Status</th>
                            <th>Remediation Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview.wasteOverview.idleAssets.map((asset) => (
                            <tr key={asset.id} data-testid={`finops-idle-row-${asset.id}`}>
                              <td>
                                <span className={`finops-studio-provider-tag finops-studio-provider-tag--${asset.provider}`}>
                                  {asset.provider.toUpperCase()}
                                </span>
                              </td>
                              <td className="finops-studio-table-strong">{asset.resourceIdentifier}</td>
                              <td>{asset.assetType.replace(/_/g, ' ')}</td>
                              <td>{asset.region}</td>
                              <td className="finops-studio-text-warning">${asset.monthlyWasteCostUsd}/mo</td>
                              <td>{asset.idleDurationDays} days</td>
                              <td>{asset.carbonFootprintMonthlyKgCo2e} kg CO2e</td>
                              <td>
                                <span className={`finops-studio-status-pill finops-studio-status-pill--${asset.status}`}>
                                  {asset.status.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                {asset.status === 'detected' ? (
                                  <button
                                    className="finops-studio-btn-primary-sm"
                                    onClick={() => handleRemediateAsset(asset.id)}
                                    data-testid={`finops-remediate-${asset.id}`}
                                  >
                                    Terminate Asset
                                  </button>
                                ) : (
                                  <span className="finops-studio-remediated-label">Remediated</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'k8s_arbitrage' && (
                <section className="finops-studio-section" id="finops-k8s-arbitrage-section">
                  <div className="finops-studio-section-header">
                    <div>
                      <h3 className="finops-studio-section-title">
                        Pillar D: Kubernetes Workload Rightsizing & Graviton Architecture Arbitrage
                      </h3>
                      <p className="finops-studio-section-desc">
                        Analyze Pod Request vs. P95 Actual consumption slack, adjust dynamic headroom buffers, and model Spot instance & AWS Graviton ARM64 migration ROI.
                      </p>
                    </div>
                    <div className="finops-studio-controls-flex">
                      <label>
                        Safety Headroom Buffer: <strong>{headroomBuffer}%</strong>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        step="5"
                        value={headroomBuffer}
                        onChange={(e) => setHeadroomBuffer(Number(e.target.value))}
                        className="finops-studio-slider"
                        data-testid="finops-headroom-slider"
                      />
                    </div>
                  </div>

                  <div className="finops-studio-kpi-grid">
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Current K8s Monthly Spend</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.arbitrageOverview.currentK8sMonthlySpendUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">
                        {overview.arbitrageOverview.totalAnalyzedWorkloadsCount} Core Deployments
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Rightsized Monthly Spend</span>
                      <span className="finops-studio-kpi-val finops-studio-kpi-val--accent">
                        ${overview.arbitrageOverview.rightsizedK8sMonthlySpendUsd.toLocaleString()}
                      </span>
                      <span className="finops-studio-kpi-sub">With {headroomBuffer}% Headroom</span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Immediate Rightsizing Savings</span>
                      <span className="finops-studio-kpi-val">
                        ${overview.arbitrageOverview.monthlyRightsizingSavingsUsd.toLocaleString()}/mo
                      </span>
                      <span className="finops-studio-kpi-sub">
                        ${(overview.arbitrageOverview.monthlyRightsizingSavingsUsd * 12).toLocaleString()}/yr
                      </span>
                    </div>
                    <div className="finops-studio-kpi-card">
                      <span className="finops-studio-kpi-label">Spot & Graviton Potential</span>
                      <span className="finops-studio-kpi-val">
                        ${(overview.arbitrageOverview.monthlySpotSavingsPotentialUsd + overview.arbitrageOverview.monthlyGravitonSavingsPotentialUsd).toLocaleString()}/mo
                      </span>
                      <span className="finops-studio-kpi-sub">Combined Architecture Arbitrage</span>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">Container Workload Rightsizing Matrix</h4>
                    <div className="finops-studio-table-wrapper">
                      <table className="finops-studio-table" data-testid="finops-workloads-table">
                        <thead>
                          <tr>
                            <th>Namespace</th>
                            <th>Workload</th>
                            <th>Replicas</th>
                            <th>CPU (Req &rarr; P95 &rarr; Rec)</th>
                            <th>Memory (Req &rarr; P95 &rarr; Rec)</th>
                            <th>Monthly Spend</th>
                            <th>Rightsized Spend</th>
                            <th>Monthly Savings</th>
                            <th>Slack %</th>
                            <th>Spot Candidate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {liveWorkloads.map((w) => (
                            <tr key={w.id}>
                              <td className="finops-studio-code">{w.namespaceName}</td>
                              <td className="finops-studio-table-strong">{w.workloadName}</td>
                              <td>{w.replicasCount} pods</td>
                              <td>
                                {w.requestedCpuCores} &rarr; {w.actualP95CpuCores} &rarr; <strong>{w.recommendedCpuCores} cores</strong>
                              </td>
                              <td>
                                {w.requestedMemoryGiB}G &rarr; {w.actualP95MemoryGiB}G &rarr; <strong>{w.recommendedMemoryGiB}G</strong>
                              </td>
                              <td>${w.currentMonthlyCostUsd}</td>
                              <td>${w.rightsizedMonthlyCostUsd}</td>
                              <td className="finops-studio-table-strong finops-studio-text-accent">
                                +${w.monthlySavingsUsd}/mo
                              </td>
                              <td>{w.sizingSlackPercent}%</td>
                              <td>
                                {w.isEligibleForSpot ? (
                                  <span className="finops-studio-badge-spot">Spot Eligible (+${w.spotSavingsPotentialMonthlyUsd}/mo)</span>
                                ) : (
                                  <span className="finops-studio-badge-ondemand">On-Demand Only</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">Graviton ARM64 Architecture Arbitrage Modeler</h4>
                    {overview.arbitrageOverview.gravitonRoadmap.map((item, idx) => (
                      <div key={idx} className="finops-studio-graviton-card">
                        <div className="finops-studio-graviton-header">
                          <span className="finops-studio-graviton-source">{item.sourceInstanceType}</span>
                          <span className="finops-studio-graviton-arrow">&rarr;</span>
                          <span className="finops-studio-graviton-target">{item.targetGravitonInstanceType}</span>
                          <span className="finops-studio-graviton-boost">+{item.performanceGainPercent}% Performance Boost</span>
                        </div>
                        <div className="finops-studio-graviton-stats">
                          <div>
                            <span className="finops-studio-kpi-label">Current Spend</span>
                            <span className="finops-studio-kpi-sub">${item.currentMonthlyCostUsd.toLocaleString()}/mo</span>
                          </div>
                          <div>
                            <span className="finops-studio-kpi-label">Graviton Spend</span>
                            <span className="finops-studio-kpi-sub">${item.gravitonMonthlyCostUsd.toLocaleString()}/mo</span>
                          </div>
                          <div>
                            <span className="finops-studio-kpi-label">Recurring Savings</span>
                            <span className="finops-studio-text-accent">+${item.monthlySavingsUsd.toLocaleString()}/mo</span>
                          </div>
                          <div>
                            <span className="finops-studio-kpi-label">Migration Labor</span>
                            <span className="finops-studio-kpi-sub">{item.migrationEngineeringHours}h (${item.migrationLaborCostUsd.toLocaleString()})</span>
                          </div>
                          <div>
                            <span className="finops-studio-kpi-label">Payback Horizon</span>
                            <span className="finops-studio-table-strong">{item.paybackPeriodMonths} Months</span>
                          </div>
                          <div>
                            <span className="finops-studio-kpi-label">Annualized Net Benefit</span>
                            <strong className="finops-studio-text-accent">+${item.annualizedNetBenefitUsd.toLocaleString()}/yr</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'cfo_memorandum' && (
                <section className="finops-studio-section" id="finops-cfo-memo-section">
                  <div className="finops-studio-section-header">
                    <div>
                      <h3 className="finops-studio-section-title">
                        Pillar E: Executive FinOps Scorecard & CFO Memorandum
                      </h3>
                      <p className="finops-studio-section-desc">
                        Synthesizes FinOps Foundation Crawl/Walk/Run capability assessment, composite score breakdown, and formal multi-executive sign-off workflow.
                      </p>
                    </div>
                    <button
                      className="finops-studio-action-btn finops-studio-action-btn--primary"
                      onClick={handleGenerateFreshMemo}
                      data-testid="finops-generate-memo"
                    >
                      Regenerate Q4-2026 Memorandum
                    </button>
                  </div>

                  <div className="finops-studio-card">
                    <h4 className="finops-studio-card-title">FinOps Foundation Capability Assessment (Crawl &rarr; Walk &rarr; Run)</h4>
                    <div className="finops-studio-radar-grid">
                      <div className="finops-studio-radar-item">
                        <span className="finops-studio-radar-label">Cost Visibility & Tagging</span>
                        <div className="finops-studio-progress-bar">
                          <div
                            className="finops-studio-progress-fill"
                            style={{ width: `${overview.maturityAssessment.costVisibilityScore}%` }}
                          />
                        </div>
                        <span className="finops-studio-radar-score">{overview.maturityAssessment.costVisibilityScore} / 100 (Run)</span>
                      </div>
                      <div className="finops-studio-radar-item">
                        <span className="finops-studio-radar-label">Unit Economics & Allocation</span>
                        <div className="finops-studio-progress-bar">
                          <div
                            className="finops-studio-progress-fill"
                            style={{ width: `${overview.maturityAssessment.unitEconomicsScore}%` }}
                          />
                        </div>
                        <span className="finops-studio-radar-score">{overview.maturityAssessment.unitEconomicsScore} / 100 (Run)</span>
                      </div>
                      <div className="finops-studio-radar-item">
                        <span className="finops-studio-radar-label">Commitment Hedging Governance</span>
                        <div className="finops-studio-progress-bar">
                          <div
                            className="finops-studio-progress-fill"
                            style={{ width: `${overview.maturityAssessment.commitmentGovernanceScore}%` }}
                          />
                        </div>
                        <span className="finops-studio-radar-score">{overview.maturityAssessment.commitmentGovernanceScore} / 100 (Run)</span>
                      </div>
                      <div className="finops-studio-radar-item">
                        <span className="finops-studio-radar-label">Automated Workload Rightsizing</span>
                        <div className="finops-studio-progress-bar">
                          <div
                            className="finops-studio-progress-fill"
                            style={{ width: `${overview.maturityAssessment.automationRightsizingScore}%` }}
                          />
                        </div>
                        <span className="finops-studio-radar-score">{overview.maturityAssessment.automationRightsizingScore} / 100 (Walk)</span>
                      </div>
                      <div className="finops-studio-radar-item">
                        <span className="finops-studio-radar-label">Green Computing & Carbon Governance</span>
                        <div className="finops-studio-progress-bar">
                          <div
                            className="finops-studio-progress-fill"
                            style={{ width: `${overview.maturityAssessment.sustainabilityScore}%` }}
                          />
                        </div>
                        <span className="finops-studio-radar-score">{overview.maturityAssessment.sustainabilityScore} / 100 (Walk)</span>
                      </div>
                    </div>
                  </div>

                  {overview.latestCfoMemo && (
                    <div className="finops-studio-card">
                      <div className="finops-studio-memo-header">
                        <div>
                          <h4 className="finops-studio-memo-title">{overview.latestCfoMemo.title}</h4>
                          <span className="finops-studio-memo-quarter">Fiscal Quarter: {overview.latestCfoMemo.fiscalQuarter}</span>
                        </div>
                        <span className={`finops-studio-memo-status finops-studio-memo-status--${memoStatus}`}>
                          {memoStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="finops-studio-memo-content">
                        <div className="finops-studio-memo-section">
                          <h5>1. {overview.latestCfoMemo.executiveSummary.heading}</h5>
                          <p>{overview.latestCfoMemo.executiveSummary.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.executiveSummary.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                          <p className="finops-studio-memo-guidance">
                            <strong>Guidance:</strong> {overview.latestCfoMemo.executiveSummary.strategicGuidance}
                          </p>
                        </div>

                        <div className="finops-studio-memo-section">
                          <h5>2. {overview.latestCfoMemo.unitEconomicsScorecard.heading}</h5>
                          <p>{overview.latestCfoMemo.unitEconomicsScorecard.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.unitEconomicsScorecard.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="finops-studio-memo-section">
                          <h5>3. {overview.latestCfoMemo.commitmentStrategy.heading}</h5>
                          <p>{overview.latestCfoMemo.commitmentStrategy.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.commitmentStrategy.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="finops-studio-memo-section">
                          <h5>4. {overview.latestCfoMemo.wasteAndAnomalyGovernance.heading}</h5>
                          <p>{overview.latestCfoMemo.wasteAndAnomalyGovernance.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.wasteAndAnomalyGovernance.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="finops-studio-memo-section">
                          <h5>5. {overview.latestCfoMemo.k8sArchitectureArbitrage.heading}</h5>
                          <p>{overview.latestCfoMemo.k8sArchitectureArbitrage.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.k8sArchitectureArbitrage.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="finops-studio-memo-section">
                          <h5>6. {overview.latestCfoMemo.cfoDirectivesActionPlan.heading}</h5>
                          <p>{overview.latestCfoMemo.cfoDirectivesActionPlan.executiveSummaryText}</p>
                          <ul>
                            {overview.latestCfoMemo.cfoDirectivesActionPlan.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="finops-studio-signoff-bar">
                        <div className="finops-studio-signoff-item">
                          <span className="finops-studio-signoff-role">VP Infrastructure:</span>
                          {overview.latestCfoMemo.approvedByVpInfraAt ? (
                            <span className="finops-studio-signed-pill">
                              ✓ Approved {new Date(overview.latestCfoMemo.approvedByVpInfraAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <button
                              className="finops-studio-btn-sign"
                              onClick={() => handleApproveMemoRole('vp_infra')}
                              disabled={approvingRole === 'vp_infra'}
                              data-testid="finops-sign-vp-infra"
                            >
                              {approvingRole === 'vp_infra' ? 'Signing...' : 'Sign off as VP Infra'}
                            </button>
                          )}
                        </div>
                        <div className="finops-studio-signoff-item">
                          <span className="finops-studio-signoff-role">Chief Technology Officer:</span>
                          {overview.latestCfoMemo.approvedByCtoAt ? (
                            <span className="finops-studio-signed-pill">
                              ✓ Approved {new Date(overview.latestCfoMemo.approvedByCtoAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <button
                              className="finops-studio-btn-sign"
                              onClick={() => handleApproveMemoRole('cto')}
                              disabled={approvingRole === 'cto'}
                              data-testid="finops-sign-cto"
                            >
                              {approvingRole === 'cto' ? 'Signing...' : 'Sign off as CTO'}
                            </button>
                          )}
                        </div>
                        <div className="finops-studio-signoff-item">
                          <span className="finops-studio-signoff-role">Chief Financial Officer:</span>
                          {overview.latestCfoMemo.approvedByCfoAt ? (
                            <span className="finops-studio-signed-pill finops-studio-signed-pill--gold">
                              ★ Board Approved {new Date(overview.latestCfoMemo.approvedByCfoAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <button
                              className="finops-studio-btn-sign finops-studio-btn-sign--gold"
                              onClick={() => handleApproveMemoRole('cfo')}
                              disabled={approvingRole === 'cfo'}
                              data-testid="finops-sign-cfo"
                            >
                              {approvingRole === 'cfo' ? 'Executing...' : 'Sign off as CFO (Board Approval)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
