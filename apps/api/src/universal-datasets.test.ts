import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { app } from './server.ts';
import { createServer, type Server } from 'node:http';
import { signPaymentPayload } from './security/payment-signature.ts';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) throw new Error('TEST_DATABASE_URL required for test environment.');

const pool = new Pool({ connectionString: testDatabaseUrl, max: 5 });

const previousWebhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
const webhookSecret = previousWebhookSecret ?? 'c13_universal_datasets_webhook_secret_0123456789';
process.env.PAYMENT_WEBHOOK_SECRET = webhookSecret;

const previousPaymentMode = process.env.PAYMENT_MODE;
process.env.PAYMENT_MODE = 'test';

function signedWebhook(payload: unknown) {
  const body = JSON.stringify(payload);
  const timestamp = Date.now();
  return {
    body,
    headers: {
      'Content-Type': 'application/json',
      'X-JobTrack-Timestamp': String(timestamp),
      'X-JobTrack-Signature': signPaymentPayload({ secret: webhookSecret, timestamp, rawBody: body })
    }
  };
}

test('Universal Datasets, Extension Pairing & Payment Webhook Flow', async () => {
  let server!: Server;
  let port = 0;
  let base = '';

  await new Promise<void>((resolve) => {
    server = createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        port = addr.port;
        base = `http://127.0.0.1:${port}`;
      }
      resolve();
    });
  });

  try {
    const userEmail = `universal_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
    const userPass = 'ValidPassword123!';

    // 1. Register & login to get session cookie
    const regRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://127.0.0.1:64364',
        'X-Forwarded-For': `127.0.13.${Math.floor(Math.random() * 200) + 1}`
      },
      body: JSON.stringify({ email: userEmail, password: userPass })
    });
    assert.equal(regRes.status, 201);
    const cookie = regRes.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie);

    // 2. Pair Extension: Generates scoped Bearer token
    const pairRes = await fetch(`${base}/api/auth/extension/pair`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie,
        'Origin': 'http://127.0.0.1:64364'
      },
      body: JSON.stringify({ client: 'PageWeave Extension Test' })
    });
    assert.equal(pairRes.status, 201);
    const pairData = await pairRes.json();
    assert.ok(pairData.token.startsWith('jt_sec_'));
    assert.deepEqual(pairData.scopes, ['extension:capture', 'datasets:write', 'jobtrack:apply', 'ai:pro']);
    const extToken = pairData.token;

    // 3. Extension Status check with Bearer token
    const statusRes = await fetch(`${base}/api/auth/extension/status`, {
      headers: { 'Authorization': `Bearer ${extToken}` }
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.valid, true);
    assert.equal(statusData.tier, 'free');
    assert.equal(statusData.isPro, false);

    // 4. Create Universal Dataset via Extension Bearer token
    const createDsRes = await fetch(`${base}/api/datasets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extToken}`
      },
      body: JSON.stringify({
        name: 'Bảng So Sánh Giá Laptop',
        category: 'product_research',
        columns: [
          { key: 'productName', label: 'Tên Laptop', type: 'text', required: true },
          { key: 'price', label: 'Giá', type: 'currency', required: true },
          { key: 'seller', label: 'Nhà bán lẻ', type: 'text' }
        ]
      })
    });
    assert.equal(createDsRes.status, 201);
    const ds = await createDsRes.json();
    assert.equal(ds.name, 'Bảng So Sánh Giá Laptop');
    assert.equal(ds.category, 'product_research');
    assert.equal(ds.recordCount, 0);

    // 5. Add Records with deduplication support
    const addRecordsRes = await fetch(`${base}/api/datasets/${ds.id}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extToken}`
      },
      body: JSON.stringify({
        records: [
          {
            data: { productName: 'MacBook Pro M3', price: '39.990.000 đ', seller: 'Shop A' },
            sourceUrl: 'https://shop-a.vn/macbook-m3',
            sourceTitle: 'Mua MacBook Pro M3 giá tốt'
          },
          {
            data: { productName: 'Dell XPS 15', price: '35 triệu', seller: 'Shop B' },
            sourceUrl: 'https://shop-b.vn/dell-xps-15',
            sourceTitle: 'Dell XPS 15 chính hãng'
          },
          // Duplicate URL should be skipped
          {
            data: { productName: 'MacBook Pro M3 Duplicate', price: '39.990.000 đ', seller: 'Shop A' },
            sourceUrl: 'https://shop-a.vn/macbook-m3',
            sourceTitle: 'Mua MacBook Pro M3 giá tốt'
          }
        ],
        dedup: true
      })
    });
    assert.equal(addRecordsRes.status, 201);
    const addResult = await addRecordsRes.json();
    assert.equal(addResult.inserted, 2);
    assert.equal(addResult.skippedDuplicates, 1);

    // 6. List records
    const listRecRes = await fetch(`${base}/api/datasets/${ds.id}/records`, {
      headers: { 'Authorization': `Bearer ${extToken}` }
    });
    assert.equal(listRecRes.status, 200);
    const listRecData = await listRecRes.json();
    assert.equal(listRecData.total, 2);
    assert.equal(listRecData.records.length, 2);

    // 7. Export Dataset as CSV
    const exportRes = await fetch(`${base}/api/datasets/${ds.id}/export`, {
      headers: { 'Authorization': `Bearer ${extToken}` }
    });
    assert.equal(exportRes.status, 200);
    const buf = await exportRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    assert.equal(bytes[0], 0xEF, 'Byte 0 must be 0xEF (UTF-8 BOM)');
    assert.equal(bytes[1], 0xBB, 'Byte 1 must be 0xBB (UTF-8 BOM)');
    assert.equal(bytes[2], 0xBF, 'Byte 2 must be 0xBF (UTF-8 BOM)');
    const csvContent = new TextDecoder('utf-8').decode(bytes);
    assert.ok(csvContent.includes('Tên Laptop,Giá,Nhà bán lẻ'));
    assert.ok(csvContent.includes('MacBook Pro M3'));

    // 8. Test AI Transform: Currency Normalization
    const transRes = await fetch(`${base}/api/ai/transform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extToken}`
      },
      body: JSON.stringify({
        mode: 'currency',
        input: '1,2 tỷ'
      })
    });
    assert.equal(transRes.status, 200);
    const transData = await transRes.json();
    assert.equal(transData.result.amount, 1200000000);
    assert.equal(transData.result.currency, 'VND');

    // 9. Payment Webhook Flow: Create checkout then simulate webhook
    const checkoutRes = await fetch(`${base}/api/pro/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${extToken}`
      },
      body: JSON.stringify({ plan: 'quarterly' })
    });
    assert.equal(checkoutRes.status, 200);
    const checkoutData = await checkoutRes.json();
    assert.equal(checkoutData.amount, 249000);
    const transferCode = checkoutData.transferCode;

    // Simulate external bank webhook to /api/pro/webhook
    const webhookRequest = signedWebhook({
      transferCode,
      amount: 249000,
      content: `Thanh toan don hang ${transferCode} tai Napas`
    });
    const webhookRes = await fetch(`${base}/api/pro/webhook`, {
      method: 'POST',
      headers: webhookRequest.headers,
      body: webhookRequest.body
    });
    assert.equal(webhookRes.status, 200);
    const webhookData = await webhookRes.json();
    assert.equal(webhookData.success, true);
    assert.equal(webhookData.plan, 'quarterly');
    assert.equal(webhookData.replayed, false);

    // Repeated webhook should be idempotent
    const repeatRequest = signedWebhook({
      transferCode,
      amount: 249000,
      content: `Thanh toan ${transferCode}`
    });
    const repeatWebhook = await fetch(`${base}/api/pro/webhook`, {
      method: 'POST',
      headers: repeatRequest.headers,
      body: repeatRequest.body
    });
    assert.equal(repeatWebhook.status, 200);
    const repeatData = await repeatWebhook.json();
    assert.equal(repeatData.success, true);
    assert.equal(repeatData.replayed, true);

    // Verify user is now Pro
    const proCheck = await fetch(`${base}/api/auth/extension/status`, {
      headers: { 'Authorization': `Bearer ${extToken}` }
    });
    assert.equal(proCheck.status, 200);
    const proData = await proCheck.json();
    assert.equal(proData.isPro, true);
    assert.equal(proData.tier, 'pro');

    // 10. Check Usage Summary
    const usageRes = await fetch(`${base}/api/usage/summary`, {
      headers: { 'Authorization': `Bearer ${extToken}` }
    });
    assert.equal(usageRes.status, 200);
    const usageData = await usageRes.json();
    assert.equal(usageData.tier, 'pro');
    assert.equal(usageData.dataCaptureUsed, 2);
    assert.equal(usageData.aiTransformUsed, 1);
    assert.equal(usageData.datasetsCount, 1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => (err ? reject(err) : resolve())));
  }
});

test.after(async () => {
  if (previousWebhookSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
  else process.env.PAYMENT_WEBHOOK_SECRET = previousWebhookSecret;
  if (previousPaymentMode === undefined) delete process.env.PAYMENT_MODE;
  else process.env.PAYMENT_MODE = previousPaymentMode;
  await pool.end();
});
