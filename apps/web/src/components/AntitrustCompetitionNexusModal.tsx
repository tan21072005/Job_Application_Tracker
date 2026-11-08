import React, { useState, useEffect } from 'react';
import {
  type AntitrustCompetitionOverview,
  type AntitrustMergerTransaction,
  type AntitrustRelevantMarket,
  type RemedyDivestiturePackage,
  type AntitrustTripartiteRatification,
  type RegulatoryRatificationRole,
  calculateHhiConcentration,
  calculateDeltaHhi,
  evaluateHhiPresumption,
  calculateGuppi,
  calculateRemedyDefensibilityIndex
} from '../domain';
import { antitrustNexusRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'hsr' | 'markets' | 'global' | 'remedies' | 'warroom';

export const AntitrustCompetitionNexusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('hsr');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<AntitrustCompetitionOverview | null>(null);

  const [newMarketName, setNewMarketName] = useState('');
  const [newProductDef, setNewProductDef] = useState('');
  const [newGeoScope, setNewGeoScope] = useState('');
  const [newMarketSize, setNewMarketSize] = useState<number>(10000000000);
  const [newNexusShare, setNewNexusShare] = useState<number>(26);
  const [newApexShare, setNewApexShare] = useState<number>(18);
  const [newComp1Share, setNewComp1Share] = useState<number>(20);
  const [newComp2Share, setNewComp2Share] = useState<number>(16);

  const [newRemedyName, setNewRemedyName] = useState('');
  const [newRemedyType, setNewRemedyType] = useState<any>('fix_it_first_buyer_sale');
  const [newCarveoutUnit, setNewCarveoutUnit] = useState('');
  const [newCarveoutRev, setNewCarveoutRev] = useState<number>(1200000000);
  const [newCarveoutEbitda, setNewCarveoutEbitda] = useState<number>(290000000);
  const [newBuyerName, setNewBuyerName] = useState('Thoma Bravo Capital');
  const [newOverlapMitigated, setNewOverlapMitigated] = useState<number>(85.0);

  const [simD12, setSimD12] = useState<number>(0.35);
  const [simD21, setSimD21] = useState<number>(0.28);
  const [simMargin1, setSimMargin1] = useState<number>(65);
  const [simMargin2, setSimMargin2] = useState<number>(70);

  const loadOverview = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await antitrustNexusRepository.getOverview();
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load antitrust and merger defense telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tx = overview?.transaction;
  const hsr = overview?.hsrAssessment;
  const sr = overview?.secondRequest;
  const ratification = overview?.ratification;
  const cleanTeam = overview?.cleanTeamProtocol;
  const litigation = overview?.litigationDocket;
  const metrics = overview?.metrics;

  const simGuppi = calculateGuppi(simD12, simD21, 100, 100, simMargin1, simMargin2);

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tx || !newMarketName.trim() || !newProductDef.trim()) return;

    try {
      setLoading(true);
      await antitrustNexusRepository.defineMarket({
        transactionId: tx.id,
        marketName: newMarketName.trim(),
        productMarketDefinition: newProductDef.trim(),
        geographicMarketScope: newGeoScope.trim() || 'Global',
        totalMarketSizeUsd: newMarketSize,
        participantShares: [
          { participantName: 'Nexus Tech Global', isMergingParty: true, isAcquirer: true, isTarget: false, annualRevenueUsd: (newMarketSize * newNexusShare) / 100, marketSharePct: newNexusShare },
          { participantName: 'Apex Software', isMergingParty: true, isAcquirer: false, isTarget: true, annualRevenueUsd: (newMarketSize * newApexShare) / 100, marketSharePct: newApexShare },
          { participantName: 'Tier 1 Enterprise Competitor', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: (newMarketSize * newComp1Share) / 100, marketSharePct: newComp1Share },
          { participantName: 'Tier 2 Cloud Competitor', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: (newMarketSize * newComp2Share) / 100, marketSharePct: newComp2Share },
          { participantName: 'Other Regional Point Solutions', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: (newMarketSize * Math.max(0, 100 - newNexusShare - newApexShare - newComp1Share - newComp2Share)) / 100, marketSharePct: Math.max(0, 100 - newNexusShare - newApexShare - newComp1Share - newComp2Share) }
        ]
      });
      await loadOverview();
      setNewMarketName('');
      setNewProductDef('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delineate relevant market');
    } finally {
      setLoading(false);
    }
  };

  const handleProposeRemedy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tx || !newRemedyName.trim() || !newCarveoutUnit.trim()) return;

    try {
      setLoading(true);
      await antitrustNexusRepository.proposeDivestiturePackage({
        transactionId: tx.id,
        packageName: newRemedyName.trim(),
        remedyType: newRemedyType,
        carveoutBusinessUnit: newCarveoutUnit.trim(),
        carveoutRevenueUsd: newCarveoutRev,
        carveoutEbitdaUsd: newCarveoutEbitda,
        upfrontBuyerName: newBuyerName.trim() || null,
        assetOverlapMitigatedPct: newOverlapMitigated
      });
      await loadOverview();
      setNewRemedyName('');
      setNewCarveoutUnit('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to propose divestiture package');
    } finally {
      setLoading(false);
    }
  };

  const handleSignoff = async (role: RegulatoryRatificationRole, defaultSigner: string) => {
    if (!tx) return;
    try {
      setLoading(true);
      await antitrustNexusRepository.submitTripartiteSignoff({
        transactionId: tx.id,
        role,
        signerName: defaultSigner,
        statementAcknowledged: `Formal clearance ratification executed for ${role.replace(/_/g, ' ').toUpperCase()} under applicable antitrust statutory standards.`
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to sign off as ${role}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    try {
      setLoading(true);
      const data = await antitrustNexusRepository.resetDemo();
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset antitrust demo store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="antitrust-nexus-modal-overlay" data-testid="antitrust-competition-nexus-modal">
      <div className="antitrust-nexus-modal">
        <div className="antitrust-nexus-header">
          <div>
            <div className="antitrust-nexus-header-title">
              <span>⚖️</span>
              <span>Enterprise Antitrust, Competition Law & Merger Clearance Defense Nexus</span>
              <span className="antitrust-nexus-badge antitrust-badge-blue">
                {tx?.dealCodename || 'PROJECT AEGIS TITAN'}
              </span>
            </div>
            <div className="antitrust-nexus-subtitle">
              Statutory HSR § 7A Radar • Market Delineation & 2023 Guidelines HHI/GUPPI Engine • Multi-Agency Clearance Highway • Structural Divestitures & Clean-Teams • Tripartite Ratification Gate
            </div>
          </div>
          <button
            className="antitrust-nexus-close-btn"
            onClick={onClose}
            data-testid="close-antitrust-competition-nexus-modal"
          >
            ×
          </button>
        </div>

        <div className="antitrust-nexus-tabs">
          <button
            className={`antitrust-nexus-tab-btn ${activeTab === 'hsr' ? 'active' : ''}`}
            onClick={() => setActiveTab('hsr')}
            data-testid="tab-hsr"
          >
            Pillar A: HSR Premerger & Second Request Radar
          </button>
          <button
            className={`antitrust-nexus-tab-btn ${activeTab === 'markets' ? 'active' : ''}`}
            onClick={() => setActiveTab('markets')}
            data-testid="tab-markets"
          >
            Pillar B: Market Definition, HHI & GUPPI Engine
          </button>
          <button
            className={`antitrust-nexus-tab-btn ${activeTab === 'global' ? 'active' : ''}`}
            onClick={() => setActiveTab('global')}
            data-testid="tab-global"
          >
            Pillar C: Global Clearance Highway
          </button>
          <button
            className={`antitrust-nexus-tab-btn ${activeTab === 'remedies' ? 'active' : ''}`}
            onClick={() => setActiveTab('remedies')}
            data-testid="tab-remedies"
          >
            Pillar D: Structural Divestitures & Clean-Teams
          </button>
          <button
            className={`antitrust-nexus-tab-btn ${activeTab === 'warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('warroom')}
            data-testid="tab-warroom"
          >
            Pillar E: Board Antitrust War Room & Tripartite Ratification
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: 'rgba(239,68,68,0.2)', borderLeft: '4px solid var(--red-500)', padding: '0.6rem 1.75rem', fontSize: '0.82rem', color: 'var(--red-300)' }}>
            {errorMessage}
          </div>
        )}

        <div className="antitrust-nexus-body">
          {loading && !overview && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Loading antitrust regulatory clearance telemetry...
            </div>
          )}

          {overview && activeTab === 'hsr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="antitrust-nexus-grid-4">
                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Size-of-Transaction Test</div>
                  <div className="antitrust-metric-value" style={{ color: hsr?.sizeOfTransactionTestPassed ? 'var(--sky-400)' : 'var(--emerald-400)' }}>
                    ${tx ? (tx.enterpriseValueUsd / 1e9).toFixed(2) : '0'}B
                  </div>
                  <div className="antitrust-metric-label">
                    Statutory Threshold: $119.5M ({hsr?.sizeOfTransactionTestPassed ? 'Triggered' : 'Exempt'})
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Size-of-Person Test</div>
                  <div className="antitrust-metric-value" style={{ color: 'var(--emerald-400)' }}>
                    PASSED
                  </div>
                  <div className="antitrust-metric-label">
                    Larger: ${hsr ? (hsr.largerPersonNetSalesUsd / 1e6).toFixed(0) : '0'}M (&ge; $239M) • Smaller: ${hsr ? (hsr.smallerPersonNetSalesUsd / 1e6).toFixed(0) : '0'}M (&ge; $23.9M)
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">HSR Statutory Filing Fee</div>
                  <div className="antitrust-metric-value" style={{ color: 'var(--amber-400)' }}>
                    ${hsr ? (hsr.statutoryFilingFeeUsd).toLocaleString() : '0'}
                  </div>
                  <div className="antitrust-metric-label">
                    Transaction &gt; $5.0B Statutory Bracket
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Item 4(c) & 4(d) Catalog</div>
                  <div className="antitrust-metric-value" style={{ color: 'var(--purple-400)' }}>
                    {hsr?.item4cDocumentsCataloged || 0} / {hsr?.item4dDocumentsCataloged || 0}
                  </div>
                  <div className="antitrust-metric-label">
                    Board synergy & market analysis dossiers verified
                  </div>
                </div>
              </div>

              {sr && (
                <div className="antitrust-nexus-card" style={{ borderLeft: '4px solid var(--red-500)' }}>
                  <div className="antitrust-nexus-card-title">
                    <span>⚠️ HSR Second Request Subpoena Enforcement Radar</span>
                    <span className="antitrust-nexus-badge antitrust-badge-crimson">
                      {sr.issuingAgency}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-300)', lineHeight: '1.5', marginBottom: '1rem' }}>
                    {sr.scopeDescription}
                  </p>

                  <div className="antitrust-nexus-grid-4">
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Agreed Custodians</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{sr.custodiansAgreedCount} / {sr.custodianCount}</div>
                      </div>
                    </div>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>E-Discovery Volume</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{sr.dataVolumeTerabytes} TB</div>
                      </div>
                    </div>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Docs Produced</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{(sr.documentsProducedCount / 1000).toFixed(0)}k / {(sr.documentsReviewedCount / 1000).toFixed(0)}k</div>
                      </div>
                    </div>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Est. Defense Costs</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--red-400)' }}>${(sr.estimatedDefenseCostsUsd / 1e6).toFixed(1)}M</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {overview && activeTab === 'markets' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="antitrust-nexus-grid-2">
                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">
                    <span>Relevant Markets & 2023 Merger Guidelines Presumptions</span>
                    <span className="antitrust-nexus-badge antitrust-badge-crimson">
                      {metrics?.presumptionRebuttableCount} Structural Presumptions Triggered
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {overview.relevantMarkets.map((m) => (
                      <div key={m.id} style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '6px', padding: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: '700', color: 'var(--slate-50)', fontSize: '0.88rem' }}>{m.marketName}</span>
                          <span className="antitrust-nexus-badge antitrust-badge-crimson">
                            Post-HHI {m.postMergerHhi} (Δ {m.deltaHhi})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', marginBottom: '0.5rem' }}>
                          Scope: {m.geographicMarketScope} • Size: ${(m.totalMarketSizeUsd / 1e9).toFixed(1)}B • SSNIP Critical Loss: {m.ssnipTestCriticalLossPct}%
                        </div>
                        <div style={{ fontSize: '0.78rem', color: m.presumptionRebuttableUnlawful ? 'var(--red-300)' : 'var(--green-300)', background: m.presumptionRebuttableUnlawful ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
                          {m.presumptionRebuttableUnlawful ? '⚠️ Presumed Substantial Lessening of Competition (Post-HHI ≥ 1800, Δ ≥ 100, combined share > 30%)' : '✓ Unconcentrated or Low Delta Market'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">
                    <span>Gross Upward Pricing Pressure Index (GUPPI)</span>
                    <span className="antitrust-nexus-badge antitrust-badge-amber">Unilateral Pricing Engine</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    {overview.guppiAnalyses.map((g) => (
                      <div key={g.id} style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '6px', padding: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>{g.acquirerProductName} ↔ {g.targetProductName}</span>
                          <span className="antitrust-nexus-badge antitrust-badge-crimson">Max GUPPI: {g.maxGuppiPct}%</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                          Diversion Ratios: D12 = {(g.diversionRatio12 * 100).toFixed(0)}%, D21 = {(g.diversionRatio21 * 100).toFixed(0)}% • Margins: {g.grossMargin1Pct}% / {g.grossMargin2Pct}%
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid var(--slate-700)', borderRadius: '6px', padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--sky-400)' }}>Interactive GUPPI Sensitivity Simulator</div>
                    <div className="antitrust-nexus-grid-2" style={{ gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <div className="antitrust-nexus-form-group">
                        <label className="antitrust-nexus-label">Diversion D12 ({Math.round(simD12 * 100)}%)</label>
                        <input type="range" min="0.05" max="0.70" step="0.05" value={simD12} onChange={(e) => setSimD12(parseFloat(e.target.value))} />
                      </div>
                      <div className="antitrust-nexus-form-group">
                        <label className="antitrust-nexus-label">Margin 2 ({simMargin2}%)</label>
                        <input type="range" min="30" max="90" step="5" value={simMargin2} onChange={(e) => setSimMargin2(parseInt(e.target.value))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <span>Calculated GUPPI 1: <strong style={{ color: simGuppi.maxGuppiPct >= 10 ? 'var(--red-400)' : 'var(--emerald-400)' }}>{simGuppi.guppi1Pct}%</strong></span>
                      <span className="antitrust-nexus-badge antitrust-badge-blue">{simGuppi.unilateralEffectsRiskTier.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="antitrust-nexus-card">
                <div className="antitrust-nexus-card-title">Define New Relevant Market (SSNIP Protocol)</div>
                <form onSubmit={handleCreateMarket} className="antitrust-nexus-grid-4" style={{ gap: '0.75rem' }}>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Market Name</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. Identity Cloud Platforms" value={newMarketName} onChange={(e) => setNewMarketName(e.target.value)} required />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Product Market Definition</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. Enterprise IAM software" value={newProductDef} onChange={(e) => setNewProductDef(e.target.value)} required />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Geographic Scope</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. North America & EMEA" value={newGeoScope} onChange={(e) => setNewGeoScope(e.target.value)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Total Market Size ($)</label>
                    <input type="number" className="antitrust-nexus-input" value={newMarketSize} onChange={(e) => setNewMarketSize(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Acquirer Share %</label>
                    <input type="number" className="antitrust-nexus-input" value={newNexusShare} onChange={(e) => setNewNexusShare(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Target Share %</label>
                    <input type="number" className="antitrust-nexus-input" value={newApexShare} onChange={(e) => setNewApexShare(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Comp 1 Share %</label>
                    <input type="number" className="antitrust-nexus-input" value={newComp1Share} onChange={(e) => setNewComp1Share(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" className="antitrust-nexus-btn-primary" style={{ width: '100%' }} data-testid="btn-define-market">
                      Add Market Definition
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {overview && activeTab === 'global' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="antitrust-nexus-grid-3">
                <div className="antitrust-nexus-card" style={{ gridColumn: 'span 2' }}>
                  <div className="antitrust-nexus-card-title">
                    <span>Global Multi-Jurisdictional Merger Clearance Highway</span>
                    <span className="antitrust-nexus-badge antitrust-badge-blue">5 Key Jurisdictions</span>
                  </div>

                  <table className="antitrust-nexus-table">
                    <thead>
                      <tr>
                        <th className="antitrust-nexus-th">Agency / Jurisdiction</th>
                        <th className="antitrust-nexus-th">Statutory Framework</th>
                        <th className="antitrust-nexus-th">Current Phase</th>
                        <th className="antitrust-nexus-th">Deadline</th>
                        <th className="antitrust-nexus-th">Outside Counsel</th>
                        <th className="antitrust-nexus-th">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.globalFilings.map((f) => (
                        <tr key={f.id}>
                          <td className="antitrust-nexus-td" style={{ fontWeight: '700' }}>{f.regulatoryAgencyName}</td>
                          <td className="antitrust-nexus-td">{f.filingType}</td>
                          <td className="antitrust-nexus-td">
                            <span className={`antitrust-nexus-badge ${f.currentReviewPhase === 'phase_2' ? 'antitrust-badge-crimson' : 'antitrust-badge-amber'}`}>
                              {f.currentReviewPhase.toUpperCase()}
                            </span>
                          </td>
                          <td className="antitrust-nexus-td">{f.statutoryDeadlineDate || 'TBD'}</td>
                          <td className="antitrust-nexus-td" style={{ color: 'var(--slate-400)' }}>{f.outsideCounselLead}</td>
                          <td className="antitrust-nexus-td">
                            <span className="antitrust-nexus-badge antitrust-badge-blue">
                              {f.clearanceDecision.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">
                    <span>Regulatory Clearance Risk Score (RCRS)</span>
                  </div>

                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ fontSize: '2.8rem', fontWeight: '900', color: 'var(--red-400)', fontFamily: 'ui-monospace, monospace' }}>
                      {metrics?.overallClearanceRiskScore || 0}
                      <span style={{ fontSize: '1.2rem', color: 'var(--slate-400)' }}>/100</span>
                    </div>
                    <div className="antitrust-nexus-badge antitrust-badge-crimson" style={{ display: 'inline-block', marginTop: '0.25rem' }}>
                      {metrics?.clearanceRiskBand.replace(/_/g, ' ').toUpperCase()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate-400)' }}>HHI Concentration Weight (30%):</span>
                      <strong style={{ color: 'var(--red-400)' }}>High Risk (80+)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate-400)' }}>GUPPI Pricing Pressure (25%):</span>
                      <strong style={{ color: 'var(--red-400)' }}>Severe (&gt;10%)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate-400)' }}>Multi-Agency Phase 2 Friction (20%):</span>
                      <strong style={{ color: 'var(--amber-400)' }}>3 Agencies In-Depth</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate-400)' }}>Customer Complaints Weight (15%):</span>
                      <strong style={{ color: 'var(--amber-400)' }}>4 Formal Objections</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--slate-400)' }}>Second Request Burden (10%):</span>
                      <strong style={{ color: 'var(--red-400)' }}>45 Custodians / 24.5 TB</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {overview && activeTab === 'remedies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="antitrust-nexus-grid-2">
                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">
                    <span>Structural Divestiture Packages & Fix-It-First Upfront Buyers</span>
                    <span className="antitrust-nexus-badge antitrust-badge-emerald">
                      Max RDI: {metrics?.maxRemedyDefensibilityIndex || 0}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {overview.remedyPackages.map((r) => (
                      <div key={r.id} style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '6px', padding: '0.9rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>{r.packageName}</span>
                          <span className={`antitrust-nexus-badge ${r.remedyDefensibilityIndex >= 75 ? 'antitrust-badge-emerald' : 'antitrust-badge-crimson'}`}>
                            RDI: {r.remedyDefensibilityIndex} ({r.remedyDefensibilityIndex >= 75 ? 'Defensible' : 'Deficient'})
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', marginBottom: '0.4rem' }}>
                          Carve-Out Unit: {r.carveoutBusinessUnit} • Revenue: ${(r.carveoutRevenueUsd / 1e6).toFixed(0)}M • EBITDA: ${(r.carveoutEbitdaUsd / 1e6).toFixed(0)}M
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }}>
                          Buyer: <strong>{r.upfrontBuyerName || 'Unassigned / Behavioral'}</strong> • Overlap Mitigated: {r.assetOverlapMitigatedPct}% • Standalone Viability: {r.standaloneViabilityScore}/100
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">
                    <span>Clean Team Firewall & Sherman Act § 1 Protocol</span>
                    <span className="antitrust-nexus-badge antitrust-badge-emerald">
                      Status: {cleanTeam?.firewallStatus.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--slate-300)', lineHeight: '1.5', marginBottom: '0.75rem' }}>
                    {cleanTeam?.protocolTitle || 'Clean team firewall preventing pre-closing gun-jumping under Sherman Act § 1.'}
                  </p>

                  <div className="antitrust-nexus-grid-3" style={{ marginBottom: '1rem' }}>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Cleared Outside Counsel</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{cleanTeam?.clearedCounselCount || 0}</div>
                      </div>
                    </div>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Economic Experts</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{cleanTeam?.clearedConsultantsCount || 0}</div>
                      </div>
                    </div>
                    <div className="antitrust-nexus-outcome-box">
                      <div>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Reported Breaches</div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--emerald-400)' }}>0 (Clean)</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--custom-090e1a)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--slate-800)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--slate-400)', marginBottom: '0.35rem' }}>Commercially Sensitive Categories Covered</div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--slate-300)' }}>
                      {(cleanTeam?.coveredCommerciallySensitiveCategories || []).map((c, idx) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="antitrust-nexus-card">
                <div className="antitrust-nexus-card-title">Propose Structural Divestiture / Remedy Package</div>
                <form onSubmit={handleProposeRemedy} className="antitrust-nexus-grid-4" style={{ gap: '0.75rem' }}>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Package Name</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. Cloud Security Unit Carve-Out" value={newRemedyName} onChange={(e) => setNewRemedyName(e.target.value)} required />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Remedy Type</label>
                    <select className="antitrust-nexus-select" value={newRemedyType} onChange={(e) => setNewRemedyType(e.target.value)}>
                      <option value="fix_it_first_buyer_sale">Fix-It-First Buyer Sale</option>
                      <option value="structural_asset_carveout">Structural Asset Carve-Out</option>
                      <option value="upfront_buyer_divestiture">Upfront Buyer Divestiture</option>
                      <option value="behavioral_frand_licensing">Behavioral FRAND Licensing</option>
                      <option value="interoperability_open_api">Open API Interoperability</option>
                    </select>
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Carveout Business Unit</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. Apex ATS Division" value={newCarveoutUnit} onChange={(e) => setNewCarveoutUnit(e.target.value)} required />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Upfront Buyer</label>
                    <input className="antitrust-nexus-input" placeholder="e.g. Vista Sovereign" value={newBuyerName} onChange={(e) => setNewBuyerName(e.target.value)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Revenue ($)</label>
                    <input type="number" className="antitrust-nexus-input" value={newCarveoutRev} onChange={(e) => setNewCarveoutRev(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">EBITDA ($)</label>
                    <input type="number" className="antitrust-nexus-input" value={newCarveoutEbitda} onChange={(e) => setNewCarveoutEbitda(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="antitrust-nexus-form-group">
                    <label className="antitrust-nexus-label">Overlap Mitigated %</label>
                    <input type="number" className="antitrust-nexus-input" value={newOverlapMitigated} onChange={(e) => setNewOverlapMitigated(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" className="antitrust-nexus-btn-primary" style={{ width: '100%' }} data-testid="btn-propose-remedy">
                      Submit Remedy Package
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {overview && activeTab === 'warroom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="antitrust-nexus-grid-3">
                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Reverse Termination Fee VaR</div>
                  <div className="antitrust-metric-value" style={{ color: 'var(--red-400)' }}>
                    ${tx ? (tx.reverseTerminationFeeUsd / 1e6).toFixed(0) : '0'}M
                  </div>
                  <div className="antitrust-metric-label">
                    {tx?.reverseTerminationFeePct}% of $14.2B EV • Expected Loss: ${(metrics?.expectedRegulatoryLossUsd || 0) / 1e6}M
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Litigation Docket & Depositions</div>
                  <div className="antitrust-metric-value" style={{ color: 'var(--amber-400)' }}>
                    {litigation ? `${litigation.cidDepositionsCompleted} / ${litigation.cidDepositionsScheduled}` : '0 / 0'}
                  </div>
                  <div className="antitrust-metric-label">
                    CID Depositions Completed • Prelim Injunction Risk: {litigation?.preliminaryInjunctionRiskPct}%
                  </div>
                </div>

                <div className="antitrust-nexus-card">
                  <div className="antitrust-nexus-card-title">Ratification Integrity Hash</div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'ui-monospace, monospace', color: ratification?.isFullyRatified ? 'var(--emerald-400)' : 'var(--sky-400)', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                    {ratification?.cryptographicIntegrityHash || 'None'}
                  </div>
                  <div className="antitrust-metric-label" style={{ marginTop: '0.25rem' }}>
                    {ratification?.isFullyRatified ? '✓ SHA-256 SEALED & BOARD RATIFIED' : 'Pending 3-Role Cryptographic Sign-Off'}
                  </div>
                </div>
              </div>

              <div className="antitrust-nexus-card" style={{ borderLeft: ratification?.isFullyRatified ? '4px solid var(--emerald-500)' : '4px solid var(--sky-400)' }}>
                <div className="antitrust-nexus-card-title">
                  <span>Tripartite Regulatory Ratification Gate</span>
                  <span className={`antitrust-nexus-badge ${ratification?.isFullyRatified ? 'antitrust-badge-emerald' : 'antitrust-badge-blue'}`}>
                    {ratification?.isFullyRatified ? 'FULL RATIFICATION SEALED' : 'AUTHORIZATION IN PROGRESS'}
                  </span>
                </div>

                <div className="antitrust-nexus-grid-3" style={{ gap: '1rem' }}>
                  <div style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--slate-50)', marginBottom: '0.35rem' }}>1. Lead Antitrust Counsel</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginBottom: '0.75rem' }}>
                        HSR Item 4(c)/4(d) verification & structural remedy defensibility review
                      </div>
                      {ratification?.leadCounselSigned && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--emerald-400)', background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                          ✓ Signed by {ratification.leadCounselSigner}<br />
                          {ratification.leadCounselDate ? new Date(ratification.leadCounselDate).toLocaleString() : ''}
                        </div>
                      )}
                    </div>
                    {ratification?.leadCounselSigned ? (
                      <button className="antitrust-nexus-btn-signed" disabled>Signed & Verified</button>
                    ) : (
                      <button
                        className="antitrust-nexus-btn-primary"
                        onClick={() => handleSignoff('antitrust_lead_counsel', 'Jonathan Vance, Esq.')}
                        data-testid="btn-signoff-lead-counsel"
                      >
                        Sign as Lead Counsel
                      </button>
                    )}
                  </div>

                  <div style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--slate-50)', marginBottom: '0.35rem' }}>2. Chief Legal Officer</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginBottom: '0.75rem' }}>
                        Corporate fiduciary alignment, clean team audit, & litigation defense posture
                      </div>
                      {ratification?.generalCounselSigned && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--emerald-400)', background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                          ✓ Signed by {ratification.generalCounselSigner}<br />
                          {ratification.generalCounselDate ? new Date(ratification.generalCounselDate).toLocaleString() : ''}
                        </div>
                      )}
                    </div>
                    {ratification?.generalCounselSigned ? (
                      <button className="antitrust-nexus-btn-signed" disabled>Signed & Verified</button>
                    ) : (
                      <button
                        className="antitrust-nexus-btn-primary"
                        onClick={() => handleSignoff('chief_legal_officer', 'Helena Sterling, Esq.')}
                        data-testid="btn-signoff-general-counsel"
                      >
                        Sign as Chief Legal Officer
                      </button>
                    )}
                  </div>

                  <div style={{ background: 'var(--custom-090e1a)', border: '1px solid var(--slate-800)', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: 'var(--slate-50)', marginBottom: '0.35rem' }}>3. Chief Executive Officer</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginBottom: '0.75rem' }}>
                        Final executive authorization of divestiture commitments & RTF assumption
                      </div>
                      {ratification?.chiefExecutiveOfficerSigned && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--emerald-400)', background: 'rgba(16,185,129,0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.75rem' }}>
                          ✓ Signed by {ratification.chiefExecutiveOfficerSigner}<br />
                          {ratification.chiefExecutiveOfficerDate ? new Date(ratification.chiefExecutiveOfficerDate).toLocaleString() : ''}
                        </div>
                      )}
                    </div>
                    {ratification?.chiefExecutiveOfficerSigned ? (
                      <button className="antitrust-nexus-btn-signed" disabled>Signed & Verified</button>
                    ) : (
                      <button
                        className="antitrust-nexus-btn-primary"
                        onClick={() => handleSignoff('chief_executive_officer', 'David Vance')}
                        data-testid="btn-signoff-ceo"
                      >
                        Sign as Chief Executive Officer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="antitrust-nexus-card">
                <div className="antitrust-nexus-card-title">
                  <span>Antitrust Defense & Regulatory Audit Log</span>
                  <span className="antitrust-nexus-badge antitrust-badge-blue">
                    {overview.auditLogs.length} Events Recorded
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {overview.auditLogs.map((l) => (
                    <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--custom-090e1a)', padding: '0.5rem 0.75rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                      <div>
                        <span style={{ fontWeight: '700', color: 'var(--slate-50)' }}>{l.headline}</span>
                        <div style={{ color: 'var(--slate-400)', fontSize: '0.72rem' }}>{l.details}</div>
                      </div>
                      <span className="antitrust-nexus-badge antitrust-badge-cyan">{new Date(l.eventTimestamp).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="antitrust-nexus-footer">
          <div>
            <span>Deal: <strong>{tx?.dealCodename}</strong></span> • <span>EV: <strong>${tx ? (tx.enterpriseValueUsd / 1e9).toFixed(1) : '0'}B</strong></span> • <span>RTF VaR: <strong>${tx ? (tx.reverseTerminationFeeUsd / 1e6).toFixed(0) : '0'}M</strong></span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="antitrust-nexus-footer-btn"
              onClick={handleResetDemo}
              data-testid="btn-reset-antitrust-demo"
            >
              Reset Demo Scenario
            </button>
            <button className="antitrust-nexus-footer-btn" onClick={onClose}>
              Close Nexus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
