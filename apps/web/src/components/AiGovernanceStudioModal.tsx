import React, { useState, useEffect, useMemo } from 'react';
import type {
  AiGovernanceStudioOverviewDTO,
  LlmModelBenchmarkDTO,
  EvaluationDomain,
  ModelTokenRateDTO,
  CascadeRoutingTierDTO,
  CascadeSimulationResultDTO,
  PiiMaskingRuleDTO,
  PiiRedactionStrategy,
  AiSecurityIncidentDTO,
  VectorIndexTelemetryDTO,
  RagRetrievalMetricsDTO,
  ExecutiveAiBoardMemorandumDTO,
  BoardMemoSignoffRole
} from '../domain';
import {
  generateExecutiveAiBoardMemorandumMarkdown,
  calculateCascadeArbitrage,
  maskSensitivePiiTokens
} from '../domain';
import { aiGovernanceStudioRepository } from '../data';

export interface AiGovernanceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoMode?: boolean;
}

export type AiGovernanceTab =
  | 'eval'
  | 'economics'
  | 'guardrails'
  | 'rag'
  | 'compliance';

export const AiGovernanceStudioModal: React.FC<AiGovernanceStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<AiGovernanceTab>('eval');
  const [overview, setOverview] = useState<AiGovernanceStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [evalDomain, setEvalDomain] = useState<EvaluationDomain>('job_matching');
  const [evaluating, setEvaluating] = useState<boolean>(false);

  const [cascadeReqs, setCascadeReqs] = useState<number>(150000);
  const [cascadeAvgInput, setCascadeAvgInput] = useState<number>(1200);
  const [cascadeAvgOutput, setCascadeAvgOutput] = useState<number>(350);
  const [tier1Share, setTier1Share] = useState<number>(55);
  const [tier2Share, setTier2Share] = useState<number>(35);
  const [tier3Share, setTier3Share] = useState<number>(10);
  const [cacheHitTarget, setCacheHitTarget] = useState<number>(85);
  const [simulationResult, setSimulationResult] = useState<CascadeSimulationResultDTO | null>(null);

  const [piiInputText, setPiiInputText] = useState<string>(
    'Candidate Jane Doe (jane.doe@techscale.io, +1-555-0199, SSN: 000-12-3456) requested $195,000 base salary.'
  );
  const [piiStrategy, setPiiStrategy] = useState<PiiRedactionStrategy>('full_mask');
  const [piiSanitizedOutput, setPiiSanitizedOutput] = useState<string>('');
  const [piiRedactedCount, setPiiRedactedCount] = useState<number>(0);

  const [chunkSize, setChunkSize] = useState<number>(512);
  const [chunkOverlap, setChunkOverlap] = useState<number>(64);
  const [indexingStrategy, setIndexingStrategy] = useState<'flat' | 'hierarchical' | 'semantic_parent'>('semantic_parent');
  const [tuningRag, setTuningRag] = useState<boolean>(false);

  const [memoTitle, setMemoTitle] = useState<string>('Q4-2026 Executive AI Governance & LLM Safety Memorandum');
  const [fiscalQuarter, setFiscalQuarter] = useState<string>('Q4-2026');
  const [generatingMemo, setGeneratingMemo] = useState<boolean>(false);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    void loadOverview();
  }, [isOpen]);

  async function loadOverview() {
    setLoading(true);
    try {
      const data = await aiGovernanceStudioRepository.getOverview();
      setOverview(data);
      if (data.tokenEconomicsOverview.latestSimulation) {
        setSimulationResult(data.tokenEconomicsOverview.latestSimulation);
      }
      if (data.ragOverview.primaryIndex) {
        setChunkSize(data.ragOverview.retrievalMetrics.contextWindowChunkDensityTokens || 512);
        setChunkOverlap(data.ragOverview.retrievalMetrics.chunkOverlapTokens || 64);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRunEvaluation() {
    if (!overview) return;
    setEvaluating(true);
    try {
      const allModelIds = overview.evaluationOverview.models.map((m) => m.modelId);
      await aiGovernanceStudioRepository.runModelEvaluation({
        domain: evalDomain,
        models: allModelIds,
        sampleSize: 100,
        concurrencyLevel: 4
      });
      await loadOverview();
    } finally {
      setEvaluating(false);
    }
  }

  function handleSimulateCascade() {
    const sum = tier1Share + tier2Share + tier3Share;
    if (Math.abs(sum - 100) > 0.1) {
      alert('Routing shares must sum to exactly 100%. Current sum: ' + sum + '%');
      return;
    }
    const rates = {
      tier1: { input: 0.15, output: 0.60 },
      tier2: { input: 0.80, output: 2.40 },
      tier3: { input: 2.50, output: 10.00 }
    };
    const res = calculateCascadeArbitrage(
      cascadeReqs,
      cascadeAvgInput,
      cascadeAvgOutput,
      tier1Share,
      tier2Share,
      tier3Share,
      rates,
      cacheHitTarget
    );
    setSimulationResult(res);
  }

  function handleTestPiiMasking() {
    if (!overview) return;
    const res = maskSensitivePiiTokens(piiInputText, overview.responsibleAiOverview.rules, piiStrategy);
    setPiiSanitizedOutput(res.sanitizedText);
    setPiiRedactedCount(res.detectedEntitiesCount);
  }

  async function handleResolveIncident(incidentId: string) {
    await aiGovernanceStudioRepository.resolveSecurityIncident(
      incidentId,
      'Resolved via Executive Responsible AI console inspection.'
    );
    await loadOverview();
  }

  async function handleTuneChunking() {
    setTuningRag(true);
    try {
      await aiGovernanceStudioRepository.tuneChunking({
        chunkSizeTokens: chunkSize,
        chunkOverlapTokens: chunkOverlap,
        indexingStrategy
      });
      await loadOverview();
    } finally {
      setTuningRag(false);
    }
  }

  async function handleGenerateMemo() {
    setGeneratingMemo(true);
    try {
      await aiGovernanceStudioRepository.generateBoardMemo({
        title: memoTitle,
        fiscalQuarter
      });
      await loadOverview();
    } finally {
      setGeneratingMemo(false);
    }
  }

  async function handleApproveMemo(role: BoardMemoSignoffRole) {
    if (!overview?.latestBoardMemo) return;
    await aiGovernanceStudioRepository.approveBoardMemo(overview.latestBoardMemo.id, role);
    await loadOverview();
  }

  function handleCopyMemoMarkdown() {
    if (!overview?.latestBoardMemo) return;
    const md = generateExecutiveAiBoardMemorandumMarkdown(overview.latestBoardMemo);
    void navigator.clipboard.writeText(md);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop ai-gov-studio-backdrop"
      data-testid="ai-governance-studio-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog ai-gov-studio-dialog" role="dialog" aria-modal="true">
        <header className="ai-gov-studio-header">
          <div className="ai-gov-studio-header-left">
            <div className="ai-gov-studio-title-row">
              <span className="ai-gov-studio-icon" aria-hidden="true">🛡️</span>
              <div>
                <h2 className="ai-gov-studio-title">
                  Executive AI Governance, LLM Systems & Responsible AI Studio
                </h2>
                <div className="ai-gov-studio-subtitle">
                  Autonomous LLM Benchmarking, Prompt Caching Arbitrage, Jailbreak Defense & EU AI Act Compliance
                </div>
              </div>
            </div>
          </div>

          <div className="ai-gov-studio-header-metrics">
            <div className="ai-gov-studio-score-badge">
              <span className="ai-gov-studio-score-label">Composite AGS</span>
              <span className="ai-gov-studio-score-val" data-testid="composite-ags-score">
                {overview?.compositeScore ?? 92.4} / 100
              </span>
              <span className="ai-gov-studio-band-pill">
                {(overview?.statusBand ?? 'elite_compliant').replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>

            <div className="ai-gov-studio-risk-badge">
              <span className="ai-gov-studio-risk-label">EU AI Act (Annex III)</span>
              <span className="ai-gov-studio-risk-val">HIGH-RISK EMPLOYMENT</span>
            </div>

            <button
              type="button"
              className="ai-gov-studio-close-btn"
              data-testid="close-ai-governance-studio"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="ai-gov-studio-tabs" aria-label="Các phân hệ AI Governance">
          <button
            type="button"
            className={`ai-gov-studio-tab-btn ${activeTab === 'eval' ? 'active' : ''}`}
            data-testid="tab-eval-leaderboard"
            onClick={() => setActiveTab('eval')}
          >
            📊 LLM Benchmark Leaderboard
          </button>
          <button
            type="button"
            className={`ai-gov-studio-tab-btn ${activeTab === 'economics' ? 'active' : ''}`}
            data-testid="tab-token-economics"
            onClick={() => setActiveTab('economics')}
          >
            💎 Token Economics & Cascade
          </button>
          <button
            type="button"
            className={`ai-gov-studio-tab-btn ${activeTab === 'guardrails' ? 'active' : ''}`}
            data-testid="tab-responsible-ai"
            onClick={() => setActiveTab('guardrails')}
          >
            🛡️ Responsible AI & PII
          </button>
          <button
            type="button"
            className={`ai-gov-studio-tab-btn ${activeTab === 'rag' ? 'active' : ''}`}
            data-testid="tab-rag-governance"
            onClick={() => setActiveTab('rag')}
          >
            🔍 RAG & Vector Index
          </button>
          <button
            type="button"
            className={`ai-gov-studio-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
            data-testid="tab-board-memorandum"
            onClick={() => setActiveTab('compliance')}
          >
            📑 EU AI Act & Board Memo
          </button>
        </nav>

        <div className="ai-gov-studio-body">
          {loading ? (
            <div className="ai-gov-studio-loading">
              <div className="ai-gov-studio-spinner" />
              <span>Đang tải telemetry AI Governance & LLM Evaluation...</span>
            </div>
          ) : (
            <>
              {activeTab === 'eval' && (
                <div className="ai-gov-studio-tab-pane" data-testid="pane-eval">
                  <div className="ai-gov-studio-kpi-grid">
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Average Task Accuracy</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="eval-avg-accuracy">
                        {overview?.evaluationOverview.averageAccuracyPercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Benchmark target: &gt;= 90.0%</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Hallucination Rate</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="eval-avg-hallucination">
                        {overview?.evaluationOverview.averageHallucinationRatePercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Bounded threshold: &lt;= 3.0%</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Fastest P50 Latency</span>
                      <span className="ai-gov-studio-kpi-value">
                        {overview?.evaluationOverview.fastestModelLatencyMs} ms
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Llama 3.1 70B local inference</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Evaluated Models</span>
                      <span className="ai-gov-studio-kpi-value">
                        {overview?.evaluationOverview.totalEvaluatedModels} Models
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Frontier + Open-Weight MoE</span>
                    </div>
                  </div>

                  <div className="ai-gov-studio-panel-card">
                    <div className="ai-gov-studio-panel-header">
                      <div>
                        <h3 className="ai-gov-studio-panel-title">Multi-Model Benchmark Leaderboard</h3>
                        <p className="ai-gov-studio-panel-desc">
                          Empirical benchmark scoring across task accuracy, hallucination diagnostics, semantic coherence and p95 token latency.
                        </p>
                      </div>
                      <div className="ai-gov-studio-panel-actions">
                        <select
                          className="ai-gov-studio-select"
                          value={evalDomain}
                          onChange={(e) => setEvalDomain(e.target.value as EvaluationDomain)}
                          aria-label="Chọn lĩnh vực đánh giá"
                        >
                          <option value="job_matching">Job & Resume Matching</option>
                          <option value="interview_rubric">STAR Interview Rubrics</option>
                          <option value="code_generation">Technical Coding Tasks</option>
                          <option value="resume_parsing">Structural Resume Parsing</option>
                        </select>
                        <button
                          type="button"
                          className="ai-gov-studio-primary-btn"
                          data-testid="btn-run-evaluation"
                          disabled={evaluating}
                          onClick={handleRunEvaluation}
                        >
                          {evaluating ? 'Đang chạy benchmark...' : '⚡ Re-run Benchmark Evaluation'}
                        </button>
                      </div>
                    </div>

                    <div className="ai-gov-studio-table-container">
                      <table className="ai-gov-studio-table" data-testid="table-leaderboard">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Model / Architecture</th>
                            <th>Provider</th>
                            <th>Parameters</th>
                            <th>Accuracy</th>
                            <th>Hallucination</th>
                            <th>Coherence</th>
                            <th>Latency (P50/P95)</th>
                            <th>Throughput</th>
                            <th>Composite Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview?.evaluationOverview.models.map((m) => (
                            <tr key={m.id}>
                              <td>
                                <span className={`ai-gov-studio-rank-badge rank-${m.leaderboardRank}`}>
                                  #{m.leaderboardRank}
                                </span>
                              </td>
                              <td>
                                <div className="ai-gov-studio-model-name">{m.modelName}</div>
                                <div className="ai-gov-studio-model-sub">
                                  {m.isOpenWeight ? 'Open-Weight Weights' : 'Frontier Hosted API'}
                                </div>
                              </td>
                              <td>
                                <span className="ai-gov-studio-provider-tag">{m.provider.toUpperCase()}</span>
                              </td>
                              <td className="tabular-num">{m.parameterCountBillions}B</td>
                              <td className="tabular-num ai-gov-studio-green">{m.taskAccuracyPercent}%</td>
                              <td className="tabular-num ai-gov-studio-red">{m.hallucinationRatePercent}%</td>
                              <td className="tabular-num">{m.semanticCoherenceScore} / 100</td>
                              <td className="tabular-num">{m.p50LatencyMs} / {m.p95LatencyMs} ms</td>
                              <td className="tabular-num">{m.throughputTokensPerSec} tok/s</td>
                              <td>
                                <span className="ai-gov-studio-rating-badge">{m.compositeRating}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'economics' && (
                <div className="ai-gov-studio-tab-pane" data-testid="pane-token-economics">
                  <div className="ai-gov-studio-kpi-grid">
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Current Monthly AI Spend</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="monthly-ai-spend">
                        ${overview?.totalMonthlySpendUsd.toLocaleString()}
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Run-rate against $25k quota</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Cascade Arbitrage Savings</span>
                      <span className="ai-gov-studio-kpi-value ai-gov-studio-green" data-testid="cascade-savings-percent">
                        {overview?.cascadeSavingsPercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Versus unhedged frontier baseline</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Prompt Cache Hit Rate</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="cache-hit-rate">
                        {overview?.promptCacheHitRatePercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Prefix & system prompt reuse</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Monthly Cost Avoided</span>
                      <span className="ai-gov-studio-kpi-value ai-gov-studio-green">
                        ${overview?.tokenEconomicsOverview.cachingTelemetry.monthlyCachingCostAvoidedUsd.toLocaleString()}
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Direct provider discount savings</span>
                    </div>
                  </div>

                  <div className="ai-gov-studio-two-col">
                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">Model Token Rate Matrix</h3>
                      <p className="ai-gov-studio-panel-desc">Published unit economics per 1M tokens with KV cache discounts.</p>
                      <div className="ai-gov-studio-table-container">
                        <table className="ai-gov-studio-table">
                          <thead>
                            <tr>
                              <th>Model</th>
                              <th>Input / 1M</th>
                              <th>Cached Input / 1M</th>
                              <th>Output / 1M</th>
                              <th>Cache Discount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overview?.tokenEconomicsOverview.rates.map((r) => (
                              <tr key={r.modelId}>
                                <td><strong>{r.modelId}</strong></td>
                                <td className="tabular-num">${r.inputCostPerMillionTokensUsd.toFixed(2)}</td>
                                <td className="tabular-num ai-gov-studio-green">${r.cachedInputCostPerMillionTokensUsd.toFixed(3)}</td>
                                <td className="tabular-num">${r.outputCostPerMillionTokensUsd.toFixed(2)}</td>
                                <td>
                                  <span className="ai-gov-studio-discount-tag">-{r.effectiveCacheDiscountPercent}%</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">3-Tier Cascade Routing Architecture</h3>
                      <p className="ai-gov-studio-panel-desc">Workload distribution across distilled, balanced, and frontier reasoning models.</p>
                      <div className="ai-gov-studio-tier-list">
                        {overview?.tokenEconomicsOverview.routingTiers.map((t) => (
                          <div key={t.tier} className="ai-gov-studio-tier-item">
                            <div className="ai-gov-studio-tier-header">
                              <span className="ai-gov-studio-tier-title">{t.tierLabel}</span>
                              <span className="ai-gov-studio-tier-share">{t.routingSharePercent}% Volume</span>
                            </div>
                            <div className="ai-gov-studio-tier-detail">
                              <span>Assigned: <code>{t.assignedModelId}</code> ({t.parameterSizeRange})</span>
                              <span>Confidence Threshold: {(t.confidenceThreshold * 100).toFixed(0)}%</span>
                            </div>
                            <div className="ai-gov-studio-tier-tags">
                              {t.primaryWorkloads.map((w, idx) => (
                                <span key={idx} className="ai-gov-studio-workload-chip">{w}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="ai-gov-studio-panel-card">
                    <div className="ai-gov-studio-panel-header">
                      <div>
                        <h3 className="ai-gov-studio-panel-title">Interactive Model Cascade Arbitrage Simulator</h3>
                        <p className="ai-gov-studio-panel-desc">
                          Simulate blended monthly expenditure and financial arbitrage savings across custom workload shares.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="ai-gov-studio-primary-btn"
                        data-testid="btn-simulate-cascade"
                        onClick={handleSimulateCascade}
                      >
                        ⚡ Run Arbitrage Simulation
                      </button>
                    </div>

                    <div className="ai-gov-studio-simulator-grid">
                      <div className="ai-gov-studio-form-group">
                        <label>Monthly Requests</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={cascadeReqs}
                          onChange={(e) => setCascadeReqs(Number(e.target.value))}
                        />
                      </div>
                      <div className="ai-gov-studio-form-group">
                        <label>Avg Input Tokens / Req</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={cascadeAvgInput}
                          onChange={(e) => setCascadeAvgInput(Number(e.target.value))}
                        />
                      </div>
                      <div className="ai-gov-studio-form-group">
                        <label>Avg Output Tokens / Req</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={cascadeAvgOutput}
                          onChange={(e) => setCascadeAvgOutput(Number(e.target.value))}
                        />
                      </div>
                      <div className="ai-gov-studio-form-group">
                        <label>Tier 1 Distilled Share (%)</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={tier1Share}
                          onChange={(e) => setTier1Share(Number(e.target.value))}
                        />
                      </div>
                      <div className="ai-gov-studio-form-group">
                        <label>Tier 2 Balanced Share (%)</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={tier2Share}
                          onChange={(e) => setTier2Share(Number(e.target.value))}
                        />
                      </div>
                      <div className="ai-gov-studio-form-group">
                        <label>Tier 3 Frontier Share (%)</label>
                        <input
                          type="number"
                          className="ai-gov-studio-input"
                          value={tier3Share}
                          onChange={(e) => setTier3Share(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {simulationResult && (
                      <div className="ai-gov-studio-sim-result" data-testid="cascade-sim-results">
                        <div className="ai-gov-studio-sim-stat">
                          <span className="label">Unhedged Baseline</span>
                          <span className="val">${simulationResult.baselineFrontierOnlySpendUsd.toLocaleString()}</span>
                        </div>
                        <div className="ai-gov-studio-sim-stat">
                          <span className="label">Optimized Cascade</span>
                          <span className="val ai-gov-studio-green">${simulationResult.optimizedCascadeSpendUsd.toLocaleString()}</span>
                        </div>
                        <div className="ai-gov-studio-sim-stat">
                          <span className="label">Prompt Caching Savings</span>
                          <span className="val">${simulationResult.promptCachingSavingsUsd.toLocaleString()}</span>
                        </div>
                        <div className="ai-gov-studio-sim-stat">
                          <span className="label">Total Monthly Savings</span>
                          <span className="val ai-gov-studio-green" data-testid="sim-savings-usd">
                            ${simulationResult.totalMonthlySavingsUsd.toLocaleString()} ({simulationResult.savingsPercentage}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'guardrails' && (
                <div className="ai-gov-studio-tab-pane" data-testid="pane-responsible-ai">
                  <div className="ai-gov-studio-kpi-grid">
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Jailbreak Vulnerability Rate (JVR)</span>
                      <span className="ai-gov-studio-kpi-value ai-gov-studio-green" data-testid="jvr-stat">
                        {overview?.jailbreakVulnerabilityRatePercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Target threshold: &lt;= 1.0%</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Security Incident Mitigation</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="mitigation-rate-stat">
                        {overview?.responsibleAiOverview.attackMitigationRatePercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">
                        {overview?.responsibleAiOverview.blockedAttacksCount} / {overview?.responsibleAiOverview.totalSecurityIncidentsCount} attacks blocked
                      </span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Safety Index Score</span>
                      <span className="ai-gov-studio-kpi-value">
                        {overview?.responsibleAiOverview.safetyIndexScore} / 100
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Toxicity & Demographic Parity</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Active PII Masking Rules</span>
                      <span className="ai-gov-studio-kpi-value">
                        {overview?.responsibleAiOverview.rules.length} Active Rules
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Presidio regex + NER filters</span>
                    </div>
                  </div>

                  <div className="ai-gov-studio-two-col">
                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">PII Protection & Redaction Matrix</h3>
                      <p className="ai-gov-studio-panel-desc">Presidio-grade regex and named-entity recognition rules for client pre-filtering.</p>
                      <div className="ai-gov-studio-table-container">
                        <table className="ai-gov-studio-table">
                          <thead>
                            <tr>
                              <th>Entity Type</th>
                              <th>NER / Regex Target</th>
                              <th>Strategy</th>
                              <th>Confidence</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {overview?.responsibleAiOverview.rules.map((rule) => (
                              <tr key={rule.id}>
                                <td>
                                  <span className="ai-gov-studio-entity-tag">{rule.entityType.toUpperCase()}</span>
                                </td>
                                <td><code>{rule.nerModelTarget}</code></td>
                                <td>{rule.redactionStrategy}</td>
                                <td className="tabular-num">{(rule.detectionConfidenceThreshold * 100).toFixed(0)}%</td>
                                <td>
                                  <span className="ai-gov-studio-active-tag">Active</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">Interactive PII Redaction Sandbox</h3>
                      <p className="ai-gov-studio-panel-desc">Test real-time sanitization on candidate profiles, offer letters, or prompts.</p>
                      
                      <div className="ai-gov-studio-form-group">
                        <label>Raw Input Prompt</label>
                        <textarea
                          className="ai-gov-studio-textarea"
                          rows={3}
                          value={piiInputText}
                          data-testid="pii-sandbox-input"
                          onChange={(e) => setPiiInputText(e.target.value)}
                        />
                      </div>

                      <div className="ai-gov-studio-sandbox-controls">
                        <select
                          className="ai-gov-studio-select"
                          value={piiStrategy}
                          onChange={(e) => setPiiStrategy(e.target.value as PiiRedactionStrategy)}
                          aria-label="Chọn chiến lược che giấu"
                        >
                          <option value="full_mask">Full Mask ([REDACTED_TYPE])</option>
                          <option value="synthetic_token">Synthetic Token ([SYNTHETIC_EMAIL_1])</option>
                          <option value="pseudonymized_hash">Pseudonymized Hash ([HASH_7f3b2a])</option>
                        </select>
                        <button
                          type="button"
                          className="ai-gov-studio-primary-btn"
                          data-testid="btn-test-masking"
                          onClick={handleTestPiiMasking}
                        >
                          🔒 Sanitize Prompt
                        </button>
                      </div>

                      {piiSanitizedOutput && (
                        <div className="ai-gov-studio-sandbox-output" data-testid="pii-sandbox-output">
                          <div className="output-header">
                            <span>Sanitized Payload ({piiRedactedCount} entities neutralized)</span>
                          </div>
                          <div className="output-text">{piiSanitizedOutput}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ai-gov-studio-panel-card">
                    <h3 className="ai-gov-studio-panel-title">Security Incidents & Adversarial Jailbreak Log</h3>
                    <p className="ai-gov-studio-panel-desc">Real-time log of blocked prompt injection vectors, context poisoning attempts, and persona overrides.</p>
                    <div className="ai-gov-studio-table-container">
                      <table className="ai-gov-studio-table" data-testid="table-incidents">
                        <thead>
                          <tr>
                            <th>Threat Vector</th>
                            <th>Severity</th>
                            <th>Status</th>
                            <th>Payload Snippet</th>
                            <th>Blocked Trigger Pattern</th>
                            <th>Origin IP</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {overview?.responsibleAiOverview.recentIncidents.map((inc) => (
                            <tr key={inc.id}>
                              <td><strong>{inc.threatType.replace(/_/g, ' ').toUpperCase()}</strong></td>
                              <td>
                                <span className={`ai-gov-studio-sev-badge sev-${inc.severity}`}>{inc.severity.toUpperCase()}</span>
                              </td>
                              <td>
                                <span className={`ai-gov-studio-status-pill status-${inc.status}`}>{inc.status.toUpperCase()}</span>
                              </td>
                              <td><code>{inc.detectedPayloadSnippet}</code></td>
                              <td><code>{inc.blockedTriggerPattern}</code></td>
                              <td className="tabular-num">{inc.originTenantOrIp}</td>
                              <td>
                                {inc.status !== 'mitigated' ? (
                                  <button
                                    type="button"
                                    className="ai-gov-studio-subtle-btn"
                                    onClick={() => handleResolveIncident(inc.id)}
                                  >
                                    Mitigate
                                  </button>
                                ) : (
                                  <span className="ai-gov-studio-check-icon">✓ Mitigated</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rag' && (
                <div className="ai-gov-studio-tab-pane" data-testid="pane-rag-governance">
                  <div className="ai-gov-studio-kpi-grid">
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Mean Reciprocal Rank (MRR)</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="rag-mrr-stat">
                        {overview?.mrrScore}
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Benchmark target: &gt;= 0.850</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">NDCG@10 Score</span>
                      <span className="ai-gov-studio-kpi-value" data-testid="rag-ndcg-stat">
                        {overview?.ragOverview.retrievalMetrics.ndcgAt10}
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Discounted Cumulative Gain</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Hit Rate @ 5</span>
                      <span className="ai-gov-studio-kpi-value ai-gov-studio-green">
                        {overview?.ragOverview.retrievalMetrics.hitRateAt5Percent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Top-5 relevant recall</span>
                    </div>
                    <div className="ai-gov-studio-kpi-card">
                      <span className="ai-gov-studio-kpi-label">Semantic Embedding Drift</span>
                      <span className="ai-gov-studio-kpi-value">
                        {overview?.ragOverview.driftReport.semanticDriftPercent}%
                      </span>
                      <span className="ai-gov-studio-kpi-hint">Alert threshold: 2.50%</span>
                    </div>
                  </div>

                  <div className="ai-gov-studio-two-col">
                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">Vector Index Telemetry</h3>
                      <p className="ai-gov-studio-panel-desc">Primary production vector index dimensions, fragmentation and memory footprint.</p>
                      {overview?.ragOverview.primaryIndex && (
                        <div className="ai-gov-studio-index-card">
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Index Name:</span>
                            <span className="val"><strong>{overview.ragOverview.primaryIndex.indexName}</strong></span>
                          </div>
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Database Engine:</span>
                            <span className="val">{overview.ragOverview.primaryIndex.databaseType.toUpperCase()}</span>
                          </div>
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Dimensionality:</span>
                            <span className="val">{overview.ragOverview.primaryIndex.dimensionality} Dimensions ({overview.ragOverview.primaryIndex.distanceMetric})</span>
                          </div>
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Vector Count:</span>
                            <span className="val tabular-num">{overview.ragOverview.primaryIndex.totalVectorsCount.toLocaleString()} embeddings</span>
                          </div>
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Index Size:</span>
                            <span className="val tabular-num">{overview.ragOverview.primaryIndex.indexSizeMb} MB</span>
                          </div>
                          <div className="ai-gov-studio-index-row">
                            <span className="label">Fragmentation:</span>
                            <span className="val tabular-num">{overview.ragOverview.primaryIndex.fragmentationRatioPercent}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">Chunking Window & Retrieval Tuner</h3>
                      <p className="ai-gov-studio-panel-desc">Tune token windowing and overlap to maximize context density while mitigating truncation.</p>
                      
                      <div className="ai-gov-studio-simulator-grid">
                        <div className="ai-gov-studio-form-group">
                          <label>Chunk Size (Tokens)</label>
                          <input
                            type="number"
                            className="ai-gov-studio-input"
                            value={chunkSize}
                            onChange={(e) => setChunkSize(Number(e.target.value))}
                          />
                        </div>
                        <div className="ai-gov-studio-form-group">
                          <label>Chunk Overlap (Tokens)</label>
                          <input
                            type="number"
                            className="ai-gov-studio-input"
                            value={chunkOverlap}
                            onChange={(e) => setChunkOverlap(Number(e.target.value))}
                          />
                        </div>
                        <div className="ai-gov-studio-form-group">
                          <label>Indexing Strategy</label>
                          <select
                            className="ai-gov-studio-select"
                            value={indexingStrategy}
                            onChange={(e) => setIndexingStrategy(e.target.value as any)}
                          >
                            <option value="semantic_parent">Semantic Parent-Child</option>
                            <option value="hierarchical">Hierarchical Chunking</option>
                            <option value="flat">Flat Fixed-Length</option>
                          </select>
                        </div>
                      </div>

                      <div className="ai-gov-studio-panel-actions" style={{ marginTop: '16px' }}>
                        <button
                          type="button"
                          className="ai-gov-studio-primary-btn"
                          data-testid="btn-tune-chunking"
                          disabled={tuningRag}
                          onClick={handleTuneChunking}
                        >
                          {tuningRag ? 'Đang tinh chỉnh...' : '🔧 Re-tune Index Chunking'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'compliance' && (
                <div className="ai-gov-studio-tab-pane" data-testid="pane-compliance-memo">
                  <div className="ai-gov-studio-two-col">
                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">EU AI Act (Annex III) 7-Point Technical Dossier</h3>
                      <p className="ai-gov-studio-panel-desc">Mandatory statutory checklist for High-Risk Employment AI systems.</p>
                      <div className="ai-gov-studio-checklist">
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Risk Management System (Article 9):</strong>
                            <p>Continuous identification and mitigation of recruitment bias and false rejections.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Data Governance & Training Quality (Article 10):</strong>
                            <p>Demographic parity checks and validated dataset provenance without discriminatory bias.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Technical Documentation (Article 11):</strong>
                            <p>Comprehensive system architecture, prompt versions and parameter sizing logged.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Automatic Record-Keeping & Logging (Article 12):</strong>
                            <p>Audit logging of all LLM evaluation runs, model cascade decisions and token telemetry.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Transparency & Candidate Information (Article 13):</strong>
                            <p>Clear disclosure notices informing candidates of AI-assisted scoring and rubrics.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Human-in-the-Loop Oversight (Article 14):</strong>
                            <p>Recruiter manual override authority over any automated AI screening or filtering.</p>
                          </div>
                        </div>
                        <div className="ai-gov-studio-check-item">
                          <span className="icon">✅</span>
                          <div>
                            <strong>Cybersecurity & Robustness (Article 15):</strong>
                            <p>Jailbreak vulnerability rate bounded below 1.0% with active prompt injection defense.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="ai-gov-studio-panel-card">
                      <h3 className="ai-gov-studio-panel-title">NIST AI RMF 1.0 Maturity Scorecard</h3>
                      <p className="ai-gov-studio-panel-desc">4 core functions scored under the US NIST Artificial Intelligence Risk Management Framework.</p>
                      <div className="ai-gov-studio-nist-grid">
                        <div className="ai-gov-studio-nist-card">
                          <span className="title">GOVERN</span>
                          <span className="score">92.0 / 100</span>
                          <span className="stage">Stage: RUN</span>
                        </div>
                        <div className="ai-gov-studio-nist-card">
                          <span className="title">MAP</span>
                          <span className="score">88.5 / 100</span>
                          <span className="stage">Stage: RUN</span>
                        </div>
                        <div className="ai-gov-studio-nist-card">
                          <span className="title">MEASURE</span>
                          <span className="score">91.0 / 100</span>
                          <span className="stage">Stage: RUN</span>
                        </div>
                        <div className="ai-gov-studio-nist-card">
                          <span className="title">MANAGE</span>
                          <span className="score">89.5 / 100</span>
                          <span className="stage">Stage: RUN</span>
                        </div>
                      </div>

                      <div className="ai-gov-studio-memo-actions" style={{ marginTop: '24px' }}>
                        <div className="ai-gov-studio-form-group">
                          <label>Memorandum Title</label>
                          <input
                            type="text"
                            className="ai-gov-studio-input"
                            value={memoTitle}
                            onChange={(e) => setMemoTitle(e.target.value)}
                          />
                        </div>
                        <div className="ai-gov-studio-form-group">
                          <label>Fiscal Period</label>
                          <input
                            type="text"
                            className="ai-gov-studio-input"
                            value={fiscalQuarter}
                            onChange={(e) => setFiscalQuarter(e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="ai-gov-studio-primary-btn"
                          data-testid="btn-generate-board-memo"
                          disabled={generatingMemo}
                          onClick={handleGenerateMemo}
                        >
                          {generatingMemo ? 'Đang soạn thảo...' : '📝 Generate Board Memorandum'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {overview?.latestBoardMemo && (
                    <div className="ai-gov-studio-panel-card" data-testid="board-memo-section">
                      <div className="ai-gov-studio-panel-header">
                        <div>
                          <h3 className="ai-gov-studio-panel-title">{overview.latestBoardMemo.title}</h3>
                          <div className="ai-gov-studio-panel-desc">
                            Fiscal Quarter: {overview.latestBoardMemo.fiscalQuarter} | Status:{' '}
                            <span className={`ai-gov-studio-status-pill status-${overview.latestBoardMemo.status}`}>
                              {overview.latestBoardMemo.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="ai-gov-studio-subtle-btn"
                          onClick={handleCopyMemoMarkdown}
                        >
                          {copiedMemo ? '✓ Đã sao chép Markdown' : '📋 Sao chép Markdown'}
                        </button>
                      </div>

                      <div className="ai-gov-studio-memo-container">
                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.executiveSummary.heading}</h4>
                          <p>{overview.latestBoardMemo.executiveSummary.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.executiveSummary.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                          <div className="ai-gov-studio-guidance">
                            <strong>Executive Recommendation:</strong> {overview.latestBoardMemo.executiveSummary.strategicGovernanceGuidance}
                          </div>
                        </div>

                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.evaluationScorecard.heading}</h4>
                          <p>{overview.latestBoardMemo.evaluationScorecard.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.evaluationScorecard.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.tokenEconomicsCascade.heading}</h4>
                          <p>{overview.latestBoardMemo.tokenEconomicsCascade.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.tokenEconomicsCascade.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.responsibleAiGuardrails.heading}</h4>
                          <p>{overview.latestBoardMemo.responsibleAiGuardrails.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.responsibleAiGuardrails.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.ragVectorGovernance.heading}</h4>
                          <p>{overview.latestBoardMemo.ragVectorGovernance.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.ragVectorGovernance.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="ai-gov-studio-memo-section">
                          <h4>{overview.latestBoardMemo.regulatoryComplianceDirectives.heading}</h4>
                          <p>{overview.latestBoardMemo.regulatoryComplianceDirectives.executiveSummaryText}</p>
                          <ul>
                            {overview.latestBoardMemo.regulatoryComplianceDirectives.keyMetricsBulletPoints.map((pt, i) => (
                              <li key={i}>{pt}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="ai-gov-studio-signoff-bar">
                          <div className="ai-gov-studio-signoff-role">
                            <span className="role-title">VP of AI / Machine Learning</span>
                            {overview.latestBoardMemo.approvedByVpAiAt ? (
                              <span className="approved-pill">✓ Approved</span>
                            ) : (
                              <button
                                type="button"
                                className="ai-gov-studio-primary-btn"
                                data-testid="sign-vp-ai"
                                onClick={() => handleApproveMemo('vp_ai')}
                              >
                                Sign as VP of AI
                              </button>
                            )}
                          </div>

                          <div className="ai-gov-studio-signoff-role">
                            <span className="role-title">Chief Legal Officer / General Counsel</span>
                            {overview.latestBoardMemo.approvedByChiefLegalOfficerAt ? (
                              <span className="approved-pill">✓ Approved</span>
                            ) : (
                              <button
                                type="button"
                                className="ai-gov-studio-primary-btn"
                                data-testid="sign-clo"
                                onClick={() => handleApproveMemo('chief_legal_officer')}
                              >
                                Sign as Chief Legal Officer
                              </button>
                            )}
                          </div>

                          <div className="ai-gov-studio-signoff-role">
                            <span className="role-title">Chief Technology Officer</span>
                            {overview.latestBoardMemo.approvedByCtoAt ? (
                              <span className="approved-pill">✓ Approved</span>
                            ) : (
                              <button
                                type="button"
                                className="ai-gov-studio-primary-btn"
                                data-testid="sign-cto"
                                onClick={() => handleApproveMemo('cto')}
                              >
                                Sign as CTO
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
