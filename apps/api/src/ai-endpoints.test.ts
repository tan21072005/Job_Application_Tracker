import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { app } from './server.ts';
import { once } from 'node:events';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 4 });
const testUsers: string[] = [];

const previousPaymentMode = process.env.PAYMENT_MODE;
process.env.PAYMENT_MODE = 'test';

test.after(async () => {
  for (const id of testUsers) {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
  }
  if (previousPaymentMode === undefined) delete process.env.PAYMENT_MODE;
  else process.env.PAYMENT_MODE = previousPaymentMode;
  await pool.end();
});

test('AI Endpoints: grants management, MCP over HTTP, import-url, and chat BFF', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw Error('Server failed to start');
  const base = `http://127.0.0.1:${address.port}`;

  try {
    // 1. Register a test user
    const email = `ai_endpoint_${randomUUID().slice(0, 8)}@example.com`;
    const regRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://127.0.0.1:64364' },
      body: JSON.stringify({ email, password: 'StrongPassword123!' })
    });
    assert.equal(regRes.status, 201);
    const user = await regRes.json();
    testUsers.push(user.id);
    const cookie = regRes.headers.get('set-cookie')!;

    // 2. Create an AI Grant token
    const grantRes = await fetch(`${base}/api/ai/grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:64364',
        'Cookie': cookie
      },
      body: JSON.stringify({ client: 'claude-desktop' })
    });
    assert.equal(grantRes.status, 201);
    const grant = await grantRes.json();
    assert.ok(grant.token.startsWith('jt_sec_'));

    // 3. Call MCP over HTTP via Bearer grant token (no Cookie, no Origin needed)
    const mcpRes = await fetch(`${base}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grant.token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_dashboard_summary',
          arguments: {}
        }
      })
    });
    assert.equal(mcpRes.status, 200);
    const mcpBody = await mcpRes.json();
    assert.equal(mcpBody.id, 1);
    const dashboard = JSON.parse(mcpBody.result.content[0].text);
    assert.equal(dashboard.total, 0);

    // 4. Test Chat BFF proxy fallback
    const chatRes = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:64364',
        'Cookie': cookie
      },
      body: JSON.stringify({ message: 'Xin chào, hôm nay tôi có lịch phỏng vấn nào không?' })
    });
    assert.equal(chatRes.status, 200);
    const chatBody = await chatRes.json();
    assert.ok(chatBody.output || chatBody.text);

    // 6. Candidate Profile (Phase 5)
    // 6a. Initially not found
    const getProfileEmpty = await fetch(`${base}/api/profile`, {
      headers: { 'Cookie': cookie }
    });
    assert.equal(getProfileEmpty.status, 404);

    // 6b. Upsert profile
    const putProfile = await fetch(`${base}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:64364',
        'Cookie': cookie
      },
      body: JSON.stringify({
        fullName: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0901234567',
        cvUrl: 'https://example.com/cv.pdf',
        portfolioUrl: 'https://github.com/nguyenvana',
        skills: ['TypeScript', 'Node.js', 'React'],
        bio: 'Senior Fullstack Developer với 5 năm kinh nghiệm.'
      })
    });
    assert.equal(putProfile.status, 200);
    const profileData = await putProfile.json();
    assert.equal(profileData.fullName, 'Nguyễn Văn A');
    assert.deepEqual(profileData.skills, ['TypeScript', 'Node.js', 'React']);

    // 6c. Fetch profile via Bearer token
    const getProfileBearer = await fetch(`${base}/api/profile`, {
      headers: { 'Authorization': `Bearer ${grant.token}` }
    });
    assert.equal(getProfileBearer.status, 200);
    const bearerProfile = await getProfileBearer.json();
    assert.equal(bearerProfile.fullName, 'Nguyễn Văn A');

    // 7. Subscriptions (Phase 4)
    const subRes = await fetch(`${base}/api/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://127.0.0.1:64364',
        'Cookie': cookie
      },
      body: JSON.stringify({
        title: 'Senior Frontend Vue/React',
        keywords: ['React', 'Frontend'],
        location: 'Hồ Chí Minh'
      })
    });
    assert.equal(subRes.status, 201);
    const sub = await subRes.json();
    assert.equal(sub.title, 'Senior Frontend Vue/React');

    const listSubs = await fetch(`${base}/api/subscriptions`, {
      headers: { 'Cookie': cookie }
    });
    assert.equal(listSubs.status, 200);
    const subsList = await listSubs.json();
    assert.equal(subsList.length, 1);

    // 7b. Pro Features: ATS Match & Cover Letter
    const atsRes = await fetch(`${base}/api/ai/pro/ats-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grant.token}` },
      body: JSON.stringify({
        company: 'Vũ Hoà',
        position: 'Senior Node.js & React Developer',
        notes: 'Yêu cầu thành thạo TypeScript, Node.js, React, Docker, Redis.'
      })
    });
    assert.equal(atsRes.status, 200);
    const atsData = await atsRes.json();
    assert.ok(atsData.score > 50);
    assert.ok(atsData.matchedSkills.includes('TypeScript'));
    assert.ok(atsData.missingSkills.includes('Docker'));

    // 7c. Pro Feature: AI Cover Letter
    const clRes = await fetch(`${base}/api/ai/pro/cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grant.token}` },
      body: JSON.stringify({
        company: 'Vũ Hoà',
        position: 'Senior Node.js & React Developer',
        language: 'vi'
      })
    });
    assert.equal(clRes.status, 200);
    const clData = await clRes.json();
    assert.ok(clData.coverLetter.includes('Nguyễn Văn A'));
    assert.ok(clData.coverLetter.includes('Vũ Hoà'));
    assert.ok(clData.shortPitch.length > 20);

    // 7d. Pro Membership & VietQR Checkout
    const checkoutRes = await fetch(`${base}/api/pro/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grant.token}` },
      body: JSON.stringify({ plan: 'monthly' })
    });
    assert.equal(checkoutRes.status, 200);
    const checkoutData = await checkoutRes.json();
    assert.equal(checkoutData.amount, 99000);
    assert.equal(checkoutData.plan, 'monthly');
    assert.equal(checkoutData.currency, 'VND');
    assert.equal(checkoutData.mode, 'test');
    assert.match(checkoutData.transferCode, /^JTPRO[A-Z0-9]{6}$/);
    assert.equal(typeof checkoutData.testNotice, 'string');
    assert.ok(checkoutData.testNotice.length > 20);
    assert.equal(checkoutData.bankName, null);
    assert.equal(checkoutData.accountNo, null);
    assert.equal(checkoutData.accountName, null);
    assert.equal(checkoutData.vietQrUrl, null);
    assert.ok(checkoutData.instructions.includes(checkoutData.transferCode));
    const serializedCheckout = JSON.stringify(checkoutData);
    assert.equal(serializedCheckout.includes('img.vietqr.io'), false);
    assert.equal(/MB Bank|Vietcombank|Ngân hàng|0987654321/i.test(serializedCheckout), false);

    const actRes = await fetch(`${base}/api/pro/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${grant.token}` },
      body: JSON.stringify({ plan: 'monthly' })
    });
    assert.equal(actRes.status, 403);
    const actData = await actRes.json();
    assert.equal(actData.code, 'activation_requires_payment');

    const statusAfterActivate = await fetch(`${base}/api/pro/status`, {
      headers: { 'Cookie': cookie }
    });
    assert.equal(statusAfterActivate.status, 200);
    const proStatus = await statusAfterActivate.json();
    assert.equal(proStatus.tier, 'free');
    assert.equal(proStatus.isPro, false);
    assert.equal(proStatus.expiresAt, null);

    // 8. Revoke grant
    const revokeRes = await fetch(`${base}/api/ai/grants/${grant.id}`, {
      method: 'DELETE',
      headers: {
        'Origin': 'http://127.0.0.1:64364',
        'Cookie': cookie
      }
    });
    assert.equal(revokeRes.status, 204);

    // 9. MCP call with revoked token should fail 401
    const revokedMcpRes = await fetch(`${base}/api/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${grant.token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'get_dashboard_summary', arguments: {} }
      })
    });
    assert.equal(revokedMcpRes.status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
  }
});
