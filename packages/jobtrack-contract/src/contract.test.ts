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
  type TargetStakeholderNodeDTO
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







