import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CalculateVelocityReportInputDTO,
  type PipelineVelocityReportDTO,
  type PipelineVelocitySimulationDTO,
  type PipelineVelocitySimulationInputDTO,
  type StageConversionRateDTO,
  type ApplicationStatus,
  computeStageConversionMetrics,
  detectPipelineBottlenecks,
  calculateVelocityTargets,
  simulatePipelineOutcomes
} from '@jobtrack/contract';

export async function initPipelineVelocityTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pipeline_velocity_reports (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_offer_date DATE NOT NULL,
      target_offer_count INTEGER NOT NULL DEFAULT 1,
      stage_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
      bottlenecks JSONB NOT NULL DEFAULT '[]'::jsonb,
      velocity_target JSONB NOT NULL DEFAULT '{}'::jsonb,
      simulation JSONB NOT NULL DEFAULT '{}'::jsonb,
      applications_analyzed INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS pipeline_velocity_reports_user_idx ON pipeline_velocity_reports (user_id, created_at DESC);
  `);
}

export class PipelineVelocityService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getLatestReport(userId: string): Promise<PipelineVelocityReportDTO | null> {
    await initPipelineVelocityTable(this.pool);

    const res = await this.pool.query(
      `SELECT id, user_id, target_offer_date, target_offer_count, stage_metrics, bottlenecks, velocity_target, simulation, applications_analyzed, created_at
       FROM pipeline_velocity_reports
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const targetDateStr = row.target_offer_date instanceof Date
      ? row.target_offer_date.toISOString().slice(0, 10)
      : String(row.target_offer_date).slice(0, 10);

    return {
      id: row.id,
      userId: row.user_id,
      targetOfferDate: targetDateStr,
      targetOfferCount: Number(row.target_offer_count) || 1,
      calculatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      stageMetrics: typeof row.stage_metrics === 'string' ? JSON.parse(row.stage_metrics) : (row.stage_metrics || []),
      bottlenecks: typeof row.bottlenecks === 'string' ? JSON.parse(row.bottlenecks) : (row.bottlenecks || []),
      velocityTarget: typeof row.velocity_target === 'string' ? JSON.parse(row.velocity_target) : (row.velocity_target || {}),
      simulation: typeof row.simulation === 'string' ? JSON.parse(row.simulation) : (row.simulation || {}),
      applicationsAnalyzed: Number(row.applications_analyzed) || 0
    };
  }

  async generateReport(
    userId: string,
    input: CalculateVelocityReportInputDTO
  ): Promise<PipelineVelocityReportDTO> {
    await initPipelineVelocityTable(this.pool);

    const appsRes = await this.pool.query(
      `SELECT id, status, applied_at, created_at, updated_at
       FROM applications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    const interviewsRes = await this.pool.query(
      `SELECT i.id, i.application_id, i.status, i.at
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       WHERE a.user_id = $1`,
      [userId]
    );

    const interviewsByApp: Record<string, Array<{ id: string; status: string; at: string }>> = {};
    for (const row of interviewsRes.rows) {
      const appId = row.application_id;
      if (!interviewsByApp[appId]) {
        interviewsByApp[appId] = [];
      }
      interviewsByApp[appId].push({
        id: row.id,
        status: row.status,
        at: row.at ? new Date(row.at).toISOString() : new Date().toISOString()
      });
    }

    const mappedApps = appsRes.rows.map(row => ({
      status: row.status as ApplicationStatus,
      appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      statusUpdatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
      interviews: interviewsByApp[row.id] || []
    }));

    const stageMetrics = computeStageConversionMetrics(mappedApps);
    const bottlenecks = detectPipelineBottlenecks(stageMetrics);

    const now = Date.now();
    const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;
    const recentAppsCount = mappedApps.filter(a => {
      const d = a.appliedAt ? Date.parse(a.appliedAt) : Date.parse(a.createdAt);
      return Number.isFinite(d) && d >= fourWeeksAgo;
    }).length;
    const weeklyVelocity = Math.max(1, Math.round((recentAppsCount / 4) * 10) / 10);

    const velocityTarget = calculateVelocityTargets(
      stageMetrics,
      input.targetOfferDate,
      input.targetOfferCount || 1,
      weeklyVelocity
    );

    const activeVelocity = input.simulatedWeeklyVelocity !== undefined
      ? input.simulatedWeeklyVelocity
      : velocityTarget.recommendedWeeklyApplications;

    const simulation = simulatePipelineOutcomes(
      activeVelocity,
      stageMetrics,
      input.simulationHorizonWeeks || 12
    );

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO pipeline_velocity_reports
       (id, user_id, target_offer_date, target_offer_count, stage_metrics, bottlenecks, velocity_target, simulation, applications_analyzed, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)`,
      [
        id,
        userId,
        input.targetOfferDate,
        input.targetOfferCount || 1,
        JSON.stringify(stageMetrics),
        JSON.stringify(bottlenecks),
        JSON.stringify(velocityTarget),
        JSON.stringify(simulation),
        mappedApps.length,
        nowIso
      ]
    );

    return {
      id,
      userId,
      targetOfferDate: input.targetOfferDate,
      targetOfferCount: input.targetOfferCount || 1,
      calculatedAt: nowIso,
      stageMetrics,
      bottlenecks,
      velocityTarget,
      simulation,
      applicationsAnalyzed: mappedApps.length
    };
  }

  simulate(
    input: PipelineVelocitySimulationInputDTO
  ): PipelineVelocitySimulationDTO {
    const metrics: StageConversionRateDTO[] = input.stageMetrics && input.stageMetrics.length > 0
      ? input.stageMetrics
      : computeStageConversionMetrics([]);

    return simulatePipelineOutcomes(
      input.weeklyVelocity,
      metrics,
      input.weeksHorizon || 12
    );
  }
}
