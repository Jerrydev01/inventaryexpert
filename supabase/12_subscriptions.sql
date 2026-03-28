-- ============================================================
-- 12_subscriptions.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 00_enums.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- One row per company. Managed by the payment webhook (service role).
-- plan_type drives feature gates across the web and mobile apps.
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  plan_type           public.plan_type not null default 'free',
  payment_provider    text,                            -- 'paystack' | 'stripe'
  provider_plan_code  text,                            -- provider-side plan identifier
  provider_sub_id     text,                            -- provider-side subscription id
  status              text not null default 'active',  -- 'active' | 'past_due' | 'cancelled'
  current_period_end  timestamptz,
  seats               integer not null default 3,
  cancel_at_period_end boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (company_id)
);

-- Indexes
create index on public.subscriptions (company_id);
create index on public.subscriptions (provider_sub_id) where provider_sub_id is not null;

-- RLS
alter table public.subscriptions enable row level security;

-- All company members can read their subscription (needed for feature gate checks)
create policy "subscriptions: read own company"
  on public.subscriptions for select
  using (company_id = public.get_my_company_id());

-- Only admins see full subscription details including provider IDs
-- (The read policy above applies to all members; providers IDs are low-risk for tenant members.)

-- Writes handled exclusively by service role (payment webhooks).
-- No client insert/update/delete policy.
