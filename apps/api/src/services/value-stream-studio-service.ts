import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ValueStreamDTO,
  type ValueStreamMutationDTO,
  type StrategicOkrLinkageDTO,
  type StrategicOkrMutationDTO,
  type DoraMetricsSnapshotDTO,
  type DoraCalculateRequestDTO,
  type FlowMetricsSnapshotDTO,
  type FlowSimulationRequestDTO,
  type CapitalizedProjectLaborDTO,
  type CapitalizedProjectMutationDTO,
  type RdInvestmentSizingSummaryDTO,
  type BoardMemorandumDTO,
  type BoardMemorandumGenerateRequestDTO,
  type ValueStreamStudioOverviewDTO,
  calculateValueStreamLeadTimeAndFlowEfficiency,
  calculateStrategicAlignmentIndex,
  calculateDoraMetricsSnapshot,
  calculateFlowMetricsSnapshot,
  calculateCapitalizedProjectLabor,
  calculateRdInvestmentSizingSummary,
  calculateCompositeDeliveryHealthIndex
} from '@jobtrack/contract';

export class ValueStreamStudioService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS vsm_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_name VARCHAR(255) NOT NULL,
        default_fiscal_quarter VARCHAR(32) NOT NULL DEFAULT 'Q4-2026',
        standard_burden_multiplier NUMERIC(5, 3) NOT NULL DEFAULT 1.320,
        annual_work_hours INT NOT NULL DEFAULT 1920,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_vsm_studios_user
        ON vsm_studios(user_id);

      CREATE TABLE IF NOT EXISTS vsm_value_streams (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        business_domain VARCHAR(255) NOT NULL,
        executive_sponsor VARCHAR(255) NOT NULL DEFAULT '',
        contributing_headcount INT NOT NULL DEFAULT 12,
        stages JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_active_touch_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total_idle_wait_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        value_stream_lead_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        flow_efficiency_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        flow_health_status VARCHAR(64) NOT NULL DEFAULT 'moderate_friction',
        strategic_alignment_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_value_streams_user_updated
        ON vsm_value_streams(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS vsm_okr_alignments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value_stream_id UUID NOT NULL REFERENCES vsm_value_streams(id) ON DELETE CASCADE,
        strategic_theme VARCHAR(255) NOT NULL,
        corporate_objective TEXT NOT NULL,
        team_key_result TEXT NOT NULL,
        priority_tier VARCHAR(64) NOT NULL DEFAULT 'tier_1_growth',
        allocated_capacity_points INT NOT NULL DEFAULT 100,
        total_capacity_points INT NOT NULL DEFAULT 100,
        capacity_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
        alignment_weighted_score NUMERIC(5, 2) NOT NULL DEFAULT 100,
        target_quarter VARCHAR(32) NOT NULL DEFAULT 'Q4-2026',
        status VARCHAR(32) NOT NULL DEFAULT 'on_track',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_okr_alignments_user_stream
        ON vsm_okr_alignments(user_id, value_stream_id);

      CREATE TABLE IF NOT EXISTS vsm_dora_snapshots (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value_stream_id UUID NOT NULL REFERENCES vsm_value_streams(id) ON DELETE CASCADE,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        deployment_frequency JSONB NOT NULL DEFAULT '{}'::jsonb,
        lead_time_for_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
        change_failure_rate JSONB NOT NULL DEFAULT '{}'::jsonb,
        failed_deployment_recovery_time JSONB NOT NULL DEFAULT '{}'::jsonb,
        delivery_velocity_index NUMERIC(5, 2) NOT NULL DEFAULT 0,
        dora_stability_index NUMERIC(5, 2) NOT NULL DEFAULT 0,
        composite_dora_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        composite_tier VARCHAR(32) NOT NULL DEFAULT 'medium',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_dora_snapshots_user_period
        ON vsm_dora_snapshots(user_id, period_end DESC);

      CREATE TABLE IF NOT EXISTS vsm_flow_metrics (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value_stream_id UUID NOT NULL REFERENCES vsm_value_streams(id) ON DELETE CASCADE,
        measurement_cycle VARCHAR(64) NOT NULL,
        flow_velocity_total INT NOT NULL DEFAULT 0,
        flow_load_total_wip INT NOT NULL DEFAULT 0,
        recommended_max_wip INT NOT NULL DEFAULT 0,
        wip_saturation_ratio NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
        context_switching_drag_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        utilization_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 80,
        kingman_queue_wait_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
        breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
        flow_health_score NUMERIC(5, 2) NOT NULL DEFAULT 75,
        flow_health_status VARCHAR(64) NOT NULL DEFAULT 'healthy_flow',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_flow_metrics_user_cycle
        ON vsm_flow_metrics(user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS vsm_capitalized_projects (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value_stream_id UUID NOT NULL REFERENCES vsm_value_streams(id) ON DELETE CASCADE,
        project_name VARCHAR(255) NOT NULL,
        investment_category VARCHAR(64) NOT NULL DEFAULT 'grow',
        development_stage VARCHAR(64) NOT NULL DEFAULT 'application_development',
        qualifying_labor_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        non_qualifying_labor_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
        blended_burdened_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 110,
        capitalized_labor_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        expensed_labor_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        capitalization_ratio_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        annualized_attributable_arr_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        estimated_useful_life_months INT NOT NULL DEFAULT 36,
        monthly_amortization_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        projected_roi_percent NUMERIC(8, 2) NOT NULL DEFAULT 0,
        audit_documentation_ref VARCHAR(255) NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_capitalized_projects_user_stream
        ON vsm_capitalized_projects(user_id, value_stream_id);

      CREATE TABLE IF NOT EXISTS vsm_board_memos (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        fiscal_quarter VARCHAR(32) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        delivery_health_index NUMERIC(5, 2) NOT NULL DEFAULT 0,
        health_band VARCHAR(64) NOT NULL DEFAULT 'predictable_growth',
        executive_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        dora_scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
        flow_wip_diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb,
        capitalized_rd_financials JSONB NOT NULL DEFAULT '{}'::jsonb,
        executive_action_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
        ebitda_enhancement_annualized_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        approved_by_cto_at TIMESTAMPTZ,
        approved_by_cfo_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vsm_board_memos_user_quarter
        ON vsm_board_memos(user_id, fiscal_quarter DESC);
    `);
  }

  private parseJsonField<T>(field: unknown, fallback: T): T {
    if (!field) return fallback;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field) as T;
      } catch {
        return fallback;
      }
    }
    return field as T;
  }

  private mapValueStreamRow(row: Record<string, unknown>): ValueStreamDTO {
    return {
      id: String(row.id),
      name: String(row.name),
      businessDomain: String(row.business_domain),
      executiveSponsor: String(row.executive_sponsor || ''),
      contributingHeadcount: Number(row.contributing_headcount) || 0,
      stages: this.parseJsonField(row.stages, []),
      totalActiveTouchHours: Number(row.total_active_touch_hours) || 0,
      totalIdleWaitHours: Number(row.total_idle_wait_hours) || 0,
      valueStreamLeadTimeHours: Number(row.value_stream_lead_time_hours) || 0,
      flowEfficiencyPercent: Number(row.flow_efficiency_percent) || 0,
      flowHealthStatus: (row.flow_health_status as ValueStreamDTO['flowHealthStatus']) || 'moderate_friction',
      strategicAlignmentScore: Number(row.strategic_alignment_score) || 0,
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString()
    };
  }

  private mapOkrRow(row: Record<string, unknown>, streamNameMap: Map<string, string>): StrategicOkrLinkageDTO {
    const streamId = String(row.value_stream_id);
    return {
      id: String(row.id),
      valueStreamId: streamId,
      valueStreamName: streamNameMap.get(streamId) || 'Core Value Stream',
      strategicTheme: String(row.strategic_theme),
      corporateObjective: String(row.corporate_objective),
      teamKeyResult: String(row.team_key_result),
      priorityTier: (row.priority_tier as StrategicOkrLinkageDTO['priorityTier']) || 'tier_1_growth',
      allocatedCapacityPoints: Number(row.allocated_capacity_points) || 0,
      totalCapacityPoints: Number(row.total_capacity_points) || 100,
      capacitySharePercent: Number(row.capacity_share_percent) || 0,
      alignmentWeightedScore: Number(row.alignment_weighted_score) || 0,
      targetQuarter: String(row.target_quarter || 'Q4-2026'),
      status: (row.status as StrategicOkrLinkageDTO['status']) || 'on_track'
    };
  }

  private mapDoraSnapshotRow(row: Record<string, unknown>): DoraMetricsSnapshotDTO {
    return {
      id: String(row.id),
      valueStreamId: String(row.value_stream_id),
      periodStart: String(row.period_start),
      periodEnd: String(row.period_end),
      deploymentFrequency: this.parseJsonField(row.deployment_frequency, {
        value: 1.0,
        unit: 'deploys/day',
        tier: 'elite',
        benchmarkTarget: '>= 1.0 deploy/day',
        normalizedScore: 80,
        historicalDeltaPercent: 0
      }),
      leadTimeForChanges: this.parseJsonField(row.lead_time_for_changes, {
        value: 24.0,
        unit: 'hours',
        tier: 'elite',
        benchmarkTarget: '< 24 hours',
        normalizedScore: 80,
        historicalDeltaPercent: 0
      }),
      changeFailureRate: this.parseJsonField(row.change_failure_rate, {
        value: 5.0,
        unit: 'percent',
        tier: 'elite',
        benchmarkTarget: '< 5.0%',
        normalizedScore: 80,
        historicalDeltaPercent: 0
      }),
      failedDeploymentRecoveryTime: this.parseJsonField(row.failed_deployment_recovery_time, {
        value: 1.0,
        unit: 'hours',
        tier: 'elite',
        benchmarkTarget: '< 1.0 hour',
        normalizedScore: 80,
        historicalDeltaPercent: 0
      }),
      deliveryVelocityIndex: Number(row.delivery_velocity_index) || 0,
      doraStabilityIndex: Number(row.dora_stability_index) || 0,
      compositeDoraScore: Number(row.composite_dora_score) || 0,
      compositeTier: (row.composite_tier as DoraMetricsSnapshotDTO['compositeTier']) || 'medium',
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString()
    };
  }

  private mapFlowSnapshotRow(row: Record<string, unknown>): FlowMetricsSnapshotDTO {
    return {
      id: String(row.id),
      valueStreamId: String(row.value_stream_id),
      measurementCycle: String(row.measurement_cycle),
      flowVelocityTotal: Number(row.flow_velocity_total) || 0,
      flowLoadTotalWip: Number(row.flow_load_total_wip) || 0,
      recommendedMaxWip: Number(row.recommended_max_wip) || 0,
      wipSaturationRatio: Number(row.wip_saturation_ratio) || 1.0,
      contextSwitchingDragPercent: Number(row.context_switching_drag_percent) || 0,
      utilizationRatePercent: Number(row.utilization_rate_percent) || 80,
      kingmanQueueWaitMultiplier: Number(row.kingman_queue_wait_multiplier) || 1.0,
      breakdown: this.parseJsonField(row.breakdown, []),
      flowHealthScore: Number(row.flow_health_score) || 75,
      flowHealthStatus: (row.flow_health_status as FlowMetricsSnapshotDTO['flowHealthStatus']) || 'healthy_flow',
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString()
    };
  }

  private mapCapitalizedProjectRow(row: Record<string, unknown>): CapitalizedProjectLaborDTO {
    return {
      id: String(row.id),
      projectId: String(row.id),
      projectName: String(row.project_name),
      valueStreamId: String(row.value_stream_id),
      investmentCategory: (row.investment_category as CapitalizedProjectLaborDTO['investmentCategory']) || 'grow',
      developmentStage: (row.development_stage as CapitalizedProjectLaborDTO['developmentStage']) || 'application_development',
      qualifyingLaborHours: Number(row.qualifying_labor_hours) || 0,
      nonQualifyingLaborHours: Number(row.non_qualifying_labor_hours) || 0,
      blendedBurdenedHourlyRate: Number(row.blended_burdened_hourly_rate) || 0,
      capitalizedLaborCostUsd: Number(row.capitalized_labor_cost_usd) || 0,
      expensedLaborCostUsd: Number(row.expensed_labor_cost_usd) || 0,
      capitalizationRatioPercent: Number(row.capitalization_ratio_percent) || 0,
      annualizedAttributableArrUsd: Number(row.annualized_attributable_arr_usd) || 0,
      estimatedUsefulLifeMonths: Number(row.estimated_useful_life_months) || 36,
      monthlyAmortizationUsd: Number(row.monthly_amortization_usd) || 0,
      projectedRoiPercent: Number(row.projected_roi_percent) || 0,
      auditDocumentationRef: String(row.audit_documentation_ref || ''),
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString()
    };
  }

  private mapBoardMemoRow(row: Record<string, unknown>): BoardMemorandumDTO {
    return {
      id: String(row.id),
      userScenarioId: String(row.id),
      title: String(row.title),
      fiscalQuarter: String(row.fiscal_quarter),
      status: (row.status as BoardMemorandumDTO['status']) || 'draft',
      deliveryHealthIndex: Number(row.delivery_health_index) || 0,
      healthBand: (row.health_band as BoardMemorandumDTO['healthBand']) || 'predictable_growth',
      executiveSummary: this.parseJsonField(row.executive_summary, {
        sectionKey: 'exec_summary',
        heading: 'Executive Summary',
        executiveSummaryText: '',
        keyMetricsBulletPoints: [],
        strategicGuidance: ''
      }),
      doraScorecard: this.parseJsonField(row.dora_scorecard, {
        sectionKey: 'dora',
        heading: 'DORA Scorecard',
        executiveSummaryText: '',
        keyMetricsBulletPoints: [],
        strategicGuidance: ''
      }),
      flowWipDiagnostics: this.parseJsonField(row.flow_wip_diagnostics, {
        sectionKey: 'flow',
        heading: 'Flow Diagnostics',
        executiveSummaryText: '',
        keyMetricsBulletPoints: [],
        strategicGuidance: ''
      }),
      capitalizedRdFinancials: this.parseJsonField(row.capitalized_rd_financials, {
        sectionKey: 'capex',
        heading: 'Capitalized Financials',
        executiveSummaryText: '',
        keyMetricsBulletPoints: [],
        strategicGuidance: ''
      }),
      executiveActionPlan: this.parseJsonField(row.executive_action_plan, {
        sectionKey: 'action',
        heading: 'Action Plan',
        executiveSummaryText: '',
        keyMetricsBulletPoints: [],
        strategicGuidance: ''
      }),
      ebitdaEnhancementAnnualizedUsd: Number(row.ebitda_enhancement_annualized_usd) || 0,
      approvedByCtoAt: row.approved_by_cto_at ? new Date(String(row.approved_by_cto_at)).toISOString() : undefined,
      approvedByCfoAt: row.approved_by_cfo_at ? new Date(String(row.approved_by_cfo_at)).toISOString() : undefined,
      createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString()
    };
  }

  async seedDefaultData(userId: string): Promise<void> {
    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO vsm_studios (id, user_id, organization_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [studioId, userId, 'Enterprise Core Engineering']
    );

    const vsCoreId = crypto.randomUUID();
    const vsMonetizeId = crypto.randomUUID();
    const vsDataId = crypto.randomUUID();

    const coreStages = [
      { stage: 'backlog', stageName: 'Backlog Refinement', activeTouchHours: 8, idleWaitHours: 72, stageLeadTimeHours: 80, stageFlowEfficiencyPercent: 10.0, bottleneckDetected: false },
      { stage: 'design', stageName: 'Technical Architecture & UX', activeTouchHours: 16, idleWaitHours: 40, stageLeadTimeHours: 56, stageFlowEfficiencyPercent: 28.57, bottleneckDetected: false },
      { stage: 'build', stageName: 'Implementation & Verification', activeTouchHours: 48, idleWaitHours: 12, stageLeadTimeHours: 60, stageFlowEfficiencyPercent: 80.0, bottleneckDetected: false },
      { stage: 'qa_review', stageName: 'Code Review & Staging E2E', activeTouchHours: 6, idleWaitHours: 54, stageLeadTimeHours: 60, stageFlowEfficiencyPercent: 10.0, bottleneckDetected: true },
      { stage: 'deploy', stageName: 'Canary Deployment Pipeline', activeTouchHours: 2, idleWaitHours: 4, stageLeadTimeHours: 6, stageFlowEfficiencyPercent: 33.33, bottleneckDetected: false },
      { stage: 'verify', stageName: 'Telemetry & Health Verification', activeTouchHours: 4, idleWaitHours: 6, stageLeadTimeHours: 10, stageFlowEfficiencyPercent: 40.0, bottleneckDetected: false }
    ];

    const monetizeStages = [
      { stage: 'backlog', stageName: 'Backlog Refinement', activeTouchHours: 10, idleWaitHours: 90, stageLeadTimeHours: 100, stageFlowEfficiencyPercent: 10.0, bottleneckDetected: true },
      { stage: 'design', stageName: 'Financial Compliance Design', activeTouchHours: 14, idleWaitHours: 36, stageLeadTimeHours: 50, stageFlowEfficiencyPercent: 28.0, bottleneckDetected: false },
      { stage: 'build', stageName: 'Implementation', activeTouchHours: 36, idleWaitHours: 14, stageLeadTimeHours: 50, stageFlowEfficiencyPercent: 72.0, bottleneckDetected: false },
      { stage: 'qa_review', stageName: 'SOC2 Security & Integration Tests', activeTouchHours: 8, idleWaitHours: 64, stageLeadTimeHours: 72, stageFlowEfficiencyPercent: 11.11, bottleneckDetected: true },
      { stage: 'deploy', stageName: 'Blue-Green Deploy', activeTouchHours: 3, idleWaitHours: 5, stageLeadTimeHours: 8, stageFlowEfficiencyPercent: 37.5, bottleneckDetected: false },
      { stage: 'verify', stageName: 'Reconciliation Verification', activeTouchHours: 4, idleWaitHours: 8, stageLeadTimeHours: 12, stageFlowEfficiencyPercent: 33.33, bottleneckDetected: false }
    ];

    const dataStages = [
      { stage: 'backlog', stageName: 'Backlog Refinement', activeTouchHours: 6, idleWaitHours: 120, stageLeadTimeHours: 126, stageFlowEfficiencyPercent: 4.76, bottleneckDetected: true },
      { stage: 'design', stageName: 'Schema Design', activeTouchHours: 12, idleWaitHours: 48, stageLeadTimeHours: 60, stageFlowEfficiencyPercent: 20.0, bottleneckDetected: false },
      { stage: 'build', stageName: 'Kafka & Flink Pipeline Build', activeTouchHours: 40, idleWaitHours: 20, stageLeadTimeHours: 60, stageFlowEfficiencyPercent: 66.67, bottleneckDetected: false },
      { stage: 'qa_review', stageName: 'Performance Benchmarking', activeTouchHours: 8, idleWaitHours: 80, stageLeadTimeHours: 88, stageFlowEfficiencyPercent: 9.09, bottleneckDetected: true },
      { stage: 'deploy', stageName: 'Rolling Deployment', activeTouchHours: 2, idleWaitHours: 6, stageLeadTimeHours: 8, stageFlowEfficiencyPercent: 25.0, bottleneckDetected: false },
      { stage: 'verify', stageName: 'Consumer Lag Verification', activeTouchHours: 3, idleWaitHours: 7, stageLeadTimeHours: 10, stageFlowEfficiencyPercent: 30.0, bottleneckDetected: false }
    ];

    await this.pool.query(
      `INSERT INTO vsm_value_streams (
        id, user_id, name, business_domain, executive_sponsor, contributing_headcount, stages,
        total_active_touch_hours, total_idle_wait_hours, value_stream_lead_time_hours,
        flow_efficiency_percent, flow_health_status, strategic_alignment_score
      ) VALUES
      ($1, $2, 'Enterprise Core Platform', 'B2B SaaS Workspace & Collaboration', 'EVP of Product Architecture', 18, $3, 84, 188, 272, 30.88, 'healthy_flow', 88.0),
      ($4, $5, 'Monetization & Billing Engine', 'Stripe Billing & Enterprise Licensing', 'VP of Engineering', 12, $6, 75, 217, 292, 25.68, 'healthy_flow', 84.0),
      ($7, $8, 'Analytics & Event Ingestion', 'Real-Time Telemetry & Data Platform', 'Chief Systems Architect', 12, $9, 71, 281, 352, 20.17, 'healthy_flow', 75.5)`,
      [
        vsCoreId, userId, JSON.stringify(coreStages),
        vsMonetizeId, userId, JSON.stringify(monetizeStages),
        vsDataId, userId, JSON.stringify(dataStages)
      ]
    );

    await this.pool.query(
      `INSERT INTO vsm_okr_alignments (
        id, user_id, value_stream_id, strategic_theme, corporate_objective, team_key_result,
        priority_tier, allocated_capacity_points, total_capacity_points, capacity_share_percent,
        alignment_weighted_score, target_quarter, status
      ) VALUES
      ($1, $2, $3, 'Enterprise Expansion & Compliance', 'Unlock $12M ARR in Fortune 500 Segment by Q1-2027', 'Deliver Role-Based Access Control and Multi-Region Data Isolation', 'tier_0_board', 180, 200, 90.0, 100.0, 'Q4-2026', 'on_track'),
      ($4, $5, $6, 'Net Dollar Retention & Expansion', 'Increase Gross Margin from 71% to 78%', 'Automate ASC 606 revenue recognition and self-serve add-ons', 'tier_1_growth', 120, 140, 85.71, 85.71, 'Q4-2026', 'on_track'),
      ($7, $8, $9, 'Platform Reliability & Moat', 'Maintain 99.99% Availability across All Enterprise Tiers', 'Eliminate single points of failure in event ingress and drop P99 latency to <50ms', 'tier_1_growth', 95, 130, 73.08, 73.08, 'Q4-2026', 'at_risk')`,
      [
        crypto.randomUUID(), userId, vsCoreId,
        crypto.randomUUID(), userId, vsMonetizeId,
        crypto.randomUUID(), userId, vsDataId
      ]
    );

    const doraDf = { value: 1.42, unit: 'deploys/day', tier: 'elite', benchmarkTarget: '>= 1.0 deploy/day', normalizedScore: 88.5, historicalDeltaPercent: 18.2 };
    const doraLtc = { value: 28.5, unit: 'hours', tier: 'high', benchmarkTarget: '< 24 hours', normalizedScore: 76.2, historicalDeltaPercent: -14.5 };
    const doraCfr = { value: 4.8, unit: 'percent', tier: 'elite', benchmarkTarget: '< 5.0%', normalizedScore: 84.0, historicalDeltaPercent: -2.1 };
    const doraFdrt = { value: 1.6, unit: 'hours', tier: 'high', benchmarkTarget: '< 1.0 hour', normalizedScore: 78.0, historicalDeltaPercent: -25.0 };

    await this.pool.query(
      `INSERT INTO vsm_dora_snapshots (
        id, user_id, value_stream_id, period_start, period_end, deployment_frequency,
        lead_time_for_changes, change_failure_rate, failed_deployment_recovery_time,
        delivery_velocity_index, dora_stability_index, composite_dora_score, composite_tier
      ) VALUES ($1, $2, $3, '2026-09-24', '2026-10-24', $4, $5, $6, $7, 82.35, 81.3, 81.8, 'high')`,
      [
        crypto.randomUUID(), userId, vsCoreId,
        JSON.stringify(doraDf), JSON.stringify(doraLtc),
        JSON.stringify(doraCfr), JSON.stringify(doraFdrt)
      ]
    );

    const flowBreakdown = [
      { itemType: 'feature', completedCount: 26, distributionPercent: 54.17, targetBenchmarkPercent: 55.0, wipCount: 15, averageFlowTimeDays: 8.4 },
      { itemType: 'defect', completedCount: 6, distributionPercent: 12.5, targetBenchmarkPercent: 12.0, wipCount: 4, averageFlowTimeDays: 3.2 },
      { itemType: 'technical_debt', completedCount: 9, distributionPercent: 18.75, targetBenchmarkPercent: 18.0, wipCount: 5, averageFlowTimeDays: 9.8 },
      { itemType: 'security', completedCount: 7, distributionPercent: 14.58, targetBenchmarkPercent: 15.0, wipCount: 4, averageFlowTimeDays: 5.1 }
    ];

    await this.pool.query(
      `INSERT INTO vsm_flow_metrics (
        id, user_id, value_stream_id, measurement_cycle, flow_velocity_total, flow_load_total_wip,
        recommended_max_wip, wip_saturation_ratio, context_switching_drag_percent,
        utilization_rate_percent, kingman_queue_wait_multiplier, breakdown, flow_health_score, flow_health_status
      ) VALUES ($1, $2, $3, 'Sprint 26.10', 48, 28, 27, 1.04, 7.2, 78.5, 1.35, $4, 82.5, 'healthy_flow')`,
      [crypto.randomUUID(), userId, vsCoreId, JSON.stringify(flowBreakdown)]
    );

    await this.pool.query(
      `INSERT INTO vsm_capitalized_projects (
        id, user_id, value_stream_id, project_name, investment_category, development_stage,
        qualifying_labor_hours, non_qualifying_labor_hours, blended_burdened_hourly_rate,
        capitalized_labor_cost_usd, expensed_labor_cost_usd, capitalization_ratio_percent,
        annualized_attributable_arr_usd, estimated_useful_life_months, monthly_amortization_usd,
        projected_roi_percent, audit_documentation_ref
      ) VALUES
      ($1, $2, $3, 'Enterprise Multi-Tenant Authorization Engine', 'transform', 'application_development', 3200, 450, 118.5, 379200, 53325, 87.67, 2400000, 36, 10533.33, 454.4, 'JIRA-SEC-8921 / ARCH-DEC-104'),
      ($4, $5, $6, 'Usage-Based Invoicing & Revenue Recognition Engine', 'grow', 'application_development', 2400, 350, 112.0, 268800, 39200, 87.27, 1600000, 36, 7466.67, 419.5, 'FIN-ENG-441 / GAAP-350-SOP'),
      ($7, $8, $9, 'High-Throughput Kafka Ingestion Infrastructure', 'transform', 'application_development', 2900, 400, 122.0, 353800, 48800, 87.88, 1800000, 36, 9827.78, 347.2, 'DATA-INFRA-781 / SOC2-TYPE2')`,
      [
        crypto.randomUUID(), userId, vsCoreId,
        crypto.randomUUID(), userId, vsMonetizeId,
        crypto.randomUUID(), userId, vsDataId
      ]
    );

    const execSummary = {
      sectionKey: 'exec_summary',
      heading: '1. Executive Summary & Strategic Rationale',
      executiveSummaryText: 'During Q4-2026, the technology organization maintained predictable delivery momentum across all 3 primary value streams. Total contributing engineering headcount stands at 42 full-time engineers. Strategic alignment reached 82.5%.',
      keyMetricsBulletPoints: [
        'Composite Delivery Health Index: 78.4 / 100 (Predictable Growth Band)',
        'Strategic OKR Capacity Alignment: 82.5% of total sprint points mapped to approved corporate OKRs',
        'Average Value Stream Flow Efficiency: 24.2% (healthy SaaS benchmark)'
      ],
      strategicGuidance: 'Recommend maintaining focused investment on code review automation to relieve staging queue congestion in the Enterprise Core Platform.'
    };

    const doraSection = {
      sectionKey: 'dora_scorecard',
      heading: '2. Quantitative DORA Benchmark Performance & Reliability Scorecard',
      executiveSummaryText: 'The engineering organization achieved a High DORA composite tier (Score: 81.8/100). Deployment Frequency reached 1.42 deploys per day (Elite tier). Change Failure Rate improved to 4.8% (Elite tier).',
      keyMetricsBulletPoints: [
        'Deployment Frequency: 1.42 deploys/day (Elite)',
        'Lead Time for Changes: 28.5 hours (High)',
        'Change Failure Rate: 4.8% (Elite)',
        'Failed Deployment Recovery Time: 1.6 hours (High)',
        'DORA Stability Index: 81.3 / 100'
      ],
      strategicGuidance: 'Deploy automated rollback triggers in canary pipelines to compress recovery time below the 1.0-hour Elite benchmark.'
    };

    const flowSection = {
      sectionKey: 'flow_wip',
      heading: '3. Flow Framework Efficiency & WIP Bottleneck Diagnostics',
      executiveSummaryText: 'Completed Flow Velocity reached 48 units with a balanced distribution: 54.2% Features, 12.5% Defects, 18.8% Technical Debt, and 14.6% Security. Total Flow Load (WIP) was governed at 28 items against an optimal ceiling of 27 items.',
      keyMetricsBulletPoints: [
        'Total Completed Flow Velocity: 48 units/sprint',
        'WIP Saturation Ratio: 1.04 (Safe operating threshold)',
        'Context Switching Capacity Loss: 7.2% of productive sprint time',
        'Primary Queue Bottleneck: Code Review & Staging Verification (54 hours average wait time)'
      ],
      strategicGuidance: 'Implement mandatory PR pairing thresholds and limit concurrent WIP per squad to prevent context switching loss.'
    };

    const capexSection = {
      sectionKey: 'capitalized_rd',
      heading: '4. ASC 350-40 Capitalized R&D Financial Sizing & EBITDA Impact',
      executiveSummaryText: 'Under US GAAP ASC 350-40, $1.845M in qualifying Application Development Stage labor qualified for balance sheet capitalization (45.0% Capitalization Ratio), delivering an immediate positive EBITDA enhancement of $1.845M.',
      keyMetricsBulletPoints: [
        'Total Capitalized Software Labor (CapEx): $1,845,000',
        'Total Expensed Operational Labor (OpEx): $2,255,000',
        'Overall Capitalization Ratio: 45.0%',
        'Annualized EBITDA Enhancement: $1,845,000',
        'Investment Sizing: 24% Run / 52% Grow / 24% Transform'
      ],
      strategicGuidance: 'Maintain meticulous Jira work-item audit tracking across projects to ensure full external audit defensibility during annual financial reviews.'
    };

    const actionSection = {
      sectionKey: 'action_plan',
      heading: '5. Engineering Leadership Action Plan & Strategic OKR Allocation',
      executiveSummaryText: 'For Q1-2027, engineering leadership will execute three targeted interventions: 1) Deploy ephemeral staging environments; 2) Increase Transform R&D allocation to 28%; 3) Standardize audit tags for automated ASC 350-40 time allocation.',
      keyMetricsBulletPoints: [
        'Milestone 1: Ephemeral preview environments to cut QA wait time by 50%',
        'Milestone 2: Sub-1 hour MTTR via automated canary rollback scripts',
        'Milestone 3: Finalize Board and Audit Committee signoff on Q4 software capitalization schedules'
      ],
      strategicGuidance: 'Board Audit Committee approval is formally recommended for the Q4 capitalization schedule.'
    };

    await this.pool.query(
      `INSERT INTO vsm_board_memos (
        id, user_id, title, fiscal_quarter, status, delivery_health_index, health_band,
        executive_summary, dora_scorecard, flow_wip_diagnostics, capitalized_rd_financials,
        executive_action_plan, ebitda_enhancement_annualized_usd, approved_by_cto_at
      ) VALUES ($1, $2, $3, 'Q4-2026', 'under_review', 78.4, 'predictable_growth', $4, $5, $6, $7, $8, 1845000, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(), userId,
        'Q4-2026 Technology Delivery Velocity, DORA Governance & Capitalized R&D Memorandum',
        JSON.stringify(execSummary), JSON.stringify(doraSection),
        JSON.stringify(flowSection), JSON.stringify(capexSection),
        JSON.stringify(actionSection)
      ]
    );
  }

  async getOverview(userId: string): Promise<ValueStreamStudioOverviewDTO> {
    await this.ensureSchema();

    const streamRows = await this.pool.query(
      `SELECT * FROM vsm_value_streams WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    if (streamRows.rows.length === 0) {
      await this.seedDefaultData(userId);
    }

    const valueStreams = (
      await this.pool.query(
        `SELECT * FROM vsm_value_streams WHERE user_id = $1 ORDER BY updated_at DESC`,
        [userId]
      )
    ).rows.map((r) => this.mapValueStreamRow(r));

    const streamNameMap = new Map<string, string>();
    valueStreams.forEach((vs) => streamNameMap.set(vs.id, vs.name));

    const okrLinkages = (
      await this.pool.query(
        `SELECT * FROM vsm_okr_alignments WHERE user_id = $1 ORDER BY created_at ASC`,
        [userId]
      )
    ).rows.map((r) => this.mapOkrRow(r, streamNameMap));

    const doraRows = await this.pool.query(
      `SELECT * FROM vsm_dora_snapshots WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const latestDoraSnapshot = doraRows.rows[0]
      ? this.mapDoraSnapshotRow(doraRows.rows[0])
      : {
          id: 'dora-fallback',
          valueStreamId: valueStreams[0]?.id || '',
          periodStart: '2026-09-24',
          periodEnd: '2026-10-24',
          deploymentFrequency: { value: 1.42, unit: 'deploys/day', tier: 'elite' as const, benchmarkTarget: '>= 1.0 deploy/day', normalizedScore: 88.5, historicalDeltaPercent: 18.2 },
          leadTimeForChanges: { value: 28.5, unit: 'hours', tier: 'high' as const, benchmarkTarget: '< 24 hours', normalizedScore: 76.2, historicalDeltaPercent: -14.5 },
          changeFailureRate: { value: 4.8, unit: 'percent', tier: 'elite' as const, benchmarkTarget: '< 5.0%', normalizedScore: 84.0, historicalDeltaPercent: -2.1 },
          failedDeploymentRecoveryTime: { value: 1.6, unit: 'hours', tier: 'high' as const, benchmarkTarget: '< 1.0 hour', normalizedScore: 78.0, historicalDeltaPercent: -25.0 },
          deliveryVelocityIndex: 82.35,
          doraStabilityIndex: 81.3,
          compositeDoraScore: 81.8,
          compositeTier: 'high' as const,
          createdAt: new Date().toISOString()
        };

    const flowRows = await this.pool.query(
      `SELECT * FROM vsm_flow_metrics WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const latestFlowSnapshot = flowRows.rows[0]
      ? this.mapFlowSnapshotRow(flowRows.rows[0])
      : {
          id: 'flow-fallback',
          valueStreamId: valueStreams[0]?.id || '',
          measurementCycle: 'Sprint 26.10',
          flowVelocityTotal: 48,
          flowLoadTotalWip: 28,
          recommendedMaxWip: 27,
          wipSaturationRatio: 1.04,
          contextSwitchingDragPercent: 7.2,
          utilizationRatePercent: 78.5,
          kingmanQueueWaitMultiplier: 1.35,
          breakdown: [],
          flowHealthScore: 82.5,
          flowHealthStatus: 'healthy_flow' as const,
          createdAt: new Date().toISOString()
        };

    const capitalizedProjects = (
      await this.pool.query(
        `SELECT * FROM vsm_capitalized_projects WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      )
    ).rows.map((r) => this.mapCapitalizedProjectRow(r));

    const investmentSizing = calculateRdInvestmentSizingSummary(capitalizedProjects);

    const memoRows = await this.pool.query(
      `SELECT * FROM vsm_board_memos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const latestBoardMemo = memoRows.rows[0] ? this.mapBoardMemoRow(memoRows.rows[0]) : undefined;

    const totalHeadcount = valueStreams.reduce((acc, vs) => acc + vs.contributingHeadcount, 0);
    const strategicAlignmentIndex = calculateStrategicAlignmentIndex(
      okrsLinkagesScoreMap(okrLinkages)
    );

    const avgFlowEff =
      valueStreams.length > 0
        ? Number(
            (valueStreams.reduce((acc, vs) => acc + vs.flowEfficiencyPercent, 0) / valueStreams.length).toFixed(1)
          )
        : 24.2;

    const compositeHealth = calculateCompositeDeliveryHealthIndex(
      latestDoraSnapshot.compositeDoraScore,
      latestFlowSnapshot.flowHealthScore,
      strategicAlignmentIndex,
      investmentSizing.overallCapitalizationRatioPercent,
      investmentSizing.runAllocationPercent
    );

    return {
      compositeDeliveryHealthIndex: compositeHealth.deliveryHealthIndex,
      healthBand: compositeHealth.healthBand,
      activeValueStreamsCount: valueStreams.length,
      totalEngineeringHeadcount: totalHeadcount,
      strategicAlignmentIndex,
      overallDoraTier: latestDoraSnapshot.compositeTier,
      averageFlowEfficiencyPercent: avgFlowEff,
      totalCapitalizedLaborUsd: investmentSizing.totalCapitalizedLaborUsd,
      totalExpensedLaborUsd: investmentSizing.totalExpensedLaborUsd,
      ebitdaBenefitAnnualizedUsd: investmentSizing.ebitdaEnhancementUsd,
      valueStreams,
      okrLinkages,
      latestDoraSnapshot,
      latestFlowSnapshot,
      investmentSizing,
      capitalizedProjects,
      latestBoardMemo
    };
  }

  async listValueStreams(userId: string): Promise<ValueStreamDTO[]> {
    await this.ensureSchema();
    const rows = await this.pool.query(
      `SELECT * FROM vsm_value_streams WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    return rows.rows.map((r) => this.mapValueStreamRow(r));
  }

  async createValueStream(userId: string, input: ValueStreamMutationDTO): Promise<ValueStreamDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const stages = input.stages || [];
    const leadTimeMetrics = calculateValueStreamLeadTimeAndFlowEfficiency(stages);

    const res = await this.pool.query(
      `INSERT INTO vsm_value_streams (
        id, user_id, name, business_domain, executive_sponsor, contributing_headcount, stages,
        total_active_touch_hours, total_idle_wait_hours, value_stream_lead_time_hours,
        flow_efficiency_percent, flow_health_status, strategic_alignment_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 80.0)
      RETURNING *`,
      [
        id,
        userId,
        input.name,
        input.businessDomain,
        input.executiveSponsor,
        input.contributingHeadcount,
        JSON.stringify(stages),
        leadTimeMetrics.totalActiveTouchHours,
        leadTimeMetrics.totalIdleWaitHours,
        leadTimeMetrics.valueStreamLeadTimeHours,
        leadTimeMetrics.flowEfficiencyPercent,
        leadTimeMetrics.flowHealthStatus
      ]
    );

    return this.mapValueStreamRow(res.rows[0]);
  }

  async updateValueStream(
    userId: string,
    id: string,
    input: ValueStreamMutationDTO
  ): Promise<ValueStreamDTO | null> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      `SELECT * FROM vsm_value_streams WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (existing.rows.length === 0) return null;

    const stages = input.stages || this.parseJsonField(existing.rows[0].stages, []);
    const leadTimeMetrics = calculateValueStreamLeadTimeAndFlowEfficiency(stages);

    const res = await this.pool.query(
      `UPDATE vsm_value_streams
       SET name = $1, business_domain = $2, executive_sponsor = $3, contributing_headcount = $4,
           stages = $5, total_active_touch_hours = $6, total_idle_wait_hours = $7,
           value_stream_lead_time_hours = $8, flow_efficiency_percent = $9,
           flow_health_status = $10, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $11 AND id = $12
       RETURNING *`,
      [
        input.name,
        input.businessDomain,
        input.executiveSponsor,
        input.contributingHeadcount,
        JSON.stringify(stages),
        leadTimeMetrics.totalActiveTouchHours,
        leadTimeMetrics.totalIdleWaitHours,
        leadTimeMetrics.valueStreamLeadTimeHours,
        leadTimeMetrics.flowEfficiencyPercent,
        leadTimeMetrics.flowHealthStatus,
        userId,
        id
      ]
    );

    return this.mapValueStreamRow(res.rows[0]);
  }

  async deleteValueStream(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM vsm_value_streams WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listOkrs(userId: string): Promise<StrategicOkrLinkageDTO[]> {
    await this.ensureSchema();
    const streams = await this.listValueStreams(userId);
    const map = new Map<string, string>();
    streams.forEach((s) => map.set(s.id, s.name));

    const rows = await this.pool.query(
      `SELECT * FROM vsm_okr_alignments WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );
    return rows.rows.map((r) => this.mapOkrRow(r, map));
  }

  async createOkr(userId: string, input: StrategicOkrMutationDTO): Promise<StrategicOkrLinkageDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const share =
      input.totalCapacityPoints > 0
        ? Number(((input.allocatedCapacityPoints / input.totalCapacityPoints) * 100).toFixed(2))
        : 100;

    const weights = { tier_0_board: 1.2, tier_1_growth: 1.0, tier_2_enhancement: 0.8 };
    const weightedScore = Number((share * (weights[input.priorityTier] ?? 1.0)).toFixed(2));

    const res = await this.pool.query(
      `INSERT INTO vsm_okr_alignments (
        id, user_id, value_stream_id, strategic_theme, corporate_objective, team_key_result,
        priority_tier, allocated_capacity_points, total_capacity_points, capacity_share_percent,
        alignment_weighted_score, target_quarter, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        userId,
        input.valueStreamId,
        input.strategicTheme,
        input.corporateObjective,
        input.teamKeyResult,
        input.priorityTier,
        input.allocatedCapacityPoints,
        input.totalCapacityPoints,
        share,
        weightedScore,
        input.targetQuarter,
        input.status
      ]
    );

    const streams = await this.listValueStreams(userId);
    const map = new Map<string, string>();
    streams.forEach((s) => map.set(s.id, s.name));
    return this.mapOkrRow(res.rows[0], map);
  }

  async deleteOkr(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM vsm_okr_alignments WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async calculateDora(
    userId: string,
    req: DoraCalculateRequestDTO
  ): Promise<DoraMetricsSnapshotDTO> {
    await this.ensureSchema();
    const calculated = calculateDoraMetricsSnapshot(req);
    const id = crypto.randomUUID();

    const res = await this.pool.query(
      `INSERT INTO vsm_dora_snapshots (
        id, user_id, value_stream_id, period_start, period_end, deployment_frequency,
        lead_time_for_changes, change_failure_rate, failed_deployment_recovery_time,
        delivery_velocity_index, dora_stability_index, composite_dora_score, composite_tier
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        userId,
        req.valueStreamId,
        calculated.periodStart,
        calculated.periodEnd,
        JSON.stringify(calculated.deploymentFrequency),
        JSON.stringify(calculated.leadTimeForChanges),
        JSON.stringify(calculated.changeFailureRate),
        JSON.stringify(calculated.failedDeploymentRecoveryTime),
        calculated.deliveryVelocityIndex,
        calculated.doraStabilityIndex,
        calculated.compositeDoraScore,
        calculated.compositeTier
      ]
    );

    return this.mapDoraSnapshotRow(res.rows[0]);
  }

  async simulateFlow(
    userId: string,
    req: FlowSimulationRequestDTO
  ): Promise<FlowMetricsSnapshotDTO> {
    await this.ensureSchema();
    const calculated = calculateFlowMetricsSnapshot(req);
    const id = crypto.randomUUID();

    const res = await this.pool.query(
      `INSERT INTO vsm_flow_metrics (
        id, user_id, value_stream_id, measurement_cycle, flow_velocity_total, flow_load_total_wip,
        recommended_max_wip, wip_saturation_ratio, context_switching_drag_percent,
        utilization_rate_percent, kingman_queue_wait_multiplier, breakdown, flow_health_score, flow_health_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id,
        userId,
        req.valueStreamId,
        calculated.measurementCycle,
        calculated.flowVelocityTotal,
        calculated.flowLoadTotalWip,
        calculated.recommendedMaxWip,
        calculated.wipSaturationRatio,
        calculated.contextSwitchingDragPercent,
        calculated.utilizationRatePercent,
        calculated.kingmanQueueWaitMultiplier,
        JSON.stringify(calculated.breakdown),
        calculated.flowHealthScore,
        calculated.flowHealthStatus
      ]
    );

    return this.mapFlowSnapshotRow(res.rows[0]);
  }

  async listCapitalizedProjects(userId: string): Promise<CapitalizedProjectLaborDTO[]> {
    await this.ensureSchema();
    const rows = await this.pool.query(
      `SELECT * FROM vsm_capitalized_projects WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows.rows.map((r) => this.mapCapitalizedProjectRow(r));
  }

  async createCapitalizedProject(
    userId: string,
    input: CapitalizedProjectMutationDTO
  ): Promise<CapitalizedProjectLaborDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const calc = calculateCapitalizedProjectLabor(input);

    const res = await this.pool.query(
      `INSERT INTO vsm_capitalized_projects (
        id, user_id, value_stream_id, project_name, investment_category, development_stage,
        qualifying_labor_hours, non_qualifying_labor_hours, blended_burdened_hourly_rate,
        capitalized_labor_cost_usd, expensed_labor_cost_usd, capitalization_ratio_percent,
        annualized_attributable_arr_usd, estimated_useful_life_months, monthly_amortization_usd,
        projected_roi_percent, audit_documentation_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        id,
        userId,
        input.valueStreamId,
        calc.projectName,
        calc.investmentCategory,
        calc.developmentStage,
        calc.qualifyingLaborHours,
        calc.nonQualifyingLaborHours,
        calc.blendedBurdenedHourlyRate,
        calc.capitalizedLaborCostUsd,
        calc.expensedLaborCostUsd,
        calc.capitalizationRatioPercent,
        calc.annualizedAttributableArrUsd,
        calc.estimatedUsefulLifeMonths,
        calc.monthlyAmortizationUsd,
        calc.projectedRoiPercent,
        calc.auditDocumentationRef
      ]
    );

    return this.mapCapitalizedProjectRow(res.rows[0]);
  }

  async deleteCapitalizedProject(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM vsm_capitalized_projects WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async generateBoardMemo(
    userId: string,
    req: BoardMemorandumGenerateRequestDTO
  ): Promise<BoardMemorandumDTO> {
    await this.ensureSchema();
    const overview = await this.getOverview(userId);
    const id = crypto.randomUUID();

    const execSummary = {
      sectionKey: 'exec_summary',
      heading: '1. Executive Summary & Strategic Rationale',
      executiveSummaryText: `During ${req.fiscalQuarter}, the technology organization maintained predictable delivery momentum across ${overview.activeValueStreamsCount} primary value streams. Contributing engineering headcount stands at ${overview.totalEngineeringHeadcount} full-time engineers. Strategic alignment reached ${overview.strategicAlignmentIndex}%.`,
      keyMetricsBulletPoints: [
        `Composite Delivery Health Index: ${overview.compositeDeliveryHealthIndex} / 100 (${overview.healthBand.replace(/_/g, ' ').toUpperCase()})`,
        `Strategic OKR Capacity Alignment: ${overview.strategicAlignmentIndex}% mapped to corporate OKRs`,
        `Average Value Stream Flow Efficiency: ${overview.averageFlowEfficiencyPercent}%`
      ],
      strategicGuidance: req.strategicNotes || 'Recommend continuous investment in pipeline automation to eliminate idle wait times across review stages.'
    };

    const doraSection = {
      sectionKey: 'dora_scorecard',
      heading: '2. Quantitative DORA Benchmark Performance & Reliability Scorecard',
      executiveSummaryText: `The engineering organization achieved a ${overview.overallDoraTier.toUpperCase()} DORA composite tier (Score: ${overview.latestDoraSnapshot.compositeDoraScore}/100). Deployment Frequency reached ${overview.latestDoraSnapshot.deploymentFrequency.value} deploys per day (${overview.latestDoraSnapshot.deploymentFrequency.tier.toUpperCase()}).`,
      keyMetricsBulletPoints: [
        `Deployment Frequency: ${overview.latestDoraSnapshot.deploymentFrequency.value} ${overview.latestDoraSnapshot.deploymentFrequency.unit} (${overview.latestDoraSnapshot.deploymentFrequency.tier.toUpperCase()})`,
        `Lead Time for Changes: ${overview.latestDoraSnapshot.leadTimeForChanges.value} ${overview.latestDoraSnapshot.leadTimeForChanges.unit} (${overview.latestDoraSnapshot.leadTimeForChanges.tier.toUpperCase()})`,
        `Change Failure Rate: ${overview.latestDoraSnapshot.changeFailureRate.value}% (${overview.latestDoraSnapshot.changeFailureRate.tier.toUpperCase()})`,
        `Failed Deployment Recovery Time: ${overview.latestDoraSnapshot.failedDeploymentRecoveryTime.value} ${overview.latestDoraSnapshot.failedDeploymentRecoveryTime.unit} (${overview.latestDoraSnapshot.failedDeploymentRecoveryTime.tier.toUpperCase()})`,
        `DORA Stability Index: ${overview.latestDoraSnapshot.doraStabilityIndex} / 100`
      ],
      strategicGuidance: 'Maintain automated rollback pipelines to compress recovery time below 1 hour.'
    };

    const flowSection = {
      sectionKey: 'flow_wip',
      heading: '3. Flow Framework Efficiency & WIP Bottleneck Diagnostics',
      executiveSummaryText: `Completed Flow Velocity reached ${overview.latestFlowSnapshot.flowVelocityTotal} units with WIP Saturation Ratio governed at ${overview.latestFlowSnapshot.wipSaturationRatio}x against a recommended ceiling of ${overview.latestFlowSnapshot.recommendedMaxWip} items.`,
      keyMetricsBulletPoints: [
        `Total Completed Flow Velocity: ${overview.latestFlowSnapshot.flowVelocityTotal} items/cycle`,
        `WIP Saturation Ratio: ${overview.latestFlowSnapshot.wipSaturationRatio}x`,
        `Context Switching Drag: ${overview.latestFlowSnapshot.contextSwitchingDragPercent}%`,
        `Kingman Queue Wait Multiplier: ${overview.latestFlowSnapshot.kingmanQueueWaitMultiplier}x`
      ],
      strategicGuidance: 'Enforce squad WIP limits to prevent multitasking fragmentation.'
    };

    const capexSection = {
      sectionKey: 'capitalized_rd',
      heading: '4. ASC 350-40 Capitalized R&D Financial Sizing & EBITDA Impact',
      executiveSummaryText: `Under US GAAP ASC 350-40, $${(overview.totalCapitalizedLaborUsd / 1000000).toFixed(2)}M in qualifying labor was capitalized (Capitalization Ratio: ${overview.investmentSizing.overallCapitalizationRatioPercent}%), delivering an EBITDA enhancement of $${(overview.ebitdaBenefitAnnualizedUsd / 1000000).toFixed(2)}M.`,
      keyMetricsBulletPoints: [
        `Total Capitalized Software Labor (CapEx): $${overview.totalCapitalizedLaborUsd.toLocaleString()}`,
        `Total Expensed Operational Labor (OpEx): $${overview.totalExpensedLaborUsd.toLocaleString()}`,
        `Overall Capitalization Ratio: ${overview.investmentSizing.overallCapitalizationRatioPercent}%`,
        `Annualized EBITDA Enhancement: $${overview.ebitdaBenefitAnnualizedUsd.toLocaleString()}`,
        `Investment Sizing: ${overview.investmentSizing.runAllocationPercent}% Run / ${overview.investmentSizing.growAllocationPercent}% Grow / ${overview.investmentSizing.transformAllocationPercent}% Transform`
      ],
      strategicGuidance: 'Maintain auditable issue tickets in Jira to support external audit compliance.'
    };

    const actionSection = {
      sectionKey: 'action_plan',
      heading: '5. Engineering Leadership Action Plan & Strategic OKR Allocation',
      executiveSummaryText: 'Targeted actions for the upcoming cycle include continuous delivery lead time compression, expanding test automation, and audit-ready time allocation.',
      keyMetricsBulletPoints: [
        'Action Item 1: Automate QA staging environments to compress cycle times',
        'Action Item 2: Target sub-1 hour MTTR on all Tier 1 services',
        'Action Item 3: Submit ASC 350-40 capitalization schedules for Board Audit Committee signoff'
      ],
      strategicGuidance: 'Board Audit Committee approval is formally recommended.'
    };

    const res = await this.pool.query(
      `INSERT INTO vsm_board_memos (
        id, user_id, title, fiscal_quarter, status, delivery_health_index, health_band,
        executive_summary, dora_scorecard, flow_wip_diagnostics, capitalized_rd_financials,
        executive_action_plan, ebitda_enhancement_annualized_usd
      ) VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id,
        userId,
        req.title,
        req.fiscalQuarter,
        overview.compositeDeliveryHealthIndex,
        overview.healthBand,
        JSON.stringify(execSummary),
        JSON.stringify(doraSection),
        JSON.stringify(flowSection),
        JSON.stringify(capexSection),
        JSON.stringify(actionSection),
        overview.ebitdaBenefitAnnualizedUsd
      ]
    );

    return this.mapBoardMemoRow(res.rows[0]);
  }

  async approveBoardMemo(
    userId: string,
    id: string,
    role: 'cto' | 'cfo'
  ): Promise<BoardMemorandumDTO | null> {
    await this.ensureSchema();
    const query =
      role === 'cto'
        ? `UPDATE vsm_board_memos
           SET approved_by_cto_at = CURRENT_TIMESTAMP, status = 'under_review', updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND id = $2
           RETURNING *`
        : `UPDATE vsm_board_memos
           SET approved_by_cfo_at = CURRENT_TIMESTAMP, status = 'board_approved', updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1 AND id = $2
           RETURNING *`;

    const res = await this.pool.query(query, [userId, id]);
    if (res.rows.length === 0) return null;
    return this.mapBoardMemoRow(res.rows[0]);
  }
}

function okrsLinkagesScoreMap(
  okrs: StrategicOkrLinkageDTO[]
): Array<{ allocatedCapacityPoints: number; priorityTier: StrategicOkrLinkageDTO['priorityTier'] }> {
  return okrs.map((o) => ({
    allocatedCapacityPoints: o.allocatedCapacityPoints,
    priorityTier: o.priorityTier
  }));
}
