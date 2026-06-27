-- =============================================================================
-- BookNest — Hotel lifecycle: deactivate (reversible) + delete-with-reason.
-- Run AFTER hms_management_migration.sql. Safe to re-run.
-- =============================================================================

-- Deactivated = reversibly unpublished (hidden from guests, data kept).
alter table public.hotels add column if not exists deactivated_at timestamptz;
-- Reason/note captured during the delete flow (audit trail).
alter table public.hotels add column if not exists deleted_reason text;
alter table public.hotels add column if not exists deleted_note   text;

create index if not exists hotels_deactivated_at_idx on public.hotels (deactivated_at);

-- Public listing hides soft-deleted AND deactivated hotels.
drop policy if exists "hotels: read approved" on public.hotels;
create policy "hotels: read approved"
  on public.hotels for select
  using (status = 'approved' and deleted_at is null and deactivated_at is null);
