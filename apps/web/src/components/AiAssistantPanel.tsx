import { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  LoaderCircle,
  Info,
  FileText,
  Send
} from 'lucide-react';
import type { Application } from '../domain';
import { aiRepository } from '../data';
import type { AtsMatchResultDTO, CoverLetterResultDTO } from '@jobtrack/contract';
import { Button } from './ui';

export default function AiAssistantPanel({
  app,
  notify
}: {
  app: Application;
  notify?: (message: string, isError?: boolean) => void;
}) {
  const [atsResult, setAtsResult] = useState<AtsMatchResultDTO | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState('');

  const [letterResult, setLetterResult] = useState<CoverLetterResultDTO | null>(null);
  const [letterLoading, setLetterLoading] = useState(false);
  const [letterError, setLetterError] = useState('');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  const [copiedLetter, setCopiedLetter] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  async function handleAnalyzeAts() {
    setAtsLoading(true);
    setAtsError('');
    try {
      const res = await aiRepository.analyzeAtsMatch({
        company: app.company,
        position: app.position,
        notes: app.notes
      });
      setAtsResult(res);
    } catch (err) {
      const msg = (err as Error).message || 'Không thể phân tích độ phù hợp ATS.';
      setAtsError(msg);
      notify?.(msg, true);
    } finally {
      setAtsLoading(false);
    }
  }

  async function handleGenerateCoverLetter(lang = language) {
    setLetterLoading(true);
    setLetterError('');
    try {
      const res = await aiRepository.generateCoverLetter({
        company: app.company,
        position: app.position,
        notes: app.notes,
        language: lang
      });
      setLetterResult(res);
    } catch (err) {
      const msg = (err as Error).message || 'Không thể tạo thư ứng tuyển.';
      setLetterError(msg);
      notify?.(msg, true);
    } finally {
      setLetterLoading(false);
    }
  }

  async function copyToClipboard(text: string, type: 'letter' | 'pitch') {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'letter') {
        setCopiedLetter(true);
        setTimeout(() => setCopiedLetter(false), 2000);
      } else {
        setCopiedPitch(true);
        setTimeout(() => setCopiedPitch(false), 2000);
      }
      notify?.('Đã sao chép nội dung vào khay nhớ tạm.');
    } catch {
      notify?.('Không thể tự động sao chép. Hãy chọn văn bản và nhấn Ctrl+C.', true);
    }
  }

  function getScoreColorClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 65) return 'score-good';
    if (score >= 50) return 'score-fair';
    return 'score-low';
  }

  return (
    <div className="ai-assistant-container" role="tabpanel" id="ai-panel" aria-labelledby="ai-tab">
      <div className="ai-header-banner">
        <div className="ai-header-icon">
          <Sparkles size={24} />
        </div>
        <div>
          <h2>Trợ lý AI & ATS Thông minh</h2>
          <p>
            Tự động đối chiếu kỹ năng trong hồ sơ ứng viên với yêu cầu của vị trí <strong>{app.position}</strong> tại <strong>{app.company}</strong>, đề xuất chiến lược tối ưu và soạn thảo thư ứng tuyển chuyên nghiệp.
          </p>
        </div>
      </div>

      <div className="ai-assistant-grid">
        <section className="ai-card ats-analyzer-card">
          <div className="ai-card-header">
            <div>
              <h3>Phân tích Độ phù hợp ATS</h3>
              <p>Đối chiếu từ khóa kỹ năng giữa CV và mô tả công việc</p>
            </div>
            {atsResult && (
              <Button kind="ghost" disabled={atsLoading} onClick={handleAnalyzeAts}>
                <RefreshCw size={14} className={atsLoading ? 'spin' : ''} />
                Phân tích lại
              </Button>
            )}
          </div>

          {!atsResult && !atsLoading && (
            <div className="ai-cta-placeholder">
              <p>
                Hệ thống sẽ quét các kỹ năng công nghệ trong hồ sơ cá nhân của bạn, so khớp với tiêu chuẩn tuyển dụng và tính toán tỷ lệ tương thích.
              </p>
              {atsError && <p className="ai-error-text">{atsError}</p>}
              <Button onClick={handleAnalyzeAts}>
                <Sparkles size={16} />
                Chạy phân tích ATS ngay
              </Button>
            </div>
          )}

          {atsLoading && (
            <div className="ai-loading-box">
              <LoaderCircle size={28} className="spin" />
              <p>Đang phân tích từ khóa và tính điểm tương thích ATS...</p>
            </div>
          )}

          {atsResult && !atsLoading && (
            <div className="ats-results-view">
              <div className="ats-score-row">
                <div className={`ats-score-badge ${getScoreColorClass(atsResult.score)}`}>
                  <span className="ats-score-number">{atsResult.score}</span>
                  <span className="ats-score-unit">/100</span>
                </div>
                <div className="ats-fit-summary">
                  <h4>Đánh giá: <span className="ats-fit-label">{atsResult.overallFit}</span></h4>
                  <p>
                    Khớp {atsResult.matchedSkills.length} trên tổng số {atsResult.matchedSkills.length + atsResult.missingSkills.length} kỹ năng quan trọng được nhận diện từ JD.
                  </p>
                </div>
              </div>

              <div className="ats-skills-breakdown">
                <div className="skills-column">
                  <h5>
                    <CheckCircle2 size={16} className="text-success" />
                    Kỹ năng đã có ({atsResult.matchedSkills.length})
                  </h5>
                  <div className="skills-tags">
                    {atsResult.matchedSkills.length > 0 ? (
                      atsResult.matchedSkills.map(skill => (
                        <span key={skill} className="skill-chip skill-chip-matched">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="skill-chip-empty">Chưa tìm thấy kỹ năng khớp trực tiếp trong hồ sơ</span>
                    )}
                  </div>
                </div>

                <div className="skills-column">
                  <h5>
                    <AlertTriangle size={16} className="text-warning" />
                    Kỹ năng cần bổ sung ({atsResult.missingSkills.length})
                  </h5>
                  <div className="skills-tags">
                    {atsResult.missingSkills.length > 0 ? (
                      atsResult.missingSkills.map(skill => (
                        <span key={skill} className="skill-chip skill-chip-missing">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="skill-chip-empty">Hồ sơ đã bao phủ đầy đủ các kỹ năng cốt lõi</span>
                    )}
                  </div>
                </div>
              </div>

              {atsResult.recommendations.length > 0 && (
                <div className="ats-recommendations-box">
                  <h5>Khuyến nghị tối ưu hồ sơ</h5>
                  <ul>
                    {atsResult.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="ai-disclaimer">
                <Info size={14} />
                <span>
                  Điểm ATS mang tính chất tham khảo dựa trên đối chiếu từ khóa giữa JD và Hồ sơ ứng viên, không thay thế cho quyết định tuyển dụng thực tế.
                </span>
              </div>
            </div>
          )}
        </section>

        <section className="ai-card cover-letter-card">
          <div className="ai-card-header">
            <div>
              <h3>Thư ứng tuyển may đo (Cover Letter)</h3>
              <p>Tạo thư trang trọng và tin nhắn ngắn gửi trực tiếp cho Nhà tuyển dụng</p>
            </div>
            <div className="lang-toggle-group">
              <button
                type="button"
                className={`lang-btn ${language === 'vi' ? 'active' : ''}`}
                onClick={() => {
                  setLanguage('vi');
                  if (letterResult) void handleGenerateCoverLetter('vi');
                }}
              >
                Tiếng Việt
              </button>
              <button
                type="button"
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => {
                  setLanguage('en');
                  if (letterResult) void handleGenerateCoverLetter('en');
                }}
              >
                English
              </button>
            </div>
          </div>

          {!letterResult && !letterLoading && (
            <div className="ai-cta-placeholder">
              <p>
                Sử dụng thông tin liên hệ, kỹ năng nổi bật và kinh nghiệm từ hồ sơ cá nhân của bạn để tạo ra một bức thư ứng tuyển chỉn chu, phù hợp với văn hóa của <strong>{app.company}</strong>.
              </p>
              {letterError && <p className="ai-error-text">{letterError}</p>}
              <Button onClick={() => void handleGenerateCoverLetter(language)}>
                <FileText size={16} />
                Soạn thư ứng tuyển ngay
              </Button>
            </div>
          )}

          {letterLoading && (
            <div className="ai-loading-box">
              <LoaderCircle size={28} className="spin" />
              <p>Đang tổng hợp thông tin và viết thư ứng tuyển may đo...</p>
            </div>
          )}

          {letterResult && !letterLoading && (
            <div className="cover-letter-view">
              {letterResult.highlights && letterResult.highlights.length > 0 && (
                <div className="letter-highlights">
                  {letterResult.highlights.map((h, i) => (
                    <span key={i} className="letter-highlight-chip">
                      <Sparkles size={12} />
                      {h}
                    </span>
                  ))}
                </div>
              )}

              <div className="letter-section">
                <div className="letter-section-header">
                  <h4>Thư xin việc hoàn chỉnh</h4>
                  <Button
                    kind="secondary"
                    className="copy-btn"
                    onClick={() => void copyToClipboard(letterResult.coverLetter, 'letter')}
                  >
                    {copiedLetter ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    {copiedLetter ? 'Đã sao chép' : 'Sao chép thư'}
                  </Button>
                </div>
                <div className="letter-content-box">
                  <pre>{letterResult.coverLetter}</pre>
                </div>
              </div>

              <div className="pitch-section">
                <div className="letter-section-header">
                  <h4>
                    <Send size={15} />
                    Tin nhắn ngắn gửi HR (LinkedIn / Email Outreach)
                  </h4>
                  <Button
                    kind="secondary"
                    className="copy-btn"
                    onClick={() => void copyToClipboard(letterResult.shortPitch, 'pitch')}
                  >
                    {copiedPitch ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                    {copiedPitch ? 'Đã sao chép' : 'Sao chép tin nhắn'}
                  </Button>
                </div>
                <div className="pitch-content-box">
                  <p>{letterResult.shortPitch}</p>
                </div>
              </div>

              <div className="ai-card-footer-actions">
                <Button kind="ghost" disabled={letterLoading} onClick={() => void handleGenerateCoverLetter(language)}>
                  <RefreshCw size={14} className={letterLoading ? 'spin' : ''} />
                  Tạo phiên bản khác
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
