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
  neutralizeFormula
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

