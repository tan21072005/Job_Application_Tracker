import React, { useState, useEffect } from 'react';
import {
  type SupplyChainStudioOverviewDTO,
  type SupplierBomNodeDTO,
  type GeopoliticalExposureDTO,
  type InventoryBufferDTO,
  type SourcingHubModelDTO,
  type SupplyChainBoardMemorandumDTO,
  type DisruptionSimulationResultDTO,
  type HubCostComparisonResultDTO,
  type BoardSignoffRole,
  type SupplyTier,
  type ComponentCriticality,
  type SourcingStrategy
} from '../domain';
import { supplyChainResilienceStudioRepository } from '../data';

interface SupplyChainResilienceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupplyChainResilienceStudioModal: React.FC<SupplyChainResilienceStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'bom' | 'geopolitical' | 'buffers' | 'hubs' | 'war_room'>('bom');
  const [overview, setOverview] = useState<SupplyChainStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [simSku, setSimSku] = useState<string>('SKU-MCU-3305');
  const [simDelayDays, setSimDelayDays] = useState<number>(30);
  const [simDemandSurge, setSimDemandSurge] = useState<number>(20);
  const [simResult, setSimResult] = useState<DisruptionSimulationResultDTO | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [compareBaselineId, setCompareBaselineId] = useState<string>('hub-01');
  const [compareCandidateId, setCompareCandidateId] = useState<string>('hub-02');
  const [compareVolume, setCompareVolume] = useState<number>(100000);
  const [compareResult, setCompareResult] = useState<HubCostComparisonResultDTO | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);

  const [isAddingBom, setIsAddingBom] = useState<boolean>(false);
  const [newPartNumber, setNewPartNumber] = useState<string>('PCBA-8002');
  const [newComponentName, setNewComponentName] = useState<string>('Auxiliary Telemetry Controller');
  const [newTier, setNewTier] = useState<SupplyTier>('tier_2_subassembly');
  const [newSupplierName, setNewSupplierName] = useState<string>('Shinsei Precision Co');
  const [newSupplierCountry, setNewSupplierCountry] = useState<string>('Japan');
  const [newCriticality, setNewCriticality] = useState<ComponentCriticality>('high');
  const [newSourcingStrategy, setNewSourcingStrategy] = useState<SourcingStrategy>('dual_source');
  const [newSpendShare, setNewSpendShare] = useState<number>(45);
  const [newLeadTime, setNewLeadTime] = useState<number>(35);
  const [newAnnualSpend, setNewAnnualSpend] = useState<number>(3500000);

  const [activeMemo, setActiveMemo] = useState<SupplyChainBoardMemorandumDTO | null>(null);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState<boolean>(false);
  const [isScreening, setIsScreening] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await supplyChainResilienceStudioRepository.getOverview();
      setOverview(data);
      if (data.recentMemos && data.recentMemos.length > 0) {
        setActiveMemo(data.recentMemos[0]);
      }
      if (data.networkSummary.allHubs.length >= 2) {
        setCompareBaselineId(data.networkSummary.allHubs[0].id);
        setCompareCandidateId(data.networkSummary.allHubs[1].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load supply chain telemetry');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await supplyChainResilienceStudioRepository.simulateLeadTimeDisruption({
        sku: simSku,
        simulatedDelayDays: Number(simDelayDays),
        demandSurgePercent: Number(simDemandSurge),
        disruptionProbabilityPercent: 40
      });
      setSimResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCompareHubs = async () => {
    setIsComparing(true);
    try {
      const res = await supplyChainResilienceStudioRepository.compareHubLandedCosts({
        baselineHubId: compareBaselineId,
        candidateHubIds: [compareCandidateId],
        annualProductionVolumeUnits: Number(compareVolume),
        annualHoldingCostRatePercent: 15
      });
      setCompareResult(res);
    } catch (err: any) {
      setError(err.message || 'Hub comparison failed');
    } finally {
      setIsComparing(false);
    }
  };

  const handleRescreenSanctions = async () => {
    setIsScreening(true);
    try {
      const updated = await supplyChainResilienceStudioRepository.screenSanctions();
      if (overview) {
        setOverview({
          ...overview,
          geopoliticalSummary: {
            ...overview.geopoliticalSummary,
            exposures: updated
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Sanctions screening failed');
    } finally {
      setIsScreening(false);
    }
  };

  const handleSaveBomNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const node = await supplyChainResilienceStudioRepository.saveBomNode({
        partNumber: newPartNumber,
        componentName: newComponentName,
        tier: newTier,
        supplierName: newSupplierName,
        supplierCountry: newSupplierCountry,
        criticality: newCriticality,
        sourcingStrategy: newSourcingStrategy,
        spendVolumeSharePercent: Number(newSpendShare),
        nominalLeadTimeDays: Number(newLeadTime),
        annualSpendUsd: Number(newAnnualSpend)
      });
      setIsAddingBom(false);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to save BOM component');
    }
  };

  const handleGenerateMemo = async () => {
    setIsGeneratingMemo(true);
    try {
      const memo = await supplyChainResilienceStudioRepository.generateBoardMemorandum({
        fiscalQuarter: 'Q4-2026',
        title: 'Executive Supply Chain Resilience & Logistics Strategy'
      });
      setActiveMemo(memo);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize board memorandum');
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  const handleSignOff = async (role: BoardSignoffRole) => {
    if (!activeMemo) return;
    try {
      const updated = await supplyChainResilienceStudioRepository.signOffBoardMemorandum(
        activeMemo.id,
        role,
        'Executive authorization ratified.'
      );
      setActiveMemo(updated);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Sign-off failed');
    }
  };

  const formatUsd = (val: number) => {
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (val >= 1_000) {
      return `$${(val / 1_000).toFixed(0)}K`;
    }
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="sc-studio-backdrop" data-testid="supply-chain-resilience-studio-modal">
      <div className="sc-studio-container">
        <div className="sc-studio-header">
          <div className="sc-studio-header-title">
            <div className="sc-studio-icon-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--sky-400)" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--sky-50)' }}>
                  Enterprise Supply Chain Resilience & Geopolitical Risk Command Studio
                </h2>
                {overview && (
                  <>
                    <span className={`sc-badge sc-badge-${overview.resilienceRatingBand}`}>
                      {overview.resilienceRatingBand.toUpperCase()}
                    </span>
                    <span className={`sc-badge sc-badge-${overview.crisisSeverity === 'tier_3_crisis_war_room' ? 'war-room' : overview.crisisSeverity === 'tier_2_warning' ? 'warn' : 'watch'}`}>
                      {overview.crisisSeverity.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                Multi-Tier BOM Transparency, Sovereign Risk & OFAC Screening, Lead-Time Volatility, and Total Landed Cost (TLC) Arbitrage
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {overview && (
              <div className="sc-studio-header-stat">
                <span style={{ fontSize: '0.65rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>Composite SCRI</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sky-400)' }}>
                  {overview.compositeScri} <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>/ 100</span>
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="sc-studio-btn-ghost"
              data-testid="close-supply-chain-resilience-studio"
              title="Close Studio"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="sc-studio-nav">
          <button
            className={`sc-studio-tab ${activeTab === 'bom' ? 'active' : ''}`}
            onClick={() => setActiveTab('bom')}
            data-testid="sc-tab-bom"
          >
            Tier 1-4 BOM & Concentration
          </button>
          <button
            className={`sc-studio-tab ${activeTab === 'geopolitical' ? 'active' : ''}`}
            onClick={() => setActiveTab('geopolitical')}
            data-testid="sc-tab-geopolitical"
          >
            Geopolitics, Sanctions & Tariffs
          </button>
          <button
            className={`sc-studio-tab ${activeTab === 'buffers' ? 'active' : ''}`}
            onClick={() => setActiveTab('buffers')}
            data-testid="sc-tab-buffers"
          >
            Disruption Simulation & Safety Stock
          </button>
          <button
            className={`sc-studio-tab ${activeTab === 'hubs' ? 'active' : ''}`}
            onClick={() => setActiveTab('hubs')}
            data-testid="sc-tab-hubs"
          >
            Nearshoring & Landed Cost (TLC)
          </button>
          <button
            className={`sc-studio-tab ${activeTab === 'war_room' ? 'active' : ''}`}
            onClick={() => setActiveTab('war_room')}
            data-testid="sc-tab-war-room"
          >
            Crisis War Room & Board Memo
          </button>
        </div>

        <div className="sc-studio-body">
          {loading && (
            <div className="sc-studio-loading">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--sky-400)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
              </svg>
              <p style={{ marginTop: '12px', color: 'var(--slate-400)', fontSize: '0.85rem' }}>Loading Supply Chain Telemetry...</p>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', color: 'var(--red-300)', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          {!loading && overview && (
            <>
              {activeTab === 'bom' && (
                <div className="sc-tab-content">
                  <div className="sc-grid-4">
                    <div className="sc-card">
                      <span className="sc-stat-title">Mapped Components</span>
                      <span className="sc-stat-value">{overview.totalMappedComponents}</span>
                      <span className="sc-stat-sub">Across Tiers 1 through 4</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Single Point Failures</span>
                      <span className="sc-stat-value" style={{ color: overview.singlePointOfFailureCount > 0 ? 'var(--red-400)' : 'var(--emerald-400)' }}>
                        {overview.singlePointOfFailureCount}
                      </span>
                      <span className="sc-stat-sub">Zero substitute redundancy</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Concentration (HHI)</span>
                      <span className="sc-stat-value">{overview.aggregateHhiIndex}</span>
                      <span className="sc-stat-sub">{overview.aggregateHhiIndex > 2500 ? 'High Market Concentration' : 'Moderate Concentration'}</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Dual Sourcing Ratio</span>
                      <span className="sc-stat-value">{overview.dualSourcingRatioPercent}%</span>
                      <span className="sc-stat-sub">Target: &ge; 75.0%</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--sky-50)' }}>
                      N-Tier Bill of Materials Vulnerability Ledger
                    </h3>
                    <button
                      className="sc-btn-primary"
                      onClick={() => setIsAddingBom(true)}
                      data-testid="sc-btn-add-bom"
                    >
                      + Add BOM Component
                    </button>
                  </div>

                  <div className="sc-table-container">
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th>Part Number</th>
                          <th>Component Name</th>
                          <th>Supply Tier</th>
                          <th>Supplier & Country</th>
                          <th>Criticality</th>
                          <th>Strategy</th>
                          <th>Spend Share</th>
                          <th>Lead Time</th>
                          <th>Annual Spend</th>
                          <th>BOM Vuln</th>
                          <th>SPOF Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.bomSummary.nodes.map((node) => (
                          <tr key={node.id}>
                            <td style={{ fontWeight: 600, color: 'var(--sky-400)' }}>{node.partNumber}</td>
                            <td>{node.componentName}</td>
                            <td>
                              <span className="sc-badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--slate-300)' }}>
                                {node.tier.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>{node.supplierName} ({node.supplierCountry})</td>
                            <td>
                              <span className="sc-badge" style={{
                                background: node.criticality === 'existential' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                                color: node.criticality === 'existential' ? 'var(--red-400)' : 'var(--amber-400)'
                              }}>
                                {node.criticality.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>{node.sourcingStrategy.replace(/_/g, ' ')}</td>
                            <td>{node.spendVolumeSharePercent}%</td>
                            <td>{node.nominalLeadTimeDays}d</td>
                            <td>{formatUsd(node.annualSpendUsd)}</td>
                            <td>{node.bomVulnerabilityScore}/100</td>
                            <td>
                              {node.isSinglePointOfFailure ? (
                                <span className="sc-badge sc-badge-crisis">SPOF RISK</span>
                              ) : (
                                <span className="sc-badge sc-badge-elite">DUAL SOURCED</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'geopolitical' && (
                <div className="sc-tab-content">
                  <div className="sc-grid-4">
                    <div className="sc-card">
                      <span className="sc-stat-title">Countries Monitored</span>
                      <span className="sc-stat-value">{overview.geopoliticalSummary.totalCountriesMonitored}</span>
                      <span className="sc-stat-sub">Sovereign jurisdictions</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">High-Risk Jurisdictions</span>
                      <span className="sc-stat-value" style={{ color: 'var(--amber-400)' }}>
                        {overview.geopoliticalSummary.highRiskJurisdictionCount}
                      </span>
                      <span className="sc-stat-sub">Composite risk &ge; 50</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Sanction Flags</span>
                      <span className="sc-stat-value" style={{ color: overview.activeSanctionFlagsCount > 0 ? 'var(--red-400)' : 'var(--emerald-400)' }}>
                        {overview.activeSanctionFlagsCount}
                      </span>
                      <span className="sc-stat-sub">OFAC / BIS Entity List</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Annual Tariff Exposure</span>
                      <span className="sc-stat-value">{formatUsd(overview.totalAnnualTariffExposureUsd)}</span>
                      <span className="sc-stat-sub">Section 301/232 Surcharges</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--sky-50)' }}>
                      Sovereign Risk, Sanctions Screening & Maritime Chokepoint Tracking
                    </h3>
                    <button
                      className="sc-btn-secondary"
                      onClick={handleRescreenSanctions}
                      disabled={isScreening}
                      data-testid="sc-btn-rescreen-sanctions"
                    >
                      {isScreening ? 'Screening OFAC/EAR...' : 'Automated Sanctions Re-Screen'}
                    </button>
                  </div>

                  <div className="sc-table-container">
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th>Country</th>
                          <th>Stability</th>
                          <th>Trade Freedom</th>
                          <th>Composite Risk</th>
                          <th>Sanctions Status</th>
                          <th>Primary HTS</th>
                          <th>Section 301 Tariff</th>
                          <th>Maritime Chokepoint</th>
                          <th>Chokepoint Risk</th>
                          <th>Detour Days</th>
                          <th>Annual Tariffs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.geopoliticalSummary.exposures.map((exp) => (
                          <tr key={exp.id}>
                            <td style={{ fontWeight: 600, color: 'var(--sky-400)' }}>{exp.countryName} ({exp.countryCode})</td>
                            <td>{exp.politicalStabilityScore}/100</td>
                            <td>{exp.tradeFreedomScore}/100</td>
                            <td>
                              <span className={`sc-badge ${exp.compositeCountryRisk >= 50 ? 'sc-badge-vulnerable' : 'sc-badge-elite'}`}>
                                {exp.compositeCountryRisk}/100
                              </span>
                            </td>
                            <td>
                              <span className={`sc-badge ${exp.sanctionStatus === 'flagged_restricted' ? 'sc-badge-crisis' : 'sc-badge-elite'}`}>
                                {exp.sanctionStatus.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{exp.primaryHtsCode}</td>
                            <td>{exp.section301TariffPercent}%</td>
                            <td>{exp.primaryMaritimeRoute.join(', ') || 'N/A (Landlocked/Direct)'}</td>
                            <td>{exp.chokepointRiskScore}/100</td>
                            <td>+{exp.alternateRouteDetourDays}d</td>
                            <td>{formatUsd(exp.annualTariffExposureUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'buffers' && (
                <div className="sc-tab-content">
                  <div className="sc-grid-4">
                    <div className="sc-card">
                      <span className="sc-stat-title">Tracked Critical SKUs</span>
                      <span className="sc-stat-value">{overview.bufferSummary.totalSkusTracked}</span>
                      <span className="sc-stat-sub">Active buffer monitoring</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">TTS &lt; TTR Deficit SKUs</span>
                      <span className="sc-stat-value" style={{ color: overview.criticalBufferDeficitCount > 0 ? 'var(--red-400)' : 'var(--emerald-400)' }}>
                        {overview.criticalBufferDeficitCount}
                      </span>
                      <span className="sc-stat-sub">Stockout vulnerability</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Average DIO</span>
                      <span className="sc-stat-value">{overview.averageDioDays}d</span>
                      <span className="sc-stat-sub">Days of inventory outstanding</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Buffer Carrying Cost</span>
                      <span className="sc-stat-value">{formatUsd(overview.bufferSummary.totalBufferCarryingCostUsd)}</span>
                      <span className="sc-stat-sub">Annual holding cost</span>
                    </div>
                  </div>

                  <div className="sc-card sc-card-highlight" style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--sky-400)', fontWeight: 600 }}>
                        Stochastic Lead-Time Disruption & Monte Carlo Buffer Simulation
                      </h4>
                      <button
                        className="sc-btn-primary"
                        onClick={handleRunSimulation}
                        disabled={isSimulating}
                        data-testid="sc-btn-run-simulation"
                      >
                        {isSimulating ? 'Simulating...' : 'Run Disruption Simulation'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Target SKU</label>
                        <select
                          className="sc-input"
                          value={simSku}
                          onChange={(e) => setSimSku(e.target.value)}
                        >
                          {overview.bufferSummary.buffers.map((b) => (
                            <option key={b.sku} value={b.sku}>{b.sku} - {b.componentName}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Simulated Chokepoint Delay (Days)</label>
                        <input
                          type="number"
                          className="sc-input"
                          value={simDelayDays}
                          onChange={(e) => setSimDelayDays(Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Demand Surge Spike (%)</label>
                        <input
                          type="number"
                          className="sc-input"
                          value={simDemandSurge}
                          onChange={(e) => setSimDemandSurge(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {simResult && (
                      <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--custom-060d1a)', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sky-50)' }}>Simulation Results for {simResult.sku}:</span>
                          <span className={`sc-badge ${simResult.recoveryFeasibility === 'feasible_buffered' ? 'sc-badge-elite' : simResult.recoveryFeasibility === 'urgent_mitigation_needed' ? 'sc-badge-vulnerable' : 'sc-badge-crisis'}`}>
                            {simResult.recoveryFeasibility.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '8px', fontSize: '0.8rem' }}>
                          <div>Projected Stockout: <strong style={{ color: 'var(--red-400)' }}>{simResult.projectedStockoutDays} days</strong></div>
                          <div>Lost Revenue: <strong>{formatUsd(simResult.estimatedLostRevenueUsd)}</strong></div>
                          <div>Recommended Safety Stock: <strong style={{ color: 'var(--emerald-400)' }}>+{simResult.recommendedSafetyStockIncreaseUnits} units</strong></div>
                          <div>Working Capital: <strong>{formatUsd(simResult.incrementalWorkingCapitalUsd)}</strong></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sc-table-container">
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Component</th>
                          <th>Stock Units</th>
                          <th>Daily Demand</th>
                          <th>Lead Time</th>
                          <th>Safety Stock</th>
                          <th>Reorder Point</th>
                          <th>DIO</th>
                          <th>TTS (Survive)</th>
                          <th>TTR (Recover)</th>
                          <th>Deficit</th>
                          <th>Vulnerability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.bufferSummary.buffers.map((buf) => (
                          <tr key={buf.id}>
                            <td style={{ fontWeight: 600, color: 'var(--sky-400)' }}>{buf.sku}</td>
                            <td>{buf.componentName}</td>
                            <td>{buf.currentStockUnits.toLocaleString()}</td>
                            <td>{buf.averageDailyDemandUnits}/d</td>
                            <td>{buf.nominalLeadTimeDays}d</td>
                            <td>{buf.calculatedSafetyStockUnits.toLocaleString()}</td>
                            <td>{buf.reorderPointUnits.toLocaleString()}</td>
                            <td>{buf.daysOfInventoryOutstanding}d</td>
                            <td>{buf.timeToSurviveDays}d</td>
                            <td>{buf.timeToRecoverDays}d</td>
                            <td>
                              {buf.resilienceDeficitDays > 0 ? (
                                <strong style={{ color: 'var(--red-400)' }}>-{buf.resilienceDeficitDays}d</strong>
                              ) : (
                                <span style={{ color: 'var(--emerald-400)' }}>0d (Buffered)</span>
                              )}
                            </td>
                            <td>
                              <span className={`sc-badge ${buf.stockoutVulnerability === 'critical_breach' ? 'sc-badge-crisis' : buf.stockoutVulnerability === 'elevated' ? 'sc-badge-vulnerable' : 'sc-badge-elite'}`}>
                                {buf.stockoutVulnerability.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'hubs' && (
                <div className="sc-tab-content">
                  <div className="sc-grid-4">
                    <div className="sc-card">
                      <span className="sc-stat-title">Network Sourcing Hubs</span>
                      <span className="sc-stat-value">{overview.networkSummary.activeHubsCount}</span>
                      <span className="sc-stat-sub">Offshore, Nearshore, Onshore</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Asia Offshore TLC</span>
                      <span className="sc-stat-value">{formatUsd(overview.networkSummary.primaryOffshoreHub.totalLandedCostUsd)}</span>
                      <span className="sc-stat-sub">42 days transit lead time</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Mexico Nearshore TLC</span>
                      <span className="sc-stat-value" style={{ color: 'var(--emerald-400)' }}>
                        {formatUsd(overview.networkSummary.primaryNearshoreHub.totalLandedCostUsd)}
                      </span>
                      <span className="sc-stat-sub">4 days cross-border lead time</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Nearshoring Arbitrage</span>
                      <span className="sc-stat-value" style={{ color: 'var(--sky-400)' }}>
                        {formatUsd(overview.networkSummary.projectedAnnualNearshoringArbitrageUsd)}
                      </span>
                      <span className="sc-stat-sub">Annual potential savings</span>
                    </div>
                  </div>

                  <div className="sc-card sc-card-highlight" style={{ marginTop: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--sky-400)', fontWeight: 600 }}>
                        Total Landed Cost (TLC) & Multi-Hub Optimization Scenario Model
                      </h4>
                      <button
                        className="sc-btn-primary"
                        onClick={handleCompareHubs}
                        disabled={isComparing}
                        data-testid="sc-btn-compare-hubs"
                      >
                        {isComparing ? 'Comparing...' : 'Run Sourcing Cost Comparison'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Baseline Hub</label>
                        <select
                          className="sc-input"
                          value={compareBaselineId}
                          onChange={(e) => setCompareBaselineId(e.target.value)}
                        >
                          {overview.networkSummary.allHubs.map((h) => (
                            <option key={h.id} value={h.id}>{h.hubName} ({h.region})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Candidate Nearshore/Onshore Hub</label>
                        <select
                          className="sc-input"
                          value={compareCandidateId}
                          onChange={(e) => setCompareCandidateId(e.target.value)}
                        >
                          {overview.networkSummary.allHubs.map((h) => (
                            <option key={h.id} value={h.id}>{h.hubName} ({h.region})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '4px' }}>Annual Volume (Units)</label>
                        <input
                          type="number"
                          className="sc-input"
                          value={compareVolume}
                          onChange={(e) => setCompareVolume(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {compareResult && (
                      <div style={{ marginTop: '1rem', padding: '12px', background: 'var(--custom-060d1a)', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--sky-400)' }}>Comparative Optimization Analysis:</span>
                          <span className="sc-badge sc-badge-elite">{compareResult.landedCostDeltaPercent}% Net TLC Savings</span>
                        </div>
                        <p style={{ margin: '6px 0', fontSize: '0.8rem', color: 'var(--slate-200)' }}>{compareResult.optimalRecommendation}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '8px', fontSize: '0.8rem' }}>
                          <div>Annual Sourcing Savings: <strong style={{ color: 'var(--emerald-400)' }}>{formatUsd(compareResult.annualSavingsUsd)}</strong></div>
                          <div>Lead Time Reduction: <strong style={{ color: 'var(--sky-400)' }}>-{compareResult.leadTimeReductionDays} days</strong></div>
                          <div>Freight Carbon Delta: <strong style={{ color: 'var(--emerald-400)' }}>-{compareResult.freightCarbonDeltaPercent}% CO2e</strong></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sc-table-container">
                    <table className="sc-table">
                      <thead>
                        <tr>
                          <th>Hub Name</th>
                          <th>Region</th>
                          <th>Country</th>
                          <th>Transport Mode</th>
                          <th>Ex-Works</th>
                          <th>Freight</th>
                          <th>Customs Tariff</th>
                          <th>Pipeline Holding</th>
                          <th>Quality Scrap</th>
                          <th>Total Landed Cost</th>
                          <th>Lead Time</th>
                          <th>Carbon (kg/unit)</th>
                          <th>Agility</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.networkSummary.allHubs.map((hub) => (
                          <tr key={hub.id}>
                            <td style={{ fontWeight: 600, color: 'var(--sky-400)' }}>{hub.hubName}</td>
                            <td>{hub.region.replace(/_/g, ' ')}</td>
                            <td>{hub.country}</td>
                            <td>{hub.transportMode.replace(/_/g, ' ')}</td>
                            <td>${hub.exWorksUnitCostUsd.toFixed(2)}</td>
                            <td>${hub.freightPerUnitUsd.toFixed(2)}</td>
                            <td>${hub.customsTariffPerUnitUsd.toFixed(2)} ({hub.customsTariffPercent}%)</td>
                            <td>${hub.pipelineCarryingCostPerUnitUsd.toFixed(2)}</td>
                            <td>${hub.qualityScrapRiskPerUnitUsd.toFixed(2)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--sky-400)' }}>${hub.totalLandedCostUsd.toFixed(2)}</td>
                            <td>{hub.transitLeadTimeDays}d</td>
                            <td>{hub.totalTripCarbonKgCo2ePerUnit} kg</td>
                            <td>{hub.regionalAgilityRating}/100</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'war_room' && (
                <div className="sc-tab-content">
                  <div className="sc-grid-4">
                    <div className="sc-card">
                      <span className="sc-stat-title">Crisis Escalation Status</span>
                      <span className="sc-stat-value" style={{
                        color: overview.crisisSeverity === 'tier_3_crisis_war_room' ? 'var(--red-400)' : overview.crisisSeverity === 'tier_2_warning' ? 'var(--amber-400)' : 'var(--sky-400)'
                      }}>
                        {overview.crisisSeverity.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className="sc-stat-sub">Real-time incident tier</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Composite SCRI</span>
                      <span className="sc-stat-value">{overview.compositeScri} / 100</span>
                      <span className="sc-stat-sub">{overview.resilienceRatingBand.toUpperCase()}</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Financial Exposure</span>
                      <span className="sc-stat-value" style={{ color: 'var(--red-400)' }}>{formatUsd(overview.totalAnnualTariffExposureUsd)}</span>
                      <span className="sc-stat-sub">Tariff & chokepoint surcharges</span>
                    </div>
                    <div className="sc-card">
                      <span className="sc-stat-title">Nearshore Opportunity</span>
                      <span className="sc-stat-value" style={{ color: 'var(--emerald-400)' }}>{formatUsd(overview.potentialNearshoringArbitrageUsd)}</span>
                      <span className="sc-stat-sub">Annual arbitrage upside</span>
                    </div>
                  </div>

                  <div className="sc-card" style={{ marginTop: '1.25rem' }}>
                    <h4 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>
                      SCRI 5-Dimension Resilience Index Breakdown
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', fontSize: '0.8rem' }}>
                      <div className="sc-signoff-card">
                        <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.7rem' }}>SUPPLIER REDUNDANCY</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--sky-400)' }}>{overview.indexBreakdown.supplierRedundancyScore}</strong> / 100
                      </div>
                      <div className="sc-signoff-card">
                        <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.7rem' }}>GEOPOLITICAL STABILITY</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--sky-400)' }}>{overview.indexBreakdown.geopoliticalStabilityScore}</strong> / 100
                      </div>
                      <div className="sc-signoff-card">
                        <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.7rem' }}>BUFFER ADEQUACY</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--sky-400)' }}>{overview.indexBreakdown.bufferAdequacyScore}</strong> / 100
                      </div>
                      <div className="sc-signoff-card">
                        <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.7rem' }}>LANDED COST AGILITY</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--sky-400)' }}>{overview.indexBreakdown.landedCostAgilityScore}</strong> / 100
                      </div>
                      <div className="sc-signoff-card">
                        <span style={{ color: 'var(--slate-400)', display: 'block', fontSize: '0.7rem' }}>SANCTIONS IMMUNITY</span>
                        <strong style={{ fontSize: '1.2rem', color: 'var(--sky-400)' }}>{overview.indexBreakdown.sanctionsImmunityScore}</strong> / 100
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--sky-50)' }}>
                      Executive Supply Chain Resilience Board Memorandum
                    </h3>
                    <button
                      className="sc-btn-primary"
                      onClick={handleGenerateMemo}
                      disabled={isGeneratingMemo}
                      data-testid="sc-btn-generate-memo"
                    >
                      {isGeneratingMemo ? 'Synthesizing...' : 'Generate Q4-2026 Board Memorandum'}
                    </button>
                  </div>

                  {activeMemo && (
                    <div>
                      <div className="sc-memo-preview">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--slate-200)' }}>
                          {activeMemo.executiveSummaryMarkdown}
                        </pre>
                      </div>

                      <div style={{ marginTop: '1.25rem' }}>
                        <h4 style={{ margin: 0, marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--slate-400)', textTransform: 'uppercase' }}>
                          Tripartite Executive Governance Sign-Off Matrix
                        </h4>
                        <div className="sc-grid-3">
                          <div className="sc-signoff-card">
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block' }}>VP GLOBAL SUPPLY CHAIN</span>
                            <div style={{ margin: '6px 0', fontSize: '0.85rem' }}>
                              {activeMemo.approvedByVpSupplyChainAt ? (
                                <span className="sc-badge sc-badge-elite">APPROVED</span>
                              ) : (
                                <span className="sc-badge sc-badge-vulnerable">PENDING VERIFICATION</span>
                              )}
                            </div>
                            {!activeMemo.approvedByVpSupplyChainAt && (
                              <button
                                className="sc-btn-secondary"
                                style={{ width: '100%', marginTop: '6px' }}
                                onClick={() => handleSignOff('vp_supply_chain')}
                                data-testid="sc-btn-sign-vp"
                              >
                                Sign as VP Supply Chain
                              </button>
                            )}
                          </div>

                          <div className="sc-signoff-card">
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block' }}>CHIEF OPERATING OFFICER (COO)</span>
                            <div style={{ margin: '6px 0', fontSize: '0.85rem' }}>
                              {activeMemo.approvedByCooAt ? (
                                <span className="sc-badge sc-badge-elite">APPROVED</span>
                              ) : (
                                <span className="sc-badge sc-badge-vulnerable">PENDING AUTHORIZATION</span>
                              )}
                            </div>
                            {!activeMemo.approvedByCooAt && (
                              <button
                                className="sc-btn-secondary"
                                style={{ width: '100%', marginTop: '6px' }}
                                onClick={() => handleSignOff('chief_operating_officer')}
                                data-testid="sc-btn-sign-coo"
                              >
                                Sign as Chief Operating Officer
                              </button>
                            )}
                          </div>

                          <div className="sc-signoff-card">
                            <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block' }}>BOARD RISK COMMITTEE CHAIR</span>
                            <div style={{ margin: '6px 0', fontSize: '0.85rem' }}>
                              {activeMemo.approvedByBoardRiskChairAt ? (
                                <span className="sc-badge sc-badge-elite">RATIFIED</span>
                              ) : (
                                <span className="sc-badge sc-badge-vulnerable">PENDING RATIFICATION</span>
                              )}
                            </div>
                            {!activeMemo.approvedByBoardRiskChairAt && (
                              <button
                                className="sc-btn-secondary"
                                style={{ width: '100%', marginTop: '6px' }}
                                onClick={() => handleSignOff('board_risk_chair')}
                                data-testid="sc-btn-sign-board"
                              >
                                Sign as Board Risk Chair
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

      {isAddingBom && (
        <div className="sc-submodal-backdrop">
          <div className="sc-submodal-container">
            <h3 style={{ margin: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--sky-400)' }}>
              Add Multi-Tier Bill of Materials Component
            </h3>
            <form onSubmit={handleSaveBomNode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Part Number</label>
                  <input
                    type="text"
                    className="sc-input"
                    value={newPartNumber}
                    onChange={(e) => setNewPartNumber(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Component Name</label>
                  <input
                    type="text"
                    className="sc-input"
                    value={newComponentName}
                    onChange={(e) => setNewComponentName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Supply Tier</label>
                  <select
                    className="sc-input"
                    value={newTier}
                    onChange={(e) => setNewTier(e.target.value as SupplyTier)}
                  >
                    <option value="tier_1_integrator">Tier 1: Integrator</option>
                    <option value="tier_2_subassembly">Tier 2: Subassembly</option>
                    <option value="tier_3_component">Tier 3: Component</option>
                    <option value="tier_4_raw_material">Tier 4: Raw Material</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Criticality</label>
                  <select
                    className="sc-input"
                    value={newCriticality}
                    onChange={(e) => setNewCriticality(e.target.value as ComponentCriticality)}
                  >
                    <option value="standard">Standard</option>
                    <option value="high">High</option>
                    <option value="critical_path">Critical Path</option>
                    <option value="existential">Existential</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Supplier Name</label>
                  <input
                    type="text"
                    className="sc-input"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Country</label>
                  <input
                    type="text"
                    className="sc-input"
                    value={newSupplierCountry}
                    onChange={(e) => setNewSupplierCountry(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Strategy</label>
                  <select
                    className="sc-input"
                    value={newSourcingStrategy}
                    onChange={(e) => setNewSourcingStrategy(e.target.value as SourcingStrategy)}
                  >
                    <option value="single_source">Single Source</option>
                    <option value="dual_source">Dual Source</option>
                    <option value="multi_source">Multi Source</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Lead Time (Days)</label>
                  <input
                    type="number"
                    className="sc-input"
                    value={newLeadTime}
                    onChange={(e) => setNewLeadTime(Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'block', marginBottom: '2px' }}>Spend Share (%)</label>
                  <input
                    type="number"
                    className="sc-input"
                    value={newSpendShare}
                    onChange={(e) => setNewSpendShare(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="sc-btn-secondary"
                  onClick={() => setIsAddingBom(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sc-btn-primary"
                  data-testid="sc-btn-save-bom"
                >
                  Save Component
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
