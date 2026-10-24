import type {
  CsvImportItemInput,
  CsvImportPreviewDTO,
  CsvImportRowDTO,
  ApplicationStatus,
  WorkMode
} from './types.ts';
import { isValidCalendarDate } from './time.ts';

const HEADER_MAP: Record<string, keyof CsvImportItemInput> = {
  'công ty': 'company',
  'cong ty': 'company',
  'tên công ty': 'company',
  'ten cong ty': 'company',
  'company': 'company',
  'company name': 'company',
  'doanh nghiệp': 'company',
  'organization': 'company',

  'vị trí': 'position',
  'vi tri': 'position',
  'vị trí ứng tuyển': 'position',
  'vi tri ung tuyen': 'position',
  'chức danh': 'position',
  'chuc danh': 'position',
  'position': 'position',
  'job title': 'position',
  'title': 'position',
  'role': 'position',

  'trạng thái': 'status',
  'trang thai': 'status',
  'tình trạng': 'status',
  'tinh trang': 'status',
  'status': 'status',

  'ngày nộp': 'appliedAt',
  'ngay nop': 'appliedAt',
  'ngày ứng tuyển': 'appliedAt',
  'ngay ung tuyen': 'appliedAt',
  'ngày': 'appliedAt',
  'ngay': 'appliedAt',
  'applied at': 'appliedAt',
  'appliedat': 'appliedAt',
  'date applied': 'appliedAt',
  'date_applied': 'appliedAt',
  'dateapplied': 'appliedAt',
  'date': 'appliedAt',

  'mức lương': 'salary',
  'muc luong': 'salary',
  'lương': 'salary',
  'luong': 'salary',
  'salary': 'salary',
  'compensation': 'salary',
  'pay': 'salary',

  'địa điểm': 'location',
  'dia diem': 'location',
  'nơi làm việc': 'location',
  'noi lam viec': 'location',
  'thành phố': 'location',
  'location': 'location',
  'city': 'location',

  'hình thức': 'workMode',
  'hinh thuc': 'workMode',
  'hình thức làm việc': 'workMode',
  'chế độ làm việc': 'workMode',
  'work mode': 'workMode',
  'workmode': 'workMode',
  'work_mode': 'workMode',
  'work type': 'workMode',

  'bước tiếp theo': 'nextAction',
  'buoc tiep theo': 'nextAction',
  'hành động tiếp theo': 'nextAction',
  'hanh dong tiep theo': 'nextAction',
  'việc tiếp theo': 'nextAction',
  'next action': 'nextAction',
  'nextaction': 'nextAction',
  'next_action': 'nextAction',

  'hạn chót': 'deadline',
  'han chot': 'deadline',
  'deadline': 'deadline',
  'due date': 'deadline',

  'nguồn': 'source',
  'nguon': 'source',
  'nguồn tin': 'source',
  'nguon tin': 'source',
  'source': 'source',

  'mã tin': 'jobCode',
  'ma tin': 'jobCode',
  'mã tuyển dụng': 'jobCode',
  'job code': 'jobCode',
  'jobcode': 'jobCode',
  'job_code': 'jobCode',

  'link': 'url',
  'url': 'url',
  'đường dẫn': 'url',
  'duong dan': 'url',
  'link tin': 'url',
  'job url': 'url',
  'website': 'url',

  'ghi chú': 'notes',
  'ghi chu': 'notes',
  'mô tả': 'notes',
  'mo ta': 'notes',
  'notes': 'notes',
  'note': 'notes',
  'description': 'notes'
};

const STATUS_MAP: Record<string, ApplicationStatus> = {
  'đã lưu': 'Saved',
  'da luu': 'Saved',
  'lưu': 'Saved',
  'luu': 'Saved',
  'saved': 'Saved',

  'đã nộp': 'Applied',
  'da nop': 'Applied',
  'nộp': 'Applied',
  'nop': 'Applied',
  'đã ứng tuyển': 'Applied',
  'da ung tuyen': 'Applied',
  'ứng tuyển': 'Applied',
  'applied': 'Applied',

  'sàng lọc': 'Screening',
  'sang loc': 'Screening',
  'hồ sơ': 'Screening',
  'screening': 'Screening',

  'phỏng vấn': 'Interview',
  'phong van': 'Interview',
  'pv': 'Interview',
  'interview': 'Interview',

  'offer': 'Offer',
  'nhận offer': 'Offer',
  'trúng tuyển': 'Offer',
  'trung tuyen': 'Offer',
  'accepted': 'Offer',

  'từ chối': 'Rejected',
  'tu choi': 'Rejected',
  'tạch': 'Rejected',
  'tach': 'Rejected',
  'không phù hợp': 'Rejected',
  'rejected': 'Rejected',

  'đã rút': 'Withdrawn',
  'da rut': 'Withdrawn',
  'rút': 'Withdrawn',
  'rút hồ sơ': 'Withdrawn',
  'withdrawn': 'Withdrawn'
};

const WORK_MODE_MAP: Record<string, WorkMode> = {
  'tại văn phòng': 'On-site',
  'tai van phong': 'On-site',
  'onsite': 'On-site',
  'on-site': 'On-site',
  'office': 'On-site',

  'từ xa': 'Remote',
  'tu xa': 'Remote',
  'remote': 'Remote',

  'kết hợp': 'Hybrid',
  'ket hop': 'Hybrid',
  'hybrid': 'Hybrid'
};

export function neutralizeFormula(cell: string): string {
  if (!cell) return '';
  const trimmed = cell.trim();
  if (/^'(=|\+|-|@|\t|\r)/.test(trimmed)) {
    return trimmed.slice(1);
  }
  if (/^(=|\+|-|@|\t|\r)/.test(trimmed)) {
    return trimmed.replace(/^(=|\+|-|@|\t|\r)+/, '').trim();
  }
  return trimmed;
}

export function parseCsvRawRecords(csvText: string): {
  records: string[][];
  delimiter: ',' | ';';
  hasBom: boolean;
} {
  let text = csvText || '';
  let hasBom = false;

  if (text.charCodeAt(0) === 0xfeff) {
    hasBom = true;
    text = text.slice(1);
  }

  const firstLine = text.split(/\r\n|\r|\n/)[0] || '';
  let commaCount = 0;
  let semiCount = 0;
  let inQ = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQ = !inQ;
    else if (!inQ) {
      if (ch === ',') commaCount++;
      else if (ch === ';') semiCount++;
    }
  }

  const delimiter: ',' | ';' = semiCount > commaCount ? ';' : ',';

  const records: string[][] = [];
  let currentRecord: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];

    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentField += '"';
          i += 2;
        } else {
          insideQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
        i++;
      } else if (char === delimiter) {
        currentRecord.push(neutralizeFormula(currentField));
        currentField = '';
        i++;
      } else if (char === '\r') {
        if (i + 1 < len && text[i + 1] === '\n') {
          i++;
        }
        currentRecord.push(neutralizeFormula(currentField));
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        i++;
      } else if (char === '\n') {
        currentRecord.push(neutralizeFormula(currentField));
        records.push(currentRecord);
        currentRecord = [];
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  if (currentField.length > 0 || currentRecord.length > 0) {
    currentRecord.push(neutralizeFormula(currentField));
    records.push(currentRecord);
  }

  return { records, delimiter, hasBom };
}

export function normalizeStatus(raw: string): ApplicationStatus {
  if (!raw || !raw.trim()) return 'Saved';
  const clean = raw.trim().toLowerCase();
  return STATUS_MAP[clean] || 'Saved';
}

export function normalizeWorkMode(raw: string): WorkMode | null {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim().toLowerCase();
  return WORK_MODE_MAP[clean] || null;
}

export function normalizeDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  const clean = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return isValidCalendarDate(clean) ? clean : null;
  }

  const slashMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const day = slashMatch[1].padStart(2, '0');
    const month = slashMatch[2].padStart(2, '0');
    const year = slashMatch[3];
    const candidate = `${year}-${month}-${day}`;
    return isValidCalendarDate(candidate) ? candidate : null;
  }

  const dashMatch = clean.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const day = dashMatch[1].padStart(2, '0');
    const month = dashMatch[2].padStart(2, '0');
    const year = dashMatch[3];
    const candidate = `${year}-${month}-${day}`;
    return isValidCalendarDate(candidate) ? candidate : null;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    const candidate = clean.slice(0, 10);
    return isValidCalendarDate(candidate) ? candidate : null;
  }

  return null;
}

export function parseApplicationsFromCsv(
  csvText: string,
  options?: {
    existingApps?: Array<{
      company: string;
      position: string;
      url?: string | null;
    }>;
  }
): CsvImportPreviewDTO {
  const { records, delimiter, hasBom } = parseCsvRawRecords(csvText);

  if (records.length === 0) {
    return {
      totalRows: 0,
      validRowsCount: 0,
      errorRowsCount: 0,
      duplicateRowsCount: 0,
      delimiter,
      hasBom,
      headersFound: [],
      rows: [],
      globalErrors: ['Tệp CSV không có nội dung.']
    };
  }

  const rawHeaders = records[0].map(h => h.trim());
  const columnMapping: Array<keyof CsvImportItemInput | null> = rawHeaders.map(h => {
    const lower = h.toLowerCase();
    return HEADER_MAP[lower] || null;
  });

  const companyIndex = columnMapping.indexOf('company');
  const positionIndex = columnMapping.indexOf('position');

  const globalErrors: string[] = [];
  if (companyIndex === -1 && positionIndex === -1) {
    globalErrors.push('Không tìm thấy cột Công ty hoặc Vị trí trong tiêu đề CSV.');
  }

  const existingCompPos = new Set<string>();
  const existingUrls = new Set<string>();

  if (options?.existingApps) {
    for (const app of options.existingApps) {
      existingCompPos.add(`${app.company.trim().toLowerCase()}::${app.position.trim().toLowerCase()}`);
      if (app.url?.trim()) {
        existingUrls.add(app.url.trim().toLowerCase());
      }
    }
  }

  const seenBatchKeys = new Set<string>();
  const seenBatchUrls = new Set<string>();

  const parsedRows: CsvImportRowDTO[] = [];
  let validCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (let r = 1; r < records.length; r++) {
    const record = records[r];
    if (record.length === 0 || (record.length === 1 && !record[0].trim())) {
      continue;
    }

    const rowErrors: string[] = [];
    const item: Partial<Record<keyof CsvImportItemInput, string>> = {};

    for (let c = 0; c < record.length; c++) {
      const field = columnMapping[c];
      if (field) {
        item[field] = record[c] || '';
      }
    }

    const company = (item.company || '').trim();
    const position = (item.position || '').trim();

    if (!company) {
      rowErrors.push('Thiếu tên công ty.');
    } else if (company.length > 250) {
      rowErrors.push('Tên công ty vượt quá 250 ký tự.');
    }

    if (!position) {
      rowErrors.push('Thiếu vị trí ứng tuyển.');
    } else if (position.length > 250) {
      rowErrors.push('Vị trí ứng tuyển vượt quá 250 ký tự.');
    }

    const status = normalizeStatus(item.status || '');
    const workMode = normalizeWorkMode(item.workMode || '');

    let appliedAt: string | null = null;
    if (item.appliedAt?.trim()) {
      appliedAt = normalizeDate(item.appliedAt.trim());
      if (!appliedAt) {
        rowErrors.push(`Ngày ứng tuyển không hợp lệ: "${item.appliedAt}". Định dạng yêu cầu YYYY-MM-DD hoặc DD/MM/YYYY.`);
      }
    }

    let deadline: string | null = null;
    if (item.deadline?.trim()) {
      deadline = normalizeDate(item.deadline.trim());
      if (!deadline && !/^\d{4}-\d{2}-\d{2}T/.test(item.deadline.trim())) {
        rowErrors.push(`Hạn chót không hợp lệ: "${item.deadline}".`);
      } else if (!deadline) {
        deadline = item.deadline.trim();
      }
    }

    const salary = item.salary?.trim() || null;
    if (salary && salary.length > 250) {
      rowErrors.push('Mức lương vượt quá 250 ký tự.');
    }

    const location = item.location?.trim() || null;
    if (location && location.length > 250) {
      rowErrors.push('Địa điểm vượt quá 250 ký tự.');
    }

    const nextAction = item.nextAction?.trim() || null;
    if (nextAction && nextAction.length > 250) {
      rowErrors.push('Hành động tiếp theo vượt quá 250 ký tự.');
    }

    const source = item.source?.trim() || null;
    if (source && source.length > 100) {
      rowErrors.push('Nguồn vượt quá 100 ký tự.');
    }

    const jobCode = item.jobCode?.trim() || null;
    if (jobCode && jobCode.length > 100) {
      rowErrors.push('Mã tin vượt quá 100 ký tự.');
    }

    const url = item.url?.trim() || null;
    if (url) {
      if (url.length > 2000) {
        rowErrors.push('Đường dẫn URL vượt quá 2000 ký tự.');
      } else if (!/^https?:\/\//i.test(url)) {
        rowErrors.push('Đường dẫn URL phải bắt đầu bằng http:// hoặc https://.');
      }
    }

    const notes = item.notes?.trim() || null;
    if (notes && notes.length > 5000) {
      rowErrors.push('Ghi chú vượt quá 5000 ký tự.');
    }

    let isDuplicate = false;
    let duplicateReason: string | undefined;

    if (company && position) {
      const compPosKey = `${company.toLowerCase()}::${position.toLowerCase()}`;
      if (existingCompPos.has(compPosKey)) {
        isDuplicate = true;
        duplicateReason = `Trùng với hồ sơ "${position} tại ${company}" đã có trong hệ thống.`;
      } else if (seenBatchKeys.has(compPosKey)) {
        isDuplicate = true;
        duplicateReason = `Trùng lặp với dòng khác trong file CSV ("${position} tại ${company}").`;
      }
      seenBatchKeys.add(compPosKey);
    }

    if (!isDuplicate && url) {
      const lowerUrl = url.toLowerCase();
      if (existingUrls.has(lowerUrl)) {
        isDuplicate = true;
        duplicateReason = 'Trùng đường dẫn tin tuyển dụng đã có trong hệ thống.';
      } else if (seenBatchUrls.has(lowerUrl)) {
        isDuplicate = true;
        duplicateReason = 'Trùng đường dẫn tin tuyển dụng với dòng khác trong file CSV.';
      }
      seenBatchUrls.add(lowerUrl);
    }

    const isValid = rowErrors.length === 0;

    if (!isValid) errorCount++;
    else if (isDuplicate) duplicateCount++;
    else validCount++;

    parsedRows.push({
      rowNumber: r,
      company,
      position,
      status,
      appliedAt,
      salary,
      location,
      workMode,
      nextAction,
      deadline,
      source,
      jobCode,
      url,
      notes,
      isValid,
      isDuplicate,
      duplicateReason,
      errors: rowErrors
    });
  }

  return {
    totalRows: parsedRows.length,
    validRowsCount: validCount,
    errorRowsCount: errorCount,
    duplicateRowsCount: duplicateCount,
    delimiter,
    hasBom,
    headersFound: rawHeaders,
    rows: parsedRows,
    globalErrors
  };
}
