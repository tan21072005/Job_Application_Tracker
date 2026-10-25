import React, { useState, useEffect } from 'react';
import {
  type StrategicCommsNexusOverviewDTO,
  type CrisisIncidentDTO,
  type CrisisHoldingStatementDTO,
  type CrisisSeverityLevel,
  type CrisisPlaybookType,
  type StakeholderTier,
  type StatementToneCalibration,
  type BridgeTechniqueType,
  type CrisisTripartiteSignoffRole
} from '../domain.ts';
import { strategicCommsNexusRepository } from '../data.ts';

interface StrategicCommsCrisisNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StrategicCommsCrisisNexusModal: React.FC<StrategicCommsCrisisNexusModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'intelligence' | 'holding' | 'moat' | 'warroom'>('matrix');
  const [loading, setLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<StrategicCommsNexusOverviewDTO | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [newIncidentTitle, setNewIncidentTitle] = useState('');
  const [newIncidentPlaybook, setNewIncidentPlaybook] = useState<CrisisPlaybookType>('cyber_ransomware_data_breach');
  const [newIncidentSeverity, setNewIncidentSeverity] = useState<CrisisSeverityLevel>('level_4_acute_enterprise_crisis');
  const [newIncidentSummary, setNewIncidentSummary] = useState('');

  const [holdingHeadline, setHoldingHeadline] = useState('');
  const [holdingBody, setHoldingBody] = useState('');
  const [holdingTier, setHoldingTier] = useState<StakeholderTier>('tier_2_institutional_investors');
  const [holdingTone, setHoldingTone] = useState<StatementToneCalibration>('authoritative_transparent');
  const [includePslra, setIncludePslra] = useState(true);
  const [includeRegFd, setIncludeRegFd] = useState(true);

  const [factClaim, setFactClaim] = useState('');
  const [factCorroboration, setFactCorroboration] = useState('');
  const [factOwner, setFactOwner] = useState('Dr. Gregory House, CISO');
  const [factRefutedRumor, setFactRefutedRumor] = useState('');

  const [qaQuestion, setQaQuestion] = useState('');
  const [qaOutlet, setQaOutlet] = useState('CNBC / Bloomberg');
  const [qaTechnique, setQaTechnique] = useState<BridgeTechniqueType>('bridge_to_facts');
  const [qaPivot, setQaPivot] = useState('');

  const [signerRole, setSignerRole] = useState<CrisisTripartiteSignoffRole>('head_of_communications');
  const [signerName, setSignerName] = useState('Marcus Vance');
  const [legalComments, setLegalComments] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await strategicCommsNexusRepository.getOverview();
      setOverview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load strategic communications overview');
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncidentTitle.trim() || !newIncidentSummary.trim()) return;
    try {
      await strategicCommsNexusRepository.createIncident({
        title: newIncidentTitle,
        playbookType: newIncidentPlaybook,
        initialSeverity: newIncidentSeverity,
        incidentCommander: 'Elena Vance, VP Incident Response',
        communicationsLead: 'Marcus Vance, Head of Comms',
        legalCounselLead: 'Rachel Thorne, General Counsel',
        technicalLead: 'Dr. Gregory House, CISO',
        summary: newIncidentSummary
      });
      setNewIncidentTitle('');
      setNewIncidentSummary('');
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to declare crisis incident');
    }
  };

  const handleCreateHoldingStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.primaryActiveIncident || !holdingHeadline.trim() || !holdingBody.trim()) return;
    try {
      await strategicCommsNexusRepository.createHoldingStatement({
        incidentId: overview.primaryActiveIncident.id,
        targetTier: holdingTier,
        toneCalibration: holdingTone,
        headline: holdingHeadline,
        bodyText: holdingBody,
        includePslraSafeHarbor: includePslra,
        includeRegulationFdNotice: includeRegFd
      });
      setHoldingHeadline('');
      setHoldingBody('');
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create holding statement');
    }
  };

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.primaryActiveIncident || !factClaim.trim() || !factCorroboration.trim()) return;
    try {
      await strategicCommsNexusRepository.registerFactMoatEntry({
        incidentId: overview.primaryActiveIncident.id,
        factClaim,
        technicalCorroboration: factCorroboration,
        sourceOwner: factOwner,
        corroborationStatus: 'verified_corroborated',
        refutedRumor: factRefutedRumor.trim() ? factRefutedRumor : undefined,
        evidenceReferenceId: 'MOAT-EVID-' + Math.floor(1000 + Math.random() * 9000)
      });
      setFactClaim('');
      setFactCorroboration('');
      setFactRefutedRumor('');
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register verified fact claim');
    }
  };

  const handleAddQa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overview?.primaryActiveIncident || !qaQuestion.trim() || !qaPivot.trim()) return;
    try {
      await strategicCommsNexusRepository.recordQaBridgeItem({
        incidentId: overview.primaryActiveIncident.id,
        hostileQuestion: qaQuestion,
        anticipatedOutlet: qaOutlet,
        bridgeTechnique: qaTechnique,
        pivotMessage: qaPivot,
        riskRating: 8
      });
      setQaQuestion('');
      setQaPivot('');
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record Q&A bridge item');
    }
  };

  const handleExecuteSignoff = async (role: CrisisTripartiteSignoffRole, defaultName: string) => {
    const activeStatement = overview?.holdingStatements[0];
    if (!activeStatement) return;
    try {
      await strategicCommsNexusRepository.submitSignoff({
        holdingStatementId: activeStatement.id,
        role,
        signerName: defaultName,
        legalComments: role === 'chief_legal_officer' ? (legalComments || 'Reviewed and validated for PSLRA & Reg FD compliance.') : undefined
      });
      await loadOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to execute sign-off');
    }
  };

  if (!isOpen) return null;

  const currentIncident = overview?.primaryActiveIncident;
  const currentSignoff = overview?.recentReleaseSignoffs[0];
  const activeStatement = overview?.holdingStatements[0];

  return (
    <div className="comms-nexus-backdrop" role="dialog" aria-modal="true" data-testid="strategic-comms-crisis-nexus-modal">
      <div className="comms-nexus-container">
        <header className="comms-nexus-header">
          <div className="comms-nexus-title-group">
            <div className="comms-nexus-icon-badge">SCCN</div>
            <div>
              <h2 className="comms-nexus-title">
                Strategic Communications, Crisis Management & Media Intelligence Nexus
              </h2>
              <div className="comms-nexus-subtitle">
                Reputation Governance &bull; PSLRA Safe-Harbor Disclaimers &bull; Reg FD Dissemination &bull; Tripartite Digital Release Authority
              </div>
            </div>
          </div>
          <button
            className="comms-nexus-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            data-testid="close-comms-nexus-modal"
          >
            &times;
          </button>
        </header>

        <div className="comms-golden-hour-bar">
          <div className="comms-clock-pill">
            <span>&#9201;</span>
            <span>41:52 Remaining (Golden Hour Triage Clock)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <span className="comms-nexus-badge comms-badge-crimson">
              LEVEL 4: ACUTE ENTERPRISE CRISIS
            </span>
            <span className="comms-nexus-badge comms-badge-amber">
              PLAYBOOK: CYBER RANSOMWARE BREACH
            </span>
            <span className="comms-nexus-badge comms-badge-emerald">
              SEC ITEM 1.05 4-DAY CLOCK ACTIVE
            </span>
          </div>
        </div>

        <nav className="comms-nexus-tabs">
          <button
            className={`comms-nexus-tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
            data-testid="tab-crisis-severity-matrix"
          >
            Incident Severity & Response Matrix
          </button>
          <button
            className={`comms-nexus-tab-btn ${activeTab === 'intelligence' ? 'active' : ''}`}
            onClick={() => setActiveTab('intelligence')}
            data-testid="tab-media-intelligence-radar"
          >
            Media Intelligence & Viral Vector Radar
          </button>
          <button
            className={`comms-nexus-tab-btn ${activeTab === 'holding' ? 'active' : ''}`}
            onClick={() => setActiveTab('holding')}
            data-testid="tab-stakeholder-holding-studio"
          >
            Stakeholder Impact & Holding Studio
          </button>
          <button
            className={`comms-nexus-tab-btn ${activeTab === 'moat' ? 'active' : ''}`}
            onClick={() => setActiveTab('moat')}
            data-testid="tab-spokesperson-fact-moat"
          >
            Spokesperson Briefing & Fact Moat
          </button>
          <button
            className={`comms-nexus-tab-btn ${activeTab === 'warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('warroom')}
            data-testid="tab-board-warroom-tripartite"
          >
            Board War Room & Tripartite Release
          </button>
        </nav>

        {errorMessage && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', color: '#fca5a5', padding: '0.75rem 1.75rem', fontSize: '0.85rem' }}>
            {errorMessage}
          </div>
        )}

        <main className="comms-nexus-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              Synthesizing crisis telemetry and reputation metrics...
            </div>
          ) : (
            <>
              {activeTab === 'matrix' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="comms-nexus-grid-2">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Active Incident Command Overview</div>
                      {currentIncident ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                            {currentIncident.title}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                            {currentIncident.summary}
                          </div>
                          <div className="comms-nexus-grid-2" style={{ gap: '0.6rem' }}>
                            <div className="comms-nexus-outcome-box">
                              <span style={{ color: '#94a3b8' }}>Commander:</span>
                              <span style={{ fontWeight: 600 }}>{currentIncident.incidentCommander}</span>
                            </div>
                            <div className="comms-nexus-outcome-box">
                              <span style={{ color: '#94a3b8' }}>Comms Lead:</span>
                              <span style={{ fontWeight: 600 }}>{currentIncident.communicationsLead}</span>
                            </div>
                            <div className="comms-nexus-outcome-box">
                              <span style={{ color: '#94a3b8' }}>Legal Counsel:</span>
                              <span style={{ fontWeight: 600 }}>{currentIncident.legalCounselLead}</span>
                            </div>
                            <div className="comms-nexus-outcome-box">
                              <span style={{ color: '#94a3b8' }}>Technical Lead:</span>
                              <span style={{ fontWeight: 600 }}>{currentIncident.technicalLead}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8' }}>No active incident. Declare incident below.</div>
                      )}
                    </div>

                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Declare New Crisis Incident</div>
                      <form onSubmit={handleDeclareIncident} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Incident Title</label>
                          <input
                            type="text"
                            className="comms-nexus-input"
                            value={newIncidentTitle}
                            onChange={e => setNewIncidentTitle(e.target.value)}
                            placeholder="e.g. Critical Zero-Day Auth Gateway Bypass"
                            data-testid="incident-title-input"
                          />
                        </div>
                        <div className="comms-nexus-grid-2" style={{ gap: '0.6rem' }}>
                          <div className="comms-nexus-form-group">
                            <label className="comms-nexus-label">Crisis Playbook</label>
                            <select
                              className="comms-nexus-select"
                              value={newIncidentPlaybook}
                              onChange={e => setNewIncidentPlaybook(e.target.value as any)}
                              data-testid="incident-playbook-select"
                            >
                              <option value="cyber_ransomware_data_breach">Cyber Ransomware Data Breach</option>
                              <option value="product_critical_failure_recall">Product Critical Failure & Recall</option>
                              <option value="executive_misconduct_scandal">Executive Misconduct Scandal</option>
                              <option value="short_seller_bear_raid_attack">Short Seller Bear Raid Attack</option>
                              <option value="regulatory_enforcement_subpoena">Regulatory Enforcement Subpoena</option>
                            </select>
                          </div>
                          <div className="comms-nexus-form-group">
                            <label className="comms-nexus-label">Severity Level</label>
                            <select
                              className="comms-nexus-select"
                              value={newIncidentSeverity}
                              onChange={e => setNewIncidentSeverity(e.target.value as any)}
                              data-testid="incident-severity-select"
                            >
                              <option value="level_1_operational_anomaly">Level 1: Operational Anomaly</option>
                              <option value="level_2_contained_incident">Level 2: Contained Incident</option>
                              <option value="level_3_serious_reputational_threat">Level 3: Serious Threat</option>
                              <option value="level_4_acute_enterprise_crisis">Level 4: Acute Enterprise Crisis</option>
                              <option value="level_5_existential_catastrophe">Level 5: Existential Catastrophe</option>
                            </select>
                          </div>
                        </div>
                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Technical Blast Radius & Summary</label>
                          <textarea
                            className="comms-nexus-textarea"
                            value={newIncidentSummary}
                            onChange={e => setNewIncidentSummary(e.target.value)}
                            placeholder="Provide confirmed forensic and operational telemetry details..."
                            data-testid="incident-summary-input"
                          />
                        </div>
                        <button type="submit" className="comms-nexus-btn-primary" data-testid="btn-declare-crisis-incident">
                          Engage Crisis Command Protocol
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="comms-nexus-card">
                    <div className="comms-nexus-card-title">Golden Hour 60-Minute Triage Checklist & Checkpoints</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {currentIncident?.checkpoints.map(cp => (
                        <div key={cp.id} className="comms-nexus-outcome-box">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <span style={{ color: cp.isCompleted ? '#10b981' : '#64748b', fontSize: '1.2rem', fontWeight: 800 }}>
                              {cp.isCompleted ? '✓' : '○'}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: '#f8fafc' }}>
                                T+{cp.targetMinutes.toString().padStart(2, '0')}: {cp.milestone.replace(/^t_\d+_/,'').replace(/_/g, ' ').toUpperCase()}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{cp.notes}</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="comms-nexus-badge comms-badge-blue">{cp.assignedLead}</span>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem' }}>
                              {cp.isCompleted ? `Completed: ${new Date(cp.completedAt || '').toLocaleTimeString()}` : 'Pending Action'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'intelligence' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="comms-nexus-grid-4">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-label">Net Sentiment Score (NSS)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: overview?.mediaSummary.netSentimentScore! < 0 ? '#ef4444' : '#10b981' }}>
                        {overview?.mediaSummary.netSentimentScore}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scale: [-100 (Hostile) to +100]</div>
                    </div>
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-label">Narrative Velocity Index (NVI)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24' }}>
                        {overview?.mediaSummary.narrativeVelocityIndex}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hourly Acceleration & Syndication</div>
                    </div>
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-label">Viral Vector (R_0)</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: overview?.mediaSummary.viralPropagationVector! > 1.0 ? '#ef4444' : '#10b981' }}>
                        {overview?.mediaSummary.viralPropagationVector}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Epidemic Dispersion Threshold = 1.0</div>
                    </div>
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-label">Total Monitored Mentions</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa' }}>
                        {overview?.mediaSummary.totalMentions}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tier-1 Wire, Print, Social Feeds</div>
                    </div>
                  </div>

                  {overview && overview.mediaSummary.viralPropagationVector > 1.0 && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontSize: '1.8rem', color: '#ef4444' }}>&#9888;</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#f87171' }}>
                          EPIDEMIC CONTAGION ALERT: Narrative Viral Vector R_0 = {overview.mediaSummary.viralPropagationVector} &gt; 1.0
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                          Social amplification and bot syndication exceed self-sustaining threshold. Outbound verified holding statements required to break transmission loop.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="comms-nexus-grid-2">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Top Narrative Clusters & Hostile Campaigns</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {overview?.mediaSummary.topNarrativeClusters.map(nc => (
                          <div key={nc.id} className="comms-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{nc.clusterTitle}</span>
                              {nc.isAdversarialCampaign && (
                                <span className="comms-nexus-badge comms-badge-crimson">ADVERSARIAL BOT CAMPAIGN</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{nc.dominantTheme}</div>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                              <span>Mentions: <b>{nc.mentionCount}</b></span>
                              <span>NSS: <b style={{ color: nc.netSentimentScore < 0 ? '#ef4444' : '#10b981' }}>{nc.netSentimentScore}</b></span>
                              <span>Velocity: <b>{nc.narrativeVelocityIndex}</b></span>
                              <span>R_0: <b>{nc.viralPropagationVector}</b></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Recent Real-Time Wire & Media Telemetry</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {overview?.mediaSummary.recentMentions.map(m => (
                          <div key={m.id} className="comms-nexus-outcome-box">
                            <div>
                              <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>{m.headline}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {m.sourceOutlet} &bull; Reach: {m.reachEstimate.toLocaleString()}
                              </div>
                            </div>
                            <span className={`comms-nexus-badge ${m.sentiment === 'positive' ? 'comms-badge-emerald' : m.sentiment === 'neutral' ? 'comms-badge-blue' : m.sentiment === 'negative' ? 'comms-badge-amber' : 'comms-badge-crimson'}`}>
                              {m.sentiment.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'holding' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="comms-nexus-grid-2">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Draft Omnichannel Holding Statement</div>
                      <form onSubmit={handleCreateHoldingStatement} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Target Stakeholder Tier</label>
                          <select
                            className="comms-nexus-select"
                            value={holdingTier}
                            onChange={e => setHoldingTier(e.target.value as any)}
                            data-testid="holding-statement-tier"
                          >
                            <option value="tier_1_workforce_employees">Tier 1: Workforce & Employees</option>
                            <option value="tier_2_institutional_investors">Tier 2: Institutional Investors (SEC Reg FD)</option>
                            <option value="tier_3_enterprise_customers">Tier 3: Enterprise Customers</option>
                            <option value="tier_4_regulators_government">Tier 4: Regulators & Government</option>
                            <option value="tier_5_media_general_public">Tier 5: Media & Public</option>
                          </select>
                        </div>

                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Tone Calibration</label>
                          <select
                            className="comms-nexus-select"
                            value={holdingTone}
                            onChange={e => setHoldingTone(e.target.value as any)}
                            data-testid="holding-statement-tone"
                          >
                            <option value="authoritative_transparent">Authoritative & Transparent</option>
                            <option value="empathetic_reassuring">Empathetic & Reassuring</option>
                            <option value="firm_litigation_ready">Firm & Litigation-Ready</option>
                            <option value="regulatory_compliant_measured">Regulatory Compliant & Measured</option>
                            <option value="urgent_corrective">Urgent & Corrective</option>
                          </select>
                        </div>

                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Statement Headline</label>
                          <input
                            type="text"
                            className="comms-nexus-input"
                            value={holdingHeadline}
                            onChange={e => setHoldingHeadline(e.target.value)}
                            placeholder="e.g. JobTrack Statement on Security Protocol Enforcement"
                            data-testid="holding-statement-headline"
                          />
                        </div>

                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Statement Body Text</label>
                          <textarea
                            className="comms-nexus-textarea"
                            value={holdingBody}
                            onChange={e => setHoldingBody(e.target.value)}
                            placeholder="Draft factual, verified statement without speculation..."
                            data-testid="holding-statement-body"
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <input
                              type="checkbox"
                              checked={includePslra}
                              onChange={e => setIncludePslra(e.target.checked)}
                            />
                            PSLRA 1995 Safe-Harbor
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#cbd5e1' }}>
                            <input
                              type="checkbox"
                              checked={includeRegFd}
                              onChange={e => setIncludeRegFd(e.target.checked)}
                            />
                            Regulation FD Non-Selectivity
                          </label>
                        </div>

                        <button type="submit" className="comms-nexus-btn-primary" data-testid="btn-draft-holding-statement">
                          Submit for Legal Review & Tripartite Sign-Off
                        </button>
                      </form>
                    </div>

                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Stakeholder Impact Profiles & SLA Matrix</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {overview?.stakeholderProfiles.map(st => (
                          <div key={st.id} className="comms-nexus-outcome-box">
                            <div>
                              <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.85rem' }}>
                                {st.targetAudience}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Concern: {st.primaryConcern}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                                Channel: {st.preferredChannel}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span className="comms-nexus-badge comms-badge-amber">SLA: {st.requiredDeliverySlaMinutes}m</span>
                              <div style={{ marginTop: '0.3rem' }}>
                                <span className={`comms-nexus-badge ${st.channelDelivered ? 'comms-badge-emerald' : 'comms-badge-blue'}`}>
                                  {st.channelDelivered ? 'DISPATCHED' : 'QUEUED'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="comms-nexus-card">
                    <div className="comms-nexus-card-title">Holding Statements & Releases In Pipeline</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {overview?.holdingStatements.map(stmt => (
                        <div key={stmt.id} className="comms-nexus-outcome-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.95rem' }}>{stmt.headline}</span>
                            <span className="comms-nexus-badge comms-badge-emerald">v{stmt.version} &bull; {stmt.status.toUpperCase()}</span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>{stmt.bodyText}</div>
                          {stmt.safeHarborDisclaimer && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '4px' }}>
                              {stmt.safeHarborDisclaimer}
                            </div>
                          )}
                          <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>
                            Content Hash: {stmt.contentHashSha256}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'moat' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="comms-nexus-grid-2">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Executive Spokesperson Briefing Card</div>
                      {overview?.spokespersonCards[0] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '1rem' }}>
                                {overview.spokespersonCards[0].spokespersonName}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                {overview.spokespersonCards[0].spokespersonRole}
                              </div>
                            </div>
                            <span className="comms-nexus-badge comms-badge-emerald">BRIEFING LOCKED</span>
                          </div>

                          <div style={{ background: '#080d1a', padding: '0.8rem', borderRadius: '6px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                              Core Talking Points (Sticky Messages)
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                              {overview.spokespersonCards[0].coreTalkingPoints.map((tp, idx) => (
                                <li key={idx}>{tp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="comms-nexus-grid-2" style={{ gap: '0.6rem' }}>
                            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.2)' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                Mandatory Phrases
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                {overview.spokespersonCards[0].mandatoryPhrases.map((mp, idx) => (
                                  <li key={idx}>{mp}</li>
                                ))}
                              </ul>
                            </div>

                            <div style={{ background: 'rgba(239,68,68,0.08)', padding: '0.8rem', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                                Prohibited Trap Phrases
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                                {overview.spokespersonCards[0].prohibitedPhrases.map((pp, idx) => (
                                  <li key={idx}>{pp}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Add Hostile Q&A Bridge Technique</div>
                      <form onSubmit={handleAddQa} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Hostile / Adversarial Interrogation Question</label>
                          <input
                            type="text"
                            className="comms-nexus-input"
                            value={qaQuestion}
                            onChange={e => setQaQuestion(e.target.value)}
                            placeholder="e.g. Isn't this failure proof of executive negligence?"
                            data-testid="qa-question-input"
                          />
                        </div>
                        <div className="comms-nexus-grid-2" style={{ gap: '0.6rem' }}>
                          <div className="comms-nexus-form-group">
                            <label className="comms-nexus-label">Anticipated Outlet</label>
                            <input
                              type="text"
                              className="comms-nexus-input"
                              value={qaOutlet}
                              onChange={e => setQaOutlet(e.target.value)}
                              placeholder="e.g. Wall Street Journal"
                            />
                          </div>
                          <div className="comms-nexus-form-group">
                            <label className="comms-nexus-label">ABC Bridge Technique</label>
                            <select
                              className="comms-nexus-select"
                              value={qaTechnique}
                              onChange={e => setQaTechnique(e.target.value as any)}
                              data-testid="qa-technique-select"
                            >
                              <option value="bridge_to_facts">Bridge to Facts</option>
                              <option value="bridge_to_values">Bridge to Values</option>
                              <option value="bridge_to_action">Bridge to Action</option>
                              <option value="bridge_to_context">Bridge to Context</option>
                              <option value="flag_key_takeaway">Flag Key Takeaway</option>
                            </select>
                          </div>
                        </div>
                        <div className="comms-nexus-form-group">
                          <label className="comms-nexus-label">Pivot Message & Verified Counter-Evidence</label>
                          <textarea
                            className="comms-nexus-textarea"
                            value={qaPivot}
                            onChange={e => setQaPivot(e.target.value)}
                            placeholder="What the verified engineering and forensic evidence proves is..."
                            data-testid="qa-pivot-input"
                          />
                        </div>
                        <button type="submit" className="comms-nexus-btn-primary" data-testid="btn-add-qa-bridge">
                          Fortify Q&A Bridge Matrix
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="comms-nexus-card">
                    <div className="comms-nexus-card-title">Verified Fact Moat vs Uncorroborated Rumors</div>
                    <form onSubmit={handleAddFact} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.8rem', marginBottom: '1rem', alignItems: 'flex-end' }}>
                      <div className="comms-nexus-form-group">
                        <label className="comms-nexus-label">Fact Claim</label>
                        <input
                          type="text"
                          className="comms-nexus-input"
                          value={factClaim}
                          onChange={e => setFactClaim(e.target.value)}
                          placeholder="e.g. Client databases encrypted with AES-256"
                          data-testid="fact-claim-input"
                        />
                      </div>
                      <div className="comms-nexus-form-group">
                        <label className="comms-nexus-label">Technical Corroboration</label>
                        <input
                          type="text"
                          className="comms-nexus-input"
                          value={factCorroboration}
                          onChange={e => setFactCorroboration(e.target.value)}
                          placeholder="e.g. AWS KMS audit logs & Mandiant report"
                          data-testid="fact-corroboration-input"
                        />
                      </div>
                      <div className="comms-nexus-form-group">
                        <label className="comms-nexus-label">Refuted External Rumor</label>
                        <input
                          type="text"
                          className="comms-nexus-input"
                          value={factRefutedRumor}
                          onChange={e => setFactRefutedRumor(e.target.value)}
                          placeholder="e.g. Claims of unencrypted plaintext leaks"
                        />
                      </div>
                      <button type="submit" className="comms-nexus-btn-primary" data-testid="btn-add-fact-moat" style={{ whiteSpace: 'nowrap' }}>
                        Register Fact
                      </button>
                    </form>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {overview?.factMoatSummary.entries.map(fact => (
                        <div key={fact.id} className="comms-nexus-outcome-box">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>{fact.factClaim}</div>
                            <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>Corroboration: {fact.technicalCorroboration}</div>
                            {fact.refutedRumor && (
                              <div style={{ fontSize: '0.75rem', color: '#f87171' }}>Refutes Rumor: {fact.refutedRumor}</div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span className="comms-nexus-badge comms-badge-emerald">VERIFIED</span>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.2rem' }}>{fact.evidenceReferenceId}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'warroom' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div className="comms-nexus-grid-2">
                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Brand Reputation Resilience Index (BRRI)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', margin: '0.5rem 0' }}>
                        <div style={{ fontSize: '3rem', fontWeight: 900, color: overview?.resilienceIndex.compositeScore! >= 70 ? '#10b981' : '#fbbf24' }}>
                          {overview?.resilienceIndex.compositeScore}
                        </div>
                        <div>
                          <span className="comms-nexus-badge comms-badge-emerald" style={{ fontSize: '0.85rem' }}>
                            {overview?.resilienceIndex.resilienceBand.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.3rem' }}>
                            Composite multi-vector score evaluating sentiment stability, velocity damping, and fact fortification.
                          </div>
                        </div>
                      </div>

                      <div className="comms-nexus-grid-2" style={{ gap: '0.6rem' }}>
                        <div className="comms-nexus-outcome-box">
                          <span style={{ color: '#94a3b8' }}>Sentiment Stability:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.resilienceIndex.sentimentStabilityScore}%</span>
                        </div>
                        <div className="comms-nexus-outcome-box">
                          <span style={{ color: '#94a3b8' }}>Velocity Mitigation:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.resilienceIndex.velocityMitigationFactor}%</span>
                        </div>
                        <div className="comms-nexus-outcome-box">
                          <span style={{ color: '#94a3b8' }}>Viral Containment:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.resilienceIndex.viralContainmentRatio}%</span>
                        </div>
                        <div className="comms-nexus-outcome-box">
                          <span style={{ color: '#94a3b8' }}>Fact Fortification:</span>
                          <span style={{ fontWeight: 700 }}>{overview?.resilienceIndex.factMoatFortificationScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="comms-nexus-card">
                      <div className="comms-nexus-card-title">Tripartite Digital Release Authority Gate</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                        Sequential cryptographic authorization required for all external holding statements under SEC Rule 10b-5.
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="comms-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>1. Head of Strategic Communications</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Narrative alignment & spokesperson sign-off</div>
                          </div>
                          {currentSignoff?.headOfCommsSignoff?.isSigned ? (
                            <span className="comms-nexus-badge comms-badge-emerald">SIGNED: {currentSignoff.headOfCommsSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="comms-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('head_of_communications', 'Marcus Vance')}
                              data-testid="signoff-comms-btn"
                            >
                              Sign as Comms Head
                            </button>
                          )}
                        </div>

                        <div className="comms-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>2. Chief Legal Officer (CLO)</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PSLRA Safe Harbor & Regulation FD audit</div>
                          </div>
                          {currentSignoff?.chiefLegalOfficerSignoff?.isSigned ? (
                            <span className="comms-nexus-badge comms-badge-emerald">SIGNED: {currentSignoff.chiefLegalOfficerSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="comms-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('chief_legal_officer', 'Rachel Thorne, General Counsel')}
                              data-testid="signoff-clo-btn"
                            >
                              Sign as Chief Legal Officer
                            </button>
                          )}
                        </div>

                        <div className="comms-nexus-outcome-box">
                          <div>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>3. Chief Executive Officer (CEO)</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Final fiduciary ratification & release authorization</div>
                          </div>
                          {currentSignoff?.ceoSignoff?.isSigned ? (
                            <span className="comms-nexus-badge comms-badge-emerald">SIGNED: {currentSignoff.ceoSignoff.signoffSignerName}</span>
                          ) : (
                            <button
                              className="comms-nexus-btn-primary"
                              onClick={() => handleExecuteSignoff('chief_executive_officer', 'Elena Sterling, CEO')}
                              data-testid="signoff-ceo-btn"
                            >
                              Sign as CEO
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: '#080d1a', borderRadius: '6px', textAlign: 'center' }}>
                        {currentSignoff?.isFullyAuthorized ? (
                          <div style={{ color: '#10b981', fontWeight: 800 }}>
                            &#10003; FULL TRIPARTITE RATIFICATION CONFIRMED &bull; AUTHORIZED FOR OMNICHANNEL DISPATCH
                          </div>
                        ) : (
                          <div style={{ color: '#fbbf24', fontWeight: 600, fontSize: '0.85rem' }}>
                            Awaiting complete tripartite sign-off before wire transmission release
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="comms-nexus-card">
                    <div className="comms-nexus-card-title">Chronological Crisis Event Log</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="comms-nexus-outcome-box">
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>T-18m</span>
                        <span style={{ color: '#f8fafc' }}>Automated SIEM intrusion alert raised to Incident Response Commander</span>
                        <span className="comms-nexus-badge comms-badge-blue">SOC MONITOR</span>
                      </div>
                      <div className="comms-nexus-outcome-box">
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>T-12m</span>
                        <span style={{ color: '#f8fafc' }}>Mandiant DFIR forensics deployed to verify data vault encryption boundaries</span>
                        <span className="comms-nexus-badge comms-badge-emerald">FORENSICS</span>
                      </div>
                      <div className="comms-nexus-outcome-box">
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>T-06m</span>
                        <span style={{ color: '#f8fafc' }}>Head of Communications approved investor holding statement v1 draft</span>
                        <span className="comms-nexus-badge comms-badge-amber">COMMS SIGN</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>

        <footer className="comms-nexus-footer">
          <div>Enterprise Strategic Communications &bull; Fiduciary Reputation Shield &bull; SEC Regulation FD Compliant</div>
          <button className="comms-nexus-footer-btn" onClick={onClose}>Close Command Nexus</button>
        </footer>
      </div>
    </div>
  );
};
