-- ============================================================
-- 18_rpc_transaction_engine.sql
-- Requires: 09_stock_transactions.sql, 08_inventory_balances.sql,
--           07_assets.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
--
-- Five atomic RPC functions called by packages/services engine.ts.
-- All run as SECURITY DEFINER so the service role grant is not needed.
-- Each function is a single Postgres transaction — either everything
-- succeeds or nothing is written.
-- ============================================================


-- ============================================================
-- process_stock_in
-- Receives goods into a location. Upserts inventory_balances.
-- ============================================================
create or replace function public.process_stock_in(
  p_company_id       uuid,
  p_item_id          uuid,
  p_to_location_id   uuid,
  p_quantity         numeric,
  p_batch_id         uuid    default null,
  p_reference_number text    default null,
  p_note             text    default null,
  p_performed_by     uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    to_location_id, quantity, reference_number, notes, performed_by
  )
  values (
    p_company_id, 'stock_in', p_item_id, p_batch_id,
    p_to_location_id, p_quantity, p_reference_number, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_stock_out
-- Issues goods from a location. Guards against negative balance.
-- ============================================================
create or replace function public.process_stock_out(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_quantity           numeric,
  p_batch_id           uuid    default null,
  p_reference_number   text    default null,
  p_note               text    default null,
  p_performed_by       uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  -- Pessimistic lock on the balance row to prevent concurrent over-issue
  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, quantity, reference_number, notes, performed_by
  )
  values (
    p_company_id, 'stock_out', p_item_id, p_batch_id,
    p_from_location_id, p_quantity, p_reference_number, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_transfer
-- Moves goods between two locations in the same company.
-- ============================================================
create or replace function public.process_transfer(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_batch_id           uuid    default null,
  p_note               text    default null,
  p_performed_by       uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'SAME_LOCATION: source and destination must differ';
  end if;

  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'transfer', p_item_id, p_batch_id,
    p_from_location_id, p_to_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Deduct from source
  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  -- Add to destination (upsert)
  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_return
-- Returns goods from a field location back to a stock location.
-- Semantically identical to transfer but recorded as 'return'.
-- ============================================================
create or replace function public.process_return(
  p_company_id         uuid,
  p_item_id            uuid,
  p_from_location_id   uuid,
  p_to_location_id     uuid,
  p_quantity           numeric,
  p_batch_id           uuid    default null,
  p_note               text    default null,
  p_performed_by       uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_qty    numeric;
  v_transaction_id uuid;
begin
  if p_quantity <= 0 then
    raise exception 'INVALID_QUANTITY: quantity must be positive';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception 'SAME_LOCATION: source and destination must differ';
  end if;

  select quantity into v_current_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id
  for update;

  if v_current_qty is null or v_current_qty < p_quantity then
    raise exception 'INSUFFICIENT_STOCK: available=%, requested=%',
      coalesce(v_current_qty, 0), p_quantity;
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, batch_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'return', p_item_id, p_batch_id,
    p_from_location_id, p_to_location_id, p_quantity, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  update inventory_balances
  set quantity   = quantity - p_quantity,
      updated_at = now()
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_from_location_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_to_location_id, p_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = inventory_balances.quantity + excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_adjustment
-- Sets the balance to an absolute quantity (e.g. after a stock count).
-- Records the delta as an adjustment transaction.
-- ============================================================
create or replace function public.process_adjustment(
  p_company_id     uuid,
  p_item_id        uuid,
  p_location_id    uuid,
  p_new_quantity   numeric,
  p_reason         text,
  p_performed_by   uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_qty        numeric;
  v_delta          numeric;
  v_transaction_id uuid;
begin
  if p_new_quantity < 0 then
    raise exception 'ADJUSTMENT_NEGATIVE: new quantity cannot be negative';
  end if;

  select quantity into v_old_qty
  from inventory_balances
  where company_id  = p_company_id
    and item_id     = p_item_id
    and location_id = p_location_id
  for update;

  v_old_qty := coalesce(v_old_qty, 0);
  v_delta   := p_new_quantity - v_old_qty;

  -- Still record a transaction even when delta is 0 (confirms the count)
  insert into stock_transactions (
    company_id, transaction_type, item_id,
    from_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, 'adjustment', p_item_id,
    p_location_id,
    -- store absolute delta; 0 if no change
    abs(v_delta),
    format('Adjustment: %s → %s. Reason: %s', v_old_qty, p_new_quantity, p_reason),
    p_performed_by
  )
  returning id into v_transaction_id;

  insert into inventory_balances (company_id, item_id, location_id, quantity)
  values (p_company_id, p_item_id, p_location_id, p_new_quantity)
  on conflict (company_id, item_id, location_id)
  do update set
    quantity   = excluded.quantity,
    updated_at = now();

  return v_transaction_id;
end;
$$;


-- ============================================================
-- process_asset_move
-- Relocates a tracked asset (is_tracked_asset = true item).
-- Updates assets.location_id + assets.status and inserts a
-- stock_transactions row for traceability.
-- ============================================================
create or replace function public.process_asset_move(
  p_company_id       uuid,
  p_asset_id         uuid,
  p_to_location_id   uuid,
  p_type             public.transaction_type,  -- 'stock_out' | 'transfer' | 'return'
  p_note             text    default null,
  p_performed_by     uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset          record;
  v_transaction_id uuid;
begin
  -- Load asset and validate ownership + availability
  select id, company_id, item_id, location_id, status
  into v_asset
  from assets
  where id = p_asset_id
  for update;

  if not found then
    raise exception 'ASSET_NOT_FOUND: asset % does not exist', p_asset_id;
  end if;

  if v_asset.company_id <> p_company_id then
    raise exception 'COMPANY_MISMATCH: asset does not belong to this company';
  end if;

  if v_asset.status = 'retired' then
    raise exception 'ASSET_UNAVAILABLE: asset is retired';
  end if;

  insert into stock_transactions (
    company_id, transaction_type, item_id, asset_id,
    from_location_id, to_location_id, quantity, notes, performed_by
  )
  values (
    p_company_id, p_type, v_asset.item_id, p_asset_id,
    v_asset.location_id, p_to_location_id, 1, p_note, p_performed_by
  )
  returning id into v_transaction_id;

  -- Update asset position and status
  update assets
  set location_id = p_to_location_id,
      status      = case
                      when p_type = 'stock_out' then 'in_use'
                      when p_type in ('transfer', 'return') then 'available'
                      else status
                    end,
      updated_at  = now()
  where id = p_asset_id;

  return v_transaction_id;
end;
$$;
