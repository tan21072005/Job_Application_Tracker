import { canonicalIntentHash } from './hasher.ts';

export interface PortfolioDisplaySettings {
  showInterviews: boolean;
  showSalaryExpectation: boolean;
  showRoadmapProgress: boolean;
  showTopSkills: boolean;
  showSimulationScore: boolean;
  anonymizeCandidateName: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: PortfolioDisplaySettings = {
  showInterviews: true,
  showSalaryExpectation: true,
  showRoadmapProgress: true,
  showTopSkills: true,
  showSimulationScore: true,
  anonymizeCandidateName: false
};

export interface PortfolioConfigDTO {
  id: string;
  userId?: string;
  slug: string;
  title: string;
  bio: string;
  location?: string | null;
  salaryExpectation?: string | null;
  targetRoles: string[];
  displaySettings: PortfolioDisplaySettings;
  isPublic: boolean;
  shareToken?: string | null;
  tokenExpiresAt?: string | null;
  accessCount?: number;
  lastAccessedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DossierSkillItemDTO {
  name: string;
  category: string;
  verified: boolean;
}

export interface DossierRoadmapProgressDTO {
  targetRole: string;
  progressPercent: number;
  completedMilestones: number;
  totalMilestones: number;
}

export interface DossierSimulationReadinessDTO {
  grade: 'Ready' | 'Strong Contender' | 'Needs Practice' | 'High Risk';
  score: number;
  track: string;
}

export interface PublicDossierViewDTO {
  candidateName: string;
  slug: string;
  title: string;
  bio: string;
  location?: string | null;
  targetRoles: string[];
  topSkills: DossierSkillItemDTO[];
  roadmapProgress?: DossierRoadmapProgressDTO | null;
  simulationReadiness?: DossierSimulationReadinessDTO | null;
  activeInterviewsCount?: number | null;
  salaryExpectation?: string | null;
  verificationFingerprint: string;
  verifiedAt: string;
  isVerified: boolean;
}

export interface ShareTokenDTO {
  token: string;
  publicUrl: string;
  accessCount: number;
  lastAccessedAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
}

export interface UpdatePortfolioInputDTO {
  slug?: string;
  title?: string;
  bio?: string;
  location?: string | null;
  salaryExpectation?: string | null;
  targetRoles?: string[];
  displaySettings?: Partial<PortfolioDisplaySettings>;
  isPublic?: boolean;
}

export interface GenerateTokenInputDTO {
  expiryDays?: number;
}

export function generateVerificationFingerprint(payload: {
  slug: string;
  targetRoles: string[];
  topSkills: string[];
  verifiedAt: string;
}): string {
  const bytes = canonicalIntentHash('portfolio:verify', payload);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function synthesizePublicDossier(
  config: PortfolioConfigDTO,
  candidateName: string,
  skills: DossierSkillItemDTO[],
  roadmap: DossierRoadmapProgressDTO | null,
  simulation: DossierSimulationReadinessDTO | null,
  interviewsCount: number,
  nowIso: string = new Date().toISOString()
): PublicDossierViewDTO {
  const settings = config.displaySettings || DEFAULT_DISPLAY_SETTINGS;

  let displayName = candidateName.trim();
  if (settings.anonymizeCandidateName) {
    const firstInitial = displayName ? displayName.slice(0, 1) : 'K';
    const mainRole = config.targetRoles[0] || 'Kỹ sư chuyên nghiệp';
    displayName = `Kỹ sư ${firstInitial}*** (${mainRole})`;
  }

  const topSkills = settings.showTopSkills ? skills : [];
  const roadmapProgress = settings.showRoadmapProgress ? roadmap : null;
  const simulationReadiness = settings.showSimulationScore ? simulation : null;
  const activeInterviewsCount = settings.showInterviews ? interviewsCount : null;
  const salaryExpectation = settings.showSalaryExpectation ? (config.salaryExpectation || null) : null;

  const fingerprint = generateVerificationFingerprint({
    slug: config.slug,
    targetRoles: config.targetRoles,
    topSkills: topSkills.map(s => s.name),
    verifiedAt: nowIso
  });

  return {
    candidateName: displayName,
    slug: config.slug,
    title: config.title,
    bio: config.bio,
    location: config.location || null,
    targetRoles: config.targetRoles,
    topSkills,
    roadmapProgress,
    simulationReadiness,
    activeInterviewsCount,
    salaryExpectation,
    verificationFingerprint: fingerprint,
    verifiedAt: nowIso,
    isVerified: true
  };
}

export function verifyDossierIntegrity(dossier: PublicDossierViewDTO): boolean {
  if (!dossier || !dossier.verificationFingerprint) return false;
  const expected = generateVerificationFingerprint({
    slug: dossier.slug,
    targetRoles: dossier.targetRoles,
    topSkills: dossier.topSkills.map(s => s.name),
    verifiedAt: dossier.verifiedAt
  });
  return expected === dossier.verificationFingerprint;
}

export function validatePortfolioConfigInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Dữ liệu cấu hình hồ sơ không hợp lệ.'] };
  }

  const p = input as Record<string, unknown>;

  if (p.title !== undefined) {
    if (typeof p.title !== 'string' || !p.title.trim()) {
      errors.push('Tiêu đề hồ sơ không được để trống.');
    } else if (p.title.length > 255) {
      errors.push('Tiêu đề hồ sơ không được vượt quá 255 ký tự.');
    }
  }

  if (p.slug !== undefined) {
    if (typeof p.slug !== 'string' || !p.slug.trim()) {
      errors.push('Định danh liên kết (slug) không được để trống.');
    } else if (!/^[a-z0-9-]+$/.test(p.slug)) {
      errors.push('Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang.');
    } else if (p.slug.length < 3 || p.slug.length > 100) {
      errors.push('Slug phải có độ dài từ 3 đến 100 ký tự.');
    }
  }

  if (p.targetRoles !== undefined) {
    if (!Array.isArray(p.targetRoles) || p.targetRoles.length === 0) {
      errors.push('Phải chọn ít nhất một vị trí mục tiêu.');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateGenerateTokenInput(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (input && typeof input === 'object') {
    const p = input as Record<string, unknown>;
    if (p.expiryDays !== undefined) {
      if (typeof p.expiryDays !== 'number' || p.expiryDays < 1 || p.expiryDays > 365) {
        errors.push('Thời hạn chia sẻ phải từ 1 đến 365 ngày.');
      }
    }
  }
  return { valid: errors.length === 0, errors };
}
