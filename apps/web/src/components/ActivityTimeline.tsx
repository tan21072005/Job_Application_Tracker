import { useMemo } from 'react';
import {
  Sparkles,
  Send,
  CalendarDays,
  ArrowRight,
  FileText,
  History,
  Clock3
} from 'lucide-react';
import { deriveActivityTimeline, type ActivityTimelineItemDTO } from '@jobtrack/contract';
import { formatDate, formatTime, type Application } from '../domain';

export default function ActivityTimeline({ app }: { app: Application }) {
  const events = useMemo(() => {
    return deriveActivityTimeline(app);
  }, [app]);

  function getIcon(type: ActivityTimelineItemDTO['type']) {
    switch (type) {
      case 'created':
        return <Sparkles size={16} className="timeline-icon-created" />;
      case 'applied':
        return <Send size={15} className="timeline-icon-applied" />;
      case 'interview':
        return <CalendarDays size={16} className="timeline-icon-interview" />;
      case 'status_changed':
        return <ArrowRight size={16} className="timeline-icon-status" />;
      case 'notes_updated':
        return <FileText size={15} className="timeline-icon-notes" />;
    }
  }

  function getBadgeClass(type: ActivityTimelineItemDTO['type']) {
    switch (type) {
      case 'created':
        return 'badge-created';
      case 'applied':
        return 'badge-applied';
      case 'interview':
        return 'badge-interview';
      case 'status_changed':
        return 'badge-status';
      case 'notes_updated':
        return 'badge-notes';
    }
  }

  return (
    <section className="activity-timeline-section" aria-label="Hành trình ứng tuyển">
      <div className="panel-heading">
        <h2>
          <History size={18} />
          <span>Hành trình ứng tuyển ({events.length})</span>
        </h2>
      </div>

      <div className="activity-timeline-list">
        {events.map((evt, idx) => (
          <article className="timeline-item" key={evt.id || idx}>
            <div className="timeline-marker">
              <span className={`timeline-icon-wrapper ${getBadgeClass(evt.type)}`}>
                {getIcon(evt.type)}
              </span>
              {idx < events.length - 1 && <span className="timeline-connector" />}
            </div>

            <div className="timeline-content">
              <header className="timeline-content-header">
                <h3>{evt.title}</h3>
                {evt.badge && (
                  <span className={`timeline-pill ${getBadgeClass(evt.type)}`}>
                    {evt.badge}
                  </span>
                )}
                <time className="timeline-time" dateTime={evt.timestamp}>
                  <Clock3 size={13} />
                  <span>{formatDate(evt.timestamp)} lúc {formatTime(evt.timestamp)}</span>
                </time>
              </header>

              {evt.description && (
                <p className="timeline-description">{evt.description}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
