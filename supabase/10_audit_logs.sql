-- ============================================================
-- 10_audit_logs.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Immutable log of security-relevant events (role changes, invitations,
-- plan changes, bulk deletes). Written by service role triggers or RPCs only.
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  action       text not null,         -- e.g. 'role_changed', 'member_removed'
  target_type  text,                  -- e.g. 'profile', 'item', 'subscription'
  target_id    uuid,
  payload      jsonb,                 -- before/after snapshot or extra context
  ip_address   inet,
  created_at   timestamptz not null default now()
);

-- Indexes
create index on public.audit_logs (company_id, created_at desc);
create index on public.audit_logs (actor_id);
create index on public.audit_logs (company_id, action);

-- RLS
alter table public.audit_logs enable row level security;

-- Only admins and managers see audit logs
create policy "audit_logs: read admin/manager"
  on public.audit_logs for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

-- Rows are inserted by service role (triggers / RPCs). No client insert policy.
