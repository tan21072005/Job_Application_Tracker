import { Pool } from 'pg';
import {
  type AnalyticsSummaryDTO,
  type ApplicationGoalDTO,
  type ApplicationGoalInput,
  type AnalyticsTimeframe,
  calculateAnalyticsSummary,
  calculateGoalProgress,
  validateApplicationGoalInput,
  validateAnalyticsQuery
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export class AnalyticsService {
  private pool: Pool;
  private tableReady: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS user_analytics_goals (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        weekly_applications_target integer NOT NULL DEFAULT 5,
        monthly_interviews_target integer NOT NULL DEFAULT 2,
        target_offers integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.tableReady = true;
  }

  async getGoals(userId: string): Promise<ApplicationGoalDTO> {
    await this.ensureTable();
    const goalsRes = await this.pool.query<{
      weekly_applications_target: number;
      monthly_interviews_target: number;
      target_offers: number;
      updated_at: Date;
    }>(
      `SELECT weekly_applications_target, monthly_interviews_target, target_offers, updated_at
       FROM user_analytics_goals
       WHERE user_id = $1`,
      [userId]
    );

    const goalTargets: ApplicationGoalInput = goalsRes.rows[0]
      ? {
          weeklyApplicationsTarget: goalsRes.rows[0].weekly_applications_target,
          monthlyInterviewsTarget: goalsRes.rows[0].monthly_interviews_target,
          targetOffers: goalsRes.rows[0].target_offers
        }
      : {
          weeklyApplicationsTarget: 5,
          monthlyInterviewsTarget: 2,
          targetOffers: 1
        };

    const appsRes = await this.pool.query<{
      id: string;
      status: string;
      created_at: string;
      interviews: Array<{ at: string }> | null;
    }>(
      `SELECT 
         a.id,
         a.status,
         to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         COALESCE(
           json_agg(
             json_build_object(
               'at', to_char(i.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
             )
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'::json
         ) AS interviews
       FROM applications a
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.user_id = $1 AND a.deleted_at IS NULL
       GROUP BY a.id, a.status, a.created_at`,
      [userId]
    );

    const apps = appsRes.rows.map(r => ({
      id: r.id,
      status: r.status as any,
      createdAt: r.created_at,
      interviews: r.interviews || []
    }));

    return calculateGoalProgress(apps, goalTargets);
  }

  async updateGoals(userId: string, input: unknown): Promise<ApplicationGoalDTO> {
    await this.ensureTable();
    const val = validateApplicationGoalInput(input);
    if (!val.ok) {
      fail(422, val.message || 'Mục tiêu không hợp lệ.', 'invalid_request', val.errors);
    }

    const { weeklyApplicationsTarget, monthlyInterviewsTarget, targetOffers } = val.data;

    await this.pool.query(
      `INSERT INTO user_analytics_goals (user_id, weekly_applications_target, monthly_interviews_target, target_offers, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) DO UPDATE SET
         weekly_applications_target = EXCLUDED.weekly_applications_target,
         monthly_interviews_target = EXCLUDED.monthly_interviews_target,
         target_offers = EXCLUDED.target_offers,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, weeklyApplicationsTarget, monthlyInterviewsTarget, targetOffers]
    );

    return this.getGoals(userId);
  }

  async getSummary(userId: string, rawQuery: unknown): Promise<AnalyticsSummaryDTO> {
    await this.ensureTable();
    const valQuery = validateAnalyticsQuery(rawQuery);
    if (!valQuery.ok) {
      fail(422, valQuery.message || 'Truy vấn không hợp lệ.', 'invalid_request', valQuery.errors);
    }
    const timeframe = valQuery.data.timeframe as AnalyticsTimeframe;

    const goalsRes = await this.pool.query<{
      weekly_applications_target: number;
      monthly_interviews_target: number;
      target_offers: number;
    }>(
      `SELECT weekly_applications_target, monthly_interviews_target, target_offers
       FROM user_analytics_goals
       WHERE user_id = $1`,
      [userId]
    );

    const goalsInput: ApplicationGoalInput = goalsRes.rows[0]
      ? {
          weeklyApplicationsTarget: goalsRes.rows[0].weekly_applications_target,
          monthlyInterviewsTarget: goalsRes.rows[0].monthly_interviews_target,
          targetOffers: goalsRes.rows[0].target_offers
        }
      : {
          weeklyApplicationsTarget: 5,
          monthlyInterviewsTarget: 2,
          targetOffers: 1
        };

    const appsRes = await this.pool.query<{
      id: string;
      company: string;
      position: string;
      source: string | null;
      status: string;
      applied_at: string | null;
      created_at: string;
      updated_at: string;
      interviews: Array<{ id: string; title: string; at: string; status: string }> | null;
    }>(
      `SELECT 
         a.id,
         a.company,
         a.position,
         a.source,
         a.status,
         to_char(a.applied_at, 'YYYY-MM-DD') AS applied_at,
         to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
         to_char(a.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,
         COALESCE(
           json_agg(
             json_build_object(
               'id', i.id,
               'title', i.title,
               'at', to_char(i.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
               'status', i.status
             )
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'::json
         ) AS interviews
       FROM applications a
       LEFT JOIN interviews i ON i.application_id = a.id
       WHERE a.user_id = $1 AND a.deleted_at IS NULL
       GROUP BY a.id, a.company, a.position, a.source, a.status, a.applied_at, a.created_at, a.updated_at
       ORDER BY a.created_at DESC`,
      [userId]
    );

    const apps = appsRes.rows.map(r => ({
      id: r.id,
      company: r.company,
      position: r.position,
      source: r.source,
      status: r.status as any,
      appliedAt: r.applied_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      interviews: r.interviews || []
    }));

    return calculateAnalyticsSummary(apps, goalsInput, { timeframe });
  }
}
