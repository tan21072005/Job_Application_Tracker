import type { ValidationResult } from './validators.ts';

export type AtsKeywordCategory = 'hard_skill' | 'soft_skill' | 'domain_concept';

export type KeywordImportance = 'critical' | 'recommended' | 'optional';

export interface KeywordGapItemDTO {
  keyword: string;
  category: AtsKeywordCategory;
  importance: KeywordImportance;
  matched: boolean;
  frequencyInJob: number;
  frequencyInResume: number;
  suggestedPlacement: 'summary' | 'skills' | 'experience';
}

export interface AtsDiagnosticScoreBreakdownDTO {
  keywordRelevance: number;
  formattingHealth: number;
  impactQuantification: number;
}

export interface AtsDiagnosticResultDTO {
  atsScore: number;
  matchedKeywordsCount: number;
  missingKeywordsCount: number;
  keywordGaps: KeywordGapItemDTO[];
  scoreBreakdown: AtsDiagnosticScoreBreakdownDTO;
  recommendations: string[];
}

export type BulletVariantType = 'metric_driven' | 'leadership' | 'tech_depth';

export interface XyzBreakdownDTO {
  accomplishmentX: string;
  metricY: string;
  actionZ: string;
}

export interface BulletVariantOptionDTO {
  variantType: BulletVariantType;
  variantLabel: string;
  rewrittenText: string;
  highlightedKeywords: string[];
  xyzBreakdown: XyzBreakdownDTO;
}

export interface BulletOptimizationProposalDTO {
  id: string;
  originalBullet: string;
  detectedWeakness: string;
  variants: BulletVariantOptionDTO[];
  selectedVariant?: BulletVariantType;
}

export interface OptimizedResumeVariantDTO {
  id: string;
  userId?: string;
  applicationId?: string;
  jobTitle: string;
  company: string;
  originalResume: string;
  targetJobText: string;
  diagnosticResult: AtsDiagnosticResultDTO;
  proposals: BulletOptimizationProposalDTO[];
  synthesizedResume: string;
  createdAt: string;
  updatedAt: string;
}

export interface OptimizeResumeInputDTO {
  applicationId?: string;
  jobTitle?: string;
  company?: string;
  resumeText: string;
  jobDescription: string;
}

export interface RewriteBulletInputDTO {
  bullets: string[];
  targetKeywords?: string[];
  jobTitle?: string;
}

export interface ApplyRewritesInputDTO {
  acceptedBullets: Record<string, string>;
  injectedKeywords?: string[];
}

export const ATS_KEYWORD_DICTIONARY: Array<{
  keyword: string;
  category: AtsKeywordCategory;
  importance: KeywordImportance;
  aliases: string[];
}> = [
  { keyword: 'TypeScript', category: 'hard_skill', importance: 'critical', aliases: ['ts'] },
  { keyword: 'JavaScript', category: 'hard_skill', importance: 'critical', aliases: ['js', 'es6', 'esnext'] },
  { keyword: 'React', category: 'hard_skill', importance: 'critical', aliases: ['reactjs', 'react.js'] },
  { keyword: 'Next.js', category: 'hard_skill', importance: 'critical', aliases: ['nextjs', 'next'] },
  { keyword: 'Node.js', category: 'hard_skill', importance: 'critical', aliases: ['nodejs', 'node'] },
  { keyword: 'PostgreSQL', category: 'hard_skill', importance: 'critical', aliases: ['postgres', 'psql'] },
  { keyword: 'MySQL', category: 'hard_skill', importance: 'recommended', aliases: [] },
  { keyword: 'Redis', category: 'hard_skill', importance: 'recommended', aliases: ['redis cache'] },
  { keyword: 'Docker', category: 'hard_skill', importance: 'critical', aliases: ['containerization', 'containers'] },
  { keyword: 'Kubernetes', category: 'hard_skill', importance: 'critical', aliases: ['k8s'] },
  { keyword: 'AWS', category: 'hard_skill', importance: 'critical', aliases: ['amazon web services', 's3', 'ec2', 'lambda'] },
  { keyword: 'GCP', category: 'hard_skill', importance: 'recommended', aliases: ['google cloud platform'] },
  { keyword: 'CI/CD', category: 'hard_skill', importance: 'critical', aliases: ['github actions', 'gitlab ci', 'jenkins'] },
  { keyword: 'GraphQL', category: 'hard_skill', importance: 'recommended', aliases: ['apollo'] },
  { keyword: 'REST API', category: 'hard_skill', importance: 'critical', aliases: ['restful', 'rest api', 'apis'] },
  { keyword: 'Microservices', category: 'domain_concept', importance: 'critical', aliases: ['micro-services', 'distributed systems'] },
  { keyword: 'System Design', category: 'domain_concept', importance: 'critical', aliases: ['architecture', 'high-availability'] },
  { keyword: 'Performance Optimization', category: 'domain_concept', importance: 'critical', aliases: ['web vitals', 'lighthouse', 'latency reduction'] },
  { keyword: 'Unit Testing', category: 'hard_skill', importance: 'recommended', aliases: ['jest', 'vitest', 'testing library'] },
  { keyword: 'E2E Testing', category: 'hard_skill', importance: 'recommended', aliases: ['playwright', 'cypress'] },
  { keyword: 'Agile / Scrum', category: 'domain_concept', importance: 'recommended', aliases: ['agile', 'scrum', 'sprint'] },
  { keyword: 'Cross-functional Collaboration', category: 'soft_skill', importance: 'recommended', aliases: ['stakeholder management', 'cross-functional'] },
  { keyword: 'Mentorship', category: 'soft_skill', importance: 'recommended', aliases: ['mentoring', 'coaching engineers'] },
  { keyword: 'Technical Leadership', category: 'soft_skill', importance: 'critical', aliases: ['team lead', 'tech lead', 'ownership'] }
];

export function extractKeywordsFromText(text: string): Array<{
  keyword: string;
  category: AtsKeywordCategory;
  importance: KeywordImportance;
  frequency: number;
}> {
  const normalizedText = ' ' + text.toLowerCase() + ' ';
  const results: Array<{
    keyword: string;
    category: AtsKeywordCategory;
    importance: KeywordImportance;
    frequency: number;
  }> = [];

  for (const item of ATS_KEYWORD_DICTIONARY) {
    let freq = 0;
    const candidates = [item.keyword.toLowerCase(), ...item.aliases.map(a => a.toLowerCase())];
    for (const cand of candidates) {
      const regex = new RegExp(`\\b${cand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        freq += matches.length;
      }
    }
    if (freq > 0) {
      results.push({
        keyword: item.keyword,
        category: item.category,
        importance: item.importance,
        frequency: freq
      });
    }
  }

  const capitalizedWords = text.match(/\b[A-Z][a-zA-Z0-9+#.-]{2,}\b/g) || [];
  const counts: Record<string, number> = {};
  for (const word of capitalizedWords) {
    if (word.length > 2 && !['The', 'And', 'For', 'With', 'Our', 'You'].includes(word)) {
      counts[word] = (counts[word] || 0) + 1;
    }
  }

  for (const [word, count] of Object.entries(counts)) {
    if (count >= 2 && !results.some(r => r.keyword.toLowerCase() === word.toLowerCase())) {
      results.push({
        keyword: word,
        category: 'domain_concept',
        importance: 'optional',
        frequency: count
      });
    }
  }

  return results;
}

export function extractBulletsFromResume(resumeText: string): string[] {
  const lines = resumeText.split(/\r?\n/);
  const bullets: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^[-*•]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, '').trim());
    } else if (/^\d+\.\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^\d+\.\s+/, '').trim());
    }
  }

  if (bullets.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 25 && trimmed.length < 300 && !trimmed.endsWith(':')) {
        bullets.push(trimmed);
      }
    }
  }

  return bullets.slice(0, 15);
}

export function diagnoseAtsKeywordGaps(
  resumeText: string,
  jobDescription: string
): AtsDiagnosticResultDTO {
  const jobKeywords = extractKeywordsFromText(jobDescription);
  const resumeTextLower = ' ' + resumeText.toLowerCase() + ' ';
  const keywordGaps: KeywordGapItemDTO[] = [];

  let matchedWeight = 0;
  let totalWeight = 0;
  let matchedCount = 0;
  let missingCount = 0;

  for (const item of jobKeywords) {
    const weight = item.importance === 'critical' ? 3 : item.importance === 'recommended' ? 2 : 1;
    totalWeight += weight;

    const regex = new RegExp(`\\b${item.keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const matched = regex.test(resumeTextLower);

    let freqInResume = 0;
    if (matched) {
      const matchAll = resumeTextLower.match(new RegExp(regex.source, 'gi'));
      freqInResume = matchAll ? matchAll.length : 1;
      matchedWeight += weight;
      matchedCount++;
    } else {
      missingCount++;
    }

    const suggestedPlacement: 'summary' | 'skills' | 'experience' =
      item.category === 'hard_skill' ? 'skills' : item.category === 'soft_skill' ? 'experience' : 'summary';

    keywordGaps.push({
      keyword: item.keyword,
      category: item.category,
      importance: item.importance,
      matched,
      frequencyInJob: item.frequency,
      frequencyInResume: freqInResume,
      suggestedPlacement
    });
  }

  keywordGaps.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? 1 : -1;
    const importanceRank = { critical: 3, recommended: 2, optional: 1 };
    return importanceRank[b.importance] - importanceRank[a.importance];
  });

  const keywordRelevance = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 60;

  const bullets = extractBulletsFromResume(resumeText);
  let quantifiedBulletsCount = 0;
  let formattingPenalties = 0;

  for (const b of bullets) {
    if (/\b\d+(\.\d+)?%|\$\d+(\.\d+)?|\b\d+\s*(ms|s|x|k|m|dau|mau|users|clients|rps|qps)\b/i.test(b) || /\b\d{2,}\b/.test(b)) {
      quantifiedBulletsCount++;
    }
    if (b.length > 280 || b.length < 35) {
      formattingPenalties += 8;
    }
  }

  const impactQuantification = bullets.length > 0
    ? Math.min(100, Math.round((quantifiedBulletsCount / bullets.length) * 100))
    : 40;

  const formattingHealth = Math.max(20, 100 - formattingPenalties);

  const atsScore = Math.min(
    100,
    Math.max(0, Math.round(0.50 * keywordRelevance + 0.30 * impactQuantification + 0.20 * formattingHealth))
  );

  const recommendations: string[] = [];
  if (keywordRelevance < 70) {
    const missingCritical = keywordGaps.filter(k => !k.matched && k.importance === 'critical').slice(0, 3).map(k => k.keyword);
    if (missingCritical.length > 0) {
      recommendations.push(`Bổ sung các từ khóa cốt lõi còn thiếu: ${missingCritical.join(', ')}.`);
    }
  }
  if (impactQuantification < 60) {
    recommendations.push('Chuyển đổi các gạch đầu dòng công việc sang cấu trúc Google X-Y-Z để tăng chỉ số định lượng đo lường được (%, $, ms, users).');
  }
  if (formattingHealth < 80) {
    recommendations.push('Chuẩn hóa độ dài các câu mô tả kinh nghiệm (lý tưởng từ 50 đến 200 ký tự mỗi ý).');
  }
  if (recommendations.length === 0) {
    recommendations.push('Hồ sơ đạt độ tương thích cao với yêu cầu tuyển dụng. Sẵn sàng ứng tuyển trực tiếp.');
  }

  return {
    atsScore,
    matchedKeywordsCount: matchedCount,
    missingKeywordsCount: missingCount,
    keywordGaps,
    scoreBreakdown: {
      keywordRelevance,
      formattingHealth,
      impactQuantification
    },
    recommendations
  };
}

export function rewriteBulletPointsXyz(
  bullets: string[],
  targetKeywords: string[] = []
): BulletOptimizationProposalDTO[] {
  const proposals: BulletOptimizationProposalDTO[] = [];
  const sampleKeywords = targetKeywords.length > 0 ? targetKeywords : ['TypeScript', 'Docker', 'PostgreSQL', 'CI/CD'];

  for (let index = 0; index < bullets.length; index++) {
    const bullet = bullets[index];
    const bulletId = `bullet-${index + 1}`;
    const kw1 = sampleKeywords[index % sampleKeywords.length];
    const kw2 = sampleKeywords[(index + 1) % sampleKeywords.length];

    let weakness = 'Mô tả thiếu số liệu đo lường định lượng và kết quả cụ thể.';
    if (bullet.length < 40) {
      weakness = 'Câu quá ngắn, thiếu bối cảnh kỹ thuật và phương pháp triển khai.';
    } else if (bullet.length > 250) {
      weakness = 'Câu quá dài, lan man, làm loãng thông điệp chính về thành quả.';
    }

    const metricVariantText = `Đột phá hiệu năng vận hành thêm 38% và giảm thời gian phản hồi API xuống dưới 120ms thông qua việc tối ưu hóa truy vấn ${kw1} và tái cấu trúc pipeline dữ liệu.`;
    const leadershipVariantText = `Dẫn dắt sáng kiến kỹ thuật liên phòng ban, chuẩn hóa quy trình ${kw1} và ${kw2}, giúp rút ngắn chu kỳ release sản phẩm từ 14 ngày xuống còn 3 ngày cho toàn đội ngũ 8 kỹ sư.`;
    const techDepthVariantText = `Kiến trúc và triển khai hệ sinh thái dịch vụ phân tán sử dụng ${kw1}, kết hợp cơ chế caching ${kw2} và resilience patterns, đảm bảo 99.98% uptime tại tải đỉnh.`;

    const variants: BulletVariantOptionDTO[] = [
      {
        variantType: 'metric_driven',
        variantLabel: 'Tối ưu Chỉ số & Định lượng (Metrics)',
        rewrittenText: metricVariantText,
        highlightedKeywords: [kw1, '38%', '120ms'],
        xyzBreakdown: {
          accomplishmentX: 'Đột phá hiệu năng vận hành và giảm thời gian phản hồi API',
          metricY: 'Tăng 38% hiệu năng, latency < 120ms',
          actionZ: `Tối ưu hóa truy vấn ${kw1} và tái cấu trúc pipeline dữ liệu`
        }
      },
      {
        variantType: 'leadership',
        variantLabel: 'Năng lực Lãnh đạo & Tác động Đội ngũ',
        rewrittenText: leadershipVariantText,
        highlightedKeywords: [kw1, kw2, 'chu kỳ release từ 14 ngày xuống 3 ngày'],
        xyzBreakdown: {
          accomplishmentX: 'Rút ngắn chu kỳ release sản phẩm cho toàn đội ngũ 8 kỹ sư',
          metricY: 'Từ 14 ngày xuống còn 3 ngày',
          actionZ: `Dẫn dắt sáng kiến chuẩn hóa quy trình ${kw1} và ${kw2}`
        }
      },
      {
        variantType: 'tech_depth',
        variantLabel: 'Chuyên sâu Kỹ thuật & Kiến trúc (Tech Depth)',
        rewrittenText: techDepthVariantText,
        highlightedKeywords: [kw1, kw2, '99.98% uptime'],
        xyzBreakdown: {
          accomplishmentX: 'Đảm bảo độ tin cậy và tính liên tục của hệ thống tại tải đỉnh',
          metricY: '99.98% uptime',
          actionZ: `Kiến trúc hệ thống phân tán sử dụng ${kw1} và caching ${kw2}`
        }
      }
    ];

    proposals.push({
      id: bulletId,
      originalBullet: bullet,
      detectedWeakness: weakness,
      variants,
      selectedVariant: 'metric_driven'
    });
  }

  return proposals;
}

export function synthesizeOptimizedResume(
  originalResume: string,
  acceptedBullets: Record<string, string>,
  injectedKeywords: string[] = []
): string {
  let synthesized = originalResume;

  for (const [original, rewritten] of Object.entries(acceptedBullets)) {
    if (synthesized.includes(original)) {
      synthesized = synthesized.replace(original, rewritten);
    }
  }

  if (injectedKeywords.length > 0) {
    const formattedKeywordPills = injectedKeywords.slice(0, 8).join(', ');
    const skillsHeaderPattern = /(##\s*(?:Skills|Kỹ năng|Core Competencies|Kỹ năng chuyên môn)[\s\S]*?)(\n##|\n\n|$)/i;
    if (skillsHeaderPattern.test(synthesized)) {
      synthesized = synthesized.replace(skillsHeaderPattern, (_match, p1, p2) => {
        return `${p1}\n- **Từ khóa bổ sung chuẩn ATS**: ${formattedKeywordPills}${p2}`;
      });
    } else {
      synthesized += `\n\n## Kỹ năng & Từ khóa ATS bổ trợ\n- ${formattedKeywordPills}\n`;
    }
  }

  return synthesized;
}

export function validateOptimizeResumeInput(input: unknown): ValidationResult<OptimizeResumeInputDTO> {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      errors: { root: 'Dữ liệu đầu vào không hợp lệ, phải là đối tượng JSON.' },
      message: 'Dữ liệu không hợp lệ.'
    };
  }

  const obj = input as Record<string, unknown>;
  const resumeText = typeof obj.resumeText === 'string' ? obj.resumeText.trim() : '';
  const jobDescription = typeof obj.jobDescription === 'string' ? obj.jobDescription.trim() : '';

  if (!resumeText) {
    errors.resumeText = 'Nội dung hồ sơ CV không được để trống.';
  } else if (resumeText.length < 50) {
    errors.resumeText = 'Nội dung hồ sơ CV quá ngắn, tối thiểu phải có 50 ký tự.';
  }

  if (!jobDescription) {
    errors.jobDescription = 'Nội dung bản mô tả công việc (JD) không được để trống.';
  } else if (jobDescription.length < 30) {
    errors.jobDescription = 'Bản mô tả công việc quá ngắn, tối thiểu phải có 30 ký tự.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Dữ liệu tối ưu hồ sơ chưa đầy đủ.' };
  }

  return {
    ok: true,
    data: {
      applicationId: typeof obj.applicationId === 'string' ? obj.applicationId : undefined,
      jobTitle: typeof obj.jobTitle === 'string' ? obj.jobTitle.trim() : 'Software Engineer',
      company: typeof obj.company === 'string' ? obj.company.trim() : 'Tech Company',
      resumeText,
      jobDescription
    }
  };
}

export function validateRewriteBulletInput(input: unknown): ValidationResult<RewriteBulletInputDTO> {
  const errors: Record<string, string> = {};
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      errors: { root: 'Dữ liệu yêu cầu viết lại bullet không hợp lệ.' },
      message: 'Dữ liệu không hợp lệ.'
    };
  }

  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.bullets) || obj.bullets.length === 0) {
    errors.bullets = 'Danh sách bullet points không được rỗng.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Dữ liệu yêu cầu viết lại chưa đầy đủ.' };
  }

  return {
    ok: true,
    data: {
      bullets: (obj.bullets as unknown[]).map(b => String(b || '').trim()).filter(Boolean),
      targetKeywords: Array.isArray(obj.targetKeywords) ? obj.targetKeywords.map(k => String(k || '').trim()).filter(Boolean) : [],
      jobTitle: typeof obj.jobTitle === 'string' ? obj.jobTitle.trim() : undefined
    }
  };
}
