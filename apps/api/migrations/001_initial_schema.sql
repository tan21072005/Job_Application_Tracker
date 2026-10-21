-- Migration 001: Initial JobTrack Schema (Frozen Immutable Snapshot)
-- Generated from docs/system-design/schema.sql for PostgreSQL 18
-- Applied within an isolated transaction and protected by advisory locks.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email varchar(254) NOT NULL,
  email_normalized varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (email_normalized = lower(btrim(email))),
  CHECK (length(email_normalized) > 3)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS sessions_owner_expiry_idx ON sessions (user_id, expires_at);

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company varchar(250) NOT NULL CHECK (length(btrim(company)) > 0),
  position varchar(250) NOT NULL CHECK (length(btrim(position)) > 0),
  url text,
  normalized_url text COLLATE "C",
  source varchar(128),
  source_normalized text COLLATE "C",
  job_code varchar(128),
  job_code_normalized text COLLATE "C",
  location varchar(250),
  work_mode text CHECK (work_mode IN ('On-site','Hybrid','Remote')),
  applied_at date,
  salary varchar(250),
  notes text CHECK (char_length(notes) <= 5000),
  next_action varchar(250),
  deadline_at timestamptz,
  status text NOT NULL DEFAULT 'Saved'
    CHECK (status IN ('Saved','Applied','Screening','Interview','Offer','Rejected','Withdrawn')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (deadline_at IS NULL OR length(btrim(COALESCE(next_action,''))) > 0),
  CHECK (normalized_url IS NULL OR
         (normalized_url ~ '^https?://' AND octet_length(normalized_url) <= 2048)),
  CHECK (source_normalized IS NULL OR
         (octet_length(source_normalized) BETWEEN 1 AND 256)),
  CHECK (job_code_normalized IS NULL OR
         (octet_length(job_code_normalized) BETWEEN 1 AND 256)),
  CHECK ((NULLIF(btrim(url),'') IS NULL) = (normalized_url IS NULL)),
  CHECK ((NULLIF(btrim(source),'') IS NULL) = (source_normalized IS NULL)),
  CHECK ((NULLIF(btrim(job_code),'') IS NULL) = (job_code_normalized IS NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS applications_active_url_uq
  ON applications (user_id, normalized_url)
  WHERE status IN ('Saved','Applied','Screening','Interview','Offer')
    AND normalized_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS applications_active_source_code_uq
  ON applications (user_id, source_normalized, job_code_normalized)
  WHERE status IN ('Saved','Applied','Screening','Interview','Offer')
    AND source_normalized IS NOT NULL AND job_code_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS applications_owner_created_idx
  ON applications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS applications_owner_status_created_idx
  ON applications (user_id, status, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS applications_owner_applied_idx
  ON applications (user_id, applied_at DESC NULLS LAST, id DESC);

CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  title varchar(200) NOT NULL CHECK (length(btrim(title)) > 0),
  at timestamptz NOT NULL,
  timezone varchar(100) NOT NULL CHECK (length(btrim(timezone)) > 0),
  format text NOT NULL CHECK (format IN ('Online','Phone','On-site','Other')),
  location text CHECK (char_length(location) <= 2000),
  preparation text CHECK (char_length(preparation) <= 5000),
  notes text CHECK (char_length(notes) <= 5000),
  status text NOT NULL DEFAULT 'Scheduled'
    CHECK (status IN ('Scheduled','Completed','Cancelled')),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS interviews_application_at_idx ON interviews (application_id, at, id);
CREATE INDEX IF NOT EXISTS interviews_upcoming_idx ON interviews (application_id, at)
  WHERE status = 'Scheduled';

CREATE TABLE IF NOT EXISTS idempotency_requests (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope varchar(160) NOT NULL,
  key uuid NOT NULL,
  request_hash bytea NOT NULL CHECK (octet_length(request_hash) = 32),
  response_status integer NOT NULL CHECK (response_status BETWEEN 200 AND 299),
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, scope, key),
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idempotency_expiry_idx ON idempotency_requests (expires_at);
