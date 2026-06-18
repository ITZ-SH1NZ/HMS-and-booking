-- =============================================================================
-- HMS — Razorpay Route (split payouts) support
-- Run AFTER razorpay.sql. Safe to re-run.
-- =============================================================================

-- A manager's Razorpay Route linked account (acc_XXXXXXXX). Null until they
-- link one on the payout settings page — Route stays dormant until then.
alter table public.profiles add column if not exists razorpay_account_id text;

-- =============================================================================
-- RPC: read a hotel's payout (linked) account. The guest paying can't read the
-- manager's profile under RLS, so this SECURITY DEFINER function exposes only
-- the linked account id for the given hotel.
-- =============================================================================
create or replace function public.hotel_payout_account(p_hotel_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.razorpay_account_id
  from public.hotels h
  join public.profiles p on p.id = h.manager_id
  where h.id = p_hotel_id;
$$;

grant execute on function public.hotel_payout_account(uuid) to authenticated;
