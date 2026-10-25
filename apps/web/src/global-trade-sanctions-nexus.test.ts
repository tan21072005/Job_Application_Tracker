import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  computeLevenshteinDistance,
  computeJaroWinklerSimilarity,
  computeSanctionsCompositeScore,
  evaluateOfacFiftyPercentRule,
  computeSecondarySanctionsExposureIndex,
  evaluateEccnEncryptionClassification,
  computeDeemedExportExposure,
  evaluateCfiusTidObligations,
  computeCustomsDutyAndRvc,
  computeCompositeTradeSanctionsRiskIndex,
  generateVsdDossierMarkdown,
  type BeneficialOwnerNodeDTO
} from './domain';
import { tradeSanctionsNexusRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Global Trade, Export Controls & Sanctions Nexus Domain & Repository', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('computes exact Levenshtein and Jaro-Winkler distances for sanctions matching', () => {
    const lev = computeLevenshteinDistance('Huawei Technologies', 'Huawei Technology');
    expect(lev).toBe(3);

    const jw = computeJaroWinklerSimilarity('Vnesheconombank', 'Vnesheconombank RF');
    expect(jw).toBeGreaterThan(0.85);

    const composite = computeSanctionsCompositeScore('Rostec', 'Rostec State Corp');
    expect(composite.compositeScore).toBeGreaterThan(0.70);
  });

  it('correctly executes recursive OFAC 50% Rule aggregation', () => {
    const blockedTree: BeneficialOwnerNodeDTO = {
      id: 'root-1',
      name: 'Holding Alpha',
      country: 'CY',
      isDirectlySanctioned: false,
      ownershipPercentage: 100,
      votingRightsPercentage: 100,
      children: [
        {
          id: 'child-1',
          name: 'Blocked Parent X',
          country: 'RU',
          isDirectlySanctioned: true,
          ownershipPercentage: 30,
          votingRightsPercentage: 30,
          children: []
        },
        {
          id: 'child-2',
          name: 'Blocked Parent Y',
          country: 'RU',
          isDirectlySanctioned: true,
          ownershipPercentage: 25,
          votingRightsPercentage: 25,
          children: []
        }
      ]
    };

    const result = evaluateOfacFiftyPercentRule(blockedTree);
    expect(result.aggregateBlockedPercentage).toBe(55);
    expect(result.isBlockedByLaw).toBe(true);
  });

  it('determines ECCN 5D002 vs 5D992 Mass Market encryption classification', () => {
    const controlled = evaluateEccnEncryptionClassification({
      isSoftware: true,
      symmetricBits: 256,
      asymmetricBits: 2048,
      ellipticBits: 256,
      isMassMarket: false,
      destinationCountry: 'DE'
    });
    expect(controlled.assignedEccn).toBe('5D002.a.1');
    expect(controlled.exception).toBe('enc_740_17_b1');
    expect(controlled.requiresReporting).toBe(true);

    const massMarket = evaluateEccnEncryptionClassification({
      isSoftware: true,
      symmetricBits: 256,
      asymmetricBits: 2048,
      ellipticBits: 256,
      isMassMarket: true,
      destinationCountry: 'DE'
    });
    expect(massMarket.assignedEccn).toBe('5D992.c');
    expect(massMarket.requiresReporting).toBe(false);
  });

  it('calculates deemed export exposure across country groups and technical scope', () => {
    const usCitizen = computeDeemedExportExposure({
      isUsPerson: true,
      countryGroup: 'group_d_1_national_security',
      controlledEccn: '5D002.a.1',
      scope: 'source_code_read'
    });
    expect(usCitizen.score).toBe(0);
    expect(usCitizen.requiresLicense).toBe(false);

    const foreignNational = computeDeemedExportExposure({
      isUsPerson: false,
      countryGroup: 'group_d_1_national_security',
      controlledEccn: '5D002.a.1',
      scope: 'source_code_read'
    });
    expect(foreignNational.score).toBeGreaterThanOrEqual(60);
    expect(foreignNational.requiresLicense).toBe(true);
  });

  it('enforces CFIUS sensitive personal data 1,000,000 threshold and mandatory declaration', () => {
    const mandatoryDeal = evaluateCfiusTidObligations({
      criticalTech: false,
      criticalInfra: false,
      personalDataCount: 1500000,
      militaryTargets: false,
      foreignGovVotingPct: 30,
      foreignAcquisitionPct: 51,
      hasBoardSeat: true,
      hasMaterialNonpublicAccess: true
    });
    expect(mandatoryDeal.sensitiveThresholdExceeded).toBe(true);
    expect(mandatoryDeal.tidStatus).toBe('sensitive_personal_data_d');
    expect(mandatoryDeal.isMandatoryFiling).toBe(true);
    expect(mandatoryDeal.filingType).toBe('mandatory_declaration_part_800');
  });

  it('calculates Section 301 tariff duty and USMCA Regional Value Content', () => {
    const dutyResult = computeCustomsDutyAndRvc({
      customsValueUsd: 100000,
      mfnRatePct: 3.0,
      section301RatePct: 25.0,
      section232RatePct: 0.0,
      totalTransactionValueUsd: 120000,
      netCostUsd: 90000,
      valueNonOriginatingMaterialsUsd: 36000,
      ftaCode: 'usmca'
    });
    expect(dutyResult.rvcTransactionValuePct).toBe(70);
    expect(dutyResult.isFtaQualified).toBe(true);
    expect(dutyResult.ftaSavingsUsd).toBe(3000);
    expect(dutyResult.section301Usd).toBe(25000);
    expect(dutyResult.totalDutyPayableUsd).toBe(25000);
  });

  it('synthesizes composite CTSRI index correctly across tiers', () => {
    const elite = computeCompositeTradeSanctionsRiskIndex(10, 10, 10, 10, 10);
    expect(elite.ctsriScore).toBe(10);
    expect(elite.tier).toBe('tier_1_elite_zero_defect');

    const critical = computeCompositeTradeSanctionsRiskIndex(90, 85, 75, 60, 80);
    expect(critical.ctsriScore).toBeGreaterThan(70);
    expect(critical.tier).toBe('tier_4_critical_board_escalation');
  });

  it('generates compliant VSD markdown report', () => {
    const report = generateVsdDossierMarkdown({
      vsdReferenceNumber: 'VSD-2026-EAR-0091',
      targetAuthority: 'bis_oee',
      title: 'Inadvertent Dual-Use Encryption Source Code Commit Access',
      suspectedRegulationBreach: '15 CFR § 734.13',
      incidentStartDate: '2026-08-01',
      incidentEndDate: '2026-10-15',
      estimatedTransactionsCount: 14,
      estimatedTransactionVolumeUsd: 1250000,
      narrativeSummary: 'Foreign national engineers accessed repository branches.',
      rootCauseAnalysis: 'Git access control permissions failed.',
      remedialActionsImplemented: ['Revoked non-US access']
    });
    expect(report).toContain('VOLUNTARY SELF-DISCLOSURE DOSSIER');
    expect(report).toContain('VSD-2026-EAR-0091');
    expect(report).toContain('BIS_OEE');
  });

  it('operates tradeSanctionsNexusRepository in demo mode with local storage persistence', async () => {
    const overview = await tradeSanctionsNexusRepository.getOverview();
    expect(overview.ctsriScore).toBe(12.5);
    expect(overview.ctsriRiskTier).toBe('tier_1_elite_zero_defect');

    const screenRes = await tradeSanctionsNexusRepository.screenSanctions({
      queryName: 'Vnesheconombank Capital Trust',
      countryCode: 'RU',
      beneficialOwnershipRoot: {
        id: 'node-root',
        name: 'Vnesheconombank Capital Trust',
        country: 'RU',
        isDirectlySanctioned: false,
        ownershipPercentage: 100,
        votingRightsPercentage: 100,
        children: [
          {
            id: 'node-child',
            name: 'VEB Parent',
            country: 'RU',
            isDirectlySanctioned: true,
            sanctionSource: 'ofac_sdn',
            ownershipPercentage: 60,
            votingRightsPercentage: 60,
            children: []
          }
        ]
      }
    });
    expect(screenRes.isBlockedByFiftyPercentRule).toBe(true);
    expect(screenRes.aggregateBlockedOwnership).toBe(60);

    const eccnRes = await tradeSanctionsNexusRepository.classifyEccn({
      itemId: 'item-001',
      itemName: 'SecureMesh Daemon',
      functionalDescription: 'Cryptographic daemon software',
      eccnCandidate: '5D002',
      implementsSymmetricEncryption: true,
      symmetricKeyLengthBits: 256,
      implementsAsymmetricEncryption: true,
      asymmetricKeyLengthBits: 2048,
      implementsEllipticCurve: true,
      ellipticCurveBits: 256,
      isMassMarketRetailAvailable: false,
      isUserModifiableCryptographicArchitecture: false,
      destinationCountry: 'DE'
    });
    expect(eccnRes.assignedEccn).toBe('5D002.a.1');

    const deemedRes = await tradeSanctionsNexusRepository.auditDeemedExport({
      employeeId: 'emp-001',
      employeeName: 'Dr. Dmitry Volkov',
      citizenshipCountry: 'RU',
      isUsPerson: false,
      accessedEccn: '5D002.a.1',
      technicalDataScope: 'source_code_read'
    });
    expect(deemedRes.requiresDeemedExportLicense).toBe(true);

    const cfiusRes = await tradeSanctionsNexusRepository.assessCfius({
      transactionId: 'tx-001',
      targetCompanyName: 'BioTelemetry Health Inc',
      dealValueUsd: 150000000,
      producesCriticalTechnology: false,
      operatesCriticalInfrastructure: false,
      sensitivePersonalDataRecordsCount: 2000000,
      targetsMilitaryOrIntelligencePersonnel: false,
      foreignInvestorCountry: 'SG',
      foreignInvestorOwnershipPercentage: 55,
      foreignInvestorBoardSeats: 2,
      foreignInvestorMaterialNonpublicAccess: true,
      foreignGovernmentVotingPercentage: 30
    });
    expect(cfiusRes.sensitiveDataThresholdExceeded).toBe(true);
    expect(cfiusRes.filingRequirement).toBe('mandatory_declaration_part_800');

    const dutyRes = await tradeSanctionsNexusRepository.calculateLandedDuty({
      partNumber: 'GPU-ACCEL-01',
      description: 'AI Accelerator Board',
      htsCode: '8542.31.0000',
      countryOfOrigin: 'CN',
      exportCountry: 'US',
      customsValueUsd: 500000,
      freightInsuranceUsd: 10000,
      qualifyingFta: 'usmca',
      totalTransactionValueUsd: 600000,
      netCostUsd: 450000,
      valueNonOriginatingMaterialsUsd: 180000
    });
    expect(dutyRes.section301DutyRate).toBe(25.0);
    expect(dutyRes.isFtaOriginQualified).toBe(true);

    const vsdRes = await tradeSanctionsNexusRepository.compileVsdReport({
      vsdReferenceNumber: 'VSD-2026-EAR-0091',
      targetAuthority: 'bis_oee',
      title: 'Inadvertent Dual-Use Encryption Access',
      suspectedRegulationBreach: '15 CFR § 734.13',
      incidentStartDate: '2026-08-01',
      incidentEndDate: '2026-10-15',
      estimatedTransactionsCount: 14,
      estimatedTransactionVolumeUsd: 1250000,
      narrativeSummary: 'Foreign national engineers accessed repository branches.',
      rootCauseAnalysis: 'Git access control permissions failed.',
      remedialActionsImplemented: ['Revoked non-US access']
    });
    expect(vsdRes.status).toBe('draft');

    const sign1 = await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdRes.id,
      role: 'head_of_global_trade_compliance',
      signerName: 'Victoria Price',
      signatureHash: 'sha256:111'
    });
    expect(sign1.totalSignoffs).toBe(1);

    const sign2 = await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdRes.id,
      role: 'chief_legal_officer',
      signerName: 'Alexander Vance',
      signatureHash: 'sha256:222'
    });
    expect(sign2.totalSignoffs).toBe(2);

    const sign3 = await tradeSanctionsNexusRepository.executeSignoff({
      vsdId: vsdRes.id,
      role: 'chief_executive_officer',
      signerName: 'Eleanor Sterling',
      signatureHash: 'sha256:333'
    });
    expect(sign3.totalSignoffs).toBe(3);
    expect(sign3.isFullySigned).toBe(true);
  });
});
