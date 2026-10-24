import { Pool } from 'pg';
import {
  type ApplicationStatus,
  type ApplicationPriority,
  type PipelineMetadataInput,
  type StageSlaStatus,
  calculateStageSla
} from '@jobtrack/contract';

export interface StagnantApplicationItemDTO {
  applicationId: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  priority: ApplicationPriority;
  tags: string[];
  sla: StageSlaStatus;
}

export interface PipelineSummaryDTO {
  totalApplications: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  stagnantCount: number;
}

export class PipelineService {
  private pool: Pool;
  private migrationDone = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.migrationDone) return;
    await this.pool.query(`
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'target';
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    this.migrationDone = true;
  }

  async updatePipelineMetadata(
    userId: string,
    applicationId: string,
    input: PipelineMetadataInput
  ): Promise<{
    id: string;
    company: string;
    position: string;
    status: string;
    priority: ApplicationPriority;
    tags: string[];
    statusUpdatedAt: string;
  } | null> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT id, priority, tags, status_updated_at FROM applications WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
      [applicationId, userId]
    );
    if (res.rowCount === 0) return null;

    const current = res.rows[0];
    const newPriority = input.priority !== undefined ? input.priority : current.priority;
    const newTags = input.tags !== undefined ? JSON.stringify(input.tags) : JSON.stringify(current.tags || []);
    const newStatusUpdatedAt = input.statusUpdatedAt || current.status_updated_at;

    const updateRes = await this.pool.query(
      `UPDATE applications
       SET priority = $1, tags = $2::jsonb, status_updated_at = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING id, company, position, status, priority, tags,
                 to_char(status_updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "statusUpdatedAt"`,
      [newPriority, newTags, newStatusUpdatedAt, applicationId, userId]
    );

    const row = updateRes.rows[0];
    return {
      id: row.id,
      company: row.company,
      position: row.position,
      status: row.status,
      priority: row.priority,
      tags: row.tags || [],
      statusUpdatedAt: row.statusUpdatedAt
    };
  }

  async getStagnantApplications(userId: string): Promise<StagnantApplicationItemDTO[]> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT id, company, position, status, priority, tags,
              to_char(status_updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "statusUpdatedAt",
              to_char(applied_at, 'YYYY-MM-DD') AS "appliedAt",
              to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
       FROM applications
       WHERE user_id = $1 AND status NOT IN ('Rejected', 'Withdrawn') AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [userId]
    );

    const stagnantList: StagnantApplicationItemDTO[] = [];
    for (const r of res.rows) {
      const refDate = r.statusUpdatedAt || (r.appliedAt ? `${r.appliedAt}T00:00:00Z` : r.createdAt);
      const sla = calculateStageSla(r.status, refDate);
      if (sla.isStagnant) {
        stagnantList.push({
          applicationId: r.id,
          company: r.company,
          position: r.position,
          status: r.status,
          priority: r.priority || 'target',
          tags: r.tags || [],
          sla
        });
      }
    }

    return stagnantList.sort((a, b) => {
      if (a.sla.slaSeverity === 'critical' && b.sla.slaSeverity !== 'critical') return -1;
      if (b.sla.slaSeverity === 'critical' && a.sla.slaSeverity !== 'critical') return 1;
      return b.sla.daysInStage - a.sla.daysInStage;
    });
  }

  async getPipelineSummary(userId: string): Promise<PipelineSummaryDTO> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `SELECT id, status, priority, tags,
              to_char(status_updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "statusUpdatedAt",
              to_char(applied_at, 'YYYY-MM-DD') AS "appliedAt",
              to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
       FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = { urgent: 0, target: 0, safety: 0, backlog: 0 };
    const tagCounts: Record<string, number> = {};
    let stagnantCount = 0;

    for (const r of res.rows) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
      if (r.priority && priorityCounts[r.priority] !== undefined) {
        priorityCounts[r.priority]++;
      }
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) {
          tagCounts[t] = (tagCounts[t] || 0) + 1;
        }
      }
      if (!['Rejected', 'Withdrawn'].includes(r.status)) {
        const refDate = r.statusUpdatedAt || (r.appliedAt ? `${r.appliedAt}T00:00:00Z` : r.createdAt);
        const sla = calculateStageSla(r.status, refDate);
        if (sla.isStagnant) {
          stagnantCount++;
        }
      }
    }

    return {
      totalApplications: res.rowCount ?? 0,
      statusCounts,
      priorityCounts,
      tagCounts,
      stagnantCount
    };
  }
}
