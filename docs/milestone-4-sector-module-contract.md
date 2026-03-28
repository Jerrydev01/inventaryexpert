# Milestone 4 — Sector Module Contract and App Shell Spec

**Goal:** Implement a module-driven app shell that reads the company's sector at runtime and loads the correct module, without any sector logic leaking into shared services or schema.  
**Dependency:** Milestones 1–3 complete.  
**Lives in:** `apps/web/app/(dashboard)/` and `apps/web/modules/`

---

## Guiding Rules

1. The shared engine (Milestone 3) does not change per sector. Sector modules only affect presentation.
2. A module cannot add table columns. If it needs extra fields, it uses `jsonb` extension columns defined generically in the schema.
3. A module is a self-contained folder that exports a typed `SectorModule` object.
4. The app shell reads the company sector once at the layout level and passes the module config down via React context.
5. Modules can override labels, navigation structure, and dashboard widgets. They cannot override engine functions.

---

## Sector Module Contract (TypeScript Interface)

Defined in `packages/types/src/module.ts`. Every sector module must satisfy this interface.

```ts
import type { Sector } from "./inventory";

// A single navigation item in the sidebar
export interface NavItem {
  label: string;
  href: string;
  icon?: string; // icon key from the icon library (e.g. 'warehouse', 'truck')
}

// Terminology overrides — what "item", "location", and "transaction" are called per sector
export interface SectorLabels {
  item: string; // e.g. "Material" / "Produce" / "Product"
  items: string; // plural
  location: string; // e.g. "Site" / "Farm" / "Store"
  locations: string; // plural
  stockIn: string; // e.g. "Receive" / "Harvest In" / "Receive Delivery"
  stockOut: string; // e.g. "Issue" / "Dispatch" / "Sell"
  transfer: string; // e.g. "Transfer" / "Move Between Sites"
  return: string; // e.g. "Return" / "Return to Store"
  adjustment: string; // e.g. "Adjust" / "Stock Count Correction"
  batch: string; // e.g. "Delivery" / "Harvest Batch" / "Shipment"
}

// Dashboard widget slots — modules can provide their own widget components
// Widgets are React component identifiers, not actual components, to avoid
// pulling heavy component code into the shared types package.
export interface DashboardWidgets {
  primary: string[]; // widget keys for the primary grid (top of dashboard)
  secondary: string[]; // widget keys for the secondary grid
}

// Onboarding prompt shown to new companies after sector selection
export interface OnboardingConfig {
  welcomeTitle: string;
  welcomeBody: string;
  firstStepLabel: string; // e.g. "Add your first site" / "Add your first location"
  firstStepHref: string; // e.g. "/dashboard/locations/new"
}

// The full module definition
export interface SectorModule {
  sector: Sector;
  displayName: string; // e.g. "Construction", "Agriculture"
  description: string; // shown on sector selection screen
  labels: SectorLabels;
  nav: NavItem[];
  dashboard: DashboardWidgets;
  onboarding: OnboardingConfig;
}
```

---

## Module Folder Structure

```
apps/web/
  modules/
    construction/
      index.ts          ← exports the SectorModule config object
      components/
        dashboard/
          ConstructionDashboard.tsx
          StockSummaryWidget.tsx
          LowStockWidget.tsx
          ActiveSitesWidget.tsx
      pages/             ← construction-specific page overrides if needed
    agriculture/
      index.ts
      components/
        dashboard/
          AgricultureDashboard.tsx
    sales/
      index.ts
      components/
        dashboard/
          SalesDashboard.tsx
    other/
      index.ts
      components/
        dashboard/
          GenericDashboard.tsx
    registry.ts          ← maps Sector → SectorModule
```

---

## Module Config Examples

### `modules/construction/index.ts`

```ts
import type { SectorModule } from "@inventaryexpert/types";

export const constructionModule: SectorModule = {
  sector: "construction",
  displayName: "Construction",
  description: "Manage materials, tools, and site stock movements.",
  labels: {
    item: "Material",
    items: "Materials",
    location: "Site",
    locations: "Sites",
    stockIn: "Receive",
    stockOut: "Issue to Site",
    transfer: "Transfer Between Sites",
    return: "Return to Store",
    adjustment: "Stock Count Correction",
    batch: "Delivery",
  },
  nav: [
    { label: "Dashboard", href: "/dashboard", icon: "home" },
    { label: "Materials", href: "/dashboard/items", icon: "box" },
    { label: "Sites", href: "/dashboard/locations", icon: "building" },
    { label: "Stock In", href: "/dashboard/stock/in", icon: "arrow-down" },
    { label: "Issue", href: "/dashboard/stock/out", icon: "arrow-up" },
    { label: "Transfers", href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History", href: "/dashboard/transactions", icon: "list" },
  ],
  dashboard: {
    primary: ["StockSummaryWidget", "LowStockWidget"],
    secondary: ["ActiveSitesWidget"],
  },
  onboarding: {
    welcomeTitle: "Welcome to your construction inventory",
    welcomeBody:
      "Start by adding the sites and stores where your materials are held.",
    firstStepLabel: "Add your first site",
    firstStepHref: "/dashboard/locations/new",
  },
};
```

---

### `modules/agriculture/index.ts`

```ts
import type { SectorModule } from "@inventaryexpert/types";

export const agricultureModule: SectorModule = {
  sector: "agriculture",
  displayName: "Agriculture",
  description: "Track inputs, produce, and farm location stock.",
  labels: {
    item: "Input",
    items: "Inputs",
    location: "Farm",
    locations: "Farms",
    stockIn: "Receive Input",
    stockOut: "Dispatch",
    transfer: "Move Between Farms",
    return: "Return to Store",
    adjustment: "Stock Count Correction",
    batch: "Harvest Batch",
  },
  nav: [
    { label: "Dashboard", href: "/dashboard", icon: "home" },
    { label: "Inputs", href: "/dashboard/items", icon: "leaf" },
    { label: "Farms", href: "/dashboard/locations", icon: "map" },
    { label: "Receive", href: "/dashboard/stock/in", icon: "arrow-down" },
    { label: "Dispatch", href: "/dashboard/stock/out", icon: "arrow-up" },
    { label: "Transfers", href: "/dashboard/stock/transfer", icon: "arrows" },
    { label: "History", href: "/dashboard/transactions", icon: "list" },
  ],
  dashboard: {
    primary: ["StockSummaryWidget", "LowStockWidget"],
    secondary: [],
  },
  onboarding: {
    welcomeTitle: "Welcome to your agriculture inventory",
    welcomeBody: "Start by adding your farms and input types.",
    firstStepLabel: "Add your first farm",
    firstStepHref: "/dashboard/locations/new",
  },
};
```

---

### `modules/registry.ts`

```ts
import type { Sector, SectorModule } from "@inventaryexpert/types";
import { constructionModule } from "./construction";
import { agricultureModule } from "./agriculture";
import { salesModule } from "./sales";
import { otherModule } from "./other";

const registry: Record<Sector, SectorModule> = {
  construction: constructionModule,
  agriculture: agricultureModule,
  sales: salesModule,
  other: otherModule,
};

export function getModule(sector: Sector): SectorModule {
  return registry[sector];
}
```

---

## Module React Context

Defined in `apps/web/lib/module-context.tsx`. Provides the active module to all dashboard children without prop drilling.

```tsx
"use client";

import { createContext, useContext } from "react";
import type { SectorModule } from "@inventaryexpert/types";

const ModuleContext = createContext<SectorModule | null>(null);

export function ModuleProvider({
  module,
  children,
}: {
  module: SectorModule;
  children: React.ReactNode;
}) {
  return (
    <ModuleContext.Provider value={module}>{children}</ModuleContext.Provider>
  );
}

export function useModule(): SectorModule {
  const ctx = useContext(ModuleContext);
  if (!ctx) throw new Error("useModule must be used inside ModuleProvider");
  return ctx;
}
```

---

## Dashboard Layout Integration

The dashboard layout is the single point where the module is resolved. It reads the company sector from the database and injects it into context.

```tsx
// apps/web/app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { getModule } from "@/modules/registry";
import { ModuleProvider } from "@/lib/module-context";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role, companies(sector)")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const sector = (profile.companies as { sector: string }).sector;
  const module = getModule(sector as import("@inventaryexpert/types").Sector);

  return (
    <ModuleProvider module={module}>
      <DashboardShell nav={module.nav}>{children}</DashboardShell>
    </ModuleProvider>
  );
}
```

---

## Sidebar Navigation (`DashboardShell`)

The sidebar renders whatever `nav` the active module exposes. It does not know which sector it is.

```tsx
// apps/web/components/layout/DashboardShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@inventaryexpert/types";

export function DashboardShell({
  nav,
  children,
}: {
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen">
      <aside className="w-56 flex-shrink-0 border-r">
        <nav className="flex flex-col gap-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "font-semibold" : ""}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

---

## Using Labels in Pages

Shared pages use `useModule()` to get the right label for the current sector. They never hardcode "Material" or "Site".

```tsx
// apps/web/app/(dashboard)/items/page.tsx
import { useModule } from "@/lib/module-context";

export default function ItemsPage() {
  const { labels } = useModule();

  return (
    <div>
      <h1>{labels.items}</h1>
      {/* rest of page */}
    </div>
  );
}
```

---

## Dashboard Page

The dashboard page renders whatever widgets the active module declares.

```tsx
// apps/web/app/(dashboard)/page.tsx
"use client";

import { useModule } from "@/lib/module-context";
import { widgetRegistry } from "@/components/dashboard/widget-registry";

export default function DashboardPage() {
  const { dashboard } = useModule();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4">
        {dashboard.primary.map((key) => {
          const Widget = widgetRegistry[key];
          return Widget ? <Widget key={key} /> : null;
        })}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {dashboard.secondary.map((key) => {
          const Widget = widgetRegistry[key];
          return Widget ? <Widget key={key} /> : null;
        })}
      </div>
    </div>
  );
}
```

```ts
// apps/web/components/dashboard/widget-registry.ts
import type { ComponentType } from "react";
import { StockSummaryWidget } from "./StockSummaryWidget";
import { LowStockWidget } from "./LowStockWidget";
import { ActiveSitesWidget } from "./ActiveSitesWidget";

export const widgetRegistry: Record<string, ComponentType> = {
  StockSummaryWidget,
  LowStockWidget,
  ActiveSitesWidget,
};
```

> All widgets in the registry fetch their own data. They receive no props from the dashboard page — they use `useModule()` and their own Supabase queries.

---

## Sector Selection During Onboarding

After sign-up, before the dashboard is accessible, a new company must choose a sector. This sets `companies.sector` and cannot be changed without contacting support in v1.

```
Onboarding flow:
  /onboarding               ← enter company name
  /onboarding/sector        ← select sector (renders constructionModule.displayName etc.)
  /onboarding/complete      ← shows module.onboarding.welcomeTitle and first-step CTA
  → /dashboard
```

The sector selection page renders a card for each sector from the registry. On submit, a server action updates the company's sector, then redirects to `/onboarding/complete`.

---

## What Modules Cannot Do

| Not allowed                                                        | Why                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Add a column to `items` or any shared table                        | Schema is generic and shared                                      |
| Import from `@supabase/ssr` directly                               | Module config is pure data — no DB access in module `index.ts`    |
| Change the behavior of the engine functions                        | `stockOut` works the same for construction and agriculture        |
| Import from another sector module                                  | Modules are isolated; shared behavior goes to `packages/services` |
| Conditionally render based on `sector` string in shared components | Use `useModule().labels` instead                                  |

---

## Acceptance Criteria

- [ ] `SectorModule` interface is defined in `packages/types` and imported by all four modules
- [ ] All four modules (`construction`, `agriculture`, `sales`, `other`) export a valid `SectorModule` object
- [ ] The dashboard layout resolves the company sector from the DB and provides it via `ModuleProvider`
- [ ] The sidebar renders the correct nav items for the active module without any `if sector === 'construction'` conditionals
- [ ] Item list page title changes based on `labels.items` for the active sector
- [ ] A construction company sees "Material" and "Sites"; an agriculture company sees "Input" and "Farms"
- [ ] The shared engine functions are not modified or wrapped per sector
- [ ] Dashboard widgets render for construction; other sectors show the generic `StockSummaryWidget` and `LowStockWidget` at minimum

---

## Next Step

Milestone 5 — build the full web operations MVP: items, locations, all five transaction flows, balances, and transaction history, using the module system built here.
