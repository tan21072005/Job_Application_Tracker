import React, { useState, useEffect, useMemo } from 'react';
import {
  type SuccessionStudioOverviewDTO,
  type TalentProfileDTO,
  type TalentProfileMutationDTO,
  type CriticalRoleDTO,
  type RetentionInterventionDTO,
  type RetentionInterventionMutationDTO,
  type ExecutiveDevelopmentPlanDTO,
  type SuccessorCandidateMutationDTO,
  type NineBoxClassification,
  type SignOffExecutiveRole,
  type ReadinessHorizon,
  type InterventionStatus,
  type InterventionPlaybookType,
  classifyNineBox
} from '../domain';
import { successionPipelineStudioRepository } from '../data';

interface SuccessionPipelineStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SuccessionPipelineStudioModal: React.FC<SuccessionPipelineStudioModalProps> = ({
  isOpen,
  onClose
}) => {
  const [overview, setOverview] = useState<SuccessionStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'nine-box' | 'key-person' | 'bench-depth' | 'competencies' | 'board-memo'>('nine-box');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [showAddProfileModal, setShowAddProfileModal] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState<TalentProfileMutationDTO>({
    employeeId: '',
    fullName: '',
    currentRole: '',
    department: 'Engineering',
    tenureYears: 2.0,
    yearsInCurrentRole: 1.5,
    performanceLevel: 3,
    potentialLevel: 3,
    totalDirectCompensationUsd: 380000,
    marketBenchmarkP75Usd: 360000,
    unvestedEquityValueUsd: 600000,
    monthsToEquityCliff: 14,
    organizationalChangeImpact: 0.2,
    spofSeverity: 4,
    operationalCriticality: 4,
    replacementDifficulty: 4,
    underrepresentedLeader: false
  });

  const [showAddInterventionModal, setShowAddInterventionModal] = useState<boolean>(false);
  const [interventionForm, setInterventionForm] = useState<RetentionInterventionMutationDTO>({
    talentProfileId: '',
    playbookType: 'retention_equity_refresh',
    title: '',
    description: '',
    proposedCostUsd: 100000,
    status: 'proposed',
    triggerRationale: '',
    targetCompletionDate: '2026-12-31'
  });

  const [showNominateSuccessorModal, setShowNominateSuccessorModal] = useState<boolean>(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [successorForm, setSuccessorForm] = useState<SuccessorCandidateMutationDTO>({
    criticalRoleId: '',
    talentProfileId: '',
    readinessHorizon: 'ready_1_2_years',
    rankingOrder: 1,
    notes: ''
  });

  const [signOffComments, setSignOffComments] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    loadData();
  }, [isOpen]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await successionPipelineStudioRepository.getOverview();
      setOverview(data);
      if (data.talentProfiles.length > 0 && !interventionForm.talentProfileId) {
        setInterventionForm(prev => ({ ...prev, talentProfileId: data.talentProfiles[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTalent = useMemo(() => {
    if (!overview) return [];
    return overview.talentProfiles.filter(p => {
      const matchesFilter = filterClassification === 'all' || p.nineBoxClassification === filterClassification;
      const matchesSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.currentRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [overview, filterClassification, searchQuery]);

  async function handleAddProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profileForm.fullName || !profileForm.employeeId || !profileForm.currentRole) return;
    try {
      await successionPipelineStudioRepository.createTalentProfile(profileForm);
      setShowAddProfileModal(false);
      setProfileForm({
        employeeId: '',
        fullName: '',
        currentRole: '',
        department: 'Engineering',
        tenureYears: 2.0,
        yearsInCurrentRole: 1.5,
        performanceLevel: 3,
        potentialLevel: 3,
        totalDirectCompensationUsd: 380000,
        marketBenchmarkP75Usd: 360000,
        unvestedEquityValueUsd: 600000,
        monthsToEquityCliff: 14,
        organizationalChangeImpact: 0.2,
        spofSeverity: 4,
        operationalCriticality: 4,
        replacementDifficulty: 4,
        underrepresentedLeader: false
      });
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleCreateIntervention(e: React.FormEvent) {
    e.preventDefault();
    if (!interventionForm.talentProfileId || !interventionForm.title) return;
    try {
      await successionPipelineStudioRepository.createIntervention(interventionForm);
      setShowAddInterventionModal(false);
      setInterventionForm({
        talentProfileId: overview?.talentProfiles[0]?.id || '',
        playbookType: 'retention_equity_refresh',
        title: '',
        description: '',
        proposedCostUsd: 100000,
        status: 'proposed',
        triggerRationale: '',
        targetCompletionDate: '2026-12-31'
      });
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleApproveIntervention(id: string) {
    try {
      await successionPipelineStudioRepository.updateInterventionStatus(
        id,
        'approved',
        'Chief People Officer'
      );
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleNominateSuccessor(e: React.FormEvent) {
    e.preventDefault();
    if (!successorForm.criticalRoleId || !successorForm.talentProfileId) return;
    try {
      await successionPipelineStudioRepository.addSuccessor(successorForm);
      setShowNominateSuccessorModal(false);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleRemoveSuccessor(id: string) {
    try {
      await successionPipelineStudioRepository.removeSuccessor(id);
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function handleSignOff(role: SignOffExecutiveRole) {
    if (!overview) return;
    try {
      await successionPipelineStudioRepository.signOffPlan(
        overview.plan.id,
        role,
        signOffComments || undefined
      );
      setSignOffComments('');
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function handleCopyMemo() {
    if (!overview?.plan?.boardMemorandumMarkdown) return;
    navigator.clipboard.writeText(overview.plan.boardMemorandumMarkdown);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }

  if (!isOpen) return null;

  const plan = overview?.plan;
  const dist = overview?.calibrationDistribution;
  const bench = overview?.benchDepth;

  const nineBoxMatrix: Array<{
    perf: 1 | 2 | 3;
    pot: 1 | 2 | 3;
    title: string;
    classification: NineBoxClassification;
    tag: string;
  }> = [
    { perf: 1, pot: 3, title: 'Enigma / Rough Diamond', classification: 'enigma_rough_diamond', tag: '💎 High Growth' },
    { perf: 2, pot: 3, title: 'High Potential', classification: 'high_potential', tag: '🚀 Fast Track' },
    { perf: 3, pot: 3, title: 'Star Leader', classification: 'star', tag: '⭐ Enterprise Star' },
    { perf: 1, pot: 2, title: 'Dilemma', classification: 'dilemma', tag: '⚠️ Action Required' },
    { perf: 2, pot: 2, title: 'Core Player', classification: 'core_player', tag: '🛡️ Solid Core' },
    { perf: 3, pot: 2, title: 'High Performer', classification: 'high_performer', tag: '🏆 High Delivery' },
    { perf: 1, pot: 1, title: 'Underperformer / Risk', classification: 'underperformer_risk', tag: '🛑 High Risk' },
    { perf: 2, pot: 1, title: 'Effective', classification: 'effective', tag: '📋 Retain & Coach' },
    { perf: 3, pot: 1, title: 'Solid Professional', classification: 'solid_professional', tag: '🏛️ Subject Expert' }
  ];

  return (
    <div className="jobtrack-modal-overlay" data-testid="succession-pipeline-studio-modal">
      <div className="jobtrack-modal-container succession-studio-container">
        <header className="succession-studio-header">
          <div className="succession-studio-title-group">
            <div className="succession-studio-title-badge">
              <span className="succession-studio-icon">🏛️</span>
              <span className="succession-studio-category">EXECUTIVE WORKFORCE & GOVERNANCE</span>
            </div>
            <h2>Enterprise Succession Planning & 9-Box Command Studio</h2>
            <p>Fiduciary leadership continuity, key person risk mitigation & Board Nominations memorandum</p>
          </div>

          <div className="succession-studio-header-actions">
            {plan && (
              <div className="succession-studio-shs-badge" data-testid="health-score-badge">
                <span className="succession-studio-shs-label">Succession Health</span>
                <strong className="succession-studio-shs-score">{plan.successionHealthScore} / 100</strong>
                <span className={`succession-studio-tier-pill tier-${plan.governanceHealthTier}`}>
                  {plan.governanceHealthTier.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>
            )}
            <button
              className="jobtrack-modal-close succession-studio-close"
              onClick={onClose}
              data-testid="close-succession-pipeline-studio"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <nav className="succession-studio-tabs">
          <button
            className={`succession-studio-tab ${activeTab === 'nine-box' ? 'active' : ''}`}
            onClick={() => setActiveTab('nine-box')}
            data-testid="tab-nine-box"
          >
            🎯 9-Box Calibration Grid
          </button>
          <button
            className={`succession-studio-tab ${activeTab === 'key-person' ? 'active' : ''}`}
            onClick={() => setActiveTab('key-person')}
            data-testid="tab-key-person"
          >
            ⚡ Key Person & Flight Risk
          </button>
          <button
            className={`succession-studio-tab ${activeTab === 'bench-depth' ? 'active' : ''}`}
            onClick={() => setActiveTab('bench-depth')}
            data-testid="tab-bench-depth"
          >
            🏛️ Succession Bench Depth
          </button>
          <button
            className={`succession-studio-tab ${activeTab === 'competencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('competencies')}
            data-testid="tab-competencies"
          >
            📊 Competencies & 180-Day Plans
          </button>
          <button
            className={`succession-studio-tab ${activeTab === 'board-memo' ? 'active' : ''}`}
            onClick={() => setActiveTab('board-memo')}
            data-testid="tab-board-memo"
          >
            📑 Board Nominations Memo
          </button>
        </nav>

        {loading ? (
          <div className="succession-studio-loading">
            <span className="succession-studio-spinner">⏳</span>
            <p>Loading enterprise succession telemetry and calibration matrices...</p>
          </div>
        ) : !overview ? (
          <div className="succession-studio-error">Failed to load succession planning data.</div>
        ) : (
          <main className="succession-studio-body">
            {activeTab === 'nine-box' && (
              <section className="succession-studio-section" data-testid="nine-box-section">
                <div className="succession-studio-dist-panel">
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Top Tier (Stars)</span>
                    <strong className="kpi-value text-gold">{dist?.starsCount} ({dist?.starsPercentage}%)</strong>
                    <span className="kpi-sub">Target Healthy: 10.0%</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Core & Growth Tier</span>
                    <strong className="kpi-value text-blue">{dist?.coreGrowthCount} ({dist?.coreGrowthPercentage}%)</strong>
                    <span className="kpi-sub">Target Healthy: 70.0%</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Action & Risk Tier</span>
                    <strong className="kpi-value text-orange">{dist?.actionRiskCount} ({dist?.actionRiskPercentage}%)</strong>
                    <span className="kpi-sub">Target Healthy: 20.0%</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Calibration Health Score</span>
                    <strong className="kpi-value text-green">{dist?.calibrationHealthScore} / 100</strong>
                    <span className="kpi-sub">Divergence: {dist?.distributionDivergenceIndex}%</span>
                  </div>
                </div>

                <div className="succession-studio-grid-container">
                  <div className="succession-studio-grid-y-axis">
                    <span>HIGH POTENTIAL</span>
                    <span>MED POTENTIAL</span>
                    <span>LOW POTENTIAL</span>
                  </div>
                  <div className="succession-studio-grid-9box">
                    {nineBoxMatrix.map(cell => {
                      const count = dist?.cellCounts[cell.classification] || 0;
                      const isSelected = filterClassification === cell.classification;
                      return (
                        <div
                          key={cell.classification}
                          className={`succession-studio-cell cell-${cell.classification} ${isSelected ? 'selected' : ''}`}
                          onClick={() =>
                            setFilterClassification(prev => (prev === cell.classification ? 'all' : cell.classification))
                          }
                          data-testid={`nine-box-cell-${cell.classification}`}
                        >
                          <div className="cell-header">
                            <span className="cell-tag">{cell.tag}</span>
                            <span className="cell-count-pill">{count}</span>
                          </div>
                          <div className="cell-title">{cell.title}</div>
                          <div className="cell-meta">Perf: {cell.perf} | Pot: {cell.pot}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="succession-studio-grid-x-axis">
                  <span>LOW PERFORMANCE</span>
                  <span>MED PERFORMANCE</span>
                  <span>HIGH PERFORMANCE</span>
                </div>

                <div className="succession-studio-roster-controls">
                  <div className="roster-filters">
                    <input
                      type="text"
                      placeholder="Search leader by name, title, or department..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="succession-studio-search"
                      data-testid="search-talent-roster"
                    />
                    <select
                      value={filterClassification}
                      onChange={e => setFilterClassification(e.target.value)}
                      className="succession-studio-select"
                      data-testid="filter-talent-classification"
                    >
                      <option value="all">All 9-Box Classifications ({overview.talentProfiles.length})</option>
                      <option value="star">Star Leaders</option>
                      <option value="high_potential">High Potential</option>
                      <option value="high_performer">High Performer</option>
                      <option value="core_player">Core Players</option>
                      <option value="solid_professional">Solid Professionals</option>
                      <option value="effective">Effective</option>
                      <option value="enigma_rough_diamond">Enigma / Rough Diamond</option>
                      <option value="dilemma">Dilemma</option>
                      <option value="underperformer_risk">Underperformer / Risk</option>
                    </select>
                  </div>
                  <button
                    className="succession-studio-btn-primary"
                    onClick={() => setShowAddProfileModal(true)}
                    data-testid="add-talent-profile-btn"
                  >
                    + Add Executive Profile
                  </button>
                </div>

                <div className="succession-studio-table-wrapper">
                  <table className="succession-studio-table">
                    <thead>
                      <tr>
                        <th>Executive Leader</th>
                        <th>Role & Department</th>
                        <th>Tenure / In Role</th>
                        <th>9-Box Calibration</th>
                        <th>Score</th>
                        <th>Compensation (vs P75)</th>
                        <th>Flight Risk</th>
                        <th>Key Person Index</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTalent.map(p => (
                        <tr key={p.id} data-testid={`talent-row-${p.employeeId}`}>
                          <td>
                            <strong>{p.fullName}</strong>
                            {p.underrepresentedLeader && <span className="diversity-badge">Diversity Leader</span>}
                            <div className="text-muted small">{p.employeeId}</div>
                          </td>
                          <td>
                            <div>{p.currentRole}</div>
                            <div className="text-muted small">{p.department}</div>
                          </td>
                          <td>
                            {p.tenureYears} yrs total
                            <div className="text-muted small">{p.yearsInCurrentRole} yrs in role</div>
                          </td>
                          <td>
                            <span className={`classification-pill class-${p.nineBoxClassification}`}>
                              {p.nineBoxClassification.toUpperCase().replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td><strong>{p.nineBoxCalibrationScore}</strong></td>
                          <td>
                            ${(p.totalDirectCompensationUsd / 1000).toFixed(0)}k
                            <span className="text-muted small"> ({p.compaRatio}x P75)</span>
                          </td>
                          <td>
                            <span className={`risk-pill risk-${p.flightRiskLevel}`}>
                              {p.flightRiskScore}% ({p.flightRiskLevel.toUpperCase()})
                            </span>
                          </td>
                          <td>
                            <span className={`kpri-pill kpri-${p.keyPersonRiskTier}`}>
                              {p.keyPersonRiskIndex} / 100
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'key-person' && (
              <section className="succession-studio-section" data-testid="key-person-section">
                <div className="succession-studio-banner">
                  <div className="banner-icon">⚡</div>
                  <div className="banner-content">
                    <h3>Key Person Single Point of Failure (SPOF) & Predictive Retention Engine</h3>
                    <p>
                      Continuously models executive flight risk, unvested equity cliff proximity, and operational criticality.
                      Triggers automated board retention packages to protect institutional stability.
                    </p>
                  </div>
                  <button
                    className="succession-studio-btn-primary"
                    onClick={() => setShowAddInterventionModal(true)}
                    data-testid="create-intervention-btn"
                  >
                    + Formulate Retention Package
                  </button>
                </div>

                <div className="succession-studio-grid-2col">
                  <div className="succession-studio-card">
                    <h4>High-Vulnerability Executive Leaders (KPRI &gt; 60)</h4>
                    <div className="succession-studio-leader-list">
                      {overview.talentProfiles
                        .filter(p => p.keyPersonRiskIndex >= 60)
                        .sort((a, b) => b.keyPersonRiskIndex - a.keyPersonRiskIndex)
                        .map(p => (
                          <div key={p.id} className="leader-kpri-item" data-testid={`kpri-item-${p.employeeId}`}>
                            <div className="leader-info">
                              <strong>{p.fullName}</strong>
                              <span className="text-muted"> - {p.currentRole}</span>
                              <div className="leader-drivers small">
                                <span>SPOF Severity: {p.spofSeverity}/5</span> |{' '}
                                <span>Criticality: {p.operationalCriticality}/5</span> |{' '}
                                <span>Equity Cliff: {p.monthsToEquityCliff} mos</span>
                              </div>
                            </div>
                            <div className="leader-badges">
                              <span className={`kpri-pill kpri-${p.keyPersonRiskTier}`}>
                                KPRI: {p.keyPersonRiskIndex}
                              </span>
                              <span className={`risk-pill risk-${p.flightRiskLevel}`}>
                                Flight: {p.flightRiskScore}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="succession-studio-card">
                    <h4>Active Retention Interventions & Playbooks</h4>
                    <div className="succession-studio-interventions-list">
                      {overview.interventions.map(i => (
                        <div key={i.id} className="intervention-item" data-testid={`intervention-item-${i.id}`}>
                          <div className="intervention-header">
                            <span className={`status-pill status-${i.status}`}>{i.status.toUpperCase()}</span>
                            <strong>{i.title}</strong>
                            <span className="cost-tag">${(i.proposedCostUsd / 1000).toFixed(0)}k</span>
                          </div>
                          <p className="intervention-desc">{i.description}</p>
                          <div className="intervention-meta small text-muted">
                            <span>Candidate: {i.talentName} ({i.talentRole})</span> |{' '}
                            <span>Target Date: {i.targetCompletionDate}</span>
                          </div>
                          {i.status === 'proposed' && (
                            <button
                              className="succession-studio-btn-sm"
                              onClick={() => handleApproveIntervention(i.id)}
                              data-testid={`approve-intervention-${i.id}`}
                            >
                              ✓ Approve Intervention
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'bench-depth' && (
              <section className="succession-studio-section" data-testid="bench-depth-section">
                <div className="succession-studio-dist-panel">
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Bench Depth Ratio (BDR)</span>
                    <strong className={`kpi-value ${bench?.isBenchHealthy ? 'text-green' : 'text-orange'}`}>
                      {bench?.benchDepthRatio}x
                    </strong>
                    <span className="kpi-sub">Target Healthy: &ge; 2.0x</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Emergency Vacancy Exposure (EVI)</span>
                    <strong className={`kpi-value ${bench && bench.emergencyVulnerabilityIndex <= 20 ? 'text-green' : 'text-red'}`}>
                      {bench?.emergencyVulnerabilityIndex}%
                    </strong>
                    <span className="kpi-sub">{bench?.emergencyVulnerableRoleCount} roles without Ready Now</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Succession Diversity Index (SDI)</span>
                    <strong className="kpi-value text-blue">{bench?.successionDiversityIndex}%</strong>
                    <span className="kpi-sub">Target Diversity: &ge; 35.0%</span>
                  </div>
                  <div className="succession-studio-kpi-card">
                    <span className="kpi-label">Total Successors Cataloged</span>
                    <strong className="kpi-value text-purple">{bench?.totalSuccessorsIdentified}</strong>
                    <span className="kpi-sub">Across {bench?.totalCriticalRoles} Critical Roles</span>
                  </div>
                </div>

                <div className="succession-studio-roles-list">
                  {overview.plan.criticalRoles.map(role => (
                    <div key={role.id} className="critical-role-card" data-testid={`critical-role-${role.id}`}>
                      <div className="role-header">
                        <div>
                          <h3>{role.title}</h3>
                          <div className="role-sub text-muted">
                            Department: {role.department} | Incumbent:{' '}
                            <strong>{role.currentIncumbentName || 'Open Search'}</strong>
                          </div>
                        </div>
                        <div className="role-badges">
                          <span className={`vuln-badge ${role.isEmergencyVulnerable ? 'vuln' : 'secure'}`}>
                            {role.isEmergencyVulnerable ? '🚨 VULNERABLE (0 Ready Now)' : '✅ SECURE'}
                          </span>
                          <button
                            className="succession-studio-btn-sm"
                            onClick={() => {
                              setSelectedRoleId(role.id);
                              setSuccessorForm(prev => ({
                                ...prev,
                                criticalRoleId: role.id,
                                talentProfileId: overview.talentProfiles[0]?.id || ''
                              }));
                              setShowNominateSuccessorModal(true);
                            }}
                            data-testid={`nominate-successor-${role.id}`}
                          >
                            + Nominate Successor
                          </button>
                        </div>
                      </div>

                      <div className="role-successors-grid">
                        <div className="horizon-column">
                          <h5>Ready Now (0-6 Months)</h5>
                          {role.successors.filter(s => s.readinessHorizon === 'ready_now').length === 0 ? (
                            <div className="empty-horizon">No immediate successor</div>
                          ) : (
                            role.successors
                              .filter(s => s.readinessHorizon === 'ready_now')
                              .map(s => (
                                <div key={s.id} className="successor-pill ready-now">
                                  <strong>{s.candidateName}</strong>
                                  <div className="small text-muted">{s.currentRole}</div>
                                  <div className="small">Coverage: {s.competencyCoverageIndex}%</div>
                                  <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveSuccessor(s.id)}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                          )}
                        </div>

                        <div className="horizon-column">
                          <h5>Ready in 1-2 Years</h5>
                          {role.successors.filter(s => s.readinessHorizon === 'ready_1_2_years').length === 0 ? (
                            <div className="empty-horizon">No pipeline candidate</div>
                          ) : (
                            role.successors
                              .filter(s => s.readinessHorizon === 'ready_1_2_years')
                              .map(s => (
                                <div key={s.id} className="successor-pill ready-future">
                                  <strong>{s.candidateName}</strong>
                                  <div className="small text-muted">{s.currentRole}</div>
                                  <div className="small">Coverage: {s.competencyCoverageIndex}%</div>
                                  <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveSuccessor(s.id)}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                          )}
                        </div>

                        <div className="horizon-column">
                          <h5>Emergency Interim Backup</h5>
                          {role.successors.filter(s => s.readinessHorizon === 'emergency_interim').length === 0 ? (
                            <div className="empty-horizon">No interim backup</div>
                          ) : (
                            role.successors
                              .filter(s => s.readinessHorizon === 'emergency_interim')
                              .map(s => (
                                <div key={s.id} className="successor-pill emergency-backup">
                                  <strong>{s.candidateName}</strong>
                                  <div className="small text-muted">{s.currentRole}</div>
                                  <div className="small">Coverage: {s.competencyCoverageIndex}%</div>
                                  <button
                                    className="remove-btn"
                                    onClick={() => handleRemoveSuccessor(s.id)}
                                    title="Remove"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === 'competencies' && (
              <section className="succession-studio-section" data-testid="competencies-section">
                {overview.developmentPlans.length === 0 ? (
                  <div className="empty-state">No executive development plans authored yet.</div>
                ) : (
                  overview.developmentPlans.map(planRecord => (
                    <div key={planRecord.id} className="dev-plan-container" data-testid={`dev-plan-${planRecord.id}`}>
                      <div className="dev-plan-header">
                        <div>
                          <h3>{planRecord.talentName} &rarr; {planRecord.targetRoleTitle}</h3>
                          <span className="text-muted">Executive Sponsor: {planRecord.executiveSponsorName}</span>
                        </div>
                        <div className="dev-plan-badge">
                          <span>Coverage Index:</span>
                          <strong>{planRecord.competencyCoverageIndex}%</strong>
                        </div>
                      </div>

                      <div className="succession-studio-grid-2col">
                        <div className="competency-radar-bars">
                          <h4>5-Axis Leadership Competency Gaps</h4>
                          {planRecord.competencyScores.map(score => (
                            <div key={score.domain} className="radar-bar-item">
                              <div className="bar-labels">
                                <span>{score.domainLabel}</span>
                                <span>
                                  {score.currentScore.toFixed(1)} / {score.targetScore.toFixed(1)}{' '}
                                  {score.gap > 0 && <span className="gap-tag">(&Delta; -{score.gap.toFixed(1)})</span>}
                                </span>
                              </div>
                              <div className="bar-track">
                                <div
                                  className="bar-fill-target"
                                  style={{ width: `${(score.targetScore / 5.0) * 100}%` }}
                                />
                                <div
                                  className="bar-fill-current"
                                  style={{ width: `${(score.currentScore / 5.0) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="milestones-timeline">
                          <h4>180-Day Executive Acceleration Milestones</h4>
                          <div className="timeline-items">
                            {planRecord.milestones.map(ms => (
                              <div
                                key={ms.id}
                                className={`milestone-card ${ms.completed ? 'completed' : 'pending'}`}
                                data-testid={`milestone-${ms.dayHorizon}`}
                              >
                                <div className="ms-header">
                                  <span className="ms-badge">Day {ms.dayHorizon}</span>
                                  <strong>{ms.phaseTitle}</strong>
                                  <span className="ms-status">{ms.completed ? '✅ Completed' : '⏳ In Progress'}</span>
                                </div>
                                <div className="ms-deliverable">
                                  <strong>Deliverable:</strong> {ms.deliverable}
                                </div>
                                <div className="ms-mentor small text-muted">
                                  Sponsor: {ms.mentorOrSponsor}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </section>
            )}

            {activeTab === 'board-memo' && (
              <section className="succession-studio-section" data-testid="board-memo-section">
                <div className="sign-off-panel">
                  <h4>Tripartite Executive Governance Sign-Off Matrix</h4>
                  <p className="text-muted small">
                    Mandatory digital authorization by VP Talent Management, Chief People Officer, and CEO prior to Board presentation.
                  </p>
                  <div className="sign-offs-grid">
                    {plan?.signOffs.map(s => (
                      <div key={s.role} className={`sign-off-card ${s.isApproved ? 'approved' : 'pending'}`}>
                        <div className="sign-role">{s.roleLabel}</div>
                        <div className="sign-status">
                          {s.isApproved ? (
                            <>
                              <span className="approved-pill">✅ Approved & Signed</span>
                              <div className="small text-muted">Signed by: {s.signedByUserName}</div>
                              <div className="small text-muted">{s.signedAt}</div>
                              <div className="small font-mono text-muted">{s.digitalSignatureHash?.slice(0, 16)}...</div>
                            </>
                          ) : (
                            <>
                              <span className="pending-pill">⏳ Pending Review</span>
                              <button
                                className="succession-studio-btn-primary btn-sm"
                                onClick={() => handleSignOff(s.role)}
                                data-testid={`sign-off-${s.role.replace(/_/g, '-')}`}
                              >
                                Authorize & Sign
                              </button>
                            </>
                          )}
                        </div>
                        {s.governanceComments && (
                          <div className="sign-notes small italic">"{s.governanceComments}"</div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="sign-off-inputs">
                    <input
                      type="text"
                      placeholder="Add executive governance commentary or fiduciary notes..."
                      value={signOffComments}
                      onChange={e => setSignOffComments(e.target.value)}
                      className="succession-studio-input"
                    />
                  </div>
                </div>

                <div className="memo-preview-panel">
                  <div className="memo-header">
                    <h4>Board of Directors Succession & Leadership Continuity Memorandum</h4>
                    <button
                      className="succession-studio-btn-secondary"
                      onClick={handleCopyMemo}
                      data-testid="copy-board-memo"
                    >
                      {copySuccess ? '✓ Copied to Clipboard' : '📋 Copy Markdown'}
                    </button>
                  </div>
                  <pre className="markdown-preview" data-testid="markdown-content">
                    {plan?.boardMemorandumMarkdown}
                  </pre>
                </div>
              </section>
            )}
          </main>
        )}

        {showAddProfileModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Add Executive Talent Profile</h3>
              <form onSubmit={handleAddProfile}>
                <div className="form-row">
                  <label>
                    Employee ID:
                    <input
                      type="text"
                      required
                      value={profileForm.employeeId}
                      onChange={e => setProfileForm({ ...profileForm, employeeId: e.target.value })}
                      placeholder="EXEC-009"
                    />
                  </label>
                  <label>
                    Full Name:
                    <input
                      type="text"
                      required
                      value={profileForm.fullName}
                      onChange={e => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      placeholder="Dr. Vikram Joshi"
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Current Role:
                    <input
                      type="text"
                      required
                      value={profileForm.currentRole}
                      onChange={e => setProfileForm({ ...profileForm, currentRole: e.target.value })}
                      placeholder="VP of AI Research"
                    />
                  </label>
                  <label>
                    Department:
                    <input
                      type="text"
                      required
                      value={profileForm.department}
                      onChange={e => setProfileForm({ ...profileForm, department: e.target.value })}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Performance Level (1-3):
                    <select
                      value={profileForm.performanceLevel}
                      onChange={e =>
                        setProfileForm({ ...profileForm, performanceLevel: Number(e.target.value) as 1 | 2 | 3 })
                      }
                    >
                      <option value={1}>1 - Low Performance</option>
                      <option value={2}>2 - Medium Performance</option>
                      <option value={3}>3 - High Performance</option>
                    </select>
                  </label>
                  <label>
                    Potential Level (1-3):
                    <select
                      value={profileForm.potentialLevel}
                      onChange={e =>
                        setProfileForm({ ...profileForm, potentialLevel: Number(e.target.value) as 1 | 2 | 3 })
                      }
                    >
                      <option value={1}>1 - Low Potential</option>
                      <option value={2}>2 - Medium Potential</option>
                      <option value={3}>3 - High Potential</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label>
                    Total Compensation ($):
                    <input
                      type="number"
                      value={profileForm.totalDirectCompensationUsd}
                      onChange={e =>
                        setProfileForm({ ...profileForm, totalDirectCompensationUsd: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Market P75 ($):
                    <input
                      type="number"
                      value={profileForm.marketBenchmarkP75Usd}
                      onChange={e =>
                        setProfileForm({ ...profileForm, marketBenchmarkP75Usd: Number(e.target.value) })
                      }
                    />
                  </label>
                </div>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddProfileModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="succession-studio-btn-primary">
                    Save Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddInterventionModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Formulate Retention Package</h3>
              <form onSubmit={handleCreateIntervention}>
                <label>
                  Target Executive:
                  <select
                    value={interventionForm.talentProfileId}
                    onChange={e => setInterventionForm({ ...interventionForm, talentProfileId: e.target.value })}
                  >
                    {overview?.talentProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.currentRole})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Playbook Strategy:
                  <select
                    value={interventionForm.playbookType}
                    onChange={e =>
                      setInterventionForm({
                        ...interventionForm,
                        playbookType: e.target.value as InterventionPlaybookType
                      })
                    }
                  >
                    <option value="retention_equity_refresh">Retention Equity Refresh Grant</option>
                    <option value="role_expansion_promotion">Executive Scope Expansion & Promotion</option>
                    <option value="executive_mentoring_coaching">External C-Level Mentoring & Coaching</option>
                    <option value="sabbatical_retention_bonus">Sabbatical & Cash Retention Bonus</option>
                  </select>
                </label>
                <label>
                  Initiative Title:
                  <input
                    type="text"
                    required
                    value={interventionForm.title}
                    onChange={e => setInterventionForm({ ...interventionForm, title: e.target.value })}
                    placeholder="e.g. AI Leadership Retention Grant"
                  />
                </label>
                <label>
                  Estimated Investment ($ USD):
                  <input
                    type="number"
                    value={interventionForm.proposedCostUsd}
                    onChange={e =>
                      setInterventionForm({ ...interventionForm, proposedCostUsd: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowAddInterventionModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="succession-studio-btn-primary">
                    Create Package
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showNominateSuccessorModal && (
          <div className="sub-modal-backdrop">
            <div className="sub-modal-card">
              <h3>Nominate Successor Candidate</h3>
              <form onSubmit={handleNominateSuccessor}>
                <label>
                  Candidate:
                  <select
                    value={successorForm.talentProfileId}
                    onChange={e => setSuccessorForm({ ...successorForm, talentProfileId: e.target.value })}
                  >
                    {overview?.talentProfiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.currentRole})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Readiness Horizon:
                  <select
                    value={successorForm.readinessHorizon}
                    onChange={e =>
                      setSuccessorForm({
                        ...successorForm,
                        readinessHorizon: e.target.value as ReadinessHorizon
                      })
                    }
                  >
                    <option value="ready_now">Ready Now (0-6 Months)</option>
                    <option value="ready_1_2_years">Ready in 1-2 Years (Development underway)</option>
                    <option value="emergency_interim">Emergency Interim Backup</option>
                  </select>
                </label>
                <label>
                  Evaluation Notes:
                  <textarea
                    value={successorForm.notes || ''}
                    onChange={e => setSuccessorForm({ ...successorForm, notes: e.target.value })}
                    placeholder="Candidate strengths and target development priorities..."
                  />
                </label>
                <div className="form-actions">
                  <button type="button" onClick={() => setShowNominateSuccessorModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="succession-studio-btn-primary">
                    Nominate Candidate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
