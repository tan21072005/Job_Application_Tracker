import React, { useState, useEffect } from 'react';
import {
  type InvestorRelationsOverviewDTO,
  type ActivistVulnerabilityResultDTO,
  type NonGaapReconciliationResultDTO,
  type CapitalScenarioResultDTO,
  type NdrInvestorMeetingDTO,
  type SecForm8KDisclosureDTO,
  type InstitutionalInvestorType,
  type MeetingFormatType,
  type CapitalFinancingType
} from '../domain';
import { investorRelationsNexusRepository } from '../data';

interface InvestorRelationsNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType =
  | 'pillar-captable'
  | 'pillar-earnings'
  | 'pillar-roadshow'
  | 'pillar-capital'
  | 'pillar-warroom';

export const InvestorRelationsNexusModal: React.FC<InvestorRelationsNexusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pillar-captable');
  const [overview, setOverview] = useState<InvestorRelationsOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tsrLag, setTsrLag] = useState<number>(4.5);
  const [valDiscount, setValDiscount] = useState<number>(6.2);
  const [govScore, setGovScore] = useState<number>(88.0);
  const [fcfGap, setFcfGap] = useState<number>(2.1);
  const [actHoldings, setActHoldings] = useState<number>(1.5);
  const [avisSimResult, setAvisSimResult] = useState<ActivistVulnerabilityResultDTO | null>(null);

  const [gaapNetIncome, setGaapNetIncome] = useState<number>(18400000);
  const [stockComp, setStockComp] = useState<number>(8200000);
  const [deprAmort, setDeprAmort] = useState<number>(3800000);
  const [taxProvision, setTaxProvision] = useState<number>(1400000);
  const [interestNet, setInterestNet] = useState<number>(1000000);
  const [reconResult, setReconResult] = useState<NonGaapReconciliationResultDTO | null>(null);

  const [newInstName, setNewInstName] = useState<string>('Wellington Management Company LLP');
  const [newLeadInvestor, setNewLeadInvestor] = useState<string>('Marcus Bradley, Managing Director');
  const [newInstType, setNewInstType] = useState<InstitutionalInvestorType>('fundamental_long_only');
  const [newMeetingFormat, setNewMeetingFormat] = useState<MeetingFormatType>('one_on_one_in_person');
  const [newSentiment, setNewSentiment] = useState<number>(0.85);

  const [scenName, setScenName] = useState<string>('Convertible Senior Notes 2031');
  const [finType, setFinType] = useState<CapitalFinancingType>('convertible_senior_notes');
  const [grossProceeds, setGrossProceeds] = useState<number>(200000000);
  const [capitalSimResult, setCapitalSimResult] = useState<CapitalScenarioResultDTO | null>(null);

  const [quarter8K, setQuarter8K] = useState<string>('Q3-2026');
  const [title8K, setTitle8K] = useState<string>('Current Report under Item 2.02 and Item 7.01');
  const [incItem202, setIncItem202] = useState<boolean>(true);
  const [incItem701, setIncItem701] = useState<boolean>(true);
  const [disclosure8K, setDisclosure8K] = useState<SecForm8KDisclosureDTO | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await investorRelationsNexusRepository.getOverview();
      setOverview(data);
      if (data.latestForm8K) {
        setDisclosure8K(data.latestForm8K);
      }
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to load investor relations telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateAvis = async () => {
    try {
      setErrorMessage(null);
      const res = await investorRelationsNexusRepository.simulateActivistVulnerability({
        tsrUnderperformancePercent: tsrLag,
        valuationDiscountPercent: valDiscount,
        governanceDefenseScore: govScore,
        freeCashFlowMarginGap: fcfGap,
        activistOwnershipPercent: actHoldings
      });
      setAvisSimResult(res);
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Activist vulnerability simulation failed');
    }
  };

  const handleReconcileNonGaap = async () => {
    try {
      setErrorMessage(null);
      const res = await investorRelationsNexusRepository.reconcileNonGaapEarnings({
        fiscalQuarter: overview?.earnings.fiscalQuarter || 'Q3-2026',
        gaapNetIncomeUsd: gaapNetIncome,
        stockBasedCompensationUsd: stockComp,
        amortizationIntangiblesUsd: 1500000,
        acquisitionRestructuringCostsUsd: 500000,
        taxEffectOfAdjustmentsUsd: 2100000,
        interestExpenseUsd: interestNet,
        provisionForTaxesUsd: taxProvision,
        depreciationUsd: deprAmort
      });
      setReconResult(res);
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Non-GAAP reconciliation failed');
    }
  };

  const handleLogMeeting = async () => {
    try {
      setErrorMessage(null);
      await investorRelationsNexusRepository.logInvestorMeeting({
        institutionName: newInstName,
        leadInvestorName: newLeadInvestor,
        investorType: newInstType,
        meetingDate: new Date().toISOString().split('T')[0],
        meetingFormat: newMeetingFormat,
        executiveAttendees: ['David Chen (CEO)', 'Alexander Vance (VP IR)'],
        sentimentScore: newSentiment,
        keyTopics: ['Enterprise gross margin durability', 'AI ARR expansion'],
        followUps: ['Deliver detailed capex forecast']
      });
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to log roadshow meeting');
    }
  };

  const handleSimulateCapital = async () => {
    try {
      setErrorMessage(null);
      const res = await investorRelationsNexusRepository.simulateCapitalScenario({
        scenarioName: scenName,
        financingType: finType,
        grossAmountUsd: grossProceeds,
        stockPriceUsd: overview?.stockPriceUsd || 64.50,
        costOfEquityPercent: 10.85,
        preTaxCostOfDebtPercent: 5.00,
        marginalTaxRatePercent: 21.00,
        currentAnnualNetIncomeUsd: 120000000,
        currentSharesCount: overview?.sharesOutstanding || 75000000
      });
      setCapitalSimResult(res);
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Capital scenario simulation failed');
    }
  };

  const handleGenerate8K = async () => {
    try {
      setErrorMessage(null);
      const res = await investorRelationsNexusRepository.generateSecForm8K({
        fiscalQuarter: quarter8K,
        filingTitle: title8K,
        includeItem202: incItem202,
        includeItem701: incItem701
      });
      setDisclosure8K(res);
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || 'Failed to generate SEC Form 8-K');
    }
  };

  const handleSignoff8K = async (role: 'vp_investor_relations' | 'chief_financial_officer' | 'chief_executive_officer') => {
    if (!disclosure8K) return;
    try {
      setErrorMessage(null);
      const signerName = role === 'vp_investor_relations'
        ? 'Alexander Vance'
        : role === 'chief_financial_officer'
        ? 'Elena Rostova'
        : 'David Chen';
      const notes = role === 'vp_investor_relations'
        ? 'Audited consensus models and Reg G reconciliations.'
        : role === 'chief_financial_officer'
        ? 'Approved financial statements and forward guidance.'
        : 'Ratified strategic disclosure and authorized EDGAR transmission.';

      const updated = await investorRelationsNexusRepository.signoffSecForm8K(disclosure8K.id, {
        role,
        signerName,
        verificationNotes: notes
      });
      setDisclosure8K(updated);
      await loadData();
    } catch (err) {
      setErrorMessage((err as Error).message || `Sign-off failed for ${role}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ir-nexus-backdrop" data-testid="investor-relations-nexus-modal">
      <div className="ir-nexus-container">
        <div className="ir-nexus-header">
          <div className="ir-nexus-brand-row">
            <span className="ir-nexus-brand-icon">📈</span>
            <div>
              <h2 className="ir-nexus-title">
                {overview?.companyName || 'JobTrack Enterprise Technologies Inc.'} ({overview?.tickerSymbol || 'JBTR'} - Nasdaq)
              </h2>
              <div className="ir-nexus-subtitle">
                Enterprise Investor Relations, Shareholder Surveillance & Capital Markets Command Nexus
              </div>
            </div>
          </div>
          <div className="ir-nexus-header-actions">
            {overview && (
              <span
                data-testid="isi-score-badge"
                className={`ir-nexus-score-badge ${overview.isiBand}`}
              >
                ISI: {overview.compositeIsiScore.toFixed(1)} / 100 ({overview.isiBand.replace(/_/g, ' ').toUpperCase()})
              </span>
            )}
            <button
              data-testid="refresh-ir-nexus-btn"
              className="ir-nexus-btn-ghost"
              onClick={loadData}
              title="Refresh Telemetry"
            >
              🔄
            </button>
            <button
              data-testid="close-ir-nexus-modal"
              className="ir-nexus-btn-ghost"
              onClick={onClose}
              title="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="ir-nexus-tabs">
          <button
            data-testid="tab-pillar-captable"
            className={`ir-nexus-tab-btn ${activeTab === 'pillar-captable' ? 'active' : ''}`}
            onClick={() => setActiveTab('pillar-captable')}
          >
            🏛️ Pillar A: Cap Table & AVIS
          </button>
          <button
            data-testid="tab-pillar-earnings"
            className={`ir-nexus-tab-btn ${activeTab === 'pillar-earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('pillar-earnings')}
          >
            📊 Pillar B: Earnings & Reg G
          </button>
          <button
            data-testid="tab-pillar-roadshow"
            className={`ir-nexus-tab-btn ${activeTab === 'pillar-roadshow' ? 'active' : ''}`}
            onClick={() => setActiveTab('pillar-roadshow')}
          >
            ✈️ Pillar C: Roadshow & Targeting
          </button>
          <button
            data-testid="tab-pillar-capital"
            className={`ir-nexus-tab-btn ${activeTab === 'pillar-capital' ? 'active' : ''}`}
            onClick={() => setActiveTab('pillar-capital')}
          >
            💰 Pillar D: Capital & Buybacks
          </button>
          <button
            data-testid="tab-pillar-warroom"
            className={`ir-nexus-tab-btn ${activeTab === 'pillar-warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('pillar-warroom')}
          >
            📑 Pillar E: Board War Room & 8-K
          </button>
        </div>

        {errorMessage && (
          <div className="ir-nexus-banner-error">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>✕</button>
          </div>
        )}

        <div className="ir-nexus-content">
          {loading && !overview ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>
              Loading institutional capital markets telemetry...
            </div>
          ) : (
            <>
              {activeTab === 'pillar-captable' && (
                <div className="ir-nexus-tab-panel">
                  <div className="ir-nexus-grid-3">
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Market Capitalization</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--amber-500)' }}>
                        ${((overview?.marketCapUsd || 4837500000) / 1000000000).toFixed(2)}B
                      </div>
                      <div className="ir-nexus-card-sub">Stock Price: ${overview?.stockPriceUsd.toFixed(2)} USD</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Total Shares Outstanding</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--blue-400)' }}>
                        {((overview?.sharesOutstanding || 75000000) / 1000000).toFixed(1)}M
                      </div>
                      <div className="ir-nexus-card-sub">Public Float: {((overview?.publicFloatShares || 58500000) / 1000000).toFixed(1)}M Shares</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Activist Vulnerability (AVIS)</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--emerald-400)' }}>
                        {overview?.capTable.activistVulnerability.compositeAvisScore.toFixed(1)} / 100
                      </div>
                      <div className="ir-nexus-card-sub">
                        Status:{' '}
                        <span data-testid="avis-score-badge" className="ir-nexus-pill-emerald">
                          {overview?.capTable.activistVulnerability.riskLevel.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="ir-nexus-simulator-box">
                    <div className="ir-nexus-section-title">Activist Vulnerability Index (AVIS) Multi-Factor Stress Simulator</div>
                    <div className="ir-nexus-section-desc">
                      Simulate changes in 3-year TSR lag, valuation discount, governance defenses, and activist infiltration.
                    </div>
                    <div className="ir-nexus-slider-grid">
                      <div className="ir-nexus-slider-group">
                        <label>3Y TSR Underperformance: {tsrLag}%</label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="0.5"
                          value={tsrLag}
                          onChange={(e) => setTsrLag(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>EV/NTM Multiple Discount: {valDiscount}%</label>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="0.5"
                          value={valDiscount}
                          onChange={(e) => setValDiscount(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Governance Defense Score: {govScore}/100</label>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          step="1"
                          value={govScore}
                          onChange={(e) => setGovScore(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>FCF Margin Shortfall: {fcfGap}%</label>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          step="0.5"
                          value={fcfGap}
                          onChange={(e) => setFcfGap(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Activist Ownership: {actHoldings}%</label>
                        <input
                          type="range"
                          min="0"
                          max="25"
                          step="0.5"
                          value={actHoldings}
                          onChange={(e) => setActHoldings(parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="ir-nexus-sim-outcomes">
                      <button
                        data-testid="simulate-avis-btn"
                        className="ir-nexus-btn-primary"
                        onClick={handleSimulateAvis}
                      >
                        Recalculate AVIS Threat Level
                      </button>
                      {avisSimResult && (
                        <div style={{ marginLeft: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span>
                            Simulated Score: <strong>{avisSimResult.compositeAvisScore.toFixed(1)} / 100</strong>
                          </span>
                          <span className="ir-nexus-pill-gold">
                            {avisSimResult.riskLevel.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>
                            Driver: {avisSimResult.primaryVulnerabilityDriver}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Cap Table Capitalization Hierarchy</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Share Class</th>
                          <th>Class Type</th>
                          <th>Shares Authorized</th>
                          <th>Shares Outstanding</th>
                          <th>Votes / Share</th>
                          <th>Publicly Traded</th>
                          <th>CUSIP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.capTable.shareClasses.map((sc) => (
                          <tr key={sc.id}>
                            <td style={{ fontWeight: 600 }}>{sc.shareClassName}</td>
                            <td><span className="ir-nexus-pill-blue">{sc.shareClassType}</span></td>
                            <td>{sc.sharesAuthorized.toLocaleString()}</td>
                            <td style={{ color: 'var(--amber-500)', fontWeight: 600 }}>{sc.sharesOutstanding.toLocaleString()}</td>
                            <td>{sc.votesPerShare}x</td>
                            <td>{sc.isPubliclyTraded ? 'Yes (Nasdaq)' : 'No (Restricted)'}</td>
                            <td><code>{sc.cusip}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Top Institutional Shareholder Surveillance (Form 13F / Schedule 13D/13G)</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Institution Name</th>
                          <th>Strategy / Type</th>
                          <th>Shares Held</th>
                          <th>% Ownership</th>
                          <th>Voting Power</th>
                          <th>Filing Type</th>
                          <th>Activist Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.capTable.topShareholders.map((sh) => (
                          <tr key={sh.id}>
                            <td style={{ fontWeight: 600 }}>{sh.institutionName}</td>
                            <td><span className="ir-nexus-pill-gold">{sh.investorType.replace(/_/g, ' ')}</span></td>
                            <td>{sh.sharesHeld.toLocaleString()}</td>
                            <td style={{ color: 'var(--emerald-400)', fontWeight: 700 }}>{sh.percentOwnership.toFixed(2)}%</td>
                            <td>{sh.votingPowerPercent.toFixed(2)}%</td>
                            <td><code>{sh.filingType.toUpperCase()}</code></td>
                            <td>
                              {sh.isKnownActivist ? (
                                <span className="ir-nexus-pill-red">CRITICAL ACTIVIST</span>
                              ) : (
                                <span className="ir-nexus-pill-emerald">FRIENDLY</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'pillar-earnings' && (
                <div className="ir-nexus-tab-panel">
                  <div className="ir-nexus-grid-3">
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Reporting Cycle</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--blue-400)' }}>
                        {overview?.earnings.fiscalQuarter}
                      </div>
                      <div className="ir-nexus-card-sub">Release: {overview?.earnings.earningsReleaseDate} ({overview?.earnings.timing.replace(/_/g, ' ')})</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Quiet Period Lockout</div>
                      <div className="ir-nexus-card-val" style={{ color: overview?.earnings.isQuietPeriodActive ? 'var(--red-400)' : 'var(--emerald-400)' }}>
                        {overview?.earnings.isQuietPeriodActive ? 'ACTIVE LOCKOUT' : 'OPEN WINDOW'}
                      </div>
                      <div className="ir-nexus-card-sub">Commenced: {overview?.earnings.quietPeriodStartDate} (SEC Reg FD Strict Compliance)</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Webcast Streaming</div>
                      <div className="ir-nexus-card-val" style={{ fontSize: '1rem', color: 'var(--amber-500)', marginTop: '0.5rem' }}>
                        Dial-in & Webcast Verified
                      </div>
                      <div className="ir-nexus-card-sub"><code>{overview?.earnings.webcastUrl}</code></div>
                    </div>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Sell-Side Analyst Consensus vs Corporate Guidance Alignment</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Financial Metric</th>
                          <th>Consensus Mean</th>
                          <th>Consensus Median</th>
                          <th>Consensus Range (Low - High)</th>
                          <th>Analysts</th>
                          <th>Corporate Guidance</th>
                          <th>Guidance Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.earnings.consensusMetrics.map((cm, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{cm.metricName}</td>
                            <td style={{ color: 'var(--amber-500)', fontWeight: 700 }}>
                              {cm.unit === 'usd_per_share' ? `$${cm.consensusMean.toFixed(2)}` : `$${cm.consensusMean.toFixed(2)}M`}
                            </td>
                            <td>{cm.unit === 'usd_per_share' ? `$${cm.consensusMedian.toFixed(2)}` : `$${cm.consensusMedian.toFixed(2)}M`}</td>
                            <td>{cm.unit === 'usd_per_share' ? `$${cm.consensusLow.toFixed(2)} - $${cm.consensusHigh.toFixed(2)}` : `$${cm.consensusLow.toFixed(2)}M - $${cm.consensusHigh.toFixed(2)}M`}</td>
                            <td>{cm.analystCount} firms</td>
                            <td style={{ color: 'var(--emerald-400)', fontWeight: 600 }}>
                              {cm.unit === 'usd_per_share' ? `$${cm.guidanceMidpoint.toFixed(2)}` : `$${cm.guidanceMidpoint.toFixed(2)}M`}
                            </td>
                            <td>
                              <span className="ir-nexus-pill-emerald">
                                +{cm.guidanceVariancePercent.toFixed(2)}% aligned
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ir-nexus-simulator-box">
                    <div className="ir-nexus-section-title">SEC Regulation G & Item 10(e) Non-GAAP Reconciliation Engine</div>
                    <div className="ir-nexus-section-desc">
                      Mandatory equal-prominence statutory bridge reconciling GAAP Net Income to Adjusted EBITDA and Non-GAAP Net Income.
                    </div>
                    <div className="ir-nexus-grid-3">
                      <div className="ir-nexus-slider-group">
                        <label>GAAP Net Income ($):</label>
                        <input
                          type="number"
                          value={gaapNetIncome}
                          onChange={(e) => setGaapNetIncome(parseFloat(e.target.value) || 0)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Stock-Based Compensation ($):</label>
                        <input
                          type="number"
                          value={stockComp}
                          onChange={(e) => setStockComp(parseFloat(e.target.value) || 0)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Depreciation & Amortization ($):</label>
                        <input
                          type="number"
                          value={deprAmort}
                          onChange={(e) => setDeprAmort(parseFloat(e.target.value) || 0)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                    <div className="ir-nexus-sim-outcomes">
                      <button
                        data-testid="reconcile-non-gaap-btn"
                        className="ir-nexus-btn-primary"
                        onClick={handleReconcileNonGaap}
                      >
                        Reconcile Non-GAAP Metrics & Verify Reg G
                      </button>
                      {reconResult && (
                        <div style={{ marginLeft: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <span>
                            Adjusted EBITDA: <strong style={{ color: 'var(--emerald-400)' }}>${(reconResult.adjustedEbitdaUsd / 1000000).toFixed(2)}M</strong>
                          </span>
                          <span>
                            Non-GAAP Net Income: <strong style={{ color: 'var(--blue-400)' }}>${(reconResult.nonGaapNetIncomeUsd / 1000000).toFixed(2)}M</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ir-nexus-card">
                    <div className="ir-nexus-section-title">PSLRA 1995 Safe Harbor Script Prompter</div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-300)', lineHeight: '1.6', marginTop: '0.5rem' }}>
                      {overview?.earnings.safeHarborScript}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'pillar-roadshow' && (
                <div className="ir-nexus-tab-panel">
                  <div className="ir-nexus-grid-3">
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Upcoming Conferences</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--amber-500)' }}>
                        {overview?.roadshows.upcomingConferences.length} Events
                      </div>
                      <div className="ir-nexus-card-sub">Premier sell-side venues scheduled</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Buy-Side Conviction Score</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--emerald-400)' }}>
                        {overview?.roadshows.buySideConvictionScore.toFixed(1)}%
                      </div>
                      <div className="ir-nexus-card-sub">Institutional accumulation bias</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Average NDR Sentiment</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--blue-400)' }}>
                        +{overview?.roadshows.averageSentimentScore.toFixed(2)}
                      </div>
                      <div className="ir-nexus-card-sub">Scale: -1.0 (Hostile) to +1.0 (Bullish)</div>
                    </div>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Tier-1 Sell-Side Investor Conference Docket</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Conference Name</th>
                          <th>Host Broker</th>
                          <th>Location</th>
                          <th>Dates</th>
                          <th>Executive Attendees</th>
                          <th>Confirmed Meetings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.roadshows.upcomingConferences.map((conf) => (
                          <tr key={conf.id}>
                            <td style={{ fontWeight: 600 }}>{conf.conferenceName}</td>
                            <td><span className="ir-nexus-pill-gold">{conf.hostBroker}</span></td>
                            <td>{conf.location}</td>
                            <td>{conf.startDate} to {conf.endDate}</td>
                            <td>{conf.executiveAttendees.join(', ')}</td>
                            <td><span className="ir-nexus-pill-emerald">{conf.confirmedMeetingsCount} meetings</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="ir-nexus-simulator-box">
                    <div className="ir-nexus-section-title">Log Non-Deal Roadshow (NDR) Management Meeting</div>
                    <div className="ir-nexus-section-desc">
                      Capture 1-on-1 and small group buy-side meetings, sentiment ratings, and follow-up deliverables.
                    </div>
                    <div className="ir-nexus-grid-3">
                      <div className="ir-nexus-slider-group">
                        <label>Target Institution:</label>
                        <input
                          type="text"
                          value={newInstName}
                          onChange={(e) => setNewInstName(e.target.value)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Lead Investor / PM:</label>
                        <input
                          type="text"
                          value={newLeadInvestor}
                          onChange={(e) => setNewLeadInvestor(e.target.value)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Investor Sentiment (-1.0 to +1.0): {newSentiment.toFixed(2)}</label>
                        <input
                          type="range"
                          min="-1.0"
                          max="1.0"
                          step="0.05"
                          value={newSentiment}
                          onChange={(e) => setNewSentiment(parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="ir-nexus-sim-outcomes">
                      <button
                        data-testid="log-meeting-btn"
                        className="ir-nexus-btn-primary"
                        onClick={handleLogMeeting}
                      >
                        Record Meeting & Recalibrate Sentiment
                      </button>
                    </div>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Recent Non-Deal Roadshow Meeting Logs</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Institution Name</th>
                          <th>Lead Investor</th>
                          <th>Strategy</th>
                          <th>Meeting Date</th>
                          <th>Format</th>
                          <th>Sentiment Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.roadshows.recentMeetings.map((m) => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 600 }}>{m.institutionName}</td>
                            <td>{m.leadInvestorName}</td>
                            <td><span className="ir-nexus-pill-blue">{m.investorType.replace(/_/g, ' ')}</span></td>
                            <td>{m.meetingDate}</td>
                            <td>{m.meetingFormat.replace(/_/g, ' ')}</td>
                            <td>
                              <span className={m.sentimentScore >= 0.5 ? 'ir-nexus-pill-emerald' : 'ir-nexus-pill-gold'}>
                                {m.sentimentScore > 0 ? `+${m.sentimentScore.toFixed(2)}` : m.sentimentScore.toFixed(2)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'pillar-capital' && (
                <div className="ir-nexus-tab-panel">
                  <div className="ir-nexus-grid-3">
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Enterprise WACC</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--amber-500)' }}>
                        {overview?.capitalMarkets.currentWaccPercent.toFixed(2)}%
                      </div>
                      <div className="ir-nexus-card-sub">Cost of Equity: {overview?.capitalMarkets.costOfEquityPercent.toFixed(2)}% | After-Tax Debt: {overview?.capitalMarkets.costOfDebtAfterTaxPercent.toFixed(2)}%</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Rule 10b-18 Daily Buyback Cap</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--emerald-400)' }}>
                        {overview?.capitalMarkets.repurchaseProgram.rule10b18DailyShareLimit.toLocaleString()} Shares
                      </div>
                      <div className="ir-nexus-card-sub">25% of 4-Week ADTV ({overview?.capitalMarkets.repurchaseProgram.adtvShares.toLocaleString()} shares)</div>
                    </div>
                    <div className="ir-nexus-card">
                      <div className="ir-nexus-card-label">Share Buyback Authorization</div>
                      <div className="ir-nexus-card-val" style={{ color: 'var(--blue-400)' }}>
                        ${((overview?.capitalMarkets.repurchaseProgram.remainingAuthorizationUsd || 164600000) / 1000000).toFixed(1)}M
                      </div>
                      <div className="ir-nexus-card-sub">Remaining of ${((overview?.capitalMarkets.repurchaseProgram.programAuthorizationUsd || 250000000) / 1000000).toFixed(0)}M Program</div>
                    </div>
                  </div>

                  <div className="ir-nexus-simulator-box">
                    <div className="ir-nexus-section-title">Multi-Scenario Capital Markets Financing & Repurchase Modeler</div>
                    <div className="ir-nexus-section-desc">
                      Simulate secondary follow-on equity offerings, convertible senior notes, and Rule 10b-18 share repurchases.
                    </div>
                    <div className="ir-nexus-grid-3">
                      <div className="ir-nexus-slider-group">
                        <label>Scenario Name:</label>
                        <input
                          type="text"
                          value={scenName}
                          onChange={(e) => setScenName(e.target.value)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Financing Instrument:</label>
                        <select
                          value={finType}
                          onChange={(e) => setFinType(e.target.value as CapitalFinancingType)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        >
                          <option value="convertible_senior_notes">Convertible Senior Notes</option>
                          <option value="secondary_equity_offering">Secondary Equity Offering</option>
                          <option value="rule_10b18_share_repurchase">Rule 10b-18 Share Repurchase</option>
                        </select>
                      </div>
                      <div className="ir-nexus-slider-group">
                        <label>Gross Transaction Amount ($):</label>
                        <input
                          type="number"
                          value={grossProceeds}
                          onChange={(e) => setGrossProceeds(parseFloat(e.target.value) || 0)}
                          style={{ padding: '0.4rem', background: 'var(--custom-080d1a)', border: '1px solid var(--slate-800)', color: 'var(--slate-50)', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                    <div className="ir-nexus-sim-outcomes">
                      <button
                        data-testid="simulate-capital-btn"
                        className="ir-nexus-btn-primary"
                        onClick={handleSimulateCapital}
                      >
                        Model Capital Financing & Accretion
                      </button>
                      {capitalSimResult && (
                        <div style={{ marginLeft: '1rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <span>
                            Net Proceeds: <strong style={{ color: 'var(--emerald-400)' }}>${(capitalSimResult.netProceedsUsd / 1000000).toFixed(1)}M</strong>
                          </span>
                          <span>
                            Calculated WACC: <strong>{capitalSimResult.calculatedWaccPercent.toFixed(2)}%</strong>
                          </span>
                          <span>
                            Pro-Forma EPS: <strong>${capitalSimResult.proFormaEpsUsd.toFixed(2)}</strong>
                          </span>
                          <span className={capitalSimResult.isAccretive ? 'ir-nexus-pill-emerald' : 'ir-nexus-pill-gold'}>
                            {capitalSimResult.epsAccretionDilutionPercent > 0 ? `+${capitalSimResult.epsAccretionDilutionPercent.toFixed(1)}% Accretive` : `${capitalSimResult.epsAccretionDilutionPercent.toFixed(1)}% Dilutive`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ir-nexus-table-wrap">
                    <div className="ir-nexus-table-title">Active Capital Structure & Financing Scenarios</div>
                    <table className="ir-nexus-table">
                      <thead>
                        <tr>
                          <th>Scenario Name</th>
                          <th>Instrument Type</th>
                          <th>Gross Proceeds</th>
                          <th>Net Proceeds</th>
                          <th>Dilution %</th>
                          <th>WACC %</th>
                          <th>EPS Accretion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview?.capitalMarkets.activeScenarios.map((sc) => (
                          <tr key={sc.id}>
                            <td style={{ fontWeight: 600 }}>{sc.scenarioName}</td>
                            <td><span className="ir-nexus-pill-blue">{sc.financingType.replace(/_/g, ' ')}</span></td>
                            <td>${(sc.targetGrossProceedsUsd / 1000000).toFixed(1)}M</td>
                            <td style={{ color: 'var(--emerald-400)', fontWeight: 600 }}>${(sc.netProceedsUsd / 1000000).toFixed(1)}M</td>
                            <td>{sc.proFormaDilutionPercent > 0 ? `+${sc.proFormaDilutionPercent.toFixed(2)}%` : `${sc.proFormaDilutionPercent.toFixed(2)}%`}</td>
                            <td>{sc.calculatedWaccPercent.toFixed(2)}%</td>
                            <td>
                              <span className="ir-nexus-pill-emerald">
                                +{sc.proFormaEpsAccretionPercent.toFixed(2)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'pillar-warroom' && (
                <div className="ir-nexus-tab-panel">
                  <div className="ir-nexus-action-bar">
                    <div>
                      <div className="ir-nexus-section-title">SEC Form 8-K Disclosure Pipeline & Tripartite Sign-off</div>
                      <div className="ir-nexus-section-desc">
                        Current Report under Section 13 or 15(d) of the Exchange Act (Item 2.02 and Item 7.01).
                      </div>
                    </div>
                    <button
                      data-testid="generate-8k-btn"
                      className="ir-nexus-btn-primary"
                      onClick={handleGenerate8K}
                    >
                      Generate Form 8-K Draft
                    </button>
                  </div>

                  <div className="ir-nexus-signoff-grid">
                    <div className={`ir-nexus-signoff-card ${disclosure8K?.signoffs.some((s) => s.role === 'vp_investor_relations') ? 'signed' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>1. VP Investor Relations</span>
                        {disclosure8K?.signoffs.some((s) => s.role === 'vp_investor_relations') ? (
                          <span className="ir-nexus-pill-emerald">CERTIFIED</span>
                        ) : (
                          <span className="ir-nexus-pill-gold">PENDING</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', margin: '0.5rem 0' }}>
                        Audits consensus models, NDR feedback, and Reg G reconciliations.
                      </div>
                      <button
                        data-testid="signoff-vp-ir-btn"
                        className="ir-nexus-btn-secondary"
                        onClick={() => handleSignoff8K('vp_investor_relations')}
                      >
                        Sign as Alexander Vance (VP IR)
                      </button>
                    </div>

                    <div className={`ir-nexus-signoff-card ${disclosure8K?.signoffs.some((s) => s.role === 'chief_financial_officer') ? 'signed' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>2. Chief Financial Officer</span>
                        {disclosure8K?.signoffs.some((s) => s.role === 'chief_financial_officer') ? (
                          <span className="ir-nexus-pill-emerald">APPROVED</span>
                        ) : (
                          <span className="ir-nexus-pill-gold">PENDING</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', margin: '0.5rem 0' }}>
                        Ratifies forward financial guidance, capital financing, and Reg G math.
                      </div>
                      <button
                        data-testid="signoff-cfo-btn"
                        className="ir-nexus-btn-secondary"
                        onClick={() => handleSignoff8K('chief_financial_officer')}
                      >
                        Sign as Elena Rostova (CFO)
                      </button>
                    </div>

                    <div className={`ir-nexus-signoff-card ${disclosure8K?.signoffs.some((s) => s.role === 'chief_executive_officer') ? 'signed' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>3. Chief Executive Officer</span>
                        {disclosure8K?.signoffs.some((s) => s.role === 'chief_executive_officer') ? (
                          <span className="ir-nexus-pill-emerald">RATIFIED</span>
                        ) : (
                          <span className="ir-nexus-pill-gold">PENDING</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--slate-400)', margin: '0.5rem 0' }}>
                        Authorizes strategic disclosures and SEC EDGAR dissemination.
                      </div>
                      <button
                        data-testid="signoff-ceo-btn"
                        className="ir-nexus-btn-secondary"
                        onClick={() => handleSignoff8K('chief_executive_officer')}
                      >
                        Sign as David Chen (CEO)
                      </button>
                    </div>
                  </div>

                  <div className="ir-nexus-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="ir-nexus-section-title">SEC EDGAR Form 8-K Disclosure Text</span>
                      <span className="ir-nexus-pill-gold">Status: {disclosure8K?.status.replace(/_/g, ' ').toUpperCase() || 'DRAFT'}</span>
                    </div>
                    <pre className="ir-nexus-markdown-body">
                      {disclosure8K?.markdownContent}
                    </pre>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
