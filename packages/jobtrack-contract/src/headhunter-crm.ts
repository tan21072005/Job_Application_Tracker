import type { ValidationResult } from './validators.ts';

export type HeadhunterAgencyTier =
  | 'tier1_global'
  | 'tier2_regional'
  | 'boutique_executive'
  | 'internal_corporate'
  | 'independent';

export type RecruiterRelationshipTier =
  | 'trusted_advisor'
  | 'preferred_partner'
  | 'situational_contingency'
  | 'dormant'
  | 'blacklisted';

export type MandateExclusivity =
  | 'exclusive_retained'
  | 'contingency_shared'
  | 'internal_direct'
  | 'unconfirmed';

export type MandateStatus =
  | 'pitched'
  | 'screening'
  | 'submitted'
  | 'client_interview'
  | 'offer'
  | 'declined'
  | 'conflict_cancelled';

export type RecruiterReplyIntent =
  | 'explore_with_criteria'
  | 'salary_first'
  | 'polite_pass'
  | 'exclusive_mandate_check';

export interface HeadhunterAgencyDTO {
  id: string;
  name: string;
  tier: HeadhunterAgencyTier;
  reputationRating: number;
  countryOfOrigin?: string;
  knownSpecialties: string[];
}

export interface RecruiterLeadDTO {
  id: string;
  userId: string;
  name: string;
  agency: string;
  agencyTier: HeadhunterAgencyTier;
  role: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  tier: RecruiterRelationshipTier;
  rating: number;
  specialties: string[];
  mandatesCount: number;
  lastContactedAt?: string;
  notes?: string;
  healthScore: number;
  healthStatus: 'excellent' | 'active' | 'cooling' | 'dormant' | 'risk';
  nextActionSuggestion: string;
  createdAt: string;
  updatedAt: string;
}

export interface HeadhunterMandateDTO {
  id: string;
  userId: string;
  leadId: string;
  recruiterName: string;
  agencyName: string;
  applicationId?: string;
  roleTitle: string;
  clientCompany: string;
  isConfidential: boolean;
  exclusivity: MandateExclusivity;
  salaryRange?: string;
  status: MandateStatus;
  notes?: string;
  pitchedAt: string;
  updatedAt: string;
}

export interface InboundPitchParseResultDTO {
  recruiterName?: string;
  recruiterTitle?: string;
  agencyName?: string;
  agencyTier: HeadhunterAgencyTier;
  targetRole?: string;
  targetCompany?: string;
  isConfidentialCompany: boolean;
  companyClues: string[];
  location?: string;
  salaryClue?: string;
  extractedMinComp?: number;
  extractedMaxComp?: number;
  currency?: 'VND' | 'USD';
  mandateExclusivity: MandateExclusivity;
  keyRequirements: string[];
  redFlags: string[];
  greenFlags: string[];
  confidenceScore: number;
  summary: string;
}

export interface ParseRecruiterPitchInputDTO {
  rawText: string;
  channel?: 'linkedin_inmail' | 'email' | 'zalo' | 'telegram' | 'other';
}

export interface RecruiterResponseDraftDTO {
  intent: RecruiterReplyIntent;
  subject: string;
  body: string;
  strategyNotes: string;
  suggestedTone: 'assertive_executive' | 'cautious_professional' | 'cordial_decline' | 'inquisitive';
}

export interface RecruiterLeadMutationInputDTO {
  name: string;
  agency: string;
  agencyTier?: HeadhunterAgencyTier;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  tier?: RecruiterRelationshipTier;
  rating?: number;
  specialties?: string[];
  notes?: string;
  lastContactedAt?: string;
}

export interface HeadhunterMandateMutationInputDTO {
  leadId: string;
  roleTitle: string;
  clientCompany: string;
  isConfidential?: boolean;
  exclusivity?: MandateExclusivity;
  salaryRange?: string;
  applicationId?: string;
  status?: MandateStatus;
  notes?: string;
}

export const KNOWN_HEADHUNTER_AGENCIES: HeadhunterAgencyDTO[] = [
  {
    id: 'agency-rw',
    name: 'Robert Walters',
    tier: 'tier1_global',
    reputationRating: 5,
    countryOfOrigin: 'United Kingdom',
    knownSpecialties: ['Tech Leadership', 'C-Suite', 'FinTech', 'Digital Transformation']
  },
  {
    id: 'agency-mp',
    name: 'Michael Page',
    tier: 'tier1_global',
    reputationRating: 5,
    countryOfOrigin: 'United Kingdom',
    knownSpecialties: ['Software Engineering', 'Enterprise IT', 'Data & AI']
  },
  {
    id: 'agency-navigos',
    name: 'Navigos Search',
    tier: 'tier1_global',
    reputationRating: 5,
    countryOfOrigin: 'Japan (en world)',
    knownSpecialties: ['High-tech', 'Banking', 'Manufacturing Tech']
  },
  {
    id: 'agency-monroe',
    name: 'Monroe Consulting Group',
    tier: 'tier2_regional',
    reputationRating: 4,
    countryOfOrigin: 'Regional SEA',
    knownSpecialties: ['E-commerce', 'Startup Scaleups', 'SaaS']
  },
  {
    id: 'agency-adecco',
    name: 'Adecco',
    tier: 'tier1_global',
    reputationRating: 4,
    countryOfOrigin: 'Switzerland',
    knownSpecialties: ['Contingency IT', 'General Staffing', 'Enterprise Operations']
  },
  {
    id: 'agency-talentnet',
    name: 'Talentnet',
    tier: 'tier2_regional',
    reputationRating: 4,
    countryOfOrigin: 'Vietnam',
    knownSpecialties: ['Executive Search', 'Corporate Tech', 'FMCG IT']
  },
  {
    id: 'agency-nashtech',
    name: 'Harvey Nash / NashTech',
    tier: 'tier2_regional',
    reputationRating: 4,
    countryOfOrigin: 'United Kingdom',
    knownSpecialties: ['Offshore Tech', 'Engineering Teams', 'Cloud & DevOps']
  }
];

export function computeRecruiterRelationshipHealth(recruiter: {
  tier?: RecruiterRelationshipTier;
  rating?: number;
  mandatesCount?: number;
  lastContactedAt?: string;
}): {
  healthScore: number;
  healthStatus: 'excellent' | 'active' | 'cooling' | 'dormant' | 'risk';
  nextActionSuggestion: string;
} {
  const tier = recruiter.tier || 'preferred_partner';
  const rating = Math.max(1, Math.min(5, recruiter.rating ?? 4));
  const mandates = Math.max(0, recruiter.mandatesCount ?? 0);

  let baseScore = 75;
  if (tier === 'trusted_advisor') baseScore = 90;
  else if (tier === 'preferred_partner') baseScore = 75;
  else if (tier === 'situational_contingency') baseScore = 55;
  else if (tier === 'dormant') baseScore = 30;
  else if (tier === 'blacklisted') baseScore = 0;

  if (tier === 'blacklisted') {
    return {
      healthScore: 0,
      healthStatus: 'risk',
      nextActionSuggestion: 'Ngừng mọi trao đổi và từ chối đại diện hồ sơ.'
    };
  }

  let ratingFactor = (rating - 3) * 5;
  let mandateBonus = Math.min(20, mandates * 5);

  let recencyPenalty = 0;
  if (recruiter.lastContactedAt) {
    const daysSince = Math.floor((Date.now() - new Date(recruiter.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 180) recencyPenalty = 25;
    else if (daysSince > 90) recencyPenalty = 15;
    else if (daysSince > 45) recencyPenalty = 5;
  } else {
    recencyPenalty = 10;
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(baseScore + ratingFactor + mandateBonus - recencyPenalty)));

  let healthStatus: 'excellent' | 'active' | 'cooling' | 'dormant' | 'risk' = 'active';
  let nextActionSuggestion = 'Duy trì kết nối chuyên môn định kỳ.';

  if (finalScore >= 85) {
    healthStatus = 'excellent';
    nextActionSuggestion = 'Đối tác chiến lược tin cậy. Hãy chia sẻ định hướng thăng tiến hoặc cập nhật kỳ vọng thu nhập mới.';
  } else if (finalScore >= 65) {
    healthStatus = 'active';
    nextActionSuggestion = 'Quan hệ tích cực. Sẵn sàng xem xét các mandate độc quyền phù hợp.';
  } else if (finalScore >= 45) {
    healthStatus = 'cooling';
    nextActionSuggestion = 'Đã lâu chưa trao đổi (>45 ngày). Hãy gửi tin nhắn cập nhật trạng thái tìm việc nhẹ nhàng.';
  } else if (finalScore >= 25) {
    healthStatus = 'dormant';
    nextActionSuggestion = 'Quan hệ đóng băng. Cần xác minh recruiter còn làm việc tại agency này trước khi gửi CV.';
  } else {
    healthStatus = 'risk';
    nextActionSuggestion = 'Cảnh báo rủi ro lock-out hồ sơ. Yêu cầu văn bản cam kết trước khi chia sẻ thông tin mật.';
  }

  return {
    healthScore: finalScore,
    healthStatus,
    nextActionSuggestion
  };
}

export function detectMandateConflict(
  existingMandates: HeadhunterMandateDTO[],
  candidateCompany: string
): {
  hasConflict: boolean;
  conflictingMandate?: HeadhunterMandateDTO;
  warningMessage?: string;
} {
  if (!candidateCompany || !candidateCompany.trim()) {
    return { hasConflict: false };
  }

  const cleanTarget = candidateCompany
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const conflict = existingMandates.find(m => {
    if (['declined', 'conflict_cancelled'].includes(m.status)) return false;
    const cleanClient = m.clientCompany
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    return cleanClient === cleanTarget || (cleanClient.length > 3 && cleanTarget.includes(cleanClient));
  });

  if (conflict) {
    return {
      hasConflict: true,
      conflictingMandate: conflict,
      warningMessage: `Cảnh báo xung đột quyền đại diện: Cơ hội tại ${conflict.clientCompany} đã được ${conflict.recruiterName} (${conflict.agencyName}) tiếp cận trước đó vào ngày ${new Date(conflict.pitchedAt).toLocaleDateString('vi-VN')}. Nộp lại qua agency khác có nguy cơ bị Enterprise ATS khóa hồ sơ (lockout) 6-12 tháng.`
    };
  }

  return { hasConflict: false };
}

export function parseInboundRecruiterPitch(
  rawText: string,
  channel: 'linkedin_inmail' | 'email' | 'zalo' | 'telegram' | 'other' = 'linkedin_inmail'
): InboundPitchParseResultDTO {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  let agencyName = 'Independent Search Partner';
  let agencyTier: HeadhunterAgencyTier = 'independent';
  for (const agency of KNOWN_HEADHUNTER_AGENCIES) {
    if (lower.includes(agency.name.toLowerCase())) {
      agencyName = agency.name;
      agencyTier = agency.tier;
      break;
    }
  }

  if (agencyTier === 'independent') {
    if (lower.includes('navigos') || lower.includes('en world')) {
      agencyName = 'Navigos Search';
      agencyTier = 'tier1_global';
    } else if (lower.includes('robert walters')) {
      agencyName = 'Robert Walters';
      agencyTier = 'tier1_global';
    } else if (lower.includes('michael page') || lower.includes('page personnel')) {
      agencyName = 'Michael Page';
      agencyTier = 'tier1_global';
    } else if (lower.includes('talentnet')) {
      agencyName = 'Talentnet';
      agencyTier = 'tier2_regional';
    } else if (lower.includes('monroe consulting')) {
      agencyName = 'Monroe Consulting Group';
      agencyTier = 'tier2_regional';
    } else if (lower.includes('in-house') || lower.includes('internal talent') || lower.includes('ta team')) {
      agencyName = 'In-House Talent Partner';
      agencyTier = 'internal_corporate';
    }
  }

  let recruiterName: string | undefined;
  const namePatterns = [
    /(?:tôi là|mình là|tên tôi là|i am|this is|my name is)\s+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})/i,
    /(?:best regards|trân trọng|warm regards|cheers|thanks)[,\s\n]+([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){1,3})/i
  ];
  for (const p of namePatterns) {
    const match = text.match(p);
    if (match && match[1]) {
      let candName = match[1].trim();
      candName = candName.split(/\s+(?:từ|from|đến từ|ở|at|đang)\s+/i)[0].trim();
      recruiterName = candName;
      break;
    }
  }

  let targetRole: string | undefined;
  const roleKeywords = [
    'Vice President of Engineering',
    'VP of Engineering',
    'Head of Engineering',
    'Head of Technology',
    'Director of Engineering',
    'Engineering Director',
    'Chief Technology Officer',
    'CTO',
    'Principal Software Engineer',
    'Principal Architect',
    'Staff Software Engineer',
    'Software Architect',
    'Solution Architect',
    'Engineering Manager',
    'Tech Lead',
    'Technical Lead',
    'Senior Software Engineer',
    'Senior Backend Engineer',
    'Senior Fullstack Engineer',
    'Senior Frontend Engineer',
    'DevOps Lead',
    'Platform Lead',
    'Data Engineering Lead'
  ];

  for (const role of roleKeywords) {
    if (new RegExp(`\\b${role}\\b`, 'i').test(text)) {
      targetRole = role;
      break;
    }
  }
  if (!targetRole) {
    targetRole = 'Senior Technology Leader';
  }

  const companyClues: string[] = [];
  let isConfidentialCompany = false;
  let targetCompany: string | undefined;

  const confidentialMatches = [
    'khách hàng bảo mật',
    'stealth mode',
    'stealth startup',
    'top-tier bank',
    'multinational bank',
    'ngân hàng hàng đầu',
    'fintech unicorn',
    'kỳ lân công nghệ',
    'confidential client',
    'tier-1 client',
    'leading e-commerce',
    'tập đoàn đa quốc gia'
  ];

  for (const c of confidentialMatches) {
    if (lower.includes(c)) {
      isConfidentialCompany = true;
      companyClues.push(c);
    }
  }

  const companyPatterns = [
    /(?:cho|tại|for|at|client is)\s+([A-Z0-9][a-zA-Z0-9\s&.-]{2,30}?)(?=\s+(?:việt nam|vietnam|is|hcm|hà nội|đang|như|\.|\,))/i
  ];
  for (const cp of companyPatterns) {
    const m = text.match(cp);
    if (m && m[1] && !m[1].toLowerCase().includes('client') && !m[1].toLowerCase().includes('khách hàng')) {
      targetCompany = m[1].trim();
      break;
    }
  }

  if (!targetCompany && isConfidentialCompany) {
    targetCompany = 'Doanh nghiệp Bảo mật (Stealth Mandate)';
  } else if (!targetCompany) {
    targetCompany = 'Doanh nghiệp Công nghệ Tuyển dụng';
  }

  let salaryClue: string | undefined;
  let extractedMinComp: number | undefined;
  let extractedMaxComp: number | undefined;
  let currency: 'VND' | 'USD' | undefined;

  const usdRegex = /(?:\$|usd\s*)\s*(\d{1,2}(?:[.,]\d{3})*|\d{2,5})\s*(?:-|to|đến)\s*(?:\$|usd\s*)?(\d{1,2}(?:[.,]\d{3})*|\d{2,5})\s*(?:usd|\$|\/month|gross|net)?/i;
  const vndRegex = /(\d{2,3})\s*(?:-|to|đến)\s*(\d{2,3})\s*(?:triệu|tr|m|million)\s*(?:vnd|đồng)?/i;

  const usdMatch = text.match(usdRegex);
  if (usdMatch) {
    currency = 'USD';
    const minVal = parseInt(usdMatch[1].replace(/[^0-9]/g, ''), 10);
    const maxVal = parseInt(usdMatch[2].replace(/[^0-9]/g, ''), 10);
    extractedMinComp = minVal < 100 ? minVal * 1000 : minVal;
    extractedMaxComp = maxVal < 100 ? maxVal * 1000 : maxVal;
    salaryClue = `$${extractedMinComp.toLocaleString()} - $${extractedMaxComp.toLocaleString()} USD`;
  } else {
    const vndMatch = text.match(vndRegex);
    if (vndMatch) {
      currency = 'VND';
      extractedMinComp = parseInt(vndMatch[1], 10) * 1000000;
      extractedMaxComp = parseInt(vndMatch[2], 10) * 1000000;
      salaryClue = `${vndMatch[1]} - ${vndMatch[2]} Triệu VND`;
    }
  }

  let mandateExclusivity: MandateExclusivity = 'unconfirmed';
  if (lower.includes('exclusive') || lower.includes('độc quyền') || lower.includes('retained') || lower.includes('sole partner')) {
    mandateExclusivity = 'exclusive_retained';
  } else if (agencyTier === 'internal_corporate' || lower.includes('direct team') || lower.includes('in-house')) {
    mandateExclusivity = 'internal_direct';
  } else if (lower.includes('contingent') || lower.includes('shared') || lower.includes('one of the vendors')) {
    mandateExclusivity = 'contingency_shared';
  }

  const redFlags: string[] = [];
  const greenFlags: string[] = [];

  if (lower.includes('gửi cv') || lower.includes('send your cv') || lower.includes('share your resume')) {
    if (!salaryClue && isConfidentialCompany) {
      redFlags.push('Đòi hỏi gửi CV trước khi cung cấp tên công ty hoặc khung đãi ngộ.');
    }
  }
  if (lower.includes('dear sir') || lower.includes('dear candidate') || lower.includes('chào bạn')) {
    redFlags.push('Lời chào chung chung dạng gửi hàng loạt (mass cold message).');
  }
  if (!salaryClue) {
    redFlags.push('Không đề cập rõ khung ngân sách hoặc dải lương dự kiến.');
  }

  if (mandateExclusivity === 'exclusive_retained') {
    greenFlags.push('Hợp đồng tìm kiếm độc quyền (Retained Mandate), hạn chế rủi ro tranh chấp agency.');
  }
  if (salaryClue) {
    greenFlags.push(`Minh bạch dải ngân sách tuyển dụng: ${salaryClue}.`);
  }
  if (agencyTier === 'tier1_global') {
    greenFlags.push(`Agency nhóm Tier-1 Quốc tế (${agencyName}) có uy tín và quy trình bảo mật cao.`);
  }

  const reqKeywords = ['golang', 'java', 'nodejs', 'react', 'kubernetes', 'aws', 'microservices', 'system design', 'distributed systems', 'leadership', 'fintech'];
  const keyRequirements: string[] = [];
  for (const rk of reqKeywords) {
    if (lower.includes(rk)) {
      keyRequirements.push(rk.toUpperCase());
    }
  }

  let confidenceScore = 60;
  if (recruiterName) confidenceScore += 10;
  if (targetRole) confidenceScore += 10;
  if (salaryClue) confidenceScore += 10;
  if (agencyTier !== 'independent') confidenceScore += 10;

  const summary = `Cơ hội vị trí ${targetRole} tại ${targetCompany} do ${recruiterName || 'chuyên viên'} đại diện từ ${agencyName} (${mandateExclusivity === 'exclusive_retained' ? 'Độc quyền' : 'Chưa xác nhận độc quyền'}). ${salaryClue ? `Ngân sách: ${salaryClue}.` : 'Chưa có ngân sách công khai.'}`;

  return {
    recruiterName,
    recruiterTitle: agencyTier === 'tier1_global' ? 'Senior Executive Consultant' : 'Tech Recruiter',
    agencyName,
    agencyTier,
    targetRole,
    targetCompany,
    isConfidentialCompany,
    companyClues,
    location: lower.includes('hà nội') || lower.includes('hanoi') ? 'Hà Nội' : lower.includes('đà nẵng') ? 'Đà Nẵng' : 'TP. Hồ Chí Minh / Hybrid',
    salaryClue,
    extractedMinComp,
    extractedMaxComp,
    currency,
    mandateExclusivity,
    keyRequirements: keyRequirements.slice(0, 5),
    redFlags,
    greenFlags,
    confidenceScore: Math.min(100, confidenceScore),
    summary
  };
}

export function generateRecruiterReplyDraft(
  pitch: InboundPitchParseResultDTO,
  intent: RecruiterReplyIntent = 'explore_with_criteria',
  candidatePrefs?: {
    minCompGross?: number;
    preferredCurrency?: 'VND' | 'USD';
    candidateName?: string;
  }
): RecruiterResponseDraftDTO {
  const recruiter = pitch.recruiterName || 'bạn';
  const role = pitch.targetRole || 'vai trò kỹ thuật';
  const company = pitch.targetCompany || 'doanh nghiệp';
  const agency = pitch.agencyName || 'quý công ty';

  if (intent === 'salary_first') {
    const minCompStr = candidatePrefs?.minCompGross
      ? `${candidatePrefs.minCompGross.toLocaleString('en-US')} ${candidatePrefs.preferredCurrency || 'USD'}`
      : '$4,500 - $6,000 USD gross';

    return {
      intent,
      subject: `Phản hồi cơ hội ${role} - Trao đổi tiêu chí đãi ngộ ban đầu`,
      body: `Chào ${recruiter},\n\nCảm ơn bạn đã kết nối và chủ động chia sẻ về cơ hội ${role} tại ${company}.\n\nHiện tại tôi đang cân nhắc các bước tiến sự nghiệp mới với các tiêu chí khá rõ ràng. Để đảm bảo phù hợp với định hướng của cả hai bên và tối ưu hóa thời gian trao đổi, bạn vui lòng cho tôi biết khung ngân sách dự kiến của doanh nghiệp cho vị trí này có nằm trong khoảng từ ${minCompStr} trở lên hay không?\n\nNếu dải đãi ngộ phù hợp, tôi rất sẵn lòng nhận bản Mô tả công việc (JD) chi tiết để cùng tìm hiểu sâu hơn.\n\nRất mong nhận được phản hồi từ bạn!\nTrân trọng,`,
      strategyNotes: 'Chiến thuật phòng ngự giá: Xác lập ngưỡng sàn kỳ vọng ngay từ đầu nhằm lọc bỏ các agency có ngân sách thấp, tránh mất thời gian phỏng vấn không hiệu quả.',
      suggestedTone: 'assertive_executive'
    };
  }

  if (intent === 'exclusive_mandate_check') {
    return {
      intent,
      subject: `Xác nhận quyền đại diện độc quyền cho vị trí ${role} tại ${company}`,
      body: `Chào ${recruiter},\n\nCảm ơn ${agency} đã tiếp cận tôi cho cơ hội ${role}.\n\nDo tôi luôn tuân thủ nguyên tắc bảo mật và phòng tránh tranh chấp quyền đại diện (Double-Submission Conflict) trên hệ thống ATS của doanh nghiệp, bạn vui lòng xác nhận rõ:\n1. Phía ${agency} đang làm việc theo hợp đồng Độc quyền (Retained Mandate) hay Contingency với doanh nghiệp này?\n2. Bạn có quyền tiếp cận trực tiếp với Hiring Manager (CTO / VP Engineering) không?\n\nTôi xin phép chỉ đồng ý chuyển tiếp hồ sơ chi tiết khi có sự đồng thuận bằng văn bản về quyền đại diện độc quyền cho mandate này.\n\nCảm ơn bạn đã thấu hiểu tính chất nhạy cảm của các vị trí cấp cao!\nTrân trọng,`,
      strategyNotes: 'Chiến thuật phòng tránh Lockout: Buộc headhunter phải chứng minh tính độc quyền trước khi có được sự chấp thuận đại diện từ bạn.',
      suggestedTone: 'cautious_professional'
    };
  }

  if (intent === 'polite_pass') {
    return {
      intent,
      subject: `Cảm ơn cơ hội ${role} từ ${agency}`,
      body: `Chào ${recruiter},\n\nCảm ơn bạn đã dành thời gian xem hồ sơ của tôi và chia sẻ thông tin về vị trí ${role}.\n\nHiện tại tôi đang tập trung hoàn thành một số cột mốc chiến lược quan trọng tại tổ chức hiện tại nên chưa có kế hoạch thay đổi môi trường làm việc trong thời gian ngắn tới.\n\nTuy nhiên, tôi rất ấn tượng với phong cách làm việc chuyên nghiệp của bạn và ${agency}. Chúng ta hãy giữ liên lạc trên LinkedIn để có thể kết nối lại trong những cơ hội tương lai phù hợp hơn nhé.\n\nChúc bạn một tuần làm việc hiệu quả và sớm tìm được ứng viên xuất sắc cho dự án này!\nTrân trọng,`,
      strategyNotes: 'Chiến thuật ngoại giao bền vững: Từ chối lịch sự và ấm áp để duy trì quan hệ lâu dài với headhunter chất lượng cho những năm tiếp theo.',
      suggestedTone: 'cordial_decline'
    };
  }

  return {
    intent: 'explore_with_criteria',
    subject: `Quan tâm cơ hội ${role} tại ${company} - Đề nghị thông tin chi tiết`,
    body: `Chào ${recruiter},\n\nCảm ơn bạn đã gửi lời mời trao đổi về vị trí ${role}.\n\nSau khi xem qua định hướng sơ bộ, tôi thấy đây là cơ hội tiềm năng phù hợp với chuyên môn lãnh đạo kỹ thuật và xây dựng hệ thống của mình. Để có cơ sở đánh giá kỹ lưỡng trước khi sắp xếp lịch gọi trao đổi, bạn vui lòng chia sẻ giúp tôi:\n1. Bản Mô tả công việc (JD) đầy đủ kèm cơ cấu đội ngũ kỹ thuật hiện tại.\n2. Khung ngân sách dự kiến (Base salary + Equity/Bonus) cho vai trò này.\n3. Chính sách làm việc (On-site / Hybrid / Remote).\n\nSau khi nghiên cứu tài liệu, tôi sẽ chủ động gửi lại hồ sơ cập nhật và đề xuất khung giờ đàm thoại phù hợp.\n\nChúc bạn một ngày làm việc thuận lợi!\nTrân trọng,`,
    strategyNotes: 'Chiến thuật khảo sát có điều kiện: Duy trì quyền chủ động thông tin, chỉ cung cấp CV khi recruiter đã cung cấp đầy đủ JD và ngân sách.',
    suggestedTone: 'assertive_executive'
  };
}

export function validateParsePitchInput(raw: unknown): ValidationResult<ParseRecruiterPitchInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.rawText || typeof b.rawText !== 'string' || b.rawText.trim().length === 0) {
    errors.rawText = 'Nội dung tin nhắn từ headhunter không được để trống.';
  } else if (b.rawText.trim().length > 10000) {
    errors.rawText = 'Nội dung tin nhắn không được vượt quá 10,000 ký tự.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực dữ liệu bóc tách pitch.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      rawText: (b.rawText as string).trim(),
      channel: (b.channel as ParseRecruiterPitchInputDTO['channel']) || 'linkedin_inmail'
    }
  };
}

export function validateRecruiterLeadInput(raw: unknown): ValidationResult<RecruiterLeadMutationInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.name || typeof b.name !== 'string' || b.name.trim().length === 0) {
    errors.name = 'Tên headhunter/recruiter là bắt buộc.';
  } else if (b.name.trim().length > 150) {
    errors.name = 'Tên recruiter không được vượt quá 150 ký tự.';
  }

  if (!b.agency || typeof b.agency !== 'string' || b.agency.trim().length === 0) {
    errors.agency = 'Tên agency tuyển dụng là bắt buộc.';
  } else if (b.agency.trim().length > 150) {
    errors.agency = 'Tên agency không được vượt quá 150 ký tự.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực thông tin recruiter.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      name: (b.name as string).trim(),
      agency: (b.agency as string).trim(),
      agencyTier: (b.agencyTier as HeadhunterAgencyTier) || 'independent',
      role: typeof b.role === 'string' && b.role.trim() ? b.role.trim() : 'Executive Recruiter',
      email: typeof b.email === 'string' ? b.email.trim() : undefined,
      phone: typeof b.phone === 'string' ? b.phone.trim() : undefined,
      linkedinUrl: typeof b.linkedinUrl === 'string' ? b.linkedinUrl.trim() : undefined,
      tier: (b.tier as RecruiterRelationshipTier) || 'preferred_partner',
      rating: typeof b.rating === 'number' ? Math.max(1, Math.min(5, b.rating)) : 4,
      specialties: Array.isArray(b.specialties) ? b.specialties.map(String) : [],
      notes: typeof b.notes === 'string' ? b.notes : undefined,
      lastContactedAt: typeof b.lastContactedAt === 'string' ? b.lastContactedAt : undefined
    }
  };
}

export function validateMandateInput(raw: unknown): ValidationResult<HeadhunterMandateMutationInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.leadId || typeof b.leadId !== 'string' || b.leadId.trim().length === 0) {
    errors.leadId = 'ID recruiter đại diện là bắt buộc.';
  }

  if (!b.roleTitle || typeof b.roleTitle !== 'string' || b.roleTitle.trim().length === 0) {
    errors.roleTitle = 'Vị trí mandate là bắt buộc.';
  }

  if (!b.clientCompany || typeof b.clientCompany !== 'string' || b.clientCompany.trim().length === 0) {
    errors.clientCompany = 'Tên doanh nghiệp là bắt buộc.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực mandate.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      leadId: (b.leadId as string).trim(),
      roleTitle: (b.roleTitle as string).trim(),
      clientCompany: (b.clientCompany as string).trim(),
      isConfidential: Boolean(b.isConfidential),
      exclusivity: (b.exclusivity as MandateExclusivity) || 'unconfirmed',
      salaryRange: typeof b.salaryRange === 'string' ? b.salaryRange.trim() : undefined,
      applicationId: typeof b.applicationId === 'string' ? b.applicationId.trim() : undefined,
      status: (b.status as MandateStatus) || 'pitched',
      notes: typeof b.notes === 'string' ? b.notes : undefined
    }
  };
}

export function validateRecruiterReplyDraftInput(raw: unknown): ValidationResult<{
  pitch: InboundPitchParseResultDTO;
  intent: RecruiterReplyIntent;
}> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.pitch || typeof b.pitch !== 'object') {
    errors.pitch = 'Dữ liệu pitch đã phân tích là bắt buộc.';
  }

  const validIntents: RecruiterReplyIntent[] = ['explore_with_criteria', 'salary_first', 'polite_pass', 'exclusive_mandate_check'];
  if (!b.intent || typeof b.intent !== 'string' || !validIntents.includes(b.intent as RecruiterReplyIntent)) {
    errors.intent = 'Mục đích phản hồi không hợp lệ.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Lỗi xác thực yêu cầu soạn thảo phản hồi.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      pitch: b.pitch as InboundPitchParseResultDTO,
      intent: b.intent as RecruiterReplyIntent
    }
  };
}
