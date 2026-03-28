-- ============================================================
-- 11_qr_codes.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 00_enums.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Stores the canonical QR payload for every scannable entity.
-- Payload format: "inv:batch:{uuid}" or "inv:asset:{uuid}"
-- The record_id column mirrors the batch or asset UUID for direct lookups.
create table public.qr_codes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  record_type public.qr_record_type not null,
  record_id   uuid not null,
  payload     text not null unique,
  created_at  timestamptz not null default now()
);

-- Indexes
create index on public.qr_codes (company_id, record_type, record_id);
create index on public.qr_codes (payload);  -- already unique, but explicit for scan lookups

-- RLS
alter table public.qr_codes enable row level security;

create policy "qr_codes: read own company"
  on public.qr_codes for select
  using (company_id = public.get_my_company_id());

create policy "qr_codes: insert if storekeeper or above"
  on public.qr_codes for insert
  with check (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager', 'storekeeper')
    )
  );

-- Only admins/managers delete QR codes (decommissioning)
create policy "qr_codes: delete if manager or above"
  on public.qr_codes for delete
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );
