import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ExecutiveSeveranceCaseDTO,
  type ExecutiveSeveranceCaseMutationDTO,
  type GoodReasonEventDTO,
  type GoodReasonEventMutationDTO,
  type SeveranceCounterProposalDTO,
  type SeveranceAuditParams,
  type CicWaterfallParams,
  type Tax280GParams,
  type CounterProposalParams,
  computeSeveranceAudit,
  computeCicWaterfall,
  compute280GTax,
  computeExecutiveLeverageIndex,
  generateExecutiveCounterMemoMarkdown
} from '@jobtrack/contract';

export class ExecutiveSeveranceService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS executive_severance_cases (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        role_title VARCHAR(255) NOT NULL,
        effective_separation_date DATE NOT NULL,
        severance_params JSONB NOT NULL DEFAULT '{}'::jsonb,
        cic_waterfall_params JSONB NOT NULL DEFAULT '{}'::jsonb,
        tax_280g_params JSONB NOT NULL DEFAULT '{}'::jsonb,
        counter_proposal_params JSONB NOT NULL DEFAULT '{}'::jsonb,
        audit_result JSONB NOT NULL DEFAULT '{}'::jsonb,
        cic_result JSONB NOT NULL DEFAULT '{}'::jsonb,
        tax_280g_result JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_executive_severance_user_updated
        ON executive_severance_cases(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS good_reason_events (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id UUID NOT NULL REFERENCES executive_severance_cases(id) ON DELETE CASCADE,
        category VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        factual_description TEXT NOT NULL,
        date_condition_occurred DATE NOT NULL,
        date_notice_served DATE,
        cure_period_deadline DATE,
        status VARCHAR(64) NOT NULL DEFAULT 'condition_identified',
        evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_good_reason_case
        ON good_reason_events(case_id, date_condition_occurred DESC);
      CREATE INDEX IF NOT EXISTS idx_good_reason_user
        ON good_reason_events(user_id);

      CREATE TABLE IF NOT EXISTS severance_counter_proposals (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        case_id UUID NOT NULL REFERENCES executive_severance_cases(id) ON DELETE CASCADE,
        leverage_index INTEGER NOT NULL DEFAULT 50,
        baseline_package_value_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        proposed_package_value_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        value_delta_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        proposed_cash_months INTEGER NOT NULL DEFAULT 12,
        proposed_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 100,
        proposed_cobra_months INTEGER NOT NULL DEFAULT 12,
        proposed_ptew_years INTEGER NOT NULL DEFAULT 5,
        proposed_acceleration_extent VARCHAR(32) NOT NULL DEFAULT 'full_100_percent',
        legal_fee_allowance_usd NUMERIC(12, 2) NOT NULL DEFAULT 15000,
        memo_markdown TEXT NOT NULL,
        mutual_release_clause_text TEXT NOT NULL,
        non_disparagement_clause_text TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_severance_counter_case
        ON severance_counter_proposals(case_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_severance_counter_user
        ON severance_counter_proposals(user_id);
    `);
  }

  async listCases(userId: string): Promise<ExecutiveSeveranceCaseDTO[]> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `SELECT * FROM executive_severance_cases WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      const defaultCase = await this.seedDefaultCase(userId);
      return [defaultCase];
    }

    const cases: ExecutiveSeveranceCaseDTO[] = [];
    for (const row of result.rows) {
      const eventsRes = await this.pool.query(
        `SELECT * FROM good_reason_events WHERE case_id = $1 AND user_id = $2 ORDER BY date_condition_occurred DESC`,
        [row.id, userId]
      );
      const counterRes = await this.pool.query(
        `SELECT * FROM severance_counter_proposals WHERE case_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
        [row.id, userId]
      );

      cases.push({
        id: row.id,
        userId: row.user_id,
        companyName: row.company_name,
        roleTitle: row.role_title,
        effectiveSeparationDate: row.effective_separation_date instanceof Date ? row.effective_separation_date.toISOString().split('T')[0] : String(row.effective_separation_date),
        severanceParams: row.severance_params,
        cicWaterfallParams: row.cic_waterfall_params,
        tax280GParams: row.tax_280g_params,
        counterProposalParams: row.counter_proposal_params,
        auditResult: row.audit_result,
        cicResult: row.cic_result,
        tax280GResult: row.tax_280g_result,
        goodReasonEvents: eventsRes.rows.map(this.mapGoodReasonEvent),
        counterProposals: counterRes.rows.map(this.mapCounterProposal),
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
      });
    }
    return cases;
  }

  async getCase(userId: string, caseId: string): Promise<ExecutiveSeveranceCaseDTO | null> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `SELECT * FROM executive_severance_cases WHERE id = $1 AND user_id = $2`,
      [caseId, userId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    const eventsRes = await this.pool.query(
      `SELECT * FROM good_reason_events WHERE case_id = $1 AND user_id = $2 ORDER BY date_condition_occurred DESC`,
      [caseId, userId]
    );
    const counterRes = await this.pool.query(
      `SELECT * FROM severance_counter_proposals WHERE case_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [caseId, userId]
    );

    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      roleTitle: row.role_title,
      effectiveSeparationDate: row.effective_separation_date instanceof Date ? row.effective_separation_date.toISOString().split('T')[0] : String(row.effective_separation_date),
      severanceParams: row.severance_params,
      cicWaterfallParams: row.cic_waterfall_params,
      tax280GParams: row.tax_280g_params,
      counterProposalParams: row.counter_proposal_params,
      auditResult: row.audit_result,
      cicResult: row.cic_result,
      tax280GResult: row.tax_280g_result,
      goodReasonEvents: eventsRes.rows.map(this.mapGoodReasonEvent),
      counterProposals: counterRes.rows.map(this.mapCounterProposal),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  async createCase(userId: string, input: ExecutiveSeveranceCaseMutationDTO): Promise<ExecutiveSeveranceCaseDTO> {
    await this.ensureSchema();
    const caseId = crypto.randomUUID();
    const auditResult = computeSeveranceAudit(input.severanceParams);
    const cicResult = computeCicWaterfall(input.cicWaterfallParams);
    const tax280GResult = compute280GTax(input.tax280GParams);

    const query = `
      INSERT INTO executive_severance_cases (
        id, user_id, company_name, role_title, effective_separation_date,
        severance_params, cic_waterfall_params, tax_280g_params, counter_proposal_params,
        audit_result, cic_result, tax_280g_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      caseId,
      userId,
      input.companyName,
      input.roleTitle,
      input.effectiveSeparationDate,
      JSON.stringify(input.severanceParams),
      JSON.stringify(input.cicWaterfallParams),
      JSON.stringify(input.tax280GParams),
      JSON.stringify(input.counterProposalParams),
      JSON.stringify(auditResult),
      JSON.stringify(cicResult),
      JSON.stringify(tax280GResult)
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      roleTitle: row.role_title,
      effectiveSeparationDate: row.effective_separation_date instanceof Date ? row.effective_separation_date.toISOString().split('T')[0] : String(row.effective_separation_date),
      severanceParams: row.severance_params,
      cicWaterfallParams: row.cic_waterfall_params,
      tax280GParams: row.tax_280g_params,
      counterProposalParams: row.counter_proposal_params,
      auditResult: row.audit_result,
      cicResult: row.cic_result,
      tax280GResult: row.tax_280g_result,
      goodReasonEvents: [],
      counterProposals: [],
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  async updateCase(
    userId: string,
    caseId: string,
    input: Partial<ExecutiveSeveranceCaseMutationDTO>
  ): Promise<ExecutiveSeveranceCaseDTO | null> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      `SELECT * FROM executive_severance_cases WHERE id = $1 AND user_id = $2`,
      [caseId, userId]
    );
    if (existing.rows.length === 0) return null;

    const current = existing.rows[0];
    const companyName = input.companyName ?? current.company_name;
    const roleTitle = input.roleTitle ?? current.role_title;
    const effectiveSeparationDate = input.effectiveSeparationDate ?? current.effective_separation_date;
    const severanceParams = input.severanceParams ?? current.severance_params;
    const cicWaterfallParams = input.cicWaterfallParams ?? current.cic_waterfall_params;
    const tax280GParams = input.tax280GParams ?? current.tax_280g_params;
    const counterProposalParams = input.counterProposalParams ?? current.counter_proposal_params;

    const auditResult = computeSeveranceAudit(severanceParams);
    const cicResult = computeCicWaterfall(cicWaterfallParams);
    const tax280GResult = compute280GTax(tax280GParams);

    const query = `
      UPDATE executive_severance_cases SET
        company_name = $1,
        role_title = $2,
        effective_separation_date = $3,
        severance_params = $4,
        cic_waterfall_params = $5,
        tax_280g_params = $6,
        counter_proposal_params = $7,
        audit_result = $8,
        cic_result = $9,
        tax_280g_result = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11 AND user_id = $12
      RETURNING *
    `;

    const values = [
      companyName,
      roleTitle,
      effectiveSeparationDate,
      JSON.stringify(severanceParams),
      JSON.stringify(cicWaterfallParams),
      JSON.stringify(tax280GParams),
      JSON.stringify(counterProposalParams),
      JSON.stringify(auditResult),
      JSON.stringify(cicResult),
      JSON.stringify(tax280GResult),
      caseId,
      userId
    ];

    const result = await this.pool.query(query, values);
    const row = result.rows[0];

    const eventsRes = await this.pool.query(
      `SELECT * FROM good_reason_events WHERE case_id = $1 AND user_id = $2 ORDER BY date_condition_occurred DESC`,
      [caseId, userId]
    );
    const counterRes = await this.pool.query(
      `SELECT * FROM severance_counter_proposals WHERE case_id = $1 AND user_id = $2 ORDER BY created_at DESC`,
      [caseId, userId]
    );

    return {
      id: row.id,
      userId: row.user_id,
      companyName: row.company_name,
      roleTitle: row.role_title,
      effectiveSeparationDate: row.effective_separation_date instanceof Date ? row.effective_separation_date.toISOString().split('T')[0] : String(row.effective_separation_date),
      severanceParams: row.severance_params,
      cicWaterfallParams: row.cic_waterfall_params,
      tax280GParams: row.tax_280g_params,
      counterProposalParams: row.counter_proposal_params,
      auditResult: row.audit_result,
      cicResult: row.cic_result,
      tax280GResult: row.tax_280g_result,
      goodReasonEvents: eventsRes.rows.map(this.mapGoodReasonEvent),
      counterProposals: counterRes.rows.map(this.mapCounterProposal),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  async deleteCase(userId: string, caseId: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `DELETE FROM executive_severance_cases WHERE id = $1 AND user_id = $2`,
      [caseId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async addGoodReasonEvent(
    userId: string,
    caseId: string,
    input: GoodReasonEventMutationDTO
  ): Promise<GoodReasonEventDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    let cureDeadline: string | null = null;
    if (input.dateNoticeServed) {
      const noticeDate = new Date(input.dateNoticeServed);
      noticeDate.setDate(noticeDate.getDate() + 30);
      cureDeadline = noticeDate.toISOString().split('T')[0];
    }

    const query = `
      INSERT INTO good_reason_events (
        id, user_id, case_id, category, title, factual_description,
        date_condition_occurred, date_notice_served, cure_period_deadline,
        status, evidence_urls, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const values = [
      id,
      userId,
      caseId,
      input.category,
      input.title,
      input.factualDescription,
      input.dateConditionOccurred,
      input.dateNoticeServed || null,
      cureDeadline,
      input.status || 'condition_identified',
      JSON.stringify(input.evidenceUrls || []),
      input.notes || ''
    ];

    const result = await this.pool.query(query, values);
    return this.mapGoodReasonEvent(result.rows[0]);
  }

  async deleteGoodReasonEvent(userId: string, eventId: string): Promise<boolean> {
    await this.ensureSchema();
    const result = await this.pool.query(
      `DELETE FROM good_reason_events WHERE id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async createCounterProposal(
    userId: string,
    caseId: string
  ): Promise<SeveranceCounterProposalDTO | null> {
    await this.ensureSchema();
    const caseRes = await this.pool.query(
      `SELECT * FROM executive_severance_cases WHERE id = $1 AND user_id = $2`,
      [caseId, userId]
    );
    if (caseRes.rows.length === 0) return null;

    const c = caseRes.rows[0];
    const fullCase: ExecutiveSeveranceCaseDTO = {
      id: c.id,
      userId: c.user_id,
      companyName: c.company_name,
      roleTitle: c.role_title,
      effectiveSeparationDate: c.effective_separation_date instanceof Date ? c.effective_separation_date.toISOString().split('T')[0] : String(c.effective_separation_date),
      severanceParams: c.severance_params,
      cicWaterfallParams: c.cic_waterfall_params,
      tax280GParams: c.tax_280g_params,
      counterProposalParams: c.counter_proposal_params,
      auditResult: c.audit_result,
      cicResult: c.cic_result,
      tax280GResult: c.tax_280g_result,
      goodReasonEvents: [],
      counterProposals: [],
      createdAt: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at),
      updatedAt: c.updated_at instanceof Date ? c.updated_at.toISOString() : String(c.updated_at)
    };

    const counter = fullCase.counterProposalParams;
    const leverageIndex = computeExecutiveLeverageIndex(counter.leverageFactors);
    const memo = generateExecutiveCounterMemoMarkdown(fullCase, counter, leverageIndex);

    const baselineVal = fullCase.auditResult.totalSeverancePackageValueUsd;
    const monthlySalary = fullCase.severanceParams.annualBaseSalaryUsd / 12;
    const proposedCash = monthlySalary * counter.requestedCashMonths;
    const proposedBonus = fullCase.severanceParams.annualBaseSalaryUsd * (counter.requestedBonusPercent / 100);
    const proposedCobra = fullCase.severanceParams.monthlyCobraCostUsd * counter.requestedCobraMonths;
    const totalProposed = proposedCash + proposedBonus + proposedCobra + counter.requestedLegalFeeAllowanceUsd;
    const delta = totalProposed - baselineVal;

    const id = crypto.randomUUID();
    const query = `
      INSERT INTO severance_counter_proposals (
        id, user_id, case_id, leverage_index, baseline_package_value_usd,
        proposed_package_value_usd, value_delta_usd, proposed_cash_months,
        proposed_bonus_percent, proposed_cobra_months, proposed_ptew_years,
        proposed_acceleration_extent, legal_fee_allowance_usd, memo_markdown,
        mutual_release_clause_text, non_disparagement_clause_text, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      id,
      userId,
      caseId,
      leverageIndex,
      baselineVal,
      totalProposed,
      delta,
      counter.requestedCashMonths,
      counter.requestedBonusPercent,
      counter.requestedCobraMonths,
      counter.requestedPtewYears,
      counter.requestedAccelerationExtent,
      counter.requestedLegalFeeAllowanceUsd,
      memo,
      'The Company hereby fully, irrevocably, and unconditionally releases Executive from any and all known and unknown claims.',
      'The Company agrees to instruct its Board of Directors and Executive Officers to refrain from any disparaging or adverse statements.',
      'draft'
    ];

    const result = await this.pool.query(query, values);
    return this.mapCounterProposal(result.rows[0]);
  }

  private async seedDefaultCase(userId: string): Promise<ExecutiveSeveranceCaseDTO> {
    const sevParams: SeveranceAuditParams = {
      annualBaseSalaryUsd: 380000,
      cashContinuationMonths: 6,
      targetBonusPercentage: 35,
      bonusProrationMode: 'target',
      companyPerformanceMultiplier: 1.0,
      daysWorkedInFiscalYear: 315,
      monthlyCobraCostUsd: 2600,
      cobraSubsidizedMonths: 6,
      cobraTaxGrossedUp: true,
      outplacementBudgetUsd: 15000,
      accruedPtoDays: 18,
      statutoryPtoVestingMandated: true,
      unlimitedPtoForfeitureRisk: false,
      ptewMonths: 3,
      optionsHeldCount: 150000,
      estimatedExerciseCostUsd: 225000
    };

    const cicParams: CicWaterfallParams = {
      enterpriseValuationUsd: 250000000,
      fundedDebtUsd: 20000000,
      balanceSheetCashUsd: 15000000,
      transactionFeePercent: 2.0,
      escrowHoldbackPercent: 5.0,
      preferredSharesStack: [
        { seriesName: 'Series A', investedAmountUsd: 12000000, liquidationMultiple: 1.0, isParticipating: false },
        { seriesName: 'Series B', investedAmountUsd: 28000000, liquidationMultiple: 1.0, isParticipating: false },
        { seriesName: 'Series C', investedAmountUsd: 45000000, liquidationMultiple: 1.0, isParticipating: false }
      ],
      totalFullyDilutedCommonShares: 22000000,
      unvestedOptionsCount: 120000,
      unvestedOptionsStrikePriceUsd: 1.50,
      unvestedRsuCount: 45000,
      vestedOptionsCount: 180000,
      vestedOptionsStrikePriceUsd: 1.50,
      vestedRsuCount: 30000,
      triggerMode: 'double_trigger',
      accelerationExtent: 'full_100_percent',
      cicProtectionWindowMonths: 18
    };

    const taxParams: Tax280GParams = {
      w2History5YearsUsd: [310000, 340000, 390000, 420000, 460000],
      contingentCashSeveranceUsd: 190000,
      contingentBonusUsd: 114945,
      contingentEquityAccelerationUsd: 980000,
      contingentOtherBenefitsUsd: 38400,
      federalMarginalTaxRate: 37,
      stateMarginalTaxRate: 13.3,
      medicareMarginalTaxRate: 2.35,
      corporateTaxRate: 21,
      agreedSettlementType: 'best_net_valley_rule'
    };

    const counterParams: CounterProposalParams = {
      requestedCashMonths: 12,
      requestedBonusPercent: 100,
      requestedCobraMonths: 12,
      requestedPtewYears: 7,
      requestedAccelerationExtent: 'full_100_percent',
      requestedLegalFeeAllowanceUsd: 25000,
      requireMutualRelease: true,
      requireMutualNonDisparagement: true,
      statutoryWhistleblowerCarveoutsConfirmed: true,
      leverageFactors: {
        busFactorScore: 22,
        keyPersonClosingCondition: true,
        teamFlightRiskScore: 18,
        patentInventorshipCount: 3,
        constructiveDischargeMeritScore: 12
      }
    };

    return this.createCase(userId, {
      companyName: 'Apex Cloud Systems',
      roleTitle: 'VP of Engineering',
      effectiveSeparationDate: '2026-11-15',
      severanceParams: sevParams,
      cicWaterfallParams: cicParams,
      tax280GParams: taxParams,
      counterProposalParams: counterParams
    });
  }

  private mapGoodReasonEvent(row: any): GoodReasonEventDTO {
    return {
      id: row.id,
      caseId: row.case_id,
      category: row.category,
      title: row.title,
      factualDescription: row.factual_description,
      dateConditionOccurred: row.date_condition_occurred instanceof Date ? row.date_condition_occurred.toISOString().split('T')[0] : String(row.date_condition_occurred),
      dateNoticeServed: row.date_notice_served ? (row.date_notice_served instanceof Date ? row.date_notice_served.toISOString().split('T')[0] : String(row.date_notice_served)) : null,
      curePeriodDeadline: row.cure_period_deadline ? (row.cure_period_deadline instanceof Date ? row.cure_period_deadline.toISOString().split('T')[0] : String(row.cure_period_deadline)) : null,
      status: row.status,
      evidenceUrls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
      notes: row.notes || '',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  private mapCounterProposal(row: any): SeveranceCounterProposalDTO {
    return {
      id: row.id,
      caseId: row.case_id,
      leverageIndex: Number(row.leverage_index),
      baselinePackageValueUsd: Number(row.baseline_package_value_usd),
      proposedPackageValueUsd: Number(row.proposed_package_value_usd),
      valueDeltaUsd: Number(row.value_delta_usd),
      proposedCashMonths: Number(row.proposed_cash_months),
      proposedBonusPercent: Number(row.proposed_bonus_percent),
      proposedCobraMonths: Number(row.proposed_cobra_months),
      proposedPtewYears: Number(row.proposed_ptew_years),
      proposedAccelerationExtent: row.proposed_acceleration_extent,
      legalFeeAllowanceUsd: Number(row.legal_fee_allowance_usd),
      memoMarkdown: row.memo_markdown,
      mutualReleaseClauseText: row.mutual_release_clause_text,
      nonDisparagementClauseText: row.non_disparagement_clause_text,
      status: row.status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }
}
