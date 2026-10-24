import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import {
  canonicalIntentHash,
  deriveActivityTimeline,
  type ApplicationWireDTO,
  type InterviewWireDTO,
  type DashboardWireDTO,
  type ValidatedApplicationData,
  type ValidatedInterviewData,
  type BulkOperationResultDTO,
  type ActivityTimelineItemDTO,
  type ApplicationStatus
} from '../../../../packages/jobtrack-contract/src/index.ts';

export class DomainError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  existing?: { id: string; status: unknown };

  constructor(
    status: number,
    message: string,
    code = 'invalid_request',
    fields?: Record<string, string>,
    existing?: { id: string; status: unknown }
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.existing = existing;
  }
}

export function fail(
  status: number,
  message: string,
  code?: string,
  fields?: Record<string, string>,
  existing?: { id: string; status: unknown }
): never {
  throw new DomainError(status, message, code, fields, existing);
}

export const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const terminal = new Set(['Rejected', 'Withdrawn']);
const active = (status: string) => !terminal.has(status);

export function etag(id: string, version: number): string {
  return `"app:${id}:v${version}"`;
}

export function parseEtagVersion(headerValue?: string | null): number | undefined {
  if (!headerValue) return undefined;
  const match = headerValue.match(/["']?app:[^:]+:v(\d+)["']?/);
  if (match) return parseInt(match[1], 10);
  return undefined;
}

const appColumns = `a.id, a.company, a.position, a.url, a.normalized_url AS "normalizedUrl", a.source, a.source_normalized AS "sourceNormalized", a.job_code AS "jobCode", a.job_code_normalized AS "jobCodeNormalized", a.location, a.work_mode AS "workMode", to_char(a.applied_at,'YYYY-MM-DD') AS "appliedAt", a.salary, a.notes, a.next_action AS "nextAction", to_char(a.deadline_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS deadline, a.status, a.version, to_char(a.deleted_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "deletedAt", to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt", to_char(a.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt"`;
const roundColumns = `i.id, i.application_id AS "applicationId", i.title, to_char(i.at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at, i.timezone, i.format, i.location, i.preparation, i.notes, i.status, to_char(i.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt", to_char(i.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "updatedAt"`;

const appValues = (input: ValidatedApplicationData) => [
  input.company,
  input.position,
  input.url || null,
  input.normalizedUrl || null,
  input.source || null,
  input.sourceNormalized || null,
  input.jobCode || null,
  input.jobCodeNormalized || null,
  input.location || null,
  input.workMode || null,
  input.appliedAt || null,
  input.salary || null,
  input.notes || null,
  input.nextAction || null,
  input.deadline || null,
  input.status
];

const updateFields =
  'company=$3,position=$4,url=$5,normalized_url=$6,source=$7,source_normalized=$8,job_code=$9,job_code_normalized=$10,location=$11,work_mode=$12,applied_at=$13,salary=$14,notes=$15,next_action=$16,deadline_at=$17,status=$18,version=version+1,updated_at=CURRENT_TIMESTAMP';

export interface MutationOptions {
  idempotencyKey?: string;
  ifMatch?: string;
  ifMatchVersion?: number;
  sessionId?: string;
  purge?: boolean;
}

export type JobTrackEvent = {
  type: 'MUTATION';
  entity: 'application' | 'interview';
  action: 'create' | 'update' | 'delete' | 'restore';
  id: string;
  parentId?: string;
  version?: number;
  timestamp: string;
};

type EventListener = (event: JobTrackEvent) => void;

export class JobTrackService {
  private pool: Pool;
  private listeners = new Map<string, Set<EventListener>>();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  public subscribeEvents(userId: string, listener: EventListener): () => void {
    if (!this.listeners.has(userId)) {
      this.listeners.set(userId, new Set());
    }
    this.listeners.get(userId)!.add(listener);
    return () => {
      const set = this.listeners.get(userId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) this.listeners.delete(userId);
      }
    };
  }

  public emitEvent(userId: string, event: JobTrackEvent): void {
    const set = this.listeners.get(userId);
    if (set) {
      for (const listener of set) {
        try {
          listener(event);
        } catch (e) {
          console.error('Error in event listener:', e);
        }
      }
    }
  }

  private async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockActor(client: PoolClient, userId: string, sessionId?: string): Promise<void> {
    if (sessionId) {
      const sRes = await client.query(
        'SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP FOR SHARE',
        [sessionId, userId]
      );
      if (!sRes.rowCount) {
        fail(401, 'Phiên đăng nhập đã hết hạn.', 'unauthorized');
      }
    }
    await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
  }

  private async lockedApplication(client: PoolClient, userId: string, id: string): Promise<Record<string, unknown>> {
    if (!uuid(id)) fail(404, 'Không tìm thấy hồ sơ.', 'not_found');
    const result = await client.query('SELECT * FROM applications WHERE user_id=$1 AND id=$2 FOR UPDATE', [userId, id]);
    if (!result.rowCount) fail(404, 'Không tìm thấy hồ sơ.', 'not_found');
    return result.rows[0];
  }

  private async lockedRound(client: PoolClient, userId: string, id: string): Promise<Record<string, unknown>> {
    if (!uuid(id)) fail(404, 'Không tìm thấy phỏng vấn.', 'not_found');
    const r = await client.query(
      'SELECT i.*,a.id AS parent_id,a.version FROM interviews i JOIN applications a ON a.id=i.application_id WHERE i.id=$1 AND a.user_id=$2 FOR UPDATE OF i,a',
      [id, userId]
    );
    if (!r.rowCount) fail(404, 'Không tìm thấy phỏng vấn.', 'not_found');
    return r.rows[0];
  }

  private checkPrecondition(expectedId: string, currentVersion: number, options: MutationOptions): void {
    if (options.ifMatch !== undefined) {
      if (!options.ifMatch) {
        fail(428, 'Thiếu phiên bản hồ sơ. Tải lại trước khi lưu.', 'missing_precondition');
      }
      if (options.ifMatch !== etag(expectedId, currentVersion)) {
        fail(412, 'Hồ sơ đã được cập nhật ở nơi khác. Tải lại trước khi lưu.', 'precondition_failed');
      }
    } else if (options.ifMatchVersion !== undefined) {
      if (options.ifMatchVersion !== currentVersion) {
        fail(412, 'Hồ sơ đã được cập nhật ở nơi khác. Tải lại trước khi lưu.', 'precondition_failed');
      }
    } else {
      fail(428, 'Thiếu phiên bản hồ sơ. Tải lại trước khi lưu.', 'missing_precondition');
    }
  }

  private async duplicate(
    client: PoolClient,
    userId: string,
    input: ValidatedApplicationData,
    exclude?: string
  ): Promise<{ id: string; status: string } | null> {
    if (!input.normalizedUrl && !(input.sourceNormalized && input.jobCodeNormalized)) return null;
    const r = await client.query(
      `SELECT id,status FROM applications WHERE user_id=$1 AND id<>$2 AND ((normalized_url IS NOT NULL AND normalized_url=$3) OR (source_normalized IS NOT NULL AND job_code_normalized IS NOT NULL AND source_normalized=$4 AND job_code_normalized=$5)) ORDER BY CASE WHEN status IN ('Rejected','Withdrawn') THEN 1 ELSE 0 END,created_at DESC LIMIT 1`,
      [
        userId,
        exclude || '00000000-0000-4000-8000-000000000000',
        input.normalizedUrl,
        input.sourceNormalized,
        input.jobCodeNormalized
      ]
    );
    return r.rows[0] || null;
  }

  private async createIdempotent<T>(
    client: PoolClient,
    userId: string,
    scope: string,
    keyValue: string,
    operation: string,
    input: unknown,
    preconditions: Record<string, unknown> | undefined,
    create: () => Promise<T>
  ): Promise<{ value: T; replay: boolean }> {
    const hash = canonicalIntentHash(operation, input, preconditions);
    const previous = await client.query(
      'SELECT request_hash,response_status,response_body FROM idempotency_requests WHERE user_id=$1 AND scope=$2 AND key=$3 AND expires_at>CURRENT_TIMESTAMP FOR UPDATE',
      [userId, scope, keyValue]
    );
    if (previous.rowCount) {
      if (!previous.rows[0].request_hash.equals(hash)) {
        fail(422, 'Khóa yêu cầu đã dùng với nội dung khác.', 'idempotency_mismatch');
      }
      return { value: previous.rows[0].response_body as T, replay: true };
    }
    const value = await create();
    await client.query(
      "INSERT INTO idempotency_requests(user_id,scope,key,request_hash,response_status,response_body,expires_at) VALUES($1,$2,$3,$4,201,$5,CURRENT_TIMESTAMP + interval '24 hours') ON CONFLICT(user_id,scope,key) DO UPDATE SET request_hash=EXCLUDED.request_hash,response_body=EXCLUDED.response_body,created_at=CURRENT_TIMESTAMP,expires_at=EXCLUDED.expires_at",
      [userId, scope, keyValue, hash, JSON.stringify(value)]
    );
    return { value, replay: false };
  }

  public async listApplications(
    userId: string,
    query?: { q?: string; status?: string; sort?: string; includeDeleted?: boolean },
    externalClient?: PoolClient | Pool
  ): Promise<ApplicationWireDTO[]> {
    const owned = !externalClient ? await this.pool.connect() : null;
    const db = externalClient || owned!;
    try {
      if (owned) await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');

      let sql = `SELECT ${appColumns} FROM applications a WHERE a.user_id=$1`;
      const params: unknown[] = [userId];

      if (!query?.includeDeleted) {
        sql += ' AND a.deleted_at IS NULL';
      }

      if (query?.status && query.status !== 'all') {
        params.push(query.status);
        sql += ` AND a.status=$${params.length}`;
      }

      if (query?.q) {
        params.push(`%${query.q.trim().toLowerCase()}%`);
        sql += ` AND (LOWER(a.company) LIKE $${params.length} OR LOWER(a.position) LIKE $${params.length})`;
      }

      let orderBy = 'ORDER BY a.created_at DESC, a.id DESC';
      if (query?.sort) {
        switch (query.sort) {
          case 'createdAt:asc':
            orderBy = 'ORDER BY a.created_at ASC, a.id ASC';
            break;
          case 'appliedAt:desc':
            orderBy = 'ORDER BY a.applied_at DESC NULLS LAST, a.created_at DESC, a.id DESC';
            break;
          case 'appliedAt:asc':
            orderBy = 'ORDER BY a.applied_at ASC NULLS LAST, a.created_at ASC, a.id ASC';
            break;
          case 'createdAt:desc':
          default:
            orderBy = 'ORDER BY a.created_at DESC, a.id DESC';
            break;
        }
      }
      sql += ` ${orderBy}`;

      const records = (await db.query(sql, params)).rows;
      const rounds = (
        await db.query(
          `SELECT ${roundColumns} FROM interviews i JOIN applications a ON a.id=i.application_id WHERE a.user_id=$1 ORDER BY i.at,i.id`,
          [userId]
        )
      ).rows;

      const byId = new Map<string, ApplicationWireDTO>(
        records.map(record => [
          record.id,
          {
            ...record,
            interviews: []
          }
        ])
      );

      for (const round of rounds) {
        byId.get(round.applicationId)?.interviews.push(round);
      }

      if (owned) await db.query('COMMIT');
      return [...byId.values()];
    } catch (error) {
      if (owned) await db.query('ROLLBACK');
      throw error;
    } finally {
      owned?.release();
    }
  }

  public async getApplication(
    userId: string,
    id: string,
    externalClient?: PoolClient | Pool
  ): Promise<ApplicationWireDTO | null> {
    const all = await this.listApplications(userId, { includeDeleted: true }, externalClient);
    return all.find(record => record.id === id) || null;
  }

  public async createApplication(
    userId: string,
    input: ValidatedApplicationData,
    options: MutationOptions = {}
  ): Promise<{ application: ApplicationWireDTO; replay: boolean }> {
    const key = options.idempotencyKey;
    if (!key || !uuid(key)) {
      fail(428, 'Thiếu khóa yêu cầu. Hãy thử lại.', 'missing_idempotency_key');
    }

    const result = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);

      return this.createIdempotent(
        client,
        userId,
        'applications:create',
        key!,
        'applications:create',
        input,
        undefined,
        async () => {
          const match = await this.duplicate(client, userId, input);
          if (match) {
            if (active(match.status)) {
              fail(409, 'Tin tuyển dụng này đã có hồ sơ đang hoạt động.', 'duplicate', undefined, {
                id: match.id,
                status: match.status
              });
            }
            if (!input.confirmReapply) {
              fail(409, 'Xác nhận ứng tuyển lại trước khi tạo hồ sơ mới.', 'reapply_confirmation_required', undefined, {
                id: match.id,
                status: match.status
              });
            }
          }

          const id = randomUUID();
          await client.query(
            `INSERT INTO applications(id,user_id,company,position,url,normalized_url,source,source_normalized,job_code,job_code_normalized,location,work_mode,applied_at,salary,notes,next_action,deadline_at,status) VALUES($1,$2,${Array.from({ length: 16 }, (_, i) => `$${i + 3}`).join(',')})`,
            [id, userId, ...appValues(input)]
          );

          const app = await this.getApplication(userId, id, client);
          return app!;
        }
      );
    });

    if (!result.replay) {
      this.emitEvent(userId, {
        type: 'MUTATION',
        entity: 'application',
        action: 'create',
        id: result.value.id,
        version: result.value.version,
        timestamp: new Date().toISOString()
      });
    }

    return { application: result.value, replay: result.replay };
  }

  public async updateApplication(
    userId: string,
    id: string,
    patch: Partial<ValidatedApplicationData>,
    options: MutationOptions = {}
  ): Promise<ApplicationWireDTO> {
    const updated = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const old = await this.lockedApplication(client, userId, id);
      this.checkPrecondition(id, Number(old.version), options);

      const current = (await this.getApplication(userId, id, client))!;
      const merged: ValidatedApplicationData = {
        company: patch.company !== undefined ? patch.company : current.company,
        position: patch.position !== undefined ? patch.position : current.position,
        url: patch.url !== undefined ? patch.url : current.url,
        normalizedUrl: patch.normalizedUrl !== undefined ? patch.normalizedUrl : current.normalizedUrl,
        source: patch.source !== undefined ? patch.source : current.source,
        sourceNormalized: patch.sourceNormalized !== undefined ? patch.sourceNormalized : current.sourceNormalized,
        jobCode: patch.jobCode !== undefined ? patch.jobCode : current.jobCode,
        jobCodeNormalized: patch.jobCodeNormalized !== undefined ? patch.jobCodeNormalized : current.jobCodeNormalized,
        location: patch.location !== undefined ? patch.location : current.location,
        workMode: patch.workMode !== undefined ? patch.workMode : current.workMode,
        appliedAt: patch.appliedAt !== undefined ? patch.appliedAt : current.appliedAt,
        salary: patch.salary !== undefined ? patch.salary : current.salary,
        notes: patch.notes !== undefined ? patch.notes : current.notes,
        nextAction: patch.nextAction !== undefined ? patch.nextAction : current.nextAction,
        deadline: patch.deadline !== undefined ? patch.deadline : current.deadline,
        status: patch.status !== undefined ? patch.status : current.status,
        confirmReapply: patch.confirmReapply === true
      };

      if (merged.deadline && !merged.nextAction) {
        fail(422, 'Cần nhập hành động tiếp theo khi có hạn chót.', 'invalid_request', {
          nextAction: 'Cần nhập hành động tiếp theo khi có hạn chót.'
        });
      }

      const urlChanged = (merged.normalizedUrl ?? null) !== (current.normalizedUrl ?? null);
      const sourceCodeChanged =
        (merged.sourceNormalized ?? null) !== (current.sourceNormalized ?? null) ||
        (merged.jobCodeNormalized ?? null) !== (current.jobCodeNormalized ?? null);
      const identityChanged = urlChanged || sourceCodeChanged;
      const reactivated = !active(current.status) && active(merged.status);
      if (identityChanged || reactivated) {
        const match = await this.duplicate(client, userId, merged, id);
        if (match) {
          if (active(match.status)) {
            fail(409, 'Tin tuyển dụng này đã có hồ sơ đang hoạt động.', 'duplicate', undefined, {
              id: match.id,
              status: match.status
            });
          }
          if (!merged.confirmReapply) {
            fail(409, 'Xác nhận ứng tuyển lại trước khi tạo hồ sơ mới.', 'reapply_confirmation_required', undefined, {
              id: match.id,
              status: match.status
            });
          }
        }
      }

      await client.query(`UPDATE applications SET ${updateFields} WHERE id=$1 AND user_id=$2`, [
        id,
        userId,
        ...appValues(merged)
      ]);

      const res = await this.getApplication(userId, id, client);
      return res!;
    });

    this.emitEvent(userId, {
      type: 'MUTATION',
      entity: 'application',
      action: 'update',
      id: updated.id,
      version: updated.version,
      timestamp: new Date().toISOString()
    });

    return updated;
  }

  public async deleteApplication(
    userId: string,
    id: string,
    options: MutationOptions = {}
  ): Promise<void> {
    await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const old = await this.lockedApplication(client, userId, id);
      this.checkPrecondition(id, Number(old.version), options);

      if (options.purge) {
        await client.query('DELETE FROM applications WHERE id=$1 AND user_id=$2', [id, userId]);
      } else {
        await client.query(
          'UPDATE applications SET deleted_at=CURRENT_TIMESTAMP, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2',
          [id, userId]
        );
      }
    });

    this.emitEvent(userId, {
      type: 'MUTATION',
      entity: 'application',
      action: 'delete',
      id,
      timestamp: new Date().toISOString()
    });
  }

  public async restoreApplication(
    userId: string,
    id: string,
    options: MutationOptions = {}
  ): Promise<ApplicationWireDTO> {
    const restored = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const old = await this.lockedApplication(client, userId, id);
      if (old.deleted_at === null) {
        fail(400, 'Hồ sơ này không nằm trong thùng rác.', 'not_in_trash');
      }

      await client.query(
        'UPDATE applications SET deleted_at=NULL, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1 AND user_id=$2',
        [id, userId]
      );

      const app = await this.getApplication(userId, id, client);
      return app!;
    });

    this.emitEvent(userId, {
      type: 'MUTATION',
      entity: 'application',
      action: 'restore',
      id: restored.id,
      version: restored.version,
      timestamp: new Date().toISOString()
    });

    return restored;
  }

  public async bulkUpdateStatus(
    userId: string,
    ids: string[],
    status: ApplicationStatus,
    options: MutationOptions = {}
  ): Promise<BulkOperationResultDTO> {
    const affected = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const res = await client.query(
        'UPDATE applications SET status = $1, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND id = ANY($3::uuid[]) AND deleted_at IS NULL RETURNING id',
        [status, userId, ids]
      );
      return res.rows.map(r => r.id as string);
    });

    for (const id of affected) {
      this.emitEvent(userId, {
        type: 'MUTATION',
        entity: 'application',
        action: 'update',
        id,
        timestamp: new Date().toISOString()
      });
    }

    return {
      affectedCount: affected.length,
      ids: affected
    };
  }

  public async bulkMoveToTrash(
    userId: string,
    ids: string[],
    options: MutationOptions = {}
  ): Promise<BulkOperationResultDTO> {
    const affected = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const res = await client.query(
        'UPDATE applications SET deleted_at = CURRENT_TIMESTAMP, version = version + 1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND id = ANY($2::uuid[]) AND deleted_at IS NULL RETURNING id',
        [userId, ids]
      );
      return res.rows.map(r => r.id as string);
    });

    for (const id of affected) {
      this.emitEvent(userId, {
        type: 'MUTATION',
        entity: 'application',
        action: 'delete',
        id,
        timestamp: new Date().toISOString()
      });
    }

    return {
      affectedCount: affected.length,
      ids: affected
    };
  }

  public async getApplicationTimeline(userId: string, id: string): Promise<ActivityTimelineItemDTO[]> {
    const app = await this.getApplication(userId, id);
    if (!app || app.deletedAt) {
      fail(404, 'Không tìm thấy hồ sơ ứng tuyển.', 'not_found');
    }
    return deriveActivityTimeline(app);
  }

  public async createInterview(
    userId: string,
    applicationId: string,
    input: ValidatedInterviewData,
    options: MutationOptions = {}
  ): Promise<{ round: InterviewWireDTO; replay: boolean; newApplicationVersion: number }> {
    const key = options.idempotencyKey;
    if (!key || !uuid(key)) {
      fail(428, 'Thiếu khóa yêu cầu. Hãy thử lại.', 'missing_idempotency_key');
    }

    const ifMatchHeader = options.ifMatchVersion !== undefined ? etag(applicationId, options.ifMatchVersion) : null;

    const result = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);

      return this.createIdempotent(
        client,
        userId,
        `interviews:create:${applicationId}`,
        key!,
        'interviews:create',
        input,
        { ifMatch: ifMatchHeader },
        async () => {
          const parent = await this.lockedApplication(client, userId, applicationId);
          this.checkPrecondition(applicationId, Number(parent.version), options);

          const roundId = randomUUID();
          await client.query(
            'INSERT INTO interviews(id,application_id,title,at,timezone,format,location,preparation,notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
            [
              roundId,
              applicationId,
              input.title,
              input.at,
              input.timezone,
              input.format,
              input.location || null,
              input.preparation || null,
              input.notes || null,
              input.status
            ]
          );

          await client.query(
            "UPDATE applications SET version=version+1,updated_at=CURRENT_TIMESTAMP,status=CASE WHEN status IN ('Offer','Rejected','Withdrawn') THEN status ELSE 'Interview' END WHERE id=$1",
            [applicationId]
          );

          const r = (
            await client.query(
              `SELECT ${roundColumns}, a.version AS "applicationVersion" FROM interviews i JOIN applications a ON a.id=i.application_id WHERE i.id=$1`,
              [roundId]
            )
          ).rows[0] as InterviewWireDTO;

          return r;
        }
      );
    });

    const newVersion = result.value.applicationVersion || 1;
    if (!result.replay) {
      this.emitEvent(userId, {
        type: 'MUTATION',
        entity: 'interview',
        action: 'create',
        id: result.value.id,
        parentId: applicationId,
        version: newVersion,
        timestamp: new Date().toISOString()
      });
    }

    return {
      round: result.value,
      replay: result.replay,
      newApplicationVersion: newVersion
    };
  }

  public async updateInterview(
    userId: string,
    interviewId: string,
    patch: Partial<ValidatedInterviewData>,
    options: MutationOptions = {}
  ): Promise<{ round: InterviewWireDTO; parentId: string; newApplicationVersion: number }> {
    const result = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const old = await this.lockedRound(client, userId, interviewId);
      this.checkPrecondition(String(old.parent_id), Number(old.version), options);

      const title = patch.title !== undefined ? patch.title : old.title;
      const at = patch.at !== undefined ? patch.at : (old.at instanceof Date ? old.at.toISOString() : String(old.at));
      const timezone = patch.timezone !== undefined ? patch.timezone : old.timezone;
      const format = patch.format !== undefined ? patch.format : old.format;
      const location = patch.location !== undefined ? patch.location : old.location;
      const preparation = patch.preparation !== undefined ? patch.preparation : old.preparation;
      const notes = patch.notes !== undefined ? patch.notes : old.notes;
      const status = patch.status !== undefined ? patch.status : old.status;

      await client.query(
        'UPDATE interviews SET title=$2,at=$3,timezone=$4,format=$5,location=$6,preparation=$7,notes=$8,status=$9,updated_at=CURRENT_TIMESTAMP WHERE id=$1',
        [interviewId, title, at, timezone, format, location, preparation, notes, status]
      );

      const appUpdate = await client.query('UPDATE applications SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING version', [
        old.parent_id
      ]);
      const newVersion = appUpdate.rows[0].version;

      const resRound = (
        await client.query(
          `SELECT ${roundColumns}, a.version AS "applicationVersion" FROM interviews i JOIN applications a ON a.id=i.application_id WHERE i.id=$1`,
          [interviewId]
        )
      ).rows[0] as InterviewWireDTO;

      return { round: resRound, parentId: String(old.parent_id), newApplicationVersion: Number(newVersion) };
    });

    this.emitEvent(userId, {
      type: 'MUTATION',
      entity: 'interview',
      action: 'update',
      id: interviewId,
      parentId: result.parentId,
      version: result.newApplicationVersion,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  public async deleteInterview(
    userId: string,
    interviewId: string,
    options: MutationOptions = {}
  ): Promise<{ parentId: string; newApplicationVersion: number }> {
    const result = await this.transaction(async client => {
      await this.lockActor(client, userId, options.sessionId);
      const old = await this.lockedRound(client, userId, interviewId);
      this.checkPrecondition(String(old.parent_id), Number(old.version), options);

      await client.query('DELETE FROM interviews WHERE id=$1', [interviewId]);
      const appUpdate = await client.query('UPDATE applications SET version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING version', [
        old.parent_id
      ]);
      return { parentId: String(old.parent_id), newApplicationVersion: Number(appUpdate.rows[0].version) };
    });

    this.emitEvent(userId, {
      type: 'MUTATION',
      entity: 'interview',
      action: 'delete',
      id: interviewId,
      parentId: result.parentId,
      version: result.newApplicationVersion,
      timestamp: new Date().toISOString()
    });

    return result;
  }

  public async getDashboardSummary(userId: string): Promise<DashboardWireDTO> {
    const result = await this.pool.query(
      `WITH owned AS (SELECT id,status FROM applications WHERE user_id=$1 AND deleted_at IS NULL),
            app_stats AS (
              SELECT count(*)::integer AS total,
                     count(*) FILTER(WHERE status='Offer')::integer AS offers,
                     count(*) FILTER(WHERE status IN ('Applied','Screening','Interview','Offer','Rejected'))::integer AS submitted,
                     count(*) FILTER(WHERE status IN ('Screening','Interview','Offer','Rejected'))::integer AS responses
              FROM owned
            ),
            round_stats AS (
              SELECT count(*)::integer AS upcoming
              FROM interviews i
              JOIN owned a ON a.id=i.application_id
              WHERE i.status='Scheduled' AND i.at>=CURRENT_TIMESTAMP
            )
       SELECT app_stats.total, app_stats.offers, round_stats.upcoming,
              CASE WHEN app_stats.submitted=0 THEN 0 ELSE app_stats.responses::double precision/app_stats.submitted*100 END AS response
       FROM app_stats CROSS JOIN round_stats`,
      [userId]
    );
    const row = result.rows[0];
    return {
      total: Number(row.total),
      offers: Number(row.offers),
      upcoming: Number(row.upcoming),
      response: Number(row.response),
      asOf: new Date().toISOString()
    };
  }
}
