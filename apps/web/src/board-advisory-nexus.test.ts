import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { boardAdvisoryNexusRepository } from './data';
import type { BoardMandateMutationDTO, GovernanceMatrixMutationDTO } from './domain';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('boardAdvisoryNexusRepository (Web Demo Mode)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists default demo board mandates', async () => {
    const list = await boardAdvisoryNexusRepository.listMandates();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list[0].targetCompanyName).toBe('Datacore Systems (Series B AI)');
    expect(list[1].targetCompanyName).toBe('Apex Defense Cloud (Growth PE)');
  });

  it('creates and updates a new board mandate in demo mode', async () => {
    const input: BoardMandateMutationDTO = {
      targetCompanyName: 'NovaScale Infrastructure',
      mandateType: 'advisory_board',
      stage: 'initial_dialogue',
      annualCashRetainer: 20000,
      meetingFeePerBoardMeeting: 1000,
      meetingFeePerCommitteeMeeting: 500,
      expectedBoardMeetingsPerYear: 4,
      expectedCommitteeMeetingsPerYear: 4,
      equityPercentage: 0.35,
      equityGrantType: 'nso_options',
      vestingSchedule: 'two_year_monthly_no_cliff',
      accelerationClause: 'single_trigger_change_of_control',
      optionStrikePrice: 1500,
      timeCommitmentHoursPerMonth: 5,
      termLengthYears: 2,
      committeeAssignments: ['tech_cybersecurity'],
      hasDAndOInsurance: true,
      dAndOPolicyLimitMillions: 10,
      hasSideADicCoverage: true,
      hasIndemnificationAgreement: true,
      notes: 'Strategic architecture advisory'
    };

    const created = await boardAdvisoryNexusRepository.createMandate(input);
    expect(created.id).toBeDefined();
    expect(created.targetCompanyName).toBe('NovaScale Infrastructure');

    const updated = await boardAdvisoryNexusRepository.updateMandate(created.id, {
      stage: 'offer_term_sheet',
      equityPercentage: 0.4
    });
    expect(updated).not.toBeNull();
    expect(updated?.stage).toBe('offer_term_sheet');
    expect(updated?.equityPercentage).toBe(0.4);

    const retrieved = await boardAdvisoryNexusRepository.getMandate(created.id);
    expect(retrieved?.equityPercentage).toBe(0.4);
  });

  it('computes FAST equity dilution model with 4 liquidation scenarios', async () => {
    const mandates = await boardAdvisoryNexusRepository.listMandates();
    const mandateId = mandates[0].id;

    const model = await boardAdvisoryNexusRepository.getDilutionModel(
      mandateId,
      'seed_stage',
      'strategic',
      2,
      0.2
    );

    expect(model).not.toBeNull();
    expect(model?.retainedEquityPercentage).toBe(0.224);
    expect(model?.scenarios.length).toBe(4);

    const baseScenario = model?.scenarios.find(s => s.scenarioName === 'base');
    expect(baseScenario?.exitValuationMillions).toBe(100);
    expect(baseScenario?.grossProceedsUsd).toBe(224000);
    expect(baseScenario?.effectiveHourlyYieldUsd).toBeGreaterThan(1000);
  });

  it('evaluates conflict of interest and generates waiver request letter', async () => {
    const mandates = await boardAdvisoryNexusRepository.listMandates();
    const mandateId = mandates[0].id;

    const conflict = await boardAdvisoryNexusRepository.checkConflict(mandateId, {
      primaryEmployerName: 'Enterprise SaaS Global',
      isDirectCompetitor: false,
      isAdjacentMarket: true,
      primaryCapitalMillions: 75,
      targetCapitalMillions: 15,
      hasIpOverlap: false,
      hasHardwareSegregation: true
    });

    expect(conflict).not.toBeNull();
    expect(conflict?.coiTier).toBe('low_risk');
    expect(conflict?.claytonActViolationRisk).toBe(false);
    expect(conflict?.waiverLetterRequired).toBe(true);

    const letter = await boardAdvisoryNexusRepository.generateWaiverLetter(mandateId, {
      executiveName: 'Alex Rivera',
      generalCounselName: 'Eleanor Vance, Esq.',
      roleTitle: 'VP of Engineering'
    });

    expect(letter).not.toBeNull();
    expect(letter?.letterMarkdown).toContain('Alex Rivera');
    expect(letter?.letterMarkdown).toContain('Eleanor Vance, Esq.');
    expect(letter?.letterMarkdown).toContain('CONFIDENTIAL PRIVILEGED LEGAL MEMORANDUM');
  });

  it('manages governance matrix and generates board dossier', async () => {
    const initialMatrix = await boardAdvisoryNexusRepository.getGovernanceMatrix();
    expect(initialMatrix.governanceQuotient).toBe(87);
    expect(initialMatrix.tier).toBe('boardroom_luminary');

    const mutation: GovernanceMatrixMutationDTO = {
      fiduciaryAcumenScore: 92,
      cyberAuditOversightScore: 95,
      aiGovernanceEthicsScore: 90,
      executiveCompensationScore: 85,
      boardroomPresenceDissentScore: 88,
      verifiedCredentials: ['NACD Fellow', 'Stanford Directors College']
    };

    const updated = await boardAdvisoryNexusRepository.updateGovernanceMatrix(mutation);
    expect(updated.governanceQuotient).toBeGreaterThanOrEqual(90);
    expect(updated.tier).toBe('boardroom_luminary');
    expect(updated.qualifiedCommittees.length).toBe(5);

    const dossier = await boardAdvisoryNexusRepository.getBoardDossier();
    expect(dossier.governanceQuotient).toBe(updated.governanceQuotient);
    expect(dossier.boardDossierMarkdown).toContain('EXECUTIVE BOARD BIOGRAPHY & GOVERNANCE DOSSIER');
    expect(dossier.boardDossierMarkdown).toContain('BOARDROOM LUMINARY');
  });

  it('deletes board mandate successfully', async () => {
    const mandates = await boardAdvisoryNexusRepository.listMandates();
    const toDeleteId = mandates[0].id;

    const deleted = await boardAdvisoryNexusRepository.deleteMandate(toDeleteId);
    expect(deleted).toBe(true);

    const remaining = await boardAdvisoryNexusRepository.listMandates();
    expect(remaining.find(m => m.id === toDeleteId)).toBeUndefined();
  });
});
