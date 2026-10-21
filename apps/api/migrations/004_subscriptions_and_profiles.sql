-- Migration 004: Job Subscriptions & Candidate Profiles (Phase 4 & Phase 5)

-- 1. Job Subscriptions for Batch Alert Crawler
CREATE TABLE IF NOT EXISTS job_subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  keywords text[] NOT NULL DEFAULT ARRAY[]::text[],
  location text DEFAULT NULL,
  min_salary numeric DEFAULT NULL,
  sources text[] NOT NULL DEFAULT ARRAY['rss', 'public_board']::text[],
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS job_subscriptions_user_active_idx
  ON job_subscriptions (user_id, is_active);

-- 2. Candidate Profiles for Assisted Auto-Apply
CREATE TABLE IF NOT EXISTS candidate_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT NULL,
  cv_url text DEFAULT NULL,
  portfolio_url text DEFAULT NULL,
  skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  bio text DEFAULT NULL,
  custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
