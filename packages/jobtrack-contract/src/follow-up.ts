import type { ApplicationStatus } from './types.js';
import type { ValidationResult } from './validators.js';

export type OutreachTone =
  | 'polite_check_in'
  | 'value_add'
  | 'urgent_inquiry'
  | 'post_interview_thank_you'
  | 'offer_follow_up';

export interface FollowUpTemplateDTO {
  id: string;
  stage: ApplicationStatus;
  tone: OutreachTone;
  name: string;
  recommendedWaitDays: number;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface FollowUpLogDTO {
  id: string;
  applicationId: string;
  userId?: string;
  stage: ApplicationStatus;
  tone: OutreachTone;
  sentAt: string;
  recipientEmail?: string;
  subject: string;
  body: string;
  notes?: string;
  createdAt?: string;
}

export interface FollowUpCadenceStatusDTO {
  applicationId: string;
  stage: ApplicationStatus;
  daysSinceLastInteraction: number;
  recommendedWaitDays: number;
  dueDate: string;
  isDue: boolean;
  isOverdue: boolean;
  urgency: 'scheduled' | 'due' | 'overdue';
}

export interface GenerateFollowUpInput {
  company: string;
  position: string;
  stage: ApplicationStatus;
  tone: OutreachTone;
  candidateName?: string;
  recruiterName?: string;
  interviewRound?: string;
  discussionHighlight?: string;
  additionalNotes?: string;
}

export interface GeneratedFollowUpDraftDTO {
  subject: string;
  body: string;
  recommendedWaitDays: number;
  keySuggestions: string[];
}

export const DEFAULT_FOLLOW_UP_TEMPLATES: FollowUpTemplateDTO[] = [
  {
    id: 'tpl-applied-checkin',
    stage: 'Applied',
    tone: 'polite_check_in',
    name: 'Thăm dò tiến độ sau khi nộp hồ sơ (5-7 ngày)',
    recommendedWaitDays: 5,
    subjectTemplate: 'Thăm dò tiến độ hồ sơ ứng tuyển vị trí {{position}} - {{candidateName}}',
    bodyTemplate:
      'Kính gửi {{recruiterName}},\n\n' +
      'Tôi là {{candidateName}}. Vào ngày {{appliedDate}}, tôi đã nộp hồ sơ ứng tuyển vị trí {{position}} tại {{company}}.\n\n' +
      'Tôi rất hào hứng với cơ hội được đóng góp vào các dự án công nghệ của quý công ty. Tôi xin phép gửi email này để hỏi thăm tiến độ xét duyệt hồ sơ của mình.\n\n' +
      'Nếu quý công ty cần bổ sung thêm tài liệu hoặc thông tin về kinh nghiệm của tôi, tôi rất sẵn lòng cung cấp.\n\n' +
      'Xin chân thành cảm ơn và chúc {{recruiterName}} một tuần làm việc hiệu quả.\n\n' +
      'Trân trọng,\n{{candidateName}}'
  },
  {
    id: 'tpl-applied-value-add',
    stage: 'Applied',
    tone: 'value_add',
    name: 'Bổ sung sản phẩm / dự án nổi bật (Value-Add)',
    recommendedWaitDays: 7,
    subjectTemplate: 'Bổ sung dự án thực tế liên quan đến vị trí {{position}} tại {{company}} - {{candidateName}}',
    bodyTemplate:
      'Kính gửi {{recruiterName}},\n\n' +
      'Tôi là {{candidateName}}. Vừa qua tôi đã gửi hồ sơ ứng tuyển cho vị trí {{position}} tại {{company}}.\n\n' +
      'Gần đây tôi vừa hoàn thiện một dự án liên quan trực tiếp đến định hướng kỹ thuật của quý công ty ({{discussionHighlight}}). Tôi tin rằng kinh nghiệm giải quyết bài toán này sẽ mang lại giá trị thiết thực cho đội ngũ của {{company}}.\n\n' +
      'Tôi rất mong có dịp được trao đổi trực tiếp hơn với quý công ty trong buổi phỏng vấn sắp tới.\n\n' +
      'Trân trọng,\n{{candidateName}}'
  },
  {
    id: 'tpl-interview-thank-you',
    stage: 'Interview',
    tone: 'post_interview_thank_you',
    name: 'Thư cảm ơn sau buổi phỏng vấn (Trong 24 giờ)',
    recommendedWaitDays: 1,
    subjectTemplate: 'Thư cảm ơn buổi phỏng vấn vị trí {{position}} tại {{company}} - {{candidateName}}',
    bodyTemplate:
      'Kính gửi {{recruiterName}},\n\n' +
      'Tôi xin chân thành cảm ơn {{recruiterName}} và ban tuyển dụng {{company}} đã dành thời gian trao đổi với tôi về vị trí {{position}} trong buổi phỏng vấn hôm nay.\n\n' +
      'Tôi rất ấn tượng với chia sẻ của anh/chị về {{discussionHighlight}}. Buổi trò chuyện càng củng cố niềm tin của tôi rằng kinh nghiệm và kỹ năng của tôi hoàn toàn phù hợp để đồng hành cùng các mục tiêu phát triển của công ty.\n\n' +
      'Tôi rất mong chờ bước phản hồi tiếp theo từ phía {{company}}.\n\n' +
      'Trân trọng chúc {{recruiterName}} nhiều sức khỏe và thành công,\n{{candidateName}}'
  },
  {
    id: 'tpl-interview-follow-up',
    stage: 'Interview',
    tone: 'polite_check_in',
    name: 'Hỏi thăm kết quả vòng phỏng vấn (Sau 4-5 ngày)',
    recommendedWaitDays: 4,
    subjectTemplate: 'Hỏi thăm kết quả buổi phỏng vấn vòng {{interviewRound}} - Vị trí {{position}} - {{candidateName}}',
    bodyTemplate:
      'Kính gửi {{recruiterName}},\n\n' +
      'Tôi xin phép gửi email để hỏi thăm tình hình đánh giá kết quả buổi phỏng vấn vòng {{interviewRound}} cho vị trí {{position}} vừa qua.\n\n' +
      'Tôi vẫn rất quan tâm và mong muốn được trở thành một phần trong đội ngũ phát triển của {{company}}. Nếu cần trao đổi thêm bất kỳ thông tin nào, tôi luôn sẵn sàng kết nối.\n\n' +
      'Cảm ơn {{recruiterName}} rất nhiều!\n\n' +
      'Trân trọng,\n{{candidateName}}'
  },
  {
    id: 'tpl-offer-follow-up',
    stage: 'Offer',
    tone: 'offer_follow_up',
    name: 'Trao đổi & xác nhận đề nghị công việc (Offer Follow-up)',
    recommendedWaitDays: 2,
    subjectTemplate: 'Trao đổi về Thư mời nhận việc (Offer Letter) - Vị trí {{position}} - {{candidateName}}',
    bodyTemplate:
      'Kính gửi {{recruiterName}},\n\n' +
      'Tôi xin cảm ơn {{company}} đã tin tưởng và gửi Thư mời nhận việc cho vị trí {{position}}.\n\n' +
      'Tôi đang cân nhắc các điều khoản chi tiết và rất hào hứng với cơ hội hợp tác. {{additionalNotes}}\n\n' +
      'Tôi hy vọng có thể trao đổi ngắn với anh/chị qua điện thoại hoặc email để làm rõ một số điểm trước khi đưa ra quyết định chính thức.\n\n' +
      'Trân trọng,\n{{candidateName}}'
  }
];

export const FOLLOW_UP_CADENCE: Readonly<Record<ApplicationStatus, number | null>> = Object.freeze({
  Saved: 7,
  Applied: 5,
  Screening: 4,
  Interview: 3,
  Offer: 2,
  Rejected: null,
  Withdrawn: null
});

export const FOLLOW_UP_OVERDUE_EXTRA_DAYS = 2;

export function stageFollowUpWaitDays(stage: ApplicationStatus): number | null {
  return FOLLOW_UP_CADENCE[stage] ?? null;
}

export function calculateFollowUpCadence(
  applicationId: string,
  stage: ApplicationStatus,
  lastInteractionDate: string | Date,
  customWaitDays?: number,
  now: Date = new Date()
): FollowUpCadenceStatusDTO | null {
  const baseWait = customWaitDays && customWaitDays >= 1 ? customWaitDays : stageFollowUpWaitDays(stage);
  if (baseWait === null) return null;

  const lastTime = new Date(lastInteractionDate).getTime();
  if (!Number.isFinite(lastTime)) return null;

  const nowMs = now.getTime();
  const diffDays = Math.max(0, Math.floor((nowMs - lastTime) / (1000 * 60 * 60 * 24)));

  const waitDays = baseWait;

  const dueTimestamp = lastTime + waitDays * 24 * 60 * 60 * 1000;
  const dueDate = new Date(dueTimestamp).toISOString().split('T')[0];
  const isDue = diffDays >= waitDays;
  const isOverdue = diffDays >= waitDays + FOLLOW_UP_OVERDUE_EXTRA_DAYS;

  const urgency: 'scheduled' | 'due' | 'overdue' = isOverdue
    ? 'overdue'
    : isDue
    ? 'due'
    : 'scheduled';

  return {
    applicationId,
    stage,
    daysSinceLastInteraction: diffDays,
    recommendedWaitDays: waitDays,
    dueDate,
    isDue,
    isOverdue,
    urgency
  };
}

export function generateFollowUpEmail(input: GenerateFollowUpInput): GeneratedFollowUpDraftDTO {
  const stage = input.stage || 'Applied';
  const tone = input.tone || 'polite_check_in';

  let template = DEFAULT_FOLLOW_UP_TEMPLATES.find(
    t => t.stage === stage && t.tone === tone
  );

  if (!template) {
    template = DEFAULT_FOLLOW_UP_TEMPLATES.find(t => t.stage === stage) || DEFAULT_FOLLOW_UP_TEMPLATES[0];
  }

  const vars: Record<string, string> = {
    company: input.company || 'quý công ty',
    position: input.position || 'vị trí ứng tuyển',
    candidateName: input.candidateName || 'Ứng viên',
    recruiterName: input.recruiterName || 'Bộ phận Tuyển dụng ' + (input.company || ''),
    appliedDate: 'vừa qua',
    interviewRound: input.interviewRound || 'Kỹ thuật',
    discussionHighlight: input.discussionHighlight || 'định hướng phát triển sản phẩm',
    additionalNotes: input.additionalNotes || 'Tôi có một số thắc mắc về kế hoạch onboarding và thời điểm bắt đầu.'
  };

  let subject = template.subjectTemplate;
  let body = template.bodyTemplate;

  for (const [k, v] of Object.entries(vars)) {
    subject = subject.replaceAll(`{{${k}}}`, v);
    body = body.replaceAll(`{{${k}}}`, v);
  }

  const suggestions: string[] = [
    'Gửi email vào các khung giờ vàng (8:30 - 9:30 sáng hoặc 13:30 - 14:00 chiều các ngày Thứ Ba đến Thứ Năm).',
    'Giữ email ngắn gọn dưới 150 từ để người phụ trách tuyển dụng dễ nắm bắt và phản hồi nhanh trên thiết bị di động.',
    'Luôn kiểm tra lại tên nhà tuyển dụng và tên công ty trước khi bấm gửi.'
  ];

  if (stage === 'Interview') {
    suggestions.unshift('Gửi thư cảm ơn trong vòng 24 giờ sau khi phỏng vấn để tạo ấn tượng về sự chuyên nghiệp và nhiệt huyết.');
  }

  return {
    subject,
    body,
    recommendedWaitDays: template.recommendedWaitDays,
    keySuggestions: suggestions
  };
}

export function validateFollowUpLogInput(raw: unknown): {
  ok: boolean;
  data: Omit<FollowUpLogDTO, 'id' | 'createdAt'>;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      data: {
        applicationId: '',
        stage: 'Applied',
        tone: 'polite_check_in',
        sentAt: new Date().toISOString(),
        subject: '',
        body: ''
      },
      message: 'Dữ liệu nhật ký gửi follow-up không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const applicationId = typeof b.applicationId === 'string' ? b.applicationId.trim() : '';
  if (!applicationId) {
    errors.applicationId = 'Mã hồ sơ ứng tuyển (applicationId) là bắt buộc.';
  }

  const stage = (typeof b.stage === 'string' ? b.stage : 'Applied') as ApplicationStatus;
  const tone = (typeof b.tone === 'string' ? b.tone : 'polite_check_in') as OutreachTone;

  const subject = typeof b.subject === 'string' ? b.subject.trim() : '';
  if (!subject) {
    errors.subject = 'Tiêu đề email follow-up không được để trống.';
  }

  const body = typeof b.body === 'string' ? b.body.trim() : '';
  if (!body || body.length < 10) {
    errors.body = 'Nội dung email follow-up phải chứa ít nhất 10 ký tự.';
  }

  const recipientEmail = typeof b.recipientEmail === 'string' ? b.recipientEmail.trim() : undefined;
  const notes = typeof b.notes === 'string' ? b.notes.trim() : undefined;
  const sentAt = typeof b.sentAt === 'string' && b.sentAt ? b.sentAt : new Date().toISOString();

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: {
        applicationId,
        stage,
        tone,
        sentAt,
        recipientEmail,
        subject,
        body,
        notes
      },
      message: 'Thông tin nhật ký gửi email follow-up chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId,
      stage,
      tone,
      sentAt,
      recipientEmail,
      subject,
      body,
      notes
    }
  };
}

export type FollowUpEventKind = 'followed_up' | 'dismissed' | 'ghosted' | 'reopened';

export interface FollowUpEventDTO {
  id: string;
  applicationId: string;
  kind: FollowUpEventKind;
  note: string | null;
  occurredAt: string;
}

export type FollowUpAttentionState =
  | 'closed'
  | 'ghosted'
  | 'snoozed'
  | 'scheduled'
  | 'due'
  | 'overdue';

export interface FollowUpAttentionItemDTO {
  applicationId: string;
  company: string;
  position: string;
  stage: ApplicationStatus;
  state: FollowUpAttentionState;
  daysSinceAnchor: number;
  waitDays: number | null;
  dueDate: string | null;
  anchorAt: string;
  lastEventKind: FollowUpEventKind | null;
}

export interface FollowUpAttentionSummaryDTO {
  asOf: string;
  timeZone: string;
  counts: {
    attention: number;
    overdue: number;
    snoozed: number;
    ghosted: number;
  };
  items: FollowUpAttentionItemDTO[];
}

const TERMINAL_STAGES: ReadonlySet<ApplicationStatus> = new Set<ApplicationStatus>(['Rejected', 'Withdrawn']);

const SUPPRESSING_KINDS: ReadonlySet<FollowUpEventKind> = new Set<FollowUpEventKind>(['dismissed', 'ghosted']);

export function isFollowUpTerminal(stage: ApplicationStatus): boolean {
  return TERMINAL_STAGES.has(stage);
}

function dayNumberInZone(value: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(value);
  const year = Number(parts.find(part => part.type === 'year')?.value);
  const month = Number(parts.find(part => part.type === 'month')?.value);
  const day = Number(parts.find(part => part.type === 'day')?.value);
  return Math.floor(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
}

function calendarDayInZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value);
}

export function deriveFollowUpAttention(input: {
  applicationId: string;
  company: string;
  position: string;
  stage: ApplicationStatus;
  statusUpdatedAt: string | Date;
  anchorAt: string | Date;
  events: Array<{ kind: FollowUpEventKind; occurredAt: string | Date }>;
  timeZone?: string;
  now?: Date;
}): FollowUpAttentionItemDTO {
  const now = input.now ?? new Date();
  const anchorMs = new Date(input.anchorAt).getTime();
  const statusMs = new Date(input.statusUpdatedAt).getTime();

  const waitDays = FOLLOW_UP_CADENCE[input.stage] ?? null;
  const applicableEvents = input.events
    .filter(event => new Date(event.occurredAt).getTime() >= statusMs)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const latestSuppressing = applicableEvents.find(event => SUPPRESSING_KINDS.has(event.kind)) ?? null;
  const lastEventKind = applicableEvents[0]?.kind ?? null;

  const base: FollowUpAttentionItemDTO = {
    applicationId: input.applicationId,
    company: input.company,
    position: input.position,
    stage: input.stage,
    state: 'scheduled',
    daysSinceAnchor: 0,
    waitDays,
    dueDate: null,
    anchorAt: new Date(anchorMs).toISOString(),
    lastEventKind
  };

  if (isFollowUpTerminal(input.stage) || waitDays === null) {
    return { ...base, state: 'closed' };
  }

  if (!Number.isFinite(anchorMs)) {
    return { ...base, state: 'closed' };
  }

  const timeZone = input.timeZone || 'Asia/Ho_Chi_Minh';
  const anchorDay = dayNumberInZone(new Date(anchorMs), timeZone);
  const todayDay = dayNumberInZone(now, timeZone);
  const daysSinceAnchor = Math.max(0, todayDay - anchorDay);
  const dueDayNumber = anchorDay + waitDays;
  const dueDate = calendarDayInZone(new Date(dueDayNumber * 24 * 60 * 60 * 1000), 'UTC');

  const withDays: FollowUpAttentionItemDTO = { ...base, daysSinceAnchor, dueDate };

  if (latestSuppressing) {
    return {
      ...withDays,
      state: latestSuppressing.kind === 'ghosted' ? 'ghosted' : 'snoozed'
    };
  }

  if (daysSinceAnchor >= waitDays + FOLLOW_UP_OVERDUE_EXTRA_DAYS) {
    return { ...withDays, state: 'overdue' };
  }
  if (daysSinceAnchor >= waitDays) {
    return { ...withDays, state: 'due' };
  }
  return withDays;
}

export function summarizeFollowUpAttention(
  items: FollowUpAttentionItemDTO[],
  timeZone: string,
  now: Date = new Date()
): FollowUpAttentionSummaryDTO {
  return {
    asOf: now.toISOString(),
    timeZone,
    counts: {
      attention: items.filter(item => item.state === 'due' || item.state === 'overdue').length,
      overdue: items.filter(item => item.state === 'overdue').length,
      snoozed: items.filter(item => item.state === 'snoozed').length,
      ghosted: items.filter(item => item.state === 'ghosted').length
    },
    items
  };
}

export function validateFollowUpEventInput(input: unknown): ValidationResult<{ kind: FollowUpEventKind; note: string | null }> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Nội dung yêu cầu chưa hợp lệ.', errors: { body: 'Phải là đối tượng JSON.' } };
  }
  const body = input as Record<string, unknown>;
  const kind = body.kind;
  if (kind !== 'followed_up' && kind !== 'dismissed' && kind !== 'ghosted' && kind !== 'reopened') {
    return { ok: false, message: 'Loại sự kiện chưa hợp lệ.', errors: { kind: 'Cho phép: followed_up, dismissed, ghosted, reopened.' } };
  }
  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    return { ok: false, message: 'Ghi chú chưa hợp lệ.', errors: { note: 'Ghi chú phải là chuỗi.' } };
  }
  const note = typeof rawNote === 'string' ? rawNote.trim() : '';
  if (note.length > 500) {
    return { ok: false, message: 'Ghi chú quá dài.', errors: { note: 'Tối đa 500 ký tự.' } };
  }
  return { ok: true, data: { kind, note: note || null } };
}
