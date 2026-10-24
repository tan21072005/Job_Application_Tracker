import { useState } from 'react';
import {
  Mail,
  Sparkles,
  Calendar,
  Building2,
  Briefcase,
  CheckCircle2,
  Video,
  User,
  ArrowRight,
  ExternalLink,
  AlertCircle,
  FileCheck,
  RotateCcw
} from 'lucide-react';
import type {
  EmailCategory,
  EmailIngestProposalDTO,
  EmailIngestApplyResultDTO
} from '@jobtrack/contract';
import { emailIngestRepository } from '../data';
import { Button, Dialog } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notify: (msg: string, error?: boolean) => void;
}

const EMAIL_PRESETS = [
  {
    label: 'Mời PV Shopee (Meet)',
    subject: 'Thư mời phỏng vấn kỹ thuật - Shopee',
    sender: 'recruitment@shopee.vn',
    content: `Chào bạn,
Phòng Tuyển dụng Shopee trân trọng gửi thư mời bạn tham gia vòng phỏng vấn chuyên môn cho vị trí Backend Developer.
Thời gian: 14:00 ngày 28/11/2026.
Phòng họp trực tuyến Google Meet: https://meet.google.com/abc-defg-hij
Người liên hệ: Chị Mai Phương (HR)
Email: phuong.mai@shopee.vn
SĐT: 0987112233
Vui lòng xác nhận sự tham dự trước 12:00 ngày 27/11/2026.`
  },
  {
    label: 'Thư Offer Tiki (45M)',
    subject: 'Official Job Offer - Tiki Corporation',
    sender: 'talent@tiki.vn',
    content: `Kính gửi bạn,
Thay mặt Tiki Corporation, chúng tôi rất vui mừng thông báo bạn đã trúng tuyển vị trí Senior React Engineer.
Đính kèm là thư mời nhận việc chính thức (Offer Letter).
Mức lương cơ bản: 45,000,000 VND gross / tháng cùng gói bảo hiểm sức khỏe cao cấp và 15 ngày phép/năm.
Thời gian bắt đầu làm việc dự kiến: 01/12/2026.
Vui lòng phản hồi trước 17:00 ngày 26/11/2026.`
  },
  {
    label: 'Từ chối FPT Software',
    subject: 'Thông báo kết quả ứng tuyển - FPT Software',
    sender: 'hr@fpt.com',
    content: `Chào bạn,
Cảm ơn bạn đã dành thời gian tham gia quy trình phỏng vấn vị trí DevOps Engineer tại FPT Software.
Sau khi cân nhắc kỹ lưỡng, chúng tôi rất tiếc phải thông báo hiện tại hồ sơ của bạn chưa phù hợp nhất với yêu cầu của dự án.
Chúng tôi xin phép lưu trữ hồ sơ của bạn trong hệ thống và sẽ chủ động liên hệ khi có cơ hội phù hợp hơn trong tương lai.
Chúc bạn luôn thành công trên con đường sự nghiệp.`
  },
  {
    label: 'Xác nhận hồ sơ Viettel',
    subject: 'Xác nhận tiếp nhận hồ sơ - Tập đoàn Viettel',
    sender: 'tuyendung@viettel.com.vn',
    content: `Kính gửi ứng viên,
Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel) xin thông báo đã nhận được hồ sơ ứng tuyển vị trí AI Engineer của bạn.
Hồ sơ của bạn đã được chuyển đến Hội đồng Tuyển dụng của Viettel AI Lab.
Bộ phận nhân sự sẽ liên hệ với bạn trong vòng 5 ngày làm việc nếu hồ sơ đáp ứng các tiêu chí vòng sơ loại.
Trân trọng cảm ơn sự quan tâm của bạn đối với Viettel.`
  }
];

export function EmailIngestModal({ isOpen, onClose, onSuccess, notify }: Props) {
  const [subject, setSubject] = useState(EMAIL_PRESETS[0].subject);
  const [sender, setSender] = useState(EMAIL_PRESETS[0].sender);
  const [emailContent, setEmailContent] = useState(EMAIL_PRESETS[0].content);
  const [parsing, setParsing] = useState(false);
  const [proposal, setProposal] = useState<EmailIngestProposalDTO | null>(null);
  const [applying, setApplying] = useState(false);

  if (!isOpen) return null;

  async function handleParse() {
    if (!emailContent.trim()) {
      notify('Vui lòng nhập nội dung email tuyển dụng.', true);
      return;
    }
    setParsing(true);
    try {
      const prop = await emailIngestRepository.parseEmail(emailContent, subject, sender);
      setProposal(prop);
      notify('Đã bóc tách thành công thông tin từ email.');
    } catch (err) {
      notify((err as Error).message || 'Không thể phân tích email.', true);
    } finally {
      setParsing(false);
    }
  }

  async function handleApply() {
    if (!proposal) return;
    setApplying(true);
    try {
      const res = await emailIngestRepository.applyProposal(proposal);
      notify(res.message);
      onSuccess();
      onClose();
    } catch (err) {
      notify((err as Error).message || 'Không thể áp dụng đề xuất.', true);
    } finally {
      setApplying(false);
    }
  }

  function applyPreset(p: typeof EMAIL_PRESETS[number]) {
    setSubject(p.subject);
    setSender(p.sender);
    setEmailContent(p.content);
    setProposal(null);
  }

  function getCategoryLabel(cat: EmailCategory): string {
    switch (cat) {
      case 'interview_invitation':
        return 'Thư mời phỏng vấn';
      case 'offer':
        return 'Thư mời nhận việc (Offer)';
      case 'rejection':
        return 'Thư từ chối';
      case 'application_ack':
        return 'Xác nhận nhận hồ sơ';
      case 'recruiter_outreach':
        return 'Lời mời kết nối cơ hội';
      case 'general':
      default:
        return 'Email tuyển dụng';
    }
  }

  function getActionLabel(action: EmailIngestProposalDTO['actionType']): string {
    switch (action) {
      case 'create_application':
        return 'Tạo mới hồ sơ ứng tuyển';
      case 'schedule_interview':
        return 'Tự động lên lịch phỏng vấn';
      case 'record_offer':
        return 'Ghi nhận kết quả Offer';
      case 'update_status':
      default:
        return 'Cập nhật trạng thái hồ sơ';
    }
  }

  return (
    <Dialog title="Hộp thư thông minh (Smart Email Ingestion)" onClose={onClose}>
      <div className="email-ingest-container">
        <div className="ingest-intro">
          <p>
            Dán nội dung email nhận được từ nhà tuyển dụng để AI tự động trích xuất công ty, chức danh, link họp Google Meet/Zoom, ngày giờ phỏng vấn và tự động cập nhật JobTrack.
          </p>
        </div>

        <div className="preset-selector-row">
          <span className="preset-label">Mẫu thử nhanh:</span>
          <div className="preset-buttons">
            {EMAIL_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                className="preset-btn"
                onClick={() => applyPreset(p)}
                disabled={parsing || applying}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="email-inputs-grid">
          <div className="form-group">
            <label htmlFor="email-subject-input">Tiêu đề email (tùy chọn):</label>
            <input
              id="email-subject-input"
              type="text"
              className="input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="VD: Thư mời phỏng vấn kỹ thuật - Shopee"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email-sender-input">Email người gửi (tùy chọn):</label>
            <input
              id="email-sender-input"
              type="text"
              className="input"
              value={sender}
              onChange={e => setSender(e.target.value)}
              placeholder="VD: recruitment@shopee.vn"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email-content-textarea">Nội dung thư tuyển dụng:</label>
          <textarea
            id="email-content-textarea"
            className="input email-content-area"
            rows={7}
            value={emailContent}
            onChange={e => {
              setEmailContent(e.target.value);
              setProposal(null);
            }}
            placeholder="Dán toàn bộ nội dung email nhận được tại đây..."
          />
        </div>

        <div className="parse-action-row">
          <Button
            kind="primary"
            onClick={handleParse}
            disabled={parsing || applying || !emailContent.trim()}
          >
            <Sparkles size={16} />
            <span>{parsing ? 'Đang bóc tách thực thể…' : 'Phân tích & Lập đề xuất'}</span>
          </Button>
        </div>

        {proposal && (
          <div className="ingest-proposal-card">
            <div className="proposal-header">
              <div className="proposal-title-box">
                <FileCheck size={20} className="text-blue-600" />
                <div>
                  <h4>{proposal.summary}</h4>
                  <span className="confidence-pill">
                    Độ tin cậy: {proposal.confidenceScore}%
                  </span>
                </div>
              </div>
              <span className={`action-badge ${proposal.actionType}`}>
                {getActionLabel(proposal.actionType)}
              </span>
            </div>

            <div className="extracted-entities-grid">
              <div className="entity-item">
                <Building2 size={16} />
                <div>
                  <small>Công ty</small>
                  <strong>{proposal.proposedApplication?.company || 'N/A'}</strong>
                </div>
              </div>

              <div className="entity-item">
                <Briefcase size={16} />
                <div>
                  <small>Vị trí</small>
                  <strong>{proposal.proposedApplication?.position || 'N/A'}</strong>
                </div>
              </div>

              <div className="entity-item">
                <CheckCircle2 size={16} />
                <div>
                  <small>Trạng thái</small>
                  <strong className="status-highlight">
                    {proposal.proposedApplication?.status}
                  </strong>
                </div>
              </div>

              {proposal.proposedInterview && (
                <div className="entity-item interview-highlight">
                  <Calendar size={16} />
                  <div>
                    <small>Lịch phỏng vấn</small>
                    <strong>
                      {new Date(proposal.proposedInterview.at).toLocaleString('vi-VN')} ({proposal.proposedInterview.format})
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {proposal.proposedInterview?.location && proposal.proposedInterview.location.startsWith('http') && (
              <div className="meeting-link-box">
                <Video size={16} />
                <span>Link họp:</span>
                <a
                  href={proposal.proposedInterview.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="meeting-url"
                >
                  {proposal.proposedInterview.location}
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

            <div className="changes-summary-box">
              <h5>Hành động sẽ thực hiện:</h5>
              <ul>
                {proposal.changesSummary.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="proposal-actions">
              <Button
                kind="secondary"
                onClick={() => setProposal(null)}
                disabled={applying}
              >
                Hủy đề xuất
              </Button>
              <Button
                kind="primary"
                onClick={handleApply}
                disabled={applying}
              >
                <ArrowRight size={16} />
                <span>{applying ? 'Đang áp dụng vào hệ thống…' : 'Áp dụng vào JobTrack ngay'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
