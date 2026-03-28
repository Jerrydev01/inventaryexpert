-- ============================================================
-- 05_items.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  sku              text,
  unit             text not null default 'unit',
  category         text,
  description      text,
  image_path       text,  -- Supabase Storage path: items/{company_id}/{item_id}/cover.webp
  is_tracked_asset boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (company_id, sku)
);

-- is_tracked_asset = false → consumable tracked by batch and balance
-- is_tracked_asset = true  → serialised asset tracked individually via the assets table

-- Indexes
create index on public.items (company_id);

-- RLS
alter table public.items enable row level security;

-- All company members can read the item catalogue
create policy "items: read own company"
  on public.items for select
  using (company_id = public.get_my_company_id());

-- Only managers and admins can create, update, or deactivate items
create policy "items: write if manager or admin"
  on public.items for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );
