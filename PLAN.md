# PLAN.md — myWash: Carwash Business Application

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Branding & Design System](#2-branding--design-system)
3. [Database Choice & Data Export](#3-database-choice--data-export)
4. [Database Schema](#4-database-schema)
5. [Row Level Security Policies](#5-row-level-security-policies)
6. [API / Edge Functions](#6-api--edge-functions)
7. [Frontend Pages & Screens](#7-frontend-pages--screens)
8. [File Structure](#8-file-structure)
9. [Scheduling Algorithm](#9-scheduling-algorithm)
10. [Cost Calculation Logic](#10-cost-calculation-logic)
11. [Residential vs Office Model Differences](#11-residential-vs-office-model-differences)
12. [Realtime Features](#12-realtime-features)
13. [Edge Cases & Gap Analysis](#13-edge-cases--gap-analysis)
14. [Implementation Phases](#14-implementation-phases)
15. [Third-Party Integrations](#15-third-party-integrations)
16. [Testing Strategy](#16-testing-strategy)
17. [Deployment & DevOps](#17-deployment--devops)

---

## 1. Project Overview

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL 15+, Auth, Storage, Realtime, Edge Functions) |
| Payments | Stripe (Subscriptions, Checkout, Payment Intents, Webhooks) |
| Notifications | Supabase Realtime + Web Push API + Firebase Cloud Messaging (mobile) |
| Storage | Supabase Storage (evidence photos, car photos, profile images) |
| Hosting | Vercel (frontend), Supabase Cloud (backend) |
| Email | Resend or Supabase built-in (transactional emails) |
| Monitoring | Sentry (error tracking), Vercel Analytics |

### Design Principles

- **Mobile-first**: All interfaces designed for phone screens first, then scale up.
- **Configuration over code**: New locations, pricing, services are all data-driven — no code changes needed.
- **Event-sourced state transitions**: Wash sessions move through defined states, each transition is logged.
- **Evidence-first**: Photos are mandatory at pre-wash and post-wash stages. No shortcuts.
- **Multi-tenant by location**: All data is scoped to locations. Users can belong to multiple locations.

---

## 2. Branding & Design System

### 2.1 Brand Name Options

**Brand Name: MyWash**

| Element | Value |
|---|---|
| **Name** | MyWash |
| **Logo style** | **myWash** (camelCase) — the "W" incorporates a subtle water droplet |
| **Domains** | mywash.mx, mywash.app |
| **Tagline (ES)** | *"Tu auto, tu estilo, tu wash."* |
| **Tagline (EN)** | *"Your car, always spotless."* |
| **Tone** | Casual, bilingual (Spanglish), tech-savvy, like Rappi or Kavak |
| **Personality** | Practical, personal, convenient — "my car, my schedule, my way" |

### 2.2 Brand Color Palette

```
Primary Colors:
  Deep Blue      #1B3A5C    — Trust, professionalism, water association
  Electric Cyan  #00D4FF    — Energy, freshness, modern tech feel

Secondary Colors:
  Clean White    #FAFBFC    — Backgrounds, cleanliness
  Slate Gray     #64748B    — Body text, secondary elements
  Soft Silver    #E2E8F0    — Cards, borders, subtle surfaces

Accent Colors:
  Success Green  #22C55E    — Completed washes, positive states
  Warning Amber  #F59E0B    — Pending, attention needed
  Alert Red      #EF4444    — Errors, urgent, damage reports
  Premium Gold   #D4A853    — Premium features, loyalty, upsells

Dark Mode:
  Dark BG        #0F172A    — Main background
  Dark Surface   #1E293B    — Cards, panels
  Dark Border    #334155    — Borders
```

### 2.3 Typography

| Usage | Font | Weight | Why |
|---|---|---|---|
| **Headings** | Inter | 700 (Bold), 600 (Semibold) | Clean, geometric, excellent readability on screens. Free via Google Fonts. |
| **Body text** | Inter | 400 (Regular), 500 (Medium) | Same family for consistency. Optimized for UI. |
| **Numbers/Data** | JetBrains Mono | 500 | Monospace for prices, stats, plate numbers. Adds a tech-forward feel. |
| **Logo/Brand** | Custom wordmark or Satoshi (alt: Clash Display) | 700 | Premium feel for the brand mark. |

### 2.4 Design Principles

1. **Effortless**: Every action should take the minimum possible taps. Subscribe in 3 steps. Book in 1 tap.
2. **Visual evidence**: Photos are front and center. Before/after grids. Full-bleed imagery.
3. **Trust signals**: Ratings visible, damage documentation prominent, real-time tracking with map-like progress.
4. **Status-driven**: Color-coded status badges everywhere. Green = done, Blue = in progress, Yellow = pending, Red = issue.
5. **Mobile-first**: Designed for phones first (washers in parking lots, customers at desks). Desktop is for admin only.
6. **Minimal text, maximum clarity**: Icons + short labels. No walls of text. Progressive disclosure.

### 2.5 UI Component Style

- **Cards**: Rounded corners (12px), subtle shadow, white background
- **Buttons**: Pill-shaped (rounded-full), primary = Deep Blue, secondary = outline
- **Inputs**: Large touch targets (min 48px height), clear labels, inline validation
- **Navigation**: Bottom tab bar (mobile), sidebar (desktop/admin)
- **Animations**: Subtle spring animations on state changes. Progress bars for wash tracking. Confetti on completion (optional).
- **Icons**: Lucide icon set (open source, consistent, works with shadcn/ui)

### 2.6 User Experience Flows

**Customer onboarding (< 2 min):**
1. Open app → Sign up (email or Google)
2. Add your car (plate number + quick photo)
3. Select your building
4. Choose a plan → Pay → Done

**Washer daily flow:**
1. Open app → See today's queue (sorted by time)
2. Tap next car → Navigate to parking spot
3. Take pre-wash photos (mandatory, guided)
4. Tap "Start Wash" → Timer begins
5. Wash → Tap "Complete" → Post-wash photos
6. Next car

---

## 3. Database Choice & Data Export

### 3.1 Why Supabase (PostgreSQL)

| Criteria | Supabase/PostgreSQL | Firebase/Firestore | PlanetScale/MySQL |
|---|---|---|---|
| **Relational data** | Native SQL, JOINs, foreign keys | No JOINs, denormalized | SQL but no FK enforcement |
| **Complex queries** | Full SQL, views, CTEs, window functions | Very limited | Good SQL |
| **Row-Level Security** | Built-in RLS policies | Security rules (less flexible) | No built-in RLS |
| **Realtime** | Built-in Realtime subscriptions | Built-in (excellent) | No built-in |
| **Auth** | Built-in (Supabase Auth) | Built-in (Firebase Auth) | None |
| **File storage** | Built-in (Supabase Storage) | Built-in (Firebase Storage) | None |
| **Edge functions** | Built-in (Deno runtime) | Cloud Functions | None |
| **Cost at scale** | Very competitive ($25/mo pro plan) | Can spike unpredictably | Reasonable |
| **SQL export/BI** | Direct PostgreSQL connection | Manual exports only | Direct MySQL connection |
| **Self-host option** | Yes (open source) | No | No |

**Decision: Supabase (PostgreSQL)** — It gives us everything in one platform: auth, database, storage, realtime, and edge functions. PostgreSQL is the most powerful open-source database, supports the complex scheduling/analytics queries we need, and allows direct SQL connections for BI tools.

### 3.2 Excel & Data Export for CFO/COO

Your CFO and COO need direct access to business data without going through the app. Here's how:

#### Option A: Built-in Export (Day 1)
- **CSV/Excel export buttons** on every admin analytics page
- One-click download of any report as `.xlsx` or `.csv`
- Scheduled email reports (weekly/monthly PDF summaries)

#### Option B: Direct Database Connection (Recommended for power users)
Supabase exposes a standard PostgreSQL connection string. This means:

| Tool | How it connects | Use case |
|---|---|---|
| **Excel (Power Query)** | PostgreSQL ODBC driver → direct connection | CFO pulls live data into Excel workbooks |
| **Google Sheets** | Supabase REST API + Apps Script, or `=IMPORTDATA()` | Shared live dashboards |
| **Metabase** (free, open source) | Direct PostgreSQL connection | Self-service BI dashboards, no code |
| **Looker Studio** (free) | PostgreSQL connector | Google-native dashboards |
| **Tableau** | PostgreSQL connector | Enterprise-grade analytics |

**Recommended setup:**
1. **Metabase** (free, self-hosted or cloud $85/mo) connected directly to Supabase PostgreSQL
2. CFO/COO get their own Metabase login with **read-only** access
3. Pre-built dashboards: Revenue, Costs, Profitability, Customer metrics, Washer performance
4. They can create their own queries/charts without developer help
5. Excel export available from every Metabase chart

#### Option C: Read-Only Replica (Scale)
As the business grows, set up a **read replica** of the database. BI tools connect to the replica, keeping the main database fast. Supabase Pro supports this.

#### Pre-Built Reports for CFO/COO

| Report | Frequency | Key Metrics |
|---|---|---|
| Revenue Summary | Daily/Weekly | Total revenue, by location, by plan type, growth % |
| Cost Analysis | Weekly | Per-wash cost, material costs, labor costs, margin |
| Profitability | Monthly | Profit by location, by package, break-even analysis |
| Customer Metrics | Weekly | New signups, churn rate, LTV, NPS score |
| Washer Performance | Weekly | Washes/day, avg rating, material efficiency, speed |
| Inventory Status | Daily | Stock levels, reorder alerts, cost of goods |
| Cash Flow | Monthly | Income vs expenses, projected vs actual |
| Location Comparison | Monthly | Side-by-side location performance |

---

## 4. Database Schema

### 2.1 Enums

```sql
-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'location_manager', 'car_washer', 'customer');

-- Location types
CREATE TYPE location_type AS ENUM ('office_building', 'residential_building');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'paused', 'cancelled', 'past_due', 'trialing');

-- Booking status
CREATE TYPE booking_status AS ENUM (
  'pending',        -- awaiting confirmation/scheduling
  'confirmed',      -- scheduled
  'washer_en_route', -- washer dispatched
  'in_progress',    -- wash started
  'completed',      -- wash finished
  'cancelled',      -- cancelled by customer or admin
  'no_show',        -- car was not present
  'weather_delayed', -- delayed due to weather
  'rescheduled'     -- moved to another slot
);

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');

-- Wash frequency
CREATE TYPE wash_frequency AS ENUM ('daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly', 'one_time');

-- Inventory transaction type
CREATE TYPE inventory_tx_type AS ENUM ('restock', 'usage', 'adjustment', 'transfer', 'waste');

-- Notification type
CREATE TYPE notification_type AS ENUM (
  'wash_scheduled', 'wash_started', 'wash_completed', 'wash_cancelled',
  'evidence_uploaded', 'upsell_offer', 'survey_request', 'payment_succeeded',
  'payment_failed', 'subscription_renewed', 'low_stock_alert', 'daily_offer',
  'damage_report', 'message_received', 'general'
);

-- Day of week
CREATE TYPE day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');

-- Dispute status
CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_customer', 'resolved_business', 'closed');

-- Offer status (residential model)
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
```

### 2.2 Core Tables

#### `profiles`
Extends Supabase `auth.users`. One row per authenticated user.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_customer_id TEXT,             -- Stripe customer ID
  mercadopago_customer_id TEXT,        -- MercadoPago customer/payer ID
  preferred_payment_method payment_method, -- customer's default payment method
  push_token TEXT,                     -- FCM/Web Push token
  preferred_language TEXT DEFAULT 'es', -- i18n support
  referral_code TEXT UNIQUE,           -- for referral program
  referred_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `locations`

```sql
CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'MX',  -- Mexico default
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_type location_type NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  is_active BOOLEAN NOT NULL DEFAULT true,
  contact_name TEXT,                   -- building admin/contact
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  -- Residential-specific settings
  min_cars_threshold INTEGER DEFAULT 5, -- minimum cars to dispatch team
  offer_expiry_minutes INTEGER DEFAULT 120, -- how long daily offer is valid
  -- Capacity
  max_daily_capacity INTEGER NOT NULL DEFAULT 30,
  -- Parking specifics
  parking_instructions TEXT,           -- "Level B2, spots 101-150"
  access_instructions TEXT,            -- gate codes, key fobs, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `location_operating_hours`

```sql
CREATE TABLE location_operating_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  open_time TIME NOT NULL,             -- e.g., 07:00
  close_time TIME NOT NULL,            -- e.g., 18:00
  is_closed BOOLEAN NOT NULL DEFAULT false, -- override: closed this day
  UNIQUE(location_id, day_of_week)
);
```

#### `location_special_hours`
Overrides for holidays, special events, etc.

```sql
CREATE TABLE location_special_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  UNIQUE(location_id, date)
);
```

#### `location_staff`
Maps staff (washers, managers) to locations. Supports cross-location assignment.

```sql
CREATE TABLE location_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL CHECK (role IN ('location_manager', 'car_washer')),
  is_primary BOOLEAN NOT NULL DEFAULT false, -- primary location for this person
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, user_id)
);
```

#### `cars`

```sql
CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plate_number TEXT NOT NULL,
  make TEXT,                           -- Toyota, BMW, etc.
  model TEXT,                          -- Corolla, X5, etc.
  year INTEGER,
  color TEXT,
  photo_url TEXT,                      -- customer-uploaded photo
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,                          -- special instructions
  -- Location linkage (which building is this car usually at)
  primary_location_id UUID REFERENCES locations(id),
  parking_spot TEXT,                   -- "B2-105"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `service_catalog`
Master list of all wash types and add-on services.

```sql
CREATE TABLE service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- "Basic Exterior Wash"
  description TEXT,
  category TEXT NOT NULL DEFAULT 'wash', -- 'wash', 'add_on', 'detailing'
  is_add_on BOOLEAN NOT NULL DEFAULT false,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `service_material_requirements`
What materials each service type uses (for cost calculation).

```sql
CREATE TABLE service_material_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES service_catalog(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity_per_wash DECIMAL(10,4) NOT NULL, -- e.g., 0.5 liters of shampoo
  unit TEXT NOT NULL,                       -- 'liters', 'ml', 'units', 'grams'
  UNIQUE(service_id, material_id)
);
```

#### `wash_packages`
Subscription packages and one-time wash pricing.

```sql
CREATE TABLE wash_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- "Premium Monthly"
  description TEXT,
  frequency wash_frequency NOT NULL,
  -- Included services
  included_services UUID[] NOT NULL,   -- array of service_catalog IDs
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,   -- monthly price for subscriptions, unit price for one-time
  currency TEXT NOT NULL DEFAULT 'MXN', -- Mexican Peso
  -- Location-specific pricing override
  is_location_specific BOOLEAN NOT NULL DEFAULT false,
  -- Flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_subscription BOOLEAN NOT NULL DEFAULT true,
  -- For multi-car discounts
  multi_car_discount_pct DECIMAL(5,2) DEFAULT 0, -- e.g., 10 = 10% off second car
  max_cars_for_discount INTEGER DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `package_location_pricing`
Override pricing per location (some buildings may cost more/less).

```sql
CREATE TABLE package_location_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES wash_packages(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  UNIQUE(package_id, location_id)
);
```

#### `premium_fees`
Configurable premium pricing.

```sql
CREATE TABLE premium_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- "Emergency Wash Premium"
  fee_type TEXT NOT NULL,              -- 'emergency', 'time_slot', 'one_time_surcharge', 'peak_hour'
  amount DECIMAL(10,2),               -- fixed amount
  percentage DECIMAL(5,2),            -- OR percentage (one of amount/percentage should be set)
  location_id UUID REFERENCES locations(id), -- NULL = global
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB,                    -- flexible conditions: {"time_slots": ["07:00-08:00"], "days": ["monday"]}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `subscriptions`

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES wash_packages(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  status subscription_status NOT NULL DEFAULT 'active',
  payment_provider TEXT NOT NULL DEFAULT 'mercadopago' CHECK (payment_provider IN ('stripe', 'mercadopago', 'cash')),
  external_subscription_id TEXT,       -- Stripe subscription_id OR MercadoPago preapproval_id
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  -- Scheduling preferences
  preferred_days day_of_week[],        -- e.g., ['monday', 'wednesday', 'friday']
  preferred_time_start TIME,           -- e.g., 09:00
  preferred_time_end TIME,             -- e.g., 12:00
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false,
  -- Pause
  paused_at TIMESTAMPTZ,
  resume_at TIMESTAMPTZ,
  -- Stats
  total_washes_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `custom_wash_templates`
Customer's saved preferred wash combinations.

```sql
CREATE TABLE custom_wash_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                  -- "My Weekend Special"
  services UUID[] NOT NULL,           -- array of service_catalog IDs
  notes TEXT,                          -- "Extra wax on hood"
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `bookings`
Individual wash appointments (both from subscriptions and one-time).

```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Core references
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  subscription_id UUID REFERENCES subscriptions(id), -- NULL for one-time
  package_id UUID REFERENCES wash_packages(id),
  -- Services for this specific booking
  services UUID[] NOT NULL,           -- service_catalog IDs
  -- Scheduling
  scheduled_date DATE NOT NULL,
  scheduled_time_start TIME,
  scheduled_time_end TIME,
  -- Assignment
  assigned_washer_id UUID REFERENCES profiles(id),
  -- Status
  status booking_status NOT NULL DEFAULT 'pending',
  -- Pricing
  base_price DECIMAL(10,2) NOT NULL,
  premium_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  is_one_time BOOLEAN NOT NULL DEFAULT false,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  -- From template
  template_id UUID REFERENCES custom_wash_templates(id),
  -- Queue position (for fair scheduling)
  queue_position INTEGER,
  priority_score DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Metadata
  customer_notes TEXT,
  internal_notes TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES profiles(id),
  no_show_at TIMESTAMPTZ,
  rescheduled_from UUID REFERENCES bookings(id),
  weather_delay_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_date_location ON bookings(scheduled_date, location_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_washer ON bookings(assigned_washer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

#### `wash_sessions`
The actual execution record of a wash (created when washer starts).

```sql
CREATE TABLE wash_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  washer_id UUID NOT NULL REFERENCES profiles(id),
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,           -- computed on completion
  -- Status tracking
  pre_wash_photos_uploaded BOOLEAN NOT NULL DEFAULT false,
  post_wash_photos_uploaded BOOLEAN NOT NULL DEFAULT false,
  -- Quality
  washer_notes TEXT,
  -- Cost tracking (populated on completion)
  labor_cost DECIMAL(10,2),
  material_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `evidence_photos`

```sql
CREATE TABLE evidence_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pre_wash', 'post_wash', 'damage', 'upsell')),
  storage_path TEXT NOT NULL,          -- Supabase Storage path
  thumbnail_path TEXT,
  caption TEXT,
  annotations JSONB,                   -- drawn annotations on photo
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `damage_reports`

```sql
CREATE TABLE damage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id),
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe')),
  photo_ids UUID[],                   -- references evidence_photos
  is_pre_existing BOOLEAN NOT NULL DEFAULT true, -- was it there before the wash?
  location_on_car TEXT,               -- "front bumper", "rear left door"
  acknowledged_by_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `disputes`

```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  wash_session_id UUID REFERENCES wash_sessions(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status dispute_status NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `quality_surveys`

```sql
CREATE TABLE quality_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  washer_id UUID NOT NULL REFERENCES profiles(id),
  -- Ratings (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  timeliness_rating INTEGER CHECK (timeliness_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  -- Feedback
  comments TEXT,
  would_recommend BOOLEAN,
  -- Metadata
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(booking_id) -- one survey per booking
);
```

#### `messages`
In-app chat between washer and customer.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,       -- booking_id serves as conversation anchor
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'upsell_offer'
  metadata JSONB,                      -- for upsell: {service_id, price, accepted: bool}
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_booking ON messages(booking_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
```

#### `upsell_offers`
Structured upsell tracking (washer suggests, customer accepts/declines).

```sql
CREATE TABLE upsell_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  wash_session_id UUID REFERENCES wash_sessions(id),
  washer_id UUID NOT NULL REFERENCES profiles(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  service_id UUID NOT NULL REFERENCES service_catalog(id),
  message TEXT,                        -- "I noticed your headlights are foggy..."
  price DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  responded_at TIMESTAMPTZ,
  photo_url TEXT,                      -- evidence photo showing the issue
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `payments`

```sql
-- Payment method enum
CREATE TYPE payment_method AS ENUM (
  'stripe_card',                      -- International/premium cards via Stripe
  'stripe_oxxo',                      -- OXXO cash vouchers via Stripe
  'mercadopago_card',                 -- Local Mexican cards via MercadoPago
  'mercadopago_oxxo',                 -- OXXO cash payments via MercadoPago
  'mercadopago_spei',                 -- SPEI bank transfer (Mexico)
  'mercadopago_wallet',               -- MercadoPago wallet balance
  'cash',                             -- Cash collected by washer on-site
  'corporate_invoice',                -- Corporate billing
  'loyalty_redemption'                -- Paid with loyalty points
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  subscription_id UUID REFERENCES subscriptions(id),
  -- Provider-agnostic: works with Stripe, MercadoPago, or cash
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('stripe', 'mercadopago', 'cash', 'corporate', 'loyalty')),
  payment_method payment_method NOT NULL,
  external_payment_id TEXT,             -- Stripe payment_intent_id OR MercadoPago payment_id
  external_invoice_id TEXT,             -- Stripe invoice_id OR MercadoPago invoice
  external_subscription_id TEXT,        -- Stripe subscription_id OR MercadoPago preapproval_id
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type TEXT NOT NULL,           -- 'subscription', 'one_time', 'upsell', 'emergency', 'tip'
  description TEXT,
  refund_amount DECIMAL(10,2) DEFAULT 0,
  refund_reason TEXT,
  -- Cash-specific fields
  cash_collected_by UUID REFERENCES profiles(id),  -- washer who collected cash
  cash_confirmed_by UUID REFERENCES profiles(id),  -- manager who confirmed receipt
  cash_confirmed_at TIMESTAMPTZ,
  -- Tip tracking
  tip_amount DECIMAL(10,2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `inventory_items`

```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- "Car Shampoo Premium"
  sku TEXT UNIQUE,
  category TEXT NOT NULL,              -- 'chemical', 'tool', 'consumable', 'equipment'
  unit TEXT NOT NULL,                  -- 'liters', 'units', 'grams', 'ml'
  unit_cost DECIMAL(10,4),            -- cost per unit
  supplier_name TEXT,
  supplier_contact TEXT,
  reorder_point DECIMAL(10,2),        -- alert when below this
  reorder_quantity DECIMAL(10,2),     -- how much to reorder
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `inventory_stock`
Current stock level per location.

```sql
CREATE TABLE inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity DECIMAL(10,4) NOT NULL DEFAULT 0,
  last_restocked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, location_id)
);
```

#### `inventory_transactions`

```sql
CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  transaction_type inventory_tx_type NOT NULL,
  quantity DECIMAL(10,4) NOT NULL,     -- positive for restock, negative for usage
  wash_session_id UUID REFERENCES wash_sessions(id), -- if usage during a wash
  performed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `cost_records`
Detailed per-wash cost breakdown.

```sql
CREATE TABLE cost_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wash_session_id UUID NOT NULL REFERENCES wash_sessions(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  -- Cost components
  labor_minutes INTEGER NOT NULL,
  labor_rate_per_hour DECIMAL(10,2) NOT NULL, -- washer's hourly rate
  labor_cost DECIMAL(10,2) NOT NULL,
  material_cost DECIMAL(10,2) NOT NULL,
  overhead_cost DECIMAL(10,2) NOT NULL DEFAULT 0, -- allocated overhead
  total_cost DECIMAL(10,2) NOT NULL,
  -- Revenue
  revenue DECIMAL(10,2) NOT NULL,      -- what customer paid
  profit DECIMAL(10,2) NOT NULL,       -- revenue - total_cost
  margin_pct DECIMAL(5,2),            -- profit / revenue * 100
  -- Material breakdown stored as JSONB for flexibility
  material_breakdown JSONB,            -- [{item_id, name, quantity, unit, unit_cost, total}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `washer_profiles`
Extended data for car washers.

```sql
CREATE TABLE washer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  hourly_rate DECIMAL(10,2) NOT NULL,
  -- Skills/certifications
  can_do_detailing BOOLEAN NOT NULL DEFAULT false,
  can_do_ceramic BOOLEAN NOT NULL DEFAULT false,
  specializations TEXT[],
  -- Availability
  default_availability JSONB,         -- weekly schedule template
  -- Performance (denormalized for quick access, updated via triggers)
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_washes INTEGER DEFAULT 0,
  avg_wash_duration_minutes DECIMAL(5,1) DEFAULT 0,
  material_efficiency_score DECIMAL(5,2) DEFAULT 0, -- lower is better (less waste)
  -- Employment
  hire_date DATE,
  is_available BOOLEAN NOT NULL DEFAULT true, -- currently available for assignment
  unavailable_reason TEXT,             -- 'sick', 'vacation', 'break'
  unavailable_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `washer_availability`
Specific availability overrides (sick days, vacations, etc.).

```sql
CREATE TABLE washer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  washer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(washer_id, date)
);
```

#### `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,                          -- deep link data, booking_id, etc.
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_pushed BOOLEAN NOT NULL DEFAULT false, -- was push notification sent?
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

#### `daily_offers` (Residential Model)

```sql
CREATE TABLE daily_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES locations(id),
  offer_date DATE NOT NULL,
  message TEXT NOT NULL,               -- "We're at Edificio Sol today! Book by 2pm"
  packages_available UUID[],          -- which packages are offered
  discount_pct DECIMAL(5,2) DEFAULT 0,
  min_cars_threshold INTEGER NOT NULL, -- minimum responses needed
  current_responses INTEGER NOT NULL DEFAULT 0,
  threshold_met BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(location_id, offer_date)
);
```

#### `daily_offer_responses`

```sql
CREATE TABLE daily_offer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES daily_offers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  status offer_status NOT NULL DEFAULT 'pending',
  booking_id UUID REFERENCES bookings(id), -- created once threshold met
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id, car_id)
);
```

#### `referrals`

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id),
  referred_id UUID NOT NULL REFERENCES profiles(id),
  referral_code TEXT NOT NULL,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  reward_type TEXT,                    -- 'free_wash', 'discount', 'credit'
  reward_amount DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referred_id)                 -- each person can only be referred once
);
```

#### `loyalty_points`

```sql
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id)
);
```

#### `loyalty_transactions`

```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  points INTEGER NOT NULL,            -- positive = earned, negative = redeemed
  reason TEXT NOT NULL,               -- 'wash_completed', 'referral', 'redemption', 'bonus'
  reference_id UUID,                  -- booking_id, referral_id, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `corporate_accounts`

```sql
CREATE TABLE corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  billing_email TEXT,
  location_id UUID REFERENCES locations(id),
  -- Bulk deal terms
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_cars INTEGER,
  stripe_customer_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contract_start DATE,
  contract_end DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### `corporate_account_members`

```sql
CREATE TABLE corporate_account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_account_id UUID NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  UNIQUE(corporate_account_id, customer_id)
);
```

#### `waitlist`

```sql
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  car_id UUID NOT NULL REFERENCES cars(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  desired_date DATE NOT NULL,
  desired_time_start TIME,
  desired_time_end TIME,
  package_id UUID REFERENCES wash_packages(id),
  services UUID[],
  is_notified BOOLEAN NOT NULL DEFAULT false,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, car_id, location_id, desired_date)
);
```

#### `audit_log`

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,                -- 'booking.created', 'subscription.cancelled', etc.
  entity_type TEXT NOT NULL,           -- 'booking', 'subscription', 'payment', etc.
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
```

#### `app_settings`
Global and per-location configuration.

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  location_id UUID REFERENCES locations(id), -- NULL = global
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(key, location_id)
);
```

### 2.3 Key Database Functions and Triggers

```sql
-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
-- CREATE TRIGGER ... BEFORE UPDATE ON <table> FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update washer performance stats after survey
CREATE OR REPLACE FUNCTION update_washer_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE washer_profiles
  SET
    avg_rating = (
      SELECT AVG(overall_rating)::DECIMAL(3,2)
      FROM quality_surveys
      WHERE washer_id = NEW.washer_id
    ),
    total_washes = (
      SELECT COUNT(*)
      FROM wash_sessions
      WHERE washer_id = NEW.washer_id AND completed_at IS NOT NULL
    ),
    updated_at = now()
  WHERE user_id = NEW.washer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update daily offer response count
CREATE OR REPLACE FUNCTION update_offer_response_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE daily_offers
  SET
    current_responses = (
      SELECT COUNT(*) FROM daily_offer_responses
      WHERE offer_id = NEW.offer_id AND status = 'accepted'
    ),
    threshold_met = (
      SELECT COUNT(*) >= min_cars_threshold
      FROM daily_offer_responses dor
      JOIN daily_offers do2 ON do2.id = dor.offer_id
      WHERE dor.offer_id = NEW.offer_id AND dor.status = 'accepted'
    )
  WHERE id = NEW.offer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update inventory stock after transaction
CREATE OR REPLACE FUNCTION update_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_stock (item_id, location_id, quantity)
  VALUES (NEW.item_id, NEW.location_id, NEW.quantity)
  ON CONFLICT (item_id, location_id)
  DO UPDATE SET
    quantity = inventory_stock.quantity + NEW.quantity,
    updated_at = now();

  -- Check for low stock alert
  IF (SELECT quantity FROM inventory_stock WHERE item_id = NEW.item_id AND location_id = NEW.location_id)
     < (SELECT reorder_point FROM inventory_items WHERE id = NEW.item_id) THEN
    -- Insert low stock notification for location managers
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT ls.user_id, 'low_stock_alert',
           'Low Stock Alert',
           (SELECT name FROM inventory_items WHERE id = NEW.item_id) || ' is running low',
           jsonb_build_object('item_id', NEW.item_id, 'location_id', NEW.location_id)
    FROM location_staff ls
    WHERE ls.location_id = NEW.location_id
      AND ls.role IN ('location_manager')
      AND ls.is_active = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 2.4 Key Views

```sql
-- Washer daily schedule view
CREATE VIEW washer_daily_schedule AS
SELECT
  b.assigned_washer_id,
  b.scheduled_date,
  b.id AS booking_id,
  b.status,
  b.scheduled_time_start,
  b.scheduled_time_end,
  b.queue_position,
  c.plate_number,
  c.make,
  c.model,
  c.color,
  c.parking_spot,
  l.name AS location_name,
  p.full_name AS customer_name
FROM bookings b
JOIN cars c ON c.id = b.car_id
JOIN locations l ON l.id = b.location_id
JOIN profiles p ON p.id = b.customer_id
WHERE b.status NOT IN ('cancelled')
ORDER BY b.scheduled_date, b.queue_position, b.scheduled_time_start;

-- Location daily summary view
CREATE VIEW location_daily_summary AS
SELECT
  b.location_id,
  b.scheduled_date,
  COUNT(*) AS total_bookings,
  COUNT(*) FILTER (WHERE b.status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE b.status = 'cancelled') AS cancelled,
  COUNT(*) FILTER (WHERE b.status = 'no_show') AS no_shows,
  COUNT(*) FILTER (WHERE b.is_one_time) AS one_time_count,
  COUNT(*) FILTER (WHERE NOT b.is_one_time) AS subscription_count,
  SUM(b.total_price) FILTER (WHERE b.status = 'completed') AS total_revenue,
  AVG(ws.duration_minutes) FILTER (WHERE ws.completed_at IS NOT NULL) AS avg_wash_duration
FROM bookings b
LEFT JOIN wash_sessions ws ON ws.booking_id = b.id
GROUP BY b.location_id, b.scheduled_date;

-- Customer lifetime value view
CREATE VIEW customer_ltv AS
SELECT
  p.id AS customer_id,
  p.full_name,
  p.email,
  COUNT(DISTINCT s.id) AS active_subscriptions,
  COUNT(DISTINCT b.id) AS total_bookings,
  SUM(pay.amount) FILTER (WHERE pay.status = 'succeeded') AS total_spent,
  AVG(qs.overall_rating) AS avg_rating_given,
  MIN(b.created_at) AS first_booking,
  MAX(b.created_at) AS last_booking
FROM profiles p
LEFT JOIN subscriptions s ON s.customer_id = p.id AND s.status = 'active'
LEFT JOIN bookings b ON b.customer_id = p.id
LEFT JOIN payments pay ON pay.customer_id = p.id
LEFT JOIN quality_surveys qs ON qs.customer_id = p.id
WHERE p.role = 'customer'
GROUP BY p.id, p.full_name, p.email;
```

---

## 3. Row Level Security Policies

All tables must have RLS enabled. Below are the key policies.

### 3.1 Profiles

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Location managers can view profiles of customers and washers at their locations
CREATE POLICY "Managers can view location profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff ls
      WHERE ls.user_id = auth.uid()
        AND ls.role = 'location_manager'
        AND ls.is_active = true
        AND (
          -- Customer has a car at this location
          id IN (SELECT owner_id FROM cars WHERE primary_location_id = ls.location_id)
          OR
          -- Staff at this location
          id IN (SELECT user_id FROM location_staff WHERE location_id = ls.location_id)
        )
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

### 3.2 Cars

```sql
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;

-- Customers see their own cars
CREATE POLICY "Customers see own cars"
  ON cars FOR SELECT
  USING (auth.uid() = owner_id);

-- Washers see cars assigned to them today
CREATE POLICY "Washers see assigned cars"
  ON cars FOR SELECT
  USING (
    id IN (
      SELECT car_id FROM bookings
      WHERE assigned_washer_id = auth.uid()
        AND scheduled_date = CURRENT_DATE
        AND status NOT IN ('cancelled')
    )
  );

-- Admins and managers see all cars at their locations
CREATE POLICY "Admins see all cars"
  ON cars FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND role = 'location_manager'
        AND location_id = cars.primary_location_id
    )
  );

-- Customers can insert/update their own cars
CREATE POLICY "Customers manage own cars"
  ON cars FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Customers update own cars"
  ON cars FOR UPDATE USING (auth.uid() = owner_id);
```

### 3.3 Bookings

```sql
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Customers see their own bookings
CREATE POLICY "Customers see own bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = customer_id);

-- Washers see their assigned bookings
CREATE POLICY "Washers see assigned bookings"
  ON bookings FOR SELECT
  USING (auth.uid() = assigned_washer_id);

-- Admins see all
CREATE POLICY "Admins see all bookings"
  ON bookings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Managers see bookings at their locations
CREATE POLICY "Managers see location bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM location_staff
      WHERE user_id = auth.uid() AND role = 'location_manager'
        AND location_id = bookings.location_id AND is_active = true
    )
  );
```

### 3.4 Messages

```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages they sent or received
CREATE POLICY "Users see own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can insert messages where they are the sender
CREATE POLICY "Users send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
```

### 3.5 Evidence Photos

```sql
ALTER TABLE evidence_photos ENABLE ROW LEVEL SECURITY;

-- Washers can insert photos for their sessions
CREATE POLICY "Washers upload photos"
  ON evidence_photos FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM wash_sessions WHERE id = wash_session_id AND washer_id = auth.uid()
    )
  );

-- Customers can view photos for their bookings
CREATE POLICY "Customers view their photos"
  ON evidence_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM wash_sessions ws
      JOIN bookings b ON b.id = ws.booking_id
      WHERE ws.id = wash_session_id AND b.customer_id = auth.uid()
    )
  );
```

### 3.6 Storage Policies (Supabase Storage)

```
Bucket: evidence-photos
  - Washers can upload to: evidence-photos/{wash_session_id}/*
  - Customers can read from: evidence-photos/{wash_session_id}/* (where they own the booking)
  - Admins/Managers can read all

Bucket: car-photos
  - Customers upload to: car-photos/{user_id}/*
  - Washers can read car photos for assigned bookings

Bucket: avatars
  - Users upload to: avatars/{user_id}/*
  - Public read
```

---

## 4. API / Edge Functions

### 4.1 Auth & Profile

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register (Supabase Auth + profile creation via trigger) |
| POST | `/auth/login` | Login (Supabase Auth) |
| GET | `/profile` | Get current user profile |
| PATCH | `/profile` | Update profile |
| POST | `/profile/push-token` | Register push notification token |

### 4.2 Cars

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cars` | List my cars |
| POST | `/cars` | Add a car |
| PATCH | `/cars/:id` | Update car details |
| DELETE | `/cars/:id` | Deactivate a car |
| POST | `/cars/:id/photo` | Upload car photo |

### 4.3 Locations

| Method | Endpoint | Description |
|---|---|---|
| GET | `/locations` | List active locations (filtered by role) |
| POST | `/locations` | Create location (admin only) |
| PATCH | `/locations/:id` | Update location |
| GET | `/locations/:id/availability` | Get available time slots for a date |
| GET | `/locations/:id/capacity` | Get capacity info for date range |

### 4.4 Service Catalog & Packages

| Method | Endpoint | Description |
|---|---|---|
| GET | `/services` | List all active services |
| POST | `/services` | Create service (admin) |
| GET | `/packages` | List wash packages |
| POST | `/packages` | Create package (admin) |
| GET | `/packages/:id/pricing?location_id=` | Get pricing for a package at a location |

### 4.5 Payment Methods & Providers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/payments/methods` | List customer's saved payment methods (across all providers) |
| POST | `/payments/methods/stripe` | Add Stripe card (returns Stripe SetupIntent client_secret) |
| POST | `/payments/methods/mercadopago` | Add MercadoPago card (returns MP card token flow) |
| DELETE | `/payments/methods/:id` | Remove saved payment method |
| PATCH | `/payments/methods/:id/default` | Set as default payment method |
| GET | `/payments/methods/available` | List available payment methods for customer's country |

### 4.6 Payments & Checkout

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/checkout` | Unified checkout — routes to Stripe or MercadoPago based on selected method |
| POST | `/payments/checkout/stripe` | Create Stripe PaymentIntent (cards) |
| POST | `/payments/checkout/mercadopago` | Create MercadoPago preference (cards, OXXO, SPEI, wallet) |
| POST | `/payments/checkout/cash` | Mark booking as "pay on delivery" (cash) |
| GET | `/payments/history` | Payment history for customer |
| GET | `/payments/:id` | Payment detail with receipt |
| POST | `/payments/:id/refund` | Initiate refund (admin) — routes to correct provider |
| GET | `/payments/:id/receipt` | Download receipt PDF |

### 4.7 Cash Payments (Washer-Collected)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/payments/cash/collect` | Washer marks cash collected for a booking |
| POST | `/payments/cash/confirm` | Manager confirms cash received from washer |
| GET | `/payments/cash/pending` | List unconfirmed cash payments (manager view) |
| GET | `/payments/cash/daily-summary` | Daily cash collection summary per washer |

### 4.8 Webhooks (Provider Callbacks)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/webhooks/stripe` | Stripe webhook — subscription lifecycle, payment success/failure |
| POST | `/webhooks/mercadopago` | MercadoPago IPN — payment status updates, subscription events |

### 4.9 Subscriptions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/subscriptions` | Create subscription — routes to Stripe or MercadoPago based on payment method |
| POST | `/subscriptions/stripe` | Create via Stripe Subscriptions API |
| POST | `/subscriptions/mercadopago` | Create via MercadoPago Preapproval (recurring) |
| POST | `/subscriptions/cash` | Create cash-based subscription (manual billing cycle) |
| GET | `/subscriptions` | List my subscriptions |
| PATCH | `/subscriptions/:id` | Update preferences (days, times, payment method) |
| POST | `/subscriptions/:id/pause` | Pause subscription |
| POST | `/subscriptions/:id/resume` | Resume subscription |
| POST | `/subscriptions/:id/cancel` | Cancel subscription |
| POST | `/subscriptions/:id/change-plan` | Upgrade/downgrade plan |
| POST | `/subscriptions/:id/change-payment` | Switch payment provider/method |

### 4.10 Bookings

| Method | Endpoint | Description |
|---|---|---|
| POST | `/bookings` | Create one-time booking (selects payment method at checkout) |
| POST | `/bookings/emergency` | Emergency/immediate wash booking (premium pricing) |
| GET | `/bookings` | List bookings (filtered by role) |
| GET | `/bookings/:id` | Booking detail with payment status |
| PATCH | `/bookings/:id/cancel` | Cancel booking (triggers refund if prepaid) |
| POST | `/bookings/:id/reschedule` | Reschedule booking |
| GET | `/bookings/:id/track` | Real-time tracking status |
| POST | `/bookings/:id/tip` | Add tip for washer (post-wash) |

### 4.7 Wash Sessions (Washer Workflow)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/wash-sessions` | Start a wash (creates session from booking) |
| POST | `/wash-sessions/:id/pre-photos` | Upload pre-wash photos |
| POST | `/wash-sessions/:id/damage-report` | Report pre-existing damage |
| POST | `/wash-sessions/:id/complete` | Complete wash |
| POST | `/wash-sessions/:id/post-photos` | Upload post-wash photos |
| POST | `/wash-sessions/:id/materials` | Log material usage |

### 4.8 Scheduling Engine (Edge Functions)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/scheduling/generate-daily` | Generate daily schedule for a location (cron or manual) |
| POST | `/scheduling/assign-washer` | Auto-assign washer to booking |
| POST | `/scheduling/rebalance` | Rebalance queue after changes |
| GET | `/scheduling/washer-queue/:washer_id` | Get washer's current queue |

### 4.9 Quality & Surveys

| Method | Endpoint | Description |
|---|---|---|
| POST | `/surveys` | Submit quality survey |
| GET | `/surveys/washer/:id` | Get washer's survey history |
| POST | `/disputes` | Open a dispute |
| PATCH | `/disputes/:id` | Update dispute (admin/manager) |

### 4.10 Messaging

| Method | Endpoint | Description |
|---|---|---|
| GET | `/messages/:booking_id` | Get chat messages for a booking |
| POST | `/messages` | Send message (via Supabase Realtime insert) |
| POST | `/upsell-offers` | Create upsell offer (washer) |
| PATCH | `/upsell-offers/:id` | Accept/decline upsell (customer) |

### 4.11 Inventory & Cost (Admin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/inventory?location_id=` | Get inventory for a location |
| POST | `/inventory/restock` | Record restock |
| POST | `/inventory/transfer` | Transfer between locations |
| GET | `/inventory/alerts` | Get low stock alerts |
| GET | `/costs/wash/:wash_session_id` | Get cost breakdown for a wash |
| GET | `/costs/summary` | Aggregated cost analytics |

### 4.12 Analytics (Admin)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/analytics/revenue` | Revenue by location, plan, date range |
| GET | `/analytics/customers` | Retention, churn, satisfaction |
| GET | `/analytics/washers` | Performance comparisons |
| GET | `/analytics/locations` | Per-location profitability |
| GET | `/analytics/export` | CSV/Excel export of reports |

### 4.13 Daily Offers (Residential)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/offers/daily` | Create daily offer for residential location |
| GET | `/offers/daily/active` | Get active offers for customer's locations |
| POST | `/offers/daily/:id/respond` | Accept/decline offer |
| POST | `/offers/daily/:id/dispatch` | Dispatch team when threshold met |

### 4.14 Referrals & Loyalty

| Method | Endpoint | Description |
|---|---|---|
| GET | `/referrals/code` | Get my referral code |
| POST | `/referrals/apply` | Apply referral code during signup |
| GET | `/loyalty/balance` | Get points balance |
| POST | `/loyalty/redeem` | Redeem points for rewards |

### 4.15 Notifications

| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Get user's notifications |
| PATCH | `/notifications/:id/read` | Mark as read |
| POST | `/notifications/send` | Send notification (internal, triggered by events) |

---

## 5. Frontend Pages & Screens

### 5.1 Public / Auth Pages

| Page | Route | Description |
|---|---|---|
| Landing Page | `/` | Marketing page, pricing, CTA |
| Login | `/login` | Email/password + social login |
| Register | `/register` | Signup with role selection (customer default) |
| Forgot Password | `/forgot-password` | Password reset flow |
| Referral Landing | `/r/:code` | Referral link landing page |

### 5.2 Customer App

| Page | Route | Description |
|---|---|---|
| Dashboard | `/dashboard` | Upcoming washes, active subscriptions, quick actions |
| My Cars | `/cars` | List/manage cars |
| Add Car | `/cars/new` | Add car with plate, details, photo |
| Browse Packages | `/packages` | View available wash packages at their location |
| Package Detail | `/packages/:id` | Package details, pricing, subscribe CTA |
| Subscribe | `/subscribe/:packageId` | Subscription checkout (schedule prefs, payment) |
| Book One-Time | `/book` | One-time wash booking flow |
| Emergency Wash | `/book/emergency` | Immediate wash booking |
| My Subscriptions | `/subscriptions` | Active subscriptions, pause/cancel |
| Wash Templates | `/templates` | Saved custom wash combinations |
| Booking Detail | `/bookings/:id` | Status tracking, evidence photos, chat |
| Wash Tracking | `/bookings/:id/track` | Real-time wash progress |
| Chat | `/bookings/:id/chat` | In-app messaging with washer |
| Wash History | `/history` | Past washes with photos and ratings |
| Survey | `/survey/:bookingId` | Post-wash quality survey |
| Daily Offers | `/offers` | Residential: active offers for my building |
| Payments | `/payments` | Payment history, manage payment method |
| Loyalty | `/loyalty` | Points balance, rewards, redemption |
| Profile | `/profile` | Account settings, notifications prefs |
| Notifications | `/notifications` | Notification center |

### 5.3 Car Washer App

| Page | Route | Description |
|---|---|---|
| Today's Queue | `/washer/queue` | Daily schedule, ordered by time/priority |
| Booking Detail | `/washer/bookings/:id` | Car details, customer notes, location |
| Start Wash | `/washer/wash/:bookingId/start` | Pre-wash photo capture, damage documentation |
| Active Wash | `/washer/wash/:sessionId` | Timer, progress, material logging |
| Complete Wash | `/washer/wash/:sessionId/complete` | Post-wash photos, notes |
| Chat | `/washer/chat/:bookingId` | Messaging with customer |
| Upsell | `/washer/upsell/:bookingId` | Create upsell offer with photo evidence |
| My Performance | `/washer/performance` | Personal stats: rating, speed, efficiency |
| Availability | `/washer/availability` | Set availability, request time off |

### 5.4 Location Manager App

| Page | Route | Description |
|---|---|---|
| Dashboard | `/manager/dashboard` | Daily overview: bookings, staff, capacity |
| Daily Schedule | `/manager/schedule` | All bookings for the day, assign/reassign |
| Staff | `/manager/staff` | Staff roster, availability, assignment |
| Bookings | `/manager/bookings` | All bookings (filterable) |
| Inventory | `/manager/inventory` | Stock levels, restock requests |
| Customers | `/manager/customers` | Customer list, subscription status |
| Daily Offers | `/manager/offers` | Create/manage residential offers |
| Reports | `/manager/reports` | Location-level analytics |
| Disputes | `/manager/disputes` | Handle customer disputes |

### 5.5 Admin Dashboard

| Page | Route | Description |
|---|---|---|
| Admin Dashboard | `/admin` | Multi-location overview, KPIs |
| Locations | `/admin/locations` | Manage all locations |
| Location Detail | `/admin/locations/:id` | Location settings, hours, capacity |
| Staff Management | `/admin/staff` | All staff, cross-location assignment |
| Customers | `/admin/customers` | All customers, LTV, churn risk |
| Service Catalog | `/admin/services` | Manage services and add-ons |
| Packages & Pricing | `/admin/packages` | Manage packages, location pricing |
| Premium Fees | `/admin/fees` | Configure premium fee rules |
| Subscriptions | `/admin/subscriptions` | All subscriptions overview |
| Revenue Analytics | `/admin/analytics/revenue` | Revenue dashboards |
| Customer Analytics | `/admin/analytics/customers` | Retention, churn, satisfaction |
| Washer Analytics | `/admin/analytics/washers` | Performance comparison |
| Cost Analytics | `/admin/analytics/costs` | Per-wash profitability |
| Inventory | `/admin/inventory` | Cross-location inventory |
| Corporate Accounts | `/admin/corporate` | Manage corporate/bulk deals |
| Disputes | `/admin/disputes` | All disputes across locations |
| Settings | `/admin/settings` | App configuration, global settings |
| Audit Log | `/admin/audit` | System activity log |
| Exports | `/admin/exports` | Generate CSV/Excel reports |

---

## 6. File Structure

```
carwash/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint, type-check, test
│       └── deploy.yml                 # Vercel deployment
├── supabase/
│   ├── config.toml                    # Supabase project config
│   ├── migrations/
│   │   ├── 00001_create_enums.sql
│   │   ├── 00002_create_profiles.sql
│   │   ├── 00003_create_locations.sql
│   │   ├── 00004_create_cars.sql
│   │   ├── 00005_create_services_packages.sql
│   │   ├── 00006_create_subscriptions.sql
│   │   ├── 00007_create_bookings.sql
│   │   ├── 00008_create_wash_sessions.sql
│   │   ├── 00009_create_evidence_damage.sql
│   │   ├── 00010_create_quality_surveys.sql
│   │   ├── 00011_create_messages.sql
│   │   ├── 00012_create_inventory.sql
│   │   ├── 00013_create_costs.sql
│   │   ├── 00014_create_notifications.sql
│   │   ├── 00015_create_daily_offers.sql
│   │   ├── 00016_create_referrals_loyalty.sql
│   │   ├── 00017_create_corporate.sql
│   │   ├── 00018_create_waitlist.sql
│   │   ├── 00019_create_audit_log.sql
│   │   ├── 00020_create_rls_policies.sql
│   │   ├── 00021_create_functions_triggers.sql
│   │   ├── 00022_create_views.sql
│   │   └── 00023_seed_data.sql
│   ├── functions/
│   │   ├── scheduling-engine/
│   │   │   └── index.ts               # Daily schedule generation
│   │   ├── stripe-webhook/
│   │   │   └── index.ts               # Stripe webhook handler
│   │   ├── send-notification/
│   │   │   └── index.ts               # Push notification sender
│   │   ├── daily-offer-dispatch/
│   │   │   └── index.ts               # Dispatch team when threshold met
│   │   ├── cost-calculator/
│   │   │   └── index.ts               # Per-wash cost computation
│   │   ├── analytics-aggregator/
│   │   │   └── index.ts               # Precompute analytics
│   │   └── _shared/
│   │       ├── supabase-client.ts
│   │       ├── stripe-client.ts
│   │       └── types.ts
│   └── seed.sql
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (customer)/
│   │   │   ├── layout.tsx             # Customer layout with nav
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── cars/
│   │   │   │   ├── page.tsx
│   │   │   │   └── new/page.tsx
│   │   │   ├── packages/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── subscribe/[packageId]/page.tsx
│   │   │   ├── book/
│   │   │   │   ├── page.tsx
│   │   │   │   └── emergency/page.tsx
│   │   │   ├── subscriptions/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── bookings/
│   │   │   │   ├── page.tsx           # History
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx       # Detail
│   │   │   │       ├── track/page.tsx
│   │   │   │       └── chat/page.tsx
│   │   │   ├── offers/page.tsx
│   │   │   ├── survey/[bookingId]/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── loyalty/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── notifications/page.tsx
│   │   ├── (washer)/
│   │   │   ├── layout.tsx
│   │   │   ├── washer/
│   │   │   │   ├── queue/page.tsx
│   │   │   │   ├── bookings/[id]/page.tsx
│   │   │   │   ├── wash/
│   │   │   │   │   ├── [bookingId]/start/page.tsx
│   │   │   │   │   └── [sessionId]/
│   │   │   │   │       ├── page.tsx   # Active wash
│   │   │   │   │       └── complete/page.tsx
│   │   │   │   ├── chat/[bookingId]/page.tsx
│   │   │   │   ├── upsell/[bookingId]/page.tsx
│   │   │   │   ├── performance/page.tsx
│   │   │   │   └── availability/page.tsx
│   │   ├── (manager)/
│   │   │   ├── layout.tsx
│   │   │   └── manager/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── schedule/page.tsx
│   │   │       ├── staff/page.tsx
│   │   │       ├── bookings/page.tsx
│   │   │       ├── inventory/page.tsx
│   │   │       ├── customers/page.tsx
│   │   │       ├── offers/page.tsx
│   │   │       ├── reports/page.tsx
│   │   │       └── disputes/page.tsx
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx           # Dashboard
│   │   │       ├── locations/
│   │   │       │   ├── page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── staff/page.tsx
│   │   │       ├── customers/page.tsx
│   │   │       ├── services/page.tsx
│   │   │       ├── packages/page.tsx
│   │   │       ├── fees/page.tsx
│   │   │       ├── subscriptions/page.tsx
│   │   │       ├── analytics/
│   │   │       │   ├── revenue/page.tsx
│   │   │       │   ├── customers/page.tsx
│   │   │       │   ├── washers/page.tsx
│   │   │       │   └── costs/page.tsx
│   │   │       ├── inventory/page.tsx
│   │   │       ├── corporate/page.tsx
│   │   │       ├── disputes/page.tsx
│   │   │       ├── settings/page.tsx
│   │   │       ├── audit/page.tsx
│   │   │       └── exports/page.tsx
│   │   └── api/
│   │       └── webhooks/
│   │           └── stripe/route.ts    # Stripe webhook (Next.js route handler)
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── footer.tsx
│   │   ├── auth/
│   │   │   ├── login-form.tsx
│   │   │   ├── register-form.tsx
│   │   │   └── auth-guard.tsx
│   │   ├── booking/
│   │   │   ├── booking-card.tsx
│   │   │   ├── booking-form.tsx
│   │   │   ├── booking-status.tsx
│   │   │   ├── time-slot-picker.tsx
│   │   │   └── service-selector.tsx
│   │   ├── car/
│   │   │   ├── car-card.tsx
│   │   │   ├── car-form.tsx
│   │   │   └── plate-input.tsx
│   │   ├── wash/
│   │   │   ├── wash-tracker.tsx
│   │   │   ├── wash-timer.tsx
│   │   │   ├── photo-capture.tsx
│   │   │   ├── damage-annotation.tsx
│   │   │   └── material-logger.tsx
│   │   ├── chat/
│   │   │   ├── chat-window.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   └── upsell-card.tsx
│   │   ├── scheduling/
│   │   │   ├── schedule-calendar.tsx
│   │   │   ├── queue-list.tsx
│   │   │   └── staff-assignment.tsx
│   │   ├── analytics/
│   │   │   ├── revenue-chart.tsx
│   │   │   ├── kpi-card.tsx
│   │   │   ├── performance-table.tsx
│   │   │   └── trend-chart.tsx
│   │   ├── inventory/
│   │   │   ├── stock-table.tsx
│   │   │   ├── restock-form.tsx
│   │   │   └── low-stock-alert.tsx
│   │   └── shared/
│   │       ├── loading.tsx
│   │       ├── error-boundary.tsx
│   │       ├── empty-state.tsx
│   │       ├── image-upload.tsx
│   │       ├── rating-stars.tsx
│   │       └── notification-bell.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   ├── server.ts              # Server client (RSC)
│   │   │   ├── middleware.ts          # Auth middleware
│   │   │   └── admin.ts              # Service role client
│   │   ├── stripe/
│   │   │   ├── client.ts
│   │   │   ├── webhooks.ts
│   │   │   └── products.ts           # Sync packages <-> Stripe products
│   │   ├── scheduling/
│   │   │   ├── fair-scheduler.ts     # Core scheduling algorithm
│   │   │   ├── priority-calculator.ts
│   │   │   └── capacity-manager.ts
│   │   ├── cost/
│   │   │   └── calculator.ts         # Per-wash cost calculation
│   │   ├── notifications/
│   │   │   ├── push.ts
│   │   │   └── templates.ts
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── currency.ts
│   │       ├── validators.ts
│   │       └── constants.ts
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-realtime.ts
│   │   ├── use-bookings.ts
│   │   ├── use-subscriptions.ts
│   │   ├── use-notifications.ts
│   │   ├── use-chat.ts
│   │   ├── use-wash-session.ts
│   │   └── use-location.ts
│   ├── types/
│   │   ├── database.ts               # Generated from Supabase (supabase gen types)
│   │   ├── booking.ts
│   │   ├── subscription.ts
│   │   ├── wash.ts
│   │   ├── user.ts
│   │   └── analytics.ts
│   ├── stores/                        # Zustand stores (if needed beyond server state)
│   │   ├── auth-store.ts
│   │   └── ui-store.ts
│   └── middleware.ts                  # Next.js middleware: auth, role-based routing
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json                 # PWA manifest
├── .env.local                         # Local env vars (NEVER committed)
├── .env.example
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── PLAN.md                            # This file
└── README.md
```

---

## 7. Scheduling Algorithm

The scheduling engine is the core business logic. It runs daily (via cron) and can also be triggered manually when bookings change.

### 7.1 Fair Scheduling Principles

1. **Subscription customers are guaranteed their frequency.** A weekly subscriber must get 1 wash per week, no matter what.
2. **Within a subscription tier, fairness is round-robin.** The customer who has gone the longest without a wash gets the highest priority.
3. **Subscribers have priority over one-time bookings**, but one-time bookings are never starved (maximum wait: same day or next available).
4. **Emergency washes jump the queue** with a premium fee, but are capped per day to not disrupt the schedule.
5. **Preferred time slots are honored when possible** but are not guaranteed. Time-slot premiums are charged only when the preferred slot is granted.

### 7.2 Priority Score Calculation

```typescript
function calculatePriorityScore(booking: Booking): number {
  let score = 0;

  // 1. Base priority by type
  if (booking.is_emergency) {
    score += 10000; // Always top priority
  } else if (!booking.is_one_time) {
    score += 1000; // Subscribers > one-time
  }

  // 2. Subscription freshness (days since last wash)
  // The longer since last wash, the higher priority
  if (booking.subscription_id) {
    const daysSinceLastWash = getDaysSinceLastWash(
      booking.customer_id,
      booking.car_id
    );
    const expectedFrequencyDays = getExpectedFrequency(booking.subscription_id);
    const urgencyRatio = daysSinceLastWash / expectedFrequencyDays;
    score += urgencyRatio * 500; // Overdue customers get boosted
  }

  // 3. Customer tenure bonus (loyal customers get slight boost)
  const monthsAsCustomer = getCustomerTenure(booking.customer_id);
  score += Math.min(monthsAsCustomer * 5, 50); // max 50 points

  // 4. Rescheduled bookings get a boost (don't penalize weather delays etc.)
  if (booking.rescheduled_from) {
    score += 200;
  }

  // 5. Waitlist priority (was waiting for a slot)
  if (booking.from_waitlist) {
    score += 100;
  }

  // 6. One-time bookings: earlier booking time = higher priority (FIFO)
  if (booking.is_one_time) {
    const hoursAgo = getHoursSinceCreation(booking);
    score += Math.min(hoursAgo * 10, 100);
  }

  return score;
}
```

### 7.3 Daily Schedule Generation Algorithm

```
FUNCTION generateDailySchedule(location_id, date):

  1. Get location operating hours for this day
  2. Get available washers for this location on this day
  3. Calculate total capacity = sum(washer_available_hours) / avg_wash_duration
  4. Get all pending/confirmed bookings for this location and date

  5. Sort bookings by priority_score DESC

  6. For each booking in sorted order:
     a. Find available washer considering:
        - Washer is available at the requested time
        - Washer skill match (detailing requires certified washer)
        - Washer current load (balance assignments evenly)
        - Washer proximity (if multiple sub-locations)
     b. Assign time slot:
        - If customer has preferred time and slot is available → assign it
        - If preferred time unavailable → assign nearest available slot
        - Update washer's schedule
     c. Set queue_position

  7. Handle overflow:
     - If bookings > capacity, move lowest-priority bookings to waitlist
     - Notify affected customers
     - For subscribers, never push beyond their frequency guarantee

  8. Handle residential model:
     - Only generate schedule if daily_offer threshold is met
     - Otherwise, no dispatch

  RETURN schedule
```

### 7.4 Auto-Assignment Logic

```
FUNCTION assignWasher(booking, available_washers):

  For each washer, calculate assignment_score:
    - current_load_penalty: -10 per booking already assigned today
    - skill_match_bonus: +50 if washer specializes in requested service
    - rating_bonus: washer.avg_rating * 10
    - efficiency_bonus: (1 / washer.avg_wash_duration) * 20
    - familiarity_bonus: +30 if washer has washed this car before (continuity)

  Sort washers by assignment_score DESC
  Return top washer
```

### 7.5 Cron Schedule

| Cron | Function | Description |
|---|---|---|
| Every day at 5:00 AM | `generateDailySchedule` | Generate schedules for all active locations |
| Every day at 6:00 AM | `sendDailyOffers` | Send residential model daily offers |
| Every 15 minutes | `processWaitlist` | Check if any waitlist entries can be fulfilled |
| Every day at 9:00 PM | `sendSurveyReminders` | Send survey reminders for completed washes |
| Every Monday at 8:00 AM | `weeklyAnalytics` | Precompute weekly analytics |

---

## 8. Cost Calculation Logic

### 8.1 Per-Wash Cost Components

```typescript
interface WashCostBreakdown {
  laborCost: number;
  materialCost: number;
  overheadCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  marginPct: number;
  materialDetails: MaterialUsage[];
}

interface MaterialUsage {
  itemId: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}
```

### 8.2 Calculation Steps

```
FUNCTION calculateWashCost(wash_session_id):

  1. LABOR COST:
     - Get washer's hourly_rate from washer_profiles
     - Get wash duration_minutes from wash_sessions
     - labor_cost = (duration_minutes / 60) * hourly_rate

  2. MATERIAL COST:
     - Get all services performed in this wash (from booking.services)
     - For each service:
       - Look up service_material_requirements
       - For each required material:
         - Get unit_cost from inventory_items
         - material_cost += quantity_per_wash * unit_cost
     - Also add any manually logged material usage from inventory_transactions
       linked to this wash_session

  3. OVERHEAD COST:
     - Get overhead_rate from app_settings for this location
     - Options:
       a. Fixed per wash: overhead_per_wash
       b. Percentage of labor+material: (labor + material) * overhead_pct
       c. Daily overhead / daily_washes (amortized)

  4. TOTAL COST = labor_cost + material_cost + overhead_cost

  5. REVENUE:
     - From booking.total_price (includes base + premiums - discounts)
     - Plus any accepted upsell_offers for this booking

  6. PROFIT = revenue - total_cost
  7. MARGIN = (profit / revenue) * 100

  8. Insert into cost_records table

  RETURN breakdown
```

### 8.3 Analytics Aggregations

```sql
-- Profitability by location (for a date range)
SELECT
  l.name,
  COUNT(cr.id) AS total_washes,
  SUM(cr.revenue) AS total_revenue,
  SUM(cr.total_cost) AS total_cost,
  SUM(cr.profit) AS total_profit,
  AVG(cr.margin_pct) AS avg_margin
FROM cost_records cr
JOIN locations l ON l.id = cr.location_id
WHERE cr.created_at BETWEEN :start_date AND :end_date
GROUP BY l.id, l.name;

-- Profitability by package
SELECT
  wp.name AS package_name,
  COUNT(cr.id) AS total_washes,
  AVG(cr.revenue) AS avg_revenue,
  AVG(cr.total_cost) AS avg_cost,
  AVG(cr.profit) AS avg_profit,
  AVG(cr.margin_pct) AS avg_margin
FROM cost_records cr
JOIN bookings b ON b.id = cr.booking_id
JOIN wash_packages wp ON wp.id = b.package_id
GROUP BY wp.id, wp.name;
```

---

## 9. Residential vs Office Model Differences

### 9.1 Office Building Model (Phase 1)

| Aspect | Details |
|---|---|
| **Customer behavior** | Cars parked 8-10 hours. Predictable. Same spot daily. |
| **Primary model** | Subscription (monthly plans). |
| **Scheduling** | Automated. System schedules based on subscription frequency and washer availability. Customer sets preferences once. |
| **Booking flow** | Subscribe → set preferences → system auto-schedules → wash happens → notification |
| **When washes happen** | During business hours (8AM-6PM) while car is parked. Customer doesn't need to be present. |
| **Key value prop** | "Set it and forget it." Your car is always clean. |
| **Parking data** | Fixed spot assignment (e.g., "B2-105"). Washer navigates by spot number. |
| **Payment** | Recurring monthly via Stripe Subscriptions. |
| **UX emphasis** | Minimal friction. Dashboard shows upcoming wash, last wash evidence. Notifications when done. |

### 9.2 Residential Building Model (Phase 2)

| Aspect | Details |
|---|---|
| **Customer behavior** | Cars come and go. Unpredictable. May not be parked on any given day. |
| **Primary model** | One-time washes triggered by daily offers. Some subscribers. |
| **Scheduling** | Demand-driven. Business sends daily offer → customers respond → if enough say yes, team dispatched. |
| **Booking flow** | Receive daily offer notification → accept/decline → if threshold met, team comes → wash happens |
| **When washes happen** | Flexible. Often mornings or weekends. |
| **Key value prop** | "Wash day at your building." Communal, event-based. |
| **Minimum threshold** | Configurable per location (e.g., minimum 5 cars to dispatch a team). |
| **Offer mechanics** | Daily offer created (manually or auto). Broadcast to all customers at that location. Timer/expiry. Threshold counter visible. |
| **Payment** | One-time payments per wash. Optionally subscriptions for regulars. |
| **UX emphasis** | Social proof ("7 of your neighbors have already signed up for today!"). Urgency ("Offer expires in 2 hours"). Easy one-tap booking. |

### 9.3 Shared Backend, Different Frontend Flows

The database schema handles both models with the same tables:
- `locations.location_type` distinguishes office vs residential.
- `daily_offers` table only used for residential.
- `subscriptions` used primarily for office, but available for residential regulars.
- `bookings` table works for both: subscription-generated and offer-generated bookings.

The frontend uses `location_type` to render different UX flows:
- Office customer sees: subscription management, auto-schedule, "your next wash is Tuesday."
- Residential customer sees: daily offers feed, "10 neighbors are in, join today!", one-tap book.

---

## 10. Realtime Features

### 10.1 Supabase Realtime Subscriptions

| Feature | Channel/Table | Who Subscribes | Trigger |
|---|---|---|---|
| Wash status tracking | `bookings` (status changes) | Customer viewing their booking | Washer updates booking status |
| Live chat | `messages` (inserts) | Both customer and washer in active chat | Either party sends message |
| Daily offer counter | `daily_offer_responses` (inserts) | All customers viewing the offer | A customer responds to offer |
| Notification bell | `notifications` (inserts) | All logged-in users | System creates notification |
| Queue updates | `bookings` (washer's bookings) | Washer viewing their queue | Schedule changes |
| Inventory alerts | `inventory_stock` (updates) | Managers viewing inventory | Stock level changes |

### 10.2 Implementation

```typescript
// Example: Customer tracking their wash in real-time
const useWashTracking = (bookingId: string) => {
  const supabase = createClientComponentClient();

  useEffect(() => {
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          // Update local state with new status
          setBookingStatus(payload.new.status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);
};
```

### 10.3 Push Notifications

Triggered by database events via Edge Functions (database webhooks or pg_notify).

| Event | Notification | Recipient |
|---|---|---|
| Booking confirmed | "Your wash is scheduled for {date}" | Customer |
| Washer en route | "Your washer is on the way!" | Customer |
| Wash started | "Wash in progress on your {car}" | Customer |
| Pre-wash damage found | "Damage noted on your {car}, check the report" | Customer |
| Wash completed | "Your {car} is sparkling clean! View photos" | Customer |
| Upsell offer | "Your washer recommends {service} for your car" | Customer |
| Survey request | "How was your wash? Rate in 30 seconds" | Customer (30 min after completion) |
| New booking assigned | "New wash: {car} at {location}, {time}" | Washer |
| Offer threshold met | "Enough sign-ups! Team dispatched to {location}" | Residential customers |
| Low stock | "{item} is running low at {location}" | Manager |
| Payment failed | "Payment failed for subscription. Update your card." | Customer |

---

## 11. Edge Cases & Gap Analysis

### 11.1 Cancellations & Refunds

- **Customer cancels subscription**: Cancel at end of billing period (Stripe `cancel_at_period_end`). No prorated refund by default; configurable.
- **Customer cancels single booking**: If cancelled >2 hours before scheduled time, no charge. If <2 hours, configurable late cancellation fee.
- **Admin cancels**: Full refund. Rescheduled automatically if subscription.
- **Refund workflow**: Admin initiates via Stripe API. Recorded in `payments` table with refund status.

### 11.2 No-Shows

- **Car not present at scheduled time**: Washer marks as `no_show`. Customer notified. For subscribers, the wash counts against their frequency (they "used" the visit). Configurable: some plans may allow automatic rescheduling for no-shows.
- **Repeated no-shows**: Track count per customer. Admin alerted after 3 consecutive no-shows. Possible subscription pause.

### 11.3 Weather Delays

- **Weather affects outdoor washes**: Admin or manager can mark a day/time range as "weather delay" for a location.
- **Effect**: All bookings in that window get status `weather_delayed`. Customers notified. Bookings auto-rescheduled to next available slot.
- **For subscribers**: Does NOT count against frequency. Extra wash scheduled.

### 11.4 Washer Breaks / Illness

- **Washer calls in sick**: Set `is_available = false` with reason `sick` and `unavailable_until`.
- **Effect**: All their assigned bookings for the day are redistributed to other available washers via the rebalance function.
- **Not enough washers**: Overflow bookings moved to waitlist. Customers notified with apology.

### 11.5 Peak Hours / Capacity

- **Capacity exceeded**: Bookings beyond capacity are waitlisted. Waitlist is processed FIFO with priority boost.
- **Peak hour pricing**: Configurable via `premium_fees` with `conditions.time_slots`. Applied automatically during booking.
- **Capacity visible to customers**: Booking UI shows "3 slots remaining" to create urgency (residential) or inform (office).

### 11.6 Waitlists

- When a customer tries to book and no slots are available, they are added to `waitlist`.
- Cron job checks every 15 minutes if any waitlist entries can be fulfilled (cancellations, added capacity).
- Customer notified when slot opens: "A slot opened up for {date}! Book now (expires in 30 min)."

### 11.7 Loyalty & Rewards

- **Points earned**: Per wash completed (configurable points per package tier). Bonus for referrals, surveys, long tenure.
- **Points redeemed**: Free washes, add-on services, discounts. Redemption catalog managed by admin.
- **Multi-car discount**: Configured per package. Second car on same subscription gets X% off (stored in `wash_packages.multi_car_discount_pct`).

### 11.8 Referral Program

- Each customer gets a unique `referral_code`.
- When new customer signs up with a referral code, both parties get a reward (configurable: free wash, credit, discount).
- Tracked in `referrals` table. Rewards granted only after referred customer completes their first paid wash.

### 11.9 Corporate / Bulk Deals

- Companies can sign up as `corporate_accounts` with negotiated discount rates.
- Employees register individually and are linked to the corporate account.
- Billing can be:
  - **Company pays**: Single Stripe customer, invoiced monthly.
  - **Employee pays with discount**: Individual billing, corporate discount applied.
- Managed via `corporate_accounts` and `corporate_account_members`.

### 11.10 Reporting / Exports

- Admin can generate CSV/Excel exports for:
  - Revenue reports (by date, location, package)
  - Customer lists with subscription status
  - Washer performance reports
  - Inventory reports
  - Cost/profitability analysis
- Edge Function generates file, uploads to Supabase Storage, returns download URL.

### 11.11 Multi-Language Support

- UI supports Spanish (primary, Mexico) and English. Spanish is the default.
- i18n via `next-intl` or similar.
- Notification templates support multiple languages based on `profiles.preferred_language`.

### 11.12 Offline Support (Washer)

- Washer app should work with intermittent connectivity (parking garages often have poor signal).
- Strategy: Service worker + local queue for photo uploads and status updates. Sync when connection restored.
- Photos captured offline are stored locally and batch-uploaded.
- Status updates queued in IndexedDB, pushed on reconnect.

### 11.13 Damage Dispute Workflow

```
1. Washer documents pre-wash damage (photos, annotations)
2. Wash completed, post-wash photos uploaded
3. Customer reviews evidence
4. IF customer claims NEW damage:
   a. Customer opens dispute with description
   b. Admin/manager reviews pre-wash vs post-wash photos
   c. Decision: resolved_customer (refund/repair) OR resolved_business (damage was pre-existing)
   d. If customer resolution: refund processed, washer flagged for review
5. All disputes logged in audit_log
```

### 11.14 Subscription Lifecycle Edge Cases

- **Payment fails**: Stripe webhook → set status `past_due`. Grace period (configurable, e.g., 3 days). If not resolved, pause subscription. Do not schedule new washes.
- **Plan upgrade**: Prorate immediately (Stripe handles proration). Update package_id on subscription. New services available from next wash.
- **Plan downgrade**: Takes effect at end of current period. Stripe handles billing. Schedule adjusts next period.
- **Pause/resume**: Customer can pause for up to N months (configurable). Stripe subscription paused. No washes scheduled during pause. Resume reactivates.

---

## 12. Implementation Phases

### Phase 0: Foundation (Week 1-2)

**Goal**: Project scaffolding, infrastructure, auth, basic data models.

- [ ] Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- [ ] Set up Supabase project (local dev with Supabase CLI)
- [ ] Create database migrations: enums, profiles, locations, location_operating_hours, location_staff, app_settings
- [ ] Implement Supabase Auth (email/password, profile creation trigger)
- [ ] Role-based middleware (Next.js middleware checks role, redirects to correct dashboard)
- [ ] Basic layouts for each role (customer, washer, manager, admin)
- [ ] Auth pages: login, register, forgot password
- [ ] Profile management page
- [ ] Admin: create/edit locations page
- [ ] Seed data: test locations, test users for each role

**Deliverable**: Users can sign up, log in, see role-appropriate empty dashboards. Admin can create locations.

---

### Phase 1: Office Building MVP (Week 3-6)

**Goal**: Complete subscription flow for office buildings. Customers can subscribe, washes get scheduled, washers complete them.

#### 1A: Cars & Services (Week 3)
- [ ] Create migrations: cars, service_catalog, wash_packages, package_location_pricing, premium_fees
- [ ] Customer: Add/manage cars (with photo upload to Supabase Storage)
- [ ] Admin: Manage service catalog (CRUD)
- [ ] Admin: Manage wash packages with pricing
- [ ] Customer: Browse packages at their location

#### 1B: Subscriptions & Payments (Week 3-4)
- [ ] Integrate Stripe: products, prices, subscriptions
- [ ] Create migrations: subscriptions, payments
- [ ] Subscription checkout flow (schedule preferences, Stripe Checkout)
- [ ] Stripe webhook handler (subscription created, renewed, cancelled, payment failed)
- [ ] Customer: View/manage subscriptions (pause, cancel, update preferences)
- [ ] Customer: Payment history

#### 1C: Booking & Scheduling (Week 4-5)
- [ ] Create migrations: bookings, waitlist
- [ ] Implement scheduling engine Edge Function
- [ ] Priority score calculation
- [ ] Auto-generate daily bookings from active subscriptions
- [ ] Washer assignment algorithm
- [ ] Admin/Manager: View and adjust daily schedule
- [ ] Customer: View upcoming washes

#### 1D: Wash Execution (Week 5-6)
- [ ] Create migrations: wash_sessions, evidence_photos, damage_reports
- [ ] Washer: Daily queue view
- [ ] Washer: Start wash workflow (pre-wash photos, damage documentation)
- [ ] Washer: Complete wash (post-wash photos)
- [ ] Customer: Real-time wash status tracking (Supabase Realtime)
- [ ] Push notification integration (wash started, completed)
- [ ] RLS policies for all Phase 1 tables

**Deliverable**: Full subscription lifecycle works. Customer subscribes at an office building, washes are automatically scheduled, washer completes washes with evidence photos, customer gets notified and can track status.

---

### Phase 2: Quality, Communication & One-Time Washes (Week 7-9)

#### 2A: Quality System (Week 7)
- [ ] Create migrations: quality_surveys, disputes
- [ ] Post-wash survey (sent 30 min after completion)
- [ ] Customer survey page (rate 1-5, comments)
- [ ] Washer performance score aggregation (trigger)
- [ ] Dispute creation and resolution workflow
- [ ] Admin: Dispute management page

#### 2B: Messaging & Upsells (Week 7-8)
- [ ] Create migrations: messages, upsell_offers
- [ ] In-app chat (Supabase Realtime)
- [ ] Chat UI for both customer and washer
- [ ] Washer: Create upsell offer (with photo)
- [ ] Customer: Accept/decline upsell in chat
- [ ] Upsell payment processing

#### 2C: One-Time Bookings (Week 8-9)
- [ ] One-time booking flow (select services, date, time, pay)
- [ ] Emergency/immediate wash booking with premium pricing
- [ ] Custom wash templates (save and reuse)
- [ ] Time slot management with availability display
- [ ] Premium fee application (time slot, emergency, one-time surcharge)
- [ ] Waitlist system implementation

**Deliverable**: Complete customer experience with quality feedback, chat, upsells, and one-time booking options.

---

### Phase 3: Inventory, Cost & Analytics (Week 10-12)

#### 3A: Inventory Management (Week 10)
- [ ] Create migrations: inventory_items, inventory_stock, inventory_transactions, service_material_requirements
- [ ] Admin: Manage inventory items
- [ ] Manager: View stock levels per location
- [ ] Washer: Log material usage per wash
- [ ] Low stock alerts (trigger + notification)
- [ ] Restock recording
- [ ] Inter-location transfers

#### 3B: Cost Tracking (Week 10-11)
- [ ] Create migrations: cost_records, washer_profiles (hourly_rate)
- [ ] Cost calculator Edge Function
- [ ] Auto-calculate costs on wash completion
- [ ] Profitability per wash, per location, per package
- [ ] Admin: Cost analytics dashboard

#### 3C: Analytics & Reporting (Week 11-12)
- [ ] Revenue analytics (charts: by location, by plan, trends)
- [ ] Customer analytics (retention, churn, LTV, satisfaction)
- [ ] Washer analytics (performance comparison, efficiency)
- [ ] Location analytics (capacity utilization, profitability)
- [ ] CSV/Excel export functionality
- [ ] Admin dashboard with KPI cards

**Deliverable**: Full business intelligence. Admins understand costs, profitability, and performance across all dimensions.

---

### Phase 4: Residential Model (Week 13-15)

#### 4A: Daily Offer System (Week 13-14)
- [ ] Create migrations: daily_offers, daily_offer_responses
- [ ] Manager/Admin: Create daily offers for residential locations
- [ ] Customer: View active offers for their building
- [ ] Acceptance flow with real-time counter ("8/10 neighbors signed up!")
- [ ] Threshold logic: auto-dispatch when minimum met
- [ ] Offer expiration handling
- [ ] Automated daily offer creation (configurable schedule)

#### 4B: Residential UX (Week 14-15)
- [ ] Residential customer dashboard (offer-centric, not subscription-centric)
- [ ] Social proof UI ("Your neighbors are booking!")
- [ ] One-tap booking from offer
- [ ] Residential-specific notifications
- [ ] Location type branching in all relevant UI flows

**Deliverable**: Residential building model fully operational with daily offer system.

---

### Phase 5: Loyalty, Referrals & Corporate (Week 16-17)

- [ ] Create migrations: referrals, loyalty_points, loyalty_transactions, corporate_accounts, corporate_account_members
- [ ] Referral code generation and sharing
- [ ] Referral reward processing
- [ ] Loyalty points system (earn on wash, redeem for services)
- [ ] Customer: Loyalty dashboard
- [ ] Corporate account management (admin)
- [ ] Corporate discount application
- [ ] Multi-car subscription discounts

**Deliverable**: Growth features (referrals, loyalty) and B2B corporate support.

---

### Phase 6: Multi-Location Scaling (Week 18-20)

- [ ] Cross-location staff pooling and assignment
- [ ] Staff rebalancing based on demand forecasting
- [ ] Location-specific pricing finalization
- [ ] Multi-location admin dashboard (compare locations)
- [ ] Add-a-location wizard (guided setup: hours, capacity, staff, pricing)
- [ ] Location-specific settings and overrides
- [ ] Washer availability management and time-off requests
- [ ] Advanced capacity planning (demand forecasting based on historical data)

**Deliverable**: System scales to N locations with minimal friction.

---

### Phase 7: Polish & Production (Week 21-23)

- [ ] PWA setup (manifest, service worker, offline washer support)
- [ ] Performance optimization (loading states, image optimization, caching)
- [ ] i18n (Spanish and English)
- [ ] Accessibility audit
- [ ] Security audit (RLS review, input validation, rate limiting)
- [ ] Error handling and error boundaries throughout
- [ ] Comprehensive logging and monitoring (Sentry)
- [ ] Load testing
- [ ] Documentation (API docs, user guides)
- [ ] Final UAT with real users

**Deliverable**: Production-ready application.

---

## 13. Third-Party Integrations

### 13.1 Payment Providers

#### Stripe (International cards + OXXO vouchers)

| Feature | Stripe Product |
|---|---|
| Subscriptions | Stripe Subscriptions with Products and Prices |
| One-time payments | Stripe Payment Intents |
| OXXO vouchers | Stripe Payment Intents with `payment_method_types: ['oxxo']` |
| Checkout | Stripe Checkout (hosted) or Stripe Elements (embedded) |
| Customer portal | Stripe Customer Portal (manage payment methods, invoices) |
| Webhooks | `customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`, `payment_intent.succeeded` |
| Refunds | Stripe Refunds API |
| Mexico support | Stripe is live in Mexico. Supports MXN, local cards, OXXO. |

#### MercadoPago (Primary for Mexico — most payment methods)

| Feature | MercadoPago Product |
|---|---|
| Subscriptions | Preapproval API (recurring payments) |
| One-time payments | Preferences API / Payment API |
| OXXO cash | Built-in via ticket payment method |
| SPEI transfers | Built-in bank transfer method |
| MP Wallet | Customer pays from MercadoPago balance |
| Cards | Visa, Mastercard, AMEX — local Mexican cards |
| Checkout | Checkout Pro (hosted) or Checkout API (custom) |
| Webhooks (IPN) | `payment.created`, `payment.updated`, `subscription_preapproval.updated` |
| Refunds | Refunds API |
| Installments (MSI) | Meses sin intereses — 3, 6, 12 month installments (huge in Mexico) |

#### Cash (Washer-Collected)

| Feature | How It Works |
|---|---|
| Collection | Washer taps "Collect Cash" in app after wash. Amount pre-filled. |
| Confirmation | Manager confirms cash deposit at end of day. |
| Reconciliation | Admin dashboard shows cash vs digital payments. Daily cash report. |
| Receipt | Customer gets digital receipt via notification/email. |
| Tracking | Every cash transaction logged with washer ID, timestamp, GPS. |

#### Payment Flow Decision Tree

```
Customer selects payment →
  ├── Card (Visa/MC/AMEX)?
  │   ├── Mexican card → MercadoPago Checkout API
  │   └── International card → Stripe Elements
  ├── OXXO (cash at store)?
  │   └── MercadoPago ticket OR Stripe OXXO voucher
  ├── SPEI (bank transfer)?
  │   └── MercadoPago SPEI
  ├── MercadoPago Wallet?
  │   └── MercadoPago Checkout Pro
  ├── MSI (installments)?
  │   └── MercadoPago with installment config
  └── Cash (on-site)?
      └── Booking marked "cash" → washer collects → manager confirms
```

### 13.2 Push Notifications

- **Web**: Web Push API with service worker (via `web-push` library)
- **Mobile**: Firebase Cloud Messaging (if building native wrapper)
- **Triggered by**: Database webhooks from Supabase → Edge Function → send push

### 13.3 Image Processing

- Supabase Storage for raw uploads
- Image transformations via Supabase Storage transforms (resize, thumbnails)
- Consider Cloudinary if more advanced image processing needed (annotations, comparisons)

### 13.4 Email

- Supabase Auth emails (confirmation, password reset)
- Transactional emails via Resend or SendGrid (receipts, weekly summaries)

---

## 14. Testing Strategy

### 14.1 Levels

| Level | Tool | Coverage |
|---|---|---|
| Unit tests | Vitest | Scheduling algorithm, cost calculator, priority scoring, utility functions |
| Component tests | Testing Library + Vitest | Form components, booking flow, status displays |
| Integration tests | Playwright | Full user flows: register → subscribe → wash lifecycle |
| API tests | Supabase test helpers | Edge Function inputs/outputs, RLS policy validation |
| E2E tests | Playwright | Cross-role flows: admin creates location, customer subscribes, washer completes |

### 14.2 Key Test Scenarios

1. **Subscription lifecycle**: Subscribe → schedule generated → wash completed → survey → renewal
2. **Cancellation flow**: Cancel booking early, cancel late (fee), cancel subscription
3. **No-show handling**: Washer marks no-show, customer notified, rescheduling
4. **Weather delay**: Admin marks weather delay, bookings rescheduled
5. **Upsell flow**: Washer sends upsell → customer accepts → payment processed
6. **Dispute flow**: Customer claims damage → admin reviews → resolution
7. **Residential offer**: Offer sent → threshold met → team dispatched → washes completed
8. **Multi-location assignment**: Washer assigned across locations based on demand
9. **RLS enforcement**: Customer A cannot see Customer B's data, washer only sees assigned bookings
10. **Payment failure**: Stripe payment fails → subscription paused → customer notified → payment updated → resumed

---

## 15. Deployment & DevOps

### 15.1 Environments

| Environment | Purpose | Supabase Project | Vercel |
|---|---|---|---|
| Local | Development | Supabase CLI (local) | `next dev` |
| Staging | QA/Testing | Separate Supabase project | Vercel preview |
| Production | Live | Production Supabase project | Vercel production |

### 15.2 CI/CD Pipeline

```
Push to branch →
  GitHub Actions:
    1. Lint (ESLint)
    2. Type check (tsc)
    3. Unit tests (Vitest)
    4. Build check (next build)
    5. If PR → Vercel preview deployment
    6. If merge to main → Vercel production deployment + Supabase migration
```

### 15.3 Database Migration Workflow

```
1. Create migration: supabase migration new <name>
2. Write SQL in supabase/migrations/
3. Test locally: supabase db reset
4. Push to staging: supabase db push --linked
5. Verify on staging
6. Push to production: supabase db push --linked (production project)
```

### 15.4 Environment Variables

```
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
SENTRY_DSN=
RESEND_API_KEY=
VAPID_PUBLIC_KEY=     # Web Push
VAPID_PRIVATE_KEY=    # Web Push
```

---

This plan is designed to be implemented incrementally. Each phase builds on the previous one, and the MVP (Phases 0-1) delivers real business value: a working subscription carwash service for office buildings. Every subsequent phase adds capabilities without requiring architectural changes.

---

### Critical Files for Implementation

- `/Users/jeroenciso/Desktop/carwash/supabase/migrations/` (directory) - All database schema migrations; the foundation of the entire application. Must be created first and accurately reflect the schema defined in Section 2.
- `/Users/jeroenciso/Desktop/carwash/src/lib/scheduling/fair-scheduler.ts` - Core scheduling algorithm implementation (Section 7); the most complex business logic in the system.
- `/Users/jeroenciso/Desktop/carwash/src/middleware.ts` - Next.js middleware for auth and role-based routing; gates the entire application experience per user type.
- `/Users/jeroenciso/Desktop/carwash/supabase/functions/stripe-webhook/index.ts` - Stripe webhook handler; critical for subscription lifecycle, payment processing, and revenue tracking.
- `/Users/jeroenciso/Desktop/carwash/src/lib/supabase/client.ts` - Supabase client configuration; used by every page and component for data access, realtime subscriptions, and auth.
