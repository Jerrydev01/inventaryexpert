## Final Ideation: Multi-Sector Inventory Platform

## Product Summary

Build a multi-tenant inventory SaaS for field-driven businesses that share the same inventory backbone but need different workflows, labels, and dashboards by sector. The platform should support sector selection at onboarding, load the correct module for each company, and reuse one shared inventory engine across construction, agriculture, sales, and future sectors.

The product should not be treated as three separate apps. It should be one platform with:

- a shared inventory and transaction core
- sector-specific modules for UI and optional business rules
- a web app for administration and operations
- a mobile app for field execution and QR workflows
- a commercial layer for landing pages, pricing, subscriptions, and access control

## Product Thesis

The core problem is consistent across sectors: companies lose money when they do not know what stock exists, where it is, who moved it, and what changed. The platform wins if it makes stock movement reliable, auditable, and simple to operate in real conditions, including low-connectivity environments.

The launch wedge should still be disciplined. The platform is multi-sector by design, but the first deep operational workflow should be construction because that is where the need, examples, and urgency are strongest. Agriculture, sales, and other sectors should be structurally supported from the start without forcing equal implementation depth in the first release.

## Product Principles

1. One shared inventory engine, not separate sector-specific backends.
2. Sector modules should change terminology, navigation, dashboards, optional fields, and small workflow differences, not duplicate core transaction logic.
3. The web app is the system of record.
4. The mobile app is optimized for field actions, especially QR scanning and stock movement.
5. QR must be designed around what is being tracked, not treated as a generic label feature.
6. Billing matters, but only after the operational workflow is credible.
7. V1 should prove trust in stock accuracy before adding accounting-style features.

## Platform Model

### Shared Core

These capabilities should remain generic and reusable across sectors:

- companies and multi-tenancy
- users, roles, and permissions
- locations
- items
- batches or tracked assets
- inventory balances
- stock transactions
- audit logs
- QR generation and parsing
- subscriptions and billing state
- clients (who companies bill)
- invoices and invoice line items

### Sector Layer

These capabilities should live inside the module layer:

- labels such as Material, Product, Input, Tool, Asset
- dashboard widgets and summaries
- sector-specific empty states and onboarding prompts
- optional extra fields
- reporting emphasis
- navigation structure

### Initial Sectors

- Construction
- Agriculture
- Sales
- Other

Construction should be the first complete sector module. Other sectors should have lighter initial implementations built on the same core.

## User and Business Model

### Primary Users

- company admin
- operations manager
- storekeeper
- site or field worker

### Commercial Model

- marketing site on the public domain
- protected dashboard on the app subdomain
- subscription plans
- Paystack for Nigerian companies
- Stripe for non-Nigerian companies

## Technical Direction

### Monorepo Shape

- apps/web
- apps/mobile
- packages/services
- packages/types
- packages/config
- packages/utils

### Web App Shape

The web app should contain:

- route groups for marketing, auth, sector selection, dashboard, billing, and reports
- a modules folder that contains sector-specific UI and configuration
- thin route files backed by shared services and server actions

### Sector Module Shape

Example module layout:

- modules/construction
- modules/agriculture
- modules/sales
- modules/other

Each module should contain:

- pages
- components
- hooks when needed
- module-specific config
- optional module-specific services only when the behavior cannot stay generic

### Data Model Direction

The data model should be generic, not construction-only. Sector should be associated with the company. Items, locations, balances, transactions, QR records, and subscriptions should remain shared.

### QR Direction

Use two main patterns:

- batch QR for consumables
- asset QR for reusable tools and equipment

Avoid a single QR model for all inventory because it creates ambiguity and weakens scan workflows.

## Scope Definition

### MVP Scope

Included in the first meaningful release:

- company onboarding
- sector selection
- role-based access
- warehouse, store, site, or location setup
- item creation and management
- stock in
- stock out
- transfer
- return
- adjustment
- inventory balances by location
- immutable transaction history
- QR generation
- QR scan workflows
- low-stock views
- web dashboard
- mobile field actions
- landing page
- pricing
- subscription gating

### Phase 2 Features

Planned after the operational core is proven. These are not deferred forever — they are sequenced after the MVP generates trust:

- **Invoicing** — create invoices from stock movements, track client payments, mark invoices as sent/paid/overdue
- **Clients** — manage who the company bills (B2B clients tied to projects or recurring accounts)
- **Supplier management** — track who delivers stock, link suppliers to batch records, see spend per supplier
- **Purchase orders** — raise a PO against a supplier, mark received, auto-create stock-in
- **Cycle count workflow** — scheduled or ad-hoc stock count requests, guided counting, auto-adjustment on submit
- **Team invitations** — admin invites workers by email; they receive a link to join the company
- **Low-stock reorder alerts** — set a minimum quantity threshold per item per location; email alert when breached
- **Item images** — attach a photo to each item for field identification via Supabase Storage
- **CSV and PDF export** — export balances, transaction history, and invoices without needing a reporting tool
- **Activity feed** — company-wide timeline of all stock movements visible to managers and admins

### Permanently Deferred

Do not build these in any near-term milestone:

- GPS tracking
- accounting integrations (QuickBooks, Xero)
- complex approval chains
- multi-sector-per-company support
- equipment maintenance scheduling

## Differentiating Features

What makes this platform stand out against generic inventory tools:

### 1. Invoice Directly From Stock Movements

Select stock-out transactions and generate a pre-filled invoice in one action. The invoice automatically contains the item names, quantities, and locations from the actual movement records. No manual re-entry. This closes the loop between field operations and billing.

### 2. Sector-Aware Language Across the Entire UI

A construction company sees "Materials", "Sites", and "Issue to Site". An agriculture company sees "Inputs", "Farms", and "Dispatch". The platform adapts its entire interface to the company's sector — not just a settings label but every heading, button, and empty state.

### 3. Two-Mode QR (Batch vs Asset)

Most inventory tools treat QR as a decoration. This platform ties QR directly to the record model. A batch QR tracks consumable stock from delivery to depletion. An asset QR tracks the physical location and status of reusable equipment through its entire lifecycle.

### 4. Cycle Count Workflow

Guides storekeepers through a structured stock count: request a count → count items one by one → submit → adjustments created automatically. No manual adjustment form. This encourages regular stock validation rather than one-off corrections.

### 5. Supplier Ledger

Every batch received is linked to a supplier. The platform shows spend per supplier, delivery frequency, and the full history of what was received from each source. This gives procurement visibility that generic tools do not provide.

### 6. Multi-Sector From Day One

A sales company and a construction company use the exact same platform and the same shared transaction engine. The sector module system means the platform can serve new sectors without rebuilding infrastructure — just a new module config and terminology set.

### 7. Immutable Transaction Ledger

No transaction can be deleted or edited. Every correction goes through an adjustment transaction with a required reason. This builds trust with managers and admins who need to know the history has not been tampered with.

### 8. Mobile-First Field Execution

The mobile app is purpose-built for field workers — narrow, fast, works with a camera scan. It is not a mobile version of the admin dashboard. Workers see only what they need to act on.

## Strict Execution Roadmap

### Milestone 1: Monorepo Foundation

Goal:
Move from the current single-app setup to a monorepo without breaking the existing auth flow.

Deliverables:

- workspace-based monorepo structure
- current Next.js app moved into apps/web
- Expo app scaffold in apps/mobile
- shared packages created
- root scripts for install, dev, lint, and typecheck

Dependencies:

- none

Main risks:

- broken imports after migration
- auth regressions from path changes
- workspace tooling complexity too early

Acceptance criteria:

- web app runs from apps/web
- auth routes still work
- root workspace scripts work
- shared packages resolve correctly from web and mobile

### Milestone 2: Shared Data Model and Access Control

Goal:
Create the generic inventory schema and enforce company isolation.

Deliverables:

- companies with sector
- profiles or user-company-role mapping
- locations
- items
- batches or assets where required
- inventory balances
- stock transactions
- audit logs
- QR records
- subscriptions and payment records
- RLS policies for reads and writes

Dependencies:

- milestone 1

Main risks:

- schema becomes too construction-specific
- permissions leak across companies
- role rules become implicit instead of enforced centrally

Acceptance criteria:

- users only see their company data
- roles block unauthorized actions
- schema supports construction and at least one non-construction sector without table duplication

### Milestone 3: Shared Inventory Engine

Goal:
Implement one transaction engine for all sector modules.

Deliverables:

- stock in logic
- stock out logic
- transfer logic
- return logic
- adjustment logic
- balance recalculation or consistency enforcement
- audit record creation

Dependencies:

- milestone 2

Main risks:

- business rules duplicated in UI
- negative stock bugs
- partial updates creating inconsistent balances

Acceptance criteria:

- all inventory mutations go through one shared service layer
- insufficient stock is rejected correctly
- every mutation produces a transaction record
- balances stay correct after repeated operations

### Milestone 4: Sector Module Architecture

Goal:
Implement a module-driven app shell that loads the correct sector experience.

Deliverables:

- sector selection in onboarding
- sector persisted at company level
- dashboard loader based on sector
- base modules for construction, agriculture, sales, and other
- module-level terminology and navigation support

Dependencies:

- milestones 1 to 3

Main risks:

- sector logic leaks into shared services
- modules become thin wrappers with duplicated code underneath
- platform promise becomes broader than actual delivery

Acceptance criteria:

- a company can be assigned a sector
- the dashboard loads the correct module
- shared inventory flows remain unchanged underneath the module layer

### Milestone 5: Web Operations MVP

Goal:
Ship the first full operational workflow in the web app.

Deliverables:

- items pages
- locations pages
- inventory balance views
- transaction creation flows
- low-stock views
- transaction history
- role-aware navigation

Dependencies:

- milestones 3 and 4

Main risks:

- admin UI is built before the engine is stable
- sector modules diverge too quickly
- reports are added before transaction accuracy is trusted

Acceptance criteria:

- a company can manage items and locations
- a user can execute stock movement end to end
- stock balances update correctly in the UI
- the same flow works under construction and one non-construction module

### Milestone 6: QR Workflows

Goal:
Make QR useful in actual operations rather than decorative.

Deliverables:

- QR generation for supported inventory records
- printable QR labels
- scan-to-identify flow
- scan-to-issue flow
- scan-to-transfer confirmation flow

Dependencies:

- milestones 3 and 5

Main risks:

- QR payload design is too vague
- one QR model tries to serve both batches and assets poorly
- scan flows depend on too much manual correction

Acceptance criteria:

- generated QR maps back to the intended record reliably
- scan actions can identify the correct item, batch, or asset
- scan-to-action works in the web app or mobile app as designed

### Milestone 7: Mobile Field App

Goal:
Give field users a narrow, reliable way to perform stock actions.

Deliverables:

- login
- stock lookup by assigned location
- QR scanning
- issue flow
- transfer confirmation
- recent activity

Dependencies:

- milestones 1, 3, and 6

Main risks:

- mobile tries to mirror full web parity
- offline support is attempted before online flow is stable
- camera and device constraints are ignored

Acceptance criteria:

- a field user can log in and complete the supported flows
- mobile uses shared types and logic where appropriate
- the app is usable with minimal training

### Milestone 8: Marketing and Billing Layer

Goal:
Add the commercial surface after the operational product is credible.

Deliverables:

- landing site
- pricing page
- sector-specific marketing sections
- Paystack integration
- Stripe integration
- subscription state storage
- dashboard access gating

Dependencies:

- milestone 5 for credibility
- milestone 2 for company records

Main risks:

- billing is implemented before the product is operationally trustworthy
- provider-specific logic leaks everywhere
- pricing is defined before value is validated

Acceptance criteria:

- public site explains the product and sectors clearly
- Nigeria companies can subscribe through Paystack
- non-Nigeria companies can subscribe through Stripe
- inactive subscriptions cannot access the protected app

### Milestone 9: Reporting, Hardening, and Pilot

Goal:
Prepare the platform for live use with a small number of real customers.

Deliverables:

- stock by location reports
- movement history reports
- low-stock reporting
- empty and error states
- operational logging and monitoring
- demo data
- pilot checklist

Dependencies:

- milestones 5 to 8

Main risks:

- pilot starts before observability exists
- edge cases are only discovered in production
- reporting depends on weak transaction data

Acceptance criteria:

- reports are consistent with transaction records
- pilot users can complete core tasks without manual database intervention
- product issues can be diagnosed from logs and audit records

### Milestone 10: Invoicing and Client Management

Goal:
Close the loop between stock movements and billing. Companies can create invoices, link them to clients, pre-fill line items from stock-out records, and track payment status.

Deliverables:

- client list and creation
- invoice creation with manual line items
- invoice pre-fill from selected stock-out transactions
- invoice status lifecycle (draft, sent, paid, overdue, void)
- invoice PDF export
- client payment tracking
- invoice history per client

Dependencies:

- milestones 5 and 9

Main risks:

- invoice totals diverge from actual stock movement values
- companies use invoicing as a substitute for stock tracking
- tax and currency handling becomes a rabbit hole early

Acceptance criteria:

- a company can create an invoice manually or from stock-out records
- invoice status transitions are correct and audited
- invoice PDF renders correctly
- client payment recorded against invoice

## Critical Risks

1. Platform breadth outruns execution depth.
2. Sector modules duplicate logic instead of reusing the core engine.
3. QR is treated as a UI add-on instead of a tracking model.
4. Mobile scope expands into full parity too early.
5. Billing is prioritized before trust in stock accuracy exists.
6. The schema becomes too tied to construction and resists later sectors.

## Non-Negotiable Acceptance Rules

1. No direct inventory mutation logic in UI components.
2. No cross-company data leakage.
3. No release without immutable transaction records.
4. No QR release without a defined record model behind the code.
5. No multi-sector-per-company support in the first release.
6. No invoicing before the operational core (Milestones 1–9) is proven with real users.

## Immediate Next Actions

1. Finalize the monorepo folder structure.
2. Finalize the shared schema and sector model.
3. Define the shared transaction engine interfaces.
4. Define the module contract for sector-specific UI.
5. Implement the construction module first.
6. Validate one non-construction module with lighter coverage.

## Reference to Current Codebase

These files remain the best foundation for the first implementation pass:

- /Users/mac/Desktop/projects/inventaryexpert/package.json
- /Users/mac/Desktop/projects/inventaryexpert/README.md
- /Users/mac/Desktop/projects/inventaryexpert/proxy.ts
- /Users/mac/Desktop/projects/inventaryexpert/app/(auth)/actions/auth-actions.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/supabase/server.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/supabase/client.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/supabase/action.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/supabase/middleware.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/redirect/redirectIfAuthenticated.ts
- /Users/mac/Desktop/projects/inventaryexpert/lib/redirect/redirectIfNotAuthenticated.ts
- /Users/mac/Desktop/projects/inventaryexpert/app/dashboard/layout.tsx
- /Users/mac/Desktop/projects/inventaryexpert/app/dashboard/page.tsx
- /Users/mac/Desktop/projects/inventaryexpert/components/ui
