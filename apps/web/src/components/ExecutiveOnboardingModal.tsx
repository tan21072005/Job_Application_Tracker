import React, { useState, useEffect } from 'react';
import {
  Compass,
  Users,
  Target,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  Download,
  X,
  TrendingUp,
  BarChart3,
  Star,
  Check
} from 'lucide-react';
import {
  type ExecutiveOnboardingPlanDTO,
  type StakeholderDTO,
  type StakeholderCategory,
  type StakeholderInterviewStatus,
  type AlignmentLevel,
  type OnboardingMilestoneDTO,
  type MilestonePhaseKey,
  type OnboardingMilestoneStatus,
  type ExecutiveMemoType
} from '../domain';
import { executiveOnboardingRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultCompany?: string;
  defaultRole?: string;
}

type TabType = 'scorecard' | 'stakeholders' | 'milestones' | 'briefings';

export const ExecutiveOnboardingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  defaultCompany = '',
  defaultRole = ''
}) => {
  const [plans, setPlans] = useState<ExecutiveOnboardingPlanDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('scorecard');
  const [loading, setLoading] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showAddStakeholder, setShowAddStakeholder] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [activeCohort, setActiveCohort] = useState<string>('all');
  const [activeMemoType, setActiveMemoType] = useState<ExecutiveMemoType>('day_30_listening_tour');
  const [memoMarkdown, setMemoMarkdown] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const [newCompanyName, setNewCompanyName] = useState(defaultCompany || 'Acme Cloud AI');
  const [newRoleTitle, setNewRoleTitle] = useState(defaultRole || 'VP of Engineering');
  const [newSponsorName, setNewSponsorName] = useState('Sarah Jenkins (CEO)');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);

  const [sName, setSName] = useState('');
  const [sRole, setSRole] = useState('');
  const [sCategory, setSCategory] = useState<StakeholderCategory>('peer_executive');
  const [sExpectations, setSExpectations] = useState('');
  const [sPainPoints, setSPainPoints] = useState('');
  const [sPolitical, setSPolitical] = useState('');
  const [sSentiment, setSSentiment] = useState<number>(4);
  const [sStatus, setSStatus] = useState<StakeholderInterviewStatus>('scheduled');
  const [sAlignment, setSAlignment] = useState<AlignmentLevel>('strongly_aligned');

  const [mPhase, setMPhase] = useState<MilestonePhaseKey>('phase_1_listen_align');
  const [mTitle, setMTitle] = useState('');
  const [mDesc, setMDesc] = useState('');
  const [mTargetDay, setMTargetDay] = useState<number>(30);
  const [mIsQuickWin, setMIsQuickWin] = useState<boolean>(true);
  const [mImpact, setMImpact] = useState<number>(8);
  const [mDaysEstimate, setMDaysEstimate] = useState<number>(7);

  useEffect(() => {
    if (!isOpen) return;
    loadPlans();
  }, [isOpen]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await executiveOnboardingRepository.listPlans();
      setPlans(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedId) || plans[0] || null;

  useEffect(() => {
    if (!selectedPlan) return;
    loadMemo(selectedPlan.id, activeMemoType);
  }, [selectedId, activeMemoType]);

  const loadMemo = async (planId: string, memoType: ExecutiveMemoType) => {
    const res = await executiveOnboardingRepository.exportMemo(planId, memoType);
    if (res) {
      setMemoMarkdown(res.markdown);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newRoleTitle.trim()) return;

    setLoading(true);
    try {
      const created = await executiveOnboardingRepository.createPlan({
        companyName: newCompanyName.trim(),
        roleTitle: newRoleTitle.trim(),
        executiveSponsorName: newSponsorName.trim(),
        startDate: newStartDate,
        currentDay: 1
      });
      setPlans(prev => [created, ...prev]);
      setSelectedId(created.id);
      setShowAddPlan(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceDay = async (daysDelta: number) => {
    if (!selectedPlan) return;
    const nextDay = Math.min(100, Math.max(1, selectedPlan.currentDay + daysDelta));
    const updated = await executiveOnboardingRepository.updatePlan(selectedPlan.id, {
      currentDay: nextDay
    });
    if (updated) {
      setPlans(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    }
  };

  const handleAddStakeholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !sName.trim() || !sRole.trim()) return;

    const created = await executiveOnboardingRepository.addStakeholder(selectedPlan.id, {
      name: sName.trim(),
      roleTitle: sRole.trim(),
      category: sCategory,
      expectations: sExpectations.trim(),
      painPoints: sPainPoints.trim(),
      politicalDynamics: sPolitical.trim(),
      sentimentScore: sSentiment,
      status: sStatus,
      alignmentLevel: sAlignment,
      interviewDate: sStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    });

    if (created) {
      const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
      if (refreshed) {
        setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
      }
      setSName('');
      setSRole('');
      setSExpectations('');
      setSPainPoints('');
      setSPolitical('');
      setShowAddStakeholder(false);
    }
  };

  const handleToggleStakeholderStatus = async (stakeholder: StakeholderDTO) => {
    if (!selectedPlan) return;
    const nextStatus: StakeholderInterviewStatus = stakeholder.status === 'completed' ? 'scheduled' : 'completed';
    const updated = await executiveOnboardingRepository.updateStakeholder(selectedPlan.id, stakeholder.id, {
      status: nextStatus,
      interviewDate: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    });
    if (updated) {
      const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
      if (refreshed) {
        setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
      }
    }
  };

  const handleUpdateSentiment = async (stakeholder: StakeholderDTO, score: number) => {
    if (!selectedPlan) return;
    const updated = await executiveOnboardingRepository.updateStakeholder(selectedPlan.id, stakeholder.id, {
      sentimentScore: score
    });
    if (updated) {
      const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
      if (refreshed) {
        setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
      }
    }
  };

  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!selectedPlan) return;
    await executiveOnboardingRepository.deleteStakeholder(selectedPlan.id, stakeholderId);
    const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
    if (refreshed) {
      setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || !mTitle.trim()) return;

    const created = await executiveOnboardingRepository.addMilestone(selectedPlan.id, {
      phase: mPhase,
      title: mTitle.trim(),
      description: mDesc.trim(),
      targetDay: Number(mTargetDay),
      isQuickWin: mIsQuickWin,
      impactScore: Number(mImpact),
      deliveryEstimateDays: Number(mDaysEstimate),
      status: 'planned'
    });

    if (created) {
      const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
      if (refreshed) {
        setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
      }
      setMTitle('');
      setMDesc('');
      setShowAddMilestone(false);
    }
  };

  const handleToggleMilestoneStatus = async (milestone: OnboardingMilestoneDTO) => {
    if (!selectedPlan) return;
    let nextStatus: OnboardingMilestoneStatus = 'in_progress';
    let deliveredDay: number | null = null;
    if (milestone.status === 'planned') nextStatus = 'in_progress';
    else if (milestone.status === 'in_progress') {
      nextStatus = 'achieved';
      deliveredDay = selectedPlan.currentDay;
    } else if (milestone.status === 'achieved') nextStatus = 'planned';

    const updated = await executiveOnboardingRepository.updateMilestone(selectedPlan.id, milestone.id, {
      status: nextStatus,
      deliveredDay
    });
    if (updated) {
      const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
      if (refreshed) {
        setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
      }
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedPlan) return;
    await executiveOnboardingRepository.deleteMilestone(selectedPlan.id, milestoneId);
    const refreshed = await executiveOnboardingRepository.getPlan(selectedPlan.id);
    if (refreshed) {
      setPlans(prev => prev.map(p => (p.id === refreshed.id ? refreshed : p)));
    }
  };

  const handleCopyMarkdown = () => {
    if (!memoMarkdown) return;
    navigator.clipboard.writeText(memoMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!memoMarkdown || !selectedPlan) return;
    const blob = new Blob([memoMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `executive-memo-${selectedPlan.companyName.toLowerCase().replace(/\s+/g, '-')}-${activeMemoType}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const filteredStakeholders = selectedPlan?.stakeholders.filter(s => {
    if (activeCohort === 'all') return true;
    return s.category === activeCohort;
  }) || [];

  return (
    <div className="eoc-modal-overlay" onClick={onClose}>
      <div className="eoc-modal" onClick={e => e.stopPropagation()}>
        <div className="eoc-header">
          <div className="eoc-header-left">
            <div className="eoc-icon-box">
              <Compass size={24} />
            </div>
            <div>
              <div className="eoc-header-title">Executive 100-Day Transition Command Center</div>
              <div className="eoc-header-sub">
                {selectedPlan ? (
                  <>
                    <strong>{selectedPlan.companyName}</strong> · {selectedPlan.roleTitle} · Sponsor: {selectedPlan.executiveSponsorName || 'CEO'} · Day {selectedPlan.currentDay} of 100
                  </>
                ) : (
                  'Plan and track executive transition momentum'
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {selectedPlan && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Day {selectedPlan.currentDay}</span>
                <button
                  type="button"
                  style={{ border: 'none', background: '#ffffff', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  onClick={() => handleAdvanceDay(1)}
                  title="Advance 1 Day"
                >
                  +1d
                </button>
                <button
                  type="button"
                  style={{ border: 'none', background: '#ffffff', borderRadius: '4px', padding: '2px 6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  onClick={() => handleAdvanceDay(7)}
                  title="Advance 1 Week"
                >
                  +7d
                </button>
              </div>
            )}
            <button className="eoc-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="eoc-nav-tabs">
          <button
            className={`eoc-tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
          >
            <BarChart3 size={15} />
            <span>1. Momentum Scorecard</span>
          </button>
          <button
            className={`eoc-tab-btn ${activeTab === 'stakeholders' ? 'active' : ''}`}
            onClick={() => setActiveTab('stakeholders')}
          >
            <Users size={15} />
            <span>2. Listening Tour ({selectedPlan?.stakeholders.length || 0})</span>
          </button>
          <button
            className={`eoc-tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
            onClick={() => setActiveTab('milestones')}
          >
            <Target size={15} />
            <span>3. 30-60-100 Roadmap ({selectedPlan?.milestones.length || 0})</span>
          </button>
          <button
            className={`eoc-tab-btn ${activeTab === 'briefings' ? 'active' : ''}`}
            onClick={() => setActiveTab('briefings')}
          >
            <FileText size={15} />
            <span>4. Executive Memos & Briefings</span>
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
            <button
              className="eoc-tab-btn"
              style={{ background: '#f1f5f9', color: '#0369a1' }}
              onClick={() => setShowAddPlan(true)}
            >
              <Plus size={14} />
              <span>New Transition Plan</span>
            </button>
          </div>
        </div>

        <div className="eoc-body">
          {showAddPlan && (
            <div className="ecg-form-card" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Initiate Executive Transition Command Center</h4>
                <button type="button" className="eoc-close-btn" onClick={() => setShowAddPlan(false)}><X size={16} /></button>
              </div>
              <form onSubmit={handleCreatePlan}>
                <div className="ecg-form-grid">
                  <div className="ecg-form-group">
                    <label className="ecg-label">Company Name</label>
                    <input className="ecg-input" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} required />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Executive Role Title</label>
                    <input className="ecg-input" value={newRoleTitle} onChange={e => setNewRoleTitle(e.target.value)} required />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Executive Sponsor (CEO / Board)</label>
                    <input className="ecg-input" value={newSponsorName} onChange={e => setNewSponsorName(e.target.value)} required />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Start Date</label>
                    <input type="date" className="ecg-input" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                  <button type="button" className="eoc-tab-btn" onClick={() => setShowAddPlan(false)}>Cancel</button>
                  <button type="submit" className="eoc-tab-btn active" style={{ background: '#0284c7', color: '#ffffff' }}>Launch Command Center</button>
                </div>
              </form>
            </div>
          )}

          {selectedPlan && activeTab === 'scorecard' && (
            <div>
              <div className="eoc-scorecard-grid">
                <div className="eoc-card">
                  <div className="eoc-card-title">Transition Momentum Index (TMI)</div>
                  <div className="eoc-card-value">
                    <span>{selectedPlan.momentum.transitionMomentumIndex}%</span>
                    <span className={`eoc-tier-badge eoc-tier-${selectedPlan.momentum.tier}`}>
                      {selectedPlan.momentum.tier.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="eoc-card-sub">Weighted execution, stakeholder trust & health index</div>
                </div>

                <div className="eoc-card">
                  <div className="eoc-card-title">Stakeholder Rel. Index (SRI)</div>
                  <div className="eoc-card-value" style={{ color: '#0369a1' }}>
                    {selectedPlan.momentum.stakeholderRelationshipIndex} <span style={{ fontSize: '14px', color: '#64748b' }}>/ 100</span>
                  </div>
                  <div className="eoc-card-sub">
                    {selectedPlan.momentum.interviewedStakeholders} of {selectedPlan.momentum.totalStakeholders} senior interviews completed
                  </div>
                </div>

                <div className="eoc-card">
                  <div className="eoc-card-title">Diagnostic Health (DHI)</div>
                  <div className="eoc-card-value" style={{ color: '#15803d' }}>
                    {selectedPlan.momentum.diagnosticHealthIndex} <span style={{ fontSize: '14px', color: '#64748b' }}>/ 100</span>
                  </div>
                  <div className="eoc-card-sub">4-dimension architecture & team health rating</div>
                </div>

                <div className="eoc-card">
                  <div className="eoc-card-title">Quick-Win Delivery Rate</div>
                  <div className="eoc-card-value" style={{ color: '#854d0e' }}>
                    {selectedPlan.momentum.quickWinDeliveryRate}%
                  </div>
                  <div className="eoc-card-sub">
                    {selectedPlan.momentum.quickWinsDelivered} of {selectedPlan.momentum.quickWinsTotal} high-impact quick wins delivered
                  </div>
                </div>

                <div className="eoc-card">
                  <div className="eoc-card-title">Milestone Execution Rate</div>
                  <div className="eoc-card-value" style={{ color: '#6d28d9' }}>
                    {selectedPlan.momentum.milestoneExecutionRate}%
                  </div>
                  <div className="eoc-card-sub">
                    {selectedPlan.momentum.achievedMilestones} of {selectedPlan.momentum.totalMilestones} total 100-day milestones achieved
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  4-Dimension Organizational & Technical Diagnostics
                </h4>
                <div className="eoc-diagnostics-grid">
                  <div className="eoc-diagnostic-card">
                    <div className="eoc-diag-header">
                      <div className="eoc-diag-name">Architecture & Tech Debt</div>
                      <div className={`eoc-diag-score ${selectedPlan.diagnostics.architectureTechDebt.severityLevel}`}>
                        {selectedPlan.diagnostics.architectureTechDebt.score}/100
                      </div>
                    </div>
                    <div className="eoc-diag-tags">
                      {selectedPlan.diagnostics.architectureTechDebt.primaryBottlenecks.map((b, idx) => (
                        <div key={idx} className="eoc-diag-tag">⚠ {b}</div>
                      ))}
                    </div>
                    <div className="eoc-diag-plan">
                      <strong>Mitigation:</strong> {selectedPlan.diagnostics.architectureTechDebt.actionPlan}
                    </div>
                  </div>

                  <div className="eoc-diagnostic-card">
                    <div className="eoc-diag-header">
                      <div className="eoc-diag-name">Velocity & Incidents</div>
                      <div className={`eoc-diag-score ${selectedPlan.diagnostics.deliveryVelocityIncidentCadence.severityLevel}`}>
                        {selectedPlan.diagnostics.deliveryVelocityIncidentCadence.score}/100
                      </div>
                    </div>
                    <div className="eoc-diag-tags">
                      {selectedPlan.diagnostics.deliveryVelocityIncidentCadence.primaryBottlenecks.map((b, idx) => (
                        <div key={idx} className="eoc-diag-tag">⚠ {b}</div>
                      ))}
                    </div>
                    <div className="eoc-diag-plan">
                      <strong>Mitigation:</strong> {selectedPlan.diagnostics.deliveryVelocityIncidentCadence.actionPlan}
                    </div>
                  </div>

                  <div className="eoc-diagnostic-card">
                    <div className="eoc-diag-header">
                      <div className="eoc-diag-name">Morale & Flight Risks</div>
                      <div className={`eoc-diag-score ${selectedPlan.diagnostics.teamMoraleFlightRisks.severityLevel}`}>
                        {selectedPlan.diagnostics.teamMoraleFlightRisks.score}/100
                      </div>
                    </div>
                    <div className="eoc-diag-tags">
                      {selectedPlan.diagnostics.teamMoraleFlightRisks.primaryBottlenecks.map((b, idx) => (
                        <div key={idx} className="eoc-diag-tag">⚠ {b}</div>
                      ))}
                    </div>
                    <div className="eoc-diag-plan">
                      <strong>Mitigation:</strong> {selectedPlan.diagnostics.teamMoraleFlightRisks.actionPlan}
                    </div>
                  </div>

                  <div className="eoc-diagnostic-card">
                    <div className="eoc-diag-header">
                      <div className="eoc-diag-name">Product-Eng Alignment</div>
                      <div className={`eoc-diag-score ${selectedPlan.diagnostics.strategicProductEngineeringAlignment.severityLevel}`}>
                        {selectedPlan.diagnostics.strategicProductEngineeringAlignment.score}/100
                      </div>
                    </div>
                    <div className="eoc-diag-tags">
                      {selectedPlan.diagnostics.strategicProductEngineeringAlignment.primaryBottlenecks.map((b, idx) => (
                        <div key={idx} className="eoc-diag-tag">⚠ {b}</div>
                      ))}
                    </div>
                    <div className="eoc-diag-plan">
                      <strong>Mitigation:</strong> {selectedPlan.diagnostics.strategicProductEngineeringAlignment.actionPlan}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedPlan && activeTab === 'stakeholders' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {['all', 'executive_sponsor', 'peer_executive', 'direct_report', 'staff_principal', 'customer_ops'].map(cohort => (
                    <button
                      key={cohort}
                      type="button"
                      className={`eoc-tab-btn ${activeCohort === cohort ? 'active' : ''}`}
                      onClick={() => setActiveCohort(cohort)}
                      style={{ fontSize: '11px', textTransform: 'capitalize' }}
                    >
                      {cohort.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="eoc-tab-btn active"
                  style={{ background: '#0284c7', color: '#ffffff' }}
                  onClick={() => setShowAddStakeholder(true)}
                >
                  <Plus size={14} />
                  <span>Log Stakeholder Interview</span>
                </button>
              </div>

              {showAddStakeholder && (
                <div className="ecg-form-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Register Stakeholder Interview</h4>
                    <button type="button" className="eoc-close-btn" onClick={() => setShowAddStakeholder(false)}><X size={16} /></button>
                  </div>
                  <form onSubmit={handleAddStakeholder}>
                    <div className="ecg-form-grid">
                      <div className="ecg-form-group">
                        <label className="ecg-label">Name</label>
                        <input className="ecg-input" value={sName} onChange={e => setSName(e.target.value)} required />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Role Title</label>
                        <input className="ecg-input" value={sRole} onChange={e => setSRole(e.target.value)} required />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Cohort</label>
                        <select className="ecg-input" value={sCategory} onChange={e => setSCategory(e.target.value as StakeholderCategory)}>
                          <option value="executive_sponsor">Executive Sponsor / CEO</option>
                          <option value="peer_executive">Cross-Functional Peer</option>
                          <option value="direct_report">Direct Report / EM</option>
                          <option value="staff_principal">Staff / Principal Architect</option>
                          <option value="customer_ops">Customer Ops / Field</option>
                        </select>
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Sentiment Rating (1-5)</label>
                        <select className="ecg-input" value={sSentiment} onChange={e => setSSentiment(Number(e.target.value))}>
                          <option value={5}>5 - Champion / Strategic Ally</option>
                          <option value={4}>4 - Supportive / Receptive</option>
                          <option value={3}>3 - Neutral / Observant</option>
                          <option value={2}>2 - Guarded / Skeptical</option>
                          <option value={1}>1 - Resistant / Hostile</option>
                        </select>
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Interview Status</label>
                        <select className="ecg-input" value={sStatus} onChange={e => setSStatus(e.target.value as StakeholderInterviewStatus)}>
                          <option value="completed">Completed</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="identified">Identified</option>
                        </select>
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Alignment Level</label>
                        <select className="ecg-input" value={sAlignment} onChange={e => setSAlignment(e.target.value as AlignmentLevel)}>
                          <option value="strongly_aligned">Strongly Aligned</option>
                          <option value="partially_aligned">Partially Aligned</option>
                          <option value="misaligned">Misaligned</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '12px' }}>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Expectations</label>
                        <textarea className="ecg-input" rows={2} value={sExpectations} onChange={e => setSExpectations(e.target.value)} />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Pain Points</label>
                        <textarea className="ecg-input" rows={2} value={sPainPoints} onChange={e => setSPainPoints(e.target.value)} />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Political Dynamics & Influence</label>
                        <textarea className="ecg-input" rows={2} value={sPolitical} onChange={e => setSPolitical(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button type="button" className="eoc-tab-btn" onClick={() => setShowAddStakeholder(false)}>Cancel</button>
                      <button type="submit" className="eoc-tab-btn active" style={{ background: '#0284c7', color: '#ffffff' }}>Save Stakeholder</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="eoc-stakeholder-list">
                {filteredStakeholders.map(s => (
                  <div key={s.id} className="eoc-stakeholder-card">
                    <div className="eoc-stakeholder-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStakeholderStatus(s)}
                          style={{
                            border: 'none',
                            background: s.status === 'completed' ? '#dcfce7' : '#f1f5f9',
                            color: s.status === 'completed' ? '#15803d' : '#64748b',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          title={s.status === 'completed' ? 'Interview Completed' : 'Click to Mark Completed'}
                        >
                          <Check size={16} />
                        </button>
                        <div>
                          <span className="eoc-stakeholder-name">{s.name}</span>
                          <span style={{ margin: '0 8px', color: '#cbd5e1' }}>•</span>
                          <span className="eoc-stakeholder-role">{s.roleTitle}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="eoc-stakeholder-cat">{s.category.replace('_', ' ')}</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleUpdateSentiment(s, star)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '1px',
                                color: star <= s.sentimentScore ? '#eab308' : '#cbd5e1'
                              }}
                              title={`Sentiment: ${star}/5`}
                            >
                              <Star size={14} fill={star <= s.sentimentScore ? '#eab308' : 'none'} />
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStakeholder(s.id)}
                          style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                          title="Delete stakeholder"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="eoc-stakeholder-notes">
                      <div>
                        <strong>Expectations:</strong> {s.expectations || 'None recorded'}
                      </div>
                      <div>
                        <strong>Pain Points:</strong> {s.painPoints || 'None recorded'}
                      </div>
                      <div>
                        <strong>Political Dynamics:</strong> {s.politicalDynamics || 'None recorded'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedPlan && activeTab === 'milestones' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button
                  type="button"
                  className="eoc-tab-btn active"
                  style={{ background: '#0284c7', color: '#ffffff' }}
                  onClick={() => setShowAddMilestone(true)}
                >
                  <Plus size={14} />
                  <span>Add Transition Milestone</span>
                </button>
              </div>

              {showAddMilestone && (
                <div className="ecg-form-card" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Add 100-Day Milestone</h4>
                    <button type="button" className="eoc-close-btn" onClick={() => setShowAddMilestone(false)}><X size={16} /></button>
                  </div>
                  <form onSubmit={handleAddMilestone}>
                    <div className="ecg-form-grid">
                      <div className="ecg-form-group">
                        <label className="ecg-label">Milestone Title</label>
                        <input className="ecg-input" value={mTitle} onChange={e => setMTitle(e.target.value)} required />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Phase Horizon</label>
                        <select className="ecg-input" value={mPhase} onChange={e => setMPhase(e.target.value as MilestonePhaseKey)}>
                          <option value="phase_1_listen_align">Phase 1: Days 1-30 (Listen & Align)</option>
                          <option value="phase_2_synthesize_wins">Phase 2: Days 31-60 (Synthesize & Quick Wins)</option>
                          <option value="phase_3_transform_scale">Phase 3: Days 61-100 (Transform & Scale)</option>
                        </select>
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Target Day (1-100)</label>
                        <input type="number" min={1} max={100} className="ecg-input" value={mTargetDay} onChange={e => setMTargetDay(Number(e.target.value))} required />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Impact Rating (1-10)</label>
                        <input type="number" min={1} max={10} className="ecg-input" value={mImpact} onChange={e => setMImpact(Number(e.target.value))} required />
                      </div>
                      <div className="ecg-form-group">
                        <label className="ecg-label">Delivery Cycle (Days)</label>
                        <input type="number" min={1} max={100} className="ecg-input" value={mDaysEstimate} onChange={e => setMDaysEstimate(Number(e.target.value))} required />
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="ecg-checkbox-row">
                        <input type="checkbox" checked={mIsQuickWin} onChange={e => setMIsQuickWin(e.target.checked)} />
                        <span>Qualifies as Quick-Win (&le; 14-day turnaround with visible executive ROI)</span>
                      </label>
                    </div>
                    <div className="ecg-form-group" style={{ marginTop: '10px' }}>
                      <label className="ecg-label">Description & Deliverables</label>
                      <textarea className="ecg-input" rows={2} value={mDesc} onChange={e => setMDesc(e.target.value)} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '16px', justifyContent: 'flex-end' }}>
                      <button type="button" className="eoc-tab-btn" onClick={() => setShowAddMilestone(false)}>Cancel</button>
                      <button type="submit" className="eoc-tab-btn active" style={{ background: '#0284c7', color: '#ffffff' }}>Save Milestone</button>
                    </div>
                  </form>
                </div>
              )}

              {(['phase_1_listen_align', 'phase_2_synthesize_wins', 'phase_3_transform_scale'] as MilestonePhaseKey[]).map(phaseKey => {
                const phaseMilestones = selectedPlan.milestones.filter(m => m.phase === phaseKey);
                let phaseLabel = 'Phase 1: Days 1–30 (Listen & Align)';
                if (phaseKey === 'phase_2_synthesize_wins') phaseLabel = 'Phase 2: Days 31–60 (Synthesize & Quick Wins)';
                if (phaseKey === 'phase_3_transform_scale') phaseLabel = 'Phase 3: Days 61–100 (Transform & Scale)';

                return (
                  <div key={phaseKey} className="eoc-milestones-phase">
                    <div className="eoc-phase-title">
                      {phaseLabel} ({phaseMilestones.length})
                    </div>
                    {phaseMilestones.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                        No milestones registered in this phase.
                      </div>
                    ) : (
                      phaseMilestones.map(m => (
                        <div key={m.id} className="eoc-milestone-item">
                          <div className="eoc-milestone-left">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="eoc-milestone-title">{m.title}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>Target: Day {m.targetDay}</span>
                              {m.deliveredDay && (
                                <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700 }}>
                                  (Delivered Day {m.deliveredDay})
                                </span>
                              )}
                            </div>
                            <div className="eoc-milestone-desc">{m.description}</div>
                            <div className="eoc-milestone-badges">
                              {m.isQuickWin && (
                                <span className="eoc-badge-quickwin">★ QUICK-WIN ({m.deliveryEstimateDays}d)</span>
                              )}
                              <span style={{ fontSize: '11px', color: '#475569' }}>Impact: {m.impactScore}/10</span>
                              <span className={`eoc-badge-status ${m.status}`}>{m.status.replace('_', ' ')}</span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              className="eoc-tab-btn"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11px',
                                background: m.status === 'achieved' ? '#dcfce7' : '#f8fafc',
                                color: m.status === 'achieved' ? '#15803d' : '#334155'
                              }}
                              onClick={() => handleToggleMilestoneStatus(m)}
                            >
                              {m.status === 'achieved' ? 'Achieved ✓' : m.status === 'in_progress' ? 'Mark Achieved' : 'Start Progress'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(m.id)}
                              style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                              title="Delete milestone"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedPlan && activeTab === 'briefings' && (
            <div>
              <div className="eoc-memo-actions">
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`eoc-tab-btn ${activeMemoType === 'day_30_listening_tour' ? 'active' : ''}`}
                    onClick={() => setActiveMemoType('day_30_listening_tour')}
                  >
                    Day 30 Insights Memo
                  </button>
                  <button
                    type="button"
                    className={`eoc-tab-btn ${activeMemoType === 'day_60_strategic_priorities' ? 'active' : ''}`}
                    onClick={() => setActiveMemoType('day_60_strategic_priorities')}
                  >
                    Day 60 Strategy Briefing
                  </button>
                  <button
                    type="button"
                    className={`eoc-tab-btn ${activeMemoType === 'day_100_transformation_charter' ? 'active' : ''}`}
                    onClick={() => setActiveMemoType('day_100_transformation_charter')}
                  >
                    Day 100 Board Charter
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="eoc-tab-btn" onClick={handleCopyMarkdown}>
                    {copied ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy Markdown'}</span>
                  </button>
                  <button type="button" className="eoc-tab-btn active" style={{ background: '#0284c7', color: '#ffffff' }} onClick={handleDownloadMarkdown}>
                    <Download size={14} />
                    <span>Download .md</span>
                  </button>
                </div>
              </div>

              <div className="eoc-memo-box">
                {memoMarkdown || 'Generating executive briefing...'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
