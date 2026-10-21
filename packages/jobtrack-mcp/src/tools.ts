import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import {
  JobTrackService,
  DomainError
} from '../../../apps/api/src/services/jobtrack-service.ts';
import {
  validateApplicationInput,
  type ValidatedApplicationData,
  type ValidatedInterviewData,
  type ApplicationStatus,
  type WorkMode,
  type InterviewFormat,
  type InterviewStatus
} from '../../jobtrack-contract/src/index.ts';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const TOOLS: ToolDefinition[] = [
  {
    name: 'list_applications',
    description: 'Liệt kê danh sách hồ sơ ứng tuyển của người dùng. Hỗ trợ lọc theo trạng thái, tìm kiếm theo tên công ty hoặc vị trí, sắp xếp, và xem thùng rác.',
    inputSchema: {
      type: 'object',
      properties: {
        q: { type: 'string', description: 'Từ khóa tìm kiếm theo tên công ty hoặc vị trí ứng tuyển.' },
        status: {
          type: 'string',
          enum: ['all', 'Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
          description: 'Lọc theo trạng thái hồ sơ.'
        },
        sort: {
          type: 'string',
          enum: ['createdAt:desc', 'createdAt:asc', 'appliedAt:desc', 'appliedAt:asc'],
          description: 'Tùy chọn sắp xếp danh sách.'
        },
        includeDeleted: {
          type: 'boolean',
          description: 'Đặt là true để xem các hồ sơ trong thùng rác.'
        }
      }
    }
  },
  {
    name: 'get_application',
    description: 'Lấy chi tiết một hồ sơ ứng tuyển theo ID (kèm danh sách các vòng phỏng vấn, trạng thái, ETag/version hiện tại).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của hồ sơ ứng tuyển.' }
      },
      required: ['id']
    }
  },
  {
    name: 'create_application',
    description: 'Tạo một hồ sơ ứng tuyển mới với quyền Full control. Trả về thông tin hồ sơ vừa tạo kèm version/ETag.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Tên công ty (tối đa 250 ký tự).' },
        position: { type: 'string', description: 'Vị trí ứng tuyển (tối đa 250 ký tự).' },
        url: { type: 'string', description: 'Đường dẫn tới tin tuyển dụng.' },
        source: { type: 'string', description: 'Nguồn tin (TopCV, LinkedIn, ITviec, v.v.).' },
        jobCode: { type: 'string', description: 'Mã tin tuyển dụng.' },
        location: { type: 'string', description: 'Địa điểm làm việc.' },
        workMode: { type: 'string', enum: ['On-site', 'Hybrid', 'Remote'], description: 'Hình thức làm việc.' },
        appliedAt: { type: 'string', description: 'Ngày nộp đơn (định dạng YYYY-MM-DD).' },
        salary: { type: 'string', description: 'Mức lương tham khảo.' },
        notes: { type: 'string', description: 'Ghi chú thêm.' },
        nextAction: { type: 'string', description: 'Hành động tiếp theo cần làm.' },
        deadline: { type: 'string', description: 'Hạn chót hành động (định dạng ISO 8601 UTC).' },
        status: {
          type: 'string',
          enum: ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
          description: 'Trạng thái khởi tạo (mặc định: Saved).'
        },
        confirmReapply: { type: 'boolean', description: 'Xác nhận tạo hồ sơ mới nếu đã từng ứng tuyển vào vị trí này.' }
      },
      required: ['company', 'position']
    }
  },
  {
    name: 'update_application',
    description: 'Cập nhật thông tin một hồ sơ ứng tuyển (chuyển trạng thái, cập nhật ghi chú, hành động tiếp theo, hạn chót). Hỗ trợ cập nhật từng phần.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của hồ sơ cần cập nhật.' },
        company: { type: 'string', description: 'Tên công ty mới.' },
        position: { type: 'string', description: 'Vị trí ứng tuyển mới.' },
        url: { type: 'string', description: 'Đường dẫn tin tuyển dụng mới.' },
        source: { type: 'string', description: 'Nguồn tin mới.' },
        jobCode: { type: 'string', description: 'Mã tin mới.' },
        location: { type: 'string', description: 'Địa điểm mới.' },
        workMode: { type: 'string', enum: ['On-site', 'Hybrid', 'Remote'] },
        appliedAt: { type: 'string', description: 'Ngày nộp đơn mới (YYYY-MM-DD).' },
        salary: { type: 'string', description: 'Mức lương mới.' },
        notes: { type: 'string', description: 'Ghi chú mới.' },
        nextAction: { type: 'string', description: 'Hành động tiếp theo.' },
        deadline: { type: 'string', description: 'Hạn chót mới (ISO 8601 UTC).' },
        status: {
          type: 'string',
          enum: ['Saved', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected', 'Withdrawn']
        },
        ifMatchVersion: { type: 'number', description: 'Phiên bản kỳ vọng để chống ghi đè xung đột (optimistic lock).' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_application',
    description: 'Xóa hồ sơ ứng tuyển. Mặc định chuyển vào thùng rác (soft-delete, có thể phục hồi). Để xóa vĩnh viễn, đặt purge: true.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của hồ sơ cần xóa.' },
        purge: { type: 'boolean', description: 'Đặt true để xóa vĩnh viễn. Mặc định false (chuyển vào thùng rác).' },
        ifMatchVersion: { type: 'number', description: 'Phiên bản kỳ vọng của hồ sơ.' }
      },
      required: ['id']
    }
  },
  {
    name: 'restore_application',
    description: 'Khôi phục một hồ sơ ứng tuyển từ thùng rác về lại trạng thái hoạt động bình thường.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của hồ sơ trong thùng rác cần khôi phục.' }
      },
      required: ['id']
    }
  },
  {
    name: 'schedule_interview',
    description: 'Lên lịch một vòng phỏng vấn mới cho hồ sơ ứng tuyển. Tự động đồng bộ trạng thái hồ sơ sang Interview.',
    inputSchema: {
      type: 'object',
      properties: {
        applicationId: { type: 'string', description: 'UUID của hồ sơ ứng tuyển cha.' },
        title: { type: 'string', description: 'Tên vòng phỏng vấn (ví dụ: Vòng HR, Phỏng vấn kỹ thuật).' },
        at: { type: 'string', description: 'Thời gian phỏng vấn định dạng ISO 8601 (ví dụ: 2026-10-25T09:00:00Z).' },
        timezone: { type: 'string', description: 'Múi giờ IANA chuẩn (ví dụ: Asia/Ho_Chi_Minh, UTC).' },
        format: { type: 'string', enum: ['Online', 'Phone', 'On-site', 'Other'], description: 'Hình thức phỏng vấn.' },
        location: { type: 'string', description: 'Địa chỉ hoặc link Google Meet / Zoom.' },
        preparation: { type: 'string', description: 'Nội dung cần chuẩn bị trước buổi phỏng vấn.' },
        notes: { type: 'string', description: 'Ghi chú sau phỏng vấn.' },
        status: { type: 'string', enum: ['Scheduled', 'Completed', 'Cancelled'], description: 'Trạng thái vòng phỏng vấn (mặc định: Scheduled).' },
        ifMatchVersion: { type: 'number', description: 'Phiên bản kỳ vọng của hồ sơ cha.' }
      },
      required: ['applicationId', 'title', 'at', 'timezone', 'format']
    }
  },
  {
    name: 'update_interview',
    description: 'Dời lịch, đổi múi giờ hoặc cập nhật ghi chú của một vòng phỏng vấn đã lên lịch.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của vòng phỏng vấn.' },
        title: { type: 'string', description: 'Tên vòng mới.' },
        at: { type: 'string', description: 'Thời gian mới định dạng ISO 8601.' },
        timezone: { type: 'string', description: 'Múi giờ IANA mới.' },
        format: { type: 'string', enum: ['Online', 'Phone', 'On-site', 'Other'] },
        location: { type: 'string', description: 'Địa điểm hoặc link mới.' },
        preparation: { type: 'string', description: 'Ghi chú chuẩn bị mới.' },
        notes: { type: 'string', description: 'Ghi chú mới.' },
        status: { type: 'string', enum: ['Scheduled', 'Completed', 'Cancelled'] },
        ifMatchVersion: { type: 'number', description: 'Phiên bản kỳ vọng của hồ sơ cha.' }
      },
      required: ['id']
    }
  },
  {
    name: 'delete_interview',
    description: 'Xóa một vòng phỏng vấn khỏi hồ sơ ứng tuyển.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'UUID của vòng phỏng vấn cần xóa.' },
        ifMatchVersion: { type: 'number', description: 'Phiên bản kỳ vọng của hồ sơ cha.' }
      },
      required: ['id']
    }
  },
  {
    name: 'get_dashboard_summary',
    description: 'Lấy số liệu tổng quan công việc ứng tuyển hôm nay: tổng số hồ sơ, số offer, phỏng vấn sắp tới, tỷ lệ phản hồi.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_candidate_profile',
    description: 'Lấy thông tin hồ sơ ứng viên của người dùng (họ và tên, email, số điện thoại, link CV, portfolio, kỹ năng, ghi chú giới thiệu). Hỗ trợ AI tự động điền đơn xin việc hoặc tư vấn nghề nghiệp.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'list_job_subscriptions',
    description: 'Liệt kê các bộ lọc đăng ký cào tin tuyển dụng định kỳ theo từ khóa và địa điểm của người dùng.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

export async function executeTool(
  service: JobTrackService,
  pool: Pool,
  userId: string,
  clientName: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const isMutation = [
    'create_application',
    'update_application',
    'delete_application',
    'restore_application',
    'schedule_interview',
    'update_interview',
    'delete_interview'
  ].includes(toolName);

  try {
    let result: unknown;

    switch (toolName) {
      case 'list_applications': {
        const query = {
          q: typeof args.q === 'string' ? args.q : undefined,
          status: typeof args.status === 'string' ? args.status : undefined,
          sort: typeof args.sort === 'string' ? args.sort : undefined,
          includeDeleted: Boolean(args.includeDeleted)
        };
        result = await service.listApplications(userId, query);
        break;
      }

      case 'get_application': {
        const id = String(args.id);
        const app = await service.getApplication(userId, id);
        if (!app) {
          throw new DomainError(404, 'Không tìm thấy hồ sơ ứng tuyển.', 'not_found');
        }
        result = app;
        break;
      }

      case 'create_application': {
        const allowed = [
          'company', 'position', 'url', 'source', 'jobCode', 'location',
          'workMode', 'appliedAt', 'salary', 'notes', 'nextAction', 'deadline',
          'status', 'confirmReapply'
        ];
        const rawInput: Record<string, unknown> = {};
        for (const key of allowed) {
          if (args[key] !== undefined && args[key] !== '') {
            rawInput[key] = args[key];
          }
        }
        if (rawInput.workMode === 'Onsite') {
          rawInput.workMode = 'On-site';
        }
        if (rawInput.deadline && (!rawInput.nextAction || !String(rawInput.nextAction).trim())) {
          rawInput.nextAction = 'Nộp hồ sơ trước hạn chót';
        }
        if (rawInput.confirmReapply === undefined && args.confirmReapply !== undefined) {
          rawInput.confirmReapply = Boolean(args.confirmReapply);
        }

        const val = validateApplicationInput(rawInput, false);
        if (!val.ok) {
          const detail = Object.entries(val.errors).map(([k, v]) => `${k}: ${v}`).join('; ');
          throw new DomainError(422, `${val.message} (${detail})`, 'invalid_input', val.errors);
        }

        const res = await service.createApplication(userId, val.data as ValidatedApplicationData, {
          idempotencyKey: randomUUID()
        });
        result = res.application;
        break;
      }

      case 'update_application': {
        const id = String(args.id);
        const allowed = [
          'company', 'position', 'url', 'source', 'jobCode', 'location',
          'workMode', 'appliedAt', 'salary', 'notes', 'nextAction', 'deadline',
          'status', 'confirmReapply'
        ];
        const patch: Record<string, unknown> = {};
        for (const key of allowed) {
          if (args[key] !== undefined) {
            patch[key] = args[key] === '' ? null : args[key];
          }
        }
        if (patch.workMode === 'Onsite') {
          patch.workMode = 'On-site';
        }
        if (patch.deadline && patch.nextAction === '') {
          patch.nextAction = 'Nộp hồ sơ trước hạn chót';
        }

        const val = validateApplicationInput(patch, true);
        if (!val.ok) {
          const detail = Object.entries(val.errors).map(([k, v]) => `${k}: ${v}`).join('; ');
          throw new DomainError(422, `${val.message} (${detail})`, 'invalid_input', val.errors);
        }

        let version = typeof args.ifMatchVersion === 'number' ? args.ifMatchVersion : undefined;
        if (version === undefined) {
          const current = await service.getApplication(userId, id);
          if (current) version = current.version;
        }

        result = await service.updateApplication(userId, id, val.data, {
          ifMatchVersion: version
        });
        break;
      }

      case 'delete_application': {
        const id = String(args.id);
        const purge = Boolean(args.purge);
        let version = typeof args.ifMatchVersion === 'number' ? args.ifMatchVersion : undefined;
        if (version === undefined) {
          const current = await service.getApplication(userId, id);
          if (current) version = current.version;
        }
        await service.deleteApplication(userId, id, {
          ifMatchVersion: version,
          purge
        });
        result = { success: true, message: purge ? 'Đã xóa vĩnh viễn hồ sơ.' : 'Đã chuyển hồ sơ vào thùng rác.' };
        break;
      }

      case 'restore_application': {
        const id = String(args.id);
        result = await service.restoreApplication(userId, id);
        break;
      }

      case 'schedule_interview': {
        const applicationId = String(args.applicationId);
        const interviewInput: ValidatedInterviewData = {
          title: String(args.title).trim(),
          at: String(args.at).trim(),
          timezone: String(args.timezone).trim(),
          format: (args.format as InterviewFormat) || 'Online',
          location: typeof args.location === 'string' ? args.location.trim() : null,
          preparation: typeof args.preparation === 'string' ? args.preparation.trim() : null,
          notes: typeof args.notes === 'string' ? args.notes.trim() : null,
          status: (args.status as InterviewStatus) || 'Scheduled'
        };

        let parentVersion = typeof args.ifMatchVersion === 'number' ? args.ifMatchVersion : undefined;
        if (parentVersion === undefined) {
          const parent = await service.getApplication(userId, applicationId);
          if (parent) parentVersion = parent.version;
        }

        const res = await service.createInterview(userId, applicationId, interviewInput, {
          idempotencyKey: randomUUID(),
          ifMatchVersion: parentVersion
        });
        result = res.round;
        break;
      }

      case 'update_interview': {
        const id = String(args.id);
        const patch: Partial<ValidatedInterviewData> = {};
        if (args.title !== undefined) patch.title = String(args.title).trim();
        if (args.at !== undefined) patch.at = String(args.at).trim();
        if (args.timezone !== undefined) patch.timezone = String(args.timezone).trim();
        if (args.format !== undefined) patch.format = args.format as InterviewFormat;
        if (args.location !== undefined) patch.location = args.location ? String(args.location).trim() : null;
        if (args.preparation !== undefined) patch.preparation = args.preparation ? String(args.preparation).trim() : null;
        if (args.notes !== undefined) patch.notes = args.notes ? String(args.notes).trim() : null;
        if (args.status !== undefined) patch.status = args.status as InterviewStatus;

        let parentVersion = typeof args.ifMatchVersion === 'number' ? args.ifMatchVersion : undefined;
        if (parentVersion === undefined) {
          const apps = await service.listApplications(userId);
          const parent = apps.find(a => a.interviews.some(i => i.id === id));
          if (parent) parentVersion = parent.version;
        }

        const res = await service.updateInterview(userId, id, patch, {
          ifMatchVersion: parentVersion
        });
        result = res.round;
        break;
      }

      case 'delete_interview': {
        const id = String(args.id);
        let parentVersion = typeof args.ifMatchVersion === 'number' ? args.ifMatchVersion : undefined;
        if (parentVersion === undefined) {
          const apps = await service.listApplications(userId);
          const parent = apps.find(a => a.interviews.some(i => i.id === id));
          if (parent) parentVersion = parent.version;
        }

        await service.deleteInterview(userId, id, {
          ifMatchVersion: parentVersion
        });
        result = { success: true, message: 'Đã xóa vòng phỏng vấn thành công.' };
        break;
      }

      case 'get_dashboard_summary': {
        result = await service.getDashboardSummary(userId);
        break;
      }

      case 'get_candidate_profile': {
        const res = await pool.query(
          `SELECT user_id AS "userId", full_name AS "fullName", email, phone,
                  cv_url AS "cvUrl", portfolio_url AS "portfolioUrl", skills, bio,
                  custom_answers AS "customAnswers"
           FROM candidate_profiles WHERE user_id = $1`,
          [userId]
        );
        result = res.rows[0] || null;
        break;
      }

      case 'list_job_subscriptions': {
        const res = await pool.query(
          `SELECT id, title, keywords, location, min_salary AS "minSalary", sources, is_active AS "isActive", last_checked_at AS "lastCheckedAt"
           FROM job_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        );
        result = res.rows;
        break;
      }

      default:
        throw new DomainError(400, `Không tìm thấy công cụ: ${toolName}`, 'tool_not_found');
    }

    if (isMutation) {
      await pool.query(
        'INSERT INTO ai_commands(id, user_id, client, command, status, input_payload, result_payload) VALUES($1, $2, $3, $4, $5, $6, $7)',
        [randomUUID(), userId, clientName, toolName, 'succeeded', JSON.stringify(args), JSON.stringify(result)]
      ).catch((e: unknown) => console.error('Failed to record ai_command receipt:', e));
    }

    return result;
  } catch (error) {
    if (isMutation) {
      await pool.query(
        'INSERT INTO ai_commands(id, user_id, client, command, status, input_payload, error_message) VALUES($1, $2, $3, $4, $5, $6, $7)',
        [randomUUID(), userId, clientName, toolName, 'failed', JSON.stringify(args), (error as Error).message]
      ).catch((e: unknown) => console.error('Failed to record ai_command error receipt:', e));
    }
    throw error;
  }
}
