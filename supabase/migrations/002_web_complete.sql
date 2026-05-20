-- Migration 002: Web complete — NAV integration, invoice items, onboarding

-- Masters: NAV columns + onboarded flag
alter table masters
  add column if not exists onboarded boolean default false,
  add column if not exists nav_username text,
  add column if not exists nav_password_hash text,
  add column if not exists nav_signature_key text,
  add column if not exists nav_exchange_key text,
  add column if not exists nav_environment text default 'test';

-- Invoices: public token for shareable links
alter table invoices
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists completion_date date;

-- Backfill public_token for existing invoices
update invoices set public_token = gen_random_uuid() where public_token is null;

-- Unique index for public_token
create unique index if not exists idx_invoices_public_token on invoices(public_token);

-- Invoice items table (for invoices created independently, not via job)
create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade,
  master_id uuid references masters(id),
  description text not null,
  quantity numeric default 1,
  unit text default 'db',
  unit_price numeric not null,
  vat_rate integer default 27,
  total_net numeric generated always as (round(quantity * unit_price, 2)) stored,
  total_gross numeric generated always as (round(quantity * unit_price * (1 + vat_rate::numeric / 100), 2)) stored,
  sort_order integer default 0
);

create index if not exists idx_invoice_items_invoice on invoice_items(invoice_id);

-- RLS for invoice_items
alter table invoice_items enable row level security;

create policy "invoice_items_own" on invoice_items for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Public read access for invoice via token (no auth needed for public invoice view)
create policy "invoices_public_read" on invoices for select using (
  public_token is not null
);

-- Price list: ensure is_active default exists
alter table price_list alter column is_active set default true;

-- Quotes: add accepted_at and public token
alter table quotes
  add column if not exists public_token uuid default gen_random_uuid(),
  add column if not exists rejected_reason text;

create unique index if not exists idx_quotes_public_token on quotes(public_token);

-- Mark masters as onboarded if they already have a name set (existing users)
update masters set onboarded = true where name != '' and name != split_part(coalesce(email, ''), '@', 1);
