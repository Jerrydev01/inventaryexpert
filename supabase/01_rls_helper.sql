-- ============================================================
-- 01_rls_helper.sql
-- Run AFTER 00_enums.sql and BEFORE any table files.
-- This function is required by all RLS policies.
-- Paste into: Supabase → SQL Editor → Run
-- ============================================================

create or replace function public.get_my_company_id()
returns uuid
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  begin
    execute 'select company_id from public.profiles where id = auth.uid()'
      into v_company_id;
  exception
    when undefined_table then
      return null;
  end;

  return v_company_id;
end;
$$;
