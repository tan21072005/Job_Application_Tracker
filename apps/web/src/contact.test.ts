import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { contactRepository } from './data';
import { ApiError } from './transport';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Contact & Networking CRM Repository (demoMode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists initial contacts with calculated relationship health status', async () => {
    const list = await contactRepository.list();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list[0]).toHaveProperty('health');
    expect(list[0].health).toHaveProperty('daysSinceLastContact');
    expect(list[0].health).toHaveProperty('recommendedReconnectDays');
    expect(['healthy', 'due', 'dormant']).toContain(list[0].health.healthStatus);
  });

  it('filters contacts by search query across name, company, and role', async () => {
    const shopeeList = await contactRepository.list({ query: 'Shopee' });
    expect(shopeeList.length).toBeGreaterThanOrEqual(1);
    expect(shopeeList.every(c => c.company.includes('Shopee') || c.name.includes('Shopee'))).toBe(true);

    const recruiterList = await contactRepository.list({ type: 'recruiter' });
    expect(recruiterList.length).toBeGreaterThanOrEqual(1);
    expect(recruiterList.every(c => c.type === 'recruiter')).toBe(true);
  });

  it('retrieves single contact with interaction history and health evaluation', async () => {
    const contact = await contactRepository.get('cnt-demo-1');
    expect(contact).toBeDefined();
    expect(contact.contact.id).toBe('cnt-demo-1');
    expect(contact.contact.name).toBe('Nguyễn Hoàng Nam');
    expect(contact.interactions.length).toBeGreaterThanOrEqual(1);
    expect(contact.health.healthStatus).toBe('healthy');
  });

  it('throws 404 ApiError when retrieving non-existent contact', async () => {
    await expect(contactRepository.get('cnt-non-existent')).rejects.toThrow(ApiError);
  });

  it('creates new contact, prepends to list, and evaluates health', async () => {
    const created = await contactRepository.create({
      name: 'Võ Thị Thu Hà',
      company: 'MoMo (M-Service)',
      role: 'Head of People',
      type: 'recruiter',
      relationshipStrength: 'in_touch',
      email: 'ha.vo@momo.example.com',
      notes: 'Gặp tại hội thảo FinTech Vietnam 2026'
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe('Võ Thị Thu Hà');
    expect(created.company).toBe('MoMo (M-Service)');

    const fetched = await contactRepository.get(created.id);
    expect(fetched.contact.name).toBe('Võ Thị Thu Hà');
    expect(fetched.health.healthStatus).toBe('healthy');
  });

  it('rejects invalid contact input with 422 ApiError', async () => {
    await expect(
      contactRepository.create({
        name: '',
        company: ''
      })
    ).rejects.toThrow(ApiError);
  });

  it('updates contact information and recalculates fields', async () => {
    const updated = await contactRepository.update('cnt-demo-3', {
      role: 'Chief Technology Officer (CTO)',
      relationshipStrength: 'advocate'
    });

    expect(updated.id).toBe('cnt-demo-3');
    expect(updated.role).toBe('Chief Technology Officer (CTO)');
    expect(updated.relationshipStrength).toBe('advocate');

    const fetched = await contactRepository.get('cnt-demo-3');
    expect(fetched.contact.role).toBe('Chief Technology Officer (CTO)');
    expect(fetched.contact.relationshipStrength).toBe('advocate');
  });

  it('adds interaction, prepends to timeline, and updates contact lastContactedAt', async () => {
    const newInteraction = await contactRepository.addInteraction('cnt-demo-1', {
      channel: 'coffee',
      summary: 'Gặp gỡ trực tiếp tại quán The Coffee House',
      details: 'Nam chia sẻ chi tiết về dự án thanh toán quốc tế và văn hóa engineering.',
      date: new Date().toISOString()
    });

    expect(newInteraction.id).toBeDefined();
    expect(newInteraction.channel).toBe('coffee');
    expect(newInteraction.summary).toContain('The Coffee House');

    const fetched = await contactRepository.get('cnt-demo-1');
    expect(fetched.interactions[0].id).toBe(newInteraction.id);
    expect(fetched.contact.lastContactedAt).toBe(newInteraction.date);
  });

  it('identifies contacts requiring reconnection or in dormant state', async () => {
    const dueList = await contactRepository.getReconnectDue();
    expect(dueList.length).toBeGreaterThanOrEqual(1);
    expect(dueList.some(c => c.health.isReconnectDue || c.health.isDormant)).toBe(true);
    expect(dueList.some(c => c.id === 'cnt-demo-2' || c.id === 'cnt-demo-4')).toBe(true);
  });

  it('deletes contact and cascades interaction cleanup', async () => {
    await contactRepository.delete('cnt-demo-4');
    const list = await contactRepository.list();
    expect(list.some(c => c.id === 'cnt-demo-4')).toBe(false);
    await expect(contactRepository.get('cnt-demo-4')).rejects.toThrow(ApiError);
  });
});
