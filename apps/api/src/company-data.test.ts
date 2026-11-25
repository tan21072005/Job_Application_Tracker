import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCompanyName,
  scoreCompanyMatch,
  classifyMatchConfidence
} from './services/company-name.ts';
import {
  htmlToPlainText,
  parseGroundedExtraction,
  verifyExtractionAgainstSource
} from './services/company-extraction.ts';

test('company-name: strips Vietnamese legal prefixes and diacritics', () => {
  assert.equal(normalizeCompanyName('CÔNG TY CỔ PHẦN PHÂN PHỐI SNB'), 'phan phoi snb');
  assert.equal(normalizeCompanyName('Công ty TNHH Bảo hiểm Nhân thọ Sun Life Việt Nam'), 'bao hiem nhan tho sun life viet nam');
  assert.equal(normalizeCompanyName('CÔNG TY TNHH KHOA HỌC CÔNG NGHỆ MINH VIỆT'), 'khoa hoc cong nghe minh viet');
});

test('company-name: keeps meaningful words when the legal form is the only content', () => {
  assert.equal(normalizeCompanyName('FPT Software'), 'fpt software');
  assert.equal(normalizeCompanyName('VNG Corporation'), 'vng corporation');
});

test('company-name: a short name does not match a longer name that contains it', () => {
  const shortVsLong = scoreCompanyMatch({
    name: 'SNB',
    candidateName: 'SNB Holdings International Trading Company'
  });
  const exact = scoreCompanyMatch({ name: 'SNB', candidateName: 'SNB' });
  assert.ok(exact.score > shortVsLong.score, 'exact must beat a container match');
  assert.ok(shortVsLong.score < 0.8, 'container match must not reach HIGH');
});

test('company-name: matching domain lifts the score and names the reason', () => {
  const result = scoreCompanyMatch({
    name: 'Ballow',
    website: 'https://ballow.io.vn',
    candidateName: 'Ballow Vietnam',
    candidateWebsite: 'https://www.ballow.io.vn/about'
  });
  assert.equal(result.reason, 'domain_match');
  assert.ok(result.score >= 0.3);
});

test('company-name: confidence buckets follow the researched thresholds', () => {
  assert.equal(classifyMatchConfidence(0.85), 'HIGH');
  assert.equal(classifyMatchConfidence(0.65), 'MEDIUM');
  assert.equal(classifyMatchConfidence(0.5), 'LOW');
  assert.equal(classifyMatchConfidence(0.2), 'WEAK');
});

test('extraction: html becomes comparable plain text', () => {
  const text = htmlToPlainText('<p>Công&nbsp;ty   <b>phân phối</b> thực phẩm</p>');
  assert.equal(text, 'Công ty phân phối thực phẩm');
});

test('extraction: a quote that exists in the source is accepted with its evidence', () => {
  const source = 'Chúng tôi là công ty phân phối thực phẩm dinh dưỡng thể thao hàng đầu Việt Nam.';
  const parsed = parseGroundedExtraction(
    JSON.stringify({ industry: { value: 'Phân phối thực phẩm', quote: 'công ty phân phối thực phẩm dinh dưỡng thể thao' } })
  );
  assert.ok(parsed);

  const verified = verifyExtractionAgainstSource(parsed!, source);
  assert.equal(verified.accepted.industry?.value, 'Phân phối thực phẩm');
  assert.match(verified.accepted.industry!.evidence, /phân phối thực phẩm/);
  assert.equal(verified.rejected.length, 0);
});

test('extraction: an invented quote is rejected, which is what stops the old fabrication', () => {
  const source = 'Chúng tôi chuyên phân phối thực phẩm dinh dưỡng thể thao.';
  const parsed = parseGroundedExtraction(
    JSON.stringify({
      industry: { value: 'Information Technology & Software', quote: 'chúng tôi là công ty công nghệ thông tin hàng đầu' }
    })
  );
  assert.ok(parsed);

  const verified = verifyExtractionAgainstSource(parsed!, source);
  assert.equal(verified.accepted.industry, undefined);
  assert.equal(verified.rejected.length, 1);
  assert.equal(verified.rejected[0].reason, 'quote_not_found_in_source');
});

test('extraction: a truncated or empty payload yields nothing', () => {
  assert.equal(parseGroundedExtraction(''), null);
  assert.equal(parseGroundedExtraction('not json'), null);
  assert.equal(parseGroundedExtraction('{"industry":{"value":"x"}}'), null);
  assert.equal(parseGroundedExtraction('{"industry":{"value":"","quote":""}}'), null);
});

test('extraction: a fenced code block is still parsed', () => {
  const raw = '```json\n{"size":{"value":"50-200","quote":"hơn 150 nhân viên"}}\n```';
  const parsed = parseGroundedExtraction(raw);
  assert.ok(parsed);
  assert.equal(parsed!.size?.value, '50-200');
});

test('extraction: a very short quote is refused even if it exists', () => {
  const verified = verifyExtractionAgainstSource({ industry: { value: 'IT', quote: 'it' } }, 'it is a company');
  assert.equal(verified.accepted.industry, undefined);
  assert.equal(verified.rejected[0].reason, 'quote_too_short');
});
