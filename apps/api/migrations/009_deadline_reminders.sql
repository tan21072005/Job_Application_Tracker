
CREATE TABLE IF NOT EXISTS deadline_reminders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

  bucket varchar(16) NOT NULL CHECK (bucket IN ('T-7', 'T-3', 'T-1', 'due')),

  deadline_snapshot timestamptz NOT NULL,

  sent_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  transport varchar(16) NOT NULL,
  message_id text,

  UNIQUE (application_id, bucket, deadline_snapshot)
);

CREATE INDEX IF NOT EXISTS idx_deadline_reminders_user
  ON deadline_reminders (user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_deadline_reminders_app
  ON deadline_reminders (application_id);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_applications_deadline
  ON applications (deadline_at)
  WHERE deadline_at IS NOT NULL AND reminders_enabled = true;
