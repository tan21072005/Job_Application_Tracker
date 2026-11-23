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
  skillsCoverage?: number;
  parseabilityHealth?: number;
  actionMetrics?: number;
  brevityAntiStuffing?: number;
  keywordStuffingPenalty?: number;
}

export type AnalysisProvenance = 'llm' | 'rules';

export interface AtsDiagnosticResultDTO {
  atsScore: number;
  matchedKeywordsCount: number;
  missingKeywordsCount: number;
  keywordGaps: KeywordGapItemDTO[];
  scoreBreakdown: AtsDiagnosticScoreBreakdownDTO;
  recommendations: string[];
  verdict?: string;
  provenance?: AnalysisProvenance;
  model?: string;
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
  { keyword: 'Technical Leadership', category: 'soft_skill', importance: 'critical', aliases: ['team lead', 'tech lead', 'ownership'] },

  { keyword: 'Marketing', category: 'domain_concept', importance: 'recommended', aliases: ['tiếp thị'] },
  { keyword: 'Digital Marketing', category: 'hard_skill', importance: 'critical', aliases: ['marketing online', 'tiếp thị số'] },
  { keyword: 'Facebook Ads', category: 'hard_skill', importance: 'critical', aliases: ['fb ads', 'quảng cáo facebook'] },
  { keyword: 'Google Ads', category: 'hard_skill', importance: 'critical', aliases: ['google adwords', 'adwords'] },
  { keyword: 'SEO', category: 'hard_skill', importance: 'critical', aliases: ['search engine optimization', 'tối ưu hóa công cụ tìm kiếm'] },
  { keyword: 'Google Analytics', category: 'hard_skill', importance: 'critical', aliases: ['ga4', 'analytics'] },
  { keyword: 'Content Marketing', category: 'hard_skill', importance: 'recommended', aliases: ['content', 'sáng tạo nội dung'] },
  { keyword: 'Email Marketing', category: 'hard_skill', importance: 'recommended', aliases: ['email campaign', 'marketing qua email'] },
  { keyword: 'Branding', category: 'domain_concept', importance: 'recommended', aliases: ['thương hiệu', 'brand management'] },
  { keyword: 'Market Research', category: 'hard_skill', importance: 'recommended', aliases: ['nghiên cứu thị trường'] },
  { keyword: 'CRM', category: 'hard_skill', importance: 'recommended', aliases: ['quản lý quan hệ khách hàng'] },
  { keyword: 'HubSpot', category: 'hard_skill', importance: 'optional', aliases: [] },
  { keyword: 'Salesforce', category: 'hard_skill', importance: 'optional', aliases: [] },

  { keyword: 'Sales', category: 'domain_concept', importance: 'critical', aliases: ['kinh doanh', 'bán hàng'] },
  { keyword: 'Business Development', category: 'domain_concept', importance: 'recommended', aliases: ['phát triển kinh doanh', 'bizdev'] },
  { keyword: 'Customer Relationship', category: 'soft_skill', importance: 'recommended', aliases: ['chăm sóc khách hàng', 'customer care'] },
  { keyword: 'Negotiation', category: 'soft_skill', importance: 'critical', aliases: ['đàm phán', 'thương lượng'] },
  { keyword: 'KPI', category: 'domain_concept', importance: 'recommended', aliases: ['chỉ số đo lường'] },
  { keyword: 'Revenue Target', category: 'domain_concept', importance: 'recommended', aliases: ['doanh thu', 'target doanh số'] },

  { keyword: 'Accounting', category: 'domain_concept', importance: 'critical', aliases: ['kế toán'] },
  { keyword: 'Excel', category: 'hard_skill', importance: 'critical', aliases: ['microsoft excel', 'bảng tính'] },
  { keyword: 'MISA', category: 'hard_skill', importance: 'recommended', aliases: ['phần mềm misa'] },
  { keyword: 'Financial Reporting', category: 'hard_skill', importance: 'critical', aliases: ['báo cáo tài chính'] },
  { keyword: 'Tax Declaration', category: 'hard_skill', importance: 'recommended', aliases: ['kê khai thuế', 'thuế'] },
  { keyword: 'Accounts Receivable', category: 'hard_skill', importance: 'recommended', aliases: ['công nợ phải thu'] },
  { keyword: 'Accounts Payable', category: 'hard_skill', importance: 'recommended', aliases: ['công nợ phải trả'] },
  { keyword: 'Payroll', category: 'hard_skill', importance: 'recommended', aliases: ['tính lương', 'bảng lương'] },
  { keyword: 'Audit', category: 'domain_concept', importance: 'recommended', aliases: ['kiểm toán'] },
  { keyword: 'VAS', category: 'domain_concept', importance: 'optional', aliases: ['chuẩn mực kế toán việt nam'] },
  { keyword: 'IFRS', category: 'domain_concept', importance: 'optional', aliases: [] },

  { keyword: 'Recruitment', category: 'domain_concept', importance: 'critical', aliases: ['tuyển dụng'] },
  { keyword: 'Human Resources', category: 'domain_concept', importance: 'critical', aliases: ['nhân sự', 'hr'] },
  { keyword: 'Employee Engagement', category: 'soft_skill', importance: 'recommended', aliases: ['gắn kết nhân viên'] },
  { keyword: 'Labor Law', category: 'domain_concept', importance: 'recommended', aliases: ['luật lao động'] },
  { keyword: 'Compensation and Benefits', category: 'domain_concept', importance: 'recommended', aliases: ['c&b', 'lương thưởng', 'phúc lợi'] },
  { keyword: 'Onboarding', category: 'domain_concept', importance: 'recommended', aliases: ['hội nhập nhân viên'] },
  { keyword: 'Performance Review', category: 'domain_concept', importance: 'recommended', aliases: ['đánh giá hiệu suất'] },

  { keyword: 'Project Management', category: 'domain_concept', importance: 'critical', aliases: ['quản lý dự án'] },
  { keyword: 'Stakeholder Management', category: 'soft_skill', importance: 'critical', aliases: ['quản lý các bên liên quan'] },
  { keyword: 'Budget Management', category: 'hard_skill', importance: 'recommended', aliases: ['quản lý ngân sách', 'quản lý chi phí'] },
  { keyword: 'Logistics', category: 'domain_concept', importance: 'recommended', aliases: ['vận tải', 'hậu cần'] },
  { keyword: 'Supply Chain', category: 'domain_concept', importance: 'recommended', aliases: ['chuỗi cung ứng'] },
  { keyword: 'Inventory Management', category: 'hard_skill', importance: 'recommended', aliases: ['quản lý tồn kho'] },
  { keyword: 'Customer Service', category: 'soft_skill', importance: 'recommended', aliases: ['dịch vụ khách hàng'] },
  { keyword: 'Problem Solving', category: 'soft_skill', importance: 'critical', aliases: ['giải quyết vấn đề'] },
  { keyword: 'Teamwork', category: 'soft_skill', importance: 'recommended', aliases: ['làm việc nhóm'] },
  { keyword: 'Communication', category: 'soft_skill', importance: 'critical', aliases: ['giao tiếp', 'truyền thông'] },
  { keyword: 'Presentation', category: 'soft_skill', importance: 'recommended', aliases: ['thuyết trình', 'trình bày'] },
  { keyword: 'Time Management', category: 'soft_skill', importance: 'recommended', aliases: ['quản lý thời gian'] },
  { keyword: 'English', category: 'hard_skill', importance: 'recommended', aliases: ['tiếng anh', 'toeic', 'ielts'] },
  { keyword: 'Microsoft Office', category: 'hard_skill', importance: 'recommended', aliases: ['word', 'powerpoint', 'office'] },
  { keyword: 'Power BI', category: 'hard_skill', importance: 'optional', aliases: [] },
  { keyword: 'SQL', category: 'hard_skill', importance: 'recommended', aliases: ['truy vấn dữ liệu'] }
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
    if (word.length <= 2) continue;
    if (['The', 'And', 'For', 'With', 'Our', 'You'].includes(word)) continue;

    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const allOccurrences = text.match(new RegExp(`\\b${escaped}\\b`, 'g')) || [];
    const midSentenceOccurrences = text.match(new RegExp(`(?<=[a-z0-9,;:]\\s)${escaped}\\b`, 'g')) || [];
    const sentenceStartOnly = allOccurrences.length > 0 && midSentenceOccurrences.length === 0;

    if (sentenceStartOnly) continue;

    counts[word] = midSentenceOccurrences.length;
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

    const dictEntry = ATS_KEYWORD_DICTIONARY.find(
      d => d.keyword.toLowerCase() === item.keyword.toLowerCase()
    );
    const searchTerms = [item.keyword, ...(dictEntry?.aliases || [])];

    let matched = false;
    let freqInResume = 0;
    for (const term of searchTerms) {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const matches = resumeTextLower.match(regex);
      if (matches && matches.length > 0) {
        matched = true;
        freqInResume += matches.length;
      }
    }

    if (matched) {
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

  const skillsCoverage = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 40) : 25;

  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText);
  const hasPhone = /(?:\+?84|0)(?:[\s.-]*\d){9,10}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(resumeText);
  const contactScore = (hasEmail ? 4 : 0) + (hasPhone ? 4 : 0);

  const hasExperience = /(?:experience|kinh nghiệm|lịch sử làm việc|work history|employment)/i.test(resumeText);
  const hasSkills = /(?:skills|kỹ năng|core competencies|chuyên môn|technologies|công nghệ)/i.test(resumeText);
  const hasEducation = /(?:education|học vấn|bằng cấp|đào tạo|qualifications)/i.test(resumeText);
  const sectionScore = (hasExperience ? 5 : 0) + (hasSkills ? 4 : 0) + (hasEducation ? 3 : 0);

  const hasPipesTable = (resumeText.match(/\|.*\|.*\|/g) || []).length >= 4;
  const hasBullets = /(?:^|\n)\s*[-*•\d+.]\s+/m.test(resumeText);
  const cleanScore = (hasPipesTable ? 1 : 3) + (hasBullets ? 2 : 1);

  const parseabilityHealth = Math.min(25, contactScore + sectionScore + cleanScore);

  const bullets = extractBulletsFromResume(resumeText);
  const strongActionVerbsRegex = /^(?:xây dựng|phát triển|thiết kế|tối ưu|tối ưu hóa|triển khai|dẫn dắt|kiến trúc|nâng cấp|vận hành|tích hợp|chuyển đổi|tự động hóa|đo lường|lập trình|chỉ đạo|điều phối|phân tích|giải quyết|thực hiện|đóng góp|hướng dẫn|đào tạo|cải thiện|giảm thiểu|gia tăng|đạt được|hoàn thành|tham gia|chịu trách nhiệm|viết|built|developed|designed|optimized|architected|led|engineered|spearheaded|implemented|automated|launched|reduced|increased|improved|scaled|managed|created|delivered|orchestrated|established|executed|conducted|formulated|streamlined|accelerated|collaborated|mentored|directed|refactored)\b/i;

  let actionBulletsCount = 0;
  let quantifiedBulletsCount = 0;

  for (const b of bullets) {
    const trimmedB = b.trim();
    if (strongActionVerbsRegex.test(trimmedB)) {
      actionBulletsCount++;
    }
    if (
      /\b\d+(\.\d+)?%|\$\d+(\.\d+)?|(?:\$|USD|VNĐ|VND|\btr\b|\btỷ\b)\s*\d+|\b\d+\s*(ms|s|giây|phút|giờ|x|k|m|dau|mau|users|người dùng|khách hàng|clients|rps|qps|req\/s|members|kỹ sư)\b/i.test(trimmedB) ||
      /\b\d{2,}\b/.test(trimmedB)
    ) {
      quantifiedBulletsCount++;
    }
  }

  const actionVerbRatio = bullets.length > 0 ? actionBulletsCount / bullets.length : 0.5;
  const quantRatio = bullets.length > 0 ? quantifiedBulletsCount / bullets.length : 0.4;
  const actionMetrics = Math.min(20, Math.round(actionVerbRatio * 10) + Math.round(quantRatio * 10));

  const words = resumeText.trim().split(/\s+/).filter(Boolean);
  const totalWordCount = words.length;

  let baseBrevityScore = 15;
  if (totalWordCount >= 200 && totalWordCount <= 900) {
    baseBrevityScore = 15;
  } else if ((totalWordCount >= 120 && totalWordCount < 200) || (totalWordCount > 900 && totalWordCount <= 1300)) {
    baseBrevityScore = 11;
  } else if ((totalWordCount >= 80 && totalWordCount < 120) || (totalWordCount > 1300 && totalWordCount <= 1800)) {
    baseBrevityScore = 7;
  } else {
    baseBrevityScore = 4;
  }

  let keywordStuffingPenalty = 0;
  const stuffedKeywords: string[] = [];

  for (const item of keywordGaps) {
    if (item.matched && totalWordCount > 0) {
      const density = item.frequencyInResume / totalWordCount;
      if (density > 0.04 || (item.frequencyInResume >= 7 && totalWordCount < 350)) {
        keywordStuffingPenalty = Math.min(10, keywordStuffingPenalty + 5);
        stuffedKeywords.push(item.keyword);
      }
    }
  }

  const brevityAntiStuffing = Math.max(0, baseBrevityScore - keywordStuffingPenalty);

  const atsScore = Math.min(
    100,
    Math.max(0, skillsCoverage + parseabilityHealth + actionMetrics + brevityAntiStuffing)
  );

  const keywordRelevance = Math.round((skillsCoverage / 40) * 100);
  const formattingHealth = Math.round((parseabilityHealth / 25) * 100);
  const impactQuantification = Math.round((actionMetrics / 20) * 100);

  let verdict = '';
  if (atsScore >= 75 && atsScore <= 88) {
    verdict = '🟢 Ngưỡng vàng tối ưu (75% - 85%): Hồ sơ đạt độ tương thích chuẩn ATS thực tế mà không bị nghi ngờ nhồi từ khóa. Sẵn sàng nộp đơn!';
  } else if (atsScore > 88) {
    verdict = '🟢 Tương thích rất cao (>88%): Hồ sơ khớp hầu hết yêu cầu. Hãy đảm bảo từ khóa xuất hiện tự nhiên trong các dự án thực tế.';
  } else if (atsScore >= 60) {
    verdict = '🟡 Tiềm năng (60% - 74%): Cần bổ sung thêm một số kỹ năng trọng yếu và số liệu định lượng để tăng khả năng vượt qua bộ lọc.';
  } else {
    verdict = '🔴 Cần tinh chỉnh mạnh (<60%): Thiếu nhiều từ khóa bắt buộc và thông tin định lượng quan trọng.';
  }

  const recommendations: string[] = [];
  if (keywordStuffingPenalty > 0 && stuffedKeywords.length > 0) {
    recommendations.push(
      `⚠️ Cảnh báo nhồi từ khóa (Stuffing Penalty - trừ ${keywordStuffingPenalty}đ): Từ khóa ${stuffedKeywords.map(k => `"${k}"`).join(', ')} xuất hiện với mật độ bất thường (>4%). Hãy phân bổ tự nhiên trong bối cảnh công việc thực tế.`
    );
  }
  if (skillsCoverage < 28) {
    const missingCritical = keywordGaps
      .filter(k => !k.matched && (k.importance === 'critical' || k.importance === 'recommended'))
      .slice(0, 3)
      .map(k => k.keyword);
    if (missingCritical.length > 0) {
      recommendations.push(`Bổ sung các kỹ năng trọng yếu còn thiếu: ${missingCritical.join(', ')}.`);
    }
  }
  if (!hasEmail) {
    recommendations.push('Bổ sung địa chỉ Email liên hệ chuyên nghiệp rõ ràng trên đầu CV.');
  }
  if (!hasPhone) {
    recommendations.push('Bổ sung số điện thoại liên hệ trực tiếp để nhà tuyển dụng dễ dàng liên lạc.');
  }
  if (!hasExperience || !hasSkills) {
    recommendations.push('Chuẩn hóa tiêu đề phân vùng chuẩn ATS: Kinh nghiệm làm việc (Experience) và Kỹ năng (Skills).');
  }
  if (actionMetrics < 14) {
    recommendations.push(
      'Chuyển đổi các gạch đầu dòng công việc sang cấu trúc Google X-Y-Z: bắt đầu bằng động từ mạnh và bổ sung số liệu đo lường thực tế (%, ms, người dùng, thời gian).'
    );
  }
  if (totalWordCount < 180) {
    recommendations.push(
      `Độ dài hồ sơ còn ngắn (${totalWordCount} từ). Độ dài tiêu chuẩn ATS lý tưởng là 250 - 800 từ (1 - 2 trang A4).`
    );
  } else if (totalWordCount > 1100) {
    recommendations.push(
      `Hồ sơ khá dài (${totalWordCount} từ). Hãy tinh giản để giữ độ dài trong khoảng 1 - 2 trang A4.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Hồ sơ đạt cấu trúc và độ tương thích chuẩn ATS rất tốt. Sẵn sàng ứng tuyển trực tiếp.');
  }

  return {
    atsScore,
    matchedKeywordsCount: matchedCount,
    missingKeywordsCount: missingCount,
    keywordGaps,
    scoreBreakdown: {
      keywordRelevance,
      formattingHealth,
      impactQuantification,
      skillsCoverage,
      parseabilityHealth,
      actionMetrics,
      brevityAntiStuffing,
      keywordStuffingPenalty: keywordStuffingPenalty > 0 ? keywordStuffingPenalty : undefined
    },
    recommendations,
    verdict
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

    const metricVariantText = `Nâng cao hiệu năng vận hành và giảm độ trễ xử lý [điền số liệu: ví dụ ~30% hoặc <150ms] thông qua việc tối ưu hóa ${kw1} và tái cấu trúc luồng dữ liệu.`;
    const leadershipVariantText = `Dẫn dắt sáng kiến kỹ thuật chuẩn hóa quy trình ${kw1} và ${kw2}, giúp rút ngắn chu kỳ release [điền thời gian: ví dụ từ 14 ngày xuống 3 ngày] cho toàn đội ngũ [điền số thành viên] kỹ sư.`;
    const techDepthVariantText = `Kiến trúc và triển khai hệ sinh thái dịch vụ phân tán sử dụng ${kw1}, kết hợp cơ chế caching ${kw2}, duy trì độ tin cậy hệ thống đạt [điền uptime: ví dụ 99.9%] tại tải đỉnh.`;

    const variants: BulletVariantOptionDTO[] = [
      {
        variantType: 'metric_driven',
        variantLabel: 'Tối ưu Chỉ số & Định lượng (Metrics)',
        rewrittenText: metricVariantText,
        highlightedKeywords: [kw1, '[điền số liệu: ví dụ ~30% hoặc <150ms]'],
        xyzBreakdown: {
          accomplishmentX: 'Nâng cao hiệu năng vận hành và giảm thời gian phản hồi',
          metricY: '[Số liệu thực tế: ví dụ ~30% hiệu năng hoặc <150ms]',
          actionZ: `Tối ưu hóa ${kw1} và tái cấu trúc luồng dữ liệu`
        }
      },
      {
        variantType: 'leadership',
        variantLabel: 'Năng lực Lãnh đạo & Tác động Đội ngũ',
        rewrittenText: leadershipVariantText,
        highlightedKeywords: [kw1, kw2, '[chu kỳ release rút ngắn]'],
        xyzBreakdown: {
          accomplishmentX: 'Rút ngắn chu kỳ release sản phẩm và nâng cao năng suất đội ngũ',
          metricY: '[Số liệu thực tế: ví dụ từ X ngày xuống Y ngày]',
          actionZ: `Dẫn dắt sáng kiến chuẩn hóa quy trình ${kw1} và ${kw2}`
        }
      },
      {
        variantType: 'tech_depth',
        variantLabel: 'Chuyên sâu Kỹ thuật & Kiến trúc (Tech Depth)',
        rewrittenText: techDepthVariantText,
        highlightedKeywords: [kw1, kw2, '[độ tin cậy hệ thống]'],
        xyzBreakdown: {
          accomplishmentX: 'Đảm bảo độ tin cậy và tính liên tục của hệ thống phân tán',
          metricY: '[Số liệu thực tế: ví dụ 99.9% uptime tại tải đỉnh]',
          actionZ: `Kiến trúc hệ thống sử dụng ${kw1} và tối ưu cơ chế caching ${kw2}`
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
