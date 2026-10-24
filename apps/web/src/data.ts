import { request, ApiError } from './transport';
import { validApplications } from './validation';
import { emptyDraft, resolveLocalTime, deviceTimezone, type Application, type Draft, type Interview, type Status } from './domain';
import { fixture, demoDatasets, demoDatasetRecords } from './demo';
import {
  wireApplicationToUI,
  uiDraftToWireMutation,
  wireInterviewToUI,
  uiInterviewToWireMutation,
  type ApplicationWireDTO,
  type InterviewWireDTO,
  type UrlImportExtractResult,
  type DatasetWireDTO,
  type DatasetRecordWireDTO,
  type DatasetMutationInput,
  type CandidateProfileWireDTO,
  type CandidateProfileMutationInput,
  type AtsMatchResultDTO,
  type CoverLetterResultDTO,
  type JobSubscriptionDTO,
  type SubscriptionMutationInput,
  type CrawlRunResultDTO,
  type InterviewAgendaItemDTO,
  type InterviewFormat,
  type IcsCalendarEvent,
  generateIcsCalendar,
  formatAsCsv,
  formatApplicationsAsCsv,
  deriveActivityTimeline,
  type ActivityTimelineItemDTO,
  type BulkOperationResultDTO,
  type InterviewPrepResultDTO,
  type InterviewEvaluateResultDTO,
  type InterviewQuestionCategory,
  type DomainTrack,
  generateInterviewQuestions,
  evaluateStarAnswer,
  type CsvImportItemInput,
  type CsvImportResultDTO,
  type CsvImportRowErrorDTO,
  parseApplicationsFromCsv,
  calculateAnnualTotalCompensation,
  evaluateOfferDetails,
  compareOffers,
  generateCounterOfferScript,
  type OfferEvaluationInput,
  type OfferComparisonInput,
  type CounterOfferNegotiationInput,
  type OfferEvaluationDTO,
  type OfferComparisonMatrixDTO,
  type CounterOfferScriptDTO,
  type ProPlan,
  type ProOrderDTO,
  type ProPlanDTO,
  type ProStatusDTO,
  type CheckoutResultDTO
} from '@jobtrack/contract';

export const demoMode = import.meta.env.VITE_DATA_MODE !== 'api';
const KEY = 'jobtrack.design.v1';
const TRASH_KEY = 'jobtrack.trash.v1';
export { fixture } from './demo';

function load(): Application[] {
  if (typeof localStorage === 'undefined') return fixture();
  const stored = localStorage.getItem(KEY);
  if (!stored) return fixture();
  const value: unknown = JSON.parse(stored);
  if (!validApplications(value)) throw Error('Dữ liệu xem trước bị lỗi. Hãy dùng nút khôi phục dữ liệu mẫu.');
  return value;
}

function store(data: Application[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(data));
  }
  return structuredClone(data);
}

function loadTrash(): Application[] {
  if (typeof localStorage === 'undefined') return [];
  const stored = localStorage.getItem(TRASH_KEY);
  if (!stored) return [];
  try {
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function storeTrash(data: Application[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TRASH_KEY, JSON.stringify(data));
  }
}

export type MutationOptions = { version?: number; confirmReapply?: boolean; key?: string; deadlineInstant?: string };
const matchHeader = (id: string, version?: number): Record<string, string> =>
  version ? { 'If-Match': `"app:${id}:v${version}"` } : {};

function deadlineWire(local: string, instant?: string) {
  if (!local) return '';
  if (instant) return instant;
  if (/Z$|[+-]\d\d:\d\d$/.test(local)) return local;
  const matches = resolveLocalTime(local, deviceTimezone);
  if (matches.length !== 1) {
    throw Error(
      matches.length
        ? 'Giờ deadline xuất hiện hai lần. Chọn đúng thời điểm.'
        : 'Giờ deadline không tồn tại trong múi giờ thiết bị.'
    );
  }
  return matches[0];
}

export const repository = {
  async list(): Promise<Application[]> {
    if (demoMode) return structuredClone(load());
    const raw = await request<ApplicationWireDTO[]>('/applications');
    if (!Array.isArray(raw)) throw Error('Dữ liệu máy chủ chưa hợp lệ. Thử tải lại hoặc liên hệ hỗ trợ.');
    const apps: Application[] = raw.map(wire => wireApplicationToUI(wire) as Application);
    if (!validApplications(apps)) throw Error('Dữ liệu máy chủ chưa hợp lệ. Thử tải lại hoặc liên hệ hỗ trợ.');
    return apps;
  },

  async save(input: Draft, id?: string, options: MutationOptions = {}): Promise<Application> {
    const draft = Object.fromEntries(Object.keys(emptyDraft).map(key => [key, input[key as keyof Draft]])) as Draft;
    if (!demoMode) {
      const wireDeadline = deadlineWire(draft.deadline, options.deadlineInstant);
      const mutation = uiDraftToWireMutation({
        ...draft,
        deadline: wireDeadline || undefined,
        confirmReapply: options.confirmReapply || false
      });
      const wire = await request<ApplicationWireDTO>(id ? `/applications/${encodeURIComponent(id)}` : '/applications', {
        method: id ? 'PATCH' : 'POST',
        headers: {
          ...matchHeader(id || '', options.version),
          ...(!id ? { 'Idempotency-Key': options.key || crypto.randomUUID() } : {})
        },
        body: JSON.stringify(mutation)
      });
      return wireApplicationToUI(wire) as Application;
    }
    const data = load();
    if (id && !data.some(app => app.id === id)) throw Error('Hồ sơ đã bị xóa. Đóng form và tải lại danh sách.');
    const record: Application = {
      ...draft,
      id: id || crypto.randomUUID(),
      createdAt: id ? data.find(app => app.id === id)!.createdAt : new Date().toISOString(),
      interviews: id ? data.find(app => app.id === id)!.interviews : []
    };
    store(id ? data.map(app => (app.id === id ? record : app)) : [record, ...data]);
    return record;
  },

  async remove(id: string, version?: number) {
    if (!demoMode) {
      return request<void>(`/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: matchHeader(id, version)
      });
    }
    store(load().filter(app => app.id !== id));
  },

  async moveToTrash(id: string, version?: number): Promise<void> {
    if (!demoMode) {
      return request<void>(`/applications/${encodeURIComponent(id)}/trash`, {
        method: 'POST',
        headers: matchHeader(id, version)
      });
    }
    const data = load();
    const app = data.find(a => a.id === id);
    if (app) {
      store(data.filter(a => a.id !== id));
      const trash = loadTrash();
      storeTrash([{ ...app, deletedAt: new Date().toISOString() }, ...trash]);
    }
  },

  async listTrash(): Promise<Application[]> {
    if (demoMode) return loadTrash();
    const raw = await request<ApplicationWireDTO[]>('/applications/trash');
    if (!Array.isArray(raw)) throw Error('Dữ liệu thùng rác chưa hợp lệ.');
    return raw.map(wire => wireApplicationToUI(wire) as Application);
  },

  async restore(id: string): Promise<Application> {
    if (!demoMode) {
      const wire = await request<ApplicationWireDTO>(`/applications/${encodeURIComponent(id)}/restore`, {
        method: 'POST'
      });
      return wireApplicationToUI(wire) as Application;
    }
    const trash = loadTrash();
    const app = trash.find(a => a.id === id);
    if (!app) throw Error('Không tìm thấy hồ sơ trong thùng rác.');
    storeTrash(trash.filter(a => a.id !== id));
    const data = load();
    const restored: Application = { ...app, deletedAt: undefined };
    store([restored, ...data]);
    return restored;
  },

  async purge(id: string, version?: number): Promise<void> {
    if (!demoMode) {
      return request<void>(`/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: matchHeader(id, version)
      });
    }
    const trash = loadTrash();
    storeTrash(trash.filter(a => a.id !== id));
    store(load().filter(a => a.id !== id));
  },

  async interview(applicationId: string, interview: Interview, version?: number, key?: string): Promise<Interview> {
    if (!demoMode) {
      const isNew = interview.id.startsWith('new-');
      const mutation = uiInterviewToWireMutation(interview);
      const wire = await request<InterviewWireDTO>(
        isNew
          ? `/applications/${encodeURIComponent(applicationId)}/interviews`
          : `/interviews/${encodeURIComponent(interview.id)}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: {
            ...matchHeader(applicationId, version),
            ...(isNew ? { 'Idempotency-Key': key || crypto.randomUUID() } : {})
          },
          body: JSON.stringify(mutation)
        }
      );
      return wireInterviewToUI(wire) as Interview;
    }
    store(
      load().map(app =>
        app.id === applicationId
          ? {
              ...app,
              status:
                ['Offer', 'Rejected', 'Withdrawn'].includes(app.status) ||
                app.interviews.some(round => round.id === interview.id)
                  ? app.status
                  : 'Interview',
              interviews: app.interviews.some(round => round.id === interview.id)
                ? app.interviews.map(round => (round.id === interview.id ? interview : round))
                : [...app.interviews, interview]
            }
          : app
      )
    );
    return interview;
  },

  async removeInterview(applicationId: string, id: string, version?: number) {
    if (!demoMode) {
      return request<void>(`/interviews/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: matchHeader(applicationId, version)
      });
    }
    store(
      load().map(app =>
        app.id === applicationId ? { ...app, interviews: app.interviews.filter(round => round.id !== id) } : app
      )
    );
  },

  async bulkUpdateStatus(ids: string[], status: Status): Promise<BulkOperationResultDTO> {
    if (demoMode) {
      const all = load();
      const idSet = new Set(ids);
      let count = 0;
      const updated = all.map(a => {
        if (idSet.has(a.id)) {
          count++;
          return { ...a, status, updatedAt: new Date().toISOString() };
        }
        return a;
      });
      store(updated);
      return { affectedCount: count, ids };
    }
    return request<BulkOperationResultDTO>('/applications/bulk-status', {
      method: 'POST',
      body: JSON.stringify({ ids, status })
    });
  },

  async bulkMoveToTrash(ids: string[]): Promise<BulkOperationResultDTO> {
    if (demoMode) {
      const all = load();
      const trash = loadTrash();
      const idSet = new Set(ids);
      const remaining: Application[] = [];
      const moving: Application[] = [];
      for (const a of all) {
        if (idSet.has(a.id)) {
          moving.push({ ...a, deletedAt: new Date().toISOString() });
        } else {
          remaining.push(a);
        }
      }
      store(remaining);
      storeTrash([...trash, ...moving]);
      return { affectedCount: moving.length, ids: moving.map(m => m.id) };
    }
    return request<BulkOperationResultDTO>('/applications/bulk-trash', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
  },

  async importCsv(rows: CsvImportItemInput[], skipDuplicates = true): Promise<CsvImportResultDTO> {
    if (demoMode) {
      const all = load();
      const existingUrls = new Set<string>();
      const existingCompPos = new Set<string>();

      for (const a of all) {
        if (a.url) existingUrls.add(a.url.trim().toLowerCase());
        existingCompPos.add(`${a.company.trim().toLowerCase()}::${a.position.trim().toLowerCase()}`);
      }

      const batchUrls = new Set<string>();
      const batchCompPos = new Set<string>();
      const inserted: Application[] = [];
      const insertedIds: string[] = [];
      const errors: CsvImportRowErrorDTO[] = [];
      let skippedDuplicatesCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        const rowNum = i + 1;

        if (!item.company?.trim() || !item.position?.trim()) {
          errors.push({
            rowNumber: rowNum,
            field: 'company/position',
            message: 'Tên công ty và vị trí không được để trống.'
          });
          continue;
        }

        const compClean = item.company.trim();
        const posClean = item.position.trim();
        const compPosKey = `${compClean.toLowerCase()}::${posClean.toLowerCase()}`;
        const cleanUrl = item.url?.trim()?.toLowerCase() || null;

        const isDupUrl = cleanUrl ? (existingUrls.has(cleanUrl) || batchUrls.has(cleanUrl)) : false;
        const isDupCompPos = existingCompPos.has(compPosKey) || batchCompPos.has(compPosKey);

        if (isDupUrl || isDupCompPos) {
          if (skipDuplicates) {
            skippedDuplicatesCount++;
            continue;
          } else {
            errors.push({
              rowNumber: rowNum,
              field: 'duplicate',
              message: `Hồ sơ "${posClean} tại ${compClean}" đã tồn tại.`
            });
            continue;
          }
        }

        const id = crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}-${i}`;
        const newApp: Application = {
          id,
          company: compClean,
          position: posClean,
          status: item.status || 'Saved',
          appliedAt: item.appliedAt || '',
          salary: item.salary || '',
          location: item.location || '',
          workMode: item.workMode || 'Remote',
          nextAction: item.nextAction || '',
          deadline: item.deadline || '',
          source: item.source || '',
          jobCode: item.jobCode || '',
          url: item.url || '',
          notes: item.notes || '',
          interviews: [],
          version: 1,
          createdAt: new Date().toISOString()
        };

        inserted.push(newApp);
        insertedIds.push(id);
        if (cleanUrl) batchUrls.add(cleanUrl);
        batchCompPos.add(compPosKey);
      }

      if (inserted.length > 0) {
        store([...inserted, ...all]);
      }

      return {
        importedCount: insertedIds.length,
        skippedDuplicatesCount,
        failedCount: errors.length,
        insertedIds,
        errors
      };
    }

    return request<CsvImportResultDTO>('/applications/import-csv', {
      method: 'POST',
      body: JSON.stringify({ rows, skipDuplicates })
    });
  },

  async getTimeline(appId: string): Promise<ActivityTimelineItemDTO[]> {
    if (demoMode) {
      const all = load();
      const app = all.find(a => a.id === appId);
      if (!app) return [];
      return deriveActivityTimeline(app);
    }
    return request<ActivityTimelineItemDTO[]>(`/applications/${encodeURIComponent(appId)}/timeline`);
  },

  async reset() {
    if (!demoMode) throw Error('Chỉ khôi phục được dữ liệu xem trước.');
    store(fixture());
  },

  async me() {
    return request<{ id: string; email: string }>('/auth/me');
  },

  async login(email: string, password: string, register = false) {
    return request<{ id: string; email: string }>(register ? '/auth/register' : '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  },

  async logout() {
    if (!demoMode) await request<void>('/auth/logout', { method: 'POST' });
  },

  async importUrl(url: string): Promise<UrlImportExtractResult> {
    if (demoMode) {
      return {
        company: 'Công ty Công nghệ Alpha',
        position: 'Kỹ sư Phần mềm',
        url,
        location: 'Hà Nội',
        workMode: 'Hybrid',
        salary: '35 - 50 triệu',
        notes: 'Vị trí phát triển hệ thống backend phân tán và AI integration.',
        deadline: null,
        confidence: { company: 0.9, position: 0.85 }
      };
    }
    return request<UrlImportExtractResult>('/ai/import-url', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  },

  async chat(message: string, sessionId?: string): Promise<{ output?: string; text?: string }> {
    if (demoMode) {
      return {
        output: `[Demo AI] Bạn vừa hỏi: "${message}". Trong chế độ dữ liệu mẫu, bạn có thể xem các tính năng quản lý hồ sơ và thử nghiệm nhập tin từ link tuyển dụng.`
      };
    }
    return request<{ output?: string; text?: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ chatInput: message, sessionId })
    });
  },

  async listGrants(): Promise<Array<{ id: string; client: string; scopes: string[]; createdAt: string; expiresAt: string }>> {
    if (demoMode) {
      return [
        { id: 'demo-grant-1', client: 'claude-desktop', scopes: ['full_control'], createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 90 * 86400000).toISOString() }
      ];
    }
    return request<Array<{ id: string; client: string; scopes: string[]; createdAt: string; expiresAt: string }>>('/ai/grants');
  },

  async createGrant(client: string): Promise<{ id: string; client: string; token: string; expiresIn: string }> {
    if (demoMode) {
      return {
        id: crypto.randomUUID(),
        client: client || 'claude-desktop',
        token: `jt_sec_demo_${Math.random().toString(36).slice(2)}`,
        expiresIn: '90 days'
      };
    }
    return request<{ id: string; client: string; token: string; expiresIn: string }>('/ai/grants', {
      method: 'POST',
      body: JSON.stringify({ client })
    });
  },

  async revokeGrant(id: string): Promise<void> {
    if (demoMode) return;
    return request<void>(`/ai/grants/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};

export const datasetRepository = {
  async list(): Promise<DatasetWireDTO[]> {
    if (demoMode) return structuredClone(demoDatasets());
    const res = await request<DatasetWireDTO[]>('/datasets');
    return Array.isArray(res) ? res : [];
  },

  async get(id: string): Promise<DatasetWireDTO | null> {
    if (demoMode) {
      const match = demoDatasets().find(d => d.id === id);
      return match ? structuredClone(match) : null;
    }
    return request<DatasetWireDTO>(`/datasets/${encodeURIComponent(id)}`);
  },

  async listRecords(datasetId: string): Promise<DatasetRecordWireDTO[]> {
    if (demoMode) return structuredClone(demoDatasetRecords(datasetId));
    const res = await request<{ dataset: DatasetWireDTO; records: DatasetRecordWireDTO[]; total: number }>(
      `/datasets/${encodeURIComponent(datasetId)}/records`
    );
    return res && Array.isArray(res.records) ? res.records : [];
  },

  async create(input: DatasetMutationInput): Promise<DatasetWireDTO> {
    if (demoMode) {
      const newDs: DatasetWireDTO = {
        id: `demo-ds-${Date.now()}`,
        userId: 'demo-user',
        name: input.name,
        description: input.description || null,
        category: input.category || 'custom',
        schemaVersion: 1,
        columns: input.columns || [],
        recordCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return newDs;
    }
    return request<DatasetWireDTO>('/datasets', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async delete(id: string): Promise<void> {
    if (demoMode) return;
    return request<void>(`/datasets/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async exportCsv(id: string): Promise<string> {
    if (demoMode) {
      const records = demoDatasetRecords(id);
      const ds = demoDatasets().find(d => d.id === id);
      const columns = ds?.columns?.length ? ds.columns : [{ key: 'name', label: 'Tên' }];
      const headers = [
        { key: 'sourceUrl', label: 'URL Nguồn' },
        { key: 'sourceTitle', label: 'Tiêu đề' },
        { key: 'capturedAt', label: 'Thời gian cào' },
        ...columns.map(c => ({ key: c.key, label: c.label }))
      ];
      const rows = records.map(r => ({
        sourceUrl: r.sourceUrl || '',
        sourceTitle: r.sourceTitle || '',
        capturedAt: r.capturedAt,
        ...r.data
      }));
      return formatAsCsv(headers, rows);
    }
    const res = await fetch(`/api/datasets/${encodeURIComponent(id)}/export`, { credentials: 'include' });
    return res.text();
  }
};

export const profileRepository = {
  async get(): Promise<CandidateProfileWireDTO | null> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') return null;
      const stored = localStorage.getItem('jobtrack.candidate.profile.v1');
      if (!stored) return null;
      try {
        return JSON.parse(stored) as CandidateProfileWireDTO;
      } catch {
        return null;
      }
    }
    try {
      return await request<CandidateProfileWireDTO>('/profile');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  },

  async save(input: CandidateProfileMutationInput): Promise<CandidateProfileWireDTO> {
    if (demoMode) {
      const profile: CandidateProfileWireDTO = {
        userId: 'demo-user',
        fullName: input.fullName,
        email: input.email,
        phone: input.phone || null,
        cvUrl: input.cvUrl || null,
        portfolioUrl: input.portfolioUrl || null,
        skills: input.skills || [],
        bio: input.bio || null,
        customAnswers: input.customAnswers || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jobtrack.candidate.profile.v1', JSON.stringify(profile));
      }
      return profile;
    }
    return request<CandidateProfileWireDTO>('/profile', {
      method: 'PUT',
      headers: input.expectedUpdatedAt ? { 'If-Match': input.expectedUpdatedAt } : {},
      body: JSON.stringify(input)
    });
  }
};

export const aiRepository = {
  async analyzeAtsMatch(input: {
    company: string;
    position: string;
    notes?: string | null;
  }): Promise<AtsMatchResultDTO> {
    if (demoMode) {
      const profile = await profileRepository.get();
      const candidateSkills = profile?.skills || ['TypeScript', 'React', 'Node.js', 'PostgreSQL'];
      const text = `${input.position} ${input.company} ${input.notes || ''}`.toLowerCase();
      const matchedSkills = candidateSkills.filter(skill => text.includes(skill.toLowerCase()));
      const commonKeywords = ['TypeScript', 'React', 'Node.js', 'Docker', 'Kubernetes', 'AWS', 'CI/CD'];
      const detectedJdSkills = commonKeywords.filter(k => text.includes(k.toLowerCase()));
      if (!detectedJdSkills.length) {
        detectedJdSkills.push(...input.position.split(/\s+/).filter(w => w.length > 2).slice(0, 4));
      }
      const missingSkills = detectedJdSkills.filter(k => !matchedSkills.some(m => m.toLowerCase().includes(k.toLowerCase())));
      const score = Math.min(95, Math.max(35, Math.round((matchedSkills.length / Math.max(1, detectedJdSkills.length)) * 50 + 40)));
      const overallFit = score >= 80 ? 'Xuất sắc' : score >= 65 ? 'Phù hợp' : score >= 50 ? 'Tiềm năng' : 'Cần bổ sung kỹ năng';
      return {
        score,
        overallFit,
        matchedSkills,
        missingSkills,
        recommendations: [
          `Tối ưu hóa tiêu đề và kinh nghiệm liên quan đến "${input.position}".`,
          missingSkills.length ? `Bổ sung các kỹ năng sau vào CV nếu có kinh nghiệm: ${missingSkills.join(', ')}.` : 'Hồ sơ đã khớp rất tốt các từ khóa công nghệ chính.'
        ],
        keywordBreakdown: detectedJdSkills.map((skill, idx) => ({
          skill,
          foundInCv: matchedSkills.some(m => m.toLowerCase().includes(skill.toLowerCase())),
          importance: idx < 2 ? 'high' : idx < 4 ? 'medium' : 'bonus'
        }))
      };
    }
    return request<AtsMatchResultDTO>('/ai/pro/ats-match', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async generateCoverLetter(input: {
    company: string;
    position: string;
    notes?: string | null;
    language?: 'vi' | 'en';
  }): Promise<CoverLetterResultDTO> {
    if (demoMode) {
      const profile = await profileRepository.get();
      const isEn = input.language === 'en';
      const name = profile?.fullName || (isEn ? 'Applicant' : 'Ứng viên');
      const email = profile?.email || 'email@example.com';
      const phone = profile?.phone || '(+84) 9xx xxx xxx';
      const skills = profile?.skills?.length ? profile.skills.join(', ') : (isEn ? 'relevant technologies' : 'các công nghệ liên quan');
      const company = input.company || (isEn ? 'Your Company' : 'Quý công ty');
      const position = input.position || (isEn ? 'the open position' : 'vị trí tuyển dụng');

      const coverLetter = isEn
        ? `Dear Hiring Team at ${company},\n\nI am writing to express my enthusiasm for the ${position} role. With my background in ${skills}, I am eager to contribute to your team's success.\n\nSincerely,\n${name}\n${phone} | ${email}`
        : `Kính gửi Bộ phận Tuyển dụng ${company},\n\nTôi là ${name}, viết thư này để ứng tuyển vào vị trí ${position}. Với chuyên môn về ${skills}, tôi tự tin có thể đóng góp hiệu quả vào các dự án của quý công ty.\n\nTrân trọng,\n${name}\nSĐT: ${phone} | Email: ${email}`;

      const shortPitch = isEn
        ? `Hi Hiring Team, I noticed your opening for ${position} at ${company}. Having strong experience in ${skills}, I would love to connect and share more about how I can add value!`
        : `Chào anh/chị tuyển dụng tại ${company}, em là ${name}. Em có kinh nghiệm thực chiến về ${skills} và rất mong muốn được trao đổi thêm về cơ hội ${position}!`;

      return {
        coverLetter,
        shortPitch,
        highlights: [
          `Tùy chỉnh riêng cho vị trí ${position} tại ${company}`,
          `Nhấn mạnh kỹ năng: ${skills}`,
          `Định dạng chuẩn ATS, sẵn sàng gửi ngay`
        ]
      };
    }
    return request<CoverLetterResultDTO>('/ai/pro/cover-letter', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async getInterviewPrep(input: {
    company: string;
    position: string;
    notes?: string | null;
    roundTitle?: string;
    skills?: string[];
    domainTrack?: DomainTrack;
  }): Promise<InterviewPrepResultDTO> {
    if (demoMode) {
      const profile = await profileRepository.get();
      const skills = profile?.skills || input.skills || ['TypeScript', 'React', 'Node.js'];
      return generateInterviewQuestions({
        company: input.company,
        position: input.position,
        notes: input.notes,
        roundTitle: input.roundTitle,
        skills,
        domainTrack: input.domainTrack
      });
    }
    return request<InterviewPrepResultDTO>('/ai/pro/interview-prep', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async evaluateInterviewAnswer(input: {
    questionId: string;
    question: string;
    category: InterviewQuestionCategory;
    answer: string;
    targetRole?: string;
    company?: string;
  }): Promise<InterviewEvaluateResultDTO> {
    if (demoMode) {
      return evaluateStarAnswer(input);
    }
    return request<InterviewEvaluateResultDTO>('/ai/pro/interview-evaluate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async evaluateOffer(input: OfferEvaluationInput): Promise<OfferEvaluationDTO> {
    if (demoMode) {
      const comp = calculateAnnualTotalCompensation({
        baseSalaryMonthly: input.compensation.baseSalaryMonthly,
        currency: input.compensation.currency || 'VND',
        bonusMonthsPerYear: input.compensation.bonusMonthsPerYear,
        annualBonusCash: input.compensation.annualBonusCash,
        stockOptionsOrEquityAnnual: input.compensation.stockOptionsOrEquityAnnual,
        allowanceMonthly: input.compensation.allowanceMonthly
      });
      return evaluateOfferDetails({
        applicationId: input.applicationId,
        company: input.company,
        position: input.position,
        compensation: comp,
        workplaceFactors: input.workplaceFactors,
        weights: input.weights
      });
    }
    return request<OfferEvaluationDTO>('/ai/pro/offer-evaluate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async compareOffers(input: OfferComparisonInput): Promise<OfferComparisonMatrixDTO> {
    if (demoMode) {
      const list = input.offers.map(o => {
        const comp = calculateAnnualTotalCompensation({
          baseSalaryMonthly: o.compensation.baseSalaryMonthly,
          currency: o.compensation.currency || 'VND',
          bonusMonthsPerYear: o.compensation.bonusMonthsPerYear,
          annualBonusCash: o.compensation.annualBonusCash,
          stockOptionsOrEquityAnnual: o.compensation.stockOptionsOrEquityAnnual,
          allowanceMonthly: o.compensation.allowanceMonthly
        });
        return evaluateOfferDetails({
          applicationId: o.applicationId,
          company: o.company,
          position: o.position,
          compensation: comp,
          workplaceFactors: o.workplaceFactors,
          weights: o.weights
        });
      });
      return compareOffers(list);
    }
    return request<OfferComparisonMatrixDTO>('/ai/pro/offer-compare', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async generateCounterOffer(input: CounterOfferNegotiationInput): Promise<CounterOfferScriptDTO> {
    if (demoMode) {
      return generateCounterOfferScript(input);
    }
    return request<CounterOfferScriptDTO>('/ai/pro/counter-offer', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};

export const subscriptionRepository = {
  async list(): Promise<JobSubscriptionDTO[]> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') return [];
      const stored = localStorage.getItem('jobtrack.subscriptions.v1');
      if (!stored) return [];
      try {
        return JSON.parse(stored) as JobSubscriptionDTO[];
      } catch {
        return [];
      }
    }
    return request<JobSubscriptionDTO[]>('/subscriptions');
  },

  async create(input: SubscriptionMutationInput): Promise<JobSubscriptionDTO> {
    if (demoMode) {
      const sub: JobSubscriptionDTO = {
        id: `demo-sub-${Date.now()}`,
        userId: 'demo-user',
        title: input.title,
        keywords: input.keywords || [],
        location: input.location || null,
        minSalary: input.minSalary || null,
        sources: input.sources || ['TopCV', 'ITViec'],
        isActive: input.isActive ?? true,
        lastCheckedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (typeof localStorage !== 'undefined') {
        const existing = await this.list();
        localStorage.setItem('jobtrack.subscriptions.v1', JSON.stringify([...existing, sub]));
      }
      return sub;
    }
    return request<JobSubscriptionDTO>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async toggle(id: string, isActive?: boolean): Promise<JobSubscriptionDTO> {
    if (demoMode) {
      const items = await this.list();
      let updated: JobSubscriptionDTO | null = null;
      const next = items.map(s => {
        if (s.id === id) {
          updated = {
            ...s,
            isActive: typeof isActive === 'boolean' ? isActive : !s.isActive,
            updatedAt: new Date().toISOString()
          };
          return updated;
        }
        return s;
      });
      if (typeof localStorage !== 'undefined' && updated) {
        localStorage.setItem('jobtrack.subscriptions.v1', JSON.stringify(next));
      }
      if (!updated) throw new ApiError('Không tìm thấy bộ lọc đăng ký.', 404);
      return updated;
    }
    return request<JobSubscriptionDTO>(`/subscriptions/${encodeURIComponent(id)}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  },

  async remove(id: string): Promise<void> {
    if (demoMode) {
      const items = await this.list();
      const next = items.filter(s => s.id !== id);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jobtrack.subscriptions.v1', JSON.stringify(next));
      }
      return;
    }
    return request<void>(`/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async runScan(id: string): Promise<CrawlRunResultDTO> {
    if (demoMode) {
      const subs = await this.list();
      const sub = subs.find(s => s.id === id);
      if (!sub) throw new ApiError('Không tìm thấy bộ lọc đăng ký.', 404);
      if (!sub.isActive) throw new ApiError('Bộ lọc đăng ký đang bị tạm dừng.', 400);

      const kw = sub.keywords[0] || 'Software';
      const itemsResult: CrawlRunResultDTO['items'] = [
        { company: 'FPT Software', position: `${kw} Engineer`, status: 'saved' },
        { company: 'VNG Corporation', position: `Senior ${kw} Lead`, status: 'saved' }
      ];

      sub.lastCheckedAt = new Date().toISOString();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jobtrack.subscriptions.v1', JSON.stringify(subs));
      }

      for (const item of itemsResult) {
        try {
          await repository.save({
            company: item.company,
            position: item.position,
            location: sub.location || 'Hà Nội',
            salary: sub.minSalary ? `${sub.minSalary.toLocaleString('vi-VN')} VND+` : 'Thương lượng',
            status: 'Saved',
            source: 'radar',
            jobCode: '',
            workMode: 'Hybrid',
            url: '',
            notes: '',
            appliedAt: '',
            nextAction: '',
            deadline: ''
          });
        } catch {}
      }

      return {
        subscriptionId: sub.id,
        subscriptionTitle: sub.title,
        found: 2,
        matched: 2,
        saved: 2,
        skippedDuplicates: 0,
        items: itemsResult
      };
    }
    return request<CrawlRunResultDTO>(`/subscriptions/${encodeURIComponent(id)}/run`, {
      method: 'POST'
    });
  }
};

export const interviewsRepository = {
  async listAgenda(): Promise<InterviewAgendaItemDTO[]> {
    if (demoMode) {
      const apps = load();
      const items: InterviewAgendaItemDTO[] = apps.flatMap(app =>
        (app.interviews || []).map(interview => ({
          id: interview.id,
          applicationId: app.id,
          title: interview.title,
          at: interview.at,
          timezone: interview.timezone,
          format: (['Online', 'Phone', 'On-site', 'Other'].includes(interview.format as InterviewFormat) ? interview.format as InterviewFormat : interview.format === 'Onsite' ? 'On-site' : 'Online'),
          location: interview.location,
          preparation: interview.preparation,
          notes: interview.notes,
          status: interview.status,
          company: app.company,
          position: app.position,
          applicationStatus: app.status
        }))
      );
      items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      return items;
    }
    return request<InterviewAgendaItemDTO[]>('/interviews');
  },

  async toggleComplete(item: InterviewAgendaItemDTO): Promise<InterviewAgendaItemDTO> {
    const nextStatus = item.status === 'Completed' ? 'Scheduled' : 'Completed';
    if (demoMode) {
      const apps = load();
      const targetApp = apps.find(a => a.id === item.applicationId);
      if (!targetApp) throw new ApiError('Không tìm thấy hồ sơ liên quan.', 404);
      const targetInterview = targetApp.interviews.find(r => r.id === item.id);
      if (!targetInterview) throw new ApiError('Không tìm thấy lịch phỏng vấn.', 404);
      targetInterview.status = nextStatus;
      store(apps);
      return { ...item, status: nextStatus };
    }
    await request<InterviewWireDTO>(`/interviews/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus })
    });
    return { ...item, status: nextStatus };
  },

  async updateInterview(id: string, patch: Partial<{ title: string; at: string; timezone: string; format: InterviewFormat; location?: string; preparation?: string; notes?: string; status: string }>): Promise<InterviewWireDTO> {
    if (demoMode) {
      const apps = load();
      let targetRound: InterviewWireDTO | null = null;
      for (const app of apps) {
        const round = (app.interviews || []).find(r => r.id === id);
        if (round) {
          Object.assign(round, patch);
          targetRound = round as unknown as InterviewWireDTO;
          break;
        }
      }
      if (!targetRound) throw new ApiError('Không tìm thấy lịch phỏng vấn.', 404);
      store(apps);
      return targetRound;
    }
    return request<InterviewWireDTO>(`/interviews/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
  },

  async exportIcs(): Promise<string> {
    if (demoMode) {
      const items = await this.listAgenda();
      const events: IcsCalendarEvent[] = items.map(item => ({
        id: item.id,
        title: item.title,
        company: item.company,
        position: item.position,
        at: item.at,
        timezone: item.timezone,
        format: item.format,
        location: item.location,
        notes: item.notes
      }));
      return generateIcsCalendar(events);
    }
    const res = await fetch('/api/interviews/export.ics', {
      credentials: 'include'
    });
    if (!res.ok) throw new ApiError('Không thể tải lịch .ics', res.status);
    return res.text();
  }
};

export function downloadApplicationsCsv(apps: Application[], filename = 'jobtrack-applications.csv'): void {
  const csv = formatApplicationsAsCsv(apps);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PRO_STORAGE_KEY = 'jobtrack.pro.status.v1';
const PRO_ORDERS_KEY = 'jobtrack.pro.orders.v1';

export const proRepository = {
  async getStatus(): Promise<ProStatusDTO> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') {
        return { tier: 'free', isPro: false, expiresAt: null };
      }
      const raw = localStorage.getItem(PRO_STORAGE_KEY);
      if (!raw) return { tier: 'free', isPro: false, expiresAt: null };
      try {
        const parsed = JSON.parse(raw);
        if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
          return { tier: 'free', isPro: false, expiresAt: null };
        }
        return parsed;
      } catch {
        return { tier: 'free', isPro: false, expiresAt: null };
      }
    }
    return request<ProStatusDTO>('/pro/status');
  },

  async getPlans(): Promise<ProPlanDTO[]> {
    if (demoMode) {
      return [
        {
          plan: 'monthly',
          name: 'Gói 1 Tháng',
          amount: 99000,
          currency: 'VND',
          durationDays: 30,
          features: [
            'Không giới hạn quản lý hồ sơ ứng tuyển',
            'AI phân tích độ khớp ATS & gợi ý từ khóa',
            'AI tạo Cover Letter cá nhân hóa không giới hạn',
            'AI Luyện phỏng vấn STAR & chấm điểm chi tiết',
            'So sánh đa offer & AI Đàm phán mức lương'
          ]
        },
        {
          plan: 'quarterly',
          name: 'Gói 3 Tháng',
          amount: 249000,
          currency: 'VND',
          durationDays: 90,
          highlightBadge: 'Phổ biến nhất',
          savingsPercent: 16,
          features: [
            'Tất cả tính năng của gói 1 tháng',
            'Tiết kiệm 16% so với thanh toán từng tháng',
            'Đồng hành trọn vẹn chu kỳ tìm việc và thử việc',
            'Ưu tiên tài nguyên AI phản hồi nhanh nhất'
          ]
        },
        {
          plan: 'yearly',
          name: 'Gói 1 Năm',
          amount: 799000,
          currency: 'VND',
          durationDays: 365,
          highlightBadge: 'Tiết kiệm nhất',
          savingsPercent: 33,
          features: [
            'Tất cả đặc quyền Pro trọn vẹn 365 ngày',
            'Tiết kiệm 33% chi phí (chỉ ~66.000đ/tháng)',
            'Job Radar AI tự động quét cơ hội mới định kỳ',
            'Trải nghiệm sớm nhất các tính năng AI thế hệ mới'
          ]
        }
      ];
    }
    const res = await request<{ plans: ProPlanDTO[] }>('/pro/plans');
    return res.plans;
  },

  async createCheckout(plan: ProPlan): Promise<CheckoutResultDTO> {
    if (demoMode) {
      const codeSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const transferCode = `JTPRO${codeSuffix}`;
      const orderId = `demo_ord_${Date.now()}`;
      const prices: Record<ProPlan, number> = { monthly: 99000, quarterly: 249000, yearly: 799000 };
      const amount = prices[plan] || 99000;
      const order: ProOrderDTO = {
        orderId,
        plan,
        amount,
        currency: 'VND',
        transferCode,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        completedAt: null,
        failureReason: null
      };

      if (typeof localStorage !== 'undefined') {
        const ordersRaw = localStorage.getItem(PRO_ORDERS_KEY);
        const orders = ordersRaw ? JSON.parse(ordersRaw) : {};
        orders[orderId] = order;
        localStorage.setItem(PRO_ORDERS_KEY, JSON.stringify(orders));
      }

      return {
        orderId,
        plan,
        amount,
        currency: 'VND',
        transferCode,
        mode: 'test',
        testNotice: 'Thanh toán đang ở chế độ thử nghiệm: hệ thống chưa kết nối cổng thanh toán thật. Bạn có thể sử dụng nút Mô phỏng Webhook để kích hoạt gói Pro.',
        bankName: null,
        accountNo: null,
        accountName: null,
        vietQrUrl: null,
        instructions: `Đơn hàng ${transferCode} đã được tạo ở chế độ thử nghiệm với số tiền ${amount.toLocaleString('vi-VN')} VND.`
      };
    }
    return request<CheckoutResultDTO>('/pro/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan })
    });
  },

  async getOrder(orderId: string): Promise<ProOrderDTO> {
    if (demoMode) {
      if (typeof localStorage !== 'undefined') {
        const ordersRaw = localStorage.getItem(PRO_ORDERS_KEY);
        const orders = ordersRaw ? JSON.parse(ordersRaw) : {};
        if (orders[orderId]) return orders[orderId];
      }
      throw new ApiError('Không tìm thấy đơn hàng.', 404);
    }
    return request<ProOrderDTO>(`/pro/orders/${encodeURIComponent(orderId)}`);
  },

  async simulatePaid(orderId: string): Promise<{ success: boolean; replayed?: boolean; orderId: string; plan: ProPlan }> {
    if (demoMode) {
      if (typeof localStorage !== 'undefined') {
        const ordersRaw = localStorage.getItem(PRO_ORDERS_KEY);
        const orders = ordersRaw ? JSON.parse(ordersRaw) : {};
        const order = orders[orderId] as ProOrderDTO | undefined;
        if (!order) throw new ApiError('Không tìm thấy đơn hàng.', 404);
        if (order.status === 'paid') {
          return { success: true, replayed: true, orderId: order.orderId, plan: order.plan };
        }
        order.status = 'paid';
        order.completedAt = new Date().toISOString();
        orders[orderId] = order;
        localStorage.setItem(PRO_ORDERS_KEY, JSON.stringify(orders));

        const days: Record<ProPlan, number> = { monthly: 30, quarterly: 90, yearly: 365 };
        const durationDays = days[order.plan] || 30;
        const currentProRaw = localStorage.getItem(PRO_STORAGE_KEY);
        let baseTime = Date.now();
        if (currentProRaw) {
          try {
            const cur = JSON.parse(currentProRaw);
            if (cur.expiresAt && new Date(cur.expiresAt).getTime() > baseTime) {
              baseTime = new Date(cur.expiresAt).getTime();
            }
          } catch {}
        }
        const expiresAt = new Date(baseTime + durationDays * 24 * 60 * 60 * 1000).toISOString();
        const proStatus: ProStatusDTO = {
          tier: 'pro',
          isPro: true,
          expiresAt,
          plan: order.plan
        };
        localStorage.setItem(PRO_STORAGE_KEY, JSON.stringify(proStatus));
        return { success: true, replayed: false, orderId: order.orderId, plan: order.plan };
      }
      return { success: true, orderId, plan: 'monthly' };
    }
    return request<{ success: boolean; replayed?: boolean; orderId: string; plan: ProPlan }>('/pro/test/simulate-webhook', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  }
};



