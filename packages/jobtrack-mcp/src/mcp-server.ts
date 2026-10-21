import { createInterface } from 'node:readline';
import type { Pool } from 'pg';
import { JobTrackService, DomainError } from '../../../apps/api/src/services/jobtrack-service.ts';
import { TOOLS, executeTool } from './tools.ts';

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export class McpServer {
  private service: JobTrackService;
  private pool: Pool;
  private userId: string;
  private clientName: string;

  constructor(pool: Pool, userId: string, clientName = 'mcp') {
    this.pool = pool;
    this.userId = userId;
    this.clientName = clientName;
    this.service = new JobTrackService(pool);
  }

  public async handleRequest(req: JsonRpcRequest): Promise<JsonRpcResponse | null> {
    const id = req.id !== undefined ? req.id : null;

    if (!req.method) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request: missing method' }
      };
    }

    // Notifications have no id and expect no response
    const isNotification = req.id === undefined;

    switch (req.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false
              }
            },
            serverInfo: {
              name: 'jobtrack-mcp',
              version: '1.0.0'
            }
          }
        };
      }

      case 'notifications/initialized':
      case 'initialized': {
        return null; // Acknowledged
      }

      case 'ping': {
        return { jsonrpc: '2.0', id, result: {} };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        };
      }

      case 'tools/call': {
        const params = req.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return {
            jsonrpc: '2.0',
            id,
            error: { code: -32602, message: 'Invalid params: tool name required' }
          };
        }

        try {
          const res = await executeTool(
            this.service,
            this.pool,
            this.userId,
            this.clientName,
            toolName,
            toolArgs
          );

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(res, null, 2)
                }
              ]
            }
          };
        } catch (err: unknown) {
          const message = (err as Error).message || 'Execution failed';
          const code = err instanceof DomainError ? err.status : -32603;

          return {
            jsonrpc: '2.0',
            id,
            result: {
              isError: true,
              content: [
                {
                  type: 'text',
                  text: `Lỗi thực thi: ${message}`
                }
              ]
            }
          };
        }
      }

      default: {
        if (isNotification) return null;
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method not found: ${req.method}` }
        };
      }
    }
  }

  public async runStdio(): Promise<void> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line.trim()) as JsonRpcRequest;
        const resp = await this.handleRequest(req);
        if (resp) {
          process.stdout.write(JSON.stringify(resp) + '\n');
        }
      } catch (err) {
        process.stderr.write(`[jobtrack-mcp] Error parsing JSON-RPC: ${String(err)}\n`);
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error' }
          }) + '\n'
        );
      }
    }
  }
}
