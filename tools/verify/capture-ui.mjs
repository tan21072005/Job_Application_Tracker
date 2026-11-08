import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const out = 'F:/Project/Job_Application_Tracker/output/web-shots';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/01-login.png` });

if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`shot${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const routes = [
  ['dashboard', '02-dashboard'],
  ['applications', '03-applications'],
  ['interviews', '04-interviews'],
  ['analytics', '05-analytics'],
  ['roadmap', '06-roadmap'],
  ['datasets', '07-datasets'],
  ['settings', '08-settings']
];

for (const [route, name] of routes) {
  await page.goto(`${base}/#${route}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/${name}.png` });
}

await page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
for (const [label, name] of [['Bảo mật', '09-settings-security'], ['Thông báo', '10-settings-notifications'], ['Giao diện', '11-settings-appearance'], ['Dữ liệu', '12-settings-data']]) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png` });
}

await page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
await page.getByRole('button', { name: 'Bảo mật', exact: true }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Mật khẩu & phiên đăng nhập/ }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/13-security-modal.png` });
await page.keyboard.press('Escape');
await page.waitForTimeout(600);

await page.goto(`${base}/#dashboard`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.locator('aside.sidebar').hover();
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/14-sidebar-hover.png` });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const mPage = await mobile.newPage();
await mPage.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await mPage.waitForTimeout(2000);
await mPage.screenshot({ path: `${out}/15-mobile-login.png` });

if (await mPage.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await mPage.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await mPage.locator('input[type="email"]').first().fill(`mob${Date.now()}@jobtrack.local`);
  await mPage.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await mPage.getByRole('button', { name: /tạo tài khoản/i }).click();
  await mPage.waitForTimeout(5000);
}
await mPage.goto(`${base}/#dashboard`, { waitUntil: 'domcontentloaded' });
await mPage.waitForTimeout(1400);
await mPage.screenshot({ path: `${out}/16-mobile-dashboard.png` });

await mPage.getByRole('button', { name: 'Thêm', exact: true }).click();
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: `${out}/17-mobile-drawer.png` });

console.log('shots written to', out);
console.log('desktop errors:', errors.slice(0, 3));
await browser.close();
