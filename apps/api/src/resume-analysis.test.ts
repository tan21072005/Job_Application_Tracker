import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWithRules, analyzeResumeAgainstJob } from './services/resume-analysis-service.ts';

const resume = `
# Tran Thi B - Marketing Executive
## Kinh nghiem
- Quan ly fanpage 3 thang, tang luot theo doi tu 2.000 len 7.500.
- Chay 12 chien dich quang cao Facebook, ngan sach 40 trieu dong.
- Viet noi dung blog va phoi hop voi nhom thiet ke.
## Ky nang
- Facebook Ads, Google Analytics, SEO, Content Marketing
`;

const jobDescription = `
Tuyen Marketing Executive tai cong ty ABC.
Yeu cau:
- 2 nam kinh nghiem Facebook Ads va Google Analytics
- Biet SEO, Content Marketing, Email Marketing
- Co kinh nghiem quan ly ngan sach quang cao
- Biet su dung HubSpot va Salesforce la loi the
- Ky nang trinh bay va lam viec nhom
`;

test('resume-analysis: rule fallback works without an LLM provider', async () => {
  const previous = {
    provider: process.env.LLM_PROVIDER,
    openai: process.env.OPENAI_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY
  };

  delete process.env.LLM_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;

  try {
    const result = await analyzeResumeAgainstJob({
      resumeText: resume,
      jobDescription,
      jobTitle: 'Marketing Executive',
      company: 'ABC'
    });

    assert.equal(result.provenance, 'rules');
    assert.ok(result.diagnostic.atsScore >= 0 && result.diagnostic.atsScore <= 100);
    assert.ok(result.diagnostic.keywordGaps.length > 0);
    assert.ok(result.proposals.length > 0);
    assert.ok(result.diagnostic.recommendations.length > 0);
  } finally {
    if (previous.provider !== undefined) process.env.LLM_PROVIDER = previous.provider;
    if (previous.openai !== undefined) process.env.OPENAI_API_KEY = previous.openai;
    if (previous.deepseek !== undefined) process.env.DEEPSEEK_API_KEY = previous.deepseek;
    if (previous.gemini !== undefined) process.env.GEMINI_API_KEY = previous.gemini;
    if (previous.openrouter !== undefined) process.env.OPENROUTER_API_KEY = previous.openrouter;
  }
});

test('resume-analysis: rule fallback flags keywords absent from the CV', () => {
  const result = analyzeWithRules({
    resumeText: resume,
    jobDescription
  });

  const missing = result.diagnostic.keywordGaps.filter(item => !item.matched).map(item => item.keyword.toLowerCase());
  assert.ok(missing.some(keyword => keyword.includes('email')), `expected an email keyword gap, got: ${missing.join(', ')}`);

  const matched = result.diagnostic.keywordGaps.filter(item => item.matched).map(item => item.keyword.toLowerCase());
  assert.ok(matched.length > 0);
  assert.ok(!missing.includes('facebook ads'));
});

test('resume-analysis: never reports a keyword the JD does not contain', () => {
  const narrowJd = 'Tuyen dung nhan vien ke toan. Yeu cau biet Excel va MISA.';
  const result = analyzeWithRules({
    resumeText: resume,
    jobDescription: narrowJd
  });

  for (const gap of result.diagnostic.keywordGaps) {
    assert.ok(
      narrowJd.toLowerCase().includes(gap.keyword.toLowerCase()),
      `keyword "${gap.keyword}" is not present in the JD`
    );
  }
});
