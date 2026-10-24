import React, { useState, useEffect } from 'react';
import {
  FileSignature,
  ShieldAlert,
  Scale,
  FileText,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Copy,
  Download,
  AlertTriangle,
  RefreshCw,
  X,
  Code2
} from 'lucide-react';
import {
  type ExecutiveContractDTO,
  type ExecutiveContractMutationDTO,
  type ContractRedlineDTO,
  type PriorInventionItemDTO,
  type RedlineStatus,
  type ClauseParametersMap,
  type LegalJurisdiction,
  type InventionCategory,
  type ClauseAuditItemDTO
} from '../domain';
import { executiveContractRepository } from '../data';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'scorecard' | 'audit' | 'redlines' | 'inventions';

export const ExecutiveContractGuardModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [contracts, setContracts] = useState<ExecutiveContractDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('scorecard');
  const [loading, setLoading] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddInvention, setShowAddInvention] = useState(false);
  const [showAddendumModal, setShowAddendumModal] = useState(false);
  const [addendumMarkdown, setAddendumMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  const [newCompanyName, setNewCompanyName] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('');
  const [newJurisdiction, setNewJurisdiction] = useState<LegalJurisdiction>('us_delaware_ny');

  const [invCategory, setInvCategory] = useState<InventionCategory>('open_source_repo');
  const [invTitle, setInvTitle] = useState('');
  const [invIdentifier, setInvIdentifier] = useState('');
  const [invDate, setInvDate] = useState('');
  const [invDesc, setInvDesc] = useState('');
  const [invRights, setInvRights] = useState('Full Commercial Copyright');

  const [clauseParams, setClauseParams] = useState<ClauseParametersMap | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadContracts();
    }
  }, [isOpen]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const data = await executiveContractRepository.listContracts();
      setContracts(data);
      if (data.length > 0) {
        const active = data.find(c => c.id === selectedId) || data[0];
        setSelectedId(active.id);
        initParamsFromContract(active);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedContract = contracts.find(c => c.id === selectedId);

  const initParamsFromContract = (contract: ExecutiveContractDTO) => {
    const map = contract.clauses.reduce((acc: ClauseParametersMap, c: ClauseAuditItemDTO) => {
      acc[c.pillarKey] = { ...c.parameters } as never;
      return acc;
    }, {} as ClauseParametersMap);
    setClauseParams(map);
  };

  const handleSelectContract = (id: string) => {
    setSelectedId(id);
    const contract = contracts.find(c => c.id === id);
    if (contract) initParamsFromContract(contract);
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim() || !newRoleTitle.trim()) return;

    const defaultParams: ClauseParametersMap = {
      non_compete_non_solicit: {
        durationMonths: newJurisdiction === 'us_california' ? 0 : 12,
        scope: 'industry_vertical',
        gardenLeavePercent: 50,
        solicitationBreadth: 'senior_execs_only',
        explicitCaDisclaimer: newJurisdiction === 'us_california'
      },
      ip_prior_inventions: {
        priorInventionsScheduleAttached: true,
        priorInventionsCount: 1,
        assignmentScope: 'narrow_company_business',
        moonlightOpenSourcePermitted: true,
        statutoryProtectionCited: true
      },
      severance_without_cause: {
        cashSalaryMonths: 6,
        targetBonusIncluded: true,
        healthBenefitMonths: 6,
        goodReasonResignationCovered: true,
        narrowCauseDefinition: true
      },
      double_trigger_cic: {
        accelerationType: 'double_trigger_partial',
        protectionWindowMonths: 12,
        ptepMonths: 12,
        goldenParachuteCutbackProtected: true
      },
      indemnification_d_and_o: {
        standaloneAgreementSigned: true,
        policyCoverageAdequate: true,
        mandatoryAdvancement: true,
        tailCoverageSixYears: true
      }
    };

    const mutation: ExecutiveContractMutationDTO = {
      companyName: newCompanyName.trim(),
      roleTitle: newRoleTitle.trim(),
      jurisdiction: newJurisdiction,
      clauseParameters: defaultParams,
      priorInventions: []
    };

    const created = await executiveContractRepository.createContract(mutation);
    setContracts([created, ...contracts]);
    setSelectedId(created.id);
    initParamsFromContract(created);
    setShowAddContract(false);
    setNewCompanyName('');
    setNewRoleTitle('');
  };

  const handleDeleteContract = async () => {
    if (!selectedContract) return;
    if (!confirm(`Xóa phân tích hợp đồng của "${selectedContract.companyName}"?`)) return;
    await executiveContractRepository.deleteContract(selectedContract.id);
    const remaining = contracts.filter(c => c.id !== selectedContract.id);
    setContracts(remaining);
    if (remaining.length > 0) {
      setSelectedId(remaining[0].id);
      initParamsFromContract(remaining[0]);
    } else {
      setSelectedId('');
      setClauseParams(null);
    }
  };

  const handleSaveParams = async () => {
    if (!selectedContract || !clauseParams) return;
    setLoading(true);
    try {
      const updated = await executiveContractRepository.updateContract(selectedContract.id, {
        clauseParameters: clauseParams
      });
      if (updated) {
        setContracts(contracts.map(c => (c.id === updated.id ? updated : c)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRedlines = async () => {
    if (!selectedContract) return;
    setLoading(true);
    try {
      const redlines = await executiveContractRepository.generateRedlines(selectedContract.id);
      const updated = { ...selectedContract, redlines };
      setContracts(contracts.map(c => (c.id === selectedContract.id ? updated : c)));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRedlineStatus = async (redlineId: string, status: RedlineStatus) => {
    if (!selectedContract) return;
    const updated = await executiveContractRepository.updateRedline(selectedContract.id, redlineId, status);
    if (updated && selectedContract.redlines) {
      const nextRedlines = selectedContract.redlines.map((r: ContractRedlineDTO) => (r.id === redlineId ? updated : r));
      setContracts(contracts.map(c => (c.id === selectedContract.id ? { ...c, redlines: nextRedlines } : c)));
    }
  };

  const handleAddInvention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContract || !invTitle.trim() || !invIdentifier.trim()) return;

    const updated = await executiveContractRepository.addPriorInvention(selectedContract.id, {
      category: invCategory,
      title: invTitle.trim(),
      identifierOrUrl: invIdentifier.trim(),
      creationDate: invDate || new Date().toISOString().split('T')[0],
      technologyDescription: invDesc.trim(),
      retainedRights: invRights.split(',').map(s => s.trim()).filter(Boolean),
      confidentialExclusionConfirmed: true
    });

    if (updated) {
      setContracts(contracts.map(c => (c.id === updated.id ? updated : c)));
      setShowAddInvention(false);
      setInvTitle('');
      setInvIdentifier('');
      setInvDesc('');
    }
  };

  const handleDeleteInvention = async (itemId: string) => {
    if (!selectedContract) return;
    const updated = await executiveContractRepository.deletePriorInvention(selectedContract.id, itemId);
    if (updated) {
      setContracts(contracts.map(c => (c.id === updated.id ? updated : c)));
    }
  };

  const handleExportAddendum = async () => {
    if (!selectedContract) return;
    const res = await executiveContractRepository.exportAddendum(selectedContract.id);
    if (res) {
      setAddendumMarkdown(res.markdown);
      setShowAddendumModal(true);
    }
  };

  const handleExportExhibitA = async () => {
    if (!selectedContract) return;
    const res = await executiveContractRepository.exportExhibitA(selectedContract.id);
    if (res) {
      setAddendumMarkdown(res.markdown);
      setShowAddendumModal(true);
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(addendumMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const cri = selectedContract?.contractRiskIndex ?? 0;
  const tier = selectedContract?.riskTier ?? 'low_risk';
  const tierClass = tier === 'low_risk' ? 'low' : tier === 'moderate_asymmetry' ? 'moderate' : tier === 'high_vulnerability' ? 'high' : 'critical';

  const formatDiffText = (diffStr: string) => {
    const parts = diffStr.split(/(\[-\s*[\s\S]*?\s*-\]|\{\+\s*[\s\S]*?\s*\+\})/g);
    return parts.map((part, i) => {
      if (part.startsWith('[-') && part.endsWith('-]')) {
        const text = part.slice(2, -2).trim();
        return <span key={i} className="ecg-diff-del">{text}</span>;
      }
      if (part.startsWith('{+') && part.endsWith('+}')) {
        const text = part.slice(2, -2).trim();
        return <span key={i} className="ecg-diff-add">{text}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="ecg-modal-overlay" onClick={onClose}>
      <div className="ecg-modal" onClick={e => e.stopPropagation()}>
        <div className="ecg-header">
          <div className="ecg-header-left">
            <div className="ecg-icon-box">
              <FileSignature size={24} />
            </div>
            <div>
              <div className="ecg-title-row">
                <h2 className="ecg-title">Executive Contract Guard</h2>
                <span className="ecg-title-badge">CRI Executive Audit</span>
              </div>
              <p className="ecg-subtitle">
                Kiểm toán 5 trụ cột giao kèo điều hành, tính chỉ số CRI (Contract Risk Index), tạo redline đàm phán & lưu trữ Exhibit A.
              </p>
            </div>
          </div>
          <button className="ecg-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ecg-tabs-bar">
          <button
            className={`ecg-tab-btn ${activeTab === 'scorecard' ? 'active' : ''}`}
            onClick={() => setActiveTab('scorecard')}
          >
            <ShieldAlert size={15} />
            <span>CRI Scorecard & Tổng quan</span>
            {selectedContract && <span className="ecg-tab-count">{cri}%</span>}
          </button>
          <button
            className={`ecg-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Scale size={15} />
            <span>Kiểm toán 5 Trụ cột & Tham số</span>
          </button>
          <button
            className={`ecg-tab-btn ${activeTab === 'redlines' ? 'active' : ''}`}
            onClick={() => setActiveTab('redlines')}
          >
            <FileText size={15} />
            <span>Redline Đàm phán & Addendum</span>
            {selectedContract?.redlines && (
              <span className="ecg-tab-count">{selectedContract.redlines.length}</span>
            )}
          </button>
          <button
            className={`ecg-tab-btn ${activeTab === 'inventions' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventions')}
          >
            <Code2 size={15} />
            <span>Exhibit A: Sáng chế Đã có</span>
            {selectedContract?.priorInventions && (
              <span className="ecg-tab-count">{selectedContract.priorInventions.length}</span>
            )}
          </button>
        </div>

        <div className="ecg-body">
          <div className="ecg-selector-row">
            <div className="ecg-selector-left">
              <label className="ecg-label">Hợp đồng:</label>
              <select
                className="ecg-select"
                value={selectedId}
                onChange={e => handleSelectContract(e.target.value)}
                disabled={contracts.length === 0}
              >
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} — {c.roleTitle} ({c.jurisdiction.toUpperCase()}) — CRI {c.contractRiskIndex}%
                  </option>
                ))}
              </select>

              <button
                className="ecg-btn-secondary ecg-btn-sm"
                onClick={() => setShowAddContract(!showAddContract)}
              >
                <Plus size={14} />
                <span>Thêm hợp đồng</span>
              </button>

              {selectedContract && (
                <button
                  className="ecg-btn-danger ecg-btn-sm"
                  onClick={handleDeleteContract}
                  title="Xóa hợp đồng này"
                >
                  <Trash2 size={14} />
                  <span>Xóa</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ecg-btn-secondary ecg-btn-sm" onClick={handleExportExhibitA}>
                <Download size={14} />
                <span>Xuất Exhibit A</span>
              </button>
              <button className="ecg-btn-primary ecg-btn-sm" onClick={handleExportAddendum}>
                <Download size={14} />
                <span>Xuất Addendum Redline</span>
              </button>
            </div>
          </div>

          {showAddContract && (
            <form className="ecg-form-card" onSubmit={handleCreateContract}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>Tạo Hợp đồng Lãnh đạo Mới</h3>
              <div className="ecg-form-grid">
                <div className="ecg-form-group">
                  <label className="ecg-label">Tên Công ty</label>
                  <input
                    className="ecg-input"
                    placeholder="VD: Acme Cloud AI, Shopee..."
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="ecg-form-group">
                  <label className="ecg-label">Vị trí / Chức danh Lãnh đạo</label>
                  <input
                    className="ecg-input"
                    placeholder="VD: VP of Engineering, CTO, Director..."
                    value={newRoleTitle}
                    onChange={e => setNewRoleTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="ecg-form-group">
                  <label className="ecg-label">Khu vực Pháp lý (Jurisdiction)</label>
                  <select
                    className="ecg-select"
                    value={newJurisdiction}
                    onChange={e => setNewJurisdiction(e.target.value as LegalJurisdiction)}
                  >
                    <option value="us_delaware_ny">Mỹ: Delaware / New York (Standard)</option>
                    <option value="us_california">Mỹ: California (SB 699, §16600 void)</option>
                    <option value="vietnam">Việt Nam (Bộ luật Lao động 2019)</option>
                    <option value="general">Quốc tế chung (General Common Law)</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button type="submit" className="ecg-btn-primary">Tạo & Kiểm toán Ngay</button>
                <button type="button" className="ecg-btn-secondary" onClick={() => setShowAddContract(false)}>Hủy</button>
              </div>
            </form>
          )}

          {activeTab === 'scorecard' && selectedContract && (
            <div>
              <div className="ecg-cri-card">
                <div className={`ecg-cri-circle ${tierClass}`}>
                  <span className="ecg-cri-num">{cri}%</span>
                  <span className="ecg-cri-unit">CRI</span>
                </div>
                <div className="ecg-cri-meta">
                  <div className="ecg-cri-header">
                    <h3 className="ecg-cri-title">{selectedContract.companyName} — {selectedContract.roleTitle}</h3>
                    <span className={`ecg-tier-tag ${tierClass}`}>
                      {tier === 'low_risk' && 'An toàn / Chuẩn mực'}
                      {tier === 'moderate_asymmetry' && 'Bất đối xứng vừa'}
                      {tier === 'high_vulnerability' && 'Dễ tổn thương cao'}
                      {tier === 'critical_toxic' && 'Nguy hiểm / Bất lợi nghiêm trọng'}
                    </span>
                  </div>
                  <p className="ecg-cri-desc">
                    Hệ thống pháp lý: <strong>{selectedContract.jurisdiction.toUpperCase()}</strong>.
                    Chỉ số Contract Risk Index (CRI) tổng hợp rủi ro qua 5 trụ cột và áp dụng hệ số phạt cộng dồn nếu phát hiện các điều khoản độc hại.
                  </p>
                  {selectedContract.clawbackPenalty > 0 && (
                    <div className="ecg-toxic-pill">
                      <AlertTriangle size={12} />
                      <span>Phạt điều khoản hiểm hóc: +{selectedContract.clawbackPenalty}%</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedContract.activeHazards.length > 0 && (
                <div className="ecg-hazards-banner">
                  <div className="ecg-hazard-title">
                    <AlertTriangle size={15} />
                    <span>Cảnh báo Các Bẫy Pháp lý Độc hại (Active Toxic Hazards):</span>
                  </div>
                  <ul className="ecg-hazard-list">
                    {selectedContract.activeHazards.map((h: string, i: number) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 800 }}>Chi tiết 5 Trụ cột Rủi ro Giao kèo</h4>
              <div className="ecg-pillars-grid">
                {selectedContract.clauses.map((clause: ClauseAuditItemDTO) => {
                  const s = clause.subScore;
                  const sClass = s < 30 ? 'low' : s < 60 ? 'moderate' : s < 80 ? 'high' : 'critical';
                  const barColor = s < 30 ? '#22c55e' : s < 60 ? '#eab308' : s < 80 ? '#f97316' : '#e11d48';

                  return (
                    <div key={clause.pillarKey} className={`ecg-pillar-card ${clause.isToxic ? 'toxic' : ''}`}>
                      <div className="ecg-pillar-head">
                        <span className="ecg-pillar-name">{clause.title}</span>
                        <span className={`ecg-pillar-score-badge ${sClass}`}>{s}%</span>
                      </div>
                      <div className="ecg-pillar-progress">
                        <div className="ecg-pillar-progress-fill" style={{ width: `${s}%`, background: barColor }} />
                      </div>
                      <div className="ecg-pillar-summary">{clause.summary}</div>
                      {clause.identifiedRisks.length > 0 && (
                        <ul className="ecg-pillar-risks-list">
                          {clause.identifiedRisks.map((r: string, ri: number) => (
                            <li key={ri}>{r}</li>
                          ))}
                        </ul>
                      )}
                      {clause.isToxic && (
                        <div className="ecg-toxic-pill">
                          <AlertTriangle size={11} />
                          <span>Điều khoản bất đối xứng nghiêm trọng</span>
                        </div>
                      )}
                      <div className="ecg-statutory-ref">{clause.statutoryReference}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'audit' && selectedContract && clauseParams && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Hiệu chỉnh Tham số Hợp đồng & Pháp lý</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Cập nhật thời hạn cam kết, cơ chế garden leave, điều kiện sa thải và tỷ lệ tăng tốc cổ phần để tính toán lại điểm số CRI.
                  </p>
                </div>
                <button className="ecg-btn-primary" onClick={handleSaveParams} disabled={loading}>
                  <RefreshCw size={14} className={loading ? 'spin' : ''} />
                  <span>Lưu & Tái Kiểm toán</span>
                </button>
              </div>

              <div className="ecg-form-card">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800 }}>1. Không cạnh tranh & Không lôi kéo (Non-Compete)</h4>
                <div className="ecg-form-grid">
                  <div className="ecg-form-group">
                    <label className="ecg-label">Thời hạn cấm (Tháng)</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={0}
                      max={36}
                      value={clauseParams.non_compete_non_solicit.durationMonths}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        non_compete_non_solicit: {
                          ...clauseParams.non_compete_non_solicit,
                          durationMonths: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Phạm vi Cấm cạnh tranh</label>
                    <select
                      className="ecg-select"
                      value={clauseParams.non_compete_non_solicit.scope}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        non_compete_non_solicit: {
                          ...clauseParams.non_compete_non_solicit,
                          scope: e.target.value as never
                        }
                      })}
                    >
                      <option value="narrow_named_competitors">Hẹp: Danh sách đối thủ cụ thể</option>
                      <option value="industry_vertical">Trung bình: Ngành nghề hẹp</option>
                      <option value="worldwide_broad">Rộng: Toàn cầu / Nhiều mảng</option>
                      <option value="unlimited">Vô hạn định</option>
                    </select>
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Lương duy trì (Garden Leave %)</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={0}
                      max={100}
                      value={clauseParams.non_compete_non_solicit.gardenLeavePercent}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        non_compete_non_solicit: {
                          ...clauseParams.non_compete_non_solicit,
                          gardenLeavePercent: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Phạm vi Cấm lôi kéo nhân sự</label>
                    <select
                      className="ecg-select"
                      value={clauseParams.non_compete_non_solicit.solicitationBreadth}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        non_compete_non_solicit: {
                          ...clauseParams.non_compete_non_solicit,
                          solicitationBreadth: e.target.value as never
                        }
                      })}
                    >
                      <option value="none">Không cấm</option>
                      <option value="senior_execs_only">Chỉ lãnh đạo cấp cao trực tiếp</option>
                      <option value="all_employees_contractors">Toàn bộ nhân viên & CTV</option>
                      <option value="all_customers_vendors">Cấm cả khách hàng & đối tác</option>
                    </select>
                  </div>
                </div>
                <label className="ecg-checkbox-row">
                  <input
                    type="checkbox"
                    checked={clauseParams.non_compete_non_solicit.explicitCaDisclaimer}
                    onChange={e => setClauseParams({
                      ...clauseParams,
                      non_compete_non_solicit: {
                        ...clauseParams.non_compete_non_solicit,
                        explicitCaDisclaimer: e.target.checked
                      }
                    })}
                  />
                  <span>Có tuyên bố miễn trừ California (§16600 statutory disclaimer)</span>
                </label>
              </div>

              <div className="ecg-form-card">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800 }}>2. Chuyển nhượng Sở hữu Trí tuệ (IP Assignment)</h4>
                <div className="ecg-form-grid">
                  <div className="ecg-form-group">
                    <label className="ecg-label">Phạm vi Thuộc quyền</label>
                    <select
                      className="ecg-select"
                      value={clauseParams.ip_prior_inventions.assignmentScope}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        ip_prior_inventions: {
                          ...clauseParams.ip_prior_inventions,
                          assignmentScope: e.target.value as never
                        }
                      })}
                    >
                      <option value="narrow_company_business">Hẹp: Chỉ công nghệ phục vụ doanh nghiệp</option>
                      <option value="broad_all_tech">Rộng: Mọi phần mềm tạo trong thời gian làm việc</option>
                      <option value="omnibus_perpetual">Bao trùm vĩnh viễn (Omnibus Perpetual)</option>
                    </select>
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Phụ lục A (Exhibit A Schedule)</label>
                    <select
                      className="ecg-select"
                      value={clauseParams.ip_prior_inventions.priorInventionsScheduleAttached ? 'true' : 'false'}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        ip_prior_inventions: {
                          ...clauseParams.ip_prior_inventions,
                          priorInventionsScheduleAttached: e.target.value === 'true'
                        }
                      })}
                    >
                      <option value="true">Đã đính kèm danh sách sáng chế loại trừ</option>
                      <option value="false">Không đính kèm (Có nguy cơ mất quyền)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.ip_prior_inventions.moonlightOpenSourcePermitted}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        ip_prior_inventions: {
                          ...clauseParams.ip_prior_inventions,
                          moonlightOpenSourcePermitted: e.target.checked
                        }
                      })}
                    />
                    <span>Cho phép đóng góp Open-Source ngoài giờ không xung đột</span>
                  </label>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.ip_prior_inventions.statutoryProtectionCited}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        ip_prior_inventions: {
                          ...clauseParams.ip_prior_inventions,
                          statutoryProtectionCited: e.target.checked
                        }
                      })}
                    />
                    <span>Dẫn chiếu luật bảo vệ sáng chế cá nhân (Cal. Labor §2870)</span>
                  </label>
                </div>
              </div>

              <div className="ecg-form-card">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800 }}>3. Trợ cấp Sa thải (Severance Without Cause)</h4>
                <div className="ecg-form-grid">
                  <div className="ecg-form-group">
                    <label className="ecg-label">Số tháng Lương cơ bản</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={0}
                      max={24}
                      value={clauseParams.severance_without_cause.cashSalaryMonths}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        severance_without_cause: {
                          ...clauseParams.severance_without_cause,
                          cashSalaryMonths: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Số tháng Bảo hiểm (Health Benefit)</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={0}
                      max={24}
                      value={clauseParams.severance_without_cause.healthBenefitMonths}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        severance_without_cause: {
                          ...clauseParams.severance_without_cause,
                          healthBenefitMonths: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' }}>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.severance_without_cause.targetBonusIncluded}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        severance_without_cause: {
                          ...clauseParams.severance_without_cause,
                          targetBonusIncluded: e.target.checked
                        }
                      })}
                    />
                    <span>Bao gồm Thưởng mục tiêu năm (Target Annual Bonus)</span>
                  </label>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.severance_without_cause.goodReasonResignationCovered}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        severance_without_cause: {
                          ...clauseParams.severance_without_cause,
                          goodReasonResignationCovered: e.target.checked
                        }
                      })}
                    />
                    <span>Bảo vệ khi tự thôi việc có lý do chính đáng (Good Reason)</span>
                  </label>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.severance_without_cause.narrowCauseDefinition}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        severance_without_cause: {
                          ...clauseParams.severance_without_cause,
                          narrowCauseDefinition: e.target.checked
                        }
                      })}
                    />
                    <span>Định nghĩa Sa thải vì Lỗi (Cause) chặt chẽ, có 30 ngày sửa chữa</span>
                  </label>
                </div>
              </div>

              <div className="ecg-form-card">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800 }}>4. Thay đổi Quyền Kiểm soát (Change of Control / M&A)</h4>
                <div className="ecg-form-grid">
                  <div className="ecg-form-group">
                    <label className="ecg-label">Cơ chế Tăng tốc Cổ phần</label>
                    <select
                      className="ecg-select"
                      value={clauseParams.double_trigger_cic.accelerationType}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        double_trigger_cic: {
                          ...clauseParams.double_trigger_cic,
                          accelerationType: e.target.value as never
                        }
                      })}
                    >
                      <option value="none">Không có (Nguy cơ bị hủy quyền)</option>
                      <option value="double_trigger_partial">Double-Trigger một phần (50-75%)</option>
                      <option value="double_trigger_full">Double-Trigger 100% (Khuyến nghị chuẩn)</option>
                      <option value="single_trigger">Single-Trigger (Ngay khi sáp nhập)</option>
                    </select>
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Thời hạn Bảo vệ Sau M&A (Tháng)</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={0}
                      max={36}
                      value={clauseParams.double_trigger_cic.protectionWindowMonths}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        double_trigger_cic: {
                          ...clauseParams.double_trigger_cic,
                          protectionWindowMonths: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                  <div className="ecg-form-group">
                    <label className="ecg-label">Thời hạn Thực hiện Option (PTEP Tháng)</label>
                    <input
                      type="number"
                      className="ecg-input"
                      min={1}
                      max={120}
                      value={clauseParams.double_trigger_cic.ptepMonths}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        double_trigger_cic: {
                          ...clauseParams.double_trigger_cic,
                          ptepMonths: Number(e.target.value)
                        }
                      })}
                    />
                  </div>
                </div>
              </div>

              <div className="ecg-form-card">
                <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800 }}>5. Bồi thường & Bảo hiểm Trách nhiệm (D&O Insurance)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.indemnification_d_and_o.standaloneAgreementSigned}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        indemnification_d_and_o: {
                          ...clauseParams.indemnification_d_and_o,
                          standaloneAgreementSigned: e.target.checked
                        }
                      })}
                    />
                    <span>Ký Hợp đồng Bồi thường Riêng (Standalone Indemnity Agreement)</span>
                  </label>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.indemnification_d_and_o.mandatoryAdvancement}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        indemnification_d_and_o: {
                          ...clauseParams.indemnification_d_and_o,
                          mandatoryAdvancement: e.target.checked
                        }
                      })}
                    />
                    <span>Ứng trước chi phí pháp lý bắt buộc (Mandatory Advancement)</span>
                  </label>
                  <label className="ecg-checkbox-row">
                    <input
                      type="checkbox"
                      checked={clauseParams.indemnification_d_and_o.tailCoverageSixYears}
                      onChange={e => setClauseParams({
                        ...clauseParams,
                        indemnification_d_and_o: {
                          ...clauseParams.indemnification_d_and_o,
                          tailCoverageSixYears: e.target.checked
                        }
                      })}
                    />
                    <span>Bảo lãnh D&O Tail Coverage 6 năm sau khi rời công ty</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'redlines' && selectedContract && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Redlines & Điều khoản Đối trọng (Counter-Amendments)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Các đề xuất sửa đổi pháp lý bảo vệ quyền lợi cá nhân với lập luận chuyên nghiệp và giải pháp thỏa hiệp fallback.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ecg-btn-secondary" onClick={handleGenerateRedlines} disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                    <span>Tái sinh Redlines</span>
                  </button>
                  <button className="ecg-btn-primary" onClick={handleExportAddendum}>
                    <Download size={14} />
                    <span>Xem & Xuất Addendum</span>
                  </button>
                </div>
              </div>

              {(!selectedContract.redlines || selectedContract.redlines.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <FileText size={32} style={{ color: '#94a3b8', marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>Chưa có điều khoản redline nào được tạo.</p>
                  <button className="ecg-btn-primary" style={{ marginTop: 12 }} onClick={handleGenerateRedlines}>
                    Tự động tạo Redlines đề xuất
                  </button>
                </div>
              ) : (
                <div className="ecg-redlines-list">
                  {selectedContract.redlines.map((redline: ContractRedlineDTO) => (
                    <div key={redline.id} className="ecg-redline-card">
                      <div className="ecg-redline-header">
                        <span className="ecg-redline-title">{redline.clauseTitle}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`ecg-redline-status ${redline.status}`}>
                            {redline.status === 'proposed' && 'Đề xuất'}
                            {redline.status === 'accepted' && 'Chấp thuận'}
                            {redline.status === 'rejected' && 'Bác bỏ'}
                            {redline.status === 'compromised' && 'Thỏa hiệp'}
                          </span>
                        </div>
                      </div>

                      <div className="ecg-diff-box">
                        {formatDiffText(redline.redlineText)}
                      </div>

                      <div className="ecg-redline-meta-row">
                        <div>
                          <strong>Lập luận đàm phán (Justification):</strong>
                          <div style={{ color: '#334155', marginTop: 4 }}>{redline.candidateJustification}</div>
                        </div>
                        {redline.fallbackCompromise && (
                          <div>
                            <strong>Phương án nhượng bộ (Fallback Compromise):</strong>
                            <div style={{ color: '#854d0e', marginTop: 4 }}>{redline.fallbackCompromise}</div>
                          </div>
                        )}
                      </div>

                      <div className="ecg-redline-actions">
                        <span style={{ fontSize: 11, color: '#64748b', marginRight: 4 }}>Cập nhật trạng thái:</span>
                        <button
                          className="ecg-btn-secondary ecg-btn-sm"
                          onClick={() => handleUpdateRedlineStatus(redline.id, 'accepted')}
                        >
                          <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                          <span>Đã chấp thuận</span>
                        </button>
                        <button
                          className="ecg-btn-secondary ecg-btn-sm"
                          onClick={() => handleUpdateRedlineStatus(redline.id, 'compromised')}
                        >
                          <span>Thỏa hiệp</span>
                        </button>
                        <button
                          className="ecg-btn-secondary ecg-btn-sm"
                          onClick={() => handleUpdateRedlineStatus(redline.id, 'rejected')}
                        >
                          <XCircle size={13} style={{ color: '#dc2626' }} />
                          <span>Bị từ chối</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'inventions' && selectedContract && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Phụ lục A: Danh mục Sáng chế & IP Đã có (Exhibit A)</h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>
                    Liệt kê các kho mã nguồn mở, bằng sáng chế hoặc sản phẩm SaaS đã phát triển trước khi gia nhập để loại trừ khỏi cam kết chuyển giao IP.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ecg-btn-secondary" onClick={handleExportExhibitA}>
                    <Download size={14} />
                    <span>Xuất Bản ký Exhibit A</span>
                  </button>
                  <button className="ecg-btn-primary" onClick={() => setShowAddInvention(!showAddInvention)}>
                    <Plus size={14} />
                    <span>Thêm Sáng chế / Dự án</span>
                  </button>
                </div>
              </div>

              {showAddInvention && (
                <form className="ecg-form-card" onSubmit={handleAddInvention}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800 }}>Khai báo Sáng chế / Phần mềm Đã có</h4>
                  <div className="ecg-form-grid">
                    <div className="ecg-form-group">
                      <label className="ecg-label">Phân loại</label>
                      <select
                        className="ecg-select"
                        value={invCategory}
                        onChange={e => setInvCategory(e.target.value as InventionCategory)}
                      >
                        <option value="open_source_repo">Mã nguồn mở (GitHub / GitLab)</option>
                        <option value="patented_invention">Bằng sáng chế / Đơn cấp bằng</option>
                        <option value="saas_product">Sản phẩm SaaS / Ứng dụng cá nhân</option>
                        <option value="technical_publication">Công bố khoa học / Sách kỹ thuật</option>
                        <option value="domain_brand">Tên miền / Nhãn hiệu cá nhân</option>
                      </select>
                    </div>
                    <div className="ecg-form-group">
                      <label className="ecg-label">Tên Dự án / Sáng chế</label>
                      <input
                        className="ecg-input"
                        placeholder="VD: HyperQueue Broker, CloudCost SaaS..."
                        value={invTitle}
                        onChange={e => setInvTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="ecg-form-group">
                      <label className="ecg-label">Đường dẫn / Số hiệu Đơn</label>
                      <input
                        className="ecg-input"
                        placeholder="https://github.com/... hoặc Patent ID"
                        value={invIdentifier}
                        onChange={e => setInvIdentifier(e.target.value)}
                        required
                      />
                    </div>
                    <div className="ecg-form-group">
                      <label className="ecg-label">Ngày tạo / Commit đầu</label>
                      <input
                        type="date"
                        className="ecg-input"
                        value={invDate}
                        onChange={e => setInvDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="ecg-form-group" style={{ marginTop: 10 }}>
                    <label className="ecg-label">Mô tả Kiến trúc & Công nghệ</label>
                    <textarea
                      className="ecg-input"
                      rows={2}
                      placeholder="Mô tả kỹ thuật để chứng minh quyền sở hữu và sự độc lập..."
                      value={invDesc}
                      onChange={e => setInvDesc(e.target.value)}
                    />
                  </div>
                  <div className="ecg-form-group" style={{ marginTop: 10 }}>
                    <label className="ecg-label">Quyền bảo lưu (Phân tách bởi dấu phẩy)</label>
                    <input
                      className="ecg-input"
                      placeholder="Full Commercial Copyright, Patent Rights..."
                      value={invRights}
                      onChange={e => setInvRights(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                    <button type="submit" className="ecg-btn-primary">Lưu vào Exhibit A</button>
                    <button type="button" className="ecg-btn-secondary" onClick={() => setShowAddInvention(false)}>Hủy</button>
                  </div>
                </form>
              )}

              {selectedContract.priorInventions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1' }}>
                  <Code2 size={32} style={{ color: '#94a3b8', marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
                    Chưa có sáng chế nào được khai báo. Việc thiếu Exhibit A có thể khiến công ty mới tuyên bố quyền sở hữu đối với các dự án cá nhân!
                  </p>
                  <button className="ecg-btn-primary" style={{ marginTop: 12 }} onClick={() => setShowAddInvention(true)}>
                    Thêm Dự án vào Exhibit A
                  </button>
                </div>
              ) : (
                <div className="ecg-table-wrap">
                  <table className="ecg-table">
                    <thead>
                      <tr>
                        <th>Tên & Loại hình</th>
                        <th>Đường dẫn / Định danh</th>
                        <th>Ngày tạo</th>
                        <th>Kiến trúc & Công nghệ</th>
                        <th>Quyền bảo lưu</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedContract.priorInventions.map((item: PriorInventionItemDTO) => (
                        <tr key={item.id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{item.title}</div>
                            <span className="ecg-cat-tag">{item.category}</span>
                          </td>
                          <td>
                            <a href={item.identifierOrUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                              {item.identifierOrUrl}
                            </a>
                          </td>
                          <td>{item.creationDate}</td>
                          <td style={{ maxWidth: 260 }}>{item.technologyDescription}</td>
                          <td>
                            <div className="ecg-rights-tags">
                              {item.retainedRights.map((r: string, ri: number) => (
                                <span key={ri} className="ecg-rights-pill">{r}</span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <button
                              className="ecg-btn-danger ecg-btn-sm"
                              onClick={() => handleDeleteInvention(item.id)}
                              title="Xóa sáng chế"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {showAddendumModal && (
          <div className="ecg-modal-overlay" onClick={() => setShowAddendumModal(false)}>
            <div className="ecg-modal" style={{ maxWidth: 840, maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
              <div className="ecg-header">
                <div className="ecg-header-left">
                  <FileText size={20} style={{ color: '#e11d48' }} />
                  <h3 className="ecg-title" style={{ fontSize: 16 }}>Văn bản Pháp lý Đính kèm (Legal Markdown)</h3>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ecg-btn-secondary ecg-btn-sm" onClick={handleCopyMarkdown}>
                    <Copy size={13} />
                    <span>{copied ? 'Đã sao chép!' : 'Copy Markdown'}</span>
                  </button>
                  <button className="ecg-close-btn" onClick={() => setShowAddendumModal(false)}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="ecg-body">
                <pre className="ecg-markdown-box">{addendumMarkdown}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
