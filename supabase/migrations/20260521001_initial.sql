-- MesterAI — full schema migration (safe to re-run: IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
-- Run this in the Supabase SQL editor or via `npx supabase db push`

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- MASTERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS masters (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  trade           TEXT NOT NULL DEFAULT 'általános',
  phone           TEXT,
  email           TEXT,
  company_name    TEXT,
  tax_number      TEXT,
  tax_type        TEXT DEFAULT 'afa_kotes',
  address         TEXT,
  bank_account    TEXT,
  subscription_tier        TEXT DEFAULT 'free',
  subscription_expires_at  TIMESTAMPTZ,
  trial_expires_at         TIMESTAMPTZ,
  onboarded       BOOLEAN DEFAULT FALSE,
  nav_username    TEXT,
  nav_password_hash TEXT,
  nav_signature_key TEXT,
  nav_exchange_key  TEXT,
  nav_environment TEXT DEFAULT 'test',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE masters ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE masters ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT FALSE;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS nav_username TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS nav_password_hash TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS nav_signature_key TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS nav_exchange_key TEXT;
ALTER TABLE masters ADD COLUMN IF NOT EXISTS nav_environment TEXT DEFAULT 'test';

-- ─────────────────────────────────────────────
-- CLIENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  phone     TEXT,
  email     TEXT,
  address   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- JOBS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'new',
  address     TEXT,
  scheduled_at TIMESTAMPTZ,
  photos      TEXT[],
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- JOB_ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'db',
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 27,
  total_net   NUMERIC NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INVOICES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id       UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES jobs(id) ON DELETE SET NULL,
  invoice_number  TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft',
  issue_date      DATE,
  completion_date DATE,
  due_date        DATE,
  payment_method  TEXT,
  notes           TEXT,
  total_net       NUMERIC DEFAULT 0,
  total_vat       NUMERIC DEFAULT 0,
  total_gross     NUMERIC DEFAULT 0,
  nav_id          TEXT,
  nav_status      TEXT,
  public_token    TEXT DEFAULT encode(gen_random_bytes(16), 'hex'),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS nav_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS nav_status TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS public_token TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- INVOICE_ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'db',
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 27,
  total_net   NUMERIC NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- QUOTES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotes (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id    UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  quote_number TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft',
  valid_until  DATE,
  notes        TEXT,
  total_net    NUMERIC DEFAULT 0,
  total_vat    NUMERIC DEFAULT 0,
  total_gross  NUMERIC DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- QUOTE_ITEMS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quote_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    NUMERIC NOT NULL DEFAULT 1,
  unit        TEXT NOT NULL DEFAULT 'db',
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 27,
  total_net   NUMERIC NOT NULL DEFAULT 0,
  total_gross NUMERIC NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- PRICE_LIST
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_list (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id   UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  type        TEXT DEFAULT 'work',
  unit        TEXT NOT NULL DEFAULT 'db',
  unit_price  NUMERIC NOT NULL DEFAULT 0,
  vat_rate    INTEGER NOT NULL DEFAULT 27,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id    UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  client_id    UUID REFERENCES clients(id) ON DELETE SET NULL,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TEAM_MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  master_id UUID NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  phone     TEXT,
  email     TEXT,
  role      TEXT DEFAULT 'worker',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- ENABLE RLS
-- ─────────────────────────────────────────────
ALTER TABLE masters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- RLS POLICIES — MASTERS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "masters_select_own" ON masters;
DROP POLICY IF EXISTS "masters_insert_own" ON masters;
DROP POLICY IF EXISTS "masters_update_own" ON masters;
DROP POLICY IF EXISTS "masters_delete_own" ON masters;

CREATE POLICY "masters_select_own" ON masters FOR SELECT USING (auth.uid() = auth_id);
CREATE POLICY "masters_insert_own" ON masters FOR INSERT WITH CHECK (auth.uid() = auth_id);
CREATE POLICY "masters_update_own" ON masters FOR UPDATE USING (auth.uid() = auth_id);
CREATE POLICY "masters_delete_own" ON masters FOR DELETE USING (auth.uid() = auth_id);

-- ─────────────────────────────────────────────
-- RLS POLICIES — CLIENTS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "clients_all_own" ON clients;
CREATE POLICY "clients_all_own" ON clients FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — JOBS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "jobs_all_own" ON jobs;
CREATE POLICY "jobs_all_own" ON jobs FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — JOB_ITEMS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "job_items_all_own" ON job_items;
CREATE POLICY "job_items_all_own" ON job_items FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — INVOICES
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "invoices_all_own" ON invoices;
DROP POLICY IF EXISTS "invoices_public_read" ON invoices;

CREATE POLICY "invoices_all_own" ON invoices FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

CREATE POLICY "invoices_public_read" ON invoices FOR SELECT
  USING (public_token IS NOT NULL);

-- ─────────────────────────────────────────────
-- RLS POLICIES — INVOICE_ITEMS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "invoice_items_all_own" ON invoice_items;
CREATE POLICY "invoice_items_all_own" ON invoice_items FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — QUOTES
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes_all_own" ON quotes;
CREATE POLICY "quotes_all_own" ON quotes FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — QUOTE_ITEMS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "quote_items_all_own" ON quote_items;
CREATE POLICY "quote_items_all_own" ON quote_items FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — PRICE_LIST
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "price_list_all_own" ON price_list;
CREATE POLICY "price_list_all_own" ON price_list FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — APPOINTMENTS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "appointments_all_own" ON appointments;
CREATE POLICY "appointments_all_own" ON appointments FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- RLS POLICIES — TEAM_MEMBERS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "team_members_all_own" ON team_members;
CREATE POLICY "team_members_all_own" ON team_members FOR ALL
  USING (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()))
  WITH CHECK (master_id IN (SELECT id FROM masters WHERE auth_id = auth.uid()));

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_masters_auth_id        ON masters(auth_id);
CREATE INDEX IF NOT EXISTS idx_clients_master_id      ON clients(master_id);
CREATE INDEX IF NOT EXISTS idx_jobs_master_id         ON jobs(master_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id         ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_at      ON jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_job_items_job_id       ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_master_id     ON invoices(master_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id     ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at       ON invoices(paid_at);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice  ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_quotes_master_id       ON quotes(master_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id   ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_price_list_master_id   ON price_list(master_id);
