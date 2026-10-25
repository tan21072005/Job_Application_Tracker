import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type TotalRewardsStudioOverviewDTO,
  type SalaryBandGradeDTO,
  type EmployeeCompensationProfileDTO,
  type JobArchitectureSummaryDTO,
  type ExecutiveLtiGrantDTO,
  type RelativeTsrSimulationRequestDTO,
  type RelativeTsrSimulationResultDTO,
  type EquityDilutionBurnOverviewDTO,
  type Section83bArbitrageRequestDTO,
  type Section83bArbitrageResultDTO,
  type CrossBorderEquityTaxProfileDTO,
  type EquityTaxOverviewDTO,
  type PayEquityCohortRegressionDTO,
  type StatutoryComplianceAuditStatusDTO,
  type PayEquityAuditOverviewDTO,
  type TotalRewardsAlignmentBreakdownDTO,
  type SayOnPayRiskAssessmentDTO,
  type TotalRewardsBoardMemorandumDTO,
  type GenerateCdaBoardMemoRequestDTO,
  type SignoffCdaBoardMemoRequestDTO,
  type TotalRewardsBoardSignoffRole,
  calculateCompaRatio,
  calculateRangePenetration,
  evaluateSalaryCircleStatus,
  simulateRelativeTsrMonteCarlo,
  calculateSection83bTaxArbitrage,
  calculateTotalRewardsAlignmentIndex,
  assessSayOnPayShareholderRisk,
  generateSecItem402CdaMemorandum
} from '@jobtrack/contract';

export class WorkforceTotalRewardsStudioService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tr_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        composite_trai NUMERIC(5, 2) NOT NULL DEFAULT 89.5,
        rating_band VARCHAR(64) NOT NULL DEFAULT 'defensible_compliant',
        say_on_pay_projected_approval_percent NUMERIC(5, 2) NOT NULL DEFAULT 94.2,
        total_headcount INT NOT NULL DEFAULT 1450,
        total_annual_payroll_usd NUMERIC(15, 2) NOT NULL DEFAULT 198500000.00,
        red_circle_employee_count INT NOT NULL DEFAULT 14,
        green_circle_employee_count INT NOT NULL DEFAULT 22,
        current_dilution_overhang_percent NUMERIC(5, 2) NOT NULL DEFAULT 9.8,
        annual_gross_burn_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.85,
        overall_controlled_gender_gap_percent NUMERIC(5, 2) NOT NULL DEFAULT -1.1,
        total_remediation_budget_required_usd NUMERIC(15, 2) NOT NULL DEFAULT 420000.00,
        irc_409a_fmv_per_share_usd NUMERIC(10, 2) NOT NULL DEFAULT 18.50,
        active_83b_timely_filings_count INT NOT NULL DEFAULT 38,
        ceo_to_median_worker_pay_ratio INT NOT NULL DEFAULT 176,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tr_studios_user ON tr_studios(user_id);

      CREATE TABLE IF NOT EXISTS tr_salary_bands (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        level_code VARCHAR(16) NOT NULL,
        level_track VARCHAR(64) NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        job_family VARCHAR(64) NOT NULL,
        compensation_zone VARCHAR(64) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'USD',
        base_salary_min NUMERIC(12, 2) NOT NULL,
        base_salary_mid NUMERIC(12, 2) NOT NULL,
        base_salary_max NUMERIC(12, 2) NOT NULL,
        range_spread_percent NUMERIC(5, 2) NOT NULL,
        geo_differential_factor NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
        purchasing_power_parity_index NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
        target_incentive_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.0,
        equity_target_usd NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
        headcount_count INT NOT NULL DEFAULT 0,
        red_circle_count INT NOT NULL DEFAULT 0,
        green_circle_count INT NOT NULL DEFAULT 0,
        average_compa_ratio NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tr_bands_user_level ON tr_salary_bands(user_id, level_code);

      CREATE TABLE IF NOT EXISTS tr_executive_lti_grants (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        executive_name VARCHAR(255) NOT NULL,
        executive_title VARCHAR(255) NOT NULL,
        grant_date DATE NOT NULL,
        performance_period_years INT NOT NULL DEFAULT 3,
        equity_vehicle VARCHAR(64) NOT NULL,
        vesting_schedule VARCHAR(64) NOT NULL,
        target_units_granted INT NOT NULL,
        grant_price_usd NUMERIC(10, 2) NOT NULL,
        target_grant_value_usd NUMERIC(15, 2) NOT NULL,
        peer_benchmark_index VARCHAR(64) NOT NULL DEFAULT 'sp500_information_technology',
        threshold_payout_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.0,
        target_payout_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.0,
        maximum_payout_percent NUMERIC(5, 2) NOT NULL DEFAULT 200.0,
        negative_tsr_cap_enforced BOOLEAN NOT NULL DEFAULT true,
        dilution_overhang_contribution_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.25,
        projected_vesting_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tr_lti_user_exec ON tr_executive_lti_grants(user_id, executive_name);

      CREATE TABLE IF NOT EXISTS tr_equity_tax_profiles (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        executive_id VARCHAR(128) NOT NULL,
        executive_name VARCHAR(255) NOT NULL,
        citizenship_country VARCHAR(64) NOT NULL,
        resident_country VARCHAR(64) NOT NULL,
        grant_type VARCHAR(64) NOT NULL,
        grant_date DATE NOT NULL,
        vesting_date DATE NOT NULL,
        total_vesting_workdays INT NOT NULL DEFAULT 1000,
        fair_market_value_at_vesting_usd NUMERIC(12, 2) NOT NULL,
        exercise_spread_usd NUMERIC(12, 2) NOT NULL,
        irs_section_83b_status VARCHAR(64) NOT NULL DEFAULT 'filed_timely_acknowledged',
        irs_section_83b_filing_deadline_date DATE NOT NULL,
        iso_alternative_minimum_tax_preference_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        estimated_iso_amt_liability_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        total_withholding_tax_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        jurisdiction_allocations JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tr_tax_user_exec ON tr_equity_tax_profiles(user_id, executive_id);

      CREATE TABLE IF NOT EXISTS tr_pay_equity_audits (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        job_family VARCHAR(64) NOT NULL,
        cohort_headcount INT NOT NULL DEFAULT 0,
        unadjusted_gender_pay_gap_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
        adjusted_gender_pay_gap_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
        r_squared_model_fit NUMERIC(5, 3) NOT NULL DEFAULT 0.85,
        t_statistic NUMERIC(5, 2) NOT NULL DEFAULT 1.2,
        p_value_statistical_significance NUMERIC(5, 3) NOT NULL DEFAULT 0.18,
        is_statistically_significant BOOLEAN NOT NULL DEFAULT false,
        controlling_covariates TEXT[] NOT NULL DEFAULT '{}',
        recommended_remediation_budget_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
        affected_employees_count INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tr_pay_equity_user_family ON tr_pay_equity_audits(user_id, job_family);

      CREATE TABLE IF NOT EXISTS tr_cda_board_memos (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fiscal_year VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        composite_trai NUMERIC(5, 2) NOT NULL,
        rating_band VARCHAR(64) NOT NULL,
        say_on_pay_projected_approval_percent NUMERIC(5, 2) NOT NULL,
        total_executive_lti_pool_budget_usd NUMERIC(15, 2) NOT NULL,
        total_remediation_budget_usd NUMERIC(15, 2) NOT NULL,
        executive_summary_markdown TEXT NOT NULL,
        base_pay_architecture_section TEXT NOT NULL,
        executive_lti_psu_section TEXT NOT NULL,
        equity_tax_409a_section TEXT NOT NULL,
        pay_equity_compliance_section TEXT NOT NULL,
        cda_board_disclosures_section TEXT NOT NULL,
        approved_by_chro_at TIMESTAMPTZ,
        approved_by_cfo_at TIMESTAMPTZ,
        approved_by_comp_chair_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_tr_cda_user_year ON tr_cda_board_memos(user_id, fiscal_year);
    `);
  }

  async ensureDefaults(userId: string): Promise<void> {
    const existing = await this.pool.query(
      `SELECT id FROM tr_studios WHERE user_id = $1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO tr_studios (
        id, user_id, composite_trai, rating_band, say_on_pay_projected_approval_percent,
        total_headcount, total_annual_payroll_usd, red_circle_employee_count, green_circle_employee_count,
        current_dilution_overhang_percent, annual_gross_burn_rate_percent, overall_controlled_gender_gap_percent,
        total_remediation_budget_required_usd, irc_409a_fmv_per_share_usd, active_83b_timely_filings_count,
        ceo_to_median_worker_pay_ratio
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        studioId, userId, 89.5, 'defensible_compliant', 94.2,
        1450, 198500000.00, 14, 22,
        9.8, 1.85, -1.1,
        420000.00, 18.50, 38,
        176
      ]
    );

    const defaultBands = [
      {
        id: crypto.randomUUID(),
        levelCode: 'IC4',
        levelTrack: 'individual_contributor',
        jobTitle: 'Senior Software Engineer',
        jobFamily: 'engineering',
        compensationZone: 'zone_tier_1_bay_area_ny',
        currency: 'USD',
        min: 155000,
        mid: 185000,
        max: 215000,
        spread: 38.7,
        geo: 1.0,
        ppp: 1.0,
        bonus: 15.0,
        equity: 65000,
        headcount: 310,
        red: 4,
        green: 5,
        compa: 99.2
      },
      {
        id: crypto.randomUUID(),
        levelCode: 'IC5',
        levelTrack: 'individual_contributor',
        jobTitle: 'Staff Software Engineer / Tech Lead',
        jobFamily: 'engineering',
        compensationZone: 'zone_tier_1_bay_area_ny',
        currency: 'USD',
        min: 195000,
        mid: 235000,
        max: 275000,
        spread: 41.0,
        geo: 1.0,
        ppp: 1.0,
        bonus: 20.0,
        equity: 120000,
        headcount: 145,
        red: 2,
        green: 3,
        compa: 98.8
      },
      {
        id: crypto.randomUUID(),
        levelCode: 'M3',
        levelTrack: 'management',
        jobTitle: 'Engineering Manager',
        jobFamily: 'engineering',
        compensationZone: 'zone_tier_2_seattle_austin_london',
        currency: 'USD',
        min: 180000,
        mid: 215000,
        max: 250000,
        spread: 38.9,
        geo: 0.90,
        ppp: 0.92,
        bonus: 25.0,
        equity: 95000,
        headcount: 48,
        red: 1,
        green: 2,
        compa: 100.5
      },
      {
        id: crypto.randomUUID(),
        levelCode: 'IC6',
        levelTrack: 'individual_contributor',
        jobTitle: 'Principal Software Architect',
        jobFamily: 'engineering',
        compensationZone: 'zone_tier_1_bay_area_ny',
        currency: 'USD',
        min: 240000,
        mid: 290000,
        max: 340000,
        spread: 41.7,
        geo: 1.0,
        ppp: 1.0,
        bonus: 25.0,
        equity: 210000,
        headcount: 32,
        red: 1,
        green: 1,
        compa: 97.4
      }
    ];

    for (const b of defaultBands) {
      await this.pool.query(
        `INSERT INTO tr_salary_bands (
          id, user_id, level_code, level_track, job_title, job_family, compensation_zone,
          currency, base_salary_min, base_salary_mid, base_salary_max, range_spread_percent,
          geo_differential_factor, purchasing_power_parity_index, target_incentive_bonus_percent,
          equity_target_usd, headcount_count, red_circle_count, green_circle_count, average_compa_ratio
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          b.id, userId, b.levelCode, b.levelTrack, b.jobTitle, b.jobFamily, b.compensationZone,
          b.currency, b.min, b.mid, b.max, b.spread,
          b.geo, b.ppp, b.bonus,
          b.equity, b.headcount, b.red, b.green, b.compa
        ]
      );
    }

    const defaultGrants = [
      {
        id: crypto.randomUUID(),
        executiveName: 'Eleanor Vance',
        executiveTitle: 'Chief Executive Officer',
        grantDate: '2026-01-15',
        years: 3,
        vehicle: 'performance_share_units',
        vesting: 'three_year_annual_cliff_psu',
        units: 250000,
        price: 18.50,
        val: 4625000,
        peer: 'sp500_information_technology',
        pMin: 50.0,
        pMid: 100.0,
        pMax: 200.0,
        cap: true,
        dilution: 0.25,
        vestDate: '2029-01-15'
      },
      {
        id: crypto.randomUUID(),
        executiveName: 'Marcus Sterling',
        executiveTitle: 'Chief Technology Officer',
        grantDate: '2026-01-15',
        years: 3,
        vehicle: 'performance_share_units',
        vesting: 'three_year_annual_cliff_psu',
        units: 140000,
        price: 18.50,
        val: 2590000,
        peer: 'sp500_information_technology',
        pMin: 50.0,
        pMid: 100.0,
        pMax: 200.0,
        cap: true,
        dilution: 0.14,
        vestDate: '2029-01-15'
      }
    ];

    for (const g of defaultGrants) {
      await this.pool.query(
        `INSERT INTO tr_executive_lti_grants (
          id, user_id, executive_name, executive_title, grant_date, performance_period_years,
          equity_vehicle, vesting_schedule, target_units_granted, grant_price_usd, target_grant_value_usd,
          peer_benchmark_index, threshold_payout_percent, target_payout_percent, maximum_payout_percent,
          negative_tsr_cap_enforced, dilution_overhang_contribution_percent, projected_vesting_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          g.id, userId, g.executiveName, g.executiveTitle, g.grantDate, g.years,
          g.vehicle, g.vesting, g.units, g.price, g.val,
          g.peer, g.pMin, g.pMid, g.pMax,
          g.cap, g.dilution, g.vestDate
        ]
      );
    }

    const defaultTax = [
      {
        id: crypto.randomUUID(),
        execId: 'exec-01',
        execName: 'Eleanor Vance',
        citizen: 'United States',
        resident: 'United States',
        vehicle: 'performance_share_units',
        gDate: '2024-01-15',
        vDate: '2027-01-15',
        workdays: 1000,
        fmvVest: 28.50,
        spread: 10.00,
        status: 'filed_timely_acknowledged',
        deadline: '2024-02-14',
        amtPref: 0.0,
        amtLiab: 0.0,
        withholding: 185000.00,
        alloc: [
          {
            jurisdictionCode: 'US-CA',
            jurisdictionName: 'California, US',
            workdaysInJurisdiction: 700,
            allocationPercent: 70.0,
            localMarginalWithholdingRatePercent: 49.3,
            allocatedTaxableGainUsd: 1400000,
            estimatedWithholdingTaxUsd: 690200
          },
          {
            jurisdictionCode: 'UK',
            jurisdictionName: 'United Kingdom',
            workdaysInJurisdiction: 300,
            allocationPercent: 30.0,
            localMarginalWithholdingRatePercent: 45.0,
            allocatedTaxableGainUsd: 600000,
            estimatedWithholdingTaxUsd: 270000
          }
        ]
      }
    ];

    for (const t of defaultTax) {
      await this.pool.query(
        `INSERT INTO tr_equity_tax_profiles (
          id, user_id, executive_id, executive_name, citizenship_country, resident_country,
          grant_type, grant_date, vesting_date, total_vesting_workdays, fair_market_value_at_vesting_usd,
          exercise_spread_usd, irs_section_83b_status, irs_section_83b_filing_deadline_date,
          iso_alternative_minimum_tax_preference_usd, estimated_iso_amt_liability_usd,
          total_withholding_tax_usd, jurisdiction_allocations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          t.id, userId, t.execId, t.execName, t.citizen, t.resident,
          t.vehicle, t.gDate, t.vDate, t.workdays, t.fmvVest,
          t.spread, t.status, t.deadline,
          t.amtPref, t.amtLiab,
          t.withholding, JSON.stringify(t.alloc)
        ]
      );
    }

    const defaultAudits = [
      {
        id: crypto.randomUUID(),
        family: 'engineering',
        headcount: 580,
        unadj: -6.2,
        adj: -1.2,
        r2: 0.88,
        tStat: 1.42,
        pVal: 0.16,
        sig: false,
        cov: ['tenure_years', 'job_level_rank', 'performance_rating', 'location_tier_factor'],
        budget: 185000,
        affected: 14
      },
      {
        id: crypto.randomUUID(),
        family: 'product_design',
        headcount: 210,
        unadj: -4.8,
        adj: -0.9,
        r2: 0.85,
        tStat: 1.10,
        pVal: 0.27,
        sig: false,
        cov: ['tenure_years', 'job_level_rank', 'performance_rating', 'location_tier_factor'],
        budget: 65000,
        affected: 6
      }
    ];

    for (const a of defaultAudits) {
      await this.pool.query(
        `INSERT INTO tr_pay_equity_audits (
          id, user_id, job_family, cohort_headcount, unadjusted_gender_pay_gap_percent,
          adjusted_gender_pay_gap_percent, r_squared_model_fit, t_statistic,
          p_value_statistical_significance, is_statistically_significant, controlling_covariates,
          recommended_remediation_budget_usd, affected_employees_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          a.id, userId, a.family, a.headcount, a.unadj,
          a.adj, a.r2, a.tStat,
          a.pVal, a.sig, a.cov,
          a.budget, a.affected
        ]
      );
    }

    const initialMemoId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO tr_cda_board_memos (
        id, user_id, fiscal_year, title, status, composite_trai, rating_band,
        say_on_pay_projected_approval_percent, total_executive_lti_pool_budget_usd,
        total_remediation_budget_usd, executive_summary_markdown, base_pay_architecture_section,
        executive_lti_psu_section, equity_tax_409a_section, pay_equity_compliance_section,
        cda_board_disclosures_section
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        initialMemoId, userId, 'FY2026', 'Executive Total Rewards Alignment & SEC CD&A Briefing',
        'draft', 89.5, 'defensible_compliant', 94.2, 12500000.00, 420000.00,
        'Executive Total Rewards summary overview', 'Base Pay Grade IC1-IC8/M1-M6 architecture overview',
        'Stochastic rTSR PSU grant simulation overview', 'Section 409A and 83(b) tax optimization review',
        'Pay equity and EU Pay Transparency compliance audit', 'Board SEC Item 402 compensation disclosures'
      ]
    );
  }

  async getOverview(userId: string): Promise<TotalRewardsStudioOverviewDTO> {
    await this.ensureSchema();
    await this.ensureDefaults(userId);

    const studioRes = await this.pool.query(
      `SELECT * FROM tr_studios WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const studio = studioRes.rows[0];

    const bandsRes = await this.pool.query(
      `SELECT * FROM tr_salary_bands WHERE user_id = $1 ORDER BY level_code ASC`,
      [userId]
    );
    const salaryBands: SalaryBandGradeDTO[] = bandsRes.rows.map((r) => ({
      id: r.id,
      levelCode: r.level_code,
      levelTrack: r.level_track,
      jobTitle: r.job_title,
      jobFamily: r.job_family,
      compensationZone: r.compensation_zone,
      currency: r.currency,
      baseSalaryMin: Number(r.base_salary_min),
      baseSalaryMid: Number(r.base_salary_mid),
      baseSalaryMax: Number(r.base_salary_max),
      rangeSpreadPercent: Number(r.range_spread_percent),
      geoDifferentialFactor: Number(r.geo_differential_factor),
      purchasingPowerParityIndex: Number(r.purchasing_power_parity_index),
      targetIncentiveBonusPercent: Number(r.target_incentive_bonus_percent),
      equityTargetUsd: Number(r.equity_target_usd),
      headcountCount: r.headcount_count,
      redCircleCount: r.red_circle_count,
      greenCircleCount: r.green_circle_count,
      averageCompaRatio: Number(r.average_compa_ratio)
    }));

    const sampleProfiles: EmployeeCompensationProfileDTO[] = [
      {
        id: 'emp-001',
        employeeNumber: 'E-10492',
        fullName: 'Alexander Wright',
        email: 'alexander.wright@jobtrack.enterprise',
        jobTitle: 'Senior Software Engineer',
        jobFamily: 'engineering',
        levelCode: 'IC4',
        compensationZone: 'zone_tier_1_bay_area_ny',
        country: 'United States',
        currency: 'USD',
        currentBaseSalary: 182000,
        salaryBandMidpoint: 185000,
        compaRatioPercent: calculateCompaRatio(182000, 185000),
        rangePenetrationPercent: calculateRangePenetration(182000, 155000, 215000),
        salaryCircleStatus: evaluateSalaryCircleStatus(182000, 155000, 215000),
        gender: 'male',
        ethnicity: 'Caucasian',
        tenureYears: 3.5,
        performanceRating: 4.2,
        lastMeritIncreasePercent: 4.5
      },
      {
        id: 'emp-002',
        employeeNumber: 'E-10884',
        fullName: 'Maya Lin',
        email: 'maya.lin@jobtrack.enterprise',
        jobTitle: 'Staff Software Engineer / Tech Lead',
        jobFamily: 'engineering',
        levelCode: 'IC5',
        compensationZone: 'zone_tier_1_bay_area_ny',
        country: 'United States',
        currency: 'USD',
        currentBaseSalary: 232000,
        salaryBandMidpoint: 235000,
        compaRatioPercent: calculateCompaRatio(232000, 235000),
        rangePenetrationPercent: calculateRangePenetration(232000, 195000, 275000),
        salaryCircleStatus: evaluateSalaryCircleStatus(232000, 195000, 275000),
        gender: 'female',
        ethnicity: 'Asian',
        tenureYears: 4.8,
        performanceRating: 4.7,
        lastMeritIncreasePercent: 5.0
      }
    ];

    const ltiRes = await this.pool.query(
      `SELECT * FROM tr_executive_lti_grants WHERE user_id = $1 ORDER BY grant_date DESC`,
      [userId]
    );
    const executiveGrants: ExecutiveLtiGrantDTO[] = ltiRes.rows.map((r) => ({
      id: r.id,
      executiveName: r.executive_name,
      executiveTitle: r.executive_title,
      grantDate: typeof r.grant_date === 'string' ? r.grant_date : r.grant_date.toISOString().split('T')[0],
      performancePeriodYears: r.performance_period_years,
      equityVehicle: r.equity_vehicle,
      vestingSchedule: r.vesting_schedule,
      targetUnitsGranted: r.target_units_granted,
      grantPriceUsd: Number(r.grant_price_usd),
      targetGrantValueUsd: Number(r.target_grant_value_usd),
      peerBenchmarkIndex: r.peer_benchmark_index,
      thresholdPayoutPercent: Number(r.threshold_payout_percent),
      targetPayoutPercent: Number(r.target_payout_percent),
      maximumPayoutPercent: Number(r.maximum_payout_percent),
      negativeTsrCapEnforced: r.negative_tsr_cap_enforced,
      dilutionOverhangContributionPercent: Number(r.dilution_overhang_contribution_percent),
      projectedVestingDate: typeof r.projected_vesting_date === 'string' ? r.projected_vesting_date : r.projected_vesting_date.toISOString().split('T')[0]
    }));

    const taxRes = await this.pool.query(
      `SELECT * FROM tr_equity_tax_profiles WHERE user_id = $1 ORDER BY grant_date DESC`,
      [userId]
    );
    const taxProfiles: CrossBorderEquityTaxProfileDTO[] = taxRes.rows.map((r) => ({
      id: r.id,
      executiveId: r.executive_id,
      executiveName: r.executive_name,
      citizenshipCountry: r.citizenship_country,
      residentCountry: r.resident_country,
      grantType: r.grant_type,
      grantDate: typeof r.grant_date === 'string' ? r.grant_date : r.grant_date.toISOString().split('T')[0],
      vestingDate: typeof r.vesting_date === 'string' ? r.vesting_date : r.vesting_date.toISOString().split('T')[0],
      totalVestingWorkdays: r.total_vesting_workdays,
      fairMarketValueAtVestingUsd: Number(r.fair_market_value_at_vesting_usd),
      exerciseSpreadUsd: Number(r.exercise_spread_usd),
      irsSection83bStatus: r.irs_section_83b_status,
      irsSection83bFilingDeadlineDate: typeof r.irs_section_83b_filing_deadline_date === 'string' ? r.irs_section_83b_filing_deadline_date : r.irs_section_83b_filing_deadline_date.toISOString().split('T')[0],
      isoAlternativeMinimumTaxPreferenceUsd: Number(r.iso_alternative_minimum_tax_preference_usd),
      estimatedIsoAmtLiabilityUsd: Number(r.estimated_iso_amt_liability_usd),
      totalWithholdingTaxUsd: Number(r.total_withholding_tax_usd),
      jurisdictionAllocations: Array.isArray(r.jurisdiction_allocations) ? r.jurisdiction_allocations : JSON.parse(r.jurisdiction_allocations || '[]')
    }));

    const auditsRes = await this.pool.query(
      `SELECT * FROM tr_pay_equity_audits WHERE user_id = $1 ORDER BY cohort_headcount DESC`,
      [userId]
    );
    const cohortRegressions: PayEquityCohortRegressionDTO[] = auditsRes.rows.map((r) => ({
      jobFamily: r.job_family,
      cohortHeadcount: r.cohort_headcount,
      unadjustedGenderPayGapPercent: Number(r.unadjusted_gender_pay_gap_percent),
      adjustedGenderPayGapPercent: Number(r.adjusted_gender_pay_gap_percent),
      rSquaredModelFit: Number(r.r_squared_model_fit),
      tStatistic: Number(r.t_statistic),
      pValueStatisticalSignificance: Number(r.p_value_statistical_significance),
      isStatisticallySignificant: r.is_statistically_significant,
      controllingCovariates: Array.isArray(r.controlling_covariates) ? r.controlling_covariates : [],
      recommendedRemediationBudgetUsd: Number(r.recommended_remediation_budget_usd),
      affectedEmployeesCount: r.affected_employees_count
    }));

    const statutoryAudits: StatutoryComplianceAuditStatusDTO[] = [
      {
        framework: 'eu_pay_transparency_directive',
        jurisdictionRegion: 'European Union (All EU Member Entities)',
        mandatoryReportingDeadline: '2026-06-07',
        statutoryThresholdPayGapPercent: 5.0,
        measuredEntityPayGapPercent: 1.2,
        complianceVerdict: 'fully_compliant',
        penaltyExposureRiskUsd: 0,
        remediationActionPlanRequired: false
      },
      {
        framework: 'california_sb_1162',
        jurisdictionRegion: 'California, US',
        mandatoryReportingDeadline: '2026-05-13',
        statutoryThresholdPayGapPercent: 0.0,
        measuredEntityPayGapPercent: 1.1,
        complianceVerdict: 'fully_compliant',
        penaltyExposureRiskUsd: 0,
        remediationActionPlanRequired: false
      }
    ];

    const memosRes = await this.pool.query(
      `SELECT * FROM tr_cda_board_memos WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [userId]
    );
    const recentMemos: TotalRewardsBoardMemorandumDTO[] = memosRes.rows.map((r) => ({
      id: r.id,
      fiscalYear: r.fiscal_year,
      title: r.title,
      status: r.status,
      compositeTrai: Number(r.composite_trai),
      ratingBand: r.rating_band,
      sayOnPayProjectedApprovalPercent: Number(r.say_on_pay_projected_approval_percent),
      totalExecutiveLtiPoolBudgetUsd: Number(r.total_executive_lti_pool_budget_usd),
      totalRemediationBudgetUsd: Number(r.total_remediation_budget_usd),
      executiveSummaryMarkdown: r.executive_summary_markdown,
      basePayArchitectureSection: r.base_pay_architecture_section,
      executiveLtiPsuSection: r.executive_lti_psu_section,
      equityTax409aSection: r.equity_tax_409a_section,
      payEquityComplianceSection: r.pay_equity_compliance_section,
      cdaBoardDisclosuresSection: r.cda_board_disclosures_section,
      approvedByChroAt: r.approved_by_chro_at ? new Date(r.approved_by_chro_at).toISOString() : undefined,
      approvedByCfoAt: r.approved_by_cfo_at ? new Date(r.approved_by_cfo_at).toISOString() : undefined,
      approvedByCompChairAt: r.approved_by_comp_chair_at ? new Date(r.approved_by_comp_chair_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const alignmentBreakdown: TotalRewardsAlignmentBreakdownDTO = calculateTotalRewardsAlignmentIndex({
      basePayRangeDisciplineScore: 90,
      payForPerformanceSensitivityScore: 88,
      equityDilutionBurnHealthScore: 91,
      payEquityStatutoryComplianceScore: 92,
      taxOptimizationGovernanceScore: 87
    });

    const sayOnPayAssessment: SayOnPayRiskAssessmentDTO = assessSayOnPayShareholderRisk({
      ceoToMedianWorkerRatio: Number(studio.ceo_to_median_worker_pay_ratio),
      threeYearGrossBurnRatePercent: Number(studio.annual_gross_burn_rate_percent),
      dilutionOverhangPercent: Number(studio.current_dilution_overhang_percent),
      controlledGenderGapPercent: Number(studio.overall_controlled_gender_gap_percent),
      payVsTsrAlignmentScore: 88
    });

    const jobArchitectureSummary: JobArchitectureSummaryDTO = {
      totalHeadcount: studio.total_headcount,
      totalAnnualPayrollUsd: Number(studio.total_annual_payroll_usd),
      globalAverageCompaRatio: 98.4,
      redCircleEmployeeCount: studio.red_circle_employee_count,
      greenCircleEmployeeCount: studio.green_circle_employee_count,
      totalSalaryBandsConfigured: salaryBands.length,
      averageRangeSpreadPercent: 40.1,
      salaryBands,
      sampleProfiles
    };

    const equityDilutionOverview: EquityDilutionBurnOverviewDTO = {
      totalCommonSharesOutstanding: 100000000,
      totalUnvestedRestrictedShares: 4500000,
      totalOptionsOutstandingExercisable: 2300000,
      availableSharePoolRemaining: 3000000,
      currentDilutionOverhangPercent: Number(studio.current_dilution_overhang_percent),
      maxApprovedOverhangLimitPercent: 12.0,
      annualGrossBurnRatePercent: Number(studio.annual_gross_burn_rate_percent),
      annualNetBurnRatePercent: 1.55,
      threeYearAverageGrossBurnRatePercent: 1.9,
      burnRateComplianceStatus: 'compliant_defensible',
      executiveGrants
    };

    const taxOverview: EquityTaxOverviewDTO = {
      currentIrc409aFmvPerShareUsd: Number(studio.irc_409a_fmv_per_share_usd),
      last409aValuationDate: '2026-03-31',
      daysUntil409aExpiry: 156,
      active83bFilingsCount: studio.active_83b_timely_filings_count,
      pending83bDeadlineFilingsCount: 4,
      missed83bDeadlineCount: 0,
      totalIsoAmtPreferenceTrackedUsd: 1250000,
      crossBorderMobileEmployeesTracked: 18,
      taxProfiles
    };

    const payEquityOverview: PayEquityAuditOverviewDTO = {
      overallEnterpriseUnadjustedGenderGapPercent: -5.8,
      overallEnterpriseControlledGenderGapPercent: Number(studio.overall_controlled_gender_gap_percent),
      overallEnterpriseControlledEthnicityGapPercent: -0.7,
      totalRemediationBudgetRequiredUsd: Number(studio.total_remediation_budget_required_usd),
      totalRemediatedEmployeesCount: 31,
      cohortRegressions,
      statutoryAudits
    };

    return {
      compositeTrai: Number(studio.composite_trai),
      ratingBand: studio.rating_band,
      sayOnPayProjectedApprovalPercent: Number(studio.say_on_pay_projected_approval_percent),
      totalHeadcount: studio.total_headcount,
      totalAnnualPayrollUsd: Number(studio.total_annual_payroll_usd),
      redCircleEmployeeCount: studio.red_circle_employee_count,
      greenCircleEmployeeCount: studio.green_circle_employee_count,
      currentDilutionOverhangPercent: Number(studio.current_dilution_overhang_percent),
      annualGrossBurnRatePercent: Number(studio.annual_gross_burn_rate_percent),
      overallEnterpriseControlledGenderGapPercent: Number(studio.overall_controlled_gender_gap_percent),
      totalRemediationBudgetRequiredUsd: Number(studio.total_remediation_budget_required_usd),
      irc409aFmvPerShareUsd: Number(studio.irc_409a_fmv_per_share_usd),
      active83bTimelyFilingsCount: studio.active_83b_timely_filings_count,
      ceoToMedianWorkerPayRatio: studio.ceo_to_median_worker_pay_ratio,
      alignmentBreakdown,
      sayOnPayAssessment,
      jobArchitectureSummary,
      equityDilutionOverview,
      taxOverview,
      payEquityOverview,
      recentMemos
    };
  }

  async simulateRelativeTsr(
    userId: string,
    input: RelativeTsrSimulationRequestDTO
  ): Promise<RelativeTsrSimulationResultDTO> {
    await this.ensureSchema();
    await this.ensureDefaults(userId);
    return simulateRelativeTsrMonteCarlo(input);
  }

  async optimizeEquityTax(
    userId: string,
    input: Section83bArbitrageRequestDTO
  ): Promise<Section83bArbitrageResultDTO> {
    await this.ensureSchema();
    await this.ensureDefaults(userId);
    return calculateSection83bTaxArbitrage(input);
  }

  async generateBoardMemo(
    userId: string,
    input: GenerateCdaBoardMemoRequestDTO
  ): Promise<TotalRewardsBoardMemorandumDTO> {
    const overview = await this.getOverview(userId);
    const memoId = crypto.randomUUID();
    const markdown = generateSecItem402CdaMemorandum({
      title: input.title,
      fiscalYear: input.fiscalYear,
      overview
    });

    const now = new Date().toISOString();
    await this.pool.query(
      `INSERT INTO tr_cda_board_memos (
        id, user_id, fiscal_year, title, status, composite_trai, rating_band,
        say_on_pay_projected_approval_percent, total_executive_lti_pool_budget_usd,
        total_remediation_budget_usd, executive_summary_markdown, base_pay_architecture_section,
        executive_lti_psu_section, equity_tax_409a_section, pay_equity_compliance_section,
        cda_board_disclosures_section
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        memoId, userId, input.fiscalYear, input.title, 'draft',
        overview.compositeTrai, overview.ratingBand, overview.sayOnPayProjectedApprovalPercent,
        12500000.00, overview.totalRemediationBudgetRequiredUsd,
        markdown,
        'Base Pay Grade IC1-IC8/M1-M6 architecture overview',
        'Stochastic rTSR PSU grant simulation overview',
        'Section 409A and 83(b) tax optimization review',
        'Pay equity and EU Pay Transparency compliance audit',
        'Board SEC Item 402 compensation disclosures'
      ]
    );

    return {
      id: memoId,
      fiscalYear: input.fiscalYear,
      title: input.title,
      status: 'draft',
      compositeTrai: overview.compositeTrai,
      ratingBand: overview.ratingBand,
      sayOnPayProjectedApprovalPercent: overview.sayOnPayProjectedApprovalPercent,
      totalExecutiveLtiPoolBudgetUsd: 12500000.00,
      totalRemediationBudgetUsd: overview.totalRemediationBudgetRequiredUsd,
      executiveSummaryMarkdown: markdown,
      basePayArchitectureSection: 'Base Pay Grade IC1-IC8/M1-M6 architecture overview',
      executiveLtiPsuSection: 'Stochastic rTSR PSU grant simulation overview',
      equityTax409aSection: 'Section 409A and 83(b) tax optimization review',
      payEquityComplianceSection: 'Pay equity and EU Pay Transparency compliance audit',
      cdaBoardDisclosuresSection: 'Board SEC Item 402 compensation disclosures',
      createdAt: now,
      updatedAt: now
    };
  }

  async signoffBoardMemo(
    userId: string,
    memoId: string,
    input: SignoffCdaBoardMemoRequestDTO
  ): Promise<TotalRewardsBoardMemorandumDTO> {
    await this.ensureSchema();
    const memoRes = await this.pool.query(
      `SELECT * FROM tr_cda_board_memos WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [memoId, userId]
    );
    if (memoRes.rows.length === 0) {
      throw new Error(`Board memorandum ${memoId} not found`);
    }

    const row = memoRes.rows[0];
    const now = new Date();

    let approvedChro = row.approved_by_chro_at;
    let approvedCfo = row.approved_by_cfo_at;
    let approvedChair = row.approved_by_comp_chair_at;

    if (input.role === 'chief_human_resources_officer') {
      approvedChro = now;
    } else if (input.role === 'chief_financial_officer') {
      approvedCfo = now;
    } else if (input.role === 'board_compensation_chair') {
      approvedChair = now;
    }

    let status = 'under_review';
    if (approvedChro && approvedCfo && approvedChair) {
      status = 'committee_approved';
    }

    await this.pool.query(
      `UPDATE tr_cda_board_memos
       SET status = $1, approved_by_chro_at = $2, approved_by_cfo_at = $3,
           approved_by_comp_chair_at = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6`,
      [status, approvedChro, approvedCfo, approvedChair, memoId, userId]
    );

    return {
      id: row.id,
      fiscalYear: row.fiscal_year,
      title: row.title,
      status: status as any,
      compositeTrai: Number(row.composite_trai),
      ratingBand: row.rating_band,
      sayOnPayProjectedApprovalPercent: Number(row.say_on_pay_projected_approval_percent),
      totalExecutiveLtiPoolBudgetUsd: Number(row.total_executive_lti_pool_budget_usd),
      totalRemediationBudgetUsd: Number(row.total_remediation_budget_usd),
      executiveSummaryMarkdown: row.executive_summary_markdown,
      basePayArchitectureSection: row.base_pay_architecture_section,
      executiveLtiPsuSection: row.executive_lti_psu_section,
      equityTax409aSection: row.equity_tax_409a_section,
      payEquityComplianceSection: row.pay_equity_compliance_section,
      cdaBoardDisclosuresSection: row.cda_board_disclosures_section,
      approvedByChroAt: approvedChro ? new Date(approvedChro).toISOString() : undefined,
      approvedByCfoAt: approvedCfo ? new Date(approvedCfo).toISOString() : undefined,
      approvedByCompChairAt: approvedChair ? new Date(approvedChair).toISOString() : undefined,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}
