-- =============================================================================
-- HMS — Booking system schema
-- Run AFTER schema.sql, in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

-- Rooms need a stock count (how many physical rooms of this type) and optional
-- amenities. Existing rooms get a sensible default.
alter table public.rooms add column if not exists total_units int not null default 5;
alter table public.rooms add column if not exists amenities text[] not null default '{}';

-- ----------------------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  guest_id            uuid not null references public.profiles (id) on delete cascade,
  hotel_id            uuid not null references public.hotels (id) on delete cascade,
  room_id             uuid not null references public.rooms (id) on delete cascade,
  check_in            date not null,
  check_out           date not null,
  nights              int not null,
  guest_count         int not null default 1,
  num_rooms           int not null default 1,
  room_price          numeric(10, 2) not null,   -- snapshot of the nightly price (base currency)
  base_price          numeric(10, 2) not null,   -- room_price * num_rooms * nights
  gst                 numeric(10, 2) not null,    -- 18%
  service_charge      numeric(10, 2) not null default 0,
  platform_fee        numeric(10, 2) not null,    -- 2%
  total_price         numeric(10, 2) not null,
  status              text not null default 'pending'
                        check (status in ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled')),
  special_requests    text,
  cancellation_reason text,
  cancelled_at        timestamptz,
  refund_amount       numeric(10, 2),
  created_at          timestamptz not null default now(),
  constraint bookings_dates_chk check (check_out > check_in)
);
alter table public.bookings add column if not exists service_charge numeric(10, 2) not null default 0;
create index if not exists bookings_guest_idx on public.bookings (guest_id, created_at desc);
create index if not exists bookings_hotel_idx on public.bookings (hotel_id);
create index if not exists bookings_room_idx on public.bookings (room_id);

-- ----------------------------------------------------------------------------
-- ROOM INVENTORY  (one row per room per date; populated lazily on booking)
-- ----------------------------------------------------------------------------
create table if not exists public.room_inventory (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms (id) on delete cascade,
  date         date not null,
  total_count  int not null,
  booked_count int not null default 0,
  unique (room_id, date),
  constraint inventory_not_overbooked check (booked_count <= total_count)
);
create index if not exists room_inventory_lookup_idx on public.room_inventory (room_id, date);

-- ----------------------------------------------------------------------------
-- PAYMENTS
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  booking_id     uuid not null references public.bookings (id) on delete cascade,
  amount         numeric(10, 2) not null,
  payment_method text not null default 'upi' check (payment_method in ('upi', 'card', 'wallet')),
  status         text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  transaction_id text,                 -- UPI reference / UTR entered by the guest
  receipt        text,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  refunded_at    timestamptz
);
create index if not exists payments_booking_idx on public.payments (booking_id);

-- =============================================================================
-- RPC: room availability for a date range.
-- A room is bookable for the whole range only if it has stock on every night,
-- so availability = total_units - max(booked nights in range).
-- =============================================================================
create or replace function public.room_availability(
  p_hotel_id uuid,
  p_check_in date,
  p_check_out date
)
returns table (
  room_id   uuid,
  name      text,
  price     numeric,
  capacity  int,
  amenities text[],
  available int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.price,
    r.capacity,
    r.amenities,
    r.total_units - coalesce((
      select max(i.booked_count)
      from public.room_inventory i
      where i.room_id = r.id
        and i.date >= p_check_in
        and i.date < p_check_out
    ), 0) as available
  from public.rooms r
  where r.hotel_id = p_hotel_id
  order by r.price asc;
$$;

-- =============================================================================
-- RPC: create a booking atomically, reserving inventory for every night.
-- Concurrency-safe via row locks on the inventory rows.
-- =============================================================================
create or replace function public.book_room(
  p_room_id    uuid,
  p_check_in   date,
  p_check_out  date,
  p_guests     int,
  p_num_rooms  int,
  p_special    text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room            public.rooms;
  v_hotel           public.hotels;
  v_uid             uuid := auth.uid();
  v_nights          int;
  v_base            numeric;
  v_gst             numeric;
  v_service_charge  numeric;
  v_fee             numeric;
  v_total           numeric;
  v_id              uuid;
  v_avail           int;
  d                 date;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_check_out <= p_check_in then raise exception 'Check-out must be after check-in'; end if;
  if p_check_in < current_date then raise exception 'Check-in cannot be in the past'; end if;
  if p_num_rooms < 1 then raise exception 'At least one room is required'; end if;

  select * into v_room from public.rooms where id = p_room_id;
  if not found then raise exception 'Room not found'; end if;

  select * into v_hotel from public.hotels where id = v_room.hotel_id;
  if not found then raise exception 'Hotel not found'; end if;

  v_nights := p_check_out - p_check_in;

  -- Reserve each night (lazily create the inventory row, lock it, then book).
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

  v_base           := v_room.price * p_num_rooms * v_nights;
  v_gst            := round(v_base * (coalesce(v_hotel.gst_percent, 18.00) / 100.0), 2);
  v_service_charge := round(v_base * (coalesce(v_hotel.service_charge_percent, 0.00) / 100.0), 2);
  v_fee            := round(v_base * 0.02, 2);
  v_total          := v_base + v_gst + v_service_charge + v_fee;

  insert into public.bookings (
    guest_id, hotel_id, room_id, check_in, check_out, nights, guest_count,
    num_rooms, room_price, base_price, gst, service_charge, platform_fee, total_price,
    status, special_requests
  ) values (
    v_uid, v_room.hotel_id, p_room_id, p_check_in, p_check_out, v_nights, p_guests,
    p_num_rooms, v_room.price, v_base, v_gst, v_service_charge, v_fee, v_total,
    'pending', p_special
  )
  returning id into v_id;

  insert into public.payments (booking_id, amount, payment_method, status)
    values (v_id, v_total, 'upi', 'pending');

  return v_id;
end;
$$;

-- =============================================================================
-- RPC: mark a booking paid (UPI is trust-based; we store the reference).
-- =============================================================================
create or replace function public.confirm_payment(
  p_booking_id uuid,
  p_reference  text,
  p_method     text default 'upi'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_b public.bookings;
begin
  select * into v_b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if v_b.guest_id <> auth.uid() then raise exception 'Not allowed'; end if;
  if v_b.status <> 'pending' then raise exception 'Booking is not awaiting payment'; end if;

  update public.payments
    set status = 'completed',
        payment_method = p_method,
        transaction_id = p_reference,
        paid_at = now()
    where booking_id = p_booking_id;

  update public.bookings set status = 'confirmed' where id = p_booking_id;
end;
$$;

-- =============================================================================
-- RPC: cancel a booking, release inventory, compute refund by policy.
--   >= 48h before check-in : 100%
--   24-48h                 : 50%
--   < 24h                  : 0%
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
  if v_b.guest_id <> auth.uid() and public.get_my_role() <> 'admin' then
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

  -- Release the reserved inventory for each night.
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

-- =============================================================================
-- GRANTS + RLS
-- =============================================================================
grant execute on function public.room_availability(uuid, date, date) to anon, authenticated;
grant execute on function public.book_room(uuid, date, date, int, int, text) to authenticated;
grant execute on function public.confirm_payment(uuid, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;

grant select on public.bookings, public.payments to anon, authenticated;
grant select on public.room_inventory to anon, authenticated;

alter table public.bookings        enable row level security;
alter table public.room_inventory  enable row level security;
alter table public.payments        enable row level security;

-- ---- bookings: guest sees own, manager sees their hotels', admin sees all ---
drop policy if exists "bookings: read own"     on public.bookings;
drop policy if exists "bookings: read manager" on public.bookings;
drop policy if exists "bookings: read admin"   on public.bookings;

create policy "bookings: read own"
  on public.bookings for select using (auth.uid() = guest_id);

create policy "bookings: read manager"
  on public.bookings for select
  using (exists (
    select 1 from public.hotels h
    where h.id = hotel_id and h.manager_id = auth.uid()
  ));

create policy "bookings: read admin"
  on public.bookings for select using (public.get_my_role() = 'admin');

-- ---- payments: visible to whoever can see the parent booking -----------------
drop policy if exists "payments: read own"     on public.payments;
drop policy if exists "payments: read manager" on public.payments;
drop policy if exists "payments: read admin"   on public.payments;

create policy "payments: read own"
  on public.payments for select
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and b.guest_id = auth.uid()
  ));

create policy "payments: read manager"
  on public.payments for select
  using (exists (
    select 1 from public.bookings b
    join public.hotels h on h.id = b.hotel_id
    where b.id = booking_id and h.manager_id = auth.uid()
  ));

create policy "payments: read admin"
  on public.payments for select using (public.get_my_role() = 'admin');

-- ---- room_inventory: publicly readable (availability) ------------------------
drop policy if exists "inventory: read" on public.room_inventory;
create policy "inventory: read" on public.room_inventory for select using (true);
