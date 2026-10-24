import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  backchannelRepository,
  type ReferenceAdvocateDTO
} from './data.ts';
import {
  compute360CoverageMatrix,
  computeAuditVulnerabilityIndex,
  calculateBackchannelProbability,
  generateRefereeBriefingPacketMarkdown
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

describe('Executive Reference & Backchannel Intelligence (Web)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('backchannelRepository.listAdvocates returns pre-seeded executive advocates with complete 360 archetypes', async () => {
    const advocates = await backchannelRepository.listAdvocates();
    expect(advocates.length).toBeGreaterThanOrEqual(4);
    const archetypes = advocates.map(a => a.relationshipArchetype);
    expect(archetypes).toContain('superior_sponsor');
    expect(archetypes).toContain('direct_report');
    expect(archetypes).toContain('cross_functional_peer');
    expect(archetypes).toContain('external_stakeholder');
  });

  it('backchannelRepository.listAudits returns pre-configured audit with calculated BVI', async () => {
    const audits = await backchannelRepository.listAudits();
    expect(audits.length).toBeGreaterThanOrEqual(1);
    const audit = audits[0];
    expect(audit.targetCompany).toBe('CognitiveScale AI');
    expect(audit.targetRole).toBe('VP of Engineering');
    expect(audit.overallBackchannelVulnerabilityIndex).toBeGreaterThan(0);
    expect(audit.stakeholders.length).toBeGreaterThanOrEqual(3);
    expect(audit.strategicRecommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('backchannelRepository advocate lifecycle (create, update, delete)', async () => {
    const created = await backchannelRepository.createAdvocate({
      fullName: 'Dr. Rachel Kim',
      currentTitle: 'VP of Data Science',
      currentCompany: 'QuantumScale',
      relationshipArchetype: 'cross_functional_peer',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2021-01',
      sharedTenureEnd: '2023-01',
      sharedTenureMonths: 24,
      projectsCoDelivered: ['Predictive Risk Engine'],
      endorsementStrength: 'unconditional_champion',
      vouchedCompetencies: ['scaling_0_to_1', 'crisis_incident_response'],
      email: 'rachel.kim@quantumscale.io',
      preferredChannel: 'email',
      ndaRestricted: false
    });
    expect(created.id).toBeDefined();
    expect(created.fullName).toBe('Dr. Rachel Kim');

    const fetched = await backchannelRepository.getAdvocate(created.id);
    expect(fetched?.email).toBe('rachel.kim@quantumscale.io');

    const updated = await backchannelRepository.updateAdvocate(created.id, {
      currentTitle: 'Chief AI Officer'
    });
    expect(updated?.currentTitle).toBe('Chief AI Officer');

    const deleted = await backchannelRepository.deleteAdvocate(created.id);
    expect(deleted).toBe(true);
    const refetched = await backchannelRepository.getAdvocate(created.id);
    expect(refetched).toBeNull();
  });

  it('backchannelRepository.generateBriefing synthesizes personalized markdown dossier', async () => {
    const audits = await backchannelRepository.listAudits();
    const advocates = await backchannelRepository.listAdvocates();
    const audit = audits[0];
    const advocate = advocates[0];

    const briefing = await backchannelRepository.generateBriefing(audit.id, advocate.id);
    expect(briefing).not.toBeNull();
    expect(briefing?.advocateId).toBe(advocate.id);
    expect(briefing?.targetCompany).toBe(audit.targetCompany);
    expect(briefing?.formattedMarkdown).toContain('# Executive Reference Briefing Packet');
    expect(briefing?.formattedMarkdown).toContain(advocate.fullName);
    expect(briefing?.priorityProjectsToHighlight.length).toBeGreaterThanOrEqual(1);
  });

  it('compute360CoverageMatrix calculates readiness and flags missing archetypes', () => {
    const incompletePanel: ReferenceAdvocateDTO[] = [
      {
        id: 'adv-1',
        fullName: 'Michael Pham',
        currentTitle: 'CTO',
        currentCompany: 'Apex FinTech',
        relationshipArchetype: 'superior_sponsor',
        sharedCompany: 'FinFlow Global',
        sharedTenureStart: '2020-01',
        sharedTenureEnd: '2023-06',
        sharedTenureMonths: 42,
        projectsCoDelivered: ['Payment Gateway'],
        endorsementStrength: 'unconditional_champion',
        vouchedCompetencies: ['scaling_0_to_1', 'board_governance'],
        email: 'michael@example.com',
        preferredChannel: 'email',
        ndaRestricted: false,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
      }
    ];

    const matrix = compute360CoverageMatrix(incompletePanel);
    expect(matrix.totalAdvocates).toBe(1);
    expect(matrix.missingArchetypes).toContain('direct_report');
    expect(matrix.missingArchetypes).toContain('cross_functional_peer');
    expect(matrix.criticalGaps.some(g => g.includes('Missing Direct-Report Referee'))).toBe(true);
    expect(matrix.overallReadinessScore).toBeLessThan(60);
  });

  it('computeAuditVulnerabilityIndex accurately computes BVI risk levels', () => {
    const result = computeAuditVulnerabilityIndex([
      {
        id: 's-1',
        fullName: 'Hostile Stakeholder',
        role: 'Board Director',
        organization: 'Target Corp',
        isDecisionMaker: true,
        networkOverlapDegree: 'first_degree',
        mutualCompanies: ['PriorCorp'],
        mutualTenureOverlapMonths: 36,
        potentialBackchannelIntermediaries: [],
        predictedSentiment: 'adverse_risk',
        probabilityScore: 95,
        rationale: 'Known prior friction'
      }
    ]);

    expect(result.vulnerabilityIndex).toBeGreaterThanOrEqual(75);
    expect(result.level).toBe('critical_backchannel_danger');
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
  });

  it('calculateBackchannelProbability yields higher score for 1st-degree decision makers', () => {
    const firstDegree = calculateBackchannelProbability({
      id: 'stk-test-1',
      fullName: 'Alice Walker',
      role: 'CEO',
      organization: 'Target AI',
      isDecisionMaker: true,
      networkOverlapDegree: 'first_degree',
      mutualCompanies: ['SharedTech'],
      mutualTenureOverlapMonths: 36,
      potentialBackchannelIntermediaries: [],
      predictedSentiment: 'champion'
    });

    const thirdDegree = calculateBackchannelProbability({
      id: 'stk-test-2',
      fullName: 'Bob Davis',
      role: 'Engineer',
      organization: 'Target AI',
      isDecisionMaker: false,
      networkOverlapDegree: 'third_degree',
      mutualCompanies: [],
      mutualTenureOverlapMonths: 0,
      potentialBackchannelIntermediaries: [],
      predictedSentiment: 'neutral'
    });

    expect(firstDegree.probabilityScore).toBeGreaterThan(thirdDegree.probabilityScore);
    expect(firstDegree.probabilityScore).toBeGreaterThanOrEqual(75);
    expect(thirdDegree.probabilityScore).toBeLessThanOrEqual(25);
  });
});
