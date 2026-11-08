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
  await page.locator('input[type="email"]').first().fill(`rail${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

await page.evaluate(() => localStorage.removeItem('jobtrack.sidebar.pinned'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);
await page.mouse.move(700, 400);
await page.waitForTimeout(400);

const measure = () => page.evaluate(() => {
  const aside = document.querySelector('aside.sidebar');
  const navLink = document.querySelector('aside.sidebar nav a');
  const navLabel = navLink?.querySelector('span');
  const featureBtn = document.querySelector('aside.sidebar .sidebar-trash-btn');
  const featureLabel = featureBtn?.querySelector('span:not(.pro-pill-badge)');
  const groupLabel = document.querySelector('.sidebar-group-label');
  const main = document.querySelector('main');
  const rect = aside?.getBoundingClientRect();
  return {
    width: rect ? Math.round(rect.width) : null,
    navLabelVisible: navLabel ? getComputedStyle(navLabel).display !== 'none' : null,
    featureLabelVisible: featureLabel ? getComputedStyle(featureLabel).display !== 'none' : null,
    groupLabelVisible: groupLabel ? getComputedStyle(groupLabel).display !== 'none' : null,
    mainLeft: main ? Math.round(main.getBoundingClientRect().left) : null,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  };
});

console.log('default (rail):', JSON.stringify(await measure()));
await page.screenshot({ path: `${out}/rail-default.png` });

await page.locator('aside.sidebar').hover();
await page.waitForTimeout(500);
console.log('hover:', JSON.stringify(await measure()));
await page.screenshot({ path: `${out}/rail-hover.png` });

await page.mouse.move(800, 500);
await page.waitForTimeout(500);
console.log('after leave:', JSON.stringify(await measure()));

await page.locator('.sidebar-toggle').click();
await page.waitForTimeout(500);
await page.mouse.move(800, 500);
await page.waitForTimeout(300);
console.log('pinned:', JSON.stringify(await measure()));
await page.screenshot({ path: `${out}/rail-pinned.png` });

const pinnedStored = await page.evaluate(() => localStorage.getItem('jobtrack.sidebar.pinned'));
console.log('pinned stored:', pinnedStored);

await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1600);
await page.mouse.move(800, 500);
console.log('after reload (pinned):', JSON.stringify(await measure()));

await page.locator('.sidebar-toggle').click();
await page.waitForTimeout(500);
await page.mouse.move(800, 500);
await page.waitForTimeout(400);
console.log('unpinned again:', JSON.stringify(await measure()));

await page.setViewportSize({ width: 768, height: 900 });
await page.waitForTimeout(600);
console.log('tablet 768:', JSON.stringify(await measure()));

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const mobile = await page.evaluate(() => ({
  sidebarDisplay: getComputedStyle(document.querySelector('aside.sidebar')).display,
  bottomNav: getComputedStyle(document.querySelector('.bottom-nav')).display,
  docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
}));
console.log('mobile 390:', JSON.stringify(mobile));

console.log('errors:', errors.slice(0, 3));
await browser.close();
