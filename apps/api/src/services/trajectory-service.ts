import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type TrajectorySimulationDTO,
  type SimulateTrajectoryInputDTO,
  type UpdateCompetenciesInputDTO,
  type TrackType,
  type TrajectoryStepDTO,
  type PromotionReadinessDTO,
  simulateCareerTrajectory
} from '@jobtrack/contract';

export async function initTrajectoryTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS career_trajectories (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      current_role_title VARCHAR(255) NOT NULL,
      target_track VARCHAR(32) NOT NULL,
      current_level VARCHAR(64) NOT NULL,
      target_level VARCHAR(64) NOT NULL,
      horizon_years INTEGER NOT NULL DEFAULT 4,
      user_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
      roadmap_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      readiness JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id)
    );
    CREATE INDEX IF NOT EXISTS career_trajectories_user_idx ON career_trajectories (user_id);
  `);
}

export class TrajectoryService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getTrajectory(userId: string): Promise<TrajectorySimulationDTO | null> {
    await initTrajectoryTable(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM career_trajectories
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0 || !result.rows[0]) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async simulate(
    userId: string,
    input: SimulateTrajectoryInputDTO
  ): Promise<TrajectorySimulationDTO> {
    await initTrajectoryTable(this.pool);

    const simulation = simulateCareerTrajectory(input);
    const id = crypto.randomUUID();
    const now = new Date();

    const result = await this.pool.query(
      `INSERT INTO career_trajectories (
        id, user_id, current_role_title, target_track, current_level, target_level,
        horizon_years, user_scores, roadmap_steps, readiness, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id) DO UPDATE SET
        current_role_title = EXCLUDED.current_role_title,
        target_track = EXCLUDED.target_track,
        current_level = EXCLUDED.current_level,
        target_level = EXCLUDED.target_level,
        horizon_years = EXCLUDED.horizon_years,
        user_scores = EXCLUDED.user_scores,
        roadmap_steps = EXCLUDED.roadmap_steps,
        readiness = EXCLUDED.readiness,
        updated_at = EXCLUDED.updated_at
      RETURNING *`,
      [
        id,
        userId,
        simulation.currentRole,
        simulation.targetTrack,
        input.currentLevel || 'Senior',
        simulation.targetRole,
        simulation.horizonYears,
        JSON.stringify(input.userScores || {}),
        JSON.stringify(simulation.roadmapSteps),
        JSON.stringify(simulation.readiness),
        now,
        now
      ]
    );

    return this.mapRow(result.rows[0]);
  }

  async updateCompetencies(
    userId: string,
    input: UpdateCompetenciesInputDTO
  ): Promise<TrajectorySimulationDTO> {
    await initTrajectoryTable(this.pool);

    const existing = await this.getTrajectory(userId);

    const currentRole = existing ? existing.currentRole : 'Senior Software Engineer';
    const currentLevel = existing && existing.readiness ? existing.readiness.currentLevel : 'Senior';
    const targetTrack = existing ? existing.targetTrack : 'ic';
    const targetRole = existing ? existing.targetRole : (targetTrack === 'ic' ? 'Staff' : 'Tech Lead');
    const horizonYears = existing ? existing.horizonYears : 4;

    const simulateInput: SimulateTrajectoryInputDTO = {
      currentRole,
      currentLevel,
      targetTrack,
      targetRole,
      horizonYears,
      userScores: input.scores
    };

    return this.simulate(userId, simulateInput);
  }

  private mapRow(row: Record<string, unknown>): TrajectorySimulationDTO {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      currentRole: String(row.current_role_title),
      targetTrack: row.target_track as TrackType,
      targetRole: String(row.target_level),
      horizonYears: Number(row.horizon_years),
      roadmapSteps: typeof row.roadmap_steps === 'string'
        ? JSON.parse(row.roadmap_steps)
        : (row.roadmap_steps as TrajectoryStepDTO[]),
      readiness: typeof row.readiness === 'string'
        ? JSON.parse(row.readiness)
        : (row.readiness as PromotionReadinessDTO),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }
}
