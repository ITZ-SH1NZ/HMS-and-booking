-- =============================================================================
-- HMS — 9-Step Hotel Creation Wizard Database Migration
-- Run this in your Supabase SQL Editor. Safe to re-run (idempotent).
-- =============================================================================

-- ---- 1. Extend hotels table status constraints and default ------------------
alter table public.hotels alter column status set default 'draft';

-- Drop the old constraint named hotels_status_check
alter table public.hotels drop constraint if exists hotels_status_check;
alter table public.hotels add constraint hotels_status_check check (status in ('draft', 'pending', 'approved', 'rejected'));

-- ---- 2. Add columns to hotels table -----------------------------------------
alter table public.hotels add column if not exists wizard_step int not null default 1;
alter table public.hotels add column if not exists property_type text;
alter table public.hotels add column if not exists short_description text;
alter table public.hotels add column if not exists detailed_description text;
alter table public.hotels add column if not exists star_rating int check (star_rating between 1 and 5);
alter table public.hotels add column if not exists year_built int;
alter table public.hotels add column if not exists languages_spoken text[] not null default '{}';
alter table public.hotels add column if not exists highlights text[] not null default '{}';
alter table public.hotels add column if not exists best_for text[] not null default '{}';
alter table public.hotels add column if not exists country text;
alter table public.hotels add column if not exists state text;
alter table public.hotels add column if not exists city text;
alter table public.hotels add column if not exists area text;
alter table public.hotels add column if not exists address_line text;
alter table public.hotels add column if not exists pincode text;
alter table public.hotels add column if not exists latitude numeric(9,6);
alter table public.hotels add column if not exists longitude numeric(9,6);
alter table public.hotels add column if not exists amenities text[] not null default '{}';
alter table public.hotels add column if not exists check_in_time text;
alter table public.hotels add column if not exists check_out_time text;
alter table public.hotels add column if not exists min_age int;
alter table public.hotels add column if not exists pets_policy text;
alter table public.hotels add column if not exists smoking_policy text;
alter table public.hotels add column if not exists parties_policy text;
alter table public.hotels add column if not exists cancellation_policy text;
alter table public.hotels add column if not exists cancellation_policy_custom text;
alter table public.hotels add column if not exists payment_policy text;
alter table public.hotels add column if not exists require_advance boolean not null default false;
alter table public.hotels add column if not exists advance_amount numeric(10,2);
alter table public.hotels add column if not exists advance_is_percent boolean not null default true;
alter table public.hotels add column if not exists gst_percent numeric(5,2) default 18;
alter table public.hotels add column if not exists service_charge_percent numeric(5,2) default 0;
alter table public.hotels add column if not exists other_tax_percent numeric(5,2) default 0;
alter table public.hotels add column if not exists terms_accepted boolean not null default false;
alter table public.hotels add column if not exists published_at timestamptz;

-- ---- 3. Add columns to rooms table ------------------------------------------
alter table public.rooms add column if not exists short_description text;
alter table public.rooms add column if not exists bedroom_type text;
alter table public.rooms add column if not exists adults int not null default 2;
alter table public.rooms add column if not exists children int not null default 0;
alter table public.rooms add column if not exists room_size text;
alter table public.rooms add column if not exists is_active boolean not null default true;
alter table public.rooms add column if not exists sort_order int not null default 0;

-- ---- 4. Create new tables ---------------------------------------------------

-- 4.1 Hotel Photos
create table if not exists public.hotel_photos (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  url         text not null,
  category    text not null check (category in ('cover', 'exterior', 'lobby', 'rooms', 'restaurant', 'pool', 'amenities', 'bathroom', 'other')),
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);
create index if not exists hotel_photos_hotel_id_idx on public.hotel_photos (hotel_id);

-- 4.2 Room Photos
create table if not exists public.room_photos (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms (id) on delete cascade,
  url         text not null,
  sort_order  int default 0,
  created_at  timestamptz not null default now()
);
create index if not exists room_photos_room_id_idx on public.room_photos (room_id);

-- 4.3 Pricing Seasons
create table if not exists public.pricing_seasons (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  name        text,
  start_date  date not null,
  end_date    date not null,
  price       numeric(10,2) not null,
  created_at  timestamptz not null default now(),
  constraint pricing_seasons_dates_chk check (end_date >= start_date)
);
create index if not exists pricing_seasons_hotel_id_idx on public.pricing_seasons (hotel_id);

-- 4.4 Additional Charges
create table if not exists public.additional_charges (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  label       text not null,
  amount      numeric(10,2) not null,
  per         text not null check (per in ('night', 'stay', 'day', 'guest')),
  created_at  timestamptz not null default now()
);
create index if not exists additional_charges_hotel_id_idx on public.additional_charges (hotel_id);

-- 4.5 Availability Rules
create table if not exists public.availability_rules (
  id                 uuid primary key default gen_random_uuid(),
  hotel_id           uuid not null references public.hotels (id) on delete cascade unique,
  open_for_booking   boolean default true,
  advance_days       int default 365,
  min_stay_weekday   int default 1,
  min_stay_weekend   int default 1,
  max_stay           int,
  created_at         timestamptz not null default now()
);
create index if not exists availability_rules_hotel_id_idx on public.availability_rules (hotel_id);

-- 4.6 Blocked Dates
create table if not exists public.blocked_dates (
  id          uuid primary key default gen_random_uuid(),
  hotel_id    uuid not null references public.hotels (id) on delete cascade,
  date        date not null,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (hotel_id, date)
);
create index if not exists blocked_dates_lookup_idx on public.blocked_dates (hotel_id, date);

-- ---- 5. Row Level Security & Privileges -------------------------------------
alter table public.hotel_photos enable row level security;
alter table public.room_photos enable row level security;
alter table public.pricing_seasons enable row level security;
alter table public.additional_charges enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blocked_dates enable row level security;

grant select, insert, update, delete on
  public.hotel_photos,
  public.room_photos,
  public.pricing_seasons,
  public.additional_charges,
  public.availability_rules,
  public.blocked_dates
to anon, authenticated;

-- Policies for hotel_photos
drop policy if exists "hotel_photos: read" on public.hotel_photos;
drop policy if exists "hotel_photos: manager write" on public.hotel_photos;

create policy "hotel_photos: read" on public.hotel_photos for select
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "hotel_photos: manager write" on public.hotel_photos for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- Policies for room_photos
drop policy if exists "room_photos: read" on public.room_photos;
drop policy if exists "room_photos: manager write" on public.room_photos;

create policy "room_photos: read" on public.room_photos for select
  using (
    exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "room_photos: manager write" on public.room_photos for all
  using (
    exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and h.manager_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rooms r
      join public.hotels h on h.id = r.hotel_id
      where r.id = room_id and h.manager_id = auth.uid()
    )
  );

-- Policies for pricing_seasons
drop policy if exists "pricing_seasons: read" on public.pricing_seasons;
drop policy if exists "pricing_seasons: manager write" on public.pricing_seasons;

create policy "pricing_seasons: read" on public.pricing_seasons for select
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "pricing_seasons: manager write" on public.pricing_seasons for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- Policies for additional_charges
drop policy if exists "additional_charges: read" on public.additional_charges;
drop policy if exists "additional_charges: manager write" on public.additional_charges;

create policy "additional_charges: read" on public.additional_charges for select
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "additional_charges: manager write" on public.additional_charges for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- Policies for availability_rules
drop policy if exists "availability_rules: read" on public.availability_rules;
drop policy if exists "availability_rules: manager write" on public.availability_rules;

create policy "availability_rules: read" on public.availability_rules for select
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "availability_rules: manager write" on public.availability_rules for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- Policies for blocked_dates
drop policy if exists "blocked_dates: read" on public.blocked_dates;
drop policy if exists "blocked_dates: manager write" on public.blocked_dates;

create policy "blocked_dates: read" on public.blocked_dates for select
  using (
    exists (
      select 1 from public.hotels h
      where h.id = hotel_id and (h.status = 'approved' or h.manager_id = auth.uid() or public.get_my_role() = 'admin')
    )
  );

create policy "blocked_dates: manager write" on public.blocked_dates for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- ---- 6. TODO (future notes) -------------------------------------------------
-- TODO(future): Wire guest_percent, service_charge_percent, and cancellation policies
-- into the booking RPCs (book_room, cancel_booking) to replace the currently
-- hard-coded GST (18%) and cancellation refund ladder.
