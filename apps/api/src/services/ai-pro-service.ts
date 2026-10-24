import { Pool, type PoolClient } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import type { CandidateProfile } from './candidate-profile.ts';
import { fail } from './jobtrack-service.ts';
import { verifyPaymentSignature } from '../security/payment-signature.ts';
import type {
  ProOrderDTO,
  ProPlanDTO,
  ProOrderStatus,
  AtsMatchResultDTO,
  CoverLetterResultDTO,
  AtsKeywordBreakdown,
  InterviewPrepRequestDTO,
  InterviewPrepResultDTO,
  InterviewEvaluateRequestDTO,
  InterviewEvaluateResultDTO
} from '@jobtrack/contract';
import {
  generateInterviewQuestions,
  evaluateStarAnswer,
  calculateAnnualTotalCompensation,
  evaluateOfferDetails,
  compareOffers,
  generateCounterOfferScript,
  type OfferEvaluationInput,
  type OfferComparisonInput,
  type CounterOfferNegotiationInput,
  type OfferEvaluationDTO,
  type OfferComparisonMatrixDTO,
  type CounterOfferScriptDTO
} from '@jobtrack/contract';

export type AtsMatchResult = AtsMatchResultDTO;
export type CoverLetterResult = CoverLetterResultDTO;

export interface ProStatus {
  tier: 'free' | 'pro' | 'elite';
  isPro: boolean;
  expiresAt: string | null;
}

export type ProPlan = 'monthly' | 'quarterly' | 'yearly';

export const PLAN_PRICES: Readonly<Record<ProPlan, number>> = Object.freeze({
  monthly: 99000,
  quarterly: 249000,
  yearly: 799000
});

export const PLAN_DURATION_DAYS: Readonly<Record<ProPlan, number>> = Object.freeze({
  monthly: 30,
  quarterly: 90,
  yearly: 365
});

export const PAYMENT_MODE_ENV = 'PAYMENT_MODE';
export const PAYMENT_TEST_MODE = 'test';
const PAYMENT_TEST_NOTICE =
  'Thanh toán đang ở chế độ thử nghiệm: hệ thống chưa kết nối cổng thanh toán và chưa có thông tin nhận tiền. Gói Pro chỉ được kích hoạt bởi webhook thanh toán đã ký.';
const TRANSFER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TRANSFER_CODE_PATTERN = /^JTPRO[A-Z0-9]{6}$/;
const TRANSFER_CODE_SEARCH = /\bJTPRO[A-Z0-9]{6}\b/;
const AMOUNT_PATTERN = /^(\d{1,9}|\d{1,3}[.,]\d{3}|\d+[.,]\d{1,2})$/;
const GROUPED_AMOUNT_PATTERN = /^\d{1,3}[.,]\d{3}$/;
const DECIMAL_AMOUNT_PATTERN = /^\d+[.,]\d{1,2}$/;

export function normalizeProPlan(value: unknown): ProPlan {
  return value === 'quarterly' || value === 'yearly' ? value : 'monthly';
}

export function isPaymentTestMode(value: string | undefined = process.env[PAYMENT_MODE_ENV]): boolean {
  return value === PAYMENT_TEST_MODE;
}

function createTransferCode(): string {
  const bytes = randomBytes(6);
  let suffix = '';
  for (const byte of bytes) {
    suffix += TRANSFER_ALPHABET[byte % TRANSFER_ALPHABET.length];
  }
  return `JTPRO${suffix}`;
}

function readTransferCode(payload: Record<string, unknown>): string {
  const direct = typeof payload.transferCode === 'string' ? payload.transferCode.trim().toUpperCase() : '';
  if (TRANSFER_CODE_PATTERN.test(direct)) return direct;
  const content = typeof payload.content === 'string'
    ? payload.content
    : typeof payload.description === 'string'
      ? payload.description
      : '';
  const match = content.toUpperCase().match(TRANSFER_CODE_SEARCH);
  return match ? match[0] : '';
}

function readWebhookAmount(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : NaN;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!AMOUNT_PATTERN.test(text)) return NaN;
    const normalized = GROUPED_AMOUNT_PATTERN.test(text)
      ? text.replace(/[.,]/g, '')
      : DECIMAL_AMOUNT_PATTERN.test(text)
        ? text.replace(/[.,]/, '.')
        : text;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : NaN;
  }
  return NaN;
}


export interface CheckoutResult {
  orderId: string;
  plan: ProPlan;
  amount: number;
  currency: string;
  transferCode: string;
  mode: 'test';
  testNotice: string;
  bankName: null;
  accountNo: null;
  accountName: null;
  vietQrUrl: null;
  instructions: string;
}

export interface PaymentWebhookResult {
  success: true;
  replayed: boolean;
  orderId: string;
  plan: ProPlan;
}


const COMMON_SKILL_KEYWORDS = [
  'JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java',
  'C#', 'Golang', 'PHP', 'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Git', 'Linux',
  'REST API', 'GraphQL', 'Microservices', 'Agile', 'Scrum', 'Jira',
  'Kế toán trưởng', 'Kế toán tổng hợp', 'Báo cáo tài chính', 'Quyết toán thuế',
  'Hóa đơn điện tử', 'Kiểm toán', 'MISA', 'FAST', 'SAP', 'ERP', 'Quản trị chi phí',
  'Dòng tiền', 'Phân tích tài chính', 'Thuế TNDN', 'Thuế GTGT',
  'Vận hành trạm', 'Xử lý nước thải', 'Hóa chất', 'An toàn lao động', 'ISO 14001',
  'ISO 9001', 'Bảo trì thiết bị', 'Kỹ thuật môi trường', 'Giám sát kỹ thuật',
  'Quản lý đội ngũ', 'Lãnh đạo', 'Giao tiếp', 'Đàm phán', 'Giải quyết vấn đề',
  'Tiếng Anh', 'TOEIC', 'IELTS', 'Lập kế hoạch'
];

export class AiProService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async analyzeAtsMatch(
    jd: { company: string; position: string; notes?: string | null },
    profile: CandidateProfile | null
  ): Promise<AtsMatchResult> {
    const jdText = `${jd.position} ${jd.company} ${jd.notes || ''}`.toLowerCase();

    const detectedJdSkills: string[] = [];
    for (const skill of COMMON_SKILL_KEYWORDS) {
      if (jdText.includes(skill.toLowerCase())) {
        detectedJdSkills.push(skill);
      }
    }

    if (detectedJdSkills.length === 0) {
      const words = jd.position.split(/\s+/).filter(w => w.length > 2);
      detectedJdSkills.push(...words.slice(0, 4));
    }

    const candidateSkills = (profile?.skills || []).map(s => s.trim());
    const candidateBio = (profile?.bio || '').toLowerCase();
    const candidateText = `${candidateSkills.join(' ')} ${candidateBio}`.toLowerCase();

    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const keywordBreakdown: AtsMatchResult['keywordBreakdown'] = [];

    for (let i = 0; i < detectedJdSkills.length; i++) {
      const skill = detectedJdSkills[i];
      const hasSkill = candidateText.includes(skill.toLowerCase()) ||
        candidateSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs.toLowerCase()));

      const importance = i < 2 ? 'high' : i < 4 ? 'medium' : 'bonus';

      keywordBreakdown.push({
        skill,
        foundInCv: hasSkill,
        importance
      });

      if (hasSkill) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    }

    let score = 50;
    if (detectedJdSkills.length > 0) {
      const matchRatio = matchedSkills.length / detectedJdSkills.length;
      score = Math.round(matchRatio * 55 + 25);
    }
    if (profile?.fullName && profile.email) score += 10;
    if (profile?.bio && profile.bio.length > 50) score += 10;
    score = Math.min(96, Math.max(25, score));

    let overallFit: AtsMatchResult['overallFit'] = 'Tiềm năng';
    if (score >= 85) overallFit = 'Xuất sắc';
    else if (score >= 70) overallFit = 'Phù hợp';
    else if (score < 50) overallFit = 'Cần bổ sung kỹ năng';

    const recommendations: string[] = [];
    if (missingSkills.length > 0) {
      recommendations.push(
        `Bổ sung các từ khóa kỹ năng quan trọng vào CV: ${missingSkills.slice(0, 4).join(', ')}.`
      );
    }
    recommendations.push(
      `Đồng bộ tiêu đề hồ sơ của bạn khớp với vị trí "${jd.position}" để tối ưu thuật toán tìm kiếm của ATS.`
    );
    if (!profile?.bio || profile.bio.length < 50) {
      recommendations.push(
        'Cập nhật đoạn tóm tắt kinh nghiệm (Bio) 3-4 câu nêu bật thành tựu định lượng (con số, tỷ lệ % tăng trưởng).'
      );
    }

    return {
      score,
      overallFit,
      matchedSkills,
      missingSkills,
      recommendations,
      keywordBreakdown
    };
  }

  async generateCoverLetter(
    jd: { company: string; position: string; notes?: string | null },
    profile: CandidateProfile | null,
    options: { language?: 'vi' | 'en'; tone?: string } = {}
  ): Promise<CoverLetterResult> {
    const isEn = options.language === 'en';
    const candidateName = profile?.fullName || (isEn ? 'Applicant' : 'Ứng viên');
    const candidateEmail = profile?.email || 'email@example.com';
    const candidatePhone = profile?.phone || '(+84) 9xx xxx xxx';
    const candidateSkills = profile?.skills?.length ? profile.skills.join(', ') : (isEn ? 'relevant domain experience' : 'kinh nghiệm chuyên môn liên quan');
    const company = jd.company || (isEn ? 'Your Company' : 'Quý công ty');
    const position = jd.position || (isEn ? 'the open position' : 'vị trí tuyển dụng');

    let coverLetter = '';
    let shortPitch = '';

    if (isEn) {
      coverLetter = `Dear Hiring Team at ${company},\n\n` +
        `I am writing to express my strong interest in the ${position} position at ${company}. With my background in ${candidateSkills} and a proven track record of delivering measurable results, I am confident in my ability to make an immediate, positive impact on your team.\n\n` +
        `Throughout my career, I have dedicated myself to solving core challenges and continuously optimizing processes. What excites me most about ${company} is your commitment to high standards and sustainable growth. My experience aligning with your requirements positions me well to help drive your upcoming goals.\n\n` +
        `I would welcome the opportunity to discuss how my skill set and dedication can contribute to ${company}'s ongoing success.\n\n` +
        `Thank you for your time and consideration.\n\n` +
        `Sincerely,\n${candidateName}\n${candidatePhone} | ${candidateEmail}`;

      shortPitch = `Hi Hiring Team, I recently noticed your opening for ${position} at ${company}. With proven expertise in ${candidateSkills}, I believe my background aligns closely with what you are seeking. I would love to connect and share how I can contribute!`;
    } else {
      coverLetter = `Kính gửi: Bộ phận Tuyển dụng & Ban Lãnh đạo ${company},\n\n` +
        `Tôi tên là ${candidateName}. Tôi viết thư này để bày tỏ nguyện vọng được ứng tuyển vào vị trí ${position} tại ${company}.\n\n` +
        `Với nền tảng chuyên môn vững chắc về ${candidateSkills}, cùng kinh nghiệm giải quyết các bài toán thực tế và tinh thần trách nhiệm cao, tôi tin rằng mình có thể nhanh chóng hòa nhập và đóng góp hiệu quả vào các mục tiêu phát triển của quý công ty.\n\n` +
        `Qua tìm hiểu, tôi đặc biệt ấn tượng với định hướng phát triển cũng như môi trường làm việc chuyên nghiệp tại ${company}. Tôi mong muốn có cơ hội được tham gia trực tiếp vào việc nâng cao hiệu quả vận hành và tạo ra những giá trị bền vững cho doanh nghiệp.\n\n` +
        `Tôi rất mong có cơ hội được trao đổi chi tiết hơn trong một buổi phỏng vấn trực tiếp hoặc online cùng quý công ty.\n\n` +
        `Xin chân thành cảm ơn quý công ty đã dành thời gian xem xét hồ sơ của tôi.\n\n` +
        `Trân trọng,\n${candidateName}\nSố điện thoại: ${candidatePhone}\nEmail: ${candidateEmail}`;

      shortPitch = `Kính chào anh/chị tuyển dụng tại ${company}, em là ${candidateName}. Em có kinh nghiệm thực chiến về ${candidateSkills} và rất quan tâm đến vị trí ${position}. Em xin phép gửi CV ứng tuyển và rất mong có cơ hội được trao đổi thêm cùng anh/chị!`;
    }

    const highlights = [
      `Cá nhân hóa theo đúng vị trí "${position}" tại ${company}`,
      `Nhấn mạnh các thế mạnh cốt lõi: ${candidateSkills}`,
      `Văn phong chuyên nghiệp, chuẩn mực chuẩn tuyển dụng ATS`
    ];

    return {
      coverLetter,
      shortPitch,
      highlights
    };
  }

  async getProStatus(userId: string): Promise<ProStatus> {
    const res = await this.pool.query(
      `SELECT tier, pro_expires_at AS "expiresAt" FROM user_memberships WHERE user_id = $1`,
      [userId]
    );

    if (!res.rows[0]) {
      return { tier: 'free', isPro: false, expiresAt: null };
    }

    const row = res.rows[0];
    const isPro = row.tier !== 'free' && (!row.expiresAt || new Date(row.expiresAt) > new Date());
    return {
      tier: row.tier,
      isPro,
      expiresAt: row.expiresAt
    };
  }

  async createCheckout(userId: string, plan: ProPlan = 'monthly'): Promise<CheckoutResult> {
    if (!isPaymentTestMode()) {
      fail(
        503,
        'Thanh toán thật chưa được mở trong phiên bản này. Vui lòng thử lại khi cổng thanh toán được bật.',
        'live_payments_unavailable'
      );
    }

    const resolvedPlan = normalizeProPlan(plan);
    const amount = PLAN_PRICES[resolvedPlan];
    const transferCode = createTransferCode();
    const orderId = randomUUID();

    await this.pool.query(
      `INSERT INTO payment_orders (id, user_id, plan, amount, currency, transfer_code, status, payment_method, expires_at)
       VALUES ($1, $2, $3, $4, 'VND', $5, 'pending', 'vietqr', CURRENT_TIMESTAMP + interval '30 minutes')`,
      [orderId, userId, resolvedPlan, amount, transferCode]
    );

    return {
      orderId,
      plan: resolvedPlan,
      amount,
      currency: 'VND',
      transferCode,
      mode: 'test',
      testNotice: PAYMENT_TEST_NOTICE,
      bankName: null,
      accountNo: null,
      accountName: null,
      vietQrUrl: null,
      instructions: `Đơn hàng ${transferCode} đã được tạo ở chế độ thử nghiệm với số tiền ${amount} VND. Gói Pro chỉ được kích hoạt sau khi máy chủ nhận một webhook thanh toán hợp lệ có chữ ký.`
    };
  }

  getPlans(): ProPlanDTO[] {
    const plans: ProPlan[] = ['monthly', 'quarterly', 'yearly'];
    return plans.map(plan => ({
      plan,
      amount: PLAN_PRICES[plan],
      currency: 'VND',
      durationDays: PLAN_DURATION_DAYS[plan]
    }));
  }

  async getOrder(userId: string, orderId: string): Promise<ProOrderDTO> {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      plan: string;
      amount: number;
      currency: string;
      transfer_code: string;
      status: string;
      failed_reason: string | null;
      expires_at: Date | null;
      created_at: Date;
      completed_at: Date | null;
    }>(
      `SELECT id, user_id, plan, amount, currency, transfer_code, status, failed_reason, expires_at, created_at, completed_at
       FROM payment_orders
       WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (result.rowCount === 0) {
      fail(404, 'Không tìm thấy đơn hàng.', 'order_not_found');
    }

    const row = result.rows[0];
    let status: ProOrderStatus;

    if (row.status === 'cancelled') {
      status = 'cancelled';
    } else if (row.status === 'completed') {
      status = 'paid';
    } else if (row.failed_reason) {
      status = 'failed';
    } else {
      const isExpired = row.expires_at
        ? new Date(row.expires_at).getTime() <= Date.now()
        : Date.now() - new Date(row.created_at).getTime() > 30 * 60 * 1000;
      status = isExpired ? 'expired' : 'pending';
    }

    return {
      orderId: row.id,
      plan: normalizeProPlan(row.plan),
      amount: Number(row.amount),
      currency: row.currency || 'VND',
      transferCode: row.transfer_code,
      status,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      expiresAt: row.expires_at ? (row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at)) : null,
      completedAt: row.completed_at ? (row.completed_at instanceof Date ? row.completed_at.toISOString() : String(row.completed_at)) : null,
      failureReason: row.failed_reason || null
    };
  }

  private async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async handlePaymentWebhook(input: {
    rawBody: Buffer;
    signature?: string;
    timestamp?: string;
    payload: Record<string, unknown>;
  }): Promise<PaymentWebhookResult> {
    const verification = verifyPaymentSignature({
      secret: process.env.PAYMENT_WEBHOOK_SECRET,
      signature: input.signature,
      timestamp: input.timestamp,
      rawBody: input.rawBody
    });

    if (!verification.ok) {
      if (verification.reason === 'secret_not_configured' || verification.reason === 'secret_too_short') {
        fail(503, 'Webhook thanh toán chưa được cấu hình trên máy chủ.', 'payment_webhook_not_configured');
      }
      if (verification.reason === 'stale_timestamp') {
        fail(400, 'Dấu thời gian của webhook đã quá cũ.', 'stale_webhook');
      }
      fail(401, 'Chữ ký webhook thanh toán không hợp lệ.', 'invalid_webhook_signature');
    }

    const transferCode = readTransferCode(input.payload);
    if (!transferCode) {
      fail(404, 'Không tìm thấy đơn hàng cho giao dịch này.', 'order_not_found');
    }
    const paidAmount = readWebhookAmount(input.payload.amount);

    const tx = await this.transaction(async client => {
      const orderRes = await client.query<{
        id: string;
        user_id: string;
        plan: string;
        amount: number;
        status: string;
      }>(
        'SELECT id, user_id, plan, amount, status FROM payment_orders WHERE transfer_code = $1 FOR UPDATE',
        [transferCode]
      );

      if (!orderRes.rowCount) {
        return { kind: 'not_found' as const };
      }

      const order = orderRes.rows[0];
      if (order.status === 'cancelled') {
        return { kind: 'cancelled' as const };
      }

      if (!Number.isFinite(paidAmount) || paidAmount < Number(order.amount)) {
        await client.query(
          'UPDATE payment_orders SET failed_reason = $1 WHERE id = $2',
          ['amount_mismatch', order.id]
        );
        return { kind: 'amount_mismatch' as const, paidAmount, expectedAmount: Number(order.amount) };
      }

      const plan = normalizeProPlan(order.plan);

      if (order.status !== 'pending' && order.status !== 'failed') {
        return {
          kind: 'replayed' as const,
          orderId: order.id,
          plan
        };
      }

      await client.query(
        'UPDATE payment_orders SET status = $1, failed_reason = NULL, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', order.id]
      );

      await client.query(
        `INSERT INTO user_memberships (user_id, tier, pro_expires_at, updated_at)
         VALUES ($1, 'pro', CURRENT_TIMESTAMP + ($2 || ' days')::interval, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           tier = 'pro',
           pro_expires_at = GREATEST(CURRENT_TIMESTAMP, COALESCE(user_memberships.pro_expires_at, CURRENT_TIMESTAMP)) + ($2 || ' days')::interval,
           updated_at = CURRENT_TIMESTAMP`,
        [order.user_id, String(PLAN_DURATION_DAYS[plan])]
      );

      return {
        kind: 'completed' as const,
        orderId: order.id,
        plan
      };
    });

    if (tx.kind === 'not_found') {
      fail(404, 'Không tìm thấy đơn hàng cho giao dịch này.', 'order_not_found');
    }
    if (tx.kind === 'cancelled') {
      fail(409, 'Đơn hàng này đã bị hủy nên không thể kích hoạt gói Pro.', 'order_cancelled');
    }
    if (tx.kind === 'amount_mismatch') {
      fail(400, `Số tiền thanh toán (${tx.paidAmount} VND) chưa đủ cho gói (${tx.expectedAmount} VND).`, 'amount_mismatch');
    }
    if (tx.kind === 'replayed') {
      return {
        success: true,
        replayed: true,
        orderId: tx.orderId,
        plan: tx.plan
      };
    }
    return {
      success: true,
      replayed: false,
      orderId: tx.orderId,
      plan: tx.plan
    };
  }

  async generateInterviewPrep(
    input: InterviewPrepRequestDTO,
    profile: CandidateProfile | null
  ): Promise<InterviewPrepResultDTO> {
    const candidateSkills = profile?.skills || [];
    const mergedSkills = [...new Set([...candidateSkills, ...(input.skills || [])])];

    return generateInterviewQuestions({
      company: input.company,
      position: input.position,
      notes: input.notes,
      roundTitle: input.roundTitle,
      skills: mergedSkills,
      domainTrack: input.domainTrack
    });
  }

  async evaluateInterviewAnswer(
    input: InterviewEvaluateRequestDTO
  ): Promise<InterviewEvaluateResultDTO> {
    return evaluateStarAnswer(input);
  }

  async evaluateOffer(
    userId: string,
    input: OfferEvaluationInput
  ): Promise<OfferEvaluationDTO> {
    const comp = calculateAnnualTotalCompensation({
      baseSalaryMonthly: input.compensation.baseSalaryMonthly,
      currency: input.compensation.currency || 'VND',
      bonusMonthsPerYear: input.compensation.bonusMonthsPerYear,
      annualBonusCash: input.compensation.annualBonusCash,
      stockOptionsOrEquityAnnual: input.compensation.stockOptionsOrEquityAnnual,
      allowanceMonthly: input.compensation.allowanceMonthly
    });

    return evaluateOfferDetails({
      applicationId: input.applicationId,
      company: input.company,
      position: input.position,
      compensation: comp,
      workplaceFactors: input.workplaceFactors,
      weights: input.weights
    });
  }

  async compareOfferList(
    userId: string,
    input: OfferComparisonInput
  ): Promise<OfferComparisonMatrixDTO> {
    const evaluated: OfferEvaluationDTO[] = [];
    for (const item of input.offers) {
      evaluated.push(await this.evaluateOffer(userId, item));
    }
    return compareOffers(evaluated);
  }

  async generateCounterOffer(
    userId: string,
    input: CounterOfferNegotiationInput
  ): Promise<CounterOfferScriptDTO> {
    return generateCounterOfferScript(input);
  }
}
