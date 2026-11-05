import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

const TOKEN_BYTES = 32;
const TOKEN_TTL_MINUTES = 30;

export const digestToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

export const generateResetToken = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

const safeEqual = (left: string, right: string): boolean => {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

export const isTokenWellFormed = (raw: unknown): raw is string =>
  typeof raw === 'string' && raw.length >= 32 && raw.length <= 128 && /^[A-Za-z0-9_-]+$/.test(raw);

export class PasswordResetService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async issue(userId: string, client: PoolClient | Pool = this.pool): Promise<{ token: string; expiresAt: Date }> {
    const token = generateResetToken();
    const tokenHash = digestToken(token);

    await client.query(
      `UPDATE password_reset_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [userId]
    );

    const inserted = await client.query<{ expires_at: Date }>(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP + interval '${TOKEN_TTL_MINUTES} minutes')
       RETURNING expires_at`,
      [userId, tokenHash]
    );

    return { token, expiresAt: inserted.rows[0].expires_at };
  }

  async consume(rawToken: string): Promise<{ userId: string } | null> {
    if (!isTokenWellFormed(rawToken)) return null;
    const tokenHash = digestToken(rawToken);

    const found = await this.pool.query<{ id: string; user_id: string; token_hash: string }>(
      `SELECT id, user_id, token_hash
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND consumed_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    const record = found.rows[0];
    if (!record) return null;
    if (!safeEqual(record.token_hash, tokenHash)) return null;

    const claimed = await this.pool.query(
      `UPDATE password_reset_tokens
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND consumed_at IS NULL
       RETURNING id`,
      [record.id]
    );

    if (claimed.rowCount === 0) return null;
    return { userId: record.user_id };
  }

  async purgeExpired(): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM password_reset_tokens
       WHERE expires_at < CURRENT_TIMESTAMP - interval '7 days'`
    );
    return result.rowCount ?? 0;
  }
}
