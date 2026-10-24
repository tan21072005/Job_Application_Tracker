import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ExecutiveOnboardingPlanDTO,
  type ExecutiveOnboardingPlanMutationDTO,
  type StakeholderDTO,
  type StakeholderMutationDTO,
  type OnboardingMilestoneDTO,
  type OnboardingMilestoneMutationDTO,
  type ExecutiveDiagnosticsDTO,
  type ExecutiveDiagnosticsMutationDTO,
  type ExecutiveMemoType,
  createDefaultExecutiveDiagnostics,
  computeDiagnosticHealthIndex,
  computeTransitionMomentum,
  generateExecutiveMemoMarkdown
} from '@jobtrack/contract';

export async function initExecutiveOnboardingTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS executive_onboarding_plans (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      company_name VARCHAR(255) NOT NULL,
      role_title VARCHAR(255) NOT NULL,
      start_date DATE NOT NULL DEFAULT CURRENT_DATE,
      current_day INTEGER NOT NULL DEFAULT 1,
      executive_sponsor_name VARCHAR(255) NOT NULL DEFAULT '',
      diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_exec_onboarding_plans_user_created
      ON executive_onboarding_plans(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_exec_onboarding_plans_user_company
      ON executive_onboarding_plans(user_id, company_name);
    CREATE INDEX IF NOT EXISTS idx_exec_onboarding_plans_app
      ON executive_onboarding_plans(application_id);

    CREATE TABLE IF NOT EXISTS onboarding_stakeholders (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES executive_onboarding_plans(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      role_title VARCHAR(255) NOT NULL,
      category VARCHAR(64) NOT NULL,
      expectations TEXT NOT NULL DEFAULT '',
      pain_points TEXT NOT NULL DEFAULT '',
      political_dynamics TEXT NOT NULL DEFAULT '',
      sentiment_score INTEGER NOT NULL DEFAULT 3,
      interview_date DATE,
      status VARCHAR(32) NOT NULL DEFAULT 'identified',
      alignment_level VARCHAR(32) NOT NULL DEFAULT 'partially_aligned',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_onboarding_stakeholders_plan
      ON onboarding_stakeholders(plan_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_onboarding_stakeholders_user
      ON onboarding_stakeholders(user_id);

    CREATE TABLE IF NOT EXISTS onboarding_milestones (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plan_id UUID NOT NULL REFERENCES executive_onboarding_plans(id) ON DELETE CASCADE,
      phase VARCHAR(64) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      target_day INTEGER NOT NULL DEFAULT 30,
      delivered_day INTEGER,
      status VARCHAR(32) NOT NULL DEFAULT 'planned',
      is_quick_win BOOLEAN NOT NULL DEFAULT FALSE,
      delivery_estimate_days INTEGER NOT NULL DEFAULT 7,
      impact_score INTEGER NOT NULL DEFAULT 5,
      blocker_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_onboarding_milestones_plan
      ON onboarding_milestones(plan_id, target_day ASC);
    CREATE INDEX IF NOT EXISTS idx_onboarding_milestones_user
      ON onboarding_milestones(user_id);
  `);
}

export class ExecutiveOnboardingService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listPlans(userId: string): Promise<ExecutiveOnboardingPlanDTO[]> {
    await initExecutiveOnboardingTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM executive_onboarding_plans WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const plans: ExecutiveOnboardingPlanDTO[] = [];
    for (const row of result.rows) {
      const plan = await this.assemblePlan(userId, row);
      plans.push(plan);
    }
    return plans;
  }

  async getPlan(userId: string, id: string): Promise<ExecutiveOnboardingPlanDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM executive_onboarding_plans WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (result.rows.length === 0) return null;
    return this.assemblePlan(userId, result.rows[0]);
  }

  async createPlan(userId: string, input: ExecutiveOnboardingPlanMutationDTO): Promise<ExecutiveOnboardingPlanDTO> {
    await initExecutiveOnboardingTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const initialDiagnostics = createDefaultExecutiveDiagnostics();

    await this.pool.query(
      `INSERT INTO executive_onboarding_plans (
        id, user_id, application_id, company_name, role_title, start_date, current_day,
        executive_sponsor_name, diagnostics, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        userId,
        input.applicationId || null,
        input.companyName,
        input.roleTitle,
        input.startDate,
        input.currentDay,
        input.executiveSponsorName,
        JSON.stringify(initialDiagnostics),
        now,
        now
      ]
    );

    const defaultStakeholders: StakeholderMutationDTO[] = [
      {
        name: input.executiveSponsorName || 'Chief Executive Officer',
        roleTitle: 'CEO & Founder',
        category: 'executive_sponsor',
        expectations: 'Establish technology roadmap confidence and de-risk cloud architecture.',
        painPoints: 'Quarterly feature delays and enterprise client delivery commitments.',
        politicalDynamics: 'Primary visionary; direct accountability relationship.',
        sentimentScore: 5,
        interviewDate: input.startDate,
        status: 'completed',
        alignmentLevel: 'strongly_aligned'
      },
      {
        name: 'Head of Product',
        roleTitle: 'VP of Product Management',
        category: 'peer_executive',
        expectations: 'Joint quarterly roadmap discovery and higher release velocity.',
        painPoints: 'Unscheduled engineering hotfixes derailing sprint releases.',
        politicalDynamics: 'Product-first corporate history; key strategic partner.',
        sentimentScore: 4,
        interviewDate: null,
        status: 'scheduled',
        alignmentLevel: 'strongly_aligned'
      },
      {
        name: 'Lead Engineering Manager',
        roleTitle: 'EM, Platform & Core Engine',
        category: 'direct_report',
        expectations: 'Defend engineering capacity for technical debt and improve on-call.',
        painPoints: 'Alert fatigue, complex deployments, and unowned legacy services.',
        politicalDynamics: 'Respected by team; retention priority.',
        sentimentScore: 4,
        interviewDate: null,
        status: 'scheduled',
        alignmentLevel: 'partially_aligned'
      },
      {
        name: 'Principal Systems Architect',
        roleTitle: 'Principal Staff Engineer',
        category: 'staff_principal',
        expectations: 'Clear architecture decision record (ADR) framework and autonomy.',
        painPoints: 'Monolithic data store bottlenecks and lack of distributed tracing.',
        politicalDynamics: 'High technical credibility among individual contributors.',
        sentimentScore: 4,
        interviewDate: null,
        status: 'scheduled',
        alignmentLevel: 'strongly_aligned'
      },
      {
        name: 'Director of Customer Operations',
        roleTitle: 'Director of Customer Success',
        category: 'customer_ops',
        expectations: 'Faster turnaround on tier-1 escalations and enterprise SLA protection.',
        painPoints: 'Slow engineering resolution for critical customer bug reports.',
        politicalDynamics: 'Advocate for customer renewal health.',
        sentimentScore: 3,
        interviewDate: null,
        status: 'identified',
        alignmentLevel: 'partially_aligned'
      }
    ];

    for (const s of defaultStakeholders) {
      await this.addStakeholder(userId, id, s);
    }

    const defaultMilestones: OnboardingMilestoneMutationDTO[] = [
      {
        phase: 'phase_1_listen_align',
        title: 'Conduct 360 Stakeholder Listening Tour',
        description: 'Complete 1-on-1 interviews with CEO, peer executives, EMs, and staff architects.',
        targetDay: 15,
        deliveredDay: 12,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 14,
        impactScore: 9,
        blockerReason: null
      },
      {
        phase: 'phase_1_listen_align',
        title: 'De-risk CI/CD Flaky Pipeline Stages',
        description: 'Implement retry isolation and Docker layer caching to reduce build duration.',
        targetDay: 20,
        deliveredDay: 18,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 7,
        impactScore: 8,
        blockerReason: null
      },
      {
        phase: 'phase_2_synthesize_wins',
        title: 'Publish 4-Dimension Organizational Diagnostic Memo',
        description: 'Synthesize architecture, velocity, team morale, and product alignment findings.',
        targetDay: 35,
        deliveredDay: null,
        status: 'in_progress',
        isQuickWin: false,
        deliveryEstimateDays: 10,
        impactScore: 9,
        blockerReason: null
      },
      {
        phase: 'phase_2_synthesize_wins',
        title: 'Deploy Automated Canary Release Pipeline',
        description: 'Automate canary percentage routing with automatic rollback on error budget spikes.',
        targetDay: 50,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 14,
        impactScore: 8,
        blockerReason: null
      },
      {
        phase: 'phase_3_transform_scale',
        title: 'Publish Staff-Plus Engineering Career Matrix',
        description: 'Establish explicit IC progression ladder from Senior to Principal Fellow.',
        targetDay: 75,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 20,
        impactScore: 9,
        blockerReason: null
      },
      {
        phase: 'phase_3_transform_scale',
        title: 'Present 1-Year Strategic Technology Charter to Board',
        description: 'Deliver transformation review and 12-month technology investment roadmap.',
        targetDay: 100,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 25,
        impactScore: 10,
        blockerReason: null
      }
    ];

    for (const m of defaultMilestones) {
      await this.addMilestone(userId, id, m);
    }

    const created = await this.getPlan(userId, id);
    if (!created) throw new Error('Failed to retrieve newly created executive onboarding plan');
    return created;
  }

  async updatePlan(
    userId: string,
    id: string,
    input: Partial<ExecutiveOnboardingPlanMutationDTO>
  ): Promise<ExecutiveOnboardingPlanDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const existing = await this.getPlan(userId, id);
    if (!existing) return null;

    const companyName = input.companyName ?? existing.companyName;
    const roleTitle = input.roleTitle ?? existing.roleTitle;
    const startDate = input.startDate ?? existing.startDate;
    const currentDay = input.currentDay ?? existing.currentDay;
    const executiveSponsorName = input.executiveSponsorName ?? existing.executiveSponsorName;
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE executive_onboarding_plans
       SET company_name = $1, role_title = $2, start_date = $3, current_day = $4,
           executive_sponsor_name = $5, updated_at = $6
       WHERE user_id = $7 AND id = $8`,
      [companyName, roleTitle, startDate, currentDay, executiveSponsorName, now, userId, id]
    );

    return this.getPlan(userId, id);
  }

  async deletePlan(userId: string, id: string): Promise<boolean> {
    await initExecutiveOnboardingTables(this.pool);
    const result = await this.pool.query(
      `DELETE FROM executive_onboarding_plans WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async addStakeholder(
    userId: string,
    planId: string,
    input: StakeholderMutationDTO
  ): Promise<StakeholderDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const planRes = await this.pool.query(
      `SELECT id FROM executive_onboarding_plans WHERE user_id = $1 AND id = $2`,
      [userId, planId]
    );
    if (planRes.rows.length === 0) return null;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO onboarding_stakeholders (
        id, user_id, plan_id, name, role_title, category, expectations,
        pain_points, political_dynamics, sentiment_score, interview_date,
        status, alignment_level, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        userId,
        planId,
        input.name,
        input.roleTitle,
        input.category,
        input.expectations || '',
        input.painPoints || '',
        input.politicalDynamics || '',
        input.sentimentScore,
        input.interviewDate || null,
        input.status,
        input.alignmentLevel,
        now,
        now
      ]
    );

    return {
      id,
      planId,
      name: input.name,
      roleTitle: input.roleTitle,
      category: input.category,
      expectations: input.expectations || '',
      painPoints: input.painPoints || '',
      politicalDynamics: input.politicalDynamics || '',
      sentimentScore: input.sentimentScore,
      interviewDate: input.interviewDate || null,
      status: input.status,
      alignmentLevel: input.alignmentLevel,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateStakeholder(
    userId: string,
    planId: string,
    stakeholderId: string,
    input: Partial<StakeholderMutationDTO>
  ): Promise<StakeholderDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const existing = await this.pool.query(
      `SELECT * FROM onboarding_stakeholders WHERE user_id = $1 AND plan_id = $2 AND id = $3`,
      [userId, planId, stakeholderId]
    );
    if (existing.rows.length === 0) return null;

    const row = existing.rows[0];
    const name = input.name ?? row.name;
    const roleTitle = input.roleTitle ?? row.role_title;
    const category = input.category ?? row.category;
    const expectations = input.expectations ?? row.expectations;
    const painPoints = input.painPoints ?? row.pain_points;
    const politicalDynamics = input.politicalDynamics ?? row.political_dynamics;
    const sentimentScore = input.sentimentScore ?? row.sentiment_score;
    const interviewDate = input.interviewDate !== undefined ? input.interviewDate : row.interview_date;
    const status = input.status ?? row.status;
    const alignmentLevel = input.alignmentLevel ?? row.alignment_level;
    const now = new Date().toISOString();

    const result = await this.pool.query(
      `UPDATE onboarding_stakeholders
       SET name = $1, role_title = $2, category = $3, expectations = $4,
           pain_points = $5, political_dynamics = $6, sentiment_score = $7,
           interview_date = $8, status = $9, alignment_level = $10, updated_at = $11
       WHERE user_id = $12 AND plan_id = $13 AND id = $14
       RETURNING *`,
      [
        name, roleTitle, category, expectations, painPoints, politicalDynamics,
        sentimentScore, interviewDate, status, alignmentLevel, now,
        userId, planId, stakeholderId
      ]
    );

    return this.mapStakeholderRow(result.rows[0]);
  }

  async deleteStakeholder(userId: string, planId: string, stakeholderId: string): Promise<boolean> {
    await initExecutiveOnboardingTables(this.pool);
    const result = await this.pool.query(
      `DELETE FROM onboarding_stakeholders WHERE user_id = $1 AND plan_id = $2 AND id = $3`,
      [userId, planId, stakeholderId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async addMilestone(
    userId: string,
    planId: string,
    input: OnboardingMilestoneMutationDTO
  ): Promise<OnboardingMilestoneDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const planRes = await this.pool.query(
      `SELECT id FROM executive_onboarding_plans WHERE user_id = $1 AND id = $2`,
      [userId, planId]
    );
    if (planRes.rows.length === 0) return null;

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO onboarding_milestones (
        id, user_id, plan_id, phase, title, description, target_day,
        delivered_day, status, is_quick_win, delivery_estimate_days,
        impact_score, blocker_reason, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        userId,
        planId,
        input.phase,
        input.title,
        input.description || '',
        input.targetDay,
        input.deliveredDay || null,
        input.status,
        input.isQuickWin,
        input.deliveryEstimateDays,
        input.impactScore,
        input.blockerReason || null,
        now,
        now
      ]
    );

    return {
      id,
      planId,
      phase: input.phase,
      title: input.title,
      description: input.description || '',
      targetDay: input.targetDay,
      deliveredDay: input.deliveredDay || null,
      status: input.status,
      isQuickWin: input.isQuickWin,
      deliveryEstimateDays: input.deliveryEstimateDays,
      impactScore: input.impactScore,
      blockerReason: input.blockerReason || null,
      createdAt: now,
      updatedAt: now
    };
  }

  async updateMilestone(
    userId: string,
    planId: string,
    milestoneId: string,
    input: Partial<OnboardingMilestoneMutationDTO>
  ): Promise<OnboardingMilestoneDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const existing = await this.pool.query(
      `SELECT * FROM onboarding_milestones WHERE user_id = $1 AND plan_id = $2 AND id = $3`,
      [userId, planId, milestoneId]
    );
    if (existing.rows.length === 0) return null;

    const row = existing.rows[0];
    const phase = input.phase ?? row.phase;
    const title = input.title ?? row.title;
    const description = input.description ?? row.description;
    const targetDay = input.targetDay ?? row.target_day;
    const deliveredDay = input.deliveredDay !== undefined ? input.deliveredDay : row.delivered_day;
    const status = input.status ?? row.status;
    const isQuickWin = input.isQuickWin !== undefined ? input.isQuickWin : row.is_quick_win;
    const deliveryEstimateDays = input.deliveryEstimateDays ?? row.delivery_estimate_days;
    const impactScore = input.impactScore ?? row.impact_score;
    const blockerReason = input.blockerReason !== undefined ? input.blockerReason : row.blocker_reason;
    const now = new Date().toISOString();

    const result = await this.pool.query(
      `UPDATE onboarding_milestones
       SET phase = $1, title = $2, description = $3, target_day = $4,
           delivered_day = $5, status = $6, is_quick_win = $7,
           delivery_estimate_days = $8, impact_score = $9, blocker_reason = $10,
           updated_at = $11
       WHERE user_id = $12 AND plan_id = $13 AND id = $14
       RETURNING *`,
      [
        phase, title, description, targetDay, deliveredDay, status, isQuickWin,
        deliveryEstimateDays, impactScore, blockerReason, now,
        userId, planId, milestoneId
      ]
    );

    return this.mapMilestoneRow(result.rows[0]);
  }

  async deleteMilestone(userId: string, planId: string, milestoneId: string): Promise<boolean> {
    await initExecutiveOnboardingTables(this.pool);
    const result = await this.pool.query(
      `DELETE FROM onboarding_milestones WHERE user_id = $1 AND plan_id = $2 AND id = $3`,
      [userId, planId, milestoneId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async updateDiagnostics(
    userId: string,
    planId: string,
    input: ExecutiveDiagnosticsMutationDTO
  ): Promise<ExecutiveOnboardingPlanDTO | null> {
    await initExecutiveOnboardingTables(this.pool);
    const planRes = await this.pool.query(
      `SELECT id FROM executive_onboarding_plans WHERE user_id = $1 AND id = $2`,
      [userId, planId]
    );
    if (planRes.rows.length === 0) return null;

    const evaluatedDiagnostics = computeDiagnosticHealthIndex(input);
    const now = new Date().toISOString();

    await this.pool.query(
      `UPDATE executive_onboarding_plans
       SET diagnostics = $1, updated_at = $2
       WHERE user_id = $3 AND id = $4`,
      [JSON.stringify(evaluatedDiagnostics), now, userId, planId]
    );

    return this.getPlan(userId, planId);
  }

  async getMemo(
    userId: string,
    planId: string,
    memoType: ExecutiveMemoType
  ): Promise<{ markdown: string; title: string } | null> {
    const plan = await this.getPlan(userId, planId);
    if (!plan) return null;

    const markdown = generateExecutiveMemoMarkdown(memoType, plan);
    let title = 'Executive Briefing';
    if (memoType === 'day_30_listening_tour') title = 'Day 30 Listening Tour Insights Memo';
    if (memoType === 'day_60_strategic_priorities') title = 'Day 60 Strategic Priorities Briefing';
    if (memoType === 'day_100_transformation_charter') title = 'Day 100 Transformation Review & Charter';

    return { markdown, title };
  }

  private async assemblePlan(userId: string, row: Record<string, unknown>): Promise<ExecutiveOnboardingPlanDTO> {
    const planId = String(row.id);

    const sResult = await this.pool.query(
      `SELECT * FROM onboarding_stakeholders WHERE user_id = $1 AND plan_id = $2 ORDER BY created_at ASC`,
      [userId, planId]
    );
    const stakeholders: StakeholderDTO[] = sResult.rows.map(this.mapStakeholderRow);

    const mResult = await this.pool.query(
      `SELECT * FROM onboarding_milestones WHERE user_id = $1 AND plan_id = $2 ORDER BY target_day ASC`,
      [userId, planId]
    );
    const milestones: OnboardingMilestoneDTO[] = mResult.rows.map(this.mapMilestoneRow);

    const diagnostics: ExecutiveDiagnosticsDTO = typeof row.diagnostics === 'object' && row.diagnostics !== null && 'diagnosticHealthIndex' in row.diagnostics
      ? (row.diagnostics as ExecutiveDiagnosticsDTO)
      : createDefaultExecutiveDiagnostics();

    const currentDay = Number(row.current_day) || 1;
    const momentum = computeTransitionMomentum(stakeholders, diagnostics, milestones, currentDay);

    return {
      id: planId,
      userId: String(row.user_id),
      applicationId: row.application_id ? String(row.application_id) : null,
      companyName: String(row.company_name),
      roleTitle: String(row.role_title),
      startDate: row.start_date instanceof Date ? row.start_date.toISOString().split('T')[0] : String(row.start_date || ''),
      currentDay,
      executiveSponsorName: String(row.executive_sponsor_name || ''),
      stakeholders,
      diagnostics,
      milestones,
      momentum,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
    };
  }

  private mapStakeholderRow(row: Record<string, unknown>): StakeholderDTO {
    return {
      id: String(row.id),
      planId: String(row.plan_id),
      name: String(row.name),
      roleTitle: String(row.role_title),
      category: row.category as StakeholderDTO['category'],
      expectations: String(row.expectations || ''),
      painPoints: String(row.pain_points || ''),
      politicalDynamics: String(row.political_dynamics || ''),
      sentimentScore: Number(row.sentiment_score) || 3,
      interviewDate: row.interview_date instanceof Date ? row.interview_date.toISOString().split('T')[0] : (row.interview_date ? String(row.interview_date) : null),
      status: row.status as StakeholderDTO['status'],
      alignmentLevel: row.alignment_level as StakeholderDTO['alignmentLevel'],
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
    };
  }

  private mapMilestoneRow(row: Record<string, unknown>): OnboardingMilestoneDTO {
    return {
      id: String(row.id),
      planId: String(row.plan_id),
      phase: row.phase as OnboardingMilestoneDTO['phase'],
      title: String(row.title),
      description: String(row.description || ''),
      targetDay: Number(row.target_day) || 30,
      deliveredDay: row.delivered_day !== null && row.delivered_day !== undefined ? Number(row.delivered_day) : null,
      status: row.status as OnboardingMilestoneDTO['status'],
      isQuickWin: Boolean(row.is_quick_win),
      deliveryEstimateDays: Number(row.delivery_estimate_days) || 7,
      impactScore: Number(row.impact_score) || 5,
      blockerReason: row.blocker_reason ? String(row.blocker_reason) : null,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at || ''),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at || '')
    };
  }
}
