/**
 * Auto-generated Supabase Database type.
 * Source of truth: /supabase/00_enums.sql – 16_invoice_line_items.sql
 * Regenerate with: supabase gen types typescript --local > packages/types/src/database.ts
 *
 * Hand-maintained until a live Supabase project is linked.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      // ----------------------------------------------------------------
      // companies
      // ----------------------------------------------------------------
      companies: {
        Row: {
          id: string;
          name: string;
          sector: Database["public"]["Enums"]["sector"];
          logo_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sector: Database["public"]["Enums"]["sector"];
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sector?: Database["public"]["Enums"]["sector"];
          logo_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ----------------------------------------------------------------
      // profiles
      // ----------------------------------------------------------------
      profiles: {
        Row: {
          id: string;
          company_id: string;
          role: Database["public"]["Enums"]["user_role"];
          full_name: string | null;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
          full_name?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // locations
      // ----------------------------------------------------------------
      locations: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          type: Database["public"]["Enums"]["location_type"];
          parent_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          type?: Database["public"]["Enums"]["location_type"];
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          type?: Database["public"]["Enums"]["location_type"];
          parent_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_parent_id_fkey";
            columns: ["parent_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // items
      // ----------------------------------------------------------------
      items: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          sku: string | null;
          unit: string;
          category: string | null;
          description: string | null;
          image_path: string | null;
          is_tracked_asset: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          sku?: string | null;
          unit?: string;
          category?: string | null;
          description?: string | null;
          image_path?: string | null;
          is_tracked_asset?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          sku?: string | null;
          unit?: string;
          category?: string | null;
          description?: string | null;
          image_path?: string | null;
          is_tracked_asset?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // batches
      // ----------------------------------------------------------------
      batches: {
        Row: {
          id: string;
          company_id: string;
          item_id: string;
          reference: string | null;
          notes: string | null;
          received_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_id: string;
          reference?: string | null;
          notes?: string | null;
          received_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          item_id?: string;
          reference?: string | null;
          notes?: string | null;
          received_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "batches_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "batches_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // assets
      // ----------------------------------------------------------------
      assets: {
        Row: {
          id: string;
          company_id: string;
          item_id: string;
          serial_number: string | null;
          status: Database["public"]["Enums"]["asset_status"];
          location_id: string | null;
          image_path: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_id: string;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          location_id?: string | null;
          image_path?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          item_id?: string;
          serial_number?: string | null;
          status?: Database["public"]["Enums"]["asset_status"];
          location_id?: string | null;
          image_path?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assets_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // inventory_balances
      // ----------------------------------------------------------------
      inventory_balances: {
        Row: {
          id: string;
          company_id: string;
          item_id: string;
          location_id: string;
          quantity: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          item_id: string;
          location_id: string;
          quantity?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          item_id?: string;
          location_id?: string;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_balances_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_balances_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_balances_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // stock_transactions
      // ----------------------------------------------------------------
      stock_transactions: {
        Row: {
          id: string;
          company_id: string;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          item_id: string;
          batch_id: string | null;
          asset_id: string | null;
          from_location_id: string | null;
          to_location_id: string | null;
          quantity: number;
          unit_cost: number | null;
          notes: string | null;
          reference_number: string | null;
          performed_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          item_id: string;
          batch_id?: string | null;
          asset_id?: string | null;
          from_location_id?: string | null;
          to_location_id?: string | null;
          quantity: number;
          unit_cost?: number | null;
          notes?: string | null;
          reference_number?: string | null;
          performed_by: string;
          created_at?: string;
        };
        Update: never; // append-only — no updates allowed
        Relationships: [
          {
            foreignKeyName: "stock_transactions_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_batch_id_fkey";
            columns: ["batch_id"];
            referencedRelation: "batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_asset_id_fkey";
            columns: ["asset_id"];
            referencedRelation: "assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_from_location_id_fkey";
            columns: ["from_location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_to_location_id_fkey";
            columns: ["to_location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stock_transactions_performed_by_fkey";
            columns: ["performed_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // audit_logs
      // ----------------------------------------------------------------
      audit_logs: {
        Row: {
          id: string;
          company_id: string;
          actor_id: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          payload: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          actor_id?: string | null;
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          payload?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: never; // immutable
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // qr_codes
      // ----------------------------------------------------------------
      qr_codes: {
        Row: {
          id: string;
          company_id: string;
          record_type: Database["public"]["Enums"]["qr_record_type"];
          record_id: string;
          payload: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          record_type: Database["public"]["Enums"]["qr_record_type"];
          record_id: string;
          payload: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          record_type?: Database["public"]["Enums"]["qr_record_type"];
          record_id?: string;
          payload?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_codes_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // subscriptions
      // ----------------------------------------------------------------
      subscriptions: {
        Row: {
          id: string;
          company_id: string;
          plan_type: Database["public"]["Enums"]["plan_type"];
          payment_provider: string | null;
          provider_plan_code: string | null;
          provider_sub_id: string | null;
          status: string;
          current_period_end: string | null;
          seats: number;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          plan_type?: Database["public"]["Enums"]["plan_type"];
          payment_provider?: string | null;
          provider_plan_code?: string | null;
          provider_sub_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          seats?: number;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          plan_type?: Database["public"]["Enums"]["plan_type"];
          payment_provider?: string | null;
          provider_plan_code?: string | null;
          provider_sub_id?: string | null;
          status?: string;
          current_period_end?: string | null;
          seats?: number;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // payments
      // ----------------------------------------------------------------
      payments: {
        Row: {
          id: string;
          company_id: string;
          subscription_id: string | null;
          payment_provider: string;
          provider_ref: string;
          amount_kobo: number;
          currency: string;
          status: string;
          paid_at: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          subscription_id?: string | null;
          payment_provider: string;
          provider_ref: string;
          amount_kobo: number;
          currency?: string;
          status: string;
          paid_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: never; // immutable payment records
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_subscription_id_fkey";
            columns: ["subscription_id"];
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // clients
      // ----------------------------------------------------------------
      clients: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // invoices
      // ----------------------------------------------------------------
      invoices: {
        Row: {
          id: string;
          company_id: string;
          client_id: string | null;
          invoice_number: string;
          status: Database["public"]["Enums"]["invoice_status"];
          issue_date: string;
          due_date: string | null;
          notes: string | null;
          currency: string;
          subtotal: number;
          tax_amount: number;
          total: number;
          paid_at: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          client_id?: string | null;
          invoice_number: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          issue_date?: string;
          due_date?: string | null;
          notes?: string | null;
          currency?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          paid_at?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          client_id?: string | null;
          invoice_number?: string;
          status?: Database["public"]["Enums"]["invoice_status"];
          issue_date?: string;
          due_date?: string | null;
          notes?: string | null;
          currency?: string;
          subtotal?: number;
          tax_amount?: number;
          total?: number;
          paid_at?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      // ----------------------------------------------------------------
      // invoice_line_items
      // ----------------------------------------------------------------
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          company_id: string;
          item_id: string | null;
          stock_transaction_id: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          company_id: string;
          item_id?: string | null;
          stock_transaction_id?: string | null;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          company_id?: string;
          item_id?: string | null;
          stock_transaction_id?: string | null;
          description?: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey";
            columns: ["invoice_id"];
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_company_id_fkey";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_item_id_fkey";
            columns: ["item_id"];
            referencedRelation: "items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_line_items_stock_transaction_id_fkey";
            columns: ["stock_transaction_id"];
            referencedRelation: "stock_transactions";
            referencedColumns: ["id"];
          },
        ];
      };
    };

    // ------------------------------------------------------------------
    // Views (none yet)
    // ------------------------------------------------------------------
    Views: Record<string, never>;

    // ------------------------------------------------------------------
    // Functions
    // ------------------------------------------------------------------
    Functions: {
      get_my_company_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      process_stock_in: {
        Args: {
          p_company_id: string;
          p_item_id: string;
          p_to_location_id: string;
          p_quantity: number;
          p_batch_id?: string | null;
          p_reference_number?: string | null;
          p_note?: string | null;
          p_performed_by: string;
        };
        Returns: string; // transaction uuid
      };
      process_stock_out: {
        Args: {
          p_company_id: string;
          p_item_id: string;
          p_from_location_id: string;
          p_quantity: number;
          p_batch_id?: string | null;
          p_reference_number?: string | null;
          p_note?: string | null;
          p_performed_by: string;
        };
        Returns: string;
      };
      process_transfer: {
        Args: {
          p_company_id: string;
          p_item_id: string;
          p_from_location_id: string;
          p_to_location_id: string;
          p_quantity: number;
          p_batch_id?: string | null;
          p_note?: string | null;
          p_performed_by: string;
        };
        Returns: string;
      };
      process_return: {
        Args: {
          p_company_id: string;
          p_item_id: string;
          p_from_location_id: string;
          p_to_location_id: string;
          p_quantity: number;
          p_batch_id?: string | null;
          p_note?: string | null;
          p_performed_by: string;
        };
        Returns: string;
      };
      process_adjustment: {
        Args: {
          p_company_id: string;
          p_item_id: string;
          p_location_id: string;
          p_new_quantity: number;
          p_reason: string;
          p_performed_by: string;
        };
        Returns: string;
      };
      process_asset_move: {
        Args: {
          p_company_id: string;
          p_asset_id: string;
          p_to_location_id: string;
          p_type: Database["public"]["Enums"]["transaction_type"];
          p_note?: string | null;
          p_performed_by: string;
        };
        Returns: string;
      };
    };

    // ------------------------------------------------------------------
    // Enums
    // ------------------------------------------------------------------
    Enums: {
      sector: "construction" | "agriculture" | "sales" | "other";
      user_role: "admin" | "manager" | "storekeeper" | "worker";
      location_type: "warehouse" | "store" | "site" | "vehicle" | "other";
      transaction_type:
        | "stock_in"
        | "stock_out"
        | "transfer"
        | "return"
        | "adjustment";
      qr_record_type: "item" | "batch" | "asset" | "location";
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "paused";
      payment_provider: "paystack" | "stripe";
      payment_status: "pending" | "successful" | "failed" | "refunded";
      asset_status: "available" | "in_use" | "under_maintenance" | "retired";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "void";
      plan_type: "free" | "starter" | "pro" | "enterprise";
    };

    // ------------------------------------------------------------------
    // CompositeTypes (none yet)
    // ------------------------------------------------------------------
    CompositeTypes: Record<string, never>;
  };
};

// ------------------------------------------------------------------
// Convenience row types
// ------------------------------------------------------------------
type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type { Enums, Tables, TablesInsert, TablesUpdate };

// ------------------------------------------------------------------
// Named row types (import these in app code)
// ------------------------------------------------------------------
export type CompanyRow = Tables<"companies">;
export type ProfileRow = Tables<"profiles">;
export type LocationRow = Tables<"locations">;
export type ItemRow = Tables<"items">;
export type BatchRow = Tables<"batches">;
export type AssetRow = Tables<"assets">;
export type InventoryBalanceRow = Tables<"inventory_balances">;
export type StockTransactionRow = Tables<"stock_transactions">;
export type AuditLogRow = Tables<"audit_logs">;
export type QrCodeRow = Tables<"qr_codes">;
export type SubscriptionRow = Tables<"subscriptions">;
export type PaymentRow = Tables<"payments">;
export type ClientRow = Tables<"clients">;
export type InvoiceRow = Tables<"invoices">;
export type InvoiceLineItemRow = Tables<"invoice_line_items">;

// ------------------------------------------------------------------
// Named insert types
// ------------------------------------------------------------------
export type CompanyInsert = TablesInsert<"companies">;
export type ProfileInsert = TablesInsert<"profiles">;
export type LocationInsert = TablesInsert<"locations">;
export type ItemInsert = TablesInsert<"items">;
export type BatchInsert = TablesInsert<"batches">;
export type AssetInsert = TablesInsert<"assets">;
export type QrCodeInsert = TablesInsert<"qr_codes">;
export type ClientInsert = TablesInsert<"clients">;
export type InvoiceInsert = TablesInsert<"invoices">;
export type InvoiceLineItemInsert = TablesInsert<"invoice_line_items">;

// ------------------------------------------------------------------
// Named enum types (re-export from Enums helper)
// ------------------------------------------------------------------
export type SectorEnum = Enums<"sector">;
export type UserRoleEnum = Enums<"user_role">;
export type LocationTypeEnum = Enums<"location_type">;
export type TransactionTypeEnum = Enums<"transaction_type">;
export type QrRecordTypeEnum = Enums<"qr_record_type">;
export type AssetStatusEnum = Enums<"asset_status">;
export type InvoiceStatusEnum = Enums<"invoice_status">;
export type PlanTypeEnum = Enums<"plan_type">;
