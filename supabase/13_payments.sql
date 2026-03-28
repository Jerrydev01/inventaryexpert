-- ============================================================
-- 13_payments.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 12_subscriptions.sql, 00_enums.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Immutable record of every successful payment event received from
-- Paystack or Stripe webhooks. The subscription row is updated separately.
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies(id) on delete cascade,
  subscription_id    uuid references public.subscriptions(id) on delete set null,
  payment_provider   text not null,        -- 'paystack' | 'stripe'
  provider_ref       text not null unique, -- provider-side transaction / payment intent id
  amount_kobo        bigint not null check (amount_kobo > 0), -- smallest currency unit
  currency           text not null default 'NGN',
  status             text not null,        -- 'success' | 'failed' | 'refunded'
  paid_at            timestamptz,
  metadata           jsonb,               -- raw webhook payload for audit
  created_at         timestamptz not null default now()
);

-- Indexes
create index on public.payments (company_id, created_at desc);
create index on public.payments (provider_ref);
create index on public.payments (subscription_id);

-- RLS
alter table public.payments enable row level security;

-- Only admins can view payment history
create policy "payments: read admin only"
  on public.payments for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Rows are inserted by service role (payment webhook handler). No client insert policy.
