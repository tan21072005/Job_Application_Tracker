import { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Clock3,
  Video,
  Building2,
  Phone,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  CalendarCheck,
  ChevronRight,
  ListTodo,
  FileText
} from 'lucide-react';
import type { InterviewAgendaItemDTO } from '@jobtrack/contract';
import type { Application } from '../domain';
import { formatDate, formatTime } from '../domain';
import { interviewsRepository } from '../data';
import { Button, Monogram, StatusBadge } from '../components/ui';

interface Props {
  apps: Application[];
  onOpen: (app: Application, tab?: 'info' | 'interviews' | 'ai') => void;
  notify: (message: string, isError?: boolean) => void;
}

function getCountdownBadge(at: string, status: string, now: number): { label: string; tone: 'today' | 'upcoming' | 'overdue' | 'done' } {
  if (status === 'Completed') {
    return { label: 'Đã hoàn thành ✓', tone: 'done' };
  }
  if (status === 'Cancelled') {
    return { label: 'Đã hủy', tone: 'done' };
  }

  const interviewTime = Date.parse(at);
  if (!Number.isFinite(interviewTime)) {
    return { label: 'Thời gian chưa rõ', tone: 'upcoming' };
  }

  const nowDate = new Date(now);
  const itemDate = new Date(interviewTime);
  const isToday = nowDate.toDateString() === itemDate.toDateString();

  if (isToday) {
    const diffHours = (interviewTime - now) / 3600000;
    if (diffHours < 0) {
      return { label: 'Hôm nay · Đã diễn ra', tone: 'today' };
    }
    return { label: `Hôm nay lúc ${formatTime(at)}`, tone: 'today' };
  }

  if (interviewTime < now) {
    return { label: 'Quá hạn · Cần cập nhật', tone: 'overdue' };
  }

  const diffDays = Math.ceil((interviewTime - now) / (86400000));
  if (diffDays <= 1) {
    return { label: 'Ngày mai', tone: 'upcoming' };
  }
  return { label: `Còn ${diffDays} ngày`, tone: 'upcoming' };
}

function parsePreparationTasks(preparation: string | null): string[] {
  if (!preparation || !preparation.trim()) return [];
  return preparation
    .split(/\r?\n|•|-/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

export default function InterviewsView({ apps, onOpen, notify }: Props) {
  const [agenda, setAgenda] = useState<InterviewAgendaItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'today' | 'overdue' | 'completed'>('all');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [prepChecks, setPrepChecks] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  async function loadAgenda() {
    setLoading(true);
    try {
      const items = await interviewsRepository.listAgenda();
      setAgenda(items);
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAgenda();
  }, [apps]);

  const stats = useMemo(() => {
    const nowDate = new Date(now);
    let upcoming = 0;
    let today = 0;
    let overdue = 0;
    let completed = 0;

    for (const item of agenda) {
      if (item.status === 'Completed') {
        completed++;
        continue;
      }
      if (item.status === 'Cancelled') continue;
      const t = Date.parse(item.at);
      const isToday = new Date(t).toDateString() === nowDate.toDateString();
      if (isToday) today++;
      if (t >= now) upcoming++;
      else overdue++;
    }

    return { total: agenda.length, upcoming, today, overdue, completed };
  }, [agenda, now]);

  const filteredAgenda = useMemo(() => {
    const nowDate = new Date(now);
    return agenda.filter(item => {
      if (formatFilter !== 'all' && item.format !== formatFilter) {
        return false;
      }

      if (statusFilter === 'all') return true;
      if (statusFilter === 'completed') return item.status === 'Completed';

      const t = Date.parse(item.at);
      const isToday = new Date(t).toDateString() === nowDate.toDateString();

      if (statusFilter === 'today') return item.status !== 'Completed' && isToday;
      if (statusFilter === 'upcoming') return item.status !== 'Completed' && t >= now;
      if (statusFilter === 'overdue') return item.status !== 'Completed' && t < now;
      return true;
    });
  }, [agenda, statusFilter, formatFilter, now]);

  async function handleToggleComplete(item: InterviewAgendaItemDTO) {
    try {
      const updated = await interviewsRepository.toggleComplete(item);
      setAgenda(prev => prev.map(a => (a.id === updated.id ? { ...a, status: updated.status } : a)));
      notify(updated.status === 'Completed' ? 'Đã hoàn thành vòng phỏng vấn!' : 'Đã khôi phục lại trạng thái lịch hẹn.');
    } catch (err) {
      notify((err as Error).message, true);
    }
  }

  async function handleExportIcs() {
    setExporting(true);
    try {
      const icsData = await interviewsRepository.exportIcs();
      const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'jobtrack-interviews.ics';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      notify('Đã tải file lịch jobtrack-interviews.ics về máy.');
    } catch (err) {
      notify((err as Error).message, true);
    } finally {
      setExporting(false);
    }
  }

  function togglePrepCheck(key: string) {
    setPrepChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function navigateToApp(applicationId: string) {
    const target = apps.find(a => a.id === applicationId);
    if (target) {
      onOpen(target, 'interviews');
    }
  }

  return (
    <div className="interviews-view">
      <header className="interviews-header">
        <div>
          <h1 className="interviews-title">Lịch phỏng vấn & Agenda</h1>
          <p className="interviews-subtitle">
            Theo dõi dòng thời gian phỏng vấn, nhiệm vụ chuẩn bị và đồng bộ Google / Apple Calendar.
          </p>
        </div>
        <div className="interviews-header-actions">
          <Button
            kind="secondary"
            onClick={() => void handleExportIcs()}
            disabled={exporting || agenda.length === 0}
            className="ics-export-btn"
          >
            <Download size={16} />
            <span>{exporting ? 'Đang tạo .ics…' : 'Xuất lịch .ics'}</span>
          </Button>
        </div>
      </header>

      <section className="interviews-stats-grid">
        <button
          className={`stat-card ${statusFilter === 'upcoming' ? 'stat-card-active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming')}
        >
          <div className="stat-card-header">
            <span className="stat-icon stat-icon-upcoming"><CalendarDays size={18} /></span>
            <span className="stat-label">Sắp tới</span>
          </div>
          <strong className="stat-value">{stats.upcoming}</strong>
        </button>

        <button
          className={`stat-card ${statusFilter === 'today' ? 'stat-card-active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'today' ? 'all' : 'today')}
        >
          <div className="stat-card-header">
            <span className="stat-icon stat-icon-today"><Clock3 size={18} /></span>
            <span className="stat-label">Hôm nay</span>
          </div>
          <strong className="stat-value">{stats.today}</strong>
        </button>

        <button
          className={`stat-card ${statusFilter === 'overdue' ? 'stat-card-active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')}
        >
          <div className="stat-card-header">
            <span className="stat-icon stat-icon-overdue"><Clock3 size={18} /></span>
            <span className="stat-label">Quá hạn</span>
          </div>
          <strong className="stat-value">{stats.overdue}</strong>
        </button>

        <button
          className={`stat-card ${statusFilter === 'completed' ? 'stat-card-active' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
        >
          <div className="stat-card-header">
            <span className="stat-icon stat-icon-done"><CalendarCheck size={18} /></span>
            <span className="stat-label">Đã hoàn thành</span>
          </div>
          <strong className="stat-value">{stats.completed}</strong>
        </button>
      </section>

      <div className="interviews-toolbar">
        <div className="filter-chips">
          <button
            className={`chip ${statusFilter === 'all' ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả ({agenda.length})
          </button>
          <button
            className={`chip ${statusFilter === 'upcoming' ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter('upcoming')}
          >
            Sắp tới ({stats.upcoming})
          </button>
          <button
            className={`chip ${statusFilter === 'today' ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter('today')}
          >
            Hôm nay ({stats.today})
          </button>
          <button
            className={`chip ${statusFilter === 'overdue' ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter('overdue')}
          >
            Quá hạn ({stats.overdue})
          </button>
          <button
            className={`chip ${statusFilter === 'completed' ? 'chip-active' : ''}`}
            onClick={() => setStatusFilter('completed')}
          >
            Đã xong ({stats.completed})
          </button>
        </div>

        <div className="format-filter-select">
          <select
            value={formatFilter}
            onChange={e => setFormatFilter(e.target.value)}
            className="select"
            aria-label="Lọc hình thức phỏng vấn"
          >
            <option value="all">Tất cả hình thức</option>
            <option value="Online">Online</option>
            <option value="On-site">Trực tiếp (On-site)</option>
            <option value="Phone">Điện thoại</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>Đang tải lịch phỏng vấn…</p>
        </div>
      ) : filteredAgenda.length === 0 ? (
        <div className="empty-agenda-state">
          <CalendarDays size={36} strokeWidth={1.5} />
          <h3>Không có lịch phỏng vấn nào</h3>
          <p>
            {statusFilter !== 'all' || formatFilter !== 'all'
              ? 'Không có vòng phỏng vấn nào khớp với bộ lọc hiện tại.'
              : 'Hãy thêm các vòng phỏng vấn vào từng hồ sơ ứng tuyển để quản lý tập trung tại đây.'}
          </p>
        </div>
      ) : (
        <div className="agenda-timeline">
          {filteredAgenda.map(item => {
            const badge = getCountdownBadge(item.at, item.status, now);
            const prepTasks = parsePreparationTasks(item.preparation);
            const isCompleted = item.status === 'Completed';

            return (
              <article
                key={item.id}
                className={`agenda-card ${isCompleted ? 'agenda-card-completed' : ''}`}
              >
                <div className="agenda-card-header">
                  <div className="agenda-company-meta">
                    <Monogram company={item.company} />
                    <div>
                      <button
                        className="agenda-company-link"
                        onClick={() => navigateToApp(item.applicationId)}
                      >
                        <strong>{item.position}</strong>
                        <span>{item.company}</span>
                      </button>
                    </div>
                  </div>

                  <div className="agenda-badges">
                    <span className={`countdown-badge countdown-badge-${badge.tone}`}>
                      {badge.label}
                    </span>
                    <span className="format-badge">
                      {item.format === 'Online' && <Video size={13} />}
                      {item.format === 'On-site' && <Building2 size={13} />}
                      {item.format === 'Phone' && <Phone size={13} />}
                      <span>{item.format}</span>
                    </span>
                  </div>
                </div>

                <div className="agenda-card-body">
                  <h3 className="agenda-round-title">{item.title}</h3>

                  <div className="agenda-time-row">
                    <Clock3 size={15} />
                    <span>
                      {formatDate(item.at)} lúc {formatTime(item.at, item.timezone)}
                    </span>
                    {item.timezone && (
                      <span className="agenda-timezone">({item.timezone})</span>
                    )}
                  </div>

                  {item.location && (
                    <div className="agenda-location-row">
                      {item.location.startsWith('http') ? (
                        <a
                          href={item.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="agenda-link-btn"
                        >
                          <ExternalLink size={14} />
                          <span>Mở phòng họp / Link trực tuyến</span>
                        </a>
                      ) : (
                        <span className="agenda-location-text">
                          <Building2 size={14} />
                          <span>{item.location}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {prepTasks.length > 0 && (
                    <div className="agenda-prep-section">
                      <div className="agenda-prep-header">
                        <ListTodo size={14} />
                        <span>Việc cần chuẩn bị ({prepTasks.length})</span>
                      </div>
                      <ul className="agenda-prep-list">
                        {prepTasks.map((task, idx) => {
                          const checkKey = `${item.id}-${idx}`;
                          const isChecked = Boolean(prepChecks[checkKey]);
                          return (
                            <li
                              key={checkKey}
                              className={`prep-task-item ${isChecked ? 'prep-task-checked' : ''}`}
                              onClick={() => togglePrepCheck(checkKey)}
                            >
                              <button
                                type="button"
                                className="prep-checkbox"
                                aria-label={`Đánh dấu việc: ${task}`}
                              >
                                {isChecked ? (
                                  <CheckCircle2 size={16} className="prep-checked-icon" />
                                ) : (
                                  <Circle size={16} />
                                )}
                              </button>
                              <span>{task}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {item.notes && (
                    <div className="agenda-notes-box">
                      <FileText size={14} />
                      <p>{item.notes}</p>
                    </div>
                  )}
                </div>

                <footer className="agenda-card-footer">
                  <Button
                    kind={isCompleted ? 'secondary' : 'primary'}
                    onClick={() => void handleToggleComplete(item)}
                    className="agenda-action-complete-btn"
                  >
                    {isCompleted ? (
                      <>
                        <Circle size={15} />
                        <span>Chuyển về chưa hoàn thành</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} />
                        <span>Đánh dấu hoàn thành</span>
                      </>
                    )}
                  </Button>

                  <Button
                    kind="ghost"
                    onClick={() => navigateToApp(item.applicationId)}
                    className="agenda-detail-btn"
                  >
                    <span>Xem hồ sơ ứng tuyển</span>
                    <ChevronRight size={15} />
                  </Button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
