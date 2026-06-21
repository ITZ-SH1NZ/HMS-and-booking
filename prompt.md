# Build: 9-Step Draft-Based Hotel Creation Wizard (HMS)

You are working in an existing Next.js + Supabase hotel-management app. Your job is to **replace the current basic single-page "create hotel" form with a full 9-step, draft-based listing wizard** that matches the provided mockups. Implement everything end to end: database migration, storage, types, reusable components, the wizard shell, all 9 steps, validation, draft persistence, live preview, and publish flow.

Read this entire document before writing code. Do not skip steps. Do not leave TODOs or stubbed steps — every step must be fully functional.

---

## 1. Project context & stack

- **Framework:** Next.js 16 (App Router, server + client components), React 19, TypeScript (strict — no `any`).
- **Styling:** Tailwind CSS v4. No CSS-in-JS, no styled-components.
- **Backend:** Supabase (Postgres + Auth + Storage). Client helpers already exist:
  - `lib/supabase/client.ts` → `createClient()` for client components.
  - `lib/supabase/server.ts` → server client.
  - `lib/supabase/middleware.ts`, `lib/supabase/admin.ts`.
- **Auth/roles:** `profiles` table with `role` in (`guest | manager | admin`). Only `manager` users may create hotels. The wizard lives under `app/manager/create-hotel/`.
- **Icons:** `lucide-react` plus a local `components/icons.tsx`. **NEVER use emoji glyphs anywhere in the UI** — always render an SVG icon component.
- **Currency:** `components/CurrencyProvider.tsx` + `components/Price.tsx` exist. Base currency is **INR (₹)**. Use `Price`/the currency context for any money display.

### Existing reusable assets you MUST reuse (do not reinvent)
- `components/AuthCard.tsx` exports: `inputClass` (string), `labelClass` (string), `primaryBtn` (string), `AuthCard`.
- `components/FormBits.tsx` exports: `Field({ label, children })` and `Stepper({ step, total })`.
- `components/icons.tsx` exports (use these names): `SearchIcon, MapPinIcon, CalendarIcon, UserIcon, UsersIcon, CheckIcon, CheckCircleIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, MinusIcon, LockIcon, EyeIcon, EyeOffIcon, PhoneIcon, MailIcon, ClockIcon, BanIcon, GlobeIcon, BedIcon, BuildingIcon, UmbrellaIcon, MountainIcon, TreeIcon, GemIcon, WalletIcon, TagIcon, ShieldIcon, HeadphonesIcon, ArrowRightIcon, ArrowLeftIcon, PencilIcon, BoltIcon, CreditCardIcon, StarIcon, HeartIcon, GoogleIcon`. **If you need an icon not in this list, add it to `components/icons.tsx`** as a small SVG component following the existing style — do not import ad-hoc inline SVGs elsewhere.
- `components/RangeCalendar.tsx` / `components/DateRangePicker.tsx` — reference these for the availability calendar styling.
- `lib/types.ts` — central shared types. **Add all new interfaces here**, matching the existing style (see `Hotel`, `Room`, `HotelWithStats`).

### Visual language (from the mockups)
- **Primary CTA buttons** ("Save & continue", "Save room", "Publish listing"): solid **emerald/green** (`bg-emerald-700 hover:bg-emerald-800 text-white`), rounded-lg, with a trailing `ArrowRightIcon` where the mockup shows one.
- **Secondary buttons** ("Save draft", "Save & continue later", "Back", "Cancel", "Reorder rooms"): white background, `border border-slate-300 text-slate-700`, rounded-lg.
- **Brand accent** (logo, the top progress bar in `Stepper`) stays **rose** (`rose-600`) — it's the HMS brand color. Do not change the logo or navbar.
- **Active wizard step** in the left rail: light green background (`bg-emerald-50`), green circular number badge (`bg-emerald-700 text-white`). **Completed** steps: green circle with `CheckIcon`. **Upcoming** steps: grey outline circle with the step number.
- Cards: white, `rounded-2xl border border-slate-200`, generous padding (`p-6`).
- Inputs use `inputClass`; labels use `labelClass`; required fields show a red asterisk after the label.
- Selectable chips: rounded-full, `border border-slate-300 px-3 py-1.5 text-sm`; selected = `border-emerald-600 bg-emerald-50 text-emerald-800`.
- Font sizes, spacing, and counters ("82/200") must match the mockups closely.

---

## 2. Current state (what you are replacing)

`app/manager/create-hotel/page.tsx` is a single 129-line form that inserts one `hotels` row + one `rooms` row with only: hotel `name`, `location` (free text), `description`, `image_url` (a pasted URL), and one room (`name`, `price`, `total_units`). **Delete this implementation and rebuild** the route as the wizard. Keep the route path `app/manager/create-hotel` as the entry point.

### Existing database (already deployed — do NOT break)
```
profiles(id, role, full_name, phone, dob, location, created_at)
hotels(id, manager_id, name, description, location text NOT NULL, image_url, status text CHECK in ('pending','approved','rejected') default 'pending', created_at)
rooms(id, hotel_id, name, price numeric NOT NULL, capacity int default 2, total_units int default 5, amenities text[] default '{}', created_at)
bookings(...), room_inventory(...), payments(...), reviews(...)
```
- Booking flow depends on `rooms.price` and `rooms.total_units` — these MUST stay populated for every room you create.
- RPC `book_room()` currently hard-codes **18% GST + 2% platform fee**. RPC `cancel_booking()` hard-codes a **48h=100% / 24h=50% / else 0%** refund ladder. You are NOT rewriting these RPCs in this task, but the new per-hotel policy/tax fields you add must be stored so a later task can wire them in. Add a short `-- TODO(future)` comment in the migration noting this.
- Admin approval already exists: admins move hotels `pending → approved`. Your **Publish** action sets `draft → pending`, which feeds straight into that existing workflow.
- RLS is enabled on all tables. Mirror the existing policy patterns for any new tables.

---

## 3. Database migration

Create `supabase/hotel_wizard_migration.sql`. It must be **idempotent and safe to re-run** (`add column if not exists`, `create table if not exists`, `drop policy if exists` before `create policy`). Run AFTER the existing `schema.sql` and `booking_schema.sql`.

### 3.1 Extend `hotels`
- Change the `status` check constraint to allow `'draft'` and make `'draft'` the new default for wizard-created rows. (Drop and recreate the constraint to include `('draft','pending','approved','rejected')`.)
- Add: `wizard_step int not null default 1` (last completed/active step, 1–9, for resume).
- **Step 1:** `property_type text`, `short_description text`, `detailed_description text`, `star_rating int check (star_rating between 1 and 5)`, `year_built int`, `languages_spoken text[] not null default '{}'`, `highlights text[] not null default '{}'`, `best_for text[] not null default '{}'`.
- **Step 2:** `country text`, `state text`, `city text`, `area text`, `address_line text`, `pincode text`, `latitude numeric(9,6)`, `longitude numeric(9,6)`.
- **Step 5:** `amenities text[] not null default '{}'` (property-level).
- **Step 6 (policies):** `check_in_time text`, `check_out_time text`, `min_age int`, `pets_policy text`, `smoking_policy text`, `parties_policy text` (each free text storing `allowed | not_allowed | on_request | designated`), `cancellation_policy text` (`flexible | moderate | strict | custom`), `cancellation_policy_custom text`, `payment_policy text` (`pay_at_property | advance`), `require_advance boolean not null default false`, `advance_amount numeric(10,2)`, `advance_is_percent boolean not null default true`.
- **Step 7 (taxes):** `gst_percent numeric(5,2) default 18`, `service_charge_percent numeric(5,2) default 0`, `other_tax_percent numeric(5,2) default 0`.
- **Step 9:** `terms_accepted boolean not null default false`, `published_at timestamptz`.
- Keep legacy `location` and `image_url`; on **Publish**, set `location = city || ', ' || state || ', ' || country` and `image_url = cover photo url`.

### 3.2 Extend `rooms`
Add: `short_description text`, `bedroom_type text`, `adults int not null default 2`, `children int not null default 0`, `room_size text`, `is_active boolean not null default true`, `sort_order int not null default 0`. Keep `capacity` populated as `adults + children` for backward compatibility.

### 3.3 New tables (all with `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, and an FK index)
- `hotel_photos(hotel_id fk→hotels on delete cascade, url text not null, category text not null, sort_order int default 0)` — category in (`cover, exterior, lobby, rooms, restaurant, pool, amenities, bathroom, other`).
- `room_photos(room_id fk→rooms on delete cascade, url text not null, sort_order int default 0)`.
- `pricing_seasons(hotel_id fk, name text, start_date date, end_date date, price numeric(10,2))`.
- `additional_charges(hotel_id fk, label text, amount numeric(10,2), per text)` — `per` in (`night, stay, day, guest`).
- `availability_rules(hotel_id fk unique, open_for_booking boolean default true, advance_days int default 365, min_stay_weekday int default 1, min_stay_weekend int default 1, max_stay int)` — one row per hotel.
- `blocked_dates(hotel_id fk, date date, reason text, unique(hotel_id, date))`.

### 3.4 RLS for new tables
Enable RLS on all new tables. Grant `select, insert, update, delete` to `authenticated`. Policies (mirror existing patterns in `schema.sql`):
- Manager can do everything on rows belonging to a hotel they own: `exists (select 1 from hotels h where h.id = <table>.hotel_id and h.manager_id = auth.uid())` (for `room_photos`, join through `rooms` to `hotels`).
- Public/`anon` `select` only when the parent hotel is `approved` (so draft photos aren't public). Use a join in the `using` clause.

### 3.5 Storage
Reuse the existing public `hotel-images` bucket (created in `schema.sql`). Add a `room-images` public bucket if helpful, or store room photos under a `rooms/` prefix in `hotel-images`. Ensure an authenticated-write / public-read storage policy exists for whatever bucket you use. Upload path convention: `hotels/{hotelId}/{category}/{uuid}.{ext}` and `hotels/{hotelId}/rooms/{roomId}/{uuid}.{ext}`.

---

## 4. Types & data layer

- Add interfaces to `lib/types.ts`: `HotelDraft` (the full hotels row incl. all new columns), `HotelPhoto`, `RoomPhoto`, `PricingSeason`, `AdditionalCharge`, `AvailabilityRule`, `BlockedDate`, and a `RoomDraft` extending the existing `Room` with the new fields. Add string-literal union types for `PropertyType`, `PhotoCategory`, `PolicyChoice`, `CancellationPolicy`, `PaymentPolicy`.
- Create `lib/hotelDraft.ts` with typed functions used by the wizard:
  - `getOrCreateDraft(managerId)` → returns the in-progress draft hotel for this manager, or creates a new `status='draft'` row and returns it.
  - `saveStep(hotelId, step, patch)` → updates hotel columns + sets `wizard_step = max(current, step)`.
  - CRUD helpers for rooms, photos, seasons, charges, availability, blocked dates.
  - `publishDraft(hotelId)` → validates all required fields are present, syncs `location`/`image_url`, sets `status='pending'`, `published_at=now()`, `terms_accepted=true`.
- Create a client hook `useHotelDraft()` (in `app/manager/create-hotel/useHotelDraft.ts`) that loads/creates the draft on mount, exposes the current step, a `patch()` that optimistically updates local state and debounced-saves to Supabase, and `saving`/`error` state. All 9 step components read/write through this hook so progress survives reload.

---

## 5. Wizard shell (layout)

Build the route as a client-driven wizard. Structure:
```
app/manager/create-hotel/
  page.tsx                 // entry: loads draft, renders WizardShell
  WizardShell.tsx          // 3-column layout, step routing, stepper rail
  useHotelDraft.ts
  steps/
    Step1Basics.tsx
    Step2Location.tsx
    Step3Photos.tsx
    Step4Rooms.tsx
    RoomEditor.tsx         // the "Add a new room" sub-screen
    Step5Amenities.tsx
    Step6Policies.tsx
    Step7Pricing.tsx
    Step8Availability.tsx
    Step9Review.tsx
  components/
    StepNav.tsx            // left rail
    ListingPreview.tsx     // right-hand live preview card
    WhatsNext.tsx          // right-hand checklist card
    PhotoUploader.tsx
    ChipMultiSelect.tsx
    StarRatingInput.tsx
    Toggle.tsx
    Stepper-ish helpers as needed
```
Use the current step in React state (and reflect it in the URL via a `?step=` query param so refresh/back works), initialized from `draft.wizard_step`.

### Layout per the mockup
- **Top:** keep the existing `Navbar`.
- **Left rail (sticky):** "Create a new hotel" heading + "Save draft" secondary button. "Listing progress — Step X of 9" with a thin progress bar. Then the 9 nav items, each: status circle + icon + bold title + grey subtitle (see step titles/subtitles below). Clicking a **completed or current** step navigates to it; **future** steps are locked (greyed, not clickable) until reached. Bottom: a "Need help? Our support team is here to help you." card with `HeadphonesIcon`.
- **Center:** "Step X of 9" eyebrow, large step title, subtitle. Top-right: "Save & continue later" (secondary, returns to `/manager/dashboard`) and "Save & continue →" (primary). The form card(s). A duplicate "Save & continue →" / "Back" at the bottom.
- **Right rail (steps 1–4 & 9 per mockups; show where useful):** `ListingPreview` card + `WhatsNext` card. The preview updates live from draft state.

### Step titles / subtitles (use verbatim)
1. **Property basics** — "Add basic information about your property"
2. **Location** — "Set your property location on map"
3. **Photos** — "Upload photos in different categories"
4. **Rooms & rates** — "Add room types, capacity and pricing"
5. **Amenities** — "Select amenities available at your property"
6. **Policies** — "Set house rules and cancellation policies"
7. **Pricing & taxes** — "Set pricing, extra charges and taxes"
8. **Availability** — "Set availability and booking preferences"
9. **Review & publish** — "Review all details and publish your listing"

### Navigation rules
- "Save & continue" runs that step's validation; if it passes, persist via `saveStep` and advance. If it fails, show inline field errors and do not advance.
- "Save draft" / "Save & continue later" persist whatever is present (even incomplete) and either stay or route to the dashboard.
- Every step auto-saves on blur/change (debounced) so nothing is lost.

---

## 6. The 9 steps — exact contents

For each field below: bind it to the draft, validate as noted, and show a red asterisk for required fields.

### Step 1 — Property basics
Card "Basic information", two-column grid where shown:
- **Property name*** — text. Required.
- **Property type*** — select: `Hotel, Resort, Villa, Apartment, Homestay, Guest house, Hostel`. Required.
- **Short description*** — textarea, **max 200 chars**, live counter "N/200" bottom-right. Required.
- **Detailed description*** — **rich text editor** with a toolbar: Bold, Italic, Underline, bullet list, numbered list, insert link. **Max 2000 chars**, counter "N/2000". Required. (Use a lightweight editor — see §9; store as HTML or sanitized markdown.)
- **Star rating*** — interactive 1–5 star control (`StarRatingInput`), shows "N Star" label beside it. Required.
- **Year built** — numeric (optional, validate 1800–current year).
- **Languages spoken** — multi-select chips with removable tags + a dropdown to add more (e.g. English, Hindi, Malayalam, Tamil, …).
- **Highlights** ("What makes your property special?") — selectable preset chips (Beach view, Luxury amenities, Great location, Perfect for families, …) + "+ Add more" to type a custom highlight. Stored as `highlights[]`.
- **Who is your property best for?** — 4 selectable cards (multi-select), each icon + title + subtitle: **Families** (Family friendly, `UsersIcon`), **Couples** (Romantic getaway, `HeartIcon`), **Business travelers** (Work trips, `BuildingIcon`), **Group trips** (Friends & groups, `UsersIcon`). Selected card shows a green check badge + emerald border. Stored as `best_for[]`.

Right rail: `ListingPreview` (image with edit pencil, name, location, star rating + "(128 reviews)" placeholder, type badge, rows for Property type / Languages / Year built / Best for) and `WhatsNext` checklist mirroring the remaining steps.

### Step 2 — Location
Card "Address":
- **Country*** (select, default India), **State / Province*** (text/select), **City*** (text) — three-column row.
- **Area / Neighborhood** — text.
- **Address*** — text (full street line).
- **Pincode*** — text, validate 6 digits for India.
- **Set location on map*** — "Drag the pin to the exact location of your property." Embed an interactive map; a draggable pin sets `latitude`/`longitude`. A "Use my current location" button (uses `navigator.geolocation`). See §9 for the map provider + graceful fallback to manual lat/long inputs if no API key is configured.
Right rail "Location summary": cover image, property name, the composed address, "Lat: … Long: …", and a **Nearby places** list with distances (e.g. Cochin International Airport — 8.5 km, Aluva Railway Station — 4.3 km, Cheral Beach — 23 km, Lulu Mall Kochi — 15 km). Compute nearby places from the maps provider's places API if available; otherwise render a clearly-labeled placeholder list and do not fabricate persisted data.

### Step 3 — Photos
Card "Photo categories" — "Upload high quality photos to attract more guests." A responsive grid of category tiles, each with title, helper text, and a `PhotoUploader` (drag-drop + click, multiple files, thumbnail grid, remove, set-as-cover where relevant):
- **Cover photo*** — "This photo will be the first image shown to guests." (single image, required)
- **Property exterior** — "The building and surroundings."
- **Lobby & reception** — "Show your lobby and front desk area."
- **Rooms*** — "Show different room views." (required, ≥1)
- **Restaurant & dining** — "Show dining area and restaurant."
- **Swimming pool** — "Show pool and leisure areas."
- **Amenities** — "Gym, spa, parking, indoor."
- **Bathroom** — "Show bathroom interiors."
- **Other** — "Any other photos to showcase."
Uploads go to Supabase Storage and create `hotel_photos` rows with the right `category`. Show per-file progress and handle failures. Enforce: max 20MB/photo, accept `image/jpeg, image/png, image/webp`. Right rail "Tips for great photos" (Use high resolution images; Bright and well lit photos; Show different angles; Keep it clean and tidy; Minimum 10 photos recommended) + "Photo guide" (Cover photo: Landscape 16:9; All other photos: Landscape 4:3; Max file size 20MB; Formats JPG, PNG, WebP). Validation: cover photo present AND ≥1 room photo before continue.

### Step 4 — Rooms & rates
Header "Add all the room types available in your property." Tabs: **Room types** | **Room rate settings**.
- **Room types tab:** a list of room rows, each: `BedIcon`, room name, "{bedroom_type} · {adults+children} Guests", "₹{price}/night" (via `Price`), an **Edit** (`PencilIcon`) action, and an **active toggle** (`is_active`). A "+ Add new room" button opens `RoomEditor`. Support **reorder** (drag handle or up/down) writing `sort_order`.
- Right rail "Room summary": Total room types, Total rooms (sum of `total_units`), Max guests (max of adults+children). "Manage rooms" helper + "Reorder rooms" button.
- **Room rate settings tab:** a compact table to quickly edit each room's nightly `price` without opening the editor.
- Require **at least one active room** with a price > 0 before continue.

**`RoomEditor` sub-screen** ("Add a new room — Add details, photos and pricing for this room type"):
- **Room name*** (text), **Short description** (textarea, /200 counter).
- **Bedroom type*** — select: `1 King Bed, 1 Queen Bed, 2 Single Beds, 1 King + 1 Single, Bunk Bed, …`.
- **Capacity:** Adults (stepper, min 1) and Children (stepper, min 0) — use `PlusIcon`/`MinusIcon` steppers.
- **Room size** (number) + unit label (sq ft), **Number of rooms*** (stepper → `total_units`).
- **In-room amenities** — selectable chips (Air Conditioning, Free Wi-Fi, TV, Mini Fridge, Work Desk, …) + "+ Add more" custom → room `amenities[]`.
- **Room photos*** — `PhotoUploader` → `room_photos`.
- Footer: **Cancel** (secondary) and **Save room** (primary). On save, upsert the `rooms` row (keep `capacity = adults + children`, keep `price`/`total_units` populated).

### Step 5 — Amenities
"Select all amenities and facilities available at your property." Horizontal tabs: **General, Recreation, Dining, Family, Business, Accessibility, Safety & Security**. Each tab shows a checkbox grid. Seed each category with sensible options, including (General): Free Wi-Fi, Parking, Air conditioning, 24/7 front desk, Room service, Laundry service, Daily housekeeping, Elevator, Luggage storage, Wake-up call, Doctor on call, Power backup, Newspaper, Smoking rooms, Designated smoking area. Maintain a running "Selected N amenities" count + a "View selected" toggle that filters to chosen items. Persist to `hotels.amenities[]` (store stable string keys).

### Step 6 — Policies
- Card "House rules": **Check-in time*** and **Check-out time*** (time pickers), **Minimum age*** (number, default 18).
- **Pets**, **Smoking**, **Parties & events** — each a radio group: `Allowed | Not allowed | On request` (Smoking may use `In designated areas` instead of `On request`). Map to `pets_policy / smoking_policy / parties_policy`.
- Card "Cancellation policy*": select `Flexible | Moderate | Strict | Custom`, each showing its descriptive helper text (e.g. Moderate → "Guest can cancel free of charge until 5 days before check-in. 30% charge after that."). A "Customize policy" link reveals a textarea (`cancellation_policy_custom`) when `Custom`.
- Card "Payment policy*": select `Pay at property | Advance payment`, with helper text. A "Require advance payment" checkbox reveals an **Amount** input + a `%`/`₹` unit toggle (`advance_amount`, `advance_is_percent`).

### Step 7 — Pricing & taxes
Tabs: **Base pricing** | **Seasonal pricing**.
- **Base pricing tab:**
  - Card "Base price": **Currency** display (INR ₹, read-only) + note that per-room base prices come from Step 4; allow setting a default/fallback base price.
  - Card "Additional charges": repeatable rows — label + amount + `per` select (`night | stay | day | guest`). Presets to offer: Extra guest (per night), Cleaning fee (per stay), Resort fee (per day). "+ Add charge". Persist to `additional_charges`.
  - Card "Taxes": **GST (%)**, **Service charge (%)**, **Other tax (%)** inputs → `gst_percent / service_charge_percent / other_tax_percent`. Show a live "Total tax (approx): N%" computed from the inputs.
- **Seasonal pricing tab:** add/remove seasons (name, start_date, end_date, price) → `pricing_seasons`, with date-range validation (no inverted ranges).

### Step 8 — Availability
- Card "Availability settings": **Open for booking** toggle ("Guests can book this property") → `availability_rules.open_for_booking`.
- **Advance booking:** "Guests can book up to **N** days in advance" → `advance_days`.
- **Minimum stay:** Weekdays (nights) and Weekends (nights) → `min_stay_weekday`, `min_stay_weekend`. **Maximum stay** (nights) → `max_stay`.
- Right "Calendar": a month calendar (reuse `RangeCalendar` styling) with month nav + "Today". Clicking a date toggles it blocked/unblocked → `blocked_dates`. Legend: **Available** (green), **Booked** (red, read-only from existing `room_inventory`), **Blocked** (grey), **Pricing rule** (indicator for dates inside a `pricing_seasons` range). Booked dates are derived, not editable here.

### Step 9 — Review & publish
- A summary card: cover image, name, "{property_type} · {star_rating} Star", "{city}, {state}, {country}", rating + review-count placeholder.
- Stat tiles: Room types, Total rooms, Max guests, Amenities count.
- Rows: Location, Check-in / Check-out, Cancellation policy, Base price ("₹{min room price} + taxes & charges" via `Price`).
- Each section has an "Edit" link that jumps back to the relevant step.
- Right "What's next?": Your listing will be reviewed by our team · You'll get an email once approved · It will be free and searchable · You can make changes anytime · Add availability to start receiving bookings.
- "Ready to publish?" card: text "By clicking 'Publish listing', you agree to our Terms & Conditions and Privacy Policy." + a required **terms** checkbox + **Publish listing** primary button.
- **Publish** runs full validation across all steps (surface a checklist of anything missing and link to the step), then calls `publishDraft`: sets `status='pending'`, `published_at`, `terms_accepted=true`, syncs `location` + `image_url` (cover), and routes to `/manager/dashboard` with a success toast. The hotel now enters the existing admin approval queue.

---

## 7. Draft / resume behavior (critical)
- On entering `/manager/create-hotel`, load the manager's existing `status='draft'` hotel if one exists (most recent), else create one. Never create duplicate drafts.
- Persist after each step and on field changes (debounced). On reload, resume at `wizard_step` (or the `?step=` param).
- The left rail's progress and locked/unlocked state derive from `wizard_step`.
- A user can revisit any completed step and edit; edits re-save in place.

---

## 8. Validation summary (block "continue" until satisfied)
- **S1:** name, property_type, short_description, detailed_description, star_rating present; counters within limits.
- **S2:** country, state, city, address_line, pincode (6 digits) present; latitude & longitude set.
- **S3:** cover photo present; ≥1 room photo (any room) OR ≥1 photo in "Rooms".
- **S4:** ≥1 active room with price > 0 and total_units ≥ 1.
- **S5:** none required (recommend ≥1).
- **S6:** check-in, check-out, min_age, cancellation_policy, payment_policy present; advance_amount present if require_advance.
- **S7:** taxes are numbers ≥ 0; seasonal ranges valid.
- **S8:** advance_days ≥ 0; min/max stay consistent (max ≥ min when set).
- **S9:** terms checkbox checked; all of the above pass.
Show errors inline next to fields and as a per-step summary; never silently fail.

---

## 9. Dependencies — ASK BEFORE ADDING
You will likely need **two** new libraries. Before installing, state your choice and wait for confirmation:
1. **Rich text editor** for the detailed description (Step 1). Prefer a lightweight option (e.g. Tiptap or a small contentEditable wrapper). Sanitize output.
2. **Map provider** for Step 2 (draggable pin + nearby places). Prefer Mapbox GL or Google Maps JS API. Gate it behind an env var (e.g. `NEXT_PUBLIC_MAP_PROVIDER` + `NEXT_PUBLIC_MAP_API_KEY`); if unset, fall back to manual latitude/longitude number inputs and a static "nearby places unavailable" note, so the wizard still works without a key.
Do not add any other dependency without asking. Reuse existing packages (`lucide-react`, `motion`) otherwise.

---

## 10. Acceptance criteria
- `app/manager/create-hotel` renders the 9-step wizard matching the mockups (layout, colors, copy).
- A manager can complete all 9 steps, refresh at any point and resume exactly where they left off, and publish — after which the hotel appears in the admin approval queue as `pending`.
- All photos upload to Supabase Storage; all data persists to the new/extended tables.
- `rooms.price`, `rooms.total_units`, `rooms.capacity` stay populated so the existing booking flow (`book_room`) keeps working. Existing bookings/payments code is untouched and still compiles.
- Migration runs cleanly on a database that already has `schema.sql` + `booking_schema.sql`, and is re-runnable.
- TypeScript strict passes (`no any`), `npm run build` succeeds, `npm run lint` is clean.
- **No emojis** anywhere — only SVG icon components.

## 11. Deliverables / output
1. `supabase/hotel_wizard_migration.sql` (idempotent).
2. All wizard files under `app/manager/create-hotel/` (shell, hook, 9 steps, sub-components).
3. New shared components (`PhotoUploader`, `ChipMultiSelect`, `StarRatingInput`, `Toggle`, `ListingPreview`, etc.) and any new icons added to `components/icons.tsx`.
4. New types in `lib/types.ts` and the data layer in `lib/hotelDraft.ts`.
5. A short README/PR note: required env vars, the SQL to run and in what order, and any new npm dependency (with rationale).

Work in vertical slices: ship the migration + types + wizard shell + Step 1 working end-to-end first, then add steps 2→9. Keep the app building at every slice.
