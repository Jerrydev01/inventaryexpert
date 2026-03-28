import type { Database } from "@inventaryexpert/types";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

/**
 * Service-role client — bypasses RLS.
 * ONLY use in:
 *   - Server Actions that need to create companies/profiles during onboarding
 *   - API route handlers processing payment webhooks
 *   - Background jobs writing audit_logs / inventory_balances
 *
 * Never expose this client to the browser.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
