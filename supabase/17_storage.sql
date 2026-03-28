-- ============================================================
-- 17_storage.sql
-- Requires: 02_companies.sql, 03_profiles.sql
-- Paste into: Supabase → SQL Editor → Run
--
-- Creates the four Storage buckets and their RLS policies.
-- Bucket naming  : kebab-case, singular noun
-- Path convention: {bucket}/{company_id_or_user_id}/{record_id}/{filename}.webp
-- ============================================================

-- ============================================================
-- Buckets
-- ============================================================

-- Company logos  (public read — shown on login page, receipts, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'logos',
  'logos',
  true,
  512000,   -- 500 KB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- User avatars  (public read — shown in UI across the company)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  256000,   -- 250 KB max
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Item cover photos  (private — readable only by company members)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'items',
  'items',
  false,
  1048576,  -- 1 MB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- Asset photos  (private — readable only by company members)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'assets',
  'assets',
  false,
  1048576,  -- 1 MB max after frontend compression
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;


-- ============================================================
-- Storage RLS policies
-- Path guards ensure users can only read/write their own company's files.
-- Path format for private buckets: {company_id}/{record_id}/filename.webp
-- Path format for public buckets:  {company_id}/filename.webp
--   or for avatars:                {user_id}/filename.webp
-- ============================================================

-- ------------------------------------------------------------
-- logos bucket (public read, admin/manager write)
-- ------------------------------------------------------------
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: upload if admin or manager"
  on storage.objects for insert
  with check (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        -- first path segment must be the caller's company_id
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );

create policy "logos: update if admin or manager"
  on storage.objects for update
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );

create policy "logos: delete if admin"
  on storage.objects for delete
  using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and (storage.foldername(name))[1] = p.company_id::text
    )
  );


-- ------------------------------------------------------------
-- avatars bucket (public read, owner write)
-- ------------------------------------------------------------
create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    -- first path segment must be the caller's own user_id
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: update own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ------------------------------------------------------------
-- items bucket (private: company-scoped read, manager+ write)
-- ------------------------------------------------------------
create policy "items: read own company"
  on storage.objects for select
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy "items: upload if manager or above"
  on storage.objects for insert
  with check (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

create policy "items: update if manager or above"
  on storage.objects for update
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );

create policy "items: delete if manager or above"
  on storage.objects for delete
  using (
    bucket_id = 'items'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );


-- ------------------------------------------------------------
-- assets bucket (private: company-scoped read, storekeeper+ write)
-- ------------------------------------------------------------
create policy "assets bucket: read own company"
  on storage.objects for select
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
  );

create policy "assets bucket: upload if storekeeper or above"
  on storage.objects for insert
  with check (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager', 'storekeeper')
    )
  );

create policy "assets bucket: update if storekeeper or above"
  on storage.objects for update
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager', 'storekeeper')
    )
  );

create policy "assets bucket: delete if manager or above"
  on storage.objects for delete
  using (
    bucket_id = 'assets'
    and (storage.foldername(name))[1] = public.get_my_company_id()::text
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'manager')
    )
  );
