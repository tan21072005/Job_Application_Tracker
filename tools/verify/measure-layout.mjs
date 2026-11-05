import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const shots = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const email = `layout${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.goto('http://127.0.0.1:64364/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(4000);

const measure = await page.evaluate(() => {
  const pick = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      left: Math.round(rect.left),
      display: style.display,
      maxWidth: style.maxWidth,
      gridTemplateColumns: style.gridTemplateColumns,
      padding: style.padding,
      overflow: style.overflow
    };
  };
  return {
    viewport: window.innerWidth,
    html: pick('html'),
    body: pick('body'),
    root: pick('#root'),
    shell: pick('.app-shell'),
    sidebar: pick('.sidebar'),
    workspace: pick('.workspace'),
    main: pick('main'),
    dashboard: pick('.dashboard, .dashboard-grid, main > div'),
    docScrollWidth: document.documentElement.scrollWidth
  };
});
console.log(JSON.stringify(measure, null, 2));

await page.screenshot({ path: `${shots}/07-desktop-viewport.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${shots}/08-mobile-viewport.png` });
const mobile = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, inner: window.innerWidth }));
console.log('mobile overflow:', mobile);

await browser.close();
