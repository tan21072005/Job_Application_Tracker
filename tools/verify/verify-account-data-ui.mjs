import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const output = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

const email = `uif${Date.now()}@jobtrack.local`;
const password = 'MatKhauGoc123!@#ABC';

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
await page.locator('input[type="email"]').first().fill(email);
await page.locator('input[type="password"]').first().fill(password);
await page.getByRole('button', { name: /tạo tài khoản/i }).click();
await page.waitForTimeout(4500);

await page.getByRole('button', { name: /thêm hồ sơ/i }).first().click();
await page.waitForTimeout(1000);
await page.locator('input[name="company"]').first().fill('Công ty Kiểm Thử UI');
await page.locator('input[name="position"]').first().fill('Kỹ sư kiểm thử');
await page.getByRole('button', { name: /Tạo hồ sơ/i }).first().click();
await page.waitForTimeout(3000);

await page.getByRole('button', { name: /mở tài khoản/i }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Đổi mật khẩu & phiên/i }).click();
await page.waitForTimeout(1200);

const modalTitle = await page.locator('dialog[open] h2').first().innerText().catch(() => '');
console.log('modal title:', modalTitle);
await page.screenshot({ path: `${output}/60-security-modal.png`, fullPage: true });

const sections = await page.evaluate(() => {
  const dialog = document.querySelector('dialog[open]');
  if (!dialog) return [];
  return [...dialog.querySelectorAll('h3')].map(h => h.textContent.trim());
});
console.log('sections:', JSON.stringify(sections));

const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
await page.getByRole('button', { name: /Tải bản xuất JSON/i }).click();
const download = await downloadPromise;
if (download) {
  const suggested = download.suggestedFilename();
  const path = await download.path();
  const fs = await import('node:fs');
  const bytes = fs.statSync(path).size;
  console.log('download:', suggested, '|', bytes, 'bytes');
  const raw = fs.readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw);
  console.log('export keys:', Object.keys(parsed).join(','));
  console.log('applications exported:', parsed.data?.applications?.length ?? 0);
  console.log('account email matches:', parsed.account?.email === email);
} else {
  console.log('download: FAILED (no event)');
}

await page.getByRole('button', { name: /Xoá tài khoản vĩnh viễn/i }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: `${output}/61-delete-guard.png`, fullPage: true });
const guardVisible = await page.getByText(/XOA TAI KHOAN/).count();
console.log('delete confirmation field visible:', guardVisible > 0);

console.log('page errors:', errors.slice(0, 4));
await browser.close();
