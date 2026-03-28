# Supabase SQL Files

Paste-ready SQL files for setting up the full schema in Supabase SQL Editor.
Run them **in order** — each file declares its dependencies in the header comment.

| File                        | Table / Object                 | Depends On             |
| --------------------------- | ------------------------------ | ---------------------- |
| `00_enums.sql`              | All `CREATE TYPE` enums        | —                      |
| `01_rls_helper.sql`         | `get_my_company_id()` function | 02                     |
| `02_companies.sql`          | `companies`                    | 00                     |
| `03_profiles.sql`           | `profiles`                     | 01, 02                 |
| `04_locations.sql`          | `locations`                    | 01, 02, 00             |
| `05_items.sql`              | `items`                        | 01, 02, 00             |
| `06_batches.sql`            | `batches`                      | 01, 02, 04, 05         |
| `07_assets.sql`             | `assets`                       | 01, 02, 03, 04, 05, 00 |
| `08_inventory_balances.sql` | `inventory_balances`           | 01–05                  |
| `09_stock_transactions.sql` | `stock_transactions`           | 01–07                  |
| `10_audit_logs.sql`         | `audit_logs`                   | 01–03                  |
| `11_qr_codes.sql`           | `qr_codes`                     | 01, 02, 00             |
| `12_subscriptions.sql`      | `subscriptions`                | 01, 02, 00             |
| `13_payments.sql`           | `payments`                     | 01, 02, 12, 00         |
| `14_clients.sql`            | `clients`                      | 01, 02                 |
| `15_invoices.sql`           | `invoices`                     | 01, 02, 03, 14, 00     |
| `16_invoice_line_items.sql` | `invoice_line_items`           | 01, 02, 05, 09, 15     |

## How to Run

1. Open your Supabase project → **SQL Editor**
2. Paste the full contents of `00_enums.sql` and click **Run**
3. Paste `01_rls_helper.sql` and **Run**
4. Continue in order through `16_invoice_line_items.sql`

> Alternatively, concatenate all files and run in one shot:
>
> ```sh
> cat supabase/{00..16}_*.sql | pbcopy   # macOS — pastes to clipboard
> ```

## RLS Design Rules

- Every tenant table has `company_id uuid not null references companies(id) on delete cascade`
- Every RLS policy calls `public.get_my_company_id()` — a `SECURITY DEFINER, STABLE` function that returns `auth.uid()`'s company
- `inventory_balances` and `stock_transactions` are **write-protected from client code** — only Postgres RPC functions (called with `supabase.rpc()`) modify them
- `audit_logs` and `payments` are **insert-protected** — rows are inserted by service role webhooks/triggers only
- Role hierarchy for writes: `admin ≥ manager > storekeeper > viewer`
