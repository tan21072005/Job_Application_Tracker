-- Migration 006: Universal Datasets, Records, and Usage Ledgers (PageWeave Data Platform)

CREATE TABLE IF NOT EXISTS datasets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT NULL,
  category text NOT NULL DEFAULT 'custom' CHECK (category IN ('product_research', 'research_notes', 'company_list', 'jobtrack', 'custom')),
  schema_version integer NOT NULL DEFAULT 1,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dataset_records (
  id uuid PRIMARY KEY,
  dataset_id uuid NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text DEFAULT NULL,
  source_title text DEFAULT NULL,
  captured_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  provenance jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usage_ledgers (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('ai_transform', 'data_capture', 'export_dataset')),
  units integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS datasets_user_idx ON datasets (user_id, category);
CREATE INDEX IF NOT EXISTS dataset_records_dataset_idx ON dataset_records (dataset_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dataset_records_user_idx ON dataset_records (user_id);
CREATE INDEX IF NOT EXISTS usage_ledgers_user_idx ON usage_ledgers (user_id, created_at DESC);
