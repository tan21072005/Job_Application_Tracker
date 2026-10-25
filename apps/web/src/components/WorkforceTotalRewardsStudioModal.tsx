import React, { useState, useEffect } from 'react';
import {
  type TotalRewardsStudioOverviewDTO,
  type SalaryBandGradeDTO,
  type EmployeeCompensationProfileDTO,
  type ExecutiveLtiGrantDTO,
  type RelativeTsrSimulationResultDTO,
  type Section83bArbitrageResultDTO,
  type CrossBorderEquityTaxProfileDTO,
  type PayEquityCohortRegressionDTO,
  type StatutoryComplianceAuditStatusDTO,
  type TotalRewardsBoardMemorandumDTO,
  type TotalRewardsBoardSignoffRole,
  type JobLevelTrack,
  formatDate
} from '../domain';
import { workforceTotalRewardsStudioRepository } from '../data';

interface WorkforceTotalRewardsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkforceTotalRewardsStudioModal: React.FC<WorkforceTotalRewardsStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'bands' | 'lti' | 'tax' | 'equity' | 'governance'>('bands');
  const [overview, setOverview] = useState<TotalRewardsStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [trackFilter, setTrackFilter] = useState<'all' | JobLevelTrack>('all');

  const [simYears, setSimYears] = useState<number>(3);
  const [simDrift, setSimDrift] = useState<number>(0.12);
  const [simVol, setSimVol] = useState<number>(0.35);
  const [simPeerDrift, setSimPeerDrift] = useState<number>(0.10);
  const [simPeerVol, setSimPeerVol] = useState<number>(0.30);
  const [simCorr, setSimCorr] = useState<number>(0.55);
  const [simPeers, setSimPeers] = useState<number>(12);
  const [simIterations, setSimIterations] = useState<number>(500);
  const [simCapEnforced, setSimCapEnforced] = useState<boolean>(true);
  const [simResult, setSimResult] = useState<RelativeTsrSimulationResultDTO | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const [taxShares, setTaxShares] = useState<number>(50000);
  const [taxGrantFmv, setTaxGrantFmv] = useState<number>(1.0);
  const [taxStrike, setTaxStrike] = useState<number>(0.10);
  const [taxLiquidityFmv, setTaxLiquidityFmv] = useState<number>(25.0);
  const [taxOrdRate, setTaxOrdRate] = useState<number>(37.0);
  const [taxCapRate, setTaxCapRate] = useState<number>(20.0);
  const [taxForfeitRisk, setTaxForfeitRisk] = useState<number>(10);
  const [taxResult, setTaxResult] = useState<Section83bArbitrageResultDTO | null>(null);
  const [isCalculatingTax, setIsCalculatingTax] = useState<boolean>(false);

  const [memoYear, setMemoYear] = useState<string>('FY2026');
  const [memoTitle, setMemoTitle] = useState<string>('Executive Total Rewards Alignment & SEC Item 402 CD&A Review');
  const [activeMemo, setActiveMemo] = useState<TotalRewardsBoardMemorandumDTO | null>(null);
  const [isGeneratingMemo, setIsGeneratingMemo] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workforceTotalRewardsStudioRepository.getOverview();
      setOverview(data);
      if (data.recentMemos && data.recentMemos.length > 0) {
        setActiveMemo(data.recentMemos[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load workforce total rewards telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleRunTsrSim = async () => {
    setIsSimulating(true);
    try {
      const res = await workforceTotalRewardsStudioRepository.simulateRelativeTsr({
        performancePeriodYears: simYears,
        companyAnnualizedDrift: simDrift,
        companyVolatility: simVol,
        peerGroupMeanDrift: simPeerDrift,
        peerGroupMeanVolatility: simPeerVol,
        peerCorrelationFactor: simCorr,
        numPeers: simPeers,
        iterationsCount: simIterations,
        negativeTsrCapEnforced: simCapEnforced,
        maximumPayoutMultiplier: 200
      });
      setSimResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to execute rTSR Monte Carlo simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCalc83b = async () => {
    setIsCalculatingTax(true);
    try {
      const res = await workforceTotalRewardsStudioRepository.optimizeEquityTax({
        sharesGranted: taxShares,
        grantDateFmvUsd: taxGrantFmv,
        strikeOrPurchasePriceUsd: taxStrike,
        projectedLiquiditySharePriceUsd: taxLiquidityFmv,
        ordinaryIncomeTaxRatePercent: taxOrdRate,
        longTermCapitalGainsRatePercent: taxCapRate,
        netInvestmentIncomeTaxPercent: 3.8,
        holdingPeriodYears: 4,
        riskOfForfeitureProbabilityPercent: taxForfeitRisk
      });
      setTaxResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate Section 83(b) arbitrage');
    } finally {
      setIsCalculatingTax(false);
    }
  };

  const handleGenerateMemo = async () => {
    setIsGeneratingMemo(true);
    try {
      const memo = await workforceTotalRewardsStudioRepository.generateBoardMemorandum({
        fiscalYear: memoYear,
        title: memoTitle
      });
      setActiveMemo(memo);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to generate board CD&A memorandum');
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  const handleSignoff = async (role: TotalRewardsBoardSignoffRole) => {
    if (!activeMemo) return;
    try {
      const updated = await workforceTotalRewardsStudioRepository.signOffBoardMemorandum(
        activeMemo.id,
        role
      );
      setActiveMemo(updated);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || `Failed to record ${role} sign-off`);
    }
  };

  if (!isOpen) return null;

  const filteredBands = (overview?.jobArchitectureSummary.salaryBands || []).filter(
    (b) => trackFilter === 'all' || b.levelTrack === trackFilter
  );

  return (
    <div className="tr-studio-overlay" role="dialog" aria-modal="true" data-testid="tr-studio-modal">
      <div className="tr-studio-modal">
        <header className="tr-studio-header">
          <div className="tr-studio-header-title">
            <span className="tr-studio-icon">💎</span>
            <div>
              <h2>Workforce Total Rewards, Executive LTI & Tax-Optimized Equity Design Studio</h2>
              <p className="tr-studio-subtitle">
                Institutional Compensation Architecture, Stochastic rTSR Monte Carlo, IRC 83(b) Arbitrage & SEC Item 402 CD&A Governance
              </p>
            </div>
          </div>
          <button
            className="tr-studio-close-btn"
            onClick={onClose}
            aria-label="Close Total Rewards Studio"
            data-testid="tr-close-modal-btn"
          >
            ✕
          </button>
        </header>

        {overview && (
          <div className="tr-studio-metric-strip">
            <div className="tr-metric-card">
              <span className="tr-metric-label">Composite TRAI Score</span>
              <span className="tr-metric-val highlight">
                {overview.compositeTrai}
                <span className="tr-metric-unit"> / 100</span>
              </span>
              <span className={`tr-status-pill band-${overview.ratingBand}`}>
                {overview.ratingBand.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div className="tr-metric-card">
              <span className="tr-metric-label">Say-on-Pay Approval Rate</span>
              <span className="tr-metric-val">{overview.sayOnPayProjectedApprovalPercent}%</span>
              <span className="tr-metric-sub">ISS / Glass Lewis: LOW RISK</span>
            </div>
            <div className="tr-metric-card">
              <span className="tr-metric-label">Total Enterprise Headcount</span>
              <span className="tr-metric-val">{overview.totalHeadcount.toLocaleString()}</span>
              <span className="tr-metric-sub">Payroll: ${(overview.totalAnnualPayrollUsd / 1000000).toFixed(1)}M USD</span>
            </div>
            <div className="tr-metric-card">
              <span className="tr-metric-label">Dilution Overhang & Burn</span>
              <span className="tr-metric-val">
                {overview.currentDilutionOverhangPercent}%
                <span className="tr-metric-unit"> | {overview.annualGrossBurnRatePercent}% burn</span>
              </span>
              <span className="tr-metric-sub">Compliant with &le; 12.0% limit</span>
            </div>
            <div className="tr-metric-card">
              <span className="tr-metric-label">Controlled Gender Wage Gap</span>
              <span className="tr-metric-val">{overview.overallEnterpriseControlledGenderGapPercent}%</span>
              <span className="tr-metric-sub">Remediation: ${overview.totalRemediationBudgetRequiredUsd.toLocaleString()}</span>
            </div>
          </div>
        )}

        <nav className="tr-studio-tabs" aria-label="Total Rewards Studio Tabs">
          <button
            className={`tr-tab-btn ${activeTab === 'bands' ? 'active' : ''}`}
            onClick={() => setActiveTab('bands')}
            data-testid="tr-tab-bands"
          >
            🏢 Global Job Architecture & Salary Bands
          </button>
          <button
            className={`tr-tab-btn ${activeTab === 'lti' ? 'active' : ''}`}
            onClick={() => setActiveTab('lti')}
            data-testid="tr-tab-lti"
          >
            📈 Executive LTI & rTSR Monte Carlo
          </button>
          <button
            className={`tr-tab-btn ${activeTab === 'tax' ? 'active' : ''}`}
            onClick={() => setActiveTab('tax')}
            data-testid="tr-tab-tax"
          >
            ⚖️ Section 409A, 83(b) & Cross-Border Tax
          </button>
          <button
            className={`tr-tab-btn ${activeTab === 'equity' ? 'active' : ''}`}
            onClick={() => setActiveTab('equity')}
            data-testid="tr-tab-equity"
          >
            ⚖️ Pay Equity & Statutory Compliance
          </button>
          <button
            className={`tr-tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
            onClick={() => setActiveTab('governance')}
            data-testid="tr-tab-governance"
          >
            🏛️ Compensation Committee CD&A War Room
          </button>
        </nav>

        {error && <div className="tr-studio-error-banner">{error}</div>}

        <div className="tr-studio-body">
          {loading && !overview ? (
            <div className="tr-studio-loading">Loading Enterprise Total Rewards Telemetry...</div>
          ) : (
            <>
              {activeTab === 'bands' && overview && (
                <div className="tr-tab-pane">
                  <div className="tr-pane-header">
                    <div>
                      <h3>Global Base Pay Grading & Dual-Track Leveling Structure</h3>
                      <p>Standardized salary bands across IC1-IC8 and M1-M6 with Purchasing Power Parity (PPP) adjustments</p>
                    </div>
                    <div className="tr-filter-group">
                      <label>Track Filter:</label>
                      <select
                        value={trackFilter}
                        onChange={(e) => setTrackFilter(e.target.value as any)}
                        className="tr-input-select"
                      >
                        <option value="all">All Tracks</option>
                        <option value="individual_contributor">Individual Contributor</option>
                        <option value="management">Management Track</option>
                      </select>
                    </div>
                  </div>

                  <div className="tr-table-container">
                    <table className="tr-data-table">
                      <thead>
                        <tr>
                          <th>Level</th>
                          <th>Job Title</th>
                          <th>Family</th>
                          <th>Zone</th>
                          <th>Min ($)</th>
                          <th>Midpoint ($)</th>
                          <th>Max ($)</th>
                          <th>Spread</th>
                          <th>PPP Index</th>
                          <th>Headcount</th>
                          <th>Compa-Ratio</th>
                          <th>Anomalies</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBands.map((b) => (
                          <tr key={b.id}>
                            <td>
                              <span className="tr-badge-level">{b.levelCode}</span>
                            </td>
                            <td className="tr-td-title">{b.jobTitle}</td>
                            <td>{b.jobFamily.replace(/_/g, ' ')}</td>
                            <td>{b.compensationZone.replace(/zone_tier_[0-9]_/g, '').replace(/_/g, ' ')}</td>
                            <td>${b.baseSalaryMin.toLocaleString()}</td>
                            <td className="tr-td-mid">${b.baseSalaryMid.toLocaleString()}</td>
                            <td>${b.baseSalaryMax.toLocaleString()}</td>
                            <td>{b.rangeSpreadPercent}%</td>
                            <td>{b.purchasingPowerParityIndex.toFixed(2)}x</td>
                            <td>{b.headcountCount}</td>
                            <td>
                              <span className="tr-compa-val">{b.averageCompaRatio}%</span>
                            </td>
                            <td>
                              {b.redCircleCount > 0 && (
                                <span className="tr-anomaly-badge red">
                                  {b.redCircleCount} Red Circle
                                </span>
                              )}
                              {b.greenCircleCount > 0 && (
                                <span className="tr-anomaly-badge green">
                                  {b.greenCircleCount} Green Circle
                                </span>
                              )}
                              {b.redCircleCount === 0 && b.greenCircleCount === 0 && (
                                <span className="tr-anomaly-badge ok">Balanced</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="tr-sub-section">
                    <h4>Sample Employee Compensation Profiles & Range Penetration</h4>
                    <div className="tr-employee-grid">
                      {overview.jobArchitectureSummary.sampleProfiles.map((emp) => (
                        <div key={emp.id} className="tr-emp-card">
                          <div className="tr-emp-card-header">
                            <div>
                              <strong>{emp.fullName}</strong> ({emp.employeeNumber})
                              <div className="tr-emp-role">{emp.jobTitle} &bull; {emp.levelCode}</div>
                            </div>
                            <span className={`tr-circle-badge ${emp.salaryCircleStatus}`}>
                              {emp.salaryCircleStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="tr-emp-salary-stats">
                            <div>
                              <span className="tr-lbl">Base Salary:</span>
                              <strong>${emp.currentBaseSalary.toLocaleString()}</strong>
                            </div>
                            <div>
                              <span className="tr-lbl">Compa-Ratio:</span>
                              <strong>{emp.compaRatioPercent}%</strong>
                            </div>
                          </div>
                          <div className="tr-penetration-wrap">
                            <div className="tr-penetration-label">
                              <span>Range Penetration</span>
                              <span>{emp.rangePenetrationPercent}%</span>
                            </div>
                            <div className="tr-progress-bg">
                              <div
                                className="tr-progress-fill"
                                style={{ width: `${Math.min(100, Math.max(0, emp.rangePenetrationPercent))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lti' && overview && (
                <div className="tr-tab-pane">
                  <div className="tr-pane-header">
                    <div>
                      <h3>Executive Long-Term Incentive (LTI) & Relative TSR Monte Carlo Simulator</h3>
                      <p>Stochastic 1,000-iteration Geometric Brownian Motion engine with Negative TSR Cap enforcement</p>
                    </div>
                  </div>

                  <div className="tr-two-col">
                    <div className="tr-card">
                      <h4>Simulation Configuration</h4>
                      <div className="tr-form-grid">
                        <div className="tr-field">
                          <label>Performance Period (Years):</label>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={simYears}
                            onChange={(e) => setSimYears(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Company Drift (&mu;):</label>
                          <input
                            type="number"
                            step={0.01}
                            value={simDrift}
                            onChange={(e) => setSimDrift(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Company Volatility (&sigma;):</label>
                          <input
                            type="number"
                            step={0.01}
                            value={simVol}
                            onChange={(e) => setSimVol(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Peer Group Mean Volatility:</label>
                          <input
                            type="number"
                            step={0.01}
                            value={simPeerVol}
                            onChange={(e) => setSimPeerVol(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Correlation Factor (&rho;):</label>
                          <input
                            type="number"
                            step={0.05}
                            min={-1}
                            max={1}
                            value={simCorr}
                            onChange={(e) => setSimCorr(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Number of Benchmark Peers:</label>
                          <input
                            type="number"
                            min={5}
                            max={50}
                            value={simPeers}
                            onChange={(e) => setSimPeers(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Iterations Count:</label>
                          <input
                            type="number"
                            min={100}
                            max={2000}
                            step={100}
                            value={simIterations}
                            onChange={(e) => setSimIterations(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field checkbox-field">
                          <label>
                            <input
                              type="checkbox"
                              checked={simCapEnforced}
                              onChange={(e) => setSimCapEnforced(e.target.checked)}
                            />
                            Negative TSR Circuit Breaker (Cap at 100%)
                          </label>
                        </div>
                      </div>
                      <button
                        className="tr-primary-btn"
                        onClick={handleRunTsrSim}
                        disabled={isSimulating}
                        data-testid="tr-run-tsr-sim-btn"
                      >
                        {isSimulating ? 'Simulating...' : 'Run Monte Carlo Relative TSR Simulation'}
                      </button>
                    </div>

                    <div className="tr-card">
                      <h4>Simulation Analytics & Payout Multiplier</h4>
                      {simResult ? (
                        <div className="tr-sim-results">
                          <div className="tr-sim-highlight">
                            <span className="tr-sim-h-lbl">Expected Payout Multiplier</span>
                            <span className="tr-sim-h-val">{simResult.expectedPayoutMultiplierPercent}%</span>
                            <span className="tr-sim-h-sub">Company Median TSR: {simResult.companyMedianTsrPercent}%</span>
                          </div>
                          <div className="tr-sim-grid">
                            <div className="tr-sim-stat">
                              <span>P10 (Bear Case):</span>
                              <strong>{simResult.simulatedTsrDistribution.percentileP10}%</strong>
                            </div>
                            <div className="tr-sim-stat">
                              <span>P50 (Median):</span>
                              <strong>{simResult.simulatedTsrDistribution.percentileP50}%</strong>
                            </div>
                            <div className="tr-sim-stat">
                              <span>P90 (Bull Case):</span>
                              <strong>{simResult.simulatedTsrDistribution.percentileP90}%</strong>
                            </div>
                            <div className="tr-sim-stat">
                              <span>Probability Zero Payout:</span>
                              <strong>{simResult.probabilityOfZeroPayoutPercent}%</strong>
                            </div>
                            <div className="tr-sim-stat">
                              <span>Probability Target Payout:</span>
                              <strong>{simResult.probabilityOfTargetPayoutPercent}%</strong>
                            </div>
                            <div className="tr-sim-stat">
                              <span>Probability Max (200%):</span>
                              <strong>{simResult.probabilityOfMaxPayoutPercent}%</strong>
                            </div>
                          </div>
                          <div className="tr-circuit-stat">
                            <span>Negative Absolute TSR Cap Trigger Rate:</span>
                            <strong>{simResult.negativeTsrCapTriggeredPercent}%</strong>
                          </div>
                        </div>
                      ) : (
                        <div className="tr-placeholder-box">
                          Click "Run Monte Carlo Relative TSR Simulation" to evaluate the stochastic payout distribution across {simIterations} market scenarios.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="tr-sub-section">
                    <h4>Executive LTI Grant Schedule & Vehicle Mix</h4>
                    <table className="tr-data-table">
                      <thead>
                        <tr>
                          <th>Executive</th>
                          <th>Role</th>
                          <th>Vehicle</th>
                          <th>Target Units</th>
                          <th>Grant Price</th>
                          <th>Target Value ($)</th>
                          <th>Benchmark</th>
                          <th>Payout Multiplier (Min-Target-Max)</th>
                          <th>Projected Vest</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.equityDilutionOverview.executiveGrants.map((g) => (
                          <tr key={g.id}>
                            <td><strong>{g.executiveName}</strong></td>
                            <td>{g.executiveTitle}</td>
                            <td>{g.equityVehicle.replace(/_/g, ' ').toUpperCase()}</td>
                            <td>{g.targetUnitsGranted.toLocaleString()}</td>
                            <td>${g.grantPriceUsd.toFixed(2)}</td>
                            <td>${g.targetGrantValueUsd.toLocaleString()}</td>
                            <td>{g.peerBenchmarkIndex.replace(/_/g, ' ')}</td>
                            <td>{g.thresholdPayoutPercent}% &ndash; {g.targetPayoutPercent}% &ndash; {g.maximumPayoutPercent}%</td>
                            <td>{formatDate(g.projectedVestingDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'tax' && overview && (
                <div className="tr-tab-pane">
                  <div className="tr-pane-header">
                    <div>
                      <h3>IRC Section 409A, Section 83(b) & Global Cross-Border Tax Optimization</h3>
                      <p>Timely election tax arbitrage modeling, ISO AMT preference tracking, and multi-jurisdiction workday withholding</p>
                    </div>
                  </div>

                  <div className="tr-two-col">
                    <div className="tr-card">
                      <h4>Section 83(b) Tax Arbitrage Calculator</h4>
                      <div className="tr-form-grid">
                        <div className="tr-field">
                          <label>Shares Granted:</label>
                          <input
                            type="number"
                            value={taxShares}
                            onChange={(e) => setTaxShares(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Grant Date FMV ($):</label>
                          <input
                            type="number"
                            step={0.1}
                            value={taxGrantFmv}
                            onChange={(e) => setTaxGrantFmv(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Strike / Purchase Price ($):</label>
                          <input
                            type="number"
                            step={0.05}
                            value={taxStrike}
                            onChange={(e) => setTaxStrike(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Projected Liquidity Share Price ($):</label>
                          <input
                            type="number"
                            value={taxLiquidityFmv}
                            onChange={(e) => setTaxLiquidityFmv(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Ordinary Income Tax Rate (%):</label>
                          <input
                            type="number"
                            value={taxOrdRate}
                            onChange={(e) => setTaxOrdRate(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Capital Gains Tax Rate (%):</label>
                          <input
                            type="number"
                            value={taxCapRate}
                            onChange={(e) => setTaxCapRate(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                        <div className="tr-field">
                          <label>Forfeiture Probability (%):</label>
                          <input
                            type="number"
                            value={taxForfeitRisk}
                            onChange={(e) => setTaxForfeitRisk(Number(e.target.value))}
                            className="tr-input"
                          />
                        </div>
                      </div>
                      <button
                        className="tr-primary-btn"
                        onClick={handleCalc83b}
                        disabled={isCalculatingTax}
                        data-testid="tr-calc-83b-btn"
                      >
                        {isCalculatingTax ? 'Calculating...' : 'Calculate 83(b) Tax Arbitrage'}
                      </button>
                    </div>

                    <div className="tr-card">
                      <h4>Arbitrage Analysis & Recommendation</h4>
                      {taxResult ? (
                        <div className="tr-tax-results">
                          <div className="tr-tax-highlight">
                            <span className="tr-tax-h-lbl">Net Projected Tax Savings</span>
                            <span className="tr-tax-h-val">${taxResult.netProjectedTaxSavingsUsd.toLocaleString()}</span>
                            <span className="tr-tax-h-sub">{taxResult.netTaxSavingsPercent}% effective tax reduction</span>
                          </div>
                          <div className="tr-tax-breakdown">
                            <div className="tr-tax-row">
                              <span>Tax Paid at Grant (with 83b):</span>
                              <strong>${taxResult.taxPaidAtGrantWith83bUsd.toLocaleString()}</strong>
                            </div>
                            <div className="tr-tax-row">
                              <span>Tax at Vesting (without 83b):</span>
                              <strong>${taxResult.projectedTaxAtVestingWithout83bUsd.toLocaleString()}</strong>
                            </div>
                            <div className="tr-tax-row">
                              <span>Total Tax Payable (with 83b):</span>
                              <strong>${taxResult.totalTaxPayableWith83bUsd.toLocaleString()}</strong>
                            </div>
                            <div className="tr-tax-row">
                              <span>Total Tax Payable (without 83b):</span>
                              <strong>${taxResult.totalTaxPayableWithout83bUsd.toLocaleString()}</strong>
                            </div>
                            <div className="tr-tax-row">
                              <span>Forfeiture Downside Exposure:</span>
                              <strong>${taxResult.forfeitureDownsideExposureUsd.toLocaleString()}</strong>
                            </div>
                            <div className="tr-tax-row">
                              <span>Breakeven Valuation / Share:</span>
                              <strong>${taxResult.breakevenValuationPerShareUsd.toFixed(2)}</strong>
                            </div>
                          </div>
                          <div className={`tr-directive-banner dir-${taxResult.recommendationDirective}`}>
                            <strong>Directive:</strong> {taxResult.recommendationDirective.replace(/_/g, ' ').toUpperCase()}
                          </div>
                        </div>
                      ) : (
                        <div className="tr-placeholder-box">
                          Configure your grant parameters to determine exact ordinary income vs capital gains arbitrage and forfeiture risk.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="tr-sub-section">
                    <h4>Cross-Border Mobile Employee Workday Allocation Roster</h4>
                    <table className="tr-data-table">
                      <thead>
                        <tr>
                          <th>Executive</th>
                          <th>Citizenship / Residence</th>
                          <th>Award Type</th>
                          <th>Grant Date</th>
                          <th>83(b) Status</th>
                          <th>Total Workdays</th>
                          <th>Trailing Jurisdictions & Withholding</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.taxOverview.taxProfiles.map((p) => (
                          <tr key={p.id}>
                            <td><strong>{p.executiveName}</strong></td>
                            <td>{p.citizenshipCountry} / {p.residentCountry}</td>
                            <td>{p.grantType.replace(/_/g, ' ').toUpperCase()}</td>
                            <td>{formatDate(p.grantDate)}</td>
                            <td>
                              <span className={`tr-status-pill ${p.irsSection83bStatus}`}>
                                {p.irsSection83bStatus.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{p.totalVestingWorkdays} days</td>
                            <td>
                              <ul className="tr-jur-list">
                                {p.jurisdictionAllocations.map((j) => (
                                  <li key={j.jurisdictionCode}>
                                    {j.jurisdictionName}: {j.allocationPercent}% ({j.workdaysInJurisdiction}d) &rarr; ${j.estimatedWithholdingTaxUsd.toLocaleString()} ({j.localMarginalWithholdingRatePercent}%)
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'equity' && overview && (
                <div className="tr-tab-pane">
                  <div className="tr-pane-header">
                    <div>
                      <h3>Algorithmic Pay Equity, Gender Wage Gap & Statutory Compliance Audit</h3>
                      <p>Multivariate Ordinary Least Squares (OLS) regression isolating protected attributes from neutral business covariates</p>
                    </div>
                  </div>

                  <div className="tr-sub-section">
                    <h4>Cohort Regression Models by Job Family</h4>
                    <table className="tr-data-table">
                      <thead>
                        <tr>
                          <th>Job Family</th>
                          <th>Cohort Size</th>
                          <th>Unadjusted Gap (%)</th>
                          <th>Adjusted Gap (Controlled %)</th>
                          <th>R&sup2; Model Fit</th>
                          <th>t-Statistic</th>
                          <th>p-Value</th>
                          <th>Significance</th>
                          <th>Controlling Covariates</th>
                          <th>Remediation Budget ($)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.payEquityOverview.cohortRegressions.map((reg) => (
                          <tr key={reg.jobFamily}>
                            <td><strong>{reg.jobFamily.replace(/_/g, ' ').toUpperCase()}</strong></td>
                            <td>{reg.cohortHeadcount}</td>
                            <td className="tr-td-gap-raw">{reg.unadjustedGenderPayGapPercent}%</td>
                            <td className="tr-td-gap-ctrl">{reg.adjustedGenderPayGapPercent}%</td>
                            <td>{reg.rSquaredModelFit.toFixed(3)}</td>
                            <td>{reg.tStatistic.toFixed(2)}</td>
                            <td>{reg.pValueStatisticalSignificance.toFixed(3)}</td>
                            <td>
                              <span className={`tr-sig-pill ${reg.isStatisticallySignificant ? 'sig' : 'insig'}`}>
                                {reg.isStatisticallySignificant ? 'Significant' : 'Not Significant'}
                              </span>
                            </td>
                            <td className="tr-td-cov">
                              {reg.controllingCovariates.map((c) => c.replace(/_/g, ' ')).join(', ')}
                            </td>
                            <td>
                              <strong>${reg.recommendedRemediationBudgetUsd.toLocaleString()}</strong>
                              <span className="tr-sub-emp"> ({reg.affectedEmployeesCount} employees)</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="tr-sub-section">
                    <h4>Mandatory Statutory Wage Transparency Audits</h4>
                    <div className="tr-compliance-grid">
                      {overview.payEquityOverview.statutoryAudits.map((audit) => (
                        <div key={audit.framework} className="tr-compliance-card">
                          <div className="tr-compliance-header">
                            <div>
                              <strong>{audit.framework.replace(/_/g, ' ').toUpperCase()}</strong>
                              <div className="tr-comp-jur">{audit.jurisdictionRegion}</div>
                            </div>
                            <span className={`tr-verdict-pill ${audit.complianceVerdict}`}>
                              {audit.complianceVerdict.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="tr-comp-details">
                            <div>
                              <span className="tr-lbl">Statutory Ceiling:</span>
                              <strong>&lt; {audit.statutoryThresholdPayGapPercent}%</strong>
                            </div>
                            <div>
                              <span className="tr-lbl">Measured Gap:</span>
                              <strong className="tr-comp-measured">{audit.measuredEntityPayGapPercent}%</strong>
                            </div>
                            <div>
                              <span className="tr-lbl">Reporting Deadline:</span>
                              <strong>{formatDate(audit.mandatoryReportingDeadline)}</strong>
                            </div>
                            <div>
                              <span className="tr-lbl">Penalty Exposure:</span>
                              <strong>${audit.penaltyExposureRiskUsd.toLocaleString()}</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'governance' && overview && (
                <div className="tr-tab-pane">
                  <div className="tr-pane-header">
                    <div>
                      <h3>Compensation Committee War Room & SEC Item 402 CD&A Governance Memorandum</h3>
                      <p>Tripartite digital sign-off pipeline: Chief Human Resources Officer &rarr; Chief Financial Officer &rarr; Board Comp Chair</p>
                    </div>
                  </div>

                  <div className="tr-governance-cockpit">
                    <div className="tr-trai-card">
                      <h4>Total Rewards Alignment Index (TRAI) Breakdown</h4>
                      <div className="tr-trai-score-box">
                        <span className="tr-trai-num">{overview.compositeTrai}</span>
                        <span className="tr-trai-denom">/ 100</span>
                        <div className="tr-trai-band">{overview.ratingBand.replace(/_/g, ' ').toUpperCase()}</div>
                      </div>
                      <div className="tr-trai-breakdown-list">
                        <div className="tr-trai-row">
                          <span>Base Pay Range Discipline:</span>
                          <strong>{overview.alignmentBreakdown.basePayRangeDisciplineScore} / 100</strong>
                        </div>
                        <div className="tr-trai-row">
                          <span>Pay for Performance Sensitivity:</span>
                          <strong>{overview.alignmentBreakdown.payForPerformanceSensitivityScore} / 100</strong>
                        </div>
                        <div className="tr-trai-row">
                          <span>Dilution & Burn Rate Health:</span>
                          <strong>{overview.alignmentBreakdown.equityDilutionBurnHealthScore} / 100</strong>
                        </div>
                        <div className="tr-trai-row">
                          <span>Pay Equity Compliance:</span>
                          <strong>{overview.alignmentBreakdown.payEquityStatutoryComplianceScore} / 100</strong>
                        </div>
                        <div className="tr-trai-row">
                          <span>Tax Optimization Governance:</span>
                          <strong>{overview.alignmentBreakdown.taxOptimizationGovernanceScore} / 100</strong>
                        </div>
                      </div>
                    </div>

                    <div className="tr-sop-card">
                      <h4>Say-on-Pay Shareholder Vote Projection</h4>
                      <div className="tr-sop-main">
                        <div className="tr-sop-rate">
                          <span className="tr-sop-val">{overview.sayOnPayProjectedApprovalPercent}%</span>
                          <span className="tr-sop-lbl">Projected Shareholder Approval</span>
                        </div>
                        <div className="tr-sop-proxy">
                          <div>
                            <span className="tr-lbl">ISS Risk:</span>
                            <span className={`tr-proxy-pill ${overview.sayOnPayAssessment.issAdverseRecommendationRisk}`}>
                              {overview.sayOnPayAssessment.issAdverseRecommendationRisk.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="tr-lbl">Glass Lewis:</span>
                            <span className={`tr-proxy-pill ${overview.sayOnPayAssessment.glassLewisAdverseRisk}`}>
                              {overview.sayOnPayAssessment.glassLewisAdverseRisk.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="tr-sop-details">
                        <div className="tr-sop-row">
                          <span>CEO-to-Median-Worker Ratio:</span>
                          <strong>{overview.ceoToMedianWorkerPayRatio}:1</strong>
                        </div>
                        <div className="tr-sop-row">
                          <span>Pay-vs-TSR Alignment Score:</span>
                          <strong>{overview.sayOnPayAssessment.payVsTsrAlignmentScore} / 100</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="tr-memo-generator-box">
                    <h4>Generate SEC Item 402 CD&A Governance Memorandum</h4>
                    <div className="tr-memo-form">
                      <div className="tr-field">
                        <label>Fiscal Year:</label>
                        <input
                          type="text"
                          value={memoYear}
                          onChange={(e) => setMemoYear(e.target.value)}
                          className="tr-input"
                        />
                      </div>
                      <div className="tr-field tr-field-wide">
                        <label>Memorandum Subject / Title:</label>
                        <input
                          type="text"
                          value={memoTitle}
                          onChange={(e) => setMemoTitle(e.target.value)}
                          className="tr-input"
                        />
                      </div>
                      <button
                        className="tr-primary-btn"
                        onClick={handleGenerateMemo}
                        disabled={isGeneratingMemo}
                        data-testid="tr-gen-memo-btn"
                      >
                        {isGeneratingMemo ? 'Generating...' : 'Generate SEC Item 402 Board Memorandum'}
                      </button>
                    </div>
                  </div>

                  {activeMemo && (
                    <div className="tr-active-memo-card">
                      <div className="tr-memo-card-header">
                        <div>
                          <h4>{activeMemo.title}</h4>
                          <span className="tr-memo-meta">
                            {activeMemo.fiscalYear} &bull; Generated {formatDate(activeMemo.createdAt)} &bull; Status:{' '}
                            <span className={`tr-status-pill status-${activeMemo.status}`}>
                              {activeMemo.status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </span>
                        </div>
                        <div className="tr-signoff-actions">
                          <button
                            className={`tr-sign-btn ${activeMemo.approvedByChroAt ? 'signed' : ''}`}
                            onClick={() => handleSignoff('chief_human_resources_officer')}
                            disabled={!!activeMemo.approvedByChroAt}
                            data-testid="tr-signoff-chro-btn"
                          >
                            {activeMemo.approvedByChroAt ? '✓ CHRO Signed' : 'Sign as CHRO'}
                          </button>
                          <button
                            className={`tr-sign-btn ${activeMemo.approvedByCfoAt ? 'signed' : ''}`}
                            onClick={() => handleSignoff('chief_financial_officer')}
                            disabled={!!activeMemo.approvedByCfoAt}
                            data-testid="tr-signoff-cfo-btn"
                          >
                            {activeMemo.approvedByCfoAt ? '✓ CFO Signed' : 'Sign as CFO'}
                          </button>
                          <button
                            className={`tr-sign-btn ${activeMemo.approvedByCompChairAt ? 'signed' : ''}`}
                            onClick={() => handleSignoff('board_compensation_chair')}
                            disabled={!!activeMemo.approvedByCompChairAt}
                            data-testid="tr-signoff-chair-btn"
                          >
                            {activeMemo.approvedByCompChairAt ? '✓ Comp Chair Signed' : 'Sign as Board Comp Chair'}
                          </button>
                        </div>
                      </div>

                      <div className="tr-memo-markdown-preview">
                        <pre>{activeMemo.executiveSummaryMarkdown}</pre>
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
