import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJobPostingFromHtml } from './services/company-jsonld.ts';

function page(payload: unknown): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify(payload)}</script></head><body></body></html>`;
}

test('jsonld: a JobPosting block yields the fields the dossier needs', () => {
  const html = page({
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: 'Backend Engineer',
    industry: 'Phần mềm',
    employmentType: 'FULL_TIME',
    datePosted: '2026-11-20',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'Ballow',
      sameAs: 'https://ballow.io.vn',
      logo: 'https://ballow.io.vn/logo.png'
    },
    jobLocation: {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: 'Hà Nội', addressCountry: 'VN' }
    },
    description: '<p>Xây dựng <b>API</b> cho hệ thống</p>'
  });

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.found, true);
  assert.ok(result.posting);

  const posting = result.posting!;
  assert.equal(posting.company, 'Ballow');
  assert.equal(posting.position, 'Backend Engineer');
  assert.equal(posting.industry, 'Phần mềm');
  assert.equal(posting.website, 'https://ballow.io.vn');
  assert.equal(posting.location, 'Hà Nội, VN');
  assert.equal(posting.datePosted, '2026-11-20');
  assert.match(posting.description!, /Xây dựng API cho hệ thống/);
  assert.doesNotMatch(posting.description!, /</);
});

test('jsonld: a graph wrapper is unwrapped', () => {
  const html = page({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'board' },
      { '@type': 'JobPosting', title: 'Kế toán', hiringOrganization: { name: 'SNB' } }
    ]
  });

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.found, true);
  assert.equal(result.posting!.position, 'Kế toán');
  assert.equal(result.posting!.company, 'SNB');
});

test('jsonld: an array at the top level is searched too', () => {
  const html = page([
    { '@type': 'Organization', name: 'not a posting' },
    { '@type': 'JobPosting', title: 'Designer', occupationalCategory: 'Thiết kế' }
  ]);

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.found, true);
  assert.equal(result.posting!.industry, 'Thiết kế');
});

test('jsonld: a page without a posting says so instead of returning blanks as facts', () => {
  const none = extractJobPostingFromHtml('<html><body>no jsonld</body></html>');
  assert.equal(none.found, false);
  assert.equal(none.reason, 'no_jsonld_script');
  assert.equal(none.posting, null);

  const wrongType = extractJobPostingFromHtml(page({ '@type': 'Organization', name: 'Acme' }));
  assert.equal(wrongType.found, false);
  assert.equal(wrongType.reason, 'no_jobposting_entry');

  assert.equal(extractJobPostingFromHtml('').reason, 'empty_document');
});

test('jsonld: broken json is skipped and does not throw', () => {
  const html = '<script type="application/ld+json">{ broken </script>';
  const result = extractJobPostingFromHtml(html);
  assert.equal(result.found, false);
  assert.equal(result.reason, 'no_jobposting_entry');
});

test('jsonld: employmentType arrays and multi-part addresses are joined', () => {
  const html = page({
    '@type': 'JobPosting',
    title: 'QA',
    employmentType: ['FULL_TIME', 'CONTRACTOR'],
    jobLocation: [
      { address: { addressLocality: 'Đà Nẵng', addressCountry: 'VN' } }
    ]
  });

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.posting!.employmentType, 'FULL_TIME, CONTRACTOR');
  assert.equal(result.posting!.location, 'Đà Nẵng, VN');
});

test('jsonld: missing fields stay null rather than empty strings', () => {
  const html = page({ '@type': 'JobPosting', title: 'Intern' });
  const result = extractJobPostingFromHtml(html);
  assert.equal(result.posting!.company, null);
  assert.equal(result.posting!.industry, null);
  assert.equal(result.posting!.website, null);
  assert.equal(result.posting!.location, null);
});

test('jsonld: a job board profile link is not mistaken for the company website', () => {
  const html = page({
    '@type': 'JobPosting',
    title: 'Kế toán tổng hợp',
    hiringOrganization: {
      name: 'CÔNG TY TNHH KHOA HỌC CÔNG NGHỆ MINH VIỆT',
      sameAs: 'https://www.topcv.vn/cong-ty/cong-ty-tnhh-khoa-hoc-cong-nghe-minh-viet/164273.html'
    }
  });

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.posting!.company, 'CÔNG TY TNHH KHOA HỌC CÔNG NGHỆ MINH VIỆT');
  assert.equal(result.posting!.website, null, 'the board profile is not the employer site');
});

test('jsonld: an employer own domain is still accepted as the website', () => {
  const html = page({
    '@type': 'JobPosting',
    title: 'Backend Engineer',
    hiringOrganization: { name: 'Ballow', sameAs: 'https://ballow.io.vn' }
  });

  const result = extractJobPostingFromHtml(html);
  assert.equal(result.posting!.website, 'https://ballow.io.vn');
});
