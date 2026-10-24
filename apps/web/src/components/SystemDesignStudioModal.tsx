import React, { useState, useEffect } from 'react';
import {
  Cpu,
  X,
  Layers,
  Calculator,
  Workflow,
  ShieldAlert,
  Award,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Server,
  Database,
  Zap,
  Activity,
  ArrowRight
} from 'lucide-react';
import {
  type SystemDesignScenarioId,
  type SystemDesignSessionDTO,
  type SystemCapacityInputDTO,
  type SystemCapacityEstimateDTO,
  type SystemDesignBlueprintDTO,
  type SystemDesignEvaluationDTO,
  SYSTEM_DESIGN_SCENARIOS,
  calculateCapacityEstimates,
  evaluateSystemArchitecture,
  exportBlueprintToMarkdown
} from '../domain';
import { systemDesignRepository } from '../data';

interface SystemDesignStudioModalProps {
  onClose: () => void;
  notify?: (message: string, isError?: boolean) => void;
}

type TabKey = 'scope' | 'capacity' | 'hld' | 'deepDive' | 'evaluation';

export function SystemDesignStudioModal({ onClose, notify }: SystemDesignStudioModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('scope');
  const [selectedScenarioId, setSelectedScenarioId] = useState<SystemDesignScenarioId>('url_shortener');
  const [sessions, setSessions] = useState<SystemDesignSessionDTO[]>([]);
  const [activeSession, setActiveSession] = useState<SystemDesignSessionDTO | null>(null);
  const [capacityInput, setCapacityInput] = useState<SystemCapacityInputDTO>(SYSTEM_DESIGN_SCENARIOS[0].defaultCapacityInput);
  const [capacityEstimates, setCapacityEstimates] = useState<SystemCapacityEstimateDTO>(
    calculateCapacityEstimates(SYSTEM_DESIGN_SCENARIOS[0].defaultCapacityInput)
  );
  const [blueprint, setBlueprint] = useState<SystemDesignBlueprintDTO>(SYSTEM_DESIGN_SCENARIOS[0].exemplarBlueprint);
  const [evaluation, setEvaluation] = useState<SystemDesignEvaluationDTO | null>(null);
  const [targetRole, setTargetRole] = useState<string>('Staff Software Engineer');
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const list = await systemDesignRepository.listSessions();
      setSessions(list);
      if (list.length > 0) {
        selectSession(list[0]);
      } else {
        resetToScenario('url_shortener');
      }
    } catch {
      resetToScenario('url_shortener');
    }
  };

  const selectSession = (sess: SystemDesignSessionDTO) => {
    setActiveSession(sess);
    setSelectedScenarioId(sess.scenarioId);
    setCapacityInput(sess.capacityInput);
    setCapacityEstimates(sess.capacityEstimates);
    setBlueprint(sess.blueprint);
    setTargetRole(sess.targetRole || 'Staff Software Engineer');
    setEvaluation(sess.latestEvaluation || null);
  };

  const resetToScenario = (scId: SystemDesignScenarioId) => {
    const sc = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === scId) || SYSTEM_DESIGN_SCENARIOS[0];
    setSelectedScenarioId(scId);
    setCapacityInput(sc.defaultCapacityInput);
    const est = calculateCapacityEstimates(sc.defaultCapacityInput);
    setCapacityEstimates(est);
    setBlueprint(sc.exemplarBlueprint);
    setTargetRole('Staff Software Engineer');
    const autoEval = evaluateSystemArchitecture(sc.exemplarBlueprint, scId, 'Staff Software Engineer');
    setEvaluation(autoEval);
    notify?.(`Đã tải bản thiết kế mẫu: ${sc.title}`);
  };

  const handleScenarioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value as SystemDesignScenarioId;
    const existing = sessions.find(s => s.scenarioId === newId);
    if (existing) {
      selectSession(existing);
    } else {
      resetToScenario(newId);
    }
  };

  const handleCapacityChange = (field: keyof SystemCapacityInputDTO, value: number) => {
    const nextInput = { ...capacityInput, [field]: value };
    setCapacityInput(nextInput);
    const nextEstimates = calculateCapacityEstimates(nextInput);
    setCapacityEstimates(nextEstimates);
  };

  const runAiEvaluation = async () => {
    setEvaluating(true);
    try {
      if (activeSession) {
        const res = await systemDesignRepository.evaluateSession(activeSession.id, targetRole);
        if (res) {
          setEvaluation(res);
          setActiveTab('evaluation');
          notify?.(`Đánh giá AI hoàn tất! Điểm kiến trúc: ${res.overallScore}/100 (${res.seniorityVerdict})`);
          return;
        }
      }
      const localEval = evaluateSystemArchitecture(blueprint, selectedScenarioId, targetRole);
      setEvaluation(localEval);
      setActiveTab('evaluation');
      notify?.(`Đánh giá AI hoàn tất! Điểm kiến trúc: ${localEval.overallScore}/100 (${localEval.seniorityVerdict})`);
    } catch {
      notify?.('Không thể thực hiện đánh giá AI.', true);
    } finally {
      setEvaluating(false);
    }
  };

  const handleSaveSession = async () => {
    try {
      const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === selectedScenarioId);
      const title = `${scenario?.title || 'System Design'} - ${targetRole}`;
      if (activeSession) {
        const updated = await systemDesignRepository.updateSession(activeSession.id, {
          title,
          scenarioId: selectedScenarioId,
          targetRole,
          capacityInput,
          blueprint,
          status: evaluation ? 'evaluated' : 'in_progress'
        });
        if (updated) {
          setActiveSession(updated);
          notify?.('Đã lưu phiên thiết kế thành công!');
        }
      } else {
        const created = await systemDesignRepository.createSession({
          title,
          scenarioId: selectedScenarioId,
          targetRole,
          capacityInput,
          blueprint,
          status: evaluation ? 'evaluated' : 'draft'
        });
        setActiveSession(created);
        setSessions([created, ...sessions]);
        notify?.('Đã tạo và lưu phiên thiết kế mới!');
      }
    } catch {
      notify?.('Lỗi khi lưu phiên thiết kế.', true);
    }
  };

  const handleCopyMarkdown = async () => {
    try {
      let md = '';
      if (activeSession) {
        md = (await systemDesignRepository.exportMarkdown(activeSession.id)) || '';
      }
      if (!md) {
        const dummySession: SystemDesignSessionDTO = {
          id: 'temp',
          userId: 'demo',
          title: `System Design: ${selectedScenarioId}`,
          scenarioId: selectedScenarioId,
          targetRole,
          difficulty: 'senior',
          capacityInput,
          capacityEstimates,
          blueprint,
          status: 'evaluated',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        md = exportBlueprintToMarkdown(dummySession, evaluation);
      }
      await navigator.clipboard.writeText(md);
      setCopied(true);
      notify?.('Đã sao chép báo cáo Markdown kèm sơ đồ Mermaid vào clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      notify?.('Không thể sao chép Markdown.', true);
    }
  };

  const currentScenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === selectedScenarioId) || SYSTEM_DESIGN_SCENARIOS[0];

  return (
    <div className="sds-modal-overlay system-design-studio-modal-overlay">
      <div className="sds-modal system-design-studio-modal">
        <div className="sds-header">
          <div className="sds-header-left">
            <div className="sds-icon-box">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="sds-title-row">
                <h2 className="sds-title">
                  AI Technical System Design Studio & Whiteboard Simulator
                </h2>
                <span className="sds-title-badge">
                  FAANG 4-Stage Architecture
                </span>
                {evaluation && (
                  <span className="sds-verdict-badge">
                    {evaluation.overallScore}/100 • {evaluation.seniorityVerdict}
                  </span>
                )}
              </div>
              <p className="sds-subtitle">
                Mô phỏng phỏng vấn thiết kế hệ thống phân tán cấp Senior / Staff / Principal với bảng tính năng lực, sơ đồ Mermaid và AI Rubric.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="sds-close-btn system-design-modal-close-btn"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="sds-scenario-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>
              Kịch bản:
            </span>
            <select
              className="sds-scenario-select sds-scenario-picker"
              value={selectedScenarioId}
              onChange={handleScenarioChange}
            >
              {SYSTEM_DESIGN_SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.difficulty.toUpperCase()})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Mục tiêu role:
            </span>
            <input
              type="text"
              className="sds-input"
              style={{ width: '190px', minHeight: '32px', fontSize: '12px' }}
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              placeholder="VD: Staff Software Engineer"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => resetToScenario(selectedScenarioId)}
              className="sds-btn-secondary sds-reset-exemplar-btn"
              title="Khôi phục về bài mẫu chuẩn Staff+"
            >
              <RotateCcw className="w-4 h-4" />
              Nạp Bản Mẫu Chuẩn Staff+
            </button>
          </div>
        </div>

        <div className="sds-nav-tabs">
          <button
            onClick={() => setActiveTab('scope')}
            className={`sds-tab-btn ${activeTab === 'scope' ? 'active' : ''} sds-tab-scope`}
          >
            <Layers className="w-4 h-4" />
            1. Phạm vi & SLA
            <span className="sds-tab-badge">Stage 1</span>
          </button>
          <button
            onClick={() => setActiveTab('capacity')}
            className={`sds-tab-btn ${activeTab === 'capacity' ? 'active' : ''} sds-tab-capacity`}
          >
            <Calculator className="w-4 h-4" />
            2. Bảng Tính Năng Lực
            <span className="sds-tab-badge">Math</span>
          </button>
          <button
            onClick={() => setActiveTab('hld')}
            className={`sds-tab-btn ${activeTab === 'hld' ? 'active' : ''} sds-tab-hld`}
          >
            <Workflow className="w-4 h-4" />
            3. Kiến Trúc Cấp Cao (HLD)
            <span className="sds-tab-badge">Stage 2</span>
          </button>
          <button
            onClick={() => setActiveTab('deepDive')}
            className={`sds-tab-btn ${activeTab === 'deepDive' ? 'active' : ''} sds-tab-deep-dive`}
          >
            <ShieldAlert className="w-4 h-4" />
            4. Deep Dive & Chống Lỗi
            <span className="sds-tab-badge">Stage 3-4</span>
          </button>
          <button
            onClick={() => setActiveTab('evaluation')}
            className={`sds-tab-btn ${activeTab === 'evaluation' ? 'active' : ''} sds-tab-eval`}
          >
            <Award className="w-4 h-4" />
            5. Đánh Giá Khảo Sát AI
            {evaluation && (
              <span className="sds-tab-badge" style={{ background: '#dcfce7', color: '#166534' }}>
                {evaluation.overallScore}đ
              </span>
            )}
          </button>
        </div>

        <div className="sds-body">
          {activeTab === 'scope' && (
            <>
              <div className="sds-card" style={{ background: '#f8fafc', borderColor: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px' }}>
                      {currentScenario.title}
                    </h3>
                    <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 8px' }}>
                      {currentScenario.tagline}
                    </p>
                    <div style={{ fontSize: '12px', color: '#334155', background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <strong>Bài toán thực tế:</strong> {currentScenario.problemStatement}
                    </div>
                  </div>
                </div>
              </div>

              <div className="sds-grid-2">
                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Zap className="w-4 h-4" style={{ color: '#2563eb' }} />
                    Yêu cầu Chức năng (Functional Requirements)
                  </h4>
                  <ul className="sds-list-bullet">
                    {blueprint.scope.functionalRequirements.map((req, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{req}</li>
                    ))}
                  </ul>
                </div>

                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Activity className="w-4 h-4" style={{ color: '#059669' }} />
                    Yêu cầu Phi chức năng (Non-Functional Requirements)
                  </h4>
                  <ul className="sds-list-bullet">
                    {blueprint.scope.nonFunctionalRequirements.map((req, idx) => (
                      <li key={idx} style={{ marginBottom: '6px' }}>{req}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="sds-grid-3">
                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Mục tiêu Độ sẵn sàng (SLA Uptime)</span>
                  <span className="sds-metric-val" style={{ color: '#059669' }}>
                    {blueprint.scope.slaTargetUptime}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Cho phép downtime tối đa 52 phút/năm</span>
                </div>

                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Độ trễ Mục tiêu (P99 Latency)</span>
                  <span className="sds-metric-val">
                    &lt; {blueprint.scope.latencyTargetP99Ms} ms
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Đo lường tại Edge CDN / Load Balancer</span>
                </div>

                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Quy mô kỳ vọng</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginTop: '4px' }}>
                    {currentScenario.scaleExpectations}
                  </span>
                </div>
              </div>
            </>
          )}

          {activeTab === 'capacity' && (
            <>
              <div className="sds-card">
                <h4 className="sds-card-title">
                  <Calculator className="w-4 h-4" style={{ color: '#2563eb' }} />
                  Tham số Đầu vào Hệ thống (Capacity Planning Input)
                </h4>
                <div className="sds-grid-4" style={{ marginTop: '10px' }}>
                  <div className="sds-input-row">
                    <label className="sds-label">Daily Active Users (DAU)</label>
                    <input
                      type="number"
                      className="sds-input sds-input-dau"
                      value={capacityInput.dailyActiveUsers}
                      onChange={e => handleCapacityChange('dailyActiveUsers', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Lượt Đọc / User / Ngày</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.readsPerUserPerDay}
                      onChange={e => handleCapacityChange('readsPerUserPerDay', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Lượt Ghi / User / Ngày</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.writesPerUserPerDay}
                      onChange={e => handleCapacityChange('writesPerUserPerDay', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Hệ số Tải Đỉnh (Peak Multiplier)</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.peakLoadMultiplier}
                      onChange={e => handleCapacityChange('peakLoadMultiplier', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Read Payload Size (Bytes)</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.avgReadPayloadBytes}
                      onChange={e => handleCapacityChange('avgReadPayloadBytes', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Write Payload Size (Bytes)</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.avgWritePayloadBytes}
                      onChange={e => handleCapacityChange('avgWritePayloadBytes', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Lưu trữ (Số năm giữ liệu)</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.dataRetentionYears}
                      onChange={e => handleCapacityChange('dataRetentionYears', Number(e.target.value))}
                    />
                  </div>
                  <div className="sds-input-row">
                    <label className="sds-label">Tỷ lệ Hot Working Cache (%)</label>
                    <input
                      type="number"
                      className="sds-input"
                      value={capacityInput.cacheWorkingSetPercentage}
                      onChange={e => handleCapacityChange('cacheWorkingSetPercentage', Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="sds-grid-4">
                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Lưu lượng Đọc TB / Đỉnh</span>
                  <span className="sds-metric-val">
                    {capacityEstimates.averageReadQps.toLocaleString()} <span style={{ fontSize: '13px', color: '#64748b' }}>QPS</span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#d97706', fontWeight: '700' }}>
                    Đỉnh: {capacityEstimates.peakReadQps.toLocaleString()} QPS
                  </span>
                </div>

                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Lưu lượng Ghi TB / Đỉnh</span>
                  <span className="sds-metric-val" style={{ color: '#059669' }}>
                    {capacityEstimates.averageWriteQps.toLocaleString()} <span style={{ fontSize: '13px', color: '#64748b' }}>QPS</span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>
                    Đỉnh: {capacityEstimates.peakWriteQps.toLocaleString()} QPS
                  </span>
                </div>

                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Băng thông Ra / Vào (Egress / Ingress)</span>
                  <span className="sds-metric-val" style={{ color: '#0284c7' }}>
                    {capacityEstimates.egressBandwidthMbps} <span style={{ fontSize: '13px', color: '#64748b' }}>Mbps</span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Ingress: {capacityEstimates.ingressBandwidthMbps} Mbps
                  </span>
                </div>

                <div className="sds-metric-card">
                  <span className="sds-metric-lbl">Tổng Dung Lượng {capacityInput.dataRetentionYears} Năm</span>
                  <span className="sds-metric-val" style={{ color: '#7c3aed' }}>
                    {capacityEstimates.retentionTotalStorageTb} <span style={{ fontSize: '13px', color: '#64748b' }}>TB</span>
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Mỗi năm: {capacityEstimates.annualStorageGb.toLocaleString()} GB
                  </span>
                </div>
              </div>

              <div className="sds-card" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <h4 className="sds-card-title" style={{ color: '#166534' }}>
                  <Server className="w-4 h-4" />
                  Khuyến Nghị Phần Cứng & Định Cỡ Cụm (Hardware Sizing)
                </h4>
                <div className="sds-grid-3" style={{ marginTop: '6px' }}>
                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>App Servers (2,000 QPS/node)</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d' }}>
                      {capacityEstimates.recommendedAppServers} Instances
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>Phân bổ sau NLB/ALB có Auto-scaling</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Cache Memory (Working Set RAM)</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d' }}>
                      {capacityEstimates.cacheMemoryRequiredGb} GB ({capacityEstimates.recommendedCacheNodes} cụm 32GB)
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>Đáp ứng quy tắc Pareto 80/20</div>
                  </div>

                  <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '12px', color: '#166534', fontWeight: '600' }}>Database Shards (4TB / shard)</div>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#15803d' }}>
                      {capacityEstimates.recommendedDbShards} Shards
                    </div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>Phân vùng theo Consistent Hashing</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'hld' && (
            <>
              <div className="sds-grid-2">
                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Workflow className="w-4 h-4" style={{ color: '#2563eb' }} />
                    Sơ Đồ Kiến Trúc Topology (Mermaid Code)
                  </h4>
                  <div className="sds-code-block sds-mermaid-preview">
                    {blueprint.highLevelDesign.mermaidDiagram}
                  </div>
                </div>

                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Server className="w-4 h-4" style={{ color: '#059669' }} />
                    Các Thành Phần Lõi (Core Components)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {blueprint.highLevelDesign.coreComponents.map((comp, idx) => (
                      <div key={idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{comp.name}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '6px', background: '#e0e7ff', color: '#3730a3', fontWeight: '600' }}>
                            {comp.type.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>{comp.purpose}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sds-card">
                <h4 className="sds-card-title">
                  <Zap className="w-4 h-4" style={{ color: '#d97706' }} />
                  Hợp Đồng API (API Endpoints Contract)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {blueprint.highLevelDesign.apiEndpoints.map((api, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: api.method === 'GET' ? '#dbeafe' : api.method === 'POST' ? '#dcfce7' : '#fef3c7',
                          color: api.method === 'GET' ? '#1e40af' : api.method === 'POST' ? '#166534' : '#b45309'
                        }}>
                          {api.method}
                        </span>
                        <code style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{api.path}</code>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>({api.protocol})</span>
                      </div>
                      <span style={{ fontSize: '12.5px', color: '#334155' }}>{api.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'deepDive' && (
            <>
              <div className="sds-grid-2">
                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Database className="w-4 h-4" style={{ color: '#2563eb' }} />
                    Thiết Kế CSDL & Caching (Data Layer)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Cơ sở dữ liệu:</span>
                      <span style={{ fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>
                        {blueprint.deepDive.databaseEngine}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Chiến lược Caching:</span>
                      <span style={{ fontWeight: '700', color: '#2563eb' }}>
                        {blueprint.deepDive.cachingStrategy} (TTL: {blueprint.deepDive.cacheTtlSeconds}s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Chiến lược Phân vùng:</span>
                      <span style={{ fontWeight: '700', color: '#059669' }}>
                        {blueprint.deepDive.partitionStrategy}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#64748b', fontWeight: '600' }}>Mô hình Nhất quán:</span>
                      <span style={{ fontWeight: '700', color: '#7c3aed' }}>
                        {blueprint.deepDive.consistencyModel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="sds-card">
                  <h4 className="sds-card-title">
                    <Activity className="w-4 h-4" style={{ color: '#059669' }} />
                    Kiểm Soát Tranh Chấp & Concurrency
                  </h4>
                  <div style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    {blueprint.deepDive.concurrencyControl}
                  </div>
                </div>
              </div>

              <div className="sds-card">
                <h4 className="sds-card-title">
                  <ShieldAlert className="w-4 h-4" style={{ color: '#dc2626' }} />
                  Chống Điểm Nghẽn Đơn Độc (SPOF) & Phục Hồi Thảm Họa
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {blueprint.resilience.singlePointsOfFailure.map((spof, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12.5px', color: '#991b1b' }}>
                      <strong>SPOF #{idx + 1}:</strong> {spof}
                    </div>
                  ))}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <strong>Rate Limiting:</strong> {blueprint.resilience.rateLimitingStrategy}
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
                      <strong>Circuit Breaker:</strong> {blueprint.resilience.circuitBreakerPolicy}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'evaluation' && (
            <>
              {evaluation ? (
                <>
                  <div className="sds-score-banner">
                    <div>
                      <span style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: '700' }}>
                        Điểm Đánh Giá Kiến Trúc Tổng Thể (FAANG Rubric)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' }}>
                        <span className="sds-score-big">{evaluation.overallScore}</span>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>
                            {evaluation.seniorityVerdict}
                          </div>
                          <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                            Mục tiêu thẩm định: {targetRole}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={runAiEvaluation}
                        disabled={evaluating}
                        className="sds-btn-primary"
                        style={{ background: '#38bdf8', color: '#0f172a' }}
                      >
                        <Sparkles className="w-4 h-4" />
                        {evaluating ? 'Đang thẩm định...' : 'Chấm Lại Điểm AI'}
                      </button>
                    </div>
                  </div>

                  <div className="sds-grid-3">
                    {evaluation.pillars.map((p, idx) => (
                      <div key={idx} className="sds-pillar-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>{p.name}</span>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{p.score}%</span>
                        </div>
                        <div className="sds-bar-bg">
                          <div className="sds-bar-fill" style={{ width: `${p.score}%` }} />
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                          {p.feedback}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="sds-grid-2">
                    <div className="sds-card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <h4 className="sds-card-title" style={{ color: '#166534' }}>
                        <Check className="w-4 h-4" />
                        Điểm Mạnh Kiến Trúc Đáng Khen (Top Strengths)
                      </h4>
                      <ul className="sds-list-bullet">
                        {evaluation.topStrengths.map((str, idx) => (
                          <li key={idx} style={{ color: '#166534', marginBottom: '6px' }}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="sds-card" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
                      <h4 className="sds-card-title" style={{ color: '#9f1239' }}>
                        <ShieldAlert className="w-4 h-4" />
                        Lỗ Hổng Cần Đào Sâu (Critical Gaps)
                      </h4>
                      <ul className="sds-list-bullet">
                        {evaluation.criticalGaps.map((gap, idx) => (
                          <li key={idx} style={{ color: '#9f1239', marginBottom: '6px' }}>{gap}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="sds-card">
                    <h4 className="sds-card-title">
                      <ArrowRight className="w-4 h-4" style={{ color: '#2563eb' }} />
                      Phân Tích Đánh Đổi Chiến Lược (Trade-Off Analysis)
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#334155', lineHeight: '1.6', margin: '4px 0 0' }}>
                      {evaluation.tradeOffAnalysis}
                    </p>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                  <Award className="w-12 h-12" style={{ color: '#94a3b8' }} />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '0 0 6px' }}>
                      Chưa có kết quả đánh giá AI cho bản thiết kế này
                    </h4>
                    <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '480px', margin: '0' }}>
                      Nhấn nút bên dưới để AI kiểm tra 4 giai đoạn thiết kế, đối chiếu tiêu chuẩn Senior/Staff/Principal và chấm điểm 5 trụ cột.
                    </p>
                  </div>
                  <button
                    onClick={runAiEvaluation}
                    disabled={evaluating}
                    className="sds-btn-primary"
                    style={{ padding: '10px 24px', fontSize: '14px' }}
                  >
                    <Sparkles className="w-5 h-5" />
                    {evaluating ? 'Đang phân tích...' : 'Bắt Đầu Chấm Điểm Kiến Trúc AI'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="sds-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handleCopyMarkdown}
              className="sds-btn-secondary sds-copy-btn"
              title="Sao chép toàn bộ bản thiết kế sang định dạng Markdown"
            >
              {copied ? <Check className="w-4 h-4" style={{ color: '#166534' }} /> : <Copy className="w-4 h-4" />}
              {copied ? 'Đã sao chép!' : 'Sao Chép Markdown & Mermaid'}
            </button>
            <button
              onClick={handleSaveSession}
              className="sds-btn-secondary"
            >
              Lưu Thiết Kế
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={runAiEvaluation}
              disabled={evaluating}
              className="sds-btn-primary sds-eval-btn"
            >
              <Sparkles className="w-4 h-4" />
              {evaluating ? 'Đang chấm điểm...' : 'Đánh Giá Kiến Trúc AI'}
            </button>
            <button
              onClick={onClose}
              className="sds-btn-secondary"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
