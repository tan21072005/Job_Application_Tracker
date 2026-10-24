import type { Pool } from 'pg';
import crypto from 'node:crypto';
import {
  type CampaignObjective,
  type OutreachTargetType,
  type OutreachChannel,
  type RecipientStatus,
  type OutreachStepDTO,
  type OutreachRecipientDTO,
  type OutreachCampaignDTO,
  type CreateCampaignInputDTO,
  type AddRecipientInputDTO,
  type UpdateRecipientStepInputDTO,
  generateOutreachSequence,
  computeCampaignMetrics
} from '@jobtrack/contract';

export async function initOutreachTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS outreach_campaigns (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      objective VARCHAR(64) NOT NULL,
      target_type VARCHAR(64) NOT NULL,
      target_company VARCHAR(255) NOT NULL,
      target_role VARCHAR(255) NOT NULL,
      status VARCHAR(64) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS outreach_campaigns_user_idx ON outreach_campaigns (user_id, updated_at DESC);

    CREATE TABLE IF NOT EXISTS outreach_steps (
      id UUID PRIMARY KEY,
      campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      step_order INT NOT NULL,
      delay_days INT NOT NULL DEFAULT 0,
      channel VARCHAR(64) NOT NULL DEFAULT 'linkedin',
      title VARCHAR(255) NOT NULL DEFAULT '',
      subject_template TEXT NOT NULL DEFAULT '',
      body_template TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS outreach_steps_campaign_idx ON outreach_steps (campaign_id, step_order ASC);

    CREATE TABLE IF NOT EXISTS outreach_recipients (
      id UUID PRIMARY KEY,
      campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      recipient_name VARCHAR(255) NOT NULL,
      recipient_title VARCHAR(255),
      recipient_company VARCHAR(255) NOT NULL,
      channel VARCHAR(64) NOT NULL DEFAULT 'linkedin',
      email VARCHAR(255),
      linkedin_url TEXT,
      current_step_index INT NOT NULL DEFAULT 1,
      status VARCHAR(64) NOT NULL DEFAULT 'pending',
      last_contacted_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS outreach_recipients_campaign_idx ON outreach_recipients (campaign_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS outreach_recipients_user_idx ON outreach_recipients (user_id, status);
  `);
}

export class OutreachService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listCampaigns(userId: string): Promise<OutreachCampaignDTO[]> {
    await initOutreachTables(this.pool);
    const campaignsRes = await this.pool.query(
      `SELECT * FROM outreach_campaigns WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    const campaigns: OutreachCampaignDTO[] = [];
    for (const c of campaignsRes.rows) {
      const stepsRes = await this.pool.query(
        `SELECT * FROM outreach_steps WHERE campaign_id = $1 AND user_id = $2 ORDER BY step_order ASC`,
        [c.id, userId]
      );
      const recRes = await this.pool.query(
        `SELECT * FROM outreach_recipients WHERE campaign_id = $1 AND user_id = $2 ORDER BY updated_at DESC`,
        [c.id, userId]
      );

      const steps: OutreachStepDTO[] = stepsRes.rows.map(s => ({
        id: s.id,
        stepOrder: s.step_order,
        delayDays: s.delay_days,
        channel: s.channel as OutreachChannel,
        title: s.title || `Bước ${s.step_order}`,
        subjectTemplate: s.subject_template,
        bodyTemplate: s.body_template
      }));

      const recipients: OutreachRecipientDTO[] = recRes.rows.map(r => ({
        id: r.id,
        campaignId: r.campaign_id,
        contactId: r.contact_id,
        name: r.recipient_name,
        title: r.recipient_title || '',
        company: r.recipient_company,
        channel: r.channel as OutreachChannel,
        email: r.email,
        linkedinUrl: r.linkedin_url,
        currentStepIndex: r.current_step_index,
        status: r.status as RecipientStatus,
        lastContactedAt: r.last_contacted_at ? new Date(r.last_contacted_at).toISOString() : null,
        notes: r.notes || '',
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString()
      }));

      const analytics = computeCampaignMetrics(recipients);

      campaigns.push({
        id: c.id,
        name: c.name,
        objective: c.objective as CampaignObjective,
        targetType: c.target_type as OutreachTargetType,
        targetCompany: c.target_company,
        targetRole: c.target_role,
        status: c.status as 'active' | 'completed' | 'archived',
        steps,
        recipients,
        analytics,
        createdAt: new Date(c.created_at).toISOString(),
        updatedAt: new Date(c.updated_at).toISOString()
      });
    }

    return campaigns;
  }

  async getCampaign(userId: string, campaignId: string): Promise<OutreachCampaignDTO | null> {
    await initOutreachTables(this.pool);
    const campaignRes = await this.pool.query(
      `SELECT * FROM outreach_campaigns WHERE id = $1 AND user_id = $2`,
      [campaignId, userId]
    );
    if (campaignRes.rowCount === 0) return null;
    const c = campaignRes.rows[0];

    const stepsRes = await this.pool.query(
      `SELECT * FROM outreach_steps WHERE campaign_id = $1 AND user_id = $2 ORDER BY step_order ASC`,
      [campaignId, userId]
    );
    const recRes = await this.pool.query(
      `SELECT * FROM outreach_recipients WHERE campaign_id = $1 AND user_id = $2 ORDER BY updated_at DESC`,
      [campaignId, userId]
    );

    const steps: OutreachStepDTO[] = stepsRes.rows.map(s => ({
      id: s.id,
      stepOrder: s.step_order,
      delayDays: s.delay_days,
      channel: s.channel as OutreachChannel,
      title: s.title || `Bước ${s.step_order}`,
      subjectTemplate: s.subject_template,
      bodyTemplate: s.body_template
    }));

    const recipients: OutreachRecipientDTO[] = recRes.rows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      contactId: r.contact_id,
      name: r.recipient_name,
      title: r.recipient_title || '',
      company: r.recipient_company,
      channel: r.channel as OutreachChannel,
      email: r.email,
      linkedinUrl: r.linkedin_url,
      currentStepIndex: r.current_step_index,
      status: r.status as RecipientStatus,
      lastContactedAt: r.last_contacted_at ? new Date(r.last_contacted_at).toISOString() : null,
      notes: r.notes || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    }));

    const analytics = computeCampaignMetrics(recipients);

    return {
      id: c.id,
      name: c.name,
      objective: c.objective as CampaignObjective,
      targetType: c.target_type as OutreachTargetType,
      targetCompany: c.target_company,
      targetRole: c.target_role,
      status: c.status as 'active' | 'completed' | 'archived',
      steps,
      recipients,
      analytics,
      createdAt: new Date(c.created_at).toISOString(),
      updatedAt: new Date(c.updated_at).toISOString()
    };
  }

  async createCampaign(userId: string, input: CreateCampaignInputDTO): Promise<OutreachCampaignDTO> {
    await initOutreachTables(this.pool);
    const campaignId = crypto.randomUUID();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO outreach_campaigns (id, user_id, name, objective, target_type, target_company, target_role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $8)`,
      [campaignId, userId, input.name, input.objective, input.targetType, input.targetCompany, input.targetRole, now]
    );

    const defaultSteps = generateOutreachSequence(input.objective, input.targetType, input.targetRole, input.targetCompany);
    const stepsToInsert = input.customSteps && input.customSteps.length > 0 ? input.customSteps : defaultSteps;

    const insertedSteps: OutreachStepDTO[] = [];
    for (let i = 0; i < stepsToInsert.length; i++) {
      const s = stepsToInsert[i];
      const stepId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO outreach_steps (id, campaign_id, user_id, step_order, delay_days, channel, title, subject_template, body_template, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [stepId, campaignId, userId, s.stepOrder || i + 1, s.delayDays || 0, s.channel || 'linkedin', s.title || `Bước ${i + 1}`, s.subjectTemplate || '', s.bodyTemplate, now]
      );
      insertedSteps.push({
        id: stepId,
        stepOrder: s.stepOrder || i + 1,
        delayDays: s.delayDays || 0,
        channel: s.channel || 'linkedin',
        title: s.title || `Bước ${i + 1}`,
        subjectTemplate: s.subjectTemplate || '',
        bodyTemplate: s.bodyTemplate
      });
    }

    return {
      id: campaignId,
      name: input.name,
      objective: input.objective,
      targetType: input.targetType,
      targetCompany: input.targetCompany,
      targetRole: input.targetRole,
      status: 'active',
      steps: insertedSteps,
      recipients: [],
      analytics: computeCampaignMetrics([]),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  async addRecipient(
    userId: string,
    campaignId: string,
    input: AddRecipientInputDTO
  ): Promise<OutreachRecipientDTO> {
    await initOutreachTables(this.pool);
    const campaign = await this.getCampaign(userId, campaignId);
    if (!campaign) {
      throw new Error('Chiến dịch không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    const recipientId = crypto.randomUUID();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO outreach_recipients (
        id, campaign_id, user_id, contact_id, recipient_name, recipient_title, recipient_company,
        channel, email, linkedin_url, current_step_index, status, last_contacted_at, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, 'pending', NULL, $11, $12, $12)`,
      [
        recipientId,
        campaignId,
        userId,
        input.contactId || null,
        input.name,
        input.title || null,
        input.company,
        input.channel || 'linkedin',
        input.email || null,
        input.linkedinUrl || null,
        input.notes || '',
        now
      ]
    );

    await this.pool.query(
      `UPDATE outreach_campaigns SET updated_at = $1 WHERE id = $2 AND user_id = $3`,
      [now, campaignId, userId]
    );

    return {
      id: recipientId,
      campaignId,
      contactId: input.contactId || null,
      name: input.name,
      title: input.title || '',
      company: input.company,
      channel: input.channel || 'linkedin',
      email: input.email || null,
      linkedinUrl: input.linkedinUrl || null,
      currentStepIndex: 1,
      status: 'pending',
      lastContactedAt: null,
      notes: input.notes || '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
  }

  async updateRecipientStep(
    userId: string,
    recipientId: string,
    input: UpdateRecipientStepInputDTO
  ): Promise<OutreachRecipientDTO> {
    await initOutreachTables(this.pool);
    const checkRes = await this.pool.query(
      `SELECT * FROM outreach_recipients WHERE id = $1 AND user_id = $2`,
      [recipientId, userId]
    );
    if (checkRes.rowCount === 0) {
      throw new Error('Người nhận không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    const existing = checkRes.rows[0];
    const now = new Date();
    const lastContactedAt = input.status !== 'pending' ? now : existing.last_contacted_at;

    const updateRes = await this.pool.query(
      `UPDATE outreach_recipients
       SET current_step_index = $1, status = $2, notes = COALESCE($3, notes), last_contacted_at = $4, updated_at = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [input.currentStepIndex, input.status, input.notes ?? null, lastContactedAt, now, recipientId, userId]
    );

    const r = updateRes.rows[0];
    await this.pool.query(
      `UPDATE outreach_campaigns SET updated_at = $1 WHERE id = $2 AND user_id = $3`,
      [now, r.campaign_id, userId]
    );

    return {
      id: r.id,
      campaignId: r.campaign_id,
      contactId: r.contact_id,
      name: r.recipient_name,
      title: r.recipient_title || '',
      company: r.recipient_company,
      channel: r.channel as OutreachChannel,
      email: r.email,
      linkedinUrl: r.linkedin_url,
      currentStepIndex: r.current_step_index,
      status: r.status as RecipientStatus,
      lastContactedAt: r.last_contacted_at ? new Date(r.last_contacted_at).toISOString() : null,
      notes: r.notes || '',
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString()
    };
  }

  async deleteCampaign(userId: string, campaignId: string): Promise<boolean> {
    await initOutreachTables(this.pool);
    const res = await this.pool.query(
      `DELETE FROM outreach_campaigns WHERE id = $1 AND user_id = $2`,
      [campaignId, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }
}
