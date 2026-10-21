import { Router, type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { McpServer, type JsonRpcRequest } from '../../../../packages/jobtrack-mcp/src/mcp-server.ts';

export function createMcpRouter(pool: Pool): Router {
  const router = Router();

  async function resolveActor(req: Request): Promise<{ userId: string; clientName: string } | null> {
    // 1. Session auth if present
    const sessionReq = req as unknown as { userId?: string };
    if (sessionReq.userId) {
      return { userId: sessionReq.userId, clientName: 'web-session' };
    }

    // 2. Bearer token auth via ai_grants
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      const hash = createHash('sha256').update(token).digest('hex');
      const r = await pool.query(
        'SELECT user_id, client FROM ai_grants WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP',
        [hash]
      );
      if (r.rowCount && r.rows[0]) {
        return { userId: r.rows[0].user_id, clientName: r.rows[0].client };
      }
    }

    return null;
  }

  router.post('/', async (req: Request, res: Response) => {
    const actor = await resolveActor(req);
    if (!actor) {
      return res.status(401).json({
        jsonrpc: '2.0',
        id: (req.body as JsonRpcRequest)?.id || null,
        error: { code: -32001, message: 'Unauthorized: valid session cookie or Bearer grant token required.' }
      });
    }

    const server = new McpServer(pool, actor.userId, actor.clientName);
    const result = await server.handleRequest(req.body as JsonRpcRequest);
    if (!result) {
      return res.status(204).end();
    }
    return res.json(result);
  });

  return router;
}
