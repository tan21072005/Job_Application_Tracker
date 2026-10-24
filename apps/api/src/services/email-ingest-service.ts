import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  type EmailIngestProposalDTO,
  type EmailIngestApplyResultDTO,
  parseEmailContent,
  generateIngestionProposal
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export class EmailIngestService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async parseAndPropose(
    userId: string,
    input: { emailContent: string; subject?: string; sender?: string }
  ): Promise<EmailIngestProposalDTO> {
    const appsRes = await this.pool.query<{
      id: string;
      company: string;
      position: string;
      status: string;
    }>(
      `SELECT id, company, position, status
       FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY updated_at DESC`,
      [userId]
    );

    const extracted = parseEmailContent(input.emailContent, input.subject, input.sender);
    return generateIngestionProposal(extracted, appsRes.rows);
  }

  async applyProposal(
    userId: string,
    proposal: EmailIngestProposalDTO
  ): Promise<EmailIngestApplyResultDTO> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (proposal.actionType === 'create_application') {
        const appId = randomUUID();
        const appData = proposal.proposedApplication;
        if (!appData) {
          fail(422, 'Thiếu thông tin hồ sơ ứng tuyển đề xuất.', 'invalid_request');
        }

        await client.query(
          `INSERT INTO applications (
             id, user_id, company, position, status, notes, next_action, deadline_at, version, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            appId,
            userId,
            appData.company,
            appData.position,
            appData.status,
            appData.notes || null,
            appData.nextAction || null,
            appData.deadline || null
          ]
        );

        let interviewId: string | null = null;
        if (proposal.proposedInterview) {
          interviewId = randomUUID();
          const intData = proposal.proposedInterview;
          const validFormat = ['Online', 'Phone', 'On-site', 'Other'].includes(intData.format) ? intData.format : 'Online';
          await client.query(
            `INSERT INTO interviews (
               id, application_id, title, at, timezone, format, location, preparation, notes, status, created_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Scheduled', CURRENT_TIMESTAMP)`,
            [
              interviewId,
              appId,
              intData.title,
              intData.at,
              intData.timezone || 'Asia/Ho_Chi_Minh',
              validFormat,
              intData.location || '',
              intData.preparation || '',
              intData.notes || ''
            ]
          );
        }

        await client.query('COMMIT');
        return {
          success: true,
          actionTaken: 'create_application',
          applicationId: appId,
          interviewId,
          message: `Đã tạo mới hồ sơ ứng tuyển tại ${appData.company}.`
        };
      }

      const targetAppId = proposal.matchedApplicationId;
      if (!targetAppId) {
        fail(422, 'Không xác định được hồ sơ ứng tuyển mục tiêu để cập nhật.', 'invalid_request');
      }

      const existingApp = await client.query<{ id: string; version: number }>(
        `SELECT id, version FROM applications WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [targetAppId, userId]
      );

      if (existingApp.rowCount === 0) {
        fail(404, 'Không tìm thấy hồ sơ ứng tuyển mục tiêu hoặc không có quyền truy cập.', 'not_found');
      }

      const appData = proposal.proposedApplication;
      const targetStatus = appData?.status || 'Interview';

      await client.query(
        `UPDATE applications
         SET status = $1,
             next_action = COALESCE($2, next_action),
             version = version + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND user_id = $4`,
        [targetStatus, appData?.nextAction || null, targetAppId, userId]
      );

      let interviewId: string | null = null;
      if (proposal.actionType === 'schedule_interview' && proposal.proposedInterview) {
        interviewId = randomUUID();
        const intData = proposal.proposedInterview;
        const validFormat = ['Online', 'Phone', 'On-site', 'Other'].includes(intData.format) ? intData.format : 'Online';
        await client.query(
          `INSERT INTO interviews (
             id, application_id, title, at, timezone, format, location, preparation, notes, status, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Scheduled', CURRENT_TIMESTAMP)`,
          [
            interviewId,
            targetAppId,
            intData.title,
            intData.at,
            intData.timezone || 'Asia/Ho_Chi_Minh',
            validFormat,
            intData.location || '',
            intData.preparation || '',
            intData.notes || ''
          ]
        );
      }

      await client.query('COMMIT');
      return {
        success: true,
        actionTaken: proposal.actionType,
        applicationId: targetAppId,
        interviewId,
        message: `Đã cập nhật trạng thái hồ sơ thành "${targetStatus}".`
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
