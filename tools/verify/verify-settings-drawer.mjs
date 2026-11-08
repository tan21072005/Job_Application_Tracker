import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const out = 'F:/Project/Job_Application_Tracker/output/desktop-audit';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

async function makePage(width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
    await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
    await page.locator('input[type="email"]').first().fill(`set${Date.now()}@jobtrack.local`);
    await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
    await page.getByRole('button', { name: /tạo tài khoản/i }).click();
    await page.waitForTimeout(4500);
  }
  return { page, context, errors };
}

const desktop = await makePage(1440, 900);
await desktop.page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await desktop.page.waitForTimeout(1200);

const settingsInfo = await desktop.page.evaluate(() => {
  const tabs = Array.from(document.querySelectorAll('.settings-tabs button')).map(button => button.textContent?.trim());
  const heading = document.querySelector('#settings-title')?.textContent;
  const active = document.querySelector('.settings-tabs button.active')?.textContent?.trim();
  const cards = document.querySelectorAll('.settings-card').length;
  const docOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  return { heading, tabs, active, cards, docOverflow };
});
console.log('settings:', JSON.stringify(settingsInfo));

const tabResults = [];
for (const label of ['Bảo mật', 'Thông báo', 'Giao diện', 'Dữ liệu']) {
  await desktop.page.getByRole('button', { name: label, exact: true }).click();
  await desktop.page.waitForTimeout(350);
  const state = await desktop.page.evaluate(() => ({
    cards: document.querySelectorAll('.settings-card').length,
    toggles: document.querySelectorAll('.settings-toggle input').length,
    docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }));
  tabResults.push({ label, ...state });
}
console.log('tabs:', JSON.stringify(tabResults));

await desktop.page.getByRole('button', { name: 'Giao diện', exact: true }).click();
await desktop.page.waitForTimeout(300);
await desktop.page.screenshot({ path: `${out}/settings-appearance.png`, fullPage: true });

const compact = desktop.page.getByRole('radio', { name: /Gọn/ });
await compact.click();
await desktop.page.waitForTimeout(400);
const densityState = await desktop.page.evaluate(() => ({
  density: document.documentElement.dataset.density,
  stored: localStorage.getItem('jobtrack.preferences.v1')
}));
console.log('density:', JSON.stringify(densityState));
await desktop.page.reload({ waitUntil: 'domcontentloaded' });
await desktop.page.waitForTimeout(1500);
const persisted = await desktop.page.evaluate(() => document.documentElement.dataset.density);
console.log('density after reload:', persisted);

await desktop.page.goto(`${base}/#settings`, { waitUntil: 'domcontentloaded' });
await desktop.page.waitForTimeout(1200);
await desktop.page.screenshot({ path: `${out}/settings-profile.png`, fullPage: true });

const sidebar = await desktop.page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('aside.sidebar nav a')).map(a => a.textContent?.trim());
  const groups = Array.from(document.querySelectorAll('.sidebar-group-label')).map(label => label.textContent?.trim());
  const featureButtons = document.querySelectorAll('aside.sidebar nav button[data-feature]').length;
  return { links, groups, featureButtons, hasSettings: links.some(text => text?.includes('Cài đặt')) };
});
console.log('sidebar:', JSON.stringify(sidebar));

await desktop.page.locator('a[href="#settings"]').first().click();
await desktop.page.waitForTimeout(700);
const navigated = await desktop.page.evaluate(() => ({
  hash: location.hash,
  heading: document.querySelector('#settings-title')?.textContent
}));
console.log('sidebar nav to settings:', JSON.stringify(navigated));

const mobile = await makePage(390, 844);
await mobile.page.goto(`${base}/#dashboard`, { waitUntil: 'domcontentloaded' });
await mobile.page.waitForTimeout(1300);
const mobileBottom = await mobile.page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.bottom-nav a, .bottom-nav button')).map(item => item.textContent?.trim());
  return { items, count: items.length };
});
console.log('mobile bottom nav:', JSON.stringify(mobileBottom));

await mobile.page.getByRole('button', { name: 'Thêm', exact: true }).click();
await mobile.page.waitForTimeout(600);

const drawer = await mobile.page.evaluate(() => {
  const dialog = document.querySelector('dialog.mobile-drawer');
  const sections = Array.from(dialog?.querySelectorAll('section h3') ?? []).map(h => h.textContent);
  const buttons = dialog?.querySelectorAll('.mobile-drawer-grid button').length ?? 0;
  const pages = dialog?.querySelectorAll('.mobile-drawer-grid-pages a').length ?? 0;
  const rect = dialog?.getBoundingClientRect();
  return {
    open: dialog?.open ?? false,
    sections,
    buttons,
    pages,
    width: rect ? Math.round(rect.width) : null,
    height: rect ? Math.round(rect.height) : null
  };
});
console.log('drawer:', JSON.stringify(drawer));
await mobile.page.screenshot({ path: `${out}/mobile-drawer.png` });

await mobile.page.locator('.mobile-drawer-grid button').first().click();
await mobile.page.waitForTimeout(900);
const openedModal = await mobile.page.evaluate(() => ({
  drawerOpen: Boolean(document.querySelector('dialog.mobile-drawer[open]')),
  modalOpen: Boolean(document.querySelector('.crm-modal-container')) || Boolean(document.querySelector('dialog[open]:not(.mobile-drawer)')),
  heading: document.querySelector('.crm-modal-title')?.textContent || document.querySelector('dialog[open] h2')?.textContent
}));
console.log('feature from drawer:', JSON.stringify(openedModal));

console.log('desktop errors:', desktop.errors.slice(0, 3));
console.log('mobile errors:', mobile.errors.slice(0, 3));

await browser.close();
