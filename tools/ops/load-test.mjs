#!/usr/bin/env node
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pg = require(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../apps/api/node_modules/pg'));
const { Pool } = pg;

function parseArgs() {
  const args = process.argv.slice(2);
  const getArg = (name, def) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : def;
  };
  return {
    database: getArg('db', process.env.LOAD_TEST_DB || 'jobtrack_restore_test'),
    warmupSec: parseInt(getArg('warmup', '5'), 10),
    durationSec: parseInt(getArg('duration', '30'), 10),
    readRate: 42,   // strictly 42 reads/s as required by PLAN.md
    writeRate: 11   // strictly 11 writes/s as required by PLAN.md
  };
}

function percentile(sortedArr, p) {
  if (!sortedArr.length) return 0;
  const index = Math.ceil((p / 100) * sortedArr.length) - 1;
  return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

export async function runLoadTest(config = parseArgs()) {
  const host = process.env.PGHOST || '127.0.0.1';
  const port = process.env.PGPORT || 5432;
  const user = process.env.PGUSER || 'jobtrack';
  const password = process.env.PGPASSWORD || 'jobtrack_local_dev';

  const connectionString = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(config.database)}`;
  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000
  });

  console.log(`\n================ JOBTRACK LOAD TEST DRILL ================`);
  console.log(`Target Database:  ${config.database}`);
  console.log(`Target Workload:  ${config.readRate} reads/s + ${config.writeRate} writes/s (Total: ${config.readRate + config.writeRate} ops/s)`);
  console.log(`Warmup Duration:  ${config.warmupSec} seconds`);
  console.log(`Measure Duration: ${config.durationSec} seconds`);

  // System Hardware and DB Info
  const vRes = await pool.query('SELECT version()');
  const pgVersion = vRes.rows[0].version;
  const cpus = os.cpus();
  console.log(`\nHardware Environment:`);
  console.log(`  OS:             ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`  CPU:            ${cpus[0]?.model || 'Unknown'} (${cpus.length} logical cores)`);
  console.log(`  Total RAM:      ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`  Free RAM:       ${(os.freemem() / (1024 ** 3)).toFixed(2)} GB`);
  console.log(`  PostgreSQL:     ${pgVersion.split('\n')[0]}`);

  // Seed baseline user for load test queries
  const testUserId = crypto.randomUUID();
  const testEmail = `loadtest-${Date.now()}@test.local`;
  await pool.query(
    'INSERT INTO users(id, email, email_normalized, password_hash) VALUES($1, $2, $3, $4)',
    [testUserId, testEmail, testEmail.toLowerCase(), '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy']
  );

  // Seed a few initial applications for reading
  const initialAppIds = [];
  for (let i = 0; i < 15; i++) {
    const appId = crypto.randomUUID();
    initialAppIds.push(appId);
    await pool.query(
      'INSERT INTO applications(id, user_id, company, position, status, version) VALUES($1, $2, $3, $4, $5, 1)',
      [appId, testUserId, `Company ${i}`, `Engineer ${i}`, i % 2 === 0 ? 'Applied' : 'Interview']
    );
  }

  const readLatencies = [];
  const writeLatencies = [];
  let readSuccess = 0;
  let readErrors = 0;
  let writeSuccess = 0;
  let writeErrors = 0;

  let isMeasuring = false;
  let isRunning = true;

  async function executeRead() {
    const t0 = performance.now();
    try {
      if (Math.random() > 0.5) {
        // Query applications list
        await pool.query(
          'SELECT a.*, (SELECT json_agg(i.*) FROM interviews i WHERE i.application_id=a.id) as interviews FROM applications a WHERE a.user_id=$1 ORDER BY a.created_at DESC LIMIT 20',
          [testUserId]
        );
      } else {
        // Query specific application
        const targetId = initialAppIds[Math.floor(Math.random() * initialAppIds.length)];
        await pool.query('SELECT * FROM applications WHERE id=$1 AND user_id=$2', [targetId, testUserId]);
      }
      const lat = performance.now() - t0;
      if (isMeasuring) {
        readLatencies.push(lat);
        readSuccess++;
      }
    } catch (_err) {
      if (isMeasuring) readErrors++;
    }
  }

  async function executeWrite() {
    const t0 = performance.now();
    try {
      if (Math.random() > 0.4) {
        // Create new application
        const newId = crypto.randomUUID();
        await pool.query(
          'INSERT INTO applications(id, user_id, company, position, status, version) VALUES($1, $2, $3, $4, $5, 1)',
          [newId, testUserId, `Load Co ${Date.now()}`, 'Staff Engineer', 'Applied']
        );
      } else {
        // Update existing application
        const targetId = initialAppIds[Math.floor(Math.random() * initialAppIds.length)];
        await pool.query(
          'UPDATE applications SET notes=$2, version=version+1, updated_at=CURRENT_TIMESTAMP WHERE id=$1',
          [targetId, `Updated at ${new Date().toISOString()}`]
        );
      }
      const lat = performance.now() - t0;
      if (isMeasuring) {
        writeLatencies.push(lat);
        writeSuccess++;
      }
    } catch (_err) {
      if (isMeasuring) writeErrors++;
    }
  }

  // Rate tick: schedule target ops every 100ms
  // At 100ms: reads = 42 * 0.1 = 4.2 ops; writes = 11 * 0.1 = 1.1 ops
  let readAccumulator = 0;
  let writeAccumulator = 0;

  const interval = setInterval(() => {
    if (!isRunning) return;

    readAccumulator += config.readRate * 0.1;
    writeAccumulator += config.writeRate * 0.1;

    while (readAccumulator >= 1) {
      executeRead();
      readAccumulator -= 1;
    }
    while (writeAccumulator >= 1) {
      executeWrite();
      writeAccumulator -= 1;
    }
  }, 100);

  if (config.warmupSec > 0) {
    console.log(`\n[+] Warming up for ${config.warmupSec}s...`);
    await new Promise(r => setTimeout(r, config.warmupSec * 1000));
  }

  console.log(`[+] Warmup complete. Measuring for ${config.durationSec}s...`);
  isMeasuring = true;
  const measureStart = performance.now();

  await new Promise(r => setTimeout(r, config.durationSec * 1000));

  isRunning = false;
  isMeasuring = false;
  clearInterval(interval);

  const measureDurationActual = (performance.now() - measureStart) / 1000;

  // Cleanup seeded data
  await pool.query('DELETE FROM applications WHERE user_id=$1', [testUserId]);
  await pool.query('DELETE FROM users WHERE id=$1', [testUserId]);
  await pool.end();

  // Sort latencies
  readLatencies.sort((a, b) => a - b);
  writeLatencies.sort((a, b) => a - b);

  const totalOps = readSuccess + readErrors + writeSuccess + writeErrors;
  const totalErrors = readErrors + writeErrors;
  const errorRatePct = totalOps > 0 ? (totalErrors / totalOps) * 100 : 0;

  const actualReadThroughput = (readSuccess / measureDurationActual).toFixed(1);
  const actualWriteThroughput = (writeSuccess / measureDurationActual).toFixed(1);

  const readP50 = percentile(readLatencies, 50).toFixed(2);
  const readP90 = percentile(readLatencies, 90).toFixed(2);
  const readP95 = percentile(readLatencies, 95).toFixed(2);
  const readP99 = percentile(readLatencies, 99).toFixed(2);

  const writeP50 = percentile(writeLatencies, 50).toFixed(2);
  const writeP90 = percentile(writeLatencies, 90).toFixed(2);
  const writeP95 = percentile(writeLatencies, 95).toFixed(2);
  const writeP99 = percentile(writeLatencies, 99).toFixed(2);

  // SLA assertions: read p95 < 300ms, write p95 < 500ms, 5xx/error rate < 1%
  const readPass = Number(readP95) < 300;
  const writePass = Number(writeP95) < 500;
  const errorPass = errorRatePct < 1.0;
  const overallPass = readPass && writePass && errorPass;

  console.log(`\n================ LOAD TEST RESULTS ================`);
  console.log(`Actual Duration:    ${measureDurationActual.toFixed(2)}s`);
  console.log(`Read Operations:    ${readSuccess} succeeded (${actualReadThroughput} ops/s) | ${readErrors} failed`);
  console.log(`Write Operations:   ${writeSuccess} succeeded (${actualWriteThroughput} ops/s) | ${writeErrors} failed`);
  console.log(`Error Rate:         ${errorRatePct.toFixed(2)}% (Target: < 1.00%) -> ${errorPass ? 'PASS' : 'FAIL'}`);
  console.log(`\nRead Latencies:`);
  console.log(`  p50:  ${readP50} ms`);
  console.log(`  p90:  ${readP90} ms`);
  console.log(`  p95:  ${readP95} ms (SLA: < 300.00 ms) -> ${readPass ? 'PASS' : 'FAIL'}`);
  console.log(`  p99:  ${readP99} ms`);
  console.log(`\nWrite Latencies:`);
  console.log(`  p50:  ${writeP50} ms`);
  console.log(`  p90:  ${writeP90} ms`);
  console.log(`  p95:  ${writeP95} ms (SLA: < 500.00 ms) -> ${writePass ? 'PASS' : 'FAIL'}`);
  console.log(`  p99:  ${writeP99} ms`);
  console.log(`\nOverall Verdict:    ${overallPass ? 'ALL SLAS PASSED ✓' : 'FAILED ✗'}`);
  console.log(`====================================================\n`);

  if (!overallPass) {
    throw new Error('Load test failed to satisfy performance SLAs');
  }

  return {
    actualDurationSec: measureDurationActual,
    readThroughput: Number(actualReadThroughput),
    writeThroughput: Number(actualWriteThroughput),
    errorRatePct,
    readP95: Number(readP95),
    writeP95: Number(writeP95),
    overallPass
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runLoadTest().catch(err => {
    console.error('Load test drill failed:', err);
    process.exit(1);
  });
}
