CREATE TABLE IF NOT EXISTS company_profiles (
  name varchar(255) PRIMARY KEY,
  industry varchar(255) NOT NULL DEFAULT '',
  size varchar(100) NOT NULL DEFAULT '',
  headquarters varchar(255) NOT NULL DEFAULT '',
  website varchar(500) NOT NULL DEFAULT '',
  logo_url varchar(500),
  description text NOT NULL DEFAULT '',
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

ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enrichment_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wikidata_id varchar(32),
  ADD COLUMN IF NOT EXISTS places_id varchar(255),
  ADD COLUMN IF NOT EXISTS places_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS places_rating_count integer,
  ADD COLUMN IF NOT EXISTS places_fetched_at timestamptz;

ALTER TABLE company_profiles
  ALTER COLUMN industry SET DEFAULT '',
  ALTER COLUMN size SET DEFAULT '',
  ALTER COLUMN headquarters SET DEFAULT '',
  ALTER COLUMN website SET DEFAULT '',
  ALTER COLUMN description SET DEFAULT '';

CREATE TABLE IF NOT EXISTS company_salary_submissions (
  id uuid PRIMARY KEY,
  company_name varchar(255) NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role varchar(255) NOT NULL,
  level varchar(32) NOT NULL CHECK (level IN ('Junior','Mid','Senior','Lead','Principal')),
  amount integer NOT NULL CHECK (amount > 0),
  currency varchar(8) NOT NULL DEFAULT 'VND',
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_salary_unique_submission UNIQUE (user_id, company_name, role, level)
);

CREATE INDEX IF NOT EXISTS company_salary_company_idx
  ON company_salary_submissions (lower(company_name), level);

DELETE FROM company_profiles
WHERE culture_scores->>'totalReviews' = '24'
  AND website ~* '^https?://cngty';
