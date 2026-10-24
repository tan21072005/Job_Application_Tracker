import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateVerificationFingerprint,
  synthesizePublicDossier,
  verifyDossierIntegrity,
  type PortfolioConfigDTO,
  DEFAULT_DISPLAY_SETTINGS
} from './domain';
import { portfolioRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Career Search Portfolio & Shareable Verified Dossier', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pure Algorithms', () => {
    it('generates deterministic SHA-256 verification fingerprint and validates integrity', () => {
      const payload = {
        slug: 'nhat-tan-architect',
        targetRoles: ['Lead Architect'],
        topSkills: ['Go', 'Kubernetes'],
        verifiedAt: '2026-10-25T00:00:00.000Z'
      };

      const fp = generateVerificationFingerprint(payload);
      expect(fp).toHaveLength(64);

      const config: PortfolioConfigDTO = {
        id: 'port-1',
        slug: payload.slug,
        title: 'Lead Architect',
        bio: 'Bio text',
        targetRoles: payload.targetRoles,
        displaySettings: DEFAULT_DISPLAY_SETTINGS,
        isPublic: true,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      };

      const dossier = synthesizePublicDossier(
        config,
        'Nhật Tân',
        [{ name: 'Go', category: 'Backend', verified: true }, { name: 'Kubernetes', category: 'DevOps', verified: true }],
        null,
        null,
        2,
        '2026-10-25T00:00:00.000Z'
      );

      expect(dossier.verificationFingerprint).toBe(fp);
      expect(verifyDossierIntegrity(dossier)).toBe(true);

      const tampered = { ...dossier, candidateName: 'Hacker' };
      expect(verifyDossierIntegrity(tampered)).toBe(true);
      const tamperedSkills = { ...dossier, topSkills: [] };
      expect(verifyDossierIntegrity(tamperedSkills)).toBe(false);
    });

    it('honors privacy settings and anonymizes candidate name when configured', () => {
      const config: PortfolioConfigDTO = {
        id: 'port-2',
        slug: 'discreet-dev',
        title: 'Staff Engineer',
        bio: 'Senior developer looking for stealth transition',
        salaryExpectation: '70M - 90M VNĐ',
        targetRoles: ['Staff Backend Engineer'],
        displaySettings: {
          showInterviews: false,
          showSalaryExpectation: false,
          showRoadmapProgress: false,
          showTopSkills: true,
          showSimulationScore: false,
          anonymizeCandidateName: true
        },
        isPublic: true,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      };

      const dossier = synthesizePublicDossier(
        config,
        'Trần Văn Bảo',
        [{ name: 'Distributed Systems', category: 'Architecture', verified: true }],
        { targetRole: 'Staff', progressPercent: 80, completedMilestones: 4, totalMilestones: 5 },
        { grade: 'Ready', score: 90, track: 'system_design' },
        5
      );

      expect(dossier.candidateName).toContain('Kỹ sư T***');
      expect(dossier.salaryExpectation).toBeNull();
      expect(dossier.activeInterviewsCount).toBeNull();
      expect(dossier.roadmapProgress).toBeNull();
      expect(dossier.simulationReadiness).toBeNull();
      expect(dossier.topSkills).toHaveLength(1);
    });
  });

  describe('portfolioRepository in demoMode', () => {
    it('returns default portfolio configuration', async () => {
      const port = await portfolioRepository.getPortfolio();
      expect(port.id).toBeDefined();
      expect(port.title).toContain('Lead Software Architect');
      expect(port.slug).toBe('nhat-tan-lead');
      expect(port.displaySettings.showTopSkills).toBe(true);
    });

    it('updates portfolio configuration and persists to storage', async () => {
      const updated = await portfolioRepository.updatePortfolio({
        title: 'Chief Technology Officer',
        location: 'Đà Nẵng',
        salaryExpectation: '120.000.000 VNĐ'
      });

      expect(updated.title).toBe('Chief Technology Officer');
      expect(updated.location).toBe('Đà Nẵng');

      const reloaded = await portfolioRepository.getPortfolio();
      expect(reloaded.title).toBe('Chief Technology Officer');
    });

    it('generates share token and retrieves public dossier view', async () => {
      const tokenInfo = await portfolioRepository.generateToken(14);
      expect(tokenInfo.token).toBeDefined();
      expect(tokenInfo.publicUrl).toContain(tokenInfo.token);
      expect(tokenInfo.expiresAt).toBeDefined();

      const publicDossier = await portfolioRepository.getPublicDossier(tokenInfo.token);
      expect(publicDossier).not.toBeNull();
      expect(publicDossier?.title).toBeDefined();
      expect(publicDossier?.verificationFingerprint).toHaveLength(64);
      expect(publicDossier?.isVerified).toBe(true);
    });

    it('revokes share token immediately', async () => {
      const tokenInfo = await portfolioRepository.generateToken(7);
      const res = await portfolioRepository.getPublicDossier(tokenInfo.token);
      expect(res).not.toBeNull();

      await portfolioRepository.revokeToken();

      const expiredRes = await portfolioRepository.getPublicDossier(tokenInfo.token);
      expect(expiredRes).toBeNull();
    });
  });
});
