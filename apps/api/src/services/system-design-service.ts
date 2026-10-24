import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type SystemDesignScenarioId,
  type SystemDesignDifficulty,
  type SystemDesignSessionStatus,
  type SystemCapacityInputDTO,
  type SystemCapacityEstimateDTO,
  type SystemDesignBlueprintDTO,
  type SystemDesignEvaluationDTO,
  type SystemDesignScenarioDTO,
  type SystemDesignSessionDTO,
  type SystemDesignSessionMutationInputDTO,
  SYSTEM_DESIGN_SCENARIOS,
  calculateCapacityEstimates,
  evaluateSystemArchitecture,
  exportBlueprintToMarkdown
} from '@jobtrack/contract';

export async function initSystemDesignTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_design_sessions (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      scenario_id VARCHAR(64) NOT NULL,
      target_role VARCHAR(128) NOT NULL DEFAULT 'Senior Software Engineer',
      difficulty VARCHAR(64) NOT NULL DEFAULT 'senior',
      capacity_input JSONB NOT NULL DEFAULT '{}'::jsonb,
      capacity_estimates JSONB NOT NULL DEFAULT '{}'::jsonb,
      blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
      status VARCHAR(64) NOT NULL DEFAULT 'draft',
      score INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_system_design_sessions_user_created 
      ON system_design_sessions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_system_design_sessions_user_scenario 
      ON system_design_sessions(user_id, scenario_id);

    CREATE TABLE IF NOT EXISTS system_design_evaluations (
      id UUID PRIMARY KEY,
      session_id UUID NOT NULL REFERENCES system_design_sessions(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      evaluation JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_system_design_evaluations_session 
      ON system_design_evaluations(session_id);
    CREATE INDEX IF NOT EXISTS idx_system_design_evaluations_user 
      ON system_design_evaluations(user_id);
  `);
}

export class SystemDesignService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  listScenarios(): SystemDesignScenarioDTO[] {
    return SYSTEM_DESIGN_SCENARIOS;
  }

  calculateCapacity(input: SystemCapacityInputDTO): SystemCapacityEstimateDTO {
    return calculateCapacityEstimates(input);
  }

  async listSessions(userId: string, scenarioId?: string): Promise<SystemDesignSessionDTO[]> {
    await initSystemDesignTables(this.pool);

    let query = `
      SELECT id, user_id, title, scenario_id, target_role, difficulty,
             capacity_input, capacity_estimates, blueprint, status, score,
             created_at, updated_at
      FROM system_design_sessions
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (scenarioId && scenarioId.trim().length > 0) {
      query += ` AND scenario_id = $2`;
      params.push(scenarioId.trim());
    }

    query += ` ORDER BY updated_at DESC`;

    const res = await this.pool.query(query, params);
    return res.rows.map(r => this.mapSessionRow(r));
  }

  async getSession(userId: string, id: string): Promise<SystemDesignSessionDTO | null> {
    await initSystemDesignTables(this.pool);

    const res = await this.pool.query(
      `SELECT id, user_id, title, scenario_id, target_role, difficulty,
              capacity_input, capacity_estimates, blueprint, status, score,
              created_at, updated_at
       FROM system_design_sessions
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (res.rows.length === 0) {
      return null;
    }

    const session = this.mapSessionRow(res.rows[0]);

    const evalRes = await this.pool.query(
      `SELECT evaluation
       FROM system_design_evaluations
       WHERE session_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [id, userId]
    );

    if (evalRes.rows.length > 0) {
      session.latestEvaluation = evalRes.rows[0].evaluation as SystemDesignEvaluationDTO;
    }

    return session;
  }

  async createSession(
    userId: string,
    input: SystemDesignSessionMutationInputDTO
  ): Promise<SystemDesignSessionDTO> {
    await initSystemDesignTables(this.pool);

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === input.scenarioId) || SYSTEM_DESIGN_SCENARIOS[0];
    const capacityInput = input.capacityInput || scenario.defaultCapacityInput;
    const capacityEstimates = calculateCapacityEstimates(capacityInput);
    const blueprint = input.blueprint || scenario.exemplarBlueprint;
    const targetRole = input.targetRole || 'Senior Software Engineer';
    const difficulty = input.difficulty || scenario.difficulty;
    const status = input.status || 'draft';

    await this.pool.query(
      `INSERT INTO system_design_sessions (
        id, user_id, title, scenario_id, target_role, difficulty,
        capacity_input, capacity_estimates, blueprint, status, score,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        userId,
        input.title.trim(),
        input.scenarioId,
        targetRole,
        difficulty,
        JSON.stringify(capacityInput),
        JSON.stringify(capacityEstimates),
        JSON.stringify(blueprint),
        status,
        null,
        nowIso,
        nowIso
      ]
    );

    return {
      id,
      userId,
      title: input.title.trim(),
      scenarioId: input.scenarioId,
      targetRole,
      difficulty,
      capacityInput,
      capacityEstimates,
      blueprint,
      status,
      score: undefined,
      latestEvaluation: null,
      createdAt: nowIso,
      updatedAt: nowIso
    };
  }

  async updateSession(
    userId: string,
    id: string,
    input: Partial<SystemDesignSessionMutationInputDTO>
  ): Promise<SystemDesignSessionDTO | null> {
    await initSystemDesignTables(this.pool);

    const current = await this.getSession(userId, id);
    if (!current) {
      return null;
    }

    const title = input.title !== undefined ? input.title.trim() : current.title;
    const scenarioId = input.scenarioId || current.scenarioId;
    const targetRole = input.targetRole || current.targetRole;
    const difficulty = input.difficulty || current.difficulty;
    const capacityInput = input.capacityInput || current.capacityInput;
    const capacityEstimates = input.capacityInput ? calculateCapacityEstimates(capacityInput) : current.capacityEstimates;
    const blueprint = input.blueprint || current.blueprint;
    const status = input.status || current.status;
    const nowIso = new Date().toISOString();

    await this.pool.query(
      `UPDATE system_design_sessions
       SET title = $1, scenario_id = $2, target_role = $3, difficulty = $4,
           capacity_input = $5, capacity_estimates = $6, blueprint = $7,
           status = $8, updated_at = $9
       WHERE id = $10 AND user_id = $11`,
      [
        title,
        scenarioId,
        targetRole,
        difficulty,
        JSON.stringify(capacityInput),
        JSON.stringify(capacityEstimates),
        JSON.stringify(blueprint),
        status,
        nowIso,
        id,
        userId
      ]
    );

    return {
      ...current,
      title,
      scenarioId,
      targetRole,
      difficulty,
      capacityInput,
      capacityEstimates,
      blueprint,
      status,
      updatedAt: nowIso
    };
  }

  async deleteSession(userId: string, id: string): Promise<boolean> {
    await initSystemDesignTables(this.pool);

    const res = await this.pool.query(
      `DELETE FROM system_design_sessions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return (res.rowCount ?? 0) > 0;
  }

  async evaluateSession(
    userId: string,
    id: string,
    targetRole?: string
  ): Promise<SystemDesignEvaluationDTO | null> {
    await initSystemDesignTables(this.pool);

    const session = await this.getSession(userId, id);
    if (!session) {
      return null;
    }

    const roleToEvaluate = targetRole || session.targetRole;
    const evaluation = evaluateSystemArchitecture(session.blueprint, session.scenarioId, roleToEvaluate);
    evaluation.sessionId = id;

    const evalId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO system_design_evaluations (
        id, session_id, user_id, evaluation, created_at
      ) VALUES ($1, $2, $3, $4, $5)`,
      [evalId, id, userId, JSON.stringify(evaluation), nowIso]
    );

    await this.pool.query(
      `UPDATE system_design_sessions
       SET score = $1, status = 'evaluated', updated_at = $2
       WHERE id = $3 AND user_id = $4`,
      [evaluation.overallScore, nowIso, id, userId]
    );

    return evaluation;
  }

  async exportMarkdown(userId: string, id: string): Promise<string | null> {
    const session = await this.getSession(userId, id);
    if (!session) {
      return null;
    }

    return exportBlueprintToMarkdown(session, session.latestEvaluation);
  }

  private mapSessionRow(row: Record<string, unknown>): SystemDesignSessionDTO {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      title: String(row.title),
      scenarioId: row.scenario_id as SystemDesignScenarioId,
      targetRole: String(row.target_role),
      difficulty: row.difficulty as SystemDesignDifficulty,
      capacityInput: typeof row.capacity_input === 'string' ? JSON.parse(row.capacity_input) : (row.capacity_input as SystemCapacityInputDTO),
      capacityEstimates: typeof row.capacity_estimates === 'string' ? JSON.parse(row.capacity_estimates) : (row.capacity_estimates as SystemCapacityEstimateDTO),
      blueprint: typeof row.blueprint === 'string' ? JSON.parse(row.blueprint) : (row.blueprint as SystemDesignBlueprintDTO),
      status: row.status as SystemDesignSessionStatus,
      score: row.score !== null && row.score !== undefined ? Number(row.score) : undefined,
      latestEvaluation: null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString()
    };
  }
}
