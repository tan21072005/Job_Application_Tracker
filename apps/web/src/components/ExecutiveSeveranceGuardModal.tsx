import React, { useState, useEffect } from 'react';
import {
  type ExecutiveSeveranceCaseDTO,
  type GoodReasonEventDTO,
  type SeveranceCounterProposalDTO,
  type TriggerMode,
  type AccelerationExtent,
  computeSeveranceAudit,
  computeCicWaterfall,
  compute280GTax,
  computeExecutiveLeverageIndex,
  generateExecutiveCounterMemoMarkdown
} from '../domain';
import { executiveSeveranceRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveSeveranceGuardModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [cases, setCases] = useState<ExecutiveSeveranceCaseDTO[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'severance' | 'cic' | 'tax280g' | 'good_reason' | 'counter_memo'>('severance');
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedMemo, setCopiedMemo] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventCategory, setNewEventCategory] = useState<string>('diminution_of_duties');
  const [newEventDesc, setNewEventDesc] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    const list = await executiveSeveranceRepository.listCases();
    setCases(list);
    if (list.length > 0) {
      setActiveCaseId(list[0].id);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const currentCase = cases.find(c => c.id === activeCaseId) || cases[0];
  if (!currentCase) {
    return (
      <div className="esg-modal-overlay">
        <div className="esg-modal">
          <div className="esg-header">
            <h2 className="esg-header-title">Executive Severance Guard</h2>
            <button className="esg-close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="esg-content">
            <p>Loading executive cases...</p>
          </div>
        </div>
      </div>
    );
  }

  const audit = currentCase.auditResult;
  const cic = currentCase.cicResult;
  const tax = currentCase.tax280GResult;
  const counter = currentCase.counterProposalParams;
  const leverageIndex = computeExecutiveLeverageIndex(counter.leverageFactors);
  const generatedMemo = generateExecutiveCounterMemoMarkdown(currentCase, counter, leverageIndex);

  async function handleUpdateSeverance(cashMonths: number, bonusProration: 'target' | 'performance' | 'none', ptewMonths: number) {
    if (!currentCase) return;
    const updated = await executiveSeveranceRepository.updateCase(currentCase.id, {
      severanceParams: {
        ...currentCase.severanceParams,
        cashContinuationMonths: cashMonths,
        bonusProrationMode: bonusProration,
        ptewMonths: ptewMonths
      }
    });
    if (updated) {
      setCases(cases.map(c => c.id === updated.id ? updated : c));
    }
  }

  async function handleUpdateCicParams(valuation: number, trigger: TriggerMode, extent: AccelerationExtent) {
    if (!currentCase) return;
    const updated = await executiveSeveranceRepository.updateCase(currentCase.id, {
      cicWaterfallParams: {
        ...currentCase.cicWaterfallParams,
        enterpriseValuationUsd: valuation,
        triggerMode: trigger,
        accelerationExtent: extent
      }
    });
    if (updated) {
      setCases(cases.map(c => c.id === updated.id ? updated : c));
    }
  }

  async function handleAddGoodReasonEvent() {
    if (!currentCase || !newEventTitle.trim() || !newEventDesc.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const created = await executiveSeveranceRepository.addGoodReasonEvent(currentCase.id, {
      category: newEventCategory as any,
      title: newEventTitle.trim(),
      factualDescription: newEventDesc.trim(),
      dateConditionOccurred: today,
      dateNoticeServed: today,
      status: 'cure_period_active'
    });
    if (created) {
      const refreshed = await executiveSeveranceRepository.getCase(currentCase.id);
      if (refreshed) {
        setCases(cases.map(c => c.id === refreshed.id ? refreshed : c));
      }
      setNewEventTitle('');
      setNewEventDesc('');
    }
  }

  async function handleGenerateProposal() {
    if (!currentCase) return;
    const proposal = await executiveSeveranceRepository.createCounterProposal(currentCase.id);
    if (proposal) {
      const refreshed = await executiveSeveranceRepository.getCase(currentCase.id);
      if (refreshed) {
        setCases(cases.map(c => c.id === refreshed.id ? refreshed : c));
      }
    }
  }

  function copyMemoToClipboard() {
    navigator.clipboard.writeText(generatedMemo);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 2500);
  }

  return (
    <div className="esg-modal-overlay">
      <div className="esg-modal">
        <div className="esg-header">
          <div className="esg-header-left">
            <div className="esg-icon-box">🛡️</div>
            <div>
              <div className="esg-header-title">Bảo vệ Thôi việc & Chuyển quyền (Severance)</div>
              <div className="esg-header-sub">
                Severance Audit · CIC Acceleration Waterfall · IRC 280G Parachute · Good Reason Guard
              </div>
            </div>
          </div>
          <button className="esg-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="esg-nav-tabs">
          <button
            className={`esg-tab-btn ${activeTab === 'severance' ? 'active' : ''}`}
            onClick={() => setActiveTab('severance')}
          >
            📋 Severance Auditor & SGI
          </button>
          <button
            className={`esg-tab-btn ${activeTab === 'cic' ? 'active' : ''}`}
            onClick={() => setActiveTab('cic')}
          >
            ⚡ CIC Equity Waterfall
          </button>
          <button
            className={`esg-tab-btn ${activeTab === 'tax280g' ? 'active' : ''}`}
            onClick={() => setActiveTab('tax280g')}
          >
            ⚖️ IRC 280G Parachute Tax
          </button>
          <button
            className={`esg-tab-btn ${activeTab === 'good_reason' ? 'active' : ''}`}
            onClick={() => setActiveTab('good_reason')}
          >
            ⏱️ Good Reason Trigger Guard
          </button>
          <button
            className={`esg-tab-btn ${activeTab === 'counter_memo' ? 'active' : ''}`}
            onClick={() => setActiveTab('counter_memo')}
          >
            ✍️ Counter-Proposal Studio
          </button>
        </div>

        <div className="esg-content">
          {activeTab === 'severance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="esg-card-grid">
                <div className="esg-card">
                  <div className="esg-card-title">Cash Continuation</div>
                  <div className="esg-card-value">${audit.cashContinuationTotalUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">{currentCase.severanceParams.cashContinuationMonths} months salary @ ${(currentCase.severanceParams.annualBaseSalaryUsd / 12).toLocaleString()}/mo</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Pro-Rata Annual Bonus</div>
                  <div className="esg-card-value">${audit.prorataBonusTotalUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">{currentCase.severanceParams.targetBonusPercentage}% target ({currentCase.severanceParams.bonusProrationMode})</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Healthcare & Benefits</div>
                  <div className="esg-card-value">${(audit.cobraBenefitTotalUsd + audit.outplacementValueUsd).toLocaleString()}</div>
                  <div className="esg-card-sub">{currentCase.severanceParams.cobraSubsidizedMonths} mo COBRA + ${currentCase.severanceParams.outplacementBudgetUsd.toLocaleString()} outplacement</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Severance Generosity (SGI)</div>
                  <div className="esg-card-value">{audit.generosityScore} / 100</div>
                  <div className="esg-card-sub">
                    <span className={`esg-badge ${audit.generosityTier === 'institutional_gold' ? 'esg-badge-gold' : audit.generosityTier === 'executive_favorable' ? 'esg-badge-favorable' : audit.generosityTier === 'market_standard' ? 'esg-badge-market' : 'esg-badge-substandard'}`}>
                      {audit.generosityTier.toUpperCase().replace('_', ' ')} (P{audit.marketPercentileRank})
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '18px 22px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '12px' }}>
                  Interactive Severance Scenario Parameters
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Cash Continuation Months: {currentCase.severanceParams.cashContinuationMonths}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="24"
                      step="1"
                      value={currentCase.severanceParams.cashContinuationMonths}
                      onChange={e => handleUpdateSeverance(Number(e.target.value), currentCase.severanceParams.bonusProrationMode, currentCase.severanceParams.ptewMonths)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Bonus Proration Mode
                    </label>
                    <select
                      value={currentCase.severanceParams.bonusProrationMode}
                      onChange={e => handleUpdateSeverance(currentCase.severanceParams.cashContinuationMonths, e.target.value as any, currentCase.severanceParams.ptewMonths)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="target">100% Target Proration (Executive Safe)</option>
                      <option value="performance">Actual Company Performance</option>
                      <option value="none">Zero Bonus (Substandard)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      PTEW Option Window: {currentCase.severanceParams.ptewMonths} Months ({Math.round(currentCase.severanceParams.ptewMonths / 12 * 10) / 10} Yrs)
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="120"
                      step="3"
                      value={currentCase.severanceParams.ptewMonths}
                      onChange={e => handleUpdateSeverance(currentCase.severanceParams.cashContinuationMonths, currentCase.severanceParams.bonusProrationMode, Number(e.target.value))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {audit.riskFindings.length > 0 && (
                <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '12px', padding: '16px 20px' }}>
                  <div style={{ fontWeight: 800, color: '#9f1239', marginBottom: '8px', fontSize: '14px' }}>
                    ⚠️ Severance Package Risk Flags ({audit.riskFindings.length})
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', color: '#be123c', fontSize: '13px', lineHeight: 1.6 }}>
                    {audit.riskFindings.map((risk, idx) => (
                      <li key={idx}>{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'cic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '18px 22px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '12px' }}>
                  Enterprise Acquisition & Trigger Parameters
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', fontSize: '13px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Enterprise Valuation: ${(currentCase.cicWaterfallParams.enterpriseValuationUsd / 1000000).toLocaleString()}M
                    </label>
                    <input
                      type="range"
                      min="50000000"
                      max="2000000000"
                      step="25000000"
                      value={currentCase.cicWaterfallParams.enterpriseValuationUsd}
                      onChange={e => handleUpdateCicParams(Number(e.target.value), currentCase.cicWaterfallParams.triggerMode, currentCase.cicWaterfallParams.accelerationExtent)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Trigger Structure
                    </label>
                    <select
                      value={currentCase.cicWaterfallParams.triggerMode}
                      onChange={e => handleUpdateCicParams(currentCase.cicWaterfallParams.enterpriseValuationUsd, e.target.value as any, currentCase.cicWaterfallParams.accelerationExtent)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="double_trigger">Double Trigger (Closing + Good Reason/Term)</option>
                      <option value="single_trigger">Single Trigger (Closing Only)</option>
                      <option value="none">No Acceleration</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Acceleration Extent
                    </label>
                    <select
                      value={currentCase.cicWaterfallParams.accelerationExtent}
                      onChange={e => handleUpdateCicParams(currentCase.cicWaterfallParams.enterpriseValuationUsd, currentCase.cicWaterfallParams.triggerMode, e.target.value as any)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="full_100_percent">100% Full Unvested Acceleration</option>
                      <option value="partial_50_percent">50% Partial Unvested Acceleration</option>
                    </select>
                  </div>
                </div>
              </div>

              <table className="esg-waterfall-table">
                <thead>
                  <tr>
                    <th>Waterfall Milestone</th>
                    <th>Gross / Base Valuation</th>
                    <th>Priority Seniority</th>
                    <th>Distributable Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Enterprise Acquisition Valuation (EV)</td>
                    <td>${currentCase.cicWaterfallParams.enterpriseValuationUsd.toLocaleString()}</td>
                    <td>Gross EV</td>
                    <td>${currentCase.cicWaterfallParams.enterpriseValuationUsd.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Funded Debt & Transaction Fees</td>
                    <td>-${(currentCase.cicWaterfallParams.fundedDebtUsd + (currentCase.cicWaterfallParams.enterpriseValuationUsd * 0.02)).toLocaleString()}</td>
                    <td>Senior Creditors & Bankers</td>
                    <td>${(currentCase.cicWaterfallParams.enterpriseValuationUsd - currentCase.cicWaterfallParams.fundedDebtUsd).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td>Preferred Liquidation Preference Stack</td>
                    <td>-${cic.preferredLiquidationTotalUsd.toLocaleString()}</td>
                    <td>Series A/B/C Investors</td>
                    <td>${cic.commonEquityPoolUsd.toLocaleString()}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                    <td>Common Equity Pool Available</td>
                    <td>${cic.commonEquityPoolUsd.toLocaleString()}</td>
                    <td>Fully Diluted Common</td>
                    <td>${cic.commonSharePriceUsd} / Share</td>
                  </tr>
                </tbody>
              </table>

              <div className="esg-card-grid">
                <div className="esg-card">
                  <div className="esg-card-title">Accelerated Unvested Options</div>
                  <div className="esg-card-value">${cic.acceleratedOptionsProceedsUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">{cic.acceleratedOptionsCount.toLocaleString()} options accelerated</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Accelerated Unvested RSUs</div>
                  <div className="esg-card-value">${cic.acceleratedRsuProceedsUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">{cic.acceleratedRsuCount.toLocaleString()} RSUs accelerated</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Vested Equity Liquidated</div>
                  <div className="esg-card-value">${cic.vestedEquityProceedsUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">Options + RSUs previously vested</div>
                </div>
                <div className="esg-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="esg-card-title">Total Net Liquid Proceeds</div>
                  <div className="esg-card-value" style={{ color: '#15803d' }}>
                    ${cic.executiveNetLiquidProceedsUsd.toLocaleString()}
                  </div>
                  <div className="esg-card-sub">Liquid cash at transaction closing</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tax280g' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="esg-card-grid">
                <div className="esg-card">
                  <div className="esg-card-title">5-Year Historical Base Amount</div>
                  <div className="esg-card-value">${tax.historicalAverageBaseAmountUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">Annualized average W-2 Box 1 pay</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">3.0x Safe Harbor Ceiling</div>
                  <div className="esg-card-value">${tax.safeHarborCeilingUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">Threshold before 20% excise tax penalty</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Total Contingent Payments (TCP)</div>
                  <div className="esg-card-value">${tax.totalContingentParachutePaymentsUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">
                    <span className={`esg-badge ${tax.isParachuteTaxTriggered ? 'esg-badge-substandard' : 'esg-badge-favorable'}`}>
                      {tax.isParachuteTaxTriggered ? 'PARACHUTE TRIGGERED' : 'SAFE HARBOR SAFE'}
                    </span>
                  </div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">20% Section 4999 Excise Tax</div>
                  <div className="esg-card-value" style={{ color: tax.isParachuteTaxTriggered ? '#b91c1c' : '#15803d' }}>
                    ${tax.exciseTax20PercentUsd.toLocaleString()}
                  </div>
                  <div className="esg-card-sub">Assessed against 1.0x Base cliff (${tax.excessParachutePaymentUsd.toLocaleString()})</div>
                </div>
              </div>

              <div style={{ background: tax.isInValleyOfDeath ? '#fff7ed' : '#f0fdf4', border: `1px solid ${tax.isInValleyOfDeath ? '#fed7aa' : '#bbf7d0'}`, borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: tax.isInValleyOfDeath ? '#9a3412' : '#166534', marginBottom: '8px' }}>
                  {tax.isInValleyOfDeath ? '⚠️ Valley of Death Alert (Cutback Strongly Recommended)' : '✅ Optimal Settlement Validated'}
                </div>
                <div style={{ fontSize: '13px', color: tax.isInValleyOfDeath ? '#c2410c' : '#15803d', lineHeight: 1.6 }}>
                  Total Contingent Payments (${tax.totalContingentParachutePaymentsUsd.toLocaleString()}) fall between the 3.0x threshold (${tax.safeHarborCeilingUsd.toLocaleString()}) and the break-even crossover point (${tax.breakEvenCrossoverPointUsd.toLocaleString()}).
                  Accepting a hard cutback nets <strong>${(tax.netProceedsHardCutbackUsd - tax.netProceedsFullPaymentUsd).toLocaleString()} MORE cash</strong> after taxes than accepting the full unreduced payout!
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                    Scenario 1: Full Payment (Subject to Excise Tax)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                    Net Take-Home: ${tax.netProceedsFullPaymentUsd.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Gross: ${tax.totalContingentParachutePaymentsUsd.toLocaleString()} · Total Tax: ${tax.totalExecutiveTaxLiabilityUsd.toLocaleString()}
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '2px solid #86efac', borderRadius: '12px', padding: '18px' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#166534', marginBottom: '6px' }}>
                    Scenario 2: Best Net Cutback (Recommended)
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d' }}>
                    Net Take-Home: ${tax.netProceedsHardCutbackUsd.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '12px', color: '#166534', marginTop: '4px' }}>
                    Gross Capped @ ${tax.safeHarborCeilingUsd.toLocaleString()} · Zero Excise Tax
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'good_reason' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#f8fafc', padding: '18px 22px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a', marginBottom: '12px' }}>
                  Record New Adverse Action (Constructive Discharge Trigger)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Trigger Category
                    </label>
                    <select
                      value={newEventCategory}
                      onChange={e => setNewEventCategory(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                      <option value="diminution_of_duties">Diminution of Title, Duties or Authority</option>
                      <option value="base_salary_reduction">Base Salary Reduction &gt; 10%</option>
                      <option value="forced_relocation">Forced Relocation &gt; 50 Miles</option>
                      <option value="reporting_line_demotion">Reporting Line Demotion</option>
                      <option value="material_contract_breach">Material Breach of Employment Agreement</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Event Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Reporting Line Demoted to VP Ops"
                      value={newEventTitle}
                      onChange={e => setNewEventTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Factual Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CEO removed direct reports without executive consent"
                      value={newEventDesc}
                      onChange={e => setNewEventDesc(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleAddGoodReasonEvent}
                    style={{ background: '#b91c1c', color: '#ffffff', border: 'none', padding: '9px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    + Record Formal Trigger Notice
                  </button>
                </div>
              </div>

              <div className="esg-event-list">
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                  Documented Good Reason Incidents ({currentCase.goodReasonEvents.length})
                </div>
                {currentCase.goodReasonEvents.map(event => (
                  <div key={event.id} className="esg-event-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                        {event.title}
                      </div>
                      <span className="esg-badge esg-badge-gold">
                        {event.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
                      {event.factualDescription}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                      <span>Occurred: <strong>{event.dateConditionOccurred}</strong></span>
                      <span>Notice Served: <strong>{event.dateNoticeServed || 'Pending'}</strong></span>
                      <span>30-Day Cure Deadline: <strong style={{ color: '#b91c1c' }}>{event.curePeriodDeadline || 'Not Started'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'counter_memo' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="esg-card-grid">
                <div className="esg-card">
                  <div className="esg-card-title">Executive Leverage Index (ELI)</div>
                  <div className="esg-card-value">{leverageIndex} / 100</div>
                  <div className="esg-card-sub">High Negotiation Clout</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Baseline Package Value</div>
                  <div className="esg-card-value">${audit.totalSeverancePackageValueUsd.toLocaleString()}</div>
                  <div className="esg-card-sub">Employer initial offer</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Proposed Counter-Offer Value</div>
                  <div className="esg-card-value" style={{ color: '#15803d' }}>
                    ${(audit.totalSeverancePackageValueUsd + 190000 + 25000).toLocaleString()}
                  </div>
                  <div className="esg-card-sub">+{counter.requestedCashMonths} mo cash + ${counter.requestedLegalFeeAllowanceUsd.toLocaleString()} legal fees</div>
                </div>
                <div className="esg-card">
                  <div className="esg-card-title">Bilateral Release Status</div>
                  <div className="esg-card-value" style={{ fontSize: '18px' }}>Mutual + DTSA</div>
                  <div className="esg-card-sub">SEC Rule 21F-17 Protected</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                  Publication-Grade Executive Separation Counter-Proposal Memo
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={copyMemoToClipboard}
                    style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#334155' }}
                  >
                    {copiedMemo ? '✓ Copied to Clipboard' : '📋 Copy Markdown Memo'}
                  </button>
                  <button
                    onClick={handleGenerateProposal}
                    style={{ background: '#b91c1c', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#ffffff' }}
                  >
                    Save Counter-Offer Proposal
                  </button>
                </div>
              </div>

              <div className="esg-memo-box">
                {generatedMemo}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
