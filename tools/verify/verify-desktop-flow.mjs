import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const shots = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', error => errors.push(String(error)));

const step = async (name, value) => console.log(`${name}:`, typeof value === 'string' ? value.replace(/\n+/g, ' | ').slice(0, 380) : value);

await page.goto('http://127.0.0.1:64364/', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(2500);
await step('title', await page.title());
await step('auth screen', await page.locator('body').innerText());
await page.screenshot({ path: `${shots}/01-auth.png`, fullPage: true });

await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.waitForTimeout(600);

const email = `browser${Date.now()}@jobtrack.local`;
const password = 'MatKhau123!@#JobTrack2026';
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.screenshot({ path: `${shots}/02-register-filled.png`, fullPage: true });

await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(5000);
await step('after register', await page.locator('body').innerText());
await page.screenshot({ path: `${shots}/03-dashboard.png`, fullPage: true });

const addButtons = page.getByRole('button', { name: /thêm hồ sơ|tạo hồ sơ|hồ sơ mới/i });
console.log('add button count:', await addButtons.count());
if (await addButtons.count()) {
  await addButtons.first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${shots}/04-form.png`, fullPage: true });
  await step('form', await page.locator('form').first().innerText());

  const company = page.locator('input[name="company"], input#company, input[id*="company"], input[placeholder*="công ty" i]').first();
  const position = page.locator('input[name="position"], input#position, input[id*="position"], input[placeholder*="vị trí" i]').first();
  console.log('company field:', await company.count(), 'position field:', await position.count());
  if (await company.count() && await position.count()) {
    await company.fill('VNG Corporation');
    await position.fill('Frontend Engineer');
    await page.screenshot({ path: `${shots}/05-form-filled.png`, fullPage: true });
    const submit = page.getByRole('button', { name: /^lưu|lưu hồ sơ|tạo hồ sơ/i }).first();
    console.log('submit buttons:', await page.getByRole('button', { name: /^lưu|lưu hồ sơ|tạo hồ sơ/i }).count());
    await submit.click();
    await page.waitForTimeout(5000);
    await step('after save', await page.locator('body').innerText());
    await page.screenshot({ path: `${shots}/06-after-save.png`, fullPage: true });
  }
}

console.log('console errors:', errors.slice(0, 6));
await browser.close();
