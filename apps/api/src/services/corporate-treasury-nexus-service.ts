import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CorporateTreasuryOverviewDTO,
  type TreasuryEntityDTO,
  type TreasuryBankAccountDTO,
  type CashConcentrationSummaryDTO,
  type WeeklyCashForecastItemDTO,
  type CashForecastSummaryDTO,
  type FxExposureItemDTO,
  type FxHedgeContractDTO,
  type BankCounterpartyDTO,
  type ExecuteCashSweepRequestDTO,
  type CashSweepExecutionResultDTO,
  type WorkingCapitalSimulationRequestDTO,
  type WorkingCapitalSimulationResultDTO,
  type FxSensitivitySimulationRequestDTO,
  type FxSensitivitySimulationResultDTO,
  type BailInStressTestRequestDTO,
  type BailInStressTestResultDTO,
  type GenerateTreasuryBoardMemoRequestDTO,
  type SignoffTreasuryBoardMemoRequestDTO,
  type TreasuryBoardMemorandumDTO,
  type TreasuryBoardSignoffDTO,
  calculateCashConversionCycle,
  calculateIntercompanyLoanInterest,
  calculateNotionalPoolArbitrage,
  calculateParametricFxVaR95,
  calculateHedgeEffectivenessRatio,
  calculateImpliedDefaultProbability,
  simulateBankBailInHaircut,
  calculateCompositeTrlsScore,
  generateTreasuryBoardMemorandumMarkdown
} from '@jobtrack/contract';

export class CorporateTreasuryNexusService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS treasury_nexus_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_name VARCHAR(255) NOT NULL DEFAULT 'JobTrack Enterprise Holdings',
        composite_trls_score NUMERIC(5, 2) NOT NULL DEFAULT 89.40,
        trls_band VARCHAR(64) NOT NULL DEFAULT 'defensible_stability',
        total_treasury_assets_usd NUMERIC(16, 2) NOT NULL DEFAULT 48500000.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_treasury_studio_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS treasury_bank_accounts (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES treasury_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id VARCHAR(64) NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255) NOT NULL,
        bank_bic_swift VARCHAR(16) NOT NULL,
        account_number_masked VARCHAR(32) NOT NULL,
        currency VARCHAR(8) NOT NULL,
        account_type VARCHAR(64) NOT NULL,
        sweeping_type VARCHAR(64) NOT NULL,
        current_balance NUMERIC(16, 2) NOT NULL,
        current_balance_usd NUMERIC(16, 2) NOT NULL,
        target_balance_floor NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        target_balance_ceiling NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        bank_credit_rating VARCHAR(16) NOT NULL DEFAULT 'AA',
        insured_deposit_limit_usd NUMERIC(16, 2) NOT NULL DEFAULT 250000.00,
        is_zba_child BOOLEAN NOT NULL DEFAULT FALSE,
        parent_account_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS treasury_forecast_entries (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES treasury_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_index INT NOT NULL,
        week_starting_date DATE NOT NULL,
        customer_collections_usd NUMERIC(14, 2) NOT NULL,
        payroll_disbursements_usd NUMERIC(14, 2) NOT NULL,
        vendor_ap_disbursements_usd NUMERIC(14, 2) NOT NULL,
        tax_regulatory_usd NUMERIC(14, 2) NOT NULL,
        capex_debt_usd NUMERIC(14, 2) NOT NULL,
        net_weekly_cash_flow_usd NUMERIC(14, 2) NOT NULL,
        closing_cash_p10_usd NUMERIC(14, 2) NOT NULL,
        closing_cash_p50_usd NUMERIC(14, 2) NOT NULL,
        closing_cash_p90_usd NUMERIC(14, 2) NOT NULL,
        buffer_deficit_flag BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS treasury_fx_hedges (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES treasury_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contract_reference VARCHAR(64) NOT NULL,
        counterparty_bank_name VARCHAR(255) NOT NULL,
        currency_pair VARCHAR(16) NOT NULL,
        instrument_type VARCHAR(64) NOT NULL,
        notional_foreign NUMERIC(14, 2) NOT NULL,
        notional_usd NUMERIC(14, 2) NOT NULL,
        strike_rate NUMERIC(10, 6) NOT NULL,
        collar_ceiling_rate NUMERIC(10, 6),
        collar_floor_rate NUMERIC(10, 6),
        inception_date DATE NOT NULL,
        maturity_date DATE NOT NULL,
        mtm_gain_loss_usd NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        dollar_offset_ratio NUMERIC(6, 2) NOT NULL DEFAULT 100.00,
        accounting_status VARCHAR(64) NOT NULL DEFAULT 'asc815_highly_effective',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS treasury_counterparties (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES treasury_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bank_name VARCHAR(255) NOT NULL,
        holding_group VARCHAR(255) NOT NULL,
        jurisdiction VARCHAR(64) NOT NULL,
        sp_rating VARCHAR(16) NOT NULL,
        moodys_rating VARCHAR(16) NOT NULL,
        fitch_rating VARCHAR(16) NOT NULL,
        cds_spread_bps INT NOT NULL,
        implied_default_prob NUMERIC(6, 2) NOT NULL,
        lcr_percent INT NOT NULL,
        nsfr_percent INT NOT NULL,
        tier1_ratio NUMERIC(5, 2) NOT NULL,
        total_deposits_usd NUMERIC(16, 2) NOT NULL,
        portfolio_share_pct NUMERIC(5, 2) NOT NULL,
        board_approved_limit_usd NUMERIC(16, 2) NOT NULL,
        limit_utilization_pct NUMERIC(5, 2) NOT NULL,
        uninsured_deposits_usd NUMERIC(16, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS treasury_board_memorandums (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES treasury_nexus_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        memo_reference VARCHAR(64) NOT NULL,
        fiscal_quarter VARCHAR(16) NOT NULL,
        title VARCHAR(255) NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'draft',
        composite_trls_score NUMERIC(5, 2) NOT NULL,
        trls_band VARCHAR(64) NOT NULL,
        total_treasury_assets_usd NUMERIC(16, 2) NOT NULL,
        net_ccc_days NUMERIC(5, 2) NOT NULL,
        fx_1day_var95_usd NUMERIC(14, 2) NOT NULL,
        counterparty_safety_index NUMERIC(5, 2) NOT NULL,
        markdown_content TEXT NOT NULL,
        signoffs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tr_accounts_user ON treasury_bank_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_tr_forecast_user ON treasury_forecast_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_tr_hedges_user ON treasury_fx_hedges(user_id);
      CREATE INDEX IF NOT EXISTS idx_tr_counterparties_user ON treasury_counterparties(user_id);
      CREATE INDEX IF NOT EXISTS idx_tr_memos_user ON treasury_board_memorandums(user_id);
    `);
  }

  async ensureDefaults(userId: string): Promise<void> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      `SELECT id FROM treasury_nexus_studios WHERE user_id = $1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO treasury_nexus_studios (
        id, user_id, enterprise_name, composite_trls_score, trls_band, total_treasury_assets_usd
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [studioId, userId, 'JobTrack Enterprise Holdings', 89.40, 'defensible_stability', 48500000.00]
    );

    const defaultAccounts = [
      {
        id: crypto.randomUUID(),
        entityId: 'ent-1',
        entityName: 'JobTrack Holdings Inc. (Delaware)',
        bankName: 'JPMorgan Chase Bank, N.A.',
        bankBicSwift: 'CHASUS33XXX',
        accountNumberMasked: '•••• 8821',
        currency: 'USD',
        accountType: 'operating_disbursement',
        sweepingType: 'zero_balance_account',
        balance: 14200000,
        balanceUsd: 14200000,
        floor: 1000000,
        ceiling: 15000000,
        rating: 'AA_MINUS',
        insuredLimit: 250000,
        isZbaChild: true,
        parentAccount: 'acc-master-usd'
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-1',
        entityName: 'JobTrack Holdings Inc. (Delaware)',
        bankName: 'JPMorgan Chase Bank, N.A.',
        bankBicSwift: 'CHASUS33XXX',
        accountNumberMasked: '•••• 9102',
        currency: 'USD',
        accountType: 'master_concentration',
        sweepingType: 'physical_eod_sweep',
        balance: 18500000,
        balanceUsd: 18500000,
        floor: 5000000,
        ceiling: 25000000,
        rating: 'AA_MINUS',
        insuredLimit: 250000,
        isZbaChild: false
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-2',
        entityName: 'JobTrack Europe Treasury DAC (Ireland)',
        bankName: 'BNP Paribas SA',
        bankBicSwift: 'BNPAFRPPXXX',
        accountNumberMasked: '•••• 4419',
        currency: 'EUR',
        accountType: 'operating_disbursement',
        sweepingType: 'zero_balance_account',
        balance: 4800000,
        balanceUsd: 5208000,
        floor: 500000,
        ceiling: 6000000,
        rating: 'A_PLUS',
        insuredLimit: 108500,
        isZbaChild: true,
        parentAccount: 'acc-master-usd'
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-2',
        entityName: 'JobTrack Europe Treasury DAC (Ireland)',
        bankName: 'BNP Paribas SA',
        bankBicSwift: 'BNPAFRPPXXX',
        accountNumberMasked: '•••• 5520',
        currency: 'EUR',
        accountType: 'master_concentration',
        sweepingType: 'multi_currency_notional_pool',
        balance: 3500000,
        balanceUsd: 3797500,
        floor: 1000000,
        ceiling: 8000000,
        rating: 'A_PLUS',
        insuredLimit: 108500,
        isZbaChild: false
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-3',
        entityName: 'JobTrack UK Operations Ltd (London)',
        bankName: 'Barclays Bank PLC',
        bankBicSwift: 'BARCGB22XXX',
        accountNumberMasked: '•••• 6631',
        currency: 'GBP',
        accountType: 'operating_disbursement',
        sweepingType: 'zero_balance_account',
        balance: 2400000,
        balanceUsd: 3052800,
        floor: 250000,
        ceiling: 3500000,
        rating: 'A',
        insuredLimit: 108000,
        isZbaChild: true,
        parentAccount: 'acc-master-usd'
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-4',
        entityName: 'JobTrack Asia-Pacific Pte Ltd (Singapore)',
        bankName: 'DBS Bank Ltd',
        bankBicSwift: 'DBSSSGSGXXX',
        accountNumberMasked: '•••• 7712',
        currency: 'SGD',
        accountType: 'operating_disbursement',
        sweepingType: 'target_balance_account',
        balance: 2100000,
        balanceUsd: 1575000,
        floor: 200000,
        ceiling: 2500000,
        rating: 'AA_MINUS',
        insuredLimit: 75000,
        isZbaChild: false
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-6',
        entityName: 'JobTrack Japan KK (Tokyo)',
        bankName: 'Sumitomo Mitsui Banking Corp',
        bankBicSwift: 'SMBCJPJTXXX',
        accountNumberMasked: '•••• 3309',
        currency: 'JPY',
        accountType: 'operating_disbursement',
        sweepingType: 'zero_balance_account',
        balance: 180000000,
        balanceUsd: 1166700,
        floor: 20000000,
        ceiling: 250000000,
        rating: 'A_PLUS',
        insuredLimit: 65000,
        isZbaChild: true,
        parentAccount: 'acc-master-usd'
      },
      {
        id: crypto.randomUUID(),
        entityId: 'ent-1',
        entityName: 'JobTrack Holdings Inc. (Delaware)',
        bankName: 'Goldman Sachs Bank USA',
        bankBicSwift: 'GSUSUS33XXX',
        accountNumberMasked: '•••• 1120',
        currency: 'USD',
        accountType: 'liquidity_reserve_ladder',
        sweepingType: 'physical_eod_sweep',
        balance: 1000000,
        balanceUsd: 1000000,
        floor: 0,
        ceiling: 5000000,
        rating: 'A_PLUS',
        insuredLimit: 250000,
        isZbaChild: false
      }
    ];

    for (const a of defaultAccounts) {
      await this.pool.query(
        `INSERT INTO treasury_bank_accounts (
          id, studio_id, user_id, entity_id, entity_name, bank_name, bank_bic_swift,
          account_number_masked, currency, account_type, sweeping_type, current_balance,
          current_balance_usd, target_balance_floor, target_balance_ceiling,
          bank_credit_rating, insured_deposit_limit_usd, is_zba_child, parent_account_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          a.id, studioId, userId, a.entityId, a.entityName, a.bankName, a.bankBicSwift,
          a.accountNumberMasked, a.currency, a.accountType, a.sweepingType, a.balance,
          a.balanceUsd, a.floor, a.ceiling, a.rating, a.insuredLimit, a.isZbaChild, a.parentAccount || null
        ]
      );
    }

    const baseDate = new Date('2026-10-26T00:00:00Z');
    let runningCash = 48500000;
    for (let w = 1; w <= 13; w++) {
      const d = new Date(baseDate.getTime() + (w - 1) * 7 * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const collections = 3200000 + (w % 3) * 200000;
      const payroll = w % 2 === 0 ? 1800000 : 350000;
      const ap = 950000 + (w % 4) * 80000;
      const tax = w === 4 || w === 8 || w === 12 ? 650000 : 50000;
      const capex = 250000;
      const net = collections - (payroll + ap + tax + capex);
      runningCash += net;
      const p10 = runningCash * 0.94;
      const p50 = runningCash;
      const p90 = runningCash * 1.05;

      await this.pool.query(
        `INSERT INTO treasury_forecast_entries (
          id, studio_id, user_id, week_index, week_starting_date, customer_collections_usd,
          payroll_disbursements_usd, vendor_ap_disbursements_usd, tax_regulatory_usd,
          capex_debt_usd, net_weekly_cash_flow_usd, closing_cash_p10_usd, closing_cash_p50_usd,
          closing_cash_p90_usd, buffer_deficit_flag
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          crypto.randomUUID(), studioId, userId, w, dateStr, collections,
          payroll, ap, tax, capex, net, p10, p50, p90, false
        ]
      );
    }

    const defaultHedges = [
      {
        id: crypto.randomUUID(),
        ref: 'HEDGE-FWD-EUR-01',
        bank: 'BNP Paribas SA',
        pair: 'EUR/USD',
        type: 'fx_forward',
        foreign: 6000000,
        usd: 6510000,
        strike: 1.0850,
        maturity: '2026-12-18',
        mtm: 45000,
        ratio: 98.4,
        status: 'asc815_highly_effective'
      },
      {
        id: crypto.randomUUID(),
        ref: 'HEDGE-FWD-GBP-01',
        bank: 'Barclays Bank PLC',
        pair: 'GBP/USD',
        type: 'fx_forward',
        foreign: 3300000,
        usd: 4197600,
        strike: 1.2720,
        maturity: '2026-11-27',
        mtm: -12000,
        ratio: 96.8,
        status: 'asc815_highly_effective'
      },
      {
        id: crypto.randomUUID(),
        ref: 'HEDGE-COL-JPY-01',
        bank: 'Sumitomo Mitsui Banking Corp',
        pair: 'USD/JPY',
        type: 'fx_zero_cost_collar',
        foreign: 450000000,
        usd: 2916667,
        strike: 154.28,
        ceiling: 157.00,
        floor: 150.50,
        maturity: '2027-01-29',
        mtm: 18500,
        ratio: 102.1,
        status: 'asc815_highly_effective'
      },
      {
        id: crypto.randomUUID(),
        ref: 'HEDGE-CCS-EUR-01',
        bank: 'JPMorgan Chase Bank, N.A.',
        pair: 'EUR/USD',
        type: 'cross_currency_swap',
        foreign: 2100000,
        usd: 2291100,
        strike: 1.0910,
        maturity: '2027-06-30',
        mtm: -9000,
        ratio: 88.5,
        status: 'asc815_retrospective_pass'
      }
    ];

    for (const h of defaultHedges) {
      await this.pool.query(
        `INSERT INTO treasury_fx_hedges (
          id, studio_id, user_id, contract_reference, counterparty_bank_name,
          currency_pair, instrument_type, notional_foreign, notional_usd,
          strike_rate, collar_ceiling_rate, collar_floor_rate, inception_date,
          maturity_date, mtm_gain_loss_usd, dollar_offset_ratio, accounting_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          h.id, studioId, userId, h.ref, h.bank, h.pair, h.type, h.foreign, h.usd,
          h.strike, h.ceiling || null, h.floor || null, '2026-10-01', h.maturity,
          h.mtm, h.ratio, h.status
        ]
      );
    }

    const defaultCounterparties = [
      {
        id: crypto.randomUUID(),
        name: 'JPMorgan Chase & Co.',
        group: 'JPMorgan Chase',
        jurisdiction: 'United States',
        sp: 'AA_MINUS',
        moody: 'AA',
        fitch: 'AA_MINUS',
        cds: 52,
        pd: 0.86,
        lcr: 142,
        nsfr: 126,
        tier1: 15.2,
        deposits: 14200000,
        share: 29.3,
        limit: 15000000,
        util: 94.7,
        uninsured: 13950000
      },
      {
        id: crypto.randomUUID(),
        name: 'BNP Paribas SA',
        group: 'BNP Paribas',
        jurisdiction: 'France / European Union',
        sp: 'A_PLUS',
        moody: 'AA_MINUS',
        fitch: 'A_PLUS',
        cds: 68,
        pd: 1.13,
        lcr: 136,
        nsfr: 121,
        tier1: 13.8,
        deposits: 9005500,
        share: 18.6,
        limit: 12000000,
        util: 75.0,
        uninsured: 8788500
      },
      {
        id: crypto.randomUUID(),
        name: 'Barclays PLC',
        group: 'Barclays',
        jurisdiction: 'United Kingdom',
        sp: 'A',
        moody: 'A_PLUS',
        fitch: 'A_PLUS',
        cds: 74,
        pd: 1.23,
        lcr: 138,
        nsfr: 124,
        tier1: 13.5,
        deposits: 3052800,
        share: 6.3,
        limit: 8000000,
        util: 38.2,
        uninsured: 2944800
      },
      {
        id: crypto.randomUUID(),
        name: 'Goldman Sachs Group, Inc.',
        group: 'Goldman Sachs',
        jurisdiction: 'United States',
        sp: 'A_PLUS',
        moody: 'A',
        fitch: 'A_PLUS',
        cds: 62,
        pd: 1.03,
        lcr: 140,
        nsfr: 128,
        tier1: 14.9,
        deposits: 1000000,
        share: 2.1,
        limit: 10000000,
        util: 10.0,
        uninsured: 750000
      }
    ];

    for (const c of defaultCounterparties) {
      await this.pool.query(
        `INSERT INTO treasury_counterparties (
          id, studio_id, user_id, bank_name, holding_group, jurisdiction,
          sp_rating, moodys_rating, fitch_rating, cds_spread_bps,
          implied_default_prob, lcr_percent, nsfr_percent, tier1_ratio,
          total_deposits_usd, portfolio_share_pct, board_approved_limit_usd,
          limit_utilization_pct, uninsured_deposits_usd
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [
          c.id, studioId, userId, c.name, c.group, c.jurisdiction,
          c.sp, c.moody, c.fitch, c.cds, c.pd, c.lcr, c.nsfr, c.tier1,
          c.deposits, c.share, c.limit, c.util, c.uninsured
        ]
      );
    }
  }

  async getOverview(userId: string): Promise<CorporateTreasuryOverviewDTO> {
    await this.ensureDefaults(userId);

    const studioRes = await this.pool.query(
      `SELECT * FROM treasury_nexus_studios WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const studio = studioRes.rows[0];

    const accountsRes = await this.pool.query(
      `SELECT * FROM treasury_bank_accounts WHERE user_id = $1 ORDER BY current_balance_usd DESC`,
      [userId]
    );
    const accounts: TreasuryBankAccountDTO[] = accountsRes.rows.map(r => ({
      id: r.id,
      entityId: r.entity_id,
      entityName: r.entity_name,
      bankName: r.bank_name,
      bankBicSwift: r.bank_bic_swift,
      accountNumberMasked: r.account_number_masked,
      currency: r.currency,
      accountType: r.account_type,
      sweepingType: r.sweeping_type,
      currentBalance: parseFloat(r.current_balance),
      currentBalanceUsd: parseFloat(r.current_balance_usd),
      targetBalanceFloor: parseFloat(r.target_balance_floor),
      targetBalanceCeiling: parseFloat(r.target_balance_ceiling),
      bankCreditRating: r.bank_credit_rating,
      insuredDepositLimitUsd: parseFloat(r.insured_deposit_limit_usd),
      isZbaChild: r.is_zba_child,
      parentAccountId: r.parent_account_id || undefined
    }));

    const entities: TreasuryEntityDTO[] = [
      {
        id: 'ent-1',
        legalEntityName: 'JobTrack Holdings Inc.',
        jurisdiction: 'United States (Delaware)',
        functionalCurrency: 'USD',
        entityRole: 'parent_holding',
        intercompanyCreditLimitUsd: 25000000,
        currentIntercompanyBalanceUsd: 0,
        armLengthInterestRatePercent: 5.35,
        withholdingTaxRatePercent: 0.0
      },
      {
        id: 'ent-2',
        legalEntityName: 'JobTrack Europe Treasury DAC',
        jurisdiction: 'Ireland (Dublin)',
        functionalCurrency: 'EUR',
        entityRole: 'regional_treasury_hub',
        intercompanyCreditLimitUsd: 15000000,
        currentIntercompanyBalanceUsd: 4200000,
        armLengthInterestRatePercent: 4.85,
        withholdingTaxRatePercent: 0.0
      },
      {
        id: 'ent-3',
        legalEntityName: 'JobTrack UK Operations Ltd',
        jurisdiction: 'United Kingdom (London)',
        functionalCurrency: 'GBP',
        entityRole: 'operating_subsidiary',
        intercompanyCreditLimitUsd: 8000000,
        currentIntercompanyBalanceUsd: 1800000,
        armLengthInterestRatePercent: 5.10,
        withholdingTaxRatePercent: 0.0
      },
      {
        id: 'ent-4',
        legalEntityName: 'JobTrack Asia-Pacific Pte Ltd',
        jurisdiction: 'Singapore',
        functionalCurrency: 'SGD',
        entityRole: 'operating_subsidiary',
        intercompanyCreditLimitUsd: 5000000,
        currentIntercompanyBalanceUsd: 950000,
        armLengthInterestRatePercent: 4.60,
        withholdingTaxRatePercent: 10.0
      },
      {
        id: 'ent-5',
        legalEntityName: 'JobTrack Brasil Tecnologia Ltda',
        jurisdiction: 'Brazil (Sao Paulo)',
        functionalCurrency: 'BRL',
        entityRole: 'operating_subsidiary',
        intercompanyCreditLimitUsd: 2000000,
        currentIntercompanyBalanceUsd: 450000,
        armLengthInterestRatePercent: 11.25,
        withholdingTaxRatePercent: 15.0
      },
      {
        id: 'ent-6',
        legalEntityName: 'JobTrack Japan KK',
        jurisdiction: 'Japan (Tokyo)',
        functionalCurrency: 'JPY',
        entityRole: 'operating_subsidiary',
        intercompanyCreditLimitUsd: 4000000,
        currentIntercompanyBalanceUsd: 650000,
        armLengthInterestRatePercent: 1.85,
        withholdingTaxRatePercent: 10.0
      }
    ];

    const totalGlobalLiquidityUsd = accounts.reduce((acc, cur) => acc + cur.currentBalanceUsd, 0);
    const activeZbaCount = accounts.filter(a => a.sweepingType === 'zero_balance_account').length;
    const activeNotionalPoolCount = accounts.filter(a => a.sweepingType === 'multi_currency_notional_pool').length;

    const forecastRes = await this.pool.query(
      `SELECT * FROM treasury_forecast_entries WHERE user_id = $1 ORDER BY week_index ASC`,
      [userId]
    );
    const weeklyForecasts: WeeklyCashForecastItemDTO[] = forecastRes.rows.map(r => ({
      weekIndex: r.week_index,
      weekStartingDate: r.week_starting_date.toISOString().split('T')[0],
      projectedCustomerCollectionsUsd: parseFloat(r.customer_collections_usd),
      projectedPayrollDisbursementsUsd: parseFloat(r.payroll_disbursements_usd),
      projectedVendorApDisbursementsUsd: parseFloat(r.vendor_ap_disbursements_usd),
      projectedTaxAndRegulatoryUsd: parseFloat(r.tax_regulatory_usd),
      projectedCapExAndDebtServiceUsd: parseFloat(r.capex_debt_usd),
      netWeeklyCashFlowUsd: parseFloat(r.net_weekly_cash_flow_usd),
      closingCashP10DownsideUsd: parseFloat(r.closing_cash_p10_usd),
      closingCashP50BaselineUsd: parseFloat(r.closing_cash_p50_usd),
      closingCashP90UpsideUsd: parseFloat(r.closing_cash_p90_usd),
      bufferDeficitFlag: r.buffer_deficit_flag
    }));

    const hedgesRes = await this.pool.query(
      `SELECT * FROM treasury_fx_hedges WHERE user_id = $1 ORDER BY maturity_date ASC`,
      [userId]
    );
    const contracts: FxHedgeContractDTO[] = hedgesRes.rows.map(r => ({
      id: r.id,
      contractReference: r.contract_reference,
      counterpartyBankName: r.counterparty_bank_name,
      currencyPair: r.currency_pair,
      instrumentType: r.instrument_type,
      notionalAmountForeign: parseFloat(r.notional_foreign),
      notionalAmountUsd: parseFloat(r.notional_usd),
      strikeRate: parseFloat(r.strike_rate),
      collarCeilingRate: r.collar_ceiling_rate ? parseFloat(r.collar_ceiling_rate) : undefined,
      collarFloorRate: r.collar_floor_rate ? parseFloat(r.collar_floor_rate) : undefined,
      inceptionDate: r.inception_date.toISOString().split('T')[0],
      maturityDate: r.maturity_date.toISOString().split('T')[0],
      markToMarketGainLossUsd: parseFloat(r.mtm_gain_loss_usd),
      dollarOffsetRatioPercent: parseFloat(r.dollar_offset_ratio),
      accountingStatus: r.accounting_status
    }));

    const exposures: FxExposureItemDTO[] = [
      {
        id: 'exp-1',
        currencyPair: 'EUR/USD',
        exposureType: 'transactional',
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        grossExposureTargetCurrency: 7500000,
        grossExposureUsd: 8137500,
        hedgedNotionalUsd: 6510000,
        netUnhedgedExposureUsd: 1627500,
        hedgeRatioPercent: 80.0,
        currentSpotRate: 1.0850,
        stressShockMinus10PctUsd: -162750,
        stressShockPlus10PctUsd: 162750
      },
      {
        id: 'exp-2',
        currencyPair: 'GBP/USD',
        exposureType: 'transactional',
        baseCurrency: 'USD',
        targetCurrency: 'GBP',
        grossExposureTargetCurrency: 3800000,
        grossExposureUsd: 4833600,
        hedgedNotionalUsd: 4197600,
        netUnhedgedExposureUsd: 636000,
        hedgeRatioPercent: 86.8,
        currentSpotRate: 1.2720,
        stressShockMinus10PctUsd: -63600,
        stressShockPlus10PctUsd: 63600
      },
      {
        id: 'exp-3',
        currencyPair: 'USD/JPY',
        exposureType: 'transactional',
        baseCurrency: 'USD',
        targetCurrency: 'JPY',
        grossExposureTargetCurrency: 520000000,
        grossExposureUsd: 3370058,
        hedgedNotionalUsd: 2916667,
        netUnhedgedExposureUsd: 453391,
        hedgeRatioPercent: 86.5,
        currentSpotRate: 154.30,
        stressShockMinus10PctUsd: -45339,
        stressShockPlus10PctUsd: 45339
      },
      {
        id: 'exp-4',
        currencyPair: 'EUR/USD',
        exposureType: 'translational',
        baseCurrency: 'USD',
        targetCurrency: 'EUR',
        grossExposureTargetCurrency: 2400000,
        grossExposureUsd: 2604000,
        hedgedNotionalUsd: 2291100,
        netUnhedgedExposureUsd: 312900,
        hedgeRatioPercent: 88.0,
        currentSpotRate: 1.0850,
        stressShockMinus10PctUsd: -31290,
        stressShockPlus10PctUsd: 31290
      }
    ];

    const counterpartiesRes = await this.pool.query(
      `SELECT * FROM treasury_counterparties WHERE user_id = $1 ORDER BY total_deposits_usd DESC`,
      [userId]
    );
    const counterparties: BankCounterpartyDTO[] = counterpartiesRes.rows.map(r => ({
      id: r.id,
      bankName: r.bank_name,
      holdingGroup: r.holding_group,
      jurisdiction: r.jurisdiction,
      spRating: r.sp_rating,
      moodysRating: r.moodys_rating,
      fitchRating: r.fitch_rating,
      fiveYearCdsSpreadBps: r.cds_spread_bps,
      impliedDefaultProbabilityPercent: parseFloat(r.implied_default_prob),
      baselLiquidityCoverageRatioPercent: r.lcr_percent,
      baselNetStableFundingRatioPercent: r.nsfr_percent,
      tier1CommonEquityRatioPercent: parseFloat(r.tier1_ratio),
      totalDepositsHeldUsd: parseFloat(r.total_deposits_usd),
      portfolioDepositorySharePercent: parseFloat(r.portfolio_share_pct),
      boardApprovedExposureLimitUsd: parseFloat(r.board_approved_limit_usd),
      limitUtilizationPercent: parseFloat(r.limit_utilization_pct),
      uninsuredDepositsUsd: parseFloat(r.uninsured_deposits_usd),
      simulatedHaircutLossUsd: 0
    }));

    const memoRes = await this.pool.query(
      `SELECT * FROM treasury_board_memorandums WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    let latestBoardMemo: TreasuryBoardMemorandumDTO | undefined;
    if (memoRes.rows.length > 0) {
      const mr = memoRes.rows[0];
      latestBoardMemo = {
        id: mr.id,
        memoReference: mr.memo_reference,
        fiscalQuarter: mr.fiscal_quarter,
        title: mr.title,
        status: mr.status,
        compositeTrlsScore: parseFloat(mr.composite_trls_score),
        trlsBand: mr.trls_band,
        totalTreasuryAssetsUsd: parseFloat(mr.total_treasury_assets_usd),
        netCashConversionCycleDays: parseFloat(mr.net_ccc_days),
        fx1DayVaR95Usd: parseFloat(mr.fx_1day_var95_usd),
        counterpartySafetyIndex: parseFloat(mr.counterparty_safety_index),
        generatedMarkdownContent: mr.markdown_content,
        createdAt: mr.created_at.toISOString(),
        updatedAt: mr.updated_at.toISOString(),
        signoffs: mr.signoffs_json || []
      };
    }

    const totalNetExposureUsd = exposures.reduce((acc, cur) => acc + cur.grossExposureUsd, 0);
    const totalHedgedNotionalUsd = exposures.reduce((acc, cur) => acc + cur.hedgedNotionalUsd, 0);
    const weightedHedgeRatioPercent = Math.round((totalHedgedNotionalUsd / totalNetExposureUsd) * 1000) / 10;
    const { var1Day95Usd, var10Day99Usd } = calculateParametricFxVaR95(totalNetExposureUsd - totalHedgedNotionalUsd, 0.0075, 10);
    const unrealizedMtmGainLossUsd = contracts.reduce((acc, cur) => acc + cur.markToMarketGainLossUsd, 0);

    const totalUninsuredDepositsUsd = counterparties.reduce((acc, cur) => acc + cur.uninsuredDepositsUsd, 0);
    const maxSingleBankExposurePercent = counterparties.reduce((max, c) => Math.max(max, c.portfolioDepositorySharePercent), 0);
    const limitBreachCount = counterparties.filter(c => c.limitUtilizationPercent > 100).length;

    const cccResult = calculateCashConversionCycle(18, 38, 45);

    return {
      studioId: studio.id,
      enterpriseName: studio.enterprise_name,
      lastUpdated: studio.updated_at.toISOString(),
      compositeTrlsScore: parseFloat(studio.composite_trls_score),
      trlsBand: studio.trls_band,
      cashConcentration: {
        totalGlobalLiquidityUsd,
        pooledNetBalanceUsd: 32000000,
        physicalSweptTodayUsd: 6200000,
        annualizedPoolingYieldArbitrageUsd: 142500,
        activeZbaCount,
        activeNotionalPoolCount,
        accounts,
        entities
      },
      cashForecast: {
        forecastWeeksCount: weeklyForecasts.length,
        forecastAccuracyScorePercent: 95.8,
        minimumProjectedRunwayMonths: 11.2,
        minimumOperationalBufferUsd: 8500000,
        precautionaryReserveUsd: 12000000,
        totalExcessDeployableLiquidityUsd: 28000000,
        workingCapitalCycle: {
          daysSalesOutstanding: 38,
          daysInventoryOutstanding: 18,
          daysPayableOutstanding: 45,
          netCashConversionCycleDays: cccResult.netCcc,
          targetCashConversionCycleDays: 15,
          capitalTiedUpInWorkingCapitalUsd: 4200000,
          potentialInterestReleaseUsd: 185000
        },
        weeklyForecasts
      },
      fxHedging: {
        totalNetExposureUsd,
        totalHedgedNotionalUsd,
        weightedHedgeRatioPercent,
        portfolio1DayVaR95Usd: var1Day95Usd,
        portfolio10DayVaR99Usd: var10Day99Usd,
        unrealizedMtmGainLossUsd,
        exposures,
        contracts
      },
      counterpartyRisk: {
        weightedAverageRating: 'AA_MINUS',
        totalUninsuredDepositsUsd,
        maxSingleBankExposurePercent,
        limitBreachCount,
        counterparties
      },
      latestBoardMemo
    };
  }

  async executeCashSweep(userId: string, _req: ExecuteCashSweepRequestDTO): Promise<CashSweepExecutionResultDTO> {
    await this.ensureDefaults(userId);
    const zbaRes = await this.pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(current_balance_usd), 0) as total FROM treasury_bank_accounts
       WHERE user_id = $1 AND sweeping_type = 'zero_balance_account'`,
      [userId]
    );
    const sweptCount = parseInt(zbaRes.rows[0].count, 10);
    const sweptTotal = parseFloat(zbaRes.rows[0].total);

    const loanAccrual = calculateIntercompanyLoanInterest(sweptTotal, 5.25, 1, 0.0);
    const arbitrage = calculateNotionalPoolArbitrage(28000000, 6000000, 3.5, 7.0, 4.6);

    return {
      sweptAccountsCount: sweptCount,
      totalAmountSweptUsd: sweptTotal,
      annualizedArbitrageUsd: arbitrage.annualizedArbitrageUsd,
      intercompanyLoanInterestAccruedUsd: loanAccrual.grossInterestUsd,
      executedAt: new Date().toISOString(),
      summary: `Automated physical cash concentration completed across ${sweptCount} ZBA accounts. Net interest arbitrage optimization active.`
    };
  }

  async simulateWorkingCapital(userId: string, req: WorkingCapitalSimulationRequestDTO): Promise<WorkingCapitalSimulationResultDTO> {
    await this.ensureDefaults(userId);
    const dio = req.adjustedDio ?? 18;
    const previous = calculateCashConversionCycle(18, 38, 45);
    const revised = calculateCashConversionCycle(dio, req.adjustedDso, req.adjustedDpo);
    const improvementDays = previous.netCcc - revised.netCcc;
    const dailyOpCost = 280000;
    const freedCapital = Math.max(0, Math.round(improvementDays * dailyOpCost));
    const annualInterestSaved = Math.round(freedCapital * 0.051);
    const currentRunway = 11.2;
    const revisedRunway = Math.round((currentRunway + (freedCapital / 4200000)) * 10) / 10;

    return {
      previousCccDays: previous.netCcc,
      revisedCccDays: revised.netCcc,
      daysImprovement: Math.round(improvementDays * 10) / 10,
      freedWorkingCapitalUsd: freedCapital,
      annualInterestSavedUsd: annualInterestSaved,
      status: revised.status,
      runwayMonths: revisedRunway
    };
  }

  async simulateFxSensitivity(userId: string, req: FxSensitivitySimulationRequestDTO): Promise<FxSensitivitySimulationResultDTO> {
    await this.ensureDefaults(userId);
    const grossNotional = 8137500;
    const coverage = req.hedgingCoverageAdjustmentPercent / 100;
    const hedgedNotional = grossNotional * coverage;
    const netUnhedged = grossNotional - hedgedNotional;
    const shockDecimal = req.shockPercentage / 100;

    const unhedgedImpact = Math.round(grossNotional * shockDecimal);
    const hedgedImpact = Math.round(netUnhedged * shockDecimal);
    const varianceReduction = Math.round(Math.abs(unhedgedImpact) - Math.abs(hedgedImpact));

    const varCalc = calculateParametricFxVaR95(netUnhedged, 0.0082, req.holdingPeriodDays);
    const historicalVaR = Math.round(varCalc.var1Day95Usd * 1.08);
    const effectiveness = calculateHedgeEffectivenessRatio(Math.abs(unhedgedImpact - hedgedImpact), Math.abs(unhedgedImpact));

    return {
      currencyPair: req.currencyPair,
      shockPercentage: req.shockPercentage,
      unhedgedPnlImpactUsd: unhedgedImpact,
      hedgedPnlImpactUsd: hedgedImpact,
      netVarianceReductionUsd: varianceReduction,
      parametricVaRUsd: varCalc.var1Day95Usd,
      historicalVaRUsd: historicalVaR,
      asc815CompliancePreserved: effectiveness.isAsc815Compliant,
      projectedDollarOffsetRatio: effectiveness.dollarOffsetRatioPercent
    };
  }

  async simulateBailInStress(userId: string, req: BailInStressTestRequestDTO): Promise<BailInStressTestResultDTO> {
    await this.ensureDefaults(userId);
    const counterpartyRes = await this.pool.query(
      `SELECT * FROM treasury_counterparties WHERE user_id = $1 AND id = $2 LIMIT 1`,
      [userId, req.stressedBankId]
    );
    if (counterpartyRes.rows.length === 0) {
      throw new Error(`Bank counterparty not found: ${req.stressedBankId}`);
    }
    const r = counterpartyRes.rows[0];
    const bankDto: BankCounterpartyDTO = {
      id: r.id,
      bankName: r.bank_name,
      holdingGroup: r.holding_group,
      jurisdiction: r.jurisdiction,
      spRating: r.sp_rating,
      moodysRating: r.moodys_rating,
      fitchRating: r.fitch_rating,
      fiveYearCdsSpreadBps: r.cds_spread_bps,
      impliedDefaultProbabilityPercent: parseFloat(r.implied_default_prob),
      baselLiquidityCoverageRatioPercent: r.lcr_percent,
      baselNetStableFundingRatioPercent: r.nsfr_percent,
      tier1CommonEquityRatioPercent: parseFloat(r.tier1_ratio),
      totalDepositsHeldUsd: parseFloat(r.total_deposits_usd),
      portfolioDepositorySharePercent: parseFloat(r.portfolio_share_pct),
      boardApprovedExposureLimitUsd: parseFloat(r.board_approved_limit_usd),
      limitUtilizationPercent: parseFloat(r.limit_utilization_pct),
      uninsuredDepositsUsd: parseFloat(r.uninsured_deposits_usd),
      simulatedHaircutLossUsd: 0
    };

    return simulateBankBailInHaircut(bankDto, req.haircutLossPercentage);
  }

  async generateBoardMemo(userId: string, req: GenerateTreasuryBoardMemoRequestDTO): Promise<TreasuryBoardMemorandumDTO> {
    const overview = await this.getOverview(userId);
    const memoId = crypto.randomUUID();
    const memoRef = `MEMO-TR-${req.fiscalQuarter}-${new Date().toISOString().split('T')[0]}`;
    const md = generateTreasuryBoardMemorandumMarkdown(overview, req);

    await this.pool.query(
      `INSERT INTO treasury_board_memorandums (
        id, studio_id, user_id, memo_reference, fiscal_quarter, title, status,
        composite_trls_score, trls_band, total_treasury_assets_usd, net_ccc_days,
        fx_1day_var95_usd, counterparty_safety_index, markdown_content, signoffs_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        memoId, overview.studioId, userId, memoRef, req.fiscalQuarter, req.title,
        'draft', overview.compositeTrlsScore, overview.trlsBand,
        overview.cashConcentration.totalGlobalLiquidityUsd,
        overview.cashForecast.workingCapitalCycle.netCashConversionCycleDays,
        overview.fxHedging.portfolio1DayVaR95Usd, 94.5, md, JSON.stringify([])
      ]
    );

    return {
      id: memoId,
      memoReference: memoRef,
      fiscalQuarter: req.fiscalQuarter,
      title: req.title,
      status: 'draft',
      compositeTrlsScore: overview.compositeTrlsScore,
      trlsBand: overview.trlsBand,
      totalTreasuryAssetsUsd: overview.cashConcentration.totalGlobalLiquidityUsd,
      netCashConversionCycleDays: overview.cashForecast.workingCapitalCycle.netCashConversionCycleDays,
      fx1DayVaR95Usd: overview.fxHedging.portfolio1DayVaR95Usd,
      counterpartySafetyIndex: 94.5,
      generatedMarkdownContent: md,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signoffs: []
    };
  }

  async signoffBoardMemo(userId: string, memoId: string, req: SignoffTreasuryBoardMemoRequestDTO): Promise<TreasuryBoardMemorandumDTO> {
    await this.ensureSchema();
    const memoRes = await this.pool.query(
      `SELECT * FROM treasury_board_memorandums WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [memoId, userId]
    );
    if (memoRes.rows.length === 0) {
      throw new Error(`Treasury board memorandum not found: ${memoId}`);
    }
    const r = memoRes.rows[0];
    const existingSignoffs: TreasuryBoardSignoffDTO[] = Array.isArray(r.signoffs_json)
      ? r.signoffs_json
      : JSON.parse(r.signoffs_json || '[]');

    const newSignoff: TreasuryBoardSignoffDTO = {
      role: req.role,
      signedBy: req.signerName,
      signedAt: new Date().toISOString(),
      signatureToken: `SIG-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      commentsSummary: req.comments
    };

    const updatedSignoffs = [...existingSignoffs.filter(s => s.role !== req.role), newSignoff];
    let nextStatus = r.status;
    if (req.role === 'corporate_treasurer') {
      nextStatus = 'treasurer_certified';
    } else if (req.role === 'chief_financial_officer') {
      nextStatus = 'cfo_approved';
    } else if (req.role === 'board_audit_finance_chair') {
      nextStatus = 'board_ratified';
    }

    await this.pool.query(
      `UPDATE treasury_board_memorandums
       SET status = $1, signoffs_json = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4`,
      [nextStatus, JSON.stringify(updatedSignoffs), memoId, userId]
    );

    return {
      id: r.id,
      memoReference: r.memo_reference,
      fiscalQuarter: r.fiscal_quarter,
      title: r.title,
      status: nextStatus,
      compositeTrlsScore: parseFloat(r.composite_trls_score),
      trlsBand: r.trls_band,
      totalTreasuryAssetsUsd: parseFloat(r.total_treasury_assets_usd),
      netCashConversionCycleDays: parseFloat(r.net_ccc_days),
      fx1DayVaR95Usd: parseFloat(r.fx_1day_var95_usd),
      counterpartySafetyIndex: parseFloat(r.counterparty_safety_index),
      generatedMarkdownContent: r.markdown_content,
      createdAt: r.created_at.toISOString(),
      updatedAt: new Date().toISOString(),
      signoffs: updatedSignoffs
    };
  }
}
