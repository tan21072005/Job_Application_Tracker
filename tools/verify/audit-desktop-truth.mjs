import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const output = new URL('../../output/desktop-audit', import.meta.url).pathname.slice(1);

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const email = `desk${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);

if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

const seed = async (company, position, status) => {
  await page.goto(`${base}/#applications`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /thêm hồ sơ/i }).first().click();
  await page.waitForTimeout(800);
  await page.locator('input[name="company"]').first().fill(company);
  await page.locator('input[name="position"]').first().fill(position);
  await page.locator('input[name="source"]').first().fill('LinkedIn');
  await page.getByRole('button', { name: /Tạo hồ sơ/i }).first().click();
  await page.waitForTimeout(2000);
};

await seed('FPT Software', 'Senior Frontend Engineer', 'Applied');
await seed('VNG Corporation', 'Backend Engineer', 'Applied');
await seed('Shopee Vietnam', 'Data Engineer', 'Applied');

const routes = [
  ['dashboard', '#dashboard'],
  ['applications-list', '#applications'],
  ['interviews', '#interviews'],
  ['analytics', '#analytics'],
  ['roadmap', '#roadmap'],
  ['datasets', '#datasets']
];

const measure = async () => page.evaluate(() => {
  const vw = window.innerWidth;
  const doc = document.documentElement;
  const offenders = [];

  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const over = Math.round(rect.right - vw);
    if (over > 1) {
      const style = getComputedStyle(el);
      offenders.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 60),
        id: el.id,
        right: Math.round(rect.right),
        width: Math.round(rect.width),
        over,
        position: style.position,
        overflowX: style.overflowX
      });
    }
  }

  offenders.sort((a, b) => b.over - a.over);

  const scrollers = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
      scrollers.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 60),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        delta: el.scrollWidth - el.clientWidth,
        overflowX: getComputedStyle(el).overflowX
      });
    }
  }
  scrollers.sort((a, b) => b.delta - a.delta);

  return {
    viewport: vw,
    docScrollWidth: doc.scrollWidth,
    docOverflow: doc.scrollWidth - vw,
    bodyScrollWidth: document.body.scrollWidth,
    offenders: offenders.slice(0, 12),
    offenderCount: offenders.length,
    scrollers: scrollers.slice(0, 12)
  };
});

for (const [name, hash] of routes) {
  await page.goto(`${base}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  const state = await measure();
  console.log(`\n===== ${name} =====`);
  console.log(`docOverflow=${state.docOverflow}px  body=${state.bodyScrollWidth}vw=${state.viewport}`);
  console.log(`offenders=${state.offenderCount}`);
  state.offenders.slice(0, 6).forEach(o =>
    console.log(`  +${o.over}px  ${o.tag}.${o.cls}  w=${o.width} pos=${o.position} ox=${o.overflowX}`)
  );
  state.scrollers.slice(0, 4).forEach(s =>
    console.log(`  SCROLL ${s.tag}.${s.cls} delta=${s.delta} (${s.clientWidth}->${s.scrollWidth}) ox=${s.overflowX}`)
  );

  await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
}

console.log('\npage errors:', errors.slice(0, 5));
await browser.close();
