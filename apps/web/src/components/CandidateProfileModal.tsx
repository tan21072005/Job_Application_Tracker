import { useEffect, useState } from 'react';
import {
  User,
  Mail,
  Phone,
  FileText,
  Globe,
  Tag,
  Sparkles,
  Plus,
  X,
  LoaderCircle,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Dialog, Button, Field } from './ui';
import { profileRepository } from '../data';
import { ApiError } from '../transport';
import type { CandidateProfileWireDTO, CandidateProfileMutationInput } from '@jobtrack/contract';

interface CandidateProfileModalProps {
  onClose: () => void;
  onSaved: (profile: CandidateProfileWireDTO) => void;
}

export default function CandidateProfileModal({ onClose, onSaved }: CandidateProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [initialProfile, setInitialProfile] = useState<CandidateProfileWireDTO | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [bio, setBio] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [conflictError, setConflictError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchProfile() {
      try {
        const p = await profileRepository.get();
        if (active && p) {
          setInitialProfile(p);
          setFullName(p.fullName || '');
          setEmail(p.email || '');
          setPhone(p.phone || '');
          setCvUrl(p.cvUrl || '');
          setPortfolioUrl(p.portfolioUrl || '');
          setSkills(p.skills || []);
          setBio(p.bio || '');
        }
      } catch (err) {
        if (active) {
          setErrors({ _root: (err as Error).message || 'Không thể tải hồ sơ.' });
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void fetchProfile();
    return () => {
      active = false;
    };
  }, []);

  function handleAddSkill() {
    const val = skillInput.trim();
    if (!val) return;
    if (skills.includes(val)) {
      setSkillInput('');
      return;
    }
    if (skills.length >= 50) {
      setErrors(prev => ({ ...prev, skills: 'Tối đa 50 kỹ năng.' }));
      return;
    }
    setSkills(prev => [...prev, val]);
    setSkillInput('');
    setErrors(prev => {
      const next = { ...prev };
      delete next.skills;
      return next;
    });
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
  }

  function handleKeyDownSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  }

  async function handleSave() {
    setErrors({});
    setConflictError(null);

    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Họ và tên không được để trống.';
    if (!email.trim()) newErrors.email = 'Email không được để trống.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) newErrors.email = 'Email không đúng định dạng.';

    if (cvUrl.trim() && !/^https?:\/\//i.test(cvUrl.trim())) {
      newErrors.cvUrl = 'Đường dẫn CV phải bắt đầu bằng http:// hoặc https://';
    }
    if (portfolioUrl.trim() && !/^https?:\/\//i.test(portfolioUrl.trim())) {
      newErrors.portfolioUrl = 'Đường dẫn Portfolio phải bắt đầu bằng http:// hoặc https://';
    }
    if (bio.length > 2000) {
      newErrors.bio = 'Mô tả bản thân không được vượt quá 2000 ký tự.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    try {
      const payload: CandidateProfileMutationInput = {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        cvUrl: cvUrl.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        skills,
        bio: bio.trim() || null,
        customAnswers: initialProfile?.customAnswers || {},
        expectedUpdatedAt: initialProfile?.updatedAt || null
      };
      const saved = await profileRepository.save(payload);
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        setConflictError('Hồ sơ đã được cập nhật ở nơi khác. Hãy đóng form và mở lại để tải dữ liệu mới nhất.');
      } else if (err instanceof ApiError && err.status === 422) {
        if (err.fields) {
          setErrors(err.fields);
        } else {
          setErrors({ _root: err.message || 'Dữ liệu không hợp lệ.' });
        }
      } else {
        setErrors({ _root: (err as Error).message || 'Có lỗi xảy ra khi lưu hồ sơ.' });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog title="Hồ sơ ứng viên cá nhân" onClose={onClose} wide busy={loading || saving}>
      <div className="dialog-body profile-dialog-layout">
        {loading ? (
          <div className="loading-state" role="status">
            <LoaderCircle className="spin" size={24} />
            <p>Đang tải thông tin hồ sơ…</p>
          </div>
        ) : (
          <>
            {conflictError && (
              <div className="notice notice-conflict" role="alert">
                <AlertCircle size={18} />
                <div>
                  <strong>Xung đột dữ liệu</strong>
                  <p>{conflictError}</p>
                </div>
              </div>
            )}
            {errors._root && (
              <div className="notice notice-error" role="alert">
                <AlertCircle size={18} />
                <p>{errors._root}</p>
              </div>
            )}

            <div className="profile-grid">
              <div className="profile-form-column">
                <Field label="Họ và tên *" error={errors.fullName}>
                  <div className="input-with-icon">
                    <User size={16} />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      maxLength={120}
                    />
                  </div>
                </Field>

                <div className="form-row">
                  <Field label="Email liên hệ *" error={errors.email}>
                    <div className="input-with-icon">
                      <Mail size={16} />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        maxLength={254}
                      />
                    </div>
                  </Field>

                  <Field label="Số điện thoại" error={errors.phone}>
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="(+84) 912 345 678"
                        maxLength={30}
                      />
                    </div>
                  </Field>
                </div>

                <div className="form-row">
                  <Field label="Đường dẫn CV / Resume (URL)" error={errors.cvUrl} help="Link PDF trên Google Drive, Dropbox hoặc kho lưu trữ">
                    <div className="input-with-icon">
                      <FileText size={16} />
                      <input
                        type="url"
                        value={cvUrl}
                        onChange={e => setCvUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        maxLength={2048}
                      />
                    </div>
                  </Field>

                  <Field label="Portfolio / LinkedIn / GitHub" error={errors.portfolioUrl}>
                    <div className="input-with-icon">
                      <Globe size={16} />
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={e => setPortfolioUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        maxLength={2048}
                      />
                    </div>
                  </Field>
                </div>

                <Field label="Kỹ năng chính" error={errors.skills} help="Nhập tên kỹ năng và nhấn Enter hoặc nút Thêm">
                  <div className="skills-input-wrapper">
                    <div className="input-with-icon">
                      <Tag size={16} />
                      <input
                        type="text"
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={handleKeyDownSkill}
                        placeholder="VD: React, TypeScript, Node.js..."
                        maxLength={50}
                      />
                    </div>
                    <Button type="button" kind="secondary" onClick={handleAddSkill}>
                      <Plus size={16} />
                      Thêm
                    </Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="skills-chips-container">
                      {skills.map(s => (
                        <span key={s} className="skill-chip">
                          {s}
                          <button
                            type="button"
                            aria-label={`Xóa kỹ năng ${s}`}
                            onClick={() => handleRemoveSkill(s)}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </Field>

                <Field label="Giới thiệu bản thân (Bio)" error={errors.bio} help={`${bio.length}/2000 ký tự`}>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Tóm tắt kinh nghiệm làm việc, thế mạnh công nghệ và mục tiêu nghề nghiệp..."
                    maxLength={2000}
                  />
                </Field>
              </div>

              <div className="profile-preview-column">
                <div className="preview-card">
                  <div className="preview-header">
                    <Sparkles size={16} />
                    <span>Xem trước cho AI & Extension</span>
                  </div>
                  <div className="preview-body">
                    <div className="preview-avatar">
                      {fullName.trim() ? fullName.trim().slice(0, 2).toUpperCase() : 'CV'}
                    </div>
                    <h4>{fullName.trim() || 'Chưa đặt họ tên'}</h4>
                    <p className="preview-email">{email.trim() || 'chua-co-email@example.com'}</p>
                    {phone.trim() && <p className="preview-meta">{phone.trim()}</p>}

                    {(cvUrl.trim() || portfolioUrl.trim()) && (
                      <div className="preview-links">
                        {cvUrl.trim() && (
                          <a href={cvUrl.trim()} target="_blank" rel="noopener noreferrer">
                            <FileText size={14} /> CV trực tuyến <ExternalLink size={12} />
                          </a>
                        )}
                        {portfolioUrl.trim() && (
                          <a href={portfolioUrl.trim()} target="_blank" rel="noopener noreferrer">
                            <Globe size={14} /> Portfolio <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    )}

                    <div className="preview-section">
                      <h5>Kỹ năng ({skills.length})</h5>
                      {skills.length > 0 ? (
                        <div className="preview-skills">
                          {skills.map(s => (
                            <span key={s} className="preview-badge">{s}</span>
                          ))}
                        </div>
                      ) : (
                        <small className="muted-text">Chưa thêm kỹ năng nào.</small>
                      )}
                    </div>

                    <div className="preview-section">
                      <h5>Tóm tắt hồ sơ</h5>
                      <p className="preview-bio">
                        {bio.trim() || 'Chưa có thông tin giới thiệu bản thân.'}
                      </p>
                    </div>

                    <div className="preview-footer-notice">
                      <small>✓ Đồng bộ tự động với Chrome Extension (PageWeave AutoFill) và bộ tính năng AI (Phân tích ATS, Viết thư xin việc).</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <footer className="dialog-actions">
        <Button kind="secondary" disabled={saving || loading} onClick={onClose}>
          Hủy
        </Button>
        <Button disabled={saving || loading} onClick={() => void handleSave()}>
          {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
        </Button>
      </footer>
    </Dialog>
  );
}
