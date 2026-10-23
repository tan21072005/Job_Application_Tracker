import { Pool } from 'pg';
import type { CandidateProfileWireDTO, CandidateProfileMutationInput } from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export type CandidateProfile = CandidateProfileWireDTO;

export class CandidateProfileService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getProfile(userId: string): Promise<CandidateProfile | null> {
    const res = await this.pool.query(
      `SELECT user_id AS "userId", full_name AS "fullName", email, phone,
              cv_url AS "cvUrl", portfolio_url AS "portfolioUrl", skills, bio,
              custom_answers AS "customAnswers", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM candidate_profiles
       WHERE user_id = $1`,
      [userId]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      cvUrl: row.cvUrl,
      portfolioUrl: row.portfolioUrl,
      skills: Array.isArray(row.skills) ? row.skills : [],
      bio: row.bio,
      customAnswers: typeof row.customAnswers === 'object' && row.customAnswers !== null ? row.customAnswers : {},
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
    };
  }

  async upsertProfile(
    userId: string,
    data: CandidateProfileMutationInput
  ): Promise<CandidateProfile> {
    if (data.expectedUpdatedAt) {
      const existing = await this.getProfile(userId);
      if (existing && existing.updatedAt !== data.expectedUpdatedAt) {
        fail(412, 'Hồ sơ đã được cập nhật ở nơi khác. Vui lòng tải lại trước khi lưu.', 'precondition_failed');
      }
    }

    const skills = (data.skills || []).map(s => s.trim()).filter(Boolean);
    const customAnswersJson = data.customAnswers !== undefined ? JSON.stringify(data.customAnswers) : null;

    const res = await this.pool.query(
      `INSERT INTO candidate_profiles (
         user_id, full_name, email, phone, cv_url, portfolio_url, skills, bio, custom_answers, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::jsonb, '{}'::jsonb), CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         cv_url = EXCLUDED.cv_url,
         portfolio_url = EXCLUDED.portfolio_url,
         skills = EXCLUDED.skills,
         bio = EXCLUDED.bio,
         custom_answers = CASE WHEN $9 IS NOT NULL THEN EXCLUDED.custom_answers ELSE candidate_profiles.custom_answers END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING user_id AS "userId", full_name AS "fullName", email, phone,
                 cv_url AS "cvUrl", portfolio_url AS "portfolioUrl", skills, bio,
                 custom_answers AS "customAnswers", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        userId,
        data.fullName.trim(),
        data.email.trim(),
        data.phone?.trim() || null,
        data.cvUrl?.trim() || null,
        data.portfolioUrl?.trim() || null,
        skills,
        data.bio?.trim() || null,
        customAnswersJson
      ]
    );

    const row = res.rows[0];
    return {
      userId: row.userId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      cvUrl: row.cvUrl,
      portfolioUrl: row.portfolioUrl,
      skills: Array.isArray(row.skills) ? row.skills : [],
      bio: row.bio,
      customAnswers: typeof row.customAnswers === 'object' && row.customAnswers !== null ? row.customAnswers : {},
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt)
    };
  }
}
