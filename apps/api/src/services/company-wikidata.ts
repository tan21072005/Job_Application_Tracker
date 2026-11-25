import { scoreCompanyMatch, classifyMatchConfidence } from './company-name.ts';

export interface WikidataCompany {
  qid: string;
  label: string;
  description: string | null;
  website: string | null;
  industry: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  confidence: number;
  bucket: 'HIGH' | 'MEDIUM' | 'LOW' | 'WEAK';
}

const USER_AGENT = 'JobTrackBot/1.0 (+https://ballow.io.vn)';
const TIMEOUT_MS = 12_000;
const MIN_ACCEPT_CONFIDENCE = 0.6;

const PROP = {
  website: 'P856',
  industry: 'P452',
  headquarters: 'P159',
  inception: 'P571',
  instanceOf: 'P31'
};

const COMPANY_CLASSES = new Set([
  'Q4830453',
  'Q783794',
  'Q6881511',
  'Q167037',
  'Q891723',
  'Q431289'
]);

interface SearchHit {
  id: string;
  label?: string;
  description?: string;
}

async function searchEntities(query: string): Promise<SearchHit[]> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbsearchentities');
  url.searchParams.set('search', query);
  url.searchParams.set('language', 'vi');
  url.searchParams.set('uselang', 'vi');
  url.searchParams.set('type', 'item');
  url.searchParams.set('limit', '5');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) return [];

  const payload = await response.json().catch(() => null) as { search?: SearchHit[] } | null;
  return payload?.search ?? [];
}

async function fetchEntity(qid: string): Promise<Record<string, unknown> | null> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'claims|labels|descriptions');
  url.searchParams.set('languages', 'vi|en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!response.ok) return null;

  const payload = await response.json().catch(() => null) as {
    entities?: Record<string, Record<string, unknown>>
  } | null;
  return payload?.entities?.[qid] ?? null;
}

function claimsOf(entity: Record<string, unknown>, property: string): unknown[] {
  const claims = entity.claims as Record<string, unknown[]> | undefined;
  return (claims?.[property] as unknown[]) ?? [];
}

function stringClaim(entity: Record<string, unknown>, property: string): string | null {
  for (const claim of claimsOf(entity, property)) {
    const value = (claim as { mainsnak?: { datavalue?: { value?: unknown } } })?.mainsnak?.datavalue?.value;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function entityIdClaim(entity: Record<string, unknown>, property: string): string | null {
  for (const claim of claimsOf(entity, property)) {
    const value = (claim as { mainsnak?: { datavalue?: { value?: { id?: unknown } } } })
      ?.mainsnak?.datavalue?.value;
    if (typeof value?.id === 'string' && /^Q\d+$/.test(value.id)) return value.id;
  }
  return null;
}

function timeClaimYear(entity: Record<string, unknown>, property: string): number | null {
  for (const claim of claimsOf(entity, property)) {
    const value = (claim as { mainsnak?: { datavalue?: { value?: { time?: unknown } } } })
      ?.mainsnak?.datavalue?.value;
    const raw = value?.time;
    if (typeof raw !== 'string') continue;
    const match = raw.match(/^[+-](\d{4})/);
    if (match) {
      const year = Number(match[1]);
      if (year > 1500 && year <= new Date().getFullYear()) return year;
    }
  }
  return null;
}

async function resolveEntityLabel(qid: string): Promise<string | null> {
  const url = new URL('https://www.wikidata.org/w/api.php');
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('ids', qid);
  url.searchParams.set('props', 'labels');
  url.searchParams.set('languages', 'vi|en');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  }).catch(() => null);
  if (!response || !response.ok) return null;

  const payload = await response.json().catch(() => null) as {
    entities?: Record<string, { labels?: Record<string, { value?: string }> }>
  } | null;
  const labels = payload?.entities?.[qid]?.labels;
  return labels?.vi?.value ?? labels?.en?.value ?? null;
}

function isCompany(entity: Record<string, unknown>): boolean {
  for (const claim of claimsOf(entity, PROP.instanceOf)) {
    const value = (claim as { mainsnak?: { datavalue?: { value?: { id?: string } } } })
      ?.mainsnak?.datavalue?.value;
    if (value?.id && COMPANY_CLASSES.has(value.id)) return true;
  }
  return false;
}

export async function lookupCompany(
  name: string,
  knownWebsite?: string | null
): Promise<WikidataCompany | null> {
  const query = (name || '').trim();
  if (query.length < 2) return null;

  const hits = await searchEntities(query);
  if (!hits.length) return null;

  let best: { hit: SearchHit; confidence: number; bucket: 'HIGH' | 'MEDIUM' | 'LOW' | 'WEAK' } | null = null;

  for (const hit of hits) {
    const label = hit.label || '';
    const scored = scoreCompanyMatch({
      name: query,
      website: knownWebsite,
      candidateName: label
    });

    if (!best || scored.score > best.confidence) {
      best = { hit, confidence: scored.score, bucket: classifyMatchConfidence(scored.score) };
    }
  }

  if (!best || best.confidence < MIN_ACCEPT_CONFIDENCE) return null;

  const entity = await fetchEntity(best.hit.id);
  if (!entity) return null;
  if (!isCompany(entity)) return null;

  const industryQid = entityIdClaim(entity, PROP.industry);
  const headquartersQid = entityIdClaim(entity, PROP.headquarters);

  const [industryLabel, headquartersLabel] = await Promise.all([
    industryQid ? resolveEntityLabel(industryQid) : Promise.resolve(null),
    headquartersQid ? resolveEntityLabel(headquartersQid) : Promise.resolve(null)
  ]);

  return {
    qid: best.hit.id,
    label: best.hit.label || query,
    description: best.hit.description || null,
    website: stringClaim(entity, PROP.website),
    industry: industryLabel,
    headquarters: headquartersLabel,
    foundedYear: timeClaimYear(entity, PROP.inception),
    confidence: best.confidence,
    bucket: best.bucket
  };
}
