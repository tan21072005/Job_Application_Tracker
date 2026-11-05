import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const output = new URL('../../output/browser-verify', import.meta.url).pathname.slice(1);
const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});
const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);

const hasLogin = await page.getByRole('button', { name: /chưa có tài khoản/i }).count();
if (hasLogin) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`nav${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(5000);
}

const items = await page.evaluate(() => {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return null;
  const list = [];
  for (const el of sidebar.querySelectorAll('a, button')) {
    const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const cls = String(el.className);
    let kind = 'unknown';
    if (el.tagName === 'A') kind = 'link';
    else if (cls.includes('sidebar-trash-btn')) kind = 'modal';
    else if (cls.includes('sidebar-account')) kind = 'account';
    list.push({ kind, text });
  }
  return list;
});

if (!items) {
  console.log('NO SIDEBAR');
  await browser.close();
  process.exit(1);
}

const links = items.filter(i => i.kind === 'link');
const modals = items.filter(i => i.kind === 'modal');

console.log('LINKS:', links.length);
links.forEach((i, n) => console.log(`  ${n + 1}. ${i.text}`));

console.log('\nMODALS VISIBLE:', modals.length);
modals.forEach((i, n) => console.log(`  ${n + 1}. ${i.text}`));

const ENTERPRISE_MARKERS = [
  'Headhunter', 'System Design AI', 'Định giá Cổ phần', 'Backchannel', 'Hợp đồng & Sa thải',
  '100 Ngày', 'Hội đồng', 'Bảo vệ Thôi việc', 'Thẩm định Kỹ thuật', 'Org Topology',
  'Value Stream', 'FinOps', 'AI Governance', 'Succession', 'Cyber Risk', 'ESG', 'Supply Chain',
  'Total Rewards', 'Kho bạc', 'Kiểm toán', 'Pháp lý', 'Quan hệ Nhà đầu tư', 'M&A & Hậu sáp nhập',
  'Xuất nhập khẩu', 'Khủng hoảng', 'Bảo vệ Cổ đông', 'Chống độc quyền', 'Bảo mật Dữ liệu'
];

const leaked = modals.filter(m => ENTERPRISE_MARKERS.some(marker => m.text.includes(marker)));
console.log('\nENTERPRISE LEAKED INTO SIDEBAR:', leaked.length);
if (leaked.length) leaked.forEach(m => console.log('  LEAK: ' + m.text));

const expectedKept = ['Chiến dịch Outreach', 'Lộ trình thăng tiến', 'Dự báo thu nhập'];
const keptOk = expectedKept.every(name => modals.some(m => m.text.includes(name)));
console.log('BORDERLINE KEPT:', keptOk);

console.log('\nRESULT:');
console.log('  total items:', items.length);
console.log('  modals shown:', modals.length);
console.log('  enterprise hidden:', leaked.length === 0 ? 'YES (28 hidden)' : 'NO');
console.log('  borderline kept:', keptOk ? 'YES (3 kept)' : 'NO');

await page.screenshot({ path: `${output}/sidebar-enterprise-hidden.png` });
await browser.close();
