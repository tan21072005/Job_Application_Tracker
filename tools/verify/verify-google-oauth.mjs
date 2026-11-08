import { chromium } from '../../apps/api/node_modules/playwright-core/index.mjs';

const base = process.env.WEB_BASE ?? 'http://127.0.0.1:64364';
const out = 'F:/Project/Job_Application_Tracker/output/desktop-audit';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(String(error)));

await page.goto(`${base}/#auth`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2200);

const authUi = await page.evaluate(() => {
  const google = document.querySelector('.auth-google');
  return {
    googleButton: Boolean(google),
    href: google?.getAttribute('href'),
    text: google?.textContent?.trim(),
    divider: document.querySelector('.auth-divider')?.textContent?.trim(),
    hasEmailField: Boolean(document.querySelector('input[type="email"]'))
  };
});
console.log('auth ui:', JSON.stringify(authUi));
await page.screenshot({ path: `${out}/auth-google-button.png` });

const start = await page.goto(`${base}/api/auth/google/start`, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(e => ({ status: () => 'err:' + String(e).slice(0, 80) }));
const currentUrl = page.url();
console.log('after start redirect:', currentUrl.slice(0, 140));
console.log('status:', typeof start.status === 'function' ? start.status() : start.status);

const cookieNames = (await context.cookies()).map(c => `${c.name}@${c.domain}${c.path}`);
console.log('cookies:', JSON.stringify(cookieNames));

const params = new URL(currentUrl).searchParams;
console.log('oauth params:', JSON.stringify({
  client_id: params.get('client_id')?.slice(0, 30),
  redirect_uri: params.get('redirect_uri'),
  scope: params.get('scope'),
  state: params.get('state') ? 'present' : 'missing',
  code_challenge_method: params.get('code_challenge_method'),
  access_type: params.get('access_type'),
  prompt: params.get('prompt')
}));

const cookiesAfter = (await context.cookies()).filter(c => c.name === 'jobtrack_oauth_state');
console.log('state cookie:', JSON.stringify(cookiesAfter.map(c => ({ name: c.name, httpOnly: c.httpOnly, sameSite: c.sameSite, path: c.path }))));

const pageText = await page.evaluate(() => (document.body.innerText || '').slice(0, 400));
console.log('consent page:', pageText.replace(/\s+/g, ' ').slice(0, 260));

const mismatch = await page.goto(`${base}/api/auth/google/callback?state=forged&code=fake`, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('forged state ->', page.url(), '| status', mismatch.status());

const noCookie = await context.newPage();
await noCookie.goto(`${base}/api/auth/google/callback?state=abc&code=fake`, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('no cookie ->', noCookie.url());

const afterError = await noCookie.evaluate(() => document.querySelector('.notice')?.textContent?.trim());
console.log('error message shown:', afterError);

console.log('errors:', errors.slice(0, 3));
await browser.close();
