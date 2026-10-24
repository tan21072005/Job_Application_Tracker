import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Eye,
  Share2,
  Copy,
  Check,
  Lock,
  FileText,
  Sparkles,
  Award,
  AlertCircle,
  ExternalLink,
  Globe,
  Clock,
  Trash2,
  RotateCcw
} from 'lucide-react';
import {
  portfolioRepository,
  type PortfolioConfigDTO,
  type PublicDossierViewDTO,
  type PortfolioDisplaySettings
} from '../data';

interface DossierConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DossierConfigModal: React.FC<DossierConfigModalProps> = ({ isOpen, onClose }) => {
  const [portfolio, setPortfolio] = useState<PortfolioConfigDTO | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'privacy' | 'share'>('profile');
  const [previewDossier, setPreviewDossier] = useState<PublicDossierViewDTO | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [location, setLocation] = useState('');
  const [salaryExpectation, setSalaryExpectation] = useState('');
  const [targetRolesText, setTargetRolesText] = useState('');
  const [bio, setBio] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [displaySettings, setDisplaySettings] = useState<PortfolioDisplaySettings>({
    showInterviews: true,
    showSalaryExpectation: true,
    showRoadmapProgress: true,
    showTopSkills: true,
    showSimulationScore: true,
    anonymizeCandidateName: false
  });

  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadPortfolio();
    }
  }, [isOpen]);

  async function loadPortfolio() {
    setLoading(true);
    setError(null);
    try {
      const data = await portfolioRepository.getPortfolio();
      setPortfolio(data);
      setTitle(data.title || '');
      setSlug(data.slug || '');
      setLocation(data.location || '');
      setSalaryExpectation(data.salaryExpectation || '');
      setTargetRolesText(data.targetRoles?.join(', ') || '');
      setBio(data.bio || '');
      setIsPublic(data.isPublic);
      if (data.displaySettings) {
        setDisplaySettings(data.displaySettings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải cấu hình hồ sơ.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const roles = targetRolesText
      .split(',')
      .map(r => r.trim())
      .filter(Boolean);

    try {
      const updated = await portfolioRepository.updatePortfolio({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        location: location.trim(),
        salaryExpectation: salaryExpectation.trim(),
        targetRoles: roles.length > 0 ? roles : ['Kỹ sư phần mềm'],
        bio: bio.trim(),
        isPublic,
        displaySettings
      });
      setPortfolio(updated);
      setSuccessMsg('Đã lưu cấu hình hồ sơ năng lực thành công.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateToken() {
    setSaving(true);
    setError(null);
    try {
      const tokenData = await portfolioRepository.generateToken(expiryDays > 0 ? expiryDays : undefined);
      setPortfolio(prev =>
        prev
          ? {
              ...prev,
              shareToken: tokenData.token,
              tokenExpiresAt: tokenData.expiresAt || null
            }
          : null
      );
      setSuccessMsg('Đã tạo liên kết chia sẻ bảo mật thành công!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tạo liên kết chia sẻ.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeToken() {
    if (!confirm('Bạn có chắc chắn muốn hủy liên kết này? Người nhận sẽ không thể truy cập nữa.')) return;
    setSaving(true);
    setError(null);
    try {
      await portfolioRepository.revokeToken();
      setPortfolio(prev =>
        prev
          ? {
              ...prev,
              shareToken: null,
              tokenExpiresAt: null
            }
          : null
      );
      setSuccessMsg('Đã hủy liên kết chia sẻ công khai.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể hủy liên kết.');
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenPreview() {
    setLoading(true);
    setError(null);
    try {
      let token = portfolio?.shareToken;
      if (!token) {
        const generated = await portfolioRepository.generateToken(30);
        token = generated.token;
        setPortfolio(prev => (prev ? { ...prev, shareToken: token } : null));
      }
      const dossier = await portfolioRepository.getPublicDossier(token);
      if (dossier) {
        setPreviewDossier(dossier);
        setShowPreviewModal(true);
      } else {
        setError('Không thể tạo bản xem trước hồ sơ.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải bản xem trước.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    if (!portfolio?.shareToken) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:64364';
    const fullUrl = `${origin}/#dossier/${portfolio.shareToken}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (!isOpen) return null;

  return (
    <div className="dossier-modal-backdrop" onClick={onClose}>
      <div className="dossier-modal-container" onClick={e => e.stopPropagation()}>
        <div className="dossier-modal-header">
          <div className="dossier-header-title-box">
            <div className="dossier-header-icon-wrap">
              <ShieldCheck className="dossier-icon" size={24} />
            </div>
            <div>
              <div className="dossier-title-row">
                <h2 className="dossier-modal-title">Hồ Sơ Năng Lực Bảo Chứng (Verified Dossier)</h2>
                <span className="dossier-verified-badge">Bảo Chứng Số</span>
              </div>
              <p className="dossier-modal-sub">
                Hồ sơ số xác thực năng lực, kiểm soát quyền riêng tư và chia sẻ an toàn với nhà tuyển dụng & mentor
              </p>
            </div>
          </div>

          <div className="dossier-header-actions">
            <button type="button" className="dossier-preview-btn" onClick={handleOpenPreview}>
              <Eye size={16} /> Xem Trước Hồ Sơ
            </button>
            <button type="button" className="dossier-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="dossier-nav-tabs">
          <button
            type="button"
            className={`dossier-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FileText size={16} /> Định Vị Hồ Sơ
          </button>
          <button
            type="button"
            className={`dossier-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Lock size={16} /> Quyền Riêng Tư & Ẩn Danh
          </button>
          <button
            type="button"
            className={`dossier-tab-btn ${activeTab === 'share' ? 'active' : ''}`}
            onClick={() => setActiveTab('share')}
          >
            <Share2 size={16} /> Liên Kết Chia Sẻ & Kiểm Toán
          </button>
        </div>

        {error && (
          <div className="dossier-alert error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="dossier-alert success">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="dossier-modal-body">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveConfig} className="dossier-form-section">
              <div className="dossier-form-grid">
                <div className="form-group">
                  <label className="form-label">Tiêu đề chuyên môn (Headline)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="VD: Senior Distributed Systems Architect"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Đường dẫn định danh (Slug)</label>
                  <div className="slug-input-wrapper">
                    <span className="slug-prefix">jobtrack.vn/dossier/</span>
                    <input
                      type="text"
                      className="form-input slug-input"
                      value={slug}
                      onChange={e => setSlug(e.target.value)}
                      placeholder="alex-tran-architect"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="dossier-form-grid mt-3">
                <div className="form-group">
                  <label className="form-label">Địa điểm làm việc</label>
                  <input
                    type="text"
                    className="form-input"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="VD: TP. Hồ Chí Minh / Remote"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mức lương kỳ vọng</label>
                  <input
                    type="text"
                    className="form-input"
                    value={salaryExpectation}
                    onChange={e => setSalaryExpectation(e.target.value)}
                    placeholder="VD: 60.000.000 - 80.000.000 VNĐ"
                  />
                </div>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Các vị trí mục tiêu (cách nhau bởi dấu phẩy)</label>
                <input
                  type="text"
                  className="form-input"
                  value={targetRolesText}
                  onChange={e => setTargetRolesText(e.target.value)}
                  placeholder="VD: Lead Backend Engineer, Solutions Architect, Staff Developer"
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Tóm tắt năng lực & Triết lý kỹ thuật (Bio)</label>
                <textarea
                  className="form-textarea"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Trình bày ngắn gọn về thế mạnh kỹ thuật, các hệ thống quy mô lớn từng thiết kế hoặc vận hành..."
                  rows={4}
                />
              </div>

              <div className="dossier-submit-row mt-4">
                <button type="submit" className="dossier-save-btn" disabled={saving}>
                  {saving ? <RotateCcw className="spin-icon" size={16} /> : <Check size={16} />}
                  Lưu Cấu Hình
                </button>
              </div>
            </form>
          )}

          {activeTab === 'privacy' && (
            <div className="dossier-privacy-section">
              <div className="privacy-intro-box">
                <Sparkles size={18} className="intro-icon" />
                <div>
                  <h4 className="intro-title">Kiểm Soát Quyền Riêng Tư Chi Tiết</h4>
                  <p className="intro-sub">
                    Tùy chọn những thông tin được phép xuất hiện trên liên kết công khai. Bạn có thể ẩn mức lương hoặc ẩn
                    danh danh tính khi ứng tuyển ngầm.
                  </p>
                </div>
              </div>

              <div className="privacy-toggle-list">
                {[
                  {
                    key: 'anonymizeCandidateName',
                    title: 'Ẩn danh tên ứng viên (Discreet Job Search)',
                    desc: 'Ẩn họ tên thật trên hồ sơ chia sẻ (chỉ hiển thị mã hóa "Kỹ sư A***") để bạn an tâm chia sẻ khi chưa thôi việc.',
                    checked: displaySettings.anonymizeCandidateName
                  },
                  {
                    key: 'showSalaryExpectation',
                    title: 'Hiển thị mức lương kỳ vọng',
                    desc: 'Cho phép nhà tuyển dụng và headhunter nắm rõ khung đãi ngộ mong muốn ngay từ vòng sàng lọc.',
                    checked: displaySettings.showSalaryExpectation
                  },
                  {
                    key: 'showRoadmapProgress',
                    title: 'Hiển thị tiến độ lộ trình kỹ năng AI',
                    desc: 'Chứng minh tinh thần học tập liên tục qua tiến độ hoàn thành các cột mốc kỹ năng công nghệ cao.',
                    checked: displaySettings.showRoadmapProgress
                  },
                  {
                    key: 'showSimulationScore',
                    title: 'Hiển thị điểm số phỏng vấn giả lập',
                    desc: 'Hiển thị xếp loại sẵn sàng thực chiến (Ready / Strong Contender) kèm điểm phỏng vấn kiến trúc.',
                    checked: displaySettings.showSimulationScore
                  },
                  {
                    key: 'showInterviews',
                    title: 'Hiển thị số lượng vòng phỏng vấn đang diễn ra',
                    desc: 'Tạo tín hiệu năng lực cao và sức hút ứng viên đối với nhà tuyển dụng.',
                    checked: displaySettings.showInterviews
                  },
                  {
                    key: 'showTopSkills',
                    title: 'Hiển thị danh sách kỹ năng đã bảo chứng',
                    desc: 'Các nhóm kỹ năng cốt lõi được hệ thống xác thực từ hồ sơ thực tế.',
                    checked: displaySettings.showTopSkills
                  }
                ].map(item => (
                  <div key={item.key} className="privacy-toggle-card">
                    <div className="toggle-info">
                      <div className="toggle-title">{item.title}</div>
                      <div className="toggle-desc">{item.desc}</div>
                    </div>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={e => {
                          const nextSettings = {
                            ...displaySettings,
                            [item.key]: e.target.checked
                          };
                          setDisplaySettings(nextSettings);
                          portfolioRepository.updatePortfolio({ displaySettings: nextSettings });
                        }}
                      />
                      <span className="slider round" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'share' && (
            <div className="dossier-share-section">
              {portfolio?.shareToken ? (
                <div className="share-active-box">
                  <div className="share-token-header">
                    <div className="token-status-badge active">
                      <Globe size={14} /> Liên kết đang hoạt động
                    </div>
                    {portfolio.tokenExpiresAt ? (
                      <span className="token-expiry-text">
                        <Clock size={14} /> Hết hạn: {new Date(portfolio.tokenExpiresAt).toLocaleDateString('vi-VN')}
                      </span>
                    ) : (
                      <span className="token-expiry-text permanent">Thời hạn: Vĩnh viễn</span>
                    )}
                  </div>

                  <div className="public-link-box">
                    <span className="public-link-url">
                      {typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:64364'}
                      /#dossier/{portfolio.shareToken}
                    </span>
                    <button type="button" className="copy-link-btn" onClick={handleCopyLink}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Đã sao chép!' : 'Sao chép'}
                    </button>
                  </div>

                  <div className="share-audit-row">
                    <div className="audit-metric-card">
                      <span className="audit-label">Số lượt nhà tuyển dụng xem:</span>
                      <span className="audit-num">{portfolio.accessCount || 0} lượt</span>
                    </div>

                    <div className="audit-metric-card">
                      <span className="audit-label">Lần truy cập gần nhất:</span>
                      <span className="audit-val">
                        {portfolio.lastAccessedAt
                          ? new Date(portfolio.lastAccessedAt).toLocaleString('vi-VN')
                          : 'Chưa có lượt xem nào'}
                      </span>
                    </div>
                  </div>

                  <div className="share-token-actions">
                    <button type="button" className="revoke-btn" onClick={handleRevokeToken}>
                      <Trash2 size={16} /> Hủy Liên Kết Này
                    </button>
                  </div>
                </div>
              ) : (
                <div className="share-empty-box">
                  <div className="share-empty-icon-wrap">
                    <Share2 size={28} />
                  </div>
                  <h4 className="share-empty-title">Chưa có liên kết chia sẻ nào</h4>
                  <p className="share-empty-sub">
                    Tạo đường dẫn token hóa bảo mật để gửi cho nhà tuyển dụng hoặc mentor. Bạn có thể thu hồi bất kỳ lúc
                    nào.
                  </p>

                  <div className="share-expiry-picker">
                    <label className="picker-label">Thời hạn truy cập:</label>
                    <select
                      className="picker-select"
                      value={expiryDays}
                      onChange={e => setExpiryDays(parseInt(e.target.value, 10))}
                    >
                      <option value={7}>7 ngày</option>
                      <option value={14}>14 ngày</option>
                      <option value={30}>30 ngày (Tiêu chuẩn)</option>
                      <option value={90}>90 ngày</option>
                      <option value={0}>Không thời hạn</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    className="generate-token-btn"
                    onClick={handleGenerateToken}
                    disabled={saving}
                  >
                    {saving ? <RotateCcw className="spin-icon" size={16} /> : <Share2 size={16} />}
                    Tạo Liên Kết Chia Sẻ Bảo Mật
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showPreviewModal && previewDossier && (
          <div className="preview-submodal-backdrop" onClick={() => setShowPreviewModal(false)}>
            <div className="preview-card-container" onClick={e => e.stopPropagation()}>
              <div className="preview-card-header">
                <div className="preview-stamp">
                  <ShieldCheck size={18} />
                  <span>XÁC THỰC BẢO CHỨNG · JOBTRACK SYSTEM</span>
                </div>
                <button type="button" className="preview-close-btn" onClick={() => setShowPreviewModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="preview-card-body">
                <div className="preview-hero">
                  <div className="preview-name-row">
                    <h3 className="preview-candidate-name">{previewDossier.candidateName}</h3>
                    <span className="preview-verified-pill">
                      <Check size={12} /> Verified Candidate
                    </span>
                  </div>
                  <div className="preview-headline">{previewDossier.title}</div>
                  {previewDossier.location && (
                    <div className="preview-location">📍 {previewDossier.location}</div>
                  )}

                  {previewDossier.targetRoles && previewDossier.targetRoles.length > 0 && (
                    <div className="preview-roles-list">
                      {previewDossier.targetRoles.map((r, idx) => (
                        <span key={idx} className="preview-role-chip">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {previewDossier.bio && <p className="preview-bio-text">{previewDossier.bio}</p>}
                </div>

                <div className="preview-grid-cols">
                  {previewDossier.topSkills && previewDossier.topSkills.length > 0 && (
                    <div className="preview-block">
                      <h4 className="preview-block-title">Kỹ Năng Đã Bảo Chứng</h4>
                      <div className="preview-skills-grid">
                        {previewDossier.topSkills.map((s, idx) => (
                          <div key={idx} className="preview-skill-badge">
                            <span className="skill-dot" />
                            <span>{s.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewDossier.simulationReadiness && (
                    <div className="preview-block">
                      <h4 className="preview-block-title">Mức Độ Sẵn Sàng Phỏng Vấn</h4>
                      <div className="preview-readiness-box">
                        <div className="readiness-gauge">
                          <span className="gauge-score">{previewDossier.simulationReadiness.score}</span>
                          <span className="gauge-max">/100</span>
                        </div>
                        <div>
                          <div className="readiness-grade-text">
                            Xếp loại: <strong>{previewDossier.simulationReadiness.grade}</strong>
                          </div>
                          <div className="readiness-track-text">
                            Chuyên môn: {previewDossier.simulationReadiness.track.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {previewDossier.roadmapProgress && (
                  <div className="preview-block mt-3">
                    <div className="roadmap-header-row">
                      <h4 className="preview-block-title">Tiến Độ Lộ Trình Kỹ Năng</h4>
                      <span className="roadmap-percent">{previewDossier.roadmapProgress.progressPercent}%</span>
                    </div>
                    <div className="preview-progress-bar">
                      <div
                        className="preview-progress-fill"
                        style={{ width: `${previewDossier.roadmapProgress.progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {previewDossier.salaryExpectation && (
                  <div className="preview-salary-box">
                    <span className="salary-label">Mức lương mong muốn:</span>
                    <span className="salary-val">{previewDossier.salaryExpectation}</span>
                  </div>
                )}

                <div className="preview-fingerprint-box">
                  <div className="fp-label">Mã vân tay bảo chứng (SHA-256 Fingerprint):</div>
                  <div className="fp-code">{previewDossier.verificationFingerprint}</div>
                  <div className="fp-timestamp">
                    Thời điểm xác thực: {new Date(previewDossier.verifiedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              <div className="preview-card-footer">
                <button
                  type="button"
                  className="preview-contact-btn"
                  onClick={() => alert('Thông tin liên hệ đã được ghi nhận vào nhật ký truy cập.')}
                >
                  <ExternalLink size={16} /> Kết Nối & Nhận Hồ Sơ Đầy Đủ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
