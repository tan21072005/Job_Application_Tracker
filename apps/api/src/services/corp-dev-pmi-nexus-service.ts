import type { Pool } from 'pg';
import {
  type CorpDevTargetDTO,
  type VdrDiligenceStreamDTO,
  type VdrDiligenceFindingDTO,
  type DcfValuationModelDTO,
  type LboFinancialModelDTO,
  type SynergyModelDTO,
  type PurchasePriceAllocationDTO,
  type DealStructuringDTO,
  type AntitrustClearanceDTO,
  type PmiInitiativeDTO,
  type TalentRetentionDTO,
  type BoardWarRoomDTO,
  type CorpDevOverviewDTO,
  type CreateCorpDevTargetRequestDTO,
  type CreateVdrFindingRequestDTO,
  type SimulateDcfRequestDTO,
  type SimulateLboRequestDTO,
  type SimulateSynergiesRequestDTO,
  type SimulateCollarRequestDTO,
  type AssessAntitrustRequestDTO,
  type LockTalentRetentionRequestDTO,
  type CorpDevSignoffRequestDTO,
  calculateStrategicFitScore,
  calculateDcfValuation,
  calculateLboReturns,
  calculateSynergyNpv,
  calculateAsc805PurchasePriceAllocation,
  calculateFloatingCollarExchangeRatio,
  calculateAntitrustSecondRequestRisk,
  calculateDspiScore,
  generateForm8KDisclosures
} from '@jobtrack/contract';

export class CorpDevPmiNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS corpdev_targets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_name VARCHAR(255) NOT NULL,
        code_name VARCHAR(100) NOT NULL,
        industry_sector VARCHAR(100) NOT NULL,
        stage VARCHAR(64) NOT NULL DEFAULT 'sourcing',
        strategic_theme VARCHAR(64) NOT NULL,
        headquarters VARCHAR(255) NOT NULL,
        employee_count INTEGER NOT NULL DEFAULT 0,
        annual_revenue_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        ebitda_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        target_enterprise_value_usd NUMERIC(18, 2) NOT NULL,
        strategic_fit_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        nda_signed_date DATE,
        exclusivity_expiry_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_targets_user ON corpdev_targets(user_id);
      CREATE INDEX IF NOT EXISTS idx_corpdev_targets_stage ON corpdev_targets(user_id, stage);

      CREATE TABLE IF NOT EXISTS corpdev_diligence_streams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        stream_type VARCHAR(64) NOT NULL,
        stream_lead VARCHAR(255) NOT NULL,
        completion_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(64) NOT NULL DEFAULT 'pending',
        findings_count INTEGER NOT NULL DEFAULT 0,
        critical_issues_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_vdr_streams ON corpdev_diligence_streams(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_diligence_findings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        stream_type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(32) NOT NULL,
        financial_impact_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        proposed_remediation TEXT NOT NULL,
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_vdr_findings ON corpdev_diligence_findings(user_id, target_id, severity);

      CREATE TABLE IF NOT EXISTS corpdev_dcf_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        model_name VARCHAR(255) NOT NULL,
        forecast_years INTEGER NOT NULL DEFAULT 5,
        wacc_percent NUMERIC(5, 2) NOT NULL,
        terminal_growth_rate_percent NUMERIC(5, 2) NOT NULL,
        terminal_ebitda_multiple NUMERIC(5, 2) NOT NULL,
        projected_ufcf JSONB NOT NULL DEFAULT '[]'::jsonb,
        terminal_value_gordon_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        terminal_value_multiple_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        enterprise_value_gordon_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        enterprise_value_multiple_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        net_debt_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        implied_equity_value_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        implied_share_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_dcf_user_target ON corpdev_dcf_models(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_lbo_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        model_name VARCHAR(255) NOT NULL,
        entry_ebitda_multiple NUMERIC(5, 2) NOT NULL,
        senior_debt_multiple NUMERIC(5, 2) NOT NULL,
        subordinated_debt_multiple NUMERIC(5, 2) NOT NULL,
        exit_ebitda_multiple NUMERIC(5, 2) NOT NULL,
        exit_year INTEGER NOT NULL DEFAULT 5,
        projected_exit_ebitda_usd NUMERIC(18, 2) NOT NULL,
        sponsor_equity_entry_usd NUMERIC(18, 2) NOT NULL,
        sponsor_equity_exit_usd NUMERIC(18, 2) NOT NULL,
        sponsor_moic NUMERIC(6, 2) NOT NULL,
        sponsor_irr_percent NUMERIC(6, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_lbo_user_target ON corpdev_lbo_models(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_synergy_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        annual_run_rate_cost_synergy_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        annual_run_rate_revenue_synergy_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        contribution_margin_percent NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
        one_time_cost_to_achieve_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        cost_phasing JSONB NOT NULL DEFAULT '[0.3, 0.7, 1.0, 1.0]'::jsonb,
        revenue_phasing JSONB NOT NULL DEFAULT '[0.15, 0.5, 0.85, 1.0]'::jsonb,
        synergy_npv_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_synergies ON corpdev_synergy_models(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_purchase_price_allocations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        total_consideration_usd NUMERIC(18, 2) NOT NULL,
        net_tangible_assets_fair_value_usd NUMERIC(18, 2) NOT NULL,
        developed_technology_fair_value_usd NUMERIC(18, 2) NOT NULL,
        customer_relationships_fair_value_usd NUMERIC(18, 2) NOT NULL,
        trademarks_fair_value_usd NUMERIC(18, 2) NOT NULL,
        deferred_tax_liability_usd NUMERIC(18, 2) NOT NULL,
        calculated_goodwill_usd NUMERIC(18, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_ppa ON corpdev_purchase_price_allocations(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_deal_structures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        cash_consideration_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        stock_consideration_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        earnout_consideration_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        rollover_equity_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        cash_percent NUMERIC(5, 2) NOT NULL,
        stock_percent NUMERIC(5, 2) NOT NULL,
        collar_upper_limit_usd NUMERIC(10, 2) NOT NULL,
        collar_lower_limit_usd NUMERIC(10, 2) NOT NULL,
        fixed_target_value_usd NUMERIC(18, 2) NOT NULL,
        buyer_termination_fee_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        target_break_fee_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_structures ON corpdev_deal_structures(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_antitrust_clearances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        requires_hsr_filing BOOLEAN NOT NULL DEFAULT TRUE,
        pre_merger_hhi INTEGER NOT NULL DEFAULT 0,
        post_merger_hhi INTEGER NOT NULL DEFAULT 0,
        delta_hhi INTEGER NOT NULL DEFAULT 0,
        second_request_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        filing_date DATE,
        waiting_period_expiry_date DATE,
        regulatory_covenant VARCHAR(64) NOT NULL DEFAULT 'reasonable_best_efforts',
        clearance_status VARCHAR(64) NOT NULL DEFAULT 'pending_filing',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_antitrust ON corpdev_antitrust_clearances(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_pmi_initiatives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        workstream VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        owner VARCHAR(255) NOT NULL,
        day_target INTEGER NOT NULL DEFAULT 1,
        is_day1_critical BOOLEAN NOT NULL DEFAULT FALSE,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        associated_synergy_usd NUMERIC(18, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_pmi ON corpdev_pmi_initiatives(user_id, target_id, day_target);

      CREATE TABLE IF NOT EXISTS corpdev_talent_retentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        annual_compensation_usd NUMERIC(18, 2) NOT NULL,
        unvested_equity_usd NUMERIC(18, 2) NOT NULL,
        flight_risk_score NUMERIC(5, 2) NOT NULL,
        retention_bonus_pool_usd NUMERIC(18, 2) NOT NULL,
        cliff_period_months INTEGER NOT NULL DEFAULT 24,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_retention ON corpdev_talent_retentions(user_id, target_id);

      CREATE TABLE IF NOT EXISTS corpdev_board_war_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id UUID NOT NULL REFERENCES corpdev_targets(id) ON DELETE CASCADE,
        dspi_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        confidence_band VARCHAR(64) NOT NULL DEFAULT 'ELEVATED_CLOSING_RISK',
        vp_corp_dev_signed BOOLEAN NOT NULL DEFAULT FALSE,
        vp_corp_dev_signer_name VARCHAR(255),
        vp_corp_dev_signed_at TIMESTAMPTZ,
        cfo_signed BOOLEAN NOT NULL DEFAULT FALSE,
        cfo_signer_name VARCHAR(255),
        cfo_signed_at TIMESTAMPTZ,
        ceo_signed BOOLEAN NOT NULL DEFAULT FALSE,
        ceo_signer_name VARCHAR(255),
        ceo_signed_at TIMESTAMPTZ,
        form_8k_item_101_markdown TEXT NOT NULL DEFAULT '',
        form_8k_item_201_markdown TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_corpdev_warroom ON corpdev_board_war_rooms(user_id, target_id);
    `);

    this.schemaInitialized = true;
  }

  async ensureDefaultSeedData(userId: string): Promise<void> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      'SELECT id FROM corpdev_targets WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (existing.rowCount && existing.rowCount > 0) return;

    const targetRes = await this.pool.query(
      `INSERT INTO corpdev_targets (
        user_id, target_name, code_name, industry_sector, stage,
        strategic_theme, headquarters, employee_count, annual_revenue_usd,
        ebitda_usd, target_enterprise_value_usd, strategic_fit_score,
        nda_signed_date, exclusivity_expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        userId,
        'Apex Cloud Solutions Inc.',
        'Project Apex',
        'Enterprise SaaS & Multi-Cloud',
        'binding_loi_exclusivity',
        'vertical_tech_stack_expansion',
        'Austin, TX',
        240,
        65000000,
        18500000,
        485000000,
        88.5,
        '2026-08-15',
        '2026-11-30'
      ]
    );

    const targetId = targetRes.rows[0].id;

    const streams = [
      { type: 'financial_tax', lead: 'Deloitte M&A Transaction Services', pct: 95.0, status: 'cleared', count: 4, crit: 0 },
      { type: 'legal_regulatory', lead: 'Gibson Dunn & Crutcher LLP', pct: 88.0, status: 'in_progress', count: 6, crit: 0 },
      { type: 'commercial_market', lead: 'McKinsey Strategy Practice', pct: 100.0, status: 'cleared', count: 3, crit: 0 },
      { type: 'technical_architecture', lead: 'Internal Chief Architect Office', pct: 90.0, status: 'cleared', count: 5, crit: 0 },
      { type: 'hr_talent_culture', lead: 'Mercer Human Capital Advisory', pct: 85.0, status: 'in_progress', count: 2, crit: 0 },
      { type: 'operational_esg', lead: 'PwC Sustainability & Supply Advisory', pct: 92.0, status: 'cleared', count: 1, crit: 0 }
    ];

    for (const s of streams) {
      await this.pool.query(
        `INSERT INTO corpdev_diligence_streams (
          user_id, target_id, stream_type, stream_lead, completion_percent, status, findings_count, critical_issues_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, targetId, s.type, s.lead, s.pct, s.status, s.count, s.crit]
      );
    }

    await this.pool.query(
      `INSERT INTO corpdev_diligence_findings (
        user_id, target_id, stream_type, title, description, severity, financial_impact_usd, proposed_remediation, is_resolved
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        targetId,
        'legal_regulatory',
        'Top 2 customer contracts require change of control consent notices',
        'Enterprise customers account for 14% of annual ARR with standard 30-day notice provisions',
        'medium',
        3500000,
        'Secure pre-closing customer consent certificates as condition precedent in Merger Agreement',
        true
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_dcf_models (
        user_id, target_id, model_name, forecast_years, wacc_percent, terminal_growth_rate_percent,
        terminal_ebitda_multiple, projected_ufcf, terminal_value_gordon_usd, terminal_value_multiple_usd,
        enterprise_value_gordon_usd, enterprise_value_multiple_usd, net_debt_usd, implied_equity_value_usd, implied_share_price_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId,
        targetId,
        'Base Case DCF Model Q3-2026',
        5,
        9.5,
        2.5,
        12.0,
        JSON.stringify([18000000, 22500000, 28000000, 34000000, 41000000]),
        475000000,
        492000000,
        485000000,
        498000000,
        20000000,
        465000000,
        46.50
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_lbo_models (
        user_id, target_id, model_name, entry_ebitda_multiple, senior_debt_multiple, subordinated_debt_multiple,
        exit_ebitda_multiple, exit_year, projected_exit_ebitda_usd, sponsor_equity_entry_usd, sponsor_equity_exit_usd,
        sponsor_moic, sponsor_irr_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId,
        targetId,
        'Alternative LBO Recapitalization Case',
        11.5,
        4.0,
        1.5,
        12.0,
        5,
        45000000,
        185000000,
        490000000,
        2.65,
        21.5
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_synergy_models (
        user_id, target_id, annual_run_rate_cost_synergy_usd, annual_run_rate_revenue_synergy_usd,
        contribution_margin_percent, one_time_cost_to_achieve_usd, cost_phasing, revenue_phasing, synergy_npv_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        targetId,
        14000000,
        25000000,
        75.0,
        9500000,
        JSON.stringify([0.3, 0.7, 1.0, 1.0]),
        JSON.stringify([0.15, 0.5, 0.85, 1.0]),
        84200000
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_purchase_price_allocations (
        user_id, target_id, total_consideration_usd, net_tangible_assets_fair_value_usd, developed_technology_fair_value_usd,
        customer_relationships_fair_value_usd, trademarks_fair_value_usd, deferred_tax_liability_usd, calculated_goodwill_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        targetId,
        485000000,
        72000000,
        135000000,
        68000000,
        24000000,
        47670000,
        233670000
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_deal_structures (
        user_id, target_id, cash_consideration_usd, stock_consideration_usd, earnout_consideration_usd, rollover_equity_usd,
        cash_percent, stock_percent, collar_upper_limit_usd, collar_lower_limit_usd, fixed_target_value_usd,
        buyer_termination_fee_usd, target_break_fee_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId,
        targetId,
        315250000,
        169750000,
        0,
        0,
        65.0,
        35.0,
        110.00,
        90.00,
        50.00,
        19400000,
        14550000
      ]
    );

    await this.pool.query(
      `INSERT INTO corpdev_antitrust_clearances (
        user_id, target_id, requires_hsr_filing, pre_merger_hhi, post_merger_hhi, delta_hhi, second_request_risk_score,
        filing_date, waiting_period_expiry_date, regulatory_covenant, clearance_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        targetId,
        true,
        1850,
        2110,
        260,
        32.4,
        '2026-09-10',
        '2026-10-10',
        'reasonable_best_efforts',
        'cleared'
      ]
    );

    const initiatives = [
      { stream: 'executive_steering', title: 'Day-1 Joint Operating Committee Charter Ratification', owner: 'VP Corp Dev', day: 1, crit: true, done: true, syn: 0 },
      { stream: 'technology_infrastructure', title: 'Okta SAML 2.0 Identity Federation & Email Bridging', owner: 'Chief Information Security Officer', day: 1, crit: true, done: true, syn: 1200000 },
      { stream: 'people_talent', title: 'Payroll Continuity Validation & Benefits Mirroring', owner: 'Chief People Officer', day: 1, crit: true, done: true, syn: 0 },
      { stream: 'finance_accounting', title: 'Dual-Signatory Bank Account Mandate & Treasury Sweep', owner: 'VP Treasury', day: 1, crit: true, done: true, syn: 500000 },
      { stream: 'sales_gtm', title: 'Harm-Free Sales Commission Protection Window Staging', owner: 'Chief Commercial Officer', day: 30, crit: false, done: false, syn: 4500000 },
      { stream: 'technology_infrastructure', title: 'Consolidated AWS Enterprise Discount Program (EDP) Agreement', owner: 'VP Infrastructure', day: 60, crit: false, done: false, syn: 3800000 }
    ];

    for (const init of initiatives) {
      await this.pool.query(
        `INSERT INTO corpdev_pmi_initiatives (
          user_id, target_id, workstream, title, owner, day_target, is_day1_critical, is_completed, associated_synergy_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, targetId, init.stream, init.title, init.owner, init.day, init.crit, init.done, init.syn]
      );
    }

    await this.pool.query(
      `INSERT INTO corpdev_talent_retentions (
        user_id, target_id, employee_name, job_title, department, annual_compensation_usd, unvested_equity_usd,
        flight_risk_score, retention_bonus_pool_usd, cliff_period_months, is_locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        targetId,
        'Dr. Elena Rostova',
        'Chief Technology Officer & Co-Founder',
        'Engineering',
        420000,
        1850000,
        28.5,
        1200000,
        24,
        true
      ]
    );

    const disclosures = generateForm8KDisclosures({
      targetName: 'Apex Cloud Solutions Inc.',
      codeName: 'Project Apex',
      totalConsiderationUsd: 485000000,
      cashPercent: 65,
      stockPercent: 35,
      buyerTerminationFeeUsd: 19400000,
      targetBreakFeeUsd: 14550000,
      regulatoryCovenant: 'reasonable_best_efforts',
      filingDate: '2026-10-25'
    });

    await this.pool.query(
      `INSERT INTO corpdev_board_war_rooms (
        user_id, target_id, dspi_score, confidence_band, vp_corp_dev_signed, vp_corp_dev_signer_name,
        vp_corp_dev_signed_at, cfo_signed, cfo_signer_name, cfo_signed_at, ceo_signed, ceo_signer_name,
        ceo_signed_at, form_8k_item_101_markdown, form_8k_item_201_markdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        userId,
        targetId,
        84.5,
        'HIGH_TRANSACTION_CERTAINTY',
        true,
        'Marcus Holloway (VP Corporate Development)',
        '2026-10-25T08:00:00Z',
        false,
        null,
        null,
        false,
        null,
        null,
        disclosures.item101,
        disclosures.item201
      ]
    );
  }

  async getOverview(userId: string): Promise<CorpDevOverviewDTO> {
    await this.ensureDefaultSeedData(userId);

    const targetsRes = await this.pool.query(
      `SELECT * FROM corpdev_targets WHERE user_id = $1 ORDER BY target_enterprise_value_usd DESC`,
      [userId]
    );

    const targets: CorpDevTargetDTO[] = targetsRes.rows.map((row) => ({
      id: row.id,
      targetName: row.target_name,
      codeName: row.code_name,
      industrySector: row.industry_sector,
      stage: row.stage,
      strategicTheme: row.strategic_theme,
      headquarters: row.headquarters,
      employeeCount: Number(row.employee_count),
      annualRevenueUsd: Number(row.annual_revenue_usd),
      ebitdaUsd: Number(row.ebitda_usd),
      targetEnterpriseValueUsd: Number(row.target_enterprise_value_usd),
      strategicFitScore: Number(row.strategic_fit_score),
      ndaSignedDate: row.nda_signed_date ? row.nda_signed_date.toISOString().split('T')[0] : null,
      exclusivityExpiryDate: row.exclusivity_expiry_date ? row.exclusivity_expiry_date.toISOString().split('T')[0] : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    const vdrStreamsCount = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM corpdev_diligence_streams WHERE user_id = $1 AND status != 'cleared'`,
      [userId]
    );

    const totalEv = targets.reduce((acc, t) => acc + t.targetEnterpriseValueUsd, 0);
    const avgSfs = targets.length > 0
      ? targets.reduce((acc, t) => acc + t.strategicFitScore, 0) / targets.length
      : 0;

    return {
      activeTargetsCount: targets.length,
      targets,
      aggregatePipelineEvUsd: totalEv,
      activeVdrCount: vdrStreamsCount.rows[0]?.count || 0,
      averageStrategicFitScore: Math.round(avgSfs * 10) / 10,
      topTargets: targets.slice(0, 5).map((t) => ({
        targetName: t.targetName,
        codeName: t.codeName,
        stage: t.stage,
        evUsd: t.targetEnterpriseValueUsd,
        sfs: t.strategicFitScore
      }))
    };
  }

  async getTargetDetails(userId: string, targetId: string): Promise<{
    target: CorpDevTargetDTO;
    vdrStreams: VdrDiligenceStreamDTO[];
    findings: VdrDiligenceFindingDTO[];
    dcfModel: DcfValuationModelDTO | null;
    lboModel: LboFinancialModelDTO | null;
    synergies: SynergyModelDTO | null;
    ppa: PurchasePriceAllocationDTO | null;
    dealStructure: DealStructuringDTO | null;
    antitrust: AntitrustClearanceDTO | null;
    pmiInitiatives: PmiInitiativeDTO[];
    talentRetentions: TalentRetentionDTO[];
    warRoom: BoardWarRoomDTO | null;
  } | null> {
    await this.ensureSchema();

    const targetRes = await this.pool.query(
      `SELECT * FROM corpdev_targets WHERE id = $1 AND user_id = $2`,
      [targetId, userId]
    );

    if (targetRes.rowCount === 0) return null;
    const row = targetRes.rows[0];

    const target: CorpDevTargetDTO = {
      id: row.id,
      targetName: row.target_name,
      codeName: row.code_name,
      industrySector: row.industry_sector,
      stage: row.stage,
      strategicTheme: row.strategic_theme,
      headquarters: row.headquarters,
      employeeCount: Number(row.employee_count),
      annualRevenueUsd: Number(row.annual_revenue_usd),
      ebitdaUsd: Number(row.ebitda_usd),
      targetEnterpriseValueUsd: Number(row.target_enterprise_value_usd),
      strategicFitScore: Number(row.strategic_fit_score),
      ndaSignedDate: row.nda_signed_date ? row.nda_signed_date.toISOString().split('T')[0] : null,
      exclusivityExpiryDate: row.exclusivity_expiry_date ? row.exclusivity_expiry_date.toISOString().split('T')[0] : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };

    const streamsRes = await this.pool.query(
      `SELECT * FROM corpdev_diligence_streams WHERE target_id = $1 AND user_id = $2 ORDER BY stream_type ASC`,
      [targetId, userId]
    );
    const vdrStreams: VdrDiligenceStreamDTO[] = streamsRes.rows.map((s) => ({
      id: s.id,
      targetId: s.target_id,
      streamType: s.stream_type,
      streamLead: s.stream_lead,
      completionPercent: Number(s.completion_percent),
      status: s.status,
      findingsCount: Number(s.findings_count),
      criticalIssuesCount: Number(s.critical_issues_count),
      updatedAt: s.updated_at.toISOString()
    }));

    const findingsRes = await this.pool.query(
      `SELECT * FROM corpdev_diligence_findings WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [targetId, userId]
    );
    const findings: VdrDiligenceFindingDTO[] = findingsRes.rows.map((f) => ({
      id: f.id,
      targetId: f.target_id,
      streamType: f.stream_type,
      title: f.title,
      description: f.description,
      severity: f.severity,
      financialImpactUsd: Number(f.financial_impact_usd),
      proposedRemediation: f.proposed_remediation,
      isResolved: f.is_resolved,
      createdAt: f.created_at.toISOString()
    }));

    const dcfRes = await this.pool.query(
      `SELECT * FROM corpdev_dcf_models WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let dcfModel: DcfValuationModelDTO | null = null;
    if (dcfRes.rowCount && dcfRes.rowCount > 0) {
      const d = dcfRes.rows[0];
      dcfModel = {
        id: d.id,
        targetId: d.target_id,
        modelName: d.model_name,
        forecastYears: Number(d.forecast_years),
        waccPercent: Number(d.wacc_percent),
        terminalGrowthRatePercent: Number(d.terminal_growth_rate_percent),
        terminalEbitdaMultiple: Number(d.terminal_ebitda_multiple),
        projectedUfcf: Array.isArray(d.projected_ufcf) ? d.projected_ufcf.map(Number) : [],
        terminalValueGordonUsd: Number(d.terminal_value_gordon_usd),
        terminalValueMultipleUsd: Number(d.terminal_value_multiple_usd),
        enterpriseValueGordonUsd: Number(d.enterprise_value_gordon_usd),
        enterpriseValueMultipleUsd: Number(d.enterprise_value_multiple_usd),
        netDebtUsd: Number(d.net_debt_usd),
        impliedEquityValueUsd: Number(d.implied_equity_value_usd),
        impliedSharePriceUsd: Number(d.implied_share_price_usd)
      };
    }

    const lboRes = await this.pool.query(
      `SELECT * FROM corpdev_lbo_models WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let lboModel: LboFinancialModelDTO | null = null;
    if (lboRes.rowCount && lboRes.rowCount > 0) {
      const l = lboRes.rows[0];
      lboModel = {
        id: l.id,
        targetId: l.target_id,
        modelName: l.model_name,
        entryEbitdaMultiple: Number(l.entry_ebitda_multiple),
        seniorDebtMultiple: Number(l.senior_debt_multiple),
        subordinatedDebtMultiple: Number(l.subordinated_debt_multiple),
        exitEbitdaMultiple: Number(l.exit_ebitda_multiple),
        exitYear: Number(l.exit_year),
        projectedExitEbitdaUsd: Number(l.projected_exit_ebitda_usd),
        sponsorEquityEntryUsd: Number(l.sponsor_equity_entry_usd),
        sponsorEquityExitUsd: Number(l.sponsor_equity_exit_usd),
        sponsorMoic: Number(l.sponsor_moic),
        sponsorIrrPercent: Number(l.sponsor_irr_percent)
      };
    }

    const synRes = await this.pool.query(
      `SELECT * FROM corpdev_synergy_models WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let synergies: SynergyModelDTO | null = null;
    if (synRes.rowCount && synRes.rowCount > 0) {
      const s = synRes.rows[0];
      synergies = {
        id: s.id,
        targetId: s.target_id,
        annualRunRateCostSynergyUsd: Number(s.annual_run_rate_cost_synergy_usd),
        annualRunRateRevenueSynergyUsd: Number(s.annual_run_rate_revenue_synergy_usd),
        contributionMarginPercent: Number(s.contribution_margin_percent),
        oneTimeCostToAchieveUsd: Number(s.one_time_cost_to_achieve_usd),
        costPhasing: Array.isArray(s.cost_phasing) ? s.cost_phasing.map(Number) : [0.3, 0.7, 1.0, 1.0],
        revenuePhasing: Array.isArray(s.revenue_phasing) ? s.revenue_phasing.map(Number) : [0.15, 0.5, 0.85, 1.0],
        synergyNpvUsd: Number(s.synergy_npv_usd)
      };
    }

    const ppaRes = await this.pool.query(
      `SELECT * FROM corpdev_purchase_price_allocations WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let ppa: PurchasePriceAllocationDTO | null = null;
    if (ppaRes.rowCount && ppaRes.rowCount > 0) {
      const p = ppaRes.rows[0];
      ppa = {
        id: p.id,
        targetId: p.target_id,
        totalConsiderationUsd: Number(p.total_consideration_usd),
        netTangibleAssetsFairValueUsd: Number(p.net_tangible_assets_fair_value_usd),
        developedTechnologyFairValueUsd: Number(p.developed_technology_fair_value_usd),
        customerRelationshipsFairValueUsd: Number(p.customer_relationships_fair_value_usd),
        trademarksFairValueUsd: Number(p.trademarks_fair_value_usd),
        deferredTaxLiabilityUsd: Number(p.deferred_tax_liability_usd),
        calculatedGoodwillUsd: Number(p.calculated_goodwill_usd)
      };
    }

    const dealRes = await this.pool.query(
      `SELECT * FROM corpdev_deal_structures WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let dealStructure: DealStructuringDTO | null = null;
    if (dealRes.rowCount && dealRes.rowCount > 0) {
      const d = dealRes.rows[0];
      dealStructure = {
        id: d.id,
        targetId: d.target_id,
        cashConsiderationUsd: Number(d.cash_consideration_usd),
        stockConsiderationUsd: Number(d.stock_consideration_usd),
        earnoutConsiderationUsd: Number(d.earnout_consideration_usd),
        rolloverEquityUsd: Number(d.rollover_equity_usd),
        cashPercent: Number(d.cash_percent),
        stockPercent: Number(d.stock_percent),
        collarUpperLimitUsd: Number(d.collar_upper_limit_usd),
        collarLowerLimitUsd: Number(d.collar_lower_limit_usd),
        fixedTargetValueUsd: Number(d.fixed_target_value_usd),
        buyerTerminationFeeUsd: Number(d.buyer_termination_fee_usd),
        targetBreakFeeUsd: Number(d.target_break_fee_usd)
      };
    }

    const antiRes = await this.pool.query(
      `SELECT * FROM corpdev_antitrust_clearances WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let antitrust: AntitrustClearanceDTO | null = null;
    if (antiRes.rowCount && antiRes.rowCount > 0) {
      const a = antiRes.rows[0];
      antitrust = {
        id: a.id,
        targetId: a.target_id,
        requiresHsrFiling: a.requires_hsr_filing,
        preMergerHhi: Number(a.pre_merger_hhi),
        postMergerHhi: Number(a.post_merger_hhi),
        deltaHhi: Number(a.delta_hhi),
        secondRequestRiskScore: Number(a.second_request_risk_score),
        filingDate: a.filing_date ? a.filing_date.toISOString().split('T')[0] : null,
        waitingPeriodExpiryDate: a.waiting_period_expiry_date ? a.waiting_period_expiry_date.toISOString().split('T')[0] : null,
        regulatoryCovenant: a.regulatory_covenant,
        clearanceStatus: a.clearance_status
      };
    }

    const pmiRes = await this.pool.query(
      `SELECT * FROM corpdev_pmi_initiatives WHERE target_id = $1 AND user_id = $2 ORDER BY day_target ASC, is_day1_critical DESC`,
      [targetId, userId]
    );
    const pmiInitiatives: PmiInitiativeDTO[] = pmiRes.rows.map((p) => ({
      id: p.id,
      targetId: p.target_id,
      workstream: p.workstream,
      title: p.title,
      owner: p.owner,
      dayTarget: Number(p.day_target),
      isDay1Critical: p.is_day1_critical,
      isCompleted: p.is_completed,
      associatedSynergyUsd: Number(p.associated_synergy_usd)
    }));

    const retRes = await this.pool.query(
      `SELECT * FROM corpdev_talent_retentions WHERE target_id = $1 AND user_id = $2 ORDER BY flight_risk_score DESC`,
      [targetId, userId]
    );
    const talentRetentions: TalentRetentionDTO[] = retRes.rows.map((r) => ({
      id: r.id,
      targetId: r.target_id,
      employeeName: r.employee_name,
      jobTitle: r.job_title,
      department: r.department,
      annualCompensationUsd: Number(r.annual_compensation_usd),
      unvestedEquityUsd: Number(r.unvested_equity_usd),
      flightRiskScore: Number(r.flight_risk_score),
      retentionBonusPoolUsd: Number(r.retention_bonus_pool_usd),
      cliffPeriodMonths: Number(r.cliff_period_months),
      isLocked: r.is_locked
    }));

    const warRes = await this.pool.query(
      `SELECT * FROM corpdev_board_war_rooms WHERE target_id = $1 AND user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [targetId, userId]
    );
    let warRoom: BoardWarRoomDTO | null = null;
    if (warRes.rowCount && warRes.rowCount > 0) {
      const w = warRes.rows[0];
      warRoom = {
        id: w.id,
        targetId: w.target_id,
        dspiScore: Number(w.dspi_score),
        confidenceBand: w.confidence_band,
        vpCorpDevSignoff: {
          signed: w.vp_corp_dev_signed,
          signerName: w.vp_corp_dev_signer_name,
          timestamp: w.vp_corp_dev_signed_at ? w.vp_corp_dev_signed_at.toISOString() : null
        },
        cfoSignoff: {
          signed: w.cfo_signed,
          signerName: w.cfo_signer_name,
          timestamp: w.cfo_signed_at ? w.cfo_signed_at.toISOString() : null
        },
        ceoSignoff: {
          signed: w.ceo_signed,
          signerName: w.ceo_signer_name,
          timestamp: w.ceo_signed_at ? w.ceo_signed_at.toISOString() : null
        },
        form8kItem101Markdown: w.form_8k_item_101_markdown,
        form8kItem201Markdown: w.form_8k_item_201_markdown
      };
    }

    return {
      target,
      vdrStreams,
      findings,
      dcfModel,
      lboModel,
      synergies,
      ppa,
      dealStructure,
      antitrust,
      pmiInitiatives,
      talentRetentions,
      warRoom
    };
  }

  async createTarget(userId: string, input: CreateCorpDevTargetRequestDTO): Promise<CorpDevTargetDTO> {
    await this.ensureSchema();

    const res = await this.pool.query(
      `INSERT INTO corpdev_targets (
        user_id, target_name, code_name, industry_sector, stage,
        strategic_theme, headquarters, employee_count, annual_revenue_usd,
        ebitda_usd, target_enterprise_value_usd, strategic_fit_score,
        nda_signed_date, exclusivity_expiry_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        userId,
        input.targetName,
        input.codeName,
        input.industrySector,
        input.stage || 'sourcing',
        input.strategicTheme,
        input.headquarters,
        input.employeeCount,
        input.annualRevenueUsd,
        input.ebitdaUsd,
        input.targetEnterpriseValueUsd,
        75.0,
        input.ndaSignedDate || null,
        input.exclusivityExpiryDate || null
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      targetName: row.target_name,
      codeName: row.code_name,
      industrySector: row.industry_sector,
      stage: row.stage,
      strategicTheme: row.strategic_theme,
      headquarters: row.headquarters,
      employeeCount: Number(row.employee_count),
      annualRevenueUsd: Number(row.annual_revenue_usd),
      ebitdaUsd: Number(row.ebitda_usd),
      targetEnterpriseValueUsd: Number(row.target_enterprise_value_usd),
      strategicFitScore: Number(row.strategic_fit_score),
      ndaSignedDate: row.nda_signed_date ? row.nda_signed_date.toISOString().split('T')[0] : null,
      exclusivityExpiryDate: row.exclusivity_expiry_date ? row.exclusivity_expiry_date.toISOString().split('T')[0] : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async createFinding(userId: string, input: CreateVdrFindingRequestDTO): Promise<VdrDiligenceFindingDTO> {
    await this.ensureSchema();

    const res = await this.pool.query(
      `INSERT INTO corpdev_diligence_findings (
        user_id, target_id, stream_type, title, description, severity, financial_impact_usd, proposed_remediation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        input.targetId,
        input.streamType,
        input.title,
        input.description,
        input.severity,
        input.financialImpactUsd,
        input.proposedRemediation
      ]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      targetId: row.target_id,
      streamType: row.stream_type,
      title: row.title,
      description: row.description,
      severity: row.severity,
      financialImpactUsd: Number(row.financial_impact_usd),
      proposedRemediation: row.proposed_remediation,
      isResolved: row.is_resolved,
      createdAt: row.created_at.toISOString()
    };
  }

  async simulateDcf(userId: string, input: SimulateDcfRequestDTO): Promise<any> {
    await this.ensureSchema();

    const result = calculateDcfValuation({
      projectedUfcf: input.projectedUfcf,
      waccPercent: input.waccPercent,
      terminalGrowthRatePercent: input.terminalGrowthRatePercent,
      terminalEbitdaMultiple: input.terminalEbitdaMultiple,
      terminalYearEbitdaUsd: input.terminalYearEbitdaUsd,
      netDebtUsd: input.netDebtUsd,
      sharesOutstanding: input.sharesOutstanding
    });

    if (input.targetId) {
      await this.pool.query(
        `UPDATE corpdev_dcf_models
         SET wacc_percent = $1, terminal_growth_rate_percent = $2, terminal_ebitda_multiple = $3,
             enterprise_value_gordon_usd = $4, implied_share_price_usd = $5, updated_at = NOW()
         WHERE target_id = $6 AND user_id = $7`,
        [
          input.waccPercent,
          input.terminalGrowthRatePercent,
          input.terminalEbitdaMultiple,
          result.enterpriseValueGordonUsd,
          result.impliedSharePriceUsd,
          input.targetId,
          userId
        ]
      );
    }

    return result;
  }

  async simulateLbo(userId: string, input: SimulateLboRequestDTO): Promise<any> {
    await this.ensureSchema();

    const result = calculateLboReturns({
      entryEbitdaUsd: input.entryEbitdaUsd,
      entryEbitdaMultiple: input.entryEbitdaMultiple,
      seniorDebtMultiple: input.seniorDebtMultiple,
      subordinatedDebtMultiple: input.subordinatedDebtMultiple,
      exitYear: input.exitYear,
      exitEbitdaMultiple: input.exitEbitdaMultiple,
      projectedExitEbitdaUsd: input.projectedExitEbitdaUsd,
      debtPaydownDuringHoldUsd: input.debtPaydownDuringHoldUsd
    });

    return result;
  }

  async simulateSynergies(userId: string, input: SimulateSynergiesRequestDTO): Promise<any> {
    await this.ensureSchema();

    const result = calculateSynergyNpv({
      annualRunRateCostSynergyUsd: input.annualRunRateCostSynergyUsd,
      annualRunRateRevenueSynergyUsd: input.annualRunRateRevenueSynergyUsd,
      contributionMarginPercent: input.contributionMarginPercent,
      oneTimeCostToAchieveUsd: input.oneTimeCostToAchieveUsd,
      waccPercent: input.waccPercent,
      terminalGrowthRatePercent: input.terminalGrowthRatePercent
    });

    return result;
  }

  async simulateCollar(userId: string, input: SimulateCollarRequestDTO): Promise<any> {
    await this.ensureSchema();

    const result = calculateFloatingCollarExchangeRatio({
      fixedTargetValueUsd: input.fixedTargetValueUsd,
      collarLowerLimitUsd: input.collarLowerLimitUsd,
      collarUpperLimitUsd: input.collarUpperLimitUsd,
      currentBuyerStockPriceUsd: input.currentBuyerStockPriceUsd
    });

    return result;
  }

  async assessAntitrust(userId: string, input: AssessAntitrustRequestDTO): Promise<any> {
    await this.ensureSchema();

    const result = calculateAntitrustSecondRequestRisk({
      buyerMarketSharePercent: input.buyerMarketSharePercent,
      targetMarketSharePercent: input.targetMarketSharePercent,
      industryTotalHhiPreMerger: input.industryTotalHhiPreMerger,
      competitorProtestsPresent: input.competitorProtestsPresent
    });

    return result;
  }

  async lockTalentRetention(userId: string, input: LockTalentRetentionRequestDTO): Promise<TalentRetentionDTO> {
    await this.ensureSchema();

    const res = await this.pool.query(
      `INSERT INTO corpdev_talent_retentions (
        user_id, target_id, employee_name, job_title, department, annual_compensation_usd,
        unvested_equity_usd, flight_risk_score, retention_bonus_pool_usd, cliff_period_months, is_locked
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING *`,
      [
        userId,
        input.targetId,
        input.employeeName,
        input.jobTitle,
        input.department,
        input.annualCompensationUsd,
        input.unvestedEquityUsd,
        input.flightRiskScore,
        input.retentionBonusPoolUsd,
        input.cliffPeriodMonths || 24
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      targetId: r.target_id,
      employeeName: r.employee_name,
      jobTitle: r.job_title,
      department: r.department,
      annualCompensationUsd: Number(r.annual_compensation_usd),
      unvestedEquityUsd: Number(r.unvested_equity_usd),
      flightRiskScore: Number(r.flight_risk_score),
      retentionBonusPoolUsd: Number(r.retention_bonus_pool_usd),
      cliffPeriodMonths: Number(r.cliff_period_months),
      isLocked: r.is_locked
    };
  }

  async executeSignoff(userId: string, targetId: string, input: CorpDevSignoffRequestDTO): Promise<BoardWarRoomDTO> {
    await this.ensureSchema();

    const existing = await this.pool.query(
      `SELECT * FROM corpdev_board_war_rooms WHERE target_id = $1 AND user_id = $2`,
      [targetId, userId]
    );

    if (existing.rowCount === 0) {
      throw new Error('Target Board War Room does not exist');
    }

    const current = existing.rows[0];

    if (input.role === 'vp_corporate_development') {
      await this.pool.query(
        `UPDATE corpdev_board_war_rooms
         SET vp_corp_dev_signed = true, vp_corp_dev_signer_name = $1, vp_corp_dev_signed_at = NOW(), updated_at = NOW()
         WHERE target_id = $2 AND user_id = $3`,
        [input.signerName, targetId, userId]
      );
    } else if (input.role === 'chief_financial_officer') {
      if (!current.vp_corp_dev_signed) {
        throw new Error('VP Corporate Development must sign before Chief Financial Officer');
      }
      await this.pool.query(
        `UPDATE corpdev_board_war_rooms
         SET cfo_signed = true, cfo_signer_name = $1, cfo_signed_at = NOW(), updated_at = NOW()
         WHERE target_id = $2 AND user_id = $3`,
        [input.signerName, targetId, userId]
      );
    } else if (input.role === 'chief_executive_officer') {
      if (!current.cfo_signed) {
        throw new Error('Chief Financial Officer must sign before Chief Executive Officer');
      }
      await this.pool.query(
        `UPDATE corpdev_board_war_rooms
         SET ceo_signed = true, ceo_signer_name = $1, ceo_signed_at = NOW(), updated_at = NOW()
         WHERE target_id = $2 AND user_id = $3`,
        [input.signerName, targetId, userId]
      );
    }

    const updatedRes = await this.pool.query(
      `SELECT * FROM corpdev_board_war_rooms WHERE target_id = $1 AND user_id = $2`,
      [targetId, userId]
    );
    const w = updatedRes.rows[0];

    return {
      id: w.id,
      targetId: w.target_id,
      dspiScore: Number(w.dspi_score),
      confidenceBand: w.confidence_band,
      vpCorpDevSignoff: {
        signed: w.vp_corp_dev_signed,
        signerName: w.vp_corp_dev_signer_name,
        timestamp: w.vp_corp_dev_signed_at ? w.vp_corp_dev_signed_at.toISOString() : null
      },
      cfoSignoff: {
        signed: w.cfo_signed,
        signerName: w.cfo_signer_name,
        timestamp: w.cfo_signed_at ? w.cfo_signed_at.toISOString() : null
      },
      ceoSignoff: {
        signed: w.ceo_signed,
        signerName: w.ceo_signer_name,
        timestamp: w.ceo_signed_at ? w.ceo_signed_at.toISOString() : null
      },
      form8kItem101Markdown: w.form_8k_item_101_markdown,
      form8kItem201Markdown: w.form_8k_item_201_markdown
    };
  }
}
