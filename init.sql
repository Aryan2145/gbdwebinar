CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  label      VARCHAR(255) NOT NULL,
  date_str   VARCHAR(100) NOT NULL,
  time_str   VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrations (
  id                  SERIAL PRIMARY KEY,
  name                VARCHAR(255) NOT NULL,
  company             VARCHAR(255),
  designation         VARCHAR(255),
  industry            VARCHAR(255),
  whatsapp            VARCHAR(20)  NOT NULL,
  email               VARCHAR(255) NOT NULL,
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100) UNIQUE,
  amount              INTEGER      NOT NULL DEFAULT 9900,
  session_id          INTEGER      REFERENCES sessions(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON registrations (created_at DESC);

INSERT INTO sessions (label, date_str, time_str) VALUES
  ('Sunday Morning', '3 May 2026', '11:00 AM – 12:00 PM IST'),
  ('Tuesday Evening', '5 May 2026', '7:00 PM – 8:00 PM IST'),
  ('Wednesday Evening', '6 May 2026', '7:00 PM – 8:00 PM IST')
ON CONFLICT DO NOTHING;
