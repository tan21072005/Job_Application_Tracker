import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type PortfolioConfigDTO,
  type PublicDossierViewDTO,
  type ShareTokenDTO,
  type UpdatePortfolioInputDTO,
  type DossierSkillItemDTO,
  type DossierRoadmapProgressDTO,
  type DossierSimulationReadinessDTO,
  DEFAULT_DISPLAY_SETTINGS,
  synthesizePublicDossier
} from '@jobtrack/contract';

export async function initPortfolioTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS candidate_portfolios (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      slug VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      location VARCHAR(255),
      salary_expectation VARCHAR(100),
      target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
      display_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_public BOOLEAN NOT NULL DEFAULT true,
      share_token VARCHAR(128) UNIQUE,
      token_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS candidate_portfolios_user_idx ON candidate_portfolios (user_id);
    CREATE INDEX IF NOT EXISTS candidate_portfolios_token_idx ON candidate_portfolios (share_token) WHERE share_token IS NOT NULL;

    CREATE TABLE IF NOT EXISTS portfolio_access_logs (
      id UUID PRIMARY KEY,
      portfolio_id UUID NOT NULL REFERENCES candidate_portfolios(id) ON DELETE CASCADE,
      token VARCHAR(128) NOT NULL,
      viewer_ip_hash VARCHAR(64),
      user_agent TEXT,
      accessed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS portfolio_access_logs_portfolio_idx ON portfolio_access_logs (portfolio_id, accessed_at DESC);
  `);
}

export class PortfolioService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async getPortfolio(userId: string): Promise<PortfolioConfigDTO> {
    await initPortfolioTable(this.pool);
    const existing = await this.pool.query(
      `SELECT p.*,
        (SELECT COUNT(*)::int FROM portfolio_access_logs WHERE portfolio_id = p.id) as access_count,
        (SELECT MAX(accessed_at) FROM portfolio_access_logs WHERE portfolio_id = p.id) as last_accessed_at
       FROM candidate_portfolios p
       WHERE p.user_id = $1`,
      [userId]
    );

    if (existing.rowCount && existing.rows[0]) {
      return this.mapRow(existing.rows[0]);
    }

    const newId = crypto.randomUUID();
    const defaultSlug = `candidate-${userId.slice(0, 8)}`;
    const now = new Date();

    const created = await this.pool.query(
      `INSERT INTO candidate_portfolios (
        id, user_id, slug, title, bio, location, salary_expectation,
        target_roles, display_settings, is_public, share_token, token_expires_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NULL, NULL, $10, $10)
      RETURNING *, 0 as access_count, NULL as last_accessed_at`,
      [
        newId,
        userId,
        defaultSlug,
        '',
        '',
        null,
        null,
        JSON.stringify([]),
        JSON.stringify(DEFAULT_DISPLAY_SETTINGS),
        now
      ]
    );

    return this.mapRow(created.rows[0]);
  }

  async updatePortfolio(userId: string, input: UpdatePortfolioInputDTO): Promise<PortfolioConfigDTO> {
    await initPortfolioTable(this.pool);
    const current = await this.getPortfolio(userId);

    const title = input.title !== undefined ? input.title.trim() : current.title;
    const slug = input.slug !== undefined ? input.slug.trim().toLowerCase() : current.slug;
    const bio = input.bio !== undefined ? input.bio : current.bio;
    const location = input.location !== undefined ? input.location : current.location;
    const salaryExpectation = input.salaryExpectation !== undefined ? input.salaryExpectation : current.salaryExpectation;
    const targetRoles = input.targetRoles !== undefined ? input.targetRoles : current.targetRoles;
    const isPublic = input.isPublic !== undefined ? input.isPublic : current.isPublic;

    const displaySettings = {
      ...current.displaySettings,
      ...(input.displaySettings || {})
    };

    const now = new Date();

    const updated = await this.pool.query(
      `UPDATE candidate_portfolios
       SET title = $1, slug = $2, bio = $3, location = $4, salary_expectation = $5,
           target_roles = $6, display_settings = $7, is_public = $8, updated_at = $9
       WHERE user_id = $10
       RETURNING *,
        (SELECT COUNT(*)::int FROM portfolio_access_logs WHERE portfolio_id = candidate_portfolios.id) as access_count,
        (SELECT MAX(accessed_at) FROM portfolio_access_logs WHERE portfolio_id = candidate_portfolios.id) as last_accessed_at`,
      [
        title,
        slug,
        bio,
        location,
        salaryExpectation,
        JSON.stringify(targetRoles),
        JSON.stringify(displaySettings),
        isPublic,
        now,
        userId
      ]
    );

    return this.mapRow(updated.rows[0]);
  }

  async generateToken(userId: string, expiryDays?: number): Promise<ShareTokenDTO> {
    await initPortfolioTable(this.pool);
    const portfolio = await this.getPortfolio(userId);
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 86400000) : null;
    const now = new Date();

    await this.pool.query(
      `UPDATE candidate_portfolios
       SET share_token = $1, token_expires_at = $2, updated_at = $3
       WHERE user_id = $4`,
      [token, expiresAt, now, userId]
    );

    return {
      token,
      publicUrl: `/dossier/${token}`,
      accessCount: portfolio.accessCount || 0,
      lastAccessedAt: portfolio.lastAccessedAt || null,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      isActive: true
    };
  }

  async revokeToken(userId: string): Promise<boolean> {
    await initPortfolioTable(this.pool);
    const res = await this.pool.query(
      `UPDATE candidate_portfolios
       SET share_token = NULL, token_expires_at = NULL, updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getPublicDossier(
    token: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<PublicDossierViewDTO | null> {
    await initPortfolioTable(this.pool);
    const res = await this.pool.query(
      `SELECT p.*, u.email as user_email
       FROM candidate_portfolios p
       JOIN users u ON u.id = p.user_id
       WHERE p.share_token = $1 AND p.is_public = true`,
      [token]
    );

    if (res.rowCount === 0) return null;
    const row = res.rows[0];

    if (row.token_expires_at && new Date(row.token_expires_at) < new Date()) {
      return null;
    }

    const logId = crypto.randomUUID();
    const ipHash = clientIp ? crypto.createHash('sha256').update(clientIp).digest('hex').slice(0, 16) : null;
    await this.pool.query(
      `INSERT INTO portfolio_access_logs (id, portfolio_id, token, viewer_ip_hash, user_agent, accessed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [logId, row.id, token, ipHash, userAgent || null]
    );

    const userId = row.user_id as string;
    const config = this.mapRow(row);

    const userAppsRes = await this.pool.query(
      `SELECT COUNT(*)::int as active_interviews
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       WHERE a.user_id = $1 AND i.status = 'Scheduled' AND i.at >= NOW()`,
      [userId]
    );
    const activeInterviewsCount = (userAppsRes.rows[0]?.active_interviews as number) || 0;

    const skills = await this.collectVerifiedSkills(userId);
    const roadmap = await this.collectRoadmapProgress(userId, config);
    const simulation = await this.collectSimulationReadiness(userId);

    const candidateEmail = (row.user_email as string) || '';
    const candidateName = candidateEmail.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() || 'Ứng Viên JobTrack';

    return synthesizePublicDossier(
      config,
      candidateName,
      skills,
      roadmap,
      simulation,
      activeInterviewsCount
    );
  }

  private async collectVerifiedSkills(userId: string): Promise<DossierSkillItemDTO[]> {
    const collected: DossierSkillItemDTO[] = [];
    const seen = new Set<string>();

    const push = (raw: unknown, category: string) => {
      if (typeof raw !== 'string') return;
      const name = raw.trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      collected.push({ name, category, verified: true });
    };

    const profileExists = await this.pool.query<{ exists: boolean }>(
      `SELECT (to_regclass('public.candidate_profiles') IS NOT NULL) AS exists`
    );
    if (profileExists.rows[0]?.exists) {
      const profileRes = await this.pool.query<{ skills: unknown }>(
        `SELECT skills FROM candidate_profiles WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const profileSkills = profileRes.rows[0]?.skills;
      if (Array.isArray(profileSkills)) {
        for (const entry of profileSkills) push(entry, 'Kỹ năng');
      }
    }

    const resumeExists = await this.pool.query<{ exists: boolean }>(
      `SELECT (to_regclass('public.user_resumes') IS NOT NULL) AS exists`
    );
    if (resumeExists.rows[0]?.exists) {
      const resumeRes = await this.pool.query<{ skill_groups: unknown }>(
        `SELECT skill_groups FROM user_resumes WHERE user_id = $1 ORDER BY is_master DESC NULLS LAST, updated_at DESC LIMIT 1`,
        [userId]
      );
      const groups = resumeRes.rows[0]?.skill_groups;
      if (Array.isArray(groups)) {
        for (const group of groups) {
          const bucket = group as { category?: unknown; skills?: unknown };
          const category = typeof bucket.category === 'string' && bucket.category.trim() ? bucket.category.trim() : 'Kỹ năng';
          if (Array.isArray(bucket.skills)) {
            for (const entry of bucket.skills) push(entry, category);
          }
        }
      }
    }

    return collected.slice(0, 12);
  }

  private async collectRoadmapProgress(
    userId: string,
    config: PortfolioConfigDTO
  ): Promise<DossierRoadmapProgressDTO | null> {
    const roadmapExists = await this.pool.query<{ exists: boolean }>(
      `SELECT (to_regclass('public.career_roadmaps') IS NOT NULL) AS exists`
    );
    if (!roadmapExists.rows[0]?.exists) return null;

    const res = await this.pool.query<{ target_role: string; milestones: unknown }>(
      `SELECT target_role, milestones FROM career_roadmaps
       WHERE user_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    if (!res.rowCount || !res.rows[0]) return null;

    const milestones = Array.isArray(res.rows[0].milestones) ? res.rows[0].milestones as Array<{ status?: unknown }> : [];
    if (milestones.length === 0) return null;

    const completed = milestones.filter(m => m && (m.status === 'completed' || m.status === 'done')).length;
    const progressPercent = Math.round((completed / milestones.length) * 100);

    return {
      targetRole: res.rows[0].target_role || config.targetRoles[0] || '',
      progressPercent,
      completedMilestones: completed,
      totalMilestones: milestones.length
    };
  }

  private async collectSimulationReadiness(userId: string): Promise<DossierSimulationReadinessDTO | null> {
    const simExists = await this.pool.query<{ exists: unknown }>(
      `SELECT to_regclass('public.interview_simulation_sessions') AS exists`
    );
    if (!simExists.rows[0]?.exists) return null;

    const simRes = await this.pool.query<{ report: unknown; track: unknown; updated_at: unknown }>(
      `SELECT report, track, updated_at FROM interview_simulation_sessions
       WHERE user_id = $1 AND status = 'completed' AND report IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`,
      [userId]
    );
    if (!simRes.rowCount || !simRes.rows[0]) return null;

    const report = simRes.rows[0].report as { readinessGrade?: unknown; overallScore?: unknown } | null;
    if (!report) return null;

    const rawScore = typeof report.overallScore === 'number' ? report.overallScore : null;
    if (rawScore === null || !Number.isFinite(rawScore)) return null;

    return {
      grade: (report.readinessGrade as DossierSimulationReadinessDTO['grade']) || 'Needs Practice',
      score: Math.max(0, Math.min(100, Math.round(rawScore))),
      track: typeof simRes.rows[0].track === 'string' ? simRes.rows[0].track as string : 'system_design'
    };
  }

  private mapRow(row: Record<string, unknown>): PortfolioConfigDTO {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      slug: row.slug as string,
      title: row.title as string,
      bio: (row.bio as string) || '',
      location: (row.location as string) || null,
      salaryExpectation: (row.salary_expectation as string) || null,
      targetRoles: (Array.isArray(row.target_roles) ? row.target_roles : []) as string[],
      displaySettings: (row.display_settings || DEFAULT_DISPLAY_SETTINGS) as PortfolioConfigDTO['displaySettings'],
      isPublic: Boolean(row.is_public),
      shareToken: (row.share_token as string) || null,
      tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at as string).toISOString() : null,
      accessCount: typeof row.access_count === 'number' ? row.access_count : 0,
      lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at as string).toISOString() : null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
