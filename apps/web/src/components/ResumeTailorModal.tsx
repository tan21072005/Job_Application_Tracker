import React, { useState, useEffect } from 'react';
import {
  type ResumeVariantDTO,
  type ResumeExperienceDTO,
  type ResumeSkillGroupDTO,
  type ResumeTailorResultDTO,
  type ResumeDiffItem,
  type KeywordCoverageDTO,
  resumeRepository
} from '../data';

interface ResumeTailorModalProps {
  isOpen: boolean;
  onClose: () => void;
  company?: string;
  position?: string;
  jobDescription?: string;
  onSavedVariant?: (variant: ResumeVariantDTO) => void;
}

export function ResumeTailorModal({
  isOpen,
  onClose,
  company = '',
  position = '',
  jobDescription = '',
  onSavedVariant
}: ResumeTailorModalProps) {
  const [resumes, setResumes] = useState<ResumeVariantDTO[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [inputCompany, setInputCompany] = useState<string>(company);
  const [inputPosition, setInputPosition] = useState<string>(position);
  const [inputDescription, setInputDescription] = useState<string>(jobDescription);
  const [loading, setLoading] = useState<boolean>(false);
  const [tailorResult, setTailorResult] = useState<ResumeTailorResultDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'diff' | 'tailored' | 'keywords'>('diff');
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputCompany(company);
      setInputPosition(position);
      setInputDescription(jobDescription);
      setError(null);
      setSaveSuccess(null);
      setCopyStatus(null);
      loadResumes();
    }
  }, [isOpen, company, position, jobDescription]);

  async function loadResumes() {
    try {
      const list = await resumeRepository.list();
      setResumes(list);
      const master = list.find(r => r.isMaster) || list[0];
      if (master) {
        setSelectedResumeId(master.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách CV.');
    }
  }

  async function handleTailor() {
    if (!inputCompany.trim() || !inputPosition.trim()) {
      setError('Vui lòng nhập tên công ty và vị trí ứng tuyển.');
      return;
    }
    setLoading(true);
    setError(null);
    setSaveSuccess(null);
    try {
      const result = await resumeRepository.tailor({
        resumeId: selectedResumeId || undefined,
        jobDetails: {
          company: inputCompany.trim(),
          position: inputPosition.trim(),
          description: inputDescription.trim()
        }
      });
      setTailorResult(result);
      setActiveTab('diff');
    } catch (err: any) {
      setError(err?.message || 'Không thể may đo CV.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveVariant() {
    if (!tailorResult) return;
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        name: tailorResult.tailoredResume.name,
        targetRole: tailorResult.tailoredResume.targetRole,
        summary: tailorResult.tailoredResume.summary,
        experiences: tailorResult.tailoredResume.experiences,
        skillGroups: tailorResult.tailoredResume.skillGroups,
        isMaster: false
      };
      const created = await resumeRepository.create(payload);
      setSaveSuccess(`Đã lưu phiên bản "${created.name}" thành công!`);
      if (onSavedVariant) onSavedVariant(created);
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu phiên bản CV.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleCopyMarkdown() {
    if (!tailorResult) return;
    const cv = tailorResult.tailoredResume;
    const md = [
      `# ${cv.name}`,
      `**Mục tiêu**: ${cv.targetRole || ''}\n`,
      `## Tóm tắt chuyên môn`,
      `${cv.summary}\n`,
      `## Kinh nghiệm làm việc`,
      ...cv.experiences.map((e: ResumeExperienceDTO) => [
        `### ${e.role} — ${e.company} (${e.period})`,
        ...e.bulletPoints.map((b: string) => `- ${b}`),
        e.technologies && e.technologies.length > 0 ? `*Công nghệ*: ${e.technologies.join(', ')}` : '',
        ''
      ].filter(Boolean).join('\n')),
      `## Kỹ năng chuyên môn`,
      ...cv.skillGroups.map((g: ResumeSkillGroupDTO) => `- **${g.category}**: ${g.skills.join(', ')}`)
    ].join('\n');

    navigator.clipboard.writeText(md).then(() => {
      setCopyStatus('Đã sao chép nội dung CV vào clipboard!');
      setTimeout(() => setCopyStatus(null), 3000);
    });
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card resume-tailor-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-group">
            <span className="badge badge-accent">AI ATS Optimizer</span>
            <h2 className="modal-title">May đo CV Thông Minh Theo Job Description</h2>
          </div>
          <button type="button" className="btn-icon close-tailor-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
          {copyStatus && <div className="alert alert-info">{copyStatus}</div>}

          <div className="tailor-input-grid">
            <div className="field-group">
              <label className="field-label">Phiên bản CV gốc để may đo</label>
              <select
                className="select-input select-base-resume"
                value={selectedResumeId}
                onChange={e => setSelectedResumeId(e.target.value)}
              >
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.isMaster ? '(CV Chính)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field-group">
                <label className="field-label">Công ty</label>
                <input
                  type="text"
                  className="text-input input-tailor-company"
                  value={inputCompany}
                  onChange={e => setInputCompany(e.target.value)}
                  placeholder="VD: VinAI, VNG, Shopee..."
                />
              </div>
              <div className="field-group">
                <label className="field-label">Vị trí ứng tuyển</label>
                <input
                  type="text"
                  className="text-input input-tailor-position"
                  value={inputPosition}
                  onChange={e => setInputPosition(e.target.value)}
                  placeholder="VD: Senior Frontend Engineer..."
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Mô tả công việc (Job Description / Yêu cầu)</label>
              <textarea
                className="textarea-input input-tailor-jd"
                rows={4}
                value={inputDescription}
                onChange={e => setInputDescription(e.target.value)}
                placeholder="Dán toàn bộ JD hoặc các yêu cầu kỹ thuật chính tại đây..."
              />
            </div>

            <div className="tailor-actions-bar">
              <button
                type="button"
                className="btn btn-primary start-tailor-btn"
                disabled={loading}
                onClick={handleTailor}
              >
                {loading ? 'Đang phân tích & may đo ATS...' : 'Bắt đầu may đo CV (AI ATS)'}
              </button>
            </div>
          </div>

          {tailorResult && (
            <div className="tailor-results-container">
              <div className="ats-score-banner">
                <div className="score-stat-card">
                  <span className="stat-label">Điểm ATS Gốc</span>
                  <span className="stat-value original-score">{tailorResult.originalScore}%</span>
                </div>
                <div className="score-arrow">➔</div>
                <div className="score-stat-card highlight">
                  <span className="stat-label">Điểm ATS Sau May Đo</span>
                  <span className="stat-value tailored-score">{tailorResult.tailoredScore}%</span>
                </div>
                <div className="score-delta-badge">
                  +{tailorResult.scoreDelta}% Cải thiện
                </div>
              </div>

              <div className="tab-navigation">
                <button
                  type="button"
                  className={`tab-btn tab-diff ${activeTab === 'diff' ? 'active' : ''}`}
                  onClick={() => setActiveTab('diff')}
                >
                  Khác biệt chỉnh sửa ({tailorResult.diffs.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn tab-tailored ${activeTab === 'tailored' ? 'active' : ''}`}
                  onClick={() => setActiveTab('tailored')}
                >
                  CV Hoàn chỉnh
                </button>
                <button
                  type="button"
                  className={`tab-btn tab-keywords ${activeTab === 'keywords' ? 'active' : ''}`}
                  onClick={() => setActiveTab('keywords')}
                >
                  Độ phủ từ khóa ({tailorResult.keywordCoverage.filter((k: KeywordCoverageDTO) => k.matched).length}/{tailorResult.keywordCoverage.length})
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'diff' && (
                  <div className="diff-view-panel">
                    {tailorResult.diffs.map((d: ResumeDiffItem, i: number) => (
                      <div key={i} className={`diff-item diff-${d.type}`}>
                        <div className="diff-header">
                          <span className="diff-badge">{d.type === 'modified' ? 'Chỉnh sửa' : d.type === 'added' ? 'Thêm mới' : 'Giữ nguyên'}</span>
                          <span className="diff-section-tag">{d.section.toUpperCase()}</span>
                          {d.reason && <span className="diff-reason">{d.reason}</span>}
                        </div>
                        {d.originalText && (
                          <div className="diff-box diff-original">
                            <span className="box-title">Bản gốc:</span>
                            <p>{d.originalText}</p>
                          </div>
                        )}
                        <div className="diff-box diff-tailored">
                          <span className="box-title">Đã may đo:</span>
                          <p>{d.tailoredText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tailored' && (
                  <div className="tailored-cv-preview">
                    <div className="cv-header-block">
                      <h3>{tailorResult.tailoredResume.name}</h3>
                      <div className="cv-role">{tailorResult.tailoredResume.targetRole}</div>
                    </div>

                    <div className="cv-section">
                      <h4>Tóm tắt chuyên môn</h4>
                      <p>{tailorResult.tailoredResume.summary}</p>
                    </div>

                    <div className="cv-section">
                      <h4>Kinh nghiệm làm việc</h4>
                      {tailorResult.tailoredResume.experiences.map((exp: ResumeExperienceDTO, idx: number) => (
                        <div key={idx} className="cv-experience-card">
                          <div className="exp-heading">
                            <strong>{exp.role}</strong> — <span>{exp.company}</span>
                            <span className="exp-period">{exp.period}</span>
                          </div>
                          <ul className="bullet-points-list">
                            {exp.bulletPoints.map((bp: string, bidx: number) => (
                              <li key={bidx}>{bp}</li>
                            ))}
                          </ul>
                          {exp.technologies && exp.technologies.length > 0 && (
                            <div className="tech-tags-list">
                              {exp.technologies.map((t: string, tidx: number) => (
                                <span key={tidx} className="tech-tag">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="cv-section">
                      <h4>Kỹ năng chuyên môn</h4>
                      <div className="skill-groups-container">
                        {tailorResult.tailoredResume.skillGroups.map((grp: ResumeSkillGroupDTO, gidx: number) => (
                          <div key={gidx} className="skill-group-card">
                            <span className="skill-category-title">{grp.category}:</span>
                            <div className="skill-chips-row">
                              {grp.skills.map((s: string, sidx: number) => (
                                <span key={sidx} className="skill-chip">{s}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'keywords' && (
                  <div className="keywords-view-panel">
                    <div className="keywords-summary-bar">
                      Tổng số từ khóa phát hiện: <strong>{tailorResult.keywordCoverage.length}</strong> | Khớp: <strong className="text-success">{tailorResult.keywordCoverage.filter((k: KeywordCoverageDTO) => k.matched).length}</strong> | Thiếu: <strong className="text-danger">{tailorResult.keywordCoverage.filter((k: KeywordCoverageDTO) => !k.matched).length}</strong>
                    </div>
                    <div className="keywords-grid">
                      {tailorResult.keywordCoverage.map((kw: KeywordCoverageDTO, idx: number) => (
                        <div key={idx} className={`keyword-chip ${kw.matched ? 'matched' : 'missing'} importance-${kw.importance}`}>
                          <span className="keyword-text">{kw.keyword}</span>
                          <span className="keyword-status">{kw.matched ? '✓' : '✗'}</span>
                          {kw.foundIn.length > 0 && (
                            <span className="keyword-found-in">({kw.foundIn.join(', ')})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {tailorResult.tailoringNotes.length > 0 && (
                <div className="tailoring-notes-box">
                  <h4>Ghi chú cải tiến ATS:</h4>
                  <ul>
                    {tailorResult.tailoringNotes.map((note: string, idx: number) => (
                      <li key={idx}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modal-footer-actions">
                <button
                  type="button"
                  className="btn btn-secondary copy-tailored-btn"
                  onClick={handleCopyMarkdown}
                >
                  Sao chép Markdown
                </button>
                <button
                  type="button"
                  className="btn btn-primary save-tailored-variant-btn"
                  disabled={isSaving}
                  onClick={handleSaveVariant}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thành bản CV mới'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
