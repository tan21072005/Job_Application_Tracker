import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  executiveContractRepository
} from './data.ts';
import {
  type ExecutiveContractDTO,
  type ExecutiveContractMutationDTO,
  computeNonCompeteSubScore,
  computeIpAssignmentSubScore,
  computeSeveranceSubScore,
  computeChangeOfControlSubScore,
  computeIndemnificationSubScore,
  evaluateExecutiveContract,
  generateSynthesizedRedlines,
  generateExhibitAMarkdown,
  generateExecutiveAddendumMarkdown
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

describe('Executive Contract Guard & Severance Risk Analyzer (Web)', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('executiveContractRepository.listContracts returns pre-seeded executive contracts with calculated CRI', async () => {
    const contracts = await executiveContractRepository.listContracts();
    expect(contracts.length).toBeGreaterThanOrEqual(3);

    const acme = contracts.find(c => c.companyName === 'Acme Cloud AI');
    expect(acme).toBeDefined();
    expect(acme?.contractRiskIndex).toBeGreaterThanOrEqual(70);
    expect(acme?.riskTier).toBe('high_vulnerability');
    expect(acme?.clauses.length).toBe(5);

    const nexus = contracts.find(c => c.companyName === 'Nexus Robotics');
    expect(nexus).toBeDefined();
    expect(nexus?.jurisdiction).toBe('us_california');
    expect(nexus?.contractRiskIndex).toBeLessThanOrEqual(50);

    const vortex = contracts.find(c => c.companyName === 'Vortex Fintech');
    expect(vortex).toBeDefined();
    expect(vortex?.jurisdiction).toBe('vietnam');
    expect(vortex?.riskTier).toBe('critical_toxic');
  });

  it('executiveContractRepository contract lifecycle (create, update, delete)', async () => {
    const mutation: ExecutiveContractMutationDTO = {
      companyName: 'Hyperscale Dynamics',
      roleTitle: 'Chief Architect',
      jurisdiction: 'us_delaware_ny',
      clauseParameters: {
        non_compete_non_solicit: {
          durationMonths: 6,
          scope: 'narrow_named_competitors',
          gardenLeavePercent: 100,
          solicitationBreadth: 'senior_execs_only',
          explicitCaDisclaimer: false
        },
        ip_prior_inventions: {
          priorInventionsScheduleAttached: true,
          priorInventionsCount: 2,
          assignmentScope: 'narrow_company_business',
          moonlightOpenSourcePermitted: true,
          statutoryProtectionCited: true
        },
        severance_without_cause: {
          cashSalaryMonths: 12,
          targetBonusIncluded: true,
          healthBenefitMonths: 12,
          goodReasonResignationCovered: true,
          narrowCauseDefinition: true
        },
        double_trigger_cic: {
          accelerationType: 'double_trigger_full',
          protectionWindowMonths: 24,
          ptepMonths: 36,
          goldenParachuteCutbackProtected: true
        },
        indemnification_d_and_o: {
          standaloneAgreementSigned: true,
          policyCoverageAdequate: true,
          mandatoryAdvancement: true,
          tailCoverageSixYears: true
        }
      },
      priorInventions: [
        {
          category: 'open_source_repo',
          title: 'Distributed Log Engine',
          identifierOrUrl: 'https://github.com/exec/log-engine',
          creationDate: '2024-01-01',
          technologyDescription: 'Raft consensus log engine in Rust',
          retainedRights: ['Full Commercial Copyright'],
          confidentialExclusionConfirmed: true
        }
      ]
    };

    const created = await executiveContractRepository.createContract(mutation);
    expect(created.id).toBeDefined();
    expect(created.companyName).toBe('Hyperscale Dynamics');
    expect(created.contractRiskIndex).toBeLessThanOrEqual(25);
    expect(created.riskTier).toBe('low_risk');
    expect(created.priorInventions.length).toBe(1);

    const fetched = await executiveContractRepository.getContract(created.id);
    expect(fetched?.id).toBe(created.id);

    const updated = await executiveContractRepository.updateContract(created.id, {
      roleTitle: 'Distinguished Fellow'
    });
    expect(updated?.roleTitle).toBe('Distinguished Fellow');

    const deleted = await executiveContractRepository.deleteContract(created.id);
    expect(deleted).toBe(true);
    const afterDelete = await executiveContractRepository.getContract(created.id);
    expect(afterDelete).toBeNull();
  });

  it('prior invention management updates Exhibit A and recalculates CRI', async () => {
    const contracts = await executiveContractRepository.listContracts();
    const contract = contracts[0];
    const initialInvCount = contract.priorInventions.length;

    const withAdded = await executiveContractRepository.addPriorInvention(contract.id, {
      category: 'saas_product',
      title: 'Global Observability Mesh',
      identifierOrUrl: 'https://mesh-observability.io',
      creationDate: '2025-06-01',
      technologyDescription: 'eBPF automated distributed tracing daemon',
      retainedRights: ['Full Commercial Copyright'],
      confidentialExclusionConfirmed: true
    });
    expect(withAdded?.priorInventions.length).toBe(initialInvCount + 1);

    const addedItem = withAdded!.priorInventions[withAdded!.priorInventions.length - 1];
    const withDeleted = await executiveContractRepository.deletePriorInvention(contract.id, addedItem.id);
    expect(withDeleted?.priorInventions.length).toBe(initialInvCount);
  });

  it('redline generation and status toggling update proposed modifications', async () => {
    const contracts = await executiveContractRepository.listContracts();
    const contract = contracts[0];

    const redlines = await executiveContractRepository.generateRedlines(contract.id);
    expect(redlines.length).toBeGreaterThanOrEqual(1);

    const redlineId = redlines[0].id;
    const updated = await executiveContractRepository.updateRedline(contract.id, redlineId, 'accepted');
    expect(updated?.status).toBe('accepted');
  });

  it('exportAddendum and exportExhibitA synthesize valid legal documents', async () => {
    const contracts = await executiveContractRepository.listContracts();
    const contract = contracts[0];

    const addendum = await executiveContractRepository.exportAddendum(contract.id);
    expect(addendum?.markdown).toContain('EXECUTIVE COUNTER-AMENDMENT ADDENDUM');
    expect(addendum?.markdown).toContain(contract.companyName);

    const exhibitA = await executiveContractRepository.exportExhibitA(contract.id);
    expect(exhibitA?.markdown).toContain('EXHIBIT A: SCHEDULE OF PRIOR INVENTIONS');
    expect(exhibitA?.markdown).toContain(contract.companyName);
  });
});
