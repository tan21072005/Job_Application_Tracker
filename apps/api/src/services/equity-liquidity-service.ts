import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ExecutiveEquityGrantDTO,
  type ExecutiveEquityGrantMutationDTO,
  type EquityModelDTO,
  type EquityModelMutationDTO,
  type CapTableSnapshotDTO,
  type DilutionRoundDTO,
  type TaxJurisdiction,
  type ExecutivePackageComparisonDTO,
  calculateDilutionPipeline,
  evaluateWaterfallMatrix,
  computeExerciseCostAndTax,
  compareExecutiveEquityPackages,
  exportEquityModelToMarkdown
} from '@jobtrack/contract';

export async function initEquityTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS equity_grants (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      company VARCHAR(255) NOT NULL,
      role VARCHAR(128) NOT NULL,
      grant_type VARCHAR(32) NOT NULL DEFAULT 'iso',
      share_count NUMERIC(16, 2) NOT NULL,
      strike_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
      current_fmv NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
      preferred_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
      grant_date DATE NOT NULL DEFAULT CURRENT_DATE,
      vesting_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      vesting_schedule_type VARCHAR(64) NOT NULL DEFAULT 'standard_4yr_1yr_cliff',
      cliff_months INTEGER NOT NULL DEFAULT 12,
      vesting_duration_months INTEGER NOT NULL DEFAULT 48,
      post_termination_exercise_months INTEGER NOT NULL DEFAULT 90,
      acceleration_clause VARCHAR(64) NOT NULL DEFAULT 'none',
      has_early_exercise BOOLEAN NOT NULL DEFAULT FALSE,
      section_83b_elected BOOLEAN NOT NULL DEFAULT FALSE,
      custom_vesting_percentages JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_equity_grants_user_company 
      ON equity_grants(user_id, company);
    CREATE INDEX IF NOT EXISTS idx_equity_grants_user_created 
      ON equity_grants(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_equity_grants_application 
      ON equity_grants(application_id);

    CREATE TABLE IF NOT EXISTS equity_models (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      grant_id UUID NOT NULL REFERENCES equity_grants(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      model_name VARCHAR(255) NOT NULL,
      cap_table JSONB NOT NULL DEFAULT '{}'::jsonb,
      dilution_rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
      exit_valuations JSONB NOT NULL DEFAULT '[]'::jsonb,
      tax_jurisdiction VARCHAR(64) NOT NULL DEFAULT 'us_federal_california',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_equity_models_user_updated 
      ON equity_models(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_equity_models_grant 
      ON equity_models(grant_id);
    CREATE INDEX IF NOT EXISTS idx_equity_models_user_app 
      ON equity_models(user_id, application_id);
  `);
}

export class EquityLiquidityService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listGrants(userId: string): Promise<ExecutiveEquityGrantDTO[]> {
    await initEquityTables(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM equity_grants WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(r => this.mapGrantRow(r));
  }

  async getGrant(userId: string, id: string): Promise<ExecutiveEquityGrantDTO | null> {
    await initEquityTables(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM equity_grants WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapGrantRow(res.rows[0]);
  }

  async createGrant(userId: string, input: ExecutiveEquityGrantMutationDTO): Promise<ExecutiveEquityGrantDTO> {
    await initEquityTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO equity_grants (
        id, user_id, application_id, company, role, grant_type,
        share_count, strike_price, current_fmv, preferred_price,
        grant_date, vesting_start_date, vesting_schedule_type,
        cliff_months, vesting_duration_months, post_termination_exercise_months,
        acceleration_clause, has_early_exercise, section_83b_elected,
        custom_vesting_percentages, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )`,
      [
        id,
        userId,
        input.applicationId || null,
        input.company,
        input.role,
        input.grantType,
        input.shareCount,
        input.strikePrice,
        input.currentFmv,
        input.preferredPrice,
        input.grantDate,
        input.vestingStartDate,
        input.vestingScheduleType,
        input.cliffMonths,
        input.vestingDurationMonths,
        input.postTerminationExerciseMonths,
        input.accelerationClause,
        input.hasEarlyExercise,
        input.section83bElected,
        JSON.stringify(input.customVestingPercentages || []),
        now,
        now
      ]
    );

    return (await this.getGrant(userId, id))!;
  }

  async updateGrant(
    userId: string,
    id: string,
    input: Partial<ExecutiveEquityGrantMutationDTO>
  ): Promise<ExecutiveEquityGrantDTO | null> {
    await initEquityTables(this.pool);
    const existing = await this.getGrant(userId, id);
    if (!existing) return null;

    const updated = { ...existing, ...input };
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE equity_grants SET
        company = $3,
        role = $4,
        grant_type = $5,
        share_count = $6,
        strike_price = $7,
        current_fmv = $8,
        preferred_price = $9,
        vesting_schedule_type = $10,
        cliff_months = $11,
        vesting_duration_months = $12,
        post_termination_exercise_months = $13,
        acceleration_clause = $14,
        has_early_exercise = $15,
        section_83b_elected = $16,
        custom_vesting_percentages = $17,
        updated_at = $18
      WHERE user_id = $1 AND id = $2`,
      [
        userId,
        id,
        updated.company,
        updated.role,
        updated.grantType,
        updated.shareCount,
        updated.strikePrice,
        updated.currentFmv,
        updated.preferredPrice,
        updated.vestingScheduleType,
        updated.cliffMonths,
        updated.vestingDurationMonths,
        updated.postTerminationExerciseMonths,
        updated.accelerationClause,
        updated.hasEarlyExercise,
        updated.section83bElected,
        JSON.stringify(updated.customVestingPercentages || []),
        now
      ]
    );

    return this.getGrant(userId, id);
  }

  async deleteGrant(userId: string, id: string): Promise<boolean> {
    await initEquityTables(this.pool);
    const res = await this.pool.query(
      `DELETE FROM equity_grants WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listModels(userId: string): Promise<EquityModelDTO[]> {
    await initEquityTables(this.pool);
    const res = await this.pool.query(
      `SELECT m.*, g.*, m.id as model_id, g.id as grant_row_id, m.created_at as model_created_at, m.updated_at as model_updated_at
       FROM equity_models m
       JOIN equity_grants g ON m.grant_id = g.id
       WHERE m.user_id = $1
       ORDER BY m.updated_at DESC`,
      [userId]
    );
    return res.rows.map(r => this.mapModelRow(r));
  }

  async getModel(userId: string, id: string): Promise<EquityModelDTO | null> {
    await initEquityTables(this.pool);
    const res = await this.pool.query(
      `SELECT m.*, g.*, m.id as model_id, g.id as grant_row_id, m.created_at as model_created_at, m.updated_at as model_updated_at
       FROM equity_models m
       JOIN equity_grants g ON m.grant_id = g.id
       WHERE m.user_id = $1 AND m.id = $2`,
      [userId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapModelRow(res.rows[0]);
  }

  async createModel(userId: string, input: EquityModelMutationDTO): Promise<EquityModelDTO> {
    await initEquityTables(this.pool);
    const grant = await this.createGrant(userId, input.grant);
    const modelId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO equity_models (
        id, user_id, grant_id, application_id, model_name,
        cap_table, dilution_rounds, exit_valuations, tax_jurisdiction,
        notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )`,
      [
        modelId,
        userId,
        grant.id,
        input.applicationId || null,
        input.modelName,
        JSON.stringify(input.capTable),
        JSON.stringify(input.dilutionRounds),
        JSON.stringify(input.exitValuations),
        input.taxJurisdiction,
        input.notes || null,
        now,
        now
      ]
    );

    return (await this.getModel(userId, modelId))!;
  }

  async updateModel(
    userId: string,
    id: string,
    input: Partial<EquityModelMutationDTO>
  ): Promise<EquityModelDTO | null> {
    await initEquityTables(this.pool);
    const existing = await this.getModel(userId, id);
    if (!existing) return null;

    if (input.grant) {
      await this.updateGrant(userId, existing.grant.id, input.grant);
    }

    const now = new Date().toISOString();
    await this.pool.query(
      `UPDATE equity_models SET
        model_name = COALESCE($3, model_name),
        cap_table = COALESCE($4, cap_table),
        dilution_rounds = COALESCE($5, dilution_rounds),
        exit_valuations = COALESCE($6, exit_valuations),
        tax_jurisdiction = COALESCE($7, tax_jurisdiction),
        notes = COALESCE($8, notes),
        updated_at = $9
      WHERE user_id = $1 AND id = $2`,
      [
        userId,
        id,
        input.modelName || null,
        input.capTable ? JSON.stringify(input.capTable) : null,
        input.dilutionRounds ? JSON.stringify(input.dilutionRounds) : null,
        input.exitValuations ? JSON.stringify(input.exitValuations) : null,
        input.taxJurisdiction || null,
        input.notes || null,
        now
      ]
    );

    return this.getModel(userId, id);
  }

  async deleteModel(userId: string, id: string): Promise<boolean> {
    await initEquityTables(this.pool);
    const existing = await this.getModel(userId, id);
    if (!existing) return false;

    const res = await this.pool.query(
      `DELETE FROM equity_models WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    await this.deleteGrant(userId, existing.grant.id);
    return (res.rowCount ?? 0) > 0;
  }

  async exportMarkdown(userId: string, id: string): Promise<string | null> {
    const model = await this.getModel(userId, id);
    if (!model) return null;
    return exportEquityModelToMarkdown(model);
  }

  async compareModels(
    userId: string,
    modelIdA: string,
    modelIdB: string
  ): Promise<ExecutivePackageComparisonDTO | null> {
    const a = await this.getModel(userId, modelIdA);
    const b = await this.getModel(userId, modelIdB);
    if (!a || !b) return null;
    return compareExecutiveEquityPackages(a, b);
  }

  private mapGrantRow(r: any): ExecutiveEquityGrantDTO {
    return {
      id: r.id,
      userId: r.user_id,
      applicationId: r.application_id,
      company: r.company,
      role: r.role,
      grantType: r.grant_type,
      shareCount: Number(r.share_count),
      strikePrice: Number(r.strike_price),
      currentFmv: Number(r.current_fmv),
      preferredPrice: Number(r.preferred_price),
      grantDate: typeof r.grant_date === 'string' ? r.grant_date : new Date(r.grant_date).toISOString().split('T')[0],
      vestingStartDate: typeof r.vesting_start_date === 'string' ? r.vesting_start_date : new Date(r.vesting_start_date).toISOString().split('T')[0],
      vestingScheduleType: r.vesting_schedule_type,
      cliffMonths: Number(r.cliff_months),
      vestingDurationMonths: Number(r.vesting_duration_months),
      postTerminationExerciseMonths: Number(r.post_termination_exercise_months),
      accelerationClause: r.acceleration_clause,
      hasEarlyExercise: Boolean(r.has_early_exercise),
      section83bElected: Boolean(r.section_83b_elected),
      customVestingPercentages: Array.isArray(r.custom_vesting_percentages) ? r.custom_vesting_percentages : []
    };
  }

  private mapModelRow(r: any): EquityModelDTO {
    const grant = this.mapGrantRow({
      ...r,
      id: r.grant_row_id || r.grant_id
    });

    const capTable: CapTableSnapshotDTO = typeof r.cap_table === 'string' ? JSON.parse(r.cap_table) : (r.cap_table || {});
    const dilutionRounds: DilutionRoundDTO[] = typeof r.dilution_rounds === 'string' ? JSON.parse(r.dilution_rounds) : (r.dilution_rounds || []);
    const exitValuations: number[] = typeof r.exit_valuations === 'string' ? JSON.parse(r.exit_valuations) : (r.exit_valuations || [25000000, 50000000, 100000000, 250000000, 500000000, 1000000000]);
    const taxJurisdiction: TaxJurisdiction = r.tax_jurisdiction || 'us_federal_california';

    const dilutionResult = calculateDilutionPipeline(capTable, grant.shareCount, dilutionRounds);
    const exitScenarios = evaluateWaterfallMatrix(
      exitValuations,
      dilutionResult.finalCapTable,
      dilutionResult.executiveDilutedShares,
      grant.strikePrice,
      taxJurisdiction
    );

    const medianExit = exitScenarios[Math.floor(exitScenarios.length / 2)] || exitScenarios[0];
    const targetFmv = medianExit ? medianExit.commonSharePrice : grant.currentFmv;

    const taxAnalysis = computeExerciseCostAndTax(
      grant,
      targetFmv,
      targetFmv,
      taxJurisdiction
    );

    return {
      id: r.model_id || r.id,
      userId: r.user_id,
      applicationId: r.application_id,
      modelName: r.model_name,
      grant,
      capTable,
      dilutionRounds,
      exitScenarios,
      taxAnalysis,
      notes: r.notes || undefined,
      createdAt: typeof r.model_created_at === 'string' ? r.model_created_at : new Date(r.model_created_at || r.created_at).toISOString(),
      updatedAt: typeof r.model_updated_at === 'string' ? r.model_updated_at : new Date(r.model_updated_at || r.updated_at).toISOString()
    };
  }
}
