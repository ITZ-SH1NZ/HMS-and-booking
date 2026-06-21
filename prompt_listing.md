# Build: Rich Public Hotel Listing (Detail) Page — HMS

Replace the current basic hotel detail page with a full, Airbnb-style public listing page that matches the provided mockup. Implement everything end to end: the data fetching (with the RLS/DB changes it requires), the page layout, an interactive photo gallery, a sticky booking widget, in-page section navigation, a location map, host card, and reviews. Read this whole document before writing code. No step may be left stubbed.

---

## 1. Project context & stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript (strict — no `any`). The detail page is a **Server Component** for data + SEO; interactive pieces (gallery modal, booking widget, scrollspy tabs, map) are Client Components.
- **Styling:** Tailwind CSS v4. **Only valid Tailwind shades** — never invent shades like `slate-350` / `emerald-750` (they silently render nothing). Allowed shades are 50,100,200,…,900,950.
- **Backend:** Supabase. Server client: `lib/supabase/server.ts` (`createClient()`); client: `lib/supabase/client.ts`.
- **Icons:** Use the SVG components in `components/icons.tsx` (and `lucide-react`). **NEVER use emoji glyphs.** Note: the current page has a literal `⭐` emoji in the reviews section — remove it as part of this work.
- **Currency:** Display all money through `components/Price.tsx` (`<Price amount={...} />`) + `CurrencyProvider`. Base currency INR (₹).

### Brand / visual language (guest-facing)
- The **public site uses ROSE as the primary accent** (`rose-600` / `hover:rose-700`) — e.g. the existing "Book now" button and the mockup's "Check availability" / "View on map" buttons. (This is the opposite of the manager wizard, which uses emerald. Keep guest CTAs rose.)
- Cards: white, `rounded-2xl border border-slate-200`, soft shadow. Section spacing generous.
- Match the mockup closely: breadcrumb, hero photo collage, rating/"Guest favourite" treatment, amenity quick-strip, sticky in-page tabs, and a right-hand sticky booking column.

### Reusable assets (reuse, don't reinvent)
- `components/Price.tsx`, `components/HeartButton.tsx` (the "Save" action), `components/icons.tsx`.
- Booking: `components/BookingFlow.tsx`, `components/DateRangePicker.tsx`, `components/RangeCalendar.tsx`, `components/PriceBreakdown.tsx`, and the existing **`room_availability(p_hotel_id, p_check_in, p_check_out)`** Postgres RPC (see `supabase/booking_schema.sql`). The booking widget on this page must drive that same flow — do not fork the booking logic.
- `components/ReviewForm.tsx` for the review submission box.
- Map: a read-only variant of the already-built `app/manager/create-hotel/components/LeafletMap.tsx` (extract a shared `components/LocationMap.tsx` that renders a non-draggable marker at given lat/long; reuse the Leaflet dynamic-import + SSR-safety pattern).

---

## 2. Current state (what you are replacing)

`app/hotels/[id]/page.tsx` (~165 lines) is a minimal server component: one hero image, name, location string, avg rating, min price, a flat room list, a flat review list, and a "Book now" link to the separate `/hotels/[id]/book` route. It uses only legacy fields (`name`, `location`, `image_url`, `description`).

**All the rich data already exists** from the hotel-creation wizard and its migration (`supabase/hotel_wizard_migration.sql`). On the `hotels` row you now have: `property_type`, `short_description`, `detailed_description` (sanitized HTML), `star_rating`, `year_built`, `languages_spoken[]`, `highlights[]`, `best_for[]`, structured address (`country/state/city/area/address_line/pincode`), `latitude/longitude`, `amenities[]`, policy fields (`check_in_time`, `check_out_time`, `min_age`, `pets_policy`, `smoking_policy`, `parties_policy`, `cancellation_policy`, `payment_policy`), and tax fields. Related tables: `hotel_photos(category, url, sort_order)`, `room_photos(room_id, url, sort_order)`, `additional_charges`, `availability_rules` (min stay etc.), `pricing_seasons`, `blocked_dates`. Rooms carry `bedroom_type`, `adults`, `children`, `capacity`, `room_size`, `is_active`, `price`, `total_units`. The `Hotel`/`HotelDraft` type in `lib/types.ts` already declares these.

Only **published** hotels are public (`status = 'approved'`). The page must `notFound()` for non-approved hotels to anonymous users (managers/admins may preview their own — mirror existing RLS).

---

## 3. REQUIRED database / RLS changes (do this first — the mockup is blocked without it)

Create `supabase/listing_public_migration.sql` (idempotent, re-runnable). The mockup shows host and reviewer identities, which **current RLS forbids** (`profiles` is readable only by self/admin). Fix these safely:

1. **Public host + reviewer identity.** Create a restricted public view `public.public_profiles` exposing **only** `id, full_name, created_at` (and `avatar_url` if you add it), and `grant select` to `anon, authenticated`. Do NOT expose phone/dob/email. Use this view for the host card and reviewer names. (Alternatively a `security definer` RPC — but the view is simplest; pick one and document it.)
2. **Host hosting duration / "member since"** comes from `public_profiles.created_at` of the hotel's `manager_id`.
3. **Reviewer names**: join `reviews` → `public_profiles` for the reviews list.
4. **Confirm public read** of `hotel_photos` and `room_photos` for `approved` hotels (the wizard migration added these; verify the `select` policy lets `anon` read when the parent hotel is approved). Fix if missing.
5. **"Guest favourite" / "Superhost" badges** — define derivations, don't hard-code:
   - *Guest favourite* (hotel-level): `avg_rating >= 4.8 AND review_count >= 5`.
   - *Superhost* (host-level): the host's hotels average `>= 4.8` with `>= 10` total reviews. Compute in a small helper or SQL; if the data's too thin, hide the badge rather than fake it.
6. **Nearest landmarks** (the "Cochin Airport — 8.5 km" list): pick ONE and implement it, don't silently drop it —
   - (a) compute server-side at render via the OSM Overpass/Nominatim API for the hotel's lat/long, cached; or
   - (b) add a `nearby_places jsonb` column populated during wizard Step 2 and just read it here.
   Recommend (b) for speed; if you choose (a), cache aggressively (it's slow). Whichever, render a labeled empty-state if unavailable.
7. **Avatars**: `profiles` has no avatar column. Use an **initials avatar** (the app already does this in the navbar) rather than adding storage — unless you add a nullable `avatar_url` to the public view. Don't block on this.

Document in a README note which approach you took for items 1 and 6, and the exact SQL to run.

---

## 4. Data fetching

In the page server component, fetch in parallel:
- The hotel with `*, rooms(*), reviews(*), hotel_photos(*)` (and `room_photos` per room) where `id = params.id`.
- The host via `public_profiles` (by `manager_id`).
- Derived aggregates: `avg_rating`, `review_count`, rating histogram (counts per 1–5), `min_price` across active rooms, badge flags (§3.5), nearest landmarks (§3.6).
- The `availability_rules` row (for "Minimum stay").
Add a typed `getPublicHotel(id)` to `lib/hotels.ts` returning a single `PublicHotelDetail` view-model (add the interface to `lib/types.ts`). Keep the existing `toHotelCard` helper.

---

## 5. Page layout & sections (match the mockup)

Two-column layout: a wide left content column and a **sticky right rail** (booking widget + host card + mini map). Full-width hero collage and breadcrumb above the columns. Keep the existing `Navbar`.

### 5.1 Breadcrumb
`Home › {state} › {city} › {hotel name}` with links to the relevant search/filter routes (state/city link to listings filtered by location; final crumb is plain text).

### 5.2 Hero photo collage
Airbnb-style: one large cover image on the left + a 2×2 grid of category thumbnails on the right (each labeled with its category, e.g. Rooms / Restaurant / Pool / Lobby). The last tile shows a **"+N more photos"** overlay. Overlay chips on the cover: **"{avg} ({count} reviews)"** and **"Guest favourite"** (when earned). A **"View all photos"** button. Clicking any tile or the button opens a **full-screen gallery modal** (client component) grouped by `hotel_photos.category`, with keyboard nav. Use `hotel_photos` ordered by `sort_order`; fall back to `image_url` if no categorized photos.

### 5.3 Title block
`{name}` + a **"{star_rating} Star {property_type}"** badge. Location line `{city}, {state}, {country}` with a **"View on map"** link that scrolls to the Location section. Right side: **Share** and **Save** (reuse `HeartButton`) actions.

### 5.4 "Guest favourite" summary card
The laurel/rating block: heading "Guest favourite — One of the most loved homes on HMS, according to guests", a large `{avg}` with star row, and `{count} Reviews`. Hide the "Guest favourite" framing if not earned, but still show the rating summary.

### 5.5 Amenity quick-strip
A horizontal row of the top ~7 amenities as **icon + label** (map `amenities[]` keys → icons), then a **"+N more"** chip that scrolls to / opens the full Amenities section. Maintain a single shared `amenityKey → { label, icon }` map (reuse the keys defined by the wizard's Step 5 so labels/icons are consistent across create + display).

### 5.6 Sticky in-page tab nav
A sticky (under the navbar) tab bar: **Overview · Rooms & rates · Amenities · Photos · Location · Policies · Reviews**. Clicking scrolls to the section; the active tab updates on scroll (scrollspy via `IntersectionObserver`). Client component.

### 5.7 Overview section
- Description from `detailed_description` (**sanitized HTML** — reuse the same sanitizer used on the wizard side; never `dangerouslySetInnerHTML` raw DB content) with a **"Read more"** expand/collapse. Fall back to `short_description`/`description`.
- A details grid (icon + label + value): Check-in (`check_in_time`), Check-out (`check_out_time`), Minimum stay (from `availability_rules`), Property type, Year built, Languages spoken, Cancellation policy, Pets, Smoking, Events & parties. Render policy enum values as friendly text ("Not allowed", "On request", etc.).

### 5.8 Rooms & rates section
A horizontal carousel of **active** rooms (`is_active`), prev/next arrows, **"View all rooms"** link. Each room card: room photo (`room_photos`, fallback placeholder), name, bed config (`bedroom_type`), guests (`capacity` / adults+children), **`<Price>` / night**, "Inclusive of all taxes", and a **Reserve/Select** button that sets that room in the booking widget (prefill) and/or routes into `BookingFlow` with the chosen room + dates.

### 5.9 Amenities section
Full amenities grouped by the wizard's categories (General, Recreation, Dining, Family, Business, Accessibility, Safety). A **"Show all amenities"** modal if the list is long.

### 5.10 Photos section
The full categorized gallery (same source as the hero modal), grouped by category with headings.

### 5.11 Location section
A `LocationMap` (read-only Leaflet marker at `latitude/longitude`), the composed address, and a **Nearest landmarks** list (name + distance) from §3.6, with **"View all nearby places"**.

### 5.12 Policies section
House rules (check-in/out, minimum age, pets/smoking/parties), the full **cancellation policy** text (use `cancellation_policy_custom` when `custom`), and the **payment policy** (pay-at-property vs advance, with advance amount). These must reflect the hotel's stored values — and note for a follow-up that booking's GST/fee/refund logic is still hard-coded in the RPCs (`book_room`/`cancel_booking`); displaying per-hotel policy here is display-only for now. Add a `// TODO(future)` comment.

### 5.13 Reviews section
- Header: `{avg}` + `{count} reviews` and a **rating histogram** (5→1 bars).
- List of reviews: reviewer name (from `public_profiles`) + initials avatar + date + comment, with **"Show all reviews"** (modal or pagination).
- Keep `ReviewForm` for an authenticated guest (ideally gated to guests who have a completed booking at this hotel — if that check is cheap, add it; otherwise leave as-is and note it).

### 5.14 Right rail — booking widget (the conversion piece)
Sticky card: large **`<Price>` / night** + "Inclusive of all taxes"; **Check-in / Checkout** via `DateRangePicker`; a **Guests & Rooms** selector; a rose **"Check availability"** button that calls the `room_availability` RPC for the selected dates and either shows available rooms inline or proceeds into `BookingFlow` (preserve the existing pricing/booking path — don't reimplement payments). Subtext "You won't be charged yet". Trust rows with icons: **Free cancellation before {date}**, **No prepayment needed**, **Secure booking**, **24/7 customer support**. Disable past dates and `blocked_dates`.

### 5.15 Right rail — host card
Initials avatar + **"Hosted by {host full_name}"**, **"Superhost · {duration} hosting"** (duration from `public_profiles.created_at`; show "Superhost" only when earned), and a **"Message host"** button (wire to existing messaging if present, else a disabled/"coming soon" state — don't invent a backend).

### 5.16 Right rail — mini map card
A compact `LocationMap` + **"View on map"** + the **Nearest landmarks** list (same data as §5.11).

---

## 6. Accessibility & quality
- Semantic headings per section; the sticky tabs are real anchor links.
- Gallery modal: focus trap, `Esc` to close, arrow-key navigation, `alt` text.
- All images via `<img>` with `alt` (the codebase currently disables `@next/next/no-img-element` locally — keep that pattern).
- Mobile: the right rail collapses to a bottom sticky "Check availability" bar; sections stack.
- Strict TypeScript, no `any`. `npm run build` and `npm run lint` clean. No invalid Tailwind shades. No emojis.

## 7. Acceptance criteria
- `/hotels/[id]` renders the full mockup for an approved hotel using real wizard data (photos by category, amenities with icons, policies, host, map, reviews, rooms).
- Non-approved hotels `notFound()` for the public; owners/admins can preview.
- Host name and reviewer names render via the new `public_profiles` view **without exposing private profile fields**.
- The booking widget produces a real, working booking through the existing `room_availability` RPC + `BookingFlow` (no payment logic rewritten).
- Nearest landmarks render (computed or stored) or show a clean empty state.
- The existing `⭐` emoji and any other emoji are gone.

## 8. Deliverables
1. `supabase/listing_public_migration.sql` (public_profiles view, photo read policies check, optional `nearby_places`/`avatar_url`) — idempotent.
2. Rewritten `app/hotels/[id]/page.tsx` + section components under `app/hotels/[id]/components/` (e.g. `PhotoCollage.tsx`, `GalleryModal.tsx`, `SectionTabs.tsx`, `RoomCarousel.tsx`, `BookingWidget.tsx`, `HostCard.tsx`, `ReviewsBlock.tsx`).
3. Shared `components/LocationMap.tsx` (read-only map) and a shared `amenityCatalog` (key → label + icon) reused by the wizard.
4. `getPublicHotel()` in `lib/hotels.ts` + `PublicHotelDetail` types in `lib/types.ts`.
5. A README/PR note: the SQL to run, which host-data approach (view vs RPC) and which landmarks approach (stored vs computed) you chose, and any follow-ups (per-hotel tax/refund wiring, messaging).

Build in slices and keep the app compiling: (1) DB migration + `getPublicHotel` + types; (2) page shell with hero, title, overview, rooms; (3) booking widget wired to the real flow; (4) amenities/location/policies/reviews; (5) gallery modal + scrollspy polish.
