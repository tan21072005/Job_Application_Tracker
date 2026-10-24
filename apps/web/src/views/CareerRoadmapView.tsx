import { useEffect, useState, useTransition } from 'react';
import {
  Compass,
  CheckCircle2,
  Clock,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Target,
  Award,
  Layers,
  ChevronRight,
  ListCheck,
  AlertCircle
} from 'lucide-react';
import type {
  SkillGapAnalysisDTO,
  CareerRoadmapDTO,
  LearningMilestoneDTO,
  MilestoneStatus,
  ResourceType
} from '@jobtrack/contract';
import type { Application } from '../domain';
import { careerRoadmapRepository } from '../data';
import { Button, Dialog } from '../components/ui';

interface Props {
  apps: Application[];
  onOpen?: (app: Application) => void;
  notify: (msg: string, error?: boolean) => void;
}

export function CareerRoadmapView({ apps, notify }: Props) {
  const [gapAnalysis, setGapAnalysis] = useState<SkillGapAnalysisDTO | null>(null);
  const [roadmap, setRoadmap] = useState<CareerRoadmapDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [targetRoleInput, setTargetRoleInput] = useState('Senior Fullstack Engineer');
  const [focusSkillsInput, setFocusSkillsInput] = useState('');
  const [submittingGenerate, setSubmittingGenerate] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [gap, activeRoadmap] = await Promise.all([
        careerRoadmapRepository.getGapAnalysis(),
        careerRoadmapRepository.getRoadmap()
      ]);
      setGapAnalysis(gap);
      setRoadmap(activeRoadmap);
      if (activeRoadmap.targetRole) {
        setTargetRoleInput(activeRoadmap.targetRole);
      }
    } catch (err) {
      notify((err as Error).message || 'Không thể tải lộ trình sự nghiệp.', true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [apps.length]);

  async function handleStatusChange(milestoneId: string, status: MilestoneStatus) {
    try {
      const updated = await careerRoadmapRepository.updateMilestone(milestoneId, status);
      setRoadmap(updated);
      const statusLabel = status === 'completed' ? 'Hoàn thành' : status === 'in_progress' ? 'Đang học' : 'Chưa bắt đầu';
      notify(`Đã cập nhật cột mốc thành "${statusLabel}".`);
    } catch (err) {
      notify((err as Error).message || 'Không thể cập nhật trạng thái cột mốc.', true);
    }
  }

  async function handleGenerateRoadmap(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingGenerate(true);
    try {
      const focusSkills = focusSkillsInput
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const generated = await careerRoadmapRepository.generateRoadmap({
        targetRole: targetRoleInput.trim() || 'Senior Software Specialist',
        focusSkills: focusSkills.length > 0 ? focusSkills : undefined
      });

      setRoadmap(generated);
      setGenerateModalOpen(false);
      notify(`Đã tạo thành công lộ trình 4 tuần cho vị trí: ${generated.targetRole}`);
    } catch (err) {
      notify((err as Error).message || 'Không thể tạo lộ trình mới.', true);
    } finally {
      setSubmittingGenerate(false);
    }
  }

  function getResourceTypeLabel(type: ResourceType): string {
    switch (type) {
      case 'course':
        return 'Khóa học';
      case 'project':
        return 'Dự án mẫu';
      case 'documentation':
        return 'Tài liệu chuẩn';
      case 'article':
      default:
        return 'Bài viết chuyên sâu';
    }
  }

  return (
    <div className="career-roadmap-view">
      <div className="view-header">
        <div className="view-title-group">
          <div className="roadmap-header-icon">
            <Compass size={24} />
          </div>
          <div>
            <h1>Lộ trình Phát triển Kỹ năng & Sự nghiệp AI</h1>
            <p className="roadmap-subtitle">
              Phân tích khoảng trống kỹ năng từ hồ sơ ứng tuyển và tự động xây dựng lộ trình 4 tuần bứt phá
            </p>
          </div>
        </div>

        <div className="roadmap-header-actions">
          <Button
            kind="primary"
            onClick={() => setGenerateModalOpen(true)}
            disabled={loading}
          >
            <Sparkles size={16} />
            <span>Tái tạo lộ trình</span>
          </Button>
          <button
            type="button"
            className="icon-button roadmap-refresh-btn"
            title="Làm mới lộ trình"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {loading && !roadmap ? (
        <div className="roadmap-loading-state">
          <RefreshCw size={24} className="spin text-blue-500" />
          <p>Đang quét hồ sơ ứng tuyển và trích xuất kỹ năng thị trường…</p>
        </div>
      ) : (
        <div className="roadmap-content">
          <div className="roadmap-top-grid">
            <div className="roadmap-card skill-coverage-card">
              <div className="card-header">
                <div className="card-title-group">
                  <Award size={18} className="text-emerald-500" />
                  <h3>Độ phù hợp kỹ năng (Skill Coverage)</h3>
                </div>
                <span className="coverage-badge">
                  {gapAnalysis?.coverageScore ?? 0}%
                </span>
              </div>

              <div className="coverage-meter-wrapper">
                <div className="coverage-meter-bar">
                  <div
                    className="coverage-meter-fill"
                    style={{ width: `${gapAnalysis?.coverageScore ?? 0}%` }}
                  />
                </div>
                <div className="coverage-meta-text">
                  <span>
                    Đã phân tích <strong>{gapAnalysis?.totalApplicationsAnalyzed ?? apps.length}</strong> hồ sơ ứng tuyển
                  </span>
                  <span>
                    {(gapAnalysis?.coverageScore ?? 0) >= 70 ? 'Phù hợp cao' : 'Cần bồi dưỡng'}
                  </span>
                </div>
              </div>

              <div className="skills-section">
                <h4>Kỹ năng đã sở hữu ({gapAnalysis?.matchedSkills.length ?? 0})</h4>
                <div className="skill-pills-list">
                  {gapAnalysis?.matchedSkills && gapAnalysis.matchedSkills.length > 0 ? (
                    gapAnalysis.matchedSkills.map((s, idx) => (
                      <span key={idx} className="skill-pill matched">
                        <CheckCircle2 size={13} />
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="muted-text">Chưa có kỹ năng đã khớp</span>
                  )}
                </div>
              </div>
            </div>

            <div className="roadmap-card skill-gap-card">
              <div className="card-header">
                <div className="card-title-group">
                  <Target size={18} className="text-amber-500" />
                  <h3>Khoảng trống kỹ năng cần bổ sung</h3>
                </div>
                <span className="missing-count-badge">
                  {gapAnalysis?.missingSkills.length ?? 0} kỹ năng
                </span>
              </div>

              <p className="card-desc">
                Các công nghệ được nhà tuyển dụng trong pipeline của bạn yêu cầu nhiều nhất:
              </p>

              <div className="skill-demands-list">
                {gapAnalysis?.missingSkills && gapAnalysis.missingSkills.length > 0 ? (
                  gapAnalysis.missingSkills.map((d, idx) => (
                    <div key={idx} className="demand-item">
                      <div className="demand-skill-name">
                        <strong>{d.skill}</strong>
                        <span className="demand-category-tag">{d.category}</span>
                      </div>
                      <div className="demand-meta">
                        <span className="demand-count-tag">
                          {d.count} cty ({d.targetCompanies.slice(0, 2).join(', ')})
                        </span>
                        <span className={`proficiency-tag ${d.proficiency}`}>
                          {d.proficiency === 'required' ? 'Bắt buộc' : 'Ưu tiên'}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-gap-notice">
                    <CheckCircle2 size={20} className="text-emerald-500" />
                    <span>Hồ sơ của bạn đã đáp ứng đầy đủ các yêu cầu kỹ thuật hiện tại!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {roadmap && (
            <div className="roadmap-timeline-section">
              <div className="roadmap-timeline-header">
                <div>
                  <h2>{roadmap.title}</h2>
                  <p className="target-role-sub">
                    Mục tiêu: <strong>{roadmap.targetRole}</strong> · Thời lượng: {roadmap.durationWeeks} tuần
                  </p>
                </div>
                <div className="overall-progress-box">
                  <div className="progress-labels">
                    <span>Tiến độ hoàn thành</span>
                    <strong>{roadmap.overallProgressPercent}%</strong>
                  </div>
                  <div className="overall-progress-bar">
                    <div
                      className="overall-progress-fill"
                      style={{ width: `${roadmap.overallProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="milestones-grid">
                {roadmap.milestones.map(m => (
                  <div key={m.id} className={`milestone-card status-${m.status}`}>
                    <div className="milestone-top-bar">
                      <span className="week-badge">Tuần {m.week}</span>
                      <div className="milestone-status-controls">
                        <select
                          value={m.status}
                          aria-label={`Trạng thái tuần ${m.week}`}
                          onChange={e => handleStatusChange(m.id, e.target.value as MilestoneStatus)}
                          className={`status-select ${m.status}`}
                        >
                          <option value="pending">Chưa bắt đầu</option>
                          <option value="in_progress">Đang học</option>
                          <option value="completed">Đã hoàn thành</option>
                        </select>
                      </div>
                    </div>

                    <h3 className="milestone-title">{m.title}</h3>
                    <p className="milestone-desc">{m.description}</p>

                    <div className="milestone-meta-row">
                      <span className="skill-focus-tag">
                        <Sparkles size={12} />
                        {m.skill}
                      </span>
                      <span className="hours-tag">
                        <Clock size={12} />
                        {m.estimatedHours} giờ học
                      </span>
                    </div>

                    <div className="milestone-resources">
                      <h4>
                        <BookOpen size={14} />
                        <span>Tài nguyên học tập gợi ý</span>
                      </h4>
                      <ul className="resources-list">
                        {m.resources.map((r, rIdx) => (
                          <li key={rIdx}>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="resource-link"
                            >
                              <span className="resource-type-pill">
                                {getResourceTypeLabel(r.type)}
                              </span>
                              <span className="resource-title">{r.title}</span>
                              <ExternalLink size={13} className="ext-icon" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {generateModalOpen && (
        <Dialog
          title="Tái tạo Lộ trình Sự nghiệp AI"
          onClose={() => setGenerateModalOpen(false)}
        >
          <form onSubmit={handleGenerateRoadmap} className="generate-roadmap-form">
            <div className="form-group">
              <label htmlFor="target-role-input">Vị trí mục tiêu:</label>
              <input
                id="target-role-input"
                type="text"
                className="input"
                required
                value={targetRoleInput}
                onChange={e => setTargetRoleInput(e.target.value)}
                placeholder="VD: Senior React & Cloud Engineer, Staff Backend Specialist..."
              />
              <small className="field-hint">
                Thuật toán sẽ tự động điều chỉnh độ khó và nội dung các tuần phù hợp với cấp độ này.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="focus-skills-input">Kỹ năng ưu tiên bứt phá (phân cách bằng dấu phẩy):</label>
              <input
                id="focus-skills-input"
                type="text"
                className="input"
                value={focusSkillsInput}
                onChange={e => setFocusSkillsInput(e.target.value)}
                placeholder="VD: Docker, Kubernetes, System Design, GraphQL..."
              />
              <small className="field-hint">
                Để trống nếu muốn hệ thống tự động suy luận từ các công ty bạn đang ứng tuyển.
              </small>
            </div>

            <div className="dialog-actions">
              <Button
                kind="secondary"
                type="button"
                onClick={() => setGenerateModalOpen(false)}
                disabled={submittingGenerate}
              >
                Hủy
              </Button>
              <Button
                kind="primary"
                type="submit"
                disabled={submittingGenerate}
              >
                <Sparkles size={16} />
                <span>{submittingGenerate ? 'Đang thiết kế lộ trình…' : 'Tạo lộ trình ngay'}</span>
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
