# Milestone 7 — Mobile Field App Implementation Spec

**Goal:** Give field workers a narrow, reliable Expo app to perform stock lookups, QR scanning, and the issue/transfer/return flows. The mobile app is not a mirror of the web app — it covers a small, focused subset of operations.  
**Dependency:** Milestones 1 (monorepo), 3 (engine), and 6 (QR) complete.  
**Lives in:** `apps/mobile/`

---

## Guiding Rules

1. The mobile app is for field workers only. Admin and manager workflows stay in the web app.
2. No offline support in v1. Every action needs a network connection. Show a clear error when offline.
3. The mobile app shares `@inventaryexpert/types` and `@inventaryexpert/utils` from the monorepo. It does NOT share React components with `apps/web`.
4. The mobile app calls Supabase directly using `@supabase/supabase-js` (no SSR client — this is a native app, not a Next.js app).
5. The camera scanner uses `expo-camera` + `expo-barcode-scanner` — not `html5-qrcode`.
6. QR payload parsing is shared from `packages/utils/src/qr/parse.ts` — the same function the web app uses.

---

## Bootstrap the Expo App

Run once from the repo root after Milestone 6 is complete:

```bash
cd apps/mobile
npx create-expo-app@latest . --template blank-typescript --yes
```

This overwrites the placeholder with a real Expo project. After scaffolding:

1. Keep the `@inventaryexpert/types: workspace:*` dependency.
2. Add Supabase, navigation, and camera packages.
3. Run `pnpm install` from repo root.

```bash
pnpm --filter @inventaryexpert/mobile add \
  @supabase/supabase-js \
  expo-secure-store \
  expo-camera \
  expo-barcode-scanner \
  @react-navigation/native \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context
```

---

## Supabase Client (Mobile)

The mobile app uses `AsyncStorage` or `expo-secure-store` for session persistence. It does **not** use `@supabase/ssr`.

**`apps/mobile/lib/supabase.ts`:**

```ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
```

**Environment variables** go in `apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## App File Structure

```
apps/mobile/
  app/
    _layout.tsx               ← root layout: auth guard + navigation setup
    index.tsx                 ← redirects to (auth) or (app) based on session
    (auth)/
      _layout.tsx
      login.tsx               ← email + password sign in
    (app)/
      _layout.tsx             ← tab navigator + session check
      index.tsx               ← home: location stock summary
      scan.tsx                ← QR camera scanner
      scan-resolve.tsx        ← looks up scanned payload, routes to action
      issue.tsx               ← stock out form (pre-fillable via params)
      transfer.tsx            ← transfer form (pre-fillable)
      return.tsx              ← return form (pre-fillable)
      history.tsx             ← recent transactions by this user
  lib/
    supabase.ts               ← Supabase client
    session.ts                ← useSession hook
  components/
    StockFormBase.tsx         ← shared layout for issue/transfer/return
    BalanceRow.tsx            ← single item+quantity row
    TransactionRow.tsx        ← single transaction row
    ErrorMessage.tsx          ← consistent error display
  constants/
    navigation.ts             ← route names
```

---

## Auth Flow

### Root layout (`app/_layout.tsx`)

```tsx
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { supabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSession(session),
    );
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <Stack>
      {session ? (
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      ) : (
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      )}
    </Stack>
  );
}
```

---

### Login screen (`app/(auth)/login.tsx`)

Fields: email, password. Submit calls `supabase.auth.signInWithPassword`. Errors displayed inline. No "create account" on mobile — workers register via invitation in v1 (or the web app).

```tsx
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) setErrorMessage(error.message);
```

---

## Home Screen — Location Stock Summary

After login, the home screen shows current stock at all locations the company has, filtered to items that have quantity > 0.

```ts
// Fetch profile → company_id
const { data: profile } = await supabase
  .from("profiles")
  .select("company_id, role")
  .eq("id", user.id)
  .single();

// Fetch balances
const { data: balances } = await supabase
  .from("inventory_balances")
  .select("quantity, items(name, unit), locations(name)")
  .eq("company_id", profile.company_id)
  .gt("quantity", 0)
  .order("locations(name)");
```

**UI:** grouped flat list by location. Tapping an item opens a quick-action sheet with "Issue", "Transfer", "Return" buttons that navigate to the relevant form pre-filled.

---

## QR Scanner Screen (`app/(app)/scan.tsx`)

```tsx
import { CameraView, useCameraPermissions } from "expo-camera";
import { parseQrPayload } from "@inventaryexpert/utils/qr/parse";
import { router } from "expo-router";

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission?.granted) {
    return (
      <View>
        <Text>Camera permission is required.</Text>
        <Button title="Grant Permission" onPress={requestPermission} />
      </View>
    );
  }

  function handleBarcodeScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);

    const payload = parseQrPayload(data);
    if (payload.type === "unknown") {
      Alert.alert("Not recognised", "This QR code is not an inventory code.");
      setScanned(false);
      return;
    }

    router.push({
      pathname: "/scan-resolve",
      params: { raw: data },
    });
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      facing="back"
      onBarcodeScanned={handleBarcodeScan}
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
    />
  );
}
```

---

## Scan Resolve Screen (`app/(app)/scan-resolve.tsx`)

Receives `raw` param. Looks up the payload in `qr_codes` and routes to the correct action.

```ts
const payload = parseQrPayload(raw);

if (payload.type === "unknown") {
  router.replace("/scan");
  return;
}

const { data } = await supabase
  .from("qr_codes")
  .select("record_type, record_id")
  .eq("payload", raw)
  .eq("company_id", profile.company_id)
  .single();

if (!data) {
  setError("QR code not found in your company.");
  return;
}

// Show action sheet: "Issue", "Transfer", "Return"
// Tapping Issue → router.push({ pathname: '/issue', params: { itemId, batchId } })
```

---

## Issue Screen (`app/(app)/issue.tsx`)

Pre-fillable from params: `itemId`, `batchId`, `fromLocationId`.

**Fields:**

- Item (pre-filled or searchable)
- From location (pre-filled or selectable)
- Quantity (numeric keyboard)
- Note (optional)

**On submit:**

```ts
const { error } = await supabase.rpc("process_stock_out", {
  p_company_id: profile.company_id,
  p_item_id: itemId,
  p_from_location_id: fromLocationId,
  p_quantity: quantity,
  p_batch_id: batchId ?? null,
  p_note: note ?? null,
  p_performed_by: user.id,
});
```

> The mobile app calls the Supabase RPC functions directly — it does not go through Next.js server actions. This is correct because mobile is a standalone client.

**On success:** "Issued successfully" confirmation screen with a "Done" button back to home.  
**On error with INSUFFICIENT_STOCK:** show red inline error with the available balance.

---

## Transfer Screen (`app/(app)/transfer.tsx`)

Same pattern as issue. Fields: item, from location, to location (must differ), quantity, note.  
Calls `process_transfer` RPC.

---

## Return Screen (`app/(app)/return.tsx`)

Fields: item, from location (field), to location (store), quantity, note.  
Calls `process_return` RPC.

---

## History Screen (`app/(app)/history.tsx`)

Shows last 50 transactions performed by the logged-in user.

```ts
const { data } = await supabase
  .from("stock_transactions")
  .select(
    `
    id, type, quantity, created_at,
    items(name),
    from_location:locations!from_location_id(name),
    to_location:locations!to_location_id(name)
  `,
  )
  .eq("company_id", profile.company_id)
  .eq("performed_by", user.id)
  .order("created_at", { ascending: false })
  .limit(50);
```

Flat list. No pagination in v1.

---

## Navigation Structure

Bottom tab navigator with four tabs:

```
Home (stock summary)
Scan QR
History
Sign Out
```

"Sign Out" calls `supabase.auth.signOut()` and navigates to login.

---

## Scope Boundaries

The mobile app in v1 does **not** include:

| Feature                    | Why deferred                                   |
| -------------------------- | ---------------------------------------------- |
| Create items or locations  | Admin workflow — stays in web app              |
| View or manage other users | Admin workflow                                 |
| Adjustments                | Requires manager/admin role, deliberate action |
| Dashboard widgets          | Not useful on a small screen for field work    |
| Offline queue              | Requires conflict resolution — deferred        |
| Push notifications         | Infrastructure not set up in v1                |
| Batch creation             | Storekeeper workflow — web app only in v1      |

---

## Environment File

`apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

> The mobile anon key is the same one used in the web app. RLS protects the data — the anon key is safe to ship in the mobile bundle.

---

## Testing Before Ship

1. Sign in on a real iOS device and an Android device.
2. Scan a batch QR code generated from the web app.
3. Confirm it resolves to the correct record.
4. Issue 1 unit. Check that the web app shows the updated balance immediately.
5. Transfer 1 unit. Check that both location balances update.
6. Return 1 unit. Check balance at both ends.
7. Force an INSUFFICIENT_STOCK error. Confirm the error message shows correctly.
8. Sign out. Confirm the user returns to the login screen and cannot navigate back to the app.

---

## Acceptance Criteria

- [ ] The app builds and runs on iOS and Android via `expo start`
- [ ] Login with valid credentials works; invalid credentials show an error without crashing
- [ ] Home screen displays current balances from the logged-in user's company
- [ ] Camera permission prompt works; scanning a valid QR code routes to the correct screen
- [ ] Scanning an unknown QR shows an error, does not crash
- [ ] Issue, transfer, and return flows all complete end-to-end and update balances visible in the web app
- [ ] `INSUFFICIENT_STOCK` error is displayed inline on the issue form without crashing
- [ ] History screen shows only transactions performed by the logged-in user
- [ ] Sign out returns to the login screen
- [ ] `@inventaryexpert/types` and `@inventaryexpert/utils` resolve correctly in the mobile build

---

## Next Step

Milestone 8 — marketing site, pricing page, Paystack + Stripe integration, and subscription access gating.
