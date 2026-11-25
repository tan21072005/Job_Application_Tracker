export interface JobPostingJsonLd {
  company: string | null;
  position: string | null;
  industry: string | null;
  employmentType: string | null;
  location: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  datePosted: string | null;
  validThrough: string | null;
}

export interface JsonLdExtractionResult {
  found: boolean;
  reason: string | null;
  posting: JobPostingJsonLd | null;
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function typesOf(item: Record<string, unknown>): string[] {
  const raw = item['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((value): value is string => typeof value === 'string');
  return [];
}

function addressOf(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === 'string') return node.trim() || null;
  if (Array.isArray(node)) {
    for (const entry of node) {
      const found = addressOf(entry);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;

  const record = node as Record<string, unknown>;
  const address = record.address ?? record;
  if (typeof address === 'string') return address.trim() || null;
  if (!address || typeof address !== 'object') return null;

  const parts = address as Record<string, unknown>;
  const pieces = [
    asString(parts.addressLocality),
    asString(parts.addressRegion),
    asString(parts.addressCountry)
  ].filter((value): value is string => Boolean(value));

  return pieces.length ? Array.from(new Set(pieces)).join(', ') : null;
}

function organizationWebsite(item: Record<string, unknown>): string | null {
  const org = item.hiringOrganization;
  if (!org || typeof org !== 'object') return null;
  const record = org as Record<string, unknown>;
  return asString(record.sameAs) ?? asString(record.url);
}

function organizationLogo(item: Record<string, unknown>): string | null {
  const org = item.hiringOrganization;
  if (!org || typeof org !== 'object') return null;
  const logo = (org as Record<string, unknown>).logo;
  if (typeof logo === 'string') return logo.trim() || null;
  if (logo && typeof logo === 'object') {
    return asString((logo as Record<string, unknown>).url);
  }
  return null;
}

function plainText(html: string | null): string | null {
  if (!html) return null;
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, 8000) : null;
}

export function extractJobPostingFromHtml(html: string): JsonLdExtractionResult {
  if (!html || typeof html !== 'string') {
    return { found: false, reason: 'empty_document', posting: null };
  }

  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if (!blocks.length) {
    return { found: false, reason: 'no_jsonld_script', posting: null };
  }

  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1].trim());
    } catch {
      continue;
    }

    const items = Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>)['@graph'])
          ? ((parsed as Record<string, unknown>)['@graph'] as unknown[])
          : [parsed]);

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      if (!typesOf(record).some(type => type.includes('JobPosting'))) continue;

      const org = record.hiringOrganization;
      const company = org && typeof org === 'object'
        ? asString((org as Record<string, unknown>).name)
        : null;

      return {
        found: true,
        reason: null,
        posting: {
          company,
          position: asString(record.title),
          industry: asString(record.industry) ?? asString(record.occupationalCategory),
          employmentType: Array.isArray(record.employmentType)
            ? (record.employmentType.filter(value => typeof value === 'string').join(', ') || null)
            : asString(record.employmentType),
          location: addressOf(record.jobLocation),
          website: organizationWebsite(record),
          logoUrl: organizationLogo(record),
          description: plainText(asString(record.description)),
          datePosted: asString(record.datePosted),
          validThrough: asString(record.validThrough)
        }
      };
    }
  }

  return { found: false, reason: 'no_jobposting_entry', posting: null };
}
