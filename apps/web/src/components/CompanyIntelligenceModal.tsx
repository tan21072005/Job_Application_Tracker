import React, { useState, useEffect } from 'react';
import {
  type CompanyProfileDTO,
  type CompanyReviewDTO,
  companyRepository
} from '../data';

interface CompanyIntelligenceModalProps {
  isOpen: boolean;
  companyName: string;
  onClose: () => void;
  onSelectCompany?: (name: string) => void;
}

export function CompanyIntelligenceModal({
  isOpen,
  companyName,
  onClose,
  onSelectCompany
}: CompanyIntelligenceModalProps) {
  const [profile, setProfile] = useState<CompanyProfileDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'culture' | 'salaries' | 'interviews' | 'reviews'>('culture');

  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [reviewRole, setReviewRole] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewWorkLife, setReviewWorkLife] = useState<number>(4);
  const [reviewComp, setReviewComp] = useState<number>(5);
  const [reviewGrowth, setReviewGrowth] = useState<number>(4);
  const [reviewMgmt, setReviewMgmt] = useState<number>(4);
  const [reviewRecommend, setReviewRecommend] = useState<boolean>(true);
  const [reviewPros, setReviewPros] = useState<string>('');
  const [reviewCons, setReviewCons] = useState<string>('');
  const [reviewAdvice, setReviewAdvice] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && companyName) {
      loadProfile(companyName);
      setActiveTab('culture');
      setShowReviewForm(false);
      setReviewSuccess(null);
      setError(null);
    }
  }, [isOpen, companyName]);

  async function loadProfile(name: string) {
    setLoading(true);
    setError(null);
    try {
      const data = await companyRepository.get(name);
      setProfile(data);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải hồ sơ thông tin công ty.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSubmittingReview(true);
    setError(null);
    setReviewSuccess(null);
    try {
      await companyRepository.addReview(profile.name, {
        companyName: profile.name,
        role: reviewRole,
        rating: reviewRating,
        workLifeBalance: reviewWorkLife,
        compensationRating: reviewComp,
        careerGrowth: reviewGrowth,
        managementRating: reviewMgmt,
        recommend: reviewRecommend,
        pros: reviewPros,
        cons: reviewCons,
        advice: reviewAdvice || undefined
      });
      setReviewSuccess('Đã gửi đánh giá thành công! Điểm số công ty đã được cập nhật.');
      setShowReviewForm(false);
      setReviewRole('');
      setReviewPros('');
      setReviewCons('');
      setReviewAdvice('');
      await loadProfile(profile.name);
    } catch (err: any) {
      setError(err?.message || 'Không thể gửi đánh giá.');
    } finally {
      setSubmittingReview(false);
    }
  }

  function formatCurrency(val: number, cur: string) {
    if (cur === 'USD') return `$${val.toLocaleString()}`;
    return `${(val / 1000000).toFixed(0)}M ₫`;
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card company-intelligence-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-title-group">
            <span className="badge badge-accent">Company Dossier & Intelligence</span>
            <h2 className="modal-title">Hồ Sơ Doanh Nghiệp & Đánh Giá Văn Hóa</h2>
          </div>
          <button type="button" className="btn-icon close-company-btn" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {reviewSuccess && <div className="alert alert-success">{reviewSuccess}</div>}

          {loading ? (
            <div className="loading-state">Đang tải hồ sơ doanh nghiệp & đối soát dữ liệu thị trường...</div>
          ) : !profile ? (
            <div className="empty-state">Không tìm thấy thông tin cho công ty "{companyName}".</div>
          ) : (
            <div className="company-dossier-content">
              <div className="company-hero-card">
                <div className="company-identity-row">
                  <div className="company-avatar-box">
                    {profile.logoUrl ? (
                      <img src={profile.logoUrl} alt={profile.name} className="company-logo-img" />
                    ) : (
                      <div className="company-avatar-placeholder">
                        {profile.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="company-info-block">
                    <h1 className="company-profile-name">{profile.name}</h1>
                    <div className="company-tags-row">
                      <span className="badge badge-secondary">{profile.industry}</span>
                      <span className="company-meta-item">👥 {profile.size}</span>
                      <span className="company-meta-item">📍 {profile.headquarters}</span>
                      {profile.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="company-website-link">
                          🌐 {profile.website.replace(/^https?:\/\//, '')}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="company-overall-rating-card">
                    <div className="rating-num-big company-overall-rating">{profile.cultureScores.overall.toFixed(1)}</div>
                    <div className="rating-stars-wrap">
                      {'★'.repeat(Math.round(profile.cultureScores.overall))}
                      {'☆'.repeat(5 - Math.round(profile.cultureScores.overall))}
                    </div>
                    <span className="rating-reviews-count">{profile.cultureScores.totalReviews} đánh giá</span>
                  </div>
                </div>

                <div className="culture-metrics-bar-grid">
                  <div className="metric-bar-item">
                    <div className="metric-header">
                      <span>Cân bằng WLB</span>
                      <strong className="score-worklife">{profile.cultureScores.workLife.toFixed(1)}/5</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(profile.cultureScores.workLife / 5) * 100}%` }} />
                    </div>
                  </div>

                  <div className="metric-bar-item">
                    <div className="metric-header">
                      <span>Thu nhập & Phúc lợi</span>
                      <strong className="score-compensation">{profile.cultureScores.compensation.toFixed(1)}/5</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(profile.cultureScores.compensation / 5) * 100}%` }} />
                    </div>
                  </div>

                  <div className="metric-bar-item">
                    <div className="metric-header">
                      <span>Cơ hội phát triển</span>
                      <strong className="score-growth">{profile.cultureScores.careerGrowth.toFixed(1)}/5</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(profile.cultureScores.careerGrowth / 5) * 100}%` }} />
                    </div>
                  </div>

                  <div className="metric-bar-item">
                    <div className="metric-header">
                      <span>Lãnh đạo & Quản lý</span>
                      <strong className="score-management">{profile.cultureScores.management.toFixed(1)}/5</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(profile.cultureScores.management / 5) * 100}%` }} />
                    </div>
                  </div>

                  <div className="metric-bar-item highlight">
                    <div className="metric-header">
                      <span>Khuyên bạn bè ứng tuyển</span>
                      <strong className="score-recommend">{profile.cultureScores.recommendRate}%</strong>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill recommend-fill" style={{ width: `${profile.cultureScores.recommendRate}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="tab-navigation">
                <button
                  type="button"
                  className={`tab-btn tab-culture ${activeTab === 'culture' ? 'active' : ''}`}
                  onClick={() => setActiveTab('culture')}
                >
                  Văn hóa & Công nghệ
                </button>
                <button
                  type="button"
                  className={`tab-btn tab-salaries ${activeTab === 'salaries' ? 'active' : ''}`}
                  onClick={() => setActiveTab('salaries')}
                >
                  Mặt bằng Lương ({profile.salaryBenchmarks.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn tab-interviews ${activeTab === 'interviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('interviews')}
                >
                  Câu hỏi Phỏng vấn ({profile.interviewQuestions.length})
                </button>
                <button
                  type="button"
                  className={`tab-btn tab-reviews ${activeTab === 'reviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('reviews')}
                >
                  Đánh giá ({profile.recentReviews.length})
                </button>
              </div>

              {activeTab === 'culture' && (
                <div className="tab-pane culture-pane">
                  <div className="overview-section">
                    <h3 className="section-title">Giới thiệu tổng quan</h3>
                    <p className="company-description-text">{profile.description}</p>
                  </div>

                  <div className="tech-stack-section">
                    <h3 className="section-title">Ngăn xếp Công nghệ Chính (Tech Stack)</h3>
                    <div className="tech-chips-wrap">
                      {profile.techStack.map((tech, i) => (
                        <span key={i} className="tech-badge-chip">{tech}</span>
                      ))}
                    </div>
                  </div>

                  <div className="signals-grid">
                    <div className="signals-card pros-signals">
                      <h4 className="signals-title text-success">✓ Điểm mạnh & Lợi thế nổi bật</h4>
                      <ul className="signals-list">
                        {profile.keyPros.map((pro, i) => (
                          <li key={i}>{pro}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="signals-card redflags-signals">
                      <h4 className="signals-title text-warning">⚠ Dấu hiệu cần lưu ý (Red Flags)</h4>
                      <ul className="signals-list">
                        {profile.keyRedFlags.map((flag, i) => (
                          <li key={i}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'salaries' && (
                <div className="tab-pane salaries-pane">
                  <div className="salaries-header-row">
                    <h3 className="section-title">Khảo sát & Phổ lương Tham chiếu theo Cấp bậc</h3>
                    <span className="muted-text">Dữ liệu tổng hợp từ cộng đồng & khảo sát thị trường</span>
                  </div>

                  <div className="salaries-table-wrap">
                    <table className="salaries-table">
                      <thead>
                        <tr>
                          <th>Vị trí</th>
                          <th>Cấp bậc</th>
                          <th>Phổ lương (Min ➔ Max)</th>
                          <th>Trung vị (Median)</th>
                          <th>Mẫu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.salaryBenchmarks.map((sal, i) => (
                          <tr key={i} className="salary-row">
                            <td className="font-semibold">{sal.role}</td>
                            <td>
                              <span className={`badge badge-level-${sal.level.toLowerCase()}`}>{sal.level}</span>
                            </td>
                            <td>
                              <div className="salary-range-cell">
                                <span className="range-text">
                                  {formatCurrency(sal.min, sal.currency)} - {formatCurrency(sal.max, sal.currency)}
                                </span>
                                <div className="salary-range-mini-bar">
                                  <div className="range-fill" />
                                </div>
                              </div>
                            </td>
                            <td className="font-bold text-accent">
                              {formatCurrency(sal.median, sal.currency)}
                            </td>
                            <td className="muted-text">{sal.sampleSize} báo cáo</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'interviews' && (
                <div className="tab-pane interviews-pane">
                  <div className="interviews-header-row">
                    <h3 className="section-title">Câu hỏi phỏng vấn thực tế & Kinh nghiệm thi tuyển</h3>
                    <span className="muted-text">Thu thập từ các ứng viên đã tham gia tuyển dụng</span>
                  </div>

                  <div className="interview-questions-list">
                    {profile.interviewQuestions.map(q => (
                      <div key={q.id} className="interview-question-card">
                        <div className="question-header">
                          <div className="question-tags">
                            <span className="badge badge-secondary question-category-tag">{q.category.toUpperCase()}</span>
                            <span className={`badge badge-diff-${q.difficulty} question-difficulty-tag`}>
                              Độ khó: {q.difficulty === 'hard' ? 'Khó' : q.difficulty === 'medium' ? 'Vừa' : 'Cơ bản'}
                            </span>
                            <span className="question-role-tag">{q.role}</span>
                          </div>
                        </div>

                        <p className="question-text">"{q.question}"</p>

                        {q.tips && q.tips.length > 0 && (
                          <div className="question-tips-box">
                            <strong>💡 Gợi ý trả lời & Lưu ý:</strong>
                            <ul>
                              {q.tips.map((t, idx) => (
                                <li key={idx}>{t}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="tab-pane reviews-pane">
                  <div className="reviews-action-bar">
                    <h3 className="section-title">Nhận xét của nhân viên & ứng viên</h3>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm toggle-review-form-btn"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                    >
                      {showReviewForm ? '✕ Đóng form' : '+ Viết đánh giá mới'}
                    </button>
                  </div>

                  {showReviewForm && (
                    <form className="add-review-form" onSubmit={handleSubmitReview}>
                      <h4 className="form-heading">Gửi đánh giá trải nghiệm tại {profile.name}</h4>

                      <div className="form-row">
                        <div className="field-group">
                          <label className="field-label">Vị trí từng đảm nhiệm / Ứng tuyển *</label>
                          <input
                            type="text"
                            required
                            className="text-input input-review-role"
                            placeholder="VD: Senior Frontend Engineer..."
                            value={reviewRole}
                            onChange={e => setReviewRole(e.target.value)}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Đánh giá chung (1-5 sao) *</label>
                          <select
                            className="select-input select-review-rating"
                            value={reviewRating}
                            onChange={e => setReviewRating(Number(e.target.value))}
                          >
                            <option value={5}>5 sao - Xuất sắc</option>
                            <option value={4}>4 sao - Rất tốt</option>
                            <option value={3}>3 sao - Khá / Ổn</option>
                            <option value={2}>2 sao - Cần cải thiện</option>
                            <option value={1}>1 sao - Kém</option>
                          </select>
                        </div>
                      </div>

                      <div className="ratings-sliders-grid">
                        <div className="field-group">
                          <label className="field-label">Work-Life Balance: {reviewWorkLife}/5</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={reviewWorkLife}
                            onChange={e => setReviewWorkLife(Number(e.target.value))}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Lương & Thưởng: {reviewComp}/5</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={reviewComp}
                            onChange={e => setReviewComp(Number(e.target.value))}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Cơ hội phát triển: {reviewGrowth}/5</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={reviewGrowth}
                            onChange={e => setReviewGrowth(Number(e.target.value))}
                          />
                        </div>

                        <div className="field-group">
                          <label className="field-label">Quản lý & Lãnh đạo: {reviewMgmt}/5</label>
                          <input
                            type="range"
                            min="1"
                            max="5"
                            value={reviewMgmt}
                            onChange={e => setReviewMgmt(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="field-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={reviewRecommend}
                            onChange={e => setReviewRecommend(e.target.checked)}
                          />
                          <span>Khuyên bạn bè ứng tuyển vào công ty này</span>
                        </label>
                      </div>

                      <div className="field-group">
                        <label className="field-label">Điểm mạnh / Trải nghiệm tích cực (Tối thiểu 10 ký tự) *</label>
                        <textarea
                          required
                          rows={2}
                          className="textarea-input input-review-pros"
                          placeholder="Những điều bạn thích nhất về môi trường, dự án, đồng nghiệp..."
                          value={reviewPros}
                          onChange={e => setReviewPros(e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label className="field-label">Điểm cần cải thiện / Khó khăn (Tối thiểu 10 ký tự) *</label>
                        <textarea
                          required
                          rows={2}
                          className="textarea-input input-review-cons"
                          placeholder="Những hạn chế, áp lực hoặc khâu cần tối ưu..."
                          value={reviewCons}
                          onChange={e => setReviewCons(e.target.value)}
                        />
                      </div>

                      <div className="field-group">
                        <label className="field-label">Lời khuyên dành cho ứng viên mới (Tùy chọn)</label>
                        <input
                          type="text"
                          className="text-input input-review-advice"
                          placeholder="Lời khuyên khi phỏng vấn hoặc hòa nhập văn hóa..."
                          value={reviewAdvice}
                          onChange={e => setReviewAdvice(e.target.value)}
                        />
                      </div>

                      <div className="form-actions">
                        <button
                          type="submit"
                          className="btn btn-primary submit-review-btn"
                          disabled={submittingReview}
                        >
                          {submittingReview ? 'Đang gửi...' : 'Đăng đánh giá'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="reviews-list">
                    {profile.recentReviews.map(rev => (
                      <div key={rev.id} className="review-card">
                        <div className="review-card-header">
                          <div className="review-meta">
                            <strong>{rev.role}</strong>
                            <span className="muted-text">• {new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                          <div className="review-rating-stars">
                            {'★'.repeat(rev.rating)}
                            {'☆'.repeat(5 - rev.rating)}
                          </div>
                        </div>

                        <div className="review-section">
                          <strong className="text-success">Ưu điểm:</strong>
                          <p>{rev.pros}</p>
                        </div>

                        <div className="review-section">
                          <strong className="text-warning">Nhược điểm:</strong>
                          <p>{rev.cons}</p>
                        </div>

                        {rev.advice && (
                          <div className="review-section">
                            <strong>Lời khuyên:</strong>
                            <p className="italic">{rev.advice}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {onSelectCompany && profile && (
            <button
              type="button"
              className="btn btn-secondary select-company-btn"
              onClick={() => onSelectCompany(profile.name)}
            >
              Chọn công ty này
            </button>
          )}
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
