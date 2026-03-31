# Conventioneer — Engineering Plan & MVP Specification

**Version 1.0 | March 30, 2026**
**Target Launch: October 1, 2026 (26 weeks)**
**Team: 100 engineers**
**Stack: Next.js (React) frontend · Python (FastAPI) backend · PostgreSQL · Turbopuffer · Airtable sync**

---

## Table of Contents

1. [System Overview & Domain Model](#1-system-overview--domain-model)
2. [Tenancy & Data Architecture](#2-tenancy--data-architecture)
3. [Phase Plan & Team Allocation](#3-phase-plan--team-allocation)
4. [Module 1: Platform Core & Auth](#module-1-platform-core--auth)
5. [Module 2: Venue & Space Management](#module-2-venue--space-management)
6. [Module 3: Show Management](#module-3-show-management)
7. [Module 4: Floor Plan Engine](#module-4-floor-plan-engine)
8. [Module 5: Exhibitor CRM & Lifecycle](#module-5-exhibitor-crm--lifecycle)
9. [Module 6: Booth Sales & Reservations](#module-6-booth-sales--reservations)
10. [Module 7: Ticketing & Attendee Registration](#module-7-ticketing--attendee-registration)
11. [Module 8: Exhibitor Services Marketplace](#module-8-exhibitor-services-marketplace)
12. [Module 9: Vendor Operations & Airtable Sync](#module-9-vendor-operations--airtable-sync)
13. [Module 10: Exhibitor Portal](#module-10-exhibitor-portal)
14. [Module 11: Promoter Dashboard](#module-11-promoter-dashboard)
15. [Module 12: Franchise & Multi-Tenant Management](#module-12-franchise--multi-tenant-management)
16. [Module 13: Exhibitor Routing Engine](#module-13-exhibitor-routing-engine)
17. [Module 14: Financial Engine](#module-14-financial-engine)
18. [Module 15: Communications & Notifications](#module-15-communications--notifications)
19. [Module 16: Reporting & Analytics](#module-16-reporting--analytics)
20. [Module 17: Mobile App (Attendee + Exhibitor)](#module-17-mobile-app)
21. [Module 18: Public Website Builder](#module-18-public-website-builder)
22. [Module 19: On-Site Operations](#module-19-on-site-operations)
23. [Module 20: Integrations & API Platform](#module-20-integrations--api-platform)
24. [Infrastructure & DevOps](#infrastructure--devops)
25. [QA & Testing Strategy](#qa--testing-strategy)
26. [Data Migration & Launch Plan](#data-migration--launch-plan)
27. [Entity Relationship Summary](#entity-relationship-summary)
28. [API Surface Area Estimate](#api-surface-area-estimate)
29. [Open Questions & Decisions Needed](#open-questions--decisions-needed)

---

## 1. System Overview & Domain Model

### Core Entities

The entire system revolves around these domain objects and their relationships:

```
PLATFORM (Conventioneer instance)
 ├── ORGANIZATION (franchise tenant — e.g., "JOGS International Exhibits")
 │    ├── VENUE (physical location — e.g., "Tucson Expo Center")
 │    │    ├── SPACE (hall, wing, pavilion, outdoor zone)
 │    │    │    └── SPACE_CONFIG (dimensions, utilities, load capacity)
 │    │    └── VENUE_AMENITY (parking, food court, loading dock)
 │    │
 │    ├── SHOW (a specific convention instance — e.g., "JOGS Winter 2027")
 │    │    ├── SHOW_VENUE_ASSIGNMENT (which venue + spaces this show uses)
 │    │    ├── FLOOR_PLAN (the spatial layout for this show)
 │    │    │    └── BOOTH (individual sellable unit on the floor plan)
 │    │    │         ├── BOOTH_TYPE (inline, corner, island, peninsula, outdoor)
 │    │    │         └── BOOTH_PRICING (base price, corner premium, etc.)
 │    │    ├── SERVICE_CATALOG (available services for this show)
 │    │    │    └── SERVICE_ITEM (electrical 110V, table rental, I&D labor, etc.)
 │    │    │         ├── SERVICE_PRICING (advance rate, at-show rate, deadlines)
 │    │    │         └── SERVICE_VENDOR_ASSIGNMENT (which vendor fulfills this)
 │    │    ├── TICKET_TYPE (wholesale buyer, retail guest, VIP, etc.)
 │    │    ├── SHOW_SCHEDULE (dates, hours, move-in/move-out windows)
 │    │    └── PAVILION (themed grouping — e.g., "Amber Pavilion")
 │    │
 │    ├── PROMOTER (the operational owner of a show — may be org owner or franchisee)
 │    │    └── PROMOTER_SHOW_ASSIGNMENT
 │    │
 │    ├── EXHIBITOR (company that buys booth space)
 │    │    ├── EXHIBITOR_CONTACT (people at the company)
 │    │    ├── EXHIBITOR_PROFILE (description, products, images, categories)
 │    │    ├── BOOTH_RESERVATION (exhibitor ↔ booth ↔ show)
 │    │    ├── SERVICE_ORDER (exhibitor ↔ service_item ↔ show)
 │    │    │    └── SERVICE_ORDER_LINE (qty, pricing, status)
 │    │    ├── CONTRACT (terms, e-signature, payment schedule)
 │    │    ├── INVOICE (booth fees + service orders + sponsorships)
 │    │    └── EXHIBITOR_SHOW_HISTORY (cross-show participation record)
 │    │
 │    ├── SERVICE_VENDOR (electrician company, I&D crew, furniture rental, etc.)
 │    │    ├── VENDOR_CAPABILITY (what services they can fulfill)
 │    │    ├── VENDOR_TERRITORY (which venues/regions they serve)
 │    │    └── WORK_ORDER (dispatched from service_order to vendor)
 │    │
 │    ├── ATTENDEE (ticket buyer / registered visitor)
 │    │    ├── ATTENDEE_CREDENTIAL (tax ID, business license, guild membership)
 │    │    ├── BADGE (generated for on-site access)
 │    │    └── ATTENDEE_SHOW_REGISTRATION
 │    │
 │    └── SPONSORSHIP
 │         ├── SPONSORSHIP_PACKAGE (platinum, gold, booth upgrade, app ad, etc.)
 │         └── SPONSORSHIP_SALE (exhibitor ↔ package ↔ show)
```

### Key Relationship Patterns

- **Exhibitor ↔ Show** is MANY-TO-MANY (an exhibitor can be at multiple shows; a show has many exhibitors)
- **Exhibitor ↔ Venue** is INDIRECT (through show → venue assignment)
- **Show ↔ Venue** is MANY-TO-MANY (a show could span venues; a venue hosts many shows)
- **Service Vendor ↔ Show** is MANY-TO-MANY (a show uses multiple vendors; a vendor serves multiple shows)
- **Promoter ↔ Organization** can be 1:1 (Vitaly promotes his own shows) or MANY:1 (franchisees under Vitaly's org)

---

## 2. Tenancy & Data Architecture

### Multi-Tenancy Model

**Approach: Row-Level Security (RLS) with `organization_id` on every tenant-scoped table.**

We are NOT using schema-per-tenant. With potentially dozens of franchise orgs, schema-per-tenant creates migration nightmares. Instead:

- Every table that holds tenant data gets an `organization_id` column (UUID, NOT NULL, indexed)
- PostgreSQL RLS policies enforce isolation at the DB level — even if app code has a bug, data cannot leak
- A `platform` schema holds cross-tenant data (master exhibitor pool, platform config, franchise agreements)
- Each API request resolves the tenant from the auth token → sets `SET app.current_org = '<uuid>'` on the connection → RLS enforces

### Database Schema Strategy

```
Schemas:
  platform.*       — Cross-tenant: master exhibitor pool, franchise config, platform users
  tenant.*         — All tenant-scoped tables with RLS (this is the bulk of the system)
  audit.*          — Immutable audit log (every write to tenant.* is logged)
  analytics.*      — Materialized views and aggregation tables for reporting
```

### PostgreSQL-Specific Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Primary keys | UUIDv7 | Sortable, globally unique, no tenant leakage via sequential IDs |
| Soft deletes | Yes, `deleted_at` timestamp | Convention data should never be hard-deleted — exhibitors come back year after year |
| Temporal data | `valid_from` / `valid_to` on pricing, booth assignments | Prices change per deadline; booth assignments change as exhibitors move |
| JSON columns | Sparingly — `metadata JSONB` on service_order for vendor-specific fields | Keep relational where possible; use JSONB for truly unstructured extensions |
| Full-text search | `tsvector` columns on exhibitor profiles, products | For exhibitor directory search on public site and mobile app |
| Partitioning | `show_id` range partition on service_orders, booth_reservations | These tables will be massive; partition by show for query performance |

### Turbopuffer Usage

Turbopuffer (vector DB) is used for:

1. **Exhibitor-to-Show Matching** (routing engine) — embed exhibitor product descriptions + show category requirements → cosine similarity to recommend exhibitors for shows
2. **Attendee-to-Exhibitor Matching** — embed attendee interests (from registration) → match to exhibitor profiles for personalized recommendations
3. **Semantic Search** — "find me exhibitors who sell Baltic amber beads" across the entire master pool
4. **Similar Exhibitor Discovery** — "show me exhibitors similar to [Company X]" for franchise promoters building their vendor roster

**Embedding model:** Use a lightweight sentence transformer (e.g., `all-MiniLM-L6-v2` via Python) or call Anthropic's API for richer embeddings on exhibitor descriptions.

**Index structure:**
- `exhibitor_profiles` namespace — one vector per exhibitor, updated on profile change
- `product_catalog` namespace — one vector per product/product-category, for finer-grained matching
- `show_descriptions` namespace — one vector per show, for exhibitor→show matching

---

## 3. Phase Plan & Team Allocation

### Timeline: 26 Weeks (April 1 – October 1, 2026)

| Phase | Weeks | Dates | Focus | Team Size |
|---|---|---|---|---|
| **Phase 0: Foundation** | Weeks 1–3 | Apr 1–18 | Infra, CI/CD, DB schema, auth, design system, dev environment | 25 |
| **Phase 1: Core Build** | Weeks 4–10 | Apr 21 – Jun 6 | Modules 1–8 (all core features, parallel tracks) | 85 |
| **Phase 2: Integration Build** | Weeks 11–16 | Jun 9 – Jul 18 | Modules 9–15 (services marketplace, vendor ops, franchise, financials, comms) | 90 |
| **Phase 3: Experience Build** | Weeks 17–21 | Jul 21 – Aug 22 | Modules 16–20 (analytics, mobile, public site, on-site ops, API platform) | 80 |
| **Phase 4: Hardening** | Weeks 22–24 | Aug 25 – Sep 12 | Integration testing, load testing, security audit, UAT with Vitaly's team | 60 |
| **Phase 5: Launch Prep** | Weeks 25–26 | Sep 15 – Oct 1 | Data migration, production deployment, staff training, go-live | 40 |

### Team Structure (100 Engineers)

| Squad | Size | Modules Owned | Tech Lead Focus |
|---|---|---|---|
| **Platform Core** | 8 | M1 (Auth), M2 (Venue), M3 (Show), M12 (Franchise) | Multi-tenancy, RLS, infra |
| **Floor Plan** | 10 | M4 (Floor Plan Engine) | Canvas rendering, spatial data, real-time collab |
| **Exhibitor** | 12 | M5 (CRM), M6 (Booth Sales), M10 (Exhibitor Portal), M13 (Routing Engine) | CRM, e-commerce, search |
| **Services & Logistics** | 14 | M8 (Services Marketplace), M9 (Vendor Ops / Airtable) | Order management, vendor sync, fulfillment |
| **Ticketing & Attendee** | 10 | M7 (Ticketing), M19 (On-Site Ops) | Registration, badging, check-in hardware |
| **Finance & Comms** | 10 | M14 (Financial Engine), M15 (Communications) | Stripe, invoicing, email/SMS |
| **Promoter & Analytics** | 8 | M11 (Promoter Dashboard), M16 (Reporting) | Dashboards, data viz, aggregation |
| **Mobile** | 8 | M17 (Mobile App) | React Native, offline-first, QR scanning |
| **Public Web** | 6 | M18 (Website Builder) | CMS, SSR, SEO, theming |
| **API & Integrations** | 6 | M20 (API Platform) | REST/GraphQL, webhooks, third-party connectors |
| **DevOps & Infra** | 4 | CI/CD, cloud, monitoring, security | AWS/GCP, Terraform, observability |
| **QA & Test Engineering** | 4 | Cross-cutting | E2E, load testing, test data generation |

---

## Module 1: Platform Core & Auth

### Features

**1.1 Authentication & Authorization**
- Email/password login with bcrypt hashing
- Magic link (passwordless) login option
- OAuth2/OIDC for SSO (Google, Microsoft — many exhibitors are corporate)
- MFA via TOTP (authenticator app) — required for promoter and platform admin roles
- Session management with JWT (short-lived access token + long-lived refresh token)
- API key management for integrations

**1.2 Role-Based Access Control (RBAC)**
- Roles are scoped to organization + show:
  - `platform_admin` — Conventioneer staff (god mode)
  - `org_owner` — Vitaly-level: sees everything in their org
  - `org_admin` — Staff at org level
  - `promoter` — Franchisee: sees only their assigned shows
  - `promoter_staff` — Promoter's team members
  - `exhibitor_admin` — Primary contact for an exhibitor company
  - `exhibitor_staff` — Additional people at the exhibitor company
  - `service_vendor` — Vendor company admin
  - `vendor_worker` — Individual worker at a vendor company
  - `attendee` — Registered visitor
- Permissions are granular: `show.booth.sell`, `show.service.order`, `org.exhibitor.route`, etc.
- Permission checks happen at both API middleware and DB (RLS) levels

**1.3 Organization Management**
- Create/edit organization profile (name, logo, contact, billing)
- Organization settings (default currency, timezone, language)
- Organization-level user management (invite, deactivate, role assignment)
- Franchise agreement tracking (linked to financial engine)

**1.4 Audit Trail**
- Every create/update/delete on tenant data writes to `audit.events`
- Schema: `id, timestamp, org_id, user_id, action, entity_type, entity_id, old_value (JSONB), new_value (JSONB), ip_address, user_agent`
- Immutable (append-only table, no UPDATE/DELETE permissions)
- Queryable via admin UI for compliance and dispute resolution

### Data Model (Key Tables)

```sql
-- platform schema (cross-tenant)
platform.users (id, email, password_hash, mfa_secret, created_at, last_login)
platform.organizations (id, name, slug, logo_url, settings JSONB, status, created_at)
platform.org_memberships (user_id, org_id, role, invited_at, accepted_at, deactivated_at)
platform.api_keys (id, org_id, key_hash, name, scopes[], last_used, expires_at)

-- tenant schema
tenant.show_memberships (user_id, show_id, org_id, role, permissions[])

-- audit schema
audit.events (id BIGINT GENERATED, timestamp, org_id, user_id, action, entity_type, entity_id, old_value JSONB, new_value JSONB, ip, ua)
```

### API Endpoints (Partial)

```
POST   /auth/register
POST   /auth/login
POST   /auth/magic-link
POST   /auth/refresh
POST   /auth/mfa/enable
POST   /auth/mfa/verify
GET    /orgs
POST   /orgs
GET    /orgs/:id
PATCH  /orgs/:id
GET    /orgs/:id/members
POST   /orgs/:id/members/invite
PATCH  /orgs/:id/members/:userId/role
DELETE /orgs/:id/members/:userId
GET    /orgs/:id/audit-log?entity_type=&action=&from=&to=
```

### Technical Decisions

| Decision | Choice | Notes |
|---|---|---|
| Auth library | `python-jose` for JWT, `passlib` for bcrypt | Standard, well-audited |
| Session storage | Redis | For refresh token blocklist and rate limiting |
| RBAC enforcement | Custom middleware + PostgreSQL RLS | Defense in depth — app-level AND db-level |
| Audit log write | Async via background worker (Celery/ARQ) | Don't block the request path |

---

## Module 2: Venue & Space Management

### Features

**2.1 Venue Registry**
- CRUD for venues (name, address, GPS coordinates, contact, photos, description)
- Venue status (active, inactive, under_renovation)
- Venue capacity metadata (total sq ft, max occupancy, parking spaces)
- Venue-level amenities (loading docks, food court, shuttle service, WiFi infrastructure)
- Multiple venues per organization

**2.2 Space Configuration**
- Hierarchical space model: Venue → Hall/Wing → Zone → Sub-zone
- Each space has: name, type (indoor_hall, outdoor_tent, ballroom, lobby, loading_dock), dimensions (length, width, height), sq_footage, utility_access (electrical panels, water, gas, internet drops), load_capacity_psf, ADA_accessibility
- Spaces can be combined or subdivided per show (e.g., Hall A + Hall B = one mega show floor)
- Spaces can be leased to external promoters (lease tracking with dates, rates, terms)

**2.3 Venue Calendar**
- Calendar view of all shows/events at a venue
- Conflict detection (no double-booking of spaces)
- Move-in / move-out buffer enforcement (e.g., 2-day gap between shows for teardown/setup)
- Lease period tracking for third-party promoter bookings

**2.4 Venue Asset Inventory**
- Track venue-owned equipment: pipe & drape inventory, tables, chairs, electrical distribution boxes
- Asset check-in/check-out per show
- Maintenance scheduling

### Data Model

```sql
tenant.venues (id, org_id, name, slug, address JSONB, gps_lat, gps_lng, total_sqft,
               max_occupancy, parking_spaces, description, photos[], status, metadata JSONB)

tenant.spaces (id, venue_id, org_id, parent_space_id, name, type, length_ft, width_ft,
               height_ft, sqft, utility_access JSONB, load_capacity_psf, ada_accessible,
               sort_order)

tenant.venue_calendar_events (id, venue_id, space_id, org_id, event_type,
                               show_id, lease_id, start_date, end_date, status)

tenant.venue_leases (id, venue_id, org_id, lessee_org_id, lessee_name,
                      spaces[], start_date, end_date, rate, terms JSONB, status)

tenant.venue_assets (id, venue_id, org_id, asset_type, name, quantity,
                      condition, last_maintained, location_space_id)
```

---

## Module 3: Show Management

### Features

**3.1 Show CRUD**
- Create a new show: name, slug, type (trade_show, consumer_expo, hybrid), industry_category
- Assign venue + spaces to a show
- Assign promoter(s) to a show
- Show branding: logo, colors, tagline, description, social links
- Show website URL (links to Module 18)

**3.2 Show Schedule**
- Show dates (start, end)
- Daily hours (can vary by day — e.g., last day closes early)
- Move-in window (dates + hours for exhibitor setup)
- Move-out window (dates + hours for teardown)
- Advance order deadlines (multiple tiers: 60-day, 30-day, at-show)
- Key milestones (exhibitor application open, booth selection opens, early bird ends, etc.)

**3.3 Show Configuration**
- Pavilion definitions (themed groupings of booths — e.g., "Amber Pavilion", "Southwest Pavilion")
- Booth type definitions for this show (inline, corner, island, peninsula, outdoor)
- Pricing tiers (per sq ft, per booth, per pavilion, early bird vs. standard vs. late)
- Tax configuration (per jurisdiction)
- Show rules & policies (cancellation, refund, exhibitor conduct)

**3.4 Show Cloning**
- Clone a previous show to create next year's edition
- Carry forward: floor plan, booth types, pricing (with override), service catalog, pavilion structure
- Optionally carry forward: exhibitor assignments (as "pending renewal"), sponsorship packages
- Do NOT carry forward: orders, invoices, attendee registrations

**3.5 Show Lifecycle Status**
```
DRAFT → ACCEPTING_APPLICATIONS → BOOTH_SELECTION_OPEN → ADVANCE_ORDERING →
AT_SHOW → LIVE → MOVE_OUT → CLOSED → ARCHIVED
```
- Automated transitions based on dates (configurable)
- Manual override by promoter/admin

### Data Model

```sql
tenant.shows (id, org_id, name, slug, type, industry_category, venue_id,
              promoter_id, branding JSONB, status, cloned_from_show_id,
              settings JSONB, created_at)

tenant.show_spaces (show_id, space_id, org_id, configuration JSONB)

tenant.show_schedule (id, show_id, org_id, schedule_type, label,
                       start_datetime, end_datetime, timezone, notes)

tenant.show_deadlines (id, show_id, org_id, deadline_type, label,
                        deadline_datetime, pricing_tier, surcharge_pct)

tenant.pavilions (id, show_id, org_id, name, description, color_hex,
                   icon_url, sort_order)
```

---

## Module 4: Floor Plan Engine

**This is the highest-risk, highest-complexity module. It warrants 10 engineers.**

### Features

**4.1 Floor Plan Designer (Promoter/Admin Tool)**
- Canvas-based editor built on **Konva.js** (React-compatible, performant 2D canvas)
- Import venue background: upload DWG/DXF (converted server-side to SVG via `ezdxf` Python lib), PDF, or image
- Draw booth outlines: rectangle, polygon, freeform
- Snap-to-grid and alignment helpers
- Booth metadata assignment: booth_number, type, pavilion, sq_ft (auto-calculated from shape), pricing_tier
- Aisle definition (non-sellable space)
- Annotation layer: labels, arrows, fire exits, restrooms, food court, registration desk
- Multi-floor support (for multi-level venues)
- Zoom, pan, minimap
- Undo/redo (command pattern, 50-step history)
- Auto-save (debounced, every 30 seconds)
- Version history (snapshots, diff view, rollback)

**4.2 Floor Plan Rendering (Public/Exhibitor View)**
- Read-only interactive map
- Color-coded by: availability (available/reserved/sold), pavilion, exhibitor category
- Click booth → see exhibitor info (if assigned) or "Reserve" button (if available)
- Search by exhibitor name → highlight booth on map
- Filter by pavilion, product category, country
- Responsive (works on mobile)

**4.3 Floor Plan Data Model**

```sql
tenant.floor_plans (id, show_id, org_id, name, version, status,
                     canvas_data JSONB, -- Konva scene graph
                     background_image_url, background_scale, background_offset JSONB,
                     grid_size_px, snap_enabled,
                     created_at, updated_at, published_at)

tenant.floor_plan_versions (id, floor_plan_id, org_id, version_number,
                             canvas_data JSONB, created_by, created_at, notes)

tenant.booths (id, floor_plan_id, show_id, org_id, booth_number, booth_type,
               pavilion_id, shape_data JSONB, -- polygon vertices in canvas coords
               sqft DECIMAL, frontage_ft DECIMAL,
               position_x, position_y, rotation,
               pricing_tier, base_price DECIMAL, corner_premium DECIMAL,
               status, -- available, reserved, held, sold, blocked
               metadata JSONB)
```

**4.4 Technical Approach**

| Component | Technology | Notes |
|---|---|---|
| Canvas rendering | Konva.js + react-konva | Battle-tested, supports complex shapes, hit detection, layering |
| Background import | Python `ezdxf` for DWG/DXF → SVG conversion | Run server-side as async job |
| Real-time collaboration | WebSocket (via FastAPI WebSocket endpoints) | Multiple admins editing same floor plan |
| Spatial queries | PostGIS extension on `booths` table | "Find all booths within 50ft of booth X", nearest-neighbor for routing |
| Canvas → image export | Server-side Puppeteer rendering of the canvas | For PDF floor plan exports and email attachments |

**4.5 Floor Plan Editor — Detailed UI Behaviors**

- Left panel: tool palette (select, draw rectangle, draw polygon, draw aisle, annotate, measure)
- Right panel: properties inspector (selected booth's number, type, pavilion, price, status)
- Top bar: zoom controls, grid toggle, layer visibility, version history, publish button
- Bottom bar: minimap, total booth count, total sq ft sold/available
- Keyboard shortcuts: Delete (remove selected), Ctrl+Z (undo), Ctrl+D (duplicate), arrow keys (nudge)
- Multi-select: click+drag or Shift+click to select multiple booths → bulk assign pavilion/type/price

---

## Module 5: Exhibitor CRM & Lifecycle

### Features

**5.1 Exhibitor Company Profile**
- Company info: legal name, DBA/trade name, tax_id, address, phone, email, website
- Company description (rich text)
- Product categories (multi-select from configurable taxonomy)
- Product images gallery (up to 20 images)
- Country of origin
- Company size (solo, small, medium, large)
- Social links
- Documents: business license, insurance certificate, tax exempt certificate
- Custom fields (per show, per org — stored as JSONB)

**5.2 Exhibitor Contacts**
- Multiple contacts per exhibitor company
- Roles: primary_contact, billing_contact, onsite_manager, badge_holder
- Each contact: name, email, phone, title, photo
- Login credentials (for exhibitor portal) linked to contacts

**5.3 Exhibitor Lifecycle per Show**

```
PROSPECT → INVITED → APPLICATION_SUBMITTED → APPLICATION_APPROVED →
CONTRACT_SENT → CONTRACT_SIGNED → BOOTH_ASSIGNED → DEPOSIT_PAID →
SERVICES_ORDERED → FULLY_PAID → CHECKED_IN → ACTIVE → SHOW_COMPLETE →
POST_SHOW_SURVEY → ARCHIVED
```

- Each transition is timestamped and audited
- Automated emails/notifications at each transition
- Promoter can manually advance or regress status
- Dashboard widget shows funnel conversion per show

**5.4 Exhibitor Search & Filtering**
- Full-text search on company name, description, products
- Filter by: country, product category, show history, pavilion, booth type, status, revenue tier
- Saved searches / smart lists
- Bulk actions: send email, assign to show, export CSV

**5.5 Exhibitor Tags & Segments**
- Freeform tags (e.g., "VIP", "first-timer", "international", "amber-specialist")
- Auto-tags based on rules (e.g., "3+ shows" → "loyal", ">$10K lifetime spend" → "whale")
- Segments used for targeted communications and routing recommendations

**5.6 Master Exhibitor Pool (Cross-Org)**
- Platform-level exhibitor registry (in `platform` schema)
- When an exhibitor participates in any org's show, a record is created/linked in the master pool
- Franchise owner can see full pool; franchisees see only exhibitors who have participated in their shows (unless explicitly shared)
- Opt-in sharing: exhibitor agrees to be discoverable by other promoters in the network

### Data Model

```sql
-- Master pool (platform schema)
platform.master_exhibitors (id, canonical_name, tax_id_hash, country,
                             product_categories[], first_seen, last_seen,
                             profile_embedding_id) -- Turbopuffer reference

-- Tenant-scoped exhibitor records
tenant.exhibitors (id, org_id, master_exhibitor_id, company_name, trade_name,
                    tax_id_encrypted, address JSONB, phone, email, website,
                    description TEXT, product_categories[], country,
                    company_size, social_links JSONB, documents JSONB,
                    custom_fields JSONB, tags[], status, created_at)

tenant.exhibitor_contacts (id, exhibitor_id, org_id, name, email, phone,
                            title, role, photo_url, user_id, is_primary)

tenant.exhibitor_show_participation (id, exhibitor_id, show_id, org_id,
                                      lifecycle_status, status_history JSONB,
                                      application_data JSONB, notes TEXT,
                                      created_at, updated_at)

tenant.exhibitor_images (id, exhibitor_id, org_id, image_url, caption,
                          sort_order, uploaded_at)
```

---

## Module 6: Booth Sales & Reservations

### Features

**6.1 Booth Selection Workflow**
- Exhibitor views interactive floor plan (Module 4 read-only view)
- Filters available booths by: pavilion, size, type, price range
- Clicks booth → sees details (size, price, what's included, neighboring exhibitors)
- "Reserve" button → booth moves to `held` status (15-minute hold timer)
- Exhibitor completes reservation form (confirm company, select contacts for badges, agree to terms)
- Payment: deposit or full payment via Stripe
- On payment success → booth status = `sold`, confirmation email sent

**6.2 Priority Booth Selection**
- Point-based system: exhibitors earn priority points based on tenure, booth size, total spend
- Points accrue across shows and years
- When booth selection opens, higher-priority exhibitors get earlier access (time-gated waves)
- Configuration: how many waves, how many hours between waves, point thresholds per wave

**6.3 Booth Assignment (Admin)**
- Promoter can manually assign booths to exhibitors (for VIPs, returning exhibitors, special arrangements)
- Drag exhibitor from list → drop onto booth on floor plan
- Bulk assignment via CSV import (booth_number, exhibitor_id)
- "Auto-assign" suggestions: based on exhibitor's previous booth, product category → pavilion match, requested neighbors

**6.4 Booth Upgrades & Changes**
- Exhibitor can request booth change (move to different booth, upgrade size)
- Promoter approves/denies
- Price difference calculated and invoiced (or refunded)
- Booth swap between two exhibitors (with mutual consent)

**6.5 Waitlist**
- When show is sold out, exhibitors can join waitlist per booth type/pavilion
- When a cancellation occurs, waitlist is notified in priority order
- Configurable auto-offer: next on waitlist gets a 24-hour hold

**6.6 Co-Exhibitors**
- An exhibitor can add co-exhibitors to their booth (sharing space)
- Co-exhibitor gets their own profile, badges, and service ordering capability
- Booth owner is financially responsible

### Data Model

```sql
tenant.booth_reservations (id, booth_id, show_id, exhibitor_id, org_id,
                            reservation_type, -- direct, priority, admin_assigned, waitlist
                            status, -- held, confirmed, paid, cancelled, transferred
                            hold_expires_at,
                            price DECIMAL, deposit DECIMAL, deposit_paid_at,
                            payment_intent_id, -- Stripe
                            priority_points_used,
                            co_exhibitor_ids[],
                            terms_accepted_at, terms_version,
                            created_at, updated_at)

tenant.booth_waitlist (id, show_id, org_id, exhibitor_id,
                        preferred_pavilion_id, preferred_booth_type,
                        preferred_sqft_min, preferred_sqft_max,
                        priority_score, position, status, created_at)

tenant.priority_points (id, exhibitor_id, org_id, points_balance,
                         points_history JSONB) -- [{show_id, reason, delta, date}]
```

---

## Module 7: Ticketing & Attendee Registration

### Features

**7.1 Ticket Types & Pricing**
- Configurable per show: ticket_name, description, price, capacity, sale_start, sale_end
- Types: wholesale_buyer (free w/ credential verification), retail_guest, VIP, single_day, multi_day, exhibitor_badge
- Group/bulk tickets (buy 10+, get discount)
- Promo codes and discount rules
- Tax calculation per jurisdiction

**7.2 Registration Flow**
- Public registration page (branded per show via Module 18)
- Multi-step form: personal info → ticket type selection → credential upload (for wholesale) → payment → confirmation
- Credential verification workflow:
  - Wholesale buyers upload: tax ID / resale certificate / business license / industry guild card
  - System does basic validation (document present, not expired)
  - Promoter staff reviews and approves/rejects
  - Auto-approve rules: returning buyer with previously verified credentials
- Guest registration: simpler flow, just name + email + payment

**7.3 Badge Generation**
- On registration approval, generate badge:
  - Badge template configurable per show (logo, colors, layout)
  - Badge data: name, company, badge_type (buyer/guest/VIP/exhibitor/staff), barcode/QR code
  - QR encodes: attendee_id + show_id + badge_type (for scanning)
- Badges can be: emailed as PDF, printed on-site (Module 19), or added to Apple/Google Wallet

**7.4 Attendee Management**
- Attendee list with search/filter (name, company, badge type, registration date)
- Check-in tracking (scanned at door → timestamp)
- Attendance analytics (daily unique visitors, peak hours, return visitors)

**7.5 Eventbrite Migration Path**
- Import past attendee data from Eventbrite CSV exports
- Match returning attendees by email to maintain history
- Redirect old Eventbrite links to new registration pages

### Data Model

```sql
tenant.ticket_types (id, show_id, org_id, name, description, price DECIMAL,
                      capacity, sold_count, sale_start, sale_end,
                      requires_credential_verification BOOLEAN,
                      credential_types_accepted[], group_min, group_discount_pct,
                      sort_order, status)

tenant.promo_codes (id, show_id, org_id, code, discount_type, discount_value,
                     applicable_ticket_types[], max_uses, used_count,
                     valid_from, valid_to, status)

tenant.attendees (id, org_id, email, name, company, phone, address JSONB,
                   attendee_type, credential_status, credential_documents JSONB,
                   marketing_consent, created_at)

tenant.attendee_registrations (id, attendee_id, show_id, org_id, ticket_type_id,
                                promo_code_id, price_paid DECIMAL, tax DECIMAL,
                                payment_intent_id, badge_data JSONB,
                                badge_pdf_url, qr_code_data,
                                checked_in_at, check_in_count,
                                status, created_at)
```

---

## Module 8: Exhibitor Services Marketplace

**This is the core differentiator. No competitor does this well.**

### Features

**8.1 Service Catalog Configuration**
- Per-show service catalog (different shows may use different vendors/services)
- Service categories:
  - **Electrical:** 110V/5A, 110V/20A, 208V/30A, 208V/50A, 480V/3-phase, dedicated circuit
  - **Furniture Rental:** tables (6ft, 8ft, round), chairs (folding, upholstered), display cases (locking, open), shelving, counters, carpet (standard colors), carpet padding
  - **Booth Construction (I&D):** pipe & drape (standard, premium), hard wall panels, custom build labor (per hour), installation supervision, dismantle labor
  - **Drayage:** inbound material handling (per CWT), outbound material handling, crate storage, special handling (forklift, rigging)
  - **Signage:** booth header sign (standard, custom), banner hanging, directional signage
  - **Internet & AV:** WiFi (basic, premium), hardline ethernet, monitor rental, PA system, lighting (spot, flood, track)
  - **Cleaning:** daily booth cleaning, pre-show deep clean, carpet cleaning
  - **Security:** overnight booth security, display case guard
  - **Catering:** exhibitor lunch packages, booth refreshment service, water/coffee station
  - **Miscellaneous:** floral arrangements, photography, lead retrieval device rental

- Each service item has:
  - Name, description, category
  - Unit of measure (each, per CWT, per hour, per sq ft, per day)
  - Pricing tiers (advance rate, standard rate, at-show rate) with deadline dates
  - Min/max quantity
  - Required lead time
  - Fulfillment vendor assignment
  - Dependencies (e.g., "208V electrical requires booth >= 200 sq ft")
  - Photos/diagrams

**8.2 Service Ordering (Exhibitor-Facing)**
- Exhibitor sees service catalog organized by category
- Smart defaults based on booth type/size (e.g., "Your 10x10 inline booth includes: 1x 110V/5A outlet, standard carpet, pipe & drape 8ft back + 3ft sides")
- Add-to-cart UX: select item → choose quantity → see price (based on current deadline tier) → add to cart
- Cart shows running total with line-item breakdown
- Order notes per item (e.g., "Please place outlet at back-left corner")
- Checkout: review → accept service terms → pay via Stripe (or invoice — see Module 14)
- Order confirmation email with itemized receipt

**8.3 Order Management (Promoter-Facing)**
- Order dashboard: all orders per show, filterable by status, service category, vendor, exhibitor
- Order statuses:
  ```
  SUBMITTED → CONFIRMED → DISPATCHED → IN_PROGRESS → COMPLETED → INVOICED
  (or CANCELLED / REFUND_REQUESTED / REFUNDED)
  ```
- Bulk order review: approve/flag orders before dispatch to vendors
- Deadline tracking: highlight orders that missed advance deadlines (apply surcharge)
- Order amendment: exhibitor requests change → promoter approves → price adjustment

**8.4 Vendor Dispatch**
- Confirmed orders are grouped by vendor and dispatched as **work orders**
- Work order = "Vendor X, please fulfill these service orders at Show Y":
  - List of exhibitors + booth numbers + what they ordered + quantities + special instructions
  - Scheduled delivery/installation windows
  - Completion deadline
- Work orders sync to vendor's Airtable (Module 9)
- Vendor confirms receipt, updates progress, marks complete
- Completion triggers exhibitor notification

**8.5 Included Services**
- Some services are included with the booth (e.g., basic carpet, pipe & drape, one outlet)
- These are auto-populated on the exhibitor's order as "INCLUDED — $0.00"
- Exhibitor can upgrade (e.g., standard carpet → premium carpet → pay difference)
- Included services are still dispatched to vendors (they need to know what to install)

### Data Model

```sql
tenant.service_categories (id, org_id, name, icon, sort_order)

tenant.service_items (id, show_id, org_id, category_id, name, description,
                       unit_of_measure, min_qty, max_qty,
                       advance_price DECIMAL, advance_deadline TIMESTAMP,
                       standard_price DECIMAL, standard_deadline TIMESTAMP,
                       at_show_price DECIMAL,
                       vendor_id, lead_time_hours,
                       dependencies JSONB, photos[],
                       included_with_booth_types[], included_qty,
                       sort_order, status)

tenant.service_orders (id, show_id, exhibitor_id, org_id, booth_reservation_id,
                        status, submitted_at, confirmed_at, total DECIMAL,
                        tax DECIMAL, payment_intent_id, notes TEXT)

tenant.service_order_lines (id, service_order_id, service_item_id, org_id,
                             quantity, unit_price DECIMAL, price_tier,
                             line_total DECIMAL, is_included BOOLEAN,
                             notes TEXT, status)

tenant.work_orders (id, show_id, vendor_id, org_id, status,
                     dispatched_at, acknowledged_at, completed_at,
                     service_order_line_ids[], -- which lines this covers
                     airtable_record_id, -- sync reference
                     notes TEXT)
```

---

## Module 9: Vendor Operations & Airtable Sync

### Features

**9.1 Vendor Registry**
- CRUD for service vendors: company name, type (electrical, I&D, furniture, drayage, etc.), contact info, insurance docs, certifications
- Vendor capability matrix: which service categories they can fulfill
- Vendor territory: which venues/regions they serve
- Vendor rating (internal, by promoter after each show)
- Vendor payment terms (net 30, net 60, etc.)

**9.2 Airtable Integration**
- Each vendor gets a dedicated Airtable base (or shared base with filtered views)
- Conventioneer → Airtable sync (outbound):
  - When work order is dispatched, create/update records in vendor's Airtable base
  - Fields synced: exhibitor name, booth number, booth location, items ordered, quantities, special instructions, delivery window, show dates
  - Use Airtable API (REST) for programmatic sync
  - Sync triggered by work order status change (event-driven via Celery task)
- Airtable → Conventioneer sync (inbound):
  - Vendor updates status in Airtable (e.g., "In Progress", "Completed")
  - Airtable webhook (or polling fallback every 5 minutes) pushes status back
  - Conventioneer updates work order status, notifies exhibitor
- Airtable base template:
  - Conventioneer provides a template base that vendors can copy
  - Tables: Work Orders, Line Items, Show Schedule, Booth Map (linked image), Notes
  - Views: "My Open Orders", "Today's Installs", "Completed", "By Exhibitor"

**9.3 Non-Airtable Vendor Support**
- Not all vendors will use Airtable
- Fallback options:
  - Email-based dispatch (work order sent as formatted email/PDF)
  - Simple web portal (vendor logs into Conventioneer, sees work orders, updates status)
  - CSV export/import

**9.4 Vendor Settlement**
- Track vendor payables per work order
- Vendor submits invoice (or Conventioneer auto-generates based on completed work orders)
- Promoter approves vendor invoice
- Payment tracking (separate from exhibitor-facing invoicing)

### Data Model

```sql
tenant.service_vendors (id, org_id, company_name, type, contact JSONB,
                         capabilities[], territories[],
                         insurance_docs JSONB, certifications JSONB,
                         rating DECIMAL, payment_terms, status)

tenant.vendor_airtable_config (id, vendor_id, org_id,
                                airtable_base_id, airtable_api_key_encrypted,
                                table_mappings JSONB, -- which Airtable tables map to which entities
                                sync_enabled BOOLEAN, last_synced_at,
                                webhook_url)

tenant.vendor_invoices (id, vendor_id, show_id, org_id,
                         work_order_ids[], amount DECIMAL,
                         submitted_at, approved_at, paid_at, status)
```

---

## Module 10: Exhibitor Portal

### Features

**10.1 Dashboard**
- Landing page after exhibitor login
- Shows: upcoming shows they're participating in, action items (complete profile, order services, pay balance), recent notifications
- Quick links: view booth assignment on floor plan, order services, download invoices

**10.2 Profile Management**
- Edit company profile, description, product categories, images
- Manage contacts (add/remove people, assign roles, manage badge holders)
- Upload documents (business license, insurance, tax certificate)

**10.3 Show Participation**
- View all shows they're registered for (current + historical)
- Per show: booth assignment, floor plan view, service orders, invoices, deadlines

**10.4 Booth Management**
- View assigned booth on interactive floor plan
- Request booth change/upgrade
- Add co-exhibitors
- View neighboring exhibitors

**10.5 Service Ordering**
- Browse service catalog for their show
- Place orders (Module 8 exhibitor-facing flow)
- View order history and status
- Amend or cancel orders (within policy)

**10.6 Financial Summary**
- View all invoices (booth fees, service orders, sponsorships)
- Payment history
- Outstanding balance
- Make payment (Stripe)
- Download receipts/invoices as PDF

**10.7 Checklist / Task Manager**
- Configurable per show: "Complete these items before move-in"
- Tasks: complete profile, upload insurance, order electrical, order furniture, submit badge list, etc.
- Progress bar (X of Y complete)
- Overdue task alerts
- Promoter sees aggregate completion across all exhibitors

**10.8 Lead Retrieval Setup**
- If lead retrieval is offered, exhibitor sets up their lead capture preferences
- Qualify leads (badge scan → rate lead → add notes)
- Export leads post-show (CSV, Salesforce, HubSpot)

### Technical Notes

- Built as a Next.js app with role-based routing
- Shares API backend with all other modules
- Mobile-responsive (many exhibitors manage on-the-go)
- Offline capability for lead retrieval (service worker + IndexedDB)

---

## Module 11: Promoter Dashboard

### Features

**11.1 Show Overview**
- At-a-glance metrics: booths sold/available/held, revenue, exhibitor count, registration count
- Show lifecycle status and upcoming deadlines
- Activity feed (recent orders, registrations, payments)

**11.2 Sales Pipeline**
- Exhibitor funnel visualization (prospect → applied → approved → contracted → paid)
- Revenue forecast (based on pipeline stage × historical conversion rates)
- Booth occupancy heat map (overlay on floor plan — green=sold, yellow=held, red=available)

**11.3 Exhibitor Management**
- Full exhibitor list with search/filter
- Lifecycle status management (advance, regress, bulk update)
- Communication (send email to exhibitor, to all exhibitors, to segment)
- Notes and activity log per exhibitor

**11.4 Service Order Management**
- Order dashboard (Module 8 promoter-facing)
- Vendor dispatch queue
- Fulfillment status board (kanban: pending → dispatched → in_progress → complete)

**11.5 Financial Dashboard**
- Revenue by category (booth sales, services, sponsorships, tickets)
- Outstanding receivables
- Vendor payables
- Cash flow timeline

**11.6 Staff Management**
- Add/remove staff members for this show
- Assign roles and permissions
- On-site staff schedule

---

## Module 12: Franchise & Multi-Tenant Management

### Features

**12.1 Franchise Owner Dashboard**
- See all organizations (franchisees) in the network
- Aggregate metrics: total shows, total exhibitors, total revenue, total booths sold
- Drill down into any franchisee's shows

**12.2 Franchise Onboarding**
- Self-service application: new promoter applies to join the franchise
- Application review and approval workflow
- On approval: create new organization, provision tenant, invite promoter users
- Provide starter kit: show template, service catalog template, Airtable base template

**12.3 Franchise Configuration**
- Revenue share rules: X% of booth sales, Y% of service revenue, flat monthly fee, or hybrid
- Allowed show types and categories
- Required branding elements ("Powered by Conventioneer" or "A [Vitaly's Brand] Franchise")
- Feature gates: which modules each franchisee has access to (tier-based licensing)

**12.4 Master Exhibitor Pool Access**
- Franchise owner manages the master exhibitor pool (Module 5.6)
- Can "share" or "offer" exhibitors to franchisees
- Franchisees can request access to exhibitors from the pool
- Exhibitor consent tracking (GDPR/privacy)

**12.5 Cross-Org Reporting**
- Revenue roll-up across all franchisees
- Exhibitor participation heat map (which exhibitors show at which franchisee's events)
- Venue utilization across the network

---

## Module 13: Exhibitor Routing Engine

**This is the secret weapon — the feature nobody else has.**

### Features

**13.1 Exhibitor-to-Show Matching**
- Input: exhibitor profile (products, categories, country, size, history) → embedding via Turbopuffer
- Input: show profile (industry, category focus, location, size, attendee demographics) → embedding
- Output: ranked list of shows that are a good fit for this exhibitor
- Scoring factors:
  - Cosine similarity of profile embeddings (semantic match)
  - Geographic proximity (exhibitor's home country → show location)
  - Historical performance (if exhibitor showed at similar shows before, what was their revenue/rebooking rate?)
  - Exhibitor preferences (preferred show size, preferred regions, travel budget)

**13.2 Show-to-Exhibitor Matching (Inverse)**
- Promoter creating a new show: "Find me exhibitors who would be a good fit"
- System returns ranked list from master pool
- Promoter can send bulk invitations

**13.3 Routing Workflow**
- Franchise owner or promoter creates a "routing campaign":
  - Source: exhibitors from Show A (or from master pool segment)
  - Target: Show B (or multiple shows)
  - Message: personalized invitation
- System generates match scores, promoter reviews and approves list
- Invitations sent via email with "one-click apply" link
- Track: invited → viewed → applied → accepted

**13.4 Cross-Show Analytics**
- Exhibitor journey visualization: where has this exhibitor shown over the years?
- Show affinity clusters: which shows share the most exhibitors?
- Exhibitor churn prediction: which exhibitors are at risk of not returning?

### Data Model

```sql
tenant.routing_campaigns (id, org_id, source_show_id, source_segment JSONB,
                           target_show_ids[], message_template TEXT,
                           status, created_by, created_at)

tenant.routing_invitations (id, campaign_id, exhibitor_id, org_id,
                             target_show_id, match_score DECIMAL,
                             match_factors JSONB,
                             status, -- sent, viewed, applied, accepted, declined
                             sent_at, viewed_at, responded_at)
```

---

## Module 14: Financial Engine

### Features

**14.1 Stripe Integration**
- Stripe Connect for multi-tenant payments (each org has a connected Stripe account)
- Platform fee collection (Conventioneer's cut) via Stripe application fees
- Payment methods: credit card, ACH/bank transfer, wire (for international exhibitors)
- Multi-currency support (USD, EUR, GBP, AUD, etc.)
- Automatic currency conversion at Stripe's rate
- PCI-DSS compliance (Stripe handles card data; we never see raw card numbers)

**14.2 Invoicing**
- Auto-generate invoices from: booth reservations, service orders, sponsorship sales
- Invoice line items with descriptions, quantities, unit prices, tax
- Invoice statuses: draft → sent → partially_paid → paid → overdue → void
- Payment schedule support (deposit + installments)
- Late payment reminders (configurable: 7-day, 14-day, 30-day overdue)
- Credit notes and refunds
- Invoice PDF generation (branded per show)

**14.3 Tax Management**
- Configurable tax rules per show/jurisdiction
- Tax-exempt handling (exhibitor provides tax certificate → services ordered tax-free)
- Tax reporting exports

**14.4 Financial Reporting**
- Revenue recognition by show, by category, by period
- Accounts receivable aging report
- Accounts payable (vendor invoices)
- Per-exhibitor lifetime value
- Commission/revenue share calculation (for franchise model)
- Export to QuickBooks/Xero via API

### Data Model

```sql
tenant.invoices (id, org_id, show_id, exhibitor_id, invoice_number,
                  status, subtotal DECIMAL, tax DECIMAL, total DECIMAL,
                  currency, due_date, paid_amount DECIMAL, paid_at,
                  stripe_invoice_id, pdf_url, notes TEXT,
                  created_at, updated_at)

tenant.invoice_lines (id, invoice_id, org_id, description, source_type,
                       source_id, -- booth_reservation_id or service_order_line_id or sponsorship_sale_id
                       quantity, unit_price DECIMAL, tax_rate DECIMAL,
                       line_total DECIMAL)

tenant.payments (id, invoice_id, org_id, amount DECIMAL, currency,
                  payment_method, stripe_payment_intent_id,
                  status, paid_at, refunded_at, refund_amount DECIMAL)

tenant.payment_schedules (id, invoice_id, org_id, installment_number,
                           amount DECIMAL, due_date, status, payment_id)
```

---

## Module 15: Communications & Notifications

### Features

**15.1 Email**
- Transactional emails: order confirmations, payment receipts, badge ready, deadline reminders
- Bulk email: promoter sends to all exhibitors, to a segment, to all attendees
- Email templates: configurable per show, HTML-based with merge fields ({{exhibitor.name}}, {{show.name}}, etc.)
- Email provider: SendGrid or Postmark (reliable deliverability)
- Tracking: sent, delivered, opened, clicked, bounced
- Unsubscribe management (CAN-SPAM compliance)

**15.2 SMS**
- Opt-in SMS notifications for critical events: payment due, booth ready, show starting
- Provider: Twilio
- Template-based with merge fields
- International SMS support (exhibitors from 26+ countries)

**15.3 In-App Notifications**
- Notification center in exhibitor portal and promoter dashboard
- Real-time via WebSocket (bell icon with badge count)
- Notification types: action_required, info, success, warning
- Mark as read, bulk mark as read
- Notification preferences (per user: which channels for which events)

**15.4 Push Notifications (Mobile)**
- For mobile app users (Module 17)
- Show-day notifications: "Show opens in 1 hour", "Don't miss the Southwest Pavilion"
- Exhibitor-specific: "Your electrical service has been installed"

### Data Model

```sql
tenant.email_templates (id, org_id, show_id, trigger_event, subject,
                         body_html, body_text, merge_fields[], status)

tenant.email_log (id, org_id, recipient_email, template_id, subject,
                   status, -- queued, sent, delivered, opened, clicked, bounced
                   provider_message_id, sent_at, opened_at, clicked_at)

tenant.notifications (id, org_id, user_id, type, title, body,
                       action_url, read_at, created_at)
```

---

## Module 16: Reporting & Analytics

### Features

**16.1 Standard Reports**
- **Show Summary:** booths sold/available, revenue, exhibitor count, attendee count
- **Booth Sales Report:** by pavilion, by type, by date, by sales rep
- **Exhibitor Roster:** complete list with booth assignments, contact info, service orders
- **Service Order Summary:** by category, by vendor, by fulfillment status
- **Financial Summary:** revenue, receivables, payables, net
- **Attendee Report:** by type, by day, by credential status
- **Booth Change Report:** all moves, cancellations, upgrades in chronological order
- **Priority Points Report:** exhibitor rankings by points
- **Year-over-Year Comparison:** this show vs. last year's edition

**16.2 Custom Report Builder**
- Drag-and-drop field selection from any entity
- Filter, group, sort, aggregate (sum, count, avg)
- Output: table, chart (bar, line, pie), or pivot
- Save as template, schedule recurring delivery via email

**16.3 Dashboard Widgets**
- Configurable dashboard (promoters arrange widgets)
- Widget types: KPI card, chart, table, funnel, timeline, map heat overlay
- Real-time refresh

**16.4 Data Export**
- CSV export from any report or list view
- PDF export for formatted reports
- Scheduled exports (weekly summary to promoter's email)
- API access (Module 20) for BI tool integration (Looker, Metabase, etc.)

### Technical Approach

- **Materialized views** in PostgreSQL for heavy aggregation queries
- **Refresh strategy:** materialized views refreshed every 15 minutes via cron, or on-demand
- **Analytics schema** (`analytics.*`) holds pre-aggregated data
- Charts rendered via **Recharts** (React) in the dashboard

---

## Module 17: Mobile App

### Features

**17.1 Attendee App**
- Show directory: browse all participating shows in the network
- Registration & ticket purchase
- Digital badge (QR code for check-in)
- Interactive floor plan (pinch-zoom, search, filter)
- Exhibitor directory with search (by name, category, country)
- Exhibitor profile pages (description, products, images, booth location)
- Favorites / "My List" (bookmark exhibitors to visit)
- Show schedule & daily hours
- Push notifications (show updates, personalized recommendations)
- Navigation / wayfinding within venue

**17.2 Exhibitor App**
- Dashboard: booth info, order status, balance due
- Lead capture: scan attendee badge QR → capture lead → rate/notes
- Offline lead capture (sync when back online)
- Service order status tracking
- Notifications (order updates, messages from promoter)
- Quick contact exhibitor support

**17.3 Technical Stack**
- **React Native** (code share with web where possible)
- Offline-first for lead capture (SQLite local DB + background sync)
- Floor plan rendering: pre-rendered tile set (like a map) for performance on mobile
- Push notifications: Firebase Cloud Messaging (FCM) + Apple Push Notification Service (APNs)

---

## Module 18: Public Website Builder

### Features

**18.1 Show Website**
- Each show gets a public-facing website (e.g., jogsshow.com/winter-2027)
- Pages: Home, About, Exhibitor Directory, Floor Plan, Registration, Schedule, Travel/Hotels, Contact
- CMS-like content editing (rich text, images, videos)
- Branding: show logo, colors, fonts, hero images
- SEO-optimized (SSR via Next.js, meta tags, structured data)
- Responsive design

**18.2 Exhibitor Directory (Public)**
- Browse/search exhibitors
- Filter by pavilion, category, country
- Exhibitor profile pages (from exhibitor portal data)
- Link to booth on interactive floor plan

**18.3 White-Label / Custom Domain**
- Each show can use a custom domain (DNS CNAME)
- SSL auto-provisioned via Let's Encrypt
- No "Conventioneer" branding visible to public (unless franchise requires it)

**18.4 Technical Approach**
- Next.js with ISR (Incremental Static Regeneration) for performance
- Content stored in Postgres (not a separate CMS)
- Theme engine: CSS variables + configurable component library
- Template system: promoter selects from 3–5 base templates, customizes colors/images

---

## Module 19: On-Site Operations

### Features

**19.1 Check-In / Badge Scanning**
- Kiosk mode: tablet/iPad at registration desk
- Scan QR code from digital badge (email or mobile app) → verify → print physical badge
- Manual lookup by name or confirmation number
- Badge printing: thermal printer integration (Zebra, Brother) or standard printer
- Walk-up registration: register + pay + print badge on the spot

**19.2 On-Site Service Ordering**
- Exhibitor can order additional services from the show floor
- At-show pricing automatically applied
- Rush order flag → vendor notified immediately

**19.3 Show Floor Management**
- Real-time booth status board (set up, ready, issue reported)
- Issue tracking: exhibitor reports problem (e.g., "outlet not working") → dispatched to vendor
- Move-in/move-out progress tracking (% of exhibitors checked in, % of booths set up)

**19.4 Attendee Traffic**
- Scan badges at entry/exit points → count unique visitors, track flow
- Real-time attendance dashboard
- Heat map data collection (if badge scanning at pavilion entrances)

**19.5 Hardware Requirements**
- Badge printers: Zebra ZD421 or similar (USB/WiFi)
- Tablets: iPad or Android (10"+) for kiosk mode
- Handheld scanners: for roaming check-in or lead capture
- Network: dedicated WiFi SSID for registration/ops (separate from public WiFi)

---

## Module 20: Integrations & API Platform

### Features

**20.1 REST API**
- Full CRUD API for all entities (the same API the frontend uses)
- Versioned: `/api/v1/...`
- OpenAPI 3.0 spec (auto-generated from FastAPI)
- Authentication: API key or OAuth2 bearer token
- Rate limiting: per API key (configurable per org tier)
- Pagination: cursor-based (not offset-based — for consistency during writes)

**20.2 Webhooks**
- Configurable outbound webhooks on events:
  - `exhibitor.created`, `exhibitor.status_changed`
  - `booth.reserved`, `booth.cancelled`
  - `service_order.submitted`, `service_order.completed`
  - `payment.received`, `invoice.overdue`
  - `attendee.registered`, `attendee.checked_in`
- Webhook management UI: add endpoint URL, select events, test, view delivery log
- Retry with exponential backoff (3 retries over 1 hour)
- Signature verification (HMAC-SHA256)

**20.3 Pre-Built Integrations**
- **Stripe** (payments — Module 14)
- **Airtable** (vendor ops — Module 9)
- **SendGrid / Postmark** (email — Module 15)
- **Twilio** (SMS — Module 15)
- **QuickBooks / Xero** (accounting export — Module 14)
- **Salesforce / HubSpot** (exhibitor CRM sync, lead export)
- **Google Maps** (venue location, wayfinding)
- **Apple Wallet / Google Wallet** (badge pass)
- **Eventbrite** (migration import)
- **Firebase** (push notifications)

**20.4 Zapier / Make Connector**
- Expose key triggers and actions via Zapier for no-code automation
- Enables franchisees to build custom workflows without engineering

---

## Infrastructure & DevOps

### Cloud Architecture

| Component | Service | Notes |
|---|---|---|
| Compute (API) | AWS ECS Fargate or GCP Cloud Run | Auto-scaling, containerized |
| Compute (Workers) | Celery workers on ECS/Cloud Run | Async tasks: email, sync, PDF generation |
| Database | AWS RDS PostgreSQL 16 (or Cloud SQL) | Multi-AZ, read replicas for reporting |
| Cache | ElastiCache Redis | Sessions, rate limiting, real-time pub/sub |
| Object Storage | S3 (or GCS) | Images, documents, PDFs, floor plan assets |
| CDN | CloudFront (or Cloudflare) | Static assets, public website |
| Vector DB | Turbopuffer (managed) | Exhibitor embeddings |
| Search | PostgreSQL FTS (start here) → OpenSearch if needed | Keep it simple until scale demands |
| WebSocket | FastAPI WebSocket on dedicated service | Floor plan collab, real-time notifications |
| Email | SendGrid | Transactional + bulk |
| SMS | Twilio | International SMS |
| Payments | Stripe Connect | Multi-tenant payments |
| CI/CD | GitHub Actions | Build, test, deploy |
| IaC | Terraform | All infra as code |
| Monitoring | Datadog or Grafana Cloud | APM, logs, metrics, alerts |
| Error Tracking | Sentry | Frontend + backend |

### Environments

| Environment | Purpose | Refresh Cycle |
|---|---|---|
| `local` | Developer laptop (Docker Compose) | — |
| `dev` | Shared development, feature integration | Continuous deploy from `main` |
| `staging` | Pre-production, UAT with Vitaly's team | Deploy on release branch cut |
| `production` | Live | Deploy on release tag |

### Database Migration Strategy

- Alembic (Python) for schema migrations
- Every migration must be backward-compatible (no breaking column drops without a deprecation phase)
- Seed data: service catalog templates, booth type defaults, email templates
- Test data generator: Faker-based script that creates a realistic show with 500 exhibitors, 2000 attendees, 3000 service orders

---

## QA & Testing Strategy

### Testing Pyramid

| Layer | Tool | Coverage Target | Responsibility |
|---|---|---|---|
| Unit tests | pytest (Python), Jest (JS) | 80% line coverage | All squads |
| Integration tests | pytest + httpx (API tests against real DB) | All API endpoints | All squads |
| E2E tests | Playwright | Critical user journeys (20 scenarios) | QA team |
| Load tests | Locust (Python) | 500 concurrent users, 50 req/sec | QA team + DevOps |
| Security | OWASP ZAP + manual pen test | OWASP Top 10 | External vendor (week 23) |
| Accessibility | axe-core + manual audit | WCAG 2.1 AA | QA team |

### Critical E2E Scenarios

1. Exhibitor registers → applies to show → approved → selects booth → pays deposit → orders electrical → orders furniture → receives confirmation
2. Promoter creates show → clones floor plan from last year → adjusts booths → publishes → opens booth selection
3. Attendee registers as wholesale buyer → uploads credentials → approved → receives badge → checks in on-site
4. Vendor receives work order in Airtable → updates status → exhibitor notified in portal
5. Franchise owner routes exhibitors from Show A to Show B → exhibitors receive invitation → some accept
6. End-of-show: promoter runs financial summary → exports to QuickBooks → sends post-show survey

---

## Data Migration & Launch Plan

### Data to Migrate

| Source | Data | Approach |
|---|---|---|
| Eventbrite | Past attendee registrations, ticket sales | CSV export → Python import script |
| Vitaly's existing systems (likely spreadsheets/email) | Exhibitor list, booth history, contact info | CSV/Excel import → Postgres |
| Venue floor plans | Existing DWG/PDF files | Import into floor plan engine (Module 4) |
| Historical financials | Revenue history for year-over-year comparison | CSV import into analytics tables |

### Launch Sequence

1. **Week 22:** Staging environment frozen for UAT
2. **Week 23:** Vitaly's team tests all flows; bug triage daily
3. **Week 24:** Security audit complete; critical/high findings fixed
4. **Week 25:** Production environment provisioned; DNS configured; SSL certs issued
5. **Week 25:** Data migration rehearsal (dry run with production data)
6. **Week 26 Monday:** Go/no-go decision
7. **Week 26 Tuesday:** Production data migration
8. **Week 26 Wednesday:** Smoke testing in production
9. **Week 26 Thursday:** Staff training (promoter team, vendor teams)
10. **Week 26 Friday, October 1:** **GO LIVE**

---

## Entity Relationship Summary

Total estimated tables: **~65 tables** across 4 schemas.

Key entity counts (for a single show with 500 exhibitors, 5000 attendees):

| Entity | Estimated Rows | Notes |
|---|---|---|
| Exhibitors | 500 | Per show |
| Exhibitor contacts | 1,500 | ~3 per exhibitor |
| Booth reservations | 500 | 1:1 with exhibitors |
| Service orders | 500 | 1 per exhibitor (with multiple lines) |
| Service order lines | 3,000 | ~6 items per exhibitor |
| Work orders | 200 | Grouped by vendor |
| Attendee registrations | 5,000 | Per show |
| Invoices | 600 | Exhibitors + some attendees |
| Payments | 800 | Multiple payments per invoice |
| Notifications | 10,000 | ~20 per user |
| Email log | 15,000 | ~30 per user |
| Audit events | 50,000+ | Every write |

At scale (15 shows × 3 years × above volumes): **~3M total rows** across the system. Well within PostgreSQL's comfort zone without sharding.

---

## API Surface Area Estimate

| Module | Estimated Endpoints | Notes |
|---|---|---|
| Auth & Org | 15 | Standard CRUD + auth flows |
| Venue & Space | 20 | CRUD + calendar + leases |
| Show Management | 25 | CRUD + lifecycle + cloning + deadlines |
| Floor Plan | 15 | CRUD + canvas sync + publish + export |
| Exhibitor CRM | 30 | CRUD + search + lifecycle + tags + master pool |
| Booth Sales | 20 | Selection + reservation + waitlist + priority |
| Ticketing | 20 | Ticket types + registration + credentials + badges |
| Services Marketplace | 25 | Catalog + ordering + cart + dispatch |
| Vendor Ops | 15 | CRUD + Airtable sync + work orders |
| Exhibitor Portal | 10 | Mostly consumes other modules' endpoints |
| Promoter Dashboard | 10 | Aggregation + pipeline + activity feed |
| Franchise | 15 | Onboarding + config + pool + reporting |
| Routing Engine | 10 | Matching + campaigns + invitations |
| Financial | 20 | Invoices + payments + schedules + exports |
| Communications | 15 | Templates + send + log + preferences |
| Reporting | 15 | Standard reports + custom builder + export |
| Public Website | 10 | Pages + directory + search |
| On-Site | 10 | Check-in + scan + issue tracking |
| Webhooks + API Keys | 10 | CRUD + test + delivery log |
| **TOTAL** | **~310 endpoints** | |

At 100 engineers over 26 weeks, this is approximately **3 endpoints per engineer** plus all the UI, testing, infra, and integration work. Tight but achievable with strong squad leads.

---

## Open Questions & Decisions Needed

These need answers before or during Phase 0:

| # | Question | Impact | Suggested Default |
|---|---|---|---|
| 1 | Does Vitaly own the Tucson Expo Center or just lease it long-term? | Affects venue management module scope | Build for both (owned + leased) |
| 2 | How many distinct show brands does he currently operate? | Affects data migration scope | Assume 15 (from conversation) |
| 3 | What's the current system of record for exhibitor data? | Migration planning | Assume spreadsheets + email |
| 4 | Do exhibitors pay via credit card, wire, check, or all? | Payment integration scope | Stripe (card + ACH) + manual wire tracking |
| 5 | What badge printer hardware does he currently use? | On-site ops integration | Spec for Zebra ZD421 (most common) |
| 6 | Is there an existing floor plan in CAD/DWG format? | Floor plan engine bootstrap | Assume DWG available |
| 7 | Which Airtable plan do vendors currently use? | API limits, webhook availability | Assume Airtable Pro (webhooks available) |
| 8 | What accounting software does the org use? | Financial export integration | Build QuickBooks + Xero; ask which |
| 9 | Does "franchise" mean legal franchise (FDD) or just licensing? | Franchise module legal implications | Build as licensing; legal is Vitaly's problem |
| 10 | International exhibitor payment: who bears currency risk? | Pricing model | Exhibitor pays in show's currency; Stripe handles conversion |
| 11 | GDPR / privacy: exhibitors from EU — do we need consent management? | Master pool, routing, cross-org data | Yes, build consent tracking from day 1 |
| 12 | Which show is the launch target? | Timeline, migration priority | JOGS Winter 2027 (late Jan 2027) — gives 4 months post-launch buffer |
| 13 | Mobile app: iOS only, Android only, or both? | Mobile team scope | Both (React Native) |
| 14 | Lead retrieval: is this a must-have for MVP or Phase 2? | Scope | Phase 2 nice-to-have; exhibitors can use third-party scanners |
| 15 | How much historical data needs migration? | Data migration effort | Last 3 years minimum |

---

*End of specification. This document should be treated as a living artifact — updated as decisions are made and requirements are refined.*

*Next steps: Schedule kickoff with squad leads, finalize answers to open questions, begin Phase 0 on April 1.*
