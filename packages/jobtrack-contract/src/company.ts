export interface CompanySalaryBenchmarkDTO {
  role: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Principal';
  min: number;
  median: number;
  max: number;
  currency: 'VND' | 'USD';
  sampleSize: number;
}

export interface CompanyInterviewQuestionDTO {
  id: string;
  role: string;
  category: 'technical' | 'system_design' | 'behavioral' | 'culture';
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sampleAnswer?: string;
  tips?: string[];
}

export interface CompanyReviewDTO {
  id: string;
  companyName: string;
  userId?: string;
  role: string;
  rating: number;
  workLifeBalance: number;
  compensationRating: number;
  careerGrowth: number;
  managementRating: number;
  recommend: boolean;
  pros: string;
  cons: string;
  advice?: string;
  createdAt: string;
}

export interface CompanyCultureScoresDTO {
  overall: number;
  workLife: number;
  compensation: number;
  careerGrowth: number;
  management: number;
  recommendRate: number;
  totalReviews: number;
}

export type CompanyFieldSource =
  | 'user'
  | 'jsonld'
  | 'llm_grounded'
  | 'wikidata'
  | 'places'
  | 'manual';

export interface CompanyFieldProvenance {
  source: CompanyFieldSource;
  confidence: number;
  evidence: string | null;
  verifiedAt: string;
}

export type CompanyProvenanceMap = Partial<Record<
  'industry' | 'size' | 'headquarters' | 'website' | 'description' | 'techStack',
  CompanyFieldProvenance
>>;

export interface CompanyPlacesDTO {
  placeId: string;
  rating: number;
  ratingCount: number;
  fetchedAt: string;
}

export interface CompanyEnrichmentStateDTO {
  canEnrich: boolean;
  running: boolean;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  missing: string[];
}

export interface CompanyProfileDTO {
  name: string;
  industry: string;
  size: string;
  headquarters: string;
  website: string;
  logoUrl?: string;
  description: string;
  techStack: string[];
  cultureScores: CompanyCultureScoresDTO | null;
  salaryBenchmarks: CompanySalaryBenchmarkDTO[];
  interviewQuestions: CompanyInterviewQuestionDTO[];
  recentReviews: CompanyReviewDTO[];
  keyPros: string[];
  keyRedFlags: string[];
  provenance: CompanyProvenanceMap;
  places: CompanyPlacesDTO | null;
  enrichment: CompanyEnrichmentStateDTO;
  updatedAt: string;
}

export function calculateCompanyAggregates(reviews: CompanyReviewDTO[]): CompanyCultureScoresDTO | null {
  if (!reviews || reviews.length === 0) return null;

  let totalOverall = 0;
  let totalWorkLife = 0;
  let totalComp = 0;
  let totalGrowth = 0;
  let totalMgmt = 0;
  let recommendCount = 0;

  for (const r of reviews) {
    totalOverall += Number(r.rating) || 0;
    totalWorkLife += Number(r.workLifeBalance) || 0;
    totalComp += Number(r.compensationRating) || 0;
    totalGrowth += Number(r.careerGrowth) || 0;
    totalMgmt += Number(r.managementRating) || 0;
    if (r.recommend) recommendCount++;
  }

  const n = reviews.length;
  const round1 = (val: number) => Math.round((val / n) * 10) / 10;

  return {
    overall: round1(totalOverall),
    workLife: round1(totalWorkLife),
    compensation: round1(totalComp),
    careerGrowth: round1(totalGrowth),
    management: round1(totalMgmt),
    recommendRate: Math.round((recommendCount / n) * 100),
    totalReviews: n
  };
}

export function validateCompanyReviewInput(input: unknown): {
  ok: boolean;
  data: Omit<CompanyReviewDTO, 'id' | 'createdAt'>;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      data: {
        companyName: '',
        role: '',
        rating: 5,
        workLifeBalance: 5,
        compensationRating: 5,
        careerGrowth: 5,
        managementRating: 5,
        recommend: true,
        pros: '',
        cons: ''
      },
      message: 'Dữ liệu đánh giá công ty không hợp lệ.',
      errors: { input: 'Nội dung yêu cầu phải là đối tượng JSON.' }
    };
  }

  const b = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const companyName = typeof b.companyName === 'string' ? b.companyName.trim() : '';
  if (!companyName) {
    errors.companyName = 'Tên công ty không được để trống.';
  }

  const role = typeof b.role === 'string' ? b.role.trim() : '';
  if (!role) {
    errors.role = 'Vị trí công việc không được để trống.';
  }

  const clampRating = (val: unknown, field: string) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num < 1 || num > 5) {
      errors[field] = 'Điểm đánh giá phải từ 1 đến 5 sao.';
      return 5;
    }
    return Math.round(num);
  };

  const rating = clampRating(b.rating, 'rating');
  const workLifeBalance = clampRating(b.workLifeBalance, 'workLifeBalance');
  const compensationRating = clampRating(b.compensationRating, 'compensationRating');
  const careerGrowth = clampRating(b.careerGrowth, 'careerGrowth');
  const managementRating = clampRating(b.managementRating, 'managementRating');

  const pros = typeof b.pros === 'string' ? b.pros.trim() : '';
  if (!pros || pros.length < 10) {
    errors.pros = 'Điểm mạnh (Pros) phải chứa ít nhất 10 ký tự.';
  }

  const cons = typeof b.cons === 'string' ? b.cons.trim() : '';
  if (!cons || cons.length < 10) {
    errors.cons = 'Điểm cần cải thiện (Cons) phải chứa ít nhất 10 ký tự.';
  }

  const advice = typeof b.advice === 'string' ? b.advice.trim() : undefined;
  const recommend = b.recommend !== false;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: {
        companyName,
        role,
        rating,
        workLifeBalance,
        compensationRating,
        careerGrowth,
        managementRating,
        recommend,
        pros,
        cons,
        advice
      },
      message: 'Thông tin đánh giá chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      companyName,
      role,
      rating,
      workLifeBalance,
      compensationRating,
      careerGrowth,
      managementRating,
      recommend,
      pros,
      cons,
      advice
    }
  };
}
