import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type TechnicalDueDiligenceAuditDTO,
  type TechnicalDueDiligenceMutationDTO,
  type DiligenceFindingDTO,
  type DiligenceFindingMutationDTO,
  calculateTechnicalDebtRatio,
  calculateSpofCriticalityIndex,
  calculateScalabilityHorizon,
  calculateOpenSourceContagionScore,
  calculateCloudGrossMargin,
  calculateSecurityComplianceIndex,
  calculateSpecialEscrowHoldback,
  calculateEngineeringVelocityQuotient,
  calculateBusFactorVulnerability,
  calculateCompositeRagScorecard,
  determineTransactionRecommendation,
  generateTechnicalDueDiligenceMemoMarkdown
} from '@jobtrack/contract';

export class TechnicalDueDiligenceService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS tech_diligence_audits (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_company_name VARCHAR(255) NOT NULL,
        deal_size_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        transaction_type VARCHAR(64) NOT NULL DEFAULT 'buy_side_acquisition',
        audit_lead_name VARCHAR(255) NOT NULL,
        audit_date DATE NOT NULL,
        architecture JSONB NOT NULL DEFAULT '{}'::jsonb,
        licenses JSONB NOT NULL DEFAULT '{}'::jsonb,
        cloud_economics JSONB NOT NULL DEFAULT '{}'::jsonb,
        security_compliance JSONB NOT NULL DEFAULT '{}'::jsonb,
        team_velocity JSONB NOT NULL DEFAULT '{}'::jsonb,
        scorecard JSONB NOT NULL DEFAULT '{}'::jsonb,
        recommendation VARCHAR(64) NOT NULL DEFAULT 'proceed_standard',
        executive_summary_text TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tech_diligence_audits_user_updated
        ON tech_diligence_audits(user_id, updated_at DESC);

      CREATE TABLE IF NOT EXISTS tech_diligence_findings (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        audit_id UUID NOT NULL REFERENCES tech_diligence_audits(id) ON DELETE CASCADE,
        pillar VARCHAR(32) NOT NULL,
        title VARCHAR(255) NOT NULL,
        severity VARCHAR(32) NOT NULL DEFAULT 'moderate',
        financial_impact_usd NUMERIC(15, 2) NOT NULL DEFAULT 0,
        remediation_days INT NOT NULL DEFAULT 0,
        description TEXT NOT NULL DEFAULT '',
        remediation_plan TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tech_diligence_findings_audit
        ON tech_diligence_findings(audit_id, created_at ASC);

      CREATE INDEX IF NOT EXISTS idx_tech_diligence_findings_user
        ON tech_diligence_findings(user_id);
    `);
  }

  async listAudits(userId: string): Promise<TechnicalDueDiligenceAuditDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM tech_diligence_audits WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    if (res.rows.length === 0) {
      const seeded = await this.seedDefaultAudit(userId);
      return [seeded];
    }
    return res.rows.map(row => this.mapAuditRow(row));
  }

  async getAudit(userId: string, id: string): Promise<TechnicalDueDiligenceAuditDTO | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM tech_diligence_audits WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (res.rows.length === 0) return null;
    return this.mapAuditRow(res.rows[0]);
  }

  async createAudit(userId: string, input: TechnicalDueDiligenceMutationDTO): Promise<TechnicalDueDiligenceAuditDTO> {
    await this.ensureSchema();
    const id = crypto.randomUUID();
    const enriched = this.recomputeAudit(input);

    await this.pool.query(
      `INSERT INTO tech_diligence_audits (
        id, user_id, target_company_name, deal_size_usd, transaction_type,
        audit_lead_name, audit_date, architecture, licenses, cloud_economics,
        security_compliance, team_velocity, scorecard, recommendation, executive_summary_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        userId,
        enriched.targetCompanyName,
        enriched.dealSizeUsd,
        enriched.transactionType,
        enriched.auditLeadName,
        enriched.auditDate,
        JSON.stringify(enriched.architecture),
        JSON.stringify(enriched.licenses),
        JSON.stringify(enriched.cloudEconomics),
        JSON.stringify(enriched.securityCompliance),
        JSON.stringify(enriched.teamVelocity),
        JSON.stringify(enriched.scorecard),
        enriched.recommendation,
        enriched.executiveSummaryText || ''
      ]
    );

    return (await this.getAudit(userId, id))!;
  }

  async updateAudit(userId: string, id: string, input: TechnicalDueDiligenceMutationDTO): Promise<TechnicalDueDiligenceAuditDTO | null> {
    await this.ensureSchema();
    const existing = await this.getAudit(userId, id);
    if (!existing) return null;

    const enriched = this.recomputeAudit(input);

    await this.pool.query(
      `UPDATE tech_diligence_audits SET
        target_company_name = $1,
        deal_size_usd = $2,
        transaction_type = $3,
        audit_lead_name = $4,
        audit_date = $5,
        architecture = $6,
        licenses = $7,
        cloud_economics = $8,
        security_compliance = $9,
        team_velocity = $10,
        scorecard = $11,
        recommendation = $12,
        executive_summary_text = $13,
        updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $14 AND id = $15`,
      [
        enriched.targetCompanyName,
        enriched.dealSizeUsd,
        enriched.transactionType,
        enriched.auditLeadName,
        enriched.auditDate,
        JSON.stringify(enriched.architecture),
        JSON.stringify(enriched.licenses),
        JSON.stringify(enriched.cloudEconomics),
        JSON.stringify(enriched.securityCompliance),
        JSON.stringify(enriched.teamVelocity),
        JSON.stringify(enriched.scorecard),
        enriched.recommendation,
        enriched.executiveSummaryText || '',
        userId,
        id
      ]
    );

    return this.getAudit(userId, id);
  }

  async deleteAudit(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM tech_diligence_audits WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (res.rowCount || 0) > 0;
  }

  async listFindings(userId: string, auditId: string): Promise<DiligenceFindingDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT * FROM tech_diligence_findings WHERE user_id = $1 AND audit_id = $2 ORDER BY created_at ASC`,
      [userId, auditId]
    );
    return res.rows.map(row => ({
      id: row.id,
      auditId: row.audit_id,
      pillar: row.pillar,
      title: row.title,
      severity: row.severity,
      financialImpactUsd: Number(row.financial_impact_usd),
      remediationDays: Number(row.remediation_days),
      description: row.description,
      remediationPlan: row.remediation_plan,
      createdAt: row.created_at.toISOString()
    }));
  }

  async addFinding(userId: string, auditId: string, input: DiligenceFindingMutationDTO): Promise<DiligenceFindingDTO | null> {
    await this.ensureSchema();
    const audit = await this.getAudit(userId, auditId);
    if (!audit) return null;

    const id = crypto.randomUUID();
    await this.pool.query(
      `INSERT INTO tech_diligence_findings (
        id, user_id, audit_id, pillar, title, severity, financial_impact_usd,
        remediation_days, description, remediation_plan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        userId,
        auditId,
        input.pillar,
        input.title,
        input.severity,
        input.financialImpactUsd,
        input.remediationDays,
        input.description || '',
        input.remediationPlan || ''
      ]
    );

    const findings = await this.listFindings(userId, auditId);
    return findings.find(f => f.id === id) || null;
  }

  async deleteFinding(userId: string, findingId: string): Promise<boolean> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM tech_diligence_findings WHERE user_id = $1 AND id = $2`,
      [userId, findingId]
    );
    return (res.rowCount || 0) > 0;
  }

  async generateMemo(userId: string, auditId: string): Promise<string | null> {
    await this.ensureSchema();
    const audit = await this.getAudit(userId, auditId);
    if (!audit) return null;
    return generateTechnicalDueDiligenceMemoMarkdown(audit);
  }

  private async seedDefaultAudit(userId: string): Promise<TechnicalDueDiligenceAuditDTO> {
    const defaultInput: TechnicalDueDiligenceMutationDTO = {
      targetCompanyName: 'CloudScale AI Corp',
      dealSizeUsd: 85000000,
      transactionType: 'buy_side_acquisition',
      auditLeadName: 'Alex Vance, Chief Architect',
      auditDate: '2026-10-25',
      architecture: {
        typology: 'modular_monolith',
        estimatedTotalLoc: 450000,
        costPerLocBurdened: 12.5,
        replacementCostEstimate: 5625000,
        technicalDebtRemediationCost: 450000,
        technicalDebtRatio: 8.0,
        rtoMinutesCurrent: 45,
        rtoMinutesTarget: 30,
        rpoMinutesCurrent: 15,
        rpoMinutesTarget: 5,
        disasterRecoveryTestedRecently: true,
        spofCount: 2,
        spofCriticalityIndex: 22,
        currentPeakQps: 1200,
        maxDatabaseQps: 6000,
        scalabilitySaturationHorizon: 5.0,
        identifiedSpofs: [
          { id: 'spof-1', component: 'Primary PostgreSQL Write Replica', type: 'primary_database', severity: 'high', redundancyInPlace: true, remediationEstimateDays: 20 },
          { id: 'spof-2', component: 'Redis Cache Cluster Single Node', type: 'cache_cluster', severity: 'moderate', redundancyInPlace: false, remediationEstimateDays: 5 }
        ]
      },
      licenses: {
        openSourceContagionScore: 15,
        proprietaryCodeLinkedWithGpl: false,
        cleanRoomDocumented: true,
        contractorAssignmentsComplete: true,
        patentFtoAnalyzed: true,
        dependenciesCount: 142,
        copyleftFindingsCount: 1,
        licenseBreakdown: {
          permissiveCount: 135,
          weakCopyleftCount: 6,
          strongCopyleftCount: 1,
          networkCopyleftCount: 0,
          commercialDualCount: 0
        },
        flaggedLibraries: [
          { id: 'lib-1', packageName: 'readline-native', version: '2.1.0', license: 'GPL-3.0', category: 'strong_copyleft', usageMode: 'internal_tool', riskLevel: 'low', remediationStrategy: 'replace_with_permissive', remediationCost: 15000 }
        ]
      },
      cloudEconomics: {
        annualRecurringRevenue: 24000000,
        annualCloudSpendTotal: 2100000,
        cloudCogsAmount: 1800000,
        cloudCogsPercentOfArr: 7.5,
        currentGrossMarginPercent: 81.2,
        projectedOptimizedGrossMarginPercent: 84.5,
        idleResourceWastageAnnual: 320000,
        multiYearCommitmentLiability: 0,
        finopsOptimizationCaptureEstimate: 240000,
        spendByProvider: {
          awsAnnual: 1800000,
          gcpAnnual: 300000,
          azureAnnual: 0,
          otherInfrastructureAnnual: 0
        },
        wastageCategories: {
          idleComputeAnnual: 180000,
          unattachedStorageAnnual: 40000,
          unindexedEgressAnnual: 20000,
          overprovisionedDbAnnual: 80000
        }
      },
      securityCompliance: {
        securityComplianceMaturityIndex: 88,
        soc2Type2Status: 'certified_unqualified',
        iso27001Status: 'certified_active',
        secItem106ReadinessScore: 92,
        thirdPartyPenTestRecencyMonths: 4,
        criticalCveCount: 0,
        highCveCount: 1,
        mediumCveCount: 3,
        gdprAutomatedDeletionCapable: true,
        piiEncryptionAtRest: true,
        piiEncryptionInTransit: true,
        recommendedSpecialEscrowHoldback: 2125000,
        remediationCostEstimate: 45000
      },
      teamVelocity: {
        doraDeploymentFrequency: 'elite',
        doraLeadTimeForChanges: 'high',
        doraChangeFailureRate: 'elite',
        doraTimeToRestoreService: 'elite',
        engineeringVelocityQuotient: 94,
        teamBusFactor: 4,
        topContributorCommitSharePercent: 28,
        documentationCoverageRatio: 0.85,
        busFactorVulnerabilityIndex: 12,
        criticalSiloDomainsCount: 1,
        highFlightRiskKeyPersonsCount: 2,
        recommendedRetentionPoolSize: 1200000,
        retentionProgramDurationMonths: 24,
        keyPersonnel: [
          { id: 'kp-1', roleTitle: 'Chief Architect', domainOwnership: 'Core Data Engine', tenureYears: 4, flightRisk: 'moderate', busFactorCriticality: 'high', recommendedRetentionBonus: 600000 },
          { id: 'kp-2', roleTitle: 'Principal Infra Lead', domainOwnership: 'Kubernetes Platform', tenureYears: 3, flightRisk: 'moderate', busFactorCriticality: 'moderate', recommendedRetentionBonus: 350000 }
        ]
      },
      executiveSummaryText: 'Target exhibits elite engineering practices, 7.5% cloud COGS, and clean open-source licensing. Recommended for standard proceed.'
    };

    const created = await this.createAudit(userId, defaultInput);

    await this.addFinding(userId, created.id, {
      pillar: 'architecture',
      title: 'PostgreSQL Read-Replica Lag Under Peak Loads',
      severity: 'moderate',
      financialImpactUsd: 45000,
      remediationDays: 14,
      description: 'Under simulated 5x load, read replicas exhibit 4.2s replication lag causing stale reads.',
      remediationPlan: 'Implement connection pooling via PgBouncer and optimize WAL archiving batch sizes.'
    });

    return created;
  }

  private recomputeAudit(input: TechnicalDueDiligenceMutationDTO): TechnicalDueDiligenceMutationDTO & {
    scorecard: any;
    recommendation: any;
  } {
    const arch = { ...input.architecture };
    arch.technicalDebtRatio = calculateTechnicalDebtRatio(arch.technicalDebtRemediationCost, arch.replacementCostEstimate);
    arch.spofCriticalityIndex = calculateSpofCriticalityIndex(arch.identifiedSpofs || []);
    arch.scalabilitySaturationHorizon = calculateScalabilityHorizon(arch.currentPeakQps, arch.maxDatabaseQps);

    const lic = { ...input.licenses };
    lic.openSourceContagionScore = calculateOpenSourceContagionScore(lic.flaggedLibraries || [], lic.proprietaryCodeLinkedWithGpl);

    const cloud = { ...input.cloudEconomics };
    const margins = calculateCloudGrossMargin(
      cloud.annualRecurringRevenue,
      cloud.cloudCogsAmount,
      0,
      cloud.idleResourceWastageAnnual
    );
    cloud.cloudCogsPercentOfArr = margins.cloudCogsPercent;
    cloud.currentGrossMarginPercent = margins.currentGrossMargin;
    cloud.projectedOptimizedGrossMarginPercent = margins.projectedGrossMargin;

    const sec = { ...input.securityCompliance };
    sec.securityComplianceMaturityIndex = calculateSecurityComplianceIndex({
      soc2Status: sec.soc2Type2Status,
      isoStatus: sec.iso27001Status,
      criticalCves: sec.criticalCveCount,
      highCves: sec.highCveCount,
      mediumCves: sec.mediumCveCount,
      sec106Score: sec.secItem106ReadinessScore,
      penTestRecencyMonths: sec.thirdPartyPenTestRecencyMonths
    });
    sec.recommendedSpecialEscrowHoldback = calculateSpecialEscrowHoldback(
      input.dealSizeUsd,
      sec.remediationCostEstimate,
      sec.criticalCveCount,
      lic.openSourceContagionScore
    );

    const team = { ...input.teamVelocity };
    team.engineeringVelocityQuotient = calculateEngineeringVelocityQuotient({
      df: team.doraDeploymentFrequency,
      ltc: team.doraLeadTimeForChanges,
      cfr: team.doraChangeFailureRate,
      mttr: team.doraTimeToRestoreService
    });
    team.busFactorVulnerabilityIndex = calculateBusFactorVulnerability(
      team.topContributorCommitSharePercent,
      team.documentationCoverageRatio
    );

    const scorecard = calculateCompositeRagScorecard({
      dealSizeUsd: input.dealSizeUsd,
      tdr: arch.technicalDebtRatio,
      spofIndex: arch.spofCriticalityIndex,
      osContagionScore: lic.openSourceContagionScore,
      cloudGrossMargin: cloud.currentGrossMarginPercent,
      cloudCogsPercent: cloud.cloudCogsPercentOfArr,
      scmi: sec.securityComplianceMaturityIndex,
      evq: team.engineeringVelocityQuotient,
      bfvi: team.busFactorVulnerabilityIndex,
      techDebtRemediationCost: arch.technicalDebtRemediationCost,
      cloudWastageAnnual: cloud.idleResourceWastageAnnual,
      escrowHoldback: sec.recommendedSpecialEscrowHoldback,
      retentionPool: team.recommendedRetentionPoolSize
    });

    const haircutRatio = input.dealSizeUsd > 0 ? scorecard.totalValuationHaircutEstimate / input.dealSizeUsd : 0;
    const recommendation = determineTransactionRecommendation(
      scorecard.overallRiskLevel,
      scorecard.pillarScores.licenseRiskScore,
      haircutRatio
    );

    return {
      ...input,
      architecture: arch,
      licenses: lic,
      cloudEconomics: cloud,
      securityCompliance: sec,
      teamVelocity: team,
      scorecard,
      recommendation
    };
  }

  private mapAuditRow(row: any): TechnicalDueDiligenceAuditDTO {
    return {
      id: row.id,
      userId: row.user_id,
      targetCompanyName: row.target_company_name,
      dealSizeUsd: Number(row.deal_size_usd),
      transactionType: row.transaction_type,
      auditLeadName: row.audit_lead_name,
      auditDate: typeof row.audit_date === 'string' ? row.audit_date : row.audit_date.toISOString().split('T')[0],
      architecture: row.architecture,
      licenses: row.licenses,
      cloudEconomics: row.cloud_economics,
      securityCompliance: row.security_compliance,
      teamVelocity: row.team_velocity,
      scorecard: row.scorecard,
      recommendation: row.recommendation,
      executiveSummaryText: row.executive_summary_text || '',
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }
}
