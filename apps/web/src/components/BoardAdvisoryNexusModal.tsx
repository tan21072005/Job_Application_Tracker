import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  TrendingUp,
  ShieldAlert,
  Award,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import {
  type BoardMandateDTO,
  type BoardMandateMutationDTO,
  type FastEquityDilutionModelDTO,
  type ConflictOfInterestCheckDTO,
  type OutsideBoardWaiverLetterDTO,
  type GovernanceMatrixDTO,
  type BoardDossierDTO,
  type CompanyGrowthStage,
  type AdvisoryImpactLevel,
  type BoardMandateType,
  type MandatePipelineStage,
  computeFastEquityDilutionModel,
  evaluateConflictOfInterest,
  computeGovernanceQuotient,
  generateOutsideBoardWaiverLetter,
  generateBoardDossierMarkdown
} from '../domain';
import { boardAdvisoryNexusRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'mandates' | 'equity_modeler' | 'coi_guard' | 'gq_matrix' | 'dossier';

export const BoardAdvisoryNexusModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('mandates');
  const [mandates, setMandates] = useState<BoardMandateDTO[]>([]);
  const [selectedMandateId, setSelectedMandateId] = useState<string>('');
  const [matrix, setMatrix] = useState<GovernanceMatrixDTO | null>(null);
  const [dossier, setDossier] = useState<BoardDossierDTO | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLetter, setCopiedLetter] = useState<boolean>(false);
  const [isAddingMandate, setIsAddingMandate] = useState<boolean>(false);

  const [modelStage, setModelStage] = useState<CompanyGrowthStage>('seed_stage');
  const [modelImpact, setModelImpact] = useState<AdvisoryImpactLevel>('strategic');
  const [modelRounds, setModelRounds] = useState<number>(2);
  const [modelDilution, setModelDilution] = useState<number>(0.2);

  const [primaryEmployerName, setPrimaryEmployerName] = useState<string>('Acme Cloud AI');
  const [isDirectCompetitor, setIsDirectCompetitor] = useState<boolean>(false);
  const [isAdjacentMarket, setIsAdjacentMarket] = useState<boolean>(true);
  const [primaryCapitalMillions, setPrimaryCapitalMillions] = useState<number>(65);
  const [targetCapitalMillions, setTargetCapitalMillions] = useState<number>(25);
  const [hasIpOverlap, setHasIpOverlap] = useState<boolean>(false);
  const [hasHardwareSegregation, setHasHardwareSegregation] = useState<boolean>(true);
  const [waiverLetter, setWaiverLetter] = useState<string>('');

  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newMandateType, setNewMandateType] = useState<BoardMandateType>('advisory_board');
  const [newStage, setNewStage] = useState<MandatePipelineStage>('initial_dialogue');
  const [newRetainer, setNewRetainer] = useState<number>(15000);
  const [newEquity, setNewEquity] = useState<number>(0.3);
  const [newHours, setNewHours] = useState<number>(5);
  const [newNotes, setNewNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const list = await boardAdvisoryNexusRepository.listMandates();
    setMandates(list);
    if (list.length > 0 && !selectedMandateId) {
      setSelectedMandateId(list[0].id);
    }
    const mat = await boardAdvisoryNexusRepository.getGovernanceMatrix();
    setMatrix(mat);
    const dos = await boardAdvisoryNexusRepository.getBoardDossier();
    setDossier(dos);
  };

  if (!isOpen) return null;

  const selectedMandate = mandates.find(m => m.id === selectedMandateId) || mandates[0] || null;

  const dilutionModel: FastEquityDilutionModelDTO | null = selectedMandate
    ? computeFastEquityDilutionModel(
        selectedMandate,
        modelStage,
        modelImpact,
        modelRounds,
        modelDilution,
        0.2
      )
    : null;

  const coiCheck: ConflictOfInterestCheckDTO | null = selectedMandate
    ? evaluateConflictOfInterest(
        selectedMandate,
        primaryEmployerName,
        isDirectCompetitor,
        isAdjacentMarket,
        primaryCapitalMillions,
        targetCapitalMillions,
        hasIpOverlap,
        hasHardwareSegregation
      )
    : null;

  const handleCopyDossier = () => {
    if (dossier?.boardDossierMarkdown) {
      navigator.clipboard.writeText(dossier.boardDossierMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateWaiver = () => {
    if (!selectedMandate || !coiCheck) return;
    const letter = generateOutsideBoardWaiverLetter(
      coiCheck,
      'Alex Rivera',
      'Eleanor Vance, Esq.',
      'VP of Engineering'
    );
    setWaiverLetter(letter);
  };

  const handleCopyLetter = () => {
    if (waiverLetter) {
      navigator.clipboard.writeText(waiverLetter);
      setCopiedLetter(true);
      setTimeout(() => setCopiedLetter(false), 2000);
    }
  };

  const handleSaveMatrixPillars = async (field: keyof GovernanceMatrixDTO, value: number) => {
    if (!matrix) return;
    const updatedMutation = {
      fiduciaryAcumenScore: field === 'fiduciaryAcumenScore' ? value : matrix.fiduciaryAcumenScore,
      cyberAuditOversightScore: field === 'cyberAuditOversightScore' ? value : matrix.cyberAuditOversightScore,
      aiGovernanceEthicsScore: field === 'aiGovernanceEthicsScore' ? value : matrix.aiGovernanceEthicsScore,
      executiveCompensationScore: field === 'executiveCompensationScore' ? value : matrix.executiveCompensationScore,
      boardroomPresenceDissentScore: field === 'boardroomPresenceDissentScore' ? value : matrix.boardroomPresenceDissentScore,
      verifiedCredentials: matrix.verifiedCredentials
    };
    const saved = await boardAdvisoryNexusRepository.updateGovernanceMatrix(updatedMutation);
    setMatrix(saved);
    const dos = await boardAdvisoryNexusRepository.getBoardDossier();
    setDossier(dos);
  };

  const handleCreateMandate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) return;

    const payload: BoardMandateMutationDTO = {
      targetCompanyName: newCompanyName.trim(),
      mandateType: newMandateType,
      stage: newStage,
      annualCashRetainer: Number(newRetainer) || 0,
      meetingFeePerBoardMeeting: 1000,
      meetingFeePerCommitteeMeeting: 500,
      expectedBoardMeetingsPerYear: 4,
      expectedCommitteeMeetingsPerYear: 4,
      equityPercentage: Number(newEquity) || 0.25,
      equityGrantType: 'nso_options',
      vestingSchedule: 'two_year_monthly_no_cliff',
      accelerationClause: 'single_trigger_change_of_control',
      optionStrikePrice: 1000,
      timeCommitmentHoursPerMonth: Number(newHours) || 4,
      termLengthYears: 2,
      committeeAssignments: ['tech_cybersecurity'],
      hasDAndOInsurance: true,
      dAndOPolicyLimitMillions: 10,
      hasSideADicCoverage: true,
      hasIndemnificationAgreement: true,
      notes: newNotes.trim() || 'Strategic executive advisory'
    };

    const created = await boardAdvisoryNexusRepository.createMandate(payload);
    setMandates(prev => [created, ...prev]);
    setSelectedMandateId(created.id);
    setIsAddingMandate(false);
    setNewCompanyName('');
    setNewNotes('');
    const dos = await boardAdvisoryNexusRepository.getBoardDossier();
    setDossier(dos);
  };

  return (
    <div className="ban-modal-overlay">
      <div className="ban-modal">
        <header className="ban-header">
          <div className="ban-header-left">
            <div className="ban-icon-box">
              <Scale size={24} />
            </div>
            <div>
              <h1 className="ban-header-title">Executive Board & Advisory Governance Nexus</h1>
              <p className="ban-header-sub">
                Corporate Board Diligence · FAST Equity Modeling · Clayton Act Antitrust Guard · Governance Quotient (GQ)
              </p>
            </div>
          </div>
          <button className="ban-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </header>

        <nav className="ban-nav-tabs">
          <button
            className={`ban-tab-btn ${activeTab === 'mandates' ? 'active' : ''}`}
            onClick={() => setActiveTab('mandates')}
          >
            <Briefcase size={16} />
            Board Mandates ({mandates.length})
          </button>
          <button
            className={`ban-tab-btn ${activeTab === 'equity_modeler' ? 'active' : ''}`}
            onClick={() => setActiveTab('equity_modeler')}
          >
            <TrendingUp size={16} />
            FAST Equity Modeler
          </button>
          <button
            className={`ban-tab-btn ${activeTab === 'coi_guard' ? 'active' : ''}`}
            onClick={() => setActiveTab('coi_guard')}
          >
            <ShieldAlert size={16} />
            COI & Antitrust Guard
          </button>
          <button
            className={`ban-tab-btn ${activeTab === 'gq_matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('gq_matrix')}
          >
            <Award size={16} />
            Governance Quotient ({matrix?.governanceQuotient || 0})
          </button>
          <button
            className={`ban-tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
            onClick={() => setActiveTab('dossier')}
          >
            <FileText size={16} />
            Board CV & Dossier
          </button>
        </nav>

        <main className="ban-content">
          {activeTab === 'mandates' && (
            <>
              <div className="ban-card-grid">
                <div className="ban-card">
                  <div className="ban-card-title">Active Mandates</div>
                  <div className="ban-card-value">{mandates.length}</div>
                  <div className="ban-card-sub">Advisory & Board seats tracked</div>
                </div>
                <div className="ban-card">
                  <div className="ban-card-title">Fiduciary Board Seats</div>
                  <div className="ban-card-value">
                    {mandates.filter(m => m.mandateType === 'board_of_directors').length}
                  </div>
                  <div className="ban-card-sub">Corporate Board of Directors</div>
                </div>
                <div className="ban-card">
                  <div className="ban-card-title">Total Annual Retainers</div>
                  <div className="ban-card-value">
                    ${mandates.reduce((acc, m) => acc + m.annualCashRetainer, 0).toLocaleString()}
                  </div>
                  <div className="ban-card-sub">Excluding per-meeting cash fees</div>
                </div>
                <div className="ban-card">
                  <div className="ban-card-title">Average Advisory Equity</div>
                  <div className="ban-card-value">
                    {mandates.length > 0
                      ? (mandates.reduce((acc, m) => acc + m.equityPercentage, 0) / mandates.length).toFixed(2)
                      : '0.00'}
                    %
                  </div>
                  <div className="ban-card-sub">Across all pipeline stages</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>Opportunity Pipeline</h3>
                <button
                  className="ban-tab-btn active"
                  style={{ background: 'var(--blue-600)', color: 'var(--white)', borderColor: 'var(--blue-600)' }}
                  onClick={() => setIsAddingMandate(!isAddingMandate)}
                >
                  <Plus size={15} />
                  Add Board Opportunity
                </button>
              </div>

              {isAddingMandate && (
                <form
                  onSubmit={handleCreateMandate}
                  style={{
                    background: 'var(--slate-50)',
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid var(--slate-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Target Company Name</label>
                      <input
                        type="text"
                        required
                        value={newCompanyName}
                        onChange={e => setNewCompanyName(e.target.value)}
                        placeholder="e.g. Acme AI Scaleup"
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Mandate Type</label>
                      <select
                        value={newMandateType}
                        onChange={e => setNewMandateType(e.target.value as BoardMandateType)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      >
                        <option value="advisory_board">Advisory Board</option>
                        <option value="board_of_directors">Board of Directors (Fiduciary)</option>
                        <option value="technical_advisory_council">Technical Advisory Council</option>
                        <option value="fractional_advisor">Fractional Advisor</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Stage</label>
                      <select
                        value={newStage}
                        onChange={e => setNewStage(e.target.value as MandatePipelineStage)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      >
                        <option value="initial_dialogue">Initial Dialogue</option>
                        <option value="nom_gov_interview">Nom & Gov Interview</option>
                        <option value="board_diligence">Board Diligence</option>
                        <option value="offer_term_sheet">Offer / Term Sheet</option>
                        <option value="formal_appointment">Formal Appointment</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Annual Retainer ($)</label>
                      <input
                        type="number"
                        value={newRetainer}
                        onChange={e => setNewRetainer(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Equity Grant (%)</label>
                      <input
                        type="number"
                        step="0.05"
                        value={newEquity}
                        onChange={e => setNewEquity(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Monthly Hours</label>
                      <input
                        type="number"
                        value={newHours}
                        onChange={e => setNewHours(Number(e.target.value))}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Mandate Scope & Notes</label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={e => setNewNotes(e.target.value)}
                      placeholder="e.g. Advising founders on engineering hiring and multi-region cloud deployment."
                      style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="ban-tab-btn"
                      onClick={() => setIsAddingMandate(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="ban-tab-btn active"
                      style={{ background: 'var(--blue-600)', color: 'var(--white)' }}
                    >
                      Save Mandate
                    </button>
                  </div>
                </form>
              )}

              <div className="ban-mandates-list">
                {mandates.map(m => (
                  <div
                    key={m.id}
                    className="ban-mandate-card"
                    style={{
                      borderLeft: m.id === selectedMandateId ? '4px solid var(--blue-600)' : '1px solid var(--slate-200)'
                    }}
                  >
                    <div className="ban-mandate-top">
                      <div>
                        <span className="ban-mandate-company">{m.targetCompanyName}</span>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'center' }}>
                          <span className="ban-mandate-type">{m.mandateType.replace(/_/g, ' ')}</span>
                          <span className="ban-mandate-stage">{m.stage.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {m.hasDAndOInsurance ? (
                          <span className="ban-badge ban-badge-verified">
                            D&O Insured (${m.dAndOPolicyLimitMillions}M)
                          </span>
                        ) : (
                          <span className="ban-badge ban-badge-pending">D&O Verification Pending</span>
                        )}
                        <button
                          className="ban-tab-btn"
                          style={{
                            padding: '6px 12px',
                            background: m.id === selectedMandateId ? 'var(--blue-50)' : 'var(--slate-100)',
                            color: m.id === selectedMandateId ? 'var(--blue-600)' : 'var(--slate-600)'
                          }}
                          onClick={() => {
                            setSelectedMandateId(m.id);
                            setActiveTab('equity_modeler');
                          }}
                        >
                          Model Equity
                        </button>
                      </div>
                    </div>

                    <div className="ban-mandate-terms">
                      <div>
                        <strong>Cash Retainer:</strong> ${m.annualCashRetainer.toLocaleString()}/yr
                      </div>
                      <div>
                        <strong>Equity Grant:</strong> {m.equityPercentage}% ({m.equityGrantType.replace(/_/g, ' ')})
                      </div>
                      <div>
                        <strong>Time Commitment:</strong> {m.timeCommitmentHoursPerMonth} hrs/mo
                      </div>
                      <div>
                        <strong>Acceleration:</strong> {m.accelerationClause.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="ban-mandate-notes">{m.notes}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'equity_modeler' && (
            <div className="ban-modeler-layout">
              <div className="ban-modeler-controls">
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Selected Opportunity</label>
                  <select
                    value={selectedMandateId}
                    onChange={e => setSelectedMandateId(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  >
                    {mandates.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.targetCompanyName} ({m.equityPercentage}%)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Company Growth Stage</label>
                  <select
                    value={modelStage}
                    onChange={e => setModelStage(e.target.value as CompanyGrowthStage)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  >
                    <option value="idea_stage">Idea / Pre-Seed</option>
                    <option value="seed_stage">Seed Stage</option>
                    <option value="series_a">Series A</option>
                    <option value="series_b_plus">Series B+ Growth</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Advisory Impact Level</label>
                  <select
                    value={modelImpact}
                    onChange={e => setModelImpact(e.target.value as AdvisoryImpactLevel)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  >
                    <option value="standard">Standard (~2.5 hrs/mo)</option>
                    <option value="strategic">Strategic (~5.0 hrs/mo)</option>
                    <option value="expert_intensive">Expert / Intensive (~10 hrs/mo)</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>
                    Future Dilution Rounds: {modelRounds}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={modelRounds}
                    onChange={e => setModelRounds(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '8px' }}
                  />
                </div>
              </div>

              {dilutionModel && (
                <>
                  <div className="ban-card-grid">
                    <div className="ban-card">
                      <div className="ban-card-title">FAST Benchmark</div>
                      <div className="ban-card-value">{dilutionModel.benchmark.benchmarkPercentage}%</div>
                      <div className="ban-card-sub">Founder Institute v2.0 Standard</div>
                    </div>
                    <div className="ban-card">
                      <div className="ban-card-title">Offered vs Benchmark</div>
                      <div
                        className="ban-card-value"
                        style={{ color: dilutionModel.benchmark.isFairMarketOrAbove ? 'var(--green-700)' : 'var(--red-700)' }}
                      >
                        {dilutionModel.benchmark.variancePercentage >= 0 ? '+' : ''}
                        {dilutionModel.benchmark.variancePercentage}%
                      </div>
                      <div className="ban-card-sub">
                        {dilutionModel.benchmark.isFairMarketOrAbove
                          ? 'Fair Market Value or Favorable'
                          : 'Below Recommended FAST Tier'}
                      </div>
                    </div>
                    <div className="ban-card">
                      <div className="ban-card-title">Retained Equity Post-Dilution</div>
                      <div className="ban-card-value">{dilutionModel.retainedEquityPercentage}%</div>
                      <div className="ban-card-sub">
                        After {modelRounds} financing round{modelRounds === 1 ? '' : 's'} (20% avg dilution)
                      </div>
                    </div>
                    <div className="ban-card">
                      <div className="ban-card-title">Total Invested Time</div>
                      <div className="ban-card-value">{dilutionModel.totalInvestedHours} hrs</div>
                      <div className="ban-card-sub">Over {selectedMandate?.termLengthYears || 2} year mandate term</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--white)', borderRadius: '14px', border: '1px solid var(--slate-200)', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--slate-900)' }}>
                        Exit Liquidation Scenarios & Effective Hourly Yields
                      </h3>
                    </div>
                    <table className="ban-scenarios-table">
                      <thead>
                        <tr>
                          <th>Exit Scenario</th>
                          <th>Exit Valuation</th>
                          <th>Gross Proceeds</th>
                          <th>Net Realization (after 20% tax)</th>
                          <th>Cash Retainers</th>
                          <th>Total Realized Compensation</th>
                          <th>Effective Hourly Yield</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dilutionModel.scenarios.map(s => (
                          <tr key={s.scenarioName}>
                            <td style={{ fontWeight: 700, textTransform: 'uppercase' }}>{s.scenarioName}</td>
                            <td>${s.exitValuationMillions}M</td>
                            <td>${s.grossProceedsUsd.toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: 'var(--green-700)' }}>
                              ${s.netProceedsUsd.toLocaleString()}
                            </td>
                            <td>${s.cumulativeCashRetainersUsd.toLocaleString()}</td>
                            <td style={{ fontWeight: 800, color: 'var(--blue-800)' }}>
                              ${s.totalCompensationUsd.toLocaleString()}
                            </td>
                            <td style={{ fontWeight: 800 }}>${s.effectiveHourlyYieldUsd.toLocaleString()} / hr</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'coi_guard' && (
            <div className="ban-coi-layout">
              <div className="ban-coi-controls">
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Primary Employer Name</label>
                  <input
                    type="text"
                    value={primaryEmployerName}
                    onChange={e => setPrimaryEmployerName(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Primary Employer Capital ($M)</label>
                  <input
                    type="number"
                    value={primaryCapitalMillions}
                    onChange={e => setPrimaryCapitalMillions(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-600)' }}>Target Company Capital ($M)</label>
                  <input
                    type="number"
                    value={targetCapitalMillions}
                    onChange={e => setTargetCapitalMillions(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--slate-300)', marginTop: '4px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isDirectCompetitor}
                      onChange={e => setIsDirectCompetitor(e.target.checked)}
                    />
                    Direct Competitor (Horizontal Market Overlap)
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={hasHardwareSegregation}
                      onChange={e => setHasHardwareSegregation(e.target.checked)}
                    />
                    Hardware & Accounts Strictly Segregated
                  </label>
                </div>
              </div>

              {coiCheck && (
                <div
                  style={{
                    background: 'var(--white)',
                    padding: '20px',
                    borderRadius: '14px',
                    border: '1px solid var(--slate-200)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>
                        Fiduciary & Antitrust Compliance Audit
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                        Evaluating appointment against Clayton Act Section 8 (15 U.S.C. § 19) and Delaware Duty of Loyalty
                      </p>
                    </div>
                    <div className={`ban-coi-score-badge ${coiCheck.coiTier}`}>
                      <span>Risk Score: {coiCheck.coiScore} / 100</span>
                      <span>({coiCheck.coiTier.replace(/_/g, ' ').toUpperCase()})</span>
                    </div>
                  </div>

                  {coiCheck.claytonActViolationRisk && (
                    <div
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        background: 'var(--red-100)',
                        border: '1px solid var(--red-300)',
                        color: 'var(--red-800)',
                        fontSize: '12px',
                        lineHeight: 1.5
                      }}
                    >
                      <strong>STATUTORY CLAYTON ACT PROHIBITION:</strong> {coiCheck.prohibitedReason}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <button
                      className="ban-tab-btn active"
                      style={{ background: 'var(--sky-600)', color: 'var(--white)' }}
                      onClick={handleGenerateWaiver}
                    >
                      Generate Outside Board Waiver Request Letter
                    </button>
                    {waiverLetter && (
                      <button className="ban-tab-btn" onClick={handleCopyLetter}>
                        {copiedLetter ? <Check size={16} /> : <Copy size={16} />}
                        {copiedLetter ? 'Copied to Clipboard!' : 'Copy Letter to Clipboard'}
                      </button>
                    )}
                  </div>

                  {waiverLetter && (
                    <div className="ban-dossier-box">
                      {waiverLetter}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'gq_matrix' && matrix && (
            <div className="ban-gq-layout">
              <div className="ban-card-grid">
                <div className="ban-card" style={{ gridColumn: 'span 2' }}>
                  <div className="ban-card-title">Governance Quotient (GQ)</div>
                  <div className="ban-card-value" style={{ color: 'var(--blue-700)' }}>
                    {matrix.governanceQuotient} / 100
                  </div>
                  <div className="ban-card-sub" style={{ fontWeight: 700, color: 'var(--blue-800)' }}>
                    {matrix.tier.replace(/_/g, ' ').toUpperCase()}
                  </div>
                </div>
                <div className="ban-card" style={{ gridColumn: 'span 2' }}>
                  <div className="ban-card-title">Qualified Board Committees</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {matrix.qualifiedCommittees.map(c => (
                      <span key={c} className="ban-badge ban-badge-verified">
                        {c.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="ban-gq-pillars">
                <div className="ban-gq-pillar">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--slate-900)' }}>Fiduciary Acumen (DGCL § 141)</strong>
                    <span style={{ fontWeight: 800, color: 'var(--blue-700)' }}>{matrix.fiduciaryAcumenScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={matrix.fiduciaryAcumenScore}
                    onChange={e => handleSaveMatrixPillars('fiduciaryAcumenScore', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                    Duty of Care, Duty of Loyalty, SOX 404 Financial Statements Literacy
                  </span>
                </div>

                <div className="ban-gq-pillar">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--slate-900)' }}>Cyber & Audit Oversight (SEC Item 106)</strong>
                    <span style={{ fontWeight: 800, color: 'var(--blue-700)' }}>{matrix.cyberAuditOversightScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={matrix.cyberAuditOversightScore}
                    onChange={e => handleSaveMatrixPillars('cyberAuditOversightScore', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                    SEC Form 8-K / 10-K cyber rules, ransomware response, NIST CSF 2.0
                  </span>
                </div>

                <div className="ban-gq-pillar">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--slate-900)' }}>AI Governance & Algorithmic Ethics</strong>
                    <span style={{ fontWeight: 800, color: 'var(--blue-700)' }}>{matrix.aiGovernanceEthicsScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={matrix.aiGovernanceEthicsScore}
                    onChange={e => handleSaveMatrixPillars('aiGovernanceEthicsScore', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                    EU AI Act conformity, algorithmic bias audits, IP training indemnity
                  </span>
                </div>

                <div className="ban-gq-pillar">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--slate-900)' }}>Executive Compensation & Talent</strong>
                    <span style={{ fontWeight: 800, color: 'var(--blue-700)' }}>{matrix.executiveCompensationScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={matrix.executiveCompensationScore}
                    onChange={e => handleSaveMatrixPillars('executiveCompensationScore', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                    Say-on-Pay benchmarks, option pool overhang, Dodd-Frank clawbacks
                  </span>
                </div>

                <div className="ban-gq-pillar">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--slate-900)' }}>Boardroom Presence & Strategic Dissent</strong>
                    <span style={{ fontWeight: 800, color: 'var(--blue-700)' }}>{matrix.boardroomPresenceDissentScore} / 100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={matrix.boardroomPresenceDissentScore}
                    onChange={e => handleSaveMatrixPillars('boardroomPresenceDissentScore', Number(e.target.value))}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)' }}>
                    Constructive dissent, CEO succession planning, executive sessions
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dossier' && dossier && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="ban-dossier-actions">
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Executive Board Biography & Governance Dossier
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                    Formatted specifically for Nominating & Corporate Governance Committees and Executive Search Partners
                  </p>
                </div>
                <button className="ban-tab-btn active" onClick={handleCopyDossier}>
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Dossier Markdown'}
                </button>
              </div>

              <div className="ban-dossier-box">
                {dossier.boardDossierMarkdown}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
