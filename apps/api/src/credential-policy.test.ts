import test from 'node:test';
import assert from 'node:assert/strict';
import { decideCredential, parseBearerToken } from './security/credential-policy.ts';

const validSession = { userId: 'user-session', sessionId: 'session-1' };
const validGrant = { userId: 'user-grant', scopes: ['full_control'], client: 'test-client' };

test('Credential policy: a rejected Bearer never falls back to the session cookie', () => {
  const decision = decideCredential({
    bearerPresent: true,
    grant: null,
    session: validSession
  });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-bearer');
});

test('Credential policy: a rejected Bearer is rejected even without a session', () => {
  const decision = decideCredential({ bearerPresent: true, grant: null, session: null });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-bearer');
});

test('Credential policy: a valid grant authenticates the bearer identity and ignores the session', () => {
  const decision = decideCredential({
    bearerPresent: true,
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
  const decision = decideCredential({ bearerPresent: false, grant: null, session: validSession });

  assert.equal(decision.kind, 'session');
  assert.equal(decision.kind === 'session' ? decision.userId : null, 'user-session');
  assert.equal(decision.kind === 'session' ? decision.sessionId : null, 'session-1');
  assert.deepEqual(decision.kind === 'session' ? decision.scopes : null, ['*']);
});

test('Credential policy: a missing credential is rejected', () => {
  const decision = decideCredential({ bearerPresent: false, grant: null, session: null });

  assert.equal(decision.kind, 'rejected');
  assert.equal(decision.kind === 'rejected' ? decision.reason : null, 'invalid-session');
});

test('Credential policy: bearer header parsing', () => {
  assert.deepEqual(parseBearerToken('Bearer abc123'), { present: true, token: 'abc123' });
  assert.deepEqual(parseBearerToken('Bearer   spaced  '), { present: true, token: 'spaced' });
  assert.deepEqual(parseBearerToken('Bearer '), { present: true, token: '' });
  assert.deepEqual(parseBearerToken(undefined), { present: false, token: '' });
  assert.deepEqual(parseBearerToken(''), { present: false, token: '' });
  assert.deepEqual(parseBearerToken('Basic abc123'), { present: false, token: '' });
  assert.deepEqual(parseBearerToken('bearer abc123'), { present: false, token: '' });
});
