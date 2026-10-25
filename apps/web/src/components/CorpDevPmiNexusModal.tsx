import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  ShieldCheck,
  Building,
  Scale,
  Users,
  AlertTriangle,
  CheckCircle2,
  FileText,
  DollarSign,
  Briefcase,
  Layers,
  ArrowRight,
  Lock,
  Compass,
  PieChart,
  Sliders,
  Check
} from 'lucide-react';
import {
  type CorpDevOverviewDTO,
  type CorpDevTargetDTO,
  type VdrDiligenceStreamDTO,
  type VdrDiligenceFindingDTO,
  type DcfValuationModelDTO,
  type LboFinancialModelDTO,
  type SynergyModelDTO,
  type PurchasePriceAllocationDTO,
  type DealStructuringDTO,
  type AntitrustClearanceDTO,
  type PmiInitiativeDTO,
  type TalentRetentionDTO,
  type BoardWarRoomDTO,
  type FindingSeverity,
  type CorpDevSignoffRole,
  calculateDcfValuation,
  calculateLboReturns,
  calculateSynergyNpv,
  calculateFloatingCollarExchangeRatio,
  calculateAntitrustSecondRequestRisk,
  calculateStrategicFitScore,
  calculateDspiScore
} from '../domain';
import { corpDevPmiNexusRepository } from '../data';

interface CorpDevPmiNexusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CorpDevPmiNexusModal: React.FC<CorpDevPmiNexusModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'valuation' | 'structuring' | 'pmi' | 'warroom'>('pipeline');
  const [overview, setOverview] = useState<CorpDevOverviewDTO | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [targetDetails, setTargetDetails] = useState<{
    target: CorpDevTargetDTO;
    vdrStreams: VdrDiligenceStreamDTO[];
    findings: VdrDiligenceFindingDTO[];
    dcfModel: DcfValuationModelDTO | null;
    lboModel: LboFinancialModelDTO | null;
    synergies: SynergyModelDTO | null;
    ppa: PurchasePriceAllocationDTO | null;
    dealStructure: DealStructuringDTO | null;
    antitrust: AntitrustClearanceDTO | null;
    pmiInitiatives: PmiInitiativeDTO[];
    talentRetentions: TalentRetentionDTO[];
    warRoom: BoardWarRoomDTO | null;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [findingStream, setFindingStream] = useState<string>('technical_architecture');
  const [findingTitle, setFindingTitle] = useState<string>('');
  const [findingDescription, setFindingDescription] = useState<string>('');
  const [findingSeverity, setFindingSeverity] = useState<FindingSeverity>('medium');
  const [findingImpact, setFindingImpact] = useState<number>(500000);
  const [findingRemediation, setFindingRemediation] = useState<string>('');

  const [dcfWacc, setDcfWacc] = useState<number>(9.5);
  const [dcfGrowthRate, setDcfGrowthRate] = useState<number>(2.5);
  const [dcfExitMultiple, setDcfExitMultiple] = useState<number>(12.0);

  const [lboSeniorDebtMultiple, setLboSeniorDebtMultiple] = useState<number>(4.0);
  const [lboSubDebtMultiple, setLboSubDebtMultiple] = useState<number>(1.5);
  const [lboExitMultiple, setLboExitMultiple] = useState<number>(12.0);

  const [collarStockPrice, setCollarStockPrice] = useState<number>(100.0);

  const [retentionName, setRetentionName] = useState<string>('');
  const [retentionTitle, setRetentionTitle] = useState<string>('');
  const [retentionDept, setRetentionDept] = useState<string>('Engineering');
  const [retentionComp, setRetentionComp] = useState<number>(280000);
  const [retentionUnvested, setRetentionUnvested] = useState<number>(650000);
  const [retentionBonus, setRetentionBonus] = useState<number>(350000);

  const [signoffRole, setSignoffRole] = useState<CorpDevSignoffRole>('vp_corporate_development');
  const [signerName, setSignerName] = useState<string>('Marcus Holloway (VP Corporate Development)');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ov = await corpDevPmiNexusRepository.getOverview();
      setOverview(ov);
      if (ov.targets.length > 0) {
        const tId = ov.targets[0].id;
        setSelectedTargetId(tId);
        const dt = await corpDevPmiNexusRepository.getTargetDetails(tId);
        setTargetDetails(dt);
      }
    } catch (err) {
      setFeedbackMessage('Failed to load M&A pipeline: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = async (targetId: string) => {
    setSelectedTargetId(targetId);
    setLoading(true);
    try {
      const dt = await corpDevPmiNexusRepository.getTargetDetails(targetId);
      setTargetDetails(dt);
    } catch (err) {
      setFeedbackMessage('Failed to load target details: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId || !findingTitle) return;
    setSubmitting(true);
    try {
      await corpDevPmiNexusRepository.createFinding({
        targetId: selectedTargetId,
        streamType: findingStream as any,
        title: findingTitle,
        description: findingDescription || 'Assessed during comprehensive VDR inspection',
        severity: findingSeverity,
        financialImpactUsd: Number(findingImpact),
        proposedRemediation: findingRemediation || 'Remediate in 30-day integration sprint'
      });
      setFeedbackMessage('Due diligence finding successfully logged to VDR');
      setFindingTitle('');
      setFindingDescription('');
      setFindingRemediation('');
      const dt = await corpDevPmiNexusRepository.getTargetDetails(selectedTargetId);
      setTargetDetails(dt);
    } catch (err) {
      setFeedbackMessage('Error logging finding: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLockRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId || !retentionName) return;
    setSubmitting(true);
    try {
      await corpDevPmiNexusRepository.lockTalentRetention({
        targetId: selectedTargetId,
        employeeName: retentionName,
        jobTitle: retentionTitle || 'Principal Specialist',
        department: retentionDept,
        annualCompensationUsd: Number(retentionComp),
        unvestedEquityUsd: Number(retentionUnvested),
        flightRiskScore: 32.0,
        retentionBonusPoolUsd: Number(retentionBonus),
        cliffPeriodMonths: 24
      });
      setFeedbackMessage('Key employee retention pool locked and covenants staged');
      setRetentionName('');
      setRetentionTitle('');
      const dt = await corpDevPmiNexusRepository.getTargetDetails(selectedTargetId);
      setTargetDetails(dt);
    } catch (err) {
      setFeedbackMessage('Error locking retention: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExecuteSignoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetId || !signerName) return;
    setSubmitting(true);
    try {
      await corpDevPmiNexusRepository.executeSignoff(selectedTargetId, {
        role: signoffRole,
        signerName
      });
      setFeedbackMessage(`Digital certification recorded for ${signoffRole.replace(/_/g, ' ')}`);
      const dt = await corpDevPmiNexusRepository.getTargetDetails(selectedTargetId);
      setTargetDetails(dt);
    } catch (err) {
      setFeedbackMessage('Sign-off error: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentTarget = targetDetails?.target || overview?.targets[0];
  const currentWarRoom = targetDetails?.warRoom;

  const liveDcf = calculateDcfValuation({
    projectedUfcf: targetDetails?.dcfModel?.projectedUfcf || [18000000, 22500000, 28000000, 34000000, 41000000],
    waccPercent: dcfWacc,
    terminalGrowthRatePercent: dcfGrowthRate,
    terminalEbitdaMultiple: dcfExitMultiple,
    terminalYearEbitdaUsd: 41000000,
    netDebtUsd: targetDetails?.dcfModel?.netDebtUsd || 20000000,
    sharesOutstanding: 10000000
  });

  const liveLbo = calculateLboReturns({
    entryEbitdaUsd: currentTarget?.ebitdaUsd || 18500000,
    entryEbitdaMultiple: 11.5,
    seniorDebtMultiple: lboSeniorDebtMultiple,
    subordinatedDebtMultiple: lboSubDebtMultiple,
    exitYear: 5,
    exitEbitdaMultiple: lboExitMultiple,
    projectedExitEbitdaUsd: 45000000,
    debtPaydownDuringHoldUsd: 55000000
  });

  const liveCollar = calculateFloatingCollarExchangeRatio({
    fixedTargetValueUsd: 50.0,
    collarLowerLimitUsd: 90.0,
    collarUpperLimitUsd: 110.0,
    currentBuyerStockPriceUsd: collarStockPrice
  });

  return (
    <div className="ir-modal-backdrop" data-testid="corp-dev-pmi-nexus-modal">
      <div className="ir-modal-container">
        <header className="ir-modal-header">
          <div className="ir-modal-title-group">
            <div className="ir-modal-icon-badge">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="ir-modal-title">
                Enterprise Mergers & Acquisitions, Corporate Development & PMI Command Nexus
              </h2>
              <p className="ir-modal-subtitle">
                Institutional strategic target screening, multi-stream VDR diligence, DCF/LBO financial engineering, HSR clearance, Day-1 integration & SEC Form 8-K disclosures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ir-modal-close-btn"
            data-testid="close-corp-dev-pmi-nexus-modal"
            aria-label="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {currentTarget && (
          <div className="ir-active-docket-strip">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-400" />
                Target: {currentTarget.targetName} ({currentTarget.codeName})
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                Stage: {currentTarget.stage.replace(/_/g, ' ').toUpperCase()}
              </span>
              <span className="text-xs text-slate-300">
                EV: ${(currentTarget.targetEnterpriseValueUsd / 1000000).toFixed(1)}M
              </span>
              <span className="text-xs text-slate-300">
                SFS: {currentTarget.strategicFitScore} / 100
              </span>
              <span className="text-xs text-slate-300">
                Theme: {currentTarget.strategicTheme.replace(/_/g, ' ')}
              </span>
            </div>
            {overview && overview.targets.length > 1 && (
              <select
                value={selectedTargetId}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="bg-slate-900 text-xs border border-slate-700 rounded px-2 py-1 text-slate-200"
              >
                {overview.targets.map((t: CorpDevTargetDTO) => (
                  <option key={t.id} value={t.id}>
                    {t.codeName} - {t.targetName}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <nav className="ir-modal-tabs">
          <button
            className={`ir-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('pipeline')}
            data-testid="tab-pipeline"
          >
            <Compass className="w-4 h-4 mr-2 inline" />
            1. Target Pipeline & VDR Radar
          </button>
          <button
            className={`ir-tab-btn ${activeTab === 'valuation' ? 'active' : ''}`}
            onClick={() => setActiveTab('valuation')}
            data-testid="tab-valuation"
          >
            <TrendingUp className="w-4 h-4 mr-2 inline" />
            2. DCF/LBO Valuation & Synergies
          </button>
          <button
            className={`ir-tab-btn ${activeTab === 'structuring' ? 'active' : ''}`}
            onClick={() => setActiveTab('structuring')}
            data-testid="tab-structuring"
          >
            <Scale className="w-4 h-4 mr-2 inline" />
            3. Deal Structuring & HSR Antitrust
          </button>
          <button
            className={`ir-tab-btn ${activeTab === 'pmi' ? 'active' : ''}`}
            onClick={() => setActiveTab('pmi')}
            data-testid="tab-pmi"
          >
            <Layers className="w-4 h-4 mr-2 inline" />
            4. PMI Day-1 Readiness & Retention
          </button>
          <button
            className={`ir-tab-btn ${activeTab === 'warroom' ? 'active' : ''}`}
            onClick={() => setActiveTab('warroom')}
            data-testid="tab-warroom"
          >
            <ShieldCheck className="w-4 h-4 mr-2 inline" />
            5. Board War Room & Form 8-K
          </button>
        </nav>

        {feedbackMessage && (
          <div className="mx-6 mt-4 p-3 bg-indigo-950/60 border border-indigo-700/50 rounded-lg text-indigo-300 text-sm flex justify-between items-center">
            <span>{feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-indigo-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <main className="ir-modal-body">
          {loading && (
            <div className="p-12 text-center text-slate-400">
              Loading corporate development portfolio telemetry...
            </div>
          )}

          {!loading && activeTab === 'pipeline' && (
            <div className="space-y-6" data-testid="pillar-pipeline-view">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Active Targets</span>
                  <span className="ir-stat-value text-indigo-400">{overview?.activeTargetsCount || 1}</span>
                  <span className="ir-stat-sub">Across 12 Deal Stages</span>
                </div>
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Pipeline Enterprise Value</span>
                  <span className="ir-stat-value text-emerald-400">
                    ${((overview?.aggregatePipelineEvUsd || 485000000) / 1000000).toFixed(1)}M
                  </span>
                  <span className="ir-stat-sub">Aggregate Sourced EV</span>
                </div>
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Active VDR Streams</span>
                  <span className="ir-stat-value text-blue-400">{overview?.activeVdrCount || 6}</span>
                  <span className="ir-stat-sub">Parallel Workstreams</span>
                </div>
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Average Strategic Fit (SFS)</span>
                  <span className="ir-stat-value text-amber-400">{overview?.averageStrategicFitScore || 88.5}</span>
                  <span className="ir-stat-sub">Target Score [0, 100]</span>
                </div>
              </div>

              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-400" />
                  6-Stream Virtual Data Room (VDR) Diligence Radar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {(targetDetails?.vdrStreams || []).map((stream) => (
                    <div key={stream.id} className="p-3 bg-slate-900/60 rounded-lg border border-slate-700/60">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold text-sm text-slate-200 capitalize">
                          {stream.streamType.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            stream.status === 'cleared'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {stream.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2 truncate">Lead: {stream.streamLead}</div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-2">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${stream.completionPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Progress: {stream.completionPercent}%</span>
                        <span>Findings: {stream.findingsCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Open Due Diligence Findings & Red Flags
                  </h3>
                  <div className="space-y-3 mt-4 max-h-72 overflow-y-auto pr-2">
                    {(targetDetails?.findings || []).map((f) => (
                      <div key={f.id} className="p-3 bg-slate-900/80 rounded border border-slate-800 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-slate-200">{f.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              f.severity === 'critical_deal_killer'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : f.severity === 'high'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {f.severity.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-slate-400 mb-1">{f.description}</p>
                        <div className="flex justify-between text-slate-400">
                          <span>Impact: ${(f.financialImpactUsd / 1000).toFixed(0)}k</span>
                          <span className={f.isResolved ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                            {f.isResolved ? 'RESOLVED' : 'ACTIVE MITIGATION'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-400" />
                    Log New VDR Due Diligence Finding
                  </h3>
                  <form onSubmit={handleAddFinding} className="space-y-3 mt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Stream</label>
                        <select
                          value={findingStream}
                          onChange={(e) => setFindingStream(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="financial_tax">Financial & Tax</option>
                          <option value="legal_regulatory">Legal & Regulatory</option>
                          <option value="commercial_market">Commercial & Market</option>
                          <option value="technical_architecture">Technical & Architecture</option>
                          <option value="hr_talent_culture">HR & Culture</option>
                          <option value="operational_esg">Operational & ESG</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Severity</label>
                        <select
                          value={findingSeverity}
                          onChange={(e) => setFindingSeverity(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="low">Low Impact</option>
                          <option value="medium">Medium Severity</option>
                          <option value="high">High Risk</option>
                          <option value="critical_deal_killer">Critical Deal Killer</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Finding Title</label>
                      <input
                        type="text"
                        value={findingTitle}
                        onChange={(e) => setFindingTitle(e.target.value)}
                        placeholder="e.g. Open-source GPL v3 contagion in core analytics engine"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Estimated Financial Impact ($)</label>
                        <input
                          type="number"
                          value={findingImpact}
                          onChange={(e) => setFindingImpact(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Proposed Remediation</label>
                        <input
                          type="text"
                          value={findingRemediation}
                          onChange={(e) => setFindingRemediation(e.target.value)}
                          placeholder="e.g. Escrow holdback or rewrite"
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition"
                    >
                      {submitting ? 'Logging Finding...' : 'Record Finding to VDR'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'valuation' && (
            <div className="space-y-6" data-testid="pillar-valuation-view">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                    Discounted Cash Flow (DCF) Financial Model
                  </h3>
                  <div className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>WACC Rate: {dcfWacc}%</span>
                      </div>
                      <input
                        type="range"
                        min="6.0"
                        max="14.0"
                        step="0.1"
                        value={dcfWacc}
                        onChange={(e) => setDcfWacc(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Perpetual Terminal Growth Rate: {dcfGrowthRate}%</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="4.0"
                        step="0.1"
                        value={dcfGrowthRate}
                        onChange={(e) => setDcfGrowthRate(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Exit EBITDA Multiple: {dcfExitMultiple}x</span>
                      </div>
                      <input
                        type="range"
                        min="8.0"
                        max="18.0"
                        step="0.5"
                        value={dcfExitMultiple}
                        onChange={(e) => setDcfExitMultiple(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Enterprise Value (Gordon Growth):</span>
                        <span className="font-bold text-emerald-400">
                          ${(liveDcf.enterpriseValueGordonUsd / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Enterprise Value (Exit Multiple):</span>
                        <span className="font-bold text-blue-400">
                          ${(liveDcf.enterpriseValueMultipleUsd / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Implied Equity Value:</span>
                        <span className="font-bold text-white">
                          ${(liveDcf.impliedEquityValueUsd / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Implied Share Price:</span>
                        <span className="font-bold text-indigo-400">${liveDcf.impliedSharePriceUsd.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    Alternative LBO Returns & Debt Capacity
                  </h3>
                  <div className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Senior Debt Multiple: {lboSeniorDebtMultiple}x</span>
                      </div>
                      <input
                        type="range"
                        min="2.0"
                        max="6.0"
                        step="0.25"
                        value={lboSeniorDebtMultiple}
                        onChange={(e) => setLboSeniorDebtMultiple(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Subordinated Debt Multiple: {lboSubDebtMultiple}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.25"
                        value={lboSubDebtMultiple}
                        onChange={(e) => setLboSubDebtMultiple(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>Exit Multiple (Year 5): {lboExitMultiple}x</span>
                      </div>
                      <input
                        type="range"
                        min="8.0"
                        max="16.0"
                        step="0.5"
                        value={lboExitMultiple}
                        onChange={(e) => setLboExitMultiple(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Entry Sponsor Equity:</span>
                        <span className="font-bold text-white">
                          ${(liveLbo.sponsorEquityEntryUsd / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Exit Sponsor Equity (Year 5):</span>
                        <span className="font-bold text-white">
                          ${(liveLbo.sponsorEquityExitUsd / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Multiple on Invested Capital (MoIC):</span>
                        <span className="font-bold text-amber-400">{liveLbo.sponsorMoic.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sponsor Internal Rate of Return (IRR):</span>
                        <span className="font-bold text-emerald-400">{liveLbo.sponsorIrrPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-blue-400" />
                  ASC 805 Business Combination Purchase Price Allocation (PPA)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Total Consideration</span>
                    <span className="text-base font-bold text-white">
                      ${((targetDetails?.ppa?.totalConsiderationUsd || 485000000) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Net Tangible Assets</span>
                    <span className="text-base font-bold text-slate-200">
                      ${((targetDetails?.ppa?.netTangibleAssetsFairValueUsd || 72000000) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Identifiable Intangibles</span>
                    <span className="text-base font-bold text-indigo-400">
                      $
                      {(
                        ((targetDetails?.ppa?.developedTechnologyFairValueUsd || 135000000) +
                          (targetDetails?.ppa?.customerRelationshipsFairValueUsd || 68000000) +
                          (targetDetails?.ppa?.trademarksFairValueUsd || 24000000)) /
                        1000000
                      ).toFixed(1)}
                      M
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">ASC 805 Goodwill Created</span>
                    <span className="text-base font-bold text-emerald-400">
                      ${((targetDetails?.ppa?.calculatedGoodwillUsd || 233670000) / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'structuring' && (
            <div className="space-y-6" data-testid="pillar-structuring-view">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-indigo-400" />
                    Transaction Consideration Mix & Break Fees
                  </h3>
                  <div className="space-y-4 mt-4 text-xs">
                    <div className="p-3 bg-slate-900 rounded border border-slate-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400">Cash Consideration (65%):</span>
                        <span className="font-bold text-white">
                          ${((targetDetails?.dealStructure?.cashConsiderationUsd || 315250000) / 1000000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-400">Stock Consideration (35%):</span>
                        <span className="font-bold text-indigo-300">
                          ${((targetDetails?.dealStructure?.stockConsiderationUsd || 169750000) / 1000000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Earnouts / Contingent Consideration:</span>
                        <span className="font-bold text-slate-400">$0.00 (Pure Fixed-Value)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-400 block mb-1">Buyer Reverse Termination Fee</span>
                        <span className="text-sm font-bold text-red-400">
                          ${((targetDetails?.dealStructure?.buyerTerminationFeeUsd || 19400000) / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-[10px] text-slate-400 block">4.0% of EV (Antitrust Out)</span>
                      </div>
                      <div className="p-3 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-400 block mb-1">Target Fiduciary Break Fee</span>
                        <span className="text-sm font-bold text-amber-400">
                          ${((targetDetails?.dealStructure?.targetBreakFeeUsd || 14550000) / 1000000).toFixed(2)}M
                        </span>
                        <span className="text-[10px] text-slate-400 block">3.0% of EV (Topping Bid)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-400" />
                    Symmetrical Floating Exchange Ratio Collar
                  </h3>
                  <div className="space-y-4 mt-4 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-300 mb-1">
                        <span>Buyer Stock Price at Closing: ${collarStockPrice.toFixed(2)}</span>
                        <span className="text-indigo-400">Bounds: [$90.00, $110.00]</span>
                      </div>
                      <input
                        type="range"
                        min="70.0"
                        max="130.0"
                        step="1.0"
                        value={collarStockPrice}
                        onChange={(e) => setCollarStockPrice(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Collar Mechanism Status:</span>
                        <span
                          className={`font-bold uppercase ${
                            liveCollar.collarStatus === 'floating'
                              ? 'text-emerald-400'
                              : liveCollar.collarStatus === 'ceiling'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {liveCollar.collarStatus} (
                          {liveCollar.collarStatus === 'floating'
                            ? 'Target Value Protected'
                            : liveCollar.collarStatus === 'floor'
                            ? 'Buyer Dilution Protected'
                            : 'Buyer Dilution Capped'}
                          )
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Effective Exchange Ratio:</span>
                        <span className="font-bold text-white">{liveCollar.exchangeRatio.toFixed(4)} shares</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  Hart-Scott-Rodino (HSR) Antitrust Clearance Dashboard
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">HSR Filing Status</span>
                    <span className="text-sm font-bold text-emerald-400">CLEARED (Early Termination)</span>
                    <span className="text-[10px] text-slate-400 block">30-day waiting period expired</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Pre-Merger HHI</span>
                    <span className="text-sm font-bold text-white">1,850</span>
                    <span className="text-[10px] text-slate-400 block">Moderately Concentrated</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Post-Merger HHI & Delta</span>
                    <span className="text-sm font-bold text-indigo-300">2,110 (Δ +260)</span>
                    <span className="text-[10px] text-slate-400 block">Safe Harbor Zone</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-slate-800">
                    <span className="text-slate-400 block mb-1">Second Request Risk Index</span>
                    <span className="text-sm font-bold text-emerald-400">32.4 / 100</span>
                    <span className="text-[10px] text-slate-400 block">Negligible Enforcement Risk</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'pmi' && (
            <div className="space-y-6" data-testid="pillar-pmi-view">
              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Day-1 Post-Merger Integration (PMI) Binary Readiness Gates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-4 text-xs">
                  <div className="p-3 bg-slate-900 rounded border border-emerald-800/80 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <span className="font-bold text-white block mb-1">Gate 1: Payroll</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">100% AFFIRMATIVE</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-emerald-800/80 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <span className="font-bold text-white block mb-1">Gate 2: Okta SSO</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">100% FEDERATED</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-emerald-800/80 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <span className="font-bold text-white block mb-1">Gate 3: Comms</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">STAGED & READY</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-emerald-800/80 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <span className="font-bold text-white block mb-1">Gate 4: Signatory</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">DELEGATIONS IN PLACE</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded border border-emerald-800/80 text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                    <span className="font-bold text-white block mb-1">Gate 5: Treasury</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">DUAL CONTROL SWEEP</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    100-Day Integration Highway Workstreams
                  </h3>
                  <div className="space-y-3 mt-4 max-h-72 overflow-y-auto pr-2 text-xs">
                    {(targetDetails?.pmiInitiatives || []).map((init) => (
                      <div key={init.id} className="p-3 bg-slate-900/80 rounded border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-slate-200">{init.title}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                            Day {init.dayTarget}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>Owner: {init.owner}</span>
                          <span>Synergy: ${(init.associatedSynergyUsd / 1000).toFixed(0)}k</span>
                          <span className={init.isCompleted ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                            {init.isCompleted ? 'COMPLETE' : 'IN PROGRESS'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ir-card">
                  <h3 className="ir-card-title flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" />
                    Key Personnel Retention Pool
                  </h3>
                  <div className="space-y-3 mt-4">
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1 text-xs">
                      {(targetDetails?.talentRetentions || []).map((ret) => (
                        <div key={ret.id} className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-slate-200 block">{ret.employeeName}</span>
                            <span className="text-[10px] text-slate-400">{ret.jobTitle} ({ret.department})</span>
                          </div>
                          <div className="text-right">
                            <span className="text-emerald-400 font-bold block">${(ret.retentionBonusPoolUsd / 1000).toFixed(0)}k Pool</span>
                            <span className="text-[10px] text-slate-400">{ret.cliffPeriodMonths} Mo. Cliff</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleLockRetention} className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={retentionName}
                          onChange={(e) => setRetentionName(e.target.value)}
                          placeholder="Employee Name"
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                          required
                        />
                        <input
                          type="text"
                          value={retentionTitle}
                          onChange={(e) => setRetentionTitle(e.target.value)}
                          placeholder="Job Title"
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={retentionComp}
                          onChange={(e) => setRetentionComp(Number(e.target.value))}
                          placeholder="Annual Comp ($)"
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                        <input
                          type="number"
                          value={retentionBonus}
                          onChange={(e) => setRetentionBonus(Number(e.target.value))}
                          placeholder="Retention Bonus ($)"
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition"
                      >
                        Lock Retention Package & Covenants
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'warroom' && (
            <div className="space-y-6" data-testid="pillar-warroom-view">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Deal Success Probability (DSPI)</span>
                  <span className="ir-stat-value text-emerald-400">
                    {currentWarRoom?.dspiScore || 84.5}%
                  </span>
                  <span className="ir-stat-sub">HIGH TRANSACTION CERTAINTY</span>
                </div>
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Tripartite C-Suite Approval</span>
                  <span className="ir-stat-value text-indigo-400">
                    {currentWarRoom?.ceoSignoff.signed
                      ? '3 / 3 RATIFIED'
                      : currentWarRoom?.cfoSignoff.signed
                      ? '2 / 3 APPROVED'
                      : '1 / 3 CERTIFIED'}
                  </span>
                  <span className="ir-stat-sub">Sequential Digital Sign-off</span>
                </div>
                <div className="ir-stat-card">
                  <span className="ir-stat-label">Statutory Form 8-K Ready</span>
                  <span className="ir-stat-value text-blue-400">ITEM 1.01 & 2.01</span>
                  <span className="ir-stat-sub">SEC EDGAR Disclosures Staged</span>
                </div>
              </div>

              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  Tripartite C-Suite Executive Digital Sign-Off Authority Pipeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                  <div className={`p-4 rounded-lg border ${currentWarRoom?.vpCorpDevSignoff.signed ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-slate-200">
                      <CheckCircle2 className={`w-4 h-4 ${currentWarRoom?.vpCorpDevSignoff.signed ? 'text-emerald-400' : 'text-slate-500'}`} />
                      Stage 1: VP Corporate Development
                    </div>
                    <p className="text-slate-400 text-xs mb-2">VDR Due Diligence & Strategic Fit Certification</p>
                    <span className="text-[11px] font-bold text-white block">
                      {currentWarRoom?.vpCorpDevSignoff.signed ? currentWarRoom.vpCorpDevSignoff.signerName : 'Pending Signature'}
                    </span>
                  </div>

                  <div className={`p-4 rounded-lg border ${currentWarRoom?.cfoSignoff.signed ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-slate-200">
                      <CheckCircle2 className={`w-4 h-4 ${currentWarRoom?.cfoSignoff.signed ? 'text-emerald-400' : 'text-slate-500'}`} />
                      Stage 2: Chief Financial Officer
                    </div>
                    <p className="text-slate-400 text-xs mb-2">DCF/LBO Models & Debt Financing Commitments</p>
                    <span className="text-[11px] font-bold text-white block">
                      {currentWarRoom?.cfoSignoff.signed ? currentWarRoom.cfoSignoff.signerName : 'Pending Signature'}
                    </span>
                  </div>

                  <div className={`p-4 rounded-lg border ${currentWarRoom?.ceoSignoff.signed ? 'bg-emerald-950/40 border-emerald-700/60' : 'bg-slate-900 border-slate-800'}`}>
                    <div className="flex items-center gap-2 font-semibold text-sm mb-2 text-slate-200">
                      <CheckCircle2 className={`w-4 h-4 ${currentWarRoom?.ceoSignoff.signed ? 'text-emerald-400' : 'text-slate-500'}`} />
                      Stage 3: Chief Executive Officer
                    </div>
                    <p className="text-slate-400 text-xs mb-2">Board Submission Ratification & Definitive Execution</p>
                    <span className="text-[11px] font-bold text-white block">
                      {currentWarRoom?.ceoSignoff.signed ? currentWarRoom.ceoSignoff.signerName : 'Pending Signature'}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleExecuteSignoff} className="mt-4 p-4 bg-slate-900/60 rounded border border-slate-800 text-xs flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-slate-400 block mb-1">Authorizing Role</label>
                    <select
                      value={signoffRole}
                      onChange={(e) => {
                        const r = e.target.value as CorpDevSignoffRole;
                        setSignoffRole(r);
                        if (r === 'vp_corporate_development') setSignerName('Marcus Holloway (VP Corporate Development)');
                        else if (r === 'chief_financial_officer') setSignerName('Victoria Sterling (Chief Financial Officer)');
                        else if (r === 'chief_executive_officer') setSignerName('Marcus Vance (Chief Executive Officer & Board Chair)');
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                    >
                      <option value="vp_corporate_development">VP Corporate Development</option>
                      <option value="chief_financial_officer">Chief Financial Officer</option>
                      <option value="chief_executive_officer">Chief Executive Officer</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-slate-400 block mb-1">Signer Legal Name & Title</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold transition"
                  >
                    Execute Digital Signature
                  </button>
                </form>
              </div>

              <div className="ir-card">
                <h3 className="ir-card-title flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  Statutory SEC Form 8-K Current Report Disclosures
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-300 mb-2">Item 1.01: Entry into Material Definitive Agreement</h4>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {currentWarRoom?.form8kItem101Markdown}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-300 mb-2">Item 2.01: Completion of Acquisition of Assets</h4>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded text-[11px] text-slate-300 font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {currentWarRoom?.form8kItem201Markdown}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
