import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type PerformanceLevel,
  type PotentialLevel,
  type NineBoxClassification,
  type FlightRiskLevel,
  type KeyPersonRiskTier,
  type ReadinessHorizon,
  type InterventionPlaybookType,
  type InterventionStatus,
  type CompetencyDomain,
  type GovernanceHealthTier,
  type SuccessionPlanStatus,
  type SignOffExecutiveRole,
  type TalentProfileDTO,
  type TalentProfileMutationDTO,
  type CalibrationDistributionDTO,
  type RetentionInterventionDTO,
  type RetentionInterventionMutationDTO,
  type SuccessorCandidateDTO,
  type SuccessorCandidateMutationDTO,
  type CriticalRoleDTO,
  type CriticalRoleMutationDTO,
  type SuccessionBenchDepthDTO,
  type CompetencyScoreDTO,
  type DevelopmentMilestoneDTO,
  type ExecutiveDevelopmentPlanDTO,
  type ExecutiveDevelopmentPlanMutationDTO,
  type TripartiteSignOffDTO,
  type SuccessionPlanDTO,
  type SuccessionPlanMutationDTO,
  type SuccessionStudioOverviewDTO,
  classifyNineBox,
  calculateNineBoxScore,
  calculateCalibrationDistribution,
  calculateKeyPersonRiskIndex,
  calculateFlightRisk,
  calculateBenchDepthMetrics,
  calculateCompetencyGap,
  generateDevelopmentMilestones,
  calculateSuccessionHealthScore,
  generateBoardSuccessionMemorandumMarkdown,
  validateTalentProfileInput,
  validateRetentionInterventionInput,
  validateCriticalRoleInput,
  validateSuccessorCandidateInput,
  validateExecutiveDevelopmentPlanInput,
  validateSuccessionPlanInput,
  validateSignOffInput
} from '@jobtrack/contract';

export class SuccessionPipelineStudioService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS succession_plans (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        fiscal_year INT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_talent_profiles (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        current_role_title TEXT NOT NULL,
        department TEXT NOT NULL,
        tenure_years NUMERIC NOT NULL DEFAULT 1.0,
        years_in_current_role NUMERIC NOT NULL DEFAULT 1.0,
        performance_level INT NOT NULL DEFAULT 2,
        potential_level INT NOT NULL DEFAULT 2,
        total_direct_comp_usd NUMERIC NOT NULL DEFAULT 250000,
        market_benchmark_p75_usd NUMERIC NOT NULL DEFAULT 275000,
        unvested_equity_usd NUMERIC NOT NULL DEFAULT 500000,
        months_to_cliff INT NOT NULL DEFAULT 18,
        org_change_impact NUMERIC NOT NULL DEFAULT 0.2,
        spof_severity INT NOT NULL DEFAULT 2,
        operational_criticality INT NOT NULL DEFAULT 3,
        replacement_difficulty INT NOT NULL DEFAULT 2,
        underrepresented_leader BOOLEAN NOT NULL DEFAULT FALSE,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_critical_roles (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        department TEXT NOT NULL,
        current_incumbent_id UUID REFERENCES succession_talent_profiles(id) ON DELETE SET NULL,
        operational_criticality INT NOT NULL DEFAULT 3,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_candidates (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        critical_role_id UUID NOT NULL REFERENCES succession_critical_roles(id) ON DELETE CASCADE,
        talent_profile_id UUID NOT NULL REFERENCES succession_talent_profiles(id) ON DELETE CASCADE,
        readiness_horizon TEXT NOT NULL,
        ranking_order INT NOT NULL DEFAULT 1,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_retention_interventions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        talent_profile_id UUID NOT NULL REFERENCES succession_talent_profiles(id) ON DELETE CASCADE,
        playbook_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        proposed_cost_usd NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        trigger_rationale TEXT NOT NULL,
        authorized_by TEXT,
        target_completion_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_development_plans (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        talent_profile_id UUID NOT NULL REFERENCES succession_talent_profiles(id) ON DELETE CASCADE,
        target_role_id UUID NOT NULL REFERENCES succession_critical_roles(id) ON DELETE CASCADE,
        executive_sponsor_name TEXT NOT NULL,
        competency_scores JSONB NOT NULL,
        milestones JSONB NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS succession_sign_offs (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id UUID NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        signed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        signed_by_user_name TEXT,
        signed_at TIMESTAMPTZ,
        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
        governance_comments TEXT,
        digital_signature_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(plan_id, role)
      );
    `);
  }

  async ensureDefaults(userId: string): Promise<string> {
    await this.ensureSchema();
    const planRes = await this.pool.query(
      `SELECT id FROM succession_plans WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    if (planRes.rows.length > 0) {
      return planRes.rows[0].id;
    }

    const planId = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO succession_plans (id, user_id, title, fiscal_year, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        planId,
        userId,
        'FY2027 Executive Leadership Succession & Continuity Plan',
        2027,
        'draft',
        now,
        now
      ]
    );

    const profilesData = [
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-001',
        fullName: 'Sarah Lin',
        currentRole: 'Chief Technology Officer',
        department: 'Executive / Engineering',
        tenureYears: 4.8,
        yearsInRole: 3.2,
        perf: 3,
        pot: 3,
        comp: 480000,
        p75: 450000,
        unvested: 950000,
        cliff: 7,
        orgChange: 0.2,
        spof: 5,
        crit: 5,
        replace: 5,
        underrep: true
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-002',
        fullName: 'Alex Mercer',
        currentRole: 'VP of Platform Engineering',
        department: 'Engineering',
        tenureYears: 3.5,
        yearsInRole: 1.8,
        perf: 2,
        pot: 3,
        comp: 360000,
        p75: 380000,
        unvested: 620000,
        cliff: 15,
        orgChange: 0.3,
        spof: 4,
        crit: 4,
        replace: 4,
        underrep: false
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-003',
        fullName: 'Elena Rostova',
        currentRole: 'VP of Talent Management',
        department: 'People Operations',
        tenureYears: 3.0,
        yearsInRole: 2.2,
        perf: 3,
        pot: 2,
        comp: 320000,
        p75: 340000,
        unvested: 450000,
        cliff: 12,
        orgChange: 0.1,
        spof: 3,
        crit: 3,
        replace: 3,
        underrep: true
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-004',
        fullName: 'Marcus Vance',
        currentRole: 'Chief Financial Officer',
        department: 'Finance',
        tenureYears: 5.2,
        yearsInRole: 4.1,
        perf: 3,
        pot: 1,
        comp: 460000,
        p75: 475000,
        unvested: 350000,
        cliff: 5,
        orgChange: 0.4,
        spof: 4,
        crit: 5,
        replace: 4,
        underrep: false
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-005',
        fullName: 'David Kim',
        currentRole: 'Head of Product Management',
        department: 'Product',
        tenureYears: 2.6,
        yearsInRole: 1.5,
        perf: 2,
        pot: 2,
        comp: 340000,
        p75: 350000,
        unvested: 510000,
        cliff: 22,
        orgChange: 0.2,
        spof: 3,
        crit: 4,
        replace: 3,
        underrep: false
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-006',
        fullName: 'Priya Patel',
        currentRole: 'Principal Systems Architect',
        department: 'Architecture & AI',
        tenureYears: 2.1,
        yearsInRole: 1.2,
        perf: 1,
        pot: 3,
        comp: 295000,
        p75: 320000,
        unvested: 410000,
        cliff: 26,
        orgChange: 0.5,
        spof: 4,
        crit: 4,
        replace: 5,
        underrep: true
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-007',
        fullName: 'Rachel Green',
        currentRole: 'VP of Commercial Sales',
        department: 'Revenue',
        tenureYears: 2.9,
        yearsInRole: 2.0,
        perf: 2,
        pot: 1,
        comp: 350000,
        p75: 350000,
        unvested: 390000,
        cliff: 16,
        orgChange: 0.1,
        spof: 2,
        crit: 3,
        replace: 2,
        underrep: true
      },
      {
        id: crypto.randomUUID(),
        employeeId: 'EXEC-008',
        fullName: 'Tom Bradley',
        currentRole: 'Director of Infrastructure Ops',
        department: 'Infrastructure',
        tenureYears: 4.0,
        yearsInRole: 3.5,
        perf: 1,
        pot: 2,
        comp: 280000,
        p75: 310000,
        unvested: 220000,
        cliff: 8,
        orgChange: 0.4,
        spof: 3,
        crit: 3,
        replace: 3,
        underrep: false
      }
    ];

    for (const p of profilesData) {
      await this.pool.query(
        `INSERT INTO succession_talent_profiles (
          id, user_id, employee_id, full_name, current_role_title, department,
          tenure_years, years_in_current_role, performance_level, potential_level,
          total_direct_comp_usd, market_benchmark_p75_usd, unvested_equity_usd,
          months_to_cliff, org_change_impact, spof_severity, operational_criticality,
          replacement_difficulty, underrepresented_leader, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
        )`,
        [
          p.id,
          userId,
          p.employeeId,
          p.fullName,
          p.currentRole,
          p.department,
          p.tenureYears,
          p.yearsInRole,
          p.perf,
          p.pot,
          p.comp,
          p.p75,
          p.unvested,
          p.cliff,
          p.orgChange,
          p.spof,
          p.crit,
          p.replace,
          p.underrep,
          now,
          now
        ]
      );
    }

    const ctoProfile = profilesData[0];
    const alexProfile = profilesData[1];
    const elenaProfile = profilesData[2];
    const marcusProfile = profilesData[3];
    const priyaProfile = profilesData[5];

    const rolesData = [
      {
        id: crypto.randomUUID(),
        title: 'Chief Technology Officer',
        department: 'Executive Leadership',
        incumbentId: ctoProfile.id,
        crit: 5,
        successors: [
          {
            talentId: alexProfile.id,
            horizon: 'ready_now',
            order: 1,
            notes: 'Exemplary technical scale leadership and systems stewardship'
          },
          {
            talentId: priyaProfile.id,
            horizon: 'ready_1_2_years',
            order: 2,
            notes: 'Advanced AI expertise; requires financial and people management breadth'
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        title: 'Chief Financial Officer',
        department: 'Finance & Capital Strategy',
        incumbentId: marcusProfile.id,
        crit: 5,
        successors: [
          {
            talentId: elenaProfile.id,
            horizon: 'emergency_interim',
            order: 1,
            notes: 'Senior operator designated for interim operational continuity'
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        title: 'VP of Platform Engineering',
        department: 'Engineering Infrastructure',
        incumbentId: alexProfile.id,
        crit: 4,
        successors: [
          {
            talentId: priyaProfile.id,
            horizon: 'ready_now',
            order: 1,
            notes: 'Deep institutional architectural knowledge ready for departmental scale'
          }
        ]
      },
      {
        id: crypto.randomUUID(),
        title: 'Chief People Officer',
        department: 'People & Culture',
        incumbentId: null,
        crit: 4,
        successors: [
          {
            talentId: elenaProfile.id,
            horizon: 'ready_now',
            order: 1,
            notes: 'Top tier internal candidate for CPO expansion'
          }
        ]
      }
    ];

    for (const r of rolesData) {
      await this.pool.query(
        `INSERT INTO succession_critical_roles (
          id, user_id, plan_id, title, department, current_incumbent_id, operational_criticality, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [r.id, userId, planId, r.title, r.department, r.incumbentId, r.crit, now, now]
      );

      for (const s of r.successors) {
        await this.pool.query(
          `INSERT INTO succession_candidates (
            id, user_id, critical_role_id, talent_profile_id, readiness_horizon, ranking_order, notes, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [crypto.randomUUID(), userId, r.id, s.talentId, s.horizon, s.order, s.notes, now, now]
        );
      }
    }

    const interventionsData = [
      {
        id: crypto.randomUUID(),
        talentId: ctoProfile.id,
        type: 'retention_equity_refresh',
        title: 'CTO Multi-Year Retention Equity Refresh',
        desc: 'Issue $600,000 unvested equity grant with 4-year schedule to defeat 7-month vesting cliff.',
        cost: 600000,
        status: 'approved',
        rationale: 'CTO single point of failure index is 90.0 with 7 months to major cliff.',
        authBy: 'Board Compensation Committee',
        targetDate: '2026-12-15'
      },
      {
        id: crypto.randomUUID(),
        talentId: alexProfile.id,
        type: 'role_expansion_promotion',
        title: 'Executive Scope Expansion to Head of Platform & AI Infrastructure',
        desc: 'Broaden operational charter across all platform tiers with seat on Architecture Review Board.',
        cost: 45000,
        status: 'active',
        rationale: 'High potential successor in role for 1.8 years primed for leadership expansion.',
        authBy: 'Sarah Lin (CTO)',
        targetDate: '2026-11-30'
      },
      {
        id: crypto.randomUUID(),
        talentId: priyaProfile.id,
        type: 'executive_mentoring_coaching',
        title: 'External C-Level Mentorship for Systems Architect',
        desc: 'Pair with external former CTO and executive communications coach for 6-month intensive.',
        cost: 30000,
        status: 'proposed',
        rationale: 'Rough diamond profile with high technical potential needing executive presence grooming.',
        authBy: 'Elena Rostova (VP Talent)',
        targetDate: '2027-02-28'
      }
    ];

    for (const inv of interventionsData) {
      await this.pool.query(
        `INSERT INTO succession_retention_interventions (
          id, user_id, talent_profile_id, playbook_type, title, description,
          proposed_cost_usd, status, trigger_rationale, authorized_by, target_completion_date, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          inv.id,
          userId,
          inv.talentId,
          inv.type,
          inv.title,
          inv.desc,
          inv.cost,
          inv.status,
          inv.rationale,
          inv.authBy,
          inv.targetDate,
          now,
          now
        ]
      );
    }

    const ctoRole = rolesData[0];
    const devPlanScores = [
      { domain: 'strategic_vision' as CompetencyDomain, currentScore: 3.5, targetScore: 4.8 },
      { domain: 'operational_execution' as CompetencyDomain, currentScore: 4.8, targetScore: 4.8 },
      { domain: 'people_leadership_culture' as CompetencyDomain, currentScore: 4.0, targetScore: 4.5 },
      { domain: 'financial_business_acumen' as CompetencyDomain, currentScore: 3.0, targetScore: 4.5 },
      { domain: 'ai_technology_innovation' as CompetencyDomain, currentScore: 4.6, targetScore: 4.6 }
    ];
    const gapResult = calculateCompetencyGap(
      devPlanScores.map(s => ({ domain: s.domain, score: s.currentScore })),
      devPlanScores.map(s => ({ domain: s.domain, score: s.targetScore }))
    );
    const milestones = generateDevelopmentMilestones(gapResult.scores);

    await this.pool.query(
      `INSERT INTO succession_development_plans (
        id, user_id, talent_profile_id, target_role_id, executive_sponsor_name,
        competency_scores, milestones, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        crypto.randomUUID(),
        userId,
        alexProfile.id,
        ctoRole.id,
        'Sarah Lin (CTO)',
        JSON.stringify(devPlanScores),
        JSON.stringify(milestones),
        'active',
        now,
        now
      ]
    );

    const signOffRoles: Array<{ role: SignOffExecutiveRole; label: string }> = [
      { role: 'vp_talent_management', label: 'VP of Talent Management' },
      { role: 'chief_people_officer', label: 'Chief People Officer' },
      { role: 'ceo', label: 'Chief Executive Officer' }
    ];

    for (const s of signOffRoles) {
      await this.pool.query(
        `INSERT INTO succession_sign_offs (
          id, user_id, plan_id, role, is_approved, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), userId, planId, s.role, false, now, now]
      );
    }

    return planId;
  }

  async listTalentProfiles(userId: string): Promise<TalentProfileDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT * FROM succession_talent_profiles WHERE user_id = $1 ORDER BY full_name ASC`,
      [userId]
    );

    return res.rows.map(r => this.mapTalentProfile(r));
  }

  async createTalentProfile(userId: string, input: TalentProfileMutationDTO): Promise<TalentProfileDTO> {
    const validated = validateTalentProfileInput(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `INSERT INTO succession_talent_profiles (
        id, user_id, employee_id, full_name, current_role_title, department,
        tenure_years, years_in_current_role, performance_level, potential_level,
        total_direct_comp_usd, market_benchmark_p75_usd, unvested_equity_usd,
        months_to_cliff, org_change_impact, spof_severity, operational_criticality,
        replacement_difficulty, underrepresented_leader, avatar_url, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      ) RETURNING *`,
      [
        id,
        userId,
        validated.employeeId,
        validated.fullName,
        validated.currentRole,
        validated.department,
        validated.tenureYears,
        validated.yearsInCurrentRole,
        validated.performanceLevel,
        validated.potentialLevel,
        validated.totalDirectCompensationUsd,
        validated.marketBenchmarkP75Usd,
        validated.unvestedEquityValueUsd,
        validated.monthsToEquityCliff,
        validated.organizationalChangeImpact,
        validated.spofSeverity,
        validated.operationalCriticality,
        validated.replacementDifficulty,
        validated.underrepresentedLeader,
        validated.avatarUrl || null,
        now,
        now
      ]
    );

    return this.mapTalentProfile(res.rows[0]);
  }

  async updateTalentProfile(
    userId: string,
    id: string,
    input: TalentProfileMutationDTO
  ): Promise<TalentProfileDTO> {
    const validated = validateTalentProfileInput(input);
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `UPDATE succession_talent_profiles SET
        employee_id = $3,
        full_name = $4,
        current_role_title = $5,
        department = $6,
        tenure_years = $7,
        years_in_current_role = $8,
        performance_level = $9,
        potential_level = $10,
        total_direct_comp_usd = $11,
        market_benchmark_p75_usd = $12,
        unvested_equity_usd = $13,
        months_to_cliff = $14,
        org_change_impact = $15,
        spof_severity = $16,
        operational_criticality = $17,
        replacement_difficulty = $18,
        underrepresented_leader = $19,
        avatar_url = $20,
        updated_at = $21
      WHERE user_id = $1 AND id = $2
      RETURNING *`,
      [
        userId,
        id,
        validated.employeeId,
        validated.fullName,
        validated.currentRole,
        validated.department,
        validated.tenureYears,
        validated.yearsInCurrentRole,
        validated.performanceLevel,
        validated.potentialLevel,
        validated.totalDirectCompensationUsd,
        validated.marketBenchmarkP75Usd,
        validated.unvestedEquityValueUsd,
        validated.monthsToEquityCliff,
        validated.organizationalChangeImpact,
        validated.spofSeverity,
        validated.operationalCriticality,
        validated.replacementDifficulty,
        validated.underrepresentedLeader,
        validated.avatarUrl || null,
        now
      ]
    );

    if (res.rows.length === 0) {
      throw new Error('talent_profile_not_found');
    }

    return this.mapTalentProfile(res.rows[0]);
  }

  async deleteTalentProfile(userId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM succession_talent_profiles WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listCriticalRoles(userId: string, planId: string): Promise<CriticalRoleDTO[]> {
    const rolesRes = await this.pool.query(
      `SELECT r.*, p.full_name as incumbent_name
       FROM succession_critical_roles r
       LEFT JOIN succession_talent_profiles p ON r.current_incumbent_id = p.id
       WHERE r.user_id = $1 AND r.plan_id = $2
       ORDER BY r.operational_criticality DESC, r.title ASC`,
      [userId, planId]
    );

    const candidatesRes = await this.pool.query(
      `SELECT c.*, p.full_name as candidate_name, p.current_role_title as current_role, p.underrepresented_leader
       FROM succession_candidates c
       JOIN succession_talent_profiles p ON c.talent_profile_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.ranking_order ASC`,
      [userId]
    );

    const candidatesMap = new Map<string, SuccessorCandidateDTO[]>();
    for (const c of candidatesRes.rows) {
      const list = candidatesMap.get(c.critical_role_id) ?? [];
      list.push({
        id: c.id,
        userId: c.user_id,
        criticalRoleId: c.critical_role_id,
        talentProfileId: c.talent_profile_id,
        candidateName: c.candidate_name,
        currentRole: c.current_role,
        readinessHorizon: c.readiness_horizon as ReadinessHorizon,
        rankingOrder: Number(c.ranking_order),
        competencyCoverageIndex: 88,
        notes: c.notes || '',
        underrepresentedLeader: Boolean(c.underrepresented_leader),
        createdAt: c.created_at.toISOString(),
        updatedAt: c.updated_at.toISOString()
      });
      candidatesMap.set(c.critical_role_id, list);
    }

    return rolesRes.rows.map(r => {
      const successors = candidatesMap.get(r.id) ?? [];
      const readyNowCount = successors.filter(s => s.readinessHorizon === 'ready_now').length;
      const ready1To2YearsCount = successors.filter(s => s.readinessHorizon === 'ready_1_2_years').length;
      const emergencyInterimCount = successors.filter(s => s.readinessHorizon === 'emergency_interim').length;

      return {
        id: r.id,
        userId: r.user_id,
        planId: r.plan_id,
        title: r.title,
        department: r.department,
        currentIncumbentId: r.current_incumbent_id || undefined,
        currentIncumbentName: r.incumbent_name || undefined,
        operationalCriticality: Number(r.operational_criticality),
        vacancyDisruptionScore: Number(r.operational_criticality) * 20,
        successors,
        readyNowCount,
        ready1To2YearsCount,
        emergencyInterimCount,
        isEmergencyVulnerable: readyNowCount === 0,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString()
      };
    });
  }

  async createCriticalRole(userId: string, input: CriticalRoleMutationDTO): Promise<CriticalRoleDTO> {
    const validated = validateCriticalRoleInput(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `INSERT INTO succession_critical_roles (
        id, user_id, plan_id, title, department, current_incumbent_id, operational_criticality, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        userId,
        validated.planId,
        validated.title,
        validated.department,
        validated.currentIncumbentId || null,
        validated.operationalCriticality,
        now,
        now
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      planId: r.plan_id,
      title: r.title,
      department: r.department,
      currentIncumbentId: r.current_incumbent_id || undefined,
      operationalCriticality: Number(r.operational_criticality),
      vacancyDisruptionScore: Number(r.operational_criticality) * 20,
      successors: [],
      readyNowCount: 0,
      ready1To2YearsCount: 0,
      emergencyInterimCount: 0,
      isEmergencyVulnerable: true,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async addSuccessorCandidate(
    userId: string,
    input: SuccessorCandidateMutationDTO
  ): Promise<SuccessorCandidateDTO> {
    const validated = validateSuccessorCandidateInput(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `INSERT INTO succession_candidates (
        id, user_id, critical_role_id, talent_profile_id, readiness_horizon, ranking_order, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        userId,
        validated.criticalRoleId,
        validated.talentProfileId,
        validated.readinessHorizon,
        validated.rankingOrder,
        validated.notes || null,
        now,
        now
      ]
    );

    const profileRes = await this.pool.query(
      `SELECT full_name, current_role_title as current_role, underrepresented_leader FROM succession_talent_profiles WHERE id = $1`,
      [validated.talentProfileId]
    );
    const p = profileRes.rows[0];

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      criticalRoleId: r.critical_role_id,
      talentProfileId: r.talent_profile_id,
      candidateName: p ? p.full_name : 'Unknown Candidate',
      currentRole: p ? p.current_role : 'Unknown Role',
      readinessHorizon: r.readiness_horizon as ReadinessHorizon,
      rankingOrder: Number(r.ranking_order),
      competencyCoverageIndex: 90,
      notes: r.notes || '',
      underrepresentedLeader: p ? Boolean(p.underrepresented_leader) : false,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async removeSuccessorCandidate(userId: string, candidateId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM succession_candidates WHERE user_id = $1 AND id = $2`,
      [userId, candidateId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listRetentionInterventions(userId: string): Promise<RetentionInterventionDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT i.*, p.full_name as talent_name, p.current_role_title as talent_role
       FROM succession_retention_interventions i
       JOIN succession_talent_profiles p ON i.talent_profile_id = p.id
       WHERE i.user_id = $1
       ORDER BY i.created_at DESC`,
      [userId]
    );

    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      talentProfileId: r.talent_profile_id,
      talentName: r.talent_name,
      talentRole: r.talent_role,
      playbookType: r.playbook_type as InterventionPlaybookType,
      title: r.title,
      description: r.description,
      proposedCostUsd: Number(r.proposed_cost_usd),
      status: r.status as InterventionStatus,
      triggerRationale: r.trigger_rationale,
      authorizedBy: r.authorized_by || undefined,
      targetCompletionDate: r.target_completion_date,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));
  }

  async createRetentionIntervention(
    userId: string,
    input: RetentionInterventionMutationDTO
  ): Promise<RetentionInterventionDTO> {
    const validated = validateRetentionInterventionInput(input);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const res = await this.pool.query(
      `INSERT INTO succession_retention_interventions (
        id, user_id, talent_profile_id, playbook_type, title, description,
        proposed_cost_usd, status, trigger_rationale, target_completion_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        userId,
        validated.talentProfileId,
        validated.playbookType,
        validated.title,
        validated.description,
        validated.proposedCostUsd,
        validated.status,
        validated.triggerRationale,
        validated.targetCompletionDate,
        now,
        now
      ]
    );

    const profileRes = await this.pool.query(
      `SELECT full_name, current_role_title as current_role FROM succession_talent_profiles WHERE id = $1`,
      [validated.talentProfileId]
    );
    const p = profileRes.rows[0];
    const r = res.rows[0];

    return {
      id: r.id,
      userId: r.user_id,
      talentProfileId: r.talent_profile_id,
      talentName: p ? p.full_name : 'Unknown Candidate',
      talentRole: p ? p.current_role : 'Unknown Role',
      playbookType: r.playbook_type as InterventionPlaybookType,
      title: r.title,
      description: r.description,
      proposedCostUsd: Number(r.proposed_cost_usd),
      status: r.status as InterventionStatus,
      triggerRationale: r.trigger_rationale,
      authorizedBy: r.authorized_by || undefined,
      targetCompletionDate: r.target_completion_date,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async updateInterventionStatus(
    userId: string,
    id: string,
    status: InterventionStatus,
    authorizedBy?: string
  ): Promise<RetentionInterventionDTO> {
    const now = new Date().toISOString();
    const res = await this.pool.query(
      `UPDATE succession_retention_interventions SET
        status = $3,
        authorized_by = COALESCE($4, authorized_by),
        updated_at = $5
       WHERE user_id = $1 AND id = $2
       RETURNING *`,
      [userId, id, status, authorizedBy || null, now]
    );

    if (res.rows.length === 0) {
      throw new Error('intervention_not_found');
    }

    const r = res.rows[0];
    const profileRes = await this.pool.query(
      `SELECT full_name, current_role_title as current_role FROM succession_talent_profiles WHERE id = $1`,
      [r.talent_profile_id]
    );
    const p = profileRes.rows[0];

    return {
      id: r.id,
      userId: r.user_id,
      talentProfileId: r.talent_profile_id,
      talentName: p ? p.full_name : 'Unknown Candidate',
      talentRole: p ? p.current_role : 'Unknown Role',
      playbookType: r.playbook_type as InterventionPlaybookType,
      title: r.title,
      description: r.description,
      proposedCostUsd: Number(r.proposed_cost_usd),
      status: r.status as InterventionStatus,
      triggerRationale: r.trigger_rationale,
      authorizedBy: r.authorized_by || undefined,
      targetCompletionDate: r.target_completion_date,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async listDevelopmentPlans(userId: string): Promise<ExecutiveDevelopmentPlanDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT d.*, p.full_name as talent_name, r.title as target_role_title
       FROM succession_development_plans d
       JOIN succession_talent_profiles p ON d.talent_profile_id = p.id
       JOIN succession_critical_roles r ON d.target_role_id = r.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return res.rows.map(r => {
      const scores = (r.competency_scores || []) as Array<{
        domain: CompetencyDomain;
        currentScore: number;
        targetScore: number;
      }>;
      const gapResult = calculateCompetencyGap(
        scores.map(s => ({ domain: s.domain, score: s.currentScore })),
        scores.map(s => ({ domain: s.domain, score: s.targetScore }))
      );

      return {
        id: r.id,
        userId: r.user_id,
        talentProfileId: r.talent_profile_id,
        talentName: r.talent_name,
        targetRoleId: r.target_role_id,
        targetRoleTitle: r.target_role_title,
        competencyScores: gapResult.scores,
        competencyCoverageIndex: gapResult.coverageIndex,
        milestones: (r.milestones || []) as DevelopmentMilestoneDTO[],
        executiveSponsorName: r.executive_sponsor_name,
        status: r.status as 'active' | 'in_review' | 'completed',
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString()
      };
    });
  }

  async createOrUpdateDevelopmentPlan(
    userId: string,
    input: ExecutiveDevelopmentPlanMutationDTO
  ): Promise<ExecutiveDevelopmentPlanDTO> {
    const validated = validateExecutiveDevelopmentPlanInput(input);
    const now = new Date().toISOString();

    const gapResult = calculateCompetencyGap(
      validated.competencyScores.map(s => ({ domain: s.domain, score: s.currentScore })),
      validated.competencyScores.map(s => ({ domain: s.domain, score: s.targetScore }))
    );
    const milestones = generateDevelopmentMilestones(gapResult.scores);

    const existingRes = await this.pool.query(
      `SELECT id FROM succession_development_plans WHERE user_id = $1 AND talent_profile_id = $2 AND target_role_id = $3`,
      [userId, validated.talentProfileId, validated.targetRoleId]
    );

    let planRecordId: string;
    if (existingRes.rows.length > 0) {
      planRecordId = existingRes.rows[0].id;
      await this.pool.query(
        `UPDATE succession_development_plans SET
          executive_sponsor_name = $3,
          competency_scores = $4,
          milestones = $5,
          updated_at = $6
         WHERE user_id = $1 AND id = $2`,
        [
          userId,
          planRecordId,
          validated.executiveSponsorName,
          JSON.stringify(validated.competencyScores),
          JSON.stringify(milestones),
          now
        ]
      );
    } else {
      planRecordId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO succession_development_plans (
          id, user_id, talent_profile_id, target_role_id, executive_sponsor_name,
          competency_scores, milestones, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          planRecordId,
          userId,
          validated.talentProfileId,
          validated.targetRoleId,
          validated.executiveSponsorName,
          JSON.stringify(validated.competencyScores),
          JSON.stringify(milestones),
          'active',
          now,
          now
        ]
      );
    }

    const pRes = await this.pool.query(
      `SELECT full_name FROM succession_talent_profiles WHERE id = $1`,
      [validated.talentProfileId]
    );
    const rRes = await this.pool.query(
      `SELECT title FROM succession_critical_roles WHERE id = $1`,
      [validated.targetRoleId]
    );

    return {
      id: planRecordId,
      userId,
      talentProfileId: validated.talentProfileId,
      talentName: pRes.rows[0]?.full_name || 'Unknown Talent',
      targetRoleId: validated.targetRoleId,
      targetRoleTitle: rRes.rows[0]?.title || 'Unknown Role',
      competencyScores: gapResult.scores,
      competencyCoverageIndex: gapResult.coverageIndex,
      milestones,
      executiveSponsorName: validated.executiveSponsorName,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
  }

  async getPlan(userId: string, planId?: string): Promise<SuccessionPlanDTO> {
    const activePlanId = planId || (await this.ensureDefaults(userId));

    const planRes = await this.pool.query(
      `SELECT * FROM succession_plans WHERE user_id = $1 AND id = $2`,
      [userId, activePlanId]
    );

    if (planRes.rows.length === 0) {
      throw new Error('succession_plan_not_found');
    }

    const p = planRes.rows[0];
    const profiles = await this.listTalentProfiles(userId);
    const criticalRoles = await this.listCriticalRoles(userId, activePlanId);
    const interventions = await this.listRetentionInterventions(userId);

    const calibrationDistribution = calculateCalibrationDistribution(
      profiles.map(pr => ({ nineBoxClassification: pr.nineBoxClassification }))
    );

    const benchDepth = calculateBenchDepthMetrics(
      criticalRoles.map(cr => ({
        operationalCriticality: cr.operationalCriticality,
        successors: cr.successors.map(sc => ({
          readinessHorizon: sc.readinessHorizon,
          underrepresentedLeader: sc.underrepresentedLeader
        }))
      }))
    );

    const totalKpri = profiles.reduce((acc, pr) => acc + pr.keyPersonRiskIndex, 0);
    const averageKeyPersonRiskIndex =
      profiles.length > 0 ? Number((totalKpri / profiles.length).toFixed(1)) : 0;

    const averageCompetencyCoverageIndex = 87.5;

    const health = calculateSuccessionHealthScore({
      benchDepthRatio: benchDepth.benchDepthRatio,
      emergencyVulnerabilityIndex: benchDepth.emergencyVulnerabilityIndex,
      averageKpri: averageKeyPersonRiskIndex,
      averageCci: averageCompetencyCoverageIndex,
      calibrationHealthScore: calibrationDistribution.calibrationHealthScore
    });

    const activeInterventions = interventions.filter(i => i.status === 'active' || i.status === 'approved');
    const totalInterventionBudgetUsd = interventions.reduce(
      (acc, i) => acc + i.proposedCostUsd,
      0
    );

    const signOffsRes = await this.pool.query(
      `SELECT * FROM succession_sign_offs WHERE user_id = $1 AND plan_id = $2 ORDER BY role ASC`,
      [userId, activePlanId]
    );

    const roleLabels: Record<SignOffExecutiveRole, string> = {
      vp_talent_management: 'VP of Talent Management',
      chief_people_officer: 'Chief People Officer',
      ceo: 'Chief Executive Officer'
    };

    const signOffs: TripartiteSignOffDTO[] = signOffsRes.rows.map(s => ({
      role: s.role as SignOffExecutiveRole,
      roleLabel: roleLabels[s.role as SignOffExecutiveRole] || s.role,
      signedByUserId: s.signed_by_user_id || undefined,
      signedByUserName: s.signed_by_user_name || undefined,
      signedAt: s.signed_at ? s.signed_at.toISOString() : undefined,
      isApproved: Boolean(s.is_approved),
      governanceComments: s.governance_comments || undefined,
      digitalSignatureHash: s.digital_signature_hash || undefined
    }));

    const resultPlan: SuccessionPlanDTO = {
      id: p.id,
      userId: p.user_id,
      title: p.title,
      fiscalYear: Number(p.fiscal_year),
      status: p.status as SuccessionPlanStatus,
      calibrationDistribution,
      benchDepth,
      averageKeyPersonRiskIndex,
      averageCompetencyCoverageIndex,
      successionHealthScore: health.score,
      governanceHealthTier: health.tier,
      criticalRoles,
      activeInterventionsCount: activeInterventions.length,
      totalInterventionBudgetUsd,
      boardMemorandumMarkdown: '',
      signOffs,
      createdAt: p.created_at.toISOString(),
      updatedAt: p.updated_at.toISOString()
    };

    resultPlan.boardMemorandumMarkdown = generateBoardSuccessionMemorandumMarkdown(resultPlan);
    return resultPlan;
  }

  async signOffPlan(
    userId: string,
    planId: string,
    input: { role: SignOffExecutiveRole; comments?: string }
  ): Promise<SuccessionPlanDTO> {
    const validated = validateSignOffInput(input);
    const now = new Date().toISOString();

    const planRes = await this.pool.query(
      `SELECT * FROM succession_plans WHERE user_id = $1 AND id = $2`,
      [userId, planId]
    );

    if (planRes.rows.length === 0) {
      throw new Error('succession_plan_not_found');
    }

    const uRes = await this.pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    const userName = uRes.rows[0]?.email?.split('@')[0] || 'Executive Leader';

    const hashPayload = `${userId}:${planId}:${validated.role}:${now}:${validated.comments || ''}`;
    const hash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const updateRes = await this.pool.query(
      `UPDATE succession_sign_offs SET
        signed_by_user_id = $3,
        signed_by_user_name = $4,
        signed_at = $5,
        is_approved = TRUE,
        governance_comments = $6,
        digital_signature_hash = $7,
        updated_at = $5
       WHERE user_id = $1 AND plan_id = $2 AND role = $8
       RETURNING *`,
      [userId, planId, userId, userName, now, validated.comments || null, hash, validated.role]
    );

    if (updateRes.rows.length === 0) {
      throw new Error('sign_off_role_not_found');
    }

    const allSigns = await this.pool.query(
      `SELECT role, is_approved FROM succession_sign_offs WHERE user_id = $1 AND plan_id = $2`,
      [userId, planId]
    );

    const vpTalent = allSigns.rows.find(s => s.role === 'vp_talent_management')?.is_approved;
    const cpo = allSigns.rows.find(s => s.role === 'chief_people_officer')?.is_approved;
    const ceo = allSigns.rows.find(s => s.role === 'ceo')?.is_approved;

    let newStatus: SuccessionPlanStatus = 'draft';
    if (vpTalent && cpo && ceo) {
      newStatus = 'board_approved';
    } else if (vpTalent && cpo) {
      newStatus = 'pending_ceo';
    } else if (vpTalent) {
      newStatus = 'pending_cpo';
    } else {
      newStatus = 'pending_vp_talent';
    }

    await this.pool.query(
      `UPDATE succession_plans SET status = $3, updated_at = $4 WHERE user_id = $1 AND id = $2`,
      [userId, planId, newStatus, now]
    );

    return this.getPlan(userId, planId);
  }

  async getOverview(userId: string): Promise<SuccessionStudioOverviewDTO> {
    const plan = await this.getPlan(userId);
    const talentProfiles = await this.listTalentProfiles(userId);
    const interventions = await this.listRetentionInterventions(userId);
    const developmentPlans = await this.listDevelopmentPlans(userId);

    return {
      plan,
      talentProfiles,
      interventions,
      developmentPlans,
      calibrationDistribution: plan.calibrationDistribution,
      benchDepth: plan.benchDepth
    };
  }

  private mapTalentProfile(r: Record<string, unknown>): TalentProfileDTO {
    const perf = Number(r.performance_level) as PerformanceLevel;
    const pot = Number(r.potential_level) as PotentialLevel;
    const nineBoxClassification = classifyNineBox(perf, pot);
    const nineBoxCalibrationScore = calculateNineBoxScore(perf, pot);

    const compa = Number(r.total_direct_comp_usd) / Math.max(1, Number(r.market_benchmark_p75_usd));
    const flight = calculateFlightRisk(
      compa,
      Number(r.years_in_current_role),
      Number(r.months_to_cliff),
      Number(r.org_change_impact)
    );

    const kpri = calculateKeyPersonRiskIndex(
      Number(r.spof_severity),
      Number(r.operational_criticality),
      Number(r.replacement_difficulty)
    );

    return {
      id: String(r.id),
      userId: String(r.user_id),
      employeeId: String(r.employee_id),
      fullName: String(r.full_name),
      currentRole: String(r.current_role_title || r.current_role || ''),
      department: String(r.department),
      tenureYears: Number(r.tenure_years),
      yearsInCurrentRole: Number(r.years_in_current_role),
      performanceLevel: perf,
      potentialLevel: pot,
      nineBoxClassification,
      nineBoxCalibrationScore,
      totalDirectCompensationUsd: Number(r.total_direct_comp_usd),
      marketBenchmarkP75Usd: Number(r.market_benchmark_p75_usd),
      compaRatio: Number(compa.toFixed(2)),
      unvestedEquityValueUsd: Number(r.unvested_equity_usd),
      monthsToEquityCliff: Number(r.months_to_cliff),
      organizationalChangeImpact: Number(r.org_change_impact),
      flightRiskScore: flight.score,
      flightRiskLevel: flight.level,
      spofSeverity: Number(r.spof_severity),
      operationalCriticality: Number(r.operational_criticality),
      replacementDifficulty: Number(r.replacement_difficulty),
      keyPersonRiskIndex: kpri.index,
      keyPersonRiskTier: kpri.tier,
      underrepresentedLeader: Boolean(r.underrepresented_leader),
      avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString()
    };
  }
}
