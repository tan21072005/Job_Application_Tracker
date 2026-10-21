import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { decideCredential, parseBearerToken, type BearerGrant, type BearerHeaderForm } from './credential-policy.ts';

export async function resolveBearerGrant(pool: Pool, header?: string): Promise<{ grant: BearerGrant | null; form: BearerHeaderForm }> {
  const bearer = parseBearerToken(header);
  if (bearer.form !== 'canonical') {
    return { grant: null, form: bearer.form };
  }
  const tokenHash = createHash('sha256').update(bearer.token).digest('hex');
  const result = await pool.query(
    'SELECT user_id, scopes, client FROM ai_grants WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP',
    [tokenHash]
  );
  if (!result.rowCount || !result.rows[0]) {
    return { grant: null, form: bearer.form };
  }
  return {
    grant: {
      userId: result.rows[0].user_id,
      scopes: result.rows[0].scopes || ['full_control'],
      client: result.rows[0].client
    },
    form: bearer.form
  };
}

export async function resolveGrantIdentity(pool: Pool, header?: string): Promise<{ userId: string; client: string; scopes: string[] } | null> {
  const { grant, form } = await resolveBearerGrant(pool, header);
  const decision = decideCredential({ bearerForm: form, grant, session: null });
  if (decision.kind !== 'grant') return null;
  return { userId: decision.userId, client: decision.client, scopes: decision.scopes };
}
