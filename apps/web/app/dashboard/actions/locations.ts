"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type ActionResult = { success: true } | { error: string; code?: string };

async function getSessionContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");
  return { supabase, user, profile };
}

export async function createLocationAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "other";
  const parent_id = (formData.get("parent_id") as string) || null;

  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("locations").insert({
    company_id: profile.company_id,
    name,
    type: type as "warehouse" | "store" | "site" | "other" | "vehicle",
    parent_id: parent_id || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/locations");
  return { success: true };
}

export async function updateLocationAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "other";
  const parent_id = (formData.get("parent_id") as string) || null;

  if (!name) return { error: "Name is required" };

  const { error } = await supabase
    .from("locations")
    .update({
      name,
      type: type as "warehouse" | "store" | "site" | "other" | "vehicle",
      parent_id: parent_id || null,
    })
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/locations");
  revalidatePath(`/dashboard/locations/${id}`);
  return { success: true };
}

export async function deactivateLocationAction(
  id: string,
): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (profile.role !== "admin") {
    return { error: "Only admins can deactivate locations", code: "FORBIDDEN" };
  }

  const { error } = await supabase
    .from("locations")
    .update({ is_active: false })
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/locations");
  return { success: true };
}
