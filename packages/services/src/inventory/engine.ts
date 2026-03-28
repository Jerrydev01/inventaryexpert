import type {
  AdjustmentInput,
  AssetMoveInput,
  Database,
  OperationResult,
  ReturnInput,
  StockInInput,
  StockOutInput,
  TransferInput,
} from "@inventaryexpert/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { InventoryError } from "./errors";
import {
  validateDifferentLocations,
  validateNewQuantity,
  validateQuantity,
} from "./validators";

// The engine accepts any typed Supabase client (browser or server).
// The caller (server action) is responsible for providing the right client.
type TypedClient = SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Internal helper — translate Postgres exception messages to typed errors
// ---------------------------------------------------------------------------

function parsePostgresError(message: string): InventoryError {
  if (message.includes("INSUFFICIENT_STOCK")) {
    return new InventoryError("INSUFFICIENT_STOCK", message);
  }
  if (message.includes("COMPANY_MISMATCH")) {
    return new InventoryError("COMPANY_MISMATCH", message);
  }
  return new InventoryError("DB_ERROR", message);
}

// ---------------------------------------------------------------------------
// stock_in  — receive goods into a location
// ---------------------------------------------------------------------------

export async function stockIn(
  client: TypedClient,
  input: StockInInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);

  const { data, error } = await client.rpc("process_stock_in", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_reference_number: input.referenceNumber ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

// ---------------------------------------------------------------------------
// stock_out — issue goods from a location
// ---------------------------------------------------------------------------

export async function stockOut(
  client: TypedClient,
  input: StockOutInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);

  const { data, error } = await client.rpc("process_stock_out", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_reference_number: input.referenceNumber ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

// ---------------------------------------------------------------------------
// transfer — move goods between two locations in the same company
// ---------------------------------------------------------------------------

export async function transfer(
  client: TypedClient,
  input: TransferInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);
  validateDifferentLocations(input.fromLocationId, input.toLocationId);

  const { data, error } = await client.rpc("process_transfer", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

// ---------------------------------------------------------------------------
// returnStock — return goods from a field location back to a stock location
// ---------------------------------------------------------------------------

export async function returnStock(
  client: TypedClient,
  input: ReturnInput,
): Promise<OperationResult> {
  validateQuantity(input.quantity);
  validateDifferentLocations(input.fromLocationId, input.toLocationId);

  const { data, error } = await client.rpc("process_return", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_from_location_id: input.fromLocationId,
    p_to_location_id: input.toLocationId,
    p_quantity: input.quantity,
    p_batch_id: input.batchId ?? null,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

// ---------------------------------------------------------------------------
// adjustment — correct the balance to an absolute quantity (e.g. after count)
// ---------------------------------------------------------------------------

export async function adjustment(
  client: TypedClient,
  input: AdjustmentInput,
): Promise<OperationResult> {
  validateNewQuantity(input.newQuantity);

  const { data, error } = await client.rpc("process_adjustment", {
    p_company_id: input.companyId,
    p_item_id: input.itemId,
    p_location_id: input.locationId,
    p_new_quantity: input.newQuantity,
    p_reason: input.reason,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}

// ---------------------------------------------------------------------------
// moveAsset — relocate a tracked asset and record the movement
// ---------------------------------------------------------------------------

export async function moveAsset(
  client: TypedClient,
  input: AssetMoveInput,
): Promise<OperationResult> {
  const { data, error } = await client.rpc("process_asset_move", {
    p_company_id: input.companyId,
    p_asset_id: input.assetId,
    p_to_location_id: input.toLocationId,
    p_type: input.type,
    p_note: input.note ?? null,
    p_performed_by: input.performedBy,
  });

  if (error) throw parsePostgresError(error.message);
  return { success: true, transactionId: data as string };
}
