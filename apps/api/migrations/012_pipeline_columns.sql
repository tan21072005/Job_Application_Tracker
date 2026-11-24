ALTER TABLE applications ADD COLUMN IF NOT EXISTS priority VARCHAR(32) NOT NULL DEFAULT 'target';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS applications_user_status_updated_idx
  ON applications(user_id, status_updated_at DESC);
