-- ============================================================
-- 08_inventory_balances.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 04_locations.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- One row per (company, item, location) triplet.
-- Updated atomically by the transaction engine RPCs only.
-- Never written to directly from client code.
create table public.inventory_balances (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity    numeric not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  unique (company_id, item_id, location_id)
);

-- Indexes
create index on public.inventory_balances (company_id, item_id);
create index on public.inventory_balances (company_id, location_id);

-- RLS
alter table public.inventory_balances enable row level security;

-- All company members can read balances
create policy "balances: read own company"
  on public.inventory_balances for select
  using (company_id = public.get_my_company_id());

-- Balances are written by the transaction engine via service role (RPC functions).
-- No direct client write policy is created.
