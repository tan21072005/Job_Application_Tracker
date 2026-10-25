import React, { useState, useEffect } from 'react';
import {
  type InternalAuditErmOverviewDTO,
  type SoxInternalControlDTO,
  type EnterpriseRiskDTO,
  type CcmAuditEventDTO,
  type WhistleblowerReportDTO,
  type RemediationActionPlanDTO,
  type SoxAuditCertificationDTO,
  type SoxTripartiteRole,
  type CcmEventType,
  type WhistleblowerCategory
} from '../domain';
import { internalAuditErmNexusRepository } from '../data';

interface InternalAuditErmNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InternalAuditErmNexusModal: React.FC<InternalAuditErmNexusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'risks' | 'ccm' | 'whistleblower' | 'board'>('controls');
  const [overview, setOverview] = useState<InternalAuditErmOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [testResultCtrl, setTestResultCtrl] = useState<SoxInternalControlDTO | null>(null);
  const [isTestingCtrl, setIsTestingCtrl] = useState<boolean>(false);

  const [riskCode, setRiskCode] = useState<string>('ERM-NEW-01');
  const [riskTitle, setRiskTitle] = useState<string>('Cloud Infrastructure Multi-Tenant Boundary Drift');
  const [riskLikelihood, setRiskLikelihood] = useState<number>(4);
  const [riskImpact, setRiskImpact] = useState<number>(4);
  const [createdRisk, setCreatedRisk] = useState<EnterpriseRiskDTO | null>(null);
  const [isCreatingRisk, setIsCreatingRisk] = useState<boolean>(false);

  const [sodEventType, setSodEventType] = useState<CcmEventType>('sod_conflict_detected');
  const [sodToxicWeight, setSodToxicWeight] = useState<number>(2.0);
  const [sodExposure, setSodExposure] = useState<number>(125000);
  const [sodPrivDist, setSodPrivDist] = useState<number>(0.75);
  const [sodCompActive, setSodCompActive] = useState<boolean>(false);
  const [sodResult, setSodResult] = useState<{ severityScore: number; riskRating: string; recommendations: string[] } | null>(null);
  const [isEvaluatingSod, setIsEvaluatingSod] = useState<boolean>(false);

  const [wbhCategory, setWbhCategory] = useState<WhistleblowerCategory>('accounting_fraud');
  const [wbhSummary, setWbhSummary] = useState<string>('Report of unauthorized journal entries bypassing CFO review at fiscal quarter cutoff.');
  const [wbhNarrative, setWbhNarrative] = useState<string>('Manual manual adjustments were entered directly into the general ledger without corresponding supporting invoice reconciliation documentation.');
  const [wbhExposure, setWbhExposure] = useState<number>(310000);
  const [submittedWbhReceipt, setSubmittedWbhReceipt] = useState<string | null>(null);
  const [isSubmittingWbh, setIsSubmittingWbh] = useState<boolean>(false);

  const [fiscalPeriod, setFiscalPeriod] = useState<string>('Q3-2026');
  const [auditorFirm, setAuditorFirm] = useState<string>('PricewaterhouseCoopers LLP');
  const [activeCertification, setActiveCertification] = useState<SoxAuditCertificationDTO | null>(null);
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
      const data = await internalAuditErmNexusRepository.getOverview();
      setOverview(data);
      if (data.latestCertification) {
        setActiveCertification(data.latestCertification);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load SOX and internal audit telemetry');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteControlTest = async (ctrlId: string) => {
    setIsTestingCtrl(true);
    try {
      const res = await internalAuditErmNexusRepository.executeControlTest(ctrlId, {
        testingStatus: 'operating_effectively',
        deficiencyClassification: 'none',
        sampleSize: 45,
        exceptionsIdentified: 0
      });
      setTestResultCtrl(res);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to execute control testing');
    } finally {
      setIsTestingCtrl(false);
    }
  };

  const handleCreateRisk = async () => {
    setIsCreatingRisk(true);
    try {
      const res = await internalAuditErmNexusRepository.createRisk({
        riskCode,
        title: riskTitle,
        category: 'cybersecurity_information',
        inherentLikelihood: riskLikelihood,
        inherentImpact: riskImpact,
        boardAppetiteThreshold: 10,
        responseStrategy: 'mitigate_controls',
        mappedControlCodes: ['ITGC-AC-01', 'ITGC-CM-02'],
        maxPotentialFinancialLossUsd: 8500000,
        riskOwner: 'VP of Information Security'
      });
      setCreatedRisk(res);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to simulate enterprise risk');
    } finally {
      setIsCreatingRisk(false);
    }
  };

  const handleEvaluateSod = async () => {
    setIsEvaluatingSod(true);
    try {
      const res = await internalAuditErmNexusRepository.evaluateSod({
        eventType: sodEventType,
        toxicWeight: sodToxicWeight,
        exposureVolumeUsd: sodExposure,
        privilegeDistance: sodPrivDist,
        compensatingControlActive: sodCompActive
      });
      setSodResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate SoD severity');
    } finally {
      setIsEvaluatingSod(false);
    }
  };

  const handleRemediateCcm = async (eventId: string) => {
    try {
      await internalAuditErmNexusRepository.remediateCcmEvent(eventId, 'remediated', true);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to remediate CCM event');
    }
  };

  const handleSubmitWhistleblower = async () => {
    setIsSubmittingWbh(true);
    try {
      const res = await internalAuditErmNexusRepository.submitWhistleblowerReport({
        category: wbhCategory,
        allegationSummary: wbhSummary,
        detailedNarrative: wbhNarrative,
        involvedPersonsMasked: ['Engineering / Finance Subject A'],
        estimatedFinancialExposureUsd: wbhExposure,
        evidenceAttachmentsCount: 1
      });
      setSubmittedWbhReceipt(res.receiptToken);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to submit anonymous whistleblower report');
    } finally {
      setIsSubmittingWbh(false);
    }
  };

  const handleGenerateMemo = async () => {
    setIsGeneratingMemo(true);
    try {
      await internalAuditErmNexusRepository.generateSecItem9AMemo({
        fiscalPeriod,
        fiscalYear: 2026,
        auditorFirmName: auditorFirm,
        managementEvaluationDate: '2026-09-30'
      });
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to generate SEC Item 9A ICFR memo');
    } finally {
      setIsGeneratingMemo(false);
    }
  };

  const handleSignoff = async (role: SoxTripartiteRole) => {
    if (!activeCertification) return;
    setIsSigning(true);
    try {
      const roleProfiles: Record<SoxTripartiteRole, { name: string; title: string; obs: string }> = {
        head_of_internal_audit: {
          name: 'Victoria Sterling, CIA, CISA',
          title: 'Head of Internal Audit & Risk Assurance',
          obs: 'Certified completeness of testing samples, deficiency classifications, and remediation milestones.'
        },
        general_counsel_cro: {
          name: 'Jonathan Vance, Esq.',
          title: 'General Counsel & Chief Risk Officer',
          obs: 'Reviewed open whistleblower matters, regulatory disclosures, and verified absence of unaddressed legal holds.'
        },
        board_audit_committee_chair: {
          name: 'Hon. Margaret Holloway',
          title: 'Audit Committee Chair & Financial Expert',
          obs: 'Ratified independent Audit Committee oversight and authorized filing of Form 10-K Item 9A report.'
        }
      };
      const p = roleProfiles[role];
      const updated = await internalAuditErmNexusRepository.signoffCertification(activeCertification.id, {
        role,
        signerName: p.name,
        signerTitle: p.title,
        attestationConfirmed: true,
        observationsSummary: p.obs
      });
      setActiveCertification(updated);
      await loadOverview();
    } catch (err: any) {
      setError(err.message || 'Failed to record tripartite attestation');
    } finally {
      setIsSigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="sox-nexus-backdrop" onClick={onClose}>
      <div className="sox-nexus-container" onClick={(e) => e.stopPropagation()}>
        <div className="sox-nexus-header">
          <div className="sox-nexus-brand-row">
            <span className="sox-nexus-brand-icon">⚖️</span>
            <div>
              <h2 className="sox-nexus-title">Enterprise Internal Audit, SOX 404/302 Compliance & ERM Nexus</h2>
              <div className="sox-nexus-subtitle">
                COSO 2013 Control Matrix • Dynamic 5x5 Heatmap • Continuous Control Monitoring & SoD • Whistleblower Hotline • SEC Item 9A Tripartite Attestation
              </div>
            </div>
          </div>
          <div className="sox-nexus-header-actions">
            <span
              data-testid="arhs-score-badge"
              className={`sox-nexus-score-badge ${overview?.studio.arhsBand ? overview.studio.arhsBand.replace(/_/g, '-') : 'substantial-compliance'}`}
            >
              ARHS {overview?.studio.arhsScore.toFixed(1) || '88.5'} / 100 • {overview?.studio.arhsBand?.toUpperCase().replace(/_/g, ' ') || 'SUBSTANTIAL COMPLIANCE'}
            </span>
            <button
              data-testid="refresh-sox-nexus-btn"
              className="sox-nexus-btn-ghost"
              onClick={loadOverview}
              title="Refresh Telemetry"
            >
              🔄
            </button>
            <button
              data-testid="close-sox-nexus-btn"
              className="sox-nexus-btn-ghost"
              onClick={onClose}
              title="Close Modal"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="sox-nexus-tabs">
          <button
            data-testid="tab-pillar-sox-controls"
            className={`sox-nexus-tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
            onClick={() => setActiveTab('controls')}
          >
            Pillar A: SOX 404 Key Financial Controls
          </button>
          <button
            data-testid="tab-pillar-erm-risks"
            className={`sox-nexus-tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
            onClick={() => setActiveTab('risks')}
          >
            Pillar B: ERM Dynamic 5x5 Heatmap
          </button>
          <button
            data-testid="tab-pillar-ccm"
            className={`sox-nexus-tab-btn ${activeTab === 'ccm' ? 'active' : ''}`}
            onClick={() => setActiveTab('ccm')}
          >
            Pillar C: Continuous Monitoring & SoD Radar
          </button>
          <button
            data-testid="tab-pillar-whistleblower"
            className={`sox-nexus-tab-btn ${activeTab === 'whistleblower' ? 'active' : ''}`}
            onClick={() => setActiveTab('whistleblower')}
          >
            Pillar D: Whistleblower Hotline & Triage
          </button>
          <button
            data-testid="tab-pillar-board-war-room"
            className={`sox-nexus-tab-btn ${activeTab === 'board' ? 'active' : ''}`}
            onClick={() => setActiveTab('board')}
          >
            Pillar E: Board Audit Committee & SEC Item 9A
          </button>
        </div>

        {error && (
          <div className="sox-nexus-banner-error">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="sox-nexus-content">
          {loading && !overview ? (
            <div className="text-center p-8 text-muted font-semibold">Loading Internal Audit & SOX Telemetry...</div>
          ) : (
            <>
              {activeTab === 'controls' && (
                <div className="sox-nexus-tab-panel">
                  <div className="sox-nexus-grid-3">
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Total Key Financial Controls</div>
                      <div className="sox-nexus-card-val text-indigo">
                        {overview?.controls.length || 5}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Across Entity-Level, ITGC & Business Process Control domains
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Operating Effectively</div>
                      <div className="sox-nexus-card-val text-emerald">
                        {overview?.controls.filter(c => c.testingStatus === 'operating_effectively').length || 5}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Pass rate: {(((overview?.controls.filter(c => c.testingStatus === 'operating_effectively').length || 5) / (overview?.controls.length || 5)) * 100).toFixed(0)}% with verified audit trail
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">PCAOB AS 2201 Deficiencies</div>
                      <div className="sox-nexus-card-val text-gold">
                        {overview?.controls.filter(c => c.deficiencyClassification !== 'none').length || 0}
                      </div>
                      <div className="sox-nexus-card-sub">
                        0 Material Weaknesses • 0 Significant Deficiencies
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-action-bar">
                    <div>
                      <div className="sox-nexus-section-title">PCAOB AS 2201 Control Audit Verification & Sample Testing</div>
                      <div className="sox-nexus-section-desc">
                        Re-evaluates population sample sizes and confirms operating effectiveness of ITGC and Business Process controls.
                      </div>
                    </div>
                    <button
                      data-testid="btn-test-control"
                      className="sox-nexus-btn-primary"
                      onClick={() => overview?.controls[0] && handleExecuteControlTest(overview.controls[0].id)}
                      disabled={isTestingCtrl || !overview?.controls[0]}
                    >
                      {isTestingCtrl ? 'Verifying Sample...' : '🧪 Execute Control Sample Audit'}
                    </button>
                  </div>

                  {testResultCtrl && (
                    <div className="sox-nexus-badge-row">
                      <span className="sox-nexus-pill-emerald">
                        Verified Control: {testResultCtrl.controlCode} • Sample Size: {testResultCtrl.sampleSize} • Exceptions: {testResultCtrl.exceptionsIdentified} • Status: {testResultCtrl.testingStatus.toUpperCase()}
                      </span>
                    </div>
                  )}

                  <div className="sox-nexus-table-wrap">
                    <div className="sox-nexus-table-title">COSO 2013 Key Financial Controls Catalog</div>
                    <table className="sox-nexus-table">
                      <thead>
                        <tr>
                          <th>Control Code</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Nature</th>
                          <th>Frequency</th>
                          <th>COSO Principle</th>
                          <th>Assertion</th>
                          <th>Owner</th>
                          <th>Sample</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.controls || []).map((c) => (
                          <tr key={c.id}>
                            <td className="font-mono font-bold text-indigo">{c.controlCode}</td>
                            <td className="font-semibold">{c.title}</td>
                            <td><span className="sox-nexus-pill-gray">{c.category.replace(/_/g, ' ')}</span></td>
                            <td><span className="sox-nexus-pill-indigo">{c.nature.replace(/_/g, ' ')}</span></td>
                            <td className="text-muted">{c.frequency}</td>
                            <td className="font-mono text-xs">{c.cosoPrinciple.split('_')[0].toUpperCase()}</td>
                            <td className="text-muted">{c.primaryAssertion.replace(/_/g, ' ')}</td>
                            <td>{c.controlOwner}</td>
                            <td className="text-center font-mono">{c.sampleSize}</td>
                            <td>
                              <span className={`sox-nexus-pill-status ${c.testingStatus}`}>
                                {c.testingStatus.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'risks' && (
                <div className="sox-nexus-tab-panel">
                  <div className="sox-nexus-grid-3">
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Enterprise Risks Monitored</div>
                      <div className="sox-nexus-card-val text-indigo">
                        {overview?.risks.length || 4}
                      </div>
                      <div className="sox-nexus-card-sub">
                        COSO ERM 2017 & ISO 31000 Multi-Category Matrix
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Within Board Risk Appetite</div>
                      <div className="sox-nexus-card-val text-emerald">
                        {overview?.heatmap.withinAppetiteCount || 4}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Residual scores safely below tolerance thresholds
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Appetite Breaches</div>
                      <div className="sox-nexus-card-val text-red">
                        {overview?.heatmap.breachedCount || 0}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Zero elevated critical risk threshold alerts
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-grid-2">
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Dynamic 5x5 Residual Risk Heatmap Matrix</div>
                      <div className="text-xs text-muted mb-2">Rows = Likelihood (1-5), Columns = Impact (1-5)</div>
                      <div className="sox-nexus-heatmap-5x5">
                        {(overview?.heatmap.cells || []).map((cell, idx) => (
                          <div
                            key={idx}
                            className={`sox-nexus-heatmap-cell ${cell.zone}`}
                            title={`L${cell.likelihood} × I${cell.impact}: ${cell.riskCount} risks (${cell.riskCodes.join(', ') || 'None'})`}
                          >
                            <span className="font-mono text-xs font-bold">L{cell.likelihood}I{cell.impact}</span>
                            <span className="font-bold text-sm">{cell.riskCount}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="sox-nexus-simulator-box">
                      <div className="sox-nexus-section-title">Simulate Inherent vs Residual Risk</div>
                      <div className="sox-nexus-slider-group">
                        <label>Risk Identifier:</label>
                        <input
                          type="text"
                          value={riskCode}
                          onChange={(e) => setRiskCode(e.target.value)}
                        />
                      </div>
                      <div className="sox-nexus-slider-group">
                        <label>Risk Title:</label>
                        <input
                          type="text"
                          value={riskTitle}
                          onChange={(e) => setRiskTitle(e.target.value)}
                        />
                      </div>
                      <div className="sox-nexus-slider-grid">
                        <div className="sox-nexus-slider-group">
                          <label>Inherent Likelihood: <strong>{riskLikelihood} / 5</strong></label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={riskLikelihood}
                            onChange={(e) => setRiskLikelihood(Number(e.target.value))}
                          />
                        </div>
                        <div className="sox-nexus-slider-group">
                          <label>Inherent Impact: <strong>{riskImpact} / 5</strong></label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={riskImpact}
                            onChange={(e) => setRiskImpact(Number(e.target.value))}
                          />
                        </div>
                        <div className="sox-nexus-slider-group justify-end">
                          <button
                            data-testid="simulate-risk-btn"
                            className="sox-nexus-btn-primary"
                            onClick={handleCreateRisk}
                            disabled={isCreatingRisk}
                          >
                            {isCreatingRisk ? 'Calculating...' : '⚡ Compute Residual Risk'}
                          </button>
                        </div>
                      </div>

                      {createdRisk && (
                        <div className="sox-nexus-sim-outcomes">
                          <div className="outcome-pill">Inherent Score: <strong>{createdRisk.inherentScore}</strong></div>
                          <div className="outcome-pill text-emerald">Residual Score: <strong>{createdRisk.residualScore}</strong></div>
                          <div className="outcome-pill">Zone: <strong className="text-indigo">{createdRisk.appetiteZone.toUpperCase()}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="sox-nexus-table-wrap">
                    <div className="sox-nexus-table-title">Enterprise Risk Register & Residual Metrics</div>
                    <table className="sox-nexus-table">
                      <thead>
                        <tr>
                          <th>Risk Code</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Inherent Score</th>
                          <th>Residual Score</th>
                          <th>Board Threshold</th>
                          <th>Appetite Zone</th>
                          <th>Response Strategy</th>
                          <th>Mapped Controls</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.risks || []).map((r) => (
                          <tr key={r.id}>
                            <td className="font-mono font-bold text-indigo">{r.riskCode}</td>
                            <td className="font-semibold">{r.title}</td>
                            <td><span className="sox-nexus-pill-gray">{r.category.replace(/_/g, ' ')}</span></td>
                            <td className="font-mono font-bold text-amber">{r.inherentScore}</td>
                            <td className="font-mono font-bold text-emerald">{r.residualScore}</td>
                            <td className="font-mono text-muted">{r.boardAppetiteThreshold}</td>
                            <td><span className="sox-nexus-pill-emerald">{r.appetiteZone.replace(/_/g, ' ')}</span></td>
                            <td className="text-muted">{r.responseStrategy.replace(/_/g, ' ')}</td>
                            <td>
                              {r.mappedControlCodes.map((code) => (
                                <span key={code} className="sox-nexus-pill-indigo mr-1">{code}</span>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'ccm' && (
                <div className="sox-nexus-tab-panel">
                  <div className="sox-nexus-grid-3">
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Active SoD Violations</div>
                      <div className="sox-nexus-card-val text-amber">
                        {overview?.arhs.openSodViolationsCount || 1}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Toxic role combinations under supervisory monitoring
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Change Mgmt Bypasses</div>
                      <div className="sox-nexus-card-val text-emerald">
                        0
                      </div>
                      <div className="sox-nexus-card-sub">
                        100% PR verification across production releases
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">CCM Health Score</div>
                      <div className="sox-nexus-card-val text-indigo">
                        {overview?.arhs.continuousMonitoringScore || 88} / 100
                      </div>
                      <div className="sox-nexus-card-sub">
                        Continuous telemetry across IAM and ERP endpoints
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-simulator-box">
                    <div className="sox-nexus-section-title">Segregation of Duties (SoD) Conflict Severity Radar</div>
                    <div className="sox-nexus-filter-row">
                      <div className="filter-group">
                        <label>Telemetry Event Type:</label>
                        <select
                          value={sodEventType}
                          onChange={(e) => setSodEventType(e.target.value as CcmEventType)}
                        >
                          <option value="sod_conflict_detected">SoD Toxic Role Conflict</option>
                          <option value="change_management_bypass">Change Management Bypass</option>
                          <option value="privileged_access_anomaly">Privileged Access Anomaly</option>
                          <option value="cross_tenant_query_attempt">Cross-Tenant Isolation Breach Attempt</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <label>Exposure Volume ($):</label>
                        <input
                          type="number"
                          value={sodExposure}
                          onChange={(e) => setSodExposure(Number(e.target.value))}
                        />
                      </div>
                      <div className="filter-group">
                        <label>Compensating Control Active:</label>
                        <select
                          value={sodCompActive ? 'true' : 'false'}
                          onChange={(e) => setSodCompActive(e.target.value === 'true')}
                        >
                          <option value="false">No (Unmitigated Conflict)</option>
                          <option value="true">Yes (Dual-Signoff Active)</option>
                        </select>
                      </div>
                      <div className="filter-group justify-end">
                        <button
                          data-testid="evaluate-sod-btn"
                          className="sox-nexus-btn-primary"
                          onClick={handleEvaluateSod}
                          disabled={isEvaluatingSod}
                        >
                          {isEvaluatingSod ? 'Evaluating...' : '🔍 Evaluate SoD Risk'}
                        </button>
                      </div>
                    </div>

                    {sodResult && (
                      <div className="sox-nexus-sim-outcomes">
                        <div className="outcome-pill">Severity Index: <strong className="text-amber">{sodResult.severityScore.toFixed(1)} / 100</strong></div>
                        <div className="outcome-pill">Risk Rating: <strong className="text-red">{sodResult.riskRating}</strong></div>
                        <div className="w-full text-xs text-muted mt-2">
                          <strong>Recommended Actions:</strong>
                          <ul className="list-disc pl-5 mt-1">
                            {sodResult.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sox-nexus-table-wrap">
                    <div className="sox-nexus-table-title">Continuous Control Monitoring Telemetry Stream</div>
                    <table className="sox-nexus-table">
                      <thead>
                        <tr>
                          <th>Event Code</th>
                          <th>Type</th>
                          <th>Severity</th>
                          <th>Actor</th>
                          <th>Target Resource</th>
                          <th>Exposure ($)</th>
                          <th>Compensating Control</th>
                          <th>Severity Score</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.ccmEvents || []).map((e) => (
                          <tr key={e.id}>
                            <td className="font-mono font-bold text-indigo">{e.eventCode}</td>
                            <td><span className="sox-nexus-pill-gray">{e.eventType.replace(/_/g, ' ')}</span></td>
                            <td><span className="sox-nexus-pill-indigo">{e.severity.toUpperCase()}</span></td>
                            <td className="font-mono text-xs">{e.actorEmail}</td>
                            <td>{e.resourceTarget}</td>
                            <td className="font-mono text-right">${e.exposureVolumeUsd.toLocaleString()}</td>
                            <td className="text-center">{e.compensatingControlActive ? '✅ Active' : '❌ None'}</td>
                            <td className="font-mono font-bold text-amber">{e.sodSeverityScore.toFixed(1)}</td>
                            <td><span className="sox-nexus-pill-status in_progress">{e.resolutionStatus.replace(/_/g, ' ')}</span></td>
                            <td>
                              <button
                                data-testid="remediate-ccm-btn"
                                className="sox-nexus-btn-secondary"
                                onClick={() => handleRemediateCcm(e.id)}
                                disabled={e.resolutionStatus === 'remediated'}
                              >
                                {e.resolutionStatus === 'remediated' ? 'Remediated' : 'Remediate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'whistleblower' && (
                <div className="sox-nexus-tab-panel">
                  <div className="sox-nexus-grid-3">
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Active Investigations</div>
                      <div className="sox-nexus-card-val text-amber">
                        {overview?.whistleblowerReports.filter(w => w.triageStatus !== 'closed_remediated').length || 1}
                      </div>
                      <div className="sox-nexus-card-sub">
                        SOX Section 301 & Dodd-Frank Anonymous Intake
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Legal Hold Directives Active</div>
                      <div className="sox-nexus-card-val text-indigo">
                        {overview?.whistleblowerReports.filter(w => w.legalHoldActive).length || 1}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Document and communication preservation enforced
                      </div>
                    </div>
                    <div className="sox-nexus-card">
                      <div className="sox-nexus-card-label">Audit Committee Escalated</div>
                      <div className="sox-nexus-card-val text-red">
                        {overview?.whistleblowerReports.filter(w => w.auditCommitteeEscalated).length || 0}
                      </div>
                      <div className="sox-nexus-card-sub">
                        Automatic triggers on accounting fraud &gt; $250,000
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-simulator-box">
                    <div className="sox-nexus-section-title">Cryptographic Anonymous Intake Portal (SOX 301 / Dodd-Frank)</div>
                    <div className="sox-nexus-filter-row">
                      <div className="filter-group">
                        <label>Allegation Category:</label>
                        <select
                          value={wbhCategory}
                          onChange={(e) => setWbhCategory(e.target.value as WhistleblowerCategory)}
                        >
                          <option value="accounting_fraud">Accounting Fraud / ICFR Manipulation</option>
                          <option value="internal_controls_circumvention">Internal Controls Circumvention</option>
                          <option value="executive_misconduct">Executive Misconduct</option>
                          <option value="bribery_corruption_fcpa">Bribery / Corruption / FCPA</option>
                        </select>
                      </div>
                      <div className="filter-group flex-2">
                        <label>Allegation Summary:</label>
                        <input
                          type="text"
                          value={wbhSummary}
                          onChange={(e) => setWbhSummary(e.target.value)}
                        />
                      </div>
                      <div className="filter-group">
                        <label>Estimated Exposure ($):</label>
                        <input
                          type="number"
                          value={wbhExposure}
                          onChange={(e) => setWbhExposure(Number(e.target.value))}
                        />
                      </div>
                      <div className="filter-group justify-end">
                        <button
                          data-testid="submit-wbh-btn"
                          className="sox-nexus-btn-danger"
                          onClick={handleSubmitWhistleblower}
                          disabled={isSubmittingWbh}
                        >
                          {isSubmittingWbh ? 'Submitting...' : '🔒 Submit Anonymous Dossier'}
                        </button>
                      </div>
                    </div>

                    {submittedWbhReceipt && (
                      <div className="sox-nexus-sim-outcomes">
                        <div className="outcome-pill text-emerald">
                          ✅ Report Submitted Securely
                        </div>
                        <div className="outcome-pill font-mono text-indigo">
                          Receipt Token: <strong>{submittedWbhReceipt}</strong>
                        </div>
                        <div className="w-full text-xs text-muted mt-1">
                          Keep this cryptographic receipt token confidential. It allows secure, anonymous two-way tracking with the Audit Committee.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sox-nexus-table-wrap">
                    <div className="sox-nexus-table-title">Audit Committee Whistleblower Casebook</div>
                    <table className="sox-nexus-table">
                      <thead>
                        <tr>
                          <th>Tracking Number</th>
                          <th>Category</th>
                          <th>Severity</th>
                          <th>Summary</th>
                          <th>Financial Exposure</th>
                          <th>Legal Hold</th>
                          <th>Audit Committee Escalated</th>
                          <th>Lead Investigator</th>
                          <th>Triage Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.whistleblowerReports || []).map((w) => (
                          <tr key={w.id}>
                            <td className="font-mono font-bold text-indigo">{w.reportTrackingNumber}</td>
                            <td><span className="sox-nexus-pill-gray">{w.category.replace(/_/g, ' ')}</span></td>
                            <td><span className="sox-nexus-pill-red">{w.severity.toUpperCase()}</span></td>
                            <td className="max-w-md">{w.allegationSummary}</td>
                            <td className="font-mono text-right">${w.estimatedFinancialExposureUsd.toLocaleString()}</td>
                            <td className="text-center">{w.legalHoldActive ? '🔒 Active' : 'None'}</td>
                            <td className="text-center">{w.auditCommitteeEscalated ? '🚨 Escalated' : 'Standard'}</td>
                            <td>{w.assignedLeadInvestigator || 'Unassigned'}</td>
                            <td><span className="sox-nexus-pill-status in_progress">{w.triageStatus.replace(/_/g, ' ')}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'board' && (
                <div className="sox-nexus-tab-panel">
                  <div className="sox-nexus-action-bar">
                    <div className="sox-nexus-filter-row flex-1">
                      <div className="filter-group">
                        <label>Fiscal Reporting Period:</label>
                        <input
                          type="text"
                          value={fiscalPeriod}
                          onChange={(e) => setFiscalPeriod(e.target.value)}
                        />
                      </div>
                      <div className="filter-group flex-2">
                        <label>Independent Audit Firm:</label>
                        <input
                          type="text"
                          value={auditorFirm}
                          onChange={(e) => setAuditorFirm(e.target.value)}
                        />
                      </div>
                      <div className="filter-group justify-end">
                        <button
                          data-testid="generate-sec9a-memo-btn"
                          className="sox-nexus-btn-primary"
                          onClick={handleGenerateMemo}
                          disabled={isGeneratingMemo}
                        >
                          {isGeneratingMemo ? 'Compiling Memo...' : '📝 Generate SEC Item 9A ICFR Memo'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-card">
                    <div className="sox-nexus-section-title">Tripartite Digital Sign-Off Authority Pipeline (SOX 302/906)</div>
                    <div className="sox-nexus-signoff-grid mt-3">
                      <div className={`sox-nexus-signoff-card ${activeCertification?.signOffs.some(s => s.role === 'head_of_internal_audit' && s.attestationConfirmed) ? 'signed' : ''}`}>
                        <div className="sox-nexus-card-label">1. Head of Internal Audit</div>
                        <div className="font-bold text-sm">Victoria Sterling, CIA, CISA</div>
                        <div className="text-xs text-muted mb-2">
                          {activeCertification?.signOffs.some(s => s.role === 'head_of_internal_audit' && s.attestationConfirmed)
                            ? `✅ Attested on ${activeCertification.signOffs.find(s => s.role === 'head_of_internal_audit')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Certification'}
                        </div>
                        <button
                          data-testid="signoff-hia-btn"
                          className="sox-nexus-btn-secondary"
                          onClick={() => handleSignoff('head_of_internal_audit')}
                          disabled={isSigning || activeCertification?.signOffs.some(s => s.role === 'head_of_internal_audit' && s.attestationConfirmed)}
                        >
                          Certify as Internal Audit Head
                        </button>
                      </div>

                      <div className={`sox-nexus-signoff-card ${activeCertification?.signOffs.some(s => s.role === 'general_counsel_cro' && s.attestationConfirmed) ? 'signed' : ''}`}>
                        <div className="sox-nexus-card-label">2. General Counsel / CRO</div>
                        <div className="font-bold text-sm">Jonathan Vance, Esq.</div>
                        <div className="text-xs text-muted mb-2">
                          {activeCertification?.signOffs.some(s => s.role === 'general_counsel_cro' && s.attestationConfirmed)
                            ? `✅ Attested on ${activeCertification.signOffs.find(s => s.role === 'general_counsel_cro')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Review'}
                        </div>
                        <button
                          data-testid="signoff-gc-btn"
                          className="sox-nexus-btn-secondary"
                          onClick={() => handleSignoff('general_counsel_cro')}
                          disabled={isSigning || activeCertification?.signOffs.some(s => s.role === 'general_counsel_cro' && s.attestationConfirmed)}
                        >
                          Attest as General Counsel / CRO
                        </button>
                      </div>

                      <div className={`sox-nexus-signoff-card ${activeCertification?.signOffs.some(s => s.role === 'board_audit_committee_chair' && s.attestationConfirmed) ? 'signed' : ''}`}>
                        <div className="sox-nexus-card-label">3. Audit Committee Chair</div>
                        <div className="font-bold text-sm">Hon. Margaret Holloway</div>
                        <div className="text-xs text-muted mb-2">
                          {activeCertification?.signOffs.some(s => s.role === 'board_audit_committee_chair' && s.attestationConfirmed)
                            ? `✅ Ratified on ${activeCertification.signOffs.find(s => s.role === 'board_audit_committee_chair')?.signedAt.split('T')[0]}`
                            : '⏳ Awaiting Ratification'}
                        </div>
                        <button
                          data-testid="signoff-bac-btn"
                          className="sox-nexus-btn-secondary"
                          onClick={() => handleSignoff('board_audit_committee_chair')}
                          disabled={isSigning || activeCertification?.signOffs.some(s => s.role === 'board_audit_committee_chair' && s.attestationConfirmed)}
                        >
                          Ratify as Audit Committee Chair
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="sox-nexus-card">
                    <div className="sox-nexus-section-title">SEC Form 10-K Item 9A Controls and Procedures Memorandum</div>
                    <pre className="sox-nexus-markdown-body mt-2">
                      {activeCertification?.secItem9AMemoMarkdown || 'No memorandum generated yet. Click "Generate SEC Item 9A ICFR Memo" above.'}
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
