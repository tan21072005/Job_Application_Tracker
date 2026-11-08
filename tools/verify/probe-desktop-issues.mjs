import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);
if (await page.getByRole('button', { name: /chưa có tài khoản/i }).count()) {
  await page.getByRole('button', { name: /chưa có tài khoản/i }).click();
  await page.locator('input[type="email"]').first().fill(`m${Date.now()}@jobtrack.local`);
  await page.locator('input[type="password"]').first().fill('MatKhau123!@#JobTrack2026');
  await page.getByRole('button', { name: /tạo tài khoản/i }).click();
  await page.waitForTimeout(4500);
}

const probe = async (label, hash) => {
  await page.goto(`${base}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);

  const data = await page.evaluate(() => {
    const out = { sidebar: null, chat: null, clipped: [], gridOrphans: [] };

    const aside = document.querySelector('aside.sidebar');
    if (aside) {
      const r = aside.getBoundingClientRect();
      const nav = aside.querySelector('nav');
      const navRect = nav?.getBoundingClientRect();
      out.sidebar = {
        boxHeight: Math.round(r.height),
        scrollHeight: aside.scrollHeight,
        clientHeight: aside.clientHeight,
        overflowY: getComputedStyle(aside).overflowY,
        navHeight: navRect ? Math.round(navRect.height) : null,
        navScrollHeight: nav?.scrollHeight ?? null,
        navClientHeight: nav?.clientHeight ?? null,
        navOverflowY: nav ? getComputedStyle(nav).overflowY : null
      };
    }

    const fab = document.querySelector('.chat-widget-root');
    if (fab) {
      const r = fab.getBoundingClientRect();
      out.chat = {
        top: Math.round(r.top),
        left: Math.round(r.left),
        right: Math.round(r.right),
        bottom: Math.round(r.bottom),
        width: Math.round(r.width),
        height: Math.round(r.height),
        coversContent: r.top < window.innerHeight
      };
    }

    for (const el of document.querySelectorAll('.resource-title, .schedule-bottom small, .funnel, .funnel-row, td, .sources-table td')) {
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        out.clipped.push({
          cls: String(el.className).slice(0, 40),
          text: (el.textContent || '').trim().slice(0, 40),
          clientWidth: el.clientWidth,
          scrollWidth: el.scrollWidth,
          overflow: getComputedStyle(el).overflow,
          textOverflow: getComputedStyle(el).textOverflow
        });
      }
    }

    for (const grid of document.querySelectorAll('.milestones-grid, .roadmap-top-grid, [class*="grid"]')) {
      const style = getComputedStyle(grid);
      if (!style.gridTemplateColumns || style.gridTemplateColumns === 'none') continue;
      const columns = style.gridTemplateColumns.split(' ').length;
      const children = grid.children.length;
      if (children > 0 && children % columns !== 0 && children > 1) {
        out.gridOrphans.push({
          cls: String(grid.className).slice(0, 40),
          columns,
          children,
          orphans: children % columns
        });
      }
    }

    return out;
  });

  console.log(`\n===== ${label} (${hash}) =====`);
  console.log('sidebar:', JSON.stringify(data.sidebar));
  console.log('chat FAB:', JSON.stringify(data.chat));
  if (data.clipped.length) {
    console.log('clipped text:');
    data.clipped.slice(0, 6).forEach(c => console.log(`  ${c.cls} "${c.text}" ${c.clientWidth}->${c.scrollWidth} ${c.overflow}/${c.textOverflow}`));
  }
  if (data.gridOrphans.length) {
    console.log('grid orphans:');
    data.gridOrphans.forEach(g => console.log(`  ${g.cls} cols=${g.columns} children=${g.children} orphans=${g.orphans}`));
  }
  return data;
};

for (const [label, hash] of [
  ['dashboard', '#dashboard'],
  ['applications', '#applications'],
  ['analytics', '#analytics'],
  ['roadmap', '#roadmap'],
  ['interviews', '#interviews'],
  ['datasets', '#datasets']
]) {
  await probe(label, hash);
}

await browser.close();
