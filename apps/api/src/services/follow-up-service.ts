import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type ApplicationStatus,
  type FollowUpLogDTO,
  type FollowUpCadenceStatusDTO,
  type FollowUpTemplateDTO,
  type FollowUpEventDTO,
  type FollowUpEventKind,
  type FollowUpAttentionItemDTO,
  type FollowUpAttentionSummaryDTO,
  type GenerateFollowUpInput,
  type GeneratedFollowUpDraftDTO,
  DEFAULT_FOLLOW_UP_TEMPLATES,
  calculateFollowUpCadence,
  deriveFollowUpAttention,
  generateFollowUpEmail,
  summarizeFollowUpAttention,
  validateFollowUpLogInput
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export interface ApplicationFollowUpSummaryDTO {
  cadence: FollowUpCadenceStatusDTO | null;
  logs: FollowUpLogDTO[];
  templates: FollowUpTemplateDTO[];
}

export interface DueFollowUpItemDTO {
  applicationId: string;
  company: string;
  position: string;
  stage: string;
  cadence: FollowUpCadenceStatusDTO;
  lastInteractionDate: string;
}

export class FollowUpService {
  private pool: Pool;
  private tableReady: boolean = false;
  private eventsReady: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async ensureTable(): Promise<void> {
    if (this.tableReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS application_follow_up_logs (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        stage TEXT NOT NULL,
        tone TEXT NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL,
        recipient_email TEXT,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_follow_up_logs_user_app ON application_follow_up_logs (user_id, application_id, sent_at DESC);
    `);
    this.tableReady = true;
  }

  private async getApp(userId: string, applicationId: string) {
    const res = await this.pool.query<{
      id: string;
      company: string;
      position: string;
      status: string;
      applied_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, company, position, status, applied_at, created_at
       FROM applications
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [applicationId, userId]
    );
    if (!res.rows[0]) {
      fail(404, 'Không tìm thấy hồ sơ ứng tuyển.', 'not_found');
    }
    return res.rows[0];
  }

  private async getLastInteractionDate(userId: string, applicationId: string, appCreatedAt: Date, appAppliedAt: Date | null): Promise<Date> {
    let lastDate = appAppliedAt || appCreatedAt;

    const logRes = await this.pool.query<{ sent_at: Date }>(
      `SELECT sent_at FROM application_follow_up_logs
       WHERE user_id = $1 AND application_id = $2
       ORDER BY sent_at DESC LIMIT 1`,
      [userId, applicationId]
    );
    if (logRes.rows[0] && logRes.rows[0].sent_at > lastDate) {
      lastDate = logRes.rows[0].sent_at;
    }

    const intRes = await this.pool.query<{ at: Date }>(
      `SELECT at FROM interviews
       WHERE application_id = $1 AND at <= CURRENT_TIMESTAMP
       ORDER BY at DESC LIMIT 1`,
      [applicationId]
    );
    if (intRes.rows[0] && intRes.rows[0].at > lastDate) {
      lastDate = intRes.rows[0].at;
    }

    return lastDate;
  }

  async getFollowUpsForApplication(userId: string, applicationId: string): Promise<ApplicationFollowUpSummaryDTO> {
    await this.ensureTable();
    const app = await this.getApp(userId, applicationId);
    const lastDate = await this.getLastInteractionDate(userId, applicationId, app.created_at, app.applied_at);

    const cadence = calculateFollowUpCadence(app.id, app.status as any, lastDate);

    const logsRes = await this.pool.query<{
      id: string;
      application_id: string;
      stage: string;
      tone: string;
      sent_at: Date;
      recipient_email: string | null;
      subject: string;
      body: string;
      notes: string | null;
      created_at: Date;
    }>(
      `SELECT id, application_id, stage, tone, sent_at, recipient_email, subject, body, notes, created_at
       FROM application_follow_up_logs
       WHERE user_id = $1 AND application_id = $2
       ORDER BY sent_at DESC`,
      [userId, applicationId]
    );

    const logs: FollowUpLogDTO[] = logsRes.rows.map(r => ({
      id: r.id,
      applicationId: r.application_id,
      stage: r.stage as any,
      tone: r.tone as any,
      sentAt: r.sent_at.toISOString(),
      recipientEmail: r.recipient_email || undefined,
      subject: r.subject,
      body: r.body,
      notes: r.notes || undefined,
      createdAt: r.created_at.toISOString()
    }));

    return {
      cadence,
      logs,
      templates: DEFAULT_FOLLOW_UP_TEMPLATES
    };
  }

  async generateDraft(
    userId: string,
    applicationId: string,
    input: Partial<GenerateFollowUpInput>
  ): Promise<GeneratedFollowUpDraftDTO> {
    await this.ensureTable();
    const app = await this.getApp(userId, applicationId);

    let candidateName = input.candidateName;
    if (!candidateName) {
      const profRes = await this.pool.query<{ full_name: string | null }>(
        `SELECT full_name FROM candidate_profiles WHERE user_id = $1`,
        [userId]
      );
      if (profRes.rows[0]?.full_name) {
        candidateName = profRes.rows[0].full_name;
      }
    }

    return generateFollowUpEmail({
      company: app.company,
      position: app.position,
      stage: (input.stage || app.status) as any,
      tone: input.tone || 'polite_check_in',
      candidateName,
      recruiterName: input.recruiterName,
      interviewRound: input.interviewRound,
      discussionHighlight: input.discussionHighlight,
      additionalNotes: input.additionalNotes
    });
  }

  async createLog(userId: string, applicationId: string, input: unknown): Promise<FollowUpLogDTO> {
    await this.ensureTable();
    await this.getApp(userId, applicationId);

    const payload = (typeof input === 'object' && input !== null)
      ? { applicationId, ...input }
      : input;

    const val = validateFollowUpLogInput(payload);
    if (!val.ok) {
      fail(422, val.message || 'Dữ liệu nhật ký không hợp lệ.', 'invalid_request', val.errors);
    }

    const id = randomUUID();
    const sentAtDate = new Date(val.data.sentAt);

    await this.pool.query(
      `INSERT INTO application_follow_up_logs (
        id, user_id, application_id, stage, tone, sent_at, recipient_email, subject, body, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        userId,
        applicationId,
        val.data.stage,
        val.data.tone,
        sentAtDate,
        val.data.recipientEmail || null,
        val.data.subject,
        val.data.body,
        val.data.notes || null
      ]
    );

    await this.pool.query(
      `UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2`,
      [applicationId, userId]
    );

    return {
      id,
      applicationId,
      stage: val.data.stage,
      tone: val.data.tone,
      sentAt: sentAtDate.toISOString(),
      recipientEmail: val.data.recipientEmail,
      subject: val.data.subject,
      body: val.data.body,
      notes: val.data.notes,
      createdAt: new Date().toISOString()
    };
  }

  async getDueFollowUps(userId: string): Promise<DueFollowUpItemDTO[]> {
    await this.ensureTable();
    const appsRes = await this.pool.query<{
      id: string;
      company: string;
      position: string;
      status: string;
      applied_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, company, position, status, applied_at, created_at
       FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL AND status NOT IN ('Rejected','Withdrawn')
       ORDER BY updated_at DESC`,
      [userId]
    );

    const dueList: DueFollowUpItemDTO[] = [];

    for (const app of appsRes.rows) {
      const lastDate = await this.getLastInteractionDate(userId, app.id, app.created_at, app.applied_at);
      const cadence = calculateFollowUpCadence(app.id, app.status as any, lastDate);

      if (cadence && cadence.isDue) {
        dueList.push({
          applicationId: app.id,
          company: app.company,
          position: app.position,
          stage: app.status,
          cadence,
          lastInteractionDate: lastDate.toISOString()
        });
      }
    }

    dueList.sort((a, b) => {
      const order = { overdue: 2, due: 1, scheduled: 0 };
      return (order[b.cadence.urgency] || 0) - (order[a.cadence.urgency] || 0);
    });

    return dueList;
  }

  async listAttention(userId: string, timeZone: string): Promise<FollowUpAttentionSummaryDTO> {
    await this.ensureTable();

    const appsRes = await this.pool.query<{
      id: string;
      company: string;
      position: string;
      status: ApplicationStatus;
      status_updated_at: Date;
      applied_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, company, position, status, status_updated_at, applied_at, created_at
       FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY status_updated_at DESC`,
      [userId]
    );

    const eventsRes = await this.pool.query<{ application_id: string; kind: FollowUpEventKind; occurred_at: Date }>(
      `SELECT application_id, kind, occurred_at
       FROM application_follow_up_events
       WHERE user_id = $1
       ORDER BY occurred_at DESC`,
      [userId]
    );

    const eventsByApp = new Map<string, Array<{ kind: FollowUpEventKind; occurredAt: Date }>>();
    for (const row of eventsRes.rows) {
      const list = eventsByApp.get(row.application_id) || [];
      list.push({ kind: row.kind, occurredAt: row.occurred_at });
      eventsByApp.set(row.application_id, list);
    }

    const logRes = await this.pool.query<{ application_id: string; sent_at: Date }>(
      `SELECT application_id, MAX(sent_at) AS sent_at
       FROM application_follow_up_logs
       WHERE user_id = $1
       GROUP BY application_id`,
      [userId]
    );
    const logByApp = new Map<string, Date>();
    for (const row of logRes.rows) logByApp.set(row.application_id, row.sent_at);

    const interviewRes = await this.pool.query<{ application_id: string; at: Date }>(
      `SELECT i.application_id, MAX(i.at) AS at
       FROM interviews i
       JOIN applications a ON a.id = i.application_id
       WHERE a.user_id = $1 AND i.at <= CURRENT_TIMESTAMP
       GROUP BY i.application_id`,
      [userId]
    );
    const interviewByApp = new Map<string, Date>();
    for (const row of interviewRes.rows) interviewByApp.set(row.application_id, row.at);

    const items: FollowUpAttentionItemDTO[] = [];
    for (const app of appsRes.rows) {
      const candidates: number[] = [new Date(app.status_updated_at).getTime()];
      if (app.applied_at) candidates.push(new Date(app.applied_at).getTime());
      candidates.push(new Date(app.created_at).getTime());

      const appEvents = eventsByApp.get(app.id) || [];
      for (const event of appEvents) {
        if (event.kind === 'followed_up') candidates.push(new Date(event.occurredAt).getTime());
      }
      const logDate = logByApp.get(app.id);
      if (logDate) candidates.push(new Date(logDate).getTime());
      const interviewDate = interviewByApp.get(app.id);
      if (interviewDate) candidates.push(new Date(interviewDate).getTime());

      const anchorMs = Math.max(...candidates.filter(value => Number.isFinite(value)));

      items.push(
        deriveFollowUpAttention({
          applicationId: app.id,
          company: app.company,
          position: app.position,
          stage: app.status,
          statusUpdatedAt: app.status_updated_at,
          anchorAt: new Date(anchorMs).toISOString(),
          events: appEvents,
          timeZone
        })
      );
    }

    const rank: Record<string, number> = { overdue: 0, due: 1, snoozed: 2, ghosted: 3, scheduled: 4, closed: 5 };
    items.sort((a, b) => {
      const byState = (rank[a.state] ?? 9) - (rank[b.state] ?? 9);
      if (byState !== 0) return byState;
      return b.daysSinceAnchor - a.daysSinceAnchor;
    });

    return summarizeFollowUpAttention(items, timeZone);
  }

  async recordEvent(
    userId: string,
    applicationId: string,
    input: { kind: FollowUpEventKind; note: string | null }
  ): Promise<FollowUpEventDTO> {
    await this.ensureEventTable();

    const owned = await this.pool.query<{ id: string }>(
      `SELECT id FROM applications WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [applicationId, userId]
    );
    if (!owned.rowCount) fail(404, 'Không tìm thấy hồ sơ.', 'not_found');

    const id = randomUUID();
    const res = await this.pool.query<{ id: string; kind: FollowUpEventKind; note: string | null; occurred_at: Date }>(
      `INSERT INTO application_follow_up_events (id, user_id, application_id, kind, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, kind, note, occurred_at`,
      [id, userId, applicationId, input.kind, input.note]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      applicationId,
      kind: row.kind,
      note: row.note,
      occurredAt: row.occurred_at.toISOString()
    };
  }

  async listEvents(userId: string, applicationId: string): Promise<FollowUpEventDTO[]> {
    await this.ensureEventTable();
    const res = await this.pool.query<{ id: string; kind: FollowUpEventKind; note: string | null; occurred_at: Date }>(
      `SELECT id, kind, note, occurred_at
       FROM application_follow_up_events
       WHERE user_id = $1 AND application_id = $2
       ORDER BY occurred_at DESC
       LIMIT 100`,
      [userId, applicationId]
    );
    return res.rows.map(row => ({
      id: row.id,
      applicationId,
      kind: row.kind,
      note: row.note,
      occurredAt: row.occurred_at.toISOString()
    }));
  }

  private async ensureEventTable(): Promise<void> {
    if (this.eventsReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS application_follow_up_events (
        id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        kind varchar(16) NOT NULL CHECK (kind IN ('followed_up','dismissed','ghosted','reopened')),
        note varchar(500),
        occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_fu_events_app ON application_follow_up_events (application_id, occurred_at DESC);
      CREATE INDEX IF NOT EXISTS idx_fu_events_user ON application_follow_up_events (user_id, occurred_at DESC);
    `);
    this.eventsReady = true;
  }
}
