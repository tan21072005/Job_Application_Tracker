import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);

if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`reg${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

await page.goto(`${base}/#applications`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /Thêm hồ sơ/ }).first().click().catch(() => {});
await page.waitForTimeout(900);

const filled = await page.evaluate(async () => {
  const company = document.querySelector('input[name="company"]');
  const results = { companyFieldFound: Boolean(company) };
  return results;
});
console.log('form open:', JSON.stringify(filled));

await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const apiChecks = await page.evaluate(async () => {
  const call = async (path) => {
    const r = await fetch(path, { credentials: 'include' });
    return { path, status: r.status };
  };
  return [
    await call('/api/health'),
    await call('/api/auth/me'),
    await call('/api/applications'),
    await call('/api/auth/providers'),
    await call('/api/auth/account-method'),
    await call('/api/analytics/summary'),
    await call('/api/applications/00000000-0000-0000-0000-000000000000')
  ];
});
console.log('api:', JSON.stringify(apiChecks));

console.log('errors:', errors.slice(0, 3));
await browser.close();
