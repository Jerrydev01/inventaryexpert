-- ============================================================
-- 09_stock_transactions.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql,
--           04_locations.sql, 05_items.sql, 06_batches.sql, 07_assets.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Append-only ledger. All mutations go through transaction engine RPCs.
-- process_stock_in / process_stock_out / process_transfer /
-- process_return / process_adjustment — see milestone-3 spec.
create table public.stock_transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  transaction_type public.transaction_type not null,
  item_id          uuid not null references public.items(id),
  batch_id         uuid references public.batches(id) on delete set null,
  asset_id         uuid references public.assets(id) on delete set null,
  from_location_id uuid references public.locations(id) on delete set null,
  to_location_id   uuid references public.locations(id) on delete set null,
  quantity         numeric not null check (quantity > 0),
  unit_cost        numeric check (unit_cost >= 0),
  notes            text,
  reference_number text,
  performed_by     uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

-- Indexes
create index on public.stock_transactions (company_id, item_id);
create index on public.stock_transactions (company_id, created_at desc);
create index on public.stock_transactions (performed_by);
create index on public.stock_transactions (batch_id) where batch_id is not null;
create index on public.stock_transactions (asset_id) where asset_id is not null;

-- RLS
alter table public.stock_transactions enable row level security;

-- All company members can read the transaction ledger
create policy "transactions: read own company"
  on public.stock_transactions for select
  using (company_id = public.get_my_company_id());

-- Rows are inserted by the transaction engine RPCs (service role).
-- No client-side insert, update, or delete policy is ever created.
