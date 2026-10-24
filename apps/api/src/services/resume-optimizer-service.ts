import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type OptimizeResumeInputDTO,
  type ApplyRewritesInputDTO,
  type OptimizedResumeVariantDTO,
  type AtsDiagnosticResultDTO,
  type BulletOptimizationProposalDTO,
  diagnoseAtsKeywordGaps,
  extractBulletsFromResume,
  rewriteBulletPointsXyz,
  synthesizeOptimizedResume
} from '@jobtrack/contract';

export async function initResumeOptimizationTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS resume_optimizations (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      job_title VARCHAR(255) NOT NULL,
      company VARCHAR(255) NOT NULL,
      original_resume TEXT NOT NULL,
      target_job_text TEXT NOT NULL,
      diagnostic_result JSONB NOT NULL DEFAULT '{}'::jsonb,
      proposals JSONB NOT NULL DEFAULT '[]'::jsonb,
      synthesized_resume TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS resume_optimizations_user_idx ON resume_optimizations (user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS resume_optimizations_app_idx ON resume_optimizations (application_id);
  `);
}

export class ResumeOptimizerService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async diagnoseAndOptimize(
    userId: string,
    input: OptimizeResumeInputDTO
  ): Promise<OptimizedResumeVariantDTO> {
    await initResumeOptimizationTable(this.pool);

    const diagnostic = diagnoseAtsKeywordGaps(input.resumeText, input.jobDescription);
    const bullets = extractBulletsFromResume(input.resumeText);
    const missingCritical = diagnostic.keywordGaps
      .filter(k => !k.matched)
      .slice(0, 6)
      .map(k => k.keyword);

    const proposals = rewriteBulletPointsXyz(bullets, missingCritical);

    const defaultAccepted: Record<string, string> = {};
    for (const p of proposals) {
      if (p.variants.length > 0) {
        defaultAccepted[p.originalBullet] = p.variants[0].rewrittenText;
      }
    }

    const synthesizedResume = synthesizeOptimizedResume(
      input.resumeText,
      defaultAccepted,
      missingCritical
    );

    const id = crypto.randomUUID();
    const now = new Date();

    const insertResult = await this.pool.query(
      `INSERT INTO resume_optimizations (
        id, user_id, application_id, job_title, company,
        original_resume, target_job_text, diagnostic_result, proposals,
        synthesized_resume, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING *`,
      [
        id,
        userId,
        input.applicationId || null,
        input.jobTitle || 'Software Engineer',
        input.company || 'Tech Company',
        input.resumeText,
        input.jobDescription,
        JSON.stringify(diagnostic),
        JSON.stringify(proposals),
        synthesizedResume,
        now
      ]
    );

    return this.mapRow(insertResult.rows[0]);
  }

  async applyRewrites(
    userId: string,
    id: string,
    input: ApplyRewritesInputDTO
  ): Promise<OptimizedResumeVariantDTO> {
    await initResumeOptimizationTable(this.pool);

    const existing = await this.getOptimization(userId, id);
    if (!existing) {
      throw new Error('Resume optimization record not found.');
    }

    const synthesizedResume = synthesizeOptimizedResume(
      existing.originalResume,
      input.acceptedBullets,
      input.injectedKeywords || []
    );

    const updatedDiagnostic = diagnoseAtsKeywordGaps(synthesizedResume, existing.targetJobText);

    const updatedProposals = existing.proposals.map(p => {
      const chosen = input.acceptedBullets[p.originalBullet];
      if (chosen) {
        const matchingVariant = p.variants.find(v => v.rewrittenText === chosen);
        return {
          ...p,
          selectedVariant: matchingVariant ? matchingVariant.variantType : p.selectedVariant
        };
      }
      return p;
    });

    const now = new Date();

    const updateResult = await this.pool.query(
      `UPDATE resume_optimizations SET
        diagnostic_result = $1,
        proposals = $2,
        synthesized_resume = $3,
        updated_at = $4
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        JSON.stringify(updatedDiagnostic),
        JSON.stringify(updatedProposals),
        synthesizedResume,
        now,
        id,
        userId
      ]
    );

    return this.mapRow(updateResult.rows[0]);
  }

  async getOptimization(userId: string, id: string): Promise<OptimizedResumeVariantDTO | null> {
    await initResumeOptimizationTable(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM resume_optimizations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rowCount === 0 || !result.rows[0]) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  async listOptimizations(userId: string): Promise<OptimizedResumeVariantDTO[]> {
    await initResumeOptimizationTable(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM resume_optimizations
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );

    return result.rows.map(this.mapRow);
  }

  async deleteOptimization(userId: string, id: string): Promise<boolean> {
    await initResumeOptimizationTable(this.pool);
    const result = await this.pool.query(
      `DELETE FROM resume_optimizations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  private mapRow(row: Record<string, unknown>): OptimizedResumeVariantDTO {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      applicationId: row.application_id ? String(row.application_id) : undefined,
      jobTitle: String(row.job_title),
      company: String(row.company),
      originalResume: String(row.original_resume),
      targetJobText: String(row.target_job_text),
      diagnosticResult: typeof row.diagnostic_result === 'string'
        ? JSON.parse(row.diagnostic_result)
        : (row.diagnostic_result as AtsDiagnosticResultDTO),
      proposals: typeof row.proposals === 'string'
        ? JSON.parse(row.proposals)
        : (row.proposals as BulletOptimizationProposalDTO[]),
      synthesizedResume: String(row.synthesized_resume),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }
}
