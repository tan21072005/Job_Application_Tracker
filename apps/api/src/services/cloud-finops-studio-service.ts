import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CloudProvider,
  type TenantTier,
  type CommitmentType,
  type CommitmentPaymentOption,
  type CommitmentTermMonths,
  type WasteAssetType,
  type WasteRemediationStatus,
  type K8sWorkloadType,
  type CfoMemoStatus,
  type TenantCostAllocationDTO,
  type TenantCostAllocationMutationDTO,
  type CloudCostAllocationOverviewDTO,
  type CommitmentPortfolioItemDTO,
  type CommitmentMutationDTO,
  type CommitmentNpvScenarioDTO,
  type CommitmentExpirationCliffDTO,
  type CommitmentOptimizerOverviewDTO,
  type CommitmentPurchaseSimulationDTO,
  type CloudCostAnomalyDTO,
  type IdleWasteItemDTO,
  type IdleWasteRemediationMutationDTO,
  type CarbonFootprintSummaryDTO,
  type WasteEliminationOverviewDTO,
  type AnomalyDetectionRequestDTO,
  type KubernetesWorkloadRightsizingDTO,
  type GravitonArmMigrationRoiDTO,
  type ArchitectureArbitrageOverviewDTO,
  type KubernetesRightsizingSimulationDTO,
  type FinOpsFoundationMaturityDTO,
  type FinOpsEfficiencyScoreBreakdownDTO,
  type CfoMemorandumDTO,
  type CfoMemorandumGenerateRequestDTO,
  type CloudFinopsStudioOverviewDTO,
  classifyFinOpsEfficiencyBand,
  classifyFinOpsMaturityStage,
  calculateCostPerTenantMetrics,
  calculateCommitmentNpv,
  detectCostAnomaly,
  calculateCarbonFootprint,
  calculateK8sRightsizing,
  calculateGravitonMigrationRoi,
  calculateCompositeFinOpsScore
} from '@jobtrack/contract';

export class CloudFinopsStudioService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS finops_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_name VARCHAR(255) NOT NULL,
        default_fiscal_quarter VARCHAR(32) NOT NULL DEFAULT 'Q4-2026',
        target_commitment_coverage NUMERIC(5, 2) NOT NULL DEFAULT 80.0,
        wacc_discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 8.5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_finops_studios_user ON finops_studios(user_id);

      CREATE TABLE IF NOT EXISTS finops_cloud_accounts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_identifier VARCHAR(128) NOT NULL,
        monthly_budget_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        current_month_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_accounts_user ON finops_cloud_accounts(user_id, provider);

      CREATE TABLE IF NOT EXISTS finops_tenant_allocations (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_name VARCHAR(255) NOT NULL,
        tenant_tier VARCHAR(64) NOT NULL DEFAULT 'enterprise',
        monthly_revenue_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        direct_compute_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        direct_storage_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        allocated_shared_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        total_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        gross_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        monthly_transactions_count INT NOT NULL DEFAULT 0,
        cost_per_transaction_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
        tagging_compliance_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_allocations_user ON finops_tenant_allocations(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS finops_commitments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        commitment_type VARCHAR(64) NOT NULL,
        instance_family VARCHAR(128) NOT NULL,
        term_months INT NOT NULL DEFAULT 12,
        payment_option VARCHAR(64) NOT NULL DEFAULT 'no_upfront',
        committed_hourly_spend_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
        monthly_committed_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        on_demand_equivalent_monthly_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        monthly_savings_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        utilization_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
        coverage_ratio_percent NUMERIC(5, 2) NOT NULL DEFAULT 80,
        expiration_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_commitments_user ON finops_commitments(user_id, expiration_date ASC);

      CREATE TABLE IF NOT EXISTS finops_anomalies (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        service_affected VARCHAR(255) NOT NULL,
        detected_date DATE NOT NULL,
        actual_daily_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        baseline_mean_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        std_dev_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        z_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        excess_spend_daily_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        severity VARCHAR(32) NOT NULL DEFAULT 'high',
        probable_root_cause TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_anomalies_user ON finops_anomalies(user_id, detected_date DESC);

      CREATE TABLE IF NOT EXISTS finops_idle_assets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        asset_type VARCHAR(64) NOT NULL,
        resource_identifier VARCHAR(255) NOT NULL,
        region VARCHAR(64) NOT NULL DEFAULT 'us-east-1',
        monthly_waste_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        idle_duration_days INT NOT NULL DEFAULT 14,
        carbon_footprint_kg_co2e NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'detected',
        remediation_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_idle_assets_user ON finops_idle_assets(user_id, status);

      CREATE TABLE IF NOT EXISTS finops_k8s_workloads (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cluster_name VARCHAR(128) NOT NULL,
        namespace_name VARCHAR(128) NOT NULL,
        workload_name VARCHAR(255) NOT NULL,
        workload_type VARCHAR(64) NOT NULL DEFAULT 'deployment',
        replicas_count INT NOT NULL DEFAULT 3,
        requested_cpu_cores NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
        actual_p95_cpu_cores NUMERIC(6, 2) NOT NULL DEFAULT 0.25,
        recommended_cpu_cores NUMERIC(6, 2) NOT NULL DEFAULT 0.35,
        requested_memory_gib NUMERIC(6, 2) NOT NULL DEFAULT 2.0,
        actual_p95_memory_gib NUMERIC(6, 2) NOT NULL DEFAULT 0.75,
        recommended_memory_gib NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
        current_monthly_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        rightsized_monthly_cost_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        monthly_savings_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        sizing_slack_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        is_eligible_for_spot BOOLEAN NOT NULL DEFAULT false,
        spot_savings_monthly_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_k8s_user ON finops_k8s_workloads(user_id, cluster_name);

      CREATE TABLE IF NOT EXISTS finops_cfo_memos (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        fiscal_quarter VARCHAR(32) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        composite_finops_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
        efficiency_band VARCHAR(64) NOT NULL DEFAULT 'disciplined_efficient',
        monthly_cloud_spend_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        annualized_realized_savings_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        unlocked_pipeline_savings_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        cloud_gross_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
        executive_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
        unit_economics_scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
        commitment_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
        waste_anomaly_governance JSONB NOT NULL DEFAULT '{}'::jsonb,
        k8s_arbitrage JSONB NOT NULL DEFAULT '{}'::jsonb,
        cfo_directives_action_plan JSONB NOT NULL DEFAULT '{}'::jsonb,
        approved_by_vp_infra_at TIMESTAMPTZ,
        approved_by_cto_at TIMESTAMPTZ,
        approved_by_cfo_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_finops_memos_user ON finops_cfo_memos(user_id, fiscal_quarter DESC);
    `);
  }

  async ensureDefaults(userId: string): Promise<void> {
    await this.ensureSchema();

    const studioRes = await this.pool.query(
      'SELECT id FROM finops_studios WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (studioRes.rows.length === 0) {
      const studioId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO finops_studios (id, user_id, enterprise_name, default_fiscal_quarter, target_commitment_coverage, wacc_discount_rate)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [studioId, userId, 'JobTrack Global Enterprise Infrastructure', 'Q4-2026', 80.0, 8.5]
      );

      const accounts = [
        [crypto.randomUUID(), userId, 'aws', 'AWS Production Cluster (US-East)', 'aws-prod-109283', 30000.0, 28450.0],
        [crypto.randomUUID(), userId, 'gcp', 'GCP Data Lake & BigQuery', 'gcp-analytics-4401', 15000.0, 12300.0],
        [crypto.randomUUID(), userId, 'snowflake', 'Snowflake Enterprise DW', 'snow-org-prod-99', 10000.0, 8200.0],
        [crypto.randomUUID(), userId, 'datadog', 'Datadog APM & Logs', 'dd-sub-8812', 6000.0, 4850.0]
      ];
      for (const acc of accounts) {
        await this.pool.query(
          `INSERT INTO finops_cloud_accounts (id, user_id, provider, account_name, account_identifier, monthly_budget_usd, current_month_spend_usd)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          acc
        );
      }

      const allocations = [
        [crypto.randomUUID(), userId, 'Stripe Global Payments Corp', 'enterprise', 45000.0, 2400.0, 600.0, 800.0, 3800.0, 91.56, 120000, 0.0317, 100.0],
        [crypto.randomUUID(), userId, 'Figma Cloud Design Systems', 'enterprise', 32000.0, 1800.0, 500.0, 600.0, 2900.0, 90.94, 85000, 0.0341, 98.0],
        [crypto.randomUUID(), userId, 'Vercel Edge Next Corp', 'mid_market', 18000.0, 1200.0, 300.0, 400.0, 1900.0, 89.44, 45000, 0.0422, 95.0],
        [crypto.randomUUID(), userId, 'Techstars Seed Cohort 2026', 'smb', 6500.0, 600.0, 150.0, 200.0, 950.0, 85.38, 12000, 0.0792, 88.0]
      ];
      for (const alloc of allocations) {
        await this.pool.query(
          `INSERT INTO finops_tenant_allocations (
            id, user_id, tenant_name, tenant_tier, monthly_revenue_usd,
            direct_compute_cost_usd, direct_storage_cost_usd, allocated_shared_cost_usd,
            total_cost_usd, gross_margin_percent, monthly_transactions_count, cost_per_transaction_usd,
            tagging_compliance_percent
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          alloc
        );
      }

      const commitments = [
        [crypto.randomUUID(), userId, 'aws', 'Amazon EC2 / Fargate', 'savings_plan_compute', 'All Compute Families', 36, 'partial_upfront', 18.5, 13320.0, 19500.0, 6180.0, 97.4, 82.5, '2028-06-30'],
        [crypto.randomUUID(), userId, 'aws', 'Amazon RDS Aurora PostgreSQL', 'reserved_instance_standard', 'db.r6g.2xlarge', 12, 'no_upfront', 8.2, 5904.0, 8400.0, 2496.0, 95.8, 78.0, '2026-12-15'],
        [crypto.randomUUID(), userId, 'gcp', 'Google Compute Engine CUD', 'cud_gcp', 'n2-standard-16', 36, 'no_upfront', 6.0, 4320.0, 6500.0, 2180.0, 94.2, 75.0, '2027-09-30']
      ];
      for (const com of commitments) {
        await this.pool.query(
          `INSERT INTO finops_commitments (
            id, user_id, provider, service_name, commitment_type, instance_family,
            term_months, payment_option, committed_hourly_spend_usd, monthly_committed_spend_usd,
            on_demand_equivalent_monthly_usd, monthly_savings_usd, utilization_rate_percent,
            coverage_ratio_percent, expiration_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          com
        );
      }

      const anomalies = [
        [crypto.randomUUID(), userId, 'aws', 'Amazon CloudFront & Data Egress', '2026-10-22', 1420.0, 450.0, 95.0, 10.21, 970.0, 'critical', 'Runaway crawler bot scraping PDF assets without rate limit', 'investigating'],
        [crypto.randomUUID(), userId, 'gcp', 'BigQuery On-Demand Query Slot Spikes', '2026-10-20', 890.0, 280.0, 65.0, 9.38, 610.0, 'high', 'Unpartitioned full scan on historical event logs table', 'resolved']
      ];
      for (const anom of anomalies) {
        await this.pool.query(
          `INSERT INTO finops_anomalies (
            id, user_id, provider, service_affected, detected_date,
            actual_daily_spend_usd, baseline_mean_usd, std_dev_usd, z_score,
            excess_spend_daily_usd, severity, probable_root_cause, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          anom
        );
      }

      const idleAssets = [
        [crypto.randomUUID(), userId, 'aws', 'unattached_ebs_volume', 'vol-091823abce1287', 'us-east-1', 480.0, 24, 185.0, 'detected', 'Orphaned from deleted staging EKS node group'],
        [crypto.randomUUID(), userId, 'aws', 'idle_load_balancer', 'alb-internal-legacy-auth', 'us-east-1', 280.0, 35, 95.0, 'in_review', 'Deprecated auth gateway replaced by Envoy edge mesh'],
        [crypto.randomUUID(), userId, 'gcp', 'unmounted_persistent_disk', 'disk-analytics-worker-temp', 'us-central1', 340.0, 18, 140.0, 'detected', 'Leftover batch data processing scratch disk']
      ];
      for (const asset of idleAssets) {
        await this.pool.query(
          `INSERT INTO finops_idle_assets (
            id, user_id, provider, asset_type, resource_identifier, region,
            monthly_waste_cost_usd, idle_duration_days, carbon_footprint_kg_co2e, status, remediation_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          asset
        );
      }

      const k8sWorkloads = [
        [crypto.randomUUID(), userId, 'prod-useast-eks-01', 'core-api', 'job-matching-engine', 'deployment', 6, 4.0, 1.2, 1.44, 8.0, 2.5, 3.0, 2400.0, 980.0, 1420.0, 59.2, false, 0.0],
        [crypto.randomUUID(), userId, 'prod-useast-eks-01', 'workers', 'resume-ocr-pipeline', 'deployment', 8, 2.0, 0.6, 0.72, 4.0, 1.8, 2.16, 1800.0, 780.0, 1020.0, 56.7, true, 420.0],
        [crypto.randomUUID(), userId, 'prod-useast-eks-01', 'ingress', 'webhook-event-router', 'deployment', 4, 1.0, 0.25, 0.3, 2.0, 0.6, 0.72, 650.0, 210.0, 440.0, 67.7, false, 0.0]
      ];
      for (const k of k8sWorkloads) {
        await this.pool.query(
          `INSERT INTO finops_k8s_workloads (
            id, user_id, cluster_name, namespace_name, workload_name, workload_type,
            replicas_count, requested_cpu_cores, actual_p95_cpu_cores, recommended_cpu_cores,
            requested_memory_gib, actual_p95_memory_gib, recommended_memory_gib,
            current_monthly_cost_usd, rightsized_monthly_cost_usd, monthly_savings_usd,
            sizing_slack_percent, is_eligible_for_spot, spot_savings_monthly_usd
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          k
        );
      }

      const memoId = crypto.randomUUID();
      const memo = {
        executive_summary: {
          sectionKey: 'exec',
          heading: '1. Executive Summary & Strategic Rationale',
          executiveSummaryText: 'Maintained 84.6% cloud gross margin while scaling active workloads across AWS and GCP.',
          keyMetricsBulletPoints: ['Run-Rate: $53,800/mo', 'FES: 84.5 / 100', 'Commitment Coverage: 81.2%'],
          strategicGuidance: 'Authorize 3-year Compute Savings Plan to hedge Q1-2027 compute expansion.'
        },
        unit_economics_scorecard: {
          sectionKey: 'unit',
          heading: '2. Unit Economics & Cost Allocation Scorecard',
          executiveSummaryText: 'Average cost per enterprise tenant stands at $480/month with 94.2% tagging compliance.',
          keyMetricsBulletPoints: ['Average Cost per Tenant: $480', 'Tagging Compliance: 94.2%', 'Cost per Tx: $0.034'],
          strategicGuidance: 'Enforce mandatory billing tags on all staging Kubernetes namespaces.'
        },
        commitment_strategy: {
          sectionKey: 'commit',
          heading: '3. Commitment Portfolio & Hedging Strategy',
          executiveSummaryText: 'Commitment coverage reached 81.2% with 96.4% utilization rate.',
          keyMetricsBulletPoints: ['Coverage: 81.2%', 'Annualized Savings: $142,000', 'At-Risk Cliff: $2,496/mo'],
          strategicGuidance: 'Renew expiring RDS Standard RIs prior to December 15.'
        },
        waste_anomaly_governance: {
          sectionKey: 'waste',
          heading: '4. Idle Waste Elimination & Anomaly Diagnostics',
          executiveSummaryText: 'Identified $4,320/month in idle assets and 1,450 kg CO2e emissions.',
          keyMetricsBulletPoints: ['Waste Discovered: $4,320/mo', 'Carbon Avoidance: 1,450 kg CO2e'],
          strategicGuidance: 'Schedule weekly automated janitor cron for orphaned persistent disks.'
        },
        k8s_arbitrage: {
          sectionKey: 'k8s',
          heading: '5. Kubernetes Workload Rightsizing & Graviton Arbitrage',
          executiveSummaryText: 'Right-sizing CPU/Memory allocations yields $2,880/month immediate savings.',
          keyMetricsBulletPoints: ['Rightsizing Savings: $2,880/mo', 'Graviton Payback: 3.2 months'],
          strategicGuidance: 'Migrate stateless API worker node pools to c7g Graviton instances.'
        },
        cfo_directives_action_plan: {
          sectionKey: 'directives',
          heading: '6. Board Audit Committee & CFO Directives',
          executiveSummaryText: 'Formal approval recommended for 3-year commitment tranche and Graviton transition.',
          keyMetricsBulletPoints: ['Directive 1: Authorize $45k upfront capital', 'Directive 2: Target 88.0 FES score'],
          strategicGuidance: 'Schedule formal review with Chief Financial Officer.'
        }
      };

      await this.pool.query(
        `INSERT INTO finops_cfo_memos (
          id, user_id, title, fiscal_quarter, status, composite_finops_score,
          efficiency_band, monthly_cloud_spend_usd, annualized_realized_savings_usd,
          unlocked_pipeline_savings_usd, cloud_gross_margin_percent, executive_summary,
          unit_economics_scorecard, commitment_strategy, waste_anomaly_governance,
          k8s_arbitrage, cfo_directives_action_plan
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          memoId,
          userId,
          'Q4-2026 Executive Cloud FinOps & Infrastructure Governance Memorandum',
          'Q4-2026',
          'draft',
          84.5,
          'disciplined_efficient',
          53800.0,
          142000.0,
          98000.0,
          84.6,
          JSON.stringify(memo.executive_summary),
          JSON.stringify(memo.unit_economics_scorecard),
          JSON.stringify(memo.commitment_strategy),
          JSON.stringify(memo.waste_anomaly_governance),
          JSON.stringify(memo.k8s_arbitrage),
          JSON.stringify(memo.cfo_directives_action_plan)
        ]
      );
    }
  }

  async getOverview(userId: string): Promise<CloudFinopsStudioOverviewDTO> {
    await this.ensureDefaults(userId);

    const allocs = await this.listAllocations(userId);
    const commits = await this.listCommitments(userId);
    const anomalies = await this.listAnomalies(userId);
    const idleAssets = await this.listIdleAssets(userId);
    const k8sWorkloads = await this.listK8sWorkloads(userId);
    const memos = await this.listCfoMemos(userId);

    const totalMonthlySpend = 53800.0;
    const blendedGrossMargin =
      allocs.length > 0
        ? Number((allocs.reduce((acc, a) => acc + a.grossMarginPercent, 0) / allocs.length).toFixed(1))
        : 84.6;

    const commitmentCoverage =
      commits.length > 0
        ? Number((commits.reduce((acc, c) => acc + c.coverageRatioPercent, 0) / commits.length).toFixed(1))
        : 81.2;

    const commitmentUtilization =
      commits.length > 0
        ? Number((commits.reduce((acc, c) => acc + c.utilizationRatePercent, 0) / commits.length).toFixed(1))
        : 96.4;

    const monthlyWaste = idleAssets
      .filter((a) => a.status === 'detected')
      .reduce((acc, a) => acc + a.monthlyWasteCostUsd, 0);

    const annualizedRealizedSavings = Number(
      (commits.reduce((acc, c) => acc + c.monthlySavingsUsd, 0) * 12).toFixed(2)
    );

    const annualizedPipelineSavings = Number(
      (k8sWorkloads.reduce((acc, k) => acc + k.monthlySavingsUsd, 0) * 12 + monthlyWaste * 12).toFixed(2)
    );

    const carbonSummary = calculateCarbonFootprint(75000, 15000);

    const npvScenarios: CommitmentNpvScenarioDTO[] = [
      calculateCommitmentNpv(25000, 8.5, 36, 'all_upfront', 38),
      calculateCommitmentNpv(25000, 8.5, 36, 'partial_upfront', 32),
      calculateCommitmentNpv(25000, 8.5, 12, 'no_upfront', 22)
    ];

    const expirationCliffs: CommitmentExpirationCliffDTO[] = [
      {
        cliffWindowDays: 30,
        expiringCommitmentsCount: 1,
        atRiskMonthlySavingsUsd: 2496.0,
        unhedgedRunRateSpikeMonthlyUsd: 3200.0,
        recommendedAction: 'Execute 1-year RDS Aurora Standard RI renewal before December 15.'
      },
      {
        cliffWindowDays: 60,
        expiringCommitmentsCount: 0,
        atRiskMonthlySavingsUsd: 0,
        unhedgedRunRateSpikeMonthlyUsd: 0,
        recommendedAction: 'No commitments expiring in 60-day window.'
      },
      {
        cliffWindowDays: 90,
        expiringCommitmentsCount: 0,
        atRiskMonthlySavingsUsd: 0,
        unhedgedRunRateSpikeMonthlyUsd: 0,
        recommendedAction: 'No commitments expiring in 90-day window.'
      }
    ];

    const gravitonRoadmap: GravitonArmMigrationRoiDTO[] = [
      calculateGravitonMigrationRoi(4800, 45, 125, 20, 18),
      calculateGravitonMigrationRoi(3200, 30, 125, 20, 15)
    ];

    const taggingCompliance =
      allocs.length > 0
        ? Number((allocs.reduce((acc, a) => acc + a.taggingCompliancePercent, 0) / allocs.length).toFixed(1))
        : 95.0;

    const scoreBreakdown = calculateCompositeFinOpsScore({
      taggingCompliancePercent: taggingCompliance,
      commitmentCoveragePercent: commitmentCoverage,
      commitmentUtilizationPercent: commitmentUtilization,
      wasteRemediationRatioPercent: 85.0,
      k8sSlackRemediationPercent: 78.0,
      carbonEfficiencyScore: 82.0
    });

    const maturityAssessment: FinOpsFoundationMaturityDTO = {
      overallStage: classifyFinOpsMaturityStage(scoreBreakdown.compositeScore),
      costVisibilityScore: 92.0,
      unitEconomicsScore: 86.0,
      commitmentGovernanceScore: commitmentCoverage,
      automationRightsizingScore: 76.0,
      sustainabilityScore: 80.0
    };

    const spendByProvider: Record<CloudProvider, number> = {
      aws: 28450.0,
      gcp: 12300.0,
      snowflake: 8200.0,
      datadog: 4850.0,
      azure: 0
    };

    return {
      compositeScore: scoreBreakdown.compositeScore,
      efficiencyBand: scoreBreakdown.efficiencyBand,
      maturityStage: maturityAssessment.overallStage,
      totalMonthlySpendUsd: totalMonthlySpend,
      blendedGrossMarginPercent: blendedGrossMargin,
      commitmentCoveragePercent: commitmentCoverage,
      commitmentUtilizationPercent: commitmentUtilization,
      identifiedMonthlyWasteUsd: monthlyWaste,
      annualizedRealizedSavingsUsd: annualizedRealizedSavings,
      annualizedPipelineSavingsUsd: annualizedPipelineSavings,
      totalMonthlyCarbonKgCo2e: carbonSummary.totalMonthlyCloudCarbonKgCo2e,
      allocationOverview: {
        totalMonthlySpendUsd: totalMonthlySpend,
        blendedGrossMarginPercent: blendedGrossMargin,
        averageCostPerTenantUsd:
          allocs.length > 0
            ? Number((allocs.reduce((acc, a) => acc + a.totalCostPerTenantUsd, 0) / allocs.length).toFixed(2))
            : 0,
        averageCostPerTransactionUsd:
          allocs.length > 0
            ? Number((allocs.reduce((acc, a) => acc + a.costPerTransactionUsd, 0) / allocs.length).toFixed(4))
            : 0,
        overallTaggingCompliancePercent: taggingCompliance,
        spendByProvider,
        allocations: allocs
      },
      commitmentOverview: {
        overallCoverageRatioPercent: commitmentCoverage,
        overallUtilizationRatePercent: commitmentUtilization,
        annualizedRealizedSavingsUsd: annualizedRealizedSavings,
        potentialAdditionalSavingsUsd: 48000.0,
        portfolio: commits,
        npvScenarios,
        expirationCliffs
      },
      wasteOverview: {
        activeAnomaliesCount: anomalies.filter((a) => a.status === 'active').length,
        monthlyAnomalyExcessSpendUsd: Number(
          (anomalies.filter((a) => a.status === 'active').reduce((acc, a) => acc + a.excessSpendDailyUsd, 0) * 30).toFixed(2)
        ),
        idleAssetsCount: idleAssets.length,
        monthlyIdleWasteTotalUsd: Number(
          idleAssets.reduce((acc, a) => acc + a.monthlyWasteCostUsd, 0).toFixed(2)
        ),
        remediatedSavingsMonthlyUsd: Number(
          idleAssets.filter((a) => a.status === 'remediated').reduce((acc, a) => acc + a.monthlyWasteCostUsd, 0).toFixed(2)
        ),
        carbonSummary,
        anomalies,
        idleAssets
      },
      arbitrageOverview: {
        totalAnalyzedWorkloadsCount: k8sWorkloads.length,
        currentK8sMonthlySpendUsd: Number(
          k8sWorkloads.reduce((acc, k) => acc + k.currentMonthlyCostUsd, 0).toFixed(2)
        ),
        rightsizedK8sMonthlySpendUsd: Number(
          k8sWorkloads.reduce((acc, k) => acc + k.rightsizedMonthlyCostUsd, 0).toFixed(2)
        ),
        monthlyRightsizingSavingsUsd: Number(
          k8sWorkloads.reduce((acc, k) => acc + k.monthlySavingsUsd, 0).toFixed(2)
        ),
        monthlySpotSavingsPotentialUsd: Number(
          k8sWorkloads.reduce((acc, k) => acc + k.spotSavingsPotentialMonthlyUsd, 0).toFixed(2)
        ),
        monthlyGravitonSavingsPotentialUsd: 1450.0,
        workloads: k8sWorkloads,
        gravitonRoadmap
      },
      maturityAssessment,
      latestCfoMemo: memos[0]
    };
  }

  async listAllocations(userId: string): Promise<TenantCostAllocationDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_tenant_allocations WHERE user_id = $1 ORDER BY total_cost_usd DESC`,
      [userId]
    );
    return res.rows.map(this.mapAllocation);
  }

  async createAllocation(userId: string, input: TenantCostAllocationMutationDTO): Promise<TenantCostAllocationDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const metrics = calculateCostPerTenantMetrics(
      input.monthlyAttributableRevenueUsd,
      input.directComputeCostUsd,
      input.directStorageCostUsd,
      input.allocatedSharedCostUsd,
      input.monthlyTransactionsCount
    );

    const res = await this.pool.query(
      `INSERT INTO finops_tenant_allocations (
        id, user_id, tenant_name, tenant_tier, monthly_revenue_usd,
        direct_compute_cost_usd, direct_storage_cost_usd, allocated_shared_cost_usd,
        total_cost_usd, gross_margin_percent, monthly_transactions_count,
        cost_per_transaction_usd, tagging_compliance_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id,
        userId,
        input.tenantName,
        input.tenantTier,
        input.monthlyAttributableRevenueUsd,
        input.directComputeCostUsd,
        input.directStorageCostUsd,
        input.allocatedSharedCostUsd,
        metrics.totalCostPerTenantUsd,
        metrics.grossMarginPercent,
        input.monthlyTransactionsCount,
        metrics.costPerTransactionUsd,
        input.taggingCompliancePercent
      ]
    );
    return this.mapAllocation(res.rows[0]);
  }

  async updateAllocation(
    userId: string,
    id: string,
    input: TenantCostAllocationMutationDTO
  ): Promise<TenantCostAllocationDTO | null> {
    await this.ensureSchema();
    const metrics = calculateCostPerTenantMetrics(
      input.monthlyAttributableRevenueUsd,
      input.directComputeCostUsd,
      input.directStorageCostUsd,
      input.allocatedSharedCostUsd,
      input.monthlyTransactionsCount
    );

    const res = await this.pool.query(
      `UPDATE finops_tenant_allocations
       SET tenant_name = $1, tenant_tier = $2, monthly_revenue_usd = $3,
           direct_compute_cost_usd = $4, direct_storage_cost_usd = $5,
           allocated_shared_cost_usd = $6, total_cost_usd = $7,
           gross_margin_percent = $8, monthly_transactions_count = $9,
           cost_per_transaction_usd = $10, tagging_compliance_percent = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        input.tenantName,
        input.tenantTier,
        input.monthlyAttributableRevenueUsd,
        input.directComputeCostUsd,
        input.directStorageCostUsd,
        input.allocatedSharedCostUsd,
        metrics.totalCostPerTenantUsd,
        metrics.grossMarginPercent,
        input.monthlyTransactionsCount,
        metrics.costPerTransactionUsd,
        input.taggingCompliancePercent,
        id,
        userId
      ]
    );
    if (res.rows.length === 0) return null;
    return this.mapAllocation(res.rows[0]);
  }

  async deleteAllocation(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM finops_tenant_allocations WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async listCommitments(userId: string): Promise<CommitmentPortfolioItemDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_commitments WHERE user_id = $1 ORDER BY expiration_date ASC`,
      [userId]
    );
    return res.rows.map(this.mapCommitment);
  }

  async createCommitment(userId: string, input: CommitmentMutationDTO): Promise<CommitmentPortfolioItemDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const monthlyCommitted = Number((input.committedHourlySpendUsd * 730).toFixed(2));
    const monthlySavings = Number(
      Math.max(0, input.onDemandEquivalentMonthlySpendUsd - monthlyCommitted).toFixed(2)
    );

    const res = await this.pool.query(
      `INSERT INTO finops_commitments (
        id, user_id, provider, service_name, commitment_type, instance_family,
        term_months, payment_option, committed_hourly_spend_usd, monthly_committed_spend_usd,
        on_demand_equivalent_monthly_usd, monthly_savings_usd, utilization_rate_percent,
        coverage_ratio_percent, expiration_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        userId,
        input.provider,
        input.serviceName,
        input.commitmentType,
        input.instanceFamilyOrResource,
        input.termMonths,
        input.paymentOption,
        input.committedHourlySpendUsd,
        monthlyCommitted,
        input.onDemandEquivalentMonthlySpendUsd,
        monthlySavings,
        input.utilizationRatePercent,
        input.coverageRatioPercent,
        input.expirationDate
      ]
    );
    return this.mapCommitment(res.rows[0]);
  }

  async deleteCommitment(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM finops_commitments WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async simulateCommitmentNpv(
    _userId: string,
    input: CommitmentPurchaseSimulationDTO
  ): Promise<CommitmentNpvScenarioDTO[]> {
    return [
      calculateCommitmentNpv(
        input.eligibleMonthlySpendUsd * (input.targetCoveragePercent / 100),
        input.waccDiscountRatePercent,
        36,
        'all_upfront',
        38
      ),
      calculateCommitmentNpv(
        input.eligibleMonthlySpendUsd * (input.targetCoveragePercent / 100),
        input.waccDiscountRatePercent,
        36,
        'partial_upfront',
        32
      ),
      calculateCommitmentNpv(
        input.eligibleMonthlySpendUsd * (input.targetCoveragePercent / 100),
        input.waccDiscountRatePercent,
        12,
        'no_upfront',
        22
      )
    ];
  }

  async listAnomalies(userId: string): Promise<CloudCostAnomalyDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_anomalies WHERE user_id = $1 ORDER BY detected_date DESC`,
      [userId]
    );
    return res.rows.map(this.mapAnomaly);
  }

  async detectAnomalies(
    userId: string,
    req: AnomalyDetectionRequestDTO
  ): Promise<CloudCostAnomalyDTO[]> {
    await this.ensureSchema();
    const syntheticDailySpend = 1450.0;
    const history = [450, 480, 470, 490, 460, 485, 475];
    const detection = detectCostAnomaly(syntheticDailySpend, history, req.sensitivityZScore);

    if (detection.isAnomaly) {
      const id = crypto.randomUUID();
      const detectedDate = new Date().toISOString().split('T')[0];
      await this.pool.query(
        `INSERT INTO finops_anomalies (
          id, user_id, provider, service_affected, detected_date,
          actual_daily_spend_usd, baseline_mean_usd, std_dev_usd, z_score,
          excess_spend_daily_usd, severity, probable_root_cause, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          id,
          userId,
          'aws',
          'Automated Scan: CloudFront High Egress Spike',
          detectedDate,
          syntheticDailySpend,
          detection.mean,
          detection.stdDev,
          detection.zScore,
          detection.excessSpend,
          detection.zScore >= 5.0 ? 'critical' : 'high',
          'Detected statistical deviation from baseline during on-demand automated scan',
          'active'
        ]
      );
    }
    return this.listAnomalies(userId);
  }

  async listIdleAssets(userId: string): Promise<IdleWasteItemDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_idle_assets WHERE user_id = $1 ORDER BY monthly_waste_cost_usd DESC`,
      [userId]
    );
    return res.rows.map(this.mapIdleAsset);
  }

  async remediateIdleAsset(
    userId: string,
    id: string,
    input: IdleWasteRemediationMutationDTO
  ): Promise<IdleWasteItemDTO | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `UPDATE finops_idle_assets
       SET status = $1, remediation_notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [input.status, input.remediationNotes || '', id, userId]
    );
    if (res.rows.length === 0) return null;
    return this.mapIdleAsset(res.rows[0]);
  }

  async listK8sWorkloads(userId: string): Promise<KubernetesWorkloadRightsizingDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_k8s_workloads WHERE user_id = $1 ORDER BY current_monthly_cost_usd DESC`,
      [userId]
    );
    return res.rows.map(this.mapK8sWorkload);
  }

  async simulateK8sRightsizing(
    userId: string,
    sim: KubernetesRightsizingSimulationDTO
  ): Promise<KubernetesWorkloadRightsizingDTO[]> {
    const workloads = await this.listK8sWorkloads(userId);
    return workloads.map((w) => {
      const calc = calculateK8sRightsizing(
        w.requestedCpuCores,
        w.actualP95CpuCores,
        w.requestedMemoryGiB,
        w.actualP95MemoryGiB,
        w.currentMonthlyCostUsd,
        sim.headroomBufferPercent
      );
      const spotSavings = w.isEligibleForSpot ? Number((calc.rightsizedMonthlyCostUsd * 0.65).toFixed(2)) : 0;
      return {
        ...w,
        recommendedCpuCores: calc.recommendedCpu,
        recommendedMemoryGiB: calc.recommendedMemoryGiB,
        rightsizedMonthlyCostUsd: calc.rightsizedMonthlyCostUsd,
        monthlySavingsUsd: calc.monthlySavingsUsd,
        sizingSlackPercent: calc.sizingSlackPercent,
        spotSavingsPotentialMonthlyUsd: spotSavings
      };
    });
  }

  async listCfoMemos(userId: string): Promise<CfoMemorandumDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM finops_cfo_memos WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(this.mapCfoMemo);
  }

  async generateCfoMemo(userId: string, req: CfoMemorandumGenerateRequestDTO): Promise<CfoMemorandumDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const overview = await this.getOverview(userId);

    const memo: CfoMemorandumDTO = {
      id,
      title: req.title,
      fiscalQuarter: req.fiscalQuarter,
      status: 'draft',
      compositeFinOpsScore: overview.compositeScore,
      efficiencyBand: overview.efficiencyBand,
      monthlyCloudSpendUsd: overview.totalMonthlySpendUsd,
      annualizedRealizedSavingsUsd: overview.annualizedRealizedSavingsUsd,
      unlockedAnnualizedPipelineSavingsUsd: overview.annualizedPipelineSavingsUsd,
      cloudGrossMarginPercent: overview.blendedGrossMarginPercent,
      executiveSummary: {
        sectionKey: 'exec',
        heading: '1. Executive Summary & Strategic Rationale',
        executiveSummaryText: `During ${req.fiscalQuarter}, JobTrack managed $${overview.totalMonthlySpendUsd.toLocaleString()}/mo in cloud spend with ${overview.blendedGrossMarginPercent}% gross margin.`,
        keyMetricsBulletPoints: [
          `Monthly Run-Rate: $${overview.totalMonthlySpendUsd.toLocaleString()}`,
          `Composite FES: ${overview.compositeScore} / 100 (${overview.efficiencyBand.toUpperCase()})`,
          `Commitment Coverage: ${overview.commitmentCoveragePercent}%`
        ],
        strategicGuidance: req.strategicNotes || 'Execute 3-year Compute Savings Plan to hedge compute expansion.'
      },
      unitEconomicsScorecard: {
        sectionKey: 'unit',
        heading: '2. Unit Economics & Cost Allocation Scorecard',
        executiveSummaryText: `Average tenant cost stands at $${overview.allocationOverview.averageCostPerTenantUsd} with ${overview.allocationOverview.overallTaggingCompliancePercent}% tagging compliance.`,
        keyMetricsBulletPoints: [
          `Average Cost per Tenant: $${overview.allocationOverview.averageCostPerTenantUsd}`,
          `Average Cost per Transaction: $${overview.allocationOverview.averageCostPerTransactionUsd}`,
          `Tagging Compliance: ${overview.allocationOverview.overallTaggingCompliancePercent}%`
        ],
        strategicGuidance: 'Enforce mandatory billing tags on all staging Kubernetes namespaces.'
      },
      commitmentStrategy: {
        sectionKey: 'commit',
        heading: '3. Commitment Portfolio & Hedging Strategy',
        executiveSummaryText: `Hedging coverage reached ${overview.commitmentCoveragePercent}% with ${overview.commitmentUtilizationPercent}% utilization.`,
        keyMetricsBulletPoints: [
          `Coverage: ${overview.commitmentCoveragePercent}%`,
          `Annualized Realized Savings: $${overview.annualizedRealizedSavingsUsd.toLocaleString()}`,
          `Potential Pipeline Savings: $${overview.commitmentOverview.potentialAdditionalSavingsUsd.toLocaleString()}`
        ],
        strategicGuidance: 'Review 3-year commitment tranches to lock in maximum cloud provider discounts.'
      },
      wasteAndAnomalyGovernance: {
        sectionKey: 'waste',
        heading: '4. Idle Waste Elimination & Anomaly Diagnostics',
        executiveSummaryText: `Identified $${overview.identifiedMonthlyWasteUsd.toLocaleString()}/month in idle unattached assets.`,
        keyMetricsBulletPoints: [
          `Identified Idle Waste: $${overview.identifiedMonthlyWasteUsd.toLocaleString()}/mo`,
          `Active Anomalies: ${overview.wasteOverview.activeAnomaliesCount}`,
          `Carbon Footprint: ${overview.totalMonthlyCarbonKgCo2e} kg CO2e`
        ],
        strategicGuidance: 'Schedule weekly automated cleanup scripts for unattached volumes.'
      },
      k8sArchitectureArbitrage: {
        sectionKey: 'k8s',
        heading: '5. Kubernetes Workload Rightsizing & Graviton Arbitrage',
        executiveSummaryText: `Rightsizing Kubernetes workloads unlocks $${overview.arbitrageOverview.monthlyRightsizingSavingsUsd.toLocaleString()}/month in immediate savings.`,
        keyMetricsBulletPoints: [
          `Workloads Analyzed: ${overview.arbitrageOverview.totalAnalyzedWorkloadsCount}`,
          `Monthly Rightsizing Savings: $${overview.arbitrageOverview.monthlyRightsizingSavingsUsd.toLocaleString()}`,
          `Spot Elasticity Potential: $${overview.arbitrageOverview.monthlySpotSavingsPotentialUsd.toLocaleString()}`
        ],
        strategicGuidance: 'Migrate stateless API worker node pools to c7g Graviton instances.'
      },
      cfoDirectivesActionPlan: {
        sectionKey: 'directives',
        heading: '6. Board Audit Committee & CFO Directives',
        executiveSummaryText: 'Approval recommended for 3-year commitment tranches and Graviton architecture transition.',
        keyMetricsBulletPoints: [
          'Directive 1: Authorize $45k upfront capital for 3-year savings plans',
          'Directive 2: Target 88.0 FES score for upcoming fiscal audit'
        ],
        strategicGuidance: 'Formal board sign-off is recommended.'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.pool.query(
      `INSERT INTO finops_cfo_memos (
        id, user_id, title, fiscal_quarter, status, composite_finops_score,
        efficiency_band, monthly_cloud_spend_usd, annualized_realized_savings_usd,
        unlocked_pipeline_savings_usd, cloud_gross_margin_percent, executive_summary,
        unit_economics_scorecard, commitment_strategy, waste_anomaly_governance,
        k8s_arbitrage, cfo_directives_action_plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id,
        userId,
        memo.title,
        memo.fiscalQuarter,
        memo.status,
        memo.compositeFinOpsScore,
        memo.efficiencyBand,
        memo.monthlyCloudSpendUsd,
        memo.annualizedRealizedSavingsUsd,
        memo.unlockedAnnualizedPipelineSavingsUsd,
        memo.cloudGrossMarginPercent,
        JSON.stringify(memo.executiveSummary),
        JSON.stringify(memo.unitEconomicsScorecard),
        JSON.stringify(memo.commitmentStrategy),
        JSON.stringify(memo.wasteAndAnomalyGovernance),
        JSON.stringify(memo.k8sArchitectureArbitrage),
        JSON.stringify(memo.cfoDirectivesActionPlan)
      ]
    );

    return memo;
  }

  async approveCfoMemo(userId: string, id: string, role: 'vp_infra' | 'cto' | 'cfo'): Promise<CfoMemorandumDTO | null> {
    await this.ensureSchema();
    const col =
      role === 'cfo'
        ? 'approved_by_cfo_at'
        : role === 'cto'
          ? 'approved_by_cto_at'
          : 'approved_by_vp_infra_at';

    const status = role === 'cfo' ? 'board_approved' : 'under_review';

    const res = await this.pool.query(
      `UPDATE finops_cfo_memos
       SET ${col} = CURRENT_TIMESTAMP, status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );
    if (res.rows.length === 0) return null;
    return this.mapCfoMemo(res.rows[0]);
  }

  private mapAllocation(r: any): TenantCostAllocationDTO {
    return {
      id: r.id,
      tenantName: r.tenant_name,
      tenantTier: r.tenant_tier as TenantTier,
      monthlyAttributableRevenueUsd: Number(r.monthly_revenue_usd),
      directComputeCostUsd: Number(r.direct_compute_cost_usd),
      directStorageCostUsd: Number(r.direct_storage_cost_usd),
      allocatedSharedCostUsd: Number(r.allocated_shared_cost_usd),
      totalCostPerTenantUsd: Number(r.total_cost_usd),
      grossMarginPercent: Number(r.gross_margin_percent),
      monthlyTransactionsCount: Number(r.monthly_transactions_count),
      costPerTransactionUsd: Number(r.cost_per_transaction_usd),
      taggingCompliancePercent: Number(r.tagging_compliance_percent),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapCommitment(r: any): CommitmentPortfolioItemDTO {
    const expDate = new Date(r.expiration_date);
    const diffDays = Math.ceil((expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return {
      id: r.id,
      provider: r.provider as CloudProvider,
      serviceName: r.service_name,
      commitmentType: r.commitment_type as CommitmentType,
      instanceFamilyOrResource: r.instance_family,
      termMonths: Number(r.term_months) as CommitmentTermMonths,
      paymentOption: r.payment_option as CommitmentPaymentOption,
      committedHourlySpendUsd: Number(r.committed_hourly_spend_usd),
      monthlyCommittedSpendUsd: Number(r.monthly_committed_spend_usd),
      onDemandEquivalentMonthlySpendUsd: Number(r.on_demand_equivalent_monthly_usd),
      monthlySavingsUsd: Number(r.monthly_savings_usd),
      utilizationRatePercent: Number(r.utilization_rate_percent),
      coverageRatioPercent: Number(r.coverage_ratio_percent),
      expirationDate: expDate.toISOString().split('T')[0],
      daysUntilExpiration: Math.max(0, diffDays),
      isExpiringSoon: diffDays <= 60,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    };
  }

  private mapAnomaly(r: any): CloudCostAnomalyDTO {
    return {
      id: r.id,
      provider: r.provider as CloudProvider,
      serviceAffected: r.service_affected,
      detectedDate: new Date(r.detected_date).toISOString().split('T')[0],
      actualDailySpendUsd: Number(r.actual_daily_spend_usd),
      baselineMeanDailySpendUsd: Number(r.baseline_mean_usd),
      standardDeviationUsd: Number(r.std_dev_usd),
      zScore: Number(r.z_score),
      excessSpendDailyUsd: Number(r.excess_spend_daily_usd),
      severity: r.severity,
      probableRootCause: r.probable_root_cause,
      status: r.status
    };
  }

  private mapIdleAsset(r: any): IdleWasteItemDTO {
    return {
      id: r.id,
      provider: r.provider as CloudProvider,
      assetType: r.asset_type as WasteAssetType,
      resourceIdentifier: r.resource_identifier,
      region: r.region,
      monthlyWasteCostUsd: Number(r.monthly_waste_cost_usd),
      idleDurationDays: Number(r.idle_duration_days),
      carbonFootprintMonthlyKgCo2e: Number(r.carbon_footprint_kg_co2e),
      status: r.status as WasteRemediationStatus,
      detectedAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    };
  }

  private mapK8sWorkload(r: any): KubernetesWorkloadRightsizingDTO {
    return {
      id: r.id,
      clusterName: r.cluster_name,
      namespaceName: r.namespace_name,
      workloadName: r.workload_name,
      workloadType: r.workload_type as K8sWorkloadType,
      replicasCount: Number(r.replicas_count),
      requestedCpuCores: Number(r.requested_cpu_cores),
      actualP95CpuCores: Number(r.actual_p95_cpu_cores),
      recommendedCpuCores: Number(r.recommended_cpu_cores),
      requestedMemoryGiB: Number(r.requested_memory_gib),
      actualP95MemoryGiB: Number(r.actual_p95_memory_gib),
      recommendedMemoryGiB: Number(r.recommended_memory_gib),
      currentMonthlyCostUsd: Number(r.current_monthly_cost_usd),
      rightsizedMonthlyCostUsd: Number(r.rightsized_monthly_cost_usd),
      monthlySavingsUsd: Number(r.monthly_savings_usd),
      sizingSlackPercent: Number(r.sizing_slack_percent),
      isEligibleForSpot: Boolean(r.is_eligible_for_spot),
      spotSavingsPotentialMonthlyUsd: Number(r.spot_savings_monthly_usd)
    };
  }

  private mapCfoMemo(r: any): CfoMemorandumDTO {
    return {
      id: r.id,
      title: r.title,
      fiscalQuarter: r.fiscal_quarter,
      status: r.status as CfoMemoStatus,
      compositeFinOpsScore: Number(r.composite_finops_score),
      efficiencyBand: r.efficiency_band,
      monthlyCloudSpendUsd: Number(r.monthly_cloud_spend_usd),
      annualizedRealizedSavingsUsd: Number(r.annualized_realized_savings_usd),
      unlockedAnnualizedPipelineSavingsUsd: Number(r.unlocked_pipeline_savings_usd),
      cloudGrossMarginPercent: Number(r.cloud_gross_margin_percent),
      executiveSummary: r.executive_summary || {},
      unitEconomicsScorecard: r.unit_economics_scorecard || {},
      commitmentStrategy: r.commitment_strategy || {},
      wasteAndAnomalyGovernance: r.waste_anomaly_governance || {},
      k8sArchitectureArbitrage: r.k8s_arbitrage || {},
      cfoDirectivesActionPlan: r.cfo_directives_action_plan || {},
      approvedByVpInfraAt: r.approved_by_vp_infra_at ? new Date(r.approved_by_vp_infra_at).toISOString() : undefined,
      approvedByCtoAt: r.approved_by_cto_at ? new Date(r.approved_by_cto_at).toISOString() : undefined,
      approvedByCfoAt: r.approved_by_cfo_at ? new Date(r.approved_by_cfo_at).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }
}
