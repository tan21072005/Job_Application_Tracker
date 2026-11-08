CREATE TABLE IF NOT EXISTS oauth_identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider varchar(32) NOT NULL CHECK (provider IN ('google')),
  subject varchar(255) NOT NULL,
  email varchar(254) NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, subject)
);

CREATE INDEX IF NOT EXISTS oauth_identities_user_idx
  ON oauth_identities (user_id);

ALTER TABLE users
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_password_hash_check;

ALTER TABLE users
  ADD CONSTRAINT users_password_hash_check
  CHECK (password_hash IS NULL OR password_hash LIKE '$argon2id$%');

CREATE TABLE IF NOT EXISTS oauth_login_states (
  id uuid PRIMARY KEY,
  state_hash char(64) NOT NULL UNIQUE,
  code_verifier varchar(128) NOT NULL,
  redirect_path varchar(255) NOT NULL DEFAULT '/',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS oauth_login_states_expiry_idx
  ON oauth_login_states (expires_at)
  WHERE consumed_at IS NULL;
