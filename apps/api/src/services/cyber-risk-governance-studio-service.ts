import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CyberRiskCategory,
  type VulnerabilityPriorityTier,
  type NistCsfFunction,
  type NistMaturityTier,
  type TabletopBreachArchetype,
  type SecMaterialityStatus,
  type CyberPostureTier,
  type SignOffGovernanceRole,
  type MemorandumWorkflowStatus,
  type CyberRiskScenarioDTO,
  type CyberRiskScenarioMutationDTO,
  type ThreatVulnerabilityDTO,
  type ThreatVulnerabilityMutationDTO,
  type DarkWebExposureDTO,
  type DarkWebExposureMutationDTO,
  type ThreatLandscapeOverviewDTO,
  type ComplianceControlDTO,
  type ComplianceControlMutationDTO,
  type ComplianceMatrixOverviewDTO,
  type TabletopSimulationDTO,
  type TabletopSimulationMutationDTO,
  type CyberInsurancePolicyDTO,
  type SecMaterialityDeterminationDTO,
  type GovernanceSignOffRecordDTO,
  type BoardCyberMemorandumDTO,
  type BoardCyberMemorandumMutationDTO,
  type GovernanceSignOffPayloadDTO,
  type CyberRiskStudioOverviewDTO,
  calculateFairRiskMetrics,
  calculateVulnerabilityPriority,
  calculateAttackSurfaceRating,
  calculateDarkWebExposureIndex,
  calculateNistComplianceMetrics,
  calculateTabletopResilience,
  determineSecMateriality,
  calculateCompositeSecurityScore,
  generateBoardCyberMemorandumMarkdown,
  validateCyberRiskScenarioInput,
  validateThreatVulnerabilityInput,
  validateDarkWebExposureInput,
  validateComplianceControlInput,
  validateTabletopSimulationInput,
  validateGovernanceSignOffInput,
  validateMaterialityDeterminationInput
} from '@jobtrack/contract';

export class CyberRiskGovernanceStudioService {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cyber_risk_scenarios (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        category TEXT NOT NULL,
        asset_name TEXT NOT NULL,
        threat_actor TEXT NOT NULL,
        contact_frequency NUMERIC NOT NULL DEFAULT 12.0,
        probability_of_action NUMERIC NOT NULL DEFAULT 0.25,
        threat_event_frequency NUMERIC NOT NULL DEFAULT 3.0,
        threat_capability INT NOT NULL DEFAULT 70,
        resistance_strength INT NOT NULL DEFAULT 65,
        vulnerability_percent NUMERIC NOT NULL DEFAULT 52.5,
        loss_event_frequency NUMERIC NOT NULL DEFAULT 1.575,
        primary_loss_min_usd NUMERIC NOT NULL DEFAULT 150000,
        primary_loss_likely_usd NUMERIC NOT NULL DEFAULT 450000,
        primary_loss_max_usd NUMERIC NOT NULL DEFAULT 1200000,
        secondary_loss_min_usd NUMERIC NOT NULL DEFAULT 250000,
        secondary_loss_likely_usd NUMERIC NOT NULL DEFAULT 750000,
        secondary_loss_max_usd NUMERIC NOT NULL DEFAULT 3500000,
        single_loss_expectancy_expected_usd NUMERIC NOT NULL DEFAULT 1533333,
        single_loss_expectancy_std_dev_usd NUMERIC NOT NULL DEFAULT 716667,
        annualized_loss_expectancy_usd NUMERIC NOT NULL DEFAULT 2415000,
        value_at_risk_95_percent_usd NUMERIC NOT NULL DEFAULT 4200000,
        inherent_ale_usd NUMERIC NOT NULL DEFAULT 5000000,
        residual_ale_usd NUMERIC NOT NULL DEFAULT 2415000,
        risk_reduction_ratio NUMERIC NOT NULL DEFAULT 0.517,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS threat_vulnerabilities (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cve_id TEXT NOT NULL,
        title TEXT NOT NULL,
        cvss_score NUMERIC NOT NULL DEFAULT 7.5,
        epss_probability NUMERIC NOT NULL DEFAULT 0.15,
        epss_percentile NUMERIC NOT NULL DEFAULT 0.85,
        cisa_kev_status BOOLEAN NOT NULL DEFAULT FALSE,
        affected_asset TEXT NOT NULL,
        component TEXT NOT NULL,
        composite_risk_score INT NOT NULL DEFAULT 60,
        priority_tier TEXT NOT NULL DEFAULT 'high',
        remediation_status TEXT NOT NULL DEFAULT 'open',
        patch_due_date TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dark_web_exposures (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_domain TEXT NOT NULL,
        breach_source TEXT NOT NULL,
        exposure_date TEXT NOT NULL,
        leaked_email TEXT NOT NULL,
        has_plaintext_password BOOLEAN NOT NULL DEFAULT FALSE,
        has_session_token BOOLEAN NOT NULL DEFAULT FALSE,
        is_vip_executive BOOLEAN NOT NULL DEFAULT FALSE,
        vip_title TEXT,
        infostealer_variant TEXT,
        exposure_risk_score INT NOT NULL DEFAULT 50,
        remediation_status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS compliance_controls (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        function_code TEXT NOT NULL,
        category_code TEXT NOT NULL,
        subcategory_code TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        iso27001_mapping TEXT NOT NULL,
        soc2_mapping TEXT NOT NULL,
        hipaa_mapping TEXT NOT NULL,
        maturity_tier TEXT NOT NULL DEFAULT 'tier_2_risk_informed',
        maturity_numeric_tier INT NOT NULL DEFAULT 2,
        has_verified_evidence BOOLEAN NOT NULL DEFAULT FALSE,
        last_audited_date TEXT NOT NULL,
        auditor_notes TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tabletop_simulations (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        archetype TEXT NOT NULL,
        scenario_title TEXT NOT NULL,
        conducted_date TEXT NOT NULL,
        participants_count INT NOT NULL DEFAULT 8,
        mean_time_to_detect_hours NUMERIC NOT NULL DEFAULT 1.5,
        mean_time_to_contain_hours NUMERIC NOT NULL DEFAULT 4.0,
        simulated_ransom_demanded_usd NUMERIC NOT NULL DEFAULT 5000000,
        simulated_business_interruption_days NUMERIC NOT NULL DEFAULT 3,
        simulated_total_loss_usd NUMERIC NOT NULL DEFAULT 8500000,
        immutable_backup_score INT NOT NULL DEFAULT 80,
        airgap_isolation_score INT NOT NULL DEFAULT 75,
        rto_rpo_drill_score INT NOT NULL DEFAULT 85,
        pam_segregation_score INT NOT NULL DEFAULT 70,
        ransomware_resilience_index INT NOT NULL DEFAULT 78,
        key_findings TEXT[] NOT NULL DEFAULT '{}',
        remediation_action_items TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS board_cyber_memoranda (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fiscal_year INT NOT NULL,
        quarter INT NOT NULL,
        title TEXT NOT NULL,
        composite_security_posture_score INT NOT NULL DEFAULT 75,
        posture_tier TEXT NOT NULL DEFAULT 'robust_defensible',
        workflow_status TEXT NOT NULL DEFAULT 'draft',
        sec_materiality_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        sign_offs_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        memorandum_markdown TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  async seedDefaultsIfEmpty(userId: string): Promise<void> {
    const existing = await this.pool.query(
      `SELECT id FROM cyber_risk_scenarios WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length > 0) return;

    const s1 = calculateFairRiskMetrics({
      contactFrequency: 14.0,
      probabilityOfAction: 0.35,
      threatCapability: 75,
      resistanceStrength: 65,
      primaryLossMinUsd: 250000,
      primaryLossLikelyUsd: 750000,
      primaryLossMaxUsd: 2500000,
      secondaryLossMinUsd: 500000,
      secondaryLossLikelyUsd: 1500000,
      secondaryLossMaxUsd: 5000000,
      inherentAleUsd: 6500000
    });

    const s2 = calculateFairRiskMetrics({
      contactFrequency: 24.0,
      probabilityOfAction: 0.20,
      threatCapability: 80,
      resistanceStrength: 70,
      primaryLossMinUsd: 100000,
      primaryLossLikelyUsd: 350000,
      primaryLossMaxUsd: 1200000,
      secondaryLossMinUsd: 200000,
      secondaryLossLikelyUsd: 800000,
      secondaryLossMaxUsd: 2800000,
      inherentAleUsd: 4200000
    });

    const s3 = calculateFairRiskMetrics({
      contactFrequency: 6.0,
      probabilityOfAction: 0.15,
      threatCapability: 85,
      resistanceStrength: 60,
      primaryLossMinUsd: 300000,
      primaryLossLikelyUsd: 900000,
      primaryLossMaxUsd: 3000000,
      secondaryLossMinUsd: 600000,
      secondaryLossLikelyUsd: 2000000,
      secondaryLossMaxUsd: 7000000,
      inherentAleUsd: 5800000
    });

    await this.pool.query(
      `INSERT INTO cyber_risk_scenarios (
        id, user_id, title, category, asset_name, threat_actor,
        contact_frequency, probability_of_action, threat_event_frequency,
        threat_capability, resistance_strength, vulnerability_percent, loss_event_frequency,
        primary_loss_min_usd, primary_loss_likely_usd, primary_loss_max_usd,
        secondary_loss_min_usd, secondary_loss_likely_usd, secondary_loss_max_usd,
        single_loss_expectancy_expected_usd, single_loss_expectancy_std_dev_usd,
        annualized_loss_expectancy_usd, value_at_risk_95_percent_usd,
        inherent_ale_usd, residual_ale_usd, risk_reduction_ratio
      ) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26),
      ($27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52),
      ($53, $54, $55, $56, $57, $58, $59, $60, $61, $62, $63, $64, $65, $66, $67, $68, $69, $70, $71, $72, $73, $74, $75, $76, $77, $78)`,
      [
        crypto.randomUUID(), userId, 'LockBit Ransomware Enterprise Outage', 'ransomware_extortion', 'Core Production Kubernetes Cluster', 'LockBit 3.0 Syndicate',
        14.0, 0.35, s1.threatEventFrequency, 75, 65, s1.vulnerabilityPercent, s1.lossEventFrequency,
        250000, 750000, 2500000, 500000, 1500000, 5000000,
        s1.singleLossExpectancyExpectedUsd, s1.singleLossExpectancyStdDevUsd, s1.annualizedLossExpectancyUsd, s1.valueAtRisk95PercentUsd,
        6500000, s1.residualAleUsd, s1.riskReductionRatio,

        crypto.randomUUID(), userId, 'AWS IAM Privilege Escalation & S3 Leak', 'cloud_infrastructure_compromise', 'Enterprise Multi-Account AWS Organization', 'Scattered Spider / UNC3944',
        24.0, 0.20, s2.threatEventFrequency, 80, 70, s2.vulnerabilityPercent, s2.lossEventFrequency,
        100000, 350000, 1200000, 200000, 800000, 2800000,
        s2.singleLossExpectancyExpectedUsd, s2.singleLossExpectancyStdDevUsd, s2.annualizedLossExpectancyUsd, s2.valueAtRisk95PercentUsd,
        4200000, s2.residualAleUsd, s2.riskReductionRatio,

        crypto.randomUUID(), userId, 'CI/CD Build Pipeline NPM Dependency Poisoning', 'third_party_supply_chain', 'GitHub Enterprise Actions Build Matrix', 'Lazarus Group (APT38)',
        6.0, 0.15, s3.threatEventFrequency, 85, 60, s3.vulnerabilityPercent, s3.lossEventFrequency,
        300000, 900000, 3000000, 600000, 2000000, 7000000,
        s3.singleLossExpectancyExpectedUsd, s3.singleLossExpectancyStdDevUsd, s3.annualizedLossExpectancyUsd, s3.valueAtRisk95PercentUsd,
        5800000, s3.residualAleUsd, s3.riskReductionRatio
      ]
    );

    const v1 = calculateVulnerabilityPriority(10.0, 0.94, true);
    const v2 = calculateVulnerabilityPriority(8.6, 0.42, true);
    const v3 = calculateVulnerabilityPriority(5.9, 0.08, false);
    const v4 = calculateVulnerabilityPriority(9.8, 0.76, true);

    await this.pool.query(
      `INSERT INTO threat_vulnerabilities (
        id, user_id, cve_id, title, cvss_score, epss_probability, epss_percentile,
        cisa_kev_status, affected_asset, component, composite_risk_score, priority_tier,
        remediation_status, patch_due_date
      ) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14),
      ($15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28),
      ($29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42),
      ($43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55, $56)`,
      [
        crypto.randomUUID(), userId, 'CVE-2024-3094', 'XZ Utils Embedded Liblzma Backdoor', 10.0, 0.94, 0.99, true, 'Base Docker Images', 'liblzma.so.5.6.0', v1.compositeRiskScore, v1.priorityTier, 'mitigated', '2026-11-01',
        crypto.randomUUID(), userId, 'CVE-2024-21626', 'runc Container Escape to Host Rootfs', 8.6, 0.42, 0.91, true, 'Production EKS Cluster Nodes', 'runc < 1.1.12', v2.compositeRiskScore, v2.priorityTier, 'in_progress', '2026-11-05',
        crypto.randomUUID(), userId, 'CVE-2023-48795', 'Terrapin SSH Protocol Prefix Truncation', 5.9, 0.08, 0.62, false, 'Internal Bastion Host Fleet', 'OpenSSH Server', v3.compositeRiskScore, v3.priorityTier, 'open', '2026-11-20',
        crypto.randomUUID(), userId, 'CVE-2024-1709', 'ConnectWise ScreenConnect Auth Bypass', 9.8, 0.76, 0.98, true, 'Remote Management Gateway', 'ScreenConnect Server', v4.compositeRiskScore, v4.priorityTier, 'mitigated', '2026-10-30'
      ]
    );

    await this.pool.query(
      `INSERT INTO dark_web_exposures (
        id, user_id, target_domain, breach_source, exposure_date, leaked_email,
        has_plaintext_password, has_session_token, is_vip_executive, vip_title,
        infostealer_variant, exposure_risk_score, remediation_status
      ) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13),
      ($14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26),
      ($27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39)`,
      [
        crypto.randomUUID(), userId, 'enterprise-corp.com', 'RedLine Stealer Russian Market Dump', new Date(Date.now() - 5 * 86400000).toISOString(), 'ciso@enterprise-corp.com', false, true, true, 'Chief Information Security Officer', 'RedLine v24', 85, 'active',
        crypto.randomUUID(), userId, 'enterprise-corp.com', 'LummaC2 Stealer Corporate Log Harvest', new Date(Date.now() - 14 * 86400000).toISOString(), 'vp-eng@enterprise-corp.com', true, false, true, 'VP of Infrastructure Engineering', 'Lumma Stealer', 75, 'mfa_enforced',
        crypto.randomUUID(), userId, 'enterprise-corp.com', 'Breached Forums Credential Stuffing List', new Date(Date.now() - 45 * 86400000).toISOString(), 'dev-lead@enterprise-corp.com', true, false, false, undefined, 'Vidar Stealer', 40, 'password_reset'
      ]
    );

    const controlsSeed = [
      { fn: 'govern', cat: 'GV.OC', sub: 'GV.OC-01', title: 'Organizational Context Defined', desc: 'The organizational mission, stakeholder expectations, and legal requirements are understood and integrated.', iso: 'Clause 4.1', soc: 'CC1.1', hipaa: '164.308(a)(1)', tier: 'tier_3_repeatable', num: 3, ev: true },
      { fn: 'identify', cat: 'ID.AM', sub: 'ID.AM-01', title: 'Physical & Cloud Asset Inventory', desc: 'Inventories of physical and cloud hardware, cloud compute, and managed containers are maintained.', iso: 'A.8.1', soc: 'CC6.1', hipaa: '164.310(d)(1)', tier: 'tier_3_repeatable', num: 3, ev: true },
      { fn: 'protect', cat: 'PR.AA', sub: 'PR.AA-01', title: 'Phishing-Resistant MFA & PAM', desc: 'Identity credentials, single sign-on tokens, and privileged access are secured via FIDO2 WebAuthn keys.', iso: 'A.9.4', soc: 'CC6.2', hipaa: '164.312(d)', tier: 'tier_2_risk_informed', num: 2, ev: false },
      { fn: 'detect', cat: 'DE.CM', sub: 'DE.CM-01', title: 'Continuous SIEM & Cloud Trail Monitoring', desc: 'Networks, endpoints, and cloud identity logs are continuously monitored for malicious anomalies.', iso: 'A.12.4', soc: 'CC7.2', hipaa: '164.312(b)', tier: 'tier_3_repeatable', num: 3, ev: true },
      { fn: 'respond', cat: 'RS.MA', sub: 'RS.MA-01', title: 'Incident Response & SEC Escalation Plan', desc: 'Incident response plans include clear 4-day SEC Item 1.05 materiality determination procedures.', iso: 'A.16.1', soc: 'CC7.3', hipaa: '164.308(a)(6)', tier: 'tier_3_repeatable', num: 3, ev: true },
      { fn: 'recover', cat: 'RC.RP', sub: 'RC.RP-01', title: 'Air-Gapped Immutable Backups & RTO Drills', desc: 'Disaster recovery procedures and immutable WORM backups are validated via recurring recovery drills.', iso: 'A.12.3', soc: 'CC7.4', hipaa: '164.308(a)(7)', tier: 'tier_3_repeatable', num: 3, ev: true }
    ];

    for (const c of controlsSeed) {
      await this.pool.query(
        `INSERT INTO compliance_controls (
          id, user_id, function_code, category_code, subcategory_code,
          title, description, iso27001_mapping, soc2_mapping, hipaa_mapping,
          maturity_tier, maturity_numeric_tier, has_verified_evidence,
          last_audited_date, auditor_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          crypto.randomUUID(), userId, c.fn, c.cat, c.sub,
          c.title, c.desc, c.iso, c.soc, c.hipaa,
          c.tier, c.num, c.ev, '2026-10-15', 'Evidence artifacts verified via Automated Compliance Collector.'
        ]
      );
    }

    const t1Res = calculateTabletopResilience({
      immutableBackupScore: 85,
      airgapIsolationScore: 80,
      rtoRpoDrillScore: 90,
      pamSegregationScore: 75,
      meanTimeToDetectHours: 1.2,
      meanTimeToContainHours: 3.5,
      simulatedTotalLossUsd: 8500000,
      insurancePrimaryLimitUsd: 10000000
    });

    const t2Res = calculateTabletopResilience({
      immutableBackupScore: 90,
      airgapIsolationScore: 85,
      rtoRpoDrillScore: 85,
      pamSegregationScore: 80,
      meanTimeToDetectHours: 0.8,
      meanTimeToContainHours: 2.1,
      simulatedTotalLossUsd: 4200000,
      insurancePrimaryLimitUsd: 10000000
    });

    await this.pool.query(
      `INSERT INTO tabletop_simulations (
        id, user_id, archetype, scenario_title, conducted_date, participants_count,
        mean_time_to_detect_hours, mean_time_to_contain_hours, simulated_ransom_demanded_usd,
        simulated_business_interruption_days, simulated_total_loss_usd,
        immutable_backup_score, airgap_isolation_score, rto_rpo_drill_score, pam_segregation_score,
        ransomware_resilience_index, key_findings, remediation_action_items
      ) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18),
      ($19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36)`,
      [
        crypto.randomUUID(), userId, 'ransomware_double_extortion', 'Enterprise Ransomware & Active Directory Lockdown', '2026-09-18', 14,
        1.2, 3.5, 5000000, 3, 8500000,
        85, 80, 90, 75, t1Res.ransomwareResilienceIndex,
        ['Immutable backups succeeded with 4-hour RTO restoration', 'Out-of-band communication channel was operational within 15 minutes', 'Extortion negotiation protocol required secondary legal sign-off'],
        ['Enforce FIDO2 WebAuthn keys for all domain administrators', 'Accelerate Active Directory micro-segmentation', 'Pre-retain specialist ransomware incident counsel'],

        crypto.randomUUID(), userId, 'cloud_iam_privilege_escalation', 'Compromised Cloud Admin Token & Multi-Region S3 Exfiltration', '2026-10-12', 10,
        0.8, 2.1, 0, 1, 4200000,
        90, 85, 85, 80, t2Res.ransomwareResilienceIndex,
        ['CloudTrail detection triggered alert within 48 minutes', 'Automated IAM session revocation contained token exfiltration within 2.1 hours'],
        ['Automate instant quarantine of anomalous cross-region S3 egress', 'Deploy ephemeral Just-in-Time IAM privilege elevation']
      ]
    );

    const mat = determineSecMateriality({
      estimatedFinancialLossUsd: 350000,
      annualRevenueThresholdUsd: 10000000,
      detectionTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      determinationTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      piiExfiltratedRecordCount: 0,
      criticalSystemsDowntimeHours: 0,
      intellectualPropertyCompromised: false,
      regulatorySanctionsProbable: false,
      reputationalDamageHigh: false
    });

    const compositeScore = calculateCompositeSecurityScore({
      inherentAleTotalUsd: 16500000,
      residualAleTotalUsd: 4800000,
      attackSurfaceRating: 28,
      darkWebExposureIndex: 22,
      auditDefensibilityScore: 84,
      ransomwareResilienceIndex: 82
    });

    const memoId = crypto.randomUUID();
    const memoObj: BoardCyberMemorandumDTO = {
      id: memoId,
      userId,
      fiscalYear: 2026,
      quarter: 4,
      title: 'Q4 2026 Board Audit & Risk Committee Cybersecurity & SEC Materiality Briefing',
      compositeSecurityPostureScore: compositeScore.compositeSecurityPostureScore,
      postureTier: compositeScore.postureTier,
      workflowStatus: 'pending_ciso',
      secMateriality: {
        incidentId: 'INC-2026-Q4-01',
        incidentTitle: 'XZ Utils Proactive Threat Mitigation Assessment',
        detectionTimestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        determinationTimestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: mat.status,
        estimatedFinancialLossUsd: 350000,
        annualRevenueThresholdUsd: 10000000,
        quantitativeMaterialityRatio: mat.quantitativeMaterialityRatio,
        isQuantitativelyMaterial: mat.isQuantitativelyMaterial,
        qualitativeScore: mat.qualitativeScore,
        isQualitativelyMaterial: mat.isQualitativelyMaterial,
        isMaterial: mat.isMaterial,
        disclosureClockElapsedHours: mat.disclosureClockElapsedHours,
        disclosureClockRemainingHours: mat.disclosureClockRemainingHours,
        isClockBreached: mat.isClockBreached,
        piiExfiltratedRecordCount: 0,
        criticalSystemsDowntimeHours: 0,
        intellectualPropertyCompromised: false,
        regulatorySanctionsProbable: false,
        reputationalDamageHigh: false,
        cisoDeterminationNotes: 'Proactive scanning neutralized backdoored package before deployment.',
        cloLegalEvaluationNotes: 'Incident non-material under SEC Item 1.05 standard.'
      },
      signOffs: [
        {
          role: 'ciso',
          roleLabel: 'Chief Information Security Officer',
          signatoryName: 'Marcus Vance, CISSP',
          signatoryTitle: 'CISO & VP Enterprise Information Security',
          isApproved: true,
          signedAt: new Date().toISOString(),
          signatureHash: crypto.createHash('sha256').update(`ciso:${memoId}`).digest('hex'),
          attestationRemarks: 'FAIR risk simulations, EPSS telemetry, and resilience metrics verified.'
        },
        {
          role: 'chief_legal_officer',
          roleLabel: 'Chief Legal Officer',
          signatoryName: 'Elena Rostova, JD',
          signatoryTitle: 'General Counsel & Corporate Secretary',
          isApproved: false,
          attestationRemarks: undefined
        },
        {
          role: 'board_audit_chair',
          roleLabel: 'Board Audit & Risk Committee Chair',
          signatoryName: 'Sir Arthur Sterling',
          signatoryTitle: 'Independent Audit Committee Chair',
          isApproved: false,
          attestationRemarks: undefined
        }
      ],
      memorandumMarkdown: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoObj.memorandumMarkdown = generateBoardCyberMemorandumMarkdown(memoObj);

    await this.pool.query(
      `INSERT INTO board_cyber_memoranda (
        id, user_id, fiscal_year, quarter, title,
        composite_security_posture_score, posture_tier, workflow_status,
        sec_materiality_json, sign_offs_json, memorandum_markdown
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        memoObj.id, userId, memoObj.fiscalYear, memoObj.quarter, memoObj.title,
        memoObj.compositeSecurityPostureScore, memoObj.postureTier, memoObj.workflowStatus,
        JSON.stringify(memoObj.secMateriality), JSON.stringify(memoObj.signOffs), memoObj.memorandumMarkdown
      ]
    );
  }

  async getOverview(userId: string): Promise<CyberRiskStudioOverviewDTO> {
    await this.ensureSchema();
    await this.seedDefaultsIfEmpty(userId);

    const [scenariosRes, vulnsRes, darkWebRes, controlsRes, simsRes, memoRes] = await Promise.all([
      this.pool.query(`SELECT * FROM cyber_risk_scenarios WHERE user_id = $1 ORDER BY annualized_loss_expectancy_usd DESC`, [userId]),
      this.pool.query(`SELECT * FROM threat_vulnerabilities WHERE user_id = $1 ORDER BY composite_risk_score DESC`, [userId]),
      this.pool.query(`SELECT * FROM dark_web_exposures WHERE user_id = $1 ORDER BY exposure_risk_score DESC`, [userId]),
      this.pool.query(`SELECT * FROM compliance_controls WHERE user_id = $1 ORDER BY subcategory_code ASC`, [userId]),
      this.pool.query(`SELECT * FROM tabletop_simulations WHERE user_id = $1 ORDER BY conducted_date DESC`, [userId]),
      this.pool.query(`SELECT * FROM board_cyber_memoranda WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1`, [userId])
    ]);

    const scenarios: CyberRiskScenarioDTO[] = scenariosRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      category: r.category as CyberRiskCategory,
      assetName: r.asset_name,
      threatActor: r.threat_actor,
      contactFrequency: Number(r.contact_frequency),
      probabilityOfAction: Number(r.probability_of_action),
      threatEventFrequency: Number(r.threat_event_frequency),
      threatCapability: Number(r.threat_capability),
      resistanceStrength: Number(r.resistance_strength),
      vulnerabilityPercent: Number(r.vulnerability_percent),
      lossEventFrequency: Number(r.loss_event_frequency),
      primaryLossMinUsd: Number(r.primary_loss_min_usd),
      primaryLossLikelyUsd: Number(r.primary_loss_likely_usd),
      primaryLossMaxUsd: Number(r.primary_loss_max_usd),
      secondaryLossMinUsd: Number(r.secondary_loss_min_usd),
      secondaryLossLikelyUsd: Number(r.secondary_loss_likely_usd),
      secondaryLossMaxUsd: Number(r.secondary_loss_max_usd),
      singleLossExpectancyExpectedUsd: Number(r.single_loss_expectancy_expected_usd),
      singleLossExpectancyStdDevUsd: Number(r.single_loss_expectancy_std_dev_usd),
      annualizedLossExpectancyUsd: Number(r.annualized_loss_expectancy_usd),
      valueAtRisk95PercentUsd: Number(r.value_at_risk_95_percent_usd),
      inherentAleUsd: Number(r.inherent_ale_usd),
      residualAleUsd: Number(r.residual_ale_usd),
      riskReductionRatio: Number(r.risk_reduction_ratio),
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));

    const vulnerabilities: ThreatVulnerabilityDTO[] = vulnsRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      cveId: r.cve_id,
      title: r.title,
      cvssScore: Number(r.cvss_score),
      epssProbability: Number(r.epss_probability),
      epssPercentile: Number(r.epss_percentile),
      cisaKevStatus: Boolean(r.cisa_kev_status),
      affectedAsset: r.affected_asset,
      component: r.component,
      compositeRiskScore: Number(r.composite_risk_score),
      priorityTier: r.priority_tier as VulnerabilityPriorityTier,
      remediationStatus: r.remediation_status,
      patchDueDate: r.patch_due_date,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));

    const darkWebExposures: DarkWebExposureDTO[] = darkWebRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      targetDomain: r.target_domain,
      breachSource: r.breach_source,
      exposureDate: r.exposure_date,
      leakedEmail: r.leaked_email,
      hasPlaintextPassword: Boolean(r.has_plaintext_password),
      hasSessionToken: Boolean(r.has_session_token),
      isVipExecutive: Boolean(r.is_vip_executive),
      vipTitle: r.vip_title || undefined,
      infostealerVariant: r.infostealer_variant || undefined,
      exposureRiskScore: Number(r.exposure_risk_score),
      remediationStatus: r.remediation_status,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));

    const controls: ComplianceControlDTO[] = controlsRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      functionCode: r.function_code as NistCsfFunction,
      categoryCode: r.category_code,
      subcategoryCode: r.subcategory_code,
      title: r.title,
      description: r.description,
      iso27001Mapping: r.iso27001_mapping,
      soc2Mapping: r.soc2_mapping,
      hipaaMapping: r.hipaa_mapping,
      maturityTier: r.maturity_tier as NistMaturityTier,
      maturityNumericTier: Number(r.maturity_numeric_tier),
      hasVerifiedEvidence: Boolean(r.has_verified_evidence),
      lastAuditedDate: r.last_audited_date,
      auditorNotes: r.auditor_notes,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));

    const tabletopSimulations: TabletopSimulationDTO[] = simsRes.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      archetype: r.archetype as TabletopBreachArchetype,
      scenarioTitle: r.scenario_title,
      conductedDate: r.conducted_date,
      participantsCount: Number(r.participants_count),
      meanTimeToDetectHours: Number(r.mean_time_to_detect_hours),
      meanTimeToContainHours: Number(r.mean_time_to_contain_hours),
      simulatedRansomDemandedUsd: Number(r.simulated_ransom_demanded_usd),
      simulatedBusinessInterruptionDays: Number(r.simulated_business_interruption_days),
      simulatedTotalLossUsd: Number(r.simulated_total_loss_usd),
      immutableBackupScore: Number(r.immutable_backup_score),
      airgapIsolationScore: Number(r.airgap_isolation_score),
      rtoRpoDrillScore: Number(r.rto_rpo_drill_score),
      pamSegregationScore: Number(r.pam_segregation_score),
      ransomwareResilienceIndex: Number(r.ransomware_resilience_index),
      keyFindings: r.key_findings || [],
      remediationActionItems: r.remediation_action_items || [],
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    }));

    const asr = calculateAttackSurfaceRating({
      exposedPortsCount: 8,
      shadowItDomainsCount: 3,
      cloudMisconfigurationsCount: 2,
      criticalVulnerabilitiesCount: vulnerabilities.filter(v => v.priorityTier === 'critical').length
    });

    const clei = calculateDarkWebExposureIndex(darkWebExposures);

    const threatLandscape: ThreatLandscapeOverviewDTO = {
      attackSurfaceRating: asr,
      credentialLeakExposureIndex: clei,
      totalVulnerabilitiesCount: vulnerabilities.length,
      criticalVulnerabilitiesCount: vulnerabilities.filter(v => v.priorityTier === 'critical').length,
      cisaKevActiveCount: vulnerabilities.filter(v => v.cisaKevStatus).length,
      vipExecutivesMonitoredCount: 8,
      vipExecutivesCompromisedCount: darkWebExposures.filter(d => d.isVipExecutive && d.remediationStatus === 'active').length,
      vulnerabilities,
      darkWebExposures
    };

    const nistMetrics = calculateNistComplianceMetrics(controls);
    const complianceMatrix: ComplianceMatrixOverviewDTO = {
      auditDefensibilityScore: nistMetrics.auditDefensibilityScore,
      overallMaturityAverage: nistMetrics.overallMaturityAverage,
      totalControlsCount: controls.length,
      totalEvidencedCount: controls.filter(c => c.hasVerifiedEvidence).length,
      evidenceCoverageRate: controls.length > 0 ? Number(((controls.filter(c => c.hasVerifiedEvidence).length / controls.length) * 100).toFixed(1)) : 0,
      functionSummaries: nistMetrics.functionSummaries,
      controls
    };

    const totalAle = scenarios.reduce((acc, s) => acc + s.annualizedLossExpectancyUsd, 0);
    const totalVaR95 = scenarios.reduce((acc, s) => acc + s.valueAtRisk95PercentUsd, 0);
    const avgRri = tabletopSimulations.length > 0
      ? Math.round(tabletopSimulations.reduce((acc, s) => acc + s.ransomwareResilienceIndex, 0) / tabletopSimulations.length)
      : 80;

    const insurancePolicy: CyberInsurancePolicyDTO = {
      policyNumber: 'CYBER-2026-CHUBB-99824',
      carrierName: 'Chubb Global Cyber Syndicate',
      expirationDate: '2027-04-15',
      primaryAggregateLimitUsd: 15000000,
      ransomwareExtortionSublimitUsd: 5000000,
      businessInterruptionSublimitUsd: 7500000,
      regulatoryFineSublimitUsd: 5000000,
      forensicLegalSublimitUsd: 2500000,
      selfInsuredRetentionUsd: 250000,
      waitingPeriodHours: 8,
      annualPremiumUsd: 185000,
      totalVaR95ExposureUsd: totalVaR95,
      coverageShortfallUsd: Math.max(0, totalVaR95 - 15000000),
      insurabilityReadinessScore: Math.min(100, Math.round(0.6 * avgRri + 0.4 * nistMetrics.auditDefensibilityScore)),
      underwritingDeficiencies: ['Ransomware sublimit is below 95% single loss expectancy', 'Cloud S3 bucket logging audit required quarterly']
    };

    const inherentTotal = scenarios.reduce((acc, s) => acc + s.inherentAleUsd, 0);
    const residualTotal = totalAle;
    const composite = calculateCompositeSecurityScore({
      inherentAleTotalUsd: inherentTotal,
      residualAleTotalUsd: residualTotal,
      attackSurfaceRating: asr,
      darkWebExposureIndex: clei,
      auditDefensibilityScore: nistMetrics.auditDefensibilityScore,
      ransomwareResilienceIndex: avgRri
    });

    let activeMemorandum: BoardCyberMemorandumDTO;
    if (memoRes.rows.length > 0) {
      const r = memoRes.rows[0];
      activeMemorandum = {
        id: r.id,
        userId: r.user_id,
        fiscalYear: Number(r.fiscal_year),
        quarter: Number(r.quarter),
        title: r.title,
        compositeSecurityPostureScore: Number(r.composite_security_posture_score),
        postureTier: r.posture_tier as CyberPostureTier,
        workflowStatus: r.workflow_status as MemorandumWorkflowStatus,
        secMateriality: r.sec_materiality_json,
        signOffs: r.sign_offs_json,
        memorandumMarkdown: r.memorandum_markdown,
        createdAt: r.created_at.toISOString(),
        updatedAt: r.updated_at.toISOString()
      };
    } else {
      activeMemorandum = {
        id: crypto.randomUUID(),
        userId,
        fiscalYear: 2026,
        quarter: 4,
        title: 'Q4 2026 Board Cybersecurity Briefing',
        compositeSecurityPostureScore: composite.compositeSecurityPostureScore,
        postureTier: composite.postureTier,
        workflowStatus: 'draft',
        secMateriality: {
          incidentId: 'INC-DEFAULT',
          incidentTitle: 'Baseline Posture Audit',
          detectionTimestamp: new Date().toISOString(),
          determinationTimestamp: new Date().toISOString(),
          status: 'non_material',
          estimatedFinancialLossUsd: 0,
          annualRevenueThresholdUsd: 10000000,
          quantitativeMaterialityRatio: 0,
          isQuantitativelyMaterial: false,
          qualitativeScore: 0,
          isQualitativelyMaterial: false,
          isMaterial: false,
          disclosureClockElapsedHours: 0,
          disclosureClockRemainingHours: 96,
          isClockBreached: false,
          piiExfiltratedRecordCount: 0,
          criticalSystemsDowntimeHours: 0,
          intellectualPropertyCompromised: false,
          regulatorySanctionsProbable: false,
          reputationalDamageHigh: false,
          cisoDeterminationNotes: 'Routine operations.',
          cloLegalEvaluationNotes: 'No reportable events.'
        },
        signOffs: [],
        memorandumMarkdown: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

    return {
      compositeSecurityPostureScore: composite.compositeSecurityPostureScore,
      postureTier: composite.postureTier,
      totalAnnualizedLossExpectancyUsd: totalAle,
      totalValueAtRisk95Usd: totalVaR95,
      attackSurfaceRating: asr,
      darkWebExposureIndex: clei,
      auditDefensibilityScore: nistMetrics.auditDefensibilityScore,
      ransomwareResilienceIndex: avgRri,
      insuranceCoverageGapUsd: insurancePolicy.coverageShortfallUsd,
      activeSecDisclosureRequired: activeMemorandum.secMateriality?.isMaterial ?? false,
      scenarios,
      threatLandscape,
      complianceMatrix,
      tabletopSimulations,
      insurancePolicy,
      activeMemorandum
    };
  }

  async createScenario(userId: string, input: CyberRiskScenarioMutationDTO): Promise<CyberRiskScenarioDTO> {
    const val = validateCyberRiskScenarioInput(input);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    const fair = calculateFairRiskMetrics({
      contactFrequency: input.contactFrequency,
      probabilityOfAction: input.probabilityOfAction,
      threatCapability: input.threatCapability,
      resistanceStrength: input.resistanceStrength,
      primaryLossMinUsd: input.primaryLossMinUsd,
      primaryLossLikelyUsd: input.primaryLossLikelyUsd,
      primaryLossMaxUsd: input.primaryLossMaxUsd,
      secondaryLossMinUsd: input.secondaryLossMinUsd,
      secondaryLossLikelyUsd: input.secondaryLossLikelyUsd,
      secondaryLossMaxUsd: input.secondaryLossMaxUsd,
      inherentAleUsd: input.inherentAleUsd
    });

    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO cyber_risk_scenarios (
        id, user_id, title, category, asset_name, threat_actor,
        contact_frequency, probability_of_action, threat_event_frequency,
        threat_capability, resistance_strength, vulnerability_percent, loss_event_frequency,
        primary_loss_min_usd, primary_loss_likely_usd, primary_loss_max_usd,
        secondary_loss_min_usd, secondary_loss_likely_usd, secondary_loss_max_usd,
        single_loss_expectancy_expected_usd, single_loss_expectancy_std_dev_usd,
        annualized_loss_expectancy_usd, value_at_risk_95_percent_usd,
        inherent_ale_usd, residual_ale_usd, risk_reduction_ratio
      ) VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)
      RETURNING *`,
      [
        id, userId, input.title, input.category, input.assetName, input.threatActor,
        input.contactFrequency, input.probabilityOfAction, fair.threatEventFrequency,
        input.threatCapability, input.resistanceStrength, fair.vulnerabilityPercent, fair.lossEventFrequency,
        input.primaryLossMinUsd, input.primaryLossLikelyUsd, input.primaryLossMaxUsd,
        input.secondaryLossMinUsd, input.secondaryLossLikelyUsd, input.secondaryLossMaxUsd,
        fair.singleLossExpectancyExpectedUsd, fair.singleLossExpectancyStdDevUsd,
        fair.annualizedLossExpectancyUsd, fair.valueAtRisk95PercentUsd,
        input.inherentAleUsd, fair.residualAleUsd, fair.riskReductionRatio
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      title: r.title,
      category: r.category as CyberRiskCategory,
      assetName: r.asset_name,
      threatActor: r.threat_actor,
      contactFrequency: Number(r.contact_frequency),
      probabilityOfAction: Number(r.probability_of_action),
      threatEventFrequency: Number(r.threat_event_frequency),
      threatCapability: Number(r.threat_capability),
      resistanceStrength: Number(r.resistance_strength),
      vulnerabilityPercent: Number(r.vulnerability_percent),
      lossEventFrequency: Number(r.loss_event_frequency),
      primaryLossMinUsd: Number(r.primary_loss_min_usd),
      primaryLossLikelyUsd: Number(r.primary_loss_likely_usd),
      primaryLossMaxUsd: Number(r.primary_loss_max_usd),
      secondaryLossMinUsd: Number(r.secondary_loss_min_usd),
      secondaryLossLikelyUsd: Number(r.secondary_loss_likely_usd),
      secondaryLossMaxUsd: Number(r.secondary_loss_max_usd),
      singleLossExpectancyExpectedUsd: Number(r.single_loss_expectancy_expected_usd),
      singleLossExpectancyStdDevUsd: Number(r.single_loss_expectancy_std_dev_usd),
      annualizedLossExpectancyUsd: Number(r.annualized_loss_expectancy_usd),
      valueAtRisk95PercentUsd: Number(r.value_at_risk_95_percent_usd),
      inherentAleUsd: Number(r.inherent_ale_usd),
      residualAleUsd: Number(r.residual_ale_usd),
      riskReductionRatio: Number(r.risk_reduction_ratio),
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async deleteScenario(userId: string, scenarioId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM cyber_risk_scenarios WHERE id = $1 AND user_id = $2`,
      [scenarioId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async createVulnerability(userId: string, input: ThreatVulnerabilityMutationDTO): Promise<ThreatVulnerabilityDTO> {
    const val = validateThreatVulnerabilityInput(input);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    const priority = calculateVulnerabilityPriority(input.cvssScore, input.epssProbability, input.cisaKevStatus);
    const id = crypto.randomUUID();

    const res = await this.pool.query(
      `INSERT INTO threat_vulnerabilities (
        id, user_id, cve_id, title, cvss_score, epss_probability, epss_percentile,
        cisa_kev_status, affected_asset, component, composite_risk_score, priority_tier,
        remediation_status, patch_due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        id, userId, input.cveId, input.title, input.cvssScore, input.epssProbability, input.epssPercentile,
        input.cisaKevStatus, input.affectedAsset, input.component, priority.compositeRiskScore, priority.priorityTier,
        input.remediationStatus, input.patchDueDate
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      cveId: r.cve_id,
      title: r.title,
      cvssScore: Number(r.cvss_score),
      epssProbability: Number(r.epss_probability),
      epssPercentile: Number(r.epss_percentile),
      cisaKevStatus: Boolean(r.cisa_kev_status),
      affectedAsset: r.affected_asset,
      component: r.component,
      compositeRiskScore: Number(r.composite_risk_score),
      priorityTier: r.priority_tier as VulnerabilityPriorityTier,
      remediationStatus: r.remediation_status,
      patchDueDate: r.patch_due_date,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async deleteVulnerability(userId: string, vulnId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM threat_vulnerabilities WHERE id = $1 AND user_id = $2`,
      [vulnId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async createDarkWebExposure(userId: string, input: DarkWebExposureMutationDTO): Promise<DarkWebExposureDTO> {
    const val = validateDarkWebExposureInput(input);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    let score = 40;
    if (input.hasSessionToken) score += 40;
    else if (input.hasPlaintextPassword) score += 25;
    if (input.isVipExecutive) score += 20;

    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO dark_web_exposures (
        id, user_id, target_domain, breach_source, exposure_date, leaked_email,
        has_plaintext_password, has_session_token, is_vip_executive, vip_title,
        infostealer_variant, exposure_risk_score, remediation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, userId, input.targetDomain, input.breachSource, input.exposureDate, input.leakedEmail,
        input.hasPlaintextPassword, input.hasSessionToken, input.isVipExecutive, input.vipTitle,
        input.infostealerVariant, Math.min(100, score), input.remediationStatus
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      targetDomain: r.target_domain,
      breachSource: r.breach_source,
      exposureDate: r.exposure_date,
      leakedEmail: r.leaked_email,
      hasPlaintextPassword: Boolean(r.has_plaintext_password),
      hasSessionToken: Boolean(r.has_session_token),
      isVipExecutive: Boolean(r.is_vip_executive),
      vipTitle: r.vip_title || undefined,
      infostealerVariant: r.infostealer_variant || undefined,
      exposureRiskScore: Number(r.exposure_risk_score),
      remediationStatus: r.remediation_status,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async deleteDarkWebExposure(userId: string, exposureId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM dark_web_exposures WHERE id = $1 AND user_id = $2`,
      [exposureId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async createComplianceControl(userId: string, input: ComplianceControlMutationDTO): Promise<ComplianceControlDTO> {
    const val = validateComplianceControlInput(input);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    let numericTier = 2;
    if (input.maturityTier === 'tier_4_adaptive') numericTier = 4;
    else if (input.maturityTier === 'tier_3_repeatable') numericTier = 3;
    else if (input.maturityTier === 'tier_1_partial') numericTier = 1;

    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO compliance_controls (
        id, user_id, function_code, category_code, subcategory_code,
        title, description, iso27001_mapping, soc2_mapping, hipaa_mapping,
        maturity_tier, maturity_numeric_tier, has_verified_evidence,
        last_audited_date, auditor_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, userId, input.functionCode, input.categoryCode, input.subcategoryCode,
        input.title, input.description, input.iso27001Mapping, input.soc2Mapping, input.hipaaMapping,
        input.maturityTier, numericTier, input.hasVerifiedEvidence,
        input.lastAuditedDate, input.auditorNotes
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      functionCode: r.function_code as NistCsfFunction,
      categoryCode: r.category_code,
      subcategoryCode: r.subcategory_code,
      title: r.title,
      description: r.description,
      iso27001Mapping: r.iso27001_mapping,
      soc2Mapping: r.soc2_mapping,
      hipaaMapping: r.hipaa_mapping,
      maturityTier: r.maturity_tier as NistMaturityTier,
      maturityNumericTier: Number(r.maturity_numeric_tier),
      hasVerifiedEvidence: Boolean(r.has_verified_evidence),
      lastAuditedDate: r.last_audited_date,
      auditorNotes: r.auditor_notes,
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async deleteComplianceControl(userId: string, controlId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM compliance_controls WHERE id = $1 AND user_id = $2`,
      [controlId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async createTabletopSimulation(userId: string, input: TabletopSimulationMutationDTO): Promise<TabletopSimulationDTO> {
    const val = validateTabletopSimulationInput(input);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    const resilience = calculateTabletopResilience({
      immutableBackupScore: input.immutableBackupScore,
      airgapIsolationScore: input.airgapIsolationScore,
      rtoRpoDrillScore: input.rtoRpoDrillScore,
      pamSegregationScore: input.pamSegregationScore,
      meanTimeToDetectHours: input.meanTimeToDetectHours,
      meanTimeToContainHours: input.meanTimeToContainHours,
      simulatedTotalLossUsd: input.simulatedTotalLossUsd,
      insurancePrimaryLimitUsd: 15000000
    });

    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO tabletop_simulations (
        id, user_id, archetype, scenario_title, conducted_date, participants_count,
        mean_time_to_detect_hours, mean_time_to_contain_hours, simulated_ransom_demanded_usd,
        simulated_business_interruption_days, simulated_total_loss_usd,
        immutable_backup_score, airgap_isolation_score, rto_rpo_drill_score, pam_segregation_score,
        ransomware_resilience_index, key_findings, remediation_action_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        id, userId, input.archetype, input.scenarioTitle, input.conductedDate, input.participantsCount,
        input.meanTimeToDetectHours, input.meanTimeToContainHours, input.simulatedRansomDemandedUsd,
        input.simulatedBusinessInterruptionDays, input.simulatedTotalLossUsd,
        input.immutableBackupScore, input.airgapIsolationScore, input.rtoRpoDrillScore, input.pamSegregationScore,
        resilience.ransomwareResilienceIndex, input.keyFindings, input.remediationActionItems
      ]
    );

    const r = res.rows[0];
    return {
      id: r.id,
      userId: r.user_id,
      archetype: r.archetype as TabletopBreachArchetype,
      scenarioTitle: r.scenario_title,
      conductedDate: r.conducted_date,
      participantsCount: Number(r.participants_count),
      meanTimeToDetectHours: Number(r.mean_time_to_detect_hours),
      meanTimeToContainHours: Number(r.mean_time_to_contain_hours),
      simulatedRansomDemandedUsd: Number(r.simulated_ransom_demanded_usd),
      simulatedBusinessInterruptionDays: Number(r.simulated_business_interruption_days),
      simulatedTotalLossUsd: Number(r.simulated_total_loss_usd),
      immutableBackupScore: Number(r.immutable_backup_score),
      airgapIsolationScore: Number(r.airgap_isolation_score),
      rtoRpoDrillScore: Number(r.rto_rpo_drill_score),
      pamSegregationScore: Number(r.pam_segregation_score),
      ransomwareResilienceIndex: Number(r.ransomware_resilience_index),
      keyFindings: r.key_findings || [],
      remediationActionItems: r.remediation_action_items || [],
      createdAt: r.created_at.toISOString(),
      updatedAt: r.updated_at.toISOString()
    };
  }

  async deleteTabletopSimulation(userId: string, simId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM tabletop_simulations WHERE id = $1 AND user_id = $2`,
      [simId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async signOffMemorandum(userId: string, memoId: string, payload: GovernanceSignOffPayloadDTO): Promise<BoardCyberMemorandumDTO> {
    const val = validateGovernanceSignOffInput(payload);
    if (!val.valid) throw new Error(`Validation failed: ${val.errors.join('; ')}`);

    const memoRes = await this.pool.query(
      `SELECT * FROM board_cyber_memoranda WHERE id = $1 AND user_id = $2`,
      [memoId, userId]
    );
    if (memoRes.rows.length === 0) throw new Error(`Memorandum not found or unauthorized.`);

    const r = memoRes.rows[0];
    const signOffs: GovernanceSignOffRecordDTO[] = r.sign_offs_json || [];

    const existingIdx = signOffs.findIndex(s => s.role === payload.role);
    const hash = crypto.createHash('sha256').update(`${payload.role}:${memoId}:${Date.now()}`).digest('hex');

    const updatedRecord: GovernanceSignOffRecordDTO = {
      role: payload.role,
      roleLabel: payload.role === 'ciso'
        ? 'Chief Information Security Officer'
        : payload.role === 'chief_legal_officer'
          ? 'Chief Legal Officer'
          : 'Board Audit & Risk Committee Chair',
      signatoryName: payload.signatoryName,
      signatoryTitle: payload.signatoryTitle,
      signatureHash: hash,
      signedAt: new Date().toISOString(),
      isApproved: true,
      attestationRemarks: payload.attestationRemarks
    };

    if (existingIdx >= 0) {
      signOffs[existingIdx] = updatedRecord;
    } else {
      signOffs.push(updatedRecord);
    }

    const allApproved = ['ciso', 'chief_legal_officer', 'board_audit_chair'].every(
      role => signOffs.some(s => s.role === role && s.isApproved)
    );

    let nextStatus: MemorandumWorkflowStatus = 'pending_ciso';
    if (allApproved) {
      nextStatus = 'board_approved';
    } else if (signOffs.some(s => s.role === 'chief_legal_officer' && s.isApproved)) {
      nextStatus = 'pending_board_chair';
    } else if (signOffs.some(s => s.role === 'ciso' && s.isApproved)) {
      nextStatus = 'pending_clo';
    }

    const memoDTO: BoardCyberMemorandumDTO = {
      id: r.id,
      userId: r.user_id,
      fiscalYear: Number(r.fiscal_year),
      quarter: Number(r.quarter),
      title: r.title,
      compositeSecurityPostureScore: Number(r.composite_security_posture_score),
      postureTier: r.posture_tier as CyberPostureTier,
      workflowStatus: nextStatus,
      secMateriality: r.sec_materiality_json,
      signOffs,
      memorandumMarkdown: '',
      createdAt: r.created_at.toISOString(),
      updatedAt: new Date().toISOString()
    };
    memoDTO.memorandumMarkdown = generateBoardCyberMemorandumMarkdown(memoDTO);

    const updateRes = await this.pool.query(
      `UPDATE board_cyber_memoranda
       SET sign_offs_json = $1, workflow_status = $2, memorandum_markdown = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [JSON.stringify(signOffs), nextStatus, memoDTO.memorandumMarkdown, memoId, userId]
    );

    const updated = updateRes.rows[0];
    return {
      id: updated.id,
      userId: updated.user_id,
      fiscalYear: Number(updated.fiscal_year),
      quarter: Number(updated.quarter),
      title: updated.title,
      compositeSecurityPostureScore: Number(updated.composite_security_posture_score),
      postureTier: updated.posture_tier as CyberPostureTier,
      workflowStatus: updated.workflow_status as MemorandumWorkflowStatus,
      secMateriality: updated.sec_materiality_json,
      signOffs: updated.sign_offs_json,
      memorandumMarkdown: updated.memorandum_markdown,
      createdAt: updated.created_at.toISOString(),
      updatedAt: updated.updated_at.toISOString()
    };
  }
}
