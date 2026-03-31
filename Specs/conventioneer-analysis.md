# Conventioneer — Software Concept Analysis & Market Research

**Prepared for internal review | March 2026**
**Subject: Vitaly Mayzenberg / JOGS International Exhibits — Custom Convention Management Platform**

---

## 1. Understanding Vitaly's Business

### Who Is Vitaly Mayzenberg?

Vitaliy Mayzenberg is the founder and president of **JOGS International Exhibits, LLC**, a trade show promotion company with 20+ years in the gem, jewelry, and mineral show industry. He is the promoter behind the **JOGS Gem & Jewelry Show**, one of North America's largest and most internationally diverse gem and jewelry trade events.

### The JOGS Operation — Key Facts

| Dimension | Detail |
|---|---|
| **Flagship Event** | JOGS Tucson Winter Gem & Jewelry Show |
| **Venue** | Tucson Expo Center, 3750 E. Irvington Rd, Tucson, AZ |
| **Scale** | 155,000 sq ft indoor + 50,000 sq ft outdoor Gem Bazaar |
| **Exhibitors** | 400–500 vendors per show, ~80% international (26 countries) |
| **Visitors** | 52,000+ per winter show |
| **Duration** | 12 days (winter), 4 days (fall) |
| **Shows** | Winter Tucson, Fall Tucson, Las Vegas (at World Market Center) |
| **Ticketing** | Via Eventbrite currently; $20–$35 multi-day pass; free for qualified wholesale buyers |
| **Pavilion Structure** | 9+ themed pavilions (Amber, Southwest/Turquoise, Indonesian Bali Silver, Gemstone Décor, International Designers, etc.) |

### The Business Model Vitaly Wants to Franchise

Vitaly's business is more nuanced than a typical "event organizer." He operates at the intersection of several roles:

1. **Venue Owner/Operator** — He controls (or has deep relationships with) the Tucson Expo Center and potentially leases it out to other promoters for different types of conventions (gun shows, quilt/craft festivals, etc. all share the same venue).

2. **Show Promoter** — He actively promotes and operates JOGS-branded shows himself across multiple cities and seasons.

3. **Exhibitor Broker** — He moves his exhibitor base across shows. An exhibitor at JOGS Tucson Winter might be routed to JOGS Las Vegas, or even to a third-party promoter's show at his venue.

4. **Service Orchestrator** — He manages the full logistics chain: booth assignment, booth assembly/disassembly (I&D), electrical, drayage, furniture rental, storage, and delivery.

5. **Aspiring Franchisor** — He wants to package this entire operational model into licensable software so that other promoters can run conventions using his system.

This is critical: **Vitaly doesn't just run one show — he runs a platform for shows**, and his exhibitors float across that platform. The software needs to reflect that multi-tenant, multi-show, multi-promoter reality.

---

## 2. What "Conventioneer" Needs To Be

Based on the conversation, the software has **five major functional pillars** and one overarching architectural requirement (multi-tenancy/franchise model).

### Pillar 1: Ticketing & Attendee Registration

**What it covers:**
- Online ticket sales (replace Eventbrite dependency)
- Multiple ticket types: wholesale buyer (free w/ credentials), retail guest ($20–$35), VIP, multi-day pass
- Buyer credential verification (Tax ID, resale certificate, business license, industry guild membership)
- Pre-registration with QR code badge generation
- On-site registration and badge printing
- Attendee tracking and analytics

**Why build vs. buy:** Eventbrite takes a cut of every transaction and provides zero integration with booth management, exhibitor logistics, or the promoter's CRM. Custom ticketing keeps revenue in-house and connects the buyer journey end-to-end.

### Pillar 2: Space & Floor Plan Management

**What it covers:**
- Interactive floor plan designer (drag-and-drop booth placement)
- Multi-zone support (indoor pavilions, outdoor bazaar, multiple halls/wings)
- Booth inventory management (size, type, pricing tier, location premium)
- Online booth reservation and sales (exhibitors self-serve)
- Real-time availability and assignment tracking
- Multi-show booth history (exhibitor was in booth E401 last year → offer same/adjacent)
- Priority point systems for returning exhibitors
- Floor plan export (PDF, DWG/CAD for production)

**Why this is hard:** Vitaly runs 155,000+ sq ft with 400–500 vendors across 9 pavilions. The floor plan isn't static — it changes per show, per season, per venue. And the same exhibitor might be at multiple shows, needing coordinated placement.

### Pillar 3: Exhibitor Services & Logistics ("Bells & Whistles")

This is the **most unique and underserved** part of the market. This is the trade show "general contractor" / "decorator" workflow:

**What it covers:**
- **Booth Assembly (I&D):** Schedule and dispatch labor crews for installation & dismantle
- **Electrical:** Order electrical service (outlets, amperage, dedicated circuits) per booth
- **Furniture & Equipment Rental:** Tables, chairs, display cases, lighting, carpet/flooring
- **Drayage:** Freight handling — receiving, spotting (delivering to booth), storing empties, re-crating, outbound shipping
- **Booth Storage:** Off-season storage of exhibit materials between shows
- **Signage & Graphics:** Order banners, headers, signage
- **Internet/AV:** WiFi, hardline internet, monitors, sound
- **Cleaning & Maintenance:** During-show booth cleaning
- **Security:** Booth-level or pavilion-level security
- **Catering/Concessions:** Food service ordering for exhibitor staff

**The Ordering System:**
Each of these services is typically ordered by the exhibitor through an "Exhibitor Service Kit" (traditionally a PDF packet, increasingly online). The system needs:
- A configurable service catalog per show (different venues have different service providers)
- Deadline management (discount deadlines for advance orders vs. at-show surcharges)
- Order aggregation for dispatch to service vendors
- Invoicing and payment collection
- Status tracking (ordered → confirmed → delivered → completed)

**The Vendor Portal:**
Vitaly mentioned that vendors (electricians, assemblers, etc.) and promoters should operate off **Airtable** because it gives them flexibility. This suggests:
- The core system holds the master data and order flow
- An Airtable sync/integration pushes work orders out to service vendors in a format they can customize
- Vendors update status in Airtable, and it syncs back

This is a smart architecture choice — it avoids building a full vendor management UI from scratch while giving vendors the low-code flexibility they're used to.

### Pillar 4: Exhibitor CRM & Lifecycle Management

**What it covers:**
- Exhibitor profiles (company info, products, contacts, booth history across shows)
- Application/onboarding workflow per show
- Contract generation and e-signature
- Invoicing and payment tracking (booth fees, service orders, sponsorships)
- Communication hub (emails, notifications, deadlines)
- Exhibitor self-service portal (update profile, upload logo/photos, manage staff badges)
- Cross-show exhibitor mobility (exhibitor at JOGS Tucson → route them to JOGS Las Vegas or a third-party promoter's show)

### Pillar 5: Promoter / Franchise Operations

This is the franchise layer — the meta-management system:

**What it covers:**
- **Multi-tenant architecture:** Each promoter gets their own "instance" with their own shows, branding, floor plans, pricing
- **Promoter onboarding:** New franchisee sets up their convention, imports venue floor plan, configures service catalog
- **Central exhibitor pool:** Vitaly's master exhibitor database, from which exhibitors can be "offered" or "routed" to franchisee shows
- **Revenue sharing / licensing fees:** Track per-show revenue, calculate franchise fees
- **Reporting roll-up:** Vitaly sees aggregate metrics across all franchisee shows
- **Brand/white-label:** Each promoter's public-facing site is their own brand; backend is Conventioneer

### Overarching Architecture: The Multi-Dimensional Tenancy

This is what makes Conventioneer fundamentally different from existing platforms. The relationships are:

```
Platform (Conventioneer)
  └── Franchise Owner (Vitaly)
        ├── Venue: Tucson Expo Center
        │     ├── JOGS Winter Show (Vitaly promotes)
        │     ├── JOGS Fall Show (Vitaly promotes)
        │     ├── Gun Show (3rd-party promoter leases venue)
        │     └── Quilt Festival (3rd-party promoter leases venue)
        ├── Venue: World Market Center, Las Vegas
        │     └── JOGS Las Vegas (Vitaly promotes)
        └── Exhibitor Pool
              ├── Exhibitor A → JOGS Winter + JOGS LV
              ├── Exhibitor B → JOGS Winter + Gun Show
              └── Exhibitor C → JOGS Winter only
```

No existing platform models this correctly. They all assume one organizer = one show (or one organizer = multiple shows, but same type). They don't model the venue-as-platform, exhibitor-routing, or franchise dynamics.

---

## 3. Competitive Landscape — Existing Vendors

### Tier 1: Enterprise Trade Show Platforms ($50K–$200K+/year)

| Vendor | Key Strengths | Key Gaps for Vitaly | Pricing Model |
|---|---|---|---|
| **A2Z Events** (mya2zevents.com) | Multi-show/multi-year management, floor plan, exhibitor portal, sponsorship sales, registration, badge printing. Used by large US trade shows. | No service ordering (electrical, drayage, I&D). No franchise/multi-promoter model. Per-show pricing adds up fast. Users report clunky UI and poor exhibitor UX for sponsorship sales (separate login). | Quote-based, ~$5K–$10K+ per event. Multi-show contracts likely $50K–$100K+/yr. |
| **Momentus Technologies** (formerly Ungerboeck) (gomomentus.com) | Full venue + event management ERP. CRM, booking, catering, accounting, floor plan, exhibitor portal, fair vendor management. Used by major convention centers worldwide. Since 1985. | Extremely heavyweight — designed for convention center operators, not show promoters. Complex implementation. No franchise model. Probably the "$80K/year" type vendor Vitaly referenced. | Custom quotes. Enterprise pricing. Annual contracts typically $50K–$150K+. |
| **ConventionSuite** (conventionsuite.com) | Built on Oracle NetSuite. Full ERP: exhibitor management, floor plans, online ordering portals, accounting, CRM. Specifically targets exhibit houses and service contractors. | Tied to NetSuite ecosystem (expensive, complex). More suited for general contractors (like Freeman) than for show promoters. No multi-promoter franchise model. | NetSuite licensing + ConventionSuite modules. Likely $80K–$150K+/yr all-in. |
| **Map Your Show (MYS)** (mapyourshow.com) | Interactive floor plans, exhibitor content management, mobile app, sponsorship sales, attendee engagement. Used by major organizers. | Focused on the public-facing/attendee side. Weak on service ordering and logistics. No franchise model. | Quote-based. Premium pricing for large shows. |

### Tier 2: Mid-Market Platforms ($10K–$50K/year)

| Vendor | Key Strengths | Key Gaps for Vitaly | Pricing Model |
|---|---|---|---|
| **eShow** (goeshow.com) | Exhibit & sponsorship management, interactive floor plans, exhibitor portal with checklists, booth sales, lead retrieval, appointment scheduling. Strong onsite exhibit sales feature. | No service ordering/logistics module. Single-organizer model. No franchise layer. | Quote-based. Mid-market pricing. |
| **ExpoPlatform** (expoplatform.com) | AI matchmaking, lead retrieval, mobile apps, registration, exhibitor tools. Strong in B2B events. Used by UFI, IMEX, GITEX. Named top platform for large exhibitions. | European-focused. Heavy on the digital engagement side, lighter on physical logistics (booth services, drayage). No franchise model. | Quote-based. Scales with event size. |
| **Map D** (mapdevents.com) | Interactive floor plan, booth sales with online checkout, exhibitor portal, mobile app, ticketing. Clean UI. Fast setup (5–15 business days). PCI-DSS Level 1. Built for associations. | Simpler product. No service ordering. No multi-promoter model. | Per-event or annual licenses. Modular pricing. More affordable but less powerful. |
| **ExpoGenie** (expo-genie.com) | Specifically built to sit alongside existing AMS/CRM. Exhibitor & sponsor workflow automation, invoicing, payment collection. 20%+ higher sponsor renewal claimed. | Doesn't do registration, ticketing, or attendee management. No floor plan. No logistics. A bolt-on, not a platform. | Not published. Mid-market. |
| **Accelevents** (accelevents.com) | Modern UI, registration, badge printing, exhibitor portal, lead capture, floor plans. Enterprise-ready. Salesforce/HubSpot integration. | No service ordering. No multi-promoter franchise model. More conference-oriented than trade-show-logistics-oriented. | Published pricing tiers. |
| **Swapcard** (swapcard.com) | AI-powered matchmaking, geolocation/heat mapping, exhibitor analytics, lead gen. Strong engagement platform. 4,000+ events. | Very engagement-focused. Not built for physical logistics, service ordering, or franchise operations. | Free trial available. Quote-based for enterprise. |

### Tier 3: Niche / Service-Specific Tools

| Vendor | What It Does | Relevance |
|---|---|---|
| **Expodoc** | Planning, organization, communication for trade shows. Floor plan design, online stand reservation, order management, exhibitor management. European. | Closest to the "service ordering" workflow Vitaly needs. Worth investigating. |
| **EventPro** (eventpro.net) | Venue + exhibition management. Booth management, floor plans, staff management, catering, invoicing. | More venue-management focused. Could complement but not replace. |
| **Freeman Digital** (freeman.com) | The largest general contractor in the trade show industry. Their digital tools handle service ordering for exhibitors at shows they contract. | Not a software product you can buy — it's Freeman's internal system. But it's the gold standard for what service ordering should look like. |
| **Eventify** (eventify.io) | Expo management with exhibitor dashboards, self-service kiosks, interactive floor plans, check-in. | Lighter weight. More suited for smaller shows. |
| **Eventleaf** (eventleaf.com) | Exhibitor registration, interactive floor plan booth sales, lead capture, mobile app. | Solid mid-market option but lacks logistics depth. |

### Key Observation: The Market Gap

**No single platform does all five pillars well.** The market is fragmented:

- **Registration/ticketing** → Eventbrite, Cvent, Accelevents
- **Floor plan + booth sales** → A2Z, MYS, eShow, Map D
- **Exhibitor services/logistics** → ConventionSuite, Freeman (internal), Expodoc (partial)
- **Venue management** → Momentus/Ungerboeck
- **Franchise/multi-promoter** → **NOBODY**

The "$80K/year per show name" pricing Vitaly referenced is consistent with Momentus (Ungerboeck) or A2Z enterprise contracts. At 15 shows × $80K = **$1.2M/year** — that's an absurd cost for software that still doesn't do what he needs.

---

## 4. What Conventioneer Could Be — Software Architecture Vision

### Option A: The Full-Stack Platform (High Ambition, High Cost)

Build the entire five-pillar system from scratch. This is what Vitaly described.

**Stack (given your preferences):**
- **Frontend:** Next.js (React) — exhibitor portal, promoter dashboard, attendee-facing pages, floor plan UI
- **Backend:** Python (FastAPI or Django) — API layer, business logic, integrations
- **Database:** PostgreSQL — relational core (exhibitors, shows, booths, orders, invoices)
- **Vector DB:** Turbopuffer — for smart exhibitor-product matching, search, recommendations
- **Integrations:** Airtable API (vendor work order sync), Stripe (payments), Eventbrite (migration path), SendGrid/Postmark (email)
- **Floor Plan:** Either build on top of Fabric.js/Konva.js (React canvas library) or integrate an existing floor plan component
- **Auth/Multi-tenancy:** Per-franchise tenant isolation (schema-per-tenant in Postgres, or row-level security)

**Rough build estimate:** 12–18 months with a team of 4–6 engineers. $500K–$1M+ to MVP.

**Pros:** Total control, solves all five pillars, franchise-ready, no per-show licensing fees, becomes a sellable product itself.

**Cons:** Massive build. High risk. Vitaly needs to operate shows while the software is being built.

### Option B: The Composable Platform (Smart Pragmatism)

Use existing best-of-breed tools for pillars 1–2, build custom for pillars 3–5.

| Pillar | Approach |
|---|---|
| **Ticketing** | Keep Eventbrite short-term OR use Stripe + custom checkout. Low differentiation here. |
| **Floor Plan & Booth Sales** | Integrate or white-label Map D or a similar tool. Don't reinvent the floor plan editor. |
| **Exhibitor Services** | **BUILD THIS.** This is the core differentiator. Service catalog, ordering, vendor dispatch via Airtable, invoicing. |
| **Exhibitor CRM** | Build on Postgres. Cross-show exhibitor profiles, lifecycle management, routing. |
| **Franchise Layer** | **BUILD THIS.** Multi-tenant promoter management, white-label, reporting roll-up. |

**Rough build estimate:** 6–9 months with a team of 3–4 engineers. $250K–$500K to MVP.

**Pros:** Faster to market. Leverages proven tools for commoditized features. Focuses dev effort on what's truly differentiated.

**Cons:** Integration complexity. Dependency on third-party tools. Harder to create a seamless UX.

### Option C: The Airtable-First MVP (Lean Validation)

Build the entire system around Airtable as the database/UI layer, with a lightweight custom web layer for public-facing features.

| Component | Tool |
|---|---|
| Exhibitor CRM | Airtable |
| Service ordering | Airtable (with custom forms via Softr or Stacker) |
| Vendor dispatch | Airtable automations + views |
| Floor plan | Manual / PDF uploads (not interactive) |
| Ticketing | Eventbrite |
| Promoter dashboard | Airtable interface |
| Custom frontend | Next.js — thin layer for attendee registration, exhibitor self-service |

**Rough build estimate:** 2–3 months with 1–2 engineers. $50K–$100K.

**Pros:** Fast. Cheap. Validates the business logic before investing in full-stack dev. Vitaly already mentioned Airtable as his vendor/promoter tool.

**Cons:** Won't scale past ~50 shows or ~1000 exhibitors. Airtable has record limits, performance issues, and no true multi-tenancy. Not franchise-ready. Not a sellable product.

---

## 5. The Airtable Integration Question

Vitaly specifically said vendors and promoters should "operate off Airtable." This is a strong signal. Here's how to think about it:

**Airtable is great for:**
- Giving non-technical operators (electricians, assemblers, promoters) a familiar, spreadsheet-like interface
- Letting each vendor customize their view of work orders without needing custom dev
- Rapid iteration on workflows
- Automations (send email when order status changes, etc.)

**Airtable is NOT great for:**
- Being the system of record for financial transactions
- Handling 500+ concurrent users
- True multi-tenancy
- Complex relational data (it's flat tables with linked records, not a relational DB)
- Compliance / audit trails

**The right answer:** Conventioneer's Postgres database is the **system of record**. Airtable is a **sync target** — a "view" layer for operational users. The pattern:

```
Exhibitor places order in Conventioneer (Next.js UI)
  → Order saved to Postgres
  → Airtable Sync pushes order to vendor's Airtable base
  → Vendor updates status in Airtable
  → Airtable webhook fires back to Conventioneer
  → Postgres updated, exhibitor notified
```

This gives vendors flexibility without compromising data integrity. It's essentially a **headless CMS pattern** applied to operations.

---

## 6. The Franchise Model — What Makes This Novel

No existing convention software vendor offers a true franchise model. Here's what Vitaly is describing:

### Franchise Operator Tiers

| Role | Description | Software Access |
|---|---|---|
| **Platform Owner** (Vitaly) | Owns Conventioneer. Manages the master exhibitor pool, venues, and franchise agreements. | God-mode dashboard: all shows, all promoters, all revenue, all exhibitors |
| **Venue Owner** | Owns/controls a physical convention center. May or may not also be a promoter. | Venue calendar, lease management, space configuration |
| **Promoter (Franchisee)** | Licensed operator who runs a specific convention using Conventioneer. Might lease Vitaly's venue or use their own. | Show-specific dashboard: their exhibitors, their floor plan, their services, their revenue |
| **Exhibitor** | Company that buys booth space at one or more shows. | Self-service portal: profile, booth selection, service ordering, invoicing |
| **Service Vendor** | Electrician, I&D crew, furniture rental, drayage company, etc. | Airtable-based work order view. Filtered to their jobs. |
| **Attendee/Buyer** | Person who buys a ticket or registers as a wholesale buyer. | Public-facing registration and mobile app. |

### The Exhibitor Routing Engine

This is Vitaly's secret weapon. He has relationships with hundreds of gem/jewelry exhibitors worldwide. He can say:

> "You showed at JOGS Tucson. The Gun & Knife Show at my venue in August has 50 empty booths and your product category fits. Want me to route you there?"

Or even:

> "My franchisee in Dallas is launching a new gem show. Here are 100 exhibitors from my pool who might be interested."

This is essentially a **B2B marketplace for convention exhibitors**, and it's what would make Conventioneer truly defensible as a franchise product.

---

## 7. Risk Assessment & Recommendations

### Build Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Scope creep — trying to build all 5 pillars at once | **HIGH** | Phase the build. Start with Pillar 3 (services) + Pillar 4 (CRM). These are the gaps no vendor fills. |
| Floor plan editor is deceptively complex | **HIGH** | Don't build one. License or integrate an existing component (Map D, Fabric.js). |
| Airtable sync reliability at scale | **MEDIUM** | Use Airtable's official API with webhook fallbacks. Design for eventual consistency. |
| Multi-tenancy in Postgres is non-trivial | **MEDIUM** | Use row-level security (RLS) with tenant_id columns. Avoid schema-per-tenant unless absolutely needed. |
| Franchise model has legal/business complexity beyond software | **MEDIUM** | The software can enable franchising, but Vitaly needs franchise counsel. The software shouldn't assume the business model. |
| Exhibitors are international (26 countries) — i18n, payments, tax | **MEDIUM** | Use Stripe for international payments. Plan for multi-currency from day one. |

### Recommendation

**Phase 1 (Months 1–6):** Option B — Build the exhibitor services + CRM core with Airtable vendor integration. Use Eventbrite or Stripe for ticketing. Skip the floor plan editor. Get it running on one JOGS show.

**Phase 2 (Months 6–12):** Add floor plan integration (license a component or build on Fabric.js). Build the promoter/franchise dashboard. Migrate ticketing in-house.

**Phase 3 (Months 12–18):** Exhibitor routing engine. Multi-venue support. Franchise onboarding workflow. Mobile app for attendees.

**Phase 4 (Months 18–24):** Polish, scale, and begin licensing to external promoters.

---

## 8. Appendix: Trade Show Industry Terminology

For your reference when talking to Vitaly:

| Term | Meaning |
|---|---|
| **General Contractor (GC)** | The company hired by show management to provide all exhibitor services (I&D, drayage, electrical, etc.). Freeman is the biggest. |
| **Decorator** | Synonym for general contractor. Provides carpet, draping, furniture, pipe-and-drape. |
| **Drayage** | The handling of exhibit freight: receiving at the dock, moving to the booth ("spotting"), storing empties, and outbound shipping. Charged by hundredweight (CWT). |
| **I&D** | Installation & Dismantle — the labor for setting up and tearing down booths. |
| **Exhibitor Service Kit** | The packet (now usually online) that exhibitors use to order all services for a show. |
| **Pipe & Drape** | The standard booth divider system — metal pipes with fabric drapes. The default for basic booths. |
| **EAC** | Exhibitor Appointed Contractor — a vendor the exhibitor brings themselves rather than using the GC. |
| **Spotting** | Placing freight in or next to the correct booth. |
| **Advance Order** | Services ordered before a deadline (usually 2–4 weeks before show). Cheaper than at-show orders. |
| **At-Show Order** | Services ordered on-site. Typically 25–40% surcharge. |
| **Move-In / Move-Out** | The scheduled periods for setting up and dismantling the show. |
| **Net Square Feet** | Actual booth space sold, excluding aisles, registration areas, etc. |

---

*Document generated March 30, 2026. Based on web research, public information, and conversation context.*
