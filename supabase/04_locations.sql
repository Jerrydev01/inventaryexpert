-- ============================================================
-- 04_locations.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  type       public.location_type not null default 'other',
  parent_id  uuid references public.locations(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index on public.locations (company_id);
create index on public.locations (parent_id);

-- RLS
alter table public.locations enable row level security;

-- All company members can read locations
create policy "locations: read own company"
  on public.locations for select
  using (company_id = public.get_my_company_id());

-- Only managers and admins can create, update, or deactivate locations
create policy "locations: write if manager or admin"
  on public.locations for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );
