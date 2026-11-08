import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const outDir = 'F:/Project/Job_Application_Tracker/output/style-shots';
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`shot${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const targets = ['dossier', 'legal', 'culture', 'esg', 'corpDev', 'compensation', 'company', 'systemDesign'];

for (const key of targets) {
  await page.goto(`${base}/?t=${Date.now()}#dashboard`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const btn = page.locator(`aside.sidebar button[data-feature="${key}"]`);
  if (!(await btn.count())) { console.log(`${key}: absent`); continue; }
  await btn.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${outDir}/${key}.png` });
  console.log(`${key}: captured`);
}

await browser.close();
