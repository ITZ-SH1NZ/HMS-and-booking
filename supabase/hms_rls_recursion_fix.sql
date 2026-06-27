-- =============================================================================
-- BookNest — FIX for RLS infinite recursion (error 42P17) between
-- hotels <-> hotel_staff introduced by hms_management_migration.sql.
--
-- Run this in the Supabase SQL editor if you already applied the management
-- migration and hotels stopped loading. Safe to re-run. (Already folded into
-- hms_management_migration.sql for fresh installs.)
-- =============================================================================

-- Single-table SECURITY DEFINER helpers bypass RLS internally, so a policy on
-- one table can check the other without re-triggering its RLS (which caused the
-- mutual recursion).
create or replace function public.owns_hotel(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.hotels h
                 where h.id = p_hotel_id and h.manager_id = auth.uid());
$$;

create or replace function public.is_hotel_staff(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.hotel_staff s
                 where s.hotel_id = p_hotel_id and s.staff_id = auth.uid());
$$;

grant execute on function public.owns_hotel(uuid)     to authenticated;
grant execute on function public.is_hotel_staff(uuid) to authenticated;

-- Recreate the three policies that referenced the other table directly.
drop policy if exists "hotel_staff: manager all" on public.hotel_staff;
create policy "hotel_staff: manager all"
  on public.hotel_staff for all
  using (public.owns_hotel(hotel_id))
  with check (public.owns_hotel(hotel_id));

drop policy if exists "staff_invites: manager all" on public.staff_invites;
create policy "staff_invites: manager all"
  on public.staff_invites for all
  using (public.owns_hotel(hotel_id))
  with check (public.owns_hotel(hotel_id));

drop policy if exists "hotels: read staff" on public.hotels;
create policy "hotels: read staff"
  on public.hotels for select
  using (public.is_hotel_staff(id));
