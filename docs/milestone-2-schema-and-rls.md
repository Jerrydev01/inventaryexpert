# Milestone 2 — Supabase Schema and RLS Plan

**Goal:** Create the full generic inventory schema in Supabase and enforce company isolation at the database layer.  
**Dependency:** Milestone 1 complete (monorepo running).  
**Applies to:** All sectors. No table is construction-specific.

---

## Conventions

- All primary keys are `uuid` with `gen_random_uuid()` default.
- All timestamps are `timestamptz` defaulting to `now()`.
- `company_id uuid not null references companies(id)` is on every tenant-scoped table.
- RLS is enabled on every table. No table is readable without a valid policy.
- The `auth.uid()` function is the Supabase identity anchor. Profiles bridge auth users to companies.
- Role enforcement in application code is a secondary check. The database is the primary enforcement layer.

---

## Enums

```sql
create type public.sector as enum (
  'construction',
  'agriculture',
  'sales',
  'other'
);

create type public.user_role as enum (
  'admin',
  'manager',
  'storekeeper',
  'worker'
);

create type public.location_type as enum (
  'warehouse',
  'store',
  'site',
  'vehicle',
  'other'
);

create type public.transaction_type as enum (
  'stock_in',
  'stock_out',
  'transfer',
  'return',
  'adjustment'
);

create type public.qr_record_type as enum (
  'item',
  'batch',
  'asset',
  'location'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused'
);

create type public.payment_provider as enum (
  'paystack',
  'stripe'
);

create type public.payment_status as enum (
  'pending',
  'successful',
  'failed',
  'refunded'
);

create type public.asset_status as enum (
  'available',
  'in_use',
  'under_maintenance',
  'retired'
);
```

---

## Tables

### `companies`

```sql
create table public.companies (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  sector       public.sector not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

> `sector` is set once at onboarding and drives which module loads in the app. Changing sector is out of scope for v1.

---

### `profiles`

Bridges `auth.users` to companies. One user belongs to one company in v1.

```sql
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  company_id   uuid not null references public.companies(id) on delete cascade,
  role         public.user_role not null default 'worker',
  full_name    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

> `id` matches `auth.users.id` — no surrogate key. This simplifies RLS policies.

---

### `locations`

Warehouses, stores, sites, or any physical holding point.

```sql
create table public.locations (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  name         text not null,
  type         public.location_type not null default 'other',
  parent_id    uuid references public.locations(id) on delete set null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

> `parent_id` supports nested locations (e.g. a site with multiple storage areas) without requiring a separate table. Max depth is not enforced in v1.

---

### `items`

The item catalogue. Shared across all sectors.

```sql
create table public.items (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  name             text not null,
  sku              text,
  unit             text not null default 'unit',
  category         text,
  description      text,
  is_tracked_asset boolean not null default false,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (company_id, sku)
);
```

> `is_tracked_asset` determines whether this item uses batch tracking (consumable) or asset tracking (individual serial numbers).

---

### `batches`

Groups a stock-in event for consumable items. Used when the source or lot matters.

```sql
create table public.batches (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  item_id      uuid not null references public.items(id) on delete cascade,
  reference    text,
  notes        text,
  received_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
```

> A batch is a delivery reference. The actual quantity is tracked in `inventory_balances` — not on the batch itself.

---

### `assets`

Individual tracked instances of items where `is_tracked_asset = true`.

```sql
create table public.assets (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  item_id         uuid not null references public.items(id) on delete cascade,
  serial_number   text,
  status          public.asset_status not null default 'available',
  location_id     uuid references public.locations(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

> Assets do not have a quantity — they are always count 1. Their position is tracked by `location_id` and their state by `status`.

---

### `inventory_balances`

Current stock quantity per item per location. This is the live balance, updated by the transaction engine.

```sql
create table public.inventory_balances (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  item_id      uuid not null references public.items(id) on delete cascade,
  location_id  uuid not null references public.locations(id) on delete cascade,
  quantity     numeric not null default 0 check (quantity >= 0),
  updated_at   timestamptz not null default now(),
  unique (company_id, item_id, location_id)
);
```

> The `check (quantity >= 0)` constraint is a database-level guard against negative stock. The engine must also enforce this before attempting the write.

---

### `stock_transactions`

Immutable ledger of every inventory movement.

```sql
create table public.stock_transactions (
  id               uuid primary key default gen_random_uuid(),
  company_id       uuid not null references public.companies(id) on delete cascade,
  type             public.transaction_type not null,
  item_id          uuid not null references public.items(id),
  batch_id         uuid references public.batches(id),
  asset_id         uuid references public.assets(id),
  from_location_id uuid references public.locations(id),
  to_location_id   uuid references public.locations(id),
  quantity         numeric check (quantity > 0),
  note             text,
  performed_by     uuid not null references public.profiles(id),
  created_at       timestamptz not null default now()
);
```

> No `updated_at` — this table is append-only. Rows must never be updated or deleted. Corrections go through an `adjustment` transaction, not an edit.

**Validation constraints per type:**

| type         | from_location_id | to_location_id | quantity                      | asset_id    |
| ------------ | ---------------- | -------------- | ----------------------------- | ----------- |
| `stock_in`   | null             | required       | required                      | null or set |
| `stock_out`  | required         | null           | required                      | null or set |
| `transfer`   | required         | required       | required                      | null or set |
| `return`     | required         | null           | required                      | null or set |
| `adjustment` | required         | null           | + or - (store as signed note) | null        |

> These constraints are enforced by the transaction engine (Milestone 3), not by database constraints, to allow richer error messages.

---

### `audit_logs`

Low-level record of data mutations beyond stock transactions.

```sql
create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  table_name   text not null,
  record_id    uuid not null,
  operation    text not null check (operation in ('insert', 'update', 'delete')),
  old_data     jsonb,
  new_data     jsonb,
  performed_by uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
```

> Populated by Postgres triggers on sensitive tables or by the service layer. Every stock transaction write also results in an audit log entry.

---

### `qr_codes`

One QR code per logical record. QR payload is a stable identifier, not a URL.

```sql
create table public.qr_codes (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.companies(id) on delete cascade,
  record_type  public.qr_record_type not null,
  record_id    uuid not null,
  payload      text not null unique,
  created_at   timestamptz not null default now()
);
```

> `payload` is a compact string (e.g. `inv:batch:550e8400-e29b-41d4-a716-446655440000`). The app resolves it by looking up `qr_codes` and following the `record_type` + `record_id` pointer.

---

### `subscriptions`

One active subscription per company.

```sql
create table public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null unique references public.companies(id) on delete cascade,
  plan                    text not null,
  status                  public.subscription_status not null default 'trialing',
  provider                public.payment_provider,
  provider_subscription_id text,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
```

---

### `payments`

Audit trail for every billing event.

```sql
create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  subscription_id     uuid references public.subscriptions(id),
  amount              numeric not null check (amount >= 0),
  currency            text not null default 'NGN',
  provider            public.payment_provider not null,
  provider_reference  text,
  status              public.payment_status not null default 'pending',
  created_at          timestamptz not null default now()
);
```

---

## Indexes

```sql
-- Profiles
create index on public.profiles (company_id);

-- Locations
create index on public.locations (company_id);
create index on public.locations (parent_id);

-- Items
create index on public.items (company_id);

-- Batches
create index on public.batches (company_id, item_id);

-- Assets
create index on public.assets (company_id, item_id);
create index on public.assets (location_id);

-- Inventory balances
create index on public.inventory_balances (company_id, item_id);
create index on public.inventory_balances (company_id, location_id);

-- Stock transactions
create index on public.stock_transactions (company_id, item_id);
create index on public.stock_transactions (company_id, created_at desc);
create index on public.stock_transactions (performed_by);

-- Audit logs
create index on public.audit_logs (company_id, table_name, record_id);

-- QR codes
create index on public.qr_codes (company_id, record_type, record_id);

-- Payments
create index on public.payments (company_id);
```

---

## RLS Policies

### Helper function

All RLS policies use a helper to resolve the calling user's company:

```sql
create or replace function public.get_my_company_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;
```

> `security definer` allows this to run without the caller needing direct access to `profiles`. `stable` allows Postgres to cache the result within a query.

---

### Enable RLS on all tables

```sql
alter table public.companies           enable row level security;
alter table public.profiles            enable row level security;
alter table public.locations           enable row level security;
alter table public.items               enable row level security;
alter table public.batches             enable row level security;
alter table public.assets              enable row level security;
alter table public.inventory_balances  enable row level security;
alter table public.stock_transactions  enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.qr_codes            enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.payments            enable row level security;
```

---

### `companies` — RLS

```sql
-- Users can read their own company only
create policy "companies: read own"
  on public.companies for select
  using (id = public.get_my_company_id());

-- Only admins can update company details
create policy "companies: admin update"
  on public.companies for update
  using (
    id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insert is via service role only (company creation on signup handled server-side)
```

---

### `profiles` — RLS

```sql
-- Users can read all profiles in their company
create policy "profiles: read own company"
  on public.profiles for select
  using (company_id = public.get_my_company_id());

-- Users can update their own profile only
create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid());

-- Admins can update any profile in their company (for role changes)
create policy "profiles: admin update any"
  on public.profiles for update
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

---

### Standard tenant isolation (locations, items, batches, assets, inventory_balances, qr_codes)

These tables follow the same pattern: read if same company, write if role allows.

```sql
-- locations
create policy "locations: read own company"
  on public.locations for select
  using (company_id = public.get_my_company_id());

create policy "locations: write if manager or admin"
  on public.locations for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- items
create policy "items: read own company"
  on public.items for select
  using (company_id = public.get_my_company_id());

create policy "items: write if manager or admin"
  on public.items for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- batches
create policy "batches: read own company"
  on public.batches for select
  using (company_id = public.get_my_company_id());

create policy "batches: write if storekeeper or above"
  on public.batches for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );

-- assets
create policy "assets: read own company"
  on public.assets for select
  using (company_id = public.get_my_company_id());

create policy "assets: write if storekeeper or above"
  on public.assets for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );

-- inventory_balances (written by engine only — workers cannot directly mutate)
create policy "balances: read own company"
  on public.inventory_balances for select
  using (company_id = public.get_my_company_id());

-- balances are written by service role from server actions only — no direct client write policy

-- qr_codes
create policy "qr_codes: read own company"
  on public.qr_codes for select
  using (company_id = public.get_my_company_id());

create policy "qr_codes: write if storekeeper or above"
  on public.qr_codes for all
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager', 'storekeeper')
    )
  );
```

---

### `stock_transactions` — RLS

```sql
-- All authenticated members of the company can read transaction history
create policy "transactions: read own company"
  on public.stock_transactions for select
  using (company_id = public.get_my_company_id());

-- Transactions are inserted through the engine — allow all roles to insert (engine validates permissions in code)
create policy "transactions: insert any role"
  on public.stock_transactions for insert
  with check (
    company_id = public.get_my_company_id()
    and performed_by = auth.uid()
  );

-- No updates or deletes ever. Append-only.
```

---

### `audit_logs` — RLS

```sql
-- Admins and managers can read audit logs
create policy "audit_logs: read if manager or admin"
  on public.audit_logs for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

-- Inserted by service role only — no client insert policy
```

---

### `subscriptions` and `payments` — RLS

```sql
-- Admins can read their company's subscription and payments
create policy "subscriptions: read if admin"
  on public.subscriptions for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "payments: read if admin"
  on public.payments for select
  using (
    company_id = public.get_my_company_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- All writes to subscriptions and payments are via service role from webhook handlers only
```

---

## Onboarding Trigger

When a new auth user signs up, their profile is not automatically created. The sign-up server action must:

1. Create the company row (via service role client).
2. Create the profile row linking the new `auth.uid()` to the company with `role = 'admin'`.
3. Create the subscription row with `status = 'trialing'`.

Do this inside a server action using the Supabase service role client. Never do it client-side.

---

## Migration Strategy

- Apply each table as a separate numbered migration file in `supabase/migrations/`.
- Order: enums → companies → profiles → locations → items → batches → assets → inventory_balances → stock_transactions → audit_logs → qr_codes → subscriptions → payments → indexes → RLS helper → RLS policies.
- Test by creating a second company with a different user and confirming each table blocks cross-company reads via the Supabase table editor.

---

## Acceptance Criteria

- [ ] All tables created in Supabase with correct column types and constraints
- [ ] `inventory_balances.quantity >= 0` check constraint is present
- [ ] `stock_transactions` has no update or delete policy — rows are immutable
- [ ] A user from Company A receives zero rows when querying any table scoped to Company B
- [ ] A `worker` role user cannot insert or update `items`, `locations`, or `batches`
- [ ] A `storekeeper` can insert a stock transaction but cannot update company settings
- [ ] An `admin` can update company name and manage profiles
- [ ] Schema works unchanged when populated with construction data and agriculture data simultaneously

---

## Next Step

Milestone 3 — implement the transaction engine in `packages/services` that writes to this schema atomically.
