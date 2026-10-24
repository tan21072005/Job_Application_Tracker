import type { ActivityTimelineItemDTO, ApplicationStatus } from './types.ts';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Saved: 'Đã lưu',
  Applied: 'Đã nộp',
  Screening: 'Sàng lọc',
  Interview: 'Phỏng vấn',
  Offer: 'Offer',
  Rejected: 'Từ chối',
  Withdrawn: 'Đã rút'
};

export function deriveActivityTimeline(app: {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt?: string | null;
  source?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  interviews?: Array<{
    id: string;
    title: string;
    at: string;
    format: string;
    location?: string | null;
    status: string;
    notes?: string | null;
  }>;
}): ActivityTimelineItemDTO[] {
  const events: ActivityTimelineItemDTO[] = [];

  events.push({
    id: `evt-created-${app.id}`,
    timestamp: app.createdAt,
    type: 'created',
    title: 'Khởi tạo hồ sơ ứng tuyển',
    description: `Tạo hồ sơ theo dõi vị trí ${app.position} tại ${app.company}`,
    badge: 'Khởi tạo'
  });

  if (app.appliedAt) {
    const ts = app.appliedAt.includes('T') ? app.appliedAt : `${app.appliedAt}T09:00:00Z`;
    events.push({
      id: `evt-applied-${app.id}`,
      timestamp: ts,
      type: 'applied',
      title: 'Đã nộp hồ sơ',
      description: app.source ? `Nộp qua kênh: ${app.source}` : 'Đã gửi hồ sơ ứng tuyển',
      badge: 'Đã nộp'
    });
  }

  if (Array.isArray(app.interviews)) {
    for (const round of app.interviews) {
      const parts = [round.format, round.location, round.notes].filter(Boolean);
      events.push({
        id: `evt-interview-${round.id}`,
        timestamp: round.at,
        type: 'interview',
        title: round.title,
        description: parts.join(' · ') || undefined,
        badge: round.status === 'Completed' ? 'Đã hoàn thành' : round.status === 'Cancelled' ? 'Đã hủy' : 'Lịch hẹn'
      });
    }
  }

  if (app.status !== 'Saved') {
    events.push({
      id: `evt-status-${app.id}`,
      timestamp: app.updatedAt || app.createdAt,
      type: 'status_changed',
      title: `Trạng thái: ${STATUS_LABELS[app.status] || app.status}`,
      description: app.nextAction ? `Hành động tiếp theo: ${app.nextAction}` : undefined,
      badge: app.status
    });
  }

  if (app.notes && app.notes.trim()) {
    const trimmed = app.notes.trim();
    events.push({
      id: `evt-notes-${app.id}`,
      timestamp: app.updatedAt || app.createdAt,
      type: 'notes_updated',
      title: 'Ghi chú cơ hội',
      description: trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed,
      badge: 'Ghi chú'
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return events;
}
