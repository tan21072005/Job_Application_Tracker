import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type ResumeVariantDTO,
  type ResumeTailorResultDTO,
  validateResumeInput,
  validateResumeTailorInput,
  tailorResumeForJob
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export class ResumeService {
  private pool: Pool;
  private tableReady: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_resumes (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name varchar(200) NOT NULL,
        target_role varchar(200),
        summary text,
        experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
        skill_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_master boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS user_resumes_owner_idx ON user_resumes (user_id, updated_at DESC);
    `);
    this.tableReady = true;
  }

  async listResumes(userId: string): Promise<ResumeVariantDTO[]> {
    await this.ensureTable();
    const res = await this.pool.query<{
      id: string;
      user_id: string;
      name: string;
      target_role: string | null;
      summary: string | null;
      experiences: any;
      skill_groups: any;
      is_master: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at
       FROM user_resumes
       WHERE user_id = $1
       ORDER BY is_master DESC, updated_at DESC`,
      [userId]
    );

    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      targetRole: r.target_role || undefined,
      summary: r.summary || '',
      experiences: Array.isArray(r.experiences) ? r.experiences : [],
      skillGroups: Array.isArray(r.skill_groups) ? r.skill_groups : [],
      isMaster: r.is_master,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
    }));
  }

  async getResume(userId: string, id: string): Promise<ResumeVariantDTO> {
    await this.ensureTable();
    const res = await this.pool.query<{
      id: string;
      user_id: string;
      name: string;
      target_role: string | null;
      summary: string | null;
      experiences: any;
      skill_groups: any;
      is_master: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at
       FROM user_resumes
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!res.rows[0]) {
      fail(404, 'Không tìm thấy phiên bản CV.', 'not_found');
    }

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      targetRole: r.target_role || undefined,
      summary: r.summary || '',
      experiences: Array.isArray(r.experiences) ? r.experiences : [],
      skillGroups: Array.isArray(r.skill_groups) ? r.skill_groups : [],
      isMaster: r.is_master,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
    };
  }

  async createResume(userId: string, input: unknown): Promise<ResumeVariantDTO> {
    await this.ensureTable();
    const val = validateResumeInput(input);
    if (!val.ok) {
      fail(422, val.message || 'Thông tin CV không hợp lệ.', 'invalid_request', val.errors);
    }

    const { name, targetRole, summary, experiences, skillGroups, isMaster } = val.data;

    if (isMaster) {
      await this.pool.query(
        `UPDATE user_resumes SET is_master = false WHERE user_id = $1`,
        [userId]
      );
    }

    const id = randomUUID();
    const res = await this.pool.query<{
      id: string;
      user_id: string;
      name: string;
      target_role: string | null;
      summary: string | null;
      experiences: any;
      skill_groups: any;
      is_master: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `INSERT INTO user_resumes (id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at`,
      [id, userId, name, targetRole || null, summary, JSON.stringify(experiences), JSON.stringify(skillGroups), isMaster]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      targetRole: r.target_role || undefined,
      summary: r.summary || '',
      experiences: Array.isArray(r.experiences) ? r.experiences : [],
      skillGroups: Array.isArray(r.skill_groups) ? r.skill_groups : [],
      isMaster: r.is_master,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
    };
  }

  async updateResume(userId: string, id: string, input: unknown): Promise<ResumeVariantDTO> {
    await this.ensureTable();
    await this.getResume(userId, id);

    const val = validateResumeInput(input);
    if (!val.ok) {
      fail(422, val.message || 'Thông tin CV không hợp lệ.', 'invalid_request', val.errors);
    }

    const { name, targetRole, summary, experiences, skillGroups, isMaster } = val.data;

    if (isMaster) {
      await this.pool.query(
        `UPDATE user_resumes SET is_master = false WHERE user_id = $1 AND id != $2`,
        [userId, id]
      );
    }

    const res = await this.pool.query<{
      id: string;
      user_id: string;
      name: string;
      target_role: string | null;
      summary: string | null;
      experiences: any;
      skill_groups: any;
      is_master: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE user_resumes
       SET name = $1, target_role = $2, summary = $3, experiences = $4::jsonb, skill_groups = $5::jsonb, is_master = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at`,
      [name, targetRole || null, summary, JSON.stringify(experiences), JSON.stringify(skillGroups), isMaster, id, userId]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      targetRole: r.target_role || undefined,
      summary: r.summary || '',
      experiences: Array.isArray(r.experiences) ? r.experiences : [],
      skillGroups: Array.isArray(r.skill_groups) ? r.skill_groups : [],
      isMaster: r.is_master,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
      updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
    };
  }

  async deleteResume(userId: string, id: string): Promise<void> {
    await this.ensureTable();
    const res = await this.pool.query(
      `DELETE FROM user_resumes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if ((res.rowCount ?? 0) === 0) {
      fail(404, 'Không tìm thấy phiên bản CV để xóa.', 'not_found');
    }
  }

  async tailorResume(userId: string, input: unknown): Promise<ResumeTailorResultDTO> {
    await this.ensureTable();
    const val = validateResumeTailorInput(input);
    if (!val.ok) {
      fail(422, val.message || 'Yêu cầu may đo CV chưa hợp lệ.', 'invalid_request', val.errors);
    }

    let base: ResumeVariantDTO | null = null;
    if (val.data.resumeId) {
      base = await this.getResume(userId, val.data.resumeId);
    } else if (val.data.baseResume && val.data.baseResume.name) {
      base = {
        id: randomUUID(),
        name: val.data.baseResume.name,
        targetRole: val.data.baseResume.targetRole,
        summary: val.data.baseResume.summary || '',
        experiences: val.data.baseResume.experiences || [],
        skillGroups: val.data.baseResume.skillGroups || [],
        isMaster: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      const masterRes = await this.pool.query<{
        id: string;
        user_id: string;
        name: string;
        target_role: string | null;
        summary: string | null;
        experiences: any;
        skill_groups: any;
        is_master: boolean;
        created_at: Date;
        updated_at: Date;
      }>(
        `SELECT id, user_id, name, target_role, summary, experiences, skill_groups, is_master, created_at, updated_at
         FROM user_resumes
         WHERE user_id = $1 AND is_master = true
         ORDER BY updated_at DESC LIMIT 1`,
        [userId]
      );

      if (masterRes.rows[0]) {
        const r = masterRes.rows[0];
        base = {
          id: r.id,
          userId: r.user_id,
          name: r.name,
          targetRole: r.target_role || undefined,
          summary: r.summary || '',
          experiences: Array.isArray(r.experiences) ? r.experiences : [],
          skillGroups: Array.isArray(r.skill_groups) ? r.skill_groups : [],
          isMaster: r.is_master,
          createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
          updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at)
        };
      }
    }

    if (!base) {
      base = {
        id: randomUUID(),
        name: 'Bản CV Tiêu Chuẩn',
        targetRole: val.data.jobDetails.position,
        summary: 'Kỹ sư phần mềm giàu kinh nghiệm phát triển các hệ thống hiện đại, hướng tới giải pháp tối ưu và hiệu quả cao.',
        experiences: [
          {
            id: 'exp-1',
            company: 'Công ty Công nghệ',
            role: val.data.jobDetails.position,
            period: '2023 - Nay',
            bulletPoints: [
              'Phát triển và triển khai các tính năng quan trọng phục vụ người dùng cuối',
              'Tham gia tối ưu hóa quy trình kiểm thử và chất lượng mã nguồn'
            ],
            technologies: ['TypeScript', 'React', 'Node.js']
          }
        ],
        skillGroups: [
          {
            category: 'Kỹ năng chuyên môn',
            skills: ['TypeScript', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git']
          }
        ],
        isMaster: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    return tailorResumeForJob(base, val.data.jobDetails);
  }
}
