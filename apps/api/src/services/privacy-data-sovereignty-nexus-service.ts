import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type CrossBorderTransfer,
  type TransferImpactAssessment,
  type DsrRequest,
  type DsrOrchestrationTask,
  type RopaActivity,
  type DpiaAssessment,
  type DpiaRiskItem,
  type AiCorpusLineage,
  type SyntheticDataset,
  type RegulatoryFineModel,
  type BoardRatification,
  type PrivacyAuditEvent,
  type PrivacyNexusOverview,
  type EvaluateTransferInput,
  type CreateDsrRequestInput,
  type TriggerDsrExtensionInput,
  type CreateRopaActivityInput,
  type CreateDpiaAssessmentInput,
  type RegisterAiCorpusInput,
  type GenerateSyntheticDatasetInput,
  type SignTripartiteRatificationInput,
  calculateTransferRiskIndex,
  evaluateStatutorySlaCountdown,
  calculateDpiaResidualRisk,
  calculateDifferentialPrivacyLeakage,
  calculateMultiJurisdictionalFineExposure,
  computeTripartiteSha256Seal
} from '@jobtrack/contract';

export class PrivacyDataSovereigntyNexusService {
  private pool: Pool;
  private schemaInitialized = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS privacy_cross_border_transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corridor_code VARCHAR(64) NOT NULL,
        origin_country VARCHAR(3) NOT NULL,
        destination_country VARCHAR(3) NOT NULL,
        destination_jurisdiction_tier VARCHAR(64) NOT NULL,
        transfer_mechanism VARCHAR(64) NOT NULL,
        legal_instrument_reference VARCHAR(255) NOT NULL,
        data_sensitivity_category VARCHAR(64) NOT NULL,
        supplementary_technical_measure VARCHAR(64) NOT NULL,
        annual_data_subject_volume BIGINT NOT NULL DEFAULT 0,
        transfer_risk_index NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        risk_tier VARCHAR(32) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pcbt_user ON privacy_cross_border_transfers(user_id);

      CREATE TABLE IF NOT EXISTS privacy_transfer_impact_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        transfer_id UUID NOT NULL REFERENCES privacy_cross_border_transfers(id) ON DELETE CASCADE,
        assessment_reference VARCHAR(64) NOT NULL,
        destination_surveillance_laws TEXT NOT NULL,
        fisa_section_702_applicable BOOLEAN NOT NULL DEFAULT FALSE,
        executive_order_1233_applicable BOOLEAN NOT NULL DEFAULT FALSE,
        dpf_self_certified BOOLEAN NOT NULL DEFAULT FALSE,
        dpf_registration_identifier VARCHAR(128),
        supplementary_contractual_measures TEXT NOT NULL,
        supplementary_organizational_measures TEXT NOT NULL,
        dpo_assessment_verdict VARCHAR(64) NOT NULL,
        dpo_signed_by VARCHAR(255) NOT NULL,
        dpo_signed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        next_review_due_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ptia_user ON privacy_transfer_impact_assessments(user_id);

      CREATE TABLE IF NOT EXISTS privacy_dsr_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ticket_reference VARCHAR(64) NOT NULL,
        subject_identifier VARCHAR(255) NOT NULL,
        subject_email VARCHAR(255) NOT NULL,
        regulatory_framework VARCHAR(32) NOT NULL,
        request_type VARCHAR(32) NOT NULL,
        identity_verification_status VARCHAR(32) NOT NULL DEFAULT 'unverified',
        identity_verification_method VARCHAR(64) NOT NULL,
        verification_evidence_digest VARCHAR(64),
        statutory_sla_days INT NOT NULL DEFAULT 30,
        statutory_deadline_at TIMESTAMPTZ NOT NULL,
        is_extension_triggered BOOLEAN NOT NULL DEFAULT FALSE,
        extension_reason TEXT,
        extended_deadline_at TIMESTAMPTZ,
        status VARCHAR(32) NOT NULL DEFAULT 'intake',
        orchestration_progress_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pdsr_user ON privacy_dsr_requests(user_id);

      CREATE TABLE IF NOT EXISTS privacy_dsr_orchestration_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dsr_request_id UUID NOT NULL REFERENCES privacy_dsr_requests(id) ON DELETE CASCADE,
        subsystem_target VARCHAR(64) NOT NULL,
        subsystem_type VARCHAR(32) NOT NULL,
        action_type VARCHAR(32) NOT NULL,
        tombstone_record_key VARCHAR(255),
        execution_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        retry_count INT NOT NULL DEFAULT 0,
        records_impacted BIGINT NOT NULL DEFAULT 0,
        executed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pdot_user ON privacy_dsr_orchestration_tasks(user_id);

      CREATE TABLE IF NOT EXISTS privacy_ropa_activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        activity_code VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_unit VARCHAR(128) NOT NULL,
        process_owner VARCHAR(255) NOT NULL,
        processing_purpose VARCHAR(512) NOT NULL,
        gdpr_article_6_basis VARCHAR(64) NOT NULL,
        gdpr_article_9_basis VARCHAR(64),
        data_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        special_categories_present BOOLEAN NOT NULL DEFAULT FALSE,
        data_subjects_category VARCHAR(128) NOT NULL,
        recipient_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        cross_border_transfer_involved BOOLEAN NOT NULL DEFAULT FALSE,
        transfer_corridor_id UUID REFERENCES privacy_cross_border_transfers(id) ON DELETE SET NULL,
        retention_period_months INT NOT NULL DEFAULT 12,
        retention_legal_ground VARCHAR(255) NOT NULL,
        technical_security_measures JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_dpia_required BOOLEAN NOT NULL DEFAULT FALSE,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_ropa_user ON privacy_ropa_activities(user_id);

      CREATE TABLE IF NOT EXISTS privacy_dpia_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ropa_activity_id UUID NOT NULL REFERENCES privacy_ropa_activities(id) ON DELETE CASCADE,
        dpia_reference VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        systematic_monitoring_flag BOOLEAN NOT NULL DEFAULT FALSE,
        large_scale_processing_flag BOOLEAN NOT NULL DEFAULT FALSE,
        innovative_tech_flag BOOLEAN NOT NULL DEFAULT FALSE,
        vulnerable_subjects_flag BOOLEAN NOT NULL DEFAULT FALSE,
        automated_decision_flag BOOLEAN NOT NULL DEFAULT FALSE,
        inherent_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        control_effectiveness_factor NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
        residual_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        prior_consultation_required BOOLEAN NOT NULL DEFAULT FALSE,
        dpo_opinion TEXT NOT NULL,
        approval_status VARCHAR(32) NOT NULL DEFAULT 'draft',
        approved_by_dpo_at TIMESTAMPTZ,
        next_reassessment_due_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pdpia_user ON privacy_dpia_assessments(user_id);

      CREATE TABLE IF NOT EXISTS privacy_dpia_risk_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dpia_id UUID NOT NULL REFERENCES privacy_dpia_assessments(id) ON DELETE CASCADE,
        threat_scenario VARCHAR(255) NOT NULL,
        privacy_harm_type VARCHAR(64) NOT NULL,
        likelihood_rating INT NOT NULL,
        severity_rating INT NOT NULL,
        mitigation_controls TEXT NOT NULL,
        control_weight NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
        is_residual_acceptable BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pdri_user ON privacy_dpia_risk_items(user_id);

      CREATE TABLE IF NOT EXISTS privacy_ai_corpus_lineage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        corpus_identifier VARCHAR(64) NOT NULL,
        dataset_name VARCHAR(255) NOT NULL,
        origin_source_uri TEXT NOT NULL,
        collection_jurisdiction VARCHAR(3) NOT NULL,
        legal_basis_for_training VARCHAR(255) NOT NULL,
        consent_tracking_token VARCHAR(128),
        opt_out_mechanism_supported BOOLEAN NOT NULL DEFAULT TRUE,
        copyright_license_type VARCHAR(64) NOT NULL,
        text_data_mining_opt_out BOOLEAN NOT NULL DEFAULT FALSE,
        fair_use_four_factor_score NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
        pii_extraction_risk_score NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        eu_ai_act_article_10_compliant BOOLEAN NOT NULL DEFAULT FALSE,
        total_token_or_record_count BIGINT NOT NULL DEFAULT 0,
        governance_status VARCHAR(32) NOT NULL DEFAULT 'quarantined',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_paic_user ON privacy_ai_corpus_lineage(user_id);

      CREATE TABLE IF NOT EXISTS privacy_synthetic_datasets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_corpus_id UUID REFERENCES privacy_ai_corpus_lineage(id) ON DELETE SET NULL,
        dataset_code VARCHAR(64) NOT NULL,
        synthesis_algorithm VARCHAR(64) NOT NULL,
        epsilon_budget_spent NUMERIC(8, 5) NOT NULL,
        delta_bound_parameter NUMERIC(14, 12) NOT NULL,
        noise_mechanism VARCHAR(32) NOT NULL,
        wasserstein_utility_score NUMERIC(5, 2) NOT NULL,
        membership_inference_advantage NUMERIC(6, 4) NOT NULL,
        differential_privacy_certified BOOLEAN NOT NULL DEFAULT FALSE,
        synthetic_record_count BIGINT NOT NULL DEFAULT 0,
        storage_s3_bucket VARCHAR(128) NOT NULL,
        storage_s3_key TEXT NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_psd_user ON privacy_synthetic_datasets(user_id);

      CREATE TABLE IF NOT EXISTS privacy_regulatory_fine_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        model_reference VARCHAR(64) NOT NULL,
        jurisdiction_code VARCHAR(16) NOT NULL,
        regulatory_framework VARCHAR(32) NOT NULL,
        annual_global_turnover_eur NUMERIC(16, 2) NOT NULL,
        turnover_rate_pct NUMERIC(4, 2) NOT NULL,
        statutory_ceiling_eur NUMERIC(16, 2) NOT NULL,
        active_breach_records_count BIGINT NOT NULL DEFAULT 0,
        intentional_infractions_count INT NOT NULL DEFAULT 0,
        unintentional_infractions_count INT NOT NULL DEFAULT 0,
        statutory_max_fine_eur NUMERIC(16, 2) NOT NULL,
        cooperation_mitigation_credit NUMERIC(4, 3) NOT NULL DEFAULT 0.000,
        expected_regulatory_exposure_eur NUMERIC(16, 2) NOT NULL,
        calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_prfm_user ON privacy_regulatory_fine_models(user_id);

      CREATE TABLE IF NOT EXISTS privacy_board_ratifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cycle_code VARCHAR(64) NOT NULL,
        reporting_period VARCHAR(32) NOT NULL,
        tri_composite_index NUMERIC(5, 2) NOT NULL,
        dpia_high_risk_open_count INT NOT NULL DEFAULT 0,
        dsr_sla_compliance_pct NUMERIC(5, 2) NOT NULL,
        total_regulatory_fine_exposure_eur NUMERIC(16, 2) NOT NULL,
        dpo_full_name VARCHAR(255) NOT NULL,
        dpo_signed_at TIMESTAMPTZ,
        cpo_full_name VARCHAR(255) NOT NULL,
        cpo_signed_at TIMESTAMPTZ,
        ceo_full_name VARCHAR(255) NOT NULL,
        ceo_signed_at TIMESTAMPTZ,
        tripartite_seal_sha256 VARCHAR(64) NOT NULL,
        ratification_status VARCHAR(32) NOT NULL DEFAULT 'pending_dpo',
        board_submission_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pbr_user ON privacy_board_ratifications(user_id);

      CREATE TABLE IF NOT EXISTS privacy_audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_category VARCHAR(48) NOT NULL,
        event_action VARCHAR(64) NOT NULL,
        entity_table VARCHAR(64) NOT NULL,
        entity_id UUID NOT NULL,
        actor_identifier VARCHAR(255) NOT NULL,
        actor_role VARCHAR(48) NOT NULL,
        client_ip_address VARCHAR(45) NOT NULL,
        correlation_id VARCHAR(64) NOT NULL,
        payload_before JSONB,
        payload_after JSONB,
        signature_digest VARCHAR(64) NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_pae_user ON privacy_audit_events(user_id);
    `);

    this.schemaInitialized = true;
  }

  async getOverview(userId: string): Promise<PrivacyNexusOverview> {
    await this.ensureSchema();
    await this.ensureDefaultSeedData(userId);

    const transfersRes = await this.pool.query(
      `SELECT * FROM privacy_cross_border_transfers WHERE user_id = $1 ORDER BY transfer_risk_index DESC`,
      [userId]
    );

    const dsrRes = await this.pool.query(
      `SELECT * FROM privacy_dsr_requests WHERE user_id = $1 ORDER BY statutory_deadline_at ASC`,
      [userId]
    );

    const ropaRes = await this.pool.query(
      `SELECT * FROM privacy_ropa_activities WHERE user_id = $1 ORDER BY activity_code ASC`,
      [userId]
    );

    const dpiaRes = await this.pool.query(
      `SELECT * FROM privacy_dpia_assessments WHERE user_id = $1 ORDER BY residual_risk_score DESC`,
      [userId]
    );

    const aiRes = await this.pool.query(
      `SELECT * FROM privacy_ai_corpus_lineage WHERE user_id = $1 ORDER BY corpus_identifier ASC`,
      [userId]
    );

    const synthRes = await this.pool.query(
      `SELECT * FROM privacy_synthetic_datasets WHERE user_id = $1 ORDER BY dataset_code ASC`,
      [userId]
    );

    const fineRes = await this.pool.query(
      `SELECT * FROM privacy_regulatory_fine_models WHERE user_id = $1 ORDER BY expected_regulatory_exposure_eur DESC`,
      [userId]
    );

    const ratifRes = await this.pool.query(
      `SELECT * FROM privacy_board_ratifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    const transfers: CrossBorderTransfer[] = transfersRes.rows.map(this.mapTransfer);
    const pendingDsrRequests: DsrRequest[] = dsrRes.rows.map(this.mapDsr);
    const ropaActivities: RopaActivity[] = ropaRes.rows.map(this.mapRopa);
    const dpiaAssessments: DpiaAssessment[] = dpiaRes.rows.map(this.mapDpia);
    const aiCorpora: AiCorpusLineage[] = aiRes.rows.map(this.mapAi);
    const syntheticDatasets: SyntheticDataset[] = synthRes.rows.map(this.mapSynthetic);
    const regulatoryFines: RegulatoryFineModel[] = fineRes.rows.map(this.mapFine);
    const latestRatification: BoardRatification | undefined = ratifRes.rows[0]
      ? this.mapRatification(ratifRes.rows[0])
      : undefined;

    const totalTri = transfers.reduce((acc, t) => acc + t.transferRiskIndex, 0);
    const compositeTransferRiskIndex = transfers.length > 0 ? Number((totalTri / transfers.length).toFixed(2)) : 0;

    const openDsr = pendingDsrRequests.filter((d) => d.status !== 'completed' && d.status !== 'rejected');
    const onTimeDsr = pendingDsrRequests.filter((d) => {
      const now = new Date();
      const deadline = new Date(d.extendedDeadlineAt || d.statutoryDeadlineAt);
      return deadline >= now || d.status === 'completed';
    });
    const dsrSlaAdherencePct =
      pendingDsrRequests.length > 0
        ? Number(((onTimeDsr.length / pendingDsrRequests.length) * 100).toFixed(1))
        : 100.0;

    const highRiskDpia = dpiaAssessments.filter(
      (d) => d.residualRiskScore > 50.0 || d.approvalStatus === 'prior_consultation_required'
    ).length;

    const aiApproved = aiCorpora.filter((a) => a.governanceStatus === 'production_approved').length;

    const totalFines = regulatoryFines.reduce(
      (acc, f) => acc + Number(f.expectedRegulatoryExposureEur),
      0
    );

    return {
      summary: {
        activeCorridorsCount: transfers.filter((t) => t.isActive).length,
        compositeTransferRiskIndex,
        openDsrRequestsCount: openDsr.length,
        dsrSlaAdherencePct,
        activeRopaActivitiesCount: ropaActivities.filter((r) => r.status === 'active').length,
        highRiskDpiaPendingCount: highRiskDpia,
        aiCorpusApprovedCount: aiApproved,
        totalRegulatoryFineExposureEur: Number(totalFines.toFixed(2)),
        currentRatificationStatus: latestRatification?.ratificationStatus || 'pending_dpo'
      },
      transfers,
      pendingDsrRequests,
      ropaActivities,
      dpiaAssessments,
      aiCorpora,
      syntheticDatasets,
      regulatoryFines,
      latestRatification
    };
  }

  async evaluateTransfer(userId: string, input: EvaluateTransferInput): Promise<CrossBorderTransfer> {
    await this.ensureSchema();
    const evaluation = calculateTransferRiskIndex({
      destinationJurisdictionTier: input.destinationJurisdictionTier,
      transferMechanism: input.transferMechanism,
      supplementaryTechnicalMeasure: input.supplementaryTechnicalMeasure,
      dataSensitivityCategory: input.dataSensitivityCategory,
      annualDataSubjectVolume: input.annualDataSubjectVolume
    });

    const id = randomUUID();
    const now = new Date().toISOString();

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_cross_border_transfers (
        id, user_id, corridor_code, origin_country, destination_country,
        destination_jurisdiction_tier, transfer_mechanism, legal_instrument_reference,
        data_sensitivity_category, supplementary_technical_measure,
        annual_data_subject_volume, transfer_risk_index, risk_tier, is_active,
        last_evaluated_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        id,
        userId,
        input.corridorCode,
        input.originCountry,
        input.destinationCountry,
        input.destinationJurisdictionTier,
        input.transferMechanism,
        input.legalInstrumentReference,
        input.dataSensitivityCategory,
        input.supplementaryTechnicalMeasure,
        input.annualDataSubjectVolume,
        evaluation.transferRiskIndex,
        evaluation.riskTier,
        true,
        now,
        now,
        now
      ]
    );

    return this.mapTransfer(insertRes.rows[0]);
  }

  async createDsrRequest(userId: string, input: CreateDsrRequestInput): Promise<DsrRequest> {
    await this.ensureSchema();
    const id = randomUUID();
    const ticketRef = `DSR-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const statutoryDays = input.regulatoryFramework === 'ccpa_cpra_us' ? 45 : 30;
    const deadline = new Date(now.getTime() + statutoryDays * 86400000);

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_dsr_requests (
        id, user_id, ticket_reference, subject_identifier, subject_email,
        regulatory_framework, request_type, identity_verification_status,
        identity_verification_method, statutory_sla_days, statutory_deadline_at,
        is_extension_triggered, status, orchestration_progress_pct, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id,
        userId,
        ticketRef,
        input.subjectIdentifier,
        input.subjectEmail,
        input.regulatoryFramework,
        input.requestType,
        'ial2_verified',
        input.identityVerificationMethod,
        statutoryDays,
        deadline.toISOString(),
        false,
        'orchestrating',
        25.0,
        now.toISOString(),
        now.toISOString()
      ]
    );

    return this.mapDsr(insertRes.rows[0]);
  }

  async triggerDsrExtension(userId: string, input: TriggerDsrExtensionInput): Promise<DsrRequest> {
    await this.ensureSchema();
    const selectRes = await this.pool.query(
      `SELECT * FROM privacy_dsr_requests WHERE id = $1 AND user_id = $2`,
      [input.dsrRequestId, userId]
    );
    if (!selectRes.rows[0]) {
      throw new Error('DSR request not found');
    }

    const current = selectRes.rows[0];
    const initialDays = Number(current.statutory_sla_days) || 30;
    const bonusDays = current.regulatory_framework === 'ccpa_cpra_us' ? 45 : 60;
    const createdDate = new Date(current.created_at);
    const extendedDeadline = new Date(createdDate.getTime() + (initialDays + bonusDays) * 86400000);

    const updateRes = await this.pool.query(
      `UPDATE privacy_dsr_requests SET
        is_extension_triggered = TRUE,
        extension_reason = $1,
        extended_deadline_at = $2,
        status = 'extended',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *`,
      [input.extensionReason, extendedDeadline.toISOString(), input.dsrRequestId, userId]
    );

    return this.mapDsr(updateRes.rows[0]);
  }

  async createRopaActivity(userId: string, input: CreateRopaActivityInput): Promise<RopaActivity> {
    await this.ensureSchema();
    const id = randomUUID();
    const now = new Date().toISOString();

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_ropa_activities (
        id, user_id, activity_code, name, business_unit, process_owner,
        processing_purpose, gdpr_article_6_basis, gdpr_article_9_basis,
        data_categories, special_categories_present, data_subjects_category,
        recipient_categories, cross_border_transfer_involved, transfer_corridor_id,
        retention_period_months, retention_legal_ground, technical_security_measures,
        is_dpia_required, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        id,
        userId,
        input.activityCode,
        input.name,
        input.businessUnit,
        input.processOwner,
        input.processingPurpose,
        input.gdprArticle6Basis,
        input.gdprArticle9Basis || null,
        JSON.stringify(input.dataCategories),
        input.specialCategoriesPresent,
        input.dataSubjectsCategory,
        JSON.stringify(input.recipientCategories),
        input.crossBorderTransferInvolved,
        input.transferCorridorId || null,
        input.retentionPeriodMonths,
        input.retentionLegalGround,
        JSON.stringify(input.technicalSecurityMeasures),
        input.isDpiaRequired,
        'active',
        now,
        now
      ]
    );

    return this.mapRopa(insertRes.rows[0]);
  }

  async createDpiaAssessment(userId: string, input: CreateDpiaAssessmentInput): Promise<DpiaAssessment> {
    await this.ensureSchema();
    const triggersCount =
      (input.systematicMonitoringFlag ? 1 : 0) +
      (input.largeScaleProcessingFlag ? 1 : 0) +
      (input.innovativeTechFlag ? 1 : 0) +
      (input.vulnerableSubjectsFlag ? 1 : 0) +
      (input.automatedDecisionFlag ? 1 : 0);

    const evaluation = calculateDpiaResidualRisk(
      input.threatItems.map((t) => ({
        likelihood: t.likelihoodRating,
        severity: t.severityRating,
        controlWeight: t.controlWeight
      })),
      25.0,
      triggersCount
    );

    const dpiaId = randomUUID();
    const now = new Date();
    const reassessDate = new Date(now.getTime() + 180 * 86400000);

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_dpia_assessments (
        id, user_id, ropa_activity_id, dpia_reference, title,
        systematic_monitoring_flag, large_scale_processing_flag, innovative_tech_flag,
        vulnerable_subjects_flag, automated_decision_flag, inherent_risk_score,
        control_effectiveness_factor, residual_risk_score, prior_consultation_required,
        dpo_opinion, approval_status, next_reassessment_due_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        dpiaId,
        userId,
        input.ropaActivityId,
        input.dpiaReference,
        input.title,
        input.systematicMonitoringFlag,
        input.largeScaleProcessingFlag,
        input.innovativeTechFlag,
        input.vulnerableSubjectsFlag,
        input.automatedDecisionFlag,
        evaluation.inherentRiskScore,
        evaluation.controlEffectivenessFactor,
        evaluation.residualRiskScore,
        evaluation.priorConsultationRequired,
        input.dpoOpinion,
        evaluation.approvalStatus,
        reassessDate.toISOString(),
        now.toISOString(),
        now.toISOString()
      ]
    );

    for (const item of input.threatItems) {
      await this.pool.query(
        `INSERT INTO privacy_dpia_risk_items (
          id, user_id, dpia_id, threat_scenario, privacy_harm_type,
          likelihood_rating, severity_rating, mitigation_controls, control_weight,
          is_residual_acceptable, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          randomUUID(),
          userId,
          dpiaId,
          item.threatScenario,
          item.privacyHarmType,
          item.likelihoodRating,
          item.severityRating,
          item.mitigationControls,
          item.controlWeight,
          evaluation.residualRiskScore <= 50.0,
          now.toISOString(),
          now.toISOString()
        ]
      );
    }

    return this.mapDpia(insertRes.rows[0]);
  }

  async registerAiCorpus(userId: string, input: RegisterAiCorpusInput): Promise<AiCorpusLineage> {
    await this.ensureSchema();
    const id = randomUUID();
    const now = new Date().toISOString();

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_ai_corpus_lineage (
        id, user_id, corpus_identifier, dataset_name, origin_source_uri,
        collection_jurisdiction, legal_basis_for_training, consent_tracking_token,
        opt_out_mechanism_supported, copyright_license_type, text_data_mining_opt_out,
        fair_use_four_factor_score, pii_extraction_risk_score, eu_ai_act_article_10_compliant,
        total_token_or_record_count, governance_status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id,
        userId,
        input.corpusIdentifier,
        input.datasetName,
        input.originSourceUri,
        input.collectionJurisdiction,
        input.legalBasisForTraining,
        input.consentTrackingToken || null,
        input.optOutMechanismSupported,
        input.copyrightLicenseType,
        input.textDataMiningOptOut,
        input.fairUseFourFactorScore,
        input.piiExtractionRiskScore,
        input.euAiActArticle10Compliant,
        input.totalTokenOrRecordCount,
        input.euAiActArticle10Compliant && input.piiExtractionRiskScore < 20.0 ? 'production_approved' : 'quarantined',
        now,
        now
      ]
    );

    return this.mapAi(insertRes.rows[0]);
  }

  async generateSyntheticDataset(
    userId: string,
    input: GenerateSyntheticDatasetInput
  ): Promise<SyntheticDataset> {
    await this.ensureSchema();
    const id = randomUUID();
    const dpEval = calculateDifferentialPrivacyLeakage(
      input.epsilonBudgetSpent,
      input.deltaBoundParameter,
      0.08,
      1.0
    );

    const now = new Date().toISOString();

    const insertRes = await this.pool.query(
      `INSERT INTO privacy_synthetic_datasets (
        id, user_id, source_corpus_id, dataset_code, synthesis_algorithm,
        epsilon_budget_spent, delta_bound_parameter, noise_mechanism,
        wasserstein_utility_score, membership_inference_advantage,
        differential_privacy_certified, synthetic_record_count,
        storage_s3_bucket, storage_s3_key, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        id,
        userId,
        input.sourceCorpusId || null,
        input.datasetCode,
        input.synthesisAlgorithm,
        input.epsilonBudgetSpent,
        input.deltaBoundParameter,
        input.noiseMechanism,
        dpEval.wassersteinUtilityScore,
        dpEval.membershipInferenceAdvantageUpper,
        dpEval.isPrivacyPreserving,
        input.syntheticRecordCount,
        input.storageS3Bucket,
        input.storageS3Key,
        'active',
        now,
        now
      ]
    );

    return this.mapSynthetic(insertRes.rows[0]);
  }

  async signRatification(
    userId: string,
    input: SignTripartiteRatificationInput
  ): Promise<BoardRatification> {
    await this.ensureSchema();
    const selectRes = await this.pool.query(
      `SELECT * FROM privacy_board_ratifications WHERE id = $1 AND user_id = $2`,
      [input.ratificationId, userId]
    );
    if (!selectRes.rows[0]) {
      throw new Error('Board ratification record not found');
    }

    const row = selectRes.rows[0];
    const nowIso = new Date().toISOString();

    let dpoName = row.dpo_full_name;
    let dpoSigned = row.dpo_signed_at;
    let cpoName = row.cpo_full_name;
    let cpoSigned = row.cpo_signed_at;
    let ceoName = row.ceo_full_name;
    let ceoSigned = row.ceo_signed_at;
    let nextStatus = row.ratification_status;

    if (input.role === 'data_protection_officer') {
      dpoName = input.signatoryFullName;
      dpoSigned = nowIso;
      nextStatus = 'pending_cpo';
    } else if (input.role === 'chief_privacy_officer') {
      cpoName = input.signatoryFullName;
      cpoSigned = nowIso;
      nextStatus = 'pending_ceo';
    } else if (input.role === 'chief_executive_officer') {
      ceoName = input.signatoryFullName;
      ceoSigned = nowIso;
      nextStatus = 'fully_ratified';
    }

    const seal = computeTripartiteSha256Seal(
      row.cycle_code,
      Number(row.tri_composite_index),
      Number(row.total_regulatory_fine_exposure_eur),
      dpoName,
      cpoName,
      ceoName,
      nowIso
    );

    const updateRes = await this.pool.query(
      `UPDATE privacy_board_ratifications SET
        dpo_full_name = $1,
        dpo_signed_at = $2,
        cpo_full_name = $3,
        cpo_signed_at = $4,
        ceo_full_name = $5,
        ceo_signed_at = $6,
        tripartite_seal_sha256 = $7,
        ratification_status = $8,
        board_submission_notes = COALESCE($9, board_submission_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *`,
      [
        dpoName,
        dpoSigned,
        cpoName,
        cpoSigned,
        ceoName,
        ceoSigned,
        seal,
        nextStatus,
        input.notes || null,
        input.ratificationId,
        userId
      ]
    );

    return this.mapRatification(updateRes.rows[0]);
  }

  async resetDemoData(userId: string): Promise<void> {
    await this.ensureSchema();
    await this.pool.query(`DELETE FROM privacy_audit_events WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_board_ratifications WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_regulatory_fine_models WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_synthetic_datasets WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_ai_corpus_lineage WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_dpia_risk_items WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_dpia_assessments WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_ropa_activities WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_dsr_orchestration_tasks WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_dsr_requests WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_transfer_impact_assessments WHERE user_id = $1`, [userId]);
    await this.pool.query(`DELETE FROM privacy_cross_border_transfers WHERE user_id = $1`, [userId]);

    await this.seedEnterpriseData(userId);
  }

  private async ensureDefaultSeedData(userId: string): Promise<void> {
    const existing = await this.pool.query(
      `SELECT id FROM privacy_cross_border_transfers WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      await this.seedEnterpriseData(userId);
    }
  }

  private async seedEnterpriseData(userId: string): Promise<void> {
    const now = new Date();
    const nowIso = now.toISOString();

    const t1Id = randomUUID();
    const t2Id = randomUUID();
    const t3Id = randomUUID();
    const t4Id = randomUUID();

    await this.pool.query(
      `INSERT INTO privacy_cross_border_transfers (
        id, user_id, corridor_code, origin_country, destination_country,
        destination_jurisdiction_tier, transfer_mechanism, legal_instrument_reference,
        data_sensitivity_category, supplementary_technical_measure,
        annual_data_subject_volume, transfer_risk_index, risk_tier, is_active,
        last_evaluated_at, created_at, updated_at
      ) VALUES
        ($1, $5, 'EU-US-PROD-01', 'DEU', 'USA', 'dpf_certified_participant', 'eu_us_dpf_certified', 'DPF Self-Cert #US-882190', 'consumer_pii', 'eea_sovereign_hsm_encryption', 450000, 18.20, 'safe_harbor', TRUE, $6, $6, $6),
        ($2, $5, 'EU-GB-BACKUP', 'FRA', 'GBR', 'adequacy_recognized', 'adequacy_decision', 'EC Adequacy Decision 2021/1772', 'b2b_professional_contacts', 'provider_managed_kms', 120000, 8.40, 'safe_harbor', TRUE, $6, $6, $6),
        ($3, $5, 'EU-CN-ANALYTICS', 'IRL', 'CHN', 'authoritarian_unbounded_access', 'cac_security_assessment', 'CAC Outbound Security Approval #2026-SH-991', 'financial_geolocation', 'irreversible_tokenization', 65000, 39.80, 'managed_risk', TRUE, $6, $6, $6),
        ($4, $5, 'EU-IN-DEVELOPMENT', 'NLD', 'IND', 'moderate_safeguards_rule_of_law', 'scc_module_2_c2p', 'SCC 2021/914 Module 2 TIA V3', 'special_category_art_9_10', 'eea_sovereign_hsm_encryption', 25000, 28.50, 'managed_risk', TRUE, $6, $6, $6)`,
      [t1Id, t2Id, t3Id, t4Id, userId, nowIso]
    );

    const dsr1Id = randomUUID();
    const dsr2Id = randomUUID();
    const dsr3Id = randomUUID();

    const d1 = new Date(now.getTime() + 18 * 86400000).toISOString();
    const d2 = new Date(now.getTime() + 7 * 86400000).toISOString();
    const d3 = new Date(now.getTime() + 32 * 86400000).toISOString();

    await this.pool.query(
      `INSERT INTO privacy_dsr_requests (
        id, user_id, ticket_reference, subject_identifier, subject_email,
        regulatory_framework, request_type, identity_verification_status,
        identity_verification_method, statutory_sla_days, statutory_deadline_at,
        is_extension_triggered, status, orchestration_progress_pct, created_at, updated_at
      ) VALUES
        ($1, $4, 'DSR-884102', 'CUST-EU-9921', 'claire.bernard@paris-tech.fr', 'gdpr_eu', 'erasure_deletion', 'ial2_verified', 'bank_id_oidc_token', 30, $5, FALSE, 'orchestrating', 60.00, $8, $8),
        ($2, $4, 'DSR-884103', 'CUST-US-1029', 'david.miller@sf-venture.com', 'ccpa_cpra_us', 'access_portability', 'ial2_verified', 'nist_authenticator_ial2', 45, $6, FALSE, 'identity_verified', 30.00, $8, $8),
        ($3, $4, 'DSR-884104', 'CUST-DE-4412', 'wolfgang.schmidt@berlin-corp.de', 'gdpr_eu', 'rectification', 'token_confirmed', 'email_magic_link_totp', 30, $7, FALSE, 'intake', 10.00, $8, $8)`,
      [dsr1Id, dsr2Id, dsr3Id, userId, d1, d2, d3, nowIso]
    );

    const ropa1Id = randomUUID();
    const ropa2Id = randomUUID();
    const ropa3Id = randomUUID();

    await this.pool.query(
      `INSERT INTO privacy_ropa_activities (
        id, user_id, activity_code, name, business_unit, process_owner,
        processing_purpose, gdpr_article_6_basis, gdpr_article_9_basis,
        data_categories, special_categories_present, data_subjects_category,
        recipient_categories, cross_border_transfer_involved, transfer_corridor_id,
        retention_period_months, retention_legal_ground, technical_security_measures,
        is_dpia_required, status, created_at, updated_at
      ) VALUES
        ($1, $4, 'ROPA-ENG-01', 'Enterprise Talent Identity & Career Telemetry', 'Platform Engineering', 'VP Infrastructure', 'Real-time candidate profile discovery and AI applicant screening', 'contract_performance', NULL, '["career_history", "skills", "salary_expectations", "work_authorization"]'::jsonb, FALSE, 'Job Seekers & Platform Candidates', '["Hiring Enterprise Clients", "Cloud Hosting Infrastructure"]'::jsonb, TRUE, $5, 24, 'Statutory labor and recruitment record keeping', '["AES-256 GCM", "TLS 1.3 Strict", "Zero Trust IAM"]'::jsonb, TRUE, 'active', $7, $7),
        ($2, $4, 'ROPA-AI-02', 'Foundation Model Career Matching & Sentiment Synthesis', 'AI Research Lab', 'Head of AI Research', 'Autonomous resume tailoring and interview response semantic evaluation', 'legitimate_interests', NULL, '["interview_transcripts", "resume_variants", "evaluation_rubrics"]'::jsonb, FALSE, 'Enterprise Candidates', '["Internal Model Pipelines", "LLM Inference Nodes"]'::jsonb, TRUE, $6, 36, 'Legitimate interest in product safety and model efficacy under Art 6(1)(f)', '["Differential Privacy DP-SGD", "Homomorphic Encryption POC", "Air-Gapped Vault"]'::jsonb, TRUE, 'active', $7, $7),
        ($3, $4, 'ROPA-FIN-03', 'Cross-Border Contractor Payroll & Tax Compliance', 'Corporate Finance', 'Global Controller', 'Statutory payroll execution and cross-border withholding tax remittance', 'legal_obligation', NULL, '["bank_routing", "taxpayer_id", "gross_earnings", "statutory_withholding"]'::jsonb, TRUE, 'Global Contractors & Employees', '["Tax Authorities", "Banking Partners", "Payroll Processors"]'::jsonb, FALSE, NULL, 84, 'Statutory tax retention period under corporate finance law', '["Field-Level Tokenization", "Dual-Control Key Custody"]'::jsonb, FALSE, 'active', $7, $7)`,
      [ropa1Id, ropa2Id, ropa3Id, userId, t1Id, t2Id, nowIso]
    );

    const dpia1Id = randomUUID();
    const dpia2Id = randomUUID();

    const reassess1 = new Date(now.getTime() + 180 * 86400000).toISOString();
    const reassess2 = new Date(now.getTime() + 120 * 86400000).toISOString();

    await this.pool.query(
      `INSERT INTO privacy_dpia_assessments (
        id, user_id, ropa_activity_id, dpia_reference, title,
        systematic_monitoring_flag, large_scale_processing_flag, innovative_tech_flag,
        vulnerable_subjects_flag, automated_decision_flag, inherent_risk_score,
        control_effectiveness_factor, residual_risk_score, prior_consultation_required,
        dpo_opinion, approval_status, approved_by_dpo_at, next_reassessment_due_at, created_at, updated_at
      ) VALUES
        ($1, $3, $4, 'DPIA-2026-01', 'Algorithmic Candidate Ranking & Automated Profiling', TRUE, TRUE, TRUE, FALSE, TRUE, 80.00, 0.720, 24.80, FALSE, 'Approved under condition that continuous differential privacy auditing is enforced.', 'approved', $8, $6, $8, $8),
        ($2, $3, $5, 'DPIA-2026-02', 'High-Risk AI Interview Transcript Sentiment Extraction', FALSE, TRUE, TRUE, FALSE, FALSE, 72.00, 0.650, 31.40, FALSE, 'Under active DPO review pending verification of biometric data exclusion protocols.', 'under_dpo_review', NULL, $7, $8, $8)`,
      [dpia1Id, dpia2Id, userId, ropa1Id, ropa2Id, reassess1, reassess2, nowIso]
    );

    const corpus1Id = randomUUID();
    const corpus2Id = randomUUID();

    await this.pool.query(
      `INSERT INTO privacy_ai_corpus_lineage (
        id, user_id, corpus_identifier, dataset_name, origin_source_uri,
        collection_jurisdiction, legal_basis_for_training, consent_tracking_token,
        opt_out_mechanism_supported, copyright_license_type, text_data_mining_opt_out,
        fair_use_four_factor_score, pii_extraction_risk_score, eu_ai_act_article_10_compliant,
        total_token_or_record_count, governance_status, created_at, updated_at
      ) VALUES
        ($1, $3, 'CORPUS-CAREER-V4', 'Global Resume & Career Trajectory LLM Corpus', 's3://jobtrack-ai-lineage/curated-v4/', 'FRA', 'GDPR Art 6(1)(f) Legitimate Interest with Art 21 Opt-Out', 'CONSENT-HASH-99120', TRUE, 'Permissive Open Web & Proprietary Licenses', FALSE, 3.85, 14.20, TRUE, 6500000000, 'production_approved', $4, $4),
        ($2, $3, 'CORPUS-INTERVIEW-Q2', 'Synthetic Interview Dialogues & Scoring Benchmarks', 's3://jobtrack-ai-lineage/synthetic-v2/', 'DEU', 'GDPR Art 6(1)(a) Explicit User Consent', 'CONSENT-HASH-10492', TRUE, 'CC-BY-4.0 Enterprise Curated', FALSE, 4.00, 6.50, TRUE, 850000000, 'production_approved', $4, $4)`,
      [corpus1Id, corpus2Id, userId, nowIso]
    );

    await this.pool.query(
      `INSERT INTO privacy_synthetic_datasets (
        id, user_id, source_corpus_id, dataset_code, synthesis_algorithm,
        epsilon_budget_spent, delta_bound_parameter, noise_mechanism,
        wasserstein_utility_score, membership_inference_advantage,
        differential_privacy_certified, synthetic_record_count,
        storage_s3_bucket, storage_s3_key, status, created_at, updated_at
      ) VALUES
        ($1, $3, $4, 'SYNTH-BENCHMARK-2026', 'DP-PATE-GAN-Conditional', 0.75000, 0.000001000000, 'subsampled_gaussian_rdp', 91.50, 0.0820, TRUE, 1200000, 'jobtrack-synthetic-eu-west-1', 'benchmarks/2026/synth-v1.parquet', 'active', $5, $5),
        ($2, $3, $4, 'SYNTH-ATTR-EVAL-V1', 'Gaussian-Copula-DP', 1.12000, 0.000005000000, 'gaussian', 88.20, 0.1140, TRUE, 450000, 'jobtrack-synthetic-eu-west-1', 'benchmarks/2026/attributes-v1.parquet', 'active', $5, $5)`,
      [randomUUID(), randomUUID(), userId, corpus1Id, nowIso]
    );

    await this.pool.query(
      `INSERT INTO privacy_regulatory_fine_models (
        id, user_id, model_reference, jurisdiction_code, regulatory_framework,
        annual_global_turnover_eur, turnover_rate_pct, statutory_ceiling_eur,
        active_breach_records_count, intentional_infractions_count,
        unintentional_infractions_count, statutory_max_fine_eur,
        cooperation_mitigation_credit, expected_regulatory_exposure_eur,
        calculated_at, created_at, updated_at
      ) VALUES
        ($1, $4, 'FINE-GDPR-2026', 'EU', 'gdpr_eu', 1200000000.00, 4.00, 20000000.00, 0, 0, 1, 48000000.00, 0.450, 3960000.00, $5, $5, $5),
        ($2, $4, 'FINE-CCPA-2026', 'US-CA', 'ccpa_cpra_us', 1200000000.00, 0.00, 0.00, 2500, 0, 2, 1880000.00, 0.400, 103776.00, $5, $5, $5),
        ($3, $4, 'FINE-PIPL-2026', 'CN', 'china_pipl', 1200000000.00, 5.00, 6410256.00, 0, 0, 1, 9000000.00, 0.350, 456300.00, $5, $5, $5)`,
      [randomUUID(), randomUUID(), randomUUID(), userId, nowIso]
    );

    const initialSeal = computeTripartiteSha256Seal(
      'CYCLE-2026-Q4',
      23.7,
      4520076,
      'Dr. Hélène Rousseau, DPO',
      'Marcus Sterling, Esq., CPO',
      'Elena Rostova, CEO',
      nowIso
    );

    await this.pool.query(
      `INSERT INTO privacy_board_ratifications (
        id, user_id, cycle_code, reporting_period, tri_composite_index,
        dpia_high_risk_open_count, dsr_sla_compliance_pct, total_regulatory_fine_exposure_eur,
        dpo_full_name, dpo_signed_at, cpo_full_name, cpo_signed_at, ceo_full_name, ceo_signed_at,
        tripartite_seal_sha256, ratification_status, board_submission_notes, created_at, updated_at
      ) VALUES (
        $1, $2, 'CYCLE-2026-Q4', 'Q4 2026 Annual Privacy Audit', 23.70, 1, 94.50, 4520076.00,
        'Dr. Hélène Rousseau, DPO', $3, 'Marcus Sterling, Esq., CPO', NULL, 'Elena Rostova, CEO', NULL,
        $4, 'pending_cpo', 'Annual comprehensive data protection officer audit report presented to Board of Directors Audit Committee.', $3, $3
      )`,
      [randomUUID(), userId, nowIso, initialSeal]
    );
  }

  private mapTransfer(r: any): CrossBorderTransfer {
    return {
      id: r.id,
      userId: r.user_id,
      corridorCode: r.corridor_code,
      originCountry: r.origin_country,
      destinationCountry: r.destination_country,
      destinationJurisdictionTier: r.destination_jurisdiction_tier,
      transferMechanism: r.transfer_mechanism,
      legalInstrumentReference: r.legal_instrument_reference,
      dataSensitivityCategory: r.data_sensitivity_category,
      supplementaryTechnicalMeasure: r.supplementary_technical_measure,
      annualDataSubjectVolume: Number(r.annual_data_subject_volume),
      transferRiskIndex: Number(r.transfer_risk_index),
      riskTier: r.risk_tier,
      isActive: Boolean(r.is_active),
      lastEvaluatedAt: r.last_evaluated_at ? new Date(r.last_evaluated_at).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapDsr(r: any): DsrRequest {
    return {
      id: r.id,
      userId: r.user_id,
      ticketReference: r.ticket_reference,
      subjectIdentifier: r.subject_identifier,
      subjectEmail: r.subject_email,
      regulatoryFramework: r.regulatory_framework,
      requestType: r.request_type,
      identityVerificationStatus: r.identity_verification_status,
      identityVerificationMethod: r.identity_verification_method,
      verificationEvidenceDigest: r.verification_evidence_digest || undefined,
      statutorySlaDays: Number(r.statutory_sla_days),
      statutoryDeadlineAt: r.statutory_deadline_at ? new Date(r.statutory_deadline_at).toISOString() : new Date().toISOString(),
      isExtensionTriggered: Boolean(r.is_extension_triggered),
      extensionReason: r.extension_reason || undefined,
      extendedDeadlineAt: r.extended_deadline_at ? new Date(r.extended_deadline_at).toISOString() : undefined,
      status: r.status,
      orchestrationProgressPct: Number(r.orchestration_progress_pct),
      completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapRopa(r: any): RopaActivity {
    return {
      id: r.id,
      userId: r.user_id,
      activityCode: r.activity_code,
      name: r.name,
      businessUnit: r.business_unit,
      processOwner: r.process_owner,
      processingPurpose: r.processing_purpose,
      gdprArticle6Basis: r.gdpr_article_6_basis,
      gdprArticle9Basis: r.gdpr_article_9_basis || undefined,
      dataCategories: Array.isArray(r.data_categories) ? r.data_categories : JSON.parse(r.data_categories || '[]'),
      specialCategoriesPresent: Boolean(r.special_categories_present),
      dataSubjectsCategory: r.data_subjects_category,
      recipientCategories: Array.isArray(r.recipient_categories) ? r.recipient_categories : JSON.parse(r.recipient_categories || '[]'),
      crossBorderTransferInvolved: Boolean(r.cross_border_transfer_involved),
      transferCorridorId: r.transfer_corridor_id || undefined,
      retentionPeriodMonths: Number(r.retention_period_months),
      retentionLegalGround: r.retention_legal_ground,
      technicalSecurityMeasures: Array.isArray(r.technical_security_measures) ? r.technical_security_measures : JSON.parse(r.technical_security_measures || '[]'),
      isDpiaRequired: Boolean(r.is_dpia_required),
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapDpia(r: any): DpiaAssessment {
    return {
      id: r.id,
      userId: r.user_id,
      ropaActivityId: r.ropa_activity_id,
      dpiaReference: r.dpia_reference,
      title: r.title,
      systematicMonitoringFlag: Boolean(r.systematic_monitoring_flag),
      largeScaleProcessingFlag: Boolean(r.large_scale_processing_flag),
      innovativeTechFlag: Boolean(r.innovative_tech_flag),
      vulnerableSubjectsFlag: Boolean(r.vulnerable_subjects_flag),
      automatedDecisionFlag: Boolean(r.automated_decision_flag),
      inherentRiskScore: Number(r.inherent_risk_score),
      controlEffectivenessFactor: Number(r.control_effectiveness_factor),
      residualRiskScore: Number(r.residual_risk_score),
      priorConsultationRequired: Boolean(r.prior_consultation_required),
      dpoOpinion: r.dpo_opinion,
      approvalStatus: r.approval_status,
      approvedByDpoAt: r.approved_by_dpo_at ? new Date(r.approved_by_dpo_at).toISOString() : undefined,
      nextReassessmentDueAt: r.next_reassessment_due_at ? new Date(r.next_reassessment_due_at).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapAi(r: any): AiCorpusLineage {
    return {
      id: r.id,
      userId: r.user_id,
      corpusIdentifier: r.corpus_identifier,
      datasetName: r.dataset_name,
      originSourceUri: r.origin_source_uri,
      collectionJurisdiction: r.collection_jurisdiction,
      legalBasisForTraining: r.legal_basis_for_training,
      consentTrackingToken: r.consent_tracking_token || undefined,
      optOutMechanismSupported: Boolean(r.opt_out_mechanism_supported),
      copyrightLicenseType: r.copyright_license_type,
      textDataMiningOptOut: Boolean(r.text_data_mining_opt_out),
      fairUseFourFactorScore: Number(r.fair_use_four_factor_score),
      piiExtractionRiskScore: Number(r.pii_extraction_risk_score),
      euAiActArticle10Compliant: Boolean(r.euAiActArticle10_compliant || r.eu_ai_act_article_10_compliant),
      totalTokenOrRecordCount: Number(r.total_token_or_record_count),
      governanceStatus: r.governance_status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapSynthetic(r: any): SyntheticDataset {
    return {
      id: r.id,
      userId: r.user_id,
      sourceCorpusId: r.source_corpus_id || undefined,
      datasetCode: r.dataset_code,
      synthesisAlgorithm: r.synthesis_algorithm,
      epsilonBudgetSpent: Number(r.epsilon_budget_spent),
      deltaBoundParameter: Number(r.delta_bound_parameter),
      noiseMechanism: r.noise_mechanism,
      wassersteinUtilityScore: Number(r.wasserstein_utility_score),
      membershipInferenceAdvantage: Number(r.membership_inference_advantage),
      differentialPrivacyCertified: Boolean(r.differential_privacy_certified),
      syntheticRecordCount: Number(r.synthetic_record_count),
      storageS3Bucket: r.storage_s3_bucket,
      storageS3Key: r.storage_s3_key,
      status: r.status,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapFine(r: any): RegulatoryFineModel {
    return {
      id: r.id,
      userId: r.user_id,
      modelReference: r.model_reference,
      jurisdictionCode: r.jurisdiction_code,
      regulatoryFramework: r.regulatory_framework,
      annualGlobalTurnoverEur: Number(r.annual_global_turnover_eur),
      turnoverRatePct: Number(r.turnover_rate_pct),
      statutoryCeilingEur: Number(r.statutory_ceiling_eur),
      activeBreachRecordsCount: Number(r.active_breach_records_count),
      intentionalInfractionsCount: Number(r.intentional_infractions_count),
      unintentionalInfractionsCount: Number(r.unintentional_infractions_count),
      statutoryMaxFineEur: Number(r.statutory_max_fine_eur),
      cooperationMitigationCredit: Number(r.cooperation_mitigation_credit),
      expectedRegulatoryExposureEur: Number(r.expected_regulatory_exposure_eur),
      calculatedAt: r.calculated_at ? new Date(r.calculated_at).toISOString() : new Date().toISOString(),
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }

  private mapRatification(r: any): BoardRatification {
    return {
      id: r.id,
      userId: r.user_id,
      cycleCode: r.cycle_code,
      reportingPeriod: r.reporting_period,
      triCompositeIndex: Number(r.tri_composite_index),
      dpiaHighRiskOpenCount: Number(r.dpia_high_risk_open_count),
      dsrSlaCompliancePct: Number(r.dsr_sla_compliance_pct),
      totalRegulatoryFineExposureEur: Number(r.total_regulatory_fine_exposure_eur),
      dpoFullName: r.dpo_full_name,
      dpoSignedAt: r.dpo_signed_at ? new Date(r.dpo_signed_at).toISOString() : undefined,
      cpoFullName: r.cpo_full_name,
      cpoSignedAt: r.cpo_signed_at ? new Date(r.cpo_signed_at).toISOString() : undefined,
      ceoFullName: r.ceo_full_name,
      ceoSignedAt: r.ceo_signed_at ? new Date(r.ceo_signed_at).toISOString() : undefined,
      tripartiteSealSha256: r.tripartite_seal_sha256,
      ratificationStatus: r.ratification_status,
      boardSubmissionNotes: r.board_submission_notes || undefined,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString()
    };
  }
}
