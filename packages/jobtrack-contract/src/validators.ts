import {
  APPLICATION_STATUSES,
  WORK_MODES,
  INTERVIEW_FORMATS,
  INTERVIEW_STATUSES,
  SORT_ALLOWLIST,
  type ApplicationStatus,
  type WorkMode,
  type InterviewFormat,
  type InterviewStatus,
  type SortOption
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
