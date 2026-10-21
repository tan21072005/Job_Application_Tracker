export type BearerGrant = {
  userId: string;
  scopes: string[];
  client: string;
};

export type SessionIdentity = {
  userId: string;
  sessionId: string;
};

export type CredentialDecision =
  | { kind: 'grant'; userId: string; sessionId: string; scopes: string[]; client: string }
  | { kind: 'session'; userId: string; sessionId: string; scopes: string[] }
  | { kind: 'rejected'; reason: 'invalid-bearer' | 'invalid-session' };

const BEARER_PREFIX = 'Bearer ';

export function parseBearerToken(header?: string): { present: boolean; token: string } {
  if (typeof header !== 'string' || !header.startsWith(BEARER_PREFIX)) {
    return { present: false, token: '' };
  }
  return { present: true, token: header.slice(BEARER_PREFIX.length).trim() };
}

export function decideCredential(input: {
  bearerPresent: boolean;
  grant: BearerGrant | null;
  session: SessionIdentity | null;
}): CredentialDecision {
  if (input.bearerPresent) {
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
