import { createLocationAction } from "@/app/dashboard/actions/locations";
import { LocationForm } from "@/components/inventory/LocationForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewLocationPage() {
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
    redirect("/dashboard/locations");
  }

  const { data: parentLocations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Location</h1>
        <p className="text-sm text-muted-foreground">
          Add a warehouse, store, or site to your network
        </p>
      </div>
      <LocationForm
        action={createLocationAction}
        parentLocations={parentLocations ?? []}
        submitLabel="Create Location"
      />
    </div>
  );
}
