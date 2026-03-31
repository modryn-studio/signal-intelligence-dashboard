-- Signal Intelligence Dashboard — Neon schema
-- Run this once in the Neon SQL editor (or psql) before first deploy.

CREATE TABLE IF NOT EXISTS signal_inputs (
  id              SERIAL PRIMARY KEY,
  date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  source          TEXT        NOT NULL,
  source_category TEXT        NOT NULL,   -- 'trends' | 'complaints' | 'indie' | 'data'
  title           TEXT        NOT NULL,
  url             TEXT,
  notes           TEXT,
  tags            TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observations (
  id                SERIAL PRIMARY KEY,
  date              DATE        NOT NULL DEFAULT CURRENT_DATE,
  title             TEXT        NOT NULL,
  body              TEXT        NOT NULL,
  related_input_ids INT[]       NOT NULL DEFAULT '{}',
  tags              TEXT[]      NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contrarian_truths (
  id                      SERIAL PRIMARY KEY,
  date                    DATE        NOT NULL DEFAULT CURRENT_DATE,
  thesis                  TEXT        NOT NULL,
  supporting_observations INT[]       NOT NULL DEFAULT '{}',
  conviction_level        INT         NOT NULL DEFAULT 1 CHECK (conviction_level BETWEEN 1 AND 5),
  status                  TEXT        NOT NULL DEFAULT 'forming',  -- 'forming' | 'validated' | 'invalidated'
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_digests (
  id                 SERIAL PRIMARY KEY,
  recipient_email    TEXT        NOT NULL,
  digest_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  inputs_count       INT         NOT NULL DEFAULT 0,
  observations_count INT         NOT NULL DEFAULT 0,
  status             TEXT        NOT NULL DEFAULT 'sent',
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
