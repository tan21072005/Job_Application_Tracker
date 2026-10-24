import React, { useState, useEffect } from 'react';
import {
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  X,
  History,
  MailCheck,
  Calendar
} from 'lucide-react';
import {
  type FollowUpCadenceStatusDTO,
  type FollowUpTemplateDTO,
  type FollowUpLogDTO,
  type GeneratedFollowUpDraftDTO,
  followUpRepository
} from '../data';
import type { Application } from '../domain';
import type { OutreachTone } from '@jobtrack/contract';

interface FollowUpSequencerModalProps {
  isOpen: boolean;
  app: Application;
  onClose: () => void;
  notify?: (message: string, isError?: boolean) => void;
}

const TONE_OPTIONS: { tone: OutreachTone; label: string; desc: string }[] = [
  { tone: 'polite_check_in', label: 'Hỏi thăm hồ sơ', desc: 'Sau 5-7 ngày nộp' },
  { tone: 'value_add', label: 'Bổ sung giá trị', desc: 'Gửi thêm dự án thực tế' },
  { tone: 'post_interview_thank_you', label: 'Thư cảm ơn', desc: 'Trong 24h sau phỏng vấn' },
  { tone: 'urgent_inquiry', label: 'Hỏi kết quả PV', desc: 'Sau 3-5 ngày phỏng vấn' },
  { tone: 'offer_follow_up', label: 'Trao đổi Offer', desc: 'Đàm phán hoặc xác nhận' }
];

export function FollowUpSequencerModal({
  isOpen,
  app,
  onClose,
  notify
}: FollowUpSequencerModalProps) {
  const [cadence, setCadence] = useState<FollowUpCadenceStatusDTO | null>(null);
  const [templates, setTemplates] = useState<FollowUpTemplateDTO[]>([]);
  const [logs, setLogs] = useState<FollowUpLogDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTone, setSelectedTone] = useState<OutreachTone>('polite_check_in');
  const [candidateName, setCandidateName] = useState<string>('Ứng viên');
  const [recruiterName, setRecruiterName] = useState<string>('');
  const [discussionHighlight, setDiscussionHighlight] = useState<string>('');
  const [interviewRound, setInterviewRound] = useState<string>('');

  const [currentDraft, setCurrentDraft] = useState<GeneratedFollowUpDraftDTO | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [generating, setGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const [showLogForm, setShowLogForm] = useState<boolean>(false);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [logNotes, setLogNotes] = useState<string>('');
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && app) {
      loadData();
      if (app.status === 'Interview') {
        setSelectedTone('post_interview_thank_you');
      } else if (app.status === 'Offer') {
        setSelectedTone('offer_follow_up');
      } else {
        setSelectedTone('polite_check_in');
      }
    }
  }, [isOpen, app]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await followUpRepository.getFollowUps(app.id);
      setCadence(res.cadence);
      setTemplates(res.templates);
      setLogs(res.logs);

      const initialDraft = await followUpRepository.generateDraft(app.id, {
        stage: app.status as any,
        tone: app.status === 'Interview' ? 'post_interview_thank_you' : app.status === 'Offer' ? 'offer_follow_up' : 'polite_check_in',
        candidateName: candidateName || 'Ứng viên',
        recruiterName: recruiterName || undefined
      });
      setCurrentDraft(initialDraft);
      setSubject(initialDraft.subject);
      setBody(initialDraft.body);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin follow-up.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate(toneToUse?: OutreachTone) {
    setGenerating(true);
    setError(null);
    const tone = toneToUse || selectedTone;
    try {
      const draft = await followUpRepository.generateDraft(app.id, {
        stage: app.status as any,
        tone,
        candidateName,
        recruiterName: recruiterName || undefined,
        interviewRound: interviewRound || undefined,
        discussionHighlight: discussionHighlight || undefined
      });
      setCurrentDraft(draft);
      setSubject(draft.subject);
      setBody(draft.body);
      if (notify) notify('Đã tạo bản nháp follow-up cá nhân hoá!');
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo bản nháp email.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!subject || !body) return;
    const fullText = `Tiêu đề: ${subject}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      if (notify) notify('Đã sao chép nội dung email vào clipboard!');
    } catch {
      setError('Không thể tự động sao chép. Vui lòng chọn và sao chép thủ công.');
    }
  }

  async function handleSaveLog(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError('Nội dung email không được để trống.');
      return;
    }
    setSubmittingLog(true);
    setError(null);
    try {
      await followUpRepository.createLog(app.id, {
        stage: app.status,
        tone: selectedTone,
        recipientEmail: recipientEmail || undefined,
        subject,
        body,
        notes: logNotes || undefined
      });

      if (notify) notify('Đã lưu nhật ký gửi email thành công!');
      setShowLogForm(false);
      setLogNotes('');
      setRecipientEmail('');
      const updated = await followUpRepository.getFollowUps(app.id);
      setCadence(updated.cadence);
      setLogs(updated.logs);
    } catch (err: any) {
      setError(err?.message || 'Không thể lưu nhật ký outreach.');
    } finally {
      setSubmittingLog(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card follow-up-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Điều phối Follow-up & Kết nối Tuyển dụng"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <span className="modal-icon-badge">
              <Send size={20} />
            </span>
            <div>
              <h2>Điều phối Follow-up & Kết nối Tuyển dụng</h2>
              <p className="modal-subtitle">
                {app.position} · {app.company}
              </p>
            </div>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-error-banner" role="alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {cadence && (
          <div className={`cadence-status-banner cadence-urgency-${cadence.urgency}`}>
            <div className="cadence-status-header">
              <div className="cadence-urgency-container">
                <span className={`urgency-badge badge-${cadence.urgency}`}>
                  {cadence.urgency === 'overdue' ? (
                    <>
                      <AlertTriangle size={14} /> Quá hạn liên hệ
                    </>
                  ) : cadence.urgency === 'due' ? (
                    <>
                      <Clock size={14} /> Cần gửi hôm nay
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} /> Đang theo lịch
                    </>
                  )}
                </span>
                <span className="days-counter">
                  Đã qua <strong>{cadence.daysSinceLastInteraction}</strong> ngày kể từ lần tương tác gần nhất
                </span>
              </div>
              <div className="cadence-target-info">
                <span>
                  <Calendar size={13} /> Khuyến nghị gửi sau: <strong>{cadence.recommendedWaitDays} ngày</strong> (Hạn: {cadence.dueDate})
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="follow-up-sequencer-body">
          <section className="sequencer-left-pane">
            <div className="sequencer-section">
              <label className="section-label">
                <Sparkles size={15} /> Mục tiêu & Giọng điệu thư
              </label>
              <div className="tone-pill-list" role="radiogroup" aria-label="Chọn giọng điệu email">
                {TONE_OPTIONS.map(opt => (
                  <button
                    key={opt.tone}
                    type="button"
                    role="radio"
                    aria-checked={selectedTone === opt.tone}
                    className={`tone-pill-btn ${selectedTone === opt.tone ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedTone(opt.tone);
                      handleGenerate(opt.tone);
                    }}
                  >
                    <span className="tone-pill-label">{opt.label}</span>
                    <span className="tone-pill-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sequencer-section sequencer-customization-form">
              <label className="section-label">Cá nhân hoá nội dung</label>
              <div className="form-group-row">
                <label className="input-label">
                  Tên của bạn:
                  <input
                    type="text"
                    className="input-text input-candidate-name"
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </label>
                <label className="input-label">
                  Người nhận / Recruiter:
                  <input
                    type="text"
                    className="input-text input-recruiter-name"
                    value={recruiterName}
                    onChange={e => setRecruiterName(e.target.value)}
                    placeholder="VD: Chị Mai / Ban Tuyển dụng"
                  />
                </label>
              </div>

              {app.status === 'Interview' && (
                <label className="input-label">
                  Vòng phỏng vấn:
                  <input
                    type="text"
                    className="input-text input-interview-round"
                    value={interviewRound}
                    onChange={e => setInterviewRound(e.target.value)}
                    placeholder="VD: Technical Round 2 / Trao đổi với CTO"
                  />
                </label>
              )}

              <label className="input-label">
                Điểm nhấn nổi bật / Thảo luận thêm:
                <input
                  type="text"
                  className="input-text input-discussion-highlight"
                  value={discussionHighlight}
                  onChange={e => setDiscussionHighlight(e.target.value)}
                  placeholder="VD: Dự án Microservices, tối ưu hoá React Query, link Portfolio..."
                />
              </label>

              <button
                type="button"
                className="btn btn-secondary generate-draft-btn"
                disabled={generating}
                onClick={() => handleGenerate()}
              >
                <Sparkles size={15} />
                {generating ? 'Đang tạo bản nháp...' : 'Tạo lại bản nháp với AI'}
              </button>
            </div>

            {currentDraft && currentDraft.keySuggestions.length > 0 && (
              <div className="sequencer-section suggestions-box">
                <label className="section-label">
                  <MailCheck size={15} /> Lưu ý vàng khi gửi
                </label>
                <ul className="follow-up-suggestions-list">
                  {currentDraft.keySuggestions.map((sug, idx) => (
                    <li key={idx}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="sequencer-right-pane">
            <div className="email-editor-container">
              <div className="editor-header">
                <span className="editor-label">Bản nháp Email</span>
                <div className="editor-header-actions">
                  <button
                    type="button"
                    className="btn btn-secondary copy-email-btn"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check size={14} /> Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Sao chép Email
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary log-outreach-toggle-btn"
                    onClick={() => setShowLogForm(!showLogForm)}
                  >
                    <MailCheck size={14} />
                    {showLogForm ? 'Đóng form ghi nhận' : 'Ghi nhận đã gửi'}
                  </button>
                </div>
              </div>

              {showLogForm && (
                <form className="log-outreach-form" onSubmit={handleSaveLog}>
                  <h4>Ghi nhận lịch sử Outreach</h4>
                  <div className="log-form-inputs">
                    <label className="input-label">
                      Email người nhận (nếu có):
                      <input
                        type="email"
                        className="input-text input-recipient-email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        placeholder="recruiter@company.com"
                      />
                    </label>
                    <label className="input-label">
                      Ghi chú thêm:
                      <input
                        type="text"
                        className="input-text input-log-notes"
                        value={logNotes}
                        onChange={e => setLogNotes(e.target.value)}
                        placeholder="VD: Đã gửi qua Gmail cá nhân lúc 9:00 sáng..."
                      />
                    </label>
                  </div>
                  <div className="log-form-actions">
                    <button
                      type="submit"
                      className="btn btn-primary log-sent-outreach-btn"
                      disabled={submittingLog}
                    >
                      {submittingLog ? 'Đang lưu...' : 'Lưu nhật ký & Cập nhật nhịp liên hệ'}
                    </button>
                  </div>
                </form>
              )}

              <div className="email-fields">
                <label className="field-group">
                  <span className="field-title">Tiêu đề:</span>
                  <input
                    type="text"
                    className="input-text follow-up-subject-input"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Tiêu đề thư..."
                  />
                </label>

                <label className="field-group body-group">
                  <span className="field-title">Nội dung thư:</span>
                  <textarea
                    rows={12}
                    className="textarea follow-up-body-textarea"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Nội dung thư follow-up..."
                  />
                </label>
              </div>
            </div>

            <div className="outreach-history-container">
              <div className="history-header">
                <span className="history-title">
                  <History size={15} /> Lịch sử đã gửi ({logs.length})
                </span>
              </div>
              {logs.length === 0 ? (
                <p className="empty-history-text">
                  Chưa có lần liên hệ nào được ghi nhận cho hồ sơ này.
                </p>
              ) : (
                <div className="follow-up-history-list">
                  {logs.map(log => (
                    <div key={log.id} className="follow-up-history-item">
                      <div className="history-item-top">
                        <span className="history-date">
                          {new Date(log.sentAt).toLocaleDateString('vi-VN')} {new Date(log.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="history-tone-tag">{log.tone}</span>
                      </div>
                      <div className="history-subject">{log.subject}</div>
                      {log.recipientEmail && (
                        <div className="history-recipient">Gửi tới: {log.recipientEmail}</div>
                      )}
                      {log.notes && (
                        <div className="history-notes">{log.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
