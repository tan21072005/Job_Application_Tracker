const base = process.env.SMOKE_BASE ?? 'http://127.0.0.1:64364';
const origin = 'http://127.0.0.1:64364';

let cookie = '';
const call = async (path, options = {}) => {
  const res = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {})
    }
  });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length) cookie = setCookie.map(value => value.split(';')[0]).join('; ');
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text.slice(0, 200); }
  return { status: res.status, body };
};

const email = `smoke${Date.now()}@jobtrack.local`;
const register = await call('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password: 'MatKhau123!@#JobTrack2026' })
});
console.log('register', register.status, register.body?.user?.email ?? register.body);

const created = await call('/api/applications', {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID() },
  body: JSON.stringify({
    company: 'FPT Software',
    position: 'Senior Frontend Engineer',
    source: 'LinkedIn',
    jobCode: 'FPT-1234',
    url: 'https://careers.fpt.com/jobs/1234',
    workMode: 'Hybrid',
    salary: '35-45 triệu',
    status: 'Applied',
    nextAction: 'Gửi email follow-up',
    deadline: new Date(Date.now() + 86400000).toISOString()
  })
});
const applicationId = created.body.id ?? created.body.application?.id;
console.log('create application', created.status, created.body.company ?? created.body);

const list = await call('/api/applications?status=Applied');
console.log('list', list.status, Array.isArray(list.body?.applications) ? list.body.applications.length : list.body);

const dashboard = await call('/api/dashboard');
console.log('dashboard', dashboard.status, JSON.stringify(dashboard.body).slice(0, 300));

const interview = await call(`/api/applications/${applicationId}/interviews`, {
  method: 'POST',
  headers: { 'Idempotency-Key': crypto.randomUUID(), 'If-Match': created.etag ?? `"app:${applicationId}:v${created.body.version}"` },
  body: JSON.stringify({
    title: 'Technical round 1',
    at: new Date(Date.now() + 2 * 86400000).toISOString(),
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'Online',
    location: 'Google Meet'
  })
});
console.log('create interview', interview.status, JSON.stringify(interview.body).slice(0, 250));

const afterInterview = await call(`/api/applications/${applicationId}`);
console.log('application after interview', afterInterview.status, afterInterview.body?.application?.status, 'rounds:', afterInterview.body?.interviews?.length);

const logout = await call('/api/auth/logout', { method: 'POST' });
console.log('logout', logout.status);

const unauth = await call('/api/applications');
console.log('unauthenticated list', unauth.status, unauth.body?.code ?? unauth.body);

