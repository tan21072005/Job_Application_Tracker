export type CampaignObjective = 'referral_request' | 'coffee_chat' | 'recruiter_intro' | 'cold_pitch';

export type OutreachTargetType = 'recruiter' | 'engineer' | 'hiring_manager' | 'alumni';

export type OutreachChannel = 'linkedin' | 'email' | 'twitter' | 'other';

export type RecipientStatus = 'pending' | 'sent' | 'replied' | 'referred' | 'declined';

export interface OutreachStepDTO {
  id: string;
  stepOrder: number;
  delayDays: number;
  channel: OutreachChannel;
  title: string;
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface OutreachRecipientDTO {
  id: string;
  campaignId: string;
  contactId: string | null;
  name: string;
  title: string;
  company: string;
  channel: OutreachChannel;
  email: string | null;
  linkedinUrl: string | null;
  currentStepIndex: number;
  status: RecipientStatus;
  lastContactedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachCampaignDTO {
  id: string;
  name: string;
  objective: CampaignObjective;
  targetType: OutreachTargetType;
  targetCompany: string;
  targetRole: string;
  status: 'active' | 'completed' | 'archived';
  steps: OutreachStepDTO[];
  recipients: OutreachRecipientDTO[];
  analytics?: CampaignAnalyticsDTO;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAnalyticsDTO {
  totalRecipients: number;
  totalSent: number;
  totalReplied: number;
  totalReferred: number;
  replyRate: number;
  referralRate: number;
}

export interface CreateCampaignInputDTO {
  name: string;
  objective: CampaignObjective;
  targetType: OutreachTargetType;
  targetCompany: string;
  targetRole: string;
  customSteps?: Array<Omit<OutreachStepDTO, 'id'>>;
}

export interface AddRecipientInputDTO {
  contactId?: string | null;
  name: string;
  title: string;
  company: string;
  channel?: OutreachChannel;
  email?: string | null;
  linkedinUrl?: string | null;
  notes?: string;
}

export interface UpdateRecipientStepInputDTO {
  currentStepIndex: number;
  status: RecipientStatus;
  notes?: string;
}

export function generateOutreachSequence(
  objective: CampaignObjective,
  targetType: OutreachTargetType,
  role: string,
  company: string
): OutreachStepDTO[] {
  const safeRole = role || 'vị trí mục tiêu';
  const safeCompany = company || 'quý công ty';

  if (objective === 'referral_request') {
    return [
      {
        id: 'step-1',
        stepOrder: 1,
        delayDays: 0,
        channel: 'linkedin',
        title: 'Bước 1: Kết nối & Lời chào thân thiện',
        subjectTemplate: `Kết nối với anh/chị {{name}} tại ${safeCompany}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm thấy anh/chị đang làm {{recipient_title}} tại ${safeCompany}. Em rất ấn tượng với định hướng phát triển của đội ngũ và mong muốn được kết nối để học hỏi thêm từ kinh nghiệm của anh/chị.\nChúc anh/chị một tuần làm việc hiệu quả!`
      },
      {
        id: 'step-2',
        stepOrder: 2,
        delayDays: 3,
        channel: 'linkedin',
        title: 'Bước 2: Giới thiệu điểm mạnh & Nguyện vọng',
        subjectTemplate: `Thảo luận cơ hội ${safeRole} tại ${safeCompany}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm đang quan tâm sâu sắc tới vị trí ${safeRole} tại ${safeCompany}. Với nền tảng về {{my_strength}}, em tin mình có thể đóng góp hiệu quả vào các dự án hiện tại của công ty.\nKhông biết anh/chị có 5 phút để cho em xin góc nhìn ngắn về môi trường làm việc tại đội ngũ không ạ?`
      },
      {
        id: 'step-3',
        stepOrder: 3,
        delayDays: 6,
        channel: 'linkedin',
        title: 'Bước 3: Lời nhờ Referral chân thành',
        subjectTemplate: `Nhờ anh/chị {{name}} hỗ trợ Referral cho ${safeRole}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm vừa hoàn thiện hồ sơ ứng tuyển ${safeRole}. Nếu thuận tiện, em rất hy vọng được anh/chị hỗ trợ chuyển CV qua kênh Employee Referral nội bộ để hồ sơ sớm đến tay Hiring Team.\nEm xin gửi kèm CV và portfolio tại: {{portfolio_url}}.\nEm chân thành cảm ơn sự hỗ trợ quý báu của anh/chị!`
      }
    ];
  }

  if (objective === 'coffee_chat') {
    return [
      {
        id: 'step-1',
        stepOrder: 1,
        delayDays: 0,
        channel: 'linkedin',
        title: 'Bước 1: Lời mời trò chuyện ngắn',
        subjectTemplate: `Xin phép mời anh/chị {{name}} 10 phút Coffee Chat`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm theo dõi các chia sẻ chuyên môn của anh/chị về mảng công nghệ tại ${safeCompany} và học hỏi được rất nhiều. Em mong muốn xin phép mời anh/chị một buổi coffee chat 10-15 phút online để lắng nghe thêm góc nhìn của anh/chị về ngành.`
      },
      {
        id: 'step-2',
        stepOrder: 2,
        delayDays: 4,
        channel: 'linkedin',
        title: 'Bước 2: Gửi câu hỏi cụ thể & Thời gian linh hoạt',
        subjectTemplate: `Follow-up lời mời trò chuyện cùng anh/chị {{name}}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm biết anh/chị rất bận rộn. Để tiết kiệm thời gian, em chỉ muốn xin góc nhìn ngắn về văn hóa kỹ thuật và tech stack đang phát triển tại ${safeCompany}. Em hoàn toàn linh hoạt theo khung giờ của anh/chị.`
      },
      {
        id: 'step-3',
        stepOrder: 3,
        delayDays: 7,
        channel: 'linkedin',
        title: 'Bước 3: Lời cảm ơn và giữ liên lạc',
        subjectTemplate: `Cảm ơn và giữ kết nối với anh/chị {{name}}`,
        bodyTemplate: `Chào anh/chị {{name}},\nNếu hiện tại lịch trình chưa thuận tiện, em rất hy vọng có dịp được trao đổi với anh/chị trong tương lai. Em chúc anh/chị và đội ngũ ${safeCompany} luôn gặt hái nhiều thành công!`
      }
    ];
  }

  if (objective === 'recruiter_intro') {
    return [
      {
        id: 'step-1',
        stepOrder: 1,
        delayDays: 0,
        channel: 'linkedin',
        title: 'Bước 1: Giới thiệu hồ sơ trực tiếp đến Recruiter',
        subjectTemplate: `Ứng tuyển vị trí ${safeRole} - {{my_name}}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm được biết anh/chị đang phụ trách tuyển dụng cho vị trí ${safeRole} tại ${safeCompany}. Em xin phép gửi tóm tắt hồ sơ với kinh nghiệm về {{my_strength}} rất phù hợp với yêu cầu tuyển dụng.`
      },
      {
        id: 'step-2',
        stepOrder: 2,
        delayDays: 3,
        channel: 'email',
        title: 'Bước 2: Nêu dự án nổi bật & Thành tựu định lượng',
        subjectTemplate: `Bổ sung thông tin dự án nổi bật cho vị trí ${safeRole}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm xin phép gửi bổ sung một số sản phẩm và chỉ số nổi bật em từng triển khai: {{highlight}}.\nHy vọng có cơ hội trao đổi trực tiếp hơn với anh/chị ở vòng sơ loại.`
      },
      {
        id: 'step-3',
        stepOrder: 3,
        delayDays: 6,
        channel: 'linkedin',
        title: 'Bước 3: Kiểm tra tiến độ xét duyệt hồ sơ',
        subjectTemplate: `Hỏi thăm tình trạng hồ sơ ${safeRole}`,
        bodyTemplate: `Chào anh/chị {{name}},\nEm xin phép hỏi thăm xem phòng tuyển dụng ${safeCompany} đã có kế hoạch phỏng vấn cho vị trí ${safeRole} chưa ạ? Em luôn sẵn sàng sắp xếp thời gian trao đổi.`
      }
    ];
  }

  return [
    {
      id: 'step-1',
      stepOrder: 1,
      delayDays: 0,
      channel: 'linkedin',
      title: 'Bước 1: Mở đầu với giá trị đem lại',
      subjectTemplate: `Ý tưởng đóng góp cho đội ngũ ${safeCompany}`,
      bodyTemplate: `Chào anh/chị {{name}},\nEm thấy ${safeCompany} đang mở rộng quy mô mảng công nghệ. Em muốn chia sẻ một vài giải pháp tối ưu mà em từng thực hiện thành công tại các hệ thống tương tự.`
    },
    {
      id: 'step-2',
      stepOrder: 2,
      delayDays: 4,
      channel: 'linkedin',
      title: 'Bước 2: Minh chứng năng lực thực tế',
      subjectTemplate: `Tài liệu kỹ thuật tóm tắt gửi anh/chị {{name}}`,
      bodyTemplate: `Chào anh/chị {{name}},\nEm xin gửi một số kiến trúc và code case study em từng tối ưu: {{portfolio_url}}. Rất mong nhận được phản hồi đóng góp từ anh/chị.`
    },
    {
      id: 'step-3',
      stepOrder: 3,
      delayDays: 8,
      channel: 'linkedin',
      title: 'Bước 3: Đề xuất buổi trao đổi ngắn',
      subjectTemplate: `Lời mời trao đổi nhanh cùng anh/chị {{name}}`,
      bodyTemplate: `Chào anh/chị {{name}},\nNếu anh/chị quan tâm đến các đề xuất cải tiến trên, em rất sẵn lòng dành 10 phút để trình bày chi tiết hơn.`
    }
  ];
}

export function personalizeMessage(
  template: string,
  params: Record<string, string | null | undefined>
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    return params[key] ?? '';
  });
}

export function computeCampaignMetrics(
  recipients: OutreachRecipientDTO[]
): CampaignAnalyticsDTO {
  const totalRecipients = recipients.length;
  if (totalRecipients === 0) {
    return {
      totalRecipients: 0,
      totalSent: 0,
      totalReplied: 0,
      totalReferred: 0,
      replyRate: 0,
      referralRate: 0
    };
  }

  let totalSent = 0;
  let totalReplied = 0;
  let totalReferred = 0;

  for (const r of recipients) {
    if (r.status === 'sent' || r.status === 'replied' || r.status === 'referred' || r.status === 'declined') {
      totalSent++;
    }
    if (r.status === 'replied' || r.status === 'referred') {
      totalReplied++;
    }
    if (r.status === 'referred') {
      totalReferred++;
    }
  }

  const replyRate = totalSent > 0 ? Number(((totalReplied / totalSent) * 100).toFixed(1)) : 0;
  const referralRate = totalSent > 0 ? Number(((totalReferred / totalSent) * 100).toFixed(1)) : 0;

  return {
    totalRecipients,
    totalSent,
    totalReplied,
    totalReferred,
    replyRate,
    referralRate
  };
}

export function validateCreateCampaignInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Dữ liệu chiến dịch không hợp lệ.'] };
  }

  const p = input as Record<string, unknown>;

  if (typeof p.name !== 'string' || !p.name.trim()) {
    errors.push('Tên chiến dịch không được để trống.');
  } else if (p.name.length > 200) {
    errors.push('Tên chiến dịch không được vượt quá 200 ký tự.');
  }

  const validObjectives: CampaignObjective[] = ['referral_request', 'coffee_chat', 'recruiter_intro', 'cold_pitch'];
  if (!validObjectives.includes(p.objective as CampaignObjective)) {
    errors.push('Mục tiêu chiến dịch không hợp lệ.');
  }

  const validTargetTypes: OutreachTargetType[] = ['recruiter', 'engineer', 'hiring_manager', 'alumni'];
  if (!validTargetTypes.includes(p.targetType as OutreachTargetType)) {
    errors.push('Đối tượng mục tiêu không hợp lệ.');
  }

  if (typeof p.targetCompany !== 'string' || !p.targetCompany.trim()) {
    errors.push('Công ty mục tiêu không được để trống.');
  }

  if (typeof p.targetRole !== 'string' || !p.targetRole.trim()) {
    errors.push('Vị trí mục tiêu không được để trống.');
  }

  return { valid: errors.length === 0, errors };
}

export function validateUpdateRecipientStepInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Dữ liệu cập nhật không hợp lệ.'] };
  }

  const p = input as Record<string, unknown>;

  if (typeof p.currentStepIndex !== 'number' || p.currentStepIndex < 0 || p.currentStepIndex > 10) {
    errors.push('Bước chiến dịch không hợp lệ (từ 0 đến 10).');
  }

  const validStatuses: RecipientStatus[] = ['pending', 'sent', 'replied', 'referred', 'declined'];
  if (!validStatuses.includes(p.status as RecipientStatus)) {
    errors.push('Trạng thái người nhận không hợp lệ.');
  }

  return { valid: errors.length === 0, errors };
}
