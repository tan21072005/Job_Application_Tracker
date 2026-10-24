import type { ValidationResult } from './validators.ts';

export const DECISION_DIMENSIONS = [
  'compensation',
  'work_life_balance',
  'career_growth',
  'company_culture',
  'commute_flexibility',
  'leadership_team',
  'tech_stack'
] as const;

export type DecisionDimensionKey = typeof DECISION_DIMENSIONS[number];

export interface DimensionMeta {
  key: DecisionDimensionKey;
  label: string;
  description: string;
  defaultWeight: number;
  minScore: number;
  maxScore: number;
}

export const DIMENSION_METADATA: Record<DecisionDimensionKey, DimensionMeta> = {
  compensation: {
    key: 'compensation',
    label: 'Lương thưởng & Phúc lợi',
    description: 'Thu nhập cơ bản, thưởng hiệu suất, cổ phần (ESOP/RSU), gói bảo hiểm và phụ cấp.',
    defaultWeight: 25,
    minScore: 1,
    maxScore: 10
  },
  work_life_balance: {
    key: 'work_life_balance',
    label: 'Cân bằng Cuộc sống',
    description: 'Áp lực giờ làm việc, kỳ vọng làm ngoài giờ, chế độ nghỉ phép và tôn trọng thời gian cá nhân.',
    defaultWeight: 20,
    minScore: 1,
    maxScore: 10
  },
  career_growth: {
    key: 'career_growth',
    label: 'Cơ hội Thăng tiến & Học hỏi',
    description: 'Lộ trình thăng tiến rõ ràng, bài toán quy mô lớn, sự cố vấn và ngân sách đào tạo.',
    defaultWeight: 20,
    minScore: 1,
    maxScore: 10
  },
  company_culture: {
    key: 'company_culture',
    label: 'Văn hóa & Môi trường',
    description: 'Sự an toàn tâm lý, minh bạch của đồng nghiệp, tôn trọng lẫn nhau và tinh thần cộng tác.',
    defaultWeight: 15,
    minScore: 1,
    maxScore: 10
  },
  commute_flexibility: {
    key: 'commute_flexibility',
    label: 'Địa điểm & Linh hoạt',
    description: 'Mô hình Remote/Hybrid, khoảng cách di chuyển và sự chủ động sắp xếp thời gian làm việc.',
    defaultWeight: 10,
    minScore: 1,
    maxScore: 10
  },
  leadership_team: {
    key: 'leadership_team',
    label: 'Đội ngũ Lãnh đạo',
    description: 'Tầm nhìn ban điều hành, phong cách quản lý trực tiếp và sự ổn định của tổ chức.',
    defaultWeight: 5,
    minScore: 1,
    maxScore: 10
  },
  tech_stack: {
    key: 'tech_stack',
    label: 'Công nghệ & Thử thách Kỹ thuật',
    description: 'Bộ công cụ hiện đại, chuẩn kiến trúc hệ thống và quyền tự chủ trong giải pháp kỹ thuật.',
    defaultWeight: 5,
    minScore: 1,
    maxScore: 10
  }
};

export const DEFAULT_WEIGHT_PROFILE: Record<DecisionDimensionKey, number> = {
  compensation: 25,
  work_life_balance: 20,
  career_growth: 20,
  company_culture: 15,
  commute_flexibility: 10,
  leadership_team: 5,
  tech_stack: 5
};

export type ApplicationScorecard = Partial<Record<DecisionDimensionKey, number>>;

export interface ApplicationScorecardInput {
  scores: Record<DecisionDimensionKey, number>;
  notes?: string;
}

export interface EvaluatedOpportunity {
  id: string;
  company: string;
  position: string;
  status: string;
  scores: Record<DecisionDimensionKey, number>;
  compositeScore: number;
  rank: number;
  strengths: DecisionDimensionKey[];
  weaknesses: DecisionDimensionKey[];
}

export interface CategoryWinner {
  dimension: DecisionDimensionKey;
  dimensionLabel: string;
  winningOpportunityId: string;
  company: string;
  score: number;
}

export interface DecisionMatrixComparison {
  totalCompared: number;
  topPickId: string | null;
  opportunities: EvaluatedOpportunity[];
  categoryWinners: CategoryWinner[];
  appliedWeights: Record<DecisionDimensionKey, number>;
  analyzedAt: string;
}

export function normalizeWeights(
  rawWeights?: Partial<Record<DecisionDimensionKey, number>>
): Record<DecisionDimensionKey, number> {
  if (!rawWeights) {
    return { ...DEFAULT_WEIGHT_PROFILE };
  }

  const result: Record<DecisionDimensionKey, number> = { ...DEFAULT_WEIGHT_PROFILE };
  let totalRaw = 0;

  for (const key of DECISION_DIMENSIONS) {
    if (rawWeights[key] !== undefined) {
      const val = Number(rawWeights[key]);
      if (!Number.isNaN(val) && val >= 0) {
        result[key] = val;
      }
    }
    totalRaw += result[key];
  }

  if (totalRaw <= 0) {
    return { ...DEFAULT_WEIGHT_PROFILE };
  }

  let sumNormalized = 0;
  for (const key of DECISION_DIMENSIONS) {
    const norm = Math.round((result[key] / totalRaw) * 100);
    result[key] = norm;
    sumNormalized += norm;
  }

  const diff = 100 - sumNormalized;
  if (diff !== 0) {
    result.compensation += diff;
  }

  return result;
}

export function calculateCompositeScore(
  scores: Partial<Record<DecisionDimensionKey, number>>,
  weights: Record<DecisionDimensionKey, number>
): number {
  let composite = 0;
  for (const key of DECISION_DIMENSIONS) {
    const score = Math.max(1, Math.min(10, Number(scores[key]) || 5));
    const weightFraction = (weights[key] || 0) / 100;
    composite += weightFraction * (score * 10);
  }
  return Math.round(composite * 10) / 10;
}

export function evaluateDecisionMatrix(
  items: Array<{
    id: string;
    company: string;
    position: string;
    status: string;
    scores?: Partial<Record<DecisionDimensionKey, number>>;
  }>,
  customWeights?: Partial<Record<DecisionDimensionKey, number>>
): DecisionMatrixComparison {
  const weights = normalizeWeights(customWeights);
  const now = new Date().toISOString();

  if (!items || items.length === 0) {
    return {
      totalCompared: 0,
      topPickId: null,
      opportunities: [],
      categoryWinners: [],
      appliedWeights: weights,
      analyzedAt: now
    };
  }

  const evaluated: EvaluatedOpportunity[] = items.map((item) => {
    const safeScores: Record<DecisionDimensionKey, number> = {
      compensation: 5,
      work_life_balance: 5,
      career_growth: 5,
      company_culture: 5,
      commute_flexibility: 5,
      leadership_team: 5,
      tech_stack: 5
    };

    if (item.scores) {
      for (const key of DECISION_DIMENSIONS) {
        if (typeof item.scores[key] === 'number') {
          safeScores[key] = Math.max(1, Math.min(10, Math.round(item.scores[key]!)));
        }
      }
    }

    const compositeScore = calculateCompositeScore(safeScores, weights);
    const strengths: DecisionDimensionKey[] = [];
    const weaknesses: DecisionDimensionKey[] = [];

    for (const key of DECISION_DIMENSIONS) {
      if (safeScores[key] >= 8) {
        strengths.push(key);
      } else if (safeScores[key] <= 4) {
        weaknesses.push(key);
      }
    }

    return {
      id: item.id,
      company: item.company,
      position: item.position,
      status: item.status,
      scores: safeScores,
      compositeScore,
      rank: 1,
      strengths,
      weaknesses
    };
  });

  evaluated.sort((a, b) => b.compositeScore - a.compositeScore);

  evaluated.forEach((item, index) => {
    item.rank = index + 1;
  });

  const categoryWinners: CategoryWinner[] = DECISION_DIMENSIONS.map((dim) => {
    let topItem = evaluated[0];
    let topScore = topItem.scores[dim];

    for (let i = 1; i < evaluated.length; i++) {
      if (evaluated[i].scores[dim] > topScore) {
        topScore = evaluated[i].scores[dim];
        topItem = evaluated[i];
      }
    }

    return {
      dimension: dim,
      dimensionLabel: DIMENSION_METADATA[dim].label,
      winningOpportunityId: topItem.id,
      company: topItem.company,
      score: topScore
    };
  });

  return {
    totalCompared: evaluated.length,
    topPickId: evaluated.length > 0 ? evaluated[0].id : null,
    opportunities: evaluated,
    categoryWinners,
    appliedWeights: weights,
    analyzedAt: now
  };
}

export function validateWeightsInput(
  raw: unknown
): ValidationResult<Record<DecisionDimensionKey, number>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Trọng số đánh giá không hợp lệ.',
      errors: { weights: 'Dữ liệu trọng số phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};
  const parsed: Partial<Record<DecisionDimensionKey, number>> = {};

  for (const key of DECISION_DIMENSIONS) {
    if (b[key] !== undefined) {
      const num = Number(b[key]);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        errors[key] = `Trọng số ${DIMENSION_METADATA[key].label} phải là số từ 0 đến 100.`;
      } else {
        parsed[key] = Math.round(num);
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Trọng số có giá trị không hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: normalizeWeights(parsed)
  };
}

export function validateScorecardInput(
  raw: unknown
): ValidationResult<ApplicationScorecardInput> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu phiếu điểm không hợp lệ.',
      errors: { scorecard: 'Dữ liệu phiếu điểm phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.scores || typeof b.scores !== 'object' || Array.isArray(b.scores)) {
    return {
      ok: false,
      message: 'Danh sách điểm các tiêu chí là bắt buộc.',
      errors: { scores: 'Trường scores phải là đối tượng chứa điểm tiêu chí.' }
    };
  }

  const scoresRaw = b.scores as Record<string, unknown>;
  const safeScores: Record<DecisionDimensionKey, number> = {
    compensation: 5,
    work_life_balance: 5,
    career_growth: 5,
    company_culture: 5,
    commute_flexibility: 5,
    leadership_team: 5,
    tech_stack: 5
  };

  for (const key of DECISION_DIMENSIONS) {
    if (scoresRaw[key] !== undefined) {
      const val = Number(scoresRaw[key]);
      if (Number.isNaN(val) || val < 1 || val > 10) {
        errors[`scores.${key}`] = `Điểm tiêu chí ${DIMENSION_METADATA[key].label} phải từ 1 đến 10.`;
      } else {
        safeScores[key] = Math.round(val);
      }
    }
  }

  let notes: string | undefined = undefined;
  if (b.notes !== undefined) {
    if (typeof b.notes !== 'string') {
      errors.notes = 'Ghi chú phải là chuỗi ký tự.';
    } else {
      notes = b.notes.trim();
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Điểm tiêu chí không hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      scores: safeScores,
      notes
    }
  };
}
