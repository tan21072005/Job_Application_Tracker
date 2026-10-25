import { useState, useEffect } from 'react';
import {
  type CyberRiskStudioOverviewDTO,
  type CyberRiskCategory,
  type VulnerabilityPriorityTier,
  type NistCsfFunction,
  type NistMaturityTier,
  type TabletopBreachArchetype,
  type SignOffGovernanceRole,
  type CyberRiskScenarioMutationDTO,
  type ThreatVulnerabilityMutationDTO,
  type DarkWebExposureMutationDTO,
  type ComplianceControlMutationDTO,
  type TabletopSimulationMutationDTO,
  type GovernanceSignOffPayloadDTO
} from '../domain';
import { cyberRiskGovernanceStudioRepository } from '../data';

interface CyberRiskGovernanceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CyberRiskGovernanceStudioModal({ isOpen, onClose }: CyberRiskGovernanceStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'fair-risk' | 'threat-landscape' | 'compliance-matrix' | 'tabletop-simulator' | 'board-memorandum'>('fair-risk');
  const [overview, setOverview] = useState<CyberRiskStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddScenarioModal, setShowAddScenarioModal] = useState(false);
  const [showAddVulnModal, setShowAddVulnModal] = useState(false);
  const [showAddExposureModal, setShowAddExposureModal] = useState(false);
  const [showAddControlModal, setShowAddControlModal] = useState(false);
  const [showAddSimModal, setShowAddSimModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [scenarioForm, setScenarioForm] = useState<CyberRiskScenarioMutationDTO>({
    title: '',
    category: 'ransomware_extortion',
    assetName: '',
    threatActor: '',
    contactFrequency: 12.0,
    probabilityOfAction: 0.25,
    threatCapability: 70,
    resistanceStrength: 65,
    primaryLossMinUsd: 150000,
    primaryLossLikelyUsd: 450000,
    primaryLossMaxUsd: 1200000,
    secondaryLossMinUsd: 250000,
    secondaryLossLikelyUsd: 750000,
    secondaryLossMaxUsd: 3500000,
    inherentAleUsd: 4500000
  });

  const [vulnForm, setVulnForm] = useState<ThreatVulnerabilityMutationDTO>({
    cveId: '',
    title: '',
    cvssScore: 7.5,
    epssProbability: 0.15,
    epssPercentile: 0.85,
    cisaKevStatus: false,
    affectedAsset: '',
    component: '',
    remediationStatus: 'open',
    patchDueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  });

  const [exposureForm, setExposureForm] = useState<DarkWebExposureMutationDTO>({
    targetDomain: 'enterprise-corp.com',
    breachSource: '',
    exposureDate: new Date().toISOString().slice(0, 10),
    leakedEmail: '',
    hasPlaintextPassword: false,
    hasSessionToken: false,
    isVipExecutive: false,
    vipTitle: '',
    infostealerVariant: '',
    remediationStatus: 'active'
  });

  const [controlForm, setControlForm] = useState<ComplianceControlMutationDTO>({
    functionCode: 'govern',
    categoryCode: 'GV.OC',
    subcategoryCode: 'GV.OC-02',
    title: '',
    description: '',
    iso27001Mapping: 'Clause 4.2',
    soc2Mapping: 'CC1.2',
    hipaaMapping: '164.308(a)(1)(ii)',
    maturityTier: 'tier_3_repeatable',
    hasVerifiedEvidence: true,
    lastAuditedDate: new Date().toISOString().slice(0, 10),
    auditorNotes: 'Audited during annual security assessment.'
  });

  const [simForm, setSimForm] = useState<TabletopSimulationMutationDTO>({
    archetype: 'ransomware_double_extortion',
    scenarioTitle: '',
    conductedDate: new Date().toISOString().slice(0, 10),
    participantsCount: 10,
    meanTimeToDetectHours: 1.5,
    meanTimeToContainHours: 4.0,
    simulatedRansomDemandedUsd: 3000000,
    simulatedBusinessInterruptionDays: 2,
    simulatedTotalLossUsd: 5500000,
    immutableBackupScore: 85,
    airgapIsolationScore: 80,
    rtoRpoDrillScore: 85,
    pamSegregationScore: 75,
    keyFindings: ['Out-of-band crisis comms activated in 15 mins'],
    remediationActionItems: ['Deploy automated AD quarantine triggers']
  });

  const [signOffPayload, setSignOffPayload] = useState<GovernanceSignOffPayloadDTO>({
    role: 'ciso',
    signatoryName: '',
    signatoryTitle: '',
    attestationRemarks: ''
  });

  useEffect(() => {
    if (isOpen) {
      void loadData();
    }
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await cyberRiskGovernanceStudioRepository.getOverview();
      setOverview(data);
    } catch (err) {
      console.error('Error loading cyber risk overview:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateScenario(e: React.FormEvent) {
    e.preventDefault();
    try {
      await cyberRiskGovernanceStudioRepository.createScenario(scenarioForm);
      setShowAddScenarioModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteScenario(id: string) {
    try {
      await cyberRiskGovernanceStudioRepository.deleteScenario(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleCreateVuln(e: React.FormEvent) {
    e.preventDefault();
    try {
      await cyberRiskGovernanceStudioRepository.createVulnerability(vulnForm);
      setShowAddVulnModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteVuln(id: string) {
    try {
      await cyberRiskGovernanceStudioRepository.deleteVulnerability(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleCreateExposure(e: React.FormEvent) {
    e.preventDefault();
    try {
      await cyberRiskGovernanceStudioRepository.createDarkWebExposure(exposureForm);
      setShowAddExposureModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteExposure(id: string) {
    try {
      await cyberRiskGovernanceStudioRepository.deleteDarkWebExposure(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleCreateControl(e: React.FormEvent) {
    e.preventDefault();
    try {
      await cyberRiskGovernanceStudioRepository.createComplianceControl(controlForm);
      setShowAddControlModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteControl(id: string) {
    try {
      await cyberRiskGovernanceStudioRepository.deleteComplianceControl(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleCreateSim(e: React.FormEvent) {
    e.preventDefault();
    try {
      await cyberRiskGovernanceStudioRepository.createTabletopSimulation(simForm);
      setShowAddSimModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleDeleteSim(id: string) {
    try {
      await cyberRiskGovernanceStudioRepository.deleteTabletopSimulation(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleSignOff(role: SignOffGovernanceRole, name: string, title: string, remarks: string) {
    if (!overview?.activeMemorandum) return;
    try {
      await cyberRiskGovernanceStudioRepository.signOffMemorandum(overview.activeMemorandum.id, {
        role,
        signatoryName: name,
        signatoryTitle: title,
        attestationRemarks: remarks
      });
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function handleCopyMemo() {
    if (!overview?.activeMemorandum?.memorandumMarkdown) return;
    navigator.clipboard.writeText(overview.activeMemorandum.memorandumMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }

  if (!isOpen) return null;

  const memo = overview?.activeMemorandum;
  const threat = overview?.threatLandscape;
  const comp = overview?.complianceMatrix;
  const policy = overview?.insurancePolicy;

  return (
    <div className="jobtrack-modal-overlay" data-testid="cyber-risk-governance-studio-modal">
      <div className="jobtrack-modal-container cyber-studio-container">
        <header className="cyber-studio-header">
          <div className="cyber-studio-title-group">
            <div className="cyber-studio-title-badge">
              <span className="cyber-studio-icon">🛡️</span>
              <span className="cyber-studio-category">ENTERPRISE CISO GOVERNANCE</span>
            </div>
            <h2>Cyber Risk, Threat Intelligence & CISO Command Studio</h2>
            <p>FAIR quantitative Value-at-Risk modeling, EPSS exploit forecasting & SEC Item 1.05 Board Memorandum</p>
          </div>

          <div className="cyber-studio-header-actions">
            {overview && (
              <div className="cyber-studio-csps-badge" data-testid="csps-score-badge">
                <span className="cyber-studio-csps-label">Security Posture (CSPS)</span>
                <strong className="cyber-studio-csps-score">{overview.compositeSecurityPostureScore} / 100</strong>
                <span className={`cyber-studio-tier-pill tier-${overview.postureTier}`}>
                  {overview.postureTier.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>
            )}
            <button
              className="jobtrack-modal-close cyber-studio-close"
              onClick={onClose}
              data-testid="close-cyber-risk-governance-studio"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="cyber-studio-tabs">
          <button
            className={`cyber-studio-tab ${activeTab === 'fair-risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('fair-risk')}
            data-testid="tab-fair-risk"
          >
            🎯 FAIR Quantitative Risk & Financial VaR
          </button>
          <button
            className={`cyber-studio-tab ${activeTab === 'threat-landscape' ? 'active' : ''}`}
            onClick={() => setActiveTab('threat-landscape')}
            data-testid="tab-threat-landscape"
          >
            ⚡ Threat Landscape & EPSS Matrix
          </button>
          <button
            className={`cyber-studio-tab ${activeTab === 'compliance-matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('compliance-matrix')}
            data-testid="tab-compliance-matrix"
          >
            🏛️ NIST CSF 2.0 & Multi-Framework
          </button>
          <button
            className={`cyber-studio-tab ${activeTab === 'tabletop-simulator' ? 'active' : ''}`}
            onClick={() => setActiveTab('tabletop-simulator')}
            data-testid="tab-tabletop-simulator"
          >
            🛡️ Tabletop Simulator & Insurance
          </button>
          <button
            className={`cyber-studio-tab ${activeTab === 'board-memorandum' ? 'active' : ''}`}
            onClick={() => setActiveTab('board-memorandum')}
            data-testid="tab-board-memorandum"
          >
            📑 SEC Item 1.05 & Board Memo
          </button>
        </nav>

        {loading ? (
          <div className="cyber-studio-loading">
            <span className="cyber-studio-spinner">⏳</span>
            <p>Loading enterprise cyber risk simulations and telemetry matrices...</p>
          </div>
        ) : !overview ? (
          <div className="cyber-studio-error">Failed to load cyber risk governance data.</div>
        ) : (
          <main className="cyber-studio-body">
            {activeTab === 'fair-risk' && (
              <section className="cyber-studio-section" data-testid="fair-risk-section">
                <div className="cyber-studio-dist-panel">
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Annualized Loss Expectancy (ALE)</span>
                    <strong className="kpi-value text-gold" data-testid="kpi-total-ale">
                      ${(overview.totalAnnualizedLossExpectancyUsd / 1000000).toFixed(2)}M
                    </strong>
                    <span className="kpi-sub">Across {overview.scenarios.length} Scenarios</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Value-at-Risk (95% Confidence)</span>
                    <strong className="kpi-value text-red" data-testid="kpi-total-var95">
                      ${(overview.totalValueAtRisk95Usd / 1000000).toFixed(2)}M
                    </strong>
                    <span className="kpi-sub">1-Year Tail Exposure</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Attack Surface Rating (ASR)</span>
                    <strong className="kpi-value text-orange" data-testid="kpi-asr">
                      {overview.attackSurfaceRating} / 100
                    </strong>
                    <span className="kpi-sub">External Perimeter Risk</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Audit Defensibility Score</span>
                    <strong className="kpi-value text-green" data-testid="kpi-ads">
                      {overview.auditDefensibilityScore} / 100
                    </strong>
                    <span className="kpi-sub">Verified Control Health</span>
                  </div>
                </div>

                <div className="cyber-studio-toolbar">
                  <h3>FAIR Risk Modeling Scenarios (Beta-PERT Distributed)</h3>
                  <button
                    className="cyber-studio-btn-primary"
                    onClick={() => setShowAddScenarioModal(true)}
                    data-testid="btn-add-scenario"
                  >
                    + Add Risk Scenario
                  </button>
                </div>

                <div className="cyber-studio-table-wrapper">
                  <table className="cyber-studio-table" data-testid="table-scenarios">
                    <thead>
                      <tr>
                        <th>Scenario & Target Asset</th>
                        <th>Threat Actor</th>
                        <th>Vulnerability (V)</th>
                        <th>Loss Event Freq (LEF)</th>
                        <th>Single Loss (SLE Exp)</th>
                        <th>ALE (Annualized)</th>
                        <th>VaR-95</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.scenarios.map(s => (
                        <tr key={s.id} data-testid={`scenario-row-${s.id}`}>
                          <td>
                            <strong>{s.title}</strong>
                            <div className="text-muted small">{s.assetName} ({s.category.replace(/_/g, ' ')})</div>
                          </td>
                          <td>
                            <span className="threat-pill">{s.threatActor}</span>
                          </td>
                          <td>
                            <strong>{s.vulnerabilityPercent}%</strong>
                            <div className="text-muted small">TCap {s.threatCapability} vs RS {s.resistanceStrength}</div>
                          </td>
                          <td>
                            <strong>{s.lossEventFrequency} / yr</strong>
                            <div className="text-muted small">TEF: {s.threatEventFrequency}</div>
                          </td>
                          <td>${(s.singleLossExpectancyExpectedUsd / 1000).toFixed(0)}k</td>
                          <td>
                            <strong className="text-gold">${(s.annualizedLossExpectancyUsd / 1000).toFixed(0)}k</strong>
                          </td>
                          <td>
                            <strong className="text-red">${(s.valueAtRisk95PercentUsd / 1000000).toFixed(2)}M</strong>
                          </td>
                          <td>
                            <button
                              className="cyber-studio-btn-danger-sm"
                              onClick={() => handleDeleteScenario(s.id)}
                              data-testid={`delete-scenario-${s.id}`}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'threat-landscape' && (
              <section className="cyber-studio-section" data-testid="threat-landscape-section">
                <div className="cyber-studio-dist-panel">
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Active CISA KEV Exploits</span>
                    <strong className="kpi-value text-red" data-testid="cisa-kev-count">
                      {threat?.cisaKevActiveCount}
                    </strong>
                    <span className="kpi-sub">Weaponized in the wild</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Critical Tier Vulnerabilities</span>
                    <strong className="kpi-value text-orange" data-testid="crit-vulns-count">
                      {threat?.criticalVulnerabilitiesCount} / {threat?.totalVulnerabilitiesCount}
                    </strong>
                    <span className="kpi-sub">EPSS &ge; 0.36 or KEV</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Dark Web Leak Index (CLEI)</span>
                    <strong className="kpi-value text-purple" data-testid="clei-score">
                      {threat?.credentialLeakExposureIndex} / 100
                    </strong>
                    <span className="kpi-sub">{threat?.vipExecutivesCompromisedCount} VIP Credential Leaks</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Perimeter Attack Surface</span>
                    <strong className="kpi-value text-blue" data-testid="asr-score">
                      {threat?.attackSurfaceRating} / 100
                    </strong>
                    <span className="kpi-sub">Port & Cloud Perimeter</span>
                  </div>
                </div>

                <div className="cyber-studio-grid-2col">
                  <div className="cyber-studio-card">
                    <div className="card-header-row">
                      <h4>Weaponized CVE Vulnerabilities (EPSS v3)</h4>
                      <button
                        className="cyber-studio-btn-primary btn-sm"
                        onClick={() => setShowAddVulnModal(true)}
                        data-testid="btn-add-vuln"
                      >
                        + Ingest CVE
                      </button>
                    </div>

                    <div className="vuln-list">
                      {threat?.vulnerabilities.map(v => (
                        <div key={v.id} className={`vuln-item tier-${v.priorityTier}`} data-testid={`vuln-item-${v.id}`}>
                          <div className="vuln-item-header">
                            <span className="cve-pill">{v.cveId}</span>
                            <span className={`priority-badge ${v.priorityTier}`}>{v.priorityTier.toUpperCase()}</span>
                            {v.cisaKevStatus && <span className="kev-badge">🔥 CISA KEV</span>}
                            <button
                              className="btn-link-danger"
                              onClick={() => handleDeleteVuln(v.id)}
                            >
                              ✕
                            </button>
                          </div>
                          <strong>{v.title}</strong>
                          <div className="vuln-metrics small">
                            <span>CVSS: <strong>{v.cvssScore.toFixed(1)}</strong></span> |{' '}
                            <span>EPSS: <strong>{(v.epssProbability * 100).toFixed(1)}%</strong> ({Math.round(v.epssPercentile * 100)}th %tile)</span> |{' '}
                            <span>Target: {v.affectedAsset}</span>
                          </div>
                          <div className="vuln-footer small text-muted">
                            Patch Due: {v.patchDueDate} | Status: <span className="status-tag">{v.remediationStatus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cyber-studio-card">
                    <div className="card-header-row">
                      <h4>Dark Web & Infostealer Identity Exposure</h4>
                      <button
                        className="cyber-studio-btn-primary btn-sm"
                        onClick={() => setShowAddExposureModal(true)}
                        data-testid="btn-add-exposure"
                      >
                        + Track Exposure
                      </button>
                    </div>

                    <div className="exposure-list">
                      {threat?.darkWebExposures.map(d => (
                        <div key={d.id} className="exposure-item" data-testid={`exposure-item-${d.id}`}>
                          <div className="exposure-item-header">
                            <span className="email-pill">{d.leakedEmail}</span>
                            {d.isVipExecutive && <span className="vip-badge">👑 VIP EXECUTIVE</span>}
                            <button
                              className="btn-link-danger"
                              onClick={() => handleDeleteExposure(d.id)}
                            >
                              ✕
                            </button>
                          </div>
                          <div className="exposure-details small">
                            <div><strong>Source:</strong> {d.breachSource} ({d.infostealerVariant || 'Credential Dump'})</div>
                            <div>
                              <span>Plaintext Password: {d.hasPlaintextPassword ? '⚠️ YES' : 'NO'}</span> |{' '}
                              <span>Session Token: {d.hasSessionToken ? '🚨 YES (Session Hijack)' : 'NO'}</span>
                            </div>
                            <div className="text-muted">
                              Discovered: {d.exposureDate?.slice(0, 10)} | Risk Score: <strong>{d.exposureRiskScore} / 100</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'compliance-matrix' && (
              <section className="cyber-studio-section" data-testid="compliance-matrix-section">
                <div className="cyber-studio-dist-panel">
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Audit Defensibility Score (ADS)</span>
                    <strong className="kpi-value text-green" data-testid="nist-ads-score">
                      {comp?.auditDefensibilityScore} / 100
                    </strong>
                    <span className="kpi-sub">Weighted Tier & Evidence</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Overall Framework Maturity</span>
                    <strong className="kpi-value text-blue" data-testid="nist-overall-tier">
                      Tier {comp?.overallMaturityAverage} / 4.0
                    </strong>
                    <span className="kpi-sub">Across 6 NIST Functions</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Verified Evidence Coverage</span>
                    <strong className="kpi-value text-gold" data-testid="nist-evidence-rate">
                      {comp?.evidenceCoverageRate}%
                    </strong>
                    <span className="kpi-sub">{comp?.totalEvidencedCount} / {comp?.totalControlsCount} Controls Verified</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Multi-Framework Cross-Walk</span>
                    <strong className="kpi-value text-purple">SOC2 / ISO / HIPAA</strong>
                    <span className="kpi-sub">Unified Mapping Matrix</span>
                  </div>
                </div>

                <div className="nist-function-grid">
                  {comp && Object.values(comp.functionSummaries).map(f => (
                    <div key={f.functionCode} className="nist-function-card" data-testid={`nist-function-${f.functionCode}`}>
                      <div className="fn-header">
                        <h4>{f.functionLabel}</h4>
                        <span className="tier-tag">Tier {f.averageTier} ({f.tierClassification.replace('tier_', '').replace(/_/g, ' ')})</span>
                      </div>
                      <div className="fn-stats small">
                        <span>Controls: {f.controlCount}</span>
                        <span>Evidence: {f.evidencedCount} ({f.evidenceCoveragePercent}%)</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${(f.averageTier / 4.0) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cyber-studio-toolbar">
                  <h3>Compliance Control Catalog & Audit Trail</h3>
                  <button
                    className="cyber-studio-btn-primary"
                    onClick={() => setShowAddControlModal(true)}
                    data-testid="btn-add-control"
                  >
                    + Add Compliance Control
                  </button>
                </div>

                <div className="cyber-studio-table-wrapper">
                  <table className="cyber-studio-table" data-testid="table-controls">
                    <thead>
                      <tr>
                        <th>NIST Subcategory & Title</th>
                        <th>Function</th>
                        <th>Maturity Tier</th>
                        <th>ISO 27001 Mapping</th>
                        <th>SOC 2 Mapping</th>
                        <th>HIPAA Mapping</th>
                        <th>Evidence Verified</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comp?.controls.map(c => (
                        <tr key={c.id} data-testid={`control-row-${c.id}`}>
                          <td>
                            <strong>{c.subcategoryCode}: {c.title}</strong>
                            <div className="text-muted small">{c.description}</div>
                          </td>
                          <td><span className="fn-pill">{c.functionCode.toUpperCase()}</span></td>
                          <td><strong>Tier {c.maturityNumericTier}</strong></td>
                          <td><code>{c.iso27001Mapping}</code></td>
                          <td><code>{c.soc2Mapping}</code></td>
                          <td><code>{c.hipaaMapping}</code></td>
                          <td>{c.hasVerifiedEvidence ? '✅ Verified' : '⏳ Pending'}</td>
                          <td>
                            <button
                              className="cyber-studio-btn-danger-sm"
                              onClick={() => handleDeleteControl(c.id)}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'tabletop-simulator' && (
              <section className="cyber-studio-section" data-testid="tabletop-section">
                <div className="cyber-studio-dist-panel">
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Ransomware Resilience Index (RRI)</span>
                    <strong className="kpi-value text-green" data-testid="tabletop-rri">
                      {overview.ransomwareResilienceIndex} / 100
                    </strong>
                    <span className="kpi-sub">Backup Air-Gap & PAM</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Insurability Readiness Score</span>
                    <strong className="kpi-value text-blue" data-testid="policy-irs">
                      {policy?.insurabilityReadinessScore} / 100
                    </strong>
                    <span className="kpi-sub">Carrier Underwriting Health</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">Primary Policy Aggregate Limit</span>
                    <strong className="kpi-value text-purple" data-testid="policy-limit">
                      ${((policy?.primaryAggregateLimitUsd || 0) / 1000000).toFixed(1)}M
                    </strong>
                    <span className="kpi-sub">Retention: ${(policy?.selfInsuredRetentionUsd || 0) / 1000}k</span>
                  </div>
                  <div className="cyber-studio-kpi-card">
                    <span className="kpi-label">VaR-95 Coverage Shortfall</span>
                    <strong className="kpi-value text-orange" data-testid="policy-shortfall">
                      ${((policy?.coverageShortfallUsd || 0) / 1000000).toFixed(2)}M
                    </strong>
                    <span className="kpi-sub">Uninsured Tail Exposure</span>
                  </div>
                </div>

                <div className="cyber-studio-toolbar">
                  <h3>Tabletop Incident Response Drills</h3>
                  <button
                    className="cyber-studio-btn-primary"
                    onClick={() => setShowAddSimModal(true)}
                    data-testid="btn-add-simulation"
                  >
                    + Run Simulation Drill
                  </button>
                </div>

                <div className="tabletop-sims-grid">
                  {overview.tabletopSimulations.map(sim => (
                    <div key={sim.id} className="sim-card" data-testid={`sim-card-${sim.id}`}>
                      <div className="sim-header">
                        <div>
                          <span className="archetype-tag">{sim.archetype.replace(/_/g, ' ').toUpperCase()}</span>
                          <h4>{sim.scenarioTitle}</h4>
                        </div>
                        <div className="sim-score-badge">
                          <span>RRI:</span>
                          <strong>{sim.ransomwareResilienceIndex}%</strong>
                        </div>
                      </div>

                      <div className="sim-metrics-row">
                        <div><strong>MTTD:</strong> {sim.meanTimeToDetectHours} hrs</div>
                        <div><strong>MTTC:</strong> {sim.meanTimeToContainHours} hrs</div>
                        <div><strong>Loss:</strong> ${(sim.simulatedTotalLossUsd / 1000000).toFixed(2)}M</div>
                        <div><strong>Drill Date:</strong> {sim.conductedDate}</div>
                      </div>

                      <div className="sim-subscores">
                        <div className="subscore-item">
                          <span>Immutable Backups:</span>
                          <strong>{sim.immutableBackupScore}%</strong>
                        </div>
                        <div className="subscore-item">
                          <span>Air-Gap Isolation:</span>
                          <strong>{sim.airgapIsolationScore}%</strong>
                        </div>
                        <div className="subscore-item">
                          <span>RTO/RPO Drill:</span>
                          <strong>{sim.rtoRpoDrillScore}%</strong>
                        </div>
                        <div className="subscore-item">
                          <span>PAM Segregation:</span>
                          <strong>{sim.pamSegregationScore}%</strong>
                        </div>
                      </div>

                      <div className="sim-findings small">
                        <strong>Key Findings:</strong>
                        <ul>
                          {sim.keyFindings.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>

                      <button
                        className="btn-link-danger small sim-delete"
                        onClick={() => handleDeleteSim(sim.id)}
                      >
                        Delete Drill
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'board-memorandum' && (
              <section className="cyber-studio-section" data-testid="board-memorandum-section">
                <div className="sign-off-panel">
                  <h4>Tripartite Executive Governance Sign-Off Matrix</h4>
                  <p className="text-muted small">
                    Mandatory digital authorization by Chief Information Security Officer (CISO), Chief Legal Officer (CLO), and Board Audit & Risk Committee Chair.
                  </p>
                  <div className="sign-offs-grid">
                    {memo?.signOffs.map(s => (
                      <div key={s.role} className={`sign-off-card ${s.isApproved ? 'approved' : 'pending'}`}>
                        <div className="sign-role">{s.roleLabel}</div>
                        <div className="sign-status">
                          {s.isApproved ? (
                            <>
                              <span className="approved-pill">✅ Approved & Signed</span>
                              <div className="small text-muted">Signed by: {s.signatoryName}</div>
                              <div className="small text-muted">{s.signedAt?.slice(0, 16)}</div>
                              <div className="small font-mono text-muted">{s.signatureHash?.slice(0, 16)}...</div>
                            </>
                          ) : (
                            <>
                              <span className="pending-pill">⏳ Pending Review</span>
                              <button
                                className="cyber-studio-btn-primary btn-sm"
                                onClick={() => {
                                  const name = s.role === 'chief_legal_officer' ? 'Elena Rostova, JD' : 'Sir Arthur Sterling';
                                  const title = s.role === 'chief_legal_officer' ? 'Chief Legal Officer' : 'Audit Committee Chair';
                                  void handleSignOff(s.role, name, title, 'Fiduciary review completed.');
                                }}
                                data-testid={`sign-off-${s.role.replace(/_/g, '-')}`}
                              >
                                Authorize & Sign
                              </button>
                            </>
                          )}
                        </div>
                        {s.attestationRemarks && (
                          <div className="sign-notes small italic">"{s.attestationRemarks}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sec-materiality-banner">
                  <div className="banner-icon">⚖️</div>
                  <div className="banner-content">
                    <h4>SEC Form 8-K Item 1.05 Materiality Determination Clock</h4>
                    <p>
                      Status: <strong>{memo?.secMateriality?.status?.replace(/_/g, ' ').toUpperCase()}</strong> |{' '}
                      Quantitative Ratio: {memo?.secMateriality?.quantitativeMaterialityRatio}x |{' '}
                      Qualitative Score: {memo?.secMateriality?.qualitativeScore} / 100
                    </p>
                    <div className="clock-indicator">
                      <span>Statutory 4-Day Clock Remaining:</span>
                      <strong className="clock-hours">{memo?.secMateriality?.disclosureClockRemainingHours} Hours</strong>
                    </div>
                  </div>
                </div>

                <div className="memo-preview-panel">
                  <div className="memo-header">
                    <h4>Board Audit & Risk Committee Cybersecurity Memorandum</h4>
                    <button
                      className="cyber-studio-btn-secondary"
                      onClick={handleCopyMemo}
                      data-testid="copy-board-memo"
                    >
                      {copySuccess ? '✓ Copied to Clipboard' : '📋 Copy Markdown'}
                    </button>
                  </div>
                  <pre className="markdown-preview" data-testid="markdown-content">
                    {memo?.memorandumMarkdown}
                  </pre>
                </div>
              </section>
            )}
          </main>
        )}

        {showAddScenarioModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Author FAIR Cyber Risk Scenario</h3>
              <form onSubmit={handleCreateScenario}>
                <label>
                  Scenario Title:
                  <input
                    type="text"
                    required
                    value={scenarioForm.title}
                    onChange={e => setScenarioForm({ ...scenarioForm, title: e.target.value })}
                  />
                </label>
                <label>
                  Category:
                  <select
                    value={scenarioForm.category}
                    onChange={e => setScenarioForm({ ...scenarioForm, category: e.target.value as CyberRiskCategory })}
                  >
                    <option value="ransomware_extortion">Ransomware Extortion</option>
                    <option value="cloud_infrastructure_compromise">Cloud Infrastructure Compromise</option>
                    <option value="third_party_supply_chain">Third-Party Supply Chain</option>
                    <option value="data_exfiltration_espionage">Data Exfiltration & Espionage</option>
                    <option value="insider_threat">Insider Threat</option>
                    <option value="credential_stuffing_account_takeover">Credential Stuffing</option>
                  </select>
                </label>
                <label>
                  Target Asset Name:
                  <input
                    type="text"
                    required
                    value={scenarioForm.assetName}
                    onChange={e => setScenarioForm({ ...scenarioForm, assetName: e.target.value })}
                  />
                </label>
                <label>
                  Threat Actor Profile:
                  <input
                    type="text"
                    required
                    value={scenarioForm.threatActor}
                    onChange={e => setScenarioForm({ ...scenarioForm, threatActor: e.target.value })}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Contact Frequency:
                    <input
                      type="number"
                      step="0.1"
                      value={scenarioForm.contactFrequency}
                      onChange={e => setScenarioForm({ ...scenarioForm, contactFrequency: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Probability of Action:
                    <input
                      type="number"
                      step="0.01"
                      value={scenarioForm.probabilityOfAction}
                      onChange={e => setScenarioForm({ ...scenarioForm, probabilityOfAction: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Threat Capability (1-100):
                    <input
                      type="number"
                      value={scenarioForm.threatCapability}
                      onChange={e => setScenarioForm({ ...scenarioForm, threatCapability: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Resistance Strength (1-100):
                    <input
                      type="number"
                      value={scenarioForm.resistanceStrength}
                      onChange={e => setScenarioForm({ ...scenarioForm, resistanceStrength: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="sub-modal-actions">
                  <button type="button" onClick={() => setShowAddScenarioModal(false)}>Cancel</button>
                  <button type="submit" className="cyber-studio-btn-primary">Save Scenario</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddVulnModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Ingest Threat Vulnerability (EPSS v3)</h3>
              <form onSubmit={handleCreateVuln}>
                <label>
                  CVE Identifier:
                  <input
                    type="text"
                    placeholder="CVE-2024-XXXX"
                    required
                    value={vulnForm.cveId}
                    onChange={e => setVulnForm({ ...vulnForm, cveId: e.target.value })}
                  />
                </label>
                <label>
                  Vulnerability Title:
                  <input
                    type="text"
                    required
                    value={vulnForm.title}
                    onChange={e => setVulnForm({ ...vulnForm, title: e.target.value })}
                  />
                </label>
                <div className="form-row">
                  <label>
                    CVSS Base Score (0-10):
                    <input
                      type="number"
                      step="0.1"
                      value={vulnForm.cvssScore}
                      onChange={e => setVulnForm({ ...vulnForm, cvssScore: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    EPSS Probability (0-1):
                    <input
                      type="number"
                      step="0.01"
                      value={vulnForm.epssProbability}
                      onChange={e => setVulnForm({ ...vulnForm, epssProbability: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={vulnForm.cisaKevStatus}
                    onChange={e => setVulnForm({ ...vulnForm, cisaKevStatus: e.target.checked })}
                  />
                  Active in CISA Known Exploited Vulnerabilities (KEV) Catalog
                </label>
                <label>
                  Affected Asset:
                  <input
                    type="text"
                    required
                    value={vulnForm.affectedAsset}
                    onChange={e => setVulnForm({ ...vulnForm, affectedAsset: e.target.value })}
                  />
                </label>
                <label>
                  Component / Version:
                  <input
                    type="text"
                    required
                    value={vulnForm.component}
                    onChange={e => setVulnForm({ ...vulnForm, component: e.target.value })}
                  />
                </label>
                <div className="sub-modal-actions">
                  <button type="button" onClick={() => setShowAddVulnModal(false)}>Cancel</button>
                  <button type="submit" className="cyber-studio-btn-primary">Ingest Vulnerability</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddExposureModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Track Dark Web Credential Leak</h3>
              <form onSubmit={handleCreateExposure}>
                <label>
                  Corporate Domain:
                  <input
                    type="text"
                    required
                    value={exposureForm.targetDomain}
                    onChange={e => setExposureForm({ ...exposureForm, targetDomain: e.target.value })}
                  />
                </label>
                <label>
                  Leaked Email:
                  <input
                    type="email"
                    required
                    value={exposureForm.leakedEmail}
                    onChange={e => setExposureForm({ ...exposureForm, leakedEmail: e.target.value })}
                  />
                </label>
                <label>
                  Breach Source / Infostealer Dump:
                  <input
                    type="text"
                    required
                    value={exposureForm.breachSource}
                    onChange={e => setExposureForm({ ...exposureForm, breachSource: e.target.value })}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exposureForm.isVipExecutive}
                    onChange={e => setExposureForm({ ...exposureForm, isVipExecutive: e.target.checked })}
                  />
                  VIP Executive Account (C-Suite / Board)
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exposureForm.hasSessionToken}
                    onChange={e => setExposureForm({ ...exposureForm, hasSessionToken: e.target.checked })}
                  />
                  Compromised Session Token (Session Hijack)
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={exposureForm.hasPlaintextPassword}
                    onChange={e => setExposureForm({ ...exposureForm, hasPlaintextPassword: e.target.checked })}
                  />
                  Plaintext Password Exposed
                </label>
                <div className="sub-modal-actions">
                  <button type="button" onClick={() => setShowAddExposureModal(false)}>Cancel</button>
                  <button type="submit" className="cyber-studio-btn-primary">Save Exposure</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddControlModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Add Compliance Control</h3>
              <form onSubmit={handleCreateControl}>
                <label>
                  NIST CSF 2.0 Function:
                  <select
                    value={controlForm.functionCode}
                    onChange={e => setControlForm({ ...controlForm, functionCode: e.target.value as NistCsfFunction })}
                  >
                    <option value="govern">Govern (GV)</option>
                    <option value="identify">Identify (ID)</option>
                    <option value="protect">Protect (PR)</option>
                    <option value="detect">Detect (DE)</option>
                    <option value="respond">Respond (RS)</option>
                    <option value="recover">Recover (RC)</option>
                  </select>
                </label>
                <label>
                  Subcategory Code (e.g. GV.OC-02):
                  <input
                    type="text"
                    required
                    value={controlForm.subcategoryCode}
                    onChange={e => setControlForm({ ...controlForm, subcategoryCode: e.target.value })}
                  />
                </label>
                <label>
                  Control Title:
                  <input
                    type="text"
                    required
                    value={controlForm.title}
                    onChange={e => setControlForm({ ...controlForm, title: e.target.value })}
                  />
                </label>
                <label>
                  Description:
                  <textarea
                    required
                    value={controlForm.description}
                    onChange={e => setControlForm({ ...controlForm, description: e.target.value })}
                  />
                </label>
                <div className="sub-modal-actions">
                  <button type="button" onClick={() => setShowAddControlModal(false)}>Cancel</button>
                  <button type="submit" className="cyber-studio-btn-primary">Add Control</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddSimModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Execute Tabletop Breach Drill</h3>
              <form onSubmit={handleCreateSim}>
                <label>
                  Breach Archetype:
                  <select
                    value={simForm.archetype}
                    onChange={e => setSimForm({ ...simForm, archetype: e.target.value as TabletopBreachArchetype })}
                  >
                    <option value="ransomware_double_extortion">Ransomware Double-Extortion</option>
                    <option value="supply_chain_poisoning">Software Supply Chain Poisoning</option>
                    <option value="cloud_iam_privilege_escalation">Cloud IAM Privilege Escalation</option>
                  </select>
                </label>
                <label>
                  Simulation Scenario Title:
                  <input
                    type="text"
                    required
                    value={simForm.scenarioTitle}
                    onChange={e => setSimForm({ ...simForm, scenarioTitle: e.target.value })}
                  />
                </label>
                <div className="form-row">
                  <label>
                    Mean Time to Detect (hrs):
                    <input
                      type="number"
                      step="0.1"
                      value={simForm.meanTimeToDetectHours}
                      onChange={e => setSimForm({ ...simForm, meanTimeToDetectHours: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Mean Time to Contain (hrs):
                    <input
                      type="number"
                      step="0.1"
                      value={simForm.meanTimeToContainHours}
                      onChange={e => setSimForm({ ...simForm, meanTimeToContainHours: Number(e.target.value) })}
                    />
                  </label>
                </div>
                <div className="sub-modal-actions">
                  <button type="button" onClick={() => setShowAddSimModal(false)}>Cancel</button>
                  <button type="submit" className="cyber-studio-btn-primary">Record Drill</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
