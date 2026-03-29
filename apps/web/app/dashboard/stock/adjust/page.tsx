import { adjustmentAction } from "@/app/dashboard/actions/stock";
import { StockForm } from "@/components/inventory/StockForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdjustmentPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; locationId?: string }>;
}) {
  const { itemId, locationId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  if (!["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const [{ data: items }, { data: locations }] = await Promise.all([
    supabase
      .from("items")
      .select("id, name, sku, unit")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("locations")
      .select("id, name, type")
      .eq("company_id", profile.company_id)
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock Adjustment</h1>
        <p className="text-sm text-muted-foreground">
          Correct stock quantities after a physical count
        </p>
      </div>
      <StockForm
        title="Adjust Stock"
        description="Set the actual quantity found during physical count. Requires a reason."
        items={items ?? []}
        locations={locations ?? []}
        mode="adjust"
        action={adjustmentAction}
        defaultItemId={itemId}
        defaultLocationId={locationId}
      />
    </div>
  );
}
