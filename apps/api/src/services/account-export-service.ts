import type { Pool } from 'pg';

type TableSpec = { table: string; orderBy?: string };

const OWNED_TABLES: TableSpec[] = [
  { table: 'applications', orderBy: 'created_at' },
  { table: 'application_events', orderBy: 'created_at' },
  { table: 'candidate_profiles' },
  { table: 'user_resumes', orderBy: 'created_at' },
  { table: 'resume_optimizations', orderBy: 'created_at' },
  { table: 'contacts', orderBy: 'created_at' },
  { table: 'contact_interactions', orderBy: 'date' },
  { table: 'outreach_campaigns', orderBy: 'created_at' },
  { table: 'outreach_recipients', orderBy: 'created_at' },
  { table: 'interview_simulation_sessions', orderBy: 'created_at' },
  { table: 'system_design_sessions', orderBy: 'created_at' },
  { table: 'candidate_portfolios' },
  { table: 'portfolio_access_logs', orderBy: 'accessed_at' },
  { table: 'user_analytics_goals' },
  { table: 'analytics_snapshots', orderBy: 'created_at' },
  { table: 'career_roadmaps', orderBy: 'created_at' },
  { table: 'career_roadmap_milestones' },
  { table: 'compensation_forecasts', orderBy: 'created_at' },
  { table: 'career_competencies' },
  { table: 'culture_radar_reports', orderBy: 'created_at' },
  { table: 'headhunter_contacts', orderBy: 'created_at' },
  { table: 'headhunter_mandates', orderBy: 'created_at' },
  { table: 'company_reviews', orderBy: 'created_at' },
  { table: 'follow_up_templates' },
  { table: 'follow_up_logs', orderBy: 'created_at' },
  { table: 'job_subscriptions', orderBy: 'created_at' },
  { table: 'universal_datasets', orderBy: 'created_at' },
  { table: 'dataset_records', orderBy: 'created_at' },
  { table: 'usage_ledgers', orderBy: 'created_at' },
  { table: 'ai_commands', orderBy: 'created_at' },
  { table: 'ai_grants' },
  { table: 'chat_sessions', orderBy: 'created_at' },
  { table: 'chat_messages', orderBy: 'created_at' },
  { table: 'activity_timeline', orderBy: 'created_at' },
  { table: 'decision_matrices', orderBy: 'created_at' },
  { table: 'pipeline_snapshots', orderBy: 'created_at' }
];

const OWNED_VIA_PARENT: Array<{ table: string; parent: string; orderBy?: string }> = [
  { table: 'interviews', parent: 'applications', orderBy: 'at' }
];

const EXPORT_VERSION = 'jobtrack-export@1';

const tableExists = async (pool: Pool, table: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT (to_regclass($1) IS NOT NULL) AS exists`,
    [`public.${table}`]
  );
  return Boolean(result.rows[0]?.exists);
};

const hasUserIdColumn = async (pool: Pool, table: string): Promise<boolean> => {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'user_id'
     ) AS exists`,
    [table]
  );
  return Boolean(result.rows[0]?.exists);
};

export type AccountExport = {
  version: string;
  exportedAt: string;
  account: { id: string; email: string; createdAt: string | null };
  counts: Record<string, number>;
  data: Record<string, unknown[]>;
};

export class AccountExportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async collect(userId: string): Promise<AccountExport> {
    const accountRes = await this.pool.query<{ id: string; email: string; created_at: Date | null }>(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId]
    );
    const account = accountRes.rows[0];
    if (!account) throw new Error('account_not_found');

    const data: Record<string, unknown[]> = {};
    const counts: Record<string, number> = {};

    for (const spec of OWNED_TABLES) {
      if (!(await tableExists(this.pool, spec.table))) continue;
      if (!(await hasUserIdColumn(this.pool, spec.table))) continue;

      const order = spec.orderBy ? ` ORDER BY ${spec.orderBy}` : '';
      const result = await this.pool.query(
        `SELECT * FROM ${spec.table} WHERE user_id = $1${order}`,
        [userId]
      );
      if (result.rowCount === 0) continue;
      data[spec.table] = result.rows;
      counts[spec.table] = result.rowCount ?? 0;
    }

    for (const spec of OWNED_VIA_PARENT) {
      if (!(await tableExists(this.pool, spec.table))) continue;

      const order = spec.orderBy ? ` ORDER BY c.${spec.orderBy}` : '';
      const result = await this.pool.query(
        `SELECT c.* FROM ${spec.table} c
         JOIN ${spec.parent} p ON p.id = c.${spec.parent.slice(0, -1)}_id
         WHERE p.user_id = $1${order}`,
        [userId]
      );
      if (result.rowCount === 0) continue;
      data[spec.table] = result.rows;
      counts[spec.table] = result.rowCount ?? 0;
    }

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      account: {
        id: account.id,
        email: account.email,
        createdAt: account.created_at ? account.created_at.toISOString() : null
      },
      counts,
      data
    };
  }

  async collectApplicationsCsv(userId: string): Promise<string> {
    if (!(await tableExists(this.pool, 'applications'))) return '';

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT * FROM applications WHERE user_id = $1 ORDER BY created_at`,
      [userId]
    );
    if (result.rowCount === 0) return '';

    const columns = Object.keys(result.rows[0]);
    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const text = value instanceof Date ? value.toISOString() : String(value);
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const header = columns.join(',');
    const lines = result.rows.map(row => columns.map(column => escape(row[column])).join(','));
    return [header, ...lines].join('\r\n') + '\r\n';
  }
}
