import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type ReferenceAdvocateDTO,
  type ReferenceAdvocateMutationDTO,
  type TargetStakeholderNodeDTO,
  type BackchannelAuditDTO,
  type BackchannelAuditMutationDTO,
  type RefereeBriefingPacketDTO,
  calculateBackchannelProbability,
  compute360CoverageMatrix,
  computeAuditVulnerabilityIndex,
  generateRefereeBriefingPacketMarkdown
} from '@jobtrack/contract';

export async function initBackchannelTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reference_advocates (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      current_title VARCHAR(255) NOT NULL,
      current_company VARCHAR(255) NOT NULL,
      relationship_archetype VARCHAR(64) NOT NULL DEFAULT 'superior_sponsor',
      shared_company VARCHAR(255) NOT NULL,
      shared_tenure_start VARCHAR(32) NOT NULL DEFAULT '2020-01',
      shared_tenure_end VARCHAR(32) NOT NULL DEFAULT '2023-01',
      shared_tenure_months INTEGER NOT NULL DEFAULT 12,
      projects_co_delivered JSONB NOT NULL DEFAULT '[]'::jsonb,
      endorsement_strength VARCHAR(64) NOT NULL DEFAULT 'strong_advocate',
      vouched_competencies JSONB NOT NULL DEFAULT '[]'::jsonb,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(64),
      linkedin_url VARCHAR(512),
      preferred_channel VARCHAR(32) NOT NULL DEFAULT 'email',
      nda_restricted BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_reference_advocates_user_created 
      ON reference_advocates(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_reference_advocates_user_archetype 
      ON reference_advocates(user_id, relationship_archetype);

    CREATE TABLE IF NOT EXISTS backchannel_audits (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      audit_name VARCHAR(255) NOT NULL,
      target_company VARCHAR(255) NOT NULL,
      target_role VARCHAR(255) NOT NULL,
      advocate_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      stakeholders JSONB NOT NULL DEFAULT '[]'::jsonb,
      risks JSONB NOT NULL DEFAULT '[]'::jsonb,
      briefings JSONB NOT NULL DEFAULT '[]'::jsonb,
      vulnerability_index INTEGER NOT NULL DEFAULT 0,
      vulnerability_level VARCHAR(64) NOT NULL DEFAULT 'low_risk',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_backchannel_audits_user_updated 
      ON backchannel_audits(user_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_backchannel_audits_user_company 
      ON backchannel_audits(user_id, target_company);
    CREATE INDEX IF NOT EXISTS idx_backchannel_audits_application 
      ON backchannel_audits(application_id);
  `);
}

export class BackchannelService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listAdvocates(userId: string): Promise<ReferenceAdvocateDTO[]> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM reference_advocates WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows.map(this.mapAdvocateRow);
  }

  async getAdvocate(userId: string, id: string): Promise<ReferenceAdvocateDTO | null> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM reference_advocates WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (result.rows.length === 0) return null;
    return this.mapAdvocateRow(result.rows[0]);
  }

  async createAdvocate(userId: string, input: ReferenceAdvocateMutationDTO): Promise<ReferenceAdvocateDTO> {
    await initBackchannelTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await this.pool.query(
      `INSERT INTO reference_advocates (
        id, user_id, full_name, current_title, current_company,
        relationship_archetype, shared_company, shared_tenure_start,
        shared_tenure_end, shared_tenure_months, projects_co_delivered,
        endorsement_strength, vouched_competencies, email, phone,
        linkedin_url, preferred_channel, nda_restricted, notes,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        id,
        userId,
        input.fullName,
        input.currentTitle,
        input.currentCompany,
        input.relationshipArchetype,
        input.sharedCompany,
        input.sharedTenureStart,
        input.sharedTenureEnd,
        input.sharedTenureMonths,
        JSON.stringify(input.projectsCoDelivered || []),
        input.endorsementStrength,
        JSON.stringify(input.vouchedCompetencies || []),
        input.email,
        input.phone || null,
        input.linkedinUrl || null,
        input.preferredChannel || 'email',
        Boolean(input.ndaRestricted),
        input.notes || null,
        now,
        now
      ]
    );
    return this.mapAdvocateRow(result.rows[0]);
  }

  async updateAdvocate(
    userId: string,
    id: string,
    input: Partial<ReferenceAdvocateMutationDTO>
  ): Promise<ReferenceAdvocateDTO | null> {
    await initBackchannelTables(this.pool);
    const existing = await this.getAdvocate(userId, id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString()
    };

    const result = await this.pool.query(
      `UPDATE reference_advocates SET
        full_name = $3,
        current_title = $4,
        current_company = $5,
        relationship_archetype = $6,
        shared_company = $7,
        shared_tenure_start = $8,
        shared_tenure_end = $9,
        shared_tenure_months = $10,
        projects_co_delivered = $11,
        endorsement_strength = $12,
        vouched_competencies = $13,
        email = $14,
        phone = $15,
        linkedin_url = $16,
        preferred_channel = $17,
        nda_restricted = $18,
        notes = $19,
        updated_at = $20
      WHERE user_id = $1 AND id = $2 RETURNING *`,
      [
        userId,
        id,
        updated.fullName,
        updated.currentTitle,
        updated.currentCompany,
        updated.relationshipArchetype,
        updated.sharedCompany,
        updated.sharedTenureStart,
        updated.sharedTenureEnd,
        updated.sharedTenureMonths,
        JSON.stringify(updated.projectsCoDelivered || []),
        updated.endorsementStrength,
        JSON.stringify(updated.vouchedCompetencies || []),
        updated.email,
        updated.phone || null,
        updated.linkedinUrl || null,
        updated.preferredChannel || 'email',
        Boolean(updated.ndaRestricted),
        updated.notes || null,
        updated.updatedAt
      ]
    );

    return this.mapAdvocateRow(result.rows[0]);
  }

  async deleteAdvocate(userId: string, id: string): Promise<boolean> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `DELETE FROM reference_advocates WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listAudits(userId: string): Promise<BackchannelAuditDTO[]> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM backchannel_audits WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );
    const advocates = await this.listAdvocates(userId);
    return result.rows.map(row => this.mapAuditRow(row, advocates));
  }

  async getAudit(userId: string, id: string): Promise<BackchannelAuditDTO | null> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `SELECT * FROM backchannel_audits WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    if (result.rows.length === 0) return null;
    const advocates = await this.listAdvocates(userId);
    return this.mapAuditRow(result.rows[0], advocates);
  }

  async createAudit(userId: string, input: BackchannelAuditMutationDTO): Promise<BackchannelAuditDTO> {
    await initBackchannelTables(this.pool);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const scoredStakeholders = (input.stakeholders || []).map(s => {
      const { probabilityScore, rationale } = calculateBackchannelProbability(s);
      return {
        ...s,
        probabilityScore,
        rationale
      };
    });

    const { vulnerabilityIndex, level } = computeAuditVulnerabilityIndex(scoredStakeholders);

    const result = await this.pool.query(
      `INSERT INTO backchannel_audits (
        id, user_id, application_id, audit_name, target_company,
        target_role, advocate_ids, stakeholders, risks, briefings,
        vulnerability_index, vulnerability_level, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        id,
        userId,
        input.applicationId || null,
        input.auditName,
        input.targetCompany,
        input.targetRole,
        JSON.stringify(input.advocateIds || []),
        JSON.stringify(scoredStakeholders),
        JSON.stringify(input.risks || []),
        JSON.stringify([]),
        vulnerabilityIndex,
        level,
        now,
        now
      ]
    );

    const advocates = await this.listAdvocates(userId);
    return this.mapAuditRow(result.rows[0], advocates, input.requiredCompetencies);
  }

  async updateAudit(
    userId: string,
    id: string,
    input: Partial<BackchannelAuditMutationDTO>
  ): Promise<BackchannelAuditDTO | null> {
    await initBackchannelTables(this.pool);
    const existing = await this.getAudit(userId, id);
    if (!existing) return null;

    let stakeholders = existing.stakeholders;
    if (input.stakeholders) {
      stakeholders = input.stakeholders.map(s => {
        const { probabilityScore, rationale } = calculateBackchannelProbability(s);
        return {
          ...s,
          probabilityScore,
          rationale
        };
      });
    }

    const { vulnerabilityIndex, level } = computeAuditVulnerabilityIndex(stakeholders);

    const updated = {
      applicationId: input.applicationId !== undefined ? input.applicationId : existing.applicationId,
      auditName: input.auditName !== undefined ? input.auditName : existing.auditName,
      targetCompany: input.targetCompany !== undefined ? input.targetCompany : existing.targetCompany,
      targetRole: input.targetRole !== undefined ? input.targetRole : existing.targetRole,
      advocateIds: input.advocateIds !== undefined ? input.advocateIds : existing.advocateIds,
      stakeholders,
      risks: input.risks !== undefined ? input.risks : existing.risks,
      briefings: existing.briefings,
      vulnerabilityIndex,
      vulnerabilityLevel: level,
      updatedAt: new Date().toISOString()
    };

    const result = await this.pool.query(
      `UPDATE backchannel_audits SET
        application_id = $3,
        audit_name = $4,
        target_company = $5,
        target_role = $6,
        advocate_ids = $7,
        stakeholders = $8,
        risks = $9,
        briefings = $10,
        vulnerability_index = $11,
        vulnerability_level = $12,
        updated_at = $13
      WHERE user_id = $1 AND id = $2 RETURNING *`,
      [
        userId,
        id,
        updated.applicationId,
        updated.auditName,
        updated.targetCompany,
        updated.targetRole,
        JSON.stringify(updated.advocateIds),
        JSON.stringify(updated.stakeholders),
        JSON.stringify(updated.risks),
        JSON.stringify(updated.briefings),
        updated.vulnerabilityIndex,
        updated.vulnerabilityLevel,
        updated.updatedAt
      ]
    );

    const advocates = await this.listAdvocates(userId);
    return this.mapAuditRow(result.rows[0], advocates, input.requiredCompetencies);
  }

  async deleteAudit(userId: string, id: string): Promise<boolean> {
    await initBackchannelTables(this.pool);
    const result = await this.pool.query(
      `DELETE FROM backchannel_audits WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async generateBriefing(
    userId: string,
    auditId: string,
    advocateId: string
  ): Promise<RefereeBriefingPacketDTO | null> {
    await initBackchannelTables(this.pool);
    const audit = await this.getAudit(userId, auditId);
    if (!audit) return null;

    const advocate = await this.getAdvocate(userId, advocateId);
    if (!advocate) return null;

    const packet = generateRefereeBriefingPacketMarkdown(advocate, {
      targetCompany: audit.targetCompany,
      targetRole: audit.targetRole,
      applicationId: audit.applicationId
    });

    const otherBriefings = audit.briefings.filter(b => b.advocateId !== advocateId);
    const updatedBriefings = [...otherBriefings, packet];

    await this.pool.query(
      `UPDATE backchannel_audits SET briefings = $3, updated_at = NOW() WHERE user_id = $1 AND id = $2`,
      [userId, auditId, JSON.stringify(updatedBriefings)]
    );

    return packet;
  }

  private mapAdvocateRow(row: any): ReferenceAdvocateDTO {
    return {
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      currentTitle: row.current_title,
      currentCompany: row.current_company,
      relationshipArchetype: row.relationship_archetype,
      sharedCompany: row.shared_company,
      sharedTenureStart: row.shared_tenure_start,
      sharedTenureEnd: row.shared_tenure_end,
      sharedTenureMonths: Number(row.shared_tenure_months || 0),
      projectsCoDelivered: typeof row.projects_co_delivered === 'string'
        ? JSON.parse(row.projects_co_delivered)
        : (row.projects_co_delivered || []),
      endorsementStrength: row.endorsement_strength,
      vouchedCompetencies: typeof row.vouched_competencies === 'string'
        ? JSON.parse(row.vouched_competencies)
        : (row.vouched_competencies || []),
      email: row.email,
      phone: row.phone || undefined,
      linkedinUrl: row.linkedin_url || undefined,
      preferredChannel: row.preferred_channel || 'email',
      ndaRestricted: Boolean(row.nda_restricted),
      notes: row.notes || undefined,
      createdAt: row.created_at?.toISOString ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at?.toISOString ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }

  private mapAuditRow(row: any, allAdvocates: ReferenceAdvocateDTO[], requiredCompetencies?: any[]): BackchannelAuditDTO {
    const advocateIds: string[] = typeof row.advocate_ids === 'string'
      ? JSON.parse(row.advocate_ids)
      : (row.advocate_ids || []);

    const stakeholders: TargetStakeholderNodeDTO[] = typeof row.stakeholders === 'string'
      ? JSON.parse(row.stakeholders)
      : (row.stakeholders || []);

    const risks = typeof row.risks === 'string'
      ? JSON.parse(row.risks)
      : (row.risks || []);

    const briefings: RefereeBriefingPacketDTO[] = typeof row.briefings === 'string'
      ? JSON.parse(row.briefings)
      : (row.briefings || []);

    const selectedAdvocates = allAdvocates.filter(a => advocateIds.includes(a.id));
    const coverageMatrix = compute360CoverageMatrix(selectedAdvocates, requiredCompetencies);
    const { vulnerabilityIndex, level, recommendations } = computeAuditVulnerabilityIndex(stakeholders);

    return {
      id: row.id,
      userId: row.user_id,
      applicationId: row.application_id,
      auditName: row.audit_name,
      targetCompany: row.target_company,
      targetRole: row.target_role,
      advocateIds,
      stakeholders,
      coverageMatrix,
      risks,
      briefings,
      overallBackchannelVulnerabilityIndex: vulnerabilityIndex,
      vulnerabilityLevel: level,
      strategicRecommendations: recommendations,
      createdAt: row.created_at?.toISOString ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at?.toISOString ? row.updated_at.toISOString() : String(row.updated_at)
    };
  }
}
