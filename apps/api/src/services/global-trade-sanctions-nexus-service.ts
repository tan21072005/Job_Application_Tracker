import type { Pool } from 'pg';
import {
  type SanctionsScreeningRequestDTO,
  type SanctionsScreeningResultDTO,
  type BeneficialOwnerNodeDTO,
  type EccnClassificationRequestDTO,
  type EccnClassificationResultDTO,
  type DeemedExportAuditRequestDTO,
  type DeemedExportAuditResultDTO,
  type CfiusTidAssessmentRequestDTO,
  type CfiusTidAssessmentResultDTO,
  type CustomsLandedDutyRequestDTO,
  type CustomsLandedDutyResultDTO,
  type VoluntarySelfDisclosureDTO,
  type GlobalTradeNexusOverviewDTO,
  type EarCountryGroup,
  computeSanctionsCompositeScore,
  evaluateOfacFiftyPercentRule,
  computeSecondarySanctionsExposureIndex,
  evaluateEccnEncryptionClassification,
  computeDeemedExportExposure,
  evaluateCfiusTidObligations,
  computeCustomsDutyAndRvc,
  computeCompositeTradeSanctionsRiskIndex,
  generateVsdDossierMarkdown
} from '@jobtrack/contract';

export class GlobalTradeSanctionsNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS trade_compliance_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organization_name VARCHAR(255) NOT NULL,
        default_export_country CHAR(2) NOT NULL DEFAULT 'US',
        risk_tolerance_tier VARCHAR(50) NOT NULL DEFAULT 'tier_1_elite_zero_defect',
        auto_freeze_on_sdn_hit BOOLEAN NOT NULL DEFAULT TRUE,
        enforce_fifty_percent_aggregation BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_trade_profile_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS trade_sanctions_screenings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query_name VARCHAR(255) NOT NULL,
        country_code CHAR(2) NOT NULL,
        registration_number VARCHAR(100),
        industry_sector VARCHAR(100),
        aggregate_blocked_ownership NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        is_blocked_by_fifty_percent BOOLEAN NOT NULL DEFAULT FALSE,
        secondary_sanctions_index NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        risk_tier VARCHAR(50) NOT NULL,
        recommended_action VARCHAR(50) NOT NULL,
        screened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_sanctions_hits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        screening_id UUID NOT NULL REFERENCES trade_sanctions_screenings(id) ON DELETE CASCADE,
        list_source VARCHAR(50) NOT NULL,
        entity_name VARCHAR(255) NOT NULL,
        matched_field VARCHAR(50) NOT NULL,
        score_levenshtein NUMERIC(4, 2) NOT NULL,
        score_jaro_winkler NUMERIC(4, 2) NOT NULL,
        score_phonetic NUMERIC(4, 2) NOT NULL,
        composite_similarity_score NUMERIC(4, 2) NOT NULL,
        confidence VARCHAR(50) NOT NULL,
        regulatory_reference TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_entity_ownership_nodes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        screening_id UUID REFERENCES trade_sanctions_screenings(id) ON DELETE CASCADE,
        parent_node_id UUID REFERENCES trade_entity_ownership_nodes(id) ON DELETE CASCADE,
        entity_name VARCHAR(255) NOT NULL,
        country_code CHAR(2) NOT NULL,
        is_directly_sanctioned BOOLEAN NOT NULL DEFAULT FALSE,
        sanctions_source VARCHAR(50),
        ownership_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        voting_rights_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_eccn_classifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        functional_description TEXT NOT NULL,
        assigned_eccn VARCHAR(20) NOT NULL,
        encryption_level VARCHAR(50) NOT NULL,
        applicable_license_exception VARCHAR(50) NOT NULL,
        symmetric_key_bits INTEGER NOT NULL DEFAULT 0,
        asymmetric_key_bits INTEGER NOT NULL DEFAULT 0,
        elliptic_curve_bits INTEGER NOT NULL DEFAULT 0,
        is_mass_market BOOLEAN NOT NULL DEFAULT FALSE,
        requires_semi_annual_reporting BOOLEAN NOT NULL DEFAULT FALSE,
        requires_export_license BOOLEAN NOT NULL DEFAULT FALSE,
        destination_country CHAR(2) NOT NULL,
        determination_justification TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_deemed_export_licenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL,
        employee_name VARCHAR(255) NOT NULL,
        citizenship_country CHAR(2) NOT NULL,
        permanent_residency_country CHAR(2),
        is_us_person BOOLEAN NOT NULL DEFAULT FALSE,
        accessed_eccn VARCHAR(20) NOT NULL,
        technical_data_scope VARCHAR(50) NOT NULL,
        ear_country_group VARCHAR(50) NOT NULL,
        deemed_export_exposure_score NUMERIC(5, 2) NOT NULL,
        requires_deemed_export_license BOOLEAN NOT NULL,
        action_required VARCHAR(50) NOT NULL,
        license_auth_reference VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_cfius_tid_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transaction_id UUID NOT NULL,
        target_company_name VARCHAR(255) NOT NULL,
        deal_value_usd NUMERIC(15, 2) NOT NULL,
        tid_status VARCHAR(50) NOT NULL,
        sensitive_personal_data_records BIGINT NOT NULL DEFAULT 0,
        sensitive_threshold_exceeded BOOLEAN NOT NULL DEFAULT FALSE,
        is_covered_investment BOOLEAN NOT NULL DEFAULT FALSE,
        foreign_investor_country CHAR(2) NOT NULL,
        foreign_investor_ownership_pct NUMERIC(5, 2) NOT NULL,
        foreign_government_voting_pct NUMERIC(5, 2) NOT NULL,
        filing_requirement VARCHAR(50) NOT NULL,
        national_security_risk_score NUMERIC(5, 2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_nsma_mitigation_agreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cfius_assessment_id UUID NOT NULL REFERENCES trade_cfius_tid_assessments(id) ON DELETE CASCADE,
        covenant_title VARCHAR(255) NOT NULL,
        monitoring_trustee_name VARCHAR(255) NOT NULL,
        audit_frequency_days INTEGER NOT NULL DEFAULT 90,
        last_audit_date DATE NOT NULL,
        next_audit_due_date DATE NOT NULL,
        compliance_status VARCHAR(50) NOT NULL DEFAULT 'in_compliance',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_hts_duty_catalog (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        part_number VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        hts_code VARCHAR(20) NOT NULL,
        country_of_origin CHAR(2) NOT NULL,
        general_mfn_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        section_301_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        section_232_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_trade_hts_part UNIQUE (user_id, part_number)
      );

      CREATE TABLE IF NOT EXISTS trade_fta_qualifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hts_item_id UUID NOT NULL REFERENCES trade_hts_duty_catalog(id) ON DELETE CASCADE,
        fta_code VARCHAR(50) NOT NULL,
        regional_value_content_tv NUMERIC(5, 2) NOT NULL,
        regional_value_content_nc NUMERIC(5, 2) NOT NULL,
        is_origin_qualified BOOLEAN NOT NULL DEFAULT FALSE,
        certificate_of_origin_reference VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS trade_voluntary_self_disclosures (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vsd_reference_number VARCHAR(100) NOT NULL,
        target_authority VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        suspected_regulation_breach VARCHAR(255) NOT NULL,
        incident_start_date DATE NOT NULL,
        incident_end_date DATE NOT NULL,
        estimated_transactions_count INTEGER NOT NULL,
        estimated_transaction_volume_usd NUMERIC(15, 2) NOT NULL,
        narrative_summary TEXT NOT NULL,
        root_cause_analysis TEXT NOT NULL,
        remedial_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        generated_markdown_report TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_trade_vsd_ref UNIQUE (user_id, vsd_reference_number)
      );

      CREATE TABLE IF NOT EXISTS trade_tripartite_signoffs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vsd_id UUID NOT NULL REFERENCES trade_voluntary_self_disclosures(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        signer_name VARCHAR(255) NOT NULL,
        signature_hash VARCHAR(255) NOT NULL,
        signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_trade_vsd_role UNIQUE (vsd_id, role)
      );

      CREATE INDEX IF NOT EXISTS idx_trade_screenings_user ON trade_sanctions_screenings(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_hits_screening ON trade_sanctions_hits(screening_id);
      CREATE INDEX IF NOT EXISTS idx_trade_ownership_screening ON trade_entity_ownership_nodes(screening_id);
      CREATE INDEX IF NOT EXISTS idx_trade_eccn_user ON trade_eccn_classifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_deemed_user ON trade_deemed_export_licenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_cfius_user ON trade_cfius_tid_assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_nsma_cfius ON trade_nsma_mitigation_agreements(cfius_assessment_id);
      CREATE INDEX IF NOT EXISTS idx_trade_hts_user ON trade_hts_duty_catalog(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_fta_item ON trade_fta_qualifications(hts_item_id);
      CREATE INDEX IF NOT EXISTS idx_trade_vsd_user ON trade_voluntary_self_disclosures(user_id);
      CREATE INDEX IF NOT EXISTS idx_trade_signoffs_vsd ON trade_tripartite_signoffs(vsd_id);
    `);

    this.schemaInitialized = true;
  }

  async ensureDefaultSeedData(userId: string): Promise<void> {
    await this.ensureSchema();

    const existing = await this.pool.query(
      'SELECT id FROM trade_compliance_profiles WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (existing.rowCount && existing.rowCount > 0) return;

    await this.pool.query(
      `INSERT INTO trade_compliance_profiles (
        user_id, organization_name, default_export_country, risk_tolerance_tier,
        auto_freeze_on_sdn_hit, enforce_fifty_percent_aggregation
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO NOTHING`,
      [userId, 'JobTrack Global Enterprise', 'US', 'tier_1_elite_zero_defect', true, true]
    );

    await this.pool.query(
      `INSERT INTO trade_hts_duty_catalog (
        user_id, part_number, description, hts_code, country_of_origin,
        general_mfn_rate_pct, section_301_rate_pct, section_232_rate_pct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, part_number) DO NOTHING`,
      [
        userId,
        'GPU-ACCEL-01',
        'Enterprise Tensor Compute Accelerator Module',
        '8542.31.0000',
        'CN',
        2.50,
        25.00,
        0.00
      ]
    );

    const eccnItem = await this.pool.query(
      `INSERT INTO trade_eccn_classifications (
        user_id, item_name, functional_description, assigned_eccn,
        encryption_level, applicable_license_exception, symmetric_key_bits,
        asymmetric_key_bits, elliptic_curve_bits, is_mass_market,
        requires_semi_annual_reporting, requires_export_license,
        destination_country, determination_justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        userId,
        'SecureEdge Mesh Gateway Daemon',
        'High assurance zero trust encrypted gateway software',
        '5D002.a.1',
        'controlled_high_assurance_5a002',
        'enc_740_17_b1',
        256,
        2048,
        256,
        false,
        true,
        false,
        'DE',
        'Evaluated under Category 5 Part 2. Strong crypto detected without retail mass market distribution.'
      ]
    );

    const cfiusTx = await this.pool.query(
      `INSERT INTO trade_cfius_tid_assessments (
        user_id, transaction_id, target_company_name, deal_value_usd,
        tid_status, sensitive_personal_data_records, sensitive_threshold_exceeded,
        is_covered_investment, foreign_investor_country, foreign_investor_ownership_pct,
        foreign_government_voting_pct, filing_requirement, national_security_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId,
        'b8a1c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        'Apex Quantum Telemetry Inc.',
        125000000.00,
        'sensitive_personal_data_d',
        1850000,
        true,
        true,
        'SG',
        49.50,
        28.00,
        'mandatory_declaration_part_800',
        82.50
      ]
    );

    await this.pool.query(
      `INSERT INTO trade_nsma_mitigation_agreements (
        user_id, cfius_assessment_id, covenant_title, monitoring_trustee_name,
        audit_frequency_days, last_audit_date, next_audit_due_date, compliance_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        cfiusTx.rows[0].id,
        'Independent US Data Trustee & Access Redaction Covenant',
        'FTI Consulting Government Compliance Practice',
        90,
        '2026-07-01',
        '2026-10-01',
        'in_compliance'
      ]
    );
  }

  async getOverview(userId: string): Promise<GlobalTradeNexusOverviewDTO> {
    await this.ensureDefaultSeedData(userId);

    const sdnRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_sanctions_screenings WHERE user_id = $1`,
      [userId]
    );
    const hitsRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_sanctions_hits WHERE user_id = $1 AND confidence IN ('exact', 'high_probable')`,
      [userId]
    );
    const eccnRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_eccn_classifications WHERE user_id = $1`,
      [userId]
    );
    const deemedRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_deemed_export_licenses WHERE user_id = $1 AND requires_deemed_export_license = TRUE`,
      [userId]
    );
    const cfiusRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_cfius_tid_assessments WHERE user_id = $1`,
      [userId]
    );
    const nsmaRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_nsma_mitigation_agreements WHERE user_id = $1`,
      [userId]
    );
    const htsRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_hts_duty_catalog WHERE user_id = $1`,
      [userId]
    );
    const vsdRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_voluntary_self_disclosures WHERE user_id = $1 AND status != 'submitted_to_regulator'`,
      [userId]
    );

    const pendingHits = hitsRes.rows[0]?.count ?? 0;
    const pendingDeemed = deemedRes.rows[0]?.count ?? 0;
    const pendingVsd = vsdRes.rows[0]?.count ?? 0;

    const sanctionsRisk = Math.min(100, pendingHits * 35);
    const exportRisk = Math.min(100, pendingDeemed * 25);
    const cfiusRisk = 12.0;
    const customsRisk = 14.0;
    const disclosureRisk = Math.min(100, pendingVsd * 30);

    const { ctsriScore, tier } = computeCompositeTradeSanctionsRiskIndex(
      sanctionsRisk,
      exportRisk,
      cfiusRisk,
      customsRisk,
      disclosureRisk
    );

    return {
      ctsriScore,
      ctsriRiskTier: tier,
      sanctionsRiskComponent: sanctionsRisk,
      exportControlRiskComponent: exportRisk,
      cfiusRiskComponent: cfiusRisk,
      customsDutyRiskComponent: customsRisk,
      disclosureGovernanceComponent: disclosureRisk,
      activeSanctionsScreeningCount: sdnRes.rows[0]?.count ?? 0,
      pendingSanctionsHitsCount: pendingHits,
      activeEccnClassificationsCount: eccnRes.rows[0]?.count ?? 0,
      activeDeemedExportLicensesCount: pendingDeemed,
      activeCfiusAssessmentsCount: cfiusRes.rows[0]?.count ?? 0,
      activeNsmaAgreementsCount: nsmaRes.rows[0]?.count ?? 0,
      activeHtsCatalogItemsCount: htsRes.rows[0]?.count ?? 0,
      pendingVsdFilingsCount: pendingVsd,
      lastUpdated: new Date().toISOString(),
    };
  }

  async executeSanctionsScreening(
    userId: string,
    req: SanctionsScreeningRequestDTO
  ): Promise<SanctionsScreeningResultDTO> {
    await this.ensureSchema();

    const knownSanctionedEntities = [
      { name: 'Vnesheconombank', source: 'ofac_sdn', ref: 'EO 14024 Directive 1 / 31 CFR Part 587' },
      { name: 'Huawei Technologies Co., Ltd.', source: 'bis_entity_list', ref: 'Supp No 4 to Part 744' },
      { name: 'Islamic Revolutionary Guard Corps', source: 'ofac_sdn', ref: '31 CFR Part 594' },
      { name: 'Rostec State Corporation', source: 'eu_financial_sanctions', ref: 'Council Reg 269/2014' },
      { name: 'Semiconductor Manufacturing International Corp', source: 'bis_entity_list', ref: '15 CFR 744.11' },
      { name: 'Sovcomflot', source: 'ofac_sdn', ref: 'EO 14024 Maritime Sanctions' }
    ];

    const directHits = [];
    for (const target of knownSanctionedEntities) {
      const match = computeSanctionsCompositeScore(req.queryName, target.name);
      if (match.compositeScore >= 0.70) {
        directHits.push({
          id: crypto.randomUUID(),
          listSource: target.source as any,
          entityName: target.name,
          aliases: [],
          matchedField: 'legal_name' as const,
          scoreLevenshtein: match.scoreLevenshtein,
          scoreJaroWinkler: match.scoreJaroWinkler,
          scorePhonetic: match.scorePhonetic,
          compositeSimilarityScore: match.compositeScore,
          confidence: match.compositeScore >= 0.85 ? ('high_probable' as const) : ('medium_review_required' as const),
          regulatoryReference: target.ref,
        });
      }
    }

    let aggregateBlockedFraction = 0;
    let isBlockedBy50 = false;
    if (req.beneficialOwnershipRoot) {
      const eval50 = evaluateOfacFiftyPercentRule(req.beneficialOwnershipRoot);
      aggregateBlockedFraction = eval50.aggregateBlockedFraction;
      isBlockedBy50 = eval50.isBlockedByLaw;
    }

    const maxDirectScore = directHits.reduce((max, h) => Math.max(max, h.compositeSimilarityScore * 100), 0);
    const countryRiskWeight = ['RU', 'IR', 'KP', 'SY', 'BY', 'CU'].includes(req.countryCode.toUpperCase()) ? 100 : 20;
    const ssei = computeSecondarySanctionsExposureIndex(
      maxDirectScore,
      aggregateBlockedFraction,
      countryRiskWeight,
      30
    );

    let riskTier = 'tier_1_elite_zero_defect';
    if (maxDirectScore >= 85 || isBlockedBy50 || ssei >= 70) {
      riskTier = 'tier_4_critical_board_escalation';
    } else if (ssei >= 40) {
      riskTier = 'tier_3_elevated_remediation';
    } else if (ssei >= 15) {
      riskTier = 'tier_2_managed_exposure';
    }

    let recommendedAction: 'immediate_freeze_report' | 'enhanced_due_diligence' | 'cleared' = 'cleared';
    if (maxDirectScore >= 85 || isBlockedBy50) {
      recommendedAction = 'immediate_freeze_report';
    } else if (directHits.length > 0 || ssei >= 40) {
      recommendedAction = 'enhanced_due_diligence';
    }

    const insertScreening = await this.pool.query(
      `INSERT INTO trade_sanctions_screenings (
        user_id, query_name, country_code, registration_number, industry_sector,
        aggregate_blocked_ownership, is_blocked_by_fifty_percent,
        secondary_sanctions_index, risk_tier, recommended_action
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, screened_at`,
      [
        userId,
        req.queryName,
        req.countryCode,
        req.registrationNumber || null,
        req.industrySector || null,
        aggregateBlockedFraction * 100,
        isBlockedBy50,
        ssei,
        riskTier,
        recommendedAction,
      ]
    );

    const screeningId = insertScreening.rows[0].id;
    const screenedAt = insertScreening.rows[0].screened_at.toISOString();

    for (const hit of directHits) {
      await this.pool.query(
        `INSERT INTO trade_sanctions_hits (
          user_id, screening_id, list_source, entity_name, matched_field,
          score_levenshtein, score_jaro_winkler, score_phonetic,
          composite_similarity_score, confidence, regulatory_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          screeningId,
          hit.listSource,
          hit.entityName,
          hit.matchedField,
          hit.scoreLevenshtein,
          hit.scoreJaroWinkler,
          hit.scorePhonetic,
          hit.compositeSimilarityScore,
          hit.confidence,
          hit.regulatoryReference,
        ]
      );
    }

    return {
      screeningId,
      screenedAt,
      queryName: req.queryName,
      directMatches: directHits,
      aggregateBlockedOwnership: Math.round(aggregateBlockedFraction * 10000) / 100,
      isBlockedByFiftyPercentRule: isBlockedBy50,
      secondarySanctionsExposureIndex: ssei,
      riskTier: riskTier as any,
      recommendedAction,
    };
  }

  async classifyEccnItem(
    userId: string,
    req: EccnClassificationRequestDTO
  ): Promise<EccnClassificationResultDTO> {
    await this.ensureSchema();

    const isSoftware =
      req.functionalDescription.toLowerCase().includes('software') ||
      req.itemName.toLowerCase().includes('daemon') ||
      req.itemName.toLowerCase().includes('sdk') ||
      req.itemName.toLowerCase().includes('app');

    const result = evaluateEccnEncryptionClassification({
      isSoftware,
      symmetricBits: req.implementsSymmetricEncryption ? req.symmetricKeyLengthBits : 0,
      asymmetricBits: req.implementsAsymmetricEncryption ? req.asymmetricKeyLengthBits : 0,
      ellipticBits: req.implementsEllipticCurve ? req.ellipticCurveBits : 0,
      isMassMarket: req.isMassMarketRetailAvailable,
      destinationCountry: req.destinationCountry,
    });

    const justification = `Item evaluated under EAR Category 5 Part 2. Cryptographic key lengths: Symmetric=${req.symmetricKeyLengthBits}b, Asymmetric=${req.asymmetricKeyLengthBits}b. Mass market test: ${req.isMassMarketRetailAvailable ? 'Satisfied under Note 3' : 'Not satisfied'}. Final ECCN: ${result.assignedEccn}.`;

    const ins = await this.pool.query(
      `INSERT INTO trade_eccn_classifications (
        user_id, item_name, functional_description, assigned_eccn,
        encryption_level, applicable_license_exception, symmetric_key_bits,
        asymmetric_key_bits, elliptic_curve_bits, is_mass_market,
        requires_semi_annual_reporting, requires_export_license,
        destination_country, determination_justification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        userId,
        req.itemName,
        req.functionalDescription,
        result.assignedEccn,
        result.encryptionLevel,
        result.exception,
        req.symmetricKeyLengthBits,
        req.asymmetricKeyLengthBits,
        req.ellipticCurveBits,
        req.isMassMarketRetailAvailable,
        result.requiresReporting,
        result.requiresLicense,
        req.destinationCountry,
        justification,
      ]
    );

    return {
      classificationId: ins.rows[0].id,
      itemId: req.itemId,
      assignedEccn: result.assignedEccn,
      reasonForControl: ['National Security (NS)', 'Anti-Terrorism (AT)'],
      encryptionLevel: result.encryptionLevel,
      applicableLicenseException: result.exception,
      requiresSemiAnnualReporting: result.requiresReporting,
      requiresExportLicense: result.requiresLicense,
      determinationJustification: justification,
    };
  }

  async auditDeemedExport(
    userId: string,
    req: DeemedExportAuditRequestDTO
  ): Promise<DeemedExportAuditResultDTO> {
    await this.ensureSchema();

    let countryGroup: EarCountryGroup = 'group_b_general';
    const c = req.citizenshipCountry.toUpperCase();
    if (['CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'NZ', 'NL'].includes(c)) countryGroup = 'group_a_allies';
    else if (['CN', 'RU', 'VN', 'AM', 'AZ', 'BY'].includes(c)) countryGroup = 'group_d_1_national_security';
    else if (['IR', 'KP', 'SY', 'CU'].includes(c)) countryGroup = 'group_e_1_terrorist_supporting';

    const { score, requiresLicense } = computeDeemedExportExposure({
      isUsPerson: req.isUsPerson,
      countryGroup,
      controlledEccn: req.accessedEccn,
      scope: req.technicalDataScope,
    });

    let actionRequired: 'license_mandated_before_access' | 'technology_transfer_plan_required' | 'access_granted' = 'access_granted';
    if (requiresLicense) {
      actionRequired = 'license_mandated_before_access';
    } else if (score >= 40) {
      actionRequired = 'technology_transfer_plan_required';
    }

    const ins = await this.pool.query(
      `INSERT INTO trade_deemed_export_licenses (
        user_id, employee_id, employee_name, citizenship_country,
        permanent_residency_country, is_us_person, accessed_eccn,
        technical_data_scope, ear_country_group, deemed_export_exposure_score,
        requires_deemed_export_license, action_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        userId,
        req.employeeId,
        req.employeeName,
        req.citizenshipCountry,
        req.permanentResidencyCountry || null,
        req.isUsPerson,
        req.accessedEccn,
        req.technicalDataScope,
        countryGroup,
        score,
        requiresLicense,
        actionRequired,
      ]
    );

    return {
      auditId: ins.rows[0].id,
      employeeId: req.employeeId,
      citizenshipCountry: req.citizenshipCountry,
      earCountryGroup: countryGroup,
      deemedExportExposureScore: score,
      requiresDeemedExportLicense: requiresLicense,
      licenseExceptionAvailable: requiresLicense ? undefined : 'enc_740_17_b1',
      actionRequired,
    };
  }

  async assessCfiusTransaction(
    userId: string,
    req: CfiusTidAssessmentRequestDTO
  ): Promise<CfiusTidAssessmentResultDTO> {
    await this.ensureSchema();

    const analysis = evaluateCfiusTidObligations({
      criticalTech: req.producesCriticalTechnology,
      criticalInfra: req.operatesCriticalInfrastructure,
      personalDataCount: req.sensitivePersonalDataRecordsCount,
      militaryTargets: req.targetsMilitaryOrIntelligencePersonnel,
      foreignGovVotingPct: req.foreignGovernmentVotingPercentage,
      foreignAcquisitionPct: req.foreignInvestorOwnershipPercentage,
      hasBoardSeat: req.foreignInvestorBoardSeats > 0,
      hasMaterialNonpublicAccess: req.foreignInvestorMaterialNonpublicAccess,
    });

    const mitigations: string[] = [];
    if (analysis.sensitiveThresholdExceeded) {
      mitigations.push('Establish independent US Data Governance Committee');
      mitigations.push('Exclude foreign national board observers from raw US user data access');
    }
    if (req.producesCriticalTechnology) {
      mitigations.push('Implement physical and logical access controls over 5D002 cryptographic source repositories');
    }
    if (analysis.isMandatoryFiling) {
      mitigations.push('Submit joint declaration 30 calendar days prior to closing under 31 CFR Part 800');
    }

    const ins = await this.pool.query(
      `INSERT INTO trade_cfius_tid_assessments (
        user_id, transaction_id, target_company_name, deal_value_usd,
        tid_status, sensitive_personal_data_records, sensitive_threshold_exceeded,
        is_covered_investment, foreign_investor_country, foreign_investor_ownership_pct,
        foreign_government_voting_pct, filing_requirement, national_security_risk_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id`,
      [
        userId,
        req.transactionId,
        req.targetCompanyName,
        req.dealValueUsd,
        analysis.tidStatus,
        req.sensitivePersonalDataRecordsCount,
        analysis.sensitiveThresholdExceeded,
        analysis.isCoveredInvestment,
        req.foreignInvestorCountry,
        req.foreignInvestorOwnershipPercentage,
        req.foreignGovernmentVotingPercentage,
        analysis.filingType,
        analysis.riskScore,
      ]
    );

    return {
      assessmentId: ins.rows[0].id,
      tidStatus: analysis.tidStatus,
      sensitiveDataThresholdExceeded: analysis.sensitiveThresholdExceeded,
      isCoveredInvestment: analysis.isCoveredInvestment,
      filingRequirement: analysis.filingType,
      statutorySafeHarborAvailable: !analysis.isMandatoryFiling && analysis.riskScore < 50,
      nationalSecurityRiskScore: analysis.riskScore,
      recommendedMitigationMeasures: mitigations,
    };
  }

  async calculateLandedDuty(
    userId: string,
    req: CustomsLandedDutyRequestDTO
  ): Promise<CustomsLandedDutyResultDTO> {
    await this.ensureSchema();

    const isChina = req.countryOfOrigin.toUpperCase() === 'CN';
    const mfnRate = 2.5;
    const s301Rate = isChina ? 25.0 : 0.0;
    const s232Rate = 0.0;

    const duty = computeCustomsDutyAndRvc({
      customsValueUsd: req.customsValueUsd,
      mfnRatePct: mfnRate,
      section301RatePct: s301Rate,
      section232RatePct: s232Rate,
      totalTransactionValueUsd: req.totalTransactionValueUsd,
      netCostUsd: req.netCostUsd,
      valueNonOriginatingMaterialsUsd: req.valueNonOriginatingMaterialsUsd,
      ftaCode: req.qualifyingFta,
    });

    const catalogIns = await this.pool.query(
      `INSERT INTO trade_hts_duty_catalog (
        user_id, part_number, description, hts_code, country_of_origin,
        general_mfn_rate_pct, section_301_rate_pct, section_232_rate_pct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id, part_number) DO UPDATE SET
        hts_code = EXCLUDED.hts_code,
        country_of_origin = EXCLUDED.country_of_origin,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id`,
      [
        userId,
        req.partNumber,
        req.description,
        req.htsCode,
        req.countryOfOrigin,
        mfnRate,
        s301Rate,
        s232Rate,
      ]
    );

    const htsItemId = catalogIns.rows[0].id;

    if (req.qualifyingFta) {
      await this.pool.query(
        `INSERT INTO trade_fta_qualifications (
          user_id, hts_item_id, fta_code, regional_value_content_tv,
          regional_value_content_nc, is_origin_qualified
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          htsItemId,
          req.qualifyingFta,
          duty.rvcTransactionValuePct,
          duty.rvcNetCostPct,
          duty.isFtaQualified,
        ]
      );
    }

    return {
      calculationId: crypto.randomUUID(),
      htsCode: req.htsCode,
      generalMfnDutyRate: mfnRate,
      section301DutyRate: s301Rate,
      section232DutyRate: s232Rate,
      ftaPreferentialDutyRate: duty.isFtaQualified ? 0.0 : mfnRate,
      dutySavedByFtaUsd: duty.ftaSavingsUsd,
      baseDutyAmountUsd: duty.baseDutyUsd,
      section301AmountUsd: duty.section301Usd,
      section232AmountUsd: duty.section232Usd,
      totalDutyPayableUsd: duty.totalDutyPayableUsd,
      effectiveDutyRatePercentage: duty.effectiveDutyRatePct,
      regionalValueContentPercentage: duty.rvcTransactionValuePct,
      isFtaOriginQualified: duty.isFtaQualified,
    };
  }

  async compileVsdReport(
    userId: string,
    req: {
      vsdReferenceNumber: string;
      targetAuthority: string;
      title: string;
      suspectedRegulationBreach: string;
      incidentStartDate: string;
      incidentEndDate: string;
      estimatedTransactionsCount: number;
      estimatedTransactionVolumeUsd: number;
      narrativeSummary: string;
      rootCauseAnalysis: string;
      remedialActionsImplemented: string[];
    }
  ): Promise<VoluntarySelfDisclosureDTO> {
    await this.ensureSchema();

    const markdown = generateVsdDossierMarkdown({
      vsdReferenceNumber: req.vsdReferenceNumber,
      targetAuthority: req.targetAuthority,
      title: req.title,
      suspectedRegulationBreach: req.suspectedRegulationBreach,
      incidentStartDate: req.incidentStartDate,
      incidentEndDate: req.incidentEndDate,
      estimatedTransactionsCount: req.estimatedTransactionsCount,
      estimatedTransactionVolumeUsd: req.estimatedTransactionVolumeUsd,
      narrativeSummary: req.narrativeSummary,
      rootCauseAnalysis: req.rootCauseAnalysis,
      remedialActionsImplemented: req.remedialActionsImplemented,
    });

    const ins = await this.pool.query(
      `INSERT INTO trade_voluntary_self_disclosures (
        user_id, vsd_reference_number, target_authority, title,
        suspected_regulation_breach, incident_start_date, incident_end_date,
        estimated_transactions_count, estimated_transaction_volume_usd,
        narrative_summary, root_cause_analysis, remedial_actions_json,
        generated_markdown_report, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'draft')
      ON CONFLICT (user_id, vsd_reference_number) DO UPDATE SET
        title = EXCLUDED.title,
        suspected_regulation_breach = EXCLUDED.suspected_regulation_breach,
        incident_start_date = EXCLUDED.incident_start_date,
        incident_end_date = EXCLUDED.incident_end_date,
        estimated_transactions_count = EXCLUDED.estimated_transactions_count,
        estimated_transaction_volume_usd = EXCLUDED.estimated_transaction_volume_usd,
        narrative_summary = EXCLUDED.narrative_summary,
        root_cause_analysis = EXCLUDED.root_cause_analysis,
        remedial_actions_json = EXCLUDED.remedial_actions_json,
        generated_markdown_report = EXCLUDED.generated_markdown_report,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, created_at`,
      [
        userId,
        req.vsdReferenceNumber,
        req.targetAuthority,
        req.title,
        req.suspectedRegulationBreach,
        req.incidentStartDate,
        req.incidentEndDate,
        req.estimatedTransactionsCount,
        req.estimatedTransactionVolumeUsd,
        req.narrativeSummary,
        req.rootCauseAnalysis,
        JSON.stringify(req.remedialActionsImplemented),
        markdown,
      ]
    );

    return {
      id: ins.rows[0].id,
      vsdReferenceNumber: req.vsdReferenceNumber,
      targetAuthority: req.targetAuthority as any,
      title: req.title,
      suspectedRegulationBreach: req.suspectedRegulationBreach,
      incidentStartDate: req.incidentStartDate,
      incidentEndDate: req.incidentEndDate,
      estimatedTransactionsCount: req.estimatedTransactionsCount,
      estimatedTransactionVolumeUsd: req.estimatedTransactionVolumeUsd,
      narrativeSummary: req.narrativeSummary,
      rootCauseAnalysis: req.rootCauseAnalysis,
      remedialActionsImplemented: req.remedialActionsImplemented,
      generatedMarkdownReport: markdown,
      status: 'draft',
    };
  }

  async executeSignoff(
    userId: string,
    req: {
      vsdId: string;
      role: 'head_of_global_trade_compliance' | 'chief_legal_officer' | 'chief_executive_officer';
      signerName: string;
      signatureHash: string;
    }
  ): Promise<{ status: string; totalSignoffs: number; isFullySigned: boolean }> {
    await this.ensureSchema();

    await this.pool.query(
      `INSERT INTO trade_tripartite_signoffs (
        user_id, vsd_id, role, signer_name, signature_hash
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (vsd_id, role) DO UPDATE SET
        signer_name = EXCLUDED.signer_name,
        signature_hash = EXCLUDED.signature_hash,
        signed_at = CURRENT_TIMESTAMP`,
      [userId, req.vsdId, req.role, req.signerName, req.signatureHash]
    );

    const countRes = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM trade_tripartite_signoffs WHERE vsd_id = $1`,
      [req.vsdId]
    );

    const total = countRes.rows[0].count;
    const isFullySigned = total >= 3;

    if (isFullySigned) {
      await this.pool.query(
        `UPDATE trade_voluntary_self_disclosures
         SET status = 'tripartite_pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2`,
        [req.vsdId, userId]
      );
    }

    return {
      status: isFullySigned ? 'tripartite_approved' : 'signature_recorded',
      totalSignoffs: total,
      isFullySigned,
    };
  }
}
