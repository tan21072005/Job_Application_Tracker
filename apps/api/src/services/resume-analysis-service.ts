import {
  diagnoseAtsKeywordGaps,
  extractBulletsFromResume,
  type AtsDiagnosticResultDTO,
  type AtsKeywordCategory,
  type BulletOptimizationProposalDTO,
  type BulletVariantType,
  type KeywordGapItemDTO,
  type KeywordImportance
} from '@jobtrack/contract';
import { completeWithLlm, extractJsonObject, isLlmConfigured } from './llm-client.ts';

export type AnalysisProvenance = 'llm' | 'rules';

export interface ResumeAnalysisResult {
  diagnostic: AtsDiagnosticResultDTO;
  proposals: BulletOptimizationProposalDTO[];
  provenance: AnalysisProvenance;
  model?: string;
}

export interface AnalyzeInput {
  resumeText: string;
  jobDescription: string;
  jobTitle?: string;
  company?: string;
}

interface LlmKeyword {
  keyword?: unknown;
  category?: unknown;
  importance?: unknown;
  suggestedPlacement?: unknown;
}

interface LlmVariant {
  variantType?: unknown;
  variantLabel?: unknown;
  rewrittenText?: unknown;
}

interface LlmBulletRewrite {
  originalBullet?: unknown;
  variants?: unknown;
}

interface LlmAnalysisPayload {
  verdict?: unknown;
  atsScore?: unknown;
  missingKeywords?: unknown;
  matchedKeywords?: unknown;
  redundantKeywords?: unknown;
  bulletRewrites?: unknown;
  recommendations?: unknown;
}

const MAX_JD_CHARS = 8_000;
const MAX_RESUME_CHARS = 12_000;
const MAX_MISSING_KEYWORDS = 8;
const MAX_BULLET_REWRITES = 5;
const MAX_RECOMMENDATIONS = 5;

const VARIANT_TYPES: readonly BulletVariantType[] = ['metric_driven', 'leadership', 'tech_depth'];
const CATEGORIES: readonly AtsKeywordCategory[] = ['hard_skill', 'soft_skill', 'domain_concept'];
const IMPORTANCE_LEVELS: readonly KeywordImportance[] = ['critical', 'recommended', 'optional'];

const SYSTEM_PROMPT = `Bạn là chuyên gia tuyển dụng người Việt với 10 năm đọc CV và JD.
Nhiệm vụ: so khớp CV với một mô tả công việc cụ thể và chỉ ra chính xác điều gì còn thiếu.

Nguyên tắc bắt buộc:
1. Chỉ đề xuất từ khóa XUẤT HIỆN NGUYÊN VĂN trong JD. Không tự nghĩ thêm kỹ năng.
2. Chỉ đánh dấu "thiếu" khi từ khóa đó KHÔNG có trong CV, kể cả biến thể viết tắt.
3. Khi viết lại bullet, chỉ dùng kinh nghiệm và con số CÓ THẬT trong CV gốc. Tuyệt đối không bịa số liệu, không bịa dự án, không bịa công ty.
4. Nếu CV không có số liệu để định lượng, hãy viết lại mạnh về hành động và phạm vi, không chèn số giả.
5. Viết tiếng Việt tự nhiên, thẳng thắn, không sáo rỗng, không dùng từ "đột phá", "xuất sắc", "hàng đầu".
6. Trả về DUY NHẤT một đối tượng JSON hợp lệ, không kèm markdown, không kèm giải thích ngoài JSON.

Định dạng JSON:
{
  "verdict": "2-3 câu nhận xét thẳng thắn về mức độ phù hợp và rủi ro lớn nhất",
  "atsScore": 0-100,
  "missingKeywords": [
    { "keyword": "tên từ khóa đúng như trong JD", "category": "hard_skill|soft_skill|domain_concept", "importance": "critical|recommended|optional", "suggestedPlacement": "summary|skills|experience" }
  ],
  "matchedKeywords": ["từ khóa JD mà CV đã có"],
  "redundantKeywords": ["từ khóa CV có nhưng JD không cần"],
  "bulletRewrites": [
    {
      "originalBullet": "NGUYÊN VĂN bullet trong CV, sao chép chính xác từng ký tự",
      "variants": [
        { "variantType": "metric_driven", "variantLabel": "Nhấn vào kết quả đo được", "rewrittenText": "..." },
        { "variantType": "leadership", "variantLabel": "Nhấn vào phạm vi ảnh hưởng", "rewrittenText": "..." },
        { "variantType": "tech_depth", "variantLabel": "Nhấn vào độ sâu kỹ thuật", "rewrittenText": "..." }
      ]
    }
  ],
  "recommendations": ["việc cần làm cụ thể, tối đa 5 dòng"]
}`;

function asString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function asStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of value) {
    const text = asString(item, maxLength);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(text);
    if (output.length >= maxItems) break;
  }
  return output;
}

function normalizeForMatch(text: string): string {
  return ' ' + text.toLowerCase().normalize('NFC').replace(/\s+/g, ' ') + ' ';
}

function containsTerm(haystack: string, term: string): boolean {
  const needle = term.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!needle) return false;
  return normalizeForMatch(haystack).includes(` ${needle} `) || normalizeForMatch(haystack).includes(needle);
}

function countOccurrences(haystack: string, term: string): number {
  const needle = term.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!needle) return 0;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = normalizeForMatch(haystack).match(new RegExp(escaped, 'g'));
  return matches ? matches.length : 0;
}

function coerceCategory(value: unknown): AtsKeywordCategory {
  return CATEGORIES.includes(value as AtsKeywordCategory) ? (value as AtsKeywordCategory) : 'hard_skill';
}

function coerceImportance(value: unknown): KeywordImportance {
  return IMPORTANCE_LEVELS.includes(value as KeywordImportance) ? (value as KeywordImportance) : 'recommended';
}

function coercePlacement(value: unknown): 'summary' | 'skills' | 'experience' {
  return value === 'summary' || value === 'skills' || value === 'experience' ? value : 'skills';
}

function coerceVariantType(value: unknown): BulletVariantType {
  return VARIANT_TYPES.includes(value as BulletVariantType) ? (value as BulletVariantType) : 'metric_driven';
}

function buildUserPrompt(input: AnalyzeInput): string {
  const jobTitle = input.jobTitle?.trim() || 'Không ghi rõ';
  const company = input.company?.trim() || 'Không ghi rõ';
  return [
    `Vị trí: ${jobTitle}`,
    `Công ty: ${company}`,
    '',
    '=== MÔ TẢ CÔNG VIỆC (JD) ===',
    input.jobDescription.slice(0, MAX_JD_CHARS),
    '',
    '=== CV ỨNG VIÊN ===',
    input.resumeText.slice(0, MAX_RESUME_CHARS),
    '',
    'Hãy phân tích và trả về JSON theo đúng định dạng đã mô tả.'
  ].join('\n');
}

function buildDiagnosticScoreBreakdown(gaps: KeywordGapItemDTO[]): AtsDiagnosticResultDTO['scoreBreakdown'] {
  const critical = gaps.filter(g => g.importance === 'critical');
  const recommended = gaps.filter(g => g.importance === 'recommended');
  const matchedCritical = critical.filter(g => g.matched).length;
  const matchedRecommended = recommended.filter(g => g.matched).length;

  const criticalRatio = critical.length > 0 ? matchedCritical / critical.length : 1;
  const recommendedRatio = recommended.length > 0 ? matchedRecommended / recommended.length : 1;

  return {
    keywordRelevance: Math.round((criticalRatio * 70 + recommendedRatio * 30) * 100) / 100,
    formattingHealth: 100,
    impactQuantification: 0
  };
}

function sanitizeKeywords(
  raw: unknown,
  resumeText: string,
  jobDescription: string
): KeywordGapItemDTO[] {
  if (!Array.isArray(raw)) return [];
  const output: KeywordGapItemDTO[] = [];
  const seen = new Set<string>();

  for (const entry of raw as LlmKeyword[]) {
    const keyword = asString(entry?.keyword, 80);
    if (!keyword) continue;

    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;

    if (!containsTerm(jobDescription, keyword)) continue;
    if (containsTerm(resumeText, keyword)) continue;

    seen.add(key);
    output.push({
      keyword,
      category: coerceCategory(entry?.category),
      importance: coerceImportance(entry?.importance),
      matched: false,
      frequencyInJob: countOccurrences(jobDescription, keyword),
      frequencyInResume: 0,
      suggestedPlacement: coercePlacement(entry?.suggestedPlacement)
    });

    if (output.length >= MAX_MISSING_KEYWORDS) break;
  }

  return output;
}

function sanitizeMatchedKeywords(raw: unknown, resumeText: string, jobDescription: string): string[] {
  const candidates = asStringArray(raw, 20, 80);
  const output: string[] = [];
  for (const keyword of candidates) {
    if (!containsTerm(jobDescription, keyword)) continue;
    if (!containsTerm(resumeText, keyword)) continue;
    output.push(keyword);
    if (output.length >= 12) break;
  }
  return output;
}

function sanitizeProposals(raw: unknown, resumeText: string): BulletOptimizationProposalDTO[] {
  if (!Array.isArray(raw)) return [];
  const output: BulletOptimizationProposalDTO[] = [];
  const resumeNormalized = resumeText.replace(/\r\n/g, '\n');

  for (const entry of raw as LlmBulletRewrite[]) {
    const originalBullet = asString(entry?.originalBullet, 600);
    if (!originalBullet) continue;
    if (!resumeNormalized.includes(originalBullet)) continue;

    const rawVariants = Array.isArray(entry?.variants) ? (entry.variants as LlmVariant[]) : [];
    const variants: BulletOptimizationProposalDTO['variants'] = [];
    const usedTypes = new Set<BulletVariantType>();

    for (const variant of rawVariants) {
      const variantType = coerceVariantType(variant?.variantType);
      if (usedTypes.has(variantType)) continue;
      const rewrittenText = asString(variant?.rewrittenText, 600);
      if (!rewrittenText) continue;
      if (rewrittenText === originalBullet) continue;

      usedTypes.add(variantType);
      variants.push({
        variantType,
        variantLabel: asString(variant?.variantLabel, 80) || 'Gợi ý viết lại',
        rewrittenText,
        highlightedKeywords: [],
        xyzBreakdown: {
          accomplishmentX: '',
          metricY: '',
          actionZ: ''
        }
      });
      if (variants.length >= 3) break;
    }

    if (variants.length === 0) continue;

    output.push({
      id: `llm-${output.length + 1}`,
      originalBullet,
      detectedWeakness: 'Viết lại theo hướng cụ thể và có bằng chứng hơn',
      variants
    });

    if (output.length >= MAX_BULLET_REWRITES) break;
  }

  return output;
}

function clampScore(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^\d.]/g, ''));
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
  }
  return null;
}

function buildVerdict(rawVerdict: string, missing: KeywordGapItemDTO[]): string {
  if (rawVerdict) return rawVerdict;
  if (missing.length === 0) {
    return 'CV đã bao phủ các từ khóa chính trong JD. Có thể ứng tuyển, chỉ cần rà lại bố cục.';
  }
  const top = missing.slice(0, 3).map(item => item.keyword).join(', ');
  return `CV còn thiếu ${missing.length} từ khóa so với JD, đáng chú ý nhất là ${top}. Bổ sung trước khi nộp để không bị lọc tự động.`;
}

export function analyzeWithRules(input: AnalyzeInput): ResumeAnalysisResult {
  const diagnostic = diagnoseAtsKeywordGaps(input.resumeText, input.jobDescription);
  const missing = diagnostic.keywordGaps.filter(item => !item.matched).slice(0, 6);
  const bullets = extractBulletsFromResume(input.resumeText).slice(0, 4);

  const proposals: BulletOptimizationProposalDTO[] = bullets.map((bullet, index) => ({
    id: `rules-${index + 1}`,
    originalBullet: bullet,
    detectedWeakness: 'Chưa nêu rõ kết quả đo được',
    variants: [
      {
        variantType: 'metric_driven' as BulletVariantType,
        variantLabel: 'Bổ sung kết quả đo được',
        rewrittenText: `${bullet.replace(/[.\s]+$/, '')}, giúp [kết quả cụ thể] — điền số liệu thật của bạn.`,
        highlightedKeywords: missing.slice(0, 2).map(item => item.keyword),
        xyzBreakdown: { accomplishmentX: bullet, metricY: '', actionZ: '' }
      }
    ]
  }));

  return {
    diagnostic: { ...diagnostic, provenance: 'rules' },
    proposals,
    provenance: 'rules'
  };
}

export async function analyzeResumeAgainstJob(input: AnalyzeInput): Promise<ResumeAnalysisResult> {
  if (!isLlmConfigured()) {
    return analyzeWithRules(input);
  }

  const rules = analyzeWithRules(input);

  try {
    const completion = await completeWithLlm(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(input) }
      ],
      { temperature: 0.2, maxOutputTokens: 2_400, jsonMode: true, timeoutMs: 45_000 }
    );

    const payload = extractJsonObject<LlmAnalysisPayload>(completion.text);
    if (!payload) throw new Error('LLM response did not contain a JSON object.');

    const missingFromLlm = sanitizeKeywords(payload.missingKeywords, input.resumeText, input.jobDescription);
    const matchedFromLlm = sanitizeMatchedKeywords(payload.matchedKeywords, input.resumeText, input.jobDescription);

    if (missingFromLlm.length === 0 && matchedFromLlm.length === 0) {
      throw new Error('LLM returned no usable keywords after verification.');
    }

    const matchedGaps: KeywordGapItemDTO[] = matchedFromLlm.map(keyword => ({
      keyword,
      category: 'hard_skill' as AtsKeywordCategory,
      importance: 'recommended' as KeywordImportance,
      matched: true,
      frequencyInJob: countOccurrences(input.jobDescription, keyword),
      frequencyInResume: countOccurrences(input.resumeText, keyword),
      suggestedPlacement: 'skills' as const
    }));

    const keywordGaps = [...missingFromLlm, ...matchedGaps].sort((left, right) => {
      if (left.matched !== right.matched) return left.matched ? 1 : -1;
      const rank: Record<KeywordImportance, number> = { critical: 3, recommended: 2, optional: 1 };
      return rank[right.importance] - rank[left.importance];
    });

    const scoreBreakdown = buildDiagnosticScoreBreakdown(keywordGaps);
    const llmScore = clampScore(payload.atsScore);
    const atsScore = llmScore ?? rules.diagnostic.atsScore;

    const recommendations = asStringArray(payload.recommendations, MAX_RECOMMENDATIONS, 300);
    const verdict = buildVerdict(asString(payload.verdict, 600), missingFromLlm);

    const diagnostic: AtsDiagnosticResultDTO = {
      atsScore,
      matchedKeywordsCount: matchedGaps.length || rules.diagnostic.matchedKeywordsCount,
      missingKeywordsCount: missingFromLlm.length,
      keywordGaps,
      scoreBreakdown,
      recommendations: recommendations.length > 0 ? recommendations : rules.diagnostic.recommendations,
      verdict,
      provenance: 'llm',
      model: completion.model
    };

    const llmProposals = sanitizeProposals(payload.bulletRewrites, input.resumeText);
    const proposals = llmProposals.length > 0 ? llmProposals : rules.proposals;

    return {
      diagnostic,
      proposals,
      provenance: 'llm',
      model: completion.model
    };
  } catch (error) {
    console.warn('[resume-analysis] LLM analysis failed, using rule-based fallback:', (error as Error).message);
    return rules;
  }
}
