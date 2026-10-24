import type { ValidationResult } from './validators.ts';

export type SkillCategory =
  | 'frontend'
  | 'backend'
  | 'devops'
  | 'architecture'
  | 'testing'
  | 'database'
  | 'general';

export type SkillProficiency = 'required' | 'preferred';
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed';

export interface SkillDemandItemDTO {
  skill: string;
  category: SkillCategory;
  count: number;
  proficiency: SkillProficiency;
  targetCompanies: string[];
  relatedPositions: string[];
}

export interface SkillGapAnalysisDTO {
  coverageScore: number;
  matchedSkills: string[];
  missingSkills: SkillDemandItemDTO[];
  topInDemandSkills: SkillDemandItemDTO[];
  totalApplicationsAnalyzed: number;
  recommendedFocusSkills: string[];
  generatedAt: string;
}

export type ResourceType = 'article' | 'course' | 'project' | 'documentation';

export interface LearningResourceDTO {
  title: string;
  url: string;
  type: ResourceType;
}

export interface LearningMilestoneDTO {
  id: string;
  week: number;
  title: string;
  description: string;
  skill: string;
  category: SkillCategory;
  estimatedHours: number;
  status: MilestoneStatus;
  resources: LearningResourceDTO[];
  completedAt?: string | null;
}

export interface CareerRoadmapDTO {
  id: string;
  userId?: string;
  title: string;
  targetRole: string;
  durationWeeks: number;
  milestones: LearningMilestoneDTO[];
  overallProgressPercent: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillDefinition {
  name: string;
  category: SkillCategory;
  aliases: string[];
  curatedResources: LearningResourceDTO[];
}

export const KNOWN_SKILL_CATALOG: SkillDefinition[] = [
  {
    name: 'TypeScript',
    category: 'frontend',
    aliases: ['typescript', 'ts'],
    curatedResources: [
      { title: 'TypeScript Handbook', url: 'https://www.typescriptlang.org/docs/handbook/intro.html', type: 'documentation' },
      { title: 'Total TypeScript Core Tutorials', url: 'https://www.totaltypescript.com/tutorials', type: 'course' }
    ]
  },
  {
    name: 'React',
    category: 'frontend',
    aliases: ['react', 'reactjs', 'react.js'],
    curatedResources: [
      { title: 'React 19 Official Documentation', url: 'https://react.dev', type: 'documentation' },
      { title: 'Fullstack React Architecture Deep Dive', url: 'https://epicreact.dev', type: 'course' }
    ]
  },
  {
    name: 'Next.js',
    category: 'frontend',
    aliases: ['next.js', 'nextjs', 'next'],
    curatedResources: [
      { title: 'Next.js App Router Learn Path', url: 'https://nextjs.org/learn', type: 'course' },
      { title: 'Server Components & Actions Architecture', url: 'https://nextjs.org/docs', type: 'documentation' }
    ]
  },
  {
    name: 'Node.js',
    category: 'backend',
    aliases: ['node.js', 'nodejs', 'node'],
    curatedResources: [
      { title: 'Node.js Production Best Practices', url: 'https://nodejs.org/en/learn', type: 'documentation' },
      { title: 'High-Performance Node API Design', url: 'https://github.com/goldbergyoni/nodebestpractices', type: 'article' }
    ]
  },
  {
    name: 'PostgreSQL',
    category: 'database',
    aliases: ['postgresql', 'postgres', 'psql'],
    curatedResources: [
      { title: 'PostgreSQL Mastery & Query Optimization', url: 'https://use-the-index-luke.com', type: 'article' },
      { title: 'Official PostgreSQL Manual', url: 'https://www.postgresql.org/docs/', type: 'documentation' }
    ]
  },
  {
    name: 'Docker',
    category: 'devops',
    aliases: ['docker', 'containerization', 'dockerfile'],
    curatedResources: [
      { title: 'Docker Getting Started Guide', url: 'https://docs.docker.com/get-started/', type: 'documentation' },
      { title: 'Production Multi-Stage Container Packaging', url: 'https://docs.docker.com/develop/develop-images/multistage-build/', type: 'article' }
    ]
  },
  {
    name: 'Kubernetes',
    category: 'devops',
    aliases: ['kubernetes', 'k8s'],
    curatedResources: [
      { title: 'Kubernetes Official Fundamentals', url: 'https://kubernetes.io/docs/tutorials/', type: 'documentation' },
      { title: 'Cloud-Native Architecture on K8s', url: 'https://www.cncf.io', type: 'article' }
    ]
  },
  {
    name: 'System Design',
    category: 'architecture',
    aliases: ['system design', 'distributed systems', 'microservices', 'high availability'],
    curatedResources: [
      { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'article' },
      { title: 'Designing Data-Intensive Applications Guide', url: 'https://dataintensive.net', type: 'course' }
    ]
  },
  {
    name: 'GraphQL',
    category: 'backend',
    aliases: ['graphql', 'apollo'],
    curatedResources: [
      { title: 'Introduction to GraphQL', url: 'https://graphql.org/learn/', type: 'documentation' },
      { title: 'Apollo Server & Federation Patterns', url: 'https://www.apollographql.com/docs/', type: 'documentation' }
    ]
  },
  {
    name: 'Redis',
    category: 'database',
    aliases: ['redis', 'caching'],
    curatedResources: [
      { title: 'Redis University Tutorials', url: 'https://redis.io/learn', type: 'course' },
      { title: 'Distributed Rate Limiting & Caching with Redis', url: 'https://redis.io/docs/latest/develop/use/', type: 'article' }
    ]
  },
  {
    name: 'CI/CD',
    category: 'devops',
    aliases: ['ci/cd', 'github actions', 'gitlab ci', 'jenkins'],
    curatedResources: [
      { title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', type: 'documentation' },
      { title: 'Continuous Delivery Pipeline Architecture', url: 'https://martinfowler.com/articles/continuousDelivery.html', type: 'article' }
    ]
  },
  {
    name: 'Testing & QA',
    category: 'testing',
    aliases: ['unit testing', 'playwright', 'vitest', 'jest', 'cypress', 'e2e'],
    curatedResources: [
      { title: 'Playwright End-to-End Automation', url: 'https://playwright.dev/docs/intro', type: 'documentation' },
      { title: 'Testing JavaScript Applications', url: 'https://martinfowler.com/articles/practical-test-pyramid.html', type: 'article' }
    ]
  },
  {
    name: 'Go',
    category: 'backend',
    aliases: ['go', 'golang'],
    curatedResources: [
      { title: 'A Tour of Go', url: 'https://go.dev/tour/', type: 'course' },
      { title: 'Effective Go', url: 'https://go.dev/doc/effective_go', type: 'documentation' }
    ]
  },
  {
    name: 'AWS',
    category: 'devops',
    aliases: ['aws', 'amazon web services', 'cloud'],
    curatedResources: [
      { title: 'AWS Skill Builder Core Fundamentals', url: 'https://explore.skillbuilder.aws', type: 'course' },
      { title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/', type: 'article' }
    ]
  }
];

export function extractSkillsFromText(text: string): SkillDefinition[] {
  if (!text || typeof text !== 'string') return [];
  const normalized = ` ${text.toLowerCase()} `;
  const matched: SkillDefinition[] = [];

  for (const def of KNOWN_SKILL_CATALOG) {
    const isPresent = def.aliases.some(alias => {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,.;:()/\\[\\]-])${escaped}(?:$|[\\s,.;:()/\\[\\]-])`, 'i');
      return regex.test(normalized);
    });
    if (isPresent) {
      matched.push(def);
    }
  }

  return matched;
}

export function extractSkillsFromApplications(
  apps: Array<{ position: string; notes?: string | null; company: string }>,
  candidateSkills: string[] = []
): SkillGapAnalysisDTO {
  const normCandidate = new Set(
    candidateSkills.map(s => s.trim().toLowerCase()).filter(Boolean)
  );

  const demandMap = new Map<string, {
    skillDef: SkillDefinition;
    count: number;
    companies: Set<string>;
    positions: Set<string>;
  }>();

  for (const app of apps) {
    const combinedText = `${app.position} ${app.notes || ''}`;
    const detected = extractSkillsFromText(combinedText);

    for (const d of detected) {
      const existing = demandMap.get(d.name);
      if (existing) {
        existing.count++;
        existing.companies.add(app.company);
        existing.positions.add(app.position);
      } else {
        demandMap.set(d.name, {
          skillDef: d,
          count: 1,
          companies: new Set([app.company]),
          positions: new Set([app.position])
        });
      }
    }
  }

  const allDemands: SkillDemandItemDTO[] = Array.from(demandMap.values())
    .map(entry => ({
      skill: entry.skillDef.name,
      category: entry.skillDef.category,
      count: entry.count,
      proficiency: (entry.count >= 2 ? 'required' : 'preferred') as SkillProficiency,
      targetCompanies: Array.from(entry.companies),
      relatedPositions: Array.from(entry.positions)
    }))
    .sort((a, b) => b.count - a.count);

  const matchedSkills: string[] = [];
  const missingSkills: SkillDemandItemDTO[] = [];

  for (const item of allDemands) {
    const isMatched = normCandidate.has(item.skill.toLowerCase()) ||
      KNOWN_SKILL_CATALOG.find(k => k.name === item.skill)?.aliases.some(a => normCandidate.has(a));

    if (isMatched) {
      matchedSkills.push(item.skill);
    } else {
      missingSkills.push(item);
    }
  }

  for (const cs of candidateSkills) {
    const trimmed = cs.trim();
    if (trimmed && !matchedSkills.some(m => m.toLowerCase() === trimmed.toLowerCase())) {
      matchedSkills.push(trimmed);
    }
  }

  const totalDemandSkills = allDemands.length;
  const matchedDemandCount = allDemands.filter(d =>
    matchedSkills.some(m => m.toLowerCase() === d.skill.toLowerCase())
  ).length;

  const coverageScore = totalDemandSkills > 0
    ? Math.round((matchedDemandCount / totalDemandSkills) * 100)
    : 100;

  const topInDemandSkills = allDemands.slice(0, 5);
  const recommendedFocusSkills = missingSkills
    .slice(0, 4)
    .map(m => m.skill);

  if (recommendedFocusSkills.length === 0 && missingSkills.length === 0) {
    const defaults = ['System Design', 'Kubernetes', 'Docker', 'PostgreSQL'];
    for (const def of defaults) {
      if (!matchedSkills.includes(def) && recommendedFocusSkills.length < 3) {
        recommendedFocusSkills.push(def);
      }
    }
  }

  return {
    coverageScore,
    matchedSkills,
    missingSkills,
    topInDemandSkills,
    totalApplicationsAnalyzed: apps.length,
    recommendedFocusSkills,
    generatedAt: new Date().toISOString()
  };
}

export function generateCareerRoadmap(
  gapAnalysis: SkillGapAnalysisDTO,
  targetRole = 'Senior Software Specialist'
): CareerRoadmapDTO {
  const focusSkills = gapAnalysis.recommendedFocusSkills.length > 0
    ? gapAnalysis.recommendedFocusSkills
    : ['System Design', 'PostgreSQL', 'Docker', 'CI/CD'];

  const milestones: LearningMilestoneDTO[] = [];
  const hoursPerWeek = [8, 10, 10, 8];

  for (let i = 0; i < 4; i++) {
    const weekNumber = i + 1;
    const skillName = focusSkills[i % focusSkills.length] || 'Technical Mastery';
    const catalogItem = KNOWN_SKILL_CATALOG.find(k => k.name.toLowerCase() === skillName.toLowerCase()) || {
      name: skillName,
      category: 'general' as SkillCategory,
      curatedResources: [
        { title: `${skillName} Practical Architecture Guide`, url: 'https://github.com', type: 'article' as const }
      ]
    };

    let title = '';
    let description = '';

    if (weekNumber === 1) {
      title = `Nền tảng & Thực hành cốt lõi ${skillName}`;
      description = `Nắm vững các khái niệm nâng cao của ${skillName}, phân tích bài toán thực tế và xây dựng PoC đầu tiên.`;
    } else if (weekNumber === 2) {
      title = `Thiết kế kiến trúc & Tối ưu hóa ${skillName}`;
      description = `Áp dụng ${skillName} vào kịch bản hệ thống tải cao, đo lường benchmark và xử lý các lỗi thường gặp trong production.`;
    } else if (weekNumber === 3) {
      title = `Tích hợp hệ thống & Dự án Showcase`;
      description = `Đưa ${skillName} vào dự án mẫu hoàn chỉnh, cấu hình kiểm thử tự động và đóng gói tài liệu kỹ thuật.`;
    } else {
      title = `Đóng gói Portfolio & Luyện phỏng vấn chuyên sâu`;
      description = `Soạn thảo phần trình bày dự án ${skillName} cho vòng phỏng vấn kỹ thuật, tổng hợp các câu hỏi STAR và bullet points cho CV.`;
    }

    milestones.push({
      id: `milestone-w${weekNumber}-${skillName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      week: weekNumber,
      title,
      description,
      skill: skillName,
      category: catalogItem.category,
      estimatedHours: hoursPerWeek[i],
      status: 'pending',
      resources: catalogItem.curatedResources
    });
  }

  const overallProgressPercent = calculateRoadmapProgress(milestones);
  const now = new Date().toISOString();

  return {
    id: `roadmap-${Date.now()}`,
    title: `Lộ trình bứt phá: ${targetRole}`,
    targetRole,
    durationWeeks: 4,
    milestones,
    overallProgressPercent,
    createdAt: now,
    updatedAt: now
  };
}

export function calculateRoadmapProgress(milestones: LearningMilestoneDTO[]): number {
  if (!milestones || milestones.length === 0) return 0;
  const completedCount = milestones.filter(m => m.status === 'completed').length;
  const inProgressCount = milestones.filter(m => m.status === 'in_progress').length;
  const rawScore = (completedCount * 1.0 + inProgressCount * 0.4) / milestones.length;
  return Math.min(100, Math.round(rawScore * 100));
}

export type MilestoneUpdateValidationResult =
  | { ok: true; data: { status: MilestoneStatus } }
  | { ok: false; message: string };

export function validateMilestoneUpdateInput(input: unknown): MilestoneUpdateValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Dữ liệu cập nhật milestone phải là đối tượng JSON.' };
  }

  const body = input as Record<string, unknown>;
  const validStatuses: MilestoneStatus[] = ['pending', 'in_progress', 'completed'];

  if (typeof body.status !== 'string' || !validStatuses.includes(body.status as MilestoneStatus)) {
    return {
      ok: false,
      message: 'Trạng thái milestone không hợp lệ. Cho phép: pending, in_progress, completed.'
    };
  }

  return {
    ok: true,
    data: { status: body.status as MilestoneStatus }
  };
}

export type RoadmapGenerateValidationResult =
  | { ok: true; data: { targetRole: string; focusSkills: string[] } }
  | { ok: false; message: string };

export function validateRoadmapGenerateInput(input: unknown): RoadmapGenerateValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: true, data: { targetRole: 'Senior Software Specialist', focusSkills: [] } };
  }

  const body = input as Record<string, unknown>;
  const targetRole = typeof body.targetRole === 'string' && body.targetRole.trim()
    ? body.targetRole.trim()
    : 'Senior Software Specialist';

  const focusSkills = Array.isArray(body.focusSkills)
    ? body.focusSkills.map(s => String(s || '').trim()).filter(Boolean)
    : [];

  return {
    ok: true,
    data: { targetRole, focusSkills }
  };
}
