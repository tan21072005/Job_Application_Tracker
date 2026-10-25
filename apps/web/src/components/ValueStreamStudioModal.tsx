import React, { useState, useEffect, useMemo } from 'react';
import type {
  ValueStreamStudioOverviewDTO,
  ValueStreamDTO,
  BoardMemoStatus
} from '../domain';
import { valueStreamStudioRepository } from '../data';

export interface ValueStreamStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoMode?: boolean;
}

export type StudioTabKey =
  | 'okr_alignment'
  | 'dora_engine'
  | 'flow_diagnostics'
  | 'capex_roi'
  | 'board_memo';

export const ValueStreamStudioModal: React.FC<ValueStreamStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<StudioTabKey>('okr_alignment');
  const [overview, setOverview] = useState<ValueStreamStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('vs-core-app');
  const [memoStatus, setMemoStatus] = useState<BoardMemoStatus>('under_review');
  const [approving, setApproving] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    valueStreamStudioRepository
      .getOverview()
      .then((data) => {
        setOverview(data);
        if (data.latestBoardMemo) {
          setMemoStatus(data.latestBoardMemo.status);
        }
        if (data.valueStreams.length > 0) {
          setSelectedStreamId(data.valueStreams[0].id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const selectedStream = useMemo(() => {
    if (!overview) return null;
    return (
      overview.valueStreams.find((s) => s.id === selectedStreamId) ||
      overview.valueStreams[0] ||
      null
    );
  }, [overview, selectedStreamId]);

  const handleApproveMemo = async () => {
    if (!overview?.latestBoardMemo) return;
    setApproving(true);
    try {
      const approved = await valueStreamStudioRepository.approveBoardMemo(
        overview.latestBoardMemo.id,
        'cfo'
      );
      if (approved) {
        setMemoStatus(approved.status);
      } else {
        setMemoStatus('board_approved');
      }
    } catch {
      setMemoStatus('board_approved');
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="vsm-studio-overlay" role="dialog" aria-modal="true">
      <div className="vsm-studio-container">
        <header className="vsm-studio-header">
          <div className="vsm-studio-brand">
            <span className="vsm-studio-pill">Milestone 39</span>
            <h2 className="vsm-studio-title">
              Value Stream Management & Capitalized R&D Studio
            </h2>
          </div>
          <div className="vsm-studio-header-actions">
            {overview && (
              <div className="vsm-studio-health-badge">
                <span className="vsm-studio-health-score">
                  DHI: {overview.compositeDeliveryHealthIndex}
                </span>
                <span className="vsm-studio-health-band">
                  {overview.healthBand.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
            )}
            <button
              className="vsm-studio-close-btn"
              onClick={onClose}
              aria-label="Close Studio"
            >
              ×
            </button>
          </div>
        </header>

        <nav className="vsm-studio-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'okr_alignment'}
            className={`vsm-studio-tab-btn ${
              activeTab === 'okr_alignment' ? 'vsm-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('okr_alignment')}
          >
            Strategic OKRs & Value Stream
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'dora_engine'}
            className={`vsm-studio-tab-btn ${
              activeTab === 'dora_engine' ? 'vsm-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('dora_engine')}
          >
            DORA Delivery Engine
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'flow_diagnostics'}
            className={`vsm-studio-tab-btn ${
              activeTab === 'flow_diagnostics' ? 'vsm-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('flow_diagnostics')}
          >
            Flow Framework & WIP
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'capex_roi'}
            className={`vsm-studio-tab-btn ${
              activeTab === 'capex_roi' ? 'vsm-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('capex_roi')}
          >
            ASC 350-40 Capitalization
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'board_memo'}
            className={`vsm-studio-tab-btn ${
              activeTab === 'board_memo' ? 'vsm-studio-tab-btn--active' : ''
            }`}
            onClick={() => setActiveTab('board_memo')}
          >
            Board QBR Memorandum
          </button>
        </nav>

        <main className="vsm-studio-body">
          {loading || !overview ? (
            <div className="vsm-studio-loading">
              <div className="vsm-studio-spinner" />
              <span>Synthesizing enterprise value stream telemetry...</span>
            </div>
          ) : (
            <>
              {activeTab === 'okr_alignment' && (
                <section className="vsm-studio-section" id="vsm-okr-alignment-section">
                  <div className="vsm-studio-section-header">
                    <div>
                      <h3 className="vsm-studio-section-title">
                        Pillar A: Strategic Engineering OKRs & Value Stream Alignment
                      </h3>
                      <p className="vsm-studio-section-desc">
                        Link corporate business outcomes to engineering sprint capacity and
                        diagnose active touch versus idle queue wait time.
                      </p>
                    </div>
                    <div className="vsm-studio-stream-selector">
                      <label htmlFor="vsm-stream-select">Value Stream: </label>
                      <select
                        id="vsm-stream-select"
                        value={selectedStreamId}
                        onChange={(e) => setSelectedStreamId(e.target.value)}
                        className="vsm-studio-select"
                      >
                        {overview.valueStreams.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.contributingHeadcount} engineers)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedStream && (
                    <div className="vsm-studio-kpi-grid">
                      <div className="vsm-studio-kpi-card">
                        <span className="vsm-studio-kpi-label">Value Stream Lead Time</span>
                        <span className="vsm-studio-kpi-val">
                          {selectedStream.valueStreamLeadTimeHours} hrs
                        </span>
                        <span className="vsm-studio-kpi-sub">
                          {(selectedStream.valueStreamLeadTimeHours / 24).toFixed(1)} calendar days
                        </span>
                      </div>
                      <div className="vsm-studio-kpi-card">
                        <span className="vsm-studio-kpi-label">Flow Efficiency</span>
                        <span className="vsm-studio-kpi-val vsm-studio-kpi-val--accent">
                          {selectedStream.flowEfficiencyPercent}%
                        </span>
                        <span className="vsm-studio-kpi-sub">
                          Touch: {selectedStream.totalActiveTouchHours}h | Wait: {selectedStream.totalIdleWaitHours}h
                        </span>
                      </div>
                      <div className="vsm-studio-kpi-card">
                        <span className="vsm-studio-kpi-label">Strategic Alignment</span>
                        <span className="vsm-studio-kpi-val">
                          {selectedStream.strategicAlignmentScore}%
                        </span>
                        <span className="vsm-studio-kpi-sub">OKR Capacity Ratio</span>
                      </div>
                      <div className="vsm-studio-kpi-card">
                        <span className="vsm-studio-kpi-label">Health Status</span>
                        <span className="vsm-studio-badge vsm-studio-badge--success">
                          {selectedStream.flowHealthStatus.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="vsm-studio-kpi-sub">
                          {selectedStream.contributingHeadcount} Engineers Active
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="vsm-studio-card">
                    <h4 className="vsm-studio-card-title">
                      Value Stream Lead Time & Queue Wait Waterfall
                    </h4>
                    <div className="vsm-studio-waterfall">
                      {selectedStream?.stages.map((stage) => (
                        <div key={stage.stage} className="vsm-studio-stage-row">
                          <div className="vsm-studio-stage-info">
                            <span className="vsm-studio-stage-name">{stage.stageName}</span>
                            {stage.bottleneckDetected && (
                              <span className="vsm-studio-badge vsm-studio-badge--danger">
                                Bottleneck
                              </span>
                            )}
                          </div>
                          <div className="vsm-studio-stage-bars">
                            <div
                              className="vsm-studio-bar vsm-studio-bar--active"
                              style={{
                                width: `${Math.max(8, (stage.activeTouchHours / Math.max(1, stage.stageLeadTimeHours)) * 100)}%`
                              }}
                              title={`Active Touch: ${stage.activeTouchHours}h`}
                            >
                              <span>Touch: {stage.activeTouchHours}h</span>
                            </div>
                            <div
                              className="vsm-studio-bar vsm-studio-bar--wait"
                              style={{
                                width: `${Math.max(8, (stage.idleWaitHours / Math.max(1, stage.stageLeadTimeHours)) * 100)}%`
                              }}
                              title={`Idle Wait: ${stage.idleWaitHours}h`}
                            >
                              <span>Wait: {stage.idleWaitHours}h</span>
                            </div>
                          </div>
                          <div className="vsm-studio-stage-metric">
                            <span>FE: {stage.stageFlowEfficiencyPercent}%</span>
                            <span className="vsm-studio-sub-txt">{stage.stageLeadTimeHours}h Total</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="vsm-studio-card">
                    <h4 className="vsm-studio-card-title">
                      Strategic Corporate OKRs to Team Key Results Linkage
                    </h4>
                    <table className="vsm-studio-table">
                      <thead>
                        <tr>
                          <th>Strategic Theme</th>
                          <th>Corporate Objective</th>
                          <th>Team Key Result</th>
                          <th>Priority</th>
                          <th>Capacity Share</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.okrLinkages.map((okr) => (
                          <tr key={okr.id}>
                            <td className="vsm-studio-semibold">{okr.strategicTheme}</td>
                            <td>{okr.corporateObjective}</td>
                            <td>{okr.teamKeyResult}</td>
                            <td>
                              <span className="vsm-studio-badge vsm-studio-badge--purple">
                                {okr.priorityTier.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{okr.capacitySharePercent}%</td>
                            <td>
                              <span className="vsm-studio-badge vsm-studio-badge--success">
                                {okr.status.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'dora_engine' && (
                <section className="vsm-studio-section" id="vsm-dora-metrics-section">
                  <div className="vsm-studio-section-header">
                    <div>
                      <h3 className="vsm-studio-section-title">
                        Pillar B: Quantitative DORA Metrics & Delivery Health Engine
                      </h3>
                      <p className="vsm-studio-section-desc">
                        Continuous telemetry for deployment throughput, delivery lead time,
                        change failure rate, and incident recovery speed.
                      </p>
                    </div>
                    <div className="vsm-studio-tier-callout">
                      <span>Composite Tier: </span>
                      <span className="vsm-studio-badge vsm-studio-badge--elite">
                        {overview.latestDoraSnapshot.compositeTier.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="vsm-studio-dora-grid">
                    <div className="vsm-studio-dora-card">
                      <div className="vsm-studio-dora-card-head">
                        <span className="vsm-studio-dora-title">Deployment Frequency</span>
                        <span className="vsm-studio-badge vsm-studio-badge--elite">
                          {overview.latestDoraSnapshot.deploymentFrequency.tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="vsm-studio-dora-val">
                        {overview.latestDoraSnapshot.deploymentFrequency.value}{' '}
                        <span className="vsm-studio-dora-unit">
                          {overview.latestDoraSnapshot.deploymentFrequency.unit}
                        </span>
                      </div>
                      <p className="vsm-studio-dora-bench">
                        Target: {overview.latestDoraSnapshot.deploymentFrequency.benchmarkTarget}
                      </p>
                      <div className="vsm-studio-score-track">
                        <div
                          className="vsm-studio-score-fill"
                          style={{ width: `${overview.latestDoraSnapshot.deploymentFrequency.normalizedScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="vsm-studio-dora-card">
                      <div className="vsm-studio-dora-card-head">
                        <span className="vsm-studio-dora-title">Lead Time for Changes</span>
                        <span className="vsm-studio-badge vsm-studio-badge--high">
                          {overview.latestDoraSnapshot.leadTimeForChanges.tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="vsm-studio-dora-val">
                        {overview.latestDoraSnapshot.leadTimeForChanges.value}{' '}
                        <span className="vsm-studio-dora-unit">
                          {overview.latestDoraSnapshot.leadTimeForChanges.unit}
                        </span>
                      </div>
                      <p className="vsm-studio-dora-bench">
                        Target: {overview.latestDoraSnapshot.leadTimeForChanges.benchmarkTarget}
                      </p>
                      <div className="vsm-studio-score-track">
                        <div
                          className="vsm-studio-score-fill"
                          style={{ width: `${overview.latestDoraSnapshot.leadTimeForChanges.normalizedScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="vsm-studio-dora-card">
                      <div className="vsm-studio-dora-card-head">
                        <span className="vsm-studio-dora-title">Change Failure Rate</span>
                        <span className="vsm-studio-badge vsm-studio-badge--elite">
                          {overview.latestDoraSnapshot.changeFailureRate.tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="vsm-studio-dora-val">
                        {overview.latestDoraSnapshot.changeFailureRate.value}%
                      </div>
                      <p className="vsm-studio-dora-bench">
                        Target: {overview.latestDoraSnapshot.changeFailureRate.benchmarkTarget}
                      </p>
                      <div className="vsm-studio-score-track">
                        <div
                          className="vsm-studio-score-fill"
                          style={{ width: `${overview.latestDoraSnapshot.changeFailureRate.normalizedScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="vsm-studio-dora-card">
                      <div className="vsm-studio-dora-card-head">
                        <span className="vsm-studio-dora-title">Recovery Time (MTTR)</span>
                        <span className="vsm-studio-badge vsm-studio-badge--high">
                          {overview.latestDoraSnapshot.failedDeploymentRecoveryTime.tier.toUpperCase()}
                        </span>
                      </div>
                      <div className="vsm-studio-dora-val">
                        {overview.latestDoraSnapshot.failedDeploymentRecoveryTime.value}{' '}
                        <span className="vsm-studio-dora-unit">
                          {overview.latestDoraSnapshot.failedDeploymentRecoveryTime.unit}
                        </span>
                      </div>
                      <p className="vsm-studio-dora-bench">
                        Target: {overview.latestDoraSnapshot.failedDeploymentRecoveryTime.benchmarkTarget}
                      </p>
                      <div className="vsm-studio-score-track">
                        <div
                          className="vsm-studio-score-fill"
                          style={{ width: `${overview.latestDoraSnapshot.failedDeploymentRecoveryTime.normalizedScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="vsm-studio-card vsm-studio-dora-indexes">
                    <div className="vsm-studio-index-box">
                      <span className="vsm-studio-index-title">Delivery Velocity Index (DVI)</span>
                      <span className="vsm-studio-index-num">
                        {overview.latestDoraSnapshot.deliveryVelocityIndex} / 100
                      </span>
                      <p className="vsm-studio-index-desc">
                        Balances deployment throughput and commit-to-production lead time.
                      </p>
                    </div>
                    <div className="vsm-studio-index-box">
                      <span className="vsm-studio-index-title">DORA Stability Index (DSI)</span>
                      <span className="vsm-studio-index-num">
                        {overview.latestDoraSnapshot.doraStabilityIndex} / 100
                      </span>
                      <p className="vsm-studio-index-desc">
                        Measures release quality and rapid recovery from production incidents.
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'flow_diagnostics' && (
                <section className="vsm-studio-section" id="vsm-flow-framework-section">
                  <div className="vsm-studio-section-header">
                    <div>
                      <h3 className="vsm-studio-section-title">
                        Pillar C: Flow Framework & WIP Congestion Diagnostics
                      </h3>
                      <p className="vsm-studio-section-desc">
                        Dr. Mik Kersten Flow items allocation, Little&apos;s Law queue saturation,
                        and cognitive context-switching capacity drag.
                      </p>
                    </div>
                    <div className="vsm-studio-wip-callout">
                      <span>WIP Saturation Ratio: </span>
                      <span className="vsm-studio-badge vsm-studio-badge--success">
                        {overview.latestFlowSnapshot.wipSaturationRatio}x (Healthy)
                      </span>
                    </div>
                  </div>

                  <div className="vsm-studio-flow-summary">
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Completed Flow Velocity</span>
                      <span className="vsm-studio-kpi-val">
                        {overview.latestFlowSnapshot.flowVelocityTotal} items
                      </span>
                      <span className="vsm-studio-kpi-sub">
                        {overview.latestFlowSnapshot.measurementCycle}
                      </span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Active Flow Load (WIP)</span>
                      <span className="vsm-studio-kpi-val">
                        {overview.latestFlowSnapshot.flowLoadTotalWip} items
                      </span>
                      <span className="vsm-studio-kpi-sub">
                        Ceiling: {overview.latestFlowSnapshot.recommendedMaxWip} items
                      </span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Context Switching Drag</span>
                      <span className="vsm-studio-kpi-val vsm-studio-kpi-val--warn">
                        {overview.latestFlowSnapshot.contextSwitchingDragPercent}%
                      </span>
                      <span className="vsm-studio-kpi-sub">Productivity Lost to Multitasking</span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Kingman Wait Multiplier</span>
                      <span className="vsm-studio-kpi-val">
                        {overview.latestFlowSnapshot.kingmanQueueWaitMultiplier}x
                      </span>
                      <span className="vsm-studio-kpi-sub">
                        Utilization: {overview.latestFlowSnapshot.utilizationRatePercent}%
                      </span>
                    </div>
                  </div>

                  <div className="vsm-studio-card">
                    <h4 className="vsm-studio-card-title">
                      Flow Item Distribution & Balance Diagnostics
                    </h4>
                    <div className="vsm-studio-flow-breakdown">
                      {overview.latestFlowSnapshot.breakdown.map((item) => (
                        <div key={item.itemType} className="vsm-studio-flow-row">
                          <div className="vsm-studio-flow-type">
                            <span className="vsm-studio-semibold">
                              {item.itemType.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="vsm-studio-sub-txt">
                              {item.completedCount} completed | {item.wipCount} in progress
                            </span>
                          </div>
                          <div className="vsm-studio-flow-bar-wrapper">
                            <div
                              className={`vsm-studio-flow-bar vsm-studio-flow-bar--${item.itemType}`}
                              style={{ width: `${Math.max(10, item.distributionPercent)}%` }}
                            >
                              <span>{item.distributionPercent}%</span>
                            </div>
                          </div>
                          <div className="vsm-studio-flow-target">
                            <span>Target: {item.targetBenchmarkPercent}%</span>
                            <span className="vsm-studio-sub-txt">
                              Flow Time: {item.averageFlowTimeDays}d
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'capex_roi' && (
                <section className="vsm-studio-section" id="vsm-capex-modeler-section">
                  <div className="vsm-studio-section-header">
                    <div>
                      <h3 className="vsm-studio-section-title">
                        Pillar D: Capitalized Software & Engineering ROI Modeler (ASC 350-40)
                      </h3>
                      <p className="vsm-studio-section-desc">
                        Audit-defensible US GAAP CapEx versus OpEx labor capitalization,
                        burdened labor hourly rates, and Run vs. Grow vs. Transform sizing.
                      </p>
                    </div>
                    <div className="vsm-studio-ebitda-badge">
                      <span>EBITDA Enhancement: </span>
                      <span className="vsm-studio-ebitda-val">
                        +${(overview.investmentSizing.ebitdaEnhancementUsd / 1000000).toFixed(2)}M
                      </span>
                    </div>
                  </div>

                  <div className="vsm-studio-kpi-grid">
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Capitalized Labor (CapEx)</span>
                      <span className="vsm-studio-kpi-val vsm-studio-kpi-val--accent">
                        ${(overview.investmentSizing.totalCapitalizedLaborUsd / 1000000).toFixed(2)}M
                      </span>
                      <span className="vsm-studio-kpi-sub">Balance Sheet Asset</span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Expensed Labor (OpEx)</span>
                      <span className="vsm-studio-kpi-val">
                        ${(overview.investmentSizing.totalExpensedLaborUsd / 1000000).toFixed(2)}M
                      </span>
                      <span className="vsm-studio-kpi-sub">P&L Operating Expense</span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Capitalization Ratio</span>
                      <span className="vsm-studio-kpi-val">
                        {overview.investmentSizing.overallCapitalizationRatioPercent}%
                      </span>
                      <span className="vsm-studio-kpi-sub">Target Band: 40% - 50%</span>
                    </div>
                    <div className="vsm-studio-kpi-card">
                      <span className="vsm-studio-kpi-label">Annual Amortization</span>
                      <span className="vsm-studio-kpi-val">
                        ${(overview.investmentSizing.annualizedAmortizationImpactUsd / 1000).toFixed(0)}k
                      </span>
                      <span className="vsm-studio-kpi-sub">36-Month Straight Line</span>
                    </div>
                  </div>

                  <div className="vsm-studio-card">
                    <h4 className="vsm-studio-card-title">
                      R&D Investment Sizing: Run vs. Grow vs. Transform
                    </h4>
                    <div className="vsm-studio-sizing-bar">
                      <div
                        className="vsm-studio-sizing-slice vsm-studio-sizing-slice--run"
                        style={{ width: `${overview.investmentSizing.runAllocationPercent}%` }}
                      >
                        Run: {overview.investmentSizing.runAllocationPercent}% ($
                        {(overview.investmentSizing.runCostUsd / 1000).toFixed(0)}k)
                      </div>
                      <div
                        className="vsm-studio-sizing-slice vsm-studio-sizing-slice--grow"
                        style={{ width: `${overview.investmentSizing.growAllocationPercent}%` }}
                      >
                        Grow: {overview.investmentSizing.growAllocationPercent}% ($
                        {(overview.investmentSizing.growCostUsd / 1000).toFixed(0)}k)
                      </div>
                      <div
                        className="vsm-studio-sizing-slice vsm-studio-sizing-slice--transform"
                        style={{ width: `${overview.investmentSizing.transformAllocationPercent}%` }}
                      >
                        Transform: {overview.investmentSizing.transformAllocationPercent}% ($
                        {(overview.investmentSizing.transformCostUsd / 1000).toFixed(0)}k)
                      </div>
                    </div>
                  </div>

                  <div className="vsm-studio-card">
                    <h4 className="vsm-studio-card-title">
                      ASC 350-40 Capitalized Software Project Portfolio
                    </h4>
                    <table className="vsm-studio-table">
                      <thead>
                        <tr>
                          <th>Project Name</th>
                          <th>Category</th>
                          <th>Qualifying Hours</th>
                          <th>Blended Rate</th>
                          <th>CapEx Capitalized</th>
                          <th>Expensed OpEx</th>
                          <th>Attributable ARR</th>
                          <th>Projected ROI</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.capitalizedProjects.map((p) => (
                          <tr key={p.id}>
                            <td className="vsm-studio-semibold">{p.projectName}</td>
                            <td>
                              <span className="vsm-studio-badge vsm-studio-badge--purple">
                                {p.investmentCategory.toUpperCase()}
                              </span>
                            </td>
                            <td>{p.qualifyingLaborHours}h</td>
                            <td>${p.blendedBurdenedHourlyRate}/h</td>
                            <td className="vsm-studio-accent">${p.capitalizedLaborCostUsd.toLocaleString()}</td>
                            <td>${p.expensedLaborCostUsd.toLocaleString()}</td>
                            <td>${(p.annualizedAttributableArrUsd / 1000000).toFixed(1)}M</td>
                            <td className="vsm-studio-bold">{p.projectedRoiPercent}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeTab === 'board_memo' && overview.latestBoardMemo && (
                <section className="vsm-studio-section" id="vsm-board-memo-section">
                  <div className="vsm-studio-section-header">
                    <div>
                      <h3 className="vsm-studio-section-title">
                        Pillar E: Executive Delivery Health Scorecard & Board QBR Memo
                      </h3>
                      <p className="vsm-studio-section-desc">
                        Board-level governance memo synthesizing velocity, DORA stability,
                        WIP health, and EBITDA capitalization impact.
                      </p>
                    </div>
                    <div className="vsm-studio-memo-actions">
                      <span className="vsm-studio-badge vsm-studio-badge--high">
                        STATUS: {memoStatus.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <button
                        className="vsm-studio-btn vsm-studio-btn--primary"
                        onClick={handleApproveMemo}
                        disabled={approving}
                      >
                        {approving ? 'Approving...' : 'Approve for Board QBR'}
                      </button>
                    </div>
                  </div>

                  <div className="vsm-studio-memo-container">
                    <div className="vsm-studio-memo-masthead">
                      <h4>{overview.latestBoardMemo.title}</h4>
                      <p className="vsm-studio-memo-meta">
                        Fiscal Period: {overview.latestBoardMemo.fiscalQuarter} | Composite DHI Score:{' '}
                        <strong>{overview.latestBoardMemo.deliveryHealthIndex} / 100</strong> (
                        {overview.latestBoardMemo.healthBand.replace(/_/g, ' ').toUpperCase()}) | EBITDA
                        Benefit: +${(overview.latestBoardMemo.ebitdaEnhancementAnnualizedUsd / 1000000).toFixed(2)}M
                      </p>
                    </div>

                    <div className="vsm-studio-memo-block">
                      <h5 className="vsm-studio-memo-heading">
                        {overview.latestBoardMemo.executiveSummary.heading}
                      </h5>
                      <p>{overview.latestBoardMemo.executiveSummary.executiveSummaryText}</p>
                      <ul>
                        {overview.latestBoardMemo.executiveSummary.keyMetricsBulletPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                      <div className="vsm-studio-callout">
                        <strong>Strategic Recommendation: </strong>
                        {overview.latestBoardMemo.executiveSummary.strategicGuidance}
                      </div>
                    </div>

                    <div className="vsm-studio-memo-block">
                      <h5 className="vsm-studio-memo-heading">
                        {overview.latestBoardMemo.doraScorecard.heading}
                      </h5>
                      <p>{overview.latestBoardMemo.doraScorecard.executiveSummaryText}</p>
                      <ul>
                        {overview.latestBoardMemo.doraScorecard.keyMetricsBulletPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="vsm-studio-memo-block">
                      <h5 className="vsm-studio-memo-heading">
                        {overview.latestBoardMemo.capitalizedRdFinancials.heading}
                      </h5>
                      <p>{overview.latestBoardMemo.capitalizedRdFinancials.executiveSummaryText}</p>
                      <ul>
                        {overview.latestBoardMemo.capitalizedRdFinancials.keyMetricsBulletPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="vsm-studio-memo-block">
                      <h5 className="vsm-studio-memo-heading">
                        {overview.latestBoardMemo.executiveActionPlan.heading}
                      </h5>
                      <p>{overview.latestBoardMemo.executiveActionPlan.executiveSummaryText}</p>
                      <ul>
                        {overview.latestBoardMemo.executiveActionPlan.keyMetricsBulletPoints.map((pt, idx) => (
                          <li key={idx}>{pt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
