// PageWeave — Universal Web Data Assistant Content Script
// Bóc tách dữ liệu web đa tầng (HTML Tables, Repeating Lists, Selection, Schema.org) & Trợ lý JobTrack

function idempotencyKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}


// =============================================================================
// 1. UNIVERSAL EXTRACTOR LAYER 1: BÓC TÁCH BẢNG HTML (HTML TABLES)
// =============================================================================
function detectHtmlTables() {
  const tables = Array.from(document.querySelectorAll('table'));
  const results = [];

  tables.forEach((table, index) => {
    // Bỏ qua các bảng layout ẩn hoặc quá nhỏ
    if (table.offsetWidth === 0 && table.offsetHeight === 0) return;

    const trs = Array.from(table.querySelectorAll('tr'));
    if (trs.length < 2) return;

    // Xác định tiêu đề cột (Headers)
    let headers = [];
    const ths = Array.from(table.querySelectorAll('thead th, thead td'));
    if (ths.length > 0) {
      headers = ths.map((th, i) => th.textContent.trim() || `Cột ${i + 1}`);
    } else {
      const firstRowThs = Array.from(trs[0].querySelectorAll('th, td'));
      headers = firstRowThs.map((cell, i) => cell.textContent.trim() || `Cột ${i + 1}`);
    }

    if (headers.length < 2) return;

    // Trích xuất các dòng dữ liệu (Rows)
    const rows = [];
    const dataTrs = ths.length > 0 ? trs : trs.slice(1);

    for (const tr of dataTrs) {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      if (cells.length === 0) continue;

      const rowObj = {};
      let hasData = false;
      headers.forEach((h, colIdx) => {
        const cell = cells[colIdx];
        const val = cell ? cell.textContent.trim().replace(/\s+/g, ' ') : '';
        if (val) hasData = true;
        rowObj[h] = val;
      });

      if (hasData) {
        rows.push(rowObj);
      }
    }

    if (rows.length > 0) {
      const caption = table.querySelector('caption')?.textContent.trim() ||
                      table.closest('section')?.querySelector('h1, h2, h3, h4')?.textContent.trim() ||
                      `Bảng ${index + 1}`;
      results.push({
        id: `table_${index + 1}`,
        title: caption,
        headers,
        rows,
        rowCount: rows.length
      });
    }
  });

  return results;
}

// =============================================================================
// 2. UNIVERSAL EXTRACTOR LAYER 2: DANH SÁCH LẶP (REPEATING LISTS / CARDS)
// =============================================================================
function detectRepeatingLists() {
  const containers = Array.from(document.querySelectorAll('ul, ol, div, section'));
  const listResults = [];

  for (const container of containers) {
    if (container.offsetWidth === 0 || container.offsetHeight === 0) continue;

    // Tìm các thẻ con trực tiếp có cấu trúc tương đồng
    const children = Array.from(container.children).filter(el => {
      const tag = el.tagName.toLowerCase();
      return tag !== 'script' && tag !== 'style' && el.offsetHeight > 20;
    });

    if (children.length < 3 || children.length > 100) continue;

    // Kiểm tra xem các con có thẻ tiêu đề hoặc link không
    const firstChild = children[0];
    const hasHeadingsOrLinks = children.filter(c => c.querySelector('h1, h2, h3, h4, h5, a[href]')).length >= (children.length * 0.7);
    if (!hasHeadingsOrLinks) continue;

    const extractedRows = [];
    for (const item of children) {
      const headingEl = item.querySelector('h1, h2, h3, h4, h5, .title, [class*="title"], [class*="name"]');
      const linkEl = item.querySelector('a[href]');
      const priceEl = item.querySelector('.price, [class*="price"], [class*="cost"], [class*="salary"]');
      const descEl = item.querySelector('p, .desc, [class*="desc"], [class*="summary"]');
      const imgEl = item.querySelector('img[src]');

      const title = headingEl?.textContent.trim() || linkEl?.textContent.trim() || '';
      if (!title || title.length > 300) continue;

      let href = linkEl?.getAttribute('href') || '';
      if (href && !href.startsWith('http')) {
        try { href = new URL(href, window.location.href).href; } catch { /* ignore */ }
      }

      extractedRows.push({
        'Tên / Tiêu đề': title.replace(/\s+/g, ' '),
        'Giá / Chi phí': priceEl ? priceEl.textContent.trim().replace(/\s+/g, ' ') : '',
        'Mô tả': descEl ? descEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 300) : '',
        'Liên kết': href
      });
    }

    if (extractedRows.length >= 3) {
      const title = container.getAttribute('aria-label') ||
                    container.previousElementSibling?.querySelector('h1, h2, h3, h4')?.textContent.trim() ||
                    `Danh sách thẻ (${extractedRows.length} mục)`;

      listResults.push({
        id: `list_${listResults.length + 1}`,
        title,
        headers: ['Tên / Tiêu đề', 'Giá / Chi phí', 'Mô tả', 'Liên kết'],
        rows: extractedRows,
        rowCount: extractedRows.length
      });

      // Chỉ lấy tối đa 2 danh sách chất lượng nhất
      if (listResults.length >= 2) break;
    }
  }

  return listResults;
}

// =============================================================================
// 3. UNIVERSAL EXTRACTOR LAYER 3: VÙNG BÔI CHỌN & METADATA (SELECTION & META)
// =============================================================================
function extractMetadata() {
  const meta = {
    title: document.title || '',
    description: '',
    ogTitle: '',
    ogImage: '',
    jsonLd: []
  };

  const descEl = document.querySelector('meta[name="description"]');
  if (descEl) meta.description = descEl.getAttribute('content') || '';

  const ogTitleEl = document.querySelector('meta[property="og:title"]');
  if (ogTitleEl) meta.ogTitle = ogTitleEl.getAttribute('content') || '';

  const ogImgEl = document.querySelector('meta[property="og:image"]');
  if (ogImgEl) meta.ogImage = ogImgEl.getAttribute('content') || '';

  // JSON-LD
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || '');
      meta.jsonLd.push(data);
    } catch {
      // ignore JSON parse error
    }
  }

  return meta;
}

// =============================================================================
// 4. SPECIALIZED ADAPTER: JOBTRACK JOBPOSTING EXTRACTOR
// =============================================================================
const NOTES_MAX_LENGTH = 5000;

function extractCurrentPageJob() {
  const url = window.location.href;
  let company = '';
  let position = '';
  let location = '';
  let salary = '';
  let workMode = 'On-site';
  let notes = '';

  // 1. Tìm kiếm schema.org JobPosting
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || '');
      const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
          if (item.title && !position) position = item.title;
          if (item.hiringOrganization?.name && !company) company = item.hiringOrganization.name;
          if (item.jobLocation?.address && !location) {
            const a = item.jobLocation.address;
            location = typeof a === 'string' ? a : (a.addressLocality || a.streetAddress || '');
          }
          if (item.baseSalary?.value && !salary) {
            const v = item.baseSalary.value;
            const cur = item.baseSalary.currency || '';
            salary = typeof v === 'number' ? `${v} ${cur}` : `${v.minValue || ''} - ${v.maxValue || ''} ${cur}`.trim();
          }
          if (item.jobLocationType === 'TELECOMMUTE' || item.workMode === 'Remote') {
            workMode = 'Remote';
          }
          if (item.description && !notes) {
            notes = String(item.description)
              .replace(/<[^>]*>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, NOTES_MAX_LENGTH);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. DOM Selectors cho sàn tuyển dụng
  if (url.includes('linkedin.com')) {
    const jobTitleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, [data-testid="job-details-title"], h1 a[href*="/jobs/view/"], h1');
    if (jobTitleEl && !position) position = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .artdeco-entity-lockup__subtitle, [data-testid="company-name"]');
    if (companyEl && !company) company = companyEl.textContent.trim();

    const locEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description-container, .job-details-jobs-unified-top-card__workplace-type, .artdeco-entity-lockup__caption');
    if (locEl && !location) {
      const locText = locEl.textContent.trim().replace(/\s+/g, ' ');
      location = locText;
      if (/remote|từ xa/i.test(locText)) workMode = 'Remote';
      else if (/hybrid|linh hoạt/i.test(locText)) workMode = 'Hybrid';
    }

    const salaryEl = document.querySelector('.job-details-jobs-unified-top-card__job-insight');
    if (salaryEl && !salary) {
      const text = salaryEl.textContent.trim();
      if (/[\$₫€£]|\b(vnd|usd|năm|tháng|yr|hr)\b/i.test(text)) salary = text;
    }
  }

  if (url.includes('vietnamworks.com')) {
    const jobTitleEl = document.querySelector('h1.job-title, h1.title, h1[class*="JobTitle"], .job-header-info h1, h1');
    if (jobTitleEl && !position) position = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector('a.company-name, span.company-name, a[href*="/nha-tuyen-dung/"], a[href*="/company/"], div[class*="CompanyName"], .employer-name');
    if (companyEl && !company) company = companyEl.textContent.trim();

    const salaryEl = document.querySelector('.salary, .job-salary, span[class*="salary"], span[class*="Salary"], div[class*="Salary"], .box-item-salary');
    if (salaryEl && !salary) salary = salaryEl.textContent.trim();

    const locationEl = document.querySelector('.location, .job-location, span[class*="location"], span[class*="Location"], div[class*="Location"]');
    if (locationEl && !location) location = locationEl.textContent.trim();
  }

  if (url.includes('topcv.vn')) {
    const jobTitleEl = document.querySelector('h1.job-detail__info--title, .job-header-info h1, h1.title, h1');
    if (jobTitleEl && !position) position = jobTitleEl.textContent.trim();

    const companyEl = document.querySelector('a.company-name, a[href*="/brand/"], a[href*="/cong-ty/"], .job-detail__company--title, .company-title, .employer-name');
    if (companyEl && !company) company = companyEl.textContent.trim();

    // Lấy thông tin từ các khối info section của TopCV (lương, địa điểm, hình thức...)
    const infoSections = Array.from(document.querySelectorAll('.job-detail__info--section, .box-general-group-info, .box-item'));
    for (const sec of infoSections) {
      const label = (sec.querySelector('.job-detail__info--section-content-title, .box-item-title, .title')?.textContent || sec.textContent || '').trim().toLowerCase();
      const valEl = sec.querySelector('.job-detail__info--section-content-value, .box-item-value, .value, div:last-child');
      const val = valEl ? valEl.textContent.trim().replace(/\s+/g, ' ') : '';

      if ((label.includes('lương') || label.includes('salary')) && val && !salary) {
        salary = val;
      }
      if ((label.includes('địa điểm') || label.includes('khu vực') || label.includes('location')) && val && !location) {
        location = val;
      }
      if ((label.includes('hình thức') || label.includes('work mode')) && val) {
        if (/từ xa|remote/i.test(val)) workMode = 'Remote';
        else if (/hybrid|linh hoạt/i.test(val)) workMode = 'Hybrid';
        else workMode = 'On-site';
      }
    }

    if (!salary) {
      const fallbackSalary = document.querySelector('.job-detail__salary, .salary, .box-item-salary');
      if (fallbackSalary) salary = fallbackSalary.textContent.trim();
    }
    if (!location) {
      const fallbackLoc = document.querySelector('.box-item-location, .location');
      if (fallbackLoc) location = fallbackLoc.textContent.trim();
    }
  }

  if (url.includes('itviec.com')) {
    const jobTitleEl = document.querySelector('h1.job-details__title');
    if (jobTitleEl && !position) position = jobTitleEl.textContent.trim();
    const companyEl = document.querySelector('.employer-long-overview__name, .employer-name');
    if (companyEl && !company) company = companyEl.textContent.trim();
  }

  // 3. Fallback OpenGraph / Page Title
  if (!position || !company) {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    const pageTitle = document.title || '';
    const raw = ogTitle || pageTitle;
    const parts = raw.split(/\s*[-|–—:]\s*/).filter(p => p.trim());
    if (parts.length >= 2) {
      if (!position) position = parts[0].trim();
      if (!company) company = parts[1].trim();
    } else if (!position) {
      position = raw.trim();
    }
  }

  // 4. Notes & selection
  const selection = window.getSelection()?.toString().trim();
  if (selection) {
    notes = selection;
  } else {
    const article = document.querySelector(
      '#job-details, .jobs-description__content, .jobs-box__html-content, ' +
      '.job-detail__information-detail, .job-description, #job-description, ' +
      '.job-details__paragraph, .job-detail-description, article, main'
    );
    if (article) {
      notes = article.textContent?.replace(/\s+/g, ' ').trim().slice(0, NOTES_MAX_LENGTH) || '';
    }
  }

  // 5. WorkMode
  const fullText = document.body.innerText.toLowerCase();
  if (fullText.includes('remote') || fullText.includes('từ xa')) {
    workMode = 'Remote';
  } else if (fullText.includes('hybrid') || fullText.includes('linh hoạt')) {
    workMode = 'Hybrid';
  }

  const structured = collectStructuredJobPosting();

  return {
    url,
    company: company || structured.company || '',
    position: position || structured.position || '',
    location: location || structured.location || '',
    salary: salary || '',
    workMode,
    notes: notes ? notes.slice(0, NOTES_MAX_LENGTH) : '',
    source: detectJobBoardSource(url),
    appliedAt: todayInVietnam(),
    jsonLd: structured
  };
}

function collectStructuredJobPosting() {
  const empty = {
    company: '',
    position: '',
    industry: '',
    employmentType: '',
    location: '',
    website: '',
    logoUrl: '',
    datePosted: ''
  };

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of scripts) {
    let parsed;
    try {
      parsed = JSON.parse(script.textContent || '');
    } catch {
      continue;
    }

    const items = Array.isArray(parsed) ? parsed : (parsed && parsed['@graph'] ? parsed['@graph'] : [parsed]);
    for (const item of items) {
      if (!item) continue;
      const type = item['@type'];
      const isPosting = type === 'JobPosting' || (Array.isArray(type) ? type.includes('JobPosting') : String(type || '').includes('JobPosting'));
      if (!isPosting) continue;

      const org = item.hiringOrganization || {};
      const address = item.jobLocation?.address;
      const addressText = typeof address === 'string'
        ? address
        : [address?.addressLocality, address?.addressRegion, address?.addressCountry]
            .filter(Boolean)
            .filter((value, index, list) => list.indexOf(value) === index)
            .join(', ');

      const industry = typeof item.industry === 'string'
        ? item.industry
        : Array.isArray(item.industry)
          ? item.industry.filter(value => typeof value === 'string').join(', ')
          : (typeof item.occupationalCategory === 'string' ? item.occupationalCategory : '');

      const employmentType = Array.isArray(item.employmentType)
        ? item.employmentType.filter(value => typeof value === 'string').join(', ')
        : (typeof item.employmentType === 'string' ? item.employmentType : '');

      return {
        company: typeof org.name === 'string' ? org.name : '',
        position: typeof item.title === 'string' ? item.title : '',
        industry: industry || '',
        employmentType: employmentType || '',
        location: addressText || '',
        website: typeof org.sameAs === 'string' ? org.sameAs : (typeof org.url === 'string' ? org.url : ''),
        logoUrl: typeof org.logo === 'string' ? org.logo : (org.logo?.url || ''),
        datePosted: typeof item.datePosted === 'string' ? item.datePosted : ''
      };
    }
  }

  return empty;
}

function detectJobBoardSource(rawUrl) {
  let host = '';
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
  const boards = [
    ['topcv.vn', 'TopCV'],
    ['vietnamworks.com', 'VietnamWorks'],
    ['careerlink.vn', 'CareerLink'],
    ['itviec.com', 'ITviec'],
    ['linkedin.com', 'LinkedIn'],
    ['jobstreet.com', 'JobStreet'],
    ['indeed.com', 'Indeed'],
    ['glassdoor.com', 'Glassdoor'],
    ['timviec365.vn', 'TimViec365'],
    ['careerbuilder.vn', 'CareerBuilder'],
    ['vieclam24h.vn', 'ViecLam24h'],
    ['jobsgo.vn', 'JobsGO'],
    ['tuyendung.vn', 'TuyenDung'],
    ['facebook.com', 'Facebook'],
    ['ybox.vn', 'Ybox']
  ];
  for (const [domain, label] of boards) {
    if (host === domain || host.endsWith('.' + domain)) return label;
  }
  return '';
}

function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const year = parts.find(part => part.type === 'year');
  const month = parts.find(part => part.type === 'month');
  const day = parts.find(part => part.type === 'day');
  if (!year || !month || !day) return '';
  return year.value + '-' + month.value + '-' + day.value;
}

// Kết hợp toàn bộ dữ liệu trang
function extractAllPageData() {
  return {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    tables: detectHtmlTables(),
    repeatingLists: detectRepeatingLists(),
    selectedText: window.getSelection()?.toString().trim() || null,
    metadata: extractMetadata(),
    jobPosting: extractCurrentPageJob()
  };
}

// =============================================================================
// 5. ASSISTED AUTO-APPLY: ĐIỀN FORM TỰ ĐỘNG AN TOÀN (HUMAN-IN-THE-LOOP)
// =============================================================================
const FIELD_PATTERNS = {
  fullName: [/full[\s_-]?name/i, /họ[\s_-]?(và[\s_-]?)?tên/i, /applicant[\s_-]?name/i, /candidate[\s_-]?name/i, /^name$/i],
  email: [/e[\s_-]?mail/i, /thư[\s_-]?điện[\s_-]?tử/i],
  phone: [/phone/i, /tel(ephone)?/i, /mobile/i, /số[\s_-]?điện[\s_-]?thoại/i, /sđt/i],
  cvUrl: [/cv/i, /resume/i, /portfolio[\s_-]?link/i, /link[\s_-]?cv/i, /hồ[\s_-]?sơ/i],
  portfolioUrl: [/portfolio/i, /github/i, /website/i, /personal[\s_-]?link/i],
  bio: [/cover[\s_-]?letter/i, /thư[\s_-]?giới[\s_-]?thiệu/i, /giới[\s_-]?thiệu/i, /about[\s_-]?you/i, /message/i]
};

function matchFieldType(input) {
  const attrs = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute('aria-label'),
    input.getAttribute('autocomplete'),
    input.closest('label')?.textContent,
    input.parentElement?.querySelector('label')?.textContent
  ].filter(Boolean).join(' ');

  for (const [fieldType, regexList] of Object.entries(FIELD_PATTERNS)) {
    if (regexList.some(rx => rx.test(attrs))) {
      return fieldType;
    }
  }
  return null;
}

function fillFieldValue(input, value) {
  if (!input || !value) return;
  input.focus();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  input.style.transition = 'all 0.3s ease';
  input.style.borderColor = '#315bef';
  input.style.boxShadow = '0 0 0 3px rgba(49, 91, 239, 0.2)';
}

async function autofillApplicationForm(profile) {
  const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
  let filledCount = 0;

  for (const input of inputs) {
    const fieldType = matchFieldType(input);
    if (!fieldType) continue;

    let valueToFill = null;
    switch (fieldType) {
      case 'fullName': valueToFill = profile.fullName; break;
      case 'email': valueToFill = profile.email; break;
      case 'phone': valueToFill = profile.phone; break;
      case 'cvUrl': valueToFill = profile.cvUrl; break;
      case 'portfolioUrl': valueToFill = profile.portfolioUrl; break;
      case 'bio': valueToFill = profile.bio; break;
    }

    if (valueToFill && !input.value) {
      fillFieldValue(input, valueToFill);
      filledCount++;
    }
  }

  if (filledCount > 0) {
    showAutofillBanner(filledCount);
  }
  return filledCount;
}

function showAutofillBanner(count) {
  const existing = document.getElementById('jobtrack-autofill-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'jobtrack-autofill-banner';
  banner.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    background: #1e293b;
    color: white;
    padding: 14px 20px;
    border-radius: 8px;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: jobtrackSlideUp 0.3s ease;
  `;

  banner.innerHTML = `
    <span style="font-size: 18px;">⚡</span>
    <div>
      <div style="font-weight: 600; color: #60a5fa;">PageWeave / JobTrack: Đã điền xong ${count} trường</div>
      <div style="color: #cbd5e1; font-size: 12px; margin-top: 2px;">
        Vui lòng kiểm tra lại tính chính xác trước khi bấm <b>Gửi đơn (Submit)</b>.
      </div>
    </div>
    <button id="jobtrack-close-banner" style="background: transparent; border: 0; color: #94a3b8; font-size: 16px; cursor: pointer; margin-left: 8px;">✕</button>
  `;

  document.body.appendChild(banner);
  document.getElementById('jobtrack-close-banner')?.addEventListener('click', () => banner.remove());
  setTimeout(() => banner.remove(), 8000);
}

// Nút FAB hỗ trợ điền nhanh (sử dụng token từ chrome.storage.local)
function detectApplicationFormAndShowBadge() {
  const hasInputs = document.querySelectorAll('input[type="email"], input[name*="email"], input[name*="phone"], input[name*="name"]').length >= 2;
  if (!hasInputs || document.getElementById('jobtrack-fab')) return;

  const fab = document.createElement('button');
  fab.id = 'jobtrack-fab';
  fab.title = 'Tự động điền form ứng tuyển bằng JobTrack';
  fab.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    z-index: 999998;
    background: #315bef;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 50px;
    box-shadow: 0 4px 14px rgba(49, 91, 239, 0.4);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: transform 0.2s, background 0.2s;
  `;
  fab.innerHTML = `⚡ <span>Điền form với JobTrack</span>`;
  fab.onmouseenter = () => { fab.style.transform = 'translateY(-2px)'; fab.style.background = '#2547c9'; };
  fab.onmouseleave = () => { fab.style.transform = 'translateY(0)'; fab.style.background = '#315bef'; };

  fab.onclick = async () => {
    fab.disabled = true;
    fab.innerHTML = `⚡ <span>Đang lấy dữ liệu…</span>`;
    try {
      // Đọc an toàn từ chrome.storage.local, không nhúng token cứng
      const config = await chrome.storage.local.get({
        serverUrl: 'https://job-application-tracker-ai-pro24.vercel.app',
        apiToken: ''
      });

      if (!config.apiToken) {
        throw new Error('Vui lòng mở tiện ích JobTrack và ghép nối tài khoản trước.');
      }

      const res = await fetch(`${config.serverUrl}/api/profile`, {
        headers: { 'Authorization': `Bearer ${config.apiToken}` }
      });

      if (!res.ok) {
        throw new Error('Chưa thiết lập hồ sơ ứng viên trong JobTrack.');
      }

      const profile = await res.json();
      const filled = await autofillApplicationForm(profile);
      fab.innerHTML = `✓ <span>Đã điền (${filled})</span>`;
      setTimeout(() => fab.remove(), 4000);
    } catch (err) {
      alert(`JobTrack Auto-Apply: ${err.message || 'Không thể lấy thông tin ứng viên.'}`);
      fab.innerHTML = `⚡ <span>Điền form với JobTrack</span>`;
      fab.disabled = false;
    }
  };

  document.body.appendChild(fab);
}

function isJobPostingPage() {
  const url = window.location.href.toLowerCase();
  if (url.includes('linkedin.com/jobs/view') || url.includes('linkedin.com/jobs/collections') || url.includes('linkedin.com/jobs/search')) return true;
  if (url.includes('topcv.vn/viec-lam') || url.includes('topcv.vn/brand/')) return true;
  if (url.includes('itviec.com/it-jobs') || url.includes('itviec.com/viec-lam-it/')) return true;
  if (url.includes('vietnamworks.com/') && (url.includes('-jv') || url.includes('/job/'))) return true;

  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const data = JSON.parse(s.textContent || '');
      const items = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
      for (const item of items) {
        if (item && (item['@type'] === 'JobPosting' || item['@type']?.includes?.('JobPosting'))) {
          return true;
        }
      }
    } catch { /* ignore */ }
  }
  return false;
}

function detectJobPostingAndShowQuickSaveBadge() {
  if (!isJobPostingPage() || document.getElementById('jobtrack-quick-save-fab')) return;

  const quickFab = document.createElement('button');
  quickFab.id = 'jobtrack-quick-save-fab';
  quickFab.title = '1-Click lưu việc làm này vào JobTrack Cloud';
  quickFab.style.cssText = `
    position: fixed;
    bottom: 84px;
    right: 28px;
    z-index: 999998;
    background: linear-gradient(135deg, #1e40af, #2563eb);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 10px 18px;
    border-radius: 50px;
    box-shadow: 0 8px 24px -4px rgba(37, 99, 235, 0.45);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  quickFab.innerHTML = `<span style="font-size: 15px;">⚡</span> <span>Lưu vào JobTrack</span>`;
  quickFab.onmouseenter = () => { quickFab.style.transform = 'translateY(-2px) scale(1.02)'; quickFab.style.boxShadow = '0 12px 28px -4px rgba(37, 99, 235, 0.6)'; };
  quickFab.onmouseleave = () => { quickFab.style.transform = 'translateY(0) scale(1)'; quickFab.style.boxShadow = '0 8px 24px -4px rgba(37, 99, 235, 0.45)'; };

  quickFab.onclick = async () => {
    quickFab.disabled = true;
    quickFab.innerHTML = `<span style="font-size: 15px;">⏳</span> <span>Đang trích xuất & lưu…</span>`;

    try {
      const job = extractCurrentPageJob();
      if (!job || !job.company || !job.position) {
        throw new Error('Chưa bóc tách được tên công ty hoặc vị trí trên trang này.');
      }

      const config = await chrome.storage.local.get({
        serverUrl: 'https://job-application-tracker-ai-pro24.vercel.app',
        apiToken: ''
      });

      if (!config.apiToken) {
        showJobTrackToast('⚠️ Vui lòng mở icon tiện ích JobTrack trên thanh công cụ để kết nối tài khoản trước.', true);
        quickFab.innerHTML = `<span style="font-size: 15px;">⚡</span> <span>Lưu vào JobTrack</span>`;
        quickFab.disabled = false;
        return;
      }

      const payload = {
        company: job.company,
        position: job.position,
        url: job.url,
        salary: job.salary || null,
        location: job.location || null,
        workMode: job.workMode || 'On-site',
        status: 'Saved',
        notes: '',
        jobDescription: job.notes || null,
        source: job.source || null,
        appliedAt: job.appliedAt || null,
        structuredCompany: job.jsonLd && job.jsonLd.company ? job.jsonLd.company : null,
        structuredIndustry: job.jsonLd && job.jsonLd.industry ? job.jsonLd.industry : null,
        structuredLocation: job.jsonLd && job.jsonLd.location ? job.jsonLd.location : null,
        structuredWebsite: job.jsonLd && job.jsonLd.website ? job.jsonLd.website : null
      };

      const res = await fetch(`${config.serverUrl}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiToken}`,
          'Idempotency-Key': idempotencyKey()
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Lỗi máy chủ HTTP ${res.status}`);
      }

      quickFab.style.background = 'linear-gradient(135deg, #15803d, #16a34a)';
      quickFab.style.boxShadow = '0 8px 24px -4px rgba(22, 163, 74, 0.45)';
      quickFab.innerHTML = `<span style="font-size: 15px;">✓</span> <span>Đã lưu vào JobTrack!</span>`;
      showJobTrackToast(`✓ Đã lưu "${job.position} - ${job.company}" vào cột Đã lưu!`, false, `${config.serverUrl}/#applications`);

      setTimeout(() => {
        quickFab.style.opacity = '0';
        setTimeout(() => quickFab.remove(), 400);
      }, 3500);
    } catch (err) {
      showJobTrackToast(`✗ Không thể lưu: ${err.message}`, true);
      quickFab.innerHTML = `<span style="font-size: 15px;">⚡</span> <span>Lưu vào JobTrack</span>`;
      quickFab.disabled = false;
    }
  };

  document.body.appendChild(quickFab);
}

function showJobTrackToast(message, isError = false, linkUrl = null) {
  const existing = document.getElementById('jobtrack-toast-banner');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'jobtrack-toast-banner';
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 999999;
    background: ${isError ? '#991b1b' : '#0f172a'};
    color: white;
    padding: 12px 18px;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  `;

  let linkHtml = '';
  if (linkUrl) {
    linkHtml = `<a href="${linkUrl}" target="_blank" style="color: #60a5fa; font-weight: 600; text-decoration: underline; margin-left: 6px;">Xem trên Kanban ➔</a>`;
  }

  toast.innerHTML = `
    <div>
      <span style="font-weight: 600;">${message}</span>
      ${linkHtml}
    </div>
    <button id="jobtrack-close-toast" style="background: transparent; border: 0; color: #94a3b8; font-size: 16px; cursor: pointer; margin-left: 8px;">✕</button>
  `;

  document.body.appendChild(toast);
  document.getElementById('jobtrack-close-toast')?.addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 7000);
}

function initExtensionContent() {
  detectApplicationFormAndShowBadge();
  detectJobPostingAndShowQuickSaveBadge();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initExtensionContent, 1500));
} else {
  setTimeout(initExtensionContent, 1500);
}

// =============================================================================
// 6. SỰ KIỆN GIAO TIẾP VỚI EXTENSION POPUP / SIDE PANEL
// =============================================================================
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ pong: true });
    return true;
  } else if (request.action === 'EXTRACT_ALL_PAGE_DATA') {
    const data = extractAllPageData();
    sendResponse({ success: true, data });
  } else if (request.action === 'EXTRACT_PAGE_JOB') {
    const data = extractCurrentPageJob();
    sendResponse({ success: true, data });
  } else if (request.action === 'AUTOFILL_FORM') {
    if (request.profile) {
      autofillApplicationForm(request.profile).then(count => {
        sendResponse({ success: true, count });
      });
      return true;
    }
  }
  return true;
});
