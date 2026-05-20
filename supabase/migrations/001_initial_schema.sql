-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Felhasználók (mesteremberek)
create table masters (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id) on delete cascade,
  name text not null,
  trade text not null,
  phone text,
  email text,
  company_name text,
  tax_number text,
  tax_type text default 'afa_kotes',
  bank_account text,
  address text,
  city text,
  logo_url text,
  subscription_tier text default 'free',
  subscription_expires_at timestamptz,
  trial_expires_at timestamptz,
  jobs_this_month integer default 0,
  nav_token text,
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  city text,
  tax_number text,
  notes text,
  jobs_count integer default 0,
  total_revenue numeric default 0,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  client_id uuid references clients(id),
  title text not null,
  description text,
  status text default 'new',
  trade text,
  address text,
  city text,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  estimated_hours numeric,
  actual_hours numeric,
  photos text[],
  before_photos text[],
  after_photos text[],
  notes text,
  ai_transcript text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  master_id uuid references masters(id),
  type text default 'work',
  description text not null,
  quantity numeric default 1,
  unit text default 'db',
  unit_price numeric not null,
  vat_rate integer default 27,
  total_net numeric,
  total_gross numeric,
  sort_order integer default 0
);

create table quotes (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  client_id uuid references clients(id),
  job_id uuid references jobs(id),
  quote_number text not null,
  status text default 'draft',
  valid_until date,
  notes text,
  total_net numeric,
  total_vat numeric,
  total_gross numeric,
  accepted_at timestamptz,
  accepted_signature text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  client_id uuid references clients(id),
  job_id uuid references jobs(id),
  quote_id uuid references quotes(id),
  invoice_number text not null,
  status text default 'draft',
  issue_date date default current_date,
  due_date date,
  payment_method text default 'transfer',
  notes text,
  total_net numeric,
  total_vat numeric,
  total_gross numeric,
  paid_at timestamptz,
  nav_id text,
  nav_status text,
  pdf_url text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table appointments (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  job_id uuid references jobs(id),
  client_id uuid references clients(id),
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  address text,
  notes text,
  reminder_sent boolean default false,
  google_event_id text,
  created_at timestamptz default now()
);

create table team_members (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  role text default 'technician',
  auth_id uuid references auth.users(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table price_list (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id) on delete cascade,
  name text not null,
  description text,
  type text default 'work',
  unit text default 'db',
  unit_price numeric not null,
  vat_rate integer default 27,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table subscription_events (
  id uuid primary key default gen_random_uuid(),
  master_id uuid references masters(id),
  event_type text not null,
  tier text,
  amount numeric,
  stripe_payment_intent_id text,
  created_at timestamptz default now()
);

-- Indexes
create index idx_jobs_master_status_scheduled on jobs(master_id, status, scheduled_at);
create index idx_invoices_master_status_created on invoices(master_id, status, created_at);
create index idx_clients_master_name on clients(master_id, name);
create index idx_appointments_master_start on appointments(master_id, start_at);

-- RLS
alter table masters enable row level security;
alter table clients enable row level security;
alter table jobs enable row level security;
alter table job_items enable row level security;
alter table quotes enable row level security;
alter table invoices enable row level security;
alter table appointments enable row level security;
alter table team_members enable row level security;
alter table price_list enable row level security;
alter table subscription_events enable row level security;

-- Masters: own row only
create policy "masters_own" on masters for all using (auth_id = auth.uid());

-- Clients: master sees own
create policy "clients_own" on clients for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Jobs
create policy "jobs_own" on jobs for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Job items
create policy "job_items_own" on job_items for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Quotes
create policy "quotes_own" on quotes for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Invoices
create policy "invoices_own" on invoices for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Appointments
create policy "appointments_own" on appointments for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Team members
create policy "team_own" on team_members for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Price list
create policy "price_list_own" on price_list for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Subscription events
create policy "sub_events_own" on subscription_events for all using (
  master_id in (select id from masters where auth_id = auth.uid())
);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger masters_updated_at before update on masters
  for each row execute function update_updated_at();

create trigger jobs_updated_at before update on jobs
  for each row execute function update_updated_at();
