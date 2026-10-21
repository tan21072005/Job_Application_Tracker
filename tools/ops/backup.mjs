#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/api/node_modules/pg'));
const { Pool } = pg;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const backupsDir = path.join(rootDir, 'backups');
fs.mkdirSync(backupsDir, { recursive: true });

function findPgDump() {
  const commonPaths = [
    'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
    'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe'
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'pg_dump';
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
  const generated = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, generated.toString('hex'), { mode: 0o600 });
  console.log(`Generated new AES-256-GCM backup key at ${keyFile}`);
  return generated;
}

export async function createBackup(options = {}) {
  const dbName = options.database || process.env.DATABASE_NAME || 'jobtrack';
  const host = options.host || process.env.PGHOST || '127.0.0.1';
  const port = options.port || process.env.PGPORT || 5432;
  const user = options.user || process.env.PGUSER || 'jobtrack';
  const password = options.password || process.env.PGPASSWORD || 'jobtrack_local_dev';

  const connectionString = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(dbName)}`;
  const pool = new Pool({ connectionString });

  let pgVersion = '';
  let schemaVersion = '';
  const tableCounts = {};

  try {
    const vRes = await pool.query('SELECT version()');
    pgVersion = vRes.rows[0].version;

    const mRes = await pool.query('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').catch(() => ({ rows: [] }));
    schemaVersion = mRes.rows[0]?.version || '00000000000000_unversioned';

    const tables = ['users', 'sessions', 'applications', 'interviews', 'idempotency_requests'];
    for (const t of tables) {
      const cRes = await pool.query(`SELECT count(*)::int as count FROM ${t}`).catch(() => ({ rows: [{ count: 0 }] }));
      tableCounts[t] = cRes.rows[0].count;
    }
  } finally {
    await pool.end();
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempDump = path.join(backupsDir, `temp-${timestamp}.dump`);
  const finalEncDump = path.join(backupsDir, `backup-${timestamp}.dump.enc`);
  const finalManifest = path.join(backupsDir, `backup-${timestamp}.manifest.json`);

  const pgDumpExe = findPgDump();
  console.log(`Running pg_dump via ${pgDumpExe} for database ${dbName}...`);

  const dumpResult = spawnSync(pgDumpExe, [
    '-h', String(host),
    '-p', String(port),
    '-U', String(user),
    '-d', String(dbName),
    '-Fc',
    '-f', tempDump
  ], {
    env: { ...process.env, PGPASSWORD: password },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (dumpResult.status !== 0) {
    const err = dumpResult.stderr.toString('utf8');
    if (fs.existsSync(tempDump)) fs.unlinkSync(tempDump);
    throw new Error(`pg_dump failed with code ${dumpResult.status}: ${err}`);
  }

  const rawBytes = fs.readFileSync(tempDump);
  const rawSha256 = crypto.createHash('sha256').update(rawBytes).digest('hex');

  // Encrypt with AES-256-GCM
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(rawBytes), cipher.final()]);
  const authTag = cipher.getAuthTag();

  fs.writeFileSync(finalEncDump, encrypted);
  fs.unlinkSync(tempDump);

  const encSha256 = crypto.createHash('sha256').update(encrypted).digest('hex');

  const manifest = {
    id: `backup-${timestamp}`,
    createdAt: new Date().toISOString(),
    database: dbName,
    postgresVersion: pgVersion,
    schemaVersion,
    tableCounts,
    rawSha256,
    encryptedSha256: encSha256,
    encryptedSizeBytes: encrypted.length,
    encryption: {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    }
  };

  fs.writeFileSync(finalManifest, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Backup completed successfully:`);
  console.log(`  Archive:  ${finalEncDump} (${(encrypted.length / 1024).toFixed(1)} KB)`);
  console.log(`  Manifest: ${finalManifest}`);
  console.log(`  Raw SHA-256: ${rawSha256}`);
  console.log(`  Enc SHA-256: ${encSha256}`);
  console.log(`  Schema:   ${schemaVersion}`);
  console.log(`  Tables:   ${JSON.stringify(tableCounts)}`);

  pruneBackups();
  return { manifest, dumpPath: finalEncDump };
}

export function pruneBackups() {
  const manifests = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.manifest.json'))
    .map(f => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(backupsDir, f), 'utf8'));
        return { file: f, manifest: content, date: new Date(content.createdAt) };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  // Policy: keep 7 daily and 4 weekly backups
  const keep = new Set();
  const dailyDates = new Set();
  const weeklyWeeks = new Set();

  for (const item of manifests) {
    const dayStr = item.date.toISOString().slice(0, 10);
    // Weekly representation: Year-W<weekNumber>
    const d = new Date(Date.UTC(item.date.getFullYear(), item.date.getMonth(), item.date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekStr = `${d.getUTCFullYear()}-W${weekNo}`;

    if (dailyDates.size < 7 && !dailyDates.has(dayStr)) {
      dailyDates.add(dayStr);
      keep.add(item.file);
    }
    if (weeklyWeeks.size < 4 && !weeklyWeeks.has(weekStr)) {
      weeklyWeeks.add(weekStr);
      keep.add(item.file);
    }
  }

  let prunedCount = 0;
  for (const item of manifests) {
    if (!keep.has(item.file)) {
      const manifestPath = path.join(backupsDir, item.file);
      const dumpPath = path.join(backupsDir, item.file.replace('.manifest.json', '.dump.enc'));
      if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
      if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath);
      prunedCount++;
    }
  }

  console.log(`Retention check: retained ${keep.size} backups, pruned ${prunedCount} expired backups.`);
}

export function listBackups() {
  const manifests = fs.readdirSync(backupsDir)
    .filter(f => f.endsWith('.manifest.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(backupsDir, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  console.log(`\nAvailable backups (${manifests.length}):`);
  for (const m of manifests) {
    console.log(`- ${m.id} | Created: ${m.createdAt} | Size: ${(m.encryptedSizeBytes / 1024).toFixed(1)} KB | DB: ${m.database} | Schema: ${m.schemaVersion}`);
  }
  return manifests;
}

export function getBackupStatus() {
  const manifests = listBackups();
  console.log(`\n================ BACKUP SUBSYSTEM STATUS ================`);
  console.log(`Backup Directory:   ${backupsDir}`);
  console.log(`Total Backups:      ${manifests.length}`);
  console.log(`Retention Policy:   7 Daily + 4 Weekly`);

  if (!manifests.length) {
    console.log(`Latest Backup:      NONE (RPO at risk)`);
    console.log(`=========================================================\n`);
    return { ok: false, count: 0, latest: null };
  }

  const latest = manifests[0];
  const ageHours = ((Date.now() - new Date(latest.createdAt).getTime()) / (1000 * 3600)).toFixed(1);
  const rpoSatisfied = Number(ageHours) <= 24;

  console.log(`Latest Backup ID:   ${latest.id}`);
  console.log(`Latest Created At:  ${latest.createdAt} (${ageHours} hours ago)`);
  console.log(`Latest DB Name:     ${latest.database}`);
  console.log(`Latest Schema Ver:  ${latest.schemaVersion}`);
  console.log(`Latest Size:        ${(latest.encryptedSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`Encryption:         ${latest.encryption.algorithm}`);
  console.log(`RPO Status (<=24h): ${rpoSatisfied ? 'SATISFIED ✓' : 'EXPIRED / AT RISK ✗'}`);
  console.log(`=========================================================\n`);

  return { ok: true, count: manifests.length, latest, ageHours: Number(ageHours), rpoSatisfied };
}

export function startBackupSchedule(intervalHours = 24) {
  console.log(`Starting JobTrack automated backup scheduler (interval: ${intervalHours} hours)...`);
  console.log(`Note: automated backup operates while stack is running. When machine is offline, RPO is limited to last successful run.`);

  createBackup().catch(err => console.error('Initial scheduled backup failed:', err));

  const timer = setInterval(() => {
    console.log(`\n[${new Date().toISOString()}] Triggering scheduled periodic backup...`);
    createBackup().catch(err => console.error('Periodic backup failed:', err));
  }, intervalHours * 3600 * 1000);

  return timer;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const cmd = process.argv[2] || 'create';
  if (cmd === 'create') {
    const dbArgIdx = process.argv.indexOf('--db');
    const database = dbArgIdx !== -1 ? process.argv[dbArgIdx + 1] : undefined;
    createBackup({ database }).catch(err => {
      console.error(err);
      process.exit(1);
    });
  } else if (cmd === 'list') {
    listBackups();
  } else if (cmd === 'prune') {
    pruneBackups();
  } else if (cmd === 'status') {
    getBackupStatus();
  } else if (cmd === 'schedule') {
    startBackupSchedule();
  }
}

