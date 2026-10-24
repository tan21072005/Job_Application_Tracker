import type { ApplicationStatus } from './types.ts';

export type AnalyticsTimeframe = 'all' | '30d' | '90d' | 'year';

export const ANALYTICS_TIMEFRAMES = ['all', '30d', '90d', 'year'] as const;

export interface FunnelStageDTO {
  stage: ApplicationStatus;
  label: string;
  count: number;
  dropoffCount: number;
  conversionFromPreviousRate: number;
  overallConversionRate: number;
}

export interface VelocityMetricsDTO {
  timeToFirstResponseDays: number | null;
  timeToInterviewDays: number | null;
  timeToOfferDays: number | null;
  overallCycleDays: number | null;
  activeCount: number;
  terminalCount: number;
}

export interface SourceMetricsDTO {
  source: string;
  totalApplications: number;
  interviewCount: number;
  offerCount: number;
  rejectedCount: number;
  activeCount: number;
  interviewRate: number;
  offerRate: number;
}

export interface StaleApplicationDTO {
  id: string;
  company: string;
  position: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  lastUpdatedAt: string;
  daysInactive: number;
  recommendedAction: string;
}

export interface ApplicationGoalDTO {
  weeklyApplicationsTarget: number;
  monthlyInterviewsTarget: number;
  targetOffers: number;
  weeklyApplicationsCurrent: number;
  monthlyInterviewsCurrent: number;
  currentOffers: number;
  weeklyApplicationsProgressPercent: number;
  monthlyInterviewsProgressPercent: number;
  updatedAt: string;
}

export interface ApplicationGoalInput {
  weeklyApplicationsTarget?: number;
  monthlyInterviewsTarget?: number;
  targetOffers?: number;
}

export interface AnalyticsSummaryDTO {
  timeframe: AnalyticsTimeframe;
  asOf: string;
  funnel: FunnelStageDTO[];
  velocity: VelocityMetricsDTO;
  sources: SourceMetricsDTO[];
  stale: StaleApplicationDTO[];
  goals: ApplicationGoalDTO;
}

export interface AnalyticsQueryDTO {
  timeframe: AnalyticsTimeframe;
}

export function isValidAnalyticsTimeframe(val: unknown): val is AnalyticsTimeframe {
  return typeof val === 'string' && ANALYTICS_TIMEFRAMES.includes(val as AnalyticsTimeframe);
}

export function validateAnalyticsQuery(query: unknown): {
  ok: boolean;
  data: AnalyticsQueryDTO;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!query || typeof query !== 'object') {
    return { ok: true, data: { timeframe: 'all' } };
  }
  const q = query as Record<string, unknown>;
  const tf = q.timeframe !== undefined ? String(q.timeframe).trim() : 'all';
  if (!isValidAnalyticsTimeframe(tf)) {
    return {
      ok: false,
      data: { timeframe: 'all' },
      message: 'Khoảng thời gian phân tích không hợp lệ. Cho phép: all, 30d, 90d, year.',
      errors: { timeframe: 'Giá trị timeframe phải là all, 30d, 90d hoặc year.' }
    };
  }
  return { ok: true, data: { timeframe: tf } };
}

export function validateApplicationGoalInput(input: unknown): {
  ok: boolean;
  data: Required<ApplicationGoalInput>;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      data: { weeklyApplicationsTarget: 5, monthlyInterviewsTarget: 2, targetOffers: 1 },
      message: 'Dữ liệu mục tiêu không hợp lệ.',
      errors: { input: 'Nội dung yêu cầu phải là đối tượng JSON.' }
    };
  }

  const body = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  let weekly = 5;
  if (body.weeklyApplicationsTarget !== undefined) {
    const parsed = Number(body.weeklyApplicationsTarget);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      errors.weeklyApplicationsTarget = 'Mục tiêu nộp hồ sơ hàng tuần phải là số nguyên từ 1 đến 100.';
    } else {
      weekly = parsed;
    }
  }

  let monthly = 2;
  if (body.monthlyInterviewsTarget !== undefined) {
    const parsed = Number(body.monthlyInterviewsTarget);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 50) {
      errors.monthlyInterviewsTarget = 'Mục tiêu phỏng vấn hàng tháng phải là số nguyên từ 0 đến 50.';
    } else {
      monthly = parsed;
    }
  }

  let offers = 1;
  if (body.targetOffers !== undefined) {
    const parsed = Number(body.targetOffers);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) {
      errors.targetOffers = 'Mục tiêu offer phải là số nguyên từ 1 đến 20.';
    } else {
      offers = parsed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: { weeklyApplicationsTarget: weekly, monthlyInterviewsTarget: monthly, targetOffers: offers },
      message: 'Thông số mục tiêu chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      weeklyApplicationsTarget: weekly,
      monthlyInterviewsTarget: monthly,
      targetOffers: offers
    }
  };
}

export function filterApplicationsByTimeframe<T extends { appliedAt?: string | null; createdAt: string }>(
  items: T[],
  timeframe: AnalyticsTimeframe,
  nowTimestamp = Date.now()
): T[] {
  if (timeframe === 'all') return items;
  const days = timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const threshold = nowTimestamp - days * 24 * 60 * 60 * 1000;
  return items.filter(item => {
    const recordTime = item.appliedAt ? Date.parse(item.appliedAt) : Date.parse(item.createdAt);
    return Number.isFinite(recordTime) && recordTime >= threshold;
  });
}

export function calculateFunnelMetrics(
  apps: Array<{ status: ApplicationStatus }>
): FunnelStageDTO[] {
  const stageLabels: Record<ApplicationStatus, string> = {
    Saved: 'Đã lưu',
    Applied: 'Đã nộp',
    Screening: 'Sàng lọc',
    Interview: 'Phỏng vấn',
    Offer: 'Nhận Offer',
    Rejected: 'Từ chối',
    Withdrawn: 'Đã rút'
  };

  const funnelOrder: ApplicationStatus[] = ['Saved', 'Applied', 'Screening', 'Interview', 'Offer'];

  const stageCounts: Record<ApplicationStatus, number> = {
    Saved: 0,
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Rejected: 0,
    Withdrawn: 0
  };

  for (const app of apps) {
    if (stageCounts[app.status] !== undefined) {
      stageCounts[app.status]++;
    }
  }

  const reachedCounts: Record<ApplicationStatus, number> = {
    Saved: apps.length,
    Applied: stageCounts.Applied + stageCounts.Screening + stageCounts.Interview + stageCounts.Offer + stageCounts.Rejected + stageCounts.Withdrawn,
    Screening: stageCounts.Screening + stageCounts.Interview + stageCounts.Offer,
    Interview: stageCounts.Interview + stageCounts.Offer,
    Offer: stageCounts.Offer,
    Rejected: stageCounts.Rejected,
    Withdrawn: stageCounts.Withdrawn
  };

  const total = apps.length;

  return funnelOrder.map((stage, index) => {
    const count = reachedCounts[stage];
    const prevCount = index === 0 ? total : reachedCounts[funnelOrder[index - 1]];
    const dropoffCount = Math.max(0, prevCount - count);
    const conversionFromPreviousRate = prevCount > 0 ? Math.round((count / prevCount) * 1000) / 10 : 0;
    const overallConversionRate = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

    return {
      stage,
      label: stageLabels[stage],
      count,
      dropoffCount,
      conversionFromPreviousRate,
      overallConversionRate
    };
  });
}

export function calculateVelocityMetrics(
  apps: Array<{
    status: ApplicationStatus;
    appliedAt: string | null;
    createdAt: string;
    updatedAt: string;
    interviews?: Array<{ at: string; status: string }>;
  }>
): VelocityMetricsDTO {
  let totalResponseDays = 0;
  let responseCount = 0;

  let totalInterviewDays = 0;
  let interviewCount = 0;

  let totalOfferDays = 0;
  let offerCount = 0;

  let totalCycleDays = 0;
  let terminalCount = 0;
  let activeCount = 0;

  const msPerDay = 24 * 60 * 60 * 1000;

  for (const app of apps) {
    const startMs = app.appliedAt ? Date.parse(app.appliedAt) : Date.parse(app.createdAt);
    if (!Number.isFinite(startMs)) continue;

    const isTerminal = app.status === 'Rejected' || app.status === 'Withdrawn';
    if (isTerminal) {
      terminalCount++;
      const endMs = Date.parse(app.updatedAt);
      if (Number.isFinite(endMs) && endMs >= startMs) {
        totalCycleDays += (endMs - startMs) / msPerDay;
      }
    } else {
      activeCount++;
    }

    if (['Screening', 'Interview', 'Offer', 'Rejected'].includes(app.status)) {
      const updateMs = Date.parse(app.updatedAt);
      if (Number.isFinite(updateMs) && updateMs >= startMs) {
        totalResponseDays += (updateMs - startMs) / msPerDay;
        responseCount++;
      }
    }

    if (app.interviews && app.interviews.length > 0) {
      const sorted = [...app.interviews].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const firstInterviewMs = Date.parse(sorted[0].at);
      if (Number.isFinite(firstInterviewMs) && firstInterviewMs >= startMs) {
        totalInterviewDays += (firstInterviewMs - startMs) / msPerDay;
        interviewCount++;
      }
    }

    if (app.status === 'Offer') {
      const offerMs = Date.parse(app.updatedAt);
      if (Number.isFinite(offerMs) && offerMs >= startMs) {
        totalOfferDays += (offerMs - startMs) / msPerDay;
        offerCount++;
      }
    }
  }

  const round = (val: number) => Math.round(val * 10) / 10;

  return {
    timeToFirstResponseDays: responseCount > 0 ? round(totalResponseDays / responseCount) : null,
    timeToInterviewDays: interviewCount > 0 ? round(totalInterviewDays / interviewCount) : null,
    timeToOfferDays: offerCount > 0 ? round(totalOfferDays / offerCount) : null,
    overallCycleDays: terminalCount > 0 ? round(totalCycleDays / terminalCount) : null,
    activeCount,
    terminalCount
  };
}

export function calculateSourceMetrics(
  apps: Array<{
    source: string | null;
    status: ApplicationStatus;
    interviews?: Array<{ id?: string }>;
  }>
): SourceMetricsDTO[] {
  const groups: Record<string, { total: number; interviews: number; offers: number; rejected: number; active: number }> = {};

  for (const app of apps) {
    const raw = (app.source || '').trim();
    const sourceKey = raw.length > 0 ? raw : 'Chưa phân loại';

    if (!groups[sourceKey]) {
      groups[sourceKey] = { total: 0, interviews: 0, offers: 0, rejected: 0, active: 0 };
    }

    groups[sourceKey].total++;
    const hasInterviews = (app.interviews && app.interviews.length > 0) || app.status === 'Interview' || app.status === 'Offer';
    if (hasInterviews) groups[sourceKey].interviews++;
    if (app.status === 'Offer') groups[sourceKey].offers++;
    if (app.status === 'Rejected') groups[sourceKey].rejected++;
    if (!['Rejected', 'Withdrawn'].includes(app.status)) groups[sourceKey].active++;
  }

  return Object.entries(groups)
    .map(([source, stats]) => {
      const interviewRate = stats.total > 0 ? Math.round((stats.interviews / stats.total) * 1000) / 10 : 0;
      const offerRate = stats.total > 0 ? Math.round((stats.offers / stats.total) * 1000) / 10 : 0;
      return {
        source,
        totalApplications: stats.total,
        interviewCount: stats.interviews,
        offerCount: stats.offers,
        rejectedCount: stats.rejected,
        activeCount: stats.active,
        interviewRate,
        offerRate
      };
    })
    .sort((a, b) => b.totalApplications - a.totalApplications);
}

export function findStaleApplications(
  apps: Array<{
    id: string;
    company: string;
    position: string;
    status: ApplicationStatus;
    appliedAt: string | null;
    updatedAt: string;
    interviews?: Array<{ at: string; status: string }>;
  }>,
  nowTimestamp = Date.now(),
  staleThresholdDays = 7
): StaleApplicationDTO[] {
  const msPerDay = 24 * 60 * 60 * 1000;
  const terminalStatuses = new Set<ApplicationStatus>(['Rejected', 'Withdrawn', 'Offer']);

  const staleList: StaleApplicationDTO[] = [];

  for (const app of apps) {
    if (terminalStatuses.has(app.status)) continue;

    const hasUpcomingInterview = (app.interviews || []).some(
      round => round.status === 'Scheduled' && Date.parse(round.at) >= nowTimestamp
    );
    if (hasUpcomingInterview) continue;

    const updatedMs = Date.parse(app.updatedAt);
    if (!Number.isFinite(updatedMs)) continue;

    const daysInactive = Math.floor((nowTimestamp - updatedMs) / msPerDay);
    if (daysInactive >= staleThresholdDays) {
      let recommendation = 'Kiểm tra trạng thái hoặc gửi email liên hệ HR.';
      if (app.status === 'Saved') {
        recommendation = 'Hồ sơ đã lưu quá lâu chưa nộp. Hãy hoàn thiện và gửi đơn ứng tuyển.';
      } else if (app.status === 'Applied') {
        recommendation = daysInactive >= 14
          ? 'Đã qua 2 tuần không có hồi âm. Nên chủ động gửi email hỏi thăm tiến độ (Follow-up).'
          : 'Đã qua 1 tuần nộp hồ sơ. Chuẩn bị email follow-up lịch sự tới nhà tuyển dụng.';
      } else if (app.status === 'Screening') {
        recommendation = 'Giai đoạn sàng lọc kéo dài. Liên hệ kiểm tra kết quả duyệt CV.';
      } else if (app.status === 'Interview') {
        recommendation = 'Buổi phỏng vấn đã qua nhưng chưa cập nhật kết quả. Gửi thư cảm ơn hoặc hỏi feedback.';
      }

      staleList.push({
        id: app.id,
        company: app.company,
        position: app.position,
        status: app.status,
        appliedAt: app.appliedAt,
        lastUpdatedAt: app.updatedAt,
        daysInactive,
        recommendedAction: recommendation
      });
    }
  }

  return staleList.sort((a, b) => b.daysInactive - a.daysInactive);
}

export function calculateGoalProgress(
  apps: Array<{
    createdAt: string;
    status: ApplicationStatus;
    interviews?: Array<{ at: string }>;
  }>,
  goalsInput: ApplicationGoalInput = {},
  nowTimestamp = Date.now()
): ApplicationGoalDTO {
  const weeklyTarget = goalsInput.weeklyApplicationsTarget || 5;
  const monthlyTarget = goalsInput.monthlyInterviewsTarget || 2;
  const targetOffers = goalsInput.targetOffers || 1;

  const msPerDay = 24 * 60 * 60 * 1000;
  const oneWeekAgo = nowTimestamp - 7 * msPerDay;
  const thirtyDaysAgo = nowTimestamp - 30 * msPerDay;

  let weeklyApps = 0;
  let monthlyInterviews = 0;
  let currentOffers = 0;

  for (const app of apps) {
    const createdMs = Date.parse(app.createdAt);
    if (Number.isFinite(createdMs) && createdMs >= oneWeekAgo) {
      weeklyApps++;
    }

    if (app.status === 'Offer') {
      currentOffers++;
    }

    if (app.interviews) {
      for (const round of app.interviews) {
        const interviewMs = Date.parse(round.at);
        if (Number.isFinite(interviewMs) && interviewMs >= thirtyDaysAgo) {
          monthlyInterviews++;
        }
      }
    }
  }

  const weeklyPercent = Math.min(100, Math.round((weeklyApps / weeklyTarget) * 100));
  const monthlyPercent = monthlyTarget > 0 ? Math.min(100, Math.round((monthlyInterviews / monthlyTarget) * 100)) : 100;

  return {
    weeklyApplicationsTarget: weeklyTarget,
    monthlyInterviewsTarget: monthlyTarget,
    targetOffers,
    weeklyApplicationsCurrent: weeklyApps,
    monthlyInterviewsCurrent: monthlyInterviews,
    currentOffers,
    weeklyApplicationsProgressPercent: weeklyPercent,
    monthlyInterviewsProgressPercent: monthlyPercent,
    updatedAt: new Date(nowTimestamp).toISOString()
  };
}

export function calculateAnalyticsSummary(
  apps: Array<{
    id: string;
    company: string;
    position: string;
    source: string | null;
    status: ApplicationStatus;
    appliedAt: string | null;
    createdAt: string;
    updatedAt: string;
    interviews?: Array<{ id: string; title?: string; at: string; status: string }>;
  }>,
  goalsInput: ApplicationGoalInput = {},
  options: { timeframe?: AnalyticsTimeframe; now?: number } = {}
): AnalyticsSummaryDTO {
  const timeframe = options.timeframe || 'all';
  const now = options.now || Date.now();

  const filteredApps = filterApplicationsByTimeframe(apps, timeframe, now);

  const funnel = calculateFunnelMetrics(filteredApps);
  const velocity = calculateVelocityMetrics(filteredApps);
  const sources = calculateSourceMetrics(filteredApps);
  const stale = findStaleApplications(apps, now, 7);
  const goals = calculateGoalProgress(apps, goalsInput, now);

  return {
    timeframe,
    asOf: new Date(now).toISOString(),
    funnel,
    velocity,
    sources,
    stale,
    goals
  };
}
