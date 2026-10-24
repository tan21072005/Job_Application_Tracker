import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { orgTopologyStudioRepository } from './data';
import type { ReorgScenarioMutationDTO, TeamTopologyMutationDTO } from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('orgTopologyStudioRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists default demo reorganization scenarios with summary metrics', async () => {
    const list = await orgTopologyStudioRepository.listScenarios();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].title).toBe('Enterprise Platform Decoupling & Stream Realignment');
    expect(list[0].status).toBe('draft');
    expect(list[0].currentHierarchyMetrics.totalHeadcount).toBe(52);
    expect(list[0].currentConwayScore).toBe(64.5);
    expect(list[0].proposedConwayScore).toBe(86.2);
    expect(list[0].budgetDeltaAnnualUsd).toBe(240000);
  });

  it('retrieves single reorganization scenario by id', async () => {
    const list = await orgTopologyStudioRepository.listScenarios();
    const first = list[0];
    const retrieved = await orgTopologyStudioRepository.getScenario(first.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(first.id);
    expect(retrieved?.title).toBe('Enterprise Platform Decoupling & Stream Realignment');
  });

  it('creates and updates a reorganization scenario', async () => {
    const mutation: ReorgScenarioMutationDTO = {
      title: 'H1 2027 Core Architecture & Platform Expansion',
      targetCompletionDate: '2027-06-30',
      executiveRationale: 'Establish dedicated infrastructure teams to unblock rapid checkout iteration.'
    };

    const created = await orgTopologyStudioRepository.createScenario(mutation);
    expect(created.id).toBeDefined();
    expect(created.title).toBe('H1 2027 Core Architecture & Platform Expansion');
    expect(created.currentHierarchyMetrics.totalHeadcount).toBe(48);

    const updated = await orgTopologyStudioRepository.updateScenario(created.id, {
      title: 'H1 2027 Core Architecture & Platform Expansion (Approved)',
      status: 'board_approved'
    });
    expect(updated?.title).toBe('H1 2027 Core Architecture & Platform Expansion (Approved)');
    expect(updated?.status).toBe('board_approved');
  });

  it('manages team topologies with cognitive load index recalculation', async () => {
    const scenarios = await orgTopologyStudioRepository.listScenarios();
    const scenarioId = scenarios[0].id;

    const initialTeams = await orgTopologyStudioRepository.listTeams(scenarioId);
    expect(initialTeams.length).toBeGreaterThanOrEqual(4);

    const newTeamMutation: TeamTopologyMutationDTO = {
      name: 'Data Pipeline Platform',
      type: 'platform',
      missionStatement: 'Provide self-service Kafka streams and Snowflake transformation pipelines.',
      headcount: 5,
      domainComplexity: 4,
      operationalToilPercentage: 15,
      weeklyIncidentAlertCount: 2,
      ownedServices: [],
      interactions: []
    };

    const added = await orgTopologyStudioRepository.addTeam(scenarioId, newTeamMutation);
    expect(added).not.toBeNull();
    expect(added?.name).toBe('Data Pipeline Platform');
    expect(added?.cognitiveLoadIndex).toBeGreaterThan(0);

    const updated = await orgTopologyStudioRepository.updateTeam(added!.id, {
      headcount: 8,
      operationalToilPercentage: 30
    });
    expect(updated).not.toBeNull();
    expect(updated?.headcount).toBe(8);

    const deleted = await orgTopologyStudioRepository.deleteTeam(added!.id);
    expect(deleted).toBe(true);
  });

  it('lists employees with hierarchy attributes and span health', async () => {
    const scenarios = await orgTopologyStudioRepository.listScenarios();
    const scenarioId = scenarios[0].id;

    const employees = await orgTopologyStudioRepository.listEmployees(scenarioId);
    expect(employees.length).toBeGreaterThanOrEqual(5);
    expect(employees[0].employeeName).toBe('Dr. Evelyn Reed');
    expect(employees[0].level).toBe('EM4');
    expect(employees[0].spanHealth).toBe('optimal');
  });

  it('generates executive board reorganization memorandum', async () => {
    const scenarios = await orgTopologyStudioRepository.listScenarios();
    const scenarioId = scenarios[0].id;

    const memo = await orgTopologyStudioRepository.generateMemo(scenarioId);
    expect(memo).toContain('Executive Engineering Organization Reorganization Memorandum');
    expect(memo).toContain('Conway\'s Law Alignment');
    expect(memo).toContain(scenarios[0].title);
    expect(memo).toContain('Board Committee Recommendation');
  });
});
