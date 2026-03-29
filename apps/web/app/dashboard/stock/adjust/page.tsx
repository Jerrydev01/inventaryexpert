import { adjustmentAction } from "@/app/dashboard/actions/stock";
import { StockForm } from "@/components/inventory/StockForm";
import { createClient } from "@/lib/supabase/server";
import { getModule } from "@/modules/registry";
import type { Sector } from "@inventaryexpert/types";
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
    .select("company_id, role, companies(sector)")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  if (!["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const sector = ((profile.companies as { sector?: string } | null)?.sector ??
    "other") as Sector;
  const module = getModule(sector);
  const labels = module.labels;

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
        <h1 className="text-2xl font-bold tracking-tight">
          {labels.adjustment}
        </h1>
        <p className="text-sm text-muted-foreground">
          Correct {labels.item.toLowerCase()} quantities after a physical count
        </p>
      </div>
      <StockForm
        title={labels.adjustment}
        description={`Set the actual ${labels.item.toLowerCase()} quantity found during physical count. Requires a reason.`}
        items={items ?? []}
        locations={locations ?? []}
        mode="adjust"
        action={adjustmentAction}
        itemLabel={labels.item}
        locationLabel={labels.location}
        defaultItemId={itemId}
        defaultLocationId={locationId}
      />
    </div>
  );
}
