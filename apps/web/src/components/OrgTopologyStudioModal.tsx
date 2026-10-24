import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  GitFork,
  Layers,
  TrendingUp,
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  ShieldAlert,
  Activity,
  Workflow
} from 'lucide-react';
import {
  type ReorgScenarioDTO,
  type TeamTopologyDTO,
  type TeamTopologyType,
  type OrgNodeDTO,
  type CompensationBandDTO,
  type QuarterlyCapacityForecastDTO,
  calculateFullyBurdenedCost
} from '../domain';
import { orgTopologyStudioRepository } from '../data';

interface OrgTopologyStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabKey = 'topologies' | 'hierarchy' | 'leveling' | 'capacity' | 'memo';

const DEFAULT_RADFORD_BANDS: CompensationBandDTO[] = [
  { level: 'IC1', track: 'individual_contributor', radfordP50Base: 110000, radfordP75Base: 125000, radfordP90Base: 140000, targetBonusPercentage: 10, annualEquityGrantBenchmark: 25000, medianPromotionVelocityMonths: 18 },
  { level: 'IC2', track: 'individual_contributor', radfordP50Base: 135000, radfordP75Base: 150000, radfordP90Base: 168000, targetBonusPercentage: 10, annualEquityGrantBenchmark: 40000, medianPromotionVelocityMonths: 24 },
  { level: 'IC3', track: 'individual_contributor', radfordP50Base: 165000, radfordP75Base: 185000, radfordP90Base: 205000, targetBonusPercentage: 15, annualEquityGrantBenchmark: 65000, medianPromotionVelocityMonths: 30 },
  { level: 'IC4', track: 'individual_contributor', radfordP50Base: 200000, radfordP75Base: 225000, radfordP90Base: 255000, targetBonusPercentage: 15, annualEquityGrantBenchmark: 105000, medianPromotionVelocityMonths: 36 },
  { level: 'IC5', track: 'individual_contributor', radfordP50Base: 240000, radfordP75Base: 270000, radfordP90Base: 310000, targetBonusPercentage: 20, annualEquityGrantBenchmark: 160000, medianPromotionVelocityMonths: 42 },
  { level: 'IC6', track: 'individual_contributor', radfordP50Base: 285000, radfordP75Base: 325000, radfordP90Base: 375000, targetBonusPercentage: 25, annualEquityGrantBenchmark: 230000, medianPromotionVelocityMonths: 48 },
  { level: 'EM1', track: 'management', radfordP50Base: 190000, radfordP75Base: 215000, radfordP90Base: 240000, targetBonusPercentage: 15, annualEquityGrantBenchmark: 90000, medianPromotionVelocityMonths: 24 },
  { level: 'EM2', track: 'management', radfordP50Base: 220000, radfordP75Base: 250000, radfordP90Base: 285000, targetBonusPercentage: 20, annualEquityGrantBenchmark: 135000, medianPromotionVelocityMonths: 30 },
  { level: 'EM3', track: 'management', radfordP50Base: 260000, radfordP75Base: 295000, radfordP90Base: 340000, targetBonusPercentage: 25, annualEquityGrantBenchmark: 195000, medianPromotionVelocityMonths: 36 },
  { level: 'EM4', track: 'management', radfordP50Base: 300000, radfordP75Base: 350000, radfordP90Base: 410000, targetBonusPercentage: 30, annualEquityGrantBenchmark: 280000, medianPromotionVelocityMonths: 48 }
];

const DEFAULT_QUARTERLY_FORECASTS: QuarterlyCapacityForecastDTO[] = [
  { quarter: 'Q1', startingHeadcount: 52, newHiresCount: 3, attritionCount: 1, endingHeadcount: 54, rawHeadcountCapacityUnits: 53.0, effectiveCapacityUnits: 49.5, mentorshipDragLossUnits: 2.5, quarterlyFullyBurdenedCost: 2650000, cloudInfrastructureAllocatedCost: 320000, totalQuarterlyRnDBudget: 2970000 },
  { quarter: 'Q2', startingHeadcount: 54, newHiresCount: 4, attritionCount: 1, endingHeadcount: 57, rawHeadcountCapacityUnits: 55.5, effectiveCapacityUnits: 51.8, mentorshipDragLossUnits: 2.7, quarterlyFullyBurdenedCost: 2795000, cloudInfrastructureAllocatedCost: 335000, totalQuarterlyRnDBudget: 3130000 },
  { quarter: 'Q3', startingHeadcount: 57, newHiresCount: 2, attritionCount: 1, endingHeadcount: 58, rawHeadcountCapacityUnits: 57.5, effectiveCapacityUnits: 54.6, mentorshipDragLossUnits: 1.9, quarterlyFullyBurdenedCost: 2840000, cloudInfrastructureAllocatedCost: 350000, totalQuarterlyRnDBudget: 3190000 },
  { quarter: 'Q4', startingHeadcount: 58, newHiresCount: 2, attritionCount: 0, endingHeadcount: 60, rawHeadcountCapacityUnits: 59.0, effectiveCapacityUnits: 56.8, mentorshipDragLossUnits: 1.2, quarterlyFullyBurdenedCost: 2940000, cloudInfrastructureAllocatedCost: 365000, totalQuarterlyRnDBudget: 3305000 }
];

export const OrgTopologyStudioModal: React.FC<OrgTopologyStudioModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('topologies');
  const [scenarios, setScenarios] = useState<ReorgScenarioDTO[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ReorgScenarioDTO | null>(null);
  const [teams, setTeams] = useState<TeamTopologyDTO[]>([]);
  const [employees, setEmployees] = useState<OrgNodeDTO[]>([]);
  const [memoMarkdown, setMemoMarkdown] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamType, setNewTeamType] = useState<TeamTopologyType>('stream_aligned');
  const [newTeamHeadcount, setNewTeamHeadcount] = useState<number>(6);
  const [newTeamDomainComplexity, setNewTeamDomainComplexity] = useState<number>(3);
  const [newTeamToilPercentage, setNewTeamToilPercentage] = useState<number>(20);
  const [newTeamMission, setNewTeamMission] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    loadInitialData();
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const list = await orgTopologyStudioRepository.listScenarios();
      setScenarios(list);
      if (list.length > 0) {
        const first = list[0];
        setSelectedScenario(first);
        await loadScenarioDetails(first.id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadScenarioDetails = async (scenarioId: string) => {
    try {
      const [teamsData, empsData, memoData] = await Promise.all([
        orgTopologyStudioRepository.listTeams(scenarioId),
        orgTopologyStudioRepository.listEmployees(scenarioId),
        orgTopologyStudioRepository.generateMemo(scenarioId)
      ]);
      setTeams(teamsData);
      setEmployees(empsData);
      setMemoMarkdown(memoData);
    } catch {
    }
  };

  const handleSelectScenario = async (scenario: ReorgScenarioDTO) => {
    setSelectedScenario(scenario);
    await loadScenarioDetails(scenario.id);
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScenario || !newTeamName.trim()) return;

    try {
      const created = await orgTopologyStudioRepository.addTeam(selectedScenario.id, {
        name: newTeamName.trim(),
        type: newTeamType,
        missionStatement: newTeamMission.trim() || 'Deliver strategic software capabilities.',
        headcount: newTeamHeadcount,
        domainComplexity: newTeamDomainComplexity,
        operationalToilPercentage: newTeamToilPercentage,
        weeklyIncidentAlertCount: 2,
        ownedServices: [],
        interactions: []
      });
      if (created) {
        setTeams(prev => [...prev, created]);
        setNewTeamName('');
        setNewTeamMission('');
        setNewTeamHeadcount(6);
        setNewTeamDomainComplexity(3);
        setNewTeamToilPercentage(20);
        const updatedMemo = await orgTopologyStudioRepository.generateMemo(selectedScenario.id);
        setMemoMarkdown(updatedMemo);
      }
    } catch {
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!selectedScenario) return;
    try {
      const ok = await orgTopologyStudioRepository.deleteTeam(teamId);
      if (ok) {
        setTeams(prev => prev.filter(t => t.id !== teamId));
        const updatedMemo = await orgTopologyStudioRepository.generateMemo(selectedScenario.id);
        setMemoMarkdown(updatedMemo);
      }
    } catch {
    }
  };

  const handleCopyMemo = async () => {
    if (!memoMarkdown) return;
    await navigator.clipboard.writeText(memoMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const fmtCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const getCliBadgeClass = (status: string) => {
    if (status === 'healthy_flow') return 'org-studio-badge-green';
    if (status === 'optimal_sustainable') return 'org-studio-badge-blue';
    if (status === 'saturation_warning') return 'org-studio-badge-amber';
    return 'org-studio-badge-red';
  };

  const getSpanBadgeClass = (status: string) => {
    if (status === 'optimal') return 'org-studio-badge-green';
    if (status === 'under_span_micro_team') return 'org-studio-badge-amber';
    return 'org-studio-badge-red';
  };

  const averageCli = teams.length > 0
    ? Math.round((teams.reduce((acc, t) => acc + t.cognitiveLoadIndex, 0) / teams.length) * 10) / 10
    : 0;

  return (
    <div className="org-studio-modal-overlay">
      <div className="org-studio-container">
        <div className="org-studio-header">
          <div className="org-studio-title-area">
            <Workflow size={22} color="#a78bfa" />
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                Executive Engineering Organization Topology Studio
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Team Topologies, Cognitive Load Modeler, Span Health & Conway's Law Forecaster
              </span>
            </div>
            {selectedScenario && (
              <span className="org-studio-badge org-studio-badge-blue" style={{ marginLeft: '12px' }}>
                {selectedScenario.status.toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {scenarios.length > 1 && (
              <select
                className="org-studio-select"
                value={selectedScenario?.id || ''}
                onChange={e => {
                  const sc = scenarios.find(s => s.id === e.target.value);
                  if (sc) handleSelectScenario(sc);
                }}
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              title="Đóng modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="org-studio-tabs-bar">
          <button
            className={`org-studio-tab-btn ${activeTab === 'topologies' ? 'active' : ''}`}
            onClick={() => setActiveTab('topologies')}
          >
            <Layers size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Team Topologies
          </button>
          <button
            className={`org-studio-tab-btn ${activeTab === 'hierarchy' ? 'active' : ''}`}
            onClick={() => setActiveTab('hierarchy')}
          >
            <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Hierarchy & Span
          </button>
          <button
            className={`org-studio-tab-btn ${activeTab === 'leveling' ? 'active' : ''}`}
            onClick={() => setActiveTab('leveling')}
          >
            <Activity size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Career Leveling
          </button>
          <button
            className={`org-studio-tab-btn ${activeTab === 'capacity' ? 'active' : ''}`}
            onClick={() => setActiveTab('capacity')}
          >
            <TrendingUp size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Capacity & Ramp
          </button>
          <button
            className={`org-studio-tab-btn ${activeTab === 'memo' ? 'active' : ''}`}
            onClick={() => setActiveTab('memo')}
          >
            <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Reorg & Memo
          </button>
        </div>

        <div className="org-studio-body">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
              Đang tải dữ liệu cấu trúc tổ chức và chỉ số Topologies...
            </div>
          ) : (
            <>
              {activeTab === 'topologies' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="org-studio-grid-4">
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Tổng số nhóm công nghệ</span>
                      <span className="org-studio-stat-number">{teams.length}</span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Stream-aligned Teams</span>
                      <span className="org-studio-stat-number">{teams.filter(t => t.type === 'stream_aligned').length}</span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Platform Teams</span>
                      <span className="org-studio-stat-number">{teams.filter(t => t.type === 'platform').length}</span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Điểm tải nhận thức trung bình (CLI)</span>
                      <span className="org-studio-stat-number" style={{ color: averageCli > 72 ? '#dc2626' : '#16a34a' }}>
                        {averageCli}
                      </span>
                    </div>
                  </div>

                  <div className="org-studio-grid-2">
                    {teams.map(team => (
                      <div key={team.id} className="org-studio-card">
                        <div className="org-studio-card-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{team.name}</span>
                            <span className={`org-studio-badge ${getCliBadgeClass(team.cognitiveLoadStatus)}`}>
                              CLI: {team.cognitiveLoadIndex} ({team.cognitiveLoadStatus.replace('_', ' ')})
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            title="Xóa nhóm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0' }}>
                          {team.missionStatement}
                        </p>

                        <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                          <span>Loại: <strong>{team.type.replace('_', ' ')}</strong></span>
                          <span>Quy mô: <strong>{team.headcount} kỹ sư</strong></span>
                          <span>Độ phức tạp: <strong>{team.domainComplexity}/5</strong></span>
                          <span>Toil: <strong>{team.operationalToilPercentage}%</strong></span>
                        </div>

                        {team.ownedServices.length > 0 && (
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                              Dịch vụ sở hữu ({team.ownedServices.length}):
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                              {team.ownedServices.map(s => (
                                <span key={s.serviceId} style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                  {s.serviceName} ({s.linesOfCode.toLocaleString()} LOC)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {team.interactions.length > 0 && (
                          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                              Tương tác liên nhóm:
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                              {team.interactions.map((inter, idx) => (
                                <div key={idx} style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>→ <strong>{inter.targetTeamName}</strong>: {inter.purpose}</span>
                                  <span style={{ color: '#7c3aed', fontWeight: 700 }}>{inter.interactionMode.replace(/_/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="org-studio-card" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>Thêm nhóm công nghệ mới (Team Topology)</span>
                    </div>
                    <form onSubmit={handleAddTeam} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="org-studio-grid-3">
                        <div className="org-studio-input-group">
                          <label className="org-studio-input-label">Tên nhóm (Team Name)</label>
                          <input
                            type="text"
                            className="org-studio-input"
                            placeholder="Ví dụ: Core Search & Discovery Stream"
                            value={newTeamName}
                            onChange={e => setNewTeamName(e.target.value)}
                            required
                          />
                        </div>
                        <div className="org-studio-input-group">
                          <label className="org-studio-input-label">Mô hình Team Topology</label>
                          <select
                            className="org-studio-select"
                            value={newTeamType}
                            onChange={e => setNewTeamType(e.target.value as TeamTopologyType)}
                          >
                            <option value="stream_aligned">Stream-aligned (Luồng nghiệp vụ)</option>
                            <option value="platform">Platform (Nền tảng hạ tầng)</option>
                            <option value="complicated_subsystem">Complicated-subsystem (Phân hệ phức tạp)</option>
                            <option value="enabling">Enabling (Hỗ trợ & đào tạo)</option>
                          </select>
                        </div>
                        <div className="org-studio-input-group">
                          <label className="org-studio-input-label">Quy mô nhân sự (Headcount)</label>
                          <input
                            type="number"
                            min="1"
                            max="30"
                            className="org-studio-input"
                            value={newTeamHeadcount}
                            onChange={e => setNewTeamHeadcount(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="org-studio-grid-2">
                        <div className="org-studio-input-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label className="org-studio-input-label">Độ phức tạp nghiệp vụ (Domain Complexity)</label>
                            <span className="org-studio-slider-val">{newTeamDomainComplexity} / 5</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            className="org-studio-slider"
                            value={newTeamDomainComplexity}
                            onChange={e => setNewTeamDomainComplexity(Number(e.target.value))}
                          />
                        </div>
                        <div className="org-studio-input-group">
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <label className="org-studio-input-label">Tỷ lệ tiêu hao vận hành (Operational Toil %)</label>
                            <span className="org-studio-slider-val">{newTeamToilPercentage}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            className="org-studio-slider"
                            value={newTeamToilPercentage}
                            onChange={e => setNewTeamToilPercentage(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="org-studio-input-group">
                        <label className="org-studio-input-label">Sứ mệnh cốt lõi (Mission Statement)</label>
                        <input
                          type="text"
                          className="org-studio-input"
                          placeholder="Mô tả phạm vi trách nhiệm kỹ thuật và giá trị nghiệp vụ..."
                          value={newTeamMission}
                          onChange={e => setNewTeamMission(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="org-studio-btn-primary">
                          <Plus size={14} style={{ display: 'inline', marginRight: '6px' }} />
                          Tạo nhóm Topology
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'hierarchy' && selectedScenario && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="org-studio-grid-4">
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Tổng nhân sự kỹ thuật</span>
                      <span className="org-studio-stat-number">{selectedScenario.currentHierarchyMetrics.totalHeadcount}</span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Tỷ lệ Span trung bình</span>
                      <span className="org-studio-stat-number">
                        1:{selectedScenario.currentHierarchyMetrics.averageSpanOfControl.toFixed(1)}
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Độ sâu quản trị (Thực tế / Chuẩn)</span>
                      <span className="org-studio-stat-number">
                        {selectedScenario.currentHierarchyMetrics.organizationDepth} / {selectedScenario.currentHierarchyMetrics.optimalDepth}
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Chỉ số sức khỏe hệ thống phân cấp</span>
                      <span className="org-studio-stat-number" style={{ color: '#16a34a' }}>
                        {selectedScenario.currentHierarchyMetrics.compositeHierarchyHealthScore}%
                      </span>
                    </div>
                  </div>

                  <div className="org-studio-grid-2">
                    <div className="org-studio-card">
                      <div className="org-studio-card-header">
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          Cảnh báo Span of Control
                        </span>
                        <ShieldAlert size={18} color="#d97706" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <span>Nhóm siêu nhỏ (Micro-teams &lt; 4 báo cáo):</span>
                          <span style={{ fontWeight: 700, color: selectedScenario.currentHierarchyMetrics.microTeamsCount > 0 ? '#d97706' : '#16a34a' }}>
                            {selectedScenario.currentHierarchyMetrics.microTeamsCount} nhóm
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                          <span>Quản lý quá tải (Bottlenecks &gt; 8 báo cáo):</span>
                          <span style={{ fontWeight: 700, color: selectedScenario.currentHierarchyMetrics.overloadedManagersCount > 0 ? '#dc2626' : '#16a34a' }}>
                            {selectedScenario.currentHierarchyMetrics.overloadedManagersCount} quản lý
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                          <span>Mức phạt suy giảm thông tin tầng nấc:</span>
                          <span style={{ fontWeight: 700, color: '#475569' }}>
                            -{selectedScenario.currentHierarchyMetrics.depthExcessPenalty}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="org-studio-card">
                      <div className="org-studio-card-header">
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                          Khuyến nghị chuẩn mực thiết kế tổ chức
                        </span>
                        <GitFork size={18} color="#7c3aed" />
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                        <li>Span of Control tối ưu cho Engineering Manager nằm trong khoảng <strong>1:6 đến 1:8</strong>.</li>
                        <li>Độ sâu tổ chức tối ưu tuân theo công thức phân nhánh 7:1: <strong>H* = ceil(log7(N))</strong>.</li>
                        <li>Tránh các micro-team 1-3 người nhằm triệt tiêu tầng nấc trung gian và giảm thất thoát thông tin.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="org-studio-card">
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        Danh sách nhân sự & Phân tích Span Health ({employees.length})
                      </span>
                    </div>
                    <table className="org-studio-table">
                      <thead>
                        <tr>
                          <th>Họ và tên</th>
                          <th>Chức danh</th>
                          <th>Level</th>
                          <th>Nhánh nghề</th>
                          <th>Trực thuộc nhóm</th>
                          <th>Báo cáo trực tiếp</th>
                          <th>Trạng thái Span</th>
                          <th>Nguy cơ nghỉ việc</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map(emp => (
                          <tr key={emp.id}>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{emp.employeeName}</td>
                            <td>{emp.jobTitle}</td>
                            <td><span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>{emp.level}</span></td>
                            <td>{emp.track === 'management' ? 'Quản lý (EM)' : 'Chuyên môn (IC)'}</td>
                            <td>{emp.teamName || 'Ban điều hành'}</td>
                            <td style={{ fontWeight: 700 }}>{emp.directReportsCount}</td>
                            <td>
                              <span className={`org-studio-badge ${getSpanBadgeClass(emp.spanHealth)}`}>
                                {emp.spanHealth.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: emp.flightRiskIndex > 40 ? '#dc2626' : '#16a34a' }}>
                                {emp.flightRiskIndex}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'leveling' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="org-studio-card">
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        Khung bậc nghề nghiệp kép (Dual-Track Progression: IC1–IC8 vs EM1–EM5)
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#475569', margin: 0 }}>
                      Mô hình phân tầng đối xứng đảm bảo các kỹ sư chuyên môn cấp cao (Staff, Principal, Fellow) có lộ trình thăng tiến và đãi ngộ tương đương cấp quản lý cấp cao (EM, Director, VP) mà không bị ép buộc chuyển sang quản trị nhân sự.
                    </p>
                  </div>

                  <div className="org-studio-card">
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        Bảng chuẩn mực đãi ngộ Radford / Mercer / Pave Benchmark (USD)
                      </span>
                    </div>
                    <table className="org-studio-table">
                      <thead>
                        <tr>
                          <th>Level</th>
                          <th>Nhánh</th>
                          <th>Radford P50 Base</th>
                          <th>Radford P75 Base</th>
                          <th>Radford P90 Base</th>
                          <th>Thưởng mục tiêu (%)</th>
                          <th>Cổ phần thường niên</th>
                          <th>Thời gian thăng tiến chuẩn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEFAULT_RADFORD_BANDS.map(band => (
                          <tr key={band.level}>
                            <td style={{ fontWeight: 800, color: '#7c3aed' }}>{band.level}</td>
                            <td>{band.track === 'management' ? 'Management' : 'Individual Contributor'}</td>
                            <td>{fmtCurrency(band.radfordP50Base)}</td>
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{fmtCurrency(band.radfordP75Base)}</td>
                            <td>{fmtCurrency(band.radfordP90Base)}</td>
                            <td>{band.targetBonusPercentage}%</td>
                            <td>{fmtCurrency(band.annualEquityGrantBenchmark)}</td>
                            <td>{band.medianPromotionVelocityMonths} tháng</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'capacity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="org-studio-grid-3">
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Đường cong Onboarding Sigmoid</span>
                      <span style={{ fontSize: '13px', color: '#334155', fontWeight: 700, marginTop: '4px' }}>
                        Senior: 60d | Mid: 90d | Junior: 180d
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Hệ số suy giảm Brooks' Law</span>
                      <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 700, marginTop: '4px' }}>
                        -20% công suất kỹ sư thâm niên trong kỳ kèm cặp
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Hệ số gánh nặng chi phí (Burdened Factor)</span>
                      <span style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 700, marginTop: '4px' }}>
                        1.30x (Bảo hiểm, Thiết bị, SaaS, Thuế)
                      </span>
                    </div>
                  </div>

                  <div className="org-studio-card">
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        Dự báo công suất thực tế & Ngân sách R&D theo quý (Q1–Q4)
                      </span>
                    </div>
                    <table className="org-studio-table">
                      <thead>
                        <tr>
                          <th>Quý</th>
                          <th>Đầu kỳ</th>
                          <th>Tuyển mới</th>
                          <th>Nghỉ việc</th>
                          <th>Cuối kỳ</th>
                          <th>Công suất thô</th>
                          <th>Công suất thực tế (Eff FTE)</th>
                          <th>Tổn thất Mentorship Drag</th>
                          <th>Chi phí nhân sự gánh nặng</th>
                          <th>Hạ tầng Cloud COGS</th>
                          <th>Tổng ngân sách R&D</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DEFAULT_QUARTERLY_FORECASTS.map(q => (
                          <tr key={q.quarter}>
                            <td style={{ fontWeight: 800, color: '#7c3aed' }}>{q.quarter}</td>
                            <td>{q.startingHeadcount}</td>
                            <td style={{ color: '#16a34a', fontWeight: 700 }}>+{q.newHiresCount}</td>
                            <td style={{ color: '#dc2626' }}>-{q.attritionCount}</td>
                            <td style={{ fontWeight: 700 }}>{q.endingHeadcount}</td>
                            <td>{q.rawHeadcountCapacityUnits}</td>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>{q.effectiveCapacityUnits}</td>
                            <td style={{ color: '#dc2626' }}>-{q.mentorshipDragLossUnits}</td>
                            <td>{fmtCurrency(q.quarterlyFullyBurdenedCost)}</td>
                            <td>{fmtCurrency(q.cloudInfrastructureAllocatedCost)}</td>
                            <td style={{ fontWeight: 800, color: '#0f172a' }}>{fmtCurrency(q.totalQuarterlyRnDBudget)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'memo' && selectedScenario && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div className="org-studio-grid-4">
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Chỉ số phù hợp Conway's Law</span>
                      <span className="org-studio-stat-number" style={{ color: '#16a34a' }}>
                        {selectedScenario.currentConwayScore}% → {selectedScenario.proposedConwayScore}%
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Biến động nhân sự (Headcount Delta)</span>
                      <span className="org-studio-stat-number">
                        +{selectedScenario.headcountDelta} kỹ sư
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Biến động ngân sách thường niên</span>
                      <span className="org-studio-stat-number">
                        +{fmtCurrency(selectedScenario.budgetDeltaAnnualUsd)}
                      </span>
                    </div>
                    <div className="org-studio-card">
                      <span className="org-studio-stat-label">Chỉ số rủi ro gián đoạn (Disruption Index)</span>
                      <span className="org-studio-stat-number" style={{ color: '#d97706' }}>
                        {selectedScenario.disruptionRiskIndex} / 100
                      </span>
                    </div>
                  </div>

                  <div className="org-studio-card">
                    <div className="org-studio-card-header">
                      <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        Bản ghi nhớ đề xuất tái cấu trúc tổ chức (Board Executive Reorg Memorandum)
                      </span>
                      <button
                        onClick={handleCopyMemo}
                        className="org-studio-btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '12px' }}
                      >
                        {copied ? (
                          <>
                            <Check size={14} style={{ display: 'inline', marginRight: '6px', color: '#16a34a' }} />
                            Đã sao chép!
                          </>
                        ) : (
                          <>
                            <Copy size={14} style={{ display: 'inline', marginRight: '6px' }} />
                            Sao chép Markdown
                          </>
                        )}
                      </button>
                    </div>

                    <div className="org-studio-memo-container">
                      <pre className="org-studio-memo-preview">{memoMarkdown}</pre>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="org-studio-actions-bar">
          <button className="org-studio-btn-secondary" onClick={onClose}>
            Đóng Studio
          </button>
        </div>
      </div>
    </div>
  );
};
