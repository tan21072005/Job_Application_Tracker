import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseEmailContent,
  generateIngestionProposal,
  type EmailIngestProposalDTO
} from './domain';
import { emailIngestRepository, repository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Smart Email Ingestion', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure NLP Extraction Algorithms', () => {
    it('extracts company, position, meeting link, and datetime from Vietnamese email', () => {
      const email = `Chào bạn,
Phòng Tuyển dụng Shopee trân trọng mời bạn tham gia vòng phỏng vấn vị trí Backend Developer.
Thời gian: 14:00 ngày 28/11/2026.
Phòng họp trực tuyến Google Meet: https://meet.google.com/abc-defg-hij
Trân trọng,
Nguyễn Mai Phương
Email: phuong@shopee.vn
SĐT: 0987654321`;

      const extracted = parseEmailContent(email, 'Thư mời phỏng vấn Shopee', 'hr@shopee.vn');

      expect(extracted.category).toBe('interview_invitation');
      expect(extracted.company).toBe('Shopee');
      expect(extracted.position).toBe('Backend Developer');
      expect(extracted.targetStatus).toBe('Interview');
      expect(extracted.interviewSchedule?.format).toBe('Google Meet');
      expect(extracted.interviewSchedule?.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');
      expect(extracted.recruiter?.name).toBe('Nguyễn Mai Phương');
      expect(extracted.recruiter?.email).toBe('phuong@shopee.vn');
      expect(extracted.recruiter?.phone).toBe('0987654321');
    });

    it('proposes create_application when pipeline does not have matching company', () => {
      const extracted = parseEmailContent('Cảm ơn bạn đã nộp hồ sơ tại VinGroup vị trí AI Engineer');
      const existingApps = [
        { id: '1', company: 'FPT Software', position: 'Developer', status: 'Applied' }
      ];

      const proposal = generateIngestionProposal(extracted, existingApps);
      expect(proposal.actionType).toBe('create_application');
      expect(proposal.matchedApplicationId).toBeNull();
      expect(proposal.proposedApplication?.company).toBe('VinGroup');
      expect(proposal.proposedApplication?.position).toBe('AI Engineer');
    });

    it('proposes schedule_interview when pipeline already has matching company', () => {
      const extracted = parseEmailContent('Thư mời phỏng vấn tại FPT Software ngày 14:00 ngày 25/12/2026 qua https://meet.google.com/xyz-123');
      const existingApps = [
        { id: 'fpt-app-1', company: 'FPT Software', position: 'Senior React Developer', status: 'Applied' }
      ];

      const proposal = generateIngestionProposal(extracted, existingApps);
      expect(proposal.actionType).toBe('schedule_interview');
      expect(proposal.matchedApplicationId).toBe('fpt-app-1');
      expect(proposal.proposedApplication?.status).toBe('Interview');
      expect(proposal.proposedInterview).toBeDefined();
      expect(proposal.proposedInterview?.format).toBe('Google Meet');
    });
  });

  describe('Web Repository Integration (Demo Mode)', () => {
    it('parseEmail generates proposal from demo fixture pipeline', async () => {
      const email = `Chào bạn,
Chúng tôi gửi lời mời phỏng vấn vị trí Senior Fullstack Engineer tại VNG Corporation.
Thời gian: 10:00 ngày 20/12/2026.
Phòng họp trực tuyến Zoom: https://zoom.us/j/123456789`;

      const proposal = await emailIngestRepository.parseEmail(email, 'Mời phỏng vấn VNG');
      expect(proposal).toBeDefined();
      expect(proposal.proposedApplication?.company).toBe('VNG');
      expect(proposal.confidenceScore).toBeGreaterThanOrEqual(80);
    });

    it('applyProposal creates a new application in demoMode', async () => {
      const proposal: EmailIngestProposalDTO = {
        actionType: 'create_application',
        confidenceScore: 90,
        matchedApplicationId: null,
        matchedCompany: null,
        matchedPosition: null,
        summary: 'Tạo mới hồ sơ Momo',
        proposedApplication: {
          company: 'MoMo',
          position: 'Mobile Developer',
          status: 'Applied',
          notes: 'Nộp qua referral'
        },
        proposedInterview: {
          title: 'Vòng 1 - HR Screening',
          at: '2026-11-20T10:00:00.000Z',
          timezone: 'Asia/Ho_Chi_Minh',
          format: 'Online',
          location: 'https://meet.google.com/momo-meet'
        },
        changesSummary: ['Tạo mới hồ sơ tại MoMo']
      };

      const result = await emailIngestRepository.applyProposal(proposal);
      expect(result.success).toBe(true);
      expect(result.actionTaken).toBe('create_application');
      expect(result.applicationId).toBeDefined();

      const apps = await repository.list();
      const created = apps.find(a => a.id === result.applicationId);
      expect(created).toBeDefined();
      expect(created?.company).toBe('MoMo');
      expect(created?.interviews.length).toBe(1);
    });

    it('applyProposal updates status and schedules interview for existing application', async () => {
      const apps = await repository.list();
      const target = apps[0];
      expect(target).toBeDefined();

      const proposal: EmailIngestProposalDTO = {
        actionType: 'schedule_interview',
        confidenceScore: 95,
        matchedApplicationId: target.id,
        matchedCompany: target.company,
        matchedPosition: target.position,
        summary: `Lên lịch phỏng vấn ${target.company}`,
        proposedApplication: {
          company: target.company,
          position: target.position,
          status: 'Interview'
        },
        proposedInterview: {
          title: 'Vòng 2 - Technical Deep Dive',
          at: '2026-11-25T14:30:00.000Z',
          timezone: 'Asia/Ho_Chi_Minh',
          format: 'Online',
          location: 'https://meet.google.com/tech-v2'
        },
        changesSummary: ['Cập nhật trạng thái sang Interview']
      };

      const result = await emailIngestRepository.applyProposal(proposal);
      expect(result.success).toBe(true);
      expect(result.applicationId).toBe(target.id);

      const reloadedApps = await repository.list();
      const updated = reloadedApps.find(a => a.id === target.id);
      expect(updated?.status).toBe('Interview');
      expect(updated?.interviews.some(i => i.title.includes('Technical Deep Dive'))).toBe(true);
    });
  });
});
