-- Migration 002: Distributed Atomic Rate Limiter Table
CREATE TABLE IF NOT EXISTS rate_limits (
  key varchar(128) PRIMARY KEY,
  count integer NOT NULL DEFAULT 1 CHECK (count >= 1),
  reset_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits (reset_at);
