import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type LegalEntityJurisdiction,
  type LegalEntityType,
  type EntityGoodStandingStatus,
  type IPAssetType,
  type PatentOfficeJurisdiction,
  type PatentProsecutionStatus,
  type PPHStatus,
  type CommercialContractType,
  type LiabilityCapType,
  type GoverningLawJurisdiction,
  type DisputeResolutionForum,
  type LitigationForumType,
  type ASC450ContingencyClassification,
  type CustodianHoldStatus,
  type LegalSignoffRole,
  type LegalBoardMemoStatus,
  type StatutoryRegisterRecordDTO,
  type StatutoryFilingDeadlineDTO,
  type LegalEntityDTO,
  type PatentDocketMilestoneDTO,
  type IPAssetDTO,
  type MaterialContractDTO,
  type CustodianAcknowledgmentRecordDTO,
  type CustodianLegalHoldDTO,
  type OutsideCounselInvoiceDTO,
  type LitigationMatterDTO,
  type DigitalExecutiveSignatureDTO,
  type LegalBoardMemorandumDTO,
  type LegalOperationsOverviewDTO,
  type PqdiCalculationParams,
  type CrdiCalculationParams,
  type Asc450ReserveAssessmentParams,
  type LrciCalculationParams,
  calculatePQDI,
  calculateCRDI,
  assessASC450Contingency,
  calculateLRCI,
  generateSecItem103Disclosure
} from '@jobtrack/contract';

export class LegalOperationsNexusService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS legal_operations_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_name VARCHAR(255) NOT NULL DEFAULT 'JobTrack Global Enterprise Technologies Inc.',
        lrci_score NUMERIC(5, 2) NOT NULL DEFAULT 22.40,
        lrci_band VARCHAR(64) NOT NULL DEFAULT 'SOVEREIGN_FORTRESS',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_legal_ops_studio_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS legal_entities (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        studio_id UUID NOT NULL REFERENCES legal_operations_studios(id) ON DELETE CASCADE,
        legal_name VARCHAR(255) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        jurisdiction VARCHAR(64) NOT NULL,
        registration_number VARCHAR(128) NOT NULL,
        incorporation_date DATE NOT NULL,
        status VARCHAR(64) NOT NULL DEFAULT 'GOOD_STANDING',
        registered_agent VARCHAR(255) NOT NULL,
        principal_office_address TEXT NOT NULL,
        tax_identification_number VARCHAR(128) NOT NULL,
        intercompany_agreement_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS statutory_filings (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
        filing_title VARCHAR(255) NOT NULL,
        filing_authority VARCHAR(128) NOT NULL,
        statutory_deadline DATE NOT NULL,
        filing_status VARCHAR(64) NOT NULL DEFAULT 'UPCOMING',
        penalty_exposure_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        completed_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS statutory_registers (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
        register_type VARCHAR(64) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        nationality_or_jurisdiction VARCHAR(128) NOT NULL,
        appointment_date DATE NOT NULL,
        resignation_date DATE,
        ownership_percentage NUMERIC(5, 2),
        voting_rights_percentage NUMERIC(5, 2),
        is_sanction_screened BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS intellectual_property_assets (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
        ip_type VARCHAR(64) NOT NULL,
        title VARCHAR(512) NOT NULL,
        registration_or_app_number VARCHAR(128) NOT NULL,
        office VARCHAR(32) NOT NULL,
        filing_date DATE NOT NULL,
        grant_date DATE,
        expiration_date DATE NOT NULL,
        status VARCHAR(64) NOT NULL,
        pph_status VARCHAR(64) NOT NULL DEFAULT 'NOT_APPLICABLE',
        claims_count INT NOT NULL DEFAULT 20,
        independent_claims_count INT NOT NULL DEFAULT 3,
        forward_citations_count INT NOT NULL DEFAULT 0,
        backward_citations_count INT NOT NULL DEFAULT 0,
        office_actions_count INT NOT NULL DEFAULT 0,
        rce_filings_count INT NOT NULL DEFAULT 0,
        statutory_extensions_count INT NOT NULL DEFAULT 0,
        foreign_family_count INT NOT NULL DEFAULT 1,
        pqdi_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patent_docket_milestones (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        asset_id UUID NOT NULL REFERENCES intellectual_property_assets(id) ON DELETE CASCADE,
        milestone_title VARCHAR(255) NOT NULL,
        action_code VARCHAR(64) NOT NULL,
        issuance_date DATE NOT NULL,
        statutory_due_date DATE NOT NULL,
        extension_available_months INT NOT NULL DEFAULT 3,
        is_completed BOOLEAN NOT NULL DEFAULT FALSE,
        completion_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS material_commercial_contracts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
        title VARCHAR(512) NOT NULL,
        counterparty_legal_name VARCHAR(255) NOT NULL,
        contract_type VARCHAR(64) NOT NULL,
        effective_date DATE NOT NULL,
        expiration_date DATE NOT NULL,
        annual_contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        total_contract_value NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        liability_cap_type VARCHAR(64) NOT NULL,
        liability_cap_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        has_uncapped_indemnity BOOLEAN NOT NULL DEFAULT FALSE,
        governing_law VARCHAR(64) NOT NULL,
        dispute_forum VARCHAR(64) NOT NULL,
        has_mfn_clause BOOLEAN NOT NULL DEFAULT FALSE,
        has_exclusivity_or_non_compete BOOLEAN NOT NULL DEFAULT FALSE,
        auto_renewal_notice_days INT NOT NULL DEFAULT 30,
        renewal_notice_deadline DATE NOT NULL,
        termination_for_convenience_notice_days INT NOT NULL DEFAULT 30,
        crdi_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        contract_status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS litigation_matters (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        entity_id UUID NOT NULL REFERENCES legal_entities(id) ON DELETE CASCADE,
        case_caption VARCHAR(512) NOT NULL,
        docket_number VARCHAR(128) NOT NULL,
        tribunal VARCHAR(64) NOT NULL,
        filing_date DATE NOT NULL,
        lead_outside_counsel_firm VARCHAR(255) NOT NULL,
        opposing_party VARCHAR(255) NOT NULL,
        claims_summary TEXT NOT NULL,
        relief_claimed_amount_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        asc450_classification VARCHAR(64) NOT NULL DEFAULT 'REASONABLY_POSSIBLE',
        accrued_reserve_amount_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        estimated_loss_range_min_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        estimated_loss_range_max_usd NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
        matter_status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custodian_legal_holds (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matter_id UUID NOT NULL REFERENCES litigation_matters(id) ON DELETE CASCADE,
        hold_title VARCHAR(255) NOT NULL,
        scope_description TEXT NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(64) NOT NULL DEFAULT 'ACTIVE_ISSUED',
        total_custodians_count INT NOT NULL DEFAULT 0,
        acknowledged_count INT NOT NULL DEFAULT 0,
        spoliation_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custodian_acknowledgments (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hold_id UUID NOT NULL REFERENCES custodian_legal_holds(id) ON DELETE CASCADE,
        custodian_name VARCHAR(255) NOT NULL,
        custodian_email VARCHAR(255) NOT NULL,
        department VARCHAR(128) NOT NULL,
        notice_sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMPTZ,
        escalation_count INT NOT NULL DEFAULT 0,
        is_offboarding_flagged BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS outside_counsel_invoices (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matter_id UUID NOT NULL REFERENCES litigation_matters(id) ON DELETE CASCADE,
        law_firm_name VARCHAR(255) NOT NULL,
        ledes_invoice_number VARCHAR(128) NOT NULL,
        invoice_date DATE NOT NULL,
        billed_amount_usd NUMERIC(15, 2) NOT NULL,
        audited_approved_amount_usd NUMERIC(15, 2) NOT NULL,
        allocated_matter_budget_usd NUMERIC(15, 2) NOT NULL,
        blended_hourly_rate_usd NUMERIC(10, 2) NOT NULL,
        efficiency_score NUMERIC(5, 2) NOT NULL DEFAULT 90.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS general_counsel_board_memoranda (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reporting_quarter VARCHAR(16) NOT NULL,
        fiscal_year INT NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lrci_composite_score NUMERIC(5, 2) NOT NULL,
        total_asc450_accrued_reserve_usd NUMERIC(15, 2) NOT NULL,
        total_asc450_possible_exposure_usd NUMERIC(15, 2) NOT NULL,
        item_103_disclosure_text TEXT NOT NULL,
        memo_status VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
        signatures_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        cryptographic_integrity_digest VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_legal_studios_user ON legal_operations_studios(user_id);
      CREATE INDEX IF NOT EXISTS idx_legal_entities_user ON legal_entities(user_id);
      CREATE INDEX IF NOT EXISTS idx_statutory_filings_user_entity ON statutory_filings(user_id, entity_id);
      CREATE INDEX IF NOT EXISTS idx_statutory_registers_user_entity ON statutory_registers(user_id, entity_id);
      CREATE INDEX IF NOT EXISTS idx_ip_assets_user ON intellectual_property_assets(user_id);
      CREATE INDEX IF NOT EXISTS idx_patent_milestones_user ON patent_docket_milestones(user_id, asset_id);
      CREATE INDEX IF NOT EXISTS idx_material_contracts_user ON material_commercial_contracts(user_id);
      CREATE INDEX IF NOT EXISTS idx_litigation_matters_user ON litigation_matters(user_id);
      CREATE INDEX IF NOT EXISTS idx_custodian_holds_user ON custodian_legal_holds(user_id, matter_id);
      CREATE INDEX IF NOT EXISTS idx_custodians_user ON custodian_acknowledgments(user_id, hold_id);
      CREATE INDEX IF NOT EXISTS idx_counsel_invoices_user ON outside_counsel_invoices(user_id, matter_id);
      CREATE INDEX IF NOT EXISTS idx_board_memoranda_user ON general_counsel_board_memoranda(user_id);
    `);
  }

  async ensureDefaults(userId: string): Promise<string> {
    await this.ensureSchema();
    const studioCheck = await this.pool.query(
      'SELECT id FROM legal_operations_studios WHERE user_id = $1',
      [userId]
    );

    if (studioCheck.rows.length > 0) {
      return studioCheck.rows[0].id;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO legal_operations_studios (id, user_id, enterprise_name, lrci_score, lrci_band)
       VALUES ($1, $2, $3, $4, $5)`,
      [studioId, userId, 'JobTrack Global Enterprise Technologies Inc.', 22.40, 'SOVEREIGN_FORTRESS']
    );

    const deEntityId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO legal_entities (
        id, user_id, studio_id, legal_name, entity_type, jurisdiction, registration_number,
        incorporation_date, status, registered_agent, principal_office_address, tax_identification_number,
        intercompany_agreement_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        deEntityId,
        userId,
        studioId,
        'JobTrack Global Enterprise Technologies Inc.',
        'C_CORPORATION',
        'DELAWARE_US',
        'DE-7892104',
        '2019-01-15',
        'GOOD_STANDING',
        'The Corporation Trust Company, Wilmington DE',
        '1209 North Orange Street, Wilmington, DE 19801',
        'US-83-2940192',
        4
      ]
    );

    const ukEntityId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO legal_entities (
        id, user_id, studio_id, legal_name, entity_type, jurisdiction, registration_number,
        incorporation_date, status, registered_agent, principal_office_address, tax_identification_number,
        intercompany_agreement_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ukEntityId,
        userId,
        studioId,
        'JobTrack EMEA Operations Limited',
        'PRIVATE_LIMITED_COMPANY',
        'UNITED_KINGDOM',
        'UK-12894012',
        '2020-06-10',
        'GOOD_STANDING',
        'Corporate Secretarial Services UK LLP',
        '25 Bank Street, Canary Wharf, London E14 5JP',
        'GB-340-9182-44',
        3
      ]
    );

    const filing1Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO statutory_filings (
        id, user_id, entity_id, filing_title, filing_authority, statutory_deadline, filing_status, penalty_exposure_usd, completed_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        filing1Id,
        userId,
        deEntityId,
        'Delaware Annual Franchise Tax & Annual Report',
        'Delaware Secretary of State',
        '2027-03-01',
        'COMPLETED',
        200.00,
        '2026-02-14'
      ]
    );

    const filing2Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO statutory_filings (
        id, user_id, entity_id, filing_title, filing_authority, statutory_deadline, filing_status, penalty_exposure_usd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        filing2Id,
        userId,
        ukEntityId,
        'Companies House Annual Confirmation Statement (CS01)',
        'Companies House Cardiff',
        '2026-11-20',
        'UPCOMING',
        1500.00
      ]
    );

    const reg1Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO statutory_registers (
        id, user_id, entity_id, register_type, full_name, nationality_or_jurisdiction, appointment_date, is_sanction_screened
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        reg1Id,
        userId,
        deEntityId,
        'DIRECTOR',
        'Eleanor Vance',
        'United States',
        '2019-01-15',
        true
      ]
    );

    const reg2Id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO statutory_registers (
        id, user_id, entity_id, register_type, full_name, nationality_or_jurisdiction, appointment_date, ownership_percentage, voting_rights_percentage, is_sanction_screened
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        reg2Id,
        userId,
        ukEntityId,
        'BENEFICIAL_OWNER_PSC',
        'JobTrack Global Enterprise Technologies Inc.',
        'United States',
        '2020-06-10',
        100.00,
        100.00,
        true
      ]
    );

    const assetId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO intellectual_property_assets (
        id, user_id, entity_id, ip_type, title, registration_or_app_number, office,
        filing_date, grant_date, expiration_date, status, pph_status, claims_count,
        independent_claims_count, forward_citations_count, backward_citations_count,
        office_actions_count, rce_filings_count, statutory_extensions_count,
        foreign_family_count, pqdi_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        assetId,
        userId,
        deEntityId,
        'UTILITY_PATENT',
        'Distributed Multi-Tenant Application Tracking & Verification Architecture',
        'US 11,894,302 B2',
        'USPTO',
        '2021-03-12',
        '2023-08-15',
        '2041-03-12',
        'PATENT_GRANTED',
        'ACCELERATED_EXAMINATION',
        24,
        3,
        18,
        32,
        1,
        0,
        0,
        4,
        92.40
      ]
    );

    const milestoneId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO patent_docket_milestones (
        id, user_id, asset_id, milestone_title, action_code, issuance_date, statutory_due_date, extension_available_months, is_completed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        milestoneId,
        userId,
        assetId,
        'USPTO 3.5-Year Patent Maintenance Fee Window',
        'USPTO-M35',
        '2023-08-15',
        '2027-02-15',
        6,
        false
      ]
    );

    const contractId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO material_commercial_contracts (
        id, user_id, entity_id, title, counterparty_legal_name, contract_type,
        effective_date, expiration_date, annual_contract_value, total_contract_value,
        liability_cap_type, liability_cap_usd, has_uncapped_indemnity, governing_law,
        dispute_forum, has_mfn_clause, has_exclusivity_or_non_compete,
        auto_renewal_notice_days, renewal_notice_deadline,
        termination_for_convenience_notice_days, crdi_score, contract_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        contractId,
        userId,
        deEntityId,
        'Global Master Services Agreement - Apex Financial Group',
        'Apex Financial Holdings Corp',
        'MASTER_SERVICES_AGREEMENT',
        '2024-01-01',
        '2027-01-01',
        2400000.00,
        7200000.00,
        'STANDARD_1X_ACV',
        2400000.00,
        false,
        'DELAWARE_US',
        'DELAWARE_CHANCERY_COURT',
        false,
        false,
        60,
        '2026-11-02',
        30,
        5.00,
        'ACTIVE'
      ]
    );

    const matterId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO litigation_matters (
        id, user_id, entity_id, case_caption, docket_number, tribunal, filing_date,
        lead_outside_counsel_firm, opposing_party, claims_summary, relief_claimed_amount_usd,
        asc450_classification, accrued_reserve_amount_usd, estimated_loss_range_min_usd,
        estimated_loss_range_max_usd, matter_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        matterId,
        userId,
        deEntityId,
        'Synapse AI LLC v. JobTrack Global Enterprise Technologies Inc.',
        '1:25-cv-01492-RGA',
        'US_FEDERAL_DISTRICT_COURT',
        '2025-04-10',
        'Quinn Emanuel Urquhart & Sullivan LLP',
        'Synapse AI LLC (Non-Practicing Entity)',
        'Patent infringement allegations regarding distributed data ingestion under US Patent 9,921,042.',
        15000000.00,
        'REASONABLY_POSSIBLE',
        0.00,
        500000.00,
        2500000.00,
        'ACTIVE'
      ]
    );

    const holdId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO custodian_legal_holds (
        id, user_id, matter_id, hold_title, scope_description, issued_at, status, total_custodians_count, acknowledged_count, spoliation_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        holdId,
        userId,
        matterId,
        'Synapse Patent Dispute Document & Communications Preservation',
        'Preserve all engineering logs, architectural specifications, and patent disclosures relating to event pipeline.',
        '2025-04-12T14:00:00Z',
        'ACTIVE_ISSUED',
        14,
        14,
        0.00
      ]
    );

    const custId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO custodian_acknowledgments (
        id, user_id, hold_id, custodian_name, custodian_email, department, notice_sent_at, acknowledged_at, escalation_count, is_offboarding_flagged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        custId,
        userId,
        holdId,
        'Marcus Sterling',
        'marcus.sterling@jobtrack.internal',
        'Platform Architecture',
        '2025-04-12T14:30:00Z',
        '2025-04-12T15:10:00Z',
        0,
        false
      ]
    );

    const invId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO outside_counsel_invoices (
        id, user_id, matter_id, law_firm_name, ledes_invoice_number, invoice_date,
        billed_amount_usd, audited_approved_amount_usd, allocated_matter_budget_usd,
        blended_hourly_rate_usd, efficiency_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        invId,
        userId,
        matterId,
        'Quinn Emanuel Urquhart & Sullivan LLP',
        'QE-2026-9041',
        '2026-09-30',
        142000.00,
        135000.00,
        500000.00,
        875.00,
        94.00
      ]
    );

    const memoId = crypto.randomUUID();
    const memoSignatures: DigitalExecutiveSignatureDTO[] = [
      {
        role: 'deputy_general_counsel',
        signerName: 'Sarah Jenkins, Esq.',
        signerTitle: 'Deputy General Counsel, Commercial & Regulatory',
        signedAt: '2026-10-02T10:15:00Z',
        signatureDigestSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      },
      {
        role: 'chief_intellectual_property_counsel',
        signerName: 'David K. Thorne, Registered Patent Attorney',
        signerTitle: 'Chief Intellectual Property Counsel',
        signedAt: '2026-10-02T14:30:00Z',
        signatureDigestSha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb'
      },
      {
        role: 'general_counsel_corporate_secretary',
        signerName: 'Victoria Sterling, Esq.',
        signerTitle: 'Chief Legal Officer, General Counsel & Corporate Secretary',
        signedAt: '2026-10-03T09:00:00Z',
        signatureDigestSha256: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce'
      }
    ];

    const item103Sample = generateSecItem103Disclosure({
      registrantName: 'JobTrack Global Enterprise Technologies Inc.',
      fiscalYear: 2026,
      reportingQuarter: 'Q3',
      activeMatters: [
        {
          id: matterId,
          userId,
          entityId: deEntityId,
          caseCaption: 'Synapse AI LLC v. JobTrack Global Enterprise Technologies Inc.',
          docketNumber: '1:25-cv-01492-RGA',
          tribunal: 'US_FEDERAL_DISTRICT_COURT',
          filingDate: '2025-04-10',
          leadOutsideCounselFirm: 'Quinn Emanuel Urquhart & Sullivan LLP',
          opposingParty: 'Synapse AI LLC (Non-Practicing Entity)',
          claimsSummary: 'Patent infringement allegations regarding distributed data ingestion under US Patent 9,921,042.',
          reliefClaimedAmountUsd: 15000000.00,
          asc450Classification: 'REASONABLY_POSSIBLE',
          accruedReserveAmountUsd: 0.00,
          estimatedLossRangeMinUsd: 500000.00,
          estimatedLossRangeMaxUsd: 2500000.00,
          matterStatus: 'ACTIVE',
          legalHolds: [],
          outsideCounselInvoices: []
        }
      ],
      totalProbableReserveUsd: 1250000.00,
      totalReasonablyPossibleMaxUsd: 2500000.00
    });

    await this.pool.query(
      `INSERT INTO general_counsel_board_memoranda (
        id, user_id, reporting_quarter, fiscal_year, generated_at, lrci_composite_score,
        total_asc450_accrued_reserve_usd, total_asc450_possible_exposure_usd,
        item_103_disclosure_text, memo_status, signatures_json, cryptographic_integrity_digest
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        memoId,
        userId,
        'Q3',
        2026,
        '2026-10-01T08:00:00Z',
        22.40,
        1250000.00,
        2500000.00,
        item103Sample,
        'BOARD_CERTIFIED_LOCKED',
        JSON.stringify(memoSignatures),
        'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2'
      ]
    );

    return studioId;
  }

  async getOverview(userId: string): Promise<LegalOperationsOverviewDTO> {
    await this.ensureDefaults(userId);

    const entitiesRes = await this.pool.query(
      'SELECT * FROM legal_entities WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    const filingsRes = await this.pool.query(
      'SELECT * FROM statutory_filings WHERE user_id = $1 ORDER BY statutory_deadline ASC',
      [userId]
    );
    const registersRes = await this.pool.query(
      'SELECT * FROM statutory_registers WHERE user_id = $1 ORDER BY appointment_date ASC',
      [userId]
    );
    const ipAssetsRes = await this.pool.query(
      'SELECT a.*, e.legal_name as entity_name FROM intellectual_property_assets a JOIN legal_entities e ON a.entity_id = e.id WHERE a.user_id = $1 ORDER BY a.created_at ASC',
      [userId]
    );
    const milestonesRes = await this.pool.query(
      'SELECT * FROM patent_docket_milestones WHERE user_id = $1 ORDER BY statutory_due_date ASC',
      [userId]
    );
    const contractsRes = await this.pool.query(
      'SELECT c.*, e.legal_name as entity_name FROM material_commercial_contracts c JOIN legal_entities e ON c.entity_id = e.id WHERE c.user_id = $1 ORDER BY c.created_at ASC',
      [userId]
    );
    const mattersRes = await this.pool.query(
      'SELECT * FROM litigation_matters WHERE user_id = $1 ORDER BY filing_date DESC',
      [userId]
    );
    const holdsRes = await this.pool.query(
      'SELECT * FROM custodian_legal_holds WHERE user_id = $1 ORDER BY issued_at DESC',
      [userId]
    );
    const custsRes = await this.pool.query(
      'SELECT * FROM custodian_acknowledgments WHERE user_id = $1 ORDER BY notice_sent_at ASC',
      [userId]
    );
    const invoicesRes = await this.pool.query(
      'SELECT * FROM outside_counsel_invoices WHERE user_id = $1 ORDER BY invoice_date DESC',
      [userId]
    );
    const memoRes = await this.pool.query(
      'SELECT * FROM general_counsel_board_memoranda WHERE user_id = $1 ORDER BY fiscal_year DESC, reporting_quarter DESC LIMIT 1',
      [userId]
    );

    const filingsByEntity = new Map<string, StatutoryFilingDeadlineDTO[]>();
    for (const r of filingsRes.rows) {
      const list = filingsByEntity.get(r.entity_id) || [];
      list.push({
        id: r.id,
        entityId: r.entity_id,
        filingTitle: r.filing_title,
        filingAuthority: r.filing_authority,
        statutoryDeadline: r.statutory_deadline instanceof Date ? r.statutory_deadline.toISOString().slice(0, 10) : String(r.statutory_deadline),
        filingStatus: r.filing_status,
        penaltyExposureUsd: parseFloat(r.penalty_exposure_usd),
        completedDate: r.completed_date ? (r.completed_date instanceof Date ? r.completed_date.toISOString().slice(0, 10) : String(r.completed_date)) : undefined
      });
      filingsByEntity.set(r.entity_id, list);
    }

    const registersByEntity = new Map<string, StatutoryRegisterRecordDTO[]>();
    for (const r of registersRes.rows) {
      const list = registersByEntity.get(r.entity_id) || [];
      list.push({
        id: r.id,
        entityId: r.entity_id,
        registerType: r.register_type,
        fullName: r.full_name,
        nationalityOrJurisdiction: r.nationality_or_jurisdiction,
        appointmentDate: r.appointment_date instanceof Date ? r.appointment_date.toISOString().slice(0, 10) : String(r.appointment_date),
        resignationDate: r.resignation_date ? (r.resignation_date instanceof Date ? r.resignation_date.toISOString().slice(0, 10) : String(r.resignation_date)) : undefined,
        ownershipPercentage: r.ownership_percentage != null ? parseFloat(r.ownership_percentage) : undefined,
        votingRightsPercentage: r.voting_rights_percentage != null ? parseFloat(r.voting_rights_percentage) : undefined,
        isSanctionScreened: r.is_sanction_screened
      });
      registersByEntity.set(r.entity_id, list);
    }

    const entities: LegalEntityDTO[] = entitiesRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      legalName: r.legal_name,
      entityType: r.entity_type,
      jurisdiction: r.jurisdiction,
      registrationNumber: r.registration_number,
      incorporationDate: r.incorporation_date instanceof Date ? r.incorporation_date.toISOString().slice(0, 10) : String(r.incorporation_date),
      status: r.status,
      registeredAgent: r.registered_agent,
      principalOfficeAddress: r.principal_office_address,
      taxIdentificationNumber: r.tax_identification_number,
      intercompanyAgreementCount: r.intercompany_agreement_count,
      statutoryFilings: filingsByEntity.get(r.id) || [],
      statutoryRegisters: registersByEntity.get(r.id) || []
    }));

    const milestonesByAsset = new Map<string, PatentDocketMilestoneDTO[]>();
    for (const r of milestonesRes.rows) {
      const list = milestonesByAsset.get(r.asset_id) || [];
      list.push({
        id: r.id,
        assetId: r.asset_id,
        milestoneTitle: r.milestone_title,
        actionCode: r.action_code,
        issuanceDate: r.issuance_date instanceof Date ? r.issuance_date.toISOString().slice(0, 10) : String(r.issuance_date),
        statutoryDueDate: r.statutory_due_date instanceof Date ? r.statutory_due_date.toISOString().slice(0, 10) : String(r.statutory_due_date),
        extensionAvailableMonths: r.extension_available_months,
        isCompleted: r.is_completed,
        completionDate: r.completion_date ? (r.completion_date instanceof Date ? r.completion_date.toISOString().slice(0, 10) : String(r.completion_date)) : undefined
      });
      milestonesByAsset.set(r.asset_id, list);
    }

    const ipAssets: IPAssetDTO[] = ipAssetsRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      entityId: r.entity_id,
      entityName: r.entity_name,
      ipType: r.ip_type,
      title: r.title,
      registrationOrAppNumber: r.registration_or_app_number,
      office: r.office,
      filingDate: r.filing_date instanceof Date ? r.filing_date.toISOString().slice(0, 10) : String(r.filing_date),
      grantDate: r.grant_date ? (r.grant_date instanceof Date ? r.grant_date.toISOString().slice(0, 10) : String(r.grant_date)) : undefined,
      expirationDate: r.expiration_date instanceof Date ? r.expiration_date.toISOString().slice(0, 10) : String(r.expiration_date),
      status: r.status,
      pphStatus: r.pph_status,
      claimsCount: r.claims_count,
      independentClaimsCount: r.independent_claims_count,
      forwardCitationsCount: r.forward_citations_count,
      backwardCitationsCount: r.backward_citations_count,
      officeActionsCount: r.office_actions_count,
      rceFilingsCount: r.rce_filings_count,
      statutoryExtensionsCount: r.statutory_extensions_count,
      foreignFamilyCount: r.foreign_family_count,
      pqdiScore: parseFloat(r.pqdi_score),
      docketMilestones: milestonesByAsset.get(r.id) || []
    }));

    const materialContracts: MaterialContractDTO[] = contractsRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      entityId: r.entity_id,
      entityName: r.entity_name,
      title: r.title,
      counterpartyLegalName: r.counterparty_legal_name,
      contractType: r.contract_type,
      effectiveDate: r.effective_date instanceof Date ? r.effective_date.toISOString().slice(0, 10) : String(r.effective_date),
      expirationDate: r.expiration_date instanceof Date ? r.expiration_date.toISOString().slice(0, 10) : String(r.expiration_date),
      annualContractValue: parseFloat(r.annual_contract_value),
      totalContractValue: parseFloat(r.total_contract_value),
      liabilityCapType: r.liability_cap_type,
      liabilityCapUsd: parseFloat(r.liability_cap_usd),
      hasUncappedIndemnity: r.has_uncapped_indemnity,
      governingLaw: r.governing_law,
      disputeForum: r.dispute_forum,
      hasMfnClause: r.has_mfn_clause,
      hasExclusivityOrNonCompete: r.has_exclusivity_or_non_compete,
      autoRenewalNoticeDays: r.auto_renewal_notice_days,
      renewalNoticeDeadline: r.renewal_notice_deadline instanceof Date ? r.renewal_notice_deadline.toISOString().slice(0, 10) : String(r.renewal_notice_deadline),
      terminationForConvenienceNoticeDays: r.termination_for_convenience_notice_days,
      crdiScore: parseFloat(r.crdi_score),
      contractStatus: r.contract_status
    }));

    const custsByHold = new Map<string, CustodianAcknowledgmentRecordDTO[]>();
    for (const r of custsRes.rows) {
      const list = custsByHold.get(r.hold_id) || [];
      list.push({
        id: r.id,
        holdId: r.hold_id,
        custodianName: r.custodian_name,
        custodianEmail: r.custodian_email,
        department: r.department,
        noticeSentAt: r.notice_sent_at instanceof Date ? r.notice_sent_at.toISOString() : String(r.notice_sent_at),
        acknowledgedAt: r.acknowledged_at ? (r.acknowledged_at instanceof Date ? r.acknowledged_at.toISOString() : String(r.acknowledged_at)) : undefined,
        escalationCount: r.escalation_count,
        isOffboardingFlagged: r.is_offboarding_flagged
      });
      custsByHold.set(r.hold_id, list);
    }

    const holdsByMatter = new Map<string, CustodianLegalHoldDTO[]>();
    for (const r of holdsRes.rows) {
      const list = holdsByMatter.get(r.matter_id) || [];
      list.push({
        id: r.id,
        userId: r.user_id,
        matterId: r.matter_id,
        holdTitle: r.hold_title,
        scopeDescription: r.scope_description,
        issuedAt: r.issued_at instanceof Date ? r.issued_at.toISOString() : String(r.issued_at),
        status: r.status,
        totalCustodiansCount: r.total_custodians_count,
        acknowledgedCount: r.acknowledged_count,
        spoliationRiskScore: parseFloat(r.spoliation_risk_score),
        custodians: custsByHold.get(r.id) || []
      });
      holdsByMatter.set(r.matter_id, list);
    }

    const invoicesByMatter = new Map<string, OutsideCounselInvoiceDTO[]>();
    for (const r of invoicesRes.rows) {
      const list = invoicesByMatter.get(r.matter_id) || [];
      list.push({
        id: r.id,
        userId: r.user_id,
        matterId: r.matter_id,
        lawFirmName: r.law_firm_name,
        ledesInvoiceNumber: r.ledes_invoice_number,
        invoiceDate: r.invoice_date instanceof Date ? r.invoice_date.toISOString().slice(0, 10) : String(r.invoice_date),
        billedAmountUsd: parseFloat(r.billed_amount_usd),
        auditedApprovedAmountUsd: parseFloat(r.audited_approved_amount_usd),
        allocatedMatterBudgetUsd: parseFloat(r.allocated_matter_budget_usd),
        blendedHourlyRateUsd: parseFloat(r.blended_hourly_rate_usd),
        efficiencyScore: parseFloat(r.efficiency_score)
      });
      invoicesByMatter.set(r.matter_id, list);
    }

    const litigationMatters: LitigationMatterDTO[] = mattersRes.rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      entityId: r.entity_id,
      caseCaption: r.case_caption,
      docketNumber: r.docket_number,
      tribunal: r.tribunal,
      filingDate: r.filing_date instanceof Date ? r.filing_date.toISOString().slice(0, 10) : String(r.filing_date),
      leadOutsideCounselFirm: r.lead_outside_counsel_firm,
      opposingParty: r.opposing_party,
      claimsSummary: r.claims_summary,
      reliefClaimedAmountUsd: parseFloat(r.relief_claimed_amount_usd),
      asc450Classification: r.asc450_classification,
      accruedReserveAmountUsd: parseFloat(r.accrued_reserve_amount_usd),
      estimatedLossRangeMinUsd: parseFloat(r.estimated_loss_range_min_usd),
      estimatedLossRangeMaxUsd: parseFloat(r.estimated_loss_range_max_usd),
      matterStatus: r.matter_status,
      legalHolds: holdsByMatter.get(r.id) || [],
      outsideCounselInvoices: invoicesByMatter.get(r.id) || []
    }));

    const activeBoardMemorandum: LegalBoardMemorandumDTO = memoRes.rows.length > 0 ? {
      id: memoRes.rows[0].id,
      userId: memoRes.rows[0].user_id,
      reportingQuarter: memoRes.rows[0].reporting_quarter,
      fiscalYear: memoRes.rows[0].fiscal_year,
      generatedAt: memoRes.rows[0].generated_at instanceof Date ? memoRes.rows[0].generated_at.toISOString() : String(memoRes.rows[0].generated_at),
      lrciCompositeScore: parseFloat(memoRes.rows[0].lrci_composite_score),
      totalAsc450AccruedReserveUsd: parseFloat(memoRes.rows[0].total_asc450_accrued_reserve_usd),
      totalAsc450PossibleExposureUsd: parseFloat(memoRes.rows[0].total_asc450_possible_exposure_usd),
      item103DisclosureText: memoRes.rows[0].item_103_disclosure_text,
      memoStatus: memoRes.rows[0].memo_status,
      signatures: memoRes.rows[0].signatures_json || [],
      cryptographicIntegrityDigest: memoRes.rows[0].cryptographic_integrity_digest
    } : {
      id: crypto.randomUUID(),
      userId,
      reportingQuarter: 'Q3',
      fiscalYear: 2026,
      generatedAt: new Date().toISOString(),
      lrciCompositeScore: 22.40,
      totalAsc450AccruedReserveUsd: 1250000.00,
      totalAsc450PossibleExposureUsd: 2500000.00,
      item103DisclosureText: '',
      memoStatus: 'DRAFT',
      signatures: [],
      cryptographicIntegrityDigest: '0000000000000000000000000000000000000000000000000000000000000000'
    };

    const goodStandingCount = entities.filter((e) => e.status === 'GOOD_STANDING').length;
    const subsidiaryComplianceScore = entities.length > 0 ? Math.round((goodStandingCount / entities.length) * 10000) / 100 : 100.0;
    const averagePqdiScore = ipAssets.length > 0
      ? Math.round((ipAssets.reduce((sum, a) => sum + a.pqdiScore, 0) / ipAssets.length) * 100) / 100
      : 85.0;
    const averageCrdiScore = materialContracts.length > 0
      ? Math.round((materialContracts.reduce((sum, c) => sum + c.crdiScore, 0) / materialContracts.length) * 100) / 100
      : 15.0;
    const totalLitigationReserveAccruedUsd = litigationMatters.reduce((sum, m) => sum + m.accruedReserveAmountUsd, 0);
    const totalPossibleMaxUsd = litigationMatters.reduce((sum, m) => sum + m.estimatedLossRangeMaxUsd, 0);
    const totalAnnualContractValueCoveredUsd = materialContracts.reduce((sum, c) => sum + c.annualContractValue, 0);

    const lrciResult = calculateLRCI({
      subsidiaryComplianceScore,
      averagePqdiScore,
      averageCrdiScore,
      activeMattersCount: litigationMatters.length,
      probableAccruedLossUsd: totalLitigationReserveAccruedUsd,
      reasonablyPossibleLossMaxUsd: totalPossibleMaxUsd,
      outsideCounselBudgetVariancePercent: 5.0,
      materialityThresholdUsd: 10000000.0
    });

    return {
      userId,
      generatedAt: new Date().toISOString(),
      lrciCompositeScore: lrciResult.compositeScore,
      lrciRiskBand: lrciResult.riskBand,
      subsidiaryComplianceScore,
      averagePqdiScore,
      averageCrdiScore,
      litigationExposureScore: Math.round(lrciResult.baseScore * 100) / 100,
      totalLitigationReserveAccruedUsd,
      totalAnnualContractValueCoveredUsd,
      totalActivePatentsAndTrademarksCount: ipAssets.length,
      activeLitigationMattersCount: litigationMatters.length,
      activeLegalHoldsCount: holdsRes.rows.length,
      entities,
      ipAssets,
      materialContracts,
      litigationMatters,
      activeBoardMemorandum
    };
  }

  async createEntity(userId: string, input: any): Promise<LegalEntityDTO> {
    const studioId = await this.ensureDefaults(userId);
    const id = crypto.randomUUID();
    const incorporationDate = input.incorporationDate || new Date().toISOString().slice(0, 10);
    const status = input.status || 'GOOD_STANDING';

    await this.pool.query(
      `INSERT INTO legal_entities (
        id, user_id, studio_id, legal_name, entity_type, jurisdiction, registration_number,
        incorporation_date, status, registered_agent, principal_office_address, tax_identification_number,
        intercompany_agreement_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        userId,
        studioId,
        input.legalName,
        input.entityType,
        input.jurisdiction,
        input.registrationNumber,
        incorporationDate,
        status,
        input.registeredAgent || 'Statutory Registered Agent LLC',
        input.principalOfficeAddress || '100 Enterprise Way',
        input.taxIdentificationNumber || 'US-99-0000000',
        input.intercompanyAgreementCount || 0
      ]
    );

    return {
      id,
      userId,
      legalName: input.legalName,
      entityType: input.entityType,
      jurisdiction: input.jurisdiction,
      registrationNumber: input.registrationNumber,
      incorporationDate,
      status,
      registeredAgent: input.registeredAgent || 'Statutory Registered Agent LLC',
      principalOfficeAddress: input.principalOfficeAddress || '100 Enterprise Way',
      taxIdentificationNumber: input.taxIdentificationNumber || 'US-99-0000000',
      intercompanyAgreementCount: input.intercompanyAgreementCount || 0,
      statutoryFilings: [],
      statutoryRegisters: []
    };
  }

  async updateAssetPqdi(userId: string, assetId: string, params: PqdiCalculationParams): Promise<IPAssetDTO> {
    await this.ensureDefaults(userId);
    const score = calculatePQDI(params);

    const updateRes = await this.pool.query(
      `UPDATE intellectual_property_assets
       SET pqdi_score = $1, claims_count = $2, independent_claims_count = $3,
           forward_citations_count = $4, office_actions_count = $5,
           rce_filings_count = $6, statutory_extensions_count = $7,
           foreign_family_count = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10
       RETURNING *`,
      [
        score,
        params.totalClaimsCount,
        params.independentClaimsCount,
        params.forwardCitationsCount,
        params.officeActionsCount,
        params.rceFilingsCount,
        params.statutoryExtensionsCount,
        params.foreignFamilyCount,
        assetId,
        userId
      ]
    );

    if (updateRes.rows.length === 0) {
      throw new Error(`IP Asset ${assetId} not found for user`);
    }

    const r = updateRes.rows[0];
    const entRes = await this.pool.query('SELECT legal_name FROM legal_entities WHERE id = $1 AND user_id = $2', [r.entity_id, userId]);
    const entityName = entRes.rows.length > 0 ? entRes.rows[0].legal_name : 'Parent Corporation';

    return {
      id: r.id,
      userId: r.user_id,
      entityId: r.entity_id,
      entityName,
      ipType: r.ip_type,
      title: r.title,
      registrationOrAppNumber: r.registration_or_app_number,
      office: r.office,
      filingDate: r.filing_date instanceof Date ? r.filing_date.toISOString().slice(0, 10) : String(r.filing_date),
      grantDate: r.grant_date ? (r.grant_date instanceof Date ? r.grant_date.toISOString().slice(0, 10) : String(r.grant_date)) : undefined,
      expirationDate: r.expiration_date instanceof Date ? r.expiration_date.toISOString().slice(0, 10) : String(r.expiration_date),
      status: r.status,
      pphStatus: r.pph_status,
      claimsCount: r.claims_count,
      independentClaimsCount: r.independent_claims_count,
      forwardCitationsCount: r.forward_citations_count,
      backwardCitationsCount: r.backward_citations_count,
      officeActionsCount: r.office_actions_count,
      rceFilingsCount: r.rce_filings_count,
      statutoryExtensionsCount: r.statutory_extensions_count,
      foreignFamilyCount: r.foreign_family_count,
      pqdiScore: parseFloat(r.pqdi_score),
      docketMilestones: []
    };
  }

  async createContract(userId: string, input: any): Promise<MaterialContractDTO> {
    await this.ensureDefaults(userId);
    const id = crypto.randomUUID();

    const entities = await this.pool.query('SELECT id, legal_name FROM legal_entities WHERE user_id = $1 LIMIT 1', [userId]);
    const entityId = input.entityId || (entities.rows.length > 0 ? entities.rows[0].id : crypto.randomUUID());
    const entityName = entities.rows.length > 0 ? entities.rows[0].legal_name : 'Operating Entity';

    const crdiScore = calculateCRDI({
      liabilityCapType: input.liabilityCapType,
      hasUncappedIndemnity: Boolean(input.hasUncappedIndemnity),
      governingLaw: input.governingLaw || 'DELAWARE_US',
      disputeForum: input.disputeForum || 'DELAWARE_CHANCERY_COURT',
      hasMfnClause: Boolean(input.hasMfnClause),
      hasExclusivityOrNonCompete: Boolean(input.hasExclusivityOrNonCompete),
      autoRenewalNoticeDays: input.autoRenewalNoticeDays || 30,
      terminationForConvenienceNoticeDays: input.terminationForConvenienceNoticeDays || 30
    });

    const effectiveDate = input.effectiveDate || new Date().toISOString().slice(0, 10);
    const expirationDate = input.expirationDate || '2028-12-31';
    const renewalNoticeDeadline = input.renewalNoticeDeadline || '2028-11-01';

    await this.pool.query(
      `INSERT INTO material_commercial_contracts (
        id, user_id, entity_id, title, counterparty_legal_name, contract_type,
        effective_date, expiration_date, annual_contract_value, total_contract_value,
        liability_cap_type, liability_cap_usd, has_uncapped_indemnity, governing_law,
        dispute_forum, has_mfn_clause, has_exclusivity_or_non_compete,
        auto_renewal_notice_days, renewal_notice_deadline,
        termination_for_convenience_notice_days, crdi_score, contract_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        id,
        userId,
        entityId,
        input.title,
        input.counterpartyLegalName,
        input.contractType || 'MASTER_SERVICES_AGREEMENT',
        effectiveDate,
        expirationDate,
        input.annualContractValue || 0,
        input.totalContractValue || input.annualContractValue || 0,
        input.liabilityCapType || 'STANDARD_1X_ACV',
        input.liabilityCapUsd || input.annualContractValue || 0,
        Boolean(input.hasUncappedIndemnity),
        input.governingLaw || 'DELAWARE_US',
        input.disputeForum || 'DELAWARE_CHANCERY_COURT',
        Boolean(input.hasMfnClause),
        Boolean(input.hasExclusivityOrNonCompete),
        input.autoRenewalNoticeDays || 30,
        renewalNoticeDeadline,
        input.terminationForConvenienceNoticeDays || 30,
        crdiScore,
        input.contractStatus || 'ACTIVE'
      ]
    );

    return {
      id,
      userId,
      entityId,
      entityName,
      title: input.title,
      counterpartyLegalName: input.counterpartyLegalName,
      contractType: input.contractType || 'MASTER_SERVICES_AGREEMENT',
      effectiveDate,
      expirationDate,
      annualContractValue: input.annualContractValue || 0,
      totalContractValue: input.totalContractValue || input.annualContractValue || 0,
      liabilityCapType: input.liabilityCapType || 'STANDARD_1X_ACV',
      liabilityCapUsd: input.liabilityCapUsd || input.annualContractValue || 0,
      hasUncappedIndemnity: Boolean(input.hasUncappedIndemnity),
      governingLaw: input.governingLaw || 'DELAWARE_US',
      disputeForum: input.disputeForum || 'DELAWARE_CHANCERY_COURT',
      hasMfnClause: Boolean(input.hasMfnClause),
      hasExclusivityOrNonCompete: Boolean(input.hasExclusivityOrNonCompete),
      autoRenewalNoticeDays: input.autoRenewalNoticeDays || 30,
      renewalNoticeDeadline,
      terminationForConvenienceNoticeDays: input.terminationForConvenienceNoticeDays || 30,
      crdiScore,
      contractStatus: input.contractStatus || 'ACTIVE'
    };
  }

  async updateMatterAsc450(userId: string, matterId: string, assessmentInput: Asc450ReserveAssessmentParams): Promise<LitigationMatterDTO> {
    await this.ensureDefaults(userId);
    const assessment = assessASC450Contingency(assessmentInput);

    const updateRes = await this.pool.query(
      `UPDATE litigation_matters
       SET asc450_classification = $1, accrued_reserve_amount_usd = $2,
           estimated_loss_range_min_usd = $3, estimated_loss_range_max_usd = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [
        assessment.classification,
        assessment.accruedAmountUsd,
        assessment.footnoteDisclosedMinUsd,
        assessment.footnoteDisclosedMaxUsd,
        matterId,
        userId
      ]
    );

    if (updateRes.rows.length === 0) {
      throw new Error(`Litigation Matter ${matterId} not found for user`);
    }

    const r = updateRes.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      entityId: r.entity_id,
      caseCaption: r.case_caption,
      docketNumber: r.docket_number,
      tribunal: r.tribunal,
      filingDate: r.filing_date instanceof Date ? r.filing_date.toISOString().slice(0, 10) : String(r.filing_date),
      leadOutsideCounselFirm: r.lead_outside_counsel_firm,
      opposingParty: r.opposing_party,
      claimsSummary: r.claims_summary,
      reliefClaimedAmountUsd: parseFloat(r.relief_claimed_amount_usd),
      asc450Classification: r.asc450_classification,
      accruedReserveAmountUsd: parseFloat(r.accrued_reserve_amount_usd),
      estimatedLossRangeMinUsd: parseFloat(r.estimated_loss_range_min_usd),
      estimatedLossRangeMaxUsd: parseFloat(r.estimated_loss_range_max_usd),
      matterStatus: r.matter_status,
      legalHolds: [],
      outsideCounselInvoices: []
    };
  }

  async createLegalHold(userId: string, input: any): Promise<CustodianLegalHoldDTO> {
    await this.ensureDefaults(userId);
    const id = crypto.randomUUID();
    const issuedAt = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO custodian_legal_holds (
        id, user_id, matter_id, hold_title, scope_description, issued_at, status, total_custodians_count, acknowledged_count, spoliation_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        userId,
        input.matterId,
        input.holdTitle,
        input.scopeDescription,
        issuedAt,
        'ACTIVE_ISSUED',
        1,
        1,
        0.00
      ]
    );

    const custId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO custodian_acknowledgments (
        id, user_id, hold_id, custodian_name, custodian_email, department, notice_sent_at, acknowledged_at, escalation_count, is_offboarding_flagged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        custId,
        userId,
        id,
        input.initialCustodianName || 'Lead Systems Architect',
        input.initialCustodianEmail || 'architect@jobtrack.internal',
        input.initialCustodianDepartment || 'Engineering',
        issuedAt,
        issuedAt,
        0,
        false
      ]
    );

    return {
      id,
      userId,
      matterId: input.matterId,
      holdTitle: input.holdTitle,
      scopeDescription: input.scopeDescription,
      issuedAt,
      status: 'ACTIVE_ISSUED',
      totalCustodiansCount: 1,
      acknowledgedCount: 1,
      spoliationRiskScore: 0.00,
      custodians: [
        {
          id: custId,
          holdId: id,
          custodianName: input.initialCustodianName || 'Lead Systems Architect',
          custodianEmail: input.initialCustodianEmail || 'architect@jobtrack.internal',
          department: input.initialCustodianDepartment || 'Engineering',
          noticeSentAt: issuedAt,
          acknowledgedAt: issuedAt,
          escalationCount: 0,
          isOffboardingFlagged: false
        }
      ]
    };
  }

  async executeDigitalSignoff(
    userId: string,
    memoId: string,
    signoff: { role: LegalSignoffRole; signerName: string; signerTitle?: string }
  ): Promise<LegalBoardMemorandumDTO> {
    await this.ensureDefaults(userId);

    const memoRes = await this.pool.query(
      'SELECT * FROM general_counsel_board_memoranda WHERE id = $1 AND user_id = $2',
      [memoId, userId]
    );

    if (memoRes.rows.length === 0) {
      throw new Error(`Board memorandum ${memoId} not found for user`);
    }

    const memo = memoRes.rows[0];
    const signatures: DigitalExecutiveSignatureDTO[] = memo.signatures_json || [];

    const existingIndex = signatures.findIndex((s) => s.role === signoff.role);
    const newSignatureDigest = crypto
      .createHash('sha256')
      .update(`${signoff.role}:${signoff.signerName}:${Date.now()}:${memoId}`)
      .digest('hex');

    const newSignature: DigitalExecutiveSignatureDTO = {
      role: signoff.role,
      signerName: signoff.signerName,
      signerTitle: signoff.signerTitle || 'Authorized Legal Counsel Signatory',
      signedAt: new Date().toISOString(),
      signatureDigestSha256: newSignatureDigest
    };

    if (existingIndex >= 0) {
      signatures[existingIndex] = newSignature;
    } else {
      signatures.push(newSignature);
    }

    let nextStatus: LegalBoardMemoStatus = memo.memo_status;
    const hasDgc = signatures.some((s) => s.role === 'deputy_general_counsel');
    const hasCipc = signatures.some((s) => s.role === 'chief_intellectual_property_counsel');
    const hasGc = signatures.some((s) => s.role === 'general_counsel_corporate_secretary');

    if (hasDgc && hasCipc && hasGc) {
      nextStatus = 'BOARD_CERTIFIED_LOCKED';
    } else if (hasDgc && hasCipc) {
      nextStatus = 'PENDING_GC_APPROVAL';
    } else if (hasDgc) {
      nextStatus = 'PENDING_CIPC_APPROVAL';
    } else {
      nextStatus = 'PENDING_DGC_APPROVAL';
    }

    const newIntegrityDigest = crypto
      .createHash('sha256')
      .update(JSON.stringify(signatures) + memo.item_103_disclosure_text)
      .digest('hex');

    await this.pool.query(
      `UPDATE general_counsel_board_memoranda
       SET signatures_json = $1, memo_status = $2, cryptographic_integrity_digest = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5`,
      [JSON.stringify(signatures), nextStatus, newIntegrityDigest, memoId, userId]
    );

    return {
      id: memo.id,
      userId: memo.user_id,
      reportingQuarter: memo.reporting_quarter,
      fiscalYear: memo.fiscal_year,
      generatedAt: memo.generated_at instanceof Date ? memo.generated_at.toISOString() : String(memo.generated_at),
      lrciCompositeScore: parseFloat(memo.lrci_composite_score),
      totalAsc450AccruedReserveUsd: parseFloat(memo.total_asc450_accrued_reserve_usd),
      totalAsc450PossibleExposureUsd: parseFloat(memo.total_asc450_possible_exposure_usd),
      item103DisclosureText: memo.item_103_disclosure_text,
      memoStatus: nextStatus,
      signatures,
      cryptographicIntegrityDigest: newIntegrityDigest
    };
  }
}
