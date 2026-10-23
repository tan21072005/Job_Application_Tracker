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
  amount: number;
  currency: string;
  durationDays: number;
}

export function isProOrderStatus(value: unknown): value is ProOrderStatus {
  return typeof value === 'string' && PRO_ORDER_STATUSES.includes(value as ProOrderStatus);
}
