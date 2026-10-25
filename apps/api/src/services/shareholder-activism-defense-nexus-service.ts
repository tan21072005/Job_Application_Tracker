import type { Pool } from 'pg';
import { randomUUID, createHash } from 'node:crypto';
import {
  type TargetCorporation,
  type ActivistCampaign,
  type WolfpackAccumulation,
  type StrategicVulnerabilityAudit,
  type BusinessSegmentSotp,
  type InstitutionalCohort,
  type ProxyAdvisorEvaluation,
  type ShareholderRightsPlan,
  type DirectorSlateNominee,
  type DefenseSettlementScenario,
  type UniversalProxyContest,
  type ActivismTripartiteSignoffRecord,
  type ActivismEventLog,
  type ShareholderActivismOverview,
  type CreateActivistCampaignInput,
  type RegisterWolfpackAccumulationInput,
  type DeployRightsPlanInput,
  type RecordNomineeComparisonInput,
  type SubmitActivismSignoffInput,
  type ActivismTripartiteSignoffRole,
  calculateWolfpackCoordinationIndex,
  calculateActivistVulnerabilityScore,
  calculatePoisonPillDilution,
  simulateUniversalProxyContest,
  calculateSettleVsFightValue
} from '@jobtrack/contract';

export class ShareholderActivismDefenseNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS activism_target_corporations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticker VARCHAR(12) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        market_cap_usd NUMERIC NOT NULL,
        shares_outstanding NUMERIC NOT NULL,
        enterprise_value_usd NUMERIC NOT NULL,
        state_of_incorporation VARCHAR(50) NOT NULL,
        is_delaware_corp BOOLEAN NOT NULL DEFAULT true,
        has_classified_board BOOLEAN NOT NULL DEFAULT false,
        has_poison_pill_in_place BOOLEAN NOT NULL DEFAULT false,
        insider_ownership_pct NUMERIC NOT NULL DEFAULT 4.5,
        float_percentage NUMERIC NOT NULL DEFAULT 95.5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activism_corp_user ON activism_target_corporations(user_id);

      CREATE TABLE IF NOT EXISTS activist_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corporation_id UUID NOT NULL,
        activist_fund_name VARCHAR(255) NOT NULL,
        lead_partner_name VARCHAR(255) NOT NULL,
        campaign_phase VARCHAR(50) NOT NULL,
        threat_tier VARCHAR(50) NOT NULL,
        primary_demand VARCHAR(50) NOT NULL,
        shares_held_count NUMERIC NOT NULL,
        percentage_ownership NUMERIC NOT NULL,
        synthetic_swap_percentage NUMERIC NOT NULL DEFAULT 0,
        effective_economic_exposure NUMERIC NOT NULL,
        schedule_13d_filing_date DATE NOT NULL,
        demand_summary TEXT NOT NULL,
        estimated_campaign_budget_usd NUMERIC NOT NULL DEFAULT 15000000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activist_campaigns_user ON activist_campaigns(user_id);

      CREATE TABLE IF NOT EXISTS activist_wolfpack_accumulations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL,
        fund_name VARCHAR(255) NOT NULL,
        ownership_percentage NUMERIC NOT NULL,
        derivative_exposure_percentage NUMERIC NOT NULL DEFAULT 0,
        accumulation_velocity_shares_per_day NUMERIC NOT NULL DEFAULT 0,
        coordination_correlation_score NUMERIC NOT NULL DEFAULT 50,
        schedule_13d_cross_date DATE NOT NULL,
        filing_deadline_date DATE NOT NULL,
        is_within_5day_statutory_window BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_wolfpack_user ON activist_wolfpack_accumulations(user_id);

      CREATE TABLE IF NOT EXISTS strategic_vulnerability_audits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corporation_id UUID NOT NULL,
        audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        tsr_underperformance_score NUMERIC NOT NULL,
        roic_wacc_deficit_score NUMERIC NOT NULL,
        sotp_conglomerate_discount_score NUMERIC NOT NULL,
        governance_vulnerability_score NUMERIC NOT NULL,
        capital_return_deficit_score NUMERIC NOT NULL,
        composite_vulnerability_score NUMERIC NOT NULL,
        vulnerability_risk_band VARCHAR(50) NOT NULL,
        key_vulnerabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_vuln_audits_user ON strategic_vulnerability_audits(user_id);

      CREATE TABLE IF NOT EXISTS business_segment_sotp_valuations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corporation_id UUID NOT NULL,
        segment_name VARCHAR(255) NOT NULL,
        revenue_usd NUMERIC NOT NULL,
        ebitda_usd NUMERIC NOT NULL,
        peer_multiple NUMERIC NOT NULL,
        implied_segment_value_usd NUMERIC NOT NULL,
        activist_target_value_usd NUMERIC NOT NULL,
        value_unlocking_potential_usd NUMERIC NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sotp_user ON business_segment_sotp_valuations(user_id);

      CREATE TABLE IF NOT EXISTS institutional_shareholder_cohorts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        institution_name VARCHAR(255) NOT NULL,
        cohort_category VARCHAR(50) NOT NULL,
        shares_held NUMERIC NOT NULL,
        voting_power_percentage NUMERIC NOT NULL,
        historical_management_support_rate NUMERIC NOT NULL,
        historical_dissident_support_rate NUMERIC NOT NULL,
        iss_alignment_probability NUMERIC NOT NULL,
        glass_lewis_alignment_probability NUMERIC NOT NULL,
        engagement_status VARCHAR(50) NOT NULL DEFAULT 'undecided',
        last_engagement_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_institutions_user ON institutional_shareholder_cohorts(user_id);

      CREATE TABLE IF NOT EXISTS proxy_advisor_policy_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        advisor_name VARCHAR(50) NOT NULL,
        policy_standard VARCHAR(255) NOT NULL,
        contested_election_recommendation VARCHAR(50) NOT NULL,
        say_on_pay_recommendation VARCHAR(50) NOT NULL,
        governance_quality_score NUMERIC NOT NULL,
        flags_list JSONB NOT NULL DEFAULT '[]'::jsonb,
        rationales_summary TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_proxy_advisors_user ON proxy_advisor_policy_evaluations(user_id);

      CREATE TABLE IF NOT EXISTS shareholder_rights_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corporation_id UUID NOT NULL,
        plan_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'shelf_ready',
        flip_in_threshold_percentage NUMERIC NOT NULL DEFAULT 15.0,
        exercise_price_usd NUMERIC NOT NULL DEFAULT 120.0,
        rights_per_share NUMERIC NOT NULL DEFAULT 1.0,
        discount_percentage NUMERIC NOT NULL DEFAULT 50.0,
        expiration_date DATE NOT NULL,
        redemption_price_per_right_usd NUMERIC NOT NULL DEFAULT 0.001,
        judicial_scrutiny_standard VARCHAR(100) NOT NULL DEFAULT 'Unocal_two_prong_proportionality',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_rights_plans_user ON shareholder_rights_plans(user_id);

      CREATE TABLE IF NOT EXISTS director_slate_nominees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seat_number INT NOT NULL,
        incumbent_name VARCHAR(255) NOT NULL,
        incumbent_years_served INT NOT NULL,
        incumbent_committee_roles VARCHAR(255) NOT NULL,
        incumbent_skills TEXT NOT NULL,
        dissident_name VARCHAR(255) NOT NULL,
        dissident_affiliation VARCHAR(255) NOT NULL,
        dissident_expertise TEXT NOT NULL,
        proxy_advisor_recommended_slate VARCHAR(50) NOT NULL DEFAULT 'split',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_director_nominees_user ON director_slate_nominees(user_id);

      CREATE TABLE IF NOT EXISTS defense_settlement_scenarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL,
        scenario_title VARCHAR(255) NOT NULL,
        proposed_board_seats INT NOT NULL,
        standstill_duration_months INT NOT NULL,
        expense_reimbursement_usd NUMERIC NOT NULL DEFAULT 0,
        projected_stock_impact_pct NUMERIC NOT NULL,
        settle_net_enterprise_value_usd NUMERIC NOT NULL,
        fight_net_enterprise_value_usd NUMERIC NOT NULL,
        recommendation_verdict VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_defense_settlements_user ON defense_settlement_scenarios(user_id);

      CREATE TABLE IF NOT EXISTS universal_proxy_contests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL,
        annual_meeting_date DATE NOT NULL,
        record_date DATE NOT NULL,
        universal_proxy_certified BOOLEAN NOT NULL DEFAULT true,
        management_votes_projected NUMERIC NOT NULL,
        dissident_votes_projected NUMERIC NOT NULL,
        undecided_votes_projected NUMERIC NOT NULL,
        management_win_probability NUMERIC NOT NULL,
        dissident_win_probability NUMERIC NOT NULL,
        projected_dissident_seats_won INT NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_proxy_contests_user ON universal_proxy_contests(user_id);

      CREATE TABLE IF NOT EXISTS defense_tripartite_signoffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL,
        defense_plan_title VARCHAR(255) NOT NULL,
        lead_director_signed BOOLEAN NOT NULL DEFAULT false,
        lead_director_signer VARCHAR(255),
        lead_director_date TIMESTAMPTZ,
        lead_director_statement TEXT,
        governance_chair_signed BOOLEAN NOT NULL DEFAULT false,
        governance_chair_signer VARCHAR(255),
        governance_chair_date TIMESTAMPTZ,
        governance_chair_statement TEXT,
        board_chair_ceo_signed BOOLEAN NOT NULL DEFAULT false,
        board_chair_ceo_signer VARCHAR(255),
        board_chair_ceo_date TIMESTAMPTZ,
        board_chair_ceo_statement TEXT,
        is_fully_ratified BOOLEAN NOT NULL DEFAULT false,
        cryptographic_integrity_hash VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_defense_signoffs_user ON defense_tripartite_signoffs(user_id);

      CREATE TABLE IF NOT EXISTS activism_event_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL,
        event_timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        event_category VARCHAR(50) NOT NULL,
        headline VARCHAR(255) NOT NULL,
        details TEXT NOT NULL,
        severity VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_activism_logs_user ON activism_event_logs(user_id);
    `);

    this.schemaInitialized = true;
  }

  async getOverview(userId: string): Promise<ShareholderActivismOverview> {
    await this.ensureSchema();
    await this.seedDefaultDataIfEmpty(userId);

    const corpRes = await this.pool.query(
      `SELECT * FROM activism_target_corporations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const corpRow = corpRes.rows[0];

    const targetCorporation: TargetCorporation = {
      id: corpRow.id,
      ticker: corpRow.ticker,
      companyName: corpRow.company_name,
      marketCapUsd: Number(corpRow.market_cap_usd),
      sharesOutstanding: Number(corpRow.shares_outstanding),
      enterpriseValueUsd: Number(corpRow.enterprise_value_usd),
      stateOfIncorporation: corpRow.state_of_incorporation,
      isDelawareCorp: corpRow.is_delaware_corp,
      hasClassifiedBoard: corpRow.has_classified_board,
      hasPoisonPillInPlace: corpRow.has_poison_pill_in_place,
      insiderOwnershipPct: Number(corpRow.insider_ownership_pct),
      floatPercentage: Number(corpRow.float_percentage)
    };

    const campRes = await this.pool.query(
      `SELECT * FROM activist_campaigns WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    const campRow = campRes.rows[0];

    const primaryCampaign: ActivistCampaign = {
      id: campRow.id,
      corporationId: campRow.corporation_id,
      activistFundName: campRow.activist_fund_name,
      leadPartnerName: campRow.lead_partner_name,
      campaignPhase: campRow.campaign_phase,
      threatTier: campRow.threat_tier,
      primaryDemand: campRow.primary_demand,
      sharesHeldCount: Number(campRow.shares_held_count),
      percentageOwnership: Number(campRow.percentage_ownership),
      syntheticSwapPercentage: Number(campRow.synthetic_swap_percentage),
      effectiveEconomicExposure: Number(campRow.effective_economic_exposure),
      schedule13dFilingDate: new Date(campRow.schedule_13d_filing_date).toISOString().split('T')[0],
      demandSummary: campRow.demand_summary,
      estimatedCampaignBudgetUsd: Number(campRow.estimated_campaign_budget_usd),
      createdAt: new Date(campRow.created_at).toISOString(),
      updatedAt: new Date(campRow.updated_at).toISOString()
    };

    const wolfRes = await this.pool.query(
      `SELECT * FROM activist_wolfpack_accumulations WHERE user_id = $1 AND campaign_id = $2 ORDER BY ownership_percentage DESC`,
      [userId, primaryCampaign.id]
    );
    const wolfpackAccumulations: WolfpackAccumulation[] = wolfRes.rows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      fundName: r.fund_name,
      ownershipPercentage: Number(r.ownership_percentage),
      derivativeExposurePercentage: Number(r.derivative_exposure_percentage),
      accumulationVelocitySharesPerDay: Number(r.accumulation_velocity_shares_per_day),
      coordinationCorrelationScore: Number(r.coordination_correlation_score),
      schedule13dCrossDate: new Date(r.schedule_13d_cross_date).toISOString().split('T')[0],
      filingDeadlineDate: new Date(r.filing_deadline_date).toISOString().split('T')[0],
      isWithin5DayStatutoryWindow: r.is_within_5day_statutory_window
    }));

    const wolfpackCoordinationIndex = calculateWolfpackCoordinationIndex(wolfpackAccumulations, 30);

    const vulnRes = await this.pool.query(
      `SELECT * FROM strategic_vulnerability_audits WHERE user_id = $1 AND corporation_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, targetCorporation.id]
    );
    const vulnRow = vulnRes.rows[0];
    const vulnerabilityAudit: StrategicVulnerabilityAudit = {
      id: vulnRow.id,
      corporationId: vulnRow.corporation_id,
      auditDate: new Date(vulnRow.audit_date).toISOString().split('T')[0],
      tsrUnderperformanceScore: Number(vulnRow.tsr_underperformance_score),
      roicWaccDeficitScore: Number(vulnRow.roic_wacc_deficit_score),
      sotpConglomerateDiscountScore: Number(vulnRow.sotp_conglomerate_discount_score),
      governanceVulnerabilityScore: Number(vulnRow.governance_vulnerability_score),
      capitalReturnDeficitScore: Number(vulnRow.capital_return_deficit_score),
      compositeVulnerabilityScore: Number(vulnRow.composite_vulnerability_score),
      vulnerabilityRiskBand: vulnRow.vulnerability_risk_band,
      keyVulnerabilities: Array.isArray(vulnRow.key_vulnerabilities) ? vulnRow.key_vulnerabilities : []
    };

    const sotpRes = await this.pool.query(
      `SELECT * FROM business_segment_sotp_valuations WHERE user_id = $1 AND corporation_id = $2 ORDER BY implied_segment_value_usd DESC`,
      [userId, targetCorporation.id]
    );
    const sotpSegments: BusinessSegmentSotp[] = sotpRes.rows.map(r => ({
      id: r.id,
      corporationId: r.corporation_id,
      segmentName: r.segment_name,
      revenueUsd: Number(r.revenue_usd),
      ebitdaUsd: Number(r.ebitda_usd),
      peerMultiple: Number(r.peer_multiple),
      impliedSegmentValueUsd: Number(r.implied_segment_value_usd),
      activistTargetValueUsd: Number(r.activist_target_value_usd),
      valueUnlockingPotentialUsd: Number(r.value_unlocking_potential_usd)
    }));

    const instRes = await this.pool.query(
      `SELECT * FROM institutional_shareholder_cohorts WHERE user_id = $1 ORDER BY voting_power_percentage DESC`,
      [userId]
    );
    const institutionalCohorts: InstitutionalCohort[] = instRes.rows.map(r => ({
      id: r.id,
      institutionName: r.institution_name,
      cohortCategory: r.cohort_category,
      sharesHeld: Number(r.shares_held),
      votingPowerPercentage: Number(r.voting_power_percentage),
      historicalManagementSupportRate: Number(r.historical_management_support_rate),
      historicalDissidentSupportRate: Number(r.historical_dissident_support_rate),
      issAlignmentProbability: Number(r.iss_alignment_probability),
      glassLewisAlignmentProbability: Number(r.glass_lewis_alignment_probability),
      engagementStatus: r.engagement_status,
      lastEngagementDate: new Date(r.last_engagement_date).toISOString().split('T')[0]
    }));

    const proxyRes = await this.pool.query(
      `SELECT * FROM proxy_advisor_policy_evaluations WHERE user_id = $1 ORDER BY advisor_name ASC`,
      [userId]
    );
    const proxyAdvisorEvaluations: ProxyAdvisorEvaluation[] = proxyRes.rows.map(r => ({
      id: r.id,
      advisorName: r.advisor_name,
      policyStandard: r.policy_standard,
      contestedElectionRecommendation: r.contested_election_recommendation,
      sayOnPayRecommendation: r.say_on_pay_recommendation,
      governanceQualityScore: Number(r.governance_quality_score),
      flagsList: Array.isArray(r.flags_list) ? r.flags_list : [],
      rationalesSummary: r.rationales_summary
    }));

    const pillRes = await this.pool.query(
      `SELECT * FROM shareholder_rights_plans WHERE user_id = $1 AND corporation_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, targetCorporation.id]
    );
    const pillRow = pillRes.rows[0];
    const rightsPlan: ShareholderRightsPlan = {
      id: pillRow.id,
      corporationId: pillRow.corporation_id,
      planName: pillRow.plan_name,
      status: pillRow.status,
      flipInThresholdPercentage: Number(pillRow.flip_in_threshold_percentage),
      exercisePriceUsd: Number(pillRow.exercise_price_usd),
      rightsPerShare: Number(pillRow.rights_per_share),
      discountPercentage: Number(pillRow.discount_percentage),
      expirationDate: new Date(pillRow.expiration_date).toISOString().split('T')[0],
      redemptionPricePerRightUsd: Number(pillRow.redemption_price_per_right_usd),
      judicialScrutinyStandard: pillRow.judicial_scrutiny_standard
    };

    const nomRes = await this.pool.query(
      `SELECT * FROM director_slate_nominees WHERE user_id = $1 ORDER BY seat_number ASC`,
      [userId]
    );
    const directorNominees: DirectorSlateNominee[] = nomRes.rows.map(r => ({
      id: r.id,
      seatNumber: r.seat_number,
      incumbentName: r.incumbent_name,
      incumbentYearsServed: r.incumbent_years_served,
      incumbentCommitteeRoles: r.incumbent_committee_roles,
      incumbentSkills: r.incumbent_skills,
      dissidentName: r.dissident_name,
      dissidentAffiliation: r.dissident_affiliation,
      dissidentExpertise: r.dissident_expertise,
      proxyAdvisorRecommendedSlate: r.proxy_advisor_recommended_slate
    }));

    const settRes = await this.pool.query(
      `SELECT * FROM defense_settlement_scenarios WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at ASC`,
      [userId, primaryCampaign.id]
    );
    const settlementScenarios: DefenseSettlementScenario[] = settRes.rows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      scenarioTitle: r.scenario_title,
      proposedBoardSeats: r.proposed_board_seats,
      standstillDurationMonths: r.standstill_duration_months,
      expenseReimbursementUsd: Number(r.expense_reimbursement_usd),
      projectedStockImpactPct: Number(r.projected_stock_impact_pct),
      settleNetEnterpriseValueUsd: Number(r.settle_net_enterprise_value_usd),
      fightNetEnterpriseValueUsd: Number(r.fight_net_enterprise_value_usd),
      recommendationVerdict: r.recommendation_verdict
    }));

    const contestRes = await this.pool.query(
      `SELECT * FROM universal_proxy_contests WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, primaryCampaign.id]
    );
    const contestRow = contestRes.rows[0];
    const proxyContest: UniversalProxyContest = {
      id: contestRow.id,
      campaignId: contestRow.campaign_id,
      annualMeetingDate: new Date(contestRow.annual_meeting_date).toISOString().split('T')[0],
      recordDate: new Date(contestRow.record_date).toISOString().split('T')[0],
      universalProxyCertified: contestRow.universal_proxy_certified,
      managementVotesProjected: Number(contestRow.management_votes_projected),
      dissidentVotesProjected: Number(contestRow.dissident_votes_projected),
      undecidedVotesProjected: Number(contestRow.undecided_votes_projected),
      managementWinProbability: Number(contestRow.management_win_probability),
      dissidentWinProbability: Number(contestRow.dissident_win_probability),
      projectedDissidentSeatsWon: contestRow.projected_dissident_seats_won
    };

    const signoffRes = await this.pool.query(
      `SELECT * FROM defense_tripartite_signoffs WHERE user_id = $1 AND campaign_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [userId, primaryCampaign.id]
    );
    const signRow = signoffRes.rows[0];
    const tripartiteSignoff: ActivismTripartiteSignoffRecord = {
      id: signRow.id,
      campaignId: signRow.campaign_id,
      defensePlanTitle: signRow.defense_plan_title,
      leadDirectorSignoff: {
        isSigned: signRow.lead_director_signed,
        signoffSignerName: signRow.lead_director_signer,
        signoffTimestamp: signRow.lead_director_date ? new Date(signRow.lead_director_date).toISOString() : undefined,
        statementAcknowledged: signRow.lead_director_statement
      },
      governanceChairSignoff: {
        isSigned: signRow.governance_chair_signed,
        signoffSignerName: signRow.governance_chair_signer,
        signoffTimestamp: signRow.governance_chair_date ? new Date(signRow.governance_chair_date).toISOString() : undefined,
        statementAcknowledged: signRow.governance_chair_statement
      },
      boardChairCeoSignoff: {
        isSigned: signRow.board_chair_ceo_signed,
        signoffSignerName: signRow.board_chair_ceo_signer,
        signoffTimestamp: signRow.board_chair_ceo_date ? new Date(signRow.board_chair_ceo_date).toISOString() : undefined,
        statementAcknowledged: signRow.board_chair_ceo_statement
      },
      isFullyRatified: signRow.is_fully_ratified,
      cryptographicIntegrityHash: signRow.cryptographic_integrity_hash
    };

    const logsRes = await this.pool.query(
      `SELECT * FROM activism_event_logs WHERE user_id = $1 AND campaign_id = $2 ORDER BY event_timestamp DESC LIMIT 20`,
      [userId, primaryCampaign.id]
    );
    const eventLogs: ActivismEventLog[] = logsRes.rows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      eventTimestamp: new Date(r.event_timestamp).toISOString(),
      eventCategory: r.event_category,
      headline: r.headline,
      details: r.details,
      severity: r.severity
    }));

    return {
      targetCorporation,
      primaryCampaign,
      wolfpackAccumulations,
      wolfpackCoordinationIndex,
      vulnerabilityAudit,
      sotpSegments,
      institutionalCohorts,
      proxyAdvisorEvaluations,
      rightsPlan,
      directorNominees,
      settlementScenarios,
      proxyContest,
      tripartiteSignoff,
      eventLogs
    };
  }

  async createCampaign(userId: string, input: CreateActivistCampaignInput): Promise<ActivistCampaign> {
    await this.ensureSchema();
    const corpRes = await this.pool.query(
      `SELECT id FROM activism_target_corporations WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const corporationId = corpRes.rows[0]?.id || randomUUID();
    const effectiveExposure = input.percentageOwnership + (input.syntheticSwapPercentage || 0);

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const insertRes = await client.query(
        `INSERT INTO activist_campaigns (
          user_id, corporation_id, activist_fund_name, lead_partner_name,
          campaign_phase, threat_tier, primary_demand, shares_held_count,
          percentage_ownership, synthetic_swap_percentage, effective_economic_exposure,
          schedule_13d_filing_date, demand_summary, estimated_campaign_budget_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          userId,
          corporationId,
          input.activistFundName,
          input.leadPartnerName,
          input.campaignPhase,
          input.threatTier,
          input.primaryDemand,
          input.sharesHeldCount,
          input.percentageOwnership,
          input.syntheticSwapPercentage || 0,
          effectiveExposure,
          input.schedule13dFilingDate,
          input.demandSummary,
          input.estimatedCampaignBudgetUsd || 15000000
        ]
      );
      const row = insertRes.rows[0];

      await client.query(
        `INSERT INTO activism_event_logs (
          user_id, campaign_id, event_category, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          row.id,
          'filing',
          `New Activist Campaign Declared: ${input.activistFundName}`,
          `Lead partner ${input.leadPartnerName} initiated ${input.campaignPhase} targeting ${input.primaryDemand}.`,
          'high'
        ]
      );

      await client.query('COMMIT');
      return {
        id: row.id,
        corporationId: row.corporation_id,
        activistFundName: row.activist_fund_name,
        leadPartnerName: row.lead_partner_name,
        campaignPhase: row.campaign_phase,
        threatTier: row.threat_tier,
        primaryDemand: row.primary_demand,
        sharesHeldCount: Number(row.shares_held_count),
        percentageOwnership: Number(row.percentage_ownership),
        syntheticSwapPercentage: Number(row.synthetic_swap_percentage),
        effectiveEconomicExposure: Number(row.effective_economic_exposure),
        schedule13dFilingDate: new Date(row.schedule_13d_filing_date).toISOString().split('T')[0],
        demandSummary: row.demand_summary,
        estimatedCampaignBudgetUsd: Number(row.estimated_campaign_budget_usd),
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

  async registerWolfpackAccumulation(userId: string, input: RegisterWolfpackAccumulationInput): Promise<WolfpackAccumulation> {
    await this.ensureSchema();
    const crossDate = new Date(input.schedule13dCrossDate);
    const deadlineDate = new Date(crossDate.getTime() + 5 * 24 * 60 * 60 * 1000);

    const res = await this.pool.query(
      `INSERT INTO activist_wolfpack_accumulations (
        user_id, campaign_id, fund_name, ownership_percentage,
        derivative_exposure_percentage, accumulation_velocity_shares_per_day,
        coordination_correlation_score, schedule_13d_cross_date, filing_deadline_date,
        is_within_5day_statutory_window
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        input.campaignId,
        input.fundName,
        input.ownershipPercentage,
        input.derivativeExposurePercentage,
        input.accumulationVelocitySharesPerDay,
        input.coordinationCorrelationScore,
        input.schedule13dCrossDate,
        deadlineDate.toISOString().split('T')[0],
        true
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      campaignId: r.campaign_id,
      fundName: r.fund_name,
      ownershipPercentage: Number(r.ownership_percentage),
      derivativeExposurePercentage: Number(r.derivative_exposure_percentage),
      accumulationVelocitySharesPerDay: Number(r.accumulation_velocity_shares_per_day),
      coordinationCorrelationScore: Number(r.coordination_correlation_score),
      schedule13dCrossDate: new Date(r.schedule_13d_cross_date).toISOString().split('T')[0],
      filingDeadlineDate: new Date(r.filing_deadline_date).toISOString().split('T')[0],
      isWithin5DayStatutoryWindow: r.is_within_5day_statutory_window
    };
  }

  async deployRightsPlan(userId: string, input: DeployRightsPlanInput): Promise<ShareholderRightsPlan> {
    await this.ensureSchema();
    const corpRes = await this.pool.query(
      `SELECT id FROM activism_target_corporations WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const corporationId = corpRes.rows[0]?.id || randomUUID();

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO shareholder_rights_plans (
          user_id, corporation_id, plan_name, status,
          flip_in_threshold_percentage, exercise_price_usd,
          discount_percentage, expiration_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          userId,
          corporationId,
          input.planName,
          'active_in_place',
          input.flipInThresholdPercentage,
          input.exercisePriceUsd,
          input.discountPercentage,
          input.expirationDate
        ]
      );
      await client.query(
        `UPDATE activism_target_corporations SET has_poison_pill_in_place = true WHERE user_id = $1 AND id = $2`,
        [userId, corporationId]
      );
      await client.query('COMMIT');

      const r = res.rows[0];
      return {
        id: r.id,
        corporationId: r.corporation_id,
        planName: r.plan_name,
        status: r.status,
        flipInThresholdPercentage: Number(r.flip_in_threshold_percentage),
        exercisePriceUsd: Number(r.exercise_price_usd),
        rightsPerShare: Number(r.rights_per_share),
        discountPercentage: Number(r.discount_percentage),
        expirationDate: new Date(r.expiration_date).toISOString().split('T')[0],
        redemptionPricePerRightUsd: Number(r.redemption_price_per_right_usd),
        judicialScrutinyStandard: r.judicial_scrutiny_standard
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async recordNomineeComparison(userId: string, input: RecordNomineeComparisonInput): Promise<DirectorSlateNominee> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `INSERT INTO director_slate_nominees (
        user_id, seat_number, incumbent_name, incumbent_years_served,
        incumbent_committee_roles, incumbent_skills, dissident_name,
        dissident_affiliation, dissident_expertise, proxy_advisor_recommended_slate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        userId,
        input.seatNumber,
        input.incumbentName,
        input.incumbentYearsServed,
        input.incumbentCommitteeRoles,
        input.incumbentSkills,
        input.dissidentName,
        input.dissidentAffiliation,
        input.dissidentExpertise,
        input.proxyAdvisorRecommendedSlate
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      seatNumber: r.seat_number,
      incumbentName: r.incumbent_name,
      incumbentYearsServed: r.incumbent_years_served,
      incumbentCommitteeRoles: r.incumbent_committee_roles,
      incumbentSkills: r.incumbent_skills,
      dissidentName: r.dissident_name,
      dissidentAffiliation: r.dissident_affiliation,
      dissidentExpertise: r.dissident_expertise,
      proxyAdvisorRecommendedSlate: r.proxy_advisor_recommended_slate
    };
  }

  async submitTripartiteSignoff(userId: string, input: SubmitActivismSignoffInput): Promise<ActivismTripartiteSignoffRecord> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const fetchRes = await client.query(
        `SELECT * FROM defense_tripartite_signoffs WHERE user_id = $1 AND campaign_id = $2 FOR UPDATE`,
        [userId, input.campaignId]
      );
      if (fetchRes.rows.length === 0) {
        throw new Error('Tripartite defense signoff record not found for campaign');
      }
      const existing = fetchRes.rows[0];
      const now = new Date();

      let leadSigned = existing.lead_director_signed;
      let leadSigner = existing.lead_director_signer;
      let leadDate = existing.lead_director_date;
      let leadStatement = existing.lead_director_statement;

      let govSigned = existing.governance_chair_signed;
      let govSigner = existing.governance_chair_signer;
      let govDate = existing.governance_chair_date;
      let govStatement = existing.governance_chair_statement;

      let ceoSigned = existing.board_chair_ceo_signed;
      let ceoSigner = existing.board_chair_ceo_signer;
      let ceoDate = existing.board_chair_ceo_date;
      let ceoStatement = existing.board_chair_ceo_statement;

      if (input.role === 'lead_independent_director') {
        leadSigned = true;
        leadSigner = input.signerName;
        leadDate = now;
        leadStatement = input.statementAcknowledged;
      } else if (input.role === 'nominating_governance_chair') {
        govSigned = true;
        govSigner = input.signerName;
        govDate = now;
        govStatement = input.statementAcknowledged;
      } else if (input.role === 'board_chair_ceo') {
        ceoSigned = true;
        ceoSigner = input.signerName;
        ceoDate = now;
        ceoStatement = input.statementAcknowledged;
      }

      const isFullyRatified = Boolean(leadSigned && govSigned && ceoSigned);

      const hashPayload = `${input.campaignId}|${leadSigner || ''}|${govSigner || ''}|${ceoSigner || ''}|${isFullyRatified}`;
      const newHash = createHash('sha256').update(hashPayload).digest('hex');

      const updateRes = await client.query(
        `UPDATE defense_tripartite_signoffs SET
          lead_director_signed = $1, lead_director_signer = $2, lead_director_date = $3, lead_director_statement = $4,
          governance_chair_signed = $5, governance_chair_signer = $6, governance_chair_date = $7, governance_chair_statement = $8,
          board_chair_ceo_signed = $9, board_chair_ceo_signer = $10, board_chair_ceo_date = $11, board_chair_ceo_statement = $12,
          is_fully_ratified = $13, cryptographic_integrity_hash = $14, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $15 AND campaign_id = $16
        RETURNING *`,
        [
          leadSigned, leadSigner, leadDate, leadStatement,
          govSigned, govSigner, govDate, govStatement,
          ceoSigned, ceoSigner, ceoDate, ceoStatement,
          isFullyRatified, newHash,
          userId, input.campaignId
        ]
      );

      await client.query(
        `INSERT INTO activism_event_logs (
          user_id, campaign_id, event_category, headline, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          input.campaignId,
          'defense_action',
          `Board Defense Ratification: ${input.role.replace(/_/g, ' ').toUpperCase()}`,
          `${input.signerName} executed cryptographic authorization for corporate defense resolution. Fully Ratified: ${isFullyRatified}`,
          isFullyRatified ? 'critical' : 'high'
        ]
      );

      await client.query('COMMIT');
      const r = updateRes.rows[0];

      return {
        id: r.id,
        campaignId: r.campaign_id,
        defensePlanTitle: r.defense_plan_title,
        leadDirectorSignoff: {
          isSigned: r.lead_director_signed,
          signoffSignerName: r.lead_director_signer,
          signoffTimestamp: r.lead_director_date ? new Date(r.lead_director_date).toISOString() : undefined,
          statementAcknowledged: r.lead_director_statement
        },
        governanceChairSignoff: {
          isSigned: r.governance_chair_signed,
          signoffSignerName: r.governance_chair_signer,
          signoffTimestamp: r.governance_chair_date ? new Date(r.governance_chair_date).toISOString() : undefined,
          statementAcknowledged: r.governance_chair_statement
        },
        boardChairCeoSignoff: {
          isSigned: r.board_chair_ceo_signed,
          signoffSignerName: r.board_chair_ceo_signer,
          signoffTimestamp: r.board_chair_ceo_date ? new Date(r.board_chair_ceo_date).toISOString() : undefined,
          statementAcknowledged: r.board_chair_ceo_statement
        },
        isFullyRatified: r.is_fully_ratified,
        cryptographicIntegrityHash: r.cryptographic_integrity_hash
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async resetDemoData(userId: string): Promise<ShareholderActivismOverview> {
    await this.ensureSchema();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM activism_event_logs WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM defense_tripartite_signoffs WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM universal_proxy_contests WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM defense_settlement_scenarios WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM director_slate_nominees WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM shareholder_rights_plans WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM proxy_advisor_policy_evaluations WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM institutional_shareholder_cohorts WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM business_segment_sotp_valuations WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM strategic_vulnerability_audits WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM activist_wolfpack_accumulations WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM activist_campaigns WHERE user_id = $1`, [userId]);
      await client.query(`DELETE FROM activism_target_corporations WHERE user_id = $1`, [userId]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await this.seedDefaultDataIfEmpty(userId);
    return this.getOverview(userId);
  }

  private async seedDefaultDataIfEmpty(userId: string): Promise<void> {
    const existing = await this.pool.query(
      `SELECT id FROM activism_target_corporations WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length > 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const corpId = randomUUID();
      await client.query(
        `INSERT INTO activism_target_corporations (
          id, user_id, ticker, company_name, market_cap_usd, shares_outstanding,
          enterprise_value_usd, state_of_incorporation, is_delaware_corp,
          has_classified_board, has_poison_pill_in_place, insider_ownership_pct, float_percentage
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          corpId,
          userId,
          'TGT',
          'Titan Global Technologies Inc.',
          28500000000,
          100000000,
          32400000000,
          'Delaware',
          true,
          false,
          false,
          4.8,
          95.2
        ]
      );

      const campaignId = randomUUID();
      await client.query(
        `INSERT INTO activist_campaigns (
          id, user_id, corporation_id, activist_fund_name, lead_partner_name,
          campaign_phase, threat_tier, primary_demand, shares_held_count,
          percentage_ownership, synthetic_swap_percentage, effective_economic_exposure,
          schedule_13d_filing_date, demand_summary, estimated_campaign_budget_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          campaignId,
          userId,
          corpId,
          'Vanguard Alpha Capital Management',
          'Julian Sterling',
          'schedule_13d_disclosure',
          'tier_1_hostile_wolfpack',
          'board_representation_seats',
          7850000,
          7.85,
          2.15,
          10.00,
          '2026-10-15',
          'Activist demands 3 board seats, immediate spin-off of legacy Enterprise Hosting division, and $2.5B share buyback authorization.',
          18000000
        ]
      );

      await client.query(
        `INSERT INTO activist_wolfpack_accumulations (
          user_id, campaign_id, fund_name, ownership_percentage, derivative_exposure_percentage,
          accumulation_velocity_shares_per_day, coordination_correlation_score,
          schedule_13d_cross_date, filing_deadline_date, is_within_5day_statutory_window
        ) VALUES
          ($1, $2, 'Vanguard Alpha Master Fund LP', 4.85, 1.50, 75000, 92, '2026-10-12', '2026-10-17', true),
          ($1, $2, 'Apex Arbitrage Offshore Ltd', 3.00, 0.65, 42000, 84, '2026-10-14', '2026-10-19', true),
          ($1, $2, 'Cerberus Event-Driven Partners', 1.80, 0.00, 28000, 76, '2026-10-15', '2026-10-20', true)`,
        [userId, campaignId]
      );

      await client.query(
        `INSERT INTO strategic_vulnerability_audits (
          user_id, corporation_id, tsr_underperformance_score, roic_wacc_deficit_score,
          sotp_conglomerate_discount_score, governance_vulnerability_score,
          capital_return_deficit_score, composite_vulnerability_score,
          vulnerability_risk_band, key_vulnerabilities
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          corpId,
          72.5,
          68.0,
          81.0,
          55.0,
          62.0,
          69.45,
          'elevated_activist_target',
          JSON.stringify([
            '3-Year TSR trailing peer median by -34.2%',
            'ROIC (7.4%) currently lagging WACC (8.8%) generating negative EVA',
            'Estimated 28.5% conglomerate discount across SaaS and Hosting divisions',
            'De-staggered board allows full slate replacement in single proxy cycle',
            'Substantial uncommitted cash balance ($3.2B) without active buyback program'
          ])
        ]
      );

      await client.query(
        `INSERT INTO business_segment_sotp_valuations (
          user_id, corporation_id, segment_name, revenue_usd, ebitda_usd,
          peer_multiple, implied_segment_value_usd, activist_target_value_usd,
          value_unlocking_potential_usd
        ) VALUES
          ($1, $2, 'Titan Cloud SaaS Platform', 2400000000, 720000000, 18.5, 13320000000, 16000000000, 2680000000),
          ($1, $2, 'Enterprise Cybersecurity Suite', 1600000000, 480000000, 14.0, 6720000000, 8500000000, 1780000000),
          ($1, $2, 'Legacy Managed Infrastructure', 1800000000, 360000000, 6.5, 2340000000, 3200000000, 860000000),
          ($1, $2, 'AI Orchestration & Data Fabric', 850000000, 210000000, 22.0, 4620000000, 6500000000, 1880000000)`,
        [userId, corpId]
      );

      await client.query(
        `INSERT INTO institutional_shareholder_cohorts (
          user_id, institution_name, cohort_category, shares_held,
          voting_power_percentage, historical_management_support_rate,
          historical_dissident_support_rate, iss_alignment_probability,
          glass_lewis_alignment_probability, engagement_status, last_engagement_date
        ) VALUES
          ($1, 'BlackRock Institutional Trust', 'passive_index', 9200000, 9.2, 88.0, 12.0, 92.0, 85.0, 'supportive', '2026-10-18'),
          ($1, 'The Vanguard Group', 'passive_index', 8800000, 8.8, 91.0, 9.0, 95.0, 89.0, 'supportive', '2026-10-17'),
          ($1, 'State Street Global Advisors', 'passive_index', 5400000, 5.4, 85.0, 15.0, 89.0, 84.0, 'supportive', '2026-10-19'),
          ($1, 'Fidelity Management & Research', 'active_fundamental', 6100000, 6.1, 62.0, 38.0, 72.0, 68.0, 'undecided', '2026-10-20'),
          ($1, 'T. Rowe Price Associates', 'active_fundamental', 4500000, 4.5, 58.0, 42.0, 70.0, 74.0, 'undecided', '2026-10-21'),
          ($1, 'Wellington Management Company', 'active_fundamental', 3900000, 3.9, 54.0, 46.0, 65.0, 62.0, 'leaning_dissident', '2026-10-22'),
          ($1, 'Vanguard Alpha Activist Syndicate', 'activist_syndicate', 9650000, 9.65, 0.0, 100.0, 15.0, 12.0, 'hostile', '2026-10-15'),
          ($1, 'Board of Directors & Officers', 'insider_executive', 4800000, 4.8, 100.0, 0.0, 5.0, 5.0, 'supportive', '2026-10-22'),
          ($1, 'Broad Retail Investor Base', 'retail_public', 47650000, 47.65, 76.0, 24.0, 30.0, 25.0, 'undecided', '2026-10-22')`,
        [userId]
      );

      await client.query(
        `INSERT INTO proxy_advisor_policy_evaluations (
          user_id, advisor_name, policy_standard, contested_election_recommendation,
          say_on_pay_recommendation, governance_quality_score, flags_list, rationales_summary
        ) VALUES
          ($1, 'ISS', 'Benchmark US Policy Contested Elections', 'split_ticket_compromise', 'for', 4.2,
            '["TSR underperformance relative to GICS peers", "Compensation alignment acceptable", "Recommend 1 dissident seat (operational expertise)"]'::jsonb,
            'ISS acknowledges persistent multi-year operational margin lag in Legacy Infrastructure, supporting 1 of 3 dissident nominees to catalyze board accountability while retaining incumbent strategy continuity.'),
          ($1, 'Glass_Lewis', 'US Benchmark Policy Contested Solicitations', 'support_management_slate', 'for', 3.8,
            '["Active management refresh in progress", "Dissident demands risk destabilizing cloud migration", "Oppose activist break-up thesis"]'::jsonb,
            'Glass Lewis finds management turnaround plan credibly underway with cloud SaaS margin expansion and opposes forced divestitures under hostile timelines.')`,
        [userId]
      );

      await client.query(
        `INSERT INTO shareholder_rights_plans (
          user_id, corporation_id, plan_name, status,
          flip_in_threshold_percentage, exercise_price_usd,
          rights_per_share, discount_percentage, expiration_date,
          redemption_price_per_right_usd, judicial_scrutiny_standard
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          corpId,
          'Titan Global Technologies 2026 Shareholder Rights Plan',
          'shelf_ready',
          15.0,
          120.0,
          1.0,
          50.0,
          '2027-10-24',
          0.001,
          'Unocal_two_prong_proportionality'
        ]
      );

      await client.query(
        `INSERT INTO director_slate_nominees (
          user_id, seat_number, incumbent_name, incumbent_years_served,
          incumbent_committee_roles, incumbent_skills, dissident_name,
          dissident_affiliation, dissident_expertise, proxy_advisor_recommended_slate
        ) VALUES
          ($1, 1, 'Dr. Arthur Pendelton', 8, 'Audit Committee Chair', 'Former Fortune 50 CFO, Financial Expert, SEC Audit Authority',
            'Marcus Bennett', 'Vanguard Alpha Operating Partner', 'Activist Turnaround Specialist, Supply Chain Restructuring', 'split'),
          ($1, 2, 'Elena Rostova', 5, 'Compensation Committee Member', 'Enterprise SaaS Scaling, Product Strategy & AI Integration',
            'Claire Henderson', 'Former CEO of CloudScale', 'Cloud Infrastructure Cost Optimization, Spin-off Architect', 'incumbent'),
          ($1, 3, 'David Montgomery', 11, 'Nominating & Governance Chair', 'Corporate Governance, M&A Antitrust Legal Expert',
            'Victor Vance', 'Managing Director Apex Arbitrage', 'Hostile Capital Allocation, Leveraged Buyouts & Activism', 'incumbent')`,
        [userId]
      );

      await client.query(
        `INSERT INTO defense_settlement_scenarios (
          user_id, campaign_id, scenario_title, proposed_board_seats,
          standstill_duration_months, expense_reimbursement_usd,
          projected_stock_impact_pct, settle_net_enterprise_value_usd,
          fight_net_enterprise_value_usd, recommendation_verdict
        ) VALUES
          ($1, $2, 'Scenario A: Standstill Agreement with 1 Mutually Agreed Seat', 1, 18, 2500000, 3.8, 33631200000, 31920000000, 'execute_standstill_settlement'),
          ($1, $2, 'Scenario B: Full Proxy Contest Defense to Shareholder Vote', 0, 0, 0, -1.5, 31905000000, 31905000000, 'wage_proxy_contest_defense'),
          ($1, $2, 'Scenario C: Strategic Review Committee with 2 Activist Observers', 2, 24, 4000000, 4.2, 33760800000, 31920000000, 'hybrid_governance_compromise')`,
        [userId, campaignId]
      );

      await client.query(
        `INSERT INTO universal_proxy_contests (
          user_id, campaign_id, annual_meeting_date, record_date,
          universal_proxy_certified, management_votes_projected,
          dissident_votes_projected, undecided_votes_projected,
          management_win_probability, dissident_win_probability,
          projected_dissident_seats_won
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          campaignId,
          '2026-11-20',
          '2026-09-25',
          true,
          56.40,
          31.25,
          12.35,
          64.3,
          35.7,
          1
        ]
      );

      const initialHash = createHash('sha256').update(`${campaignId}|false`).digest('hex');
      await client.query(
        `INSERT INTO defense_tripartite_signoffs (
          user_id, campaign_id, defense_plan_title,
          lead_director_signed, lead_director_signer,
          governance_chair_signed, governance_chair_signer,
          board_chair_ceo_signed, board_chair_ceo_signer,
          is_fully_ratified, cryptographic_integrity_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          campaignId,
          'Project Aegis: 2026 Shareholder Activism Defense & Governance Charter',
          false, null,
          false, null,
          false, null,
          false,
          initialHash
        ]
      );

      await client.query(
        `INSERT INTO activism_event_logs (
          user_id, campaign_id, event_category, headline, details, severity
        ) VALUES
          ($1, $2, 'filing', 'Schedule 13D Initial Filing Disclosed', 'Vanguard Alpha crossed 5.0% threshold, reporting 7.85% beneficial ownership.', 'high'),
          ($1, $2, 'surveillance', 'Synthetic Derivative Exposure Detected', 'Prime broker desk reported 2.15% equity swaps linked to Vanguard Alpha accounts.', 'medium'),
          ($1, $2, 'proxy_advisory', 'ISS Benchmark Contested Report Published', 'ISS recommended split-ticket vote supporting 1 dissident nominee.', 'high'),
          ($1, $2, 'defense_action', 'Shelf-Ready Shareholder Rights Plan Pre-Approved', 'Board governance committee drafted 15% flip-in pill under Unocal standard.', 'medium')`,
        [userId, campaignId]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
