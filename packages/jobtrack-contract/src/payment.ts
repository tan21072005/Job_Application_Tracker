export type ProPlan = 'monthly' | 'quarterly' | 'yearly';

export type ProOrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled';

export const PRO_ORDER_STATUSES = [
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled'
] as const satisfies readonly ProOrderStatus[];

export interface ProOrderDTO {
  orderId: string;
  plan: ProPlan;
  amount: number;
  currency: string;
  transferCode: string;
  status: ProOrderStatus;
  createdAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface ProPlanDTO {
  plan: ProPlan;
  name?: string;
  amount: number;
  currency: string;
  durationDays: number;
  highlightBadge?: string;
  savingsPercent?: number;
  features?: string[];
}

export interface ProStatusDTO {
  tier: 'free' | 'pro' | 'elite';
  isPro: boolean;
  expiresAt: string | null;
  plan?: ProPlan;
  quota?: {
    used: number;
    max: number;
  };
}

export interface CheckoutResultDTO {
  orderId: string;
  plan: ProPlan;
  amount: number;
  currency: string;
  transferCode: string;
  mode: 'test';
  testNotice: string;
  bankName: string | null;
  accountNo: string | null;
  accountName: string | null;
  vietQrUrl: string | null;
  instructions: string;
  expiresAt?: string;
}

export interface CheckoutInputDTO {
  plan: ProPlan;
}

export interface SimulateWebhookInputDTO {
  orderId: string;
}

export function isProOrderStatus(value: unknown): value is ProOrderStatus {
  return typeof value === 'string' && PRO_ORDER_STATUSES.includes(value as ProOrderStatus);
}
