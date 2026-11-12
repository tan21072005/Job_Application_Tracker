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



test('contract: escapeIcsText properly escapes RFC 5545 special delimiters', () => {
  const raw = 'Dòng 1\nDòng 2; có dấu chấm phẩy, phẩy và gạch chéo \\';
  const escaped = escapeIcsText(raw);
  assert.ok(escaped.includes('Dòng 1\\nDòng 2\\; có dấu chấm phẩy\\, phẩy và gạch chéo \\\\'));
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













































































































































































