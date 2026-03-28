-- ============================================================
-- 07_assets.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql, 02_companies.sql, 04_locations.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- One row per individual tracked asset (is_tracked_asset = true on the item).
-- Assets have no quantity — they are always count 1.
-- Their current location is tracked by location_id and their state by status.
create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  serial_number text,
  status        public.asset_status not null default 'available',
  location_id   uuid references public.locations(id) on delete set null,
  image_path    text,  -- Supabase Storage path: assets/{company_id}/{asset_id}/photo.webp
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index on public.assets (company_id, item_id);
create index on public.assets (location_id);

-- RLS
alter table public.assets enable row level security;

-- All company members can read assets
create policy "assets: read own company"
  on public.assets for select
  using (company_id = public.get_my_company_id());

-- Storekeepers, managers, and admins can create and update assets
create policy "assets: write if storekeeper or above"
  on public.assets for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );
