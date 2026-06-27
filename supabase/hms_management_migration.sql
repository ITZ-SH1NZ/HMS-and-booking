-- =============================================================================
-- BookNest — Hotel Management (front desk + staff) migration
-- Run AFTER schema.sql, booking_schema.sql and hotel_wizard_migration.sql.
-- Safe to re-run (idempotent where practical).
--
-- Adds: staff role + per-hotel assignments, email invites, offline (walk-in)
-- bookings, soft-delete for hotels, RLS helpers, and front-desk RPCs.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. STAFF ROLE
-- ----------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('guest', 'manager', 'admin', 'staff'));

-- ----------------------------------------------------------------------------
-- 2. HOTEL ↔ STAFF ASSIGNMENTS
--    permissions is a subset of: offline_booking, view_occupancy, manage_rooms
-- ----------------------------------------------------------------------------
create table if not exists public.hotel_staff (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id)   on delete cascade,
  staff_id    uuid not null references public.profiles (id) on delete cascade,
  email       text,
  permissions text[] not null default '{}',
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (hotel_id, staff_id)
);
alter table public.hotel_staff add column if not exists email text;
create index if not exists hotel_staff_hotel_idx on public.hotel_staff (hotel_id);
create index if not exists hotel_staff_staff_idx on public.hotel_staff (staff_id);

-- ----------------------------------------------------------------------------
-- 3. STAFF INVITES (pending email invitations, accepted via token)
-- ----------------------------------------------------------------------------
create table if not exists public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  permissions text[] not null default '{}',
  token       uuid not null default gen_random_uuid(),
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz
);
create index if not exists staff_invites_hotel_idx on public.staff_invites (hotel_id);
create index if not exists staff_invites_email_idx on public.staff_invites (lower(email));
create unique index if not exists staff_invites_token_idx on public.staff_invites (token);

-- ----------------------------------------------------------------------------
-- 4. OFFLINE (WALK-IN) BOOKINGS
--    A walk-in has no account, so guest_id becomes nullable and we snapshot
--    the guest's contact details. created_by records the staff/manager.
-- ----------------------------------------------------------------------------
alter table public.bookings alter column guest_id drop not null;
alter table public.bookings add column if not exists source text not null default 'online'
  check (source in ('online', 'offline'));
alter table public.bookings add column if not exists guest_name  text;
alter table public.bookings add column if not exists guest_phone text;
alter table public.bookings add column if not exists guest_email text;
alter table public.bookings add column if not exists created_by  uuid references public.profiles (id) on delete set null;

-- Allow cash as an offline payment method.
alter table public.payments drop constraint if exists payments_payment_method_check;
alter table public.payments add constraint payments_payment_method_check
  check (payment_method in ('upi', 'card', 'wallet', 'cash'));

-- ----------------------------------------------------------------------------
-- 5. SOFT-DELETE FOR HOTELS
-- ----------------------------------------------------------------------------
alter table public.hotels add column if not exists deleted_at timestamptz;
create index if not exists hotels_deleted_at_idx on public.hotels (deleted_at);

-- =============================================================================
-- RLS HELPERS  (security definer → bypass RLS internally, no recursion)
-- =============================================================================

-- True if the caller is the hotel's manager OR any assigned staff (any perm).
create or replace function public.can_operate_hotel(p_hotel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.hotels h
            where h.id = p_hotel_id and h.manager_id = auth.uid())
    or exists (select 1 from public.hotel_staff s
               where s.hotel_id = p_hotel_id and s.staff_id = auth.uid());
$$;

-- True if the caller is the hotel's manager OR staff holding `p_perm`.
create or replace function public.can_manage_hotel(p_hotel_id uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.hotels h
            where h.id = p_hotel_id and h.manager_id = auth.uid())
    or exists (select 1 from public.hotel_staff s
               where s.hotel_id = p_hotel_id and s.staff_id = auth.uid()
                 and p_perm = any (s.permissions));
$$;

-- Single-table definer helpers used inside RLS policies to AVOID the mutual
-- recursion hotels <-> hotel_staff (a policy on one table must not run an
-- RLS-checked subquery against the other). These bypass RLS internally.
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

grant execute on function public.can_operate_hotel(uuid)        to authenticated;
grant execute on function public.can_manage_hotel(uuid, text)   to authenticated;
grant execute on function public.owns_hotel(uuid)               to authenticated;
grant execute on function public.is_hotel_staff(uuid)           to authenticated;

-- =============================================================================
-- RPC: create an offline / walk-in booking (front desk).
-- Mirrors book_room but stamps source/created_by/guest snapshot and is gated
-- on the 'offline_booking' permission. Payment is recorded immediately.
-- =============================================================================
create or replace function public.book_offline(
  p_room_id     uuid,
  p_check_in    date,
  p_check_out   date,
  p_guests      int,
  p_num_rooms   int,
  p_guest_name  text,
  p_guest_phone text default null,
  p_guest_email text default null,
  p_method      text default 'cash',
  p_paid        boolean default true,
  p_special     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room   public.rooms;
  v_uid    uuid := auth.uid();
  v_nights int;
  v_base   numeric;
  v_gst    numeric;
  v_fee    numeric;
  v_total  numeric;
  v_id     uuid;
  v_avail  int;
  d        date;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_check_out <= p_check_in then raise exception 'Check-out must be after check-in'; end if;
  if p_num_rooms < 1 then raise exception 'At least one room is required'; end if;
  if coalesce(trim(p_guest_name), '') = '' then raise exception 'Guest name is required'; end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then raise exception 'Room not found'; end if;

  if not public.can_manage_hotel(v_room.hotel_id, 'offline_booking') then
    raise exception 'Not allowed to create bookings for this hotel';
  end if;

  v_nights := p_check_out - p_check_in;

  -- Reserve each night (lazily create inventory row, lock, then book).
  d := p_check_in;
  while d < p_check_out loop
    insert into public.room_inventory (room_id, date, total_count, booked_count)
      values (p_room_id, d, v_room.total_units, 0)
      on conflict (room_id, date) do nothing;

    select total_count - booked_count into v_avail
      from public.room_inventory
      where room_id = p_room_id and date = d
      for update;

    if v_avail < p_num_rooms then
      raise exception 'Only % room(s) left on %', v_avail, to_char(d, 'Mon DD');
    end if;

    update public.room_inventory
      set booked_count = booked_count + p_num_rooms
      where room_id = p_room_id and date = d;

    d := d + 1;
  end loop;

  v_base  := v_room.price * p_num_rooms * v_nights;
  v_gst   := round(v_base * 0.18, 2);
  v_fee   := 0;  -- no platform fee on offline bookings
  v_total := v_base + v_gst + v_fee;

  insert into public.bookings (
    guest_id, hotel_id, room_id, check_in, check_out, nights, guest_count,
    num_rooms, room_price, base_price, gst, platform_fee, total_price,
    status, special_requests, source, guest_name, guest_phone, guest_email, created_by
  ) values (
    null, v_room.hotel_id, p_room_id, p_check_in, p_check_out, v_nights, p_guests,
    p_num_rooms, v_room.price, v_base, v_gst, v_fee, v_total,
    case when p_paid then 'confirmed' else 'pending' end,
    p_special, 'offline', p_guest_name, p_guest_phone, p_guest_email, v_uid
  )
  returning id into v_id;

  insert into public.payments (booking_id, amount, payment_method, status, paid_at)
    values (
      v_id, v_total, p_method,
      case when p_paid then 'completed' else 'pending' end,
      case when p_paid then now() else null end
    );

  return v_id;
end;
$$;

-- =============================================================================
-- RPC: front-desk check-in / check-out. Any operator of the hotel may use it.
-- =============================================================================
create or replace function public.check_in_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if not public.can_operate_hotel(v_b.hotel_id) then raise exception 'Not allowed'; end if;
  if v_b.status <> 'confirmed' then raise exception 'Only confirmed bookings can be checked in'; end if;
  update public.bookings set status = 'checked_in' where id = p_booking_id;
end;
$$;

create or replace function public.check_out_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if not public.can_operate_hotel(v_b.hotel_id) then raise exception 'Not allowed'; end if;
  if v_b.status <> 'checked_in' then raise exception 'Only checked-in bookings can be checked out'; end if;
  update public.bookings set status = 'completed' where id = p_booking_id;
end;
$$;

grant execute on function public.book_offline(uuid, date, date, int, int, text, text, text, text, boolean, text) to authenticated;
grant execute on function public.check_in_booking(uuid)  to authenticated;
grant execute on function public.check_out_booking(uuid) to authenticated;

-- =============================================================================
-- RPC: cancel_booking — redefined to also allow the hotel's manager/staff
-- (front desk cancellations), in addition to the booking's guest and admins.
-- Releases inventory and applies the same time-based refund policy.
-- =============================================================================
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason     text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b      public.bookings;
  v_hours  numeric;
  v_pct    numeric;
  v_refund numeric;
  d        date;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;

  if not (
    v_b.guest_id = auth.uid()
    or public.get_my_role() = 'admin'
    or public.can_operate_hotel(v_b.hotel_id)
  ) then
    raise exception 'Not allowed';
  end if;

  if v_b.status not in ('pending', 'confirmed', 'checked_in') then
    raise exception 'This booking cannot be cancelled';
  end if;

  v_hours := extract(epoch from (v_b.check_in::timestamp - now())) / 3600;
  if v_hours >= 48 then v_pct := 1.0;
  elsif v_hours >= 24 then v_pct := 0.5;
  else v_pct := 0.0;
  end if;
  v_refund := round(v_b.total_price * v_pct, 2);

  d := v_b.check_in;
  while d < v_b.check_out loop
    update public.room_inventory
      set booked_count = greatest(0, booked_count - v_b.num_rooms)
      where room_id = v_b.room_id and date = d;
    d := d + 1;
  end loop;

  update public.bookings
    set status = 'cancelled',
        cancellation_reason = p_reason,
        cancelled_at = now(),
        refund_amount = v_refund
    where id = p_booking_id;

  update public.payments
    set status = case when v_refund > 0 then 'refunded' else status end,
        refunded_at = case when v_refund > 0 then now() else refunded_at end
    where booking_id = p_booking_id;

  return jsonb_build_object('refund_amount', v_refund, 'refund_pct', v_pct);
end;
$$;

grant execute on function public.cancel_booking(uuid, text) to authenticated;

-- =============================================================================
-- RPC: accept all pending staff invites addressed to the caller's email.
-- Lets an invited user self-assign (RLS otherwise only lets the hotel manager
-- write hotel_staff). Promotes a guest to the 'staff' role. Returns the count.
-- =============================================================================
create or replace function public.accept_my_staff_invites()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text;
  v_count int := 0;
  inv     record;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select email into v_email from auth.users where id = v_uid;
  if v_email is null then return 0; end if;

  for inv in
    select * from public.staff_invites
    where lower(email) = lower(v_email)
      and status = 'pending'
      and expires_at > now()
  loop
    insert into public.hotel_staff (hotel_id, staff_id, email, permissions, invited_by)
      values (inv.hotel_id, v_uid, v_email, inv.permissions, inv.invited_by)
      on conflict (hotel_id, staff_id)
        do update set permissions = excluded.permissions, email = excluded.email;

    update public.staff_invites
      set status = 'accepted', accepted_at = now()
      where id = inv.id;

    v_count := v_count + 1;
  end loop;

  -- Promote a guest to staff once they hold at least one assignment.
  if v_count > 0 then
    update public.profiles set role = 'staff' where id = v_uid and role = 'guest';
  end if;

  return v_count;
end;
$$;

grant execute on function public.accept_my_staff_invites() to authenticated;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.hotel_staff   enable row level security;
alter table public.staff_invites enable row level security;

grant select, insert, update, delete on public.hotel_staff, public.staff_invites
  to authenticated;

-- ---- hotel_staff: manager manages rows for own hotels; staff read own --------
drop policy if exists "hotel_staff: manager all" on public.hotel_staff;
drop policy if exists "hotel_staff: staff read"  on public.hotel_staff;

create policy "hotel_staff: manager all"
  on public.hotel_staff for all
  using (public.owns_hotel(hotel_id))
  with check (public.owns_hotel(hotel_id));

create policy "hotel_staff: staff read"
  on public.hotel_staff for select
  using (staff_id = auth.uid());

-- ---- staff_invites: manager manages invites for own hotels -------------------
drop policy if exists "staff_invites: manager all" on public.staff_invites;

create policy "staff_invites: manager all"
  on public.staff_invites for all
  using (public.owns_hotel(hotel_id))
  with check (public.owns_hotel(hotel_id));

-- ---- hotels: assigned staff can read their hotels; hide soft-deleted ---------
drop policy if exists "hotels: read approved" on public.hotels;
create policy "hotels: read approved"
  on public.hotels for select
  using (status = 'approved' and deleted_at is null);

drop policy if exists "hotels: read staff" on public.hotels;
create policy "hotels: read staff"
  on public.hotels for select
  using (public.is_hotel_staff(id));

-- ---- rooms: write allowed for manager OR staff with manage_rooms -------------
drop policy if exists "rooms: manager write" on public.rooms;
create policy "rooms: manager write"
  on public.rooms for all
  using (public.can_manage_hotel(hotel_id, 'manage_rooms'))
  with check (public.can_manage_hotel(hotel_id, 'manage_rooms'));

-- ---- bookings: assigned staff can read their hotels' bookings ----------------
drop policy if exists "bookings: read staff" on public.bookings;
create policy "bookings: read staff"
  on public.bookings for select
  using (public.can_operate_hotel(hotel_id));

-- ---- payments: assigned staff can read their hotels' payments ----------------
drop policy if exists "payments: read staff" on public.payments;
create policy "payments: read staff"
  on public.payments for select
  using (exists (select 1 from public.bookings b
                 where b.id = booking_id and public.can_operate_hotel(b.hotel_id)));
