CREATE TABLE IF NOT EXISTS application_follow_up_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind varchar(16) NOT NULL CHECK (kind IN ('followed_up','dismissed','ghosted','reopened')),
  note varchar(500),
  occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fu_events_app
  ON application_follow_up_events (application_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_fu_events_user
  ON application_follow_up_events (user_id, occurred_at DESC);
