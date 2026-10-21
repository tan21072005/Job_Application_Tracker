#!/usr/bin/env node
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createBackup } from './backup.mjs';
import { restoreDrill } from './restore.mjs';

const require = createRequire(import.meta.url);
const pg = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/api/node_modules/pg'));
const { Pool } = pg;

export async function runRollbackDrill(options = {}) {
  const targetDb = options.targetDatabase || process.env.ROLLBACK_TARGET_DB || 'jobtrack_restore_test';
  const host = process.env.PGHOST || '127.0.0.1';
  const port = process.env.PGPORT || 5432;
  const user = process.env.PGUSER || 'jobtrack';
  const password = process.env.PGPASSWORD || 'jobtrack_local_dev';

  console.log(`\n================ ROLLBACK DRILL ================`);
  console.log(`Target Database: ${targetDb}`);

  const connStr = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(targetDb)}`;
  const pool = new Pool({ connectionString: connStr });

  try {
    // 1. Record baseline schema version and insert canary record
    const baseMig = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    const baselineVersion = baseMig.rows[0]?.version || 'unversioned';
    console.log(`[1] Baseline schema version: ${baselineVersion}`);

    const canaryUserId = crypto.randomUUID();
    const canaryEmail = `canary-${Date.now()}@test.local`;
    await pool.query(
      'INSERT INTO users(id, email, email_normalized, password_hash) VALUES($1, $2, $3, $4)',
      [canaryUserId, canaryEmail, canaryEmail.toLowerCase(), '$argon2id$v=19$dummy$hash']
    );
    const canaryAppId = crypto.randomUUID();
    await pool.query(
      'INSERT INTO applications(id, user_id, company, position, status, version) VALUES($1, $2, $3, $4, $5, 1)',
      [canaryAppId, canaryUserId, 'Pre-Rollback Canary Corp', 'Principal Architect', 'Applied']
    );
    console.log(`[2] Seeded canary pre-deployment records (App: ${canaryAppId})`);

    // 2. Create pre-deployment backup
    console.log(`[3] Creating pre-deployment AES-256-GCM backup snapshot...`);
    const { manifest, dumpPath } = await createBackup({ database: targetDb });

    // 3. Simulate failed migration or deployment fault
    console.log(`[4] Simulating faulty deployment transaction...`);
    let faultCaught = false;
    try {
      await pool.query('BEGIN');
      // Attempt an invalid table alteration that violates schema constraints
      await pool.query('ALTER TABLE applications ADD COLUMN canary_test_bad_col VARCHAR(10) NOT NULL');
      // Intentionally insert violating data that causes failure
      await pool.query('INSERT INTO applications(id, user_id, company, position, status, version, canary_test_bad_col) VALUES($1, $2, $3, $4, $5, 1, $6)', [
        crypto.randomUUID(),
        canaryUserId,
        'Invalid Co',
        'Dev',
        'Applied',
        'OVERLY_LONG_STRING_EXCEEDING_TEN_CHARS'
      ]);
      await pool.query('COMMIT');
    } catch (err) {
      faultCaught = true;
      await pool.query('ROLLBACK');
      console.log(`    Caught simulated deployment error: ${err.message}`);
      console.log(`    Transaction successfully rolled back!`);
    }

    if (!faultCaught) {
      throw new Error('Simulated deployment fault failed to trigger rollback');
    }

    // 4. Verify baseline intact after transaction rollback
    const postRollbackCol = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='applications' AND column_name='canary_test_bad_col'"
    );
    if (postRollbackCol.rowCount !== 0) {
      throw new Error('Faulty column survived transaction rollback');
    }
    console.log(`✓ Database transaction rollback verified: schema remains pristine.`);

    // 5. Test disaster recovery: restore from pre-deployment snapshot
    console.log(`[5] Executing point-in-time recovery from pre-deployment backup snapshot...`);
    const restoreReport = await restoreDrill({
      targetDatabase: targetDb,
      dumpPath,
      manifestPath: dumpPath.replace('.dump.enc', '.manifest.json')
    });

    if (restoreReport.status !== 'success') {
      throw new Error('Restore drill failed during rollback verification');
    }

    // 6. Verify canary record presence after restore
    const checkCanary = await pool.query('SELECT * FROM applications WHERE id=$1', [canaryAppId]);
    if (checkCanary.rowCount !== 1) {
      throw new Error('Canary record missing after restore!');
    }
    console.log(`✓ Canary record verified intact after full snapshot restore.`);

    // Cleanup canary
    await pool.query('DELETE FROM applications WHERE id=$1', [canaryAppId]);
    await pool.query('DELETE FROM users WHERE id=$1', [canaryUserId]);

    console.log(`\n================ ROLLBACK DRILL RESULT: SUCCESS ✓ ================`);
    console.log(`Pre-deployment snapshot: ${manifest.id}`);
    console.log(`Transaction rollback:   VERIFIED`);
    console.log(`Snapshot restore:       VERIFIED (${restoreReport.restoreDurationSeconds}s)`);
    console.log(`Data & schema integrity: PRESERVED`);
    console.log(`==================================================================\n`);

    return { success: true };
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runRollbackDrill().catch(err => {
    console.error('Rollback drill failed:', err);
    process.exit(1);
  });
}
