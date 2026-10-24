import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  type CompanyProfileDTO,
  type CompanyReviewDTO,
  type CompanySalaryBenchmarkDTO,
  calculateCompanyAggregates,
  validateCompanyReviewInput,
  synthesizeCompanyIntelligence
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

    const profRes = await this.pool.query<{
      name: string;
      industry: string;
      size: string;
      headquarters: string;
      website: string;
      logo_url: string | null;
      description: string;
      tech_stack: any;
      culture_scores: any;
      salary_benchmarks: any;
      interview_questions: any;
      key_pros: any;
      key_red_flags: any;
      updated_at: Date;
    }>(
      `SELECT name, industry, size, headquarters, website, logo_url, description,
              tech_stack, culture_scores, salary_benchmarks, interview_questions,
              key_pros, key_red_flags, updated_at
       FROM company_profiles
       WHERE LOWER(name) = LOWER($1)`,
      [cleanName]
    );

    let profile: CompanyProfileDTO;

    if (profRes.rows[0]) {
      const row = profRes.rows[0];
      profile = {
        name: row.name,
        industry: row.industry,
        size: row.size,
        headquarters: row.headquarters,
        website: row.website,
        logoUrl: row.logo_url || undefined,
        description: row.description,
        techStack: Array.isArray(row.tech_stack) ? row.tech_stack : [],
        cultureScores: row.culture_scores || {},
        salaryBenchmarks: Array.isArray(row.salary_benchmarks) ? row.salary_benchmarks : [],
        interviewQuestions: Array.isArray(row.interview_questions) ? row.interview_questions : [],
        recentReviews: userReviews,
        keyPros: Array.isArray(row.key_pros) ? row.key_pros : [],
        keyRedFlags: Array.isArray(row.key_red_flags) ? row.key_red_flags : [],
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at)
      };
    } else {
      const synthesized = synthesizeCompanyIntelligence(cleanName);
      await this.pool.query(
        `INSERT INTO company_profiles (name, industry, size, headquarters, website, logo_url, description,
                                      tech_stack, culture_scores, salary_benchmarks, interview_questions,
                                      key_pros, key_red_flags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (name) DO NOTHING`,
        [
          synthesized.name,
          synthesized.industry,
          synthesized.size,
          synthesized.headquarters,
          synthesized.website,
          synthesized.logoUrl || null,
          synthesized.description,
          JSON.stringify(synthesized.techStack),
          JSON.stringify(synthesized.cultureScores),
          JSON.stringify(synthesized.salaryBenchmarks),
          JSON.stringify(synthesized.interviewQuestions),
          JSON.stringify(synthesized.keyPros),
          JSON.stringify(synthesized.keyRedFlags)
        ]
      );
      profile = synthesized;
    }

    if (userReviews.length > 0) {
      profile.cultureScores = calculateCompanyAggregates(userReviews);
      profile.recentReviews = userReviews;
    }

    return profile;
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
}
