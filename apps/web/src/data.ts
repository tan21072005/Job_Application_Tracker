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
  type CheckoutResultDTO,
  type AnalyticsSummaryDTO,
  type ApplicationGoalDTO,
  type ApplicationGoalInput,
  type AnalyticsTimeframe,
  calculateAnalyticsSummary,
  calculateGoalProgress,
  type ResumeVariantDTO,
  type ResumeExperienceDTO,
  type ResumeSkillGroupDTO,
  type ResumeTailorInput,
  type ResumeTailorResultDTO,
  type ResumeDiffItem,
  type KeywordCoverageDTO,
  tailorResumeForJob,
  validateResumeInput,
  validateResumeTailorInput,
  type CompanyProfileDTO,
  type CompanyReviewDTO,
  type CompanySalaryBenchmarkDTO,
  type CompanyCultureScoresDTO,
  type CompanyInterviewQuestionDTO,
  calculateCompanyAggregates,
  validateCompanyReviewInput,
  synthesizeCompanyIntelligence,
  type FollowUpLogDTO,
  type FollowUpCadenceStatusDTO,
  type FollowUpTemplateDTO,
  type GenerateFollowUpInput,
  type GeneratedFollowUpDraftDTO,
  DEFAULT_FOLLOW_UP_TEMPLATES,
  calculateFollowUpCadence,
  generateFollowUpEmail,
  validateFollowUpLogInput,
  type ContactType,
  type RelationshipStrength,
  type InteractionChannel,
  type ContactDTO,
  type ContactInteractionDTO,
  type ContactMutationInput,
  type InteractionMutationInput,
  type RelationshipHealthDTO,
  calculateRelationshipHealth,
  validateContactInput,
  validateInteractionInput,
  type ApplicationPriority,
  type StageSlaStatus,
  type PipelineMetadataInput,
  calculateStageSla,
  validatePipelineMetadataInput,
  DECISION_DIMENSIONS,
  type DecisionDimensionKey,
  type ApplicationScorecardInput,
  type DecisionMatrixComparison,
  type EvaluatedOpportunity,
  type CategoryWinner,
  DEFAULT_WEIGHT_PROFILE,
  normalizeWeights,
  evaluateDecisionMatrix,
  type ChatMessageDTO,
  type ChatActionReceiptDTO,
  type ChatResponseDTO,
  type ChatHistoryDTO,
  DEFAULT_SUGGESTED_CHAT_PROMPTS,
  type SkillDemandItemDTO,
  type SkillGapAnalysisDTO,
  type LearningMilestoneDTO,
  type CareerRoadmapDTO,
  type MilestoneStatus,
  extractSkillsFromApplications,
  generateCareerRoadmap,
  calculateRoadmapProgress,
  type EmailCategory,
  type ExtractedEmailEntityDTO,
  type IngestionActionType,
  type EmailIngestProposalDTO,
  type EmailIngestApplyResultDTO,
  parseEmailContent,
  generateIngestionProposal,
  type CampaignObjective,
  type OutreachTargetType,
  type OutreachChannel,
  type RecipientStatus,
  type OutreachStepDTO,
  type OutreachRecipientDTO,
  type OutreachCampaignDTO,
  type CampaignAnalyticsDTO,
  type CreateCampaignInputDTO,
  type AddRecipientInputDTO,
  type UpdateRecipientStepInputDTO,
  generateOutreachSequence,
  personalizeMessage,
  computeCampaignMetrics,
  type SimulationTrack,
  type SimulationDifficulty,
  type SimulationPacingMode,
  type TurnEvaluationDTO,
  type SimulationSessionReportDTO,
  type SimulationSessionDTO,
  type StartSimulationInputDTO,
  type SubmitTurnInputDTO,
  getPacingDurationSeconds,
  generateSimulationQuestions,
  evaluateSimulationTurn,
  synthesizeSessionReport,
  type PortfolioDisplaySettings,
  DEFAULT_DISPLAY_SETTINGS,
  type PortfolioConfigDTO,
  type DossierSkillItemDTO,
  type DossierRoadmapProgressDTO,
  type DossierSimulationReadinessDTO,
  type PublicDossierViewDTO,
  type ShareTokenDTO,
  type UpdatePortfolioInputDTO,
  type GenerateTokenInputDTO,
  synthesizePublicDossier,
  type Currency,
  type EquityType,
  type SeniorityLevel,
  type MarketComparisonStatus,
  type EquityGrantDTO,
  type CompensationPackageDTO,
  type EquityVestingMilestoneDTO,
  type AnnualCompensationBreakdownDTO,
  type CompensationForecastScenarioDTO,
  type CompensationBenchmarkDTO,
  type NegotiationLeveragePointDTO,
  type CompensationForecastDTO,
  type CreateCompensationForecastInputDTO,
  computeVestingSchedule,
  calculateNetTakeHomeVnd,
  forecastCompensationScenarios,
  evaluateMarketBenchmark,
  deriveNegotiationLeveragePoints,
  type TrackType,
  type PromotionDimension,
  type GapLevel,
  type PromotionCompetencyDTO,
  type PromotionInitiativeDTO,
  type PromotionReadinessDTO,
  type TrajectoryStepDTO,
  type TrajectorySimulationDTO,
  type SimulateTrajectoryInputDTO,
  type UpdateCompetenciesInputDTO,
  PROMOTION_DIMENSION_METADATA,
  recommendPromotionInitiatives,
  evaluatePromotionReadiness,
  simulateCareerTrajectory,
  type AtsKeywordCategory,
  type KeywordImportance,
  type KeywordGapItemDTO,
  type AtsDiagnosticScoreBreakdownDTO,
  type AtsDiagnosticResultDTO,
  type BulletVariantType,
  type XyzBreakdownDTO,
  type BulletVariantOptionDTO,
  type BulletOptimizationProposalDTO,
  type OptimizedResumeVariantDTO,
  type OptimizeResumeInputDTO,
  type RewriteBulletInputDTO,
  type ApplyRewritesInputDTO,
  ATS_KEYWORD_DICTIONARY,
  extractKeywordsFromText,
  extractBulletsFromResume,
  diagnoseAtsKeywordGaps,
  rewriteBulletPointsXyz,
  synthesizeOptimizedResume,
  type BottleneckSeverity,
  type StageConversionRateDTO,
  type BottleneckDiagnosticDTO,
  type VelocityTargetDTO,
  type PipelineVelocitySimulationDTO,
  type PipelineVelocityReportDTO,
  type CalculateVelocityReportInputDTO,
  type PipelineVelocitySimulationInputDTO,
  computeStageConversionMetrics,
  detectPipelineBottlenecks,
  calculateVelocityTargets,
  simulatePipelineOutcomes,
  type CultureDimension,
  type ReverseInterviewTargetRole,
  type CultureDimensionScoreDTO,
  type ReverseInterviewQuestionDTO,
  type CultureCompatibilityReportDTO,
  type AnalyzeCultureInputDTO,
  type CultureQuestionGenerationInputDTO,
  CULTURE_DIMENSION_LABELS,
  CULTURE_INDUSTRY_BENCHMARKS,
  evaluateCompanyCulture,
  generateReverseInterviewQuestions,
  type HeadhunterAgencyTier,
  type RecruiterRelationshipTier,
  type MandateExclusivity,
  type MandateStatus,
  type RecruiterReplyIntent,
  type HeadhunterAgencyDTO,
  type RecruiterLeadDTO,
  type HeadhunterMandateDTO,
  type InboundPitchParseResultDTO,
  type ParseRecruiterPitchInputDTO,
  type RecruiterResponseDraftDTO,
  type RecruiterLeadMutationInputDTO,
  type HeadhunterMandateMutationInputDTO,
  KNOWN_HEADHUNTER_AGENCIES,
  computeRecruiterRelationshipHealth,
  detectMandateConflict,
  parseInboundRecruiterPitch,
  generateRecruiterReplyDraft
} from '@jobtrack/contract';

export type {
  ResumeVariantDTO,
  ResumeExperienceDTO,
  ResumeSkillGroupDTO,
  ResumeTailorInput,
  ResumeTailorResultDTO,
  ResumeDiffItem,
  KeywordCoverageDTO,
  CompanyProfileDTO,
  CompanyReviewDTO,
  CompanySalaryBenchmarkDTO,
  CompanyCultureScoresDTO,
  CompanyInterviewQuestionDTO,
  FollowUpLogDTO,
  FollowUpCadenceStatusDTO,
  FollowUpTemplateDTO,
  GenerateFollowUpInput,
  GeneratedFollowUpDraftDTO,
  ContactType,
  RelationshipStrength,
  InteractionChannel,
  ContactDTO,
  ContactInteractionDTO,
  ContactMutationInput,
  InteractionMutationInput,
  RelationshipHealthDTO
};

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
  return value.map(a => ({
    ...a,
    priority: a.priority || 'target',
    tags: Array.isArray(a.tags) ? a.tags : [],
    statusUpdatedAt: a.statusUpdatedAt || a.appliedAt || a.createdAt,
    scorecard: a.scorecard || {}
  }));
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

  async chat(message: string, sessionId?: string): Promise<{ output?: string; text?: string; reply?: string }> {
    const res = await chatRepository.chat(message, sessionId);
    return {
      output: res.reply,
      text: res.reply,
      ...res
    };
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

const GOALS_STORAGE_KEY = 'jobtrack.analytics.goals.v1';

export const analyticsRepository = {
  async getSummary(timeframe: AnalyticsTimeframe = 'all'): Promise<AnalyticsSummaryDTO> {
    if (demoMode) {
      const apps = load();
      let goalsInput: ApplicationGoalInput = {};
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(GOALS_STORAGE_KEY);
        if (stored) {
          try {
            goalsInput = JSON.parse(stored);
          } catch {}
        }
      }
      const adapted = apps.map(a => ({
        id: a.id,
        company: a.company,
        position: a.position,
        source: a.source || null,
        status: a.status,
        appliedAt: a.appliedAt || null,
        createdAt: a.createdAt,
        updatedAt: a.createdAt,
        interviews: a.interviews
      }));
      return calculateAnalyticsSummary(adapted, goalsInput, { timeframe });
    }
    const query = timeframe !== 'all' ? `?timeframe=${encodeURIComponent(timeframe)}` : '';
    return request<AnalyticsSummaryDTO>(`/analytics/summary${query}`);
  },

  async getGoals(): Promise<ApplicationGoalDTO> {
    if (demoMode) {
      const apps = load();
      let goalsInput: ApplicationGoalInput = {};
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(GOALS_STORAGE_KEY);
        if (stored) {
          try {
            goalsInput = JSON.parse(stored);
          } catch {}
        }
      }
      return calculateGoalProgress(apps, goalsInput);
    }
    return request<ApplicationGoalDTO>('/analytics/goals');
  },

  async updateGoals(input: ApplicationGoalInput): Promise<ApplicationGoalDTO> {
    if (demoMode) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(input));
      }
      return this.getGoals();
    }
    return request<ApplicationGoalDTO>('/analytics/goals', {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  }
};

const RESUMES_STORAGE_KEY = 'jobtrack.resumes.v1';

const DEFAULT_DEMO_RESUME: ResumeVariantDTO = {
  id: 'resume-master-default',
  name: 'Bản CV Tiêu Chuẩn (Fullstack / Backend)',
  targetRole: 'Senior Software Engineer',
  summary: 'Kỹ sư phần mềm hơn 4 năm kinh nghiệm xây dựng hệ thống web phân tán, microservices hiệu năng cao và giải pháp cloud-native.',
  experiences: [
    {
      id: 'exp-1',
      company: 'Tech Innovations JSC',
      role: 'Senior Software Engineer',
      period: '2023 - Nay',
      bulletPoints: [
        'Thiết kế và phát triển kiến trúc Microservices phục vụ hơn 200,000 người dùng hàng ngày.',
        'Tối ưu hóa thời gian phản hồi API từ 450ms xuống 85ms bằng Redis caching và indexing PostgreSQL.',
        'Dẫn dắt chuyển đổi pipeline CI/CD sang Docker và GitHub Actions, giảm 50% thời gian triển khai.'
      ],
      technologies: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'Docker']
    },
    {
      id: 'exp-2',
      company: 'Global Software Solutions',
      role: 'Fullstack Developer',
      period: '2021 - 2023',
      bulletPoints: [
        'Xây dựng các module frontend responsive với React và Redux Toolkit.',
        'Tích hợp cổng thanh toán trực tuyến và hệ thống xác thực bảo mật OAuth 2.0 / JWT.'
      ],
      technologies: ['JavaScript', 'React', 'Node.js', 'MySQL', 'AWS']
    }
  ],
  skillGroups: [
    {
      category: 'Ngôn ngữ lập trình',
      skills: ['TypeScript', 'JavaScript', 'SQL', 'Go', 'HTML5', 'CSS3']
    },
    {
      category: 'Framework & Công cụ',
      skills: ['React', 'Node.js', 'Express', 'PostgreSQL', 'Redis', 'Docker', 'Git', 'CI/CD']
    }
  ],
  isMaster: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

function loadDemoResumes(): ResumeVariantDTO[] {
  if (typeof localStorage === 'undefined') return [DEFAULT_DEMO_RESUME];
  const stored = localStorage.getItem(RESUMES_STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify([DEFAULT_DEMO_RESUME]));
    return [DEFAULT_DEMO_RESUME];
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify([DEFAULT_DEMO_RESUME]));
  return [DEFAULT_DEMO_RESUME];
}

function saveDemoResumes(items: ResumeVariantDTO[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(RESUMES_STORAGE_KEY, JSON.stringify(items));
  }
}

export const resumeRepository = {
  async list(): Promise<ResumeVariantDTO[]> {
    if (demoMode) {
      return loadDemoResumes();
    }
    return request<ResumeVariantDTO[]>('/resumes');
  },

  async get(id: string): Promise<ResumeVariantDTO> {
    if (demoMode) {
      const items = loadDemoResumes();
      const item = items.find(r => r.id === id);
      if (!item) throw new ApiError('Không tìm thấy phiên bản CV.', 404);
      return item;
    }
    return request<ResumeVariantDTO>(`/resumes/${encodeURIComponent(id)}`);
  },

  async create(input: Omit<ResumeVariantDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResumeVariantDTO> {
    const val = validateResumeInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Thông tin CV không hợp lệ.', 422);
    }
    if (demoMode) {
      const items = loadDemoResumes();
      const id = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();
      if (input.isMaster) {
        items.forEach(r => { r.isMaster = false; });
      }
      const newItem: ResumeVariantDTO = {
        ...val.data,
        id,
        createdAt: now,
        updatedAt: now
      };
      items.unshift(newItem);
      saveDemoResumes(items);
      return newItem;
    }
    return request<ResumeVariantDTO>('/resumes', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async update(id: string, input: Omit<ResumeVariantDTO, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResumeVariantDTO> {
    const val = validateResumeInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Thông tin CV không hợp lệ.', 422);
    }
    if (demoMode) {
      const items = loadDemoResumes();
      const idx = items.findIndex(r => r.id === id);
      if (idx === -1) throw new ApiError('Không tìm thấy phiên bản CV.', 404);
      if (input.isMaster) {
        items.forEach(r => {
          if (r.id !== id) r.isMaster = false;
        });
      }
      const updated: ResumeVariantDTO = {
        ...val.data,
        id,
        createdAt: items[idx].createdAt,
        updatedAt: new Date().toISOString()
      };
      items[idx] = updated;
      saveDemoResumes(items);
      return updated;
    }
    return request<ResumeVariantDTO>(`/resumes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  },

  async delete(id: string): Promise<void> {
    if (demoMode) {
      const items = loadDemoResumes();
      const filtered = items.filter(r => r.id !== id);
      if (filtered.length === items.length) {
        throw new ApiError('Không tìm thấy phiên bản CV để xóa.', 404);
      }
      saveDemoResumes(filtered);
      return;
    }
    await request<void>(`/resumes/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async tailor(input: ResumeTailorInput): Promise<ResumeTailorResultDTO> {
    const val = validateResumeTailorInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Yêu cầu may đo CV chưa hợp lệ.', 422);
    }
    if (demoMode) {
      const items = loadDemoResumes();
      let base: ResumeVariantDTO | undefined;
      if (input.resumeId) {
        base = items.find(r => r.id === input.resumeId);
      } else if (input.baseResume && input.baseResume.name) {
        base = {
          id: 'temp-base',
          name: input.baseResume.name,
          targetRole: input.baseResume.targetRole,
          summary: input.baseResume.summary || '',
          experiences: input.baseResume.experiences || [],
          skillGroups: input.baseResume.skillGroups || [],
          isMaster: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        base = items.find(r => r.isMaster) || items[0] || DEFAULT_DEMO_RESUME;
      }
      if (!base) base = DEFAULT_DEMO_RESUME;
      return tailorResumeForJob(base, input.jobDetails);
    }
    return request<ResumeTailorResultDTO>('/resumes/tailor', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};

const COMPANIES_STORAGE_KEY = 'jobtrack.companies.v1';

function loadDemoCompanies(): Record<string, CompanyProfileDTO> {
  if (typeof localStorage === 'undefined') return {};
  const stored = localStorage.getItem(COMPANIES_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveDemoCompanies(map: Record<string, CompanyProfileDTO>): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(map));
  }
}

export const companyRepository = {
  async get(name: string): Promise<CompanyProfileDTO> {
    const cleanName = (name || '').trim();
    if (demoMode) {
      const map = loadDemoCompanies();
      const existing = map[cleanName.toLowerCase()];
      if (existing) return existing;
      const synthesized = synthesizeCompanyIntelligence(cleanName);
      map[cleanName.toLowerCase()] = synthesized;
      saveDemoCompanies(map);
      return synthesized;
    }
    return request<CompanyProfileDTO>(`/companies/${encodeURIComponent(cleanName)}`);
  },

  async addReview(name: string, input: unknown): Promise<CompanyReviewDTO> {
    const cleanName = (name || '').trim();
    const payload = (typeof input === 'object' && input !== null) ? { companyName: cleanName, ...input } : input;
    const val = validateCompanyReviewInput(payload);
    if (!val.ok) {
      throw new ApiError(val.message || 'Thông tin đánh giá chưa hợp lệ.', 422);
    }

    if (demoMode) {
      const map = loadDemoCompanies();
      let profile = map[cleanName.toLowerCase()];
      if (!profile) {
        profile = synthesizeCompanyIntelligence(cleanName);
      }
      const newReview: CompanyReviewDTO = {
        id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        companyName: cleanName,
        role: val.data.role,
        rating: val.data.rating,
        workLifeBalance: val.data.workLifeBalance,
        compensationRating: val.data.compensationRating,
        careerGrowth: val.data.careerGrowth,
        managementRating: val.data.managementRating,
        recommend: val.data.recommend,
        pros: val.data.pros,
        cons: val.data.cons,
        advice: val.data.advice,
        createdAt: new Date().toISOString()
      };
      profile.recentReviews = [newReview, ...(profile.recentReviews || [])];
      profile.cultureScores = calculateCompanyAggregates(profile.recentReviews);
      map[cleanName.toLowerCase()] = profile;
      saveDemoCompanies(map);
      return newReview;
    }

    return request<CompanyReviewDTO>(`/companies/${encodeURIComponent(cleanName)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async getSalaries(name: string): Promise<CompanySalaryBenchmarkDTO[]> {
    const cleanName = (name || '').trim();
    if (demoMode) {
      const prof = await this.get(cleanName);
      return prof.salaryBenchmarks;
    }
    return request<CompanySalaryBenchmarkDTO[]>(`/companies/${encodeURIComponent(cleanName)}/salaries`);
  }
};

const FOLLOW_UP_STORAGE_KEY = 'jobtrack.follow_ups.v1';

function loadDemoFollowUpLogs(): Record<string, FollowUpLogDTO[]> {
  if (typeof localStorage === 'undefined') return {};
  const stored = localStorage.getItem(FOLLOW_UP_STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveDemoFollowUpLogs(map: Record<string, FollowUpLogDTO[]>): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FOLLOW_UP_STORAGE_KEY, JSON.stringify(map));
  }
}

export const followUpRepository = {
  async getFollowUps(appId: string): Promise<{ cadence: FollowUpCadenceStatusDTO; templates: FollowUpTemplateDTO[]; logs: FollowUpLogDTO[] }> {
    if (demoMode) {
      const apps = load();
      const app = apps.find(a => a.id === appId);
      if (!app) throw new ApiError('Hồ sơ không tồn tại hoặc đã bị xóa.', 404);
      const allLogs = loadDemoFollowUpLogs();
      const logs = allLogs[appId] || [];
      const lastDate = logs[0]?.sentAt || app.interviews?.[0]?.at || app.appliedAt || app.createdAt;
      const cadence = calculateFollowUpCadence(app.id, app.status as any, lastDate);
      return {
        cadence,
        templates: DEFAULT_FOLLOW_UP_TEMPLATES,
        logs
      };
    }
    return request<{ cadence: FollowUpCadenceStatusDTO; templates: FollowUpTemplateDTO[]; logs: FollowUpLogDTO[] }>(
      `/applications/${encodeURIComponent(appId)}/follow-ups`
    );
  },

  async generateDraft(appId: string, input: Partial<GenerateFollowUpInput>): Promise<GeneratedFollowUpDraftDTO> {
    if (demoMode) {
      const apps = load();
      const app = apps.find(a => a.id === appId);
      if (!app) throw new ApiError('Hồ sơ không tồn tại hoặc đã bị xóa.', 404);
      const fullInput: GenerateFollowUpInput = {
        company: app.company,
        position: app.position,
        stage: (input.stage || app.status) as any,
        tone: input.tone || 'polite_check_in',
        candidateName: input.candidateName || 'Ứng viên',
        recruiterName: input.recruiterName,
        interviewRound: input.interviewRound,
        discussionHighlight: input.discussionHighlight,
        additionalNotes: input.additionalNotes
      };
      return generateFollowUpEmail(fullInput);
    }
    return request<GeneratedFollowUpDraftDTO>(
      `/applications/${encodeURIComponent(appId)}/follow-ups/generate`,
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
  },

  async createLog(
    appId: string,
    input: {
      stage: string;
      tone: string;
      recipientEmail?: string;
      subject: string;
      body: string;
      notes?: string;
    }
  ): Promise<FollowUpLogDTO> {
    const val = validateFollowUpLogInput({ applicationId: appId, ...input });
    if (!val.ok) {
      throw new ApiError(val.message || 'Dữ liệu nhật ký follow-up chưa hợp lệ.', 422);
    }
    if (demoMode) {
      const allLogs = loadDemoFollowUpLogs();
      const existing = allLogs[appId] || [];
      const newLog: FollowUpLogDTO = {
        id: `ful-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        applicationId: appId,
        userId: 'demo-user',
        stage: val.data.stage,
        tone: val.data.tone,
        recipientEmail: val.data.recipientEmail || undefined,
        subject: val.data.subject,
        body: val.data.body,
        notes: val.data.notes || undefined,
        sentAt: val.data.sentAt || new Date().toISOString()
      };
      allLogs[appId] = [newLog, ...existing];
      saveDemoFollowUpLogs(allLogs);
      return newLog;
    }
    return request<FollowUpLogDTO>(
      `/applications/${encodeURIComponent(appId)}/follow-ups/logs`,
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
  },

  async getDueFollowUps(): Promise<FollowUpCadenceStatusDTO[]> {
    if (demoMode) {
      const apps = load();
      const activeApps = apps.filter(a => !['rejected', 'withdrawn', 'archived'].includes(a.status.toLowerCase()));
      const allLogs = loadDemoFollowUpLogs();
      const dueList: FollowUpCadenceStatusDTO[] = [];
      for (const app of activeApps) {
        const logs = allLogs[app.id] || [];
        const lastDate = logs[0]?.sentAt || app.interviews?.[0]?.at || app.appliedAt || app.createdAt;
        const cadence = calculateFollowUpCadence(app.id, app.status as any, lastDate);
        if (cadence.urgency === 'due' || cadence.urgency === 'overdue') {
          dueList.push(cadence);
        }
      }
      return dueList.sort((a, b) => {
        if (a.urgency === 'overdue' && b.urgency !== 'overdue') return -1;
        if (b.urgency === 'overdue' && a.urgency !== 'overdue') return 1;
        return b.daysSinceLastInteraction - a.daysSinceLastInteraction;
      });
    }
    return request<FollowUpCadenceStatusDTO[]>('/follow-ups/due');
  }
};

const CONTACTS_STORAGE_KEY = 'jobtrack.contacts.v1';
const CONTACT_INTERACTIONS_STORAGE_KEY = 'jobtrack.contact_interactions.v1';

function initialDemoContacts(): ContactDTO[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      id: 'cnt-demo-1',
      name: 'Nguyễn Hoàng Nam',
      company: 'Shopee Vietnam',
      role: 'Senior Technical Recruiter',
      type: 'recruiter',
      email: 'nam.nguyen@shopee.example.com',
      phone: '0901234567',
      linkedinUrl: 'https://linkedin.com/in/nam-recruiter',
      relationshipStrength: 'in_touch',
      notes: 'Liên hệ qua LinkedIn về vị trí Senior Backend Engineer. Trao đổi rất tích cực.',
      lastContactedAt: new Date(now - 5 * day).toISOString(),
      createdAt: new Date(now - 10 * day).toISOString(),
      updatedAt: new Date(now - 5 * day).toISOString()
    },
    {
      id: 'cnt-demo-2',
      name: 'Trần Thị Mai Anh',
      company: 'VNG Corporation',
      role: 'Engineering Director',
      type: 'hiring_manager',
      email: 'maianh.tran@vng.example.com',
      linkedinUrl: 'https://linkedin.com/in/maianh-vng',
      relationshipStrength: 'advocate',
      notes: 'Phỏng vấn kỹ thuật vòng System Design. Đã trao đổi về định hướng nền tảng.',
      lastContactedAt: new Date(now - 35 * day).toISOString(),
      createdAt: new Date(now - 40 * day).toISOString(),
      updatedAt: new Date(now - 35 * day).toISOString()
    },
    {
      id: 'cnt-demo-3',
      name: 'Lê Quốc Bảo',
      company: 'FPT Software',
      role: 'Principal Architect',
      type: 'mentor',
      email: 'baolq@fpt.example.com',
      phone: '0912345678',
      relationshipStrength: 'in_touch',
      notes: 'Mentor hướng dẫn định hướng kiến trúc Microservices và Cloud Native.',
      lastContactedAt: new Date(now - 12 * day).toISOString(),
      createdAt: new Date(now - 60 * day).toISOString(),
      updatedAt: new Date(now - 12 * day).toISOString()
    },
    {
      id: 'cnt-demo-4',
      name: 'Hoàng Minh Tuấn',
      company: 'Tiki',
      role: 'Staff Engineer (Người giới thiệu)',
      type: 'referrer',
      email: 'tuan.hoang@tiki.example.com',
      relationshipStrength: 'dormant',
      notes: 'Bạn đại học, đã giới thiệu vào vị trí Lead Golang năm ngoái.',
      lastContactedAt: new Date(now - 95 * day).toISOString(),
      createdAt: new Date(now - 120 * day).toISOString(),
      updatedAt: new Date(now - 95 * day).toISOString()
    }
  ];
}

function initialDemoInteractions(): Record<string, ContactInteractionDTO[]> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return {
    'cnt-demo-1': [
      {
        id: 'int-demo-1',
        contactId: 'cnt-demo-1',
        channel: 'linkedin',
        summary: 'Trao đổi qua tin nhắn về dải lương và phúc lợi của Shopee',
        details: 'Nam chia sẻ chế độ hybrid 2 ngày/tuần, dải lương gross cạnh tranh.',
        date: new Date(now - 5 * day).toISOString(),
        createdAt: new Date(now - 5 * day).toISOString()
      }
    ],
    'cnt-demo-2': [
      {
        id: 'int-demo-2',
        contactId: 'cnt-demo-2',
        channel: 'interview',
        summary: 'Phỏng vấn chuyên sâu kiến trúc hệ thống phân tán',
        details: 'Chị Mai Anh đánh giá cao phần tối ưu cache và message queue.',
        date: new Date(now - 35 * day).toISOString(),
        createdAt: new Date(now - 35 * day).toISOString()
      }
    ]
  };
}

function loadDemoContacts(): ContactDTO[] {
  if (typeof localStorage === 'undefined') return initialDemoContacts();
  const stored = localStorage.getItem(CONTACTS_STORAGE_KEY);
  if (!stored) {
    const init = initialDemoContacts();
    saveDemoContacts(init);
    return init;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialDemoContacts();
  }
}

function saveDemoContacts(list: ContactDTO[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(list));
  }
}

function loadDemoInteractions(): Record<string, ContactInteractionDTO[]> {
  if (typeof localStorage === 'undefined') return initialDemoInteractions();
  const stored = localStorage.getItem(CONTACT_INTERACTIONS_STORAGE_KEY);
  if (!stored) {
    const init = initialDemoInteractions();
    saveDemoInteractions(init);
    return init;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return initialDemoInteractions();
  }
}

function saveDemoInteractions(map: Record<string, ContactInteractionDTO[]>): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(CONTACT_INTERACTIONS_STORAGE_KEY, JSON.stringify(map));
  }
}

export const contactRepository = {
  async list(filters?: { query?: string; company?: string; type?: string; strength?: string }): Promise<(ContactDTO & { health: RelationshipHealthDTO })[]> {
    if (demoMode) {
      let list = loadDemoContacts();
      if (filters?.query) {
        const q = filters.query.toLowerCase();
        list = list.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          (c.role && c.role.toLowerCase().includes(q))
        );
      }
      if (filters?.company) {
        list = list.filter(c => c.company === filters.company);
      }
      if (filters?.type) {
        list = list.filter(c => c.type === filters.type);
      }
      if (filters?.strength) {
        list = list.filter(c => c.relationshipStrength === filters.strength);
      }
      return list.map(c => ({
        ...c,
        health: calculateRelationshipHealth(c)
      }));
    }

    const params = new URLSearchParams();
    if (filters?.query) params.set('query', filters.query);
    if (filters?.company) params.set('company', filters.company);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.strength) params.set('strength', filters.strength);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<(ContactDTO & { health: RelationshipHealthDTO })[]>(`/contacts${qs}`);
  },

  async get(id: string): Promise<{ contact: ContactDTO; interactions: ContactInteractionDTO[]; health: RelationshipHealthDTO }> {
    if (demoMode) {
      const contacts = loadDemoContacts();
      const contact = contacts.find(c => c.id === id);
      if (!contact) throw new ApiError('Không tìm thấy người liên hệ.', 404);
      const allInteractions = loadDemoInteractions();
      const interactions = allInteractions[id] || [];
      const health = calculateRelationshipHealth(contact, interactions[0]?.date);
      return { contact, interactions, health };
    }
    return request<{ contact: ContactDTO; interactions: ContactInteractionDTO[]; health: RelationshipHealthDTO }>(`/contacts/${encodeURIComponent(id)}`);
  },

  async create(input: ContactMutationInput): Promise<ContactDTO> {
    const val = validateContactInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Dữ liệu người liên hệ không hợp lệ.', 422);
    }
    if (demoMode) {
      const contacts = loadDemoContacts();
      const now = new Date().toISOString();
      const newContact: ContactDTO = {
        id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: val.data.name,
        company: val.data.company,
        role: val.data.role,
        type: val.data.type || 'recruiter',
        email: val.data.email,
        phone: val.data.phone,
        linkedinUrl: val.data.linkedinUrl,
        relationshipStrength: val.data.relationshipStrength || 'connected',
        applicationId: val.data.applicationId,
        notes: val.data.notes,
        lastContactedAt: val.data.lastContactedAt || now,
        createdAt: now,
        updatedAt: now
      };
      contacts.unshift(newContact);
      saveDemoContacts(contacts);
      return newContact;
    }
    return request<ContactDTO>('/contacts', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async update(id: string, input: Partial<ContactMutationInput>): Promise<ContactDTO> {
    if (demoMode) {
      const contacts = loadDemoContacts();
      const idx = contacts.findIndex(c => c.id === id);
      if (idx === -1) throw new ApiError('Không tìm thấy người liên hệ.', 404);
      const existing = contacts[idx];
      const merged = { ...existing, ...input };
      const val = validateContactInput(merged);
      if (!val.ok) {
        throw new ApiError(val.message || 'Dữ liệu cập nhật người liên hệ không hợp lệ.', 422);
      }
      const updated: ContactDTO = {
        ...existing,
        name: val.data.name,
        company: val.data.company,
        role: val.data.role,
        type: val.data.type || existing.type,
        email: val.data.email,
        phone: val.data.phone,
        linkedinUrl: val.data.linkedinUrl,
        relationshipStrength: val.data.relationshipStrength || existing.relationshipStrength,
        applicationId: val.data.applicationId,
        notes: val.data.notes,
        lastContactedAt: val.data.lastContactedAt,
        updatedAt: new Date().toISOString()
      };
      contacts[idx] = updated;
      saveDemoContacts(contacts);
      return updated;
    }
    return request<ContactDTO>(`/contacts/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async delete(id: string): Promise<void> {
    if (demoMode) {
      let contacts = loadDemoContacts();
      contacts = contacts.filter(c => c.id !== id);
      saveDemoContacts(contacts);
      const allInteractions = loadDemoInteractions();
      delete allInteractions[id];
      saveDemoInteractions(allInteractions);
      return;
    }
    return request<void>(`/contacts/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  },

  async addInteraction(contactId: string, input: InteractionMutationInput): Promise<ContactInteractionDTO> {
    const val = validateInteractionInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Dữ liệu tương tác không hợp lệ.', 422);
    }
    if (demoMode) {
      const contacts = loadDemoContacts();
      const cIdx = contacts.findIndex(c => c.id === contactId);
      if (cIdx === -1) throw new ApiError('Không tìm thấy người liên hệ.', 404);

      const allInteractions = loadDemoInteractions();
      const existing = allInteractions[contactId] || [];
      const newInteraction: ContactInteractionDTO = {
        id: `int-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        contactId,
        channel: val.data.channel,
        summary: val.data.summary,
        details: val.data.details,
        date: val.data.date || new Date().toISOString(),
        followUpDate: val.data.followUpDate,
        createdAt: new Date().toISOString()
      };
      allInteractions[contactId] = [newInteraction, ...existing];
      saveDemoInteractions(allInteractions);

      contacts[cIdx].lastContactedAt = newInteraction.date;
      contacts[cIdx].updatedAt = new Date().toISOString();
      saveDemoContacts(contacts);

      return newInteraction;
    }
    return request<ContactInteractionDTO>(`/contacts/${encodeURIComponent(contactId)}/interactions`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async getReconnectDue(): Promise<(ContactDTO & { health: RelationshipHealthDTO })[]> {
    if (demoMode) {
      const all = await this.list();
      return all
        .filter(c => c.health.isReconnectDue || c.health.isDormant)
        .sort((a, b) => b.health.daysSinceLastContact - a.health.daysSinceLastContact);
    }
    return request<(ContactDTO & { health: RelationshipHealthDTO })[]>('/contacts/reconnect-due');
  }
};

export interface StagnantApplicationItemDTO {
  applicationId: string;
  company: string;
  position: string;
  status: Status;
  priority: ApplicationPriority;
  tags: string[];
  sla: StageSlaStatus;
}

export interface PipelineSummaryDTO {
  totalApplications: number;
  statusCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  tagCounts: Record<string, number>;
  stagnantCount: number;
}

export const pipelineRepository = {
  async update(applicationId: string, input: PipelineMetadataInput): Promise<Application> {
    const val = validatePipelineMetadataInput(input);
    if (!val.ok) {
      throw new ApiError(val.message || 'Dữ liệu tiến độ không hợp lệ.', 422);
    }
    if (demoMode) {
      const apps = await repository.list();
      const idx = apps.findIndex(a => a.id === applicationId);
      if (idx === -1) throw new ApiError('Không tìm thấy hồ sơ.', 404);
      const current = apps[idx];
      const updated: Application = {
        ...current,
        priority: val.data.priority !== undefined ? val.data.priority : (current.priority || 'target'),
        tags: val.data.tags !== undefined ? val.data.tags : (current.tags || []),
        statusUpdatedAt: val.data.statusUpdatedAt || current.statusUpdatedAt || new Date().toISOString()
      };
      apps[idx] = updated;
      store(apps);
      return updated;
    }
    const res = await request<ApplicationWireDTO>(`/applications/${encodeURIComponent(applicationId)}/pipeline`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
    return wireApplicationToUI(res) as Application;
  },

  async getStagnant(): Promise<StagnantApplicationItemDTO[]> {
    if (demoMode) {
      const apps = await repository.list();
      const stagnantList: StagnantApplicationItemDTO[] = [];
      for (const a of apps) {
        if (a.status === 'Rejected' || a.status === 'Withdrawn' || a.deletedAt) continue;
        const refDate = a.statusUpdatedAt || (a.appliedAt ? `${a.appliedAt}T00:00:00Z` : a.createdAt);
        const sla = calculateStageSla(a.status, refDate);
        if (sla.isStagnant) {
          stagnantList.push({
            applicationId: a.id,
            company: a.company,
            position: a.position,
            status: a.status,
            priority: a.priority || 'target',
            tags: a.tags || [],
            sla
          });
        }
      }
      return stagnantList.sort((a, b) => {
        if (a.sla.slaSeverity === 'critical' && b.sla.slaSeverity !== 'critical') return -1;
        if (b.sla.slaSeverity === 'critical' && a.sla.slaSeverity !== 'critical') return 1;
        return b.sla.daysInStage - a.sla.daysInStage;
      });
    }
    return request<StagnantApplicationItemDTO[]>('/applications/stagnant');
  },

  async getSummary(): Promise<PipelineSummaryDTO> {
    if (demoMode) {
      const apps = await repository.list();
      const activeApps = apps.filter(a => !a.deletedAt);
      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = { urgent: 0, target: 0, safety: 0, backlog: 0 };
      const tagCounts: Record<string, number> = {};
      let stagnantCount = 0;

      for (const a of activeApps) {
        statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
        const p = a.priority || 'target';
        if (priorityCounts[p] !== undefined) {
          priorityCounts[p]++;
        }
        if (Array.isArray(a.tags)) {
          for (const t of a.tags) {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          }
        }
        if (a.status !== 'Rejected' && a.status !== 'Withdrawn') {
          const refDate = a.statusUpdatedAt || (a.appliedAt ? `${a.appliedAt}T00:00:00Z` : a.createdAt);
          const sla = calculateStageSla(a.status, refDate);
          if (sla.isStagnant) {
            stagnantCount++;
          }
        }
      }

      return {
        totalApplications: activeApps.length,
        statusCounts,
        priorityCounts,
        tagCounts,
        stagnantCount
      };
    }
    return request<PipelineSummaryDTO>('/pipeline/summary');
  }
};

export const decisionRepository = {
  async getWeights(): Promise<Record<DecisionDimensionKey, number>> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') return { ...DEFAULT_WEIGHT_PROFILE };
      const raw = localStorage.getItem('jobtrack.decision_weights.v1');
      if (!raw) return { ...DEFAULT_WEIGHT_PROFILE };
      try {
        return normalizeWeights(JSON.parse(raw));
      } catch {
        return { ...DEFAULT_WEIGHT_PROFILE };
      }
    }
    return request<Record<DecisionDimensionKey, number>>('/decision-matrix/weights');
  },

  async saveWeights(weights: Record<DecisionDimensionKey, number>): Promise<Record<DecisionDimensionKey, number>> {
    const normalized = normalizeWeights(weights);
    if (demoMode) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('jobtrack.decision_weights.v1', JSON.stringify(normalized));
      }
      return normalized;
    }
    return request<Record<DecisionDimensionKey, number>>('/decision-matrix/weights', {
      method: 'PUT',
      body: JSON.stringify(normalized)
    });
  },

  async getScorecard(applicationId: string): Promise<{
    id: string;
    company: string;
    position: string;
    scorecard: Record<DecisionDimensionKey, number>;
    notes?: string;
  }> {
    if (demoMode) {
      const apps = load();
      const app = apps.find(a => a.id === applicationId);
      if (!app) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
      const safeScores: Record<DecisionDimensionKey, number> = {
        compensation: 5,
        work_life_balance: 5,
        career_growth: 5,
        company_culture: 5,
        commute_flexibility: 5,
        leadership_team: 5,
        tech_stack: 5
      };
      if (app.scorecard) {
        for (const k of DECISION_DIMENSIONS) {
          if (typeof app.scorecard[k] === 'number') {
            safeScores[k] = app.scorecard[k];
          }
        }
      }
      return {
        id: app.id,
        company: app.company,
        position: app.position,
        scorecard: safeScores
      };
    }
    return request<{
      id: string;
      company: string;
      position: string;
      scorecard: Record<DecisionDimensionKey, number>;
      notes?: string;
    }>(`/applications/${applicationId}/scorecard`);
  },

  async updateScorecard(applicationId: string, input: ApplicationScorecardInput): Promise<{
    id: string;
    company: string;
    position: string;
    scorecard: Record<DecisionDimensionKey, number>;
    notes?: string;
  }> {
    if (demoMode) {
      const apps = load();
      const idx = apps.findIndex(a => a.id === applicationId);
      if (idx === -1) throw new Error('Không tìm thấy hồ sơ ứng tuyển.');
      apps[idx].scorecard = { ...input.scores };
      store(apps);
      return {
        id: apps[idx].id,
        company: apps[idx].company,
        position: apps[idx].position,
        scorecard: input.scores,
        notes: input.notes
      };
    }
    return request<{
      id: string;
      company: string;
      position: string;
      scorecard: Record<DecisionDimensionKey, number>;
      notes?: string;
    }>(`/applications/${applicationId}/scorecard`, {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  },

  async getMatrix(applicationIds?: string[]): Promise<DecisionMatrixComparison> {
    if (demoMode) {
      const weights = await this.getWeights();
      const apps = await repository.list();
      let active = apps.filter(a => !a.deletedAt);
      if (applicationIds && applicationIds.length > 0) {
        const idSet = new Set(applicationIds);
        active = active.filter(a => idSet.has(a.id));
      }
      const items = active.map(a => ({
        id: a.id,
        company: a.company,
        position: a.position,
        status: a.status,
        scores: a.scorecard || {}
      }));
      return evaluateDecisionMatrix(items, weights);
    }
    const query = applicationIds && applicationIds.length > 0 ? `?ids=${applicationIds.join(',')}` : '';
    return request<DecisionMatrixComparison>(`/decision-matrix${query}`);
  }
};

const CHAT_HISTORY_KEY = 'jobtrack.chat_history.v1';

export const chatRepository = {
  async chat(message: string, sessionId = 'default', context?: Record<string, unknown>): Promise<ChatResponseDTO> {
    if (demoMode) {
      const apps = load();
      const lower = message.toLowerCase();
      let reply = '';
      const receipts: ChatActionReceiptDTO[] = [];

      if (lower.includes('hôm nay') || lower.includes('làm gì') || lower.includes('deadline')) {
        const withDeadline = apps.filter(a => a.deadline);
        const interviews = apps.flatMap(a => (a.interviews || []).map(i => ({ ...i, company: a.company, position: a.position })));
        reply = `📋 **Kế hoạch công việc hôm nay (Demo):**\n\n` +
          `• Tổng quan: Bạn có **${apps.length} hồ sơ** đang theo dõi.\n`;
        if (interviews.length > 0) {
          reply += `\n🎯 **Lịch phỏng vấn sắp tới:**\n` +
            interviews.slice(0, 3).map(i => `  - **${i.company}** (${i.position}): ${i.title} vào lúc ${i.at}`).join('\n') + '\n';
        }
        if (withDeadline.length > 0) {
          reply += `\n⏰ **Deadline & Bước tiếp theo:**\n` +
            withDeadline.slice(0, 3).map(a => `  - **${a.company}**: "${a.nextAction || 'Cần cập nhật'}" (Hạn chót: ${a.deadline})`).join('\n') + '\n';
        }
      } else if (lower.includes('phỏng vấn') || lower.includes('chuẩn bị')) {
        reply = `🎯 **Chuẩn bị phỏng vấn (Demo):**\n\n` +
          `1. Xem lại JD và các dự án liên quan.\n` +
          `2. Chuẩn bị 2-3 câu chuyện STAR thực tế.\n` +
          `3. Đặt câu hỏi về lộ trình phát triển và kỳ vọng trong 90 ngày đầu.`;
      } else if (lower.includes('so sánh') || lower.includes('đánh giá') || lower.includes('cơ hội')) {
        reply = `⚖️ **So sánh cơ hội (Demo):** Bạn có thể nhấn vào nút "So sánh cơ hội" trên thanh công cụ để xem ma trận xếp hạng các công ty theo 7 tiêu chí quan trọng nhất!`;
      } else {
        reply = `[JobTrack AI Demo] Tôi đã nhận được tin nhắn: "${message}". Bạn đang quản lý ${apps.length} hồ sơ ứng tuyển trong hệ thống.`;
      }

      const userMsg: ChatMessageDTO = {
        id: `demo-msg-${Date.now()}-u`,
        sender: 'user',
        message,
        createdAt: new Date().toISOString()
      };
      const botMsg: ChatMessageDTO = {
        id: `demo-msg-${Date.now()}-b`,
        sender: 'assistant',
        message: reply,
        receipts,
        provenance: 'local_fallback',
        createdAt: new Date().toISOString()
      };

      if (typeof localStorage !== 'undefined') {
        const existingRaw = localStorage.getItem(CHAT_HISTORY_KEY);
        let historyMap: Record<string, ChatMessageDTO[]> = {};
        try {
          if (existingRaw) historyMap = JSON.parse(existingRaw);
        } catch {
          historyMap = {};
        }
        if (!historyMap[sessionId]) historyMap[sessionId] = [];
        historyMap[sessionId].push(userMsg, botMsg);
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyMap));
      }

      return {
        reply,
        sessionId,
        receipts,
        provenance: 'local_fallback',
        suggestedPrompts: [...DEFAULT_SUGGESTED_CHAT_PROMPTS],
        timestamp: new Date().toISOString()
      };
    }

    return request<ChatResponseDTO>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId, context })
    });
  },

  async getHistory(sessionId = 'default'): Promise<ChatHistoryDTO> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') {
        return { sessionId, messages: [], total: 0 };
      }
      const existingRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      let historyMap: Record<string, ChatMessageDTO[]> = {};
      try {
        if (existingRaw) historyMap = JSON.parse(existingRaw);
      } catch {
        historyMap = {};
      }
      const messages = historyMap[sessionId] || [];
      return {
        sessionId,
        messages,
        total: messages.length
      };
    }
    return request<ChatHistoryDTO>(`/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
  },

  async clearHistory(sessionId = 'default'): Promise<{ success: boolean; cleared: number }> {
    if (demoMode) {
      if (typeof localStorage === 'undefined') {
        return { success: true, cleared: 0 };
      }
      const existingRaw = localStorage.getItem(CHAT_HISTORY_KEY);
      let historyMap: Record<string, ChatMessageDTO[]> = {};
      try {
        if (existingRaw) historyMap = JSON.parse(existingRaw);
      } catch {
        historyMap = {};
      }
      const count = (historyMap[sessionId] || []).length;
      delete historyMap[sessionId];
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(historyMap));
      return { success: true, cleared: count };
    }
    return request<{ success: boolean; cleared: number }>(`/ai/chat/history?sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE'
    });
  }
};

export type {
  ChatMessageDTO,
  ChatActionReceiptDTO,
  ChatResponseDTO,
  ChatHistoryDTO,
  SkillDemandItemDTO,
  SkillGapAnalysisDTO,
  LearningMilestoneDTO,
  CareerRoadmapDTO,
  MilestoneStatus
};

const CAREER_ROADMAP_STORAGE_KEY = 'jobtrack.career_roadmap.v1';

export const careerRoadmapRepository = {
  async getGapAnalysis(): Promise<SkillGapAnalysisDTO> {
    if (demoMode) {
      const apps = await repository.list();
      const profile = await profileRepository.get();
      const appsForAnalysis = apps.map(a => ({
        company: a.company,
        position: a.position,
        notes: a.notes || null
      }));
      return extractSkillsFromApplications(appsForAnalysis, profile?.skills || []);
    }
    return request<SkillGapAnalysisDTO>('/career/skill-gap');
  },

  async getRoadmap(): Promise<CareerRoadmapDTO> {
    if (demoMode) {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CAREER_ROADMAP_STORAGE_KEY);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {}
        }
      }
      const gap = await this.getGapAnalysis();
      const generated = generateCareerRoadmap(gap);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CAREER_ROADMAP_STORAGE_KEY, JSON.stringify(generated));
      }
      return generated;
    }
    return request<CareerRoadmapDTO>('/career/roadmap');
  },

  async generateRoadmap(options: { targetRole?: string; focusSkills?: string[] } = {}): Promise<CareerRoadmapDTO> {
    if (demoMode) {
      const gap = await this.getGapAnalysis();
      if (options.focusSkills && options.focusSkills.length > 0) {
        gap.recommendedFocusSkills = options.focusSkills;
      }
      const targetRole = options.targetRole?.trim() || 'Senior Software Specialist';
      const generated = generateCareerRoadmap(gap, targetRole);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CAREER_ROADMAP_STORAGE_KEY, JSON.stringify(generated));
      }
      return generated;
    }
    return request<CareerRoadmapDTO>('/career/roadmap/generate', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  async updateMilestone(milestoneId: string, status: MilestoneStatus): Promise<CareerRoadmapDTO> {
    if (demoMode) {
      const current = await this.getRoadmap();
      const idx = current.milestones.findIndex(m => m.id === milestoneId);
      if (idx !== -1) {
        current.milestones[idx] = {
          ...current.milestones[idx],
          status,
          completedAt: status === 'completed' ? new Date().toISOString() : null
        };
        current.overallProgressPercent = calculateRoadmapProgress(current.milestones);
        current.updatedAt = new Date().toISOString();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CAREER_ROADMAP_STORAGE_KEY, JSON.stringify(current));
        }
      }
      return current;
    }
    return request<CareerRoadmapDTO>(`/career/roadmap/milestones/${encodeURIComponent(milestoneId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }
};

export const roadmapRepository = careerRoadmapRepository;

export const emailIngestRepository = {
  async parseEmail(content: string, subject?: string, sender?: string): Promise<EmailIngestProposalDTO> {
    if (demoMode) {
      const apps = await repository.list();
      const extracted = parseEmailContent(content, subject, sender);
      const appsSummary = apps.map(a => ({
        id: a.id,
        company: a.company,
        position: a.position,
        status: a.status
      }));
      return generateIngestionProposal(extracted, appsSummary);
    }
    return request<EmailIngestProposalDTO>('/ingest/email/parse', {
      method: 'POST',
      body: JSON.stringify({ emailContent: content, subject, sender })
    });
  },

  async applyProposal(proposal: EmailIngestProposalDTO): Promise<EmailIngestApplyResultDTO> {
    if (demoMode) {
      if (proposal.actionType === 'create_application') {
        const appData = proposal.proposedApplication!;
        const draft = {
          ...emptyDraft,
          company: appData.company,
          position: appData.position,
          status: appData.status,
          notes: appData.notes || '',
          nextAction: appData.nextAction || ''
        };
        const created = await repository.save(draft);
        let interviewId: string | null = null;
        if (proposal.proposedInterview) {
          const added = await repository.interview(created.id, {
            id: `new-${crypto.randomUUID()}`,
            title: proposal.proposedInterview.title,
            at: proposal.proposedInterview.at,
            timezone: proposal.proposedInterview.timezone,
            format: proposal.proposedInterview.format,
            location: proposal.proposedInterview.location,
            preparation: proposal.proposedInterview.preparation || '',
            notes: proposal.proposedInterview.notes || '',
            status: 'Scheduled'
          }, created.version);
          interviewId = added.id;
        }
        return {
          success: true,
          actionTaken: 'create_application',
          applicationId: created.id,
          interviewId,
          message: `Đã tạo mới hồ sơ ứng tuyển tại ${appData.company}.`
        };
      }

      const targetId = proposal.matchedApplicationId!;
      const apps = await repository.list();
      const current = apps.find(a => a.id === targetId);
      if (!current) {
        throw new Error('Không tìm thấy hồ sơ để cập nhật.');
      }

      const updatedStatus = proposal.proposedApplication?.status || 'Interview';
      const updatedApp = await repository.save({
        ...current,
        status: updatedStatus,
        nextAction: proposal.proposedApplication?.nextAction || current.nextAction
      }, current.id, { version: current.version });

      let interviewId: string | null = null;
      if (proposal.actionType === 'schedule_interview' && proposal.proposedInterview) {
        const added = await repository.interview(current.id, {
          id: `new-${crypto.randomUUID()}`,
          title: proposal.proposedInterview.title,
          at: proposal.proposedInterview.at,
          timezone: proposal.proposedInterview.timezone,
          format: proposal.proposedInterview.format,
          location: proposal.proposedInterview.location,
          preparation: proposal.proposedInterview.preparation || '',
          notes: proposal.proposedInterview.notes || '',
          status: 'Scheduled'
        }, updatedApp.version);
        interviewId = added.id;
      }

      return {
        success: true,
        actionTaken: proposal.actionType,
        applicationId: targetId,
        interviewId,
        message: `Đã cập nhật trạng thái hồ sơ thành "${updatedStatus}".`
      };
    }

    return request<EmailIngestApplyResultDTO>('/ingest/email/apply', {
      method: 'POST',
      body: JSON.stringify(proposal)
    });
  }
};

const OUTREACH_STORAGE_KEY = 'jobtrack.outreach.campaigns.v1';

function defaultDemoCampaign(): OutreachCampaignDTO {
  const steps = generateOutreachSequence('referral_request', 'engineer', 'Senior Frontend Engineer', 'Shopee Vietnam');
  const recipients: OutreachRecipientDTO[] = [
    {
      id: 'demo-rec-1',
      campaignId: 'demo-camp-1',
      contactId: null,
      name: 'Nguyễn Văn Minh',
      title: 'Senior Frontend Architect',
      company: 'Shopee Vietnam',
      channel: 'linkedin',
      email: 'minh.nguyen@shopee.vn',
      linkedinUrl: 'https://linkedin.com/in/minh-shopee',
      currentStepIndex: 1,
      status: 'pending',
      lastContactedAt: null,
      notes: 'Alumni ĐH Bách Khoa',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'demo-rec-2',
      campaignId: 'demo-camp-1',
      contactId: null,
      name: 'Trần Thu Hà',
      title: 'Engineering Manager',
      company: 'Shopee Vietnam',
      channel: 'linkedin',
      email: 'ha.tran@shopee.vn',
      linkedinUrl: 'https://linkedin.com/in/ha-shopee',
      currentStepIndex: 2,
      status: 'replied',
      lastContactedAt: new Date(Date.now() - 86400000).toISOString(),
      notes: 'Đã hẹn gửi CV qua email',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updatedAt: new Date(Date.now() - 86400000).toISOString()
    }
  ];
  return {
    id: 'demo-camp-1',
    name: 'Chiến dịch Referral Shopee Q4',
    objective: 'referral_request',
    targetType: 'engineer',
    targetCompany: 'Shopee Vietnam',
    targetRole: 'Senior Frontend Engineer',
    status: 'active',
    steps,
    recipients,
    analytics: computeCampaignMetrics(recipients),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadDemoCampaigns(): OutreachCampaignDTO[] {
  if (typeof localStorage === 'undefined') return [defaultDemoCampaign()];
  const raw = localStorage.getItem(OUTREACH_STORAGE_KEY);
  if (!raw) {
    const initial = [defaultDemoCampaign()];
    localStorage.setItem(OUTREACH_STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [defaultDemoCampaign()];
  }
}

function saveDemoCampaigns(campaigns: OutreachCampaignDTO[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(OUTREACH_STORAGE_KEY, JSON.stringify(campaigns));
  }
}

export const outreachRepository = {
  async listCampaigns(): Promise<OutreachCampaignDTO[]> {
    if (demoMode) {
      return loadDemoCampaigns();
    }
    return request<OutreachCampaignDTO[]>('/outreach/campaigns');
  },

  async getCampaign(id: string): Promise<OutreachCampaignDTO | null> {
    if (demoMode) {
      const list = loadDemoCampaigns();
      return list.find(c => c.id === id) || null;
    }
    return request<OutreachCampaignDTO>(`/outreach/campaigns/${encodeURIComponent(id)}`);
  },

  async createCampaign(input: CreateCampaignInputDTO): Promise<OutreachCampaignDTO> {
    if (demoMode) {
      const list = loadDemoCampaigns();
      const campaignId = `camp-${Date.now()}`;
      const steps = input.customSteps && input.customSteps.length > 0
        ? input.customSteps.map((s, idx) => ({ ...s, id: `step-${idx + 1}` }))
        : generateOutreachSequence(input.objective, input.targetType, input.targetRole, input.targetCompany);

      const newCampaign: OutreachCampaignDTO = {
        id: campaignId,
        name: input.name,
        objective: input.objective,
        targetType: input.targetType,
        targetCompany: input.targetCompany,
        targetRole: input.targetRole,
        status: 'active',
        steps,
        recipients: [],
        analytics: computeCampaignMetrics([]),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(newCampaign);
      saveDemoCampaigns(list);
      return newCampaign;
    }
    return request<OutreachCampaignDTO>('/outreach/campaigns', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async addRecipient(campaignId: string, input: AddRecipientInputDTO): Promise<OutreachRecipientDTO> {
    if (demoMode) {
      const list = loadDemoCampaigns();
      const campaign = list.find(c => c.id === campaignId);
      if (!campaign) throw new Error('Chiến dịch không tồn tại.');

      const newRecipient: OutreachRecipientDTO = {
        id: `rec-${Date.now()}`,
        campaignId,
        contactId: input.contactId || null,
        name: input.name,
        title: input.title || '',
        company: input.company,
        channel: input.channel || 'linkedin',
        email: input.email || null,
        linkedinUrl: input.linkedinUrl || null,
        currentStepIndex: 1,
        status: 'pending',
        lastContactedAt: null,
        notes: input.notes || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      campaign.recipients.unshift(newRecipient);
      campaign.analytics = computeCampaignMetrics(campaign.recipients);
      campaign.updatedAt = new Date().toISOString();
      saveDemoCampaigns(list);
      return newRecipient;
    }
    return request<OutreachRecipientDTO>(`/outreach/campaigns/${encodeURIComponent(campaignId)}/recipients`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async updateRecipientStep(recipientId: string, input: UpdateRecipientStepInputDTO): Promise<OutreachRecipientDTO> {
    if (demoMode) {
      const list = loadDemoCampaigns();
      let found: OutreachRecipientDTO | null = null;
      for (const c of list) {
        const r = c.recipients.find(rec => rec.id === recipientId);
        if (r) {
          r.currentStepIndex = input.currentStepIndex;
          r.status = input.status;
          if (input.notes !== undefined) r.notes = input.notes;
          if (input.status !== 'pending') r.lastContactedAt = new Date().toISOString();
          r.updatedAt = new Date().toISOString();
          c.analytics = computeCampaignMetrics(c.recipients);
          c.updatedAt = new Date().toISOString();
          found = r;
          break;
        }
      }
      if (!found) throw new Error('Không tìm thấy người nhận.');
      saveDemoCampaigns(list);
      return found;
    }
    return request<OutreachRecipientDTO>(`/outreach/recipients/${encodeURIComponent(recipientId)}/step`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async deleteCampaign(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoCampaigns();
      const next = list.filter(c => c.id !== id);
      saveDemoCampaigns(next);
      return true;
    }
    await request(`/outreach/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }
};

const SIMULATION_STORAGE_KEY = 'jobtrack_simulation_sessions';

function loadDemoSessions(): SimulationSessionDTO[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(SIMULATION_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as SimulationSessionDTO[];
    } catch {
      return [];
    }
  }

  const initialQuestions = generateSimulationQuestions('system_design', 'senior', 'Senior Backend Engineer', 'Shopee');
  const initialTurn = evaluateSimulationTurn(
    initialQuestions[0],
    'Với Shopee quy mô 100M người dùng, tôi thiết kế distributed notification service phân tầng: Gateway tiếp nhận request, Kafka partition theo user_id, worker pool xử lý rate limiting qua Redis Leaky Bucket. Đo lường giảm drop rate xuống 0.01% và p99 latency dưới 65ms.',
    85,
    'standard_2min',
    'system_design'
  );
  initialTurn.turnNumber = 1;

  const defaultSession: SimulationSessionDTO = {
    id: 'sim-default-01',
    targetRole: 'Senior Backend Engineer',
    targetCompany: 'Shopee',
    track: 'system_design',
    difficulty: 'senior',
    pacingMode: 'standard_2min',
    status: 'in_progress',
    questions: initialQuestions,
    currentQuestionIndex: 1,
    turns: [initialTurn],
    report: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const initialList = [defaultSession];
  saveDemoSessions(initialList);
  return initialList;
}

function saveDemoSessions(sessions: SimulationSessionDTO[]): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SIMULATION_STORAGE_KEY, JSON.stringify(sessions));
  }
}

export const simulationRepository = {
  async listSessions(): Promise<SimulationSessionDTO[]> {
    if (demoMode) {
      return loadDemoSessions();
    }
    return request<SimulationSessionDTO[]>('/simulation/sessions');
  },

  async getSession(id: string): Promise<SimulationSessionDTO | null> {
    if (demoMode) {
      const list = loadDemoSessions();
      return list.find(s => s.id === id) || null;
    }
    return request<SimulationSessionDTO>(`/simulation/sessions/${encodeURIComponent(id)}`);
  },

  async startSession(input: StartSimulationInputDTO): Promise<SimulationSessionDTO> {
    if (demoMode) {
      const list = loadDemoSessions();
      const sessionId = `sim-${Date.now()}`;
      const questions = generateSimulationQuestions(input.track, input.difficulty, input.targetRole, input.targetCompany);

      const newSession: SimulationSessionDTO = {
        id: sessionId,
        targetRole: input.targetRole,
        targetCompany: input.targetCompany,
        track: input.track,
        difficulty: input.difficulty,
        pacingMode: input.pacingMode,
        status: 'in_progress',
        questions,
        currentQuestionIndex: 0,
        turns: [],
        report: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(newSession);
      saveDemoSessions(list);
      return newSession;
    }
    return request<SimulationSessionDTO>('/simulation/sessions', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async submitTurn(
    sessionId: string,
    input: SubmitTurnInputDTO
  ): Promise<{ session: SimulationSessionDTO; evaluation: TurnEvaluationDTO }> {
    if (demoMode) {
      const list = loadDemoSessions();
      const session = list.find(s => s.id === sessionId);
      if (!session) throw new Error('Phiên phỏng vấn không tồn tại.');
      if (session.status !== 'in_progress') throw new Error('Phiên phỏng vấn đã kết thúc.');

      const currentQuestion = session.questions[session.currentQuestionIndex] || 'Câu hỏi tình huống';
      const evaluation = evaluateSimulationTurn(
        currentQuestion,
        input.answer,
        input.timeTakenSeconds,
        session.pacingMode,
        session.track
      );
      evaluation.turnNumber = session.currentQuestionIndex + 1;

      session.turns.push(evaluation);
      session.currentQuestionIndex += 1;
      if (session.currentQuestionIndex >= session.questions.length) {
        session.status = 'completed';
        session.report = synthesizeSessionReport(session.turns);
      }
      session.updatedAt = new Date().toISOString();
      saveDemoSessions(list);
      return { session, evaluation };
    }
    return request<{ session: SimulationSessionDTO; evaluation: TurnEvaluationDTO }>(
      `/simulation/sessions/${encodeURIComponent(sessionId)}/turn`,
      {
        method: 'POST',
        body: JSON.stringify(input)
      }
    );
  },

  async completeSession(sessionId: string): Promise<SimulationSessionDTO> {
    if (demoMode) {
      const list = loadDemoSessions();
      const session = list.find(s => s.id === sessionId);
      if (!session) throw new Error('Phiên phỏng vấn không tồn tại.');

      session.status = 'completed';
      session.report = synthesizeSessionReport(session.turns);
      session.updatedAt = new Date().toISOString();
      saveDemoSessions(list);
      return session;
    }
    return request<SimulationSessionDTO>(`/simulation/sessions/${encodeURIComponent(sessionId)}/complete`, {
      method: 'POST'
    });
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoSessions();
      const next = list.filter(s => s.id !== sessionId);
      saveDemoSessions(next);
      return true;
    }
    await request(`/simulation/sessions/${encodeURIComponent(sessionId)}`, { method: 'DELETE' });
    return true;
  }
};

const PORTFOLIO_STORAGE_KEY = 'jobtrack_candidate_portfolio';

function loadDemoPortfolio(): PortfolioConfigDTO {
  if (typeof localStorage === 'undefined') {
    return {
      id: 'port-demo-default',
      slug: 'nhat-tan-lead',
      title: 'Lead Software Architect',
      bio: 'Chuyên gia xây dựng hệ thống phần mềm phân tán, microservices chịu tải cao và kiến trúc cloud-native.',
      location: 'Thành phố Hồ Chí Minh, Việt Nam',
      salaryExpectation: '60.000.000 - 80.000.000 VNĐ',
      targetRoles: ['Lead Backend Engineer', 'Solutions Architect'],
      displaySettings: DEFAULT_DISPLAY_SETTINGS,
      isPublic: true,
      shareToken: 'demo-share-token-12345',
      tokenExpiresAt: null,
      accessCount: 14,
      lastAccessedAt: new Date(Date.now() - 3600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  const raw = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw) as PortfolioConfigDTO;
    } catch {
    }
  }

  const defaultPortfolio: PortfolioConfigDTO = {
    id: 'port-demo-01',
    slug: 'nhat-tan-lead',
    title: 'Lead Software Architect',
    bio: 'Chuyên gia xây dựng hệ thống phần mềm phân tán, microservices chịu tải cao và kiến trúc cloud-native.',
    location: 'Thành phố Hồ Chí Minh, Việt Nam',
    salaryExpectation: '60.000.000 - 80.000.000 VNĐ',
    targetRoles: ['Lead Backend Engineer', 'Solutions Architect'],
    displaySettings: DEFAULT_DISPLAY_SETTINGS,
    isPublic: true,
    shareToken: 'demo-share-token-12345',
    tokenExpiresAt: null,
    accessCount: 14,
    lastAccessedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveDemoPortfolio(defaultPortfolio);
  return defaultPortfolio;
}

function saveDemoPortfolio(portfolio: PortfolioConfigDTO): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(portfolio));
  }
}

export const portfolioRepository = {
  async getPortfolio(): Promise<PortfolioConfigDTO> {
    if (demoMode) {
      return loadDemoPortfolio();
    }
    return request<PortfolioConfigDTO>('/portfolio');
  },

  async updatePortfolio(input: UpdatePortfolioInputDTO): Promise<PortfolioConfigDTO> {
    if (demoMode) {
      const current = loadDemoPortfolio();
      const updated: PortfolioConfigDTO = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        slug: input.slug !== undefined ? input.slug.trim().toLowerCase() : current.slug,
        bio: input.bio !== undefined ? input.bio : current.bio,
        location: input.location !== undefined ? input.location : current.location,
        salaryExpectation: input.salaryExpectation !== undefined ? input.salaryExpectation : current.salaryExpectation,
        targetRoles: input.targetRoles !== undefined ? input.targetRoles : current.targetRoles,
        isPublic: input.isPublic !== undefined ? input.isPublic : current.isPublic,
        displaySettings: {
          ...current.displaySettings,
          ...(input.displaySettings || {})
        },
        updatedAt: new Date().toISOString()
      };
      saveDemoPortfolio(updated);
      return updated;
    }
    return request<PortfolioConfigDTO>('/portfolio', {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  },

  async generateToken(expiryDays?: number): Promise<ShareTokenDTO> {
    if (demoMode) {
      const current = loadDemoPortfolio();
      const token = `demo-tok-${Date.now()}`;
      const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 86400000).toISOString() : null;

      current.shareToken = token;
      current.tokenExpiresAt = expiresAt;
      current.updatedAt = new Date().toISOString();
      saveDemoPortfolio(current);

      return {
        token,
        publicUrl: `/dossier/${token}`,
        accessCount: current.accessCount || 0,
        lastAccessedAt: current.lastAccessedAt || null,
        expiresAt,
        isActive: true
      };
    }
    return request<ShareTokenDTO>('/portfolio/token', {
      method: 'POST',
      body: JSON.stringify({ expiryDays })
    });
  },

  async revokeToken(): Promise<boolean> {
    if (demoMode) {
      const current = loadDemoPortfolio();
      current.shareToken = null;
      current.tokenExpiresAt = null;
      current.updatedAt = new Date().toISOString();
      saveDemoPortfolio(current);
      return true;
    }
    await request('/portfolio/token', { method: 'DELETE' });
    return true;
  },

  async getPublicDossier(token: string): Promise<PublicDossierViewDTO | null> {
    if (demoMode) {
      const config = loadDemoPortfolio();
      if (!config.isPublic || config.shareToken !== token) {
        return null;
      }
      if (config.tokenExpiresAt && new Date(config.tokenExpiresAt) < new Date()) {
        return null;
      }

      config.accessCount = (config.accessCount || 0) + 1;
      config.lastAccessedAt = new Date().toISOString();
      saveDemoPortfolio(config);

      const demoSkills: DossierSkillItemDTO[] = [
        { name: 'TypeScript', category: 'Language', verified: true },
        { name: 'Node.js', category: 'Backend', verified: true },
        { name: 'Distributed Systems', category: 'Architecture', verified: true },
        { name: 'PostgreSQL', category: 'Database', verified: true },
        { name: 'System Design', category: 'Architecture', verified: true },
        { name: 'React', category: 'Frontend', verified: true }
      ];

      const demoRoadmap: DossierRoadmapProgressDTO = {
        targetRole: config.targetRoles[0] || 'Lead Software Architect',
        progressPercent: 85,
        completedMilestones: 4,
        totalMilestones: 5
      };

      const demoSimulation: DossierSimulationReadinessDTO = {
        grade: 'Ready',
        score: 92,
        track: 'system_design'
      };

      return synthesizePublicDossier(
        config,
        'Nhật Tân',
        demoSkills,
        demoRoadmap,
        demoSimulation,
        3
      );
    }
    return request<PublicDossierViewDTO>(`/public/dossier/${encodeURIComponent(token)}`);
  }
};

const COMPENSATION_STORAGE_KEY = 'jobtrack.compensation_forecasts.v1';

function createDefaultDemoForecast(): CompensationForecastDTO {
  const defaultPkg: CompensationPackageDTO = {
    baseSalaryMonthly: 55000000,
    currency: 'VND',
    hasMonth13: true,
    performanceBonusAnnual: 55000000,
    equityGrant: {
      type: 'esop',
      totalShares: 20000,
      strikePrice: 20000,
      currentFairMarketValue: 60000,
      vestingYears: 4,
      cliffMonths: 12
    }
  };

  const vestingSchedule = computeVestingSchedule(defaultPkg.equityGrant);
  const scenarios = forecastCompensationScenarios(defaultPkg);
  const baseAnnual = defaultPkg.baseSalaryMonthly * 12;
  const m13 = defaultPkg.hasMonth13 ? defaultPkg.baseSalaryMonthly : 0;
  const bonus = defaultPkg.performanceBonusAnnual || 0;
  const annualCash = baseAnnual + m13 + bonus;
  const benchmark = evaluateMarketBenchmark('Senior Frontend Engineer', 'senior', annualCash, 'VND');
  const leveragePoints = deriveNegotiationLeveragePoints(defaultPkg, benchmark, 'Shopee Vietnam');

  return {
    id: 'demo-forecast-shopee-1',
    company: 'Shopee Vietnam',
    role: 'Senior Frontend Engineer',
    level: 'senior',
    package: defaultPkg,
    vestingSchedule,
    scenarios,
    benchmark,
    leveragePoints,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadDemoForecasts(): CompensationForecastDTO[] {
  try {
    const raw = localStorage.getItem(COMPENSATION_STORAGE_KEY);
    if (!raw) {
      const initial = [createDefaultDemoForecast()];
      saveDemoForecasts(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [createDefaultDemoForecast()];
  } catch {
    return [createDefaultDemoForecast()];
  }
}

function saveDemoForecasts(list: CompensationForecastDTO[]): void {
  try {
    localStorage.setItem(COMPENSATION_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const compensationRepository = {
  async list(): Promise<CompensationForecastDTO[]> {
    if (demoMode) {
      return loadDemoForecasts();
    }
    return request<CompensationForecastDTO[]>('/compensation/forecasts');
  },

  async getById(id: string): Promise<CompensationForecastDTO | null> {
    if (demoMode) {
      const list = loadDemoForecasts();
      return list.find(f => f.id === id) || null;
    }
    const list = await request<CompensationForecastDTO[]>('/compensation/forecasts');
    return list.find(f => f.id === id) || null;
  },

  async create(input: CreateCompensationForecastInputDTO): Promise<CompensationForecastDTO> {
    if (demoMode) {
      const vestingSchedule = computeVestingSchedule(input.package.equityGrant);
      const scenarios = forecastCompensationScenarios(input.package);
      const baseAnnual = input.package.baseSalaryMonthly * 12;
      const m13 = input.package.hasMonth13 ? input.package.baseSalaryMonthly : 0;
      const bonus = input.package.performanceBonusAnnual || 0;
      const annualCash = baseAnnual + m13 + bonus;
      const benchmark = evaluateMarketBenchmark(input.role, input.level, annualCash, input.package.currency);
      const leveragePoints = deriveNegotiationLeveragePoints(input.package, benchmark, input.company);

      const forecast: CompensationForecastDTO = {
        id: `demo-forecast-${Date.now()}`,
        company: input.company,
        role: input.role,
        level: input.level,
        applicationId: input.applicationId || null,
        package: input.package,
        vestingSchedule,
        scenarios,
        benchmark,
        leveragePoints,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const list = loadDemoForecasts();
      list.unshift(forecast);
      saveDemoForecasts(list);
      return forecast;
    }
    return request<CompensationForecastDTO>('/compensation/forecasts', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async delete(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoForecasts().filter(f => f.id !== id);
      saveDemoForecasts(list);
      return true;
    }
    await request(`/compensation/forecasts/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  },

  async getBenchmark(
    role: string,
    level: SeniorityLevel,
    annualCash: number,
    currency: Currency = 'VND'
  ): Promise<CompensationBenchmarkDTO> {
    if (demoMode) {
      return evaluateMarketBenchmark(role, level, annualCash, currency);
    }
    return request<CompensationBenchmarkDTO>(
      `/compensation/benchmark?role=${encodeURIComponent(role)}&level=${encodeURIComponent(level)}&annualCash=${annualCash}&currency=${currency}`
    );
  }
};

const CAREER_TRAJECTORY_KEY = 'jobtrack.career_trajectory.v1';

function loadDemoTrajectory(): TrajectorySimulationDTO | null {
  try {
    const raw = localStorage.getItem(CAREER_TRAJECTORY_KEY);
    if (!raw) {
      const defaultSim = simulateCareerTrajectory({
        currentRole: 'Senior Frontend Engineer',
        currentLevel: 'Senior',
        targetTrack: 'ic',
        targetRole: 'Staff',
        horizonYears: 4,
        userScores: {
          technical_breadth: 75,
          system_scale: 70,
          org_influence: 60,
          mentorship_culture: 65,
          business_impact: 70
        }
      });
      localStorage.setItem(CAREER_TRAJECTORY_KEY, JSON.stringify(defaultSim));
      return defaultSim;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDemoTrajectory(sim: TrajectorySimulationDTO): void {
  try {
    localStorage.setItem(CAREER_TRAJECTORY_KEY, JSON.stringify(sim));
  } catch {}
}

export const careerTrajectoryRepository = {
  async getTrajectory(): Promise<TrajectorySimulationDTO | null> {
    if (demoMode) {
      return loadDemoTrajectory();
    }
    return request<TrajectorySimulationDTO | null>('/trajectory');
  },

  async simulate(input: SimulateTrajectoryInputDTO): Promise<TrajectorySimulationDTO> {
    if (demoMode) {
      const sim = simulateCareerTrajectory(input);
      saveDemoTrajectory(sim);
      return sim;
    }
    return request<TrajectorySimulationDTO>('/trajectory/simulate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async updateCompetencies(input: UpdateCompetenciesInputDTO): Promise<TrajectorySimulationDTO> {
    if (demoMode) {
      const existing = loadDemoTrajectory();
      const currentRole = existing ? existing.currentRole : 'Senior Frontend Engineer';
      const currentLevel = existing && existing.readiness ? existing.readiness.currentLevel : 'Senior';
      const targetTrack = existing ? existing.targetTrack : 'ic';
      const targetRole = existing ? existing.targetRole : (targetTrack === 'ic' ? 'Staff' : 'Tech Lead');
      const horizonYears = existing ? existing.horizonYears : 4;
      const sim = simulateCareerTrajectory({
        currentRole,
        currentLevel,
        targetTrack,
        targetRole,
        horizonYears,
        userScores: input.scores
      });
      saveDemoTrajectory(sim);
      return sim;
    }
    return request<TrajectorySimulationDTO>('/trajectory/competencies', {
      method: 'PUT',
      body: JSON.stringify(input)
    });
  }
};

const RESUME_OPTIMIZER_KEY = 'jobtrack.resume_optimizer.v1';

function loadDemoOptimizations(): OptimizedResumeVariantDTO[] {
  try {
    const raw = localStorage.getItem(RESUME_OPTIMIZER_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveDemoOptimizations(list: OptimizedResumeVariantDTO[]): void {
  try {
    localStorage.setItem(RESUME_OPTIMIZER_KEY, JSON.stringify(list));
  } catch {}
}

export const resumeOptimizerRepository = {
  async diagnose(input: OptimizeResumeInputDTO): Promise<OptimizedResumeVariantDTO> {
    if (demoMode) {
      const diagnostic = diagnoseAtsKeywordGaps(input.resumeText, input.jobDescription);
      const bullets = extractBulletsFromResume(input.resumeText);
      const missingCritical = diagnostic.keywordGaps
        .filter(k => !k.matched)
        .slice(0, 6)
        .map(k => k.keyword);
      const proposals = rewriteBulletPointsXyz(bullets, missingCritical);

      const defaultAccepted: Record<string, string> = {};
      for (const p of proposals) {
        if (p.variants.length > 0) {
          defaultAccepted[p.originalBullet] = p.variants[0].rewrittenText;
        }
      }

      const synthesizedResume = synthesizeOptimizedResume(
        input.resumeText,
        defaultAccepted,
        missingCritical
      );

      const now = new Date().toISOString();
      const variant: OptimizedResumeVariantDTO = {
        id: `opt-${Date.now()}`,
        applicationId: input.applicationId,
        jobTitle: input.jobTitle || 'Software Engineer',
        company: input.company || 'Tech Company',
        originalResume: input.resumeText,
        targetJobText: input.jobDescription,
        diagnosticResult: diagnostic,
        proposals,
        synthesizedResume,
        createdAt: now,
        updatedAt: now
      };

      const existingList = loadDemoOptimizations();
      saveDemoOptimizations([variant, ...existingList.filter(o => o.id !== variant.id)]);
      return variant;
    }

    return request<OptimizedResumeVariantDTO>('/resume/diagnose', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async applyRewrites(id: string, input: ApplyRewritesInputDTO): Promise<OptimizedResumeVariantDTO> {
    if (demoMode) {
      const list = loadDemoOptimizations();
      const existing = list.find(o => o.id === id);
      if (!existing) {
        throw new Error('Resume optimization record not found.');
      }

      const synthesizedResume = synthesizeOptimizedResume(
        existing.originalResume,
        input.acceptedBullets,
        input.injectedKeywords || []
      );

      const updatedDiagnostic = diagnoseAtsKeywordGaps(synthesizedResume, existing.targetJobText);

      const updatedProposals = existing.proposals.map(p => {
        const chosen = input.acceptedBullets[p.originalBullet];
        if (chosen) {
          const matchingVariant = p.variants.find(v => v.rewrittenText === chosen);
          return {
            ...p,
            selectedVariant: matchingVariant ? matchingVariant.variantType : p.selectedVariant
          };
        }
        return p;
      });

      const updatedVariant: OptimizedResumeVariantDTO = {
        ...existing,
        diagnosticResult: updatedDiagnostic,
        proposals: updatedProposals,
        synthesizedResume,
        updatedAt: new Date().toISOString()
      };

      const nextList = list.map(o => o.id === id ? updatedVariant : o);
      saveDemoOptimizations(nextList);
      return updatedVariant;
    }

    return request<OptimizedResumeVariantDTO>(`/resume/optimizations/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async list(): Promise<OptimizedResumeVariantDTO[]> {
    if (demoMode) {
      return loadDemoOptimizations();
    }
    return request<OptimizedResumeVariantDTO[]>('/resume/optimizations');
  },

  async getById(id: string): Promise<OptimizedResumeVariantDTO | null> {
    if (demoMode) {
      const list = loadDemoOptimizations();
      return list.find(o => o.id === id) || null;
    }
    return request<OptimizedResumeVariantDTO>(`/resume/optimizations/${encodeURIComponent(id)}`);
  },

  async delete(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoOptimizations().filter(o => o.id !== id);
      saveDemoOptimizations(list);
      return true;
    }
    await request(`/resume/optimizations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return true;
  }
};

const DEMO_VELOCITY_STORAGE_KEY = 'jobtrack_velocity_report_v1';

function loadDemoVelocityReport(): PipelineVelocityReportDTO | null {
  try {
    const raw = localStorage.getItem(DEMO_VELOCITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDemoVelocityReport(report: PipelineVelocityReportDTO): void {
  try {
    localStorage.setItem(DEMO_VELOCITY_STORAGE_KEY, JSON.stringify(report));
  } catch {}
}

export const pipelineVelocityRepository = {
  async getLatestReport(): Promise<PipelineVelocityReportDTO | null> {
    if (demoMode) {
      const existing = loadDemoVelocityReport();
      if (existing) return existing;

      const defaultTargetDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      return this.generateReport({
        targetOfferDate: defaultTargetDate,
        targetOfferCount: 1,
        simulationHorizonWeeks: 12
      });
    }
    return request<PipelineVelocityReportDTO | null>('/pipeline/velocity/report');
  },

  async generateReport(
    input: CalculateVelocityReportInputDTO
  ): Promise<PipelineVelocityReportDTO> {
    if (demoMode) {
      const apps = await repository.list();
      const mappedApps = apps.map(a => ({
        status: a.status,
        appliedAt: a.appliedAt || null,
        createdAt: a.createdAt,
        statusUpdatedAt: a.statusUpdatedAt || a.createdAt,
        interviews: (a.interviews || []).map(i => ({
          id: i.id,
          status: i.status,
          at: i.at
        }))
      }));

      const stageMetrics = computeStageConversionMetrics(mappedApps);
      const bottlenecks = detectPipelineBottlenecks(stageMetrics);

      const now = Date.now();
      const fourWeeksAgo = now - 28 * 24 * 60 * 60 * 1000;
      const recentAppsCount = mappedApps.filter(a => {
        const d = a.appliedAt ? Date.parse(a.appliedAt) : Date.parse(a.createdAt);
        return Number.isFinite(d) && d >= fourWeeksAgo;
      }).length;
      const weeklyVelocity = Math.max(1, Math.round((recentAppsCount / 4) * 10) / 10);

      const velocityTarget = calculateVelocityTargets(
        stageMetrics,
        input.targetOfferDate,
        input.targetOfferCount || 1,
        weeklyVelocity
      );

      const activeVelocity = input.simulatedWeeklyVelocity !== undefined
        ? input.simulatedWeeklyVelocity
        : velocityTarget.recommendedWeeklyApplications;

      const simulation = simulatePipelineOutcomes(
        activeVelocity,
        stageMetrics,
        input.simulationHorizonWeeks || 12
      );

      const report: PipelineVelocityReportDTO = {
        id: `vel-${Date.now()}`,
        userId: 'demo-user',
        targetOfferDate: input.targetOfferDate,
        targetOfferCount: input.targetOfferCount || 1,
        calculatedAt: new Date().toISOString(),
        stageMetrics,
        bottlenecks,
        velocityTarget,
        simulation,
        applicationsAnalyzed: mappedApps.length
      };

      saveDemoVelocityReport(report);
      return report;
    }

    return request<PipelineVelocityReportDTO>('/pipeline/velocity/report', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async simulate(
    input: PipelineVelocitySimulationInputDTO
  ): Promise<PipelineVelocitySimulationDTO> {
    if (demoMode) {
      let metrics = input.stageMetrics;
      if (!metrics || metrics.length === 0) {
        const report = await this.getLatestReport();
        metrics = report ? report.stageMetrics : computeStageConversionMetrics([]);
      }
      return simulatePipelineOutcomes(input.weeklyVelocity, metrics, input.weeksHorizon);
    }

    return request<PipelineVelocitySimulationDTO>('/pipeline/velocity/simulate', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};

const DEMO_CULTURE_RADAR_KEY = 'jobtrack_culture_radars_v1';

function getDemoCultureRadar(company?: string): CultureCompatibilityReportDTO | null {
  try {
    const raw = localStorage.getItem(DEMO_CULTURE_RADAR_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as CultureCompatibilityReportDTO[];
    if (!Array.isArray(list) || list.length === 0) return null;
    if (company && company.trim().length > 0) {
      const match = list.find(r => r.company.toLowerCase() === company.trim().toLowerCase());
      if (match) return match;
    }
    return list[0];
  } catch {
    return null;
  }
}

function saveDemoCultureRadar(report: CultureCompatibilityReportDTO): void {
  try {
    const raw = localStorage.getItem(DEMO_CULTURE_RADAR_KEY);
    let list: CultureCompatibilityReportDTO[] = [];
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    }
    list = [report, ...list.filter(r => r.id !== report.id && r.company.toLowerCase() !== report.company.toLowerCase())];
    localStorage.setItem(DEMO_CULTURE_RADAR_KEY, JSON.stringify(list));
  } catch {
  }
}

export const cultureRadarRepository = {
  async getLatestRadar(company?: string): Promise<CultureCompatibilityReportDTO | null> {
    if (demoMode) {
      const existing = getDemoCultureRadar(company);
      if (existing) return existing;
      const compName = company && company.trim().length > 0 ? company.trim() : 'FPT Software';
      const evaluated = evaluateCompanyCulture(compName);
      const questions = generateReverseInterviewQuestions(evaluated.dimensionScores, 'engineering_manager');
      const fallbackReport: CultureCompatibilityReportDTO = {
        id: `culture-${Date.now()}`,
        userId: 'demo-user',
        company: compName,
        targetRole: 'engineering_manager',
        calculatedAt: new Date().toISOString(),
        overallCompatibilityScore: evaluated.overallScore,
        dimensionScores: evaluated.dimensionScores,
        reverseInterviewQuestions: questions,
        criticalRedFlagsCount: evaluated.criticalRedFlagsCount,
        standoutGreenFlagsCount: evaluated.standoutGreenFlagsCount,
        synthesisSummary: evaluated.synthesisSummary
      };
      saveDemoCultureRadar(fallbackReport);
      return fallbackReport;
    }

    const query = company && company.trim().length > 0 ? `?company=${encodeURIComponent(company.trim())}` : '';
    return request<CultureCompatibilityReportDTO | null>(`/culture/radar${query}`);
  },

  async analyzeCulture(input: AnalyzeCultureInputDTO): Promise<CultureCompatibilityReportDTO> {
    if (demoMode) {
      const evaluated = evaluateCompanyCulture(input.company, input.candidatePreferences);
      const questions = generateReverseInterviewQuestions(
        evaluated.dimensionScores,
        (input.targetRole as ReverseInterviewTargetRole) || 'engineering_manager'
      );
      const report: CultureCompatibilityReportDTO = {
        id: `culture-${Date.now()}`,
        userId: 'demo-user',
        company: input.company,
        targetRole: input.targetRole,
        calculatedAt: new Date().toISOString(),
        overallCompatibilityScore: evaluated.overallScore,
        dimensionScores: evaluated.dimensionScores,
        reverseInterviewQuestions: questions,
        criticalRedFlagsCount: evaluated.criticalRedFlagsCount,
        standoutGreenFlagsCount: evaluated.standoutGreenFlagsCount,
        synthesisSummary: evaluated.synthesisSummary
      };
      saveDemoCultureRadar(report);
      return report;
    }

    return request<CultureCompatibilityReportDTO>('/culture/analyze', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async generateQuestions(input: CultureQuestionGenerationInputDTO): Promise<ReverseInterviewQuestionDTO[]> {
    if (demoMode) {
      const scores = input.dimensionScores && input.dimensionScores.length > 0
        ? input.dimensionScores
        : evaluateCompanyCulture('Standard Tech').dimensionScores;
      return generateReverseInterviewQuestions(scores, input.targetRole || 'engineering_manager');
    }

    return request<ReverseInterviewQuestionDTO[]>('/culture/questions', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }
};

const DEMO_HEADHUNTER_LEADS_KEY = 'jobtrack_demo_headhunter_leads_v1';
const DEMO_HEADHUNTER_MANDATES_KEY = 'jobtrack_demo_headhunter_mandates_v1';

const INITIAL_DEMO_LEADS: RecruiterLeadDTO[] = [
  {
    id: 'lead-rw',
    userId: 'demo-user',
    name: 'Mai Hoàng',
    agency: 'Robert Walters',
    agencyTier: 'tier1_global',
    role: 'Director of Tech Practice',
    email: 'mai.hoang@robertwalters.com.vn',
    linkedinUrl: 'https://linkedin.com/in/mai-hoang-rw',
    tier: 'trusted_advisor',
    rating: 5,
    specialties: ['FinTech', 'C-Suite', 'Engineering Leadership'],
    mandatesCount: 4,
    lastContactedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    notes: 'Đối tác chiến lược retained cho các tập đoàn ngân hàng và kỳ lân công nghệ.',
    healthScore: 95,
    healthStatus: 'excellent',
    nextActionSuggestion: 'Đối tác chiến lược tin cậy. Hãy chia sẻ định hướng thăng tiến hoặc cập nhật kỳ vọng thu nhập mới.',
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead-mp',
    userId: 'demo-user',
    name: 'Alexandre Nguyen',
    agency: 'Michael Page',
    agencyTier: 'tier1_global',
    role: 'Senior Consultant - Engineering & Data',
    email: 'alexandre.nguyen@michaelpage.com.vn',
    linkedinUrl: 'https://linkedin.com/in/alexandre-nguyen',
    tier: 'preferred_partner',
    rating: 4,
    specialties: ['Data & AI', 'Platform Engineering', 'Golang'],
    mandatesCount: 2,
    lastContactedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    notes: 'Rất nắm thị trường bán lẻ đa quốc gia và các Tech Hub nước ngoài.',
    healthScore: 80,
    healthStatus: 'active',
    nextActionSuggestion: 'Quan hệ tích cực. Sẵn sàng xem xét các mandate độc quyền phù hợp.',
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead-nav',
    userId: 'demo-user',
    name: 'Trần Kim Oanh',
    agency: 'Navigos Search',
    agencyTier: 'tier1_global',
    role: 'Senior Lead Consultant',
    email: 'oanh.tran@navigossearch.com',
    tier: 'preferred_partner',
    rating: 4,
    specialties: ['Banking Tech', 'High-Tech Manufacturing'],
    mandatesCount: 1,
    lastContactedAt: new Date(Date.now() - 50 * 86400000).toISOString(),
    notes: 'Nhiều mandate cho các ngân hàng truyền thống đang chuyển đổi số.',
    healthScore: 70,
    healthStatus: 'cooling',
    nextActionSuggestion: 'Đã lâu chưa trao đổi (>45 ngày). Hãy gửi tin nhắn cập nhật trạng thái tìm việc nhẹ nhàng.',
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'lead-monroe',
    userId: 'demo-user',
    name: 'Lê Quốc Tuấn',
    agency: 'Monroe Consulting Group',
    agencyTier: 'tier2_regional',
    role: 'Technology Headhunter',
    email: 'tuan.le@monroeconsulting.com',
    tier: 'situational_contingency',
    rating: 3,
    specialties: ['E-commerce', 'Startup Scaleups'],
    mandatesCount: 1,
    lastContactedAt: new Date(Date.now() - 100 * 86400000).toISOString(),
    notes: 'Chuyên contingency cho các startup Series A/B.',
    healthScore: 50,
    healthStatus: 'cooling',
    nextActionSuggestion: 'Đã lâu chưa trao đổi (>45 ngày). Hãy gửi tin nhắn cập nhật trạng thái tìm việc nhẹ nhàng.',
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const INITIAL_DEMO_MANDATES: HeadhunterMandateDTO[] = [
  {
    id: 'mandate-1',
    userId: 'demo-user',
    leadId: 'lead-rw',
    recruiterName: 'Mai Hoàng',
    agencyName: 'Robert Walters',
    roleTitle: 'VP of Engineering',
    clientCompany: 'Techcombank Digital',
    isConfidential: false,
    exclusivity: 'exclusive_retained',
    salaryRange: '$6,000 - $8,000 USD gross',
    status: 'submitted',
    notes: 'Hồ sơ đã được gửi trực tiếp tới Managing Director Technology.',
    pitchedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'mandate-2',
    userId: 'demo-user',
    leadId: 'lead-mp',
    recruiterName: 'Alexandre Nguyen',
    agencyName: 'Michael Page',
    roleTitle: 'Head of Data & AI Platform',
    clientCompany: 'VNG Corporation',
    isConfidential: false,
    exclusivity: 'contingency_shared',
    salaryRange: '90 - 130 Triệu VND gross',
    status: 'pitched',
    notes: 'Đang chờ bản mô tả công việc (JD) chính thức.',
    pitchedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function getDemoHeadhunterLeads(): RecruiterLeadDTO[] {
  try {
    const raw = localStorage.getItem(DEMO_HEADHUNTER_LEADS_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_HEADHUNTER_LEADS_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
      return INITIAL_DEMO_LEADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_LEADS;
  } catch {
    return INITIAL_DEMO_LEADS;
  }
}

function saveDemoHeadhunterLeads(leads: RecruiterLeadDTO[]): void {
  try {
    localStorage.setItem(DEMO_HEADHUNTER_LEADS_KEY, JSON.stringify(leads));
  } catch {
  }
}

function getDemoHeadhunterMandates(): HeadhunterMandateDTO[] {
  try {
    const raw = localStorage.getItem(DEMO_HEADHUNTER_MANDATES_KEY);
    if (!raw) {
      localStorage.setItem(DEMO_HEADHUNTER_MANDATES_KEY, JSON.stringify(INITIAL_DEMO_MANDATES));
      return INITIAL_DEMO_MANDATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_DEMO_MANDATES;
  } catch {
    return INITIAL_DEMO_MANDATES;
  }
}

function saveDemoHeadhunterMandates(mandates: HeadhunterMandateDTO[]): void {
  try {
    localStorage.setItem(DEMO_HEADHUNTER_MANDATES_KEY, JSON.stringify(mandates));
  } catch {
  }
}

export const headhunterCrmRepository = {
  async listLeads(filters?: {
    agency?: string;
    tier?: RecruiterRelationshipTier;
    query?: string;
  }): Promise<RecruiterLeadDTO[]> {
    if (demoMode) {
      let leads = getDemoHeadhunterLeads();
      if (filters?.tier) {
        leads = leads.filter(l => l.tier === filters.tier);
      }
      if (filters?.agency && filters.agency.trim()) {
        const ag = filters.agency.toLowerCase().trim();
        leads = leads.filter(l => l.agency.toLowerCase().includes(ag));
      }
      if (filters?.query && filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        leads = leads.filter(l =>
          l.name.toLowerCase().includes(q) ||
          l.agency.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q) ||
          (l.specialties || []).some(s => s.toLowerCase().includes(q))
        );
      }
      return leads.map(l => {
        const health = computeRecruiterRelationshipHealth(l);
        return {
          ...l,
          healthScore: health.healthScore,
          healthStatus: health.healthStatus,
          nextActionSuggestion: health.nextActionSuggestion
        };
      });
    }

    const params = new URLSearchParams();
    if (filters?.agency) params.set('agency', filters.agency);
    if (filters?.tier) params.set('tier', filters.tier);
    if (filters?.query) params.set('q', filters.query);
    const qs = params.toString();
    try {
      return await request<RecruiterLeadDTO[]>(`/headhunters${qs ? `?${qs}` : ''}`);
    } catch {
      let leads = getDemoHeadhunterLeads();
      if (filters?.tier) {
        leads = leads.filter(l => l.tier === filters.tier);
      }
      if (filters?.agency && filters.agency.trim()) {
        const ag = filters.agency.toLowerCase().trim();
        leads = leads.filter(l => l.agency.toLowerCase().includes(ag));
      }
      if (filters?.query && filters.query.trim()) {
        const q = filters.query.toLowerCase().trim();
        leads = leads.filter(l =>
          l.name.toLowerCase().includes(q) ||
          l.agency.toLowerCase().includes(q) ||
          l.role.toLowerCase().includes(q) ||
          (l.specialties || []).some(s => s.toLowerCase().includes(q))
        );
      }
      return leads.map(l => {
        const health = computeRecruiterRelationshipHealth(l);
        return {
          ...l,
          healthScore: health.healthScore,
          healthStatus: health.healthStatus,
          nextActionSuggestion: health.nextActionSuggestion
        };
      });
    }
  },

  async getLead(id: string): Promise<RecruiterLeadDTO | null> {
    if (demoMode) {
      const leads = getDemoHeadhunterLeads();
      const lead = leads.find(l => l.id === id);
      if (!lead) return null;
      const health = computeRecruiterRelationshipHealth(lead);
      return {
        ...lead,
        healthScore: health.healthScore,
        healthStatus: health.healthStatus,
        nextActionSuggestion: health.nextActionSuggestion
      };
    }
    return request<RecruiterLeadDTO | null>(`/headhunters/${id}`);
  },

  async upsertLead(input: RecruiterLeadMutationInputDTO, existingId?: string): Promise<RecruiterLeadDTO> {
    if (demoMode) {
      const leads = getDemoHeadhunterLeads();
      const nowIso = new Date().toISOString();
      const tier = input.tier || 'preferred_partner';
      const rating = input.rating ?? 4;
      const health = computeRecruiterRelationshipHealth({
        tier,
        rating,
        mandatesCount: 0,
        lastContactedAt: input.lastContactedAt
      });

      const matchedIdx = existingId
        ? leads.findIndex(l => l.id === existingId)
        : leads.findIndex(l => l.name.trim().toLowerCase() === input.name.trim().toLowerCase() && l.agency.trim().toLowerCase() === input.agency.trim().toLowerCase());

      if (matchedIdx !== -1) {
        const existing = leads[matchedIdx];
        const mergedSpecialties = Array.from(new Set([...(existing.specialties || []), ...(input.specialties || [])]));
        const updated: RecruiterLeadDTO = {
          ...existing,
          name: input.name,
          agency: input.agency,
          agencyTier: input.agencyTier || existing.agencyTier,
          role: input.role || existing.role,
          email: input.email || existing.email,
          phone: input.phone || existing.phone,
          linkedinUrl: input.linkedinUrl || existing.linkedinUrl,
          tier,
          rating,
          specialties: mergedSpecialties,
          notes: input.notes || existing.notes,
          lastContactedAt: input.lastContactedAt || existing.lastContactedAt,
          healthScore: health.healthScore,
          healthStatus: health.healthStatus,
          nextActionSuggestion: health.nextActionSuggestion,
          updatedAt: nowIso
        };
        leads[matchedIdx] = updated;
        saveDemoHeadhunterLeads(leads);
        return updated;
      }

      const newLead: RecruiterLeadDTO = {
        id: `lead-${Date.now()}`,
        userId: 'demo-user',
        name: input.name,
        agency: input.agency,
        agencyTier: input.agencyTier || 'independent',
        role: input.role || 'Executive Recruiter',
        email: input.email,
        phone: input.phone,
        linkedinUrl: input.linkedinUrl,
        tier,
        rating,
        specialties: input.specialties || [],
        mandatesCount: 0,
        notes: input.notes,
        lastContactedAt: input.lastContactedAt,
        healthScore: health.healthScore,
        healthStatus: health.healthStatus,
        nextActionSuggestion: health.nextActionSuggestion,
        createdAt: nowIso,
        updatedAt: nowIso
      };
      saveDemoHeadhunterLeads([newLead, ...leads]);
      return newLead;
    }

    return request<RecruiterLeadDTO>('/headhunters', {
      method: 'POST',
      body: JSON.stringify({ ...input, id: existingId })
    });
  },

  async deleteLead(id: string): Promise<boolean> {
    if (demoMode) {
      const leads = getDemoHeadhunterLeads();
      const filtered = leads.filter(l => l.id !== id);
      saveDemoHeadhunterLeads(filtered);
      return true;
    }
    await request<void>(`/headhunters/${id}`, { method: 'DELETE' });
    return true;
  },

  async listMandates(leadId?: string): Promise<HeadhunterMandateDTO[]> {
    if (demoMode) {
      let mandates = getDemoHeadhunterMandates();
      if (leadId) {
        mandates = mandates.filter(m => m.leadId === leadId);
      }
      return mandates;
    }
    const query = leadId ? `?leadId=${encodeURIComponent(leadId)}` : '';
    try {
      return await request<HeadhunterMandateDTO[]>(`/headhunters/mandates${query}`);
    } catch {
      let mandates = getDemoHeadhunterMandates();
      if (leadId) {
        mandates = mandates.filter(m => m.leadId === leadId);
      }
      return mandates;
    }
  },

  async createMandate(input: HeadhunterMandateMutationInputDTO): Promise<HeadhunterMandateDTO> {
    if (demoMode) {
      const leads = getDemoHeadhunterLeads();
      const lead = leads.find(l => l.id === input.leadId);
      const recruiterName = lead ? lead.name : 'Recruiter';
      const agencyName = lead ? lead.agency : 'Agency';
      const nowIso = new Date().toISOString();

      const newMandate: HeadhunterMandateDTO = {
        id: `mandate-${Date.now()}`,
        userId: 'demo-user',
        leadId: input.leadId,
        recruiterName,
        agencyName,
        applicationId: input.applicationId,
        roleTitle: input.roleTitle,
        clientCompany: input.clientCompany,
        isConfidential: Boolean(input.isConfidential),
        exclusivity: input.exclusivity || 'unconfirmed',
        salaryRange: input.salaryRange,
        status: input.status || 'pitched',
        notes: input.notes,
        pitchedAt: nowIso,
        updatedAt: nowIso
      };

      const mandates = getDemoHeadhunterMandates();
      saveDemoHeadhunterMandates([newMandate, ...mandates]);

      if (lead) {
        lead.mandatesCount = (lead.mandatesCount || 0) + 1;
        lead.updatedAt = nowIso;
        saveDemoHeadhunterLeads(leads);
      }

      return newMandate;
    }

    return request<HeadhunterMandateDTO>('/headhunters/mandates', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async updateMandateStatus(id: string, status: MandateStatus): Promise<HeadhunterMandateDTO | null> {
    if (demoMode) {
      const mandates = getDemoHeadhunterMandates();
      const idx = mandates.findIndex(m => m.id === id);
      if (idx === -1) return null;
      mandates[idx].status = status;
      mandates[idx].updatedAt = new Date().toISOString();
      saveDemoHeadhunterMandates(mandates);
      return mandates[idx];
    }

    return request<HeadhunterMandateDTO>(`/headhunters/mandates/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  async parsePitch(input: ParseRecruiterPitchInputDTO): Promise<InboundPitchParseResultDTO> {
    if (demoMode) {
      return parseInboundRecruiterPitch(input.rawText, input.channel);
    }
    try {
      return await request<InboundPitchParseResultDTO>('/headhunters/parse-pitch', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return parseInboundRecruiterPitch(input.rawText, input.channel);
    }
  },

  async generateReply(input: {
    pitch: InboundPitchParseResultDTO;
    intent: RecruiterReplyIntent;
  }): Promise<RecruiterResponseDraftDTO> {
    if (demoMode) {
      return generateRecruiterReplyDraft(input.pitch, input.intent);
    }
    try {
      return await request<RecruiterResponseDraftDTO>('/headhunters/reply-draft', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return generateRecruiterReplyDraft(input.pitch, input.intent);
    }
  }
};

export type {
  EmailCategory,
  ExtractedEmailEntityDTO,
  IngestionActionType,
  EmailIngestProposalDTO,
  EmailIngestApplyResultDTO,
  CampaignObjective,
  OutreachTargetType,
  OutreachChannel,
  RecipientStatus,
  OutreachStepDTO,
  OutreachRecipientDTO,
  OutreachCampaignDTO,
  CampaignAnalyticsDTO,
  CreateCampaignInputDTO,
  AddRecipientInputDTO,
  UpdateRecipientStepInputDTO,
  SimulationTrack,
  SimulationDifficulty,
  SimulationPacingMode,
  TurnEvaluationDTO,
  SimulationSessionReportDTO,
  SimulationSessionDTO,
  StartSimulationInputDTO,
  SubmitTurnInputDTO,
  PortfolioDisplaySettings,
  PortfolioConfigDTO,
  DossierSkillItemDTO,
  DossierRoadmapProgressDTO,
  DossierSimulationReadinessDTO,
  PublicDossierViewDTO,
  ShareTokenDTO,
  UpdatePortfolioInputDTO,
  GenerateTokenInputDTO,
  Currency,
  EquityType,
  SeniorityLevel,
  MarketComparisonStatus,
  EquityGrantDTO,
  CompensationPackageDTO,
  EquityVestingMilestoneDTO,
  AnnualCompensationBreakdownDTO,
  CompensationForecastScenarioDTO,
  CompensationBenchmarkDTO,
  NegotiationLeveragePointDTO,
  CompensationForecastDTO,
  CreateCompensationForecastInputDTO,
  TrackType,
  PromotionDimension,
  GapLevel,
  PromotionCompetencyDTO,
  PromotionInitiativeDTO,
  PromotionReadinessDTO,
  TrajectoryStepDTO,
  TrajectorySimulationDTO,
  SimulateTrajectoryInputDTO,
  UpdateCompetenciesInputDTO,
  AtsKeywordCategory,
  KeywordImportance,
  KeywordGapItemDTO,
  AtsDiagnosticScoreBreakdownDTO,
  AtsDiagnosticResultDTO,
  BulletVariantType,
  XyzBreakdownDTO,
  BulletVariantOptionDTO,
  BulletOptimizationProposalDTO,
  OptimizedResumeVariantDTO,
  OptimizeResumeInputDTO,
  RewriteBulletInputDTO,
  ApplyRewritesInputDTO,
  BottleneckSeverity,
  StageConversionRateDTO,
  BottleneckDiagnosticDTO,
  VelocityTargetDTO,
  PipelineVelocitySimulationDTO,
  PipelineVelocityReportDTO,
  CalculateVelocityReportInputDTO,
  PipelineVelocitySimulationInputDTO,
  CultureDimension,
  ReverseInterviewTargetRole,
  CultureDimensionScoreDTO,
  ReverseInterviewQuestionDTO,
  CultureCompatibilityReportDTO,
  AnalyzeCultureInputDTO,
  CultureQuestionGenerationInputDTO,
  HeadhunterAgencyTier,
  RecruiterRelationshipTier,
  MandateExclusivity,
  MandateStatus,
  RecruiterReplyIntent,
  HeadhunterAgencyDTO,
  RecruiterLeadDTO,
  HeadhunterMandateDTO,
  InboundPitchParseResultDTO,
  ParseRecruiterPitchInputDTO,
  RecruiterResponseDraftDTO,
  RecruiterLeadMutationInputDTO,
  HeadhunterMandateMutationInputDTO
};





