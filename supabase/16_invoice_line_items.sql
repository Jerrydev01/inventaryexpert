-- ============================================================
-- 16_invoice_line_items.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 05_items.sql,
--           09_stock_transactions.sql, 15_invoices.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Each row is one line on an invoice.
-- When an invoice is auto-generated from a stock_out RPC, the
-- stock_transaction_id FK is populated to preserve the link.
create table public.invoice_line_items (
  id                   uuid primary key default gen_random_uuid(),
  invoice_id           uuid not null references public.invoices(id) on delete cascade,
  company_id           uuid not null references public.companies(id) on delete cascade,
  item_id              uuid references public.items(id) on delete set null,
  stock_transaction_id uuid references public.stock_transactions(id) on delete set null,
  description          text not null,
  quantity             numeric not null check (quantity > 0),
  unit_price           numeric not null check (unit_price >= 0),
  total                numeric not null check (total >= 0),
  created_at           timestamptz not null default now()
);

-- Indexes
create index on public.invoice_line_items (invoice_id);
create index on public.invoice_line_items (company_id);
create index on public.invoice_line_items (item_id) where item_id is not null;
create index on public.invoice_line_items (stock_transaction_id) where stock_transaction_id is not null;

-- RLS
alter table public.invoice_line_items enable row level security;

-- Line items inherit the same read/write access as their parent invoice:
-- admins and managers only.
create policy "invoice_line_items: read if manager or above"
  on public.invoice_line_items for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

create policy "invoice_line_items: write if manager or above"
  on public.invoice_line_items for all
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
