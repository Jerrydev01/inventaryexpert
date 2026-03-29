import { stockOutAction } from "@/app/dashboard/actions/stock";
import { StockForm } from "@/components/inventory/StockForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StockOutPage({
  searchParams,
}: {
  searchParams: Promise<{ itemId?: string; fromLocationId?: string }>;
}) {
  const { itemId, fromLocationId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

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
        <h1 className="text-2xl font-bold tracking-tight">Issue / Stock Out</h1>
        <p className="text-sm text-muted-foreground">
          Issue items from a location
        </p>
      </div>
      <StockForm
        title="Issue Stock"
        items={items ?? []}
        locations={locations ?? []}
        mode="out"
        action={stockOutAction}
        defaultItemId={itemId}
        defaultFromLocationId={fromLocationId}
      />
    </div>
  );
}
