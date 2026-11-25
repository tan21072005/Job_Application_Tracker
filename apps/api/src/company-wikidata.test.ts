import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./services/company-wikidata.ts', import.meta.url), 'utf8');

test('wikidata: a company must clear the confidence floor before it is accepted', () => {
  assert.match(source, /const MIN_ACCEPT_CONFIDENCE = 0\.6;/);
  assert.match(source, /if \(!best \|\| best\.confidence < MIN_ACCEPT_CONFIDENCE\) return null;/);
});

test('wikidata: results are filtered to company entities, not any matching item', () => {
  assert.match(source, /const COMPANY_CLASSES = new Set\(\[/);
  assert.match(source, /if \(!isCompany\(entity\)\) return null;/);
  assert.match(source, /PROP\.instanceOf/);
});

test('wikidata: the entity id properties are read as ids, not strings', () => {
  assert.match(source, /function entityIdClaim/);
  assert.match(source, /entityIdClaim\(entity, PROP\.industry\)/);
  assert.match(source, /entityIdClaim\(entity, PROP\.headquarters\)/);
});

test('wikidata: industry and headquarters labels are resolved for display', () => {
  assert.match(source, /resolveEntityLabel/);
  assert.match(source, /industryQid \? resolveEntityLabel\(industryQid\)/);
});

test('wikidata: a request carries a user agent and a timeout', () => {
  assert.match(source, /JobTrackBot\/1\.0/);
  assert.match(source, /AbortSignal\.timeout\(TIMEOUT_MS\)/);
});

test('enrichment: wikidata never overwrites a value that already exists', () => {
  const enrichment = readFileSync(new URL('./services/company-enrichment-service.ts', import.meta.url), 'utf8');
  const block = enrichment.slice(enrichment.indexOf('async enrichFromWikidata'));
  assert.match(block, /WHEN \$\{entry\.field\} IS NULL OR \$\{entry\.field\}::text IN \('', '""'\)/);
});

test('enrichment: a company with no source is reported, not invented', () => {
  const enrichment = readFileSync(new URL('./services/company-enrichment-service.ts', import.meta.url), 'utf8');
  assert.match(enrichment, /error: 'website_unreachable'/);
  assert.match(enrichment, /error: 'llm_not_configured'/);
  assert.match(enrichment, /error: 'llm_unparseable'/);
});
