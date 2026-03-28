# Milestone 5 — Web Operations MVP Implementation Spec

**Goal:** Ship the first full operational workflow in the web app. A company can manage items and locations, execute all five transaction types, and see live balances and history. The same flows work under the construction module and at least one other sector module without code changes.  
**Dependency:** Milestones 3 (engine) and 4 (module system) complete.  
**Lives in:** `apps/web/app/(dashboard)/`

---

## Guiding Rules

1. No direct Supabase calls from page components or form components. All mutations go through server actions that call the engine.
2. Server actions return a typed result union (`{ success: true } | { error: string; code?: string }`). Never throw to the UI.
3. Labels in every page come from `useModule().labels` — no hardcoded "Material" or "Site" strings.
4. Every list page must handle the empty state, loading state, and error state explicitly.
5. Role-gating is enforced in both the server action (primary) and the UI (secondary — hide buttons, not just disable).

---

## Route Map

```
app/(dashboard)/
  page.tsx                          ← dashboard home (widgets from module)
  layout.tsx                        ← module resolver + ModuleProvider (built in M4)

  items/
    page.tsx                        ← items list
    new/
      page.tsx                      ← create item form
    [id]/
      page.tsx                      ← item detail + balance by location
      edit/
        page.tsx                    ← edit item form

  locations/
    page.tsx                        ← locations list
    new/
      page.tsx                      ← create location form
    [id]/
      page.tsx                      ← location detail + stock held here
      edit/
        page.tsx                    ← edit location form

  stock/
    in/
      page.tsx                      ← stock in form
    out/
      page.tsx                      ← stock out form
    transfer/
      page.tsx                      ← transfer form
    return/
      page.tsx                      ← return form
    adjust/
      page.tsx                      ← adjustment form (manager/admin only)

  transactions/
    page.tsx                        ← transaction history list (filterable)
    [id]/
      page.tsx                      ← transaction detail

  balances/
    page.tsx                        ← all balances across all locations
    low-stock/
      page.tsx                      ← items below threshold
```

---

## Server Actions

All server actions live in `apps/web/app/(dashboard)/actions/`. File per domain.

### Pattern every server action follows

```ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function getSessionContext() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role, companies(sector)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return { supabase, user, profile };
}
```

---

### `actions/items.ts`

```ts
export async function createItemAction(formData: FormData) {
  const { supabase, profile } = await getSessionContext();
  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const { error } = await supabase.from("items").insert({
    company_id: profile.company_id,
    name: formData.get("name") as string,
    sku: (formData.get("sku") as string) || null,
    unit: formData.get("unit") as string,
    category: (formData.get("category") as string) || null,
    description: (formData.get("description") as string) || null,
    is_tracked_asset: formData.get("is_tracked_asset") === "true",
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateItemAction(id: string, formData: FormData) {
  /* same pattern */
}

export async function deactivateItemAction(id: string) {
  /* sets is_active = false */
}
```

---

### `actions/locations.ts`

```ts
export async function createLocationAction(formData: FormData) {
  const { supabase, profile } = await getSessionContext();
  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const { error } = await supabase.from("locations").insert({
    company_id: profile.company_id,
    name: formData.get("name") as string,
    type: formData.get("type") as string,
    parent_id: (formData.get("parent_id") as string) || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
```

---

### `actions/stock.ts`

Calls the engine functions from `@inventaryexpert/services`. One function per transaction type.

```ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import {
  stockIn,
  stockOut,
  transfer,
  returnStock,
  adjustment,
} from "@inventaryexpert/services";
import { InventoryError } from "@inventaryexpert/services/errors";
import { redirect } from "next/navigation";

export async function stockInAction(formData: FormData) {
  const { supabase, profile } = await getSessionContext();
  try {
    const result = await stockIn(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      toLocationId: formData.get("toLocationId") as string,
      quantity: Number(formData.get("quantity")),
      batchId: (formData.get("batchId") as string) || undefined,
      note: (formData.get("note") as string) || undefined,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}

// stockOutAction, transferAction, returnStockAction, adjustmentAction — same structure
```

---

## Page Specs

### Items List (`/items`)

**Data fetched (server component):**

```ts
const { data: items } = await supabase
  .from("items")
  .select("id, name, sku, unit, category, is_tracked_asset, is_active")
  .eq("company_id", profile.company_id)
  .eq("is_active", true)
  .order("name");
```

**UI:**

- Page heading: `{labels.items}`
- Table columns: Name, SKU, Unit, Category, Type (stock / asset), Actions
- "Add {labels.item}" button — visible to admin and manager only
- Empty state: "No {labels.items} yet. Add your first {labels.item} to get started."
- Row click → item detail

---

### Item Detail (`/items/[id]`)

**Data fetched:**

```ts
const item = await supabase.from("items").select("*").eq("id", id).single();

const balances = await supabase
  .from("inventory_balances")
  .select("quantity, locations(name, type)")
  .eq("item_id", id)
  .eq("company_id", profile.company_id);
```

**UI:**

- Item name, SKU, unit, category, description
- Balance table: Location | Quantity — one row per location that holds stock
- "Issue", "Transfer", "Return" shortcut buttons that pre-fill the item on the stock form
- Edit button (admin/manager only)
- Deactivate button (admin only) with confirmation

---

### Stock In Form (`/stock/in`)

**Fields:**
| Field | Type | Required |
|---|---|---|
| Item | searchable select from `items` | Yes |
| Destination location | select from `locations` | Yes |
| Quantity | number | Yes (> 0) |
| Batch reference | text (creates or links a batch) | No |
| Note | textarea | No |

**On submit:** calls `stockInAction`. On success, redirect to `/transactions/[transactionId]`. On error, display inline error below the form with the `code` from the engine.

---

### Stock Out Form (`/stock/out`)

**Fields:**
| Field | Type | Required |
|---|---|---|
| Item | searchable select | Yes |
| From location | select (filtered to locations that hold this item) | Yes |
| Quantity | number (max = available balance shown inline) | Yes |
| Note | textarea | No |

**Available balance helper:** when item + location are both selected, fetch and display current balance inline:

```ts
// Client component — fetches on change
const { data } = await supabase
  .from("inventory_balances")
  .select("quantity")
  .eq("item_id", itemId)
  .eq("location_id", locationId)
  .single();
```

---

### Transfer Form (`/stock/transfer`)

**Fields:** Item, From Location, To Location (must differ — validated client-side and by engine), Quantity (max = available at from-location), Note.

---

### Return Form (`/stock/return`)

**Fields:** Item, From Location (field location), To Location (store/warehouse), Quantity, Note.

---

### Adjustment Form (`/stock/adjust`)

**Role gate:** admin and manager only. Render a 403 page for storekeeper and worker.

**Fields:** Item, Location, New Quantity (absolute, not delta), Reason (required text).  
Display current quantity inline. Show the calculated delta ("This will reduce stock by 5").

---

### Balances Page (`/balances`)

```ts
const { data } = await supabase
  .from("inventory_balances")
  .select("quantity, items(name, sku, unit), locations(name, type)")
  .eq("company_id", profile.company_id)
  .gt("quantity", 0)
  .order("items(name)");
```

Table: Item | SKU | Location | Quantity | Unit  
Filterable by location (client-side filter on loaded data for v1).

---

### Low Stock Page (`/balances/low-stock`)

For v1, low stock = quantity ≤ 5 (hardcoded threshold). The threshold becomes configurable in a later milestone.

```ts
const { data } = await supabase
  .from("inventory_balances")
  .select("quantity, items(name, sku, unit), locations(name)")
  .eq("company_id", profile.company_id)
  .lte("quantity", 5);
```

---

### Transaction History (`/transactions`)

```ts
const { data } = await supabase
  .from("stock_transactions")
  .select(
    `
    id, type, quantity, note, created_at,
    items(name),
    from_location:locations!from_location_id(name),
    to_location:locations!to_location_id(name),
    profiles!performed_by(full_name)
  `,
  )
  .eq("company_id", profile.company_id)
  .order("created_at", { ascending: false })
  .limit(100);
```

Table: Date | Type | Item | From | To | Quantity | By  
Transaction type badges: color-coded (stock_in = green, stock_out = orange, transfer = blue, return = yellow, adjustment = red).  
Row click → transaction detail.

---

### Transaction Detail (`/transactions/[id]`)

Shows all fields for the transaction. No edit button — transactions are immutable. If an error was made, the path is a correction `adjustment`.

---

## Reusable Components

These go in `apps/web/components/inventory/`:

```
components/inventory/
  ItemSelect.tsx          ← searchable combobox backed by items query
  LocationSelect.tsx      ← select backed by locations query
  BalanceBadge.tsx        ← inline quantity pill: "12 units available"
  TransactionTypeBadge.tsx ← color-coded badge
  StockForm.tsx           ← shared layout for all five stock forms
  RoleGate.tsx            ← renders children only if role condition met
```

**`RoleGate` pattern:**

```tsx
// Server component version
export function RoleGate({
  allow,
  role,
  children,
  fallback = null,
}: {
  allow: UserRole[];
  role: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  if (!allow.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
```

---

## Module Consistency Rule

Every page that displays the word "item", "location", or any transaction type name must use `useModule().labels`. This is enforced by code review, not by a linter rule in v1.

Example:

```tsx
// ✅ correct
const { labels } = useModule();
<h1>{labels.items}</h1>
<Button>{labels.stockIn}</Button>

// ❌ wrong
<h1>Materials</h1>
<Button>Receive</Button>
```

---

## Acceptance Criteria

- [ ] Admin can create, edit, and deactivate items
- [ ] Admin/manager can create and edit locations
- [ ] All five transaction types complete end-to-end and balance updates correctly
- [ ] Attempting stock out with quantity > available shows the `INSUFFICIENT_STOCK` error inline
- [ ] Adjustment form is blocked for workers and storekeepers
- [ ] All five transaction types are visible in the transaction history with correct data
- [ ] Low stock page correctly shows items at or below threshold
- [ ] Page headings and button labels change correctly when switching between construction and agriculture sector in testing
- [ ] No direct `.from('stock_transactions').insert()` anywhere in the page or component layer

---

## Next Step

Milestone 6 — design and implement QR generation, QR payload format, and scan-to-action flows.
