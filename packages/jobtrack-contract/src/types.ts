export const APPLICATION_STATUSES = [
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn'
] as const;

export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

export const TERMINAL_STATUSES = new Set<ApplicationStatus>(['Rejected', 'Withdrawn']);
export const ACTIVE_STATUSES = new Set<ApplicationStatus>([
  'Saved',
  'Applied',
  'Screening',
  'Interview',
  'Offer'
]);

export const WORK_MODES = ['On-site', 'Hybrid', 'Remote'] as const;
export type WorkMode = typeof WORK_MODES[number];

export const INTERVIEW_FORMATS = ['Online', 'Phone', 'On-site', 'Other'] as const;
export type InterviewFormat = typeof INTERVIEW_FORMATS[number];

export const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const;
export type InterviewStatus = typeof INTERVIEW_STATUSES[number];

export const SORT_ALLOWLIST = [
  'createdAt:desc',
  'createdAt:asc',
  'appliedAt:desc',
  'appliedAt:asc'
] as const;
export type SortOption = typeof SORT_ALLOWLIST[number];

export interface InterviewWireDTO {
  id: string;
  applicationId: string;
  title: string;
  at: string; // Strict RFC 3339 / ISO 8601 instant UTC or with offset
  timezone: string; // IANA named zone or UTC (no raw offsets)
  format: InterviewFormat;
  location: string | null;
  preparation: string | null;
  notes: string | null;
  status: InterviewStatus;
  createdAt?: string;
  updatedAt?: string;
  applicationVersion?: number;
}

export interface ApplicationWireDTO {
  id: string;
  company: string;
  position: string;
  url: string | null;
  normalizedUrl: string | null;
  source: string | null;
  sourceNormalized: string | null;
  jobCode: string | null;
  jobCodeNormalized: string | null;
  location: string | null;
  workMode: WorkMode | null;
  appliedAt: string | null; // YYYY-MM-DD
  salary: string | null;
  notes: string | null;
  nextAction: string | null;
  deadline: string | null; // ISO instant or null (never empty string on wire)
  status: ApplicationStatus;
  version: number; // Required version integer >= 1
  deletedAt?: string | null; // Null if active, ISO instant if trashed
  createdAt: string;
  updatedAt: string;
  interviews: InterviewWireDTO[];
}

export interface DashboardWireDTO {
  total: number;
  offers: number;
  upcoming: number;
  response: number;
  asOf: string; // ISO instant
}

export interface StructuredErrorDTO {
  code: string;
  message: string;
  requestId?: string;
  fields?: Record<string, string>;
  existing?: {
    id: string;
    status: ApplicationStatus;
  };
}

export interface ApplicationMutationInput {
  company: string;
  position: string;
  url?: string | null;
  source?: string | null;
  jobCode?: string | null;
  location?: string | null;
  workMode?: WorkMode | null;
  appliedAt?: string | null;
  salary?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  deadline?: string | null;
  status?: ApplicationStatus;
  confirmReapply?: boolean;
}

export interface InterviewMutationInput {
  title: string;
  at: string;
  timezone: string;
  format: InterviewFormat;
  location?: string | null;
  preparation?: string | null;
  notes?: string | null;
  status?: InterviewStatus;
}

export interface ListQueryInput {
  q?: string;
  status?: ApplicationStatus | 'all';
  sort?: SortOption;
  includeDeleted?: boolean;
}

export interface AiCommandWireDTO {
  id: string;
  userId: string;
  client: string; // e.g. 'claude-desktop', 'codex', 'antigravity', 'n8n-chat'
  command: string;
  status: 'pending' | 'succeeded' | 'failed' | 'rolled_back';
  inputPayload: Record<string, unknown>;
  resultPayload?: Record<string, unknown> | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface UrlImportExtractResult {
  company: string;
  position: string;
  url: string;
  location: string | null;
  workMode: WorkMode | null;
  salary: string | null;
  notes: string | null;
  deadline: string | null;
  confidence: {
    company: number;
    position: number;
  };
  rawTextExcerpt?: string;
}

// ==========================================
// UNIVERSAL DATASET & EXTRACTION CONTRACTS
// ==========================================

export type DatasetColumnType = 'text' | 'number' | 'currency' | 'date' | 'url' | 'list';

export interface DatasetColumnDefinition {
  key: string;
  label: string;
  type: DatasetColumnType;
  required?: boolean;
  unit?: string;
  description?: string;
}

export type DatasetCategory = 'product_research' | 'research_notes' | 'company_list' | 'jobtrack' | 'custom';

export interface DatasetWireDTO {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  category: DatasetCategory;
  schemaVersion: number;
  columns: DatasetColumnDefinition[];
  recordCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetProvenance {
  selector?: string;
  rawText?: string;
  confidence?: number;
  aiDerived?: boolean;
}

export interface DatasetRecordWireDTO {
  id: string;
  datasetId: string;
  userId: string;
  data: Record<string, unknown>;
  sourceUrl: string | null;
  sourceTitle: string | null;
  capturedAt: string;
  provenance?: DatasetProvenance;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetMutationInput {
  name: string;
  description?: string | null;
  category?: DatasetCategory;
  columns: DatasetColumnDefinition[];
}

export interface DatasetRecordMutationInput {
  data: Record<string, unknown>;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  capturedAt?: string;
  provenance?: DatasetProvenance;
}

export interface ExtractedTableData {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  sourceUrl: string;
  pageTitle: string;
}

export interface ExtractedItemData {
  title: string;
  fields: Record<string, unknown>;
  sourceUrl: string;
  sourceTitle: string;
  capturedAt: string;
  rawTextExcerpt?: string;
}

export interface ExtractedPagePayload {
  url: string;
  title: string;
  timestamp: string;
  tables: ExtractedTableData[];
  repeatingLists: ExtractedTableData[];
  selectedText: string | null;
  metadata: {
    description?: string;
    ogTitle?: string;
    ogImage?: string;
    jsonLd?: unknown[];
  };
  jobPosting?: UrlImportExtractResult | null;
}

export interface CandidateProfileWireDTO {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  cvUrl: string | null;
  portfolioUrl: string | null;
  skills: string[];
  bio: string | null;
  customAnswers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateProfileMutationInput {
  fullName: string;
  email: string;
  phone?: string | null;
  cvUrl?: string | null;
  portfolioUrl?: string | null;
  skills?: string[];
  bio?: string | null;
  customAnswers?: Record<string, string>;
  expectedUpdatedAt?: string | null;
}

export interface AtsKeywordBreakdown {
  skill: string;
  foundInCv: boolean;
  importance: 'high' | 'medium' | 'bonus';
}

export interface AtsMatchResultDTO {
  score: number;
  overallFit: 'Xuất sắc' | 'Phù hợp' | 'Tiềm năng' | 'Cần bổ sung kỹ năng';
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  keywordBreakdown: AtsKeywordBreakdown[];
}

export interface AtsMatchInput {
  company: string;
  position: string;
  notes?: string | null;
}

export interface CoverLetterResultDTO {
  coverLetter: string;
  shortPitch: string;
  highlights: string[];
}

export interface CoverLetterInput {
  company: string;
  position: string;
  notes?: string | null;
  language?: 'vi' | 'en';
}

export interface JobSubscriptionDTO {
  id: string;
  userId: string;
  title: string;
  keywords: string[];
  location: string | null;
  minSalary: number | null;
  sources: string[];
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionMutationInput {
  title: string;
  keywords?: string[];
  location?: string | null;
  minSalary?: number | null;
  sources?: string[];
  isActive?: boolean;
}

export interface CrawlRunResultDTO {
  subscriptionId: string;
  subscriptionTitle: string;
  found: number;
  matched: number;
  saved: number;
  skippedDuplicates: number;
  items: Array<{
    company: string;
    position: string;
    status: 'saved' | 'duplicate_url' | 'duplicate_identity';
  }>;
}
