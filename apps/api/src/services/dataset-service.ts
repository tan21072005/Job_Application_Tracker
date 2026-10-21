import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type {
  DatasetWireDTO,
  DatasetRecordWireDTO,
  DatasetCategory,
  DatasetColumnDefinition,
  DatasetMutationInput,
  DatasetRecordMutationInput
} from '@jobtrack/contract';
import { formatAsCsv, sanitizeForCsv } from '@jobtrack/contract';

export interface UsageSummary {
  tier: 'free' | 'pro' | 'elite';
  dataCaptureUsed: number;
  dataCaptureLimit: number;
  aiTransformUsed: number;
  aiTransformLimit: number;
  datasetsCount: number;
  datasetsLimit: number;
}

export class DatasetService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // ---------------------------------------------------------------------------
  // 1. DATASETS CRUD
  // ---------------------------------------------------------------------------

  async listDatasets(userId: string): Promise<DatasetWireDTO[]> {
    const res = await this.pool.query(
      `SELECT d.id, d.user_id, d.name, d.description, d.category, d.schema_version, d.columns,
              d.created_at, d.updated_at,
              COUNT(r.id)::int AS record_count
       FROM datasets d
       LEFT JOIN dataset_records r ON r.dataset_id = d.id
       WHERE d.user_id = $1
       GROUP BY d.id
       ORDER BY d.updated_at DESC`,
      [userId]
    );

    return res.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category as DatasetCategory,
      schemaVersion: row.schema_version,
      columns: row.columns as DatasetColumnDefinition[],
      recordCount: row.record_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));
  }

  async getDataset(id: string, userId: string): Promise<DatasetWireDTO | null> {
    const res = await this.pool.query(
      `SELECT d.id, d.user_id, d.name, d.description, d.category, d.schema_version, d.columns,
              d.created_at, d.updated_at,
              COUNT(r.id)::int AS record_count
       FROM datasets d
       LEFT JOIN dataset_records r ON r.dataset_id = d.id
       WHERE d.id = $1 AND d.user_id = $2
       GROUP BY d.id`,
      [id, userId]
    );

    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category as DatasetCategory,
      schemaVersion: row.schema_version,
      columns: row.columns as DatasetColumnDefinition[],
      recordCount: row.record_count,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async createDataset(userId: string, input: DatasetMutationInput): Promise<DatasetWireDTO> {
    const id = randomUUID();
    const category = input.category || 'custom';
    const columnsJson = JSON.stringify(input.columns || []);

    const res = await this.pool.query(
      `INSERT INTO datasets (id, user_id, name, description, category, schema_version, columns)
       VALUES ($1, $2, $3, $4, $5, 1, $6::jsonb)
       RETURNING id, user_id, name, description, category, schema_version, columns, created_at, updated_at`,
      [id, userId, input.name.trim(), input.description?.trim() || null, category, columnsJson]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category as DatasetCategory,
      schemaVersion: row.schema_version,
      columns: row.columns as DatasetColumnDefinition[],
      recordCount: 0,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async updateDataset(
    id: string,
    userId: string,
    input: Partial<DatasetMutationInput>
  ): Promise<DatasetWireDTO | null> {
    const existing = await this.getDataset(id, userId);
    if (!existing) return null;

    const name = input.name !== undefined ? input.name.trim() : existing.name;
    const description = input.description !== undefined ? input.description?.trim() || null : existing.description;
    const columns = input.columns !== undefined ? input.columns : existing.columns;

    const res = await this.pool.query(
      `UPDATE datasets
       SET name = $1, description = $2, columns = $3::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND user_id = $5
       RETURNING id, user_id, name, description, category, schema_version, columns, created_at, updated_at`,
      [name, description, JSON.stringify(columns), id, userId]
    );

    const row = res.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      description: row.description,
      category: row.category as DatasetCategory,
      schemaVersion: row.schema_version,
      columns: row.columns as DatasetColumnDefinition[],
      recordCount: existing.recordCount,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    };
  }

  async deleteDataset(id: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'DELETE FROM datasets WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  // ---------------------------------------------------------------------------
  // 2. DATASET RECORDS
  // ---------------------------------------------------------------------------

  async listRecords(
    datasetId: string,
    userId: string,
    limit = 200,
    offset = 0
  ): Promise<{ records: DatasetRecordWireDTO[]; total: number }> {
    const countRes = await this.pool.query(
      'SELECT COUNT(*)::int AS total FROM dataset_records WHERE dataset_id = $1 AND user_id = $2',
      [datasetId, userId]
    );
    const total = countRes.rows[0]?.total || 0;

    const res = await this.pool.query(
      `SELECT id, dataset_id, user_id, data, source_url, source_title, captured_at, provenance, created_at, updated_at
       FROM dataset_records
       WHERE dataset_id = $1 AND user_id = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [datasetId, userId, limit, offset]
    );

    const records: DatasetRecordWireDTO[] = res.rows.map(row => ({
      id: row.id,
      datasetId: row.dataset_id,
      userId: row.user_id,
      data: row.data,
      sourceUrl: row.source_url,
      sourceTitle: row.source_title,
      capturedAt: row.captured_at.toISOString(),
      provenance: row.provenance,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString()
    }));

    return { records, total };
  }

  async addRecords(
    datasetId: string,
    userId: string,
    records: DatasetRecordMutationInput[],
    dedupByUrl = true
  ): Promise<{ inserted: number; skippedDuplicates: number }> {
    // Check dataset existence and ownership
    const ds = await this.getDataset(datasetId, userId);
    if (!ds) {
      throw new Error('Bộ dữ liệu không tồn tại hoặc bạn không có quyền truy cập.');
    }

    let existingUrls = new Set<string>();
    if (dedupByUrl) {
      const urlRes = await this.pool.query(
        'SELECT source_url FROM dataset_records WHERE dataset_id = $1 AND source_url IS NOT NULL',
        [datasetId]
      );
      existingUrls = new Set(urlRes.rows.map(r => r.source_url));
    }

    let inserted = 0;
    let skippedDuplicates = 0;

    for (const item of records) {
      if (dedupByUrl && item.sourceUrl && existingUrls.has(item.sourceUrl)) {
        skippedDuplicates++;
        continue;
      }

      const id = randomUUID();
      const capturedAt = item.capturedAt ? new Date(item.capturedAt).toISOString() : new Date().toISOString();

      await this.pool.query(
        `INSERT INTO dataset_records (id, dataset_id, user_id, data, source_url, source_title, captured_at, provenance)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)`,
        [
          id,
          datasetId,
          userId,
          JSON.stringify(item.data || {}),
          item.sourceUrl || null,
          item.sourceTitle || null,
          capturedAt,
          JSON.stringify(item.provenance || {})
        ]
      );

      if (item.sourceUrl) {
        existingUrls.add(item.sourceUrl);
      }
      inserted++;
    }

    // Update dataset timestamp
    await this.pool.query(
      'UPDATE datasets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [datasetId]
    );

    // Record usage ledger
    if (inserted > 0) {
      await this.logUsage(userId, 'data_capture', inserted, { datasetId });
    }

    return { inserted, skippedDuplicates };
  }

  async exportDatasetAsCsv(datasetId: string, userId: string): Promise<{ filename: string; content: string }> {
    const ds = await this.getDataset(datasetId, userId);
    if (!ds) {
      throw new Error('Bộ dữ liệu không tồn tại.');
    }

    const { records } = await this.listRecords(datasetId, userId, 10000, 0);

    // Columns: defined columns + meta columns (Source URL, Source Title, Captured At)
    const headers = [
      ...ds.columns.map(c => ({ key: c.key, label: c.label })),
      { key: '_sourceUrl', label: 'Nguồn URL' },
      { key: '_sourceTitle', label: 'Tiêu đề trang nguồn' },
      { key: '_capturedAt', label: 'Thời gian thu thập' }
    ];

    const rows = records.map(r => {
      const row: Record<string, unknown> = { ...(r.data || {}) };
      row._sourceUrl = r.sourceUrl || '';
      row._sourceTitle = r.sourceTitle || '';
      row._capturedAt = r.capturedAt;
      return row;
    });

    const csv = formatAsCsv(headers, rows);
    const safeTitle = ds.name.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_').slice(0, 50);
    const filename = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;

    await this.logUsage(userId, 'export_dataset', 1, { datasetId, format: 'csv' });
    return { filename, content: csv };
  }

  // ---------------------------------------------------------------------------
  // 3. USAGE LEDGER & QUOTA CHECKS
  // ---------------------------------------------------------------------------

  async logUsage(
    userId: string,
    action: 'ai_transform' | 'data_capture' | 'export_dataset',
    units = 1,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO usage_ledgers (id, user_id, action, units, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [randomUUID(), userId, action, units, JSON.stringify(metadata)]
    );
  }

  async getUsageSummary(userId: string): Promise<UsageSummary> {
    // Check tier
    const memRes = await this.pool.query(
      `SELECT tier, pro_expires_at FROM user_memberships WHERE user_id = $1`,
      [userId]
    );

    let isPro = false;
    let tier: 'free' | 'pro' | 'elite' = 'free';
    if (memRes.rowCount && memRes.rows[0]) {
      const row = memRes.rows[0];
      if (row.pro_expires_at && new Date(row.pro_expires_at) > new Date()) {
        isPro = true;
        tier = row.tier || 'pro';
      }
    }

    // Count datasets
    const dsRes = await this.pool.query(
      'SELECT COUNT(*)::int AS count FROM datasets WHERE user_id = $1',
      [userId]
    );
    const datasetsCount = dsRes.rows[0]?.count || 0;

    // Count usage in current calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usageRes = await this.pool.query(
      `SELECT action, COALESCE(SUM(units), 0)::int AS total
       FROM usage_ledgers
       WHERE user_id = $1 AND created_at >= $2
       GROUP BY action`,
      [userId, startOfMonth.toISOString()]
    );

    let dataCaptureUsed = 0;
    let aiTransformUsed = 0;
    for (const r of usageRes.rows) {
      if (r.action === 'data_capture') dataCaptureUsed = r.total;
      if (r.action === 'ai_transform') aiTransformUsed = r.total;
    }

    // Quotas according to PRODUCT-PLAN-2026-10-20.md Section 11
    const dataCaptureLimit = isPro ? 20000 : 500;
    const aiTransformLimit = isPro ? 100 : 10;
    const datasetsLimit = isPro ? 20 : 3;

    return {
      tier,
      dataCaptureUsed,
      dataCaptureLimit,
      aiTransformUsed,
      aiTransformLimit,
      datasetsCount,
      datasetsLimit
    };
  }
}
