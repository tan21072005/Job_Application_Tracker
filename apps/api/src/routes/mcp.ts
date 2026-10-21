import { Router, type Request, type Response } from 'express';
import type { Pool } from 'pg';
import { McpServer, type JsonRpcRequest } from '../../../../packages/jobtrack-mcp/src/mcp-server.ts';
import { resolveGrantIdentity } from '../security/grant-resolver.ts';

export function createMcpRouter(pool: Pool): Router {
  const router = Router();

  async function resolveActor(req: Request): Promise<{ userId: string; clientName: string; scopes: string[] } | null> {
    const identity = await resolveGrantIdentity(pool, req.get('Authorization'));
    if (!identity) return null;
    return { userId: identity.userId, clientName: identity.client, scopes: identity.scopes };
  }

  router.post('/', async (req: Request, res: Response) => {
    const actor = await resolveActor(req);
    if (!actor) {
      return res.status(401).json({
        jsonrpc: '2.0',
        id: (req.body as JsonRpcRequest)?.id || null,
        error: { code: -32001, message: 'Unauthorized: a valid Bearer grant token is required.' }
      });
    }

    const server = new McpServer(pool, actor.userId, actor.clientName, actor.scopes);
    const result = await server.handleRequest(req.body as JsonRpcRequest);
    if (!result) {
      return res.status(204).end();
    }
    return res.json(result);
  });

  return router;
}
