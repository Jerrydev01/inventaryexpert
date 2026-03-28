-- ============================================================
-- 14_clients.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Clients that a company bills via invoices.
-- Scoped to the company; never shared across tenants.
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  email       text,
  phone       text,
  address     text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Indexes
create index on public.clients (company_id);
create index on public.clients (company_id, is_active);

-- RLS
alter table public.clients enable row level security;

-- All company members can look up clients (needed when creating invoices)
create policy "clients: read own company"
  on public.clients for select
  using (company_id = public.get_my_company_id());

-- Only admins and managers may create, update, or delete clients
create policy "clients: write if manager or above"
  on public.clients for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  )
  with check (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );
