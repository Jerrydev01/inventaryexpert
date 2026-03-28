# Milestone 6 — QR Workflows Implementation Spec

**Goal:** Make QR functional in operations. Generate stable QR codes for inventory records, print labels, and support scan-to-identify and scan-to-action flows in both the web app and the mobile app.  
**Dependency:** Milestones 3 (engine) and 5 (web operations MVP) complete.  
**Lives in:** `packages/utils/src/qr/`, `apps/web/app/(dashboard)/qr/`, `apps/web/components/qr/`

---

## QR Model Decision

Two distinct QR patterns. A single QR code must never try to serve both.

| Pattern      | Applies to                                           | Record pointed to | What a scan triggers                                          |
| ------------ | ---------------------------------------------------- | ----------------- | ------------------------------------------------------------- |
| **Batch QR** | Consumable items (`is_tracked_asset = false`)        | `batches` row     | Identify → show item + batch + current stock across locations |
| **Asset QR** | Tracked individual items (`is_tracked_asset = true`) | `assets` row      | Identify → show asset, status, current location, history      |

There is no generic "item QR" in v1. QR is always attached to a specific record, not to an item definition.

---

## QR Payload Format

Payloads are compact text strings, not URLs. The app resolves them by lookup, not by embedding app logic in the QR.

```
inv:batch:{uuid}
inv:asset:{uuid}
```

Examples:

```
inv:batch:550e8400-e29b-41d4-a716-446655440000
inv:asset:f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**Why not a URL:** URLs break when the domain changes, when the app is offline, or when the QR is scanned by a third-party camera. A compact payload with a lookup step is more durable.

**Payload parser (`packages/utils/src/qr/parse.ts`):**

```ts
export type QrPayload =
  | { type: "batch"; recordId: string }
  | { type: "asset"; recordId: string }
  | { type: "unknown" };

export function parseQrPayload(raw: string): QrPayload {
  const parts = raw.trim().split(":");
  if (parts.length !== 3 || parts[0] !== "inv") return { type: "unknown" };
  const [, recordType, recordId] = parts;
  if (recordType === "batch") return { type: "batch", recordId };
  if (recordType === "asset") return { type: "asset", recordId };
  return { type: "unknown" };
}
```

---

## QR Generation

### Library

Use `qrcode` (server-side) for generation. No client-side QR generation.

```bash
pnpm --filter @inventaryexpert/web add qrcode
pnpm --filter @inventaryexpert/web add -D @types/qrcode
```

### Generator utility (`apps/web/lib/qr/generate.ts`)

```ts
import QRCode from "qrcode";

export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });
}
```

### Server action to create a QR code (`actions/qr.ts`)

QR codes are generated on demand and stored in the `qr_codes` table. If one already exists for the record, return the existing one.

```ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { generateQrDataUrl } from "@/lib/qr/generate";

export async function getOrCreateQrCode(
  recordType: "batch" | "asset",
  recordId: string,
): Promise<{ payload: string; dataUrl: string } | { error: string }> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  // Check if QR already exists
  const { data: existing } = await supabase
    .from("qr_codes")
    .select("payload")
    .eq("company_id", profile.company_id)
    .eq("record_type", recordType)
    .eq("record_id", recordId)
    .single();

  const payload = existing?.payload ?? `inv:${recordType}:${recordId}`;

  if (!existing) {
    const { error } = await supabase.from("qr_codes").insert({
      company_id: profile.company_id,
      record_type: recordType,
      record_id: recordId,
      payload,
    });
    if (error) return { error: error.message };
  }

  const dataUrl = await generateQrDataUrl(payload);
  return { payload, dataUrl };
}
```

---

## QR Label Print View

A minimal print-optimized page. Navigating here renders a page with only the QR image, the record name, and a barcode-style reference number. CSS `@media print` hides everything else.

```
app/(dashboard)/qr/
  label/
    [type]/
      [id]/
        page.tsx        ← server component, calls getOrCreateQrCode, renders print view
```

**Page (`/qr/label/batch/[id]`):**

```tsx
import { getOrCreateQrCode } from "@/app/(dashboard)/actions/qr";

export default async function QrLabelPage({
  params,
}: {
  params: { type: string; id: string };
}) {
  const result = await getOrCreateQrCode(
    params.type as "batch" | "asset",
    params.id,
  );

  if ("error" in result) return <p>Error: {result.error}</p>;

  return (
    <div className="qr-label">
      <img src={result.dataUrl} alt="QR Code" width={200} height={200} />
      <p className="qr-reference">{result.payload}</p>
      <style>{`
        @media print {
          body > *:not(.qr-label) { display: none; }
          .qr-label { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
```

A "Print Label" button on the batch or asset detail page links to this route and triggers `window.print()`.

---

## QR Scan Resolution (Web)

For the web app, scanning is done via the device camera through the browser (used on tablets or mobile browsers logged into the web app). This uses the `html5-qrcode` library.

```bash
pnpm --filter @inventaryexpert/web add html5-qrcode
```

### Scanner component (`components/qr/QrScanner.tsx`)

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { parseQrPayload } from "@inventaryexpert/utils/qr/parse";
import type { QrPayload } from "@inventaryexpert/utils/qr/parse";

export function QrScanner({
  onResult,
}: {
  onResult: (payload: QrPayload) => void;
}) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (rawText) => {
        const parsed = parseQrPayload(rawText);
        onResult(parsed);
        scanner.stop();
      },
      undefined,
    );

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [onResult]);

  return <div id="qr-reader" style={{ width: "100%" }} />;
}
```

---

## Scan-to-Identify Flow

```
app/(dashboard)/qr/
  scan/
    page.tsx        ← opens camera, reads QR
  resolve/
    page.tsx        ← receives payload as search param, looks up record, redirects
```

**Scan page (`/qr/scan`):**  
Renders `QrScanner`. On result:

- If `type === 'unknown'` → show "QR code not recognised" toast.
- Otherwise → `router.push('/qr/resolve?payload=inv:batch:...')`.

**Resolve page (`/qr/resolve?payload=...`):**  
Server component. Calls Supabase to look up `qr_codes` by payload, then redirects to the correct detail page:

- `batch` → `/dashboard/batches/[id]`
- `asset` → `/dashboard/assets/[id]`

```ts
const { data } = await supabase
  .from('qr_codes')
  .select('record_type, record_id')
  .eq('payload', payload)
  .eq('company_id', profile.company_id)
  .single();

if (!data) return <p>QR code not found in your company.</p>;
redirect(`/dashboard/${data.record_type}s/${data.record_id}`);
```

---

## Scan-to-Issue Flow

After a QR scan resolves the record, the batch or asset detail page offers contextual action buttons. For a batch, these are:

- **Issue from this batch** → pre-fills the stock out form with the batch's item and batch ID
- **Transfer** → pre-fills transfer form
- **Return** → pre-fills return form

The pre-fill is done via search params:

```
/dashboard/stock/out?itemId=...&batchId=...&fromLocationId=...
```

The stock out form reads these params and pre-populates the relevant fields.

---

## Scan-to-Transfer Confirmation Flow

A worker scans the QR on a location (if location QR is supported) or an asset, then sees a confirmation screen showing what is currently held there and offers a transfer action. This is the fieldwork flow:

1. Worker scans asset QR on a piece of equipment.
2. App shows: "Excavator #3 — currently at Site A — status: in use".
3. Worker taps "Transfer to Site B" → pre-filled transfer form → confirm.
4. Asset `location_id` and `status` updated, transaction record created.

---

## QR in the Navigation

Add a "Scan QR" entry to every module's nav in the `SectorModule` config. This is a single nav item pointing to `/dashboard/qr/scan` — it does not change per sector.

```ts
{ label: 'Scan QR', href: '/dashboard/qr/scan', icon: 'qr-code' }
```

---

## What QR Does NOT Do in v1

- No bulk QR generation (print 50 labels at once) — one at a time only.
- No QR on items themselves (only on batches and assets).
- No offline QR resolution (requires a network call to look up the payload).
- No QR on locations in v1 — location QR is deferred to the mobile milestone.

---

## Acceptance Criteria

- [ ] `parseQrPayload` correctly parses `inv:batch:{uuid}` and `inv:asset:{uuid}` and returns `{ type: 'unknown' }` for anything else
- [ ] Calling `getOrCreateQrCode` for the same record twice returns the same payload both times
- [ ] Print label page renders QR and hides all other UI on `@media print`
- [ ] Scanning a batch QR redirects to the correct batch detail page
- [ ] Scanning an unknown or malformed QR shows an error message rather than crashing
- [ ] Batch detail page has "Issue from this batch" button that pre-fills the stock out form
- [ ] Asset detail page has "Transfer" button that pre-fills the transfer form
- [ ] QR codes stored in `qr_codes` table include correct `record_type`, `record_id`, and `payload`

---

## Next Step

Milestone 7 — the mobile field app, which extends the scan-to-action flows to a native Expo app with a better camera experience.
