import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Award, CalendarDays, ExternalLink, Pencil, Plus, Trash2, Sparkles, FileText } from 'lucide-react';
import { deviceTimezone, formatDate, formatTime, labels, statuses, type Application, type Interview, type Status } from '../domain';
import { Button, Empty, Monogram, StatusBadge } from '../components/ui';
import { interviewLabels } from '../components/forms';
import { Deadline } from './Dashboard';
import AiAssistantPanel from '../components/AiAssistantPanel';
import ActivityTimeline from '../components/ActivityTimeline';
import OfferEvaluationModal from '../components/OfferEvaluationModal';
import { ResumeTailorModal } from '../components/ResumeTailorModal';

export default function Detail({
  app,
  allOffers,
  tab,
  busy,
  onTab,
  onBack,
  onEdit,
  onAction,
  onInterview,
  onDelete,
  onDeleteInterview,
  onStatus,
  notify
}: {
  app: Application;
  allOffers?: Application[];
  tab: 'info' | 'interviews' | 'ai';
  busy: boolean;
  onTab: (tab: 'info' | 'interviews' | 'ai') => void;
  onBack: () => void;
  onEdit: () => void;
  onAction: () => void;
  onInterview: (round?: Interview) => void;
  onDelete: () => void;
  onDeleteInterview: (round: Interview) => void;
  onStatus: (status: Status) => void;
  notify?: (message: string, isError?: boolean) => void;
}) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showTailorModal, setShowTailorModal] = useState(false);
  const tabs: ('info' | 'interviews' | 'ai')[] = ['info', 'interviews', 'ai'];

  return (
    <>
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={16} />Hồ sơ ứng tuyển
      </button>

      <div className="detail-heading">
        <Monogram company={app.company} />
        <div>
          <h1>{app.position}</h1>
          <p>{app.company}{app.location ? ` · ${app.location}` : ''}{app.workMode ? ` · ${app.workMode}` : ''}</p>
        </div>
        <Button kind="secondary" className="tailor-resume-btn" onClick={() => setShowTailorModal(true)}>
          <FileText size={16} />May đo CV (ATS)
        </Button>
        <Button kind="secondary" onClick={onEdit}>
          <Pencil size={16} />Sửa hồ sơ
        </Button>
        <button className="icon-button danger-text" aria-label="Xóa hồ sơ" onClick={onDelete}>
          <Trash2 size={19} />
        </button>
      </div>

      <div className="detail-status">
        <StatusBadge status={app.status} />
        <label className="status-select">
          <span className="sr-only">Đổi trạng thái hồ sơ</span>
          <select aria-label="Đổi trạng thái hồ sơ" disabled={busy} value={app.status} onChange={event => onStatus(event.target.value as Status)}>
            {statuses.map(status => <option key={status} value={status}>{labels[status]}</option>)}
          </select>
        </label>
        <span>Đã tạo {formatDate(app.createdAt)}</span>
      </div>

      {app.status === 'Offer' && (
        <aside className="offer-celebration-banner" aria-label="Thư mời nhận việc">
          <div className="offer-celebration-content">
            <span className="offer-celebration-badge">
              <Sparkles size={18} />
              <strong>Chúc mừng! Bạn đã nhận được Thư mời nhận việc (Offer)</strong>
            </span>
            <p>Phân tích tổng thu nhập năm (TC), đánh giá phúc lợi, so sánh các cơ hội và tạo kịch bản đàm phán thù lao tối ưu với AI.</p>
          </div>
          <Button kind="primary" onClick={() => setShowOfferModal(true)}>
            <Award size={16} />Đánh giá Offer & Đàm phán
          </Button>
        </aside>
      )}

      <div
        className="detail-tabs"
        role="tablist"
        aria-label="Chi tiết hồ sơ"
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const currentIndex = tabs.indexOf(tab);
          let nextIndex = currentIndex;
          if (event.key === 'Home') nextIndex = 0;
          else if (event.key === 'End') nextIndex = tabs.length - 1;
          else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
          else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          const next = tabs[nextIndex];
          onTab(next);
          requestAnimationFrame(() => document.getElementById(`${next}-tab`)?.focus());
        }}
      >
        <button
          role="tab"
          id="info-tab"
          tabIndex={tab === 'info' ? 0 : -1}
          aria-selected={tab === 'info'}
          aria-controls="info-panel"
          onClick={() => onTab('info')}
        >
          Thông tin hồ sơ
        </button>
        <button
          role="tab"
          id="interviews-tab"
          tabIndex={tab === 'interviews' ? 0 : -1}
          aria-selected={tab === 'interviews'}
          aria-controls="interviews-panel"
          onClick={() => onTab('interviews')}
        >
          Phỏng vấn<span className="count">{app.interviews.length}</span>
        </button>
        <button
          role="tab"
          id="ai-tab"
          tabIndex={tab === 'ai' ? 0 : -1}
          aria-selected={tab === 'ai'}
          aria-controls="ai-panel"
          onClick={() => onTab('ai')}
        >
          <Sparkles size={14} />Trợ lý AI & ATS
        </button>
      </div>

      {tab === 'info' && (
        <div className="detail-grid" role="tabpanel" id="info-panel" aria-labelledby="info-tab">
          <div className="detail-main">
            <section className="information-panel">
              <h2>Thông tin cơ hội</h2>
              <dl>
                {[
                  ['Nguồn tuyển dụng', app.source || 'Chưa bổ sung'],
                  ['Mã tin tuyển dụng', app.jobCode || 'Chưa bổ sung'],
                  ['Ngày nộp', app.appliedAt ? formatDate(app.appliedAt) : 'Chưa nộp'],
                  ['Lương tham khảo', app.salary || 'Chưa bổ sung']
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
                <div>
                  <dt>Tin tuyển dụng</dt>
                  <dd>
                    {app.url ? (
                      <a href={app.url} target="_blank" rel="noreferrer">
                        Mở tin tuyển dụng<ExternalLink size={14} />
                      </a>
                    ) : (
                      'Chưa bổ sung'
                    )}
                  </dd>
                </div>
              </dl>
            </section>
            <section className="notes-panel">
              <div className="panel-heading">
                <h2>Ghi chú</h2>
                <button className="icon-button" aria-label="Sửa ghi chú" onClick={onEdit}>
                  <Pencil size={16} />
                </button>
              </div>
              <p>{app.notes || 'Chưa có ghi chú. Lưu những điều bạn muốn nhớ về cơ hội này.'}</p>
            </section>
            <ActivityTimeline app={app} />
          </div>
          <aside className="detail-aside">
            <section className="next-action-panel">
              <h2>Bước tiếp theo</h2>
              <h3>{app.nextAction || 'Bạn sẽ làm gì tiếp theo?'}</h3>
              {app.nextAction && <Deadline value={app.deadline} />}
              <Button kind="secondary" onClick={onAction}>
                {app.nextAction ? 'Thay / xóa hành động' : 'Thêm hành động'}
                <ArrowUpRight size={16} />
              </Button>
            </section>
            <button className="interviews-shortcut" onClick={() => onTab('interviews')}>
              <CalendarDays size={22} />
              <span>
                <strong>{app.interviews.length} vòng phỏng vấn</strong>
                <small>Xem lịch và nội dung chuẩn bị</small>
              </span>
              <ArrowUpRight size={19} />
            </button>
          </aside>
        </div>
      )}

      {tab === 'interviews' && (
        <section className="interviews-panel" role="tabpanel" id="interviews-panel" aria-labelledby="interviews-tab">
          <div className="panel-heading">
            <h2>Các vòng phỏng vấn</h2>
            <Button onClick={() => onInterview()}>
              <Plus size={17} />Thêm phỏng vấn
            </Button>
          </div>
          {app.interviews.length ? (
            [...app.interviews].sort((a, b) => b.at.localeCompare(a.at)).map(round => (
              <article className="interview-row" key={round.id}>
                <div className="round-date">
                  <CalendarDays size={21} />
                  <strong>{formatTime(round.at)}</strong>
                  <small>{deviceTimezone}</small>
                </div>
                <div className="round-content">
                  <div>
                    <h3>{round.title}</h3>
                    <span className={`round-status round-${round.status}`}>{interviewLabels[round.status]}</span>
                  </div>
                  <p>{round.format}{round.location ? ` · ${round.location}` : ''}</p>
                  <p className="original-time">Giờ thư mời: {formatTime(round.at, round.timezone)} · {round.timezone}</p>
                  {round.preparation && <p><strong>Chuẩn bị:</strong> {round.preparation}</p>}
                  {round.notes && <p><strong>Ghi chú:</strong> {round.notes}</p>}
                </div>
                <div className="round-actions">
                  <Button kind="secondary" onClick={() => onInterview(round)}>
                    <Pencil size={15} />Sửa / dời lịch
                  </Button>
                  <button className="icon-button danger-text" aria-label={`Xóa ${round.title}`} onClick={() => onDeleteInterview(round)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <Empty title="Chưa có vòng phỏng vấn" action={<Button onClick={() => onInterview()}>Thêm phỏng vấn đầu tiên</Button>}>
              Thêm ngày, giờ và múi giờ từ thư mời để theo dõi đúng thời điểm.
            </Empty>
          )}
        </section>
      )}

      {tab === 'ai' && (
        <AiAssistantPanel app={app} notify={notify} />
      )}

      {showOfferModal && (
        <OfferEvaluationModal
          application={app}
          allOffers={allOffers}
          onClose={() => setShowOfferModal(false)}
          notify={notify}
        />
      )}

      {showTailorModal && (
        <ResumeTailorModal
          isOpen={showTailorModal}
          company={app.company}
          position={app.position}
          jobDescription={app.notes || ''}
          onClose={() => setShowTailorModal(false)}
          onSavedVariant={(variant) => {
            if (notify) notify(`Đã lưu phiên bản CV "${variant.name}" thành công!`);
          }}
        />
      )}
    </>
  );
}
