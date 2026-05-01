CREATE TABLE IF NOT EXISTS registrations (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  company             VARCHAR(255),
  whatsapp            VARCHAR(20)  NOT NULL,
  email               VARCHAR(255) NOT NULL,
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100) UNIQUE,
  amount              INTEGER      NOT NULL DEFAULT 9900,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at DESC);
