import { useState, useEffect } from 'react';
import {
  type EsgStudioOverviewDTO,
  type GhgCarbonInventoryDTO,
  type RecordCarbonEmissionsRequestDTO,
  type TcfdScenarioModelDTO,
  type TcfdSimulationRequestDTO,
  type TcfdSimulationResultDTO,
  type DoubleMaterialityMatrixDTO,
  type EsrsTopicAssessmentDTO,
  type UpdateMaterialityTopicRequestDTO,
  type Scope3SupplyChainOverviewDTO,
  type SupplierDecarbonizationDTO,
  type SupplierDecarbonizationSimulationRequestDTO,
  type SupplierDecarbonizationSimulationResultDTO,
  type SecComplianceOverviewDTO,
  type ExecutiveEsgBoardMemorandumDTO,
  type GenerateBoardMemoRequestDTO,
  type BoardEsgSignoffRole,
  type TcfdClimateScenario,
  type ClimateTimeHorizon,
  generateExecutiveEsgBoardMemorandumMarkdown
} from '../domain';
import { esgSustainabilityStudioRepository } from '../data';
import {
  Leaf,
  Globe,
  Activity,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Building2,
  Sparkles,
  RefreshCw,
  X,
  ChevronRight,
  Copy,
  Check,
  Flame,
  Zap,
  Award,
  Scale,
  TrendingUp,
  Sliders
} from 'lucide-react';

interface EsgSustainabilityStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EsgSustainabilityStudioModal({ isOpen, onClose }: EsgSustainabilityStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'ghg-carbon' | 'tcfd-risk' | 'csrd-materiality' | 'sbti-supply-chain' | 'sec-board-memo'>('ghg-carbon');
  const [overview, setOverview] = useState<EsgStudioOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRecordEmissionsModal, setShowRecordEmissionsModal] = useState(false);
  const [showTcfdSimDrawer, setShowTcfdSimDrawer] = useState(false);
  const [showMaterialityEditModal, setShowMaterialityEditModal] = useState(false);
  const [showSupplierSimModal, setShowSupplierSimModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<EsrsTopicAssessmentDTO | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [tcfdSimResult, setTcfdSimResult] = useState<TcfdSimulationResultDTO | null>(null);
  const [supplierSimResult, setSupplierSimResult] = useState<SupplierDecarbonizationSimulationResultDTO | null>(null);

  const [emissionsForm, setEmissionsForm] = useState<RecordCarbonEmissionsRequestDTO>({
    reportingYear: 2026,
    scope1Stationary: 1220.0,
    scope1Mobile: 440.0,
    scope1Fugitive: 180.0,
    scope2Location: 6420.0,
    scope2Market: 1280.0,
    scope3Categories: [
      { category: 'cat_01_purchased_goods', emissionsTco2e: 21400, method: 'hybrid_activity' },
      { category: 'cat_02_capital_goods', emissionsTco2e: 4100, method: 'spend_based' },
      { category: 'cat_04_upstream_transport', emissionsTco2e: 3300, method: 'supplier_specific' },
      { category: 'cat_06_business_travel', emissionsTco2e: 3250, method: 'hybrid_activity' },
      { category: 'cat_07_employee_commuting', emissionsTco2e: 2600, method: 'spend_based' }
    ],
    verifiedRemovals: 2500.0,
    revenueMillionUsd: 420.0,
    headcountFte: 2850,
    realEstateAreaM2: 85000,
    energyTotalMwh: 24500.0,
    renewableEnergyMwh: 16780.0
  });

  const [tcfdSimForm, setTcfdSimForm] = useState<TcfdSimulationRequestDTO>({
    scenario: 'rcp_8_5_extreme_warming',
    timeHorizon: 'short_term_2030',
    enterpriseValueUsd: 1200000000,
    customCarbonPriceUsdPerTon: 145,
    physicalAssetLocationsCount: 16
  });

  const [materialityEditForm, setMaterialityEditForm] = useState<UpdateMaterialityTopicRequestDTO>({
    topicCode: 'ESRS_E1',
    impactScale: 4.8,
    impactScope: 4.5,
    impactIrremediability: 4.6,
    impactLikelihood: 4.2,
    financialMagnitude: 4.4,
    financialProbability: 4.0,
    keyImpacts: ['Direct operational emissions across cloud data centers'],
    keyFinancialRisks: ['Carbon tax exposure under EU ETS and California cap-and-trade']
  });

  const [supplierSimForm, setSupplierSimForm] = useState<SupplierDecarbonizationSimulationRequestDTO>({
    targetTierAProcurementSharePercent: 65.0,
    targetVendorRenewableAdoptionPercent: 80.0,
    supplierEngagementMandateEnacted: true
  });

  const [boardMemoTitle, setBoardMemoTitle] = useState('FY2026 Executive ESG, Climate Risk & Decarbonization Governance Briefing');

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  async function loadOverview() {
    setLoading(true);
    try {
      const data = await esgSustainabilityStudioRepository.getOverview();
      setOverview(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordEmissions() {
    try {
      await esgSustainabilityStudioRepository.recordCarbonEmissions(emissionsForm);
      await loadOverview();
      setShowRecordEmissionsModal(false);
    } catch {
      setShowRecordEmissionsModal(false);
    }
  }

  async function handleRunTcfdSimulation() {
    try {
      const result = await esgSustainabilityStudioRepository.simulateTcfdScenario(tcfdSimForm);
      setTcfdSimResult(result);
    } catch {
      setTcfdSimResult(null);
    }
  }

  async function handleOpenMaterialityEdit(topic: EsrsTopicAssessmentDTO) {
    setSelectedTopic(topic);
    setMaterialityEditForm({
      topicCode: topic.topicCode,
      impactScale: topic.impactScale,
      impactScope: topic.impactScope,
      impactIrremediability: topic.impactIrremediability,
      impactLikelihood: topic.impactLikelihood,
      financialMagnitude: topic.financialMagnitude,
      financialProbability: topic.financialProbability,
      keyImpacts: topic.keyPositiveOrNegativeImpacts,
      keyFinancialRisks: topic.keyFinancialRisksAndOpportunities
    });
    setShowMaterialityEditModal(true);
  }

  async function handleSaveMaterialityTopic() {
    if (!selectedTopic) return;
    try {
      await esgSustainabilityStudioRepository.updateMaterialityAssessment(selectedTopic.topicCode, materialityEditForm);
      await loadOverview();
      setShowMaterialityEditModal(false);
    } catch {
      setShowMaterialityEditModal(false);
    }
  }

  async function handleRunSupplierSimulation() {
    try {
      const result = await esgSustainabilityStudioRepository.simulateSupplierDecarbonization(supplierSimForm);
      setSupplierSimResult(result);
    } catch {
      setSupplierSimResult(null);
    }
  }

  async function handleGenerateMemo() {
    try {
      await esgSustainabilityStudioRepository.generateBoardMemorandum({
        title: boardMemoTitle,
        reportingYear: 2026
      });
      await loadOverview();
    } catch {
      await loadOverview();
    }
  }

  async function handleSignOff(role: BoardEsgSignoffRole) {
    if (!overview?.latestBoardMemo) return;
    try {
      await esgSustainabilityStudioRepository.signOffBoardMemorandum(overview.latestBoardMemo.id, role);
      await loadOverview();
    } catch {
      await loadOverview();
    }
  }

  function handleCopyMemo() {
    if (!overview?.latestBoardMemo) return;
    const md = generateExecutiveEsgBoardMemorandumMarkdown(overview.latestBoardMemo);
    navigator.clipboard.writeText(md);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  }

  if (!isOpen) return null;

  const carbon = overview?.carbonInventory;
  const tcfd = overview?.tcfdOverview;
  const materiality = overview?.materialityOverview;
  const supplyChain = overview?.supplyChainOverview;
  const sec = overview?.secCompliance;
  const memo = overview?.latestBoardMemo;

  return (
    <div className="jobtrack-modal-backdrop esg-studio-backdrop" data-testid="esg-sustainability-studio-modal">
      <div className="jobtrack-modal-container esg-studio-container">
        <header className="esg-studio-header">
          <div className="esg-studio-header-title">
            <div className="esg-studio-icon-badge">
              <Leaf className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">ESG, Sustainability & Climate Risk Governance Studio</h2>
                <span className="esg-badge esg-badge-emerald">GHG Protocol / TCFD / CSRD / SEC S-K</span>
              </div>
              <p className="text-xs text-emerald-300/80">Corporate Carbon Accounting, Climate Financial Risk Simulation, Double Materiality & SEC Audit Governance</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {overview && (
              <div className="esg-studio-header-stat">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold">ESG Score</span>
                <span className="text-lg font-bold text-emerald-200">{overview.compositeScore}/100</span>
                <span className="text-[10px] text-emerald-300 uppercase">{overview.statusBand.replace(/_/g, ' ')}</span>
              </div>
            )}
            <button
              type="button"
              className="esg-studio-btn-ghost"
              onClick={loadOverview}
              title="Refresh Telemetry"
              data-testid="refresh-esg-studio"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-300 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              className="esg-studio-btn-ghost text-slate-400 hover:text-white"
              onClick={onClose}
              data-testid="close-esg-sustainability-studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <nav className="esg-studio-nav">
          <button
            type="button"
            className={`esg-studio-tab ${activeTab === 'ghg-carbon' ? 'active' : ''}`}
            onClick={() => setActiveTab('ghg-carbon')}
            data-testid="tab-ghg-carbon"
          >
            <Flame className="w-4 h-4 mr-2" />
            Pillar A: GHG Protocol Carbon Accounting
          </button>
          <button
            type="button"
            className={`esg-studio-tab ${activeTab === 'tcfd-risk' ? 'active' : ''}`}
            onClick={() => setActiveTab('tcfd-risk')}
            data-testid="tab-tcfd-risk"
          >
            <Globe className="w-4 h-4 mr-2" />
            Pillar B: TCFD Climate Risk & Scenario VaR
          </button>
          <button
            type="button"
            className={`esg-studio-tab ${activeTab === 'csrd-materiality' ? 'active' : ''}`}
            onClick={() => setActiveTab('csrd-materiality')}
            data-testid="tab-csrd-materiality"
          >
            <Scale className="w-4 h-4 mr-2" />
            Pillar C: EU CSRD Double Materiality
          </button>
          <button
            type="button"
            className={`esg-studio-tab ${activeTab === 'sbti-supply-chain' ? 'active' : ''}`}
            onClick={() => setActiveTab('sbti-supply-chain')}
            data-testid="tab-sbti-supply-chain"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Pillar D: Scope 3 & SBTi Glide Path
          </button>
          <button
            type="button"
            className={`esg-studio-tab ${activeTab === 'sec-board-memo' ? 'active' : ''}`}
            onClick={() => setActiveTab('sec-board-memo')}
            data-testid="tab-sec-board-memo"
          >
            <FileText className="w-4 h-4 mr-2" />
            Pillar E: SEC Audit & Board ESG Memo
          </button>
        </nav>

        <main className="esg-studio-body">
          {loading && !overview ? (
            <div className="esg-studio-loading">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
              <p className="text-sm text-emerald-200">Synchronizing Carbon Inventories and Climate Scenarios...</p>
            </div>
          ) : (
            <>
              {activeTab === 'ghg-carbon' && carbon && (
                <div className="esg-tab-content" data-testid="ghg-carbon-content">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>GHG Protocol Scope 1, 2 & 3 Comprehensive Inventory</span>
                        <span className="text-xs font-normal text-emerald-400">Reporting Year {carbon.reportingYear}</span>
                      </h3>
                      <p className="text-xs text-slate-400">Location-based vs Market-based dual accounting with full Scope 3 value-chain breakdown</p>
                    </div>
                    <button
                      type="button"
                      className="esg-btn-emerald"
                      onClick={() => setShowRecordEmissionsModal(true)}
                      data-testid="record-emissions-button"
                    >
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      Record Emissions Entry
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-3 mb-5">
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Gross Emissions</span>
                      <span className="esg-stat-value text-emerald-300">{carbon.grossEmissionsTco2e.toLocaleString()} <span className="text-xs font-normal">tCO₂e</span></span>
                      <span className="esg-stat-sub">Scope 1+2+3 Total</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Net Emissions</span>
                      <span className="esg-stat-value text-emerald-400">{carbon.netEmissionsTco2e.toLocaleString()} <span className="text-xs font-normal">tCO₂e</span></span>
                      <span className="esg-stat-sub">Removals: -{carbon.verifiedCarbonRemovalsTco2e.toLocaleString()} tCO₂e</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Revenue Intensity</span>
                      <span className="esg-stat-value text-cyan-300">{carbon.intensity.revenueIntensityTco2ePerMillionUsd} <span className="text-xs font-normal">t/$M</span></span>
                      <span className="esg-stat-sub">Target: &lt; 100.0 t/$M</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Headcount Intensity</span>
                      <span className="esg-stat-value text-amber-300">{carbon.intensity.headcountIntensityTco2ePerFte} <span className="text-xs font-normal">t/FTE</span></span>
                      <span className="esg-stat-sub">Per Full-Time Employee</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Real Estate Intensity</span>
                      <span className="esg-stat-value text-purple-300">{carbon.intensity.realEstateIntensityKgCo2ePerM2} <span className="text-xs font-normal">kg/m²</span></span>
                      <span className="esg-stat-sub">Renewables: {carbon.intensity.renewableEnergyPercent}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="esg-panel">
                      <h4 className="esg-panel-title">
                        <Flame className="w-4 h-4 text-orange-400 mr-2" />
                        Scope 1: Direct Combustion & Fugitive Emissions
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Stationary Combustion (Boilers, Generators)</span>
                          <span className="font-semibold text-white">{carbon.scope1.stationaryCombustionTco2e} tCO₂e</span>
                        </div>
                        <div className="esg-progress-bar">
                          <div className="esg-progress-fill bg-orange-500" style={{ width: `${(carbon.scope1.stationaryCombustionTco2e / carbon.scope1.totalScope1Tco2e) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Mobile Fleet Operations</span>
                          <span className="font-semibold text-white">{carbon.scope1.mobileFleetTco2e} tCO₂e</span>
                        </div>
                        <div className="esg-progress-bar">
                          <div className="esg-progress-fill bg-amber-500" style={{ width: `${(carbon.scope1.mobileFleetTco2e / carbon.scope1.totalScope1Tco2e) * 100}%` }}></div>
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Fugitive Leakage (HVAC Refrigerants & PFCs)</span>
                          <span className="font-semibold text-white">{carbon.scope1.fugitiveRefrigerantsTco2e} tCO₂e</span>
                        </div>
                        <div className="esg-progress-bar">
                          <div className="esg-progress-fill bg-yellow-500" style={{ width: `${(carbon.scope1.fugitiveRefrigerantsTco2e / carbon.scope1.totalScope1Tco2e) * 100}%` }}></div>
                        </div>

                        <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs font-bold">
                          <span className="text-emerald-400">Total Scope 1 Direct Emissions</span>
                          <span className="text-white">{carbon.scope1.totalScope1Tco2e} tCO₂e</span>
                        </div>
                      </div>
                    </div>

                    <div className="esg-panel">
                      <h4 className="esg-panel-title">
                        <Zap className="w-4 h-4 text-yellow-400 mr-2" />
                        Scope 2: Dual-Accounting (Location vs. Market)
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Location-Based Grid Benchmark</span>
                          <span className="font-semibold text-slate-300">{carbon.scope2.locationBasedGridTco2e} tCO₂e</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Market-Based Contracted Energy</span>
                          <span className="font-semibold text-emerald-400">{carbon.scope2.marketBasedContractedTco2e} tCO₂e</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Contracted EACs & PPA Green Offsets</span>
                          <span className="font-semibold text-teal-400">{carbon.scope2.renewableEnergyAttributeCertificatesMwh.toLocaleString()} MWh</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-300">Renewable Energy Share</span>
                          <span className="font-semibold text-green-400">{carbon.intensity.renewableEnergyPercent}%</span>
                        </div>
                        <div className="esg-progress-bar">
                          <div className="esg-progress-fill bg-emerald-500" style={{ width: `${carbon.intensity.renewableEnergyPercent}%` }}></div>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 flex justify-between items-center text-xs font-bold">
                          <span className="text-emerald-400">Scope 2 Accounting Differential</span>
                          <span className="text-teal-300">{(carbon.scope2.locationBasedGridTco2e - carbon.scope2.marketBasedContractedTco2e).toFixed(1)} tCO₂e saved</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="esg-panel">
                    <h4 className="esg-panel-title">
                      <Building2 className="w-4 h-4 text-cyan-400 mr-2" />
                      Scope 3: Upstream & Downstream Value Chain Breakdown ({carbon.scope3Categories.length} Categories)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="esg-table">
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Emissions (tCO₂e)</th>
                            <th>Share (%)</th>
                            <th>Calculation Method</th>
                          </tr>
                        </thead>
                        <tbody>
                          {carbon.scope3Categories.map((cat) => (
                            <tr key={cat.category}>
                              <td className="font-medium text-emerald-300 uppercase text-xs">{cat.category.replace(/_/g, ' ')}</td>
                              <td className="text-xs text-slate-300">{cat.categoryLabel}</td>
                              <td className="text-xs font-semibold text-white">{cat.emissionsTco2e.toLocaleString()}</td>
                              <td className="text-xs text-slate-300">
                                <div className="flex items-center gap-2">
                                  <span>{cat.percentageOfScope3.toFixed(1)}%</span>
                                  <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-emerald-400 h-full" style={{ width: `${Math.min(100, cat.percentageOfScope3 * 1.5)}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`esg-badge ${cat.calculationMethod === 'spend_based' ? 'esg-badge-yellow' : 'esg-badge-emerald'}`}>
                                  {cat.calculationMethod.replace(/_/g, ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'tcfd-risk' && tcfd && (
                <div className="esg-tab-content" data-testid="tcfd-risk-content">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>TCFD Climate Financial Risk & Parametric VaR Model</span>
                        <span className="text-xs font-normal text-emerald-400">RCP 2.6 (Orderly 1.5°C) vs RCP 8.5 (Extreme 4°C)</span>
                      </h3>
                      <p className="text-xs text-slate-400">Physical hazards (acute & chronic) and transition policy shocks modeled against enterprise value</p>
                    </div>
                    <button
                      type="button"
                      className="esg-btn-emerald"
                      onClick={() => setShowTcfdSimDrawer(true)}
                      data-testid="open-tcfd-sim-drawer"
                    >
                      <Sliders className="w-4 h-4 mr-1.5" />
                      Configure Climate Scenario Simulation
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Worst-Case Climate VaR-95</span>
                      <span className="esg-stat-value text-red-400">${(tcfd.worstCaseVar95Usd / 1000000).toFixed(1)}M</span>
                      <span className="esg-stat-sub">Parametric tail risk 95% CI</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Mitigation Spend Recommendation</span>
                      <span className="esg-stat-value text-amber-400">${(tcfd.recommendedMitigationSpendUsd / 1000000).toFixed(1)}M</span>
                      <span className="esg-stat-sub">Recommended capex & offsets</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Current Climate VaR (95%)</span>
                      <span className="esg-stat-value text-orange-400">${((overview?.climateVar95Usd || 0) / 1000000).toFixed(1)}M</span>
                      <span className="esg-stat-sub">Across active horizons</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Active Scenario Models</span>
                      <span className="esg-stat-value text-emerald-400">{tcfd.scenarios.length}</span>
                      <span className="esg-stat-sub">Short (2030) to Long (2050)</span>
                    </div>
                  </div>

                  {tcfdSimResult && (
                    <div className="esg-panel border border-emerald-500/50 bg-emerald-950/20 mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Live Simulation Results: {tcfdSimResult.scenario.replace(/_/g, ' ')} ({tcfdSimResult.timeHorizon.replace(/_/g, ' ')})
                        </span>
                        <span className="text-xs text-slate-400">Carbon Price: ${tcfdSimResult.carbonTaxLiabilityUsd > 0 ? (tcfdSimResult.carbonTaxLiabilityUsd / 37770).toFixed(0) : '0'}/tCO₂e</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Acute Physical Loss:</span>
                          <span className="text-sm font-bold text-white">${(tcfdSimResult.acutePhysicalLossUsd / 1000000).toFixed(2)}M</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Carbon Tax Liability:</span>
                          <span className="text-sm font-bold text-amber-400">${(tcfdSimResult.carbonTaxLiabilityUsd / 1000000).toFixed(2)}M</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Stranded Asset Impairment:</span>
                          <span className="text-sm font-bold text-orange-400">${(tcfdSimResult.strandedAssetImpairmentUsd / 1000000).toFixed(2)}M</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Simulated Climate VaR-95:</span>
                          <span className="text-sm font-bold text-emerald-400">${(tcfdSimResult.climateVar95Usd / 1000000).toFixed(2)}M</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {tcfd.scenarios.map((scenario) => (
                      <div key={scenario.id} className="esg-panel">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <span className="text-sm font-bold text-white mr-2">{scenario.scenarioLabel}</span>
                            <span className={`esg-badge ${scenario.scenario.includes('2_6') ? 'esg-badge-emerald' : 'esg-badge-red'}`}>
                              {scenario.scenario.replace(/_/g, ' ')}
                            </span>
                            <span className="esg-badge esg-badge-blue ml-2">{scenario.timeHorizon.replace(/_/g, ' ')}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400 block">Scenario VaR-95</span>
                            <span className="text-sm font-bold text-amber-300">${(scenario.climateVar95Usd / 1000000).toFixed(1)}M</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-semibold text-slate-300 block mb-2">Physical Risks ({scenario.physicalRisks.length})</span>
                            <div className="space-y-2">
                              {scenario.physicalRisks.map((pr) => (
                                <div key={pr.hazardType} className="esg-subcard">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-emerald-300">{pr.hazardLabel}</span>
                                    <span className="text-slate-300">Expected: ${(pr.expectedAnnualLossUsd / 1000000).toFixed(2)}M</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-slate-400">
                                    <span>Exposed Asset: ${(pr.exposedAssetValueUsd / 1000000).toFixed(1)}M</span>
                                    <span className={`esg-badge ${pr.riskSeverity === 'severe' || pr.riskSeverity === 'catastrophic' ? 'esg-badge-red' : 'esg-badge-yellow'}`}>
                                      {pr.riskSeverity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <span className="text-xs font-semibold text-slate-300 block mb-2">Transition Risks ({scenario.transitionRisks.length})</span>
                            <div className="space-y-2">
                              {scenario.transitionRisks.map((tr) => (
                                <div key={tr.driver} className="esg-subcard">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-amber-300">{tr.driverLabel}</span>
                                    <span className="text-slate-300">Tax: ${(tr.annualCarbonTaxLiabilityUsd / 1000000).toFixed(2)}M</span>
                                  </div>
                                  <div className="flex justify-between text-[11px] text-slate-400">
                                    <span>Stranded Assets: ${(tr.strandedAssetWriteDownUsd / 1000000).toFixed(1)}M</span>
                                    <span>Capex: ${(tr.lowCarbonCapexRequiredUsd / 1000000).toFixed(1)}M</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'csrd-materiality' && materiality && (
                <div className="esg-tab-content" data-testid="csrd-materiality-content">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>EU CSRD Double Materiality Matrix (ESRS Standards)</span>
                        <span className="text-xs font-normal text-emerald-400">Impact Materiality vs Financial Materiality (1.0 - 5.0)</span>
                      </h3>
                      <p className="text-xs text-slate-400">Threshold 3.0: Tier 1 Double Material topics require mandatory audited CSRD disclosure</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Average CSRD Audit Readiness:</span>
                      <span className="esg-badge esg-badge-emerald font-bold">{materiality.averageAuditReadinessPercent}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Total ESRS Topics</span>
                      <span className="esg-stat-value text-white">{materiality.totalTopicsAssessed}</span>
                      <span className="esg-stat-sub">ESRS E1-E5, S1-S4, G1</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Tier 1: Double Material</span>
                      <span className="esg-stat-value text-emerald-400">{materiality.doubleMaterialTopicsCount}</span>
                      <span className="esg-stat-sub">Mandatory CSRD Scope</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Tier 2: Single Material</span>
                      <span className="esg-stat-value text-amber-400">{materiality.impactOnlyTopicsCount + materiality.financialOnlyTopicsCount}</span>
                      <span className="esg-stat-sub">Impact ({materiality.impactOnlyTopicsCount}) &bull; Financial ({materiality.financialOnlyTopicsCount})</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Tier 3: Non-Material</span>
                      <span className="esg-stat-value text-slate-400">{materiality.nonMaterialTopicsCount}</span>
                      <span className="esg-stat-sub">Monitored for Shifts</span>
                    </div>
                  </div>

                  <div className="esg-panel mb-5">
                    <h4 className="esg-panel-title">
                      <Scale className="w-4 h-4 text-emerald-400 mr-2" />
                      2D Double Materiality Scatter Visual (1.0 to 5.0 Scale)
                    </h4>
                    <div className="esg-matrix-canvas">
                      <div className="esg-quadrant-bg">
                        <div className="esg-quadrant-marker esg-q1">Tier 2: Impact Only</div>
                        <div className="esg-quadrant-marker esg-q2">Tier 1: DOUBLE MATERIAL (Mandatory)</div>
                        <div className="esg-quadrant-marker esg-q3">Tier 3: Non-Material</div>
                        <div className="esg-quadrant-marker esg-q4">Tier 2: Financial Only</div>
                      </div>
                      {materiality.topics.map((t) => {
                        const leftPercent = ((t.financialMaterialityScore - 1) / 4) * 85 + 5;
                        const bottomPercent = ((t.impactMaterialityScore - 1) / 4) * 85 + 5;
                        return (
                          <div
                            key={t.id}
                            className={`esg-matrix-dot ${t.materialityTier === 'tier_1_double_material' ? 'dot-tier1' : t.materialityTier.includes('tier_2') ? 'dot-tier2' : 'dot-tier3'}`}
                            style={{ left: `${leftPercent}%`, bottom: `${bottomPercent}%` }}
                            title={`${t.standard}: ${t.topicName} (Impact: ${t.impactMaterialityScore}, Financial: ${t.financialMaterialityScore})`}
                            onClick={() => handleOpenMaterialityEdit(t)}
                          >
                            <span className="dot-label">{t.topicCode}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mt-2 px-1">
                      <span>Low Financial Materiality (1.0)</span>
                      <span className="font-semibold text-emerald-400">Threshold (3.0)</span>
                      <span>High Financial Materiality (5.0)</span>
                    </div>
                  </div>

                  <div className="esg-panel">
                    <h4 className="esg-panel-title">
                      <FileText className="w-4 h-4 text-cyan-400 mr-2" />
                      Assessed ESRS Topic Roster & Global Standard Crosswalk
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="esg-table">
                        <thead>
                          <tr>
                            <th>Standard</th>
                            <th>Topic Name</th>
                            <th>Impact (1-5)</th>
                            <th>Financial (1-5)</th>
                            <th>Tier Classification</th>
                            <th>GRI / ISSB Crosswalk</th>
                            <th>Mandatory</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {materiality.topics.map((t) => (
                            <tr key={t.id}>
                              <td className="font-bold text-white">{t.standard} ({t.topicCode})</td>
                              <td className="text-xs text-slate-200">{t.topicName}</td>
                              <td className="text-xs font-semibold text-emerald-300">{t.impactMaterialityScore.toFixed(1)}</td>
                              <td className="text-xs font-semibold text-cyan-300">{t.financialMaterialityScore.toFixed(1)}</td>
                              <td>
                                <span className={`esg-badge ${t.materialityTier === 'tier_1_double_material' ? 'esg-badge-emerald' : t.materialityTier.includes('tier_2') ? 'esg-badge-yellow' : 'esg-badge-slate'}`}>
                                  {t.materialityTier.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="text-xs text-slate-400">
                                <span>{t.griAlignmentReference}</span> &bull; <span>{t.issbReference}</span>
                              </td>
                              <td>
                                {t.isMaterial ? (
                                  <span className="esg-badge esg-badge-red">Mandatory</span>
                                ) : (
                                  <span className="esg-badge esg-badge-slate">Voluntary</span>
                                )}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className="esg-btn-sm"
                                  onClick={() => handleOpenMaterialityEdit(t)}
                                  data-testid={`edit-topic-${t.topicCode.toLowerCase()}`}
                                >
                                  Edit Scores
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sbti-supply-chain' && supplyChain && (
                <div className="esg-tab-content" data-testid="sbti-supply-chain-content">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Scope 3 Supplier Decarbonization & SBTi 1.5°C Target Trajectory</span>
                        <span className={`esg-badge ${supplyChain.sbtiTelemetry.alignmentStatus === 'on_track_1_5c' ? 'esg-badge-emerald' : 'esg-badge-yellow'}`}>
                          SBTi {supplyChain.sbtiTelemetry.alignmentStatus.replace(/_/g, ' ')}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">Linear -4.2%/yr net-zero glide path with Tier A-D supplier engagement coverage</p>
                    </div>
                    <button
                      type="button"
                      className="esg-btn-emerald"
                      onClick={() => setShowSupplierSimModal(true)}
                      data-testid="open-supplier-sim-modal"
                    >
                      <Sliders className="w-4 h-4 mr-1.5" />
                      Run Supplier Decarbonization Cascade
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">SBTi Actual Footprint</span>
                      <span className="esg-stat-value text-emerald-400">{supplyChain.sbtiTelemetry.currentYearActualTco2e.toLocaleString()} <span className="text-xs font-normal">tCO₂e</span></span>
                      <span className="esg-stat-sub">Target: {supplyChain.sbtiTelemetry.currentYearTargetTco2e.toLocaleString()} tCO₂e</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">SBTi Target Variance</span>
                      <span className="esg-stat-value text-teal-300">{supplyChain.sbtiTelemetry.trajectoryVariancePercent}%</span>
                      <span className="esg-stat-sub">Linear Reduction: -{supplyChain.sbtiTelemetry.target1Point5CYearlyReductionRatePercent}%/yr</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Supplier Spend Coverage</span>
                      <span className="esg-stat-value text-cyan-300">{supplyChain.sbtiTelemetry.supplierEngagementSpendCoveragePercent}%</span>
                      <span className="esg-stat-sub">SBTi Mandate: &ge; {supplyChain.sbtiTelemetry.targetSupplierEngagementPercent}%</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Tracked Scope 3 Spend</span>
                      <span className="esg-stat-value text-purple-300">${(supplyChain.totalProcurementSpendUsd / 1000000).toFixed(1)}M</span>
                      <span className="esg-stat-sub">{supplyChain.totalVendorsTracked} Key Partners</span>
                    </div>
                  </div>

                  {supplierSimResult && (
                    <div className="esg-panel border border-emerald-500/50 bg-emerald-950/20 mb-5">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Cascade Simulation: Abated {supplierSimResult.abatedScope3Tco2e.toLocaleString()} tCO₂e ({supplierSimResult.abatementPercentage}%)
                        </span>
                        <span className="text-xs text-emerald-300">Spend Covered: {supplierSimResult.procurementSpendCoveredPercent}%</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Baseline Scope 3:</span>
                          <span className="text-sm font-bold text-white">{supplierSimResult.baselineScope3Tco2e.toLocaleString()} tCO₂e</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Projected Scope 3:</span>
                          <span className="text-sm font-bold text-emerald-300">{supplierSimResult.projectedScope3Tco2e.toLocaleString()} tCO₂e</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Abatement Volume:</span>
                          <span className="text-sm font-bold text-teal-400">-{supplierSimResult.abatedScope3Tco2e.toLocaleString()} tCO₂e</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Post-Sim Alignment:</span>
                          <span className="text-sm font-bold text-green-400 uppercase">{supplierSimResult.newAlignmentStatus.replace(/_/g, ' ')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="esg-panel">
                    <h4 className="esg-panel-title">
                      <Building2 className="w-4 h-4 text-emerald-400 mr-2" />
                      Key Supplier Decarbonization Roster ({supplyChain.topSuppliers.length} Tracked Partners)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="esg-table">
                        <thead>
                          <tr>
                            <th>Supplier Partner</th>
                            <th>Spend (USD)</th>
                            <th>Allocated Footprint</th>
                            <th>ESG Tier</th>
                            <th>SBTi Committed</th>
                            <th>Renewable %</th>
                            <th>Annual Reductions</th>
                            <th>Engagement Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {supplyChain.topSuppliers.map((s) => (
                            <tr key={s.id}>
                              <td>
                                <span className="font-semibold text-white block">{s.vendorName}</span>
                                <span className="text-[11px] text-slate-400">{s.procurementCategory}</span>
                              </td>
                              <td className="text-xs text-slate-200">${(s.annualSpendUsd / 1000000).toFixed(1)}M</td>
                              <td className="text-xs font-semibold text-emerald-300">{s.allocatedScope3Tco2e.toLocaleString()} tCO₂e</td>
                              <td>
                                <span className={`esg-badge ${s.esgTier === 'tier_a_sbti_net_zero' ? 'esg-badge-emerald' : s.esgTier === 'tier_b_measured_targets' ? 'esg-badge-blue' : s.esgTier === 'tier_c_basic_disclosure' ? 'esg-badge-yellow' : 'esg-badge-red'}`}>
                                  {s.esgTier.replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </td>
                              <td>
                                {s.hasSbtiValidatedTarget ? (
                                  <span className="esg-badge esg-badge-emerald flex items-center gap-1 w-fit">
                                    <Check className="w-3 h-3" /> Committed
                                  </span>
                                ) : (
                                  <span className="esg-badge esg-badge-slate">Uncommitted</span>
                                )}
                              </td>
                              <td className="text-xs font-semibold text-teal-300">{s.reportedRenewableElectricityPercent}%</td>
                              <td className="text-xs font-bold text-white">-{s.annualEmissionsReductionPercent}%/yr</td>
                              <td>
                                {s.engagementStatus === 'engaged_active' ? (
                                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                                  </span>
                                ) : (
                                  <span className="text-xs text-amber-400 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" /> Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sec-board-memo' && (
                <div className="esg-tab-content" data-testid="sec-board-memo-content">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>SEC Climate Disclosure, Greenwashing Audit & Board ESG Memorandum</span>
                        <span className="esg-badge esg-badge-emerald">Tripartite C-Suite State Machine</span>
                      </h3>
                      <p className="text-xs text-slate-400">Regulation S-K Items 1500-1507 & Reg S-X Article 14 1% Footnote verification with CSO/CFO/Board sign-off</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="esg-btn-emerald"
                        onClick={handleGenerateMemo}
                        data-testid="generate-board-memo-button"
                      >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Compile Fresh Board Memorandum
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-5">
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Composite ESG Governance</span>
                      <span className="esg-stat-value text-emerald-400">{overview?.compositeScore}/100</span>
                      <span className="esg-stat-sub">{overview?.statusBand.replace(/_/g, ' ').toUpperCase()}</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">SEC Disclosure Readiness</span>
                      <span className="esg-stat-value text-teal-300">{sec?.overallFilingReadinessPercent}%</span>
                      <span className="esg-stat-sub">Reg S-K & S-X Compliant</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Greenwashing Risk Index</span>
                      <span className="esg-stat-value text-green-300">{sec?.greenwashingAudit.greenwashingExposureIndex}/100</span>
                      <span className="esg-stat-sub">Risk: {sec?.greenwashingAudit.overallRiskLevel.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="esg-card-stat">
                      <span className="esg-stat-label">Memorandum Approval</span>
                      <span className="esg-stat-value text-amber-300 uppercase text-sm font-bold">{memo?.status.replace(/_/g, ' ') || 'None'}</span>
                      <span className="esg-stat-sub">CSO &bull; CFO &bull; Board Chair</span>
                    </div>
                  </div>

                  {sec && (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="esg-panel">
                        <h4 className="esg-panel-title">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 mr-2" />
                          SEC Climate Rule Readiness Checklist (Items 1500-1507 & Reg S-X)
                        </h4>
                        <div className="space-y-2.5">
                          {sec.regSkItems.map((reg) => (
                            <div key={reg.itemCode} className="esg-subcard">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="font-bold text-white">{reg.itemCode}: {reg.itemTitle}</span>
                                <span className={`esg-badge ${reg.isCompliant ? 'esg-badge-emerald' : 'esg-badge-yellow'}`}>
                                  {reg.isCompliant ? 'Compliant' : 'Remediation Required'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-300 mb-1">{reg.keyFindings}</p>
                              <div className="flex justify-between text-[10px] text-slate-400">
                                <span>Audit Readiness: {reg.readinessScorePercent}%</span>
                                <span>{reg.regulationCitation}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="esg-panel">
                        <h4 className="esg-panel-title">
                          <AlertTriangle className="w-4 h-4 text-amber-400 mr-2" />
                          Greenwashing Risk Audit & Claim Verification ({sec.greenwashingAudit.activeFlags.length} Monitored Claims)
                        </h4>
                        <div className="space-y-2.5">
                          {sec.greenwashingAudit.activeFlags.map((flag) => (
                            <div key={flag.id} className="esg-subcard">
                              <div className="flex justify-between items-center text-xs mb-1">
                                <span className="font-semibold text-slate-200">"{flag.claimSnippet}"</span>
                                <span className={`esg-badge ${flag.riskSeverity === 'high' ? 'esg-badge-red' : flag.riskSeverity === 'medium' ? 'esg-badge-yellow' : 'esg-badge-blue'}`}>
                                  {flag.riskSeverity.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mb-1.5">Standard: {flag.regulatoryStandardViolated}</p>
                              <div className="p-1.5 rounded bg-slate-900/80 text-[10px] text-emerald-300">
                                Suggestion: {flag.suggestedDefensibleRewrite}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {memo && (
                    <div className="esg-panel">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-white">{memo.title}</h4>
                          <span className="text-xs text-slate-400">Document ID: {memo.id} &bull; Reporting Year: {memo.reportingYear}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="esg-btn-sm flex items-center gap-1 text-slate-300"
                            onClick={handleCopyMemo}
                            data-testid="copy-board-memo-button"
                          >
                            {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copySuccess ? 'Copied Markdown' : 'Copy Memorandum Markdown'}
                          </button>
                        </div>
                      </div>

                      <div className="p-3 bg-slate-900/90 rounded border border-slate-700/60 mb-4">
                        <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">C-Suite Tripartite Sign-Off Governance</div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="esg-signoff-card">
                            <span className="text-xs font-bold text-white block">Chief Sustainability Officer (CSO)</span>
                            <span className="text-[11px] text-slate-400 block mb-2">Technical Carbon & Climate Modeling Certification</span>
                            {memo.approvedByCsoAt ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Certified ({memo.approvedByCsoAt.slice(0, 10)})
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="esg-btn-emerald w-full text-xs"
                                onClick={() => handleSignOff('cso')}
                                data-testid="sign-off-cso"
                              >
                                Sign Off as CSO
                              </button>
                            )}
                          </div>

                          <div className="esg-signoff-card">
                            <span className="text-xs font-bold text-white block">Chief Financial Officer (CFO)</span>
                            <span className="text-[11px] text-slate-400 block mb-2">TCFD Financial Impact & Reg S-X 1% Verification</span>
                            {memo.approvedByCfoAt ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Certified ({memo.approvedByCfoAt.slice(0, 10)})
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="esg-btn-emerald w-full text-xs"
                                onClick={() => handleSignOff('cfo')}
                                data-testid="sign-off-cfo"
                              >
                                Sign Off as CFO
                              </button>
                            )}
                          </div>

                          <div className="esg-signoff-card">
                            <span className="text-xs font-bold text-white block">Board ESG Committee Chair</span>
                            <span className="text-[11px] text-slate-400 block mb-2">Board Governance Audit & Regulatory Approval</span>
                            {memo.approvedByBoardChairAt ? (
                              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approved ({memo.approvedByBoardChairAt.slice(0, 10)})
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="esg-btn-emerald w-full text-xs"
                                onClick={() => handleSignOff('board_esg_chair')}
                                data-testid="sign-off-board-esg-chair"
                              >
                                Sign Off as Board Chair
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="esg-memo-preview">
                        <div className="space-y-4">
                          <div className="border-b border-slate-800 pb-3">
                            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">{memo.executiveSummary.heading}</h5>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{memo.executiveSummary.executiveSummaryText}</p>
                            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                              {memo.executiveSummary.keyMetricsBulletPoints.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-b border-slate-800 pb-3">
                            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">{memo.ghgInventoryBreakdown.heading}</h5>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{memo.ghgInventoryBreakdown.executiveSummaryText}</p>
                            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                              {memo.ghgInventoryBreakdown.keyMetricsBulletPoints.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-b border-slate-800 pb-3">
                            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">{memo.tcfdScenarioAnalysis.heading}</h5>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{memo.tcfdScenarioAnalysis.executiveSummaryText}</p>
                            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                              {memo.tcfdScenarioAnalysis.keyMetricsBulletPoints.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="border-b border-slate-800 pb-3">
                            <h5 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-1">{memo.csrdMaterialityReview.heading}</h5>
                            <p className="text-xs text-slate-300 leading-relaxed mb-2">{memo.csrdMaterialityReview.executiveSummaryText}</p>
                            <ul className="list-disc pl-4 text-xs text-slate-400 space-y-1">
                              {memo.csrdMaterialityReview.keyMetricsBulletPoints.map((bp, i) => (
                                <li key={i}>{bp}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showRecordEmissionsModal && (
        <div className="jobtrack-modal-backdrop esg-submodal-backdrop">
          <div className="jobtrack-modal-container esg-submodal-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                Record Carbon Emissions Telemetry
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => setShowRecordEmissionsModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Reporting Year</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.reportingYear}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, reportingYear: parseInt(e.target.value, 10) || 2026 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Revenue ($M USD)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.revenueMillionUsd}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, revenueMillionUsd: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Scope 1 Stationary (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.scope1Stationary}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, scope1Stationary: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Scope 1 Mobile (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.scope1Mobile}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, scope1Mobile: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Scope 1 Fugitive (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.scope1Fugitive}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, scope1Fugitive: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Scope 2 Location-Based (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.scope2Location}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, scope2Location: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Scope 2 Market-Based (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.scope2Market}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, scope2Market: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Verified Removals (tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.verifiedRemovals}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, verifiedRemovals: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Headcount (FTE)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.headcountFte}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, headcountFte: parseInt(e.target.value, 10) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Facility Area (m²)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={emissionsForm.realEstateAreaM2}
                    onChange={(e) => setEmissionsForm({ ...emissionsForm, realEstateAreaM2: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="esg-btn-ghost text-xs"
                onClick={() => setShowRecordEmissionsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="esg-btn-emerald text-xs"
                onClick={handleRecordEmissions}
                data-testid="submit-record-emissions"
              >
                Save & Recalculate Intensities
              </button>
            </div>
          </div>
        </div>
      )}

      {showTcfdSimDrawer && (
        <div className="jobtrack-modal-backdrop esg-submodal-backdrop">
          <div className="jobtrack-modal-container esg-submodal-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Configure TCFD Climate Risk Simulation
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => setShowTcfdSimDrawer(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Climate Scenario</label>
                <select
                  className="esg-input"
                  value={tcfdSimForm.scenario}
                  onChange={(e) => setTcfdSimForm({ ...tcfdSimForm, scenario: e.target.value as TcfdClimateScenario })}
                >
                  <option value="rcp_2_6_net_zero">RCP 2.6 (Net Zero 1.5°C Orderly Transition)</option>
                  <option value="rcp_8_5_extreme_warming">RCP 8.5 (Extreme Warming 4°C Business-as-Usual)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Time Horizon</label>
                <select
                  className="esg-input"
                  value={tcfdSimForm.timeHorizon}
                  onChange={(e) => setTcfdSimForm({ ...tcfdSimForm, timeHorizon: e.target.value as ClimateTimeHorizon })}
                >
                  <option value="short_term_2030">Short Term (2030)</option>
                  <option value="medium_term_2040">Medium Term (2040)</option>
                  <option value="long_term_2050">Long Term (2050)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Carbon Tax ($/tCO₂e)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={tcfdSimForm.customCarbonPriceUsdPerTon}
                    onChange={(e) => setTcfdSimForm({ ...tcfdSimForm, customCarbonPriceUsdPerTon: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Enterprise Value ($ USD)</label>
                  <input
                    type="number"
                    className="esg-input"
                    value={tcfdSimForm.enterpriseValueUsd}
                    onChange={(e) => setTcfdSimForm({ ...tcfdSimForm, enterpriseValueUsd: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="esg-btn-ghost text-xs"
                onClick={() => setShowTcfdSimDrawer(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="esg-btn-emerald text-xs"
                onClick={() => {
                  handleRunTcfdSimulation();
                  setShowTcfdSimDrawer(false);
                }}
                data-testid="execute-tcfd-sim-button"
              >
                Run Scenario Simulation
              </button>
            </div>
          </div>
        </div>
      )}

      {showMaterialityEditModal && selectedTopic && (
        <div className="jobtrack-modal-backdrop esg-submodal-backdrop">
          <div className="jobtrack-modal-container esg-submodal-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-400" />
                Edit CSRD Scores: {selectedTopic.topicCode} ({selectedTopic.topicName})
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => setShowMaterialityEditModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Impact Scale (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="esg-input"
                    value={materialityEditForm.impactScale}
                    onChange={(e) => setMaterialityEditForm({ ...materialityEditForm, impactScale: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Financial Magnitude (1.0 - 5.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    className="esg-input"
                    value={materialityEditForm.financialMagnitude}
                    onChange={(e) => setMaterialityEditForm({ ...materialityEditForm, financialMagnitude: parseFloat(e.target.value) || 1.0 })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="esg-btn-ghost text-xs"
                onClick={() => setShowMaterialityEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="esg-btn-emerald text-xs"
                onClick={handleSaveMaterialityTopic}
                data-testid="save-materiality-topic"
              >
                Update Topic Classification
              </button>
            </div>
          </div>
        </div>
      )}

      {showSupplierSimModal && (
        <div className="jobtrack-modal-backdrop esg-submodal-backdrop">
          <div className="jobtrack-modal-container esg-submodal-container">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Scope 3 Supplier Decarbonization Cascade Simulator
              </h3>
              <button
                type="button"
                className="text-slate-400 hover:text-white"
                onClick={() => setShowSupplierSimModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-300 block mb-1">Target Tier A (% of Vendors)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="esg-input"
                    value={supplierSimForm.targetTierAProcurementSharePercent}
                    onChange={(e) => setSupplierSimForm({ ...supplierSimForm, targetTierAProcurementSharePercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="text-slate-300 block mb-1">Target Renewable Adoption (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    className="esg-input"
                    value={supplierSimForm.targetVendorRenewableAdoptionPercent}
                    onChange={(e) => setSupplierSimForm({ ...supplierSimForm, targetVendorRenewableAdoptionPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                className="esg-btn-ghost text-xs"
                onClick={() => setShowSupplierSimModal(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="esg-btn-emerald text-xs"
                onClick={() => {
                  handleRunSupplierSimulation();
                  setShowSupplierSimModal(false);
                }}
                data-testid="execute-supplier-sim-button"
              >
                Calculate Cascade Reductions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
