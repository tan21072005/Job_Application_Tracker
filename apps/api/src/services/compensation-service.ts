import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CompensationPackageDTO,
  type EquityVestingMilestoneDTO,
  type CompensationForecastScenarioDTO,
  type CompensationBenchmarkDTO,
  type NegotiationLeveragePointDTO,
  type CompensationForecastDTO,
  type CreateCompensationForecastInputDTO,
  type SeniorityLevel,
  type Currency,
  computeVestingSchedule,
  forecastCompensationScenarios,
  evaluateMarketBenchmark,
  deriveNegotiationLeveragePoints
} from '@jobtrack/contract';

export async function initCompensationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS compensation_forecasts (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      company VARCHAR(255) NOT NULL,
      role VARCHAR(255) NOT NULL,
      level VARCHAR(64) NOT NULL,
      package JSONB NOT NULL,
      scenarios JSONB NOT NULL,
      vesting_schedule JSONB NOT NULL,
      benchmark JSONB NOT NULL,
      leverage_points JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS compensation_forecasts_user_idx ON compensation_forecasts (user_id, updated_at DESC);
  `);
}

export class CompensationService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listForecasts(userId: string): Promise<CompensationForecastDTO[]> {
    await initCompensationTable(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM compensation_forecasts
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapRow);
  }

  async getForecast(userId: string, id: string): Promise<CompensationForecastDTO | null> {
    await initCompensationTable(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM compensation_forecasts
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0 || !result.rows[0]) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async createForecast(
    userId: string,
    input: CreateCompensationForecastInputDTO
  ): Promise<CompensationForecastDTO> {
    await initCompensationTable(this.pool);

    const vestingSchedule = computeVestingSchedule(input.package.equityGrant);
    const scenarios = forecastCompensationScenarios(input.package);

    const baseAnnual = input.package.baseSalaryMonthly * 12;
    const m13 = input.package.hasMonth13 ? input.package.baseSalaryMonthly : 0;
    const bonus = input.package.performanceBonusAnnual || 0;
    const candidateAnnualCash = baseAnnual + m13 + bonus;

    const benchmark = evaluateMarketBenchmark(
      input.role,
      input.level,
      candidateAnnualCash,
      input.package.currency
    );

    const leveragePoints = deriveNegotiationLeveragePoints(
      input.package,
      benchmark,
      input.company
    );

    const id = crypto.randomUUID();
    const now = new Date();

    const insertResult = await this.pool.query(
      `INSERT INTO compensation_forecasts (
        id, user_id, application_id, company, role, level,
        package, scenarios, vesting_schedule, benchmark, leverage_points,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
      RETURNING *`,
      [
        id,
        userId,
        input.applicationId || null,
        input.company,
        input.role,
        input.level,
        JSON.stringify(input.package),
        JSON.stringify(scenarios),
        JSON.stringify(vestingSchedule),
        JSON.stringify(benchmark),
        JSON.stringify(leveragePoints),
        now
      ]
    );

    return this.mapRow(insertResult.rows[0]);
  }

  async deleteForecast(userId: string, id: string): Promise<boolean> {
    await initCompensationTable(this.pool);
    const result = await this.pool.query(
      `DELETE FROM compensation_forecasts
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getBenchmark(
    role: string,
    level: SeniorityLevel,
    annualCash: number,
    currency: Currency = 'VND'
  ): Promise<CompensationBenchmarkDTO> {
    return evaluateMarketBenchmark(role, level, annualCash, currency);
  }

  private mapRow(row: Record<string, unknown>): CompensationForecastDTO {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      applicationId: row.application_id ? String(row.application_id) : null,
      company: String(row.company),
      role: String(row.role),
      level: row.level as SeniorityLevel,
      package: typeof row.package === 'string' ? JSON.parse(row.package) : (row.package as CompensationPackageDTO),
      scenarios: typeof row.scenarios === 'string' ? JSON.parse(row.scenarios) : (row.scenarios as {
        conservative: CompensationForecastScenarioDTO;
        baseline: CompensationForecastScenarioDTO;
        optimistic: CompensationForecastScenarioDTO;
      }),
      vestingSchedule: typeof row.vesting_schedule === 'string' ? JSON.parse(row.vesting_schedule) : (row.vesting_schedule as EquityVestingMilestoneDTO[]),
      benchmark: typeof row.benchmark === 'string' ? JSON.parse(row.benchmark) : (row.benchmark as CompensationBenchmarkDTO),
      leveragePoints: typeof row.leverage_points === 'string' ? JSON.parse(row.leverage_points) : (row.leverage_points as NegotiationLeveragePointDTO[]),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }
}
