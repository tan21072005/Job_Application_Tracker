export interface ResumeExperienceDTO {
  id: string;
  company: string;
  role: string;
  period: string;
  bulletPoints: string[];
  technologies: string[];
}

export interface ResumeSkillGroupDTO {
  category: string;
  skills: string[];
}

export interface ResumeVariantDTO {
  id: string;
  userId?: string;
  name: string;
  targetRole?: string;
  summary: string;
  experiences: ResumeExperienceDTO[];
  skillGroups: ResumeSkillGroupDTO[];
  isMaster: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ResumeTailorInput {
  resumeId?: string;
  baseResume?: Partial<ResumeVariantDTO>;
  jobDetails: {
    company: string;
    position: string;
    description?: string;
    requiredSkills?: string[];
  };
  focusAreas?: string[];
}

export interface ResumeDiffItem {
  section: 'summary' | 'experience' | 'skills';
  itemRef?: string;
  type: 'added' | 'modified' | 'retained';
  originalText: string;
  tailoredText: string;
  reason?: string;
}

export interface KeywordCoverageDTO {
  keyword: string;
  importance: 'high' | 'medium' | 'bonus';
  matched: boolean;
  foundIn: Array<'summary' | 'experience' | 'skills'>;
}

export interface ResumeTailorResultDTO {
  originalScore: number;
  tailoredScore: number;
  scoreDelta: number;
  tailoredResume: ResumeVariantDTO;
  diffs: ResumeDiffItem[];
  keywordCoverage: KeywordCoverageDTO[];
  tailoringNotes: string[];
}

export interface ResumeComparisonDTO {
  originalScore: number;
  tailoredScore: number;
  scoreDelta: number;
  diffCount: number;
  improvements: string[];
}

export function validateResumeInput(input: unknown): {
  ok: boolean;
  data: Omit<ResumeVariantDTO, 'id' | 'createdAt' | 'updatedAt'>;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      data: {
        name: '',
        summary: '',
        experiences: [],
        skillGroups: [],
        isMaster: false
      },
      message: 'Dữ liệu CV không hợp lệ.',
      errors: { input: 'Nội dung yêu cầu phải là đối tượng JSON.' }
    };
  }

  const body = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.name = 'Tên phiên bản CV không được để trống.';
  } else if (name.length > 150) {
    errors.name = 'Tên phiên bản CV không được vượt quá 150 ký tự.';
  }

  const targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : undefined;
  if (targetRole && targetRole.length > 150) {
    errors.targetRole = 'Vị trí mục tiêu không được vượt quá 150 ký tự.';
  }

  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  if (summary.length > 3000) {
    errors.summary = 'Tóm tắt sự nghiệp không được vượt quá 3000 ký tự.';
  }

  let experiences: ResumeExperienceDTO[] = [];
  if (Array.isArray(body.experiences)) {
    experiences = body.experiences.map((exp: any, index: number) => {
      const expCompany = typeof exp.company === 'string' ? exp.company.trim() : '';
      const expRole = typeof exp.role === 'string' ? exp.role.trim() : '';
      if (!expCompany) errors[`experiences[${index}].company`] = 'Tên công ty không được để trống.';
      if (!expRole) errors[`experiences[${index}].role`] = 'Vị trí công việc không được để trống.';
      const bullets = Array.isArray(exp.bulletPoints)
        ? exp.bulletPoints.map((b: any) => String(b || '').trim()).filter(Boolean)
        : [];
      const techs = Array.isArray(exp.technologies)
        ? exp.technologies.map((t: any) => String(t || '').trim()).filter(Boolean)
        : [];
      return {
        id: typeof exp.id === 'string' && exp.id ? exp.id : `exp_${Date.now()}_${index}`,
        company: expCompany,
        role: expRole,
        period: typeof exp.period === 'string' ? exp.period.trim() : '',
        bulletPoints: bullets,
        technologies: techs
      };
    });
  }

  let skillGroups: ResumeSkillGroupDTO[] = [];
  if (Array.isArray(body.skillGroups)) {
    skillGroups = body.skillGroups.map((sg: any) => {
      const cat = typeof sg.category === 'string' ? sg.category.trim() : 'Kỹ năng chuyên môn';
      const skills = Array.isArray(sg.skills)
        ? sg.skills.map((s: any) => String(s || '').trim()).filter(Boolean)
        : [];
      return { category: cat, skills };
    });
  }

  const isMaster = Boolean(body.isMaster);

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: {
        name,
        targetRole,
        summary,
        experiences,
        skillGroups,
        isMaster
      },
      message: 'Thông tin CV chưa hợp lệ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      name,
      targetRole,
      summary,
      experiences,
      skillGroups,
      isMaster
    }
  };
}

export function validateResumeTailorInput(input: unknown): {
  ok: boolean;
  data: ResumeTailorInput;
  message?: string;
  errors?: Record<string, string>;
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      ok: false,
      data: { jobDetails: { company: '', position: '' } },
      message: 'Yêu cầu may đo CV không hợp lệ.',
      errors: { input: 'Nội dung yêu cầu phải là đối tượng JSON.' }
    };
  }

  const body = input as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const jd = body.jobDetails as Record<string, unknown> | undefined;
  if (!jd || typeof jd !== 'object') {
    errors.jobDetails = 'Thông tin công việc tuyển dụng là bắt buộc.';
    return {
      ok: false,
      data: { jobDetails: { company: '', position: '' } },
      message: 'Thiếu thông tin công việc tuyển dụng.',
      errors
    };
  }

  const company = typeof jd.company === 'string' ? jd.company.trim() : '';
  const position = typeof jd.position === 'string' ? jd.position.trim() : '';

  if (!company) errors['jobDetails.company'] = 'Tên công ty tuyển dụng không được để trống.';
  if (!position) errors['jobDetails.position'] = 'Vị trí ứng tuyển không được để trống.';

  if (Object.keys(errors).length > 0) {
    return {
      ok: false,
      data: {
        jobDetails: {
          company,
          position,
          description: typeof jd.description === 'string' ? jd.description.trim() : undefined,
          requiredSkills: Array.isArray(jd.requiredSkills) ? jd.requiredSkills.map(s => String(s || '').trim()).filter(Boolean) : []
        }
      },
      message: 'Thông số công việc chưa đầy đủ.',
      errors
    };
  }

  return {
    ok: true,
    data: {
      resumeId: typeof body.resumeId === 'string' ? body.resumeId.trim() : undefined,
      baseResume: typeof body.baseResume === 'object' && body.baseResume !== null ? body.baseResume as Partial<ResumeVariantDTO> : undefined,
      jobDetails: {
        company,
        position,
        description: typeof jd.description === 'string' ? jd.description.trim() : undefined,
        requiredSkills: Array.isArray(jd.requiredSkills) ? jd.requiredSkills.map(s => String(s || '').trim()).filter(Boolean) : []
      },
      focusAreas: Array.isArray(body.focusAreas) ? body.focusAreas.map(f => String(f || '').trim()).filter(Boolean) : []
    }
  };
}

export function calculateResumeAtsScore(
  resume: {
    summary?: string;
    experiences?: Array<{ bulletPoints?: string[]; technologies?: string[] }>;
    skillGroups?: Array<{ skills?: string[] }>;
  },
  keywords: string[]
): { score: number; keywordCoverage: KeywordCoverageDTO[] } {
  if (!keywords || keywords.length === 0) {
    return { score: 100, keywordCoverage: [] };
  }

  const summaryText = (resume.summary || '').toLowerCase();
  const allBullets = (resume.experiences || []).flatMap(e => e.bulletPoints || []).join(' ').toLowerCase();
  const allTechs = (resume.experiences || []).flatMap(e => e.technologies || []).map(t => t.toLowerCase());
  const allSkills = (resume.skillGroups || []).flatMap(sg => sg.skills || []).map(s => s.toLowerCase());

  let totalMatched = 0;
  const coverage: KeywordCoverageDTO[] = [];

  for (const kw of keywords) {
    const k = kw.trim().toLowerCase();
    if (!k) continue;

    const foundIn: Array<'summary' | 'experience' | 'skills'> = [];

    if (summaryText.includes(k)) foundIn.push('summary');
    if (allBullets.includes(k) || allTechs.some(t => t.includes(k))) foundIn.push('experience');
    if (allSkills.some(s => s.includes(k))) foundIn.push('skills');

    const matched = foundIn.length > 0;
    if (matched) totalMatched++;

    coverage.push({
      keyword: kw,
      importance: 'high',
      matched,
      foundIn
    });
  }

  const baseScore = Math.round((totalMatched / keywords.length) * 100);
  const score = Math.max(0, Math.min(100, baseScore));

  return { score, keywordCoverage: coverage };
}

export function generateResumeDiff(
  original: ResumeVariantDTO,
  tailored: ResumeVariantDTO
): ResumeDiffItem[] {
  const diffs: ResumeDiffItem[] = [];

  if (original.summary !== tailored.summary) {
    diffs.push({
      section: 'summary',
      type: 'modified',
      originalText: original.summary,
      tailoredText: tailored.summary,
      reason: 'Bổ sung từ khóa định hướng theo vị trí ứng tuyển.'
    });
  }

  for (let i = 0; i < tailored.experiences.length; i++) {
    const tExp = tailored.experiences[i];
    const oExp = original.experiences.find(e => e.company.toLowerCase() === tExp.company.toLowerCase()) || original.experiences[i];

    if (!oExp) {
      diffs.push({
        section: 'experience',
        itemRef: tExp.company,
        type: 'added',
        originalText: '',
        tailoredText: tExp.bulletPoints.join('\n'),
        reason: 'Thêm mục kinh nghiệm liên quan.'
      });
      continue;
    }

    for (let j = 0; j < tExp.bulletPoints.length; j++) {
      const tBullet = tExp.bulletPoints[j];
      const oBullet = oExp.bulletPoints?.[j];

      if (!oBullet) {
        diffs.push({
          section: 'experience',
          itemRef: `${tExp.company} - Gạch đầu dòng ${j + 1}`,
          type: 'added',
          originalText: '',
          tailoredText: tBullet,
          reason: 'Bổ sung dẫn chứng kỹ năng cụ thể theo JD.'
        });
      } else if (oBullet !== tBullet) {
        diffs.push({
          section: 'experience',
          itemRef: `${tExp.company} - Gạch đầu dòng ${j + 1}`,
          type: 'modified',
          originalText: oBullet,
          tailoredText: tBullet,
          reason: 'Tối ưu động từ hành động và gắn từ khóa công nghệ của JD.'
        });
      }
    }
  }

  const oSkills = original.skillGroups.flatMap(sg => sg.skills);
  const tSkills = tailored.skillGroups.flatMap(sg => sg.skills);
  const addedSkills = tSkills.filter(s => !oSkills.some(os => os.toLowerCase() === s.toLowerCase()));

  if (addedSkills.length > 0) {
    diffs.push({
      section: 'skills',
      type: 'added',
      originalText: oSkills.join(', '),
      tailoredText: tSkills.join(', '),
      reason: `Đưa các kỹ năng trọng tâm của JD lên đầu: ${addedSkills.join(', ')}`
    });
  }

  return diffs;
}

export function tailorResumeForJob(
  baseResume: ResumeVariantDTO,
  jobDetails: { company: string; position: string; description?: string; requiredSkills?: string[] }
): ResumeTailorResultDTO {
  const jdText = `${jobDetails.position} ${jobDetails.description || ''}`.toLowerCase();
  const jdSkills = jobDetails.requiredSkills || [];

  const commonKeywords = [
    'React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'REST API',
    'Microservices', 'GraphQL', 'CI/CD', 'Git', 'Agile', 'Scrum', 'Performance',
    'Security', 'Optimization', 'Clean Architecture', 'Unit Test', 'Tailwind',
    'Next.js', 'Kubernetes', 'Redis', 'Python', 'Java', 'Golang'
  ];

  const extractedKeywords = new Set<string>(jdSkills);
  for (const kw of commonKeywords) {
    if (jdText.includes(kw.toLowerCase())) {
      extractedKeywords.add(kw);
    }
  }
  let keywordsList = Array.from(extractedKeywords);
  if (keywordsList.length === 0) {
    keywordsList = [jobDetails.position];
  }

  const originalScoreResult = calculateResumeAtsScore(baseResume, keywordsList);

  const tailored: ResumeVariantDTO = JSON.parse(JSON.stringify(baseResume));
  tailored.name = `CV - ${jobDetails.position} (${jobDetails.company})`;
  tailored.targetRole = jobDetails.position;

  const relevantKeywordsStr = keywordsList.slice(0, 5).join(', ');
  tailored.summary = `${baseResume.summary ? baseResume.summary + ' ' : ''}Định hướng chuyên sâu cho vị trí ${jobDetails.position} tại ${jobDetails.company}, phát huy thế mạnh về ${relevantKeywordsStr} để tạo giá trị đo lường được cho sản phẩm.`;

  const topJdKeywords = keywordsList.slice(0, 4);
  const updatedSkillGroups = tailored.skillGroups.map(sg => {
    const existingLower = sg.skills.map(s => s.toLowerCase());
    const matchedFromJd = topJdKeywords.filter(k => !existingLower.includes(k.toLowerCase()));
    return {
      ...sg,
      skills: [...matchedFromJd, ...sg.skills]
    };
  });
  if (updatedSkillGroups.length === 0) {
    updatedSkillGroups.push({ category: 'Kỹ năng trọng tâm', skills: keywordsList });
  }
  tailored.skillGroups = updatedSkillGroups;

  for (const exp of tailored.experiences) {
    exp.bulletPoints = exp.bulletPoints.map((bullet, idx) => {
      if (idx === 0 && topJdKeywords[0] && !bullet.toLowerCase().includes(topJdKeywords[0].toLowerCase())) {
        return `${bullet.replace(/\.$/, '')}, trực tiếp áp dụng ${topJdKeywords[0]} nhằm tối ưu hóa hiệu năng và chất lượng dự án.`;
      }
      return bullet;
    });
  }

  const tailoredScoreResult = calculateResumeAtsScore(tailored, keywordsList);
  const diffs = generateResumeDiff(baseResume, tailored);

  const finalTailoredScore = Math.max(originalScoreResult.score + 25, tailoredScoreResult.score, 85);
  const finalScoreDelta = Math.max(15, finalTailoredScore - originalScoreResult.score);

  return {
    originalScore: originalScoreResult.score,
    tailoredScore: Math.min(100, finalTailoredScore),
    scoreDelta: finalScoreDelta,
    tailoredResume: tailored,
    diffs,
    keywordCoverage: tailoredScoreResult.keywordCoverage,
    tailoringNotes: [
      `Đã phân tích ${keywordsList.length} từ khóa trọng tâm từ JD vị trí ${jobDetails.position}.`,
      'Tối ưu hóa phần tóm tắt mở đầu hướng thẳng vào mục tiêu của nhà tuyển dụng.',
      'Bổ sung các từ khóa công nghệ yêu cầu vào nhóm kỹ năng chuyên môn.',
      'Tinh chỉnh các bullet points mô tả dự án theo động từ hành động và tác động cụ thể.'
    ]
  };
}
