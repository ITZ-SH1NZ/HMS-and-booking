-- =============================================================================
-- HMS — Razorpay payment support
-- Run AFTER booking_schema.sql. Safe to re-run.
-- =============================================================================

-- Track the Razorpay order id alongside the payment.
alter table public.payments add column if not exists order_id text;

-- =============================================================================
-- RPC: attach a Razorpay order id to a booking's payment (called after the
-- order is created server-side, before checkout opens).
-- =============================================================================
create or replace function public.attach_payment_order(
  p_booking_id uuid,
  p_order_id   text
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

  update public.payments
    set order_id = p_order_id
    where booking_id = p_booking_id;
end;
$$;

-- =============================================================================
-- RPC: confirm a verified Razorpay payment (server has already validated the
-- signature). Marks the payment completed and the booking confirmed.
-- =============================================================================
create or replace function public.confirm_razorpay_payment(
  p_booking_id uuid,
  p_order_id   text,
  p_payment_id text
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

  update public.payments
    set status = 'completed',
        payment_method = 'card',
        order_id = p_order_id,
        transaction_id = p_payment_id,
        paid_at = now()
    where booking_id = p_booking_id;

  update public.bookings set status = 'confirmed' where id = p_booking_id;
end;
$$;

grant execute on function public.attach_payment_order(uuid, text) to authenticated;
grant execute on function public.confirm_razorpay_payment(uuid, text, text) to authenticated;
