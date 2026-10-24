import type { ValidationResult } from './validators.ts';

export type TrackType = 'ic' | 'management';

export type PromotionDimension =
  | 'technical_breadth'
  | 'system_scale'
  | 'org_influence'
  | 'mentorship_culture'
  | 'business_impact';

export type GapLevel = 'low' | 'moderate' | 'critical';

export interface PromotionCompetencyDTO {
  dimension: PromotionDimension;
  dimensionLabel: string;
  requiredScore: number;
  currentScore: number;
  gapLevel: GapLevel;
  evidenceCriteria: string[];
}

export interface PromotionInitiativeDTO {
  title: string;
  category: string;
  expectedImpact: string;
  keyMetrics: string;
  focusDimension: PromotionDimension;
}

export interface PromotionReadinessDTO {
  currentLevel: string;
  targetLevel: string;
  track: TrackType;
  overallReadinessScore: number;
  estimatedMonthsToReadiness: number;
  competencies: PromotionCompetencyDTO[];
  highImpactInitiatives: PromotionInitiativeDTO[];
}

export interface TrajectoryStepDTO {
  year: number;
  role: string;
  level: string;
  estimatedAnnualCompVnd: number;
  focusCompetency: string;
  milestones: string[];
}

export interface TrajectorySimulationDTO {
  id: string;
  userId?: string;
  currentRole: string;
  targetTrack: TrackType;
  targetRole: string;
  horizonYears: number;
  roadmapSteps: TrajectoryStepDTO[];
  readiness: PromotionReadinessDTO;
  createdAt: string;
  updatedAt: string;
}

export interface SimulateTrajectoryInputDTO {
  currentRole: string;
  currentLevel: string;
  targetTrack: TrackType;
  targetRole?: string;
  horizonYears?: number;
  userScores?: Partial<Record<PromotionDimension, number>>;
}

export interface UpdateCompetenciesInputDTO {
  scores: Record<PromotionDimension, number>;
}

export const PROMOTION_DIMENSION_METADATA: Record<PromotionDimension, { label: string; description: string }> = {
  technical_breadth: {
    label: 'Tầm nhìn Kỹ thuật & Công nghệ',
    description: 'Năng lực bao quát kiến trúc đa miền, đánh giá công nghệ mới và chuẩn hóa thiết kế hệ thống.'
  },
  system_scale: {
    label: 'Khả năng chịu tải & Vận hành',
    description: 'Thiết kế hệ thống chịu tải cao, tính sẵn sàng 99.99%, tối ưu độ trễ và quản trị sự cố.'
  },
  org_influence: {
    label: 'Ảnh hưởng Tổ chức & Chuẩn hóa',
    description: 'Soạn thảo RFC, xây dựng đồng thuận liên nhóm, định hình roadmap kỹ thuật toàn công ty.'
  },
  mentorship_culture: {
    label: 'Đào tạo & Văn hóa Kỹ thuật',
    description: 'Cố vấn thăng tiến cho kỹ sư cấp dưới, dẫn dắt văn hóa blameless và chia sẻ tri thức.'
  },
  business_impact: {
    label: 'Tác động Kinh doanh & Sản phẩm',
    description: 'Gắn kết mục tiêu kỹ thuật với doanh thu, tối ưu chi phí hạ tầng và đẩy nhanh tốc độ ra mắt.'
  }
};

const LEVEL_REQUIREMENTS: Record<TrackType, Record<string, Record<PromotionDimension, number>>> = {
  ic: {
    Senior: {
      technical_breadth: 65,
      system_scale: 65,
      org_influence: 55,
      mentorship_culture: 55,
      business_impact: 60
    },
    Staff: {
      technical_breadth: 85,
      system_scale: 85,
      org_influence: 80,
      mentorship_culture: 75,
      business_impact: 80
    },
    Principal: {
      technical_breadth: 95,
      system_scale: 95,
      org_influence: 92,
      mentorship_culture: 88,
      business_impact: 90
    },
    Distinguished: {
      technical_breadth: 98,
      system_scale: 98,
      org_influence: 98,
      mentorship_culture: 95,
      business_impact: 96
    }
  },
  management: {
    Senior: {
      technical_breadth: 65,
      system_scale: 65,
      org_influence: 55,
      mentorship_culture: 60,
      business_impact: 60
    },
    'Tech Lead': {
      technical_breadth: 78,
      system_scale: 75,
      org_influence: 75,
      mentorship_culture: 78,
      business_impact: 72
    },
    'Engineering Manager': {
      technical_breadth: 75,
      system_scale: 72,
      org_influence: 88,
      mentorship_culture: 92,
      business_impact: 88
    },
    'Director of Engineering': {
      technical_breadth: 82,
      system_scale: 80,
      org_influence: 96,
      mentorship_culture: 96,
      business_impact: 98
    }
  }
};

const EVIDENCE_CRITERIA_CATALOG: Record<PromotionDimension, Record<TrackType, string[]>> = {
  technical_breadth: {
    ic: [
      'Chủ trì thẩm định và áp dụng thành công kiến trúc module hóa hoặc microservices quy mô lớn.',
      'Soạn thảo ít nhất 3 bản đặc tả kiến trúc kỹ thuật (RFC/Tech Spec) được áp dụng toàn bộ phận.',
      'Định hình chuẩn công nghệ và loại bỏ các công nghệ lỗi thời gây rủi ro bảo mật.'
    ],
    management: [
      'Xây dựng lộ trình hiện đại hóa công nghệ đồng bộ với chiến lược mở rộng sản phẩm.',
      'Cân đối tối ưu giữa thời gian trả nợ kỹ thuật và tốc độ bàn giao tính năng kinh doanh.',
      'Đảm bảo quy trình kiểm thử tự động và CI/CD đạt chuẩn tin cậy cao.'
    ]
  },
  system_scale: {
    ic: [
      'Tối ưu hóa hệ thống cốt lõi giảm thiểu độ trễ P99 dưới 100ms khi lưu lượng tăng gấp 5 lần.',
      'Thiết kế và diễn tập kịch bản phục hồi sau thảm họa (Disaster Recovery) không gây mất mát dữ liệu.',
      'Cắt giảm ít nhất 20% chi phí điện toán đám mây thông qua tái cấu trúc phân tầng dữ liệu.'
    ],
    management: [
      'Thiết lập chỉ số SLA/SLO cho toàn bộ các dịch vụ trọng yếu của đội ngũ.',
      'Dẫn dắt quy trình trực nhật vận hành (On-call) và phòng ngừa kiệt sức (burnout) cho kỹ sư.',
      'Đạt tỷ lệ xử lý sự cố P1/P2 theo chuẩn cam kết và không để tái diễn lỗi tương tự.'
    ]
  },
  org_influence: {
    ic: [
      'Đại diện cho tổ chức trong các quyết định tích hợp liên bộ phận và đối tác công nghệ chiến lược.',
      'Chủ trì hội đồng đánh giá kiến trúc và tạo sự đồng thuận giữa các nhóm kỹ thuật có lợi ích đối nghịch.',
      'Xây dựng các thư viện nền tảng dùng chung được trên 70% các dự án nội bộ tích hợp.'
    ],
    management: [
      'Đại diện kỹ thuật làm việc trực tiếp với Ban điều hành, C-level và Khối kinh doanh.',
      'Dẫn dắt thành công các đợt tái cấu trúc đội ngũ nhằm tối ưu hóa năng suất và giảm tắc nghẽn giao tiếp.',
      'Xây dựng thương hiệu nhà tuyển dụng kỹ thuật qua các bài viết và hội thảo công nghệ.'
    ]
  },
  mentorship_culture: {
    ic: [
      'Bảo trợ và cố vấn trực tiếp giúp ít nhất 2 kỹ sư Mid lên Senior hoặc Senior lên Staff.',
      'Dẫn dắt các buổi phân tích sự cố không đổ lỗi (Blameless Post-mortem) để cải thiện quy trình kỹ thuật.',
      'Tạo lập các chương trình đào tạo nội bộ (Guild/Chapter) về System Design và Clean Code.'
    ],
    management: [
      'Xây dựng khung lộ trình năng lực và kế hoạch phát triển cá nhân (IDP) cho 100% thành viên.',
      'Duy trì tỷ lệ giữ chân nhân tài trên 90% và giải quyết xung đột nội bộ một cách xây dựng.',
      'Tuyển dụng thành công các nhân sự chủ chốt đáp ứng đúng tiêu chuẩn văn hóa và năng lực.'
    ]
  },
  business_impact: {
    ic: [
      'Chuyển đổi trực tiếp các yêu cầu kinh doanh phức tạp thành các giải pháp kỹ thuật có tính mở rộng cao.',
      'Phát hiện sớm các rủi ro kỹ thuật tiềm ẩn có thể gây thiệt hại tài chính hoặc gián đoạn dịch vụ.',
      'Triển khai các cải tiến kiến trúc giúp rút ngắn thời gian bàn giao tính năng từ vài tuần xuống vài ngày.'
    ],
    management: [
      'Chịu trách nhiệm trực tiếp về ngân sách kỹ thuật, chi phí nhân sự và hiệu quả đầu tư công nghệ.',
      'Định hình chỉ số hiệu suất kỹ thuật đóng góp trực tiếp vào mục tiêu kinh doanh (OKR/KPI).',
      'Đảm bảo các sản phẩm chiến lược được phát hành đúng tiến độ với chất lượng cam kết.'
    ]
  }
};

export function recommendPromotionInitiatives(
  track: TrackType,
  competencies: PromotionCompetencyDTO[]
): PromotionInitiativeDTO[] {
  const initiatives: PromotionInitiativeDTO[] = [];
  const criticalOrModGaps = competencies
    .filter(c => c.gapLevel === 'critical' || c.gapLevel === 'moderate')
    .sort((a, b) => (b.requiredScore - b.currentScore) - (a.requiredScore - a.currentScore));

  const targetGaps = criticalOrModGaps.length > 0 ? criticalOrModGaps : competencies;

  for (const gap of targetGaps.slice(0, 3)) {
    if (gap.dimension === 'system_scale') {
      initiatives.push({
        title: track === 'ic'
          ? 'Tái cấu trúc kiến trúc Caching và Giới hạn tốc độ phân tán'
          : 'Xây dựng tiêu chuẩn SLA và quy trình Quản lý sự cố tự động',
        category: 'Hạ tầng & Vận hành',
        expectedImpact: 'Nâng cao độ tin cậy hệ thống lên 99.99% và giảm thời gian khôi phục sự cố dưới 15 phút.',
        keyMetrics: 'P99 Latency < 80ms, MTTR giảm 50%',
        focusDimension: 'system_scale'
      });
    } else if (gap.dimension === 'org_influence') {
      initiatives.push({
        title: track === 'ic'
          ? 'Chủ trì soạn thảo và triển khai RFC Kiến trúc Micro-Frontend / API Gateway toàn công ty'
          : 'Thiết lập quy trình Quản lý vòng đời kỹ thuật và Hội đồng phê duyệt công nghệ',
        category: 'Chuẩn hóa & Ảnh hưởng',
        expectedImpact: 'Thống nhất chuẩn thiết kế giữa các đội ngũ kỹ thuật và loại bỏ 40% mã nguồn trùng lặp.',
        keyMetrics: '3 phòng ban áp dụng, thời gian tích hợp giảm 35%',
        focusDimension: 'org_influence'
      });
    } else if (gap.dimension === 'technical_breadth') {
      initiatives.push({
        title: track === 'ic'
          ? 'Thiết kế hệ thống Xử lý dữ liệu luồng (Event Streaming Architecture)'
          : 'Đánh giá và tích hợp công nghệ AI/LLM vào quy trình tăng tốc độ phát triển sản phẩm',
        category: 'Đổi mới Công nghệ',
        expectedImpact: 'Mở rộng năng lực công nghệ đón đầu nhu cầu xử lý dữ liệu thời gian thực của sản phẩm.',
        keyMetrics: 'Đạt throughput 50,000 events/s, chi phí hạ tầng giảm 25%',
        focusDimension: 'technical_breadth'
      });
    } else if (gap.dimension === 'mentorship_culture') {
      initiatives.push({
        title: track === 'ic'
          ? 'Sáng lập và dẫn dắt Guild System Design nội bộ cho các kỹ sư tiềm năng'
          : 'Triển khai khung phát triển kỹ sư toàn diện và chương trình Cố vấn nghề nghiệp 1-on-1',
        category: 'Phát triển Nhân tài',
        expectedImpact: 'Nâng cao chất lượng kỹ thuật đội ngũ và hỗ trợ 2 kỹ sư đạt chuẩn thăng tiến tiếp theo.',
        keyMetrics: '2 kỹ sư thăng chức, tỷ lệ giữ chân kỹ sư 95%',
        focusDimension: 'mentorship_culture'
      });
    } else if (gap.dimension === 'business_impact') {
      initiatives.push({
        title: track === 'ic'
          ? 'Tối ưu hóa Pipeline triển khai giúp rút ngắn chu kỳ phát hành sản phẩm'
          : 'Tối ưu hóa phân bổ nguồn lực kỹ thuật giúp hoàn thành 100% mục tiêu OKR kinh doanh',
        category: 'Hiệu quả Kinh doanh',
        expectedImpact: 'Đẩy nhanh thời gian đưa tính năng ra thị trường (Time-to-Market) và tăng doanh thu gián tiếp.',
        keyMetrics: 'Lead time to changes giảm 60%, tỷ lệ hoàn thành OKR 100%',
        focusDimension: 'business_impact'
      });
    }
  }

  return initiatives;
}

export function evaluatePromotionReadiness(
  currentLevel: string,
  targetLevel: string,
  track: TrackType,
  userScores?: Partial<Record<PromotionDimension, number>>
): PromotionReadinessDTO {
  const trackReqs = LEVEL_REQUIREMENTS[track] || LEVEL_REQUIREMENTS.ic;
  const targetReq = trackReqs[targetLevel] || trackReqs.Staff || trackReqs['Tech Lead'];
  const currentReq = trackReqs[currentLevel] || trackReqs.Senior;

  const dimensions: PromotionDimension[] = [
    'technical_breadth',
    'system_scale',
    'org_influence',
    'mentorship_culture',
    'business_impact'
  ];

  const competencies: PromotionCompetencyDTO[] = [];
  let totalScoreAchieved = 0;
  let totalMaxScore = 0;

  for (const dim of dimensions) {
    const required = targetReq[dim] || 80;
    const baseCurrent = currentReq[dim] || 60;
    const current = userScores && typeof userScores[dim] === 'number'
      ? Math.min(100, Math.max(0, userScores[dim]!))
      : baseCurrent;

    const diff = required - current;
    let gapLevel: GapLevel = 'low';
    if (diff > 20) gapLevel = 'critical';
    else if (diff > 8) gapLevel = 'moderate';

    competencies.push({
      dimension: dim,
      dimensionLabel: PROMOTION_DIMENSION_METADATA[dim].label,
      requiredScore: required,
      currentScore: current,
      gapLevel,
      evidenceCriteria: EVIDENCE_CRITERIA_CATALOG[dim][track]
    });

    totalScoreAchieved += Math.min(required, current);
    totalMaxScore += required;
  }

  const overallReadinessScore = Math.min(100, Math.round((totalScoreAchieved / totalMaxScore) * 100));

  let estimatedMonthsToReadiness = 12;
  if (overallReadinessScore >= 90) estimatedMonthsToReadiness = 3;
  else if (overallReadinessScore >= 80) estimatedMonthsToReadiness = 6;
  else if (overallReadinessScore >= 65) estimatedMonthsToReadiness = 12;
  else if (overallReadinessScore >= 50) estimatedMonthsToReadiness = 18;
  else estimatedMonthsToReadiness = 24;

  const highImpactInitiatives = recommendPromotionInitiatives(track, competencies);

  return {
    currentLevel,
    targetLevel,
    track,
    overallReadinessScore,
    estimatedMonthsToReadiness,
    competencies,
    highImpactInitiatives
  };
}

const TRAJECTORY_COMPENSATION_LADDER_VND: Record<TrackType, Record<string, number>> = {
  ic: {
    Senior: 750000000,
    Staff: 1350000000,
    Principal: 2100000000,
    Distinguished: 3200000000
  },
  management: {
    Senior: 750000000,
    'Tech Lead': 1050000000,
    'Engineering Manager': 1600000000,
    'Director of Engineering': 2500000000
  }
};

export function simulateCareerTrajectory(
  input: SimulateTrajectoryInputDTO
): TrajectorySimulationDTO {
  const track = input.targetTrack;
  const horizon = Math.min(5, Math.max(3, input.horizonYears || 4));
  const currentLevel = input.currentLevel || 'Senior';

  const trackLadder = track === 'ic'
    ? ['Senior', 'Staff', 'Principal', 'Distinguished']
    : ['Senior', 'Tech Lead', 'Engineering Manager', 'Director of Engineering'];

  const currentIdx = Math.max(0, trackLadder.indexOf(currentLevel));
  const targetLevel = input.targetRole || trackLadder[Math.min(trackLadder.length - 1, currentIdx + 1)];

  const readiness = evaluatePromotionReadiness(currentLevel, targetLevel, track, input.userScores);

  const roadmapSteps: TrajectoryStepDTO[] = [];
  const compTable = TRAJECTORY_COMPENSATION_LADDER_VND[track];

  for (let year = 1; year <= horizon; year++) {
    let stepLevel = currentLevel;
    if (year === 1) {
      stepLevel = currentLevel;
    } else if (year === 2) {
      stepLevel = readiness.overallReadinessScore >= 75 ? targetLevel : currentLevel;
    } else if (year === 3) {
      stepLevel = targetLevel;
    } else {
      const targetIdx = trackLadder.indexOf(targetLevel);
      stepLevel = trackLadder[Math.min(trackLadder.length - 1, targetIdx + 1)];
    }

    const baseComp = compTable[stepLevel] || 800000000;
    const meritGrowth = Math.pow(1.08, year - 1);
    const estimatedAnnualCompVnd = Math.round(baseComp * meritGrowth);

    let focusCompetency = 'Khẳng định chuyên môn và tạo dấu ấn kỹ thuật';
    let milestones: string[] = [];

    if (year === 1) {
      focusCompetency = 'Đạt chuẩn năng lực và hoàn thành sáng kiến chiến lược đầu tiên';
      milestones = [
        'Triển khai hoàn tất 1 sáng kiến thăng tiến trọng điểm.',
        'Thiết lập chỉ số đo lường hiệu quả cụ thể cho hệ thống đang phụ trách.',
        'Mở rộng tầm ảnh hưởng sang ít nhất 1 đội ngũ kỹ thuật liền kề.'
      ];
    } else if (year === 2) {
      focusCompetency = track === 'ic'
        ? 'Dẫn dắt kiến trúc đa phân hệ và bảo trợ kỹ sư cấp dưới'
        : 'Chính thức tiếp nhận vai trò quản lý đội ngũ và chịu trách nhiệm phân bổ công việc';
      milestones = [
        'Chính thức được hội đồng xét duyệt thăng chức lên vị trí mục tiêu.',
        'Tối ưu hóa quy trình làm việc giảm 30% thời gian giao tiếp lãng phí.',
        'Cố vấn thành công cho ít nhất 1 nhân sự đạt mức đánh giá xuất sắc.'
      ];
    } else if (year === 3) {
      focusCompetency = track === 'ic'
        ? 'Thiết lập chuẩn mực kỹ thuật và giải quyết các bài toán hạ tầng quy mô lớn'
        : 'Xây dựng chiến lược phát triển nhân sự và định hình OKR kỹ thuật theo mục tiêu kinh doanh';
      milestones = [
        'Đạt mốc thu nhập thù lao cấp độ mới bao gồm lương và cổ phần dài hạn.',
        'Đóng góp vào các quyết định định hình lộ trình sản phẩm 2 năm tiếp theo.',
        'Dẫn dắt toàn diện các đợt phát hành sản phẩm chiến lược của công ty.'
      ];
    } else {
      focusCompetency = track === 'ic'
        ? 'Định hình tầm nhìn kỹ thuật dài hạn và tư vấn cho Ban điều hành'
        : 'Quản trị danh mục kỹ thuật đa phòng ban và tối ưu hóa hiệu quả đầu tư công nghệ';
      milestones = [
        'Trở thành trụ cột công nghệ đại diện cho tổ chức trong các hội thảo quốc tế.',
        'Xây dựng đội ngũ kế thừa và hoàn thiện cơ cấu tổ chức kỹ thuật bền vững.',
        'Gia tăng tổng đãi ngộ lên mức cao nhất trong thang bảng thị trường.'
      ];
    }

    roadmapSteps.push({
      year,
      role: `${stepLevel} Engineer`,
      level: stepLevel,
      estimatedAnnualCompVnd,
      focusCompetency,
      milestones
    });
  }

  const now = new Date().toISOString();

  return {
    id: `sim-${Date.now()}`,
    currentRole: input.currentRole,
    targetTrack: track,
    targetRole: targetLevel,
    horizonYears: horizon,
    roadmapSteps,
    readiness,
    createdAt: now,
    updatedAt: now
  };
}

export function validateSimulateTrajectoryInput(input: unknown): ValidationResult<SimulateTrajectoryInputDTO> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { input: 'Dữ liệu mô phỏng phải là đối tượng JSON.' }, message: 'Dữ liệu không hợp lệ.' };
  }

  const b = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const currentRole = typeof b.currentRole === 'string' ? b.currentRole.trim() : '';
  if (!currentRole) errors.currentRole = 'Vai trò hiện tại không được để trống.';

  const currentLevel = typeof b.currentLevel === 'string' ? b.currentLevel.trim() : '';
  if (!currentLevel) errors.currentLevel = 'Cấp bậc hiện tại không được để trống.';

  const rawTrack = typeof b.targetTrack === 'string' ? b.targetTrack.toLowerCase().trim() : '';
  const targetTrack: TrackType = rawTrack === 'management' ? 'management' : 'ic';

  const targetRole = typeof b.targetRole === 'string' ? b.targetRole.trim() : undefined;
  const horizonYears = typeof b.horizonYears === 'number' && b.horizonYears >= 3 && b.horizonYears <= 5 ? b.horizonYears : 4;

  let userScores: Partial<Record<PromotionDimension, number>> | undefined = undefined;
  if (b.userScores && typeof b.userScores === 'object' && !Array.isArray(b.userScores)) {
    userScores = b.userScores as Partial<Record<PromotionDimension, number>>;
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: 'Dữ liệu mô phỏng chưa đầy đủ.' };
  }

  return {
    ok: true,
    data: {
      currentRole,
      currentLevel,
      targetTrack,
      targetRole,
      horizonYears,
      userScores
    }
  };
}

export function validateUpdateCompetenciesInput(input: unknown): ValidationResult<UpdateCompetenciesInputDTO> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, errors: { input: 'Dữ liệu năng lực phải là đối tượng JSON.' }, message: 'Dữ liệu không hợp lệ.' };
  }

  const b = input as Record<string, unknown>;
  const scoresRaw = b.scores as Record<string, unknown> | undefined;

  if (!scoresRaw || typeof scoresRaw !== 'object') {
    return { ok: false, errors: { scores: 'Danh sách điểm năng lực là bắt buộc.' }, message: 'Dữ liệu không hợp lệ.' };
  }

  const validDimensions: PromotionDimension[] = [
    'technical_breadth',
    'system_scale',
    'org_influence',
    'mentorship_culture',
    'business_impact'
  ];

  const scores: Record<PromotionDimension, number> = {
    technical_breadth: 60,
    system_scale: 60,
    org_influence: 60,
    mentorship_culture: 60,
    business_impact: 60
  };

  for (const dim of validDimensions) {
    if (typeof scoresRaw[dim] === 'number') {
      scores[dim] = Math.min(100, Math.max(0, scoresRaw[dim] as number));
    }
  }

  return {
    ok: true,
    data: { scores }
  };
}
