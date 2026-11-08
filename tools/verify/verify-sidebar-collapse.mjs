import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const output = new URL('../../output/desktop-audit', import.meta.url).pathname.slice(1);

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
  await page.locator('input[type="email"]').first().fill(`col${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

const measure = async () => page.evaluate(() => {
  const shell = document.querySelector('.app-shell');
  const aside = document.querySelector('aside.sidebar');
  const main = document.querySelector('main');
  const label = document.querySelector('.sidebar-group-label');
  const btn = document.querySelector('.sidebar-trash-btn');
  const toggle = document.querySelector('.sidebar-toggle');
  const box = el => el ? Math.round(el.getBoundingClientRect().width) : null;
  const style = el => el ? getComputedStyle(el) : null;

  return {
    shellCols: shell ? getComputedStyle(shell).gridTemplateColumns : null,
    sidebarWidth: box(aside),
    sidebarScrollable: aside ? aside.scrollHeight > aside.clientHeight : null,
    sidebarOverflowY: aside ? style(aside).overflowY : null,
    mainWidth: box(main),
    labelVisible: label ? style(label).display !== 'none' : null,
    buttonLabelVisible: btn ? (btn.querySelector('span:not(.pro-pill-badge)') ? getComputedStyle(btn.querySelector('span:not(.pro-pill-badge)')).display !== 'none' : null) : null,
    togglePresent: Boolean(toggle),
    toggleExpanded: toggle ? toggle.getAttribute('aria-expanded') : null,
    dataLabel: btn ? btn.getAttribute('data-label') : null
  };
});

console.log('=== EXPANDED ===');
const expanded = await measure();
console.log(JSON.stringify(expanded, null, 2));
await page.screenshot({ path: `${output}/sidebar-expanded.png` });

await page.locator('.sidebar-toggle').click();
await page.waitForTimeout(600);

console.log('\n=== COLLAPSED ===');
const collapsed = await measure();
console.log(JSON.stringify(collapsed, null, 2));
await page.screenshot({ path: `${output}/sidebar-collapsed.png` });

await page.locator('.sidebar-trash-btn').first().hover();
await page.waitForTimeout(500);
await page.screenshot({ path: `${output}/sidebar-collapsed-hover.png` });

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1800);
const afterReload = await measure();
console.log('\n=== AFTER RELOAD ===');
console.log('sidebarWidth:', afterReload.sidebarWidth, '| toggleExpanded:', afterReload.toggleExpanded);

console.log('\npage errors:', errors.slice(0, 4));
await browser.close();
