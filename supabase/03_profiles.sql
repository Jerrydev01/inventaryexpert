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

-- Auth bootstrap
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  company_name text;
  company_sector public.sector;
  new_company_id uuid;
begin
  company_name := nullif(btrim(new.raw_user_meta_data->>'company_name'), '');

  if company_name is null then
    raise exception 'company_name is required in raw_user_meta_data';
  end if;

  company_sector := coalesce(
    nullif(new.raw_user_meta_data->>'sector', '')::public.sector,
    'other'::public.sector
  );

  insert into public.companies (name, sector)
  values (company_name, company_sector)
  returning id into new_company_id;

  insert into public.profiles (id, company_id, role, full_name)
  values (
    new.id,
    new_company_id,
    'admin',
    nullif(new.raw_user_meta_data->>'full_name', '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- Now that profiles exists, admins can update their company details.
create policy "companies: admin update"
  on public.companies for update
  using (
    id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

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

-- Insert is handled server-side by the auth bootstrap trigger and any future
-- privileged onboarding flows. No client insert policy.
