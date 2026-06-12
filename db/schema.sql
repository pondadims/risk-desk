CREATE TABLE IF NOT EXISTS account (
  id              INT         PRIMARY KEY DEFAULT 1,
  starting_balance NUMERIC    NOT NULL DEFAULT 0,
  default_risk_pct NUMERIC    NOT NULL DEFAULT 2,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Ensure exactly one account row always exists
INSERT INTO account (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS trades (
  id          BIGSERIAL   PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  pair        TEXT        NOT NULL,
  direction   TEXT        NOT NULL,
  entry       NUMERIC     NOT NULL,
  sl          NUMERIC     NOT NULL,
  tp          NUMERIC,
  leverage    INTEGER     NOT NULL,
  position    NUMERIC     NOT NULL,
  coins       NUMERIC     NOT NULL,
  margin      NUMERIC     NOT NULL,
  risk        NUMERIC     NOT NULL,
  rr          NUMERIC,
  status      TEXT        NOT NULL DEFAULT 'Pending',
  pl          NUMERIC
);

CREATE INDEX IF NOT EXISTS trades_created_idx ON trades (created_at DESC);
