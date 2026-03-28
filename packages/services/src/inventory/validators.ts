import { InventoryError } from "./errors";

/**
 * Validators run before the RPC call.
 * Each throws a typed InventoryError on failure so the server action can
 * return a structured error without touching the database.
 */

export function validateQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new InventoryError(
      "INVALID_QUANTITY",
      "Quantity must be a finite positive number.",
    );
  }
}

export function validateDifferentLocations(
  fromLocationId: string,
  toLocationId: string,
): void {
  if (fromLocationId === toLocationId) {
    throw new InventoryError(
      "SAME_LOCATION",
      "Source and destination locations must be different.",
    );
  }
}

export function validateNewQuantity(newQuantity: number): void {
  if (!Number.isFinite(newQuantity) || newQuantity < 0) {
    throw new InventoryError(
      "ADJUSTMENT_NEGATIVE",
      "Adjusted quantity cannot be negative.",
    );
  }
}
