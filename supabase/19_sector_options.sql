-- ============================================================
-- 19_sector_options.sql
-- Requires: 00_enums.sql
-- Paste into: Supabase -> SQL Editor -> Run
--
-- Read-only RPC for exposing enum-backed sector options to the app.
-- ============================================================

create or replace function public.get_available_sectors()
returns table (
  value public.sector,
  label text,
  sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sector_value,
    case sector_value
      when 'construction'::public.sector then 'Construction'
      when 'agriculture'::public.sector then 'Agriculture'
      when 'sales'::public.sector then 'Sales / Retail'
      when 'other'::public.sector then 'General / Other'
    end as label,
    sector_index::integer as sort_order
  from unnest(enum_range(null::public.sector)) with ordinality as sectors(sector_value, sector_index)
  order by sector_index;
$$;

grant execute on function public.get_available_sectors() to anon, authenticated;