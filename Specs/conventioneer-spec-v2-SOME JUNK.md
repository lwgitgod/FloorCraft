# Conventioneer — Engineering Specification

**Version 2.0 | March 31, 2026**
**Grounded in the Executive Summary (Revised) and actual JOGS operations**

---

## Guiding Principles

1. **Build for the real business, not a hypothetical one.** Vitaly runs 3–4 shows per year across 2–3 venues. Not 50. Not yet.
2. **Owned venue ≠ rented venue.** At Tucson, he's the landlord AND the promoter AND the general contractor. At Vegas, he's just a tenant with a floor plan. The software must model both without forcing one into the other's shape.
3. **The exhibitor network is the product.** 400+ vendors from 26 countries, cultivated over 20 years. Every feature should make that network easier to manage, move, and monetize across shows.
4. **Don't rebuild what works.** WordPress site stays. Airtable stays for vendors. We replace what's broken (Eventbrite, spreadsheets, manual invoicing) and leave what isn't.
5. **Rectangles on an image.** The floor plan is not AutoCAD. It's colored rectangles on a venue photo. Build accordingly.

---

## System Architecture Overview

### Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js (React) | SSR for public pages, SPA for portals/dashboards |
| Backend API | Python (FastAPI) | Async, auto-generated OpenAPI docs |
| Database | PostgreSQL 16 | Row-level security for multi-tenancy |
| Cache / Sessions | Redis | JWT refresh tokens, rate limiting |
| File Storage | S3 (or compatible) | Images, documents, PDFs, floor plan backgrounds |
| Payments | Stripe Connect | Multi-currency, connected accounts per org |
| Email | SendGrid | Transactional + bulk |
| SMS | Twilio | International (26 countries of exhibitors) |
| Search | PostgreSQL full-text search | Good enough for 500 exhibitors. Upgrade to OpenSearch if needed. |
| Task Queue | Celery + Redis | Async jobs: email, PDF generation, Airtable sync |

### Multi-Tenancy

Row-level security with `org_id` on every tenant table. Day one this serves only JOGS International Exhibits. But the schema supports additional organizations without migration, so if a franchise model materializes, the database is ready.

---

## Domain Model

This is the real entity map, based on how Vitaly's business actually works.

```
ORGANIZATION (JOGS International Exhibits)
│
├── VENUES (physical locations)
│   ├── Tucson Expo Center ────── owned=true, services_managed=true
│   ├── The Expo at World Market Center, LV ── owned=false, services_managed=false
│   └── San Diego Convention Center ── owned=false, services_managed=false
│
├── SHOWS (event instances)
│   ├── JOGS Tucson Winter 2027
│   │   venue = Tucson Expo Center
│   │   promoter = Vitaly
│   │   services_managed = true (inherits from venue.owned)
│   │
│   ├── JOGS Las Vegas 2027
│   │   venue = World Market Center
│   │   promoter = Vitaly
│   │   services_managed = false
│   │
│   ├── JOGS Tucson Fall 2027
│   │   venue = Tucson Expo Center
│   │   promoter = Vitaly
│   │   services_managed = true
│   │
│   └── ELEMENTS Las Vegas 2027 (show-within-a-show)
│       venue = World Market Center
│       parent_show = JOGS Las Vegas 2027
│       promoter = Vitaly
│       services_managed = false
│
├── EXHIBITORS (the crown jewels — 500+ companies across all shows)
│   ├── Nativa Gems (Brazil) ─── shows: Tucson Winter, Las Vegas
│   ├── Stone Harmonia USA (Ukraine) ─── shows: Tucson Winter
│   ├── Marianovich Gems (USA) ─── shows: Tucson Winter, Tucson Fall
│   └── ... 400+ more
│
├── VENUE EVENTS (non-JOGS events at Tucson Expo Center)
│   ├── GunTV Show — Jan 2027 (3rd-party promoter)
│   ├── Quilt & Sewing Festival — Mar 2027 (3rd-party)
│   ├── Reptilian Nation Expo — Apr 2027 (3rd-party)
│   ├── Concert — May 2027 (private booking)
│   └── Wedding — Jun 2027 (private booking)
│
└── SERVICE VENDORS (Tucson only)
    ├── Electrician company
    ├── I&D labor crew
    ├── Furniture rental company
    └── Drayage/freight handler
```

### The Critical Boolean: `services_managed`

Every show has a boolean (derived from its venue) that determines whether the Exhibitor Services Marketplace (Module 8) is active for that show.

- `services_managed = true` → Exhibitors can order electrical, furniture, I&D, drayage, etc. through Conventioneer. Vitaly manages the vendors.
- `services_managed = false` → The services tab doesn't exist for exhibitors at this show. The venue handles its own logistics. Conventioneer only manages exhibitor relationships, booth assignments, and payments for booth fees.

This one flag eliminates the architectural confusion that plagued the original spec.

---

## Module Breakdown

### Module 1: Exhibitor CRM & Multi-Show Pipeline
### Module 2: Ticketing & Attendee Registration (Replace Eventbrite)
### Module 3: Floor Plan & Booth Sales
### Module 4: Invoicing & Payment Collection
### Module 5: Show Management & Cloning
### Module 6: Venue Calendar (Tucson Expo Center)
### Module 7: Exhibitor Services Marketplace (Owned Venues Only)
### Module 8: Vendor Operations & Airtable Sync
### Module 9: Exhibitor Portal (Self-Service)
### Module 10: Promoter Dashboard
### Module 11: Communications & Notifications
### Module 12: Exhibitor Routing (Cross-Show Campaigns)

---

## Module 1: Exhibitor CRM & Multi-Show Pipeline

**This is Pain #1 — the exhibitor Rolodex is a spreadsheet. This module is the heart of the system.**

### What It Replaces

Spreadsheets, email threads, Vitaly's memory.

### Data Model

```sql
tenant.exhibitors (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  -- Company identity
  company_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),            -- DBA or brand name
  tax_id_encrypted TEXT,              -- encrypted at rest
  country VARCHAR(3) NOT NULL,        -- ISO 3166 alpha-3
  address JSONB,                      -- {street, city, state, zip, country}
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(500),
  -- Profile
  description TEXT,
  product_categories TEXT[] DEFAULT '{}',  -- ['baltic_amber', 'turquoise', 'silver_jewelry']
  company_size VARCHAR(20),           -- solo, small, medium, large
  social_links JSONB,
  -- Documents
  business_license_url TEXT,
  insurance_cert_url TEXT,
  tax_exempt_cert_url TEXT,
  -- Classification
  tags TEXT[] DEFAULT '{}',           -- ['vip', 'first_timer', 'international', 'amber_specialist']
  -- Lifecycle
  first_show_date DATE,
  total_shows_attended INTEGER DEFAULT 0,
  lifetime_revenue DECIMAL DEFAULT 0, -- auto-calculated
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, blacklisted
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.exhibitor_contacts (
  id UUID PRIMARY KEY,
  exhibitor_id UUID NOT NULL REFERENCES tenant.exhibitors(id),
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  title VARCHAR(100),
  role VARCHAR(30),                   -- primary, billing, onsite_manager, badge_holder
  is_primary BOOLEAN DEFAULT false,
  user_id UUID,                       -- links to auth system for portal login
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.exhibitor_images (
  id UUID PRIMARY KEY,
  exhibitor_id UUID NOT NULL,
  org_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  caption VARCHAR(255),
  sort_order INTEGER DEFAULT 0
);
```

### The Multi-Show Pipeline

This is what makes Conventioneer different from a generic CRM. An exhibitor's relationship to the organization spans multiple shows. We track their status per show independently.

```sql
tenant.exhibitor_show_status (
  id UUID PRIMARY KEY,
  exhibitor_id UUID NOT NULL,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  -- Pipeline stage
  status VARCHAR(30) NOT NULL DEFAULT 'prospect',
    -- prospect → invited → applied → approved → contract_sent →
    -- contract_signed → booth_assigned → deposit_paid → fully_paid →
    -- checked_in → completed → archived
    -- (or: declined, cancelled, waitlisted at any point)
  -- Key dates
  invited_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  contract_signed_at TIMESTAMPTZ,
  deposit_paid_at TIMESTAMPTZ,
  fully_paid_at TIMESTAMPTZ,
  checked_in_at TIMESTAMPTZ,
  -- References
  booth_id UUID,                      -- assigned booth (from Module 3)
  contract_url TEXT,                  -- signed contract PDF
  application_data JSONB,            -- any show-specific application fields
  -- Notes
  notes TEXT,
  status_history JSONB DEFAULT '[]', -- [{status, changed_at, changed_by, note}]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (exhibitor_id, show_id)
);
```

### CRM Features

**Search & Filter:**
- Full-text search on company name, trade name, description, product categories
- Filter by: country, product category, tags, status (across any show or specific show), total shows attended, lifetime revenue, last show date
- Saved searches (e.g., "International amber exhibitors with 2+ shows who haven't confirmed for Las Vegas")

**Pipeline View (per show):**
- Kanban board: columns = pipeline stages, cards = exhibitors
- Drag to advance stage (with validation — can't skip required steps)
- Counts per stage + total revenue at each stage
- Filter by pavilion, exhibitor country, booth type

**Cross-Show View (per exhibitor):**
- Timeline: every show they've participated in, with booth number, revenue, and status
- "At a glance" card: shows confirmed, shows pending, total lifetime value
- Quick action: "Invite to [Show X]" — creates a prospect record for the next show

**Bulk Operations:**
- Select multiple exhibitors → bulk invite to a show, bulk tag, bulk email
- CSV import (for initial migration from spreadsheets)
- CSV export (for mail merges, reports)

**Auto-Tagging Rules:**
- 3+ shows attended → tag "loyal"
- Lifetime revenue > $10K → tag "high_value"
- International → tag "international"
- No shows in 12+ months → tag "lapsed"
- Rules are configurable by the promoter

### API Endpoints

```
GET    /api/v1/exhibitors                    # List with search/filter/pagination
POST   /api/v1/exhibitors                    # Create
GET    /api/v1/exhibitors/:id                # Get with all contacts, images, show history
PATCH  /api/v1/exhibitors/:id                # Update
DELETE /api/v1/exhibitors/:id                # Soft delete

GET    /api/v1/exhibitors/:id/contacts       # List contacts
POST   /api/v1/exhibitors/:id/contacts       # Add contact
PATCH  /api/v1/exhibitors/:id/contacts/:cid  # Update contact
DELETE /api/v1/exhibitors/:id/contacts/:cid  # Remove contact

GET    /api/v1/exhibitors/:id/shows          # Show participation history
POST   /api/v1/exhibitors/:id/shows          # Add to a show (create prospect record)
PATCH  /api/v1/exhibitors/:id/shows/:showId  # Update status for a show

GET    /api/v1/shows/:showId/pipeline        # Pipeline view for a show
PATCH  /api/v1/shows/:showId/pipeline/bulk   # Bulk status update

POST   /api/v1/exhibitors/import             # CSV import
GET    /api/v1/exhibitors/export             # CSV export
```

**~18 endpoints**

---

## Module 2: Ticketing & Attendee Registration

**This is Pain #2 — Eventbrite is eating $150K–$300K/year in fees.**

### What It Replaces

Eventbrite.

### Ticket Types (per show)

| Type | Price | Requirements | Badge |
|---|---|---|---|
| Wholesale Buyer | Free | Tax ID or resale certificate or business license or guild card | "BUYER" badge |
| Retail Guest | $20–$35 (configurable) | None | "GUEST" badge |
| Multi-Day Pass | $25–$50 | None | "MULTI-DAY" badge |
| VIP | Configurable | Invitation or payment | "VIP" badge |
| Exhibitor Badge | Free (included with booth) | Booth reservation | "EXHIBITOR" badge + company name |
| Exhibitor Staff | Free or small fee | Listed by exhibitor | "EXHIBITOR STAFF" badge |

### Registration Flow

**Wholesale Buyer (most important — this is the revenue-generating audience):**
1. Land on registration page (linked from jogsshow.com)
2. Enter name, email, company, phone
3. Select credential type: Tax ID / Resale Certificate / Business License / Guild Membership
4. Upload credential document (photo or PDF)
5. Submit → status = `pending_verification`
6. Promoter staff reviews credential (admin tool: queue of pending reviews with uploaded doc preview, approve/reject buttons)
7. On approve → registrant receives email with QR badge (PDF attachment + Apple/Google Wallet pass)
8. Auto-approve rule: if same email registered and was approved at a previous show, auto-approve

**Retail Guest:**
1. Enter name, email
2. Select ticket type, apply promo code if any
3. Pay via Stripe checkout
4. Receive QR badge by email

**Exhibitor Badges:**
- Exhibitor admin (in the exhibitor portal, Module 9) submits a badge list: names and roles for their booth staff
- System generates badges automatically
- No separate registration needed

### Credential Verification Admin Tool

```
┌──────────────────────────────────────────────────────────────┐
│ Credential Review Queue — JOGS Tucson Winter 2027            │
│ Pending: 47 | Approved Today: 123 | Rejected: 3             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌── John Smith, Gems Plus LLC ──────────────────────────┐   │
│ │ Credential: Tax ID (uploaded Jan 15)                   │   │
│ │ ┌──────────────────┐                                   │   │
│ │ │  [preview of      │  Previously approved: Yes (2026)  │   │
│ │ │   uploaded doc]   │  Shows attended: 2                │   │
│ │ └──────────────────┘                                   │   │
│ │         [✓ Approve]  [✗ Reject]  [? Flag for Review]   │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌── Maria Garcia, Plata Fina SA ────────────────────────┐   │
│ │ Credential: Business License (uploaded Jan 16)         │   │
│ │ ┌──────────────────┐                                   │   │
│ │ │  [preview of      │  Previously approved: No (new)    │   │
│ │ │   uploaded doc]   │  Shows attended: 0                │   │
│ │ └──────────────────┘                                   │   │
│ │         [✓ Approve]  [✗ Reject]  [? Flag for Review]   │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Badge Generation

- QR code encodes: `{attendee_id, show_id, badge_type}` (signed with HMAC to prevent forgery)
- Badge PDF: show logo + attendee name + company + badge type + QR code
- Emailed as PDF attachment
- Also available as Apple Wallet / Google Wallet pass (use `passkit-generator` for Apple, Google Wallet API)
- On-site: scan QR → verify → print physical badge (thermal printer, Module within on-site ops)

### Data Model

```sql
tenant.ticket_types (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  capacity INTEGER,                    -- null = unlimited
  sold_count INTEGER DEFAULT 0,
  requires_credential BOOLEAN DEFAULT false,
  credential_types TEXT[],             -- ['tax_id', 'resale_cert', 'business_license', 'guild_card']
  sale_start TIMESTAMPTZ,
  sale_end TIMESTAMPTZ,
  sort_order INTEGER,
  status VARCHAR(20) DEFAULT 'active'  -- active, paused, sold_out, archived
);

tenant.attendees (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.registrations (
  id UUID PRIMARY KEY,
  attendee_id UUID NOT NULL,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  ticket_type_id UUID NOT NULL,
  -- Credential
  credential_type VARCHAR(30),
  credential_document_url TEXT,
  credential_status VARCHAR(20) DEFAULT 'not_required',
    -- not_required, pending, approved, rejected
  credential_reviewed_by UUID,
  credential_reviewed_at TIMESTAMPTZ,
  auto_approved BOOLEAN DEFAULT false,
  -- Payment
  price_paid DECIMAL NOT NULL DEFAULT 0,
  promo_code VARCHAR(50),
  stripe_payment_intent_id TEXT,
  payment_status VARCHAR(20) DEFAULT 'free', -- free, paid, refunded
  -- Badge
  badge_type VARCHAR(30),
  badge_qr_data TEXT,
  badge_pdf_url TEXT,
  -- Check-in
  checked_in_at TIMESTAMPTZ,
  check_in_count INTEGER DEFAULT 0,
  --
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.promo_codes (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(10),          -- percent, fixed
  discount_value DECIMAL,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'active'
);
```

### API Endpoints

```
# Public (no auth)
POST   /api/v1/shows/:showId/register         # Register as attendee
GET    /api/v1/shows/:showId/ticket-types      # Available ticket types

# Admin
GET    /api/v1/shows/:showId/registrations               # List all registrations
GET    /api/v1/shows/:showId/registrations/pending-review # Credential review queue
PATCH  /api/v1/shows/:showId/registrations/:id/review    # Approve/reject credential
GET    /api/v1/shows/:showId/registrations/stats          # Registration counts by type/status

# Promo codes
POST   /api/v1/shows/:showId/promo-codes
GET    /api/v1/shows/:showId/promo-codes
PATCH  /api/v1/shows/:showId/promo-codes/:id
DELETE /api/v1/shows/:showId/promo-codes/:id
```

**~10 endpoints**

---

## Module 3: Floor Plan & Booth Sales

**Pain #3 — booth sales are manual. Pain #7 — no knowledge carries across shows.**

### The Reality of the Floor Plan

Based on the actual 2020 JOGS floor plan:
- 4 indoor halls + outdoor tent areas, all at the Tucson Expo Center
- ~12 named pavilions (Amber, Silver Jewelry, Southwestern/Turquoise, International Mineral & Gem Décor, etc.)
- 400–500 rectangular booths in grid layouts within pavilions
- 3–4 booth sizes (small inline ~10×10, medium ~10×20, large island ~20×20, outdoor tent plots)
- Floor plan for Las Vegas and San Diego would be different venue, different layout, but same concept: rectangles in zones

### How It Works

**Background image approach:**
- Admin uploads the venue floor plan as an image (PNG, JPG, or PDF → rasterized)
- This is the same map image already distributed in exhibitor kits and on the JOGS website
- Pavilions are positioned as semi-transparent colored overlays on the image
- Booths are positioned as interactive rectangles within pavilions

**This is NOT a CAD tool.** There's no polygon drawing, no spatial geometry engine, no PostGIS. The floor plan is a picture with clickable rectangles on it.

### Editor Features

**Pavilion management:**
- Add pavilion: draw a rectangle on the background image (click-drag), name it, assign a color
- Reposition/resize pavilion overlay by dragging
- Associate pavilion with a hall

**Booth management:**
- "Add Row" tool: click inside a pavilion, specify count + size + numbering prefix → generates a row of booth rectangles
- "Add Single Booth" tool: click to place one booth rectangle
- Click a booth to edit: number, size, type (inline/corner/island/outdoor), pricing tier, status, assigned exhibitor
- Drag to reposition, drag edges to resize
- Multi-select (Shift+click) for bulk operations: assign pavilion, set pricing tier, set status
- Delete, duplicate

**Booth status colors:**
- Green = available
- Blue = sold
- Yellow = held (with timer)
- Orange = reserved (awaiting payment)
- Gray = blocked / not for sale
- Pavilion tint underneath

**Show cloning:**
- "Clone from: [JOGS Winter 2026 ▼]" → copies all pavilions, booths, positions, pricing
- Exhibitor assignments optionally carried forward as "pending_renewal" status
- Admin adjusts layout (add/remove booths, change pavilion sizes)

### Viewer Features (Public + Exhibitor Portal)

- Zoom/pan (CSS transform + `react-zoom-pan-pinch`, works on mobile)
- Search by exhibitor name or booth number → highlight matching booth + auto-scroll
- Filter by pavilion (checkbox toggles), by availability, by product category
- Click booth → detail panel: exhibitor info + "Reserve This Booth" button (if available)
- Color-coded legend

### Booth Reservation Flow

1. Exhibitor browses floor plan in the viewer (logged in via exhibitor portal)
2. Clicks available booth → sees size, price, what's included, neighboring exhibitors
3. Clicks "Reserve" → booth status changes to `held` (15-minute timer)
4. Completes reservation form: confirm company details, agree to terms
5. Pays deposit via Stripe (or requests invoice for wire transfer)
6. On payment → booth status = `sold`, exhibitor assigned, confirmation email sent
7. If timer expires without payment → booth reverts to `available`, exhibitor notified

**Admin can also assign booths manually** — search for exhibitor, drag them onto the floor plan, or pick a booth and assign via dropdown. This is how VIP and returning exhibitors get handled.

### Priority System

- Returning exhibitors get first pick (configurable: by number of shows attended, by total spend, by manual VIP tag)
- Booth selection opens in waves: Wave 1 (VIP/loyal) → Wave 2 (returning) → Wave 3 (open to all)
- Waves are time-gated (e.g., Wave 1 opens Jan 1, Wave 2 opens Jan 15, Wave 3 opens Feb 1)
- Previous booth preference: system flags "Exhibitor X had booth A101 last year — it's currently available"

### Data Model

```sql
tenant.floor_plans (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  background_image_url TEXT,
  background_width_px INTEGER,
  background_height_px INTEGER,
  cloned_from_show_id UUID,
  status VARCHAR(20) DEFAULT 'draft', -- draft, published
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.pavilions (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  floor_plan_id UUID NOT NULL,
  org_id UUID NOT NULL,
  hall_name VARCHAR(100),              -- "North Hall", "East Hall", "Outdoor Tents"
  name VARCHAR(100) NOT NULL,          -- "Amber Pavilion"
  color VARCHAR(7) NOT NULL,           -- "#FF9900"
  description TEXT,
  -- Position on the background image (percentage-based for responsiveness)
  map_x DECIMAL NOT NULL,              -- % from left
  map_y DECIMAL NOT NULL,              -- % from top
  map_width DECIMAL NOT NULL,          -- % of image width
  map_height DECIMAL NOT NULL,         -- % of image height
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.booths (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  floor_plan_id UUID NOT NULL,
  pavilion_id UUID NOT NULL,
  org_id UUID NOT NULL,
  -- Identity
  booth_number VARCHAR(20) NOT NULL,
  -- Size
  width_ft DECIMAL NOT NULL,
  depth_ft DECIMAL NOT NULL,
  sqft DECIMAL GENERATED ALWAYS AS (width_ft * depth_ft) STORED,
  -- Position on background image (percentage-based)
  map_x DECIMAL NOT NULL,
  map_y DECIMAL NOT NULL,
  map_width DECIMAL NOT NULL,
  map_height DECIMAL NOT NULL,
  -- Classification
  booth_type VARCHAR(20) DEFAULT 'inline', -- inline, corner, island, end_cap, outdoor
  pricing_tier VARCHAR(20) DEFAULT 'standard',
  base_price DECIMAL,
  -- Status
  status VARCHAR(20) DEFAULT 'available',
    -- available, held, reserved, sold, blocked, not_for_sale
  assigned_exhibitor_id UUID REFERENCES tenant.exhibitors(id),
  hold_expires_at TIMESTAMPTZ,
  -- Cross-show reference
  previous_show_booth_number VARCHAR(20), -- "Was A101 in Winter 2026"
  previous_show_exhibitor_id UUID,
  --
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (show_id, booth_number)
);

tenant.booth_reservations (
  id UUID PRIMARY KEY,
  booth_id UUID NOT NULL,
  show_id UUID NOT NULL,
  exhibitor_id UUID NOT NULL,
  org_id UUID NOT NULL,
  reservation_type VARCHAR(20),        -- self_service, admin_assigned, priority_wave
  priority_wave INTEGER,               -- 1, 2, 3
  price DECIMAL NOT NULL,
  deposit_amount DECIMAL,
  deposit_paid_at TIMESTAMPTZ,
  fully_paid_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  terms_accepted_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled, transferred
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.booth_selection_waves (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  wave_number INTEGER NOT NULL,
  name VARCHAR(100),                   -- "VIP & Loyal Exhibitors", "Returning", "Open"
  opens_at TIMESTAMPTZ NOT NULL,
  criteria JSONB,                      -- {"min_shows": 3} or {"tags": ["vip"]} or null (open)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Technology

| Component | Tech | Why |
|---|---|---|
| Background image | `<img>` in a scrollable container | It's an image |
| Zoom/pan | `react-zoom-pan-pinch` (8KB library) | Touch support, smooth, lightweight |
| Pavilion overlays | Absolutely positioned `<div>` with colored background + opacity | CSS |
| Booth rectangles | Absolutely positioned `<div>` inside the container | CSS |
| Drag/resize (editor) | `@dnd-kit/core` or native pointer events | Standard, well-tested |
| Selection | React state: `Set<boothId>` | Simple |
| Properties panel | Form bound to selected booth | React forms |
| Export PNG | `html2canvas` (browser-side screenshot) | No server-side rendering needed |
| Export PDF | `html2canvas` → `jsPDF` | Client-side, 20 lines |

### API Endpoints

```
GET    /api/v1/shows/:showId/floor-plan            # Full floor plan (background + pavilions + booths)
PUT    /api/v1/shows/:showId/floor-plan             # Save all floor plan data
POST   /api/v1/shows/:showId/floor-plan/background  # Upload background image
POST   /api/v1/shows/:showId/floor-plan/clone       # Clone from another show

POST   /api/v1/shows/:showId/pavilions              # Create pavilion
PATCH  /api/v1/shows/:showId/pavilions/:id          # Update
DELETE /api/v1/shows/:showId/pavilions/:id          # Delete

POST   /api/v1/shows/:showId/booths                 # Create (single or batch row)
PATCH  /api/v1/shows/:showId/booths/:id             # Update
PATCH  /api/v1/shows/:showId/booths/bulk             # Bulk update
DELETE /api/v1/shows/:showId/booths/:id             # Delete
GET    /api/v1/shows/:showId/booths/search?q=       # Search

POST   /api/v1/shows/:showId/booths/:id/reserve     # Start reservation (hold timer)
POST   /api/v1/shows/:showId/booths/:id/confirm     # Confirm reservation (after payment)
POST   /api/v1/shows/:showId/booths/:id/cancel      # Cancel reservation
POST   /api/v1/shows/:showId/booths/:id/assign      # Admin assign exhibitor to booth

GET    /api/v1/shows/:showId/selection-waves         # List waves
POST   /api/v1/shows/:showId/selection-waves         # Create/update waves
```

**~18 endpoints**

---

## Module 4: Invoicing & Payment Collection

**Pain #4 — invoicing is fragmented, payment chasing is a full-time job.**

### What It Does

Consolidates everything an exhibitor owes for a show into one invoice: booth fee + deposit schedule + service charges (Tucson only) + sponsorships. Tracks payment status. Sends reminders. Integrates with Stripe for card/ACH and supports manual tracking for wire transfers (international exhibitors).

### Invoice Line Item Sources

| Source | Module | Applies When |
|---|---|---|
| Booth reservation fee | Module 3 | Always |
| Booth deposit (installment 1) | Module 3 | If payment schedule configured |
| Booth balance (installment 2+) | Module 3 | If payment schedule configured |
| Electrical service order | Module 7 | Only at owned venues (services_managed=true) |
| Furniture rental | Module 7 | Only at owned venues |
| I&D labor | Module 7 | Only at owned venues |
| Drayage | Module 7 | Only at owned venues |
| Sponsorship package | Module 5 | If exhibitor purchased sponsorship |
| Additional badges | Module 2 | If exhibitor orders extra staff badges |

### Payment Methods

| Method | Implementation | Common For |
|---|---|---|
| Credit card | Stripe Checkout | Domestic exhibitors |
| ACH / bank transfer | Stripe ACH | Domestic exhibitors, larger amounts |
| Wire transfer | Manual tracking (admin marks as received) | International exhibitors |
| Check | Manual tracking | Some domestic |

### Payment Schedules

- Configurable per show: e.g., 50% deposit due on contract signing, 50% balance due 30 days before show
- Or: single full payment
- Or: 3 installments (30/30/40)
- System auto-generates installment invoices on schedule
- Late payment reminders: configurable (7-day, 14-day, 30-day overdue emails)

### Data Model

```sql
tenant.invoices (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  show_id UUID NOT NULL,
  exhibitor_id UUID NOT NULL,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,  -- auto-generated: "INV-2027-TUCW-0001"
  -- Amounts
  subtotal DECIMAL NOT NULL,
  tax DECIMAL DEFAULT 0,
  total DECIMAL NOT NULL,
  amount_paid DECIMAL DEFAULT 0,
  amount_due DECIMAL GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency VARCHAR(3) DEFAULT 'USD',
  -- Schedule
  due_date DATE,
  installment_number INTEGER,          -- 1, 2, 3... (null if single payment)
  installment_of INTEGER,              -- total installments (null if single)
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
    -- draft, sent, partially_paid, paid, overdue, void, refunded
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  -- Metadata
  pdf_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.invoice_lines (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  org_id UUID NOT NULL,
  description VARCHAR(500) NOT NULL,
  source_type VARCHAR(30),             -- booth_reservation, service_order, sponsorship, badge
  source_id UUID,                      -- FK to the originating record
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL NOT NULL,
  tax_rate DECIMAL DEFAULT 0,
  line_total DECIMAL NOT NULL,
  sort_order INTEGER
);

tenant.payments (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL,
  org_id UUID NOT NULL,
  amount DECIMAL NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  payment_method VARCHAR(20),          -- stripe_card, stripe_ach, wire, check, cash
  stripe_payment_intent_id TEXT,
  reference_number VARCHAR(100),       -- for wire/check: bank reference or check number
  status VARCHAR(20) DEFAULT 'completed', -- completed, pending, failed, refunded
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID,                    -- admin user who recorded (for manual payments)
  notes TEXT
);

tenant.payment_schedules (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  name VARCHAR(100),                   -- "Standard 50/50", "3 Installments"
  installments JSONB NOT NULL,         -- [{percent: 50, due_days_before_show: 90}, {percent: 50, due_days_before_show: 30}]
  is_default BOOLEAN DEFAULT false
);
```

### API Endpoints

```
GET    /api/v1/shows/:showId/invoices                  # List invoices for a show
GET    /api/v1/exhibitors/:id/invoices                 # List invoices for an exhibitor (across shows)
POST   /api/v1/invoices                                # Create invoice (usually auto-generated)
GET    /api/v1/invoices/:id                            # Get invoice with lines
PATCH  /api/v1/invoices/:id                            # Update (add line, adjust, void)
POST   /api/v1/invoices/:id/send                       # Send invoice email
GET    /api/v1/invoices/:id/pdf                        # Generate/download PDF

POST   /api/v1/invoices/:id/payments                   # Record a payment
GET    /api/v1/invoices/:id/payments                   # Payment history
POST   /api/v1/invoices/:id/payments/stripe-checkout   # Create Stripe checkout session
POST   /api/v1/invoices/:id/refund                     # Process refund

GET    /api/v1/shows/:showId/payment-schedules         # List payment schedules
POST   /api/v1/shows/:showId/payment-schedules         # Create
```

**~14 endpoints**

---

## Module 5: Show Management & Cloning

### Data Model

```sql
tenant.venues (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  address JSONB,
  owned BOOLEAN NOT NULL DEFAULT false,        -- THE critical flag
  services_managed BOOLEAN NOT NULL DEFAULT false, -- usually = owned
  total_sqft INTEGER,
  parking_spaces INTEGER,
  description TEXT,
  photos TEXT[],
  contact JSONB,
  status VARCHAR(20) DEFAULT 'active'
);

tenant.shows (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  venue_id UUID NOT NULL REFERENCES tenant.venues(id),
  parent_show_id UUID,                         -- for show-within-a-show (ELEMENTS)
  -- Identity
  name VARCHAR(255) NOT NULL,                  -- "JOGS Tucson Winter 2027"
  slug VARCHAR(100) NOT NULL,
  show_type VARCHAR(30),                       -- trade_show, consumer_expo, hybrid
  industry VARCHAR(100),                       -- "gem_jewelry", "firearms", "quilting"
  -- Derived from venue (cached for convenience)
  services_managed BOOLEAN NOT NULL DEFAULT false,
  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_hours JSONB,                           -- [{"date": "2027-01-28", "open": "10:00", "close": "18:00"}, ...]
  move_in_start TIMESTAMPTZ,
  move_in_end TIMESTAMPTZ,
  move_out_start TIMESTAMPTZ,
  move_out_end TIMESTAMPTZ,
  -- Branding
  logo_url TEXT,
  color_primary VARCHAR(7),
  color_secondary VARCHAR(7),
  tagline VARCHAR(255),
  description TEXT,
  website_url VARCHAR(500),                    -- external link (WordPress)
  -- Lifecycle
  status VARCHAR(30) DEFAULT 'draft',
    -- draft, accepting_applications, booth_selection, advance_ordering,
    -- at_show, live, closed, archived
  cloned_from_show_id UUID,
  -- Config
  settings JSONB DEFAULT '{}',                 -- timezone, currency, tax config, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Show Cloning

When cloning from a previous show:
- **Copied:** venue, schedule pattern (dates adjusted to new year), pavilions, booth layout, booth types + pricing, service catalog (if owned venue), payment schedule, ticket types, booth selection waves
- **Optionally copied:** exhibitor booth assignments (as `pending_renewal` status), sponsorship packages
- **NOT copied:** actual registrations, payments, invoices, service orders, check-in data

### API Endpoints

```
GET    /api/v1/venues                   # List venues
POST   /api/v1/venues                   # Create venue
PATCH  /api/v1/venues/:id              # Update venue

GET    /api/v1/shows                    # List shows
POST   /api/v1/shows                    # Create show
GET    /api/v1/shows/:id               # Get show details
PATCH  /api/v1/shows/:id              # Update show
POST   /api/v1/shows/:id/clone         # Clone show
PATCH  /api/v1/shows/:id/status        # Advance show lifecycle
```

**~10 endpoints**

---

## Module 6: Venue Calendar (Tucson Expo Center)

**Pain #5 — venue calendar is uncoordinated.**

This module is specifically for the Tucson Expo Center (and any future owned venues). It's a booking calendar that shows all events — both JOGS shows and third-party events.

### Features

- Calendar view (month, week, list) showing all events at the venue
- Each event shows: name, type, halls/spaces used, promoter, dates, move-in/move-out windows
- Color-coded by type (JOGS show = blue, 3rd-party trade show = green, concert = purple, private event = gray)
- Conflict detection: warn if two events overlap in the same hall/space
- Buffer enforcement: configurable move-out-to-move-in gap (e.g., 2 days minimum between events)
- Third-party lease tracking: lessee name, contract dates, spaces, rate, terms
- Quick "is this date available?" check

### Data Model

```sql
tenant.venue_events (
  id UUID PRIMARY KEY,
  venue_id UUID NOT NULL,
  org_id UUID NOT NULL,
  -- Event info
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(30),              -- jogs_show, third_party_show, concert, wedding, private, maintenance
  show_id UUID,                        -- if this is a JOGS show, link to the show record
  -- Third-party info
  external_promoter_name VARCHAR(255),
  external_promoter_contact JSONB,
  lease_rate DECIMAL,
  lease_terms TEXT,
  -- Space allocation
  halls_used TEXT[],                    -- ["North Hall", "East Hall", "Outdoor Area"]
  -- Dates
  event_start DATE NOT NULL,
  event_end DATE NOT NULL,
  move_in_start DATE,
  move_in_end DATE,
  move_out_start DATE,
  move_out_end DATE,
  -- Status
  status VARCHAR(20) DEFAULT 'tentative', -- tentative, confirmed, cancelled
  color VARCHAR(7) DEFAULT '#999999',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints

```
GET    /api/v1/venues/:venueId/calendar?from=&to=     # Events in date range
POST   /api/v1/venues/:venueId/events                  # Create venue event
PATCH  /api/v1/venues/:venueId/events/:id              # Update
DELETE /api/v1/venues/:venueId/events/:id              # Cancel/delete
GET    /api/v1/venues/:venueId/availability?date=&halls= # Check availability
```

**~5 endpoints**

---

## Module 7: Exhibitor Services Marketplace

**Pain #6 — services are PDF-and-phone. ONLY applies at owned venues (Tucson).**

### The Gate

This entire module is gated by `show.services_managed == true`. If the show is at a rented venue (Las Vegas, San Diego), this module doesn't render in the exhibitor portal, doesn't appear in the promoter dashboard, and doesn't generate any data.

### Service Categories (Tucson Expo Center)

| Category | Example Items |
|---|---|
| **Electrical** | 110V/5A outlet, 110V/20A, 208V/30A, dedicated circuit |
| **Furniture** | 6ft table, 8ft table, folding chair, display case (locking), shelving, counter |
| **Booth Construction (I&D)** | Pipe & drape (standard 8ft back + 3ft sides), hard wall panels, custom build labor (hourly), installation supervision |
| **Flooring** | Standard carpet (color options), premium carpet, carpet padding |
| **Drayage** | Inbound freight handling (per CWT), outbound, crate storage, special handling (forklift/rigging) |
| **Signage** | Standard booth header sign, custom header, banner hanging |
| **Internet & AV** | WiFi (basic/premium), hardline ethernet, monitor rental, PA system |
| **Cleaning** | Daily booth cleaning, pre-show deep clean |

### Pricing Tiers & Deadlines

Each service item has up to 3 price tiers based on when the order is placed:

| Tier | Typical Deadline | Price |
|---|---|---|
| **Advance** | 30+ days before show | Lowest price |
| **Standard** | 7–30 days before show | Base price |
| **At-Show** | During move-in or show days | 25–40% surcharge |

### Included Services

Some services are included with the booth fee (no additional charge):
- Standard pipe & drape (8ft back wall, 3ft side rails)
- Standard carpet in the booth
- One 110V/5A electrical outlet
- Booth identification sign (exhibitor name + booth number)

These show as "$0.00 — Included" on the order form. Exhibitor can upgrade (e.g., premium carpet, more outlets).

### Ordering Flow

1. Exhibitor logs into portal (Module 9) → navigates to "Services" tab (only visible if show.services_managed)
2. Sees service catalog organized by category
3. Each item shows: name, description, price (current tier based on today's date vs. deadlines), unit
4. Adds items to cart (quantity, notes per item)
5. Cart shows running total
6. Checkout: review items → accept service terms → pay via Stripe or add to invoice
7. Confirmation email with itemized receipt
8. Order dispatched to vendor (Module 8)

### Data Model

```sql
tenant.service_catalog_items (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  org_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit_of_measure VARCHAR(20),         -- each, per_cwt, per_hour, per_sqft, per_day
  -- Pricing tiers
  advance_price DECIMAL,
  advance_deadline TIMESTAMPTZ,
  standard_price DECIMAL,
  standard_deadline TIMESTAMPTZ,
  at_show_price DECIMAL,
  -- Constraints
  min_qty INTEGER DEFAULT 1,
  max_qty INTEGER,
  -- Fulfillment
  vendor_id UUID REFERENCES tenant.service_vendors(id),
  lead_time_hours INTEGER,
  -- Included with booth
  included_with_booth_types TEXT[],    -- ['inline', 'corner'] or empty
  included_qty INTEGER DEFAULT 0,     -- e.g., 1 outlet included free
  --
  photos TEXT[],
  sort_order INTEGER,
  status VARCHAR(20) DEFAULT 'active'
);

tenant.service_orders (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  exhibitor_id UUID NOT NULL,
  booth_id UUID NOT NULL,
  org_id UUID NOT NULL,
  -- Totals
  subtotal DECIMAL NOT NULL DEFAULT 0,
  tax DECIMAL DEFAULT 0,
  total DECIMAL NOT NULL DEFAULT 0,
  -- Payment
  payment_method VARCHAR(20),          -- stripe, invoice, at_show_cash
  stripe_payment_intent_id TEXT,
  invoice_id UUID,                     -- if added to exhibitor's main invoice
  -- Status
  status VARCHAR(20) DEFAULT 'submitted',
    -- submitted, confirmed, dispatched, fulfilled, cancelled
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  notes TEXT
);

tenant.service_order_lines (
  id UUID PRIMARY KEY,
  service_order_id UUID NOT NULL,
  service_item_id UUID NOT NULL,
  org_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL NOT NULL,
  price_tier VARCHAR(20),              -- advance, standard, at_show
  line_total DECIMAL NOT NULL,
  is_included BOOLEAN DEFAULT false,   -- included with booth, $0
  notes TEXT,
  -- Fulfillment
  fulfillment_status VARCHAR(20) DEFAULT 'pending',
    -- pending, dispatched, in_progress, completed
  vendor_id UUID
);
```

### API Endpoints

```
GET    /api/v1/shows/:showId/services/catalog          # Service catalog for this show
POST   /api/v1/shows/:showId/services/catalog          # Add item to catalog (admin)
PATCH  /api/v1/shows/:showId/services/catalog/:id      # Update item
DELETE /api/v1/shows/:showId/services/catalog/:id      # Remove item

POST   /api/v1/shows/:showId/services/orders           # Submit service order
GET    /api/v1/shows/:showId/services/orders            # List orders (admin view)
GET    /api/v1/shows/:showId/services/orders/:id        # Order detail
PATCH  /api/v1/shows/:showId/services/orders/:id        # Update status
GET    /api/v1/exhibitors/:id/services/orders           # Exhibitor's orders across shows
```

**~10 endpoints**

---

## Module 8: Vendor Operations & Airtable Sync

### Service Vendors

```sql
tenant.service_vendors (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  vendor_type VARCHAR(50),             -- electrical, furniture, labor, drayage, signage
  contact JSONB,
  capabilities TEXT[],                 -- which service categories they handle
  payment_terms VARCHAR(50),           -- net_30, net_60, on_completion
  status VARCHAR(20) DEFAULT 'active'
);
```

### Work Order Dispatch

When a service order is confirmed, the system groups line items by vendor and creates work orders:

```sql
tenant.work_orders (
  id UUID PRIMARY KEY,
  show_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  org_id UUID NOT NULL,
  -- Content
  service_order_line_ids UUID[] NOT NULL,
  exhibitor_name VARCHAR(255),
  booth_number VARCHAR(20),
  items_summary TEXT,                  -- human-readable: "2x 110V outlets, 1x 8ft table, daily cleaning"
  special_instructions TEXT,
  -- Schedule
  delivery_window_start TIMESTAMPTZ,
  delivery_window_end TIMESTAMPTZ,
  -- Airtable sync
  airtable_record_id TEXT,
  airtable_last_synced TIMESTAMPTZ,
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
    -- pending, dispatched, acknowledged, in_progress, completed
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Airtable Sync Pattern

```
Conventioneer (Postgres)                  Vendor's Airtable Base
─────────────────────────                 ──────────────────────
Work order confirmed    ──── push ────►   New record in "Work Orders" table
                                          (exhibitor, booth, items, instructions, schedule)

                        ◄─── pull/webhook ─ Vendor updates status to "In Progress"
Work order status updated

                        ◄─── pull/webhook ─ Vendor updates status to "Completed"
Work order completed,
exhibitor notified
```

**Implementation:**
- Outbound sync: Celery task triggered when work order is dispatched → Airtable REST API `POST /v0/{baseId}/{tableName}`
- Inbound sync: Airtable webhook (if vendor is on Airtable Pro+) or polling every 5 minutes via Celery beat
- Vendor config: each vendor has `airtable_base_id` and `airtable_api_key` stored (encrypted)
- Fallback for vendors without Airtable: work order sent as formatted email with PDF attachment

### API Endpoints

```
GET    /api/v1/service-vendors                     # List vendors
POST   /api/v1/service-vendors                     # Create
PATCH  /api/v1/service-vendors/:id                 # Update
GET    /api/v1/shows/:showId/work-orders           # List work orders for a show
POST   /api/v1/shows/:showId/work-orders/:id/dispatch  # Dispatch to vendor
PATCH  /api/v1/shows/:showId/work-orders/:id       # Update status
POST   /api/v1/webhooks/airtable                   # Inbound Airtable webhook
```

**~7 endpoints**

---

## Module 9: Exhibitor Portal (Self-Service)

A logged-in area for exhibitors to manage their participation across all shows.

### Pages

**Dashboard:** Upcoming shows they're in. Action items (complete profile, pay balance, order services). Quick links.

**Profile:** Edit company info, description, product categories, images, documents, contacts.

**My Shows:** List of all shows (current + past). Per show:
- Booth assignment (with map view)
- Service orders (if owned venue) + order history + statuses
- Invoices + payment history + make payment button
- Badge management (add/edit staff badges)
- Exhibitor checklist ("Complete these items before the show")

**Messages:** Notifications from the promoter. Deadline reminders. Order confirmations.

### No separate build — it's routes in the Next.js app

The exhibitor portal is not a separate application. It's a set of authenticated pages in the main Next.js app, gated by the `exhibitor_admin` or `exhibitor_staff` role.

### API Endpoints

Most portal features consume endpoints from other modules (M1, M3, M4, M7). The portal-specific endpoints are:

```
GET    /api/v1/me/exhibitor                   # Current user's exhibitor profile
GET    /api/v1/me/shows                       # Shows I'm participating in
GET    /api/v1/me/invoices                    # My invoices
GET    /api/v1/me/action-items                # Things I need to do
POST   /api/v1/me/badges                      # Submit badge list for a show
GET    /api/v1/me/notifications               # My notifications
PATCH  /api/v1/me/notifications/:id/read      # Mark notification as read
```

**~7 endpoints**

---

## Module 10: Promoter Dashboard

The command center for Vitaly and his team.

### Dashboard Widgets

- **Shows overview:** Card per show with status, dates, booth occupancy %, revenue, exhibitor count
- **Pipeline funnel:** Per-show exhibitor pipeline (prospect → applied → approved → paid)
- **Revenue summary:** Total invoiced, total collected, total outstanding — per show and aggregate
- **Upcoming deadlines:** Advance order deadline in 14 days, booth selection Wave 2 opens tomorrow, etc.
- **Recent activity feed:** "Nativa Gems confirmed for Las Vegas", "New registration: 47 today", "Invoice #INV-0234 paid"

### No special endpoints — it's aggregation queries against existing modules

---

## Module 11: Communications & Notifications

### Transactional Emails (triggered automatically)

| Trigger | Recipient | Content |
|---|---|---|
| Registration approved | Attendee | Badge QR + show details |
| Booth reserved | Exhibitor | Booth details + payment link |
| Payment received | Exhibitor | Receipt |
| Invoice sent | Exhibitor | Invoice PDF |
| Invoice overdue (7/14/30 day) | Exhibitor | Reminder with payment link |
| Service order confirmed | Exhibitor | Order summary |
| Service order fulfilled | Exhibitor | "Your electrical has been installed" |
| Show status change | Exhibitor | "Booth selection is now open" |
| Credential rejected | Attendee | "Your credential was not accepted, please resubmit" |

### Bulk Email

- Promoter can send to: all exhibitors in a show, exhibitors in a specific pipeline stage, exhibitors matching a tag/segment, all attendees
- Template system with merge fields: `{{exhibitor.company_name}}`, `{{show.name}}`, `{{booth.number}}`
- Track: sent, delivered, opened, clicked
- Unsubscribe management

### In-App Notifications

- Bell icon with badge count in the portal header
- Notification list: action_required, info, success, warning
- Mark as read

### Data Model

```sql
tenant.email_templates (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  show_id UUID,                        -- null = org-wide template
  trigger_event VARCHAR(50),           -- registration_approved, invoice_sent, etc.
  name VARCHAR(100),
  subject VARCHAR(255),
  body_html TEXT,
  body_text TEXT,
  merge_fields TEXT[],
  status VARCHAR(20) DEFAULT 'active'
);

tenant.email_log (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  recipient_email VARCHAR(255),
  template_id UUID,
  subject VARCHAR(255),
  status VARCHAR(20),                  -- queued, sent, delivered, opened, clicked, bounced, failed
  sendgrid_message_id TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ
);

tenant.notifications (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type VARCHAR(20),                    -- action_required, info, success, warning
  title VARCHAR(255),
  body TEXT,
  action_url TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**~8 endpoints**

---

## Module 12: Exhibitor Routing (Cross-Show Campaigns)

**Pain #5 in the ES-revised: moving exhibitors across shows is done entirely by hand.**

This is Phase 2 (months 9–12). Not MVP, but architecturally important because the CRM (Module 1) must be designed to support it.

### What It Does

Promoter creates a "routing campaign": take exhibitors from Show A (or from a saved segment) and invite them to Show B.

### Workflow

1. Promoter selects source: "Exhibitors from JOGS Tucson Winter 2027 who are tagged 'amber' and haven't confirmed for Las Vegas"
2. System returns matching list (using CRM filters from Module 1)
3. Promoter reviews, adjusts list
4. Composes invitation message (with merge fields)
5. Sends campaign → each exhibitor gets a personalized email with "Apply for JOGS Las Vegas" CTA
6. CTA links to a pre-filled application (their profile is already in the system)
7. Track: invited → viewed → applied → confirmed

### Data Model

```sql
tenant.routing_campaigns (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  name VARCHAR(255),
  source_filter JSONB,                 -- the CRM filter criteria used
  target_show_id UUID NOT NULL,
  message_subject VARCHAR(255),
  message_body TEXT,
  status VARCHAR(20) DEFAULT 'draft',  -- draft, sent, completed
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

tenant.routing_invitations (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL,
  exhibitor_id UUID NOT NULL,
  org_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'sent',   -- sent, viewed, applied, confirmed, declined
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);
```

**~5 endpoints**

---

## Team Allocation & Timeline

### Phase 1: Core (Months 1–6, ~60 engineers)

| Module | Engineers | Weeks |
|---|---|---|
| M1: Exhibitor CRM | 10 | 1–12 |
| M2: Ticketing & Registration | 8 | 1–10 |
| M3: Floor Plan & Booth Sales | 6 | 4–14 |
| M4: Invoicing & Payments | 8 | 4–14 |
| M5: Show Management | 4 | 1–8 |
| M9: Exhibitor Portal | 6 | 8–16 |
| M10: Promoter Dashboard | 4 | 10–16 |
| M11: Communications | 4 | 6–14 |
| Platform Core (auth, multi-tenancy, infra, CI/CD) | 8 | 1–8 |
| QA & Test Engineering | 4 | 4–16 |

### Phase 2: Venue & Services (Months 4–9, ~30 engineers, overlapping)

| Module | Engineers | Weeks |
|---|---|---|
| M6: Venue Calendar | 4 | 14–20 |
| M7: Services Marketplace | 10 | 14–24 |
| M8: Vendor Ops & Airtable | 6 | 18–26 |
| Integration testing & hardening | 6 | 22–26 |
| QA | 4 | 18–26 |

### Phase 3: Growth (Months 9–12, ~20 engineers)

| Module | Engineers | Weeks |
|---|---|---|
| M12: Exhibitor Routing | 6 | 26–32 |
| Mobile-responsive polish | 4 | 26–30 |
| On-site operations (badge scanning, walk-up registration) | 6 | 28–34 |
| Performance, security audit, launch prep | 4 | 30–34 |

### What About the Other 10–40 Engineers?

With 100 engineers and this scope, you'll have capacity to spare in later phases. Options:
- **Rotate engineers** to other company projects between phases
- **Increase quality:** More testing, more polish, more edge cases
- **Build faster:** Compress timelines by parallelizing within modules
- **Start Phase 3 features earlier** if Phase 1 goes well
- **Build the franchise/multi-tenant UI** if Vitaly has a franchisee prospect by then

Honestly, this scope is more like a **40–50 person** project for 6 months, or a **20–25 person** project for a year. 100 engineers is overkill for 12 modules of this complexity, and too many people on a codebase creates coordination overhead that slows things down. Brooks's Law is real.

---

## Total System Summary

| Metric | Count |
|---|---|
| Modules | 12 |
| Database tables | ~30 |
| API endpoints | ~112 |
| Key integrations | 4 (Stripe, SendGrid, Twilio, Airtable) |
| Frontend views/pages | ~25 |

---

## Open Questions for Vitaly

| # | Question | Impacts |
|---|---|---|
| 1 | What's in the current exhibitor spreadsheet? (Columns, how many rows, how many years of data) | M1: data migration |
| 2 | How are exhibitor contracts handled today? (Docusign? PDF? Verbal?) | M1: contract workflow |
| 3 | What does the service order form look like today? (Get a copy of the PDF Exhibitor Service Kit) | M7: catalog structure |
| 4 | Which Airtable plan are vendors on? (Free, Plus, Pro) — affects webhook support | M8: sync architecture |
| 5 | Is ELEMENTS (Las Vegas show-within-show) a separate floor plan, or a zone within the main JOGS floor plan? | M3/M5: show hierarchy |
| 6 | Is San Diego actually being dropped? | M5: scope |
| 7 | What accounting software does the office use? (QuickBooks, Xero, etc.) | M4: export integration |
| 8 | What badge printers are currently used? (Make/model) | M2: on-site ops |
| 9 | How many staff does Vitaly have working on show operations? | Affects promoter dashboard needs, role/permissions complexity |
| 10 | Is there any existing exhibitor data in Eventbrite that needs migration? | M2: migration |

---

*This spec is right-sized for the actual business. It doesn't pretend to be building a CAD tool, and it doesn't pretend a 500-exhibitor gem show runs on sticky notes. It respects the complexity where it exists (multi-show CRM, owned vs. rented venues, international payments) and keeps it simple where it should be (rectangles on an image).*
