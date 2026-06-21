-- =============================================================================
-- HMS — Performance migration
-- Makes hotel search and the catalog query fast. Run in Supabase SQL Editor.
-- Idempotent / safe to re-run.
-- =============================================================================

-- Trigram matching lets `ILIKE '%term%'` (leading-wildcard) use an index
-- instead of scanning every row. Required for instant text search.
create extension if not exists pg_trgm;

-- GIN trigram indexes on every column the homepage search matches against.
create index if not exists hotels_location_trgm_idx
  on public.hotels using gin (location gin_trgm_ops);
create index if not exists hotels_name_trgm_idx
  on public.hotels using gin (name gin_trgm_ops);
create index if not exists hotels_city_trgm_idx
  on public.hotels using gin (city gin_trgm_ops);
create index if not exists hotels_state_trgm_idx
  on public.hotels using gin (state gin_trgm_ops);

-- The catalog query is: status = 'approved' ORDER BY created_at DESC.
-- A partial index keyed on created_at (descending) over only approved rows
-- serves both the filter and the sort with no extra sort step.
create index if not exists hotels_approved_created_idx
  on public.hotels (created_at desc)
  where status = 'approved';

-- (The old btree public.hotels_location_idx is now redundant for ILIKE search
--  but harmless; left in place. Drop it later if you want to reclaim space.)

-- Refresh planner statistics so the new indexes get picked up immediately.
analyze public.hotels;
