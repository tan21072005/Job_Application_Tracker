import { Pool } from 'pg';
import {
  type DecisionDimensionKey,
  type ApplicationScorecardInput,
  type DecisionMatrixComparison,
  DEFAULT_WEIGHT_PROFILE,
  normalizeWeights,
  evaluateDecisionMatrix
} from '@jobtrack/contract';

export class DecisionService {
  private pool: Pool;
  private migrationDone = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.migrationDone) return;
    await this.pool.query(`
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS scorecard JSONB NOT NULL DEFAULT '{}'::jsonb;

      CREATE TABLE IF NOT EXISTS user_decision_weights (
        user_id VARCHAR(64) PRIMARY KEY,
        weights JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    this.migrationDone = true;
  }

  async getWeights(userId: string): Promise<Record<DecisionDimensionKey, number>> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT weights FROM user_decision_weights WHERE user_id = $1`,
      [userId]
    );

    if (res.rowCount === 0) {
      return { ...DEFAULT_WEIGHT_PROFILE };
    }

    return normalizeWeights(res.rows[0].weights);
  }

  async saveWeights(
    userId: string,
    weights: Record<DecisionDimensionKey, number>
  ): Promise<Record<DecisionDimensionKey, number>> {
    await this.ensureSchema();
    const normalized = normalizeWeights(weights);

    const res = await this.pool.query(
      `INSERT INTO user_decision_weights (user_id, weights, updated_at)
       VALUES ($1, $2::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id)
       DO UPDATE SET weights = EXCLUDED.weights, updated_at = CURRENT_TIMESTAMP
       RETURNING weights`,
      [userId, JSON.stringify(normalized)]
    );

    return res.rows[0].weights;
  }

  async updateScorecard(
    userId: string,
    applicationId: string,
    input: ApplicationScorecardInput
  ): Promise<{
    id: string;
    company: string;
    position: string;
    scorecard: Record<DecisionDimensionKey, number>;
    notes?: string;
  } | null> {
    await this.ensureSchema();

    const checkRes = await this.pool.query(
      `SELECT id, company, position FROM applications WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [applicationId, userId]
    );

    if (checkRes.rowCount === 0) {
      return null;
    }

    const app = checkRes.rows[0];
    const scorecardData = {
      ...input.scores,
      ...(input.notes ? { _notes: input.notes } : {})
    };

    const updateRes = await this.pool.query(
      `UPDATE applications
       SET scorecard = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL
       RETURNING id, company, position, scorecard`,
      [JSON.stringify(scorecardData), applicationId, userId]
    );

    const row = updateRes.rows[0];
    return {
      id: row.id,
      company: row.company,
      position: row.position,
      scorecard: input.scores,
      notes: input.notes
    };
  }

  async getScorecard(
    userId: string,
    applicationId: string
  ): Promise<{
    id: string;
    company: string;
    position: string;
    scorecard: Record<DecisionDimensionKey, number>;
    notes?: string;
  } | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT id, company, position, scorecard FROM applications WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [applicationId, userId]
    );

    if (res.rowCount === 0) {
      return null;
    }

    const row = res.rows[0];
    const rawScorecard = row.scorecard || {};
    const notes = typeof rawScorecard._notes === 'string' ? rawScorecard._notes : undefined;

    const safeScores: Record<DecisionDimensionKey, number> = {
      compensation: 5,
      work_life_balance: 5,
      career_growth: 5,
      company_culture: 5,
      commute_flexibility: 5,
      leadership_team: 5,
      tech_stack: 5
    };

    for (const key of Object.keys(safeScores) as DecisionDimensionKey[]) {
      if (typeof rawScorecard[key] === 'number') {
        safeScores[key] = rawScorecard[key];
      }
    }

    return {
      id: row.id,
      company: row.company,
      position: row.position,
      scorecard: safeScores,
      notes
    };
  }

  async getDecisionMatrix(
    userId: string,
    applicationIds?: string[]
  ): Promise<DecisionMatrixComparison> {
    await this.ensureSchema();
    const weights = await this.getWeights(userId);

    let query = `
      SELECT id, company, position, status, scorecard
      FROM applications
      WHERE user_id = $1 AND deleted_at IS NULL
    `;
    const params: unknown[] = [userId];

    if (applicationIds && applicationIds.length > 0) {
      query += ` AND id = ANY($2)`;
      params.push(applicationIds);
    }

    query += ` ORDER BY created_at DESC`;

    const res = await this.pool.query(query, params);

    const items = res.rows.map((row) => ({
      id: row.id,
      company: row.company,
      position: row.position,
      status: row.status,
      scores: row.scorecard || {}
    }));

    return evaluateDecisionMatrix(items, weights);
  }
}
