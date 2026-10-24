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

export interface CompanyProfileDTO {
  name: string;
  industry: string;
  size: string;
  headquarters: string;
  website: string;
  logoUrl?: string;
  description: string;
  techStack: string[];
  cultureScores: CompanyCultureScoresDTO;
  salaryBenchmarks: CompanySalaryBenchmarkDTO[];
  interviewQuestions: CompanyInterviewQuestionDTO[];
  recentReviews: CompanyReviewDTO[];
  keyPros: string[];
  keyRedFlags: string[];
  updatedAt: string;
}

export function calculateCompanyAggregates(reviews: CompanyReviewDTO[]): CompanyCultureScoresDTO {
  if (!reviews || reviews.length === 0) {
    return {
      overall: 4.0,
      workLife: 3.8,
      compensation: 4.1,
      careerGrowth: 3.9,
      management: 3.7,
      recommendRate: 80,
      totalReviews: 0
    };
  }

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

const PRESET_COMPANIES: Record<string, Partial<CompanyProfileDTO>> = {
  'FPT Software': {
    industry: 'Information Technology & Software Services',
    size: '30,000+ nhân viên',
    headquarters: 'Hà Nội, Việt Nam',
    website: 'https://fptsoftware.com',
    description: 'Tập đoàn công nghệ và gia công phần mềm hàng đầu khu vực Đông Nam Á với các dự án chuyển đổi số toàn cầu.',
    techStack: ['Java', 'Spring Boot', 'React', 'Angular', 'AWS', 'Azure', 'Microservices', 'Kubernetes'],
    keyPros: [
      'Cơ hội luân chuyển dự án quốc tế (Onsite Nhật Bản, Mỹ, Châu Âu)',
      'Chương trình đào tạo chứng chỉ cloud (AWS/Azure) được tài trợ 100%',
      'Môi trường làm việc quy mô lớn, nhiều campus hiện đại'
    ],
    keyRedFlags: [
      'Quy trình phân cấp phê duyệt nội bộ tương đối nhiều bước',
      'Mức tăng lương hàng năm phụ thuộc nhiều vào xếp loại đánh giá dự án'
    ],
    salaryBenchmarks: [
      { role: 'Software Engineer', level: 'Junior', min: 12000000, median: 16000000, max: 22000000, currency: 'VND', sampleSize: 45 },
      { role: 'Software Engineer', level: 'Mid', min: 22000000, median: 30000000, max: 42000000, currency: 'VND', sampleSize: 68 },
      { role: 'Software Engineer', level: 'Senior', min: 42000000, median: 55000000, max: 75000000, currency: 'VND', sampleSize: 52 },
      { role: 'Software Engineer', level: 'Lead', min: 70000000, median: 90000000, max: 120000000, currency: 'VND', sampleSize: 18 }
    ],
    interviewQuestions: [
      {
        id: 'q-fpt-1',
        role: 'Fullstack / Backend',
        category: 'technical',
        question: 'Hãy giải thích cơ chế Garbage Collection trong Java và cách cấu hình JVM để tránh sự cố OutOfMemoryError trong production?',
        difficulty: 'medium',
        tips: ['Nêu rõ các thế hệ Gen (Young, Old, Metaspace) và thuật toán G1GC / ZGC.']
      },
      {
        id: 'q-fpt-2',
        role: 'Frontend Developer',
        category: 'technical',
        question: 'Làm thế nào để tối ưu kích thước bundle và first load time trong ứng dụng Single Page Application (SPA)?',
        difficulty: 'medium',
        tips: ['Nói về dynamic import / code splitting, Tree Shaking và lazy loading routes.']
      },
      {
        id: 'q-fpt-3',
        role: 'System Architect',
        category: 'system_design',
        question: 'Thiết kế hệ thống đồng bộ dữ liệu thời gian thực giữa 15 chi nhánh toàn cầu với độ trễ dưới 2 giây.',
        difficulty: 'hard',
        tips: ['Sử dụng kiến trúc Event-Driven, Apache Kafka và cơ chế xử lý conflict eventual consistency.']
      }
    ]
  },
  'VNG Corporation': {
    industry: 'Internet & Gaming, Fintech',
    size: '4,000+ nhân viên',
    headquarters: 'TP. Hồ Chí Minh, Việt Nam',
    website: 'https://vng.com.vn',
    description: 'Kỳ lân công nghệ đầu tiên tại Việt Nam, sở hữu hệ sinh thái Zalo, ZaloPay, Zing và các tựa game nổi tiếng.',
    techStack: ['Golang', 'Java', 'Python', 'React', 'Kafka', 'Redis', 'Kubernetes', 'Hadoop'],
    keyPros: [
      'Sản phẩm phục vụ hàng chục triệu người dùng thực (Zalo, ZaloPay)',
      'Campus VNG Campus hiện đại, nhiều tiện ích thể thao, ăn uống miễn phí',
      'Đãi ngộ cạnh tranh cao và gói thưởng hiệu quả kinh doanh hấp dẫn'
    ],
    keyRedFlags: [
      'Áp lực mục tiêu KPI tăng trưởng người dùng rất quyết liệt',
      'Một số mảng sản phẩm đòi hỏi trực hệ thống (On-call) 24/7'
    ],
    salaryBenchmarks: [
      { role: 'Software Engineer', level: 'Junior', min: 18000000, median: 24000000, max: 32000000, currency: 'VND', sampleSize: 34 },
      { role: 'Software Engineer', level: 'Mid', min: 32000000, median: 45000000, max: 62000000, currency: 'VND', sampleSize: 46 },
      { role: 'Software Engineer', level: 'Senior', min: 60000000, median: 80000000, max: 110000000, currency: 'VND', sampleSize: 38 },
      { role: 'Software Engineer', level: 'Lead', min: 100000000, median: 135000000, max: 180000000, currency: 'VND', sampleSize: 14 }
    ],
    interviewQuestions: [
      {
        id: 'q-vng-1',
        role: 'Backend Engineer',
        category: 'technical',
        question: 'Tại sao Zalo chọn kiến trúc in-memory cache kết hợp distributed KV store? Cách xử lý cache stampede khi có hàng triệu người cùng online?',
        difficulty: 'hard',
        tips: ['Đề cập mutex lock / singleflight pattern, stale-while-revalidate và cache pre-warming.']
      },
      {
        id: 'q-vng-2',
        role: 'Infrastructure Engineer',
        category: 'system_design',
        question: 'Thiết kế hệ thống Push Notification gửi đồng thời 10 triệu tin nhắn trong vòng 3 phút.',
        difficulty: 'hard',
        tips: ['Kiến trúc pipeline xử lý phân tán, phân tầng buffer Redis/Kafka và throttling connection pool.']
      }
    ]
  },
  'Shopee': {
    industry: 'E-commerce & Logistics',
    size: '10,000+ nhân viên',
    headquarters: 'Singapore (Văn phòng TP.HCM)',
    website: 'https://careers.shopee.vn',
    description: 'Nền tảng thương mại điện tử hàng đầu Đông Nam Á và Đài Loan thuộc tập đoàn Sea Group.',
    techStack: ['Go', 'Python', 'React', 'TypeScript', 'MySQL', 'Redis', 'Elasticsearch', 'Docker'],
    keyPros: [
      'Scale hệ thống cực lớn, hàng trăm nghìn RPS trong các chiến dịch Mega Sale',
      'Đội ngũ kỹ sư trẻ trung, giải quyết bài toán logistics và thanh toán phức tạp',
      'Thu nhập và gói thưởng cạnh tranh theo thị trường khu vực'
    ],
    keyRedFlags: [
      'Tần suất OT tăng cao vào các ngày siêu sale (9/9, 11/11, 12/12)',
      'Tốc độ thay đổi yêu cầu tính năng nhanh đòi hỏi khả năng thích ứng cao'
    ],
    salaryBenchmarks: [
      { role: 'Software Engineer', level: 'Junior', min: 20000000, median: 27000000, max: 35000000, currency: 'VND', sampleSize: 28 },
      { role: 'Software Engineer', level: 'Mid', min: 35000000, median: 50000000, max: 70000000, currency: 'VND', sampleSize: 39 },
      { role: 'Software Engineer', level: 'Senior', min: 65000000, median: 90000000, max: 125000000, currency: 'VND', sampleSize: 31 }
    ],
    interviewQuestions: [
      {
        id: 'q-shopee-1',
        role: 'Backend Engineer',
        category: 'technical',
        question: 'Làm thế nào để đảm bảo tính nhất quán (ACID) của giao dịch đặt đơn hàng và trừ kho trong flash sale 1s?',
        difficulty: 'hard',
        tips: ['Sử dụng Redis Lua script để kiểm tra và trừ tồn kho nguyên tử (atomic), kết hợp async message queue.']
      }
    ]
  }
};

export function synthesizeCompanyIntelligence(
  name: string,
  custom?: Partial<CompanyProfileDTO>
): CompanyProfileDTO {
  const cleanName = (name || '').trim();
  const matchedKey = Object.keys(PRESET_COMPANIES).find(
    k => k.toLowerCase() === cleanName.toLowerCase()
  );

  const preset = matchedKey ? PRESET_COMPANIES[matchedKey] : null;

  const defaultScores: CompanyCultureScoresDTO = {
    overall: 4.2,
    workLife: 3.9,
    compensation: 4.1,
    careerGrowth: 4.3,
    management: 4.0,
    recommendRate: 85,
    totalReviews: 24
  };

  const defaultSalaries: CompanySalaryBenchmarkDTO[] = [
    { role: 'Software Engineer', level: 'Junior', min: 14000000, median: 19000000, max: 26000000, currency: 'VND', sampleSize: 18 },
    { role: 'Software Engineer', level: 'Mid', min: 26000000, median: 38000000, max: 52000000, currency: 'VND', sampleSize: 29 },
    { role: 'Software Engineer', level: 'Senior', min: 50000000, median: 70000000, max: 95000000, currency: 'VND', sampleSize: 22 },
    { role: 'Software Engineer', level: 'Lead', min: 85000000, median: 110000000, max: 150000000, currency: 'VND', sampleSize: 9 }
  ];

  const defaultQuestions: CompanyInterviewQuestionDTO[] = [
    {
      id: `q-${cleanName.toLowerCase()}-1`,
      role: 'Software Engineer',
      category: 'technical',
      question: `Trình bày kiến trúc hệ thống gần nhất bạn thiết kế và cách giải quyết bài toán nút thắt cổ chai (bottleneck) tại ${cleanName || 'công ty'}?`,
      difficulty: 'medium',
      tips: ['Tập trung vào số liệu thực tế trước và sau tối ưu (latency, CPU, memory).']
    },
    {
      id: `q-${cleanName.toLowerCase()}-2`,
      role: 'Fullstack / Frontend',
      category: 'behavioral',
      question: 'Khi nhận yêu cầu tính năng gấp nhưng tài liệu sơ sài và deadline sát nút, bạn sắp xếp thứ tự ưu tiên như thế nào?',
      difficulty: 'easy',
      tips: ['Áp dụng quy tắc phân tách MVP, làm rõ acceptance criteria với Product Owner trước khi code.']
    }
  ];

  const defaultReviews: CompanyReviewDTO[] = [
    {
      id: `rev-${Date.now()}-1`,
      companyName: cleanName || 'Doanh nghiệp',
      role: 'Senior Software Engineer',
      rating: 5,
      workLifeBalance: 4,
      compensationRating: 5,
      careerGrowth: 5,
      managementRating: 4,
      recommend: true,
      pros: 'Môi trường làm việc cởi mở, đồng nghiệp hỗ trợ nhiệt tình, chế độ phúc lợi rõ ràng và khuyến khích đổi mới công nghệ.',
      cons: 'Đôi lúc tiến độ dự án thay đổi đột xuất khi có yêu cầu mới từ khách hàng lớn.',
      advice: 'Cần trao đổi sớm về các giả định kỹ thuật với team lead để tránh re-work.',
      createdAt: new Date().toISOString()
    }
  ];

  return {
    name: cleanName || 'Doanh nghiệp công nghệ',
    industry: custom?.industry || preset?.industry || 'Information Technology & Software',
    size: custom?.size || preset?.size || '500 - 2,000 nhân viên',
    headquarters: custom?.headquarters || preset?.headquarters || 'Việt Nam',
    website: custom?.website || preset?.website || `https://${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`,
    logoUrl: custom?.logoUrl || preset?.logoUrl || undefined,
    description: custom?.description || preset?.description || `Doanh nghiệp hoạt động trong lĩnh vực công nghệ thông tin và phát triển giải pháp số hoá, cung ứng dịch vụ phần mềm cho khách hàng trong nước và quốc tế.`,
    techStack: custom?.techStack || preset?.techStack || ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
    cultureScores: custom?.cultureScores || preset?.cultureScores || defaultScores,
    salaryBenchmarks: custom?.salaryBenchmarks || preset?.salaryBenchmarks || defaultSalaries,
    interviewQuestions: custom?.interviewQuestions || preset?.interviewQuestions || defaultQuestions,
    recentReviews: custom?.recentReviews || preset?.recentReviews || defaultReviews,
    keyPros: custom?.keyPros || preset?.keyPros || [
      'Công nghệ hiện đại, khuyến khích áp dụng best practices',
      'Văn hóa tôn trọng sự đóng góp cá nhân và trao quyền',
      'Gói bảo hiểm sức khỏe toàn diện và phụ cấp thiết bị'
    ],
    keyRedFlags: custom?.keyRedFlags || preset?.keyRedFlags || [
      'Tài liệu hệ thống legacy còn thiếu sót, cần tự đọc code để hiểu sâu',
      'Định kỳ phát hành tính năng cần phối hợp ngoài giờ trong tuần lễ release'
    ],
    updatedAt: new Date().toISOString()
  };
}
