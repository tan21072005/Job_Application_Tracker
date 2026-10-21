const encoder = new TextEncoder();

/**
 * Normalizes identity keys (source, job_code) using Unicode NFKC and undetermined locale lowercasing.
 * Preserves consistency with database v1 constraint: octet_length <= 256.
 */
export function normalizeIdentityKey(value: unknown): { normalized: string | null; error?: string } {
  if (value === undefined || value === null) return { normalized: null };
  if (typeof value !== 'string') return { normalized: null, error: 'Giá trị phải là chuỗi ký tự.' };

  const trimmed = value.trim();
  if (!trimmed) return { normalized: null };

  const normalized = trimmed.normalize('NFKC').toLocaleLowerCase('und');
  const byteLength = encoder.encode(normalized).length;

  if (byteLength > 256) {
    return {
      normalized: null,
      error: `Độ dài byte (${byteLength} bytes) vượt quá giới hạn 256 bytes của cơ sở dữ liệu.`
    };
  }

  return { normalized };
}

/**
 * Normalizes job listing URL:
 * - Requires http: or https:
 * - Strips credentials (username/password)
 * - Strips fragment/hash
 * - Strips marketing tracking query parameters (utm_*, fbclid, gclid)
 * - Sorts query parameters deterministically
 * - Enforces database byte limit (<= 2048 bytes)
 */
export function normalizeUrl(raw: unknown): { normalized: string | null; error?: string } {
  if (raw === undefined || raw === null) return { normalized: null };
  if (typeof raw !== 'string') return { normalized: null, error: 'URL phải là chuỗi ký tự.' };

  const trimmed = raw.trim();
  if (!trimmed) return { normalized: null };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { normalized: null, error: 'URL tin tuyển dụng chưa hợp lệ.' };
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return { normalized: null, error: 'URL tin tuyển dụng cần dùng http hoặc https.' };
  }

  if (url.username || url.password) {
    return { normalized: null, error: 'URL tin tuyển dụng không được chứa thông tin đăng nhập.' };
  }

  url.hash = '';

  for (const name of [...url.searchParams.keys()]) {
    if (name.startsWith('utm_') || ['fbclid', 'gclid'].includes(name.toLowerCase())) {
      url.searchParams.delete(name);
    }
  }

  url.searchParams.sort();
  const normalized = url.toString();
  const byteLength = encoder.encode(normalized).length;

  if (byteLength > 2048) {
    return {
      normalized: null,
      error: `URL sau chuẩn hóa (${byteLength} bytes) vượt quá giới hạn 2048 bytes.`
    };
  }

  return { normalized };
}

/**
 * Normalizes email address for user registration and authentication.
 */
export function normalizeEmail(email: unknown): { normalized: string | null; error?: string } {
  if (typeof email !== 'string') return { normalized: null, error: 'Email phải là chuỗi ký tự.' };
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { normalized: null, error: 'Email không hợp lệ.' };
  }
  if (trimmed.length > 254 || trimmed.length <= 3) {
    return { normalized: null, error: 'Độ dài email phải từ 4 đến 254 ký tự.' };
  }
  return { normalized: trimmed };
}

/**
 * Sanitizes a single cell value for CSV export:
 * - Defends against CSV Formula Injection (=, +, -, @, \t, \r at the beginning)
 * - Escapes internal quotes and handles commas/newlines
 */
export function sanitizeForCsv(value: unknown): string {
  if (value === undefined || value === null) return '';
  let strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // CSV Formula Injection prevention: prepend single quote if starts with dangerous char
  if (/^[=+\-@\t\r]/.test(strVal)) {
    strVal = `'${strVal}`;
  }

  // If contains quote, comma, or newline, escape quotes and wrap in double quotes
  if (/[",\n\r]/.test(strVal)) {
    strVal = `"${strVal.replace(/"/g, '""')}"`;
  }

  return strVal;
}

/**
 * Generates CSV string with UTF-8 BOM (\uFEFF) for proper display in Excel (especially Vietnamese diacritics).
 */
export function formatAsCsv(headers: { key: string; label: string }[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(h => sanitizeForCsv(h.label)).join(',');
  const rowLines = rows.map(row => {
    return headers.map(h => sanitizeForCsv(row[h.key])).join(',');
  });

  return `\uFEFF${[headerLine, ...rowLines].join('\r\n')}`;
}

/**
 * Parses Vietnamese currency & numeric expressions:
 * Examples:
 * - "1,2 tỷ" -> 1200000000 VND
 * - "35 triệu" / "35 tr" -> 35000000 VND
 * - "500k" / "500 nghìn" -> 500000 VND
 * - "15.000.000 đ" -> 15000000 VND
 * - "$500" -> 500 USD
 */
export function parseVietnameseCurrency(text: string): {
  amount: number | null;
  currency: string;
  raw: string;
} {
  const raw = text.trim();
  if (!raw) return { amount: null, currency: 'VND', raw };

  // Detect USD / EUR
  if (raw.includes('$') || /usd/i.test(raw)) {
    const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    return { amount: isNaN(num) ? null : num, currency: 'USD', raw };
  }

  const lower = raw.toLowerCase();

  // Match "1,2 tỷ" or "1.5 tỷ"
  const tyMatch = lower.match(/([\d.,]+)\s*tỷ/);
  if (tyMatch) {
    const base = parseFloat(tyMatch[1].replace(',', '.'));
    if (!isNaN(base)) {
      return { amount: Math.round(base * 1000000000), currency: 'VND', raw };
    }
  }

  // Match "35 triệu", "35tr"
  const trMatch = lower.match(/([\d.,]+)\s*(triệu|trieu|tr\b)/);
  if (trMatch) {
    const base = parseFloat(trMatch[1].replace(',', '.'));
    if (!isNaN(base)) {
      return { amount: Math.round(base * 1000000), currency: 'VND', raw };
    }
  }

  // Match "500k", "500 nghìn"
  const kMatch = lower.match(/([\d.,]+)\s*(k\b|nghìn|nghin)/);
  if (kMatch) {
    const base = parseFloat(kMatch[1].replace(',', '.'));
    if (!isNaN(base)) {
      return { amount: Math.round(base * 1000), currency: 'VND', raw };
    }
  }

  // Standard numeric with dots/commas: e.g. "15.000.000" or "15,000,000"
  const cleanDigits = raw.replace(/[^\d]/g, '');
  if (cleanDigits) {
    const num = parseInt(cleanDigits, 10);
    return { amount: isNaN(num) ? null : num, currency: 'VND', raw };
  }

  return { amount: null, currency: 'VND', raw };
}
