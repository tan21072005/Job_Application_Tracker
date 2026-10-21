import { Pool } from 'pg';

export interface CandidateProfile {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  cvUrl: string | null;
  portfolioUrl: string | null;
  skills: string[];
  bio: string | null;
  customAnswers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

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
    return res.rows[0] || null;
  }

  async upsertProfile(
    userId: string,
    data: {
      fullName: string;
      email: string;
      phone?: string | null;
      cvUrl?: string | null;
      portfolioUrl?: string | null;
      skills?: string[];
      bio?: string | null;
      customAnswers?: Record<string, string>;
    }
  ): Promise<CandidateProfile> {
    const skills = (data.skills || []).map(s => s.trim()).filter(Boolean);
    const customAnswers = data.customAnswers || {};

    const res = await this.pool.query(
      `INSERT INTO candidate_profiles (
         user_id, full_name, email, phone, cv_url, portfolio_url, skills, bio, custom_answers, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         cv_url = EXCLUDED.cv_url,
         portfolio_url = EXCLUDED.portfolio_url,
         skills = EXCLUDED.skills,
         bio = EXCLUDED.bio,
         custom_answers = EXCLUDED.custom_answers,
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
        JSON.stringify(customAnswers)
      ]
    );

    return res.rows[0];
  }
}
