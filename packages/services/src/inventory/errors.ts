export type InventoryErrorCode =
  | "INSUFFICIENT_STOCK" // balance < requested quantity
  | "ITEM_NOT_FOUND"
  | "LOCATION_NOT_FOUND"
  | "BATCH_NOT_FOUND"
  | "ASSET_NOT_FOUND"
  | "ASSET_UNAVAILABLE" // asset.status !== 'available'
  | "INVALID_QUANTITY" // quantity <= 0 or non-finite
  | "SAME_LOCATION" // transfer/return: from === to
  | "COMPANY_MISMATCH" // referenced record belongs to a different company
  | "ADJUSTMENT_NEGATIVE" // newQuantity < 0
  | "DB_ERROR"; // unexpected Postgres failure

export class InventoryError extends Error {
  readonly code: InventoryErrorCode;

  constructor(code: InventoryErrorCode, message: string) {
    super(message);
    this.name = "InventoryError";
    this.code = code;
    // Restore prototype chain (required when extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
