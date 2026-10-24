import type {
  ApplicationWireDTO,
  InterviewWireDTO,
  ApplicationMutationInput,
  InterviewMutationInput
} from './types.ts';

export interface UIApplicationModel {
  id: string;
  version: number;
  company: string;
  position: string;
  url: string;
  source: string;
  jobCode: string;
  location: string;
  workMode: string;
  appliedAt: string;
  salary: string;
  notes: string;
  nextAction: string;
  deadline: string;
  status: ApplicationWireDTO['status'];
  deletedAt?: string | null;
  priority?: ApplicationWireDTO['priority'];
  tags?: string[];
  statusUpdatedAt?: string;
  scorecard?: Record<string, number>;
  createdAt: string;
  updatedAt?: string;
  interviews: UIInterviewModel[];
}

export interface UIInterviewModel {
  id: string;
  applicationId: string;
  title: string;
  at: string;
  timezone: string;
  format: string;
  location: string;
  preparation: string;
  notes: string;
  status: InterviewWireDTO['status'];
  createdAt?: string;
  updatedAt?: string;
}

export function wireInterviewToUI(wire: InterviewWireDTO): UIInterviewModel {
  return {
    id: wire.id,
    applicationId: wire.applicationId,
    title: wire.title,
    at: wire.at,
    timezone: wire.timezone,
    format: wire.format,
    location: wire.location || '',
    preparation: wire.preparation || '',
    notes: wire.notes || '',
    status: wire.status,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt
  };
}

export function wireApplicationToUI(wire: ApplicationWireDTO): UIApplicationModel {
  return {
    id: wire.id,
    version: wire.version,
    company: wire.company,
    position: wire.position,
    url: wire.url || '',
    source: wire.source || '',
    jobCode: wire.jobCode || '',
    location: wire.location || '',
    workMode: wire.workMode || '',
    appliedAt: wire.appliedAt || '',
    salary: wire.salary || '',
    notes: wire.notes || '',
    nextAction: wire.nextAction || '',
    deadline: wire.deadline || '',
    status: wire.status,
    deletedAt: wire.deletedAt || null,
    priority: wire.priority || 'target',
    tags: wire.tags || [],
    statusUpdatedAt: wire.statusUpdatedAt || wire.createdAt,
    scorecard: wire.scorecard,
    createdAt: wire.createdAt,
    updatedAt: wire.updatedAt,
    interviews: (wire.interviews || []).map(wireInterviewToUI)
  };
}

export function uiDraftToWireMutation(draft: {
  company: string;
  position: string;
  url?: string;
  source?: string;
  jobCode?: string;
  location?: string;
  workMode?: string;
  appliedAt?: string;
  salary?: string;
  notes?: string;
  nextAction?: string;
  deadline?: string;
  status?: string;
  confirmReapply?: boolean;
}): ApplicationMutationInput {
  return {
    company: draft.company.trim(),
    position: draft.position.trim(),
    url: draft.url?.trim() || null,
    source: draft.source?.trim() || null,
    jobCode: draft.jobCode?.trim() || null,
    location: draft.location?.trim() || null,
    workMode: (draft.workMode as ApplicationMutationInput['workMode']) || null,
    appliedAt: draft.appliedAt?.trim() || null,
    salary: draft.salary?.trim() || null,
    notes: draft.notes?.trim() || null,
    nextAction: draft.nextAction?.trim() || null,
    deadline: draft.deadline?.trim() || null,
    status: (draft.status as ApplicationMutationInput['status']) || 'Saved',
    confirmReapply: draft.confirmReapply === true
  };
}

export function uiInterviewToWireMutation(input: {
  title: string;
  at: string;
  timezone: string;
  format: string;
  location?: string;
  preparation?: string;
  notes?: string;
  status?: string;
}): InterviewMutationInput {
  return {
    title: input.title.trim(),
    at: input.at.trim(),
    timezone: input.timezone.trim(),
    format: input.format as InterviewMutationInput['format'],
    location: input.location?.trim() || null,
    preparation: input.preparation?.trim() || null,
    notes: input.notes?.trim() || null,
    status: (input.status as InterviewMutationInput['status']) || 'Scheduled'
  };
}
