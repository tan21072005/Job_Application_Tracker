import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type AntitrustMergerTransaction,
  type HsrStatutoryAssessment,
  type HsrSecondRequest,
  type AntitrustRelevantMarket,
  type MarketParticipantShare,
  type GuppiEconomicAnalysis,
  type GlobalClearanceFiling,
  type RemedyDivestiturePackage,
  type CleanTeamFirewallProtocol,
  type AntitrustLitigationDocket,
  type AntitrustTripartiteRatification,
  type AntitrustAuditEventLog,
  type AntitrustCompetitionOverview,
  type CreateMergerTransactionInput,
  type DefineMarketInput,
  type ProposeDivestiturePackageInput,
  type SubmitAntitrustSignoffInput,
  calculateHhiConcentration,
  calculateDeltaHhi,
  evaluateHhiPresumption,
  calculateGuppi,
  calculateRegulatoryClearanceRiskScore,
  calculateRemedyDefensibilityIndex,
  evaluateHsrStatutoryThresholds,
  computeRatificationHash
} from '@jobtrack/contract';

export class AntitrustCompetitionNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS antitrust_merger_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_codename VARCHAR(255) NOT NULL,
        acquirer_name VARCHAR(255) NOT NULL,
        target_name VARCHAR(255) NOT NULL,
        enterprise_value_usd NUMERIC NOT NULL,
        cash_consideration_usd NUMERIC NOT NULL,
        stock_consideration_usd NUMERIC NOT NULL,
        announced_date DATE NOT NULL,
        targeted_closing_date DATE NOT NULL,
        reverse_termination_fee_pct NUMERIC NOT NULL DEFAULT 4.5,
        reverse_termination_fee_usd NUMERIC NOT NULL,
        deal_structure_type VARCHAR(50) NOT NULL,
        overall_transaction_status VARCHAR(50) NOT NULL DEFAULT 'initial_waiting_period',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_antitrust_tx_user ON antitrust_merger_transactions(user_id);

      CREATE TABLE IF NOT EXISTS hsr_statutory_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        size_of_transaction_test_passed BOOLEAN NOT NULL,
        transaction_value_usd NUMERIC NOT NULL,
        size_of_transaction_threshold_usd NUMERIC NOT NULL DEFAULT 119500000,
        size_of_person_test_passed BOOLEAN NOT NULL,
        larger_person_net_sales_usd NUMERIC NOT NULL,
        smaller_person_net_sales_usd NUMERIC NOT NULL,
        size_of_person_lower_threshold_usd NUMERIC NOT NULL DEFAULT 23900000,
        size_of_person_upper_threshold_usd NUMERIC NOT NULL DEFAULT 239000000,
        unconditional_filing_threshold_usd NUMERIC NOT NULL DEFAULT 478000000,
        is_hsr_filing_required BOOLEAN NOT NULL,
        statutory_filing_fee_usd NUMERIC NOT NULL,
        initial_waiting_period_days INT NOT NULL DEFAULT 30,
        earliest_waiting_period_expiry DATE,
        item_4c_documents_cataloged INT NOT NULL DEFAULT 0,
        item_4d_documents_cataloged INT NOT NULL DEFAULT 0,
        filing_prepared_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hsr_assess_user ON hsr_statutory_assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_hsr_assess_tx ON hsr_statutory_assessments(transaction_id);

      CREATE TABLE IF NOT EXISTS hsr_second_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        issuing_agency VARCHAR(100) NOT NULL,
        receipt_date DATE NOT NULL,
        scope_description TEXT NOT NULL,
        custodian_count INT NOT NULL DEFAULT 0,
        custodians_agreed_count INT NOT NULL DEFAULT 0,
        data_volume_terabytes NUMERIC NOT NULL DEFAULT 0,
        documents_reviewed_count INT NOT NULL DEFAULT 0,
        documents_produced_count INT NOT NULL DEFAULT 0,
        privilege_log_entries_count INT NOT NULL DEFAULT 0,
        certified_substantial_compliance BOOLEAN NOT NULL DEFAULT false,
        compliance_certification_date DATE,
        extended_waiting_period_expiry DATE,
        estimated_defense_costs_usd NUMERIC NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_second_request_user ON hsr_second_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_second_request_tx ON hsr_second_requests(transaction_id);

      CREATE TABLE IF NOT EXISTS antitrust_relevant_markets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        market_name VARCHAR(255) NOT NULL,
        product_market_definition TEXT NOT NULL,
        geographic_market_scope VARCHAR(255) NOT NULL,
        total_market_size_usd NUMERIC NOT NULL,
        ssnip_test_critical_loss_pct NUMERIC NOT NULL DEFAULT 8.5,
        hypothetical_monopolist_test_passed BOOLEAN NOT NULL DEFAULT true,
        pre_merger_hhi NUMERIC NOT NULL,
        post_merger_hhi NUMERIC NOT NULL,
        delta_hhi NUMERIC NOT NULL,
        concentration_tier VARCHAR(50) NOT NULL,
        presumption_rebuttable_unlawful BOOLEAN NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_relevant_markets_user ON antitrust_relevant_markets(user_id);
      CREATE INDEX IF NOT EXISTS idx_relevant_markets_tx ON antitrust_relevant_markets(transaction_id);

      CREATE TABLE IF NOT EXISTS market_participant_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relevant_market_id UUID NOT NULL REFERENCES antitrust_relevant_markets(id) ON DELETE CASCADE,
        participant_name VARCHAR(255) NOT NULL,
        is_merging_party BOOLEAN NOT NULL DEFAULT false,
        is_acquirer BOOLEAN NOT NULL DEFAULT false,
        is_target BOOLEAN NOT NULL DEFAULT false,
        annual_revenue_usd NUMERIC NOT NULL,
        market_share_pct NUMERIC NOT NULL,
        post_merger_share_pct NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_market_shares_user ON market_participant_shares(user_id);
      CREATE INDEX IF NOT EXISTS idx_market_shares_mkt ON market_participant_shares(relevant_market_id);

      CREATE TABLE IF NOT EXISTS guppi_economic_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        relevant_market_id UUID NOT NULL REFERENCES antitrust_relevant_markets(id) ON DELETE CASCADE,
        acquirer_product_name VARCHAR(255) NOT NULL,
        target_product_name VARCHAR(255) NOT NULL,
        diversion_ratio_12 NUMERIC NOT NULL,
        diversion_ratio_21 NUMERIC NOT NULL,
        price_level_1 NUMERIC NOT NULL,
        price_level_2 NUMERIC NOT NULL,
        gross_margin_1_pct NUMERIC NOT NULL,
        gross_margin_2_pct NUMERIC NOT NULL,
        marginal_cost_efficiency_1_pct NUMERIC NOT NULL DEFAULT 0.0,
        marginal_cost_efficiency_2_pct NUMERIC NOT NULL DEFAULT 0.0,
        guppi_1_pct NUMERIC NOT NULL,
        guppi_2_pct NUMERIC NOT NULL,
        max_guppi_pct NUMERIC NOT NULL,
        unilateral_effects_risk_tier VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_guppi_user ON guppi_economic_analyses(user_id);
      CREATE INDEX IF NOT EXISTS idx_guppi_mkt ON guppi_economic_analyses(relevant_market_id);

      CREATE TABLE IF NOT EXISTS global_clearance_filings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        jurisdiction_code VARCHAR(20) NOT NULL,
        regulatory_agency_name VARCHAR(100) NOT NULL,
        filing_type VARCHAR(50) NOT NULL,
        filing_status VARCHAR(50) NOT NULL DEFAULT 'drafting',
        formal_submission_date DATE,
        statutory_deadline_date DATE,
        current_review_phase VARCHAR(50) NOT NULL DEFAULT 'phase_1',
        remedies_submitted BOOLEAN NOT NULL DEFAULT false,
        stop_the_clock_invoked BOOLEAN NOT NULL DEFAULT false,
        clearance_decision VARCHAR(50) NOT NULL DEFAULT 'pending',
        clearance_order_date DATE,
        outside_counsel_lead VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_global_clearance_user ON global_clearance_filings(user_id);
      CREATE INDEX IF NOT EXISTS idx_global_clearance_tx ON global_clearance_filings(transaction_id);

      CREATE TABLE IF NOT EXISTS remedy_divestiture_packages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        package_name VARCHAR(255) NOT NULL,
        remedy_type VARCHAR(50) NOT NULL,
        carveout_business_unit VARCHAR(255) NOT NULL,
        carveout_revenue_usd NUMERIC NOT NULL,
        carveout_ebitda_usd NUMERIC NOT NULL,
        upfront_buyer_name VARCHAR(255),
        upfront_buyer_viability_score NUMERIC NOT NULL DEFAULT 85.0,
        asset_overlap_mitigated_pct NUMERIC NOT NULL,
        standalone_viability_score NUMERIC NOT NULL DEFAULT 80.0,
        clean_team_compliance_score NUMERIC NOT NULL DEFAULT 90.0,
        behavioral_commitments_score NUMERIC NOT NULL DEFAULT 75.0,
        remedy_defensibility_index NUMERIC NOT NULL,
        agency_acceptance_status VARCHAR(50) NOT NULL DEFAULT 'proposed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_remedy_packages_user ON remedy_divestiture_packages(user_id);
      CREATE INDEX IF NOT EXISTS idx_remedy_packages_tx ON remedy_divestiture_packages(transaction_id);

      CREATE TABLE IF NOT EXISTS clean_team_firewall_protocols (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        protocol_title VARCHAR(255) NOT NULL,
        clean_data_room_vendor VARCHAR(100) NOT NULL,
        established_date DATE NOT NULL,
        firewall_status VARCHAR(50) NOT NULL DEFAULT 'active',
        cleared_counsel_count INT NOT NULL DEFAULT 12,
        cleared_consultants_count INT NOT NULL DEFAULT 8,
        covered_commercially_sensitive_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        gun_jumping_audit_frequency VARCHAR(50) NOT NULL DEFAULT 'bi_weekly',
        last_compliance_audit_date DATE,
        any_reported_breaches BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_clean_team_user ON clean_team_firewall_protocols(user_id);
      CREATE INDEX IF NOT EXISTS idx_clean_team_tx ON clean_team_firewall_protocols(transaction_id);

      CREATE TABLE IF NOT EXISTS antitrust_litigation_dockets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        court_or_agency VARCHAR(255) NOT NULL,
        docket_number VARCHAR(100) NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        presiding_judge VARCHAR(255) NOT NULL,
        preliminary_injunction_risk_pct NUMERIC NOT NULL,
        evidentiary_hearing_date DATE,
        trial_date DATE,
        cid_depositions_scheduled INT NOT NULL DEFAULT 0,
        cid_depositions_completed INT NOT NULL DEFAULT 0,
        litigation_posture VARCHAR(50) NOT NULL DEFAULT 'discovery',
        settlement_discussions_open BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_litigation_dockets_user ON antitrust_litigation_dockets(user_id);
      CREATE INDEX IF NOT EXISTS idx_litigation_dockets_tx ON antitrust_litigation_dockets(transaction_id);

      CREATE TABLE IF NOT EXISTS antitrust_tripartite_ratifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        filing_strategy_title VARCHAR(255) NOT NULL,
        regulatory_clearance_risk_score NUMERIC NOT NULL,
        lead_counsel_signed BOOLEAN NOT NULL DEFAULT false,
        lead_counsel_signer VARCHAR(255),
        lead_counsel_date TIMESTAMPTZ,
        lead_counsel_statement TEXT,
        general_counsel_signed BOOLEAN NOT NULL DEFAULT false,
        general_counsel_signer VARCHAR(255),
        general_counsel_date TIMESTAMPTZ,
        general_counsel_statement TEXT,
        chief_executive_officer_signed BOOLEAN NOT NULL DEFAULT false,
        chief_executive_officer_signer VARCHAR(255),
        chief_executive_officer_date TIMESTAMPTZ,
        chief_executive_officer_statement TEXT,
        is_fully_ratified BOOLEAN NOT NULL DEFAULT false,
        cryptographic_integrity_hash VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_antitrust_ratif_user ON antitrust_tripartite_ratifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_antitrust_ratif_tx ON antitrust_tripartite_ratifications(transaction_id);

      CREATE TABLE IF NOT EXISTS antitrust_audit_event_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL REFERENCES antitrust_merger_transactions(id) ON DELETE CASCADE,
        event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        event_category VARCHAR(50) NOT NULL,
        actor_name VARCHAR(255) NOT NULL,
        headline VARCHAR(255) NOT NULL,
        details TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_antitrust_logs_user ON antitrust_audit_event_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_antitrust_logs_tx ON antitrust_audit_event_logs(transaction_id);
    `);

    this.schemaInitialized = true;
  }

  async resetDemoData(userId: string): Promise<void> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await client.query('DELETE FROM antitrust_audit_event_logs WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM antitrust_tripartite_ratifications WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM antitrust_litigation_dockets WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM clean_team_firewall_protocols WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM remedy_divestiture_packages WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM global_clearance_filings WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM guppi_economic_analyses WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM market_participant_shares WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM antitrust_relevant_markets WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM hsr_second_requests WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM hsr_statutory_assessments WHERE user_id = $1', [userId]);
      await client.query('DELETE FROM antitrust_merger_transactions WHERE user_id = $1', [userId]);

      const txId = randomUUID();
      const evUsd = 14200000000;
      const cashUsd = 10000000000;
      const stockUsd = 4200000000;
      const rtfPct = 4.5;
      const rtfUsd = (evUsd * rtfPct) / 100;

      await client.query(
        `INSERT INTO antitrust_merger_transactions (
          id, user_id, deal_codename, acquirer_name, target_name,
          enterprise_value_usd, cash_consideration_usd, stock_consideration_usd,
          announced_date, targeted_closing_date, reverse_termination_fee_pct,
          reverse_termination_fee_usd, deal_structure_type, overall_transaction_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          txId, userId, 'PROJECT AEGIS TITAN', 'Nexus Tech Global Inc.', 'Apex Enterprise Software Corp.',
          evUsd, cashUsd, stockUsd, '2026-09-15', '2027-06-30', rtfPct, rtfUsd,
          'horizontal_merger', 'second_request_subpoena'
        ]
      );

      const hsrThresholds = evaluateHsrStatutoryThresholds(evUsd, 850000000, 320000000);
      const hsrId = randomUUID();
      await client.query(
        `INSERT INTO hsr_statutory_assessments (
          id, user_id, transaction_id, size_of_transaction_test_passed,
          transaction_value_usd, size_of_transaction_threshold_usd,
          size_of_person_test_passed, larger_person_net_sales_usd, smaller_person_net_sales_usd,
          size_of_person_lower_threshold_usd, size_of_person_upper_threshold_usd,
          unconditional_filing_threshold_usd, is_hsr_filing_required, statutory_filing_fee_usd,
          initial_waiting_period_days, earliest_waiting_period_expiry,
          item_4c_documents_cataloged, item_4d_documents_cataloged, filing_prepared_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          hsrId, userId, txId, hsrThresholds.sizeOfTransactionTestPassed,
          evUsd, 119500000,
          hsrThresholds.sizeOfPersonTestPassed, 850000000, 320000000,
          23900000, 239000000,
          478000000, hsrThresholds.isHsrFilingRequired, hsrThresholds.statutoryFilingFeeUsd,
          30, '2026-10-20', 142, 68, '2026-09-20'
        ]
      );

      const srId = randomUUID();
      await client.query(
        `INSERT INTO hsr_second_requests (
          id, user_id, transaction_id, issuing_agency, receipt_date,
          scope_description, custodian_count, custodians_agreed_count,
          data_volume_terabytes, documents_reviewed_count, documents_produced_count,
          privilege_log_entries_count, certified_substantial_compliance,
          compliance_certification_date, extended_waiting_period_expiry, estimated_defense_costs_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          srId, userId, txId, 'US Federal Trade Commission (Bureau of Competition)',
          '2026-10-18',
          'Broad specification demanding all product roadmap files, pricing algorithms, win/loss telemetry, executive correspondence, and customer switching surveys concerning Cloud HCM and ATS platforms.',
          45, 38, 24.5, 840000, 215000, 3400, false, null, '2027-04-30', 28500000
        ]
      );

      const mkt1Id = randomUUID();
      const mkt1Shares = [28, 22, 18, 12, 10, 10];
      const mkt1PreHhi = calculateHhiConcentration(mkt1Shares).hhi;
      const mkt1Delta = calculateDeltaHhi(28, 22);
      const mkt1PostHhi = mkt1PreHhi + mkt1Delta.deltaHhi;
      const mkt1Presumption = evaluateHhiPresumption(mkt1PostHhi, mkt1Delta.deltaHhi, mkt1Delta.postMergerSharePct);

      await client.query(
        `INSERT INTO antitrust_relevant_markets (
          id, user_id, transaction_id, market_name, product_market_definition,
          geographic_market_scope, total_market_size_usd, ssnip_test_critical_loss_pct,
          hypothetical_monopolist_test_passed, pre_merger_hhi, post_merger_hhi,
          delta_hhi, concentration_tier, presumption_rebuttable_unlawful
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          mkt1Id, userId, txId,
          'Global Cloud Enterprise HCM Platforms',
          'Integrated core HR, payroll, benefits administration, and workforce management suites serving enterprises > 5,000 employees',
          'Worldwide (North America & EEA primary cluster)',
          28000000000, 8.5, true,
          mkt1PreHhi, mkt1PostHhi, mkt1Delta.deltaHhi,
          mkt1Presumption.concentrationTier, mkt1Presumption.presumptionRebuttableUnlawful
        ]
      );

      const participants1 = [
        { name: 'Nexus Tech Global', party: true, acq: true, tgt: false, rev: 7840000000, share: 28, post: 50 },
        { name: 'Apex Enterprise Software', party: true, acq: false, tgt: true, rev: 6160000000, share: 22, post: 50 },
        { name: 'SAP SuccessFactors', party: false, acq: false, tgt: false, rev: 5040000000, share: 18, post: 18 },
        { name: 'Workday Inc.', party: false, acq: false, tgt: false, rev: 3360000000, share: 12, post: 12 },
        { name: 'Oracle Cloud HCM', party: false, acq: false, tgt: false, rev: 2800000000, share: 10, post: 10 },
        { name: 'Other Point Solutions', party: false, acq: false, tgt: false, rev: 2800000000, share: 10, post: 10 }
      ];

      for (const p of participants1) {
        await client.query(
          `INSERT INTO market_participant_shares (
            id, user_id, relevant_market_id, participant_name, is_merging_party,
            is_acquirer, is_target, annual_revenue_usd, market_share_pct, post_merger_share_pct
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [randomUUID(), userId, mkt1Id, p.name, p.party, p.acq, p.tgt, p.rev, p.share, p.post]
        );
      }

      const guppi1 = calculateGuppi(0.35, 0.28, 120, 110, 65, 70, 2.0, 1.5);
      await client.query(
        `INSERT INTO guppi_economic_analyses (
          id, user_id, relevant_market_id, acquirer_product_name, target_product_name,
          diversion_ratio_12, diversion_ratio_21, price_level_1, price_level_2,
          gross_margin_1_pct, gross_margin_2_pct, marginal_cost_efficiency_1_pct,
          marginal_cost_efficiency_2_pct, guppi_1_pct, guppi_2_pct, max_guppi_pct,
          unilateral_effects_risk_tier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          randomUUID(), userId, mkt1Id,
          'Nexus PeoplePulse Enterprise Suite', 'Apex Workforce Hub Ultra',
          0.35, 0.28, 120, 110, 65, 70, 2.0, 1.5,
          guppi1.guppi1Pct, guppi1.guppi2Pct, guppi1.maxGuppiPct,
          guppi1.unilateralEffectsRiskTier
        ]
      );

      const mkt2Id = randomUUID();
      const mkt2Shares = [24.5, 20.0, 18.5, 15.0, 12.0, 10.0];
      const mkt2PreHhi = calculateHhiConcentration(mkt2Shares).hhi;
      const mkt2Delta = calculateDeltaHhi(24.5, 20.0);
      const mkt2PostHhi = mkt2PreHhi + mkt2Delta.deltaHhi;
      const mkt2Presumption = evaluateHhiPresumption(mkt2PostHhi, mkt2Delta.deltaHhi, mkt2Delta.postMergerSharePct);

      await client.query(
        `INSERT INTO antitrust_relevant_markets (
          id, user_id, transaction_id, market_name, product_market_definition,
          geographic_market_scope, total_market_size_usd, ssnip_test_critical_loss_pct,
          hypothetical_monopolist_test_passed, pre_merger_hhi, post_merger_hhi,
          delta_hhi, concentration_tier, presumption_rebuttable_unlawful
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          mkt2Id, userId, txId,
          'Enterprise Recruiting & ATS Automation Solutions',
          'AI-powered applicant tracking, candidate sourcing, and automated interview scheduling pipelines',
          'North America & Global Multi-National',
          8500000000, 9.2, true,
          mkt2PreHhi, mkt2PostHhi, mkt2Delta.deltaHhi,
          mkt2Presumption.concentrationTier, mkt2Presumption.presumptionRebuttableUnlawful
        ]
      );

      const participants2 = [
        { name: 'Nexus TalentSphere', party: true, acq: true, tgt: false, rev: 2082500000, share: 24.5, post: 44.5 },
        { name: 'Apex Talent Suite', party: true, acq: false, tgt: true, rev: 1700000000, share: 20.0, post: 44.5 },
        { name: 'Greenhouse Software', party: false, acq: false, tgt: false, rev: 1572500000, share: 18.5, post: 18.5 },
        { name: 'Lever / Employ Inc.', party: false, acq: false, tgt: false, rev: 1275000000, share: 15.0, post: 15.0 },
        { name: 'iCIMS Enterprise', party: false, acq: false, tgt: false, rev: 1020000000, share: 12.0, post: 12.0 },
        { name: 'SmartRecruiters', party: false, acq: false, tgt: false, rev: 850000000, share: 10.0, post: 10.0 }
      ];

      for (const p of participants2) {
        await client.query(
          `INSERT INTO market_participant_shares (
            id, user_id, relevant_market_id, participant_name, is_merging_party,
            is_acquirer, is_target, annual_revenue_usd, market_share_pct, post_merger_share_pct
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [randomUUID(), userId, mkt2Id, p.name, p.party, p.acq, p.tgt, p.rev, p.share, p.post]
        );
      }

      const guppi2 = calculateGuppi(0.38, 0.32, 95, 90, 72, 75, 2.5, 2.0);
      await client.query(
        `INSERT INTO guppi_economic_analyses (
          id, user_id, relevant_market_id, acquirer_product_name, target_product_name,
          diversion_ratio_12, diversion_ratio_21, price_level_1, price_level_2,
          gross_margin_1_pct, gross_margin_2_pct, marginal_cost_efficiency_1_pct,
          marginal_cost_efficiency_2_pct, guppi_1_pct, guppi_2_pct, max_guppi_pct,
          unilateral_effects_risk_tier
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          randomUUID(), userId, mkt2Id,
          'Nexus TalentSphere AI', 'Apex Talent Suite Pro',
          0.38, 0.32, 95, 90, 72, 75, 2.5, 2.0,
          guppi2.guppi1Pct, guppi2.guppi2Pct, guppi2.maxGuppiPct,
          guppi2.unilateralEffectsRiskTier
        ]
      );

      const filings = [
        {
          code: 'US_FTC_DOJ', agency: 'US Federal Trade Commission', type: 'HSR Form 15 U.S.C. § 18a',
          status: 'second_request_issued', sub: '2026-09-20', dead: '2027-04-30', phase: 'phase_2',
          remedies: false, stop: false, dec: 'second_request_pending', order: null, lead: 'Cravath, Swaine & Moore LLP'
        },
        {
          code: 'EU_DG_COMP', agency: 'European Commission DG Competition', type: 'Form CO Council Reg. 139/2004',
          status: 'formal_notification_pending', sub: '2026-10-05', dead: '2027-05-15', phase: 'phase_1',
          remedies: true, stop: false, dec: 'pending', order: null, lead: 'Freshfields Bruckhaus Deringer LLP'
        },
        {
          code: 'UK_CMA', agency: 'UK Competition and Markets Authority', type: 'Merger Notice Enterprise Act 2002',
          status: 'phase_1_review', sub: '2026-10-10', dead: '2026-12-05', phase: 'phase_1',
          remedies: false, stop: false, dec: 'phase_2_referral', order: null, lead: 'Slaughter and May'
        },
        {
          code: 'CN_SAMR', agency: 'State Administration for Market Regulation', type: 'Anti-Monopoly Notification',
          status: 'case_accepted', sub: '2026-09-28', dead: '2027-03-25', phase: 'phase_2',
          remedies: false, stop: false, dec: 'pending', order: null, lead: 'King & Wood Mallesons'
        },
        {
          code: 'CA_COMP_BUR', agency: 'Canadian Competition Bureau', type: 'Section 114 ARC Notification',
          status: 'sir_issued', sub: '2026-10-02', dead: '2027-02-15', phase: 'phase_2',
          remedies: false, stop: false, dec: 'pending', order: null, lead: 'Blake, Cassels & Graydon LLP'
        }
      ];

      for (const f of filings) {
        await client.query(
          `INSERT INTO global_clearance_filings (
            id, user_id, transaction_id, jurisdiction_code, regulatory_agency_name,
            filing_type, filing_status, formal_submission_date, statutory_deadline_date,
            current_review_phase, remedies_submitted, stop_the_clock_invoked,
            clearance_decision, clearance_order_date, outside_counsel_lead
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            randomUUID(), userId, txId, f.code, f.agency, f.type, f.status,
            f.sub, f.dead, f.phase, f.remedies, f.stop, f.dec, f.order, f.lead
          ]
        );
      }

      const remedy1Rdi = calculateRemedyDefensibilityIndex({
        overlapMitigatedPct: 92.5,
        upfrontBuyerViabilityScore: 88.0,
        standaloneViabilityScore: 85.0,
        cleanTeamComplianceScore: 95.0,
        behavioralCommitmentsScore: 80.0
      });

      await client.query(
        `INSERT INTO remedy_divestiture_packages (
          id, user_id, transaction_id, package_name, remedy_type, carveout_business_unit,
          carveout_revenue_usd, carveout_ebitda_usd, upfront_buyer_name,
          upfront_buyer_viability_score, asset_overlap_mitigated_pct,
          standalone_viability_score, clean_team_compliance_score, behavioral_commitments_score,
          remedy_defensibility_index, agency_acceptance_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          randomUUID(), userId, txId,
          'Apex Talent Suite Standalone Carve-Out Package',
          'fix_it_first_buyer_sale',
          'Apex Talent Acquisition & ATS Division',
          1850000000, 410000000,
          'Vista Sovereign Equity Partners',
          88.0, 92.5, 85.0, 95.0, 80.0,
          remedy1Rdi.rdi, 'proposed'
        ]
      );

      const remedy2Rdi = calculateRemedyDefensibilityIndex({
        overlapMitigatedPct: 55.0,
        upfrontBuyerViabilityScore: 60.0,
        standaloneViabilityScore: 65.0,
        cleanTeamComplianceScore: 88.0,
        behavioralCommitmentsScore: 70.0
      });

      await client.query(
        `INSERT INTO remedy_divestiture_packages (
          id, user_id, transaction_id, package_name, remedy_type, carveout_business_unit,
          carveout_revenue_usd, carveout_ebitda_usd, upfront_buyer_name,
          upfront_buyer_viability_score, asset_overlap_mitigated_pct,
          standalone_viability_score, clean_team_compliance_score, behavioral_commitments_score,
          remedy_defensibility_index, agency_acceptance_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          randomUUID(), userId, txId,
          'Enterprise Payroll Orchestration Interoperability Commitments',
          'behavioral_frand_licensing',
          'Nexus Connect API & Data Exchange Hub',
          620000000, 140000000,
          null,
          60.0, 55.0, 65.0, 88.0, 70.0,
          remedy2Rdi.rdi, 'under_review'
        ]
      );

      await client.query(
        `INSERT INTO clean_team_firewall_protocols (
          id, user_id, transaction_id, protocol_title, clean_data_room_vendor,
          established_date, firewall_status, cleared_counsel_count,
          cleared_consultants_count, covered_commercially_sensitive_categories,
          gun_jumping_audit_frequency, last_compliance_audit_date, any_reported_breaches
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          randomUUID(), userId, txId,
          'Project Aegis Titan Multi-Jurisdictional Clean Team Protocol',
          'Intralinks Secure Enterprise VDR',
          '2026-09-18', 'active', 18, 10,
          JSON.stringify([
            'Customer-specific contract pricing & discount grids',
            'Unannounced product engineering roadmaps (2027-2029)',
            'Algorithmic match weights & machine learning source code',
            'Granular sales rep quota compensation plans'
          ]),
          'bi_weekly', '2026-10-22', false
        ]
      );

      await client.query(
        `INSERT INTO antitrust_litigation_dockets (
          id, user_id, transaction_id, court_or_agency, docket_number,
          action_type, presiding_judge, preliminary_injunction_risk_pct,
          evidentiary_hearing_date, trial_date, cid_depositions_scheduled,
          cid_depositions_completed, litigation_posture, settlement_discussions_open
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          randomUUID(), userId, txId,
          'US District Court for the District of Columbia',
          '1:26-cv-03892-CKK',
          'Section 13(b) Preliminary Injunction Action',
          'Hon. Colleen Kollar-Kotelly',
          68.5,
          '2027-02-18', '2027-05-10',
          14, 9, 'active_discovery', true
        ]
      );

      const compositeRcrs = calculateRegulatoryClearanceRiskScore({
        postMergerHhi: mkt1PostHhi,
        deltaHhi: mkt1Delta.deltaHhi,
        maxGuppiPct: guppi1.maxGuppiPct,
        phase2FilingsCount: 3,
        phase1FilingsCount: 1,
        hasConflictingForeignRemedy: true,
        customerObjectionsCount: 4,
        competitorWhitepapersCount: 2,
        stateAgInquiriesCount: 3,
        custodianCount: 45,
        dataVolumeTerabytes: 24.5,
        hasCidDeposition: true
      });

      const seedLeadSigner = 'Jonathan Vance, Esq. (Partner, Global Antitrust)';
      const seedRatifHash = computeRatificationHash({
        transactionId: txId,
        regulatoryClearanceRiskScore: compositeRcrs.score,
        leadCounselSigner: seedLeadSigner,
        generalCounselSigner: '',
        chiefExecutiveOfficerSigner: ''
      });

      await client.query(
        `INSERT INTO antitrust_tripartite_ratifications (
          id, user_id, transaction_id, filing_strategy_title,
          regulatory_clearance_risk_score, lead_counsel_signed, lead_counsel_signer,
          lead_counsel_date, lead_counsel_statement, general_counsel_signed,
          general_counsel_signer, general_counsel_date, general_counsel_statement,
          chief_executive_officer_signed, chief_executive_officer_signer,
          chief_executive_officer_date, chief_executive_officer_statement,
          is_fully_ratified, cryptographic_integrity_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          randomUUID(), userId, txId,
          'Project Aegis Titan Global Antitrust Defense & Remedy Strategy',
          compositeRcrs.score,
          true, seedLeadSigner, '2026-10-23T14:30:00Z',
          'Formal legal opinion rendered: Item 4(c)/4(d) e-discovery preservation hold verified; Fix-It-First carve-out package defensibility index validated under 2023 Merger Guidelines.',
          false, null, null, null,
          false, null, null, null,
          false, seedRatifHash
        ]
      );

      const logs = [
        {
          cat: 'statutory_filing', actor: 'Lead Regulatory Counsel',
          headline: 'HSR Premerger Notification Formal Submission',
          details: 'Initial HSR filing submitted to FTC Premerger Notification Office and DOJ Antitrust Division with $2,335,000 statutory filing fee.',
          sev: 'regulatory_filing', time: '2026-09-20T10:00:00Z'
        },
        {
          cat: 'investigation', actor: 'FTC Bureau of Competition',
          headline: 'HSR Second Request Subpoena Received',
          details: 'Second Request issued covering 45 key custodians across cloud engineering, product monetization, and corporate strategy.',
          sev: 'critical', time: '2026-10-18T16:45:00Z'
        },
        {
          cat: 'clean_team', actor: 'Chief Compliance Officer',
          headline: 'Intralinks Clean Team Firewall Established',
          details: 'Firewall protocol signed by 18 outside counsel and 10 economic consultants to avoid gun-jumping under Sherman Act § 1.',
          sev: 'info', time: '2026-10-19T09:15:00Z'
        },
        {
          cat: 'remedy_design', actor: 'M&A Antitrust Practice Group',
          headline: 'Apex Talent Suite Upfront Divestiture Package Structured',
          details: 'Fix-It-First binding term sheet entered with Vista Sovereign Equity Partners for $1.85B revenue business unit.',
          sev: 'warning', time: '2026-10-22T11:30:00Z'
        },
        {
          cat: 'board_ratification', actor: 'Jonathan Vance, Esq.',
          headline: 'Lead Antitrust Counsel Cryptographic Sign-Off Executed',
          details: 'Lead regulatory counsel signed off on multi-jurisdictional defense strategy with RCRS score of 78.4.',
          sev: 'info', time: '2026-10-23T14:30:00Z'
        }
      ];

      for (const log of logs) {
        await client.query(
          `INSERT INTO antitrust_audit_event_logs (
            id, user_id, transaction_id, event_timestamp, event_category,
            actor_name, headline, details, severity
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [randomUUID(), userId, txId, log.time, log.cat, log.actor, log.headline, log.details, log.sev]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getOverview(userId: string): Promise<AntitrustCompetitionOverview> {
    await this.ensureSchema();

    let txRes = await this.pool.query(
      'SELECT * FROM antitrust_merger_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (txRes.rows.length === 0) {
      await this.resetDemoData(userId);
      txRes = await this.pool.query(
        'SELECT * FROM antitrust_merger_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
    }

    const txRow = txRes.rows[0];
    const txId = txRow.id;

    const [
      hsrRes,
      secondRequestRes,
      marketsRes,
      sharesRes,
      guppiRes,
      filingsRes,
      remediesRes,
      cleanTeamRes,
      litigationRes,
      ratifRes,
      logsRes
    ] = await Promise.all([
      this.pool.query('SELECT * FROM hsr_statutory_assessments WHERE user_id = $1 AND transaction_id = $2 LIMIT 1', [userId, txId]),
      this.pool.query('SELECT * FROM hsr_second_requests WHERE user_id = $1 AND transaction_id = $2 LIMIT 1', [userId, txId]),
      this.pool.query('SELECT * FROM antitrust_relevant_markets WHERE user_id = $1 AND transaction_id = $2 ORDER BY created_at ASC', [userId, txId]),
      this.pool.query(
        `SELECT s.* FROM market_participant_shares s
         JOIN antitrust_relevant_markets m ON s.relevant_market_id = m.id
         WHERE s.user_id = $1 AND m.transaction_id = $2
         ORDER BY s.market_share_pct DESC`,
        [userId, txId]
      ),
      this.pool.query(
        `SELECT g.* FROM guppi_economic_analyses g
         JOIN antitrust_relevant_markets m ON g.relevant_market_id = m.id
         WHERE g.user_id = $1 AND m.transaction_id = $2`,
        [userId, txId]
      ),
      this.pool.query('SELECT * FROM global_clearance_filings WHERE user_id = $1 AND transaction_id = $2 ORDER BY formal_submission_date ASC NULLS LAST', [userId, txId]),
      this.pool.query('SELECT * FROM remedy_divestiture_packages WHERE user_id = $1 AND transaction_id = $2 ORDER BY remedy_defensibility_index DESC', [userId, txId]),
      this.pool.query('SELECT * FROM clean_team_firewall_protocols WHERE user_id = $1 AND transaction_id = $2 LIMIT 1', [userId, txId]),
      this.pool.query('SELECT * FROM antitrust_litigation_dockets WHERE user_id = $1 AND transaction_id = $2 LIMIT 1', [userId, txId]),
      this.pool.query('SELECT * FROM antitrust_tripartite_ratifications WHERE user_id = $1 AND transaction_id = $2 LIMIT 1', [userId, txId]),
      this.pool.query('SELECT * FROM antitrust_audit_event_logs WHERE user_id = $1 AND transaction_id = $2 ORDER BY event_timestamp DESC LIMIT 50', [userId, txId])
    ]);

    const transaction: AntitrustMergerTransaction = {
      id: txRow.id,
      dealCodename: txRow.deal_codename,
      acquirerName: txRow.acquirer_name,
      targetName: txRow.target_name,
      enterpriseValueUsd: Number(txRow.enterprise_value_usd),
      cashConsiderationUsd: Number(txRow.cash_consideration_usd),
      stockConsiderationUsd: Number(txRow.stock_consideration_usd),
      announcedDate: new Date(txRow.announced_date).toISOString().slice(0, 10),
      targetedClosingDate: new Date(txRow.targeted_closing_date).toISOString().slice(0, 10),
      reverseTerminationFeePct: Number(txRow.reverse_termination_fee_pct),
      reverseTerminationFeeUsd: Number(txRow.reverse_termination_fee_usd),
      dealStructureType: txRow.deal_structure_type,
      overallTransactionStatus: txRow.overall_transaction_status,
      createdAt: new Date(txRow.created_at).toISOString(),
      updatedAt: new Date(txRow.updated_at).toISOString()
    };

    const hsrRow = hsrRes.rows[0];
    const hsrAssessment: HsrStatutoryAssessment = {
      id: hsrRow.id,
      transactionId: hsrRow.transaction_id,
      sizeOfTransactionTestPassed: hsrRow.size_of_transaction_test_passed,
      transactionValueUsd: Number(hsrRow.transaction_value_usd),
      sizeOfTransactionThresholdUsd: Number(hsrRow.size_of_transaction_threshold_usd),
      sizeOfPersonTestPassed: hsrRow.size_of_person_test_passed,
      largerPersonNetSalesUsd: Number(hsrRow.larger_person_net_sales_usd),
      smallerPersonNetSalesUsd: Number(hsrRow.smaller_person_net_sales_usd),
      sizeOfPersonLowerThresholdUsd: Number(hsrRow.size_of_person_lower_threshold_usd),
      sizeOfPersonUpperThresholdUsd: Number(hsrRow.size_of_person_upper_threshold_usd),
      unconditionalFilingThresholdUsd: Number(hsrRow.unconditional_filing_threshold_usd),
      isHsrFilingRequired: hsrRow.is_hsr_filing_required,
      statutoryFilingFeeUsd: Number(hsrRow.statutory_filing_fee_usd),
      initialWaitingPeriodDays: hsrRow.initial_waiting_period_days,
      earliestWaitingPeriodExpiry: hsrRow.earliest_waiting_period_expiry ? new Date(hsrRow.earliest_waiting_period_expiry).toISOString().slice(0, 10) : null,
      item4cDocumentsCataloged: hsrRow.item_4c_documents_cataloged,
      item4dDocumentsCataloged: hsrRow.item_4d_documents_cataloged,
      filingPreparedDate: hsrRow.filing_prepared_date ? new Date(hsrRow.filing_prepared_date).toISOString().slice(0, 10) : null,
      createdAt: new Date(hsrRow.created_at).toISOString(),
      updatedAt: new Date(hsrRow.updated_at).toISOString()
    };

    let secondRequest: HsrSecondRequest | null = null;
    if (secondRequestRes.rows.length > 0) {
      const sr = secondRequestRes.rows[0];
      secondRequest = {
        id: sr.id,
        transactionId: sr.transaction_id,
        issuingAgency: sr.issuing_agency,
        receiptDate: new Date(sr.receipt_date).toISOString().slice(0, 10),
        scopeDescription: sr.scope_description,
        custodianCount: sr.custodian_count,
        custodiansAgreedCount: sr.custodians_agreed_count,
        dataVolumeTerabytes: Number(sr.data_volume_terabytes),
        documentsReviewedCount: sr.documents_reviewed_count,
        documentsProducedCount: sr.documents_produced_count,
        privilegeLogEntriesCount: sr.privilege_log_entries_count,
        certifiedSubstantialCompliance: sr.certified_substantial_compliance,
        complianceCertificationDate: sr.compliance_certification_date ? new Date(sr.compliance_certification_date).toISOString().slice(0, 10) : null,
        extendedWaitingPeriodExpiry: sr.extended_waiting_period_expiry ? new Date(sr.extended_waiting_period_expiry).toISOString().slice(0, 10) : null,
        estimatedDefenseCostsUsd: Number(sr.estimated_defense_costs_usd),
        createdAt: new Date(sr.created_at).toISOString(),
        updatedAt: new Date(sr.updated_at).toISOString()
      };
    }

    const relevantMarkets: AntitrustRelevantMarket[] = marketsRes.rows.map(m => ({
      id: m.id,
      transactionId: m.transaction_id,
      marketName: m.market_name,
      productMarketDefinition: m.product_market_definition,
      geographicMarketScope: m.geographic_market_scope,
      totalMarketSizeUsd: Number(m.total_market_size_usd),
      ssnipTestCriticalLossPct: Number(m.ssnip_test_critical_loss_pct),
      hypotheticalMonopolistTestPassed: m.hypothetical_monopolist_test_passed,
      preMergerHhi: Number(m.pre_merger_hhi),
      postMergerHhi: Number(m.post_merger_hhi),
      deltaHhi: Number(m.delta_hhi),
      concentrationTier: m.concentration_tier,
      presumptionRebuttableUnlawful: m.presumption_rebuttable_unlawful,
      createdAt: new Date(m.created_at).toISOString(),
      updatedAt: new Date(m.updated_at).toISOString()
    }));

    const marketParticipants: MarketParticipantShare[] = sharesRes.rows.map(s => ({
      id: s.id,
      relevantMarketId: s.relevant_market_id,
      participantName: s.participant_name,
      isMergingParty: s.is_merging_party,
      isAcquirer: s.is_acquirer,
      isTarget: s.is_target,
      annualRevenueUsd: Number(s.annual_revenue_usd),
      marketSharePct: Number(s.market_share_pct),
      postMergerSharePct: Number(s.post_merger_share_pct),
      createdAt: new Date(s.created_at).toISOString()
    }));

    const guppiAnalyses: GuppiEconomicAnalysis[] = guppiRes.rows.map(g => ({
      id: g.id,
      relevantMarketId: g.relevant_market_id,
      acquirerProductName: g.acquirer_product_name,
      targetProductName: g.target_product_name,
      diversionRatio12: Number(g.diversion_ratio_12),
      diversionRatio21: Number(g.diversion_ratio_21),
      priceLevel1: Number(g.price_level_1),
      priceLevel2: Number(g.price_level_2),
      grossMargin1Pct: Number(g.gross_margin_1_pct),
      grossMargin2Pct: Number(g.gross_margin_2_pct),
      marginalCostEfficiency1Pct: Number(g.marginal_cost_efficiency_1_pct),
      marginalCostEfficiency2Pct: Number(g.marginal_cost_efficiency_2_pct),
      guppi1Pct: Number(g.guppi_1_pct),
      guppi2Pct: Number(g.guppi_2_pct),
      maxGuppiPct: Number(g.max_guppi_pct),
      unilateralEffectsRiskTier: g.unilateral_effects_risk_tier,
      createdAt: new Date(g.created_at).toISOString()
    }));

    const globalFilings: GlobalClearanceFiling[] = filingsRes.rows.map(f => ({
      id: f.id,
      transactionId: f.transaction_id,
      jurisdictionCode: f.jurisdiction_code,
      regulatoryAgencyName: f.regulatory_agency_name,
      filingType: f.filing_type,
      filingStatus: f.filing_status,
      formalSubmissionDate: f.formal_submission_date ? new Date(f.formal_submission_date).toISOString().slice(0, 10) : null,
      statutoryDeadlineDate: f.statutory_deadline_date ? new Date(f.statutory_deadline_date).toISOString().slice(0, 10) : null,
      currentReviewPhase: f.current_review_phase,
      remediesSubmitted: f.remedies_submitted,
      stopTheClockInvoked: f.stop_the_clock_invoked,
      clearanceDecision: f.clearance_decision,
      clearanceOrderDate: f.clearance_order_date ? new Date(f.clearance_order_date).toISOString().slice(0, 10) : null,
      outsideCounselLead: f.outside_counsel_lead,
      createdAt: new Date(f.created_at).toISOString(),
      updatedAt: new Date(f.updated_at).toISOString()
    }));

    const remedyPackages: RemedyDivestiturePackage[] = remediesRes.rows.map(r => ({
      id: r.id,
      transactionId: r.transaction_id,
      packageName: r.package_name,
      remedyType: r.remedy_type,
      carveoutBusinessUnit: r.carveout_business_unit,
      carveoutRevenueUsd: Number(r.carveout_revenue_usd),
      carveoutEbitdaUsd: Number(r.carveout_ebitda_usd),
      upfrontBuyerName: r.upfront_buyer_name,
      upfrontBuyerViabilityScore: Number(r.upfront_buyer_viability_score),
      assetOverlapMitigatedPct: Number(r.asset_overlap_mitigated_pct),
      standaloneViabilityScore: Number(r.standalone_viability_score),
      cleanTeamComplianceScore: Number(r.clean_team_compliance_score),
      behavioralCommitmentsScore: Number(r.behavioral_commitments_score),
      remedyDefensibilityIndex: Number(r.remedy_defensibility_index),
      agencyAcceptanceStatus: r.agency_acceptance_status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    let cleanTeamProtocol: CleanTeamFirewallProtocol | null = null;
    if (cleanTeamRes.rows.length > 0) {
      const cleanTeamRow = cleanTeamRes.rows[0];
      cleanTeamProtocol = {
        id: cleanTeamRow.id,
        transactionId: cleanTeamRow.transaction_id,
        protocolTitle: cleanTeamRow.protocol_title,
        cleanDataRoomVendor: cleanTeamRow.clean_data_room_vendor,
        establishedDate: new Date(cleanTeamRow.established_date).toISOString().slice(0, 10),
        firewallStatus: cleanTeamRow.firewall_status,
        clearedCounselCount: cleanTeamRow.cleared_counsel_count,
        clearedConsultantsCount: cleanTeamRow.cleared_consultants_count,
        coveredCommerciallySensitiveCategories: Array.isArray(cleanTeamRow.covered_commercially_sensitive_categories)
          ? cleanTeamRow.covered_commercially_sensitive_categories
          : JSON.parse(cleanTeamRow.covered_commercially_sensitive_categories || '[]'),
        gunJumpingAuditFrequency: cleanTeamRow.gun_jumping_audit_frequency,
        lastComplianceAuditDate: cleanTeamRow.last_compliance_audit_date ? new Date(cleanTeamRow.last_compliance_audit_date).toISOString().slice(0, 10) : null,
        anyReportedBreaches: cleanTeamRow.any_reported_breaches,
        createdAt: new Date(cleanTeamRow.created_at).toISOString(),
        updatedAt: new Date(cleanTeamRow.updated_at).toISOString()
      };
    }

    let litigationDocket: AntitrustLitigationDocket | null = null;
    if (litigationRes.rows.length > 0) {
      const lit = litigationRes.rows[0];
      litigationDocket = {
        id: lit.id,
        transactionId: lit.transaction_id,
        courtOrAgency: lit.court_or_agency,
        docketNumber: lit.docket_number,
        actionType: lit.action_type,
        presidingJudge: lit.presiding_judge,
        preliminaryInjunctionRiskPct: Number(lit.preliminary_injunction_risk_pct),
        evidentiaryHearingDate: lit.evidentiary_hearing_date ? new Date(lit.evidentiary_hearing_date).toISOString().slice(0, 10) : null,
        trialDate: lit.trial_date ? new Date(lit.trial_date).toISOString().slice(0, 10) : null,
        cidDepositionsScheduled: lit.cid_depositions_scheduled,
        cidDepositionsCompleted: lit.cid_depositions_completed,
        litigationPosture: lit.litigation_posture,
        settlementDiscussionsOpen: lit.settlement_discussions_open,
        createdAt: new Date(lit.created_at).toISOString(),
        updatedAt: new Date(lit.updated_at).toISOString()
      };
    }

    const ratifRow = ratifRes.rows[0];
    const ratification: AntitrustTripartiteRatification = {
      id: ratifRow.id,
      transactionId: ratifRow.transaction_id,
      filingStrategyTitle: ratifRow.filing_strategy_title,
      regulatoryClearanceRiskScore: Number(ratifRow.regulatory_clearance_risk_score),
      leadCounselSigned: ratifRow.lead_counsel_signed,
      leadCounselSigner: ratifRow.lead_counsel_signer,
      leadCounselDate: ratifRow.lead_counsel_date ? new Date(ratifRow.lead_counsel_date).toISOString() : null,
      leadCounselStatement: ratifRow.lead_counsel_statement,
      generalCounselSigned: ratifRow.general_counsel_signed,
      generalCounselSigner: ratifRow.general_counsel_signer,
      generalCounselDate: ratifRow.general_counsel_date ? new Date(ratifRow.general_counsel_date).toISOString() : null,
      generalCounselStatement: ratifRow.general_counsel_statement,
      chiefExecutiveOfficerSigned: ratifRow.chief_executive_officer_signed,
      chiefExecutiveOfficerSigner: ratifRow.chief_executive_officer_signer,
      chiefExecutiveOfficerDate: ratifRow.chief_executive_officer_date ? new Date(ratifRow.chief_executive_officer_date).toISOString() : null,
      chiefExecutiveOfficerStatement: ratifRow.chief_executive_officer_statement,
      isFullyRatified: ratifRow.is_fully_ratified,
      cryptographicIntegrityHash: ratifRow.cryptographic_integrity_hash,
      createdAt: new Date(ratifRow.created_at).toISOString(),
      updatedAt: new Date(ratifRow.updated_at).toISOString()
    };

    const auditLogs: AntitrustAuditEventLog[] = logsRes.rows.map(l => ({
      id: l.id,
      transactionId: l.transaction_id,
      eventTimestamp: new Date(l.event_timestamp).toISOString(),
      eventCategory: l.event_category,
      actorName: l.actor_name,
      headline: l.headline,
      details: l.details,
      severity: l.severity,
      createdAt: new Date(l.created_at).toISOString()
    }));

    const maxPostMergerHhi = relevantMarkets.length > 0 ? Math.max(...relevantMarkets.map(m => m.postMergerHhi)) : 0;
    const maxDeltaHhi = relevantMarkets.length > 0 ? Math.max(...relevantMarkets.map(m => m.deltaHhi)) : 0;
    const maxGuppiPct = guppiAnalyses.length > 0 ? Math.max(...guppiAnalyses.map(g => g.maxGuppiPct)) : 0;
    const maxRemedyDefensibilityIndex = remedyPackages.length > 0 ? Math.max(...remedyPackages.map(r => r.remedyDefensibilityIndex)) : 0;
    const presumptionRebuttableCount = relevantMarkets.filter(m => m.presumptionRebuttableUnlawful).length;

    const phase2Count = globalFilings.filter(f => f.currentReviewPhase === 'phase_2').length;
    const phase1Count = globalFilings.filter(f => f.currentReviewPhase === 'phase_1').length;
    const hasConflictingRemedy = globalFilings.some(f => f.remediesSubmitted && f.clearanceDecision === 'phase_2_referral');

    const clearanceMetrics = calculateRegulatoryClearanceRiskScore({
      postMergerHhi: maxPostMergerHhi,
      deltaHhi: maxDeltaHhi,
      maxGuppiPct: maxGuppiPct,
      phase2FilingsCount: phase2Count,
      phase1FilingsCount: phase1Count,
      hasConflictingForeignRemedy: hasConflictingRemedy,
      customerObjectionsCount: 4,
      competitorWhitepapersCount: 2,
      stateAgInquiriesCount: 3,
      custodianCount: secondRequest ? secondRequest.custodianCount : 0,
      dataVolumeTerabytes: secondRequest ? secondRequest.dataVolumeTerabytes : 0,
      hasCidDeposition: litigationDocket ? litigationDocket.cidDepositionsScheduled > 0 : false
    });

    const reverseTerminationFeeExposureUsd = transaction.reverseTerminationFeeUsd;
    const expectedRegulatoryLossUsd =
      (reverseTerminationFeeExposureUsd * (clearanceMetrics.score / 100)) +
      (secondRequest ? secondRequest.estimatedDefenseCostsUsd : 0);

    return {
      transaction,
      hsrAssessment,
      secondRequest,
      relevantMarkets,
      marketParticipants,
      guppiAnalyses,
      globalFilings,
      remedyPackages,
      cleanTeamProtocol,
      litigationDocket,
      ratification,
      auditLogs,
      metrics: {
        maxPostMergerHhi,
        maxDeltaHhi,
        maxGuppiPct,
        overallClearanceRiskScore: clearanceMetrics.score,
        clearanceRiskBand: clearanceMetrics.riskBand,
        maxRemedyDefensibilityIndex,
        reverseTerminationFeeExposureUsd,
        expectedRegulatoryLossUsd: Number(expectedRegulatoryLossUsd.toFixed(0)),
        presumptionRebuttableCount
      }
    };
  }

  async createTransaction(userId: string, input: CreateMergerTransactionInput): Promise<AntitrustMergerTransaction> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const txId = randomUUID();
      const rtfPct = input.reverseTerminationFeePct ?? 4.5;
      const rtfUsd = (input.enterpriseValueUsd * rtfPct) / 100;

      const res = await client.query(
        `INSERT INTO antitrust_merger_transactions (
          id, user_id, deal_codename, acquirer_name, target_name,
          enterprise_value_usd, cash_consideration_usd, stock_consideration_usd,
          announced_date, targeted_closing_date, reverse_termination_fee_pct,
          reverse_termination_fee_usd, deal_structure_type, overall_transaction_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          txId, userId, input.dealCodename, input.acquirerName, input.targetName,
          input.enterpriseValueUsd, input.cashConsiderationUsd, input.stockConsiderationUsd,
          input.announcedDate, input.targetedClosingDate, rtfPct, rtfUsd,
          input.dealStructureType, 'pre_filing_analysis'
        ]
      );

      const hsrThresholds = evaluateHsrStatutoryThresholds(input.enterpriseValueUsd, 800000000, 250000000);
      await client.query(
        `INSERT INTO hsr_statutory_assessments (
          id, user_id, transaction_id, size_of_transaction_test_passed,
          transaction_value_usd, size_of_transaction_threshold_usd,
          size_of_person_test_passed, larger_person_net_sales_usd, smaller_person_net_sales_usd,
          size_of_person_lower_threshold_usd, size_of_person_upper_threshold_usd,
          unconditional_filing_threshold_usd, is_hsr_filing_required, statutory_filing_fee_usd,
          initial_waiting_period_days, earliest_waiting_period_expiry,
          item_4c_documents_cataloged, item_4d_documents_cataloged, filing_prepared_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          randomUUID(), userId, txId, hsrThresholds.sizeOfTransactionTestPassed,
          input.enterpriseValueUsd, 119500000,
          hsrThresholds.sizeOfPersonTestPassed, 800000000, 250000000,
          23900000, 239000000,
          478000000, hsrThresholds.isHsrFilingRequired, hsrThresholds.statutoryFilingFeeUsd,
          30, null, 0, 0, null
        ]
      );

      const initialHash = computeRatificationHash({
        transactionId: txId,
        regulatoryClearanceRiskScore: 25.0,
        leadCounselSigner: '',
        generalCounselSigner: '',
        chiefExecutiveOfficerSigner: ''
      });

      await client.query(
        `INSERT INTO antitrust_tripartite_ratifications (
          id, user_id, transaction_id, filing_strategy_title,
          regulatory_clearance_risk_score, lead_counsel_signed, general_counsel_signed,
          chief_executive_officer_signed, is_fully_ratified, cryptographic_integrity_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          randomUUID(), userId, txId,
          `${input.dealCodename} Regulatory Clearance Defense Strategy`,
          25.0, false, false, false, false, initialHash
        ]
      );

      await client.query(
        `INSERT INTO clean_team_firewall_protocols (
          id, user_id, transaction_id, protocol_title, clean_data_room_vendor,
          established_date, firewall_status, cleared_counsel_count,
          cleared_consultants_count, covered_commercially_sensitive_categories,
          gun_jumping_audit_frequency, last_compliance_audit_date, any_reported_breaches
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          randomUUID(), userId, txId,
          `${input.dealCodename} Clean Team Firewall Protocol`,
          'Intralinks Secure Enterprise VDR',
          input.announcedDate, 'active', 12, 6,
          JSON.stringify(['Customer-specific pricing and discount schedules', 'Confidential engineering blueprints']),
          'bi_weekly', input.announcedDate, false
        ]
      );

      await client.query(
        `INSERT INTO antitrust_audit_event_logs (
          id, user_id, transaction_id, event_category, actor_name, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(), userId, txId, 'corporate_transaction',
          'Chief Legal Officer',
          `Transaction Created: ${input.dealCodename}`,
          `Acquisition of ${input.targetName} by ${input.acquirerName} for $${(input.enterpriseValueUsd / 1e9).toFixed(2)}B EV entered into Antitrust Nexus.`,
          'info'
        ]
      );

      await client.query('COMMIT');
      const row = res.rows[0];
      return {
        id: row.id,
        dealCodename: row.deal_codename,
        acquirerName: row.acquirer_name,
        targetName: row.target_name,
        enterpriseValueUsd: Number(row.enterprise_value_usd),
        cashConsiderationUsd: Number(row.cash_consideration_usd),
        stockConsiderationUsd: Number(row.stock_consideration_usd),
        announcedDate: new Date(row.announced_date).toISOString().slice(0, 10),
        targetedClosingDate: new Date(row.targeted_closing_date).toISOString().slice(0, 10),
        reverseTerminationFeePct: Number(row.reverse_termination_fee_pct),
        reverseTerminationFeeUsd: Number(row.reverse_termination_fee_usd),
        dealStructureType: row.deal_structure_type,
        overallTransactionStatus: row.overall_transaction_status,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async defineMarket(userId: string, input: DefineMarketInput): Promise<AntitrustRelevantMarket> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const shares = input.participantShares.map(p => p.marketSharePct);
      const preHhi = calculateHhiConcentration(shares).hhi;

      const acquirer = input.participantShares.find(p => p.isAcquirer) ?? input.participantShares[0];
      const target = input.participantShares.find(p => p.isTarget) ?? input.participantShares[1];
      const deltaInfo = calculateDeltaHhi(acquirer ? acquirer.marketSharePct : 0, target ? target.marketSharePct : 0);
      const postHhi = preHhi + deltaInfo.deltaHhi;

      const presumption = evaluateHhiPresumption(postHhi, deltaInfo.deltaHhi, deltaInfo.postMergerSharePct);
      const marketId = randomUUID();

      const res = await client.query(
        `INSERT INTO antitrust_relevant_markets (
          id, user_id, transaction_id, market_name, product_market_definition,
          geographic_market_scope, total_market_size_usd, ssnip_test_critical_loss_pct,
          hypothetical_monopolist_test_passed, pre_merger_hhi, post_merger_hhi,
          delta_hhi, concentration_tier, presumption_rebuttable_unlawful
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          marketId, userId, input.transactionId, input.marketName,
          input.productMarketDefinition, input.geographicMarketScope,
          input.totalMarketSizeUsd, input.ssnipTestCriticalLossPct ?? 8.5,
          input.hypotheticalMonopolistTestPassed !== false,
          preHhi, postHhi, deltaInfo.deltaHhi,
          presumption.concentrationTier, presumption.presumptionRebuttableUnlawful
        ]
      );

      for (const p of input.participantShares) {
        const postShare = (p.isAcquirer || p.isTarget) ? deltaInfo.postMergerSharePct : p.marketSharePct;
        await client.query(
          `INSERT INTO market_participant_shares (
            id, user_id, relevant_market_id, participant_name, is_merging_party,
            is_acquirer, is_target, annual_revenue_usd, market_share_pct, post_merger_share_pct
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            randomUUID(), userId, marketId, p.participantName,
            p.isMergingParty, p.isAcquirer, p.isTarget,
            p.annualRevenueUsd, p.marketSharePct, postShare
          ]
        );
      }

      await client.query(
        `INSERT INTO antitrust_audit_event_logs (
          id, user_id, transaction_id, event_category, actor_name, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(), userId, input.transactionId, 'market_definition',
          'Industrial Economist',
          `Relevant Market Delineated: ${input.marketName}`,
          `SSNIP analysis concluded. Post-HHI: ${postHhi} (Δ ${deltaInfo.deltaHhi}). Rebuttable presumption: ${presumption.presumptionRebuttableUnlawful}.`,
          presumption.presumptionRebuttableUnlawful ? 'critical' : 'info'
        ]
      );

      await client.query('COMMIT');
      const row = res.rows[0];
      return {
        id: row.id,
        transactionId: row.transaction_id,
        marketName: row.market_name,
        productMarketDefinition: row.product_market_definition,
        geographicMarketScope: row.geographic_market_scope,
        totalMarketSizeUsd: Number(row.total_market_size_usd),
        ssnipTestCriticalLossPct: Number(row.ssnip_test_critical_loss_pct),
        hypotheticalMonopolistTestPassed: row.hypothetical_monopolist_test_passed,
        preMergerHhi: Number(row.pre_merger_hhi),
        postMergerHhi: Number(row.post_merger_hhi),
        deltaHhi: Number(row.delta_hhi),
        concentrationTier: row.concentration_tier,
        presumptionRebuttableUnlawful: row.presumption_rebuttable_unlawful,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async proposeDivestiturePackage(userId: string, input: ProposeDivestiturePackageInput): Promise<RemedyDivestiturePackage> {
    await this.ensureSchema();

    const buyerViability = input.upfrontBuyerViabilityScore ?? 85.0;
    const standaloneViability = input.standaloneViabilityScore ?? 80.0;
    const cleanCompliance = input.cleanTeamComplianceScore ?? 90.0;
    const behavioral = input.behavioralCommitmentsScore ?? 75.0;

    const rdiResult = calculateRemedyDefensibilityIndex({
      overlapMitigatedPct: input.assetOverlapMitigatedPct,
      upfrontBuyerViabilityScore: buyerViability,
      standaloneViabilityScore: standaloneViability,
      cleanTeamComplianceScore: cleanCompliance,
      behavioralCommitmentsScore: behavioral
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const pkgId = randomUUID();
      const res = await client.query(
        `INSERT INTO remedy_divestiture_packages (
          id, user_id, transaction_id, package_name, remedy_type, carveout_business_unit,
          carveout_revenue_usd, carveout_ebitda_usd, upfront_buyer_name,
          upfront_buyer_viability_score, asset_overlap_mitigated_pct,
          standalone_viability_score, clean_team_compliance_score, behavioral_commitments_score,
          remedy_defensibility_index, agency_acceptance_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`,
        [
          pkgId, userId, input.transactionId, input.packageName, input.remedyType,
          input.carveoutBusinessUnit, input.carveoutRevenueUsd, input.carveoutEbitdaUsd,
          input.upfrontBuyerName ?? null, buyerViability, input.assetOverlapMitigatedPct,
          standaloneViability, cleanCompliance, behavioral,
          rdiResult.rdi, 'proposed'
        ]
      );

      await client.query(
        `INSERT INTO antitrust_audit_event_logs (
          id, user_id, transaction_id, event_category, actor_name, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(), userId, input.transactionId, 'remedy_proposal',
          'Lead Divestiture Counsel',
          `Remedy Package Proposed: ${input.packageName}`,
          `Type: ${input.remedyType}. Overlap mitigated: ${input.assetOverlapMitigatedPct}%. RDI: ${rdiResult.rdi} (Defensible: ${rdiResult.isRemedyDefensible}). Buyer: ${input.upfrontBuyerName || 'Unassigned'}.`,
          rdiResult.isRemedyDefensible ? 'info' : 'warning'
        ]
      );

      await client.query('COMMIT');
      const row = res.rows[0];
      return {
        id: row.id,
        transactionId: row.transaction_id,
        packageName: row.package_name,
        remedyType: row.remedy_type,
        carveoutBusinessUnit: row.carveout_business_unit,
        carveoutRevenueUsd: Number(row.carveout_revenue_usd),
        carveoutEbitdaUsd: Number(row.carveout_ebitda_usd),
        upfrontBuyerName: row.upfront_buyer_name,
        upfrontBuyerViabilityScore: Number(row.upfront_buyer_viability_score),
        assetOverlapMitigatedPct: Number(row.asset_overlap_mitigated_pct),
        standaloneViabilityScore: Number(row.standalone_viability_score),
        cleanTeamComplianceScore: Number(row.clean_team_compliance_score),
        behavioralCommitmentsScore: Number(row.behavioral_commitments_score),
        remedyDefensibilityIndex: Number(row.remedy_defensibility_index),
        agencyAcceptanceStatus: row.agency_acceptance_status,
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submitTripartiteSignoff(userId: string, input: SubmitAntitrustSignoffInput): Promise<AntitrustTripartiteRatification> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const existingRes = await client.query(
        'SELECT * FROM antitrust_tripartite_ratifications WHERE user_id = $1 AND transaction_id = $2 FOR UPDATE',
        [userId, input.transactionId]
      );

      if (existingRes.rows.length === 0) {
        throw new Error(`Tripartite ratification record not found for transaction ${input.transactionId}`);
      }

      const existing = existingRes.rows[0];
      const now = new Date().toISOString();

      let leadSigned = existing.lead_counsel_signed;
      let leadSigner = existing.lead_counsel_signer;
      let leadDate = existing.lead_counsel_date;
      let leadStatement = existing.lead_counsel_statement;

      let gcSigned = existing.general_counsel_signed;
      let gcSigner = existing.general_counsel_signer;
      let gcDate = existing.general_counsel_date;
      let gcStatement = existing.general_counsel_statement;

      let ceoSigned = existing.chief_executive_officer_signed;
      let ceoSigner = existing.chief_executive_officer_signer;
      let ceoDate = existing.chief_executive_officer_date;
      let ceoStatement = existing.chief_executive_officer_statement;

      if (input.role === 'antitrust_lead_counsel') {
        leadSigned = true;
        leadSigner = input.signerName;
        leadDate = now;
        leadStatement = input.statementAcknowledged;
      } else if (input.role === 'chief_legal_officer') {
        gcSigned = true;
        gcSigner = input.signerName;
        gcDate = now;
        gcStatement = input.statementAcknowledged;
      } else if (input.role === 'chief_executive_officer') {
        ceoSigned = true;
        ceoSigner = input.signerName;
        ceoDate = now;
        ceoStatement = input.statementAcknowledged;
      }

      const isFullyRatified = Boolean(leadSigned && gcSigned && ceoSigned);

      const newHash = computeRatificationHash({
        transactionId: input.transactionId,
        regulatoryClearanceRiskScore: Number(existing.regulatory_clearance_risk_score),
        leadCounselSigner: leadSigner || '',
        generalCounselSigner: gcSigner || '',
        chiefExecutiveOfficerSigner: ceoSigner || ''
      });

      const updateRes = await client.query(
        `UPDATE antitrust_tripartite_ratifications SET
          lead_counsel_signed = $1, lead_counsel_signer = $2, lead_counsel_date = $3, lead_counsel_statement = $4,
          general_counsel_signed = $5, general_counsel_signer = $6, general_counsel_date = $7, general_counsel_statement = $8,
          chief_executive_officer_signed = $9, chief_executive_officer_signer = $10, chief_executive_officer_date = $11, chief_executive_officer_statement = $12,
          is_fully_ratified = $13, cryptographic_integrity_hash = $14, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $15 AND transaction_id = $16
        RETURNING *`,
        [
          leadSigned, leadSigner, leadDate, leadStatement,
          gcSigned, gcSigner, gcDate, gcStatement,
          ceoSigned, ceoSigner, ceoDate, ceoStatement,
          isFullyRatified, newHash,
          userId, input.transactionId
        ]
      );

      await client.query(
        `INSERT INTO antitrust_audit_event_logs (
          user_id, transaction_id, event_category, actor_name, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          input.transactionId,
          'tripartite_ratification',
          input.signerName,
          `Antitrust Ratification Sign-Off: ${input.role.replace(/_/g, ' ').toUpperCase()}`,
          `${input.signerName} recorded official sign-off on clearance defense strategy. Fully Ratified: ${isFullyRatified}. Hash: ${newHash}`,
          isFullyRatified ? 'critical' : 'info'
        ]
      );

      await client.query('COMMIT');
      const r = updateRes.rows[0];

      return {
        id: r.id,
        transactionId: r.transaction_id,
        filingStrategyTitle: r.filing_strategy_title,
        regulatoryClearanceRiskScore: Number(r.regulatory_clearance_risk_score),
        leadCounselSigned: r.lead_counsel_signed,
        leadCounselSigner: r.lead_counsel_signer,
        leadCounselDate: r.lead_counsel_date ? new Date(r.lead_counsel_date).toISOString() : null,
        leadCounselStatement: r.lead_counsel_statement,
        generalCounselSigned: r.general_counsel_signed,
        generalCounselSigner: r.general_counsel_signer,
        generalCounselDate: r.general_counsel_date ? new Date(r.general_counsel_date).toISOString() : null,
        generalCounselStatement: r.general_counsel_statement,
        chiefExecutiveOfficerSigned: r.chief_executive_officer_signed,
        chiefExecutiveOfficerSigner: r.chief_executive_officer_signer,
        chiefExecutiveOfficerDate: r.chief_executive_officer_date ? new Date(r.chief_executive_officer_date).toISOString() : null,
        chiefExecutiveOfficerStatement: r.chief_executive_officer_statement,
        isFullyRatified: r.is_fully_ratified,
        cryptographicIntegrityHash: r.cryptographic_integrity_hash,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString()
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
