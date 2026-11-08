import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const out = 'F:/Project/Job_Application_Tracker/output/web-shots';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);

if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`css${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const routes = ['dashboard', 'applications', 'interviews', 'analytics', 'roadmap', 'datasets', 'settings'];
const results = [];

for (const route of routes) {
  await page.goto(`${base}/#${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  const m = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('main');
    const heading = document.querySelector('h1');
    return {
      overflow: doc.scrollWidth - doc.clientWidth,
      mainWidth: main ? Math.round(main.getBoundingClientRect().width) : null,
      heading: heading ? heading.textContent.trim().slice(0, 30) : null,
      bodyBg: getComputedStyle(document.body).backgroundColor
    };
  });
  results.push({ route, ...m });
}

console.log('routes:', JSON.stringify(results, null, 0));

await page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
for (const label of ['Bảo mật', 'Thông báo', 'Giao diện', 'Dữ liệu']) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(350);
}
const tabsOk = await page.evaluate(() => document.querySelectorAll('.settings-card').length);
console.log('settings cards after cycling tabs:', tabsOk);

await page.screenshot({ path: `${out}/18-after-css-cleanup.png` });

await page.goto(`${base}/#dashboard`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const sidebar = await page.evaluate(() => {
  const aside = document.querySelector('aside.sidebar');
  return {
    width: aside ? Math.round(aside.getBoundingClientRect().width) : null,
    featureButtons: document.querySelectorAll('aside.sidebar button[data-feature]').length,
    settingsLink: Boolean(document.querySelector('a[href="#settings"]'))
  };
});
console.log('sidebar:', JSON.stringify(sidebar));

console.log('errors:', errors.slice(0, 3));
await browser.close();
