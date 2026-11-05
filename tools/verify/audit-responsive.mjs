import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const output = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const email = `audit${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto('http://127.0.0.1:64364/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(4000);

const create = async (company, position) => {
  await page.goto('http://127.0.0.1:64364/#applications', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /thêm hồ sơ/i }).first().click();
  await page.waitForTimeout(900);
  await page.locator('input[name="company"]').first().fill(company);
  await page.locator('input[name="position"]').first().fill(position);
  await page.locator('input[name="source"]').first().fill('LinkedIn');
  await page.getByRole('button', { name: /Tạo hồ sơ/i }).first().click();
  await page.waitForTimeout(2500);
};

await create('FPT Software', 'Senior Frontend Engineer');
await create('VNG Corporation', 'Backend Engineer');
await create('Shopee Vietnam', 'Data Engineer');

const routes = [
  ['dashboard', '#dashboard'],
  ['applications-list', '#applications'],
  ['analytics', '#analytics'],
  ['roadmap', '#roadmap'],
  ['datasets', '#datasets'],
  ['interviews', '#interviews']
];

const probe = async (width, height, label) => {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(500);
  const findings = [];
  for (const [name, hash] of routes) {
    await page.goto(`http://127.0.0.1:64364/${hash}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1400);
    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth - window.innerWidth;
      const narrow = [];
      for (const el of document.querySelectorAll('h1,h2,h3,p,strong,span,td,th,a,button')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.width < 26 && el.textContent.trim().length > 3) {
          const style = getComputedStyle(el);
          if (style.letterSpacing !== 'normal' || rect.width < 20) {
            narrow.push({ tag: el.tagName, text: el.textContent.trim().slice(0, 30), width: Math.round(rect.width), height: Math.round(rect.height) });
          }
        }
      }
      const clipped = [...document.querySelectorAll('.page-heading-actions, .bottom-nav, .filter-bar, .detail-heading')]
        .map(el => ({ cls: el.className, scroll: el.scrollWidth, client: el.clientWidth }))
        .filter(item => item.scroll > item.client + 2);
      return { overflow, narrow: narrow.slice(0, 4), clipped };
    });
    findings.push({ route: name, ...result });
    await page.screenshot({ path: `${output}/audit-${label}-${name}.png`, fullPage: true });
  }
  return findings;
};

const mobile = await probe(390, 844, '390');
const tablet = await probe(768, 1024, '768');
const desktop = await probe(1440, 900, '1440');

const report = { mobile, tablet, desktop, pageErrors: errors.slice(0, 5) };
console.log(JSON.stringify(report, null, 1));
await browser.close();
