import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ReorgScenarioDTO,
  type ReorgScenarioMutationDTO,
  type TeamTopologyDTO,
  type TeamTopologyMutationDTO,
  type OrgNodeDTO,
  type HierarchyHealthMetricsDTO,
  type ServiceDependencyEdgeDTO,
  calculateTeamCognitiveLoadIndex,
  calculateConwayAlignmentScore,
  calculateReorgDisruptionRisk,
  calculateSpanHealth,
  generateReorgExecutiveMemoMarkdown
} from '@jobtrack/contract';

export class OrgTopologyStudioService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS org_reorg_scenarios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        current_hierarchy_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        proposed_hierarchy_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
        current_conway_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        proposed_conway_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        budget_delta_annual_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        headcount_delta INT NOT NULL DEFAULT 0,
        disruption_risk_index NUMERIC(5, 2) NOT NULL DEFAULT 0,
        transferred_engineers_count INT NOT NULL DEFAULT 0,
        reassigned_services_count INT NOT NULL DEFAULT 0,
        executive_rationale TEXT NOT NULL DEFAULT '',
        target_completion_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_org_reorg_scenarios_user_updated
        ON org_reorg_scenarios(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS org_team_topologies (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario_id UUID NOT NULL REFERENCES org_reorg_scenarios(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(64) NOT NULL DEFAULT 'stream_aligned',
        mission_statement TEXT NOT NULL DEFAULT '',
        lead_engineer_name VARCHAR(255) NOT NULL DEFAULT '',
        headcount INT NOT NULL DEFAULT 6,
        domain_complexity INT NOT NULL DEFAULT 3,
        operational_toil_percentage NUMERIC(5, 2) NOT NULL DEFAULT 20,
        weekly_incident_alert_count INT NOT NULL DEFAULT 5,
        cognitive_load_index NUMERIC(5, 2) NOT NULL DEFAULT 50,
        cognitive_load_status VARCHAR(64) NOT NULL DEFAULT 'optimal_sustainable',
        owned_services JSONB NOT NULL DEFAULT '[]'::jsonb,
        interactions JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_org_team_topologies_scenario
        ON org_team_topologies(scenario_id, created_at ASC);

      CREATE INDEX IF NOT EXISTS idx_org_team_topologies_user
        ON org_team_topologies(user_id);

      CREATE TABLE IF NOT EXISTS org_employees (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario_id UUID NOT NULL REFERENCES org_reorg_scenarios(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        level VARCHAR(32) NOT NULL DEFAULT 'IC3',
        track VARCHAR(32) NOT NULL DEFAULT 'individual_contributor',
        manager_id UUID REFERENCES org_employees(id) ON DELETE SET NULL,
        team_id UUID REFERENCES org_team_topologies(id) ON DELETE SET NULL,
        annual_base_salary NUMERIC(12, 2) NOT NULL DEFAULT 150000,
        annual_target_bonus NUMERIC(12, 2) NOT NULL DEFAULT 22500,
        unvested_equity_value NUMERIC(12, 2) NOT NULL DEFAULT 80000,
        tenure_months INT NOT NULL DEFAULT 24,
        tenure_at_level_months INT NOT NULL DEFAULT 12,
        flight_risk_index NUMERIC(5, 2) NOT NULL DEFAULT 25,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_org_employees_scenario_manager
        ON org_employees(scenario_id, manager_id);

      CREATE INDEX IF NOT EXISTS idx_org_employees_user
        ON org_employees(user_id);

      CREATE TABLE IF NOT EXISTS org_conway_dependencies (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario_id UUID NOT NULL REFERENCES org_reorg_scenarios(id) ON DELETE CASCADE,
        source_service_id VARCHAR(128) NOT NULL,
        source_service_name VARCHAR(255) NOT NULL,
        target_service_id VARCHAR(128) NOT NULL,
        target_service_name VARCHAR(255) NOT NULL,
        source_team_id UUID REFERENCES org_team_topologies(id) ON DELETE CASCADE,
        target_team_id UUID REFERENCES org_team_topologies(id) ON DELETE CASCADE,
        call_volume_weekly INT NOT NULL DEFAULT 100000,
        is_synchronous BOOLEAN NOT NULL DEFAULT true,
        interaction_friction_coefficient NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_org_conway_deps_scenario
        ON org_conway_dependencies(scenario_id);
    `);
  }

  async listScenarios(userId: string): Promise<ReorgScenarioDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM org_reorg_scenarios WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    if (res.rows.length === 0) {
      const seeded = await this.seedDefaultScenario(userId);
      return [seeded];
    }

    return res.rows.map(row => this.mapScenarioRow(row));
  }

  async getScenario(userId: string, id: string): Promise<ReorgScenarioDTO | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM org_reorg_scenarios WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapScenarioRow(res.rows[0]);
  }

  async createScenario(userId: string, input: ReorgScenarioMutationDTO): Promise<ReorgScenarioDTO> {
    await this.ensureSchema();
    const scenarioId = crypto.randomUUID();

    const baselineHierarchy: HierarchyHealthMetricsDTO = {
      totalHeadcount: 48,
      totalManagers: 8,
      totalIndividualContributors: 40,
      organizationDepth: 4,
      optimalDepth: 3,
      depthExcessPenalty: 12,
      averageSpanOfControl: 5.0,
      microTeamsCount: 3,
      overloadedManagersCount: 2,
      compositeHierarchyHealthScore: 68.5
    };

    const targetHierarchy: HierarchyHealthMetricsDTO = {
      totalHeadcount: 52,
      totalManagers: 8,
      totalIndividualContributors: 44,
      organizationDepth: 3,
      optimalDepth: 3,
      depthExcessPenalty: 0,
      averageSpanOfControl: 6.5,
      microTeamsCount: 0,
      overloadedManagersCount: 0,
      compositeHierarchyHealthScore: 92.4
    };

    const res = await this.pool.query(
      `INSERT INTO org_reorg_scenarios (
        id, user_id, title, status, current_hierarchy_metrics, proposed_hierarchy_metrics,
        current_conway_score, proposed_conway_score, budget_delta_annual_usd, headcount_delta,
        disruption_risk_index, transferred_engineers_count, reassigned_services_count,
        executive_rationale, target_completion_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        scenarioId,
        userId,
        input.title,
        input.status || 'draft',
        JSON.stringify(baselineHierarchy),
        JSON.stringify(targetHierarchy),
        62.4,
        84.8,
        185000,
        4,
        34.5,
        8,
        4,
        input.executiveRationale,
        input.targetCompletionDate
      ]
    );

    await this.seedTeamsForScenario(userId, scenarioId);
    return this.mapScenarioRow(res.rows[0]);
  }

  async updateScenario(userId: string, id: string, input: Partial<ReorgScenarioMutationDTO>): Promise<ReorgScenarioDTO | null> {
    await this.ensureSchema();
    const existing = await this.getScenario(userId, id);
    if (!existing) return null;

    const title = input.title ?? existing.title;
    const status = input.status ?? existing.status;
    const rationale = input.executiveRationale ?? existing.executiveRationale;
    const targetDate = input.targetCompletionDate ?? existing.targetCompletionDate;

    let transferredCount = existing.transferredEngineersCount;
    let reassignedCount = existing.reassignedServicesCount;
    let disruptionRisk = existing.disruptionRiskIndex;

    if (input.proposedTeamAssignments) {
      transferredCount = input.proposedTeamAssignments.length;
    }
    if (input.proposedServiceTransfers) {
      reassignedCount = input.proposedServiceTransfers.length;
    }

    if (input.proposedTeamAssignments || input.proposedServiceTransfers) {
      disruptionRisk = calculateReorgDisruptionRisk(
        existing.currentHierarchyMetrics.totalIndividualContributors,
        transferredCount,
        existing.currentHierarchyMetrics.totalManagers,
        1,
        16,
        reassignedCount
      );
    }

    const res = await this.pool.query(
      `UPDATE org_reorg_scenarios
       SET title = $1, status = $2, executive_rationale = $3, target_completion_date = $4,
           transferred_engineers_count = $5, reassigned_services_count = $6,
           disruption_risk_index = $7, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $8 AND id = $9
       RETURNING *`,
      [
        title,
        status,
        rationale,
        targetDate,
        transferredCount,
        reassignedCount,
        disruptionRisk,
        userId,
        id
      ]
    );

    if (res.rows.length === 0) return null;
    return this.mapScenarioRow(res.rows[0]);
  }

  async deleteScenario(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM org_reorg_scenarios WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listTeams(userId: string, scenarioId: string): Promise<TeamTopologyDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM org_team_topologies WHERE user_id = $1 AND scenario_id = $2 ORDER BY created_at ASC`,
      [userId, scenarioId]
    );
    return res.rows.map(row => this.mapTeamRow(row));
  }

  async addTeam(userId: string, scenarioId: string, input: TeamTopologyMutationDTO): Promise<TeamTopologyDTO> {
    await this.ensureSchema();
    const teamId = crypto.randomUUID();

    const { cli, status } = calculateTeamCognitiveLoadIndex(
      input.headcount,
      (input.ownedServices || []).length,
      input.domainComplexity,
      input.operationalToilPercentage,
      input.type,
      input.interactions || []
    );

    const res = await this.pool.query(
      `INSERT INTO org_team_topologies (
        id, user_id, scenario_id, name, type, mission_statement, lead_engineer_name,
        headcount, domain_complexity, operational_toil_percentage, weekly_incident_alert_count,
        cognitive_load_index, cognitive_load_status, owned_services, interactions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        teamId,
        userId,
        scenarioId,
        input.name,
        input.type,
        input.missionStatement,
        'Staff Lead',
        input.headcount,
        input.domainComplexity,
        input.operationalToilPercentage,
        input.weeklyIncidentAlertCount,
        cli,
        status,
        JSON.stringify(input.ownedServices || []),
        JSON.stringify(input.interactions || [])
      ]
    );

    return this.mapTeamRow(res.rows[0]);
  }

  async updateTeam(userId: string, teamId: string, input: Partial<TeamTopologyMutationDTO>): Promise<TeamTopologyDTO | null> {
    await this.ensureSchema();
    const existingRes = await this.pool.query(
      `SELECT * FROM org_team_topologies WHERE user_id = $1 AND id = $2`,
      [userId, teamId]
    );
    if (existingRes.rows.length === 0) return null;
    const existing = this.mapTeamRow(existingRes.rows[0]);

    const name = input.name ?? existing.name;
    const type = input.type ?? existing.type;
    const missionStatement = input.missionStatement ?? existing.missionStatement;
    const headcount = input.headcount ?? existing.headcount;
    const domainComplexity = input.domainComplexity ?? existing.domainComplexity;
    const operationalToilPercentage = input.operationalToilPercentage ?? existing.operationalToilPercentage;
    const weeklyIncidentAlertCount = input.weeklyIncidentAlertCount ?? existing.weeklyIncidentAlertCount;
    const ownedServices = input.ownedServices ?? existing.ownedServices;
    const interactions = input.interactions ?? existing.interactions;

    const { cli, status } = calculateTeamCognitiveLoadIndex(
      headcount,
      ownedServices.length,
      domainComplexity,
      operationalToilPercentage,
      type,
      interactions
    );

    const res = await this.pool.query(
      `UPDATE org_team_topologies
       SET name = $1, type = $2, mission_statement = $3, headcount = $4,
           domain_complexity = $5, operational_toil_percentage = $6,
           weekly_incident_alert_count = $7, owned_services = $8, interactions = $9,
           cognitive_load_index = $10, cognitive_load_status = $11, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $12 AND id = $13
       RETURNING *`,
      [
        name,
        type,
        missionStatement,
        headcount,
        domainComplexity,
        operationalToilPercentage,
        weeklyIncidentAlertCount,
        JSON.stringify(ownedServices),
        JSON.stringify(interactions),
        cli,
        status,
        userId,
        teamId
      ]
    );

    if (res.rows.length === 0) return null;
    return this.mapTeamRow(res.rows[0]);
  }

  async deleteTeam(userId: string, teamId: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM org_team_topologies WHERE user_id = $1 AND id = $2`,
      [userId, teamId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listEmployees(userId: string, scenarioId: string): Promise<OrgNodeDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT e.*, t.name as team_name
       FROM org_employees e
       LEFT JOIN org_team_topologies t ON e.team_id = t.id
       WHERE e.user_id = $1 AND e.scenario_id = $2
       ORDER BY e.level ASC, e.employee_name ASC`,
      [userId, scenarioId]
    );

    if (res.rows.length === 0) {
      await this.seedEmployeesForScenario(userId, scenarioId);
      return this.listEmployees(userId, scenarioId);
    }

    return res.rows.map(row => this.mapEmployeeRow(row));
  }

  async generateMemo(userId: string, scenarioId: string): Promise<string | null> {
    const scenario = await this.getScenario(userId, scenarioId);
    if (!scenario) return null;
    return generateReorgExecutiveMemoMarkdown(scenario);
  }

  private async seedDefaultScenario(userId: string): Promise<ReorgScenarioDTO> {
    const scenarioId = crypto.randomUUID();
    const metrics: HierarchyHealthMetricsDTO = {
      totalHeadcount: 52,
      totalManagers: 8,
      totalIndividualContributors: 44,
      organizationDepth: 4,
      optimalDepth: 3,
      depthExcessPenalty: 10,
      averageSpanOfControl: 5.5,
      microTeamsCount: 2,
      overloadedManagersCount: 1,
      compositeHierarchyHealthScore: 74.0
    };

    const res = await this.pool.query(
      `INSERT INTO org_reorg_scenarios (
        id, user_id, title, status, current_hierarchy_metrics, proposed_hierarchy_metrics,
        current_conway_score, proposed_conway_score, budget_delta_annual_usd, headcount_delta,
        disruption_risk_index, transferred_engineers_count, reassigned_services_count,
        executive_rationale, target_completion_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        scenarioId,
        userId,
        'Enterprise Platform Decoupling & Stream Realignment',
        'draft',
        JSON.stringify(metrics),
        JSON.stringify({ ...metrics, averageSpanOfControl: 6.8, compositeHierarchyHealthScore: 91.2 }),
        64.5,
        86.2,
        240000,
        3,
        28.4,
        6,
        3,
        'Decouple core billing engine from monolithic commerce repo and establish a dedicated Cloud Infrastructure Platform Team to eliminate deploy lock-in.',
        new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
      ]
    );

    await this.seedTeamsForScenario(userId, scenarioId);
    return this.mapScenarioRow(res.rows[0]);
  }

  private async seedTeamsForScenario(userId: string, scenarioId: string): Promise<void> {
    const teams = [
      {
        name: 'Checkout & Payments Stream',
        type: 'stream_aligned',
        mission: 'Own frictionless customer purchase flows, PSP integrations, and invoice processing.',
        headcount: 7,
        complexity: 4,
        toil: 15,
        alerts: 4,
        services: [
          { serviceId: 'svc-pay-1', serviceName: 'Payment Gateway Client', tier: 'tier_1_mission_critical', linesOfCode: 42000, deploymentFrequencyPerWeek: 12, monthlyP1Incidents: 0 },
          { serviceId: 'svc-pay-2', serviceName: 'Billing & Invoice Ledger', tier: 'tier_1_mission_critical', linesOfCode: 58000, deploymentFrequencyPerWeek: 6, monthlyP1Incidents: 1 }
        ],
        interactions: [
          { targetTeamId: 'ext-plat', targetTeamName: 'Developer Experience Platform', interactionMode: 'x_as_a_service', purpose: 'CI/CD pipeline and observability SDKs', weeklySyncHours: 1 }
        ]
      },
      {
        name: 'Developer Experience Platform',
        type: 'platform',
        mission: 'Provide self-service Kubernetes pipelines, telemetry SDKs, and local dev environments.',
        headcount: 6,
        complexity: 3,
        toil: 10,
        alerts: 2,
        services: [
          { serviceId: 'svc-plat-1', serviceName: 'Kubernetes Cluster GitOps', tier: 'tier_1_mission_critical', linesOfCode: 15000, deploymentFrequencyPerWeek: 25, monthlyP1Incidents: 0 },
          { serviceId: 'svc-plat-2', serviceName: 'Internal Developer Portal', tier: 'tier_2_business_critical', linesOfCode: 31000, deploymentFrequencyPerWeek: 8, monthlyP1Incidents: 0 }
        ],
        interactions: [
          { targetTeamId: 'ext-sec', targetTeamName: 'Architecture & Security Enabling', interactionMode: 'facilitating', purpose: 'Zero-trust network baseline integration', weeklySyncHours: 2 }
        ]
      },
      {
        name: 'Real-Time Fraud Subsystem',
        type: 'complicated_subsystem',
        mission: 'Maintain distributed low-latency graph neural network engine for anomaly scoring.',
        headcount: 5,
        complexity: 5,
        toil: 12,
        alerts: 3,
        services: [
          { serviceId: 'svc-fraud-1', serviceName: 'Graph Inference Engine', tier: 'tier_1_mission_critical', linesOfCode: 85000, deploymentFrequencyPerWeek: 2, monthlyP1Incidents: 1 }
        ],
        interactions: [
          { targetTeamId: 'ext-pay', targetTeamName: 'Checkout & Payments Stream', interactionMode: 'x_as_a_service', purpose: 'gRPC low-latency scoring endpoint', weeklySyncHours: 1 }
        ]
      },
      {
        name: 'Architecture & Security Enabling',
        type: 'enabling',
        mission: 'Upskill stream teams in zero-trust mTLS, event-driven schemas, and secure coding practices.',
        headcount: 4,
        complexity: 4,
        toil: 8,
        alerts: 1,
        services: [
          { serviceId: 'svc-sec-1', serviceName: 'Security Policy Validator', tier: 'tier_2_business_critical', linesOfCode: 12000, deploymentFrequencyPerWeek: 4, monthlyP1Incidents: 0 }
        ],
        interactions: [
          { targetTeamId: 'ext-pay', targetTeamName: 'Checkout & Payments Stream', interactionMode: 'facilitating', purpose: 'Threat modeling and payment tokenization audit', weeklySyncHours: 3 }
        ]
      }
    ];

    for (const t of teams) {
      const { cli, status } = calculateTeamCognitiveLoadIndex(
        t.headcount,
        t.services.length,
        t.complexity,
        t.toil,
        t.type as any,
        t.interactions as any
      );

      await this.pool.query(
        `INSERT INTO org_team_topologies (
          id, user_id, scenario_id, name, type, mission_statement, lead_engineer_name,
          headcount, domain_complexity, operational_toil_percentage, weekly_incident_alert_count,
          cognitive_load_index, cognitive_load_status, owned_services, interactions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          crypto.randomUUID(),
          userId,
          scenarioId,
          t.name,
          t.type,
          t.mission,
          'Principal Architect',
          t.headcount,
          t.complexity,
          t.toil,
          t.alerts,
          cli,
          status,
          JSON.stringify(t.services),
          JSON.stringify(t.interactions)
        ]
      );
    }
  }

  private async seedEmployeesForScenario(userId: string, scenarioId: string): Promise<void> {
    const defaultRoster = [
      { name: 'Dr. Evelyn Reed', title: 'VP of Engineering', level: 'EM4', track: 'management', salary: 280000, bonus: 56000, equity: 220000, tenure: 36, atLevel: 18, risk: 22 },
      { name: 'Marcus Vance', title: 'Senior Engineering Manager', level: 'EM2', track: 'management', salary: 215000, bonus: 32250, equity: 130000, tenure: 28, atLevel: 14, risk: 38 },
      { name: 'Elena Rostova', title: 'Engineering Manager - Platform', level: 'EM1', track: 'management', salary: 190000, bonus: 28500, equity: 95000, tenure: 20, atLevel: 20, risk: 45 },
      { name: 'Sarah Lin', title: 'Staff Software Engineer', level: 'IC4', track: 'individual_contributor', salary: 195000, bonus: 29250, equity: 110000, tenure: 32, atLevel: 16, risk: 30 },
      { name: 'David Kim', title: 'Senior Software Engineer', level: 'IC3', track: 'individual_contributor', salary: 165000, bonus: 24750, equity: 75000, tenure: 24, atLevel: 12, risk: 25 },
      { name: 'Amara Okafor', title: 'Senior Software Engineer', level: 'IC3', track: 'individual_contributor', salary: 160000, bonus: 24000, equity: 70000, tenure: 18, atLevel: 18, risk: 35 },
      { name: 'Chloe Dubois', title: 'Software Engineer II', level: 'IC2', track: 'individual_contributor', salary: 135000, bonus: 13500, equity: 45000, tenure: 14, atLevel: 14, risk: 20 }
    ];

    for (const emp of defaultRoster) {
      await this.pool.query(
        `INSERT INTO org_employees (
          id, user_id, scenario_id, employee_name, job_title, level, track,
          annual_base_salary, annual_target_bonus, unvested_equity_value,
          tenure_months, tenure_at_level_months, flight_risk_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          crypto.randomUUID(),
          userId,
          scenarioId,
          emp.name,
          emp.title,
          emp.level,
          emp.track,
          emp.salary,
          emp.bonus,
          emp.equity,
          emp.tenure,
          emp.atLevel,
          emp.risk
        ]
      );
    }
  }

  private mapScenarioRow(row: any): ReorgScenarioDTO {
    return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      status: row.status,
      currentHierarchyMetrics: typeof row.current_hierarchy_metrics === 'string' ? JSON.parse(row.current_hierarchy_metrics) : row.current_hierarchy_metrics,
      proposedHierarchyMetrics: typeof row.proposed_hierarchy_metrics === 'string' ? JSON.parse(row.proposed_hierarchy_metrics) : row.proposed_hierarchy_metrics,
      currentConwayScore: Number(row.current_conway_score),
      proposedConwayScore: Number(row.proposed_conway_score),
      budgetDeltaAnnualUsd: Number(row.budget_delta_annual_usd),
      headcountDelta: Number(row.headcount_delta),
      disruptionRiskIndex: Number(row.disruption_risk_index),
      transferredEngineersCount: Number(row.transferred_engineers_count),
      reassignedServicesCount: Number(row.reassigned_services_count),
      conwayEdges: [],
      executiveRationale: row.executive_rationale,
      targetCompletionDate: row.target_completion_date ? new Date(row.target_completion_date).toISOString().split('T')[0] : '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapTeamRow(row: any): TeamTopologyDTO {
    return {
      id: row.id,
      planId: row.scenario_id,
      name: row.name,
      type: row.type,
      missionStatement: row.mission_statement,
      leadEngineerName: row.lead_engineer_name,
      headcount: Number(row.headcount),
      domainComplexity: Number(row.domain_complexity),
      operationalToilPercentage: Number(row.operational_toil_percentage),
      weeklyIncidentAlertCount: Number(row.weekly_incident_alert_count),
      ownedServices: typeof row.owned_services === 'string' ? JSON.parse(row.owned_services) : (row.owned_services || []),
      interactions: typeof row.interactions === 'string' ? JSON.parse(row.interactions) : (row.interactions || []),
      cognitiveLoadIndex: Number(row.cognitive_load_index),
      cognitiveLoadStatus: row.cognitive_load_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapEmployeeRow(row: any): OrgNodeDTO {
    const directReports = Number(row.direct_reports_count || 0);
    return {
      id: row.id,
      employeeName: row.employee_name,
      jobTitle: row.job_title,
      level: row.level,
      track: row.track,
      managerId: row.manager_id,
      teamId: row.team_id,
      teamName: row.team_name || null,
      directReportsCount: directReports,
      totalSubordinatesCount: Number(row.total_subordinates_count || directReports),
      spanHealth: calculateSpanHealth(directReports),
      annualBaseSalary: Number(row.annual_base_salary),
      annualTargetBonus: Number(row.annual_target_bonus),
      unvestedEquityValue: Number(row.unvested_equity_value),
      tenureMonths: Number(row.tenure_months),
      tenureAtLevelMonths: Number(row.tenure_at_level_months),
      flightRiskIndex: Number(row.flight_risk_index)
    };
  }
}
