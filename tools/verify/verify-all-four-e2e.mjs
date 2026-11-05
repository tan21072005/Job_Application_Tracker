import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const composeFile = 'F:/Project/Job_Application_Tracker/docker-compose.yml';

const secret = (() => {
  const envPath = 'F:/Project/Job_Application_Tracker/.env';
  const line = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .find(entry => entry.startsWith('REMINDER_RUNNER_SECRET='));
  return line ? line.slice('REMINDER_RUNNER_SECRET='.length).trim() : '';
})();

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
  return { status: response.status, body, cookie, headers: response.headers, text };
};

const register = async (label) => {
  const email = `${label}${Date.now()}${Math.floor(Math.random() * 1000)}@jobtrack.local`;
  const result = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'MatKhauGoc123!@#ABC' })
  });
  return { email, cookie: result.cookie, status: result.status };
};

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

console.log('=== 1. RATE LIMITER ===\n');

const natA = await register('natA');
const natB = await register('natB');
record('two users register from same ip', natA.status === 201 && natB.status === 201);

for (let i = 0; i < 6; i += 1) {
  await call('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: natA.email, password: 'WrongPassword123!@#' })
  });
}
const bLogin = await call('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: natB.email, password: 'MatKhauGoc123!@#ABC' })
});
record('user B unaffected by user A failures', bLogin.status === 200, `B=${bLogin.status}`);

const aCorrect = await call('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: natA.email, password: 'MatKhauGoc123!@#ABC' })
});
record('user A can still log in correctly', aCorrect.status === 200, `A=${aCorrect.status}`);

console.log('\n=== 2. ACCOUNT EXPORT ===\n');

const exporter = await register('exp');
await call('/api/applications', {
  method: 'POST',
  cookie: exporter.cookie,
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({ company: 'Công ty Export E2E', position: 'Vai trò E2E', notes: 'ghi chú riêng' })
});

const exported = await call('/api/auth/export?format=json', { cookie: exporter.cookie });
const exportOk = exported.status === 200 &&
  exported.body?.account?.email === exporter.email &&
  exported.body?.data?.applications?.length === 1;
record('export returns account data', exportOk,
  `apps=${exported.body?.data?.applications?.length ?? 0}`);

console.log('\n=== 3. DELETE ACCOUNT ===\n');

const deleter = await register('del');
const wrong = await call('/api/auth/account', {
  method: 'DELETE',
  cookie: deleter.cookie,
  body: JSON.stringify({ password: 'SaiMatKhau123!@#AB', confirmation: 'XOA TAI KHOAN' })
});
record('wrong password rejected', wrong.status === 401, `${wrong.status}`);

const stillAlive = await call('/api/auth/me', { cookie: deleter.cookie });
record('account survives wrong password', stillAlive.status === 200);

const badPhrase = await call('/api/auth/account', {
  method: 'DELETE',
  cookie: deleter.cookie,
  body: JSON.stringify({ password: 'MatKhauGoc123!@#ABC', confirmation: 'xoa' })
});
record('wrong phrase rejected', badPhrase.status === 422, `${badPhrase.status}`);

const deleted = await call('/api/auth/account', {
  method: 'DELETE',
  cookie: deleter.cookie,
  body: JSON.stringify({ password: 'MatKhauGoc123!@#ABC', confirmation: 'XOA TAI KHOAN' })
});
record('delete succeeds', deleted.status === 204, `${deleted.status}`);

const afterDelete = await call('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: deleter.email, password: 'MatKhauGoc123!@#ABC' })
});
record('deleted account cannot log in', afterDelete.status === 401, `${afterDelete.status}`);

console.log('\n=== 4. DEADLINE REMINDERS ===\n');

const reminder = await register('rem');
const deadline = new Date();
deadline.setHours(9, 0, 0, 0);
deadline.setDate(deadline.getDate() + 2);

const created = await call('/api/applications', {
  method: 'POST',
  cookie: reminder.cookie,
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({
    company: 'Công ty Nhắc Việc E2E',
    position: 'Vai trò Nhắc',
    nextAction: 'Chuẩn bị phỏng vấn',
    deadline: deadline.toISOString(),
    status: 'Applied'
  })
});
record('deadline application created', created.status === 201, `${created.status}`);

const dryRun = await call('/api/internal/reminders/run?dryRun=1', {
  method: 'POST',
  headers: { 'X-JobTrack-Runner-Secret': secret }
});
record('dry run responds', dryRun.status === 200, `scanned=${dryRun.body?.scanned}`);

const noSecret = await call('/api/internal/reminders/run', { method: 'POST' });
record('endpoint rejects missing secret', noSecret.status === 401, `${noSecret.status}`);

const realRun = await call('/api/internal/reminders/run', {
  method: 'POST',
  headers: { 'X-JobTrack-Runner-Secret': secret }
});
record('real run completes', realRun.status === 200,
  `sent=${realRun.body?.sent} transport=?`);

const history = await call('/api/reminders/history', { cookie: reminder.cookie });
record('history endpoint works', history.status === 200,
  `rows=${Array.isArray(history.body) ? history.body.length : '?'}`);

const logs = execFileSync('docker', [
  'compose', '-f', composeFile, 'logs', 'api', '--tail', '60'
], { encoding: 'utf8', windowsHide: true });
const reminderLog = /\[deadline-reminder\]|\[mail:brevo-api\]|\[mail:console\]/i.test(logs);
record('mail transport activity logged', reminderLog);

console.log('\n=== SUMMARY ===');
const passed = results.filter(r => r.pass).length;
console.log(`${passed}/${results.length} checks passed`);
if (passed !== results.length) {
  console.log('\nFailed:');
  results.filter(r => !r.pass).forEach(r => console.log('  - ' + r.name + ' ' + (r.detail ?? '')));
  process.exit(1);
}
