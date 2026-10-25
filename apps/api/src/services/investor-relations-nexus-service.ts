import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ShareClassType,
  type InstitutionalInvestorType,
  type SecFilingType,
  type AvisRiskLevel,
  type EarningsTimingType,
  type MeetingFormatType,
  type CapitalFinancingType,
  type IsiAlignmentBand,
  type IrSignoffRole,
  type Form8KStatus,
  type CapTableShareClassDTO,
  type InstitutionalShareholderDTO,
  type Rule10b51PlanDTO,
  type ActivistVulnerabilityDTO,
  type SellSideConsensusMetricDTO,
  type NonGaapReconciliationItemDTO,
  type EarningsCycleDTO,
  type InvestorConferenceDTO,
  type NdrInvestorMeetingDTO,
  type CapitalScenarioDTO,
  type ShareRepurchaseProgramDTO,
  type SecForm8KSignoffDTO,
  type SecForm8KDisclosureDTO,
  type InvestorRelationsOverviewDTO,
  type SimulateActivistRequestDTO,
  type ActivistVulnerabilityResultDTO,
  type NonGaapReconciliationRequestDTO,
  type NonGaapReconciliationResultDTO,
  type LogNdrMeetingRequestDTO,
  type SimulateCapitalScenarioRequestDTO,
  type CapitalScenarioResultDTO,
  type GenerateForm8KRequestDTO,
  type SignoffForm8KRequestDTO,
  calculateAVIS,
  calculateWACC,
  calculateEPSAccretionDilution,
  calculateRule10b18DailyLimit,
  calculateISI,
  generateSecForm8KDisclosure
} from '@jobtrack/contract';

export class InvestorRelationsNexusService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ir_nexus_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL DEFAULT 'JobTrack Enterprise Technologies Inc.',
        ticker_symbol VARCHAR(16) NOT NULL DEFAULT 'JBTR',
        stock_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 64.50,
        market_cap_usd NUMERIC(16, 2) NOT NULL DEFAULT 4837500000.00,
        shares_outstanding BIGINT NOT NULL DEFAULT 75000000,
        public_float_shares BIGINT NOT NULL DEFAULT 58500000,
        composite_isi_score NUMERIC(5, 2) NOT NULL DEFAULT 84.50,
        isi_band VARCHAR(64) NOT NULL DEFAULT 'strong_institutional_conviction',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_ir_studio_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS ir_cap_table_classes (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        share_class_name VARCHAR(64) NOT NULL,
        share_class_type VARCHAR(64) NOT NULL,
        shares_authorized BIGINT NOT NULL,
        shares_outstanding BIGINT NOT NULL,
        votes_per_share INT NOT NULL DEFAULT 1,
        par_value_usd NUMERIC(8, 4) NOT NULL DEFAULT 0.0001,
        is_publicly_traded BOOLEAN NOT NULL DEFAULT TRUE,
        cusip VARCHAR(16) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_institutional_shareholders (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        institution_name VARCHAR(255) NOT NULL,
        investor_type VARCHAR(64) NOT NULL,
        shares_held BIGINT NOT NULL,
        percent_ownership NUMERIC(6, 2) NOT NULL,
        voting_power_percent NUMERIC(6, 2) NOT NULL,
        filing_type VARCHAR(32) NOT NULL,
        filing_date DATE NOT NULL,
        portfolio_weight_percent NUMERIC(5, 2) NOT NULL,
        quarterly_change_shares BIGINT NOT NULL DEFAULT 0,
        is_known_activist BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_insider_10b51_plans (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        insider_name VARCHAR(255) NOT NULL,
        insider_title VARCHAR(128) NOT NULL,
        adoption_date DATE NOT NULL,
        cooling_off_expiry_date DATE NOT NULL,
        total_planned_shares INT NOT NULL,
        executed_shares INT NOT NULL DEFAULT 0,
        remaining_shares INT NOT NULL,
        expiration_date DATE NOT NULL,
        is_compliant BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_earnings_cycles (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fiscal_quarter VARCHAR(16) NOT NULL,
        earnings_release_date DATE NOT NULL,
        timing VARCHAR(32) NOT NULL,
        quiet_period_start_date DATE NOT NULL,
        is_quiet_period_active BOOLEAN NOT NULL DEFAULT FALSE,
        webcast_url VARCHAR(512) NOT NULL,
        safe_harbor_script TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_consensus_guidance_metrics (
        id UUID PRIMARY KEY,
        cycle_id UUID NOT NULL REFERENCES ir_earnings_cycles(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        metric_name VARCHAR(64) NOT NULL,
        consensus_mean NUMERIC(14, 2) NOT NULL,
        consensus_median NUMERIC(14, 2) NOT NULL,
        consensus_high NUMERIC(14, 2) NOT NULL,
        consensus_low NUMERIC(14, 2) NOT NULL,
        analyst_count INT NOT NULL DEFAULT 12,
        guidance_midpoint NUMERIC(14, 2) NOT NULL,
        guidance_variance_percent NUMERIC(6, 2) NOT NULL,
        unit VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_non_gaap_reconciliations (
        id UUID PRIMARY KEY,
        cycle_id UUID NOT NULL REFERENCES ir_earnings_cycles(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        line_item_name VARCHAR(64) NOT NULL,
        gaap_amount_usd NUMERIC(14, 2) NOT NULL,
        adjustments_usd NUMERIC(14, 2) NOT NULL,
        non_gaap_amount_usd NUMERIC(14, 2) NOT NULL,
        adjustment_details_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_conferences_docket (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conference_name VARCHAR(255) NOT NULL,
        host_broker VARCHAR(128) NOT NULL,
        location VARCHAR(128) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        executive_attendees TEXT[] NOT NULL DEFAULT '{}',
        confirmed_meetings_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_ndr_investor_meetings (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conference_id UUID REFERENCES ir_conferences_docket(id) ON DELETE SET NULL,
        institution_name VARCHAR(255) NOT NULL,
        lead_investor_name VARCHAR(128) NOT NULL,
        investor_type VARCHAR(64) NOT NULL,
        meeting_date DATE NOT NULL,
        meeting_format VARCHAR(64) NOT NULL,
        executive_attendees TEXT[] NOT NULL DEFAULT '{}',
        sentiment_score NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
        key_topics_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        follow_ups_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_capital_scenarios (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scenario_name VARCHAR(128) NOT NULL,
        financing_type VARCHAR(64) NOT NULL,
        target_gross_proceeds_usd NUMERIC(16, 2) NOT NULL,
        discount_to_vwap_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        underwriter_spread_percent NUMERIC(5, 2) NOT NULL DEFAULT 4.00,
        net_proceeds_usd NUMERIC(16, 2) NOT NULL,
        pro_forma_shares_issued BIGINT NOT NULL DEFAULT 0,
        pro_forma_dilution_percent NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
        coupon_rate_percent NUMERIC(5, 2),
        conversion_premium_percent NUMERIC(5, 2),
        calculated_wacc_percent NUMERIC(5, 2) NOT NULL,
        pro_forma_eps_accretion_percent NUMERIC(6, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_share_repurchase_programs (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        program_authorization_usd NUMERIC(16, 2) NOT NULL,
        utilized_amount_usd NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        remaining_authorization_usd NUMERIC(16, 2) NOT NULL,
        adtv_shares INT NOT NULL,
        rule_10b18_daily_share_limit INT NOT NULL,
        repurchased_shares_count INT NOT NULL DEFAULT 0,
        average_execution_price_usd NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        program_expiry_date DATE NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ir_sec_form_8k_disclosures (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES ir_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fiscal_quarter VARCHAR(16) NOT NULL,
        filing_title VARCHAR(255) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        items_included TEXT[] NOT NULL DEFAULT '{}',
        markdown_content TEXT NOT NULL,
        signoffs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ir_cap_table_user ON ir_cap_table_classes(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_shareholders_user ON ir_institutional_shareholders(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_plans_user ON ir_insider_10b51_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_earnings_user ON ir_earnings_cycles(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_consensus_user ON ir_consensus_guidance_metrics(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_reconciliations_user ON ir_non_gaap_reconciliations(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_conferences_user ON ir_conferences_docket(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_meetings_user ON ir_ndr_investor_meetings(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_capital_user ON ir_capital_scenarios(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_repurchases_user ON ir_share_repurchase_programs(user_id);
      CREATE INDEX IF NOT EXISTS idx_ir_disclosures_user ON ir_sec_form_8k_disclosures(user_id);
    `);
  }

  async ensureStudio(userId: string): Promise<string> {
    const existing = await this.pool.query(
      'SELECT id FROM ir_nexus_studios WHERE user_id = $1',
      [userId]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_nexus_studios (
        id, user_id, company_name, ticker_symbol, stock_price_usd,
        market_cap_usd, shares_outstanding, public_float_shares,
        composite_isi_score, isi_band
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        studioId,
        userId,
        'JobTrack Enterprise Technologies Inc.',
        'JBTR',
        64.50,
        4837500000.00,
        75000000,
        58500000,
        84.50,
        'strong_institutional_conviction'
      ]
    );

    const classAId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_cap_table_classes (
        id, studio_id, user_id, share_class_name, share_class_type,
        shares_authorized, shares_outstanding, votes_per_share, par_value_usd,
        is_publicly_traded, cusip
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        classAId,
        studioId,
        userId,
        'Common Stock Class A',
        'common_class_a',
        200000000,
        58500000,
        1,
        0.0001,
        true,
        '478160104'
      ]
    );

    const classBId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_cap_table_classes (
        id, studio_id, user_id, share_class_name, share_class_type,
        shares_authorized, shares_outstanding, votes_per_share, par_value_usd,
        is_publicly_traded, cusip
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        classBId,
        studioId,
        userId,
        'Common Stock Class B (Founders & Executive)',
        'common_class_b',
        50000000,
        16500000,
        10,
        0.0001,
        false,
        '478160112'
      ]
    );

    const holders = [
      {
        name: 'The Vanguard Group, Inc.',
        type: 'passive_index',
        shares: 6200000,
        pct: 8.27,
        votePct: 2.77,
        filing: 'form_13f',
        weight: 1.45,
        change: 150000,
        activist: false
      },
      {
        name: 'BlackRock Institutional Trust Company',
        type: 'passive_index',
        shares: 5500000,
        pct: 7.33,
        votePct: 2.46,
        filing: 'form_13f',
        weight: 1.20,
        change: 85000,
        activist: false
      },
      {
        name: 'Capital World Investors (Capital Group)',
        type: 'fundamental_long_only',
        shares: 4800000,
        pct: 6.40,
        votePct: 2.15,
        filing: 'schedule_13g',
        weight: 2.10,
        change: 320000,
        activist: false
      },
      {
        name: 'Fidelity Management & Research (FMR LLC)',
        type: 'growth_garp',
        shares: 4100000,
        pct: 5.47,
        votePct: 1.83,
        filing: 'schedule_13g',
        weight: 1.85,
        change: -45000,
        activist: false
      },
      {
        name: 'T. Rowe Price Associates, Inc.',
        type: 'fundamental_long_only',
        shares: 3400000,
        pct: 4.53,
        votePct: 1.52,
        filing: 'form_13f',
        weight: 1.60,
        change: 110000,
        activist: false
      },
      {
        name: 'State Street Global Advisors (SSgA)',
        type: 'passive_index',
        shares: 2900000,
        pct: 3.87,
        votePct: 1.30,
        filing: 'form_13f',
        weight: 0.95,
        change: 25000,
        activist: false
      },
      {
        name: 'Two Sigma Investments, LP',
        type: 'multi_strategy_quant',
        shares: 1850000,
        pct: 2.47,
        votePct: 0.83,
        filing: 'form_13f',
        weight: 0.75,
        change: -120000,
        activist: false
      },
      {
        name: 'Elliott Management Corporation',
        type: 'activist_hedge_fund',
        shares: 1125000,
        pct: 1.50,
        votePct: 0.50,
        filing: 'form_13f',
        weight: 0.80,
        change: 220000,
        activist: true
      }
    ];

    for (const h of holders) {
      await this.pool.query(
        `INSERT INTO ir_institutional_shareholders (
          id, studio_id, user_id, institution_name, investor_type,
          shares_held, percent_ownership, voting_power_percent, filing_type,
          filing_date, portfolio_weight_percent, quarterly_change_shares,
          is_known_activist
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          crypto.randomUUID(),
          studioId,
          userId,
          h.name,
          h.type,
          h.shares,
          h.pct,
          h.votePct,
          h.filing,
          '2026-09-30',
          h.weight,
          h.change,
          h.activist
        ]
      );
    }

    await this.pool.query(
      `INSERT INTO ir_insider_10b51_plans (
        id, studio_id, user_id, insider_name, insider_title,
        adoption_date, cooling_off_expiry_date, total_planned_shares,
        executed_shares, remaining_shares, expiration_date, is_compliant
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        'David Chen',
        'Chief Executive Officer & Founder',
        '2026-06-15',
        '2026-09-15',
        150000,
        25000,
        125000,
        '2027-06-15',
        true
      ]
    );

    await this.pool.query(
      `INSERT INTO ir_insider_10b51_plans (
        id, studio_id, user_id, insider_name, insider_title,
        adoption_date, cooling_off_expiry_date, total_planned_shares,
        executed_shares, remaining_shares, expiration_date, is_compliant
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        'Elena Rostova',
        'Chief Financial Officer',
        '2026-07-01',
        '2026-10-01',
        60000,
        10000,
        50000,
        '2027-07-01',
        true
      ]
    );

    const cycleId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_earnings_cycles (
        id, studio_id, user_id, fiscal_quarter, earnings_release_date,
        timing, quiet_period_start_date, is_quiet_period_active,
        webcast_url, safe_harbor_script
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        cycleId,
        studioId,
        userId,
        'Q3-2026',
        '2026-11-05',
        'after_market_close',
        '2026-10-15',
        true,
        'https:' + '/' + '/investors.jobtrack.com/webcasts/q3-2026-earnings-call',
        'Good afternoon and welcome to JobTrack Enterprise Technologies Third Quarter 2026 Financial Results Conference Call. Today remarks contain forward-looking statements within the meaning of Section 27A of the Securities Act of 1933 and Section 21E of the Securities Exchange Act of 1934.'
      ]
    );

    const consensusMetrics = [
      {
        name: 'GAAP Revenue',
        mean: 125.40,
        median: 125.00,
        high: 128.50,
        low: 122.00,
        count: 14,
        guideMid: 126.00,
        guideVar: 0.48,
        unit: 'usd_millions'
      },
      {
        name: 'Non-GAAP Diluted EPS',
        mean: 0.38,
        median: 0.38,
        high: 0.41,
        low: 0.35,
        count: 14,
        guideMid: 0.39,
        guideVar: 2.63,
        unit: 'usd_per_share'
      },
      {
        name: 'Adjusted EBITDA',
        mean: 32.80,
        median: 32.50,
        high: 34.50,
        low: 30.50,
        count: 12,
        guideMid: 33.00,
        guideVar: 0.61,
        unit: 'usd_millions'
      },
      {
        name: 'Free Cash Flow',
        mean: 24.20,
        median: 24.00,
        high: 26.00,
        low: 22.00,
        count: 10,
        guideMid: 24.50,
        guideVar: 1.24,
        unit: 'usd_millions'
      }
    ];

    for (const cm of consensusMetrics) {
      await this.pool.query(
        `INSERT INTO ir_consensus_guidance_metrics (
          id, cycle_id, user_id, metric_name, consensus_mean,
          consensus_median, consensus_high, consensus_low, analyst_count,
          guidance_midpoint, guidance_variance_percent, unit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          crypto.randomUUID(),
          cycleId,
          userId,
          cm.name,
          cm.mean,
          cm.median,
          cm.high,
          cm.low,
          cm.count,
          cm.guideMid,
          cm.guideVar,
          cm.unit
        ]
      );
    }

    await this.pool.query(
      `INSERT INTO ir_non_gaap_reconciliations (
        id, cycle_id, user_id, line_item_name, gaap_amount_usd,
        adjustments_usd, non_gaap_amount_usd, adjustment_details_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        cycleId,
        userId,
        'Net Income to Adjusted EBITDA Bridge',
        18400000.00,
        14400000.00,
        32800000.00,
        JSON.stringify([
          { category: 'Stock-Based Compensation', amountUsd: 8200000.00 },
          { category: 'Depreciation & Amortization', amountUsd: 3800000.00 },
          { category: 'Provision for Income Taxes', amountUsd: 1400000.00 },
          { category: 'Interest and Other Net', amountUsd: 1000000.00 }
        ])
      ]
    );

    const conf1Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_conferences_docket (
        id, studio_id, user_id, conference_name, host_broker,
        location, start_date, end_date, executive_attendees,
        confirmed_meetings_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        conf1Id,
        studioId,
        userId,
        'Morgan Stanley Global Technology, Media & Telecom Conference',
        'Morgan Stanley',
        'San Francisco, CA',
        '2026-11-18',
        '2026-11-20',
        ['David Chen (CEO)', 'Elena Rostova (CFO)', 'Alexander Vance (VP IR)'],
        14
      ]
    );

    const conf2Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_conferences_docket (
        id, studio_id, user_id, conference_name, host_broker,
        location, start_date, end_date, executive_attendees,
        confirmed_meetings_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        conf2Id,
        studioId,
        userId,
        'Goldman Sachs Communacopia + Technology Conference',
        'Goldman Sachs',
        'San Francisco, CA',
        '2026-12-08',
        '2026-12-10',
        ['Elena Rostova (CFO)', 'Alexander Vance (VP IR)'],
        12
      ]
    );

    await this.pool.query(
      `INSERT INTO ir_ndr_investor_meetings (
        id, studio_id, user_id, conference_id, institution_name,
        lead_investor_name, investor_type, meeting_date, meeting_format,
        executive_attendees, sentiment_score, key_topics_json, follow_ups_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        conf1Id,
        'Capital World Investors (Capital Group)',
        'Sarah Jenkins, Portfolio Manager',
        'fundamental_long_only',
        '2026-10-22',
        'one_on_one_in_person',
        ['David Chen (CEO)', 'Alexander Vance (VP IR)'],
        0.75,
        JSON.stringify([
          'Enterprise gross margin durability',
          'AI agent ARR monetization velocity',
          'Free cash flow conversion rate'
        ]),
        JSON.stringify([
          'Provide updated cohort retention schedule',
          'Arrange product architecture deep-dive'
        ])
      ]
    );

    await this.pool.query(
      `INSERT INTO ir_capital_scenarios (
        id, studio_id, user_id, scenario_name, financing_type,
        target_gross_proceeds_usd, discount_to_vwap_percent,
        underwriter_spread_percent, net_proceeds_usd, pro_forma_shares_issued,
        pro_forma_dilution_percent, coupon_rate_percent,
        conversion_premium_percent, calculated_wacc_percent,
        pro_forma_eps_accretion_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        'Series Convertible Senior Notes 2031',
        'convertible_senior_notes',
        200000000.00,
        0.00,
        2.25,
        195500000.00,
        2432000,
        3.24,
        1.75,
        27.50,
        8.95,
        4.20
      ]
    );

    await this.pool.query(
      `INSERT INTO ir_share_repurchase_programs (
        id, studio_id, user_id, program_authorization_usd,
        utilized_amount_usd, remaining_authorization_usd, adtv_shares,
        rule_10b18_daily_share_limit, repurchased_shares_count,
        average_execution_price_usd, program_expiry_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        250000000.00,
        85400000.00,
        164600000.00,
        750000,
        187500,
        1380000,
        61.88,
        '2027-12-31',
        true
      ]
    );

    const disclosureId = crypto.randomUUID();
    const default8KMarkdown = `# UNITED STATES SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549

FORM 8-K
CURRENT REPORT
Pursuant to Section 13 or 15(d) of the Securities Exchange Act of 1934

Date of Report (Date of earliest event reported): 2026-10-25

JobTrack Enterprise Technologies Inc.
(Exact name of registrant as specified in its charter)

Commission File Number: 001-41920
IRS Employer Identification No.: 88-3491024
CIK: 0001984210

State of Incorporation: Delaware
Trading Symbol: JBTR
Exchange: The Nasdaq Stock Market LLC (Nasdaq Global Select Market)

---

## Item 2.02 Results of Operations and Financial Condition
On October 25, 2026, JobTrack Enterprise Technologies Inc. (the "Company") issued a press release announcing its financial results for the fiscal quarter ended Q3-2026. A copy of the press release is furnished as Exhibit 99.1 to this Current Report on Form 8-K.

The information in this Item 2.02 and Exhibit 99.1 attached hereto is being furnished and shall not be deemed "filed" for purposes of Section 18 of the Securities Exchange Act of 1934, as amended (the "Exchange Act"), nor shall it be deemed incorporated by reference in any filing under the Securities Act of 1933, as amended.

### Non-GAAP Financial Measures & Regulation G Reconciliation
In addition to financial measures prepared in accordance with U.S. generally accepted accounting principles ("GAAP"), this report includes certain Non-GAAP financial measures, including Adjusted EBITDA, Non-GAAP Net Income, and Free Cash Flow.

---

## Item 7.01 Regulation FD Disclosure
Representatives of the Company will present the investor presentation materials attached hereto as Exhibit 99.2 during institutional investor conferences and non-deal roadshows scheduled for Q3-2026.

---

## Item 9.01 Financial Statements and Exhibits
(d) Exhibits:
- Exhibit 99.1: Press Release dated 2026-10-25 announcing financial results for Q3-2026.
- Exhibit 99.2: Investor Presentation dated 2026-10-25 for Q3-2026 Non-Deal Roadshows.
- Exhibit 104: Cover Page Interactive Data File.

---

## SIGNATURES
Pursuant to the requirements of the Securities Exchange Act of 1934, the registrant has duly caused this report to be signed on its behalf by the undersigned hereunto duly authorized.

[x] VERIFIED & CERTIFIED: VP of Investor Relations
    Status: Consensus Metrics & Non-GAAP Reg G Reconciliations Audited

[x] APPROVED: Chief Financial Officer (Principal Financial Officer)
    Status: Financial Statements, Guidance & WACC Calculations Ratified

[ ] PENDING RATIFICATION: Chief Executive Officer (Principal Executive Officer)
`;

    const signoffs = [
      {
        role: 'vp_investor_relations' as IrSignoffRole,
        signedBy: 'Alexander Vance',
        signedAt: '2026-10-25T08:30:00Z',
        signatureToken: 'sig_ir_vance_9281a',
        verificationNotes: 'Audited consensus models and Reg G reconciliations.'
      },
      {
        role: 'chief_financial_officer' as IrSignoffRole,
        signedBy: 'Elena Rostova',
        signedAt: '2026-10-25T09:15:00Z',
        signatureToken: 'sig_cfo_rostova_4190c',
        verificationNotes: 'Approved financial statements and forward guidance.'
      }
    ];

    await this.pool.query(
      `INSERT INTO ir_sec_form_8k_disclosures (
        id, studio_id, user_id, fiscal_quarter, filing_title,
        status, items_included, markdown_content, signoffs_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        disclosureId,
        studioId,
        userId,
        'Q3-2026',
        'Current Report Pursuant to Section 13 or 15(d) of the Exchange Act',
        'cfo_approved',
        ['Item 2.02', 'Item 7.01', 'Item 9.01'],
        default8KMarkdown,
        JSON.stringify(signoffs)
      ]
    );

    return studioId;
  }

  async getOverview(userId: string): Promise<InvestorRelationsOverviewDTO> {
    const studioId = await this.ensureStudio(userId);

    const studioRes = await this.pool.query(
      'SELECT * FROM ir_nexus_studios WHERE user_id = $1',
      [userId]
    );
    const studio = studioRes.rows[0];

    const classesRes = await this.pool.query(
      'SELECT * FROM ir_cap_table_classes WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    const shareClasses: CapTableShareClassDTO[] = classesRes.rows.map((r) => ({
      id: r.id,
      shareClassName: r.share_class_name,
      shareClassType: r.share_class_type as ShareClassType,
      sharesAuthorized: Number(r.shares_authorized),
      sharesOutstanding: Number(r.shares_outstanding),
      votesPerShare: r.votes_per_share,
      parValueUsd: Number(r.par_value_usd),
      isPubliclyTraded: r.is_publicly_traded,
      cusip: r.cusip
    }));

    const holdersRes = await this.pool.query(
      'SELECT * FROM ir_institutional_shareholders WHERE user_id = $1 ORDER BY shares_held DESC',
      [userId]
    );
    const topShareholders: InstitutionalShareholderDTO[] = holdersRes.rows.map((r) => ({
      id: r.id,
      institutionName: r.institution_name,
      investorType: r.investor_type as InstitutionalInvestorType,
      sharesHeld: Number(r.shares_held),
      percentOwnership: Number(r.percent_ownership),
      votingPowerPercent: Number(r.voting_power_percent),
      filingType: r.filing_type as SecFilingType,
      filingDate: r.filing_date instanceof Date ? r.filing_date.toISOString().split('T')[0] : String(r.filing_date),
      portfolioWeightPercent: Number(r.portfolio_weight_percent),
      quarterlyChangeShares: Number(r.quarterly_change_shares),
      isKnownActivist: r.is_known_activist
    }));

    const plansRes = await this.pool.query(
      'SELECT * FROM ir_insider_10b51_plans WHERE user_id = $1 ORDER BY adoption_date ASC',
      [userId]
    );
    const insiderPlans: Rule10b51PlanDTO[] = plansRes.rows.map((r) => ({
      id: r.id,
      insiderName: r.insider_name,
      insiderTitle: r.insider_title,
      adoptionDate: r.adoption_date instanceof Date ? r.adoption_date.toISOString().split('T')[0] : String(r.adoption_date),
      coolingOffExpiryDate: r.cooling_off_expiry_date instanceof Date ? r.cooling_off_expiry_date.toISOString().split('T')[0] : String(r.cooling_off_expiry_date),
      totalPlannedShares: r.total_planned_shares,
      executedShares: r.executed_shares,
      remainingShares: r.remaining_shares,
      expirationDate: r.expiration_date instanceof Date ? r.expiration_date.toISOString().split('T')[0] : String(r.expiration_date),
      isCompliant: r.is_compliant
    }));

    const cycleRes = await this.pool.query(
      'SELECT * FROM ir_earnings_cycles WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const cycleRow = cycleRes.rows[0];

    const metricsRes = await this.pool.query(
      'SELECT * FROM ir_consensus_guidance_metrics WHERE user_id = $1 AND cycle_id = $2',
      [userId, cycleRow.id]
    );
    const consensusMetrics: SellSideConsensusMetricDTO[] = metricsRes.rows.map((r) => ({
      metricName: r.metric_name,
      consensusMean: Number(r.consensus_mean),
      consensusMedian: Number(r.consensus_median),
      consensusHigh: Number(r.consensus_high),
      consensusLow: Number(r.consensus_low),
      analystCount: r.analyst_count,
      guidanceMidpoint: Number(r.guidance_midpoint),
      guidanceVariancePercent: Number(r.guidance_variance_percent),
      unit: r.unit
    }));

    const reconRes = await this.pool.query(
      'SELECT * FROM ir_non_gaap_reconciliations WHERE user_id = $1 AND cycle_id = $2',
      [userId, cycleRow.id]
    );
    const reconciliations: NonGaapReconciliationItemDTO[] = reconRes.rows.map((r) => ({
      lineItemName: r.line_item_name,
      gaapAmountUsd: Number(r.gaap_amount_usd),
      adjustmentsUsd: Number(r.adjustments_usd),
      nonGaapAmountUsd: Number(r.non_gaap_amount_usd),
      adjustmentDetails: Array.isArray(r.adjustment_details_json) ? r.adjustment_details_json : []
    }));

    const earnings: EarningsCycleDTO = {
      id: cycleRow.id,
      fiscalQuarter: cycleRow.fiscal_quarter,
      earningsReleaseDate: cycleRow.earnings_release_date instanceof Date ? cycleRow.earnings_release_date.toISOString().split('T')[0] : String(cycleRow.earnings_release_date),
      timing: cycleRow.timing as EarningsTimingType,
      quietPeriodStartDate: cycleRow.quiet_period_start_date instanceof Date ? cycleRow.quiet_period_start_date.toISOString().split('T')[0] : String(cycleRow.quiet_period_start_date),
      isQuietPeriodActive: cycleRow.is_quiet_period_active,
      webcastUrl: cycleRow.webcast_url,
      consensusMetrics,
      reconciliations,
      safeHarborScript: cycleRow.safe_harbor_script
    };

    const confRes = await this.pool.query(
      'SELECT * FROM ir_conferences_docket WHERE user_id = $1 ORDER BY start_date ASC',
      [userId]
    );
    const upcomingConferences: InvestorConferenceDTO[] = confRes.rows.map((r) => ({
      id: r.id,
      conferenceName: r.conference_name,
      hostBroker: r.host_broker,
      location: r.location,
      startDate: r.start_date instanceof Date ? r.start_date.toISOString().split('T')[0] : String(r.start_date),
      endDate: r.end_date instanceof Date ? r.end_date.toISOString().split('T')[0] : String(r.end_date),
      executiveAttendees: r.executive_attendees || [],
      confirmedMeetingsCount: r.confirmed_meetings_count
    }));

    const meetingsRes = await this.pool.query(
      'SELECT * FROM ir_ndr_investor_meetings WHERE user_id = $1 ORDER BY meeting_date DESC',
      [userId]
    );
    const recentMeetings: NdrInvestorMeetingDTO[] = meetingsRes.rows.map((r) => ({
      id: r.id,
      conferenceId: r.conference_id,
      institutionName: r.institution_name,
      leadInvestorName: r.lead_investor_name,
      investorType: r.investor_type as InstitutionalInvestorType,
      meetingDate: r.meeting_date instanceof Date ? r.meeting_date.toISOString().split('T')[0] : String(r.meeting_date),
      meetingFormat: r.meeting_format as MeetingFormatType,
      executiveAttendees: r.executive_attendees || [],
      sentimentScore: Number(r.sentiment_score),
      keyTopicsDiscussed: Array.isArray(r.key_topics_json) ? r.key_topics_json : [],
      followUpDeliverables: Array.isArray(r.follow_ups_json) ? r.follow_ups_json : []
    }));

    const avgSentiment = recentMeetings.length > 0
      ? Math.round((recentMeetings.reduce((acc, m) => acc + m.sentimentScore, 0) / recentMeetings.length) * 100) / 100
      : 0.75;
    const buySideConviction = Math.round((avgSentiment + 1.0) * 50 * 10) / 10;

    const scenRes = await this.pool.query(
      'SELECT * FROM ir_capital_scenarios WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const activeScenarios: CapitalScenarioDTO[] = scenRes.rows.map((r) => ({
      id: r.id,
      scenarioName: r.scenario_name,
      financingType: r.financing_type as CapitalFinancingType,
      targetGrossProceedsUsd: Number(r.target_gross_proceeds_usd),
      discountToVwapPercent: Number(r.discount_to_vwap_percent),
      underwriterSpreadPercent: Number(r.underwriter_spread_percent),
      netProceedsUsd: Number(r.net_proceeds_usd),
      proFormaSharesIssued: Number(r.pro_forma_shares_issued),
      proFormaDilutionPercent: Number(r.pro_forma_dilution_percent),
      couponRatePercent: r.coupon_rate_percent ? Number(r.coupon_rate_percent) : undefined,
      conversionPremiumPercent: r.conversion_premium_percent ? Number(r.conversion_premium_percent) : undefined,
      calculatedWaccPercent: Number(r.calculated_wacc_percent),
      proFormaEpsAccretionPercent: Number(r.pro_forma_eps_accretion_percent)
    }));

    const repRes = await this.pool.query(
      'SELECT * FROM ir_share_repurchase_programs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    const repRow = repRes.rows[0];
    const repurchaseProgram: ShareRepurchaseProgramDTO = {
      id: repRow.id,
      programAuthorizationUsd: Number(repRow.program_authorization_usd),
      utilizedAmountUsd: Number(repRow.utilized_amount_usd),
      remainingAuthorizationUsd: Number(repRow.remaining_authorization_usd),
      adtvShares: repRow.adtv_shares,
      rule10b18DailyShareLimit: repRow.rule_10b18_daily_share_limit,
      repurchasedSharesCount: repRow.repurchased_shares_count,
      averageExecutionPriceUsd: Number(repRow.average_execution_price_usd),
      programExpiryDate: repRow.program_expiry_date instanceof Date ? repRow.program_expiry_date.toISOString().split('T')[0] : String(repRow.program_expiry_date),
      isActive: repRow.is_active
    };

    const discRes = await this.pool.query(
      'SELECT * FROM ir_sec_form_8k_disclosures WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    let latestForm8K: SecForm8KDisclosureDTO | undefined;
    if (discRes.rows.length > 0) {
      const d = discRes.rows[0];
      latestForm8K = {
        id: d.id,
        fiscalQuarter: d.fiscal_quarter,
        filingTitle: d.filing_title,
        status: d.status as Form8KStatus,
        itemsIncluded: d.items_included || [],
        markdownContent: d.markdown_content,
        createdAt: d.created_at instanceof Date ? d.created_at.toISOString() : String(d.created_at),
        updatedAt: d.updated_at instanceof Date ? d.updated_at.toISOString() : String(d.updated_at),
        signoffs: Array.isArray(d.signoffs_json) ? d.signoffs_json : []
      };
    }

    const activistVulnerability: ActivistVulnerabilityDTO = {
      compositeAvisScore: 24.6,
      riskLevel: 'fortified_low',
      tsrUnderperformancePercent: 4.5,
      valuationDiscountPercent: 6.2,
      governanceDefenseScore: 88.0,
      freeCashFlowMarginGap: 2.1,
      activistOwnershipPercent: 1.5,
      vulnerabilityFactors: [
        { factorName: '3-Year TSR vs Benchmark', score: 9.0, weight: 0.25, severity: 'low' },
        { factorName: 'EV/NTM Multiple Peer Discount', score: 12.4, weight: 0.20, severity: 'low' },
        { factorName: 'Governance Defense Vulnerability', score: 12.0, weight: 0.20, severity: 'low' },
        { factorName: 'FCF Conversion Shortfall', score: 10.5, weight: 0.15, severity: 'low' },
        { factorName: 'Activist Shareholder Infiltration', score: 7.5, weight: 0.20, severity: 'low' }
      ],
      recommendedDefenses: [
        'Maintain Dual-Class 10:1 voting structure integrity',
        'Execute disciplined Rule 10b-18 share repurchase under 25% ADTV limit',
        'Proactively engage Tier-1 fundamental long-only asset managers'
      ]
    };

    return {
      studioId,
      companyName: studio.company_name,
      tickerSymbol: studio.ticker_symbol,
      lastUpdated: new Date().toISOString(),
      compositeIsiScore: Number(studio.composite_isi_score),
      isiBand: studio.isi_band as IsiAlignmentBand,
      stockPriceUsd: Number(studio.stock_price_usd),
      marketCapUsd: Number(studio.market_cap_usd),
      sharesOutstanding: Number(studio.shares_outstanding),
      publicFloatShares: Number(studio.public_float_shares),
      capTable: {
        shareClasses,
        topShareholders,
        insiderPlans,
        activistVulnerability
      },
      earnings,
      roadshows: {
        upcomingConferences,
        recentMeetings,
        averageSentimentScore: avgSentiment,
        buySideConvictionScore: buySideConviction
      },
      capitalMarkets: {
        activeScenarios,
        repurchaseProgram,
        currentWaccPercent: 8.95,
        costOfEquityPercent: 10.85,
        costOfDebtAfterTaxPercent: 3.95
      },
      latestForm8K
    };
  }

  async simulateActivistVulnerability(
    userId: string,
    req: SimulateActivistRequestDTO
  ): Promise<ActivistVulnerabilityResultDTO> {
    await this.ensureStudio(userId);
    const { score, riskLevel } = calculateAVIS(req);

    let driver = 'Balanced Operational & Market Alignment';
    if (req.tsrUnderperformancePercent > 20) {
      driver = 'Severe 3-Year Total Shareholder Return Lag';
    } else if (req.activistOwnershipPercent > 5) {
      driver = 'Rapid Infiltration of Dedicated Activist Funds';
    } else if (req.governanceDefenseScore < 50) {
      driver = 'Vulnerable Corporate Governance Architecture';
    }

    const recommendedActions = [
      'Fortify dual-class share covenants and poison pill readiness',
      'Optimize capital return program via Rule 10b-18 buybacks',
      'Deploy investor engagement roadshows with Tier-1 long-only institutions'
    ];

    return {
      compositeAvisScore: score,
      riskLevel,
      primaryVulnerabilityDriver: driver,
      recommendedActions
    };
  }

  async reconcileNonGaapEarnings(
    userId: string,
    req: NonGaapReconciliationRequestDTO
  ): Promise<NonGaapReconciliationResultDTO> {
    await this.ensureStudio(userId);

    const adjustedEbitdaUsd =
      req.gaapNetIncomeUsd +
      req.stockBasedCompensationUsd +
      req.amortizationIntangiblesUsd +
      req.acquisitionRestructuringCostsUsd +
      req.interestExpenseUsd +
      req.provisionForTaxesUsd +
      req.depreciationUsd;

    const nonGaapNetIncomeUsd =
      req.gaapNetIncomeUsd +
      req.stockBasedCompensationUsd +
      req.amortizationIntangiblesUsd +
      req.acquisitionRestructuringCostsUsd -
      req.taxEffectOfAdjustmentsUsd;

    const cautionaryStatementMarkdown = `
### Statutory Cautionary Statement Regarding Non-GAAP Financial Measures (SEC Regulation G & Item 10(e))
To supplement our consolidated financial statements presented in accordance with U.S. GAAP, management utilizes Non-GAAP financial measures including Adjusted EBITDA and Non-GAAP Net Income. Management believes that these Non-GAAP measures provide useful insights into operating performance, unencumbered by non-cash stock compensation, one-time acquisition or restructuring expenses, and non-operational financing charges.

These Non-GAAP measures are not prepared in accordance with GAAP, should not be considered alternatives to GAAP Net Income or Cash Flow from Operations, and may differ from identically titled measures used by other publicly traded companies.
`;

    return {
      adjustedEbitdaUsd,
      nonGaapNetIncomeUsd,
      cautionaryStatementMarkdown
    };
  }

  async logInvestorMeeting(
    userId: string,
    req: LogNdrMeetingRequestDTO
  ): Promise<NdrInvestorMeetingDTO> {
    const studioId = await this.ensureStudio(userId);
    const meetingId = crypto.randomUUID();

    await this.pool.query(
      `INSERT INTO ir_ndr_investor_meetings (
        id, studio_id, user_id, conference_id, institution_name,
        lead_investor_name, investor_type, meeting_date, meeting_format,
        executive_attendees, sentiment_score, key_topics_json, follow_ups_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        meetingId,
        studioId,
        userId,
        req.conferenceId || null,
        req.institutionName,
        req.leadInvestorName,
        req.investorType,
        req.meetingDate,
        req.meetingFormat,
        req.executiveAttendees,
        req.sentimentScore,
        JSON.stringify(req.keyTopics),
        JSON.stringify(req.followUps)
      ]
    );

    return {
      id: meetingId,
      conferenceId: req.conferenceId,
      institutionName: req.institutionName,
      leadInvestorName: req.leadInvestorName,
      investorType: req.investorType,
      meetingDate: req.meetingDate,
      meetingFormat: req.meetingFormat,
      executiveAttendees: req.executiveAttendees,
      sentimentScore: req.sentimentScore,
      keyTopicsDiscussed: req.keyTopics,
      followUpDeliverables: req.followUps
    };
  }

  async simulateCapitalScenario(
    userId: string,
    req: SimulateCapitalScenarioRequestDTO
  ): Promise<CapitalScenarioResultDTO> {
    const studioId = await this.ensureStudio(userId);

    const underwriterSpread = req.grossAmountUsd * 0.035;
    const legalFees = 750000;
    const netProceedsUsd = req.grossAmountUsd - underwriterSpread - legalFees;

    const sharesIssued = req.financingType === 'convertible_senior_notes'
      ? Math.round((req.grossAmountUsd / (req.stockPriceUsd * 1.30)))
      : req.financingType === 'rule_10b18_share_repurchase'
      ? -Math.round(req.grossAmountUsd / req.stockPriceUsd)
      : Math.round(req.grossAmountUsd / (req.stockPriceUsd * 0.96));

    const proFormaDilutionPercent = Math.round((sharesIssued / req.currentSharesCount) * 1000) / 10;

    const equityVal = req.stockPriceUsd * req.currentSharesCount;
    const calculatedWaccPercent = calculateWACC(
      req.costOfEquityPercent,
      req.preTaxCostOfDebtPercent,
      req.marginalTaxRatePercent,
      equityVal,
      req.grossAmountUsd
    );

    const incrementalAnnualInterestUsd = req.financingType === 'convertible_senior_notes'
      ? req.grossAmountUsd * 0.0175
      : 0;

    const standaloneEps = req.currentAnnualNetIncomeUsd / req.currentSharesCount;
    const epsResult = calculateEPSAccretionDilution({
      standaloneNetIncomeUsd: req.currentAnnualNetIncomeUsd,
      standaloneSharesCount: req.currentSharesCount,
      standaloneEps,
      financingType: req.financingType,
      incrementalSharesCount: sharesIssued,
      incrementalAnnualInterestUsd,
      marginalTaxRatePercent: req.marginalTaxRatePercent
    });

    const scenarioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO ir_capital_scenarios (
        id, studio_id, user_id, scenario_name, financing_type,
        target_gross_proceeds_usd, discount_to_vwap_percent,
        underwriter_spread_percent, net_proceeds_usd, pro_forma_shares_issued,
        pro_forma_dilution_percent, coupon_rate_percent,
        conversion_premium_percent, calculated_wacc_percent,
        pro_forma_eps_accretion_percent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        scenarioId,
        studioId,
        userId,
        req.scenarioName,
        req.financingType,
        req.grossAmountUsd,
        4.0,
        3.5,
        netProceedsUsd,
        sharesIssued,
        proFormaDilutionPercent,
        req.financingType === 'convertible_senior_notes' ? 1.75 : null,
        req.financingType === 'convertible_senior_notes' ? 30.0 : null,
        calculatedWaccPercent,
        epsResult.epsVariancePercent
      ]
    );

    return {
      scenarioName: req.scenarioName,
      financingType: req.financingType,
      netProceedsUsd,
      proFormaSharesIssued: sharesIssued,
      proFormaDilutionPercent,
      calculatedWaccPercent,
      proFormaEpsUsd: epsResult.proFormaEpsUsd,
      epsAccretionDilutionPercent: epsResult.epsVariancePercent,
      isAccretive: epsResult.isAccretive
    };
  }

  async generateSecForm8K(
    userId: string,
    req: GenerateForm8KRequestDTO
  ): Promise<SecForm8KDisclosureDTO> {
    const studioId = await this.ensureStudio(userId);
    const overview = await this.getOverview(userId);
    const markdownContent = generateSecForm8KDisclosure(overview, req);

    const itemsIncluded: string[] = [];
    if (req.includeItem202) itemsIncluded.push('Item 2.02');
    if (req.includeItem701) itemsIncluded.push('Item 7.01');
    itemsIncluded.push('Item 9.01');

    const disclosureId = crypto.randomUUID();
    const signoffs: SecForm8KSignoffDTO[] = [];

    await this.pool.query(
      `INSERT INTO ir_sec_form_8k_disclosures (
        id, studio_id, user_id, fiscal_quarter, filing_title,
        status, items_included, markdown_content, signoffs_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        disclosureId,
        studioId,
        userId,
        req.fiscalQuarter,
        req.filingTitle,
        'draft',
        itemsIncluded,
        markdownContent,
        JSON.stringify(signoffs)
      ]
    );

    return {
      id: disclosureId,
      fiscalQuarter: req.fiscalQuarter,
      filingTitle: req.filingTitle,
      status: 'draft',
      itemsIncluded,
      markdownContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signoffs
    };
  }

  async signoffSecForm8K(
    userId: string,
    disclosureId: string,
    req: SignoffForm8KRequestDTO
  ): Promise<SecForm8KDisclosureDTO> {
    const existing = await this.pool.query(
      'SELECT * FROM ir_sec_form_8k_disclosures WHERE id = $1 AND user_id = $2',
      [disclosureId, userId]
    );
    if (existing.rows.length === 0) {
      throw new Error('SEC Form 8-K disclosure record not found');
    }

    const row = existing.rows[0];
    const currentSignoffs: SecForm8KSignoffDTO[] = Array.isArray(row.signoffs_json)
      ? row.signoffs_json
      : [];

    const newSignature: SecForm8KSignoffDTO = {
      role: req.role,
      signedBy: req.signerName,
      signedAt: new Date().toISOString(),
      signatureToken: `sig_${req.role}_${crypto.randomBytes(4).toString('hex')}`,
      verificationNotes: req.verificationNotes
    };

    const updatedSignoffs = [...currentSignoffs.filter((s) => s.role !== req.role), newSignature];

    let newStatus: Form8KStatus = 'draft';
    const hasVpIr = updatedSignoffs.some((s) => s.role === 'vp_investor_relations');
    const hasCfo = updatedSignoffs.some((s) => s.role === 'chief_financial_officer');
    const hasCeo = updatedSignoffs.some((s) => s.role === 'chief_executive_officer');

    if (hasCeo && hasCfo && hasVpIr) {
      newStatus = 'ceo_ratified';
    } else if (hasCfo && hasVpIr) {
      newStatus = 'cfo_approved';
    } else if (hasVpIr) {
      newStatus = 'vp_ir_certified';
    }

    await this.pool.query(
      `UPDATE ir_sec_form_8k_disclosures
       SET status = $1, signoffs_json = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [newStatus, JSON.stringify(updatedSignoffs), disclosureId, userId]
    );

    return {
      id: row.id,
      fiscalQuarter: row.fiscal_quarter,
      filingTitle: row.filing_title,
      status: newStatus,
      itemsIncluded: row.items_included || [],
      markdownContent: row.markdown_content,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: new Date().toISOString(),
      signoffs: updatedSignoffs
    };
  }
}
