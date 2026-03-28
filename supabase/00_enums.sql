-- ============================================================
-- 00_enums.sql
-- Run this FIRST before any table files.
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

create type public.sector as enum (
  'construction',
  'agriculture',
  'sales',
  'other'
);

create type public.user_role as enum (
  'admin',
  'manager',
  'storekeeper',
  'worker'
);

create type public.location_type as enum (
  'warehouse',
  'store',
  'site',
  'vehicle',
  'other'
);

create type public.transaction_type as enum (
  'stock_in',
  'stock_out',
  'transfer',
  'return',
  'adjustment'
);

create type public.qr_record_type as enum (
  'item',
  'batch',
  'asset',
  'location'
);

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused'
);

create type public.payment_provider as enum (
  'paystack',
  'stripe'
);

create type public.payment_status as enum (
  'pending',
  'successful',
  'failed',
  'refunded'
);

create type public.asset_status as enum (
  'available',
  'in_use',
  'under_maintenance',
  'retired'
);

create type public.invoice_status as enum (
  'draft',
  'sent',
  'paid',
  'overdue',
  'void'
);

create type public.plan_type as enum (
  'free',
  'starter',
  'pro',
  'enterprise'
);
