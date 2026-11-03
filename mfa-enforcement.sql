-- Apply after enabling TOTP and verifying that the admin account has enrolled
-- and successfully used an authenticator factor.
--
-- Restrictive policies preserve the existing permissive policies while
-- requiring AAL2 for authenticated access. Anonymous storefront access is
-- unaffected. Run this in the Supabase SQL Editor.

drop policy if exists "Require AAL2 for authenticated vehicle access"
  on public.vehicles;
create policy "Require AAL2 for authenticated vehicle access"
  on public.vehicles
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "Require AAL2 for authenticated preview session access"
  on public.preview_sessions;
create policy "Require AAL2 for authenticated preview session access"
  on public.preview_sessions
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "Require AAL2 for authenticated audit log access"
  on public.admin_audit_log;
create policy "Require AAL2 for authenticated audit log access"
  on public.admin_audit_log
  as restrictive
  for all
  to authenticated
  using ((select auth.jwt() ->> 'aal') = 'aal2')
  with check ((select auth.jwt() ->> 'aal') = 'aal2');

drop policy if exists "Require AAL2 for authenticated vehicle image access"
  on storage.objects;
create policy "Require AAL2 for authenticated vehicle image access"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (
    bucket_id <> 'luchetti-image'
    or (select auth.jwt() ->> 'aal') = 'aal2'
  )
  with check (
    bucket_id <> 'luchetti-image'
    or (select auth.jwt() ->> 'aal') = 'aal2'
  );
