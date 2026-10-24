export type EmailCategory =
  | 'interview_invitation'
  | 'application_ack'
  | 'rejection'
  | 'offer'
  | 'recruiter_outreach'
  | 'general';

export interface ExtractedEmailEntityDTO {
  category: EmailCategory;
  confidenceScore: number;
  company: string;
  position: string;
  targetStatus: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
  interviewSchedule?: {
    date: string;
    timezone: string;
    format: string;
    meetingUrl?: string;
  } | null;
  recruiter?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  compensationSnippet?: string | null;
  nextAction?: string | null;
  deadline?: string | null;
  extractedNotes?: string;
}

export type IngestionActionType =
  | 'create_application'
  | 'update_status'
  | 'schedule_interview'
  | 'record_offer';

export interface EmailIngestProposalDTO {
  actionType: IngestionActionType;
  confidenceScore: number;
  matchedApplicationId?: string | null;
  matchedCompany?: string | null;
  matchedPosition?: string | null;
  summary: string;
  proposedApplication?: {
    company: string;
    position: string;
    status: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected';
    notes?: string | null;
    nextAction?: string | null;
    deadline?: string | null;
  };
  proposedInterview?: {
    title: string;
    at: string;
    timezone: string;
    format: string;
    location: string;
    preparation?: string;
    notes?: string;
  } | null;
  changesSummary: string[];
}

export interface EmailIngestApplyResultDTO {
  success: boolean;
  actionTaken: IngestionActionType;
  applicationId: string;
  interviewId?: string | null;
  message: string;
}

const KNOWN_COMPANIES = [
  'FPT Software',
  'VNG Corporation',
  'Shopee',
  'Viettel',
  'MoMo',
  'Tiki',
  'Grab',
  'VinGroup',
  'One Mount',
  'NAB Innovation Centre',
  'KMS Technology',
  'Cốc Cốc',
  'Amanotes',
  'Techcombank',
  'VPBank',
  'MB Bank'
];

const KNOWN_ROLES = [
  'Senior React Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Fullstack Engineer',
  'DevOps Engineer',
  'Cloud Solutions Architect',
  'Product Manager',
  'QA Automation Engineer',
  'Mobile Developer',
  'AI Engineer',
  'Data Engineer'
];

export function detectEmailCategory(text: string, subject = ''): { category: EmailCategory; confidence: number } {
  const combined = `${subject} ${text}`.toLowerCase();

  if (
    combined.includes('thư mời nhận việc') ||
    combined.includes('job offer') ||
    combined.includes('offer letter') ||
    combined.includes('trúng tuyển') ||
    combined.includes('chúc mừng bạn đã được chọn')
  ) {
    return { category: 'offer', confidence: 95 };
  }

  if (
    combined.includes('thư mời phỏng vấn') ||
    combined.includes('interview invitation') ||
    combined.includes('lịch phỏng vấn') ||
    combined.includes('trao đổi chuyên môn') ||
    combined.includes('phỏng vấn kỹ thuật') ||
    combined.includes('zoom.us') ||
    combined.includes('meet.google.com') ||
    combined.includes('teams.microsoft.com')
  ) {
    return { category: 'interview_invitation', confidence: 90 };
  }

  if (
    combined.includes('rất tiếc') ||
    combined.includes('chưa phù hợp') ||
    combined.includes('we regret to inform') ||
    combined.includes('not moving forward') ||
    combined.includes('chưa thể đồng hành') ||
    combined.includes('lưu hồ sơ cho cơ hội sau')
  ) {
    return { category: 'rejection', confidence: 92 };
  }

  if (
    combined.includes('đã nhận được hồ sơ') ||
    combined.includes('xác nhận ứng tuyển') ||
    combined.includes('thank you for applying') ||
    combined.includes('application received') ||
    combined.includes('chuyển hồ sơ đến bộ phận')
  ) {
    return { category: 'application_ack', confidence: 85 };
  }

  if (
    combined.includes('thấy hồ sơ của bạn') ||
    combined.includes('impressed by your profile') ||
    combined.includes('cơ hội nghề nghiệp mới') ||
    combined.includes('kết nối cơ hội')
  ) {
    return { category: 'recruiter_outreach', confidence: 80 };
  }

  return { category: 'general', confidence: 50 };
}

export function extractMeetingLink(text: string): { url: string; platform: string } | null {
  const googleMeetMatch = text.match(/https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
  if (googleMeetMatch) {
    return { url: googleMeetMatch[0], platform: 'Google Meet' };
  }

  const zoomMatch = text.match(/https:\/\/(?:[a-zA-Z0-9-]+\.)?zoom\.us\/j\/[a-zA-Z0-9?=_&%-]+/i);
  if (zoomMatch) {
    return { url: zoomMatch[0], platform: 'Zoom' };
  }

  const teamsMatch = text.match(/https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[a-zA-Z0-9?=_&%-]+/i);
  if (teamsMatch) {
    return { url: teamsMatch[0], platform: 'Microsoft Teams' };
  }

  return null;
}

export function extractCompany(text: string, subject = '', sender = ''): string {
  const combined = `${subject} ${sender} ${text}`;

  for (const c of KNOWN_COMPANIES) {
    const regex = new RegExp(`\\b${c.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combined)) {
      return c;
    }
  }

  const atCompanyMatch = combined.match(/(?:tại|công ty|tập đoàn|at|from)\s+([A-Z0-9][A-Za-z0-9\s&.-]{2,30})/);
  if (atCompanyMatch && atCompanyMatch[1]) {
    const candidate = atCompanyMatch[1].trim().split(/[\n,.]/)[0];
    if (candidate.length > 2 && candidate.length < 35) {
      return candidate;
    }
  }

  if (sender) {
    const domainMatch = sender.match(/@([a-zA-Z0-9-]+)\./);
    if (domainMatch && domainMatch[1] && !['gmail', 'yahoo', 'outlook', 'hotmail'].includes(domainMatch[1])) {
      return domainMatch[1].charAt(0).toUpperCase() + domainMatch[1].slice(1);
    }
  }

  return 'Công ty tiềm năng';
}

export function extractPosition(text: string, subject = ''): string {
  const combined = `${subject} ${text}`;

  for (const r of KNOWN_ROLES) {
    const regex = new RegExp(`\\b${r.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (regex.test(combined)) {
      return r;
    }
  }

  const roleMatch = combined.match(/(?:vị trí|chức danh|role|position)[:\s]+([A-Za-z0-9\s/.-]{3,40})/i);
  if (roleMatch && roleMatch[1]) {
    const candidate = roleMatch[1].trim().split(/[\n,.]/)[0];
    if (candidate.length > 2 && candidate.length < 40) {
      return candidate;
    }
  }

  return 'Software Engineer';
}

export function extractRecruiter(text: string, sender = ''): { name?: string; email?: string; phone?: string } | null {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : sender && sender.includes('@') ? sender : undefined;

  const phoneMatch = text.match(/(?:\+84|0)(?:[3|5|7|8|9])[0-9]{8}/);
  const phone = phoneMatch ? phoneMatch[0] : undefined;

  let name: string | undefined;
  const signatureMatch = text.match(/(?:trân trọng|thân ái|best regards|regards|thanks & regards)[,\s]*\n+([^\n\r]+)/i);
  if (signatureMatch && signatureMatch[1]) {
    const rawName = signatureMatch[1].trim();
    if (rawName.length > 2 && rawName.length < 40 && !rawName.includes('@')) {
      name = rawName;
    }
  }

  if (!email && !phone && !name) return null;
  return { name, email, phone };
}

export function extractInterviewDateTime(text: string): string | null {
  const match1 = text.match(/(\d{1,2})[h:](\d{2})?\s*(?:ngày|on)?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i);
  if (match1) {
    const hours = match1[1].padStart(2, '0');
    const minutes = (match1[2] || '00').padStart(2, '0');
    const day = match1[3].padStart(2, '0');
    const month = match1[4].padStart(2, '0');
    const year = match1[5];
    return `${year}-${month}-${day}T${hours}:${minutes}:00Z`;
  }

  const match2 = text.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s*(?:vào lúc|lúc|at)?\s*(\d{1,2})[h:](\d{2})?/i);
  if (match2) {
    const year = match2[1];
    const month = match2[2].padStart(2, '0');
    const day = match2[3].padStart(2, '0');
    const hours = match2[4].padStart(2, '0');
    const minutes = (match2[5] || '00').padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00Z`;
  }

  return null;
}

export function parseEmailContent(text: string, subject = '', sender = ''): ExtractedEmailEntityDTO {
  const { category, confidence } = detectEmailCategory(text, subject);
  const company = extractCompany(text, subject, sender);
  const position = extractPosition(text, subject);
  const meeting = extractMeetingLink(text);
  const recruiter = extractRecruiter(text, sender);
  const interviewTime = extractInterviewDateTime(text);

  let targetStatus: 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Rejected' = 'Applied';
  if (category === 'offer') targetStatus = 'Offer';
  else if (category === 'interview_invitation') targetStatus = 'Interview';
  else if (category === 'rejection') targetStatus = 'Rejected';
  else if (category === 'application_ack') targetStatus = 'Applied';
  else if (category === 'recruiter_outreach') targetStatus = 'Screening';

  let interviewSchedule: ExtractedEmailEntityDTO['interviewSchedule'] = null;
  if (interviewTime || meeting) {
    const defaultDate = interviewTime || new Date(Date.now() + 86400000 * 2).toISOString();
    interviewSchedule = {
      date: defaultDate,
      timezone: 'Asia/Ho_Chi_Minh',
      format: meeting ? meeting.platform : 'Online Meeting',
      meetingUrl: meeting ? meeting.url : undefined
    };
  }

  const salaryMatch = text.match(/(?:mức lương|thu nhập|lương|compensation|salary)[:\s]+([^\n\r]+)/i);
  const compensationSnippet = salaryMatch ? salaryMatch[1].trim() : null;

  let nextAction: string | null = null;
  if (category === 'interview_invitation') nextAction = 'Chuẩn bị phỏng vấn kỹ thuật và kiểm tra đường truyền';
  else if (category === 'offer') nextAction = 'Xem xét điều khoản đãi ngộ và phản hồi hợp đồng';
  else if (category === 'rejection') nextAction = 'Lưu trữ thông tin và kết nối mở rộng cơ hội khác';
  else if (category === 'application_ack') nextAction = 'Theo dõi phản hồi vòng hồ sơ trong 5 ngày làm việc';

  return {
    category,
    confidenceScore: confidence,
    company,
    position,
    targetStatus,
    interviewSchedule,
    recruiter,
    compensationSnippet,
    nextAction,
    deadline: null,
    extractedNotes: `Trích xuất từ email tự động (${category}). Người liên hệ: ${recruiter?.name || 'Tuyển dụng'} (${recruiter?.email || 'N/A'}).`
  };
}

export function generateIngestionProposal(
  extracted: ExtractedEmailEntityDTO,
  existingApplications: Array<{ id: string; company: string; position: string; status: string }> = []
): EmailIngestProposalDTO {
  const normCompany = extracted.company.trim().toLowerCase();
  const matched = existingApplications.find(a => {
    const aComp = a.company.trim().toLowerCase();
    return aComp === normCompany || aComp.includes(normCompany) || normCompany.includes(aComp);
  });

  const changesSummary: string[] = [];

  if (matched) {
    if (extracted.category === 'interview_invitation') {
      const interviewTime = extracted.interviewSchedule?.date || new Date(Date.now() + 86400000 * 2).toISOString();
      const format = extracted.interviewSchedule?.format || 'Online';
      const location = extracted.interviewSchedule?.meetingUrl || 'Trực tuyến';

      changesSummary.push(`Khớp hồ sơ hiện có tại ${matched.company} (${matched.position})`);
      changesSummary.push(`Cập nhật trạng thái từ "${matched.status}" sang "Interview"`);
      changesSummary.push(`Thêm vòng phỏng vấn mới: ${format} lúc ${new Date(interviewTime).toLocaleDateString('vi-VN')}`);

      return {
        actionType: 'schedule_interview',
        confidenceScore: 92,
        matchedApplicationId: matched.id,
        matchedCompany: matched.company,
        matchedPosition: matched.position,
        summary: `Tự động lên lịch phỏng vấn tại ${matched.company}`,
        proposedApplication: {
          company: matched.company,
          position: matched.position,
          status: 'Interview',
          nextAction: extracted.nextAction,
          notes: extracted.extractedNotes
        },
        proposedInterview: {
          title: `Phỏng vấn chuyên môn - ${matched.company}`,
          at: interviewTime,
          timezone: 'Asia/Ho_Chi_Minh',
          format,
          location,
          preparation: 'Xem lại dự án nổi bật và chuẩn bị câu hỏi cho nhà tuyển dụng',
          notes: extracted.interviewSchedule?.meetingUrl ? `Link họp: ${extracted.interviewSchedule.meetingUrl}` : ''
        },
        changesSummary
      };
    }

    if (extracted.category === 'offer') {
      changesSummary.push(`Khớp hồ sơ hiện có tại ${matched.company} (${matched.position})`);
      changesSummary.push(`Cập nhật trạng thái sang "Offer"`);
      if (extracted.compensationSnippet) {
        changesSummary.push(`Ghi nhận đãi ngộ: ${extracted.compensationSnippet}`);
      }

      return {
        actionType: 'record_offer',
        confidenceScore: 95,
        matchedApplicationId: matched.id,
        matchedCompany: matched.company,
        matchedPosition: matched.position,
        summary: `Ghi nhận kết quả Offer từ ${matched.company}`,
        proposedApplication: {
          company: matched.company,
          position: matched.position,
          status: 'Offer',
          nextAction: extracted.nextAction,
          notes: extracted.extractedNotes
        },
        proposedInterview: null,
        changesSummary
      };
    }

    if (extracted.category === 'rejection') {
      changesSummary.push(`Khớp hồ sơ hiện có tại ${matched.company}`);
      changesSummary.push(`Chuyển trạng thái sang "Rejected"`);

      return {
        actionType: 'update_status',
        confidenceScore: 90,
        matchedApplicationId: matched.id,
        matchedCompany: matched.company,
        matchedPosition: matched.position,
        summary: `Ghi nhận thông báo từ chối từ ${matched.company}`,
        proposedApplication: {
          company: matched.company,
          position: matched.position,
          status: 'Rejected',
          nextAction: extracted.nextAction,
          notes: extracted.extractedNotes
        },
        proposedInterview: null,
        changesSummary
      };
    }

    changesSummary.push(`Khớp hồ sơ hiện có tại ${matched.company}`);
    changesSummary.push(`Cập nhật trạng thái sang "${extracted.targetStatus}"`);

    return {
      actionType: 'update_status',
      confidenceScore: 85,
      matchedApplicationId: matched.id,
      matchedCompany: matched.company,
      matchedPosition: matched.position,
      summary: `Cập nhật thông tin hồ sơ ${matched.company}`,
      proposedApplication: {
        company: matched.company,
        position: matched.position,
        status: extracted.targetStatus,
        nextAction: extracted.nextAction,
        notes: extracted.extractedNotes
      },
      proposedInterview: null,
      changesSummary
    };
  }

  changesSummary.push(`Tạo mới hồ sơ ứng tuyển tại ${extracted.company}`);
  changesSummary.push(`Chức danh: ${extracted.position}`);
  changesSummary.push(`Trạng thái khởi tạo: ${extracted.targetStatus}`);

  let proposedInterview: EmailIngestProposalDTO['proposedInterview'] = null;
  if (extracted.category === 'interview_invitation' && extracted.interviewSchedule) {
    proposedInterview = {
      title: `Phỏng vấn - ${extracted.company}`,
      at: extracted.interviewSchedule.date,
      timezone: 'Asia/Ho_Chi_Minh',
      format: extracted.interviewSchedule.format,
      location: extracted.interviewSchedule.meetingUrl || 'Trực tuyến',
      preparation: 'Xem lại hồ sơ và mô tả công việc',
      notes: extracted.interviewSchedule.meetingUrl ? `Link họp: ${extracted.interviewSchedule.meetingUrl}` : ''
    };
    changesSummary.push(`Tự động tạo lịch phỏng vấn lúc ${new Date(extracted.interviewSchedule.date).toLocaleDateString('vi-VN')}`);
  }

  return {
    actionType: 'create_application',
    confidenceScore: extracted.confidenceScore,
    matchedApplicationId: null,
    matchedCompany: null,
    matchedPosition: null,
    summary: `Tạo mới hồ sơ ứng tuyển tại ${extracted.company}`,
    proposedApplication: {
      company: extracted.company,
      position: extracted.position,
      status: extracted.targetStatus,
      nextAction: extracted.nextAction,
      notes: extracted.extractedNotes
    },
    proposedInterview,
    changesSummary
  };
}

export type EmailParseValidationResult =
  | { ok: true; data: { emailContent: string; subject?: string; sender?: string } }
  | { ok: false; message: string };

export function validateEmailParseInput(input: unknown): EmailParseValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Dữ liệu đầu vào phải là một đối tượng JSON.' };
  }

  const body = input as Record<string, unknown>;
  if (typeof body.emailContent !== 'string' || body.emailContent.trim().length === 0) {
    return { ok: false, message: 'Nội dung email (emailContent) không được để trống.' };
  }

  return {
    ok: true,
    data: {
      emailContent: body.emailContent.trim(),
      subject: typeof body.subject === 'string' ? body.subject.trim() : undefined,
      sender: typeof body.sender === 'string' ? body.sender.trim() : undefined
    }
  };
}

export type EmailApplyValidationResult =
  | { ok: true; data: EmailIngestProposalDTO }
  | { ok: false; message: string };

export function validateEmailApplyInput(input: unknown): EmailApplyValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Dữ liệu đề xuất phải là một đối tượng JSON.' };
  }

  const body = input as Record<string, unknown>;
  const validActionTypes: IngestionActionType[] = [
    'create_application',
    'update_status',
    'schedule_interview',
    'record_offer'
  ];

  if (typeof body.actionType !== 'string' || !validActionTypes.includes(body.actionType as IngestionActionType)) {
    return { ok: false, message: 'Hành động áp dụng (actionType) không hợp lệ.' };
  }

  if (!body.proposedApplication || typeof body.proposedApplication !== 'object') {
    return { ok: false, message: 'Thiếu thông tin hồ sơ ứng tuyển đề xuất (proposedApplication).' };
  }

  return {
    ok: true,
    data: input as EmailIngestProposalDTO
  };
}
