import React, { useState, useEffect } from 'react';
import {
  type ResumeVariantDTO,
  type ResumeExperienceDTO,
  type ResumeSkillGroupDTO,
  resumeRepository
} from '../data';

interface ResumeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariant?: (variant: ResumeVariantDTO) => void;
}

export function ResumeManagerModal({
  isOpen,
  onClose,
  onSelectVariant
}: ResumeManagerModalProps) {
  const [resumes, setResumes] = useState<ResumeVariantDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingResume, setEditingResume] = useState<ResumeVariantDTO | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const [formName, setFormName] = useState<string>('');
  const [formRole, setFormRole] = useState<string>('');
  const [formSummary, setFormSummary] = useState<string>('');
  const [formExperiencesText, setFormExperiencesText] = useState<string>('');
  const [formSkillsText, setFormSkillsText] = useState<string>('');
  const [formIsMaster, setFormIsMaster] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadResumes();
      setError(null);
      setMessage(null);
      setEditingResume(null);
      setIsCreating(false);
    }
  }, [isOpen]);

  async function loadResumes() {
    setLoading(true);
    try {
      let list = await resumeRepository.list();
      if (list.length === 0) {
        try {
          const seeded = await resumeRepository.create({
            name: 'CV Tiêu chuẩn (Master Resume)',
            targetRole: 'Senior Fullstack Engineer',
            summary: 'Kỹ sư phần mềm Fullstack với hơn 5 năm kinh nghiệm thiết kế hệ thống phân tán, web scalable và tối ưu hóa trải nghiệm người dùng.',
            experiences: [
              {
                id: 'exp-1',
                company: 'Tech Solutions Corp',
                role: 'Senior Backend Engineer',
                period: '2023 - Hiện tại',
                bulletPoints: [
                  'Thiết kế và phát triển kiến trúc Microservices phục vụ hơn 200,000 người dùng hàng ngày.',
                  'Tối ưu hóa thời gian phản hồi API từ 450ms xuống 85ms bằng Redis caching và indexing PostgreSQL.',
                  'Dẫn dắt chuyển đổi pipeline CI/CD sang Docker và GitHub Actions, giảm 50% thời gian triển khai.'
                ],
                technologies: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker']
              },
              {
                id: 'exp-2',
                company: 'Global Software Solutions',
                role: 'Fullstack Developer',
                period: '2021 - 2023',
                bulletPoints: [
                  'Xây dựng các module frontend responsive với React và Redux Toolkit.',
                  'Tích hợp cổng thanh toán trực tuyến và hệ thống xác thực bảo mật OAuth 2.0 / JWT.'
                ],
                technologies: ['JavaScript', 'React', 'Node.js', 'MySQL', 'AWS']
              }
            ],
            skillGroups: [
              {
                category: 'Ngôn ngữ lập trình',
                skills: ['TypeScript', 'JavaScript', 'SQL', 'Go', 'HTML5', 'CSS3']
              },
              {
                category: 'Framework & Công cụ',
                skills: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Git', 'CI/CD']
              }
            ],
            isMaster: true
          });
          list = [seeded];
        } catch {
        }
      }
      setResumes(list);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách phiên bản CV.');
    } finally {
      setLoading(false);
    }
  }

  function handleStartCreate() {
    setIsCreating(true);
    setEditingResume(null);
    setFormName('');
    setFormRole('');
    setFormSummary('');
    setFormExperiencesText('');
    setFormSkillsText('');
    setFormIsMaster(resumes.length === 0);
  }

  function handleStartEdit(resume: ResumeVariantDTO) {
    setEditingResume(resume);
    setIsCreating(false);
    setFormName(resume.name);
    setFormRole(resume.targetRole || '');
    setFormSummary(resume.summary);
    setFormExperiencesText(
      resume.experiences
        .map((e: ResumeExperienceDTO) => `${e.company} | ${e.role} | ${e.period}\n${e.bulletPoints.map((b: string) => `- ${b}`).join('\n')}`)
        .join('\n\n')
    );
    setFormSkillsText(
      resume.skillGroups
        .map((g: ResumeSkillGroupDTO) => `${g.category}: ${g.skills.join(', ')}`)
        .join('\n')
    );
    setFormIsMaster(resume.isMaster);
  }

  function parseExperiences(text: string): ResumeExperienceDTO[] {
    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    return blocks.map((block, idx) => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const header = lines[0] || '';
      const parts = header.split('|').map(p => p.trim());
      const company = parts[0] || 'Công ty';
      const role = parts[1] || 'Kỹ sư';
      const period = parts[2] || 'Gần đây';
      const bulletPoints = lines
        .slice(1)
        .map(l => l.replace(/^[-*•]\s*/, '').trim())
        .filter(Boolean);

      return {
        id: `exp-${idx + 1}`,
        company,
        role,
        period,
        bulletPoints: bulletPoints.length > 0 ? bulletPoints : ['Đảm nhiệm các công việc chuyên môn'],
        technologies: []
      };
    });
  }

  function parseSkillGroups(text: string): ResumeSkillGroupDTO[] {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const category = parts[0].trim();
        const skills = parts[1].split(',').map(s => s.trim()).filter(Boolean);
        return { category, skills };
      }
      return { category: 'Kỹ năng', skills: line.split(',').map(s => s.trim()).filter(Boolean) };
    });
  }

  async function handleSave() {
    if (!formName.trim()) {
      setError('Vui lòng nhập tên phiên bản CV.');
      return;
    }
    setError(null);
    try {
      const experiences = parseExperiences(formExperiencesText);
      const skillGroups = parseSkillGroups(formSkillsText);
      const payload = {
        name: formName.trim(),
        targetRole: formRole.trim() || undefined,
        summary: formSummary.trim(),
        experiences,
        skillGroups,
        isMaster: formIsMaster
      };

      if (editingResume) {
        await resumeRepository.update(editingResume.id, payload);
        setMessage(`Đã cập nhật bản CV "${formName}" thành công.`);
      } else {
        await resumeRepository.create(payload);
        setMessage(`Đã thêm mới bản CV "${formName}" thành công.`);
      }
      setIsCreating(false);
      setEditingResume(null);
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu phiên bản CV.');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản CV "${name}"?`)) return;
    try {
      await resumeRepository.delete(id);
      setMessage(`Đã xóa bản CV "${name}".`);
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Không thể xóa bản CV.');
    }
  }

  async function handleSetMaster(resume: ResumeVariantDTO) {
    try {
      await resumeRepository.update(resume.id, {
        name: resume.name,
        targetRole: resume.targetRole,
        summary: resume.summary,
        experiences: resume.experiences,
        skillGroups: resume.skillGroups,
        isMaster: true
      });
      setMessage(`Đã đặt "${resume.name}" làm CV chính.`);
      await loadResumes();
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt làm CV chính.');
    }
  }

  function handleExport(resume: ResumeVariantDTO) {
    const md = [
      `# ${resume.name}`,
      `**Vị trí mục tiêu**: ${resume.targetRole || 'Chưa thiết lập'}\n`,
      `## Tóm tắt chuyên môn`,
      `${resume.summary}\n`,
      `## Kinh nghiệm làm việc`,
      ...resume.experiences.map((e: ResumeExperienceDTO) => [
        `### ${e.role} — ${e.company} (${e.period})`,
        ...e.bulletPoints.map((b: string) => `- ${b}`),
        e.technologies && e.technologies.length > 0 ? `*Công nghệ*: ${e.technologies.join(', ')}` : '',
        ''
      ].filter(Boolean).join('\n')),
      `## Kỹ năng`,
      ...resume.skillGroups.map((g: ResumeSkillGroupDTO) => `- **${g.category}**: ${g.skills.join(', ')}`)
    ].join('\n');

    navigator.clipboard.writeText(md).then(() => {
      setMessage(`Đã sao chép nội dung "${resume.name}" vào clipboard dưới dạng Markdown!`);
      setTimeout(() => setMessage(null), 3500);
    });
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card resume-manager-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-group">
            <span className="badge badge-accent">Resume Repository</span>
            <h2 className="modal-title">Quản lý các Phiên bản CV (Master & Target Variants)</h2>
          </div>
          <button type="button" className="btn-icon close-manager-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {message && <div className="alert alert-success">{message}</div>}

          {!isCreating && !editingResume ? (
            <div className="manager-list-view">
              <div className="manager-toolbar">
                <span className="count-label">Tổng cộng {resumes.length} phiên bản CV</span>
                <button
                  type="button"
                  className="btn btn-primary btn-create-resume add-resume-btn"
                  onClick={handleStartCreate}
                >
                  + Thêm phiên bản mới
                </button>
              </div>

              {loading ? (
                <div className="loading-state">Đang tải danh sách CV...</div>
              ) : resumes.length === 0 ? (
                <div className="empty-state">Chưa có phiên bản CV nào. Hãy tạo bản CV đầu tiên của bạn!</div>
              ) : (
                <div className="resume-variants-grid">
                  {resumes.map(r => (
                    <div key={r.id} className={`resume-variant-item resume-card ${r.isMaster ? 'is-master' : ''}`}>
                      <div className="variant-header">
                        <div className="variant-title-wrap">
                          <h3 className="variant-name">{r.name}</h3>
                          {r.isMaster && <span className="badge badge-primary master-badge">CV Chính (Master)</span>}
                        </div>
                        <div className="variant-actions">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline btn-export-resume"
                            onClick={() => handleExport(r)}
                            title="Sao chép Markdown"
                          >
                            Export
                          </button>
                          {!r.isMaster && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline btn-set-master"
                              onClick={() => handleSetMaster(r)}
                              title="Đặt làm CV chính"
                            >
                              Đặt làm chính
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline btn-edit-resume"
                            onClick={() => handleStartEdit(r)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-danger btn-delete-resume"
                            onClick={() => handleDelete(r.id, r.name)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="variant-role">{r.targetRole || 'Chưa đặt mục tiêu vị trí'}</div>
                      <p className="variant-summary">{r.summary}</p>

                      <div className="variant-meta">
                        <span>{r.experiences.length} kinh nghiệm</span>
                        <span>•</span>
                        <span>{r.skillGroups.reduce((acc: number, g: ResumeSkillGroupDTO) => acc + g.skills.length, 0)} kỹ năng</span>
                      </div>

                      {onSelectVariant && (
                        <div className="variant-select-bar">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm select-this-variant-btn"
                            onClick={() => {
                              onSelectVariant(r);
                              onClose();
                            }}
                          >
                            Chọn phiên bản này
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="manager-form-view">
              <div className="form-header">
                <h3>{editingResume ? `Chỉnh sửa: ${editingResume.name}` : 'Tạo mới phiên bản CV'}</h3>
              </div>

              <div className="field-group">
                <label className="field-label">Tên phiên bản CV *</label>
                <input
                  type="text"
                  className="text-input input-resume-name"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="VD: CV Frontend React, CV Fullstack Tech Lead..."
                />
              </div>

              <div className="field-group">
                <label className="field-label">Vị trí mục tiêu</label>
                <input
                  type="text"
                  className="text-input input-resume-role"
                  value={formRole}
                  onChange={e => setFormRole(e.target.value)}
                  placeholder="VD: Senior React Developer"
                />
              </div>

              <div className="field-group">
                <label className="field-label">Tóm tắt chuyên môn (Professional Summary)</label>
                <textarea
                  className="textarea-input input-resume-summary"
                  rows={3}
                  value={formSummary}
                  onChange={e => setFormSummary(e.target.value)}
                  placeholder="Kỹ sư phần mềm giàu kinh nghiệm..."
                />
              </div>

              <div className="field-group">
                <label className="field-label">Kinh nghiệm làm việc (Mỗi khối cách nhau bởi dòng trống, định dạng: Công ty | Vị trí | Thời gian)</label>
                <textarea
                  className="textarea-input input-resume-experiences"
                  rows={6}
                  value={formExperiencesText}
                  onChange={e => setFormExperiencesText(e.target.value)}
                  placeholder={'Acme Corp | Senior Frontend | 2023 - Nay\n- Xây dựng hệ thống UI\n- Tối ưu hiệu năng Web'}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Nhóm kỹ năng (Mỗi dòng một nhóm, ví dụ: Nhóm: Kỹ năng 1, Kỹ năng 2)</label>
                <textarea
                  className="textarea-input input-resume-skills"
                  rows={4}
                  value={formSkillsText}
                  onChange={e => setFormSkillsText(e.target.value)}
                  placeholder={'Ngôn ngữ: TypeScript, JavaScript, SQL\nFramework: React, Node.js, Express'}
                />
              </div>

              <div className="field-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox-input input-resume-master"
                    checked={formIsMaster}
                    onChange={e => setFormIsMaster(e.target.checked)}
                  />
                  <span>Đặt phiên bản này làm CV chính (Master Resume)</span>
                </label>
              </div>

              <div className="form-actions-bar">
                <button
                  type="button"
                  className="btn btn-secondary cancel-form-btn"
                  onClick={() => {
                    setIsCreating(false);
                    setEditingResume(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="btn btn-primary save-resume-btn"
                  onClick={handleSave}
                >
                  Lưu phiên bản CV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
