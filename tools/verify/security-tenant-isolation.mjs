const base = process.env.PROBE_BASE ?? 'http://127.0.0.1:64364';

const makeUser = async () => {
  let cookie = '';
  const call = async (path, options = {}) => {
    const res = await fetch(base + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Origin: base,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.headers || {})
      }
    });
    const setCookie = res.headers.getSetCookie?.() ?? [];
    if (setCookie.length) cookie = setCookie.map(value => value.split(';')[0]).join('; ');
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text.slice(0, 300); }
    return { status: res.status, body };
  };
  const email = `sec${Date.now()}${Math.random().toString(16).slice(2, 8)}@jobtrack.local`;
  const register = await call('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'MatKhau123!@#JobTrack2026' })
  });
  return { call, register };
};

const victim = await makeUser();
const attacker = await makeUser();
console.log(`victim register: ${victim.register.status}`);
console.log(`attacker register: ${attacker.register.status}`);

const overview = await victim.call('/api/succession-pipeline-studio/overview');
const planId = overview.body?.plan?.id;

const profile = await victim.call('/api/succession-pipeline-studio/talent-profiles', {
  method: 'POST',
  body: JSON.stringify({
    employeeId: 'EMP-CONFIDENTIAL-42',
    fullName: 'Le Thi Bi Mat',
    currentRole: 'Chief Technology Officer',
    department: 'Engineering',
    performanceLevel: 3,
    potentialLevel: 3
  })
});

const role = await victim.call('/api/succession-pipeline-studio/critical-roles', {
  method: 'POST',
  body: JSON.stringify({
    planId,
    title: 'CTO CONFIDENTIAL',
    department: 'Engineering',
    businessImpact: 'high',
    vacancyRisk: 'high',
    incumbentName: 'Le Thi Bi Mat'
  })
});

console.log(`victim profile: ${profile.status} ${profile.body?.id ?? ''}`);
console.log(`victim role: ${role.status} ${role.body?.id ?? ''}`);

const attack = await attacker.call('/api/succession-pipeline-studio/successors', {
  method: 'POST',
  body: JSON.stringify({
    criticalRoleId: role.body?.id,
    talentProfileId: profile.body?.id,
    readinessHorizon: 'ready_now',
    rankingOrder: 1,
    notes: 'penetration test'
  })
});

const leaked = JSON.stringify(attack.body ?? '').includes('Le Thi Bi Mat') || JSON.stringify(attack.body ?? '').includes('Chief Technology Officer');

console.log('\n=== RESULT ===');
console.log(`HTTP status: ${attack.status}`);
console.log(`body: ${JSON.stringify(attack.body).slice(0, 220)}`);
console.log(`LEAKED victim data: ${leaked}`);
console.log(`BLOCKED: ${attack.status >= 400 && !leaked}`);
