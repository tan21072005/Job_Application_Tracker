import {
  APPLICATION_STATUSES,
  WORK_MODES,
  INTERVIEW_FORMATS,
  INTERVIEW_STATUSES,
  SORT_ALLOWLIST,
  INTERVIEW_QUESTION_CATEGORIES,
  DOMAIN_TRACKS,
  type ApplicationStatus,
  type WorkMode,
  type InterviewFormat,
  type InterviewStatus,
  type SortOption,
  type CandidateProfileMutationInput,
  type BulkStatusUpdateDTO,
  type BulkTrashDTO,
  type InterviewPrepRequestDTO,
  type InterviewEvaluateRequestDTO,
  type InterviewQuestionCategory,
  type DomainTrack,
  type CsvImportItemInput,
  type CsvImportRequestDTO,
  type OfferEvaluationInput,
  type OfferComparisonInput,
  type CounterOfferNegotiationInput,
  type NegotiationTone,
  type OfferEvaluationDTO
} from './types.ts';
import { isValidCalendarDate, isValidIsoInstant, isValidIanaTimezone } from './time.ts';
import { normalizeIdentityKey, normalizeUrl } from './normalization.ts';

export interface ValidationSuccess<T> {
  ok: true;
  data: T;
}

export interface ValidationFailure {
  ok: false;
  errors: Record<string, string>;
  message: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export interface ValidatedApplicationData {
  company: string;
  position: string;
  url: string | null;
  normalizedUrl: string | null;
  source: string | null;
  sourceNormalized: string | null;
  jobCode: string | null;
  jobCodeNormalized: string | null;
  location: string | null;
  workMode: WorkMode | null;
  appliedAt: string | null;
  salary: string | null;
  notes: string | null;
  nextAction: string | null;
  deadline: string | null;
  status: ApplicationStatus;
  confirmReapply: boolean;
}

export interface ValidatedInterviewData {
  title: string;
  at: string;
  timezone: string;
  format: InterviewFormat;
  location: string | null;
  preparation: string | null;
  notes: string | null;
  status: InterviewStatus;
}

const APP_ALLOWED_FIELDS = new Set([
  'company', 'position', 'url', 'source', 'jobCode', 'location',
  'workMode', 'appliedAt', 'salary', 'notes', 'nextAction', 'deadline',
  'status', 'confirmReapply'
]);

const INTERVIEW_ALLOWED_FIELDS = new Set([
  'title', 'at', 'timezone', 'format', 'location', 'preparation', 'notes', 'status'
]);

function checkUnknownFields(body: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(body).filter(k => !allowed.has(k));
}

export function validateApplicationInput(
  rawBody: unknown,
  isPatch = false
): ValidationResult<Partial<ValidatedApplicationData> & { confirmReapply?: boolean }> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Nội dung yêu cầu chưa hợp lệ.',
      errors: { body: 'Dữ liệu gửi lên phải là một đối tượng JSON.' }
    };
  }

  const b = rawBody as Record<string, unknown>;
  const unknownFields = checkUnknownFields(b, APP_ALLOWED_FIELDS);
  if (unknownFields.length > 0) {
    const fieldMap: Record<string, string> = {};
    for (const f of unknownFields) {
      fieldMap[f] = 'Trường không được hỗ trợ trong giao thức API.';
    }
    return {
      ok: false,
      message: 'Yêu cầu chứa trường không được hỗ trợ.',
      errors: fieldMap
    };
  }

  if (isPatch && Object.keys(b).length === 0) {
    return {
      ok: false,
      message: 'Cần ít nhất một trường để cập nhật.',
      errors: { patch: 'Danh sách trường cập nhật trống.' }
    };
  }

  const errors: Record<string, string> = {};
  const data: Partial<ValidatedApplicationData> = {};

  // Company
  if (!isPatch || 'company' in b) {
    const val = b.company;
    if (typeof val !== 'string' || !val.trim()) {
      errors.company = 'Tên công ty là bắt buộc.';
    } else if (val.trim().length > 250) {
      errors.company = 'Tên công ty không được vượt quá 250 ký tự.';
    } else {
      data.company = val.trim();
    }
  }

  // Position
  if (!isPatch || 'position' in b) {
    const val = b.position;
    if (typeof val !== 'string' || !val.trim()) {
      errors.position = 'Vị trí ứng tuyển là bắt buộc.';
    } else if (val.trim().length > 250) {
      errors.position = 'Vị trí ứng tuyển không được vượt quá 250 ký tự.';
    } else {
      data.position = val.trim();
    }
  }

  // URL
  if ('url' in b && b.url !== undefined && b.url !== null && b.url !== '') {
    const val = b.url;
    if (typeof val !== 'string' || val.length > 2000) {
      errors.url = 'URL tin tuyển dụng không được vượt quá 2000 ký tự.';
    } else {
      const norm = normalizeUrl(val);
      if (norm.error) {
        errors.url = norm.error;
      } else {
        data.url = val.trim();
        data.normalizedUrl = norm.normalized;
      }
    }
  } else if (!isPatch || 'url' in b) {
    data.url = null;
    data.normalizedUrl = null;
  }

  // Source & JobCode
  if ('source' in b && b.source !== undefined && b.source !== null && b.source !== '') {
    const val = b.source;
    if (typeof val !== 'string' || val.length > 128) {
      errors.source = 'Nguồn tuyển dụng không được vượt quá 128 ký tự.';
    } else {
      const norm = normalizeIdentityKey(val);
      if (norm.error) {
        errors.source = norm.error;
      } else {
        data.source = val.trim();
        data.sourceNormalized = norm.normalized;
      }
    }
  } else if (!isPatch || 'source' in b) {
    data.source = null;
    data.sourceNormalized = null;
  }

  if ('jobCode' in b && b.jobCode !== undefined && b.jobCode !== null && b.jobCode !== '') {
    const val = b.jobCode;
    if (typeof val !== 'string' || val.length > 128) {
      errors.jobCode = 'Mã tin tuyển dụng không được vượt quá 128 ký tự.';
    } else {
      const norm = normalizeIdentityKey(val);
      if (norm.error) {
        errors.jobCode = norm.error;
      } else {
        data.jobCode = val.trim();
        data.jobCodeNormalized = norm.normalized;
      }
    }
  } else if (!isPatch || 'jobCode' in b) {
    data.jobCode = null;
    data.jobCodeNormalized = null;
  }

  // Location
  if ('location' in b && b.location !== undefined && b.location !== null && b.location !== '') {
    const val = b.location;
    if (typeof val !== 'string' || val.length > 250) {
      errors.location = 'Địa điểm làm việc không được vượt quá 250 ký tự.';
    } else {
      data.location = val.trim();
    }
  } else if (!isPatch || 'location' in b) {
    data.location = null;
  }

  // Work Mode
  if ('workMode' in b && b.workMode !== undefined && b.workMode !== null && b.workMode !== '') {
    const val = b.workMode as WorkMode;
    if (!WORK_MODES.includes(val)) {
      errors.workMode = `Hình thức làm việc phải là một trong các giá trị: ${WORK_MODES.join(', ')}.`;
    } else {
      data.workMode = val;
    }
  } else if (!isPatch || 'workMode' in b) {
    data.workMode = null;
  }

  // Applied At
  if ('appliedAt' in b && b.appliedAt !== undefined && b.appliedAt !== null && b.appliedAt !== '') {
    const val = b.appliedAt;
    if (typeof val !== 'string' || !isValidCalendarDate(val)) {
      errors.appliedAt = 'Ngày nộp hồ sơ không hợp lệ (định dạng hợp lệ: YYYY-MM-DD theo lịch chuẩn).';
    } else {
      data.appliedAt = val;
    }
  } else if (!isPatch || 'appliedAt' in b) {
    data.appliedAt = null;
  }

  // Salary
  if ('salary' in b && b.salary !== undefined && b.salary !== null && b.salary !== '') {
    const val = b.salary;
    if (typeof val !== 'string' || val.length > 250) {
      errors.salary = 'Mức lương không được vượt quá 250 ký tự.';
    } else {
      data.salary = val.trim();
    }
  } else if (!isPatch || 'salary' in b) {
    data.salary = null;
  }

  // Notes
  if ('notes' in b && b.notes !== undefined && b.notes !== null && b.notes !== '') {
    const val = b.notes;
    if (typeof val !== 'string' || val.length > 5000) {
      errors.notes = 'Ghi chú không được vượt quá 5000 ký tự.';
    } else {
      data.notes = val.trim();
    }
  } else if (!isPatch || 'notes' in b) {
    data.notes = null;
  }

  // Next Action
  if ('nextAction' in b && b.nextAction !== undefined && b.nextAction !== null && b.nextAction !== '') {
    const val = b.nextAction;
    if (typeof val !== 'string' || val.length > 250) {
      errors.nextAction = 'Hành động tiếp theo không được vượt quá 250 ký tự.';
    } else {
      data.nextAction = val.trim();
    }
  } else if (!isPatch || 'nextAction' in b) {
    data.nextAction = null;
  }

  // Deadline
  if ('deadline' in b && b.deadline !== undefined && b.deadline !== null && b.deadline !== '') {
    const val = b.deadline;
    if (typeof val !== 'string' || !isValidIsoInstant(val)) {
      errors.deadline = 'Hạn chót phải là mốc thời gian ISO 8601 hợp lệ (VD: 2026-10-20T09:00:00Z).';
    } else {
      data.deadline = val;
    }
  } else if (!isPatch || 'deadline' in b) {
    data.deadline = null;
  }

  // Deadline requires nextAction
  const effectiveDeadline = data.deadline !== undefined ? data.deadline : null;
  const effectiveNextAction = data.nextAction !== undefined ? data.nextAction : null;
  if (effectiveDeadline && !effectiveNextAction && (!isPatch || 'nextAction' in b)) {
    errors.nextAction = 'Cần nhập hành động tiếp theo khi có hạn chót.';
  }

  // Status
  if ('status' in b && b.status !== undefined) {
    const val = b.status as ApplicationStatus;
    if (!APPLICATION_STATUSES.includes(val)) {
      errors.status = `Trạng thái không hợp lệ. Cho phép: ${APPLICATION_STATUSES.join(', ')}.`;
    } else {
      data.status = val;
    }
  } else if (!isPatch) {
    data.status = 'Saved';
  }

  // Confirm Reapply
  const confirmReapply = b.confirmReapply === true;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu gửi lên chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: { ...data, confirmReapply }
  };
}

export function validateInterviewInput(
  rawBody: unknown,
  isPatch = false
): ValidationResult<ValidatedInterviewData> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Nội dung phỏng vấn chưa hợp lệ.',
      errors: { body: 'Dữ liệu phỏng vấn phải là một đối tượng JSON.' }
    };
  }

  const b = rawBody as Record<string, unknown>;
  const unknownFields = checkUnknownFields(b, INTERVIEW_ALLOWED_FIELDS);
  if (unknownFields.length > 0) {
    const fieldMap: Record<string, string> = {};
    for (const f of unknownFields) {
      fieldMap[f] = 'Trường không được hỗ trợ trong giao thức API.';
    }
    return {
      ok: false,
      message: 'Yêu cầu chứa trường không được hỗ trợ.',
      errors: fieldMap
    };
  }

  if (isPatch && Object.keys(b).length === 0) {
    return {
      ok: false,
      message: 'Cần ít nhất một trường để cập nhật phỏng vấn.',
      errors: { patch: 'Danh sách trường cập nhật trống.' }
    };
  }

  const errors: Record<string, string> = {};
  const data: Partial<ValidatedInterviewData> = {};

  // Title
  if (!isPatch || 'title' in b) {
    const val = b.title;
    if (typeof val !== 'string' || !val.trim()) {
      errors.title = 'Tiêu đề phỏng vấn là bắt buộc.';
    } else if (val.trim().length > 200) {
      errors.title = 'Tiêu đề phỏng vấn không được vượt quá 200 ký tự.';
    } else {
      data.title = val.trim();
    }
  }

  // At (Instant)
  if (!isPatch || 'at' in b) {
    const val = b.at;
    if (typeof val !== 'string' || !isValidIsoInstant(val)) {
      errors.at = 'Thời gian phỏng vấn phải là mốc thời gian ISO 8601 hợp lệ.';
    } else {
      data.at = val;
    }
  }

  // Timezone (IANA named zone or UTC)
  if (!isPatch || 'timezone' in b) {
    const val = b.timezone;
    if (typeof val !== 'string' || !isValidIanaTimezone(val)) {
      errors.timezone = 'Múi giờ phải là tên múi giờ IANA chuẩn (VD: Asia/Ho_Chi_Minh, UTC). Không dùng định dạng offset số.';
    } else {
      data.timezone = val.trim();
    }
  }

  // Format
  if (!isPatch || 'format' in b) {
    const val = b.format as InterviewFormat;
    if (!INTERVIEW_FORMATS.includes(val)) {
      errors.format = `Hình thức phỏng vấn phải là một trong: ${INTERVIEW_FORMATS.join(', ')}.`;
    } else {
      data.format = val;
    }
  }

  // Location
  if ('location' in b && b.location !== undefined && b.location !== null && b.location !== '') {
    const val = b.location;
    if (typeof val !== 'string' || val.length > 2000) {
      errors.location = 'Địa điểm phỏng vấn không được vượt quá 2000 ký tự.';
    } else {
      data.location = val.trim();
    }
  } else if (!isPatch || 'location' in b) {
    data.location = null;
  }

  // Preparation
  if ('preparation' in b && b.preparation !== undefined && b.preparation !== null && b.preparation !== '') {
    const val = b.preparation;
    if (typeof val !== 'string' || val.length > 5000) {
      errors.preparation = 'Chuẩn bị phỏng vấn không được vượt quá 5000 ký tự.';
    } else {
      data.preparation = val.trim();
    }
  } else if (!isPatch || 'preparation' in b) {
    data.preparation = null;
  }

  // Notes
  if ('notes' in b && b.notes !== undefined && b.notes !== null && b.notes !== '') {
    const val = b.notes;
    if (typeof val !== 'string' || val.length > 5000) {
      errors.notes = 'Ghi chú phỏng vấn không được vượt quá 5000 ký tự.';
    } else {
      data.notes = val.trim();
    }
  } else if (!isPatch || 'notes' in b) {
    data.notes = null;
  }

  // Status
  if ('status' in b && b.status !== undefined) {
    const val = b.status as InterviewStatus;
    if (!INTERVIEW_STATUSES.includes(val)) {
      errors.status = `Trạng thái phỏng vấn phải là một trong: ${INTERVIEW_STATUSES.join(', ')}.`;
    } else {
      data.status = val;
    }
  } else if (!isPatch) {
    data.status = 'Scheduled';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu phỏng vấn chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: data as ValidatedInterviewData
  };
}

export function validateListQuery(query: Record<string, unknown>): ValidationResult<{
  q: string;
  status: ApplicationStatus | 'all';
  sort: SortOption;
  includeDeleted: boolean;
}> {
  const allowed = new Set(['q', 'status', 'sort', 'includeDeleted']);
  const unknown = Object.keys(query).filter(k => !allowed.has(k));
  if (unknown.length > 0) {
    const errors: Record<string, string> = {};
    for (const u of unknown) {
      errors[u] = 'Tham số truy vấn không được hỗ trợ.';
    }
    return {
      ok: false,
      message: 'Yêu cầu chứa tham số tìm kiếm không được hỗ trợ.',
      errors
    };
  }

  const q = typeof query.q === 'string' ? query.q.trim() : '';
  let status: ApplicationStatus | 'all' = 'all';
  if (query.status) {
    const s = String(query.status);
    if (s !== 'all' && !APPLICATION_STATUSES.includes(s as ApplicationStatus)) {
      return {
        ok: false,
        message: 'Trạng thái lọc không hợp lệ.',
        errors: { status: `Trạng thái phải là 'all' hoặc một trong: ${APPLICATION_STATUSES.join(', ')}.` }
      };
    }
    status = s as ApplicationStatus | 'all';
  }

  let sort: SortOption = 'createdAt:desc';
  if (query.sort) {
    const s = String(query.sort) as SortOption;
    if (!SORT_ALLOWLIST.includes(s)) {
      return {
        ok: false,
        message: 'Tùy chọn sắp xếp không hợp lệ.',
        errors: { sort: `Tùy chọn sắp xếp phải là một trong: ${SORT_ALLOWLIST.join(', ')}.` }
      };
    }
    sort = s;
  }

  let includeDeleted = false;
  if ('includeDeleted' in query) {
    const val = query.includeDeleted;
    if (val === 'true' || val === true || val === '1') {
      includeDeleted = true;
    } else if (val === 'false' || val === false || val === '0' || val === undefined || val === '') {
      includeDeleted = false;
    } else {
      return {
        ok: false,
        message: 'Tham số includeDeleted không hợp lệ.',
        errors: { includeDeleted: 'includeDeleted phải là giá trị boolean (true/false).' }
      };
    }
  }

  return {
    ok: true,
    data: { q, status, sort, includeDeleted }
  };
}

const PROFILE_ALLOWED_FIELDS = new Set([
  'fullName',
  'email',
  'phone',
  'cvUrl',
  'portfolioUrl',
  'skills',
  'bio',
  'customAnswers',
  'expectedUpdatedAt'
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+0-9()\s.-]+$/;

function isValidHttpUrl(str: string): boolean {
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateCandidateProfileInput(rawBody: unknown): ValidationResult<CandidateProfileMutationInput> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu hồ sơ ứng viên không hợp lệ.',
      errors: { _root: 'Nội dung yêu cầu phải là JSON object.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const unknown = Object.keys(body).filter(k => !PROFILE_ALLOWED_FIELDS.has(k));
  if (unknown.length > 0) {
    for (const u of unknown) {
      errors[u] = 'Trường không được hỗ trợ.';
    }
  }

  let fullName = '';
  if (typeof body.fullName !== 'string' || !body.fullName.trim()) {
    errors.fullName = 'Họ và tên không được để trống.';
  } else if (body.fullName.trim().length > 120) {
    errors.fullName = 'Họ và tên không được vượt quá 120 ký tự.';
  } else {
    fullName = body.fullName.trim();
  }

  let email = '';
  if (typeof body.email !== 'string' || !body.email.trim()) {
    errors.email = 'Email không được để trống.';
  } else if (body.email.trim().length > 254 || !EMAIL_REGEX.test(body.email.trim())) {
    errors.email = 'Email không đúng định dạng hợp lệ.';
  } else {
    email = body.email.trim().toLowerCase();
  }

  let phone: string | null = null;
  if ('phone' in body && body.phone !== null && body.phone !== undefined && body.phone !== '') {
    if (typeof body.phone !== 'string') {
      errors.phone = 'Số điện thoại phải là chuỗi ký tự.';
    } else if (body.phone.trim().length > 30 || !PHONE_REGEX.test(body.phone.trim())) {
      errors.phone = 'Số điện thoại không đúng định dạng hợp lệ.';
    } else {
      phone = body.phone.trim();
    }
  }

  let cvUrl: string | null = null;
  if ('cvUrl' in body && body.cvUrl !== null && body.cvUrl !== undefined && body.cvUrl !== '') {
    if (typeof body.cvUrl !== 'string') {
      errors.cvUrl = 'Đường dẫn CV phải là chuỗi ký tự.';
    } else if (body.cvUrl.trim().length > 2048 || !isValidHttpUrl(body.cvUrl.trim())) {
      errors.cvUrl = 'Đường dẫn CV phải là liên kết web hợp lệ (http hoặc https).';
    } else {
      cvUrl = body.cvUrl.trim();
    }
  }

  let portfolioUrl: string | null = null;
  if ('portfolioUrl' in body && body.portfolioUrl !== null && body.portfolioUrl !== undefined && body.portfolioUrl !== '') {
    if (typeof body.portfolioUrl !== 'string') {
      errors.portfolioUrl = 'Đường dẫn Portfolio phải là chuỗi ký tự.';
    } else if (body.portfolioUrl.trim().length > 2048 || !isValidHttpUrl(body.portfolioUrl.trim())) {
      errors.portfolioUrl = 'Đường dẫn Portfolio phải là liên kết web hợp lệ (http hoặc https).';
    } else {
      portfolioUrl = body.portfolioUrl.trim();
    }
  }

  let skills: string[] = [];
  if ('skills' in body && body.skills !== null && body.skills !== undefined) {
    if (!Array.isArray(body.skills)) {
      errors.skills = 'Danh sách kỹ năng phải là mảng chuỗi ký tự.';
    } else if (body.skills.length > 50) {
      errors.skills = 'Danh sách kỹ năng không được vượt quá 50 phần tử.';
    } else {
      for (let i = 0; i < body.skills.length; i++) {
        const item = body.skills[i];
        if (typeof item !== 'string') {
          errors.skills = 'Từng kỹ năng trong danh sách phải là chuỗi ký tự.';
          break;
        } else if (item.trim().length > 50) {
          errors.skills = 'Tên kỹ năng không được vượt quá 50 ký tự.';
          break;
        } else if (item.trim()) {
          skills.push(item.trim());
        }
      }
    }
  }

  let bio: string | null = null;
  if ('bio' in body && body.bio !== null && body.bio !== undefined && body.bio !== '') {
    if (typeof body.bio !== 'string') {
      errors.bio = 'Mô tả bản thân phải là chuỗi ký tự.';
    } else if (body.bio.trim().length > 2000) {
      errors.bio = 'Mô tả bản thân không được vượt quá 2000 ký tự.';
    } else {
      bio = body.bio.trim();
    }
  }

  let customAnswers: Record<string, string> | undefined = undefined;
  if ('customAnswers' in body && body.customAnswers !== null && body.customAnswers !== undefined) {
    customAnswers = {};
    if (typeof body.customAnswers !== 'object' || Array.isArray(body.customAnswers)) {
      errors.customAnswers = 'Câu trả lời tùy chỉnh phải là đối tượng JSON.';
    } else {
      const entries = Object.entries(body.customAnswers as Record<string, unknown>);
      if (entries.length > 50) {
        errors.customAnswers = 'Số lượng câu trả lời tùy chỉnh không được vượt quá 50.';
      } else {
        for (const [k, v] of entries) {
          if (typeof v !== 'string' || v.length > 1000) {
            errors.customAnswers = `Giá trị của '${k}' phải là chuỗi ký tự không quá 1000 ký tự.`;
            break;
          }
          customAnswers[k] = v;
        }
      }
    }
  }

  let expectedUpdatedAt: string | null = null;
  if ('expectedUpdatedAt' in body && body.expectedUpdatedAt !== null && body.expectedUpdatedAt !== undefined) {
    if (typeof body.expectedUpdatedAt !== 'string') {
      errors.expectedUpdatedAt = 'expectedUpdatedAt phải là chuỗi thời gian hợp lệ.';
    } else {
      expectedUpdatedAt = body.expectedUpdatedAt.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu hồ sơ ứng viên chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      email,
      phone,
      cvUrl,
      portfolioUrl,
      skills,
      bio,
      customAnswers,
      expectedUpdatedAt
    }
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateBulkStatusInput(rawBody: unknown): ValidationResult<BulkStatusUpdateDTO> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu cập nhật hàng loạt không hợp lệ.',
      errors: { _root: 'Nội dung yêu cầu phải là JSON object.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const unknown = Object.keys(body).filter(k => k !== 'ids' && k !== 'status');
  if (unknown.length > 0) {
    for (const u of unknown) {
      errors[u] = 'Trường không được hỗ trợ.';
    }
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    errors.ids = 'Danh sách mã hồ sơ không được để trống.';
  } else if (body.ids.length > 100) {
    errors.ids = 'Số lượng hồ sơ mỗi lần thao tác không được vượt quá 100.';
  } else {
    for (let i = 0; i < body.ids.length; i++) {
      const id = body.ids[i];
      if (typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
        errors.ids = 'Mã hồ sơ trong danh sách không đúng định dạng UUID.';
        break;
      }
    }
  }

  if (!body.status || typeof body.status !== 'string' || !APPLICATION_STATUSES.includes(body.status as ApplicationStatus)) {
    errors.status = 'Trạng thái ứng tuyển không hợp lệ.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu thao tác hàng loạt chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      ids: (body.ids as string[]).map(id => id.trim()),
      status: body.status as ApplicationStatus
    }
  };
}

export function validateBulkTrashInput(rawBody: unknown): ValidationResult<BulkTrashDTO> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu chuyển thùng rác hàng loạt không hợp lệ.',
      errors: { _root: 'Nội dung yêu cầu phải là JSON object.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const unknown = Object.keys(body).filter(k => k !== 'ids');
  if (unknown.length > 0) {
    for (const u of unknown) {
      errors[u] = 'Trường không được hỗ trợ.';
    }
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    errors.ids = 'Danh sách mã hồ sơ không được để trống.';
  } else if (body.ids.length > 100) {
    errors.ids = 'Số lượng hồ sơ mỗi lần thao tác không được vượt quá 100.';
  } else {
    for (let i = 0; i < body.ids.length; i++) {
      const id = body.ids[i];
      if (typeof id !== 'string' || !UUID_REGEX.test(id.trim())) {
        errors.ids = 'Mã hồ sơ trong danh sách không đúng định dạng UUID.';
        break;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu chuyển thùng rác hàng loạt chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      ids: (body.ids as string[]).map(id => id.trim())
    }
  };
}

export function validateInterviewPrepInput(rawBody: unknown): ValidationResult<InterviewPrepRequestDTO> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu chuẩn bị phỏng vấn không hợp lệ.',
      errors: { _root: 'Nội dung yêu cầu phải là JSON object.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const allowedKeys = new Set(['company', 'position', 'roundTitle', 'notes', 'skills', 'domainTrack']);
  const unknown = Object.keys(body).filter(k => !allowedKeys.has(k));
  if (unknown.length > 0) {
    for (const u of unknown) {
      errors[u] = 'Trường không được hỗ trợ.';
    }
  }

  let position = '';
  if (!body.position || typeof body.position !== 'string' || !body.position.trim()) {
    errors.position = 'Vị trí ứng tuyển là bắt buộc.';
  } else if (body.position.trim().length > 250) {
    errors.position = 'Vị trí ứng tuyển không được vượt quá 250 ký tự.';
  } else {
    position = body.position.trim();
  }

  let company = '';
  if ('company' in body && body.company !== undefined && body.company !== null) {
    if (typeof body.company !== 'string') {
      errors.company = 'Tên công ty phải là chuỗi ký tự.';
    } else if (body.company.trim().length > 250) {
      errors.company = 'Tên công ty không được vượt quá 250 ký tự.';
    } else {
      company = body.company.trim();
    }
  }

  let roundTitle: string | undefined = undefined;
  if ('roundTitle' in body && body.roundTitle !== undefined && body.roundTitle !== null) {
    if (typeof body.roundTitle !== 'string') {
      errors.roundTitle = 'Tên vòng phỏng vấn phải là chuỗi ký tự.';
    } else {
      roundTitle = body.roundTitle.trim();
    }
  }

  let notes: string | null = null;
  if ('notes' in body && body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') {
      errors.notes = 'Ghi chú phải là chuỗi ký tự.';
    } else {
      notes = body.notes.trim();
    }
  }

  let skills: string[] | undefined = undefined;
  if ('skills' in body && body.skills !== undefined && body.skills !== null) {
    if (!Array.isArray(body.skills)) {
      errors.skills = 'Kỹ năng phải là một mảng chuỗi ký tự.';
    } else {
      skills = [];
      for (const s of body.skills) {
        if (typeof s === 'string' && s.trim()) {
          skills.push(s.trim());
        }
      }
    }
  }

  let domainTrack: DomainTrack | undefined = undefined;
  if ('domainTrack' in body && body.domainTrack !== undefined && body.domainTrack !== null) {
    if (typeof body.domainTrack !== 'string' || !DOMAIN_TRACKS.includes(body.domainTrack as DomainTrack)) {
      errors.domainTrack = 'Chuyên môn phỏng vấn không hợp lệ.';
    } else {
      domainTrack = body.domainTrack as DomainTrack;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu chuẩn bị phỏng vấn chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      position,
      company,
      roundTitle,
      notes,
      skills,
      domainTrack
    }
  };
}

export function validateInterviewEvaluateInput(rawBody: unknown): ValidationResult<InterviewEvaluateRequestDTO> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu đánh giá câu trả lời không hợp lệ.',
      errors: { _root: 'Nội dung yêu cầu phải là JSON object.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const allowedKeys = new Set(['questionId', 'question', 'category', 'answer', 'targetRole', 'company']);
  const unknown = Object.keys(body).filter(k => !allowedKeys.has(k));
  if (unknown.length > 0) {
    for (const u of unknown) {
      errors[u] = 'Trường không được hỗ trợ.';
    }
  }

  let questionId = '';
  if (typeof body.questionId === 'string' && body.questionId.trim()) {
    questionId = body.questionId.trim();
  }

  let question = '';
  if (!body.question || typeof body.question !== 'string' || !body.question.trim()) {
    errors.question = 'Câu hỏi phỏng vấn là bắt buộc.';
  } else if (body.question.trim().length > 1000) {
    errors.question = 'Câu hỏi không được vượt quá 1000 ký tự.';
  } else {
    question = body.question.trim();
  }

  let category: InterviewQuestionCategory = 'behavioral';
  if (!body.category || typeof body.category !== 'string' || !INTERVIEW_QUESTION_CATEGORIES.includes(body.category as InterviewQuestionCategory)) {
    errors.category = 'Danh mục câu hỏi không hợp lệ.';
  } else {
    category = body.category as InterviewQuestionCategory;
  }

  let answer = '';
  if (!body.answer || typeof body.answer !== 'string' || !body.answer.trim()) {
    errors.answer = 'Câu trả lời của bạn là bắt buộc.';
  } else if (body.answer.trim().length < 5) {
    errors.answer = 'Câu trả lời quá ngắn (cần tối thiểu 5 ký tự).';
  } else if (body.answer.trim().length > 10000) {
    errors.answer = 'Câu trả lời không được vượt quá 10.000 ký tự.';
  } else {
    answer = body.answer.trim();
  }

  let targetRole: string | undefined = undefined;
  if ('targetRole' in body && body.targetRole !== undefined && body.targetRole !== null) {
    if (typeof body.targetRole !== 'string') {
      errors.targetRole = 'Vị trí ứng tuyển phải là chuỗi ký tự.';
    } else {
      targetRole = body.targetRole.trim();
    }
  }

  let company: string | undefined = undefined;
  if ('company' in body && body.company !== undefined && body.company !== null) {
    if (typeof body.company !== 'string') {
      errors.company = 'Tên công ty phải là chuỗi ký tự.';
    } else {
      company = body.company.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu đánh giá câu trả lời chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      questionId,
      question,
      category,
      answer,
      targetRole,
      company
    }
  };
}

export function validateCsvImportRequest(rawBody: unknown): ValidationResult<CsvImportRequestDTO> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu tải lên phải là một đối tượng JSON hợp lệ.',
      errors: { body: 'Đối tượng body không đúng định dạng.' }
    };
  }

  const body = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const allowedKeys = new Set(['rows', 'skipDuplicates']);
  for (const k of Object.keys(body)) {
    if (!allowedKeys.has(k)) {
      errors[k] = `Trường "${k}" không được phép trong yêu cầu nhập CSV.`;
    }
  }

  if (!('rows' in body) || !Array.isArray(body.rows)) {
    errors.rows = 'Danh sách dòng dữ liệu (rows) là bắt buộc và phải là một mảng.';
    return {
      ok: false,
      message: 'Dữ liệu nhập CSV chưa hợp lệ.',
      errors
    };
  }

  const rawRows = body.rows as unknown[];
  if (rawRows.length === 0) {
    errors.rows = 'Danh sách dòng dữ liệu không được để trống.';
  } else if (rawRows.length > 500) {
    errors.rows = 'Số lượng dòng nhập mỗi lần không được vượt quá 500 dòng.';
  }

  const validatedRows: CsvImportItemInput[] = [];
  const validStatuses: Set<ApplicationStatus> = new Set(['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn']);
  const validWorkModes: Set<WorkMode> = new Set(['On-site', 'Hybrid', 'Remote']);

  for (let i = 0; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || typeof r !== 'object' || Array.isArray(r)) {
      errors[`rows[${i}]`] = `Dòng thứ ${i + 1} phải là một đối tượng dữ liệu.`;
      continue;
    }

    const rowObj = r as Record<string, unknown>;
    const rowAllowedKeys = new Set([
      'company', 'position', 'status', 'appliedAt', 'salary',
      'location', 'workMode', 'nextAction', 'deadline',
      'source', 'jobCode', 'url', 'notes'
    ]);

    for (const rk of Object.keys(rowObj)) {
      if (!rowAllowedKeys.has(rk)) {
        errors[`rows[${i}].${rk}`] = `Trường "${rk}" không được hỗ trợ trong dòng dữ liệu.`;
      }
    }

    if (typeof rowObj.company !== 'string' || !rowObj.company.trim()) {
      errors[`rows[${i}].company`] = `Dòng thứ ${i + 1} thiếu tên công ty.`;
    } else if (rowObj.company.trim().length > 250) {
      errors[`rows[${i}].company`] = `Dòng thứ ${i + 1} tên công ty vượt quá 250 ký tự.`;
    }

    if (typeof rowObj.position !== 'string' || !rowObj.position.trim()) {
      errors[`rows[${i}].position`] = `Dòng thứ ${i + 1} thiếu vị trí ứng tuyển.`;
    } else if (rowObj.position.trim().length > 250) {
      errors[`rows[${i}].position`] = `Dòng thứ ${i + 1} vị trí ứng tuyển vượt quá 250 ký tự.`;
    }

    let status: ApplicationStatus | undefined = undefined;
    if ('status' in rowObj && rowObj.status !== undefined && rowObj.status !== null) {
      if (typeof rowObj.status !== 'string' || !validStatuses.has(rowObj.status as ApplicationStatus)) {
        errors[`rows[${i}].status`] = `Trạng thái "${String(rowObj.status)}" không hợp lệ.`;
      } else {
        status = rowObj.status as ApplicationStatus;
      }
    }

    let workMode: WorkMode | null = null;
    if ('workMode' in rowObj && rowObj.workMode !== undefined && rowObj.workMode !== null) {
      if (typeof rowObj.workMode !== 'string' || !validWorkModes.has(rowObj.workMode as WorkMode)) {
        errors[`rows[${i}].workMode`] = `Hình thức làm việc "${String(rowObj.workMode)}" không hợp lệ.`;
      } else {
        workMode = rowObj.workMode as WorkMode;
      }
    }

    let appliedAt: string | null = null;
    if ('appliedAt' in rowObj && rowObj.appliedAt !== undefined && rowObj.appliedAt !== null) {
      if (typeof rowObj.appliedAt !== 'string') {
        errors[`rows[${i}].appliedAt`] = `Ngày ứng tuyển phải là chuỗi ký tự.`;
      } else if (rowObj.appliedAt.trim()) {
        const d = rowObj.appliedAt.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !isValidCalendarDate(d)) {
          errors[`rows[${i}].appliedAt`] = `Ngày ứng tuyển "${d}" không đúng lịch hoặc định dạng YYYY-MM-DD.`;
        } else {
          appliedAt = d;
        }
      }
    }

    let url: string | null = null;
    if ('url' in rowObj && rowObj.url !== undefined && rowObj.url !== null) {
      if (typeof rowObj.url !== 'string') {
        errors[`rows[${i}].url`] = `Đường dẫn URL phải là chuỗi ký tự.`;
      } else if (rowObj.url.trim()) {
        const u = rowObj.url.trim();
        if (u.length > 2000) {
          errors[`rows[${i}].url`] = `Đường dẫn URL vượt quá 2000 ký tự.`;
        } else if (!/^https?:\/\//i.test(u)) {
          errors[`rows[${i}].url`] = `Đường dẫn URL phải bắt đầu bằng http:// hoặc https://.`;
        } else {
          url = u;
        }
      }
    }

    validatedRows.push({
      company: typeof rowObj.company === 'string' ? rowObj.company.trim() : '',
      position: typeof rowObj.position === 'string' ? rowObj.position.trim() : '',
      status: status || 'Saved',
      appliedAt,
      salary: typeof rowObj.salary === 'string' && rowObj.salary.trim() ? rowObj.salary.trim().slice(0, 250) : null,
      location: typeof rowObj.location === 'string' && rowObj.location.trim() ? rowObj.location.trim().slice(0, 250) : null,
      workMode,
      nextAction: typeof rowObj.nextAction === 'string' && rowObj.nextAction.trim() ? rowObj.nextAction.trim().slice(0, 250) : null,
      deadline: typeof rowObj.deadline === 'string' && rowObj.deadline.trim() ? rowObj.deadline.trim().slice(0, 50) : null,
      source: typeof rowObj.source === 'string' && rowObj.source.trim() ? rowObj.source.trim().slice(0, 100) : null,
      jobCode: typeof rowObj.jobCode === 'string' && rowObj.jobCode.trim() ? rowObj.jobCode.trim().slice(0, 100) : null,
      url,
      notes: typeof rowObj.notes === 'string' && rowObj.notes.trim() ? rowObj.notes.trim().slice(0, 5000) : null
    });
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu nhập CSV chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      rows: validatedRows,
      skipDuplicates: body.skipDuplicates !== false
    }
  };
}


export function validateOfferEvaluationInput(rawBody: unknown): ValidationResult<OfferEvaluationInput> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu gửi lên phải là một đối tượng JSON.',
      errors: { body: 'Đối tượng body không đúng định dạng.' }
    };
  }

  const b = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const allowedKeys = new Set(['applicationId', 'company', 'position', 'compensation', 'workplaceFactors', 'weights']);
  for (const k of Object.keys(b)) {
    if (!allowedKeys.has(k)) {
      errors[k] = `Trường "${k}" không được phép trong yêu cầu đánh giá offer.`;
    }
  }

  if (typeof b.company !== 'string' || !b.company.trim()) {
    errors.company = 'Tên công ty là bắt buộc.';
  } else if (b.company.trim().length > 250) {
    errors.company = 'Tên công ty không được vượt quá 250 ký tự.';
  }

  if (typeof b.position !== 'string' || !b.position.trim()) {
    errors.position = 'Vị trí công việc là bắt buộc.';
  } else if (b.position.trim().length > 250) {
    errors.position = 'Vị trí công việc không được vượt quá 250 ký tự.';
  }

  if (!b.compensation || typeof b.compensation !== 'object' || Array.isArray(b.compensation)) {
    errors.compensation = 'Thông tin thù lao (compensation) là bắt buộc và phải là đối tượng.';
  }

  const comp = (b.compensation || {}) as Record<string, unknown>;
  const baseSalary = Number(comp.baseSalaryMonthly);
  if (isNaN(baseSalary) || baseSalary <= 0) {
    errors['compensation.baseSalaryMonthly'] = 'Lương cơ bản hàng tháng phải là một số dương lớn hơn 0.';
  } else if (baseSalary > 10000000000) {
    errors['compensation.baseSalaryMonthly'] = 'Lương cơ bản vượt quá giới hạn hệ thống cho phép.';
  }

  let currency: 'VND' | 'USD' = 'VND';
  if ('currency' in comp && comp.currency !== undefined && comp.currency !== null) {
    if (comp.currency !== 'VND' && comp.currency !== 'USD') {
      errors['compensation.currency'] = 'Loại tiền tệ chỉ chấp nhận "VND" hoặc "USD".';
    } else {
      currency = comp.currency;
    }
  }

  let bonusMonths = 1;
  if ('bonusMonthsPerYear' in comp && comp.bonusMonthsPerYear !== undefined && comp.bonusMonthsPerYear !== null) {
    const bm = Number(comp.bonusMonthsPerYear);
    if (isNaN(bm) || bm < 0 || bm > 12) {
      errors['compensation.bonusMonthsPerYear'] = 'Số tháng thưởng hàng năm phải từ 0 đến 12 tháng.';
    } else {
      bonusMonths = bm;
    }
  }

  let annualBonusCash = 0;
  if ('annualBonusCash' in comp && comp.annualBonusCash !== undefined && comp.annualBonusCash !== null) {
    const abc = Number(comp.annualBonusCash);
    if (isNaN(abc) || abc < 0) {
      errors['compensation.annualBonusCash'] = 'Thưởng tiền mặt hàng năm không được là số âm.';
    } else {
      annualBonusCash = abc;
    }
  }

  let stockAnnual = 0;
  if ('stockOptionsOrEquityAnnual' in comp && comp.stockOptionsOrEquityAnnual !== undefined && comp.stockOptionsOrEquityAnnual !== null) {
    const sa = Number(comp.stockOptionsOrEquityAnnual);
    if (isNaN(sa) || sa < 0) {
      errors['compensation.stockOptionsOrEquityAnnual'] = 'Giá trị cổ phiếu/ESOP hàng năm không được là số âm.';
    } else {
      stockAnnual = sa;
    }
  }

  let allowanceMonthly = 0;
  if ('allowanceMonthly' in comp && comp.allowanceMonthly !== undefined && comp.allowanceMonthly !== null) {
    const am = Number(comp.allowanceMonthly);
    if (isNaN(am) || am < 0) {
      errors['compensation.allowanceMonthly'] = 'Phụ cấp hàng tháng không được là số âm.';
    } else {
      allowanceMonthly = am;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu đánh giá offer chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof b.applicationId === 'string' ? b.applicationId : undefined,
      company: (b.company as string).trim(),
      position: (b.position as string).trim(),
      compensation: {
        baseSalaryMonthly: baseSalary,
        currency,
        bonusMonthsPerYear: bonusMonths,
        annualBonusCash,
        stockOptionsOrEquityAnnual: stockAnnual,
        allowanceMonthly
      },
      workplaceFactors: b.workplaceFactors as OfferEvaluationInput['workplaceFactors'],
      weights: b.weights as OfferEvaluationInput['weights']
    }
  };
}

export function validateOfferComparisonInput(rawBody: unknown): ValidationResult<OfferComparisonInput> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu gửi lên phải là một đối tượng JSON.',
      errors: { body: 'Đối tượng body không đúng định dạng.' }
    };
  }

  const b = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!('offers' in b) || !Array.isArray(b.offers)) {
    errors.offers = 'Danh sách lời mời làm việc (offers) là bắt buộc và phải là một mảng.';
    return { ok: false, message: 'Dữ liệu so sánh offer chưa hợp lệ.', errors };
  }

  const rawOffers = b.offers as unknown[];
  if (rawOffers.length < 2) {
    errors.offers = 'Cần ít nhất 2 lời mời làm việc để tiến hành so sánh đối chiếu.';
  } else if (rawOffers.length > 5) {
    errors.offers = 'Số lượng lời mời so sánh cùng lúc không được vượt quá 5.';
  }

  const validatedOffers: OfferEvaluationInput[] = [];
  for (let i = 0; i < rawOffers.length; i++) {
    const item = rawOffers[i];
    const val = validateOfferEvaluationInput(item);
    if (!val.ok) {
      for (const [k, msg] of Object.entries(val.errors)) {
        errors[`offers[${i}].${k}`] = msg;
      }
    } else {
      validatedOffers.push(val.data);
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Danh sách offer so sánh có dữ liệu chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      offers: validatedOffers
    }
  };
}

export function validateCounterOfferInput(rawBody: unknown): ValidationResult<CounterOfferNegotiationInput> {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    return {
      ok: false,
      message: 'Dữ liệu gửi lên phải là một đối tượng JSON.',
      errors: { body: 'Đối tượng body không đúng định dạng.' }
    };
  }

  const b = rawBody as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.offer || typeof b.offer !== 'object' || Array.isArray(b.offer)) {
    errors.offer = 'Thông tin offer hiện tại là bắt buộc.';
  }

  const targetSalary = Number(b.targetSalary);
  if (isNaN(targetSalary) || targetSalary <= 0) {
    errors.targetSalary = 'Mức lương đàm phán kỳ vọng phải là số dương lớn hơn 0.';
  }

  const allowedTones: Set<NegotiationTone> = new Set(['polite_confident', 'collaborative', 'firm_competitive']);
  let tone: NegotiationTone = 'polite_confident';
  if ('tone' in b && b.tone !== undefined && b.tone !== null) {
    if (typeof b.tone !== 'string' || !allowedTones.has(b.tone as NegotiationTone)) {
      errors.tone = 'Phong cách đàm phán không hợp lệ.';
    } else {
      tone = b.tone as NegotiationTone;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu yêu cầu tạo kịch bản đàm phán chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      offer: b.offer as OfferEvaluationDTO,
      targetSalary,
      tone,
      competitiveOffer: b.competitiveOffer as CounterOfferNegotiationInput['competitiveOffer'],
      keyStrengths: Array.isArray(b.keyStrengths) ? b.keyStrengths.map(String) : undefined
    }
  };
}
