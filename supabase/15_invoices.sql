-- ============================================================
-- 15_invoices.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql,
--           14_clients.sql, 00_enums.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Invoice header. Line items live in 16_invoice_line_items.sql.
-- invoice_number is unique per company (invoice_number = e.g. "INV-0042").
create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies(id) on delete cascade,
  client_id      uuid references public.clients(id) on delete set null,
  invoice_number text not null,
  status         public.invoice_status not null default 'draft',
  issue_date     date not null default current_date,
  due_date       date,
  notes          text,
  currency       text not null default 'NGN',
  subtotal       numeric not null default 0 check (subtotal >= 0),
  tax_amount     numeric not null default 0 check (tax_amount >= 0),
  total          numeric not null default 0 check (total >= 0),
  paid_at        timestamptz,
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (company_id, invoice_number)
);

-- Indexes
create index on public.invoices (company_id, status);
create index on public.invoices (company_id, created_at desc);
create index on public.invoices (client_id) where client_id is not null;
create index on public.invoices (created_by);

-- RLS
alter table public.invoices enable row level security;

-- Admins and managers read invoices
create policy "invoices: read if manager or above"
  on public.invoices for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

-- Only admins and managers create, update, or delete invoices
create policy "invoices: write if manager or above"
  on public.invoices for all
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
