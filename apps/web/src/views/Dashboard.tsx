import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, Clock3, Plus, Globe } from 'lucide-react';
import { actionable, deviceTimezone, formatDate, formatTime, metrics, type Application } from '../domain';
import { demoMode } from '../data';
import { Button, Monogram, StatusBadge, TextLink } from '../components/ui';

type Props = { apps: Application[]; onAction: (app: Application) => void; onOpen: (app: Application, interviews?: boolean) => void; onAdd: () => void; onList: () => void; onImport?: () => void };

export function useDashboardClock(apps: Application[]): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    const current = Date.now();
    const boundaries: number[] = [];
    for (const app of apps) {
      if (app.deadline) {
        const t = Date.parse(app.deadline);
        if (t > current) boundaries.push(t);
      }
      for (const round of app.interviews) {
        if (round.status === 'Scheduled' && round.at) {
          const t = Date.parse(round.at);
          if (t > current) boundaries.push(t);
        }
      }
    }

    const minFuture = boundaries.length ? Math.min(...boundaries) : Infinity;
    const delayToBoundary = minFuture > current ? minFuture - current + 200 : Infinity;
    const timeoutMs = Math.min(Math.max(delayToBoundary, 1000), 60000);

    const timer = setTimeout(() => {
      setNow(Date.now());
    }, timeoutMs);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimeout(timer);
    };
  }, [apps, now]);

  return now;
}

export function Deadline({ value, now }: { value: string; now?: number }) {
  if (!value) return <span className="deadline">Chưa có deadline</span>;
  const current = now ? new Date(now) : new Date();
  const date = new Date(value);
  const today = date.toDateString() === current.toDateString();
  const overdue = date.getTime() < current.getTime();
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
  return <span className={`deadline ${overdue ? 'deadline-overdue' : today ? 'deadline-today' : ''}`}><Clock3 size={13} />{overdue ? 'Quá hạn · ' : today ? 'Hôm nay · ' : ''}{today ? time : formatDate(value)}</span>;
}

export function ApplicationRow({
  app,
  onOpen,
  now,
  selectable = false,
  selected = false,
  onToggleSelect
}: {
  app: Application;
  onOpen: (app: Application) => void;
  now?: number;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  return <div className={`application-row ${selectable ? 'has-checkbox' : ''} ${selected ? 'row-selected' : ''}`}>
    {selectable && (
      <label className="row-checkbox-label" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect?.()}
          aria-label={`Chọn hồ sơ ${app.position} tại ${app.company}`}
        />
      </label>
    )}
    <Monogram company={app.company} />
    <button className="application-name" onClick={() => onOpen(app)}><strong>{app.position}</strong><span>{app.company}{app.location ? ` · ${app.location}` : ''}</span></button>
    <StatusBadge status={app.status} />
    <div className="application-next"><span>{app.nextAction || 'Chưa đặt bước tiếp theo'}</span>{app.nextAction && <Deadline value={app.deadline} now={now} />}</div>
    <span className="application-date">{app.appliedAt ? formatDate(app.appliedAt) : 'Chưa nộp'}</span>
    <button className="icon-button row-open" aria-label={`Mở ${app.position} tại ${app.company}`} onClick={() => onOpen(app)}><ArrowUpRight size={18} /></button>
  </div>;
}

export default function Dashboard({ apps, onOpen, onAction, onAdd, onList, onImport }: Props) {
  const [showAll, setShowAll] = useState(false);
  const now = useDashboardClock(apps);
  const tasks = actionable(apps);
  const focus = tasks[0];
  const schedule = apps.flatMap(app => app.interviews.filter(round => round.status === 'Scheduled' && Date.parse(round.at) >= now).map(round => ({ app, round }))).sort((a, b) => a.round.at.localeCompare(b.round.at));
  const nearest = schedule[0];
  const m = metrics(apps, now);
  const recent = [...apps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
  const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(now));
  return <>
    <div className="page-heading">
      <div>
        <h1>Hôm nay của bạn</h1>
        <p>{demoMode ? 'Nhật Tân, ' : ''}mỗi cơ hội là một bước tiến.</p>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {onImport && (
          <Button kind="secondary" aria-label="Nhập từ link" onClick={onImport}>
            <Globe size={18} />
            <span>Nhập từ link</span>
          </Button>
        )}
        <Button aria-label="Thêm hồ sơ" onClick={onAdd}>
          <Plus size={18} />
          <span>Thêm hồ sơ</span>
        </Button>
      </div>
    </div>
    <div className="today-line"><span>{date}</span><span><span className="live-dot" />{tasks.length ? `${tasks.length} việc cần theo dõi` : 'Bạn đã sẵn sàng cho cơ hội mới'}</span></div>
    <div className="dashboard-priority">
      <section className="focus-panel" aria-labelledby="focus-title">
        <div className="panel-heading"><h2 id="focus-title">Việc cần xử lý</h2>{focus && <Deadline value={focus.deadline} now={now} />}</div>
        <h3>{focus?.nextAction || 'Bắt đầu với một cơ hội mới.'}</h3>
        <p>{focus ? `${focus.company} · ${focus.position}` : 'Lưu vị trí bạn quan tâm và đặt bước tiếp theo cho hành trình ứng tuyển.'}</p>
        <Button kind="secondary" onClick={() => focus ? onOpen(focus) : onAdd()}>{focus ? 'Mở hồ sơ' : 'Thêm hồ sơ đầu tiên'}<ArrowUpRight size={17} /></Button>{focus && <button className="focus-edit" onClick={() => onAction(focus)}>Cập nhật việc cần làm</button>}
        <span className="focus-decoration" aria-hidden="true"><ArrowUpRight /></span>
      </section>
      <section className="schedule-panel" aria-labelledby="schedule-title">
        <div className="panel-heading"><h2 id="schedule-title"><CalendarDays size={18} />Phỏng vấn sắp tới</h2>{nearest && <span className="scheduled-label">Đã lên lịch</span>}</div>
        {nearest ? <>
          <div className="schedule-main"><div className="date-tile"><span>Tháng {new Date(nearest.round.at).getMonth() + 1}</span><strong>{new Date(nearest.round.at).getDate()}</strong></div><div><h3>{nearest.round.title}</h3><p>{nearest.app.company} · {nearest.app.position}</p><strong className="schedule-time">{new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(nearest.round.at))}<span> · {nearest.round.format}</span></strong></div></div>
          <div className="schedule-bottom"><div><span>Giờ của bạn · {deviceTimezone}</span><small>{formatTime(nearest.round.at, nearest.round.timezone)} · {nearest.round.timezone}</small></div><button className="icon-button" aria-label={`Xem ${nearest.round.title}`} onClick={() => onOpen(nearest.app, true)}><ArrowUpRight size={20} /></button></div>
        </> : <div className="schedule-empty"><CalendarDays size={32} strokeWidth={1.3} /><h3>Chưa có lịch phỏng vấn sắp tới</h3><p>Lịch sẽ xuất hiện khi bạn thêm vòng phỏng vấn vào hồ sơ.</p><TextLink onClick={onList}>Xem hồ sơ</TextLink></div>}
      </section>
    </div>
    <section className="metric-strip" aria-label="Tổng quan ứng tuyển">
      {[[m.total, 'Tổng hồ sơ'], [m.upcoming, 'Phỏng vấn sắp tới'], [m.offers, 'Đang nhận offer'], [`${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(m.response)}%`, 'Tỷ lệ phản hồi']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
    </section>
    <div className="dashboard-secondary">
      <section className="recent-panel"><div className="panel-heading"><h2>Hồ sơ gần đây</h2><TextLink onClick={onList}>Xem tất cả</TextLink></div>{recent.length ? recent.map(app => <ApplicationRow key={app.id} app={app} onOpen={onOpen} now={now} />) : <p className="section-placeholder">Chưa có hồ sơ. Thêm cơ hội đầu tiên để bắt đầu.</p>}</section>
      <section className="next-panel"><div className="panel-heading"><h2>Bước tiếp theo</h2><span className="count">{Math.max(tasks.length - 1, 0)}</span></div>{tasks.length > 1 ? tasks.slice(1, showAll ? undefined : 4).map(app => <button className="task-row" key={app.id} onClick={() => onOpen(app)}><span className="task-indicator" /><span><strong>{app.nextAction}</strong><small>{app.company}</small><Deadline value={app.deadline} now={now} /></span><ArrowRight size={16} /></button>) : <p className="section-placeholder">Các bước tiếp theo sẽ xuất hiện khi bạn thêm hành động vào hồ sơ.</p>}{tasks.length > 4 && <button className="text-link" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Thu gọn' : `Xem tất cả ${tasks.length - 1} việc còn lại`}</button>}<p className="next-footnote">Từng việc nhỏ, một hành trình rõ ràng hơn.</p></section>
    </div>
  </>;
}
