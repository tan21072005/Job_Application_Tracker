#!/usr/bin/env node
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { McpServer } from '../src/mcp-server.ts';

const databaseUrl = process.env.DATABASE_URL || 'postgres://jobtrack:jobtrack_local_dev@127.0.0.1:5432/jobtrack';
const pool = new Pool({ connectionString: databaseUrl, max: 4 });

async function resolveUserId(): Promise<{ userId: string; clientName: string }> {
  // 1. Direct explicit environment variable
  if (process.env.JOBTRACK_USER_ID) {
    return {
      userId: process.env.JOBTRACK_USER_ID,
      clientName: process.env.JOBTRACK_CLIENT_NAME || 'mcp'
    };
  }

  // 2. Token grant verification
  if (process.env.JOBTRACK_AUTH_TOKEN) {
    const hash = createHash('sha256').update(process.env.JOBTRACK_AUTH_TOKEN).digest('hex');
    const res = await pool.query(
      'SELECT user_id, client FROM ai_grants WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP',
      [hash]
    );
    if (res.rowCount && res.rows[0]) {
      return {
        userId: res.rows[0].user_id,
        clientName: res.rows[0].client
      };
    }
    process.stderr.write('[jobtrack-mcp] Warning: JOBTRACK_AUTH_TOKEN provided was invalid or expired.\n');
  }

  // 3. Fallback: resolve primary local user
  const userRes = await pool.query('SELECT id, email FROM users ORDER BY created_at ASC LIMIT 1');
  if (userRes.rowCount && userRes.rows[0]) {
    process.stderr.write(`[jobtrack-mcp] Using local user: ${userRes.rows[0].email} (${userRes.rows[0].id})\n`);
    return {
      userId: userRes.rows[0].id,
      clientName: 'local-desktop'
    };
  }

  throw new Error('No user found in JobTrack database. Please register a user or set JOBTRACK_USER_ID.');
}

try {
  const { userId, clientName } = await resolveUserId();
  const server = new McpServer(pool, userId, clientName);
  process.stderr.write(`[jobtrack-mcp] Server active for user ${userId} via ${clientName}. Ready for commands.\n`);
  await server.runStdio();
} catch (err) {
  process.stderr.write(`[jobtrack-mcp] Fatal error: ${String(err)}\n`);
  process.exit(1);
}
