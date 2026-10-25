import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidCalendarDate,
  isValidIsoInstant,
  isValidIanaTimezone,
  resolveLocalTime,
  normalizeIdentityKey,
  normalizeUrl,
  canonicalIntentHash,
  validateApplicationInput,
  validateInterviewInput,
  validateListQuery,
  wireApplicationToUI,
  uiDraftToWireMutation,
  sanitizeForCsv,
  formatAsCsv,
  parseVietnameseCurrency,
  BUILT_IN_TEMPLATES,
  PRO_ORDER_STATUSES,
  isProOrderStatus,
  type ApplicationWireDTO,
  type ProPlan,
  type ProOrderDTO,
  type ProPlanDTO,
  type CandidateProfileWireDTO,
  type CandidateProfileMutationInput,
  type AtsMatchResultDTO,
  type CoverLetterResultDTO,
  type JobSubscriptionDTO,
  type CrawlRunResultDTO,
  validateCandidateProfileInput,
  generateIcsCalendar,
  escapeIcsText,
  formatApplicationsAsCsv,
  deriveActivityTimeline,
  validateBulkStatusInput,
  validateBulkTrashInput,
  detectDomainTrack,
  detectRoleLevel,
  generateInterviewQuestions,
  evaluateStarAnswer,
  validateInterviewPrepInput,
  validateInterviewEvaluateInput,
  parseApplicationsFromCsv,
  validateCsvImportRequest,
  neutralizeFormula,
  calculateAnnualTotalCompensation,
  evaluateOfferDetails,
  compareOffers,
  generateCounterOfferScript,
  validateOfferEvaluationInput,
  validateOfferComparisonInput,
  validateCounterOfferInput,
  validateCheckoutInput,
  validateSimulateWebhookInput,
  validateAnalyticsQuery,
  validateApplicationGoalInput,
  filterApplicationsByTimeframe,
  calculateFunnelMetrics,
  calculateVelocityMetrics,
  calculateSourceMetrics,
  findStaleApplications,
  calculateGoalProgress,
  calculateAnalyticsSummary,
  validateResumeInput,
  validateResumeTailorInput,
  calculateResumeAtsScore,
  generateResumeDiff,
  tailorResumeForJob,
  calculateCompanyAggregates,
  validateCompanyReviewInput,
  synthesizeCompanyIntelligence,
  calculateFollowUpCadence,
  generateFollowUpEmail,
  validateFollowUpLogInput,
  DEFAULT_FOLLOW_UP_TEMPLATES,
  validateContactInput,
  validateInteractionInput,
  calculateRelationshipHealth,
  deriveRecommendedReconnectDays,
  calculateStageSla,
  validatePipelineMetadataInput,
  type ContactDTO,
  DECISION_DIMENSIONS,
  DIMENSION_METADATA,
  DEFAULT_WEIGHT_PROFILE,
  normalizeWeights,
  calculateCompositeScore,
  evaluateDecisionMatrix,
  validateWeightsInput,
  validateScorecardInput,
  validateChatInput,
  parseChatMarkdown,
  DEFAULT_SUGGESTED_CHAT_PROMPTS,
  extractSkillsFromText,
  extractSkillsFromApplications,
  generateCareerRoadmap,
  calculateRoadmapProgress,
  validateMilestoneUpdateInput,
  validateRoadmapGenerateInput,
  KNOWN_SKILL_CATALOG,
  detectEmailCategory,
  extractMeetingLink,
  extractCompany,
  extractPosition,
  extractRecruiter,
  extractInterviewDateTime,
  parseEmailContent,
  generateIngestionProposal,
  validateEmailParseInput,
  validateEmailApplyInput,
  generateOutreachSequence,
  personalizeMessage,
  computeCampaignMetrics,
  validateCreateCampaignInput,
  validateUpdateRecipientStepInput,
  type OutreachRecipientDTO,
  generateSimulationQuestions,
  evaluateSimulationTurn,
  synthesizeSessionReport,
  validateStartSimulationInput,
  validateSubmitTurnInput,
  generateVerificationFingerprint,
  synthesizePublicDossier,
  verifyDossierIntegrity,
  validatePortfolioConfigInput,
  validateGenerateTokenInput,
  type PortfolioConfigDTO,
  computeVestingSchedule,
  calculateNetTakeHomeVnd,
  forecastCompensationScenarios,
  evaluateMarketBenchmark,
  deriveNegotiationLeveragePoints,
  validateCreateCompensationForecastInput,
  type EquityGrantDTO,
  type CompensationPackageDTO,
  PROMOTION_DIMENSION_METADATA,
  recommendPromotionInitiatives,
  evaluatePromotionReadiness,
  simulateCareerTrajectory,
  validateSimulateTrajectoryInput,
  validateUpdateCompetenciesInput,
  ATS_KEYWORD_DICTIONARY,
  extractKeywordsFromText,
  extractBulletsFromResume,
  diagnoseAtsKeywordGaps,
  rewriteBulletPointsXyz,
  synthesizeOptimizedResume,
  validateOptimizeResumeInput,
  validateRewriteBulletInput,
  computeStageConversionMetrics,
  detectPipelineBottlenecks,
  calculateVelocityTargets,
  simulatePipelineOutcomes,
  validateCalculateVelocityReportInput,
  evaluateCompanyCulture,
  computeCultureCompatibility,
  generateReverseInterviewQuestions,
  validateAnalyzeCultureInput,
  parseInboundRecruiterPitch,
  generateRecruiterReplyDraft,
  computeRecruiterRelationshipHealth,
  detectMandateConflict,
  validateParsePitchInput,
  validateRecruiterLeadInput,
  validateMandateInput,
  validateRecruiterReplyDraftInput,
  KNOWN_HEADHUNTER_AGENCIES,
  SYSTEM_DESIGN_SCENARIOS,
  calculateCapacityEstimates,
  evaluateSystemArchitecture,
  exportBlueprintToMarkdown,
  validateCapacityInput,
  validateSystemDesignSessionInput,
  validateSystemDesignBlueprintInput,
  calculateDilutionPipeline,
  resolveLiquidationWaterfall,
  evaluateWaterfallMatrix,
  computeExerciseCostAndTax,
  compareExecutiveEquityPackages,
  exportEquityModelToMarkdown,
  validateEquityGrantInput,
  validateEquityModelMutationInput,
  type CapTableSnapshotDTO,
  type DilutionRoundDTO,
  type ExecutiveEquityGrantDTO,
  type EquityModelDTO,
  calculateBackchannelProbability,
  compute360CoverageMatrix,
  computeAuditVulnerabilityIndex,
  generateRefereeBriefingPacketMarkdown,
  validateReferenceAdvocateInput,
  validateBackchannelAuditInput,
  type ReferenceAdvocateDTO,
  type TargetStakeholderNodeDTO,
  computeNonCompeteSubScore,
  computeIpAssignmentSubScore,
  computeSeveranceSubScore,
  computeChangeOfControlSubScore,
  computeIndemnificationSubScore,
  evaluateExecutiveContract,
  generateSynthesizedRedlines,
  generateExhibitAMarkdown,
  generateExecutiveAddendumMarkdown,
  validateExecutiveContractInput,
  validatePriorInventionInput,
  validateContractRedlineInput,
  type ExecutiveContractDTO,
  type PriorInventionItemDTO,
  type ContractRedlineDTO,
  computeStakeholderRelationshipIndex,
  computeDiagnosticHealthIndex,
  createDefaultExecutiveDiagnostics,
  computeTransitionMomentum,
  generateExecutiveMemoMarkdown,
  validateExecutiveOnboardingPlanInput,
  validateStakeholderInput,
  validateMilestoneInput,
  validateDiagnosticsInput,
  type StakeholderDTO,
  type OnboardingMilestoneDTO,
  type ExecutiveOnboardingPlanDTO,
  getFastEquityBenchmark,
  computeRetainedEquity,
  computeFastEquityDilutionModel,
  evaluateConflictOfInterest,
  computeGovernanceQuotient,
  generateOutsideBoardWaiverLetter,
  generateBoardDossierMarkdown,
  validateBoardMandateInput,
  validateGovernanceMatrixInput,
  type BoardMandateDTO,
  type GovernanceMatrixDTO,
  computeSeveranceAudit,
  computeCicWaterfall,
  compute280GTax,
  computeExecutiveLeverageIndex,
  generateExecutiveCounterMemoMarkdown,
  validateSeveranceCaseInput,
  validateGoodReasonEventInput,
  type ExecutiveSeveranceCaseDTO,
  type SeveranceAuditParams,
  type CicWaterfallParams,
  type Tax280GParams,
  calculateTechnicalDebtRatio,
  calculateSpofCriticalityIndex,
  calculateScalabilityHorizon,
  calculateOpenSourceContagionScore,
  calculateCloudGrossMargin,
  calculateSecurityComplianceIndex,
  calculateSpecialEscrowHoldback,
  calculateEngineeringVelocityQuotient,
  calculateBusFactorVulnerability,
  calculateCompositeRagScorecard,
  determineTransactionRecommendation,
  generateTechnicalDueDiligenceMemoMarkdown,
  validateDueDiligenceAuditInput,
  validateDiligenceFindingInput,
  type TechnicalDueDiligenceAuditDTO,
  type TechnicalDueDiligenceMutationDTO,
  calculateTeamCognitiveLoadIndex,
  calculateSpanHealth,
  calculateConwayAlignmentScore,
  calculateReorgDisruptionRisk,
  calculateFullyBurdenedCost,
  validateTeamTopologyInput,
  validateReorgScenarioInput,
  generateReorgExecutiveMemoMarkdown,
  type TeamTopologyDTO,
  type ReorgScenarioDTO,
  calculateValueStreamLeadTimeAndFlowEfficiency,
  classifyFlowHealthStatus,
  calculateStrategicAlignmentIndex,
  classifyDoraTier,
  computeNormalizedDoraScore,
  calculateDoraMetricsSnapshot,
  calculateFlowMetricsSnapshot,
  calculateCapitalizedProjectLabor,
  calculateRdInvestmentSizingSummary,
  classifyDeliveryHealthBand,
  calculateCompositeDeliveryHealthIndex,
  validateValueStreamInput,
  validateStrategicOkrInput,
  validateDoraCalculationInput,
  validateFlowSimulationInput,
  validateCapitalizedProjectInput,
  validateBoardMemoGenerateInput,
  generateBoardQbrMemorandumMarkdown,
  type ValueStreamDTO,
  type BoardMemorandumDTO,
  classifyFinOpsEfficiencyBand,
  classifyFinOpsMaturityStage,
  calculateCostPerTenantMetrics,
  calculateCommitmentNpv,
  detectCostAnomaly,
  calculateCarbonFootprint,
  calculateK8sRightsizing,
  calculateGravitonMigrationRoi,
  calculateCompositeFinOpsScore,
  generateCfoBoardMemorandumMarkdown,
  validateTenantAllocationInput,
  validateCommitmentInput,
  validateCommitmentPurchaseSimulationInput,
  validateAnomalyDetectionInput,
  validateIdleWasteRemediationInput,
  validateKubernetesRightsizingInput,
  validateCfoMemoGenerateInput,
  type CfoMemorandumDTO,
  classifyAiGovernanceBand,
  classifyEuAiActRiskTier,
  calculateLeaderboardScore,
  calculatePromptCachingEfficiency,
  calculateCascadeArbitrage,
  maskSensitivePiiTokens,
  calculateRagRetrievalMetrics,
  calculateCompositeAiGovernanceScore,
  generateExecutiveAiBoardMemorandumMarkdown,
  validateLlmEvaluationInput,
  validateCascadeSimulationInput,
  validateGuardrailThresholds,
  validateVectorIndexConfig,
  validateAiBoardMemoGenerateInput,
  type ExecutiveAiBoardMemorandumDTO,
  type PiiMaskingRuleDTO,
  classifyNineBox,
  calculateNineBoxScore,
  calculateCalibrationDistribution,
  calculateKeyPersonRiskIndex,
  calculateFlightRisk,
  evaluateRetentionInterventionTriggers,
  calculateBenchDepthMetrics,
  calculateCompetencyGap,
  generateDevelopmentMilestones,
  calculateSuccessionHealthScore,
  generateBoardSuccessionMemorandumMarkdown,
  validateTalentProfileInput,
  validateRetentionInterventionInput,
  validateCriticalRoleInput,
  validateSuccessorCandidateInput,
  validateExecutiveDevelopmentPlanInput,
  validateSuccessionPlanInput,
  validateSignOffInput,
  type SuccessionPlanDTO,
  type TalentProfileDTO,
  type CyberRiskScenarioDTO,
  type ThreatVulnerabilityDTO,
  type DarkWebExposureDTO,
  type ComplianceControlDTO,
  type TabletopSimulationDTO,
  type BoardCyberMemorandumDTO,
  calculateFairRiskMetrics,
  calculateVulnerabilityPriority,
  calculateAttackSurfaceRating,
  calculateDarkWebExposureIndex,
  calculateNistComplianceMetrics,
  calculateTabletopResilience,
  determineSecMateriality,
  calculateCompositeSecurityScore,
  generateBoardCyberMemorandumMarkdown,
  validateCyberRiskScenarioInput,
  validateThreatVulnerabilityInput,
  validateDarkWebExposureInput,
  validateComplianceControlInput,
  validateTabletopSimulationInput,
  validateGovernanceSignOffInput,
  validateMaterialityDeterminationInput,
  type GhgCarbonInventoryDTO,
  type TcfdScenarioModelDTO,
  type DoubleMaterialityMatrixDTO,
  type Scope3SupplyChainOverviewDTO,
  type SecComplianceOverviewDTO,
  type ExecutiveEsgBoardMemorandumDTO,
  type EsgStudioOverviewDTO,
  classifyEsgGovernanceBand,
  classifySbtiAlignment,
  classifyDoubleMateriality,
  calculateGhgGrossAndNetEmissions,
  calculateCarbonIntensities,
  calculateTcfdFinancialExposure,
  calculateDoubleMaterialityScores,
  calculateSbtiTrajectoryVariance,
  calculateSupplierDecarbonizationImpact,
  calculateGreenwashingExposureIndex,
  calculateCompositeEsgGovernanceScore,
  generateExecutiveEsgBoardMemorandumMarkdown,
  validateRecordCarbonEmissionsInput,
  validateTcfdSimulationInput,
  validateMaterialityTopicUpdate,
  validateSupplierSimulationInput,
  validateEsgBoardMemoGenerateInput,
  validateEsgSignOffInput,
  calculateHerfindahlHirschmanIndex,
  calculateDualSourcingRatio,
  calculateSafetyStock,
  calculateReorderPoint,
  calculateDaysOfInventoryOutstanding,
  calculateResilienceDeficit,
  calculateTotalLandedCost,
  calculateCompositeScri,
  determineCrisisSeverityBand,
  generateExecutiveSupplyChainMemorandum,
  validateSupplierBomNodeInput,
  validateDisruptionSimulationInput,
  validateHubComparisonInput,
  validateSupplyChainBoardMemoGenerateInput,
  validateSupplyChainSignoffInput,
  calculateCompaRatio,
  calculateRangePenetration,
  evaluateSalaryCircleStatus,
  adjustSalaryForPurchasingPowerParity,
  calculateDilutionOverhang,
  calculateShareBurnRate,
  simulateRelativeTsrMonteCarlo,
  calculateSection83bTaxArbitrage,
  calculateIsoAlternativeMinimumTaxPreference,
  calculateCrossBorderTrailingTaxAllocation,
  solveMultivariatePayEquityRegression,
  calculateRemediationBudget,
  calculateTotalRewardsAlignmentIndex,
  assessSayOnPayShareholderRisk,
  generateSecItem402CdaMemorandum,
  validateSalaryBandGradeInput,
  validateRelativeTsrSimulationInput,
  validateSection83bArbitrageInput,
  validateGenerateCdaBoardMemoInput,
  validateSignoffCdaBoardMemoInput,
  type TotalRewardsStudioOverviewDTO,
  calculateCashConversionCycle,
  calculateIntercompanyLoanInterest,
  calculateNotionalPoolArbitrage,
  calculateParametricFxVaR95,
  calculateHedgeEffectivenessRatio,
  calculateImpliedDefaultProbability,
  simulateBankBailInHaircut,
  calculateCompositeTrlsScore,
  generateTreasuryBoardMemorandumMarkdown,
  validateBankAccountInput,
  validateWorkingCapitalSimulationInput,
  validateFxSimulationInput,
  validateBailInStressInput,
  validateGenerateTreasuryBoardMemoInput,
  validateSignoffTreasuryBoardMemoInput,
  type CorporateTreasuryOverviewDTO,
  type BankCounterpartyDTO,
  calculateResidualRisk,
  calculateSodSeverityIndex,
  calculateDeficiencyImpactWeight,
  calculateAuditRiskHealthScore,
  generateRiskHeatmapMatrix,
  generateSecItem9AMemoMarkdown,
  validateSoxControlInput,
  validateEnterpriseRiskInput,
  validateCcmEventInput,
  validateWhistleblowerReportInput,
  validateRemediationPlanInput,
  validateTripartiteSignOffInput,
  type SoxInternalControlDTO,
  type EnterpriseRiskDTO,
  type CcmAuditEventDTO,
  type WhistleblowerReportDTO,
  type RemediationActionPlanDTO,
  type SoxAuditCertificationDTO,
  type AuditRiskHealthScoreDTO,
  calculatePQDI,
  calculateCRDI,
  assessASC450Contingency,
  calculateLRCI,
  generateSecItem103Disclosure,
  validateLegalEntityInput,
  validateMaterialContractInput,
  validateLitigationMatterInput,
  validateLegalHoldInput,
  validateBoardSignoffInput,
  type LegalEntityDTO,
  type IPAssetDTO,
  type MaterialContractDTO,
  type LitigationMatterDTO,
  type CustodianLegalHoldDTO,
  type OutsideCounselInvoiceDTO,
  type LegalBoardMemorandumDTO,
  type LegalOperationsOverviewDTO,
  calculateAVIS,
  calculateWACC,
  calculateEPSAccretionDilution,
  calculateRule10b18DailyLimit,
  calculateISI,
  generateSecForm8KDisclosure,
  validateShareholderInput as validateIrShareholderInput,
  validateConsensusGuidanceInput as validateIrConsensusGuidanceInput,
  validateNdrMeetingInput as validateIrNdrMeetingInput,
  validateCapitalFinancingInput as validateIrCapitalFinancingInput,
  validateForm8KSignoffInput as validateIrForm8KSignoffInput,
  type InvestorRelationsOverviewDTO,
  type GenerateForm8KRequestDTO,
  calculateStrategicFitScore,
  calculateDcfValuation,
  calculateLboReturns,
  calculateSynergyNpv,
  calculateAsc805PurchasePriceAllocation,
  calculateFloatingCollarExchangeRatio,
  calculateAntitrustSecondRequestRisk,
  calculateDspiScore,
  generateForm8KDisclosures,
  validateCorpDevTargetInput,
  validateVdrFindingInput,
  validateDcfSimulationInput,
  validateLboSimulationInput,
  validateSynergiesSimulationInput,
  validateCollarSimulationInput,
  validateAntitrustAssessmentInput,
  validateTalentRetentionInput,
  validateCorpDevSignoffInput,
  computeLevenshteinDistance,
  computeJaroWinklerSimilarity,
  computeSimplePhoneticHash,
  computeSanctionsCompositeScore,
  calculateAggregateBlockedOwnership,
  evaluateOfacFiftyPercentRule,
  computeSecondarySanctionsExposureIndex,
  evaluateEccnEncryptionClassification,
  computeDeemedExportExposure,
  evaluateCfiusTidObligations,
  computeCustomsDutyAndRvc,
  computeCompositeTradeSanctionsRiskIndex,
  generateVsdDossierMarkdown,
  validateSanctionsScreeningInput,
  validateEccnClassificationInput,
  validateDeemedExportAuditInput,
  validateCfiusAssessmentInput,
  validateCustomsDutyInput,
  validateCompileVsdInput,
  validateExecuteSignoffInput,
  type BeneficialOwnerNodeDTO,
  calculateNetSentimentScore,
  calculateNarrativeVelocityIndex,
  calculateViralPropagationVector,
  calculateBrandReputationResilienceIndex,
  compileOmnichannelHoldingStatement,
  evaluateQaBridgeTransition,
  validateCreateCrisisIncidentInput,
  validateCreateHoldingStatementInput,
  validateRecordVerifiedFactInput,
  validateRecordQaBridgeItemInput,
  validateSubmitTripartiteSignoffInput,
  calculateWolfpackCoordinationIndex,
  calculateActivistVulnerabilityScore,
  calculatePoisonPillDilution,
  simulateUniversalProxyContest,
  calculateSettleVsFightValue,
  validateCreateActivistCampaignInput,
  validateRegisterWolfpackAccumulationInput,
  validateDeployRightsPlanInput,
  validateRecordNomineeComparisonInput,
  validateSubmitActivismSignoffInput,
  calculateHhiConcentration,
  calculateDeltaHhi,
  evaluateHhiPresumption,
  calculateGuppi,
  calculateRegulatoryClearanceRiskScore,
  calculateRemedyDefensibilityIndex,
  calculateHsrStatutoryFee,
  evaluateHsrStatutoryThresholds,
  computeRatificationHash,
  validateCreateMergerTransactionInput,
  validateDefineMarketInput,
  validateProposeDivestiturePackageInput,
  validateSubmitAntitrustSignoffInput,
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
} from './index.ts';

test('contract: calendar date checks correctly validate days and leap years', () => {
  // Valid dates
  assert.equal(isValidCalendarDate('2024-02-29'), true, '2024 is a leap year');
  assert.equal(isValidCalendarDate('2000-02-29'), true, '2000 is a leap year (divisible by 400)');
  assert.equal(isValidCalendarDate('2026-02-28'), true, '2026-02-28 is valid');
  assert.equal(isValidCalendarDate('2026-10-19'), true, '2026-10-19 is valid');
  assert.equal(isValidCalendarDate('2026-12-31'), true, '2026-12-31 is valid');

  // Invalid dates
  assert.equal(isValidCalendarDate('2026-02-29'), false, '2026 is NOT a leap year');
  assert.equal(isValidCalendarDate('1900-02-29'), false, '1900 is NOT a leap year (century rule)');
  assert.equal(isValidCalendarDate('2026-02-30'), false, 'February never has 30 days');
  assert.equal(isValidCalendarDate('2026-04-31'), false, 'April has only 30 days');
  assert.equal(isValidCalendarDate('2026-06-31'), false, 'June has only 30 days');
  assert.equal(isValidCalendarDate('2026-09-31'), false, 'September has only 30 days');
  assert.equal(isValidCalendarDate('2026-11-31'), false, 'November has only 30 days');
  assert.equal(isValidCalendarDate('2026-13-01'), false, 'Month 13 does not exist');
  assert.equal(isValidCalendarDate('invalid'), false);
});

test('contract: ISO instant validation enforces calendar bounds and formats', () => {
  // Valid instants
  assert.equal(isValidIsoInstant('2026-10-20T04:00:00Z'), true);
  assert.equal(isValidIsoInstant('2026-10-20T11:00:00+07:00'), true);
  assert.equal(isValidIsoInstant('2024-02-29T23:59:59.999Z'), true);

  // Invalid instants
  assert.equal(isValidIsoInstant('2026-02-30T04:00:00Z'), false, 'Rejects invalid calendar date in instant');
  assert.equal(isValidIsoInstant('2026-10-20 04:00:00Z'), false, 'Missing T');
  assert.equal(isValidIsoInstant('2026-10-20T25:00:00Z'), false, 'Hour 25 is invalid');
  assert.equal(isValidIsoInstant('2026-10-20T04:60:00Z'), false, 'Minute 60 is invalid');
  assert.equal(isValidIsoInstant('2026-10-20T04:00:00+25:00'), false, 'Offset +25 is invalid');
  assert.equal(isValidIsoInstant('not-an-instant'), false);
});

test('contract: IANA timezone validation rejects raw offsets', () => {
  // Valid IANA / UTC zones
  assert.equal(isValidIanaTimezone('Asia/Ho_Chi_Minh'), true);
  assert.equal(isValidIanaTimezone('UTC'), true);
  assert.equal(isValidIanaTimezone('Etc/UTC'), true);
  assert.equal(isValidIanaTimezone('America/New_York'), true);
  assert.equal(isValidIanaTimezone('Europe/Paris'), true);

  // Invalid: raw offsets
  assert.equal(isValidIanaTimezone('+07:00'), false);
  assert.equal(isValidIanaTimezone('-05:00'), false);
  assert.equal(isValidIanaTimezone('+00:00'), false);
  assert.equal(isValidIanaTimezone('GMT+7'), false);
  assert.equal(isValidIanaTimezone('UTC+7'), false);
  assert.equal(isValidIanaTimezone('Nonexistent/Timezone'), false);
  assert.equal(isValidIanaTimezone(''), false);
});

test('contract: Unicode NFKC normalization and byte bounds', () => {
  // NFKC canonical equivalence
  const unnormalized = 'C\u0061\u0300fe\u0301'; // Decomposed Café
  const { normalized } = normalizeIdentityKey(unnormalized);
  assert.ok(normalized);
  assert.equal(normalized, unnormalized.normalize('NFKC').toLocaleLowerCase('und'));

  // Max 256 bytes check
  const longKey = 'a'.repeat(257);
  const tooLong = normalizeIdentityKey(longKey);
  assert.ok(tooLong.error);

  // URL normalization
  const sampleUrl = 'https://Example.com/jobs/42?utm_source=twitter&fbclid=1234&id=99#apply';
  const urlRes = normalizeUrl(sampleUrl);
  assert.equal(urlRes.normalized, 'https://example.com/jobs/42?id=99');

  const tooLongUrl = 'https://example.com/' + 'x'.repeat(2100);
  assert.ok(normalizeUrl(tooLongUrl).error);
});

test('contract: unknown fields are strictly rejected with 422 error details', () => {
  const invalidApp = {
    company: 'Google',
    position: 'Engineer',
    maliciousField: 'payload',
    extraProperty: 123
  };

  const res = validateApplicationInput(invalidApp);
  assert.equal(res.ok, false);
  assert.equal(res.message, 'Yêu cầu chứa trường không được hỗ trợ.');
  assert.ok(res.errors['maliciousField']);
  assert.ok(res.errors['extraProperty']);

  const invalidInterview = {
    title: 'Round 1',
    at: '2026-10-20T10:00:00Z',
    timezone: 'Asia/Ho_Chi_Minh',
    format: 'Online',
    unexpectedRoundField: 'bad'
  };

  const intRes = validateInterviewInput(invalidInterview);
  assert.equal(intRes.ok, false);
  assert.ok(intRes.errors['unexpectedRoundField']);
});

test('contract: deadline requires nextAction', () => {
  const missingAction = {
    company: 'Test Corp',
    position: 'Dev',
    deadline: '2026-10-25T17:00:00Z',
    nextAction: ''
  };

  const res = validateApplicationInput(missingAction);
  assert.equal(res.ok, false);
  assert.ok(res.errors.nextAction);
});

test('contract: query parameter validation enforces sort and status allowlists', () => {
  const valid = validateListQuery({ q: 'engineer', status: 'Offer', sort: 'appliedAt:desc' });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.q, 'engineer');
    assert.equal(valid.data.status, 'Offer');
    assert.equal(valid.data.sort, 'appliedAt:desc');
  }

  const badSort = validateListQuery({ sort: 'salary:desc' as any });
  assert.equal(badSort.ok, false);
  assert.ok(badSort.errors.sort);

  const unknownQuery = validateListQuery({ hack: 'inject' });
  assert.equal(unknownQuery.ok, false);
  assert.ok(unknownQuery.errors.hack);

  const queryWithDeleted = validateListQuery({ includeDeleted: 'true' });
  assert.equal(queryWithDeleted.ok, true);
  if (queryWithDeleted.ok) {
    assert.equal(queryWithDeleted.data.includeDeleted, true);
  }

  const queryBadDeleted = validateListQuery({ includeDeleted: 'maybe' });
  assert.equal(queryBadDeleted.ok, false);
  assert.ok(queryBadDeleted.errors.includeDeleted);
});

test('contract: canonical intent hashing is key-order independent and deterministic', () => {
  const inputA = { company: 'Acme', position: 'SRE', url: 'https://acme.com', appliedAt: '2026-10-19' };
  const inputB = { position: 'SRE', appliedAt: '2026-10-19', company: 'Acme', url: 'https://acme.com' };

  const hashA = canonicalIntentHash('applications:create', inputA, { ifMatch: '"app:1:v1"' });
  const hashB = canonicalIntentHash('applications:create', inputB, { ifMatch: '"app:1:v1"' });

  assert.equal(Buffer.from(hashA).toString('hex'), Buffer.from(hashB).toString('hex'));

  // Different precondition produces different hash
  const hashC = canonicalIntentHash('applications:create', inputA, { ifMatch: '"app:1:v2"' });
  assert.notEqual(Buffer.from(hashA).toString('hex'), Buffer.from(hashC).toString('hex'));
});

test('contract: wire <-> UI adapter maps nulls to empty strings and vice versa', () => {
  const wire: ApplicationWireDTO = {
    id: '00000000-0000-4000-8000-000000000001',
    version: 3,
    company: 'TechCorp',
    position: 'Architect',
    url: null,
    normalizedUrl: null,
    source: null,
    sourceNormalized: null,
    jobCode: null,
    jobCodeNormalized: null,
    location: null,
    workMode: null,
    appliedAt: null,
    salary: null,
    notes: null,
    nextAction: null,
    deadline: null,
    status: 'Saved',
    deletedAt: '2026-10-19T10:00:00Z',
    createdAt: '2026-10-19T10:00:00Z',
    updatedAt: '2026-10-19T10:00:00Z',
    interviews: []
  };

  const ui = wireApplicationToUI(wire);
  assert.equal(ui.company, 'TechCorp');
  assert.equal(ui.version, 3);
  assert.equal(ui.deadline, '');
  assert.equal(ui.url, '');
  assert.equal(ui.notes, '');
  assert.equal(ui.deletedAt, '2026-10-19T10:00:00Z');

  const mutation = uiDraftToWireMutation({
    company: 'TechCorp',
    position: 'Architect',
    deadline: '',
    url: ''
  });
  assert.equal(mutation.deadline, null);
  assert.equal(mutation.url, null);
});

test('contract: CSV sanitization prevents formula injection and escapes special characters', () => {
  // Formula injection attempts
  assert.equal(sanitizeForCsv('=1+1'), "'=1+1");
  assert.equal(sanitizeForCsv('+SUM(A1:A10)'), "'+SUM(A1:A10)");
  assert.equal(sanitizeForCsv('-200'), "'-200");
  assert.equal(sanitizeForCsv('@cmd'), "'@cmd");
  assert.equal(sanitizeForCsv('\tcmd'), "'\tcmd");

  // Normal strings & numbers
  assert.equal(sanitizeForCsv('Kỹ sư cầu nối'), 'Kỹ sư cầu nối');
  assert.equal(sanitizeForCsv(123456), '123456');
  assert.equal(sanitizeForCsv(null), '');
  assert.equal(sanitizeForCsv(undefined), '');

  // Quotes and commas
  assert.equal(sanitizeForCsv('Hà Nội, Việt Nam'), '"Hà Nội, Việt Nam"');
  assert.equal(sanitizeForCsv('Công ty "ABC"'), '"Công ty ""ABC"""');
  assert.equal(sanitizeForCsv('Dòng 1\nDòng 2'), '"Dòng 1\nDòng 2"');
});

test('contract: formatAsCsv outputs UTF-8 BOM and structured tabular lines', () => {
  const headers = [
    { key: 'name', label: 'Tên' },
    { key: 'price', label: 'Giá' }
  ];
  const rows = [
    { name: 'Sản phẩm A', price: '15.000.000 đ' },
    { name: '=DangerousFormula', price: '20000000' }
  ];

  const csv = formatAsCsv(headers, rows);
  assert.ok(csv.startsWith('\uFEFF'), 'CSV must start with UTF-8 BOM for Windows Excel compatibility');
  assert.ok(csv.includes('Tên,Giá'));
  assert.ok(csv.includes('Sản phẩm A,15.000.000 đ'));
  assert.ok(csv.includes("'=DangerousFormula"));
});

test('contract: parseVietnameseCurrency accurately normalizes multiple notations', () => {
  // Tỷ
  const ty = parseVietnameseCurrency('1,2 tỷ');
  assert.equal(ty.amount, 1200000000);
  assert.equal(ty.currency, 'VND');

  // Triệu
  const trieu = parseVietnameseCurrency('35 triệu');
  assert.equal(trieu.amount, 35000000);

  const tr = parseVietnameseCurrency('15tr');
  assert.equal(tr.amount, 15000000);

  // Nghìn / k
  const k = parseVietnameseCurrency('500k');
  assert.equal(k.amount, 500000);

  // Standard digits with dot
  const standard = parseVietnameseCurrency('15.500.000 VNĐ');
  assert.equal(standard.amount, 15500000);

  // USD
  const usd = parseVietnameseCurrency('$1,200 USD');
  assert.equal(usd.amount, 1200);
  assert.equal(usd.currency, 'USD');
});

test('contract: built-in templates provide production schemas for e-commerce, research, and JobTrack', () => {
  assert.equal(BUILT_IN_TEMPLATES.length, 4);
  const categories = BUILT_IN_TEMPLATES.map(t => t.category);
  assert.ok(categories.includes('product_research'));
  assert.ok(categories.includes('research_notes'));
  assert.ok(categories.includes('company_list'));
  assert.ok(categories.includes('jobtrack'));

  const jobtrack = BUILT_IN_TEMPLATES.find(t => t.category === 'jobtrack')!;
  const keys = jobtrack.columns.map(c => c.key);
  assert.ok(keys.includes('company'));
  assert.ok(keys.includes('position'));
  assert.ok(keys.includes('salary'));
});

test('contract: pro order status accepts exactly pending, paid, failed, expired, cancelled', () => {
  assert.deepEqual(PRO_ORDER_STATUSES, ['pending', 'paid', 'failed', 'expired', 'cancelled']);
  assert.equal(PRO_ORDER_STATUSES.length, 5);

  for (const status of ['pending', 'paid', 'failed', 'expired', 'cancelled'] as const) {
    assert.equal(isProOrderStatus(status), true, `${status} must be a valid user-facing order status`);
  }

  assert.equal(isProOrderStatus('completed'), false, 'database status completed is not a user-facing status');
  assert.equal(isProOrderStatus('PENDING'), false);
  assert.equal(isProOrderStatus(''), false);
  assert.equal(isProOrderStatus(null), false);
  assert.equal(isProOrderStatus(undefined), false);
  assert.equal(isProOrderStatus(42), false);
  assert.equal(isProOrderStatus({ status: 'pending' }), false);
});

test('contract: pro order and plan DTOs carry server-owned amounts and user-facing status', () => {
  const order: ProOrderDTO = {
    orderId: '8f14e45f-ceea-467a-9b0d-1f2c3d4e5f60',
    plan: 'quarterly',
    amount: 249000,
    currency: 'VND',
    transferCode: 'JTPROA1B2C3',
    status: 'pending',
    createdAt: '2026-10-22T03:00:00Z',
    expiresAt: '2026-10-22T03:30:00Z',
    completedAt: null,
    failureReason: null
  };

  assert.equal(order.status, 'pending');
  assert.equal(isProOrderStatus(order.status), true);
  assert.equal(order.amount, 249000);
  assert.equal(order.currency, 'VND');
  assert.equal(order.expiresAt, '2026-10-22T03:30:00Z');
  assert.equal(order.completedAt, null);
  assert.equal(order.failureReason, null);

  const paid: ProOrderDTO = { ...order, status: 'paid', expiresAt: null, completedAt: '2026-10-22T03:10:00Z' };
  assert.equal(paid.status, 'paid');
  assert.equal(isProOrderStatus(paid.status), true);
  assert.equal(paid.completedAt, '2026-10-22T03:10:00Z');

  const failed: ProOrderDTO = { ...order, status: 'failed', failureReason: 'amount_mismatch' };
  assert.equal(failed.status, 'failed');
  assert.equal(failed.failureReason, 'amount_mismatch');

  const expired: ProOrderDTO = { ...order, status: 'expired' };
  assert.equal(expired.status, 'expired');
  assert.equal(isProOrderStatus(expired.status), true);

  const cancelled: ProOrderDTO = { ...order, status: 'cancelled' };
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(isProOrderStatus(cancelled.status), true);

  const plan: ProPlanDTO = { plan: 'yearly', amount: 799000, currency: 'VND', durationDays: 365 };
  assert.equal(plan.plan, 'yearly');
  assert.equal(plan.amount, 799000);
  assert.equal(plan.currency, 'VND');
  assert.equal(plan.durationDays, 365);

  const plans: ProPlan[] = ['monthly', 'quarterly', 'yearly'];
  assert.equal(plans.length, 3);
});

test('contract: candidate profile input validation enforces strict types, URLs, and field bounds', () => {
  const valid = validateCandidateProfileInput({
    fullName: 'Nguyen Van A',
    email: 'nguyen.a@example.com',
    phone: '+84 912 345 678',
    cvUrl: 'https://storage.example.com/cv.pdf',
    portfolioUrl: 'https://github.com/nguyena',
    skills: ['TypeScript', 'Node.js', 'React'],
    bio: 'Experienced fullstack engineer with passion for resilient systems.',
    customAnswers: {
      noticePeriod: '1 month'
    }
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.fullName, 'Nguyen Van A');
    assert.equal(valid.data.email, 'nguyen.a@example.com');
    assert.equal(valid.data.phone, '+84 912 345 678');
    assert.equal(valid.data.cvUrl, 'https://storage.example.com/cv.pdf');
    assert.equal(valid.data.portfolioUrl, 'https://github.com/nguyena');
    assert.deepEqual(valid.data.skills, ['TypeScript', 'Node.js', 'React']);
    assert.equal(valid.data.bio, 'Experienced fullstack engineer with passion for resilient systems.');
    assert.deepEqual(valid.data.customAnswers, { noticePeriod: '1 month' });
  }

  const emptyResult = validateCandidateProfileInput({});
  assert.equal(emptyResult.ok, false);
  if (!emptyResult.ok) {
    assert.ok(emptyResult.errors.fullName);
    assert.ok(emptyResult.errors.email);
  }

  const malformed = validateCandidateProfileInput({
    fullName: '',
    email: 'invalid-email',
    phone: 'not a phone number!@#$',
    cvUrl: 'ftp://insecure.example.com/cv.pdf',
    portfolioUrl: 'javascript:alert(1)',
    skills: 'not-an-array',
    bio: 'a'.repeat(2500),
    unknownProperty: 'illegal'
  });

  assert.equal(malformed.ok, false);
  if (!malformed.ok) {
    assert.ok(malformed.errors.fullName);
    assert.ok(malformed.errors.email);
    assert.ok(malformed.errors.phone);
    assert.ok(malformed.errors.cvUrl);
    assert.ok(malformed.errors.portfolioUrl);
    assert.ok(malformed.errors.skills);
    assert.ok(malformed.errors.bio);
    assert.ok(malformed.errors.unknownProperty);
  }

  const profileDto: CandidateProfileWireDTO = {
    userId: 'user-123',
    fullName: 'Le Thi B',
    email: 'le.b@example.com',
    phone: null,
    cvUrl: null,
    portfolioUrl: null,
    skills: [],
    bio: null,
    customAnswers: {},
    createdAt: '2026-10-24T00:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  };
  assert.equal(profileDto.fullName, 'Le Thi B');
});

test('contract: ATS match and cover letter DTO structures adhere to contract specification', () => {
  const match: AtsMatchResultDTO = {
    score: 85,
    overallFit: 'Xuất sắc',
    matchedSkills: ['TypeScript', 'React'],
    missingSkills: ['Kubernetes'],
    recommendations: ['Bổ sung Kubernetes vào CV.'],
    keywordBreakdown: [
      { skill: 'TypeScript', foundInCv: true, importance: 'high' },
      { skill: 'Kubernetes', foundInCv: false, importance: 'medium' }
    ]
  };
  assert.equal(match.score, 85);
  assert.equal(match.overallFit, 'Xuất sắc');
  assert.equal(match.matchedSkills.length, 2);

  const letter: CoverLetterResultDTO = {
    coverLetter: 'Dear Hiring Manager...',
    shortPitch: 'Hi, I am interested in this role...',
    highlights: ['Tailored to position']
  };
  assert.ok(letter.coverLetter.includes('Dear Hiring Manager'));
  assert.equal(letter.highlights.length, 1);
});

test('contract: job subscription and crawl run DTO structures match contract requirements', () => {
  const sub: JobSubscriptionDTO = {
    id: 'sub-1',
    userId: 'user-1',
    title: 'Senior Node.js Developer',
    keywords: ['Node.js', 'PostgreSQL'],
    location: 'Hà Nội',
    minSalary: 40000000,
    sources: ['topcv', 'itviec'],
    isActive: true,
    lastCheckedAt: null,
    createdAt: '2026-10-24T00:00:00Z',
    updatedAt: '2026-10-24T00:00:00Z'
  };
  assert.equal(sub.title, 'Senior Node.js Developer');
  assert.equal(sub.isActive, true);
  assert.equal(sub.keywords.length, 2);

  const crawl: CrawlRunResultDTO = {
    subscriptionId: sub.id,
    subscriptionTitle: sub.title,
    found: 5,
    matched: 3,
    saved: 2,
    skippedDuplicates: 1,
    items: [
      { company: 'Tech Corp', position: 'Node.js Lead', status: 'saved' },
      { company: 'VNG', position: 'Senior Backend', status: 'saved' },
      { company: 'Shopee', position: 'Node.js Dev', status: 'duplicate_url' }
    ]
  };
  assert.equal(crawl.found, 5);
  assert.equal(crawl.saved, 2);
  assert.equal(crawl.items.length, 3);
});

test('contract: generateIcsCalendar generates compliant RFC 5545 calendar text', () => {
  const events = [
    {
      id: 'round-1',
      title: 'Phỏng vấn Kỹ thuật (Technical)',
      company: 'FPT Software',
      position: 'Senior React Engineer',
      at: '2026-10-25T09:00:00.000Z',
      timezone: 'Asia/Ho_Chi_Minh',
      format: 'Online',
      location: 'https://meet.google.com/abc-defg-hij',
      notes: 'Chuẩn bị live coding thuật toán, kiến trúc React và Node.js',
      durationMinutes: 60
    }
  ];

  const ics = generateIcsCalendar(events);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('PRODID:-//JobTrack//Interview Calendar//VI\r\n'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('UID:jt-interview-round-1@jobtrack.local\r\n'));
  assert.ok(ics.includes('DTSTART:20261025T090000Z\r\n'));
  assert.ok(ics.includes('DTEND:20261025T100000Z\r\n'));
  assert.ok(ics.includes('SUMMARY:[Phỏng vấn] Phỏng vấn Kỹ thuật (Technical) - FPT Software (Senior React Engineer)\r\n'));
  assert.ok(ics.includes('LOCATION:https://meet.google.com/abc-defg-hij\r\n'));
  assert.ok(ics.includes('DESCRIPTION:'));
  assert.ok(ics.includes('STATUS:CONFIRMED\r\n'));
  assert.ok(ics.includes('END:VEVENT\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('contract: escapeIcsText properly escapes RFC 5545 special delimiters', () => {
  const raw = 'Dòng 1\nDòng 2; có dấu chấm phẩy, phẩy và gạch chéo \\';
  const escaped = escapeIcsText(raw);
  assert.ok(escaped.includes('Dòng 1\\nDòng 2\\; có dấu chấm phẩy\\, phẩy và gạch chéo \\\\'));
});

test('contract: formatApplicationsAsCsv outputs UTF-8 BOM and sanitizes formula injection', () => {
  const apps = [
    {
      id: 'app-001',
      company: 'Tech Corp',
      position: '=cmd|/c calc!A0',
      status: 'Applied' as const,
      appliedAt: '2026-10-20',
      salary: '35 triệu',
      location: 'Hà Nội, Việt Nam',
      workMode: 'Hybrid' as const,
      nextAction: '+20% performance review',
      deadline: '2026-10-25T17:00:00Z',
      source: 'ITviec',
      jobCode: 'TC-101',
      url: 'https://example.com/job/101',
      notes: 'Ghi chú dòng 1\nDòng 2 với "nháy kép"',
      interviews: [{ id: 'int-1' }],
      createdAt: '2026-10-19T08:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z'
    }
  ];

  const csv = formatApplicationsAsCsv(apps);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('Mã hồ sơ,Công ty,Vị trí ứng tuyển,Trạng thái'));
  assert.ok(csv.includes("'=cmd|/c calc!A0"));
  assert.ok(csv.includes('"Hà Nội, Việt Nam"'));
  assert.ok(csv.includes("'+20% performance review"));
  assert.ok(csv.includes('""nháy kép""'));
});

test('contract: deriveActivityTimeline generates chronological events for application journey', () => {
  const app = {
    id: 'app-002',
    company: 'VNG',
    position: 'Senior Backend Engineer',
    status: 'Interview' as const,
    appliedAt: '2026-10-20',
    source: 'LinkedIn',
    nextAction: 'Luyện tập System Design',
    notes: 'Ứng tuyển qua referral của anh Minh',
    createdAt: '2026-10-18T10:00:00Z',
    updatedAt: '2026-10-21T15:00:00Z',
    interviews: [
      {
        id: 'round-1',
        title: 'Phỏng vấn HR',
        at: '2026-10-22T09:00:00Z',
        format: 'Online',
        location: 'Google Meet',
        status: 'Completed',
        notes: 'HR thân thiện'
      },
      {
        id: 'round-2',
        title: 'Phỏng vấn Kỹ thuật',
        at: '2026-10-25T14:00:00Z',
        format: 'On-site',
        location: 'VNG Campus',
        status: 'Scheduled',
        notes: 'Kiến trúc hệ thống'
      }
    ]
  };

  const timeline = deriveActivityTimeline(app);
  assert.ok(timeline.length >= 5);
  for (let i = 0; i < timeline.length - 1; i++) {
    assert.ok(timeline[i].timestamp.localeCompare(timeline[i + 1].timestamp) >= 0);
  }

  const types = new Set(timeline.map(t => t.type));
  assert.ok(types.has('created'));
  assert.ok(types.has('applied'));
  assert.ok(types.has('interview'));
  assert.ok(types.has('status_changed'));
  assert.ok(types.has('notes_updated'));
});

test('contract: validateBulkStatusInput and validateBulkTrashInput enforce strict structure', () => {
  const validStatus = validateBulkStatusInput({
    ids: ['95cf7ba5-fe4c-4e92-bcff-b44b207ec5a2', 'd79e77b0-fe4c-4e92-bcff-b44b207ec5a3'],
    status: 'Applied'
  });
  assert.equal(validStatus.ok, true);
  if (validStatus.ok) {
    assert.equal(validStatus.data.ids.length, 2);
    assert.equal(validStatus.data.status, 'Applied');
  }

  const invalidStatus = validateBulkStatusInput({
    ids: ['not-a-uuid'],
    status: 'InvalidStatus'
  });
  assert.equal(invalidStatus.ok, false);

  const validTrash = validateBulkTrashInput({
    ids: ['95cf7ba5-fe4c-4e92-bcff-b44b207ec5a2']
  });
  assert.equal(validTrash.ok, true);
  if (validTrash.ok) {
    assert.equal(validTrash.data.ids.length, 1);
  }

  const emptyTrash = validateBulkTrashInput({
    ids: []
  });
  assert.equal(emptyTrash.ok, false);
});

test('contract: detectDomainTrack and detectRoleLevel categorize jobs accurately', () => {
  assert.equal(detectDomainTrack('Senior React / Next.js Developer'), 'frontend');
  assert.equal(detectDomainTrack('PostgreSQL Node.js Backend Engineer'), 'backend');
  assert.equal(detectDomainTrack('DevOps & Kubernetes Cloud Lead'), 'devops');
  assert.equal(detectDomainTrack('Flutter Mobile Developer Intern'), 'mobile');
  assert.equal(detectDomainTrack('Fullstack Engineer TypeScript'), 'fullstack');
  assert.equal(detectDomainTrack('Product Manager'), 'general');

  assert.equal(detectRoleLevel('Principal Software Architect'), 'Lead');
  assert.equal(detectRoleLevel('Senior Backend Engineer'), 'Senior');
  assert.equal(detectRoleLevel('Junior Frontend Developer'), 'Junior');
  assert.equal(detectRoleLevel('Software Engineer'), 'Mid-level');
});

test('contract: generateInterviewQuestions produces structured questions with STAR guidelines', () => {
  const prep = generateInterviewQuestions({
    company: 'TechCorp Vietnam',
    position: 'Senior React Developer',
    notes: 'Kinh nghiệm với TypeScript, Redux và Next.js',
    skills: ['React', 'TypeScript', 'Redux']
  });

  assert.equal(prep.company, 'TechCorp Vietnam');
  assert.equal(prep.position, 'Senior React Developer');
  assert.equal(prep.domainTrack, 'frontend');
  assert.equal(prep.roleLevel, 'Senior');
  assert.ok(prep.questions.length >= 4);

  const firstQ = prep.questions[0];
  assert.ok(firstQ.question.length > 10);
  assert.ok(firstQ.intent.length > 10);
  assert.ok(firstQ.starGuidelines.situation.length > 5);
  assert.ok(firstQ.starGuidelines.task.length > 5);
  assert.ok(firstQ.starGuidelines.action.length > 5);
  assert.ok(firstQ.starGuidelines.result.length > 5);
  assert.ok(firstQ.sampleAnswer.length > 20);

  assert.ok(prep.reverseQuestions.length >= 3);
  assert.ok(prep.tips.length >= 2);
});

test('contract: evaluateStarAnswer calculates weighted rubric scores and awards bonuses for metrics', () => {
  const goodAnswer = evaluateStarAnswer({
    questionId: 'test-1',
    question: 'Kể về một lần bạn tối ưu hiệu năng trang web?',
    category: 'behavioral',
    answer: 'Khi làm việc tại công ty cũ, hệ thống dashboard của dự án bị chậm khi tải bảng dữ liệu. Nhiệm vụ của tôi là đưa tốc độ phản hồi về dưới 200ms. Tôi đã quyết định phân tích bundle, áp dụng virtualization và refactor lại các memoized selectors. Kết quả thời gian tải trang giảm 65%, thời gian render từ 800ms xuống còn 120ms và người dùng rất hài lòng.'
  });

  assert.ok(goodAnswer.overallScore >= 7.5);
  assert.ok(goodAnswer.rubric.actionScore >= 7);
  assert.ok(goodAnswer.rubric.resultScore >= 7);
  assert.ok(goodAnswer.strengths.length > 0);
  assert.ok(goodAnswer.improvedAnswer.includes('[Tình huống]'));

  const poorAnswer = evaluateStarAnswer({
    questionId: 'test-2',
    question: 'Bạn xử lý xung đột như thế nào?',
    category: 'behavioral',
    answer: 'Nói chuyện thôi.'
  });

  assert.ok(poorAnswer.overallScore < 6.0);
  assert.equal(poorAnswer.verdict, 'Cần cải thiện');
  assert.ok(poorAnswer.improvements.length > 0);
});

test('contract: validateInterviewPrepInput and validateInterviewEvaluateInput enforce schema', () => {
  const validPrep = validateInterviewPrepInput({
    company: 'VNG',
    position: 'Backend Developer',
    notes: 'Golang, Microservices',
    domainTrack: 'backend'
  });
  assert.equal(validPrep.ok, true);

  const invalidPrep = validateInterviewPrepInput({
    company: 'VNG',
    position: ''
  });
  assert.equal(invalidPrep.ok, false);

  const unknownPropPrep = validateInterviewPrepInput({
    company: 'VNG',
    position: 'Backend',
    hackerField: true
  });
  assert.equal(unknownPropPrep.ok, false);

  const validEval = validateInterviewEvaluateInput({
    questionId: 'q-1',
    question: 'How do you handle race conditions?',
    category: 'technical',
    answer: 'I use database transactions with pessimistic locking.'
  });
  assert.equal(validEval.ok, true);

  const invalidEval = validateInterviewEvaluateInput({
    question: 'Valid question',
    category: 'invalid-cat',
    answer: 'Short'
  });
  assert.equal(invalidEval.ok, false);
});

test('contract: parseApplicationsFromCsv handles bilingual headers, BOM, and delimiters', () => {
  const csvWithBom = '\uFEFF"Công ty","Vị trí","Trạng thái","Ngày nộp","Mức lương","Địa điểm","Hình thức"\n' +
    '"Shopee Vietnam","Senior Frontend Engineer","Phỏng vấn","24/10/2026","60M","TP. HCM","Kết hợp"\n' +
    '"VNG Corporation","Platform Tech Lead","Đã nộp","2026-10-22","75M","Hà Nội","Từ xa"';

  const preview = parseApplicationsFromCsv(csvWithBom);
  assert.equal(preview.hasBom, true);
  assert.equal(preview.delimiter, ',');
  assert.equal(preview.totalRows, 2);
  assert.equal(preview.validRowsCount, 2);
  assert.equal(preview.errorRowsCount, 0);

  const row1 = preview.rows[0];
  assert.equal(row1.company, 'Shopee Vietnam');
  assert.equal(row1.position, 'Senior Frontend Engineer');
  assert.equal(row1.status, 'Interview');
  assert.equal(row1.appliedAt, '2026-10-24');
  assert.equal(row1.workMode, 'Hybrid');

  const row2 = preview.rows[1];
  assert.equal(row2.company, 'VNG Corporation');
  assert.equal(row2.position, 'Platform Tech Lead');
  assert.equal(row2.status, 'Applied');
  assert.equal(row2.appliedAt, '2026-10-22');
  assert.equal(row2.workMode, 'Remote');
});

test('contract: parseApplicationsFromCsv neutralizes spreadsheet formula injection', () => {
  assert.equal(neutralizeFormula("=cmd|' /C calc'!A0"), "cmd|' /C calc'!A0");
  assert.equal(neutralizeFormula('@SUM(A1:A10)'), 'SUM(A1:A10)');
  assert.equal(neutralizeFormula('+12345'), '12345');
  assert.equal(neutralizeFormula("'-4567"), '-4567');

  const dangerousCsv = 'Company,Position,Notes\n' +
    'Evil Corp,=1+1,@calc\n' +
    'Safe Corp,"\'+formula",Normal note';

  const preview = parseApplicationsFromCsv(dangerousCsv);
  assert.equal(preview.totalRows, 2);
  assert.equal(preview.rows[0].position, '1+1');
  assert.equal(preview.rows[0].notes, 'calc');
  assert.equal(preview.rows[1].position, '+formula');
});

test('contract: parseApplicationsFromCsv detects row errors and duplicate candidates', () => {
  const badCsv = 'Company,Position,DateApplied,Url\n' +
    ',Software Engineer,2026-10-20,https://example.com/job1\n' +
    'TechCorp,,2026-10-20,https://example.com/job2\n' +
    'ValidCorp,Senior Go Engineer,invalid-date,not-a-url\n' +
    'ExistingCorp,Lead Architect,2026-10-20,https://example.com/existing';

  const preview = parseApplicationsFromCsv(badCsv, {
    existingApps: [
      { company: 'ExistingCorp', position: 'Lead Architect', url: 'https://example.com/existing' }
    ]
  });

  assert.equal(preview.totalRows, 4);
  assert.equal(preview.rows[0].isValid, false);
  assert.equal(preview.rows[0].errors.some(e => e.includes('công ty')), true);

  assert.equal(preview.rows[1].isValid, false);
  assert.equal(preview.rows[1].errors.some(e => e.includes('vị trí')), true);

  assert.equal(preview.rows[2].isValid, false);
  assert.equal(preview.rows[2].errors.length >= 2, true);

  assert.equal(preview.rows[3].isValid, true);
  assert.equal(preview.rows[3].isDuplicate, true);
  assert.equal(preview.duplicateRowsCount, 1);
});

test('contract: validateCsvImportRequest strictly validates payload structure and field limits', () => {
  const valid = validateCsvImportRequest({
    rows: [
      {
        company: 'FPT Software',
        position: 'Senior Java Developer',
        status: 'Applied',
        appliedAt: '2026-10-24',
        salary: '45M',
        location: 'Hà Nội',
        workMode: 'Hybrid'
      }
    ],
    skipDuplicates: true
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.rows.length, 1);
    assert.equal(valid.data.skipDuplicates, true);
  }

  const emptyRows = validateCsvImportRequest({ rows: [] });
  assert.equal(emptyRows.ok, false);

  const unknownFields = validateCsvImportRequest({
    rows: [{ company: 'Test', position: 'Dev' }],
    extraField: 123
  });
  assert.equal(unknownFields.ok, false);

  const invalidRowDate = validateCsvImportRequest({
    rows: [{ company: 'Test', position: 'Dev', appliedAt: '2026-02-30' }]
  });
  assert.equal(invalidRowDate.ok, false);
});


test('contract: calculateAnnualTotalCompensation accurately calculates all cash and equity elements', () => {
  const comp = calculateAnnualTotalCompensation({
    baseSalaryMonthly: 50000000,
    currency: 'VND',
    bonusMonthsPerYear: 1.5,
    annualBonusCash: 30000000,
    stockOptionsOrEquityAnnual: 25000000,
    allowanceMonthly: 2000000
  });

  assert.equal(comp.baseSalaryMonthly, 50000000);
  assert.equal(comp.currency, 'VND');
  assert.equal(comp.bonusMonthsPerYear, 1.5);
  assert.equal(comp.annualBonusCash, 30000000);
  assert.equal(comp.stockOptionsOrEquityAnnual, 25000000);
  assert.equal(comp.allowanceMonthly, 2000000);

  const expectedBase = 50000000 * 12;
  const expectedBonusMonths = 50000000 * 1.5;
  const expectedAllowance = 2000000 * 12;
  const expectedTotal = expectedBase + expectedBonusMonths + expectedAllowance + 30000000 + 25000000;
  assert.equal(comp.annualTotalCompensation, expectedTotal);
});

test('contract: evaluateOfferDetails computes weighted scores, grades, and pros/cons', () => {
  const comp = calculateAnnualTotalCompensation({
    baseSalaryMonthly: 60000000,
    currency: 'VND',
    bonusMonthsPerYear: 2,
    annualBonusCash: 50000000,
    stockOptionsOrEquityAnnual: 40000000,
    allowanceMonthly: 3000000
  });

  const evaluation = evaluateOfferDetails({
    company: 'VinAI',
    position: 'Staff AI Engineer',
    compensation: comp,
    workplaceFactors: {
      workLifeBalance: 8,
      careerGrowth: 9,
      teamAndCulture: 9,
      remoteFlexibility: 8,
      companyReputationAndStability: 9,
      healthAndBenefits: 9
    }
  });

  assert.equal(evaluation.company, 'VinAI');
  assert.equal(evaluation.position, 'Staff AI Engineer');
  assert.ok(evaluation.weightedScore >= 80);
  assert.equal(evaluation.grade, 'Xuất sắc');
  assert.ok(evaluation.pros.length > 0);
  assert.equal(evaluation.breakdownSummary.annualTotal, comp.annualTotalCompensation);
  assert.ok(evaluation.breakdownSummary.annualGuaranteed > 0);
  assert.ok(evaluation.breakdownSummary.annualVariable > 0);
});

test('contract: compareOffers ranks offers, computes delta scores, and identifies category winners', () => {
  const comp1 = calculateAnnualTotalCompensation({
    baseSalaryMonthly: 70000000,
    bonusMonthsPerYear: 1
  });
  const offer1 = evaluateOfferDetails({
    applicationId: 'app-1',
    company: 'Fintech Unicorn',
    position: 'Lead Backend',
    compensation: comp1,
    workplaceFactors: { workLifeBalance: 5, careerGrowth: 9 }
  });

  const comp2 = calculateAnnualTotalCompensation({
    baseSalaryMonthly: 55000000,
    bonusMonthsPerYear: 2
  });
  const offer2 = evaluateOfferDetails({
    applicationId: 'app-2',
    company: 'Global Remote Corp',
    position: 'Senior Backend',
    compensation: comp2,
    workplaceFactors: { workLifeBalance: 9, remoteFlexibility: 10 }
  });

  const matrix = compareOffers([offer1, offer2]);
  assert.equal(matrix.offers.length, 2);
  assert.equal(matrix.rankedOffers.length, 2);
  assert.equal(matrix.rankedOffers[0]?.rank, 1);
  assert.equal(matrix.rankedOffers[0]?.deltaScore, 0);
  assert.ok(matrix.rankedOffers[1]!.deltaScore <= 0);
  assert.equal(matrix.bestCompensationOfferId, 'app-1');
  assert.equal(matrix.bestWorkLifeBalanceOfferId, 'app-2');
  assert.ok(matrix.recommendationSummary.length > 0);
});

test('contract: generateCounterOfferScript produces customized negotiation drafts across all 3 tones', () => {
  const comp = calculateAnnualTotalCompensation({
    baseSalaryMonthly: 40000000,
    currency: 'VND'
  });
  const offer = evaluateOfferDetails({
    company: 'Shopee',
    position: 'Senior Engineer',
    compensation: comp
  });

  const polite = generateCounterOfferScript({
    offer,
    targetSalary: 48000000,
    tone: 'polite_confident'
  });
  assert.equal(polite.tone, 'polite_confident');
  assert.equal(polite.targetIncreasePercent, 20);
  assert.ok(polite.emailSubject.includes('Shopee'));
  assert.ok(polite.emailBody.includes('48.000.000 VND'));
  assert.ok(polite.shortScriptForCall.includes('48.000.000 VND'));
  assert.ok(polite.talkingPoints.length >= 2);
  assert.ok(polite.leverageItems.length >= 2);

  const collaborative = generateCounterOfferScript({
    offer,
    targetSalary: 45000000,
    tone: 'collaborative'
  });
  assert.equal(collaborative.tone, 'collaborative');
  assert.ok(collaborative.emailBody.includes('thảo luận linh hoạt'));

  const firm = generateCounterOfferScript({
    offer,
    targetSalary: 52000000,
    tone: 'firm_competitive',
    competitiveOffer: {
      company: 'Lazada',
      position: 'Senior Engineer',
      annualTotalCompensation: 700000000
    }
  });
  assert.equal(firm.tone, 'firm_competitive');
  assert.ok(firm.emailBody.includes('Lazada'));
  assert.ok(firm.leverageItems.some(item => item.includes('Lazada')));
});

test('contract: offer validators enforce strict schema bounds and positive numbers', () => {
  const valid = validateOfferEvaluationInput({
    company: 'VNG',
    position: 'Backend Developer',
    compensation: {
      baseSalaryMonthly: 45000000,
      currency: 'VND',
      bonusMonthsPerYear: 1
    }
  });
  assert.equal(valid.ok, true);

  const invalidSalary = validateOfferEvaluationInput({
    company: 'VNG',
    position: 'Backend Developer',
    compensation: {
      baseSalaryMonthly: -1000
    }
  });
  assert.equal(invalidSalary.ok, false);

  const invalidOffersCount = validateOfferComparisonInput({
    offers: [
      {
        company: 'VNG',
        position: 'Dev',
        compensation: { baseSalaryMonthly: 40000000 }
      }
    ]
  });
  assert.equal(invalidOffersCount.ok, false);

  const validComparison = validateOfferComparisonInput({
    offers: [
      {
        company: 'VNG',
        position: 'Dev',
        compensation: { baseSalaryMonthly: 40000000 }
      },
      {
        company: 'FPT',
        position: 'Dev',
        compensation: { baseSalaryMonthly: 42000000 }
      }
    ]
  });
  assert.equal(validComparison.ok, true);

  const validCounter = validateCounterOfferInput({
    offer: valid.ok ? evaluateOfferDetails({ company: 'VNG', position: 'Dev', compensation: calculateAnnualTotalCompensation({ baseSalaryMonthly: 45000000 }) }) : ({} as any),
    targetSalary: 50000000,
    tone: 'polite_confident'
  });
  assert.equal(validCounter.ok, true);
});

test('contract: validateCheckoutInput and validateSimulateWebhookInput validate properly', () => {
  const nullCheck = validateCheckoutInput(null);
  assert.equal(nullCheck.ok, false);

  const arrayCheck = validateCheckoutInput([]);
  assert.equal(arrayCheck.ok, false);

  const emptyCheck = validateCheckoutInput({});
  assert.equal(emptyCheck.ok, true);
  if (emptyCheck.ok) {
    assert.equal(emptyCheck.data.plan, 'monthly');
  }

  const invalidPlan = validateCheckoutInput({ plan: 'lifetime' });
  assert.equal(invalidPlan.ok, true);
  if (invalidPlan.ok) {
    assert.equal(invalidPlan.data.plan, 'monthly');
  }

  const validMonthly = validateCheckoutInput({ plan: 'monthly' });
  assert.equal(validMonthly.ok, true);
  if (validMonthly.ok) {
    assert.equal(validMonthly.data.plan, 'monthly');
  }

  const validQuarterly = validateCheckoutInput({ plan: 'quarterly' });
  assert.equal(validQuarterly.ok, true);

  const validYearly = validateCheckoutInput({ plan: 'yearly' });
  assert.equal(validYearly.ok, true);

  const nullSimulate = validateSimulateWebhookInput(null);
  assert.equal(nullSimulate.ok, false);

  const emptySimulate = validateSimulateWebhookInput({});
  assert.equal(emptySimulate.ok, false);
  if (!emptySimulate.ok) {
    assert.ok(emptySimulate.errors.orderId);
  }

  const whitespaceSimulate = validateSimulateWebhookInput({ orderId: '   ' });
  assert.equal(whitespaceSimulate.ok, false);

  const validSimulate = validateSimulateWebhookInput({ orderId: '  ord_12345  ' });
  assert.equal(validSimulate.ok, true);
  if (validSimulate.ok) {
    assert.equal(validSimulate.data.orderId, 'ord_12345');
  }
});

test('contract: validateAnalyticsQuery handles valid and invalid timeframes', () => {
  assert.equal(validateAnalyticsQuery(null).ok, true);
  assert.equal(validateAnalyticsQuery(null).data.timeframe, 'all');

  assert.equal(validateAnalyticsQuery({ timeframe: '30d' }).ok, true);
  assert.equal(validateAnalyticsQuery({ timeframe: '30d' }).data.timeframe, '30d');

  assert.equal(validateAnalyticsQuery({ timeframe: '90d' }).ok, true);
  assert.equal(validateAnalyticsQuery({ timeframe: 'year' }).ok, true);

  const invalid = validateAnalyticsQuery({ timeframe: '100d' });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.message);
});

test('contract: validateApplicationGoalInput validates numeric bounds', () => {
  const nullCheck = validateApplicationGoalInput(null);
  assert.equal(nullCheck.ok, false);

  const validEmpty = validateApplicationGoalInput({});
  assert.equal(validEmpty.ok, true);
  assert.equal(validEmpty.data.weeklyApplicationsTarget, 5);
  assert.equal(validEmpty.data.monthlyInterviewsTarget, 2);
  assert.equal(validEmpty.data.targetOffers, 1);

  const outOfBounds = validateApplicationGoalInput({
    weeklyApplicationsTarget: 200,
    monthlyInterviewsTarget: -5,
    targetOffers: 50
  });
  assert.equal(outOfBounds.ok, false);
  assert.ok(outOfBounds.errors?.weeklyApplicationsTarget);
  assert.ok(outOfBounds.errors?.monthlyInterviewsTarget);
  assert.ok(outOfBounds.errors?.targetOffers);

  const customValid = validateApplicationGoalInput({
    weeklyApplicationsTarget: 10,
    monthlyInterviewsTarget: 4,
    targetOffers: 2
  });
  assert.equal(customValid.ok, true);
  assert.equal(customValid.data.weeklyApplicationsTarget, 10);
  assert.equal(customValid.data.monthlyInterviewsTarget, 4);
  assert.equal(customValid.data.targetOffers, 2);
});

test('contract: filterApplicationsByTimeframe filters records accurately', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  const items = [
    { id: '1', createdAt: '2026-10-20T10:00:00Z', appliedAt: '2026-10-20' },
    { id: '2', createdAt: '2026-09-01T10:00:00Z', appliedAt: '2026-09-01' },
    { id: '3', createdAt: '2025-01-01T10:00:00Z', appliedAt: null }
  ];

  const all = filterApplicationsByTimeframe(items, 'all', now);
  assert.equal(all.length, 3);

  const thirtyDays = filterApplicationsByTimeframe(items, '30d', now);
  assert.equal(thirtyDays.length, 1);
  assert.equal(thirtyDays[0].id, '1');

  const ninetyDays = filterApplicationsByTimeframe(items, '90d', now);
  assert.equal(ninetyDays.length, 2);

  const oneYear = filterApplicationsByTimeframe(items, 'year', now);
  assert.equal(oneYear.length, 2);
});

test('contract: calculateFunnelMetrics computes conversion dropoffs', () => {
  const sampleApps = [
    { status: 'Saved' as const },
    { status: 'Applied' as const },
    { status: 'Screening' as const },
    { status: 'Interview' as const },
    { status: 'Offer' as const },
    { status: 'Rejected' as const }
  ];

  const funnel = calculateFunnelMetrics(sampleApps);
  assert.equal(funnel.length, 5);

  const savedStage = funnel.find(s => s.stage === 'Saved');
  assert.ok(savedStage);
  assert.equal(savedStage.count, 6);

  const appliedStage = funnel.find(s => s.stage === 'Applied');
  assert.ok(appliedStage);
  assert.equal(appliedStage.count, 5);

  const offerStage = funnel.find(s => s.stage === 'Offer');
  assert.ok(offerStage);
  assert.equal(offerStage.count, 1);
  assert.equal(offerStage.overallConversionRate, 16.7);
});

test('contract: calculateVelocityMetrics computes stage durations', () => {
  const sampleApps = [
    {
      status: 'Interview' as const,
      appliedAt: '2026-10-01T08:00:00Z',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-05T08:00:00Z',
      interviews: [{ at: '2026-10-11T08:00:00Z', status: 'Completed' }]
    },
    {
      status: 'Rejected' as const,
      appliedAt: '2026-10-01T08:00:00Z',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-15T08:00:00Z'
    },
    {
      status: 'Offer' as const,
      appliedAt: '2026-10-01T08:00:00Z',
      createdAt: '2026-10-01T08:00:00Z',
      updatedAt: '2026-10-21T08:00:00Z'
    }
  ];

  const velocity = calculateVelocityMetrics(sampleApps);
  assert.equal(velocity.activeCount, 2);
  assert.equal(velocity.terminalCount, 1);
  assert.ok(velocity.timeToFirstResponseDays !== null);
  assert.ok(velocity.timeToInterviewDays !== null);
  assert.ok(velocity.timeToOfferDays !== null);
  assert.ok(velocity.overallCycleDays !== null);
  assert.equal(velocity.timeToInterviewDays, 10);
  assert.equal(velocity.overallCycleDays, 14);
});

test('contract: calculateSourceMetrics groups and ranks sources', () => {
  const sampleApps = [
    { source: 'LinkedIn', status: 'Interview' as const },
    { source: 'LinkedIn', status: 'Offer' as const },
    { source: 'TopCV', status: 'Rejected' as const },
    { source: null, status: 'Applied' as const }
  ];

  const sources = calculateSourceMetrics(sampleApps);
  assert.equal(sources.length, 3);
  const linkedIn = sources.find(s => s.source === 'LinkedIn');
  assert.ok(linkedIn);
  assert.equal(linkedIn.totalApplications, 2);
  assert.equal(linkedIn.offerRate, 50);

  const unknown = sources.find(s => s.source === 'Chưa phân loại');
  assert.ok(unknown);
  assert.equal(unknown.totalApplications, 1);
});

test('contract: findStaleApplications flags inactive applications with recommendations', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  const sampleApps = [
    {
      id: 'app-stale-1',
      company: 'FPT Software',
      position: 'Tech Lead',
      status: 'Applied' as const,
      appliedAt: '2026-10-01',
      updatedAt: '2026-10-05T08:00:00Z'
    },
    {
      id: 'app-active',
      company: 'VNG',
      position: 'Senior Engineer',
      status: 'Interview' as const,
      appliedAt: '2026-10-20',
      updatedAt: '2026-10-23T08:00:00Z',
      interviews: [{ at: '2026-10-26T09:00:00Z', status: 'Scheduled' }]
    },
    {
      id: 'app-terminal',
      company: 'Viettel',
      position: 'Staff Engineer',
      status: 'Rejected' as const,
      appliedAt: '2026-09-01',
      updatedAt: '2026-09-20T08:00:00Z'
    }
  ];

  const stale = findStaleApplications(sampleApps, now, 7);
  assert.equal(stale.length, 1);
  assert.equal(stale[0].id, 'app-stale-1');
  assert.ok(stale[0].daysInactive >= 18);
  assert.ok(stale[0].recommendedAction.includes('Follow-up'));
});

test('contract: calculateAnalyticsSummary aggregates entire dashboard payload', () => {
  const now = Date.parse('2026-10-24T12:00:00Z');
  const sampleApps = [
    {
      id: 'app-1',
      company: 'Shopee',
      position: 'Fullstack Dev',
      source: 'LinkedIn',
      status: 'Offer' as const,
      appliedAt: '2026-10-10',
      createdAt: '2026-10-10T08:00:00Z',
      updatedAt: '2026-10-22T08:00:00Z',
      interviews: [{ id: 'int-1', at: '2026-10-15T09:00:00Z', status: 'Completed' }]
    }
  ];

  const summary = calculateAnalyticsSummary(sampleApps, { weeklyApplicationsTarget: 3 }, { timeframe: '30d', now });
  assert.equal(summary.timeframe, '30d');
  assert.equal(summary.funnel.length, 5);
  assert.equal(summary.velocity.activeCount, 1);
  assert.equal(summary.sources.length, 1);
  assert.equal(summary.goals.targetOffers, 1);
  assert.equal(summary.goals.currentOffers, 1);
});

test('contract: validateResumeInput validates variant structure and limits', () => {
  const nullCheck = validateResumeInput(null);
  assert.equal(nullCheck.ok, false);

  const emptyCheck = validateResumeInput({});
  assert.equal(emptyCheck.ok, false);
  assert.ok(emptyCheck.errors?.name);

  const valid = validateResumeInput({
    name: 'CV Senior Frontend 2026',
    targetRole: 'Senior React Developer',
    summary: 'Chuyên gia phát triển ứng dụng React với hơn 5 năm kinh nghiệm.',
    experiences: [
      {
        company: 'VNG',
        role: 'Senior Frontend Engineer',
        period: '2023 - Nay',
        bulletPoints: ['Tối ưu hóa thời gian tải ứng dụng 45%'],
        technologies: ['React', 'TypeScript', 'Tailwind']
      }
    ],
    skillGroups: [
      { category: 'Frontend', skills: ['React', 'TypeScript', 'Next.js'] }
    ],
    isMaster: true
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.data.name, 'CV Senior Frontend 2026');
  assert.equal(valid.data.isMaster, true);
  assert.equal(valid.data.experiences.length, 1);
});

test('contract: validateResumeTailorInput enforces company and position', () => {
  const invalid = validateResumeTailorInput({});
  assert.equal(invalid.ok, false);

  const missingPos = validateResumeTailorInput({ jobDetails: { company: 'FPT' } });
  assert.equal(missingPos.ok, false);

  const valid = validateResumeTailorInput({
    resumeId: 'res-123',
    jobDetails: {
      company: 'Shopee',
      position: 'Frontend Lead',
      description: 'Yêu cầu kinh nghiệm React, Next.js, Performance Optimization',
      requiredSkills: ['React', 'Next.js']
    }
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.data.jobDetails.company, 'Shopee');
  assert.equal(valid.data.jobDetails.position, 'Frontend Lead');
});

test('contract: calculateResumeAtsScore accurately evaluates keyword presence', () => {
  const sample = {
    summary: 'Kỹ sư phần mềm đam mê React và TypeScript.',
    experiences: [
      {
        bulletPoints: ['Xây dựng microservices với Node.js và Docker'],
        technologies: ['Docker', 'AWS']
      }
    ],
    skillGroups: [
      { skills: ['React', 'TypeScript', 'PostgreSQL'] }
    ]
  };

  const fullMatch = calculateResumeAtsScore(sample, ['React', 'TypeScript', 'Docker', 'PostgreSQL']);
  assert.equal(fullMatch.score, 100);

  const partialMatch = calculateResumeAtsScore(sample, ['React', 'Kubernetes', 'Golang', 'Rust']);
  assert.equal(partialMatch.score, 25);

  const emptyKeywords = calculateResumeAtsScore(sample, []);
  assert.equal(emptyKeywords.score, 100);
});

test('contract: generateResumeDiff detects changes across sections', () => {
  const orig = {
    id: 'res-1',
    name: 'CV Gốc',
    summary: 'Kỹ sư Frontend kinh nghiệm.',
    experiences: [
      {
        id: 'exp-1',
        company: 'VNG',
        role: 'Developer',
        period: '2023 - 2026',
        bulletPoints: ['Phát triển giao diện ứng dụng.'],
        technologies: ['React']
      }
    ],
    skillGroups: [{ category: 'Kỹ năng', skills: ['React', 'CSS'] }],
    isMaster: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const tailored = {
    ...orig,
    summary: 'Kỹ sư Frontend chuyên sâu về Performance tại Shopee.',
    experiences: [
      {
        ...orig.experiences[0],
        bulletPoints: ['Phát triển giao diện ứng dụng, trực tiếp tối ưu hóa tải trang.']
      }
    ],
    skillGroups: [{ category: 'Kỹ năng', skills: ['Next.js', 'React', 'CSS'] }]
  };

  const diffs = generateResumeDiff(orig, tailored);
  assert.ok(diffs.length >= 2);
  const sumDiff = diffs.find(d => d.section === 'summary');
  assert.ok(sumDiff);
  assert.equal(sumDiff.type, 'modified');
});

test('contract: tailorResumeForJob synthesizes tailored variant and boosts score', () => {
  const base = {
    id: 'res-master',
    name: 'CV Gốc',
    summary: 'Lập trình viên Web.',
    experiences: [
      {
        id: 'exp-1',
        company: 'TechCorp',
        role: 'Software Engineer',
        period: '2022 - 2026',
        bulletPoints: ['Thiết kế giao diện người dùng'],
        technologies: ['JavaScript']
      }
    ],
    skillGroups: [{ category: 'Kỹ năng', skills: ['JavaScript', 'HTML'] }],
    isMaster: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const job = {
    company: 'Grab',
    position: 'Senior React Engineer',
    description: 'Tìm kiếm chuyên gia React, TypeScript, GraphQL để xây dựng hệ thống thanh toán tốc độ cao.',
    requiredSkills: ['React', 'TypeScript', 'GraphQL']
  };

  const result = tailorResumeForJob(base, job);
  assert.ok(result.tailoredScore >= 80);
  assert.ok(result.tailoredScore >= result.originalScore);
  assert.ok(result.diffs.length > 0);
  assert.ok(result.tailoringNotes.length >= 3);
  assert.ok(result.tailoredResume.name.includes('Grab'));
  assert.ok(result.tailoredResume.summary.includes('Grab'));
});

test('contract: calculateCompanyAggregates accurately calculates averages and recommendation rates', () => {
  const reviews = [
    {
      id: 'rev-1',
      companyName: 'TechCorp',
      role: 'Backend Engineer',
      rating: 5,
      workLifeBalance: 4,
      compensationRating: 5,
      careerGrowth: 4,
      managementRating: 5,
      recommend: true,
      pros: 'Môi trường rất tốt và lương thưởng cạnh tranh.',
      cons: 'Quy trình họp hành tương đối nhiều.',
      createdAt: '2026-10-20T00:00:00Z'
    },
    {
      id: 'rev-2',
      companyName: 'TechCorp',
      role: 'Frontend Engineer',
      rating: 3,
      workLifeBalance: 2,
      compensationRating: 4,
      careerGrowth: 3,
      managementRating: 3,
      recommend: false,
      pros: 'Dự án quy mô lớn phục vụ hàng triệu người dùng.',
      cons: 'Thời gian OT nhiều vào các tuần phát hành bản cập nhật.',
      createdAt: '2026-10-21T00:00:00Z'
    }
  ];

  const scores = calculateCompanyAggregates(reviews);
  assert.equal(scores.overall, 4.0);
  assert.equal(scores.workLife, 3.0);
  assert.equal(scores.compensation, 4.5);
  assert.equal(scores.recommendRate, 50);
  assert.equal(scores.totalReviews, 2);

  const emptyScores = calculateCompanyAggregates([]);
  assert.equal(emptyScores.totalReviews, 0);
  assert.ok(emptyScores.overall >= 3.5);
});

test('contract: validateCompanyReviewInput enforces required fields, rating bounds, and text length', () => {
  const valid = validateCompanyReviewInput({
    companyName: 'FPT Software',
    role: 'Senior Java Developer',
    rating: 5,
    workLifeBalance: 4,
    compensationRating: 4,
    careerGrowth: 5,
    managementRating: 4,
    recommend: true,
    pros: 'Chế độ đào tạo bài bản và môi trường đồng nghiệp thân thiện.',
    cons: 'Dự án chuyển đổi nhiều nên cần thích ứng linh hoạt.'
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.companyName, 'FPT Software');
    assert.equal(valid.data.rating, 5);
  }

  const invalid = validateCompanyReviewInput({
    companyName: '',
    role: '',
    rating: 6,
    pros: 'Quá ngắn',
    cons: 'Ngắn'
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors?.companyName);
  assert.ok(invalid.errors?.role);
  assert.ok(invalid.errors?.rating);
  assert.ok(invalid.errors?.pros);
  assert.ok(invalid.errors?.cons);
});

test('contract: synthesizeCompanyIntelligence returns rich presets for known companies and algorithms for custom ones', () => {
  const fpt = synthesizeCompanyIntelligence('FPT Software');
  assert.equal(fpt.name, 'FPT Software');
  assert.ok(fpt.salaryBenchmarks.length >= 3);
  assert.ok(fpt.interviewQuestions.length >= 2);
  assert.ok(fpt.keyPros.length >= 2);
  assert.ok(fpt.techStack.includes('Java'));

  const custom = synthesizeCompanyIntelligence('Fintech Startup X');
  assert.equal(custom.name, 'Fintech Startup X');
  assert.ok(custom.salaryBenchmarks.length >= 3);
  assert.ok(custom.interviewQuestions.length >= 1);
  assert.ok(custom.cultureScores.overall >= 3.5);
});

test('contract: calculateFollowUpCadence calculates schedule, due, and overdue urgency accurately', () => {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString();

  const scheduled = calculateFollowUpCadence('app-1', 'Applied', oneDayAgo, 5);
  assert.equal(scheduled.urgency, 'scheduled');
  assert.equal(scheduled.isDue, false);
  assert.equal(scheduled.isOverdue, false);

  const due = calculateFollowUpCadence('app-1', 'Applied', fiveDaysAgo, 5);
  assert.equal(due.urgency, 'due');
  assert.equal(due.isDue, true);
  assert.equal(due.isOverdue, false);

  const overdue = calculateFollowUpCadence('app-1', 'Applied', eightDaysAgo, 5);
  assert.equal(overdue.urgency, 'overdue');
  assert.equal(overdue.isDue, true);
  assert.equal(overdue.isOverdue, true);
});

test('contract: generateFollowUpEmail interpolates variables and provides stage-appropriate advice', () => {
  const result = generateFollowUpEmail({
    company: 'Grab Vietnam',
    position: 'Staff Platform Engineer',
    stage: 'Interview',
    tone: 'post_interview_thank_you',
    candidateName: 'Nguyễn Văn A',
    recruiterName: 'Chị Lan HR',
    discussionHighlight: 'kiến trúc Distributed Tracing và High Throughput Kafka'
  });

  assert.ok(result.subject.includes('Grab Vietnam'));
  assert.ok(result.subject.includes('Staff Platform Engineer'));
  assert.ok(result.subject.includes('Nguyễn Văn A'));
  assert.ok(result.body.includes('Chị Lan HR'));
  assert.ok(result.body.includes('Distributed Tracing'));
  assert.ok(!result.body.includes('{{'));
  assert.ok(result.keySuggestions.length > 0);
});

test('contract: validateFollowUpLogInput validates schema bounds and required fields', () => {
  const valid = validateFollowUpLogInput({
    applicationId: 'app-999',
    stage: 'Interview',
    tone: 'post_interview_thank_you',
    subject: 'Cảm ơn buổi phỏng vấn ngày hôm nay',
    body: 'Tôi xin chân thành cảm ơn quý công ty đã dành thời gian trao đổi...',
    recipientEmail: 'recruiter@example.com',
    notes: 'Đã gửi qua email lúc 14:00'
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.applicationId, 'app-999');
    assert.equal(valid.data.tone, 'post_interview_thank_you');
  }

  const invalid = validateFollowUpLogInput({
    applicationId: '',
    subject: '',
    body: 'Ngắn'
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors?.applicationId);
  assert.ok(invalid.errors?.subject);
  assert.ok(invalid.errors?.body);
});

test('contract: deriveRecommendedReconnectDays calculates expected cadence based on relationship strength and type', () => {
  assert.equal(deriveRecommendedReconnectDays('advocate', 'referrer'), 30);
  assert.equal(deriveRecommendedReconnectDays('in_touch', 'peer'), 45);
  assert.equal(deriveRecommendedReconnectDays('connected', 'peer'), 60);
  assert.equal(deriveRecommendedReconnectDays('lead', 'recruiter'), 45);
  assert.equal(deriveRecommendedReconnectDays('lead', 'peer'), 90);
});

test('contract: calculateRelationshipHealth flags dormant and due contacts with actionable suggestions', () => {
  const now = new Date();
  const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString();
  const hundredDaysAgo = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000).toISOString();

  const advocateContact: ContactDTO = {
    id: 'cnt-01',
    name: 'Anh Hoàng Tech Lead',
    company: 'VNG',
    type: 'referrer',
    relationshipStrength: 'advocate',
    lastContactedAt: fortyDaysAgo,
    createdAt: hundredDaysAgo,
    updatedAt: fortyDaysAgo
  };

  const healthAdvocate = calculateRelationshipHealth(advocateContact);
  assert.equal(healthAdvocate.isReconnectDue, true);
  assert.equal(healthAdvocate.isDormant, false);
  assert.equal(healthAdvocate.healthStatus, 'due');
  assert.ok(healthAdvocate.suggestedAction.includes('người giới thiệu'));

  const dormantContact: ContactDTO = {
    id: 'cnt-02',
    name: 'Chị Mai Recruiter',
    company: 'Shopee',
    type: 'recruiter',
    relationshipStrength: 'connected',
    lastContactedAt: hundredDaysAgo,
    createdAt: hundredDaysAgo,
    updatedAt: hundredDaysAgo
  };

  const healthDormant = calculateRelationshipHealth(dormantContact);
  assert.equal(healthDormant.isDormant, true);
  assert.equal(healthDormant.healthStatus, 'dormant');
  assert.ok(healthDormant.suggestedAction.includes('hâm nóng quan hệ'));
});

test('contract: validateContactInput enforces required name and company and validates email and url', () => {
  const valid = validateContactInput({
    name: 'Trần Văn B',
    company: 'FPT Software',
    role: 'Engineering Manager',
    type: 'hiring_manager',
    email: 'b.tran@fpt.com',
    phone: '0901234567',
    linkedinUrl: 'https://linkedin.com/in/vantran',
    relationshipStrength: 'in_touch'
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.name, 'Trần Văn B');
    assert.equal(valid.data.company, 'FPT Software');
    assert.equal(valid.data.type, 'hiring_manager');
  }

  const invalid = validateContactInput({
    name: '',
    company: '',
    email: 'not-an-email',
    linkedinUrl: 'ftp://bad-scheme.com'
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors?.name);
  assert.ok(invalid.errors?.company);
  assert.ok(invalid.errors?.email);
  assert.ok(invalid.errors?.linkedinUrl);
});

test('contract: validateInteractionInput validates channel and required summary', () => {
  const valid = validateInteractionInput({
    channel: 'coffee',
    summary: 'Gặp gỡ trao đổi về văn hóa đội ngũ kỹ thuật',
    details: 'Anh B chia sẻ định hướng mở rộng team Golang trong quý tới.'
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.channel, 'coffee');
    assert.ok(valid.data.summary.includes('văn hóa'));
  }

  const invalid = validateInteractionInput({
    channel: 'invalid_channel',
    summary: ''
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors?.summary);
});

test('contract: calculateStageSla evaluates SLA thresholds and stagnation severity correctly', () => {
  const normal = calculateStageSla('Applied', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000));
  assert.equal(normal.stage, 'Applied');
  assert.equal(normal.daysInStage, 3);
  assert.equal(normal.maxRecommendedDays, 14);
  assert.equal(normal.isStagnant, false);
  assert.equal(normal.slaSeverity, 'normal');

  const warning = calculateStageSla('Interview', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000));
  assert.equal(warning.stage, 'Interview');
  assert.equal(warning.daysInStage, 8);
  assert.equal(warning.maxRecommendedDays, 7);
  assert.equal(warning.isStagnant, true);
  assert.equal(warning.slaSeverity, 'warning');

  const critical = calculateStageSla('Applied', new Date(Date.now() - 25 * 24 * 60 * 60 * 1000));
  assert.equal(critical.isStagnant, true);
  assert.equal(critical.slaSeverity, 'critical');
  assert.ok(critical.recommendation.includes('LinkedIn') || critical.recommendation.includes('follow-up'));

  const rejected = calculateStageSla('Rejected', new Date(Date.now() - 50 * 24 * 60 * 60 * 1000));
  assert.equal(rejected.isStagnant, false);
  assert.equal(rejected.slaSeverity, 'normal');
});

test('contract: validatePipelineMetadataInput validates priority and tags', () => {
  const valid = validatePipelineMetadataInput({
    priority: 'urgent',
    tags: ['#remote', 'Golang', '#FinTech', 'remote'],
    statusUpdatedAt: '2026-10-20T00:00:00.000Z'
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.priority, 'urgent');
    assert.deepEqual(valid.data.tags, ['remote', 'golang', 'fintech']);
    assert.ok(valid.data.statusUpdatedAt);
  }

  const invalid = validatePipelineMetadataInput({
    priority: 'invalid_priority',
    tags: 'not_an_array',
    statusUpdatedAt: 'invalid_date'
  });

  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors?.priority);
  assert.ok(invalid.errors?.tags);
  assert.ok(invalid.errors?.statusUpdatedAt);
});

test('contract: normalizeWeights computes normalized 100% distribution correctly and handles partial/empty inputs', () => {
  const defaults = normalizeWeights();
  assert.equal(defaults.compensation, 25);
  assert.equal(defaults.work_life_balance, 20);
  assert.equal(defaults.career_growth, 20);
  assert.equal(defaults.company_culture, 15);
  assert.equal(defaults.commute_flexibility, 10);
  assert.equal(defaults.leadership_team, 5);
  assert.equal(defaults.tech_stack, 5);

  const sumDefaults = Object.values(defaults).reduce((a, b) => a + b, 0);
  assert.equal(sumDefaults, 100);

  const custom = normalizeWeights({
    compensation: 50,
    work_life_balance: 50
  });
  const sumCustom = Object.values(custom).reduce((a, b) => a + b, 0);
  assert.equal(sumCustom, 100);
  assert.ok(custom.compensation > custom.tech_stack);

  const zero = normalizeWeights({
    compensation: 0,
    work_life_balance: 0,
    career_growth: 0,
    company_culture: 0,
    commute_flexibility: 0,
    leadership_team: 0,
    tech_stack: 0
  });
  assert.equal(zero.compensation, 25);
});

test('contract: calculateCompositeScore calculates accurate weighted score (0-100) and clamps bounds', () => {
  const perfectScores = {
    compensation: 10,
    work_life_balance: 10,
    career_growth: 10,
    company_culture: 10,
    commute_flexibility: 10,
    leadership_team: 10,
    tech_stack: 10
  };
  const perfectResult = calculateCompositeScore(perfectScores, DEFAULT_WEIGHT_PROFILE);
  assert.equal(perfectResult, 100);

  const minScores = {
    compensation: 1,
    work_life_balance: 1,
    career_growth: 1,
    company_culture: 1,
    commute_flexibility: 1,
    leadership_team: 1,
    tech_stack: 1
  };
  const minResult = calculateCompositeScore(minScores, DEFAULT_WEIGHT_PROFILE);
  assert.equal(minResult, 10);

  const mixedScores = {
    compensation: 8,
    work_life_balance: 6,
    career_growth: 9,
    company_culture: 7,
    commute_flexibility: 8,
    leadership_team: 5,
    tech_stack: 8
  };
  const mixedResult = calculateCompositeScore(mixedScores, DEFAULT_WEIGHT_PROFILE);
  assert.ok(mixedResult >= 70 && mixedResult <= 80);
});

test('contract: evaluateDecisionMatrix ranks multiple opportunities, detects strengths/weaknesses, and selects category winners', () => {
  const items = [
    {
      id: 'app-google',
      company: 'Google',
      position: 'Senior Software Engineer',
      status: 'Offer',
      scores: {
        compensation: 10,
        work_life_balance: 6,
        career_growth: 8,
        company_culture: 7,
        commute_flexibility: 6,
        leadership_team: 8,
        tech_stack: 8
      }
    },
    {
      id: 'app-startup',
      company: 'FinTech Startup',
      position: 'Lead Engineer',
      status: 'Interview',
      scores: {
        compensation: 7,
        work_life_balance: 3,
        career_growth: 10,
        company_culture: 8,
        commute_flexibility: 9,
        leadership_team: 7,
        tech_stack: 9
      }
    },
    {
      id: 'app-corp',
      company: 'Enterprise Corp',
      position: 'Backend Developer',
      status: 'Screening',
      scores: {
        compensation: 6,
        work_life_balance: 9,
        career_growth: 4,
        company_culture: 6,
        commute_flexibility: 8,
        leadership_team: 5,
        tech_stack: 4
      }
    }
  ];

  const result = evaluateDecisionMatrix(items);
  assert.equal(result.totalCompared, 3);
  assert.ok(result.topPickId);
  assert.equal(result.opportunities.length, 3);
  assert.equal(result.opportunities[0].rank, 1);
  assert.equal(result.opportunities[1].rank, 2);
  assert.equal(result.opportunities[2].rank, 3);
  assert.ok(result.opportunities[0].compositeScore >= result.opportunities[1].compositeScore);

  const startup = result.opportunities.find((o) => o.id === 'app-startup');
  assert.ok(startup);
  assert.ok(startup.strengths.includes('career_growth'));
  assert.ok(startup.weaknesses.includes('work_life_balance'));

  const compWinner = result.categoryWinners.find((w) => w.dimension === 'compensation');
  assert.ok(compWinner);
  assert.equal(compWinner.company, 'Google');
  assert.equal(compWinner.score, 10);

  const wlbWinner = result.categoryWinners.find((w) => w.dimension === 'work_life_balance');
  assert.ok(wlbWinner);
  assert.equal(wlbWinner.company, 'Enterprise Corp');
  assert.equal(wlbWinner.score, 9);
});

test('contract: validateWeightsInput and validateScorecardInput enforce bounds and valid schemas', () => {
  const validWeights = validateWeightsInput({
    compensation: 30,
    work_life_balance: 20,
    career_growth: 20,
    company_culture: 15,
    commute_flexibility: 15
  });
  assert.equal(validWeights.ok, true);

  const invalidWeights = validateWeightsInput({
    compensation: 150,
    work_life_balance: -10
  });
  assert.equal(invalidWeights.ok, false);
  assert.ok(invalidWeights.errors?.compensation);
  assert.ok(invalidWeights.errors?.work_life_balance);

  const validScorecard = validateScorecardInput({
    scores: {
      compensation: 8,
      work_life_balance: 7,
      career_growth: 9
    },
    notes: 'Rất ấn tượng với phúc lợi và công nghệ của team'
  });
  assert.equal(validScorecard.ok, true);
  if (validScorecard.ok) {
    assert.equal(validScorecard.data.scores.compensation, 8);
    assert.equal(validScorecard.data.notes, 'Rất ấn tượng với phúc lợi và công nghệ của team');
  }

  const invalidScorecard = validateScorecardInput({
    scores: {
      compensation: 15,
      career_growth: 0
    }
  });
  assert.equal(invalidScorecard.ok, false);
  assert.ok(invalidScorecard.errors?.['scores.compensation']);
  assert.ok(invalidScorecard.errors?.['scores.career_growth']);
});

test('contract: validateChatInput validates required message text, bounds, session and context', () => {
  const valid = validateChatInput({
    message: 'Tóm tắt các buổi phỏng vấn sắp tới trong tuần này',
    sessionId: 'session-xyz-123',
    context: {
      pathname: '/interviews',
      applicationId: 'app-abc'
    }
  });

  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.message, 'Tóm tắt các buổi phỏng vấn sắp tới trong tuần này');
    assert.equal(valid.data.sessionId, 'session-xyz-123');
    assert.equal(valid.data.context?.pathname, '/interviews');
  }

  const emptyMsg = validateChatInput({
    message: '   '
  });
  assert.equal(emptyMsg.ok, false);
  assert.ok(emptyMsg.errors?.message);

  const nonStringMsg = validateChatInput({
    message: 12345
  });
  assert.equal(nonStringMsg.ok, false);
  assert.ok(nonStringMsg.errors?.message);

  const longMsg = validateChatInput({
    message: 'a'.repeat(2001)
  });
  assert.equal(longMsg.ok, false);
  assert.ok(longMsg.errors?.message);

  const invalidSession = validateChatInput({
    message: 'Xin chào',
    sessionId: 's'.repeat(125)
  });
  assert.equal(invalidSession.ok, false);
  assert.ok(invalidSession.errors?.sessionId);

  const nonObject = validateChatInput('not-an-object');
  assert.equal(nonObject.ok, false);
  assert.ok(nonObject.errors?.root);
});

test('contract: parseChatMarkdown parses headings, lists, code blocks, and paragraphs', () => {
  const text = `# Báo cáo tổng hợp
## Tình trạng hồ sơ
Dưới đây là danh sách việc làm đang chờ:
- VNG: Chờ phản hồi vòng 2
* FPT: Chuẩn bị làm bài test
• Shopee: Phỏng vấn ngày mai

1. Bước một: Ôn tập System Design
2. Bước hai: Gửi email follow-up

\`\`\`json
{"status": "ok"}
\`\`\`

Đoạn văn kết thúc buổi làm việc.`;

  const blocks = parseChatMarkdown(text);
  assert.ok(blocks.length >= 6);

  const h1 = blocks.find((b) => b.type === 'heading' && b.level === 1);
  assert.ok(h1);
  assert.equal(h1.content, 'Báo cáo tổng hợp');

  const h2 = blocks.find((b) => b.type === 'heading' && b.level === 2);
  assert.ok(h2);
  assert.equal(h2.content, 'Tình trạng hồ sơ');

  const bulletList = blocks.find((b) => b.type === 'bullet_list');
  assert.ok(bulletList);
  assert.equal(bulletList.items?.length, 3);
  assert.ok(bulletList.items?.[0].includes('VNG'));

  const numList = blocks.find((b) => b.type === 'numbered_list');
  assert.ok(numList);
  assert.equal(numList.items?.length, 2);
  assert.ok(numList.items?.[0].includes('Bước một'));

  const code = blocks.find((b) => b.type === 'code_block');
  assert.ok(code);
  assert.ok(code.content.includes('"status": "ok"'));

  const emptyResult = parseChatMarkdown('');
  assert.deepEqual(emptyResult, []);
});

test('contract: DEFAULT_SUGGESTED_CHAT_PROMPTS provides actionable career queries', () => {
  assert.ok(DEFAULT_SUGGESTED_CHAT_PROMPTS.length >= 3);
  assert.ok(DEFAULT_SUGGESTED_CHAT_PROMPTS.some((p) => p.includes('phỏng vấn')));
  assert.ok(DEFAULT_SUGGESTED_CHAT_PROMPTS.some((p) => p.includes('hồ sơ')));
});

test('contract: extractSkillsFromText detects core technologies and aliases correctly', () => {
  const sample = 'Looking for a Senior React and TypeScript specialist with experience in Next.js, Docker and PostgreSQL.';
  const detected = extractSkillsFromText(sample);
  const names = detected.map((d) => d.name);
  assert.ok(names.includes('React'));
  assert.ok(names.includes('TypeScript'));
  assert.ok(names.includes('Next.js'));
  assert.ok(names.includes('Docker'));
  assert.ok(names.includes('PostgreSQL'));
  assert.deepEqual(extractSkillsFromText(''), []);
});

test('contract: extractSkillsFromApplications aggregates demand and identifies missing skills with coverage score', () => {
  const apps = [
    { position: 'Senior React Engineer', company: 'VNG', notes: 'Yêu cầu vững TypeScript, Redux, Docker' },
    { position: 'Frontend Tech Lead', company: 'Shopee', notes: 'Kiến trúc Next.js, System Design và Kubernetes' },
    { position: 'Fullstack Developer', company: 'FPT', notes: 'Node.js, PostgreSQL và React' }
  ];
  const candidateSkills = ['React', 'TypeScript', 'Node.js'];

  const analysis = extractSkillsFromApplications(apps, candidateSkills);
  assert.ok(analysis.coverageScore < 100);
  assert.ok(analysis.coverageScore > 20);
  assert.ok(analysis.matchedSkills.includes('React'));
  assert.ok(analysis.matchedSkills.includes('TypeScript'));
  assert.ok(analysis.matchedSkills.includes('Node.js'));
  
  const missingNames = analysis.missingSkills.map((m) => m.skill);
  assert.ok(missingNames.includes('Docker') || missingNames.includes('PostgreSQL') || missingNames.includes('System Design'));
  assert.equal(analysis.totalApplicationsAnalyzed, 3);
  assert.ok(analysis.recommendedFocusSkills.length > 0);
});

test('contract: generateCareerRoadmap synthesizes structured 4-week milestones with curated resources', () => {
  const dummyAnalysis = {
    coverageScore: 60,
    matchedSkills: ['React', 'TypeScript'],
    missingSkills: [],
    topInDemandSkills: [],
    totalApplicationsAnalyzed: 2,
    recommendedFocusSkills: ['Kubernetes', 'System Design', 'PostgreSQL', 'Docker'],
    generatedAt: new Date().toISOString()
  };

  const roadmap = generateCareerRoadmap(dummyAnalysis, 'Principal Frontend Engineer');
  assert.equal(roadmap.durationWeeks, 4);
  assert.equal(roadmap.targetRole, 'Principal Frontend Engineer');
  assert.equal(roadmap.milestones.length, 4);
  assert.equal(roadmap.milestones[0].week, 1);
  assert.equal(roadmap.milestones[3].week, 4);
  assert.ok(roadmap.milestones[0].resources.length > 0);
  assert.equal(roadmap.overallProgressPercent, 0);
});

test('contract: calculateRoadmapProgress computes weighted completion percentage', () => {
  const sampleMilestones = [
    { id: 'm1', week: 1, title: 'W1', description: '', skill: 'React', category: 'frontend' as const, estimatedHours: 8, status: 'completed' as const, resources: [] },
    { id: 'm2', week: 2, title: 'W2', description: '', skill: 'Docker', category: 'devops' as const, estimatedHours: 8, status: 'in_progress' as const, resources: [] },
    { id: 'm3', week: 3, title: 'W3', description: '', skill: 'K8s', category: 'devops' as const, estimatedHours: 8, status: 'pending' as const, resources: [] },
    { id: 'm4', week: 4, title: 'W4', description: '', skill: 'Design', category: 'architecture' as const, estimatedHours: 8, status: 'pending' as const, resources: [] }
  ];

  const progress = calculateRoadmapProgress(sampleMilestones);
  assert.equal(progress, 35);
  assert.equal(calculateRoadmapProgress([]), 0);
});

test('contract: validateMilestoneUpdateInput and validateRoadmapGenerateInput validate schema correctly', () => {
  const validMilestone = validateMilestoneUpdateInput({ status: 'completed' });
  assert.equal(validMilestone.ok, true);
  assert.equal(validMilestone.data?.status, 'completed');

  const invalidMilestone = validateMilestoneUpdateInput({ status: 'unknown_status' });
  assert.equal(invalidMilestone.ok, false);

  const validGen = validateRoadmapGenerateInput({ targetRole: 'Lead Architect', focusSkills: ['Docker', 'AWS'] });
  assert.equal(validGen.ok, true);
  assert.equal(validGen.data?.targetRole, 'Lead Architect');
  assert.deepEqual(validGen.data?.focusSkills, ['Docker', 'AWS']);
});

test('contract: detectEmailCategory accurately categorizes various recruitment emails', () => {
  const interviewRes = detectEmailCategory('Chúng tôi xin gửi thư mời phỏng vấn kỹ thuật vào 14:00 ngày mai', 'Thư mời phỏng vấn');
  assert.equal(interviewRes.category, 'interview_invitation');
  assert.ok(interviewRes.confidence >= 90);

  const offerRes = detectEmailCategory('Chúc mừng bạn đã trúng tuyển. Đính kèm là Job Offer Letter và mức lương gross 45M', 'Thư mời nhận việc');
  assert.equal(offerRes.category, 'offer');
  assert.ok(offerRes.confidence >= 90);

  const rejectRes = detectEmailCategory('Rất tiếc hồ sơ của bạn chưa phù hợp với tiêu chí hiện tại của công ty', 'Thông báo kết quả tuyển dụng');
  assert.equal(rejectRes.category, 'rejection');
  assert.ok(rejectRes.confidence >= 90);

  const ackRes = detectEmailCategory('Chúng tôi đã nhận được hồ sơ ứng tuyển của bạn và sẽ phản hồi sớm', 'Xác nhận nhận hồ sơ');
  assert.equal(ackRes.category, 'application_ack');
});

test('contract: extractMeetingLink detects Zoom, Google Meet, and MS Teams links', () => {
  const gMeet = extractMeetingLink('Link phỏng vấn trực tuyến: https://meet.google.com/abc-defg-hij vui lòng tham gia đúng giờ.');
  assert.equal(gMeet?.platform, 'Google Meet');
  assert.equal(gMeet?.url, 'https://meet.google.com/abc-defg-hij');

  const zoom = extractMeetingLink('Vui lòng tham gia phòng họp: https://us02web.zoom.us/j/1234567890?pwd=abc');
  assert.equal(zoom?.platform, 'Zoom');
  assert.equal(zoom?.url, 'https://us02web.zoom.us/j/1234567890?pwd=abc');

  const teams = extractMeetingLink('Họp qua MS Teams: https://teams.microsoft.com/l/meetup-join/19%3ameeting_xyz');
  assert.equal(teams?.platform, 'Microsoft Teams');

  assert.equal(extractMeetingLink('Không có link họp trực tiếp'), null);
});

test('contract: parseEmailContent extracts company, role, datetime, and recruiter details', () => {
  const emailText = `Chào bạn,
Phòng Tuyển dụng VNG Corporation trân trọng mời bạn tham gia vòng phỏng vấn vị trí Senior React Engineer.
Thời gian: 15:30 ngày 25/11/2026.
Hình thức: Phỏng vấn trực tuyến qua Google Meet https://meet.google.com/xyz-uvwx-rst
Nếu cần hỗ trợ, vui lòng liên hệ:
Trân trọng,
Nguyễn Hoàng Lan
Email: lannh@vng.com.vn
SĐT: 0912345678`;

  const parsed = parseEmailContent(emailText, 'Thư mời phỏng vấn - VNG Corporation', 'recruitment@vng.com.vn');
  assert.equal(parsed.category, 'interview_invitation');
  assert.equal(parsed.company, 'VNG Corporation');
  assert.equal(parsed.position, 'Senior React Engineer');
  assert.equal(parsed.targetStatus, 'Interview');
  assert.equal(parsed.interviewSchedule?.format, 'Google Meet');
  assert.equal(parsed.interviewSchedule?.meetingUrl, 'https://meet.google.com/xyz-uvwx-rst');
  assert.equal(parsed.recruiter?.name, 'Nguyễn Hoàng Lan');
  assert.equal(parsed.recruiter?.email, 'lannh@vng.com.vn');
  assert.equal(parsed.recruiter?.phone, '0912345678');
});

test('contract: generateIngestionProposal creates proposal based on existing pipeline matching', () => {
  const existingApps = [
    { id: 'app-fpt-1', company: 'FPT Software', position: 'Backend Engineer', status: 'Applied' },
    { id: 'app-vng-2', company: 'VNG Corporation', position: 'Senior React Engineer', status: 'Screening' }
  ];

  const parsedVng = parseEmailContent(
    'Mời phỏng vấn tại VNG Corporation ngày 10:00 ngày 28/11/2026 qua https://meet.google.com/abc-defg-hij',
    'Lịch phỏng vấn VNG'
  );
  const proposalVng = generateIngestionProposal(parsedVng, existingApps);
  assert.equal(proposalVng.actionType, 'schedule_interview');
  assert.equal(proposalVng.matchedApplicationId, 'app-vng-2');
  assert.ok(proposalVng.proposedInterview);
  assert.equal(proposalVng.proposedInterview.format, 'Google Meet');

  const parsedNew = parseEmailContent(
    'Cảm ơn bạn đã ứng tuyển vị trí DevOps Engineer tại Shopee.',
    'Shopee Job Application'
  );
  const proposalNew = generateIngestionProposal(parsedNew, existingApps);
  assert.equal(proposalNew.actionType, 'create_application');
  assert.equal(proposalNew.matchedApplicationId, null);
  assert.equal(proposalNew.proposedApplication?.company, 'Shopee');
});

test('contract: validateEmailParseInput and validateEmailApplyInput validate schemas strictly', () => {
  const validParse = validateEmailParseInput({
    emailContent: 'Thư mời phỏng vấn tại FPT',
    subject: 'Interview',
    sender: 'hr@fpt.com'
  });
  assert.equal(validParse.ok, true);

  const invalidParse = validateEmailParseInput({ emailContent: '   ' });
  assert.equal(invalidParse.ok, false);

  const validApply = validateEmailApplyInput({
    actionType: 'create_application',
    confidenceScore: 90,
    summary: 'Tạo hồ sơ mới',
    proposedApplication: {
      company: 'Shopee',
      position: 'Backend Developer',
      status: 'Applied'
    },
    changesSummary: ['Tạo mới hồ sơ']
  });
  assert.equal(validApply.ok, true);

  const invalidApply = validateEmailApplyInput({ actionType: 'unsupported_action' });
  assert.equal(invalidApply.ok, false);
});

test('contract: generateOutreachSequence generates 3 contextual steps with delays for all objectives', () => {
  const referralSteps = generateOutreachSequence('referral_request', 'engineer', 'Backend Lead', 'Shopee');
  assert.equal(referralSteps.length, 3);
  assert.equal(referralSteps[0].delayDays, 0);
  assert.equal(referralSteps[1].delayDays, 3);
  assert.equal(referralSteps[2].delayDays, 6);
  assert.ok(referralSteps[2].title.includes('Referral'));

  const coffeeSteps = generateOutreachSequence('coffee_chat', 'alumni', 'Software Engineer', 'Grab');
  assert.equal(coffeeSteps.length, 3);
  assert.ok(coffeeSteps[0].title.includes('Coffee Chat') || coffeeSteps[0].title.includes('trò chuyện'));

  const recruiterSteps = generateOutreachSequence('recruiter_intro', 'recruiter', 'DevOps Specialist', 'VNG');
  assert.equal(recruiterSteps.length, 3);
  assert.equal(recruiterSteps[1].channel, 'email');
});

test('contract: personalizeMessage replaces placeholders with provided recipient parameters', () => {
  const template = 'Chào anh/chị {{name}}, em đang quan tâm vị trí {{role}} tại {{company}}. Em có thế mạnh về {{my_strength}}.';
  const personalized = personalizeMessage(template, {
    name: 'Phương Linh',
    role: 'Staff Platform Engineer',
    company: 'One Mount',
    my_strength: 'Kubernetes và Golang'
  });
  assert.equal(
    personalized,
    'Chào anh/chị Phương Linh, em đang quan tâm vị trí Staff Platform Engineer tại One Mount. Em có thế mạnh về Kubernetes và Golang.'
  );

  const partial = personalizeMessage('Xin chào {{name}} - {{undefined_key}}', { name: 'Nam' });
  assert.equal(partial, 'Xin chào Nam - ');
});

test('contract: computeCampaignMetrics calculates sent, reply rate, and referral rate percentages accurately', () => {
  const emptyMetrics = computeCampaignMetrics([]);
  assert.equal(emptyMetrics.totalRecipients, 0);
  assert.equal(emptyMetrics.replyRate, 0);
  assert.equal(emptyMetrics.referralRate, 0);

  const mockRecipients: OutreachRecipientDTO[] = [
    {
      id: 'rec-1',
      campaignId: 'camp-1',
      contactId: null,
      name: 'Nguyen Van A',
      title: 'Senior Engineer',
      company: 'Shopee',
      channel: 'linkedin',
      email: null,
      linkedinUrl: null,
      currentStepIndex: 1,
      status: 'sent',
      lastContactedAt: '2026-10-20T10:00:00Z',
      notes: '',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z'
    },
    {
      id: 'rec-2',
      campaignId: 'camp-1',
      contactId: null,
      name: 'Tran Thi B',
      title: 'Engineering Manager',
      company: 'Shopee',
      channel: 'linkedin',
      email: null,
      linkedinUrl: null,
      currentStepIndex: 2,
      status: 'replied',
      lastContactedAt: '2026-10-22T14:00:00Z',
      notes: '',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-22T14:00:00Z'
    },
    {
      id: 'rec-3',
      campaignId: 'camp-1',
      contactId: null,
      name: 'Le Van C',
      title: 'Principal Architect',
      company: 'Shopee',
      channel: 'linkedin',
      email: null,
      linkedinUrl: null,
      currentStepIndex: 3,
      status: 'referred',
      lastContactedAt: '2026-10-24T16:00:00Z',
      notes: '',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-24T16:00:00Z'
    },
    {
      id: 'rec-4',
      campaignId: 'camp-1',
      contactId: null,
      name: 'Pham Van D',
      title: 'Tech Lead',
      company: 'Shopee',
      channel: 'linkedin',
      email: null,
      linkedinUrl: null,
      currentStepIndex: 0,
      status: 'pending',
      lastContactedAt: null,
      notes: '',
      createdAt: '2026-10-20T10:00:00Z',
      updatedAt: '2026-10-20T10:00:00Z'
    }
  ];

  const metrics = computeCampaignMetrics(mockRecipients);
  assert.equal(metrics.totalRecipients, 4);
  assert.equal(metrics.totalSent, 3);
  assert.equal(metrics.totalReplied, 2);
  assert.equal(metrics.totalReferred, 1);
  assert.equal(metrics.replyRate, 66.7);
  assert.equal(metrics.referralRate, 33.3);
});

test('contract: validateCreateCampaignInput and validateUpdateRecipientStepInput strictly enforce schemas', () => {
  const validCampaign = validateCreateCampaignInput({
    name: 'Chiến dịch Referral Shopee Q4',
    objective: 'referral_request',
    targetType: 'engineer',
    targetCompany: 'Shopee Vietnam',
    targetRole: 'Senior Frontend Engineer'
  });
  assert.equal(validCampaign.valid, true);

  const invalidCampaign = validateCreateCampaignInput({
    name: '',
    objective: 'invalid_objective',
    targetType: 'engineer',
    targetCompany: '',
    targetRole: ''
  });
  assert.equal(invalidCampaign.valid, false);
  assert.ok(invalidCampaign.errors.length >= 3);

  const validStep = validateUpdateRecipientStepInput({
    currentStepIndex: 2,
    status: 'replied'
  });
  assert.equal(validStep.valid, true);

  const invalidStep = validateUpdateRecipientStepInput({
    currentStepIndex: -1,
    status: 'unknown_status'
  });
  assert.equal(invalidStep.valid, false);
});

test('contract: generateSimulationQuestions generates 3 contextual questions across different tracks and difficulties', () => {
  const sysDesignSenior = generateSimulationQuestions('system_design', 'senior', 'Principal Architect', 'Shopee');
  assert.equal(sysDesignSenior.length, 3);
  assert.ok(sysDesignSenior[0].includes('notification') || sysDesignSenior[0].includes('distributed'));

  const behavioralMid = generateSimulationQuestions('behavioral_star', 'mid', 'Backend Engineer', 'Tiki');
  assert.equal(behavioralMid.length, 3);
  assert.ok(behavioralMid[0].includes('dự án') || behavioralMid[0].includes('khó khăn'));

  const techDeep = generateSimulationQuestions('technical_deepdive', 'senior', 'Go Lead', 'VNG');
  assert.equal(techDeep.length, 3);
  assert.ok(techDeep[0].includes('Event Loop') || techDeep[0].includes('tech stack'));
});

test('contract: evaluateSimulationTurn calculates structure, technical depth, metrics, and timing penalties accurately', () => {
  const answerGood = `Tình huống là hệ thống thanh toán gặp lỗi timeout. Nhiệm vụ của tôi là tối ưu Redis caching và PostgreSQL connection pool. Tôi đã triển khai sharding và Kafka queue. Kết quả là giảm latency từ 450ms xuống còn 35ms (giảm 92%) và chịu tải 25,000 req/s.`;
  const evaluationGood = evaluateSimulationTurn(
    'Thiết kế giải pháp chịu tải cao',
    answerGood,
    90,
    'standard_2min',
    'system_design'
  );

  assert.ok(evaluationGood.structureScore >= 80);
  assert.ok(evaluationGood.metricImpactScore >= 85);
  assert.ok(evaluationGood.technicalDepthScore >= 70);
  assert.ok(evaluationGood.compositeScore >= 75);
  assert.ok(evaluationGood.strengths.length > 0);
  assert.ok(evaluationGood.exemplarAnswer.length > 20);

  const answerWeak = `Tôi chỉ làm việc chăm chỉ và sửa code.`;
  const evaluationWeak = evaluateSimulationTurn(
    'Kể về sai lầm kỹ thuật',
    answerWeak,
    200,
    'standard_2min',
    'behavioral_star'
  );

  assert.ok(evaluationWeak.compositeScore < 50);
  assert.ok(evaluationWeak.improvements.length > 0);
});

test('contract: synthesizeSessionReport aggregates scores, assigns readiness grade, and suggests focus areas', () => {
  const mockTurns = [
    {
      turnNumber: 1,
      question: 'Q1',
      answer: 'A1',
      timeTakenSeconds: 80,
      structureScore: 90,
      technicalDepthScore: 85,
      metricImpactScore: 95,
      compositeScore: 90,
      strengths: ['Bố cục mạch lạc', 'Số liệu thuyết phục'],
      improvements: [],
      exemplarAnswer: 'Exemplar 1'
    },
    {
      turnNumber: 2,
      question: 'Q2',
      answer: 'A2',
      timeTakenSeconds: 95,
      structureScore: 85,
      technicalDepthScore: 80,
      metricImpactScore: 85,
      compositeScore: 83,
      strengths: ['Am hiểu công nghệ'],
      improvements: ['Cần kết nối số liệu'],
      exemplarAnswer: 'Exemplar 2'
    }
  ];

  const report = synthesizeSessionReport(mockTurns);
  assert.equal(report.overallScore, 87);
  assert.equal(report.readinessGrade, 'Ready');
  assert.ok(report.topStrengths.length >= 2);
  assert.ok(report.summary.includes('Ready'));

  const emptyReport = synthesizeSessionReport([]);
  assert.equal(emptyReport.overallScore, 0);
  assert.equal(emptyReport.readinessGrade, 'High Risk');
});

test('contract: validateStartSimulationInput and validateSubmitTurnInput validate schemas strictly', () => {
  const validStart = validateStartSimulationInput({
    targetRole: 'Senior Backend Engineer',
    targetCompany: 'Shopee Vietnam',
    track: 'system_design',
    difficulty: 'senior',
    pacingMode: 'standard_2min'
  });
  assert.equal(validStart.valid, true);

  const invalidStart = validateStartSimulationInput({
    targetRole: '',
    targetCompany: '',
    track: 'unsupported_track',
    difficulty: 'unknown',
    pacingMode: 'invalid'
  });
  assert.equal(invalidStart.valid, false);
  assert.ok(invalidStart.errors.length >= 4);

  const validTurn = validateSubmitTurnInput({
    answer: 'Câu trả lời chi tiết...',
    timeTakenSeconds: 75
  });
  assert.equal(validTurn.valid, true);

  const invalidTurn = validateSubmitTurnInput({
    answer: '',
    timeTakenSeconds: -5
  });
  assert.equal(invalidTurn.valid, false);
});

test('contract: generateVerificationFingerprint and verifyDossierIntegrity work deterministically', () => {
  const payload = {
    slug: 'tan-tech-lead',
    targetRoles: ['Staff Engineer', 'Engineering Manager'],
    topSkills: ['Go', 'Kubernetes', 'System Design'],
    verifiedAt: '2026-10-25T00:00:00.000Z'
  };

  const fp1 = generateVerificationFingerprint(payload);
  const fp2 = generateVerificationFingerprint(payload);

  assert.equal(typeof fp1, 'string');
  assert.equal(fp1.length, 64);
  assert.equal(fp1, fp2);

  const tamperedPayload = {
    ...payload,
    topSkills: ['Go', 'Kubernetes', 'Tampered Skill']
  };
  const fpTampered = generateVerificationFingerprint(tamperedPayload);
  assert.notEqual(fp1, fpTampered);
});

test('contract: synthesizePublicDossier respects privacy and anonymization settings', () => {
  const config: PortfolioConfigDTO = {
    id: 'port-1',
    slug: 'alex-tran',
    title: 'Senior Distributed Systems Architect',
    bio: '10 năm kinh nghiệm scale hệ thống thanh toán hàng đầu',
    location: 'Hồ Chí Minh, Việt Nam',
    salaryExpectation: '80.000.000 - 100.000.000 VNĐ',
    targetRoles: ['Staff Engineer', 'Solutions Architect'],
    displaySettings: {
      showInterviews: false,
      showSalaryExpectation: false,
      showRoadmapProgress: true,
      showTopSkills: true,
      showSimulationScore: true,
      anonymizeCandidateName: true
    },
    isPublic: true,
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  };

  const skills = [
    { name: 'Distributed Systems', category: 'Architecture', verified: true },
    { name: 'Kafka', category: 'Backend', verified: true }
  ];
  const roadmap = {
    targetRole: 'Staff Engineer',
    progressPercent: 75,
    completedMilestones: 3,
    totalMilestones: 4
  };
  const simulation = {
    grade: 'Ready' as const,
    score: 92,
    track: 'system_design'
  };

  const dossier = synthesizePublicDossier(config, 'Alex Trần', skills, roadmap, simulation, 4, '2026-10-25T00:00:00.000Z');

  assert.equal(dossier.candidateName.startsWith('Kỹ sư A***'), true);
  assert.equal(dossier.salaryExpectation, null);
  assert.equal(dossier.activeInterviewsCount, null);
  assert.ok(dossier.roadmapProgress);
  assert.equal(dossier.roadmapProgress?.progressPercent, 75);
  assert.equal(dossier.topSkills.length, 2);
  assert.equal(dossier.isVerified, true);
  assert.equal(verifyDossierIntegrity(dossier), true);

  const tamperedDossier = { ...dossier, topSkills: [] };
  assert.equal(verifyDossierIntegrity(tamperedDossier), false);
});

test('contract: validatePortfolioConfigInput and validateGenerateTokenInput validate rules strictly', () => {
  const validConfig = validatePortfolioConfigInput({
    title: 'Senior Software Engineer',
    slug: 'nguyen-van-a-2026',
    targetRoles: ['Senior Backend']
  });
  assert.equal(validConfig.valid, true);

  const invalidConfig = validatePortfolioConfigInput({
    title: '',
    slug: 'Invalid Slug!',
    targetRoles: []
  });
  assert.equal(invalidConfig.valid, false);
  assert.ok(invalidConfig.errors.length >= 3);

  const validToken = validateGenerateTokenInput({ expiryDays: 30 });
  assert.equal(validToken.valid, true);

  const invalidToken = validateGenerateTokenInput({ expiryDays: 500 });
  assert.equal(invalidToken.valid, false);
});

test('contract: computeVestingSchedule computes 4-year vesting milestones with cliff correctly', () => {
  const emptyVesting = computeVestingSchedule(undefined);
  assert.equal(emptyVesting.length, 4);
  assert.equal(emptyVesting[0].vestedSharesCumulative, 0);

  const grant: EquityGrantDTO = {
    type: 'esop',
    totalShares: 20000,
    strikePrice: 20000,
    currentFairMarketValue: 50000,
    vestingYears: 4,
    cliffMonths: 12
  };

  const schedule = computeVestingSchedule(grant);
  assert.equal(schedule.length, 4);
  assert.equal(schedule[0].year, 1);
  assert.equal(schedule[0].vestedSharesInYear, 5000);
  assert.equal(schedule[0].vestedSharesCumulative, 5000);
  assert.equal(schedule[0].estimatedGrossValue, 250000000);
  assert.equal(schedule[0].netGainValue, 150000000);

  assert.equal(schedule[3].year, 4);
  assert.equal(schedule[3].vestedSharesCumulative, 20000);
  assert.equal(schedule[3].netGainValue, 150000000);

  const longCliffGrant: EquityGrantDTO = {
    ...grant,
    cliffMonths: 18
  };
  const longCliffSchedule = computeVestingSchedule(longCliffGrant);
  assert.equal(longCliffSchedule[0].vestedSharesInYear, 0);
  assert.equal(longCliffSchedule[0].vestedSharesCumulative, 0);
});

test('contract: calculateNetTakeHomeVnd computes progressive PIT and insurance caps', () => {
  assert.equal(calculateNetTakeHomeVnd(0), 0);
  assert.equal(calculateNetTakeHomeVnd(-1000), 0);

  const net15m = calculateNetTakeHomeVnd(15000000);
  assert.ok(net15m > 12000000 && net15m < 15000000);

  const net55m = calculateNetTakeHomeVnd(55000000);
  assert.ok(net55m > 40000000 && net55m < 48000000);

  const net120m = calculateNetTakeHomeVnd(120000000);
  assert.ok(net120m > 75000000 && net120m < 95000000);
});

test('contract: forecastCompensationScenarios generates conservative, baseline, and optimistic projections', () => {
  const pkg: CompensationPackageDTO = {
    baseSalaryMonthly: 50000000,
    currency: 'VND',
    hasMonth13: true,
    performanceBonusAnnual: 50000000,
    equityGrant: {
      type: 'esop',
      totalShares: 12000,
      strikePrice: 10000,
      currentFairMarketValue: 30000,
      vestingYears: 4,
      cliffMonths: 12
    }
  };

  const scenarios = forecastCompensationScenarios(pkg);
  assert.ok(scenarios.conservative);
  assert.ok(scenarios.baseline);
  assert.ok(scenarios.optimistic);

  assert.equal(scenarios.conservative.annualBreakdowns.length, 4);
  assert.equal(scenarios.baseline.annualBreakdowns.length, 4);
  assert.equal(scenarios.optimistic.annualBreakdowns.length, 4);

  assert.ok(scenarios.optimistic.fourYearTotalGross > scenarios.baseline.fourYearTotalGross);
  assert.ok(scenarios.baseline.fourYearTotalGross > scenarios.conservative.fourYearTotalGross);
  assert.ok(scenarios.baseline.fourYearTotalNet > 0);
});

test('contract: evaluateMarketBenchmark evaluates roles, levels, and market percentiles', () => {
  const bmSeniorFe = evaluateMarketBenchmark('Senior Frontend Engineer', 'senior', 750000000, 'VND');
  assert.equal(bmSeniorFe.level, 'senior');
  assert.equal(bmSeniorFe.currency, 'VND');
  assert.ok(bmSeniorFe.p50AnnualCash > 0);
  assert.ok(bmSeniorFe.candidatePercentile >= 50 && bmSeniorFe.candidatePercentile <= 75);

  const bmLeadBe = evaluateMarketBenchmark('Lead Backend Architect', 'lead', 600000000, 'VND');
  assert.equal(bmLeadBe.marketComparisonStatus, 'below_market');
  assert.ok(bmLeadBe.candidatePercentile < 40);

  const bmDevopsUsd = evaluateMarketBenchmark('Staff DevOps Engineer', 'staff', 75000, 'USD');
  assert.equal(bmDevopsUsd.currency, 'USD');
  assert.ok(bmDevopsUsd.p50AnnualCash > 0);
});

test('contract: deriveNegotiationLeveragePoints identifies gaps and provides counter scripts', () => {
  const pkg: CompensationPackageDTO = {
    baseSalaryMonthly: 30000000,
    currency: 'VND',
    hasMonth13: false,
    performanceBonusAnnual: 0,
    equityGrant: {
      type: 'esop',
      totalShares: 10000,
      strikePrice: 10000,
      currentFairMarketValue: 15000,
      vestingYears: 4,
      cliffMonths: 24
    }
  };

  const benchmark = evaluateMarketBenchmark('Senior Backend Engineer', 'senior', 360000000, 'VND');
  const leveragePoints = deriveNegotiationLeveragePoints(pkg, benchmark, 'TechCorp');

  assert.ok(leveragePoints.length >= 2);
  const basePoint = leveragePoints.find(p => p.dimension === 'base_salary');
  assert.ok(basePoint);
  assert.ok(basePoint.suggestedScript.includes('TechCorp') || basePoint.suggestedScript.includes('thị trường'));

  const cliffPoint = leveragePoints.find(p => p.dimension === 'cliff_period');
  assert.ok(cliffPoint);
  assert.ok(cliffPoint.suggestedScript.includes('12 tháng'));
});

test('contract: validateCreateCompensationForecastInput validates input payload', () => {
  const valid = validateCreateCompensationForecastInput({
    company: 'Shopee Vietnam',
    role: 'Senior Fullstack Engineer',
    level: 'senior',
    package: {
      baseSalaryMonthly: 60000000,
      currency: 'VND',
      hasMonth13: true,
      performanceBonusAnnual: 60000000
    }
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.company, 'Shopee Vietnam');
    assert.equal(valid.data.package.baseSalaryMonthly, 60000000);
  }

  const invalid = validateCreateCompensationForecastInput({
    company: '',
    role: '',
    package: {
      baseSalaryMonthly: -500
    }
  });
  assert.equal(invalid.ok, false);
  assert.ok(invalid.errors.company);
  assert.ok(invalid.errors.role);
  assert.ok(invalid.errors['package.baseSalaryMonthly']);
});

test('contract: evaluatePromotionReadiness computes dimensions, gaps, readiness score, and estimated months', () => {
  const readinessIC = evaluatePromotionReadiness('Senior', 'Staff', 'ic', {
    technical_breadth: 85,
    system_scale: 80,
    org_influence: 55,
    mentorship_culture: 70,
    business_impact: 65
  });

  assert.equal(readinessIC.currentLevel, 'Senior');
  assert.equal(readinessIC.targetLevel, 'Staff');
  assert.equal(readinessIC.track, 'ic');
  assert.equal(readinessIC.competencies.length, 5);
  assert.ok(readinessIC.overallReadinessScore > 70 && readinessIC.overallReadinessScore <= 100);
  assert.ok(readinessIC.estimatedMonthsToReadiness >= 3 && readinessIC.estimatedMonthsToReadiness <= 12);

  const orgGap = readinessIC.competencies.find(c => c.dimension === 'org_influence');
  assert.ok(orgGap);
  assert.equal(orgGap.gapLevel, 'critical');
  assert.ok(orgGap.evidenceCriteria.length > 0);

  const readinessMgmt = evaluatePromotionReadiness('Senior', 'Engineering Manager', 'management', {
    technical_breadth: 80,
    system_scale: 75,
    org_influence: 70,
    mentorship_culture: 60,
    business_impact: 65
  });
  assert.equal(readinessMgmt.track, 'management');
  assert.equal(readinessMgmt.targetLevel, 'Engineering Manager');
  const mentorGap = readinessMgmt.competencies.find(c => c.dimension === 'mentorship_culture');
  assert.ok(mentorGap);
  assert.equal(mentorGap.gapLevel, 'critical');
});

test('contract: recommendPromotionInitiatives generates actionable high-impact initiatives for critical/moderate gaps in both tracks', () => {
  const icReadiness = evaluatePromotionReadiness('Senior', 'Staff', 'ic', {
    org_influence: 50,
    system_scale: 60
  });
  const icInitiatives = recommendPromotionInitiatives('ic', icReadiness.competencies);
  assert.ok(icInitiatives.length > 0);
  assert.ok(icInitiatives.some(i => i.focusDimension === 'org_influence'));

  const mgmtReadiness = evaluatePromotionReadiness('Senior', 'Tech Lead', 'management', {
    mentorship_culture: 50
  });
  const mgmtInitiatives = recommendPromotionInitiatives('management', mgmtReadiness.competencies);
  assert.ok(mgmtInitiatives.length > 0);
  assert.ok(mgmtInitiatives.some(i => i.focusDimension === 'mentorship_culture'));
});

test('contract: simulateCareerTrajectory builds multi-year career roadmap and compensation ladder', () => {
  const sim = simulateCareerTrajectory({
    currentRole: 'Senior Frontend Engineer',
    currentLevel: 'Senior',
    targetTrack: 'ic',
    targetRole: 'Staff',
    horizonYears: 4,
    userScores: {
      technical_breadth: 85,
      system_scale: 85,
      org_influence: 80,
      mentorship_culture: 80,
      business_impact: 80
    }
  });

  assert.ok(sim.id.startsWith('sim-'));
  assert.equal(sim.currentRole, 'Senior Frontend Engineer');
  assert.equal(sim.targetTrack, 'ic');
  assert.equal(sim.targetRole, 'Staff');
  assert.equal(sim.horizonYears, 4);
  assert.equal(sim.roadmapSteps.length, 4);
  assert.equal(sim.roadmapSteps[0].year, 1);
  assert.equal(sim.roadmapSteps[0].level, 'Senior');
  assert.ok(sim.roadmapSteps[0].estimatedAnnualCompVnd > 700000000);
  assert.ok(sim.roadmapSteps[3].estimatedAnnualCompVnd > sim.roadmapSteps[0].estimatedAnnualCompVnd);
  assert.ok(sim.readiness.overallReadinessScore >= 80);
});

test('contract: validateSimulateTrajectoryInput and validateUpdateCompetenciesInput strictly validate input structures', () => {
  const validSim = validateSimulateTrajectoryInput({
    currentRole: 'Backend Engineer',
    currentLevel: 'Senior',
    targetTrack: 'management',
    targetRole: 'Tech Lead',
    horizonYears: 4,
    userScores: {
      technical_breadth: 75
    }
  });
  assert.equal(validSim.ok, true);
  if (validSim.ok) {
    assert.equal(validSim.data.currentRole, 'Backend Engineer');
    assert.equal(validSim.data.targetTrack, 'management');
    assert.equal(validSim.data.horizonYears, 4);
  }

  const invalidSim = validateSimulateTrajectoryInput({
    currentRole: '',
    currentLevel: ''
  });
  assert.equal(invalidSim.ok, false);
  assert.ok(invalidSim.errors.currentRole);
  assert.ok(invalidSim.errors.currentLevel);

  const validComp = validateUpdateCompetenciesInput({
    scores: {
      technical_breadth: 80,
      system_scale: 85,
      org_influence: 70,
      mentorship_culture: 75,
      business_impact: 90
    }
  });
  assert.equal(validComp.ok, true);
  if (validComp.ok) {
    assert.equal(validComp.data.scores.technical_breadth, 80);
    assert.equal(validComp.data.scores.system_scale, 85);
  }

  const invalidComp = validateUpdateCompetenciesInput({});
  assert.equal(invalidComp.ok, false);
  assert.ok(invalidComp.errors.scores);
});

test('contract: extractKeywordsFromText detects standard dictionary and capitalized tech terms', () => {
  const jdText = 'We are hiring a Senior Engineer with deep TypeScript, Docker, and Kubernetes experience. Familiarity with GraphQL and ArgoCD is a plus.';
  const keywords = extractKeywordsFromText(jdText);
  assert.ok(keywords.length >= 3);
  assert.ok(keywords.some(k => k.keyword === 'TypeScript'));
  assert.ok(keywords.some(k => k.keyword === 'Docker'));
  assert.ok(keywords.some(k => k.keyword === 'Kubernetes'));
  assert.ok(keywords.some(k => k.keyword === 'GraphQL'));
});

test('contract: extractBulletsFromResume extracts bullet points and clean descriptions', () => {
  const resume = `
# John Doe
## Experience
- Spearheaded migration of frontend monolith to Next.js micro-frontends, reducing initial page load by 45%.
- Architected distributed caching layer with Redis, handling 15,000 requests per second.
* Led a team of 6 engineers across 3 time zones.
1. Implemented end-to-end testing with Playwright.
  `;
  const bullets = extractBulletsFromResume(resume);
  assert.equal(bullets.length, 4);
  assert.ok(bullets[0].includes('monolith to Next.js'));
  assert.ok(bullets[1].includes('distributed caching layer'));
  assert.ok(bullets[2].includes('Led a team of 6'));
  assert.ok(bullets[3].includes('end-to-end testing'));
});

test('contract: diagnoseAtsKeywordGaps computes ATS score, keyword breakdown, and recommendations', () => {
  const jd = 'Seeking Senior Backend Engineer proficient in Node.js, PostgreSQL, Docker, Kubernetes, CI/CD, and System Design.';
  const resume = `
Experienced Software Engineer.
- Built REST API services with Node.js and PostgreSQL.
- Containerized microservices using Docker.
- Improved latency by 35% across 20+ microservices.
  `;
  const diagnostic = diagnoseAtsKeywordGaps(resume, jd);
  assert.ok(diagnostic.atsScore >= 40 && diagnostic.atsScore <= 100);
  assert.ok(diagnostic.matchedKeywordsCount >= 3);
  assert.ok(diagnostic.missingKeywordsCount >= 1);
  assert.ok(diagnostic.keywordGaps.length >= 4);
  assert.ok(diagnostic.scoreBreakdown.keywordRelevance > 0);
  assert.ok(diagnostic.recommendations.length > 0);

  const missingK8s = diagnostic.keywordGaps.find(k => k.keyword === 'Kubernetes');
  assert.ok(missingK8s);
  assert.equal(missingK8s.matched, false);
});

test('contract: rewriteBulletPointsXyz creates 3 Google X-Y-Z variants with explicit breakdown', () => {
  const bullets = [
    'Responsible for building APIs and maintaining backend database.',
    'Worked on frontend user interface and fixed UI bugs.'
  ];
  const proposals = rewriteBulletPointsXyz(bullets, ['TypeScript', 'PostgreSQL', 'Docker']);
  assert.equal(proposals.length, 2);

  const first = proposals[0];
  assert.equal(first.variants.length, 3);
  assert.equal(first.variants[0].variantType, 'metric_driven');
  assert.equal(first.variants[1].variantType, 'leadership');
  assert.equal(first.variants[2].variantType, 'tech_depth');

  assert.ok(first.variants[0].xyzBreakdown.accomplishmentX.length > 0);
  assert.ok(first.variants[0].xyzBreakdown.metricY.length > 0);
  assert.ok(first.variants[0].xyzBreakdown.actionZ.length > 0);
});

test('contract: synthesizeOptimizedResume replaces bullets and injects supplemental ATS keywords', () => {
  const original = `
## Experience
- Responsible for building APIs.
## Skills
- JavaScript, Node.js
  `;
  const acceptedBullets = {
    'Responsible for building APIs.': 'Engineered high-throughput REST APIs reducing P99 latency by 40% with Node.js.'
  };
  const injectedKeywords = ['Docker', 'Kubernetes', 'PostgreSQL'];

  const synthesized = synthesizeOptimizedResume(original, acceptedBullets, injectedKeywords);
  assert.ok(!synthesized.includes('Responsible for building APIs.'));
  assert.ok(synthesized.includes('Engineered high-throughput REST APIs'));
  assert.ok(synthesized.includes('Docker, Kubernetes, PostgreSQL'));
});

test('contract: validateOptimizeResumeInput and validateRewriteBulletInput validate payload schemas', () => {
  const validOpt = validateOptimizeResumeInput({
    resumeText: 'Experienced Software Engineer with 5 years building scalable web services in Node.js and TypeScript.',
    jobDescription: 'Looking for a Senior Fullstack Engineer with expertise in React, Next.js, and PostgreSQL.'
  });
  assert.equal(validOpt.ok, true);

  const invalidOpt = validateOptimizeResumeInput({
    resumeText: 'Too short',
    jobDescription: ''
  });
  assert.equal(invalidOpt.ok, false);
  assert.ok(invalidOpt.errors.resumeText);
  assert.ok(invalidOpt.errors.jobDescription);

  const validRewrite = validateRewriteBulletInput({
    bullets: ['Built search feature', 'Maintained cluster'],
    targetKeywords: ['Elasticsearch', 'Kubernetes']
  });
  assert.equal(validRewrite.ok, true);

  const invalidRewrite = validateRewriteBulletInput({
    bullets: []
  });
  assert.equal(invalidRewrite.ok, false);
  assert.ok(invalidRewrite.errors.bullets);
});

test('contract: computeStageConversionMetrics calculates funnel metrics accurately', () => {
  const mockApps = [
    {
      status: 'Offer' as const,
      appliedAt: '2026-09-01T00:00:00Z',
      createdAt: '2026-09-01T00:00:00Z',
      statusUpdatedAt: '2026-10-01T00:00:00Z',
      interviews: [{ id: 'i1', status: 'Completed', at: '2026-09-15T00:00:00Z' }]
    },
    {
      status: 'Interview' as const,
      appliedAt: '2026-09-10T00:00:00Z',
      createdAt: '2026-09-10T00:00:00Z',
      statusUpdatedAt: '2026-09-25T00:00:00Z',
      interviews: [{ id: 'i2', status: 'Scheduled', at: '2026-09-20T00:00:00Z' }]
    },
    {
      status: 'Rejected' as const,
      appliedAt: '2026-09-05T00:00:00Z',
      createdAt: '2026-09-05T00:00:00Z',
      statusUpdatedAt: '2026-09-12T00:00:00Z',
      interviews: []
    }
  ];

  const metrics = computeStageConversionMetrics(mockApps);
  assert.equal(metrics.length, 4);

  const appliedStage = metrics.find(m => m.stage === 'Applied');
  assert.ok(appliedStage);
  assert.equal(appliedStage.totalEntered, 3);
  assert.equal(appliedStage.passed, 2);
  assert.equal(appliedStage.dropped, 1);
  assert.equal(appliedStage.conversionRate, 66.7);

  const interviewStage = metrics.find(m => m.stage === 'Interview');
  assert.ok(interviewStage);
  assert.equal(interviewStage.totalEntered, 2);
  assert.equal(interviewStage.passed, 1);

  const offerStage = metrics.find(m => m.stage === 'Offer');
  assert.ok(offerStage);
  assert.equal(offerStage.totalEntered, 1);
  assert.equal(offerStage.passed, 1);
});

test('contract: detectPipelineBottlenecks classifies stage risks correctly', () => {
  const stageMetrics = [
    {
      stage: 'Applied' as const,
      totalEntered: 10,
      passed: 1,
      dropped: 9,
      conversionRate: 10.0,
      avgDaysInStage: 7
    },
    {
      stage: 'Screening' as const,
      totalEntered: 10,
      passed: 5,
      dropped: 5,
      conversionRate: 50.0,
      avgDaysInStage: 5
    },
    {
      stage: 'Interview' as const,
      totalEntered: 10,
      passed: 9,
      dropped: 1,
      conversionRate: 90.0,
      avgDaysInStage: 12
    },
    {
      stage: 'Offer' as const,
      totalEntered: 5,
      passed: 5,
      dropped: 0,
      conversionRate: 100.0,
      avgDaysInStage: 4
    }
  ];

  const bottlenecks = detectPipelineBottlenecks(stageMetrics);
  assert.equal(bottlenecks.length, 4);

  const appliedBottleneck = bottlenecks.find(b => b.stage === 'Applied');
  assert.ok(appliedBottleneck);
  assert.equal(appliedBottleneck.severity, 'critical');
  assert.equal(appliedBottleneck.dropOffRate, 90.0);
  assert.ok(appliedBottleneck.diagnosticMessage.includes('Cảnh báo nghiêm trọng'));

  const screeningBottleneck = bottlenecks.find(b => b.stage === 'Screening');
  assert.ok(screeningBottleneck);
  assert.equal(screeningBottleneck.severity, 'moderate');
  assert.equal(screeningBottleneck.dropOffRate, 50.0);

  const interviewBottleneck = bottlenecks.find(b => b.stage === 'Interview');
  assert.ok(interviewBottleneck);
  assert.equal(interviewBottleneck.severity, 'healthy');
});

test('contract: calculateVelocityTargets calculates target weekly velocity and forecasts', () => {
  const stageMetrics = [
    {
      stage: 'Applied' as const,
      totalEntered: 20,
      passed: 10,
      dropped: 10,
      conversionRate: 50.0,
      avgDaysInStage: 7
    },
    {
      stage: 'Screening' as const,
      totalEntered: 10,
      passed: 6,
      dropped: 4,
      conversionRate: 60.0,
      avgDaysInStage: 5
    },
    {
      stage: 'Interview' as const,
      totalEntered: 6,
      passed: 3,
      dropped: 3,
      conversionRate: 50.0,
      avgDaysInStage: 14
    },
    {
      stage: 'Offer' as const,
      totalEntered: 3,
      passed: 2,
      dropped: 1,
      conversionRate: 66.7,
      avgDaysInStage: 5
    }
  ];

  const futureDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const targets = calculateVelocityTargets(stageMetrics, futureDate, 2, 4);

  assert.equal(targets.currentWeeklyApplications, 4);
  assert.ok(targets.recommendedWeeklyApplications >= 1);
  assert.ok(targets.projectedOffersIn30Days >= 0);
  assert.ok(targets.projectedOffersIn60Days >= targets.projectedOffersIn30Days);
  assert.ok(targets.confidenceScore >= 80);
});

test('contract: simulatePipelineOutcomes runs deterministic Monte Carlo simulations', () => {
  const stageMetrics = [
    {
      stage: 'Applied' as const,
      totalEntered: 10,
      passed: 5,
      dropped: 5,
      conversionRate: 50.0,
      avgDaysInStage: 7
    },
    {
      stage: 'Screening' as const,
      totalEntered: 5,
      passed: 3,
      dropped: 2,
      conversionRate: 60.0,
      avgDaysInStage: 5
    },
    {
      stage: 'Interview' as const,
      totalEntered: 3,
      passed: 2,
      dropped: 1,
      conversionRate: 66.7,
      avgDaysInStage: 14
    },
    {
      stage: 'Offer' as const,
      totalEntered: 2,
      passed: 2,
      dropped: 0,
      conversionRate: 100.0,
      avgDaysInStage: 4
    }
  ];

  const sim = simulatePipelineOutcomes(5, stageMetrics, 12);
  assert.equal(sim.simulatedApplicationsPerWeek, 5);
  assert.equal(sim.simulationDays, 84);
  assert.ok(sim.p90Offers >= sim.p50Offers);
  assert.ok(sim.p50Offers >= sim.p10Offers);
  assert.ok(typeof sim.estimatedDaysToFirstOffer === 'number' || sim.estimatedDaysToFirstOffer === null);
});

test('contract: validateCalculateVelocityReportInput enforces schema constraints', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const valid = validateCalculateVelocityReportInput({
    targetOfferDate: futureDate,
    targetOfferCount: 2,
    simulatedWeeklyVelocity: 6,
    simulationHorizonWeeks: 8
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.targetOfferDate, futureDate);
    assert.equal(valid.data.targetOfferCount, 2);
    assert.equal(valid.data.simulatedWeeklyVelocity, 6);
    assert.equal(valid.data.simulationHorizonWeeks, 8);
  }

  const invalid = validateCalculateVelocityReportInput({
    targetOfferDate: '2020-01-01',
    targetOfferCount: 0,
    simulationHorizonWeeks: 100
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.ok(invalid.errors.targetOfferDate);
    assert.ok(invalid.errors.targetOfferCount);
    assert.ok(invalid.errors.simulationHorizonWeeks);
  }
});

test('contract: validateAnalyzeCultureInput validates company and preference weights', () => {
  const valid = validateAnalyzeCultureInput({
    company: 'FPT Software',
    targetRole: 'Senior Frontend Engineer',
    candidatePreferences: {
      engineering_rigor: 5,
      oncall_wlb: 4,
      psychological_safety: 5
    }
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.company, 'FPT Software');
    assert.equal(valid.data.candidatePreferences?.engineering_rigor, 5);
  }

  const invalidEmpty = validateAnalyzeCultureInput({
    company: '   '
  });
  assert.equal(invalidEmpty.ok, false);
  if (!invalidEmpty.ok) {
    assert.ok(invalidEmpty.errors.company);
  }

  const invalidWeights = validateAnalyzeCultureInput({
    company: 'VNG',
    candidatePreferences: {
      engineering_rigor: 10
    }
  });
  assert.equal(invalidWeights.ok, false);
});

test('contract: evaluateCompanyCulture evaluates 6 pillars and benchmark deltas', () => {
  const result = evaluateCompanyCulture('FPT Software', {
    engineering_rigor: 5,
    oncall_wlb: 5
  });

  assert.equal(result.dimensionScores.length, 6);
  assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
  assert.ok(result.synthesisSummary.length > 20);

  const rigor = result.dimensionScores.find(d => d.dimension === 'engineering_rigor');
  assert.ok(rigor);
  assert.equal(rigor.score, 74);
  assert.equal(rigor.benchmarkAvg, 68);
  assert.ok(rigor.summary.includes('+6 điểm'));

  const wlb = result.dimensionScores.find(d => d.dimension === 'oncall_wlb');
  assert.ok(wlb);
  assert.equal(wlb.score, 70);
  assert.ok(wlb.greenFlags.length > 0);
});

test('contract: computeCultureCompatibility applies penalties for low scores in high priority dimensions', () => {
  const lowScores = [
    {
      dimension: 'oncall_wlb' as const,
      name: 'On-Call & WLB',
      score: 40,
      benchmarkAvg: 62,
      summary: 'Poor',
      redFlags: ['Bad on-call'],
      greenFlags: []
    },
    {
      dimension: 'engineering_rigor' as const,
      name: 'Rigor',
      score: 80,
      benchmarkAvg: 68,
      summary: 'Good',
      redFlags: [],
      greenFlags: ['Great CI']
    }
  ];

  const highPriorityWlb = computeCultureCompatibility(lowScores, {
    oncall_wlb: 5,
    engineering_rigor: 2
  });

  const lowPriorityWlb = computeCultureCompatibility(lowScores, {
    oncall_wlb: 1,
    engineering_rigor: 5
  });

  assert.ok(highPriorityWlb < lowPriorityWlb);
});

test('contract: generateReverseInterviewQuestions produces targeted probes for lowest dimensions', () => {
  const mockDimensions = [
    {
      dimension: 'engineering_rigor' as const,
      name: 'Rigor',
      score: 85,
      benchmarkAvg: 68,
      summary: 'Great',
      redFlags: [],
      greenFlags: []
    },
    {
      dimension: 'oncall_wlb' as const,
      name: 'WLB',
      score: 45,
      benchmarkAvg: 62,
      summary: 'Struggling',
      redFlags: [],
      greenFlags: []
    },
    {
      dimension: 'tech_debt_tooling' as const,
      name: 'Tech Debt',
      score: 50,
      benchmarkAvg: 60,
      summary: 'Debt',
      redFlags: [],
      greenFlags: []
    },
    {
      dimension: 'psychological_safety' as const,
      name: 'Psychological Safety',
      score: 55,
      benchmarkAvg: 70,
      summary: 'Caution',
      redFlags: [],
      greenFlags: []
    }
  ];

  const questionsEm = generateReverseInterviewQuestions(mockDimensions, 'engineering_manager');
  assert.equal(questionsEm.length, 3);
  assert.ok(questionsEm.some(q => q.dimension === 'oncall_wlb'));
  assert.ok(questionsEm.every(q => q.targetRole === 'engineering_manager'));
  assert.ok(questionsEm[0].listeningFor.length > 0);
  assert.ok(questionsEm[0].redFlagSignal.length > 0);

  const questionsPeer = generateReverseInterviewQuestions(mockDimensions, 'peer_engineer');
  assert.equal(questionsPeer.length, 3);
  assert.ok(questionsPeer.every(q => q.targetRole === 'peer_engineer'));
});

test('contract: parseInboundRecruiterPitch detects Tier-1 agency, role, stealth clues, salary, and flags', () => {
  const pitchText = `
    Chào bạn, tôi là Mai Hoàng từ Robert Walters Vietnam.
    Hiện tại tôi đang phụ trách độc quyền (retained mandate) vị trí Vice President of Engineering cho một khách hàng bảo mật thuộc nhóm fintech unicorn tại TP. Hồ Chí Minh.
    Dải ngân sách dự kiến là $5,000 - $7,000 USD gross / month.
    Yêu cầu ứng viên có thế mạnh về Golang, Kubernetes, Microservices và năng lực lãnh đạo đội ngũ trên 30 kỹ sư.
    Bạn vui lòng xem xét và phản hồi nhé!
  `;

  const result = parseInboundRecruiterPitch(pitchText, 'linkedin_inmail');
  assert.equal(result.recruiterName, 'Mai Hoàng');
  assert.equal(result.agencyName, 'Robert Walters');
  assert.equal(result.agencyTier, 'tier1_global');
  assert.equal(result.targetRole, 'Vice President of Engineering');
  assert.equal(result.isConfidentialCompany, true);
  assert.ok(result.companyClues.length >= 1);
  assert.equal(result.currency, 'USD');
  assert.equal(result.extractedMinComp, 5000);
  assert.equal(result.extractedMaxComp, 7000);
  assert.equal(result.mandateExclusivity, 'exclusive_retained');
  assert.ok(result.keyRequirements.includes('GOLANG'));
  assert.ok(result.keyRequirements.includes('KUBERNETES'));
  assert.ok(result.greenFlags.length >= 2);
  assert.ok(result.confidenceScore >= 80);
});

test('contract: generateRecruiterReplyDraft generates strategic reply across all 4 intents', () => {
  const pitch = parseInboundRecruiterPitch(`
    Chào bạn, mình là Tuấn từ Navigos Search. Bên mình đang tuyển Tech Lead cho đối tác ngân hàng lớn, lương 60 - 80 triệu VND.
  `);

  const replyCriteria = generateRecruiterReplyDraft(pitch, 'explore_with_criteria');
  assert.equal(replyCriteria.intent, 'explore_with_criteria');
  assert.ok(replyCriteria.subject.includes('Tech Lead'));
  assert.ok(replyCriteria.body.includes('Mô tả công việc (JD)'));
  assert.equal(replyCriteria.suggestedTone, 'assertive_executive');

  const replySalary = generateRecruiterReplyDraft(pitch, 'salary_first', {
    minCompGross: 100000000,
    preferredCurrency: 'VND'
  });
  assert.equal(replySalary.intent, 'salary_first');
  assert.ok(replySalary.body.includes('100,000,000 VND'));
  assert.ok(replySalary.strategyNotes.length > 0);

  const replyPass = generateRecruiterReplyDraft(pitch, 'polite_pass');
  assert.equal(replyPass.intent, 'polite_pass');
  assert.ok(replyPass.body.includes('LinkedIn'));
  assert.equal(replyPass.suggestedTone, 'cordial_decline');

  const replyMandate = generateRecruiterReplyDraft(pitch, 'exclusive_mandate_check');
  assert.equal(replyMandate.intent, 'exclusive_mandate_check');
  assert.ok(replyMandate.body.includes('Double-Submission'));
  assert.ok(replyMandate.body.includes('Hiring Manager'));
});

test('contract: computeRecruiterRelationshipHealth computes composite score, penalties, and action suggestions', () => {
  const activeTrusted = computeRecruiterRelationshipHealth({
    tier: 'trusted_advisor',
    rating: 5,
    mandatesCount: 3,
    lastContactedAt: new Date(Date.now() - 10 * 86400000).toISOString()
  });
  assert.ok(activeTrusted.healthScore >= 90);
  assert.equal(activeTrusted.healthStatus, 'excellent');
  assert.ok(activeTrusted.nextActionSuggestion.length > 0);

  const dormantRecruiter = computeRecruiterRelationshipHealth({
    tier: 'situational_contingency',
    rating: 3,
    mandatesCount: 0,
    lastContactedAt: new Date(Date.now() - 120 * 86400000).toISOString()
  });
  assert.ok(dormantRecruiter.healthScore < 60);
  assert.ok(['cooling', 'dormant'].includes(dormantRecruiter.healthStatus));

  const blacklisted = computeRecruiterRelationshipHealth({
    tier: 'blacklisted',
    rating: 1
  });
  assert.equal(blacklisted.healthScore, 0);
  assert.equal(blacklisted.healthStatus, 'risk');
});

test('contract: detectMandateConflict detects prior agency pitches and double-submission collision risks', () => {
  const mockMandates = [
    {
      id: 'm1',
      userId: 'u1',
      leadId: 'l1',
      recruiterName: 'Mai Hoàng',
      agencyName: 'Robert Walters',
      roleTitle: 'Head of Engineering',
      clientCompany: 'Techcombank Digital',
      isConfidential: false,
      exclusivity: 'exclusive_retained' as const,
      status: 'submitted' as const,
      pitchedAt: '2026-09-15T00:00:00Z',
      updatedAt: '2026-09-15T00:00:00Z'
    }
  ];

  const conflict = detectMandateConflict(mockMandates, 'Techcombank Digital');
  assert.equal(conflict.hasConflict, true);
  assert.ok(conflict.warningMessage?.includes('Robert Walters'));
  assert.ok(conflict.warningMessage?.includes('lockout'));

  const noConflict = detectMandateConflict(mockMandates, 'Shopee Vietnam');
  assert.equal(noConflict.hasConflict, false);
});

test('contract: validateParsePitchInput, validateRecruiterLeadInput, validateMandateInput enforce strict schemas', () => {
  const validPitch = validateParsePitchInput({ rawText: 'We are hiring a CTO.' });
  assert.equal(validPitch.ok, true);

  const invalidPitch = validateParsePitchInput({ rawText: '  ' });
  assert.equal(invalidPitch.ok, false);

  const validLead = validateRecruiterLeadInput({
    name: 'Mai Hoàng',
    agency: 'Robert Walters',
    tier: 'trusted_advisor'
  });
  assert.equal(validLead.ok, true);

  const invalidLead = validateRecruiterLeadInput({ name: ' ' });
  assert.equal(invalidLead.ok, false);

  const validMandate = validateMandateInput({
    leadId: 'lead-123',
    roleTitle: 'VP of Engineering',
    clientCompany: 'VNG Corporation'
  });
  assert.equal(validMandate.ok, true);

  const invalidMandate = validateMandateInput({ leadId: 'lead-123' });
  assert.equal(invalidMandate.ok, false);
});

test('contract: SYSTEM_DESIGN_SCENARIOS contains 5 comprehensive production scenarios', () => {
  assert.equal(SYSTEM_DESIGN_SCENARIOS.length, 5);
  const ids = SYSTEM_DESIGN_SCENARIOS.map(s => s.id);
  assert.ok(ids.includes('url_shortener'));
  assert.ok(ids.includes('flash_sale'));
  assert.ok(ids.includes('ride_hailing_matching'));
  assert.ok(ids.includes('distributed_notification_system'));
  assert.ok(ids.includes('custom_system'));

  const tinyurl = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'url_shortener');
  assert.ok(tinyurl);
  assert.equal(tinyurl?.category, 'web_scale');
  assert.ok(tinyurl?.exemplarBlueprint.scope.functionalRequirements.length >= 3);
  assert.ok(tinyurl?.exemplarBlueprint.highLevelDesign.apiEndpoints.length >= 2);
  assert.ok(tinyurl?.exemplarBlueprint.deepDive.databaseSchema.length >= 1);
});

test('contract: calculateCapacityEstimates accurately computes QPS, bandwidth, and node sizing', () => {
  const estimates = calculateCapacityEstimates({
    dailyActiveUsers: 100000000,
    readsPerUserPerDay: 10,
    writesPerUserPerDay: 0.1,
    avgReadPayloadBytes: 256,
    avgWritePayloadBytes: 512,
    peakLoadMultiplier: 3,
    dataRetentionYears: 5,
    cacheWorkingSetPercentage: 20
  });

  assert.equal(estimates.totalDailyReads, 1000000000);
  assert.equal(estimates.totalDailyWrites, 10000000);
  assert.equal(estimates.averageReadQps, 11574);
  assert.equal(estimates.averageWriteQps, 116);
  assert.equal(estimates.totalAverageQps, 11690);
  assert.equal(estimates.peakReadQps, 34722);
  assert.equal(estimates.peakWriteQps, 348);
  assert.equal(estimates.peakTotalQps, 35070);
  assert.ok(estimates.ingressBandwidthMbps > 0);
  assert.ok(estimates.egressBandwidthMbps > 0);
  assert.ok(estimates.retentionTotalStorageTb > 0);
  assert.ok(estimates.cacheMemoryRequiredGb > 0);
  assert.ok(estimates.recommendedAppServers >= 2);
  assert.ok(estimates.recommendedCacheNodes >= 2);
  assert.ok(estimates.recommendedDbShards >= 1);
});

test('contract: evaluateSystemArchitecture evaluates 5 pillars and outputs Staff-level verdict for exemplar', () => {
  const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'url_shortener')!;
  const evalResult = evaluateSystemArchitecture(scenario.exemplarBlueprint, 'url_shortener', 'Staff Engineer');

  assert.ok(evalResult.overallScore >= 85);
  assert.equal(evalResult.seniorityVerdict, 'Principal/Staff Ready');
  assert.equal(evalResult.pillars.length, 5);
  assert.ok(evalResult.topStrengths.length > 0);
  assert.ok(evalResult.tradeOffAnalysis.length > 0);
  assert.ok(evalResult.actionableRecommendations.length > 0);
});

test('contract: exportBlueprintToMarkdown serializes markdown report with Mermaid diagram', () => {
  const scenario = SYSTEM_DESIGN_SCENARIOS.find(s => s.id === 'url_shortener')!;
  const estimates = calculateCapacityEstimates(scenario.defaultCapacityInput);
  const evalResult = evaluateSystemArchitecture(scenario.exemplarBlueprint, 'url_shortener');

  const markdown = exportBlueprintToMarkdown(
    {
      id: 'session-test-1',
      userId: 'user-test-1',
      title: 'TinyURL High Scale Design',
      scenarioId: 'url_shortener',
      targetRole: 'Staff Engineer',
      difficulty: 'senior',
      capacityInput: scenario.defaultCapacityInput,
      capacityEstimates: estimates,
      blueprint: scenario.exemplarBlueprint,
      status: 'evaluated',
      createdAt: '2026-10-25T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z'
    },
    evalResult
  );

  assert.ok(markdown.includes('# Báo Cáo Thiết Kế Hệ Thống: TinyURL High Scale Design'));
  assert.ok(markdown.includes('```mermaid'));
  assert.ok(markdown.includes('Redis Cache Cluster'));
  assert.ok(markdown.includes('AI Architecture Rubric'));
});

test('contract: validateCapacityInput, validateSystemDesignSessionInput, validateSystemDesignBlueprintInput enforce schemas', () => {
  const validCapacity = validateCapacityInput({
    dailyActiveUsers: 1000000,
    readsPerUserPerDay: 5,
    writesPerUserPerDay: 1
  });
  assert.equal(validCapacity.ok, true);

  const invalidCapacity = validateCapacityInput({ dailyActiveUsers: -10 });
  assert.equal(invalidCapacity.ok, false);

  const validSession = validateSystemDesignSessionInput({
    title: 'Designing TinyURL',
    scenarioId: 'url_shortener'
  });
  assert.equal(validSession.ok, true);

  const invalidSession = validateSystemDesignSessionInput({
    title: '',
    scenarioId: 'invalid_scenario'
  });
  assert.equal(invalidSession.ok, false);

  const scenario = SYSTEM_DESIGN_SCENARIOS[0];
  const validBlueprint = validateSystemDesignBlueprintInput(scenario.exemplarBlueprint);
  assert.equal(validBlueprint.ok, true);

  const invalidBlueprint = validateSystemDesignBlueprintInput({ scope: {} });
  assert.equal(invalidBlueprint.ok, false);
});

test('contract: calculateDilutionPipeline computes dilution across financing rounds and pool expansions', () => {
  const initialCapTable: CapTableSnapshotDTO = {
    totalFullyDilutedShares: 10000000,
    commonShares: 6000000,
    unallocatedOptionPoolShares: 1000000,
    preferredTiers: [
      {
        tierName: 'Series A',
        originalInvestmentAmount: 5000000,
        sharesIssued: 3000000,
        preferenceMultiple: 1.0,
        participationType: 'non_participating',
        seniorityRank: 1
      }
    ]
  };

  const rounds: DilutionRoundDTO[] = [
    {
      roundName: 'Series B',
      preMoneyValuation: 50000000,
      capitalRaised: 15000000,
      newOptionPoolExpansionPercent: 5,
      issuedShareCount: 3000000,
      postMoneyValuation: 65000000,
      investorSharePercentage: 23.08,
      cumulativeDilutionFactor: 76.92
    }
  ];

  const result = calculateDilutionPipeline(initialCapTable, 200000, rounds);
  assert.equal(result.executiveDilutedShares, 200000);
  assert.ok(result.finalCapTable.totalFullyDilutedShares > 10000000);
  assert.ok(result.executiveOwnershipPercent < 2.0);
  assert.equal(result.roundByRoundSummary.length, 1);
  assert.equal(result.roundByRoundSummary[0].roundName, 'Series B');
});

test('contract: resolveLiquidationWaterfall handles downside hurdles and upside common conversion', () => {
  const capTable: CapTableSnapshotDTO = {
    totalFullyDilutedShares: 10000000,
    commonShares: 7000000,
    unallocatedOptionPoolShares: 1000000,
    preferredTiers: [
      {
        tierName: 'Series A',
        originalInvestmentAmount: 10000000,
        sharesIssued: 2000000,
        preferenceMultiple: 1.0,
        participationType: 'non_participating',
        seniorityRank: 1
      }
    ]
  };

  const downside = resolveLiquidationWaterfall(5000000, capTable, 200000, 0.50, 'us_federal_california');
  assert.equal(downside.preferredPayoutTotal, 5000000);
  assert.equal(downside.commonPayoutTotal, 0);
  assert.equal(downside.executiveNetPreTax, 0);
  assert.equal(downside.executiveNetPostTax, 0);

  const upside = resolveLiquidationWaterfall(100000000, capTable, 200000, 0.50, 'us_federal_california');
  assert.ok(upside.commonPayoutTotal > 0);
  assert.ok(upside.executiveNetPreTax > 1000000);
  assert.ok(upside.executiveNetPostTax > 500000);
  assert.ok(upside.returnMultipleOnStrike > 10);
});

test('contract: computeExerciseCostAndTax accurately models US AMT, 83b election, and Vietnam PIT', () => {
  const mockIsoGrant: ExecutiveEquityGrantDTO = {
    id: 'grant-test-1',
    company: 'Alpha Corp',
    role: 'Staff Engineer',
    grantType: 'iso',
    shareCount: 100000,
    strikePrice: 1.00,
    currentFmv: 5.00,
    preferredPrice: 10.00,
    grantDate: '2024-01-01',
    vestingStartDate: '2024-01-01',
    vestingScheduleType: 'standard_4yr_1yr_cliff',
    cliffMonths: 12,
    vestingDurationMonths: 48,
    postTerminationExerciseMonths: 90,
    accelerationClause: 'none',
    hasEarlyExercise: false,
    section83bElected: false
  };

  const usIsoAnalysis = computeExerciseCostAndTax(mockIsoGrant, 5.00, 20.00, 'us_federal_california');
  assert.equal(usIsoAnalysis.totalExerciseCost, 100000);
  assert.equal(usIsoAnalysis.spreadAtExercise, 400000);
  assert.ok(usIsoAnalysis.alternativeMinimumTaxAtExercise > 0);

  const mockIso83b: ExecutiveEquityGrantDTO = {
    ...mockIsoGrant,
    hasEarlyExercise: true,
    section83bElected: true
  };
  const usIso83bAnalysis = computeExerciseCostAndTax(mockIso83b, 5.00, 20.00, 'us_federal_california');
  assert.equal(usIso83bAnalysis.alternativeMinimumTaxAtExercise, 0);
  assert.ok(usIso83bAnalysis.capitalGainsTaxAtSale > 0);

  const mockEsopGrant: ExecutiveEquityGrantDTO = {
    ...mockIsoGrant,
    grantType: 'esop'
  };
  const vnEsopAnalysis = computeExerciseCostAndTax(mockEsopGrant, 5.00, 20.00, 'vietnam_pit');
  assert.equal(vnEsopAnalysis.ordinaryIncomeTaxAtExercise, 400000 * 0.35);
  assert.equal(vnEsopAnalysis.capitalGainsTaxAtSale, 100000 * 20.00 * 0.001);
});

test('contract: compareExecutiveEquityPackages and exportEquityModelToMarkdown produce valid outputs', () => {
  const modelA: EquityModelDTO = {
    id: 'model-a',
    modelName: 'Offer A',
    grant: {
      id: 'grant-a',
      company: 'Company A',
      role: 'VP Engineering',
      grantType: 'iso',
      shareCount: 100000,
      strikePrice: 1.00,
      currentFmv: 5.00,
      preferredPrice: 10.00,
      grantDate: '2024-01-01',
      vestingStartDate: '2024-01-01',
      vestingScheduleType: 'standard_4yr_1yr_cliff',
      cliffMonths: 12,
      vestingDurationMonths: 48,
      postTerminationExerciseMonths: 90,
      accelerationClause: 'none',
      hasEarlyExercise: false,
      section83bElected: false
    },
    capTable: {
      totalFullyDilutedShares: 10000000,
      commonShares: 7000000,
      unallocatedOptionPoolShares: 1000000,
      preferredTiers: []
    },
    dilutionRounds: [],
    exitScenarios: [
      {
        exitValuation: 50000000,
        preferredPayoutTotal: 0,
        commonPayoutTotal: 50000000,
        commonSharePrice: 5.00,
        executiveShareCountDiluted: 100000,
        executiveGrossPayout: 500000,
        executiveExerciseCost: 100000,
        executiveNetPreTax: 400000,
        executiveNetPostTax: 250000,
        effectiveTaxRatePercent: 37.5,
        returnMultipleOnStrike: 5,
        preferredParticipationSummary: []
      }
    ],
    taxAnalysis: {
      jurisdiction: 'us_federal_california',
      totalExerciseCost: 100000,
      spreadAtExercise: 400000,
      ordinaryIncomeTaxAtExercise: 0,
      alternativeMinimumTaxAtExercise: 112000,
      capitalGainAtSale: 1500000,
      capitalGainsTaxAtSale: 556500,
      totalTaxLiability: 668500,
      netCashRetained: 1231500,
      effectiveOverallTaxRatePercent: 35.18,
      optimalActionPlan: ['Action plan item 1']
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const modelB: EquityModelDTO = {
    ...modelA,
    id: 'model-b',
    modelName: 'Offer B Counter',
    grant: {
      ...modelA.grant,
      postTerminationExerciseMonths: 120,
      accelerationClause: 'double_trigger_acceleration'
    },
    exitScenarios: [
      {
        ...modelA.exitScenarios[0],
        executiveNetPostTax: 300000
      }
    ]
  };

  const comparison = compareExecutiveEquityPackages(modelA, modelB);
  assert.equal(comparison.recommendationVerdict.includes('Counter offer'), true);
  assert.ok(comparison.keyDifferentiators.length >= 2);

  const markdown = exportEquityModelToMarkdown(modelA);
  assert.ok(markdown.includes('# Executive Equity & Liquidity Analysis: Offer A'));
  assert.ok(markdown.includes('Alpha Corp') || markdown.includes('Company A'));
  assert.ok(markdown.includes('| Total Grant Shares | 100,000 |'));
});

test('contract: validateEquityGrantInput and validateEquityModelMutationInput enforce rigorous schemas', () => {
  const validGrant = validateEquityGrantInput({
    company: 'FinFlow Global',
    role: 'VP Engineering',
    grantType: 'iso',
    shareCount: 150000,
    strikePrice: 2.00,
    currentFmv: 6.00,
    preferredPrice: 12.00
  });
  assert.equal(validGrant.ok, true);

  const invalidGrant = validateEquityGrantInput({
    company: '',
    shareCount: -50
  });
  assert.equal(invalidGrant.ok, false);

  const validModel = validateEquityModelMutationInput({
    modelName: 'Series B Modeler',
    grant: {
      company: 'FinFlow Global',
      role: 'VP Engineering',
      grantType: 'iso',
      shareCount: 150000,
      strikePrice: 2.00,
      currentFmv: 6.00,
      preferredPrice: 12.00
    },
    capTable: {
      totalFullyDilutedShares: 10000000,
      commonShares: 6000000,
      unallocatedOptionPoolShares: 1000000,
      preferredTiers: []
    }
  });
  assert.equal(validModel.ok, true);

  const invalidModel = validateEquityModelMutationInput({
    modelName: '',
    grant: {}
  });
  assert.equal(invalidModel.ok, false);
});

test('contract: calculateBackchannelProbability computes realistic probabilities across network degrees and roles', () => {
  const node1 = {
    id: 's-1',
    fullName: 'David Nguyen',
    role: 'VP Engineering',
    organization: 'TechFlow Global',
    isDecisionMaker: true,
    networkOverlapDegree: 'first_degree' as const,
    mutualCompanies: ['FinFlow Global', 'VNG Corp'],
    mutualTenureOverlapMonths: 36,
    potentialBackchannelIntermediaries: ['Alice Tran'],
    predictedSentiment: 'champion' as const
  };
  const res1 = calculateBackchannelProbability(node1);
  assert.ok(res1.probabilityScore >= 80);
  assert.ok(res1.rationale.includes('1st-degree'));
  assert.ok(res1.rationale.includes('shared historical employers'));

  const node2 = {
    id: 's-2',
    fullName: 'Robert Miller',
    role: 'External Board Director',
    organization: 'FinTech Capital',
    isDecisionMaker: false,
    networkOverlapDegree: 'third_degree' as const,
    mutualCompanies: [],
    mutualTenureOverlapMonths: 0,
    potentialBackchannelIntermediaries: [],
    predictedSentiment: 'neutral' as const
  };
  const res2 = calculateBackchannelProbability(node2);
  assert.ok(res2.probabilityScore <= 20);
});

test('contract: compute360CoverageMatrix validates archetype balance, identifies missing archetypes, and flags competency gaps', () => {
  const sampleAdvocates: ReferenceAdvocateDTO[] = [
    {
      id: 'adv-1',
      fullName: 'Michael Pham',
      currentTitle: 'Chief Technology Officer',
      currentCompany: 'Apex FinTech',
      relationshipArchetype: 'superior_sponsor',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2020-01',
      sharedTenureEnd: '2023-06',
      sharedTenureMonths: 42,
      projectsCoDelivered: ['Global Core Payment Gateway'],
      endorsementStrength: 'unconditional_champion',
      vouchedCompetencies: ['scaling_0_to_1', 'board_governance', 'crisis_incident_response'],
      email: 'michael.pham@example.com',
      preferredChannel: 'email',
      ndaRestricted: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'adv-2',
      fullName: 'Sarah Chen',
      currentTitle: 'VP of Product',
      currentCompany: 'CloudSphere',
      relationshipArchetype: 'cross_functional_peer',
      sharedCompany: 'FinFlow Global',
      sharedTenureStart: '2020-05',
      sharedTenureEnd: '2023-06',
      sharedTenureMonths: 37,
      projectsCoDelivered: ['Multi-Tenant Billing Engine'],
      endorsementStrength: 'strong_advocate',
      vouchedCompetencies: ['cross_functional_synergy', 'scaling_0_to_1'],
      email: 'sarah.chen@example.com',
      preferredChannel: 'linkedin',
      ndaRestricted: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const matrix = compute360CoverageMatrix(sampleAdvocates);
  assert.equal(matrix.totalAdvocates, 2);
  assert.equal(matrix.archetypeCounts.superior_sponsor, 1);
  assert.equal(matrix.archetypeCounts.cross_functional_peer, 1);
  assert.equal(matrix.archetypeCounts.direct_report, 0);
  assert.ok(matrix.missingArchetypes.includes('direct_report'));
  assert.ok(matrix.criticalGaps.some(g => g.includes('Missing Direct-Report Referee')));
  assert.ok(matrix.overallReadinessScore >= 30 && matrix.overallReadinessScore <= 70);
});

test('contract: computeAuditVulnerabilityIndex calculates accurate vulnerability index, tier, and recommendations', () => {
  const highRiskStakeholders: TargetStakeholderNodeDTO[] = [
    {
      id: 's-1',
      fullName: 'Hostile Manager',
      role: 'VP Tech',
      organization: 'Target Corp',
      isDecisionMaker: true,
      networkOverlapDegree: 'first_degree',
      mutualCompanies: ['PastCorp'],
      mutualTenureOverlapMonths: 36,
      potentialBackchannelIntermediaries: [],
      predictedSentiment: 'adverse_risk',
      probabilityScore: 90,
      rationale: 'Known past management clash'
    }
  ];

  const auditResult = computeAuditVulnerabilityIndex(highRiskStakeholders);
  assert.ok(auditResult.vulnerabilityIndex >= 75);
  assert.equal(auditResult.level, 'critical_backchannel_danger');
  assert.ok(auditResult.recommendations.some(r => r.includes('Immediate Action')));

  const emptyAudit = computeAuditVulnerabilityIndex([]);
  assert.equal(emptyAudit.vulnerabilityIndex, 0);
  assert.equal(emptyAudit.level, 'low_risk');
});

test('contract: generateRefereeBriefingPacketMarkdown formats complete briefing packet with markdown dossier', () => {
  const advocate: ReferenceAdvocateDTO = {
    id: 'adv-1',
    fullName: 'Michael Pham',
    currentTitle: 'Chief Technology Officer',
    currentCompany: 'Apex FinTech',
    relationshipArchetype: 'superior_sponsor',
    sharedCompany: 'FinFlow Global',
    sharedTenureStart: '2020-01',
    sharedTenureEnd: '2023-06',
    sharedTenureMonths: 42,
    projectsCoDelivered: ['Global Core Payment Gateway'],
    endorsementStrength: 'unconditional_champion',
    vouchedCompetencies: ['scaling_0_to_1', 'board_governance'],
    email: 'michael.pham@example.com',
    preferredChannel: 'email',
    ndaRestricted: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z'
  };

  const audit = {
    targetCompany: 'HyperScale AI',
    targetRole: 'VP of Engineering',
    applicationId: 'app-99'
  };

  const packet = generateRefereeBriefingPacketMarkdown(advocate, audit);
  assert.equal(packet.advocateId, 'adv-1');
  assert.equal(packet.targetCompany, 'HyperScale AI');
  assert.ok(packet.formattedMarkdown.includes('# Executive Reference Briefing Packet'));
  assert.ok(packet.formattedMarkdown.includes('Global Core Payment Gateway'));
  assert.ok(packet.formattedMarkdown.includes('Michael Pham'));
  assert.ok(packet.priorityProjectsToHighlight.length > 0);
});

test('contract: validateReferenceAdvocateInput and validateBackchannelAuditInput enforce strict validation', () => {
  const validAdvocate = validateReferenceAdvocateInput({
    fullName: 'Alice Walker',
    currentTitle: 'VP People',
    currentCompany: 'Nexus AI',
    relationshipArchetype: 'cross_functional_peer',
    sharedCompany: 'CloudScale',
    sharedTenureStart: '2021-01',
    sharedTenureEnd: '2023-01',
    sharedTenureMonths: 24,
    projectsCoDelivered: ['Hiring 50 Engineers in 9 months'],
    endorsementStrength: 'strong_advocate',
    vouchedCompetencies: ['people_leadership'],
    email: 'alice.walker@example.com',
    preferredChannel: 'email',
    ndaRestricted: false
  });
  assert.equal(validAdvocate.ok, true);

  const invalidAdvocate = validateReferenceAdvocateInput({
    fullName: '',
    email: 'invalid-email'
  });
  assert.equal(invalidAdvocate.ok, false);

  const validAudit = validateBackchannelAuditInput({
    auditName: 'Q1 HyperScale Backchannel Defense',
    targetCompany: 'HyperScale AI',
    targetRole: 'VP of Engineering',
    advocateIds: ['adv-1'],
    stakeholders: [],
    risks: []
  });
  assert.equal(validAudit.ok, true);

  const invalidAudit = validateBackchannelAuditInput({
    auditName: '',
    targetCompany: ''
  });
  assert.equal(invalidAudit.ok, false);
});

test('contract: computeNonCompeteSubScore evaluates jurisdiction statutory limits and garden leave', () => {
  const caScore = computeNonCompeteSubScore({
    durationMonths: 12,
    scope: 'industry_vertical',
    gardenLeavePercent: 0,
    solicitationBreadth: 'all_employees_contractors',
    explicitCaDisclaimer: false
  }, 'us_california');
  assert.ok(caScore.risks.some(r => r.includes('California')));
  assert.ok(caScore.subScore >= 75);

  const deScore = computeNonCompeteSubScore({
    durationMonths: 6,
    scope: 'narrow_named_competitors',
    gardenLeavePercent: 100,
    solicitationBreadth: 'senior_execs_only',
    explicitCaDisclaimer: false
  }, 'us_delaware_ny');
  assert.ok(deScore.subScore <= 25);
});

test('contract: computeIpAssignmentSubScore handles prior invention carveouts and statutory protections', () => {
  const protectedScore = computeIpAssignmentSubScore({
    priorInventionsScheduleAttached: true,
    priorInventionsCount: 3,
    assignmentScope: 'narrow_company_business',
    moonlightOpenSourcePermitted: true,
    statutoryProtectionCited: true
  }, 'us_california');
  assert.ok(protectedScore.subScore <= 20);

  const omnibusScore = computeIpAssignmentSubScore({
    priorInventionsScheduleAttached: false,
    priorInventionsCount: 0,
    assignmentScope: 'omnibus_perpetual',
    moonlightOpenSourcePermitted: false,
    statutoryProtectionCited: false
  }, 'us_delaware_ny');
  assert.ok(omnibusScore.subScore >= 80);
});

test('contract: computeSeveranceSubScore, changeOfControl, and indemnification calculate correctly', () => {
  const sevScore = computeSeveranceSubScore({
    cashSalaryMonths: 12,
    targetBonusIncluded: true,
    healthBenefitMonths: 12,
    goodReasonResignationCovered: true,
    narrowCauseDefinition: true
  }, 'us_delaware_ny');
  assert.ok(sevScore.subScore <= 20);

  const toxicSevScore = computeSeveranceSubScore({
    cashSalaryMonths: 0,
    targetBonusIncluded: false,
    healthBenefitMonths: 0,
    goodReasonResignationCovered: false,
    narrowCauseDefinition: false
  }, 'us_delaware_ny');
  assert.equal(toxicSevScore.subScore, 100);

  const cicScore = computeChangeOfControlSubScore({
    accelerationType: 'double_trigger_full',
    protectionWindowMonths: 18,
    ptepMonths: 36,
    goldenParachuteCutbackProtected: true
  }, 'us_delaware_ny');
  assert.ok(cicScore.subScore <= 20);

  const indemScore = computeIndemnificationSubScore({
    standaloneAgreementSigned: true,
    policyCoverageAdequate: true,
    mandatoryAdvancement: true,
    tailCoverageSixYears: true
  }, 'us_delaware_ny');
  assert.ok(indemScore.subScore <= 20);
});

test('contract: evaluateExecutiveContract aggregates composite CRI and identifies toxic clauses', () => {
  const evaluation = evaluateExecutiveContract({
    non_compete_non_solicit: {
      durationMonths: 24,
      scope: 'worldwide_broad',
      gardenLeavePercent: 0,
      solicitationBreadth: 'all_customers_vendors',
      explicitCaDisclaimer: false
    },
    ip_prior_inventions: {
      priorInventionsScheduleAttached: false,
      priorInventionsCount: 0,
      assignmentScope: 'omnibus_perpetual',
      moonlightOpenSourcePermitted: false,
      statutoryProtectionCited: false
    },
    severance_without_cause: {
      cashSalaryMonths: 2,
      targetBonusIncluded: false,
      healthBenefitMonths: 2,
      goodReasonResignationCovered: false,
      narrowCauseDefinition: false
    },
    double_trigger_cic: {
      accelerationType: 'none',
      protectionWindowMonths: 6,
      ptepMonths: 3,
      goldenParachuteCutbackProtected: false
    },
    indemnification_d_and_o: {
      standaloneAgreementSigned: false,
      policyCoverageAdequate: false,
      mandatoryAdvancement: false,
      tailCoverageSixYears: false
    }
  }, 'us_california');

  assert.ok(evaluation.contractRiskIndex >= 70);
  assert.equal(evaluation.riskTier, 'critical_toxic');
  assert.ok(evaluation.activeHazards.length > 0);
  assert.equal(evaluation.clauses.length, 5);
  const toxicClauses = evaluation.clauses.filter(c => c.isToxic);
  assert.ok(toxicClauses.length >= 3);
});

test('contract: generateSynthesizedRedlines produces prioritized actionable redlines', () => {
  const evalResult = evaluateExecutiveContract({
    non_compete_non_solicit: {
      durationMonths: 18,
      scope: 'worldwide_broad',
      gardenLeavePercent: 0,
      solicitationBreadth: 'all_employees_contractors',
      explicitCaDisclaimer: false
    },
    ip_prior_inventions: {
      priorInventionsScheduleAttached: false,
      priorInventionsCount: 0,
      assignmentScope: 'omnibus_perpetual',
      moonlightOpenSourcePermitted: false,
      statutoryProtectionCited: false
    },
    severance_without_cause: {
      cashSalaryMonths: 3,
      targetBonusIncluded: false,
      healthBenefitMonths: 3,
      goodReasonResignationCovered: false,
      narrowCauseDefinition: false
    },
    double_trigger_cic: {
      accelerationType: 'none',
      protectionWindowMonths: 6,
      ptepMonths: 3,
      goldenParachuteCutbackProtected: false
    },
    indemnification_d_and_o: {
      standaloneAgreementSigned: false,
      policyCoverageAdequate: false,
      mandatoryAdvancement: false,
      tailCoverageSixYears: false
    }
  }, 'us_california');

  const redlines = generateSynthesizedRedlines({
    id: 'contract-test',
    companyName: 'Acme Cloud Inc.',
    roleTitle: 'VP of Engineering',
    jurisdiction: 'us_california',
    pillarScores: evalResult.pillarScores,
    clauses: evalResult.clauses
  });

  assert.ok(redlines.length >= 4);
  const ncRedline = redlines.find(r => r.pillarKey === 'non_compete_non_solicit');
  assert.ok(ncRedline);
  assert.ok(ncRedline.redlineText.includes('California'));
  assert.ok(ncRedline.candidateJustification.length > 0);
});

test('contract: generateExhibitAMarkdown and generateExecutiveAddendumMarkdown format legal documents', () => {
  const priorInventions: PriorInventionItemDTO[] = [
    {
      id: 'inv-1',
      category: 'open_source_repo',
      title: 'HyperQueue Distributed Broker',
      identifierOrUrl: 'https://github.com/exec/hyperqueue',
      creationDate: '2024-03-15',
      technologyDescription: 'Zero-copy distributed log streaming framework in Rust.',
      retainedRights: ['Full Commercial Copyright', 'Derivative Works Exclusive'],
      confidentialExclusionConfirmed: true
    }
  ];

  const exhibitA = generateExhibitAMarkdown({
    companyName: 'Acme Cloud Inc.',
    roleTitle: 'VP of Engineering'
  }, priorInventions);

  assert.ok(exhibitA.includes('EXHIBIT A: SCHEDULE OF PRIOR INVENTIONS'));
  assert.ok(exhibitA.includes('HyperQueue Distributed Broker'));
  assert.ok(exhibitA.includes('Zero-copy distributed log streaming framework'));

  const redlines: ContractRedlineDTO[] = [
    {
      id: 'red-1',
      contractId: 'contract-1',
      pillarKey: 'non_compete_non_solicit',
      clauseTitle: 'California Non-Compete Statutory Carve-Out',
      originalText: 'Employee agrees not to compete.',
      redlineText: 'Clause is void pursuant to Cal. Bus. & Prof. Code §16600.',
      candidateJustification: 'Unenforceable under California law.',
      fallbackCompromise: 'Trade secret protection only.',
      statutoryCitation: 'Cal. Bus. & Prof. Code §16600',
      status: 'proposed',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const addendum = generateExecutiveAddendumMarkdown({
    companyName: 'Acme Cloud Inc.',
    roleTitle: 'VP of Engineering',
    jurisdiction: 'us_california'
  }, redlines);

  assert.ok(addendum.includes('EXECUTIVE COUNTER-AMENDMENT ADDENDUM'));
  assert.ok(addendum.includes('Acme Cloud Inc.'));
  assert.ok(addendum.includes('VP of Engineering'));
});

test('contract: validateExecutiveContractInput, validatePriorInventionInput, validateContractRedlineInput enforce schema validation', () => {
  const validContract = validateExecutiveContractInput({
    companyName: 'Acme Cloud Inc.',
    roleTitle: 'VP of Engineering',
    jurisdiction: 'us_delaware_ny',
    clauseParameters: {
      non_compete_non_solicit: {
        durationMonths: 12,
        scope: 'industry_vertical',
        gardenLeavePercent: 50,
        solicitationBreadth: 'senior_execs_only',
        explicitCaDisclaimer: false
      },
      ip_prior_inventions: {
        priorInventionsScheduleAttached: true,
        priorInventionsCount: 1,
        assignmentScope: 'narrow_company_business',
        moonlightOpenSourcePermitted: true,
        statutoryProtectionCited: true
      },
      severance_without_cause: {
        cashSalaryMonths: 6,
        targetBonusIncluded: true,
        healthBenefitMonths: 6,
        goodReasonResignationCovered: true,
        narrowCauseDefinition: true
      },
      double_trigger_cic: {
        accelerationType: 'double_trigger_partial',
        protectionWindowMonths: 12,
        ptepMonths: 12,
        goldenParachuteCutbackProtected: true
      },
      indemnification_d_and_o: {
        standaloneAgreementSigned: true,
        policyCoverageAdequate: true,
        mandatoryAdvancement: true,
        tailCoverageSixYears: true
      }
    }
  });
  assert.equal(validContract.ok, true);

  const invalidContract = validateExecutiveContractInput({
    companyName: '',
    roleTitle: ''
  });
  assert.equal(invalidContract.ok, false);

  const validInvention = validatePriorInventionInput({
    category: 'open_source_repo',
    title: 'Distributed Actor Framework',
    identifierOrUrl: 'https://github.com/test/actor-framework',
    creationDate: '2025-01-01',
    technologyDescription: 'Actor runtime with gossip clustering',
    retainedRights: ['Full Commercial Copyright'],
    confidentialExclusionConfirmed: true
  });
  assert.equal(validInvention.ok, true);

  const invalidInvention = validatePriorInventionInput({
    category: 'invalid_cat',
    title: ''
  });
  assert.equal(invalidInvention.ok, false);

  const validRedline = validateContractRedlineInput({
    pillarKey: 'non_compete_non_solicit',
    clauseTitle: 'Section 8: Restrictive Covenants',
    originalText: 'Executive shall not compete globally for 24 months.',
    redlineText: 'Clause is stricken in entirety per Cal. Bus. & Prof. Code §16600.',
    candidateJustification: 'Unenforceable and unlawful in California.',
    status: 'proposed'
  });
  assert.equal(validRedline.ok, true);

  const invalidRedline = validateContractRedlineInput({
    pillarKey: 'unknown_pillar',
    clauseTitle: ''
  });
  assert.equal(invalidRedline.ok, false);
});

test('contract: computeStakeholderRelationshipIndex calculates coverage, sentiment, and diversity accurately', () => {
  const emptyRes = computeStakeholderRelationshipIndex([]);
  assert.equal(emptyRes.sri, 0);
  assert.equal(emptyRes.coverageRate, 0);
  assert.equal(emptyRes.avgSentiment, 0);
  assert.equal(emptyRes.diversityFactor, 0);

  const now = new Date().toISOString();
  const mockStakeholders: StakeholderDTO[] = [
    {
      id: 's1',
      planId: 'plan-1',
      name: 'Sarah Jenkins',
      roleTitle: 'CEO & Co-founder',
      category: 'executive_sponsor',
      expectations: 'Stabilize cloud infrastructure',
      painPoints: 'Incident load',
      politicalDynamics: 'Strong board backing',
      sentimentScore: 5,
      interviewDate: '2026-10-01',
      status: 'completed',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 's2',
      planId: 'plan-1',
      name: 'Marcus Vance',
      roleTitle: 'VP of Product',
      category: 'peer_executive',
      expectations: 'Predictable sprint delivery',
      painPoints: 'Missed launch dates',
      politicalDynamics: 'Product-led culture history',
      sentimentScore: 4,
      interviewDate: '2026-10-03',
      status: 'completed',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 's3',
      planId: 'plan-1',
      name: 'Elena Rostova',
      roleTitle: 'Engineering Manager, Core Billing',
      category: 'direct_report',
      expectations: 'Career growth and on-call relief',
      painPoints: 'Billing monolith technical debt',
      politicalDynamics: 'Key retention flight risk',
      sentimentScore: 4,
      interviewDate: '2026-10-05',
      status: 'completed',
      alignmentLevel: 'partially_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 's4',
      planId: 'plan-1',
      name: 'David Kim',
      roleTitle: 'Principal Distributed Systems Architect',
      category: 'staff_principal',
      expectations: 'Clear architecture decision record (ADR) process',
      painPoints: 'Unchecked microservice sprawl',
      politicalDynamics: 'High technical credibility with ICs',
      sentimentScore: 4,
      interviewDate: '2026-10-07',
      status: 'completed',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 's5',
      planId: 'plan-1',
      name: 'Priya Sharma',
      roleTitle: 'VP of Customer Success',
      category: 'customer_ops',
      expectations: 'Faster customer bug escalations',
      painPoints: 'Slow turnaround on tier-1 escalations',
      politicalDynamics: 'Protective of enterprise account retention',
      sentimentScore: 3,
      interviewDate: null,
      status: 'scheduled',
      alignmentLevel: 'partially_aligned',
      createdAt: now,
      updatedAt: now
    }
  ];

  const result = computeStakeholderRelationshipIndex(mockStakeholders);
  assert.equal(result.coverageRate, 80);
  assert.equal(result.diversityFactor, 80);
  assert.ok(result.avgSentiment >= 80);
  assert.ok(result.sri >= 75 && result.sri <= 95);
});

test('contract: computeDiagnosticHealthIndex calculates severity tiers, bottlenecks count, and composite DHI', () => {
  const defaultDiag = createDefaultExecutiveDiagnostics();
  assert.ok(defaultDiag.diagnosticHealthIndex > 65);
  assert.ok(defaultDiag.identifiedBottlenecksCount >= 6);
  assert.equal(defaultDiag.architectureTechDebt.severityLevel, 'moderate_risk');

  const customDiag = computeDiagnosticHealthIndex({
    architectureTechDebt: {
      score: 95,
      primaryBottlenecks: [],
      immediateMitigations: [],
      actionPlan: 'Pristine decoupled event architecture'
    },
    deliveryVelocityIncidentCadence: {
      score: 85,
      primaryBottlenecks: [],
      immediateMitigations: [],
      actionPlan: 'Continuous deployment with automated rollbacks'
    },
    teamMoraleFlightRisks: {
      score: 90,
      primaryBottlenecks: [],
      immediateMitigations: [],
      actionPlan: 'High psychological safety and clear career ladders'
    },
    strategicProductEngineeringAlignment: {
      score: 90,
      primaryBottlenecks: [],
      immediateMitigations: [],
      actionPlan: 'Co-owned OKRs and joint discovery triads'
    }
  });

  assert.equal(customDiag.diagnosticHealthIndex, 90);
  assert.equal(customDiag.architectureTechDebt.severityLevel, 'healthy');
  assert.equal(customDiag.criticalHazardsCount, 0);
  assert.equal(customDiag.identifiedBottlenecksCount, 0);

  const hazardousDiag = computeDiagnosticHealthIndex({
    architectureTechDebt: {
      score: 30,
      primaryBottlenecks: ['Single point of failure database cluster'],
      immediateMitigations: ['Failover replica'],
      actionPlan: 'Emergency cluster migration'
    },
    deliveryVelocityIncidentCadence: {
      score: 35,
      primaryBottlenecks: ['Manual bi-monthly releases with high outage frequency'],
      immediateMitigations: ['Rollback automation'],
      actionPlan: 'CI/CD pipeline refactor'
    },
    teamMoraleFlightRisks: {
      score: 45,
      primaryBottlenecks: ['3 key staff departures pending'],
      immediateMitigations: ['Retention equity grants'],
      actionPlan: 'Leadership 1-on-1s'
    },
    strategicProductEngineeringAlignment: {
      score: 50,
      primaryBottlenecks: ['Feature delivery deadline conflicts with safety'],
      immediateMitigations: ['Executive escalation'],
      actionPlan: 'Scope negotiation'
    }
  });

  assert.equal(hazardousDiag.architectureTechDebt.severityLevel, 'critical_hazard');
  assert.equal(hazardousDiag.deliveryVelocityIncidentCadence.severityLevel, 'critical_hazard');
  assert.equal(hazardousDiag.teamMoraleFlightRisks.severityLevel, 'high_vulnerability');
  assert.ok(hazardousDiag.diagnosticHealthIndex <= 45);
  assert.equal(hazardousDiag.criticalHazardsCount, 4);
});

test('contract: computeTransitionMomentum evaluates quick wins, milestones, and transition momentum tier', () => {
  const now = new Date().toISOString();
  const defaultDiag = createDefaultExecutiveDiagnostics();
  const mockStakeholders: StakeholderDTO[] = [
    {
      id: 's1',
      planId: 'plan-1',
      name: 'CEO',
      roleTitle: 'CEO',
      category: 'executive_sponsor',
      expectations: '',
      painPoints: '',
      politicalDynamics: '',
      sentimentScore: 5,
      interviewDate: '2026-10-01',
      status: 'completed',
      alignmentLevel: 'strongly_aligned',
      createdAt: now,
      updatedAt: now
    }
  ];

  const mockMilestones: OnboardingMilestoneDTO[] = [
    {
      id: 'm1',
      planId: 'plan-1',
      phase: 'phase_1_listen_align',
      title: 'Fix Canary Deployment Flake',
      description: 'Zero out intermittent pipeline test failures',
      targetDay: 14,
      deliveredDay: 12,
      status: 'achieved',
      isQuickWin: true,
      deliveryEstimateDays: 5,
      impactScore: 8,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'm2',
      planId: 'plan-1',
      phase: 'phase_1_listen_align',
      title: 'Automate On-Call Handoff Runbook',
      description: 'Deploy PagerDuty integration for automated shift handover',
      targetDay: 20,
      deliveredDay: 18,
      status: 'achieved',
      isQuickWin: true,
      deliveryEstimateDays: 7,
      impactScore: 7,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'm3',
      planId: 'plan-1',
      phase: 'phase_2_synthesize_wins',
      title: 'Complete Monolith Domain Splitting RFC',
      description: 'Draft architecture boundary proposal for checkout',
      targetDay: 45,
      deliveredDay: null,
      status: 'in_progress',
      isQuickWin: false,
      deliveryEstimateDays: 20,
      impactScore: 9,
      blockerReason: null,
      createdAt: now,
      updatedAt: now
    }
  ];

  const momentum = computeTransitionMomentum(mockStakeholders, defaultDiag, mockMilestones, 25);
  assert.equal(momentum.quickWinsTotal, 2);
  assert.equal(momentum.quickWinsDelivered, 2);
  assert.equal(momentum.quickWinDeliveryRate, 100);
  assert.ok(momentum.milestoneExecutionRate >= 65);
  assert.ok(momentum.transitionMomentumIndex >= 70);
  assert.ok(momentum.tier === 'on_track' || momentum.tier === 'accelerating');

  const emptyMomentum = computeTransitionMomentum([], defaultDiag, [], 1);
  assert.ok(emptyMomentum.transitionMomentumIndex < 50);
  assert.equal(emptyMomentum.tier, 'at_risk');
});

test('contract: generateExecutiveMemoMarkdown synthesizes Day 30, Day 60, and Day 100 briefs', () => {
  const now = new Date().toISOString();
  const diag = createDefaultExecutiveDiagnostics();
  const mockPlan: ExecutiveOnboardingPlanDTO = {
    id: 'plan-test-1',
    userId: 'user-1',
    applicationId: null,
    companyName: 'Acme Cloud AI',
    roleTitle: 'VP of Engineering',
    startDate: '2026-10-01',
    currentDay: 30,
    executiveSponsorName: 'Sarah Jenkins',
    stakeholders: [
      {
        id: 's1',
        planId: 'plan-test-1',
        name: 'Sarah Jenkins',
        roleTitle: 'CEO',
        category: 'executive_sponsor',
        expectations: 'Growth and stability',
        painPoints: 'Slow velocity',
        politicalDynamics: 'Founder authority',
        sentimentScore: 5,
        interviewDate: '2026-10-02',
        status: 'completed',
        alignmentLevel: 'strongly_aligned',
        createdAt: now,
        updatedAt: now
      }
    ],
    diagnostics: diag,
    milestones: [
      {
        id: 'm1',
        planId: 'plan-test-1',
        phase: 'phase_1_listen_align',
        title: 'Stabilize CI pipeline',
        description: 'Fixed Docker cache layering',
        targetDay: 14,
        deliveredDay: 10,
        status: 'achieved',
        isQuickWin: true,
        deliveryEstimateDays: 5,
        impactScore: 8,
        blockerReason: null,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'm2',
        planId: 'plan-test-1',
        phase: 'phase_3_transform_scale',
        title: 'Multi-region cluster deploy',
        description: 'Establish European data plane',
        targetDay: 90,
        deliveredDay: null,
        status: 'planned',
        isQuickWin: false,
        deliveryEstimateDays: 30,
        impactScore: 10,
        blockerReason: null,
        createdAt: now,
        updatedAt: now
      }
    ],
    momentum: {
      transitionMomentumIndex: 82,
      tier: 'on_track',
      stakeholderRelationshipIndex: 85,
      diagnosticHealthIndex: 74,
      quickWinDeliveryRate: 100,
      milestoneExecutionRate: 50,
      actionPlansCoverageRate: 100,
      currentDay: 30,
      totalStakeholders: 1,
      interviewedStakeholders: 1,
      totalMilestones: 2,
      achievedMilestones: 1,
      quickWinsTotal: 1,
      quickWinsDelivered: 1
    },
    createdAt: now,
    updatedAt: now
  };

  const day30 = generateExecutiveMemoMarkdown('day_30_listening_tour', mockPlan);
  assert.ok(day30.includes('EXECUTIVE MEMO: Day 30 Listening Tour Insights'));
  assert.ok(day30.includes('Acme Cloud AI'));
  assert.ok(day30.includes('Sarah Jenkins'));
  assert.ok(day30.includes('Stakeholder Sentiment & 360 Alignment Matrix'));

  const day60 = generateExecutiveMemoMarkdown('day_60_strategic_priorities', mockPlan);
  assert.ok(day60.includes('EXECUTIVE BRIEFING: Day 60 Strategic Priorities'));
  assert.ok(day60.includes('Early Wins Delivered & Business Impact'));

  const day100 = generateExecutiveMemoMarkdown('day_100_transformation_charter', mockPlan);
  assert.ok(day100.includes('BOARD CHARTER: Day 100 Engineering Transformation Review'));
  assert.ok(day100.includes('1-Year Strategic Technology & Organizational Charter'));
});

test('contract: executive onboarding input validators enforce schemas and bounds', () => {
  const validPlan = validateExecutiveOnboardingPlanInput({
    companyName: 'Acme Cloud AI',
    roleTitle: 'VP of Engineering',
    startDate: '2026-10-01',
    currentDay: 34,
    executiveSponsorName: 'Sarah Jenkins'
  });
  assert.equal(validPlan.ok, true);

  const invalidPlanDay = validateExecutiveOnboardingPlanInput({
    companyName: 'Acme',
    roleTitle: 'CTO',
    startDate: '2026-10-01',
    currentDay: 150
  });
  assert.equal(invalidPlanDay.ok, false);

  const invalidPlanEmpty = validateExecutiveOnboardingPlanInput({
    companyName: '',
    roleTitle: ''
  });
  assert.equal(invalidPlanEmpty.ok, false);

  const validStakeholder = validateStakeholderInput({
    name: 'David Kim',
    roleTitle: 'Principal Architect',
    category: 'staff_principal',
    expectations: 'Clear architecture decision records',
    painPoints: 'Legacy sprawl',
    politicalDynamics: 'High IC influence',
    sentimentScore: 4,
    status: 'completed',
    alignmentLevel: 'strongly_aligned'
  });
  assert.equal(validStakeholder.ok, true);

  const invalidStakeholderScore = validateStakeholderInput({
    name: 'David Kim',
    roleTitle: 'Principal Architect',
    category: 'staff_principal',
    sentimentScore: 10,
    status: 'completed',
    alignmentLevel: 'strongly_aligned'
  });
  assert.equal(invalidStakeholderScore.ok, false);

  const validMilestone = validateMilestoneInput({
    phase: 'phase_1_listen_align',
    title: 'Deploy Automated Canary Testing',
    description: 'De-risk releases with error budget triggers',
    targetDay: 25,
    status: 'in_progress',
    isQuickWin: true,
    deliveryEstimateDays: 7,
    impactScore: 8
  });
  assert.equal(validMilestone.ok, true);

  const invalidMilestonePhase = validateMilestoneInput({
    phase: 'unknown_phase',
    title: 'Deploy',
    targetDay: 20,
    status: 'planned',
    isQuickWin: false,
    deliveryEstimateDays: 5,
    impactScore: 5
  });
  assert.equal(invalidMilestonePhase.ok, false);

  const validDiag = validateDiagnosticsInput({
    architectureTechDebt: { score: 75 },
    deliveryVelocityIncidentCadence: { score: 80 },
    teamMoraleFlightRisks: { score: 70 },
    strategicProductEngineeringAlignment: { score: 85 }
  });
  assert.equal(validDiag.ok, true);

  const invalidDiag = validateDiagnosticsInput({
    architectureTechDebt: { score: 150 }
  });
  assert.equal(invalidDiag.ok, false);
});

test('contract: getFastEquityBenchmark and computeRetainedEquity evaluate stages and dilution rounds', () => {
  assert.equal(getFastEquityBenchmark('idea_stage', 'standard'), 0.25);
  assert.equal(getFastEquityBenchmark('idea_stage', 'expert_intensive'), 1.0);
  assert.equal(getFastEquityBenchmark('seed_stage', 'strategic'), 0.3);
  assert.equal(getFastEquityBenchmark('series_a', 'standard'), 0.1);
  assert.equal(getFastEquityBenchmark('series_b_plus', 'strategic'), 0.1);

  const retainedNoDilution = computeRetainedEquity(0.5, 0, 0.2);
  assert.equal(retainedNoDilution, 0.5);

  const retainedTwoRounds = computeRetainedEquity(0.5, 2, 0.2);
  assert.equal(retainedTwoRounds, 0.32);

  const retainedFourRounds = computeRetainedEquity(1.0, 4, 0.2);
  assert.equal(retainedFourRounds, 0.4096);
});

test('contract: computeFastEquityDilutionModel models exit scenarios and hourly yields', () => {
  const mockMandate: BoardMandateDTO = {
    id: 'man-1',
    userId: 'u-1',
    targetCompanyName: 'Nexar AI',
    mandateType: 'advisory_board',
    stage: 'offer_term_sheet',
    annualCashRetainer: 12000,
    meetingFeePerBoardMeeting: 1000,
    meetingFeePerCommitteeMeeting: 500,
    expectedBoardMeetingsPerYear: 4,
    expectedCommitteeMeetingsPerYear: 4,
    equityPercentage: 0.5,
    equityGrantType: 'nso_options',
    vestingSchedule: 'two_year_monthly_no_cliff',
    accelerationClause: 'single_trigger_change_of_control',
    optionStrikePrice: 2000,
    timeCommitmentHoursPerMonth: 5,
    termLengthYears: 2,
    committeeAssignments: ['tech_cybersecurity'],
    hasDAndOInsurance: true,
    dAndOPolicyLimitMillions: 5,
    hasSideADicCoverage: true,
    hasIndemnificationAgreement: true,
    notes: 'Strategic cloud architecture advisory',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const model = computeFastEquityDilutionModel(mockMandate, 'seed_stage', 'strategic', 2, 0.2, 0.2);
  assert.equal(model.mandateId, 'man-1');
  assert.equal(model.retainedEquityPercentage, 0.32);
  assert.equal(model.totalInvestedHours, 120);
  assert.equal(model.benchmark.benchmarkPercentage, 0.3);
  assert.equal(model.benchmark.variancePercentage, 0.2);
  assert.equal(model.benchmark.isFairMarketOrAbove, true);
  assert.equal(model.scenarios.length, 4);

  const baseScenario = model.scenarios.find(s => s.scenarioName === 'base');
  assert.ok(baseScenario);
  assert.equal(baseScenario.exitValuationMillions, 100);
  assert.equal(baseScenario.grossProceedsUsd, 320000);
  assert.ok(baseScenario.netProceedsUsd > 250000);
  assert.ok(baseScenario.effectiveHourlyYieldUsd > 2000);
});

test('contract: evaluateConflictOfInterest and generateOutsideBoardWaiverLetter handle Clayton Act and safe harbors', () => {
  const mockDirectorMandate: BoardMandateDTO = {
    id: 'man-dir-1',
    userId: 'u-1',
    targetCompanyName: 'Rival Cloud Inc',
    mandateType: 'board_of_directors',
    stage: 'board_diligence',
    annualCashRetainer: 45000,
    meetingFeePerBoardMeeting: 2000,
    meetingFeePerCommitteeMeeting: 1000,
    expectedBoardMeetingsPerYear: 6,
    expectedCommitteeMeetingsPerYear: 4,
    equityPercentage: 0.4,
    equityGrantType: 'rsu',
    vestingSchedule: 'four_year_one_year_cliff',
    accelerationClause: 'double_trigger_change_and_termination',
    optionStrikePrice: 0,
    timeCommitmentHoursPerMonth: 10,
    termLengthYears: 3,
    committeeAssignments: ['audit_risk', 'tech_cybersecurity'],
    hasDAndOInsurance: true,
    dAndOPolicyLimitMillions: 20,
    hasSideADicCoverage: true,
    hasIndemnificationAgreement: true,
    notes: 'Direct competitor evaluation',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const interlockCheck = evaluateConflictOfInterest(
    mockDirectorMandate,
    'Enterprise Cloud Global',
    true,
    false,
    65.0,
    75.0,
    true,
    false
  );
  assert.equal(interlockCheck.claytonActSection8ThresholdExceeded, true);
  assert.equal(interlockCheck.claytonActViolationRisk, true);
  assert.equal(interlockCheck.coiTier, 'prohibited_interlock');
  assert.ok(interlockCheck.prohibitedReason?.includes('Clayton Act Section 8'));

  const benignMandate: BoardMandateDTO = {
    ...mockDirectorMandate,
    mandateType: 'advisory_board',
    timeCommitmentHoursPerMonth: 4
  };
  const benignCheck = evaluateConflictOfInterest(
    benignMandate,
    'Enterprise Cloud Global',
    false,
    true,
    30.0,
    15.0,
    false,
    true
  );
  assert.equal(benignCheck.claytonActViolationRisk, false);
  assert.equal(benignCheck.coiTier, 'low_risk');
  assert.equal(benignCheck.waiverLetterRequired, true);

  const waiverLetter = generateOutsideBoardWaiverLetter(
    benignCheck,
    'Alex Rivera',
    'Eleanor Vance, Esq.',
    'VP of Engineering'
  );
  assert.ok(waiverLetter.includes('Alex Rivera'));
  assert.ok(waiverLetter.includes('Eleanor Vance, Esq.'));
  assert.ok(waiverLetter.includes('Enterprise Cloud Global'));
  assert.ok(waiverLetter.includes('Strict Separation of Assets, Code & Intellectual Property'));
});

test('contract: computeGovernanceQuotient and generateBoardDossierMarkdown score readiness and format dossier', () => {
  const highScoringInput = {
    fiduciaryAcumenScore: 88,
    cyberAuditOversightScore: 92,
    aiGovernanceEthicsScore: 86,
    executiveCompensationScore: 82,
    boardroomPresenceDissentScore: 84,
    verifiedCredentials: ['NACD Directorship Certified', 'Stanford Directors College']
  };

  const gqResult = computeGovernanceQuotient(highScoringInput);
  assert.ok(gqResult.governanceQuotient >= 85);
  assert.equal(gqResult.tier, 'boardroom_luminary');
  assert.ok(gqResult.qualifiedCommittees.includes('audit_risk'));
  assert.ok(gqResult.qualifiedCommittees.includes('tech_cybersecurity'));
  assert.ok(gqResult.qualifiedCommittees.includes('nominating_governance'));
  assert.ok(gqResult.qualifiedCommittees.includes('compensation'));
  assert.ok(gqResult.qualifiedCommittees.includes('ai_ethics_data'));

  const apprenticeInput = {
    fiduciaryAcumenScore: 40,
    cyberAuditOversightScore: 45,
    aiGovernanceEthicsScore: 50,
    executiveCompensationScore: 35,
    boardroomPresenceDissentScore: 40,
    verifiedCredentials: []
  };
  const apprenticeResult = computeGovernanceQuotient(apprenticeInput);
  assert.ok(apprenticeResult.governanceQuotient < 50);
  assert.equal(apprenticeResult.tier, 'governance_apprentice');
  assert.equal(apprenticeResult.qualifiedCommittees.length, 0);

  const mockMatrix: GovernanceMatrixDTO = {
    id: 'mat-1',
    userId: 'u-1',
    ...highScoringInput,
    governanceQuotient: gqResult.governanceQuotient,
    tier: gqResult.tier,
    qualifiedCommittees: gqResult.qualifiedCommittees,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const dossier = generateBoardDossierMarkdown(
    'Sarah Chen',
    'Chief Technology Officer',
    mockMatrix,
    []
  );
  assert.ok(dossier.includes('Sarah Chen'));
  assert.ok(dossier.includes('Chief Technology Officer'));
  assert.ok(dossier.includes('BOARDROOM LUMINARY'));
  assert.ok(dossier.includes('Audit & Risk Oversight'));
  assert.ok(dossier.includes('Technology & Cybersecurity Committee (SEC Item 106)'));
});

test('contract: validateBoardMandateInput and validateGovernanceMatrixInput enforce schema bounds', () => {
  const validMandate = validateBoardMandateInput({
    targetCompanyName: 'Synthetix Core',
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
    timeCommitmentHoursPerMonth: 6,
    termLengthYears: 2,
    committeeAssignments: ['tech_cybersecurity'],
    hasDAndOInsurance: true,
    dAndOPolicyLimitMillions: 5,
    hasSideADicCoverage: true,
    hasIndemnificationAgreement: true,
    notes: 'Advising on ML cluster scaling'
  });
  assert.equal(validMandate.ok, true);

  const invalidMandateMissingName = validateBoardMandateInput({
    targetCompanyName: '   ',
    mandateType: 'advisory_board',
    stage: 'initial_dialogue',
    equityPercentage: 0.35,
    timeCommitmentHoursPerMonth: 6
  });
  assert.equal(invalidMandateMissingName.ok, false);

  const invalidMandateExcessiveEquity = validateBoardMandateInput({
    targetCompanyName: 'Tech Co',
    mandateType: 'advisory_board',
    stage: 'initial_dialogue',
    equityPercentage: 45.0,
    timeCommitmentHoursPerMonth: 6
  });
  assert.equal(invalidMandateExcessiveEquity.ok, false);

  const validMatrix = validateGovernanceMatrixInput({
    fiduciaryAcumenScore: 80,
    cyberAuditOversightScore: 85,
    aiGovernanceEthicsScore: 75,
    executiveCompensationScore: 70,
    boardroomPresenceDissentScore: 78,
    verifiedCredentials: ['CERT Cyber Oversight']
  });
  assert.equal(validMatrix.ok, true);

  const invalidMatrixScore = validateGovernanceMatrixInput({
    fiduciaryAcumenScore: 120,
    cyberAuditOversightScore: 85,
    aiGovernanceEthicsScore: 75,
    executiveCompensationScore: 70,
    boardroomPresenceDissentScore: 78,
    verifiedCredentials: []
  });
  assert.equal(invalidMatrixScore.ok, false);
});

test('contract: computeSeveranceAudit evaluates executive package generosity and flags risks', () => {
  const auditParams: SeveranceAuditParams = {
    annualBaseSalaryUsd: 360000,
    cashContinuationMonths: 12,
    targetBonusPercentage: 40,
    bonusProrationMode: 'target',
    companyPerformanceMultiplier: 1.0,
    daysWorkedInFiscalYear: 270,
    monthlyCobraCostUsd: 2500,
    cobraSubsidizedMonths: 12,
    cobraTaxGrossedUp: true,
    outplacementBudgetUsd: 20000,
    accruedPtoDays: 15,
    statutoryPtoVestingMandated: true,
    unlimitedPtoForfeitureRisk: false,
    ptewMonths: 60,
    optionsHeldCount: 100000,
    estimatedExerciseCostUsd: 150000
  };

  const result = computeSeveranceAudit(auditParams);
  assert.equal(result.cashContinuationTotalUsd, 360000);
  assert.ok(result.prorataBonusTotalUsd > 100000);
  assert.equal(result.cobraBenefitTotalUsd, 45000);
  assert.ok(result.ptoPayoutTotalUsd > 20000);
  assert.equal(result.outplacementValueUsd, 20000);
  assert.ok(result.generosityScore >= 75);
  assert.equal(result.generosityTier, 'executive_favorable');
  assert.equal(result.riskFindings.length, 0);

  const goldAudit = computeSeveranceAudit({
    ...auditParams,
    cashContinuationMonths: 18,
    cobraSubsidizedMonths: 18,
    outplacementBudgetUsd: 25000,
    ptewMonths: 120
  });
  assert.ok(goldAudit.generosityScore >= 85);
  assert.equal(goldAudit.generosityTier, 'institutional_gold');

  const substandardAudit = computeSeveranceAudit({
    ...auditParams,
    cashContinuationMonths: 3,
    bonusProrationMode: 'none',
    cobraSubsidizedMonths: 2,
    ptewMonths: 3,
    unlimitedPtoForfeitureRisk: true
  });
  assert.ok(substandardAudit.generosityScore < 45);
  assert.equal(substandardAudit.generosityTier, 'substandard');
  assert.ok(substandardAudit.riskFindings.length >= 4);
});

test('contract: computeCicWaterfall models liquidation stacks and double trigger acceleration', () => {
  const waterfallParams: CicWaterfallParams = {
    enterpriseValuationUsd: 200000000,
    fundedDebtUsd: 10000000,
    balanceSheetCashUsd: 5000000,
    transactionFeePercent: 2.0,
    escrowHoldbackPercent: 5.0,
    preferredSharesStack: [
      { seriesName: 'Series A', investedAmountUsd: 15000000, liquidationMultiple: 1.0, isParticipating: false },
      { seriesName: 'Series B', investedAmountUsd: 35000000, liquidationMultiple: 1.0, isParticipating: false }
    ],
    totalFullyDilutedCommonShares: 20000000,
    unvestedOptionsCount: 100000,
    unvestedOptionsStrikePriceUsd: 1.00,
    unvestedRsuCount: 50000,
    vestedOptionsCount: 150000,
    vestedOptionsStrikePriceUsd: 1.00,
    vestedRsuCount: 25000,
    triggerMode: 'double_trigger',
    accelerationExtent: 'full_100_percent',
    cicProtectionWindowMonths: 18
  };

  const result = computeCicWaterfall(waterfallParams);
  assert.ok(result.distributableEquityProceedsUsd > 170000000);
  assert.equal(result.preferredLiquidationTotalUsd, 50000000);
  assert.ok(result.commonEquityPoolUsd > 120000000);
  assert.ok(result.commonSharePriceUsd > 6.00);
  assert.equal(result.acceleratedOptionsCount, 100000);
  assert.equal(result.acceleratedRsuCount, 50000);
  assert.ok(result.executiveNetLiquidProceedsUsd > 1800000);

  const noAccelResult = computeCicWaterfall({
    ...waterfallParams,
    triggerMode: 'none'
  });
  assert.equal(noAccelResult.acceleratedOptionsCount, 0);
  assert.equal(noAccelResult.acceleratedRsuCount, 0);
  assert.ok(noAccelResult.executiveNetLiquidProceedsUsd < result.executiveNetLiquidProceedsUsd);
});

test('contract: compute280GTax calculates safe harbor, excess parachute, and valley crossover', () => {
  const taxParams: Tax280GParams = {
    w2History5YearsUsd: [300000, 320000, 360000, 400000, 420000],
    contingentCashSeveranceUsd: 360000,
    contingentBonusUsd: 140000,
    contingentEquityAccelerationUsd: 800000,
    contingentOtherBenefitsUsd: 40000,
    federalMarginalTaxRate: 37,
    stateMarginalTaxRate: 13.3,
    medicareMarginalTaxRate: 2.35,
    corporateTaxRate: 21,
    agreedSettlementType: 'best_net_valley_rule'
  };

  const result = compute280GTax(taxParams);
  assert.equal(result.historicalAverageBaseAmountUsd, 360000);
  assert.equal(result.totalContingentParachutePaymentsUsd, 1340000);
  assert.equal(result.isParachuteTaxTriggered, true);
  assert.equal(result.excessParachutePaymentUsd, 1340000 - 360000);
  assert.equal(result.exciseTax20PercentUsd, (1340000 - 360000) * 0.20);
  assert.ok(result.breakEvenCrossoverPointUsd > 1500000);
  assert.equal(result.isInValleyOfDeath, true);
  assert.equal(result.recommendedSettlement, 'best_net_valley_rule');
  assert.ok(result.netProceedsHardCutbackUsd > result.netProceedsFullPaymentUsd);
  assert.equal(result.optimalNetTakeHomeUsd, result.netProceedsHardCutbackUsd);

  const safeTaxParams: Tax280GParams = {
    ...taxParams,
    contingentEquityAccelerationUsd: 100000
  };
  const safeResult = compute280GTax(safeTaxParams);
  assert.equal(safeResult.isParachuteTaxTriggered, false);
  assert.equal(safeResult.exciseTax20PercentUsd, 0);
  assert.equal(safeResult.isInValleyOfDeath, false);
});

test('contract: computeExecutiveLeverageIndex and counter-memo synthesis', () => {
  const index = computeExecutiveLeverageIndex({
    busFactorScore: 22,
    keyPersonClosingCondition: true,
    teamFlightRiskScore: 18,
    patentInventorshipCount: 2,
    constructiveDischargeMeritScore: 12
  });
  assert.ok(index >= 80);

  const mockCase: ExecutiveSeveranceCaseDTO = {
    id: 'case-test-1',
    companyName: 'Nova Technologies',
    roleTitle: 'Chief Technology Officer',
    effectiveSeparationDate: '2026-12-01',
    severanceParams: {
      annualBaseSalaryUsd: 400000,
      cashContinuationMonths: 6,
      targetBonusPercentage: 40,
      bonusProrationMode: 'target',
      companyPerformanceMultiplier: 1.0,
      daysWorkedInFiscalYear: 300,
      monthlyCobraCostUsd: 2500,
      cobraSubsidizedMonths: 6,
      cobraTaxGrossedUp: false,
      outplacementBudgetUsd: 10000,
      accruedPtoDays: 10,
      statutoryPtoVestingMandated: true,
      unlimitedPtoForfeitureRisk: false,
      ptewMonths: 3,
      optionsHeldCount: 50000,
      estimatedExerciseCostUsd: 50000
    },
    cicWaterfallParams: {
      enterpriseValuationUsd: 100000000,
      fundedDebtUsd: 0,
      balanceSheetCashUsd: 5000000,
      transactionFeePercent: 2,
      escrowHoldbackPercent: 5,
      preferredSharesStack: [],
      totalFullyDilutedCommonShares: 10000000,
      unvestedOptionsCount: 50000,
      unvestedOptionsStrikePriceUsd: 1,
      unvestedRsuCount: 20000,
      vestedOptionsCount: 50000,
      vestedOptionsStrikePriceUsd: 1,
      vestedRsuCount: 10000,
      triggerMode: 'double_trigger',
      accelerationExtent: 'full_100_percent',
      cicProtectionWindowMonths: 12
    },
    tax280GParams: {
      w2History5YearsUsd: [350000, 380000, 400000],
      contingentCashSeveranceUsd: 200000,
      contingentBonusUsd: 130000,
      contingentEquityAccelerationUsd: 500000,
      contingentOtherBenefitsUsd: 25000,
      federalMarginalTaxRate: 37,
      stateMarginalTaxRate: 10,
      medicareMarginalTaxRate: 2.35,
      corporateTaxRate: 21,
      agreedSettlementType: 'best_net_valley_rule'
    },
    counterProposalParams: {
      requestedCashMonths: 12,
      requestedBonusPercent: 100,
      requestedCobraMonths: 12,
      requestedPtewYears: 5,
      requestedAccelerationExtent: 'full_100_percent',
      requestedLegalFeeAllowanceUsd: 25000,
      requireMutualRelease: true,
      requireMutualNonDisparagement: true,
      statutoryWhistleblowerCarveoutsConfirmed: true,
      leverageFactors: {
        busFactorScore: 22,
        keyPersonClosingCondition: true,
        teamFlightRiskScore: 18,
        patentInventorshipCount: 2,
        constructiveDischargeMeritScore: 12
      }
    },
    auditResult: computeSeveranceAudit({
      annualBaseSalaryUsd: 400000,
      cashContinuationMonths: 6,
      targetBonusPercentage: 40,
      bonusProrationMode: 'target',
      companyPerformanceMultiplier: 1.0,
      daysWorkedInFiscalYear: 300,
      monthlyCobraCostUsd: 2500,
      cobraSubsidizedMonths: 6,
      cobraTaxGrossedUp: false,
      outplacementBudgetUsd: 10000,
      accruedPtoDays: 10,
      statutoryPtoVestingMandated: true,
      unlimitedPtoForfeitureRisk: false,
      ptewMonths: 3,
      optionsHeldCount: 50000,
      estimatedExerciseCostUsd: 50000
    }),
    cicResult: computeCicWaterfall({
      enterpriseValuationUsd: 100000000,
      fundedDebtUsd: 0,
      balanceSheetCashUsd: 5000000,
      transactionFeePercent: 2,
      escrowHoldbackPercent: 5,
      preferredSharesStack: [],
      totalFullyDilutedCommonShares: 10000000,
      unvestedOptionsCount: 50000,
      unvestedOptionsStrikePriceUsd: 1,
      unvestedRsuCount: 20000,
      vestedOptionsCount: 50000,
      vestedOptionsStrikePriceUsd: 1,
      vestedRsuCount: 10000,
      triggerMode: 'double_trigger',
      accelerationExtent: 'full_100_percent',
      cicProtectionWindowMonths: 12
    }),
    tax280GResult: compute280GTax({
      w2History5YearsUsd: [350000, 380000, 400000],
      contingentCashSeveranceUsd: 200000,
      contingentBonusUsd: 130000,
      contingentEquityAccelerationUsd: 500000,
      contingentOtherBenefitsUsd: 25000,
      federalMarginalTaxRate: 37,
      stateMarginalTaxRate: 10,
      medicareMarginalTaxRate: 2.35,
      corporateTaxRate: 21,
      agreedSettlementType: 'best_net_valley_rule'
    }),
    goodReasonEvents: [],
    counterProposals: [],
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  };

  const memo = generateExecutiveCounterMemoMarkdown(mockCase, mockCase.counterProposalParams, index);
  assert.ok(memo.includes('CONFIDENTIAL EXECUTIVE SEPARATION MEMORANDUM'));
  assert.ok(memo.includes('Nova Technologies'));
  assert.ok(memo.includes('Chief Technology Officer'));
  assert.ok(memo.includes('18 U.S.C. §1833(b)'));
});

test('contract: validateSeveranceCaseInput and validateGoodReasonEventInput reject invalid payloads', () => {
  const invalidCase = validateSeveranceCaseInput({
    companyName: '',
    roleTitle: 'CTO'
  });
  assert.equal(invalidCase.ok, false);

  const invalidEvent = validateGoodReasonEventInput({
    category: 'unknown_category',
    title: 'Relocation'
  });
  assert.equal(invalidEvent.ok, false);

  const validEvent = validateGoodReasonEventInput({
    category: 'diminution_of_duties',
    title: 'Stripped of Architecture Team Reporting Line',
    factualDescription: 'CEO reassigned all principal architects to Chief Product Officer without consultation.',
    dateConditionOccurred: '2026-10-15',
    dateNoticeServed: '2026-10-18'
  });
  assert.equal(validEvent.ok, true);
});

test('contract: calculateTechnicalDebtRatio, calculateSpofCriticalityIndex, calculateScalabilityHorizon', () => {
  const tdrZero = calculateTechnicalDebtRatio(50000, 0);
  assert.equal(tdrZero, 0);

  const tdr = calculateTechnicalDebtRatio(250000, 1000000);
  assert.equal(tdr, 25);

  const spofs = [
    { severity: 'critical' as const, redundancyInPlace: false },
    { severity: 'high' as const, redundancyInPlace: true },
    { severity: 'moderate' as const, redundancyInPlace: false }
  ];
  const spofScore = calculateSpofCriticalityIndex(spofs);
  assert.equal(spofScore, Math.min(100, Math.round(30 * 1.0 + 18 * 0.25 + 8 * 1.0)));

  const horizon = calculateScalabilityHorizon(500, 2500);
  assert.equal(horizon, 5);

  const horizonZero = calculateScalabilityHorizon(0, 2500);
  assert.equal(horizonZero, 10);
});

test('contract: calculateOpenSourceContagionScore and calculateCloudGrossMargin', () => {
  const libs = [
    { category: 'network_copyleft' as const, usageMode: 'backend_saas', riskLevel: 'critical' as const },
    { category: 'strong_copyleft' as const, usageMode: 'client_distributed', riskLevel: 'high' as const }
  ];
  const contagionUnlinked = calculateOpenSourceContagionScore(libs, false);
  assert.equal(contagionUnlinked, 40 * 1.0 + 30 * 1.5);

  const contagionLinked = calculateOpenSourceContagionScore([], true);
  assert.equal(contagionLinked, 100);

  const emptyMargins = calculateCloudGrossMargin(0, 100000);
  assert.deepEqual(emptyMargins, { cloudCogsPercent: 0, currentGrossMargin: 0, projectedGrossMargin: 0 });

  const margins = calculateCloudGrossMargin(10000000, 1200000, 800000, 400000);
  assert.equal(margins.cloudCogsPercent, 12);
  assert.equal(margins.currentGrossMargin, 80);
  assert.equal(margins.projectedGrossMargin, 83);
});

test('contract: calculateSecurityComplianceIndex and calculateSpecialEscrowHoldback', () => {
  const scmi = calculateSecurityComplianceIndex({
    soc2Status: 'certified_unqualified',
    isoStatus: 'certified_active',
    criticalCves: 0,
    highCves: 1,
    mediumCves: 2,
    sec106Score: 90,
    penTestRecencyMonths: 6
  });
  assert.ok(scmi >= 80 && scmi <= 100);

  const holdbackBase = calculateSpecialEscrowHoldback(10000000, 50000, 0, 20);
  assert.equal(holdbackBase, 250000);

  const holdbackHighRisk = calculateSpecialEscrowHoldback(10000000, 200000, 2, 60);
  assert.ok(holdbackHighRisk > 250000);
});

test('contract: calculateEngineeringVelocityQuotient, calculateBusFactorVulnerability, composite scorecard', () => {
  const evq = calculateEngineeringVelocityQuotient({
    df: 'elite',
    ltc: 'high',
    cfr: 'elite',
    mttr: 'high'
  });
  assert.equal(evq, Math.round(((4 + 3 + 4 + 3) / 16) * 100));

  const bfvi = calculateBusFactorVulnerability(70, 0.4);
  assert.equal(bfvi, 42);

  const scorecard = calculateCompositeRagScorecard({
    dealSizeUsd: 50000000,
    tdr: 15,
    spofIndex: 25,
    osContagionScore: 30,
    cloudGrossMargin: 78,
    cloudCogsPercent: 12,
    scmi: 85,
    evq: 88,
    bfvi: 35,
    techDebtRemediationCost: 350000,
    cloudWastageAnnual: 120000,
    escrowHoldback: 1250000,
    retentionPool: 800000
  });

  assert.ok(scorecard.compositeRiskIndex >= 0 && scorecard.compositeRiskIndex <= 100);
  assert.ok(scorecard.totalValuationHaircutEstimate > 0);
  assert.ok(scorecard.postMergerIntegration100DayPriorities.length > 0);

  const rec = determineTransactionRecommendation(scorecard.overallRiskLevel, scorecard.pillarScores.licenseRiskScore, 0.05);
  assert.ok(['proceed_standard', 'proceed_with_haircut', 'mandate_escrow_holdback', 'restructure_renegotiate', 'walk_away_deal_breaker'].includes(rec));

  const walkAwayRec = determineTransactionRecommendation('critical', 90, 0.5);
  assert.equal(walkAwayRec, 'walk_away_deal_breaker');
});

test('contract: generateTechnicalDueDiligenceMemoMarkdown formats report properly', () => {
  const audit: TechnicalDueDiligenceAuditDTO = {
    id: 'test-audit-1',
    userId: 'user-1',
    targetCompanyName: 'CloudScale AI',
    dealSizeUsd: 85000000,
    transactionType: 'buy_side_acquisition',
    auditLeadName: 'Alex Vance',
    auditDate: '2026-10-25',
    architecture: {
      typology: 'modular_monolith',
      estimatedTotalLoc: 450000,
      costPerLocBurdened: 12.5,
      replacementCostEstimate: 5625000,
      technicalDebtRemediationCost: 450000,
      technicalDebtRatio: 8.0,
      rtoMinutesCurrent: 45,
      rtoMinutesTarget: 30,
      rpoMinutesCurrent: 15,
      rpoMinutesTarget: 5,
      disasterRecoveryTestedRecently: true,
      spofCount: 2,
      spofCriticalityIndex: 22,
      currentPeakQps: 1200,
      maxDatabaseQps: 6000,
      scalabilitySaturationHorizon: 5.0,
      identifiedSpofs: []
    },
    licenses: {
      openSourceContagionScore: 15,
      proprietaryCodeLinkedWithGpl: false,
      cleanRoomDocumented: true,
      contractorAssignmentsComplete: true,
      patentFtoAnalyzed: true,
      dependenciesCount: 142,
      copyleftFindingsCount: 1,
      licenseBreakdown: {
        permissiveCount: 135,
        weakCopyleftCount: 6,
        strongCopyleftCount: 1,
        networkCopyleftCount: 0,
        commercialDualCount: 0
      },
      flaggedLibraries: []
    },
    cloudEconomics: {
      annualRecurringRevenue: 24000000,
      annualCloudSpendTotal: 2100000,
      cloudCogsAmount: 1800000,
      cloudCogsPercentOfArr: 7.5,
      currentGrossMarginPercent: 81.2,
      projectedOptimizedGrossMarginPercent: 84.5,
      idleResourceWastageAnnual: 320000,
      multiYearCommitmentLiability: 0,
      finopsOptimizationCaptureEstimate: 240000,
      spendByProvider: {
        awsAnnual: 1800000,
        gcpAnnual: 300000,
        azureAnnual: 0,
        otherInfrastructureAnnual: 0
      },
      wastageCategories: {
        idleComputeAnnual: 180000,
        unattachedStorageAnnual: 40000,
        unindexedEgressAnnual: 20000,
        overprovisionedDbAnnual: 80000
      }
    },
    securityCompliance: {
      securityComplianceMaturityIndex: 88,
      soc2Type2Status: 'certified_unqualified',
      iso27001Status: 'certified_active',
      secItem106ReadinessScore: 92,
      thirdPartyPenTestRecencyMonths: 4,
      criticalCveCount: 0,
      highCveCount: 1,
      mediumCveCount: 3,
      gdprAutomatedDeletionCapable: true,
      piiEncryptionAtRest: true,
      piiEncryptionInTransit: true,
      recommendedSpecialEscrowHoldback: 2125000,
      remediationCostEstimate: 45000
    },
    teamVelocity: {
      doraDeploymentFrequency: 'elite',
      doraLeadTimeForChanges: 'high',
      doraChangeFailureRate: 'elite',
      doraTimeToRestoreService: 'elite',
      engineeringVelocityQuotient: 94,
      teamBusFactor: 4,
      topContributorCommitSharePercent: 28,
      documentationCoverageRatio: 0.85,
      busFactorVulnerabilityIndex: 12,
      criticalSiloDomainsCount: 1,
      highFlightRiskKeyPersonsCount: 2,
      recommendedRetentionPoolSize: 1200000,
      retentionProgramDurationMonths: 24,
      keyPersonnel: []
    },
    scorecard: {
      overallRiskLevel: 'low',
      compositeRiskIndex: 21,
      pillarScores: {
        architectureRiskScore: 31,
        licenseRiskScore: 15,
        cloudUnitEconRiskScore: 28,
        securityComplianceRiskScore: 12,
        teamVelocityRiskScore: 15
      },
      totalValuationHaircutEstimate: 4118600,
      recommendedSpecialEscrowReserve: 2125000,
      postMergerIntegration100DayPriorities: [
        'Deploy active-active database replication',
        'Execute standard 100-day post-merger systems integration'
      ]
    },
    recommendation: 'proceed_standard',
    executiveSummaryText: 'Target exhibits elite engineering practices and healthy unit economics.',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  };

  const memo = generateTechnicalDueDiligenceMemoMarkdown(audit);
  assert.ok(memo.includes('Technical Due Diligence & M&A Vendor Diligence Memorandum'));
  assert.ok(memo.includes('CloudScale AI'));
  assert.ok(memo.includes('Pillar A: Architectural Scalability & Tech Debt'));
  assert.ok(memo.includes('Pillar B: Open-Source IP & License Contagion'));
  assert.ok(memo.includes('Pillar C: Cloud Unit Economics & Gross Margin'));
  assert.ok(memo.includes('Pillar D: Security, Compliance & Regulatory Maturity'));
  assert.ok(memo.includes('Pillar E: Team Bus Factor & Engineering Velocity'));
});

test('contract: validateDueDiligenceAuditInput and validateDiligenceFindingInput reject invalid payloads', () => {
  const invalidAudit = validateDueDiligenceAuditInput({
    targetCompanyName: '',
    dealSizeUsd: -100
  });
  assert.equal(invalidAudit.ok, false);
  assert.ok(invalidAudit.errors.targetCompanyName);
  assert.ok(invalidAudit.errors.dealSizeUsd);

  const validAudit = validateDueDiligenceAuditInput({
    targetCompanyName: 'Acme SaaS',
    dealSizeUsd: 50000000,
    auditLeadName: 'Sarah Connor',
    auditDate: '2026-10-25'
  });
  assert.equal(validAudit.ok, true);

  const invalidFinding = validateDiligenceFindingInput({
    title: '',
    pillar: 'invalid_pillar',
    severity: 'critical',
    financialImpactUsd: -500
  });
  assert.equal(invalidFinding.ok, false);

  const validFinding = validateDiligenceFindingInput({
    title: 'AGPLv3 Dependency in Backend API',
    pillar: 'license',
    severity: 'critical',
    financialImpactUsd: 150000,
    remediationDays: 45,
    description: 'Direct dependency on un-isolated AGPL database driver',
    remediationPlan: 'Replace with Apache 2.0 alternative'
  });
  assert.equal(validFinding.ok, true);
});

test('contract: calculateTeamCognitiveLoadIndex evaluates CLI and status bands accurately', () => {
  const zeroHeadcount = calculateTeamCognitiveLoadIndex(0, 4, 3, 20, 'stream_aligned', []);
  assert.equal(zeroHeadcount.cli, 100);
  assert.equal(zeroHeadcount.status, 'cognitive_overload');

  const streamTeam = calculateTeamCognitiveLoadIndex(7, 3, 2, 10, 'stream_aligned', [
    { interactionMode: 'x_as_a_service' }
  ]);
  assert.ok(streamTeam.cli >= 0 && streamTeam.cli <= 100);
  assert.equal(streamTeam.status, 'healthy_flow');

  const complicatedSubsystem = calculateTeamCognitiveLoadIndex(4, 8, 5, 45, 'complicated_subsystem', [
    { interactionMode: 'collaboration' },
    { interactionMode: 'facilitating' }
  ]);
  assert.ok(complicatedSubsystem.cli > 72);
  assert.ok(['saturation_warning', 'cognitive_overload'].includes(complicatedSubsystem.status));

  const enablingTeam = calculateTeamCognitiveLoadIndex(5, 1, 2, 5, 'enabling', [
    { interactionMode: 'facilitating' }
  ]);
  assert.ok(enablingTeam.cli < 55);
  assert.equal(enablingTeam.status, 'healthy_flow');

  const platformTeam = calculateTeamCognitiveLoadIndex(8, 12, 3, 25, 'platform', [
    { interactionMode: 'x_as_a_service' },
    { interactionMode: 'x_as_a_service' }
  ]);
  assert.ok(platformTeam.cli > 40 && platformTeam.cli < 85);
});

test('contract: calculateSpanHealth categorizes managerial spans correctly', () => {
  assert.equal(calculateSpanHealth(0), 'optimal');
  assert.equal(calculateSpanHealth(2), 'under_span_micro_team');
  assert.equal(calculateSpanHealth(6), 'optimal');
  assert.equal(calculateSpanHealth(8), 'optimal');
  assert.equal(calculateSpanHealth(10), 'over_span_overload');
  assert.equal(calculateSpanHealth(14), 'critical_bottleneck');
});

test('contract: calculateConwayAlignmentScore measures decoupling fidelity', () => {
  const emptyEdges = calculateConwayAlignmentScore([]);
  assert.equal(emptyEdges, 100);

  const perfectAlignment = calculateConwayAlignmentScore([
    {
      sourceServiceId: 's1',
      sourceServiceName: 'Auth Service',
      targetServiceId: 's2',
      targetServiceName: 'Token Store',
      callVolumeWeekly: 50000,
      isSynchronousRestOrGrpc: true,
      crossesTeamBoundary: false,
      interactionFrictionCoefficient: 0.1
    }
  ]);
  assert.equal(perfectAlignment, 100);

  const frictionCoupling = calculateConwayAlignmentScore([
    {
      sourceServiceId: 's1',
      sourceServiceName: 'Checkout Web',
      targetServiceId: 's2',
      targetServiceName: 'Legacy Inventory',
      callVolumeWeekly: 100000,
      isSynchronousRestOrGrpc: true,
      crossesTeamBoundary: true,
      interactionFrictionCoefficient: 1.0
    }
  ]);
  assert.equal(frictionCoupling, 0);

  const mixedCoupling = calculateConwayAlignmentScore([
    {
      sourceServiceId: 's1',
      sourceServiceName: 'Order API',
      targetServiceId: 's2',
      targetServiceName: 'Catalog API',
      callVolumeWeekly: 80000,
      isSynchronousRestOrGrpc: true,
      crossesTeamBoundary: false,
      interactionFrictionCoefficient: 0.1
    },
    {
      sourceServiceId: 's1',
      sourceServiceName: 'Order API',
      targetServiceId: 's3',
      targetServiceName: 'Tax Engine',
      callVolumeWeekly: 20000,
      isSynchronousRestOrGrpc: true,
      crossesTeamBoundary: true,
      interactionFrictionCoefficient: 0.5
    }
  ]);
  assert.equal(mixedCoupling, 90);
});

test('contract: calculateReorgDisruptionRisk and calculateFullyBurdenedCost compute expected outputs', () => {
  assert.equal(calculateReorgDisruptionRisk(0, 0, 0, 0, 0, 0), 0);

  const disruption = calculateReorgDisruptionRisk(50, 10, 8, 2, 20, 4);
  assert.ok(disruption > 15 && disruption < 50);

  const burdenedStandard = calculateFullyBurdenedCost(150000);
  assert.equal(burdenedStandard, 195000);

  const burdenedCustom = calculateFullyBurdenedCost(200000, 1.35);
  assert.equal(burdenedCustom, 270000);
});

test('contract: validateTeamTopologyInput and validateReorgScenarioInput reject invalid payloads', () => {
  const invalidTeam = validateTeamTopologyInput({
    name: '',
    type: 'invalid_topology',
    headcount: -5,
    domainComplexity: 7,
    operationalToilPercentage: 150
  });
  assert.equal(invalidTeam.ok, false);
  assert.ok(invalidTeam.errors.name);
  assert.ok(invalidTeam.errors.type);
  assert.ok(invalidTeam.errors.headcount);
  assert.ok(invalidTeam.errors.domainComplexity);
  assert.ok(invalidTeam.errors.operationalToilPercentage);

  const validTeam = validateTeamTopologyInput({
    name: 'Growth & Monetization',
    type: 'stream_aligned',
    headcount: 8,
    domainComplexity: 3,
    operationalToilPercentage: 15
  });
  assert.equal(validTeam.ok, true);

  const invalidReorg = validateReorgScenarioInput({
    title: '',
    executiveRationale: 'Short'
  });
  assert.equal(invalidReorg.ok, false);
  assert.ok(invalidReorg.errors.title);
  assert.ok(invalidReorg.errors.executiveRationale);
  assert.ok(invalidReorg.errors.targetCompletionDate);

  const validReorg = validateReorgScenarioInput({
    title: 'Platform Decoupling & Stream Realignment',
    targetCompletionDate: '2026-12-31',
    executiveRationale: 'Establish dedicated core infrastructure platform teams to eliminate deployment train bottlenecks and reduce cross-team ticket ping pong.'
  });
  assert.equal(validReorg.ok, true);
});

test('contract: generateReorgExecutiveMemoMarkdown formats executive proposal memorandum', () => {
  const scenario: ReorgScenarioDTO = {
    id: 'sc-001',
    userId: 'u-1',
    title: 'H2 Strategic Reorganization',
    status: 'board_approved',
    currentHierarchyMetrics: {
      totalHeadcount: 48,
      totalManagers: 8,
      totalIndividualContributors: 40,
      organizationDepth: 4,
      optimalDepth: 3,
      depthExcessPenalty: 12,
      averageSpanOfControl: 5.0,
      microTeamsCount: 3,
      overloadedManagersCount: 2,
      compositeHierarchyHealthScore: 68.5
    },
    proposedHierarchyMetrics: {
      totalHeadcount: 52,
      totalManagers: 8,
      totalIndividualContributors: 44,
      organizationDepth: 3,
      optimalDepth: 3,
      depthExcessPenalty: 0,
      averageSpanOfControl: 6.5,
      microTeamsCount: 0,
      overloadedManagersCount: 0,
      compositeHierarchyHealthScore: 92.4
    },
    currentConwayScore: 62.4,
    proposedConwayScore: 88.6,
    budgetDeltaAnnualUsd: 320000,
    headcountDelta: 4,
    disruptionRiskIndex: 26.5,
    transferredEngineersCount: 6,
    reassignedServicesCount: 3,
    conwayEdges: [],
    executiveRationale: 'Realigning monolithic payment code into dedicated platform APIs and establishing self-service team topologies.',
    targetCompletionDate: '2026-11-30',
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  };

  const memo = generateReorgExecutiveMemoMarkdown(scenario);
  assert.ok(memo.includes('Executive Engineering Organization Reorganization Memorandum'));
  assert.ok(memo.includes('H2 Strategic Reorganization'));
  assert.ok(memo.includes('BOARD_APPROVED'));
  assert.ok(memo.includes("Conway's Law Alignment"));
  assert.ok(memo.includes('62.4% → 88.6%'));
  assert.ok(memo.includes('Disruption Risk Index'));
  assert.ok(memo.includes('26.5 / 100'));
  assert.ok(memo.includes('Total Engineering Headcount'));
  assert.ok(memo.includes('+$320,000'));
  assert.ok(memo.includes('Board Committee Recommendation'));
});

test('contract: calculateValueStreamLeadTimeAndFlowEfficiency calculates lead time and classifies flow status', () => {
  const stages = [
    { activeTouchHours: 8, idleWaitHours: 72 },
    { activeTouchHours: 16, idleWaitHours: 40 },
    { activeTouchHours: 48, idleWaitHours: 12 },
    { activeTouchHours: 6, idleWaitHours: 54 },
    { activeTouchHours: 2, idleWaitHours: 4 },
    { activeTouchHours: 4, idleWaitHours: 6 }
  ];

  const res = calculateValueStreamLeadTimeAndFlowEfficiency(stages);
  assert.equal(res.totalActiveTouchHours, 84);
  assert.equal(res.totalIdleWaitHours, 188);
  assert.equal(res.valueStreamLeadTimeHours, 272);
  assert.equal(res.flowEfficiencyPercent, 30.88);
  assert.equal(res.flowHealthStatus, 'healthy_flow');

  assert.equal(classifyFlowHealthStatus(36.0), 'optimal_elite');
  assert.equal(classifyFlowHealthStatus(25.0), 'healthy_flow');
  assert.equal(classifyFlowHealthStatus(15.0), 'moderate_friction');
  assert.equal(classifyFlowHealthStatus(8.0), 'high_waste_congestion');
});

test('contract: calculateStrategicAlignmentIndex computes priority weighted OKR capacity coverage', () => {
  const okrs = [
    { allocatedCapacityPoints: 180, priorityTier: 'tier_0_board' as const },
    { allocatedCapacityPoints: 120, priorityTier: 'tier_1_growth' as const },
    { allocatedCapacityPoints: 60, priorityTier: 'tier_2_enhancement' as const }
  ];

  const score = calculateStrategicAlignmentIndex(okrs, 400);
  assert.equal(score, 96.0);

  const emptyScore = calculateStrategicAlignmentIndex([]);
  assert.equal(emptyScore, 0);
});

test('contract: DORA metrics calculations and tier benchmarks evaluate correctly', () => {
  assert.equal(classifyDoraTier('deploymentFrequency', 2.5), 'elite');
  assert.equal(classifyDoraTier('deploymentFrequency', 0.5), 'high');
  assert.equal(classifyDoraTier('deploymentFrequency', 0.08), 'medium');
  assert.equal(classifyDoraTier('deploymentFrequency', 0.01), 'low');

  assert.equal(classifyDoraTier('leadTimeForChanges', 12), 'elite');
  assert.equal(classifyDoraTier('leadTimeForChanges', 72), 'high');
  assert.equal(classifyDoraTier('leadTimeForChanges', 300), 'medium');
  assert.equal(classifyDoraTier('leadTimeForChanges', 800), 'low');

  assert.equal(classifyDoraTier('changeFailureRate', 3.5), 'elite');
  assert.equal(classifyDoraTier('changeFailureRate', 8.0), 'high');
  assert.equal(classifyDoraTier('changeFailureRate', 12.0), 'medium');
  assert.equal(classifyDoraTier('changeFailureRate', 25.0), 'low');

  assert.equal(classifyDoraTier('failedDeploymentRecoveryTime', 0.5), 'elite');
  assert.equal(classifyDoraTier('failedDeploymentRecoveryTime', 4.0), 'high');
  assert.equal(classifyDoraTier('failedDeploymentRecoveryTime', 48.0), 'medium');
  assert.equal(classifyDoraTier('failedDeploymentRecoveryTime', 200.0), 'low');

  const snapshot = calculateDoraMetricsSnapshot({
    valueStreamId: 'vs-1',
    periodDays: 30,
    deploymentsCount: 45,
    medianLeadTimeHours: 18.0,
    failedDeploymentsCount: 2,
    medianRecoveryTimeHours: 0.8
  });

  assert.equal(snapshot.valueStreamId, 'vs-1');
  assert.equal(snapshot.deploymentFrequency.value, 1.5);
  assert.equal(snapshot.deploymentFrequency.tier, 'elite');
  assert.equal(snapshot.leadTimeForChanges.tier, 'elite');
  assert.equal(snapshot.changeFailureRate.value, 4.4);
  assert.equal(snapshot.changeFailureRate.tier, 'elite');
  assert.equal(snapshot.failedDeploymentRecoveryTime.tier, 'elite');
  assert.equal(snapshot.compositeTier, 'high');
  assert.ok(snapshot.compositeDoraScore >= 70);
});

test('contract: calculateFlowMetricsSnapshot computes Little Law WIP saturation and Kingman multiplier', () => {
  const flow = calculateFlowMetricsSnapshot({
    valueStreamId: 'vs-core',
    featuresWip: 15,
    defectsWip: 4,
    debtWip: 5,
    securityWip: 4,
    targetVelocityPerSprint: 48,
    engineerHeadcount: 18
  });

  assert.equal(flow.flowLoadTotalWip, 28);
  assert.equal(flow.recommendedMaxWip, 27);
  assert.equal(flow.wipSaturationRatio, 1.04);
  assert.ok(flow.contextSwitchingDragPercent > 0);
  assert.ok(flow.kingmanQueueWaitMultiplier >= 1.0);
  assert.equal(flow.breakdown.length, 4);
  assert.equal(flow.breakdown[0].itemType, 'feature');
  assert.ok(flow.flowHealthScore > 50);
});

test('contract: calculateCapitalizedProjectLabor and sizing summary satisfy ASC 350-40 US GAAP', () => {
  const capProject = calculateCapitalizedProjectLabor({
    projectName: 'Enterprise Multi-Tenant Authorization Engine',
    valueStreamId: 'vs-core',
    investmentCategory: 'transform',
    developmentStage: 'application_development',
    qualifyingLaborHours: 3200,
    nonQualifyingLaborHours: 450,
    baseSalaryWeightedAverage: 172000,
    burdenMultiplier: 1.32,
    annualizedAttributableArrUsd: 2400000,
    estimatedUsefulLifeMonths: 36,
    auditDocumentationRef: 'JIRA-SEC-8921'
  });

  assert.equal(capProject.projectName, 'Enterprise Multi-Tenant Authorization Engine');
  assert.ok(capProject.blendedBurdenedHourlyRate > 115);
  assert.ok(capProject.capitalizedLaborCostUsd > 300000);
  assert.ok(capProject.expensedLaborCostUsd > 40000);
  assert.ok(capProject.capitalizationRatioPercent > 70);
  assert.ok(capProject.monthlyAmortizationUsd > 8000);
  assert.ok(capProject.projectedRoiPercent > 300);

  const fullProjectDTO = {
    ...capProject,
    id: 'cap-1',
    projectId: 'p-1',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  };

  const summary = calculateRdInvestmentSizingSummary([fullProjectDTO]);
  assert.equal(summary.totalCapitalizedLaborUsd, capProject.capitalizedLaborCostUsd);
  assert.equal(summary.totalExpensedLaborUsd, capProject.expensedLaborCostUsd);
  assert.ok(summary.overallCapitalizationRatioPercent > 70);
  assert.equal(summary.transformAllocationPercent, 100);
  assert.equal(summary.ebitdaEnhancementUsd, capProject.capitalizedLaborCostUsd);
});

test('contract: calculateCompositeDeliveryHealthIndex synthesizes delivery, flow, and financials', () => {
  const res = calculateCompositeDeliveryHealthIndex(82.0, 80.0, 85.0, 45.0, 24.0);
  assert.ok(res.deliveryHealthIndex >= 85);
  assert.equal(res.healthBand, 'world_class_elite');

  assert.equal(classifyDeliveryHealthBand(90), 'world_class_elite');
  assert.equal(classifyDeliveryHealthBand(75), 'predictable_growth');
  assert.equal(classifyDeliveryHealthBand(60), 'congested_friction');
  assert.equal(classifyDeliveryHealthBand(40), 'delivery_distress');
});

test('contract: Value Stream Studio validators reject invalid inputs and accept valid data', () => {
  const invalidVs = validateValueStreamInput({ name: '', businessDomain: '', contributingHeadcount: 0 });
  assert.equal(invalidVs.ok, false);
  assert.ok(invalidVs.errors.name);
  assert.ok(invalidVs.errors.businessDomain);
  assert.ok(invalidVs.errors.contributingHeadcount);

  const validVs = validateValueStreamInput({
    name: 'Enterprise Core',
    businessDomain: 'B2B SaaS',
    executiveSponsor: 'VP Eng',
    contributingHeadcount: 14
  });
  assert.equal(validVs.ok, true);

  const invalidOkr = validateStrategicOkrInput({ strategicTheme: '', corporateObjective: '', teamKeyResult: '', allocatedCapacityPoints: 0 });
  assert.equal(invalidOkr.ok, false);
  assert.ok(invalidOkr.errors.strategicTheme);

  const validOkr = validateStrategicOkrInput({
    strategicTheme: 'Security Compliance',
    corporateObjective: 'Achieve SOC2 Type II',
    teamKeyResult: 'Zero unresolved findings',
    priorityTier: 'tier_0_board',
    allocatedCapacityPoints: 100,
    totalCapacityPoints: 100,
    targetQuarter: 'Q4-2026',
    status: 'on_track'
  });
  assert.equal(validOkr.ok, true);

  const invalidDora = validateDoraCalculationInput({ valueStreamId: '', periodDays: 0, deploymentsCount: -1 });
  assert.equal(invalidDora.ok, false);

  const validDora = validateDoraCalculationInput({
    valueStreamId: 'vs-1',
    periodDays: 30,
    deploymentsCount: 20,
    medianLeadTimeHours: 12,
    failedDeploymentsCount: 1,
    medianRecoveryTimeHours: 1
  });
  assert.equal(validDora.ok, true);

  const invalidFlow = validateFlowSimulationInput({ valueStreamId: '', engineerHeadcount: 0 });
  assert.equal(invalidFlow.ok, false);

  const validFlow = validateFlowSimulationInput({
    valueStreamId: 'vs-1',
    featuresWip: 10,
    defectsWip: 2,
    debtWip: 3,
    securityWip: 1,
    targetVelocityPerSprint: 30,
    engineerHeadcount: 12
  });
  assert.equal(validFlow.ok, true);

  const invalidCap = validateCapitalizedProjectInput({ projectName: '', baseSalaryWeightedAverage: 0 });
  assert.equal(invalidCap.ok, false);

  const validCap = validateCapitalizedProjectInput({
    projectName: 'Billing Modernization',
    valueStreamId: 'vs-1',
    investmentCategory: 'grow',
    developmentStage: 'application_development',
    qualifyingLaborHours: 1200,
    nonQualifyingLaborHours: 100,
    baseSalaryWeightedAverage: 160000,
    burdenMultiplier: 1.32,
    annualizedAttributableArrUsd: 1000000,
    estimatedUsefulLifeMonths: 36,
    auditDocumentationRef: 'AUD-101'
  });
  assert.equal(validCap.ok, true);

  const invalidMemo = validateBoardMemoGenerateInput({ title: '', fiscalQuarter: '' });
  assert.equal(invalidMemo.ok, false);

  const validMemo = validateBoardMemoGenerateInput({ title: 'Q4 Board Memo', fiscalQuarter: 'Q4-2026' });
  assert.equal(validMemo.ok, true);
});

test('contract: generateBoardQbrMemorandumMarkdown generates executive QBR memorandum with all sections', () => {
  const memo: BoardMemorandumDTO = {
    id: 'memo-1',
    userScenarioId: 'sc-1',
    title: 'Q4-2026 Executive Engineering Governance Memorandum',
    fiscalQuarter: 'Q4-2026',
    status: 'under_review',
    deliveryHealthIndex: 78.4,
    healthBand: 'predictable_growth',
    executiveSummary: {
      sectionKey: 'exec_summary',
      heading: 'Executive Summary & Strategic Rationale',
      executiveSummaryText: 'Technology organization maintained steady delivery cadence with 82.5% strategic alignment.',
      keyMetricsBulletPoints: ['Composite DHI: 78.4', 'Flow Efficiency: 24.2%'],
      strategicGuidance: 'Invest in test automation to address staging queue bottlenecks.'
    },
    doraScorecard: {
      sectionKey: 'dora',
      heading: 'DORA Delivery & Stability Scorecard',
      executiveSummaryText: 'Achieved High DORA tier with 1.42 deploys/day and 4.8% CFR.',
      keyMetricsBulletPoints: ['DF: 1.42/day (Elite)', 'CFR: 4.8% (Elite)'],
      strategicGuidance: 'Maintain canary deployment rollbacks.'
    },
    flowWipDiagnostics: {
      sectionKey: 'flow',
      heading: 'Flow Framework & WIP Bottlenecks',
      executiveSummaryText: 'Completed 48 flow items with 1.04x WIP saturation ratio.',
      keyMetricsBulletPoints: ['Velocity: 48 items', 'WIP: 28 items'],
      strategicGuidance: 'Limit concurrent squad WIP to avoid context switching drag.'
    },
    capitalizedRdFinancials: {
      sectionKey: 'capex',
      heading: 'ASC 350-40 Capitalized R&D Financial Summary',
      executiveSummaryText: 'Capitalized $1.845M in software labor for an immediate EBITDA enhancement.',
      keyMetricsBulletPoints: ['CapEx: $1,845,000', 'OpEx: $2,255,000', 'Capitalization Ratio: 45.0%'],
      strategicGuidance: 'Preserve audit logs in Jira for annual financial review.'
    },
    executiveActionPlan: {
      sectionKey: 'action',
      heading: 'Executive Leadership Action Plan',
      executiveSummaryText: 'Deploy ephemeral staging environments to compress QA wait times.',
      keyMetricsBulletPoints: ['Milestone 1: Ephemeral environments', 'Milestone 2: Automated rollback'],
      strategicGuidance: 'Board Audit Committee approval is formally recommended.'
    },
    ebitdaEnhancementAnnualizedUsd: 1845000,
    createdAt: '2026-10-25T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  };

  const md = generateBoardQbrMemorandumMarkdown(memo);
  assert.ok(md.includes('Executive Technology Delivery Velocity, DORA Governance & Capitalized R&D Memorandum'));
  assert.ok(md.includes('Q4-2026 Executive Engineering Governance Memorandum'));
  assert.ok(md.includes('UNDER_REVIEW'));
  assert.ok(md.includes('78.4 / 100'));
  assert.ok(md.includes('PREDICTABLE GROWTH'));
  assert.ok(md.includes('$1,845,000'));
  assert.ok(md.includes('Executive Summary & Strategic Rationale'));
  assert.ok(md.includes('DORA Delivery & Stability Scorecard'));
  assert.ok(md.includes('Flow Framework & WIP Bottlenecks'));
  assert.ok(md.includes('ASC 350-40 Capitalized R&D Financial Summary'));
  assert.ok(md.includes('Executive Leadership Action Plan'));
});

test('contract: classifyFinOpsEfficiencyBand and classifyFinOpsMaturityStage evaluate thresholds', () => {
  assert.equal(classifyFinOpsEfficiencyBand(92.5), 'optimal_elite');
  assert.equal(classifyFinOpsEfficiencyBand(88.0), 'optimal_elite');
  assert.equal(classifyFinOpsEfficiencyBand(80.0), 'disciplined_efficient');
  assert.equal(classifyFinOpsEfficiencyBand(72.0), 'disciplined_efficient');
  assert.equal(classifyFinOpsEfficiencyBand(65.0), 'moderate_waste');
  assert.equal(classifyFinOpsEfficiencyBand(50.0), 'moderate_waste');
  assert.equal(classifyFinOpsEfficiencyBand(45.0), 'critical_overspend');

  assert.equal(classifyFinOpsMaturityStage(85.0), 'run');
  assert.equal(classifyFinOpsMaturityStage(80.0), 'run');
  assert.equal(classifyFinOpsMaturityStage(70.0), 'walk');
  assert.equal(classifyFinOpsMaturityStage(55.0), 'walk');
  assert.equal(classifyFinOpsMaturityStage(50.0), 'crawl');
});

test('contract: calculateCostPerTenantMetrics calculates margin and cost per transaction', () => {
  const result = calculateCostPerTenantMetrics(10000, 1200, 300, 500, 50000);
  assert.equal(result.totalCostPerTenantUsd, 2000);
  assert.equal(result.grossMarginPercent, 80);
  assert.equal(result.costPerTransactionUsd, 0.04);

  const zeroRev = calculateCostPerTenantMetrics(0, 500, 100, 100, 0);
  assert.equal(zeroRev.totalCostPerTenantUsd, 700);
  assert.equal(zeroRev.grossMarginPercent, 0);
  assert.equal(zeroRev.costPerTransactionUsd, 0);
});

test('contract: calculateCommitmentNpv models upfront, savings and NPV discount flows', () => {
  const allUpfront = calculateCommitmentNpv(10000, 8.5, 36, 'all_upfront', 35);
  assert.equal(allUpfront.termMonths, 36);
  assert.equal(allUpfront.paymentOption, 'all_upfront');
  assert.ok(allUpfront.upfrontCapitalRequiredUsd > 0);
  assert.ok(allUpfront.cumulativeSavingsUsd > 0);
  assert.ok(allUpfront.netPresentValueUsd > 0);

  const noUpfront = calculateCommitmentNpv(10000, 8.5, 12, 'no_upfront', 25);
  assert.equal(noUpfront.termMonths, 12);
  assert.equal(noUpfront.paymentOption, 'no_upfront');
  assert.equal(noUpfront.upfrontCapitalRequiredUsd, 0);
  assert.ok(noUpfront.monthlyEffectiveSavingsUsd === 2500);
});

test('contract: detectCostAnomaly identifies statistical standard deviation spikes and excess spend', () => {
  const baseline = [1000, 1020, 980, 1010, 990, 1005, 995];
  const normal = detectCostAnomaly(1015, baseline, 2.5);
  assert.equal(normal.isAnomaly, false);
  assert.equal(normal.excessSpend, 0);

  const spike = detectCostAnomaly(1800, baseline, 2.5);
  assert.equal(spike.isAnomaly, true);
  assert.ok(spike.zScore > 2.5);
  assert.ok(spike.excessSpend > 700);

  const shortHistory = detectCostAnomaly(2000, [1000, 1100], 2.5);
  assert.equal(shortHistory.isAnomaly, false);
});

test('contract: calculateCarbonFootprint and calculateK8sRightsizing compute infrastructure sizing', () => {
  const carbon = calculateCarbonFootprint(10000, 2000, 1.15, 0.38);
  assert.ok(carbon.totalMonthlyCloudCarbonKgCo2e > 0);
  assert.ok(carbon.carbonIntensityPerActiveUserKgCo2e > 0);
  assert.ok(carbon.potentialWasteAvoidanceKgCo2e > 0);
  assert.ok(carbon.equivalentTreesPlantedYearly > 0);

  const rightsizing = calculateK8sRightsizing(4.0, 1.5, 8.0, 3.0, 300, 20);
  assert.equal(rightsizing.recommendedCpu, 1.8);
  assert.equal(rightsizing.recommendedMemoryGiB, 3.6);
  assert.ok(rightsizing.rightsizedMonthlyCostUsd < 300);
  assert.ok(rightsizing.monthlySavingsUsd > 0);
  assert.ok(rightsizing.sizingSlackPercent > 0);
});

test('contract: calculateGravitonMigrationRoi and calculateCompositeFinOpsScore compute composite FES', () => {
  const roi = calculateGravitonMigrationRoi(5000, 40, 120, 20, 18);
  assert.equal(roi.workloadName, 'Core Stateless Application Fleet');
  assert.ok(roi.gravitonMonthlyCostUsd < 5000);
  assert.ok(roi.monthlySavingsUsd > 0);
  assert.ok(roi.paybackPeriodMonths > 0);
  assert.ok(roi.annualizedNetBenefitUsd > 0);

  const score = calculateCompositeFinOpsScore({
    taggingCompliancePercent: 95,
    commitmentCoveragePercent: 82,
    commitmentUtilizationPercent: 96,
    wasteRemediationRatioPercent: 88,
    k8sSlackRemediationPercent: 75,
    carbonEfficiencyScore: 80
  });
  assert.ok(score.compositeScore >= 80);
  assert.equal(score.efficiencyBand, 'disciplined_efficient');
});

test('contract: FinOps schema validators reject invalid payloads and accept valid inputs', () => {
  const invalidAlloc = validateTenantAllocationInput({});
  assert.equal(invalidAlloc.ok, false);
  assert.ok(invalidAlloc.errors.tenantName);

  const validAlloc = validateTenantAllocationInput({
    tenantName: 'Acme Enterprise Corp',
    tenantTier: 'enterprise',
    monthlyAttributableRevenueUsd: 15000,
    directComputeCostUsd: 1200,
    directStorageCostUsd: 300,
    allocatedSharedCostUsd: 400,
    monthlyTransactionsCount: 25000,
    taggingCompliancePercent: 100
  });
  assert.equal(validAlloc.ok, true);

  const invalidCommit = validateCommitmentInput({ committedHourlySpendUsd: -5 });
  assert.equal(invalidCommit.ok, false);

  const validCommit = validateCommitmentInput({
    serviceName: 'Amazon EC2 Compute',
    committedHourlySpendUsd: 12.5,
    expirationDate: '2027-10-31'
  });
  assert.equal(validCommit.ok, true);

  const invalidSim = validateCommitmentPurchaseSimulationInput({ eligibleMonthlySpendUsd: 0 });
  assert.equal(invalidSim.ok, false);

  const validSim = validateCommitmentPurchaseSimulationInput({
    eligibleMonthlySpendUsd: 25000,
    targetCoveragePercent: 80,
    waccDiscountRatePercent: 8.5
  });
  assert.equal(validSim.ok, true);

  const invalidAnomaly = validateAnomalyDetectionInput({ sensitivityZScore: 0.5 });
  assert.equal(invalidAnomaly.ok, false);

  const validAnomaly = validateAnomalyDetectionInput({
    sensitivityZScore: 2.5,
    lookbackDays: 30
  });
  assert.equal(validAnomaly.ok, true);

  const invalidRemediation = validateIdleWasteRemediationInput({ status: 'unknown' });
  assert.equal(invalidRemediation.ok, false);

  const validRemediation = validateIdleWasteRemediationInput({ status: 'remediated' });
  assert.equal(validRemediation.ok, true);

  const invalidRightsizing = validateKubernetesRightsizingInput({ headroomBufferPercent: 2 });
  assert.equal(invalidRightsizing.ok, false);

  const validRightsizing = validateKubernetesRightsizingInput({
    headroomBufferPercent: 20,
    spotAggressivenessLevel: 'balanced'
  });
  assert.equal(validRightsizing.ok, true);

  const invalidMemo = validateCfoMemoGenerateInput({ title: '' });
  assert.equal(invalidMemo.ok, false);

  const validMemo = validateCfoMemoGenerateInput({
    title: 'Q4-2026 Executive Cloud FinOps Memorandum',
    fiscalQuarter: 'Q4-2026'
  });
  assert.equal(validMemo.ok, true);
});

test('contract: generateCfoBoardMemorandumMarkdown produces structured C-suite memorandum', () => {
  const memo: CfoMemorandumDTO = {
    id: 'memo-finops-101',
    title: 'Q4-2026 Executive Cloud FinOps & Infrastructure Governance Memorandum',
    fiscalQuarter: 'Q4-2026',
    status: 'draft',
    compositeFinOpsScore: 84.5,
    efficiencyBand: 'disciplined_efficient',
    monthlyCloudSpendUsd: 53800,
    annualizedRealizedSavingsUsd: 142000,
    unlockedAnnualizedPipelineSavingsUsd: 98000,
    cloudGrossMarginPercent: 84.6,
    executiveSummary: {
      sectionKey: 'exec',
      heading: '1. Executive Summary & Strategic Rationale',
      executiveSummaryText: 'Maintained 84.6% cloud gross margin while scaling active workloads.',
      keyMetricsBulletPoints: ['Run-Rate: $53,800/mo', 'FES: 84.5 / 100'],
      strategicGuidance: 'Execute 3-year Compute Savings Plan to hedge Q1-2027 compute.'
    },
    unitEconomicsScorecard: {
      sectionKey: 'unit',
      heading: '2. Unit Economics & Cost Allocation Scorecard',
      executiveSummaryText: 'Average cost per enterprise tenant stands at $480/month.',
      keyMetricsBulletPoints: ['Average Cost per Tenant: $480', 'Tagging Compliance: 94.2%'],
      strategicGuidance: 'Enforce mandatory billing tags on all staging Kubernetes namespaces.'
    },
    commitmentStrategy: {
      sectionKey: 'commit',
      heading: '3. Commitment Portfolio & Hedging Strategy',
      executiveSummaryText: 'Commitment coverage reached 81.2% with 96.4% utilization.',
      keyMetricsBulletPoints: ['Coverage: 81.2%', 'Annualized Savings: $142,000'],
      strategicGuidance: 'Renew expiring RDS Standard RIs prior to December 15.'
    },
    wasteAndAnomalyGovernance: {
      sectionKey: 'waste',
      heading: '4. Idle Waste Elimination & Anomaly Diagnostics',
      executiveSummaryText: 'Purged 18 unattached EBS volumes and 4 zombie EKS nodes.',
      keyMetricsBulletPoints: ['Waste Discovered: $4,320/mo', 'Carbon Avoidance: 1,450 kg CO2e'],
      strategicGuidance: 'Schedule weekly automated janitor cron for orphaned persistent disks.'
    },
    k8sArchitectureArbitrage: {
      sectionKey: 'k8s',
      heading: '5. Kubernetes Workload Rightsizing & Graviton Arbitrage',
      executiveSummaryText: 'Right-sizing CPU/Memory allocations yields $3,200/month immediate savings.',
      keyMetricsBulletPoints: ['Rightsizing Savings: $3,200/mo', 'Graviton Payback: 3.2 months'],
      strategicGuidance: 'Migrate stateless API worker node pools to c7g Graviton instances.'
    },
    cfoDirectivesActionPlan: {
      sectionKey: 'directives',
      heading: '6. Board Audit Committee & CFO Directives',
      executiveSummaryText: 'Formal approval recommended for 3-year commitment tranche.',
      keyMetricsBulletPoints: ['Directive 1: Authorize $45k upfront capital', 'Directive 2: Target 88.0 FES score'],
      strategicGuidance: 'Schedule formal review with Chief Financial Officer.'
    },
    createdAt: '2026-10-25T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  };

  const md = generateCfoBoardMemorandumMarkdown(memo);
  assert.ok(md.includes('Executive Cloud FinOps, Unit Economics & Infrastructure Governance Memorandum'));
  assert.ok(md.includes('Q4-2026 Executive Cloud FinOps & Infrastructure Governance Memorandum'));
  assert.ok(md.includes('84.5 / 100'));
  assert.ok(md.includes('DISCIPLINED EFFICIENT'));
  assert.ok(md.includes('$53,800'));
  assert.ok(md.includes('84.6%'));
  assert.ok(md.includes('1. Executive Summary & Strategic Rationale'));
  assert.ok(md.includes('2. Unit Economics & Cost Allocation Scorecard'));
  assert.ok(md.includes('3. Commitment Portfolio & Hedging Strategy'));
  assert.ok(md.includes('4. Idle Waste Elimination & Anomaly Diagnostics'));
  assert.ok(md.includes('5. Kubernetes Workload Rightsizing & Graviton Arbitrage'));
  assert.ok(md.includes('6. Board Audit Committee & CFO Directives'));
});

test('ai-governance: classifyAiGovernanceBand maps scores to status bands', () => {
  assert.equal(classifyAiGovernanceBand(98.5), 'elite_compliant');
  assert.equal(classifyAiGovernanceBand(90.0), 'elite_compliant');
  assert.equal(classifyAiGovernanceBand(89.9), 'managed_defensible');
  assert.equal(classifyAiGovernanceBand(75.0), 'managed_defensible');
  assert.equal(classifyAiGovernanceBand(74.9), 'cautionary_gap');
  assert.equal(classifyAiGovernanceBand(55.0), 'cautionary_gap');
  assert.equal(classifyAiGovernanceBand(54.9), 'critical_non_compliant');
  assert.equal(classifyAiGovernanceBand(22.0), 'critical_non_compliant');
});

test('ai-governance: classifyEuAiActRiskTier assigns proper category under Annex III', () => {
  assert.equal(classifyEuAiActRiskTier(true, false), 'high_risk_employment');
  assert.equal(classifyEuAiActRiskTier(true, true), 'high_risk_employment');
  assert.equal(classifyEuAiActRiskTier(false, true), 'specific_transparency_risk');
  assert.equal(classifyEuAiActRiskTier(false, false), 'minimal_risk');
});

test('ai-governance: calculateLeaderboardScore weights dimensions correctly', () => {
  const score = calculateLeaderboardScore(94.5, 2.1, 91.0, 480, 88);
  assert.ok(score > 75 && score <= 100);
  assert.equal(typeof score, 'number');

  const zeroLatencyScore = calculateLeaderboardScore(100, 0, 100, 0, 150);
  assert.equal(zeroLatencyScore, 100);
});

test('ai-governance: calculatePromptCachingEfficiency computes hit rate and avoided cost', () => {
  const emptyRes = calculatePromptCachingEfficiency(0, 0, 2.5, 50);
  assert.equal(emptyRes.blendedHitRatePercent, 0);
  assert.equal(emptyRes.monthlyCostAvoidedUsd, 0);
  assert.equal(emptyRes.effectiveCostUsd, 0);

  const res = calculatePromptCachingEfficiency(150_000, 850_000, 2.5, 50);
  assert.equal(res.blendedHitRatePercent, 85);
  assert.equal(res.effectiveCostUsd, 1.44);
  assert.equal(res.monthlyCostAvoidedUsd, 1.06);
});

test('ai-governance: calculateCascadeArbitrage calculates tiered routing savings', () => {
  const rates = {
    tier1: { input: 0.15, output: 0.60 },
    tier2: { input: 0.80, output: 2.40 },
    tier3: { input: 3.00, output: 15.00 }
  };

  const sim = calculateCascadeArbitrage(
    100_000,
    1500,
    300,
    55,
    35,
    10,
    rates,
    85
  );

  assert.ok(sim.baselineFrontierOnlySpendUsd > sim.optimizedCascadeSpendUsd);
  assert.ok(sim.totalMonthlySavingsUsd > 0);
  assert.ok(sim.savingsPercentage >= 40);
  assert.ok(sim.promptCachingSavingsUsd > 0);
  assert.equal(sim.netMonthlySpendUsd, sim.optimizedCascadeSpendUsd);
});

test('ai-governance: maskSensitivePiiTokens applies redaction strategies correctly', () => {
  const rawText = 'Candidate john.doe@example.com with phone +1-555-0199 salary $185,000.';
  const rules: PiiMaskingRuleDTO[] = [
    {
      id: 'rule-email',
      entityType: 'email',
      regexPattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
      nerModelTarget: 'PresidioEmailRecognizer',
      redactionStrategy: 'full_mask',
      replacementMask: '[REDACTED_EMAIL]',
      detectionConfidenceThreshold: 0.99,
      isEnabled: true
    },
    {
      id: 'rule-phone',
      entityType: 'phone',
      regexPattern: '\\+1-\\d{3}-\\d{4}',
      nerModelTarget: 'PresidioPhoneRecognizer',
      redactionStrategy: 'full_mask',
      replacementMask: '[REDACTED_PHONE]',
      detectionConfidenceThreshold: 0.95,
      isEnabled: true
    },
    {
      id: 'rule-salary',
      entityType: 'salary',
      regexPattern: '\\$\\d{1,3}(,\\d{3})*',
      nerModelTarget: 'PresidioSalaryRecognizer',
      redactionStrategy: 'full_mask',
      replacementMask: '[REDACTED_SALARY]',
      detectionConfidenceThreshold: 0.92,
      isEnabled: true
    }
  ];

  const fullMaskResult = maskSensitivePiiTokens(rawText, rules, 'full_mask');
  assert.equal(fullMaskResult.detectedEntitiesCount, 3);
  assert.ok(fullMaskResult.sanitizedText.includes('[REDACTED_EMAIL]'));
  assert.ok(fullMaskResult.sanitizedText.includes('[REDACTED_PHONE]'));
  assert.ok(fullMaskResult.sanitizedText.includes('[REDACTED_SALARY]'));
  assert.ok(!fullMaskResult.sanitizedText.includes('john.doe@example.com'));

  const syntheticResult = maskSensitivePiiTokens(rawText, rules, 'synthetic_token');
  assert.ok(syntheticResult.sanitizedText.includes('[SYNTHETIC_EMAIL_1]'));
  assert.ok(syntheticResult.sanitizedText.includes('[SYNTHETIC_PHONE_2]'));
  assert.ok(syntheticResult.sanitizedText.includes('[SYNTHETIC_SALARY_3]'));

  const hashResult = maskSensitivePiiTokens(rawText, rules, 'pseudonymized_hash');
  assert.ok(hashResult.sanitizedText.includes('[HASH_'));
  assert.ok(!hashResult.sanitizedText.includes('john.doe@example.com'));
});

test('ai-governance: calculateRagRetrievalMetrics computes MRR, NDCG, and Hit Rates', () => {
  const emptyRes = calculateRagRetrievalMetrics([]);
  assert.equal(emptyRes.hitRateAt5Percent, 0);
  assert.equal(emptyRes.meanReciprocalRank, 0);

  const retrievalData = [
    { queryId: 'q1', retrievedDocIds: ['d1', 'd2', 'd3'], groundTruthDocId: 'd1' },
    { queryId: 'q2', retrievedDocIds: ['dx', 'd2', 'dy', 'dz'], groundTruthDocId: 'd2' },
    { queryId: 'q3', retrievedDocIds: ['a', 'b', 'c', 'd', 'e', 'f', 'd3'], groundTruthDocId: 'd3' },
    { queryId: 'q4', retrievedDocIds: ['m', 'n', 'o'], groundTruthDocId: 'absent' }
  ];

  const metrics = calculateRagRetrievalMetrics(retrievalData);
  assert.equal(metrics.hitRateAt5Percent, 50);
  assert.equal(metrics.hitRateAt10Percent, 75);
  assert.ok(metrics.meanReciprocalRank > 0.4);
  assert.ok(metrics.ndcgAt10 > 0.4);
});

test('ai-governance: calculateCompositeAiGovernanceScore returns bounded score and band', () => {
  const elite = calculateCompositeAiGovernanceScore({
    evalAccuracyPercent: 95.0,
    evalHallucinationPercent: 1.5,
    tokenBudgetCompliancePercent: 94.0,
    cacheEfficiencyPercent: 88.0,
    jailbreakDefenseScore: 99.0,
    piiRedactionAccuracyPercent: 98.5,
    ragNdcgScore: 0.92,
    euAiActCompliancePercent: 96.0,
    nistMaturityPercent: 90.0
  });

  assert.ok(elite.compositeScore >= 90);
  assert.equal(elite.statusBand, 'elite_compliant');

  const deficient = calculateCompositeAiGovernanceScore({
    evalAccuracyPercent: 40.0,
    evalHallucinationPercent: 35.0,
    tokenBudgetCompliancePercent: 45.0,
    cacheEfficiencyPercent: 20.0,
    jailbreakDefenseScore: 40.0,
    piiRedactionAccuracyPercent: 50.0,
    ragNdcgScore: 0.35,
    euAiActCompliancePercent: 30.0,
    nistMaturityPercent: 25.0
  });

  assert.ok(deficient.compositeScore < 55);
  assert.equal(deficient.statusBand, 'critical_non_compliant');
});

test('ai-governance: generateExecutiveAiBoardMemorandumMarkdown formats all required sections', () => {
  const memo: ExecutiveAiBoardMemorandumDTO = {
    id: 'memo-test-1',
    title: 'Q4-2026 Executive AI Governance & LLM Safety Memorandum',
    fiscalQuarter: 'Q4-2026',
    status: 'draft',
    compositeAiGovernanceScore: 92.4,
    governanceStatusBand: 'elite_compliant',
    euAiActRiskTier: 'high_risk_employment',
    monthlyAiSpendUsd: 14200,
    annualizedArbitrageSavingsUsd: 118500,
    jailbreakVulnerabilityRatePercent: 0.42,
    executiveSummary: {
      sectionKey: 'exec',
      heading: '1. Executive Summary & AI Governance Posture',
      executiveSummaryText: 'Enterprise AI operations operate at 92.4 Composite AGS.',
      keyMetricsBulletPoints: ['AGS: 92.4 / 100', 'Arbitrage Savings: $118,500/yr'],
      strategicGovernanceGuidance: 'Maintain model cascade routing policies.'
    },
    evaluationScorecard: {
      sectionKey: 'eval',
      heading: '2. LLM Benchmark Leaderboard & Accuracy Evaluation',
      executiveSummaryText: 'GPT-4o and Claude 3.5 Sonnet lead multi-domain benchmarks.',
      keyMetricsBulletPoints: ['Mean Accuracy: 94.2%', 'Hallucination Rate: 1.8%'],
      strategicGovernanceGuidance: 'Adopt Tier 2 models for structured resume extraction.'
    },
    tokenEconomicsCascade: {
      sectionKey: 'econ',
      heading: '3. Token Economics, Prompt Caching & Cascade Routing',
      executiveSummaryText: 'Blended prompt caching reached 87.4% hit rate.',
      keyMetricsBulletPoints: ['Prompt Cache Hit: 87.4%', 'Cascade Savings: 62.4%'],
      strategicGovernanceGuidance: 'Enforce prefix caching headers across all API callers.'
    },
    responsibleAiGuardrails: {
      sectionKey: 'guard',
      heading: '4. Responsible AI, Jailbreak Defense & PII Redaction',
      executiveSummaryText: 'Jailbreak vulnerability bounded at 0.42% with zero PII leaks.',
      keyMetricsBulletPoints: ['JVR: 0.42%', '100% PII Redaction on 5 Entity Classes'],
      strategicGovernanceGuidance: 'Implement daily red-teaming adversarial injections.'
    },
    ragVectorGovernance: {
      sectionKey: 'rag',
      heading: '5. RAG Retrieval Quality & Knowledge Governance',
      executiveSummaryText: 'Pinecone and pgvector indices maintain 0.912 MRR.',
      keyMetricsBulletPoints: ['MRR: 0.912', 'NDCG@10: 0.884', 'Drift: 1.2%'],
      strategicGovernanceGuidance: 'Re-index candidate skill taxonomy on monthly cadence.'
    },
    regulatoryComplianceDirectives: {
      sectionKey: 'reg',
      heading: '6. EU AI Act Annex III & NIST AI RMF Sign-Off Actions',
      executiveSummaryText: 'All 7 mandatory high-risk employment criteria verified compliant.',
      keyMetricsBulletPoints: ['EU AI Act: Compliant', 'NIST RMF: Run Phase'],
      strategicGovernanceGuidance: 'Submit annual audit dossier to external compliance registrar.'
    },
    approvedByVpAiAt: '2026-10-25T00:00:00Z',
    createdAt: '2026-10-25T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  };

  const md = generateExecutiveAiBoardMemorandumMarkdown(memo);
  assert.ok(md.includes('Executive AI Governance, LLM Systems & Responsible AI Board Memorandum'));
  assert.ok(md.includes('Q4-2026'));
  assert.ok(md.includes('92.4 / 100'));
  assert.ok(md.includes('ELITE COMPLIANT'));
  assert.ok(md.includes('HIGH RISK EMPLOYMENT'));
  assert.ok(md.includes('$14,200'));
  assert.ok(md.includes('$118,500'));
  assert.ok(md.includes('0.42%'));
  assert.ok(md.includes('1. Executive Summary & AI Governance Posture'));
  assert.ok(md.includes('2. LLM Benchmark Leaderboard & Accuracy Evaluation'));
  assert.ok(md.includes('3. Token Economics, Prompt Caching & Cascade Routing'));
  assert.ok(md.includes('4. Responsible AI, Jailbreak Defense & PII Redaction'));
  assert.ok(md.includes('5. RAG Retrieval Quality & Knowledge Governance'));
  assert.ok(md.includes('6. EU AI Act Annex III & NIST AI RMF Sign-Off Actions'));
  assert.ok(md.includes('Approved (2026-10-25T00:00:00Z)'));
  assert.ok(md.includes('Pending Sign-Off'));
});

test('ai-governance: schema validators reject invalid inputs and accept valid payloads', () => {
  const invalidEval = validateLlmEvaluationInput({ domain: 'invalid', models: [], sampleSize: 5 });
  assert.equal(invalidEval.ok, false);
  assert.ok(invalidEval.errors.domain);
  assert.ok(invalidEval.errors.models);
  assert.ok(invalidEval.errors.sampleSize);

  const validEval = validateLlmEvaluationInput({
    domain: 'job_matching',
    models: ['gpt-4o', 'claude-3-5-sonnet'],
    sampleSize: 100
  });
  assert.equal(validEval.ok, true);

  const invalidCascade = validateCascadeSimulationInput({
    monthlyTotalRequests: -5,
    tier1RoutingPercent: 50,
    tier2RoutingPercent: 30,
    tier3RoutingPercent: 10
  });
  assert.equal(invalidCascade.ok, false);
  assert.ok(invalidCascade.errors.monthlyTotalRequests);
  assert.ok(invalidCascade.errors.routingShare);

  const validCascade = validateCascadeSimulationInput({
    monthlyTotalRequests: 50_000,
    tier1RoutingPercent: 55,
    tier2RoutingPercent: 35,
    tier3RoutingPercent: 10
  });
  assert.equal(validCascade.ok, true);

  const invalidGuardrails = validateGuardrailThresholds({
    toxicityMaxAllowedScore: 120,
    demographicBiasParityMinScore: 30
  });
  assert.equal(invalidGuardrails.ok, false);
  assert.ok(invalidGuardrails.errors.toxicityMaxAllowedScore);
  assert.ok(invalidGuardrails.errors.demographicBiasParityMinScore);

  const validGuardrails = validateGuardrailThresholds({
    toxicityMaxAllowedScore: 5.0,
    demographicBiasParityMinScore: 85.0
  });
  assert.equal(validGuardrails.ok, true);

  const invalidVec = validateVectorIndexConfig({ indexName: '', dimensionality: 512 });
  assert.equal(invalidVec.ok, false);
  assert.ok(invalidVec.errors.indexName);
  assert.ok(invalidVec.errors.dimensionality);

  const validVec = validateVectorIndexConfig({ indexName: 'pinecone-prod', dimensionality: 1536 });
  assert.equal(validVec.ok, true);

  const invalidMemo = validateAiBoardMemoGenerateInput({ title: '', fiscalQuarter: '' });
  assert.equal(invalidMemo.ok, false);
  assert.ok(invalidMemo.errors.title);
  assert.ok(invalidMemo.errors.fiscalQuarter);

  const validMemo = validateAiBoardMemoGenerateInput({
    title: 'Q4-2026 AI Governance Audit',
    fiscalQuarter: 'Q4-2026'
  });
  assert.equal(validMemo.ok, true);
});

test('succession: classifyNineBox and calculateNineBoxScore evaluate boundary cases', () => {
  assert.equal(classifyNineBox(3, 3), 'star');
  assert.equal(classifyNineBox(3, 2), 'high_performer');
  assert.equal(classifyNineBox(3, 1), 'solid_professional');
  assert.equal(classifyNineBox(2, 3), 'high_potential');
  assert.equal(classifyNineBox(2, 2), 'core_player');
  assert.equal(classifyNineBox(2, 1), 'effective');
  assert.equal(classifyNineBox(1, 3), 'enigma_rough_diamond');
  assert.equal(classifyNineBox(1, 2), 'dilemma');
  assert.equal(classifyNineBox(1, 1), 'underperformer_risk');

  assert.equal(calculateNineBoxScore(3, 3), 100);
  assert.equal(calculateNineBoxScore(1, 1), 0);
  assert.equal(calculateNineBoxScore(2, 2), 50);
  assert.ok(calculateNineBoxScore(3, 2) > calculateNineBoxScore(2, 3));
});

test('succession: calculateCalibrationDistribution computes divergence and health score', () => {
  const profiles = [
    { nineBoxClassification: 'star' as const },
    { nineBoxClassification: 'core_player' as const },
    { nineBoxClassification: 'core_player' as const },
    { nineBoxClassification: 'high_potential' as const },
    { nineBoxClassification: 'high_performer' as const },
    { nineBoxClassification: 'solid_professional' as const },
    { nineBoxClassification: 'effective' as const },
    { nineBoxClassification: 'underperformer_risk' as const },
    { nineBoxClassification: 'dilemma' as const },
    { nineBoxClassification: 'core_player' as const }
  ];

  const dist = calculateCalibrationDistribution(profiles);
  assert.equal(dist.totalTalentCount, 10);
  assert.equal(dist.starsCount, 1);
  assert.equal(dist.starsPercentage, 10);
  assert.equal(dist.coreGrowthCount, 7);
  assert.equal(dist.coreGrowthPercentage, 70);
  assert.equal(dist.actionRiskCount, 2);
  assert.equal(dist.actionRiskPercentage, 20);
  assert.equal(dist.distributionDivergenceIndex, 0);
  assert.equal(dist.calibrationHealthScore, 100);
});

test('succession: calculateKeyPersonRiskIndex and calculateFlightRisk evaluate risk metrics', () => {
  const lowKpri = calculateKeyPersonRiskIndex(1, 1, 1);
  assert.equal(lowKpri.index, 0);
  assert.equal(lowKpri.tier, 'low_exposure');

  const criticalKpri = calculateKeyPersonRiskIndex(5, 5, 5);
  assert.equal(criticalKpri.index, 100);
  assert.equal(criticalKpri.tier, 'critical_spof');

  const lowFlight = calculateFlightRisk(1.2, 1.0, 36, 0.1);
  assert.ok(lowFlight.score < 30);
  assert.equal(lowFlight.level, 'low');

  const criticalFlight = calculateFlightRisk(0.2, 6.0, 0, 1.0);
  assert.ok(criticalFlight.score > 80);
  assert.equal(criticalFlight.level, 'critical');
});

test('succession: evaluateRetentionInterventionTriggers returns actionable playbooks', () => {
  const triggers = evaluateRetentionInterventionTriggers({
    compaRatio: 0.75,
    yearsInRole: 3.5,
    monthsToCliff: 4,
    orgChangeImpact: 0.8,
    spofSeverity: 5,
    operationalCriticality: 5,
    replacementDifficulty: 4,
    performanceLevel: 3,
    potentialLevel: 3
  });

  assert.ok(triggers.length >= 2);
  assert.ok(triggers.some(t => t.playbookType === 'retention_equity_refresh'));
  assert.ok(triggers.some(t => t.playbookType === 'role_expansion_promotion'));
});

test('succession: calculateBenchDepthMetrics evaluates bench ratio and emergency vulnerability', () => {
  const roles = [
    {
      operationalCriticality: 5,
      successors: [
        { readinessHorizon: 'ready_now' as const, underrepresentedLeader: true },
        { readinessHorizon: 'ready_1_2_years' as const, underrepresentedLeader: false }
      ]
    },
    {
      operationalCriticality: 4,
      successors: [
        { readinessHorizon: 'emergency_interim' as const, underrepresentedLeader: true }
      ]
    }
  ];

  const metrics = calculateBenchDepthMetrics(roles);
  assert.equal(metrics.totalCriticalRoles, 2);
  assert.equal(metrics.totalSuccessorsIdentified, 3);
  assert.equal(metrics.benchDepthRatio, 1.5);
  assert.equal(metrics.emergencyVulnerableRoleCount, 1);
  assert.equal(metrics.emergencyVulnerabilityIndex, 50);
  assert.equal(metrics.underrepresentedSuccessorsCount, 2);
  assert.equal(metrics.successionDiversityIndex, 66.7);
  assert.equal(metrics.isBenchHealthy, false);
});

test('succession: calculateCompetencyGap and generateDevelopmentMilestones structure development', () => {
  const current = [
    { domain: 'strategic_vision' as const, score: 3.0 },
    { domain: 'operational_execution' as const, score: 4.5 },
    { domain: 'people_leadership_culture' as const, score: 4.0 },
    { domain: 'financial_business_acumen' as const, score: 2.5 },
    { domain: 'ai_technology_innovation' as const, score: 3.5 }
  ];

  const target = [
    { domain: 'strategic_vision' as const, score: 4.5 },
    { domain: 'operational_execution' as const, score: 4.5 },
    { domain: 'people_leadership_culture' as const, score: 4.5 },
    { domain: 'financial_business_acumen' as const, score: 4.5 },
    { domain: 'ai_technology_innovation' as const, score: 4.5 }
  ];

  const gapResult = calculateCompetencyGap(current, target);
  assert.equal(gapResult.scores.length, 5);
  assert.ok(gapResult.coverageIndex > 0 && gapResult.coverageIndex < 100);

  const milestones = generateDevelopmentMilestones(gapResult.scores);
  assert.equal(milestones.length, 4);
  assert.equal(milestones[0].dayHorizon, 30);
  assert.equal(milestones[1].dayHorizon, 60);
  assert.equal(milestones[2].dayHorizon, 90);
  assert.equal(milestones[3].dayHorizon, 180);
});

test('succession: calculateSuccessionHealthScore and generateBoardSuccessionMemorandumMarkdown', () => {
  const health = calculateSuccessionHealthScore({
    benchDepthRatio: 2.5,
    emergencyVulnerabilityIndex: 0,
    averageKpri: 25,
    averageCci: 90,
    calibrationHealthScore: 95
  });

  assert.ok(health.score >= 85);
  assert.equal(health.tier, 'resilient_bench');

  const mockPlan: SuccessionPlanDTO = {
    id: 'sp-01',
    userId: 'u-1',
    title: 'FY2027 Executive Leadership Succession Plan',
    fiscalYear: 2027,
    status: 'draft',
    calibrationDistribution: {
      totalTalentCount: 10,
      starsCount: 1,
      starsPercentage: 10,
      coreGrowthCount: 7,
      coreGrowthPercentage: 70,
      actionRiskCount: 2,
      actionRiskPercentage: 20,
      distributionDivergenceIndex: 0,
      calibrationHealthScore: 100,
      cellCounts: {
        star: 1,
        high_performer: 2,
        solid_professional: 1,
        high_potential: 2,
        core_player: 1,
        effective: 1,
        enigma_rough_diamond: 1,
        dilemma: 0,
        underperformer_risk: 1
      }
    },
    benchDepth: {
      totalCriticalRoles: 2,
      totalSuccessorsIdentified: 4,
      benchDepthRatio: 2.0,
      isBenchHealthy: true,
      emergencyVulnerableRoleCount: 0,
      emergencyVulnerabilityIndex: 0,
      underrepresentedSuccessorsCount: 2,
      successionDiversityIndex: 50
    },
    averageKeyPersonRiskIndex: 35.5,
    averageCompetencyCoverageIndex: 88.0,
    successionHealthScore: 89.2,
    governanceHealthTier: 'resilient_bench',
    criticalRoles: [
      {
        id: 'cr-1',
        userId: 'u-1',
        planId: 'sp-01',
        title: 'Chief Technology Officer',
        department: 'Engineering',
        currentIncumbentName: 'Sarah Lin',
        operationalCriticality: 5,
        vacancyDisruptionScore: 92,
        successors: [
          {
            id: 'sc-1',
            userId: 'u-1',
            criticalRoleId: 'cr-1',
            talentProfileId: 'tp-1',
            candidateName: 'Alex Mercer',
            currentRole: 'VP of Platform Engineering',
            readinessHorizon: 'ready_now',
            rankingOrder: 1,
            competencyCoverageIndex: 94,
            notes: 'Exemplary architectural leadership',
            underrepresentedLeader: false,
            createdAt: '2026-10-25T00:00:00Z',
            updatedAt: '2026-10-25T00:00:00Z'
          }
        ],
        readyNowCount: 1,
        ready1To2YearsCount: 0,
        emergencyInterimCount: 0,
        isEmergencyVulnerable: false,
        createdAt: '2026-10-25T00:00:00Z',
        updatedAt: '2026-10-25T00:00:00Z'
      }
    ],
    activeInterventionsCount: 3,
    totalInterventionBudgetUsd: 145000,
    boardMemorandumMarkdown: '',
    signOffs: [
      {
        role: 'vp_talent_management',
        roleLabel: 'VP of Talent Management',
        isApproved: true,
        signedByUserName: 'Elena Rostova',
        signedAt: '2026-10-25T08:00:00Z',
        digitalSignatureHash: 'sha256-mock-hash-1'
      },
      {
        role: 'chief_people_officer',
        roleLabel: 'Chief People Officer',
        isApproved: false
      },
      {
        role: 'ceo',
        roleLabel: 'Chief Executive Officer',
        isApproved: false
      }
    ],
    createdAt: '2026-10-25T00:00:00Z',
    updatedAt: '2026-10-25T00:00:00Z'
  };

  const md = generateBoardSuccessionMemorandumMarkdown(mockPlan);
  assert.ok(md.includes('Executive Board Memorandum: Enterprise Leadership Succession & Continuity Plan'));
  assert.ok(md.includes('Chief Technology Officer'));
  assert.ok(md.includes('VP of Talent Management'));
});

test('succession: input validators enforce strict bounds and schemas', () => {
  assert.throws(() => validateTalentProfileInput(null), /must be a non-null object/);
  assert.throws(() => validateTalentProfileInput({ employeeId: '' }), /employeeId is required/);
  assert.throws(() => validateTalentProfileInput({
    employeeId: 'EMP-01',
    fullName: 'Jane Doe',
    currentRole: 'CTO',
    department: 'Engineering',
    performanceLevel: 4,
    potentialLevel: 2
  }), /performanceLevel must be 1, 2, or 3/);

  const validProfile = validateTalentProfileInput({
    employeeId: 'EMP-01',
    fullName: 'Jane Doe',
    currentRole: 'CTO',
    department: 'Engineering',
    performanceLevel: 3,
    potentialLevel: 3,
    tenureYears: 4,
    yearsInCurrentRole: 2,
    totalDirectCompensationUsd: 450000,
    marketBenchmarkP75Usd: 420000,
    unvestedEquityValueUsd: 800000,
    monthsToEquityCliff: 14,
    organizationalChangeImpact: 0.2,
    spofSeverity: 4,
    operationalCriticality: 5,
    replacementDifficulty: 4,
    underrepresentedLeader: true
  });
  assert.equal(validProfile.employeeId, 'EMP-01');
  assert.equal(validProfile.performanceLevel, 3);
  assert.equal(validProfile.potentialLevel, 3);

  assert.throws(() => validateRetentionInterventionInput({ talentProfileId: '' }), /talentProfileId is required/);
  assert.throws(() => validateRetentionInterventionInput({
    talentProfileId: 'tp-1',
    playbookType: 'invalid_type',
    title: 'Retention grant'
  }), /Invalid playbookType/);

  const validIntervention = validateRetentionInterventionInput({
    talentProfileId: 'tp-1',
    playbookType: 'retention_equity_refresh',
    title: 'Equity refresh grant',
    proposedCostUsd: 75000
  });
  assert.equal(validIntervention.playbookType, 'retention_equity_refresh');

  assert.throws(() => validateCriticalRoleInput({ planId: '' }), /planId is required/);
  const validRole = validateCriticalRoleInput({
    planId: 'plan-1',
    title: 'Head of AI',
    department: 'AI Research',
    operationalCriticality: 5
  });
  assert.equal(validRole.title, 'Head of AI');

  assert.throws(() => validateSuccessorCandidateInput({ criticalRoleId: '' }), /criticalRoleId is required/);
  assert.throws(() => validateSuccessorCandidateInput({
    criticalRoleId: 'cr-1',
    talentProfileId: 'tp-1',
    readinessHorizon: 'invalid_horizon'
  }), /Invalid readinessHorizon/);

  const validSuccessor = validateSuccessorCandidateInput({
    criticalRoleId: 'cr-1',
    talentProfileId: 'tp-1',
    readinessHorizon: 'ready_now',
    rankingOrder: 1
  });
  assert.equal(validSuccessor.readinessHorizon, 'ready_now');

  assert.throws(() => validateSuccessionPlanInput({ title: '', fiscalYear: 2026 }), /title is required/);
  assert.throws(() => validateSuccessionPlanInput({ title: 'Plan', fiscalYear: 1999 }), /valid 4-digit year/);

  const validPlan = validateSuccessionPlanInput({
    title: 'FY2027 Executive Plan',
    fiscalYear: 2027
  });
  assert.equal(validPlan.fiscalYear, 2027);

  assert.throws(() => validateSignOffInput({ role: 'invalid' }), /Invalid sign-off executive role/);
  const validSign = validateSignOffInput({ role: 'ceo', comments: 'Approved by CEO' });
  assert.equal(validSign.role, 'ceo');
});

test('cyber-risk: calculateFairRiskMetrics and financial VaR-95 evaluate accurately', () => {
  const fair = calculateFairRiskMetrics({
    contactFrequency: 12.0,
    probabilityOfAction: 0.25,
    threatCapability: 70,
    resistanceStrength: 65,
    primaryLossMinUsd: 150000,
    primaryLossLikelyUsd: 450000,
    primaryLossMaxUsd: 1200000,
    secondaryLossMinUsd: 250000,
    secondaryLossLikelyUsd: 750000,
    secondaryLossMaxUsd: 3500000,
    inherentAleUsd: 2500000
  });

  assert.equal(fair.threatEventFrequency, 3.0);
  assert.equal(fair.vulnerabilityPercent, 52.5);
  assert.equal(fair.lossEventFrequency, 1.575);
  assert.ok(fair.singleLossExpectancyExpectedUsd > 1000000);
  assert.ok(fair.annualizedLossExpectancyUsd > 1500000);
  assert.ok(fair.valueAtRisk95PercentUsd > fair.annualizedLossExpectancyUsd);
  assert.ok(fair.riskReductionRatio >= 0 && fair.riskReductionRatio <= 1.0);
});

test('cyber-risk: calculateVulnerabilityPriority prioritizes by EPSS and CISA KEV', () => {
  const critKev = calculateVulnerabilityPriority(9.8, 0.45, true);
  assert.equal(critKev.priorityTier, 'critical');
  assert.ok(critKev.compositeRiskScore > 70);

  const highVuln = calculateVulnerabilityPriority(7.5, 0.12, false);
  assert.equal(highVuln.priorityTier, 'high');

  const medVuln = calculateVulnerabilityPriority(5.0, 0.02, false);
  assert.equal(medVuln.priorityTier, 'medium');

  const lowVuln = calculateVulnerabilityPriority(2.0, 0.01, false);
  assert.equal(lowVuln.priorityTier, 'low');
});

test('cyber-risk: calculateAttackSurfaceRating and calculateDarkWebExposureIndex compute risk scores', () => {
  const asr = calculateAttackSurfaceRating({
    exposedPortsCount: 8,
    shadowItDomainsCount: 3,
    cloudMisconfigurationsCount: 2,
    criticalVulnerabilitiesCount: 1
  });
  assert.ok(asr > 0 && asr <= 100);

  const exposures = [
    {
      hasPlaintextPassword: true,
      hasSessionToken: false,
      isVipExecutive: true,
      exposureDate: new Date().toISOString()
    },
    {
      hasPlaintextPassword: false,
      hasSessionToken: true,
      isVipExecutive: false,
      exposureDate: new Date().toISOString()
    }
  ];
  const clei = calculateDarkWebExposureIndex(exposures);
  assert.ok(clei > 10 && clei <= 100);

  const emptyClei = calculateDarkWebExposureIndex([]);
  assert.equal(emptyClei, 0);
});

test('cyber-risk: calculateNistComplianceMetrics evaluates 6 functions and audit defensibility score', () => {
  const controls: Array<{
    functionCode: 'govern' | 'identify' | 'protect' | 'detect' | 'respond' | 'recover';
    maturityNumericTier: number;
    hasVerifiedEvidence: boolean;
  }> = [
    { functionCode: 'govern', maturityNumericTier: 3, hasVerifiedEvidence: true },
    { functionCode: 'identify', maturityNumericTier: 3, hasVerifiedEvidence: true },
    { functionCode: 'protect', maturityNumericTier: 2, hasVerifiedEvidence: false },
    { functionCode: 'detect', maturityNumericTier: 3, hasVerifiedEvidence: true },
    { functionCode: 'respond', maturityNumericTier: 2, hasVerifiedEvidence: true },
    { functionCode: 'recover', maturityNumericTier: 3, hasVerifiedEvidence: true }
  ];

  const nist = calculateNistComplianceMetrics(controls);
  assert.ok(nist.overallMaturityAverage >= 2.0 && nist.overallMaturityAverage <= 4.0);
  assert.ok(nist.auditDefensibilityScore > 50 && nist.auditDefensibilityScore <= 100);
  assert.equal(nist.functionSummaries.govern.controlCount, 1);
  assert.equal(nist.functionSummaries.govern.evidencedCount, 1);
});

test('cyber-risk: calculateTabletopResilience and determineSecMateriality handle breach scenarios', () => {
  const resilience = calculateTabletopResilience({
    immutableBackupScore: 85,
    airgapIsolationScore: 80,
    rtoRpoDrillScore: 90,
    pamSegregationScore: 75,
    meanTimeToDetectHours: 1.5,
    meanTimeToContainHours: 3.5,
    simulatedTotalLossUsd: 12000000,
    insurancePrimaryLimitUsd: 10000000
  });

  assert.ok(resilience.ransomwareResilienceIndex >= 80);
  assert.equal(resilience.insuranceCoverageGapUsd, 2000000);
  assert.ok(resilience.insurabilityReadinessScore > 75);

  const materialIncident = determineSecMateriality({
    estimatedFinancialLossUsd: 15000000,
    annualRevenueThresholdUsd: 10000000,
    detectionTimestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    determinationTimestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    piiExfiltratedRecordCount: 250000,
    criticalSystemsDowntimeHours: 72,
    intellectualPropertyCompromised: true,
    regulatorySanctionsProbable: true,
    reputationalDamageHigh: true
  });

  assert.equal(materialIncident.isMaterial, true);
  assert.equal(materialIncident.status, 'material_incident_declared');
  assert.equal(materialIncident.isQuantitativelyMaterial, true);
  assert.equal(materialIncident.isQualitativelyMaterial, true);
  assert.ok(materialIncident.disclosureClockRemainingHours > 85);
  assert.equal(materialIncident.isClockBreached, false);
});

test('cyber-risk: calculateCompositeSecurityScore and generateBoardCyberMemorandumMarkdown format reports', () => {
  const score = calculateCompositeSecurityScore({
    inherentAleTotalUsd: 5000000,
    residualAleTotalUsd: 1200000,
    attackSurfaceRating: 25,
    darkWebExposureIndex: 18,
    auditDefensibilityScore: 82,
    ransomwareResilienceIndex: 85
  });

  assert.ok(score.compositeSecurityPostureScore >= 75);
  assert.ok(['superior_resilience', 'robust_defensible'].includes(score.postureTier));

  const memo: BoardCyberMemorandumDTO = {
    id: 'memo-1',
    userId: 'u-1',
    fiscalYear: 2026,
    quarter: 4,
    title: 'Enterprise Cyber Security & SEC Materiality Briefing',
    compositeSecurityPostureScore: score.compositeSecurityPostureScore,
    postureTier: score.postureTier,
    workflowStatus: 'board_approved',
    secMateriality: {
      incidentId: 'inc-0',
      incidentTitle: 'Zero-Day Vulnerability Triage',
      detectionTimestamp: new Date().toISOString(),
      determinationTimestamp: new Date().toISOString(),
      status: 'non_material',
      estimatedFinancialLossUsd: 250000,
      annualRevenueThresholdUsd: 5000000,
      quantitativeMaterialityRatio: 0.05,
      isQuantitativelyMaterial: false,
      qualitativeScore: 15,
      isQualitativelyMaterial: false,
      isMaterial: false,
      disclosureClockElapsedHours: 2,
      disclosureClockRemainingHours: 94,
      isClockBreached: false,
      piiExfiltratedRecordCount: 0,
      criticalSystemsDowntimeHours: 0,
      intellectualPropertyCompromised: false,
      regulatorySanctionsProbable: false,
      reputationalDamageHigh: false,
      cisoDeterminationNotes: 'Routine patching, no intrusion.',
      cloLegalEvaluationNotes: 'Non-material under Item 1.05.'
    },
    signOffs: [
      {
        role: 'ciso',
        roleLabel: 'Chief Information Security Officer',
        signatoryName: 'Marcus Vance, CISSP',
        isApproved: true,
        signedAt: '2026-10-25'
      },
      {
        role: 'chief_legal_officer',
        roleLabel: 'Chief Legal Officer',
        signatoryName: 'Elena Rostova, JD',
        isApproved: true,
        signedAt: '2026-10-25'
      },
      {
        role: 'board_audit_chair',
        roleLabel: 'Board Audit & Risk Committee Chair',
        signatoryName: 'Sir Arthur Sterling',
        isApproved: true,
        signedAt: '2026-10-25'
      }
    ],
    memorandumMarkdown: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const md = generateBoardCyberMemorandumMarkdown(memo);
  assert.ok(md.includes('# BOARD AUDIT & RISK COMMITTEE CYBERSECURITY MEMORANDUM'));
  assert.ok(md.includes('Marcus Vance, CISSP'));
  assert.ok(md.includes('Elena Rostova, JD'));
  assert.ok(md.includes('Sir Arthur Sterling'));
  assert.ok(md.includes('NO MATERIAL BREACH IDENTIFIED'));
});

test('cyber-risk: schema validators reject invalid inputs and accept valid payloads', () => {
  const badScenario = validateCyberRiskScenarioInput({});
  assert.equal(badScenario.valid, false);
  assert.ok(badScenario.errors.length >= 4);

  const goodScenario = validateCyberRiskScenarioInput({
    title: 'Cloud Ransomware Outage',
    category: 'ransomware_extortion',
    assetName: 'Core Kubernetes Cluster',
    threatActor: 'LockBit 3.0 Syndicate',
    contactFrequency: 10,
    probabilityOfAction: 0.5,
    threatCapability: 75,
    resistanceStrength: 70
  });
  assert.equal(goodScenario.valid, true);

  const badVuln = validateThreatVulnerabilityInput({ cveId: 'INVALID-ID' });
  assert.equal(badVuln.valid, false);

  const goodVuln = validateThreatVulnerabilityInput({
    cveId: 'CVE-2024-3094',
    title: 'XZ Utils Backdoor',
    cvssScore: 10.0,
    epssProbability: 0.95
  });
  assert.equal(goodVuln.valid, true);

  const badExposure = validateDarkWebExposureInput({ leakedEmail: 'invalidemail' });
  assert.equal(badExposure.valid, false);

  const goodExposure = validateDarkWebExposureInput({
    targetDomain: 'enterprise.com',
    leakedEmail: 'ciso@enterprise.com',
    breachSource: 'RedLine Stealer Dump'
  });
  assert.equal(goodExposure.valid, true);

  const badControl = validateComplianceControlInput({});
  assert.equal(badControl.valid, false);

  const goodControl = validateComplianceControlInput({
    functionCode: 'govern',
    subcategoryCode: 'GV.OC-01',
    title: 'Organizational Context Defined'
  });
  assert.equal(goodControl.valid, true);

  const badSim = validateTabletopSimulationInput({});
  assert.equal(badSim.valid, false);

  const goodSim = validateTabletopSimulationInput({
    archetype: 'ransomware_double_extortion',
    scenarioTitle: 'Active Directory Lockout Simulation',
    meanTimeToDetectHours: 1.2,
    meanTimeToContainHours: 3.8
  });
  assert.equal(goodSim.valid, true);

  const badSign = validateGovernanceSignOffInput({});
  assert.equal(badSign.valid, false);

  const goodSign = validateGovernanceSignOffInput({
    role: 'ciso',
    signatoryName: 'Marcus Vance',
    signatoryTitle: 'CISO'
  });
  assert.equal(goodSign.valid, true);

  const badMat = validateMaterialityDeterminationInput({});
  assert.equal(badMat.valid, false);

  const goodMat = validateMaterialityDeterminationInput({
    incidentId: 'INC-2026-001',
    estimatedFinancialLossUsd: 1200000
  });
  assert.equal(goodMat.valid, true);
});

test('esg: calculateGhgGrossAndNetEmissions and carbon intensities evaluate accurately', () => {
  const ghg = calculateGhgGrossAndNetEmissions({
    scope1Stationary: 2450.5,
    scope1Mobile: 850.2,
    scope1Fugitive: 120.3,
    scope2MarketBased: 4200.0,
    scope3Total: 30150.0,
    verifiedRemovals: 1500.0
  });

  assert.equal(ghg.scope1Total, 3421.0);
  assert.equal(ghg.grossTco2e, 37771.0);
  assert.equal(ghg.netTco2e, 36271.0);

  const intensity = calculateCarbonIntensities({
    grossEmissionsTco2e: ghg.grossTco2e,
    revenueMillionUsd: 500,
    headcountFte: 2500,
    realEstateAreaM2: 75000,
    scope1Plus2Tco2e: 7621.0
  });

  assert.equal(intensity.revenueIntensityTco2ePerMillionUsd, 75.54);
  assert.equal(intensity.headcountIntensityTco2ePerFte, 15.11);
  assert.equal(intensity.realEstateIntensityKgCo2ePerM2, 101.61);
  assert.ok(intensity.renewableEnergyPercent > 50);
});

test('esg: calculateTcfdFinancialExposure simulates physical and transition climate risks', () => {
  const rcp26 = calculateTcfdFinancialExposure({
    scenario: 'rcp_2_6_net_zero',
    timeHorizonYears: 2030,
    grossEmissionsTco2e: 37770,
    enterpriseValueUsd: 1200000000,
    carbonPriceUsdPerTon: 150,
    totalExposedAssetValueUsd: 150000000,
    baselineEnergySpendUsd: 12000000
  });

  assert.equal(rcp26.scenario, 'rcp_2_6_net_zero');
  assert.equal(rcp26.timeHorizon, 'short_term_2030');
  assert.ok(rcp26.climateVar95Usd > 10000000);
  assert.ok(rcp26.carbonTaxLiabilityUsd > 4000000);
  assert.ok(rcp26.strandedAssetImpairmentUsd > 10000000);

  const rcp85 = calculateTcfdFinancialExposure({
    scenario: 'rcp_8_5_extreme_warming',
    timeHorizonYears: 2050,
    grossEmissionsTco2e: 37770,
    enterpriseValueUsd: 1200000000,
    carbonPriceUsdPerTon: 50,
    totalExposedAssetValueUsd: 150000000,
    baselineEnergySpendUsd: 12000000
  });

  assert.equal(rcp85.scenario, 'rcp_8_5_extreme_warming');
  assert.equal(rcp85.timeHorizon, 'long_term_2050');
  assert.ok(rcp85.acutePhysicalLossUsd > rcp26.acutePhysicalLossUsd);
  assert.ok(rcp85.chronicOpexIncreaseUsd > rcp26.chronicOpexIncreaseUsd);
});

test('esg: calculateDoubleMaterialityScores classifies ESRS topics across 2D matrix', () => {
  const doubleMaterial = calculateDoubleMaterialityScores({
    scale: 4.8,
    scope: 4.5,
    irremediability: 4.6,
    likelihood: 4.2,
    magnitude: 4.4,
    probability: 4.0
  });
  assert.equal(doubleMaterial.tier, 'tier_1_double_material');
  assert.ok(doubleMaterial.impactScore >= 3.0);
  assert.ok(doubleMaterial.financialScore >= 3.0);

  const impactOnly = calculateDoubleMaterialityScores({
    scale: 4.0,
    scope: 3.8,
    irremediability: 3.5,
    likelihood: 3.2,
    magnitude: 2.0,
    probability: 2.0
  });
  assert.equal(impactOnly.tier, 'tier_2_impact_material_only');

  const financialOnly = calculateDoubleMaterialityScores({
    scale: 2.0,
    scope: 2.0,
    irremediability: 2.0,
    likelihood: 2.0,
    magnitude: 4.0,
    probability: 3.5
  });
  assert.equal(financialOnly.tier, 'tier_2_financial_material_only');

  const nonMaterial = calculateDoubleMaterialityScores({
    scale: 1.5,
    scope: 1.5,
    irremediability: 1.2,
    likelihood: 1.5,
    magnitude: 1.5,
    probability: 1.5
  });
  assert.equal(nonMaterial.tier, 'tier_3_non_material');
});

test('esg: calculateSbtiTrajectoryVariance and supplier decarbonization simulate glide path', () => {
  const onTrack = calculateSbtiTrajectoryVariance({
    baseYear: 2021,
    targetNetZeroYear: 2040,
    currentYear: 2026,
    baseYearEmissionsTco2e: 45000,
    currentActualEmissionsTco2e: 35000,
    annualLinearReductionRate: 0.042
  });
  assert.equal(onTrack.status, 'on_track_1_5c');
  assert.ok(onTrack.variancePercent <= 0);

  const offTrack = calculateSbtiTrajectoryVariance({
    baseYear: 2021,
    targetNetZeroYear: 2040,
    currentYear: 2026,
    baseYearEmissionsTco2e: 45000,
    currentActualEmissionsTco2e: 44000,
    annualLinearReductionRate: 0.042
  });
  assert.equal(offTrack.status, 'off_track_non_compliant');
  assert.ok(offTrack.variancePercent > 10.0);

  const suppliers = [
    {
      id: 'sup-1',
      vendorName: 'Cloud Server Host Inc',
      procurementCategory: 'IT Infrastructure',
      annualSpendUsd: 15000000,
      esgTier: 'tier_a_sbti_net_zero' as const,
      allocatedScope3Tco2e: 12000,
      hasSbtiValidatedTarget: true,
      reportedRenewableElectricityPercent: 90,
      carbonIntensityTco2ePerSpendUsd: 0.0008,
      annualEmissionsReductionPercent: 6.2,
      engagementStatus: 'engaged_active' as const,
      lastEngagedAt: '2026-09-15'
    },
    {
      id: 'sup-2',
      vendorName: 'Global Logistics Partners',
      procurementCategory: 'Freight & Shipping',
      annualSpendUsd: 8500000,
      esgTier: 'tier_b_measured_targets' as const,
      allocatedScope3Tco2e: 9500,
      hasSbtiValidatedTarget: false,
      reportedRenewableElectricityPercent: 45,
      carbonIntensityTco2ePerSpendUsd: 0.0011,
      annualEmissionsReductionPercent: 3.5,
      engagementStatus: 'engaged_active' as const,
      lastEngagedAt: '2026-08-20'
    }
  ];

  const sim = calculateSupplierDecarbonizationImpact({
    suppliers,
    targetTierASharePercent: 80,
    targetVendorRenewablePercent: 85
  });

  assert.equal(sim.baselineScope3Tco2e, 21500);
  assert.ok(sim.abatedScope3Tco2e > 10000);
  assert.ok(sim.abatementPercentage > 45);
  assert.equal(sim.newAlignmentStatus, 'on_track_1_5c');
});

test('esg: calculateGreenwashingExposureIndex and composite ESG governance score compute defensibility', () => {
  const cleanAudit = calculateGreenwashingExposureIndex([]);
  assert.equal(cleanAudit.score, 10.0);
  assert.equal(cleanAudit.riskLevel, 'low_defensible');

  const flaggedAudit = calculateGreenwashingExposureIndex([
    {
      id: 'f-1',
      claimSnippet: 'Completely carbon neutral by buying non-certified tree planting tokens.',
      sourceDocument: 'Annual Sustainability Glossy',
      riskCategory: 'dubious_carbon_offset',
      riskSeverity: 'high',
      regulatoryStandardViolated: 'EU Green Claims Directive Article 3',
      suggestedDefensibleRewrite: 'Reduced operational emissions by 35% with residual emissions unhedged.'
    },
    {
      id: 'f-2',
      claimSnippet: 'Zero carbon products delivered worldwide.',
      sourceDocument: 'Marketing Homepage',
      riskCategory: 'unsubstantiated_neutrality',
      riskSeverity: 'high',
      regulatoryStandardViolated: 'SEC Rule 10b-5 / FTC Green Guides',
      suggestedDefensibleRewrite: 'Carbon reduced delivery fleet.'
    }
  ]);
  assert.equal(flaggedAudit.score, 50.0);
  assert.equal(flaggedAudit.riskLevel, 'high_regulatory_exposure');

  const composite = calculateCompositeEsgGovernanceScore({
    ghgDecarbonizationRatePercent: 4.8,
    renewableEnergyPercent: 85.0,
    tcfdResilienceScore: 82.5,
    csrdAuditReadinessPercent: 89.0,
    sbtiAlignmentScore: 92.0,
    supplierEngagementPercent: 78.0,
    secReadinessPercent: 88.5,
    greenwashingRiskIndex: 12.0
  });

  assert.ok(composite.compositeScore >= 75.0 && composite.compositeScore <= 100.0);
  assert.ok(['leader_net_zero_aligned', 'managed_defensible'].includes(composite.statusBand));
});

test('esg: generateExecutiveEsgBoardMemorandumMarkdown renders complete C-suite governance report', () => {
  const memo: ExecutiveEsgBoardMemorandumDTO = {
    id: 'memo-esg-1',
    title: 'Enterprise ESG, Climate Risk & Decarbonization Governance Briefing',
    reportingYear: 2026,
    status: 'board_approved',
    compositeEsgScore: 87.4,
    governanceStatusBand: 'managed_defensible',
    sbtiAlignmentStatus: 'on_track_1_5c',
    secFilingReadinessPercent: 89.2,
    greenwashingRiskIndex: 11.5,
    executiveSummary: {
      sectionKey: 'exec',
      heading: 'Executive Governance Summary',
      executiveSummaryText: 'Enterprise ESG performance meets statutory disclosure readiness.',
      keyMetricsBulletPoints: ['Gross Emissions: 37,770 tCO2e', 'Net Emissions: 36,270 tCO2e', 'SBTi 1.5C Glide Path: On Track'],
      strategicGovernanceGuidance: 'Accelerate supplier Tier A onboarding.'
    },
    ghgInventoryBreakdown: {
      sectionKey: 'ghg',
      heading: 'GHG Protocol Emissions Ledger',
      executiveSummaryText: 'Comprehensive accounting across Scope 1, Scope 2, and Scope 3.',
      keyMetricsBulletPoints: ['Scope 1: 3,421 tCO2e', 'Scope 2 Market: 4,200 tCO2e', 'Scope 3: 30,150 tCO2e'],
      strategicGovernanceGuidance: 'Maintain 80% renewable electricity coverage.'
    },
    tcfdScenarioAnalysis: {
      sectionKey: 'tcfd',
      heading: 'TCFD Climate Financial Risk Scenario Analysis',
      executiveSummaryText: 'Stress testing under RCP 2.6 (Net Zero) and RCP 8.5 (Extreme Warming).',
      keyMetricsBulletPoints: ['RCP 2.6 VaR-95: $15.3M', 'RCP 8.5 VaR-95: $22.8M'],
      strategicGovernanceGuidance: 'Cap carbon tax liability through power purchase agreements.'
    },
    csrdMaterialityReview: {
      sectionKey: 'csrd',
      heading: 'EU CSRD Double Materiality & ESRS Governance',
      executiveSummaryText: 'Audited across 10 ESRS environmental, social, and governance standards.',
      keyMetricsBulletPoints: ['Double Material Topics: 5', 'Average Audit Readiness: 91.2%'],
      strategicGovernanceGuidance: 'Finalize limited assurance audit by Q4.'
    },
    sbtiSupplyChainRoadmap: {
      sectionKey: 'sbti',
      heading: 'Scope 3 Value Chain & SBTi Decarbonization',
      executiveSummaryText: 'Decarbonizing supply chain via supplier contract mandates.',
      keyMetricsBulletPoints: ['Tracked Vendors: 120', 'Spend with SBTi Vendors: 71.4%'],
      strategicGovernanceGuidance: 'Target 80% Tier A vendor coverage.'
    },
    secComplianceAudit: {
      sectionKey: 'sec',
      heading: 'SEC Climate Disclosure & Greenwashing Risk Audit',
      executiveSummaryText: 'Regulation S-K Items 1500-1507 and Regulation S-X readiness.',
      keyMetricsBulletPoints: ['SEC Filing Readiness: 89.2%', 'Greenwashing Exposure: Low (11.5/100)'],
      strategicGovernanceGuidance: 'Audit climate claims prior to 10-K filing.'
    },
    approvedByCsoAt: '2026-10-25',
    approvedByCfoAt: '2026-10-25',
    approvedByBoardChairAt: '2026-10-25',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const md = generateExecutiveEsgBoardMemorandumMarkdown(memo);
  assert.ok(md.includes('# Executive ESG, Sustainability & Climate Risk Board Memorandum'));
  assert.ok(md.includes('Enterprise ESG, Climate Risk & Decarbonization Governance Briefing'));
  assert.ok(md.includes('**Chief Sustainability Officer (CSO):** Certified & Signed (2026-10-25)'));
  assert.ok(md.includes('**Chief Financial Officer (CFO):** Financial Review & Signed (2026-10-25)'));
  assert.ok(md.includes('**Board ESG & Sustainability Committee Chair:** Board Ratified & Signed (2026-10-25)'));
});

test('esg: schema validators enforce boundaries and reject malformed inputs', () => {
  const badGhg = validateRecordCarbonEmissionsInput({});
  assert.equal(badGhg.ok, false);
  assert.ok(Object.keys(badGhg.errors).length >= 4);

  const goodGhg = validateRecordCarbonEmissionsInput({
    reportingYear: 2026,
    scope1Stationary: 1500,
    scope1Mobile: 500,
    scope1Fugitive: 50,
    scope2Location: 3000,
    scope2Market: 1000,
    scope3Categories: [],
    verifiedRemovals: 200,
    revenueMillionUsd: 350,
    headcountFte: 1800,
    realEstateAreaM2: 50000,
    energyTotalMwh: 12000,
    renewableEnergyMwh: 10000
  });
  assert.equal(goodGhg.ok, true);

  const badTcfd = validateTcfdSimulationInput({});
  assert.equal(badTcfd.ok, false);

  const goodTcfd = validateTcfdSimulationInput({
    scenario: 'rcp_2_6_net_zero',
    timeHorizon: 'short_term_2030',
    enterpriseValueUsd: 850000000,
    physicalAssetLocationsCount: 12
  });
  assert.equal(goodTcfd.ok, true);

  const badTopic = validateMaterialityTopicUpdate({});
  assert.equal(badTopic.ok, false);

  const goodTopic = validateMaterialityTopicUpdate({
    topicCode: 'E1',
    impactScale: 4.5,
    impactScope: 4.0,
    impactIrremediability: 4.2,
    impactLikelihood: 4.0,
    financialMagnitude: 4.5,
    financialProbability: 4.0,
    keyImpacts: ['Carbon emissions reduction'],
    keyFinancialRisks: ['Carbon tax liability']
  });
  assert.equal(goodTopic.ok, true);

  const badSupplier = validateSupplierSimulationInput({ targetTierAProcurementSharePercent: 150 });
  assert.equal(badSupplier.ok, false);

  const goodSupplier = validateSupplierSimulationInput({
    targetTierAProcurementSharePercent: 75,
    targetVendorRenewableAdoptionPercent: 80,
    supplierEngagementMandateEnacted: true
  });
  assert.equal(goodSupplier.ok, true);

  const badMemo = validateEsgBoardMemoGenerateInput({});
  assert.equal(badMemo.ok, false);

  const goodMemo = validateEsgBoardMemoGenerateInput({
    title: 'FY2026 Board ESG Governance Briefing',
    reportingYear: 2026
  });
  assert.equal(goodMemo.ok, true);

  const badSign = validateEsgSignOffInput({});
  assert.equal(badSign.ok, false);

  const goodSign = validateEsgSignOffInput({ role: 'cso' });
  assert.equal(goodSign.ok, true);
});

test('supply-chain: calculateHerfindahlHirschmanIndex and calculateDualSourcingRatio compute concentration metrics', () => {
  assert.equal(calculateHerfindahlHirschmanIndex([]), 10000);
  assert.equal(calculateHerfindahlHirschmanIndex([100]), 10000);
  assert.equal(calculateHerfindahlHirschmanIndex([50, 50]), 5000);
  assert.equal(calculateHerfindahlHirschmanIndex([25, 25, 25, 25]), 2500);

  assert.equal(calculateDualSourcingRatio(0, 0), 100);
  assert.equal(calculateDualSourcingRatio(10, 8), 80);
  assert.equal(calculateDualSourcingRatio(12, 3), 25);
});

test('supply-chain: buffer stock, reorder point, DIO, and resilience deficit calculations', () => {
  const ss = calculateSafetyStock(1.96, 30, 8, 50, 6.5);
  assert.ok(ss > 0);
  assert.equal(typeof ss, 'number');

  const rop = calculateReorderPoint(50, 30, ss);
  assert.equal(rop, 50 * 30 + ss);

  const dio = calculateDaysOfInventoryOutstanding(1500000, 12000000);
  assert.ok(dio > 45 && dio < 46);

  const deficitVulnerable = calculateResilienceDeficit(28, 45);
  assert.equal(deficitVulnerable.resilienceRatio, 0.62);
  assert.equal(deficitVulnerable.resilienceDeficitDays, 17);
  assert.equal(deficitVulnerable.isVulnerable, true);

  const deficitSecure = calculateResilienceDeficit(56, 38);
  assert.equal(deficitSecure.resilienceRatio, 1.47);
  assert.equal(deficitSecure.resilienceDeficitDays, 0);
  assert.equal(deficitSecure.isVulnerable, false);
});

test('supply-chain: calculateTotalLandedCost correctly models tariffs, pipeline holding, and scrap', () => {
  const tlc = calculateTotalLandedCost(100, 12.5, 25, 15, 42, 4);
  assert.equal(tlc.customsTariffPerUnitUsd, 25.0);
  assert.ok(tlc.pipelineCarryingCostPerUnitUsd > 1.7 && tlc.pipelineCarryingCostPerUnitUsd < 1.8);
  assert.ok(tlc.totalLandedCostUsd > 143 && tlc.totalLandedCostUsd < 144);
});

test('supply-chain: calculateCompositeScri and determineCrisisSeverityBand categorize operational risk', () => {
  const elite = calculateCompositeScri({
    supplierRedundancyScore: 90,
    geopoliticalStabilityScore: 90,
    bufferAdequacyScore: 90,
    landedCostAgilityScore: 85,
    sanctionsImmunityScore: 95
  });
  assert.ok(elite.compositeScri >= 85);
  assert.equal(elite.resilienceRatingBand, 'elite_hardened');

  const defensible = calculateCompositeScri({
    supplierRedundancyScore: 78,
    geopoliticalStabilityScore: 74,
    bufferAdequacyScore: 68,
    landedCostAgilityScore: 86,
    sanctionsImmunityScore: 92
  });
  assert.ok(defensible.compositeScri >= 70 && defensible.compositeScri < 85);
  assert.equal(defensible.resilienceRatingBand, 'defensible');

  const normalBand = determineCrisisSeverityBand(88, 0, 0, 0);
  assert.equal(normalBand, 'normal_operations');

  const watchBand = determineCrisisSeverityBand(82, 0, 0, 0);
  assert.equal(watchBand, 'tier_1_watch');

  const warnBand = determineCrisisSeverityBand(82, 1, 1, 0);
  assert.equal(warnBand, 'tier_2_warning');

  const warRoomBand = determineCrisisSeverityBand(82, 1, 1, 1);
  assert.equal(warRoomBand, 'tier_3_crisis_war_room');
});

test('supply-chain: generateExecutiveSupplyChainMemorandum produces formatted board document', () => {
  const md = generateExecutiveSupplyChainMemorandum({
    title: 'Q4-2026 Board SCM Resilience Strategy',
    fiscalQuarter: 'Q4-2026',
    overview: {
      compositeScri: 82.5,
      resilienceRatingBand: 'defensible',
      crisisSeverity: 'tier_1_watch',
      totalMappedComponents: 48,
      singlePointOfFailureCount: 7,
      aggregateHhiIndex: 2140,
      dualSourcingRatioPercent: 64.5,
      totalAnnualTariffExposureUsd: 4850000,
      chokepointsAtRiskCount: 2,
      averageDioDays: 42.5,
      criticalBufferDeficitCount: 4,
      potentialNearshoringArbitrageUsd: 3240000,
      activeSanctionFlagsCount: 1,
      indexBreakdown: {
        supplierRedundancyScore: 78,
        geopoliticalStabilityScore: 74,
        bufferAdequacyScore: 68,
        landedCostAgilityScore: 86,
        sanctionsImmunityScore: 92,
        compositeScri: 82.5,
        resilienceRatingBand: 'defensible'
      },
      bomSummary: {
        totalComponentsMapped: 4,
        tier1Count: 1,
        tier2Count: 1,
        tier3Count: 1,
        tier4Count: 1,
        singlePointOfFailureCount: 2,
        aggregateHhiIndex: 2140,
        dualSourcingRatioPercent: 64.5,
        averageBomVulnerabilityScore: 59.2,
        nodes: []
      },
      geopoliticalSummary: {
        totalCountriesMonitored: 3,
        highRiskJurisdictionCount: 1,
        flaggedSanctionEntitiesCount: 1,
        totalAnnualTariffExposureUsd: 3100000,
        criticalChokepointVulnerabilityCount: 2,
        exposures: []
      },
      bufferSummary: {
        totalSkusTracked: 2,
        criticalDeficitSkusCount: 1,
        averageDioDays: 42.1,
        totalBufferCarryingCostUsd: 37800,
        aggregateStockoutExposureUsd: 1450000,
        buffers: []
      },
      networkSummary: {
        activeHubsCount: 3,
        primaryOffshoreHub: {} as any,
        primaryNearshoreHub: {} as any,
        primaryOnshoreHub: {} as any,
        projectedAnnualNearshoringArbitrageUsd: 3240000,
        averageLeadTimeAdvantageDays: 38,
        allHubs: []
      },
      recentMemos: []
    }
  });

  assert.ok(md.includes('EXECUTIVE SUPPLY CHAIN RESILIENCE & GLOBAL LOGISTICS MEMORANDUM'));
  assert.ok(md.includes('**Fiscal Review Period:** Q4-2026'));
  assert.ok(md.includes('**Memorandum Title:** Q4-2026 Board SCM Resilience Strategy'));
  assert.ok(md.includes('Composite Supply Chain Resilience Index (SCRI) of **82.5 / 100**'));
  assert.ok(md.includes('Tripartite Governance Sign-Off'));
});

test('supply-chain: schema validators enforce boundaries and reject invalid inputs', () => {
  const badBom = validateSupplierBomNodeInput({});
  assert.equal(badBom.ok, false);
  assert.ok(Object.keys(badBom.errors).length >= 4);

  const goodBom = validateSupplierBomNodeInput({
    partNumber: 'PCBA-7001',
    componentName: 'Main Controller System Motherboard',
    tier: 'tier_1_integrator',
    supplierName: 'Apex Electronics',
    supplierCountry: 'Taiwan',
    spendVolumeSharePercent: 65,
    nominalLeadTimeDays: 45,
    annualSpendUsd: 14200000
  });
  assert.equal(goodBom.ok, true);

  const badSim = validateDisruptionSimulationInput({});
  assert.equal(badSim.ok, false);

  const goodSim = validateDisruptionSimulationInput({
    sku: 'SKU-MCU-3305',
    simulatedDelayDays: 21,
    demandSurgePercent: 20,
    disruptionProbabilityPercent: 35
  });
  assert.equal(goodSim.ok, true);

  const badHub = validateHubComparisonInput({});
  assert.equal(badHub.ok, false);

  const goodHub = validateHubComparisonInput({
    baselineHubId: 'hub-1',
    candidateHubIds: ['hub-2', 'hub-3'],
    annualProductionVolumeUnits: 100000,
    annualHoldingCostRatePercent: 15
  });
  assert.equal(goodHub.ok, true);

  const badMemo = validateSupplyChainBoardMemoGenerateInput({});
  assert.equal(badMemo.ok, false);

  const goodMemo = validateSupplyChainBoardMemoGenerateInput({
    fiscalQuarter: 'Q4-2026',
    title: 'Enterprise Supply Chain Strategic Memorandum'
  });
  assert.equal(goodMemo.ok, true);

  const badSign = validateSupplyChainSignoffInput({});
  assert.equal(badSign.ok, false);

  const goodSign = validateSupplyChainSignoffInput({
    role: 'vp_supply_chain'
  });
  assert.equal(goodSign.ok, true);
});

test('workforce-total-rewards: calculateCompaRatio, calculateRangePenetration, evaluateSalaryCircleStatus, and adjustSalaryForPurchasingPowerParity', () => {
  assert.equal(calculateCompaRatio(160000, 160000), 100);
  assert.equal(calculateCompaRatio(140000, 160000), 87.5);
  assert.equal(calculateCompaRatio(180000, 160000), 112.5);
  assert.equal(calculateCompaRatio(150000, 0), 100);

  assert.equal(calculateRangePenetration(140000, 120000, 160000), 50);
  assert.equal(calculateRangePenetration(120000, 120000, 160000), 0);
  assert.equal(calculateRangePenetration(160000, 120000, 160000), 100);
  assert.equal(calculateRangePenetration(110000, 120000, 160000), -25);
  assert.equal(calculateRangePenetration(170000, 120000, 160000), 125);
  assert.equal(calculateRangePenetration(140000, 160000, 160000), 50);

  assert.equal(evaluateSalaryCircleStatus(150000, 120000, 160000), 'normal_band');
  assert.equal(evaluateSalaryCircleStatus(165000, 120000, 160000), 'red_circle_overpaid');
  assert.equal(evaluateSalaryCircleStatus(115000, 120000, 160000), 'green_circle_underpaid');

  const adjusted = adjustSalaryForPurchasingPowerParity(200000, 0.85, 0.9);
  assert.equal(adjusted, Math.round(200000 * 0.85 * 0.9));
});

test('workforce-total-rewards: calculateDilutionOverhang and calculateShareBurnRate compute equity governance ratios', () => {
  const overhang = calculateDilutionOverhang({
    unvestedShares: 5000000,
    optionsOutstanding: 2000000,
    availableSharePool: 3000000,
    commonSharesOutstanding: 100000000
  });
  assert.equal(overhang, 10);

  const burn = calculateShareBurnRate({
    grossSharesGranted: 2200000,
    sharesForfeitedOrCancelled: 200000,
    weightedAverageCommonShares: 100000000
  });
  assert.equal(burn.grossBurnRatePercent, 2.2);
  assert.equal(burn.netBurnRatePercent, 2.0);
});

test('workforce-total-rewards: simulateRelativeTsrMonteCarlo models rTSR distribution and negative TSR cap', () => {
  const sim = simulateRelativeTsrMonteCarlo({
    performancePeriodYears: 3,
    companyAnnualizedDrift: 0.12,
    companyVolatility: 0.35,
    peerGroupMeanDrift: 0.10,
    peerGroupMeanVolatility: 0.30,
    peerCorrelationFactor: 0.55,
    numPeers: 12,
    iterationsCount: 200,
    negativeTsrCapEnforced: true,
    maximumPayoutMultiplier: 200
  });
  assert.equal(sim.iterationsCount, 200);
  assert.equal(sim.performancePeriodYears, 3);
  assert.ok(typeof sim.companyMedianTsrPercent === 'number');
  assert.ok(typeof sim.expectedPayoutMultiplierPercent === 'number');
  assert.ok(sim.expectedPayoutMultiplierPercent >= 0);
  assert.ok(sim.probabilityOfZeroPayoutPercent >= 0 && sim.probabilityOfZeroPayoutPercent <= 100);
  assert.ok(sim.probabilityOfMaxPayoutPercent >= 0 && sim.probabilityOfMaxPayoutPercent <= 100);
  assert.ok(sim.simulatedTsrDistribution.percentileP50 !== undefined);
  assert.ok(sim.recommendedFairValueDiscountPercent >= 5);
});

test('workforce-total-rewards: calculateSection83bTaxArbitrage, calculateIsoAlternativeMinimumTaxPreference, and calculateCrossBorderTrailingTaxAllocation', () => {
  const arb = calculateSection83bTaxArbitrage({
    sharesGranted: 50000,
    grantDateFmvUsd: 1.0,
    strikeOrPurchasePriceUsd: 0.1,
    projectedLiquiditySharePriceUsd: 25.0,
    ordinaryIncomeTaxRatePercent: 40.0,
    longTermCapitalGainsRatePercent: 20.0,
    netInvestmentIncomeTaxPercent: 3.8,
    holdingPeriodYears: 4,
    riskOfForfeitureProbabilityPercent: 10
  });
  assert.ok(arb.taxPaidAtGrantWith83bUsd > 0);
  assert.ok(arb.projectedTaxAtVestingWithout83bUsd > arb.taxPaidAtGrantWith83bUsd);
  assert.ok(arb.netProjectedTaxSavingsUsd > 0);
  assert.equal(arb.recommendationDirective, 'strongly_recommended_file_83b');

  const amt = calculateIsoAlternativeMinimumTaxPreference(20000, 15.0, 3.0, 28);
  assert.equal(amt.amtSpreadUsd, 240000);
  assert.equal(amt.estimatedAmtLiabilityUsd, 67200);
  assert.ok(amt.minimumTaxCreditPotentialUsd > 0);

  const cross = calculateCrossBorderTrailingTaxAllocation({
    vestingGainUsd: 100000,
    totalVestingWorkdays: 1000,
    jurisdictionWorkdays: [
      { code: 'US', name: 'United States', workdays: 600, localWithholdingRatePercent: 37 },
      { code: 'UK', name: 'United Kingdom', workdays: 400, localWithholdingRatePercent: 45 }
    ]
  });
  assert.equal(cross.allocations.length, 2);
  assert.equal(cross.allocations[0].allocationPercent, 60);
  assert.equal(cross.allocations[1].allocationPercent, 40);
  assert.equal(cross.allocations[0].allocatedTaxableGainUsd, 60000);
  assert.equal(cross.allocations[1].allocatedTaxableGainUsd, 40000);
  assert.equal(cross.totalWithholdingTaxUsd, Math.round(60000 * 0.37 + 40000 * 0.45));
});

test('workforce-total-rewards: solveMultivariatePayEquityRegression and calculateRemediationBudget', () => {
  const dataPoints = [
    { logSalary: Math.log(120000), genderDummy: 1, ethnicityDummy: 0, tenureYears: 3, levelRank: 3, performanceRating: 4, locationTierRank: 1 },
    { logSalary: Math.log(125000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 3, levelRank: 3, performanceRating: 4, locationTierRank: 1 },
    { logSalary: Math.log(150000), genderDummy: 1, ethnicityDummy: 1, tenureYears: 5, levelRank: 4, performanceRating: 4, locationTierRank: 2 },
    { logSalary: Math.log(155000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 5, levelRank: 4, performanceRating: 4, locationTierRank: 2 },
    { logSalary: Math.log(180000), genderDummy: 1, ethnicityDummy: 0, tenureYears: 7, levelRank: 5, performanceRating: 5, locationTierRank: 1 },
    { logSalary: Math.log(185000), genderDummy: 0, ethnicityDummy: 0, tenureYears: 7, levelRank: 5, performanceRating: 5, locationTierRank: 1 }
  ];
  const reg = solveMultivariatePayEquityRegression(dataPoints);
  assert.ok(typeof reg.unadjustedGenderGapPercent === 'number');
  assert.ok(typeof reg.adjustedGenderGapPercent === 'number');
  assert.ok(reg.rSquared > 0);

  const budget = calculateRemediationBudget([
    { id: 'e1', currentBaseSalary: 110000, controlledModelPredictedSalary: 120000, gender: 'female', salaryCircleStatus: 'green_circle_underpaid' },
    { id: 'e2', currentBaseSalary: 130000, controlledModelPredictedSalary: 125000, gender: 'male', salaryCircleStatus: 'normal_band' }
  ]);
  assert.equal(budget.totalRemediationBudgetUsd, 10000);
  assert.equal(budget.remediatedEmployeesCount, 1);
  assert.ok(budget.averageAdjustmentPercent > 0);
});

test('workforce-total-rewards: calculateTotalRewardsAlignmentIndex and assessSayOnPayShareholderRisk', () => {
  const trai = calculateTotalRewardsAlignmentIndex({
    basePayRangeDisciplineScore: 92,
    payForPerformanceSensitivityScore: 88,
    equityDilutionBurnHealthScore: 85,
    payEquityStatutoryComplianceScore: 95,
    taxOptimizationGovernanceScore: 90
  });
  assert.ok(trai.compositeTrai >= 88);
  assert.equal(trai.ratingBand, 'defensible_compliant');

  const sayRisk = assessSayOnPayShareholderRisk({
    ceoToMedianWorkerRatio: 175,
    threeYearGrossBurnRatePercent: 2.1,
    dilutionOverhangPercent: 10.5,
    controlledGenderGapPercent: -1.2,
    payVsTsrAlignmentScore: 85
  });
  assert.ok(sayRisk.projectedShareholderApprovalRatePercent >= 85);
  assert.ok(sayRisk.issAdverseRecommendationRisk !== 'high_adverse_risk');
});

test('workforce-total-rewards: generateSecItem402CdaMemorandum outputs complete SEC Item 402 markdown', () => {
  const dummyOverview: TotalRewardsStudioOverviewDTO = {
    compositeTrai: 89.5,
    ratingBand: 'defensible_compliant',
    sayOnPayProjectedApprovalPercent: 94.2,
    totalHeadcount: 1450,
    totalAnnualPayrollUsd: 198500000,
    redCircleEmployeeCount: 14,
    greenCircleEmployeeCount: 22,
    currentDilutionOverhangPercent: 9.8,
    annualGrossBurnRatePercent: 1.85,
    overallEnterpriseControlledGenderGapPercent: -1.1,
    totalRemediationBudgetRequiredUsd: 420000,
    irc409aFmvPerShareUsd: 18.5,
    active83bTimelyFilingsCount: 38,
    ceoToMedianWorkerPayRatio: 176,
    alignmentBreakdown: {
      basePayRangeDisciplineScore: 90,
      payForPerformanceSensitivityScore: 88,
      equityDilutionBurnHealthScore: 91,
      payEquityStatutoryComplianceScore: 92,
      taxOptimizationGovernanceScore: 87,
      compositeTrai: 89.5,
      ratingBand: 'defensible_compliant'
    },
    sayOnPayAssessment: {
      projectedShareholderApprovalRatePercent: 94.2,
      issAdverseRecommendationRisk: 'low_minimal_risk',
      glassLewisAdverseRisk: 'low_minimal_risk',
      ceoToMedianWorkerPayRatio: 176,
      ceoTotalCompensationUsd: 14500000,
      medianWorkerTotalCompensationUsd: 82500,
      payVsTsrAlignmentScore: 88,
      primaryRiskDrivers: []
    },
    jobArchitectureSummary: {
      totalHeadcount: 1450,
      totalAnnualPayrollUsd: 198500000,
      globalAverageCompaRatio: 98.4,
      redCircleEmployeeCount: 14,
      greenCircleEmployeeCount: 22,
      totalSalaryBandsConfigured: 48,
      averageRangeSpreadPercent: 50,
      salaryBands: [],
      sampleProfiles: []
    },
    equityDilutionOverview: {
      totalCommonSharesOutstanding: 100000000,
      totalUnvestedRestrictedShares: 4500000,
      totalOptionsOutstandingExercisable: 2300000,
      availableSharePoolRemaining: 3000000,
      currentDilutionOverhangPercent: 9.8,
      maxApprovedOverhangLimitPercent: 12.0,
      annualGrossBurnRatePercent: 1.85,
      annualNetBurnRatePercent: 1.55,
      threeYearAverageGrossBurnRatePercent: 1.9,
      burnRateComplianceStatus: 'compliant_defensible',
      executiveGrants: []
    },
    taxOverview: {
      currentIrc409aFmvPerShareUsd: 18.5,
      last409aValuationDate: '2026-03-31',
      daysUntil409aExpiry: 156,
      active83bFilingsCount: 38,
      pending83bDeadlineFilingsCount: 4,
      missed83bDeadlineCount: 0,
      totalIsoAmtPreferenceTrackedUsd: 1250000,
      crossBorderMobileEmployeesTracked: 18,
      taxProfiles: []
    },
    payEquityOverview: {
      overallEnterpriseUnadjustedGenderGapPercent: -5.8,
      overallEnterpriseControlledGenderGapPercent: -1.1,
      overallEnterpriseControlledEthnicityGapPercent: -0.7,
      totalRemediationBudgetRequiredUsd: 420000,
      totalRemediatedEmployeesCount: 31,
      cohortRegressions: [],
      statutoryAudits: []
    },
    recentMemos: []
  };

  const md = generateSecItem402CdaMemorandum({
    title: 'FY2026 Executive Compensation Review & SEC CD&A Strategy',
    fiscalYear: 'FY2026',
    overview: dummyOverview
  });
  assert.ok(md.includes('BOARD COMPENSATION COMMITTEE GOVERNANCE MEMORANDUM & SEC ITEM 402 CD&A'));
  assert.ok(md.includes('FY2026'));
  assert.ok(md.includes('Total Rewards Alignment Index (TRAI)'));
  assert.ok(md.includes('Chief Human Resources Officer (CHRO)'));
  assert.ok(md.includes('Chief Financial Officer (CFO)'));
  assert.ok(md.includes('Board Compensation Committee Chair'));
});

test('workforce-total-rewards: validators enforce boundaries and reject malformed payloads', () => {
  const badBand = validateSalaryBandGradeInput({});
  assert.equal(badBand.ok, false);

  const goodBand = validateSalaryBandGradeInput({
    levelCode: 'IC4',
    jobTitle: 'Senior Software Engineer',
    jobFamily: 'engineering',
    baseSalaryMin: 150000,
    baseSalaryMid: 180000,
    baseSalaryMax: 210000,
    geoDifferentialFactor: 1.0
  });
  assert.equal(goodBand.ok, true);

  const badSim = validateRelativeTsrSimulationInput({});
  assert.equal(badSim.ok, false);

  const goodSim = validateRelativeTsrSimulationInput({
    performancePeriodYears: 3,
    companyVolatility: 0.35,
    peerGroupMeanVolatility: 0.30,
    peerCorrelationFactor: 0.5,
    numPeers: 12,
    iterationsCount: 1000
  });
  assert.equal(goodSim.ok, true);

  const bad83b = validateSection83bArbitrageInput({});
  assert.equal(bad83b.ok, false);

  const good83b = validateSection83bArbitrageInput({
    sharesGranted: 50000,
    grantDateFmvUsd: 1.0,
    strikeOrPurchasePriceUsd: 0.1,
    projectedLiquiditySharePriceUsd: 25.0,
    ordinaryIncomeTaxRatePercent: 37.0,
    longTermCapitalGainsRatePercent: 20.0
  });
  assert.equal(good83b.ok, true);

  const badMemo = validateGenerateCdaBoardMemoInput({});
  assert.equal(badMemo.ok, false);

  const goodMemo = validateGenerateCdaBoardMemoInput({
    fiscalYear: 'FY2026',
    title: 'FY2026 Executive Total Rewards Review'
  });
  assert.equal(goodMemo.ok, true);

  const badSign = validateSignoffCdaBoardMemoInput({});
  assert.equal(badSign.ok, false);

  const goodSign = validateSignoffCdaBoardMemoInput({
    role: 'chief_human_resources_officer'
  });
  assert.equal(goodSign.ok, true);
});

test('corporate-treasury: calculateCashConversionCycle, calculateIntercompanyLoanInterest, and calculateNotionalPoolArbitrage', () => {
  const leanCcc = calculateCashConversionCycle(18, 38, 45);
  assert.equal(leanCcc.netCcc, 11);
  assert.equal(leanCcc.status, 'lean');

  const acceptableCcc = calculateCashConversionCycle(25, 45, 30);
  assert.equal(acceptableCcc.netCcc, 40);
  assert.equal(acceptableCcc.status, 'acceptable');

  const inefficientCcc = calculateCashConversionCycle(30, 60, 25);
  assert.equal(inefficientCcc.netCcc, 65);
  assert.equal(inefficientCcc.status, 'inefficient');

  const loanInterest = calculateIntercompanyLoanInterest(1000000, 5.0, 30, 10.0);
  assert.equal(loanInterest.grossInterestUsd, 4166.67);
  assert.equal(loanInterest.withholdingTaxUsd, 416.67);
  assert.equal(loanInterest.netInterestUsd, 3750);

  const arbitrage = calculateNotionalPoolArbitrage(20000000, 5000000, 3.5, 7.0, 4.5);
  assert.equal(arbitrage.standaloneNetEarnedUsd, 350000);
  assert.equal(arbitrage.pooledNetEarnedUsd, 675000);
  assert.equal(arbitrage.annualizedArbitrageUsd, 325000);
});

test('corporate-treasury: calculateParametricFxVaR95 and calculateHedgeEffectivenessRatio', () => {
  const varResult = calculateParametricFxVaR95(10000000, 0.008, 10);
  assert.ok(varResult.var1Day95Usd > 130000 && varResult.var1Day95Usd < 135000);
  assert.ok(varResult.var10Day99Usd > 580000 && varResult.var10Day99Usd < 600000);

  const effective = calculateHedgeEffectivenessRatio(98000, 100000);
  assert.equal(effective.dollarOffsetRatioPercent, 98);
  assert.equal(effective.isAsc815Compliant, true);

  const ineffective = calculateHedgeEffectivenessRatio(50000, 100000);
  assert.equal(ineffective.dollarOffsetRatioPercent, 50);
  assert.equal(ineffective.isAsc815Compliant, false);

  const zeroDelta = calculateHedgeEffectivenessRatio(0, 0);
  assert.equal(zeroDelta.dollarOffsetRatioPercent, 100);
  assert.equal(zeroDelta.isAsc815Compliant, true);
});

test('corporate-treasury: calculateImpliedDefaultProbability and simulateBankBailInHaircut', () => {
  const pd = calculateImpliedDefaultProbability(60, 0.40);
  assert.ok(pd > 0.9 && pd < 1.1);

  const mockBank: BankCounterpartyDTO = {
    id: 'bank-1',
    bankName: 'JPMorgan Chase & Co.',
    holdingGroup: 'JPMorgan Chase',
    jurisdiction: 'United States',
    spRating: 'AA_MINUS',
    moodysRating: 'AA',
    fitchRating: 'AA_MINUS',
    fiveYearCdsSpreadBps: 52,
    impliedDefaultProbabilityPercent: 0.86,
    baselLiquidityCoverageRatioPercent: 142,
    baselNetStableFundingRatioPercent: 126,
    tier1CommonEquityRatioPercent: 15.2,
    totalDepositsHeldUsd: 12500000,
    portfolioDepositorySharePercent: 25.8,
    boardApprovedExposureLimitUsd: 15000000,
    limitUtilizationPercent: 83.3,
    uninsuredDepositsUsd: 12250000,
    simulatedHaircutLossUsd: 0
  };

  const stressResult = simulateBankBailInHaircut(mockBank, 20);
  assert.equal(stressResult.stressedBankName, 'JPMorgan Chase & Co.');
  assert.equal(stressResult.uninsuredDepositsSubjectToHaircutUsd, 12250000);
  assert.equal(stressResult.projectedHaircutLossUsd, 2450000);
  assert.ok(stressResult.postStressAvailableLiquidityUsd > 10000000);
  assert.ok(stressResult.contingentFundingRecommendation.includes('CRITICAL'));
});

test('corporate-treasury: calculateCompositeTrlsScore evaluates score bands correctly', () => {
  const fortress = calculateCompositeTrlsScore({
    zbaSweepingEfficiency: 95,
    forecastAccuracyScore: 94,
    hedgeRatioPercent: 90,
    counterpartyConcentrationMax: 18,
    governanceSignoffRatio: 1.0
  });
  assert.ok(fortress.score >= 90);
  assert.equal(fortress.band, 'sovereign_fortress');

  const stable = calculateCompositeTrlsScore({
    zbaSweepingEfficiency: 82,
    forecastAccuracyScore: 84,
    hedgeRatioPercent: 80,
    counterpartyConcentrationMax: 22,
    governanceSignoffRatio: 0.66
  });
  assert.ok(stable.score >= 75 && stable.score < 90);

  const distressed = calculateCompositeTrlsScore({
    zbaSweepingEfficiency: 40,
    forecastAccuracyScore: 50,
    hedgeRatioPercent: 30,
    counterpartyConcentrationMax: 45,
    governanceSignoffRatio: 0.0
  });
  assert.ok(distressed.score < 65);
  assert.equal(distressed.band, 'critical_liquidity_alert');
});

test('corporate-treasury: generateTreasuryBoardMemorandumMarkdown produces structured report', () => {
  const mockOverview: CorporateTreasuryOverviewDTO = {
    studioId: 'studio-1',
    enterpriseName: 'JobTrack Enterprise Holdings',
    lastUpdated: '2026-10-25T10:00:00Z',
    compositeTrlsScore: 89.4,
    trlsBand: 'defensible_stability',
    cashConcentration: {
      totalGlobalLiquidityUsd: 48500000,
      pooledNetBalanceUsd: 32000000,
      physicalSweptTodayUsd: 6200000,
      annualizedPoolingYieldArbitrageUsd: 142500,
      activeZbaCount: 8,
      activeNotionalPoolCount: 2,
      accounts: [],
      entities: []
    },
    cashForecast: {
      forecastWeeksCount: 13,
      forecastAccuracyScorePercent: 95.8,
      minimumProjectedRunwayMonths: 11.2,
      minimumOperationalBufferUsd: 8500000,
      precautionaryReserveUsd: 12000000,
      totalExcessDeployableLiquidityUsd: 28000000,
      workingCapitalCycle: {
        daysSalesOutstanding: 38,
        daysInventoryOutstanding: 18,
        daysPayableOutstanding: 45,
        netCashConversionCycleDays: 11,
        targetCashConversionCycleDays: 15,
        capitalTiedUpInWorkingCapitalUsd: 4200000,
        potentialInterestReleaseUsd: 185000
      },
      weeklyForecasts: []
    },
    fxHedging: {
      totalNetExposureUsd: 18500000,
      totalHedgedNotionalUsd: 16000000,
      weightedHedgeRatioPercent: 86.5,
      portfolio1DayVaR95Usd: 124500,
      portfolio10DayVaR99Usd: 550000,
      unrealizedMtmGainLossUsd: 42500,
      exposures: [],
      contracts: []
    },
    counterpartyRisk: {
      weightedAverageRating: 'AA_MINUS',
      totalUninsuredDepositsUsd: 36000000,
      maxSingleBankExposurePercent: 19.5,
      limitBreachCount: 0,
      counterparties: []
    }
  };

  const md = generateTreasuryBoardMemorandumMarkdown(mockOverview, {
    fiscalQuarter: 'Q1-2026',
    title: 'Q1-2026 Corporate Treasury Risk Review',
    stressTestScenarioIncluded: true
  });

  assert.ok(md.includes('MEMO-TR-Q1-2026'));
  assert.ok(md.includes('89.4 / 100'));
  assert.ok(md.includes('DEFENSIBLE STABILITY'));
  assert.ok(md.includes('$48.50M USD'));
  assert.ok(md.includes('Pillar A'));
  assert.ok(md.includes('Pillar B'));
  assert.ok(md.includes('Pillar C'));
  assert.ok(md.includes('Pillar D'));
  assert.ok(md.includes('Pillar E'));
});

test('corporate-treasury: validators enforce boundaries and types accurately', () => {
  const badBank = validateBankAccountInput(null);
  assert.equal(badBank.ok, false);

  const goodBank = validateBankAccountInput({
    bankName: 'JPMorgan Chase',
    bankBicSwift: 'CHASUS33XXX',
    currency: 'USD',
    currentBalance: 15000000,
    targetBalanceFloor: 100000,
    targetBalanceCeiling: 5000000
  });
  assert.equal(goodBank.ok, true);

  const invertedBank = validateBankAccountInput({
    bankName: 'JPMorgan Chase',
    bankBicSwift: 'CHASUS33XXX',
    currency: 'USD',
    currentBalance: 15000000,
    targetBalanceFloor: 5000000,
    targetBalanceCeiling: 100000
  });
  assert.equal(invertedBank.ok, false);

  const badWc = validateWorkingCapitalSimulationInput({});
  assert.equal(badWc.ok, false);

  const goodWc = validateWorkingCapitalSimulationInput({
    adjustedDso: 35,
    adjustedDpo: 50
  });
  assert.equal(goodWc.ok, true);

  const badFx = validateFxSimulationInput({});
  assert.equal(badFx.ok, false);

  const goodFx = validateFxSimulationInput({
    currencyPair: 'EUR/USD',
    shockPercentage: 10,
    holdingPeriodDays: 10,
    confidenceInterval: 0.95,
    hedgingCoverageAdjustmentPercent: 85
  });
  assert.equal(goodFx.ok, true);

  const badBailIn = validateBailInStressInput({});
  assert.equal(badBailIn.ok, false);

  const goodBailIn = validateBailInStressInput({
    stressedBankId: 'bank-1',
    haircutLossPercentage: 25,
    sovereignSpreadShockBps: 150
  });
  assert.equal(goodBailIn.ok, true);

  const badMemo = validateGenerateTreasuryBoardMemoInput({});
  assert.equal(badMemo.ok, false);

  const goodMemo = validateGenerateTreasuryBoardMemoInput({
    fiscalQuarter: 'Q1-2026',
    title: 'Q1-2026 Executive Treasury Review',
    stressTestScenarioIncluded: true
  });
  assert.equal(goodMemo.ok, true);

  const badSign = validateSignoffTreasuryBoardMemoInput({});
  assert.equal(badSign.ok, false);

  const goodSign = validateSignoffTreasuryBoardMemoInput({
    role: 'corporate_treasurer',
    signerName: 'Alexandra Chen, CFA',
    comments: 'Certified'
  });
  assert.equal(goodSign.ok, true);
});

test('internal-audit: calculateResidualRisk scales risk properly with controls and penalties', () => {
  const unmitigated = calculateResidualRisk(4, 5, []);
  assert.equal(unmitigated.inherentScore, 20);
  assert.equal(unmitigated.residualScore, 20);
  assert.equal(unmitigated.appetiteZone, 'breached_appetite_red');
  assert.equal(unmitigated.aggregateMitigationFactor, 0);

  const mitigatedEffective = calculateResidualRisk(4, 5, [
    {
      testingStatus: 'operating_effectively',
      nature: 'preventive_automated',
      deficiencyClassification: 'none',
      mitigationEfficacyFactor: 0.9
    }
  ]);
  assert.equal(mitigatedEffective.inherentScore, 20);
  assert.ok(mitigatedEffective.residualScore < 10);
  assert.ok(mitigatedEffective.aggregateMitigationFactor > 0.6);

  const mitigatedWithMaterialWeakness = calculateResidualRisk(4, 5, [
    {
      testingStatus: 'operating_ineffective',
      nature: 'preventive_automated',
      deficiencyClassification: 'material_weakness',
      mitigationEfficacyFactor: 0.9
    }
  ]);
  assert.ok(mitigatedWithMaterialWeakness.residualScore > mitigatedEffective.residualScore);
});

test('internal-audit: calculateSodSeverityIndex and calculateDeficiencyImpactWeight evaluate bounds', () => {
  const sodUnmitigated = calculateSodSeverityIndex(
    'sod_conflict_detected',
    1.8,
    500000,
    0.8,
    false
  );
  assert.ok(sodUnmitigated >= 50);
  assert.ok(sodUnmitigated <= 100);

  const sodCompensated = calculateSodSeverityIndex(
    'sod_conflict_detected',
    1.8,
    500000,
    0.8,
    true
  );
  assert.ok(sodCompensated < sodUnmitigated);

  const bypassSeverity = calculateSodSeverityIndex(
    'change_management_bypass',
    2.0,
    1000000,
    1.0,
    false
  );
  assert.ok(bypassSeverity > sodCompensated);

  const defWeightClean = calculateDeficiencyImpactWeight(0, 0, 1, 10000, 250000);
  assert.equal(defWeightClean, 2.4);

  const defWeightSevere = calculateDeficiencyImpactWeight(2, 3, 4, 1500000, 250000);
  assert.ok(defWeightSevere >= 80);
});

test('internal-audit: calculateAuditRiskHealthScore computes composite ARHS and cliff penalties', () => {
  const healthy = calculateAuditRiskHealthScore({
    totalControls: 50,
    effectiveControls: 48,
    inProgressControls: 2,
    deficiencyImpactWeight: 2,
    materialWeaknessCount: 0,
    averageResidualRisk: 4.5,
    boardAppetiteBreachCount: 0,
    totalRisksCount: 20,
    activeSodViolationsCount: 0,
    accumulatedCcmSeveritySum: 20,
    unresolvedBypassesCount: 0,
    criticalOpenWhistleblowerCount: 0,
    highOpenWhistleblowerCount: 0,
    overdueRemediationsCount: 0
  });
  assert.ok(healthy.compositeScore >= 90);
  assert.equal(healthy.healthBand, 'sovereign_defensibility');
  assert.equal(healthy.materialWeaknessPenaltyApplied, 0);

  const withMaterialWeakness = calculateAuditRiskHealthScore({
    totalControls: 50,
    effectiveControls: 35,
    inProgressControls: 5,
    deficiencyImpactWeight: 35,
    materialWeaknessCount: 1,
    averageResidualRisk: 12.0,
    boardAppetiteBreachCount: 3,
    totalRisksCount: 20,
    activeSodViolationsCount: 2,
    accumulatedCcmSeveritySum: 150,
    unresolvedBypassesCount: 1,
    criticalOpenWhistleblowerCount: 1,
    highOpenWhistleblowerCount: 1,
    overdueRemediationsCount: 2
  });
  assert.ok(withMaterialWeakness.compositeScore <= 60);
  assert.equal(withMaterialWeakness.healthBand, 'critical_non_compliance');
  assert.equal(withMaterialWeakness.materialWeaknessPenaltyApplied, 30);
});

test('internal-audit: generateRiskHeatmapMatrix and generateSecItem9AMemoMarkdown format outputs correctly', () => {
  const mockRisks: EnterpriseRiskDTO[] = [
    {
      id: 'risk-1',
      userId: 'user-audit-1',
      riskCode: 'ERM-FIN-01',
      title: 'Revenue Cut-Off Acceleration Under ASC 606',
      category: 'financial_reporting',
      inherentLikelihood: 4,
      inherentImpact: 4,
      inherentScore: 16,
      residualLikelihood: 2,
      residualImpact: 2,
      residualScore: 4,
      boardAppetiteThreshold: 8,
      appetiteZone: 'within_appetite_green',
      responseStrategy: 'mitigate_controls',
      mappedControlCodes: ['BPC-REV-01'],
      maxPotentialFinancialLossUsd: 1200000,
      riskOwner: 'Corporate Controller',
      createdAt: '2026-10-25T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z'
    }
  ];

  const heatmap = generateRiskHeatmapMatrix(mockRisks);
  assert.equal(heatmap.cells.length, 25);
  assert.equal(heatmap.totalRisks, 1);
  assert.equal(heatmap.withinAppetiteCount, 1);

  const mockControls: SoxInternalControlDTO[] = [
    {
      id: 'ctrl-1',
      userId: 'user-audit-1',
      controlCode: 'ITGC-AC-01',
      title: 'Quarterly Privileged Access Re-certification',
      description: 'System administrators undergo mandatory quarterly access certification.',
      category: 'it_general_control',
      nature: 'preventive_automated',
      frequency: 'quarterly',
      cosoPrinciple: 'p11_general_controls_tech',
      primaryAssertion: 'rights_obligations',
      controlOwner: 'SecOps Lead',
      testingStatus: 'operating_effectively',
      deficiencyClassification: 'none',
      sampleSize: 25,
      exceptionsIdentified: 0,
      mitigationEfficacyFactor: 0.95,
      createdAt: '2026-10-25T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z'
    }
  ];

  const arhs = calculateAuditRiskHealthScore({
    totalControls: 1,
    effectiveControls: 1,
    inProgressControls: 0,
    deficiencyImpactWeight: 0,
    materialWeaknessCount: 0,
    averageResidualRisk: 4.0,
    boardAppetiteBreachCount: 0,
    totalRisksCount: 1,
    activeSodViolationsCount: 0,
    accumulatedCcmSeveritySum: 0,
    unresolvedBypassesCount: 0,
    criticalOpenWhistleblowerCount: 0,
    highOpenWhistleblowerCount: 0,
    overdueRemediationsCount: 0
  });

  const memo = generateSecItem9AMemoMarkdown({
    fiscalPeriod: 'Q4-2026',
    fiscalYear: 2026,
    auditorFirmName: 'PricewaterhouseCoopers LLP',
    managementEvaluationDate: '2026-10-25',
    arhs,
    controls: mockControls,
    risks: mockRisks,
    signOffs: [
      {
        role: 'head_of_internal_audit',
        signerName: 'Marcus Sterling, CIA',
        signerTitle: 'VP & Chief Audit Executive',
        attestationConfirmed: true,
        signedAt: '2026-10-25T09:00:00Z',
        signatureToken: 'sig-cia-mock-token-01',
        observationsSummary: 'All key controls verified.'
      }
    ],
    unresolvedMaterialWeaknesses: []
  });

  assert.ok(memo.includes('ITEM 9A. CONTROLS AND PROCEDURES'));
  assert.ok(memo.includes('PricewaterhouseCoopers LLP'));
  assert.ok(memo.includes('EFFECTIVE INTERNAL CONTROL OVER FINANCIAL REPORTING (ICFR)'));
  assert.ok(memo.includes('Marcus Sterling, CIA'));
});

test('internal-audit: validators enforce schema invariants and reject malformed payloads', () => {
  const badCtrl = validateSoxControlInput(null);
  assert.equal(badCtrl.ok, false);

  const goodCtrl = validateSoxControlInput({
    controlCode: 'BPC-FIN-01',
    title: 'Bank Reconciliation 3-Way Match',
    description: 'Automated matching of bank statement lines against ERP ledger.',
    category: 'business_process',
    nature: 'detective_automated',
    frequency: 'daily',
    cosoPrinciple: 'p10_select_control_activities',
    primaryAssertion: 'existence_occurrence',
    controlOwner: 'Assistant Controller',
    testingStatus: 'operating_effectively',
    deficiencyClassification: 'none',
    sampleSize: 30,
    exceptionsIdentified: 0,
    mitigationEfficacyFactor: 0.92
  });
  assert.equal(goodCtrl.ok, true);

  const badRisk = validateEnterpriseRiskInput({});
  assert.equal(badRisk.ok, false);

  const goodRisk = validateEnterpriseRiskInput({
    riskCode: 'ERM-CYB-01',
    title: 'Multi-Tenant Data Spill Vulnerability',
    category: 'cybersecurity_information',
    inherentLikelihood: 3,
    inherentImpact: 4,
    boardAppetiteThreshold: 10,
    responseStrategy: 'mitigate_controls',
    mappedControlCodes: ['ITGC-AC-01'],
    maxPotentialFinancialLossUsd: 2500000,
    riskOwner: 'VP Security Architecture'
  });
  assert.equal(goodRisk.ok, true);

  const badCcm = validateCcmEventInput({});
  assert.equal(badCcm.ok, false);

  const goodCcm = validateCcmEventInput({
    eventCode: 'CCM-SOD-001',
    eventType: 'sod_conflict_detected',
    severity: 'high',
    actorId: 'usr-dev-9',
    actorEmail: 'engineer@jobtrack.internal',
    resourceTarget: 'prod-migration-pipeline',
    privilegeDistance: 0.85,
    exposureVolumeUsd: 450000,
    compensatingControlActive: false,
    evidencePayload: { commitSha: 'a1b2c3d', branch: 'main' }
  });
  assert.equal(goodCcm.ok, true);

  const badWbh = validateWhistleblowerReportInput({});
  assert.equal(badWbh.ok, false);

  const goodWbh = validateWhistleblowerReportInput({
    category: 'accounting_fraud',
    allegationSummary: 'Premature revenue recognition observed in enterprise renewals.',
    detailedNarrative: 'Contract signatures backdated prior to end of Q3 to artificially inflate ARR metrics before quarterly board audit review.',
    involvedPersonsMasked: ['Sales VP', 'Deal Desk Lead'],
    estimatedFinancialExposureUsd: 350000,
    evidenceAttachmentsCount: 2
  });
  assert.equal(goodWbh.ok, true);

  const badCapa = validateRemediationPlanInput({});
  assert.equal(badCapa.ok, false);

  const goodCapa = validateRemediationPlanInput({
    capaCode: 'CAPA-2026-001',
    title: 'Enforce Dual-Custodian Sign-Off on Master Ledger Journal Entries',
    description: 'Implement mandatory dual authorization in ERP for journal entries exceeding $50k.',
    sourceType: 'sox_deficiency',
    sourceReferenceId: 'ctrl-1',
    actionOwner: 'Chief Accounting Officer',
    targetRemediationDate: '2026-11-15',
    compensatingControlsInPlace: 'Weekly retrospective manual review by Controller'
  });
  assert.equal(goodCapa.ok, true);

  const badSign = validateTripartiteSignOffInput({});
  assert.equal(badSign.ok, false);

  const goodSign = validateTripartiteSignOffInput({
    role: 'board_audit_committee_chair',
    signerName: 'Senator Evelyn Vance',
    signerTitle: 'Audit Committee Chair',
    attestationConfirmed: true,
    signedAt: '2026-10-25T11:00:00Z',
    signatureToken: 'sig-board-chair-verified-token',
    observationsSummary: 'Ratified following independent executive session.'
  });
  assert.equal(goodSign.ok, true);
});

test('contract: calculatePQDI calculates patent quality and defensibility deterministically', () => {
  const highQuality = calculatePQDI({
    independentClaimsCount: 4,
    totalClaimsCount: 22,
    forwardCitationsCount: 25,
    benchmarkForwardCitations: 12,
    officeActionsCount: 1,
    rceFilingsCount: 0,
    statutoryExtensionsCount: 0,
    foreignFamilyCount: 5
  });
  assert.ok(highQuality > 80);
  assert.ok(highQuality <= 100);

  const lowQuality = calculatePQDI({
    independentClaimsCount: 1,
    totalClaimsCount: 3,
    forwardCitationsCount: 0,
    benchmarkForwardCitations: 12,
    officeActionsCount: 5,
    rceFilingsCount: 3,
    statutoryExtensionsCount: 4,
    foreignFamilyCount: 0
  });
  assert.ok(lowQuality < 45);
  assert.ok(lowQuality >= 0);
});

test('contract: calculateCRDI computes commercial contract risk deviation score', () => {
  const standardLowRisk = calculateCRDI({
    liabilityCapType: 'STANDARD_1X_ACV',
    hasUncappedIndemnity: false,
    governingLaw: 'DELAWARE_US',
    disputeForum: 'DELAWARE_CHANCERY_COURT',
    hasMfnClause: false,
    hasExclusivityOrNonCompete: false,
    autoRenewalNoticeDays: 60,
    terminationForConvenienceNoticeDays: 30
  });
  assert.equal(standardLowRisk, 5);

  const highRiskUncapped = calculateCRDI({
    liabilityCapType: 'UNCAPPED_EXPOSURE',
    hasUncappedIndemnity: true,
    governingLaw: 'NON_STANDARD_FOREIGN',
    disputeForum: 'ICC_INTERNATIONAL_COURT',
    hasMfnClause: true,
    hasExclusivityOrNonCompete: true,
    autoRenewalNoticeDays: 15,
    terminationForConvenienceNoticeDays: 0
  });
  assert.ok(highRiskUncapped >= 80);
});

test('contract: assessASC450Contingency properly categorizes Probable, Reasonably Possible, and Remote reserves', () => {
  const probableResult = assessASC450Contingency({
    probabilityPercent: 85,
    estimatedLossMinUsd: 1000000,
    estimatedLossMaxUsd: 4000000,
    singlePointEstimateUsd: 1500000
  });
  assert.equal(probableResult.classification, 'PROBABLE');
  assert.equal(probableResult.accruedAmountUsd, 1500000);
  assert.equal(probableResult.isBalanceSheetAccrualRequired, true);
  assert.equal(probableResult.isFootnoteDisclosureRequired, true);

  const reasonPossible = assessASC450Contingency({
    probabilityPercent: 50,
    estimatedLossMinUsd: 500000,
    estimatedLossMaxUsd: 2500000
  });
  assert.equal(reasonPossible.classification, 'REASONABLY_POSSIBLE');
  assert.equal(reasonPossible.accruedAmountUsd, 0);
  assert.equal(reasonPossible.isBalanceSheetAccrualRequired, false);
  assert.equal(reasonPossible.isFootnoteDisclosureRequired, true);

  const remoteResult = assessASC450Contingency({
    probabilityPercent: 10,
    estimatedLossMinUsd: 200000,
    estimatedLossMaxUsd: 800000
  });
  assert.equal(remoteResult.classification, 'REMOTE');
  assert.equal(remoteResult.accruedAmountUsd, 0);
  assert.equal(remoteResult.isBalanceSheetAccrualRequired, false);
  assert.equal(remoteResult.isFootnoteDisclosureRequired, false);
});

test('contract: calculateLRCI computes composite legal risk index and handles litigation cliff', () => {
  const lowRisk = calculateLRCI({
    subsidiaryComplianceScore: 98,
    averagePqdiScore: 90,
    averageCrdiScore: 10,
    activeMattersCount: 1,
    probableAccruedLossUsd: 0,
    reasonablyPossibleLossMaxUsd: 500000,
    outsideCounselBudgetVariancePercent: 5,
    materialityThresholdUsd: 10000000
  });
  assert.ok(lowRisk.compositeScore < 25);
  assert.equal(lowRisk.riskBand, 'SOVEREIGN_FORTRESS');
  assert.equal(lowRisk.litigationCliffPenalty, 0);

  const cliffRisk = calculateLRCI({
    subsidiaryComplianceScore: 80,
    averagePqdiScore: 70,
    averageCrdiScore: 35,
    activeMattersCount: 6,
    probableAccruedLossUsd: 15000000,
    reasonablyPossibleLossMaxUsd: 25000000,
    outsideCounselBudgetVariancePercent: 45,
    materialityThresholdUsd: 10000000
  });
  assert.ok(cliffRisk.compositeScore > 50);
  assert.ok(cliffRisk.litigationCliffPenalty >= 25);
});

test('contract: generateSecItem103Disclosure generates compliant disclosure text', () => {
  const text = generateSecItem103Disclosure({
    registrantName: 'JobTrack Technologies Inc.',
    fiscalYear: 2026,
    reportingQuarter: 'Q3',
    activeMatters: [
      {
        id: 'lit-1',
        userId: 'u1',
        entityId: 'e1',
        caseCaption: 'Alpha v. JobTrack',
        docketNumber: '1:26-cv-00123',
        tribunal: 'US_FEDERAL_DISTRICT_COURT',
        filingDate: '2026-02-10',
        leadOutsideCounselFirm: 'Cravath',
        opposingParty: 'Alpha Corp',
        claimsSummary: 'Patent infringement assertion.',
        reliefClaimedAmountUsd: 8000000,
        asc450Classification: 'PROBABLE',
        accruedReserveAmountUsd: 2000000,
        estimatedLossRangeMinUsd: 2000000,
        estimatedLossRangeMaxUsd: 5000000,
        matterStatus: 'ACTIVE',
        legalHolds: [],
        outsideCounselInvoices: []
      }
    ],
    totalProbableReserveUsd: 2000000,
    totalReasonablyPossibleMaxUsd: 5000000
  });

  assert.ok(text.includes('REGISTRANT: JOBTRACK TECHNOLOGIES INC.'));
  assert.ok(text.includes('ITEM 103. LEGAL PROCEEDINGS'));
  assert.ok(text.includes('Alpha v. JobTrack'));
  assert.ok(text.includes('Accrued Contingent Reserve: $2,000,000 USD'));
});

test('contract: legal operations validators validate correct and reject invalid schemas', () => {
  const badEntity = validateLegalEntityInput({});
  assert.equal(badEntity.isValid, false);
  const goodEntity = validateLegalEntityInput({
    legalName: 'JobTrack UK Limited',
    jurisdiction: 'UNITED_KINGDOM',
    entityType: 'PRIVATE_LIMITED_COMPANY',
    registrationNumber: 'UK-992100'
  });
  assert.equal(goodEntity.isValid, true);

  const badContract = validateMaterialContractInput({});
  assert.equal(badContract.isValid, false);
  const goodContract = validateMaterialContractInput({
    title: 'Enterprise MSA',
    counterpartyLegalName: 'Acme Corp',
    annualContractValue: 500000,
    liabilityCapType: 'STANDARD_1X_ACV'
  });
  assert.equal(goodContract.isValid, true);

  const badMatter = validateLitigationMatterInput({});
  assert.equal(badMatter.isValid, false);
  const goodMatter = validateLitigationMatterInput({
    caseCaption: 'Corp A v. Corp B',
    docketNumber: '25-cv-100',
    opposingParty: 'Corp A',
    asc450Classification: 'REASONABLY_POSSIBLE'
  });
  assert.equal(goodMatter.isValid, true);

  const badHold = validateLegalHoldInput({});
  assert.equal(badHold.isValid, false);
  const goodHold = validateLegalHoldInput({
    matterId: 'mat-1',
    holdTitle: 'Patent Litigation Hold',
    scopeDescription: 'Preserve all communications and code.'
  });
  assert.equal(goodHold.isValid, true);

  const badSignoff = validateBoardSignoffInput({});
  assert.equal(badSignoff.isValid, false);
  const goodSignoff = validateBoardSignoffInput({
    memoId: 'memo-1',
    role: 'general_counsel_corporate_secretary',
    signerName: 'Victoria Sterling'
  });
  assert.equal(goodSignoff.isValid, true);
});

test('contract: investor relations nexus algorithms compute exact financial indices', () => {
  const avisLow = calculateAVIS({
    tsrUnderperformancePercent: 5.0,
    valuationDiscountPercent: 8.0,
    governanceDefenseScore: 85.0,
    freeCashFlowMarginGap: 2.0,
    activistOwnershipPercent: 1.5
  });
  assert.equal(avisLow.riskLevel, 'fortified_low');
  assert.ok(avisLow.score >= 0 && avisLow.score < 30.0);

  const avisHigh = calculateAVIS({
    tsrUnderperformancePercent: 45.0,
    valuationDiscountPercent: 40.0,
    governanceDefenseScore: 20.0,
    freeCashFlowMarginGap: 18.0,
    activistOwnershipPercent: 12.0
  });
  assert.equal(avisHigh.riskLevel, 'critical_activist_target');
  assert.ok(avisHigh.score >= 75.0);

  const wacc = calculateWACC(11.5, 6.0, 21.0, 4000000000, 1000000000);
  assert.ok(wacc > 0);
  assert.equal(wacc, 10.15);

  const epsScenario = calculateEPSAccretionDilution({
    standaloneNetIncomeUsd: 150000000,
    standaloneSharesCount: 75000000,
    standaloneEps: 2.00,
    financingType: 'convertible_senior_notes',
    incrementalSharesCount: 2000000,
    incrementalAnnualInterestUsd: 3000000,
    marginalTaxRatePercent: 21.0
  });
  assert.ok(epsScenario.proFormaEpsUsd > 0);
  assert.equal(epsScenario.isAccretive, false);

  const rule10b18 = calculateRule10b18DailyLimit(800000, false);
  assert.equal(rule10b18.standardDailyLimitShares, 200000);
  assert.equal(rule10b18.effectiveLimitShares, 200000);

  const rule10b18Block = calculateRule10b18DailyLimit(800000, true);
  assert.equal(rule10b18Block.effectiveLimitShares, 1000000);

  const isi = calculateISI({
    analystRevisionsScore: 88.0,
    avisScore: 22.0,
    ndrFeedbackScore: 85.0,
    institutionalInflowOutflowScore: 80.0,
    consensusDispersionScore: 90.0
  });
  assert.equal(isi.band, 'strong_institutional_conviction');
  assert.ok(isi.score >= 80.0);
});

test('contract: generateSecForm8KDisclosure produces statutory SEC text', () => {
  const dummyOverview = {
    companyName: 'JobTrack Enterprise Technologies Inc.',
    tickerSymbol: 'JBTR'
  } as unknown as InvestorRelationsOverviewDTO;

  const request: GenerateForm8KRequestDTO = {
    fiscalQuarter: 'Q3-2026',
    filingTitle: 'Current Report under Item 2.02 and Item 7.01',
    includeItem202: true,
    includeItem701: true
  };

  const disclosure = generateSecForm8KDisclosure(dummyOverview, request);
  assert.ok(disclosure.includes('FORM 8-K'));
  assert.ok(disclosure.includes('JBTR'));
  assert.ok(disclosure.includes('Item 2.02 Results of Operations and Financial Condition'));
  assert.ok(disclosure.includes('Item 7.01 Regulation FD Disclosure'));
  assert.ok(disclosure.includes('VP of Investor Relations'));
  assert.ok(disclosure.includes('Chief Financial Officer'));
  assert.ok(disclosure.includes('Chief Executive Officer'));
});

test('contract: investor relations nexus validators enforce correct schemas and reject invalid payloads', () => {
  const badShareholder = validateIrShareholderInput({});
  assert.equal(badShareholder.ok, false);
  const goodShareholder = validateIrShareholderInput({
    institutionName: 'Vanguard Group Inc.',
    sharesHeld: 6200000,
    percentOwnership: 8.27
  });
  assert.equal(goodShareholder.ok, true);

  const badConsensus = validateIrConsensusGuidanceInput({});
  assert.equal(badConsensus.ok, false);
  const goodConsensus = validateIrConsensusGuidanceInput({
    metricName: 'GAAP Revenue',
    consensusMean: 125.4,
    analystCount: 14
  });
  assert.equal(goodConsensus.ok, true);

  const badMeeting = validateIrNdrMeetingInput({});
  assert.equal(badMeeting.ok, false);
  const goodMeeting = validateIrNdrMeetingInput({
    institutionName: 'Capital Group',
    meetingDate: '2026-10-25',
    sentimentScore: 0.85
  });
  assert.equal(goodMeeting.ok, true);

  const badFinancing = validateIrCapitalFinancingInput({});
  assert.equal(badFinancing.ok, false);
  const goodFinancing = validateIrCapitalFinancingInput({
    scenarioName: 'Series Convertible 2031',
    grossAmountUsd: 250000000,
    stockPriceUsd: 64.50
  });
  assert.equal(goodFinancing.ok, true);

  const badSignoff = validateIrForm8KSignoffInput({});
  assert.equal(badSignoff.ok, false);
  const goodSignoff = validateIrForm8KSignoffInput({
    role: 'vp_investor_relations',
    signerName: 'Alexander Vance',
    verificationNotes: 'Audited consensus models and Reg G reconciliations.'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: corp-dev-pmi-nexus algorithms compute exact valuation and risk scores', () => {
  const sfsClean = calculateStrategicFitScore({
    commercialFitScore: 90.0,
    technicalFitScore: 85.0,
    financialFitScore: 80.0,
    culturalFitScore: 75.0,
    moatFitScore: 85.0,
    findings: []
  });
  assert.equal(sfsClean.riskPenalty, 0);
  assert.ok(sfsClean.sfs >= 80 && sfsClean.sfs <= 100);

  const sfsCritical = calculateStrategicFitScore({
    commercialFitScore: 90.0,
    technicalFitScore: 85.0,
    financialFitScore: 80.0,
    culturalFitScore: 75.0,
    moatFitScore: 85.0,
    findings: [
      { severity: 'critical_deal_killer', isResolved: false },
      { severity: 'critical_deal_killer', isResolved: false }
    ]
  });
  assert.ok(sfsCritical.sfs <= 40);

  const dcf = calculateDcfValuation({
    projectedUfcf: [15000000, 18000000, 22000000, 26000000, 30000000],
    waccPercent: 9.5,
    terminalGrowthRatePercent: 2.5,
    terminalEbitdaMultiple: 12.0,
    terminalYearEbitdaUsd: 38000000,
    netDebtUsd: 25000000,
    sharesOutstanding: 10000000
  });
  assert.ok(dcf.enterpriseValueGordonUsd > 0);
  assert.ok(dcf.enterpriseValueMultipleUsd > 0);
  assert.ok(dcf.impliedEquityValueUsd > 0);
  assert.ok(dcf.impliedSharePriceUsd > 0);

  const lbo = calculateLboReturns({
    entryEbitdaUsd: 30000000,
    entryEbitdaMultiple: 10.0,
    seniorDebtMultiple: 4.0,
    subordinatedDebtMultiple: 1.5,
    exitYear: 5,
    exitEbitdaMultiple: 11.0,
    projectedExitEbitdaUsd: 50000000,
    debtPaydownDuringHoldUsd: 65000000
  });
  assert.ok(lbo.sponsorMoic > 1.0);
  assert.ok(lbo.sponsorIrrPercent > 0);

  const syn = calculateSynergyNpv({
    annualRunRateCostSynergyUsd: 12000000,
    annualRunRateRevenueSynergyUsd: 20000000,
    contributionMarginPercent: 75.0,
    oneTimeCostToAchieveUsd: 8000000,
    waccPercent: 9.5,
    terminalGrowthRatePercent: 2.5
  });
  assert.ok(syn.synergyNpvUsd > 0);
  assert.equal(syn.annualNetSynergies.length, 4);

  const ppa = calculateAsc805PurchasePriceAllocation({
    purchasePriceUsd: 350000000,
    netTangibleAssetsFairValueUsd: 60000000,
    developedTechnologyFairValueUsd: 85000000,
    customerRelationshipsFairValueUsd: 45000000,
    trademarksFairValueUsd: 15000000,
    effectiveTaxRatePercent: 21.0
  });
  assert.equal(ppa.identifiableIntangiblesUsd, 145000000);
  assert.equal(ppa.deferredTaxLiabilityUsd, 30450000);
  assert.ok(ppa.calculatedGoodwillUsd > 0);

  const collarFloating = calculateFloatingCollarExchangeRatio({
    fixedTargetValueUsd: 50.0,
    collarLowerLimitUsd: 90.0,
    collarUpperLimitUsd: 110.0,
    currentBuyerStockPriceUsd: 100.0
  });
  assert.equal(collarFloating.collarStatus, 'floating');
  assert.equal(collarFloating.exchangeRatio, 0.5);

  const collarCeiling = calculateFloatingCollarExchangeRatio({
    fixedTargetValueUsd: 50.0,
    collarLowerLimitUsd: 90.0,
    collarUpperLimitUsd: 110.0,
    currentBuyerStockPriceUsd: 80.0
  });
  assert.equal(collarCeiling.collarStatus, 'ceiling');

  const collarFloor = calculateFloatingCollarExchangeRatio({
    fixedTargetValueUsd: 50.0,
    collarLowerLimitUsd: 90.0,
    collarUpperLimitUsd: 110.0,
    currentBuyerStockPriceUsd: 125.0
  });
  assert.equal(collarFloor.collarStatus, 'floor');

  const antitrust = calculateAntitrustSecondRequestRisk({
    buyerMarketSharePercent: 22.0,
    targetMarketSharePercent: 12.0,
    industryTotalHhiPreMerger: 2100,
    competitorProtestsPresent: true
  });
  assert.equal(antitrust.deltaHhi, 528);
  assert.equal(antitrust.postMergerHhi, 2628);
  assert.ok(antitrust.secondRequestRiskScore >= 60.0);

  const dspiHigh = calculateDspiScore({
    diligenceHealthScore: 88.0,
    financingCertaintyScore: 92.0,
    antitrustClearanceScore: 85.0,
    boardAlignmentScore: 90.0,
    pmiReadinessScore: 82.0,
    hasHostilePoisonPill: false,
    hasCriticalFraudOrAccountingMisstatement: false,
    hasFinancingWithdrawal: false
  });
  assert.equal(dspiHigh.band, 'HIGH_TRANSACTION_CERTAINTY');
  assert.ok(dspiHigh.dspi >= 80.0);

  const dspiKiller = calculateDspiScore({
    diligenceHealthScore: 88.0,
    financingCertaintyScore: 92.0,
    antitrustClearanceScore: 85.0,
    boardAlignmentScore: 90.0,
    pmiReadinessScore: 82.0,
    hasHostilePoisonPill: true,
    hasCriticalFraudOrAccountingMisstatement: false,
    hasFinancingWithdrawal: false
  });
  assert.equal(dspiKiller.band, 'ELEVATED_CLOSING_RISK');
  assert.ok(dspiKiller.dspi < 65.0);
});

test('contract: generateForm8KDisclosures produces compliant Item 1.01 and 2.01 reports', () => {
  const disclosure = generateForm8KDisclosures({
    targetName: 'Apex Cloud Solutions Inc.',
    codeName: 'Project Apex',
    totalConsiderationUsd: 485000000,
    cashPercent: 65,
    stockPercent: 35,
    buyerTerminationFeeUsd: 19400000,
    targetBreakFeeUsd: 14550000,
    regulatoryCovenant: 'reasonable_best_efforts',
    filingDate: '2026-10-25'
  });

  assert.ok(disclosure.item101.includes('FORM 8-K'));
  assert.ok(disclosure.item101.includes('Item 1.01 Entry into a Material Definitive Agreement'));
  assert.ok(disclosure.item101.includes('Apex Cloud Solutions Inc.'));
  assert.ok(disclosure.item101.includes('Project Apex'));
  assert.ok(disclosure.item101.includes('$485.00 million'));

  assert.ok(disclosure.item201.includes('FORM 8-K'));
  assert.ok(disclosure.item201.includes('Item 2.01 Completion of Acquisition or Disposition of Assets'));
  assert.ok(disclosure.item201.includes('ASC Topic 805'));
});

test('contract: corp-dev-pmi-nexus validators enforce schemas and reject invalid payloads', () => {
  const badTarget = validateCorpDevTargetInput({});
  assert.equal(badTarget.ok, false);
  const goodTarget = validateCorpDevTargetInput({
    targetName: 'Apex Cloud Solutions Inc.',
    codeName: 'Project Apex',
    annualRevenueUsd: 65000000,
    targetEnterpriseValueUsd: 485000000
  });
  assert.equal(goodTarget.ok, true);

  const badFinding = validateVdrFindingInput({});
  assert.equal(badFinding.ok, false);
  const goodFinding = validateVdrFindingInput({
    targetId: 'target-uuid-1',
    title: 'Customer concentration risk in top 3 accounts',
    severity: 'high'
  });
  assert.equal(goodFinding.ok, true);

  const badDcf = validateDcfSimulationInput({});
  assert.equal(badDcf.ok, false);
  const goodDcf = validateDcfSimulationInput({
    projectedUfcf: [10000000, 15000000],
    waccPercent: 9.5,
    terminalGrowthRatePercent: 2.5
  });
  assert.equal(goodDcf.ok, true);

  const badLbo = validateLboSimulationInput({});
  assert.equal(badLbo.ok, false);
  const goodLbo = validateLboSimulationInput({
    entryEbitdaUsd: 25000000,
    entryEbitdaMultiple: 10.0,
    exitYear: 5
  });
  assert.equal(goodLbo.ok, true);

  const badSynergy = validateSynergiesSimulationInput({});
  assert.equal(badSynergy.ok, false);
  const goodSynergy = validateSynergiesSimulationInput({
    annualRunRateCostSynergyUsd: 10000000,
    waccPercent: 9.0
  });
  assert.equal(goodSynergy.ok, true);

  const badCollar = validateCollarSimulationInput({});
  assert.equal(badCollar.ok, false);
  const goodCollar = validateCollarSimulationInput({
    fixedTargetValueUsd: 50.0,
    collarLowerLimitUsd: 90.0,
    collarUpperLimitUsd: 110.0
  });
  assert.equal(goodCollar.ok, true);

  const badAntitrust = validateAntitrustAssessmentInput({});
  assert.equal(badAntitrust.ok, false);
  const goodAntitrust = validateAntitrustAssessmentInput({
    buyerMarketSharePercent: 25.0,
    targetMarketSharePercent: 10.0
  });
  assert.equal(goodAntitrust.ok, true);

  const badRetention = validateTalentRetentionInput({});
  assert.equal(badRetention.ok, false);
  const goodRetention = validateTalentRetentionInput({
    targetId: 'target-uuid-1',
    employeeName: 'Dr. Sarah Connor',
    annualCompensationUsd: 320000
  });
  assert.equal(goodRetention.ok, true);

  const badSignoff = validateCorpDevSignoffInput({});
  assert.equal(badSignoff.ok, false);
  const goodSignoff = validateCorpDevSignoffInput({
    role: 'vp_corporate_development',
    signerName: 'Marcus Holloway'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: global-trade-sanctions-nexus Levenshtein, Jaro-Winkler, and Phonetic algorithms calculate deterministic scores', () => {
  const levExact = computeLevenshteinDistance('Huawei Technologies', 'Huawei Technologies');
  assert.equal(levExact, 0);

  const levClose = computeLevenshteinDistance('Huawei Technologies', 'Huawei Technology');
  assert.equal(levClose, 3);

  const jwMatch = computeJaroWinklerSimilarity('Vnesheconombank', 'Vnesheconombank RF');
  assert.ok(jwMatch > 0.85);

  const jwMismatch = computeJaroWinklerSimilarity('Apple', 'Banana');
  assert.ok(jwMismatch < 0.5);

  const phone1 = computeSimplePhoneticHash('Smith');
  const phone2 = computeSimplePhoneticHash('Smyth');
  assert.equal(phone1, phone2);

  const composite = computeSanctionsCompositeScore('Rostec', 'Rostec State Corp');
  assert.ok(composite.compositeScore >= 0.70);
  assert.ok(composite.scoreLevenshtein > 0);
  assert.ok(composite.scoreJaroWinkler > 0);
});

test('contract: global-trade-sanctions-nexus OFAC 50% Rule recursive graph traversal aggregates ownership fractions', () => {
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
  assert.equal(result.aggregateBlockedPercentage, 55);
  assert.equal(result.isBlockedByLaw, true);

  const clearTree: BeneficialOwnerNodeDTO = {
    id: 'root-2',
    name: 'Holding Beta',
    country: 'SG',
    isDirectlySanctioned: false,
    ownershipPercentage: 100,
    votingRightsPercentage: 100,
    children: [
      {
        id: 'child-3',
        name: 'Minority Blocked Shareholder',
        country: 'RU',
        isDirectlySanctioned: true,
        ownershipPercentage: 20,
        votingRightsPercentage: 20,
        children: []
      }
    ]
  };

  const clearResult = evaluateOfacFiftyPercentRule(clearTree);
  assert.equal(clearResult.aggregateBlockedPercentage, 20);
  assert.equal(clearResult.isBlockedByLaw, false);
});

test('contract: global-trade-sanctions-nexus Secondary Sanctions Exposure Index (SSEI) calculates multi-factor risks', () => {
  const highRisk = computeSecondarySanctionsExposureIndex(90, 0.55, 100, 50);
  assert.ok(highRisk >= 75);

  const lowRisk = computeSecondarySanctionsExposureIndex(10, 0.0, 10, 10);
  assert.ok(lowRisk <= 20);
});

test('contract: global-trade-sanctions-nexus ECCN Category 5 Part 2 classification evaluates encryption and mass market', () => {
  const controlled = evaluateEccnEncryptionClassification({
    isSoftware: true,
    symmetricBits: 256,
    asymmetricBits: 2048,
    ellipticBits: 256,
    isMassMarket: false,
    destinationCountry: 'DE'
  });
  assert.equal(controlled.assignedEccn, '5D002.a.1');
  assert.equal(controlled.encryptionLevel, 'controlled_high_assurance_5a002');
  assert.equal(controlled.exception, 'enc_740_17_b1');
  assert.equal(controlled.requiresReporting, true);
  assert.equal(controlled.requiresLicense, false);

  const massMarket = evaluateEccnEncryptionClassification({
    isSoftware: true,
    symmetricBits: 256,
    asymmetricBits: 2048,
    ellipticBits: 256,
    isMassMarket: true,
    destinationCountry: 'DE'
  });
  assert.equal(massMarket.assignedEccn, '5D992.c');
  assert.equal(massMarket.encryptionLevel, 'mass_market_eligible_5a992_note3');
  assert.equal(massMarket.requiresReporting, false);

  const standardCommercial = evaluateEccnEncryptionClassification({
    isSoftware: false,
    symmetricBits: 0,
    asymmetricBits: 0,
    ellipticBits: 0,
    isMassMarket: false,
    destinationCountry: 'FR'
  });
  assert.equal(standardCommercial.assignedEccn, 'EAR99');
  assert.equal(standardCommercial.encryptionLevel, 'non_cryptographic');

  const embargoed = evaluateEccnEncryptionClassification({
    isSoftware: true,
    symmetricBits: 256,
    asymmetricBits: 2048,
    ellipticBits: 256,
    isMassMarket: false,
    destinationCountry: 'RU'
  });
  assert.equal(embargoed.requiresLicense, true);
});

test('contract: global-trade-sanctions-nexus Deemed Export exposure calculates country group and scope weights', () => {
  const usCitizen = computeDeemedExportExposure({
    isUsPerson: true,
    countryGroup: 'group_d_1_national_security',
    controlledEccn: '5D002.a.1',
    scope: 'source_code_read'
  });
  assert.equal(usCitizen.score, 0);
  assert.equal(usCitizen.requiresLicense, false);

  const foreignNational = computeDeemedExportExposure({
    isUsPerson: false,
    countryGroup: 'group_d_1_national_security',
    controlledEccn: '5D002.a.1',
    scope: 'source_code_read'
  });
  assert.ok(foreignNational.score >= 60);
  assert.equal(foreignNational.requiresLicense, true);
});

test('contract: global-trade-sanctions-nexus CFIUS TID assessment triggers sensitive personal data and mandatory filings', () => {
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
  assert.equal(mandatoryDeal.sensitiveThresholdExceeded, true);
  assert.equal(mandatoryDeal.tidStatus, 'sensitive_personal_data_d');
  assert.equal(mandatoryDeal.isMandatoryFiling, true);
  assert.equal(mandatoryDeal.filingType, 'mandatory_declaration_part_800');

  const clearDeal = evaluateCfiusTidObligations({
    criticalTech: false,
    criticalInfra: false,
    personalDataCount: 50000,
    militaryTargets: false,
    foreignGovVotingPct: 0,
    foreignAcquisitionPct: 20,
    hasBoardSeat: false,
    hasMaterialNonpublicAccess: false
  });
  assert.equal(clearDeal.tidStatus, 'non_tid_unrestricted');
  assert.equal(clearDeal.isMandatoryFiling, false);
});

test('contract: global-trade-sanctions-nexus customs duty stack and Free Trade Agreement RVC calculations', () => {
  const usmcaQualified = computeCustomsDutyAndRvc({
    customsValueUsd: 100000,
    mfnRatePct: 3.0,
    section301RatePct: 25.0,
    section232RatePct: 0.0,
    totalTransactionValueUsd: 120000,
    netCostUsd: 90000,
    valueNonOriginatingMaterialsUsd: 36000,
    ftaCode: 'usmca'
  });
  assert.equal(usmcaQualified.rvcTransactionValuePct, 70);
  assert.equal(usmcaQualified.isFtaQualified, true);
  assert.equal(usmcaQualified.ftaSavingsUsd, 3000);
  assert.equal(usmcaQualified.section301Usd, 25000);
  assert.equal(usmcaQualified.totalDutyPayableUsd, 25000);

  const nonFta = computeCustomsDutyAndRvc({
    customsValueUsd: 50000,
    mfnRatePct: 4.0,
    section301RatePct: 0.0,
    section232RatePct: 0.0,
    totalTransactionValueUsd: 50000,
    netCostUsd: 40000,
    valueNonOriginatingMaterialsUsd: 30000,
    ftaCode: 'general_mfn_non_preferential'
  });
  assert.equal(nonFta.isFtaQualified, false);
  assert.equal(nonFta.ftaSavingsUsd, 0);
  assert.equal(nonFta.totalDutyPayableUsd, 2000);
});

test('contract: global-trade-sanctions-nexus Composite Trade Sanctions Risk Index (CTSRI) determines tiers and weighted score', () => {
  const elite = computeCompositeTradeSanctionsRiskIndex(10, 10, 10, 10, 10);
  assert.equal(elite.ctsriScore, 10);
  assert.equal(elite.tier, 'tier_1_elite_zero_defect');

  const managed = computeCompositeTradeSanctionsRiskIndex(25, 30, 20, 15, 10);
  assert.ok(managed.ctsriScore > 15 && managed.ctsriScore <= 40);
  assert.equal(managed.tier, 'tier_2_managed_exposure');

  const critical = computeCompositeTradeSanctionsRiskIndex(90, 85, 75, 60, 80);
  assert.ok(critical.ctsriScore > 70);
  assert.equal(critical.tier, 'tier_4_critical_board_escalation');
});

test('contract: global-trade-sanctions-nexus generateVsdDossierMarkdown generates structured markdown report', () => {
  const markdown = generateVsdDossierMarkdown({
    vsdReferenceNumber: 'VSD-2026-EAR-0091',
    targetAuthority: 'bis_oee',
    title: 'Inadvertent Dual-Use Encryption Source Code Commit Access',
    suspectedRegulationBreach: '15 CFR § 734.13 (Deemed Export Control Violation)',
    incidentStartDate: '2026-08-01',
    incidentEndDate: '2026-10-15',
    estimatedTransactionsCount: 14,
    estimatedTransactionVolumeUsd: 1250000,
    narrativeSummary: 'Foreign national engineers accessed cryptographic source code.',
    rootCauseAnalysis: 'Repository permissions defaulted to public on refactoring.',
    remedialActionsImplemented: ['Revoked access', 'Instituted branch protection']
  });

  assert.ok(markdown.includes('VOLUNTARY SELF-DISCLOSURE DOSSIER'));
  assert.ok(markdown.includes('VSD-2026-EAR-0091'));
  assert.ok(markdown.includes('BIS_OEE'));
  assert.ok(markdown.includes('15 CFR § 734.13'));
  assert.ok(markdown.includes('Revoked access'));
});

test('contract: global-trade-sanctions-nexus input validators enforce schemas and reject invalid payloads', () => {
  const badScreening = validateSanctionsScreeningInput({});
  assert.equal(badScreening.ok, false);
  const goodScreening = validateSanctionsScreeningInput({
    queryName: 'Vneshtorg Logistics Holding',
    countryCode: 'RU'
  });
  assert.equal(goodScreening.ok, true);

  const badEccn = validateEccnClassificationInput({});
  assert.equal(badEccn.ok, false);
  const goodEccn = validateEccnClassificationInput({
    itemName: 'SecureEdge Gateway',
    functionalDescription: 'Cryptographic mesh routing software',
    symmetricKeyLengthBits: 256
  });
  assert.equal(goodEccn.ok, true);

  const badDeemed = validateDeemedExportAuditInput({});
  assert.equal(badDeemed.ok, false);
  const goodDeemed = validateDeemedExportAuditInput({
    employeeName: 'Elena Rostova',
    citizenshipCountry: 'RU',
    accessedEccn: '5D002.a.1'
  });
  assert.equal(goodDeemed.ok, true);

  const badCfius = validateCfiusAssessmentInput({});
  assert.equal(badCfius.ok, false);
  const goodCfius = validateCfiusAssessmentInput({
    targetCompanyName: 'Quantum Telemetry Inc',
    dealValueUsd: 50000000,
    sensitivePersonalDataRecordsCount: 2000000
  });
  assert.equal(goodCfius.ok, true);

  const badDuty = validateCustomsDutyInput({});
  assert.equal(badDuty.ok, false);
  const goodDuty = validateCustomsDutyInput({
    partNumber: 'GPU-ACCEL-01',
    htsCode: '8542.31.0000',
    customsValueUsd: 500000
  });
  assert.equal(goodDuty.ok, true);

  const badVsd = validateCompileVsdInput({});
  assert.equal(badVsd.ok, false);
  const goodVsd = validateCompileVsdInput({
    vsdReferenceNumber: 'VSD-2026-EAR-0091',
    title: 'Inadvertent Encryption Export',
    suspectedRegulationBreach: '15 CFR § 734.13 Violation'
  });
  assert.equal(goodVsd.ok, true);

  const badSignoff = validateExecuteSignoffInput({});
  assert.equal(badSignoff.ok, false);
  const goodSignoff = validateExecuteSignoffInput({
    role: 'head_of_global_trade_compliance',
    signerName: 'Sarah Jenkins',
    signatureHash: 'sha256:8899aabbccddeeff0011223344556677'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: strategic-comms-crisis-nexus pure calculation functions calculate accurate scores and bounds', () => {
  const neutralScore = calculateNetSentimentScore({ positive: 20, neutral: 60, negative: 20, hostileAdversarial: 0 });
  assert.equal(neutralScore, 0);

  const hostileScore = calculateNetSentimentScore({ positive: 5, neutral: 10, negative: 40, hostileAdversarial: 45 });
  assert.ok(hostileScore < -70);
  assert.ok(hostileScore >= -100);

  const emptyScore = calculateNetSentimentScore({ positive: 0, neutral: 0, negative: 0, hostileAdversarial: 0 });
  assert.equal(emptyScore, 0);

  const lowVelocity = calculateNarrativeVelocityIndex({
    hourlyMentionsCurrent: 10,
    hourlyMentionsPrevious: 10,
    tier1OutletCount: 0,
    syndicationMultiplier: 1.0
  });
  const highVelocity = calculateNarrativeVelocityIndex({
    hourlyMentionsCurrent: 500,
    hourlyMentionsPrevious: 50,
    tier1OutletCount: 8,
    syndicationMultiplier: 2.5
  });
  assert.ok(highVelocity > lowVelocity);
  assert.ok(highVelocity <= 100);

  const subcritical = calculateViralPropagationVector({
    retweetShareRatio: 0.5,
    influencerCentralityFactor: 0.8,
    narrativeHalfLifeHours: 2.0
  });
  assert.ok(subcritical < 1.0);

  const superSpreader = calculateViralPropagationVector({
    retweetShareRatio: 4.5,
    influencerCentralityFactor: 2.8,
    narrativeHalfLifeHours: 12.0
  });
  assert.ok(superSpreader > 2.0);

  const brriResult = calculateBrandReputationResilienceIndex({
    netSentimentScore: -25,
    narrativeVelocityIndex: 45,
    viralPropagationVector: 1.2,
    stakeholderTrustScores: [75, 80, 70, 85],
    verifiedFactCount: 14,
    activeRumorCount: 3
  });
  assert.ok(brriResult.compositeScore >= 0);
  assert.ok(brriResult.compositeScore <= 100);
  assert.ok(brriResult.resilienceBand.length > 0);

  const compiled = compileOmnichannelHoldingStatement({
    incidentTitle: 'Infrastructure Incident',
    playbookType: 'cyber_ransomware_data_breach',
    targetTier: 'tier_2_institutional_investors',
    toneCalibration: 'authoritative_transparent',
    headline: 'Company Responds to Cyber Event',
    bodyText: 'Our forensic incident response teams are actively mitigating the unauthorized access.',
    includePslraSafeHarbor: true,
    includeRegulationFdNotice: true
  });
  assert.ok(compiled.safeHarborDisclaimer.includes('Private Securities Litigation Reform Act of 1995'));
  assert.ok(compiled.regulationFdNotice.includes('Regulation FD'));
  assert.ok(compiled.contentHashSha256.startsWith('sha256_'));

  const phrase = evaluateQaBridgeTransition('bridge_to_facts');
  assert.ok(phrase.includes('verified engineering'));
  const custom = evaluateQaBridgeTransition('bridge_to_values', 'Custom transition phrase');
  assert.equal(custom, 'Custom transition phrase');
});

test('contract: strategic-comms-crisis-nexus input validators enforce schemas and reject invalid payloads', () => {
  const badIncident = validateCreateCrisisIncidentInput({});
  assert.equal(badIncident.ok, false);
  const goodIncident = validateCreateCrisisIncidentInput({
    title: 'Global Core Cloud Data Exfiltration Incident',
    playbookType: 'cyber_ransomware_data_breach',
    initialSeverity: 'level_4_acute_enterprise_crisis',
    incidentCommander: 'Elena Vance, VP Incident Response',
    communicationsLead: 'Marcus Vance, Head of Comms',
    legalCounselLead: 'Rachel Thorne, General Counsel',
    technicalLead: 'Dr. Gregory House, CISO',
    summary: 'Containment protocol active following unauthorized lateral movement in secondary cluster.'
  });
  assert.equal(goodIncident.ok, true);

  const badStatement = validateCreateHoldingStatementInput({});
  assert.equal(badStatement.ok, false);
  const goodStatement = validateCreateHoldingStatementInput({
    incidentId: '123e4567-e89b-12d3-a456-426614174000',
    targetTier: 'tier_1_workforce_employees',
    toneCalibration: 'empathetic_reassuring',
    headline: 'Update on Systems Operational Integrity and Safety',
    bodyText: 'All core employee workstations remain secure while forensic reviews continue.',
    includePslraSafeHarbor: true,
    includeRegulationFdNotice: false
  });
  assert.equal(goodStatement.ok, true);

  const badFact = validateRecordVerifiedFactInput({});
  assert.equal(badFact.ok, false);
  const goodFact = validateRecordVerifiedFactInput({
    incidentId: '123e4567-e89b-12d3-a456-426614174000',
    factClaim: 'Production customer databases were not breached; perimeter firewalls blocked lateral spread.',
    technicalCorroboration: 'Forensic audit report signed by Mandiant Security Incident Response team.',
    sourceOwner: 'CISO / Mandiant Lead',
    corroborationStatus: 'verified_corroborated',
    refutedRumor: 'External social rumors alleging 100% database drop.',
    evidenceReferenceId: 'EVID-SEC-2026-0994'
  });
  assert.equal(goodFact.ok, true);

  const badQa = validateRecordQaBridgeItemInput({});
  assert.equal(badQa.ok, false);
  const goodQa = validateRecordQaBridgeItemInput({
    incidentId: '123e4567-e89b-12d3-a456-426614174000',
    hostileQuestion: 'Did executives delay notifying the public to dump shares?',
    anticipatedOutlet: 'Wall Street Journal',
    bridgeTechnique: 'bridge_to_facts',
    transitionPhrase: 'What the verified corporate trading logs and audit trails prove is...',
    pivotMessage: 'All insider trading windows were locked 48 hours prior to any system diagnosis.',
    riskRating: 9
  });
  assert.equal(goodQa.ok, true);

  const badSignoff = validateSubmitTripartiteSignoffInput({});
  assert.equal(badSignoff.ok, false);
  const goodSignoff = validateSubmitTripartiteSignoffInput({
    holdingStatementId: '123e4567-e89b-12d3-a456-426614174000',
    role: 'chief_legal_officer',
    signerName: 'Sarah Jenkins, Esq.',
    legalComments: 'Reviewed for PSLRA Safe Harbor compliance and Reg FD non-selectivity.'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: shareholder activism defense algorithms and input validators', () => {
  const emptyWci = calculateWolfpackCoordinationIndex([], 30);
  assert.equal(emptyWci, 0.0);

  const activeWci = calculateWolfpackCoordinationIndex(
    [
      { ownershipPercentage: 4.8, derivativeExposurePercentage: 2.2, coordinationCorrelationScore: 85 },
      { ownershipPercentage: 3.5, derivativeExposurePercentage: 1.5, coordinationCorrelationScore: 78 },
      { ownershipPercentage: 2.1, derivativeExposurePercentage: 0.9, coordinationCorrelationScore: 65 }
    ],
    20
  );
  assert.ok(activeWci > 20.0);
  assert.ok(activeWci <= 100.0);

  const lowVuln = calculateActivistVulnerabilityScore(20, 15, 25, 30, 20);
  assert.equal(lowVuln.vulnerabilityRiskBand, 'low_vulnerability');
  assert.ok(lowVuln.compositeVulnerabilityScore < 40.0);

  const acuteVuln = calculateActivistVulnerabilityScore(88, 92, 85, 75, 70);
  assert.equal(acuteVuln.vulnerabilityRiskBand, 'acute_vulnerability_crisis');
  assert.ok(acuteVuln.compositeVulnerabilityScore >= 75.0);

  const pillOutcome = calculatePoisonPillDilution(100000000, 15.0, 100, 50, 50);
  assert.ok(pillOutcome.postDilutionAcquirerPct < 15.0);
  assert.ok(pillOutcome.dilutionFactor > 1.5);
  assert.ok(pillOutcome.economicDeterrenceEffect.includes('Dilution'));

  const cohorts = [
    { votingPowerPercentage: 22.0, historicalManagementSupportRate: 85.0, issAlignmentProbability: 90.0, glassLewisAlignmentProbability: 85.0 },
    { votingPowerPercentage: 35.0, historicalManagementSupportRate: 55.0, issAlignmentProbability: 60.0, glassLewisAlignmentProbability: 65.0 },
    { votingPowerPercentage: 9.5, historicalManagementSupportRate: 0.0, issAlignmentProbability: 10.0, glassLewisAlignmentProbability: 10.0 },
    { votingPowerPercentage: 12.0, historicalManagementSupportRate: 98.0, issAlignmentProbability: 5.0, glassLewisAlignmentProbability: 5.0 }
  ];

  const contestSimMgmt = simulateUniversalProxyContest(cohorts, 'support_management_slate', 'support_management_slate', 3);
  assert.ok(contestSimMgmt.managementWinProbability > 50.0);
  assert.ok(contestSimMgmt.projectedDissidentSeatsWon <= 1);

  const contestSimDiss = simulateUniversalProxyContest(cohorts, 'support_dissident_slate', 'support_dissident_slate', 3);
  assert.ok(contestSimDiss.dissidentWinProbability > 40.0);

  const settleVsFight = calculateSettleVsFightValue(3.5, -2.0, 28500000000, 20000000);
  assert.ok(settleVsFight.netAdvantageUsd > 0);
  assert.equal(settleVsFight.recommendedCourse, 'execute_standstill_settlement');

  const badCampaign = validateCreateActivistCampaignInput({});
  assert.equal(badCampaign.ok, false);
  const goodCampaign = validateCreateActivistCampaignInput({
    activistFundName: 'Vanguard Alpha Capital Management',
    leadPartnerName: 'Julian Sterling',
    campaignPhase: 'schedule_13d_disclosure',
    threatTier: 'tier_1_hostile_wolfpack',
    primaryDemand: 'board_representation_seats',
    sharesHeldCount: 7850000,
    percentageOwnership: 7.85,
    syntheticSwapPercentage: 2.15,
    schedule13dFilingDate: '2026-10-15',
    demandSummary: 'Seeking 3 board seats and strategic review of non-core cloud hosting unit'
  });
  assert.equal(goodCampaign.ok, true);

  const badWolfpack = validateRegisterWolfpackAccumulationInput({});
  assert.equal(badWolfpack.ok, false);
  const goodWolfpack = validateRegisterWolfpackAccumulationInput({
    campaignId: 'camp-123',
    fundName: 'Apex Arbitrage Partners',
    ownershipPercentage: 3.4,
    derivativeExposurePercentage: 1.2,
    accumulationVelocitySharesPerDay: 45000,
    coordinationCorrelationScore: 82,
    schedule13dCrossDate: '2026-10-18'
  });
  assert.equal(goodWolfpack.ok, true);

  const badPill = validateDeployRightsPlanInput({ flipInThresholdPercentage: 3 });
  assert.equal(badPill.ok, false);
  const goodPill = validateDeployRightsPlanInput({
    planName: '2026 Shareholder Rights Plan',
    flipInThresholdPercentage: 15.0,
    exercisePriceUsd: 120.0,
    discountPercentage: 50.0,
    expirationDate: '2027-10-24'
  });
  assert.equal(goodPill.ok, true);

  const badNominee = validateRecordNomineeComparisonInput({});
  assert.equal(badNominee.ok, false);
  const goodNominee = validateRecordNomineeComparisonInput({
    seatNumber: 1,
    incumbentName: 'Dr. Arthur Pendelton',
    incumbentYearsServed: 8,
    incumbentCommitteeRoles: 'Audit Chair',
    incumbentSkills: 'Financial Expert',
    dissidentName: 'Marcus Bennett',
    dissidentAffiliation: 'Vanguard Alpha',
    dissidentExpertise: 'Activist Turnaround Specialist',
    proxyAdvisorRecommendedSlate: 'split'
  });
  assert.equal(goodNominee.ok, true);

  const badSignoff = validateSubmitActivismSignoffInput({});
  assert.equal(badSignoff.ok, false);
  const goodSignoff = validateSubmitActivismSignoffInput({
    campaignId: 'camp-123',
    role: 'lead_independent_director',
    signerName: 'Margaret Holloway',
    statementAcknowledged: 'Fiduciary defense review authorized under Delaware DGCL Section 141'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: antitrust competition law HHI, delta HHI and merger guidelines presumption', () => {
  const conc = calculateHhiConcentration([28, 22, 18, 12, 10, 10]);
  assert.equal(conc.hhi, 1936);
  assert.equal(conc.concentrationTier, 'highly_concentrated_presumption');

  const lowConc = calculateHhiConcentration([15, 12, 10, 8]);
  assert.equal(lowConc.hhi, 533);
  assert.equal(lowConc.concentrationTier, 'unconcentrated');

  const delta = calculateDeltaHhi(28, 22);
  assert.equal(delta.deltaHhi, 1232);
  assert.equal(delta.postMergerSharePct, 50.0);

  const pres1 = evaluateHhiPresumption(1936 + 1232, 1232, 50.0);
  assert.equal(pres1.presumptionRebuttableUnlawful, true);
  assert.equal(pres1.concentrationTier, 'dominant_firm_threshold');

  const pres2 = evaluateHhiPresumption(1900, 120, 25.0);
  assert.equal(pres2.presumptionRebuttableUnlawful, true);
  assert.equal(pres2.concentrationTier, 'highly_concentrated_presumption');

  const pres3 = evaluateHhiPresumption(1200, 110, 18.0);
  assert.equal(pres3.presumptionRebuttableUnlawful, false);
  assert.equal(pres3.concentrationTier, 'moderately_concentrated');

  const pres4 = evaluateHhiPresumption(800, 50, 10.0);
  assert.equal(pres4.presumptionRebuttableUnlawful, false);
  assert.equal(pres4.concentrationTier, 'unconcentrated');
});

test('contract: antitrust GUPPI upward pricing pressure index calculation', () => {
  const guppiSevere = calculateGuppi(0.35, 0.28, 120, 110, 65, 70, 0, 0);
  assert.ok(guppiSevere.maxGuppiPct >= 10.0);
  assert.equal(guppiSevere.unilateralEffectsRiskTier, 'severe_unilateral_effects');

  const guppiMod = calculateGuppi(0.12, 0.10, 100, 100, 50, 50, 0, 0);
  assert.ok(guppiMod.maxGuppiPct >= 5.0 && guppiMod.maxGuppiPct < 10.0);
  assert.equal(guppiMod.unilateralEffectsRiskTier, 'moderate_unilateral_risk');

  const guppiLow = calculateGuppi(0.04, 0.03, 100, 100, 40, 40, 0, 0);
  assert.ok(guppiLow.maxGuppiPct < 5.0);
  assert.equal(guppiLow.unilateralEffectsRiskTier, 'negligible_pricing_pressure');
});

test('contract: antitrust regulatory clearance risk score and remedy defensibility index', () => {
  const rcrs = calculateRegulatoryClearanceRiskScore({
    postMergerHhi: 2650,
    deltaHhi: 420,
    maxGuppiPct: 14.5,
    phase2FilingsCount: 2,
    phase1FilingsCount: 1,
    hasConflictingForeignRemedy: true,
    customerObjectionsCount: 3,
    competitorWhitepapersCount: 2,
    stateAgInquiriesCount: 2,
    custodianCount: 45,
    dataVolumeTerabytes: 24,
    hasCidDeposition: true
  });

  assert.ok(rcrs.score >= 75.0);
  assert.equal(rcrs.riskBand, 'acute_antitrust_block_risk');
  assert.ok(rcrs.breakdown.hhiRisk > 80);
  assert.ok(rcrs.breakdown.guppiRisk > 80);

  const rdiHigh = calculateRemedyDefensibilityIndex({
    overlapMitigatedPct: 92,
    upfrontBuyerViabilityScore: 88,
    standaloneViabilityScore: 85,
    cleanTeamComplianceScore: 95,
    behavioralCommitmentsScore: 80
  });
  assert.ok(rdiHigh.rdi >= 75.0);
  assert.equal(rdiHigh.isRemedyDefensible, true);

  const rdiDeficient = calculateRemedyDefensibilityIndex({
    overlapMitigatedPct: 30,
    upfrontBuyerViabilityScore: 40,
    standaloneViabilityScore: 45,
    cleanTeamComplianceScore: 50,
    behavioralCommitmentsScore: 40
  });
  assert.ok(rdiDeficient.rdi < 55.0);
  assert.equal(rdiDeficient.isRemedyDefensible, false);
});

test('contract: antitrust HSR statutory assessment thresholds and filing fee tiers', () => {
  const feeSmall = calculateHsrStatutoryFee(150000000);
  assert.equal(feeSmall.statutoryFeeUsd, 30000);

  const feeMid = calculateHsrStatutoryFee(300000000);
  assert.equal(feeMid.statutoryFeeUsd, 250000);

  const feeMega = calculateHsrStatutoryFee(6000000000);
  assert.equal(feeMega.statutoryFeeUsd, 2335000);

  const hsrAssessment = evaluateHsrStatutoryThresholds(14200000000, 850000000, 320000000);
  assert.equal(hsrAssessment.sizeOfTransactionTestPassed, true);
  assert.equal(hsrAssessment.sizeOfPersonTestPassed, true);
  assert.equal(hsrAssessment.isHsrFilingRequired, true);
  assert.equal(hsrAssessment.statutoryFilingFeeUsd, 2335000);
  assert.equal(hsrAssessment.initialWaitingPeriodDays, 30);

  const belowHsr = evaluateHsrStatutoryThresholds(80000000, 50000000, 10000000);
  assert.equal(belowHsr.sizeOfTransactionTestPassed, false);
  assert.equal(belowHsr.isHsrFilingRequired, false);
  assert.equal(belowHsr.statutoryFilingFeeUsd, 0);
});

test('contract: antitrust tripartite ratification cryptographic hash computation', () => {
  const hash1 = computeRatificationHash({
    transactionId: 'deal-001',
    regulatoryClearanceRiskScore: 78.4,
    leadCounselSigner: 'Jonathan Vance, Esq.',
    generalCounselSigner: 'Helena Sterling, Esq.',
    chiefExecutiveOfficerSigner: 'David Vance'
  });
  const hash2 = computeRatificationHash({
    transactionId: 'deal-001',
    regulatoryClearanceRiskScore: 78.4,
    leadCounselSigner: 'Jonathan Vance, Esq.',
    generalCounselSigner: 'Helena Sterling, Esq.',
    chiefExecutiveOfficerSigner: 'David Vance'
  });
  assert.equal(hash1, hash2);
  assert.ok(hash1.startsWith('sha256-ratif-'));
});

test('contract: antitrust input validation functions reject invalid payloads and accept valid ones', () => {
  const badTx = validateCreateMergerTransactionInput({ dealCodename: '' });
  assert.equal(badTx.ok, false);

  const goodTx = validateCreateMergerTransactionInput({
    dealCodename: 'PROJECT AEGIS TITAN',
    acquirerName: 'Nexus Tech Global Inc.',
    targetName: 'Apex Enterprise Software Corp.',
    enterpriseValueUsd: 14200000000,
    cashConsiderationUsd: 10000000000,
    stockConsiderationUsd: 4200000000,
    announcedDate: '2026-09-15',
    targetedClosingDate: '2027-06-30',
    dealStructureType: 'horizontal_merger'
  });
  assert.equal(goodTx.ok, true);

  const badMkt = validateDefineMarketInput({ marketName: '' });
  assert.equal(badMkt.ok, false);

  const goodMkt = validateDefineMarketInput({
    transactionId: 'deal-001',
    marketName: 'Global Cloud Enterprise HCM Platforms',
    productMarketDefinition: 'Mission-critical human capital management software',
    geographicMarketScope: 'Worldwide / North America & EEA',
    totalMarketSizeUsd: 28000000000,
    participantShares: [
      { participantName: 'Nexus Tech', isMergingParty: true, isAcquirer: true, isTarget: false, annualRevenueUsd: 7840000000, marketSharePct: 28 },
      { participantName: 'Apex Software', isMergingParty: true, isAcquirer: false, isTarget: true, annualRevenueUsd: 6160000000, marketSharePct: 22 },
      { participantName: 'Competitor Alpha', isMergingParty: false, isAcquirer: false, isTarget: false, annualRevenueUsd: 5040000000, marketSharePct: 18 }
    ]
  });
  assert.equal(goodMkt.ok, true);

  const badRemedy = validateProposeDivestiturePackageInput({ packageName: '' });
  assert.equal(badRemedy.ok, false);

  const goodRemedy = validateProposeDivestiturePackageInput({
    transactionId: 'deal-001',
    packageName: 'Apex Talent Suite Standalone Carve-Out',
    remedyType: 'fix_it_first_buyer_sale',
    carveoutBusinessUnit: 'Apex Talent Acquisition & ATS Division',
    carveoutRevenueUsd: 1850000000,
    carveoutEbitdaUsd: 410000000,
    upfrontBuyerName: 'Vista Sovereign Equity Partners',
    assetOverlapMitigatedPct: 92.5
  });
  assert.equal(goodRemedy.ok, true);

  const badSignoff = validateSubmitAntitrustSignoffInput({});
  assert.equal(badSignoff.ok, false);

  const goodSignoff = validateSubmitAntitrustSignoffInput({
    transactionId: 'deal-001',
    role: 'antitrust_lead_counsel',
    signerName: 'Jonathan Vance, Esq.',
    statementAcknowledged: 'Antitrust defense strategy and HSR Item 4(c)/4(d) filing vetted under 15 U.S.C. Section 18a.'
  });
  assert.equal(goodSignoff.ok, true);
});

test('contract: privacy-data-sovereignty calculateTransferRiskIndex evaluates corridors and thresholds', () => {
  const safeRes = calculateTransferRiskIndex({
    destinationJurisdictionTier: 'adequacy_recognized',
    transferMechanism: 'adequacy_decision',
    supplementaryTechnicalMeasure: 'eea_sovereign_hsm_encryption',
    dataSensitivityCategory: 'b2b_professional_contacts',
    annualDataSubjectVolume: 5000
  });
  assert.equal(safeRes.riskTier, 'safe_harbor');
  assert.equal(safeRes.isTransferPermissible, true);
  assert.ok(safeRes.transferRiskIndex <= 20.0);

  const riskyRes = calculateTransferRiskIndex({
    destinationJurisdictionTier: 'authoritarian_unbounded_access',
    transferMechanism: 'article_49_derogation',
    supplementaryTechnicalMeasure: 'cleartext_none',
    dataSensitivityCategory: 'special_category_art_9_10',
    annualDataSubjectVolume: 500000
  });
  assert.equal(riskyRes.riskTier, 'prohibitive_unlawful');
  assert.equal(riskyRes.isTransferPermissible, false);
  assert.ok(riskyRes.transferRiskIndex > 70.0);
});

test('contract: privacy-data-sovereignty evaluateStatutorySlaCountdown tracks deadlines and extensions', () => {
  const gdprNormal = evaluateStatutorySlaCountdown(
    'gdpr_eu',
    '2026-10-01T00:00:00.000Z',
    false,
    undefined,
    '2026-10-10T00:00:00.000Z'
  );
  assert.equal(gdprNormal.totalAllocatedDays, 30);
  assert.equal(gdprNormal.isBreached, false);
  assert.equal(gdprNormal.isExtensionPermitted, true);
  assert.equal(gdprNormal.calendarDaysRemaining, 21);

  const gdprExtended = evaluateStatutorySlaCountdown(
    'gdpr_eu',
    '2026-10-01T00:00:00.000Z',
    true,
    undefined,
    '2026-10-10T00:00:00.000Z'
  );
  assert.equal(gdprExtended.totalAllocatedDays, 90);
  assert.equal(gdprExtended.isExtensionPermitted, false);

  const ccpaNormal = evaluateStatutorySlaCountdown(
    'ccpa_cpra_us',
    '2026-10-01T00:00:00.000Z',
    false,
    undefined,
    '2026-10-10T00:00:00.000Z'
  );
  assert.equal(ccpaNormal.totalAllocatedDays, 45);
});

test('contract: privacy-data-sovereignty calculateDpiaResidualRisk evaluates threats and triggers', () => {
  const lowRisk = calculateDpiaResidualRisk([
    { likelihood: 1, severity: 2, controlWeight: 1.0 }
  ], 10.0, 0);
  assert.ok(lowRisk.residualRiskScore <= 25.0);
  assert.equal(lowRisk.priorConsultationRequired, false);
  assert.equal(lowRisk.approvalStatus, 'approved');

  const severeRisk = calculateDpiaResidualRisk([
    { likelihood: 5, severity: 5, controlWeight: 0.1 },
    { likelihood: 5, severity: 4, controlWeight: 0.1 }
  ], 85.0, 4);
  assert.ok(severeRisk.residualRiskScore > 75.0);
  assert.equal(severeRisk.priorConsultationRequired, true);
  assert.equal(severeRisk.approvalStatus, 'prior_consultation_required');
});

test('contract: privacy-data-sovereignty differential privacy leakage and fine exposure models', () => {
  const dpRes = calculateDifferentialPrivacyLeakage(0.5, 1e-6, 0.05, 1.0);
  assert.equal(dpRes.isPrivacyPreserving, true);
  assert.ok(dpRes.wassersteinUtilityScore >= 80.0);
  assert.ok(dpRes.membershipInferenceAdvantageUpper < 1.0);

  const fines = calculateMultiJurisdictionalFineExposure({
    annualGlobalTurnoverEur: 1000000000,
    intentionalInfractionsCount: 5,
    unintentionalInfractionsCount: 10,
    activeBreachRecordsCount: 10000,
    demonstratedCooperationMitigationCredit: 0.40
  });
  assert.equal(fines.gdprMaxFineEur, 40000000);
  assert.ok(fines.totalConservativeExposureEur > 45000000);
  assert.ok(fines.totalExpectedRiskAdjustedExposureEur < fines.totalConservativeExposureEur);

  const seal = computeTripartiteSha256Seal(
    'CYCLE-2026-Q4',
    18.5,
    14500000,
    'Dr. Hélène Rousseau, DPO',
    'Marcus Sterling, Esq., CPO',
    'Elena Rostova, CEO',
    '2026-10-25T12:00:00.000Z'
  );
  assert.equal(seal.length, 64);
});

test('contract: privacy-data-sovereignty validators accept valid and reject invalid schemas', () => {
  const badTransfer = validateEvaluateTransferInput({});
  assert.equal(badTransfer.ok, false);

  const goodTransfer = validateEvaluateTransferInput({
    corridorCode: 'EU-US-PROD-01',
    originCountry: 'DEU',
    destinationCountry: 'USA',
    destinationJurisdictionTier: 'dpf_certified_participant',
    transferMechanism: 'eu_us_dpf_certified',
    legalInstrumentReference: 'DPF Self-Cert #US-882190',
    dataSensitivityCategory: 'consumer_pii',
    supplementaryTechnicalMeasure: 'eea_sovereign_hsm_encryption',
    annualDataSubjectVolume: 250000
  });
  assert.equal(goodTransfer.ok, true);

  const badDsr = validateCreateDsrRequestInput({ subjectEmail: 'invalid' });
  assert.equal(badDsr.ok, false);

  const goodDsr = validateCreateDsrRequestInput({
    subjectIdentifier: 'USR-89214',
    subjectEmail: 'data.subject@domain.de',
    regulatoryFramework: 'gdpr_eu',
    requestType: 'erasure_deletion',
    identityVerificationMethod: 'nist_ial2_authenticator'
  });
  assert.equal(goodDsr.ok, true);

  const goodExtension = validateTriggerDsrExtensionInput({
    dsrRequestId: 'dsr-001',
    extensionReason: 'Complex multi-jurisdictional financial archive retrieval required under Art 12(3).'
  });
  assert.equal(goodExtension.ok, true);

  const goodRopa = validateCreateRopaActivityInput({
    activityCode: 'ROPA-ENG-01',
    name: 'Customer Talent Identity Indexing',
    businessUnit: 'Engineering',
    processOwner: 'VP of Platform Engineering',
    processingPurpose: 'Searchable talent profile discovery for enterprise recruiters',
    gdprArticle6Basis: 'contract_performance',
    dataCategories: ['professional_experience', 'skills', 'education'],
    specialCategoriesPresent: false,
    dataSubjectsCategory: 'Platform Job Applicants',
    recipientCategories: ['Cloud Infrastructure Providers', 'Enterprise Hiring Managers'],
    crossBorderTransferInvolved: true,
    retentionPeriodMonths: 24,
    retentionLegalGround: 'Statutory recruitment and labor law record obligations',
    technicalSecurityMeasures: ['AES-256 GCM at rest', 'TLS 1.3 in transit', 'RBAC least privilege'],
    isDpiaRequired: true
  });
  assert.equal(goodRopa.ok, true);

  const goodDpia = validateCreateDpiaAssessmentInput({
    ropaActivityId: 'ropa-001',
    dpiaReference: 'DPIA-2026-09',
    title: 'High-Scale AI Career Matching Profile Ingestion',
    systematicMonitoringFlag: true,
    largeScaleProcessingFlag: true,
    innovativeTechFlag: true,
    vulnerableSubjectsFlag: false,
    automatedDecisionFlag: false,
    threatItems: [
      {
        threatScenario: 'Model inversion attack revealing applicant salary history',
        privacyHarmType: 'Financial profiling and loss of confidentiality',
        likelihoodRating: 2,
        severityRating: 4,
        mitigationControls: 'Differential privacy DP-SGD gradient clipping and noise injection',
        controlWeight: 0.85
      }
    ],
    dpoOpinion: 'Processing deemed acceptable conditional on differential privacy epsilon <= 1.0.'
  });
  assert.equal(goodDpia.ok, true);

  const goodAi = validateRegisterAiCorpusInput({
    corpusIdentifier: 'CORPUS-LLM-CAREER-V4',
    datasetName: 'Global Resume and Career Trajectory Foundation Corpus',
    originSourceUri: 's3://jobtrack-sovereign-ai-datasets/curated-v4/',
    collectionJurisdiction: 'FRA',
    legalBasisForTraining: 'GDPR Article 6(1)(f) Legitimate Interests with Art 21 Opt-out',
    optOutMechanismSupported: true,
    copyrightLicenseType: 'Apache-2.0 and Permissive Open Web',
    textDataMiningOptOut: false,
    fairUseFourFactorScore: 3.8,
    piiExtractionRiskScore: 12.5,
    euAiActArticle10Compliant: true,
    totalTokenOrRecordCount: 4500000000
  });
  assert.equal(goodAi.ok, true);

  const goodSynthetic = validateGenerateSyntheticDatasetInput({
    datasetCode: 'SYNTH-BENCHMARK-2026',
    synthesisAlgorithm: 'DP-PATE-GAN-Conditional',
    epsilonBudgetSpent: 0.85,
    deltaBoundParameter: 1e-6,
    noiseMechanism: 'subsampled_gaussian_rdp',
    syntheticRecordCount: 500000,
    storageS3Bucket: 'jobtrack-synthetic-data-eu-central-1',
    storageS3Key: 'datasets/benchmark-2026-v1.parquet'
  });
  assert.equal(goodSynthetic.ok, true);

  const goodRatification = validateSignTripartiteRatificationInput({
    ratificationId: 'ratif-2026-q4',
    role: 'data_protection_officer',
    signatoryFullName: 'Dr. Hélène Rousseau, DPO',
    notes: 'Approved without reservations.'
  });
  assert.equal(goodRatification.ok, true);
});







