import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const outFile = process.argv[2] ?? 'F:/Project/Job_Application_Tracker/output/enterprise-colors-before.json';
const keys = process.argv[3] ? process.argv[3].split(',') : null;

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(1800);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`ent${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const capture = () => page.evaluate(() => {
  const props = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'fill', 'stroke', 'outline-color'];
  const out = {};
  document.querySelectorAll('*').forEach((el, i) => {
    const style = getComputedStyle(el);
    const rec = {};
    for (const p of props) {
      const v = style.getPropertyValue(p);
      if (v && v !== 'rgba(0, 0, 0, 0)' && v !== 'none') rec[p] = v;
    }
    if (Object.keys(rec).length) out[`${i}:${el.tagName}`] = rec;
  });
  return out;
});

await page.goto(`${base}/#dashboard`, { waitUntil: 'load' });
await page.waitForTimeout(2000);
const available = await page.evaluate(() => Array.from(document.querySelectorAll('aside.sidebar button[data-feature]')).map(b => b.getAttribute('data-feature')));
const targets = keys ?? available;
console.log('features:', available.length, '| targets:', targets.length);

const snapshot = {};
for (const feature of targets) {
  await page.goto(`${base}/?t=${Date.now()}#dashboard`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const btn = page.locator(`aside.sidebar button[data-feature="${feature}"]`);
  const count = await btn.count();
  if (!count) { snapshot[feature] = { skipped: 'absent' }; continue; }

  await btn.click({ timeout: 10000 });
  await page.waitForTimeout(1700);

  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important;animation-duration:0s!important;transition-duration:0s!important}'
  });
  await page.waitForTimeout(500);

  const info = await page.evaluate(() => {
    const dialog = document.querySelector('dialog[open]');
    const ariaModal = document.querySelector('[aria-modal="true"]');
    const testId = document.querySelector('[data-testid$="-modal"], [data-testid*="studio"]');
    const overlayLike = document.querySelector('[class*="overlay"], [class*="backdrop"]');
    const overlay = dialog || ariaModal || testId || overlayLike;
    return {
      dialog: Boolean(dialog),
      modal: Boolean(ariaModal || testId || overlayLike),
      overlayClass: overlay ? String(overlay.className || '').slice(0, 60) : null,
      bodyScrollLocked: document.body.style.overflow === 'hidden'
    };
  });

  snapshot[feature] = { ...info, elements: await capture() };
}

fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 1), 'utf8');
const total = Object.values(snapshot).reduce((s, v) => s + (v.elements ? Object.keys(v.elements).length : 0), 0);
const openedCount = Object.values(snapshot).filter(v => v.modal || v.dialog).length;
console.log('modules opened:', openedCount);
console.log('elements captured:', total);
console.log('errors:', errors.slice(0, 3));
await browser.close();
