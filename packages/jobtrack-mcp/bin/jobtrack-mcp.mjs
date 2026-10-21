#!/usr/bin/env node
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
import { McpServer } from '../src/mcp-server.ts';

const databaseUrl = process.env.DATABASE_URL || 'postgres://jobtrack:jobtrack_local_dev@127.0.0.1:5432/jobtrack';
const pool = new Pool({ connectionString: databaseUrl, max: 4 });

async function resolveUserId(): Promise<{ userId: string; clientName: string; scopes: string[] }> {
  // 1. Direct explicit environment variable
  if (process.env.JOBTRACK_USER_ID) {
    return {
      userId: process.env.JOBTRACK_USER_ID,
      clientName: process.env.JOBTRACK_CLIENT_NAME || 'mcp',
      scopes: (process.env.JOBTRACK_SCOPES || 'mcp:read,mcp:write').split(',').map(scope => scope.trim()).filter(Boolean)
    };
  }

  // 2. Token grant verification
  if (process.env.JOBTRACK_AUTH_TOKEN) {
    const hash = createHash('sha256').update(process.env.JOBTRACK_AUTH_TOKEN).digest('hex');
    const res = await pool.query(
      'SELECT user_id, client, scopes FROM ai_grants WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP',
      [hash]
    );
    if (res.rowCount && res.rows[0]) {
      return {
        userId: res.rows[0].user_id,
        clientName: res.rows[0].client,
        scopes: res.rows[0].scopes && res.rows[0].scopes.length ? res.rows[0].scopes : ['mcp:read', 'mcp:write']
      };
    }
    process.stderr.write('[jobtrack-mcp] JOBTRACK_AUTH_TOKEN provided was invalid or expired.\n');
    throw new Error('The provided JobTrack grant token is invalid or expired.');
  }

  throw new Error('No JobTrack identity: set JOBTRACK_USER_ID or JOBTRACK_AUTH_TOKEN.');
}

try {
  const { userId, clientName, scopes } = await resolveUserId();
  const server = new McpServer(pool, userId, clientName, scopes);
  process.stderr.write(`[jobtrack-mcp] Server active for user ${userId} via ${clientName} with scopes ${scopes.join(', ')}. Ready for commands.\n`);
  await server.runStdio();
} catch (err) {
  process.stderr.write(`[jobtrack-mcp] Fatal error: ${String(err)}\n`);
  process.exit(1);
}
