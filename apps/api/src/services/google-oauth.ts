import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
export const GOOGLE_SCOPE = 'openid email profile';

export type GoogleConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export type GoogleIdentity = {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
};

export type GoogleLoginResult = {
  userId: string;
  email: string;
  created: boolean;
};

export function readGoogleConfig(env: NodeJS.ProcessEnv = process.env): GoogleConfig | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier, 'ascii').digest('base64url');
  return { verifier, challenge };
}

export function hashState(state: string): string {
  return createHash('sha256').update(state, 'utf8').digest('hex');
}

export function buildAuthorizationUrl(config: GoogleConfig, state: string, challenge: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPE,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account'
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function exchangeCodeForIdToken(
  config: GoogleConfig,
  code: string,
  verifier: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri
    }).toString()
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`google_token_exchange_failed:${response.status}:${detail.slice(0, 200)}`);
  }
  const payload = (await response.json()) as { id_token?: string };
  if (!payload.id_token) throw new Error('google_token_response_missing_id_token');
  return payload.id_token;
}

export async function verifyGoogleIdToken(config: GoogleConfig, idToken: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: config.clientId
  });
  return readIdentity(payload);
}

export function readIdentity(payload: JWTPayload): GoogleIdentity {
  const subject = typeof payload.sub === 'string' ? payload.sub : '';
  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const emailVerified = payload.email_verified === true || payload.email_verified === 'true';
  const name = typeof payload.name === 'string' ? payload.name : null;
  if (!subject) throw new Error('google_identity_missing_subject');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('google_identity_missing_email');
  if (!emailVerified) throw new Error('google_identity_email_unverified');
  return { subject, email, emailVerified, name };
}

export async function saveLoginState(pool: Pool, state: string, verifier: string, redirectPath: string): Promise<void> {
  await pool.query(
    `INSERT INTO oauth_login_states (id, state_hash, code_verifier, redirect_path, expires_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + interval '10 minutes')`,
    [randomUUID(), hashState(state), verifier, redirectPath]
  );
}

export async function consumeLoginState(
  pool: Pool,
  state: string
): Promise<{ verifier: string; redirectPath: string } | null> {
  const result = await pool.query<{ code_verifier: string; redirect_path: string }>(
    `UPDATE oauth_login_states
        SET consumed_at = CURRENT_TIMESTAMP
      WHERE state_hash = $1
        AND consumed_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      RETURNING code_verifier, redirect_path`,
    [hashState(state)]
  );
  const row = result.rows[0];
  if (!row) return null;
  return { verifier: row.code_verifier, redirectPath: row.redirect_path };
}

export async function upsertGoogleUser(pool: Pool, identity: GoogleIdentity): Promise<GoogleLoginResult> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query<{ user_id: string }>(
      `SELECT user_id FROM oauth_identities WHERE provider = 'google' AND subject = $1`,
      [identity.subject]
    );
    if (existing.rows[0]) {
      const userId = existing.rows[0].user_id;
      await client.query(
        `UPDATE oauth_identities
            SET email = $3, email_verified = $4, last_login_at = CURRENT_TIMESTAMP
          WHERE provider = 'google' AND subject = $1 AND user_id = $2`,
        [identity.subject, userId, identity.email, identity.emailVerified]
      );
      const account = await client.query<{ email: string }>('SELECT email FROM users WHERE id = $1', [userId]);
      await client.query('COMMIT');
      return { userId, email: account.rows[0]?.email ?? identity.email, created: false };
    }

    const byEmail = await client.query<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE email_normalized = $1',
      [identity.email]
    );
    const linkedFromEmail = byEmail.rows[0];
    const userId = linkedFromEmail?.id ?? randomUUID();

    if (!linkedFromEmail) {
      await client.query(
        'INSERT INTO users (id, email, email_normalized, password_hash) VALUES ($1, $2, $3, NULL)',
        [userId, identity.email, identity.email]
      );
    }

    await client.query(
      `INSERT INTO oauth_identities (id, user_id, provider, subject, email, email_verified)
       VALUES ($1, $2, 'google', $3, $4, $5)
       ON CONFLICT (provider, subject) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             email = EXCLUDED.email,
             email_verified = EXCLUDED.email_verified,
             last_login_at = CURRENT_TIMESTAMP`,
      [randomUUID(), userId, identity.subject, identity.email, identity.emailVerified]
    );

    await client.query('COMMIT');
    return { userId, email: linkedFromEmail?.email ?? identity.email, created: !linkedFromEmail };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function userHasPassword(pool: Pool | PoolClient, userId: string): Promise<boolean> {
  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  const hash = result.rows[0]?.password_hash;
  return typeof hash === 'string' && hash.length > 0;
}

export function safeRedirectPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return '/';
  if (trimmed.length > 255) return '/';
  return trimmed;
}
