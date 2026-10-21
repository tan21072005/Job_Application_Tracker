// PageWeave — Universal Web Data Assistant Content Script
// Bóc tách dữ liệu web đa tầng (HTML Tables, Repeating Lists, Selection, Schema.org) & Trợ lý JobTrack

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
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. DOM Selectors cho sàn tuyển dụng
  if (url.includes('linkedin.com')) {
    const jobTitleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1');
    if (jobTitleEl && !position) position = jobTitleEl.textContent.trim();
    const companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name');
    if (companyEl && !company) company = companyEl.textContent.trim();
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
    const article = document.querySelector('article, main, .job-description, #job-description');
    if (article) {
      notes = article.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1000) || '';
    }
  }

  // 5. WorkMode
  const fullText = document.body.innerText.toLowerCase();
  if (fullText.includes('remote') || fullText.includes('từ xa')) {
    workMode = 'Remote';
  } else if (fullText.includes('hybrid') || fullText.includes('linh hoạt')) {
    workMode = 'Hybrid';
  }

  return {
    url,
    company: company || window.location.hostname.replace(/^www\./, ''),
    position: position || 'Vị trí tuyển dụng',
    location: location || '',
    salary: salary || '',
    workMode,
    notes: notes ? notes.slice(0, 1000) : ''
  };
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

  showAutofillBanner(filledCount);
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
        serverUrl: 'http://127.0.0.1:64366',
        apiToken: ''
      });

      if (!config.apiToken) {
        throw new Error('Vui lòng mở tiện ích PageWeave và ghép nối tài khoản trước.');
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(detectApplicationFormAndShowBadge, 1500));
} else {
  setTimeout(detectApplicationFormAndShowBadge, 1500);
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
