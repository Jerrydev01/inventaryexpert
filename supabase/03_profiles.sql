-- ============================================================
-- 03_profiles.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql, 02_companies.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- id matches auth.users.id — no surrogate key needed.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  role         public.user_role not null default 'worker',
  full_name    text,
  avatar_path  text,  -- Supabase Storage path: avatars/{user_id}/avatar.webp
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Indexes
create index on public.profiles (company_id);

-- RLS
alter table public.profiles enable row level security;

-- All members of a company can read each other's profiles
create policy "profiles: read own company"
  on public.profiles for select
  using (company_id = public.get_my_company_id());

-- Users can update their own profile (name, etc.)
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid());

-- Admins can update any profile in their company (role changes, deactivation)
create policy "profiles: admin update any"
  on public.profiles for update
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insert is handled server-side via service role during onboarding only.
-- No client insert policy.
