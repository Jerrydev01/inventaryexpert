import { createItemAction } from "@/app/dashboard/actions/items";
import { ItemForm } from "@/components/inventory/ItemForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewItemPage() {
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

  if (!profile || !(["admin", "manager"] as string[]).includes(profile.role)) {
    redirect("/dashboard/items");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Item</h1>
        <p className="text-sm text-muted-foreground">
          Add a new item to your inventory catalogue
        </p>
      </div>
      <ItemForm
        action={createItemAction}
        companyId={profile.company_id}
        submitLabel="Create Item"
      />
    </div>
  );
}
