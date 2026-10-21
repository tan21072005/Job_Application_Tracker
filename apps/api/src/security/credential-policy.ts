export type BearerGrant = {
  userId: string;
  scopes: string[];
  client: string;
};

export type SessionIdentity = {
  userId: string;
  sessionId: string;
};

export type BearerHeaderForm = 'absent' | 'canonical' | 'empty' | 'malformed' | 'unsupported-scheme';

export type CredentialRejection =
  | 'invalid-bearer'
  | 'empty-token'
  | 'malformed-authorization'
  | 'unsupported-scheme'
  | 'invalid-session';

export type CredentialDecision =
  | { kind: 'grant'; userId: string; sessionId: string; scopes: string[]; client: string }
  | { kind: 'session'; userId: string; sessionId: string; scopes: string[] }
  | { kind: 'rejected'; reason: CredentialRejection };

const BEARER_PREFIX = 'Bearer ';
const SCHEME_PATTERN = /^([A-Za-z][A-Za-z0-9._-]*)\s/;

export const ORIGIN_EXEMPT_PATH_SCOPES: ReadonlyArray<{ prefix: string; scopes: string[] }> = Object.freeze([
  { prefix: '/mcp', scopes: ['mcp:read', 'mcp:write'] },
  { prefix: '/profile', scopes: ['jobtrack:apply'] },
  { prefix: '/subscriptions', scopes: ['jobtrack:apply'] },
  { prefix: '/ai', scopes: ['ai:pro'] },
  { prefix: '/pro', scopes: ['ai:pro'] },
  { prefix: '/datasets', scopes: ['datasets:write'] },
  { prefix: '/applications', scopes: ['jobtrack:apply'] },
  { prefix: '/auth/extension', scopes: ['extension:capture'] }
]);

export function parseBearerToken(header?: string): { present: boolean; token: string; form: BearerHeaderForm } {
  if (typeof header !== 'string' || header.length === 0) {
    return { present: false, token: '', form: 'absent' };
  }
  if (header.startsWith(BEARER_PREFIX)) {
    const token = header.slice(BEARER_PREFIX.length).trim();
    return token ? { present: true, token, form: 'canonical' } : { present: true, token: '', form: 'empty' };
  }
  const scheme = SCHEME_PATTERN.exec(header);
  if (scheme) {
    return { present: true, token: '', form: 'unsupported-scheme' };
  }
  return { present: true, token: '', form: 'malformed' };
}

export function decideCredential(input: {
  bearerForm: BearerHeaderForm;
  grant: BearerGrant | null;
  session: SessionIdentity | null;
}): CredentialDecision {
  if (input.bearerForm === 'empty') {
    return { kind: 'rejected', reason: 'empty-token' };
  }
  if (input.bearerForm === 'malformed') {
    return { kind: 'rejected', reason: 'malformed-authorization' };
  }
  if (input.bearerForm === 'unsupported-scheme') {
    return { kind: 'rejected', reason: 'unsupported-scheme' };
  }
  if (input.bearerForm === 'canonical') {
    if (!input.grant) {
      return { kind: 'rejected', reason: 'invalid-bearer' };
    }
    return {
      kind: 'grant',
      userId: input.grant.userId,
      sessionId: 'ai-bearer-session',
      scopes: input.grant.scopes,
      client: input.grant.client
    };
  }
  if (!input.session) {
    return { kind: 'rejected', reason: 'invalid-session' };
  }
  return {
    kind: 'session',
    userId: input.session.userId,
    sessionId: input.session.sessionId,
    scopes: ['*']
  };
}

export function scopeCovers(scopes: string[] | undefined, scope: string): boolean {
  const granted = Array.isArray(scopes) ? scopes : [];
  return granted.includes('*') || granted.includes('full_control') || granted.includes(scope);
}

export function scopeCoversAny(scopes: string[] | undefined, required: string[]): boolean {
  return required.some(scope => scopeCovers(scopes, scope));
}

export function originExemptScopes(path: string): string[] | null {
  const target = String(path ?? '');
  const entry = ORIGIN_EXEMPT_PATH_SCOPES.find(candidate => target === candidate.prefix || target.startsWith(`${candidate.prefix}/`));
  return entry ? [...entry.scopes] : null;
}

export function isOriginExemptGrant(input: { verifiedByGrant: boolean; scopes: string[] | undefined; path: string }): boolean {
  if (!input.verifiedByGrant) return false;
  const required = originExemptScopes(input.path);
  if (!required) return false;
  return scopeCoversAny(input.scopes, required);
}
