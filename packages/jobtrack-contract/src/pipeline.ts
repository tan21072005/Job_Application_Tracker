import type { ApplicationStatus, ApplicationPriority } from './types.ts';
import type { ValidationResult } from './validators.ts';

export type { ApplicationPriority };

export interface StageSlaStatus {
  stage: ApplicationStatus;
  daysInStage: number;
  maxRecommendedDays: number;
  isStagnant: boolean;
  slaSeverity: 'normal' | 'warning' | 'critical';
  recommendation: string;
}

export interface PipelineMetadataInput {
  priority?: ApplicationPriority;
  tags?: string[];
  statusUpdatedAt?: string;
}

export const DEFAULT_STAGE_SLAS: Record<ApplicationStatus, number> = {
  Saved: 30,
  Applied: 14,
  Screening: 10,
  Interview: 7,
  Offer: 5,
  Rejected: 9999,
  Withdrawn: 9999
};

export function calculateStageSla(
  stage: ApplicationStatus,
  statusUpdatedAt?: string | Date
): StageSlaStatus {
  const maxDays = DEFAULT_STAGE_SLAS[stage] ?? 14;
  if (stage === 'Rejected' || stage === 'Withdrawn') {
    return {
      stage,
      daysInStage: 0,
      maxRecommendedDays: maxDays,
      isStagnant: false,
      slaSeverity: 'normal',
      recommendation: 'Hồ sơ đã kết thúc, không cần theo dõi SLA.'
    };
  }

  const dateValue = statusUpdatedAt ? new Date(statusUpdatedAt).getTime() : Date.now();
  const diffMs = Math.max(0, Date.now() - dateValue);
  const daysInStage = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const isStagnant = daysInStage >= maxDays;
  let slaSeverity: 'normal' | 'warning' | 'critical' = 'normal';
  if (daysInStage >= maxDays * 1.5) {
    slaSeverity = 'critical';
  } else if (daysInStage >= maxDays) {
    slaSeverity = 'warning';
  }

  let recommendation = 'Tiến độ bình thường trong giai đoạn này.';
  if (slaSeverity === 'critical') {
    if (stage === 'Applied') {
      recommendation = `Đã ${daysInStage} ngày kể từ khi nộp đơn. Bạn nên gửi email follow-up hoặc kết nối trực tiếp với Recruiter trên LinkedIn.`;
    } else if (stage === 'Screening' || stage === 'Interview') {
      recommendation = `Đã ${daysInStage} ngày kể từ vòng trao đổi gần nhất. Cần chủ động hỏi thăm kết quả phỏng vấn để thể hiện sự quan tâm.`;
    } else if (stage === 'Offer') {
      recommendation = `Đã ${daysInStage} ngày có Offer. Cần sớm ra quyết định hoặc phản hồi thư đàm phán trước khi hết hạn phản hồi.`;
    } else {
      recommendation = `Đã ${daysInStage} ngày chưa cập nhật trạng thái. Cân nhắc xem xét lại cơ hội này.`;
    }
  } else if (slaSeverity === 'warning') {
    recommendation = `Đã đạt ngưỡng SLA thông thường (${daysInStage}/${maxDays} ngày). Chuẩn bị sẵn hành động bước tiếp theo.`;
  }

  return {
    stage,
    daysInStage,
    maxRecommendedDays: maxDays,
    isStagnant,
    slaSeverity,
    recommendation
  };
}

export function validatePipelineMetadataInput(raw: unknown): ValidationResult<PipelineMetadataInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu thông tin tiến độ không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const validPriorities: ApplicationPriority[] = ['urgent', 'target', 'safety', 'backlog'];
  let priority: ApplicationPriority | undefined = undefined;
  if (b.priority !== undefined) {
    if (typeof b.priority === 'string' && validPriorities.includes(b.priority as ApplicationPriority)) {
      priority = b.priority as ApplicationPriority;
    } else {
      errors.priority = 'Mức độ ưu tiên phải là urgent, target, safety hoặc backlog.';
    }
  }

  let tags: string[] | undefined = undefined;
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags)) {
      errors.tags = 'Danh sách thẻ tags phải là một mảng.';
    } else {
      const sanitized: string[] = [];
      for (const t of b.tags) {
        if (typeof t === 'string') {
          const cleaned = t.trim().toLowerCase().replace(/^#/, '');
          if (cleaned.length > 0 && cleaned.length <= 40 && !sanitized.includes(cleaned)) {
            sanitized.push(cleaned);
          }
        }
      }
      if (sanitized.length > 20) {
        errors.tags = 'Số lượng thẻ tags không được vượt quá 20 thẻ.';
      } else {
        tags = sanitized;
      }
    }
  }

  let statusUpdatedAt: string | undefined = undefined;
  if (b.statusUpdatedAt !== undefined) {
    if (typeof b.statusUpdatedAt === 'string' && b.statusUpdatedAt.trim()) {
      const d = new Date(b.statusUpdatedAt);
      if (isNaN(d.getTime())) {
        errors.statusUpdatedAt = 'Thời gian cập nhật trạng thái không đúng định dạng ISO.';
      } else {
        statusUpdatedAt = d.toISOString();
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Dữ liệu tiến độ hồ sơ chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      priority,
      tags,
      statusUpdatedAt
    }
  };
}
