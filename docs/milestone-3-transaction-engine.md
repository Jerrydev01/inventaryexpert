# Milestone 3 — Transaction Engine Implementation Spec

**Goal:** Implement one shared service layer in `packages/services` that handles all inventory mutations. No UI component or route handler writes directly to `stock_transactions` or `inventory_balances`. Everything goes through this engine.  
**Dependency:** Milestone 2 complete (schema and RLS in place).  
**Lives in:** `packages/services/src/inventory/`

---

## Guiding Rules

1. The engine never touches the database directly from UI code — all mutations are server actions calling engine functions.
2. Every operation is atomic. Either the transaction record is written and the balance is updated together, or neither happens.
3. Atomicity is achieved via a Postgres function (RPC) called from the service layer — not via sequential inserts from JavaScript.
4. The engine is the only place where business rules live. No rule logic in components, hooks, or route files.
5. The engine never receives a Supabase client as a prop — it creates its own from `@supabase/ssr` server helpers.

---

## File Structure

```
packages/services/src/
  inventory/
    engine.ts          ← main entry: exported operation functions
    validators.ts      ← input validation before the DB call
    errors.ts          ← typed error classes
    types.ts           ← engine-specific input/output types
  index.ts             ← re-exports
```

---

## Shared Types (`packages/types/src/inventory.ts`)

These types are defined in `packages/types`, not `packages/services`, because they are also needed in the mobile app and UI layers.

```ts
export type TransactionType =
  | "stock_in"
  | "stock_out"
  | "transfer"
  | "return"
  | "adjustment";

export interface StockInInput {
  companyId: string;
  itemId: string;
  toLocationId: string;
  quantity: number;
  batchId?: string; // optional: link to existing batch
  note?: string;
  performedBy: string; // profiles.id
}

export interface StockOutInput {
  companyId: string;
  itemId: string;
  fromLocationId: string;
  quantity: number;
  batchId?: string;
  note?: string;
  performedBy: string;
}

export interface TransferInput {
  companyId: string;
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  batchId?: string;
  note?: string;
  performedBy: string;
}

export interface ReturnInput {
  companyId: string;
  itemId: string;
  fromLocationId: string; // location the item is being returned from
  toLocationId: string; // location it returns to
  quantity: number;
  batchId?: string;
  note?: string;
  performedBy: string;
}

export interface AdjustmentInput {
  companyId: string;
  itemId: string;
  locationId: string;
  newQuantity: number; // the correct absolute quantity after adjustment
  reason: string; // required for adjustments
  performedBy: string;
}

export interface AssetMoveInput {
  companyId: string;
  assetId: string;
  toLocationId: string;
  type: Extract<TransactionType, "stock_out" | "transfer" | "return">;
  note?: string;
  performedBy: string;
}

export interface OperationResult {
  success: true;
  transactionId: string;
}
```

---

## Error Types (`packages/services/src/inventory/errors.ts`)

```ts
export class InventoryError extends Error {
  constructor(
    public code: InventoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

export type InventoryErrorCode =
  | "INSUFFICIENT_STOCK" // quantity < requested
  | "ITEM_NOT_FOUND"
  | "LOCATION_NOT_FOUND"
  | "BATCH_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "ASSET_UNAVAILABLE" // asset status is not 'available'
  | "INVALID_QUANTITY" // quantity <= 0 or non-numeric
  | "SAME_LOCATION" // transfer from and to are the same location
  | "COMPANY_MISMATCH" // item/location/batch does not belong to company
  | "ADJUSTMENT_NEGATIVE" // new quantity would be negative
  | "DB_ERROR"; // unexpected DB failure
```

---

## Validators (`packages/services/src/inventory/validators.ts`)

Run before the RPC call. Throw `InventoryError` with a specific code on failure. The RPC is never called if validation fails.

```ts
import { InventoryError } from "./errors";

export function validateQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError(
      "INVALID_QUANTITY",
      "Quantity must be a positive number.",
    );
  }
}

export function validateDifferentLocations(
  fromLocationId: string,
  toLocationId: string,
): void {
  if (fromLocationId === toLocationId) {
    throw new InventoryError(
      "SAME_LOCATION",
      "Source and destination must be different locations.",
    );
  }
}

export function validateNewQuantity(newQuantity: number): void {
  if (!Number.isFinite(newQuantity) || newQuantity < 0) {
    throw new InventoryError(
      "ADJUSTMENT_NEGATIVE",
      "Adjusted quantity cannot be negative.",
    );
  }
}
```

---

## Postgres RPC Functions

These functions run inside Postgres transactions. They are called via `supabase.rpc()` from the service layer. Each function returns the new `transaction_id` on success or raises an exception on failure.

### `process_stock_in`

```sql
create or replace function public.process_stock_in(
  p_company_id       uuid,
  p_item_id          uuid,
  p_to_location_id   uuid,
  p_quantity         numeric,
  p_batch_id         uuid default null,
  p_note             text default null,
  p_performed_by     uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
begin
  -- Insert transaction record
  insert into stock_transactions (
    company_id, type, item_id, batch_id,
    to_location_id, quantity, note, performed_by
  )
  values (
    p_company_id, 'stock_in', p_item_id, p_batch_id,
    p_to_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Upsert balance
  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;
```

---

### `process_stock_out`

```sql
create or replace function public.process_stock_out(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_quantity           numeric,
  p_batch_id           uuid default null,
  p_note               text default null,
  p_performed_by       uuid
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
  -- Lock and read balance
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

  -- Insert transaction record
  insert into stock_transactions (
    company_id, type, item_id, batch_id,
    from_location_id, quantity, note, performed_by
  )
  values (
    p_company_id, 'stock_out', p_item_id, p_batch_id,
    p_from_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Decrement balance
  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  return v_transaction_id;
end;
$$;
```

---

### `process_transfer`

```sql
create or replace function public.process_transfer(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_batch_id           uuid default null,
  p_note               text default null,
  p_performed_by       uuid
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
    company_id, type, item_id, batch_id,
    from_location_id, to_location_id, quantity, note, performed_by
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

  -- Add to destination
  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;
```

---

### `process_return`

```sql
create or replace function public.process_return(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_batch_id           uuid default null,
  p_note               text default null,
  p_performed_by       uuid
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
  -- The item is being returned from a field location back to the store/warehouse.
  -- Check the source balance exists.
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
    company_id, type, item_id, batch_id,
    from_location_id, to_location_id, quantity, note, performed_by
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
```

---

### `process_adjustment`

```sql
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
  select quantity into v_old_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_location_id
  for update;

  -- If no row yet, treat old quantity as 0
  v_old_qty := coalesce(v_old_qty, 0);
  v_delta   := p_new_quantity - v_old_qty;

  insert into stock_transactions (
    company_id, type, item_id,
    from_location_id, quantity, note, performed_by
  )
  values (
    p_company_id, 'adjustment', p_item_id,
    p_location_id, abs(v_delta),
    format('Adjustment: %s -> %s. Reason: %s', v_old_qty, p_new_quantity, p_reason),
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
```

---

## Engine Service Layer (`packages/services/src/inventory/engine.ts`)

Calls the RPCs. Translates Postgres exceptions back to typed `InventoryError` instances.

```ts
import { createClient } from "@supabase/ssr"; // resolved via apps/web's server helper wrapper
import type {
  StockInInput,
  StockOutInput,
  TransferInput,
  ReturnInput,
  AdjustmentInput,
  OperationResult,
} from "@inventaryexpert/types";
import { InventoryError } from "./errors";
import {
  validateQuantity,
  validateDifferentLocations,
  validateNewQuantity,
} from "./validators";

// The engine receives a pre-built Supabase server client injected from the server action.
// It does not import createServerClient itself — this keeps it testable and framework-agnostic.
type SupabaseServerClient = ReturnType<typeof createClient>;

function parsePostgresError(message: string): InventoryError {
  if (message.includes("INSUFFICIENT_STOCK")) {
    return new InventoryError("INSUFFICIENT_STOCK", message);
  }
  return new InventoryError("DB_ERROR", message);
}

export async function stockIn(
  client: SupabaseServerClient,
  input: StockInInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);

  const { data, error } = await client.rpc("process_stock_in", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

export async function stockOut(
  client: SupabaseServerClient,
  input: StockOutInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);

  const { data, error } = await client.rpc("process_stock_out", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

export async function transfer(
  client: SupabaseServerClient,
  input: TransferInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);
  validateDifferentLocations(input.fromLocationId, input.toLocationId);

  const { data, error } = await client.rpc("process_transfer", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

export async function returnStock(
  client: SupabaseServerClient,
  input: ReturnInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);
  validateDifferentLocations(input.fromLocationId, input.toLocationId);

  const { data, error } = await client.rpc("process_return", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

export async function adjustment(
  client: SupabaseServerClient,
  input: AdjustmentInput,
): Promise<OperationResult> {
  validateNewQuantity(input.newQuantity);

  const { data, error } = await client.rpc("process_adjustment", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_location_id: input.locationId,
    p_new_quantity: input.newQuantity,
    p_reason: input.reason,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}
```

---

## How Server Actions Call the Engine

In `apps/web`, a server action wraps the engine call and formats the result for the UI. The server action is the boundary — it creates the Supabase client and extracts the user identity.

```ts
// apps/web/app/(dashboard)/actions/stock-out-action.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { stockOut } from "@inventaryexpert/services";
import { InventoryError } from "@inventaryexpert/services/errors";

export async function stockOutAction(formData: FormData) {
  const client = await createServerClient();

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { data: profile } = await client
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  try {
    const result = await stockOut(client, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      fromLocationId: formData.get("fromLocationId") as string,
      quantity: Number(formData.get("quantity")),
      note: formData.get("note") as string | undefined,
      performedBy: user.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError) {
      return { error: err.message, code: err.code };
    }
    return { error: "Unexpected error" };
  }
}
```

---

## What the Engine Does NOT Do

- It does not validate that `itemId`, `locationId`, or `batchId` exist before calling the RPC. The Postgres foreign key constraints handle referential integrity, and the DB will raise an exception that maps to `DB_ERROR`. This is acceptable for v1.
- It does not send notifications or trigger side effects. That is a later concern.
- It does not handle asset moves directly — asset moves go through a separate asset service that updates `assets.location_id` and `assets.status` and also inserts a `stock_transactions` record for traceability.

---

## Acceptance Criteria

- [ ] All five operations (`stockIn`, `stockOut`, `transfer`, `returnStock`, `adjustment`) are implemented in `packages/services`
- [ ] All five Postgres RPC functions are deployed to Supabase
- [ ] A `stockOut` with quantity exceeding available balance returns an `InventoryError` with code `INSUFFICIENT_STOCK`
- [ ] A `transfer` with the same `fromLocationId` and `toLocationId` is rejected by the validator before hitting the DB
- [ ] Balances remain correct after running `stockIn → stockOut → transfer → return → adjustment` in sequence on the same item
- [ ] Every operation creates exactly one row in `stock_transactions`
- [ ] The engine is importable from `apps/web` via `@inventaryexpert/services`
- [ ] No direct `supabase.from('stock_transactions').insert(...)` calls exist anywhere in `apps/web`

---

## Next Step

Milestone 4 — build the sector module contract and app shell that loads the correct module per company sector.
