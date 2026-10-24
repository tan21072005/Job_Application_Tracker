import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type BoardMandateDTO,
  type BoardMandateMutationDTO,
  type FastEquityDilutionModelDTO,
  type ConflictOfInterestCheckDTO,
  type OutsideBoardWaiverLetterDTO,
  type GovernanceMatrixDTO,
  type GovernanceMatrixMutationDTO,
  type BoardDossierDTO,
  type CompanyGrowthStage,
  type AdvisoryImpactLevel,
  type BoardMandateType,
  type MandatePipelineStage,
  type BoardEquityGrantType,
  type BoardVestingScheduleType,
  type AccelerationClauseType,
  type BoardCommitteeKey,
  type GovernanceQuotientTier,
  computeFastEquityDilutionModel,
  evaluateConflictOfInterest,
  computeGovernanceQuotient,
  generateOutsideBoardWaiverLetter,
  generateBoardDossierMarkdown
} from '@jobtrack/contract';

export async function initBoardAdvisoryNexusTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS board_mandates (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_company_name VARCHAR(255) NOT NULL,
      mandate_type VARCHAR(64) NOT NULL DEFAULT 'advisory_board',
      stage VARCHAR(64) NOT NULL DEFAULT 'prospect',
      annual_cash_retainer NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      meeting_fee_per_board_meeting NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      meeting_fee_per_committee_meeting NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      expected_board_meetings_per_year INTEGER NOT NULL DEFAULT 4,
      expected_committee_meetings_per_year INTEGER NOT NULL DEFAULT 4,
      equity_percentage NUMERIC(6, 4) NOT NULL DEFAULT 0.2500,
      equity_grant_type VARCHAR(64) NOT NULL DEFAULT 'nso_options',
      vesting_schedule VARCHAR(64) NOT NULL DEFAULT 'two_year_monthly_no_cliff',
      acceleration_clause VARCHAR(64) NOT NULL DEFAULT 'single_trigger_change_of_control',
      option_strike_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
      time_commitment_hours_per_month INTEGER NOT NULL DEFAULT 4,
      term_length_years INTEGER NOT NULL DEFAULT 2,
      committee_assignments JSONB NOT NULL DEFAULT '[]'::jsonb,
      has_d_and_o_insurance BOOLEAN NOT NULL DEFAULT FALSE,
      d_and_o_policy_limit_millions NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
      has_side_a_dic_coverage BOOLEAN NOT NULL DEFAULT FALSE,
      has_indemnification_agreement BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_board_mandates_user_created
      ON board_mandates(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_board_mandates_user_company
      ON board_mandates(user_id, target_company_name);
    CREATE INDEX IF NOT EXISTS idx_board_mandates_user_stage
      ON board_mandates(user_id, stage);

    CREATE TABLE IF NOT EXISTS executive_governance_matrices (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      fiduciary_acumen_score INTEGER NOT NULL DEFAULT 70,
      cyber_audit_oversight_score INTEGER NOT NULL DEFAULT 75,
      ai_governance_ethics_score INTEGER NOT NULL DEFAULT 70,
      executive_compensation_score INTEGER NOT NULL DEFAULT 65,
      boardroom_presence_dissent_score INTEGER NOT NULL DEFAULT 70,
      governance_quotient INTEGER NOT NULL DEFAULT 71,
      tier VARCHAR(64) NOT NULL DEFAULT 'governance_seasoned',
      qualified_committees JSONB NOT NULL DEFAULT '[]'::jsonb,
      verified_credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_exec_gov_matrices_user
      ON executive_governance_matrices(user_id);
  `);
}

function mapRowToBoardMandate(row: any): BoardMandateDTO {
  return {
    id: row.id,
    userId: row.user_id,
    targetCompanyName: row.target_company_name,
    mandateType: row.mandate_type as BoardMandateType,
    stage: row.stage as MandatePipelineStage,
    annualCashRetainer: parseFloat(row.annual_cash_retainer) || 0,
    meetingFeePerBoardMeeting: parseFloat(row.meeting_fee_per_board_meeting) || 0,
    meetingFeePerCommitteeMeeting: parseFloat(row.meeting_fee_per_committee_meeting) || 0,
    expectedBoardMeetingsPerYear: parseInt(row.expected_board_meetings_per_year, 10) || 4,
    expectedCommitteeMeetingsPerYear: parseInt(row.expected_committee_meetings_per_year, 10) || 4,
    equityPercentage: parseFloat(row.equity_percentage) || 0,
    equityGrantType: row.equity_grant_type as BoardEquityGrantType,
    vestingSchedule: row.vesting_schedule as BoardVestingScheduleType,
    accelerationClause: row.acceleration_clause as AccelerationClauseType,
    optionStrikePrice: parseFloat(row.option_strike_price) || 0,
    timeCommitmentHoursPerMonth: parseInt(row.time_commitment_hours_per_month, 10) || 4,
    termLengthYears: parseInt(row.term_length_years, 10) || 2,
    committeeAssignments: Array.isArray(row.committee_assignments)
      ? row.committee_assignments
      : typeof row.committee_assignments === 'string'
      ? JSON.parse(row.committee_assignments)
      : [],
    hasDAndOInsurance: Boolean(row.has_d_and_o_insurance),
    dAndOPolicyLimitMillions: parseFloat(row.d_and_o_policy_limit_millions) || 0,
    hasSideADicCoverage: Boolean(row.has_side_a_dic_coverage),
    hasIndemnificationAgreement: Boolean(row.has_indemnification_agreement),
    notes: row.notes || '',
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapRowToGovernanceMatrix(row: any): GovernanceMatrixDTO {
  return {
    id: row.id,
    userId: row.user_id,
    fiduciaryAcumenScore: parseInt(row.fiduciary_acumen_score, 10) || 70,
    cyberAuditOversightScore: parseInt(row.cyber_audit_oversight_score, 10) || 75,
    aiGovernanceEthicsScore: parseInt(row.ai_governance_ethics_score, 10) || 70,
    executiveCompensationScore: parseInt(row.executive_compensation_score, 10) || 65,
    boardroomPresenceDissentScore: parseInt(row.boardroom_presence_dissent_score, 10) || 70,
    governanceQuotient: parseInt(row.governance_quotient, 10) || 71,
    tier: row.tier as GovernanceQuotientTier,
    qualifiedCommittees: Array.isArray(row.qualified_committees)
      ? row.qualified_committees
      : typeof row.qualified_committees === 'string'
      ? JSON.parse(row.qualified_committees)
      : [],
    verifiedCredentials: Array.isArray(row.verified_credentials)
      ? row.verified_credentials
      : typeof row.verified_credentials === 'string'
      ? JSON.parse(row.verified_credentials)
      : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export class BoardAdvisoryNexusService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async ensureSeedData(userId: string): Promise<void> {
    const existing = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM board_mandates WHERE user_id = $1`,
      [userId]
    );
    if ((existing.rows[0]?.count || 0) === 0) {
      await this.pool.query(
        `INSERT INTO board_mandates (
          id, user_id, target_company_name, mandate_type, stage,
          annual_cash_retainer, meeting_fee_per_board_meeting, meeting_fee_per_committee_meeting,
          expected_board_meetings_per_year, expected_committee_meetings_per_year,
          equity_percentage, equity_grant_type, vesting_schedule, acceleration_clause,
          option_strike_price, time_commitment_hours_per_month, term_length_years,
          committee_assignments, has_d_and_o_insurance, d_and_o_policy_limit_millions,
          has_side_a_dic_coverage, has_indemnification_agreement, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ), (
          $24, $2, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45
        )`,
        [
          crypto.randomUUID(),
          userId,
          'Datacore Systems (Series B AI)',
          'advisory_board',
          'offer_term_sheet',
          15000,
          1000,
          500,
          4,
          4,
          0.35,
          'nso_options',
          'two_year_monthly_no_cliff',
          'single_trigger_change_of_control',
          2500,
          5,
          2,
          JSON.stringify(['tech_cybersecurity', 'ai_ethics_data']),
          true,
          10.0,
          true,
          true,
          'Advising founders on enterprise scale, SOC 2 compliance, and agentic LLM security perimeter.',
          crypto.randomUUID(),
          'Apex Defense Cloud (Growth PE)',
          'board_of_directors',
          'board_diligence',
          50000,
          2500,
          1500,
          6,
          6,
          0.5,
          'rsu',
          'four_year_one_year_cliff',
          'double_trigger_change_and_termination',
          0,
          10,
          3,
          JSON.stringify(['audit_risk', 'tech_cybersecurity']),
          true,
          25.0,
          true,
          true,
          'Prospective Independent Director and Technology Committee Chair. Fiduciary vetting underway.'
        ]
      );
    }

    const matrixExisting = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM executive_governance_matrices WHERE user_id = $1`,
      [userId]
    );
    if ((matrixExisting.rows[0]?.count || 0) === 0) {
      const defaultCalculated = computeGovernanceQuotient({
        fiduciaryAcumenScore: 88,
        cyberAuditOversightScore: 92,
        aiGovernanceEthicsScore: 86,
        executiveCompensationScore: 78,
        boardroomPresenceDissentScore: 84,
        verifiedCredentials: []
      });

      await this.pool.query(
        `INSERT INTO executive_governance_matrices (
          id, user_id, fiduciary_acumen_score, cyber_audit_oversight_score,
          ai_governance_ethics_score, executive_compensation_score,
          boardroom_presence_dissent_score, governance_quotient, tier,
          qualified_committees, verified_credentials
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          crypto.randomUUID(),
          userId,
          88,
          92,
          86,
          78,
          84,
          defaultCalculated.governanceQuotient,
          defaultCalculated.tier,
          JSON.stringify(defaultCalculated.qualifiedCommittees),
          JSON.stringify([
            'NACD Directorship Certified (National Association of Corporate Directors)',
            'Stanford Directors College (Stanford Law School Executive Education)',
            'Carnegie Mellon Software Engineering Institute CERT Board Cyber Oversight'
          ])
        ]
      );
    }
  }

  async listMandates(userId: string): Promise<BoardMandateDTO[]> {
    await initBoardAdvisoryNexusTables(this.pool);
    await this.ensureSeedData(userId);
    const res = await this.pool.query(
      `SELECT * FROM board_mandates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(mapRowToBoardMandate);
  }

  async getMandate(userId: string, id: string): Promise<BoardMandateDTO | null> {
    await initBoardAdvisoryNexusTables(this.pool);
    const res = await this.pool.query(
      `SELECT * FROM board_mandates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (res.rows.length === 0) return null;
    return mapRowToBoardMandate(res.rows[0]);
  }

  async createMandate(userId: string, input: BoardMandateMutationDTO): Promise<BoardMandateDTO> {
    await initBoardAdvisoryNexusTables(this.pool);
    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO board_mandates (
        id, user_id, target_company_name, mandate_type, stage,
        annual_cash_retainer, meeting_fee_per_board_meeting, meeting_fee_per_committee_meeting,
        expected_board_meetings_per_year, expected_committee_meetings_per_year,
        equity_percentage, equity_grant_type, vesting_schedule, acceleration_clause,
        option_strike_price, time_commitment_hours_per_month, term_length_years,
        committee_assignments, has_d_and_o_insurance, d_and_o_policy_limit_millions,
        has_side_a_dic_coverage, has_indemnification_agreement, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *`,
      [
        id,
        userId,
        input.targetCompanyName,
        input.mandateType,
        input.stage,
        input.annualCashRetainer,
        input.meetingFeePerBoardMeeting,
        input.meetingFeePerCommitteeMeeting,
        input.expectedBoardMeetingsPerYear,
        input.expectedCommitteeMeetingsPerYear,
        input.equityPercentage,
        input.equityGrantType,
        input.vestingSchedule,
        input.accelerationClause,
        input.optionStrikePrice,
        input.timeCommitmentHoursPerMonth,
        input.termLengthYears,
        JSON.stringify(input.committeeAssignments || []),
        input.hasDAndOInsurance,
        input.dAndOPolicyLimitMillions,
        input.hasSideADicCoverage,
        input.hasIndemnificationAgreement,
        input.notes
      ]
    );
    return mapRowToBoardMandate(res.rows[0]);
  }

  async updateMandate(
    userId: string,
    id: string,
    input: Partial<BoardMandateMutationDTO>
  ): Promise<BoardMandateDTO | null> {
    await initBoardAdvisoryNexusTables(this.pool);
    const existing = await this.getMandate(userId, id);
    if (!existing) return null;

    const merged = { ...existing, ...input };
    const res = await this.pool.query(
      `UPDATE board_mandates SET
        target_company_name = $1,
        mandate_type = $2,
        stage = $3,
        annual_cash_retainer = $4,
        meeting_fee_per_board_meeting = $5,
        meeting_fee_per_committee_meeting = $6,
        expected_board_meetings_per_year = $7,
        expected_committee_meetings_per_year = $8,
        equity_percentage = $9,
        equity_grant_type = $10,
        vesting_schedule = $11,
        acceleration_clause = $12,
        option_strike_price = $13,
        time_commitment_hours_per_month = $14,
        term_length_years = $15,
        committee_assignments = $16,
        has_d_and_o_insurance = $17,
        d_and_o_policy_limit_millions = $18,
        has_side_a_dic_coverage = $19,
        has_indemnification_agreement = $20,
        notes = $21,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22 AND user_id = $23
      RETURNING *`,
      [
        merged.targetCompanyName,
        merged.mandateType,
        merged.stage,
        merged.annualCashRetainer,
        merged.meetingFeePerBoardMeeting,
        merged.meetingFeePerCommitteeMeeting,
        merged.expectedBoardMeetingsPerYear,
        merged.expectedCommitteeMeetingsPerYear,
        merged.equityPercentage,
        merged.equityGrantType,
        merged.vestingSchedule,
        merged.accelerationClause,
        merged.optionStrikePrice,
        merged.timeCommitmentHoursPerMonth,
        merged.termLengthYears,
        JSON.stringify(merged.committeeAssignments || []),
        merged.hasDAndOInsurance,
        merged.dAndOPolicyLimitMillions,
        merged.hasSideADicCoverage,
        merged.hasIndemnificationAgreement,
        merged.notes,
        id,
        userId
      ]
    );
    return mapRowToBoardMandate(res.rows[0]);
  }

  async deleteMandate(userId: string, id: string): Promise<boolean> {
    await initBoardAdvisoryNexusTables(this.pool);
    const res = await this.pool.query(
      `DELETE FROM board_mandates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getDilutionModel(
    userId: string,
    mandateId: string,
    stage: CompanyGrowthStage = 'seed_stage',
    impact: AdvisoryImpactLevel = 'standard',
    futureRounds: number = 2,
    dilutionPerRound: number = 0.2
  ): Promise<FastEquityDilutionModelDTO | null> {
    const mandate = await this.getMandate(userId, mandateId);
    if (!mandate) return null;
    return computeFastEquityDilutionModel(
      mandate,
      stage,
      impact,
      futureRounds,
      dilutionPerRound
    );
  }

  async checkConflict(
    userId: string,
    mandateId: string,
    payload: {
      primaryEmployerName: string;
      isDirectCompetitor: boolean;
      isAdjacentMarket: boolean;
      primaryCapitalMillions: number;
      targetCapitalMillions: number;
      hasIpOverlap: boolean;
      hasHardwareSegregation: boolean;
    }
  ): Promise<ConflictOfInterestCheckDTO | null> {
    const mandate = await this.getMandate(userId, mandateId);
    if (!mandate) return null;
    return evaluateConflictOfInterest(
      mandate,
      payload.primaryEmployerName || 'Primary Employer',
      Boolean(payload.isDirectCompetitor),
      Boolean(payload.isAdjacentMarket),
      Number(payload.primaryCapitalMillions) || 0,
      Number(payload.targetCapitalMillions) || 0,
      Boolean(payload.hasIpOverlap),
      Boolean(payload.hasHardwareSegregation)
    );
  }

  async generateWaiverLetter(
    userId: string,
    mandateId: string,
    payload: {
      executiveName: string;
      generalCounselName: string;
      roleTitle: string;
      primaryEmployerName?: string;
      isDirectCompetitor?: boolean;
      isAdjacentMarket?: boolean;
      primaryCapitalMillions?: number;
      targetCapitalMillions?: number;
      hasIpOverlap?: boolean;
      hasHardwareSegregation?: boolean;
    }
  ): Promise<OutsideBoardWaiverLetterDTO | null> {
    const mandate = await this.getMandate(userId, mandateId);
    if (!mandate) return null;

    const check = evaluateConflictOfInterest(
      mandate,
      payload.primaryEmployerName || 'Primary Employer Inc.',
      Boolean(payload.isDirectCompetitor),
      Boolean(payload.isAdjacentMarket),
      Number(payload.primaryCapitalMillions) || 0,
      Number(payload.targetCapitalMillions) || 0,
      Boolean(payload.hasIpOverlap),
      Boolean(payload.hasHardwareSegregation)
    );

    const letterMarkdown = generateOutsideBoardWaiverLetter(
      check,
      payload.executiveName || 'Executive Candidate',
      payload.generalCounselName || 'General Counsel',
      payload.roleTitle || 'VP of Engineering'
    );

    return {
      mandateId: mandate.id,
      executiveFullName: payload.executiveName || 'Executive Candidate',
      primaryEmployerName: check.primaryEmployerName,
      primaryEmployerGeneralCounselName: payload.generalCounselName || 'General Counsel',
      targetCompanyName: mandate.targetCompanyName,
      targetCompanyDescription: mandate.notes || 'Technology Enterprise',
      mandateRoleTitle: mandate.mandateType.replace(/_/g, ' '),
      monthlyHoursCommitment: mandate.timeCommitmentHoursPerMonth,
      generatedDate: new Date().toISOString().split('T')[0],
      letterMarkdown
    };
  }

  async getGovernanceMatrix(userId: string): Promise<GovernanceMatrixDTO> {
    await initBoardAdvisoryNexusTables(this.pool);
    await this.ensureSeedData(userId);
    const res = await this.pool.query(
      `SELECT * FROM executive_governance_matrices WHERE user_id = $1`,
      [userId]
    );
    if (res.rows.length === 0) {
      const defaultCalculated = computeGovernanceQuotient({
        fiduciaryAcumenScore: 70,
        cyberAuditOversightScore: 75,
        aiGovernanceEthicsScore: 70,
        executiveCompensationScore: 65,
        boardroomPresenceDissentScore: 70,
        verifiedCredentials: []
      });
      const id = crypto.randomUUID();
      const created = await this.pool.query(
        `INSERT INTO executive_governance_matrices (
          id, user_id, fiduciary_acumen_score, cyber_audit_oversight_score,
          ai_governance_ethics_score, executive_compensation_score,
          boardroom_presence_dissent_score, governance_quotient, tier,
          qualified_committees, verified_credentials
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          id,
          userId,
          70,
          75,
          70,
          65,
          70,
          defaultCalculated.governanceQuotient,
          defaultCalculated.tier,
          JSON.stringify(defaultCalculated.qualifiedCommittees),
          JSON.stringify([])
        ]
      );
      return mapRowToGovernanceMatrix(created.rows[0]);
    }
    return mapRowToGovernanceMatrix(res.rows[0]);
  }

  async updateGovernanceMatrix(
    userId: string,
    input: GovernanceMatrixMutationDTO
  ): Promise<GovernanceMatrixDTO> {
    await initBoardAdvisoryNexusTables(this.pool);
    const computed = computeGovernanceQuotient(input);
    const res = await this.pool.query(
      `INSERT INTO executive_governance_matrices (
        id, user_id, fiduciary_acumen_score, cyber_audit_oversight_score,
        ai_governance_ethics_score, executive_compensation_score,
        boardroom_presence_dissent_score, governance_quotient, tier,
        qualified_committees, verified_credentials, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id) DO UPDATE SET
        fiduciary_acumen_score = EXCLUDED.fiduciary_acumen_score,
        cyber_audit_oversight_score = EXCLUDED.cyber_audit_oversight_score,
        ai_governance_ethics_score = EXCLUDED.ai_governance_ethics_score,
        executive_compensation_score = EXCLUDED.executive_compensation_score,
        boardroom_presence_dissent_score = EXCLUDED.boardroom_presence_dissent_score,
        governance_quotient = EXCLUDED.governance_quotient,
        tier = EXCLUDED.tier,
        qualified_committees = EXCLUDED.qualified_committees,
        verified_credentials = EXCLUDED.verified_credentials,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        crypto.randomUUID(),
        userId,
        input.fiduciaryAcumenScore,
        input.cyberAuditOversightScore,
        input.aiGovernanceEthicsScore,
        input.executiveCompensationScore,
        input.boardroomPresenceDissentScore,
        computed.governanceQuotient,
        computed.tier,
        JSON.stringify(computed.qualifiedCommittees),
        JSON.stringify(input.verifiedCredentials || [])
      ]
    );
    return mapRowToGovernanceMatrix(res.rows[0]);
  }

  async getBoardDossier(userId: string): Promise<BoardDossierDTO> {
    const matrix = await this.getGovernanceMatrix(userId);
    const mandates = await this.listMandates(userId);

    const userRes = await this.pool.query(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    );
    const userEmail = userRes.rows[0]?.email || 'executive@jobtrack.internal';
    const executiveName = userEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    const roleTitle = 'Vice President of Engineering / CTO';

    const boardDossierMarkdown = generateBoardDossierMarkdown(
      executiveName,
      roleTitle,
      matrix,
      mandates
    );

    return {
      userId,
      executiveFullName: executiveName,
      executiveRoleTitle: roleTitle,
      boardValueProposition: 'Technology Executive with Enterprise Cloud & AI Governance Specialization',
      governanceQuotient: matrix.governanceQuotient,
      qualifiedCommittees: matrix.qualifiedCommittees,
      activeMandatesCount: mandates.length,
      totalBoardSeatsCount: mandates.filter(m => m.mandateType === 'board_of_directors').length,
      primarySpecializations: ['Enterprise SaaS Architecture', 'SEC Cyber Risk Oversight', 'AI Model Governance'],
      boardDossierMarkdown,
      generatedAt: new Date().toISOString()
    };
  }
}
