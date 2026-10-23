import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool, type PoolClient } from 'pg';
import {
  runMigrations,
  checkMigrationReadiness,
  loadMigrationFiles,
  computeChecksum,
  type MigrationFile
} from './migrator.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 5 });

async function withCleanSchema<T>(prefix: string, fn: (client: PoolClient, schemaName: string) => Promise<T>): Promise<T> {
  const schemaName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA "${schemaName}"`);
    await client.query(`SET search_path TO "${schemaName}"`);
    return await fn(client, schemaName);
  } finally {
    try {
      await client.query(`SET search_path TO public`);
      await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    } catch {
      // ignore cleanup errors
    }
    client.release();
  }
}

test('migration: fresh install creates tables and records checksum', async () => {
  await withCleanSchema('fresh', async (client) => {
    const results = await runMigrations(client);
    assert.equal(results.length, 7);
    assert.equal(results[0].version, 1);
    assert.equal(results[0].action, 'applied');
    assert.ok(results[0].checksum.length > 20);
    assert.equal(results[1].version, 2);
    assert.equal(results[1].action, 'applied');
    assert.equal(results[2].version, 3);
    assert.equal(results[2].action, 'applied');
    assert.equal(results[3].version, 4);
    assert.equal(results[3].action, 'applied');
    assert.equal(results[4].version, 5);
    assert.equal(results[4].action, 'applied');
    assert.equal(results[5].version, 6);
    assert.equal(results[5].action, 'applied');
    assert.equal(results[6].version, 7);
    assert.equal(results[6].action, 'applied');

    const tables = (await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA AND table_type = 'BASE TABLE'`
    )).rows.map(r => r.table_name);

    assert.ok(tables.includes('users'));
    assert.ok(tables.includes('sessions'));
    assert.ok(tables.includes('applications'));
    assert.ok(tables.includes('interviews'));
    assert.ok(tables.includes('idempotency_requests'));
    assert.ok(tables.includes('rate_limits'));
    assert.ok(tables.includes('ai_grants'));
    assert.ok(tables.includes('ai_commands'));
    assert.ok(tables.includes('ai_runs'));
    assert.ok(tables.includes('job_subscriptions'));
    assert.ok(tables.includes('candidate_profiles'));
    assert.ok(tables.includes('user_memberships'));
    assert.ok(tables.includes('payment_orders'));
    assert.ok(tables.includes('datasets'));
    assert.ok(tables.includes('dataset_records'));
    assert.ok(tables.includes('usage_ledgers'));
    assert.ok(tables.includes('schema_migrations'));

    const rows = (await client.query('SELECT version, name, checksum FROM schema_migrations ORDER BY version ASC')).rows;
    assert.equal(rows.length, 7);
    assert.equal(rows[0].version, 1);
    assert.equal(rows[0].checksum, results[0].checksum);
    assert.equal(rows[1].version, 2);
    assert.equal(rows[1].checksum, results[1].checksum);
    assert.equal(rows[2].version, 3);
    assert.equal(rows[2].checksum, results[2].checksum);
    assert.equal(rows[3].version, 4);
    assert.equal(rows[3].checksum, results[3].checksum);
    assert.equal(rows[4].version, 5);
    assert.equal(rows[4].checksum, results[4].checksum);
    assert.equal(rows[5].version, 6);
    assert.equal(rows[5].checksum, results[5].checksum);
    assert.equal(rows[6].version, 7);
    assert.equal(rows[6].checksum, results[6].checksum);
  });
});

test('migration: repeated migration is idempotent and verifies checksum', async () => {
  await withCleanSchema('repeat', async (client) => {
    const first = await runMigrations(client);
    assert.equal(first[0].action, 'applied');
    assert.equal(first[1].action, 'applied');
    assert.equal(first[2].action, 'applied');
    assert.equal(first[3].action, 'applied');
    assert.equal(first[4].action, 'applied');
    assert.equal(first[5].action, 'applied');
    assert.equal(first[6].action, 'applied');

    const second = await runMigrations(client);
    assert.equal(second.length, 7);
    assert.equal(second[0].version, 1);
    assert.equal(second[0].action, 'already_applied');
    assert.equal(second[0].checksum, first[0].checksum);
    assert.equal(second[1].version, 2);
    assert.equal(second[1].action, 'already_applied');
    assert.equal(second[1].checksum, first[1].checksum);
    assert.equal(second[2].version, 3);
    assert.equal(second[2].action, 'already_applied');
    assert.equal(second[2].checksum, first[2].checksum);
    assert.equal(second[3].version, 4);
    assert.equal(second[3].action, 'already_applied');
    assert.equal(second[3].checksum, first[3].checksum);
    assert.equal(second[4].version, 5);
    assert.equal(second[4].action, 'already_applied');
    assert.equal(second[4].checksum, first[4].checksum);
    assert.equal(second[5].version, 6);
    assert.equal(second[5].action, 'already_applied');
    assert.equal(second[5].checksum, first[5].checksum);
    assert.equal(second[6].version, 7);
    assert.equal(second[6].action, 'already_applied');
    assert.equal(second[6].checksum, first[6].checksum);
  });
});

test('migration: concurrent migrators serialize with advisory lock without error', async () => {
  const schemaName = `concurrent_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  const initClient = await pool.connect();
  await initClient.query(`CREATE SCHEMA "${schemaName}"`);
  initClient.release();

  try {
    const runWorker = async () => {
      const workerClient = await pool.connect();
      try {
        await workerClient.query(`SET search_path TO "${schemaName}"`);
        return await runMigrations(workerClient);
      } finally {
        workerClient.release();
      }
    };

    const [res1, res2] = await Promise.all([runWorker(), runWorker()]);
    const actions = [res1[0].action, res2[0].action].sort();
    assert.deepEqual(actions, ['already_applied', 'applied']);
  } finally {
    const cleanClient = await pool.connect();
    await cleanClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    cleanClient.release();
  }
});

test('migration: tampered migration file throws error and aborts without reset', async () => {
  await withCleanSchema('tamper', async (client) => {
    const standardFiles = await loadMigrationFiles();
    assert.ok(standardFiles.length > 0);

    // Apply valid migration first
    await runMigrations(client, standardFiles);

    // Create a modified/tampered version of migration 1
    const tamperedFiles: MigrationFile[] = [
      {
        ...standardFiles[0],
        sql: standardFiles[0].sql + '\n-- tampered comment',
        checksum: computeChecksum(standardFiles[0].sql + '\n-- tampered comment')
      }
    ];

    await assert.rejects(
      async () => {
        await runMigrations(client, tamperedFiles);
      },
      /Tampered migration detected! Checksum mismatch for migration 1/
    );

    // Verify existing tables are intact (not reset)
    const tables = (await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA AND table_type = 'BASE TABLE'`
    )).rows.map(r => r.table_name);
    assert.ok(tables.includes('users'));
    assert.ok(tables.includes('applications'));
  });
});

test('migration: existing v1 schema without migration record is safely baselined', async () => {
  await withCleanSchema('baseline', async (client) => {
    const standardFiles = await loadMigrationFiles();
    // Execute DDL directly without schema_migrations tracking table
    await client.query(standardFiles[0].sql);

    // Verify schema_migrations does not exist yet
    const preCheck = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA AND table_name = 'schema_migrations'`
    );
    assert.equal(preCheck.rowCount, 0);

    // Now run migrator on existing v1 database
    const results = await runMigrations(client, standardFiles);
    assert.equal(results.length, 7);
    assert.equal(results[0].action, 'baselined');
    assert.equal(results[0].version, 1);
    assert.equal(results[1].action, 'applied');
    assert.equal(results[1].version, 2);
    assert.equal(results[2].action, 'applied');
    assert.equal(results[2].version, 3);
    assert.equal(results[3].action, 'applied');
    assert.equal(results[3].version, 4);
    assert.equal(results[4].action, 'applied');
    assert.equal(results[4].version, 5);
    assert.equal(results[5].action, 'applied');
    assert.equal(results[5].version, 6);
    assert.equal(results[6].action, 'applied');
    assert.equal(results[6].version, 7);

    const rows = (await client.query('SELECT version, name, checksum FROM schema_migrations ORDER BY version ASC')).rows;
    assert.equal(rows.length, 7);
    assert.equal(rows[0].version, 1);
    assert.equal(rows[0].checksum, standardFiles[0].checksum);
    assert.equal(rows[1].version, 2);
    assert.equal(rows[1].checksum, standardFiles[1].checksum);
    assert.equal(rows[2].version, 3);
    assert.equal(rows[2].checksum, standardFiles[2].checksum);
    assert.equal(rows[3].version, 4);
    assert.equal(rows[3].checksum, standardFiles[3].checksum);
    assert.equal(rows[4].version, 5);
    assert.equal(rows[4].checksum, standardFiles[4].checksum);
    assert.equal(rows[5].version, 6);
    assert.equal(rows[5].checksum, standardFiles[5].checksum);
    assert.equal(rows[6].version, 7);
    assert.equal(rows[6].checksum, standardFiles[6].checksum);
  });
});

test('migration: incompatible schema is rejected and NOT reset', async () => {
  await withCleanSchema('incompatible', async (client) => {
    // Create an incompatible schema (e.g. users table missing required columns)
    await client.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        some_arbitrary_column text
      );
    `);

    await assert.rejects(
      async () => {
        await runMigrations(client);
      },
      /Incompatible schema detected/
    );

    // Verify database was NOT reset or dropped
    const checkUsers = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = CURRENT_SCHEMA AND table_name = 'users'`
    );
    assert.equal(checkUsers.rowCount, 1);
  });
});

test('readiness: checkMigrationReadiness reports accurate status', async () => {
  const readiness = await checkMigrationReadiness(pool);
  assert.equal(readiness.ready, true);
  assert.ok(readiness.version >= 1);
  assert.equal(readiness.version, readiness.expectedVersion);
});

test.after(async () => {
  await pool.end();
});
