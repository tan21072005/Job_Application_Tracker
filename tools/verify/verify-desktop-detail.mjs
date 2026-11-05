import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const shots = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const email = `desk${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';

await page.goto('http://127.0.0.1:64364/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(4500);
await page.screenshot({ path: `${shots}/20-desktop-dashboard.png` });

await page.goto('http://127.0.0.1:64364/#applications', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${shots}/21-desktop-applications.png` });

await page.getByRole('button', { name: /thêm hồ sơ/i }).first().click();
await page.waitForTimeout(1200);
await page.locator('input[id*="company"], input[name="company"]').first().fill('VNG Corporation');
await page.locator('input[id*="position"], input[name="position"]').first().fill('Senior Frontend Engineer');
await page.locator('input[id*="source"], input[name="source"]').first().fill('LinkedIn');
await page.getByRole('button', { name: /Tạo hồ sơ/i }).first().click();
await page.waitForTimeout(4000);
await page.screenshot({ path: `${shots}/22-desktop-detail.png` });

const metrics = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  inner: window.innerWidth,
  heading: document.querySelector('.page-heading h1')?.getBoundingClientRect().width ?? null
}));
console.log('desktop metrics:', JSON.stringify(metrics));
await browser.close();
