export type ExtractedField = 'industry' | 'size' | 'headquarters' | 'description' | 'techStack';

export interface GroundedFieldValue {
  value: string;
  quote: string;
}

export type GroundedExtraction = Partial<Record<ExtractedField, GroundedFieldValue>>;

export interface VerifiedExtraction {
  accepted: Partial<Record<ExtractedField, { value: string; evidence: string }>>;
  rejected: Array<{ field: ExtractedField; quote: string; reason: string }>;
}

const MAX_VALUE_LENGTH: Record<ExtractedField, number> = {
  industry: 120,
  size: 80,
  headquarters: 160,
  description: 800,
  techStack: 400
};

function collapse(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

export function htmlToPlainText(html: string): string {
  return collapse(html)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function parseGroundedExtraction(raw: string): GroundedExtraction | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const record = parsed as Record<string, unknown>;
  const out: GroundedExtraction = {};

  for (const field of Object.keys(MAX_VALUE_LENGTH) as ExtractedField[]) {
    const entry = record[field];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const value = (entry as Record<string, unknown>).value;
    const quote = (entry as Record<string, unknown>).quote;
    if (typeof value !== 'string' || typeof quote !== 'string') continue;
    const cleanValue = collapse(value).slice(0, MAX_VALUE_LENGTH[field]);
    const cleanQuote = collapse(quote);
    if (!cleanValue || !cleanQuote) continue;
    out[field] = { value: cleanValue, quote: cleanQuote };
  }

  return Object.keys(out).length ? out : null;
}

export function verifyExtractionAgainstSource(
  extraction: GroundedExtraction,
  sourceText: string
): VerifiedExtraction {
  const haystack = collapse(sourceText).toLowerCase();
  const accepted: VerifiedExtraction['accepted'] = {};
  const rejected: VerifiedExtraction['rejected'] = [];

  for (const field of Object.keys(extraction) as ExtractedField[]) {
    const entry = extraction[field];
    if (!entry) continue;

    const needle = collapse(entry.quote).toLowerCase();
    if (needle.length < 4) {
      rejected.push({ field, quote: entry.quote, reason: 'quote_too_short' });
      continue;
    }

    if (!haystack.includes(needle)) {
      rejected.push({ field, quote: entry.quote.slice(0, 160), reason: 'quote_not_found_in_source' });
      continue;
    }

    accepted[field] = { value: entry.value, evidence: entry.quote };
  }

  return { accepted, rejected };
}

export const GROUNDED_EXTRACTION_PROMPT = [
  'Bạn trích xuất thông tin công ty từ văn bản trang web.',
  '',
  'QUY TẮC BẮT BUỘC:',
  '1. Mỗi trường phải kèm "quote" là đoạn NGUYÊN VĂN chép từ văn bản bên dưới.',
  '2. "quote" phải xuất hiện y hệt trong văn bản. Không sửa, không viết lại, không dịch.',
  '3. Không tìm thấy thông tin trong văn bản thì để value null và quote null.',
  '4. KHÔNG suy luận. KHÔNG dùng kiến thức bên ngoài văn bản.',
  '5. Ngành nghề phải lấy từ câu văn mô tả hoạt động, không đoán từ tên công ty.',
  '',
  'Trả về JSON đúng dạng:',
  '{"industry":{"value":"...","quote":"..."},',
  ' "size":{"value":"...","quote":"..."},',
  ' "headquarters":{"value":"...","quote":"..."},',
  ' "description":{"value":"...","quote":"..."},',
  ' "techStack":{"value":"...","quote":"..."}}'
].join('\n');
