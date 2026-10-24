import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type AnalyzeCultureInputDTO,
  type CultureCompatibilityReportDTO,
  type CultureQuestionGenerationInputDTO,
  type ReverseInterviewQuestionDTO,
  type CultureDimensionScoreDTO,
  evaluateCompanyCulture,
  generateReverseInterviewQuestions
} from '@jobtrack/contract';

export async function initCultureRadarTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_culture_radars (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      company VARCHAR(255) NOT NULL,
      target_role VARCHAR(255),
      dimension_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
      reverse_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      overall_score NUMERIC NOT NULL DEFAULT 70,
      critical_red_flags_count INTEGER NOT NULL DEFAULT 0,
      standout_green_flags_count INTEGER NOT NULL DEFAULT 0,
      summary TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS company_culture_radars_user_idx ON company_culture_radars (user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS company_culture_radars_comp_idx ON company_culture_radars (user_id, company);
  `);
}

export class CultureRadarService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getLatestRadar(
    userId: string,
    company?: string
  ): Promise<CultureCompatibilityReportDTO | null> {
    await initCultureRadarTable(this.pool);

    let query = `
      SELECT id, user_id, company, target_role, dimension_scores, reverse_questions, overall_score, critical_red_flags_count, standout_green_flags_count, summary, created_at
      FROM company_culture_radars
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (company && company.trim().length > 0) {
      query += ` AND LOWER(company) = LOWER($2)`;
      params.push(company.trim());
    }

    query += ` ORDER BY created_at DESC LIMIT 1`;

    const res = await this.pool.query(query, params);
    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      company: row.company,
      targetRole: row.target_role || undefined,
      calculatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      overallCompatibilityScore: Number(row.overall_score) || 70,
      dimensionScores: typeof row.dimension_scores === 'string' ? JSON.parse(row.dimension_scores) : (row.dimension_scores || []),
      reverseInterviewQuestions: typeof row.reverse_questions === 'string' ? JSON.parse(row.reverse_questions) : (row.reverse_questions || []),
      criticalRedFlagsCount: Number(row.critical_red_flags_count) || 0,
      standoutGreenFlagsCount: Number(row.standout_green_flags_count) || 0,
      synthesisSummary: row.summary || ''
    };
  }

  async analyzeCulture(
    userId: string,
    input: AnalyzeCultureInputDTO
  ): Promise<CultureCompatibilityReportDTO> {
    await initCultureRadarTable(this.pool);

    const evaluated = evaluateCompanyCulture(input.company, input.candidatePreferences);
    const questions = generateReverseInterviewQuestions(evaluated.dimensionScores, 'engineering_manager');

    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO company_culture_radars
       (id, user_id, company, target_role, dimension_scores, reverse_questions, overall_score, critical_red_flags_count, standout_green_flags_count, summary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)`,
      [
        id,
        userId,
        input.company,
        input.targetRole || null,
        JSON.stringify(evaluated.dimensionScores),
        JSON.stringify(questions),
        evaluated.overallScore,
        evaluated.criticalRedFlagsCount,
        evaluated.standoutGreenFlagsCount,
        evaluated.synthesisSummary,
        nowIso
      ]
    );

    return {
      id,
      userId,
      company: input.company,
      targetRole: input.targetRole,
      calculatedAt: nowIso,
      overallCompatibilityScore: evaluated.overallScore,
      dimensionScores: evaluated.dimensionScores,
      reverseInterviewQuestions: questions,
      criticalRedFlagsCount: evaluated.criticalRedFlagsCount,
      standoutGreenFlagsCount: evaluated.standoutGreenFlagsCount,
      synthesisSummary: evaluated.synthesisSummary
    };
  }

  generateQuestions(
    input: CultureQuestionGenerationInputDTO
  ): ReverseInterviewQuestionDTO[] {
    const scores: CultureDimensionScoreDTO[] = input.dimensionScores && input.dimensionScores.length > 0
      ? input.dimensionScores
      : evaluateCompanyCulture('Standard Tech').dimensionScores;

    return generateReverseInterviewQuestions(
      scores,
      input.targetRole || 'engineering_manager'
    );
  }
}
