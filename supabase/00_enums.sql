-- ============================================================
-- 00_enums.sql
-- Run this FIRST before any table files.
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

do $$ begin
  create type public.sector as enum ('construction', 'agriculture', 'sales', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('admin', 'manager', 'storekeeper', 'worker');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.location_type as enum ('warehouse', 'store', 'site', 'vehicle', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transaction_type as enum ('stock_in', 'stock_out', 'transfer', 'return', 'adjustment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.qr_record_type as enum ('item', 'batch', 'asset', 'location');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('paystack', 'stripe');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.asset_status as enum ('available', 'in_use', 'under_maintenance', 'retired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_type as enum ('free', 'starter', 'pro', 'enterprise');
exception when duplicate_object then null; end $$;
