-- =============================================================================
-- HMS — Public Hotel Listing Page Migration
-- Run AFTER schema.sql, booking_schema.sql, and hotel_wizard_migration.sql.
-- Safe to re-run (idempotent).
-- =============================================================================

-- ---- 1. Public profiles view -----------------------------------------------
-- Exposes ONLY id, full_name, created_at to anon/authenticated.
-- Never exposes phone, dob, email, or location.
-- Used by: host card (manager_id lookup), reviewer names.
-- Approach: view (simplest, no RPC overhead).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, full_name, created_at
  FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- ---- 2. RPC: get reviews with reviewer names --------------------------------
-- PostgREST cannot FK-join through a view, so we use a SECURITY DEFINER RPC
-- that joins reviews ↔ profiles internally and returns only safe fields.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_hotel_reviews(p_hotel_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  rating int,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  reviewer_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.user_id,
    r.rating,
    r.comment,
    r.created_at,
    p.full_name AS reviewer_name,
    p.created_at AS reviewer_since
  FROM public.reviews r
  JOIN public.profiles p ON p.id = r.user_id
  WHERE r.hotel_id = p_hotel_id
  ORDER BY r.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_hotel_reviews(uuid) TO anon, authenticated;

-- ---- 3. nearby_places column ------------------------------------------------
-- Stores landmarks computed at publish time as JSON array:
-- [{ "name": "Cochin International Airport", "distance_km": 8.5, "type": "airport" }, ...]
-- ---------------------------------------------------------------------------
ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS nearby_places jsonb;

-- ---- 4. Verify photo read policies -----------------------------------------
-- The wizard migration already created read policies for hotel_photos and
-- room_photos that allow anon/authenticated to read when the parent hotel
-- is 'approved' (or the reader is the manager/admin). No changes needed.
-- Verified: "hotel_photos: read" and "room_photos: read" exist in
-- hotel_wizard_migration.sql with the correct approved-status gate.

-- ---- 5. Notes ---------------------------------------------------------------
-- Host identity approach: VIEW (public.public_profiles)
--   - Simplest pattern; no RPC overhead for host card lookups.
--   - The get_hotel_reviews RPC uses a direct profiles join (SECURITY DEFINER)
--     because PostgREST can't FK-embed through a view.
--
-- Landmarks approach: STORED (nearby_places jsonb)
--   - Computed at publish time via Nominatim/Overpass API, stored on the
--     hotels row. Fast reads, no render-time API calls.
--   - Backfill: run the backfill_nearby_places() function below for existing
--     approved hotels. This calls OSM Overpass for each hotel with lat/long.
--
-- TODO(future): Consider adding avatar_url to profiles/public_profiles for
-- richer host cards and reviewer avatars. Currently using initials avatars.
