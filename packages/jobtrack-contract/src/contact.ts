import type { ValidationResult } from './validators.ts';

export type ContactType =
  | 'recruiter'
  | 'headhunter'
  | 'hiring_manager'
  | 'referrer'
  | 'mentor'
  | 'peer';

export type RelationshipStrength =
  | 'lead'
  | 'connected'
  | 'in_touch'
  | 'advocate'
  | 'dormant';

export type InteractionChannel =
  | 'linkedin'
  | 'email'
  | 'phone'
  | 'coffee'
  | 'interview'
  | 'other';

export interface ContactDTO {
  id: string;
  userId?: string;
  name: string;
  company: string;
  role?: string;
  type: ContactType;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  relationshipStrength: RelationshipStrength;
  applicationId?: string;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInteractionDTO {
  id: string;
  contactId: string;
  userId?: string;
  channel: InteractionChannel;
  summary: string;
  details?: string;
  date: string;
  followUpDate?: string;
  createdAt?: string;
}

export interface ContactMutationInput {
  name: string;
  company: string;
  role?: string;
  type?: ContactType;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  relationshipStrength?: RelationshipStrength;
  applicationId?: string;
  notes?: string;
  lastContactedAt?: string;
}

export interface InteractionMutationInput {
  channel: InteractionChannel;
  summary: string;
  details?: string;
  date?: string;
  followUpDate?: string;
}

export interface RelationshipHealthDTO {
  contactId: string;
  daysSinceLastContact: number;
  recommendedReconnectDays: number;
  isReconnectDue: boolean;
  isDormant: boolean;
  healthStatus: 'healthy' | 'due' | 'dormant';
  suggestedAction: string;
}

export function deriveRecommendedReconnectDays(strength: RelationshipStrength, type: ContactType): number {
  if (strength === 'advocate') return 30;
  if (strength === 'in_touch') return 45;
  if (strength === 'connected') return 60;
  if (type === 'recruiter' || type === 'headhunter') return 45;
  return 90;
}

export function calculateRelationshipHealth(
  contact: ContactDTO,
  lastInteractionDate?: string | Date
): RelationshipHealthDTO {
  const referenceDate = lastInteractionDate || contact.lastContactedAt || contact.updatedAt || contact.createdAt;
  const lastTime = new Date(referenceDate).getTime();
  const now = Date.now();
  const daysSinceLastContact = Math.max(0, Math.floor((now - lastTime) / (1000 * 60 * 60 * 24)));

  const recommendedReconnectDays = deriveRecommendedReconnectDays(
    contact.relationshipStrength,
    contact.type
  );

  const isDormant = daysSinceLastContact >= 90 || contact.relationshipStrength === 'dormant';
  const isReconnectDue = daysSinceLastContact >= recommendedReconnectDays;

  let healthStatus: 'healthy' | 'due' | 'dormant' = 'healthy';
  if (isDormant) {
    healthStatus = 'dormant';
  } else if (isReconnectDue) {
    healthStatus = 'due';
  }

  let suggestedAction = 'Quan hệ đang duy trì tốt, không cần thao tác gấp.';
  if (isDormant) {
    suggestedAction = 'Đã lâu không tương tác. Gửi tin nhắn hỏi thăm hoặc chia sẻ bài viết chuyên môn để hâm nóng quan hệ.';
  } else if (isReconnectDue) {
    if (contact.type === 'recruiter' || contact.type === 'headhunter') {
      suggestedAction = 'Cập nhật lại định hướng công việc mới nhất hoặc hỏi thăm các cơ hội đang mở.';
    } else if (contact.type === 'referrer') {
      suggestedAction = 'Gửi lời cảm ơn hoặc cập nhật tiến độ ứng tuyển gần đây cho người giới thiệu.';
    } else {
      suggestedAction = 'Gửi tin nhắn kết nối lại để duy trì nhịp độ trò chuyện thường xuyên.';
    }
  }

  return {
    contactId: contact.id,
    daysSinceLastContact,
    recommendedReconnectDays,
    isReconnectDue,
    isDormant,
    healthStatus,
    suggestedAction
  };
}

export function validateContactInput(raw: unknown): ValidationResult<ContactMutationInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu người liên hệ không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) {
    errors.name = 'Vui lòng nhập tên người liên hệ.';
  } else if (name.length > 150) {
    errors.name = 'Tên không được vượt quá 150 ký tự.';
  }

  const company = typeof b.company === 'string' ? b.company.trim() : '';
  if (!company) {
    errors.company = 'Vui lòng nhập tên công ty hoặc tổ chức.';
  } else if (company.length > 150) {
    errors.company = 'Tên công ty không được vượt quá 150 ký tự.';
  }

  const role = typeof b.role === 'string' ? b.role.trim() : undefined;
  if (role && role.length > 150) {
    errors.role = 'Chức vụ không được vượt quá 150 ký tự.';
  }

  const validTypes: ContactType[] = ['recruiter', 'headhunter', 'hiring_manager', 'referrer', 'mentor', 'peer'];
  const type = (typeof b.type === 'string' && validTypes.includes(b.type as ContactType))
    ? (b.type as ContactType)
    : 'recruiter';

  let email = typeof b.email === 'string' ? b.email.trim() : undefined;
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Định dạng email không hợp lệ.';
    } else if (email.length > 200) {
      errors.email = 'Email không được vượt quá 200 ký tự.';
    }
  }

  let phone = typeof b.phone === 'string' ? b.phone.trim() : undefined;
  if (phone && phone.length > 50) {
    errors.phone = 'Số điện thoại không được vượt quá 50 ký tự.';
  }

  let linkedinUrl = typeof b.linkedinUrl === 'string' ? b.linkedinUrl.trim() : undefined;
  if (linkedinUrl) {
    if (!/^https?:\/\//i.test(linkedinUrl)) {
      errors.linkedinUrl = 'URL LinkedIn phải bắt đầu bằng http:// hoặc https://';
    } else if (linkedinUrl.length > 500) {
      errors.linkedinUrl = 'URL LinkedIn không được vượt quá 500 ký tự.';
    }
  }

  const validStrengths: RelationshipStrength[] = ['lead', 'connected', 'in_touch', 'advocate', 'dormant'];
  const relationshipStrength = (typeof b.relationshipStrength === 'string' && validStrengths.includes(b.relationshipStrength as RelationshipStrength))
    ? (b.relationshipStrength as RelationshipStrength)
    : 'connected';

  const applicationId = typeof b.applicationId === 'string' && b.applicationId.trim()
    ? b.applicationId.trim()
    : undefined;

  const notes = typeof b.notes === 'string' ? b.notes.trim() : undefined;
  if (notes && notes.length > 3000) {
    errors.notes = 'Ghi chú không được vượt quá 3000 ký tự.';
  }

  let lastContactedAt: string | undefined = undefined;
  if (typeof b.lastContactedAt === 'string' && b.lastContactedAt.trim()) {
    const d = new Date(b.lastContactedAt);
    if (isNaN(d.getTime())) {
      errors.lastContactedAt = 'Thời gian liên hệ gần nhất không đúng định dạng.';
    } else {
      lastContactedAt = d.toISOString();
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Thông tin người liên hệ chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      name,
      company,
      role,
      type,
      email,
      phone,
      linkedinUrl,
      relationshipStrength,
      applicationId,
      notes,
      lastContactedAt
    }
  };
}

export function validateInteractionInput(raw: unknown): ValidationResult<InteractionMutationInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu tương tác không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validChannels: InteractionChannel[] = ['linkedin', 'email', 'phone', 'coffee', 'interview', 'other'];
  const channel = (typeof b.channel === 'string' && validChannels.includes(b.channel as InteractionChannel))
    ? (b.channel as InteractionChannel)
    : 'email';

  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  if (!summary) {
    errors.summary = 'Vui lòng nhập tóm tắt cuộc trò chuyện / tương tác.';
  } else if (summary.length > 250) {
    errors.summary = 'Tóm tắt không được vượt quá 250 ký tự.';
  }

  const details = typeof b.details === 'string' ? b.details.trim() : undefined;
  if (details && details.length > 5000) {
    errors.details = 'Chi tiết không được vượt quá 5000 ký tự.';
  }

  let date = new Date().toISOString();
  if (typeof b.date === 'string' && b.date.trim()) {
    const d = new Date(b.date);
    if (isNaN(d.getTime())) {
      errors.date = 'Thời gian tương tác không hợp lệ.';
    } else {
      date = d.toISOString();
    }
  }

  let followUpDate: string | undefined = undefined;
  if (typeof b.followUpDate === 'string' && b.followUpDate.trim()) {
    const d = new Date(b.followUpDate);
    if (isNaN(d.getTime())) {
      errors.followUpDate = 'Ngày follow-up tiếp theo không hợp lệ.';
    } else {
      followUpDate = d.toISOString().split('T')[0];
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu tương tác chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      channel,
      summary,
      details,
      date,
      followUpDate
    }
  };
}
