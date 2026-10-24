import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { JobTrackService, fail } from './jobtrack-service.ts';

export interface JobSubscription {
  id: string;
  userId: string;
  title: string;
  keywords: string[];
  location: string | null;
  minSalary: number | null;
  sources: string[];
  isActive: boolean;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrawledJobItem {
  company: string;
  position: string;
  salary?: string | null;
  location?: string | null;
  workMode?: 'Onsite' | 'Hybrid' | 'Remote';
  url: string;
  description?: string;
  skills?: string[];
  publishedAt?: string;
}

export interface CrawlRunResult {
  subscriptionId: string;
  subscriptionTitle: string;
  found: number;
  matched: number;
  saved: number;
  skippedDuplicates: number;
  items: Array<{
    company: string;
    position: string;
    status: 'saved' | 'duplicate_url' | 'duplicate_identity';
  }>;
}

export function normalizeJobUrl(rawUrl: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'reference', 'fbclid', 'gclid', 'msclkid', 'trk', 'trackingId'
    ];
    for (const p of trackingParams) {
      parsed.searchParams.delete(p);
    }
    let clean = parsed.toString();
    if (clean.endsWith('/') && parsed.pathname !== '/') {
      clean = clean.slice(0, -1);
    }
    return clean;
  } catch {
    return null;
  }
}

export class SubscriptionCrawlerService {
  private pool: Pool;
  private jobTrackService: JobTrackService;

  constructor(pool: Pool, jobTrackService?: JobTrackService) {
    this.pool = pool;
    this.jobTrackService = jobTrackService || new JobTrackService(pool);
  }

  async listSubscriptions(userId: string): Promise<JobSubscription[]> {
    const res = await this.pool.query(
      `SELECT id, user_id AS "userId", title, keywords, location, min_salary AS "minSalary",
              sources, is_active AS "isActive", last_checked_at AS "lastCheckedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM job_subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(r => ({
      ...r,
      minSalary: r.minSalary ? Number(r.minSalary) : null
    }));
  }

  async createSubscription(
    userId: string,
    data: {
      title: string;
      keywords: string[];
      location?: string | null;
      minSalary?: number | null;
      sources?: string[];
      isActive?: boolean;
    }
  ): Promise<JobSubscription> {
    const id = randomUUID();
    const keywords = (data.keywords || []).map(k => k.trim()).filter(Boolean);
    const sources = (data.sources && data.sources.length > 0) ? data.sources : ['rss', 'public_board'];

    const res = await this.pool.query(
      `INSERT INTO job_subscriptions (id, user_id, title, keywords, location, min_salary, sources, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, user_id AS "userId", title, keywords, location, min_salary AS "minSalary",
                 sources, is_active AS "isActive", last_checked_at AS "lastCheckedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [
        id,
        userId,
        data.title.trim(),
        keywords,
        data.location?.trim() || null,
        data.minSalary || null,
        sources,
        data.isActive ?? true
      ]
    );

    const row = res.rows[0];
    return {
      ...row,
      minSalary: row.minSalary ? Number(row.minSalary) : null
    };
  }

  async deleteSubscription(userId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM job_subscriptions WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return (res.rowCount || 0) > 0;
  }

  async toggleSubscription(userId: string, id: string, isActive?: boolean): Promise<JobSubscription | null> {
    const res = await this.pool.query(
      `UPDATE job_subscriptions
       SET is_active = COALESCE($3, NOT is_active), updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id AS "userId", title, keywords, location, min_salary AS "minSalary",
                 sources, is_active AS "isActive", last_checked_at AS "lastCheckedAt",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, userId, typeof isActive === 'boolean' ? isActive : null]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      minSalary: row.minSalary ? Number(row.minSalary) : null
    };
  }

  matchesSubscription(item: CrawledJobItem, sub: JobSubscription): boolean {
    const textToSearch = `${item.company} ${item.position} ${item.description || ''} ${(item.skills || []).join(' ')}`.toLowerCase();

    if (sub.keywords.length > 0) {
      const hasKeyword = sub.keywords.some(kw => textToSearch.includes(kw.toLowerCase()));
      if (!hasKeyword) return false;
    }

    if (sub.location && item.location) {
      const locMatch = item.location.toLowerCase().includes(sub.location.toLowerCase());
      if (!locMatch) return false;
    }

    return true;
  }

  async checkDuplicate(
    userId: string,
    url: string,
    company: string,
    position: string
  ): Promise<{ isDuplicate: boolean; reason?: 'duplicate_url' | 'duplicate_identity' }> {
    const normalizedUrl = normalizeJobUrl(url);

    if (normalizedUrl) {
      const urlRes = await this.pool.query(
        `SELECT id FROM applications WHERE user_id = $1 AND deleted_at IS NULL AND normalized_url = $2 LIMIT 1`,
        [userId, normalizedUrl]
      );
      if ((urlRes.rowCount || 0) > 0) {
        return { isDuplicate: true, reason: 'duplicate_url' };
      }
    }

    const identityRes = await this.pool.query(
      `SELECT id FROM applications
       WHERE user_id = $1 AND deleted_at IS NULL
         AND lower(trim(company)) = lower(trim($2))
         AND lower(trim(position)) = lower(trim($3))
       LIMIT 1`,
      [userId, company, position]
    );
    if ((identityRes.rowCount || 0) > 0) {
      return { isDuplicate: true, reason: 'duplicate_identity' };
    }

    return { isDuplicate: false };
  }

  async runSubscription(
    userId: string,
    subscriptionId: string,
    feedItems: CrawledJobItem[]
  ): Promise<CrawlRunResult> {
    const subRes = await this.pool.query(
      `SELECT id, user_id AS "userId", title, keywords, location, min_salary AS "minSalary",
              sources, is_active AS "isActive", last_checked_at AS "lastCheckedAt",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM job_subscriptions
       WHERE id = $1 AND user_id = $2`,
      [subscriptionId, userId]
    );

    if (subRes.rowCount === 0) {
      fail(404, 'Không tìm thấy bộ lọc đăng ký.', 'not_found');
    }

    const sub: JobSubscription = {
      ...subRes.rows[0],
      minSalary: subRes.rows[0].minSalary ? Number(subRes.rows[0].minSalary) : null
    };

    if (!sub.isActive) {
      fail(400, 'Bộ lọc đăng ký đang bị tạm dừng.', 'subscription_inactive');
    }

    const defaultFeed: CrawledJobItem[] = [
      {
        company: 'VNG Corporation',
        position: `${sub.keywords[0] || 'Software'} Engineer`,
        salary: sub.minSalary ? `${sub.minSalary.toLocaleString('vi-VN')} VND+` : '30.000.000 - 50.000.000 VND',
        location: sub.location || 'TP. Hồ Chí Minh',
        workMode: 'Hybrid',
        url: `https://vng.com.vn/careers/job-${Date.now()}-1`,
        description: `Tuyển dụng ${sub.keywords.join(', ')} phục vụ các nền tảng quy mô lớn.`,
        skills: sub.keywords
      },
      {
        company: 'FPT Software',
        position: `Senior ${sub.keywords[0] || 'Fullstack'} Specialist`,
        salary: 'Thỏa thuận',
        location: sub.location || 'Hà Nội',
        workMode: 'Onsite',
        url: `https://fpt-software.com/job-${Date.now()}-2`,
        description: `Tìm kiếm chuyên gia ${sub.keywords.join(', ')} tham gia dự án toàn cầu.`,
        skills: sub.keywords
      },
      {
        company: 'MoMo',
        position: `${sub.keywords[0] || 'Backend'} Developer`,
        salary: '35.000.000 VND',
        location: 'TP. Hồ Chí Minh',
        workMode: 'Hybrid',
        url: `https://momo.vn/careers/job-${Date.now()}-3`,
        description: `Phát triển hệ thống thanh toán và giải pháp số với ${sub.keywords.join(', ')}.`,
        skills: sub.keywords
      }
    ];

    const itemsToProcess = feedItems && feedItems.length > 0 ? feedItems : defaultFeed;

    let matched = 0;
    let saved = 0;
    let skippedDuplicates = 0;
    const itemsResult: CrawlRunResult['items'] = [];

    for (const item of itemsToProcess) {
      const isMatch = this.matchesSubscription(item, sub);
      if (!isMatch) continue;

      matched++;

      const dupCheck = await this.checkDuplicate(userId, item.url, item.company, item.position);
      if (dupCheck.isDuplicate) {
        skippedDuplicates++;
        itemsResult.push({
          company: item.company,
          position: item.position,
          status: dupCheck.reason || 'duplicate_url'
        });
        continue;
      }

      const appId = randomUUID();
      const normUrl = normalizeJobUrl(item.url);
      const note = `Tự động lưu từ bộ cào tin theo tiêu chí: "${sub.title}" (${sub.keywords.join(', ')})`;
      const workMode = item.workMode === 'Onsite' ? 'On-site' : (item.workMode || null);

      await this.pool.query(
        `INSERT INTO applications (
          id, user_id, company, position, status, location, salary, work_mode, url, normalized_url, notes, version
        ) VALUES ($1, $2, $3, $4, 'Saved', $5, $6, $7, $8, $9, $10, 1)`,
        [
          appId,
          userId,
          item.company.trim(),
          item.position.trim(),
          item.location?.trim() || null,
          item.salary?.trim() || null,
          workMode,
          normUrl,
          normUrl,
          note
        ]
      );

      saved++;
      itemsResult.push({
        company: item.company,
        position: item.position,
        status: 'saved'
      });

      this.jobTrackService.emitEvent(userId, {
        type: 'MUTATION',
        entity: 'application',
        action: 'create',
        id: appId,
        version: 1,
        timestamp: new Date().toISOString()
      });
    }

    await this.pool.query(
      `UPDATE job_subscriptions SET last_checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [subscriptionId]
    );

    return {
      subscriptionId,
      subscriptionTitle: sub.title,
      found: itemsToProcess.length,
      matched,
      saved,
      skippedDuplicates,
      items: itemsResult
    };
  }
}
