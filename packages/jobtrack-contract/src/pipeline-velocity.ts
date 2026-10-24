import type { ApplicationStatus } from './types.ts';
import type { ValidationResult } from './validators.ts';

export type BottleneckSeverity = 'healthy' | 'moderate' | 'critical';

export interface StageConversionRateDTO {
  stage: ApplicationStatus;
  totalEntered: number;
  passed: number;
  dropped: number;
  conversionRate: number;
  avgDaysInStage: number;
}

export interface BottleneckDiagnosticDTO {
  stage: ApplicationStatus;
  severity: BottleneckSeverity;
  dropOffRate: number;
  diagnosticMessage: string;
  prescriptiveAction: string;
}

export interface VelocityTargetDTO {
  currentWeeklyApplications: number;
  recommendedWeeklyApplications: number;
  projectedOffersIn30Days: number;
  projectedOffersIn60Days: number;
  projectedOffersIn90Days: number;
  confidenceScore: number;
}

export interface PipelineVelocitySimulationDTO {
  simulatedApplicationsPerWeek: number;
  simulationDays: number;
  p10Offers: number;
  p50Offers: number;
  p90Offers: number;
  estimatedDaysToFirstOffer: number | null;
}

export interface PipelineVelocityReportDTO {
  id: string;
  userId: string;
  targetOfferDate: string;
  targetOfferCount: number;
  calculatedAt: string;
  stageMetrics: StageConversionRateDTO[];
  bottlenecks: BottleneckDiagnosticDTO[];
  velocityTarget: VelocityTargetDTO;
  simulation: PipelineVelocitySimulationDTO;
  applicationsAnalyzed: number;
}

export interface CalculateVelocityReportInputDTO {
  targetOfferDate: string;
  targetOfferCount?: number;
  simulatedWeeklyVelocity?: number;
  simulationHorizonWeeks?: number;
}

export interface PipelineVelocitySimulationInputDTO {
  weeklyVelocity: number;
  weeksHorizon: number;
  stageMetrics?: StageConversionRateDTO[];
}

export function validateCalculateVelocityReportInput(
  raw: unknown
): ValidationResult<CalculateVelocityReportInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu dự báo tốc độ không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.targetOfferDate || typeof b.targetOfferDate !== 'string') {
    errors.targetOfferDate = 'Ngày mục tiêu nhận offer là bắt buộc.';
  } else {
    const parsed = Date.parse(b.targetOfferDate);
    if (!Number.isFinite(parsed)) {
      errors.targetOfferDate = 'Định dạng ngày mục tiêu không hợp lệ (YYYY-MM-DD).';
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (parsed < now.getTime()) {
        errors.targetOfferDate = 'Ngày mục tiêu phải ở thời điểm tương lai.';
      }
    }
  }

  let targetOfferCount = 1;
  if (b.targetOfferCount !== undefined) {
    if (typeof b.targetOfferCount !== 'number' || !Number.isInteger(b.targetOfferCount) || b.targetOfferCount < 1) {
      errors.targetOfferCount = 'Số lượng offer mục tiêu phải là số nguyên dương lớn hơn 0.';
    } else {
      targetOfferCount = b.targetOfferCount;
    }
  }

  let simulatedWeeklyVelocity: number | undefined;
  if (b.simulatedWeeklyVelocity !== undefined) {
    if (typeof b.simulatedWeeklyVelocity !== 'number' || b.simulatedWeeklyVelocity < 0) {
      errors.simulatedWeeklyVelocity = 'Tốc độ ứng tuyển giả lập phải lớn hơn hoặc bằng 0.';
    } else {
      simulatedWeeklyVelocity = b.simulatedWeeklyVelocity;
    }
  }

  let simulationHorizonWeeks = 12;
  if (b.simulationHorizonWeeks !== undefined) {
    if (typeof b.simulationHorizonWeeks !== 'number' || b.simulationHorizonWeeks < 1 || b.simulationHorizonWeeks > 52) {
      errors.simulationHorizonWeeks = 'Khoảng thời gian mô phỏng phải từ 1 đến 52 tuần.';
    } else {
      simulationHorizonWeeks = b.simulationHorizonWeeks;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Thông số phân tích không hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      targetOfferDate: b.targetOfferDate as string,
      targetOfferCount,
      simulatedWeeklyVelocity,
      simulationHorizonWeeks
    }
  };
}

export function computeStageConversionMetrics(
  applications: Array<{
    status: ApplicationStatus;
    appliedAt: string | null;
    createdAt: string;
    statusUpdatedAt?: string;
    interviews: Array<{ id: string; status: string; at: string }>;
  }>
): StageConversionRateDTO[] {
  const activeFunnelStages: ApplicationStatus[] = ['Applied', 'Screening', 'Interview', 'Offer'];

  const stageCounters: Record<
    string,
    { entered: number; passed: number; dropped: number; totalDays: number; countForDays: number }
  > = {
    Applied: { entered: 0, passed: 0, dropped: 0, totalDays: 0, countForDays: 0 },
    Screening: { entered: 0, passed: 0, dropped: 0, totalDays: 0, countForDays: 0 },
    Interview: { entered: 0, passed: 0, dropped: 0, totalDays: 0, countForDays: 0 },
    Offer: { entered: 0, passed: 0, dropped: 0, totalDays: 0, countForDays: 0 }
  };

  const nowMs = Date.now();

  for (const app of applications) {
    if (app.status === 'Saved') {
      continue;
    }

    const hasInterviews = Array.isArray(app.interviews) && app.interviews.length > 0;
    let highestStageIndex = 1;

    if (app.status === 'Offer') {
      highestStageIndex = 4;
    } else if (app.status === 'Interview' || hasInterviews) {
      highestStageIndex = 3;
    } else if (app.status === 'Screening') {
      highestStageIndex = 2;
    } else if (app.status === 'Applied') {
      highestStageIndex = 1;
    } else if (app.status === 'Rejected' || app.status === 'Withdrawn') {
      highestStageIndex = hasInterviews ? 3 : 1;
    }

    const appStartDate = app.appliedAt ? Date.parse(app.appliedAt) : Date.parse(app.createdAt);
    const validStart = Number.isFinite(appStartDate) ? appStartDate : nowMs;
    const appEndDate = app.statusUpdatedAt ? Date.parse(app.statusUpdatedAt) : nowMs;
    const validEnd = Number.isFinite(appEndDate) ? appEndDate : nowMs;
    const durationDays = Math.max(1, Math.round((validEnd - validStart) / (1000 * 60 * 60 * 24)));

    for (let i = 1; i <= 4; i++) {
      const stageName = activeFunnelStages[i - 1];
      const counter = stageCounters[stageName];

      if (highestStageIndex >= i) {
        counter.entered += 1;
        if (highestStageIndex > i) {
          counter.passed += 1;
        } else {
          if (app.status === 'Offer' && stageName === 'Offer') {
            counter.passed += 1;
          } else if (app.status === 'Rejected' || app.status === 'Withdrawn') {
            counter.dropped += 1;
          }
        }

        if (highestStageIndex === i) {
          counter.totalDays += durationDays;
          counter.countForDays += 1;
        }
      }
    }
  }

  const baselineDaysMap: Record<ApplicationStatus, number> = {
    Applied: 7,
    Screening: 5,
    Interview: 14,
    Offer: 5,
    Saved: 1,
    Rejected: 0,
    Withdrawn: 0
  };

  return activeFunnelStages.map(stage => {
    const c = stageCounters[stage];
    const conversionRate = c.entered > 0 ? Math.round((c.passed / c.entered) * 1000) / 10 : 0;
    const avgDays = c.countForDays > 0 ? Math.round((c.totalDays / c.countForDays) * 10) / 10 : baselineDaysMap[stage];

    return {
      stage,
      totalEntered: c.entered,
      passed: c.passed,
      dropped: c.dropped,
      conversionRate,
      avgDaysInStage: avgDays
    };
  });
}

export function detectPipelineBottlenecks(
  stageMetrics: StageConversionRateDTO[]
): BottleneckDiagnosticDTO[] {
  const benchmarkTolerances: Record<
    ApplicationStatus,
    { moderateDrop: number; criticalDrop: number; actions: { healthy: string; moderate: string; critical: string } }
  > = {
    Applied: {
      moderateDrop: 70,
      criticalDrop: 85,
      actions: {
        healthy: 'Tỷ lệ chuyển đổi hồ sơ ban đầu duy trì ở mức tối ưu.',
        moderate: 'Cần rà soát độ khớp từ khóa JD và định dạng ATS của hồ sơ ứng tuyển.',
        critical: 'Kích hoạt ngay Resume Optimizer để tái cấu trúc bullet points theo chuẩn Google X-Y-Z.'
      }
    },
    Screening: {
      moderateDrop: 45,
      criticalDrop: 65,
      actions: {
        healthy: 'Vòng sơ loại diễn ra thuận lợi, ứng viên truyền tải tốt giá trị cốt lõi.',
        moderate: 'Cần nâng cấp thang điểm Elevator Pitch và câu trả lời về động lực gia nhập.',
        critical: 'Thực hiện buổi giả lập Mock Interview để chuẩn hóa câu trả lời vòng nhân sự.'
      }
    },
    Interview: {
      moderateDrop: 55,
      criticalDrop: 75,
      actions: {
        healthy: 'Tỷ lệ hoàn thành các vòng phỏng vấn chuyên sâu đạt phong độ cao.',
        moderate: 'Bổ sung các bằng chứng định lượng (Metric Y) và System Design Case Study.',
        critical: 'Luyện tập tình huống chuyên sâu với Interview Simulation và chuẩn hóa Portfolio Dossier.'
      }
    },
    Offer: {
      moderateDrop: 20,
      criticalDrop: 40,
      actions: {
        healthy: 'Giai đoạn chốt offer hoàn hảo với tỷ lệ chấp thuận cao.',
        moderate: 'Chủ động dùng Compensation Forecaster để đối sánh mức lương thị trường.',
        critical: 'Sử dụng kịch bản đàm phán AI và phân tích điểm đòn bẩy để tối ưu hóa đãi ngộ.'
      }
    },
    Saved: {
      moderateDrop: 50,
      criticalDrop: 80,
      actions: { healthy: 'Tiến độ bình thường.', moderate: 'Cần đẩy nhanh tiến độ nộp.', critical: 'Tồn đọng hồ sơ.' }
    },
    Rejected: {
      moderateDrop: 100,
      criticalDrop: 100,
      actions: { healthy: '', moderate: '', critical: '' }
    },
    Withdrawn: {
      moderateDrop: 100,
      criticalDrop: 100,
      actions: { healthy: '', moderate: '', critical: '' }
    }
  };

  return stageMetrics.map(metric => {
    const config = benchmarkTolerances[metric.stage] || benchmarkTolerances.Applied;
    const dropOffRate = metric.totalEntered > 0
      ? Math.round((metric.dropped / metric.totalEntered) * 1000) / 10
      : 0;

    let severity: BottleneckSeverity = 'healthy';
    let diagnosticMessage = `Tỷ lệ loại bỏ tại giai đoạn ${metric.stage} là ${dropOffRate}%, nằm trong ngưỡng an toàn.`;
    let prescriptiveAction = config.actions.healthy;

    if (metric.totalEntered >= 2) {
      if (dropOffRate >= config.criticalDrop) {
        severity = 'critical';
        diagnosticMessage = `Cảnh báo nghiêm trọng: Tỷ lệ rơi rụng tại ${metric.stage} lên tới ${dropOffRate}%, vượt trần rủi ro (${config.criticalDrop}%).`;
        prescriptiveAction = config.actions.critical;
      } else if (dropOffRate >= config.moderateDrop) {
        severity = 'moderate';
        diagnosticMessage = `Điểm nghẽn tiềm ẩn: Tỷ lệ rơi rụng tại ${metric.stage} là ${dropOffRate}%, bắt đầu vượt mức chuẩn (${config.moderateDrop}%).`;
        prescriptiveAction = config.actions.moderate;
      }
    }

    return {
      stage: metric.stage,
      severity,
      dropOffRate,
      diagnosticMessage,
      prescriptiveAction
    };
  });
}

export function calculateVelocityTargets(
  stageMetrics: StageConversionRateDTO[],
  targetOfferDate: string,
  targetOfferCount = 1,
  recentWeeklyApplications = 3
): VelocityTargetDTO {
  let compositeYield = 1.0;
  let totalDataPoints = 0;

  for (const m of stageMetrics) {
    totalDataPoints += m.totalEntered;
    const rate = m.totalEntered > 0 ? Math.max(0.05, m.conversionRate / 100) : 0.4;
    compositeYield *= rate;
  }

  const baselineYield = 0.035;
  const blendFactor = Math.min(1.0, totalDataPoints / 25);
  const effectiveYield = Math.max(0.01, blendFactor * compositeYield + (1 - blendFactor) * baselineYield);

  const targetDateMs = Date.parse(targetOfferDate);
  const nowMs = Date.now();
  const diffDays = Math.max(1, Math.round((targetDateMs - nowMs) / (1000 * 60 * 60 * 24)));
  const weeksRemaining = Math.max(0.5, diffDays / 7);

  const totalApplicationsNeeded = targetOfferCount / effectiveYield;
  const recommendedWeeklyApplications = Math.max(1, Math.ceil(totalApplicationsNeeded / weeksRemaining));

  const currentWeekly = Math.max(1, recentWeeklyApplications);

  const projectedOffersIn30Days = Math.round(currentWeekly * (30 / 7) * effectiveYield * 10) / 10;
  const projectedOffersIn60Days = Math.round(currentWeekly * (60 / 7) * effectiveYield * 10) / 10;
  const projectedOffersIn90Days = Math.round(currentWeekly * (90 / 7) * effectiveYield * 10) / 10;

  let confidenceScore = 50;
  if (totalDataPoints >= 30) {
    confidenceScore = 95;
  } else if (totalDataPoints >= 15) {
    confidenceScore = 80;
  } else if (totalDataPoints >= 5) {
    confidenceScore = 65;
  }

  return {
    currentWeeklyApplications: currentWeekly,
    recommendedWeeklyApplications,
    projectedOffersIn30Days,
    projectedOffersIn60Days,
    projectedOffersIn90Days,
    confidenceScore
  };
}

export function simulatePipelineOutcomes(
  weeklyVelocity: number,
  stageMetrics: StageConversionRateDTO[],
  weeksHorizon = 12
): PipelineVelocitySimulationDTO {
  let compositeYield = 1.0;
  let totalCycleDays = 0;

  for (const m of stageMetrics) {
    const rate = m.totalEntered > 0 ? Math.max(0.05, m.conversionRate / 100) : 0.4;
    compositeYield *= rate;
    totalCycleDays += m.avgDaysInStage;
  }

  const effectiveYield = Math.max(0.015, Math.min(0.25, compositeYield));
  const effectiveCycleDays = Math.max(14, totalCycleDays);

  const totalSimulatedApps = Math.round(weeklyVelocity * weeksHorizon);
  const simulationRuns = 1000;
  const outcomeCounts: number[] = [];

  let seed = 1337;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let r = 0; r < simulationRuns; r++) {
    let offers = 0;
    for (let a = 0; a < totalSimulatedApps; a++) {
      if (pseudoRandom() < effectiveYield) {
        offers++;
      }
    }
    outcomeCounts.push(offers);
  }

  outcomeCounts.sort((a, b) => a - b);

  const p10Offers = outcomeCounts[Math.floor(simulationRuns * 0.1)];
  const p50Offers = outcomeCounts[Math.floor(simulationRuns * 0.5)];
  const p90Offers = outcomeCounts[Math.floor(simulationRuns * 0.9)];

  let estimatedDaysToFirstOffer: number | null = null;
  if (p50Offers > 0 && weeklyVelocity > 0) {
    const appsPerDay = weeklyVelocity / 7;
    const meanAppsToFirstOffer = 1 / effectiveYield;
    const daysToGenerateCandidate = Math.round(meanAppsToFirstOffer / appsPerDay);
    estimatedDaysToFirstOffer = daysToGenerateCandidate + effectiveCycleDays;
  }

  return {
    simulatedApplicationsPerWeek: weeklyVelocity,
    simulationDays: weeksHorizon * 7,
    p10Offers,
    p50Offers,
    p90Offers,
    estimatedDaysToFirstOffer
  };
}
