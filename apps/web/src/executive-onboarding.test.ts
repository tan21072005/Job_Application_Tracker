import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  executiveOnboardingRepository
} from './data.ts';
import {
  type ExecutiveOnboardingPlanDTO,
  computeStakeholderRelationshipIndex,
  computeDiagnosticHealthIndex,
  computeTransitionMomentum,
  generateExecutiveMemoMarkdown
} from './domain.ts';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Executive First 100-Day Transition Command Center (Web)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('executiveOnboardingRepository.listPlans returns pre-seeded executive transition plan in demo mode', async () => {
    const plans = await executiveOnboardingRepository.listPlans();
    expect(plans.length).toBeGreaterThanOrEqual(1);

    const plan = plans[0];
    expect(plan.companyName).toBe('Acme Cloud AI');
    expect(plan.roleTitle).toBe('VP of Engineering');
    expect(plan.currentDay).toBe(34);
    expect(plan.stakeholders.length).toBe(5);
    expect(plan.milestones.length).toBe(6);
    expect(plan.momentum.transitionMomentumIndex).toBeGreaterThanOrEqual(80);
    expect(plan.momentum.tier).toBe('accelerating');
  });

  it('executiveOnboardingRepository.updateMilestone updates milestone and recalculates momentum', async () => {
    const plans = await executiveOnboardingRepository.listPlans();
    const plan = plans[0];

    const targetMilestone = plan.milestones.find(m => m.status === 'in_progress');
    expect(targetMilestone).toBeDefined();

    const updated = await executiveOnboardingRepository.updateMilestone(plan.id, targetMilestone!.id, {
      status: 'achieved',
      deliveredDay: 34
    });

    expect(updated).not.toBeNull();
    expect(updated?.status).toBe('achieved');
    expect(updated?.deliveredDay).toBe(34);

    const refreshed = await executiveOnboardingRepository.getPlan(plan.id);
    expect(refreshed).not.toBeNull();
    expect(refreshed?.momentum.achievedMilestones).toBe(plan.momentum.achievedMilestones + 1);
  });

  it('executiveOnboardingRepository.addStakeholder logs interview and recalculates SRI', async () => {
    const plans = await executiveOnboardingRepository.listPlans();
    const plan = plans[0];

    const added = await executiveOnboardingRepository.addStakeholder(plan.id, {
      name: 'Robert Chen',
      roleTitle: 'Staff SRE Architect',
      category: 'staff_principal',
      expectations: 'Observability standardization',
      painPoints: 'Alert fatigue',
      politicalDynamics: 'High technical credibility',
      sentimentScore: 5,
      status: 'completed',
      alignmentLevel: 'strongly_aligned'
    });

    expect(added).not.toBeNull();
    expect(added?.name).toBe('Robert Chen');
    expect(added?.sentimentScore).toBe(5);

    const refreshed = await executiveOnboardingRepository.getPlan(plan.id);
    expect(refreshed).not.toBeNull();
    expect(refreshed?.stakeholders.length).toBe(plan.stakeholders.length + 1);
    expect(refreshed?.momentum.interviewedStakeholders).toBe(plan.momentum.interviewedStakeholders + 1);
  });

  it('executiveOnboardingRepository.exportMemo generates formatted Markdown briefings', async () => {
    const plans = await executiveOnboardingRepository.listPlans();
    const plan = plans[0];

    const memoDay30 = await executiveOnboardingRepository.exportMemo(plan.id, 'day_30_listening_tour');
    expect(memoDay30).not.toBeNull();
    expect(memoDay30?.markdown).toContain('EXECUTIVE MEMO: Day 30 Listening Tour Insights');
    expect(memoDay30?.markdown).toContain('Acme Cloud AI');
    expect(memoDay30?.markdown).toContain('Stakeholder Sentiment & 360 Alignment Matrix');

    const memoDay60 = await executiveOnboardingRepository.exportMemo(plan.id, 'day_60_strategic_priorities');
    expect(memoDay60).not.toBeNull();
    expect(memoDay60?.markdown).toContain('EXECUTIVE BRIEFING: Day 60 Strategic Priorities');

    const memoDay100 = await executiveOnboardingRepository.exportMemo(plan.id, 'day_100_transformation_charter');
    expect(memoDay100).not.toBeNull();
    expect(memoDay100?.markdown).toContain('BOARD CHARTER: Day 100 Engineering Transformation Review');
  });

  it('executiveOnboardingRepository handles plan lifecycle and deletion', async () => {
    const created = await executiveOnboardingRepository.createPlan({
      companyName: 'Vertex AI Systems',
      roleTitle: 'Chief Technology Officer',
      startDate: '2026-11-01',
      currentDay: 1,
      executiveSponsorName: 'Board of Directors'
    });

    expect(created.id).toBeDefined();
    expect(created.companyName).toBe('Vertex AI Systems');
    expect(created.stakeholders.length).toBeGreaterThanOrEqual(3);
    expect(created.milestones.length).toBeGreaterThanOrEqual(3);

    const deleted = await executiveOnboardingRepository.deletePlan(created.id);
    expect(deleted).toBe(true);

    const verified = await executiveOnboardingRepository.getPlan(created.id);
    expect(verified).toBeNull();
  });
});
