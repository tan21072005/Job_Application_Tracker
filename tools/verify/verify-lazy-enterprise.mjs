import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
const requests = [];
page.on('pageerror', e => errors.push(String(e)));
page.on('request', r => { if (r.url().includes('/assets/')) requests.push(r.url().split('/').pop()); });

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`lazy${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

await page.goto(`${base}/#dashboard`, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const initial = requests.filter(f => f.endsWith('.js'));
const enterpriseLoadedOnBoot = initial.filter(f => /Modal-/.test(f));
console.log('js chunks on dashboard load:', initial.length);
console.log('enterprise chunks loaded on boot:', enterpriseLoadedOnBoot.length, enterpriseLoadedOnBoot.slice(0, 5));

console.log('errors:', errors.slice(0, 3));
await browser.close();
