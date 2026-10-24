import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  TrendingUp,
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  X,
  Save,
  Check,
  Briefcase
} from 'lucide-react';
import {
  type TrackType,
  type PromotionDimension,
  type GapLevel,
  type TrajectorySimulationDTO,
  PROMOTION_DIMENSION_METADATA,
  simulateCareerTrajectory
} from '../domain.ts';
import { careerTrajectoryRepository } from '../data.ts';

interface CareerTrajectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: string;
  initialTrack?: TrackType;
}

export const CareerTrajectoryModal: React.FC<CareerTrajectoryModalProps> = ({
  isOpen,
  onClose,
  initialRole,
  initialTrack
}) => {
  const [currentRole, setCurrentRole] = useState(initialRole || 'Senior Frontend Engineer');
  const [currentLevel, setCurrentLevel] = useState('Senior');
  const [targetTrack, setTargetTrack] = useState<TrackType>(initialTrack || 'ic');
  const [targetRole, setTargetRole] = useState(initialTrack === 'management' ? 'Tech Lead' : 'Staff');
  const [horizonYears, setHorizonYears] = useState<number>(4);

  const [scores, setScores] = useState<Record<PromotionDimension, number>>({
    technical_breadth: 75,
    system_scale: 70,
    org_influence: 60,
    mentorship_culture: 65,
    business_impact: 70
  });

  const [expandedDimension, setExpandedDimension] = useState<PromotionDimension | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    careerTrajectoryRepository.getTrajectory()
      .then(saved => {
        if (saved) {
          setCurrentRole(saved.currentRole);
          setTargetTrack(saved.targetTrack);
          setTargetRole(saved.targetRole);
          setHorizonYears(saved.horizonYears);
          if (saved.readiness && saved.readiness.competencies) {
            const loadedScores: Record<PromotionDimension, number> = { ...scores };
            for (const c of saved.readiness.competencies) {
              loadedScores[c.dimension] = c.currentScore;
            }
            setScores(loadedScores);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (targetTrack === 'ic' && (targetRole === 'Tech Lead' || targetRole === 'Engineering Manager' || targetRole === 'Director of Engineering')) {
      setTargetRole('Staff');
    } else if (targetTrack === 'management' && (targetRole === 'Staff' || targetRole === 'Principal' || targetRole === 'Distinguished')) {
      setTargetRole('Tech Lead');
    }
  }, [targetTrack]);

  const simulation: TrajectorySimulationDTO = useMemo(() => {
    return simulateCareerTrajectory({
      currentRole,
      currentLevel,
      targetTrack,
      targetRole,
      horizonYears,
      userScores: scores
    });
  }, [currentRole, currentLevel, targetTrack, targetRole, horizonYears, scores]);

  const readiness = simulation.readiness;
  const initiatives = readiness.highImpactInitiatives;
  const roadmapSteps = simulation.roadmapSteps;

  const handleScoreChange = (dim: PromotionDimension, val: number) => {
    setScores(prev => ({
      ...prev,
      [dim]: val
    }));
  };

  const handleSaveTrajectory = async () => {
    setIsSaving(true);
    try {
      await careerTrajectoryRepository.simulate({
        currentRole,
        currentLevel,
        targetTrack,
        targetRole,
        horizonYears,
        userScores: scores
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  const formatVndBillion = (amount: number): string => {
    const billion = amount / 1000000000;
    return `${billion.toFixed(2)} tỷ VND`;
  };

  if (!isOpen) return null;

  return (
    <div className="career-trajectory-modal-overlay" onClick={onClose}>
      <div className="career-trajectory-modal-container" onClick={e => e.stopPropagation()}>
        <div className="career-trajectory-header">
          <div className="career-trajectory-title-area">
            <div className="career-trajectory-icon-wrapper">
              <Compass className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h2 className="career-trajectory-title">Mô phỏng Lộ trình Thăng tiến & Đánh giá Năng lực</h2>
              <p className="career-trajectory-subtitle">AI Career Trajectory Simulator & Promotion Readiness Engine</p>
            </div>
          </div>
          <button className="career-trajectory-close-btn" onClick={onClose} aria-label="Đóng modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="career-trajectory-body">
          <div className="career-trajectory-track-selector">
            <button
              className={`career-track-btn ${targetTrack === 'ic' ? 'active' : ''}`}
              onClick={() => setTargetTrack('ic')}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              <span>Kỹ sư chuyên sâu (IC Track · Staff / Principal)</span>
            </button>
            <button
              className={`career-track-btn ${targetTrack === 'management' ? 'active' : ''}`}
              onClick={() => setTargetTrack('management')}
            >
              <Layers className="w-4 h-4 mr-2" />
              <span>Quản lý kỹ thuật (Management Track · Tech Lead / EM)</span>
            </button>
          </div>

          <div className="career-trajectory-config-grid">
            <div className="career-config-group">
              <label className="career-config-label">Vai trò hiện tại</label>
              <input
                type="text"
                className="career-input-field career-current-role-input"
                value={currentRole}
                onChange={e => setCurrentRole(e.target.value)}
                placeholder="vd: Senior Frontend Engineer"
              />
            </div>

            <div className="career-config-group">
              <label className="career-config-label">Cấp bậc hiện tại</label>
              <select
                className="career-select-field career-current-level-select"
                value={currentLevel}
                onChange={e => setCurrentLevel(e.target.value)}
              >
                <option value="Senior">Senior</option>
              </select>
            </div>

            <div className="career-config-group">
              <label className="career-config-label">Vị trí mục tiêu tiếp theo</label>
              <select
                className="career-select-field career-target-role-select"
                value={targetRole}
                onChange={e => setTargetRole(e.target.value)}
              >
                {targetTrack === 'ic' ? (
                  <>
                    <option value="Staff">Staff Engineer</option>
                    <option value="Principal">Principal Engineer</option>
                    <option value="Distinguished">Distinguished Engineer</option>
                  </>
                ) : (
                  <>
                    <option value="Tech Lead">Tech Lead</option>
                    <option value="Engineering Manager">Engineering Manager</option>
                    <option value="Director of Engineering">Director of Engineering</option>
                  </>
                )}
              </select>
            </div>

            <div className="career-config-group">
              <label className="career-config-label">Tầm nhìn mô phỏng</label>
              <div className="career-horizon-toggle">
                {[3, 4, 5].map(years => (
                  <button
                    key={years}
                    className={`career-horizon-btn ${horizonYears === years ? 'active' : ''}`}
                    onClick={() => setHorizonYears(years)}
                  >
                    {years} năm
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="career-readiness-banner">
            <div className="career-score-circle">
              <div className="career-score-number">{readiness.overallReadinessScore}%</div>
              <div className="career-score-text">Độ sẵn sàng</div>
            </div>

            <div className="career-readiness-info">
              <div className="career-readiness-meta">
                <span className="career-badge career-target-badge">
                  <Briefcase className="w-3.5 h-3.5 mr-1" />
                  Mục tiêu: {targetRole} ({targetTrack === 'ic' ? 'IC Track' : 'Management Track'})
                </span>
                <span className="career-badge career-months-badge">
                  <Award className="w-3.5 h-3.5 mr-1" />
                  Dự kiến hoàn thiện: {readiness.estimatedMonthsToReadiness} tháng
                </span>
              </div>
              <p className="career-readiness-verdict">
                {readiness.overallReadinessScore >= 80 ? (
                  'Năng lực đạt mức vững chắc! Bạn đã sẵn sàng mở đề xuất xét duyệt thăng chức cùng hội đồng kỹ thuật.'
                ) : readiness.overallReadinessScore >= 65 ? (
                  'Đang tiến triển tích cực! Hãy tập trung hoàn thành 1-2 sáng kiến trọng điểm để khỏa lấp khoảng cách năng lực.'
                ) : (
                  'Đang trong giai đoạn tích lũy. Cần mở rộng quy mô dự án và tạo dấu ấn ảnh hưởng liên nhóm trước khi ứng tuyển.'
                )}
              </p>
            </div>
          </div>

          <div className="career-section">
            <div className="career-section-header">
              <h3 className="career-section-title">Đánh giá Khoảng cách Năng lực 5 Chiều (Competency Gaps)</h3>
              <p className="career-section-desc">Kéo thanh trượt để tự đánh giá mức độ thuần thục của bạn đối với tiêu chuẩn cấp độ tiếp theo.</p>
            </div>

            <div className="career-competency-list">
              {readiness.competencies.map(comp => {
                const isExpanded = expandedDimension === comp.dimension;
                const diff = comp.requiredScore - comp.currentScore;
                return (
                  <div key={comp.dimension} className={`career-competency-card gap-${comp.gapLevel}`}>
                    <div className="career-competency-top">
                      <div className="career-competency-title-row">
                        <span className="career-competency-label">{comp.dimensionLabel}</span>
                        <span className={`career-gap-badge ${comp.gapLevel}`}>
                          {comp.gapLevel === 'critical' ? (
                            <>
                              <Flame className="w-3 h-3 mr-1" />
                              Gap lớn (-{diff} đ)
                            </>
                          ) : comp.gapLevel === 'moderate' ? (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Cần củng cố (-{diff} đ)
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Đạt chuẩn
                            </>
                          )}
                        </span>
                      </div>
                      <div className="career-competency-scores">
                        <span>Hiện tại: <strong>{comp.currentScore}</strong></span>
                        <span className="career-score-sep">/</span>
                        <span>Yêu cầu: <strong>{comp.requiredScore}</strong></span>
                      </div>
                    </div>

                    <div className="career-slider-container">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comp.currentScore}
                        onChange={e => handleScoreChange(comp.dimension, Number(e.target.value))}
                        className={`career-competency-slider slider-${comp.dimension}`}
                      />
                      <div className="career-score-bar-track">
                        <div
                          className="career-score-bar-fill"
                          style={{ width: `${comp.currentScore}%` }}
                        />
                        <div
                          className="career-required-marker"
                          style={{ left: `${comp.requiredScore}%` }}
                          title={`Yêu cầu: ${comp.requiredScore}`}
                        />
                      </div>
                    </div>

                    <div className="career-competency-actions">
                      <button
                        className="career-criteria-toggle-btn"
                        onClick={() => setExpandedDimension(isExpanded ? null : comp.dimension)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            Thu gọn tiêu chuẩn bằng chứng
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            Xem tiêu chuẩn bằng chứng cần đạt ({comp.evidenceCriteria.length})
                          </>
                        )}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="career-criteria-dropdown">
                        <h4 className="career-criteria-title">Tiêu chuẩn nghiệm thu bằng chứng (Evidence Criteria):</h4>
                        <ul className="career-criteria-list">
                          {comp.evidenceCriteria.map((crit, idx) => (
                            <li key={idx} className="career-criteria-item">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-2 flex-shrink-0 mt-0.5" />
                              <span>{crit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="career-section">
            <div className="career-section-header">
              <h3 className="career-section-title">Sáng kiến Thăng tiến Chiến lược (High-Impact Initiatives)</h3>
              <p className="career-section-desc">Các hành động trọng điểm được đề xuất dựa trên điểm yếu lớn nhất của bạn nhằm tạo đột phá hồ sơ.</p>
            </div>

            <div className="career-initiatives-grid">
              {initiatives.map((item, idx) => (
                <div key={idx} className="career-initiative-card">
                  <div className="career-initiative-category-badge">
                    {item.category} · {PROMOTION_DIMENSION_METADATA[item.focusDimension].label}
                  </div>
                  <h4 className="career-initiative-title">{item.title}</h4>
                  <div className="career-initiative-impact">
                    <strong>Kỳ vọng tác động:</strong> {item.expectedImpact}
                  </div>
                  <div className="career-initiative-metrics">
                    <strong>Chỉ số đo lường:</strong> <span className="career-metric-tag">{item.keyMetrics}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="career-section">
            <div className="career-section-header">
              <h3 className="career-section-title">Lộ trình & Thu nhập Thác nước {horizonYears} Năm (Waterfall Projection)</h3>
              <p className="career-section-desc">Mô phỏng thăng cấp chức danh và tổng đãi ngộ hàng năm (Lương cơ bản + Thưởng + Cổ phần).</p>
            </div>

            <div className="career-waterfall-timeline">
              {roadmapSteps.map(step => (
                <div key={step.year} className="career-waterfall-step">
                  <div className="career-step-badge">Năm {step.year}</div>
                  <div className="career-step-content">
                    <div className="career-step-header">
                      <div>
                        <h4 className="career-step-role">{step.role}</h4>
                        <span className="career-step-level-tag">{step.level}</span>
                      </div>
                      <div className="career-step-comp">
                        <span className="career-comp-amount">{formatVndBillion(step.estimatedAnnualCompVnd)}</span>
                        <span className="career-comp-sub">/ năm ước tính</span>
                      </div>
                    </div>
                    <div className="career-step-focus">
                      <strong>Trọng tâm:</strong> {step.focusCompetency}
                    </div>
                    <div className="career-step-milestones">
                      <div className="career-milestone-title">Cột mốc then chốt:</div>
                      <ul>
                        {step.milestones.map((m, mIdx) => (
                          <li key={mIdx}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="career-trajectory-footer">
          {saveSuccess && (
            <div className="career-save-toast">
              <Check className="w-4 h-4 mr-1 text-emerald-400" />
              Đã lưu lộ trình thăng tiến thành công!
            </div>
          )}
          <button className="career-btn-secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            className="career-btn-primary career-save-btn"
            onClick={handleSaveTrajectory}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Đang lưu...' : 'Lưu mô phỏng lộ trình'}
          </button>
        </div>
      </div>
    </div>
  );
};
