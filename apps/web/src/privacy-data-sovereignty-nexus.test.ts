import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateTransferRiskIndex,
  evaluateStatutorySlaCountdown,
  calculateDpiaResidualRisk,
  calculateDifferentialPrivacyLeakage,
  calculateMultiJurisdictionalFineExposure,
  computeTripartiteSha256Seal,
  validateEvaluateTransferInput,
  validateCreateDsrRequestInput,
  validateTriggerDsrExtensionInput,
  validateCreateRopaActivityInput,
  validateCreateDpiaAssessmentInput,
  validateRegisterAiCorpusInput,
  validateGenerateSyntheticDatasetInput,
  validateSignTripartiteRatificationInput
} from './domain';
import { privacyDataSovereigntyRepository } from './data';

const storageMap = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, value: string) => { storageMap.set(key, String(value)); },
  removeItem: (key: string) => { storageMap.delete(key); },
  clear: () => { storageMap.clear(); },
  get length() { return storageMap.size; },
  key: (index: number) => Array.from(storageMap.keys())[index] ?? null
};

describe('Enterprise Data Privacy, Sovereign AI Governance & Cross-Border Transfer Nexus', () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Pillar A: Cross-Border Data Transfer & Sovereign Risk Radar', () => {
    it('evaluates safe harbor transfer corridors accurately', () => {
      const safe = calculateTransferRiskIndex({
        destinationJurisdictionTier: 'adequacy_recognized',
        transferMechanism: 'adequacy_decision',
        supplementaryTechnicalMeasure: 'eea_sovereign_hsm_encryption',
        dataSensitivityCategory: 'b2b_professional_contacts',
        annualDataSubjectVolume: 5000
      });

      expect(safe.riskTier).toBe('safe_harbor');
      expect(safe.isTransferPermissible).toBe(true);
      expect(safe.transferRiskIndex).toBeLessThanOrEqual(25.0);
    });

    it('evaluates prohibitive transfer corridors under unbounded foreign access', () => {
      const risky = calculateTransferRiskIndex({
        destinationJurisdictionTier: 'authoritarian_unbounded_access',
        transferMechanism: 'article_49_derogation',
        supplementaryTechnicalMeasure: 'cleartext_none',
        dataSensitivityCategory: 'special_category_art_9_10',
        annualDataSubjectVolume: 500000
      });

      expect(risky.riskTier).toBe('prohibitive_unlawful');
      expect(risky.isTransferPermissible).toBe(false);
      expect(risky.transferRiskIndex).toBeGreaterThan(70.0);
    });

    it('validates evaluate transfer input schemas strictly', () => {
      const valid = validateEvaluateTransferInput({
        corridorCode: 'EU-US-DPF',
        originCountry: 'IE',
        destinationCountry: 'US',
        destinationJurisdictionTier: 'elevated_surveillance_fisa702',
        transferMechanism: 'eu_us_dpf_certified',
        legalInstrumentReference: 'EO 14086 & EU-US DPF Adequacy Decision 2023',
        dataSensitivityCategory: 'consumer_pii',
        supplementaryTechnicalMeasure: 'provider_managed_kms',
        annualDataSubjectVolume: 125000
      });
      expect(valid.ok).toBe(true);

      const invalid = validateEvaluateTransferInput({});
      expect(invalid.ok).toBe(false);
    });
  });

  describe('Pillar B: Data Subject Rights (DSR/DSAR) Orchestration & SLA Clocks', () => {
    it('calculates GDPR 30-day countdown and remaining days', () => {
      const gdprNormal = evaluateStatutorySlaCountdown(
        'gdpr_eu',
        '2026-10-01T00:00:00.000Z',
        false,
        undefined,
        '2026-10-10T00:00:00.000Z'
      );
      expect(gdprNormal.totalAllocatedDays).toBe(30);
      expect(gdprNormal.isBreached).toBe(false);
      expect(gdprNormal.isExtensionPermitted).toBe(true);
      expect(gdprNormal.calendarDaysRemaining).toBe(21);
    });

    it('handles Article 12(3) complexity extension up to 90 days', () => {
      const gdprExtended = evaluateStatutorySlaCountdown(
        'gdpr_eu',
        '2026-10-01T00:00:00.000Z',
        true,
        undefined,
        '2026-10-10T00:00:00.000Z'
      );
      expect(gdprExtended.totalAllocatedDays).toBe(90);
      expect(gdprExtended.isExtensionPermitted).toBe(false);
    });

    it('validates create DSR and trigger extension inputs', () => {
      const validDsr = validateCreateDsrRequestInput({
        subjectIdentifier: 'CAND-98741',
        subjectEmail: 'applicant@example.com',
        regulatoryFramework: 'gdpr_eu',
        requestType: 'erasure_deletion',
        identityVerificationMethod: 'enterprise_sso_mfa_oidc'
      });
      expect(validDsr.ok).toBe(true);

      const invalidDsr = validateCreateDsrRequestInput({});
      expect(invalidDsr.ok).toBe(false);

      const validExt = validateTriggerDsrExtensionInput({
        dsrRequestId: 'dsr-101',
        extensionReason: 'Unstructured logs across 12 databases require manual PII scrub'
      });
      expect(validExt.ok).toBe(true);
    });
  });

  describe('Pillar C: Privacy-by-Design DPIA & Article 30 RoPA Studio', () => {
    it('evaluates DPIA residual risk and flags prior consultation when risk exceeds 75', () => {
      const lowRisk = calculateDpiaResidualRisk([
        { likelihood: 1, severity: 2, controlWeight: 1.0 }
      ], 10.0, 0);
      expect(lowRisk.residualRiskScore).toBeLessThanOrEqual(25.0);
      expect(lowRisk.priorConsultationRequired).toBe(false);
      expect(lowRisk.approvalStatus).toBe('approved');

      const severeRisk = calculateDpiaResidualRisk([
        { likelihood: 5, severity: 5, controlWeight: 0.1 },
        { likelihood: 5, severity: 4, controlWeight: 0.1 }
      ], 85.0, 4);
      expect(severeRisk.residualRiskScore).toBeGreaterThan(75.0);
      expect(severeRisk.priorConsultationRequired).toBe(true);
      expect(severeRisk.approvalStatus).toBe('prior_consultation_required');
    });

    it('validates RoPA and DPIA assessment schemas', () => {
      const validRopa = validateCreateRopaActivityInput({
        activityCode: 'ROPA-REC-01',
        name: 'Automated Resume Parsing & Ranking',
        businessUnit: 'Global Talent Acquisition',
        processOwner: 'Head of Talent Intelligence',
        processingPurpose: 'Candidate screening and skill matrix matching',
        gdprArticle6Basis: 'contract_performance',
        gdprArticle9Basis: 'not_applicable',
        dataCategories: ['resume_pdf', 'github_url', 'compensation_history'],
        specialCategoriesPresent: false,
        dataSubjectsCategory: 'job_applicants',
        recipientCategories: ['internal_recruiters', 'hiring_executives'],
        crossBorderTransferInvolved: true,
        retentionPeriodMonths: 24,
        retentionLegalGround: 'National statutory recruitment document retention',
        technicalSecurityMeasures: ['TLS 1.3', 'AES-256 GCM', 'column-level KMS envelope encryption'],
        isDpiaRequired: true
      });
      expect(validRopa.ok).toBe(true);

      const validDpia = validateCreateDpiaAssessmentInput({
        ropaActivityId: 'ropa-001',
        dpiaReference: 'DPIA-2026-004',
        title: 'High-Impact LLM Screening DPIA',
        systematicMonitoringFlag: true,
        largeScaleProcessingFlag: true,
        innovativeTechFlag: true,
        vulnerableSubjectsFlag: false,
        automatedDecisionFlag: true,
        threatItems: [
          {
            threatScenario: 'Model Hallucination and PII Leakage',
            privacyHarmType: 'unauthorized_disclosure',
            likelihoodRating: 3,
            severityRating: 4,
            mitigationControls: 'Differential privacy and output sanitization filters',
            controlWeight: 0.8
          }
        ],
        dpoOpinion: 'Conditional approval with human-in-the-loop oversight'
      });
      expect(validDpia.ok).toBe(true);
    });
  });

  describe('Pillar D: Sovereign AI Training Data Provenance & Synthetic Data Moat', () => {
    it('evaluates differential privacy leakage, utility and MIA advantage', () => {
      const dpRes = calculateDifferentialPrivacyLeakage(0.5, 1e-6, 0.05, 1.0);
      expect(dpRes.isPrivacyPreserving).toBe(true);
      expect(dpRes.wassersteinUtilityScore).toBeGreaterThanOrEqual(80.0);
      expect(dpRes.membershipInferenceAdvantageUpper).toBeLessThan(1.0);
    });

    it('validates AI corpus registration and synthetic dataset inputs', () => {
      const validCorpus = validateRegisterAiCorpusInput({
        corpusIdentifier: 'CORPUS-TALENT-V4',
        datasetName: 'Global Resume Corpus v4',
        originSourceUri: 's3://jobtrack-ai-vault/corpora/talent-v4/',
        collectionJurisdiction: 'EEA & Switzerland',
        legalBasisForTraining: 'legitimate_interests_assessment',
        optOutMechanismSupported: true,
        copyrightLicenseType: 'permissive_commercial_open',
        textDataMiningOptOut: false,
        fairUseFourFactorScore: 88.0,
        piiExtractionRiskScore: 12.5,
        euAiActArticle10Compliant: true,
        totalTokenOrRecordCount: 5000000
      });
      expect(validCorpus.ok).toBe(true);

      const validSynth = validateGenerateSyntheticDatasetInput({
        sourceCorpusId: 'corpus-001',
        datasetCode: 'SYNTH-CAND-2026',
        synthesisAlgorithm: 'dp_diffusion_condensed',
        epsilonBudgetSpent: 0.8,
        deltaBoundParameter: 1e-6,
        noiseMechanism: 'gaussian',
        syntheticRecordCount: 50000,
        storageS3Bucket: 'jobtrack-synthetic-moat',
        storageS3Key: 'datasets/synth-cand-2026.parquet'
      });
      expect(validSynth.ok).toBe(true);
    });
  });

  describe('Pillar E: Boardroom Privacy War Room & Tripartite Ratification Gate', () => {
    it('calculates multi-jurisdictional fine exposure and expected risk-adjusted fine', () => {
      const fines = calculateMultiJurisdictionalFineExposure({
        annualGlobalTurnoverEur: 1000000000,
        intentionalInfractionsCount: 5,
        unintentionalInfractionsCount: 10,
        activeBreachRecordsCount: 10000,
        demonstratedCooperationMitigationCredit: 0.40
      });
      expect(fines.gdprMaxFineEur).toBe(40000000);
      expect(fines.totalConservativeExposureEur).toBeGreaterThan(45000000);
      expect(fines.totalExpectedRiskAdjustedExposureEur).toBeLessThan(fines.totalConservativeExposureEur);
    });

    it('computes cryptographic SHA-256 seal for tripartite ratification', () => {
      const seal = computeTripartiteSha256Seal(
        'CYCLE-2026-Q4',
        18.5,
        14500000,
        'Dr. Hélène Rousseau, DPO',
        'Marcus Sterling, Esq., CPO',
        'Elena Rostova, CEO',
        '2026-10-25T12:00:00.000Z'
      );
      expect(seal).toMatch(/^[a-f0-9]{64}$/);
    });

    it('validates sign tripartite ratification input', () => {
      const validSign = validateSignTripartiteRatificationInput({
        ratificationId: 'ratif-001',
        role: 'data_protection_officer',
        signatoryFullName: 'Dr. Hélène Rousseau, DPO',
        notes: 'GDPR Article 38 independence verified.'
      });
      expect(validSign.ok).toBe(true);

      const invalidSign = validateSignTripartiteRatificationInput({});
      expect(invalidSign.ok).toBe(false);
    });
  });

  describe('Repository Offline Demo Store Parity & Workflow Mutations', () => {
    it('initializes default enterprise state with preloaded demo data', async () => {
      const overview = await privacyDataSovereigntyRepository.getOverview();
      expect(overview.transfers.length).toBeGreaterThan(0);
      expect(overview.pendingDsrRequests.length).toBeGreaterThan(0);
      expect(overview.ropaActivities.length).toBeGreaterThan(0);
      expect(overview.dpiaAssessments.length).toBeGreaterThan(0);
      expect(overview.aiCorpora.length).toBeGreaterThan(0);
      expect(overview.syntheticDatasets.length).toBeGreaterThan(0);
      expect(overview.summary.activeCorridorsCount).toBeGreaterThan(0);
    });

    it('evaluates a new cross-border transfer assessment and updates store', async () => {
      const assessment = await privacyDataSovereigntyRepository.evaluateTransfer({
        corridorCode: 'APAC-TALENT-SG-JP',
        originCountry: 'Singapore',
        destinationCountry: 'Japan',
        destinationJurisdictionTier: 'adequacy_recognized',
        transferMechanism: 'adequacy_decision',
        legalInstrumentReference: 'EU/SG Adequacy Accord',
        dataSensitivityCategory: 'b2b_professional_contacts',
        supplementaryTechnicalMeasure: 'eea_sovereign_hsm_encryption',
        annualDataSubjectVolume: 12000
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.transferRiskIndex).toBeLessThanOrEqual(25.0);

      const overview = await privacyDataSovereigntyRepository.getOverview();
      const found = overview.transfers.find(t => t.id === assessment.id);
      expect(found).toBeDefined();
      expect(found?.corridorCode).toBe('APAC-TALENT-SG-JP');
    });

    it('creates DSR request and triggers complexity extension', async () => {
      const dsr = await privacyDataSovereigntyRepository.createDsrRequest({
        subjectIdentifier: 'CAND-TEST-99',
        subjectEmail: 'candidate.test@example.com',
        regulatoryFramework: 'gdpr_eu',
        requestType: 'access_portability',
        identityVerificationMethod: 'enterprise_sso_mfa_oidc'
      });

      expect(dsr.id).toBeDefined();
      expect(dsr.isExtensionTriggered).toBe(false);
      expect(dsr.statutorySlaDays).toBe(30);

      const extended = await privacyDataSovereigntyRepository.triggerDsrExtension({
        dsrRequestId: dsr.id,
        extensionReason: 'Extensive multi-system forensic search across distributed backup archives'
      });

      expect(extended.isExtensionTriggered).toBe(true);
      expect(extended.status).toBe('extended');
      expect(extended.extendedDeadlineAt).toBeDefined();
    });

    it('registers RoPA and DPIA records in demo store', async () => {
      const ropa = await privacyDataSovereigntyRepository.createRopaActivity({
        activityCode: 'ROPA-TEST-09',
        name: 'Executive Leadership Screening',
        businessUnit: 'Executive Search Practice',
        processOwner: 'Managing Partner',
        processingPurpose: 'Vetting C-suite candidates',
        gdprArticle6Basis: 'legitimate_interests',
        gdprArticle9Basis: 'explicit_consent',
        dataCategories: ['employment_history', 'regulatory_disclosures'],
        specialCategoriesPresent: true,
        dataSubjectsCategory: 'executive_candidates',
        recipientCategories: ['board_search_committee'],
        crossBorderTransferInvolved: false,
        retentionPeriodMonths: 36,
        retentionLegalGround: 'Statutory corporate governance regulations',
        technicalSecurityMeasures: ['AES-256 GCM envelope encryption'],
        isDpiaRequired: true
      });

      expect(ropa.id).toBeDefined();

      const dpia = await privacyDataSovereigntyRepository.createDpiaAssessment({
        ropaActivityId: ropa.id,
        dpiaReference: 'DPIA-EXEC-09',
        title: 'Executive Screening DPIA Assessment',
        systematicMonitoringFlag: false,
        largeScaleProcessingFlag: false,
        innovativeTechFlag: true,
        vulnerableSubjectsFlag: false,
        automatedDecisionFlag: false,
        threatItems: [
          {
            threatScenario: 'Credential Misuse',
            privacyHarmType: 'unauthorized_access',
            likelihoodRating: 2,
            severityRating: 3,
            mitigationControls: 'MFA and audit logging',
            controlWeight: 0.9
          }
        ],
        dpoOpinion: 'Approved with logging'
      });

      expect(dpia.id).toBeDefined();
      expect(dpia.approvalStatus).toBe('approved');
    });

    it('generates synthetic dataset with privacy guarantees and utility trade-off', async () => {
      const synth = await privacyDataSovereigntyRepository.generateSyntheticDataset({
        sourceCorpusId: 'corpus-01',
        datasetCode: 'SYNTH-DEMO-01',
        synthesisAlgorithm: 'dp_diffusion_condensed',
        epsilonBudgetSpent: 0.75,
        deltaBoundParameter: 1e-6,
        noiseMechanism: 'gaussian',
        syntheticRecordCount: 30000,
        storageS3Bucket: 'jobtrack-synthetic-moat',
        storageS3Key: 'datasets/demo-01.parquet'
      });

      expect(synth.id).toBeDefined();
      expect(synth.differentialPrivacyCertified).toBe(true);
      expect(synth.wassersteinUtilityScore).toBeGreaterThanOrEqual(80.0);
    });

    it('completes tripartite sign-off and seals the war room posture', async () => {
      const dpoSign = await privacyDataSovereigntyRepository.signRatification({
        ratificationId: 'demo-ratif',
        role: 'data_protection_officer',
        signatoryFullName: 'Dr. Elena Vance, DPO',
        notes: 'GDPR Article 38 independence verified.'
      });
      expect(dpoSign.dpoSignedAt).toBeDefined();
      expect(dpoSign.ratificationStatus).toBe('pending_cpo');

      const cpoSign = await privacyDataSovereigntyRepository.signRatification({
        ratificationId: 'demo-ratif',
        role: 'chief_privacy_officer',
        signatoryFullName: 'Marcus Vance, Esq., CPO',
        notes: 'Sovereign transfer mechanisms validated.'
      });
      expect(cpoSign.cpoSignedAt).toBeDefined();
      expect(cpoSign.ratificationStatus).toBe('pending_ceo');

      const ceoSign = await privacyDataSovereigntyRepository.signRatification({
        ratificationId: 'demo-ratif',
        role: 'chief_executive_officer',
        signatoryFullName: 'Victoria Vance, CEO',
        notes: 'Board of Directors ratification authorized.'
      });
      expect(ceoSign.ceoSignedAt).toBeDefined();
      expect(ceoSign.ratificationStatus).toBe('fully_ratified');
      expect(ceoSign.tripartiteSealSha256).toMatch(/^[a-f0-9]{64}$/);
    });

    it('resets demo store to initial state', async () => {
      const overview = await privacyDataSovereigntyRepository.resetDemo();
      expect(overview.transfers.length).toBe(4);
      expect(overview.pendingDsrRequests.length).toBe(3);
      expect(overview.ropaActivities.length).toBe(3);
      expect(overview.dpiaAssessments.length).toBe(2);
      expect(overview.aiCorpora.length).toBe(2);
    });
  });
});
