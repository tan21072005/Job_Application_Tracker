#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const envFile = join(rootDir, '.env');
const backupDir = join(rootDir, 'backups');

console.info('=== JobTrack Local Deployment Setup ===');

// 1. Check Docker Daemon
console.info('[1/4] Checking Docker daemon status...');
const dockerCheck = spawnSync('docker', ['info'], { encoding: 'utf8', windowsHide: true });
if (dockerCheck.status !== 0) {
  console.error('Error: Docker daemon is not running or docker CLI is not on PATH.');
  process.exit(1);
}
console.info('✓ Docker daemon is active.');

// 2. Generate Local Configuration and Secrets if missing
console.info('[2/4] Checking environment configuration (.env)...');
if (!existsSync(envFile)) {
  const jwtSecret = randomBytes(32).toString('hex');
  const pgPassword = randomBytes(24).toString('hex');
  const content = `# JobTrack Local Production Environment Configuration
POSTGRES_DB=jobtrack
POSTGRES_USER=jobtrack
POSTGRES_PASSWORD=${pgPassword}
JWT_SECRET=${jwtSecret}
APP_ORIGIN=http://127.0.0.1:64364
COOKIE_SECURE=false
NODE_ENV=production
`;
  writeFileSync(envFile, content, { encoding: 'utf8', mode: 0o600 });
  console.info('✓ Generated secure local .env configuration (secrets omitted from log).');
} else {
  console.info('✓ Existing .env configuration detected.');
}

// 3. Port Occupancy Check (Port 64364)
console.info('[3/4] Verifying port 64364 availability...');
async function checkPortAvailable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', (err) => {
      resolve(err.code !== 'EADDRINUSE');
    });
    s.once('listening', () => {
      s.close(() => resolve(true));
    });
    s.listen(port, host);
  });
}

const isPortFree = await checkPortAvailable(64364);
if (!isPortFree) {
  console.warn('⚠️ Warning: Port 127.0.0.1:64364 is currently occupied.');
  console.warn('Please terminate the process listening on port 64364 before starting the web container.');
} else {
  console.info('✓ Port 127.0.0.1:64364 is available.');
}

// 4. Existing JobTrack Container Detection & Safe Backup
console.info('[4/4] Inspecting existing JobTrack Docker resources...');
const psResult = spawnSync('docker', ['ps', '-a', '--filter', 'name=jobtrack', '--format', '{{.Names}}|{{.Status}}'], { encoding: 'utf8' });
const lines = (psResult.stdout || '').split(/\r?\n/).filter(Boolean);

let runningDevContainer = null;
for (const line of lines) {
  const [name, status] = line.split('|');
  if (name === 'jobtrack-postgres-dev' && status.toLowerCase().startsWith('up')) {
    runningDevContainer = name;
  }
}

if (runningDevContainer) {
  console.info(`Found running development container: "${runningDevContainer}".`);
  console.info('Creating safety backup of database before handoff...');
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const backupFile = join(backupDir, `jobtrack-backup-${Date.now()}.sql`);
  const dump = spawnSync('docker', ['exec', runningDevContainer, 'pg_dump', '-U', 'jobtrack', 'jobtrack'], {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024
  });

  if (dump.status === 0 && dump.stdout) {
    writeFileSync(backupFile, dump.stdout, 'utf8');
    console.info(`✓ Safety backup preserved at: ${backupFile}`);
  } else {
    console.warn('⚠️ Note: Database dump skipped or database was empty.');
  }

  console.info(`Stopping "${runningDevContainer}" to avoid concurrent volume access...`);
  spawnSync('docker', ['stop', runningDevContainer], { stdio: 'inherit' });
  console.info(`✓ Safely stopped "${runningDevContainer}".`);
} else {
  console.info('✓ No conflicting JobTrack database containers running.');
}

console.info('\n=== Setup Complete ===');
console.info('To start JobTrack:');
console.info('  npm run docker:up');
console.info('To check status:');
console.info('  npm run docker:status');
console.info('To stop JobTrack:');
console.info('  npm run docker:down\n');
