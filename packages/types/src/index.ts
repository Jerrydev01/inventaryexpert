// Re-export everything from the database type file.
// App code imports from "@inventaryexpert/types" — never from the sub-file directly.
export type {
  AssetInsert,
  AssetRow,
  AssetStatusEnum,
  AuditLogRow,
  BatchInsert,
  BatchRow,
  ClientInsert,
  ClientRow,
  // Insert types
  CompanyInsert,
  // Row types
  CompanyRow,
  Database,
  Enums,
  InventoryBalanceRow,
  InvoiceInsert,
  InvoiceLineItemInsert,
  InvoiceLineItemRow,
  InvoiceRow,
  InvoiceStatusEnum,
  ItemInsert,
  ItemRow,
  Json,
  LocationInsert,
  LocationRow,
  LocationTypeEnum,
  PaymentRow,
  PlanTypeEnum,
  ProfileInsert,
  ProfileRow,
  QrCodeInsert,
  QrCodeRow,
  QrRecordTypeEnum,
  // Enum types
  SectorEnum,
  StockTransactionRow,
  SubscriptionRow,
  Tables,
  TablesInsert,
  TablesUpdate,
  TransactionTypeEnum,
  UserRoleEnum,
} from "./database";

// Legacy aliases — kept so existing imports of `Sector` and `UserRole` don't break.
export type Sector = import("./database").SectorEnum;
export type UserRole = import("./database").UserRoleEnum;

// Inventory operation types
export type {
  AdjustmentInput,
  AssetMoveInput,
  OperationResult,
  ReturnInput,
  StockInInput,
  StockOutInput,
  TransactionType,
  TransferInput,
} from "./inventory";
