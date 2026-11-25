import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync(new URL('./server.ts', import.meta.url), 'utf8');

test('security: every destructive account route requires full_control', () => {
  const guarded = [
    "app.post('/api/auth/change-password', authLimit, auth, requireScope('full_control')",
    "app.delete('/api/auth/sessions', auth, requireScope('full_control')",
    "app.delete('/api/auth/account', authLimit, auth, requireScope('full_control')",
    "app.get('/api/auth/export', authLimit, auth, requireScope('full_control')",
    "app.post('/api/ai/grants', auth, requireScope('full_control')",
    "app.get('/api/ai/grants', auth, requireScope('full_control')",
    "app.delete('/api/ai/grants/:id', auth, requireScope('full_control')"
  ];
  for (const line of guarded) {
    assert.ok(server.includes(line), `missing guard: ${line}`);
  }
});

test('security: an extension origin must match an allowlisted id', () => {
  assert.match(server, /const TRUSTED_EXTENSION_IDS =/, 'allowlist must exist');
  assert.match(server, /isTrustedExtensionOrigin\(requestOrigin\)/, 'cors must use the allowlist');
  assert.doesNotMatch(server, /requestOrigin\.startsWith\('chrome-extension:\/\/'\)/, 'the blanket prefix check must be gone');
});

test('security: the payment simulator is closed outside test mode', () => {
  const block = server.slice(
    server.indexOf("app.post('/api/pro/test/simulate-webhook'"),
    server.indexOf("app.post('/api/pro/test/simulate-webhook'") + 400
  );
  assert.match(block, /process\.env\.PAYMENT_MODE !== 'test'/);
  assert.match(block, /Problem\(404/);
});

test('security: the client ip comes from the hop the proxy appended', () => {
  const block = server.slice(server.indexOf('export function getClientIp'), server.indexOf('export async function checkRateLimit'));
  assert.match(block, /hops\[hops\.length - 1\]/, 'must take the last hop');
  assert.doesNotMatch(block, /ips\[0\]/, 'the client-supplied first hop must not be trusted');
  assert.match(block, /X-Real-IP/);
});

test('applications: the duplicate check ignores rows in the trash', () => {
  const service = readFileSync(new URL('./services/jobtrack-service.ts', import.meta.url), 'utf8');
  const query = service.slice(service.indexOf('SELECT id,status FROM applications'), service.indexOf('SELECT id,status FROM applications') + 300);
  assert.match(query, /deleted_at IS NULL/, 'a trashed row must not block a fresh application');
});
