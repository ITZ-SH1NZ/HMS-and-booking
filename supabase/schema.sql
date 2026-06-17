-- =============================================================================
-- HMS (Hotel Management System) — Database schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent where practical).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. PROFILES  (1 row per auth user, holds the role)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'guest' check (role in ('guest', 'manager', 'admin')),
  full_name   text,
  phone       text,
  dob         date,
  location    text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. MANAGER VERIFICATIONS  (business details + approval workflow)
-- ----------------------------------------------------------------------------
create table if not exists public.manager_verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  business_name       text,
  registration_number text,
  business_address    text,
  document_url        text,
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason    text,
  created_at          timestamptz not null default now(),
  reviewed_at         timestamptz
);
create index if not exists manager_verifications_user_id_idx on public.manager_verifications (user_id);

-- ----------------------------------------------------------------------------
-- 3. HOTELS
-- ----------------------------------------------------------------------------
create table if not exists public.hotels (
  id          uuid primary key default gen_random_uuid(),
  manager_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  description text,
  location    text not null,
  image_url   text,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);
create index if not exists hotels_location_idx on public.hotels (location);
create index if not exists hotels_manager_id_idx on public.hotels (manager_id);

-- ----------------------------------------------------------------------------
-- 4. ROOMS  (used to compute a hotel's minimum price)
-- ----------------------------------------------------------------------------
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  name       text not null,
  price      numeric(10, 2) not null default 0,
  capacity   int not null default 2,
  created_at timestamptz not null default now()
);
create index if not exists rooms_hotel_id_idx on public.rooms (hotel_id);

-- ----------------------------------------------------------------------------
-- 5. REVIEWS  (used to compute a hotel's star rating)
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id         uuid primary key default gen_random_uuid(),
  hotel_id   uuid not null references public.hotels (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  rating     int not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now()
);
create index if not exists reviews_hotel_id_idx on public.reviews (hotel_id);

-- =============================================================================
-- HELPER: read the current user's role without tripping RLS recursion.
-- =============================================================================
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- The API roles must be allowed to execute this, since RLS policies call it.
grant execute on function public.get_my_role() to anon, authenticated;

-- =============================================================================
-- TRIGGER: when an auth user is created, create their profile (and, for
-- managers, their pending verification row) from the sign-up metadata.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone, dob, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'guest'),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    nullif(new.raw_user_meta_data ->> 'dob', '')::date,
    new.raw_user_meta_data ->> 'location'
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_user_meta_data ->> 'role', 'guest') = 'manager' then
    insert into public.manager_verifications (
      user_id, business_name, registration_number, business_address, document_url, status
    )
    values (
      new.id,
      new.raw_user_meta_data ->> 'business_name',
      new.raw_user_meta_data ->> 'registration_number',
      new.raw_user_meta_data ->> 'business_address',
      new.raw_user_meta_data ->> 'document_url',
      'pending'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table public.profiles               enable row level security;
alter table public.manager_verifications   enable row level security;
alter table public.hotels                  enable row level security;
alter table public.rooms                   enable row level security;
alter table public.reviews                 enable row level security;

-- Table-level privileges for the API roles. RLS (below) still restricts which
-- rows each role can actually see/modify.
grant select, insert, update, delete on
  public.profiles,
  public.manager_verifications,
  public.hotels,
  public.rooms,
  public.reviews
to anon, authenticated;

-- ---- profiles --------------------------------------------------------------
drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: read admin" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: read admin"
  on public.profiles for select
  using (public.get_my_role() = 'admin');

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- ---- manager_verifications -------------------------------------------------
drop policy if exists "mv: read own"     on public.manager_verifications;
drop policy if exists "mv: read admin"   on public.manager_verifications;
drop policy if exists "mv: update admin" on public.manager_verifications;

create policy "mv: read own"
  on public.manager_verifications for select
  using (auth.uid() = user_id);

create policy "mv: read admin"
  on public.manager_verifications for select
  using (public.get_my_role() = 'admin');

create policy "mv: update admin"
  on public.manager_verifications for update
  using (public.get_my_role() = 'admin');

-- ---- hotels ----------------------------------------------------------------
drop policy if exists "hotels: read approved" on public.hotels;
drop policy if exists "hotels: read own"      on public.hotels;
drop policy if exists "hotels: read admin"    on public.hotels;
drop policy if exists "hotels: manager write" on public.hotels;
drop policy if exists "hotels: manager edit"  on public.hotels;
drop policy if exists "hotels: admin update"  on public.hotels;

create policy "hotels: read approved"
  on public.hotels for select
  using (status = 'approved');

create policy "hotels: read own"
  on public.hotels for select
  using (auth.uid() = manager_id);

create policy "hotels: read admin"
  on public.hotels for select
  using (public.get_my_role() = 'admin');

create policy "hotels: manager write"
  on public.hotels for insert
  with check (auth.uid() = manager_id and public.get_my_role() = 'manager');

create policy "hotels: manager edit"
  on public.hotels for update
  using (auth.uid() = manager_id);

create policy "hotels: admin update"
  on public.hotels for update
  using (public.get_my_role() = 'admin');

-- ---- rooms (publicly readable, managed by owning manager) ------------------
drop policy if exists "rooms: read"         on public.rooms;
drop policy if exists "rooms: manager write" on public.rooms;

create policy "rooms: read"
  on public.rooms for select
  using (true);

create policy "rooms: manager write"
  on public.rooms for all
  using (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()))
  with check (exists (select 1 from public.hotels h where h.id = hotel_id and h.manager_id = auth.uid()));

-- ---- reviews (publicly readable, authored by guests) -----------------------
drop policy if exists "reviews: read"        on public.reviews;
drop policy if exists "reviews: author write" on public.reviews;

create policy "reviews: read"
  on public.reviews for select
  using (true);

create policy "reviews: author write"
  on public.reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =============================================================================
-- STORAGE: bucket for manager verification documents.
-- Documents are uploaded during sign-up (before the user has a session), so we
-- allow anonymous inserts but keep reads restricted to admins/owners via the
-- app. For a production system, move this upload behind a server action.
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('manager-documents', 'manager-documents', false)
on conflict (id) do nothing;

drop policy if exists "manager-docs: upload" on storage.objects;
drop policy if exists "manager-docs: read"   on storage.objects;

create policy "manager-docs: upload"
  on storage.objects for insert
  with check (bucket_id = 'manager-documents');

create policy "manager-docs: read"
  on storage.objects for select
  using (bucket_id = 'manager-documents' and public.get_my_role() = 'admin');

-- Optional public bucket for hotel images.
insert into storage.buckets (id, name, public)
values ('hotel-images', 'hotel-images', true)
on conflict (id) do nothing;

drop policy if exists "hotel-images: read"  on storage.objects;
drop policy if exists "hotel-images: write" on storage.objects;

create policy "hotel-images: read"
  on storage.objects for select
  using (bucket_id = 'hotel-images');

create policy "hotel-images: write"
  on storage.objects for insert
  with check (bucket_id = 'hotel-images' and auth.role() = 'authenticated');
