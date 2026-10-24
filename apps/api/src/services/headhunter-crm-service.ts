import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type RecruiterLeadDTO,
  type HeadhunterMandateDTO,
  type RecruiterLeadMutationInputDTO,
  type HeadhunterMandateMutationInputDTO,
  type ParseRecruiterPitchInputDTO,
  type InboundPitchParseResultDTO,
  type RecruiterResponseDraftDTO,
  type RecruiterReplyIntent,
  type MandateStatus,
  type RecruiterRelationshipTier,
  type HeadhunterAgencyTier,
  type MandateExclusivity,
  computeRecruiterRelationshipHealth,
  parseInboundRecruiterPitch,
  generateRecruiterReplyDraft
} from '@jobtrack/contract';

export async function initHeadhunterTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS headhunter_leads (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      agency VARCHAR(255) NOT NULL,
      agency_tier VARCHAR(64) NOT NULL DEFAULT 'independent',
      role VARCHAR(255) NOT NULL DEFAULT 'Executive Recruiter',
      email VARCHAR(255),
      phone VARCHAR(64),
      linkedin_url TEXT,
      tier VARCHAR(64) NOT NULL DEFAULT 'preferred_partner',
      rating INTEGER NOT NULL DEFAULT 4,
      specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
      mandates_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      last_contacted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_headhunter_leads_user_created 
      ON headhunter_leads(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_headhunter_leads_user_tier 
      ON headhunter_leads(user_id, tier);
    CREATE INDEX IF NOT EXISTS idx_headhunter_leads_user_agency 
      ON headhunter_leads(user_id, agency);

    CREATE TABLE IF NOT EXISTS headhunter_mandates (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id UUID NOT NULL REFERENCES headhunter_leads(id) ON DELETE CASCADE,
      application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
      role_title VARCHAR(255) NOT NULL,
      client_company VARCHAR(255) NOT NULL,
      is_confidential BOOLEAN NOT NULL DEFAULT false,
      exclusivity VARCHAR(64) NOT NULL DEFAULT 'unconfirmed',
      salary_range VARCHAR(255),
      status VARCHAR(64) NOT NULL DEFAULT 'pitched',
      notes TEXT,
      pitched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_headhunter_mandates_user_lead 
      ON headhunter_mandates(user_id, lead_id);
    CREATE INDEX IF NOT EXISTS idx_headhunter_mandates_user_company 
      ON headhunter_mandates(user_id, LOWER(client_company));
  `);
}

export class HeadhunterCrmService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listLeads(
    userId: string,
    filters?: { agency?: string; tier?: RecruiterRelationshipTier; query?: string }
  ): Promise<RecruiterLeadDTO[]> {
    await initHeadhunterTables(this.pool);

    let sql = `
      SELECT id, user_id, name, agency, agency_tier, role, email, phone, linkedin_url,
             tier, rating, specialties, mandates_count, notes, last_contacted_at, created_at, updated_at
      FROM headhunter_leads
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (filters?.tier) {
      params.push(filters.tier);
      sql += ` AND tier = $${params.length}`;
    }

    if (filters?.agency && filters.agency.trim().length > 0) {
      params.push(filters.agency.trim());
      sql += ` AND LOWER(agency) = LOWER($${params.length})`;
    }

    if (filters?.query && filters.query.trim().length > 0) {
      params.push(`%${filters.query.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(agency) LIKE $${params.length} OR LOWER(role) LIKE $${params.length})`;
    }

    sql += ` ORDER BY created_at DESC`;

    const res = await this.pool.query(sql, params);
    return res.rows.map(row => this.rowToLead(row));
  }

  async getLead(userId: string, leadId: string): Promise<RecruiterLeadDTO | null> {
    await initHeadhunterTables(this.pool);

    const res = await this.pool.query(
      `SELECT id, user_id, name, agency, agency_tier, role, email, phone, linkedin_url,
              tier, rating, specialties, mandates_count, notes, last_contacted_at, created_at, updated_at
       FROM headhunter_leads
       WHERE user_id = $1 AND id = $2`,
      [userId, leadId]
    );

    if (res.rows.length === 0) return null;
    return this.rowToLead(res.rows[0]);
  }

  async upsertLead(
    userId: string,
    input: RecruiterLeadMutationInputDTO,
    existingId?: string
  ): Promise<RecruiterLeadDTO> {
    await initHeadhunterTables(this.pool);

    const nowIso = new Date().toISOString();

    let targetId = existingId;
    if (!targetId) {
      const match = await this.pool.query(
        `SELECT id FROM headhunter_leads
         WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND LOWER(TRIM(agency)) = LOWER(TRIM($3))
         LIMIT 1`,
        [userId, input.name, input.agency]
      );
      if (match.rows.length > 0) {
        targetId = match.rows[0].id;
      }
    }

    if (targetId) {
      const res = await this.pool.query(
        `UPDATE headhunter_leads
         SET name = $1, agency = $2, agency_tier = $3, role = $4, email = $5, phone = $6,
             linkedin_url = $7, tier = $8, rating = $9, specialties = $10, notes = $11,
             last_contacted_at = $12, updated_at = $13
         WHERE id = $14 AND user_id = $15
         RETURNING *`,
        [
          input.name,
          input.agency,
          input.agencyTier || 'independent',
          input.role || 'Executive Recruiter',
          input.email || null,
          input.phone || null,
          input.linkedinUrl || null,
          input.tier || 'preferred_partner',
          input.rating ?? 4,
          JSON.stringify(input.specialties || []),
          input.notes || null,
          input.lastContactedAt ? new Date(input.lastContactedAt).toISOString() : null,
          nowIso,
          targetId,
          userId
        ]
      );

      if (res.rows.length === 0) {
        throw new Error('Recruiter lead not found or unauthorized');
      }

      return this.rowToLead(res.rows[0]);
    }

    const id = crypto.randomUUID();
    const res = await this.pool.query(
      `INSERT INTO headhunter_leads
       (id, user_id, name, agency, agency_tier, role, email, phone, linkedin_url,
        tier, rating, specialties, mandates_count, notes, last_contacted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
       RETURNING *`,
      [
        id,
        userId,
        input.name,
        input.agency,
        input.agencyTier || 'independent',
        input.role || 'Executive Recruiter',
        input.email || null,
        input.phone || null,
        input.linkedinUrl || null,
        input.tier || 'preferred_partner',
        input.rating ?? 4,
        JSON.stringify(input.specialties || []),
        0,
        input.notes || null,
        input.lastContactedAt ? new Date(input.lastContactedAt).toISOString() : null,
        nowIso
      ]
    );

    return this.rowToLead(res.rows[0]);
  }

  async deleteLead(userId: string, leadId: string): Promise<boolean> {
    await initHeadhunterTables(this.pool);

    const res = await this.pool.query(
      `DELETE FROM headhunter_leads WHERE id = $1 AND user_id = $2`,
      [leadId, userId]
    );

    return (res.rowCount ?? 0) > 0;
  }

  async listMandates(userId: string, leadId?: string): Promise<HeadhunterMandateDTO[]> {
    await initHeadhunterTables(this.pool);

    let sql = `
      SELECT m.id, m.user_id, m.lead_id, m.application_id, m.role_title, m.client_company,
             m.is_confidential, m.exclusivity, m.salary_range, m.status, m.notes, m.pitched_at, m.updated_at,
             l.name as recruiter_name, l.agency as agency_name
      FROM headhunter_mandates m
      JOIN headhunter_leads l ON l.id = m.lead_id
      WHERE m.user_id = $1
    `;
    const params: unknown[] = [userId];

    if (leadId) {
      params.push(leadId);
      sql += ` AND m.lead_id = $${params.length}`;
    }

    sql += ` ORDER BY m.pitched_at DESC`;

    const res = await this.pool.query(sql, params);
    return res.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      leadId: row.lead_id,
      recruiterName: row.recruiter_name,
      agencyName: row.agency_name,
      applicationId: row.application_id || undefined,
      roleTitle: row.role_title,
      clientCompany: row.client_company,
      isConfidential: Boolean(row.is_confidential),
      exclusivity: row.exclusivity as MandateExclusivity,
      salaryRange: row.salary_range || undefined,
      status: row.status as MandateStatus,
      notes: row.notes || undefined,
      pitchedAt: row.pitched_at ? new Date(row.pitched_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
    }));
  }

  async createMandate(
    userId: string,
    input: HeadhunterMandateMutationInputDTO
  ): Promise<HeadhunterMandateDTO> {
    await initHeadhunterTables(this.pool);

    const leadRes = await this.pool.query(
      `SELECT name, agency FROM headhunter_leads WHERE id = $1 AND user_id = $2`,
      [input.leadId, userId]
    );

    if (leadRes.rows.length === 0) {
      throw new Error('Recruiter lead not found or unauthorized');
    }

    const { name: recruiterName, agency: agencyName } = leadRes.rows[0];
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await this.pool.query(
      `INSERT INTO headhunter_mandates
       (id, user_id, lead_id, application_id, role_title, client_company, is_confidential,
        exclusivity, salary_range, status, notes, pitched_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $12)`,
      [
        id,
        userId,
        input.leadId,
        input.applicationId || null,
        input.roleTitle,
        input.clientCompany,
        Boolean(input.isConfidential),
        input.exclusivity || 'unconfirmed',
        input.salaryRange || null,
        input.status || 'pitched',
        input.notes || null,
        nowIso
      ]
    );

    await this.pool.query(
      `UPDATE headhunter_leads
       SET mandates_count = mandates_count + 1, updated_at = $1
       WHERE id = $2 AND user_id = $3`,
      [nowIso, input.leadId, userId]
    );

    return {
      id,
      userId,
      leadId: input.leadId,
      recruiterName,
      agencyName,
      applicationId: input.applicationId,
      roleTitle: input.roleTitle,
      clientCompany: input.clientCompany,
      isConfidential: Boolean(input.isConfidential),
      exclusivity: input.exclusivity || 'unconfirmed',
      salaryRange: input.salaryRange,
      status: input.status || 'pitched',
      notes: input.notes,
      pitchedAt: nowIso,
      updatedAt: nowIso
    };
  }

  async updateMandateStatus(
    userId: string,
    mandateId: string,
    status: MandateStatus
  ): Promise<HeadhunterMandateDTO | null> {
    await initHeadhunterTables(this.pool);

    const nowIso = new Date().toISOString();

    const res = await this.pool.query(
      `UPDATE headhunter_mandates
       SET status = $1, updated_at = $2
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [status, nowIso, mandateId, userId]
    );

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    const lead = await this.getLead(userId, row.lead_id);

    return {
      id: row.id,
      userId: row.user_id,
      leadId: row.lead_id,
      recruiterName: lead ? lead.name : 'Recruiter',
      agencyName: lead ? lead.agency : 'Agency',
      applicationId: row.application_id || undefined,
      roleTitle: row.role_title,
      clientCompany: row.client_company,
      isConfidential: Boolean(row.is_confidential),
      exclusivity: row.exclusivity as MandateExclusivity,
      salaryRange: row.salary_range || undefined,
      status: row.status as MandateStatus,
      notes: row.notes || undefined,
      pitchedAt: row.pitched_at ? new Date(row.pitched_at).toISOString() : nowIso,
      updatedAt: nowIso
    };
  }

  parsePitch(input: ParseRecruiterPitchInputDTO): InboundPitchParseResultDTO {
    return parseInboundRecruiterPitch(input.rawText, input.channel);
  }

  generateReply(input: {
    pitch: InboundPitchParseResultDTO;
    intent: RecruiterReplyIntent;
  }): RecruiterResponseDraftDTO {
    return generateRecruiterReplyDraft(input.pitch, input.intent);
  }

  private rowToLead(row: Record<string, unknown>): RecruiterLeadDTO {
    const rawSpecialties = row.specialties;
    const specialties = typeof rawSpecialties === 'string'
      ? JSON.parse(rawSpecialties)
      : Array.isArray(rawSpecialties)
      ? rawSpecialties
      : [];

    const tier = (row.tier as RecruiterRelationshipTier) || 'preferred_partner';
    const rating = Number(row.rating) || 4;
    const mandatesCount = Number(row.mandates_count) || 0;
    const lastContactedAt = row.last_contacted_at ? new Date(row.last_contacted_at as string).toISOString() : undefined;

    const health = computeRecruiterRelationshipHealth({
      tier,
      rating,
      mandatesCount,
      lastContactedAt
    });

    return {
      id: row.id as string,
      userId: row.user_id as string,
      name: row.name as string,
      agency: row.agency as string,
      agencyTier: (row.agency_tier as HeadhunterAgencyTier) || 'independent',
      role: (row.role as string) || 'Executive Recruiter',
      email: (row.email as string) || undefined,
      phone: (row.phone as string) || undefined,
      linkedinUrl: (row.linkedin_url as string) || undefined,
      tier,
      rating,
      specialties,
      mandatesCount,
      lastContactedAt,
      notes: (row.notes as string) || undefined,
      healthScore: health.healthScore,
      healthStatus: health.healthStatus,
      nextActionSuggestion: health.nextActionSuggestion,
      createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : new Date().toISOString()
    };
  }
}
