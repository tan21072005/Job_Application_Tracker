ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL;

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS failed_reason text DEFAULT NULL;

ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_failed_reason_check;

ALTER TABLE payment_orders
  ADD CONSTRAINT payment_orders_failed_reason_check
  CHECK (failed_reason IS NULL OR failed_reason IN ('amount_mismatch'));
