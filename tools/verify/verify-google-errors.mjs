import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const out = 'F:/Project/Job_Application_Tracker/output/desktop-audit';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto(`${base}/#auth?error=google_state_mismatch`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2200);

const result = await page.evaluate(() => ({
  notice: document.querySelector('.notice')?.textContent?.trim(),
  hash: location.hash,
  googleButton: Boolean(document.querySelector('.auth-google'))
}));
console.log('error state:', JSON.stringify(result));
await page.screenshot({ path: `${out}/auth-google-error.png` });

await page.goto(`${base}/#auth?error=access_denied`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
const denied = await page.evaluate(() => document.querySelector('.notice')?.textContent?.trim());
console.log('access_denied:', denied);

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`oauth${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}
const method = await page.evaluate(async () => {
  const r = await fetch('/api/auth/account-method', { credentials: 'include' });
  return { status: r.status, body: await r.json() };
});
console.log('account-method (password user):', JSON.stringify(method));

console.log('errors:', errors.slice(0, 3));
await browser.close();
