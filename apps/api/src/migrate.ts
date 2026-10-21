import { Pool } from 'pg';
import { runMigrations } from './migrator.ts';

const isTest = process.env.NODE_ENV === 'test';
const devDatabaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (isTest) {
  if (!testDatabaseUrl) {
    console.error('Error: Set TEST_DATABASE_URL for test environment.');
    process.exit(1);
  }
  if (devDatabaseUrl && testDatabaseUrl === devDatabaseUrl) {
    console.error('Error: TEST_DATABASE_URL must be distinct from development DATABASE_URL.');
    process.exit(1);
  }
}

const databaseUrl = isTest ? testDatabaseUrl : devDatabaseUrl;
if (!databaseUrl) {
  console.error('Error: Set DATABASE_URL before migrating.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 5000
});

try {
  const results = await runMigrations(pool);
  for (const r of results) {
    console.info(`Migration ${r.version} (${r.name}): ${r.action} [checksum: ${r.checksum.slice(0, 12)}...]`);
  }
  console.info('Database schema migration completed successfully.');
} catch (error) {
  console.error('Migration failed:', (error as Error).message);
  process.exit(1);
} finally {
  await pool.end();
}
