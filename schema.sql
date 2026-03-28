-- ============================================================
-- 00_enums.sql
-- Run this FIRST before any table files.
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

do $$ begin
  create type public.sector as enum ('construction', 'agriculture', 'sales', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('admin', 'manager', 'storekeeper', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.location_type as enum ('warehouse', 'store', 'site', 'vehicle', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('stock_in', 'stock_out', 'transfer', 'return', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qr_record_type as enum ('item', 'batch', 'asset', 'location');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('paystack', 'stripe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_status as enum ('available', 'in_use', 'under_maintenance', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_type as enum ('free', 'starter', 'pro', 'enterprise');
exception when duplicate_object then null; end $$;
-- ============================================================
-- 01_rls_helper.sql
-- Run AFTER 00_enums.sql and BEFORE any table files.
-- This function is required by all RLS policies.
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

create or replace function public.get_my_company_id()
returns uuid
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  begin
    execute 'select company_id from public.profiles where id = auth.uid()'
      into v_company_id;
  exception
    when undefined_table then
      return null;
  end;

  return v_company_id;
end;
$$;
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

-- The admin update policy is created after public.profiles exists.

-- Insert is handled server-side via service role during onboarding only.
-- No client insert policy.
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

-- Insert is handled server-side via service role during onboarding only.
-- No client insert policy.
-- ============================================================
-- 04_locations.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
create table public.locations (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name       text not null,
  type       public.location_type not null default 'other',
  parent_id  uuid references public.locations(id) on delete set null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index on public.locations (company_id);
create index on public.locations (parent_id);

-- RLS
alter table public.locations enable row level security;

-- All company members can read locations
create policy "locations: read own company"
  on public.locations for select
  using (company_id = public.get_my_company_id());

-- Only managers and admins can create, update, or deactivate locations
create policy "locations: write if manager or admin"
  on public.locations for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );
-- ============================================================
-- 05_items.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  sku              text,
  unit             text not null default 'unit',
  category         text,
  description      text,
  image_path       text,  -- Supabase Storage path: items/{company_id}/{item_id}/cover.webp
  is_tracked_asset boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (company_id, sku)
);

-- is_tracked_asset = false → consumable tracked by batch and balance
-- is_tracked_asset = true  → serialised asset tracked individually via the assets table

-- Indexes
create index on public.items (company_id);

-- RLS
alter table public.items enable row level security;

-- All company members can read the item catalogue
create policy "items: read own company"
  on public.items for select
  using (company_id = public.get_my_company_id());

-- Only managers and admins can create, update, or deactivate items
create policy "items: write if manager or admin"
  on public.items for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );
-- ============================================================
-- 06_batches.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- A batch is a delivery reference for a consumable item.
-- The actual quantity is tracked in inventory_balances, not here.
create table public.batches (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  reference   text,
  notes       text,
  received_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Indexes
create index on public.batches (company_id, item_id);

-- RLS
alter table public.batches enable row level security;

-- All company members can read batches
create policy "batches: read own company"
  on public.batches for select
  using (company_id = public.get_my_company_id());

-- Storekeepers, managers, and admins can create and update batches
create policy "batches: write if storekeeper or above"
  on public.batches for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );
-- ============================================================
-- 07_assets.sql
-- Requires: 00_enums.sql, 01_rls_helper.sql, 02_companies.sql, 04_locations.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- One row per individual tracked asset (is_tracked_asset = true on the item).
-- Assets have no quantity — they are always count 1.
-- Their current location is tracked by location_id and their state by status.
create table public.assets (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  item_id       uuid not null references public.items(id) on delete cascade,
  serial_number text,
  status        public.asset_status not null default 'available',
  location_id   uuid references public.locations(id) on delete set null,
  image_path    text,  -- Supabase Storage path: assets/{company_id}/{asset_id}/photo.webp
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index on public.assets (company_id, item_id);
create index on public.assets (location_id);

-- RLS
alter table public.assets enable row level security;

-- All company members can read assets
create policy "assets: read own company"
  on public.assets for select
  using (company_id = public.get_my_company_id());

-- Storekeepers, managers, and admins can create and update assets
create policy "assets: write if storekeeper or above"
  on public.assets for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );
-- ============================================================
-- 08_inventory_balances.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 04_locations.sql, 05_items.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- One row per (company, item, location) triplet.
-- Updated atomically by the transaction engine RPCs only.
-- Never written to directly from client code.
create table public.inventory_balances (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  item_id     uuid not null references public.items(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  quantity    numeric not null default 0 check (quantity >= 0),
  updated_at  timestamptz not null default now(),
  unique (company_id, item_id, location_id)
);

-- Indexes
create index on public.inventory_balances (company_id, item_id);
create index on public.inventory_balances (company_id, location_id);

-- RLS
alter table public.inventory_balances enable row level security;

-- All company members can read balances
create policy "balances: read own company"
  on public.inventory_balances for select
  using (company_id = public.get_my_company_id());

-- Balances are written by the transaction engine via service role (RPC functions).
-- No direct client write policy is created.
-- ============================================================
-- 09_stock_transactions.sql
-- Requires: 01_rls_helper.sql, 02_companies.sql, 03_profiles.sql,
--           04_locations.sql, 05_items.sql, 06_batches.sql, 07_assets.sql
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

-- Table
-- Append-only ledger. All mutations go through transaction engine RPCs.
-- process_stock_in / process_stock_out / process_transfer /
-- process_return / process_adjustment — see milestone-3 spec.
create table public.stock_transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  transaction_type public.transaction_type not null,
  item_id          uuid not null references public.items(id),
  batch_id         uuid references public.batches(id) on delete set null,
  asset_id         uuid references public.assets(id) on delete set null,
  from_location_id uuid references public.locations(id) on delete set null,
  to_location_id   uuid references public.locations(id) on delete set null,
  quantity         numeric not null check (quantity > 0),
  unit_cost        numeric check (unit_cost >= 0),
  notes            text,
  reference_number text,
  performed_by     uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);

-- Indexes
create index on public.stock_transactions (company_id, item_id);
create index on public.stock_transactions (company_id, created_at desc);
create index on public.stock_transactions (performed_by);
create index on public.stock_transactions (batch_id) where batch_id is not null;
create index on public.stock_transactions (asset_id) where asset_id is not null;

-- RLS
alter table public.stock_transactions enable row level security;

-- All company members can read the transaction ledger
create policy "transactions: read own company"
  on public.stock_transactions for select
  using (company_id = public.get_my_company_id());

-- Rows are inserted by the transaction engine RPCs (service role).
-- No client-side insert, update, or delete policy is ever created.
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
-- ============================================================
-- 17_storage.sql
-- Requires: 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
--
-- Creates the four Storage buckets and their RLS policies.
-- Bucket naming  : kebab-case, singular noun
-- Path convention: {bucket}/{company_id_or_user_id}/{record_id}/{filename}.webp
-- ============================================================

-- ============================================================
-- Buckets
-- ============================================================

-- Company logos  (public read — shown on login page, receipts, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  512000,   -- 500 KB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- User avatars  (public read — shown in UI across the company)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  256000,   -- 250 KB max
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Item cover photos  (private — readable only by company members)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'items',
  'items',
  false,
  1048576,  -- 1 MB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Asset photos  (private — readable only by company members)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  false,
  1048576,  -- 1 MB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;


-- ============================================================
-- Storage RLS policies
-- Path guards ensure users can only read/write their own company's files.
-- Path format for private buckets: {company_id}/{record_id}/filename.webp
-- Path format for public buckets:  {company_id}/filename.webp
--   or for avatars:                {user_id}/filename.webp
-- ============================================================

-- ------------------------------------------------------------
-- logos bucket (public read, admin/manager write)
-- ------------------------------------------------------------
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: upload if admin or manager"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        -- first path segment must be the caller's company_id
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );

create policy "logos: update if admin or manager"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );

create policy "logos: delete if admin"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );


-- ------------------------------------------------------------
-- avatars bucket (public read, owner write)
-- ------------------------------------------------------------
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    -- first path segment must be the caller's own user_id
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: update own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ------------------------------------------------------------
-- items bucket (private: company-scoped read, manager+ write)
-- ------------------------------------------------------------
create policy "items: read own company"
  on storage.objects for select
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy "items: upload if manager or above"
  on storage.objects for insert
  with check (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

create policy "items: update if manager or above"
  on storage.objects for update
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

create policy "items: delete if manager or above"
  on storage.objects for delete
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );


-- ------------------------------------------------------------
-- assets bucket (private: company-scoped read, storekeeper+ write)
-- ------------------------------------------------------------
create policy "assets bucket: read own company"
  on storage.objects for select
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy "assets bucket: upload if storekeeper or above"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager', 'storekeeper')
    )
  );

create policy "assets bucket: update if storekeeper or above"
  on storage.objects for update
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager', 'storekeeper')
    )
  );

create policy "assets bucket: delete if manager or above"
  on storage.objects for delete
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );
-- ============================================================
-- 18_rpc_transaction_engine.sql
-- Requires: 09_stock_transactions.sql, 08_inventory_balances.sql,
--           07_assets.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
--
-- Five atomic RPC functions called by packages/services engine.ts.
-- All run as SECURITY DEFINER so the service role grant is not needed.
-- Each function is a single Postgres transaction — either everything
-- succeeds or nothing is written.
-- ============================================================


-- ============================================================
-- process_stock_in
-- Receives goods into a location. Upserts inventory_balances.
-- ============================================================
create or replace function public.process_stock_in(
  p_company_id       uuid,
  p_item_id          uuid,
  p_to_location_id   uuid,
  p_quantity         numeric,
  p_performed_by     uuid,
  p_batch_id         uuid    default null,
  p_reference_number text    default null,
  p_note             text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    to_location_id, quantity, reference_number, notes, performed_by
  )
  values (
    p_company_id, 'stock_in', p_item_id, p_batch_id,
    p_to_location_id, p_quantity, p_reference_number, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_stock_out
-- Issues goods from a location. Guards against negative balance.
-- ============================================================
create or replace function public.process_stock_out(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_quantity           numeric,
  p_performed_by       uuid,
  p_batch_id           uuid    default null,
  p_reference_number   text    default null,
  p_note               text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  -- Pessimistic lock on the balance row to prevent concurrent over-issue
  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, quantity, reference_number, notes, performed_by
  )
  values (
    p_company_id, 'stock_out', p_item_id, p_batch_id,
    p_from_location_id, p_quantity, p_reference_number, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_transfer
-- Moves goods between two locations in the same company.
-- ============================================================
create or replace function public.process_transfer(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_performed_by       uuid,
  p_batch_id           uuid    default null,
  p_note               text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'SAME_LOCATION: source and destination must differ';
  end if;

  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'transfer', p_item_id, p_batch_id,
    p_from_location_id, p_to_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Deduct from source
  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  -- Add to destination (upsert)
  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_return
-- Returns goods from a field location back to a stock location.
-- Semantically identical to transfer but recorded as 'return'.
-- ============================================================
create or replace function public.process_return(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_performed_by       uuid,
  p_batch_id           uuid    default null,
  p_note               text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'SAME_LOCATION: source and destination must differ';
  end if;

  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'return', p_item_id, p_batch_id,
    p_from_location_id, p_to_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_adjustment
-- Sets the balance to an absolute quantity (e.g. after a stock count).
-- Records the delta as an adjustment transaction.
-- ============================================================
create or replace function public.process_adjustment(
  p_company_id     uuid,
  p_item_id        uuid,
  p_location_id    uuid,
  p_new_quantity   numeric,
  p_reason         text,
  p_performed_by   uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_qty        numeric;
  v_delta          numeric;
  v_transaction_id uuid;
begin
  if p_new_quantity < 0 then
    raise exception 'ADJUSTMENT_NEGATIVE: new quantity cannot be negative';
  end if;

  select quantity into v_old_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_location_id
  for update;

  v_old_qty := coalesce(v_old_qty, 0);
  v_delta   := p_new_quantity - v_old_qty;

  -- Still record a transaction even when delta is 0 (confirms the count)
  insert into stock_transactions (
    company_id, transaction_type, item_id,
    from_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'adjustment', p_item_id,
    p_location_id,
    -- store absolute delta; 0 if no change
    abs(v_delta),
    format('Adjustment: %s → %s. Reason: %s', v_old_qty, p_new_quantity, p_reason),
    p_performed_by
  )
  returning id into v_transaction_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_location_id, p_new_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_asset_move
-- Relocates a tracked asset (is_tracked_asset = true item).
-- Updates assets.location_id + assets.status and inserts a
-- stock_transactions row for traceability.
-- ============================================================
create or replace function public.process_asset_move(
  p_company_id       uuid,
  p_asset_id         uuid,
  p_to_location_id   uuid,
  p_type             public.transaction_type,  -- 'stock_out' | 'transfer' | 'return'
  p_performed_by     uuid,
  p_note             text    default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset          record;
  v_transaction_id uuid;
begin
  -- Load asset and validate ownership + availability
  select id, company_id, item_id, location_id, status
  into v_asset
  from assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND: asset % does not exist', p_asset_id;
  end if;

  if v_asset.company_id <> p_company_id then
    raise exception 'COMPANY_MISMATCH: asset does not belong to this company';
  end if;

  if v_asset.status = 'retired' then
    raise exception 'ASSET_UNAVAILABLE: asset is retired';
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, asset_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, p_type, v_asset.item_id, p_asset_id,
    v_asset.location_id, p_to_location_id, 1, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Update asset position and status
  update assets
  set location_id = p_to_location_id,
      status      = case
                      when p_type = 'stock_out' then 'in_use'
                      when p_type in ('transfer', 'return') then 'available'
                      else status
                    end,
      updated_at  = now()
  where id = p_asset_id;

  return v_transaction_id;
end;
$$;
