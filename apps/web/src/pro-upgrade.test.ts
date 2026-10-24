import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { proRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Pro Membership & Checkout Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getStatus returns free tier by default', async () => {
    const status = await proRepository.getStatus();
    expect(status.tier).toBe('free');
    expect(status.isPro).toBe(false);
    expect(status.expiresAt).toBeNull();
  });

  it('getPlans returns 3 server-owned plans with rich metadata', async () => {
    const plans = await proRepository.getPlans();
    expect(plans.length).toBe(3);
    const monthly = plans.find(p => p.plan === 'monthly');
    expect(monthly).toBeDefined();
    expect(monthly?.amount).toBe(99000);
    expect(monthly?.features?.length).toBeGreaterThan(0);

    const quarterly = plans.find(p => p.plan === 'quarterly');
    expect(quarterly?.amount).toBe(249000);
    expect(quarterly?.highlightBadge).toBe('Phổ biến nhất');
    expect(quarterly?.savingsPercent).toBe(16);

    const yearly = plans.find(p => p.plan === 'yearly');
    expect(yearly?.amount).toBe(799000);
    expect(yearly?.savingsPercent).toBe(33);
  });

  it('createCheckout creates pending order with unique transfer code', async () => {
    const checkout = await proRepository.createCheckout('quarterly');
    expect(checkout.orderId).toBeTruthy();
    expect(checkout.plan).toBe('quarterly');
    expect(checkout.amount).toBe(249000);
    expect(checkout.transferCode).toMatch(/^JTPRO[A-Z0-9]{6}$/);
    expect(checkout.mode).toBe('test');
    expect(checkout.testNotice).toBeTruthy();

    const order = await proRepository.getOrder(checkout.orderId);
    expect(order.orderId).toBe(checkout.orderId);
    expect(order.status).toBe('pending');
    expect(order.amount).toBe(249000);
  });

  it('simulatePaid updates order to paid, promotes user to Pro, and behaves idempotently', async () => {
    const checkout = await proRepository.createCheckout('yearly');
    const simResult = await proRepository.simulatePaid(checkout.orderId);
    expect(simResult.success).toBe(true);
    expect(simResult.plan).toBe('yearly');

    const updatedOrder = await proRepository.getOrder(checkout.orderId);
    expect(updatedOrder.status).toBe('paid');
    expect(updatedOrder.completedAt).toBeTruthy();

    const proStatus = await proRepository.getStatus();
    expect(proStatus.isPro).toBe(true);
    expect(proStatus.tier).toBe('pro');
    expect(proStatus.expiresAt).toBeTruthy();

    const replayResult = await proRepository.simulatePaid(checkout.orderId);
    expect(replayResult.success).toBe(true);
    expect(replayResult.replayed).toBe(true);
  });
});