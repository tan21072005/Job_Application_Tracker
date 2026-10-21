-- Migration 005: Pro Memberships & Payment Orders (Commercial Pro Tier & VietQR)

CREATE TABLE IF NOT EXISTS user_memberships (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  pro_expires_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('monthly', 'quarterly', 'yearly')),
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'VND',
  transfer_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_method text NOT NULL DEFAULT 'vietqr',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS payment_orders_user_idx ON payment_orders (user_id, status);
CREATE INDEX IF NOT EXISTS payment_orders_code_idx ON payment_orders (transfer_code);
