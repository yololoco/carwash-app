# SLICES.md -- myWash Slice-by-Slice Implementation Plan

## Existing Code Inventory (already built)

Before the slices begin, here is what already exists and does NOT need to be re-created:

- Next.js 16 scaffolded with TypeScript, Tailwind v4, shadcn/ui v4
- Landing page (`/`)
- Auth pages: `/login`, `/register`, `/forgot-password` (fully functional UI, connected to Supabase Auth)
- Customer layout with mobile nav + Header (`(customer)/layout.tsx`)
- Washer layout with mobile nav + Header (`(washer)/layout.tsx`)
- Admin layout with desktop sidebar + Header (`(admin)/layout.tsx`)
- Manager layout directory structure (`(manager)/`) -- empty, no layout.tsx yet
- Customer dashboard (empty state, hardcoded) at `(customer)/dashboard/page.tsx`
- Washer queue (empty state, hardcoded) at `(washer)/washer/queue/page.tsx`
- Admin dashboard (empty state, hardcoded KPI cards) at `(admin)/admin/page.tsx`
- Supabase browser client (`lib/supabase/client.ts`)
- Supabase server client (`lib/supabase/server.ts`)
- Supabase middleware helper (`lib/supabase/middleware.ts`)
- Next.js middleware for auth session refresh + route protection (`src/middleware.ts`)
- `useAuth` hook (fetches user + profile, handles auth state changes)
- Partial TypeScript types (`types/database.ts` -- profiles, locations, cars, enums)
- UI components: button, card, dialog, input, label, select, separator, sheet, skeleton, sonner, switch, tabs, textarea, badge, avatar, dropdown-menu
- Layout components: header, mobile-nav
- Dependencies installed: `@stripe/stripe-js`, `stripe`, `@supabase/ssr`, `@supabase/supabase-js`, `next-intl`, `next-themes`, `zustand`, `sonner`, `lucide-react`
- Supabase directory exists with empty `migrations/` and `functions/_shared/`

---

## Slice 0: Database Foundation + Profile Trigger + Seed Data

**Goal**: Create the foundational database schema (enums, profiles, locations, operating hours, staff, app_settings), the profile creation trigger, RLS on profiles/locations, and seed data for development.

### Database

**Migration 00001_create_enums.sql**:
- `user_role` enum
- `location_type` enum
- `subscription_status` enum
- `booking_status` enum
- `payment_status` enum
- `wash_frequency` enum
- `inventory_tx_type` enum
- `notification_type` enum
- `day_of_week` enum
- `dispute_status` enum
- `offer_status` enum
- `payment_method` enum

**Migration 00002_create_profiles.sql**:
- `profiles` table (as defined in PLAN.md Section 4)
- Trigger: `on_auth_user_created` -- creates a profile row when a new auth.users row is inserted (using `auth.users.raw_user_meta_data` for full_name)
- Trigger: `update_updated_at` function + apply to profiles
- Index on `profiles.email`

**Migration 00003_create_locations.sql**:
- `locations` table
- `location_operating_hours` table
- `location_special_hours` table
- `location_staff` table
- `app_settings` table
- `update_updated_at` triggers on locations

**Migration 00004_rls_foundation.sql**:
- Enable RLS on `profiles`, `locations`, `location_operating_hours`, `location_special_hours`, `location_staff`, `app_settings`
- Profiles RLS: users view own, admins view all, managers view location profiles, users update own
- Locations RLS: all authenticated users can read active locations, admins can insert/update, managers can update their locations
- Location_staff RLS: admins can CRUD, managers can read their location staff
- App_settings RLS: admins can CRUD, all authenticated can read

**Migration 00005_seed_data.sql**:
- 2 test locations (1 office_building, 1 residential_building) with operating hours (Mon-Fri 7:00-18:00)
- App settings: `overhead_per_wash`, `late_cancellation_minutes`, `max_emergency_per_day`

### Backend

- `src/lib/supabase/admin.ts` -- create service-role Supabase client for server-side admin operations
- Update `types/database.ts` to add `location_operating_hours`, `location_special_hours`, `location_staff`, `app_settings` table types

### Frontend

- **Manager layout**: Create `(manager)/layout.tsx` with mobile nav (Dashboard, Schedule, Staff, Inventory, Customers links) -- mirrors the washer/customer pattern
- **Profile page**: `(customer)/profile/page.tsx` -- view/edit profile (full_name, phone, preferred_language), avatar upload placeholder, sign-out button
- **Admin locations page**: `(admin)/admin/locations/page.tsx` -- list all locations with name, type, city, is_active badge
- **Admin location create/edit**: `(admin)/admin/locations/[id]/page.tsx` -- form to create/edit location (name, address, city, state, country, type, capacity, parking/access instructions, contact info) + operating hours sub-form (7 day-of-week rows with open/close time)
- **Admin location staff sub-section**: Within location detail, list assigned staff and ability to add/remove staff (select user by email/name, assign role)
- Update admin dashboard to fetch real location count from DB

### Integration

- Auth signup (register page) must pass `full_name` in `raw_user_meta_data` so the profile trigger populates it
- Middleware remains as-is (session refresh + auth guard)
- `useAuth` hook already fetches profile -- no changes needed

### Test

- Sign up a new user, verify profile row is created with correct role
- Create a location via admin UI, verify it appears in list
- Set operating hours for a location, verify they persist
- Assign a staff member to a location, verify `location_staff` row created
- Verify RLS: customer cannot see other customer's profile, cannot update others

---

## Slice 1: Cars + Service Catalog + Wash Packages

**Goal**: Customers can add/manage their cars. Admin can manage the service catalog and wash packages. Customers can browse packages at their location.

### Database

**Migration 00006_create_cars.sql**:
- `cars` table (as in PLAN.md)
- `update_updated_at` trigger on cars
- Index on `cars.owner_id`

**Migration 00007_create_services_packages.sql**:
- `service_catalog` table
- `wash_packages` table
- `package_location_pricing` table
- `premium_fees` table
- `update_updated_at` triggers

**Migration 00008_rls_cars_services.sql**:
- Cars RLS: customers see own, washers see assigned (defer to Slice 3 when bookings exist), admins see all, managers see location cars. Customers insert/update own.
- Service_catalog RLS: all authenticated can read active services, admins can CRUD
- Wash_packages RLS: all authenticated can read active packages, admins can CRUD
- Package_location_pricing RLS: all authenticated can read, admins can CRUD
- Premium_fees RLS: admins can CRUD, all authenticated can read

### Backend

- Update `types/database.ts` with `service_catalog`, `wash_packages`, `package_location_pricing`, `premium_fees` table types
- `src/lib/utils/currency.ts` -- format MXN currency helper
- Supabase Storage: create `car-photos` bucket with policies (customers upload to `car-photos/{user_id}/*`, authenticated can read)

### Frontend

- **Customer cars list**: `(customer)/cars/page.tsx` -- list user's cars as cards (plate, make, model, color, photo, parking_spot, location). Empty state with CTA to add car.
- **Customer add car**: `(customer)/cars/new/page.tsx` -- form: plate_number (required), make, model, year, color, photo upload (to Supabase Storage), select primary_location (dropdown of active locations), parking_spot. On save, insert into `cars` table.
- **Components**: `components/car/car-card.tsx`, `components/car/car-form.tsx`, `components/car/plate-input.tsx` (uppercase, formatted), `components/shared/image-upload.tsx`
- **Admin services page**: `(admin)/admin/services/page.tsx` -- CRUD table for service_catalog (name, description, category, is_add_on, estimated_duration_minutes, sort_order, is_active toggle)
- **Admin packages page**: `(admin)/admin/packages/page.tsx` -- CRUD for wash_packages (name, description, frequency, included_services multi-select from service_catalog, base_price, currency, is_subscription, multi_car_discount_pct, sort_order). Sub-section: location pricing overrides.
- **Admin fees page**: `(admin)/admin/fees/page.tsx` -- CRUD for premium_fees (name, fee_type, amount/percentage, location, conditions JSON editor, is_active)
- **Customer browse packages**: `(customer)/packages/page.tsx` -- list wash packages available at user's car location(s). Cards with name, description, price, frequency, included services list.
- **Customer package detail**: `(customer)/packages/[id]/page.tsx` -- full detail of a package with pricing (check location override), list of included services, subscribe CTA button (disabled until Slice 2)
- Update customer dashboard: show car count from DB, link to cars page

### Integration

- Cars page queries `cars` table filtered by `owner_id = auth.uid()`
- Packages page queries `wash_packages` where `is_active = true`, joins `package_location_pricing` for user's location
- Admin services/packages/fees pages use Supabase client with authenticated admin user

### Test

- Customer adds a car with photo, verify it appears in list
- Customer edits car parking_spot, verify update persists
- Admin creates a service, verify it appears in catalog
- Admin creates a package with included services, verify pricing
- Admin sets location-specific pricing override, verify customer sees override price
- Customer browses packages, sees correct prices for their location
- RLS: Customer A cannot see Customer B's cars

---

## Slice 2: Subscriptions + Stripe/MercadoPago + Payments

**Goal**: Customers can subscribe to a wash package with payment via Stripe or MercadoPago. Payment webhooks handle lifecycle events. Customers can view/manage subscriptions.

### Database

**Migration 00009_create_subscriptions.sql**:
- `subscriptions` table (as in PLAN.md)
- `update_updated_at` trigger
- Index on `subscriptions.customer_id`, `subscriptions.status`

**Migration 00010_create_payments.sql**:
- `payments` table (as in PLAN.md)
- Index on `payments.customer_id`, `payments.booking_id`, `payments.subscription_id`
- `update_updated_at` trigger

**Migration 00011_rls_subscriptions_payments.sql**:
- Subscriptions RLS: customers see own, admins see all, managers see their location subscriptions
- Payments RLS: customers see own, admins see all

### Backend

- `src/lib/stripe/client.ts` -- server-side Stripe client (using `stripe` package)
- `src/lib/stripe/products.ts` -- helpers to sync wash_packages to Stripe Products/Prices (create if not exists, cache `stripe_product_id` and `stripe_price_id` in `wash_packages` metadata or app_settings)
- `src/lib/mercadopago/client.ts` -- MercadoPago SDK client setup
- `src/lib/mercadopago/preapproval.ts` -- create MercadoPago recurring preapproval
- `src/app/api/webhooks/stripe/route.ts` -- Stripe webhook handler (Next.js route handler):
  - `customer.subscription.created` -> insert/update subscription row
  - `customer.subscription.updated` -> update status, period dates
  - `customer.subscription.deleted` -> set status cancelled
  - `invoice.payment_succeeded` -> insert payment row, update subscription period
  - `invoice.payment_failed` -> insert failed payment, set subscription to `past_due`
  - `payment_intent.succeeded` -> update payment row status
- `src/app/api/webhooks/mercadopago/route.ts` -- MercadoPago IPN webhook handler:
  - `payment.created`/`payment.updated` -> insert/update payment row
  - `subscription_preapproval.updated` -> update subscription status
- Update `types/database.ts` with subscriptions, payments table types

### Frontend

- **Subscribe page**: `(customer)/subscribe/[packageId]/page.tsx` -- multi-step checkout:
  1. Select car (from user's cars)
  2. Select location (from car's location or choose)
  3. Set schedule preferences (preferred_days checkboxes, preferred_time_start/end)
  4. Select payment method (Stripe card, MercadoPago card, OXXO, SPEI, cash)
  5. Payment: redirect to Stripe Checkout or MercadoPago Checkout Pro, or mark as cash
  6. Success/failure handling with redirect back
- **Components**: `components/booking/time-slot-picker.tsx` (day-of-week multi-select + time range), `components/booking/service-selector.tsx`
- **My subscriptions page**: `(customer)/subscriptions/page.tsx` -- list active subscriptions with package name, car, location, status badge, next billing date, preferred schedule. Actions: pause, cancel, update preferences.
- **Subscription actions**:
  - Pause: sets `paused_at`, calls Stripe/MP to pause
  - Resume: clears pause, calls Stripe/MP to resume
  - Cancel: sets `cancel_at_period_end = true`, calls Stripe/MP
  - Update preferences: update `preferred_days`, `preferred_time_start/end`
- **Payments page**: `(customer)/payments/page.tsx` -- payment history table (date, amount, status, type, payment_method badge). Filter by date range.
- **Admin subscriptions page**: `(admin)/admin/subscriptions/page.tsx` -- all subscriptions table with customer name, car, package, location, status, payment_provider. Filter by status, location.
- Update customer dashboard: show active subscription status, next billing date
- Update package detail page: enable subscribe CTA, link to `/subscribe/[packageId]`

### Integration

- Subscribe flow creates Stripe Subscription or MercadoPago Preapproval, stores `external_subscription_id` in subscriptions table
- Webhooks keep subscription/payment status in sync
- Supabase Realtime not needed yet (polling or page refresh)

### Test

- Customer subscribes to a package via Stripe (test mode), verify subscription row created with status `active`
- Stripe webhook fires `invoice.payment_succeeded`, verify payment row created
- Customer pauses subscription, verify status changes to `paused`
- Customer cancels, verify `cancel_at_period_end = true`
- Simulate payment failure webhook, verify status becomes `past_due`
- Customer views payment history, sees correct entries
- Admin sees all subscriptions across locations
- RLS: Customer A cannot see Customer B's subscription or payments

---

## Slice 3: Bookings + Scheduling Engine

**Goal**: Active subscriptions generate daily bookings. Scheduling engine assigns washers. Admin/Manager can view and adjust schedule. Customers see upcoming washes.

### Database

**Migration 00012_create_bookings.sql**:
- `bookings` table (as in PLAN.md, with all indexes)
- `custom_wash_templates` table
- `waitlist` table
- `update_updated_at` triggers

**Migration 00013_create_washer_profiles.sql**:
- `washer_profiles` table
- `washer_availability` table
- `update_updated_at` trigger on washer_profiles

**Migration 00014_rls_bookings.sql**:
- Bookings RLS: customers see own, washers see assigned, admins see all, managers see location bookings
- Custom_wash_templates RLS: customers see/manage own
- Waitlist RLS: customers see own, admins see all
- Washer_profiles RLS: washer sees own, admins/managers see their location washers
- Washer_availability RLS: washer manages own, admins/managers can read

### Backend

- `src/lib/scheduling/fair-scheduler.ts` -- scheduling engine:
  - `generateDailySchedule(location_id, date)`: query active subscriptions for location, create bookings for each subscription based on frequency and preferred days, calculate priority scores, assign washers
  - `calculatePriorityScore(booking)`: implement the algorithm from PLAN.md Section 7.2
  - `assignWasher(booking, available_washers)`: implement assignment scoring from Section 7.4
- `src/lib/scheduling/priority-calculator.ts` -- priority score calculation extracted
- `src/lib/scheduling/capacity-manager.ts` -- check capacity, handle overflow to waitlist
- `supabase/functions/scheduling-engine/index.ts` -- Edge Function that calls the scheduling logic (can be triggered by cron or manually)
- `src/app/api/scheduling/generate/route.ts` -- Next.js API route to trigger schedule generation (admin only)
- Update `types/database.ts` with bookings, custom_wash_templates, waitlist, washer_profiles, washer_availability

### Frontend

- **Customer upcoming washes**: Update `(customer)/dashboard/page.tsx` -- query upcoming bookings (status in pending/confirmed/washer_en_route/in_progress), show next wash card with date, time, car, status badge
- **Customer bookings list**: `(customer)/bookings/page.tsx` -- list all bookings with date, car, status, services. Tabs: Upcoming / History.
- **Customer booking detail**: `(customer)/bookings/[id]/page.tsx` -- full booking detail: scheduled date/time, car info, assigned washer name, status timeline, services list, price breakdown. Cancel button (if >2hrs before).
- **Customer wash templates**: `(customer)/templates/page.tsx` -- CRUD saved wash combinations
- **Washer queue (real data)**: Update `(washer)/washer/queue/page.tsx` -- fetch today's bookings assigned to current washer, ordered by queue_position. Each card: car plate/make/model/color, parking_spot, location, scheduled time, services, customer notes, status badge. Tap to navigate to booking detail.
- **Washer booking detail**: `(washer)/washer/bookings/[id]/page.tsx` -- car details, customer notes, location with parking instructions, services list, "Start Wash" button.
- **Washer availability**: `(washer)/washer/availability/page.tsx` -- calendar view of next 2 weeks, can mark dates as unavailable with reason
- **Components**: `components/booking/booking-card.tsx`, `components/booking/booking-status.tsx` (status badge with color per PLAN.md design), `components/scheduling/queue-list.tsx`
- **Manager dashboard**: `(manager)/manager/dashboard/page.tsx` -- today's stats: total bookings, completed, pending, no-shows. Capacity bar.
- **Manager schedule view**: `(manager)/manager/schedule/page.tsx` -- daily schedule table: all bookings for the day at their location. Filter by status, washer. Ability to reassign washer (dropdown of available washers).
- **Manager staff page**: `(manager)/manager/staff/page.tsx` -- list washers at their location with availability status, today's load, avg rating.
- **Admin staff page**: `(admin)/admin/staff/page.tsx` -- all staff across locations. Create washer profile (select user, set hourly_rate, skills, assign to location). Cross-location assignment.
- **Admin schedule trigger**: Button on admin dashboard to manually trigger daily schedule generation for a location

### Integration

- Schedule generation reads `subscriptions` where `status = 'active'`, checks `preferred_days` against target date's day_of_week, creates bookings
- Washer assignment considers `washer_profiles` skills, `washer_availability`, current day load from existing bookings
- Cron: Supabase cron or external cron calls the scheduling Edge Function daily at 5:00 AM for each active location

### Test

- Create a subscription, run schedule generation, verify booking created for correct date
- Verify priority score: overdue subscriber gets higher priority than fresh one
- Verify washer assignment: washer with fewer bookings today gets assigned
- Customer sees upcoming wash on dashboard
- Washer sees assigned cars in queue
- Manager views daily schedule, reassigns a washer
- Customer cancels a booking, verify status changes
- Washer marks unavailable for a date, verify not assigned
- Waitlist: when capacity is full, next booking goes to waitlist

---

## Slice 4: Wash Execution (Sessions, Evidence Photos, Damage Reports)

**Goal**: Washers can execute the full wash workflow: start wash, pre-wash photos, damage documentation, complete wash, post-wash photos. Customers see evidence and get real-time status updates.

### Database

**Migration 00015_create_wash_sessions.sql**:
- `wash_sessions` table
- `evidence_photos` table
- `damage_reports` table
- `update_updated_at` trigger on wash_sessions

**Migration 00016_rls_wash_sessions.sql**:
- Wash_sessions RLS: washer sees own sessions, customers see sessions for their bookings, admins/managers see location sessions
- Evidence_photos RLS: washer uploads for own sessions, customers view their booking photos, admins/managers view all
- Damage_reports RLS: washer creates for own sessions, customers view own booking reports, admins/managers view all

### Backend

- Supabase Storage buckets:
  - `evidence-photos` bucket with policies: washers upload to `evidence-photos/{wash_session_id}/*`, customers read their booking photos, admins/managers read all
- Update `types/database.ts` with wash_sessions, evidence_photos, damage_reports

### Frontend

- **Washer start wash page**: `(washer)/washer/wash/[bookingId]/start/page.tsx`:
  1. Show car details, parking spot, customer notes
  2. Pre-wash photo capture (mandatory, minimum 4 photos: front, back, left, right). Use device camera via `<input type="file" capture="environment">`
  3. Damage documentation: for each pre-existing damage found, tap "Report Damage" -> describe, select severity, select location_on_car, attach photo from pre-wash set
  4. "Start Wash" button: creates `wash_session` row, updates booking status to `in_progress`, uploads photos to Storage, creates `evidence_photos` rows
- **Washer active wash page**: `(washer)/washer/wash/[sessionId]/page.tsx`:
  - Live timer (started_at to now)
  - Services checklist (from booking.services)
  - "Complete Wash" button navigates to complete page
- **Washer complete wash page**: `(washer)/washer/wash/[sessionId]/complete/page.tsx`:
  1. Post-wash photo capture (mandatory, minimum 4 photos)
  2. Washer notes (optional text)
  3. "Complete" button: uploads post-wash photos, updates wash_session.completed_at, calculates duration_minutes, updates booking status to `completed`
- **Components**: `components/wash/photo-capture.tsx` (camera/gallery picker, thumbnail grid, minimum count enforcement), `components/wash/wash-timer.tsx` (live elapsed time), `components/wash/damage-annotation.tsx` (form for damage reporting)
- **Customer real-time tracking**: `(customer)/bookings/[id]/track/page.tsx`:
  - Status timeline: pending -> confirmed -> washer_en_route -> in_progress -> completed
  - When `in_progress`: show elapsed time, washer name
  - When `completed`: show before/after photo grid, link to survey
  - Uses Supabase Realtime subscription on `bookings` table filtered by booking id
- **Customer booking detail update**: Show evidence photos (pre/post) when available. Show damage reports if any.
- **Hooks**: `src/hooks/use-realtime.ts` (generic Supabase Realtime subscription hook), `src/hooks/use-wash-session.ts` (wash session state management)
- Update washer queue: after completing a wash, auto-navigate to next booking in queue

### Integration

- Booking status transitions: `confirmed` -> `in_progress` (when washer starts) -> `completed` (when washer completes)
- Supabase Realtime: customer's tracking page subscribes to `bookings` table changes for their booking_id
- Evidence photos stored in Supabase Storage, paths stored in `evidence_photos` table

### Test

- Washer starts a wash: verify wash_session created, booking status = `in_progress`
- Washer uploads 4 pre-wash photos: verify evidence_photos rows with `photo_type = 'pre_wash'`
- Washer reports pre-existing damage: verify damage_report row created
- Washer completes wash with post-wash photos: verify wash_session.completed_at set, booking status = `completed`
- Customer sees real-time status change (Realtime)
- Customer views before/after photos on booking detail
- RLS: Customer cannot see another customer's wash photos

---

## Slice 5: Notifications System

**Goal**: In-app notifications and push notification infrastructure. Key events trigger notifications to the right users.

### Database

**Migration 00017_create_notifications.sql**:
- `notifications` table (as in PLAN.md)
- Index on `notifications(user_id, is_read)`

**Migration 00018_rls_notifications.sql**:
- Notifications RLS: users see own notifications, system/admin can insert for any user

### Backend

- `src/lib/notifications/templates.ts` -- notification templates for each event type (title, body, data format) in Spanish and English
- `src/lib/notifications/push.ts` -- Web Push sender (using `web-push` library if added, or Supabase Edge Function)
- `supabase/functions/send-notification/index.ts` -- Edge Function: receives user_id, type, data -> inserts notification row -> sends push if push_token exists
- Notification triggers integrated into existing flows:
  - Booking confirmed (after schedule generation) -> notify customer
  - Wash started (washer starts wash) -> notify customer
  - Wash completed -> notify customer
  - Payment succeeded -> notify customer
  - Payment failed -> notify customer

### Frontend

- **Notification bell**: `components/shared/notification-bell.tsx` -- in Header, shows unread count badge. Subscribes to Supabase Realtime on `notifications` table for current user.
- **Notifications page**: `(customer)/notifications/page.tsx` -- list all notifications, mark as read on tap, grouped by date. Deep-link to relevant page (booking detail, payment, etc.)
- **Push registration**: `src/hooks/use-notifications.ts` -- on login, request push permission, get token, save to `profiles.push_token`
- Update Header component to include notification bell

### Integration

- After booking status changes in Slice 4 flows, call notification creation
- Supabase Realtime subscription on `notifications` table drives the bell badge count
- Push tokens stored in profiles, used by Edge Function to send

### Test

- Wash completed -> customer receives notification (in-app bell shows new count)
- Customer taps notification -> navigates to booking detail
- Customer marks notification as read -> count decrements
- Multiple notifications: verify ordering by created_at DESC

---

## Slice 6: Quality Surveys + Disputes

**Goal**: After a wash is completed, customer receives a survey request. Customer can rate the wash and optionally open a dispute. Admin/Manager can resolve disputes.

### Database

**Migration 00019_create_quality.sql**:
- `quality_surveys` table
- `disputes` table
- Trigger: `update_washer_stats` -- after survey insert, recalculate washer's avg_rating and total_washes in washer_profiles
- `update_updated_at` trigger on disputes

**Migration 00020_rls_quality.sql**:
- Quality_surveys RLS: customers can insert for own bookings, customers read own, washers read surveys about them, admins/managers read all
- Disputes RLS: customers can insert for own bookings, customers read own, admins/managers read and update all

### Backend

- Survey reminder: 30 minutes after wash completion, send notification to customer with link to survey page
- Edge Function or cron: `supabase/functions/send-notification/` extended to handle survey_request type
- Update `types/database.ts` with quality_surveys, disputes

### Frontend

- **Customer survey page**: `(customer)/survey/[bookingId]/page.tsx`:
  - Before/after photo comparison (side by side)
  - Star ratings: overall (required), cleanliness, timeliness, communication (optional)
  - Comments text area
  - "Would you recommend?" yes/no
  - Submit -> insert quality_survey row
  - Link: "Something wrong? Open a dispute"
- **Components**: `components/shared/rating-stars.tsx` (interactive star rating input)
- **Customer dispute creation**: From survey page or booking detail, button to open dispute. Form: subject, description, optional photo references. Insert into disputes table.
- **Admin disputes page**: `(admin)/admin/disputes/page.tsx` -- table of all disputes. Columns: date, customer, booking, subject, status badge, assigned to. Click to open detail.
- **Admin dispute detail** (dialog or page): view dispute description, linked pre/post wash photos, resolution notes text area, resolution action (resolve for customer with optional refund amount, or resolve for business), mark resolved.
- **Manager disputes page**: `(manager)/manager/disputes/page.tsx` -- same as admin but filtered to their location
- **Washer performance page**: `(washer)/washer/performance/page.tsx` -- show washer's stats from washer_profiles (avg_rating, total_washes, avg_wash_duration). Recent survey ratings list.
- Update washer queue card: show washer's current avg_rating

### Integration

- Survey submission triggers `update_washer_stats` trigger in DB
- Dispute resolution can trigger a refund (defer actual refund API call to payment provider integration, for now just record in payments table with status `refunded`)
- Audit log entry on dispute resolution (defer audit_log table to Slice 11)

### Test

- Complete a wash, receive survey notification after 30 min, submit survey, verify row created
- Verify washer_profiles.avg_rating updated via trigger
- Open a dispute, admin resolves it, verify status updates
- Washer sees their performance stats

---

## Slice 7: Messaging + Upsells

**Goal**: In-app real-time chat between washer and customer during an active wash. Washer can send upsell offers with photo evidence, customer can accept/decline.

### Database

**Migration 00021_create_messages.sql**:
- `messages` table with indexes
- `upsell_offers` table

**Migration 00022_rls_messages.sql**:
- Messages RLS: users see messages where they are sender or receiver, users insert where they are sender
- Upsell_offers RLS: washers can insert for their active sessions, customers can read and update (accept/decline) their own, admins see all

### Backend

- Update `types/database.ts` with messages, upsell_offers
- Upsell acceptance: when customer accepts upsell -> update upsell_offers.status to `accepted`, create a payment record (for one-time upsell payment), add service to wash session

### Frontend

- **Customer chat page**: `(customer)/bookings/[id]/chat/page.tsx`:
  - Message list with bubbles (sender on right, receiver on left)
  - Text input with send button
  - Upsell offer card inline in chat (service name, price, photo, accept/decline buttons)
  - Supabase Realtime subscription on `messages` table filtered by booking_id
- **Washer chat page**: `(washer)/washer/chat/[bookingId]/page.tsx`:
  - Same chat UI as customer
  - "Send Upsell Offer" button -> opens upsell form
- **Washer upsell page**: `(washer)/washer/upsell/[bookingId]/page.tsx`:
  - Select service from service_catalog (add-ons only)
  - Take photo showing the issue (e.g., foggy headlights)
  - Write message explaining the recommendation
  - Price auto-filled from service catalog
  - "Send Offer" -> creates upsell_offer row + message with type `upsell_offer`
- **Components**: `components/chat/chat-window.tsx`, `components/chat/message-bubble.tsx`, `components/chat/upsell-card.tsx`
- **Hooks**: `src/hooks/use-chat.ts` -- manages message list with Realtime subscription

### Integration

- Messages are inserted via Supabase client (RLS handles authorization)
- Supabase Realtime on `messages` table provides live chat
- Upsell acceptance creates payment row and triggers notification to washer

### Test

- During active wash, customer and washer can send messages in real-time
- Washer sends upsell offer, customer sees it as special card in chat
- Customer accepts upsell, verify upsell_offers.status = `accepted`, payment row created
- Customer declines upsell, verify status = `declined`
- RLS: users can only see messages for their own bookings

---

## Slice 8: One-Time Bookings + Emergency Washes + Waitlist

**Goal**: Customers can book one-time washes (not subscription-based), request emergency/immediate washes with premium pricing, and join waitlist when capacity is full.

### Backend

- `src/lib/cost/calculator.ts` -- price calculation for one-time bookings:
  - Sum base prices of selected services from service_catalog
  - Apply premium fees (emergency, time-slot, one-time surcharge) from premium_fees table
  - Apply multi-car discount if applicable
  - Return breakdown: base_price, premium_fees, discount_amount, total_price
- Waitlist processing: `src/lib/scheduling/capacity-manager.ts` updated -- check if slots available, if not, offer waitlist. Cron function to process waitlist every 15 minutes.

### Frontend

- **One-time booking page**: `(customer)/book/page.tsx`:
  1. Select car
  2. Select location
  3. Select services (multi-select from service_catalog, categorized: wash / add-on / detailing)
  4. Select date (calendar picker, showing available dates)
  5. Select time slot (showing remaining capacity per slot)
  6. Price breakdown display (base + premiums - discounts = total)
  7. Select payment method
  8. Confirm -> create booking with `is_one_time = true` + process payment
  9. If no slots: "Join waitlist" option
- **Emergency wash page**: `(customer)/book/emergency/page.tsx`:
  - Streamlined: select car, select location, confirm premium pricing
  - Creates booking with `is_emergency = true`, `is_one_time = true`
  - Priority score boosted to top of queue
  - Payment upfront required
- **Location availability endpoint**: Server action or API route `GET /api/locations/[id]/availability?date=YYYY-MM-DD` -- returns available time slots with remaining capacity
- **Waitlist**: When customer joins waitlist, show confirmation with position. When slot opens (via cron processing), send notification with 30-min expiry to book.
- **Customer booking history update**: Tab in bookings page showing past one-time bookings alongside subscription bookings
- Update customer dashboard: show one-time booking quick action button

### Integration

- One-time bookings follow same execution flow as subscription bookings (Slice 4)
- Emergency bookings trigger washer rebalance if needed
- Waitlist cron checks for cancellations and freed capacity

### Test

- Customer books one-time wash, verify booking created with `is_one_time = true`, payment processed
- Emergency wash: verify premium fee applied, booking gets highest priority
- Full capacity: customer tries to book, offered waitlist option
- Slot opens: waitlisted customer notified, books successfully
- Price breakdown: verify correct calculation with multiple services + premiums

---

## Slice 9: Inventory Management + Cost Tracking

**Goal**: Admin/Manager can manage inventory, washer logs material usage per wash, system calculates per-wash cost and profitability.

### Database

**Migration 00023_create_inventory.sql**:
- `inventory_items` table
- `inventory_stock` table
- `inventory_transactions` table
- `service_material_requirements` table
- Trigger: `update_inventory_stock` -- after inventory_transactions insert, update inventory_stock quantity, check low stock alert
- `update_updated_at` triggers

**Migration 00024_create_costs.sql**:
- `cost_records` table

**Migration 00025_rls_inventory_costs.sql**:
- Inventory_items RLS: all authenticated can read, admins can CRUD
- Inventory_stock RLS: managers can read their location, admins see all
- Inventory_transactions RLS: washers can insert for their sessions, managers/admins see their location
- Service_material_requirements RLS: admins can CRUD, all authenticated can read
- Cost_records RLS: admins see all, managers see their location

### Backend

- `src/lib/cost/calculator.ts` -- extended with full cost calculation:
  - `calculateWashCost(wash_session_id)`: implements PLAN.md Section 8.2 algorithm
  - Called automatically on wash completion (extend Slice 4 complete flow)
  - Inserts into `cost_records` table
- `supabase/functions/cost-calculator/index.ts` -- Edge Function version for batch processing
- Update `types/database.ts` with all inventory + cost tables

### Frontend

- **Admin inventory items page**: `(admin)/admin/inventory/page.tsx`:
  - CRUD table: name, SKU, category, unit, unit_cost, supplier, reorder_point, is_active
  - Sub-section: stock levels per location (from inventory_stock)
  - Low stock alerts highlighted in red
  - "Restock" action: form (quantity, location, notes) -> creates inventory_transaction with type `restock`
  - "Transfer" action: form (from_location, to_location, quantity) -> creates two transactions (negative from source, positive to destination)
- **Manager inventory page**: `(manager)/manager/inventory/page.tsx`:
  - Stock levels at their location only
  - Restock request action
  - Low stock alerts
- **Washer material logging**: Update active wash page (`(washer)/washer/wash/[sessionId]/page.tsx`):
  - "Log Materials" section: select material from inventory_items, enter quantity used
  - On wash complete, material usage creates inventory_transactions rows
- **Components**: `components/inventory/stock-table.tsx`, `components/inventory/restock-form.tsx`, `components/inventory/low-stock-alert.tsx`, `components/wash/material-logger.tsx`
- **Admin cost analytics**: `(admin)/admin/analytics/costs/page.tsx`:
  - Per-wash profitability table: booking, revenue, labor_cost, material_cost, overhead_cost, total_cost, profit, margin_pct
  - Aggregate charts: profit by location, profit by package, trend over time
  - Average margin per location
- **Admin service material requirements**: On admin services page, add sub-section to define required materials per service (service_material_requirements CRUD)

### Integration

- On wash completion (Slice 4 flow), after setting wash_session.completed_at:
  1. Create inventory_transactions for each material used (auto from service_material_requirements + manual from washer logging)
  2. Call cost calculator to create cost_record
- Low stock trigger creates notification for location managers (via notifications system from Slice 5)

### Test

- Admin creates inventory items, sets reorder points
- Admin restocks a location, verify stock quantity increases
- Washer completes wash, material usage recorded, stock decremented
- Low stock alert fires when quantity drops below reorder_point
- Cost record created on wash completion with correct labor + material + overhead
- Admin views cost analytics, sees profitability per wash
- Transfer between locations: source decreases, destination increases

---

## Slice 10: Analytics + Reporting + Exports

**Goal**: Full business intelligence dashboards for admin. Revenue, customer, washer, location analytics. CSV/Excel export.

### Database

**Migration 00026_create_views.sql**:
- `washer_daily_schedule` view
- `location_daily_summary` view
- `customer_ltv` view

### Backend

- `src/app/api/analytics/revenue/route.ts` -- revenue analytics: total revenue, by location, by plan, by date range, growth %
- `src/app/api/analytics/customers/route.ts` -- customer analytics: new signups, churn rate, retention, LTV, NPS/satisfaction
- `src/app/api/analytics/washers/route.ts` -- washer analytics: performance comparison, efficiency, rating
- `src/app/api/analytics/locations/route.ts` -- location analytics: capacity utilization, profitability, booking count
- `src/app/api/exports/route.ts` -- CSV/Excel export generation (using a library like `xlsx` or `papaparse`):
  - Accept: report_type, date_range, location_id, format (csv/xlsx)
  - Generate file, return download URL or stream
- `supabase/functions/analytics-aggregator/index.ts` -- Edge Function to precompute weekly analytics (called by Monday 8 AM cron)

### Frontend

- **Admin revenue analytics**: `(admin)/admin/analytics/revenue/page.tsx`:
  - KPI cards: total revenue (this month vs last), total washes, avg revenue per wash, subscription revenue vs one-time
  - Charts (using a chart library like Recharts or Chart.js): revenue trend line (daily/weekly/monthly), revenue by location bar chart, revenue by package pie chart
  - Date range filter
  - Export button (CSV/Excel)
- **Admin customer analytics**: `(admin)/admin/analytics/customers/page.tsx`:
  - KPI cards: total customers, new this month, churn rate, avg LTV
  - Charts: customer growth trend, churn trend, satisfaction (avg survey rating)
  - Customer table with LTV, subscription status, last booking date
- **Admin washer analytics**: `(admin)/admin/analytics/washers/page.tsx`:
  - Performance comparison table: washer name, total washes, avg rating, avg duration, material efficiency
  - Bar chart: washes per washer
  - Rating distribution
- **Admin location analytics** (part of admin dashboard update):
  - Per-location cards: bookings today, capacity utilization %, revenue this month, profitability
  - Comparison table across locations
- **Admin dashboard update**: Replace hardcoded zeros with real KPI queries:
  - Active locations count
  - Total customers
  - Washes today / this week
  - Monthly revenue
  - Satisfaction rate (avg survey rating)
- **Admin exports page**: `(admin)/admin/exports/page.tsx`:
  - Report type selector (Revenue, Customers, Washers, Inventory, Cost/Profitability)
  - Date range picker
  - Location filter
  - Format selector (CSV / Excel)
  - Generate + Download button
- **Components**: `components/analytics/revenue-chart.tsx`, `components/analytics/kpi-card.tsx`, `components/analytics/performance-table.tsx`, `components/analytics/trend-chart.tsx`
- **Manager reports page**: `(manager)/manager/reports/page.tsx` -- location-level versions of revenue + washer + customer analytics, scoped to their location
- **Manager customers page**: `(manager)/manager/customers/page.tsx` -- customer list at their location with subscription status, car info, last wash date

### Integration

- Analytics queries use SQL views + aggregations via Supabase client
- Export generates files server-side, returns as download
- Weekly cron precomputes expensive aggregations

### Test

- Admin dashboard shows real counts from database
- Revenue chart displays correct data for selected date range
- Customer analytics shows correct churn calculation
- Washer comparison table matches survey data
- CSV export downloads and contains correct data
- Manager sees only their location's data

---

## Slice 11: Residential Model (Daily Offers)

**Goal**: Implement the residential building model with daily offers, threshold-based dispatch, and social proof UI.

### Database

**Migration 00027_create_daily_offers.sql**:
- `daily_offers` table
- `daily_offer_responses` table
- Trigger: `update_offer_response_count` -- after daily_offer_responses insert/update, recalculate current_responses and threshold_met

**Migration 00028_rls_daily_offers.sql**:
- Daily_offers RLS: customers at the offer's location can read active offers, managers/admins can CRUD
- Daily_offer_responses RLS: customers can insert/read own responses, managers/admins can read all

### Backend

- `supabase/functions/daily-offer-dispatch/index.ts` -- Edge Function: when threshold_met becomes true, auto-create bookings for all accepted responses, assign washers
- Cron: daily at 6:00 AM, `sendDailyOffers` -- for each residential location with auto-offer configured, create a daily_offer row and send notifications to all customers at that location
- Offer expiration: cron or check at read time -- if `expires_at < now()` and `threshold_met = false`, mark offer as expired, notify customers
- Update `types/database.ts` with daily_offers, daily_offer_responses

### Frontend

- **Customer daily offers page**: `(customer)/offers/page.tsx`:
  - List active offers for customer's residential location(s)
  - Each offer card: location name, offer message, discount %, expiry countdown timer
  - Social proof: "X de tus vecinos ya se apuntaron!" (X of your neighbors already signed up!)
  - Progress bar: current_responses / min_cars_threshold
  - "Me apunto!" (I'm in!) button -> select car, accept. One tap if only one car.
  - After threshold met: "Equipo en camino!" (Team on the way!) status
- **Offer response flow**: Customer taps accept -> creates daily_offer_response with status `accepted` -> realtime updates response count for all viewers
- **Supabase Realtime**: Subscribe to `daily_offer_responses` for the offer_id to live-update the counter
- **Manager offers page**: `(manager)/manager/offers/page.tsx`:
  - Create daily offer: select location, write message, select packages offered, set discount %, set minimum threshold, set expiry time
  - View active/past offers with response counts
  - Manual dispatch button (override threshold)
- **Admin offers management**: Part of location detail -- configure auto-offer settings (min_cars_threshold, offer_expiry_minutes, auto-offer schedule)
- **Residential customer dashboard variant**: In customer dashboard, detect if user's car is at a residential location. If so, show active offers prominently instead of subscription-focused content. Branching logic: `locations.location_type === 'residential_building'` -> show offers section; `office_building` -> show subscription section.
- **Referral landing page**: `(auth)/r/[code]/page.tsx` -- public referral link landing page. Shows referrer name, referral benefit, CTA to sign up.

### Integration

- When threshold met (via trigger), Edge Function auto-generates bookings from accepted responses
- These bookings follow the same wash execution flow (Slice 4)
- Notifications: offer created -> all location customers; threshold met -> accepted customers; offer expired without threshold -> all respondents

### Test

- Manager creates daily offer for residential location
- Customer at that location sees offer, accepts
- Counter updates in real-time for other customers viewing the offer
- When threshold met (e.g., 5 acceptances), bookings auto-created
- Washer sees these bookings in queue
- Offer expires without threshold -> responses cancelled, customers notified
- Office building customers do NOT see the offers section

---

## Slice 12: Loyalty + Referrals + Corporate

**Goal**: Growth features -- referral program, loyalty points, and corporate bulk accounts.

### Database

**Migration 00029_create_referrals_loyalty.sql**:
- `referrals` table
- `loyalty_points` table
- `loyalty_transactions` table

**Migration 00030_create_corporate.sql**:
- `corporate_accounts` table
- `corporate_account_members` table
- `update_updated_at` triggers

**Migration 00031_rls_growth.sql**:
- Referrals RLS: users see referrals where they are referrer or referred, system can insert
- Loyalty_points RLS: customers read own, system updates
- Loyalty_transactions RLS: customers read own, system inserts
- Corporate_accounts RLS: admins CRUD, corporate contact can read own
- Corporate_account_members RLS: admins CRUD, members can read own membership

### Backend

- Referral code generation: on profile creation, generate unique referral_code (e.g., `MW-{first3letters}{random4digits}`)
- Referral processing: when new user signs up with referral code -> create referrals row with `reward_granted = false`. After referred user completes first paid wash -> set `reward_granted = true`, create loyalty_transactions for both referrer and referred (configurable reward from app_settings)
- Loyalty points: on wash completed -> award points based on package tier (from app_settings). On survey submitted -> bonus points. On referral reward -> points.
- Loyalty redemption: customer redeems points for free wash or discount. Create negative loyalty_transaction, create booking with `discount_amount` or `payment_type = 'loyalty_redemption'`.
- Corporate discount: when corporate member books, check `corporate_accounts.discount_pct`, apply to booking price.
- Update `types/database.ts` with all growth tables

### Frontend

- **Customer loyalty page**: `(customer)/loyalty/page.tsx`:
  - Points balance (large number)
  - Lifetime points earned
  - Recent transactions list (earned/redeemed with reason)
  - Rewards catalog: what can be redeemed (free basic wash = X points, free premium wash = Y points, etc.)
  - "Redeem" button for each reward
- **Referral section** (on profile or loyalty page):
  - Show referral code with copy button
  - Share link: `mywash.mx/r/{code}` with share button (native share API)
  - Referral stats: X friends referred, Y rewards earned
- **Admin corporate page**: `(admin)/admin/corporate/page.tsx`:
  - CRUD table: company name, contact, location, discount_pct, max_cars, contract dates, is_active
  - Members sub-section: list members, add member (search by email), remove member
- **Admin customers page**: `(admin)/admin/customers/page.tsx`:
  - All customers table: name, email, role, location, subscription status, total spent (LTV), loyalty points, referral count, corporate membership badge
  - Filter by location, subscription status, corporate
  - Click to view customer detail
- Update subscribe flow: if customer is corporate member, show discounted price with "Corporate discount" label
- Update register flow: accept referral_code query param (from referral landing page), apply on signup

### Integration

- Loyalty points awarded via database function or server-side logic after wash completion
- Referral reward granted after first paid wash (check in payment webhook or wash completion flow)
- Corporate discount applied at booking price calculation time

### Test

- New user signs up with referral code, verify referrals row created
- Referred user completes first wash, verify rewards granted to both parties
- Customer earns loyalty points on wash completion
- Customer redeems points for free wash, verify negative transaction + booking created
- Corporate member books, verify discount applied
- Admin manages corporate accounts and members

---

## Slice 13: Audit Log + Admin Settings + Multi-Location Scaling

**Goal**: System audit trail, global app settings management, cross-location staff pooling, and add-a-location wizard.

### Database

**Migration 00032_create_audit_log.sql**:
- `audit_log` table with indexes

**Migration 00033_rls_audit.sql**:
- Audit_log RLS: admins can read all, system can insert

### Backend

- Audit log insertion: create utility `src/lib/utils/audit.ts` with `logAudit(user_id, action, entity_type, entity_id, old_data, new_data)`. Call this from key operations:
  - Subscription created/updated/cancelled
  - Booking created/cancelled
  - Payment processed/refunded
  - Dispute resolved
  - Location created/updated
  - Staff assigned/removed
- Cross-location staff: extend scheduling engine to consider washers from other locations when primary location is short-staffed

### Frontend

- **Admin settings page**: `(admin)/admin/settings/page.tsx`:
  - Global settings from `app_settings` table: overhead_per_wash, overhead_pct, late_cancellation_minutes, max_emergency_per_day, loyalty_points_per_wash, referral_reward_points, survey_reminder_delay_minutes, waitlist_expiry_minutes
  - Per-location overrides
  - Form with save button, reads/writes to app_settings
- **Admin audit log page**: `(admin)/admin/audit/page.tsx`:
  - Table: timestamp, user (name/email), action, entity_type, entity_id
  - Filter by date range, user, action type, entity type
  - Click row to see old_data vs new_data diff
  - Pagination for large datasets
- **Add-a-location wizard** (enhancement to admin locations):
  - Step 1: Basic info (name, address, type)
  - Step 2: Operating hours (7-day form)
  - Step 3: Capacity + parking/access instructions
  - Step 4: Assign staff (select existing washers/managers, or invite new)
  - Step 5: Configure pricing (select which packages are offered, set location overrides)
  - Step 6: Review + create
- **Cross-location staff management**: On admin staff page, show which locations each washer can work at. "Assign to additional location" action. On scheduling, display cross-location availability.
- **Multi-location admin dashboard**: Update admin dashboard with location comparison table: side-by-side metrics per location (bookings, revenue, satisfaction, capacity utilization)

### Integration

- Audit log writes are fire-and-forget (should not block main operations)
- App_settings queried at startup for global config, cached in memory with TTL

### Test

- Admin changes a setting, verify app_settings row updated
- Booking created, verify audit_log entry with correct action/entity
- Dispute resolved, verify audit_log entry
- Admin views audit log, filters by entity type, sees correct entries
- Add-a-location wizard creates location with hours, staff, pricing in one flow
- Staff pooling: location A has a surplus washer, location B is short -- washer assigned to B

---

## Slice 14: Polish, PWA, i18n, Offline Support

**Goal**: Production-readiness features: PWA setup, internationalization, offline washer support, performance optimization, error handling.

### Frontend

- **PWA**: `public/manifest.json` (app name, icons, theme_color, start_url), service worker registration in root layout, offline fallback page
- **i18n**: Configure `next-intl` with Spanish (default) and English. Create message files for all UI strings. Wrap all hardcoded Spanish strings in translation functions. Language switcher on profile page tied to `profiles.preferred_language`.
- **Offline washer support**:
  - Service worker caches washer queue page + essential assets
  - Photo capture stores images in IndexedDB when offline
  - Status updates queued in IndexedDB, synced on reconnect
  - Visual indicator in washer UI: "Sin conexion -- los cambios se sincronizaran" (Offline -- changes will sync)
- **Error boundaries**: `components/shared/error-boundary.tsx` -- catch and display user-friendly errors. Wrap each layout.
- **Loading states**: `components/shared/loading.tsx` -- skeleton screens for all data-fetching pages. Use Suspense boundaries.
- **Image optimization**: Use Next.js `<Image>` for all photos. Configure Supabase Storage transforms for thumbnails.
- **Performance**: Lazy load heavy components (charts, photo grids). Implement pagination on all list pages. Add `loading.tsx` files in page directories.
- **Accessibility**: aria labels on all interactive elements, keyboard navigation for forms, color contrast check
- **Sentry integration**: Install `@sentry/nextjs`, configure in `next.config.ts`, add error tracking to error boundaries

### Backend

- Rate limiting on API routes (especially auth, webhooks, payment endpoints)
- Input validation: Zod schemas for all form submissions and API inputs
- Security review: ensure all RLS policies are comprehensive, no data leaks between tenants

### Test

- PWA: install on mobile, verify app icon + splash screen
- Offline: washer loads queue while online, goes offline, can still view queue + take photos
- Reconnect: queued photos upload successfully
- i18n: switch to English, verify all strings change
- Error: simulate API failure, verify error boundary catches and displays message
- Loading: verify skeleton screens show while data loads

---

## Summary: Slice-to-Table Mapping

Every table from PLAN.md mapped to exactly one slice:

| Table | Slice |
|---|---|
| profiles | 0 |
| locations | 0 |
| location_operating_hours | 0 |
| location_special_hours | 0 |
| location_staff | 0 |
| app_settings | 0 |
| cars | 1 |
| service_catalog | 1 |
| wash_packages | 1 |
| package_location_pricing | 1 |
| premium_fees | 1 |
| subscriptions | 2 |
| payments | 2 |
| bookings | 3 |
| custom_wash_templates | 3 |
| waitlist | 3 |
| washer_profiles | 3 |
| washer_availability | 3 |
| wash_sessions | 4 |
| evidence_photos | 4 |
| damage_reports | 4 |
| notifications | 5 |
| quality_surveys | 6 |
| disputes | 6 |
| messages | 7 |
| upsell_offers | 7 |
| inventory_items | 9 |
| inventory_stock | 9 |
| inventory_transactions | 9 |
| service_material_requirements | 9 |
| cost_records | 9 |
| daily_offers | 11 |
| daily_offer_responses | 11 |
| referrals | 12 |
| loyalty_points | 12 |
| loyalty_transactions | 12 |
| corporate_accounts | 12 |
| corporate_account_members | 12 |
| audit_log | 13 |

## Summary: Slice-to-Page Mapping

Every page from PLAN.md Section 5 mapped to exactly one slice:

| Page | Route | Slice |
|---|---|---|
| Landing Page | `/` | Pre-existing |
| Login | `/login` | Pre-existing |
| Register | `/register` | Pre-existing |
| Forgot Password | `/forgot-password` | Pre-existing |
| Referral Landing | `/r/:code` | 11 |
| Dashboard | `/dashboard` | 0 (base), 1 (cars), 2 (subs), 3 (bookings) |
| Profile | `/profile` | 0 |
| My Cars | `/cars` | 1 |
| Add Car | `/cars/new` | 1 |
| Browse Packages | `/packages` | 1 |
| Package Detail | `/packages/:id` | 1 |
| Subscribe | `/subscribe/:packageId` | 2 |
| My Subscriptions | `/subscriptions` | 2 |
| Payments | `/payments` | 2 |
| Bookings (list/history) | `/bookings` | 3 |
| Booking Detail | `/bookings/:id` | 3 |
| Wash Templates | `/templates` | 3 |
| Wash Tracking | `/bookings/:id/track` | 4 |
| Chat (customer) | `/bookings/:id/chat` | 7 |
| Survey | `/survey/:bookingId` | 6 |
| Daily Offers | `/offers` | 11 |
| Loyalty | `/loyalty` | 12 |
| Notifications | `/notifications` | 5 |
| Book One-Time | `/book` | 8 |
| Emergency Wash | `/book/emergency` | 8 |
| Washer Queue | `/washer/queue` | 3 (real data) |
| Washer Booking Detail | `/washer/bookings/:id` | 3 |
| Start Wash | `/washer/wash/:bookingId/start` | 4 |
| Active Wash | `/washer/wash/:sessionId` | 4 |
| Complete Wash | `/washer/wash/:sessionId/complete` | 4 |
| Washer Chat | `/washer/chat/:bookingId` | 7 |
| Washer Upsell | `/washer/upsell/:bookingId` | 7 |
| Washer Performance | `/washer/performance` | 6 |
| Washer Availability | `/washer/availability` | 3 |
| Manager Dashboard | `/manager/dashboard` | 3 |
| Manager Schedule | `/manager/schedule` | 3 |
| Manager Staff | `/manager/staff` | 3 |
| Manager Bookings | `/manager/bookings` | 3 |
| Manager Inventory | `/manager/inventory` | 9 |
| Manager Customers | `/manager/customers` | 10 |
| Manager Offers | `/manager/offers` | 11 |
| Manager Reports | `/manager/reports` | 10 |
| Manager Disputes | `/manager/disputes` | 6 |
| Admin Dashboard | `/admin` | 0 (base), 10 (real data) |
| Admin Locations | `/admin/locations` | 0 |
| Admin Location Detail | `/admin/locations/:id` | 0 |
| Admin Staff | `/admin/staff` | 3 |
| Admin Customers | `/admin/customers` | 12 |
| Admin Services | `/admin/services` | 1 |
| Admin Packages | `/admin/packages` | 1 |
| Admin Fees | `/admin/fees` | 1 |
| Admin Subscriptions | `/admin/subscriptions` | 2 |
| Admin Revenue Analytics | `/admin/analytics/revenue` | 10 |
| Admin Customer Analytics | `/admin/analytics/customers` | 10 |
| Admin Washer Analytics | `/admin/analytics/washers` | 10 |
| Admin Cost Analytics | `/admin/analytics/costs` | 9 |
| Admin Inventory | `/admin/inventory` | 9 |
| Admin Corporate | `/admin/corporate` | 12 |
| Admin Disputes | `/admin/disputes` | 6 |
| Admin Settings | `/admin/settings` | 13 |
| Admin Audit Log | `/admin/audit` | 13 |
| Admin Exports | `/admin/exports` | 10 |

---

### Critical Files for Implementation

- `/Users/jeroenciso/Desktop/carwash/supabase/migrations/` - All database schema migrations must be created first; every slice begins with migrations that are the foundation for all backend and frontend work.
- `/Users/jeroenciso/Desktop/carwash/src/types/database.ts` - TypeScript database types must be extended in every slice to match new tables; currently only has profiles, locations, and cars.
- `/Users/jeroenciso/Desktop/carwash/src/lib/scheduling/fair-scheduler.ts` - Core scheduling algorithm (Slice 3); the most complex business logic, connecting subscriptions to bookings to washer assignment.
- `/Users/jeroenciso/Desktop/carwash/src/app/api/webhooks/stripe/route.ts` - Stripe webhook handler (Slice 2); critical for keeping subscription and payment state in sync.
- `/Users/jeroenciso/Desktop/carwash/src/lib/supabase/middleware.ts` - Auth middleware that gates all protected routes; must be extended if role-based routing is added beyond current session refresh.
