import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Copy,
  Check,
  Plus,
  Trash2,
  X,
  Network
} from 'lucide-react';
import {
  type ReferenceAdvocateDTO,
  type ReferenceAdvocateMutationDTO,
  type TargetStakeholderNodeDTO,
  type BackchannelAuditDTO,
  type RefereeBriefingPacketDTO,
  type ExecutiveCompetencyKey,
  type ReferenceArchetype,
  type SentimentRiskTier,
  type NetworkOverlapDegree,
  EXECUTIVE_COMPETENCY_LABELS,
  ARCHETYPE_LABELS
} from '../domain.ts';
import { backchannelRepository } from '../data.ts';

interface BackchannelIntelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'directory' | 'stakeholders' | 'briefing' | 'risks';

export const BackchannelIntelModal: React.FC<BackchannelIntelModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('directory');
  const [audits, setAudits] = useState<BackchannelAuditDTO[]>([]);
  const [advocates, setAdvocates] = useState<ReferenceAdvocateDTO[]>([]);
  const [selectedAuditId, setSelectedAuditId] = useState<string>('');
  const [selectedAdvocateId, setSelectedAdvocateId] = useState<string>('');
  const [activeBriefing, setActiveBriefing] = useState<RefereeBriefingPacketDTO | null>(null);
  const [copiedBriefing, setCopiedBriefing] = useState<boolean>(false);
  const [showAddAdvocate, setShowAddAdvocate] = useState<boolean>(false);
  const [showAddStakeholder, setShowAddStakeholder] = useState<boolean>(false);

  const [advocateForm, setAdvocateForm] = useState<ReferenceAdvocateMutationDTO>({
    fullName: '',
    currentTitle: '',
    currentCompany: '',
    relationshipArchetype: 'superior_sponsor',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-01',
    sharedTenureEnd: '2023-01',
    sharedTenureMonths: 36,
    projectsCoDelivered: ['Global Core Payment Gateway'],
    endorsementStrength: 'unconditional_champion',
    vouchedCompetencies: ['scaling_0_to_1', 'board_governance'],
    email: '',
    preferredChannel: 'email',
    ndaRestricted: false
  });

  const [stakeholderForm, setStakeholderForm] = useState<Omit<TargetStakeholderNodeDTO, 'id' | 'probabilityScore' | 'rationale'>>({
    fullName: '',
    role: '',
    organization: '',
    isDecisionMaker: true,
    networkOverlapDegree: 'second_degree',
    mutualCompanies: ['FinFlow Global'],
    mutualTenureOverlapMonths: 24,
    potentialBackchannelIntermediaries: [],
    predictedSentiment: 'champion'
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  async function loadData() {
    const loadedAudits = await backchannelRepository.listAudits();
    const loadedAdvocates = await backchannelRepository.listAdvocates();
    setAudits(loadedAudits);
    setAdvocates(loadedAdvocates);
    if (loadedAudits.length > 0 && !selectedAuditId) {
      setSelectedAuditId(loadedAudits[0].id);
    }
    if (loadedAdvocates.length > 0 && !selectedAdvocateId) {
      setSelectedAdvocateId(loadedAdvocates[0].id);
    }
  }

  if (!isOpen) return null;

  const currentAudit = audits.find(a => a.id === selectedAuditId) || audits[0];

  async function handleCreateAdvocate(e: React.FormEvent) {
    e.preventDefault();
    if (!advocateForm.fullName || !advocateForm.email) return;
    const created = await backchannelRepository.createAdvocate(advocateForm);
    setAdvocates(prev => [created, ...prev]);
    setShowAddAdvocate(false);
    setAdvocateForm({
      fullName: '',
      currentTitle: '',
      currentCompany: '',
      relationshipArchetype: 'superior_sponsor',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2020-01',
      sharedTenureEnd: '2023-01',
      sharedTenureMonths: 36,
      projectsCoDelivered: ['Global Core Payment Gateway'],
      endorsementStrength: 'unconditional_champion',
      vouchedCompetencies: ['scaling_0_to_1', 'board_governance'],
      email: '',
      preferredChannel: 'email',
      ndaRestricted: false
    });
    if (currentAudit) {
      const updatedIds = [...currentAudit.advocateIds, created.id];
      const updated = await backchannelRepository.updateAudit(currentAudit.id, { advocateIds: updatedIds });
      if (updated) {
        setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));
      }
    }
  }

  async function handleDeleteAdvocate(id: string) {
    await backchannelRepository.deleteAdvocate(id);
    setAdvocates(prev => prev.filter(a => a.id !== id));
    if (selectedAdvocateId === id) {
      const remaining = advocates.filter(a => a.id !== id);
      setSelectedAdvocateId(remaining.length > 0 ? remaining[0].id : '');
    }
  }

  async function handleAddStakeholder(e: React.FormEvent) {
    e.preventDefault();
    if (!stakeholderForm.fullName || !currentAudit) return;
    const newNode: TargetStakeholderNodeDTO = {
      id: `stk-${Date.now()}`,
      ...stakeholderForm,
      probabilityScore: 0,
      rationale: ''
    };
    const updatedStakeholders = [...currentAudit.stakeholders, newNode];
    const updated = await backchannelRepository.updateAudit(currentAudit.id, {
      stakeholders: updatedStakeholders
    });
    if (updated) {
      setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));
      setShowAddStakeholder(false);
      setStakeholderForm({
        fullName: '',
        role: '',
        organization: currentAudit.targetCompany,
        isDecisionMaker: true,
        networkOverlapDegree: 'second_degree',
        mutualCompanies: ['FinFlow Global'],
        mutualTenureOverlapMonths: 18,
        potentialBackchannelIntermediaries: [],
        predictedSentiment: 'champion'
      });
    }
  }

  async function handleDeleteStakeholder(stakeholderId: string) {
    if (!currentAudit) return;
    const updatedStakeholders = currentAudit.stakeholders.filter(s => s.id !== stakeholderId);
    const updated = await backchannelRepository.updateAudit(currentAudit.id, {
      stakeholders: updatedStakeholders
    });
    if (updated) {
      setAudits(prev => prev.map(a => a.id === updated.id ? updated : a));
    }
  }

  async function handleGenerateBriefing() {
    if (!currentAudit || !selectedAdvocateId) return;
    const packet = await backchannelRepository.generateBriefing(currentAudit.id, selectedAdvocateId);
    if (packet) {
      setActiveBriefing(packet);
      const reloaded = await backchannelRepository.getAudit(currentAudit.id);
      if (reloaded) {
        setAudits(prev => prev.map(a => a.id === reloaded.id ? reloaded : a));
      }
    }
  }

  function handleCopyBriefingMarkdown() {
    if (!activeBriefing) return;
    navigator.clipboard.writeText(activeBriefing.formattedMarkdown);
    setCopiedBriefing(true);
    setTimeout(() => setCopiedBriefing(false), 2000);
  }

  return (
    <div className="bci-modal-overlay">
      <div className="bci-modal">
        <div className="bci-header">
          <div className="bci-header-left">
            <div className="bci-icon-box">
              <Users size={22} />
            </div>
            <div>
              <div className="bci-title-row">
                <h2 className="bci-title">Executive Reference & Backchannel Intelligence</h2>
                <span className="bci-title-badge">BVI Exposure Monitor</span>
              </div>
              <p className="bci-subtitle">
                360° advocate alignment, backchannel network vulnerability mapping, and transition friction defense
              </p>
            </div>
          </div>
          <button className="bci-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="bci-audit-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--slate-600)' }}>Target Mandate:</span>
            <select
              className="bci-audit-select"
              value={selectedAuditId}
              onChange={e => setSelectedAuditId(e.target.value)}
            >
              {audits.map(a => (
                <option key={a.id} value={a.id}>
                  {a.auditName} ({a.targetCompany})
                </option>
              ))}
            </select>
          </div>
          {currentAudit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`bci-badge ${
                currentAudit.vulnerabilityLevel === 'critical_backchannel_danger' ? 'bci-badge-rose' :
                currentAudit.vulnerabilityLevel === 'high_exposure' ? 'bci-badge-amber' :
                currentAudit.vulnerabilityLevel === 'moderate_risk' ? 'bci-badge-blue' : 'bci-badge-emerald'
              }`}>
                BVI: {currentAudit.overallBackchannelVulnerabilityIndex}% ({currentAudit.vulnerabilityLevel.replace(/_/g, ' ').toUpperCase()})
              </span>
            </div>
          )}
        </div>

        <div className="bci-nav-tabs">
          <button
            className={`bci-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            <Users size={16} />
            Advocate Directory & 360 Matrix
            <span className="bci-tab-badge">{advocates.length}</span>
          </button>
          <button
            className={`bci-tab-btn ${activeTab === 'stakeholders' ? 'active' : ''}`}
            onClick={() => setActiveTab('stakeholders')}
          >
            <Network size={16} />
            Vulnerability & Stakeholder Map
            {currentAudit && <span className="bci-tab-badge">{currentAudit.stakeholders.length}</span>}
          </button>
          <button
            className={`bci-tab-btn ${activeTab === 'briefing' ? 'active' : ''}`}
            onClick={() => setActiveTab('briefing')}
          >
            <FileText size={16} />
            Referee Briefing Generator
          </button>
          <button
            className={`bci-tab-btn ${activeTab === 'risks' ? 'active' : ''}`}
            onClick={() => setActiveTab('risks')}
          >
            <ShieldAlert size={16} />
            Transition Friction Playbook
            {currentAudit && <span className="bci-tab-badge">{currentAudit.risks.length}</span>}
          </button>
        </div>

        <div className="bci-body">
          {activeTab === 'directory' && (
            <>
              {currentAudit && (
                <div className="bci-grid-4">
                  <div className="bci-metric-card">
                    <span className="bci-metric-val">{currentAudit.coverageMatrix.totalAdvocates}</span>
                    <span className="bci-metric-lbl">Active Advocates</span>
                  </div>
                  <div className="bci-metric-card">
                    <span className="bci-metric-val" style={{ color: 'var(--emerald-600)' }}>
                      {currentAudit.coverageMatrix.overallReadinessScore}%
                    </span>
                    <span className="bci-metric-lbl">360° Readiness Score</span>
                  </div>
                  <div className="bci-metric-card">
                    <span className="bci-metric-val">
                      {4 - currentAudit.coverageMatrix.missingArchetypes.length} / 4
                    </span>
                    <span className="bci-metric-lbl">Archetypes Balanced</span>
                  </div>
                  <div className="bci-metric-card">
                    <span className="bci-metric-val" style={{ color: currentAudit.coverageMatrix.criticalGaps.length > 0 ? 'var(--rose-600)' : 'var(--emerald-600)' }}>
                      {currentAudit.coverageMatrix.criticalGaps.length}
                    </span>
                    <span className="bci-metric-lbl">Identified Blindspots</span>
                  </div>
                </div>
              )}

              {currentAudit && currentAudit.coverageMatrix.criticalGaps.length > 0 && (
                <div className="bci-callout-box" style={{ background: 'var(--rose-50)', borderColor: 'var(--rose-200)' }}>
                  <AlertTriangle size={18} color="var(--rose-600)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong style={{ fontSize: '13px', color: 'var(--rose-800)' }}>Panel Blindspots & Vulnerabilities Detected:</strong>
                    <ul className="bci-checklist" style={{ marginTop: '6px' }}>
                      {currentAudit.coverageMatrix.criticalGaps.map((gap, i) => (
                        <li key={i} className="bci-check-item" style={{ color: 'var(--rose-700)' }}>
                          {gap}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {currentAudit && (
                <div className="bci-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="bci-card-title">
                      <ShieldCheck size={16} color="var(--indigo-600)" />
                      360° Executive Competency Coverage Matrix
                    </h3>
                  </div>
                  <div className="bci-table-container">
                    <table className="bci-table">
                      <thead>
                        <tr>
                          <th className="bci-th">Executive Competency Domain</th>
                          <th className="bci-th">Mandate Status</th>
                          <th className="bci-th">Endorsing Advocates</th>
                          <th className="bci-th">Coverage Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAudit.coverageMatrix.competencyCoverages.map(cell => (
                          <tr key={cell.competency}>
                            <td className="bci-td" style={{ fontWeight: 600 }}>{cell.label}</td>
                            <td className="bci-td">
                              {cell.requiredByTargetRole ? (
                                <span className="bci-badge bci-badge-indigo">Mandatory</span>
                              ) : (
                                <span className="bci-badge bci-badge-slate">Supporting</span>
                              )}
                            </td>
                            <td className="bci-td">
                              {cell.advocateCount > 0 ? (
                                <span style={{ fontWeight: 700, color: 'var(--emerald-600)' }}>
                                  {cell.advocateCount} Endorsement{cell.advocateCount > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--slate-400)' }}>None</span>
                              )}
                            </td>
                            <td className="bci-td">
                              <span className={`bci-badge ${
                                cell.coverageStatus === 'optimal' ? 'bci-badge-emerald' :
                                cell.coverageStatus === 'adequate' ? 'bci-badge-blue' :
                                cell.coverageStatus === 'vulnerable' ? 'bci-badge-rose' : 'bci-badge-slate'
                              }`}>
                                {cell.coverageStatus.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="bci-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 className="bci-card-title">
                    <Users size={16} color="var(--indigo-600)" />
                    Curated Executive Advocates ({advocates.length})
                  </h3>
                  <button
                    className="bci-btn-primary"
                    onClick={() => setShowAddAdvocate(!showAddAdvocate)}
                  >
                    <Plus size={15} />
                    {showAddAdvocate ? 'Cancel' : 'Add Executive Advocate'}
                  </button>
                </div>

                {showAddAdvocate && (
                  <form onSubmit={handleCreateAdvocate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--slate-50)', borderRadius: '10px', border: '1px solid var(--slate-200)' }}>
                    <div className="bci-grid-3">
                      <div className="bci-input-row">
                        <label className="bci-label">Full Name *</label>
                        <input
                          className="bci-input"
                          value={advocateForm.fullName}
                          onChange={e => setAdvocateForm({ ...advocateForm, fullName: e.target.value })}
                          placeholder="e.g. David Sterling"
                          required
                        />
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Current Title *</label>
                        <input
                          className="bci-input"
                          value={advocateForm.currentTitle}
                          onChange={e => setAdvocateForm({ ...advocateForm, currentTitle: e.target.value })}
                          placeholder="e.g. Chief Technology Officer"
                          required
                        />
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Current Company *</label>
                        <input
                          className="bci-input"
                          value={advocateForm.currentCompany}
                          onChange={e => setAdvocateForm({ ...advocateForm, currentCompany: e.target.value })}
                          placeholder="e.g. OmniVenture Tech"
                          required
                        />
                      </div>
                    </div>
                    <div className="bci-grid-3">
                      <div className="bci-input-row">
                        <label className="bci-label">Relationship Archetype</label>
                        <select
                          className="bci-select"
                          value={advocateForm.relationshipArchetype}
                          onChange={e => setAdvocateForm({ ...advocateForm, relationshipArchetype: e.target.value as ReferenceArchetype })}
                        >
                          <option value="superior_sponsor">Superior / Executive Sponsor</option>
                          <option value="direct_report">Direct Report / Mentee</option>
                          <option value="cross_functional_peer">Cross-Functional Peer</option>
                          <option value="external_stakeholder">External Stakeholder / Investor</option>
                        </select>
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Shared Company</label>
                        <input
                          className="bci-input"
                          value={advocateForm.sharedCompany}
                          onChange={e => setAdvocateForm({ ...advocateForm, sharedCompany: e.target.value })}
                          placeholder="e.g. FinFlow Global"
                        />
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Contact Email *</label>
                        <input
                          type="email"
                          className="bci-input"
                          value={advocateForm.email}
                          onChange={e => setAdvocateForm({ ...advocateForm, email: e.target.value })}
                          placeholder="david@example.com"
                          required
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="submit" className="bci-btn-primary">
                        Save Advocate
                      </button>
                    </div>
                  </form>
                )}

                <div className="bci-grid-2">
                  {advocates.map(adv => (
                    <div key={adv.id} className="bci-node-card">
                      <div className="bci-node-header">
                        <div>
                          <h4 className="bci-node-name">{adv.fullName}</h4>
                          <span className="bci-node-role">{adv.currentTitle} @ {adv.currentCompany}</span>
                        </div>
                        <button
                          style={{ border: 'none', background: 'transparent', color: 'var(--slate-400)', cursor: 'pointer' }}
                          onClick={() => handleDeleteAdvocate(adv.id)}
                          title="Remove advocate"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className="bci-badge bci-badge-indigo">
                          {ARCHETYPE_LABELS[adv.relationshipArchetype]}
                        </span>
                        <span className="bci-badge bci-badge-emerald">
                          {adv.endorsementStrength.replace(/_/g, ' ')}
                        </span>
                        <span className="bci-badge bci-badge-slate">
                          {adv.sharedCompany} ({adv.sharedTenureMonths} mos)
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--slate-600)' }}>
                        <strong>Co-Delivered:</strong> {adv.projectsCoDelivered.join(', ')}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--slate-500)' }}>
                        <strong>Vouched:</strong> {adv.vouchedCompetencies.map(c => EXECUTIVE_COMPETENCY_LABELS[c]).join(' • ')}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--slate-500)', display: 'flex', gap: '12px' }}>
                        <span>Channel: <strong>{adv.preferredChannel.toUpperCase()}</strong></span>
                        <span>Email: <strong>{adv.email}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'stakeholders' && currentAudit && (
            <>
              <div className="bci-grid-3">
                <div className="bci-metric-card">
                  <span className="bci-metric-val" style={{
                    color: currentAudit.overallBackchannelVulnerabilityIndex >= 75 ? 'var(--rose-600)' :
                           currentAudit.overallBackchannelVulnerabilityIndex >= 50 ? 'var(--amber-600)' : 'var(--emerald-600)'
                  }}>
                    {currentAudit.overallBackchannelVulnerabilityIndex}%
                  </span>
                  <span className="bci-metric-lbl">Backchannel Vulnerability Index (BVI)</span>
                </div>
                <div className="bci-metric-card">
                  <span className="bci-metric-val">{currentAudit.stakeholders.length}</span>
                  <span className="bci-metric-lbl">Mapped Stakeholder Nodes</span>
                </div>
                <div className="bci-metric-card">
                  <span className="bci-metric-val" style={{ color: 'var(--indigo-600)' }}>
                    {currentAudit.stakeholders.filter(s => s.probabilityScore >= 70).length}
                  </span>
                  <span className="bci-metric-lbl">High-Probability Contact Paths</span>
                </div>
              </div>

              <div className="bci-callout-box">
                <ShieldCheck size={20} color="var(--indigo-600)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--indigo-900)' }}>Strategic Backchannel Defense Directives:</strong>
                  <ul className="bci-checklist" style={{ marginTop: '6px' }}>
                    {currentAudit.strategicRecommendations.map((rec, i) => (
                      <li key={i} className="bci-check-item">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bci-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <h3 className="bci-card-title">
                    <Network size={16} color="var(--indigo-600)" />
                    Target Leadership & Intermediary Backchannel Graph
                  </h3>
                  <button
                    className="bci-btn-primary"
                    onClick={() => setShowAddStakeholder(!showAddStakeholder)}
                  >
                    <Plus size={15} />
                    {showAddStakeholder ? 'Cancel' : 'Add Target Stakeholder'}
                  </button>
                </div>

                {showAddStakeholder && (
                  <form onSubmit={handleAddStakeholder} style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--slate-50)', borderRadius: '10px', border: '1px solid var(--slate-200)' }}>
                    <div className="bci-grid-3">
                      <div className="bci-input-row">
                        <label className="bci-label">Stakeholder Name *</label>
                        <input
                          className="bci-input"
                          value={stakeholderForm.fullName}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, fullName: e.target.value })}
                          placeholder="e.g. Jonathan Cole"
                          required
                        />
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Role / Mandate *</label>
                        <input
                          className="bci-input"
                          value={stakeholderForm.role}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, role: e.target.value })}
                          placeholder="e.g. Managing Partner (Board Director)"
                          required
                        />
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Organization *</label>
                        <input
                          className="bci-input"
                          value={stakeholderForm.organization}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, organization: e.target.value })}
                          placeholder="e.g. Sequoia Capital"
                          required
                        />
                      </div>
                    </div>
                    <div className="bci-grid-3">
                      <div className="bci-input-row">
                        <label className="bci-label">Network Overlap Degree</label>
                        <select
                          className="bci-select"
                          value={stakeholderForm.networkOverlapDegree}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, networkOverlapDegree: e.target.value as NetworkOverlapDegree })}
                        >
                          <option value="first_degree">1st-Degree Direct Contact</option>
                          <option value="second_degree">2nd-Degree Executive Path</option>
                          <option value="third_degree">3rd-Degree Ecosystem Node</option>
                        </select>
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Predicted Sentiment Risk</label>
                        <select
                          className="bci-select"
                          value={stakeholderForm.predictedSentiment}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, predictedSentiment: e.target.value as SentimentRiskTier })}
                        >
                          <option value="champion">Champion (Proactive Support)</option>
                          <option value="neutral">Neutral (Factual Observer)</option>
                          <option value="adverse_risk">Adverse Risk (Known Friction)</option>
                        </select>
                      </div>
                      <div className="bci-input-row">
                        <label className="bci-label">Tenure Overlap (Months)</label>
                        <input
                          type="number"
                          className="bci-input"
                          value={stakeholderForm.mutualTenureOverlapMonths}
                          onChange={e => setStakeholderForm({ ...stakeholderForm, mutualTenureOverlapMonths: Number(e.target.value) || 0 })}
                          min={0}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="submit" className="bci-btn-primary">
                        Evaluate Node
                      </button>
                    </div>
                  </form>
                )}

                <div className="bci-grid-2">
                  {currentAudit.stakeholders.map(s => (
                    <div key={s.id} className="bci-node-card">
                      <div className="bci-node-header">
                        <div>
                          <h4 className="bci-node-name">{s.fullName}</h4>
                          <span className="bci-node-role">{s.role} @ {s.organization}</span>
                        </div>
                        <button
                          style={{ border: 'none', background: 'transparent', color: 'var(--slate-400)', cursor: 'pointer' }}
                          onClick={() => handleDeleteStakeholder(s.id)}
                          title="Remove node"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span className={`bci-badge ${
                          s.predictedSentiment === 'champion' ? 'bci-badge-emerald' :
                          s.predictedSentiment === 'adverse_risk' ? 'bci-badge-rose' : 'bci-badge-blue'
                        }`}>
                          {s.predictedSentiment.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="bci-badge bci-badge-indigo">
                          {s.networkOverlapDegree.replace(/_/g, ' ')}
                        </span>
                        {s.isDecisionMaker && (
                          <span className="bci-badge bci-badge-amber">Primary Decision Maker</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 600 }}>
                          <span style={{ color: 'var(--slate-600)' }}>Backchannel Probability:</span>
                          <span style={{
                            color: s.probabilityScore >= 75 ? 'var(--rose-600)' :
                                   s.probabilityScore >= 50 ? 'var(--amber-600)' : 'var(--emerald-600)'
                          }}>
                            {s.probabilityScore}%
                          </span>
                        </div>
                        <div className="bci-prob-meter">
                          <div
                            className="bci-prob-fill"
                            style={{
                              width: `${s.probabilityScore}%`,
                              backgroundColor: s.probabilityScore >= 75 ? 'var(--rose-600)' :
                                               s.probabilityScore >= 50 ? 'var(--amber-500)' : 'var(--emerald-500)'
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--slate-600)', lineHeight: 1.4 }}>
                        <strong>Rationale:</strong> {s.rationale}
                      </div>

                      {s.potentialBackchannelIntermediaries.length > 0 && (
                        <div style={{ fontSize: '11.5px', color: 'var(--slate-500)' }}>
                          <strong>Intermediary Paths:</strong> {s.potentialBackchannelIntermediaries.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'briefing' && currentAudit && (
            <>
              <div className="bci-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <label className="bci-label" style={{ marginBottom: 0 }}>Target Referee:</label>
                    <select
                      className="bci-select"
                      value={selectedAdvocateId}
                      onChange={e => setSelectedAdvocateId(e.target.value)}
                    >
                      {advocates.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} ({ARCHETYPE_LABELS[a.relationshipArchetype]})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="bci-btn-primary"
                      onClick={handleGenerateBriefing}
                    >
                      <FileText size={15} />
                      Generate Tailored Briefing
                    </button>
                    {activeBriefing && (
                      <button
                        className="bci-btn-secondary"
                        onClick={handleCopyBriefingMarkdown}
                      >
                        {copiedBriefing ? <Check size={15} color="var(--emerald-600)" /> : <Copy size={15} />}
                        {copiedBriefing ? 'Copied to Clipboard' : 'Copy Markdown'}
                      </button>
                    )}
                  </div>
                </div>

                {activeBriefing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                    <div className="bci-grid-3">
                      <div className="bci-metric-card">
                        <span className="bci-metric-val">{activeBriefing.targetCompany}</span>
                        <span className="bci-metric-lbl">Target Organization</span>
                      </div>
                      <div className="bci-metric-card">
                        <span className="bci-metric-val">{activeBriefing.advocateName}</span>
                        <span className="bci-metric-lbl">Referee Vouching</span>
                      </div>
                      <div className="bci-metric-card">
                        <span className="bci-metric-val">{activeBriefing.priorityProjectsToHighlight.length}</span>
                        <span className="bci-metric-lbl">Key Anchored Wins</span>
                      </div>
                    </div>

                    <div className="bci-markdown-box">
                      {activeBriefing.formattedMarkdown}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--slate-500)' }}>
                    <FileText size={32} color="var(--slate-400)" style={{ marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Select an executive advocate above and click <strong>Generate Tailored Briefing</strong> to synthesize a 1-page tailored Markdown briefing packet with talking points, project metrics, and probing question pivots.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'risks' && currentAudit && (
            <>
              <div className="bci-callout-box" style={{ background: 'var(--slate-50)', borderColor: 'var(--slate-300)' }}>
                <ShieldAlert size={20} color="var(--slate-600)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: '13px', color: 'var(--slate-800)' }}>Transition Friction Neutralization Strategy:</strong>
                  <p style={{ fontSize: '12.5px', color: 'var(--slate-600)', margin: '4px 0 0', lineHeight: 1.5 }}>
                    Senior candidates face scrutiny over down-round restructurings, M&A spin-downs, and founder departures. These playbooks provide synchronized, defensible framing so that referees and candidates articulate consistent facts.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {currentAudit.risks.map(r => (
                  <div key={r.id} className="bci-card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--slate-900)' }}>
                          {r.company} ({r.timeframe})
                        </h4>
                        <span className="bci-badge bci-badge-amber" style={{ marginTop: '4px' }}>
                          {r.frictionType.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <strong style={{ color: 'var(--slate-600)' }}>Context:</strong> {r.candidateContext}
                      </div>
                      <div>
                        <strong style={{ color: 'var(--slate-600)' }}>Executive Framing Narrative:</strong> {r.framingNarrative}
                      </div>
                    </div>

                    <div style={{ background: 'var(--slate-50)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--slate-900)' }}>Defensible Objective Facts:</strong>
                      <ul className="bci-checklist" style={{ marginTop: '6px' }}>
                        {r.defensibleFacts.map((fact, idx) => (
                          <li key={idx} className="bci-check-item">
                            {fact}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'var(--violet-100)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--violet-200)' }}>
                      <strong style={{ fontSize: '12px', color: 'var(--indigo-700)' }}>Referee Alignment Script (Off-The-Record):</strong>
                      <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--indigo-900)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        {r.refereeAlignmentScript}
                      </p>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--emerald-600)' }}>
                      <strong>Proactive Pivot:</strong> {r.proactiveReframing}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bci-modal-footer">
          <div style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
            {advocates.length} Advocates • {currentAudit?.stakeholders.length || 0} Stakeholders Mapped
          </div>
          <button className="bci-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
