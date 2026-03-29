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

export async function createItemAction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim() || "unit";
  const category = (formData.get("category") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;
  const is_tracked_asset = formData.get("is_tracked_asset") === "true";

  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("items").insert({
    company_id: profile.company_id,
    name,
    sku,
    unit,
    category,
    description,
    is_tracked_asset,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "An item with this SKU already exists" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/items");
  return { success: true };
}

export async function updateItemAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  const name = (formData.get("name") as string)?.trim();
  const sku = (formData.get("sku") as string)?.trim() || null;
  const unit = (formData.get("unit") as string)?.trim() || "unit";
  const category = (formData.get("category") as string)?.trim() || null;
  const description = (formData.get("description") as string)?.trim() || null;

  if (!name) return { error: "Name is required" };

  const { error } = await supabase
    .from("items")
    .update({ name, sku, unit, category, description })
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) {
    if (error.code === "23505")
      return { error: "An item with this SKU already exists" };
    return { error: error.message };
  }

  revalidatePath("/dashboard/items");
  revalidatePath(`/dashboard/items/${id}`);
  return { success: true };
}

export async function deactivateItemAction(id: string): Promise<ActionResult> {
  const { supabase, profile } = await getSessionContext();

  if (profile.role !== "admin") {
    return { error: "Only admins can deactivate items", code: "FORBIDDEN" };
  }

  const { error } = await supabase
    .from("items")
    .update({ is_active: false })
    .eq("id", id)
    .eq("company_id", profile.company_id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/items");
  return { success: true };
}
