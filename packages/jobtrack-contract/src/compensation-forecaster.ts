import type { ValidationResult } from './validators.ts';

export type Currency = 'VND' | 'USD';
export type EquityType = 'esop' | 'rsu' | 'none';
export type SeniorityLevel = 'mid' | 'senior' | 'lead' | 'staff' | 'principal';
export type MarketComparisonStatus = 'above_market' | 'at_market' | 'below_market';

export interface EquityGrantDTO {
  type: EquityType;
  totalShares: number;
  strikePrice: number;
  currentFairMarketValue: number;
  vestingYears: number;
  cliffMonths: number;
}

export interface CompensationPackageDTO {
  baseSalaryMonthly: number;
  currency: Currency;
  hasMonth13: boolean;
  performanceBonusAnnual: number;
  signingBonus?: number;
  equityGrant?: EquityGrantDTO;
}

export interface EquityVestingMilestoneDTO {
  year: number;
  vestedSharesCumulative: number;
  vestedSharesInYear: number;
  estimatedGrossValue: number;
  netGainValue: number;
}

export interface AnnualCompensationBreakdownDTO {
  year: number;
  baseSalaryAnnual: number;
  month13Bonus: number;
  performanceBonus: number;
  equityValue: number;
  totalGrossCompensation: number;
  estimatedNetTakeHome: number;
}

export interface CompensationForecastScenarioDTO {
  scenarioName: 'conservative' | 'baseline' | 'optimistic';
  equityGrowthMultiplierAnnual: number;
  salaryGrowthRateAnnual: number;
  kpiAchievementRate: number;
  annualBreakdowns: AnnualCompensationBreakdownDTO[];
  fourYearTotalGross: number;
  fourYearTotalNet: number;
  fourYearEquityTotal: number;
}

export interface CompensationBenchmarkDTO {
  role: string;
  level: SeniorityLevel;
  currency: Currency;
  p25AnnualCash: number;
  p50AnnualCash: number;
  p75AnnualCash: number;
  p90AnnualCash: number;
  candidateAnnualCash: number;
  candidatePercentile: number;
  marketComparisonStatus: MarketComparisonStatus;
}

export interface NegotiationLeveragePointDTO {
  dimension: 'base_salary' | 'bonus' | 'equity' | 'signing_bonus' | 'cliff_period';
  currentOfferValue: string;
  marketBenchmarkValue: string;
  deltaPercent?: number;
  leverageRationale: string;
  suggestedScript: string;
}

export interface CompensationForecastDTO {
  id: string;
  userId?: string;
  applicationId?: string | null;
  company: string;
  role: string;
  level: SeniorityLevel;
  package: CompensationPackageDTO;
  vestingSchedule: EquityVestingMilestoneDTO[];
  scenarios: {
    conservative: CompensationForecastScenarioDTO;
    baseline: CompensationForecastScenarioDTO;
    optimistic: CompensationForecastScenarioDTO;
  };
  benchmark: CompensationBenchmarkDTO;
  leveragePoints: NegotiationLeveragePointDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCompensationForecastInputDTO {
  company: string;
  role: string;
  level: SeniorityLevel;
  applicationId?: string;
  package: CompensationPackageDTO;
}

export function computeVestingSchedule(grant?: EquityGrantDTO): EquityVestingMilestoneDTO[] {
  if (!grant || grant.type === 'none' || grant.totalShares <= 0) {
    return [
      { year: 1, vestedSharesCumulative: 0, vestedSharesInYear: 0, estimatedGrossValue: 0, netGainValue: 0 },
      { year: 2, vestedSharesCumulative: 0, vestedSharesInYear: 0, estimatedGrossValue: 0, netGainValue: 0 },
      { year: 3, vestedSharesCumulative: 0, vestedSharesInYear: 0, estimatedGrossValue: 0, netGainValue: 0 },
      { year: 4, vestedSharesCumulative: 0, vestedSharesInYear: 0, estimatedGrossValue: 0, netGainValue: 0 }
    ];
  }

  const { totalShares, strikePrice, currentFairMarketValue, vestingYears, cliffMonths } = grant;
  const years = Math.max(1, vestingYears || 4);
  const milestones: EquityVestingMilestoneDTO[] = [];

  const sharesPerYear = Math.floor(totalShares / years);
  let cumulative = 0;

  for (let y = 1; y <= 4; y++) {
    let yearShares = 0;
    if (y <= years) {
      if (y === 1) {
        yearShares = cliffMonths > 12 ? 0 : sharesPerYear;
      } else {
        yearShares = y === years
          ? totalShares - cumulative
          : sharesPerYear;
      }
    }
    cumulative += yearShares;

    const estimatedGrossValue = yearShares * currentFairMarketValue;
    const unitGain = Math.max(0, currentFairMarketValue - strikePrice);
    const netGainValue = yearShares * unitGain;

    milestones.push({
      year: y,
      vestedSharesCumulative: cumulative,
      vestedSharesInYear: yearShares,
      estimatedGrossValue,
      netGainValue
    });
  }

  return milestones;
}

const SOCIAL_INSURANCE_CAP_VND = 46800000;
const UNEMPLOYMENT_INSURANCE_CAP_VND = 99200000;
const PERSONAL_TAX_RELIEF_VND = 11000000;

export function calculateNetTakeHomeVnd(grossMonthlyVnd: number): number {
  if (grossMonthlyVnd <= 0) return 0;

  const socialInsBase = Math.min(grossMonthlyVnd, SOCIAL_INSURANCE_CAP_VND);
  const socialIns = socialInsBase * 0.08;
  const healthIns = socialInsBase * 0.015;

  const unempInsBase = Math.min(grossMonthlyVnd, UNEMPLOYMENT_INSURANCE_CAP_VND);
  const unempIns = unempInsBase * 0.01;

  const totalInsurance = socialIns + healthIns + unempIns;
  const taxableIncome = Math.max(0, grossMonthlyVnd - totalInsurance - PERSONAL_TAX_RELIEF_VND);

  let pit = 0;
  if (taxableIncome > 80000000) {
    pit += (taxableIncome - 80000000) * 0.35 + 18150000;
  } else if (taxableIncome > 52000000) {
    pit += (taxableIncome - 52000000) * 0.30 + 9750000;
  } else if (taxableIncome > 32000000) {
    pit += (taxableIncome - 32000000) * 0.25 + 4750000;
  } else if (taxableIncome > 18000000) {
    pit += (taxableIncome - 18000000) * 0.20 + 1950000;
  } else if (taxableIncome > 10000000) {
    pit += (taxableIncome - 10000000) * 0.15 + 750000;
  } else if (taxableIncome > 5000000) {
    pit += (taxableIncome - 5000000) * 0.10 + 250000;
  } else {
    pit += taxableIncome * 0.05;
  }

  const netMonthly = grossMonthlyVnd - totalInsurance - pit;
  return Math.round(netMonthly);
}

export function forecastCompensationScenarios(
  pkg: CompensationPackageDTO
): {
  conservative: CompensationForecastScenarioDTO;
  baseline: CompensationForecastScenarioDTO;
  optimistic: CompensationForecastScenarioDTO;
} {
  const configs = [
    { name: 'conservative' as const, equityMultiplier: 0.95, salaryGrowth: 0.03, kpiRate: 0.8 },
    { name: 'baseline' as const, equityMultiplier: 1.15, salaryGrowth: 0.07, kpiRate: 1.0 },
    { name: 'optimistic' as const, equityMultiplier: 1.35, salaryGrowth: 0.12, kpiRate: 1.25 }
  ];

  const buildScenario = (cfg: typeof configs[number]): CompensationForecastScenarioDTO => {
    let currentMonthlyBase = pkg.baseSalaryMonthly;
    let currentFMV = pkg.equityGrant?.currentFairMarketValue || 0;
    const strike = pkg.equityGrant?.strikePrice || 0;

    const breakdowns: AnnualCompensationBreakdownDTO[] = [];
    let fourYearTotalGross = 0;
    let fourYearTotalNet = 0;
    let fourYearEquityTotal = 0;

    const vesting = computeVestingSchedule(pkg.equityGrant);

    for (let y = 1; y <= 4; y++) {
      if (y > 1) {
        currentMonthlyBase *= (1 + cfg.salaryGrowth);
        currentFMV *= cfg.equityMultiplier;
      }

      const baseAnnual = currentMonthlyBase * 12;
      const m13 = pkg.hasMonth13 ? currentMonthlyBase : 0;
      const perfBonus = (pkg.performanceBonusAnnual || 0) * cfg.kpiRate;

      const vYear = vesting.find(v => v.year === y);
      const vestedShares = vYear ? vYear.vestedSharesInYear : 0;
      const unitGain = Math.max(0, currentFMV - strike);
      const equityAnnual = vestedShares * unitGain;

      const totalGross = baseAnnual + m13 + perfBonus + equityAnnual;

      let netAnnual = 0;
      if (pkg.currency === 'VND') {
        const netBaseMonthly = calculateNetTakeHomeVnd(currentMonthlyBase);
        const netBaseAnnual = netBaseMonthly * 12;
        const netBonus = (m13 + perfBonus) * 0.70;
        const netEquity = equityAnnual * 0.90;
        netAnnual = netBaseAnnual + netBonus + netEquity;
      } else {
        netAnnual = totalGross * 0.75;
      }

      breakdowns.push({
        year: y,
        baseSalaryAnnual: Math.round(baseAnnual),
        month13Bonus: Math.round(m13),
        performanceBonus: Math.round(perfBonus),
        equityValue: Math.round(equityAnnual),
        totalGrossCompensation: Math.round(totalGross),
        estimatedNetTakeHome: Math.round(netAnnual)
      });

      fourYearTotalGross += totalGross;
      fourYearTotalNet += netAnnual;
      fourYearEquityTotal += equityAnnual;
    }

    return {
      scenarioName: cfg.name,
      equityGrowthMultiplierAnnual: cfg.equityMultiplier,
      salaryGrowthRateAnnual: cfg.salaryGrowth,
      kpiAchievementRate: cfg.kpiRate,
      annualBreakdowns: breakdowns,
      fourYearTotalGross: Math.round(fourYearTotalGross),
      fourYearTotalNet: Math.round(fourYearTotalNet),
      fourYearEquityTotal: Math.round(fourYearEquityTotal)
    };
  };

  return {
    conservative: buildScenario(configs[0]),
    baseline: buildScenario(configs[1]),
    optimistic: buildScenario(configs[2])
  };
}

const MARKET_BENCHMARK_RATES_VND: Record<string, Record<SeniorityLevel, { p25: number; p50: number; p75: number; p90: number }>> = {
  frontend: {
    mid: { p25: 360000000, p50: 450000000, p75: 550000000, p90: 680000000 },
    senior: { p25: 550000000, p50: 720000000, p75: 900000000, p90: 1100000000 },
    lead: { p25: 780000000, p50: 1000000000, p75: 1250000000, p90: 1550000000 },
    staff: { p25: 1050000000, p50: 1350000000, p75: 1700000000, p90: 2100000000 },
    principal: { p25: 1400000000, p50: 1800000000, p75: 2300000000, p90: 2900000000 }
  },
  backend: {
    mid: { p25: 380000000, p50: 480000000, p75: 600000000, p90: 720000000 },
    senior: { p25: 600000000, p50: 780000000, p75: 960000000, p90: 1200000000 },
    lead: { p25: 850000000, p50: 1100000000, p75: 1350000000, p90: 1700000000 },
    staff: { p25: 1150000000, p50: 1500000000, p75: 1900000000, p90: 2350000000 },
    principal: { p25: 1550000000, p50: 2000000000, p75: 2550000000, p90: 3200000000 }
  },
  fullstack: {
    mid: { p25: 370000000, p50: 460000000, p75: 580000000, p90: 700000000 },
    senior: { p25: 580000000, p50: 750000000, p75: 930000000, p90: 1150000000 },
    lead: { p25: 820000000, p50: 1050000000, p75: 1300000000, p90: 1600000000 },
    staff: { p25: 1100000000, p50: 1420000000, p75: 1800000000, p90: 2200000000 },
    principal: { p25: 1480000000, p50: 1900000000, p75: 2400000000, p90: 3050000000 }
  },
  devops: {
    mid: { p25: 400000000, p50: 500000000, p75: 620000000, p90: 750000000 },
    senior: { p25: 650000000, p50: 820000000, p75: 1020000000, p90: 1280000000 },
    lead: { p25: 900000000, p50: 1180000000, p75: 1450000000, p90: 1800000000 },
    staff: { p25: 1200000000, p50: 1600000000, p75: 2050000000, p90: 2500000000 },
    principal: { p25: 1600000000, p50: 2100000000, p75: 2700000000, p90: 3400000000 }
  }
};

export function evaluateMarketBenchmark(
  role: string,
  level: SeniorityLevel,
  candidateAnnualCash: number,
  currency: Currency = 'VND'
): CompensationBenchmarkDTO {
  const normRole = (role || '').toLowerCase();
  let track = 'fullstack';
  if (normRole.includes('front')) track = 'frontend';
  else if (normRole.includes('back')) track = 'backend';
  else if (normRole.includes('devops') || normRole.includes('sre') || normRole.includes('cloud')) track = 'devops';

  const trackRates = MARKET_BENCHMARK_RATES_VND[track] || MARKET_BENCHMARK_RATES_VND.fullstack;
  const rates = trackRates[level] || trackRates.senior;

  let multiplier = 1;
  if (currency === 'USD') {
    multiplier = 1 / 25000;
  }

  const p25 = Math.round(rates.p25 * multiplier);
  const p50 = Math.round(rates.p50 * multiplier);
  const p75 = Math.round(rates.p75 * multiplier);
  const p90 = Math.round(rates.p90 * multiplier);

  let candidatePercentile = 50;
  if (candidateAnnualCash <= p25) {
    candidatePercentile = Math.max(10, Math.round((candidateAnnualCash / p25) * 25));
  } else if (candidateAnnualCash <= p50) {
    candidatePercentile = 25 + Math.round(((candidateAnnualCash - p25) / (p50 - p25)) * 25);
  } else if (candidateAnnualCash <= p75) {
    candidatePercentile = 50 + Math.round(((candidateAnnualCash - p50) / (p75 - p50)) * 25);
  } else if (candidateAnnualCash <= p90) {
    candidatePercentile = 75 + Math.round(((candidateAnnualCash - p75) / (p90 - p75)) * 15);
  } else {
    candidatePercentile = Math.min(99, 90 + Math.round(((candidateAnnualCash - p90) / p90) * 10));
  }

  let marketComparisonStatus: MarketComparisonStatus = 'at_market';
  if (candidatePercentile < 40) {
    marketComparisonStatus = 'below_market';
  } else if (candidatePercentile > 75) {
    marketComparisonStatus = 'above_market';
  }

  return {
    role,
    level,
    currency,
    p25AnnualCash: p25,
    p50AnnualCash: p50,
    p75AnnualCash: p75,
    p90AnnualCash: p90,
    candidateAnnualCash,
    candidatePercentile,
    marketComparisonStatus
  };
}

export function deriveNegotiationLeveragePoints(
  pkg: CompensationPackageDTO,
  benchmark: CompensationBenchmarkDTO,
  company: string
): NegotiationLeveragePointDTO[] {
  const points: NegotiationLeveragePointDTO[] = [];
  const fmt = (num: number) => num.toLocaleString('en-US');

  if (benchmark.candidateAnnualCash < benchmark.p50AnnualCash) {
    const delta = Math.round(((benchmark.p50AnnualCash - benchmark.candidateAnnualCash) / benchmark.candidateAnnualCash) * 100);
    points.push({
      dimension: 'base_salary',
      currentOfferValue: `${fmt(benchmark.candidateAnnualCash)} ${pkg.currency} / năm`,
      marketBenchmarkValue: `${fmt(benchmark.p50AnnualCash)} ${pkg.currency} (Mức trung vị P50)`,
      deltaPercent: delta,
      leverageRationale: `Gói thu nhập tiền mặt hiện tại thấp hơn ${delta}% so với mức trung vị thị trường P50 cho vị trí ${benchmark.role} (${benchmark.level}).`,
      suggestedScript: `Dựa trên dữ liệu khảo sát thị trường công nghệ cho vị trí ${benchmark.role} (${benchmark.level}), mức trung vị thị trường hiện đang ở mức ${fmt(benchmark.p50AnnualCash)} ${pkg.currency}/năm. Để đảm bảo sự gắn bó lâu dài và phát huy tối đa năng lực, mình mong muốn team có thể cân nhắc điều chỉnh mức thu nhập tiền mặt lên khoảng ${fmt(benchmark.p50AnnualCash)} ${pkg.currency}.`
    });
  }

  if (!pkg.equityGrant || pkg.equityGrant.type === 'none' || pkg.equityGrant.totalShares === 0) {
    points.push({
      dimension: 'equity',
      currentOfferValue: 'Không có ESOP / Cổ phần thưởng',
      marketBenchmarkValue: 'Gói ESOP 4 năm có giá trị tích lũy',
      leverageRationale: `Các công ty công nghệ cùng phân khúc với ${company} thường cấp thêm ESOP để khuyến khích quyền sở hữu lâu dài.`,
      suggestedScript: `Mình nhận thấy đề nghị hiện tại chưa bao gồm chương trình quyền chọn cổ phần (ESOP). Vì mình định hướng đồng hành lâu dài cùng sự tăng trưởng của ${company}, mình rất mong muốn được thảo luận về gói ESOP tương xứng với vai trò ${benchmark.role}.`
    });
  } else if (pkg.equityGrant.cliffMonths > 12) {
    points.push({
      dimension: 'cliff_period',
      currentOfferValue: `Thời hạn cliff ${pkg.equityGrant.cliffMonths} tháng`,
      marketBenchmarkValue: 'Thời hạn cliff chuẩn thị trường 12 tháng (25%)',
      leverageRationale: 'Thời hạn cliff trên 12 tháng làm tăng rủi ro tài chính của ứng viên nếu có biến động tái cơ cấu.',
      suggestedScript: `Về điều khoản ESOP, thời gian cliff ${pkg.equityGrant.cliffMonths} tháng đang dài hơn thông lệ chuẩn của ngành (12 tháng). Mình đề xuất áp dụng chuẩn 1-year cliff 25% và vesting hàng quý sau đó để tạo sự an tâm và minh bạch cho cả hai bên.`
    });
  }

  if (!pkg.signingBonus && benchmark.candidateAnnualCash < benchmark.p75AnnualCash) {
    points.push({
      dimension: 'signing_bonus',
      currentOfferValue: 'Chưa có thưởng gia nhập (Signing Bonus)',
      marketBenchmarkValue: 'Signing Bonus bù đắp cổ phần/thưởng cuối năm ở công ty cũ',
      leverageRationale: 'Signing Bonus là đòn bẩy một lần ít gây áp lực lên khung lương định kỳ của phòng nhân sự.',
      suggestedScript: `Nếu việc điều chỉnh mức lương định kỳ gặp hạn chế về khung thang bảng lương của công ty, mình đề xuất bổ sung một khoản Signing Bonus một lần để bù đắp cho phần thưởng cuối năm mà mình phải từ bỏ ở công ty hiện tại khi chuyển việc vào thời điểm này.`
    });
  }

  return points;
}

export function validateCreateCompensationForecastInput(input: unknown): ValidationResult<CreateCompensationForecastInputDTO> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { input: 'Dữ liệu dự báo thù lao phải là đối tượng JSON.' }, message: 'Dữ liệu không hợp lệ.' };
  }

  const b = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const company = typeof b.company === 'string' ? b.company.trim() : '';
  if (!company) errors.company = 'Tên công ty không được để trống.';

  const role = typeof b.role === 'string' ? b.role.trim() : '';
  if (!role) errors.role = 'Vị trí công việc không được để trống.';

  const rawLevel = typeof b.level === 'string' ? b.level.toLowerCase().trim() : '';
  const validLevels: SeniorityLevel[] = ['mid', 'senior', 'lead', 'staff', 'principal'];
  const level: SeniorityLevel = validLevels.includes(rawLevel as SeniorityLevel) ? (rawLevel as SeniorityLevel) : 'senior';

  const pkgRaw = b.package as Record<string, unknown> | undefined;
  if (!pkgRaw || typeof pkgRaw !== 'object') {
    errors.package = 'Thông tin gói đãi ngộ là bắt buộc.';
    return {
      ok: false,
      errors,
      message: 'Thông tin gói đãi ngộ không hợp lệ.'
    };
  }

  const baseSalaryMonthly = typeof pkgRaw.baseSalaryMonthly === 'number' && pkgRaw.baseSalaryMonthly >= 0 ? pkgRaw.baseSalaryMonthly : 0;
  if (baseSalaryMonthly <= 0) {
    errors['package.baseSalaryMonthly'] = 'Lương cơ bản hàng tháng phải lớn hơn 0.';
  }

  const rawCurrency = typeof pkgRaw.currency === 'string' ? pkgRaw.currency.toUpperCase() : 'VND';
  const currency: Currency = rawCurrency === 'USD' ? 'USD' : 'VND';
  const hasMonth13 = Boolean(pkgRaw.hasMonth13);
  const performanceBonusAnnual = typeof pkgRaw.performanceBonusAnnual === 'number' && pkgRaw.performanceBonusAnnual >= 0 ? pkgRaw.performanceBonusAnnual : 0;
  const signingBonus = typeof pkgRaw.signingBonus === 'number' && pkgRaw.signingBonus >= 0 ? pkgRaw.signingBonus : undefined;

  let equityGrant: EquityGrantDTO | undefined = undefined;
  if (pkgRaw.equityGrant && typeof pkgRaw.equityGrant === 'object') {
    const eg = pkgRaw.equityGrant as Record<string, unknown>;
    const rawType = typeof eg.type === 'string' ? eg.type.toLowerCase() : 'none';
    const type: EquityType = rawType === 'esop' || rawType === 'rsu' ? rawType : 'none';
    const totalShares = typeof eg.totalShares === 'number' && eg.totalShares >= 0 ? eg.totalShares : 0;
    const strikePrice = typeof eg.strikePrice === 'number' && eg.strikePrice >= 0 ? eg.strikePrice : 0;
    const currentFairMarketValue = typeof eg.currentFairMarketValue === 'number' && eg.currentFairMarketValue >= 0 ? eg.currentFairMarketValue : 0;
    const vestingYears = typeof eg.vestingYears === 'number' && eg.vestingYears > 0 ? eg.vestingYears : 4;
    const cliffMonths = typeof eg.cliffMonths === 'number' && eg.cliffMonths >= 0 ? eg.cliffMonths : 12;

    equityGrant = {
      type,
      totalShares,
      strikePrice,
      currentFairMarketValue,
      vestingYears,
      cliffMonths
    };
  }

  const validatedPackage: CompensationPackageDTO = {
    baseSalaryMonthly,
    currency,
    hasMonth13,
    performanceBonusAnnual,
    signingBonus,
    equityGrant
  };

  const applicationId = typeof b.applicationId === 'string' ? b.applicationId.trim() : undefined;

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      errors,
      message: 'Dữ liệu dự báo chưa hợp lệ.'
    };
  }

  return {
    ok: true,
    data: {
      company,
      role,
      level,
      applicationId,
      package: validatedPackage
    }
  };
}
