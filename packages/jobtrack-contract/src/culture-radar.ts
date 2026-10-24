import type { ValidationResult } from './validators.ts';

export type CultureDimension =
  | 'engineering_rigor'
  | 'oncall_wlb'
  | 'psychological_safety'
  | 'mentorship_growth'
  | 'leadership_transparency'
  | 'tech_debt_tooling';

export type ReverseInterviewTargetRole =
  | 'engineering_manager'
  | 'peer_engineer'
  | 'skip_level';

export interface CultureDimensionScoreDTO {
  dimension: CultureDimension;
  name: string;
  score: number;
  benchmarkAvg: number;
  summary: string;
  redFlags: string[];
  greenFlags: string[];
}

export interface ReverseInterviewQuestionDTO {
  id: string;
  dimension: CultureDimension;
  targetRole: ReverseInterviewTargetRole;
  question: string;
  listeningFor: string;
  redFlagSignal: string;
}

export interface CultureCompatibilityReportDTO {
  id: string;
  userId: string;
  company: string;
  targetRole?: string;
  calculatedAt: string;
  overallCompatibilityScore: number;
  dimensionScores: CultureDimensionScoreDTO[];
  reverseInterviewQuestions: ReverseInterviewQuestionDTO[];
  criticalRedFlagsCount: number;
  standoutGreenFlagsCount: number;
  synthesisSummary: string;
}

export interface AnalyzeCultureInputDTO {
  company: string;
  targetRole?: string;
  candidatePreferences?: Partial<Record<CultureDimension, number>>;
}

export interface CultureQuestionGenerationInputDTO {
  dimensionScores: CultureDimensionScoreDTO[];
  targetRole?: ReverseInterviewTargetRole;
}

export const CULTURE_DIMENSION_LABELS: Record<CultureDimension, string> = {
  engineering_rigor: 'Kỷ luật Kỹ thuật & CI/CD',
  oncall_wlb: 'On-Call & Cân bằng Cuộc sống',
  psychological_safety: 'An toàn Tâm lý & Đổi mới',
  mentorship_growth: 'Đào tạo & Lộ trình Thăng tiến',
  leadership_transparency: 'Minh bạch Lãnh đạo & Tầm nhìn',
  tech_debt_tooling: 'Công nghệ Hiện đại & Nợ Kỹ thuật'
};

export const CULTURE_INDUSTRY_BENCHMARKS: Record<CultureDimension, number> = {
  engineering_rigor: 68,
  oncall_wlb: 62,
  psychological_safety: 70,
  mentorship_growth: 64,
  leadership_transparency: 66,
  tech_debt_tooling: 60
};

export function validateAnalyzeCultureInput(
  raw: unknown
): ValidationResult<AnalyzeCultureInputDTO> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ok: false,
      message: 'Dữ liệu phân tích văn hóa không hợp lệ.',
      errors: { input: 'Nội dung phải là đối tượng JSON.' }
    };
  }

  const b = raw as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!b.company || typeof b.company !== 'string' || b.company.trim().length === 0) {
    errors.company = 'Tên công ty là bắt buộc.';
  } else if (b.company.trim().length > 150) {
    errors.company = 'Tên công ty không được vượt quá 150 ký tự.';
  }

  let candidatePreferences: Partial<Record<CultureDimension, number>> | undefined;
  if (b.candidatePreferences !== undefined) {
    if (typeof b.candidatePreferences !== 'object' || Array.isArray(b.candidatePreferences) || b.candidatePreferences === null) {
      errors.candidatePreferences = 'Trọng số ưu tiên phải là đối tượng.';
    } else {
      const prefs = b.candidatePreferences as Record<string, unknown>;
      const validPrefs: Partial<Record<CultureDimension, number>> = {};
      const validKeys: CultureDimension[] = [
        'engineering_rigor',
        'oncall_wlb',
        'psychological_safety',
        'mentorship_growth',
        'leadership_transparency',
        'tech_debt_tooling'
      ];

      for (const k of validKeys) {
        if (prefs[k] !== undefined) {
          const val = Number(prefs[k]);
          if (!Number.isFinite(val) || val < 1 || val > 5) {
            errors[k] = 'Trọng số mỗi trụ cột phải từ 1 đến 5.';
          } else {
            validPrefs[k] = Math.round(val);
          }
        }
      }
      candidatePreferences = validPrefs;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: 'Thông số phân tích văn hóa chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      company: (b.company as string).trim(),
      targetRole: typeof b.targetRole === 'string' ? b.targetRole.trim() : undefined,
      candidatePreferences
    }
  };
}

export function evaluateCompanyCulture(
  company: string,
  candidatePreferences?: Partial<Record<CultureDimension, number>>
): {
  overallScore: number;
  dimensionScores: CultureDimensionScoreDTO[];
  criticalRedFlagsCount: number;
  standoutGreenFlagsCount: number;
  synthesisSummary: string;
} {
  const normName = company.trim().toLowerCase();

  let seed = 42;
  for (let i = 0; i < normName.length; i++) {
    seed = (seed * 31 + normName.charCodeAt(i)) % 10000;
  }
  const pseudoFactor = (offset: number) => {
    const val = (seed + offset * 137) % 100;
    return val / 100;
  };

  const dimensions: CultureDimension[] = [
    'engineering_rigor',
    'oncall_wlb',
    'psychological_safety',
    'mentorship_growth',
    'leadership_transparency',
    'tech_debt_tooling'
  ];

  const presets: Record<string, Partial<Record<CultureDimension, number>>> = {
    'fpt software': {
      engineering_rigor: 74,
      oncall_wlb: 70,
      psychological_safety: 72,
      mentorship_growth: 78,
      leadership_transparency: 68,
      tech_debt_tooling: 65
    },
    'vng corporation': {
      engineering_rigor: 82,
      oncall_wlb: 64,
      psychological_safety: 75,
      mentorship_growth: 70,
      leadership_transparency: 76,
      tech_debt_tooling: 78
    },
    'shopee': {
      engineering_rigor: 88,
      oncall_wlb: 48,
      psychological_safety: 60,
      mentorship_growth: 66,
      leadership_transparency: 62,
      tech_debt_tooling: 80
    },
    'grab': {
      engineering_rigor: 86,
      oncall_wlb: 74,
      psychological_safety: 82,
      mentorship_growth: 80,
      leadership_transparency: 78,
      tech_debt_tooling: 84
    }
  };

  const matchedPreset = Object.entries(presets).find(([key]) => normName.includes(key))?.[1];

  const dimensionScores: CultureDimensionScoreDTO[] = dimensions.map((dim, idx) => {
    const benchmark = CULTURE_INDUSTRY_BENCHMARKS[dim];
    let score = matchedPreset?.[dim];

    if (score === undefined) {
      const delta = Math.round((pseudoFactor(idx) - 0.4) * 36);
      score = Math.max(35, Math.min(95, benchmark + delta));
    }

    const redFlags: string[] = [];
    const greenFlags: string[] = [];

    if (dim === 'engineering_rigor') {
      if (score >= 75) greenFlags.push('CI/CD pipeline tự động hóa hoàn toàn với tỷ lệ test coverage > 75%');
      if (score >= 80) greenFlags.push('Quy trình Code Review bắt buộc 2 approvals từ Senior Engineers');
      if (score < 60) redFlags.push('Nhiều release triển khai thủ công vào cuối tuần, thiếu test tự động');
    } else if (dim === 'oncall_wlb') {
      if (score >= 70) greenFlags.push('Chính sách bù ngày nghỉ rõ ràng sau các ca on-call khẩn cấp');
      if (score < 55) redFlags.push('Cảnh báo PagerDuty báo động sau 22h trung bình hơn 3 lần mỗi tuần');
    } else if (dim === 'psychological_safety') {
      if (score >= 75) greenFlags.push('Văn hóa Blameless Post-Mortem tập trung vào lỗ hổng quy trình thay vì chỉ trích cá nhân');
      if (score < 60) redFlags.push('Kỹ sư e ngại thừa nhận sai sót do áp lực quy chụp trách nhiệm');
    } else if (dim === 'mentorship_growth') {
      if (score >= 75) greenFlags.push('Lộ trình thăng tiến công khai rõ ràng giữa nhánh IC và Management');
      if (score < 60) redFlags.push('Thiếu các buổi 1-on-1 định kỳ và không có ngân sách học tập hàng năm');
    } else if (dim === 'leadership_transparency') {
      if (score >= 75) greenFlags.push('Ban lãnh đạo chia sẻ chi tiết chỉ số kinh doanh và định hướng chiến lược trong All-Hands');
      if (score < 60) redFlags.push('Mục tiêu kinh doanh và roadmap thường xuyên thay đổi đột ngột không giải thích');
    } else if (dim === 'tech_debt_tooling') {
      if (score >= 75) greenFlags.push('Dành riêng 20% thời lượng mỗi sprint để xử lý kỹ thuật và refactor mã nguồn');
      if (score < 55) redFlags.push('Hệ thống phụ thuộc vào kiến trúc monolithic lỗi thời, thời gian build > 30 phút');
    }

    const summary = score >= benchmark + 5
      ? `Vượt trội so với mặt bằng thị trường (+${score - benchmark} điểm).`
      : score <= benchmark - 5
      ? `Thấp hơn mức trung bình ngành (${score - benchmark} điểm), cần lưu ý.`
      : 'Tương đương với tiêu chuẩn chung của các công ty công nghệ.';

    return {
      dimension: dim,
      name: CULTURE_DIMENSION_LABELS[dim],
      score,
      benchmarkAvg: benchmark,
      summary,
      redFlags,
      greenFlags
    };
  });

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let criticalPenalties = 0;

  for (const ds of dimensionScores) {
    const weight = candidatePreferences?.[ds.dimension] ?? 3;
    totalWeightedScore += ds.score * weight;
    totalWeight += weight;

    if (weight >= 4 && ds.score < 55) {
      criticalPenalties += 4;
    }
  }

  const rawComp = totalWeight > 0 ? totalWeightedScore / totalWeight : 70;
  const overallScore = Math.max(10, Math.min(100, Math.round(rawComp - criticalPenalties)));

  let criticalRedFlagsCount = 0;
  let standoutGreenFlagsCount = 0;
  for (const ds of dimensionScores) {
    criticalRedFlagsCount += ds.redFlags.length;
    standoutGreenFlagsCount += ds.greenFlags.length;
  }

  let synthesisSummary = '';
  if (overallScore >= 80) {
    synthesisSummary = `Môi trường kỹ thuật tại ${company} rất lý tưởng và tương thích cao với nguyện vọng của bạn, sở hữu nhiều điểm sáng về văn hóa phát triển phần mềm.`;
  } else if (overallScore >= 65) {
    synthesisSummary = `Văn hóa công nghệ tại ${company} ở mức cân bằng, đáp ứng các tiêu chuẩn cơ bản nhưng có một số điểm nghẽn cần kiểm chứng qua các vòng phỏng vấn.`;
  } else {
    synthesisSummary = `Cảnh báo: Văn hóa kỹ thuật tại ${company} có độ chênh lệch lớn so với kỳ vọng ưu tiên của bạn. Cần chủ động đặt câu hỏi thăm dò trước khi cân nhắc offer.`;
  }

  return {
    overallScore,
    dimensionScores,
    criticalRedFlagsCount,
    standoutGreenFlagsCount,
    synthesisSummary
  };
}

export function computeCultureCompatibility(
  dimensionScores: CultureDimensionScoreDTO[],
  candidatePreferences?: Partial<Record<CultureDimension, number>>
): number {
  let weightedSum = 0;
  let weightSum = 0;
  let penalty = 0;

  for (const ds of dimensionScores) {
    const w = candidatePreferences?.[ds.dimension] ?? 3;
    weightedSum += ds.score * w;
    weightSum += w;

    if (w >= 4 && ds.score < 55) {
      penalty += 4;
    }
  }

  if (weightSum === 0) return 70;
  return Math.max(10, Math.min(100, Math.round((weightedSum / weightSum) - penalty)));
}

export function generateReverseInterviewQuestions(
  dimensionScores: CultureDimensionScoreDTO[],
  targetRole: ReverseInterviewTargetRole = 'engineering_manager'
): ReverseInterviewQuestionDTO[] {
  const sorted = [...dimensionScores].sort((a, b) => a.score - b.score);
  const probeDimensions = sorted.slice(0, 3).map(s => s.dimension);

  const questionBank: Record<
    CultureDimension,
    Record<ReverseInterviewTargetRole, { question: string; listeningFor: string; redFlagSignal: string }>
  > = {
    engineering_rigor: {
      engineering_manager: {
        question: 'Khi xuất hiện áp lực bàn giao sản phẩm gấp, đội ngũ cân bằng giữa tốc độ ra mắt tính năng và kỷ luật test/code review như thế nào?',
        listeningFor: 'Sự kiên định bảo vệ chất lượng, sẵn sàng cắt giảm phạm vi thay vì hạ thấp tiêu chuẩn kiểm thử.',
        redFlagSignal: 'Người quản lý trả lời: "Đôi khi phải bỏ qua test/review để kịp tiến độ rồi quay lại sửa sau".'
      },
      peer_engineer: {
        question: 'Một pull request thường mất bao lâu để được merge và đội mình có automated tests chạy trên mọi PR không?',
        listeningFor: 'Quy trình CI dưới 15 phút, PR được review trong vòng 24 giờ, có test coverage rõ ràng.',
        redFlagSignal: 'PR bị ngâm nhiều ngày, merge trực tiếp vào main mà không cần test tự động.'
      },
      skip_level: {
        question: 'Tầm nhìn của công ty về việc đầu tư vào hạ tầng kỹ thuật và nâng cao năng suất kỹ sư (Developer Productivity) trong năm tới ra sao?',
        listeningFor: 'Ngân sách và lộ trình nâng cấp công cụ, giảm toil và tự động hóa release.',
        redFlagSignal: 'Chỉ tập trung vào tính năng kinh doanh ngắn hạn, xem nhẹ chi phí hạ tầng.'
      }
    },
    oncall_wlb: {
      engineering_manager: {
        question: 'Lịch trực on-call được phân bổ ra sao và công ty hỗ trợ kỹ sư thế nào khi có sự cố nghiêm trọng ngoài giờ làm việc?',
        listeningFor: 'Lịch xoay tua công bằng, ngày nghỉ bù (comp day) và quy trình giảm thiểu cảnh báo giả.',
        redFlagSignal: 'Kỳ vọng kỹ sư luôn mở laptop phản hồi tin nhắn Slack 24/7 không có chính sách bù đắp.'
      },
      peer_engineer: {
        question: 'Lần gần nhất bạn bị réo dậy vào ban đêm để xử lý sự cố là khi nào và cảm giác của bạn lúc đó thế nào?',
        listeningFor: 'Cảnh báo đêm hiếm khi xảy ra (< 1 lần/tháng), các thành viên khác sẵn sàng hỗ trợ.',
        redFlagSignal: 'Kỹ sư tỏ ra kiệt sức, thừa nhận bị đánh thức nhiều lần mỗi tuần vì cảnh báo rác.'
      },
      skip_level: {
        question: 'Ban lãnh đạo đánh giá và ngăn chặn tình trạng kiệt sức (burnout) của kỹ sư như thế nào trong các giai đoạn cao điểm?',
        listeningFor: 'Theo dõi tỷ lệ nghỉ phép, khuyến khích unplug sau đợt launch lớn.',
        redFlagSignal: 'Tuyên dương văn hóa "cày đêm" và xem việc làm thêm giờ không lương là sự cống hiến.'
      }
    },
    psychological_safety: {
      engineering_manager: {
        question: 'Anh/chị có thể kể lại một lần thành viên trong team phạm sai lầm gây downtime và cách team xử lý sau đó?',
        listeningFor: 'Buổi Post-Mortem phi quy kết trách nhiệm cá nhân, tập trung cải tiến hệ thống và quy trình phòng ngừa.',
        redFlagSignal: 'Quy trách nhiệm cho cá nhân cụ thể hoặc phạt trừ thưởng vì lỗi vô ý.'
      },
      peer_engineer: {
        question: 'Bạn có cảm thấy thoải mái khi công khai bất đồng ý kiến về kiến trúc với Tech Lead hoặc Manager không?',
        listeningFor: 'Các cuộc tranh luận kỹ thuật cởi mở, dựa trên số liệu và tôn trọng góc nhìn đa chiều.',
        redFlagSignal: 'Quyết định hoàn toàn mang tính áp đặt từ trên xuống, ý kiến phản biện bị phớt lờ.'
      },
      skip_level: {
        question: 'Ban giám đốc khuyến khích sự đổi mới và chấp nhận rủi ro thất bại trong các sáng kiến thử nghiệm như thế nào?',
        listeningFor: 'Có chương trình Innovation Time/Hackathon và công nhận nỗ lực dù dự án thất bại.',
        redFlagSignal: 'Không có chỗ cho sự thử nghiệm, trừng phạt nghiêm khắc nếu thử nghiệm không sinh lời ngay.'
      }
    },
    mentorship_growth: {
      engineering_manager: {
        question: 'Quy trình đánh giá hiệu suất và lộ trình thăng tiến được xác định dựa trên những tiêu chí cụ thể nào?',
        listeningFor: 'Bảng khung năng lực (Career Ladder) minh bạch, các mốc đo lường tác động rõ ràng.',
        redFlagSignal: 'Thăng tiến phụ thuộc vào sự cảm tính cá nhân của sếp hoặc số năm thâm niên.'
      },
      peer_engineer: {
        question: 'Các buổi 1-on-1 với quản lý có diễn ra đều đặn không và nội dung thường thảo luận là gì?',
        listeningFor: '1-on-1 hàng tuần hoặc 2 tuần/lần, tập trung vào định hướng phát triển cá nhân và tháo gỡ khó khăn.',
        redFlagSignal: '1-on-1 thường xuyên bị hủy hoặc chỉ đơn thuần là báo cáo tiến độ công việc (status update).'
      },
      skip_level: {
        question: 'Tỷ lệ các vị trí lãnh đạo kỹ thuật được thăng tiến từ nội bộ so với tuyển dụng từ bên ngoài là bao nhiêu?',
        listeningFor: 'Ưu tiên bồi dưỡng nhân tài nội bộ, có chương trình kế thừa rõ ràng.',
        redFlagSignal: 'Mọi vị trí quản lý đều tuyển ngoài do nội bộ không có lộ trình đào tạo kế cận.'
      }
    },
    leadership_transparency: {
      engineering_manager: {
        question: 'Thông tin về định hướng kinh doanh và sức khỏe tài chính của công ty được truyền đạt tới đội ngũ như thế nào?',
        listeningFor: 'Các buổi All-Hands định kỳ với phần Q&A ẩn danh thẳng thắn, không né tránh câu hỏi khó.',
        redFlagSignal: 'Kỹ sư hoàn toàn không biết mục tiêu quý hoặc tình hình kinh doanh của công ty.'
      },
      peer_engineer: {
        question: 'Bạn có hiểu rõ tính năng bạn đang code hàng ngày đóng góp như thế nào vào mục tiêu chung của công ty không?',
        listeningFor: 'Hiểu rõ chỉ số kinh doanh mục tiêu (OKRs/KPIs) và giá trị mang lại cho người dùng.',
        redFlagSignal: 'Chỉ nhận task từ Jira và làm như một cỗ máy, không biết mục đích tính năng.'
      },
      skip_level: {
        question: 'Thách thức lớn nhất mà công ty đang đối mặt trong 12 tháng tới là gì và kế hoạch vượt qua ra sao?',
        listeningFor: 'Sự thành thật về thách thức thị trường, phân tích rủi ro khách quan và chiến lược ứng phó.',
        redFlagSignal: 'Vẽ ra bức tranh màu hồng thiếu thực tế, né tránh các rủi ro cạnh tranh rõ ràng.'
      }
    },
    tech_debt_tooling: {
      engineering_manager: {
        question: 'Đội ngũ phân bổ bao nhiêu phần trăm thời gian trong sprint cho việc dọn dẹp Tech Debt và nâng cấp thư viện?',
        listeningFor: 'Dành cố định 15-20% công sức cho việc giảm nợ kỹ thuật và tối ưu hạ tầng.',
        redFlagSignal: 'Tech debt bị gác lại vô thời hạn, chỉ sửa khi hệ thống sập nghiêm trọng.'
      },
      peer_engineer: {
        question: 'Bạn đánh giá như thế nào về độ mượt mà của môi trường phát triển local và thời gian build/test?',
        listeningFor: 'Local setup bằng Docker/containers nhanh chóng dưới 10 phút, CI phản hồi tức thì.',
        redFlagSignal: 'Mất nhiều ngày để setup môi trường máy cá nhân, build liên tục bị fail vì lỗi vặt.'
      },
      skip_level: {
        question: 'Quan điểm của công ty về việc áp dụng các công nghệ mới (AI tooling, cloud-native) vào quy trình làm việc ra sao?',
        listeningFor: 'Ủng hộ thử nghiệm công cụ hiện đại (GitHub Copilot, modern clouds) đi kèm đánh giá bảo mật.',
        redFlagSignal: 'Bảo thủ giữ lại công nghệ cổ lỗ sĩ vì sợ thay đổi tốn kém.'
      }
    }
  };

  const results: ReverseInterviewQuestionDTO[] = [];
  let qCounter = 1;

  for (const dim of probeDimensions) {
    const qData = questionBank[dim]?.[targetRole] || questionBank[dim]?.engineering_manager;
    if (qData) {
      results.push({
        id: `rev-q-${qCounter++}`,
        dimension: dim,
        targetRole,
        question: qData.question,
        listeningFor: qData.listeningFor,
        redFlagSignal: qData.redFlagSignal
      });
    }
  }

  return results;
}
