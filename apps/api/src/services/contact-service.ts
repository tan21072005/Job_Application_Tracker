import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type ContactDTO,
  type ContactInteractionDTO,
  type ContactMutationInput,
  type InteractionMutationInput,
  type RelationshipHealthDTO,
  calculateRelationshipHealth
} from '@jobtrack/contract';

export class ContactService {
  private pool: Pool;
  private migrationDone = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.migrationDone) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT,
        type TEXT NOT NULL DEFAULT 'recruiter',
        email TEXT,
        phone TEXT,
        linkedin_url TEXT,
        relationship_strength TEXT NOT NULL DEFAULT 'connected',
        notes TEXT,
        last_contacted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_contacts_user_company ON contacts(user_id, company);
      CREATE INDEX IF NOT EXISTS idx_contacts_user_app ON contacts(user_id, application_id);

      CREATE TABLE IF NOT EXISTS contact_interactions (
        id UUID PRIMARY KEY,
        contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        summary TEXT NOT NULL,
        details TEXT,
        date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        follow_up_date DATE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_interactions_contact_date ON contact_interactions(contact_id, date DESC);
    `);
    this.migrationDone = true;
  }

  async listContacts(
    userId: string,
    filters?: { query?: string; company?: string; type?: string; strength?: string }
  ): Promise<(ContactDTO & { health: RelationshipHealthDTO })[]> {
    await this.ensureSchema();
    let query = `
      SELECT id, user_id, application_id, name, company, role, type, email, phone,
             linkedin_url, relationship_strength, notes, last_contacted_at, created_at, updated_at
      FROM contacts
      WHERE user_id = $1
    `;
    const params: unknown[] = [userId];

    if (filters?.query) {
      params.push(`%${filters.query.toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(company) LIKE $${params.length} OR LOWER(COALESCE(role, '')) LIKE $${params.length})`;
    }
    if (filters?.company) {
      params.push(filters.company);
      query += ` AND company = $${params.length}`;
    }
    if (filters?.type) {
      params.push(filters.type);
      query += ` AND type = $${params.length}`;
    }
    if (filters?.strength) {
      params.push(filters.strength);
      query += ` AND relationship_strength = $${params.length}`;
    }

    query += ` ORDER BY updated_at DESC`;
    const { rows } = await this.pool.query(query, params);

    return rows.map(r => {
      const contact = this.mapContactRow(r);
      const health = calculateRelationshipHealth(contact);
      return { ...contact, health };
    });
  }

  async getContact(
    userId: string,
    id: string
  ): Promise<{ contact: ContactDTO; interactions: ContactInteractionDTO[]; health: RelationshipHealthDTO } | null> {
    await this.ensureSchema();
    const { rows } = await this.pool.query(
      `SELECT id, user_id, application_id, name, company, role, type, email, phone,
              linkedin_url, relationship_strength, notes, last_contacted_at, created_at, updated_at
       FROM contacts
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (rows.length === 0) return null;

    const contact = this.mapContactRow(rows[0]);
    const { rows: interactionRows } = await this.pool.query(
      `SELECT id, contact_id, user_id, channel, summary, details, date, follow_up_date, created_at
       FROM contact_interactions
       WHERE contact_id = $1 AND user_id = $2
       ORDER BY date DESC`,
      [id, userId]
    );

    const interactions = interactionRows.map(this.mapInteractionRow);
    const health = calculateRelationshipHealth(contact, interactions[0]?.date);

    return { contact, interactions, health };
  }

  async createContact(userId: string, input: ContactMutationInput): Promise<ContactDTO> {
    await this.ensureSchema();
    const id = randomUUID();
    const now = new Date().toISOString();

    const { rows } = await this.pool.query(
      `INSERT INTO contacts (
        id, user_id, application_id, name, company, role, type, email, phone,
        linkedin_url, relationship_strength, notes, last_contacted_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id,
        userId,
        input.applicationId || null,
        input.name,
        input.company,
        input.role || null,
        input.type || 'recruiter',
        input.email || null,
        input.phone || null,
        input.linkedinUrl || null,
        input.relationshipStrength || 'connected',
        input.notes || null,
        input.lastContactedAt || now,
        now,
        now
      ]
    );

    return this.mapContactRow(rows[0]);
  }

  async updateContact(
    userId: string,
    id: string,
    input: Partial<ContactMutationInput>
  ): Promise<ContactDTO | null> {
    await this.ensureSchema();
    const existing = await this.getContact(userId, id);
    if (!existing) return null;

    const updated = {
      name: input.name !== undefined ? input.name : existing.contact.name,
      company: input.company !== undefined ? input.company : existing.contact.company,
      role: input.role !== undefined ? input.role : existing.contact.role,
      type: input.type !== undefined ? input.type : existing.contact.type,
      email: input.email !== undefined ? input.email : existing.contact.email,
      phone: input.phone !== undefined ? input.phone : existing.contact.phone,
      linkedinUrl: input.linkedinUrl !== undefined ? input.linkedinUrl : existing.contact.linkedinUrl,
      relationshipStrength: input.relationshipStrength !== undefined ? input.relationshipStrength : existing.contact.relationshipStrength,
      applicationId: input.applicationId !== undefined ? input.applicationId : existing.contact.applicationId,
      notes: input.notes !== undefined ? input.notes : existing.contact.notes,
      lastContactedAt: input.lastContactedAt !== undefined ? input.lastContactedAt : existing.contact.lastContactedAt
    };

    const { rows } = await this.pool.query(
      `UPDATE contacts
       SET name = $1, company = $2, role = $3, type = $4, email = $5, phone = $6,
           linkedin_url = $7, relationship_strength = $8, application_id = $9,
           notes = $10, last_contacted_at = $11, updated_at = CURRENT_TIMESTAMP
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        updated.name,
        updated.company,
        updated.role || null,
        updated.type,
        updated.email || null,
        updated.phone || null,
        updated.linkedinUrl || null,
        updated.relationshipStrength,
        updated.applicationId || null,
        updated.notes || null,
        updated.lastContactedAt || null,
        id,
        userId
      ]
    );

    return this.mapContactRow(rows[0]);
  }

  async deleteContact(userId: string, id: string): Promise<boolean> {
    await this.ensureSchema();
    const { rowCount } = await this.pool.query(
      `DELETE FROM contacts WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }

  async createInteraction(
    userId: string,
    contactId: string,
    input: InteractionMutationInput
  ): Promise<ContactInteractionDTO | null> {
    await this.ensureSchema();
    const contact = await this.getContact(userId, contactId);
    if (!contact) return null;

    const id = randomUUID();
    const date = input.date || new Date().toISOString();

    const { rows } = await this.pool.query(
      `INSERT INTO contact_interactions (
        id, contact_id, user_id, channel, summary, details, date, follow_up_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        id,
        contactId,
        userId,
        input.channel,
        input.summary,
        input.details || null,
        date,
        input.followUpDate || null
      ]
    );

    await this.pool.query(
      `UPDATE contacts
       SET last_contacted_at = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3`,
      [date, contactId, userId]
    );

    return this.mapInteractionRow(rows[0]);
  }

  async getReconnectDueContacts(
    userId: string
  ): Promise<(ContactDTO & { health: RelationshipHealthDTO })[]> {
    const all = await this.listContacts(userId);
    return all
      .filter(c => c.health.isReconnectDue || c.health.isDormant)
      .sort((a, b) => b.health.daysSinceLastContact - a.health.daysSinceLastContact);
  }

  private mapContactRow(r: any): ContactDTO {
    return {
      id: r.id,
      userId: r.user_id,
      name: r.name,
      company: r.company,
      role: r.role || undefined,
      type: r.type,
      email: r.email || undefined,
      phone: r.phone || undefined,
      linkedinUrl: r.linkedin_url || undefined,
      relationshipStrength: r.relationship_strength,
      applicationId: r.application_id || undefined,
      notes: r.notes || undefined,
      lastContactedAt: r.last_contacted_at ? new Date(r.last_contacted_at).toISOString() : undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  private mapInteractionRow(r: any): ContactInteractionDTO {
    return {
      id: r.id,
      contactId: r.contact_id,
      userId: r.user_id,
      channel: r.channel,
      summary: r.summary,
      details: r.details || undefined,
      date: new Date(r.date).toISOString(),
      followUpDate: r.follow_up_date ? new Date(r.follow_up_date).toISOString().split('T')[0] : undefined,
      createdAt: new Date(r.created_at).toISOString()
    };
  }
}
