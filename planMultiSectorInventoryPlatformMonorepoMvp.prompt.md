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

### Deferred Scope

Do not include these in the first release:

- invoicing
- procurement
- supplier management
- GPS
- advanced analytics
- equipment maintenance
- accounting behavior
- complex approval chains
- multi-sector-per-company support

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
6. No invoicing in the MVP.

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
