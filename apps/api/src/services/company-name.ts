const LEGAL_PREFIXES = [
  'cong ty trach nhiem huu han mot thanh vien',
  'cong ty trach nhiem huu han',
  'cong ty co phan',
  'cong ty hop danh',
  'cong ty tnhh mtv',
  'cong ty tnhh',
  'cong ty cp',
  'cong ty',
  'tong cong ty',
  'tap doan',
  'doanh nghiep tu nhan',
  'chi nhanh',
  'van phong dai dien'
];

const LEGAL_SUFFIXES = ['jsc', 'ltd', 'llc', 'inc', 'co', 'corp', 'plc', 'gmbh'];

const VIETNAMESE_MAP: Record<string, string> = {
  à: 'a', á: 'a', ạ: 'a', ả: 'a', ã: 'a',
  â: 'a', ầ: 'a', ấ: 'a', ậ: 'a', ẩ: 'a', ẫ: 'a',
  ă: 'a', ằ: 'a', ắ: 'a', ặ: 'a', ẳ: 'a', ẵ: 'a',
  è: 'e', é: 'e', ẹ: 'e', ẻ: 'e', ẽ: 'e',
  ê: 'e', ề: 'e', ế: 'e', ệ: 'e', ể: 'e', ễ: 'e',
  ì: 'i', í: 'i', ị: 'i', ỉ: 'i', ĩ: 'i',
  ò: 'o', ó: 'o', ọ: 'o', ỏ: 'o', õ: 'o',
  ô: 'o', ồ: 'o', ố: 'o', ộ: 'o', ổ: 'o', ỗ: 'o',
  ơ: 'o', ờ: 'o', ớ: 'o', ợ: 'o', ở: 'o', ỡ: 'o',
  ù: 'u', ú: 'u', ụ: 'u', ủ: 'u', ũ: 'u',
  ư: 'u', ừ: 'u', ứ: 'u', ự: 'u', ử: 'u', ữ: 'u',
  ỳ: 'y', ý: 'y', ỵ: 'y', ỷ: 'y', ỹ: 'y',
  đ: 'd'
};

function stripDiacritics(value: string): string {
  let out = '';
  for (const char of value.normalize('NFC').toLowerCase()) {
    out += VIETNAMESE_MAP[char] ?? char;
  }
  return out;
}

export function normalizeCompanyName(raw: string): string {
  let value = stripDiacritics((raw || '').replace(/\s+/g, ' ').trim());
  value = value.replace(/[^a-z0-9&+.\s-]/g, ' ').replace(/\s+/g, ' ').trim();

  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of LEGAL_PREFIXES) {
      if (value.startsWith(prefix + ' ')) {
        value = value.slice(prefix.length).trim();
        changed = true;
      }
    }
  }

  const words = value.split(' ').filter(Boolean);
  while (words.length > 1 && LEGAL_SUFFIXES.includes(words[words.length - 1])) {
    words.pop();
  }

  return words.join(' ');
}

function tokenSetRatio(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  if (intersection === 0) return 0;

  const combined = setA.size + setB.size - intersection;
  return (2 * intersection) / combined;
}

function lengthPenalty(input: string, candidate: string): number {
  const inputTokens = input.split(' ').filter(Boolean).length;
  const candidateTokens = candidate.split(' ').filter(Boolean).length;
  if (inputTokens === 0 || candidateTokens === 0) return 0;
  const ratio = inputTokens / candidateTokens;
  return ratio >= 1 ? 1 : Math.sqrt(ratio);
}

function hostOf(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function scoreCompanyMatch(input: {
  name: string;
  website?: string | null;
  candidateName: string;
  candidateWebsite?: string | null;
}): { score: number; confidence: number; reason: 'domain_match' | 'strong_name_match' | 'ambiguous_name' } {
  const query = normalizeCompanyName(input.name);
  const candidate = normalizeCompanyName(input.candidateName);

  if (!query || !candidate) {
    return { score: 0, confidence: 0, reason: 'ambiguous_name' };
  }

  const fuzzyRaw = tokenSetRatio(query, candidate);
  const fuzzy = fuzzyRaw * lengthPenalty(query, candidate);
  const domainMatch = hostOf(input.website) && hostOf(input.website) === hostOf(input.candidateWebsite) ? 1 : 0;

  const score = Math.max(0, Math.min(1, 0.7 * fuzzy + 0.3 * domainMatch));
  const reason = domainMatch === 1 ? 'domain_match' : fuzzy >= 0.9 ? 'strong_name_match' : 'ambiguous_name';

  return { score, confidence: score, reason };
}

export function classifyMatchConfidence(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'WEAK' {
  if (score >= 0.8) return 'HIGH';
  if (score >= 0.6) return 'MEDIUM';
  if (score >= 0.45) return 'LOW';
  return 'WEAK';
}
