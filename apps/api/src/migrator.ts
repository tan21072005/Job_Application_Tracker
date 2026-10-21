import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient } from 'pg';

export interface MigrationFile {
  version: number;
  name: string;
  path: string;
  checksum: string;
  sql: string;
}

export interface MigrationResult {
  version: number;
  name: string;
  action: 'applied' | 'baselined' | 'already_applied';
  checksum: string;
}

const ADVISORY_LOCK_ID = 77112244;
const migrationsDir = fileURLToPath(new URL('../migrations', import.meta.url));

export function computeChecksum(content: string): string {
  return createHash('sha256').update(content.trim(), 'utf8').digest('hex');
}

export async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter(e => e.isFile() && /^\d+_.+\.sql$/i.test(e.name))
    .map(e => e.name)
    .sort();

  const migrations: MigrationFile[] = [];
  for (const filename of sqlFiles) {
    const match = filename.match(/^(\d+)_(.+)\.sql$/i);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    const filepath = join(migrationsDir, filename);
    const sql = await readFile(filepath, 'utf8');
    const checksum = computeChecksum(sql);
    migrations.push({
      version,
      name: filename,
      path: filepath,
      checksum,
      sql
    });
  }
  return migrations;
}

const REQUIRED_V1_TABLES = ['users', 'sessions', 'applications', 'interviews', 'idempotency_requests'];
const REQUIRED_V1_COLUMNS: Record<string, string[]> = {
  users: ['id', 'email', 'email_normalized', 'password_hash'],
  sessions: ['id', 'user_id', 'expires_at'],
  applications: ['id', 'user_id', 'company', 'position', 'status', 'version'],
  interviews: ['id', 'application_id', 'title', 'at', 'timezone', 'status'],
  idempotency_requests: ['user_id', 'scope', 'key', 'request_hash', 'response_body']
};

export async function inspectDatabaseSchema(client: PoolClient): Promise<{
  isFresh: boolean;
  isV1Compatible: boolean;
  missingTables: string[];
  missingColumns: string[];
}> {
  const tablesRes = await client.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA AND table_type = 'BASE TABLE'`
  );
  const existingTables = new Set(tablesRes.rows.map(r => r.table_name));

  const missingTables = REQUIRED_V1_TABLES.filter(t => !existingTables.has(t));
  if (missingTables.length === REQUIRED_V1_TABLES.length) {
    return { isFresh: true, isV1Compatible: false, missingTables, missingColumns: [] };
  }

  const colsRes = await client.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = CURRENT_SCHEMA`
  );
  const existingCols = new Set(colsRes.rows.map(r => `${r.table_name}.${r.column_name}`));

  const missingColumns: string[] = [];
  for (const [table, cols] of Object.entries(REQUIRED_V1_COLUMNS)) {
    if (existingTables.has(table)) {
      for (const col of cols) {
        if (!existingCols.has(`${table}.${col}`)) {
          missingColumns.push(`${table}.${col}`);
        }
      }
    }
  }

  const isV1Compatible = missingTables.length === 0 && missingColumns.length === 0;
  return { isFresh: false, isV1Compatible, missingTables, missingColumns };
}

export async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await client.query(`
    ALTER TABLE schema_migrations
      ADD COLUMN IF NOT EXISTS name text,
      ADD COLUMN IF NOT EXISTS checksum text
  `);
}

export async function runMigrations(
  poolOrClient: Pool | PoolClient,
  customMigrations?: MigrationFile[]
): Promise<MigrationResult[]> {
  const isPool = poolOrClient instanceof Pool;
  const client = isPool ? await poolOrClient.connect() : poolOrClient;


  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [ADVISORY_LOCK_ID]);
    await ensureMigrationTable(client);

    const migrations = customMigrations || (await loadMigrationFiles());
    if (migrations.length === 0) {
      throw new Error('No migration files found in migrations directory.');
    }

    const appliedRes = await client.query<{ version: number; name: string | null; checksum: string | null }>(
      'SELECT version, name, checksum FROM schema_migrations ORDER BY version ASC'
    );
    const appliedMap = new Map(appliedRes.rows.map(r => [r.version, r]));

    const results: MigrationResult[] = [];

    for (const mig of migrations) {
      const existing = appliedMap.get(mig.version);

      if (existing) {
        if (existing.checksum && existing.checksum !== mig.checksum) {
          throw new Error(
            `Tampered migration detected! Checksum mismatch for migration ${mig.version} (${mig.name}): database has "${existing.checksum}", migration file has "${mig.checksum}". Aborting to prevent data corruption.`
          );
        }
        if (!existing.checksum) {
          await client.query(
            'UPDATE schema_migrations SET name=$1, checksum=$2 WHERE version=$3',
            [mig.name, mig.checksum, mig.version]
          );
        }
        results.push({
          version: mig.version,
          name: mig.name,
          action: 'already_applied',
          checksum: mig.checksum
        });
        continue;
      }

      if (mig.version === 1) {
        const inspection = await inspectDatabaseSchema(client);

        if (!inspection.isFresh) {
          if (inspection.isV1Compatible) {
            await client.query(
              'INSERT INTO schema_migrations(version, name, checksum) VALUES($1, $2, $3)',
              [mig.version, mig.name, mig.checksum]
            );
            results.push({
              version: mig.version,
              name: mig.name,
              action: 'baselined',
              checksum: mig.checksum
            });
            continue;
          } else {
            throw new Error(
              `Incompatible schema detected: database is not fresh and does not match expected v1 schema. Missing tables: [${inspection.missingTables.join(', ')}], missing columns: [${inspection.missingColumns.join(', ')}]. Aborting without resetting database.`
            );
          }
        }
      }

      await client.query(mig.sql);
      await client.query(
        'INSERT INTO schema_migrations(version, name, checksum) VALUES($1, $2, $3)',
        [mig.version, mig.name, mig.checksum]
      );
      results.push({
        version: mig.version,
        name: mig.name,
        action: 'applied',
        checksum: mig.checksum
      });
    }

    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    if (isPool) client.release();
  }
}

export async function checkMigrationReadiness(pool: Pool): Promise<{
  ready: boolean;
  version: number;
  expectedVersion: number;
  reason?: string;
}> {
  try {
    const migrations = await loadMigrationFiles();
    const expectedVersion = migrations.length > 0 ? Math.max(...migrations.map(m => m.version)) : 1;

    const res = await pool.query<{ version: number }>(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );
    if (!res.rowCount) {
      return { ready: false, version: 0, expectedVersion, reason: 'schema_unmigrated' };
    }
    const currentVersion = res.rows[0].version;
    if (currentVersion < expectedVersion) {
      return { ready: false, version: currentVersion, expectedVersion, reason: 'schema_pending' };
    }
    return { ready: true, version: currentVersion, expectedVersion };
  } catch (err) {
    return { ready: false, version: 0, expectedVersion: 1, reason: (err as Error).message };
  }
}
