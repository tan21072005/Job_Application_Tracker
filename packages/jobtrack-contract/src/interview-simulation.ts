export type SimulationTrack = 'behavioral_star' | 'system_design' | 'technical_deepdive' | 'culture_leadership';

export type SimulationDifficulty = 'junior' | 'mid' | 'senior' | 'lead';

export type SimulationPacingMode = 'standard_2min' | 'relaxed_5min' | 'rapid_fire_1min';

export interface TurnEvaluationDTO {
  turnNumber: number;
  question: string;
  answer: string;
  timeTakenSeconds: number;
  structureScore: number;
  technicalDepthScore: number;
  metricImpactScore: number;
  compositeScore: number;
  strengths: string[];
  improvements: string[];
  exemplarAnswer: string;
}

export interface SimulationSessionReportDTO {
  overallScore: number;
  readinessGrade: 'Ready' | 'Strong Contender' | 'Needs Practice' | 'High Risk';
  summary: string;
  topStrengths: string[];
  keyGaps: string[];
  recommendedFocus: string;
}

export interface SimulationSessionDTO {
  id: string;
  targetRole: string;
  targetCompany: string;
  track: SimulationTrack;
  difficulty: SimulationDifficulty;
  pacingMode: SimulationPacingMode;
  status: 'in_progress' | 'completed' | 'abandoned';
  questions: string[];
  currentQuestionIndex: number;
  turns: TurnEvaluationDTO[];
  report: SimulationSessionReportDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface StartSimulationInputDTO {
  targetRole: string;
  targetCompany: string;
  track: SimulationTrack;
  difficulty: SimulationDifficulty;
  pacingMode: SimulationPacingMode;
}

export interface SubmitTurnInputDTO {
  answer: string;
  timeTakenSeconds: number;
}

export function getPacingDurationSeconds(mode: SimulationPacingMode): number {
  switch (mode) {
    case 'rapid_fire_1min':
      return 60;
    case 'relaxed_5min':
      return 300;
    case 'standard_2min':
    default:
      return 120;
  }
}

export function generateSimulationQuestions(
  track: SimulationTrack,
  difficulty: SimulationDifficulty,
  role: string,
  company: string
): string[] {
  const safeRole = role || 'kỹ sư phần mềm';
  const safeCompany = company || 'công ty công nghệ';

  if (track === 'system_design') {
    if (difficulty === 'lead' || difficulty === 'senior') {
      return [
        `Hãy thiết kế một hệ thống distributed notification service quy mô 100 triệu người dùng cho ${safeCompany}. Làm thế nào bạn đảm bảo delivery guarantee và rate limiting?`,
        `Khi thiết kế hệ thống thanh toán hoặc giỏ hàng chịu tải cao cho vị trí ${safeRole}, bạn xử lý bài toán concurrency, idempotency và distributed locks như thế nào?`,
        `Hệ thống của ${safeCompany} gặp sự cố latency tăng đột biến 500% vào giờ cao điểm. Bạn sẽ thực hiện quy trình RCA (Root Cause Analysis) và failover kiến trúc ra sao?`
      ];
    }
    return [
      `Hãy thiết kế hệ thống rút gọn liên kết (URL Shortener) cho ${safeCompany}. Bạn lựa chọn cơ chế sinh hash và lưu trữ caching ra sao?`,
      `Trình bày cách bạn thiết kế database schema và caching layer cho tính năng bảng tin (newsfeed) của vị trí ${safeRole}.`,
      `Làm thế nào để scale API backend từ 100 req/s lên 10,000 req/s khi ứng dụng của ${safeCompany} bùng nổ người dùng?`
    ];
  }

  if (track === 'technical_deepdive') {
    return [
      `Với vị trí ${safeRole} tại ${safeCompany}, bạn hãy giải thích cơ chế Event Loop, memory leak detection và cách tối ưu GC/performance trong tech stack chính của bạn.`,
      `Hãy kể về một bài toán kỹ thuật phức tạp nhất bạn từng debug và tối ưu thành công. Bạn đã phân tích metrics gì và kết quả cải thiện ra sao?`,
      `Khi phải lựa chọn giữa tính nhất quán dữ liệu (Consistency) và tính sẵn sàng (Availability) cho một module quan trọng tại ${safeCompany}, bạn đưa ra quyết định dựa trên những tiêu chí nào?`
    ];
  }

  if (track === 'culture_leadership') {
    return [
      `Hãy kể về một lần bạn và Tech Lead hoặc Product Manager bất đồng quan điểm gay gắt về một giải pháp kỹ thuật. Bạn đã giải quyết để đi đến thống nhất như thế nào?`,
      `Khi phải hướng dẫn (mentor) một đồng nghiệp mới hoặc xử lý một thành viên trong nhóm làm việc dưới mức kỳ vọng tại ${safeCompany}, bạn đã hành động ra sao?`,
      `Trước áp lực deadline gấp gáp nhưng chất lượng mã nguồn và testing có nguy cơ bị bỏ qua, bạn cân bằng giữa business velocity và technical debt như thế nào?`
    ];
  }

  return [
    `Hãy kể lại một dự án khó khăn nhất mà bạn từng tham gia với vai trò ${safeRole}. Thách thức cốt lõi là gì và bạn đã hành động như thế nào để vượt qua?`,
    `Chia sẻ một lần bạn mắc sai lầm nghiêm trọng trong quá trình phát hành sản phẩm (production outage/bug). Bạn đã xử lý khủng hoảng và rút ra bài học gì cho ${safeCompany}?`,
    `Hãy chia sẻ về một thành tựu công việc mà bạn tự hào nhất, trong đó hành động của bạn tạo ra tác động định lượng rõ rệt đối với hiệu suất hoặc doanh số đội ngũ.`
  ];
}

export function evaluateSimulationTurn(
  question: string,
  answer: string,
  timeTakenSeconds: number,
  pacingMode: SimulationPacingMode,
  track: SimulationTrack
): TurnEvaluationDTO {
  const text = (answer || '').trim();
  const lower = text.toLowerCase();
  const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
  const maxPacing = getPacingDurationSeconds(pacingMode);

  let structureScore = 50;
  if (track === 'behavioral_star') {
    const hasSituation = lower.includes('tình huống') || lower.includes('bối cảnh') || lower.includes('khi đó') || lower.includes('dự án');
    const hasTask = lower.includes('nhiệm vụ') || lower.includes('mục tiêu') || lower.includes('vấn đề');
    const hasAction = lower.includes('hành động') || lower.includes('triển khai') || lower.includes('giải pháp') || lower.includes('tôi đã') || lower.includes('em đã');
    const hasResult = lower.includes('kết quả') || lower.includes('đạt được') || lower.includes('bài học') || lower.includes('thành công');

    let starCount = 0;
    if (hasSituation) starCount++;
    if (hasTask) starCount++;
    if (hasAction) starCount++;
    if (hasResult) starCount++;

    structureScore = Math.min(100, 30 + starCount * 17);
  } else if (track === 'system_design') {
    const hasRequirements = lower.includes('yêu cầu') || lower.includes('scale') || lower.includes('qps') || lower.includes('latency');
    const hasArchitecture = lower.includes('kiến trúc') || lower.includes('database') || lower.includes('cache') || lower.includes('queue') || lower.includes('service');
    const hasTradeoffs = lower.includes('đánh đổi') || lower.includes('trade-off') || lower.includes('thay vì') || lower.includes('ưu điểm') || lower.includes('nhược điểm');

    let designCount = 0;
    if (hasRequirements) designCount++;
    if (hasArchitecture) designCount++;
    if (hasTradeoffs) designCount++;

    structureScore = Math.min(100, 40 + designCount * 20);
  } else {
    structureScore = wordCount >= 60 ? 85 : wordCount >= 30 ? 70 : 45;
  }

  let metricImpactScore = 40;
  const hasNumbers = /\d+[%xXkKMmBb]?|\d+\s*(lần|phần trăm|giây|ms|user|req)/i.test(text);
  const metricMatches = text.match(/\d+([.,]\d+)?\s*(%|lần|ms|s|giây|phút|k|m|nghìn|triệu|req\/s)/gi) || [];

  if (metricMatches.length >= 2) {
    metricImpactScore = 95;
  } else if (hasNumbers) {
    metricImpactScore = 75;
  } else if (wordCount > 50) {
    metricImpactScore = 55;
  }

  let technicalDepthScore = 50;
  const techTerms = [
    'redis', 'kafka', 'postgresql', 'mongodb', 'docker', 'kubernetes', 'microservice',
    'sharding', 'indexing', 'cache', 'queue', 'concurrency', 'idempotency', 'acid',
    'rest', 'graphql', 'grpc', 'websocket', 'load balancer', 'ci/cd', 'unit test',
    'monitoring', 'prometheus', 'grafana', 'bottleneck', 'clean architecture', 'refactor'
  ];
  let techTermCount = 0;
  for (const term of techTerms) {
    if (lower.includes(term)) techTermCount++;
  }
  technicalDepthScore = Math.min(100, 45 + techTermCount * 12);

  let timingFactor = 1.0;
  if (timeTakenSeconds > maxPacing * 1.5) {
    timingFactor = 0.85;
  } else if (timeTakenSeconds > maxPacing) {
    timingFactor = 0.95;
  } else if (timeTakenSeconds < 15 && wordCount < 20) {
    timingFactor = 0.6;
  }

  const rawComposite = Math.round(
    (structureScore * 0.35 + technicalDepthScore * 0.35 + metricImpactScore * 0.3) * timingFactor
  );
  const compositeScore = Math.max(10, Math.min(100, rawComposite));

  const strengths: string[] = [];
  const improvements: string[] = [];

  if (structureScore >= 80) {
    strengths.push('Bố cục câu trả lời mạch lạc, phân định rõ bối cảnh và giải pháp.');
  } else {
    improvements.push('Cần bổ sung cấu trúc rõ ràng hơn (nêu rõ bối cảnh ban đầu, hành động then chốt và kết quả).');
  }

  if (metricImpactScore >= 75) {
    strengths.push('Dẫn chứng số liệu định lượng thuyết phục (chỉ số phần trăm, độ trễ hoặc quy mô xử lý).');
  } else {
    improvements.push('Bổ sung thêm kết quả định lượng cụ thể (VD: giảm 35% response time, xử lý 50,000 req/s).');
  }

  if (technicalDepthScore >= 70) {
    strengths.push('Thể hiện sự am hiểu kỹ thuật sâu sắc và các khái niệm kiến trúc chuẩn mực.');
  } else {
    improvements.push('Nên giải thích rõ hơn lý do kỹ thuật và sự đánh đổi (trade-offs) giữa các phương án.');
  }

  if (timeTakenSeconds > maxPacing) {
    improvements.push(`Thời gian trả lời (${timeTakenSeconds}s) vượt thời lượng tối ưu (${maxPacing}s). Hãy tóm gọn luận điểm mở đầu.`);
  } else if (timeTakenSeconds >= 30 && timeTakenSeconds <= maxPacing) {
    strengths.push(`Tốc độ và thời gian phản hồi (${timeTakenSeconds}s) đạt chuẩn nhịp phỏng vấn thực tế.`);
  }

  const exemplarAnswer = track === 'system_design'
    ? `Khi thiết kế giải pháp này, tôi chia làm 3 phần: 1) Kiến trúc API Gateway + Rate Limiting theo Token Bucket; 2) Caching đa tầng với Redis cluster và DB PostgreSQL read-replicas; 3) Hàng đợi bất đồng bộ Kafka để xử lý tải đột biến. Kết quả giúp hệ thống chịu tải 50,000 QPS với p99 latency dưới 35ms.`
    : `Tại dự án gần nhất, tôi nhận trách nhiệm tối ưu hệ thống khi gặp tình trạng timeout. Bằng cách thiết lập profiling và cấu trúc lại connection pooling, tôi đã giải quyết bottleneck, đưa tỉ lệ lỗi từ 4.2% xuống 0.05% và tiết kiệm 30% chi phí server.`;

  return {
    turnNumber: 1,
    question,
    answer: text,
    timeTakenSeconds,
    structureScore,
    technicalDepthScore,
    metricImpactScore,
    compositeScore,
    strengths: strengths.length > 0 ? strengths : ['Phản hồi tự tin và đúng trọng tâm câu hỏi.'],
    improvements: improvements.length > 0 ? improvements : ['Duy trì phong độ và độ tự tin hiện tại.'],
    exemplarAnswer
  };
}

export function synthesizeSessionReport(turns: TurnEvaluationDTO[]): SimulationSessionReportDTO {
  if (turns.length === 0) {
    return {
      overallScore: 0,
      readinessGrade: 'High Risk',
      summary: 'Chưa có câu trả lời nào được ghi nhận trong phiên phỏng vấn.',
      topStrengths: ['Chưa có dữ liệu.'],
      keyGaps: ['Cần hoàn thành ít nhất một câu hỏi.'],
      recommendedFocus: 'Luyện tập trả lời ít nhất 3 câu liên tiếp theo nhịp thời gian.'
    };
  }

  const totalScore = turns.reduce((acc, t) => acc + t.compositeScore, 0);
  const overallScore = Math.round(totalScore / turns.length);

  let readinessGrade: SimulationSessionReportDTO['readinessGrade'] = 'Needs Practice';
  if (overallScore >= 85) {
    readinessGrade = 'Ready';
  } else if (overallScore >= 70) {
    readinessGrade = 'Strong Contender';
  } else if (overallScore < 50) {
    readinessGrade = 'High Risk';
  }

  const allStrengths = turns.flatMap(t => t.strengths);
  const allImprovements = turns.flatMap(t => t.improvements);

  const topStrengths = Array.from(new Set(allStrengths)).slice(0, 3);
  const keyGaps = Array.from(new Set(allImprovements)).slice(0, 3);

  let recommendedFocus = 'Tập trung rèn luyện phản xạ dẫn chứng số liệu định lượng trong 30 giây đầu tiên.';
  if (overallScore >= 80) {
    recommendedFocus = 'Bạn đã sẵn sàng cho các vòng phỏng vấn thực tế! Duy trì phong độ tự tin và sự chuẩn xác kỹ thuật.';
  } else if (readinessGrade === 'Needs Practice') {
    recommendedFocus = 'Luyện tập chia sẻ theo khung STAR hoặc nêu rõ bài toán đánh đổi kiến trúc trước khi đi vào giải pháp cụ thể.';
  }

  const summary = `Hoàn thành phiên giả lập ${turns.length} câu hỏi với điểm số trung bình ${overallScore}/100. Xếp loại mức độ sẵn sàng: ${readinessGrade}.`;

  return {
    overallScore,
    readinessGrade,
    summary,
    topStrengths,
    keyGaps,
    recommendedFocus
  };
}

export function validateStartSimulationInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Dữ liệu khởi tạo không hợp lệ.'] };
  }

  const p = input as Record<string, unknown>;

  if (typeof p.targetRole !== 'string' || !p.targetRole.trim()) {
    errors.push('Vị trí mục tiêu không được để trống.');
  }

  if (typeof p.targetCompany !== 'string' || !p.targetCompany.trim()) {
    errors.push('Công ty mục tiêu không được để trống.');
  }

  const validTracks: SimulationTrack[] = ['behavioral_star', 'system_design', 'technical_deepdive', 'culture_leadership'];
  if (!validTracks.includes(p.track as SimulationTrack)) {
    errors.push('Nhóm phỏng vấn (track) không hợp lệ.');
  }

  const validDifficulties: SimulationDifficulty[] = ['junior', 'mid', 'senior', 'lead'];
  if (!validDifficulties.includes(p.difficulty as SimulationDifficulty)) {
    errors.push('Mức độ khó (difficulty) không hợp lệ.');
  }

  const validPacing: SimulationPacingMode[] = ['standard_2min', 'relaxed_5min', 'rapid_fire_1min'];
  if (!validPacing.includes(p.pacingMode as SimulationPacingMode)) {
    errors.push('Chế độ nhịp độ (pacingMode) không hợp lệ.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateSubmitTurnInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Dữ liệu câu trả lời không hợp lệ.'] };
  }

  const p = input as Record<string, unknown>;

  if (typeof p.answer !== 'string' || !p.answer.trim()) {
    errors.push('Nội dung câu trả lời không được để trống.');
  }

  if (typeof p.timeTakenSeconds !== 'number' || p.timeTakenSeconds < 0 || p.timeTakenSeconds > 3600) {
    errors.push('Thời gian trả lời không hợp lệ (từ 0 đến 3600 giây).');
  }

  return { valid: errors.length === 0, errors };
}
