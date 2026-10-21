import dns from 'node:dns/promises';
import fs from 'node:fs';
import { URL } from 'node:url';
import type { UrlImportExtractResult, WorkMode } from '../../../../packages/jobtrack-contract/src/index.ts';
import { DomainError } from './jobtrack-service.ts';

// ---------------------------------------------------------------------------
// 1. Anti-SSRF Protection
// ---------------------------------------------------------------------------
export function isPrivateIp(ip: string): boolean {
  if (ip.startsWith('127.')) return true;
  if (ip.startsWith('10.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('169.254.')) return true;
  if (ip === '0.0.0.0' || ip === '255.255.255.255') return true;

  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80:')) return true;
  if (normalized.startsWith('::ffff:')) {
    return isPrivateIp(normalized.slice(7));
  }

  return false;
}

export async function validatePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new DomainError(422, 'URL tin tuyển dụng không hợp lệ.', 'invalid_url');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DomainError(422, 'Chỉ hỗ trợ giao thức HTTP hoặc HTTPS.', 'invalid_protocol');
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname === 'localhost') {
    throw new DomainError(422, 'Không được phép truy cập địa chỉ máy chủ nội bộ.', 'ssrf_blocked');
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        throw new DomainError(422, 'Địa chỉ mạng thuộc dải nội bộ, bị từ chối để bảo mật.', 'ssrf_blocked');
      }
    }
  } catch (err) {
    if (err instanceof DomainError) throw err;
    throw new DomainError(422, `Không thể phân giải tên miền: ${hostname}`, 'dns_lookup_failed');
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// 2. Resource Management & Concurrency Limiter (Task 1.3)
// ---------------------------------------------------------------------------
class ConcurrencyLimiter {
  private active = 0;
  private queue: Array<() => void> = [];
  private max: number;

  constructor(max: number) {
    this.max = max;
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    return new Promise(resolve => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}

// Giới hạn tối đa 3 worker headless browser đồng thời để tránh quá tải RAM/CPU
const headlessLimiter = new ConcurrencyLimiter(3);

export function getBrowserExecutablePath(): string | null {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const path of candidates) {
    if (fs.existsSync(path)) return path;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. Tier 2: Deep Headless Fetch (Playwright Core) (Task 1.1, 1.2)
// ---------------------------------------------------------------------------
export async function fetchWithHeadlessBrowser(urlStr: string): Promise<{ html: string; finalUrl: string }> {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    throw new DomainError(500, 'Không tìm thấy trình duyệt Chrome/Edge trên máy chủ để render trang động.', 'browser_not_found');
  }

  const release = await headlessLimiter.acquire();
  let browser: any = null;

  try {
    const { chromium } = await import('playwright-core');
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--blink-settings=imagesEnabled=false'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 JobTrackClipper/2.0',
      viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();

    // Chặn ảnh, css font, media để tải siêu nhanh và tiết kiệm tài nguyên
    await page.route('**/*', (route: any) => {
      const resourceType = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(urlStr, {
      waitUntil: 'domcontentloaded',
      timeout: 15000 // 15s timeout
    });

    // Chờ 1.5s để các framework SPA (React/Vue/Angular) hydrate DOM
    await page.waitForTimeout(1500);

    const html = await page.content();
    const finalUrl = page.url();

    return { html, finalUrl };
  } catch (error) {
    throw new DomainError(504, `Headless browser không thể render trang: ${(error as Error).message}`, 'headless_render_failed');
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    release();
  }
}

// ---------------------------------------------------------------------------
// 4. Tier 1: Fast HTTP Fetch + 2-Tier Fallback Mechanism (Task 1.2)
// ---------------------------------------------------------------------------
function isSparseSpaHtml(html: string): boolean {
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .trim();

  // Kiểm tra nếu trang có thẻ root SPA rỗng và nội dung chữ dưới 350 ký tự
  const hasSpaContainer = /<div id=["'](root|app|__next)["']>\s*<\/div>/i.test(html);
  return (hasSpaContainer || cleaned.length < 350) && !html.includes('JobPosting');
}

export async function fetchPageContent(urlStr: string, maxRedirects = 3): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = urlStr;
  let redirects = 0;

  while (redirects <= maxRedirects) {
    const validated = await validatePublicUrl(currentUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    let res: Response;
    try {
      res = await fetch(validated.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 JobTrackBot/2.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi,en;q=0.9'
        },
        redirect: 'manual'
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Fallback to headless if quick fetch timed out and browser exists
        if (getBrowserExecutablePath()) {
          return fetchWithHeadlessBrowser(currentUrl);
        }
        throw new DomainError(504, 'Tải tin tuyển dụng quá thời gian cho phép (timeout 8s).', 'fetch_timeout');
      }
      throw new DomainError(502, `Không thể tải nội dung: ${(error as Error).message}`, 'fetch_failed');
    } finally {
      clearTimeout(timeoutId);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) throw new DomainError(502, 'Chuyển hướng không có địa chỉ đích.', 'redirect_error');
      currentUrl = new URL(location, validated).toString();
      redirects++;
      continue;
    }

    if (!res.ok) {
      // Nếu HTTP request bị chặn (403/503 Cloudflare), thử fallback qua headless browser nếu có
      if ([403, 429, 503].includes(res.status) && getBrowserExecutablePath()) {
        return fetchWithHeadlessBrowser(currentUrl);
      }
      throw new DomainError(res.status, `Không thể tải trang: mã lỗi HTTP ${res.status}`, 'fetch_http_error');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      throw new DomainError(415, 'Trang đích không phải định dạng HTML tuyển dụng.', 'unsupported_media_type');
    }

    const html = await res.text();

    // Tier 2 Trigger: Nếu HTML là SPA rỗng và máy chủ có Chrome/Edge -> Kích hoạt Playwright Deep Fetch
    if (isSparseSpaHtml(html) && getBrowserExecutablePath()) {
      return fetchWithHeadlessBrowser(currentUrl);
    }

    if (html.length > 2 * 1024 * 1024) {
      return { html: html.slice(0, 2 * 1024 * 1024), finalUrl: currentUrl };
    }

    return { html, finalUrl: currentUrl };
  }

  throw new DomainError(502, 'Vượt quá số lần chuyển hướng cho phép (tối đa 3).', 'too_many_redirects');
}

// ---------------------------------------------------------------------------
// 5. Giai đoạn 2: Readability & Anti-Prompt Injection (Task 2.1, 2.3)
// ---------------------------------------------------------------------------

// Lọc bỏ các thành phần rác trên DOM để lấy nội dung bài tuyển dụng cốt lõi
export function extractCleanArticleText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Chống Prompt Injection trong nội dung tin tuyển dụng (Task 2.3)
export function sanitizeAgainstPromptInjection(text: string): string {
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|above)\s+instructions/gi,
    /bỏ\s+qua\s+(toàn\s+bộ\s+)?(hướng\s+dẫn|lệnh)\s+(trước\s+đó|ở\s+trên)/gi,
    /system\s+prompt\s*:/gi,
    /you\s+are\s+now\s+a\b/gi,
    /hãy\s+quên\s+tất\s+cả\s+lệnh/gi,
    /act\s+as\s+an\s+unrestricted/gi
  ];

  let sanitized = text;
  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[Nội dung đã được vô hiệu hóa để bảo mật]');
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// 6. Giai đoạn 2: Hybrid Structured Extraction (Task 2.2)
// ---------------------------------------------------------------------------
export function extractJobDetails(html: string, sourceUrl: string): UrlImportExtractResult {
  let company = '';
  let position = '';
  let location: string | null = null;
  let workMode: WorkMode | null = null;
  let salary: string | null = null;
  let deadline: string | null = null;

  // 1. Schema.org JobPosting JSON-LD
  const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const block of jsonLdMatches) {
    try {
      const content = block.replace(/<script[^>]*>|<\/script>/gi, '').trim();
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
          if (item.title && !position) position = String(item.title).trim();
          if (item.hiringOrganization?.name && !company) company = String(item.hiringOrganization.name).trim();

          if (item.jobLocation?.address && !location) {
            const addr = item.jobLocation.address;
            if (typeof addr === 'string') location = addr.trim();
            else if (addr.addressLocality) location = String(addr.addressLocality).trim();
          }

          if (item.baseSalary?.value && !salary) {
            const val = item.baseSalary.value;
            const currency = item.baseSalary.currency || '';
            if (typeof val === 'number') salary = `${val.toLocaleString()} ${currency}`.trim();
            else if (val.minValue && val.maxValue) salary = `${val.minValue} - ${val.maxValue} ${currency}`.trim();
          }

          if (item.validThrough && !deadline) {
            const d = new Date(item.validThrough);
            if (!isNaN(d.getTime())) deadline = d.toISOString();
          }

          if (item.jobLocationType === 'TELECOMMUTE' || item.workMode === 'Remote') {
            workMode = 'Remote';
          }
        }
      }
    } catch {
      // Bỏ qua JSON-LD lỗi cú pháp
    }
  }

  // 2. OpenGraph & Meta tag extraction
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = ogTitleMatch ? ogTitleMatch[1] : (titleMatch ? titleMatch[1] : '');

  if (!position || !company) {
    if (rawTitle) {
      const parts = rawTitle.split(/\s*[-|–—:]\s*/).filter(p => p.trim());
      if (parts.length >= 2) {
        if (!position) position = parts[0].trim();
        if (!company) company = parts[1].trim();
      } else if (!position) {
        position = rawTitle.trim();
      }
    }
  }

  // 3. Heuristic workMode detection
  const lowerHtml = html.toLowerCase();
  if (!workMode) {
    if (lowerHtml.includes('remote') || lowerHtml.includes('làm việc từ xa')) {
      workMode = 'Remote';
    } else if (lowerHtml.includes('hybrid') || lowerHtml.includes('linh hoạt')) {
      workMode = 'Hybrid';
    } else if (lowerHtml.includes('on-site') || lowerHtml.includes('tại văn phòng')) {
      workMode = 'On-site';
    }
  }

  // 4. Heuristic salary detection
  if (!salary) {
    const salaryMatch = html.match(/(\d+(?:[.,]\d+)?\s*(?:triệu|tr|vnd|usd|\$|k)\s*-\s*\d+(?:[.,]\d+)?\s*(?:triệu|tr|vnd|usd|\$|k))/i);
    if (salaryMatch) {
      salary = salaryMatch[1].trim();
    } else if (lowerHtml.includes('thỏa thuận') || lowerHtml.includes('thoa thuan')) {
      salary = 'Thỏa thuận';
    }
  }

  // 5. Heuristic location detection
  if (!location) {
    const locMatch = html.match(/(?:địa điểm|nơi làm việc|location)[\s:]*([^\n<,]+(?:Hà Nội|TP\.?HCM|Hồ Chí Minh|Đà Nẵng|Cần Thơ))/i);
    if (locMatch) {
      location = locMatch[1].trim();
    }
  }

  // Fallbacks if missing
  if (!position) position = 'Vị trí tuyển dụng';
  if (!company) {
    try {
      company = new URL(sourceUrl).hostname.replace(/^www\./, '');
    } catch {
      company = 'Công ty tuyển dụng';
    }
  }

  const cleanText = extractCleanArticleText(html);
  const sanitizedText = sanitizeAgainstPromptInjection(cleanText);
  const excerpt = sanitizedText.slice(0, 500);

  return {
    company: company.slice(0, 250),
    position: position.slice(0, 250),
    url: sourceUrl,
    location: location ? location.slice(0, 250) : null,
    workMode,
    salary: salary ? salary.slice(0, 250) : null,
    notes: excerpt ? `Mô tả công việc (Trích xuất từ link):\n${excerpt}...` : null,
    deadline,
    confidence: {
      company: company && company !== new URL(sourceUrl).hostname ? 0.9 : 0.5,
      position: position && position !== 'Vị trí tuyển dụng' ? 0.9 : 0.5
    },
    rawTextExcerpt: excerpt
  };
}
