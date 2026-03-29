"use server";

import { createClient } from "@/lib/supabase/server";
import {
  adjustment,
  InventoryError,
  returnStock,
  stockIn,
  stockOut,
  transfer,
} from "@inventaryexpert/services";
import { redirect } from "next/navigation";

type StockResult =
  | { success: true; transactionId: string }
  | { error: string; code?: string };

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

export async function stockInAction(formData: FormData): Promise<StockResult> {
  const { supabase, profile } = await getSessionContext();

  try {
    const result = await stockIn(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      toLocationId: formData.get("toLocationId") as string,
      quantity: Number(formData.get("quantity")),
      batchId: (formData.get("batchId") as string) || undefined,
      note: (formData.get("note") as string) || undefined,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}

export async function stockOutAction(formData: FormData): Promise<StockResult> {
  const { supabase, profile } = await getSessionContext();

  try {
    const result = await stockOut(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      fromLocationId: formData.get("fromLocationId") as string,
      quantity: Number(formData.get("quantity")),
      note: (formData.get("note") as string) || undefined,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}

export async function transferAction(formData: FormData): Promise<StockResult> {
  const { supabase, profile } = await getSessionContext();

  try {
    const result = await transfer(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      fromLocationId: formData.get("fromLocationId") as string,
      toLocationId: formData.get("toLocationId") as string,
      quantity: Number(formData.get("quantity")),
      note: (formData.get("note") as string) || undefined,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}

export async function returnStockAction(
  formData: FormData,
): Promise<StockResult> {
  const { supabase, profile } = await getSessionContext();

  try {
    const result = await returnStock(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      fromLocationId: formData.get("fromLocationId") as string,
      toLocationId: formData.get("toLocationId") as string,
      quantity: Number(formData.get("quantity")),
      note: (formData.get("note") as string) || undefined,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}

export async function adjustmentAction(
  formData: FormData,
): Promise<StockResult> {
  const { supabase, profile } = await getSessionContext();

  if (!["admin", "manager"].includes(profile.role)) {
    return { error: "Insufficient permissions", code: "FORBIDDEN" };
  }

  try {
    const result = await adjustment(supabase, {
      companyId: profile.company_id,
      itemId: formData.get("itemId") as string,
      locationId: formData.get("locationId") as string,
      newQuantity: Number(formData.get("newQuantity")),
      reason: formData.get("reason") as string,
      performedBy: profile.id,
    });
    return { success: true, transactionId: result.transactionId };
  } catch (err) {
    if (err instanceof InventoryError)
      return { error: err.message, code: err.code };
    return { error: "Unexpected error" };
  }
}
