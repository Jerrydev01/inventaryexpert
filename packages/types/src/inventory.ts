/**
 * Engine-facing input/output types for inventory operations.
 * Defined here (packages/types) so apps/web, apps/mobile, and packages/services
 * can all import them without circular dependencies.
 */

export type TransactionType =
  | "stock_in"
  | "stock_out"
  | "transfer"
  | "return"
  | "adjustment";

export interface StockInInput {
  companyId: string;
  itemId: string;
  toLocationId: string;
  quantity: number;
  batchId?: string;
  referenceNumber?: string;
  note?: string;
  performedBy: string; // profiles.id
}

export interface StockOutInput {
  companyId: string;
  itemId: string;
  fromLocationId: string;
  quantity: number;
  batchId?: string;
  referenceNumber?: string;
  note?: string;
  performedBy: string;
}

export interface TransferInput {
  companyId: string;
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  batchId?: string;
  note?: string;
  performedBy: string;
}

export interface ReturnInput {
  companyId: string;
  itemId: string;
  fromLocationId: string; // location item is being returned FROM (e.g. a site)
  toLocationId: string; // location it returns TO (e.g. main warehouse)
  quantity: number;
  batchId?: string;
  note?: string;
  performedBy: string;
}

export interface AdjustmentInput {
  companyId: string;
  itemId: string;
  locationId: string;
  newQuantity: number; // absolute correct quantity after adjustment
  reason: string; // required — recorded in the transaction note
  performedBy: string;
}

export interface AssetMoveInput {
  companyId: string;
  assetId: string;
  toLocationId: string;
  type: Extract<TransactionType, "stock_out" | "transfer" | "return">;
  note?: string;
  performedBy: string;
}

export interface OperationResult {
  success: true;
  transactionId: string;
}
