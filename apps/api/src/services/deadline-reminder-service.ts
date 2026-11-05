
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { sendMail, mailerMode } from './mailer.ts';

export type ReminderBucket = 'T-7' | 'T-3' | 'T-1' | 'due';

const BUCKETS: Array<{ bucket: ReminderBucket; daysAhead: number }> = [
  { bucket: 'T-7', daysAhead: 7 },
  { bucket: 'T-3', daysAhead: 3 },
  { bucket: 'T-1', daysAhead: 1 },
  { bucket: 'due', daysAhead: 0 }
];

export interface DueApplication {
  id: string;
  user_id: string;
  email: string;
  company: string;
  position: string;
  next_action: string | null;
  deadline_at: Date;
  days_remaining: number;
}

export interface ReminderRunResult {
  scanned: number;
  sent: number;
  skippedAlreadySent: number;
  skippedNoTransport: number;
  failed: number;
  delivered: Array<{
    applicationId: string;
    bucket: ReminderBucket;
    to: string;
    subject: string;
  }>;
}

export function selectBucket(daysRemaining: number): ReminderBucket | null {
  if (daysRemaining < 0) return null;
  if (daysRemaining === 0) return 'due';
  if (daysRemaining <= 1) return 'T-1';
  if (daysRemaining <= 3) return 'T-3';
  if (daysRemaining <= 7) return 'T-7';
  return null; // còn hơn 7 ngày, chưa cần nhắc
}

const formatDate = (date: Date): string =>
  date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const subjectFor = (bucket: ReminderBucket, company: string): string => {
  switch (bucket) {
    case 'due':
      return `[JobTrack] Hôm nay là hạn chót — ${company}`;
    case 'T-1':
      return `[JobTrack] Còn 1 ngày — ${company}`;
    case 'T-3':
      return `[JobTrack] Còn 3 ngày — ${company}`;
    case 'T-7':
      return `[JobTrack] Còn 7 ngày — ${company}`;
  }
};

const bodyFor = (app: DueApplication, bucket: ReminderBucket): { text: string; html: string } => {
  const deadline = formatDate(app.deadline_at);
  const action = app.next_action?.trim() || 'Chưa đặt bước tiếp theo';
  const when =
    bucket === 'due' ? 'Hôm nay' : bucket === 'T-1' ? 'Ngày mai' : `Còn ${bucket.slice(2)} ngày`;

  const text = [
    `${when} là hạn chót cho hồ sơ của bạn.`,
    '',
    `Công ty:  ${app.company}`,
    `Vị trí:   ${app.position}`,
    `Hạn chót: ${deadline}`,
    `Việc cần làm: ${action}`,
    '',
    'Mở JobTrack để cập nhật trạng thái hoặc dời hạn.',
    '',
    '— JobTrack',
    'Bạn nhận email này vì đã bật nhắc việc cho hồ sơ này.',
    'Tắt nhắc: mở hồ sơ trong JobTrack và tắt "Nhắc việc".'
  ].join('\n');

  const html = `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0f172a">
  <p><strong>${when} là hạn chót</strong> cho hồ sơ của bạn.</p>
  <table cellpadding="6" style="border-collapse:collapse">
    <tr><td style="color:#64748b">Công ty</td><td><strong>${escapeHtml(app.company)}</strong></td></tr>
    <tr><td style="color:#64748b">Vị trí</td><td>${escapeHtml(app.position)}</td></tr>
    <tr><td style="color:#64748b">Hạn chót</td><td>${deadline}</td></tr>
    <tr><td style="color:#64748b">Việc cần làm</td><td>${escapeHtml(action)}</td></tr>
  </table>
  <p style="margin-top:20px">Mở JobTrack để cập nhật trạng thái hoặc dời hạn.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
  <p style="font-size:12px;color:#64748b">
    Bạn nhận email này vì đã bật nhắc việc cho hồ sơ này.<br>
    Tắt nhắc: mở hồ sơ trong JobTrack và tắt &quot;Nhắc việc&quot;.
  </p>
</body></html>`;

  return { text, html };
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class DeadlineReminderService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async run(options: {
    dryRun?: boolean;
    now?: Date;
    userId?: string;
    limit?: number;
  } = {}): Promise<ReminderRunResult> {
    const now = options.now ?? new Date();
    const limit = Math.min(Math.max(options.limit ?? 500, 1), 5000);
    const dryRun = options.dryRun ?? false;
    const timeZone = process.env.REMINDER_TIMEZONE || 'Asia/Ho_Chi_Minh';

    const params: unknown[] = [timeZone];
    let where = `
      a.deadline_at IS NOT NULL
      AND a.reminders_enabled = true
      AND a.deadline_at >= ((CURRENT_TIMESTAMP AT TIME ZONE $1)::date - INTERVAL '1 day')
      AND a.deadline_at <  ((CURRENT_TIMESTAMP AT TIME ZONE $1)::date + INTERVAL '8 days')`;
    if (options.userId) {
      params.push(options.userId);
      where += ` AND a.user_id = $${params.length}`;
    }

    const due = await this.pool.query<DueApplication>(
      `SELECT a.id, a.user_id, u.email, a.company, a.position,
              a.next_action, a.deadline_at,
              (((a.deadline_at AT TIME ZONE $1)::date) - ((CURRENT_TIMESTAMP AT TIME ZONE $1)::date)) AS days_remaining
         FROM applications a
         JOIN users u ON u.id = a.user_id
        WHERE ${where}
        ORDER BY a.deadline_at ASC
        LIMIT ${limit}`,
      params
    );

    const result: ReminderRunResult = {
      scanned: due.rowCount ?? 0,
      sent: 0,
      skippedAlreadySent: 0,
      skippedNoTransport: 0,
      failed: 0,
      delivered: []
    };

    const transport = mailerMode();
    const canSend = transport !== 'console' || process.env.MAIL_ALLOW_CONSOLE === '1';

    for (const row of due.rows) {
      const daysRemaining = Number(row.days_remaining);
      const bucket = selectBucket(daysRemaining);
      if (!bucket) continue;

      if (!dryRun) {
        const claim = await this.pool.query(
          `INSERT INTO deadline_reminders
             (id, user_id, application_id, bucket, deadline_snapshot, transport)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (application_id, bucket, deadline_snapshot) DO NOTHING
           RETURNING id`,
          [randomUUID(), row.user_id, row.id, bucket, row.deadline_at, transport]
        );
        if ((claim.rowCount ?? 0) === 0) {
          result.skippedAlreadySent += 1;
          continue;
        }
      }

      if (!canSend) {
        result.skippedNoTransport += 1;
        if (!dryRun) {
          await this.pool.query(
            `DELETE FROM deadline_reminders
              WHERE application_id=$1 AND bucket=$2 AND deadline_snapshot=$3`,
            [row.id, bucket, row.deadline_at]
          );
        }
        continue;
      }

      const subject = subjectFor(bucket, row.company);
      const { text, html } = bodyFor(row, bucket);

      if (dryRun) {
        result.delivered.push({ applicationId: row.id, bucket, to: row.email, subject });
        result.sent += 1;
        continue;
      }

      try {
        await sendMail({ to: row.email, subject, text, html });
        result.sent += 1;
        result.delivered.push({ applicationId: row.id, bucket, to: row.email, subject });
      } catch (error) {
        result.failed += 1;
        await this.pool.query(
          `DELETE FROM deadline_reminders
            WHERE application_id=$1 AND bucket=$2 AND deadline_snapshot=$3`,
          [row.id, bucket, row.deadline_at]
        ).catch(() => undefined);
        console.error('[deadline-reminder] gửi thất bại', {
          applicationId: row.id,
          bucket,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return result;
  }

  async history(userId: string, limit = 100): Promise<Array<{
    applicationId: string;
    bucket: ReminderBucket;
    deadline: string;
    sentAt: string;
  }>> {
    const res = await this.pool.query<{
      application_id: string;
      bucket: ReminderBucket;
      deadline_snapshot: Date;
      sent_at: Date;
    }>(
      `SELECT application_id, bucket, deadline_snapshot, sent_at
         FROM deadline_reminders
        WHERE user_id = $1
        ORDER BY sent_at DESC
        LIMIT $2`,
      [userId, Math.min(Math.max(limit, 1), 500)]
    );
    return res.rows.map(row => ({
      applicationId: row.application_id,
      bucket: row.bucket,
      deadline: row.deadline_snapshot.toISOString(),
      sentAt: row.sent_at.toISOString()
    }));
  }
}
