import { request, ApiError } from './transport';
import { validApplications } from './validation';
import {
  emptyDraft,
  resolveLocalTime,
  deviceTimezone,
  type Application,
  type Draft,
  type Interview,
  type Status,
  type ExecutiveContractDTO,
  type ExecutiveContractMutationDTO,
  type ContractRedlineDTO,
  type ContractRedlineMutationDTO,
  type PriorInventionItemDTO,
  type PriorInventionMutationDTO,
  type RedlineStatus,
  type ClauseParametersMap,
  evaluateExecutiveContract,
  generateSynthesizedRedlines,
  generateExhibitAMarkdown,
  generateExecutiveAddendumMarkdown,
  type StakeholderCategory,
  type StakeholderInterviewStatus,
  type AlignmentLevel,
  type DiagnosticAreaKey,
  type MilestonePhaseKey,
  type OnboardingMilestoneStatus,
  type TransitionMomentumTier,
  type ExecutiveMemoType,
  type StakeholderDTO,
  type StakeholderMutationDTO,
  type DiagnosticDimensionDetailDTO,
  type ExecutiveDiagnosticsDTO,
  type ExecutiveDiagnosticsMutationDTO,
  type OnboardingMilestoneDTO,
  type OnboardingMilestoneMutationDTO,
  type TransitionMomentumDTO,
  type ExecutiveOnboardingPlanDTO,
  type ExecutiveOnboardingPlanMutationDTO,
  computeStakeholderRelationshipIndex,
  computeDiagnosticHealthIndex,
  createDefaultExecutiveDiagnostics,
  computeTransitionMomentum,
  generateExecutiveMemoMarkdown,
  type BoardMandateDTO,
  type BoardMandateMutationDTO,
  type FastEquityBenchmarkDTO,
  type DilutionExitScenarioDTO,
  type FastEquityDilutionModelDTO,
  type ConflictOfInterestCheckDTO,
  type OutsideBoardWaiverLetterDTO,
  type GovernanceMatrixDTO,
  type GovernanceMatrixMutationDTO,
  type BoardDossierDTO,
  type CompanyGrowthStage,
  type AdvisoryImpactLevel,
  type BoardMandateType,
  type MandatePipelineStage,
  type BoardEquityGrantType,
  type BoardVestingScheduleType,
  type AccelerationClauseType,
  type BoardCommitteeKey,
  type GovernanceQuotientTier,
  getFastEquityBenchmark,
  computeRetainedEquity,
  computeFastEquityDilutionModel,
  evaluateConflictOfInterest,
  computeGovernanceQuotient,
  generateOutsideBoardWaiverLetter,
  generateBoardDossierMarkdown
} from './domain';
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
  generateRecruiterReplyDraft,
  type SystemDesignScenarioId,
  type SystemDesignDifficulty,
  type SystemDesignSessionStatus,
  type DatabaseEngine,
  type CachingStrategy,
  type PartitionStrategy,
  type ConsistencyModel,
  type ApiProtocol,
  type SeniorityVerdict,
  type SystemCapacityInputDTO,
  type SystemCapacityEstimateDTO,
  type ScopeAndClarificationDTO,
  type ApiEndpointDefinitionDTO,
  type ArchitectureComponentDTO,
  type HighLevelDesignDTO,
  type DatabaseTableDefinitionDTO,
  type DeepDiveDesignDTO,
  type ResilienceAndScaleDTO,
  type SystemDesignBlueprintDTO,
  type PillarEvaluationDTO,
  type SystemDesignEvaluationDTO,
  type SystemDesignScenarioDTO,
  type SystemDesignSessionDTO,
  type SystemDesignSessionMutationInputDTO,
  SYSTEM_DESIGN_SCENARIOS,
  calculateCapacityEstimates,
  evaluateSystemArchitecture,
  exportBlueprintToMarkdown,
  type EquityGrantType,
  type VestingScheduleType,
  type AccelerationClause,
  type LiquidationPreferenceType,
  type TaxJurisdiction,
  type PreferredTierDTO,
  type CapTableSnapshotDTO,
  type ExecutiveEquityGrantDTO,
  type DilutionRoundDTO,
  type DilutionSimulationResultDTO,
  type WaterfallBreakdownDTO,
  type TaxOptimizationAnalysisDTO,
  type EquityModelDTO,
  type ExecutiveEquityGrantMutationDTO,
  type EquityModelMutationDTO,
  type ExecutivePackageComparisonDTO,
  calculateDilutionPipeline,
  computeExerciseCostAndTax,
  resolveLiquidationWaterfall,
  evaluateWaterfallMatrix,
  compareExecutiveEquityPackages,
  exportEquityModelToMarkdown,
  type ReferenceArchetype,
  type EndorsementStrength,
  type ExecutiveCompetencyKey,
  type NetworkOverlapDegree,
  type SentimentRiskTier,
  type VulnerabilityLevel,
  type TransitionFrictionType,
  type ReferenceAdvocateDTO,
  type ReferenceAdvocateMutationDTO,
  type TargetStakeholderNodeDTO,
  type CompetencyCoverageCellDTO,
  type Backchannel360CoverageMatrixDTO,
  type RefereeBriefingPacketDTO,
  type CareerTransitionRiskDTO,
  type BackchannelAuditDTO,
  type BackchannelAuditMutationDTO,
  calculateBackchannelProbability,
  compute360CoverageMatrix,
  computeAuditVulnerabilityIndex,
  generateRefereeBriefingPacketMarkdown,
  EXECUTIVE_COMPETENCY_LABELS,
  ARCHETYPE_LABELS
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

const DEMO_SYSTEM_DESIGN_KEY = 'jobtrack_demo_system_design_sessions_v1';

const DEMO_SYSTEM_DESIGN_SESSIONS: SystemDesignSessionDTO[] = [
  (() => {
    const sc = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'url_shortener')!;
    const est = calculateCapacityEstimates(sc.defaultCapacityInput);
    const ev = evaluateSystemArchitecture(sc.exemplarBlueprint, 'url_shortener', 'Staff Software Engineer');
    ev.sessionId = 'demo-sds-tinyurl-1';
    return {
      id: 'demo-sds-tinyurl-1',
      userId: 'demo-user',
      title: 'TinyURL High-Throughput Redirection & Analytics',
      scenarioId: 'url_shortener',
      targetRole: 'Staff Software Engineer',
      difficulty: 'senior',
      capacityInput: sc.defaultCapacityInput,
      capacityEstimates: est,
      blueprint: sc.exemplarBlueprint,
      status: 'evaluated',
      score: ev.overallScore,
      latestEvaluation: ev,
      createdAt: '2026-10-24T10:00:00.000Z',
      updatedAt: '2026-10-24T12:00:00.000Z'
    };
  })(),
  (() => {
    const sc = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'flash_sale')!;
    const est = calculateCapacityEstimates(sc.defaultCapacityInput);
    const ev = evaluateSystemArchitecture(sc.exemplarBlueprint, 'flash_sale', 'Principal Architect');
    ev.sessionId = 'demo-sds-flash-sale-2';
    return {
      id: 'demo-sds-flash-sale-2',
      userId: 'demo-user',
      title: '11.11 Flash Sale Token-Bucket Oversell Prevention',
      scenarioId: 'flash_sale',
      targetRole: 'Principal Architect',
      difficulty: 'principal',
      capacityInput: sc.defaultCapacityInput,
      capacityEstimates: est,
      blueprint: sc.exemplarBlueprint,
      status: 'evaluated',
      score: ev.overallScore,
      latestEvaluation: ev,
      createdAt: '2026-10-24T14:00:00.000Z',
      updatedAt: '2026-10-24T16:00:00.000Z'
    };
  })()
];

function getDemoSystemDesignSessions(): SystemDesignSessionDTO[] {
  try {
    const raw = localStorage.getItem(DEMO_SYSTEM_DESIGN_KEY);
    if (!raw) {
      saveDemoSystemDesignSessions(DEMO_SYSTEM_DESIGN_SESSIONS);
      return DEMO_SYSTEM_DESIGN_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEMO_SYSTEM_DESIGN_SESSIONS;
  } catch {
    return DEMO_SYSTEM_DESIGN_SESSIONS;
  }
}

function saveDemoSystemDesignSessions(sessions: SystemDesignSessionDTO[]): void {
  try {
    localStorage.setItem(DEMO_SYSTEM_DESIGN_KEY, JSON.stringify(sessions));
  } catch {
  }
}


export const systemDesignRepository = {
  async listScenarios(): Promise<SystemDesignScenarioDTO[]> {
    return SYSTEM_DESIGN_SCENARIOS;
  },

  async calculateCapacity(input: SystemCapacityInputDTO): Promise<SystemCapacityEstimateDTO> {
    return calculateCapacityEstimates(input);
  },

  async listSessions(scenarioId?: string): Promise<SystemDesignSessionDTO[]> {
    if (demoMode) {
      let sessions = getDemoSystemDesignSessions();
      if (scenarioId && scenarioId.trim().length > 0) {
        sessions = sessions.filter(s => s.scenarioId === scenarioId);
      }
      return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    const query = scenarioId ? `?scenarioId=${encodeURIComponent(scenarioId)}` : '';
    try {
      return await request<SystemDesignSessionDTO[]>(`/system-design/sessions${query}`);
    } catch {
      let sessions = getDemoSystemDesignSessions();
      if (scenarioId && scenarioId.trim().length > 0) {
        sessions = sessions.filter(s => s.scenarioId === scenarioId);
      }
      return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
  },

  async getSession(id: string): Promise<SystemDesignSessionDTO | null> {
    if (demoMode) {
      const sessions = getDemoSystemDesignSessions();
      return sessions.find(s => s.id === id) || null;
    }
    try {
      return await request<SystemDesignSessionDTO>(`/system-design/sessions/${id}`);
    } catch {
      const sessions = getDemoSystemDesignSessions();
      return sessions.find(s => s.id === id) || null;
    }
  },

  async createSession(input: SystemDesignSessionMutationInputDTO): Promise<SystemDesignSessionDTO> {
    if (demoMode) {
      const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === input.scenarioId) || SYSTEM_DESIGN_SCENARIOS[0];
      const capacityInput = input.capacityInput || scenario.defaultCapacityInput;
      const capacityEstimates = calculateCapacityEstimates(capacityInput);
      const blueprint = input.blueprint || scenario.exemplarBlueprint;
      const nowIso = new Date().toISOString();

      const newSession: SystemDesignSessionDTO = {
        id: `sds-${Date.now()}`,
        userId: 'demo-user',
        title: input.title.trim(),
        scenarioId: input.scenarioId,
        targetRole: input.targetRole || 'Senior Software Engineer',
        difficulty: input.difficulty || scenario.difficulty,
        capacityInput,
        capacityEstimates,
        blueprint,
        status: input.status || 'draft',
        latestEvaluation: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const sessions = getDemoSystemDesignSessions();
      saveDemoSystemDesignSessions([newSession, ...sessions]);
      return newSession;
    }

    try {
      return await request<SystemDesignSessionDTO>('/system-design/sessions', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === input.scenarioId) || SYSTEM_DESIGN_SCENARIOS[0];
      const capacityInput = input.capacityInput || scenario.defaultCapacityInput;
      const capacityEstimates = calculateCapacityEstimates(capacityInput);
      const blueprint = input.blueprint || scenario.exemplarBlueprint;
      const nowIso = new Date().toISOString();

      const newSession: SystemDesignSessionDTO = {
        id: `sds-${Date.now()}`,
        userId: 'demo-user',
        title: input.title.trim(),
        scenarioId: input.scenarioId,
        targetRole: input.targetRole || 'Senior Software Engineer',
        difficulty: input.difficulty || scenario.difficulty,
        capacityInput,
        capacityEstimates,
        blueprint,
        status: input.status || 'draft',
        latestEvaluation: null,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      const sessions = getDemoSystemDesignSessions();
      saveDemoSystemDesignSessions([newSession, ...sessions]);
      return newSession;
    }
  },

  async updateSession(
    id: string,
    input: Partial<SystemDesignSessionMutationInputDTO>
  ): Promise<SystemDesignSessionDTO | null> {
    if (demoMode) {
      const sessions = getDemoSystemDesignSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx === -1) return null;

      const current = sessions[idx];
      const capacityInput = input.capacityInput || current.capacityInput;
      const capacityEstimates = input.capacityInput ? calculateCapacityEstimates(capacityInput) : current.capacityEstimates;

      const updated: SystemDesignSessionDTO = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        scenarioId: input.scenarioId || current.scenarioId,
        targetRole: input.targetRole || current.targetRole,
        difficulty: input.difficulty || current.difficulty,
        capacityInput,
        capacityEstimates,
        blueprint: input.blueprint || current.blueprint,
        status: input.status || current.status,
        updatedAt: new Date().toISOString()
      };

      sessions[idx] = updated;
      saveDemoSystemDesignSessions(sessions);
      return updated;
    }

    try {
      return await request<SystemDesignSessionDTO>(`/system-design/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
      });
    } catch {
      const sessions = getDemoSystemDesignSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx === -1) return null;

      const current = sessions[idx];
      const capacityInput = input.capacityInput || current.capacityInput;
      const capacityEstimates = input.capacityInput ? calculateCapacityEstimates(capacityInput) : current.capacityEstimates;

      const updated: SystemDesignSessionDTO = {
        ...current,
        title: input.title !== undefined ? input.title.trim() : current.title,
        scenarioId: input.scenarioId || current.scenarioId,
        targetRole: input.targetRole || current.targetRole,
        difficulty: input.difficulty || current.difficulty,
        capacityInput,
        capacityEstimates,
        blueprint: input.blueprint || current.blueprint,
        status: input.status || current.status,
        updatedAt: new Date().toISOString()
      };

      sessions[idx] = updated;
      saveDemoSystemDesignSessions(sessions);
      return updated;
    }
  },

  async deleteSession(id: string): Promise<boolean> {
    if (demoMode) {
      const sessions = getDemoSystemDesignSessions();
      const filtered = sessions.filter(s => s.id !== id);
      saveDemoSystemDesignSessions(filtered);
      return true;
    }

    try {
      await request<void>(`/system-design/sessions/${id}`, { method: 'DELETE' });
      return true;
    } catch {
      const sessions = getDemoSystemDesignSessions();
      const filtered = sessions.filter(s => s.id !== id);
      saveDemoSystemDesignSessions(filtered);
      return true;
    }
  },

  async evaluateSession(id: string, targetRole?: string): Promise<SystemDesignEvaluationDTO | null> {
    if (demoMode) {
      const sessions = getDemoSystemDesignSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx === -1) return null;

      const session = sessions[idx];
      const role = targetRole || session.targetRole;
      const evaluation = evaluateSystemArchitecture(session.blueprint, session.scenarioId, role);
      evaluation.sessionId = id;

      session.score = evaluation.overallScore;
      session.status = 'evaluated';
      session.latestEvaluation = evaluation;
      session.updatedAt = new Date().toISOString();

      saveDemoSystemDesignSessions(sessions);
      return evaluation;
    }

    try {
      return await request<SystemDesignEvaluationDTO>(`/system-design/sessions/${id}/evaluate`, {
        method: 'POST',
        body: JSON.stringify({ targetRole })
      });
    } catch {
      const sessions = getDemoSystemDesignSessions();
      const idx = sessions.findIndex(s => s.id === id);
      if (idx === -1) return null;

      const session = sessions[idx];
      const role = targetRole || session.targetRole;
      const evaluation = evaluateSystemArchitecture(session.blueprint, session.scenarioId, role);
      evaluation.sessionId = id;

      session.score = evaluation.overallScore;
      session.status = 'evaluated';
      session.latestEvaluation = evaluation;
      session.updatedAt = new Date().toISOString();

      saveDemoSystemDesignSessions(sessions);
      return evaluation;
    }
  },

  async exportMarkdown(id: string): Promise<string | null> {
    if (demoMode) {
      const session = await this.getSession(id);
      if (!session) return null;
      return exportBlueprintToMarkdown(session, session.latestEvaluation);
    }

    try {
      const res = await request<{ markdown: string }>(`/system-design/sessions/${id}/export`);
      return res.markdown;
    } catch {
      const session = await this.getSession(id);
      if (!session) return null;
      return exportBlueprintToMarkdown(session, session.latestEvaluation);
    }
  }
};

const DEMO_EXECUTIVE_MODELS: EquityModelDTO[] = [
  {
    id: 'demo-model-fintech-cto',
    modelName: 'Series B SEA Fintech CTO Offer',
    grant: {
      id: 'grant-cto-sea',
      company: 'FinFlow Global (Singapore/VN)',
      role: 'Chief Technology Officer',
      grantType: 'esop',
      shareCount: 200000,
      strikePrice: 0.50,
      currentFmv: 2.20,
      preferredPrice: 4.80,
      grantDate: '2024-03-01',
      vestingStartDate: '2024-03-01',
      vestingScheduleType: 'standard_4yr_1yr_cliff',
      cliffMonths: 12,
      vestingDurationMonths: 48,
      postTerminationExerciseMonths: 120,
      accelerationClause: 'double_trigger_acceleration',
      hasEarlyExercise: true,
      section83bElected: false
    },
    capTable: {
      totalFullyDilutedShares: 10000000,
      commonShares: 6000000,
      unallocatedOptionPoolShares: 1000000,
      preferredTiers: [
        {
          tierName: 'Series Seed',
          originalInvestmentAmount: 2000000,
          sharesIssued: 1000000,
          preferenceMultiple: 1.0,
          participationType: 'non_participating',
          seniorityRank: 1
        },
        {
          tierName: 'Series A',
          originalInvestmentAmount: 8000000,
          sharesIssued: 2000000,
          preferenceMultiple: 1.0,
          participationType: 'non_participating',
          seniorityRank: 2
        }
      ]
    },
    dilutionRounds: [
      {
        roundName: 'Series B Growth',
        preMoneyValuation: 50000000,
        capitalRaised: 18000000,
        newOptionPoolExpansionPercent: 5,
        issuedShareCount: 3600000,
        postMoneyValuation: 68000000,
        investorSharePercentage: 26.47,
        cumulativeDilutionFactor: 73.53
      },
      {
        roundName: 'Series C Expansion',
        preMoneyValuation: 160000000,
        capitalRaised: 40000000,
        newOptionPoolExpansionPercent: 5,
        issuedShareCount: 3400000,
        postMoneyValuation: 200000000,
        investorSharePercentage: 20.0,
        cumulativeDilutionFactor: 58.82
      }
    ],
    exitScenarios: evaluateWaterfallMatrix(
      [25000000, 50000000, 100000000, 250000000, 500000000, 1000000000],
      {
        totalFullyDilutedShares: 17000000,
        commonShares: 6000000,
        unallocatedOptionPoolShares: 1000000,
        preferredTiers: [
          {
            tierName: 'Series Seed',
            originalInvestmentAmount: 2000000,
            sharesIssued: 1000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 1
          },
          {
            tierName: 'Series A',
            originalInvestmentAmount: 8000000,
            sharesIssued: 2000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 2
          },
          {
            tierName: 'Series B Growth',
            originalInvestmentAmount: 18000000,
            sharesIssued: 3600000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 3
          },
          {
            tierName: 'Series C Expansion',
            originalInvestmentAmount: 40000000,
            sharesIssued: 3400000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 4
          }
        ]
      },
      200000,
      0.50,
      'vietnam_pit'
    ),
    taxAnalysis: computeExerciseCostAndTax(
      {
        id: 'grant-cto-sea',
        company: 'FinFlow Global (Singapore/VN)',
        role: 'Chief Technology Officer',
        grantType: 'esop',
        shareCount: 200000,
        strikePrice: 0.50,
        currentFmv: 2.20,
        preferredPrice: 4.80,
        grantDate: '2024-03-01',
        vestingStartDate: '2024-03-01',
        vestingScheduleType: 'standard_4yr_1yr_cliff',
        cliffMonths: 12,
        vestingDurationMonths: 48,
        postTerminationExerciseMonths: 120,
        accelerationClause: 'double_trigger_acceleration',
        hasEarlyExercise: true,
        section83bElected: false
      },
      14.71,
      14.71,
      'vietnam_pit'
    ),
    notes: 'Negotiated 10-year post-termination exercise window and double-trigger acceleration upon change of control.',
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z'
  },
  {
    id: 'demo-model-us-vp',
    modelName: 'Pre-IPO Enterprise AI VP Engineering Offer',
    grant: {
      id: 'grant-vp-ai',
      company: 'CognitiveScale AI',
      role: 'VP of Engineering',
      grantType: 'iso',
      shareCount: 125000,
      strikePrice: 2.40,
      currentFmv: 8.50,
      preferredPrice: 18.00,
      grantDate: '2024-02-15',
      vestingStartDate: '2024-02-15',
      vestingScheduleType: 'standard_4yr_1yr_cliff',
      cliffMonths: 12,
      vestingDurationMonths: 48,
      postTerminationExerciseMonths: 90,
      accelerationClause: 'single_trigger_acceleration',
      hasEarlyExercise: true,
      section83bElected: true
    },
    capTable: {
      totalFullyDilutedShares: 25000000,
      commonShares: 15000000,
      unallocatedOptionPoolShares: 2500000,
      preferredTiers: [
        {
          tierName: 'Series A',
          originalInvestmentAmount: 15000000,
          sharesIssued: 3500000,
          preferenceMultiple: 1.0,
          participationType: 'non_participating',
          seniorityRank: 1
        },
        {
          tierName: 'Series B',
          originalInvestmentAmount: 45000000,
          sharesIssued: 4000000,
          preferenceMultiple: 1.0,
          participationType: 'non_participating',
          seniorityRank: 2
        }
      ]
    },
    dilutionRounds: [
      {
        roundName: 'Series C Mezzanine',
        preMoneyValuation: 350000000,
        capitalRaised: 70000000,
        newOptionPoolExpansionPercent: 3,
        issuedShareCount: 5000000,
        postMoneyValuation: 420000000,
        investorSharePercentage: 16.67,
        cumulativeDilutionFactor: 83.33
      }
    ],
    exitScenarios: evaluateWaterfallMatrix(
      [50000000, 100000000, 250000000, 500000000, 1000000000, 1500000000],
      {
        totalFullyDilutedShares: 30000000,
        commonShares: 15000000,
        unallocatedOptionPoolShares: 2500000,
        preferredTiers: [
          {
            tierName: 'Series A',
            originalInvestmentAmount: 15000000,
            sharesIssued: 3500000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 1
          },
          {
            tierName: 'Series B',
            originalInvestmentAmount: 45000000,
            sharesIssued: 4000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 2
          },
          {
            tierName: 'Series C Mezzanine',
            originalInvestmentAmount: 70000000,
            sharesIssued: 5000000,
            preferenceMultiple: 1.0,
            participationType: 'non_participating',
            seniorityRank: 3
          }
        ]
      },
      125000,
      2.40,
      'us_federal_california'
    ),
    taxAnalysis: computeExerciseCostAndTax(
      {
        id: 'grant-vp-ai',
        company: 'CognitiveScale AI',
        role: 'VP of Engineering',
        grantType: 'iso',
        shareCount: 125000,
        strikePrice: 2.40,
        currentFmv: 8.50,
        preferredPrice: 18.00,
        grantDate: '2024-02-15',
        vestingStartDate: '2024-02-15',
        vestingScheduleType: 'standard_4yr_1yr_cliff',
        cliffMonths: 12,
        vestingDurationMonths: 48,
        postTerminationExerciseMonths: 90,
        accelerationClause: 'single_trigger_acceleration',
        hasEarlyExercise: true,
        section83bElected: true
      },
      33.33,
      33.33,
      'us_federal_california'
    ),
    notes: '83(b) election filed within 30 days of unvested early exercise.',
    createdAt: '2024-02-15T00:00:00.000Z',
    updatedAt: '2024-02-15T00:00:00.000Z'
  }
];

const EQUITY_MODELS_STORAGE_KEY = 'jobtrack_equity_models_v1';

function getDemoEquityModels(): EquityModelDTO[] {
  try {
    const raw = localStorage.getItem(EQUITY_MODELS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEMO_EXECUTIVE_MODELS;
}

function saveDemoEquityModels(list: EquityModelDTO[]): void {
  try {
    localStorage.setItem(EQUITY_MODELS_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export const equityRepository = {
  async listModels(): Promise<EquityModelDTO[]> {
    if (demoMode) {
      return getDemoEquityModels();
    }
    try {
      return await request<EquityModelDTO[]>('/equity/models');
    } catch {
      return getDemoEquityModels();
    }
  },

  async getModel(id: string): Promise<EquityModelDTO | null> {
    if (demoMode) {
      const list = getDemoEquityModels();
      return list.find(m => m.id === id) || null;
    }
    try {
      return await request<EquityModelDTO>(`/equity/models/${encodeURIComponent(id)}`);
    } catch {
      const list = getDemoEquityModels();
      return list.find(m => m.id === id) || null;
    }
  },

  async saveModel(payload: EquityModelMutationDTO, existingId?: string): Promise<EquityModelDTO> {
    if (demoMode) {
      return this.saveModelDemo(payload, existingId);
    }

    try {
      if (existingId) {
        return await request<EquityModelDTO>(`/equity/models/${encodeURIComponent(existingId)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      }
      return await request<EquityModelDTO>('/equity/models', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      return this.saveModelDemo(payload, existingId);
    }
  },

  saveModelDemo(payload: EquityModelMutationDTO, existingId?: string): EquityModelDTO {
    const list = getDemoEquityModels();
    const grantId = existingId || `demo-grant-${Date.now()}`;
    const modelId = existingId || `demo-model-${Date.now()}`;
    const now = new Date().toISOString();

    const dilutionResult = calculateDilutionPipeline(payload.capTable, payload.grant.shareCount, payload.dilutionRounds);
    const exitScenarios = evaluateWaterfallMatrix(
      payload.exitValuations,
      dilutionResult.finalCapTable,
      dilutionResult.executiveDilutedShares,
      payload.grant.strikePrice,
      payload.taxJurisdiction
    );

    const medianExit = exitScenarios[Math.floor(exitScenarios.length / 2)] || exitScenarios[0];
    const targetFmv = medianExit ? medianExit.commonSharePrice : payload.grant.currentFmv;

    const taxAnalysis = computeExerciseCostAndTax(
      {
        id: grantId,
        ...payload.grant
      },
      targetFmv,
      targetFmv,
      payload.taxJurisdiction
    );

    const fullModel: EquityModelDTO = {
      id: modelId,
      modelName: payload.modelName,
      applicationId: payload.applicationId,
      grant: {
        id: grantId,
        ...payload.grant
      },
      capTable: payload.capTable,
      dilutionRounds: payload.dilutionRounds,
      exitScenarios,
      taxAnalysis,
      notes: payload.notes,
      createdAt: now,
      updatedAt: now
    };

    const existingIndex = list.findIndex(m => m.id === modelId);
    if (existingIndex >= 0) {
      list[existingIndex] = fullModel;
    } else {
      list.unshift(fullModel);
    }
    saveDemoEquityModels(list);
    return fullModel;
  },

  async deleteModel(id: string): Promise<void> {
    if (demoMode) {
      const list = getDemoEquityModels().filter(m => m.id !== id);
      saveDemoEquityModels(list);
      return;
    }
    try {
      await request<void>(`/equity/models/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
    } catch {
      const list = getDemoEquityModels().filter(m => m.id !== id);
      saveDemoEquityModels(list);
    }
  },

  async exportMarkdown(id: string): Promise<string> {
    if (demoMode) {
      const model = await this.getModel(id);
      if (!model) throw new Error('Khong tim thay mo hinh co phan demo.');
      return exportEquityModelToMarkdown(model);
    }
    try {
      const res = await request<{ markdown: string }>(`/equity/models/${encodeURIComponent(id)}/export`);
      return res.markdown;
    } catch {
      const model = await this.getModel(id);
      if (!model) throw new Error('Khong tim thay mo hinh co phan demo.');
      return exportEquityModelToMarkdown(model);
    }
  },

  async compareModels(modelIdA: string, modelIdB: string): Promise<ExecutivePackageComparisonDTO | null> {
    if (demoMode) {
      const a = await this.getModel(modelIdA);
      const b = await this.getModel(modelIdB);
      if (!a || !b) return null;
      return compareExecutiveEquityPackages(a, b);
    }
    try {
      return await request<ExecutivePackageComparisonDTO>('/equity/compare', {
        method: 'POST',
        body: JSON.stringify({ modelIdA, modelIdB })
      });
    } catch {
      const a = await this.getModel(modelIdA);
      const b = await this.getModel(modelIdB);
      if (!a || !b) return null;
      return compareExecutiveEquityPackages(a, b);
    }
  }
};

const DEMO_REFERENCE_ADVOCATES: ReferenceAdvocateDTO[] = [
  {
    id: 'adv-exec-1',
    fullName: 'Michael Pham',
    currentTitle: 'Chief Technology Officer',
    currentCompany: 'Apex FinTech Global',
    relationshipArchetype: 'superior_sponsor',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-01',
    sharedTenureEnd: '2023-06',
    sharedTenureMonths: 42,
    projectsCoDelivered: ['Global Core Payment Gateway', 'PCI-DSS Tier-1 Compliance Program'],
    endorsementStrength: 'unconditional_champion',
    vouchedCompetencies: ['scaling_0_to_1', 'board_governance', 'crisis_incident_response'],
    email: 'michael.pham@apexfintech.io',
    phone: '+1 (415) 555-0192',
    linkedinUrl: 'https://linkedin.com/in/michaelpham-cto',
    preferredChannel: 'email',
    ndaRestricted: false,
    notes: 'Can vouch for executive board presentations, scaling from 5 to 50 engineers, and navigating banking partner diligence.',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z'
  },
  {
    id: 'adv-exec-2',
    fullName: 'Sarah Chen',
    currentTitle: 'VP of Product',
    currentCompany: 'CloudSphere AI',
    relationshipArchetype: 'cross_functional_peer',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-05',
    sharedTenureEnd: '2023-06',
    sharedTenureMonths: 37,
    projectsCoDelivered: ['Multi-Tenant Billing Engine', 'Automated Dispute Settlement Engine'],
    endorsementStrength: 'strong_advocate',
    vouchedCompetencies: ['cross_functional_synergy', 'scaling_0_to_1'],
    email: 'sarah.chen@cloudsphere.ai',
    phone: '+1 (650) 555-0143',
    linkedinUrl: 'https://linkedin.com/in/sarahchen-vpproduct',
    preferredChannel: 'linkedin',
    ndaRestricted: false,
    notes: 'Strongest cross-functional partner. Can speak to tight engineering-product alignment, PRD trade-offs, and velocity.',
    createdAt: '2026-01-12T00:00:00.000Z',
    updatedAt: '2026-01-12T00:00:00.000Z'
  },
  {
    id: 'adv-exec-3',
    fullName: 'Alex Tran',
    currentTitle: 'Principal Staff Engineer',
    currentCompany: 'FinFlow Global',
    relationshipArchetype: 'direct_report',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-08',
    sharedTenureEnd: '2023-06',
    sharedTenureMonths: 34,
    projectsCoDelivered: ['Distributed Ledger Re-Architecture', 'Zero-Downtime Migration to Aurora'],
    endorsementStrength: 'unconditional_champion',
    vouchedCompetencies: ['people_leadership', 'turnaround_restructuring'],
    email: 'alex.tran@finflow.io',
    preferredChannel: 'signal',
    ndaRestricted: false,
    notes: 'Former direct report. Mentored from Senior to Principal. Validates management empathy, zero attrition on squad, and technical coaching.',
    createdAt: '2026-01-14T00:00:00.000Z',
    updatedAt: '2026-01-14T00:00:00.000Z'
  },
  {
    id: 'adv-exec-4',
    fullName: 'David Sterling',
    currentTitle: 'General Partner',
    currentCompany: 'Horizon Ventures',
    relationshipArchetype: 'external_stakeholder',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-01',
    sharedTenureEnd: '2023-06',
    sharedTenureMonths: 42,
    projectsCoDelivered: ['Series B Technical Due Diligence', 'Executive Board Roadmaps'],
    endorsementStrength: 'strong_advocate',
    vouchedCompetencies: ['board_governance', 'scaling_0_to_1'],
    email: 'david@horizonvc.com',
    preferredChannel: 'email',
    ndaRestricted: false,
    notes: 'FinFlow Series A & B lead investor. High backchannel authority with Silicon Valley and Southeast Asian VC syndicates.',
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z'
  }
];

const DEMO_BACKCHANNEL_AUDITS: BackchannelAuditDTO[] = [
  {
    id: 'audit-demo-1',
    applicationId: 'app-cognitive-scale',
    auditName: 'CognitiveScale AI Executive Vulnerability Audit',
    targetCompany: 'CognitiveScale AI',
    targetRole: 'VP of Engineering',
    advocateIds: ['adv-exec-1', 'adv-exec-2', 'adv-exec-3', 'adv-exec-4'],
    stakeholders: [
      {
        id: 'stk-1',
        fullName: 'Marcus Vance',
        role: 'Co-Founder & Chief Executive Officer',
        organization: 'CognitiveScale AI',
        isDecisionMaker: true,
        networkOverlapDegree: 'second_degree',
        mutualCompanies: ['FinFlow Global'],
        mutualTenureOverlapMonths: 18,
        potentialBackchannelIntermediaries: ['David Sterling (Horizon Ventures)'],
        predictedSentiment: 'champion',
        probabilityScore: 78,
        rationale: 'Primary decision-maker; mutual Series B investor path through Horizon Ventures'
      },
      {
        id: 'stk-2',
        fullName: 'Dr. Evelyn Reed',
        role: 'Head of AI Research & Co-Founder',
        organization: 'CognitiveScale AI',
        isDecisionMaker: true,
        networkOverlapDegree: 'second_degree',
        mutualCompanies: [],
        mutualTenureOverlapMonths: 0,
        potentialBackchannelIntermediaries: ['Stanford AI Alumni Network'],
        predictedSentiment: 'neutral',
        probabilityScore: 42,
        rationale: 'Co-founder evaluating architectural scale; 2nd-degree academic overlap'
      },
      {
        id: 'stk-3',
        fullName: 'Jonathan Cole',
        role: 'Board Director (Tier-1 VC)',
        organization: 'Sequoia Southeast Asia',
        isDecisionMaker: true,
        networkOverlapDegree: 'first_degree',
        mutualCompanies: ['FinFlow Global'],
        mutualTenureOverlapMonths: 36,
        potentialBackchannelIntermediaries: ['Michael Pham'],
        predictedSentiment: 'adverse_risk',
        probabilityScore: 92,
        rationale: 'High probability backchannel check; board member with legacy ties to past FinFlow restructuring'
      }
    ],
    coverageMatrix: compute360CoverageMatrix(DEMO_REFERENCE_ADVOCATES),
    risks: [
      {
        id: 'risk-1',
        frictionType: 'mass_layoff_restructuring',
        company: 'FinFlow Global',
        timeframe: '2023-Q1',
        candidateContext: 'Macro interest rate shock led to company-wide 20% workforce reduction mandated by board.',
        framingNarrative: 'Engineered clean organizational consolidation, preserved 100% of critical core payment infrastructure, and offered severance above market with career placement.',
        defensibleFacts: [
          'Core platform uptime remained 99.995% throughout restructuring',
          'Zero voluntary attrition of remaining senior staff over following 12 months',
          'Restructuring achieved target 35% burn reduction to reach GAAP profitability'
        ],
        refereeAlignmentScript: 'When asked about the 2023 re-org: "The candidate led the difficult restructuring with deep empathy and transparent communication, protecting critical tech assets while executing board directives flawlessly."',
        proactiveReframing: 'Demonstrates financial realism and tough leadership courage under economic downturn pressure.'
      }
    ],
    briefings: [],
    overallBackchannelVulnerabilityIndex: 56,
    vulnerabilityLevel: 'high_exposure',
    strategicRecommendations: [
      'Noticeable network overlap with neutral and adverse hiring authorities.',
      'Deploy David Sterling (Horizon Ventures) to proactively contact Marcus Vance before formal offer committee.',
      'Pre-brief Michael Pham and Sarah Chen on Jonathan Cole (Sequoia) likely outreach regarding 2023 restructuring.'
    ],
    createdAt: '2026-01-20T00:00:00.000Z',
    updatedAt: '2026-01-20T00:00:00.000Z'
  }
];

function loadDemoAdvocates(): ReferenceAdvocateDTO[] {
  try {
    const raw = localStorage.getItem('jobtrack_demo_reference_advocates');
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [...DEMO_REFERENCE_ADVOCATES];
}

function saveDemoAdvocates(advocates: ReferenceAdvocateDTO[]): void {
  try {
    localStorage.setItem('jobtrack_demo_reference_advocates', JSON.stringify(advocates));
  } catch {
  }
}

function loadDemoAudits(): BackchannelAuditDTO[] {
  try {
    const raw = localStorage.getItem('jobtrack_demo_backchannel_audits');
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [...DEMO_BACKCHANNEL_AUDITS];
}

function saveDemoAudits(audits: BackchannelAuditDTO[]): void {
  try {
    localStorage.setItem('jobtrack_demo_backchannel_audits', JSON.stringify(audits));
  } catch {
  }
}

const backchannelRepository = {
  async listAdvocates(): Promise<ReferenceAdvocateDTO[]> {
    if (demoMode) return loadDemoAdvocates();
    try {
      return await request<ReferenceAdvocateDTO[]>('/backchannel/advocates');
    } catch {
      return loadDemoAdvocates();
    }
  },

  async getAdvocate(id: string): Promise<ReferenceAdvocateDTO | null> {
    if (demoMode) {
      const list = loadDemoAdvocates();
      return list.find(a => a.id === id) || null;
    }
    try {
      return await request<ReferenceAdvocateDTO>(`/backchannel/advocates/${encodeURIComponent(id)}`);
    } catch {
      const list = loadDemoAdvocates();
      return list.find(a => a.id === id) || null;
    }
  },

  async createAdvocate(input: ReferenceAdvocateMutationDTO): Promise<ReferenceAdvocateDTO> {
    if (demoMode) {
      const list = loadDemoAdvocates();
      const now = new Date().toISOString();
      const newAdvocate: ReferenceAdvocateDTO = {
        id: `adv-${Date.now()}`,
        ...input,
        createdAt: now,
        updatedAt: now
      };
      list.unshift(newAdvocate);
      saveDemoAdvocates(list);
      return newAdvocate;
    }
    try {
      return await request<ReferenceAdvocateDTO>('/backchannel/advocates', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      const list = loadDemoAdvocates();
      const now = new Date().toISOString();
      const newAdvocate: ReferenceAdvocateDTO = {
        id: `adv-${Date.now()}`,
        ...input,
        createdAt: now,
        updatedAt: now
      };
      list.unshift(newAdvocate);
      saveDemoAdvocates(list);
      return newAdvocate;
    }
  },

  async updateAdvocate(id: string, input: Partial<ReferenceAdvocateMutationDTO>): Promise<ReferenceAdvocateDTO | null> {
    if (demoMode) {
      const list = loadDemoAdvocates();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      const updated: ReferenceAdvocateDTO = {
        ...list[idx],
        ...input,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveDemoAdvocates(list);
      return updated;
    }
    try {
      return await request<ReferenceAdvocateDTO>(`/backchannel/advocates/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
      });
    } catch {
      const list = loadDemoAdvocates();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      const updated: ReferenceAdvocateDTO = {
        ...list[idx],
        ...input,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveDemoAdvocates(list);
      return updated;
    }
  },

  async deleteAdvocate(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoAdvocates();
      const nextList = list.filter(a => a.id !== id);
      const deleted = nextList.length !== list.length;
      if (deleted) saveDemoAdvocates(nextList);
      return deleted;
    }
    try {
      await request<void>(`/backchannel/advocates/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return true;
    } catch {
      const list = loadDemoAdvocates();
      const nextList = list.filter(a => a.id !== id);
      const deleted = nextList.length !== list.length;
      if (deleted) saveDemoAdvocates(nextList);
      return deleted;
    }
  },

  async listAudits(): Promise<BackchannelAuditDTO[]> {
    if (demoMode) return loadDemoAudits();
    try {
      return await request<BackchannelAuditDTO[]>('/backchannel/audits');
    } catch {
      return loadDemoAudits();
    }
  },

  async getAudit(id: string): Promise<BackchannelAuditDTO | null> {
    if (demoMode) {
      const list = loadDemoAudits();
      return list.find(a => a.id === id) || null;
    }
    try {
      return await request<BackchannelAuditDTO>(`/backchannel/audits/${encodeURIComponent(id)}`);
    } catch {
      const list = loadDemoAudits();
      return list.find(a => a.id === id) || null;
    }
  },

  async createAudit(input: BackchannelAuditMutationDTO): Promise<BackchannelAuditDTO> {
    if (demoMode) {
      const list = loadDemoAudits();
      const advocates = loadDemoAdvocates();
      const selected = advocates.filter(a => (input.advocateIds || []).includes(a.id));
      const scoredStakeholders = (input.stakeholders || []).map(s => {
        const { probabilityScore, rationale } = calculateBackchannelProbability(s);
        return { ...s, probabilityScore, rationale };
      });
      const { vulnerabilityIndex, level, recommendations } = computeAuditVulnerabilityIndex(scoredStakeholders);
      const coverageMatrix = compute360CoverageMatrix(selected, input.requiredCompetencies);
      const now = new Date().toISOString();

      const newAudit: BackchannelAuditDTO = {
        id: `audit-${Date.now()}`,
        applicationId: input.applicationId,
        auditName: input.auditName,
        targetCompany: input.targetCompany,
        targetRole: input.targetRole,
        advocateIds: input.advocateIds || [],
        stakeholders: scoredStakeholders,
        coverageMatrix,
        risks: input.risks || [],
        briefings: [],
        overallBackchannelVulnerabilityIndex: vulnerabilityIndex,
        vulnerabilityLevel: level,
        strategicRecommendations: recommendations,
        createdAt: now,
        updatedAt: now
      };
      list.unshift(newAudit);
      saveDemoAudits(list);
      return newAudit;
    }
    try {
      return await request<BackchannelAuditDTO>('/backchannel/audits', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      const list = loadDemoAudits();
      const advocates = loadDemoAdvocates();
      const selected = advocates.filter(a => (input.advocateIds || []).includes(a.id));
      const scoredStakeholders = (input.stakeholders || []).map(s => {
        const { probabilityScore, rationale } = calculateBackchannelProbability(s);
        return { ...s, probabilityScore, rationale };
      });
      const { vulnerabilityIndex, level, recommendations } = computeAuditVulnerabilityIndex(scoredStakeholders);
      const coverageMatrix = compute360CoverageMatrix(selected, input.requiredCompetencies);
      const now = new Date().toISOString();

      const newAudit: BackchannelAuditDTO = {
        id: `audit-${Date.now()}`,
        applicationId: input.applicationId,
        auditName: input.auditName,
        targetCompany: input.targetCompany,
        targetRole: input.targetRole,
        advocateIds: input.advocateIds || [],
        stakeholders: scoredStakeholders,
        coverageMatrix,
        risks: input.risks || [],
        briefings: [],
        overallBackchannelVulnerabilityIndex: vulnerabilityIndex,
        vulnerabilityLevel: level,
        strategicRecommendations: recommendations,
        createdAt: now,
        updatedAt: now
      };
      list.unshift(newAudit);
      saveDemoAudits(list);
      return newAudit;
    }
  },

  async updateAudit(id: string, input: Partial<BackchannelAuditMutationDTO>): Promise<BackchannelAuditDTO | null> {
    if (demoMode) {
      const list = loadDemoAudits();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      const existing = list[idx];
      const advocates = loadDemoAdvocates();
      const advocateIds = input.advocateIds !== undefined ? input.advocateIds : existing.advocateIds;
      const selected = advocates.filter(a => advocateIds.includes(a.id));
      const stakeholders = (input.stakeholders !== undefined ? input.stakeholders : existing.stakeholders).map(s => {
        const { probabilityScore, rationale } = calculateBackchannelProbability(s);
        return { ...s, probabilityScore, rationale };
      });
      const { vulnerabilityIndex, level, recommendations } = computeAuditVulnerabilityIndex(stakeholders);
      const coverageMatrix = compute360CoverageMatrix(selected, input.requiredCompetencies);

      const updated: BackchannelAuditDTO = {
        ...existing,
        ...input,
        stakeholders,
        coverageMatrix,
        overallBackchannelVulnerabilityIndex: vulnerabilityIndex,
        vulnerabilityLevel: level,
        strategicRecommendations: recommendations,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveDemoAudits(list);
      return updated;
    }
    try {
      return await request<BackchannelAuditDTO>(`/backchannel/audits/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
      });
    } catch {
      const list = loadDemoAudits();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      const existing = list[idx];
      const advocates = loadDemoAdvocates();
      const advocateIds = input.advocateIds !== undefined ? input.advocateIds : existing.advocateIds;
      const selected = advocates.filter(a => advocateIds.includes(a.id));
      const stakeholders = (input.stakeholders !== undefined ? input.stakeholders : existing.stakeholders).map(s => {
        const { probabilityScore, rationale } = calculateBackchannelProbability(s);
        return { ...s, probabilityScore, rationale };
      });
      const { vulnerabilityIndex, level, recommendations } = computeAuditVulnerabilityIndex(stakeholders);
      const coverageMatrix = compute360CoverageMatrix(selected, input.requiredCompetencies);

      const updated: BackchannelAuditDTO = {
        ...existing,
        ...input,
        stakeholders,
        coverageMatrix,
        overallBackchannelVulnerabilityIndex: vulnerabilityIndex,
        vulnerabilityLevel: level,
        strategicRecommendations: recommendations,
        updatedAt: new Date().toISOString()
      };
      list[idx] = updated;
      saveDemoAudits(list);
      return updated;
    }
  },

  async deleteAudit(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoAudits();
      const nextList = list.filter(a => a.id !== id);
      const deleted = nextList.length !== list.length;
      if (deleted) saveDemoAudits(nextList);
      return deleted;
    }
    try {
      await request<void>(`/backchannel/audits/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return true;
    } catch {
      const list = loadDemoAudits();
      const nextList = list.filter(a => a.id !== id);
      const deleted = nextList.length !== list.length;
      if (deleted) saveDemoAudits(nextList);
      return deleted;
    }
  },

  async generateBriefing(auditId: string, advocateId: string): Promise<RefereeBriefingPacketDTO | null> {
    if (demoMode) {
      const audit = await this.getAudit(auditId);
      const advocate = await this.getAdvocate(advocateId);
      if (!audit || !advocate) return null;

      const packet = generateRefereeBriefingPacketMarkdown(advocate, {
        targetCompany: audit.targetCompany,
        targetRole: audit.targetRole,
        applicationId: audit.applicationId
      });

      const otherBriefings = audit.briefings.filter(b => b.advocateId !== advocateId);
      audit.briefings = [...otherBriefings, packet];
      await this.updateAudit(auditId, audit);
      return packet;
    }
    try {
      return await request<RefereeBriefingPacketDTO>(`/backchannel/audits/${encodeURIComponent(auditId)}/generate-briefing`, {
        method: 'POST',
        body: JSON.stringify({ advocateId })
      });
    } catch {
      const audit = await this.getAudit(auditId);
      const advocate = await this.getAdvocate(advocateId);
      if (!audit || !advocate) return null;

      const packet = generateRefereeBriefingPacketMarkdown(advocate, {
        targetCompany: audit.targetCompany,
        targetRole: audit.targetRole,
        applicationId: audit.applicationId
      });

      const otherBriefings = audit.briefings.filter(b => b.advocateId !== advocateId);
      audit.briefings = [...otherBriefings, packet];
      await this.updateAudit(auditId, audit);
      return packet;
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
  HeadhunterMandateMutationInputDTO,
  SystemDesignScenarioId,
  SystemDesignDifficulty,
  SystemDesignSessionStatus,
  DatabaseEngine,
  CachingStrategy,
  PartitionStrategy,
  ConsistencyModel,
  ApiProtocol,
  SeniorityVerdict,
  SystemCapacityInputDTO,
  SystemCapacityEstimateDTO,
  ScopeAndClarificationDTO,
  ApiEndpointDefinitionDTO,
  ArchitectureComponentDTO,
  HighLevelDesignDTO,
  DatabaseTableDefinitionDTO,
  DeepDiveDesignDTO,
  ResilienceAndScaleDTO,
  SystemDesignBlueprintDTO,
  PillarEvaluationDTO,
  SystemDesignEvaluationDTO,
  SystemDesignScenarioDTO,
  SystemDesignSessionDTO,
  SystemDesignSessionMutationInputDTO,
  EquityGrantType,
  VestingScheduleType,
  AccelerationClause,
  LiquidationPreferenceType,
  TaxJurisdiction,
  PreferredTierDTO,
  CapTableSnapshotDTO,
  ExecutiveEquityGrantDTO,
  DilutionRoundDTO,
  DilutionSimulationResultDTO,
  WaterfallBreakdownDTO,
  TaxOptimizationAnalysisDTO,
  EquityModelDTO,
  ExecutiveEquityGrantMutationDTO,
  EquityModelMutationDTO,
  ExecutivePackageComparisonDTO,
  ReferenceArchetype,
  EndorsementStrength,
  ExecutiveCompetencyKey,
  NetworkOverlapDegree,
  SentimentRiskTier,
  VulnerabilityLevel,
  TransitionFrictionType,
  ReferenceAdvocateDTO,
  ReferenceAdvocateMutationDTO,
  TargetStakeholderNodeDTO,
  CompetencyCoverageCellDTO,
  Backchannel360CoverageMatrixDTO,
  RefereeBriefingPacketDTO,
  CareerTransitionRiskDTO,
  BackchannelAuditDTO,
  BackchannelAuditMutationDTO
};

export { backchannelRepository, executiveContractRepository, executiveOnboardingRepository };

const DEFAULT_DEMO_CONTRACTS: ExecutiveContractDTO[] = [
  {
    id: 'contract-demo-1',
    companyName: 'Acme Cloud AI',
    roleTitle: 'VP of Engineering',
    jurisdiction: 'us_delaware_ny',
    contractRiskIndex: 72,
    riskTier: 'high_vulnerability',
    clawbackPenalty: 10,
    activeHazards: [
      'Indentured Labor Trap: Draconian post-employment non-compete combined with zero severance.'
    ],
    pillarScores: {
      non_compete_non_solicit: 85,
      ip_prior_inventions: 70,
      severance_without_cause: 65,
      double_trigger_cic: 80,
      indemnification_d_and_o: 50
    },
    clauses: [
      {
        pillarKey: 'non_compete_non_solicit',
        title: 'Non-Compete & Non-Solicitation Covenants',
        subScore: 85,
        weight: 0.20,
        isToxic: true,
        summary: 'Non-compete duration: 18m, scope: worldwide_broad.',
        identifiedRisks: [
          'Excessive restriction duration (18 months exceeds standard 12-month executive threshold)',
          'Overly broad geographic scope (worldwide/unlimited)',
          'Inadequate or zero Garden Leave compensation during post-employment restriction'
        ],
        statutoryReference: 'Standard Common Law Reasonableness Doctrine',
        parameters: {
          durationMonths: 18,
          scope: 'worldwide_broad',
          gardenLeavePercent: 0,
          solicitationBreadth: 'all_customers_vendors',
          explicitCaDisclaimer: false
        }
      },
      {
        pillarKey: 'ip_prior_inventions',
        title: 'IP Assignment & Prior Inventions Carve-out',
        subScore: 70,
        weight: 0.20,
        isToxic: true,
        summary: 'Assignment scope: broad_all_tech. Moonlight: false.',
        identifiedRisks: [
          'No Exhibit A / Prior Inventions Schedule attached to contract',
          'Complete ban on non-conflicting open-source contributions or personal hobby coding'
        ],
        statutoryReference: 'Standard Uniform Trade Secrets Act (UTSA)',
        parameters: {
          priorInventionsScheduleAttached: false,
          priorInventionsCount: 0,
          assignmentScope: 'broad_all_tech',
          moonlightOpenSourcePermitted: false,
          statutoryProtectionCited: false
        }
      },
      {
        pillarKey: 'severance_without_cause',
        title: 'Severance Without Cause & Good Reason',
        subScore: 65,
        weight: 0.25,
        isToxic: true,
        summary: 'Cash severance: 3m. Good reason covered: false.',
        identifiedRisks: [
          'Resignation for "Good Reason" (demotion, relocation, salary slash) forfeits severance',
          'Inadequate severance duration (3 months; VP/Director benchmark is 9-12 months)'
        ],
        statutoryReference: 'Executive Employment Agreement Standard / ERISA Severance Plan',
        parameters: {
          cashSalaryMonths: 3,
          targetBonusIncluded: false,
          healthBenefitMonths: 3,
          goodReasonResignationCovered: false,
          narrowCauseDefinition: false
        }
      },
      {
        pillarKey: 'double_trigger_cic',
        title: 'Double-Trigger Change of Control Equity Acceleration',
        subScore: 80,
        weight: 0.20,
        isToxic: true,
        summary: 'Acceleration: none. PTEP: 3m.',
        identifiedRisks: [
          'Standard 90-day PTEP cliff forces forfeiture of unexercised vested options upon termination',
          'Zero Change of Control equity acceleration: acquiring company can terminate and seize unvested equity'
        ],
        statutoryReference: 'Internal Revenue Code §280G / §4999 & Delaware M&A Practice',
        parameters: {
          accelerationType: 'none',
          protectionWindowMonths: 6,
          ptepMonths: 3,
          goldenParachuteCutbackProtected: false
        }
      },
      {
        pillarKey: 'indemnification_d_and_o',
        title: 'Indemnification, D&O Insurance & Tail Coverage',
        subScore: 50,
        weight: 0.15,
        isToxic: false,
        summary: 'Standalone agreement: false. Mandatory advancement: false.',
        identifiedRisks: [
          'No standalone bilateral Indemnification Agreement (relies solely on revocable company bylaws)',
          'Defense legal expenses not subject to mandatory advancement (executive must pay out-of-pocket)'
        ],
        statutoryReference: 'Delaware General Corporation Law §145 / Model Executive Indemnity Agreement',
        parameters: {
          standaloneAgreementSigned: false,
          policyCoverageAdequate: false,
          mandatoryAdvancement: false,
          tailCoverageSixYears: false
        }
      }
    ],
    priorInventions: [
      {
        id: 'inv-demo-1',
        category: 'open_source_repo',
        title: 'HyperQueue Distributed Broker',
        identifierOrUrl: 'https://github.com/exec/hyperqueue',
        creationDate: '2024-03-15',
        technologyDescription: 'Zero-copy distributed log streaming framework in Rust.',
        retainedRights: ['Full Commercial Copyright', 'Derivative Works Exclusive'],
        confidentialExclusionConfirmed: true
      },
      {
        id: 'inv-demo-2',
        category: 'saas_product',
        title: 'CloudCost Sentinel Engine',
        identifierOrUrl: 'https://cloudcost-sentinel.io',
        creationDate: '2025-01-10',
        technologyDescription: 'Automated AWS multi-account spot instance arbitrage controller.',
        retainedRights: ['Patent Prosecution Rights', 'Source Code Ownership'],
        confidentialExclusionConfirmed: true
      }
    ],
    redlines: [
      {
        id: 'red-demo-1',
        contractId: 'contract-demo-1',
        pillarKey: 'non_compete_non_solicit',
        clauseTitle: 'Narrow Competitor Non-Compete with 100% Garden Leave Pay',
        originalText: 'Employee shall not engage in any competitive enterprise worldwide for eighteen (18) months following termination.',
        redlineText: 'Employee shall not engage in any competitive enterprise [- worldwide for eighteen (18) months -] {+ within the direct market vertical for a period of six (6) months +} following termination{+, provided that Company continues to pay Employee one hundred percent (100%) of Employee final base salary as Garden Leave compensation for each month of said restriction +}.',
        candidateJustification: 'Market standard for executives requires an equitable exchange of consideration: if the company restricts employment, it must provide monthly Garden Leave compensation.',
        fallbackCompromise: 'Extend to 9 months provided Garden Leave is paid at 75% of base compensation.',
        statutoryCitation: 'Restatement (Third) of Employment Law §8.06',
        status: 'proposed',
        createdAt: '2026-10-20T08:00:00Z',
        updatedAt: '2026-10-20T08:00:00Z'
      },
      {
        id: 'red-demo-2',
        contractId: 'contract-demo-1',
        pillarKey: 'severance_without_cause',
        clauseTitle: '12-Month Executive Severance & Good Reason Trigger',
        originalText: 'In the event of termination without Cause, Company may provide up to three (3) months base salary at Company sole discretion.',
        redlineText: 'In the event of termination without Cause{+, or resignation by Executive for Good Reason (including material reduction in duties, compensation reduction, or relocation exceeding 30 miles), Executive shall receive: (a) twelve (12) months base salary continuation, (b) 100% of prorated target annual bonus, and (c) twelve (12) months company-paid COBRA premium reimbursement +}.',
        candidateJustification: 'Vice President search cycles average 9 to 12 months. Standard executive governance packages mandate 12 months salary and bonus protection against unilateral termination.',
        fallbackCompromise: 'Nine (9) months base salary continuation plus six (6) months health benefits.',
        statutoryCitation: 'Market Executive Severance Standards (Equilar / FW Cook Benchmark)',
        status: 'proposed',
        createdAt: '2026-10-20T08:00:00Z',
        updatedAt: '2026-10-20T08:00:00Z'
      }
    ],
    createdAt: '2026-10-20T08:00:00Z',
    updatedAt: '2026-10-20T08:00:00Z'
  },
  {
    id: 'contract-demo-2',
    companyName: 'Nexus Robotics',
    roleTitle: 'Director of Autonomy',
    jurisdiction: 'us_california',
    contractRiskIndex: 44,
    riskTier: 'moderate_asymmetry',
    clawbackPenalty: 0,
    activeHazards: [],
    pillarScores: {
      non_compete_non_solicit: 5,
      ip_prior_inventions: 25,
      severance_without_cause: 35,
      double_trigger_cic: 45,
      indemnification_d_and_o: 30
    },
    clauses: [
      {
        pillarKey: 'non_compete_non_solicit',
        title: 'Non-Compete & Non-Solicitation Covenants',
        subScore: 5,
        weight: 0.20,
        isToxic: false,
        summary: 'California statutory disclaimer included. Non-compete voided.',
        identifiedRisks: [],
        statutoryReference: 'Cal. Bus. & Prof. Code §16600, §16600.1, §16600.5',
        parameters: {
          durationMonths: 0,
          scope: 'narrow_named_competitors',
          gardenLeavePercent: 0,
          solicitationBreadth: 'senior_execs_only',
          explicitCaDisclaimer: true
        }
      },
      {
        pillarKey: 'ip_prior_inventions',
        title: 'IP Assignment & Prior Inventions Carve-out',
        subScore: 25,
        weight: 0.20,
        isToxic: false,
        summary: 'Schedule A attached. Statutory citation included.',
        identifiedRisks: [],
        statutoryReference: 'Cal. Labor Code §2870, §2872 (Mandatory Statutory Notice)',
        parameters: {
          priorInventionsScheduleAttached: true,
          priorInventionsCount: 1,
          assignmentScope: 'narrow_company_business',
          moonlightOpenSourcePermitted: true,
          statutoryProtectionCited: true
        }
      },
      {
        pillarKey: 'severance_without_cause',
        title: 'Severance Without Cause & Good Reason',
        subScore: 35,
        weight: 0.25,
        isToxic: false,
        summary: 'Cash severance: 6m. Good reason covered: true.',
        identifiedRisks: [
          'Inadequate severance duration (6 months; VP/Director benchmark is 9-12 months)'
        ],
        statutoryReference: 'Executive Employment Agreement Standard / ERISA Severance Plan',
        parameters: {
          cashSalaryMonths: 6,
          targetBonusIncluded: true,
          healthBenefitMonths: 6,
          goodReasonResignationCovered: true,
          narrowCauseDefinition: true
        }
      },
      {
        pillarKey: 'double_trigger_cic',
        title: 'Double-Trigger Change of Control Equity Acceleration',
        subScore: 45,
        weight: 0.20,
        isToxic: false,
        summary: 'Acceleration: double_trigger_partial. PTEP: 12m.',
        identifiedRisks: [
          'Limited option exercise window (12 months; executive benchmark is 24-36 months)'
        ],
        statutoryReference: 'Internal Revenue Code §280G / §4999 & Delaware M&A Practice',
        parameters: {
          accelerationType: 'double_trigger_partial',
          protectionWindowMonths: 12,
          ptepMonths: 12,
          goldenParachuteCutbackProtected: true
        }
      },
      {
        pillarKey: 'indemnification_d_and_o',
        title: 'Indemnification, D&O Insurance & Tail Coverage',
        subScore: 30,
        weight: 0.15,
        isToxic: false,
        summary: 'Mandatory advancement included. Tail coverage: false.',
        identifiedRisks: [
          'No guaranteed 6-year D&O tail / run-off coverage upon acquisition or exit'
        ],
        statutoryReference: 'Delaware General Corporation Law §145',
        parameters: {
          standaloneAgreementSigned: true,
          policyCoverageAdequate: true,
          mandatoryAdvancement: true,
          tailCoverageSixYears: false
        }
      }
    ],
    priorInventions: [
      {
        id: 'inv-demo-3',
        category: 'patented_invention',
        title: 'LiDAR Point Cloud Segmentation Pipeline',
        identifierOrUrl: 'US Patent App 18/492,019',
        creationDate: '2023-11-20',
        technologyDescription: 'Real-time sparse voxel convolution network for autonomous vehicle obstacle perception.',
        retainedRights: ['Sole Inventor Title', 'Patent Prosecution Rights'],
        confidentialExclusionConfirmed: true
      }
    ],
    redlines: [],
    createdAt: '2026-10-22T10:00:00Z',
    updatedAt: '2026-10-22T10:00:00Z'
  },
  {
    id: 'contract-demo-3',
    companyName: 'Vortex Fintech',
    roleTitle: 'Chief Technology Officer',
    jurisdiction: 'vietnam',
    contractRiskIndex: 84,
    riskTier: 'critical_toxic',
    clawbackPenalty: 18,
    activeHazards: [
      'Indentured Labor Trap: Draconian post-employment non-compete combined with zero severance.',
      'Intellectual Property Ambush: Broad assignment claiming personal and pre-existing code.'
    ],
    pillarScores: {
      non_compete_non_solicit: 90,
      ip_prior_inventions: 85,
      severance_without_cause: 80,
      double_trigger_cic: 80,
      indemnification_d_and_o: 75
    },
    clauses: [
      {
        pillarKey: 'non_compete_non_solicit',
        title: 'Non-Compete & Non-Solicitation Covenants',
        subScore: 90,
        weight: 0.20,
        isToxic: true,
        summary: 'Non-compete duration: 24m, scope: worldwide_broad. Garden leave: 0%.',
        identifiedRisks: [
          'Excessive restriction duration (24 months exceeds standard 12-month executive threshold)',
          'High dispute risk: Non-compete without financial compensation violates statutory freedom to work'
        ],
        statutoryReference: 'Vietnam Labor Code 2019 Art. 21 & Constitution 2013 Art. 35',
        parameters: {
          durationMonths: 24,
          scope: 'worldwide_broad',
          gardenLeavePercent: 0,
          solicitationBreadth: 'all_employees_contractors',
          explicitCaDisclaimer: false
        }
      },
      {
        pillarKey: 'ip_prior_inventions',
        title: 'IP Assignment & Prior Inventions Carve-out',
        subScore: 85,
        weight: 0.20,
        isToxic: true,
        summary: 'Assignment scope: omnibus_perpetual. Schedule A: false.',
        identifiedRisks: [
          'No Exhibit A / Prior Inventions Schedule attached to contract',
          'Complete ban on non-conflicting open-source contributions or personal hobby coding'
        ],
        statutoryReference: 'Vietnam Law on Intellectual Property Art. 73-75',
        parameters: {
          priorInventionsScheduleAttached: false,
          priorInventionsCount: 0,
          assignmentScope: 'omnibus_perpetual',
          moonlightOpenSourcePermitted: false,
          statutoryProtectionCited: false
        }
      },
      {
        pillarKey: 'severance_without_cause',
        title: 'Severance Without Cause & Good Reason',
        subScore: 80,
        weight: 0.25,
        isToxic: true,
        summary: 'Cash severance: 0m. Discretionary only.',
        identifiedRisks: [
          'Resignation for "Good Reason" forfeits severance',
          'Inadequate severance duration (0 months)'
        ],
        statutoryReference: 'Vietnam Labor Code 2019 Art. 46 / Executive Contract Standard',
        parameters: {
          cashSalaryMonths: 0,
          targetBonusIncluded: false,
          healthBenefitMonths: 0,
          goodReasonResignationCovered: false,
          narrowCauseDefinition: false
        }
      },
      {
        pillarKey: 'double_trigger_cic',
        title: 'Double-Trigger Change of Control Equity Acceleration',
        subScore: 80,
        weight: 0.20,
        isToxic: true,
        summary: 'Acceleration: none. PTEP: 3m.',
        identifiedRisks: [
          'Zero Change of Control equity acceleration: acquiring company can terminate and seize unvested equity'
        ],
        statutoryReference: 'Vietnam Enterprise Law & Standard International M&A',
        parameters: {
          accelerationType: 'none',
          protectionWindowMonths: 6,
          ptepMonths: 3,
          goldenParachuteCutbackProtected: false
        }
      },
      {
        pillarKey: 'indemnification_d_and_o',
        title: 'Indemnification, D&O Insurance & Tail Coverage',
        subScore: 75,
        weight: 0.15,
        isToxic: true,
        summary: 'No D&O policy. No advancement.',
        identifiedRisks: [
          'No standalone bilateral Indemnification Agreement',
          'Defense legal expenses not subject to mandatory advancement'
        ],
        statutoryReference: 'Model Executive Indemnity Agreement',
        parameters: {
          standaloneAgreementSigned: false,
          policyCoverageAdequate: false,
          mandatoryAdvancement: false,
          tailCoverageSixYears: false
        }
      }
    ],
    priorInventions: [],
    redlines: [],
    createdAt: '2026-10-23T14:30:00Z',
    updatedAt: '2026-10-23T14:30:00Z'
  }
];

function loadDemoContracts(): ExecutiveContractDTO[] {
  try {
    const raw = localStorage.getItem('jobtrack_demo_executive_contracts_v1');
    if (!raw) {
      localStorage.setItem('jobtrack_demo_executive_contracts_v1', JSON.stringify(DEFAULT_DEMO_CONTRACTS));
      return structuredClone(DEFAULT_DEMO_CONTRACTS);
    }
    return JSON.parse(raw);
  } catch {
    return structuredClone(DEFAULT_DEMO_CONTRACTS);
  }
}

function saveDemoContracts(contracts: ExecutiveContractDTO[]): void {
  try {
    localStorage.setItem('jobtrack_demo_executive_contracts_v1', JSON.stringify(contracts));
  } catch {
  }
}

function createDemoContract(input: ExecutiveContractMutationDTO): ExecutiveContractDTO {
  const list = loadDemoContracts();
  const id = `contract-demo-${Date.now()}`;
  const now = new Date().toISOString();

  const priorInventions: PriorInventionItemDTO[] = (input.priorInventions || []).map((p) => ({
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: p.category,
    title: p.title,
    identifierOrUrl: p.identifierOrUrl,
    creationDate: p.creationDate || now.split('T')[0],
    technologyDescription: p.technologyDescription || '',
    retainedRights: p.retainedRights || ['Full Commercial Copyright'],
    confidentialExclusionConfirmed: p.confidentialExclusionConfirmed ?? true
  }));

  const evalResult = evaluateExecutiveContract(
    input.clauseParameters,
    input.jurisdiction,
    priorInventions
  );

  const generatedRedlines = generateSynthesizedRedlines({
    id,
    companyName: input.companyName,
    roleTitle: input.roleTitle,
    jurisdiction: input.jurisdiction,
    pillarScores: evalResult.pillarScores,
    clauses: evalResult.clauses
  });

  const redlines: ContractRedlineDTO[] = generatedRedlines.map((r, idx) => ({
    id: `red-${Date.now()}-${idx}`,
    contractId: id,
    ...r,
    status: r.status || 'proposed',
    createdAt: now,
    updatedAt: now
  }));

  const newContract: ExecutiveContractDTO = {
    id,
    applicationId: input.applicationId || null,
    companyName: input.companyName,
    roleTitle: input.roleTitle,
    jurisdiction: input.jurisdiction,
    contractRiskIndex: evalResult.contractRiskIndex,
    riskTier: evalResult.riskTier,
    pillarScores: evalResult.pillarScores,
    clawbackPenalty: evalResult.clawbackPenalty,
    activeHazards: evalResult.activeHazards,
    clauses: evalResult.clauses,
    priorInventions,
    redlines,
    createdAt: now,
    updatedAt: now
  };

  list.unshift(newContract);
  saveDemoContracts(list);
  return newContract;
}

function updateDemoContract(
  id: string,
  input: Partial<ExecutiveContractMutationDTO>
): ExecutiveContractDTO | null {
  const list = loadDemoContracts();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  const existing = list[idx];

  const companyName = input.companyName ?? existing.companyName;
  const roleTitle = input.roleTitle ?? existing.roleTitle;
  const jurisdiction = input.jurisdiction ?? existing.jurisdiction;

  const currentParams = existing.clauses.reduce((acc, c) => {
    acc[c.pillarKey] = c.parameters as never;
    return acc;
  }, {} as ClauseParametersMap);

  const clauseParameters: ClauseParametersMap = input.clauseParameters ?? currentParams;
  const evalResult = evaluateExecutiveContract(clauseParameters, jurisdiction, existing.priorInventions);
  const now = new Date().toISOString();

  const updated: ExecutiveContractDTO = {
    ...existing,
    companyName,
    roleTitle,
    jurisdiction,
    contractRiskIndex: evalResult.contractRiskIndex,
    riskTier: evalResult.riskTier,
    pillarScores: evalResult.pillarScores,
    clawbackPenalty: evalResult.clawbackPenalty,
    activeHazards: evalResult.activeHazards,
    clauses: evalResult.clauses,
    updatedAt: now
  };

  list[idx] = updated;
  saveDemoContracts(list);
  return updated;
}

function generateDemoRedlines(contractId: string): ContractRedlineDTO[] {
  const list = loadDemoContracts();
  const idx = list.findIndex(c => c.id === contractId);
  if (idx === -1) return [];
  const contract = list[idx];
  const generated = generateSynthesizedRedlines({
    id: contract.id,
    companyName: contract.companyName,
    roleTitle: contract.roleTitle,
    jurisdiction: contract.jurisdiction,
    pillarScores: contract.pillarScores,
    clauses: contract.clauses
  });
  const now = new Date().toISOString();
  const redlines: ContractRedlineDTO[] = generated.map((r, idx2) => ({
    id: `red-${Date.now()}-${idx2}`,
    contractId,
    ...r,
    status: r.status || 'proposed',
    createdAt: now,
    updatedAt: now
  }));
  contract.redlines = redlines;
  list[idx] = contract;
  saveDemoContracts(list);
  return redlines;
}

function addDemoPriorInvention(
  contractId: string,
  input: PriorInventionMutationDTO
): ExecutiveContractDTO | null {
  const list = loadDemoContracts();
  const idx = list.findIndex(c => c.id === contractId);
  if (idx === -1) return null;
  const contract = list[idx];
  const newItem: PriorInventionItemDTO = {
    id: `inv-${Date.now()}`,
    category: input.category,
    title: input.title,
    identifierOrUrl: input.identifierOrUrl,
    creationDate: input.creationDate || new Date().toISOString().split('T')[0],
    technologyDescription: input.technologyDescription || '',
    retainedRights: input.retainedRights || ['Full Commercial Copyright'],
    confidentialExclusionConfirmed: input.confidentialExclusionConfirmed ?? true
  };
  const updatedInventions = [...contract.priorInventions, newItem];
  const currentParams = contract.clauses.reduce((acc, c) => {
    acc[c.pillarKey] = c.parameters as never;
    return acc;
  }, {} as ClauseParametersMap);
  const evalResult = evaluateExecutiveContract(currentParams, contract.jurisdiction, updatedInventions);
  const updated: ExecutiveContractDTO = {
    ...contract,
    priorInventions: updatedInventions,
    contractRiskIndex: evalResult.contractRiskIndex,
    riskTier: evalResult.riskTier,
    pillarScores: evalResult.pillarScores,
    clawbackPenalty: evalResult.clawbackPenalty,
    activeHazards: evalResult.activeHazards,
    clauses: evalResult.clauses,
    updatedAt: new Date().toISOString()
  };
  list[idx] = updated;
  saveDemoContracts(list);
  return updated;
}

function deleteDemoPriorInvention(
  contractId: string,
  itemId: string
): ExecutiveContractDTO | null {
  const list = loadDemoContracts();
  const idx = list.findIndex(c => c.id === contractId);
  if (idx === -1) return null;
  const contract = list[idx];
  const updatedInventions = contract.priorInventions.filter(i => i.id !== itemId);
  const currentParams = contract.clauses.reduce((acc, c) => {
    acc[c.pillarKey] = c.parameters as never;
    return acc;
  }, {} as ClauseParametersMap);
  const evalResult = evaluateExecutiveContract(currentParams, contract.jurisdiction, updatedInventions);
  const updated: ExecutiveContractDTO = {
    ...contract,
    priorInventions: updatedInventions,
    contractRiskIndex: evalResult.contractRiskIndex,
    riskTier: evalResult.riskTier,
    pillarScores: evalResult.pillarScores,
    clawbackPenalty: evalResult.clawbackPenalty,
    activeHazards: evalResult.activeHazards,
    clauses: evalResult.clauses,
    updatedAt: new Date().toISOString()
  };
  list[idx] = updated;
  saveDemoContracts(list);
  return updated;
}

const executiveContractRepository = {
  async listContracts(): Promise<ExecutiveContractDTO[]> {
    if (demoMode) return loadDemoContracts();
    try {
      return await request<ExecutiveContractDTO[]>('/executive-contracts');
    } catch {
      return loadDemoContracts();
    }
  },

  async getContract(id: string): Promise<ExecutiveContractDTO | null> {
    if (demoMode) {
      const list = loadDemoContracts();
      return list.find(c => c.id === id) || null;
    }
    try {
      return await request<ExecutiveContractDTO>(`/executive-contracts/${encodeURIComponent(id)}`);
    } catch {
      const list = loadDemoContracts();
      return list.find(c => c.id === id) || null;
    }
  },

  async createContract(input: ExecutiveContractMutationDTO): Promise<ExecutiveContractDTO> {
    if (demoMode) {
      return createDemoContract(input);
    }

    try {
      return await request<ExecutiveContractDTO>('/executive-contracts', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return createDemoContract(input);
    }
  },

  async updateContract(
    id: string,
    input: Partial<ExecutiveContractMutationDTO>
  ): Promise<ExecutiveContractDTO | null> {
    if (demoMode) {
      return updateDemoContract(id, input);
    }

    try {
      return await request<ExecutiveContractDTO>(`/executive-contracts/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(input)
      });
    } catch {
      return updateDemoContract(id, input);
    }
  },

  async deleteContract(id: string): Promise<boolean> {
    if (demoMode) {
      const list = loadDemoContracts();
      const next = list.filter(c => c.id !== id);
      saveDemoContracts(next);
      return true;
    }
    try {
      await request<void>(`/executive-contracts/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    } catch {
      const list = loadDemoContracts();
      const next = list.filter(c => c.id !== id);
      saveDemoContracts(next);
      return true;
    }
  },

  async listRedlines(contractId: string): Promise<ContractRedlineDTO[]> {
    const contract = await this.getContract(contractId);
    return contract?.redlines || [];
  },

  async generateRedlines(contractId: string): Promise<ContractRedlineDTO[]> {
    if (demoMode) {
      return generateDemoRedlines(contractId);
    }
    try {
      return await request<ContractRedlineDTO[]>(`/executive-contracts/${encodeURIComponent(contractId)}/generate-redlines`, {
        method: 'POST'
      });
    } catch {
      return generateDemoRedlines(contractId);
    }
  },

  async createRedline(contractId: string, input: ContractRedlineMutationDTO): Promise<ContractRedlineDTO> {
    if (demoMode) {
      const contract = await this.getContract(contractId);
      const now = new Date().toISOString();
      const newRedline: ContractRedlineDTO = {
        id: `red-${Date.now()}`,
        contractId,
        ...input,
        status: input.status || 'proposed',
        createdAt: now,
        updatedAt: now
      };
      if (contract) {
        contract.redlines = [...(contract.redlines || []), newRedline];
        const list = loadDemoContracts();
        const idx = list.findIndex(c => c.id === contractId);
        if (idx !== -1) {
          list[idx] = contract;
          saveDemoContracts(list);
        }
      }
      return newRedline;
    }
    return await request<ContractRedlineDTO>(`/executive-contracts/${encodeURIComponent(contractId)}/redlines`, {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async updateRedline(
    contractId: string,
    redlineId: string,
    status: RedlineStatus
  ): Promise<ContractRedlineDTO | null> {
    if (demoMode) {
      const contract = await this.getContract(contractId);
      if (!contract || !contract.redlines) return null;
      const idx = contract.redlines.findIndex(r => r.id === redlineId);
      if (idx === -1) return null;
      contract.redlines[idx].status = status;
      contract.redlines[idx].updatedAt = new Date().toISOString();
      const list = loadDemoContracts();
      const cIdx = list.findIndex(c => c.id === contractId);
      if (cIdx !== -1) {
        list[cIdx] = contract;
        saveDemoContracts(list);
      }
      return contract.redlines[idx];
    }
    try {
      return await request<ContractRedlineDTO>(
        `/executive-contracts/${encodeURIComponent(contractId)}/redlines/${encodeURIComponent(redlineId)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status })
        }
      );
    } catch {
      return null;
    }
  },

  async addPriorInvention(
    contractId: string,
    input: PriorInventionMutationDTO
  ): Promise<ExecutiveContractDTO | null> {
    if (demoMode) {
      return addDemoPriorInvention(contractId, input);
    }
    try {
      return await request<ExecutiveContractDTO>(`/executive-contracts/${encodeURIComponent(contractId)}/prior-inventions`, {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return addDemoPriorInvention(contractId, input);
    }
  },

  async deletePriorInvention(
    contractId: string,
    itemId: string
  ): Promise<ExecutiveContractDTO | null> {
    if (demoMode) {
      return deleteDemoPriorInvention(contractId, itemId);
    }
    try {
      return await request<ExecutiveContractDTO>(
        `/executive-contracts/${encodeURIComponent(contractId)}/prior-inventions/${encodeURIComponent(itemId)}`,
        { method: 'DELETE' }
      );
    } catch {
      return deleteDemoPriorInvention(contractId, itemId);
    }
  },

  async exportExhibitA(contractId: string): Promise<{ markdown: string } | null> {
    const contract = await this.getContract(contractId);
    if (!contract) return null;
    const markdown = generateExhibitAMarkdown(
      { companyName: contract.companyName, roleTitle: contract.roleTitle },
      contract.priorInventions
    );
    return { markdown };
  },

  async exportAddendum(contractId: string): Promise<{ markdown: string; cri: number } | null> {
    const contract = await this.getContract(contractId);
    if (!contract) return null;
    const redlines = contract.redlines || (await this.listRedlines(contractId));
    const markdown = generateExecutiveAddendumMarkdown(
      {
        companyName: contract.companyName,
        roleTitle: contract.roleTitle,
        jurisdiction: contract.jurisdiction
      },
      redlines
    );
    return { markdown, cri: contract.contractRiskIndex };
  }
};

const DEFAULT_DEMO_ONBOARDING_PLANS: ExecutiveOnboardingPlanDTO[] = [
  {
    id: 'plan-demo-1',
    userId: 'demo-user',
    applicationId: null,
    companyName: 'Acme Cloud AI',
    roleTitle: 'VP of Engineering',
    startDate: '2026-10-01',
    currentDay: 34,
    executiveSponsorName: 'Sarah Jenkins (CEO)',
    stakeholders: [
      {
        id: 's-demo-1',
        planId: 'plan-demo-1',
        name: 'Sarah Jenkins',
        roleTitle: 'CEO & Co-founder',
        category: 'executive_sponsor',
        expectations: 'Re-architect core event streaming, improve roadmap predictability, establish Staff career ladders.',
        painPoints: 'Quarterly roadmap delays, customer contract enterprise escalations.',
        politicalDynamics: 'Founder authority, high trust, demands direct transparency on architectural risks.',
        sentimentScore: 5,
        interviewDate: '2026-10-02',
        status: 'completed',
        alignmentLevel: 'strongly_aligned',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-02T00:00:00.000Z'
      },
      {
        id: 's-demo-2',
        planId: 'plan-demo-1',
        name: 'Marcus Vance',
        roleTitle: 'VP of Product Management',
        category: 'peer_executive',
        expectations: 'Establish predictable 2-week sprint releases and collaborative technical discovery triads.',
        painPoints: 'Engineering estimation surprises and recurring regressions in billing checkout.',
        politicalDynamics: 'Strong commercial sway, previously felt engineering was a black box.',
        sentimentScore: 4,
        interviewDate: '2026-10-05',
        status: 'completed',
        alignmentLevel: 'strongly_aligned',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-05T00:00:00.000Z'
      },
      {
        id: 's-demo-3',
        planId: 'plan-demo-1',
        name: 'Elena Rostova',
        roleTitle: 'Engineering Manager, Core Platform',
        category: 'direct_report',
        expectations: 'Buffer team against ad-hoc interruptions and fund technical debt retirement.',
        painPoints: 'Severe on-call fatigue, monolithic deploy coupling, and lack of CI cache optimization.',
        politicalDynamics: 'High emotional investment, respected by team, flight risk if conditions do not improve.',
        sentimentScore: 4,
        interviewDate: '2026-10-08',
        status: 'completed',
        alignmentLevel: 'partially_aligned',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-08T00:00:00.000Z'
      },
      {
        id: 's-demo-4',
        planId: 'plan-demo-1',
        name: 'David Kim',
        roleTitle: 'Principal Distributed Systems Architect',
        category: 'staff_principal',
        expectations: 'Empower an Architecture Review Council (ARC) and adopt lightweight ADRs.',
        painPoints: 'Microservice sprawl without schema governance or contract testing.',
        politicalDynamics: 'Longest tenure technical authority, skeptical of superficial corporate process.',
        sentimentScore: 4,
        interviewDate: '2026-10-12',
        status: 'completed',
        alignmentLevel: 'strongly_aligned',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z'
      },
      {
        id: 's-demo-5',
        planId: 'plan-demo-1',
        name: 'Priya Sharma',
        roleTitle: 'VP of Customer Success & Support',
        category: 'customer_ops',
        expectations: 'Establish direct Sev-1/Sev-2 escalation bridge and bi-weekly stability briefings.',
        painPoints: 'Slow turnaround on enterprise account defects causing renewal hesitations.',
        politicalDynamics: 'Focused on enterprise retention, receptive to proactive engineering updates.',
        sentimentScore: 3,
        interviewDate: null,
        status: 'scheduled',
        alignmentLevel: 'partially_aligned',
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z'
      }
    ],
    diagnostics: {
      architectureTechDebt: {
        areaKey: 'architecture_tech_debt',
        score: 74,
        severityLevel: 'moderate_risk',
        primaryBottlenecks: [
          'Monolithic deploy coupling between core billing and order processing',
          'Inadequate contract testing across message queues'
        ],
        immediateMitigations: [
          'Decouple release pipelines using feature flags',
          'Establish contract tests for high-throughput queues'
        ],
        actionPlan: 'Deploy domain-driven service boundaries and enforce strict consumer-driven contract tests across Q3.'
      },
      deliveryVelocityIncidentCadence: {
        areaKey: 'delivery_velocity_incident_cadence',
        score: 78,
        severityLevel: 'moderate_risk',
        primaryBottlenecks: [
          'Bi-weekly deployment windows limiting release agility',
          'Fragmented distributed tracing prolonging MTTR'
        ],
        immediateMitigations: [
          'Automate canary stages with error-budget rollback',
          'Consolidate OpenTelemetry instrumentation'
        ],
        actionPlan: 'Migrate to continuous deployment with automated canary gates and unified OpenTelemetry APM dashboards.'
      },
      teamMoraleFlightRisks: {
        areaKey: 'team_morale_flight_risks',
        score: 72,
        severityLevel: 'moderate_risk',
        primaryBottlenecks: [
          'Platform squad on-call alert fatigue',
          'Ambiguous Staff-plus engineering career ladder'
        ],
        immediateMitigations: [
          'Implement secondary on-call rotation with rest compensation',
          'Draft dual IC/Management engineering matrix'
        ],
        actionPlan: 'Publish comprehensive technical career tracks and redistribute platform incident burdens via site reliability engineering rotations.'
      },
      strategicProductEngineeringAlignment: {
        areaKey: 'strategic_product_engineering_alignment',
        score: 84,
        severityLevel: 'healthy',
        primaryBottlenecks: [
          'Engineering involvement late in product discovery',
          'Roadmap capacity estimates lack technical debt headroom'
        ],
        immediateMitigations: [
          'Institute bi-weekly engineering discovery pairing with PMs',
          'Ringfence 20% capacity in sprint cadences for architecture'
        ],
        actionPlan: 'Form joint product-engineering triads for all tier-1 initiatives and formalize SLA commitments on feature stabilization.'
      },
      diagnosticHealthIndex: 77,
      identifiedBottlenecksCount: 8,
      criticalHazardsCount: 0
    },
    milestones: [
      {
        id: 'm-demo-1',
        planId: 'plan-demo-1',
        phase: 'phase_1_listen_align',
        title: 'Conduct 360 Stakeholder Listening Tour',
        description: 'Complete structured interviews with CEO, peer executives, EMs, and principal architects.',
        targetDay: 15,
        deliveredDay: 12,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 14,
        impactScore: 9,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-12T00:00:00.000Z'
      },
      {
        id: 'm-demo-2',
        planId: 'plan-demo-1',
        phase: 'phase_1_listen_align',
        title: 'De-risk CI/CD Flaky Pipeline Stages',
        description: 'Implement retry isolation and Docker layer caching to reduce build duration.',
        targetDay: 20,
        deliveredDay: 18,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 7,
        impactScore: 8,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-18T00:00:00.000Z'
      },
      {
        id: 'm-demo-3',
        planId: 'plan-demo-1',
        phase: 'phase_2_synthesize_wins',
        title: 'Publish 4-Dimension Organizational Diagnostic Memo',
        description: 'Synthesize architecture, velocity, team morale, and product alignment findings.',
        targetDay: 35,
        deliveredDay: 32,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 10,
        impactScore: 9,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'm-demo-4',
        planId: 'plan-demo-1',
        phase: 'phase_2_synthesize_wins',
        title: 'Deploy Automated Canary Release Pipeline',
        description: 'Automate canary percentage routing with automatic rollback on error budget spikes.',
        targetDay: 50,
        deliveredDay: null,
        status: 'in_progress',
        isQuickWin: false,
        deliveryEstimateDays: 14,
        impactScore: 8,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'm-demo-5',
        planId: 'plan-demo-1',
        phase: 'phase_3_transform_scale',
        title: 'Publish Staff-Plus Engineering Career Matrix',
        description: 'Establish explicit IC progression ladder from Senior to Principal Fellow.',
        targetDay: 75,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 20,
        impactScore: 9,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z'
      },
      {
        id: 'm-demo-6',
        planId: 'plan-demo-1',
        phase: 'phase_3_transform_scale',
        title: 'Present 1-Year Strategic Technology Charter to Board',
        description: 'Deliver transformation review and 12-month technology investment roadmap.',
        targetDay: 100,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 25,
        impactScore: 10,
        blockerReason: null,
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z'
      }
    ],
    momentum: {
      transitionMomentumIndex: 88,
      tier: 'accelerating',
      stakeholderRelationshipIndex: 85,
      diagnosticHealthIndex: 77,
      quickWinDeliveryRate: 100,
      milestoneExecutionRate: 58,
      actionPlansCoverageRate: 100,
      currentDay: 34,
      totalStakeholders: 5,
      interviewedStakeholders: 4,
      totalMilestones: 6,
      achievedMilestones: 3,
      quickWinsTotal: 3,
      quickWinsDelivered: 3
    },
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  }
];

function loadDemoOnboardingPlans(): ExecutiveOnboardingPlanDTO[] {
  try {
    const raw = localStorage.getItem('jobtrack_demo_executive_onboarding_v1');
    if (raw) {
      const parsed = JSON.parse(raw) as ExecutiveOnboardingPlanDTO[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return structuredClone(DEFAULT_DEMO_ONBOARDING_PLANS);
}

function saveDemoOnboardingPlans(plans: ExecutiveOnboardingPlanDTO[]): void {
  try {
    localStorage.setItem('jobtrack_demo_executive_onboarding_v1', JSON.stringify(plans));
  } catch {
  }
}

function createDemoOnboardingPlan(input: ExecutiveOnboardingPlanMutationDTO): ExecutiveOnboardingPlanDTO {
  const list = loadDemoOnboardingPlans();
  const id = `plan-demo-${Date.now()}`;
  const now = new Date().toISOString();
  const diagnostics = createDefaultExecutiveDiagnostics();

  const defaultStakeholders: StakeholderDTO[] = [
    {
      id: `s-demo-${Date.now()}-1`,
      planId: id,
      name: input.executiveSponsorName || 'Chief Executive Officer',
      roleTitle: 'CEO & Founder',
      category: 'executive_sponsor',
      expectations: 'Establish roadmap predictability and de-risk cloud architecture.',
      painPoints: 'Quarterly feature delays.',
      politicalDynamics: 'Primary visionary; direct reporting line.',
      sentimentScore: 5,
      interviewDate: input.startDate,
      status: 'completed',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: `s-demo-${Date.now()}-2`,
      planId: id,
      name: 'VP of Product',
      roleTitle: 'VP of Product Management',
      category: 'peer_executive',
      expectations: 'Collaborative quarterly roadmap discovery triads.',
      painPoints: 'Hotfixes interrupting sprint flow.',
      politicalDynamics: 'Key partner for product-led growth.',
      sentimentScore: 4,
      interviewDate: null,
      status: 'scheduled',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: `s-demo-${Date.now()}-3`,
      planId: id,
      name: 'Platform Engineering Manager',
      roleTitle: 'EM, Platform Squad',
      category: 'direct_report',
      expectations: 'Relief from on-call alert fatigue.',
      painPoints: 'Legacy monolithic technical debt.',
      politicalDynamics: 'Respected technical team lead.',
      sentimentScore: 4,
      interviewDate: null,
      status: 'scheduled',
      alignmentLevel: 'partially_aligned',
      createdAt: now,
      updatedAt: now
    }
  ];

  const defaultMilestones: OnboardingMilestoneDTO[] = [
    {
      id: `m-demo-${Date.now()}-1`,
      planId: id,
      phase: 'phase_1_listen_align',
      title: 'Conduct 360 Stakeholder Listening Tour',
      description: 'Complete structured interviews with key leaders.',
      targetDay: 15,
      deliveredDay: 12,
      status: 'achieved',
      isQuickWin: true,
      deliveryEstimateDays: 14,
      impactScore: 9,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `m-demo-${Date.now()}-2`,
      planId: id,
      phase: 'phase_1_listen_align',
      title: 'De-risk CI/CD Flaky Pipeline Stages',
      description: 'Layer caching optimization for fast builds.',
      targetDay: 20,
      deliveredDay: null,
      status: 'in_progress',
      isQuickWin: true,
      deliveryEstimateDays: 7,
      impactScore: 8,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: `m-demo-${Date.now()}-3`,
      planId: id,
      phase: 'phase_2_synthesize_wins',
      title: 'Publish Organizational Diagnostic Memo',
      description: 'Synthesize architecture and team velocity audit.',
      targetDay: 35,
      deliveredDay: null,
      status: 'planned',
      isQuickWin: false,
      deliveryEstimateDays: 10,
      impactScore: 9,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    }
  ];

  const momentum = computeTransitionMomentum(defaultStakeholders, diagnostics, defaultMilestones, input.currentDay);

  const newPlan: ExecutiveOnboardingPlanDTO = {
    id,
    userId: 'demo-user',
    applicationId: input.applicationId || null,
    companyName: input.companyName,
    roleTitle: input.roleTitle,
    startDate: input.startDate,
    currentDay: input.currentDay,
    executiveSponsorName: input.executiveSponsorName,
    stakeholders: defaultStakeholders,
    diagnostics,
    milestones: defaultMilestones,
    momentum,
    createdAt: now,
    updatedAt: now
  };

  list.unshift(newPlan);
  saveDemoOnboardingPlans(list);
  return newPlan;
}

function updateDemoOnboardingPlan(
  id: string,
  input: Partial<ExecutiveOnboardingPlanMutationDTO>
): ExecutiveOnboardingPlanDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) return null;
  const existing = list[idx];

  const companyName = input.companyName ?? existing.companyName;
  const roleTitle = input.roleTitle ?? existing.roleTitle;
  const startDate = input.startDate ?? existing.startDate;
  const currentDay = input.currentDay ?? existing.currentDay;
  const executiveSponsorName = input.executiveSponsorName ?? existing.executiveSponsorName;

  const momentum = computeTransitionMomentum(existing.stakeholders, existing.diagnostics, existing.milestones, currentDay);
  const updated: ExecutiveOnboardingPlanDTO = {
    ...existing,
    companyName,
    roleTitle,
    startDate,
    currentDay,
    executiveSponsorName,
    momentum,
    updatedAt: new Date().toISOString()
  };

  list[idx] = updated;
  saveDemoOnboardingPlans(list);
  return updated;
}

function deleteDemoOnboardingPlan(id: string): boolean {
  const list = loadDemoOnboardingPlans();
  const next = list.filter(p => p.id !== id);
  saveDemoOnboardingPlans(next);
  return true;
}

function addDemoStakeholder(
  planId: string,
  input: StakeholderMutationDTO
): StakeholderDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return null;
  const plan = list[idx];
  const now = new Date().toISOString();

  const newStakeholder: StakeholderDTO = {
    id: `s-demo-${Date.now()}`,
    planId,
    name: input.name,
    roleTitle: input.roleTitle,
    category: input.category,
    expectations: input.expectations || '',
    painPoints: input.painPoints || '',
    politicalDynamics: input.politicalDynamics || '',
    sentimentScore: input.sentimentScore,
    interviewDate: input.interviewDate || null,
    status: input.status,
    alignmentLevel: input.alignmentLevel,
    createdAt: now,
    updatedAt: now
  };

  plan.stakeholders = [...plan.stakeholders, newStakeholder];
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = now;
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return newStakeholder;
}

function updateDemoStakeholder(
  planId: string,
  sid: string,
  input: Partial<StakeholderMutationDTO>
): StakeholderDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return null;
  const plan = list[idx];
  const sIdx = plan.stakeholders.findIndex(s => s.id === sid);
  if (sIdx === -1) return null;

  const existing = plan.stakeholders[sIdx];
  const updated: StakeholderDTO = {
    ...existing,
    name: input.name ?? existing.name,
    roleTitle: input.roleTitle ?? existing.roleTitle,
    category: input.category ?? existing.category,
    expectations: input.expectations ?? existing.expectations,
    painPoints: input.painPoints ?? existing.painPoints,
    politicalDynamics: input.politicalDynamics ?? existing.politicalDynamics,
    sentimentScore: input.sentimentScore ?? existing.sentimentScore,
    interviewDate: input.interviewDate !== undefined ? input.interviewDate : existing.interviewDate,
    status: input.status ?? existing.status,
    alignmentLevel: input.alignmentLevel ?? existing.alignmentLevel,
    updatedAt: new Date().toISOString()
  };

  plan.stakeholders[sIdx] = updated;
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = new Date().toISOString();
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return updated;
}

function deleteDemoStakeholder(planId: string, sid: string): boolean {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return false;
  const plan = list[idx];
  plan.stakeholders = plan.stakeholders.filter(s => s.id !== sid);
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = new Date().toISOString();
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return true;
}

function addDemoMilestone(
  planId: string,
  input: OnboardingMilestoneMutationDTO
): OnboardingMilestoneDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return null;
  const plan = list[idx];
  const now = new Date().toISOString();

  const newMilestone: OnboardingMilestoneDTO = {
    id: `m-demo-${Date.now()}`,
    planId,
    phase: input.phase,
    title: input.title,
    description: input.description || '',
    targetDay: input.targetDay,
    deliveredDay: input.deliveredDay || null,
    status: input.status,
    isQuickWin: input.isQuickWin,
    deliveryEstimateDays: input.deliveryEstimateDays,
    impactScore: input.impactScore,
    blockerReason: input.blockerReason || null,
    createdAt: now,
    updatedAt: now
  };

  plan.milestones = [...plan.milestones, newMilestone];
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = now;
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return newMilestone;
}

function updateDemoMilestone(
  planId: string,
  mid: string,
  input: Partial<OnboardingMilestoneMutationDTO>
): OnboardingMilestoneDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return null;
  const plan = list[idx];
  const mIdx = plan.milestones.findIndex(m => m.id === mid);
  if (mIdx === -1) return null;

  const existing = plan.milestones[mIdx];
  const updated: OnboardingMilestoneDTO = {
    ...existing,
    phase: input.phase ?? existing.phase,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    targetDay: input.targetDay ?? existing.targetDay,
    deliveredDay: input.deliveredDay !== undefined ? input.deliveredDay : existing.deliveredDay,
    status: input.status ?? existing.status,
    isQuickWin: input.isQuickWin !== undefined ? input.isQuickWin : existing.isQuickWin,
    deliveryEstimateDays: input.deliveryEstimateDays ?? existing.deliveryEstimateDays,
    impactScore: input.impactScore ?? existing.impactScore,
    blockerReason: input.blockerReason !== undefined ? input.blockerReason : existing.blockerReason,
    updatedAt: new Date().toISOString()
  };

  plan.milestones[mIdx] = updated;
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = new Date().toISOString();
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return updated;
}

function deleteDemoMilestone(planId: string, mid: string): boolean {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return false;
  const plan = list[idx];
  plan.milestones = plan.milestones.filter(m => m.id !== mid);
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = new Date().toISOString();
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return true;
}

function updateDemoDiagnostics(
  planId: string,
  input: ExecutiveDiagnosticsMutationDTO
): ExecutiveOnboardingPlanDTO | null {
  const list = loadDemoOnboardingPlans();
  const idx = list.findIndex(p => p.id === planId);
  if (idx === -1) return null;
  const plan = list[idx];
  plan.diagnostics = computeDiagnosticHealthIndex(input);
  plan.momentum = computeTransitionMomentum(plan.stakeholders, plan.diagnostics, plan.milestones, plan.currentDay);
  plan.updatedAt = new Date().toISOString();
  list[idx] = plan;
  saveDemoOnboardingPlans(list);
  return plan;
}

function generateDemoMemo(
  planId: string,
  memoType: ExecutiveMemoType
): { markdown: string; title: string } | null {
  const list = loadDemoOnboardingPlans();
  const plan = list.find(p => p.id === planId);
  if (!plan) return null;

  const markdown = generateExecutiveMemoMarkdown(memoType, plan);
  let title = 'Executive Briefing';
  if (memoType === 'day_30_listening_tour') title = 'Day 30 Listening Tour Insights Memo';
  if (memoType === 'day_60_strategic_priorities') title = 'Day 60 Strategic Priorities Briefing';
  if (memoType === 'day_100_transformation_charter') title = 'Day 100 Transformation Review & Charter';
  return { markdown, title };
}

const executiveOnboardingRepository = {
  async listPlans(): Promise<ExecutiveOnboardingPlanDTO[]> {
    if (demoMode) return loadDemoOnboardingPlans();
    try {
      return await request<ExecutiveOnboardingPlanDTO[]>('/executive-onboarding');
    } catch {
      return loadDemoOnboardingPlans();
    }
  },

  async getPlan(id: string): Promise<ExecutiveOnboardingPlanDTO | null> {
    if (demoMode) {
      const list = loadDemoOnboardingPlans();
      return list.find(p => p.id === id) || null;
    }
    try {
      return await request<ExecutiveOnboardingPlanDTO>(`/executive-onboarding/${encodeURIComponent(id)}`);
    } catch {
      const list = loadDemoOnboardingPlans();
      return list.find(p => p.id === id) || null;
    }
  },

  async createPlan(input: ExecutiveOnboardingPlanMutationDTO): Promise<ExecutiveOnboardingPlanDTO> {
    if (demoMode) {
      return createDemoOnboardingPlan(input);
    }
    try {
      return await request<ExecutiveOnboardingPlanDTO>('/executive-onboarding', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return createDemoOnboardingPlan(input);
    }
  },

  async updatePlan(
    id: string,
    input: Partial<ExecutiveOnboardingPlanMutationDTO>
  ): Promise<ExecutiveOnboardingPlanDTO | null> {
    if (demoMode) {
      return updateDemoOnboardingPlan(id, input);
    }
    try {
      return await request<ExecutiveOnboardingPlanDTO>(`/executive-onboarding/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input)
      });
    } catch {
      return updateDemoOnboardingPlan(id, input);
    }
  },

  async deletePlan(id: string): Promise<boolean> {
    if (demoMode) {
      return deleteDemoOnboardingPlan(id);
    }
    try {
      await request<void>(`/executive-onboarding/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return true;
    } catch {
      return deleteDemoOnboardingPlan(id);
    }
  },

  async addStakeholder(
    planId: string,
    input: StakeholderMutationDTO
  ): Promise<StakeholderDTO | null> {
    if (demoMode) {
      return addDemoStakeholder(planId, input);
    }
    try {
      return await request<StakeholderDTO>(`/executive-onboarding/${encodeURIComponent(planId)}/stakeholders`, {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return addDemoStakeholder(planId, input);
    }
  },

  async updateStakeholder(
    planId: string,
    stakeholderId: string,
    input: Partial<StakeholderMutationDTO>
  ): Promise<StakeholderDTO | null> {
    if (demoMode) {
      return updateDemoStakeholder(planId, stakeholderId, input);
    }
    try {
      return await request<StakeholderDTO>(
        `/executive-onboarding/${encodeURIComponent(planId)}/stakeholders/${encodeURIComponent(stakeholderId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(input)
        }
      );
    } catch {
      return updateDemoStakeholder(planId, stakeholderId, input);
    }
  },

  async deleteStakeholder(planId: string, stakeholderId: string): Promise<boolean> {
    if (demoMode) {
      return deleteDemoStakeholder(planId, stakeholderId);
    }
    try {
      await request<{ success: boolean }>(
        `/executive-onboarding/${encodeURIComponent(planId)}/stakeholders/${encodeURIComponent(stakeholderId)}`,
        { method: 'DELETE' }
      );
      return true;
    } catch {
      return deleteDemoStakeholder(planId, stakeholderId);
    }
  },

  async addMilestone(
    planId: string,
    input: OnboardingMilestoneMutationDTO
  ): Promise<OnboardingMilestoneDTO | null> {
    if (demoMode) {
      return addDemoMilestone(planId, input);
    }
    try {
      return await request<OnboardingMilestoneDTO>(`/executive-onboarding/${encodeURIComponent(planId)}/milestones`, {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return addDemoMilestone(planId, input);
    }
  },

  async updateMilestone(
    planId: string,
    milestoneId: string,
    input: Partial<OnboardingMilestoneMutationDTO>
  ): Promise<OnboardingMilestoneDTO | null> {
    if (demoMode) {
      return updateDemoMilestone(planId, milestoneId, input);
    }
    try {
      return await request<OnboardingMilestoneDTO>(
        `/executive-onboarding/${encodeURIComponent(planId)}/milestones/${encodeURIComponent(milestoneId)}`,
        {
          method: 'PUT',
          body: JSON.stringify(input)
        }
      );
    } catch {
      return updateDemoMilestone(planId, milestoneId, input);
    }
  },

  async deleteMilestone(planId: string, milestoneId: string): Promise<boolean> {
    if (demoMode) {
      return deleteDemoMilestone(planId, milestoneId);
    }
    try {
      await request<{ success: boolean }>(
        `/executive-onboarding/${encodeURIComponent(planId)}/milestones/${encodeURIComponent(milestoneId)}`,
        { method: 'DELETE' }
      );
      return true;
    } catch {
      return deleteDemoMilestone(planId, milestoneId);
    }
  },

  async updateDiagnostics(
    planId: string,
    input: ExecutiveDiagnosticsMutationDTO
  ): Promise<ExecutiveOnboardingPlanDTO | null> {
    if (demoMode) {
      return updateDemoDiagnostics(planId, input);
    }
    try {
      return await request<ExecutiveOnboardingPlanDTO>(`/executive-onboarding/${encodeURIComponent(planId)}/diagnostics`, {
        method: 'PUT',
        body: JSON.stringify(input)
      });
    } catch {
      return updateDemoDiagnostics(planId, input);
    }
  },

  async exportMemo(
    planId: string,
    memoType: ExecutiveMemoType
  ): Promise<{ markdown: string; title: string } | null> {
    if (demoMode) {
      return generateDemoMemo(planId, memoType);
    }
    try {
      return await request<{ markdown: string; title: string }>(
        `/executive-onboarding/${encodeURIComponent(planId)}/memo/${encodeURIComponent(memoType)}`
      );
    } catch {
      return generateDemoMemo(planId, memoType);
    }
  }
};

const DEFAULT_DEMO_BOARD_MANDATES: BoardMandateDTO[] = [
  {
    id: 'man-demo-1',
    userId: 'demo-user',
    targetCompanyName: 'Datacore Systems (Series B AI)',
    mandateType: 'advisory_board',
    stage: 'offer_term_sheet',
    annualCashRetainer: 15000,
    meetingFeePerBoardMeeting: 1000,
    meetingFeePerCommitteeMeeting: 500,
    expectedBoardMeetingsPerYear: 4,
    expectedCommitteeMeetingsPerYear: 4,
    equityPercentage: 0.35,
    equityGrantType: 'nso_options',
    vestingSchedule: 'two_year_monthly_no_cliff',
    accelerationClause: 'single_trigger_change_of_control',
    optionStrikePrice: 2500,
    timeCommitmentHoursPerMonth: 5,
    termLengthYears: 2,
    committeeAssignments: ['tech_cybersecurity', 'ai_ethics_data'],
    hasDAndOInsurance: true,
    dAndOPolicyLimitMillions: 10,
    hasSideADicCoverage: true,
    hasIndemnificationAgreement: true,
    notes: 'Advising founders on enterprise scale, SOC 2 compliance, and agentic LLM security perimeter.',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z'
  },
  {
    id: 'man-demo-2',
    userId: 'demo-user',
    targetCompanyName: 'Apex Defense Cloud (Growth PE)',
    mandateType: 'board_of_directors',
    stage: 'board_diligence',
    annualCashRetainer: 50000,
    meetingFeePerBoardMeeting: 2500,
    meetingFeePerCommitteeMeeting: 1500,
    expectedBoardMeetingsPerYear: 6,
    expectedCommitteeMeetingsPerYear: 6,
    equityPercentage: 0.5,
    equityGrantType: 'rsu',
    vestingSchedule: 'four_year_one_year_cliff',
    accelerationClause: 'double_trigger_change_and_termination',
    optionStrikePrice: 0,
    timeCommitmentHoursPerMonth: 10,
    termLengthYears: 3,
    committeeAssignments: ['audit_risk', 'tech_cybersecurity'],
    hasDAndOInsurance: true,
    dAndOPolicyLimitMillions: 25,
    hasSideADicCoverage: true,
    hasIndemnificationAgreement: true,
    notes: 'Prospective Independent Director and Technology Committee Chair. Fiduciary vetting underway.',
    createdAt: '2026-08-10T09:00:00.000Z',
    updatedAt: '2026-10-18T14:30:00.000Z'
  }
];

const DEFAULT_DEMO_GOVERNANCE_MATRIX: GovernanceMatrixDTO = {
  id: 'gov-matrix-demo-1',
  userId: 'demo-user',
  fiduciaryAcumenScore: 88,
  cyberAuditOversightScore: 92,
  aiGovernanceEthicsScore: 86,
  executiveCompensationScore: 78,
  boardroomPresenceDissentScore: 84,
  governanceQuotient: 87,
  tier: 'boardroom_luminary',
  qualifiedCommittees: ['audit_risk', 'tech_cybersecurity', 'nominating_governance', 'ai_ethics_data'],
  verifiedCredentials: [
    'NACD Directorship Certified (National Association of Corporate Directors)',
    'Stanford Directors College (Stanford Law School Executive Education)',
    'Carnegie Mellon Software Engineering Institute CERT Board Cyber Oversight'
  ],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-10-24T18:00:00.000Z'
};

function loadDemoBoardMandates(): BoardMandateDTO[] {
  try {
    const raw = localStorage.getItem('jobtrack_demo_board_mandates');
    if (!raw) return DEFAULT_DEMO_BOARD_MANDATES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEMO_BOARD_MANDATES;
  } catch {
    return DEFAULT_DEMO_BOARD_MANDATES;
  }
}

function saveDemoBoardMandates(mandates: BoardMandateDTO[]): void {
  try {
    localStorage.setItem('jobtrack_demo_board_mandates', JSON.stringify(mandates));
  } catch {}
}

function loadDemoGovernanceMatrix(): GovernanceMatrixDTO {
  try {
    const raw = localStorage.getItem('jobtrack_demo_governance_matrix');
    if (!raw) return DEFAULT_DEMO_GOVERNANCE_MATRIX;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : DEFAULT_DEMO_GOVERNANCE_MATRIX;
  } catch {
    return DEFAULT_DEMO_GOVERNANCE_MATRIX;
  }
}

function saveDemoGovernanceMatrix(matrix: GovernanceMatrixDTO): void {
  try {
    localStorage.setItem('jobtrack_demo_governance_matrix', JSON.stringify(matrix));
  } catch {}
}

function createDemoBoardMandate(input: BoardMandateMutationDTO): BoardMandateDTO {
  const current = loadDemoBoardMandates();
  const created: BoardMandateDTO = {
    id: `man-${Date.now()}`,
    userId: 'demo-user',
    targetCompanyName: input.targetCompanyName,
    mandateType: input.mandateType,
    stage: input.stage,
    annualCashRetainer: input.annualCashRetainer,
    meetingFeePerBoardMeeting: input.meetingFeePerBoardMeeting,
    meetingFeePerCommitteeMeeting: input.meetingFeePerCommitteeMeeting,
    expectedBoardMeetingsPerYear: input.expectedBoardMeetingsPerYear,
    expectedCommitteeMeetingsPerYear: input.expectedCommitteeMeetingsPerYear,
    equityPercentage: input.equityPercentage,
    equityGrantType: input.equityGrantType,
    vestingSchedule: input.vestingSchedule,
    accelerationClause: input.accelerationClause,
    optionStrikePrice: input.optionStrikePrice,
    timeCommitmentHoursPerMonth: input.timeCommitmentHoursPerMonth,
    termLengthYears: input.termLengthYears,
    committeeAssignments: input.committeeAssignments || [],
    hasDAndOInsurance: input.hasDAndOInsurance,
    dAndOPolicyLimitMillions: input.dAndOPolicyLimitMillions,
    hasSideADicCoverage: input.hasSideADicCoverage,
    hasIndemnificationAgreement: input.hasIndemnificationAgreement,
    notes: input.notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveDemoBoardMandates([created, ...current]);
  return created;
}

function updateDemoBoardMandate(id: string, input: Partial<BoardMandateMutationDTO>): BoardMandateDTO | null {
  const current = loadDemoBoardMandates();
  const idx = current.findIndex(m => m.id === id);
  if (idx === -1) return null;
  const updated: BoardMandateDTO = {
    ...current[idx],
    ...input,
    updatedAt: new Date().toISOString()
  };
  current[idx] = updated;
  saveDemoBoardMandates([...current]);
  return updated;
}

function deleteDemoBoardMandate(id: string): boolean {
  const current = loadDemoBoardMandates();
  const filtered = current.filter(m => m.id !== id);
  saveDemoBoardMandates(filtered);
  return filtered.length < current.length;
}

function computeDemoDilutionModel(
  mandateId: string,
  stage: CompanyGrowthStage = 'seed_stage',
  impact: AdvisoryImpactLevel = 'standard',
  futureRounds: number = 2,
  dilution: number = 0.2
): FastEquityDilutionModelDTO | null {
  const current = loadDemoBoardMandates();
  const mandate = current.find(m => m.id === mandateId);
  if (!mandate) return null;
  return computeFastEquityDilutionModel(mandate, stage, impact, futureRounds, dilution);
}

function computeDemoConflictCheck(mandateId: string, payload: any): ConflictOfInterestCheckDTO | null {
  const current = loadDemoBoardMandates();
  const mandate = current.find(m => m.id === mandateId);
  if (!mandate) return null;
  return evaluateConflictOfInterest(
    mandate,
    payload?.primaryEmployerName || 'Acme Cloud Platform',
    Boolean(payload?.isDirectCompetitor),
    Boolean(payload?.isAdjacentMarket),
    Number(payload?.primaryCapitalMillions) || 0,
    Number(payload?.targetCapitalMillions) || 0,
    Boolean(payload?.hasIpOverlap),
    Boolean(payload?.hasHardwareSegregation)
  );
}

function generateDemoWaiverLetter(mandateId: string, payload: any): OutsideBoardWaiverLetterDTO | null {
  const current = loadDemoBoardMandates();
  const mandate = current.find(m => m.id === mandateId);
  if (!mandate) return null;
  const check = evaluateConflictOfInterest(
    mandate,
    payload?.primaryEmployerName || 'Acme Cloud Platform',
    Boolean(payload?.isDirectCompetitor),
    Boolean(payload?.isAdjacentMarket),
    Number(payload?.primaryCapitalMillions) || 0,
    Number(payload?.targetCapitalMillions) || 0,
    Boolean(payload?.hasIpOverlap),
    Boolean(payload?.hasHardwareSegregation)
  );
  const letterMarkdown = generateOutsideBoardWaiverLetter(
    check,
    payload?.executiveName || 'Executive Candidate',
    payload?.generalCounselName || 'General Counsel',
    payload?.roleTitle || 'VP of Engineering'
  );
  return {
    mandateId: mandate.id,
    executiveFullName: payload?.executiveName || 'Executive Candidate',
    primaryEmployerName: check.primaryEmployerName,
    primaryEmployerGeneralCounselName: payload?.generalCounselName || 'General Counsel',
    targetCompanyName: mandate.targetCompanyName,
    targetCompanyDescription: mandate.notes,
    mandateRoleTitle: mandate.mandateType.replace(/_/g, ' '),
    monthlyHoursCommitment: mandate.timeCommitmentHoursPerMonth,
    generatedDate: new Date().toISOString().split('T')[0],
    letterMarkdown
  };
}

function updateDemoGovernanceMatrix(input: GovernanceMatrixMutationDTO): GovernanceMatrixDTO {
  const computed = computeGovernanceQuotient(input);
  const updated: GovernanceMatrixDTO = {
    id: 'gov-matrix-demo-1',
    userId: 'demo-user',
    fiduciaryAcumenScore: input.fiduciaryAcumenScore,
    cyberAuditOversightScore: input.cyberAuditOversightScore,
    aiGovernanceEthicsScore: input.aiGovernanceEthicsScore,
    executiveCompensationScore: input.executiveCompensationScore,
    boardroomPresenceDissentScore: input.boardroomPresenceDissentScore,
    governanceQuotient: computed.governanceQuotient,
    tier: computed.tier,
    qualifiedCommittees: computed.qualifiedCommittees,
    verifiedCredentials: input.verifiedCredentials || [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: new Date().toISOString()
  };
  saveDemoGovernanceMatrix(updated);
  return updated;
}

function loadDemoBoardDossier(): BoardDossierDTO {
  const matrix = loadDemoGovernanceMatrix();
  const mandates = loadDemoBoardMandates();
  const executiveName = 'Alex Rivera';
  const roleTitle = 'VP of Engineering & Technology Fellow';
  const boardDossierMarkdown = generateBoardDossierMarkdown(
    executiveName,
    roleTitle,
    matrix,
    mandates
  );
  return {
    userId: 'demo-user',
    executiveFullName: executiveName,
    executiveRoleTitle: roleTitle,
    boardValueProposition: 'Technology Executive with Enterprise Cloud & AI Governance Specialization',
    governanceQuotient: matrix.governanceQuotient,
    qualifiedCommittees: matrix.qualifiedCommittees,
    activeMandatesCount: mandates.length,
    totalBoardSeatsCount: mandates.filter(m => m.mandateType === 'board_of_directors').length,
    primarySpecializations: ['Enterprise SaaS Architecture', 'SEC Cyber Risk Oversight', 'AI Model Governance'],
    boardDossierMarkdown,
    generatedAt: new Date().toISOString()
  };
}

export const boardAdvisoryNexusRepository = {
  async listMandates(): Promise<BoardMandateDTO[]> {
    if (demoMode) return loadDemoBoardMandates();
    try {
      return await request<BoardMandateDTO[]>('/board-advisory-nexus/mandates');
    } catch {
      return loadDemoBoardMandates();
    }
  },

  async getMandate(id: string): Promise<BoardMandateDTO | null> {
    if (demoMode) {
      const list = loadDemoBoardMandates();
      return list.find(m => m.id === id) || null;
    }
    try {
      return await request<BoardMandateDTO>(`/board-advisory-nexus/mandates/${encodeURIComponent(id)}`);
    } catch {
      const list = loadDemoBoardMandates();
      return list.find(m => m.id === id) || null;
    }
  },

  async createMandate(input: BoardMandateMutationDTO): Promise<BoardMandateDTO> {
    if (demoMode) return createDemoBoardMandate(input);
    try {
      return await request<BoardMandateDTO>('/board-advisory-nexus/mandates', {
        method: 'POST',
        body: JSON.stringify(input)
      });
    } catch {
      return createDemoBoardMandate(input);
    }
  },

  async updateMandate(id: string, input: Partial<BoardMandateMutationDTO>): Promise<BoardMandateDTO | null> {
    if (demoMode) return updateDemoBoardMandate(id, input);
    try {
      return await request<BoardMandateDTO>(`/board-advisory-nexus/mandates/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(input)
      });
    } catch {
      return updateDemoBoardMandate(id, input);
    }
  },

  async deleteMandate(id: string): Promise<boolean> {
    if (demoMode) return deleteDemoBoardMandate(id);
    try {
      const res = await request<{ success: boolean }>(`/board-advisory-nexus/mandates/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      return Boolean(res?.success);
    } catch {
      return deleteDemoBoardMandate(id);
    }
  },

  async getDilutionModel(
    mandateId: string,
    stage: CompanyGrowthStage = 'seed_stage',
    impact: AdvisoryImpactLevel = 'standard',
    futureRounds: number = 2,
    dilution: number = 0.2
  ): Promise<FastEquityDilutionModelDTO | null> {
    if (demoMode) return computeDemoDilutionModel(mandateId, stage, impact, futureRounds, dilution);
    try {
      const qs = `?stage=${stage}&impact=${impact}&rounds=${futureRounds}&dilution=${dilution}`;
      return await request<FastEquityDilutionModelDTO>(`/board-advisory-nexus/mandates/${encodeURIComponent(mandateId)}/dilution-model${qs}`);
    } catch {
      return computeDemoDilutionModel(mandateId, stage, impact, futureRounds, dilution);
    }
  },

  async checkConflict(mandateId: string, payload: any): Promise<ConflictOfInterestCheckDTO | null> {
    if (demoMode) return computeDemoConflictCheck(mandateId, payload);
    try {
      return await request<ConflictOfInterestCheckDTO>(`/board-advisory-nexus/mandates/${encodeURIComponent(mandateId)}/conflict-check`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      return computeDemoConflictCheck(mandateId, payload);
    }
  },

  async generateWaiverLetter(mandateId: string, payload: any): Promise<OutsideBoardWaiverLetterDTO | null> {
    if (demoMode) return generateDemoWaiverLetter(mandateId, payload);
    try {
      return await request<OutsideBoardWaiverLetterDTO>(`/board-advisory-nexus/mandates/${encodeURIComponent(mandateId)}/waiver-letter`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      return generateDemoWaiverLetter(mandateId, payload);
    }
  },

  async getGovernanceMatrix(): Promise<GovernanceMatrixDTO> {
    if (demoMode) return loadDemoGovernanceMatrix();
    try {
      return await request<GovernanceMatrixDTO>('/board-advisory-nexus/governance-matrix');
    } catch {
      return loadDemoGovernanceMatrix();
    }
  },

  async updateGovernanceMatrix(input: GovernanceMatrixMutationDTO): Promise<GovernanceMatrixDTO> {
    if (demoMode) return updateDemoGovernanceMatrix(input);
    try {
      return await request<GovernanceMatrixDTO>('/board-advisory-nexus/governance-matrix', {
        method: 'PUT',
        body: JSON.stringify(input)
      });
    } catch {
      return updateDemoGovernanceMatrix(input);
    }
  },

  async getBoardDossier(): Promise<BoardDossierDTO> {
    if (demoMode) return loadDemoBoardDossier();
    try {
      return await request<BoardDossierDTO>('/board-advisory-nexus/dossier');
    } catch {
      return loadDemoBoardDossier();
    }
  }
};







