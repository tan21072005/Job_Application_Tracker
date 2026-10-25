import React, { useState, useEffect } from 'react';
import {
  type CorporateTreasuryOverviewDTO,
  type TreasuryBankAccountDTO,
  type TreasuryEntityDTO,
  type WeeklyCashForecastItemDTO,
  type FxExposureItemDTO,
  type FxHedgeContractDTO,
  type BankCounterpartyDTO,
  type CashSweepExecutionResultDTO,
  type WorkingCapitalSimulationResultDTO,
  type FxSensitivitySimulationResultDTO,
  type BailInStressTestResultDTO,
  type TreasuryBoardMemorandumDTO,
  type TreasuryBoardSignoffRole,
  formatDate
} from '../domain';
import { corporateTreasuryNexusRepository } from '../data';

interface CorporateTreasuryNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorporateTreasuryNexusModal: React.FC<CorporateTreasuryNexusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'sweeps' | 'forecast' | 'fx' | 'counterparty' | 'board'>('sweeps');
  const [overview, setOverview] = useState<CorporateTreasuryOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [sweepResult, setSweepResult] = useState<CashSweepExecutionResultDTO | null>(null);
  const [isSweeping, setIsSweeping] = useState<boolean>(false);

  const [dso, setDso] = useState<number>(38);
  const [dpo, setDpo] = useState<number>(45);
  const [dio, setDio] = useState<number>(18);
  const [cccResult, setCccResult] = useState<WorkingCapitalSimulationResultDTO | null>(null);
  const [isSimulatingCcc, setIsSimulatingCcc] = useState<boolean>(false);

  const [selectedFxPair, setSelectedFxPair] = useState<string>('EUR/USD');
  const [fxShock, setFxShock] = useState<number>(10);
  const [fxCoverage, setFxCoverage] = useState<number>(85);
  const [fxResult, setFxResult] = useState<FxSensitivitySimulationResultDTO | null>(null);
  const [isSimulatingFx, setIsSimulatingFx] = useState<boolean>(false);

  const [selectedBankId, setSelectedBankId] = useState<string>('bank-1');
  const [haircutPercent, setHaircutPercent] = useState<number>(25);
  const [bailInResult, setBailInResult] = useState<BailInStressTestResultDTO | null>(null);
  const [isSimulatingBailIn, setIsSimulatingBailIn] = useState<boolean>(false);

  const [fiscalQuarter, setFiscalQuarter] = useState<string>('Q1-2026');
  const [memoTitle, setMemoTitle] = useState<string>('Q1-2026 Executive Treasury Committee & Board Financial Risk Review');
  const [activeMemo, setActiveMemo] = useState<TreasuryBoardMemorandumDTO | null>(null);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await corporateTreasuryNexusRepository.getOverview();
      setOverview(data);
      if (data.latestBoardMemo) {
        setActiveMemo(data.latestBoardMemo);
      }
      if (data.counterpartyRisk.counterparties.length > 0 && !selectedBankId) {
        setSelectedBankId(data.counterpartyRisk.counterparties[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load corporate treasury telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await corporateTreasuryNexusRepository.executeCashSweep({ sweepMode: 'all_zba' });
      setSweepResult(res);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to execute cash sweep');
    } finally {
      setIsSweeping(false);
    }
  };

  const handleSimulateCcc = async () => {
    setIsSimulatingCcc(true);
    try {
      const res = await corporateTreasuryNexusRepository.simulateWorkingCapital({
        adjustedDso: dso,
        adjustedDpo: dpo,
        adjustedDio: dio
      });
      setCccResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate working capital');
    } finally {
      setIsSimulatingCcc(false);
    }
  };

  const handleSimulateFx = async () => {
    setIsSimulatingFx(true);
    try {
      const res = await corporateTreasuryNexusRepository.simulateFxSensitivity({
        currencyPair: selectedFxPair,
        shockPercentage: fxShock,
        holdingPeriodDays: 10,
        confidenceInterval: 0.95,
        hedgingCoverageAdjustmentPercent: fxCoverage
      });
      setFxResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to simulate FX sensitivity');
    } finally {
      setIsSimulatingFx(false);
    }
  };

  const handleSimulateBailIn = async () => {
    setIsSimulatingBailIn(true);
    try {
      const targetBank = selectedBankId || (overview?.counterpartyRisk.counterparties[0]?.id || 'bank-1');
      const res = await corporateTreasuryNexusRepository.simulateBailInStress({
        stressedBankId: targetBank,
        haircutLossPercentage: haircutPercent,
        sovereignSpreadShockBps: 100
      });
      setBailInResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to run bail-in stress test');
    } finally {
      setIsSimulatingBailIn(false);
    }
  };

  const handleGenerateMemo = async () => {
    setIsGeneratingMemo(true);
    try {
      const memo = await corporateTreasuryNexusRepository.generateBoardMemo({
        fiscalQuarter,
        title: memoTitle,
        stressTestScenarioIncluded: true
      });
      setActiveMemo(memo);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to generate board memorandum');
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  const handleSignoff = async (role: TreasuryBoardSignoffRole) => {
    if (!activeMemo) return;
    setIsSigning(true);
    try {
      const signerMap: Record<TreasuryBoardSignoffRole, { name: string; comments: string }> = {
        corporate_treasurer: {
          name: 'Alexandra Chen, CFA',
          comments: 'Certified operational liquidity, ZBA balances, and derivative effectiveness.'
        },
        chief_financial_officer: {
          name: 'Marcus Vance, CPA',
          comments: 'Approved enterprise liquidity runway, balance sheet impact, and credit thresholds.'
        },
        board_audit_finance_chair: {
          name: 'Dr. Eleanor Sterling',
          comments: 'Ratified fiduciary risk policy compliance and counterparty boundaries.'
        }
      };
      const signer = signerMap[role];
      const updated = await corporateTreasuryNexusRepository.signoffBoardMemo(activeMemo.id, {
        role,
        signerName: signer.name,
        comments: signer.comments
      });
      setActiveMemo(updated);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to sign off board memorandum');
    } finally {
      setIsSigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="treasury-nexus-backdrop" onClick={onClose}>
      <div className="treasury-nexus-container" onClick={(e) => e.stopPropagation()}>
        <div className="treasury-nexus-header">
          <div className="treasury-nexus-header-left">
            <div className="treasury-nexus-brand-row">
              <span className="treasury-nexus-brand-icon">🏛️</span>
              <h2 className="treasury-nexus-title">Corporate Treasury, Cash Liquidity & Multi-Currency Working Capital Nexus</h2>
              <span
                data-testid="trls-score-badge"
                className={`treasury-nexus-score-badge ${
                  (overview?.compositeTrlsScore || 89.4) >= 90
                    ? 'sovereign-fortress'
                    : 'defensible-stability'
                }`}
              >
                TRLS {overview?.compositeTrlsScore?.toFixed(1) || '89.4'} / 100 • {overview?.trlsBand?.toUpperCase().replace(/_/g, ' ') || 'DEFENSIBLE STABILITY'}
              </span>
            </div>
            <div className="treasury-nexus-subtitle">
              Sovereign Multi-Entity Pooling • 13-Week Cash Forecasting • FX VaR-95 ASC 815 • Bank Bail-In Stress • Tripartite Board Governance
            </div>
          </div>
          <div className="treasury-nexus-header-actions">
            <button
              data-testid="refresh-treasury-nexus-btn"
              className="treasury-nexus-btn-ghost"
              onClick={loadOverview}
              title="Refresh Telemetry"
            >
              🔄
            </button>
            <button
              data-testid="close-treasury-nexus-btn"
              className="treasury-nexus-btn-ghost"
              onClick={onClose}
              title="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="treasury-nexus-tabs">
          <button
            data-testid="tab-pillar-sweeps"
            className={`treasury-nexus-tab-btn ${activeTab === 'sweeps' ? 'active' : ''}`}
            onClick={() => setActiveTab('sweeps')}
          >
            Pillar A: Cash Concentration & ZBA Sweeps
          </button>
          <button
            data-testid="tab-pillar-forecast"
            className={`treasury-nexus-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
            onClick={() => setActiveTab('forecast')}
          >
            Pillar B: 13-Week Forecast & CCC
          </button>
          <button
            data-testid="tab-pillar-fx"
            className={`treasury-nexus-tab-btn ${activeTab === 'fx' ? 'active' : ''}`}
            onClick={() => setActiveTab('fx')}
          >
            Pillar C: FX Exposure & VaR-95
          </button>
          <button
            data-testid="tab-pillar-counterparty"
            className={`treasury-nexus-tab-btn ${activeTab === 'counterparty' ? 'active' : ''}`}
            onClick={() => setActiveTab('counterparty')}
          >
            Pillar D: Bank Bail-In Stress Testing
          </button>
          <button
            data-testid="tab-pillar-board"
            className={`treasury-nexus-tab-btn ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            Pillar E: Board Risk Memo & Sign-Off
          </button>
        </div>

        {error && (
          <div className="treasury-nexus-banner-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="treasury-nexus-content">
          {loading && !overview ? (
            <div className="treasury-nexus-loading">Loading Corporate Treasury Nexus Telemetry...</div>
          ) : (
            <>
              {activeTab === 'sweeps' && (
                <div className="treasury-nexus-tab-panel">
                  <div className="treasury-nexus-grid-3">
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Global Consolidated Liquidity</div>
                      <div className="treasury-nexus-card-val text-emerald">
                        ${((overview?.cashConcentration.totalGlobalLiquidityUsd || 48500000) / 1000000).toFixed(2)}M
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Across {overview?.cashConcentration.entities.length || 6} jurisdictions & {overview?.cashConcentration.accounts.length || 8} banking accounts
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Physical Swept Today (ZBA)</div>
                      <div className="treasury-nexus-card-val text-blue">
                        ${((overview?.cashConcentration.physicalSweptTodayUsd || 6200000) / 1000000).toFixed(2)}M
                      </div>
                      <div className="treasury-nexus-card-sub">
                        {overview?.cashConcentration.activeZbaCount || 5} active Zero Balance disbursement accounts
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Notional Pooling Yield Arbitrage</div>
                      <div className="treasury-nexus-card-val text-gold">
                        +${((overview?.cashConcentration.annualizedPoolingYieldArbitrageUsd || 142500) / 1000).toFixed(1)}K / yr
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Virtual multi-currency netting eliminating FX spread drag
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-action-bar">
                    <div>
                      <div className="treasury-nexus-section-title">Automated End-of-Day Physical Cash Concentration</div>
                      <div className="treasury-nexus-section-desc">
                        Triggers automated zero-balance sweeps upstream into master concentration pools and accrues arm's-length intercompany interest.
                      </div>
                    </div>
                    <button
                      data-testid="execute-sweep-btn"
                      className="treasury-nexus-btn-primary"
                      onClick={handleExecuteSweep}
                      disabled={isSweeping}
                    >
                      {isSweeping ? 'Sweeping Accounts...' : '⚡ Execute Global Cash Sweep'}
                    </button>
                  </div>

                  {sweepResult && (
                    <div className="treasury-nexus-result-box">
                      <div className="treasury-nexus-result-title">✅ Cash Concentration Executed Successfully</div>
                      <div className="treasury-nexus-result-text">{sweepResult.summary}</div>
                      <div className="treasury-nexus-badge-row">
                        <span className="treasury-nexus-pill-emerald">Swept: ${(sweepResult.totalAmountSweptUsd / 1000000).toFixed(2)}M USD</span>
                        <span className="treasury-nexus-pill-gold">Arbitrage: +${(sweepResult.annualizedArbitrageUsd / 1000).toFixed(1)}K / yr</span>
                        <span className="treasury-nexus-pill-blue">Accrued Loan Interest: ${sweepResult.intercompanyLoanInterestAccruedUsd.toFixed(2)} USD</span>
                      </div>
                    </div>
                  )}

                  <div className="treasury-nexus-table-wrap">
                    <div className="treasury-nexus-table-title">Global Multi-Entity Bank Account Portfolio</div>
                    <table className="treasury-nexus-table">
                      <thead>
                        <tr>
                          <th>Legal Entity</th>
                          <th>Depository Partner</th>
                          <th>BIC/SWIFT</th>
                          <th>Account</th>
                          <th>Cur</th>
                          <th>Sweeping Type</th>
                          <th>Rating</th>
                          <th>Balance (Local)</th>
                          <th>Balance (USD Eq)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.cashConcentration.accounts || []).map((acc) => (
                          <tr key={acc.id}>
                            <td className="font-semibold">{acc.entityName}</td>
                            <td>{acc.bankName}</td>
                            <td className="font-mono text-muted">{acc.bankBicSwift}</td>
                            <td className="font-mono">{acc.accountNumberMasked}</td>
                            <td><span className="treasury-nexus-pill-gray">{acc.currency}</span></td>
                            <td>
                              <span className={`treasury-nexus-pill-sweep ${acc.sweepingType}`}>
                                {acc.sweepingType.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td><span className="treasury-nexus-pill-rating">{acc.bankCreditRating}</span></td>
                            <td className="text-right font-mono">{acc.currentBalance.toLocaleString()} {acc.currency}</td>
                            <td className="text-right font-mono font-bold text-emerald">
                              ${acc.currentBalanceUsd.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'forecast' && (
                <div className="treasury-nexus-tab-panel">
                  <div className="treasury-nexus-grid-3">
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Cash Conversion Cycle (CCC)</div>
                      <div className="treasury-nexus-card-val text-blue">
                        {cccResult ? cccResult.revisedCccDays.toFixed(1) : (overview?.cashForecast.workingCapitalCycle.netCashConversionCycleDays.toFixed(1) || '11.0')} Days
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Status: <strong className="text-emerald">{cccResult ? cccResult.status.toUpperCase() : 'LEAN'}</strong> (Target: &le; 15.0 Days)
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Unencumbered Liquidity Runway</div>
                      <div className="treasury-nexus-card-val text-emerald">
                        {cccResult ? cccResult.runwayMonths.toFixed(1) : (overview?.cashForecast.minimumProjectedRunwayMonths.toFixed(1) || '11.2')} Months
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Min Buffer: $8.5M • Precautionary: $12.0M
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">13-Week Forecast Accuracy</div>
                      <div className="treasury-nexus-card-val text-gold">
                        {overview?.cashForecast.forecastAccuracyScorePercent.toFixed(1) || '95.8'}%
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Direct cash flow tracking within 2.0% variance boundary
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-simulator-box">
                    <div className="treasury-nexus-section-title">Working Capital Cycle Optimizer (CCC = DIO + DSO - DPO)</div>
                    <div className="treasury-nexus-slider-grid">
                      <div className="treasury-nexus-slider-group">
                        <label>Days Sales Outstanding (DSO): <strong>{dso} Days</strong></label>
                        <input
                          data-testid="ccc-dso-slider"
                          type="range"
                          min="15"
                          max="90"
                          value={dso}
                          onChange={(e) => setDso(Number(e.target.value))}
                        />
                      </div>
                      <div className="treasury-nexus-slider-group">
                        <label>Days Payable Outstanding (DPO): <strong>{dpo} Days</strong></label>
                        <input
                          data-testid="ccc-dpo-slider"
                          type="range"
                          min="15"
                          max="90"
                          value={dpo}
                          onChange={(e) => setDpo(Number(e.target.value))}
                        />
                      </div>
                      <div className="treasury-nexus-slider-group">
                        <label>Days Inventory Outstanding (DIO): <strong>{dio} Days</strong></label>
                        <input
                          type="range"
                          min="5"
                          max="45"
                          value={dio}
                          onChange={(e) => setDio(Number(e.target.value))}
                        />
                      </div>
                      <div className="treasury-nexus-slider-group justify-end">
                        <button
                          data-testid="simulate-ccc-btn"
                          className="treasury-nexus-btn-primary"
                          onClick={handleSimulateCcc}
                          disabled={isSimulatingCcc}
                        >
                          {isSimulatingCcc ? 'Simulating...' : 'Recalculate Working Capital'}
                        </button>
                      </div>
                    </div>

                    {cccResult && (
                      <div className="treasury-nexus-sim-outcomes">
                        <div className="outcome-pill">
                          Previous CCC: <strong>{cccResult.previousCccDays} Days</strong>
                        </div>
                        <div className="outcome-pill">
                          Revised CCC: <strong>{cccResult.revisedCccDays} Days</strong>
                        </div>
                        <div className="outcome-pill text-emerald">
                          Capital Released: <strong>+${(cccResult.freedWorkingCapitalUsd / 1000).toFixed(1)}K USD</strong>
                        </div>
                        <div className="outcome-pill text-gold">
                          Annual Interest Saved: <strong>+${(cccResult.annualInterestSavedUsd / 1000).toFixed(1)}K / yr</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="treasury-nexus-grid-2">
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">4-Tier Liquidity Investment Ladder</div>
                      <div className="treasury-nexus-ladder-list">
                        <div className="ladder-item">
                          <div>
                            <div className="font-semibold text-emerald">Tier 1: Overnight Operational Cash</div>
                            <div className="text-xs text-muted">Central bank reserves & instant settlement</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">$18.5M</div>
                            <div className="text-xs text-emerald">4.30% Yield</div>
                          </div>
                        </div>
                        <div className="ladder-item">
                          <div>
                            <div className="font-semibold text-blue">Tier 2: Short-Term Repo & 1M-3M T-Bills</div>
                            <div className="text-xs text-muted">Same-day settlement collateralized repo</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">$12.0M</div>
                            <div className="text-xs text-blue">4.85% Yield</div>
                          </div>
                        </div>
                        <div className="ladder-item">
                          <div>
                            <div className="font-semibold text-purple">Tier 3: Prime Commercial Paper 3M-6M</div>
                            <div className="text-xs text-muted">7-day liquidity notice Tier-1 paper</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">$10.0M</div>
                            <div className="text-xs text-purple">5.15% Yield</div>
                          </div>
                        </div>
                        <div className="ladder-item">
                          <div>
                            <div className="font-semibold text-gold">Tier 4: Held-to-Maturity Sovereign Bonds</div>
                            <div className="text-xs text-muted">High-grade US Treasuries & sovereign gilts</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold">$8.0M</div>
                            <div className="text-xs text-gold">5.40% Yield</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">13-Week Direct Cash Forecast Trajectory</div>
                      <div className="treasury-nexus-forecast-scroll">
                        <table className="treasury-nexus-table compact">
                          <thead>
                            <tr>
                              <th>Wk</th>
                              <th>Week Start</th>
                              <th>Collections</th>
                              <th>Disbursements</th>
                              <th>Net Flow</th>
                              <th>Closing (P50)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(overview?.cashForecast.weeklyForecasts || []).map((wf) => (
                              <tr key={wf.weekIndex}>
                                <td className="font-mono">W{wf.weekIndex}</td>
                                <td>{wf.weekStartingDate}</td>
                                <td className="text-emerald font-mono">+${(wf.projectedCustomerCollectionsUsd / 1000).toFixed(0)}K</td>
                                <td className="text-red font-mono">-${((wf.projectedPayrollDisbursementsUsd + wf.projectedVendorApDisbursementsUsd + wf.projectedTaxAndRegulatoryUsd + wf.projectedCapExAndDebtServiceUsd) / 1000).toFixed(0)}K</td>
                                <td className={`font-mono ${wf.netWeeklyCashFlowUsd >= 0 ? 'text-emerald' : 'text-amber'}`}>
                                  {wf.netWeeklyCashFlowUsd >= 0 ? '+' : ''}${(wf.netWeeklyCashFlowUsd / 1000).toFixed(0)}K
                                </td>
                                <td className="font-mono font-bold text-right">${(wf.closingCashP50BaselineUsd / 1000000).toFixed(2)}M</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'fx' && (
                <div className="treasury-nexus-tab-panel">
                  <div className="treasury-nexus-grid-3">
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">1-Day 95% Parametric VaR</div>
                      <div className="treasury-nexus-card-val text-red">
                        ${((overview?.fxHedging.portfolio1DayVaR95Usd || 124500) / 1000).toFixed(1)}K USD
                      </div>
                      <div className="treasury-nexus-card-sub">
                        10-Day VaR-99: ${((overview?.fxHedging.portfolio10DayVaR99Usd || 550000) / 1000).toFixed(1)}K (&lt; 0.85% total liquidity)
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Hedging Program Coverage</div>
                      <div className="treasury-nexus-card-val text-emerald">
                        {overview?.fxHedging.weightedHedgeRatioPercent.toFixed(1) || '84.0'}%
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Target: &ge; 85.0% • Covered: ${((overview?.fxHedging.totalHedgedNotionalUsd || 15915367) / 1000000).toFixed(2)}M USD
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Unrealized MtM Gain / Loss</div>
                      <div className="treasury-nexus-card-val text-gold">
                        +${((overview?.fxHedging.unrealizedMtmGainLossUsd || 42500) / 1000).toFixed(1)}K USD
                      </div>
                      <div className="treasury-nexus-card-sub">
                        ASC 815 / IFRS 9 OCI Cash Flow Hedge Accounting
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-simulator-box">
                    <div className="treasury-nexus-section-title">FX Volatility & Currency Shock Sensitivity Simulator</div>
                    <div className="treasury-nexus-filter-row">
                      <div className="filter-group">
                        <label>Currency Pair:</label>
                        <select
                          data-testid="fx-pair-select"
                          value={selectedFxPair}
                          onChange={(e) => setSelectedFxPair(e.target.value)}
                        >
                          <option value="EUR/USD">EUR/USD (Spot: 1.0850)</option>
                          <option value="GBP/USD">GBP/USD (Spot: 1.2720)</option>
                          <option value="USD/JPY">USD/JPY (Spot: 154.30)</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Currency Shock (%):</label>
                        <select
                          data-testid="fx-shock-select"
                          value={fxShock}
                          onChange={(e) => setFxShock(Number(e.target.value))}
                        >
                          <option value="15">+15% Rapid Appreciation</option>
                          <option value="10">+10% Moderate Appreciation</option>
                          <option value="5">+5% Mild Appreciation</option>
                          <option value="-5">-5% Mild Depreciation</option>
                          <option value="-10">-10% Severe Depreciation</option>
                          <option value="-15">-15% Currency Crisis Shock</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Hedging Coverage (%):</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={fxCoverage}
                          onChange={(e) => setFxCoverage(Number(e.target.value))}
                        />
                      </div>
                      <div className="filter-group justify-end">
                        <button
                          data-testid="simulate-fx-btn"
                          className="treasury-nexus-btn-primary"
                          onClick={handleSimulateFx}
                          disabled={isSimulatingFx}
                        >
                          {isSimulatingFx ? 'Simulating...' : 'Simulate VaR & Shock'}
                        </button>
                      </div>
                    </div>

                    {fxResult && (
                      <div className="treasury-nexus-sim-outcomes">
                        <div className="outcome-pill">
                          Unhedged Impact: <strong className="text-amber">${(fxResult.unhedgedPnlImpactUsd / 1000).toFixed(1)}K</strong>
                        </div>
                        <div className="outcome-pill">
                          Hedged Impact: <strong className="text-emerald">${(fxResult.hedgedPnlImpactUsd / 1000).toFixed(1)}K</strong>
                        </div>
                        <div className="outcome-pill text-emerald">
                          Variance Reduction: <strong>${(fxResult.netVarianceReductionUsd / 1000).toFixed(1)}K USD</strong>
                        </div>
                        <div className="outcome-pill">
                          1-Day VaR-95: <strong>${(fxResult.parametricVaRUsd / 1000).toFixed(1)}K USD</strong>
                        </div>
                        <div className="outcome-pill text-purple">
                          Offset Ratio: <strong>{fxResult.projectedDollarOffsetRatio.toFixed(1)}% (ASC 815 PASS)</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="treasury-nexus-table-wrap">
                    <div className="treasury-nexus-table-title">Active FX Derivative Contract Book (ASC 815 / IFRS 9)</div>
                    <table className="treasury-nexus-table">
                      <thead>
                        <tr>
                          <th>Contract Ref</th>
                          <th>Counterparty</th>
                          <th>Pair</th>
                          <th>Instrument</th>
                          <th>Notional Foreign</th>
                          <th>Notional USD</th>
                          <th>Strike / Corridor</th>
                          <th>Maturity</th>
                          <th>MtM Gain/Loss</th>
                          <th>Dollar Offset</th>
                          <th>Accounting Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.fxHedging.contracts || []).map((c) => (
                          <tr key={c.id}>
                            <td className="font-mono font-semibold">{c.contractReference}</td>
                            <td>{c.counterpartyBankName}</td>
                            <td><span className="treasury-nexus-pill-gray">{c.currencyPair}</span></td>
                            <td><span className="treasury-nexus-pill-blue">{c.instrumentType.replace(/_/g, ' ')}</span></td>
                            <td className="text-right font-mono">{c.notionalAmountForeign.toLocaleString()}</td>
                            <td className="text-right font-mono">${c.notionalAmountUsd.toLocaleString()}</td>
                            <td className="font-mono text-center">
                              {c.collarCeilingRate ? `${c.collarFloorRate} - ${c.collarCeilingRate}` : c.strikeRate}
                            </td>
                            <td>{c.maturityDate}</td>
                            <td className={`text-right font-mono font-bold ${c.markToMarketGainLossUsd >= 0 ? 'text-emerald' : 'text-red'}`}>
                              {c.markToMarketGainLossUsd >= 0 ? '+' : ''}${c.markToMarketGainLossUsd.toLocaleString()}
                            </td>
                            <td className="text-center font-mono font-bold text-purple">{c.dollarOffsetRatioPercent.toFixed(1)}%</td>
                            <td>
                              <span className={`treasury-nexus-pill-status ${c.accountingStatus}`}>
                                {c.accountingStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'counterparty' && (
                <div className="treasury-nexus-tab-panel">
                  <div className="treasury-nexus-grid-3">
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Weighted Credit Quality</div>
                      <div className="treasury-nexus-card-val text-emerald">
                        {overview?.counterpartyRisk.weightedAverageRating || 'AA_MINUS'}
                      </div>
                      <div className="treasury-nexus-card-sub">
                        100% G-SIB & Tier-1 Institutions • Zero high-yield exposure
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Total Uninsured Depository Assets</div>
                      <div className="treasury-nexus-card-val text-amber">
                        ${((overview?.counterpartyRisk.totalUninsuredDepositsUsd || 26433300) / 1000000).toFixed(2)}M
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Exceeding $250K FDIC / €100K DGS statutory insurance limits
                      </div>
                    </div>
                    <div className="treasury-nexus-card">
                      <div className="treasury-nexus-card-label">Max Single Bank Concentration</div>
                      <div className="treasury-nexus-card-val text-blue">
                        {overview?.counterpartyRisk.maxSingleBankExposurePercent.toFixed(1) || '29.3'}%
                      </div>
                      <div className="treasury-nexus-card-sub">
                        Board Cap: 20.0% • Limit Breaches: {overview?.counterpartyRisk.limitBreachCount || 0}
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-simulator-box">
                    <div className="treasury-nexus-section-title">Quantitative Bank Bail-In & Haircut Stress Simulator (BRRD / Dodd-Frank)</div>
                    <div className="treasury-nexus-slider-grid">
                      <div className="treasury-nexus-slider-group">
                        <label>Target Depository Partner:</label>
                        <select
                          data-testid="stressed-bank-select"
                          value={selectedBankId}
                          onChange={(e) => setSelectedBankId(e.target.value)}
                        >
                          {(overview?.counterpartyRisk.counterparties || []).map((cp) => (
                            <option key={cp.id} value={cp.id}>
                              {cp.bankName} (${(cp.totalDepositsHeldUsd / 1000000).toFixed(2)}M held)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="treasury-nexus-slider-group">
                        <label>Uninsured Haircut Loss: <strong>{haircutPercent}%</strong></label>
                        <input
                          data-testid="bailin-haircut-slider"
                          type="range"
                          min="5"
                          max="50"
                          value={haircutPercent}
                          onChange={(e) => setHaircutPercent(Number(e.target.value))}
                        />
                      </div>
                      <div className="treasury-nexus-slider-group justify-end">
                        <button
                          data-testid="run-bailin-btn"
                          className="treasury-nexus-btn-danger"
                          onClick={handleSimulateBailIn}
                          disabled={isSimulatingBailIn}
                        >
                          {isSimulatingBailIn ? 'Simulating...' : '🚨 Run Bail-In Stress Scenario'}
                        </button>
                      </div>
                    </div>

                    {bailInResult && (
                      <div className="treasury-nexus-sim-outcomes">
                        <div className="outcome-pill">
                          Stressed: <strong>{bailInResult.stressedBankName}</strong>
                        </div>
                        <div className="outcome-pill text-amber">
                          Uninsured Subject to Haircut: <strong>${(bailInResult.uninsuredDepositsSubjectToHaircutUsd / 1000000).toFixed(2)}M</strong>
                        </div>
                        <div className="outcome-pill text-red">
                          Projected Loss: <strong>-${(bailInResult.projectedHaircutLossUsd / 1000000).toFixed(2)}M USD</strong>
                        </div>
                        <div className="outcome-pill text-emerald">
                          Remaining Liquidity: <strong>${(bailInResult.postStressAvailableLiquidityUsd / 1000000).toFixed(2)}M</strong>
                        </div>
                        <div className="outcome-pill">
                          Revised Runway: <strong>{bailInResult.revisedEnterpriseRunwayMonths} Mo</strong>
                        </div>
                        <div className="outcome-banner-recommendation">
                          💡 <strong>Contingency Action:</strong> {bailInResult.contingentFundingRecommendation}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="treasury-nexus-table-wrap">
                    <div className="treasury-nexus-table-title">Depository Partner Credit Ratings & Basel III Metrics</div>
                    <table className="treasury-nexus-table">
                      <thead>
                        <tr>
                          <th>Institution</th>
                          <th>Jurisdiction</th>
                          <th>S&P / Moody / Fitch</th>
                          <th>5Y CDS</th>
                          <th>Default Prob</th>
                          <th>LCR</th>
                          <th>NSFR</th>
                          <th>Deposits Held</th>
                          <th>Share %</th>
                          <th>Board Limit</th>
                          <th>Limit Util</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.counterpartyRisk.counterparties || []).map((cp) => (
                          <tr key={cp.id}>
                            <td className="font-semibold">{cp.bankName}</td>
                            <td className="text-muted">{cp.jurisdiction}</td>
                            <td className="font-mono">{cp.spRating} / {cp.moodysRating} / {cp.fitchRating}</td>
                            <td className="font-mono text-purple">{cp.fiveYearCdsSpreadBps} bps</td>
                            <td className="font-mono text-amber">{cp.impliedDefaultProbabilityPercent.toFixed(2)}%</td>
                            <td className="font-mono text-emerald">{cp.baselLiquidityCoverageRatioPercent}%</td>
                            <td className="font-mono text-blue">{cp.baselNetStableFundingRatioPercent}%</td>
                            <td className="text-right font-mono font-bold">${(cp.totalDepositsHeldUsd / 1000000).toFixed(2)}M</td>
                            <td className="text-center font-mono">{cp.portfolioDepositorySharePercent.toFixed(1)}%</td>
                            <td className="text-right font-mono">${(cp.boardApprovedExposureLimitUsd / 1000000).toFixed(1)}M</td>
                            <td className="text-center">
                              <span className={`treasury-nexus-pill-util ${cp.limitUtilizationPercent > 90 ? 'high' : 'normal'}`}>
                                {cp.limitUtilizationPercent.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'board' && (
                <div className="treasury-nexus-tab-panel">
                  <div className="treasury-nexus-memo-creator-bar">
                    <div className="treasury-nexus-filter-row">
                      <div className="filter-group">
                        <label>Fiscal Quarter:</label>
                        <input
                          data-testid="memo-quarter-input"
                          type="text"
                          value={fiscalQuarter}
                          onChange={(e) => setFiscalQuarter(e.target.value)}
                        />
                      </div>
                      <div className="filter-group flex-2">
                        <label>Memorandum Title:</label>
                        <input
                          type="text"
                          value={memoTitle}
                          onChange={(e) => setMemoTitle(e.target.value)}
                        />
                      </div>
                      <div className="filter-group justify-end">
                        <button
                          data-testid="generate-memo-btn"
                          className="treasury-nexus-btn-primary"
                          onClick={handleGenerateMemo}
                          disabled={isGeneratingMemo}
                        >
                          {isGeneratingMemo ? 'Generating...' : '📝 Generate Board Financial Risk Memo'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-tripartite-box">
                    <div className="treasury-nexus-section-title">Tripartite Digital Sign-Off Authority Pipeline</div>
                    <div className="treasury-nexus-signoff-grid">
                      <div className={`signoff-card ${activeMemo?.signoffs.some(s => s.role === 'corporate_treasurer') ? 'signed' : 'pending'}`}>
                        <div className="signoff-role-label">1. Corporate Treasurer</div>
                        <div className="signoff-officer-name">Alexandra Chen, CFA</div>
                        <div className="signoff-status-text">
                          {activeMemo?.signoffs.some(s => s.role === 'corporate_treasurer')
                            ? `✅ Signed on ${activeMemo.signoffs.find(s => s.role === 'corporate_treasurer')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Certification'}
                        </div>
                        <button
                          data-testid="signoff-treasurer-btn"
                          className="treasury-nexus-btn-secondary"
                          onClick={() => handleSignoff('corporate_treasurer')}
                          disabled={isSigning || activeMemo?.signoffs.some(s => s.role === 'corporate_treasurer')}
                        >
                          Certify as Treasurer
                        </button>
                      </div>

                      <div className={`signoff-card ${activeMemo?.signoffs.some(s => s.role === 'chief_financial_officer') ? 'signed' : 'pending'}`}>
                        <div className="signoff-role-label">2. Chief Financial Officer</div>
                        <div className="signoff-officer-name">Marcus Vance, CPA</div>
                        <div className="signoff-status-text">
                          {activeMemo?.signoffs.some(s => s.role === 'chief_financial_officer')
                            ? `✅ Signed on ${activeMemo.signoffs.find(s => s.role === 'chief_financial_officer')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Approval'}
                        </div>
                        <button
                          data-testid="signoff-cfo-btn"
                          className="treasury-nexus-btn-secondary"
                          onClick={() => handleSignoff('chief_financial_officer')}
                          disabled={isSigning || activeMemo?.signoffs.some(s => s.role === 'chief_financial_officer')}
                        >
                          Approve as CFO
                        </button>
                      </div>

                      <div className={`signoff-card ${activeMemo?.signoffs.some(s => s.role === 'board_audit_finance_chair') ? 'signed' : 'pending'}`}>
                        <div className="signoff-role-label">3. Board Audit & Finance Chair</div>
                        <div className="signoff-officer-name">Dr. Eleanor Sterling</div>
                        <div className="signoff-status-text">
                          {activeMemo?.signoffs.some(s => s.role === 'board_audit_finance_chair')
                            ? `✅ Ratified on ${activeMemo.signoffs.find(s => s.role === 'board_audit_finance_chair')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Ratification'}
                        </div>
                        <button
                          data-testid="signoff-board-btn"
                          className="treasury-nexus-btn-secondary"
                          onClick={() => handleSignoff('board_audit_finance_chair')}
                          disabled={isSigning || activeMemo?.signoffs.some(s => s.role === 'board_audit_finance_chair')}
                        >
                          Ratify as Board Chair
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="treasury-nexus-memo-viewer">
                    <div className="treasury-nexus-memo-header-info">
                      <div>
                        <div className="font-bold text-lg">{activeMemo?.title || 'Board Financial Risk Memorandum'}</div>
                        <div className="text-sm text-muted">
                          Reference: {activeMemo?.memoReference || 'N/A'} • Status: <strong className="text-emerald">{activeMemo?.status.toUpperCase() || 'DRAFT'}</strong>
                        </div>
                      </div>
                    </div>
                    <pre className="treasury-nexus-markdown-body">
                      {activeMemo?.generatedMarkdownContent || 'No memorandum generated yet. Click "Generate Board Financial Risk Memo" above.'}
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
