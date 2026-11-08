import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Coins,
  TrendingDown,
  Layers,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import {
  type EquityGrantType,
  type VestingScheduleType,
  type AccelerationClause,
  type LiquidationPreferenceType,
  type TaxJurisdiction,
  type EquityModelDTO,
  type CapTableSnapshotDTO,
  type DilutionRoundDTO,
  type ExecutiveEquityGrantDTO,
  calculateDilutionPipeline,
  evaluateWaterfallMatrix,
  computeExerciseCostAndTax,
  exportEquityModelToMarkdown
} from '../domain';
import { equityRepository } from '../data';

interface EquityLiquidityModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  defaultCompany?: string;
  defaultRole?: string;
}

type TabType = 'grants_captable' | 'dilution' | 'waterfall' | 'exercise_tax';

export const EquityLiquidityModal: React.FC<EquityLiquidityModalProps> = ({
  isOpen,
  onClose,
  applicationId,
  defaultCompany,
  defaultRole
}) => {
  const [models, setModels] = useState<EquityModelDTO[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('grants_captable');
  const [loading, setLoading] = useState<boolean>(true);
  const [copyFeedback, setCopyFeedback] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const [modelName, setModelName] = useState<string>('Executive Scenario');
  const [company, setCompany] = useState<string>(defaultCompany || 'FinFlow Global');
  const [role, setRole] = useState<string>(defaultRole || 'Chief Technology Officer');
  const [grantType, setGrantType] = useState<EquityGrantType>('iso');
  const [shareCount, setShareCount] = useState<number>(200000);
  const [strikePrice, setStrikePrice] = useState<number>(1.00);
  const [currentFmv, setCurrentFmv] = useState<number>(4.00);
  const [preferredPrice, setPreferredPrice] = useState<number>(8.00);
  const [cliffMonths, setCliffMonths] = useState<number>(12);
  const [vestingDurationMonths, setVestingDurationMonths] = useState<number>(48);
  const [postTerminationExerciseMonths, setPostTerminationExerciseMonths] = useState<number>(90);
  const [accelerationClause, setAccelerationClause] = useState<AccelerationClause>('double_trigger_acceleration');
  const [hasEarlyExercise, setHasEarlyExercise] = useState<boolean>(true);
  const [section83bElected, setSection83bElected] = useState<boolean>(true);

  const [commonShares, setCommonShares] = useState<number>(6000000);
  const [unallocatedOptionPool, setUnallocatedOptionPool] = useState<number>(1000000);
  const [preferredTiers, setPreferredTiers] = useState<{
    tierName: string;
    originalInvestmentAmount: number;
    sharesIssued: number;
    preferenceMultiple: number;
    participationType: LiquidationPreferenceType;
    seniorityRank: number;
  }[]>([
    {
      tierName: 'Series A',
      originalInvestmentAmount: 5000000,
      sharesIssued: 3000000,
      preferenceMultiple: 1.0,
      participationType: 'non_participating',
      seniorityRank: 1
    }
  ]);

  const [dilutionRounds, setDilutionRounds] = useState<DilutionRoundDTO[]>([
    {
      roundName: 'Series B Growth',
      preMoneyValuation: 50000000,
      capitalRaised: 15000000,
      newOptionPoolExpansionPercent: 5,
      issuedShareCount: 3000000,
      postMoneyValuation: 65000000,
      investorSharePercentage: 23.08,
      cumulativeDilutionFactor: 76.92
    }
  ]);

  const [exitValuations, setExitValuations] = useState<number[]>([
    25000000, 50000000, 100000000, 250000000, 500000000, 1000000000
  ]);
  const [taxJurisdiction, setTaxJurisdiction] = useState<TaxJurisdiction>('us_federal_california');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    loadModels();
  }, [isOpen]);

  async function loadModels() {
    setLoading(true);
    try {
      const list = await equityRepository.listModels();
      setModels(list);
      if (list.length > 0) {
        applyModelToState(list[0]);
      }
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  function applyModelToState(m: EquityModelDTO) {
    setSelectedModelId(m.id);
    setModelName(m.modelName);
    setCompany(m.grant.company);
    setRole(m.grant.role);
    setGrantType(m.grant.grantType);
    setShareCount(m.grant.shareCount);
    setStrikePrice(m.grant.strikePrice);
    setCurrentFmv(m.grant.currentFmv);
    setPreferredPrice(m.grant.preferredPrice);
    setCliffMonths(m.grant.cliffMonths);
    setVestingDurationMonths(m.grant.vestingDurationMonths);
    setPostTerminationExerciseMonths(m.grant.postTerminationExerciseMonths);
    setAccelerationClause(m.grant.accelerationClause);
    setHasEarlyExercise(m.grant.hasEarlyExercise);
    setSection83bElected(m.grant.section83bElected);

    setCommonShares(m.capTable.commonShares);
    setUnallocatedOptionPool(m.capTable.unallocatedOptionPoolShares);
    setPreferredTiers(m.capTable.preferredTiers);
    setDilutionRounds(m.dilutionRounds);
    setExitValuations(m.exitScenarios.map(s => s.exitValuation));
    setTaxJurisdiction(m.taxAnalysis.jurisdiction);
    setNotes(m.notes || '');
  }

  function handleSelectModel(id: string) {
    const found = models.find(m => m.id === id);
    if (found) {
      applyModelToState(found);
    }
  }

  function handleNewModel() {
    setSelectedModelId('');
    setModelName('New Executive Equity Scenario');
    if (defaultCompany) setCompany(defaultCompany);
    if (defaultRole) setRole(defaultRole);
    setGrantType('iso');
    setShareCount(150000);
    setStrikePrice(1.50);
    setCurrentFmv(5.00);
    setPreferredPrice(10.00);
    setCliffMonths(12);
    setVestingDurationMonths(48);
    setPostTerminationExerciseMonths(90);
    setAccelerationClause('double_trigger_acceleration');
    setHasEarlyExercise(true);
    setSection83bElected(true);
    setCommonShares(6000000);
    setUnallocatedOptionPool(1000000);
    setPreferredTiers([
      {
        tierName: 'Series A',
        originalInvestmentAmount: 5000000,
        sharesIssued: 3000000,
        preferenceMultiple: 1.0,
        participationType: 'non_participating',
        seniorityRank: 1
      }
    ]);
    setDilutionRounds([]);
    setExitValuations([25000000, 50000000, 100000000, 250000000, 500000000, 1000000000]);
    setTaxJurisdiction('us_federal_california');
    setNotes('');
  }

  const initialCapTable: CapTableSnapshotDTO = useMemo(() => {
    const totalPrefShares = preferredTiers.reduce((acc, t) => acc + t.sharesIssued, 0);
    return {
      totalFullyDilutedShares: commonShares + unallocatedOptionPool + totalPrefShares,
      commonShares,
      unallocatedOptionPoolShares: unallocatedOptionPool,
      preferredTiers
    };
  }, [commonShares, unallocatedOptionPool, preferredTiers]);

  const dilutionResult = useMemo(() => {
    return calculateDilutionPipeline(initialCapTable, shareCount, dilutionRounds);
  }, [initialCapTable, shareCount, dilutionRounds]);

  const waterfallScenarios = useMemo(() => {
    return evaluateWaterfallMatrix(
      exitValuations,
      dilutionResult.finalCapTable,
      dilutionResult.executiveDilutedShares,
      strikePrice,
      taxJurisdiction
    );
  }, [exitValuations, dilutionResult, strikePrice, taxJurisdiction]);

  const medianExit = useMemo(() => {
    return waterfallScenarios[Math.floor(waterfallScenarios.length / 2)] || waterfallScenarios[0];
  }, [waterfallScenarios]);

  const activeFmv = medianExit ? medianExit.commonSharePrice : currentFmv;

  const currentGrantDTO: ExecutiveEquityGrantDTO = useMemo(() => ({
    id: selectedModelId || 'active-grant',
    company,
    role,
    grantType,
    shareCount,
    strikePrice,
    currentFmv,
    preferredPrice,
    grantDate: '2024-01-01',
    vestingStartDate: '2024-01-01',
    vestingScheduleType: 'standard_4yr_1yr_cliff',
    cliffMonths,
    vestingDurationMonths,
    postTerminationExerciseMonths,
    accelerationClause,
    hasEarlyExercise,
    section83bElected
  }), [
    selectedModelId, company, role, grantType, shareCount, strikePrice, currentFmv,
    preferredPrice, cliffMonths, vestingDurationMonths, postTerminationExerciseMonths,
    accelerationClause, hasEarlyExercise, section83bElected
  ]);

  const taxAnalysis = useMemo(() => {
    return computeExerciseCostAndTax(
      currentGrantDTO,
      activeFmv,
      activeFmv,
      taxJurisdiction
    );
  }, [currentGrantDTO, activeFmv, taxJurisdiction]);

  const activeModelDTO: EquityModelDTO = useMemo(() => ({
    id: selectedModelId || 'active-scenario',
    modelName,
    applicationId: applicationId || null,
    grant: currentGrantDTO,
    capTable: dilutionResult.finalCapTable,
    dilutionRounds,
    exitScenarios: waterfallScenarios,
    taxAnalysis,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }), [selectedModelId, modelName, applicationId, currentGrantDTO, dilutionResult, dilutionRounds, waterfallScenarios, taxAnalysis, notes]);

  async function handleSaveModel() {
    setLoading(true);
    try {
      const payload = {
        modelName,
        applicationId: applicationId || null,
        grant: {
          company,
          role,
          grantType,
          shareCount,
          strikePrice,
          currentFmv,
          preferredPrice,
          grantDate: '2024-01-01',
          vestingStartDate: '2024-01-01',
          vestingScheduleType: 'standard_4yr_1yr_cliff' as VestingScheduleType,
          cliffMonths,
          vestingDurationMonths,
          postTerminationExerciseMonths,
          accelerationClause,
          hasEarlyExercise,
          section83bElected
        },
        capTable: initialCapTable,
        dilutionRounds,
        exitValuations,
        taxJurisdiction,
        notes
      };

      const saved = await equityRepository.saveModel(payload, selectedModelId || undefined);
      setSelectedModelId(saved.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadModels();
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteModel() {
    if (!selectedModelId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa mô hình phân tích này?')) return;
    setLoading(true);
    try {
      await equityRepository.deleteModel(selectedModelId);
      await loadModels();
    } catch {
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  function handleCopyMarkdown() {
    const md = exportEquityModelToMarkdown(activeModelDTO);
    navigator.clipboard.writeText(md);
    setCopyFeedback('Đã sao chép báo cáo Markdown vào bộ nhớ tạm!');
    setTimeout(() => setCopyFeedback(''), 3000);
  }

  function addPreferredTier() {
    const nextRank = preferredTiers.length + 1;
    setPreferredTiers([
      ...preferredTiers,
      {
        tierName: `Series ${String.fromCharCode(65 + preferredTiers.length)}`,
        originalInvestmentAmount: 10000000,
        sharesIssued: 2000000,
        preferenceMultiple: 1.0,
        participationType: 'non_participating',
        seniorityRank: nextRank
      }
    ]);
  }

  function removePreferredTier(idx: number) {
    setPreferredTiers(preferredTiers.filter((_, i) => i !== idx));
  }

  function addDilutionRound() {
    setDilutionRounds([
      ...dilutionRounds,
      {
        roundName: `Future Round ${dilutionRounds.length + 1}`,
        preMoneyValuation: 100000000,
        capitalRaised: 25000000,
        newOptionPoolExpansionPercent: 5,
        issuedShareCount: 2500000,
        postMoneyValuation: 125000000,
        investorSharePercentage: 20.0,
        cumulativeDilutionFactor: 80.0
      }
    ]);
  }

  function removeDilutionRound(idx: number) {
    setDilutionRounds(dilutionRounds.filter((_, i) => i !== idx));
  }

  if (!isOpen) return null;

  return (
    <div className="elm-modal-overlay" onClick={onClose}>
      <div className="elm-modal" onClick={e => e.stopPropagation()}>
        <div className="elm-header">
          <div className="elm-header-left">
            <div className="elm-icon-box">
              <Coins size={22} />
            </div>
            <div>
              <div className="elm-title-row">
                <h3 className="elm-title">Mô Hình Định Giá Cổ Phần & Kịch Bản Thanh Khoản</h3>
                <span className="elm-title-badge">Executive Cap Table & Waterfall</span>
              </div>
              <p className="elm-subtitle">
                Đánh giá rủi ro pha loãng, thứ tự ưu tiên thanh lý nhà đầu tư và tối ưu hóa nghĩa vụ thuế ESOP/ISO
              </p>
            </div>
          </div>
          <button className="elm-close-btn" onClick={onClose} title="Đóng modal">
            <X size={20} />
          </button>
        </div>

        <div className="elm-model-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--slate-600)' }}>Kịch bản đang xem:</span>
            <select
              className="elm-model-select"
              value={selectedModelId}
              onChange={e => handleSelectModel(e.target.value)}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>
                  {m.modelName} ({m.grant.company})
                </option>
              ))}
              {selectedModelId === '' && <option value="">Mô hình mới (chưa lưu)</option>}
            </select>
            <button className="elm-btn-secondary" onClick={handleNewModel}>
              <Plus size={15} /> Thêm Kịch Bản Mới
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="elm-btn-secondary" onClick={handleCopyMarkdown}>
              <Copy size={15} /> Sao Chép Báo Cáo
            </button>
            {copyFeedback && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--emerald-600)' }}>{copyFeedback}</span>
            )}
          </div>
        </div>

        <div className="elm-nav-tabs">
          <button
            className={`elm-tab-btn ${activeTab === 'grants_captable' ? 'active' : ''}`}
            onClick={() => setActiveTab('grants_captable')}
          >
            <Coins size={16} /> 1. Gói Cổ Phần & Cap Table
          </button>
          <button
            className={`elm-tab-btn ${activeTab === 'dilution' ? 'active' : ''}`}
            onClick={() => setActiveTab('dilution')}
          >
            <TrendingDown size={16} /> 2. Kịch Bản Pha Loãng
            <span className="elm-tab-badge">-{dilutionResult.roundByRoundSummary.length} Vòng</span>
          </button>
          <button
            className={`elm-tab-btn ${activeTab === 'waterfall' ? 'active' : ''}`}
            onClick={() => setActiveTab('waterfall')}
          >
            <Layers size={16} /> 3. Ma Trận Waterfall & Exit
          </button>
          <button
            className={`elm-tab-btn ${activeTab === 'exercise_tax' ? 'active' : ''}`}
            onClick={() => setActiveTab('exercise_tax')}
          >
            <DollarSign size={16} /> 4. Chi Phí Thực Hiện & Tối Ưu Thuế
          </button>
        </div>

        <div className="elm-body">
          {activeTab === 'grants_captable' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="elm-grid-4">
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tỷ Lệ Sở Hữu Ban Đầu</span>
                  <span className="elm-metric-val">
                    {((shareCount / (initialCapTable.totalFullyDilutedShares || 1)) * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tổng Cổ Phần Cấp</span>
                  <span className="elm-metric-val">{shareCount.toLocaleString()}</span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Giá Thực Hiện Quyền (Strike)</span>
                  <span className="elm-metric-val">${strikePrice.toFixed(2)}</span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Giá Trị Chênh Lệch Hiện Tại (Spread)</span>
                  <span className="elm-metric-val">
                    ${(shareCount * Math.max(0, currentFmv - strikePrice)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="elm-grid-2">
                <div className="elm-card">
                  <h4 className="elm-card-title">Thông Tin Gói Cổ Phần Đãi Ngộ</h4>
                  <div className="elm-input-row">
                    <label className="elm-label">Tên Mô Hình / Kịch Bản</label>
                    <input
                      className="elm-input"
                      value={modelName}
                      onChange={e => setModelName(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="elm-input-row">
                      <label className="elm-label">Công Ty</label>
                      <input
                        className="elm-input"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                      />
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">Vị Trí Đảm Nhiệm</label>
                      <input
                        className="elm-input"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="elm-input-row">
                      <label className="elm-label">Loại Cổ Phần</label>
                      <select
                        className="elm-select"
                        value={grantType}
                        onChange={e => setGrantType(e.target.value as EquityGrantType)}
                      >
                        <option value="iso">ISO (Incentive Stock Options)</option>
                        <option value="nso">NSO (Non-Qualified Options)</option>
                        <option value="esop">ESOP (Vietnam / SEA Standard)</option>
                        <option value="rsu">RSU (Restricted Stock Units)</option>
                        <option value="phantom">Phantom Shares</option>
                      </select>
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">Số Lượng Cổ Phần</label>
                      <input
                        type="number"
                        className="elm-input"
                        value={shareCount}
                        onChange={e => setShareCount(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="elm-input-row">
                      <label className="elm-label">Strike Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="elm-input"
                        value={strikePrice}
                        onChange={e => setStrikePrice(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">409A FMV ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="elm-input"
                        value={currentFmv}
                        onChange={e => setCurrentFmv(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">Preferred Price ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="elm-input"
                        value={preferredPrice}
                        onChange={e => setPreferredPrice(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="elm-input-row">
                      <label className="elm-label">Thời Hạn Thực Hiện Sau Khi Rời Cty (PTEP)</label>
                      <select
                        className="elm-select"
                        value={postTerminationExerciseMonths}
                        onChange={e => setPostTerminationExerciseMonths(Number(e.target.value))}
                      >
                        <option value={3}>90 Ngày (Tiêu chuẩn thị trường cũ - Nguy hiểm)</option>
                        <option value={12}>1 Năm</option>
                        <option value={36}>3 Năm</option>
                        <option value={60}>5 Năm</option>
                        <option value={120}>10 Năm (Chuẩn Startup Thân Thiện Với Talent)</option>
                      </select>
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">Điều Khoản Tăng Tốc (Acceleration)</label>
                      <select
                        className="elm-select"
                        value={accelerationClause}
                        onChange={e => setAccelerationClause(e.target.value as AccelerationClause)}
                      >
                        <option value="none">Không tăng tốc (None)</option>
                        <option value="single_trigger_acceleration">Single-Trigger (Tăng tốc khi sáp nhập)</option>
                        <option value="double_trigger_acceleration">Double-Trigger (Sáp nhập & bị chấm dứt)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={hasEarlyExercise}
                        onChange={e => setHasEarlyExercise(e.target.checked)}
                      />
                      Cho phép Thực hiện sớm (Early Exercise)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={section83bElected}
                        onChange={e => setSection83bElected(e.target.checked)}
                      />
                      Đã Nộp Khai Thuế Section 83(b) trong 30 ngày
                    </label>
                  </div>
                </div>

                <div className="elm-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="elm-card-title">Bảng Vốn Hóa Hiện Tại (Cap Table)</h4>
                    <button className="elm-btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addPreferredTier}>
                      <Plus size={14} /> Thêm Vòng Preferred
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="elm-input-row">
                      <label className="elm-label">Số Cổ Phần Phổ Thông (Common)</label>
                      <input
                        type="number"
                        className="elm-input"
                        value={commonShares}
                        onChange={e => setCommonShares(Math.max(1, Number(e.target.value)))}
                      />
                    </div>
                    <div className="elm-input-row">
                      <label className="elm-label">Quỹ Dự Phòng Tùy Chọn (Option Pool)</label>
                      <input
                        type="number"
                        className="elm-input"
                        value={unallocatedOptionPool}
                        onChange={e => setUnallocatedOptionPool(Math.max(0, Number(e.target.value)))}
                      />
                    </div>
                  </div>

                  <div className="elm-table-container">
                    <table className="elm-table">
                      <thead>
                        <tr>
                          <th className="elm-th">Tên Vòng Ưu Đãi</th>
                          <th className="elm-th">Vốn Đã Rót ($)</th>
                          <th className="elm-th">Số Cổ Phần</th>
                          <th className="elm-th">Bội Số</th>
                          <th className="elm-th">Loại Quyền</th>
                          <th className="elm-th"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {preferredTiers.map((t, idx) => (
                          <tr key={idx}>
                            <td className="elm-td">
                              <input
                                className="elm-input"
                                style={{ minHeight: 28, padding: '2px 6px' }}
                                value={t.tierName}
                                onChange={e => {
                                  const updated = [...preferredTiers];
                                  updated[idx].tierName = e.target.value;
                                  setPreferredTiers(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">
                              <input
                                type="number"
                                className="elm-input"
                                style={{ minHeight: 28, padding: '2px 6px', width: 90 }}
                                value={t.originalInvestmentAmount}
                                onChange={e => {
                                  const updated = [...preferredTiers];
                                  updated[idx].originalInvestmentAmount = Number(e.target.value);
                                  setPreferredTiers(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">
                              <input
                                type="number"
                                className="elm-input"
                                style={{ minHeight: 28, padding: '2px 6px', width: 90 }}
                                value={t.sharesIssued}
                                onChange={e => {
                                  const updated = [...preferredTiers];
                                  updated[idx].sharesIssued = Number(e.target.value);
                                  setPreferredTiers(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">{t.preferenceMultiple}x</td>
                            <td className="elm-td">
                              <span className="elm-badge elm-badge-emerald">Non-Part</span>
                            </td>
                            <td className="elm-td">
                              <button
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--slate-400)' }}
                                onClick={() => removePreferredTier(idx)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="elm-callout-box">
                    <CheckCircle size={18} color="var(--emerald-600)" />
                    <div style={{ fontSize: 12.5, color: 'var(--emerald-800)', lineHeight: 1.5 }}>
                      <strong>Tổng Cổ Phần Pha Loãng Đầy Đủ (FDSO):</strong> {initialCapTable.totalFullyDilutedShares.toLocaleString()} cổ phần.
                      Nhà đầu tư nắm giữ tổng vốn cam kết ưu tiên: <strong>${preferredTiers.reduce((acc, t) => acc + t.originalInvestmentAmount, 0).toLocaleString()}</strong>.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dilution' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="elm-grid-3">
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tỷ Lệ Sở Hữu Sau Pha Loãng</span>
                  <span className="elm-metric-val">{dilutionResult.executiveOwnershipPercent}%</span>
                  <span style={{ fontSize: 11, color: 'var(--slate-500)' }}>
                    Từ {((shareCount / (initialCapTable.totalFullyDilutedShares || 1)) * 100).toFixed(3)}% ban đầu
                  </span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tổng Cổ Phần Sau Pha Loãng</span>
                  <span className="elm-metric-val">
                    {dilutionResult.finalCapTable.totalFullyDilutedShares.toLocaleString()}
                  </span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Số Vòng Gọi Vốn Mô Phỏng</span>
                  <span className="elm-metric-val">{dilutionRounds.length}</span>
                </div>
              </div>

              <div className="elm-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="elm-card-title">Lộ Trình Các Vòng Gọi Vốn Trong Tương Lai</h4>
                  <button className="elm-btn-secondary" onClick={addDilutionRound}>
                    <Plus size={15} /> Thêm Vòng Gọi Vốn
                  </button>
                </div>

                <div className="elm-table-container">
                  <table className="elm-table">
                    <thead>
                      <tr>
                        <th className="elm-th">Tên Vòng</th>
                        <th className="elm-th">Định Giá Trước Vốn (Pre-Money)</th>
                        <th className="elm-th">Vốn Huy Động (Capital)</th>
                        <th className="elm-th">Mở Rộng Pool (%)</th>
                        <th className="elm-th">Định Giá Sau Vốn</th>
                        <th className="elm-th">Sở Hữu Của Talent Sau Vòng</th>
                        <th className="elm-th"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {dilutionRounds.map((r, idx) => {
                        const summary = dilutionResult.roundByRoundSummary[idx];
                        return (
                          <tr key={idx}>
                            <td className="elm-td">
                              <input
                                className="elm-input"
                                style={{ minHeight: 28 }}
                                value={r.roundName}
                                onChange={e => {
                                  const updated = [...dilutionRounds];
                                  updated[idx].roundName = e.target.value;
                                  setDilutionRounds(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">
                              <input
                                type="number"
                                className="elm-input"
                                style={{ minHeight: 28, width: 110 }}
                                value={r.preMoneyValuation}
                                onChange={e => {
                                  const updated = [...dilutionRounds];
                                  updated[idx].preMoneyValuation = Number(e.target.value);
                                  setDilutionRounds(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">
                              <input
                                type="number"
                                className="elm-input"
                                style={{ minHeight: 28, width: 110 }}
                                value={r.capitalRaised}
                                onChange={e => {
                                  const updated = [...dilutionRounds];
                                  updated[idx].capitalRaised = Number(e.target.value);
                                  setDilutionRounds(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td">
                              <input
                                type="number"
                                className="elm-input"
                                style={{ minHeight: 28, width: 60 }}
                                value={r.newOptionPoolExpansionPercent}
                                onChange={e => {
                                  const updated = [...dilutionRounds];
                                  updated[idx].newOptionPoolExpansionPercent = Number(e.target.value);
                                  setDilutionRounds(updated);
                                }}
                              />
                            </td>
                            <td className="elm-td font-semibold">
                              ${((r.preMoneyValuation + r.capitalRaised) / 1000000).toFixed(1)}M
                            </td>
                            <td className="elm-td font-bold" style={{ color: 'var(--emerald-600)' }}>
                              {summary ? `${summary.executiveOwnershipPercentPostRound}%` : '-'}
                            </td>
                            <td className="elm-td">
                              <button
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--slate-400)' }}
                                onClick={() => removeDilutionRound(idx)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="elm-callout-box">
                  <AlertTriangle size={18} color="var(--amber-600)" />
                  <div style={{ fontSize: 12.5, color: 'var(--amber-800)', lineHeight: 1.5 }}>
                    <strong>Quy Tắc Vàng Khi Đàm Phán Tỷ Lệ Pha Loãng:</strong> Khi startup mở rộng thêm 5-10% unallocated option pool trước vòng mới, toàn bộ sự pha loãng được gánh bởi cổ đông hiện hữu (Founder & Employee) chứ không phải nhà đầu tư mới.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'waterfall' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="elm-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <h4 className="elm-card-title">Ma Trận Phân Bổ Dòng Tiền Thoái Vốn (Waterfall Exit Matrix)</h4>
                  <span className="elm-badge elm-badge-emerald">Hurdle Thanh Lý: 1x Non-Participating</span>
                </div>

                <div className="elm-table-container">
                  <table className="elm-table">
                    <thead>
                      <tr>
                        <th className="elm-th">Định Giá Exit</th>
                        <th className="elm-th">Trả Vốn Nhà Đầu Tư (Pref)</th>
                        <th className="elm-th">Giá 1 Cổ Phần Thường</th>
                        <th className="elm-th">Tổng Thu Executive (Gross)</th>
                        <th className="elm-th">Vốn Mua Quyền (Strike)</th>
                        <th className="elm-th">Thu Nhập Ròng Trước Thuế</th>
                        <th className="elm-th">Thực Nhận Sau Thuế</th>
                        <th className="elm-th">Bội Số Lời (Multiple)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waterfallScenarios.map((s, idx) => (
                        <tr key={idx} className={s.executiveNetPreTax > 0 ? 'elm-tr-highlight' : ''}>
                          <td className="elm-td font-bold">${(s.exitValuation / 1000000).toFixed(1)}M</td>
                          <td className="elm-td">${(s.preferredPayoutTotal / 1000000).toFixed(2)}M</td>
                          <td className="elm-td font-semibold">${s.commonSharePrice.toFixed(2)}</td>
                          <td className="elm-td font-semibold">${s.executiveGrossPayout.toLocaleString()}</td>
                          <td className="elm-td">${s.executiveExerciseCost.toLocaleString()}</td>
                          <td className="elm-td font-bold" style={{ color: s.executiveNetPreTax > 0 ? 'var(--emerald-600)' : 'var(--slate-400)' }}>
                            ${s.executiveNetPreTax.toLocaleString()}
                          </td>
                          <td className="elm-td font-black" style={{ color: s.executiveNetPostTax > 0 ? 'var(--emerald-700)' : 'var(--slate-400)' }}>
                            ${s.executiveNetPostTax.toLocaleString()}
                          </td>
                          <td className="elm-td">
                            <span className={`elm-badge ${s.returnMultipleOnStrike >= 5 ? 'elm-badge-emerald' : s.returnMultipleOnStrike > 1 ? 'elm-badge-blue' : 'elm-badge-amber'}`}>
                              {s.returnMultipleOnStrike}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="elm-callout-box">
                  <CheckCircle size={18} color="var(--emerald-600)" />
                  <div style={{ fontSize: 12.5, color: 'var(--emerald-800)', lineHeight: 1.5 }}>
                    <strong>Cơ Chế Chuyển Đổi Tự Động (Crossover Valuation):</strong> Tại các mốc định giá cao, nhà đầu tư ưu đãi tự nguyện chuyển đổi thành cổ phần phổ thông khi giá trị ăn chia theo tỷ lệ (% ownership) vượt quá cam kết 1x hoàn vốn ban đầu.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exercise_tax' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="elm-grid-4">
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tiền Mặt Cần Mua Quyền (Out of Pocket)</span>
                  <span className="elm-metric-val">${taxAnalysis.totalExerciseCost.toLocaleString()}</span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Chênh Lệch Tính Thuế Khi Exercise</span>
                  <span className="elm-metric-val">${taxAnalysis.spreadAtExercise.toLocaleString()}</span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tổng Nghĩa Vụ Thuế Dự Kiến</span>
                  <span className="elm-metric-val" style={{ color: 'var(--rose-700)' }}>
                    ${taxAnalysis.totalTaxLiability.toLocaleString()}
                  </span>
                </div>
                <div className="elm-metric-card">
                  <span className="elm-metric-lbl">Tỷ Lệ Thuế Thực Tế</span>
                  <span className="elm-metric-val">{taxAnalysis.effectiveOverallTaxRatePercent}%</span>
                </div>
              </div>

              <div className="elm-grid-2">
                <div className="elm-card">
                  <h4 className="elm-card-title">Cấu Hình Khu Vực Thuế & Nghĩa Vụ</h4>
                  <div className="elm-input-row">
                    <label className="elm-label">Khu Vực Áp Thuế (Jurisdiction)</label>
                    <select
                      className="elm-select"
                      value={taxJurisdiction}
                      onChange={e => setTaxJurisdiction(e.target.value as TaxJurisdiction)}
                    >
                      <option value="us_federal_california">Hoa Kỳ: Liên Bang + California (Thuế Bang Cao)</option>
                      <option value="us_federal_texas">Hoa Kỳ: Liên Bang + Texas (Không Có Thuế Bang)</option>
                      <option value="vietnam_pit">Việt Nam: Thuế TNCN (Thông tư 111 & Nghị định 126)</option>
                    </select>
                  </div>

                  <div className="elm-table-container">
                    <table className="elm-table">
                      <tbody>
                        <tr>
                          <td className="elm-td font-semibold">Thuế Thu Nhập Thông Thường Tại Thời Điểm Mua</td>
                          <td className="elm-td font-bold">${taxAnalysis.ordinaryIncomeTaxAtExercise.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <td className="elm-td font-semibold">Thuế Tối Thiểu Thay Thế (US Alternative Minimum Tax - AMT)</td>
                          <td className="elm-td font-bold" style={{ color: taxAnalysis.alternativeMinimumTaxAtExercise > 0 ? 'var(--rose-600)' : 'var(--slate-500)' }}>
                            ${taxAnalysis.alternativeMinimumTaxAtExercise.toLocaleString()}
                          </td>
                        </tr>
                        <tr>
                          <td className="elm-td font-semibold">Thuế Lãi Vốn Khi Thoái Vốn (Capital Gains Tax)</td>
                          <td className="elm-td font-bold">${taxAnalysis.capitalGainsTaxAtSale.toLocaleString()}</td>
                        </tr>
                        <tr style={{ background: 'var(--slate-50)' }}>
                          <td className="elm-td font-bold">Thực Nhận Ròng Sau Thuế (Net Cash Retained)</td>
                          <td className="elm-td font-black" style={{ color: 'var(--emerald-600)', fontSize: 15 }}>
                            ${taxAnalysis.netCashRetained.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="elm-card">
                  <h4 className="elm-card-title">Kế Hoạch Hành Động & Checklist Đàm Phán</h4>
                  <ul className="elm-checklist">
                    {taxAnalysis.optimalActionPlan.map((action, idx) => (
                      <li key={idx} className="elm-check-item">
                        {action}
                      </li>
                    ))}
                    <li className="elm-check-item">
                      Đảm bảo thời hạn PTEP từ 5 đến 10 năm để tránh mất quyền chọn khi rời công ty trước khi có sự kiện thanh khoản (IPO/M&A).
                    </li>
                    <li className="elm-check-item">
                      Cân nhắc cơ chế "Net Exercise" (thực hiện quyền không tiền mặt) nếu startup đạt định giá lớn trước khi thoái vốn.
                    </li>
                  </ul>
                  <div className="elm-input-row" style={{ marginTop: 8 }}>
                    <label className="elm-label">Ghi Chú Đàm Phán Của Ứng Viên</label>
                    <textarea
                      className="elm-textarea"
                      placeholder="Ghi chú điều khoản cam kết của ban quản trị, thỏa thuận phụ trách nhiệm..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="elm-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedModelId && (
              <button className="elm-btn-danger" onClick={handleDeleteModel} disabled={loading}>
                <Trash2 size={15} /> Xóa Mô Hình
              </button>
            )}
            {saveSuccess && (
              <span style={{ fontSize: 13, color: 'var(--emerald-600)', fontWeight: 700 }}>
                Đã lưu kịch bản thành công!
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="elm-btn-secondary" onClick={onClose}>
              Đóng
            </button>
            <button className="elm-btn-primary" onClick={handleSaveModel} disabled={loading}>
              <Save size={15} /> {loading ? 'Đang Lưu...' : 'Lưu Kịch Bản'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
