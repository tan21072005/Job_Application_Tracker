import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const outFile = process.argv[2] ?? 'F:/Project/Job_Application_Tracker/output/color-baseline.json';
const routes = ['dashboard', 'applications', 'interviews', 'analytics', 'roadmap', 'datasets', 'settings'];

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`color${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const capture = () => page.evaluate(() => {
  const props = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'fill', 'stroke'];
  const result = {};
  const all = document.querySelectorAll('*');
  let i = 0;
  for (const el of all) {
    const style = getComputedStyle(el);
    const key = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const record = {};
    for (const p of props) {
      const v = style.getPropertyValue(p);
      if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'none') record[p] = v;
    }
    if (Object.keys(record).length) result[`${i}:${key}`] = record;
    i += 1;
  }
  return result;
});

const snapshot = {};
for (const route of routes) {
  await page.goto(`${base}/#${route}`, { waitUntil: 'load' });
  await page.waitForTimeout(1300);
  snapshot[route] = await capture();

  if (route === 'settings') {
    for (const tab of ['Bảo mật', 'Thông báo', 'Giao diện', 'Dữ liệu']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.waitForTimeout(350);
      snapshot[`settings:${tab}`] = await capture();
    }
  }
}

fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 1), 'utf8');
const totalEls = Object.values(snapshot).reduce((sum, r) => sum + Object.keys(r).length, 0);
console.log('routes captured:', Object.keys(snapshot).length);
console.log('elements with color:', totalEls);
console.log('written:', outFile);
await browser.close();
