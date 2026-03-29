import { updateLocationAction } from "@/app/dashboard/actions/locations";
import { LocationForm } from "@/components/inventory/LocationForm";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function EditLocationPage({
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
    redirect("/dashboard/locations");
  }

  const { data: location } = await supabase
    .from("locations")
    .select("id, name, type, parent_id")
    .eq("id", id)
    .eq("company_id", profile.company_id)
    .single();

  if (!location) notFound();

  const { data: parentLocations } = await supabase
    .from("locations")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .neq("id", id)
    .order("name");

  const boundAction = updateLocationAction.bind(null, id);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-6 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Location</h1>
        <p className="text-sm text-muted-foreground">
          Update details for{" "}
          <span className="font-medium">{location.name}</span>
        </p>
      </div>
      <LocationForm
        action={boundAction}
        parentLocations={parentLocations ?? []}
        defaultValues={{
          name: location.name,
          type: location.type,
          parent_id: location.parent_id ?? undefined,
        }}
        submitLabel="Update Location"
      />
    </div>
  );
}
