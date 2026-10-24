import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  parseInboundRecruiterPitch,
  generateRecruiterReplyDraft,
  computeRecruiterRelationshipHealth,
  detectMandateConflict,
  validateParsePitchInput,
  validateRecruiterLeadInput,
  validateMandateInput,
  validateRecruiterReplyDraftInput,
  KNOWN_HEADHUNTER_AGENCIES
} from './domain';
import { headhunterCrmRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Executive Headhunter CRM & Recruiter Lead Ingestion (Web UI)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Inbound Pitch Parser & Reply Engine', () => {
    it('parses structured details from Vietnamese recruiter pitch', () => {
      const pitchText = `
        Chào bạn, tôi là Mai Hoàng từ Robert Walters Vietnam.
        Hiện tại tôi đang phụ trách độc quyền (retained mandate) vị trí Vice President of Engineering cho một khách hàng bảo mật thuộc nhóm fintech unicorn tại TP. Hồ Chí Minh.
        Dải ngân sách dự kiến là $5,000 - $7,000 USD gross / month.
        Yêu cầu ứng viên có thế mạnh về Golang, Kubernetes, Microservices và năng lực lãnh đạo đội ngũ trên 30 kỹ sư.
        Bạn vui lòng xem xét và phản hồi nhé!
      `;

      const result = parseInboundRecruiterPitch(pitchText, 'linkedin_inmail');
      expect(result.recruiterName).toBe('Mai Hoàng');
      expect(result.agencyName).toBe('Robert Walters');
      expect(result.agencyTier).toBe('tier1_global');
      expect(result.targetRole).toBe('Vice President of Engineering');
      expect(result.isConfidentialCompany).toBe(true);
      expect(result.currency).toBe('USD');
      expect(result.extractedMinComp).toBe(5000);
      expect(result.extractedMaxComp).toBe(7000);
      expect(result.mandateExclusivity).toBe('exclusive_retained');
      expect(result.keyRequirements).toContain('GOLANG');
      expect(result.keyRequirements).toContain('KUBERNETES');
      expect(result.greenFlags.length).toBeGreaterThanOrEqual(1);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    });

    it('generates strategic reply draft for all 4 intents', () => {
      const pitch = parseInboundRecruiterPitch(`
        Chào bạn, mình là Tuấn từ Navigos Search. Bên mình đang tuyển Tech Lead cho đối tác ngân hàng lớn, lương 60 - 80 triệu VND.
      `);

      const replyCriteria = generateRecruiterReplyDraft(pitch, 'explore_with_criteria');
      expect(replyCriteria.intent).toBe('explore_with_criteria');
      expect(replyCriteria.subject).toContain('Tech Lead');
      expect(replyCriteria.suggestedTone).toBe('assertive_executive');

      const replySalary = generateRecruiterReplyDraft(pitch, 'salary_first', {
        minCompGross: 100000000,
        preferredCurrency: 'VND'
      });
      expect(replySalary.intent).toBe('salary_first');
      expect(replySalary.body).toContain('100,000,000 VND');

      const replyPass = generateRecruiterReplyDraft(pitch, 'polite_pass');
      expect(replyPass.intent).toBe('polite_pass');
      expect(replyPass.suggestedTone).toBe('cordial_decline');

      const replyMandate = generateRecruiterReplyDraft(pitch, 'exclusive_mandate_check');
      expect(replyMandate.intent).toBe('exclusive_mandate_check');
      expect(replyMandate.body).toContain('Double-Submission');
    });

    it('computes relationship health accurately', () => {
      const healthy = computeRecruiterRelationshipHealth({
        tier: 'trusted_advisor',
        rating: 5,
        mandatesCount: 2,
        lastContactedAt: new Date(Date.now() - 5 * 86400000).toISOString()
      });
      expect(healthy.healthScore).toBeGreaterThanOrEqual(85);
      expect(healthy.healthStatus).toBe('excellent');

      const dormant = computeRecruiterRelationshipHealth({
        tier: 'situational_contingency',
        rating: 3,
        mandatesCount: 0,
        lastContactedAt: new Date(Date.now() - 150 * 86400000).toISOString()
      });
      expect(dormant.healthScore).toBeLessThan(60);

      const blacklisted = computeRecruiterRelationshipHealth({
        tier: 'blacklisted',
        rating: 1
      });
      expect(blacklisted.healthScore).toBe(0);
      expect(blacklisted.healthStatus).toBe('risk');
    });

    it('detects mandate conflicts and lockouts', () => {
      const mandates = [
        {
          id: 'm-1',
          userId: 'u-1',
          leadId: 'l-1',
          recruiterName: 'Alexandre Nguyen',
          agencyName: 'Michael Page',
          roleTitle: 'Engineering Director',
          clientCompany: 'Techcombank',
          isConfidential: false,
          exclusivity: 'exclusive_retained' as const,
          status: 'submitted' as const,
          pitchedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      const conflict = detectMandateConflict(mandates, 'Techcombank');
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.warningMessage).toContain('Michael Page');
      expect(conflict.conflictingMandate).toBeDefined();

      const clean = detectMandateConflict(mandates, 'VNG Corporation');
      expect(clean.hasConflict).toBe(false);
    });

    it('validates schema inputs', () => {
      expect(validateParsePitchInput({ rawText: 'Pitch text here' }).ok).toBe(true);
      expect(validateParsePitchInput({ rawText: '' }).ok).toBe(false);

      expect(validateRecruiterLeadInput({ name: 'Alex', agency: 'Michael Page', tier: 'preferred_partner' }).ok).toBe(true);
      expect(validateRecruiterLeadInput({ name: '' }).ok).toBe(false);

      expect(validateMandateInput({ leadId: 'lead1', roleTitle: 'CTO', clientCompany: 'Shopee' }).ok).toBe(true);
      expect(validateMandateInput({ leadId: 'lead1' }).ok).toBe(false);

      expect(validateRecruiterReplyDraftInput({ pitch: parseInboundRecruiterPitch('Hello'), intent: 'salary_first' }).ok).toBe(true);
      expect(validateRecruiterReplyDraftInput(null).ok).toBe(false);
    });

    it('exports known agency registry', () => {
      expect(KNOWN_HEADHUNTER_AGENCIES.length).toBeGreaterThanOrEqual(5);
      const names = KNOWN_HEADHUNTER_AGENCIES.map(a => a.name);
      expect(names).toContain('Robert Walters');
      expect(names).toContain('Michael Page');
      expect(names).toContain('Navigos Search');
    });
  });

  describe('headhunterCrmRepository in Demo Mode', () => {
    it('initializes default seeded recruiter leads', async () => {
      const leads = await headhunterCrmRepository.listLeads();
      expect(leads.length).toBeGreaterThanOrEqual(4);
      const names = leads.map(l => l.name);
      expect(names).toContain('Mai Hoàng');
      expect(names).toContain('Alexandre Nguyen');
      expect(names).toContain('Trần Kim Oanh');
      expect(names).toContain('Lê Quốc Tuấn');
    });

    it('creates, retrieves, and deletes a recruiter lead', async () => {
      const created = await headhunterCrmRepository.upsertLead({
        name: 'Võ Minh Trí',
        agency: 'Boutique Search VN',
        agencyTier: 'boutique_executive',
        role: 'Managing Consultant',
        email: 'tri.vo@boutiquesearch.vn',
        phone: '0901234567',
        linkedinUrl: 'https://linkedin.com/in/trivo',
        tier: 'preferred_partner',
        rating: 4,
        notes: 'Chuyên mảng AI và Data Engineering.'
      });

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Võ Minh Trí');

      const leads = await headhunterCrmRepository.listLeads();
      expect(leads.some(l => l.id === created.id)).toBe(true);

      await headhunterCrmRepository.deleteLead(created.id);
      const remaining = await headhunterCrmRepository.listLeads();
      expect(remaining.some(l => l.id === created.id)).toBe(false);
    });

    it('manages mandates and detects conflict in demo mode', async () => {
      const leads = await headhunterCrmRepository.listLeads();
      const firstLead = leads[0];

      const mandate = await headhunterCrmRepository.createMandate({
        leadId: firstLead.id,
        roleTitle: 'Chief Technology Officer',
        clientCompany: 'VietinBank Security',
        isConfidential: false,
        exclusivity: 'exclusive_retained',
        salaryRange: '$8,000 - $12,000 USD'
      });

      expect(mandate.id).toBeDefined();
      expect(mandate.roleTitle).toBe('Chief Technology Officer');

      const mandates = await headhunterCrmRepository.listMandates();
      expect(mandates.some(m => m.id === mandate.id)).toBe(true);

      const conflict = detectMandateConflict(mandates, 'VietinBank Security');
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.conflictingMandate).toBeDefined();

      const clean = detectMandateConflict(mandates, 'Viettel Group');
      expect(clean.hasConflict).toBe(false);
    });

    it('delegates pitch parsing and reply draft generation', async () => {
      const parsed = await headhunterCrmRepository.parsePitch({
        rawText: 'Chào bạn, tôi là Nam từ Monroe Consulting. Đang tìm VP of Engineering cho khách hàng e-commerce.',
        channel: 'email'
      });

      expect(parsed.recruiterName).toBe('Nam');
      expect(parsed.agencyName).toBe('Monroe Consulting Group');
      expect(parsed.targetRole).toBe('VP of Engineering');

      const draft = await headhunterCrmRepository.generateReply({
        pitch: parsed,
        intent: 'exclusive_mandate_check'
      });

      expect(draft.intent).toBe('exclusive_mandate_check');
      expect(draft.body).toContain('Hiring Manager');
    });
  });
});
