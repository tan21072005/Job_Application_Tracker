import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type SoxInternalControlDTO,
  type SoxInternalControlMutationDTO,
  type EnterpriseRiskDTO,
  type EnterpriseRiskMutationDTO,
  type RiskHeatmapMatrixDTO,
  type CcmAuditEventDTO,
  type WhistleblowerReportDTO,
  type WhistleblowerReportIntakeDTO,
  type WhistleblowerTriageMutationDTO,
  type RemediationActionPlanDTO,
  type RemediationActionPlanMutationDTO,
  type SoxAuditCertificationDTO,
  type SoxTripartiteSignOffDTO,
  type AuditRiskHealthScoreDTO,
  type SecItem9AMemoRequestDTO,
  type SecItem9AMemoResponseDTO,
  type InternalAuditErmOverviewDTO,
  type ExecuteControlTestRequestDTO,
  type EvaluateSodRequestDTO,
  type RecordTripartiteSignOffRequestDTO,
  type CcmResolutionStatus,
  calculateResidualRisk,
  calculateSodSeverityIndex,
  calculateDeficiencyImpactWeight,
  calculateAuditRiskHealthScore,
  generateRiskHeatmapMatrix,
  generateSecItem9AMemoMarkdown
} from '@jobtrack/contract';

export class InternalAuditErmNexusService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS internal_audit_studios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enterprise_name VARCHAR(255) NOT NULL DEFAULT 'JobTrack Enterprise Holdings',
        arhs_score NUMERIC(5, 2) NOT NULL DEFAULT 88.50,
        arhs_band VARCHAR(64) NOT NULL DEFAULT 'substantial_compliance',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_internal_audit_studio_user UNIQUE (user_id)
      );

      CREATE TABLE IF NOT EXISTS sox_internal_controls (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        control_code VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        category VARCHAR(64) NOT NULL,
        nature VARCHAR(64) NOT NULL,
        frequency VARCHAR(64) NOT NULL,
        coso_principle VARCHAR(64) NOT NULL,
        primary_assertion VARCHAR(64) NOT NULL,
        control_owner VARCHAR(128) NOT NULL,
        testing_status VARCHAR(64) NOT NULL DEFAULT 'not_started',
        deficiency_classification VARCHAR(64) NOT NULL DEFAULT 'none',
        sample_size INT NOT NULL DEFAULT 25,
        exceptions_identified INT NOT NULL DEFAULT 0,
        mitigation_efficacy_factor NUMERIC(4, 3) NOT NULL DEFAULT 0.85,
        last_tested_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS enterprise_risks (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        risk_code VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(64) NOT NULL,
        inherent_likelihood INT NOT NULL,
        inherent_impact INT NOT NULL,
        inherent_score INT NOT NULL,
        residual_likelihood INT NOT NULL,
        residual_impact INT NOT NULL,
        residual_score NUMERIC(5, 2) NOT NULL,
        board_appetite_threshold INT NOT NULL DEFAULT 10,
        appetite_zone VARCHAR(64) NOT NULL,
        response_strategy VARCHAR(64) NOT NULL,
        mapped_control_codes JSONB NOT NULL DEFAULT '[]',
        max_potential_financial_loss_usd NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        risk_owner VARCHAR(128) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ccm_audit_events (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_code VARCHAR(64) NOT NULL,
        event_type VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL,
        actor_id VARCHAR(128) NOT NULL,
        actor_email VARCHAR(255) NOT NULL,
        resource_target VARCHAR(255) NOT NULL,
        sod_conflict_rule_id VARCHAR(64),
        privilege_distance NUMERIC(4, 2) NOT NULL DEFAULT 0.50,
        exposure_volume_usd NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        compensating_control_active BOOLEAN NOT NULL DEFAULT FALSE,
        sod_severity_score NUMERIC(5, 2) NOT NULL DEFAULT 25.0,
        resolution_status VARCHAR(64) NOT NULL DEFAULT 'detected',
        evidence_payload JSONB NOT NULL DEFAULT '{}',
        detected_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS whistleblower_reports (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        report_tracking_number VARCHAR(64) NOT NULL,
        category VARCHAR(64) NOT NULL,
        severity VARCHAR(32) NOT NULL,
        triage_status VARCHAR(64) NOT NULL DEFAULT 'intake',
        allegation_summary TEXT NOT NULL,
        involved_persons_masked JSONB NOT NULL DEFAULT '[]',
        estimated_financial_exposure_usd NUMERIC(16, 2) NOT NULL DEFAULT 0.00,
        legal_hold_active BOOLEAN NOT NULL DEFAULT FALSE,
        audit_committee_escalated BOOLEAN NOT NULL DEFAULT FALSE,
        assigned_lead_investigator VARCHAR(128),
        receipt_token_hash VARCHAR(128) NOT NULL,
        reported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS remediation_action_plans (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        capa_code VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        source_type VARCHAR(64) NOT NULL,
        source_reference_id VARCHAR(64) NOT NULL,
        action_owner VARCHAR(128) NOT NULL,
        target_remediation_date DATE NOT NULL,
        actual_completion_date DATE,
        status VARCHAR(64) NOT NULL DEFAULT 'open',
        compensating_controls_in_place TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sox_audit_certifications (
        id UUID PRIMARY KEY,
        studio_id UUID NOT NULL REFERENCES internal_audit_studios(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fiscal_period VARCHAR(32) NOT NULL,
        fiscal_year INT NOT NULL,
        overall_icfr_assessment VARCHAR(64) NOT NULL DEFAULT 'effective',
        arhs_score NUMERIC(5, 2) NOT NULL,
        arhs_health_band VARCHAR(64) NOT NULL,
        material_weakness_count INT NOT NULL DEFAULT 0,
        significant_deficiency_count INT NOT NULL DEFAULT 0,
        control_deficiency_count INT NOT NULL DEFAULT 0,
        sign_offs JSONB NOT NULL DEFAULT '[]',
        sec_item_9a_memo_markdown TEXT NOT NULL,
        certified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_sox_controls_user ON sox_internal_controls(user_id);
      CREATE INDEX IF NOT EXISTS idx_sox_controls_studio ON sox_internal_controls(studio_id);
      CREATE INDEX IF NOT EXISTS idx_erm_risks_user ON enterprise_risks(user_id);
      CREATE INDEX IF NOT EXISTS idx_ccm_events_user ON ccm_audit_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_wbh_reports_user ON whistleblower_reports(user_id);
      CREATE INDEX IF NOT EXISTS idx_capa_plans_user ON remediation_action_plans(user_id);
      CREATE INDEX IF NOT EXISTS idx_sox_certs_user ON sox_audit_certifications(user_id);
    `);
  }

  async ensureDefaults(userId: string): Promise<string> {
    await this.ensureSchema();
    const existing = await this.pool.query(
      `SELECT id FROM internal_audit_studios WHERE user_id = $1`,
      [userId]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    const studioId = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO internal_audit_studios (
        id, user_id, enterprise_name, arhs_score, arhs_band
      ) VALUES ($1, $2, $3, $4, $5)`,
      [studioId, userId, 'JobTrack Enterprise Holdings', 88.50, 'substantial_compliance']
    );

    const defaultControls = [
      {
        id: crypto.randomUUID(),
        code: 'ITGC-AC-01',
        title: 'Multi-Factor Authentication & IAM Least-Privilege Provisioning',
        desc: 'Enforces hardware MFA tokens and role-based access for all cloud control plane and production database endpoints.',
        cat: 'it_general_control',
        nat: 'preventive_automated',
        freq: 'continuous',
        p: 'p11_general_controls_tech',
        ass: 'existence_occurrence',
        owner: 'SRE & Cloud Security Director',
        stat: 'operating_effectively',
        def: 'none',
        sample: 50,
        exc: 0,
        eff: 0.95
      },
      {
        id: crypto.randomUUID(),
        code: 'ITGC-CM-02',
        title: 'CI/CD Change Management Gate & Peer Code Review Verification',
        desc: 'Surveils git commit chains requiring branch protection, two independent approvals, and automated security scans before deployment.',
        cat: 'it_general_control',
        nat: 'preventive_automated',
        freq: 'continuous',
        p: 'p11_general_controls_tech',
        ass: 'completeness',
        owner: 'VP of Platform Engineering',
        stat: 'operating_effectively',
        def: 'none',
        sample: 40,
        exc: 0,
        eff: 0.92
      },
      {
        id: crypto.randomUUID(),
        code: 'BPC-REV-01',
        title: 'ASC 606 Contract Revenue Cutoff & Automated Performance Obligation Matching',
        desc: 'Automates customer contract asset valuation and defers subscription revenue until delivery milestones are recorded.',
        cat: 'business_process',
        nat: 'detective_automated',
        freq: 'monthly',
        p: 'p10_select_control_activities',
        ass: 'valuation_allocation',
        owner: 'Corporate Controller',
        stat: 'operating_effectively',
        def: 'none',
        sample: 25,
        exc: 0,
        eff: 0.88
      },
      {
        id: crypto.randomUUID(),
        code: 'BPC-TRS-02',
        title: 'Dual-Authorization Corporate Treasury Wire Disbursements',
        desc: 'Requires independent cryptographic approvals for any external bank outflow exceeding $100,000 USD.',
        cat: 'business_process',
        nat: 'preventive_automated',
        freq: 'continuous',
        p: 'p10_select_control_activities',
        ass: 'rights_obligations',
        owner: 'Head of Global Treasury',
        stat: 'operating_effectively',
        def: 'none',
        sample: 30,
        exc: 0,
        eff: 0.94
      },
      {
        id: crypto.randomUUID(),
        code: 'ELC-ETH-01',
        title: 'Annual Code of Conduct Attestation & Whistleblower Policy Distribution',
        desc: 'Verifies 100% active employee attestation to anti-corruption, insider trading, and anonymous escalation channels.',
        cat: 'entity_level',
        nat: 'detective_manual',
        freq: 'annual',
        p: 'p01_integrity_ethical_values',
        ass: 'presentation_disclosure',
        owner: 'Chief Compliance Officer',
        stat: 'operating_effectively',
        def: 'none',
        sample: 100,
        exc: 1,
        eff: 0.80
      }
    ];

    for (const c of defaultControls) {
      await this.pool.query(
        `INSERT INTO sox_internal_controls (
          id, studio_id, user_id, control_code, title, description, category,
          nature, frequency, coso_principle, primary_assertion, control_owner,
          testing_status, deficiency_classification, sample_size, exceptions_identified,
          mitigation_efficacy_factor, last_tested_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)`,
        [
          c.id, studioId, userId, c.code, c.title, c.desc, c.cat,
          c.nat, c.freq, c.p, c.ass, c.owner,
          c.stat, c.def, c.sample, c.exc,
          c.eff
        ]
      );
    }

    const defaultRisks = [
      {
        id: crypto.randomUUID(),
        code: 'ERM-FIN-01',
        title: 'ASC 606 Revenue Recognition Timing Misstatement',
        cat: 'financial_reporting',
        lInh: 4,
        iInh: 4,
        scoreInh: 16,
        lRes: 2,
        iRes: 2,
        scoreRes: 4.80,
        appThresh: 8,
        zone: 'within_appetite_green',
        strategy: 'mitigate_controls',
        controls: ['BPC-REV-01'],
        loss: 4500000.00,
        owner: 'Chief Accounting Officer'
      },
      {
        id: crypto.randomUUID(),
        code: 'ERM-CYB-02',
        title: 'Cloud Infrastructure Privilege Escalation & Data Exfiltration',
        cat: 'cybersecurity_information',
        lInh: 4,
        iInh: 5,
        scoreInh: 20,
        lRes: 2,
        iRes: 3,
        scoreRes: 6.20,
        appThresh: 10,
        zone: 'within_appetite_green',
        strategy: 'mitigate_controls',
        controls: ['ITGC-AC-01', 'ITGC-CM-02'],
        loss: 12000000.00,
        owner: 'Chief Information Security Officer'
      },
      {
        id: crypto.randomUUID(),
        code: 'ERM-OPS-03',
        title: 'Single Depository Partner Liquidity Lockup & Bank Run Exposure',
        cat: 'operational_infrastructure',
        lInh: 3,
        iInh: 4,
        scoreInh: 12,
        lRes: 2,
        iRes: 2,
        scoreRes: 5.10,
        appThresh: 9,
        zone: 'within_appetite_green',
        strategy: 'mitigate_controls',
        controls: ['BPC-TRS-02'],
        loss: 8000000.00,
        owner: 'Corporate Treasurer'
      },
      {
        id: crypto.randomUUID(),
        code: 'ERM-REG-04',
        title: 'EU AI Act & Global Cross-Border Data Transfer Sanctions',
        cat: 'regulatory_compliance',
        lInh: 3,
        iInh: 3,
        scoreInh: 9,
        lRes: 2,
        iRes: 2,
        scoreRes: 4.20,
        appThresh: 10,
        zone: 'within_appetite_green',
        strategy: 'mitigate_controls',
        controls: ['ELC-ETH-01'],
        loss: 3500000.00,
        owner: 'General Counsel'
      }
    ];

    for (const r of defaultRisks) {
      await this.pool.query(
        `INSERT INTO enterprise_risks (
          id, studio_id, user_id, risk_code, title, category,
          inherent_likelihood, inherent_impact, inherent_score,
          residual_likelihood, residual_impact, residual_score,
          board_appetite_threshold, appetite_zone, response_strategy,
          mapped_control_codes, max_potential_financial_loss_usd, risk_owner
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          r.id, studioId, userId, r.code, r.title, r.cat,
          r.lInh, r.iInh, r.scoreInh,
          r.lRes, r.iRes, r.scoreRes,
          r.appThresh, r.zone, r.strategy,
          JSON.stringify(r.controls), r.loss, r.owner
        ]
      );
    }

    const defaultCcmEvents = [
      {
        id: crypto.randomUUID(),
        code: 'CCM-SOD-001',
        type: 'sod_conflict_detected',
        sev: 'medium',
        actor: 'user_fin_982',
        email: 'finance.lead@jobtrack.internal',
        target: 'erp_vendor_master / payment_run_batch',
        rule: 'SOD_RULE_VENDOR_CREATE_AND_DISBURSE',
        dist: 0.40,
        exp: 85000.00,
        comp: true,
        score: 32.5,
        stat: 'investigating',
        payload: { conflict: 'Vendor master creation authority combined with invoice release approval' }
      },
      {
        id: crypto.randomUUID(),
        code: 'CCM-ITGC-002',
        type: 'change_management_bypass',
        sev: 'low',
        actor: 'devops_deployer_01',
        email: 'devops-bot@jobtrack.internal',
        target: 'production_k8s_cluster',
        rule: 'ITGC_HOTFIX_UNLINKED_PR',
        dist: 0.20,
        exp: 0.00,
        comp: true,
        score: 22.0,
        stat: 'remediated',
        payload: { alert: 'Emergency patch applied with post-deployment audit sign-off logged' }
      }
    ];

    for (const e of defaultCcmEvents) {
      await this.pool.query(
        `INSERT INTO ccm_audit_events (
          id, studio_id, user_id, event_code, event_type, severity,
          actor_id, actor_email, resource_target, sod_conflict_rule_id,
          privilege_distance, exposure_volume_usd, compensating_control_active,
          sod_severity_score, resolution_status, evidence_payload
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          e.id, studioId, userId, e.code, e.type, e.sev,
          e.actor, e.email, e.target, e.rule,
          e.dist, e.exp, e.comp,
          e.score, e.stat, JSON.stringify(e.payload)
        ]
      );
    }

    const defaultReports = [
      {
        id: crypto.randomUUID(),
        num: 'WBH-2026-0042',
        cat: 'accounting_fraud',
        sev: 'high',
        stat: 'preliminary_inquiry',
        summary: 'Allegation of deferred billing recognition adjustment to inflate Q4 net revenue prior to audit cutoff.',
        persons: ['Masked Executive Subject #1'],
        exp: 180000.00,
        hold: true,
        escalated: false,
        inv: 'Special Legal Audit Counsel',
        hash: crypto.createHash('sha256').update('receipt_secret_0042').digest('hex')
      }
    ];

    for (const w of defaultReports) {
      await this.pool.query(
        `INSERT INTO whistleblower_reports (
          id, studio_id, user_id, report_tracking_number, category, severity,
          triage_status, allegation_summary, involved_persons_masked,
          estimated_financial_exposure_usd, legal_hold_active, audit_committee_escalated,
          assigned_lead_investigator, receipt_token_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          w.id, studioId, userId, w.num, w.cat, w.sev,
          w.stat, w.summary, JSON.stringify(w.persons),
          w.exp, w.hold, w.escalated,
          w.inv, w.hash
        ]
      );
    }

    const defaultCapas = [
      {
        id: crypto.randomUUID(),
        code: 'CAPA-2026-01',
        title: 'Automated Enforcement of Vendor Creation / Payment Release SoD in ERP',
        desc: 'Configure strict ERP role segregation preventing users from simultaneously holding vendor record maintenance and disbursement batch approval permissions.',
        source: 'ccm_incident',
        ref: 'CCM-SOD-001',
        owner: 'Finance Systems Lead',
        targetDate: '2026-11-30',
        status: 'in_progress',
        comp: 'Manual dual-signature signoff required on all payments over $10K pending software restriction'
      }
    ];

    for (const p of defaultCapas) {
      await this.pool.query(
        `INSERT INTO remediation_action_plans (
          id, studio_id, user_id, capa_code, title, description,
          source_type, source_reference_id, action_owner, target_remediation_date,
          status, compensating_controls_in_place
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          p.id, studioId, userId, p.code, p.title, p.desc,
          p.source, p.ref, p.owner, p.targetDate,
          p.status, p.comp
        ]
      );
    }

    const defaultSignOffs: SoxTripartiteSignOffDTO[] = [
      {
        role: 'head_of_internal_audit',
        signerName: 'Victoria Sterling, CIA, CISA',
        signerTitle: 'Head of Internal Audit & Risk Assurance',
        attestationConfirmed: true,
        signedAt: '2026-10-20T14:30:00.000Z',
        signatureToken: 'SIG_HIA_7f8a9b2c3d4e',
        observationsSummary: 'Comprehensive COSO 2013 control matrix testing completed with zero unmitigated material weaknesses.'
      },
      {
        role: 'general_counsel_cro',
        signerName: 'Jonathan Vance, Esq.',
        signerTitle: 'General Counsel & Chief Risk Officer',
        attestationConfirmed: true,
        signedAt: '2026-10-21T09:15:00.000Z',
        signatureToken: 'SIG_GC_CRO_1a2b3c4d5e6f',
        observationsSummary: 'Whistleblower hotline intake triaged, legal hold protocols verified, regulatory disclosures validated.'
      },
      {
        role: 'board_audit_committee_chair',
        signerName: 'Hon. Margaret Holloway',
        signerTitle: 'Audit Committee Chair & Financial Expert',
        attestationConfirmed: true,
        signedAt: '2026-10-22T16:45:00.000Z',
        signatureToken: 'SIG_BAC_CHAIR_9z8y7x6w5v4u',
        observationsSummary: 'Independent Audit Committee ratification executed. Management ICFR evaluation certified for SEC Item 9A.'
      }
    ];

    const arhsData: AuditRiskHealthScoreDTO = {
      compositeScore: 88.5,
      healthBand: 'substantial_compliance',
      controlEffectivenessScore: 92.4,
      residualRiskScore: 86.0,
      continuousMonitoringScore: 88.0,
      whistleblowerRemediationScore: 85.0,
      materialWeaknessPenaltyApplied: 0,
      totalControlsCount: 5,
      effectiveControlsCount: 5,
      materialWeaknessesCount: 0,
      significantDeficienciesCount: 0,
      controlDeficienciesCount: 0,
      openSodViolationsCount: 1,
      openWhistleblowerCasesCount: 1,
      activeRemediationsCount: 1,
      overdueRemediationsCount: 0
    };

    const memoMarkdown = generateSecItem9AMemoMarkdown({
      fiscalPeriod: 'Q3-2026',
      fiscalYear: 2026,
      auditorFirmName: 'PricewaterhouseCoopers LLP',
      managementEvaluationDate: '2026-09-30',
      arhs: arhsData,
      controls: defaultControls.map(c => ({
        id: c.id,
        userId,
        controlCode: c.code,
        title: c.title,
        description: c.desc,
        category: c.cat as any,
        nature: c.nat as any,
        frequency: c.freq as any,
        cosoPrinciple: c.p as any,
        primaryAssertion: c.ass as any,
        controlOwner: c.owner,
        testingStatus: c.stat as any,
        deficiencyClassification: c.def as any,
        sampleSize: c.sample,
        exceptionsIdentified: c.exc,
        mitigationEfficacyFactor: c.eff,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      risks: defaultRisks.map(r => ({
        id: r.id,
        userId,
        riskCode: r.code,
        title: r.title,
        category: r.cat as any,
        inherentLikelihood: r.lInh,
        inherentImpact: r.iInh,
        inherentScore: r.scoreInh,
        residualLikelihood: r.lRes,
        residualImpact: r.iRes,
        residualScore: r.scoreRes,
        boardAppetiteThreshold: r.appThresh,
        appetiteZone: r.zone as any,
        responseStrategy: r.strategy as any,
        mappedControlCodes: r.controls,
        maxPotentialFinancialLossUsd: r.loss,
        riskOwner: r.owner,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })),
      signOffs: defaultSignOffs,
      unresolvedMaterialWeaknesses: []
    });

    await this.pool.query(
      `INSERT INTO sox_audit_certifications (
        id, studio_id, user_id, fiscal_period, fiscal_year, overall_icfr_assessment,
        arhs_score, arhs_health_band, material_weakness_count, significant_deficiency_count,
        control_deficiency_count, sign_offs, sec_item_9a_memo_markdown, certified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        'Q3-2026',
        2026,
        'effective',
        88.5,
        'substantial_compliance',
        0,
        0,
        0,
        JSON.stringify(defaultSignOffs),
        memoMarkdown
      ]
    );

    return studioId;
  }

  async getOverview(userId: string): Promise<InternalAuditErmOverviewDTO> {
    await this.ensureDefaults(userId);

    const studioRes = await this.pool.query(
      `SELECT id, user_id, enterprise_name, arhs_score, arhs_band
       FROM internal_audit_studios WHERE user_id = $1`,
      [userId]
    );
    const studioRow = studioRes.rows[0];

    const controlsRes = await this.pool.query(
      `SELECT * FROM sox_internal_controls WHERE user_id = $1 ORDER BY control_code ASC`,
      [userId]
    );
    const controls: SoxInternalControlDTO[] = controlsRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      controlCode: r.control_code,
      title: r.title,
      description: r.description,
      category: r.category,
      nature: r.nature,
      frequency: r.frequency,
      cosoPrinciple: r.coso_principle,
      primaryAssertion: r.primary_assertion,
      controlOwner: r.control_owner,
      testingStatus: r.testing_status,
      deficiencyClassification: r.deficiency_classification,
      sampleSize: r.sample_size,
      exceptionsIdentified: r.exceptions_identified,
      mitigationEfficacyFactor: Number(r.mitigation_efficacy_factor),
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const risksRes = await this.pool.query(
      `SELECT * FROM enterprise_risks WHERE user_id = $1 ORDER BY risk_code ASC`,
      [userId]
    );
    const risks: EnterpriseRiskDTO[] = risksRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      riskCode: r.risk_code,
      title: r.title,
      category: r.category,
      inherentLikelihood: r.inherent_likelihood,
      inherentImpact: r.inherent_impact,
      inherentScore: r.inherent_score,
      residualLikelihood: r.residual_likelihood,
      residualImpact: r.residual_impact,
      residualScore: Number(r.residual_score),
      boardAppetiteThreshold: r.board_appetite_threshold,
      appetiteZone: r.appetite_zone,
      responseStrategy: r.response_strategy,
      mappedControlCodes: Array.isArray(r.mapped_control_codes) ? r.mapped_control_codes : JSON.parse(r.mapped_control_codes || '[]'),
      maxPotentialFinancialLossUsd: Number(r.max_potential_financial_loss_usd),
      riskOwner: r.risk_owner,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const heatmap = generateRiskHeatmapMatrix(risks);

    const ccmRes = await this.pool.query(
      `SELECT * FROM ccm_audit_events WHERE user_id = $1 ORDER BY detected_at DESC`,
      [userId]
    );
    const ccmEvents: CcmAuditEventDTO[] = ccmRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      eventCode: r.event_code,
      eventType: r.event_type,
      severity: r.severity,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      resourceTarget: r.resource_target,
      sodConflictRuleId: r.sod_conflict_rule_id || undefined,
      privilegeDistance: Number(r.privilege_distance),
      exposureVolumeUsd: Number(r.exposure_volume_usd),
      compensatingControlActive: r.compensating_control_active,
      sodSeverityScore: Number(r.sod_severity_score),
      resolutionStatus: r.resolution_status,
      evidencePayload: typeof r.evidence_payload === 'string' ? JSON.parse(r.evidence_payload) : r.evidence_payload || {},
      detectedAt: new Date(r.detected_at).toISOString(),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : undefined
    }));

    const wbhRes = await this.pool.query(
      `SELECT * FROM whistleblower_reports WHERE user_id = $1 ORDER BY reported_at DESC`,
      [userId]
    );
    const whistleblowerReports: WhistleblowerReportDTO[] = wbhRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      reportTrackingNumber: r.report_tracking_number,
      category: r.category,
      severity: r.severity,
      triageStatus: r.triage_status,
      allegationSummary: r.allegation_summary,
      involvedPersonsMasked: Array.isArray(r.involved_persons_masked) ? r.involved_persons_masked : JSON.parse(r.involved_persons_masked || '[]'),
      estimatedFinancialExposureUsd: Number(r.estimated_financial_exposure_usd),
      legalHoldActive: r.legal_hold_active,
      auditCommitteeEscalated: r.audit_committee_escalated,
      assignedLeadInvestigator: r.assigned_lead_investigator || undefined,
      receiptTokenHash: r.receipt_token_hash,
      reportedAt: new Date(r.reported_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const capaRes = await this.pool.query(
      `SELECT * FROM remediation_action_plans WHERE user_id = $1 ORDER BY target_remediation_date ASC`,
      [userId]
    );
    const remediationPlans: RemediationActionPlanDTO[] = capaRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      capaCode: r.capa_code,
      title: r.title,
      description: r.description,
      sourceType: r.source_type,
      sourceReferenceId: r.source_reference_id,
      actionOwner: r.action_owner,
      targetRemediationDate: new Date(r.target_remediation_date).toISOString().split('T')[0],
      actualCompletionDate: r.actual_completion_date ? new Date(r.actual_completion_date).toISOString().split('T')[0] : undefined,
      status: r.status,
      compensatingControlsInPlace: r.compensating_controls_in_place,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const effectiveCount = controls.filter(c => c.testingStatus === 'operating_effectively').length;
    const inProgressCount = controls.filter(c => c.testingStatus === 'in_progress').length;
    const mwCount = controls.filter(c => c.deficiencyClassification === 'material_weakness').length;
    const sdCount = controls.filter(c => c.deficiencyClassification === 'significant_deficiency').length;
    const cdCount = controls.filter(c => c.deficiencyClassification === 'control_deficiency').length;

    const defWeight = calculateDeficiencyImpactWeight(mwCount, sdCount, cdCount, 0, 5000000);
    const avgRes = risks.length > 0 ? risks.reduce((acc, r) => acc + r.residualScore, 0) / risks.length : 5.0;
    const breachCount = risks.filter(r => r.residualScore > r.boardAppetiteThreshold).length;
    const activeSodCount = ccmEvents.filter(e => e.eventType === 'sod_conflict_detected' && e.resolutionStatus !== 'remediated').length;
    const ccmSevSum = ccmEvents.reduce((acc, e) => acc + e.sodSeverityScore, 0);
    const bypassCount = ccmEvents.filter(e => e.eventType === 'change_management_bypass' && e.resolutionStatus !== 'remediated').length;
    const critWbhCount = whistleblowerReports.filter(w => w.severity === 'critical_material' && w.triageStatus !== 'closed_remediated').length;
    const highWbhCount = whistleblowerReports.filter(w => w.severity === 'high' && w.triageStatus !== 'closed_remediated').length;
    const overdueCapaCount = remediationPlans.filter(p => p.status === 'overdue' || (p.status === 'open' && new Date(p.targetRemediationDate) < new Date())).length;

    const arhs = calculateAuditRiskHealthScore({
      totalControls: controls.length,
      effectiveControls: effectiveCount,
      inProgressControls: inProgressCount,
      deficiencyImpactWeight: defWeight,
      materialWeaknessCount: mwCount,
      averageResidualRisk: avgRes,
      boardAppetiteBreachCount: breachCount,
      totalRisksCount: risks.length,
      activeSodViolationsCount: activeSodCount,
      accumulatedCcmSeveritySum: ccmSevSum,
      unresolvedBypassesCount: bypassCount,
      criticalOpenWhistleblowerCount: critWbhCount,
      highOpenWhistleblowerCount: highWbhCount,
      overdueRemediationsCount: overdueCapaCount
    });

    const certRes = await this.pool.query(
      `SELECT * FROM sox_audit_certifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    let latestCertification: SoxAuditCertificationDTO | null = null;
    if (certRes.rows.length > 0) {
      const cr = certRes.rows[0];
      latestCertification = {
        id: cr.id,
        userId: cr.user_id,
        fiscalPeriod: cr.fiscal_period,
        fiscalYear: cr.fiscal_year,
        overallIcfrAssessment: cr.overall_icfr_assessment,
        arhsScore: Number(cr.arhs_score),
        arhsHealthBand: cr.arhs_health_band,
        materialWeaknessCount: cr.material_weakness_count,
        significantDeficiencyCount: cr.significant_deficiency_count,
        controlDeficiencyCount: cr.control_deficiency_count,
        signOffs: Array.isArray(cr.sign_offs) ? cr.sign_offs : JSON.parse(cr.sign_offs || '[]'),
        secItem9AMemoMarkdown: cr.sec_item_9a_memo_markdown,
        certifiedAt: cr.certified_at ? new Date(cr.certified_at).toISOString() : undefined,
        createdAt: new Date(cr.created_at).toISOString(),
        updatedAt: new Date(cr.updated_at).toISOString()
      };
    }

    return {
      studio: {
        id: studioRow.id,
        userId: studioRow.user_id,
        enterpriseName: studioRow.enterprise_name,
        arhsScore: arhs.compositeScore,
        arhsBand: arhs.healthBand,
        totalControlsCount: controls.length,
        effectiveControlsCount: effectiveCount,
        openDeficienciesCount: mwCount + sdCount + cdCount
      },
      controls,
      risks,
      heatmap,
      ccmEvents,
      whistleblowerReports,
      remediationPlans,
      arhs,
      latestCertification
    };
  }

  async listControls(userId: string): Promise<SoxInternalControlDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT * FROM sox_internal_controls WHERE user_id = $1 ORDER BY control_code ASC`,
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      controlCode: r.control_code,
      title: r.title,
      description: r.description,
      category: r.category,
      nature: r.nature,
      frequency: r.frequency,
      cosoPrinciple: r.coso_principle,
      primaryAssertion: r.primary_assertion,
      controlOwner: r.control_owner,
      testingStatus: r.testing_status,
      deficiencyClassification: r.deficiency_classification,
      sampleSize: r.sample_size,
      exceptionsIdentified: r.exceptions_identified,
      mitigationEfficacyFactor: Number(r.mitigation_efficacy_factor),
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  }

  async createControl(userId: string, input: SoxInternalControlMutationDTO): Promise<SoxInternalControlDTO> {
    const studioId = await this.ensureDefaults(userId);
    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO sox_internal_controls (
        id, studio_id, user_id, control_code, title, description, category,
        nature, frequency, coso_principle, primary_assertion, control_owner,
        testing_status, deficiency_classification, sample_size, exceptions_identified,
        mitigation_efficacy_factor, last_tested_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        id, studioId, userId, input.controlCode, input.title, input.description, input.category,
        input.nature, input.frequency, input.cosoPrinciple, input.primaryAssertion, input.controlOwner,
        input.testingStatus || 'not_started', input.deficiencyClassification || 'none',
        input.sampleSize || 25, input.exceptionsIdentified || 0,
        input.mitigationEfficacyFactor || 0.85
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      controlCode: r.control_code,
      title: r.title,
      description: r.description,
      category: r.category,
      nature: r.nature,
      frequency: r.frequency,
      cosoPrinciple: r.coso_principle,
      primaryAssertion: r.primary_assertion,
      controlOwner: r.control_owner,
      testingStatus: r.testing_status,
      deficiencyClassification: r.deficiency_classification,
      sampleSize: r.sample_size,
      exceptionsIdentified: r.exceptions_identified,
      mitigationEfficacyFactor: Number(r.mitigation_efficacy_factor),
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async executeControlTest(
    userId: string,
    controlId: string,
    testData: ExecuteControlTestRequestDTO
  ): Promise<SoxInternalControlDTO> {
    await this.ensureDefaults(userId);
    const existing = await this.pool.query(
      `SELECT * FROM sox_internal_controls WHERE id = $1 AND user_id = $2`,
      [controlId, userId]
    );
    if (existing.rows.length === 0) {
      throw new Error(`Control ${controlId} not found`);
    }

    const cur = existing.rows[0];
    const newStatus = testData.testingStatus || cur.testing_status;
    const newDef = testData.deficiencyClassification || cur.deficiency_classification;
    const newSample = testData.sampleSize !== undefined ? testData.sampleSize : cur.sample_size;
    const newExc = testData.exceptionsIdentified !== undefined ? testData.exceptionsIdentified : cur.exceptions_identified;

    const res = await this.pool.query(
      `UPDATE sox_internal_controls
       SET testing_status = $1, deficiency_classification = $2, sample_size = $3,
           exceptions_identified = $4, last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6
       RETURNING *`,
      [newStatus, newDef, newSample, newExc, controlId, userId]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      controlCode: r.control_code,
      title: r.title,
      description: r.description,
      category: r.category,
      nature: r.nature,
      frequency: r.frequency,
      cosoPrinciple: r.coso_principle,
      primaryAssertion: r.primary_assertion,
      controlOwner: r.control_owner,
      testingStatus: r.testing_status,
      deficiencyClassification: r.deficiency_classification,
      sampleSize: r.sample_size,
      exceptionsIdentified: r.exceptions_identified,
      mitigationEfficacyFactor: Number(r.mitigation_efficacy_factor),
      lastTestedAt: r.last_tested_at ? new Date(r.last_tested_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async listRisks(userId: string): Promise<EnterpriseRiskDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT * FROM enterprise_risks WHERE user_id = $1 ORDER BY risk_code ASC`,
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      riskCode: r.risk_code,
      title: r.title,
      category: r.category,
      inherentLikelihood: r.inherent_likelihood,
      inherentImpact: r.inherent_impact,
      inherentScore: r.inherent_score,
      residualLikelihood: r.residual_likelihood,
      residualImpact: r.residual_impact,
      residualScore: Number(r.residual_score),
      boardAppetiteThreshold: r.board_appetite_threshold,
      appetiteZone: r.appetite_zone,
      responseStrategy: r.response_strategy,
      mappedControlCodes: Array.isArray(r.mapped_control_codes) ? r.mapped_control_codes : JSON.parse(r.mapped_control_codes || '[]'),
      maxPotentialFinancialLossUsd: Number(r.max_potential_financial_loss_usd),
      riskOwner: r.risk_owner,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  }

  async createRisk(userId: string, input: EnterpriseRiskMutationDTO): Promise<EnterpriseRiskDTO> {
    const studioId = await this.ensureDefaults(userId);
    const id = crypto.randomUUID();

    const controlsRes = await this.pool.query(
      `SELECT * FROM sox_internal_controls WHERE user_id = $1 AND control_code = ANY($2::text[])`,
      [userId, input.mappedControlCodes || []]
    );
    const mappedControls = controlsRes.rows.map(c => ({
      testingStatus: c.testing_status,
      nature: c.nature,
      deficiencyClassification: c.deficiency_classification,
      mitigationEfficacyFactor: Number(c.mitigation_efficacy_factor)
    }));

    const resRisk = calculateResidualRisk(input.inherentLikelihood, input.inherentImpact, mappedControls);

    const res = await this.pool.query(
      `INSERT INTO enterprise_risks (
        id, studio_id, user_id, risk_code, title, category,
        inherent_likelihood, inherent_impact, inherent_score,
        residual_likelihood, residual_impact, residual_score,
        board_appetite_threshold, appetite_zone, response_strategy,
        mapped_control_codes, max_potential_financial_loss_usd, risk_owner
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id, studioId, userId, input.riskCode, input.title, input.category,
        input.inherentLikelihood, input.inherentImpact, resRisk.inherentScore,
        resRisk.residualLikelihood, resRisk.residualImpact, resRisk.residualScore,
        input.boardAppetiteThreshold || 10, resRisk.appetiteZone, input.responseStrategy,
        JSON.stringify(input.mappedControlCodes || []), input.maxPotentialFinancialLossUsd || 0, input.riskOwner
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      riskCode: r.risk_code,
      title: r.title,
      category: r.category,
      inherentLikelihood: r.inherent_likelihood,
      inherentImpact: r.inherent_impact,
      inherentScore: r.inherent_score,
      residualLikelihood: r.residual_likelihood,
      residualImpact: r.residual_impact,
      residualScore: Number(r.residual_score),
      boardAppetiteThreshold: r.board_appetite_threshold,
      appetiteZone: r.appetite_zone,
      responseStrategy: r.response_strategy,
      mappedControlCodes: Array.isArray(r.mapped_control_codes) ? r.mapped_control_codes : JSON.parse(r.mapped_control_codes || '[]'),
      maxPotentialFinancialLossUsd: Number(r.max_potential_financial_loss_usd),
      riskOwner: r.risk_owner,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async getRiskHeatmap(userId: string): Promise<RiskHeatmapMatrixDTO> {
    const risks = await this.listRisks(userId);
    return generateRiskHeatmapMatrix(risks);
  }

  async listCcmEvents(userId: string): Promise<CcmAuditEventDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT * FROM ccm_audit_events WHERE user_id = $1 ORDER BY detected_at DESC`,
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      eventCode: r.event_code,
      eventType: r.event_type,
      severity: r.severity,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      resourceTarget: r.resource_target,
      sodConflictRuleId: r.sod_conflict_rule_id || undefined,
      privilegeDistance: Number(r.privilege_distance),
      exposureVolumeUsd: Number(r.exposure_volume_usd),
      compensatingControlActive: r.compensating_control_active,
      sodSeverityScore: Number(r.sod_severity_score),
      resolutionStatus: r.resolution_status,
      evidencePayload: typeof r.evidence_payload === 'string' ? JSON.parse(r.evidence_payload) : r.evidence_payload || {},
      detectedAt: new Date(r.detected_at).toISOString(),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : undefined
    }));
  }

  async evaluateSod(
    userId: string,
    input: EvaluateSodRequestDTO
  ): Promise<{ severityScore: number; riskRating: string; recommendations: string[] }> {
    const score = calculateSodSeverityIndex(
      input.eventType,
      input.toxicWeight,
      input.exposureVolumeUsd,
      input.privilegeDistance,
      input.compensatingControlActive
    );

    let rating = 'LOW';
    const recs: string[] = [];

    if (score >= 70.0) {
      rating = 'CRITICAL';
      recs.push('Immediately revoke secondary conflicting IAM role or transaction approval privilege.');
      recs.push('Enforce mandatory out-of-band supervisory authorization before batch execution.');
      recs.push('File urgent incident review with Internal Audit and Security Operations Center.');
    } else if (score >= 45.0) {
      rating = 'HIGH';
      recs.push('Activate mandatory dual-custody verification workflow for the target resource.');
      recs.push('Initiate 30-day lookback forensic log analysis on all transactions by this actor.');
    } else if (score >= 25.0) {
      rating = 'MEDIUM';
      recs.push('Validate compensating control documentation and monthly supervisory review logs.');
    } else {
      recs.push('Maintain periodic continuous monitoring review on quarterly cadence.');
    }

    return {
      severityScore: score,
      riskRating: rating,
      recommendations: recs
    };
  }

  async remediateCcmEvent(
    userId: string,
    eventId: string,
    resolutionStatus: CcmResolutionStatus,
    compensatingControlActive: boolean
  ): Promise<CcmAuditEventDTO> {
    await this.ensureDefaults(userId);
    const existing = await this.pool.query(
      `SELECT * FROM ccm_audit_events WHERE id = $1 AND user_id = $2`,
      [eventId, userId]
    );
    if (existing.rows.length === 0) {
      throw new Error(`CCM event ${eventId} not found`);
    }

    const cur = existing.rows[0];
    const newScore = calculateSodSeverityIndex(
      cur.event_type,
      1.5,
      Number(cur.exposure_volume_usd),
      Number(cur.privilege_distance),
      compensatingControlActive
    );

    const res = await this.pool.query(
      `UPDATE ccm_audit_events
       SET resolution_status = $1, compensating_control_active = $2, sod_severity_score = $3,
           resolved_at = CASE WHEN $1 = 'remediated' THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [resolutionStatus, compensatingControlActive, newScore, eventId, userId]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      eventCode: r.event_code,
      eventType: r.event_type,
      severity: r.severity,
      actorId: r.actor_id,
      actorEmail: r.actor_email,
      resourceTarget: r.resource_target,
      sodConflictRuleId: r.sod_conflict_rule_id || undefined,
      privilegeDistance: Number(r.privilege_distance),
      exposureVolumeUsd: Number(r.exposure_volume_usd),
      compensatingControlActive: r.compensating_control_active,
      sodSeverityScore: Number(r.sod_severity_score),
      resolutionStatus: r.resolution_status,
      evidencePayload: typeof r.evidence_payload === 'string' ? JSON.parse(r.evidence_payload) : r.evidence_payload || {},
      detectedAt: new Date(r.detected_at).toISOString(),
      resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : undefined
    };
  }

  async submitWhistleblowerReport(
    userId: string,
    input: WhistleblowerReportIntakeDTO
  ): Promise<{ report: WhistleblowerReportDTO; receiptToken: string }> {
    const studioId = await this.ensureDefaults(userId);
    const id = crypto.randomUUID();
    const trackingNum = `WBH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const rawSecret = `WBH_SECRET_${crypto.randomBytes(16).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');

    const isAccountingFraud = input.category === 'accounting_fraud' || input.category === 'internal_controls_circumvention';
    const isMaterialExposure = input.estimatedFinancialExposureUsd >= 250000;
    const severity = (isAccountingFraud && isMaterialExposure) ? 'critical_material' : (isAccountingFraud || isMaterialExposure ? 'high' : 'medium');
    const autoEscalated = severity === 'critical_material';

    const res = await this.pool.query(
      `INSERT INTO whistleblower_reports (
        id, studio_id, user_id, report_tracking_number, category, severity,
        triage_status, allegation_summary, involved_persons_masked,
        estimated_financial_exposure_usd, legal_hold_active, audit_committee_escalated,
        assigned_lead_investigator, receipt_token_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id, studioId, userId, trackingNum, input.category, severity,
        'intake', input.allegationSummary, JSON.stringify(input.involvedPersonsMasked || []),
        input.estimatedFinancialExposureUsd || 0, true, autoEscalated,
        'Special Audit Intake Counsel', tokenHash
      ]
    );
    const r = res.rows[0];
    const report: WhistleblowerReportDTO = {
      id: r.id,
      userId: r.user_id,
      reportTrackingNumber: r.report_tracking_number,
      category: r.category,
      severity: r.severity,
      triageStatus: r.triage_status,
      allegationSummary: r.allegation_summary,
      involvedPersonsMasked: Array.isArray(r.involved_persons_masked) ? r.involved_persons_masked : JSON.parse(r.involved_persons_masked || '[]'),
      estimatedFinancialExposureUsd: Number(r.estimated_financial_exposure_usd),
      legalHoldActive: r.legal_hold_active,
      auditCommitteeEscalated: r.audit_committee_escalated,
      assignedLeadInvestigator: r.assigned_lead_investigator || undefined,
      receiptTokenHash: r.receipt_token_hash,
      reportedAt: new Date(r.reported_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };

    return {
      report,
      receiptToken: rawSecret
    };
  }

  async triageWhistleblowerReport(
    userId: string,
    reportId: string,
    triage: WhistleblowerTriageMutationDTO
  ): Promise<WhistleblowerReportDTO> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `UPDATE whistleblower_reports
       SET severity = $1, triage_status = $2, legal_hold_active = $3,
           audit_committee_escalated = $4, assigned_lead_investigator = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        triage.severity, triage.triageStatus, triage.legalHoldActive,
        triage.auditCommitteeEscalated, triage.assignedLeadInvestigator || null,
        reportId, userId
      ]
    );
    if (res.rows.length === 0) {
      throw new Error(`Whistleblower report ${reportId} not found`);
    }
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      reportTrackingNumber: r.report_tracking_number,
      category: r.category,
      severity: r.severity,
      triageStatus: r.triage_status,
      allegationSummary: r.allegation_summary,
      involvedPersonsMasked: Array.isArray(r.involved_persons_masked) ? r.involved_persons_masked : JSON.parse(r.involved_persons_masked || '[]'),
      estimatedFinancialExposureUsd: Number(r.estimated_financial_exposure_usd),
      legalHoldActive: r.legal_hold_active,
      auditCommitteeEscalated: r.audit_committee_escalated,
      assignedLeadInvestigator: r.assigned_lead_investigator || undefined,
      receiptTokenHash: r.receipt_token_hash,
      reportedAt: new Date(r.reported_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async listRemediations(userId: string): Promise<RemediationActionPlanDTO[]> {
    await this.ensureDefaults(userId);
    const res = await this.pool.query(
      `SELECT * FROM remediation_action_plans WHERE user_id = $1 ORDER BY target_remediation_date ASC`,
      [userId]
    );
    return res.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      capaCode: r.capa_code,
      title: r.title,
      description: r.description,
      sourceType: r.source_type,
      sourceReferenceId: r.source_reference_id,
      actionOwner: r.action_owner,
      targetRemediationDate: new Date(r.target_remediation_date).toISOString().split('T')[0],
      actualCompletionDate: r.actual_completion_date ? new Date(r.actual_completion_date).toISOString().split('T')[0] : undefined,
      status: r.status,
      compensatingControlsInPlace: r.compensating_controls_in_place,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));
  }

  async createRemediation(
    userId: string,
    input: RemediationActionPlanMutationDTO
  ): Promise<RemediationActionPlanDTO> {
    const studioId = await this.ensureDefaults(userId);
    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO remediation_action_plans (
        id, studio_id, user_id, capa_code, title, description,
        source_type, source_reference_id, action_owner, target_remediation_date,
        status, compensating_controls_in_place
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11)
      RETURNING *`,
      [
        id, studioId, userId, input.capaCode, input.title, input.description,
        input.sourceType, input.sourceReferenceId, input.actionOwner,
        input.targetRemediationDate, input.compensatingControlsInPlace || ''
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      capaCode: r.capa_code,
      title: r.title,
      description: r.description,
      sourceType: r.source_type,
      sourceReferenceId: r.source_reference_id,
      actionOwner: r.action_owner,
      targetRemediationDate: new Date(r.target_remediation_date).toISOString().split('T')[0],
      actualCompletionDate: r.actual_completion_date ? new Date(r.actual_completion_date).toISOString().split('T')[0] : undefined,
      status: r.status,
      compensatingControlsInPlace: r.compensating_controls_in_place,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async generateSecItem9AMemo(
    userId: string,
    request: SecItem9AMemoRequestDTO
  ): Promise<SecItem9AMemoResponseDTO> {
    const studioId = await this.ensureDefaults(userId);
    const overview = await this.getOverview(userId);

    const mwControls = overview.controls.filter(c => c.deficiencyClassification === 'material_weakness').map(c => `${c.controlCode}: ${c.title}`);

    const defaultSignOffs: SoxTripartiteSignOffDTO[] = [
      {
        role: 'head_of_internal_audit',
        signerName: 'Victoria Sterling, CIA, CISA',
        signerTitle: 'Head of Internal Audit',
        attestationConfirmed: true,
        signedAt: new Date().toISOString(),
        signatureToken: `SIG_HIA_${crypto.randomBytes(6).toString('hex')}`,
        observationsSummary: 'Assessed testing sample and concluded on design and operating effectiveness.'
      },
      {
        role: 'general_counsel_cro',
        signerName: 'Jonathan Vance, Esq.',
        signerTitle: 'General Counsel & CRO',
        attestationConfirmed: false,
        signedAt: '',
        signatureToken: '',
        observationsSummary: ''
      },
      {
        role: 'board_audit_committee_chair',
        signerName: 'Hon. Margaret Holloway',
        signerTitle: 'Audit Committee Chair',
        attestationConfirmed: false,
        signedAt: '',
        signatureToken: '',
        observationsSummary: ''
      }
    ];

    const markdown = generateSecItem9AMemoMarkdown({
      fiscalPeriod: request.fiscalPeriod,
      fiscalYear: request.fiscalYear,
      auditorFirmName: request.auditorFirmName,
      managementEvaluationDate: request.managementEvaluationDate,
      arhs: overview.arhs,
      controls: overview.controls,
      risks: overview.risks,
      signOffs: defaultSignOffs,
      unresolvedMaterialWeaknesses: mwControls
    });

    const isEffective = overview.arhs.materialWeaknessesCount === 0 && mwControls.length === 0;
    const conclusion = isEffective ? 'effective' : 'adverse_material_weakness';

    await this.pool.query(
      `INSERT INTO sox_audit_certifications (
        id, studio_id, user_id, fiscal_period, fiscal_year, overall_icfr_assessment,
        arhs_score, arhs_health_band, material_weakness_count, significant_deficiency_count,
        control_deficiency_count, sign_offs, sec_item_9a_memo_markdown, certified_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(),
        studioId,
        userId,
        request.fiscalPeriod,
        request.fiscalYear,
        conclusion,
        overview.arhs.compositeScore,
        overview.arhs.healthBand,
        overview.arhs.materialWeaknessesCount,
        overview.arhs.significantDeficienciesCount,
        overview.arhs.controlDeficienciesCount,
        JSON.stringify(defaultSignOffs),
        markdown
      ]
    );

    return {
      memoTitle: `Item 9A Controls and Procedures - ${request.fiscalPeriod}`,
      fiscalPeriod: request.fiscalPeriod,
      memoMarkdown: markdown,
      overallConclusion: conclusion,
      arhsScore: overview.arhs.compositeScore,
      arhsHealthBand: overview.arhs.healthBand
    };
  }

  async signoffCertification(
    userId: string,
    certificationId: string,
    signOff: RecordTripartiteSignOffRequestDTO
  ): Promise<SoxAuditCertificationDTO> {
    await this.ensureDefaults(userId);
    const existing = await this.pool.query(
      `SELECT * FROM sox_audit_certifications WHERE id = $1 AND user_id = $2`,
      [certificationId, userId]
    );
    if (existing.rows.length === 0) {
      throw new Error(`Audit certification ${certificationId} not found`);
    }

    const certRow = existing.rows[0];
    const currentSignOffs: SoxTripartiteSignOffDTO[] = Array.isArray(certRow.sign_offs)
      ? certRow.sign_offs
      : JSON.parse(certRow.sign_offs || '[]');

    const existingIdx = currentSignOffs.findIndex(s => s.role === signOff.role);
    const updatedRecord: SoxTripartiteSignOffDTO = {
      role: signOff.role,
      signerName: signOff.signerName,
      signerTitle: signOff.signerTitle,
      attestationConfirmed: signOff.attestationConfirmed,
      signedAt: new Date().toISOString(),
      signatureToken: `SIG_${signOff.role.toUpperCase()}_${crypto.randomBytes(6).toString('hex')}`,
      observationsSummary: signOff.observationsSummary
    };

    if (existingIdx >= 0) {
      currentSignOffs[existingIdx] = updatedRecord;
    } else {
      currentSignOffs.push(updatedRecord);
    }

    const allSigned = currentSignOffs.length >= 3 && currentSignOffs.every(s => s.attestationConfirmed);

    const res = await this.pool.query(
      `UPDATE sox_audit_certifications
       SET sign_offs = $1, certified_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE certified_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [JSON.stringify(currentSignOffs), allSigned, certificationId, userId]
    );
    const cr = res.rows[0];

    return {
      id: cr.id,
      userId: cr.user_id,
      fiscalPeriod: cr.fiscal_period,
      fiscalYear: cr.fiscal_year,
      overallIcfrAssessment: cr.overall_icfr_assessment,
      arhsScore: Number(cr.arhs_score),
      arhsHealthBand: cr.arhs_health_band,
      materialWeaknessCount: cr.material_weakness_count,
      significantDeficiencyCount: cr.significant_deficiency_count,
      controlDeficiencyCount: cr.control_deficiency_count,
      signOffs: Array.isArray(cr.sign_offs) ? cr.sign_offs : JSON.parse(cr.sign_offs || '[]'),
      secItem9AMemoMarkdown: cr.sec_item_9a_memo_markdown,
      certifiedAt: cr.certified_at ? new Date(cr.certified_at).toISOString() : undefined,
      createdAt: new Date(cr.created_at).toISOString(),
      updatedAt: new Date(cr.updated_at).toISOString()
    };
  }
}
