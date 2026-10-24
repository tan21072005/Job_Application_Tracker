import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  type SkillGapAnalysisDTO,
  type CareerRoadmapDTO,
  type LearningMilestoneDTO,
  type MilestoneStatus,
  extractSkillsFromApplications,
  generateCareerRoadmap,
  calculateRoadmapProgress
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export class RoadmapService {
  private pool: Pool;
  private schemaReady = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS career_roadmaps (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        target_role VARCHAR(255) NOT NULL,
        duration_weeks INTEGER NOT NULL DEFAULT 4,
        milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_career_roadmaps_user_id ON career_roadmaps(user_id);
    `);
    this.schemaReady = true;
  }

  async getSkillGapAnalysis(userId: string): Promise<SkillGapAnalysisDTO> {
    await this.ensureSchema();

    const appsRes = await this.pool.query<{
      company: string;
      position: string;
      notes: string | null;
    }>(
      `SELECT company, position, notes
       FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    const candidateSkills: string[] = [];

    const profileTableCheck = await this.pool.query<{ exists: boolean }>(
      `SELECT (to_regclass('candidate_profiles') IS NOT NULL) AS exists`
    );
    if (profileTableCheck.rows[0]?.exists) {
      const profileRes = await this.pool.query<{ skills: string[] | null }>(
        `SELECT skills FROM candidate_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      if (profileRes.rows[0]?.skills && Array.isArray(profileRes.rows[0].skills)) {
        for (const s of profileRes.rows[0].skills) {
          if (typeof s === 'string' && s.trim()) candidateSkills.push(s.trim());
        }
      }
    }

    const resumeTableCheck = await this.pool.query<{ exists: boolean }>(
      `SELECT (to_regclass('user_resumes') IS NOT NULL) AS exists`
    );
    if (resumeTableCheck.rows[0]?.exists) {
      const resumeRes = await this.pool.query<{ skill_groups: Array<{ skills?: string[] }> | null }>(
        `SELECT skill_groups FROM user_resumes WHERE user_id = $1 AND is_master = true LIMIT 1`,
        [userId]
      );
      if (resumeRes.rows[0]?.skill_groups && Array.isArray(resumeRes.rows[0].skill_groups)) {
        for (const sg of resumeRes.rows[0].skill_groups) {
          if (sg && Array.isArray(sg.skills)) {
            for (const s of sg.skills) {
              if (typeof s === 'string' && s.trim()) candidateSkills.push(s.trim());
            }
          }
        }
      }
    }

    return extractSkillsFromApplications(appsRes.rows, candidateSkills);
  }

  async getRoadmap(userId: string): Promise<CareerRoadmapDTO> {
    await this.ensureSchema();

    const res = await this.pool.query<{
      id: string;
      user_id: string;
      title: string;
      target_role: string;
      duration_weeks: number;
      milestones: LearningMilestoneDTO[];
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
         id,
         user_id,
         title,
         target_role,
         duration_weeks,
         milestones,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
       FROM career_roadmaps
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    if (res.rowCount && res.rows[0]) {
      const row = res.rows[0];
      const milestones = Array.isArray(row.milestones) ? row.milestones : [];
      return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        targetRole: row.target_role,
        durationWeeks: row.duration_weeks,
        milestones,
        overallProgressPercent: calculateRoadmapProgress(milestones),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    }

    const gap = await this.getSkillGapAnalysis(userId);
    const generated = generateCareerRoadmap(gap);
    const newId = randomUUID();

    const insertRes = await this.pool.query<{
      id: string;
      user_id: string;
      title: string;
      target_role: string;
      duration_weeks: number;
      milestones: LearningMilestoneDTO[];
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO career_roadmaps(id, user_id, title, target_role, duration_weeks, milestones, created_at, updated_at)
       VALUES($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING 
         id,
         user_id,
         title,
         target_role,
         duration_weeks,
         milestones,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`,
      [
        newId,
        userId,
        generated.title,
        generated.targetRole,
        generated.durationWeeks,
        JSON.stringify(generated.milestones)
      ]
    );

    const inserted = insertRes.rows[0];
    return {
      id: inserted.id,
      userId: inserted.user_id,
      title: inserted.title,
      targetRole: inserted.target_role,
      durationWeeks: inserted.duration_weeks,
      milestones: inserted.milestones,
      overallProgressPercent: calculateRoadmapProgress(inserted.milestones),
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at
    };
  }

  async generateRoadmap(
    userId: string,
    options: { targetRole?: string; focusSkills?: string[] } = {}
  ): Promise<CareerRoadmapDTO> {
    await this.ensureSchema();

    const gap = await this.getSkillGapAnalysis(userId);

    if (options.focusSkills && options.focusSkills.length > 0) {
      gap.recommendedFocusSkills = options.focusSkills;
    }

    const targetRole = options.targetRole && options.targetRole.trim()
      ? options.targetRole.trim()
      : 'Senior Software Specialist';

    const generated = generateCareerRoadmap(gap, targetRole);
    const newId = randomUUID();

    const insertRes = await this.pool.query<{
      id: string;
      user_id: string;
      title: string;
      target_role: string;
      duration_weeks: number;
      milestones: LearningMilestoneDTO[];
      created_at: string;
      updated_at: string;
    }>(
      `INSERT INTO career_roadmaps(id, user_id, title, target_role, duration_weeks, milestones, created_at, updated_at)
       VALUES($1, $2, $3, $4, $5, $6::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING 
         id,
         user_id,
         title,
         target_role,
         duration_weeks,
         milestones,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`,
      [
        newId,
        userId,
        generated.title,
        generated.targetRole,
        generated.durationWeeks,
        JSON.stringify(generated.milestones)
      ]
    );

    const inserted = insertRes.rows[0];
    return {
      id: inserted.id,
      userId: inserted.user_id,
      title: inserted.title,
      targetRole: inserted.target_role,
      durationWeeks: inserted.duration_weeks,
      milestones: inserted.milestones,
      overallProgressPercent: calculateRoadmapProgress(inserted.milestones),
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at
    };
  }

  async updateMilestone(
    userId: string,
    milestoneId: string,
    status: MilestoneStatus
  ): Promise<CareerRoadmapDTO> {
    await this.ensureSchema();

    const current = await this.getRoadmap(userId);
    const milestoneIndex = current.milestones.findIndex(m => m.id === milestoneId);

    if (milestoneIndex === -1) {
      fail(404, 'Không tìm thấy cột mốc học tập yêu cầu.', 'not_found');
    }

    const updatedMilestones = [...current.milestones];
    const target = { ...updatedMilestones[milestoneIndex] };
    target.status = status;
    target.completedAt = status === 'completed' ? new Date().toISOString() : null;
    updatedMilestones[milestoneIndex] = target;

    const res = await this.pool.query<{
      id: string;
      user_id: string;
      title: string;
      target_role: string;
      duration_weeks: number;
      milestones: LearningMilestoneDTO[];
      created_at: string;
      updated_at: string;
    }>(
      `UPDATE career_roadmaps
       SET milestones = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING 
         id,
         user_id,
         title,
         target_role,
         duration_weeks,
         milestones,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at`,
      [JSON.stringify(updatedMilestones), current.id, userId]
    );

    if (res.rowCount === 0) {
      fail(404, 'Không tìm thấy lộ trình sự nghiệp.', 'not_found');
    }

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      targetRole: row.target_role,
      durationWeeks: row.duration_weeks,
      milestones: row.milestones,
      overallProgressPercent: calculateRoadmapProgress(row.milestones),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async deleteRoadmap(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM career_roadmaps WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
