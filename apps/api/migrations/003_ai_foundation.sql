-- Migration 003: AI Full Control Foundation (Soft-delete trash, AI Grants, AI Commands, AI Runs)
-- Applied within an isolated transaction and protected by advisory locks.

-- 1. Add deleted_at for 30-day trash recovery on applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS applications_owner_deleted_idx
  ON applications (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. AI Grants: scoped API keys / MCP tokens tied to an owner
CREATE TABLE IF NOT EXISTS ai_grants (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client varchar(64) NOT NULL,
  token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['full_control'],
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS ai_grants_user_idx
  ON ai_grants (user_id, expires_at)
  WHERE revoked_at IS NULL;

-- 3. AI Commands: audit receipts and reversible actions
CREATE TABLE IF NOT EXISTS ai_commands (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client varchar(64) NOT NULL,
  command varchar(64) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'succeeded',
  input_payload jsonb NOT NULL,
  result_payload jsonb DEFAULT NULL,
  error_message text DEFAULT NULL,
  rollback_payload jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_commands_user_created_idx
  ON ai_commands (user_id, created_at DESC);

-- 4. AI Runs: execution session metadata
CREATE TABLE IF NOT EXISTS ai_runs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client varchar(64) NOT NULL,
  session_id varchar(128) DEFAULT NULL,
  status varchar(32) NOT NULL DEFAULT 'completed',
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ai_runs_user_created_idx
  ON ai_runs (user_id, created_at DESC);
