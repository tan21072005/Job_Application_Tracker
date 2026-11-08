import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuthorizationUrl,
  createPkcePair,
  hashState,
  readGoogleConfig,
  readIdentity,
  safeRedirectPath,
  timingSafeEqualString
} from './services/google-oauth.ts';

const config = {
  clientId: 'test-client.apps.googleusercontent.com',
  clientSecret: 'test-secret',
  redirectUri: 'http://127.0.0.1:64364/api/auth/google/callback'
};

test('google oauth: configuration is absent until every variable is set', () => {
  assert.equal(readGoogleConfig({}), null);
  assert.equal(readGoogleConfig({ GOOGLE_CLIENT_ID: 'a', GOOGLE_CLIENT_SECRET: 'b' }), null);
  assert.equal(
    readGoogleConfig({
      GOOGLE_CLIENT_ID: ' a ',
      GOOGLE_CLIENT_SECRET: ' b ',
      GOOGLE_REDIRECT_URI: ' http://127.0.0.1:64364/api/auth/google/callback '
    })?.clientId,
    'a'
  );
});

test('google oauth: PKCE challenge is the SHA256 of the verifier and both stay URL safe', () => {
  const { verifier, challenge } = createPkcePair();
  assert.equal(verifier.length >= 43 && verifier.length <= 128, true);
  assert.match(verifier, /^[A-Za-z0-9_-]+$/);
  assert.match(challenge, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(verifier, challenge);
  assert.notEqual(createPkcePair().verifier, verifier);
});

test('google oauth: authorization URL carries PKCE, state and the minimal scope set', () => {
  const url = new URL(buildAuthorizationUrl(config, 'state-123', 'challenge-abc'));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), config.clientId);
  assert.equal(url.searchParams.get('redirect_uri'), config.redirectUri);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('scope'), 'openid email profile');
  assert.equal(url.searchParams.get('state'), 'state-123');
  assert.equal(url.searchParams.get('code_challenge'), 'challenge-abc');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('access_type'), 'online');
});

test('google oauth: state hashing is stable and comparison is length safe', () => {
  assert.equal(hashState('abc'), hashState('abc'));
  assert.equal(hashState('abc').length, 64);
  assert.notEqual(hashState('abc'), hashState('abd'));
  assert.equal(timingSafeEqualString('same', 'same'), true);
  assert.equal(timingSafeEqualString('same', 'diff'), false);
  assert.equal(timingSafeEqualString('short', 'longer-value'), false);
});

test('google oauth: identity requires a subject, a valid email and a verified address', () => {
  const base = { sub: '1234567890', email: 'Person@Example.COM', email_verified: true, name: 'Person' };

  const ok = readIdentity(base);
  assert.equal(ok.subject, '1234567890');
  assert.equal(ok.email, 'person@example.com');
  assert.equal(ok.emailVerified, true);

  assert.throws(() => readIdentity({ ...base, sub: '' }), /missing_subject/);
  assert.throws(() => readIdentity({ ...base, email: '' }), /missing_email/);
  assert.throws(() => readIdentity({ ...base, email: 'not-an-email' }), /missing_email/);
  assert.throws(() => readIdentity({ ...base, email_verified: false }), /email_unverified/);
  assert.throws(() => readIdentity({ ...base, email_verified: undefined }), /email_unverified/);
  assert.equal(readIdentity({ ...base, email_verified: 'true' }).emailVerified, true);
});

test('google oauth: redirect path is confined to in-app hashes', () => {
  assert.equal(safeRedirectPath('/applications'), '/applications');
  assert.equal(safeRedirectPath('/application/abc/interviews'), '/application/abc/interviews');
  assert.equal(safeRedirectPath(undefined), '/');
  assert.equal(safeRedirectPath(''), '/');
  assert.equal(safeRedirectPath('https://evil.example'), '/');
  assert.equal(safeRedirectPath('//evil.example'), '/');
  assert.equal(safeRedirectPath('/\\evil.example'), '/');
  assert.equal(safeRedirectPath('javascript:alert(1)'), '/');
  assert.equal(safeRedirectPath(`/${'a'.repeat(300)}`), '/');
});
