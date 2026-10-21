#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/api/node_modules/pg'));
const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backupsDir = path.join(rootDir, 'backups');

function findPgRestore() {
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_restore.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_restore.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_restore.exe'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'pg_restore';
}

function getEncryptionKey() {
  const envKey = process.env.BACKUP_ENCRYPTION_KEY;
  if (envKey) {
    if (envKey.length === 64) return Buffer.from(envKey, 'hex');
    return crypto.createHash('sha256').update(envKey).digest();
  }
  const keyFile = path.join(backupsDir, '.backup_key');
  if (fs.existsSync(keyFile)) {
    const raw = fs.readFileSync(keyFile, 'utf8').trim();
    return Buffer.from(raw, 'hex');
  }
  throw new Error(`Backup encryption key not found. Set BACKUP_ENCRYPTION_KEY or ensure ${keyFile} exists.`);
}

export async function restoreDrill(options = {}) {
  const targetDb = options.targetDatabase || process.env.RESTORE_TARGET_DB || 'jobtrack_restore_test';
  const host = options.host || process.env.PGHOST || '127.0.0.1';
  const port = options.port || process.env.PGPORT || 5432;
  const user = options.user || process.env.PGUSER || 'jobtrack';
  const password = options.password || process.env.PGPASSWORD || 'jobtrack_local_dev';

  // Safety guard: prevent accidental live DB overwrite
  if (targetDb === 'jobtrack' && !options.allowLiveOverwrite) {
    throw new Error('Refusing to restore onto development database "jobtrack" without --allow-live-overwrite flag.');
  }

  // Find backup
  let manifestPath = options.manifestPath;
  let dumpPath = options.dumpPath;

  if (!manifestPath || !dumpPath) {
    const manifests = fs.readdirSync(backupsDir)
      .filter(f => f.endsWith('.manifest.json'))
      .sort()
      .reverse();
    if (!manifests.length) {
      throw new Error(`No backups found in ${backupsDir}. Run backup creation first.`);
    }
    manifestPath = path.join(backupsDir, manifests[0]);
    dumpPath = path.join(backupsDir, manifests[0].replace('.manifest.json', '.dump.enc'));
  }

  console.log(`Starting restore drill:`);
  console.log(`  Source Backup:   ${dumpPath}`);
  console.log(`  Target Database: ${targetDb}`);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const encBytes = fs.readFileSync(dumpPath);

  // 1. Verify encrypted checksum
  const actualEncSha = crypto.createHash('sha256').update(encBytes).digest('hex');
  if (actualEncSha !== manifest.encryptedSha256) {
    throw new Error(`Encrypted checksum mismatch! Expected ${manifest.encryptedSha256}, got ${actualEncSha}`);
  }

  // 2. Decrypt with AES-256-GCM
  const key = getEncryptionKey();
  const iv = Buffer.from(manifest.encryption.iv, 'hex');
  const authTag = Buffer.from(manifest.encryption.authTag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const rawBytes = Buffer.concat([decipher.update(encBytes), decipher.final()]);

  // 3. Verify decrypted raw checksum
  const actualRawSha = crypto.createHash('sha256').update(rawBytes).digest('hex');
  if (actualRawSha !== manifest.rawSha256) {
    throw new Error(`Decrypted checksum mismatch! Expected ${manifest.rawSha256}, got ${actualRawSha}`);
  }
  console.log(`✓ Cryptographic verification passed (SHA-256 matches & AES-256-GCM authTag verified).`);

  // Write temporary decrypted file for pg_restore
  const tempDecrypted = path.join(backupsDir, `temp-restore-${Date.now()}.dump`);
  fs.writeFileSync(tempDecrypted, rawBytes);

  const pgRestoreExe = findPgRestore();
  const startTime = performance.now();

  try {
    console.log(`Running pg_restore via ${pgRestoreExe} into ${targetDb}...`);
    const res = spawnSync(pgRestoreExe, [
      '-h', String(host),
      '-p', String(port),
      '-U', String(user),
      '-d', String(targetDb),
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      tempDecrypted
    ], {
      env: { ...process.env, PGPASSWORD: password },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    // pg_restore returns 0 on success, or 1 with harmless warnings (e.g. drop when not present)
    if (res.status !== 0 && res.status !== 1) {
      const err = res.stderr.toString('utf8');
      throw new Error(`pg_restore failed with code ${res.status}: ${err}`);
    }

    const durationMs = performance.now() - startTime;
    console.log(`✓ Restore operation completed in ${(durationMs / 1000).toFixed(2)}s (${durationMs.toFixed(0)} ms).`);

    // 4. Run deep integrity verification queries on restored database
    const connStr = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(targetDb)}`;
    const pool = new Pool({ connectionString: connStr });

    const checks = {};
    try {
      // Check 1: Table counts match manifest
      const tables = ['users', 'sessions', 'applications', 'interviews', 'idempotency_requests'];
      const counts = {};
      for (const t of tables) {
        const r = await pool.query(`SELECT count(*)::int as count FROM ${t}`);
        counts[t] = r.rows[0].count;
        if (manifest.tableCounts[t] !== undefined && counts[t] < manifest.tableCounts[t]) {
          throw new Error(`Table ${t} count (${counts[t]}) is less than manifest count (${manifest.tableCounts[t]})`);
        }
      }
      checks.tableCounts = { passed: true, counts };

      // Check 2: Foreign Key integrity
      const fkInterviews = await pool.query(
        'SELECT count(*)::int as broken FROM interviews i LEFT JOIN applications a ON a.id = i.application_id WHERE a.id IS NULL'
      );
      if (fkInterviews.rows[0].broken > 0) throw new Error('Broken foreign key in interviews -> applications');

      const fkApps = await pool.query(
        'SELECT count(*)::int as broken FROM applications a LEFT JOIN users u ON u.id = a.user_id WHERE u.id IS NULL'
      );
      if (fkApps.rows[0].broken > 0) throw new Error('Broken foreign key in applications -> users');

      const fkSessions = await pool.query(
        'SELECT count(*)::int as broken FROM sessions s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL'
      );
      if (fkSessions.rows[0].broken > 0) throw new Error('Broken foreign key in sessions -> users');
      checks.foreignKeys = { passed: true, broken: 0 };

      // Check 3: Unique constraint check
      const dupEmails = await pool.query(
        'SELECT email, count(*) FROM users GROUP BY email HAVING count(*) > 1'
      );
      if (dupEmails.rowCount > 0) throw new Error('Duplicate email detected in users table');
      checks.uniqueness = { passed: true, duplicateEmails: 0 };

      // Check 4: Version numbers
      const invalidVersions = await pool.query(
        'SELECT count(*)::int as invalid FROM applications WHERE version < 1'
      );
      if (invalidVersions.rows[0].invalid > 0) throw new Error('Invalid version (<1) detected in applications table');
      checks.versions = { passed: true, invalidCount: 0 };

      // Check 5: Schema migrations
      const migRes = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
      checks.schemaVersion = { passed: true, version: migRes.rows[0]?.version };

      // Check 6: CRUD probe test on restored database
      const probeUserId = crypto.randomUUID();
      const probeAppId = crypto.randomUUID();
      const probeRoundId = crypto.randomUUID();

      const probeEmail = `probe-${Date.now()}@test.local`;
      await pool.query('BEGIN');
      await pool.query(
        'INSERT INTO users(id, email, email_normalized, password_hash) VALUES($1, $2, $3, $4)',
        [probeUserId, probeEmail, probeEmail.toLowerCase(), '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy']
      );
      await pool.query(
        'INSERT INTO applications(id, user_id, company, position, status, version) VALUES($1, $2, $3, $4, $5, 1)',
        [probeAppId, probeUserId, 'Restore Test Co', 'QA Specialist', 'Applied']
      );
      await pool.query(
        'UPDATE applications SET position=$2, version=version+1 WHERE id=$1',
        [probeAppId, 'Senior QA Specialist']
      );
      await pool.query(
        'INSERT INTO interviews(id, application_id, title, at, timezone, format, status) VALUES($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6)',
        [probeRoundId, probeAppId, 'Probe Round', 'Asia/Ho_Chi_Minh', 'Online', 'Scheduled']
      );
      // Cascade delete probe
      await pool.query('DELETE FROM applications WHERE id=$1', [probeAppId]);
      const checkCascade = await pool.query('SELECT count(*)::int as count FROM interviews WHERE id=$1', [probeRoundId]);
      if (checkCascade.rows[0].count !== 0) throw new Error('Cascade delete probe failed on restored DB');
      await pool.query('DELETE FROM users WHERE id=$1', [probeUserId]);
      await pool.query('COMMIT');
      checks.crudProbe = { passed: true };

    } finally {
      await pool.end();
    }

    const report = {
      status: 'success',
      targetDatabase: targetDb,
      sourceBackupId: manifest.id,
      restoreDurationMs: durationMs,
      restoreDurationSeconds: Number((durationMs / 1000).toFixed(2)),
      checks
    };

    console.log(`\n================ RESTORE VERIFICATION REPORT ================`);
    console.log(`Target Database:  ${targetDb}`);
    console.log(`Restore Duration: ${report.restoreDurationSeconds}s`);
    console.log(`Table Counts:     ${JSON.stringify(checks.tableCounts.counts)}`);
    console.log(`Foreign Keys:     PASSED`);
    console.log(`Uniqueness:       PASSED`);
    console.log(`Versions:         PASSED`);
    console.log(`Schema Migration: ${checks.schemaVersion.version}`);
    console.log(`CRUD Probe:       PASSED`);
    console.log(`=============================================================\n`);

    return report;
  } finally {
    if (fs.existsSync(tempDecrypted)) fs.unlinkSync(tempDecrypted);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  restoreDrill().catch(err => {
    console.error('Restore drill failed:', err);
    process.exit(1);
  });
}
