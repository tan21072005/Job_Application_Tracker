import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import type {
  ChatMessageDTO,
  ChatActionReceiptDTO,
  ChatMessageSender,
  ChatProvenance
} from '@jobtrack/contract';

export interface SaveChatMessageInput {
  id?: string;
  sender: ChatMessageSender;
  message: string;
  receipts?: ChatActionReceiptDTO[];
  provenance?: ChatProvenance;
  createdAt?: string;
}

export class ChatService {
  private pool: Pool;
  private migrationDone = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async ensureSchema(): Promise<void> {
    if (this.migrationDone) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        session_id VARCHAR(120) NOT NULL,
        sender VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        receipts JSONB NOT NULL DEFAULT '[]'::jsonb,
        provenance VARCHAR(30) NOT NULL DEFAULT 'local_fallback',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS chat_messages_user_session_idx
        ON chat_messages (user_id, session_id, created_at ASC);
    `);
    this.migrationDone = true;
  }

  async saveMessage(
    userId: string,
    sessionId: string,
    input: SaveChatMessageInput
  ): Promise<ChatMessageDTO> {
    await this.ensureSchema();
    const id = input.id || `msg-${randomUUID()}`;
    const createdAt = input.createdAt || new Date().toISOString();
    const receipts = input.receipts || [];
    const provenance = input.provenance || 'local_fallback';

    await this.pool.query(
      `INSERT INTO chat_messages (id, user_id, session_id, sender, message, receipts, provenance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::timestamptz)`,
      [
        id,
        userId,
        sessionId,
        input.sender,
        input.message,
        JSON.stringify(receipts),
        provenance,
        createdAt
      ]
    );

    return {
      id,
      sender: input.sender,
      message: input.message,
      receipts,
      provenance,
      createdAt
    };
  }

  async getHistory(
    userId: string,
    sessionId: string,
    limit = 50
  ): Promise<ChatMessageDTO[]> {
    await this.ensureSchema();
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const res = await this.pool.query(
      `SELECT id, sender, message, receipts, provenance, created_at AS "createdAt"
       FROM chat_messages
       WHERE user_id = $1 AND session_id = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [userId, sessionId, safeLimit]
    );

    return res.rows.map((row) => ({
      id: row.id,
      sender: row.sender as ChatMessageSender,
      message: row.message,
      receipts: (row.receipts || []) as ChatActionReceiptDTO[],
      provenance: (row.provenance || 'local_fallback') as ChatProvenance,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt)
    }));
  }

  async clearHistory(userId: string, sessionId: string): Promise<number> {
    await this.ensureSchema();
    const res = await this.pool.query(
      `DELETE FROM chat_messages
       WHERE user_id = $1 AND session_id = $2`,
      [userId, sessionId]
    );

    return res.rowCount || 0;
  }
}
