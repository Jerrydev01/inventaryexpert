import { updateItemAction } from "@/app/dashboard/actions/items";
import { ItemForm } from "@/components/inventory/ItemForm";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/dashboard/items");
  }

  const { data: item } = await supabase
    .from("items")
    .select("id, name, sku, unit, category, description, is_tracked_asset")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!item) notFound();

  const boundAction = updateItemAction.bind(null, id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Item</h1>
        <p className="text-sm text-muted-foreground">
          Update details for <span className="font-medium">{item.name}</span>
        </p>
      </div>
      <ItemForm
        action={boundAction}
        defaultValues={{
          name: item.name,
          sku: item.sku ?? undefined,
          unit: item.unit,
          category: item.category ?? undefined,
          description: item.description ?? undefined,
          is_tracked_asset: item.is_tracked_asset,
        }}
        submitLabel="Update Item"
      />
    </div>
  );
}
