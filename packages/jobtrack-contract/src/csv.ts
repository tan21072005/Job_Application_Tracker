import { sanitizeForCsv } from './normalization.ts';
import type { ApplicationStatus } from './types.ts';

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  Saved: 'Đã lưu',
  Applied: 'Đã nộp',
  Screening: 'Sàng lọc',
  Interview: 'Phỏng vấn',
  Offer: 'Offer',
  Rejected: 'Từ chối',
  Withdrawn: 'Đã rút'
};

export interface CsvApplicationItem {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt?: string | null;
  salary?: string | null;
  location?: string | null;
  workMode?: string | null;
  nextAction?: string | null;
  deadline?: string | null;
  source?: string | null;
  jobCode?: string | null;
  url?: string | null;
  notes?: string | null;
  interviews?: Array<unknown>;
  createdAt: string;
  updatedAt?: string | null;
}

export function formatApplicationsAsCsv(apps: CsvApplicationItem[]): string {
  const headers = [
    'Mã hồ sơ',
    'Công ty',
    'Vị trí ứng tuyển',
    'Trạng thái',
    'Ngày nộp',
    'Mức lương',
    'Địa điểm',
    'Hình thức',
    'Bước tiếp theo',
    'Hạn chót',
    'Nguồn tuyển dụng',
    'Mã tin tuyển dụng',
    'Link tin tuyển dụng',
    'Ghi chú',
    'Số vòng phỏng vấn',
    'Ngày tạo',
    'Cập nhật lúc'
  ];

  const headerLine = headers.map(h => sanitizeForCsv(h)).join(',');
  const rowLines = apps.map(app => {
    const statusLabel = STATUS_LABELS[app.status] || app.status;
    const interviewCount = Array.isArray(app.interviews) ? app.interviews.length : 0;
    return [
      sanitizeForCsv(app.id),
      sanitizeForCsv(app.company),
      sanitizeForCsv(app.position),
      sanitizeForCsv(statusLabel),
      sanitizeForCsv(app.appliedAt || ''),
      sanitizeForCsv(app.salary || ''),
      sanitizeForCsv(app.location || ''),
      sanitizeForCsv(app.workMode || ''),
      sanitizeForCsv(app.nextAction || ''),
      sanitizeForCsv(app.deadline || ''),
      sanitizeForCsv(app.source || ''),
      sanitizeForCsv(app.jobCode || ''),
      sanitizeForCsv(app.url || ''),
      sanitizeForCsv(app.notes || ''),
      sanitizeForCsv(interviewCount),
      sanitizeForCsv(app.createdAt),
      sanitizeForCsv(app.updatedAt || '')
    ].join(',');
  });

  return `\uFEFF${[headerLine, ...rowLines].join('\r\n')}`;
}
