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

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`deep${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

await page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

await page.getByRole('button', { name: 'Bảo mật', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Mật khẩu & phiên đăng nhập/ }).click();
await page.waitForTimeout(700);
const securityModal = await page.evaluate(() => ({
  open: Boolean(document.querySelector('dialog[open]')),
  title: document.querySelector('dialog[open] h2')?.textContent,
  sections: Array.from(document.querySelectorAll('dialog[open] h3')).map(h => h.textContent)
}));
console.log('security modal:', JSON.stringify(securityModal));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.getByRole('button', { name: 'Hồ sơ', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Hồ sơ ứng viên/ }).click();
await page.waitForTimeout(900);
const profileModal = await page.evaluate(() => ({
  open: Boolean(document.querySelector('dialog[open]')),
  title: document.querySelector('dialog[open] h2')?.textContent,
  grid: Boolean(document.querySelector('.profile-grid'))
}));
console.log('profile modal:', JSON.stringify(profileModal));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.getByRole('button', { name: /Quản lý kết nối AI/ }).click();
await page.waitForTimeout(700);
const grantsModal = await page.evaluate(() => ({
  open: Boolean(document.querySelector('dialog[open]')),
  title: document.querySelector('dialog[open] h2')?.textContent
}));
console.log('grants modal:', JSON.stringify(grantsModal));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.getByRole('button', { name: 'Dữ liệu', exact: true }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Mở thùng rác/ }).click();
await page.waitForTimeout(700);
const trashModal = await page.evaluate(() => ({
  open: Boolean(document.querySelector('dialog[open]')),
  title: document.querySelector('dialog[open] h2')?.textContent
}));
console.log('trash modal:', JSON.stringify(trashModal));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

await page.screenshot({ path: `${out}/settings-data.png`, fullPage: true });

for (const width of [1280, 1024, 768]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const tabs = document.querySelector('.settings-tabs');
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      tabsScroll: tabs ? tabs.scrollWidth > tabs.clientWidth : null,
      tabWidth: tabs ? Math.round(tabs.getBoundingClientRect().width) : null
    };
  });
  console.log(`settings @${width}:`, JSON.stringify(metrics));
}

console.log('errors:', errors.slice(0, 3));
await browser.close();
