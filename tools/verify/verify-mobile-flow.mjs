import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const shots = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(String(error)));

const email = `mobile${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';

await page.goto('http://127.0.0.1:64364/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/10-mobile-auth.png`, fullPage: true });
await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(4500);

const addButton = page.getByRole('button', { name: /^Thêm hồ sơ$/ }).first();
if (await addButton.count()) {
  await addButton.click();
} else {
  await page.getByRole('button', { name: /thêm mới/i }).first().click();
}
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/11-mobile-form.png`, fullPage: true });
const dialogMetrics = await page.evaluate(() => {
  const dialog = document.querySelector('dialog[open]');
  if (!dialog) return null;
  const rect = dialog.getBoundingClientRect();
  return { width: Math.round(rect.width), height: Math.round(rect.height), scrollWidth: dialog.scrollWidth, clientWidth: dialog.clientWidth };
});
console.log('dialog:', JSON.stringify(dialogMetrics));

await page.locator('input[id*="company"], input[name="company"]').first().fill('Shopee Vietnam');
await page.locator('input[id*="position"], input[name="position"]').first().fill('Backend Engineer');
await page.screenshot({ path: `${shots}/12-mobile-form-filled.png`, fullPage: true });
await page.getByRole('button', { name: /Tạo hồ sơ/i }).first().click();
await page.waitForTimeout(4500);
await page.screenshot({ path: `${shots}/13-mobile-detail.png`, fullPage: true });
console.log('detail:', (await page.locator('body').innerText()).slice(0, 260).replace(/\n+/g, ' | '));

await page.goto('http://127.0.0.1:64364/#applications', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${shots}/14-mobile-applications.png`, fullPage: true });

await page.goto('http://127.0.0.1:64364/#interviews', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/15-mobile-interviews.png`, fullPage: true });

await page.goto('http://127.0.0.1:64364/#analytics', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/16-mobile-analytics.png`, fullPage: true });

const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, inner: window.innerWidth }));
console.log('overflow:', JSON.stringify(overflow));
console.log('errors:', errors.slice(0, 5));
await browser.close();
