import { execFileSync } from 'node:child_process';

const base = process.env.PROBE_BASE ?? 'http://127.0.0.1:64364';
const composeFile = 'F:/Project/Job_Application_Tracker/docker-compose.yml';

const dockerLogs = () => {
  try {
    return execFileSync('docker', [
      'compose', '-f', composeFile, 'logs', 'api', '--tail', '60'
    ], { encoding: 'utf8', windowsHide: true });
  } catch (error) {
    return String(error.stdout ?? '');
  }
};

const call = async (path, options = {}) => {
  const response = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: base,
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

const email = `flow${Date.now()}@jobtrack.local`;
const original = 'MatKhauGoc123!@#ABC';
const replacement = 'MatKhauDatLai789!@#QRS';

console.log('1. register              ->', (await call('/api/auth/register', {
  method: 'POST', body: JSON.stringify({ email, password: original })
})).status);

console.log('2. request reset link    ->', (await call('/api/auth/forgot-password', {
  method: 'POST', body: JSON.stringify({ email })
})).status);

await new Promise(resolve => setTimeout(resolve, 1200));

const logs = dockerLogs();
const tokenMatches = [...logs.matchAll(/reset-password\?token=([A-Za-z0-9_-]+)/g)];
const token = tokenMatches.length ? tokenMatches[tokenMatches.length - 1][1] : null;

if (!token) {
  console.log('\nNo token found in container logs.');
  console.log('--- last 20 log lines ---');
  console.log(logs.split('\n').slice(-20).join('\n'));
  process.exit(1);
}

console.log('   token captured        ->', token.slice(0, 10) + '... (' + token.length + ' chars)');

const reset = await call('/api/auth/reset-password', {
  method: 'POST', body: JSON.stringify({ token, password: replacement })
});
console.log('3. reset with token      ->', reset.status, '(expect 204)');

const oldLogin = await call('/api/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password: original })
});
console.log('4. old password          ->', oldLogin.status, '(expect 401)');

const newLogin = await call('/api/auth/login', {
  method: 'POST', body: JSON.stringify({ email, password: replacement })
});
console.log('5. new password          ->', newLogin.status, '(expect 200)');

const replay = await call('/api/auth/reset-password', {
  method: 'POST', body: JSON.stringify({ token, password: 'AnotherPassword123!@#' })
});
console.log('6. token replay          ->', replay.status, '(expect 400)');

const allPassed =
  reset.status === 204 &&
  oldLogin.status === 401 &&
  newLogin.status === 200 &&
  replay.status === 400;

console.log('\nFULL RESET FLOW:', allPassed ? 'PASS' : 'FAIL');
