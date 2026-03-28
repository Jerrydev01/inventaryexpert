-- ============================================================
-- 02_companies.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
create table public.companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  sector     public.sector not null,
  logo_path  text,  -- Supabase Storage path: logos/{company_id}/logo.webp
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No index needed — primary key only. Looked up by id from profiles.

-- RLS
alter table public.companies enable row level security;

-- Users can read their own company only
create policy "companies: read own"
  on public.companies for select
  using (id = public.get_my_company_id());

-- Only admins can update company details
create policy "companies: admin update"
  on public.companies for update
  using (
    id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insert is handled server-side via service role during onboarding only.
-- No client insert policy.
