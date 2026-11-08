import React, { useState, useEffect } from 'react';
import {
  type ShareholderActivismOverview,
  type ActivistCampaign,
  type WolfpackAccumulation,
  type DirectorSlateNominee,
  type ShareholderRightsPlan,
  type ActivismTripartiteSignoffRecord,
  type ActivismTripartiteSignoffRole,
  type ProxyAdvisorRecommendation,
  calculatePoisonPillDilution,
  simulateUniversalProxyContest
} from '../domain';
import { shareholderActivismNexusRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'radar' | 'vulnerability' | 'voting' | 'defense' | 'warroom';

export const ShareholderActivismDefenseNexusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('radar');
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<ShareholderActivismOverview | null>(null);

  const [newFundName, setNewFundName] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPhase, setNewPhase] = useState<any>('public_campaign_whitepaper');
  const [newDemand, setNewDemand] = useState<any>('spinoff_carveout_divestiture');
  const [newShares, setNewShares] = useState<number>(8500000);
  const [newPercent, setNewPercent] = useState<number>(8.5);
  const [newSummary, setNewSummary] = useState('');

  const [pillAcquirerPct, setPillAcquirerPct] = useState<number>(15.0);
  const [pillDiscountPct, setPillDiscountPct] = useState<number>(50.0);

  const [simIssRec, setSimIssRec] = useState<ProxyAdvisorRecommendation>('split_ticket_compromise');
  const [simGlRec, setSimGlRec] = useState<ProxyAdvisorRecommendation>('support_management_slate');

  const [newSeatNum, setNewSeatNum] = useState<number>(4);
  const [newIncumbentName, setNewIncumbentName] = useState('');
  const [newIncumbentSkills, setNewIncumbentSkills] = useState('');
  const [newDissidentName, setNewDissidentName] = useState('');
  const [newDissidentExpertise, setNewDissidentExpertise] = useState('');

  const loadOverview = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await shareholderActivismNexusRepository.getOverview();
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load shareholder activism defense telemetry');
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

  const currentCorp = overview?.targetCorporation;
  const currentCampaign = overview?.primaryCampaign;
  const currentSignoff = overview?.tripartiteSignoff;

  const pillOutcome = calculatePoisonPillDilution(
    currentCorp?.sharesOutstanding || 100000000,
    pillAcquirerPct,
    overview?.rightsPlan.exercisePriceUsd || 120,
    currentCorp ? (currentCorp.marketCapUsd / currentCorp.sharesOutstanding) : 50,
    pillDiscountPct
  );

  const dynamicContestSim = overview
    ? simulateUniversalProxyContest(
        overview.institutionalCohorts,
        simIssRec,
        simGlRec,
        3
      )
    : undefined;

  const handleDeclareCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFundName.trim() || !newPartnerName.trim() || !newSummary.trim()) return;
    try {
      await shareholderActivismNexusRepository.createCampaign({
        activistFundName: newFundName,
        leadPartnerName: newPartnerName,
        campaignPhase: newPhase,
        threatTier: 'tier_1_hostile_wolfpack',
        primaryDemand: newDemand,
        sharesHeldCount: Number(newShares),
        percentageOwnership: Number(newPercent),
        syntheticSwapPercentage: 2.0,
        schedule13dFilingDate: new Date().toISOString().split('T')[0],
        demandSummary: newSummary,
        estimatedCampaignBudgetUsd: 20000000
      });
      setNewFundName('');
      setNewPartnerName('');
      setNewSummary('');
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to declare activist campaign');
    }
  };

  const handleDeployRightsPlan = async () => {
    if (!overview?.rightsPlan) return;
    try {
      await shareholderActivismNexusRepository.deployRightsPlan({
        planName: overview.rightsPlan.planName,
        flipInThresholdPercentage: 15.0,
        exercisePriceUsd: 120.0,
        discountPercentage: 50.0,
        expirationDate: '2027-10-24'
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to activate shareholder rights plan');
    }
  };

  const handleAddNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncumbentName.trim() || !newDissidentName.trim()) return;
    try {
      await shareholderActivismNexusRepository.recordNomineeComparison({
        seatNumber: Number(newSeatNum),
        incumbentName: newIncumbentName,
        incumbentYearsServed: 4,
        incumbentCommitteeRoles: 'Audit & Risk Committee',
        incumbentSkills: newIncumbentSkills || 'Capital Allocation & Board Governance',
        dissidentName: newDissidentName,
        dissidentAffiliation: currentCampaign?.activistFundName || 'Activist Nominee',
        dissidentExpertise: newDissidentExpertise || 'Operational Cost Rationalization',
        proxyAdvisorRecommendedSlate: 'incumbent'
      });
      setNewIncumbentName('');
      setNewIncumbentSkills('');
      setNewDissidentName('');
      setNewDissidentExpertise('');
      setNewSeatNum(prev => prev + 1);
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record nominee comparison');
    }
  };

  const handleExecuteSignoff = async (role: ActivismTripartiteSignoffRole, defaultName: string) => {
    if (!currentCampaign) return;
    try {
      await shareholderActivismNexusRepository.submitTripartiteSignoff(
        currentCampaign.id,
        role,
        defaultName,
        `Fiduciary defense authorization executed under Delaware DGCL Section 141 for ${role.replace(/_/g, ' ')}.`
      );
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute tripartite signoff');
    }
  };

  return (
    <div className="activism-nexus-modal-overlay">
      <div className="activism-nexus-modal">
        <header className="activism-nexus-header">
          <div className="activism-nexus-header-title">
            <span>&#9876;</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                Shareholder Activism Defense & Boardroom Governance Command Nexus
              </h2>
              <div className="activism-nexus-subtitle">
                Schedule 13D Surveillance &bull; Universal Proxy Contest (SEC Rule 14a-19) &bull; Delaware Rights Plan (DGCL § 203) &bull; Tripartite Defense Ratification
              </div>
            </div>
          </div>
          <button
            className="activism-nexus-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="close-activism-nexus-modal"
          >
            &times;
          </button>
        </header>

        <div className="activism-corp-bar">
          <div className="activism-ticker-pill">
            <span>&#127970;</span>
            <span>{currentCorp?.ticker}: {currentCorp?.companyName}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span className="activism-nexus-badge activism-badge-purple">
              MARKET CAP: ${(Number(currentCorp?.marketCapUsd || 0) / 1e9).toFixed(1)}B
            </span>
            <span className="activism-nexus-badge activism-badge-blue">
              DELAWARE CORP (DGCL § 203)
            </span>
            <span className="activism-nexus-badge activism-badge-emerald">
              FLOAT: {currentCorp?.floatPercentage}%
            </span>
            <span className="activism-nexus-badge activism-badge-amber">
              RIGHTS PLAN: {currentCorp?.hasPoisonPillInPlace ? 'ACTIVE IN PLACE' : 'SHELF READY'}
            </span>
          </div>
        </div>

        <nav className="activism-nexus-tabs">
          <button
            className={`activism-nexus-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
            onClick={() => setActiveTab('radar')}
            data-testid="tab-activist-wolfpack-radar"
          >
            Activist Wolfpack Surveillance & 13D Radar
          </button>
          <button
            className={`activism-nexus-tab-btn ${activeTab === 'vulnerability' ? 'active' : ''}`}
            onClick={() => setActiveTab('vulnerability')}
            data-testid="tab-vulnerability-sotp-studio"
          >
            Vulnerability Matrix & SOTP Studio
          </button>
          <button
            className={`activism-nexus-tab-btn ${activeTab === 'voting' ? 'active' : ''}`}
            onClick={() => setActiveTab('voting')}
            data-testid="tab-institutional-voting-engine"
          >
            Institutional Voting & Proxy Advisors
          </button>
          <button
            className={`activism-nexus-tab-btn ${activeTab === 'defense' ? 'active' : ''}`}
            onClick={() => setActiveTab('defense')}
            data-testid="tab-defense-strategy-studio"
          >
            Defense Strategies & Poison Pill
          </button>
          <button
            className={`activism-nexus-tab-btn ${activeTab === 'warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('warroom')}
            data-testid="tab-board-warroom-tripartite"
          >
            Board War Room & Tripartite Ratification
          </button>
        </nav>

        {errorMessage && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid var(--red-500)', color: 'var(--red-300)', padding: '0.75rem 1.75rem', fontSize: '0.85rem' }}>
            {errorMessage}
          </div>
        )}

        <main className="activism-nexus-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Synthesizing shareholder activism telemetry, SEC Schedule 13D filings, and boardroom defense matrices...
            </div>
          ) : (
            <>
              {activeTab === 'radar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="activism-nexus-grid-2">
                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">
                        <span>Lead Activist Campaign Profile</span>
                        <span className="activism-nexus-badge activism-badge-crimson">
                          {currentCampaign?.threatTier.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {currentCampaign ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-50)' }}>
                            {currentCampaign.activistFundName}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--slate-300)', lineHeight: 1.5 }}>
                            {currentCampaign.demandSummary}
                          </div>
                          <div className="activism-nexus-grid-2" style={{ gap: '0.6rem' }}>
                            <div className="activism-nexus-outcome-box">
                              <span style={{ color: 'var(--slate-400)' }}>Lead Partner:</span>
                              <span style={{ fontWeight: 600 }}>{currentCampaign.leadPartnerName}</span>
                            </div>
                            <div className="activism-nexus-outcome-box">
                              <span style={{ color: 'var(--slate-400)' }}>Primary Demand:</span>
                              <span style={{ fontWeight: 600 }}>{currentCampaign.primaryDemand.replace(/_/g, ' ')}</span>
                            </div>
                            <div className="activism-nexus-outcome-box">
                              <span style={{ color: 'var(--slate-400)' }}>Direct Equity:</span>
                              <span style={{ fontWeight: 700, color: 'var(--red-400)' }}>{currentCampaign.percentageOwnership}%</span>
                            </div>
                            <div className="activism-nexus-outcome-box">
                              <span style={{ color: 'var(--slate-400)' }}>Effective Exposure:</span>
                              <span style={{ fontWeight: 700, color: 'var(--purple-400)' }}>{currentCampaign.effectiveEconomicExposure}%</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--slate-400)' }}>No active activist campaign detected.</div>
                      )}
                    </div>

                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">
                        <span>Wolfpack Coordination Index (WCI)</span>
                        <span className="activism-nexus-badge activism-badge-amber">
                          SEC 5-DAY RULE ACTIVE
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '0.5rem 0' }}>
                        <div style={{ fontSize: '3.2rem', fontWeight: 900, color: overview?.wolfpackCoordinationIndex! >= 50 ? 'var(--red-500)' : 'var(--amber-400)' }}>
                          {overview?.wolfpackCoordinationIndex}
                        </div>
                        <div>
                          <span className="activism-nexus-badge activism-badge-crimson" style={{ fontSize: '0.85rem' }}>
                            HIGH WOLFPACK COORDINATION PROBABILITY
                          </span>
                          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginTop: '0.3rem' }}>
                            Concerted accumulation pattern detected across affiliated hedge funds and swaps desks under Exchange Act Section 13(d)(3).
                          </div>
                        </div>
                      </div>

                      <div className="activism-nexus-grid-2" style={{ gap: '0.6rem', marginTop: '0.5rem' }}>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Wolfpack Funds:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.wolfpackAccumulations.length} Syndicate Nodes</span>
                        </div>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Aggregate Stake:</span>
                          <span style={{ fontWeight: 700, color: 'var(--red-400)' }}>
                            {overview?.wolfpackAccumulations.reduce((acc, w) => acc + w.ownershipPercentage, 0).toFixed(2)}% Float
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Declare New Activist Campaign / Hostile Accumulation</div>
                    <form onSubmit={handleDeclareCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div className="activism-nexus-grid-2" style={{ gap: '0.8rem' }}>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Activist Fund Name</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newFundName}
                            onChange={e => setNewFundName(e.target.value)}
                            placeholder="e.g. Starboard Value LP / Elliott Management"
                            data-testid="campaign-fund-name-input"
                          />
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Lead Managing Partner</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newPartnerName}
                            onChange={e => setNewPartnerName(e.target.value)}
                            placeholder="e.g. Jeffrey Smith / Paul Singer"
                            data-testid="campaign-lead-partner-input"
                          />
                        </div>
                      </div>
                      <div className="activism-nexus-grid-4" style={{ gap: '0.6rem' }}>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Campaign Phase</label>
                          <select
                            className="activism-nexus-select"
                            value={newPhase}
                            onChange={e => setNewPhase(e.target.value as any)}
                            data-testid="campaign-phase-select"
                          >
                            <option value="surveillance_early_detection">Surveillance Early Detection</option>
                            <option value="private_engagement_letter">Private Engagement Letter</option>
                            <option value="schedule_13d_disclosure">Schedule 13D Disclosure</option>
                            <option value="public_campaign_whitepaper">Public Whitepaper</option>
                            <option value="formal_proxy_contest">Formal Proxy Contest</option>
                            <option value="settlement_standstill">Settlement Standstill</option>
                          </select>
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Primary Demands</label>
                          <select
                            className="activism-nexus-select"
                            value={newDemand}
                            onChange={e => setNewDemand(e.target.value as any)}
                            data-testid="campaign-demand-select"
                          >
                            <option value="board_representation_seats">Board Representation</option>
                            <option value="spinoff_carveout_divestiture">Spin-off / Asset Sale</option>
                            <option value="capital_allocation_buybacks">Share Buyback Expansion</option>
                            <option value="operational_cost_reduction">Cost Reduction & Layoffs</option>
                            <option value="executive_leadership_change">CEO / Leadership Change</option>
                          </select>
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Shares Held</label>
                          <input
                            type="number"
                            className="activism-nexus-input"
                            value={newShares}
                            onChange={e => setNewShares(Number(e.target.value))}
                            data-testid="campaign-shares-input"
                          />
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Ownership %</label>
                          <input
                            type="number"
                            step="0.01"
                            className="activism-nexus-input"
                            value={newPercent}
                            onChange={e => setNewPercent(Number(e.target.value))}
                            data-testid="campaign-percent-input"
                          />
                        </div>
                      </div>
                      <div className="activism-nexus-form-group">
                        <label className="activism-nexus-label">Activist Thesis & Demand Summary</label>
                        <textarea
                          className="activism-nexus-textarea"
                          value={newSummary}
                          onChange={e => setNewSummary(e.target.value)}
                          placeholder="Detail the core thesis, spin-off demands, board slate ambitions, and capital return goals..."
                          data-testid="campaign-summary-input"
                        />
                      </div>
                      <button type="submit" className="activism-nexus-btn-primary" data-testid="btn-declare-campaign">
                        Ingest Activist Campaign Dossier
                      </button>
                    </form>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Wolfpack Syndicate Node Telemetry & Rapid Accumulation Radar</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {overview?.wolfpackAccumulations.map(w => (
                        <div key={w.id} className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)' }}>{w.fundName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>
                              Crossed 5% Threshold: {w.schedule13dCrossDate} &bull; Statutory 5-Day Deadline: {w.filingDeadlineDate}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--red-400)' }}>
                                {w.ownershipPercentage}% Direct ({w.derivativeExposurePercentage}% Swaps)
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                                Velocity: {w.accumulationVelocitySharesPerDay.toLocaleString()} sh/day
                              </div>
                            </div>
                            <span className="activism-nexus-badge activism-badge-purple">
                              CORRELATION: {w.coordinationCorrelationScore}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'vulnerability' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="activism-nexus-grid-2">
                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">
                        <span>Activist Vulnerability Scorecard (AVS)</span>
                        <span className="activism-nexus-badge activism-badge-amber">
                          {overview?.vulnerabilityAudit.vulnerabilityRiskBand.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '0.5rem 0' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: overview?.vulnerabilityAudit.compositeVulnerabilityScore! >= 60 ? 'var(--amber-400)' : 'var(--emerald-500)' }}>
                          {overview?.vulnerabilityAudit.compositeVulnerabilityScore}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--slate-300)' }}>
                            Multi-vector quantitative corporate vulnerability audit benchmarked against S&P 500 peer quartiles.
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>
                            Audit Date: {overview?.vulnerabilityAudit.auditDate}
                          </div>
                        </div>
                      </div>

                      <div className="activism-nexus-grid-2" style={{ gap: '0.6rem' }}>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>TSR Underperformance:</span>
                          <span style={{ fontWeight: 700, color: 'var(--red-400)' }}>{overview?.vulnerabilityAudit.tsrUnderperformanceScore}/100</span>
                        </div>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>ROIC-WACC Deficit:</span>
                          <span style={{ fontWeight: 700, color: 'var(--amber-400)' }}>{overview?.vulnerabilityAudit.roicWaccDeficitScore}/100</span>
                        </div>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Conglomerate Discount:</span>
                          <span style={{ fontWeight: 700, color: 'var(--red-400)' }}>{overview?.vulnerabilityAudit.sotpConglomerateDiscountScore}/100</span>
                        </div>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Governance Profile Risk:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.vulnerabilityAudit.governanceVulnerabilityScore}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Key Structural Exploitation Vectors</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {overview?.vulnerabilityAudit.keyVulnerabilities.map((v, i) => (
                          <div key={i} className="activism-nexus-outcome-box" style={{ justifyContent: 'flex-start', gap: '0.6rem' }}>
                            <span style={{ color: 'var(--red-400)', fontWeight: 800 }}>&bull;</span>
                            <span style={{ color: 'var(--slate-50)', fontSize: '0.8rem' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Business Segment Sum-of-the-Parts (SOTP) Valuation Gap</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {overview?.sotpSegments.map(s => (
                        <div key={s.id} className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)' }}>{s.segmentName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>
                              Revenue: ${(s.revenueUsd / 1e9).toFixed(2)}B &bull; EBITDA: ${(s.ebitdaUsd / 1e6).toFixed(0)}M &bull; Peer Multiple: {s.peerMultiple}x
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--slate-300)' }}>
                                Current: ${(s.impliedSegmentValueUsd / 1e9).toFixed(2)}B
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--emerald-400)' }}>
                                Activist Target: ${(s.activistTargetValueUsd / 1e9).toFixed(2)}B
                              </div>
                            </div>
                            <span className="activism-nexus-badge activism-badge-emerald">
                              +${(s.valueUnlockingPotentialUsd / 1e9).toFixed(2)}B UNLOCK
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'voting' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="activism-nexus-grid-2">
                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Top Institutional Shareholder Voting Power Matrix</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '350px', overflowY: 'auto' }}>
                        {overview?.institutionalCohorts.map(c => (
                          <div key={c.id} className="activism-nexus-outcome-box">
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--slate-50)', fontSize: '0.82rem' }}>{c.institutionName}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>
                                {c.cohortCategory.replace(/_/g, ' ').toUpperCase()} &bull; Last Contact: {c.lastEngagementDate}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: 'var(--purple-400)', fontSize: '0.85rem' }}>
                                {c.votingPowerPercentage}% Voting Power
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--emerald-400)' }}>
                                Mgmt Support: {c.historicalManagementSupportRate}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Proxy Advisory Benchmark Evaluations (ISS vs Glass Lewis)</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {overview?.proxyAdvisorEvaluations.map(p => (
                          <div key={p.id} style={{ background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', borderRadius: '6px', padding: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--slate-50)' }}>{p.advisorName} Benchmark Policy</div>
                              <span className={`activism-nexus-badge ${p.contestedElectionRecommendation.includes('management') ? 'activism-badge-emerald' : 'activism-badge-amber'}`}>
                                {p.contestedElectionRecommendation.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--slate-300)', lineHeight: 1.4, marginBottom: '0.5rem' }}>
                              {p.rationalesSummary}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {p.flagsList.map((f, i) => (
                                <span key={i} className="activism-nexus-badge activism-badge-purple" style={{ fontSize: '0.68rem' }}>
                                  {f}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Interactive Universal Proxy Voting Sensitivity Engine</div>
                    <div className="activism-nexus-grid-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                      <div className="activism-nexus-form-group">
                        <label className="activism-nexus-label">Simulate ISS Recommendation</label>
                        <select
                          className="activism-nexus-select"
                          value={simIssRec}
                          onChange={e => setSimIssRec(e.target.value as any)}
                        >
                          <option value="support_management_slate">Support Management Slate (Full White Card)</option>
                          <option value="split_ticket_compromise">Split Ticket Compromise (1 Dissident Seat)</option>
                          <option value="support_dissident_slate">Support Dissident Slate (Hostile Overhaul)</option>
                        </select>
                      </div>
                      <div className="activism-nexus-form-group">
                        <label className="activism-nexus-label">Simulate Glass Lewis Recommendation</label>
                        <select
                          className="activism-nexus-select"
                          value={simGlRec}
                          onChange={e => setSimGlRec(e.target.value as any)}
                        >
                          <option value="support_management_slate">Support Management Slate</option>
                          <option value="split_ticket_compromise">Split Ticket Compromise</option>
                          <option value="support_dissident_slate">Support Dissident Slate</option>
                        </select>
                      </div>
                    </div>

                    <div className="activism-nexus-grid-4" style={{ gap: '0.8rem' }}>
                      <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Management Projected:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--emerald-400)' }}>
                          {dynamicContestSim?.managementVotesProjected}%
                        </span>
                      </div>
                      <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Dissident Projected:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--red-400)' }}>
                          {dynamicContestSim?.dissidentVotesProjected}%
                        </span>
                      </div>
                      <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Management Win Probability:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--blue-400)' }}>
                          {dynamicContestSim?.managementWinProbability}%
                        </span>
                      </div>
                      <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Dissident Seats Won:</span>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--amber-400)' }}>
                          {dynamicContestSim?.projectedDissidentSeatsWon} of 3
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'defense' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="activism-nexus-grid-2">
                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">
                        <span>Shareholder Rights Plan (Poison Pill) Defense Engine</span>
                        <span className={`activism-nexus-badge ${overview?.rightsPlan.status === 'active_in_place' ? 'activism-badge-emerald' : 'activism-badge-purple'}`}>
                          {overview?.rightsPlan.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginBottom: '0.8rem' }}>
                        Delaware DGCL Section 157 & Unocal two-prong enhanced scrutiny proportionality defense.
                      </div>

                      <div className="activism-nexus-grid-2" style={{ gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Triggering Stake %: {pillAcquirerPct}%</label>
                          <input
                            type="range"
                            min="10"
                            max="25"
                            step="0.5"
                            value={pillAcquirerPct}
                            onChange={e => setPillAcquirerPct(Number(e.target.value))}
                          />
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Exercise Discount %: {pillDiscountPct}%</label>
                          <input
                            type="range"
                            min="20"
                            max="75"
                            step="5"
                            value={pillDiscountPct}
                            onChange={e => setPillDiscountPct(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="activism-nexus-grid-2" style={{ gap: '0.6rem', marginBottom: '0.8rem' }}>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Post-Dilution Stake:</span>
                          <span style={{ fontWeight: 800, color: 'var(--emerald-400)' }}>{pillOutcome.postDilutionAcquirerPct}%</span>
                        </div>
                        <div className="activism-nexus-outcome-box">
                          <span style={{ color: 'var(--slate-400)' }}>Dilution Factor:</span>
                          <span style={{ fontWeight: 800, color: 'var(--red-400)' }}>{pillOutcome.dilutionFactor}x</span>
                        </div>
                      </div>

                      <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--red-300)', marginBottom: '0.8rem' }}>
                        {pillOutcome.economicDeterrenceEffect}
                      </div>

                      {overview?.rightsPlan.status === 'active_in_place' ? (
                        <div style={{ textAlign: 'center', color: 'var(--emerald-400)', fontWeight: 700, fontSize: '0.85rem' }}>
                          &#10003; 15% Flip-In Rights Plan Active in Place
                        </div>
                      ) : (
                        <button
                          className="activism-nexus-btn-primary"
                          onClick={handleDeployRightsPlan}
                          data-testid="deploy-rights-plan-btn"
                          style={{ width: '100%' }}
                        >
                          Deploy Shelf-Ready 15% Flip-In Poison Pill
                        </button>
                      )}
                    </div>

                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Settle vs. Fight Enterprise Value Optimization</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {overview?.settlementScenarios.map(s => (
                          <div key={s.id} className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                              <div style={{ fontWeight: 700, color: 'var(--slate-50)', fontSize: '0.85rem' }}>{s.scenarioTitle}</div>
                              <span className={`activism-nexus-badge ${s.recommendationVerdict.includes('standstill') ? 'activism-badge-emerald' : 'activism-badge-amber'}`}>
                                {s.recommendationVerdict.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                              Board Seats Granted: {s.proposedBoardSeats} &bull; Standstill: {s.standstillDurationMonths} mos &bull; Defense Costs: ${(s.expenseReimbursementUsd / 1e6).toFixed(1)}M
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                              <span style={{ color: 'var(--slate-300)' }}>Settle Net EV: ${(s.settleNetEnterpriseValueUsd / 1e9).toFixed(2)}B</span>
                              <span style={{ color: s.projectedStockImpactPct > 0 ? 'var(--emerald-400)' : 'var(--red-400)', fontWeight: 700 }}>
                                Stock Impact: {s.projectedStockImpactPct > 0 ? '+' : ''}{s.projectedStockImpactPct}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Director Nominee Slate Vetting (Universal Proxy Ballot)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
                      {overview?.directorNominees.map(n => (
                        <div key={n.id} className="activism-nexus-outcome-box">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 800, color: 'var(--emerald-400)', fontSize: '0.85rem' }}>
                              Seat #{n.seatNumber} Incumbent: {n.incumbentName} ({n.incumbentYearsServed} yrs)
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-300)' }}>{n.incumbentSkills}</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0 1rem' }}>
                            <span className="activism-nexus-badge activism-badge-purple">
                              RECOMMENDED: {n.proxyAdvisorRecommendedSlate.toUpperCase()}
                            </span>
                          </div>
                          <div style={{ flex: 1, textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'var(--red-400)', fontSize: '0.85rem' }}>
                              Dissident: {n.dissidentName}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                              {n.dissidentAffiliation} &bull; {n.dissidentExpertise}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddNominee} style={{ background: 'var(--custom-080d1a)', padding: '0.8rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--slate-50)' }}>Benchmark Contested Seat Nominee Pair</div>
                      <div className="activism-nexus-grid-2" style={{ gap: '0.6rem' }}>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Incumbent Nominee Name</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newIncumbentName}
                            onChange={e => setNewIncumbentName(e.target.value)}
                            placeholder="e.g. Dr. Arthur Pendelton"
                            data-testid="nominee-incumbent-input"
                          />
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Dissident Nominee Name</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newDissidentName}
                            onChange={e => setNewDissidentName(e.target.value)}
                            placeholder="e.g. Marcus Bennett"
                            data-testid="nominee-dissident-input"
                          />
                        </div>
                      </div>
                      <div className="activism-nexus-grid-2" style={{ gap: '0.6rem' }}>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Incumbent Skills</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newIncumbentSkills}
                            onChange={e => setNewIncumbentSkills(e.target.value)}
                            placeholder="e.g. SEC Audit Authority, Financial Expert"
                          />
                        </div>
                        <div className="activism-nexus-form-group">
                          <label className="activism-nexus-label">Dissident Expertise</label>
                          <input
                            type="text"
                            className="activism-nexus-input"
                            value={newDissidentExpertise}
                            onChange={e => setNewDissidentExpertise(e.target.value)}
                            placeholder="e.g. Activist Turnaround Specialist"
                          />
                        </div>
                      </div>
                      <button type="submit" className="activism-nexus-btn-secondary" data-testid="btn-add-nominee" style={{ alignSelf: 'flex-start' }}>
                        Record Contested Seat Nominee Benchmark
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'warroom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="activism-nexus-grid-2">
                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Universal Proxy Card Battle Station (SEC Rule 14a-19)</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginBottom: '0.6rem' }}>
                        Statutory 67% solicitation condition confirmed. Projected voting turnout modeling across all institutional and retail cohorts.
                      </div>

                      <div className="activism-nexus-grid-3" style={{ gap: '0.6rem', marginBottom: '1rem' }}>
                        <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>White Card (Mgmt):</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--emerald-400)' }}>
                            {overview?.proxyContest.managementVotesProjected}%
                          </span>
                        </div>
                        <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Gold Card (Dissident):</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--red-400)' }}>
                            {overview?.proxyContest.dissidentVotesProjected}%
                          </span>
                        </div>
                        <div className="activism-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--slate-400)', fontSize: '0.75rem' }}>Undecided Swing:</span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--amber-400)' }}>
                            {overview?.proxyContest.undecidedVotesProjected}%
                          </span>
                        </div>
                      </div>

                      <div className="activism-nexus-outcome-box" style={{ marginBottom: '0.6rem' }}>
                        <span style={{ color: 'var(--slate-400)' }}>Management Win Probability:</span>
                        <span style={{ fontWeight: 800, color: 'var(--emerald-400)' }}>{overview?.proxyContest.managementWinProbability}%</span>
                      </div>
                      <div className="activism-nexus-outcome-box">
                        <span style={{ color: 'var(--slate-400)' }}>Projected Dissident Seats Won:</span>
                        <span style={{ fontWeight: 800, color: 'var(--amber-400)' }}>
                          {overview?.proxyContest.projectedDissidentSeatsWon} of 3 Contested Seats
                        </span>
                      </div>
                    </div>

                    <div className="activism-nexus-card">
                      <div className="activism-nexus-card-title">Tripartite Board Defense Resolution Ratification Gate</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)', marginBottom: '0.6rem' }}>
                        Sequential cryptographic authorization required under Delaware DGCL Section 141 before dispatching fight letters or deploying pills.
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)' }}>1. Lead Independent Director</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Fiduciary defense review & independent director caucus</div>
                          </div>
                          {currentSignoff?.leadDirectorSignoff?.isSigned ? (
                            <span className="activism-nexus-badge activism-badge-emerald">SIGNED: {currentSignoff.leadDirectorSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="activism-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('lead_independent_director', 'Margaret Holloway, Lead Independent Director')}
                              data-testid="signoff-lead-director-btn"
                            >
                              Sign as Lead Director
                            </button>
                          )}
                        </div>

                        <div className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)' }}>2. Nominating & Governance Committee Chair</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Universal Proxy Card & board slate qualifications audit</div>
                          </div>
                          {currentSignoff?.governanceChairSignoff?.isSigned ? (
                            <span className="activism-nexus-badge activism-badge-emerald">SIGNED: {currentSignoff.governanceChairSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="activism-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('nominating_governance_chair', 'David Montgomery, Governance Chair')}
                              data-testid="signoff-gov-chair-btn"
                            >
                              Sign as Governance Chair
                            </button>
                          )}
                        </div>

                        <div className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)' }}>3. Board Chair & Chief Executive Officer</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Final corporate defense ratification & execution seal</div>
                          </div>
                          {currentSignoff?.boardChairCeoSignoff?.isSigned ? (
                            <span className="activism-nexus-badge activism-badge-emerald">SIGNED: {currentSignoff.boardChairCeoSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="activism-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('board_chair_ceo', 'Elena Rostova, CEO & Board Chair')}
                              data-testid="signoff-board-chair-ceo-btn"
                            >
                              Sign as Board Chair & CEO
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'var(--custom-080d1a)', borderRadius: '6px', textAlign: 'center' }}>
                        {currentSignoff?.isFullyRatified ? (
                          <div style={{ color: 'var(--emerald-500)', fontWeight: 800 }}>
                            &#10003; FULL BOARDROOM RATIFICATION CONFIRMED &bull; DEFENSE CHARTER DEPLOYED
                            <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                              SEAL: {currentSignoff.cryptographicIntegrityHash}
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: 'var(--amber-400)', fontWeight: 600, fontSize: '0.85rem' }}>
                            Awaiting complete tripartite sign-off before dispatching formal shareholder fight letters
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="activism-nexus-card">
                    <div className="activism-nexus-card-title">Chronological Proxy Contest & Activism Event Log</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                      {overview?.eventLogs.map(l => (
                        <div key={l.id} className="activism-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--slate-50)', fontSize: '0.82rem' }}>{l.headline}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--slate-300)', marginTop: '0.1rem' }}>{l.details}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className={`activism-nexus-badge ${l.severity === 'critical' || l.severity === 'high' ? 'activism-badge-crimson' : 'activism-badge-blue'}`}>
                              {l.eventCategory.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '0.2rem' }}>
                              {new Date(l.eventTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="activism-nexus-footer">
          <div>Enterprise Shareholder Activism Defense &bull; Delaware DGCL § 203 &bull; SEC Universal Proxy Compliant</div>
          <button className="activism-nexus-footer-btn" onClick={onClose}>Close Command Nexus</button>
        </footer>
      </div>
    </div>
  );
};
