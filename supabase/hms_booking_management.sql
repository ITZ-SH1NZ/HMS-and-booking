-- =============================================================================
-- BookNest — Front-desk booking management.
-- Run AFTER hms_management_migration.sql. Safe to re-run.
--
-- 1) get_hotel_bookings: returns a hotel's bookings WITH the guest's real name
--    resolved from profiles (managers/staff can't read guest profiles via RLS,
--    so this SECURITY DEFINER fn does it for them, gated by can_operate_hotel).
-- 2) confirm_booking_payment: mark a pending booking as paid + confirmed.
-- =============================================================================

create or replace function public.get_hotel_bookings(p_hotel_id uuid)
returns table (
  id               uuid,
  hotel_id         uuid,
  room_id          uuid,
  guest_id         uuid,
  guest_name       text,
  guest_phone      text,
  guest_email      text,
  source           text,
  check_in         date,
  check_out        date,
  nights           int,
  guest_count      int,
  num_rooms        int,
  room_price       numeric,
  total_price      numeric,
  status           text,
  special_requests text,
  created_at       timestamptz,
  display_name     text,
  display_phone    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_operate_hotel(p_hotel_id) then
    raise exception 'Not allowed';
  end if;

  return query
    select
      b.id, b.hotel_id, b.room_id, b.guest_id,
      b.guest_name, b.guest_phone, b.guest_email, b.source,
      b.check_in, b.check_out, b.nights, b.guest_count, b.num_rooms,
      b.room_price, b.total_price, b.status, b.special_requests, b.created_at,
      coalesce(nullif(btrim(b.guest_name), ''), p.full_name, 'Guest') as display_name,
      coalesce(nullif(btrim(b.guest_phone), ''), p.phone)             as display_phone
    from public.bookings b
    left join public.profiles p on p.id = b.guest_id
    where b.hotel_id = p_hotel_id
    order by b.check_in desc, b.created_at desc;
end;
$$;

grant execute on function public.get_hotel_bookings(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Front desk: mark a pending booking as paid → confirmed.
-- ----------------------------------------------------------------------------
create or replace function public.confirm_booking_payment(
  p_booking_id uuid,
  p_method     text default 'cash'
)
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
  if v_b.status <> 'pending' then raise exception 'Booking is not awaiting payment'; end if;

  update public.payments
    set status = 'completed', payment_method = p_method, paid_at = now()
    where booking_id = p_booking_id;

  update public.bookings set status = 'confirmed' where id = p_booking_id;
end;
$$;

grant execute on function public.confirm_booking_payment(uuid, text) to authenticated;
