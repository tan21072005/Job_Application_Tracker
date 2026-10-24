import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateOutreachSequence,
  personalizeMessage,
  computeCampaignMetrics,
  type OutreachRecipientDTO
} from './domain';
import { outreachRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Outreach Campaign Sequencer', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithms', () => {
    it('generates 3 calibrated sequence steps with correct cadence for referral request', () => {
      const steps = generateOutreachSequence('referral_request', 'engineer', 'Staff Engineer', 'VNG Corporation');
      expect(steps).toHaveLength(3);
      expect(steps[0].delayDays).toBe(0);
      expect(steps[1].delayDays).toBe(3);
      expect(steps[2].delayDays).toBe(6);
      expect(steps[2].subjectTemplate).toContain('Referral');
    });

    it('interpolates parameters accurately into subject and body templates', () => {
      const template = 'Chào {{name}}, em đang nhắm vị trí {{role}} tại {{company}}. Em có kinh nghiệm về {{my_strength}}.';
      const output = personalizeMessage(template, {
        name: 'Minh',
        role: 'Tech Lead',
        company: 'Momo',
        my_strength: 'High-throughput payment gateway'
      });

      expect(output).toBe('Chào Minh, em đang nhắm vị trí Tech Lead tại Momo. Em có kinh nghiệm về High-throughput payment gateway.');
    });

    it('computes accurate campaign metrics and conversion percentages', () => {
      const sampleRecipients: OutreachRecipientDTO[] = [
        {
          id: '1',
          campaignId: 'c1',
          contactId: null,
          name: 'Contact 1',
          title: 'Senior Dev',
          company: 'Shopee',
          channel: 'linkedin',
          email: null,
          linkedinUrl: null,
          currentStepIndex: 2,
          status: 'sent',
          lastContactedAt: '2026-10-21T00:00:00Z',
          notes: '',
          createdAt: '2026-10-20T00:00:00Z',
          updatedAt: '2026-10-21T00:00:00Z'
        },
        {
          id: '2',
          campaignId: 'c1',
          contactId: null,
          name: 'Contact 2',
          title: 'EM',
          company: 'Shopee',
          channel: 'linkedin',
          email: null,
          linkedinUrl: null,
          currentStepIndex: 3,
          status: 'referred',
          lastContactedAt: '2026-10-22T00:00:00Z',
          notes: '',
          createdAt: '2026-10-20T00:00:00Z',
          updatedAt: '2026-10-22T00:00:00Z'
        }
      ];

      const metrics = computeCampaignMetrics(sampleRecipients);
      expect(metrics.totalRecipients).toBe(2);
      expect(metrics.totalSent).toBe(2);
      expect(metrics.totalReplied).toBe(1);
      expect(metrics.totalReferred).toBe(1);
      expect(metrics.replyRate).toBe(50);
      expect(metrics.referralRate).toBe(50);
    });
  });

  describe('Outreach Repository (Demo Mode)', () => {
    it('initializes default demo campaign with pre-populated contacts', async () => {
      const list = await outreachRepository.listCampaigns();
      expect(list.length).toBeGreaterThanOrEqual(1);
      const first = list[0];
      expect(first.name).toContain('Shopee');
      expect(first.steps).toHaveLength(3);
      expect(first.recipients.length).toBeGreaterThanOrEqual(2);
    });

    it('creates a new campaign and persists it to local storage', async () => {
      const created = await outreachRepository.createCampaign({
        name: 'Chiến dịch Tiki Q4',
        objective: 'coffee_chat',
        targetType: 'alumni',
        targetCompany: 'Tiki',
        targetRole: 'Data Platform Engineer'
      });

      expect(created.name).toBe('Chiến dịch Tiki Q4');
      expect(created.steps).toHaveLength(3);

      const all = await outreachRepository.listCampaigns();
      expect(all.some(c => c.id === created.id)).toBe(true);
    });

    it('adds a recipient to an existing campaign', async () => {
      const list = await outreachRepository.listCampaigns();
      const campaign = list[0];

      const recipient = await outreachRepository.addRecipient(campaign.id, {
        name: 'Lê Hoàng Nam',
        title: 'Lead Architect',
        company: 'Shopee',
        channel: 'linkedin',
        email: 'nam.le@shopee.vn'
      });

      expect(recipient.name).toBe('Lê Hoàng Nam');
      expect(recipient.status).toBe('pending');
      expect(recipient.currentStepIndex).toBe(1);

      const updated = await outreachRepository.getCampaign(campaign.id);
      expect(updated?.recipients.some(r => r.id === recipient.id)).toBe(true);
    });

    it('updates recipient step and changes status to referred', async () => {
      const list = await outreachRepository.listCampaigns();
      const campaign = list[0];
      const recipient = campaign.recipients[0];

      const updated = await outreachRepository.updateRecipientStep(recipient.id, {
        currentStepIndex: 3,
        status: 'referred',
        notes: 'Đã nhận link referral qua email'
      });

      expect(updated.status).toBe('referred');
      expect(updated.currentStepIndex).toBe(3);
      expect(updated.lastContactedAt).toBeTruthy();
    });

    it('deletes a campaign successfully', async () => {
      const created = await outreachRepository.createCampaign({
        name: 'Campaign to Delete',
        objective: 'recruiter_intro',
        targetType: 'recruiter',
        targetCompany: 'Test Co',
        targetRole: 'Dev'
      });

      const beforeDelete = await outreachRepository.listCampaigns();
      expect(beforeDelete.some(c => c.id === created.id)).toBe(true);

      const result = await outreachRepository.deleteCampaign(created.id);
      expect(result).toBe(true);

      const afterDelete = await outreachRepository.listCampaigns();
      expect(afterDelete.some(c => c.id === created.id)).toBe(false);
    });
  });
});
