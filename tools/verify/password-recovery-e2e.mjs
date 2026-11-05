const base = process.env.PROBE_BASE ?? 'http://127.0.0.1:64364';

const call = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
      'X-Forwarded-For': `127.0.99.${Math.floor(Math.random() * 250) + 1}`,
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...(options.headers || {})
    }
  });
  const setCookie = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await response.text();
  let body = null;
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: response.status, body, cookie };
};

const email = `e2e${Date.now()}@jobtrack.local`;
const originalPassword = 'MatKhauGoc123!@#ABC';
const newPassword = 'MatKhauMoi456!@#XYZ';

console.log('1. register');
const register = await call('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password: originalPassword })
});
console.log('   status:', register.status);

console.log('2. forgot-password (sends real email through Brevo or console)');
const forgot = await call('/api/auth/forgot-password', {
  method: 'POST',
  body: JSON.stringify({ email })
});
console.log('   status:', forgot.status, '| message:', forgot.body?.message?.slice(0, 60));

console.log('3. change-password');
const change = await call('/api/auth/change-password', {
  method: 'POST',
  cookie: register.cookie,
  body: JSON.stringify({ currentPassword: originalPassword, newPassword })
});
console.log('   status:', change.status);

console.log('4. old password rejected');
const oldLogin = await call('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password: originalPassword })
});
console.log('   status:', oldLogin.status, '(expect 401)');

console.log('5. new password accepted');
const newLogin = await call('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password: newPassword })
});
console.log('   status:', newLogin.status, '(expect 200)');

console.log('6. revoke other sessions');
const revoke = await call('/api/auth/sessions', { method: 'DELETE', cookie: newLogin.cookie });
console.log('   status:', revoke.status, '| revoked:', revoke.body?.revoked);

console.log('7. caller still signed in');
const me = await call('/api/auth/me', { cookie: newLogin.cookie });
console.log('   status:', me.status, '| email:', me.body?.email ? 'present' : 'missing');

console.log('8. previous session revoked');
const oldSession = await call('/api/auth/me', { cookie: register.cookie });
console.log('   status:', oldSession.status, '(expect 401)');
