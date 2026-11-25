import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type CompanyProfileDTO,
  type CompanyReviewDTO,
  type CompanySalaryBenchmarkDTO,
  calculateCompanyAggregates,
  validateCompanyReviewInput,
} from '@jobtrack/contract';
import { fail } from './jobtrack-service.ts';

export class CompanyService {
  private pool: Pool;
  private tableReady: boolean = false;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private async ensureTables(): Promise<void> {
    if (this.tableReady) return;
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS company_profiles (
        name varchar(255) PRIMARY KEY,
        industry varchar(255) NOT NULL,
        size varchar(100) NOT NULL,
        headquarters varchar(255) NOT NULL,
        website varchar(500) NOT NULL,
        logo_url varchar(500),
        description text NOT NULL,
        tech_stack jsonb NOT NULL DEFAULT '[]'::jsonb,
        culture_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
        salary_benchmarks jsonb NOT NULL DEFAULT '[]'::jsonb,
        interview_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
        key_pros jsonb NOT NULL DEFAULT '[]'::jsonb,
        key_red_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS company_reviews (
        id uuid PRIMARY KEY,
        company_name varchar(255) NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar(255) NOT NULL,
        rating integer NOT NULL,
        work_life_balance integer NOT NULL,
        compensation_rating integer NOT NULL,
        career_growth integer NOT NULL,
        management_rating integer NOT NULL,
        recommend boolean NOT NULL DEFAULT true,
        pros text NOT NULL,
        cons text NOT NULL,
        advice text,
        created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS company_reviews_company_idx ON company_reviews (company_name, created_at DESC);
      CREATE INDEX IF NOT EXISTS company_reviews_user_idx ON company_reviews (user_id);
    `);
    this.tableReady = true;
  }

  async getCompany(name: string): Promise<CompanyProfileDTO> {
    await this.ensureTables();
    const cleanName = (name || '').trim();
    if (!cleanName) {
      fail(400, 'Tên công ty không được để trống.', 'invalid_request');
    }

    const reviewsRes = await this.pool.query<{
      id: string;
      company_name: string;
      user_id: string;
      role: string;
      rating: number;
      work_life_balance: number;
      compensation_rating: number;
      career_growth: number;
      management_rating: number;
      recommend: boolean;
      pros: string;
      cons: string;
      advice: string | null;
      created_at: Date;
    }>(
      `SELECT id, company_name, user_id, role, rating, work_life_balance, compensation_rating,
              career_growth, management_rating, recommend, pros, cons, advice, created_at
       FROM company_reviews
       WHERE LOWER(company_name) = LOWER($1)
       ORDER BY created_at DESC
       LIMIT 50`,
      [cleanName]
    );

    const userReviews: CompanyReviewDTO[] = reviewsRes.rows.map(r => ({
      id: r.id,
      companyName: r.company_name,
      userId: r.user_id,
      role: r.role,
      rating: r.rating,
      workLifeBalance: r.work_life_balance,
      compensationRating: r.compensation_rating,
      careerGrowth: r.career_growth,
      managementRating: r.management_rating,
      recommend: r.recommend,
      pros: r.pros,
      cons: r.cons,
      advice: r.advice || undefined,
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at)
    }));

    const profRes = await this.pool.query<Record<string, any>>(
      `SELECT name, industry, size, headquarters, website, logo_url, description,
              tech_stack, culture_scores, salary_benchmarks, interview_questions,
              key_pros, key_red_flags, provenance, enriched_at, enrichment_attempts,
              places_id, places_rating, places_rating_count, places_fetched_at, updated_at
       FROM company_profiles
       WHERE LOWER(name) = LOWER($1)`,
      [cleanName]
    );

    const profile = this.emptyProfile(cleanName);

    if (profRes.rows[0]) {
      const row = profRes.rows[0];
      profile.industry = row.industry || '';
      profile.size = row.size || '';
      profile.headquarters = row.headquarters || '';
      profile.website = row.website || '';
      profile.logoUrl = row.logo_url || undefined;
      profile.description = row.description || '';
      profile.techStack = Array.isArray(row.tech_stack) ? row.tech_stack : [];
      profile.salaryBenchmarks = Array.isArray(row.salary_benchmarks) ? row.salary_benchmarks : [];
      profile.interviewQuestions = Array.isArray(row.interview_questions) ? row.interview_questions : [];
      profile.keyPros = Array.isArray(row.key_pros) ? row.key_pros : [];
      profile.keyRedFlags = Array.isArray(row.key_red_flags) ? row.key_red_flags : [];
      profile.provenance = row.provenance && typeof row.provenance === 'object' ? row.provenance : {};
      profile.places = row.places_rating !== null && row.places_rating !== undefined && row.places_id
        ? {
            placeId: row.places_id,
            rating: Number(row.places_rating),
            ratingCount: Number(row.places_rating_count || 0),
            fetchedAt: row.places_fetched_at instanceof Date
              ? row.places_fetched_at.toISOString()
              : String(row.places_fetched_at || row.updated_at)
          }
        : null;
      profile.updatedAt = row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at);
      profile.enrichment.attempts = Number(row.enrichment_attempts || 0);
      profile.enrichment.lastAttemptAt = row.enriched_at
        ? (row.enriched_at instanceof Date ? row.enriched_at.toISOString() : String(row.enriched_at))
        : null;
    }

    profile.recentReviews = userReviews;
    profile.cultureScores = calculateCompanyAggregates(userReviews);
    profile.enrichment.missing = this.missingFields(profile);
    profile.enrichment.canEnrich = profile.enrichment.missing.length > 0 && !profile.enrichment.running;

    return profile;
  }

  private emptyProfile(name: string): CompanyProfileDTO {
    return {
      name,
      industry: '',
      size: '',
      headquarters: '',
      website: '',
      description: '',
      techStack: [],
      cultureScores: null,
      salaryBenchmarks: [],
      interviewQuestions: [],
      recentReviews: [],
      keyPros: [],
      keyRedFlags: [],
      provenance: {},
      places: null,
      enrichment: {
        canEnrich: false,
        running: false,
        attempts: 0,
        lastAttemptAt: null,
        lastError: null,
        missing: []
      },
      updatedAt: new Date().toISOString()
    };
  }

  private missingFields(profile: CompanyProfileDTO): string[] {
    const missing: string[] = [];
    if (!profile.industry) missing.push('industry');
    if (!profile.size) missing.push('size');
    if (!profile.website) missing.push('website');
    if (!profile.description) missing.push('description');
    return missing;
  }

  async addReview(userId: string, name: string, input: unknown): Promise<CompanyReviewDTO> {
    await this.ensureTables();
    const cleanName = (name || '').trim();
    if (!cleanName) {
      fail(400, 'Tên công ty không được để trống.', 'invalid_request');
    }

    const payload = (typeof input === 'object' && input !== null) ? { companyName: cleanName, ...input } : input;
    const val = validateCompanyReviewInput(payload);
    if (!val.ok) {
      fail(422, val.message || 'Thông tin đánh giá chưa hợp lệ.', 'invalid_request', val.errors);
    }

    const id = randomUUID();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO company_reviews (
        id, company_name, user_id, role, rating, work_life_balance, compensation_rating,
        career_growth, management_rating, recommend, pros, cons, advice, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        cleanName,
        userId,
        val.data.role,
        val.data.rating,
        val.data.workLifeBalance,
        val.data.compensationRating,
        val.data.careerGrowth,
        val.data.managementRating,
        val.data.recommend,
        val.data.pros,
        val.data.cons,
        val.data.advice || null,
        now
      ]
    );

    const reviewsRes = await this.pool.query<{
      rating: number;
      work_life_balance: number;
      compensation_rating: number;
      career_growth: number;
      management_rating: number;
      recommend: boolean;
    }>(
      `SELECT rating, work_life_balance, compensation_rating, career_growth, management_rating, recommend
       FROM company_reviews
       WHERE LOWER(company_name) = LOWER($1)`,
      [cleanName]
    );

    const aggregates = calculateCompanyAggregates(
      reviewsRes.rows.map(r => ({
        id: '',
        companyName: cleanName,
        role: '',
        rating: r.rating,
        workLifeBalance: r.work_life_balance,
        compensationRating: r.compensation_rating,
        careerGrowth: r.career_growth,
        managementRating: r.management_rating,
        recommend: r.recommend,
        pros: '',
        cons: '',
        createdAt: ''
      }))
    );

    await this.pool.query(
      `UPDATE company_profiles
       SET culture_scores = $1, updated_at = CURRENT_TIMESTAMP
       WHERE LOWER(name) = LOWER($2)`,
      [JSON.stringify(aggregates), cleanName]
    );

    return {
      id,
      companyName: cleanName,
      userId,
      role: val.data.role,
      rating: val.data.rating,
      workLifeBalance: val.data.workLifeBalance,
      compensationRating: val.data.compensationRating,
      careerGrowth: val.data.careerGrowth,
      managementRating: val.data.managementRating,
      recommend: val.data.recommend,
      pros: val.data.pros,
      cons: val.data.cons,
      advice: val.data.advice,
      createdAt: now.toISOString()
    };
  }

  async getSalaryBenchmarks(name: string): Promise<CompanySalaryBenchmarkDTO[]> {
    const profile = await this.getCompany(name);
    return profile.salaryBenchmarks;
  }

  async listSalaryContributions(name: string): Promise<{
    level: string;
    count: number;
    min: number;
    median: number;
    max: number;
  }[]> {
    await this.ensureTables();
    const rows = await this.pool.query<{ level: string; amounts: number[] }>(
      `SELECT level, array_agg(amount ORDER BY amount) AS amounts
       FROM company_salary_submissions
       WHERE lower(company_name) = lower($1)
       GROUP BY level`,
      [(name || '').trim()]
    );

    const order = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'];
    return rows.rows
      .map(row => {
        const amounts = (row.amounts || []).map(Number).filter(value => Number.isFinite(value));
        if (!amounts.length) return null;
        const mid = Math.floor(amounts.length / 2);
        const median = amounts.length % 2 === 0 ? Math.round((amounts[mid - 1] + amounts[mid]) / 2) : amounts[mid];
        return {
          level: row.level,
          count: amounts.length,
          min: amounts[0],
          median,
          max: amounts[amounts.length - 1]
        };
      })
      .filter((value): value is { level: string; count: number; min: number; median: number; max: number } => value !== null)
      .sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  }

  async addSalaryContribution(
    userId: string,
    name: string,
    input: { role: string; level: string; amount: number; currency?: string; isAnonymous?: boolean }
  ): Promise<{ id: string; duplicate: boolean }> {
    await this.ensureTables();
    const cleanName = (name || '').trim();
    if (!cleanName) fail(400, 'Tên công ty không được để trống.', 'invalid_request');

    const role = (input.role || '').trim();
    if (!role) fail(422, 'Cần nhập vị trí.', 'invalid_request', { role: 'Cần nhập vị trí.' });

    const allowedLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'];
    if (!allowedLevels.includes(input.level)) {
      fail(422, 'Cấp bậc chưa hợp lệ.', 'invalid_request', { level: `Cho phép: ${allowedLevels.join(', ')}.` });
    }

    const amount = Number(input.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 2_000_000_000) {
      fail(422, 'Mức lương chưa hợp lệ.', 'invalid_request', { amount: 'Phải là số nguyên dương (VND).' });
    }

    const id = randomUUID();
    const inserted = await this.pool.query(
      `INSERT INTO company_salary_submissions (id, company_name, user_id, role, level, amount, currency, is_anonymous)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, company_name, role, level) DO NOTHING
       RETURNING id`,
      [id, cleanName, userId, role, input.level, amount, input.currency === 'USD' ? 'USD' : 'VND', input.isAnonymous !== false]
    );

    return { id, duplicate: !inserted.rowCount };
  }
}
