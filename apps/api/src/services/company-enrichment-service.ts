import type { Pool } from 'pg';
import { completeWithLlm, isLlmConfigured } from './llm-client.ts';
import {
  GROUNDED_EXTRACTION_PROMPT,
  htmlToPlainText,
  parseGroundedExtraction,
  verifyExtractionAgainstSource,
  type ExtractedField
} from './company-extraction.ts';

export type EnrichmentSource = 'user' | 'jsonld' | 'llm_grounded' | 'wikidata' | 'places' | 'manual';

export interface FieldProvenance {
  source: EnrichmentSource;
  confidence: number;
  evidence: string | null;
  verifiedAt: string;
}

export type ProvenanceMap = Partial<Record<ExtractedField, FieldProvenance>>;

export interface EnrichmentResult {
  accepted: Partial<Record<ExtractedField, { value: string; evidence: string }>>;
  rejected: Array<{ field: ExtractedField; quote: string; reason: string }>;
  source: EnrichmentSource | null;
  fetchedUrl: string | null;
  error: string | null;
}

const CANDIDATE_PATHS = ['', '/gioi-thieu', '/about', '/ve-chung-toi'];
const FETCH_TIMEOUT_MS = 8000;
const MAX_PAGE_BYTES = 400_000;

function normaliseWebsite(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    if (!host.includes('.') || host === 'localhost') return null;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'user-agent': 'JobTrackBot/1.0 (+https://ballow.io.vn)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    const text = await response.text();
    return text.slice(0, MAX_PAGE_BYTES);
  } catch {
    return null;
  }
}

export class CompanyEnrichmentService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async extractFromWebsite(website: string | null): Promise<EnrichmentResult> {
    const base = normaliseWebsite(website);
    if (!base) {
      return { accepted: {}, rejected: [], source: null, fetchedUrl: null, error: 'invalid_website' };
    }

    if (!isLlmConfigured()) {
      return { accepted: {}, rejected: [], source: null, fetchedUrl: null, error: 'llm_not_configured' };
    }

    let fetchedUrl: string | null = null;
    let sourceText = '';
    for (const path of CANDIDATE_PATHS) {
      const html = await fetchPage(`${base}${path}`);
      if (!html) continue;
      const plain = htmlToPlainText(html);
      if (plain.length > 200) {
        fetchedUrl = `${base}${path}`;
        sourceText = plain.slice(0, 12_000);
        break;
      }
    }

    if (!fetchedUrl || !sourceText) {
      return { accepted: {}, rejected: [], source: null, fetchedUrl: null, error: 'website_unreachable' };
    }

    const completion = await completeWithLlm(
      [
        { role: 'system', content: GROUNDED_EXTRACTION_PROMPT },
        { role: 'user', content: `VĂN BẢN TRANG WEB:\n\n${sourceText}` }
      ],
      { temperature: 0, maxOutputTokens: 1200, jsonMode: true, timeoutMs: 45_000 }
    ).catch(error => ({ error } as unknown as { text: string }));

    const rawText = 'text' in completion ? completion.text : '';
    if (!rawText) {
      return { accepted: {}, rejected: [], source: null, fetchedUrl, error: 'llm_failed' };
    }

    const parsed = parseGroundedExtraction(rawText);
    if (!parsed) {
      return { accepted: {}, rejected: [], source: null, fetchedUrl, error: 'llm_unparseable' };
    }

    const verified = verifyExtractionAgainstSource(parsed, sourceText);
    return {
      accepted: verified.accepted,
      rejected: verified.rejected,
      source: 'llm_grounded',
      fetchedUrl,
      error: null
    };
  }

  async persistGrounded(
    companyName: string,
    result: EnrichmentResult
  ): Promise<{ written: ExtractedField[]; skipped: ExtractedField[] }> {
    const written: ExtractedField[] = [];
    const skipped: ExtractedField[] = [];

    if (!result.source) return { written, skipped };

    const columnOf: Record<ExtractedField, string> = {
      industry: 'industry',
      size: 'size',
      headquarters: 'headquarters',
      description: 'description',
      techStack: 'tech_stack'
    };

    for (const field of Object.keys(result.accepted) as ExtractedField[]) {
      const entry = result.accepted[field];
      if (!entry) continue;

      const column = columnOf[field];
      const provenance: FieldProvenance = {
        source: result.source,
        confidence: 0.7,
        evidence: entry.evidence,
        verifiedAt: new Date().toISOString()
      };

      const value = field === 'techStack'
        ? JSON.stringify(entry.value.split(',').map(part => part.trim()).filter(Boolean))
        : entry.value;

      const updated = await this.pool.query(
        `UPDATE company_profiles
         SET ${column} = CASE
               WHEN ${column} IS NULL OR ${column}::text IN ('', '[]', '""') THEN $2
               ELSE ${column}
             END,
             provenance = provenance || $3::jsonb,
             enriched_at = CURRENT_TIMESTAMP
         WHERE lower(name) = lower($1)
         RETURNING (${column}::text = $2::text) AS took_value`,
        [companyName, value, JSON.stringify({ [field]: provenance })]
      );

      if (updated.rowCount && updated.rows[0].took_value) written.push(field);
      else skipped.push(field);
    }

    return { written, skipped };
  }
}
