-- ============================================================
-- 06_batches.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- A batch is a delivery reference for a consumable item.
-- The actual quantity is tracked in inventory_balances, not here.
create table public.batches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  reference   text,
  notes       text,
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Indexes
create index on public.batches (company_id, item_id);

-- RLS
alter table public.batches enable row level security;

-- All company members can read batches
create policy "batches: read own company"
  on public.batches for select
  using (company_id = public.get_my_company_id());

-- Storekeepers, managers, and admins can create and update batches
create policy "batches: write if storekeeper or above"
  on public.batches for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );
