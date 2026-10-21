import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideCredential,
  isOriginExemptGrant,
  originExemptScopes,
  parseBearerToken,
  scopeCovers
} from './security/credential-policy.ts';

const validSession = { userId: 'user-session', sessionId: 'session-1' };
const validGrant = { userId: 'user-grant', scopes: ['full_control'], client: 'test-client' };

test('Credential policy: a rejected Bearer never falls back to the session cookie', () => {
  const decision = decideCredential({
    bearerForm: 'canonical',
    grant: null,
    session: validSession
  });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-bearer');
});

test('Credential policy: a rejected Bearer is rejected even without a session', () => {
  const decision = decideCredential({ bearerForm: 'canonical', grant: null, session: null });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-bearer');
});

test('Credential policy: a valid grant authenticates the bearer identity and ignores the session', () => {
  const decision = decideCredential({
    bearerForm: 'canonical',
    grant: validGrant,
    session: validSession
  });

  assert.equal(decision.kind, 'grant');
  assert.equal(decision.kind === 'grant' ? decision.userId : null, 'user-grant');
  assert.equal(decision.kind === 'grant' ? decision.sessionId : null, 'ai-bearer-session');
  assert.deepEqual(decision.kind === 'grant' ? decision.scopes : null, ['full_control']);
  assert.equal(decision.kind === 'grant' ? decision.client : null, 'test-client');
});

test('Credential policy: a session without a Bearer authenticates the session identity', () => {
  const decision = decideCredential({ bearerForm: 'absent', grant: null, session: validSession });

  assert.equal(decision.kind, 'session');
  assert.equal(decision.kind === 'session' ? decision.userId : null, 'user-session');
  assert.equal(decision.kind === 'session' ? decision.sessionId : null, 'session-1');
  assert.deepEqual(decision.kind === 'session' ? decision.scopes : null, ['*']);
});

test('Credential policy: a missing credential is rejected', () => {
  const decision = decideCredential({ bearerForm: 'absent', grant: null, session: null });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-session');
});

test('Credential policy: a malformed or unsupported authorization header never falls back to the session', () => {
  for (const [form, reason] of [['empty', 'empty-token'], ['malformed', 'malformed-authorization'], ['unsupported-scheme', 'unsupported-scheme']]) {
    const decision = decideCredential({ bearerForm: form, grant: validGrant, session: validSession });
    assert.equal(decision.kind, 'rejected', form);
    assert.equal(decision.kind === 'rejected' ? decision.reason : null, reason);
  }
});

test('Credential policy: bearer header parsing records the exact form', () => {
  assert.deepEqual(parseBearerToken('Bearer abc123'), { present: true, token: 'abc123', form: 'canonical' });
  assert.deepEqual(parseBearerToken('Bearer   spaced  '), { present: true, token: 'spaced', form: 'canonical' });
  assert.deepEqual(parseBearerToken('Bearer '), { present: true, token: '', form: 'empty' });
  assert.deepEqual(parseBearerToken(undefined), { present: false, token: '', form: 'absent' });
  assert.deepEqual(parseBearerToken(''), { present: false, token: '', form: 'absent' });
  assert.deepEqual(parseBearerToken('Basic abc123'), { present: true, token: '', form: 'unsupported-scheme' });
  assert.deepEqual(parseBearerToken('bearer abc123'), { present: true, token: '', form: 'unsupported-scheme' });
  assert.deepEqual(parseBearerToken('Token abc123'), { present: true, token: '', form: 'unsupported-scheme' });
  assert.deepEqual(parseBearerToken('Bearer'), { present: true, token: '', form: 'malformed' });
  assert.deepEqual(parseBearerToken('garbage'), { present: true, token: '', form: 'malformed' });
});

test('Credential policy: a full control grant covers every scope', () => {
  assert.equal(scopeCovers(['full_control'], 'mcp:read'), true);
  assert.equal(scopeCovers(['*'], 'mcp:write'), true);
  assert.equal(scopeCovers(['mcp:read'], 'mcp:read'), true);
  assert.equal(scopeCovers(['mcp:read'], 'mcp:write'), false);
  assert.equal(scopeCovers([], 'mcp:read'), false);
  assert.equal(scopeCovers(undefined, 'mcp:read'), false);
});

test('Credential policy: the origin exemption follows the verified grant and its scope', () => {
  assert.deepEqual(originExemptScopes('/mcp'), ['mcp:read', 'mcp:write']);
  assert.deepEqual(originExemptScopes('/ai/chat'), ['ai:pro']);
  assert.deepEqual(originExemptScopes('/applications'), ['jobtrack:apply']);
  assert.deepEqual(originExemptScopes('/auth/extension/pair'), ['extension:capture']);
  assert.equal(originExemptScopes('/auth/login'), null);

  assert.equal(isOriginExemptGrant({ verifiedByGrant: true, scopes: ['full_control'], path: '/mcp' }), true);
  assert.equal(isOriginExemptGrant({ verifiedByGrant: true, scopes: ['mcp:read'], path: '/mcp' }), true);
  assert.equal(isOriginExemptGrant({ verifiedByGrant: true, scopes: ['mcp:write'], path: '/mcp' }), true);
  assert.equal(isOriginExemptGrant({ verifiedByGrant: true, scopes: ['extension:capture'], path: '/mcp' }), false);
  assert.equal(isOriginExemptGrant({ verifiedByGrant: false, scopes: ['full_control'], path: '/mcp' }), false);
  assert.equal(isOriginExemptGrant({ verifiedByGrant: true, scopes: ['full_control'], path: '/auth/login' }), false);
});
